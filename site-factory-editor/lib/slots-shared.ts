// Helper del contratto slot CLIENT-SAFE (niente fs): unica definizione di
// conteggio/accent usata sia dal validatore server (lib/slots.ts) sia dalla
// UI della scheda Copy (contatori live, indicatore accent).

export interface CopySlot {
  path: string;
  maxChars?: number;
  accentMarker?: boolean;
  guida: string;
  sectionIndex: number | null; // null per meta.*
  sectionLabel: string;
  /** 0 = stringa, 1 = array di stringhe, 2 = array di array (bullets). */
  wildcardDepth: 0 | 1 | 2;
}

export type CopyValue = string | string[] | string[][];
export type CopyArtifact = Record<string, CopyValue>;

/** Lunghezza visibile: i marker `**` non contano nel budget (come l'assembler). */
export const visibleLen = (s: string) => s.replaceAll("**", "").length;

/** Esattamente UNA frase `**accent**` (regola assembler sugli slot accentMarker). */
export function accentOk(leaf: string): boolean {
  return (leaf.match(/\*\*/g) ?? []).length === 2 && /\*\*[^*]+\*\*/.test(leaf);
}

/**
 * Bound di CONTEGGIO degli array, copiati dallo Zod del renderer
 * (site-renderer/src/lib/schema.ts) — la verità, non la prosa delle skill.
 */
export const ARRAY_BOUNDS: Record<string, { min: number; max: number; label: string }> = {
  "sections[2].props.items": { min: 2, max: 5, label: "punti trust bar" },
  "sections[3].props.items": { min: 3, max: 5, label: "card servizi" },
  "sections[4].props.images": { min: 3, max: 12, label: "didascalie galleria" },
  "sections[5].props.steps": { min: 2, max: 4, label: "passi del processo" },
  "sections[7].props.items": { min: 3, max: 8, label: "domande FAQ" },
};
export const BULLETS_MAX = 5; // z.array(shortText(36)).max(5) — nessun minimo

/** Prefisso dell'array per gli slot wildcard (es. "sections[3].props.items"). */
export const arrayPrefix = (slotPath: string) => slotPath.slice(0, slotPath.indexOf("[*]"));
