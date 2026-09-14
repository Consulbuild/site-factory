// Regole PURE sugli stati degli step (nessun I/O): le importano conferme.ts,
// run-step.ts e catena.ts, e il banco scripts/test-stati.ts le verifica.
// Import solo di tipo (erasato da strip-types): il modulo gira anche nel banco.
import type { ClientState } from "./schemas";
import type { RunMode } from "./steps";

export type Stato = ClientState["steps"]["copy"]["stato"];

/** Conferma umana cancella il flag «auto»; conferma della catena lo imposta. */
export function marca(step: { autoConferma?: boolean }, auto: boolean | undefined): void {
  if (auto) step.autoConferma = true;
  else delete step.autoConferma;
}

/**
 * Stato dello step dopo un run. Il solo critico («Ricontrolla col critico»,
 * «Riverifica») non tocca l'artifact: uno step verificato resta verificato,
 * sia che il critico finisca bene sia che fallisca (l'errore resta nel log e
 * in ultimaRun). Ogni altra modalità (ri)scrive l'artifact → da_verificare,
 * o errore se il run/la validazione falliscono.
 */
export function statoDopoRun(mode: RunMode, prima: Stato, ok: boolean): Stato {
  if (mode === "critic" && (prima === "verificato" || prima === "da_verificare")) return prima;
  return ok ? "da_verificare" : "errore";
}

export type DecisionePasso = "gia_verificato" | "run" | "giudica" | "stale";

/**
 * Decisione della catena su un passo: `rifare` è il predicato proprio dello
 * step (solo la build lo ha: buildDaRifare) e prevale; altrimenti uno step
 * verificato/da_verificare ma cambiato a monte ferma la catena («stale»),
 * verificato = fatto, da_verificare = si giudica e conferma, il resto si rifà.
 */
export function decidiPasso(stato: Stato, rifare: boolean | undefined, staleMotivo: string | null): DecisionePasso {
  if (rifare !== undefined) return rifare ? "run" : "gia_verificato";
  if (staleMotivo && (stato === "verificato" || stato === "da_verificare")) return "stale";
  if (stato === "verificato") return "gia_verificato";
  return stato === "da_verificare" ? "giudica" : "run";
}
