#!/usr/bin/env node
// Calibrazione del gate novelty L2 — genera factory/calibration/baseline.json
// dalle coppie NOTE, così le soglie del gate sono percentili misurati, non numeri
// inventati:
//   - "diverse":       tutte le coppie tra i 6 preset della libreria (estetiche
//                      volutamente distinte → distanze che un candidato NUOVO
//                      deve almeno eguagliare);
//   - "quasi-uguali":  golden meridian vs ciascun passa-palette-* del goldset
//                      (stesso layout, soli colori cliente → il "re-colour" che
//                      il gate deve riconoscere come NON nuovo).
// Per ogni coppia: dHash Hamming (min su hero-1280/servizi-1280), distanza CSD
// (media sugli stessi due shot), tokenDiff pesato (lib/token-diff.mjs).
//
// Prerequisiti: screenshot già generati (make-goldset.mjs, anche --presets);
//               uv + progetto factory/tools (CSD). PATH: ~/.local/bin.
// Uso:  node scripts/factory/calibrate-novelty.mjs
// Exit: 0 ok · 2 errore. La SANITY (separazione delle distribuzioni) è nel
//       report su stdout: se le distribuzioni si sovrappongono lo dice, coi numeri.

import { writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { caricaTokens, risolvi, tokenDiff, coloreDaHex } from "./lib/token-diff.mjs";
import { dHashBatch, hamming, csdDistanze } from "./lib/novelty-metrics.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", ".."); // site-renderer/
const CALIB = join(ROOT, "..", "factory", "calibration");
const GOLDSET = join(CALIB, "goldset");
const OUT = join(CALIB, "baseline.json");

// ---------- input: preset (token + shot) ----------
const manifest = caricaTokens(join(ROOT, "presets", "presets.manifest.json"));
const PRESETS = manifest.presets.map((p) => p.id); // meridian, atelier, nova, canon, terra, vita
const base = caricaTokens(join(ROOT, "presets", "meridian.tokens.json"));
const tokens = Object.fromEntries(
  PRESETS.map((id) => [id, risolvi(base, caricaTokens(join(ROOT, "presets", `${id}.tokens.json`)))]),
);
// meridian è fotografato nel goldset (golden sample), gli altri in calibration/presets/
const shotDir = (id) => (id === "meridian" ? join(GOLDSET, "passa-golden-meridian") : join(CALIB, "presets", id));
const shot = (dir, nome) => {
  const p = join(dir, `${nome}.jpg`);
  if (!existsSync(p)) {
    console.error(`errore: shot mancante ${p} — rigenerare con make-goldset.mjs`);
    process.exit(2);
  }
  return p;
};

// Le 7 palette dei passa-palette-* (stesse di make-goldset.mjs, 2026-07-11):
// servono per ricostruire i token dei quasi-uguali (meridian + override colori).
const PALETTE_PASSA = [
  ["#1f6f54", "#b45309"], ["#7a1f1f", "#0f766e"], ["#1e3a8a", "#b91c1c"], ["#3f3d56", "#c2410c"],
  ["#14532d", "#a16207"], ["#334155", "#0e7490"], ["#0c4a6e", "#9d174d"],
];

// ---------- coppie ----------
const SHOTS = ["hero-1280", "servizi-1280"];
const coppie = [];
for (let i = 0; i < PRESETS.length; i++)
  for (let j = i + 1; j < PRESETS.length; j++)
    coppie.push({
      a: PRESETS[i], b: PRESETS[j], tipo: "diverse",
      dirA: shotDir(PRESETS[i]), dirB: shotDir(PRESETS[j]),
      tokA: tokens[PRESETS[i]], tokB: tokens[PRESETS[j]],
    });
for (const [k, [primary, accent]] of PALETTE_PASSA.entries())
  coppie.push({
    a: "passa-golden-meridian", b: `passa-palette-${k}`, tipo: "quasi-uguali",
    dirA: shotDir("meridian"), dirB: join(GOLDSET, `passa-palette-${k}`),
    tokA: tokens.meridian,
    tokB: risolvi(tokens.meridian, { "brand-primary": coloreDaHex(primary), "brand-accent": coloreDaHex(accent) }),
  });

