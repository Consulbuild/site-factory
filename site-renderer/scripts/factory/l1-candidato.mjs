#!/usr/bin/env node
// Gate L1 sul RENDER del candidato — deterministico, bloccante. Apre l'URL di
// anteprima (già servito dal chiamante) con Playwright chromium a 390 e 1280
// e verifica:
//  (a) axe-core WCAG 2.x A/AA (@axe-core/playwright): violazioni = fail,
//      con id/impatto/nodi e fg/bg quando axe li riporta (color-contrast);
//  (b) overflow orizzontale a 390 (scrollWidth > innerWidth);
//  (c) "pesi orfani": ogni coppia famiglia/peso/stile usata su elementi
//      visibili deve avere una @font-face vera in document.fonts (stessa
//      logica del blocco omonimo di scripts/lint-tokens.mjs — niente
//      grassetto sintetico);
//  (d) parole spezzate su h1/h2: per ogni parola \S+ dei text node, Range +
//      getClientRects — top distinti > 1 = parola spezzata su più righe.
//
// Uso:  node scripts/factory/l1-candidato.mjs <url-anteprima-candidato> <cartella-run>
//   oppure (serve da solo la dist statica, per l'orchestrazione delle fasi):
//        node scripts/factory/l1-candidato.mjs --dist <cartella-dist> --preset <id> --run <cartella-run>
// Scrive <cartella-run>/gates/l1.json
//   {axe:{violazioni:[…]}, overflow390:bool, pesiOrfani:[…], paroleSpezzate:[…], esito}
// Exit: 0 passa · 1 bocciato · 2 errore (uso, pagina irraggiungibile)

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const argEc = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
let [url, runDir] = process.argv.slice(2);
let server = null;
if (process.argv.includes("--dist")) {
  const { serveDir } = await import(
    join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "preview-server.mjs")
  );
  const [dist, preset] = [argEc("--dist"), argEc("--preset")];
  runDir = argEc("--run");
  if (!dist || !preset || !runDir) {
    console.error("uso: l1-candidato.mjs --dist <dir> --preset <id> --run <cartella-run>");
    process.exit(2);
  }
  server = await serveDir(dist);
  url = `${server.base}/anteprima/${preset}/`;
}
if (!url || !/^https?:\/\//.test(url) || !runDir) {
  console.error("uso: l1-candidato.mjs <url-anteprima-candidato> <cartella-run>");
  process.exit(2);
}

const VIEWPORTS = [
  { nome: "390", width: 390, height: 844 },
  { nome: "1280", width: 1280, height: 800 },
];

const report = {
  axe: { violazioni: [] },
  overflow390: false,
  pesiOrfani: [],
  paroleSpezzate: [],
  esito: "ok",
};

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    // axe-core vuole un context esplicito (non la scorciatoia browser.newPage)
    const contesto = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await contesto.newPage();
    const risposta = await page.goto(url, { waitUntil: "networkidle" });
    if (!risposta?.ok()) throw new Error(`pagina irraggiungibile: ${url} (HTTP ${risposta?.status() ?? "?"})`);
    await page.evaluate(() => document.fonts.ready);

    // ---------- (a) axe-core WCAG A/AA ----------
    const risultati = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    for (const v of risultati.violations) {
      report.axe.violazioni.push({
        viewport: vp.nome,
        id: v.id,
        impatto: v.impact,
        descrizione: v.help,
        nodi: v.nodes.map((n) => {
          const dati = [...n.any, ...n.all].find((c) => c.data?.fgColor)?.data;
          return { target: n.target.join(" "), fg: dati?.fgColor ?? null, bg: dati?.bgColor ?? null };
        }),
      });
    }

    // ---------- (b) overflow orizzontale a 390 ----------
    if (vp.width === 390) {
      report.overflow390 = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
    }

    // ---------- (c) pesi orfani (da lint-tokens.mjs: niente grassetto sintetico) ----------
    const orfane = await page.evaluate(() => {
      const facce = new Set(
        [...document.fonts].map(
          (f) => `${f.family.replaceAll(/["']/g, "")}|${f.weight}|${f.style}`,
        ),
      );
      const famiglieDichiarate = new Set([...facce].map((k) => k.split("|")[0]));
      const mancano = new Set();
      for (const el of document.querySelectorAll("body *")) {
        if (!el.textContent?.trim() || !el.checkVisibility?.()) continue;
        const cs = getComputedStyle(el);
        const fam = cs.fontFamily.split(",")[0].trim().replaceAll(/["']/g, "");
        if (!famiglieDichiarate.has(fam)) continue; // fallback di sistema: fuori scope
        const stile = cs.fontStyle === "italic" ? "italic" : "normal";
        if (!facce.has(`${fam}|${cs.fontWeight}|${stile}`))
          mancano.add(`${fam} ${cs.fontWeight}${stile === "italic" ? " italic" : ""}`);
      }
      return [...mancano].sort();
    });
    for (const o of orfane) {
      if (!report.pesiOrfani.some((x) => x.peso === o))
        report.pesiOrfani.push({ viewport: vp.nome, peso: o });
    }

    // ---------- (d) parole spezzate su h1/h2 ----------
    const spezzate = await page.evaluate(() => {
      const esiti = [];
      for (const el of document.querySelectorAll("h1, h2")) {
        if (!el.checkVisibility?.()) continue;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let nodo = walker.nextNode(); nodo; nodo = walker.nextNode()) {
          for (const m of nodo.data.matchAll(/\S+/g)) {
            const range = document.createRange();
            range.setStart(nodo, m.index);
            range.setEnd(nodo, m.index + m[0].length);
            const top = new Set(
              [...range.getClientRects()]
                .filter((r) => r.width > 0 && r.height > 0)
                .map((r) => Math.round(r.top)),
            );
            if (top.size > 1) esiti.push({ tag: el.tagName.toLowerCase(), parola: m[0] });
          }
        }
      }
      return esiti;
    });
    for (const s of spezzate) report.paroleSpezzate.push({ viewport: vp.nome, ...s });

    await contesto.close();
  }
} catch (e) {
  console.error(`l1-candidato: ${e.message}`);
  await browser.close();
  await server?.close();
  process.exit(2);
}
await browser.close();
await server?.close();

const bocciato =
  report.axe.violazioni.length > 0 ||
  report.overflow390 ||
  report.pesiOrfani.length > 0 ||
  report.paroleSpezzate.length > 0;
report.esito = bocciato ? "bocciato" : "ok";

mkdirSync(join(runDir, "gates"), { recursive: true });
writeFileSync(join(runDir, "gates", "l1.json"), JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify(report, null, 2));
if (bocciato) {
  console.error(
    `L1 BOCCIATO — axe: ${report.axe.violazioni.length} violazioni, overflow390: ${report.overflow390}, ` +
      `pesi orfani: ${report.pesiOrfani.length}, parole spezzate: ${report.paroleSpezzate.length}`,
  );
}
process.exit(bocciato ? 1 : 0);
