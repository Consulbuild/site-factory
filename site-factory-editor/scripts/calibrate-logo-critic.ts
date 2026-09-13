// Taratura del logo-critic contro i falsi negativi: per ogni item oro
// (scripts/fixtures/logo-gold/<id>/: logo/mark-N.png + atteso.json + contesto.json)
// esegue foglio+metriche (generate-logo.mjs), il critico (claude -p headless,
// login Max — MAI ANTHROPIC_API_KEY) e il verdetto in TS (lib/logo.ts fondiReview),
// poi confronta con atteso.json. Ogni item gira N volte (default 2) per misurare
// la stabilità. Gate: ogni «passa» → PASS; ogni «boccia» → FAIL col codice atteso;
// stabilità ≥ 90%. Con un oro bocciato stampa «TROPPO SEVERO» e fallisce.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/calibrate-logo-critic.ts [--only <id>] [--runs 2] [--force]
//
// atteso.json: { "nome": "TERMOIDRAULICA ROSSI", "bg": "#fbfaf7", "label": "passa"|"boccia",
//   "scelta_umana": "logo/mark-2.png", "codici": { "logo/mark-2.png": ["fatto_inventato"] }, "note": "…" }
// I loghi reali di clienti NON vanno in git: la cartella è nel .gitignore delle fixture
// tranne i sintetici; i file di Mattia si aggiungono a mano.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { fondiReview, type Verdetto } from "../lib/logo.ts";
import type { LogoReview, LogoVariante } from "../lib/schemas.ts";

const EDITOR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.join(EDITOR, "..");
const RENDERER = path.join(REPO_ROOT, "site-renderer");
const GOLD = path.join(EDITOR, "scripts", "fixtures", "logo-gold");
const CLAUDE_BIN = path.join(homedir(), ".local", "bin", "claude");
const NODE_BIN = path.join(homedir(), ".local", "bin", "node");
const REPORT = path.join(REPO_ROOT, "factory", "calibration", "report-logo-critic.json");

const argv = process.argv.slice(2);
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const RUNS = argv.includes("--runs") ? Number(argv[argv.indexOf("--runs") + 1]) : 2;
const FORCE = argv.includes("--force");

type Atteso = { nome: string; bg?: string; label: "passa" | "boccia"; scelta_umana?: string; codici?: Record<string, string[]>; note?: string };
type Item = { id: string; dir: string; atteso: Atteso; files: string[] };

const items: Item[] = fs.existsSync(GOLD)
  ? fs
      .readdirSync(GOLD, { withFileTypes: true })
      .filter((d) => d.isDirectory() && (!ONLY || d.name === ONLY))
      .map((d) => {
        const dir = path.join(GOLD, d.name);
        const files = fs.existsSync(path.join(dir, "logo")) ? fs.readdirSync(path.join(dir, "logo")).filter((f) => /^mark-\d\.png$/.test(f)).sort() : [];
        const attesoFile = path.join(dir, "atteso.json");
        return { id: d.name, dir, files, atteso: fs.existsSync(attesoFile) ? (JSON.parse(fs.readFileSync(attesoFile, "utf8")) as Atteso) : null };
      })
      .filter((x): x is Item => !!x.atteso && x.files.length > 0)
  : [];
if (!items.length) {
  console.error(`nessun item in ${GOLD}: servono cartelle <id>/logo/mark-N.png + <id>/atteso.json`);
  process.exit(2);
}

