import fs from "node:fs";
import path from "node:path";

// Record curato per fase `claude -p` — canale laterale su disco, NON eventi UI
// (rispostaStreamRun inoltra ogni evento al browser: prompt/stderr/metriche
// diventerebbero rumore live e replay). Il seam scrive UNA riga NDJSON per fase
// con SOLO il segnale utile a diagnosticare e migliorare: prompt, azioni +
// errori dei tool, testo conclusivo, metriche compatte, esito con errore
// completo al fallimento. Volutamente NON salva il rumore (stream-json grezzo,
// risultati integrali dei tool riusciti, thinking): troppa quantità peggiora il
// ragionamento di chi poi legge il contesto per fixare. Vedi docs/DEBUG.md.

export type PhaseClasse = "abort" | "spawn" | "auth" | "timeout" | "result" | "exit";

export type ToolAction = {
  tool: string;
  detail?: string;
  /** Presente SOLO se il tool_result è is_error (troncato): un tool fallito è oro per il debug. */
  error?: string;
};

export type PhaseMetrics = {
  numTurns?: number;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  costUsd?: number;
  /** true = fase a turni esauriti (subtype error_max_turns): quasi sempre un loop. */
  hitMaxTurns?: boolean;
  /** Solo se non vuoto: tool bloccati dalla policy allowedTools/disallowedTools. */
  permessiNegati?: string[];
};

export type PhaseError = {
  /** Lo stesso messaggio corto mostrato alla UI (valore di ritorno della fase). */
  message: string;
  classe: PhaseClasse;
  /** stderr INTEGRALE (non troncato): è il punto in cui smettiamo di troncare. */
  stderr?: string;
  code?: number | null;
};

export type PhaseRecord = {
  phase: string;
  prompt: string;
  actions: ToolAction[];
  /** Testo conclusivo del modello (campo `result` dello stream-json), non l'accumulo dei blocchi. */
  testo?: string;
  metrics?: PhaseMetrics;
  ok: boolean;
  error?: PhaseError;
  startedAt: number;
  endedAt: number;
};

export type RecordSink = (rec: PhaseRecord) => void;

type J = Record<string, unknown>;

const tronca = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

/** Normalizza il content di un tool_result (stringa o array di blocchi) a stringa. */
function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content.map((b) => (typeof b === "string" ? b : String((b as J)?.text ?? JSON.stringify(b)))).join("\n");
  return content == null ? "" : JSON.stringify(content);
}

/**
 * Aggiorna il record con UN evento stream-json. Chiamata ACCANTO a handleEvent
 * (non al posto suo: lì la UI, qui il segnale del record). Ignora tutto ciò che
 * è rumore: system/init/rate_limit, il testo assistant (c'è già `result`), e i
 * tool_result RIUSCITI (i file letti stanno già su disco).
 */
export function captureEvent(rec: PhaseRecord, e: J, byId: Map<string, ToolAction>): void {
  const content = (e.message as J | undefined)?.content;
  if (e.type === "assistant" && Array.isArray(content)) {
    for (const c of content as J[]) {
      if (c.type !== "tool_use") continue;
      const input = (c.input ?? {}) as J;
      const detail = String(input.file_path ?? input.command ?? input.skill ?? input.pattern ?? "");
      const action: ToolAction = { tool: String(c.name), detail: detail || undefined };
      rec.actions.push(action);
      if (typeof c.id === "string") byId.set(c.id, action);
    }
  } else if (e.type === "user" && Array.isArray(content)) {
    for (const c of content as J[]) {
      if (c.type !== "tool_result" || !c.is_error) continue; // i result riusciti sono rumore
      const err = tronca(contentToString(c.content), 500);
      const action = typeof c.tool_use_id === "string" ? byId.get(c.tool_use_id) : undefined;
      if (action) action.error = err;
      else rec.actions.push({ tool: "tool_result", error: err });
    }
  } else if (e.type === "result") {
    const usage = (e.usage ?? {}) as J;
    const num = (v: unknown) => (typeof v === "number" ? v : undefined);
    const denials = Array.isArray(e.permission_denials) ? (e.permission_denials as J[]) : [];
    rec.metrics = {
      numTurns: num(e.num_turns),
      durationMs: num(e.duration_ms),
      inputTokens: num(usage.input_tokens),
      outputTokens: num(usage.output_tokens),
      cacheReadTokens: num(usage.cache_read_input_tokens),
      costUsd: num(e.total_cost_usd),
      hitMaxTurns: e.subtype === "error_max_turns" || undefined,
      permessiNegati: denials.length
        ? denials.map((d) => String(d.tool_name ?? d.tool ?? JSON.stringify(d)))
        : undefined,
    };
    if (typeof e.result === "string") rec.testo = tronca(e.result, 2000);
  }
}

/** Sink che appende UNA riga JSON per record, best-effort (come emit sull'ndjson eventi). */
export function makeSink(file: string): RecordSink {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  } catch {
    /* la dir la ricrea eventualmente avvia(); l'append è comunque best-effort */
  }
  return (rec) => {
    try {
      fs.appendFileSync(file, JSON.stringify(rec) + "\n");
    } catch {
      /* un errore di scrittura non ferma il run */
    }
  };
}

/**
 * Prepara la cartella storica di uno step cliente e ritorna il path del nuovo
 * tentativo (`<Date.now()>.ndjson`), facendo pruning ai `keep` più recenti
 * (nome = timestamp a 13 cifre → ordinamento lessicografico = cronologico).
 */
export function rollClientRecords(dir: string, keep = 10): string {
  fs.mkdirSync(dir, { recursive: true });
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ndjson"))
      .sort();
    // lascia keep-1 vecchi: col nuovo file saranno keep. slice(0, neg) toglierebbe
    // dalla coda i più RECENTI — clamp a 0 è obbligatorio.
    const toDelete = Math.max(0, files.length - (keep - 1));
    for (const f of files.slice(0, toDelete)) fs.rmSync(path.join(dir, f), { force: true });
  } catch {
    /* pruning best-effort */
  }
  return path.join(dir, `${Date.now()}.ndjson`);
}
