// fatti-comuni.ts — lettura del dataset dei fatti comunali (piano T6a).
//
// Il dataset `data/comuni-fatti.json` è generato da `scripts/fatti-comuni.ts aggiorna`
// da open data con fonte, licenza e riferimento temporale. Qui solo tipi e funzioni
// pure: nessuna rete, nessuna stima, nessuna frase generata. Un fatto assente nel
// dataset non esiste (mai uno «0» al suo posto).

/* ---------- nomi ---------- */

/** Chiave di confronto dei nomi: senza accenti, maiuscola, apostrofi/trattini/punti come spazi. */
export function normalizzaNome(nome: string): string {
  return nome
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[’'`´\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------- forma del dataset (schema 1) ---------- */

export type StatoFonte = "ok" | "non_raggiungibile";

/** Attribuzione di una fonte, una volta sola nell'intestazione del dataset. */
export interface FonteDataset {
  titolo: string;
  ente: string;
  url: string;
  licenza: string;
  licenzaUrl: string;
  /** Citazione del dato grezzo. */
  dicitura: string;
  /** Citazione di quote e somme (la CC BY 4.0 chiede di indicare le modifiche). */
  dicituraElaborazione?: string;
  /** Riferimento temporale leggibile: «1° gennaio 2025», «9 ottobre 2011». */
  riferimento: string;
  /** Data dei confini comunali a cui la fonte si riferisce (ISO). */
  riferimentoTerritoriale: string;
  stato: StatoFonte;
  file?: { sha256: string; byte: number; ultimaModifica?: string }[];
  scaricatoIl?: string;
  righe?: number;
}

export interface Derivazione {
  regola: "somma_fusione";
  /** Codici Istat dei comuni d'origine, al riferimento territoriale della fonte. */
  da: string[];
  nomi: string[];
}

/** Chiavi dei valori grezzi nel record (i fatti esposti si ricompongono qui). */
export type CampoAdditivo = "popolazione" | "edificiEpoca" | "famiglie";

export interface RecordComune {
  nome: string;
  sigla: string;
  nomeAltraLingua?: string;
  nomiPrecedenti?: string[];
  /** [lat, lon] WGS84, punto interno al comune (4 decimali). */
  centro: [number, number];
  /** Raggio del cerchio di pari area: misura dell'incertezza del «centro». */
  raggioKm: number;
  popolazione?: number;
  /** 9 classi: ≤1918, 1919-45, 1946-60, 1961-70, 1971-80, 1981-90, 1991-2000, 2001-05, ≥2006. */
  edificiEpoca?: number[];
  /** [zona, gradi giorno, altitudine della casa comunale in m]. */
  clima?: [string, number, number];
  /** Verbatim dalla fonte: "3", "2A-3A-3B". */
  sismica?: string;
  /** [famiglie in abitazione di proprietà, famiglie totali]. */
  famiglie?: [number, number];
  derivati?: Partial<Record<CampoAdditivo, Derivazione>>;
}

export type MotivoAlias = "cambio_codice" | "fusione";

export interface DatasetFattiComuni {
  schema: 1;
  generatoIl: string;
  riferimentoTerritoriale: string;
  /** false se una o più fonti non erano raggiungibili all'aggiornamento. */
  completo: boolean;
  fontiMancanti: string[];
  fonti: Record<string, FonteDataset>;
  /** Campo → fonte da cui viene. */
  fatti: Record<string, string>;
  copertura: Record<string, number>;
  scarti: Record<string, Record<string, string[]>>;
  alias: Record<string, { a: string; motivo: MotivoAlias; dal: string }>;
  comuni: Record<string, RecordComune>;
}