function foglio(item: Item): Record<string, unknown> {
  const out = path.join(item.dir, "logo", "contatto.png");
  const r = spawnSync(NODE_BIN, ["scripts/generate-logo.mjs", "--contatto", out, "--bg", item.atteso.bg ?? "#ffffff", ...item.files.map((f) => path.join(item.dir, "logo", f))], { cwd: RENDERER, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`foglio fallito per ${item.id}: ${(r.stderr || r.stdout).slice(-300)}`);
  return JSON.parse(fs.readFileSync(path.join(item.dir, "logo", "metriche.json"), "utf8")) as Record<string, unknown>;
}

function varianti(item: Item, metriche: Record<string, unknown>): LogoVariante[] {
  return item.files.map((f) => ({ file: `logo/${f}`, round: 1, esito: "usabile" as const, metriche: metriche[`logo/${f}`] as LogoVariante["metriche"] }));
}

function promptCritico(item: Item): string {
  const rel = path.relative(REPO_ROOT, item.dir);
  const consentiti = [item.atteso.nome];
  return (
    `Usa la skill logo-critic per il cliente «${item.id}». ` +
    `GUARDA con Read multimodale il foglio di contatto ${rel}/logo/contatto.png: una riga per variante, con il logo a 512 px, ` +
    `nella striscia dell'header a 40 px sul fondo reale del preset, a 40 px su fondo scuro, a 96 e a 256 px; ` +
    `i PNG originali sono in ${rel}/logo/ (aprili SOLO per una lettera dubbia). ` +
    `Nome ESATTO che il logo deve mostrare: «${item.atteso.nome}». Testi consentiti oltre al nome: ${consentiti.map((t) => `«${t}»`).join(", ")}` +
    (fs.existsSync(path.join(item.dir, "contesto.json")) ? ` e tutto ciò che è scritto in ${rel}/contesto.json; ` : "; ") +
    `ogni altro numero, anno o claim è un fatto inventato. Metriche deterministiche: ${rel}/logo/metriche.json. ` +
    `Varianti da giudicare: ${item.files.map((f) => `logo/${f}`).join(", ")}. ` +
    `Scrivi SOLO ${rel}/logo-review.json con "round": 1 nel formato della skill ` +
    `({"round": 1, "varianti": [{"file": "logo/mark-N.png", "testi_letti": [{"testo": "…", "certo": true, "ruolo": "nome"|"descrittore"|"altro"}], ` +
    `"punteggi": {"L1": 0-2, "L2": 0-2, "L3": 0-2, "L4": 0-2, "L5": 0-2, "P1": 0-2, "P2": 0-2, "P3": 0-2, "P4": 0-2, "P5": 0-2}, ` +
    `"prove": {"L1": "…"}, "bloccanti": [{"codice": "…", "prova": "…"}], "preferenza_motivo": "…"}], "fix_prompt": null}). ` +
    `Il verdetto lo calcola l'editor. Poi una riga di riepilogo.`
  );
}

function critico(item: Item): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      CLAUDE_BIN,
      ["-p", promptCritico(item), "--output-format", "json", "--model", "claude-opus-4-8", "--effort", "xhigh", "--max-turns", "20", "--allowedTools", "Read", "Skill", "Write", "--disallowedTools", "Bash", "Edit", "WebSearch", "WebFetch", "Task"],
      { cwd: REPO_ROOT, env: { ...process.env, PATH: `${path.join(homedir(), ".local", "bin")}:${process.env.PATH ?? ""}` } },
    );
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
    child.stdout.on("data", () => {});
    const t = setTimeout(() => child.kill("SIGTERM"), 10 * 60 * 1000);
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ code: code ?? 1, stderr });
    });
  });
}

function leggiReview(item: Item): LogoReview | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(item.dir, "logo-review.json"), "utf8")) as LogoReview;
    return raw && Array.isArray(raw.varianti) ? raw : null;
  } catch {
    return null;
  }
}

type Esito = { item: Item; run: number; verdetto: Verdetto; ok: boolean; motivi: string[] };
const esiti: Esito[] = [];

for (const item of items) {
  const metriche = foglio(item);
  const vs = varianti(item, metriche);
  const fonti = fs.existsSync(path.join(item.dir, "contesto.json")) ? fs.readFileSync(path.join(item.dir, "contesto.json"), "utf8") : "";
  for (let run = 1; run <= RUNS; run++) {
    const reviewFile = path.join(item.dir, `logo-review.run${run}.json`);
    if (FORCE || !fs.existsSync(reviewFile)) {
      fs.rmSync(path.join(item.dir, "logo-review.json"), { force: true });
      let review: LogoReview | null = null;
      for (let tentativo = 1; tentativo <= 2 && !review; tentativo++) {
        const { code, stderr } = await critico(item);
        review = leggiReview(item);
        if (!review) console.error(`  ${item.id} run ${run}: review non valida (tentativo ${tentativo}, exit ${code}) ${stderr.slice(-160)}`);
      }
      if (!review) {
        esiti.push({ item, run, verdetto: fondiReview(vs, null, { nomeAtteso: item.atteso.nome, fonti, bg: item.atteso.bg ?? "#ffffff" }), ok: false, motivi: ["review non prodotta"] });
        continue;
      }
      fs.copyFileSync(path.join(item.dir, "logo-review.json"), reviewFile);
    }
    const review = JSON.parse(fs.readFileSync(reviewFile, "utf8")) as LogoReview;
    const verdetto = fondiReview(vs, review, { nomeAtteso: item.atteso.nome, fonti, bg: item.atteso.bg ?? "#ffffff" });
    const motivi: string[] = [];
    if (item.atteso.label === "passa" && verdetto.verdict !== "PASS") motivi.push(`TROPPO SEVERO: oro bocciato — ${verdetto.giudizi.map((g) => `${g.file}: ${g.motivo}`).join(" | ")}`);
    if (item.atteso.label === "boccia" && verdetto.verdict !== "FAIL") motivi.push(`falso promosso: ${verdetto.scelta}`);
    for (const [file, codici] of Object.entries(item.atteso.codici ?? {})) {
      const g = verdetto.giudizi.find((x) => x.file === file);
      const trovati = new Set(g?.bloccanti.map((b) => b.codice) ?? []);
      for (const c of codici) if (!trovati.has(c)) motivi.push(`${file}: atteso ${c}, trovati [${[...trovati].join(", ")}]`);
    }
    const ok = motivi.length === 0;
    esiti.push({ item, run, verdetto, ok, motivi });
    const scelta = item.atteso.scelta_umana ? (verdetto.scelta === item.atteso.scelta_umana ? "scelta = umana" : `scelta ${verdetto.scelta ?? "—"} ≠ umana ${item.atteso.scelta_umana}`) : "";
    console.log(`${ok ? "✓" : "✗"} ${item.id} run ${run}: ${verdetto.verdict} ${scelta}${motivi.length ? ` → ${motivi.join("; ")}` : ""}`);
  }
}

