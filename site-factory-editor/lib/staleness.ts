import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { clientDir } from "./paths";

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

/** sha256 (12 hex) del JSON ri-serializzato senza le chiavi volatili top-level. */
export function hashArtifact(slug: string, file: string): string | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(clientDir(slug), file), "utf8"));
    const stable =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? Object.fromEntries(Object.entries(raw).filter(([k]) => !VOLATILE.has(k)))
        : raw;
    return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 12);
  } catch {
    return null;
  }
}

/** Snapshot corrente degli artifact a monte (file mancanti esclusi). */
export function computeUpstream(slug: string, files: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of files) {
    const h = hashArtifact(slug, f);
    if (h) out[f] = h;
  }
  return out;
}

/**
 * File a monte cambiati rispetto allo snapshot registrato. Senza snapshot
 * (artifact pre-GUI, provenienza ignota) non si segnala nulla: lo snapshot
 * nasce alla prima generazione/conferma.
 */
export function staleFiles(slug: string, files: string[], recorded: Record<string, string> | undefined): string[] {
  if (!recorded) return [];
  return files.filter((f) => {
    const h = hashArtifact(slug, f);
    return h !== null && recorded[f] !== undefined && h !== recorded[f];
  });
}
