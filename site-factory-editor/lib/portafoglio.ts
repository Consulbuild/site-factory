// Aggregatore della dashboard clienti: legge le fonti esterne (Stripe, Gatus,
// n8n, Umami) con cache e fasce diverse, e le proietta sui clienti dell'editor.
// Ogni fonte è indipendente e NON lancia mai: chiave assente → «non configurata»,
// servizio giù → «non raggiungibile da HH:MM». Solo server e script.
// Decisioni: docs/piano-dashboard-clienti.md.
import { memo, invalida } from "./cache.ts";
import { hasSecret } from "./secrets.ts";
import { leggiAbbonamenti, leggiIncassato, abbinaAbbonamenti, mrr } from "./stripe.ts";
import { leggiStatiSiti, uptime30, endpointDelSito, statoSito } from "./gatus.ts";
import { leggiLead, leggiRegistroClienti, umamiRiepilogo, type UmamiRiepilogo } from "./integrazioni.ts";
import { contaLead, dominioDi, type ClienteMin, type Portafoglio, type StatoFonte, type Abbonamento, type StatoSito, type ConteggioLead } from "./portafoglio-shared.ts";

const PREF = "portafoglio:";
export const TTL_LIVE = 2 * 60_000; // abbonamenti, monitor
export const TTL_ORARIO = 60 * 60_000; // incassato, lead, visite, registro

/** Primo fallimento consecutivo per fonte: il «da» resta stabile finché non torna ok. */
const g = globalThis as { __sfGuasti?: Map<string, string> };
const GUASTI = (g.__sfGuasti ??= new Map<string, string>());

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export type Esito<T> = { fonte: StatoFonte; val: T | null };

/** Lettura di una fonte con cache e stato. `configurata` è un booleano (non il
 *  nome della chiave) per essere testabile senza Keychain. */
export async function fonte<T>(key: string, ttlMs: number, configurata: boolean, fn: () => Promise<T>): Promise<Esito<T>> {
  if (!configurata) return { fonte: { stato: "non_configurata" }, val: null };
  try {
    const r = await memo(PREF + key, ttlMs, async () => ({ at: new Date().toISOString(), val: await fn() }));
    GUASTI.delete(key);
    return { fonte: { stato: "ok", at: r.at }, val: r.val };
  } catch (e) {
    const da = GUASTI.get(key) ?? new Date().toISOString();
    GUASTI.set(key, da);
    return { fonte: { stato: "non_raggiungibile", da, errore: msg(e) }, val: null };
  }
}

export const invalidaPortafoglio = (prefisso = "") => invalida(PREF + prefisso);

export type ClientePortafoglio = ClienteMin & { email: string };

/** Il portafoglio intero (home, Impostazioni): 4 letture in parallelo, poi solo
 *  funzioni pure. Le chiavi in cache sono i fetch grezzi, non i derivati per
 *  cliente: aggiungere o eliminare un cliente non richiede invalidazioni. */
export async function leggiPortafoglio(clienti: ClientePortafoglio[]): Promise<Portafoglio> {
  const anno = new Date().getFullYear();
  const stripeOk = hasSecret("STRIPE_API_KEY");
  const n8nOk = hasSecret("N8N_API_KEY");
  const [subs, incassato, gatus, lead, registro] = await Promise.all([
    fonte("stripe:subs", TTL_LIVE, stripeOk, leggiAbbonamenti),
    fonte(`stripe:incassato:${anno}`, TTL_ORARIO, stripeOk, () => leggiIncassato(anno)),
    fonte("gatus:statuses", TTL_LIVE, hasSecret("GATUS_PASSWORD"), leggiStatiSiti),
    fonte("lead", TTL_ORARIO, n8nOk, leggiLead),
    fonte("n8n:clienti", TTL_ORARIO, n8nOk, leggiRegistroClienti),
  ]);

  const stripeCustomer = new Map((registro.val ?? []).map((r) => [r.slug, r.stripeCustomer]));
  const { perSlug, nonCollegati } = abbinaAbbonamenti(
    subs.val ?? [],
    clienti.map((c) => ({ slug: c.slug, email: c.email, stripeCustomer: stripeCustomer.get(c.slug) ?? null })),
  );
  const collegati = Object.values(perSlug).filter((a) => a.stato !== "finito");

  const siti: Record<string, StatoSito | null> = {};
  if (gatus.val) {
    for (const c of clienti) {
      const dominio = dominioDi(c);
      if (dominio) siti[c.slug] = statoSito(endpointDelSito(gatus.val, dominio));
    }
  }

  return {
    fonti: { stripe: subs.fonte, gatus: gatus.fonte, lead: lead.fonte },
    abbonamenti: perSlug,
    nonCollegati,
    mrr: mrr(collegati),
    valuta: "eur",
    nAbbonamenti: collegati.length,
    incassato: incassato.val ? { anno, ...incassato.val } : null,
    siti,
    lead: contaLead(lead.val ?? []),
  };
}

export type StatoCliente = {
  fonti: Portafoglio["fonti"] & { umami: StatoFonte };
  abbonamento: Abbonamento | null;
  sito: StatoSito | null; // null = senza dominio o non ancora nel monitor
  uptime30: number | null;
  lead: ConteggioLead;
  visite: UmamiRiepilogo | null;
};

/** Stato di un cliente per l'hub: riusa il portafoglio in cache più due letture
 *  orarie solo sue (uptime del suo endpoint, visitatori del suo sito Umami). */
export async function leggiStatoCliente(c: ClientePortafoglio, tutti: ClientePortafoglio[], umamiWebsiteId?: string): Promise<StatoCliente> {
  const p = await leggiPortafoglio(tutti);
  const sito = p.siti[c.slug] ?? null;
  const [up, visite] = await Promise.all([
    sito ? fonte(`gatus:uptime:${sito.key}`, TTL_ORARIO, hasSecret("GATUS_PASSWORD"), () => uptime30(sito.key)) : null,
    umamiWebsiteId ? fonte(`umami:${umamiWebsiteId}`, TTL_ORARIO, hasSecret("UMAMI_PASSWORD"), () => umamiRiepilogo(umamiWebsiteId)) : null,
  ]);
  return {
    fonti: { ...p.fonti, umami: visite?.fonte ?? { stato: "non_configurata" } },
    abbonamento: p.abbonamenti[c.slug] ?? null,
    sito,
    uptime30: up?.val ?? null,
    lead: p.lead[c.slug] ?? { n30: 0, n30Prec: 0 },
    visite: visite?.val ?? null,
  };
}
