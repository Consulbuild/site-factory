#!/usr/bin/env node
// Gate di prestazioni: «la UX inizia dal caricamento istantaneo» (Mattia,
// 2026-09-07). Misura i byte gzip di ciò che il browser scarica al primo
// caricamento della pagina del form e fallisce la build se sfora il budget
// del piano. Eseguito da `npm run build`; a mano: `npm run budget`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const BUDGET_KB = {
  html: 25, // index.html con il CSS inline
  js: 35, // tutti i moduli JS caricati all'avvio
  font: 45, // woff2 latin (uno per stile)
  totale: 110,
};

const gz = (p) => gzipSync(readFileSync(p)).length / 1024;
const elenca = (dir, ext) => {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
};

const html = gz(join(DIST, "index.html"));
const jsFiles = elenca(join(DIST, "_astro"), ".js");
const js = jsFiles.reduce((s, f) => s + gz(f), 0);
// il font non si comprime: conta il peso reale del solo stile normale (quello preloadato)
const fontFiles = elenca(join(DIST, "fonts"), "-normal-latin.woff2");
const font = fontFiles.reduce((s, f) => s + statSync(f).size / 1024, 0);
const totale = html + js + font;

const righe = [
  ["index.html (+css inline)", html, BUDGET_KB.html],
  [`js (${jsFiles.length} file)`, js, BUDGET_KB.js],
  [`font (${fontFiles.length} file)`, font, BUDGET_KB.font],
  ["totale primo caricamento", totale, BUDGET_KB.totale],
];
let ko = false;
for (const [nome, kb, max] of righe) {
  const esito = kb <= max ? "ok" : "SFORA";
  if (kb > max) ko = true;
  console.log(`${esito.padEnd(6)} ${nome.padEnd(30)} ${kb.toFixed(1).padStart(6)} KB / ${max} KB`);
}
if (ko) {
  console.error("\nBudget di prestazioni sforato: ridurre prima di pubblicare (vedi README «Prestazioni»).");
  process.exit(1);
}
