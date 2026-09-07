/**
 * Motore del form: quale passo è attivo, le risposte date, avanti/indietro,
 * salvataggio locale e ripresa. Non tocca il DOM (ci pensano render.ts e main.ts)
 * e non conosce i componenti: così è provabile a tavolino.
 *
 * Stato salvato in localStorage (chiave bozza:v1:<leadId>) a ogni risposta;
 * `?r=<leadId>` nell'URL riapre lo stesso lead da un altro caricamento.
 */
import { DOMANDE, PASSI_FINALI, SEZIONI, TOTALE_SEZIONI, type Domanda, type NumeroSezione, type Risposte } from "../data/domande";

export type Passo =
  | { tipo: "domanda"; indice: number; domanda: Domanda }
  | { tipo: "riepilogo"; indice: number }
  | { tipo: "fatto"; indice: number };

export interface Stato {
  leadId: string;
  iniziatoAt: string;
  indice: number;
  risposte: Risposte;
  /** Chiavi delle domande già confermate con «Continua» (per il riepilogo e la ripresa). */
  confermate: string[];
  origine: { utm: Record<string, string>; ua: string };
}

const CHIAVE = (id: string) => `bozza:v1:${id}`;
const CORRENTE = "bozza:corrente";

export const PASSI: readonly Passo[] = [
  ...DOMANDE.map((domanda, indice) => ({ tipo: "domanda" as const, indice, domanda })),
  ...PASSI_FINALI.map((tipo, i) => ({ tipo, indice: DOMANDE.length + i })),
];

export const INDICE_RIEPILOGO = DOMANDE.length;
export const INDICE_FATTO = DOMANDE.length + 1;

const nuovoId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function leggiStato(id: string): Stato | null {
  try {
    const grezzo = localStorage.getItem(CHIAVE(id));
    if (!grezzo) return null;
    const s = JSON.parse(grezzo) as Stato;
    return s && s.leadId === id ? s : null;
  } catch {
    return null;
  }
}

/** Parametri dell'annuncio (utm_*, fbclid, mestiere) da conservare e usare per precompilare. */
function origineDaUrl(url: URL): Stato["origine"] {
  const utm: Record<string, string> = {};
  for (const [k, v] of url.searchParams) {
    if (/^(utm_|fbclid|mestiere)/.test(k)) utm[k] = v.slice(0, 120);
  }
  return { utm, ua: navigator.userAgent.slice(0, 200) };
}

/** Stato iniziale: ripresa da ?r=<id>, altrimenti l'ultimo lead aperto su questo browser, altrimenti nuovo. */
export function caricaOAvvia(url: URL): Stato {
  const daUrl = url.searchParams.get("r");
  const candidato = daUrl ?? (() => {
    try {
      return localStorage.getItem(CORRENTE);
    } catch {
      return null;
    }
  })();
  const esistente = candidato ? leggiStato(candidato) : null;
  if (esistente && esistente.indice < INDICE_FATTO) return esistente;
  const stato: Stato = {
    leadId: daUrl && /^[a-z0-9-]{8,64}$/i.test(daUrl) ? daUrl : nuovoId(),
    iniziatoAt: new Date().toISOString(),
    indice: 0,
    risposte: {},
    confermate: [],
    origine: origineDaUrl(url),
  };
  return stato;
}

export class Motore {
  readonly stato: Stato;
  private ascoltatori = new Set<(s: Stato) => void>();

  constructor(stato: Stato) {
    this.stato = stato;
  }

  get indice(): number {
    return this.stato.indice;
  }
  get passo(): Passo {
    return PASSI[this.stato.indice] ?? (PASSI[INDICE_FATTO] as Passo);
  }
  get risposte(): Risposte {
    return this.stato.risposte;
  }
  /** Sezione del passo corrente (i passi finali stanno nell'ultima). */
  get sezione(): NumeroSezione {
    const p = this.passo;
    return p.tipo === "domanda" ? p.domanda.sezione : (SEZIONI[TOTALE_SEZIONI - 1]?.n ?? 7);
  }
  get puoIndietro(): boolean {
    return this.stato.indice > 0 && this.stato.indice < INDICE_FATTO;
  }

  /** Vero se il passo è il primo della sua sezione (per l'incoraggiamento e l'annuncio). */
  primoDellaSezione(indice = this.stato.indice): boolean {
    const p = PASSI[indice];
    const prima = PASSI[indice - 1];
    if (!p || p.tipo !== "domanda") return false;
    return !prima || prima.tipo !== "domanda" || prima.domanda.sezione !== p.domanda.sezione;
  }

  rispondi(id: string, valore: unknown): void {
    const r = this.stato.risposte as Record<string, unknown>;
    if (valore === undefined) delete r[id];
    else r[id] = valore;
    if (!this.stato.confermate.includes(id)) this.stato.confermate.push(id);
    this.salva();
  }

  vaiA(indice: number): void {
    this.stato.indice = Math.max(0, Math.min(indice, INDICE_FATTO));
    this.salva();
  }

  avanti(): void {
    this.vaiA(this.stato.indice + 1);
  }
  indietro(): void {
    if (this.puoIndietro) this.vaiA(this.stato.indice - 1);
  }

  /** Le domande confermate finora, nell'ordine del form (per il riepilogo). */
  get domandeConfermate(): Domanda[] {
    return DOMANDE.filter((d) => this.stato.confermate.includes(d.id));
  }

  onCambio(fn: (s: Stato) => void): () => void {
    this.ascoltatori.add(fn);
    return () => this.ascoltatori.delete(fn);
  }

  salva(): void {
    try {
      localStorage.setItem(CHIAVE(this.stato.leadId), JSON.stringify(this.stato));
      localStorage.setItem(CORRENTE, this.stato.leadId);
    } catch {
      /* storage pieno o vietato: il form funziona lo stesso, senza ripresa */
    }
    for (const fn of this.ascoltatori) fn(this.stato);
  }

  /** Dopo l'invio: il lead è chiuso, un nuovo caricamento riparte da zero. */
  chiudi(): void {
    this.stato.indice = INDICE_FATTO;
    try {
      localStorage.removeItem(CORRENTE);
    } catch {
      /* ignora */
    }
    this.salva();
  }
}
