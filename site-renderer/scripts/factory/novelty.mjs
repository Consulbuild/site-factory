#!/usr/bin/env node
// Gate novelty L2 — due assi SEPARATI, mai fusi in un punteggio unico:
//   1. vs LIBRERIA:    il candidato deve essere DIVERSO dai 6 preset esistenti
//                      (dHash + distanza CSD sugli shot, tokenDiff pesato sui token);
//   2. vs RIFERIMENTI: il candidato deve essere LONTANO dalle fonti d'ispirazione
//                      (dHash + CSD contro gli screenshot dei riferimenti).
// L'esito è una CONGIUNZIONE di condizioni (mai una media): basta una violazione
// per bocciare. Le soglie vengono dai percentili misurati in baseline.json
// (calibrate-novelty.mjs), non da numeri inventati.
//
// Nota misurata (baseline 2026-07-11): tutti i siti della fabbrica condividono il
// layout per design (stesso blueprint), quindi il dHash grayscale 8×8 da solo NON
// discrimina — 4 coppie di preset legittimi hanno Hamming 0. Il "clone strutturale"
// vs libreria richiede perciò dHash ≤ 2 CONFERMATO dalla vicinanza di stile
// (csdDist < csdDiverse.p10). Verso i riferimenti invece dHash ≤ 2 basta da solo:
// un riferimento esterno non condivide il nostro blueprint, se coincide è copia.
//
// In più: Vendi Score della libreria prima/dopo (diversità dell'offerta, embedding
// CSD degli hero-1280) — ΔVS ≤ 0 è un warning nel report, non una bocciatura.
//
// Uso:  node scripts/factory/novelty.mjs <candidate.tokens.json> <cartella-shots-candidato>
//         <cartella-run> --refs <dir-rif> [--refs ...] [--escludi <preset-id>]
//       - shots candidato: i 7 jpg nel formato dei preset (hero-390 … footer-1280);
//       - dir riferimento: screenshot-390.png e/o screenshot-1280.png;
//       - --escludi: toglie un preset dalla libreria (per sanity test: un preset
//         esistente come pseudo-candidato si confronta con gli ALTRI 5).
// Scrive <cartella-run>/gates/novelty.json (+ .npy di audit degli embedding).
// Exit: 0 ok · 1 bocciato · 2 errore d'uso o di verifica.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";
import { caricaTokens, risolvi, tokenDiff } from "./lib/token-diff.mjs";
import { dHashBatch, hamming, csdDistanze, vendiScore } from "./lib/novelty-metrics.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", ".."); // site-renderer/
const CALIB = join(ROOT, "..", "factory", "calibration");

// ---------- argomenti ----------
const argv = process.argv.slice(2);
const refs = [];
let escludi = null;
const posizionali = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--refs") refs.push(resolve(argv[++i]));
  else if (argv[i] === "--escludi") escludi = argv[++i];
  else posizionali.push(argv[i]);
}
const [tokensPath, shotsDir, runDir] = posizionali.map((p) => p && resolve(p));
if (!tokensPath || !shotsDir || !runDir) {
  console.error("uso: novelty.mjs <candidate.tokens.json> <cartella-shots> <cartella-run> --refs <dir> [--refs ...] [--escludi <preset-id>]");
  process.exit(2);
}
const errore = (msg) => {
  console.error(`errore: ${msg}`);
  process.exit(2);
};

// ---------- input ----------
const baselinePath = join(CALIB, "baseline.json");
if (!existsSync(baselinePath)) errore(`baseline mancante (${baselinePath}) — eseguire prima calibrate-novelty.mjs`);
const { percentili } = caricaTokens(baselinePath);

