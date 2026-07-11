import fs from "node:fs";
import path from "node:path";
import { IO, type RunEvent, type PhaseResult } from "../run-step.ts";
import { NODE_BIN, SITE_RENDERER } from "../paths";
import { runDir, referenceDir, PRESETS_DIR } from "./paths.ts";
import { readRun, aggiornaFase, aggiornaRun } from "./state.ts";
import type { FactoryRun } from "./schemas.ts";

// Le 5 fasi di una run di fabbrica (M6): designer → validate → build → gates
// → critico. Orchestrazione deterministica in TS; le fasi AI passano da
// io.claude (login Max), quelle deterministiche da io.script. Ogni fase
// scrive il suo report su disco: la run è riprendibile dalla prima fase non
// conclusa e ogni fallimento lascia il motivo nel report.

const READ_SKILL_WRITE = ["Read", "Skill", "Write"];
const NO_NET_NO_BASH = ["WebSearch", "WebFetch", "Bash", "Edit", "Task"];
const NPM_BIN = path.join(path.dirname(NODE_BIN), "npm");
const SCRIPTS = path.join(SITE_RENDERER, "scripts", "factory");

/** Id del preset candidato di una run (deterministico). */
export const candidatoId = (runId: string) => `candidato-${runId.replace(/^run-/, "")}`;

const percorsi = (runId: string) => {
  const dir = runDir(runId);
  return {
    dir,
    candidate: path.join(dir, "candidate.tokens.json"),
    motivazioni: path.join(dir, "motivazioni.json"),
    review: path.join(dir, "critic-review.json"),
    shots: path.join(dir, "shots"),
    gates: path.join(dir, "gates"),
  };
};

const jsonLeggibile = (file: string): boolean => {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
    return true;
  } catch {
    return false;
  }
};

// ---------- fase: designer ----------

function promptDesigner(run: FactoryRun, correzione?: { round: number }): string {
  const p = percorsi(run.runId);
  const refs = run.references
    .map((id) => `- ${id}: ${path.join(referenceDir(id), "extraction.tokens.json")}`)
    .join("\n");
  const base =
    `Usa la skill preset-designer. Run di fabbrica «${run.runId}».\n` +
    `Riferimenti estratti (${run.references.length}):\n${refs}\n` +
    `Grammatica dello standard: ${path.join(SITE_RENDERER, "DESIGN.md")} (e PRODUCT.md accanto).\n` +
    `Sintesi libreria (per trovare lo spazio LIBERO): ${path.join(PRESETS_DIR, "presets.manifest.json")} e i 6 file *.meta.json in ${PRESETS_DIR}.\n` +
    `Font ammessi: ${path.join(PRESETS_DIR, "font-whitelist.json")}.\n` +
    `Universo token e FORME esatte dei valori: ${path.join(PRESETS_DIR, "meridian.tokens.json")}.\n`;
  if (correzione) {
    return (
      base +
      `MODALITÀ CORREZIONE (round ${correzione.round}): leggi ${p.review} e modifica SOLO i token nominati nei findings ` +
      `(sezione «Modalità correzione» della skill). Riscrivi completi ${p.candidate} e ${p.motivazioni}. Poi una riga di riepilogo.`
    );
  }
  return (
    base +
    `Scrivi ${p.candidate} e ${p.motivazioni} nel formato della sezione «Formato artifact» della skill. Poi una riga di riepilogo.`
  );
}

async function* faseDesigner(run: FactoryRun, correzione?: { round: number }): AsyncGenerator<RunEvent, PhaseResult> {
  const p = percorsi(run.runId);
  const res = yield* IO.claude({
    phase: correzione ? `Preset-designer — correzione round ${correzione.round}` : "Preset-designer (evidenza → candidato)",
    prompt: promptDesigner(run, correzione),
    allowed: READ_SKILL_WRITE,
    disallowed: NO_NET_NO_BASH,
    timeoutMs: 20 * 60 * 1000,
    maxTurns: 80,
  });
  if (!res.ok) return res;
  if (!jsonLeggibile(p.candidate) || !jsonLeggibile(p.motivazioni)) {
    return { ok: false, error: "il designer non ha prodotto candidate.tokens.json/motivazioni.json validi" };
  }
  return { ok: true };
}

// ---------- fase: validate (zero-invenzioni) ----------

