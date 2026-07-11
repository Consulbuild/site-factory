#!/usr/bin/env node
// Gate L3 — punteggio UIClip sugli screenshot del candidato. È un PRE-FILTRO
// "rotto vs sano", MAI il giudice finale: il verdetto estetico resta al
// design-critic (L4). UIClip (biglab/uiclip_…humanpairs) dà la probabilità
// "well-designed" 0..1 per screenshot; il gate confronta il MINIMO dei 7 shot
// con una soglia calibrata sul gold set etichettato.
//
// NOTA D'USO: se alla calibrazione gli item sbagliati superano il 20% del
// gold set, la separazione è debole e questo gate va trattato come WARNING
// (non bloccare il candidato: loggare e passare la mano a L4).
// Calibrazione 2026-07-11: 25/40 item sbagliati (62.5%) → SEPARAZIONE DEBOLE,
// GATE = SOLO WARNING. Due cause misurate: (1) per 3 classi di difetto
// (spacing, contrasto, palette) gli shot hero-1280/servizi-1280 sono BYTE-
// IDENTICI alla base pulita (hero = testo bianco su foto, sezione 2 = banda
// scura che si ricolora da sola: l'iniezione non li tocca) — il difetto vive
// negli altri 5 shot; (2) lo score UIClip su questi crop varia più per base
// estetica (canon pulito 0.368 > meridian pulito 0.263) che per difetto.
// L4 (design-critic) resta l'unico giudice affidabile.
//
// Uso:
//   node scripts/factory/l3-uiclip.mjs --calibra
//       Scorre factory/calibration/goldset/ (labels.json), score di ogni
//       hero-1280.jpg e servizi-1280.jpg (UNA chiamata al modello: il load
//       domina), sceglie la soglia che separa meglio gli score MINIMI per
//       item e la scrive in factory/calibration/uiclip-soglia.json.
//   node scripts/factory/l3-uiclip.mjs <cartella-shots-candidato> <cartella-run>
//       Score dei 7 jpg del candidato, scrive <cartella-run>/gates/uiclip.json
//       {shots:[{file,score}], min, soglia, esito} ed esce 0/1.
// Exit: 0 ok · 1 bocciato · 2 errore (uso, file mancanti, scorer)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");   // site-renderer/
const REPO = join(ROOT, "..");                                            // Site-factory/
const TOOLS = join(REPO, "factory", "tools");
const GOLDSET = join(REPO, "factory", "calibration", "goldset");
const SOGLIA_FILE = join(REPO, "factory", "calibration", "uiclip-soglia.json");
const CAPTION = "ui screenshot of a professional website for a local business";
const SHOTS = ["hero-390", "servizi-390", "coda-390", "hero-1280", "servizi-1280", "centro-1280", "footer-1280"];

const errore = (msg) => {
  console.error(`l3-uiclip: ${msg}`);
  process.exit(2);
};

// ---------- scorer: UNA chiamata a uv/python con tutte le immagini ----------
function scoreImmagini(percorsi) {
  const res = spawnSync(
    "uv",
    ["run", "--project", TOOLS, "python", join(TOOLS, "scripts", "uiclip_score.py"), ...percorsi, "--caption", CAPTION],
    {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 20 * 60 * 1000,
      env: { ...process.env, PATH: `${join(homedir(), ".local", "bin")}:${process.env.PATH ?? ""}` },
    },
  );
  if (res.error) errore(`impossibile lanciare uv: ${res.error.message}`);
  if (res.status !== 0) errore(`uiclip_score.py fallito (exit ${res.status}):\n${res.stderr}`);
  // formato: "<score>\t<path>" per riga, poi una riga di commento "# device=…"
  const scores = new Map();
  for (const riga of res.stdout.split("\n")) {
    if (!riga.trim() || riga.startsWith("#")) continue;
    const [s, ...resto] = riga.split("\t");
    scores.set(resto.join("\t"), Number(s));
  }
  for (const p of percorsi) if (!scores.has(p) || !Number.isFinite(scores.get(p))) errore(`score mancante per ${p}`);
  return scores;
}

