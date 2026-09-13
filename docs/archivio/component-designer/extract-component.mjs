#!/usr/bin/env node
// Estrazione per-COMPONENTE da un riferimento (fabbrica trattamenti, Asse 2).
// Dembrandt estrae i token GLOBALI; qui prendiamo l'evidenza a livello di
// singolo componente (navbar/card/bottone): un vocabolario FISSO e piccolo di
// proprietà computate + un ritaglio dell'elemento. Non si transpila mai il DOM
// (il markup dei temi reali è rumoroso): l'evidenza serve al component-designer
// per SINTETIZZARE un trattamento originale da ≥3 riferimenti, non per clonarne
// uno. I ritagli sono di siti terzi → fuori da git, eliminati alla pubblicazione
// (norma TDM). Prerequisito: opt-out già verificato "consentito" dal chiamante.
//
// Uso: node scripts/factory/extract-component.mjs <url> <cartella-riferimento>

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [url, dir] = process.argv.slice(2);
if (!url || !dir) {
  console.error("uso: extract-component.mjs <url> <cartella-riferimento>");
  process.exit(2);
}
mkdirSync(dir, { recursive: true });

// Vocabolario FISSO: solo ciò che serve a descrivere la forma di un trattamento.
// Niente di più → il rumore strutturale del tema non entra nell'evidenza.
const VOCABOLARIO = [
  "display", "flexDirection", "alignItems", "justifyContent", "gap",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderStyle", "borderTopColor", "borderRadius",
  "backgroundColor", "boxShadow", "color", "backdropFilter",
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform",
  "position", "width", "maxWidth", "height",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
} catch {
  // networkidle può non arrivare mai (analytics/websocket): si procede comunque
}
await page.waitForTimeout(1500);

const found = await page.evaluate((keys) => {
  const px = (v) => parseFloat(v) || 0;
  const visibile = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const pick = (el, name) => {
    if (!el) return null;
    el.setAttribute("data-harvest", name);
    const cs = getComputedStyle(el);
    const computed = {};
    for (const k of keys) computed[k] = cs[k];
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      testo: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
      box: { w: Math.round(r.width), h: Math.round(r.height) },
      computed,
    };
  };

  // navbar: l'header (o la prima nav) in cima alla pagina.
  const findNavbar = () => {
    const h = document.querySelector("header");
    if (h && visibile(h)) return h;
    const n = document.querySelector("nav");
    return n && visibile(n) ? n : null;
  };

  // card: elemento "a scheda" (raggio o ombra o bordo) che si RIPETE ≥3 volte tra
  // fratelli dello stesso tag — la firma di una griglia di card.
  const findCard = () => {
    const cand = [...document.querySelectorAll("article, li, div, a")];
    for (const el of cand) {
      if (!visibile(el)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const scheda = px(cs.borderRadius) >= 4 || (cs.boxShadow && cs.boxShadow !== "none") || px(cs.borderTopWidth) >= 1;
      if (!scheda || r.width < 160 || r.width > 760 || r.height < 90) continue;
      const fratelli = [...(el.parentElement?.children || [])].filter(
        (s) => s.tagName === el.tagName && getComputedStyle(s).borderRadius === cs.borderRadius,
      );
      if (fratelli.length >= 3) return el;
    }
    return null;
  };

  // bottone: link/button con sfondo pieno, padding e raggio — la CTA più marcata.
  const findButton = () => {
    const cand = [...document.querySelectorAll("a, button")];
    let best = null;
    let bestScore = -1;
    for (const el of cand) {
      if (!visibile(el)) continue;
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      const pieno = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
      const r = el.getBoundingClientRect();
      const pad = px(cs.paddingLeft);
      const testo = (el.textContent || "").trim().length;
      if (!pieno || pad < 8 || r.width < 60 || r.width > 420 || r.height < 26 || r.height > 96 || testo === 0) continue;
      const score = pad + px(cs.borderRadius) + testo;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  };

  return {
    navbar: pick(findNavbar(), "navbar"),
    card: pick(findCard(), "card"),
    button: pick(findButton(), "button"),
  };
}, VOCABOLARIO);

// Ritaglio di ogni elemento trovato (locator.screenshot scrolla in vista da solo).
for (const nome of ["navbar", "card", "button"]) {
  if (!found[nome]) {
    console.warn(`${nome}: non trovato (euristica)`);
    continue;
  }
  try {
    await page.locator(`[data-harvest="${nome}"]`).first().screenshot({ path: join(dir, `crop-${nome}.png`) });
    console.log(`crop-${nome}.png ok (${found[nome].box.w}×${found[nome].box.h})`);
  } catch (e) {
    console.warn(`${nome}: ritaglio fallito — ${e.message}`);
  }
}
await browser.close();

writeFileSync(
  join(dir, "component-evidence.json"),
  JSON.stringify(
    { fonte: url, estrattoIl: new Date().toISOString(), vocabolario: VOCABOLARIO, componenti: found },
    null,
    2,
  ) + "\n",
);
console.log(`component-evidence.json scritto (trovati: ${Object.keys(found).filter((k) => found[k]).join(", ") || "nessuno"})`);
