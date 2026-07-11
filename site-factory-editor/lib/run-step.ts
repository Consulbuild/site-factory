import { spawn } from "node:child_process";
import { REPO_ROOT, CLAUDE_BIN, childEnv } from "./paths";
import { STEPS, setStepState, patchStepMeta, type StepKey, type RunCtx } from "./steps";

// Runner degli step AI, multi-fase: ogni StepDef orchestra in TS una o più
// fasi `claude -p` headless (login Max, nessuna ANTHROPIC_API_KEY) tramite
// io.claude(); il loop di decisione (es. critico PASS/FAIL) è deterministico.
// Questo shell è l'UNICO a toccare client.json (stati) e a emettere error/done.

export type RunEvent =
  | { type: "start"; step: string }
  | { type: "phase"; label: string } // separatore di fase nel log
  | { type: "tool"; name: string; detail?: string }
  | { type: "text"; text: string }
  | { type: "done"; artifact: string }
  | { type: "error"; message: string };

export type PhaseResult = { ok: boolean; error?: string };

export interface StepIO {
  /**
   * Una fase = uno spawn `claude -p`. Emette PRIMA {type:"phase"}, poi
   * tool/text; MAI error/done — l'esito è il valore di RITORNO (timeout,
   * auth scaduta, exit ≠ 0 e result d'errore diventano {ok:false, error}).
   */
  claude(opts: {
    phase: string;
    prompt: string;
    allowed: string[];
    disallowed: string[];
    /** default 10 min (SIGTERM, +10s SIGKILL). */
    timeoutMs?: number;
    /** default 40. */
    maxTurns?: number;
    /** Env extra per il child (es. API key dal Keychain): mai in argv/prompt. */
    env?: Record<string, string>;
  }): AsyncGenerator<RunEvent, PhaseResult>;
  /**
   * Una fase = uno spawn deterministico (niente claude). Emette PRIMA
   * {type:"phase"}, poi {type:"text"} per ogni riga di stdout/stderr, così
   * come sono. Esito = valore di ritorno ({ok: exit===0}).
   */
  script(opts: {
    phase: string;
    bin: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    /** default 2 min (SIGTERM, +10s SIGKILL). */
    timeoutMs?: number;
  }): AsyncGenerator<RunEvent, PhaseResult>;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

async function* claudePhase(
  opts: {
    phase: string;
    prompt: string;
    allowed: string[];
    disallowed: string[];
    timeoutMs?: number;
    maxTurns?: number;
    env?: Record<string, string>;
  },
  signal?: AbortSignal,
): AsyncGenerator<RunEvent, PhaseResult> {
  yield { type: "phase", label: opts.phase };

  const args = [
    "-p",
    opts.prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    "claude-opus-4-8",
    "--effort",
    "xhigh",
    "--max-turns",
    String(opts.maxTurns ?? 40),
    "--allowedTools",
    ...opts.allowed,
    "--disallowedTools",
    ...opts.disallowed,
  ];

  const child = spawn(CLAUDE_BIN, args, { cwd: REPO_ROOT, env: childEnv(opts.env ?? {}) });

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
  const killer = setTimeout(() => child.kill("SIGKILL"), timeoutMs + 10_000);
  // Stream abbandonato (tab chiusa, reload): senza questo il child claude
  // resterebbe orfano a consumare quota e lo step «in_corso» per sempre.
  const onAbort = () => child.kill("SIGTERM");
  signal?.addEventListener("abort", onAbort, { once: true });

  let buf = "";
  let resultError: string | null = null;
  let spawnError: string | null = null;
  const queue: RunEvent[] = [];
  let resolveNext: (() => void) | null = null;
  const push = (e: RunEvent) => {
    queue.push(e);
    resolveNext?.();
    resolveNext = null;
  };

  child.stdout.on("data", (chunk: Buffer) => {
    buf += chunk.toString();
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("{")) continue; // righe non-JSON (warning CLI) ignorate
      let e: Record<string, unknown>;
      try {
        e = JSON.parse(line);
      } catch {
        continue;
      }
      handleEvent(e, push);
      if (e.type === "result" && (e.subtype !== "success" || e.is_error)) {
        resultError = String((e.result as string) ?? e.subtype ?? "errore sconosciuto");
      }
    }
  });

  let stderr = "";
  child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

  const closed = new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      spawnError = `spawn fallito: ${err.message}`;
      resolve(1);
    });
  });

  // Drena la coda finché il processo non chiude.
  let done = false;
  closed.then(() => {
    done = true;
    resolveNext?.();
  });
  while (!done || queue.length) {
    if (queue.length) {
      yield queue.shift()!;
    } else {
      await new Promise<void>((r) => (resolveNext = r));
    }
  }

  clearTimeout(timer);
  clearTimeout(killer);
  signal?.removeEventListener("abort", onAbort);
  const code = await closed;

  // Diagnosi errori tipici — SEMPRE come valore di ritorno, mai eventi.
  if (signal?.aborted) return { ok: false, error: "run interrotto" };
  if (spawnError) return { ok: false, error: spawnError };
  if (/logged out|not logged in|authentication|Invalid API key|OAuth/i.test(stderr)) {
    return { ok: false, error: "Sessione Claude non valida. Esegui `claude login` nel terminale e riprova." };
  }
  if (resultError) return { ok: false, error: resultError };
  if (code !== 0) {
    return {
      ok: false,
      error: stderr.trim().split("\n").slice(-3).join(" ") || `claude -p uscito con codice ${code} (fase «${opts.phase}»)`,
    };
  }
  return { ok: true };
}