// ---------- modalità calibrazione ----------
if (process.argv[2] === "--calibra") {
  const { items } = JSON.parse(readFileSync(join(GOLDSET, "labels.json"), "utf8"));
  const perItem = items.map((it) => ({
    id: it.id,
    label: it.label,
    imgs: ["hero-1280.jpg", "servizi-1280.jpg"].map((f) => join(GOLDSET, it.id, f)),
  }));
  for (const it of perItem) for (const img of it.imgs) if (!existsSync(img)) errore(`shot mancante: ${img}`);

  console.error(`calibrazione: ${perItem.length} item, ${perItem.length * 2} immagini, una chiamata al modello…`);
  const scores = scoreImmagini(perItem.flatMap((it) => it.imgs));
  const mins = perItem.map((it) => ({ ...it, min: Math.min(...it.imgs.map((p) => scores.get(p))) }));

  const passa = mins.filter((m) => m.label === "passa");
  const boccia = mins.filter((m) => m.label === "boccia");

  // Soglia (min>=soglia → passa) = massima balanced accuracy (TPR+TNR)/2:
  // con 10 passa vs 30 boccia l'accuratezza grezza degenererebbe nella soglia
  // che boccia tutto. A parità vince il gap più largo tra i due min adiacenti.
  const valori = [...new Set(mins.map((m) => m.min))].sort((a, b) => a - b);
  const candidate = valori.slice(1).map((v, i) => ({ soglia: (valori[i] + v) / 2, gap: v - valori[i] }));
  let migliore = null;
  for (const c of candidate) {
    const tpr = passa.filter((m) => m.min >= c.soglia).length / passa.length;
    const tnr = boccia.filter((m) => m.min < c.soglia).length / boccia.length;
    const ba = (tpr + tnr) / 2;
    if (!migliore || ba > migliore.ba || (ba === migliore.ba && c.gap > migliore.gap)) migliore = { ...c, ba };
  }
  migliore.sbagliati = mins.filter((m) => (m.min >= migliore.soglia ? "passa" : "boccia") !== m.label);
  const confusione = {
    passaGiusti: passa.filter((m) => m.min >= migliore.soglia).length,
    passaBocciati: passa.filter((m) => m.min < migliore.soglia).length,
    bocciaGiusti: boccia.filter((m) => m.min < migliore.soglia).length,
    bocciaPromossi: boccia.filter((m) => m.min >= migliore.soglia).length,
  };

  const out = {
    soglia: migliore.soglia,
    calibratoIl: new Date().toISOString(),
    separazione: {
      minPassa: Math.min(...passa.map((m) => m.min)),
      maxBoccia: Math.max(...boccia.map((m) => m.min)),
      itemSbagliati: migliore.sbagliati.map((m) => ({ id: m.id, label: m.label, min: m.min })),
    },
  };
  writeFileSync(SOGLIA_FILE, JSON.stringify(out, null, 2) + "\n");

  // report a video: distribuzioni per etichetta + confusione
  const distro = (arr) => arr.map((m) => `  ${m.min.toFixed(4)}  ${m.id}`).join("\n");
  console.log(`DISTRIBUZIONE min per item (passa, ${passa.length}):\n${distro([...passa].sort((a, b) => a.min - b.min))}`);
  console.log(`DISTRIBUZIONE min per item (boccia, ${boccia.length}):\n${distro([...boccia].sort((a, b) => a.min - b.min))}`);
  console.log(`soglia scelta: ${migliore.soglia.toFixed(6)} — confusione: ${JSON.stringify(confusione)}`);
  console.log(`item sbagliati: ${migliore.sbagliati.length}/${mins.length} (${(100 * migliore.sbagliati.length / mins.length).toFixed(1)}%)${migliore.sbagliati.length / mins.length > 0.2 ? " — SEPARAZIONE DEBOLE: usare il gate come WARNING" : ""}`);
  console.log(`scritto ${SOGLIA_FILE}`);
  process.exit(0);
}

// ---------- modalità gate ----------
const [shotsDir, runDir] = process.argv.slice(2);
if (!shotsDir || !runDir) errore("uso: l3-uiclip.mjs --calibra | l3-uiclip.mjs <cartella-shots-candidato> <cartella-run>");
if (!existsSync(SOGLIA_FILE)) errore(`soglia non calibrata: lancia prima l3-uiclip.mjs --calibra (${SOGLIA_FILE} assente)`);
const { soglia } = JSON.parse(readFileSync(SOGLIA_FILE, "utf8"));

const percorsi = SHOTS.map((nome) => join(shotsDir, `${nome}.jpg`));
for (const p of percorsi) if (!existsSync(p)) errore(`shot mancante: ${p}`);

const scores = scoreImmagini(percorsi);
const shots = percorsi.map((p) => ({ file: basename(p), score: scores.get(p) }));
const min = Math.min(...shots.map((s) => s.score));

// La policy dell'header, applicata: se la calibrazione ha separato male
// (>20% di item sbagliati sul gold set), il gate NON blocca — declassa il
// sotto-soglia a "warning" e passa la mano a L4 (design-critic).
const calibrazione = JSON.parse(readFileSync(SOGLIA_FILE, "utf8"));
const sbagliati = calibrazione.separazione?.itemSbagliati?.length ?? 0;
const totale = calibrazione.separazione?.itemTotali ?? 40;
const affidabile = sbagliati / totale <= 0.2;
const sottoSoglia = min < soglia;
const report = {
  shots,
  min,
  soglia,
  calibrazioneAffidabile: affidabile,
  esito: !sottoSoglia ? "ok" : affidabile ? "bocciato" : "warning",
};

mkdirSync(join(runDir, "gates"), { recursive: true });
writeFileSync(join(runDir, "gates", "uiclip.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (report.esito === "warning")
  console.error("l3-uiclip: sotto soglia ma calibrazione DEBOLE → warning, decide L4");
process.exit(report.esito === "bocciato" ? 1 : 0);
