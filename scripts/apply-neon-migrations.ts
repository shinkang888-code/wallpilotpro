/**
 * Apply WallPilot Supabase migrations to Neon PostgreSQL.
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "postgresql://..."
 *   npx tsx scripts/apply-neon-migrations.ts
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const BOOTSTRAP = path.join(ROOT, "scripts", "neon", "00_bootstrap_auth.sql");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log("Applying Neon auth bootstrap…");
    await client.query(fs.readFileSync(BOOTSTRAP, "utf8"));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      const { rows } = await client.query(
        "SELECT 1 FROM public.schema_migrations WHERE version = $1",
        [version],
      );
      if (rows.length > 0) {
        console.log(`Skip (already applied): ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Applying: ${file}`);
      await client.query(sql);
      await client.query(
        "INSERT INTO public.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
        [version],
      );
    }

    const { rows: tables } = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log("\nPublic tables:", tables.map((r) => r.tablename).join(", "));
    console.log("\nDone.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
