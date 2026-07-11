#!/usr/bin/env node
// Gold set per la calibrazione del design-critic (M4): 40 item etichettati.
//  - 10 "passa": golden sample meridian, 2 dist di clienti reali consegnati,
//    6 varianti palette AA-verificate (check-contrast.mjs) dello stesso golden.
//  - 30 "boccia": defect injection via override dei TOKEN (tecnica UIClip),
//    6 classi × 5 istanze su basi miste (così il critico non può scorciatoiare
//    "estetica diversa da meridian = boccia").
// L'override avviene con style.setProperty su <html>: stesso rango della
// palette cliente iniettata da Base.astro, vince sulla cascata dei preset.
//
// Output: factory/calibration/goldset/<id>/{hero-390,servizi-390,coda-390,
//         hero-1280,servizi-1280,centro-1280,footer-1280}.jpg (q80)
//         + factory/calibration/goldset/labels.json (spec = etichetta,
//         per costruzione; rivedibile a mano).
// Prerequisito: dist buildata (npm run build). Uso: node scripts/make-goldset.mjs
// Con --presets fotografa invece le anteprime PULITE dei 5 preset alternativi
// (stesso formato a 7 scatti) in factory/calibration/presets/<preset>/ — è
// l'input del re-audit M4, senza etichetta (il verdetto lo dà il critico).

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";
import { serveDir } from "./lib/preview-server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GOLDSET = join(ROOT, "..", "factory", "calibration", "goldset");
const anteprima = (preset) => ({ root: join(ROOT, "dist"), path: `/anteprima/${preset}/` });
const cliente = (slug) => ({ root: join(ROOT, "out", slug, "dist"), path: "/" });

// ---------- spec degli item (deterministica: QUESTA è anche labels.json) ----------
const PASSA = [
  { id: "passa-golden-meridian", base: anteprima("meridian"), nota: "il golden sample dello standard" },
  { id: "passa-cliente-cavaliere", base: cliente("cavaliere-build-srls"), nota: "sito consegnato reale" },
  { id: "passa-cliente-costruzioni", base: cliente("costruzioni-generali-a-l-di-la-cecilia-giovanni"), nota: "sito consegnato reale" },
  // 7 coppie primary/accent verificate AA con check-contrast.mjs (2026-07-11)
  ...[["#1f6f54", "#b45309"], ["#7a1f1f", "#0f766e"], ["#1e3a8a", "#b91c1c"], ["#3f3d56", "#c2410c"], ["#14532d", "#a16207"], ["#334155", "#0e7490"], ["#0c4a6e", "#9d174d"]].map(
    ([primary, accent], i) => ({
      id: `passa-palette-${i}`,
      base: anteprima("meridian"),
      css: { "--brand-primary": primary, "--brand-accent": accent },
      nota: "golden meridian con palette cliente legittima (AA verificata)",
    }),
  ),
].map((x) => ({ ...x, label: "passa" }));

const BASI = ["meridian", "atelier", "canon", "terra", "vita"];
const BOCCIA = [
  // 1. spaziatura collassata: le sezioni si schiacciano, la pagina soffoca
  ...[0.25, 0.3, 0.35, 0.4, 0.3].map((v, i) => ({
    id: `boccia-spacing-${i}`, classe: "spacing-collassato",
    base: anteprima(BASI[i]), css: { "--brand-space": String(v) },
  })),
  // 2. contrasto slavato: testo/bottoni sotto soglia percettiva
  ...[
    { "--brand-ink": "#9ca3af", "--brand-muted": "#c7ccd3" },
    { "--brand-ink": "#a8a29e", "--brand-muted": "#d6d3d1", "--brand-primary": "#93c5fd" },
    { "--brand-ink": "#94a3b8", "--brand-muted": "#cbd5e1" },
    { "--brand-ink": "#a3a3a3", "--brand-muted": "#d4d4d4", "--brand-accent": "#fcd34d" },
    { "--brand-ink": "#9e9e9e", "--brand-muted": "#cfcfcf", "--brand-primary": "#a5b4fc" },
  ].map((css, i) => ({ id: `boccia-contrasto-${i}`, classe: "contrasto-slavato", base: anteprima(BASI[i]), css })),
  // 3. gerarchia piatta: i titoli grandi come il body, pesi normalizzati
  ...[1.0, 1.125, 1.25, 1.125, 1.0].map((rem, i) => ({
    id: `boccia-gerarchia-${i}`, classe: "gerarchia-piatta", base: anteprima(BASI[i]),
    css: {
      "--step-display": `${rem}rem`, "--step-5": `${rem}rem`, "--step-4": `${rem}rem`,
      "--step-3": `${rem}rem`, "--step-2": `${rem}rem`,
      "--w-display": "400", "--w-heading": "400", "--heading-case": "none",
    },
  })),
  // 4. palette in collisione: coppie stridenti, fuori da ogni intenzione
  ...[["#e11d48", "#16a34a"], ["#7c3aed", "#f59e0b"], ["#0ea5e9", "#f43f5e"], ["#84cc16", "#d946ef"], ["#f97316", "#3b82f6"]].map(
    ([primary, accent], i) => ({
      id: `boccia-palette-${i}`, classe: "palette-collisione", base: anteprima(BASI[i]),
      css: { "--brand-primary": primary, "--brand-accent": accent },
    }),
  ),
  // 5. marker AI-slop: Inter ovunque + radius 16 uniforme + viola-blu
  ...[["#7c3aed", "#6366f1"], ["#8b5cf6", "#3b82f6"], ["#6d28d9", "#60a5fa"], ["#7c3aed", "#818cf8"], ["#5b21b6", "#6366f1"]].map(
    ([primary, accent], i) => ({
      id: `boccia-slop-${i}`, classe: "ai-slop", base: anteprima(BASI[i]),
      css: {
        "--brand-font-heading": "Inter", "--brand-font-body": "Inter",
        "--brand-radius-card": "16px", "--brand-radius-input": "16px", "--brand-radius-pill": "16px",
        "--brand-primary": primary, "--brand-accent": accent, "--heading-case": "none",
      },
    }),
  ),
  // 6. overflow / disallineamenti: scale fisse fuori misura, tracking esploso
  ...[
    { "--step-display": "6.5rem" },
    { "--eyebrow-tracking": "0.9em", "--step-4": "3.2rem" },
    { "--step-display": "7rem", "--brand-space": "2.2" },
    { "--step-5": "4.5rem", "--step-4": "4rem" },
    { "--brand-radius-card": "48px", "--brand-space": "2.5", "--step-display": "6rem" },
  ].map((css, i) => ({ id: `boccia-overflow-${i}`, classe: "overflow-disallineamenti", base: anteprima(BASI[i]), css })),
].map((x) => ({ ...x, label: "boccia" }));

