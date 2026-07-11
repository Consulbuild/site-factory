#!/usr/bin/env node
// Harness di calibrazione del design-critic (M4): esegue il critico su ogni
// item del gold set (claude -p headless, login Max — MAI ANTHROPIC_API_KEY),
// confronta i verdetti con labels.json e calcola κ di Cohen + recall("boccia").
// Gate: κ ≥ 0.6 E recall ≥ 0.9 (l'errore costoso è promuovere un design rotto).
//
// Batch e sincrono: non passa dal seam io.claude() di run-step.ts (che è
// streaming per la UI) — deviazione da D5 registrata nel piano.
//
// Uso (da site-factory-editor/):
//   node scripts/calibrate-critic.mjs               # tutti i 40 item del gold set
//   node scripts/calibrate-critic.mjs --canary      # solo i 10 del canary set
//   node scripts/calibrate-critic.mjs --only <id>   # un item singolo (smoke test)
//   node scripts/calibrate-critic.mjs --audit       # re-audit: factory/calibration/presets/<preset>/
// I verdetti già presenti in reviews/ vengono riusati (--force per rifare).

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLAUDE_BIN = join(homedir(), ".local", "bin", "claude");
const CAL = join(REPO_ROOT, "factory", "calibration");
const REVIEWS = join(CAL, "reviews");
const CONCURRENCY = 2; // la quota Max è condivisa con la pipeline clienti
const TIMEOUT_MS = 10 * 60 * 1000;

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const AUDIT = argv.includes("--audit");
const CANARY = argv.includes("--canary");
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;

mkdirSync(REVIEWS, { recursive: true });

// ---------- item da giudicare ----------
let items; // [{id, dir, label?}]
if (AUDIT) {
  const base = join(CAL, "presets");
  items = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ id: `preset-${d.name}`, dir: join(base, d.name) }));
} else {
  const labels = JSON.parse(readFileSync(join(CAL, "goldset", "labels.json"), "utf8")).items;
  const canary = new Set(JSON.parse(readFileSync(join(CAL, "canary.json"), "utf8")).items);
  items = labels
    .filter((x) => (ONLY ? x.id === ONLY : true))
    .filter((x) => (CANARY ? canary.has(x.id) : true))
    .map((x) => ({ id: x.id, dir: join(CAL, "goldset", x.id), label: x.label }));
}
if (!items.length) {
  console.error("nessun item da giudicare");
  process.exit(2);
}

// ---------- una corsa del critico ----------
function promptPer(item) {
  const out = join(REVIEWS, `${item.id}.json`);
  return (
    `Usa la skill design-critic. Item «${item.id}». ` +
    `Screenshot (7 file JPEG, 390 e 1280) nella cartella: ${item.dir}/ — leggili TUTTI con Read. ` +
    `Scrivi SOLO ${out} con "round": 1, nel formato della sezione «Formato artifact» della skill. ` +
    `Poi una riga col verdetto.`
  );
}

function eseguiCritico(item) {
  return new Promise((resolve) => {
    const args = [
      "-p", promptPer(item),
      "--output-format", "json",
      "--model", "claude-opus-4-8",
      "--effort", "xhigh",
      "--max-turns", "40",
      "--allowedTools", "Read", "Skill", "Write",
      "--disallowedTools", "WebSearch", "WebFetch", "Bash", "Edit", "Task",
    ];
    const child = spawn(CLAUDE_BIN, args, { cwd: REPO_ROOT, env: { ...process.env } });
    const timer = setTimeout(() => child.kill("SIGTERM"), TIMEOUT_MS);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.stdout.resume(); // l'esito si legge dall'artifact, non dallo stdout
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });
  });
}

function leggiVerdetto(id) {
  const f = join(REVIEWS, `${id}.json`);
  if (!existsSync(f)) return { errore: "artifact non scritto" };
  try {
    const r = JSON.parse(readFileSync(f, "utf8"));
    if (r.verdict !== "PASS" && r.verdict !== "FAIL") return { errore: `verdict non valido: ${r.verdict}` };
    if (!Array.isArray(r.criteri) || r.criteri.length !== 6) return { errore: `criteri: attesi 6, trovati ${r.criteri?.length}` };
    const incoerente = r.criteri.every((c) => c.score >= c.sogliaHard) !== (r.verdict === "PASS");
    if (incoerente) return { errore: "verdict incoerente con le soglie dei criteri" };
    return { review: r };
  } catch (e) {
    return { errore: `JSON non parsabile: ${e.message}` };
  }
}