async function* faseValidate(run: FactoryRun): AsyncGenerator<RunEvent, PhaseResult> {
  const p = percorsi(run.runId);
  const refsArgs = run.references.flatMap((id) => ["--refs", referenceDir(id)]);
  const res = yield* IO.script({
    phase: "Validatore zero-invenzioni",
    bin: NODE_BIN,
    args: [path.join(SCRIPTS, "validate-candidate.mjs"), p.candidate, p.motivazioni, p.dir, ...refsArgs],
    cwd: SITE_RENDERER,
    timeoutMs: 2 * 60 * 1000,
  });
  if (!res.ok) {
    const report = path.join(p.gates, "validate.json");
    const motivo = jsonLeggibile(report)
      ? JSON.parse(fs.readFileSync(report, "utf8"))
          .violazioni?.slice(0, 3)
          .map((v: { token: string; problema: string }) => `${v.token}: ${v.problema}`)
          .join("; ")
      : null;
    return { ok: false, error: motivo ? `zero-invenzioni: ${motivo}` : (res.error ?? "validazione fallita") };
  }
  return { ok: true };
}

// ---------- fase: build (candidato → anteprima + shots, poi ripristino) ----------

async function* faseBuild(run: FactoryRun): AsyncGenerator<RunEvent, PhaseResult> {
  const p = percorsi(run.runId);
  const id = candidatoId(run.runId);
  const passi: Array<{ phase: string; args: string[]; timeoutMs: number; bin?: string }> = [
    {
      phase: "Build token candidato (Terrazzo --extra)",
      args: [path.join(SITE_RENDERER, "scripts", "build-presets.mjs"), "--extra", p.candidate, "--id", id],
      timeoutMs: 3 * 60 * 1000,
    },
    {
      phase: "Build anteprima (astro)",
      bin: NPM_BIN,
      args: ["run", "build"],
      timeoutMs: 5 * 60 * 1000,
    },
    {
      phase: "Screenshot candidato (7 scatti)",
      args: [path.join(SITE_RENDERER, "scripts", "make-goldset.mjs"), "--candidato", id, p.shots],
      timeoutMs: 4 * 60 * 1000,
    },
    {
      phase: "Ripristino file generati (build:presets)",
      args: [path.join(SITE_RENDERER, "scripts", "build-presets.mjs")],
      timeoutMs: 3 * 60 * 1000,
    },
  ];
  for (const passo of passi) {
    const res = yield* IO.script({
      phase: passo.phase,
      bin: passo.bin ?? NODE_BIN,
      args: passo.args,
      cwd: SITE_RENDERER,
      timeoutMs: passo.timeoutMs,
    });
    if (!res.ok) return res;
  }
  if (!fs.existsSync(path.join(p.shots, "hero-1280.jpg"))) {
    return { ok: false, error: "build senza screenshot del candidato" };
  }
  return { ok: true };
}

// ---------- fase: gates (L1 deterministici, L2 novelty, L3 UIClip) ----------
// Budget del piano: UNA correzione per gate deterministico — su bocciatura il
// designer rivede SOLO ciò che il report nomina, si ricostruisce e si riprova
// una volta; se boccia ancora, escalation umana (run fallita, report su disco).

async function* faseGates(run: FactoryRun): AsyncGenerator<RunEvent, PhaseResult> {
  const primo = yield* faseGatesUnaVolta(run);
  if (primo.ok || primo.error?.startsWith("infrastruttura")) return primo;

  yield { type: "text", text: `Gate bocciato (${primo.error}) — correzione unica del designer, poi riprova.` };
  aggiornaRun(run.runId, (r) => {
    r.misure = { ...r.misure, correzioniUmane: r.misure?.correzioniUmane ?? 0 };
  });
  const fix = yield* faseDesignerFixGate(run, primo.error ?? "gate bocciato");
  if (!fix.ok) return fix;
  const rebuild = yield* faseBuild(run);
  if (!rebuild.ok) return rebuild;
  const secondo = yield* faseGatesUnaVolta(run);
  if (!secondo.ok)
    return { ok: false, error: `${secondo.error} — anche dopo la correzione unica: escalation umana (report in gates/)` };
  return secondo;
}

