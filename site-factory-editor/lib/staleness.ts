import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
// Estensione esplicita: il modulo gira anche nel banco scripts/test-stati.ts (strip-types).
import { clientDir } from "./paths.ts";

// Staleness a valle: ogni step registra in client.json l'hash degli artifact
// A MONTE al momento della generazione/conferma; se un hash su disco diverge,
// lo step è potenzialmente stale → banner in scheda + badge in dashboard.
// (Il contesto usa il meccanismo più fine fonte/drift a livello di campo;
// questo è il meccanismo generico per gli step successivi.)

/** Chiavi volatili escluse dall'hash: confermare/ristampare NON è un cambiamento. */
const VOLATILE = new Set(["verificato", "generatedAt"]);

/** sha256 (12 hex) di un valore JSON qualsiasi (per gli estratti per-campo). */
export function hashValue(v: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 12);
}

/** sha256 (12 hex) del JSON ri-serializzato senza le chiavi volatili top-level; null se assente o non JSON. */
export function hashFile(abs: string): string | null {
  try {
    const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
    const stable =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? Object.fromEntries(Object.entries(raw).filter(([k]) => !VOLATILE.has(k)))
        : raw;
    return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 12);
  } catch {
    return null;
  }
}

export const hashArtifact = (slug: string, file: string): string | null => hashFile(path.join(clientDir(slug), file));

/** Snapshot degli artifact a monte: file → hash, o null se il file manca (registrato, così «comparso dopo» è rilevabile). */
export type Upstream = Record<string, string | null>;

export function computeUpstreamIn(dir: string, files: string[]): Upstream {
  return Object.fromEntries(files.map((f) => [f, hashFile(path.join(dir, f))]));
}

export const computeUpstream = (slug: string, files: string[]): Upstream => computeUpstreamIn(clientDir(slug), files);

/**
 * File a monte cambiati rispetto allo snapshot registrato: chiave presente nello
 * snapshot con valore diverso (hash cambiato, null→hash = comparso, hash→null =
 * sparito). Una chiave ASSENTE dallo snapshot (snapshot vecchio, o file aggiunto
 * agli upstream dopo) è ignota → non stale. Senza snapshot (artifact pre-GUI)
 * non si segnala nulla: lo snapshot nasce alla prima generazione/conferma.
 */
export function diffUpstream(now: Upstream, recorded: Upstream | undefined): string[] {
  if (!recorded) return [];
  return Object.keys(now).filter((f) => f in recorded && recorded[f] !== now[f]);
}

export const staleFiles = (slug: string, files: string[], recorded: Upstream | undefined): string[] =>
  diffUpstream(computeUpstream(slug, files), recorded);