// ---------- esecuzione con concorrenza fissa, 1 retry su artifact invalido ----------
const esiti = [];
let indice = 0;
async function lavoratore() {
  while (indice < items.length) {
    const item = items[indice++];
    const f = join(REVIEWS, `${item.id}.json`);
    if (!FORCE && existsSync(f) && !leggiVerdetto(item.id).errore) {
      const { review } = leggiVerdetto(item.id);
      esiti.push({ item, review, riusato: true });
      console.log(`riusato  ${item.id}: ${review.verdict}`);
      continue;
    }
    for (let tentativo = 1; tentativo <= 2; tentativo++) {
      const { code, stderr } = await eseguiCritico(item);
      const letto = leggiVerdetto(item.id);
      if (letto.review) {
        esiti.push({ item, review: letto.review });
        console.log(`ok  ${item.id}: ${letto.review.verdict}${tentativo > 1 ? " (retry)" : ""}`);
        break;
      }
      console.error(`errore  ${item.id} (tentativo ${tentativo}): ${letto.errore}; exit ${code} ${stderr.slice(-200)}`);
      if (tentativo === 2) esiti.push({ item, errore: letto.errore });
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, lavoratore));

// ---------- statistiche (solo calibrazione, non --audit) ----------
if (AUDIT) {
  console.log(`\nre-audit completato: ${esiti.filter((e) => e.review).length}/${items.length} review in ${REVIEWS}/preset-*.json`);
  process.exit(esiti.some((e) => e.errore) ? 1 : 0);
}

const validi = esiti.filter((e) => e.review && e.item.label);
const conta = (label, verdict) =>
  validi.filter((e) => e.item.label === label && e.review.verdict === verdict).length;
// classe positiva = "boccia" (il critico deve respingere i rotti)
const bb = conta("boccia", "FAIL"), bp = conta("boccia", "PASS");
const pp = conta("passa", "PASS"), pb = conta("passa", "FAIL");
const n = bb + bp + pp + pb;
const po = (bb + pp) / n;
const pe = (((bb + bp) / n) * ((bb + pb) / n)) + (((pp + pb) / n) * ((pp + bp) / n));
const kappa = (po - pe) / (1 - pe);
const recall = bb / (bb + bp || 1);

const report = {
  data: new Date().toISOString().slice(0, 10),
  itemTotali: items.length,
  itemValidi: n,
  errori: esiti.filter((e) => e.errore).map((e) => ({ id: e.item.id, errore: e.errore })),
  matrice: { bocciaGiudicataFAIL: bb, bocciaGiudicataPASS: bp, passaGiudicataPASS: pp, passaGiudicataFAIL: pb },
  falsiPromossi: validi.filter((e) => e.item.label === "boccia" && e.review.verdict === "PASS").map((e) => e.item.id),
  falsiBocciati: validi.filter((e) => e.item.label === "passa" && e.review.verdict === "FAIL").map((e) => e.item.id),
  kappa: Number(kappa.toFixed(3)),
  recallBoccia: Number(recall.toFixed(3)),
  gate: { kappaMin: 0.6, recallMin: 0.9, superato: kappa >= 0.6 && recall >= 0.9 },
};
writeFileSync(join(CAL, "report-critico.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`\nκ di Cohen = ${report.kappa}   recall(boccia) = ${report.recallBoccia}   (${n} item validi, ${report.errori.length} errori)`);
console.log(`matrice: boccia→FAIL ${bb} · boccia→PASS ${bp} · passa→PASS ${pp} · passa→FAIL ${pb}`);
console.log(report.gate.superato ? "GATE SUPERATO (κ≥0.6 e recall≥0.9)" : "GATE NON SUPERATO");
process.exit(report.gate.superato ? 0 : 1);
