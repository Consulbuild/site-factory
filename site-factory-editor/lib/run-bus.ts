import fs from "node:fs";
import path from "node:path";
import { clientDir } from "./paths";
import { runDir } from "./factory/paths";
import { runStep, type RunEvent } from "./run-step";
import { eseguiRun } from "./factory/fasi";
import { STEPS, setStepState, type StepKey, type RunCtx } from "./steps";
import { listClients, readClientState } from "./clients";
import { listRuns, aggiornaRun } from "./factory/state";

// Bus dei run in background (DESIGN-REFACTOR §6.1): i run AI vivono nel
// processo Next, NON nel ciclo di vita della richiesta HTTP — navigare o
// chiudere il tab non li uccide più. Gli eventi vengono tee-ati su disco
// (run.ndjson, con timestamp) e bufferizzati in memoria per l'attach della
// status bar; lo stop esplicito passa da un AbortController che riusa il
// plumbing dei segnali di run-step (SIGTERM ai child claude/script).
// Lo stash su globalThis sopravvive all'HMR di next dev.

export type BusRunInfo = {
  id: string; // "cliente:<slug>:<step>" | "fabbrica:<runId>"
  kind: "cliente" | "fabbrica";
  slug?: string;
  step?: string;
  runId?: string;
  /** Nome leggibile per la UI (azienda o id run). */
  label: string;
  startedAt: number;
  /** Etichetta della fase corrente (dagli eventi `phase`). */
  fase: string | null;
  /** Timeline delle fasi viste finora. */
  fasi: Array<{ label: string; at: number }>;
  done: boolean;
  esito?: "ok" | "errore" | "interrotto";
  errore?: string;
  endedAt?: number;
  /** Durata dell'ultima run riuscita dello stesso step (per il «di solito ~N min»). */
  tipicoMs?: number;
  /** true per gli stati ricostruiti dopo un riavvio (nessun processo vivo). */
  zombie?: boolean;
};

/** Evento con timestamp; `bus-done` è il sentinello di chiusura per i subscriber. */
export type BusEvent = (RunEvent | { type: "bus-done" }) & { t: number };

type BusRun = BusRunInfo & {
  ac: AbortController;
  stopRequested: boolean;
  buffer: BusEvent[];
  listeners: Set<(ev: BusEvent) => void>;
  eventsFile: string;
};

const BUS: { runs: Map<string, BusRun> } = ((globalThis as Record<string, unknown>).__sfRunBus ??= {
  runs: new Map(),
}) as { runs: Map<string, BusRun> };

const TTL_FINITI_MS = 15 * 60 * 1000;

export const busIdCliente = (slug: string, step: string) => `cliente:${slug}:${step}`;
export const busIdFabbrica = (runId: string) => `fabbrica:${runId}`;

function emit(run: BusRun, ev: RunEvent) {
  const conT = { ...ev, t: Date.now() };
  run.buffer.push(conT);
  try {
    fs.appendFileSync(run.eventsFile, JSON.stringify(conT) + "\n");
  } catch {
    /* il log su disco è best-effort: il run non si ferma per un errore di scrittura */
  }
  if (ev.type === "phase") {
    run.fase = ev.label;
    run.fasi.push({ label: ev.label, at: conT.t });
  } else if (ev.type === "error") {
    run.esito = "errore";
    run.errore = ev.message;
  } else if (ev.type === "done") {
    run.esito = "ok";
  }
  for (const fn of run.listeners) fn(conT);
}

