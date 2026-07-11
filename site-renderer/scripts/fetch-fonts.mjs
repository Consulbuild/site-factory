#!/usr/bin/env node
// Self-hosting dei font di preset (M3, GDPR: niente richieste a Google dai siti
// dei clienti). Legge fonts.googleCss da presets/*.meta.json, verifica che ogni
// famiglia sia in font-whitelist.json, scarica la CSS di Google con UA moderno
// (per ottenere WOFF2 + unicode-range), salva i file in public/fonts/ e scrive
// presets/fonts.gen.json (i blocchi @font-face con src locale) che
// build-presets.mjs emette in testa a presets.gen.css.
//
// Il mirror dei descriptor è VERBATIM (family/style/weight/stretch/unicode-range
// come li serve Google): è ciò che garantisce il rendering identico, provato dal
// VRT. Subset tenuti: latin, latin-ext (+ math/symbols se presenti) — i siti
// sono per PMI italiane.
//
// Idempotente: un WOFF2 già su disco non si riscarica (--force per rifare).
// Uso: node scripts/fetch-fonts.mjs [--force]

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRESETS_DIR = join(ROOT, "presets");
const FONTS_DIR = join(ROOT, "public", "fonts");
const FORCE = process.argv.includes("--force");
// UA Chrome: senza, Google serve TTF senza subset né unicode-range
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SUBSET_OK = new Set(["latin", "latin-ext", "math", "symbols"]);

mkdirSync(FONTS_DIR, { recursive: true });

// ---------- raccolta URL + gate whitelist ----------
const whitelist = JSON.parse(readFileSync(join(PRESETS_DIR, "font-whitelist.json"), "utf8")).famiglie;
const urls = new Set();
for (const f of readdirSync(PRESETS_DIR)) {
  if (!f.endsWith(".meta.json")) continue;
  const url = JSON.parse(readFileSync(join(PRESETS_DIR, f), "utf8")).fonts?.googleCss;
  if (url) urls.add(url);
}
const famiglieRichieste = new Set(
  [...urls].flatMap((u) =>
    [...new URL(u).searchParams.getAll("family")].map((v) => v.split(":")[0].replaceAll("+", " ")),
  ),
);
const fuoriWhitelist = [...famiglieRichieste].filter((f) => !whitelist[f]);
if (fuoriWhitelist.length) {
  console.error(`GUARDIA: famiglie fuori da font-whitelist.json: ${fuoriWhitelist.join(", ")}`);
  process.exit(1);
}

// ---------- fetch + parse blocchi @font-face ----------
const slug = (s) => s.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
const blocchi = []; // { css (src locale), chiave dedup }
const filePerUrl = new Map(); // url gstatic → nome file locale
let scaricati = 0;

for (const url of urls) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) {
    console.error(`fetch CSS fallita (${res.status}): ${url}`);
    process.exit(1);
  }
  const css = await res.text();
  // La CSS di Google è una sequenza di "/* subset */\n@font-face {...}"
  for (const m of css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face\s*\{[^}]*\})/g)) {
    const [, subset, blocco] = m;
    if (!SUBSET_OK.has(subset)) continue;
    const prendi = (prop) => blocco.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1].trim();
    const famiglia = prendi("font-family")?.replaceAll(/['"]/g, "");
    const stile = prendi("font-style") ?? "normal";
    const peso = prendi("font-weight") ?? "400";
    const srcUrl = blocco.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1];
    if (!famiglia || !srcUrl) {
      console.error(`blocco @font-face non parsabile in ${url}:\n${blocco}`);
      process.exit(1);
    }
    let file = filePerUrl.get(srcUrl);
    if (!file) {
      file = `${slug(famiglia)}-${stile === "italic" ? "i" : ""}${peso.replaceAll(/\s+/g, "_")}-${subset}.woff2`;
      // stesso nome semantico per URL diverso (versioni variabili) → suffisso
      if ([...filePerUrl.values()].includes(file))
        file = file.replace(".woff2", `-${filePerUrl.size}.woff2`);
      filePerUrl.set(srcUrl, file);
      const dest = join(FONTS_DIR, file);
      if (FORCE || !existsSync(dest)) {
        const woff = await fetch(srcUrl, { headers: { "user-agent": UA } });
        if (!woff.ok) {
          console.error(`download WOFF2 fallito (${woff.status}): ${srcUrl}`);
          process.exit(1);
        }
        writeFileSync(dest, Buffer.from(await woff.arrayBuffer()));
        scaricati++;
      }
    }
    const cssLocale = blocco.replace(srcUrl, `/fonts/${file}`);
    const chiave = cssLocale.replaceAll(/\s+/g, " "); // dedup tra preset che condividono famiglie
    if (!blocchi.some((b) => b.chiave === chiave)) blocchi.push({ css: cssLocale, chiave });
  }
}

if (!blocchi.length) {
  console.error("GUARDIA: nessun blocco @font-face estratto — UA rifiutato o formato CSS cambiato?");
  process.exit(1);
}

writeFileSync(
  join(PRESETS_DIR, "fonts.gen.json"),
  JSON.stringify(
    { nota: "Generato da scripts/fetch-fonts.mjs — @font-face self-hosted, emessi in presets.gen.css da build-presets.mjs.", fontFaces: blocchi.map((b) => b.css) },
    null,
    2,
  ) + "\n",
);
console.log(
  `fetch-fonts ok — ${famiglieRichieste.size} famiglie, ${blocchi.length} @font-face, ${filePerUrl.size} WOFF2 (${scaricati} scaricati ora)`,
);