// stabilità: per item, i verdetti delle run coincidono?
const perItem = new Map<string, Esito[]>();
for (const e of esiti) perItem.set(e.item.id, [...(perItem.get(e.item.id) ?? []), e]);
const stabili = [...perItem.values()].filter((es) => new Set(es.map((e) => e.verdetto.verdict)).size === 1).length;
const stabilita = perItem.size ? stabili / perItem.size : 0;
const falsiBocciati = [...new Set(esiti.filter((e) => e.item.atteso.label === "passa" && e.verdetto.verdict === "FAIL").map((e) => e.item.id))];
const falsiPromossi = [...new Set(esiti.filter((e) => e.item.atteso.label === "boccia" && e.verdetto.verdict === "PASS").map((e) => e.item.id))];
const codiciSbagliati = esiti.filter((e) => e.ok === false && e.motivi.some((m) => m.startsWith("logo/"))).map((e) => `${e.item.id} run ${e.run}`);
const scelteUmane = esiti.filter((e) => e.item.atteso.scelta_umana);
const concordanza = scelteUmane.length ? scelteUmane.filter((e) => e.verdetto.scelta === e.item.atteso.scelta_umana).length / scelteUmane.length : null;
const superato = falsiBocciati.length === 0 && falsiPromossi.length === 0 && codiciSbagliati.length === 0 && stabilita >= 0.9;

const skillMd = path.join(REPO_ROOT, ".claude", "skills", "logo-critic", "SKILL.md");
const report = {
  data: new Date().toISOString().slice(0, 10),
  misuratoContro: { skillHash: createHash("sha256").update(fs.readFileSync(skillMd)).digest("hex").slice(0, 12), modello: "claude-opus-4-8" },
  item: items.length,
  run: RUNS,
  falsiBocciati,
  falsiPromossi,
  codiciSbagliati,
  stabilita: Number(stabilita.toFixed(2)),
  concordanzaSceltaUmana: concordanza === null ? null : Number(concordanza.toFixed(2)),
  gate: { superato, regola: "oro PASS 100%, negativi FAIL col codice atteso, stabilità ≥ 0.9; la concordanza con la scelta umana è informativa" },
  dettaglio: esiti.map((e) => ({ id: e.item.id, run: e.run, verdict: e.verdetto.verdict, scelta: e.verdetto.scelta, motivi: e.motivi, giudizi: e.verdetto.giudizi.map((g) => ({ file: g.file, bloccanti: g.bloccanti.map((b) => b.codice), preferenza: g.preferenza })) })),
};
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
console.log(`\nfalsi bocciati ${falsiBocciati.length} · falsi promossi ${falsiPromossi.length} · codici sbagliati ${codiciSbagliati.length} · stabilità ${report.stabilita}` + (concordanza === null ? "" : ` · scelta = umana ${report.concordanzaSceltaUmana}`));
console.log(`${superato ? "GATE SUPERATO" : "GATE NON SUPERATO" + (falsiBocciati.length ? " — TROPPO SEVERO: allentare l'ancora dello 0 del criterio citato nella prova, mai aggiungere eccezioni" : "")} → ${REPORT}`);
process.exit(superato ? 0 : 1);