const SCRIPT_TIMEOUT_MS = 2 * 60 * 1000;

/** Fase deterministica: stesso scaffold streaming di claudePhase, senza parse JSON. */
async function* scriptPhase(
  opts: {
    phase: string;
    bin: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
  },
  signal?: AbortSignal,
): AsyncGenerator<RunEvent, PhaseResult> {
  yield { type: "phase", label: opts.phase };

  // NO_COLOR: il log va nella UI, i codici ANSI sarebbero rumore.
  const child = spawn(opts.bin, opts.args, { cwd: opts.cwd ?? REPO_ROOT, env: childEnv({ NO_COLOR: "1", ...opts.env }) });

  const timeoutMs = opts.timeoutMs ?? SCRIPT_TIMEOUT_MS;
  const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
  const killer = setTimeout(() => child.kill("SIGKILL"), timeoutMs + 10_000);
  const onAbort = () => child.kill("SIGTERM");
  signal?.addEventListener("abort", onAbort, { once: true });

  let spawnError: string | null = null;
  let stderr = "";
  const queue: RunEvent[] = [];
  let resolveNext: (() => void) | null = null;
  const push = (e: RunEvent) => {
    queue.push(e);
    resolveNext?.();
    resolveNext = null;
  };

  // stdout e stderr riga per riga, verbatim (l'output degli script È il log).
  const lineReader = (onLine: (l: string) => void) => {
    let buf = "";
    return (chunk: Buffer) => {
      buf += chunk.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.trim()) onLine(line);
      }
    };
  };
  child.stdout.on("data", lineReader((l) => push({ type: "text", text: l })));
  child.stderr.on(
    "data",
    lineReader((l) => {
      stderr += l + "\n";
      push({ type: "text", text: l });
    }),
  );

  const closed = new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      spawnError = `spawn fallito: ${err.message}`;
      resolve(1);
    });
  });

  let done = false;
  closed.then(() => {
    done = true;
    resolveNext?.();
  });
  while (!done || queue.length) {
    if (queue.length) {
      yield queue.shift()!;
    } else {
      await new Promise<void>((r) => (resolveNext = r));
    }
  }

  clearTimeout(timer);
  clearTimeout(killer);
  signal?.removeEventListener("abort", onAbort);
  const code = await closed;

  if (signal?.aborted) return { ok: false, error: "run interrotto" };
  if (spawnError) return { ok: false, error: spawnError };
  if (code !== 0) {
    return {
      ok: false,
      error: stderr.trim().split("\n").slice(-3).join(" ") || `uscito con codice ${code} (fase «${opts.phase}»)`,
    };
  }
  return { ok: true };
}

