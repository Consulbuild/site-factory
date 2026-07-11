#!/usr/bin/env node
// Build deterministica della libreria preset: DTCG (presets/*.tokens.json) →
//   1. src/styles/presets.gen.css        (i blocchi token :root + [data-preset])
//   2. presets/presets.manifest.json     (id, versione, neutri, font, metadati editor)
//   3. src/lib/presets.gen.ts            (PRESETS, DEFAULT_PRESET, PRESET_FONTS)
//   4. ../site-factory-editor/lib/presets.gen.json  (scheda Palette dell'editor)
//   5. tabella neutri nella skill palette-designer (tra i marker TABELLA-NEUTRI)
// Tutti gli output sono IN GIT: la fonte di verità sono i file DTCG.
//
// Guardie (spike M0a): conteggio dichiarazioni emesse = token sorgente per ogni
// blocco (makeCSSVar può collassare nomi IN SILENZIO), niente duplicati.
//
// Uso: npm run build:presets

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRESETS_DIR = join(ROOT, "presets");
const PRESETS = ["meridian", "atelier", "nova", "canon", "terra", "vita"];
const DEFAULT_PRESET = "meridian";

const leggi = (f) => JSON.parse(readFileSync(join(PRESETS_DIR, f), "utf8"));

// ---------- guardia pre-build: shadow SEMPRE come array di layer ----------
// Il resolver Terrazzo NON applica l'override se una shadow array (multi-layer)
// viene ridefinita con una shadow oggetto (single-layer): emette in silenzio il
// valore base (scoperto in M2 dal confronto dump pre/post). Forma unica: array.
for (const p of PRESETS) {
  for (const [id, t] of Object.entries(leggi(`${p}.tokens.json`))) {
    if (t.$type === "shadow" && !Array.isArray(t.$value)) {
      console.error(`GUARDIA: ${p}.tokens.json → "${id}" è shadow con $value oggetto: usa un array di layer`);
      process.exit(1);
    }
  }
}

// ---------- 0. terrazzo ----------
const tz = spawnSync("npx", ["tz", "build"], { cwd: PRESETS_DIR, encoding: "utf8" });
if (tz.status !== 0) {
  console.error(`terrazzo fallito:\n${tz.stdout}\n${tz.stderr}`);
  process.exit(1);
}

// ---------- 1. post-process CSS + guardie ----------
let cssGen = readFileSync(join(PRESETS_DIR, "out", "tokens.css"), "utf8");
// rename del token hack (vedi terrazzo.config.mjs): --step-n1 → --step--1
cssGen = cssGen.replaceAll("--step-n1:", "--step--1:").replaceAll("var(--step-n1)", "var(--step--1)");

const tokensPerPreset = Object.fromEntries(PRESETS.map((p) => [p, leggi(`${p}.tokens.json`)]));
const blocchi = [...cssGen.matchAll(/(:root|\[data-preset="([a-z]+)"\])\s*\{([^}]*)\}/g)];
const errori = [];
for (const [, selettore, preset, corpo] of blocchi) {
  const id = preset ?? DEFAULT_PRESET;
  const dichiarazioni = [...corpo.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]);
  const attesi = Object.keys(tokensPerPreset[id] ?? {}).length;
  if (dichiarazioni.length !== attesi)
    errori.push(`${selettore}: ${dichiarazioni.length} dichiarazioni emesse ≠ ${attesi} token sorgente`);
  const dup = dichiarazioni.filter((d, i) => dichiarazioni.indexOf(d) !== i);
  if (dup.length) errori.push(`${selettore}: nomi duplicati (collasso makeCSSVar?): ${dup.join(", ")}`);
}
if (blocchi.length !== PRESETS.length)
  errori.push(`${blocchi.length} blocchi emessi ≠ ${PRESETS.length} preset`);
if (errori.length) {
  console.error(`GUARDIA build-presets:\n${errori.join("\n")}`);
  process.exit(1);
}

const intestazione = `/* GENERATO da scripts/build-presets.mjs — NON EDITARE A MANO.
 * Fonte di verità: presets/*.tokens.json (DTCG) + presets/resolver.json
 * + presets/fonts.gen.json (@font-face self-hosted, da scripts/fetch-fonts.mjs).
 * Rigenera con: npm run build:presets */\n\n`;
// @font-face self-hosted (M3): senza fonts.gen.json i siti tornerebbero al CDN
if (!existsSync(join(PRESETS_DIR, "fonts.gen.json"))) {
  console.error("GUARDIA: presets/fonts.gen.json assente — esegui prima: node scripts/fetch-fonts.mjs");
  process.exit(1);
}
const fontFaceCss = leggi("fonts.gen.json").fontFaces.join("\n") + "\n\n";
writeFileSync(join(ROOT, "src/styles/presets.gen.css"), intestazione + fontFaceCss + cssGen);

