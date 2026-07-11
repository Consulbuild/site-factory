#!/usr/bin/env node
// Estrazione deterministica dei token da un riferimento (M5): Dembrandt sul
// CSS COMPUTATO (mai screenshot→VLM per i valori, assunzione modello n.1)
// + 2 screenshot full-page (390/1280) per l'audit umano.
// Gli screenshot sono di siti TERZI: restano fuori da git (uso interno,
// eliminati alla pubblicazione del preset — norma TDM "solo il tempo
// necessario"); i token estratti invece si conservano.
//
// Prerequisito: opt-out già verificato "consentito" (il chiamante è il gate).
// Uso: node scripts/factory/extract-tokens.mjs <url> <cartella-riferimento>

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [url, dir] = process.argv.slice(2);
if (!url || !dir) {
  console.error("uso: extract-tokens.mjs <url> <cartella-riferimento>");
  process.exit(2);
}
mkdirSync(dir, { recursive: true });

// ---------- 1. Dembrandt (due formati: DTCG per il designer, raw per i
//              filtri anti-rumore di M6 — frequenze d'uso e campo context;
//              dembrandt 0.23.1 non ha un campo "confidence": i conteggi
//              d'uso del raw sono il suo equivalente) ----------
function dembrandt(flags) {
  const dem = spawnSync("npx", ["dembrandt", url, ...flags], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 5 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (dem.status !== 0) {
    console.error(`dembrandt fallito (exit ${dem.status}):\n${(dem.stderr || dem.stdout).slice(-800)}`);
    process.exit(1);
  }
  // lo stdout può contenere log prima del JSON: si prende dalla prima graffa
  try {
    return JSON.parse(dem.stdout.slice(dem.stdout.indexOf("{")));
  } catch (e) {
    console.error(`output dembrandt non parsabile: ${e.message}\n${dem.stdout.slice(0, 400)}`);
    process.exit(1);
  }
}
console.log("estrazione dembrandt (CSS computato): DTCG…");
const dtcg = dembrandt(["--dtcg", "--json-only"]);
console.log("estrazione dembrandt: raw (frequenze/context per i filtri M6)…");
const raw = dembrandt(["--json-only"]);
const versione = JSON.parse(
  readFileSync(join(ROOT, "node_modules", "dembrandt", "package.json"), "utf8"),
).version;

writeFileSync(
  join(dir, "extraction.tokens.json"),
  JSON.stringify(
    {
      fonte: url,
      estrattoIl: new Date().toISOString(),
      strumento: `dembrandt@${versione}`,
      // Rumori noti da filtrare a valle (M6, vedi Sorprese M0b): #000000 in
      // testa alla palette, accent "semantico" inaffidabile, typography
      // ordinata per stili distinti (usare context), auto-accept dei cookie.
      dtcg,
      raw,
    },
    null,
    2,
  ) + "\n",
);
console.log(`extraction.tokens.json scritto (${Object.keys(dtcg).length} gruppi radice)`);

// ---------- 2. screenshot di riferimento (390 + 1280, full page) ----------
const browser = await chromium.launch();
for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  } catch {
    // networkidle può non arrivare mai (analytics/websocket): si scatta comunque
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(dir, `screenshot-${width}.png`), fullPage: true });
  await page.close();
  console.log(`screenshot-${width}.png ok`);
}
await browser.close();
console.log("estrazione completa");