/** IO legato a un AbortSignal: l'abort (stop esplicito dal bus) ammazza i child in corso. */
export const ioWithSignal = (signal?: AbortSignal): StepIO => ({
  claude: (opts) => claudePhase(opts, signal),
  script: (opts) => scriptPhase(opts, signal),
});

/** Il seam delle fasi, riusato dal runner della fabbrica (lib/factory/run.ts, D5). */
export const IO: StepIO = ioWithSignal();

/**
 * Esegue uno step per un cliente e restituisce un async iterable di eventi.
 * Lo stato in client.json passa a `in_corso` PRIMA delle fasi (così una
 * ricarica pagina vede lo stato coerente anche se lo stream si perde).
 */
// Run in volo per (cliente, step): il doppio avvio corromperebbe artifact e stato.
// In-process: si azzera al riavvio del server, quindi niente lock zombie da ripulire.
const inFlight = new Set<string>();

export async function* runStep(
  slug: string,
  stepKey: StepKey,
  ctx: RunCtx = { mode: "generate" },
  signal?: AbortSignal,
): AsyncGenerator<RunEvent> {
  const step = STEPS[stepKey];
  if (!step) {
    yield { type: "error", message: `step sconosciuto: ${stepKey}` };
    return;
  }
  const io = ioWithSignal(signal);

  const flightKey = `${slug}:${stepKey}`;
  if (inFlight.has(flightKey)) {
    yield { type: "error", message: "step già in esecuzione per questo cliente — attendere la fine del run in corso" };
    return;
  }
  inFlight.add(flightKey);
  const partenza = Date.now();
  // Metriche minime del run (durata/mode/esito) in client.json: senza, né i
  // costi né la convergenza dei loop critico-correzioni sono osservabili.
  const registraRun = (esito: "ok" | "errore") =>
    patchStepMeta(slug, step.stateKey, {
      mode: ctx.mode,
      durataMs: Date.now() - partenza,
      esito,
      quando: new Date().toISOString(),
    });
  try {
    setStepState(slug, step.stateKey, "in_corso");
    yield { type: "start", step: stepKey };

    let res: PhaseResult;
    try {
      res = yield* step.run(slug, ctx, io);
    } catch (e) {
      res = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (!res.ok) {
      const msg = res.error ?? "step fallito";
      setStepState(slug, step.stateKey, "errore", msg);
      registraRun("errore");
      yield { type: "error", message: msg };
      return;
    }

    // Validazione deterministica dell'artifact.
    const v = step.validate(slug);
    if (!v.ok) {
      setStepState(slug, step.stateKey, "errore", v.errore);
      registraRun("errore");
      yield { type: "error", message: v.errore ?? "artifact non valido" };
      return;
    }
    setStepState(slug, step.stateKey, "da_verificare");
    // Provenienza/upstream si ri-snapshottano SOLO quando l'artifact è stato
    // (ri)generato: un run di solo critico non tocca l'artifact e non deve
    // disarmare il sensore di staleness.
    if (ctx.mode !== "critic") step.afterSuccess?.(slug);
    registraRun("ok");
    yield { type: "done", artifact: step.artifact };
  } finally {
    inFlight.delete(flightKey);
  }
}

function handleEvent(e: Record<string, unknown>, push: (ev: RunEvent) => void) {
  if (e.type !== "assistant") return;
  const msg = e.message as { content?: Array<Record<string, unknown>> } | undefined;
  for (const c of msg?.content ?? []) {
    if (c.type === "tool_use") {
      const input = (c.input ?? {}) as Record<string, unknown>;
      const detail = String(input.file_path ?? input.command ?? input.skill ?? input.pattern ?? "");
      push({ type: "tool", name: String(c.name), detail: detail || undefined });
    } else if (c.type === "text") {
      const text = String(c.text ?? "").trim();
      if (text) push({ type: "text", text });
    }
  }
}
