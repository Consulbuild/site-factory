#!/usr/bin/env node
// Gate L1: i componenti usano SOLO classi semantiche/token (regola anti-slop di
// CLAUDE.md: mai valori estetici hardcoded, o i preset si rompono).
//
// Due controlli:
//  (a) statico sui sorgenti src/sections/ + src/components/: hex letterali,
//      style= non funzionali, utility di scala Tailwind (shadow-xl, rounded-lg,
//      text-2xl…). `rounded-full` è AMMESSO: usato deliberatamente per i badge
//      circolari (cerchio = cerchio in ogni preset).
//  (b) --computed (richiede dist buildata): sul render di ogni preset, gli stili
//      chiave degli elementi coincidono col token del preset — confronto via
//      elemento-sonda che usa var(<token>), così non serve conoscere il valore.
//
// Uso: node scripts/lint-tokens.mjs [--static-only]

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRESETS = ["meridian", "atelier", "nova", "canon", "terra", "vita"];
const errori = [];

// ---------- (a) scan statico ----------
const BANNED_UTILITY =
  /\b(shadow-(sm|md|lg|xl|2xl)|rounded-(sm|md|lg|xl|2xl|3xl)|text-(xs|sm|lg|xl|[2-9]xl))\b/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;
// style= è ammesso solo per valori funzionali (safe-area, var del sistema)
const STYLE_OK = /^[a-z-]+:\s*(env\(|var\(--)/;

for (const dir of ["src/sections", "src/components"]) {
  for (const file of readdirSync(join(ROOT, dir))) {
    if (!file.endsWith(".astro")) continue;
    const righe = readFileSync(join(ROOT, dir, file), "utf8").split("\n");
    righe.forEach((riga, i) => {
      const dove = `${dir}/${file}:${i + 1}`;
      if (HEX.test(riga)) errori.push(`${dove}: colore hex letterale — usa un token`);
      const util = riga.match(BANNED_UTILITY);
      if (util) errori.push(`${dove}: utility di scala "${util[0]}" — usa classi semantiche/token`);
      for (const m of riga.matchAll(/style="([^"]*)"/g)) {
        const decls = m[1].split(";").map((d) => d.trim()).filter(Boolean);
        for (const d of decls) {
          if (!STYLE_OK.test(d)) errori.push(`${dove}: style inline non funzionale "${d}"`);
        }
      }
    });
  }
}

// ---------- (a2) niente definizioni token a mano in global.css ----------
// Dopo M2 i token dei preset vivono SOLO in presets.gen.css (generato dai file
// DTCG): una definizione --brand-*/--step-*/… scritta a mano in global.css
// bypasserebbe la libreria e la fabbrica.
{
  const globalCss = readFileSync(join(ROOT, "src/styles/global.css"), "utf8");
  globalCss.split("\n").forEach((riga, i) => {
    if (/^\s*--(?:brand|step|w|heading|eyebrow)[a-zA-Z0-9-]*\s*:/.test(riga)) {
      errori.push(
        `src/styles/global.css:${i + 1}: definizione token a mano ("${riga.trim().slice(0, 50)}…") — appartiene a presets/*.tokens.json`,
      );
    }
  });
}

// ---------- (b) computed vs token, via elemento-sonda ----------
if (!process.argv.includes("--static-only")) {
  const { chromium } = await import("@playwright/test");
  const { serveDir } = await import("./lib/preview-server.mjs");
  // Due tipi di confronto:
  // - "token": la PRIMA famiglia font dell'elemento = token risolto (i componenti
  //   aggiungono lo stack di fallback Tailwind, che è conforme).
  // - "classe": l'elemento nel componente rende come la classe semantica PURA
  //   (sonda con la stessa classe) — così i re-skin per-preset di global.css
  //   (es. canon: .surface-card radius 0) restano leciti e si beccano solo le
  //   deviazioni introdotte a livello componente.
  const CHECKS = [
    { sel: "h2", prop: "fontFamily", token: "--brand-font-heading", modo: "token" },
    { sel: "body", prop: "fontFamily", token: "--brand-font-body", modo: "token" },
    { sel: ".surface-card", prop: "borderRadius", classe: "surface-card", modo: "classe" },
    { sel: ".surface-card", prop: "boxShadow", classe: "surface-card", modo: "classe" },
  ];
  const server = await serveDir(join(ROOT, "dist"));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const preset of PRESETS) {
    await page.goto(`${server.base}/anteprima/${preset}/`, { waitUntil: "networkidle" });
    const esiti = await page.evaluate((checks) => {
      const primaFamiglia = (v) => v.split(",")[0].trim().replace(/^["']|["']$/g, "");
      return checks.map(({ sel, prop, token, classe, modo }) => {
        const el = document.querySelector(sel);
        if (!el) return { sel, prop, token, manca: true };
        const sonda = document.createElement("div");
        if (modo === "classe") sonda.className = classe;
        else sonda.style[prop] = `var(${token})`;
        document.body.appendChild(sonda);
        let atteso = getComputedStyle(sonda)[prop];
        let reale = getComputedStyle(el)[prop];
        sonda.remove();
        if (prop === "fontFamily") {
          atteso = primaFamiglia(atteso);
          reale = primaFamiglia(reale);
        }
        return { sel, prop, token: token ?? `.${classe}`, atteso, reale, ok: atteso === reale };
      });
    }, CHECKS);
    for (const e of esiti) {
      if (e.manca) errori.push(`${preset}: selettore "${e.sel}" assente in anteprima`);
      else if (!e.ok)
        errori.push(`${preset}: ${e.sel} ${e.prop} = "${e.reale}" ≠ token ${e.token} = "${e.atteso}"`);
    }
    console.log(`ok  ${preset}: ${esiti.filter((e) => e.ok).length}/${CHECKS.length} check computed`);
  }
  await browser.close();
  await server.close();
}

if (errori.length) {
  console.error(`LINT TOKEN — ${errori.length} violazioni:\n${errori.join("\n")}`);
  process.exit(1);
}
console.log("lint-tokens: pulito");