// ---------- metriche: un solo giro di browser e UNA chiamata CSD ----------
const immagini = [...new Set(coppie.flatMap((c) => SHOTS.flatMap((s) => [shot(c.dirA, s), shot(c.dirB, s)])))];
console.error(`calibrazione: ${coppie.length} coppie, ${immagini.length} immagini…`);
const hashes = await dHashBatch(immagini);
const { dist } = csdDistanze(immagini, join(mkdtempSync(join(tmpdir(), "novelty-")), "baseline-emb.npy"));

const arrotonda = (x) => Math.round(x * 10000) / 10000;
const risultati = coppie.map((c) => {
  const perShot = SHOTS.map((s) => ({
    h: hamming(hashes.get(shot(c.dirA, s)), hashes.get(shot(c.dirB, s))),
    d: dist(shot(c.dirA, s), shot(c.dirB, s)),
  }));
  return {
    a: c.a, b: c.b, tipo: c.tipo,
    dHashHamming: Math.min(...perShot.map((x) => x.h)), // min = lettura conservativa (clone se ANCHE UNO shot coincide)
    csdDist: arrotonda(perShot.reduce((s, x) => s + x.d, 0) / perShot.length),
    tokenDiff: tokenDiff(c.tokA, c.tokB).totale,
  };
});

// ---------- percentili (nearest-rank: col campione piccolo — 15 coppie — dà la
// semantica esatta "almeno diverso quanto la coppia esistente meno diversa";
// l'interpolazione inventerebbe soglie sopra il minimo osservato) ----------
const percentile = (xs, p) => {
  const s = [...xs].sort((x, y) => x - y);
  return arrotonda(s[Math.max(Math.ceil((p / 100) * s.length), 1) - 1]);
};
const diverse = risultati.filter((r) => r.tipo === "diverse");
const quasi = risultati.filter((r) => r.tipo === "quasi-uguali");
const percentili = {
  csdDiverse: Object.fromEntries([5, 10, 25, 50].map((p) => [`p${p}`, percentile(diverse.map((r) => r.csdDist), p)])),
  csdQuasiUguali: Object.fromEntries([50, 90].map((p) => [`p${p}`, percentile(quasi.map((r) => r.csdDist), p)])),
  tokenDiffDiverse: Object.fromEntries([5, 10, 50].map((p) => [`p${p}`, percentile(diverse.map((r) => r.tokenDiff), p)])),
};

writeFileSync(OUT, JSON.stringify({ coppie: risultati, percentili }, null, 2) + "\n");

// ---------- report + SANITY: le due distribuzioni CSD devono separarsi ----------
const minCsdDiverse = Math.min(...diverse.map((r) => r.csdDist));
const maxCsdQuasi = Math.max(...quasi.map((r) => r.csdDist));
const report = {
  baseline: OUT,
  coppie: { diverse: diverse.length, quasiUguali: quasi.length },
  percentili,
  sanity: {
    minCsdDiverse: arrotonda(minCsdDiverse),
    maxCsdQuasiUguali: arrotonda(maxCsdQuasi),
    separate: minCsdDiverse > maxCsdQuasi,
    dHash: {
      minDiverse: Math.min(...diverse.map((r) => r.dHashHamming)),
      maxQuasiUguali: Math.max(...quasi.map((r) => r.dHashHamming)),
    },
    nota:
      minCsdDiverse > maxCsdQuasi
        ? "distribuzioni CSD separate: min(diverse) > max(quasi-uguali)"
        : `ATTENZIONE: sovrapposizione CSD — min(diverse)=${arrotonda(minCsdDiverse)} ≤ max(quasi-uguali)=${arrotonda(maxCsdQuasi)}`,
  },
};
console.log(JSON.stringify(report, null, 2));
