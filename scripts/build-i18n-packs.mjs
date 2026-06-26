#!/usr/bin/env node
/** Emit TypeScript pack modules + keys type from JSON locale files. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const packsDir = path.join(root, "src/lib/i18n/packs");
const locales = ["en", "ko", "ja", "zh", "vi", "tl", "id", "hi"];

const en = JSON.parse(fs.readFileSync(path.join(packsDir, "en.json"), "utf8"));
const keys = Object.keys(en).sort();

for (const loc of locales) {
  const jsonPath = path.join(packsDir, `${loc}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`Missing ${loc}.json — skipping`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  for (const k of keys) {
    if (!(k in data)) data[k] = en[k];
  }
  if (loc !== "en") {
    fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
  }
  const out = `/** Auto-generated — run npm run i18n:build */\nexport const pack = ${JSON.stringify(data, null, 2)} as const;\n`;
  fs.writeFileSync(path.join(packsDir, `${loc}.ts`), out);
}

const keysType = keys.map((k) => `  | "${k}"`).join("\n");
fs.writeFileSync(
  path.join(root, "src/lib/i18n/keys.generated.ts"),
  `/** Auto-generated — run npm run i18n:build */\nexport type TranslationKey =\n${keysType};\n`,
);

console.log("Built", locales.length, "packs,", keys.length, "keys");