const MODO_PRESETS = process.argv.includes("--presets");
const OUT_DIR = MODO_PRESETS ? join(ROOT, "..", "factory", "calibration", "presets") : GOLDSET;
const ITEMS = MODO_PRESETS
  ? ["atelier", "nova", "canon", "terra", "vita"].map((p) => ({ id: p, base: anteprima(p), label: "da giudicare" }))
  : [...PASSA, ...BOCCIA];

// ---------- shot per item: 3 @390 + 4 @1280, per posizione (robusto su ogni pagina) ----------
const VIEWPORTS = { 390: ["hero", "servizi", "coda"], 1280: ["hero", "servizi", "centro", "footer"] };

const browser = await chromium.launch();
const servers = new Map(); // root → server
const serverFor = async (root) => {
  if (!servers.has(root)) servers.set(root, await serveDir(root));
  return servers.get(root);
};

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

for (const item of ITEMS) {
  const dir = join(OUT_DIR, item.id);
  mkdirSync(dir, { recursive: true });
  const server = await serverFor(item.base.root);
  for (const [width, nomi] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage({ viewport: { width: Number(width), height: width === "390" ? 844 : 800 } });
    await page.goto(server.base + item.base.path, { waitUntil: "networkidle" });
    await page.evaluate(async (css) => {
      for (const [k, v] of Object.entries(css ?? {})) document.documentElement.style.setProperty(k, v);
      await document.fonts.ready;
      await Promise.all(
        [...document.querySelectorAll("img")].map((img) => {
          img.loading = "eager";
          return img.decode().catch(() => {});
        }),
      );
    }, item.css ?? null);
    const sezioni = page.locator("body > section");
    const n = await sezioni.count();
    const bersagli = {
      hero: sezioni.nth(0),
      servizi: sezioni.nth(Math.min(1, n - 1)),
      centro: sezioni.nth(Math.floor(n / 2)),
      coda: sezioni.nth(n - 1),
      footer: page.locator("body > footer"),
    };
    for (const nome of nomi) {
      await bersagli[nome].scrollIntoViewIfNeeded();
      await page.waitForTimeout(60); // assestamento immagini appena decodificate
      await bersagli[nome].screenshot({ path: join(dir, `${nome}-${width}.jpg`), type: "jpeg", quality: 80 });
    }
    await page.close();
  }
  console.log(`ok  ${item.id} (${item.label}${item.classe ? " · " + item.classe : ""})`);
}

if (!MODO_PRESETS) {
  writeFileSync(
    join(OUT_DIR, "labels.json"),
    JSON.stringify(
      {
        nota: "Etichette per costruzione (iniettato = boccia, curato/verificato = passa); rivedibili a mano. Shot: 7 per item.",
        items: ITEMS.map(({ base, ...x }) => ({ ...x, base: base.path === "/" ? base.root.split("/out/")[1] : base.path })),
      },
      null,
      2,
    ) + "\n",
  );
}

for (const s of servers.values()) await s.close();
await browser.close();
console.log(
  MODO_PRESETS
    ? `shot re-audit: ${ITEMS.length} preset in factory/calibration/presets/`
    : `gold set: ${ITEMS.length} item (${PASSA.length} passa / ${BOCCIA.length} boccia) in factory/calibration/goldset/`,
);
