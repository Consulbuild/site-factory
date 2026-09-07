#!/usr/bin/env node
// Self-hosting del font del form (niente richieste a Google dal browser del
// lead: privacy e un DNS in meno). Stessa tecnica di
// site-renderer/scripts/fetch-fonts.mjs: chiede a Google la CSS con uno UA
// moderno (così arrivano WOFF2 con unicode-range), tiene SOLO il subset latin
// (il form è in italiano) e riscrive i blocchi @font-face con src locale in
// src/styles/font.gen.css. Idempotente: --force per riscaricare.
//
// Font scelto nel piano: Atkinson Hyperlegible Next, variabile 200..800
// (Braille Institute, OFL). Per cambiarlo basta FAMIGLIA + il token --font.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONTS_DIR = join(ROOT, "public", "fonts");
const OUT_CSS = join(ROOT, "src", "styles", "font.gen.css");
const FORCE = process.argv.includes("--force");

const FAMIGLIA = "Atkinson Hyperlegible Next";
const CSS_URL = `https://fonts.googleapis.com/css2?family=${FAMIGLIA.replace(/ /g, "+")}:wght@200..800&display=swap`;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

mkdirSync(FONTS_DIR, { recursive: true });

const css = await (await fetch(CSS_URL, { headers: { "user-agent": UA } })).text();
// Blocchi: "/* latin */\n@font-face { ... }" — teniamo solo il subset latin.
const blocchi = [...css.matchAll(/\/\* (\w[\w-]*) \*\/\s*(@font-face\s*\{[^}]*\})/g)]
  .filter(([, subset]) => subset === "latin")
  .map(([, , blocco]) => blocco);
if (blocchi.length === 0) throw new Error("nessun blocco @font-face latin nella CSS di Google");

const uscita = [];
for (const blocco of blocchi) {
  const url = /url\((https:[^)]+\.woff2)\)/.exec(blocco)?.[1];
  const stile = /font-style:\s*(\w+)/.exec(blocco)?.[1] ?? "normal";
  if (!url) throw new Error("URL woff2 non trovato nel blocco:\n" + blocco);
  const nome = `atkinson-hyperlegible-next-${stile}-latin.woff2`;
  const dest = join(FONTS_DIR, nome);
  if (!existsSync(dest) || FORCE) {
    const buf = Buffer.from(await (await fetch(url, { headers: { "user-agent": UA } })).arrayBuffer());
    writeFileSync(dest, buf);
    console.log(`scaricato ${nome} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
  uscita.push(blocco.replace(url, `/fonts/${nome}`));
}

writeFileSync(
  OUT_CSS,
  `/* GENERATO da scripts/fetch-font.mjs — non modificare a mano (npm run font). Subset latin di «${FAMIGLIA}». */\n` +
    uscita.join("\n") +
    "\n",
);
console.log(`scritto ${OUT_CSS} (${uscita.length} blocchi)`);
