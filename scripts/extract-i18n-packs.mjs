import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "src/lib/i18n.tsx"), "utf8");

const en = {};
const ko = {};

const singleRe = /^\s+([a-z_][a-z0-9_]*):\s*\{\s*en:\s*"((?:\\.|[^"\\])*)"\s*,\s*ko:\s*"((?:\\.|[^"\\])*)"\s*\},?\s*$/gm;
for (const m of src.matchAll(singleRe)) {
  en[m[1]] = unescape(m[2]);
  ko[m[1]] = unescape(m[3]);
}

const multiStartRe = /^\s+([a-z_][a-z0-9_]*):\s*\{\s*$/gm;
let ms;
while ((ms = multiStartRe.exec(src)) !== null) {
  const key = ms[1];
  if (en[key]) continue;
  const slice = src.slice(ms.index);
  const enM = slice.match(/en:\s*\n?\s*"((?:\\.|[^"\\])*)"\s*,/s);
  const koM = slice.match(/ko:\s*\n?\s*"((?:\\.|[^"\\])*)"\s*,?\s*\n\s*\},/s);
  if (enM && koM) {
    en[key] = unescape(enM[1]);
    ko[key] = unescape(koM[1]);
  }
}

function unescape(s) {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

const outDir = path.join(root, "src/lib/i18n/packs");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "en.json"), JSON.stringify(en, null, 2));
fs.writeFileSync(path.join(outDir, "ko.json"), JSON.stringify(ko, null, 2));
console.log("Extracted", Object.keys(en).length, "keys");