async function* faseDesignerFixGate(run: FactoryRun, motivo: string): AsyncGenerator<RunEvent, PhaseResult> {
  const p = percorsi(run.runId);
  const res = yield* IO.claude({
    phase: "Preset-designer — correzione da gate",
    prompt:
      promptDesigner(run) +
      `MODALITÀ CORREZIONE DA GATE: il candidato è stato bocciato da un gate deterministico con questo motivo:\n` +
      `«${motivo}»\n` +
      `I report completi sono in ${p.gates}/ (validate.json, l1.json, novelty.json con topContributi per preset, uiclip.json). ` +
      `Leggili e modifica SOLO ciò che serve a superare il motivo della bocciatura (es. tokenDiff troppo basso verso un preset → ` +
      `cambia la dimensione nominata in topContributi: famiglia heading, raggi/ombre, cassa…), mantenendo evidenza e coerenza. ` +
      `Aggiorna le voci toccate in motivazioni.json. Riscrivi completi ${p.candidate} e ${p.motivazioni}. Poi una riga di riepilogo.`,
    allowed: READ_SKILL_WRITE,
    disallowed: NO_NET_NO_BASH,
    timeoutMs: 15 * 60 * 1000,
    maxTurns: 60,
  });
  if (!res.ok) return res;
  if (!jsonLeggibile(p.candidate) || !jsonLeggibile(p.motivazioni))
    return { ok: false, error: "correzione senza candidate/motivazioni validi" };
  // la correzione deve restare a zero invenzioni
  return yield* faseValidate(run);
}

async function* faseGatesUnaVolta(run: FactoryRun): AsyncGenerator<RunEvent, PhaseResult> {
  const p = percorsi(run.runId);
  const id = candidatoId(run.runId);
  // la dist deve contenere l'anteprima del candidato (prodotta dalla fase build)
  if (!fs.existsSync(path.join(SITE_RENDERER, "dist", "anteprima", id, "index.html"))) {
    return { ok: false, error: "anteprima del candidato assente dalla dist: riesegui la fase build" };
  }
  const l1 = yield* IO.script({
    phase: "Gate L1 (axe AA · overflow · pesi font · parole spezzate)",
    bin: NODE_BIN,
    args: [path.join(SCRIPTS, "l1-candidato.mjs"), "--dist", path.join(SITE_RENDERER, "dist"), "--preset", id, "--run", p.dir],
    cwd: SITE_RENDERER,
    timeoutMs: 4 * 60 * 1000,
  });
  if (!l1.ok) return { ok: false, error: motivoDaReport(p.gates, "l1.json") ?? l1.error ?? "gate L1 bocciato" };

  const refsArgs = run.references.flatMap((rid) => ["--refs", referenceDir(rid)]);
  const l2 = yield* IO.script({
    phase: "Gate L2 novelty (dHash · tokenDiff · CSD · Vendi)",
    bin: NODE_BIN,
    args: [path.join(SCRIPTS, "novelty.mjs"), p.candidate, p.shots, p.dir, ...refsArgs],
    cwd: SITE_RENDERER,
    timeoutMs: 10 * 60 * 1000,
  });
  if (!l2.ok) return { ok: false, error: motivoDaReport(p.gates, "novelty.json") ?? l2.error ?? "gate novelty bocciato" };

  const l3 = yield* IO.script({
    phase: "Gate L3 UIClip (pre-filtro rotto/sano)",
    bin: NODE_BIN,
    args: [path.join(SCRIPTS, "l3-uiclip.mjs"), p.shots, p.dir],
    cwd: SITE_RENDERER,
    timeoutMs: 6 * 60 * 1000,
  });
  if (!l3.ok) return { ok: false, error: motivoDaReport(p.gates, "uiclip.json") ?? l3.error ?? "gate UIClip bocciato" };
  return { ok: true };
}

/** Il motivo VERO di una bocciatura sta nel report del gate, non nello stderr
 *  (che i tool a valle sporcano di warning, es. HF Hub). */
function motivoDaReport(gatesDir: string, file: string): string | null {
  const f = path.join(gatesDir, file);
  if (!jsonLeggibile(f)) return null;
  const r = JSON.parse(fs.readFileSync(f, "utf8"));
  if (r.esito === "ok" || r.esito === "warning") return null;
  if (Array.isArray(r.motivi) && r.motivi.length) return `novelty: ${r.motivi.join("; ")}`;
  if (file === "l1.json")
    return `L1: axe ${r.axe?.violazioni?.length ?? 0} violazioni, overflow390 ${r.overflow390}, pesi orfani ${r.pesiOrfani?.length ?? 0}, parole spezzate ${r.paroleSpezzate?.length ?? 0}`;
  if (file === "uiclip.json") return `UIClip: min ${r.min} < soglia ${r.soglia}`;
  return null;
}

// ---------- fase: critico (L4, max 3 round; le correzioni toccano SOLO i token nominati) ----------

