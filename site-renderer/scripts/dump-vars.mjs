#!/usr/bin/env node
// Fotografia valore-per-valore dei token di ogni preset dal render reale:
// tutte le custom property definite nei sorgenti CSS (estratte via regex, così
// lo script vale sia pre sia post migrazione DTCG) + 6 stili risolti di
// controllo. È la prova di parità della migrazione M2 e resta utile in fabbrica
// (confronto candidato vs libreria in token-space risolto).
//
// Uso:  node scripts/dump-vars.mjs <out.json>            → dump dei 6 preset dalla dist
//       node scripts/dump-vars.mjs --compare <a> <b>     → diff, exit 2 se divergono

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Lista derivata dal resolver (fonte unica): i preset pubblicati dalla
// fabbrica entrano nei gate senza toccare questo file.
const PRESETS = Object.keys(
  JSON.parse(readFileSync(new URL("../presets/resolver.json", import.meta.url), "utf8")).modifiers
    .preset.contexts,
);

// ---------- modo confronto ----------
if (process.argv[2] === "--compare") {
  const [a, b] = process.argv.slice(3).map((f) => JSON.parse(readFileSync(f, "utf8")));
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  let divergenze = 0;
  for (const preset of Object.keys(a)) {
    for (const sezione of ["tokens", "resolved"]) {
      for (const chiave of Object.keys(a[preset][sezione])) {
        const va = norm(a[preset][sezione][chiave]);
        const vb = norm(b[preset]?.[sezione]?.[chiave]);
        if (va !== vb) {
          divergenze++;
          console.log(`DIVERGE ${preset} ${chiave}\n  a: ${va}\n  b: ${vb}`);
        }
      }
    }
  }
  console.log(`Totale divergenze: ${divergenze}`);
  process.exit(divergenze ? 2 : 0);
}

// ---------- estrazione dinamica dei nomi ----------
const sorgenti = [join(ROOT, "src/styles/global.css"), join(ROOT, "src/styles/presets.gen.css")]
  .filter(existsSync)
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
const nomi = [...new Set(
  [...sorgenti.matchAll(/(--(?:brand|step|w|heading|eyebrow)[a-zA-Z0-9-]*)\s*:/g)].map((m) => m[1]),
)].sort();

const out = process.argv[2];
if (!out) {
  console.error("uso: dump-vars.mjs <out.json> | --compare <a.json> <b.json>");
  process.exit(1);
}

const { chromium } = await import("@playwright/test");
const { serveDir } = await import("./lib/preview-server.mjs");
const server = await serveDir(join(ROOT, "dist"));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const risultato = {};
for (const preset of PRESETS) {
  await page.goto(`${server.base}/anteprima/${preset}/`, { waitUntil: "networkidle" });
  risultato[preset] = await page.evaluate((props) => {
    const cs = getComputedStyle(document.documentElement);
    const tokens = {};
    for (const p of props) tokens[p] = cs.getPropertyValue(p);
    const prendi = (sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error("selettore mancante: " + sel);
      return getComputedStyle(el);
    };
    const dark = prendi(".section-dark");
    const h2 = prendi("h2");
    const card = prendi(".surface-card");
    const eyebrow = prendi(".eyebrow");
    return {
      tokens,
      resolved: {
        "section-dark background-color": dark.backgroundColor,
        "h2 font-family": h2.fontFamily,
        "h2 text-transform": h2.textTransform,
        "surface-card border-radius": card.borderRadius,
        "surface-card box-shadow": card.boxShadow,
        "eyebrow color": eyebrow.color,
      },
    };
  }, nomi);
  console.log(`dump ${preset}: ${nomi.length} token`);
}

await browser.close();
await server.close();
writeFileSync(out, JSON.stringify(risultato, null, 2));
console.log(`dump ok → ${out}`);
