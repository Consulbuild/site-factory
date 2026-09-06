// Tipi e predicati PURI della dashboard clienti, condivisi da server, componenti
// client e test. Nessun import node (come slots-shared.ts): importabile da
// qualunque bundle. La logica di lettura sta in portafoglio.ts.

/** Stato di una fonte esterna: la dashboard non mostra mai uno «0» rassicurante
 *  quando in realtà il servizio non risponde o non è configurato. */
export type StatoFonte =
  | { stato: "ok"; at: string } // at = quando è stato letto (ISO): «12 min fa»
  | { stato: "non_configurata" } // chiave assente nel Keychain
  | { stato: "non_raggiungibile"; da: string; errore: string }; // da = primo fallimento consecutivo

export type StatoAbbonamento = "attivo" | "ritardo" | "disdetto" | "finito";

export type Abbonamento = {
  id: string;
  customerId: string;
  stato: StatoAbbonamento;
  /** Centesimi, normalizzati al mese (annuale ÷ 12, × quantità). */
  importoMese: number;
  valuta: string;
  rinnovo?: string; // ISO — attivo/ritardo
  fine?: string; // ISO — disdetto (fino a) / finito (dal)
  dal: string; // ISO — inizio dell'abbonamento
  giorniRitardo?: number;
  url: string; // pagina dell'abbonamento nella Dashboard Stripe
};

export type NonCollegato = {
  id: string;
  customerId: string;
  nome: string;
  email: string | null;
  importoMese: number;
  valuta: string;
  dal: string;
  motivo: "nessun_match" | "email_ambigua";
  url: string;
};

export type StatoSito = {
  su: boolean;
  ms: number; // tempo di risposta dell'ultimo controllo
  ultimoControllo: string; // ISO
  key: string; // chiave dell'endpoint in Gatus (per uptime e link)
  da?: string; // ISO — giù da (primo fallimento dopo l'ultimo successo)
  falliti?: number; // controlli falliti consecutivi
  causa?: string; // condizioni fallite dell'ultimo controllo
  ultimoSu?: string; // ISO — ultima risposta buona
};

export type ConteggioLead = { n30: number; n30Prec: number; ultimo?: string };

export type Portafoglio = {
  fonti: { stripe: StatoFonte; gatus: StatoFonte; lead: StatoFonte };
  abbonamenti: Record<string, Abbonamento>; // per slug
  nonCollegati: NonCollegato[];
  mrr: number; // centesimi al mese, solo `valuta`
  valuta: string;
  nAbbonamenti: number; // collegati e in corso
  incassato: { anno: number; lordo: number; netto: number } | null; // null se Stripe non è ok
  siti: Record<string, StatoSito | null>; // per slug con dominio; null = non ancora nel monitor
  lead: Record<string, ConteggioLead>; // per slug
};

/** Il minimo di ClientSummary che serve ai predicati (i test non trascinano clients.ts). */
export type ClienteMin = {
  slug: string;
  steps?: { build?: { deploy?: { url?: string; dominio?: string } } };
};

export const dominioDi = (c: ClienteMin): string | null => c.steps?.build?.deploy?.dominio ?? null;

/** Demo = pubblicato su workers.dev senza dominio: il cliente non si è ancora abbonato. */
export const isDemo = (c: ClienteMin): boolean => !!c.steps?.build?.deploy?.url && !dominioDi(c);

/** Da sviluppare = nessun abbonamento e nessun dominio (in lavorazione o demo).
 *  È un predicato locale: resta giusto anche a Stripe spento. */
export const daSviluppare = (c: ClienteMin, p: Portafoglio | null): boolean => !p?.abbonamenti[c.slug] && !dominioDi(c);

/** Attivi = paganti in corso: attivo, in ritardo o in disdetta (paga fino alla fine). */
export const attivo = (c: ClienteMin, p: Portafoglio | null): boolean => {
  const s = p?.abbonamenti[c.slug]?.stato;
  return s === "attivo" || s === "ritardo" || s === "disdetto";
};

export const giu = (c: ClienteMin, p: Portafoglio | null): boolean => p?.siti[c.slug]?.su === false;

export const inRitardo = (c: ClienteMin, p: Portafoglio | null): boolean => p?.abbonamenti[c.slug]?.stato === "ritardo";

/** Sito online con dominio ma nessun abbonamento in corso (a Stripe ok): un'anomalia da mostrare. */
export const senzaAbbonamento = (c: ClienteMin, p: Portafoglio | null): boolean =>
  p?.fonti.stripe.stato === "ok" && !!dominioDi(c) && !p.abbonamenti[c.slug];

const GIORNO_MS = 86_400_000;

/** Conteggio lead per slug: ultimi 30 giorni, i 30 precedenti, l'ultimo. Finestre
 *  scorrevoli in ms (indipendenti dal fuso); date non valide ignorate. */
export function contaLead(righe: Array<{ slug: string; quando: string }>, ora = Date.now()): Record<string, ConteggioLead> {
  const out: Record<string, ConteggioLead> = {};
  const da30 = ora - 30 * GIORNO_MS;
  const da60 = ora - 60 * GIORNO_MS;
  for (const r of righe) {
    const t = Date.parse(r.quando);
    if (!r.slug || Number.isNaN(t) || t > ora) continue;
    const c = (out[r.slug] ??= { n30: 0, n30Prec: 0 });
    if (t > da30) c.n30 += 1;
    else if (t > da60) c.n30Prec += 1;
    if (!c.ultimo || t > Date.parse(c.ultimo)) c.ultimo = new Date(t).toISOString();
  }
  return out;
}