const manifest = caricaTokens(join(ROOT, "presets", "presets.manifest.json"));
const libreria = manifest.presets.map((p) => p.id).filter((id) => id !== escludi);
if (escludi && libreria.length === manifest.presets.length) errore(`--escludi ${escludi}: preset sconosciuto`);
const base = caricaTokens(join(ROOT, "presets", "meridian.tokens.json"));
const tokensPreset = Object.fromEntries(libreria.map((id) => [id, risolvi(base, caricaTokens(join(ROOT, "presets", `${id}.tokens.json`)))]));
const tokensCandidato = risolvi(base, caricaTokens(tokensPath));

const shotPreset = (id, nome) =>
  join(id === "meridian" ? join(CALIB, "goldset", "passa-golden-meridian") : join(CALIB, "presets", id), `${nome}.jpg`);
const shotCandidato = (nome) => join(shotsDir, `${nome}.jpg`);
const SHOTS_LIBRERIA = ["hero-1280", "servizi-1280"];
for (const s of SHOTS_LIBRERIA) if (!existsSync(shotCandidato(s))) errore(`shot candidato mancante: ${shotCandidato(s)}`);
// Fail-fast con istruzione: un preset del manifest senza shot (tipico dopo una
// pubblicazione, es. «ferro») darebbe altrimenti un ENOENT criptico in dHashBatch.
for (const id of libreria)
  for (const s of SHOTS_LIBRERIA)
    if (!existsSync(shotPreset(id, s)))
      errore(
        `shot di libreria mancante per "${id}": ${shotPreset(id, s)} — rigenerare con «npm run build && node scripts/make-goldset.mjs --presets», poi ricalibrare le soglie con calibrate-novelty.mjs`,
      );

// riferimenti: screenshot-<larghezza>.png; shot candidati alla stessa larghezza
const SHOTS_PER_LARGHEZZA = {
  390: ["hero-390", "servizi-390", "coda-390"],
  1280: ["hero-1280", "servizi-1280", "centro-1280", "footer-1280"],
};
const riferimenti = refs.map((dir) => {
  const screenshot = [390, 1280]
    .map((w) => ({ w, path: join(dir, `screenshot-${w}.png`) }))
    .filter((s) => existsSync(s.path));
  if (!screenshot.length) errore(`riferimento senza screenshot-390.png/screenshot-1280.png: ${dir}`);
  return { dir, screenshot };
});

// ---------- metriche: un giro di browser, UNA chiamata CSD ----------
const immagini = new Set();
for (const s of SHOTS_LIBRERIA) immagini.add(shotCandidato(s));
for (const id of libreria) for (const s of SHOTS_LIBRERIA) immagini.add(shotPreset(id, s));
for (const r of riferimenti)
  for (const { w, path } of r.screenshot) {
    immagini.add(path);
    for (const s of SHOTS_PER_LARGHEZZA[w]) if (existsSync(shotCandidato(s))) immagini.add(shotCandidato(s));
  }
const paths = [...immagini];
const idx = (p) => paths.indexOf(p);
const gatesDir = join(runDir, "gates");
mkdirSync(gatesDir, { recursive: true });

console.error(`novelty: ${libreria.length} preset in libreria, ${riferimenti.length} riferimenti, ${paths.length} immagini…`);
const hashes = await dHashBatch(paths);
// Vendi: diversità della libreria (hero-1280) prima e dopo l'ingresso del candidato
const idxPrima = libreria.map((id) => idx(shotPreset(id, "hero-1280")));
const { dist } = csdDistanze(paths, join(gatesDir, "novelty-emb.npy"), {
  "novelty-vendi-prima": idxPrima,
  "novelty-vendi-dopo": [...idxPrima, idx(shotCandidato("hero-1280"))],
});

const arrotonda = (x) => Math.round(x * 10000) / 10000;

