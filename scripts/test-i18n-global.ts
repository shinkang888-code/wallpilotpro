import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LOCALE_ORDER } from "../src/lib/i18n/constants.ts";
import { translate } from "../src/lib/i18n/pack-loader.ts";
import { pack as enPack } from "../src/lib/i18n/packs/en.ts";
import { pack as koPack } from "../src/lib/i18n/packs/ko.ts";
import { pack as jaPack } from "../src/lib/i18n/packs/ja.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const keys = Object.keys(enPack);

assert.ok(keys.length >= 600, `expected at least 600 translation keys, got ${keys.length}`);
console.log("keys:", keys.length);

for (const loc of LOCALE_ORDER) {
  const jsonPath = path.join(root, "src/lib/i18n/packs", `${loc}.json`);
  assert.ok(fs.existsSync(jsonPath), `missing ${loc}.json`);
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  assert.equal(Object.keys(data).length, keys.length, `${loc} key count`);
}

assert.equal(translate(koPack, enPack, "nav_scanner"), "스캐너");
assert.equal(translate(jaPack, enPack, "nav_scanner"), "スキャナー");
assert.notEqual(jaPack.nav_scanner, enPack.nav_scanner, "ja should differ from en");

const start = performance.now();
for (let i = 0; i < 100_000; i++) {
  translate(koPack, enPack, "nav_scanner");
}
const elapsed = performance.now() - start;
assert.ok(elapsed < 50, `translate too slow: ${elapsed}ms for 100k lookups`);
console.log(`100k lookups: ${elapsed.toFixed(1)}ms`);

console.log("test:i18n-global PASS");