function avvia(run: BusRun, gen: AsyncGenerator<RunEvent>, onStop?: () => void) {
  BUS.runs.set(run.id, run);
  fs.mkdirSync(path.dirname(run.eventsFile), { recursive: true });
  fs.writeFileSync(run.eventsFile, "");
  void (async () => {
    try {
      for await (const ev of gen) emit(run, ev);
    } catch (e) {
      emit(run, { type: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      run.done = true;
      run.endedAt = Date.now();
      if (run.stopRequested) {
        run.esito = "interrotto";
        onStop?.();
      } else if (!run.esito) {
        // generatore finito senza done/error (non dovrebbe accadere)
        run.esito = "errore";
        run.errore ??= "run terminato senza esito";
      }
      for (const fn of run.listeners) fn({ type: "bus-done", t: Date.now() });
    }
  })();
}

function nuovoRun(base: Omit<BusRunInfo, "startedAt" | "fase" | "fasi" | "done">, eventsFile: string): BusRun {
  return {
    ...base,
    startedAt: Date.now(),
    fase: null,
    fasi: [],
    done: false,
    ac: new AbortController(),
    stopRequested: false,
    buffer: [],
    listeners: new Set(),
    eventsFile,
  };
}

/** Avvia (in background) uno step cliente. Errore se già in esecuzione. */
export function startClientRun(
  slug: string,
  step: StepKey,
  ctx: RunCtx,
  label: string,
): { id: string } | { error: string } {
  const id = busIdCliente(slug, step);
  const esistente = BUS.runs.get(id);
  if (esistente && !esistente.done) return { error: "step già in esecuzione per questo cliente" };
  let tipicoMs: number | undefined;
  try {
    const ultima = readClientState(slug).steps[STEPS[step].stateKey]?.ultimaRun;
    if (ultima?.esito === "ok") tipicoMs = ultima.durataMs;
  } catch {
    /* stato illeggibile: nessuna stima */
  }
  const run = nuovoRun(
    { id, kind: "cliente", slug, step, label, tipicoMs },
    path.join(clientDir(slug), "logs", `run-${step}.ndjson`),
  );
  avvia(run, runStep(slug, step, ctx, run.ac.signal), () =>
    setStepState(slug, STEPS[step].stateKey, "errore", "Run interrotto manualmente"),
  );
  return { id };
}

/** Avvia (in background) una run di fabbrica. Errore se già in esecuzione. */
export function startFactoryRun(runId: string): { id: string } | { error: string } {
  const id = busIdFabbrica(runId);
  const esistente = BUS.runs.get(id);
  if (esistente && !esistente.done) return { error: "run già in esecuzione" };
  const run = nuovoRun({ id, kind: "fabbrica", runId, label: runId }, path.join(runDir(runId), "run.ndjson"));
  avvia(run, eseguiRun(runId, run.ac.signal), () =>
    aggiornaRun(runId, (r) => {
      r.stato = "fallita";
    }),
  );
  return { id };
}

/** Stop di un run vivo (SIGTERM ai child); su un run finito = dismiss. */
export function stopRun(id: string): boolean {
  const run = BUS.runs.get(id);
  if (!run) return false;
  if (run.done) {
    BUS.runs.delete(id); // dismiss dell'esito dalla status bar
    return true;
  }
  run.stopRequested = true;
  run.ac.abort();
  return true;
}

/** Eventi dal buffer in memoria (run vivo o appena finito). */
export function eventiDaBuffer(id: string, since: number): { events: BusEvent[]; next: number; done: boolean; esito?: string } | null {
  const run = BUS.runs.get(id);
  if (!run) return null;
  return { events: run.buffer.slice(since), next: run.buffer.length, done: run.done, esito: run.esito };
}

/** Fallback dopo un riavvio: eventi dal file ndjson persistito. */
export function eventiDaFile(id: string): { events: BusEvent[]; next: number; done: boolean } | null {
  const file = fileEventiPerId(id);
  if (!file || !fs.existsSync(file)) return null;
  const events: BusEvent[] = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      /* riga troncata (crash a metà scrittura): la salto */
    }
  }
  return { events, next: events.length, done: true };
}

function fileEventiPerId(id: string): string | null {
  const [kind, ...resto] = id.split(":");
  try {
    if (kind === "cliente") {
      const step = resto.pop()!;
      return path.join(clientDir(resto.join(":")), "logs", `run-${step}.ndjson`);
    }
    if (kind === "fabbrica") return path.join(runDir(resto.join(":")), "run.ndjson");
  } catch {
    /* slug/runId non valido */
  }
  return null;
}

/** Sottoscrizione live per lo stream NDJSON della route POST. */
export function subscribe(id: string, fn: (ev: BusEvent) => void): (() => void) | null {
  const run = BUS.runs.get(id);
  if (!run) return null;
  run.listeners.add(fn);
  return () => run.listeners.delete(fn);
}

export function getRun(id: string): BusRun | undefined {
  return BUS.runs.get(id);
}

const pubblica = (r: BusRun): BusRunInfo => ({
  id: r.id,
  kind: r.kind,
  slug: r.slug,
  step: r.step,
  runId: r.runId,
  label: r.label,
  startedAt: r.startedAt,
  fase: r.fase,
  fasi: r.fasi,
  done: r.done,
  esito: r.esito,
  errore: r.errore,
  endedAt: r.endedAt,
});

/**
 * Stato complessivo per la status bar: run vivi + esiti recenti (15 min) +
 * zombie ricostruiti (stato `in_corso` su disco senza processo vivo — tipico
 * dopo un riavvio dell'editor). I zombie vengono riparati qui, una volta:
 * lo stato su disco passa a errore/fallita con motivo esplicito.
 */
export function activeRuns(): BusRunInfo[] {
  const ora = Date.now();
  const out: BusRunInfo[] = [];
  for (const [id, run] of BUS.runs) {
    if (run.done && ora - (run.endedAt ?? 0) > TTL_FINITI_MS) {
      BUS.runs.delete(id);
      continue;
    }
    out.push(pubblica(run));
  }
  // Zombie clienti
  for (const c of listClients()) {
    const stato = readClientState(c.slug);
    for (const step of Object.keys(STEPS) as StepKey[]) {
      const s = stato.steps[STEPS[step].stateKey];
      if (s?.stato === "in_corso" && !BUS.runs.has(busIdCliente(c.slug, step))) {
        setStepState(c.slug, STEPS[step].stateKey, "errore", "Run interrotto (riavvio dell'editor)");
        out.push({
          id: busIdCliente(c.slug, step),
          kind: "cliente",
          slug: c.slug,
          step,
          label: c.businessName,
          startedAt: ora,
          fase: null,
          fasi: [],
          done: true,
          esito: "interrotto",
          errore: "Run interrotto (riavvio dell'editor)",
          endedAt: ora,
          zombie: true,
        });
      }
    }
  }
  // Zombie fabbrica
  for (const r of listRuns()) {
    if (r.stato === "in_corso" && !BUS.runs.has(busIdFabbrica(r.runId))) {
      aggiornaRun(r.runId, (x) => {
        x.stato = "fallita";
      });
      out.push({
        id: busIdFabbrica(r.runId),
        kind: "fabbrica",
        runId: r.runId,
        label: r.runId,
        startedAt: ora,
        fase: null,
        fasi: [],
        done: true,
        esito: "interrotto",
        errore: "Run interrotta (riavvio dell'editor)",
        endedAt: ora,
        zombie: true,
      });
    }
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}
