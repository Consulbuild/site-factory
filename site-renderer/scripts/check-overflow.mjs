#!/usr/bin/env node
// Gate L1: nessun overflow orizzontale a 390px (parole italiane lunghe in
// maiuscolo — vedi CLAUDE.md §Overflow tipografico). Esce 1 al primo preset
// che sfora, con le misure.
//
// Uso:  node scripts/check-overflow.mjs              → i 6 preset dalla dist
//       node scripts/check-overflow.mjs --url <url>  → una pagina qualsiasi (anche file://)
// Prerequisito nel modo default: `npm run build` già eseguito.

import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serveDir } from "./lib/preview-server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
import { readFileSync } from "node:fs";
// Lista derivata dal resolver (fonte unica): i preset pubblicati dalla
// fabbrica entrano nei gate senza toccare questo file.
const PRESETS = Object.keys(
  JSON.parse(readFileSync(new URL("../presets/resolver.json", import.meta.url), "utf8")).modifiers
    .preset.contexts,
);

const argUrl = process.argv.indexOf("--url");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const problemi = [];

async function misura(url, nome) {
  await page.goto(url, { waitUntil: "networkidle" });
  const m = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  if (m.scroll > m.client) {
    problemi.push(`${nome}: scrollWidth ${m.scroll} > clientWidth ${m.client}`);
  } else {
    console.log(`ok  ${nome} (${m.scroll} ≤ ${m.client})`);
  }
}

if (argUrl !== -1) {
  const url = process.argv[argUrl + 1];
  await misura(url, url);
} else {
  const server = await serveDir(join(ROOT, "dist"));
  for (const preset of PRESETS) await misura(`${server.base}/anteprima/${preset}/`, preset);
  await server.close();
}

await browser.close();
if (problemi.length) {
  console.error(`OVERFLOW ORIZZONTALE:\n${problemi.join("\n")}`);
  process.exit(1);
}