// ---------- 2. manifest ----------
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const manifest = PRESETS.map((p) => {
  const meta = leggi(`${p}.meta.json`);
  const risolti = { ...tokensPerPreset[DEFAULT_PRESET], ...tokensPerPreset[p] };
  const hexDi = (id) => risolti[id]?.$value?.hex;
  const neutri = { bg: hexDi("brand-bg"), ink: hexDi("brand-ink"), surface: hexDi("brand-surface") };
  const famiglia = (id) => risolti[id]?.$value;
  return {
    id: p,
    version: meta.version,
    stato: meta.stato,
    aaker: meta.aaker,
    settoriConsigliati: meta.settoriConsigliati,
    antiPatterns: meta.antiPatterns,
    neutri,
    scuro: lum(neutri.bg) < 0.4,
    fontHeadingFamily: famiglia("brand-font-heading"),
    fontBodyFamily: famiglia("brand-font-body"),
    fonts: meta.fonts,
    editor: meta.editor,
  };
});
writeFileSync(
  join(PRESETS_DIR, "presets.manifest.json"),
  JSON.stringify({ default: DEFAULT_PRESET, presets: manifest }, null, 2) + "\n",
);

// ---------- 3. presets.gen.ts (renderer) ----------
const genTs = `// GENERATO da scripts/build-presets.mjs — NON EDITARE A MANO.
// Fonte: presets/*.tokens.json + presets/*.meta.json. Rigenera: npm run build:presets

export const PRESETS = ${JSON.stringify(PRESETS)} as const;
export type Preset = (typeof PRESETS)[number];

export const DEFAULT_PRESET: Preset = ${JSON.stringify(DEFAULT_PRESET)};
`;
writeFileSync(join(ROOT, "src/lib/presets.gen.ts"), genTs);

// ---------- 4. presets.gen.json (editor) ----------
const stack = (famiglia, serif) => `"${famiglia}", ${serif ? "serif" : "system-ui, sans-serif"}`;
const perEditor = Object.fromEntries(
  manifest.map((m) => [
    m.id,
    {
      nome: m.editor.nome,
      estetica: m.editor.estetica,
      per: m.editor.per,
      fontLabel: m.editor.fontLabel,
      fontsHref: m.fonts.googleCss,
      fontHeading: stack(m.fontHeadingFamily, m.editor.serifHeading),
      fontBody: stack(m.fontBodyFamily, m.editor.serifBody),
      neutri: m.neutri,
      ...(m.scuro ? { scuro: true } : {}),
    },
  ]),
);
writeFileSync(
  join(ROOT, "..", "site-factory-editor", "lib", "presets.gen.json"),
  JSON.stringify(perEditor, null, 2) + "\n",
);

// ---------- 5. tabella neutri nella skill ----------
const skillPath = join(ROOT, "..", ".claude", "skills", "palette-designer", "SKILL.md");
const skill = readFileSync(skillPath, "utf8");
const INIZIO = "<!-- TABELLA-NEUTRI:START (generata da build-presets.mjs — non editare a mano) -->";
const FINE = "<!-- TABELLA-NEUTRI:END -->";
const tabella = [
  INIZIO,
  "| Preset | bg | ink (testo) | surface | tipo |",
  "|---|---|---|---|---|",
  ...manifest.map(
    (m) =>
      `| ${m.id}${m.id === DEFAULT_PRESET ? " (=`:root`)" : ""} | \`${m.neutri.bg}\` | \`${m.neutri.ink}\` | \`${m.neutri.surface}\` | ${m.scuro ? "**scuro**" : "chiaro"} |`,
  ),
  "",
  "Non esiste un blocco `[data-preset=\"meridian\"]`: **meridian = `:root`**.",
  FINE,
].join("\n");
const iInizio = skill.indexOf(INIZIO);
const iFine = skill.indexOf(FINE);
if (iInizio === -1 || iFine === -1) {
  console.error(`GUARDIA: marker TABELLA-NEUTRI assenti nella skill palette-designer — aggiungili una volta a mano`);
  process.exit(1);
}
writeFileSync(skillPath, skill.slice(0, iInizio) + tabella + skill.slice(iFine + FINE.length));

console.log(
  `build:presets ok — ${PRESETS.length} preset, ${blocchi.length} blocchi CSS, manifest+gen.ts+gen.json+skill aggiornati`,
);
