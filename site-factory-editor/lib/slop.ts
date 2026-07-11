import path from "node:path";
import { spawnSync } from "node:child_process";
import { REPO_ROOT, NODE_BIN, childEnv, clientDir } from "./paths";

// Gate anti-slop del copy. Il controllo NON è reimplementato: si esegue lo
// stesso script della skill copy-critic (unica fonte del gate, condivisa con
// l'agente) e si parsa lo stdout in formato --json, che è nostro e stabile.
const CHECK_SLOP = path.join(REPO_ROOT, ".claude", "skills", "copy-critic", "scripts", "check-slop.mjs");

export interface SlopFinding {
  tipo: string;
  /** Slot incriminato; per le sequenze ripetute è l'elenco degli slot, separati da virgola. */
  slot: string;
  frase: string;
  dettaglio?: string;
}

export interface SlopReport {
  esito: "pass" | "fail";
  bloccanti: SlopFinding[];
  avvisi: SlopFinding[];
}

export interface SlopResult {
  /** true = script eseguito E nessun bloccante (exit 0). */
  ok: boolean;
  report?: SlopReport;
  /** Errore di esecuzione dello script (non un FAIL del gate). */
  errore?: string;
}

/**
 * Esegue check-slop.mjs su out/<slug>/copy.json. `consenti` (nome azienda,
 * città/area multi-parola — l'opzione è ripetibile) ricorre legittimamente e
 * non deve far scattare il controllo sequenze; `martello` attiva il tetto di
 * 2 occorrenze verbatim.
 */
export function checkSlop(slug: string, consenti?: string | string[], martello?: string): SlopResult {
  const args = [CHECK_SLOP, path.join(clientDir(slug), "copy.json"), "--json"];
  for (const c of [consenti].flat()) if (c?.trim()) args.push("--consenti", c);
  if (martello?.trim()) args.push("--martello", martello);
  // Path con spazio nel repo: sempre spawn(bin, [args]), mai stringhe shell.
  const res = spawnSync(NODE_BIN, args, { env: childEnv(), encoding: "utf8" });
  if (res.error || res.status === 2 || typeof res.status !== "number") {
    return { ok: false, errore: `check-slop non eseguibile: ${res.error?.message ?? res.stderr}` };
  }
  try {
    return { ok: res.status === 0, report: JSON.parse(res.stdout) as SlopReport };
  } catch {
    return { ok: false, errore: `output inatteso da check-slop:\n${res.stdout}` };
  }
}
