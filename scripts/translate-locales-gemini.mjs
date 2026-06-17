/**
 * Batch-translate en.json → target locale JSON via Gemini (optional).
 * Without GEMINI_API_KEY, copies en as fallback (CI still passes structure tests).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const packsDir = path.join(root, "src/lib/i18n/packs");

const TARGETS = [
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Simplified Chinese" },
  { code: "vi", name: "Vietnamese" },
  { code: "tl", name: "Filipino (Tagalog)" },
  { code: "id", name: "Indonesian" },
  { code: "hi", name: "Hindi" },
];

const en = JSON.parse(fs.readFileSync(path.join(packsDir, "en.json"), "utf8"));
const ko = JSON.parse(fs.readFileSync(path.join(packsDir, "ko.json"), "utf8"));
const keys = Object.keys(en);

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
}

loadEnv();
const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

async function translateBatch(entries, langName) {
  const prompt = `Translate UI strings for a fintech app "WallPilot Pro" to ${langName}.
Return ONLY valid JSON object mapping keys to translated strings. Keep placeholders like {name}, ₩, $, URLs, brand names (WallPilot, Vercel, Gemini, Toss, Supabase, Stripe, DARTLAB, NYSE, NASDAQ) unchanged.
Input:
${JSON.stringify(entries, null, 0)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return JSON.parse(text);
}

async function buildLocale(code, langName) {
  const outPath = path.join(packsDir, `${code}.json`);
  if (fs.existsSync(outPath) && process.env.FORCE_I18N_REGEN !== "1") {
    console.log(`Skip ${code} (exists)`);
    return;
  }

  const result = {};
  if (!apiKey) {
    console.warn(`No GEMINI_API_KEY — using en fallback for ${code}`);
    for (const k of keys) result[k] = en[k];
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return;
  }

  const BATCH = 60;
  for (let i = 0; i < keys.length; i += BATCH) {
    const slice = keys.slice(i, i + BATCH);
    const batch = Object.fromEntries(slice.map((k) => [k, en[k]]));
    console.log(`Translating ${code} ${i + 1}-${Math.min(i + BATCH, keys.length)}/${keys.length}`);
    const translated = await translateBatch(batch, langName);
    for (const k of slice) result[k] = translated[k] ?? en[k];
    await new Promise((r) => setTimeout(r, 400));
  }
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${code}.json`);
}

async function main() {
  for (const t of TARGETS) await buildLocale(t.code, t.name);
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