// ---------- asse 1: vs LIBRERIA ----------
const perPreset = libreria.map((id) => {
  const perShot = SHOTS_LIBRERIA.map((s) => ({
    h: hamming(hashes.get(shotCandidato(s)), hashes.get(shotPreset(id, s))),
    d: dist(shotCandidato(s), shotPreset(id, s)),
  }));
  const td = tokenDiff(tokensCandidato, tokensPreset[id]);
  return {
    id,
    dHashHamming: Math.min(...perShot.map((x) => x.h)),
    csdDist: arrotonda(perShot.reduce((a, x) => a + x.d, 0) / perShot.length),
    tokenDiff: td.totale,
    topContributi: td.topContributi,
  };
});
const minimiLib = {
  dHashHamming: Math.min(...perPreset.map((p) => p.dHashHamming)),
  csdDist: Math.min(...perPreset.map((p) => p.csdDist)),
  tokenDiff: Math.min(...perPreset.map((p) => p.tokenDiff)),
};

// ---------- asse 2: vs RIFERIMENTI ----------
const perRif = riferimenti.map((r) => {
  const confronti = r.screenshot.flatMap(({ w, path }) =>
    SHOTS_PER_LARGHEZZA[w]
      .filter((s) => existsSync(shotCandidato(s)))
      .map((s) => ({ h: hamming(hashes.get(path), hashes.get(shotCandidato(s))), d: dist(path, shotCandidato(s)) })),
  );
  return {
    dir: r.dir,
    dHashHamming: Math.min(...confronti.map((x) => x.h)),
    csdDist: arrotonda(Math.min(...confronti.map((x) => x.d))),
  };
});
const minimiRif = perRif.length
  ? { dHashHamming: Math.min(...perRif.map((r) => r.dHashHamming)), csdDist: Math.min(...perRif.map((r) => r.csdDist)) }
  : null;

// ---------- Vendi Score ----------
const vendi = {
  prima: vendiScore(join(gatesDir, "novelty-vendi-prima.npy")),
  dopo: vendiScore(join(gatesDir, "novelty-vendi-dopo.npy")),
};
vendi.delta = arrotonda(vendi.dopo - vendi.prima);

// ---------- esito: congiunzione di condizioni, mai media ----------
const motivi = [];
const avvisi = [];
const cloni = perPreset.filter((p) => p.dHashHamming <= 2 && p.csdDist < percentili.csdDiverse.p10);
if (cloni.length)
  motivi.push(
    `clone strutturale della libreria: ${cloni.map((p) => `${p.id} (dHash ${p.dHashHamming} ≤ 2, csd ${p.csdDist} < p10 ${percentili.csdDiverse.p10})`).join("; ")}`,
  );
if (minimiLib.tokenDiff < percentili.tokenDiffDiverse.p5)
  motivi.push(`token troppo simili alla libreria: min tokenDiff ${minimiLib.tokenDiff} < p5 diverse ${percentili.tokenDiffDiverse.p5}`);
if (minimiLib.csdDist < percentili.csdDiverse.p5)
  motivi.push(`stile troppo simile alla libreria: min csdDist ${minimiLib.csdDist} < p5 diverse ${percentili.csdDiverse.p5}`);
for (const r of perRif) {
  if (r.csdDist < percentili.csdDiverse.p10 || r.dHashHamming <= 2)
    motivi.push(
      `troppo vicino al riferimento ${basename(r.dir)} (dHash ${r.dHashHamming}, csd ${r.csdDist}): ` +
        `l'impressione generale resta riconoscibile — un osservatore ricondurrebbe il candidato alla fonte, ` +
        `rischio di opera derivata; il riferimento deve ispirare, non trasparire`,
    );
}
if (vendi.delta <= 0)
  avvisi.push(`ΔVendi ${vendi.delta} ≤ 0: il candidato non aumenta la diversità della libreria (ridondante, non bocciante)`);

const report = {
  candidato: { tokens: tokensPath, shots: shotsDir },
  soglie: { ...percentili, cloneDHash: 2 },
  vsLibreria: { perPreset, minimi: minimiLib },
  vsRiferimenti: { perRif, minimi: minimiRif },
  vendi,
  avvisi,
  esito: motivi.length ? "bocciato" : "ok",
  motivi,
};
writeFileSync(join(gatesDir, "novelty.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
process.exit(motivi.length ? 1 : 0);
