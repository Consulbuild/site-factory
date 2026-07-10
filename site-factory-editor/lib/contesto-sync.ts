import type { Contesto } from "./schemas";
import type { Brief } from "./clients";

// Riconciliazione intake → contesto. I campi del brief che alimentano il
// contesto si dividono in due nature:
//  - MECCANICI: copia diretta in un campo del contesto (nessun ragionamento) →
//    applicati automaticamente al salvataggio intake, zero perdita di curatela.
//  - SEMANTICI: alimentano parti derivate da ragionamento (identità, servizi,
//    macro, punti di forza, promesse) + curatela umana → se cambiano generano
//    "drift" (il contesto va riallineato con l'AI o a mano), non si copiano.

type Mechanical = { field: string; label: string; apply: (c: Contesto, v: string) => void };

const MECHANICAL: Mechanical[] = [
  { field: "citta", label: "città", apply: (c, v) => { c.zona.sede = v; } },
  { field: "clienti", label: "tipo clienti", apply: (c, v) => { c.target.tipo = mapTipo(v); } },
  { field: "tono_preferito", label: "tono", apply: (c, v) => { c.tono.registro = v; } },
  { field: "da_evitare", label: "da evitare", apply: (c, v) => { c.tono.da_evitare = v; } },
  { field: "colori", label: "colori", apply: (c, v) => { c.materiali.colori = v; } },
  { field: "foto_professionali", label: "foto", apply: (c, v) => { c.materiali.foto_reali = v; } },
];

const SEMANTIC: Array<{ field: string; label: string }> = [
  { field: "settore", label: "settore/servizi" },
  { field: "descrizione", label: "descrizione" },
  { field: "cliente_tipo", label: "cliente tipo" },
  { field: "azione_principale", label: "azione principale" },
  { field: "area_geografica", label: "area geografica" },
  { field: "anno_inizio", label: "anno di inizio" },
];

const ALL_FIELDS = [...MECHANICAL.map((m) => m.field), ...SEMANTIC.map((s) => s.field)];
const LABELS = new Map([...MECHANICAL, ...SEMANTIC].map((x) => [x.field, x.label]));

function mapTipo(clienti: string): Contesto["target"]["tipo"] {
  const c = clienti.toLowerCase();
  if (c.includes("entrambi")) return "entrambi";
  if (c.includes("aziend")) return "aziende";
  if (c.includes("privat")) return "privati";
  return "entrambi";
}

function briefVal(brief: Brief, field: string): string {
  const v = brief[field];
  return v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v);
}

/** Snapshot dei campi-fonte del brief (baseline per il drift). */
export function snapshotFonte(brief: Brief): Record<string, string> {
  const snap: Record<string, string> = {};
  for (const f of ALL_FIELDS) snap[f] = briefVal(brief, f);
  return snap;
}

/**
 * Applica al contesto (mutandolo) le modifiche dell'intake rispetto alla
 * `fonte` di riferimento:
 *  - campi MECCANICI cambiati → copiati nel contesto, `fonte` aggiornata;
 *  - campi SEMANTICI cambiati → restituiti come drift (fonte NON aggiornata: il
 *    drift resta segnalato finché non si riallinea).
 */
export function applyIntakeToContesto(
  contesto: Contesto,
  brief: Brief,
  fonte: Record<string, string>,
): { contesto: Contesto; fonte: Record<string, string>; driftFields: string[] } {
  const nextFonte = { ...fonte };
  for (const m of MECHANICAL) {
    const now = briefVal(brief, m.field);
    if (now !== (fonte[m.field] ?? "")) {
      m.apply(contesto, now);
      nextFonte[m.field] = now;
    }
  }
  const driftFields: string[] = [];
  for (const s of SEMANTIC) {
    const now = briefVal(brief, s.field);
    if (now !== (fonte[s.field] ?? "")) driftFields.push(s.field);
  }
  return { contesto, fonte: nextFonte, driftFields };
}

/** Etichette leggibili dei campi in drift (per il banner). */
export function driftLabels(fields: string[]): string[] {
  return fields.map((f) => LABELS.get(f) ?? f);
}