async function* faseCritico(run: FactoryRun): AsyncGenerator<RunEvent, PhaseResult> {
  const p = percorsi(run.runId);
  for (let round = 1; round <= 3; round++) {
    const res = yield* IO.claude({
      phase: `Critico visivo — round ${round}`,
      prompt:
        `Usa la skill design-critic. Candidato della run «${run.runId}». ` +
        `Screenshot (7 file JPEG, 390 e 1280) nella cartella: ${p.shots}/ — leggili TUTTI con Read. ` +
        `Scrivi SOLO ${p.review} con "round": ${round}, nel formato della sezione «Formato artifact» della skill. Poi una riga col verdetto.`,
      allowed: READ_SKILL_WRITE,
      disallowed: NO_NET_NO_BASH,
      timeoutMs: 15 * 60 * 1000,
      maxTurns: 60,
    });
    if (!res.ok) return res;
    if (!jsonLeggibile(p.review)) return { ok: false, error: "il critico non ha scritto critic-review.json" };
    const review = JSON.parse(fs.readFileSync(p.review, "utf8"));
    aggiornaRun(run.runId, (r) => {
      r.misure = { ...r.misure, roundCritico: round };
    });
    if (review.verdict === "PASS") return { ok: true };
    if (round === 3) return { ok: false, error: "critico: FAIL dopo 3 round — escalation umana (vedi critic-review.json)" };

    // correzione mirata + rebuild + re-L1 (novelty/UIClip non si rifanno: i
    // fix da critico sono ritocchi di token, la distanza non cambia registro)
    const fix = yield* faseDesigner(run, { round: round + 1 });
    if (!fix.ok) return fix;
    const rebuild = yield* faseBuild(run);
    if (!rebuild.ok) return rebuild;
    const l1 = yield* faseGates(run); // include L2/L3: prudenza — vedi nota
    if (!l1.ok) return l1;
  }
  return { ok: false, error: "loop critico esaurito" };
}

// ---------- esecuzione della run (riprendibile) ----------

const FASI: Record<string, (run: FactoryRun) => AsyncGenerator<RunEvent, PhaseResult>> = {
  designer: (r) => faseDesigner(r),
  validate: (r) => faseValidate(r),
  build: (r) => faseBuild(r),
  gates: (r) => faseGates(r),
  critico: (r) => faseCritico(r),
};

/** Esegue le fasi dalla prima non conclusa; si ferma al primo fallimento. */
export async function* eseguiRun(runId: string): AsyncGenerator<RunEvent> {
  const run = readRun(runId);
  if (!run) {
    yield { type: "error", message: `run inesistente: ${runId}` };
    return;
  }
  yield { type: "start", step: runId };
  aggiornaRun(runId, (r) => {
    r.stato = "in_corso";
  });
  // staleness: un candidato modificato DOPO la build (es. escalation umana)
  // invalida build e gate — si riparte dalla build, non da shot stantii
  const p = percorsi(runId);
  const shot = path.join(p.shots, "hero-1280.jpg");
  if (fs.existsSync(p.candidate) && fs.existsSync(shot) && fs.statSync(p.candidate).mtimeMs > fs.statSync(shot).mtimeMs) {
    yield { type: "text", text: "Candidato modificato dopo l'ultima build: build e gate si rieseguono." };
    aggiornaRun(runId, (r) => {
      for (const f of r.fasi) if (f.nome === "build" || f.nome === "gates") f.esito = "in_attesa";
    });
  }
  const corrente0 = readRun(runId)!;
  run.fasi = corrente0.fasi;
  for (const fase of run.fasi) {
    if (fase.esito === "ok") continue;
    aggiornaFase(runId, fase.nome, { esito: "in_corso", avviatoIl: new Date().toISOString() });
    let res: PhaseResult;
    try {
      const corrente = readRun(runId)!;
      res = yield* FASI[fase.nome](corrente);
    } catch (e) {
      res = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (!res.ok) {
      aggiornaFase(runId, fase.nome, { esito: "fallita" });
      aggiornaRun(runId, (r) => {
        r.stato = "fallita";
      });
      yield { type: "error", message: `${fase.nome}: ${res.error ?? "fase fallita"}` };
      return;
    }
    aggiornaFase(runId, fase.nome, { esito: "ok" });
  }
  aggiornaRun(runId, (r) => {
    r.stato = "da_audire";
  });
  yield { type: "done", artifact: "run da audire" };
}
