// Stripe per la dashboard: abbonamenti, incassato, collegamento abbonamento ↔
// cliente. REST con fetch (niente SDK), chiave RISTRETTA nel Keychain
// (`STRIPE_API_KEY`: Customers read, Subscriptions write solo per i metadati di
// «Collega», Invoices read, Balance transactions read). Le funzioni pure in fondo
// (statoAbbonamento, mrr, abbinaAbbonamenti) sono coperte da
// scripts/test-portafoglio.ts. Import con .ts: gira anche negli script.
import { getSecret } from "./secrets.ts";
import { http, DASHBOARD_TIMEOUT_MS } from "./integrazioni.ts";
import type { Abbonamento, NonCollegato } from "./portafoglio-shared.ts";

const STRIPE_API = "https://api.stripe.com";

/** Il sottoinsieme della Subscription che leggiamo (API 2025+: `current_period_end`
 *  sta sugli items; il campo sull'abbonamento resta come fallback). */
export type StripeSub = {
  id: string;
  status: string;
  livemode?: boolean;
  created: number;
  start_date?: number;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  canceled_at?: number | null;
  ended_at?: number | null;
  metadata?: Record<string, string>;
  customer: { id: string; email?: string | null; name?: string | null } | string;
  latest_invoice?: { created: number; due_date?: number | null } | string | null;
  items: {
    data: Array<{
      quantity?: number;
      current_period_end?: number;
      price: {
        unit_amount: number | null;
        currency: string;
        recurring: { interval: "day" | "week" | "month" | "year"; interval_count: number } | null;
      };
    }>;
  };
};

type Lista<T> = { data: T[]; has_more: boolean };

async function stripe<T>(pathname: string, init: RequestInit = {}, key = getSecret("STRIPE_API_KEY")): Promise<T> {
  if (!key) throw new Error("chiave STRIPE_API_KEY mancante: configurala dal pannello «Chiavi API»");
  const r = await http(`${STRIPE_API}${pathname}`, { ...init, headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) } }, DASHBOARD_TIMEOUT_MS);
  if (!r.ok) {
    const corpo = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Stripe ha risposto ${r.status}${corpo.error?.message ? `: ${corpo.error.message}` : ""}`);
  }
  return (await r.json()) as T;
}

/** Tutte le pagine di una lista Stripe (`has_more` + `starting_after`). */
async function tutta<T extends { id: string }>(pathname: string): Promise<T[]> {
  const out: T[] = [];
  let dopo: string | null = null;
  do {
    const pagina: Lista<T> = await stripe(`${pathname}&limit=100${dopo ? `&starting_after=${dopo}` : ""}`);
    out.push(...pagina.data);
    dopo = pagina.has_more && pagina.data.length ? pagina.data[pagina.data.length - 1].id : null;
  } while (dopo);
  return out;
}

export async function leggiAbbonamenti(): Promise<StripeSub[]> {
  return tutta<StripeSub>("/v1/subscriptions?status=all&expand[]=data.customer&expand[]=data.latest_invoice");
}

/** Incassato dell'anno: lordo = fatture pagate, netto = balance transactions al
 *  netto delle commissioni (addebiti e rimborsi; i payout verso la banca no). */
export async function leggiIncassato(anno: number): Promise<{ lordo: number; netto: number }> {
  const da = Math.floor(Date.UTC(anno, 0, 1) / 1000);
  const [fatture, movimenti] = await Promise.all([
    tutta<{ id: string; amount_paid: number }>(`/v1/invoices?status=paid&created[gte]=${da}`),
    tutta<{ id: string; type: string; net: number }>(`/v1/balance_transactions?created[gte]=${da}`),
  ]);
  const TIPI = new Set(["charge", "payment", "refund", "payment_refund"]);
  return {
    lordo: fatture.reduce((s, f) => s + (f.amount_paid ?? 0), 0),
    netto: movimenti.filter((m) => TIPI.has(m.type)).reduce((s, m) => s + (m.net ?? 0), 0),
  };
}

/** «Collega»: scrive lo slug nei metadati dell'abbonamento. Unica scrittura verso Stripe. */
export async function collegaAbbonamento(id: string, slug: string): Promise<void> {
  await stripe(`/v1/subscriptions/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ "metadata[slug]": slug }).toString(),
  });
}

/** Prova della chiave (pannello Chiavi API). */
export async function stripePing(key: string): Promise<string | null> {
  return stripe("/v1/subscriptions?limit=1", {}, key).then(
    () => null,
    (e: unknown) => (e instanceof Error ? e.message : String(e)),
  );
}

/* ---------------- funzioni pure ---------------- */

const iso = (secondi?: number | null): string | undefined => (secondi ? new Date(secondi * 1000).toISOString() : undefined);
const GIORNI_MESE = 30.4375;

/** Quanti mesi dura un intervallo di prezzo (per normalizzare al mese). */
function mesi(r: NonNullable<StripeSub["items"]["data"][number]["price"]["recurring"]>): number {
  const n = r.interval_count || 1;
  switch (r.interval) {
    case "year":
      return 12 * n;
    case "week":
      return (7 * n) / GIORNI_MESE;
    case "day":
      return n / GIORNI_MESE;
    default:
      return n;
  }
}

export const customerDi = (sub: StripeSub) => (typeof sub.customer === "string" ? { id: sub.customer } : sub.customer);

const urlDi = (sub: StripeSub) => `https://dashboard.stripe.com/${sub.livemode === false ? "test/" : ""}subscriptions/${sub.id}`;

/** Stato e importo di un abbonamento; null se non conta (incomplete, paused…). */
export function statoAbbonamento(sub: StripeSub, ora = Date.now()): Abbonamento | null {
  const item = sub.items?.data?.[0];
  const fine = item?.current_period_end ?? sub.current_period_end;
  const importoMese = Math.round(
    (sub.items?.data ?? []).reduce((s, it) => {
      const r = it.price.recurring;
      return r ? s + ((it.price.unit_amount ?? 0) * (it.quantity ?? 1)) / mesi(r) : s;
    }, 0),
  );
  const base = {
    id: sub.id,
    customerId: customerDi(sub).id,
    importoMese,
    valuta: (item?.price.currency ?? "eur").toLowerCase(),
    dal: iso(sub.start_date ?? sub.created) ?? new Date(0).toISOString(),
    url: urlDi(sub),
  };
  switch (sub.status) {
    case "active":
    case "trialing":
      return sub.cancel_at_period_end ? { ...base, stato: "disdetto", fine: iso(fine) } : { ...base, stato: "attivo", rinnovo: iso(fine) };
    case "past_due":
    case "unpaid": {
      const inv = typeof sub.latest_invoice === "object" && sub.latest_invoice ? sub.latest_invoice : null;
      const scadenza = inv?.due_date ?? inv?.created;
      const giorniRitardo = scadenza ? Math.max(0, Math.floor((ora - scadenza * 1000) / 86_400_000)) : 0;
      return { ...base, stato: "ritardo", giorniRitardo, rinnovo: iso(fine) };
    }
    case "canceled":
      return { ...base, stato: "finito", fine: iso(sub.canceled_at ?? sub.ended_at ?? fine) };
    default:
      return null;
  }
}

/** Entrate ricorrenti mensili (centesimi) dei paganti in corso, in una sola valuta. */
export function mrr(abbs: Abbonamento[], valuta = "eur"): number {
  return abbs
    .filter((a) => a.valuta === valuta && (a.stato === "attivo" || a.stato === "ritardo" || a.stato === "disdetto"))
    .reduce((s, a) => s + a.importoMese, 0);
}

export type ClienteDaAbbinare = { slug: string; email: string; stripeCustomer?: string | null };

const normEmail = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Tra due abbonamenti dello stesso cliente vince quello in corso, poi il più recente. */
const preferisci = (nuovo: Abbonamento, vecchio: Abbonamento): boolean => {
  const nuovoInCorso = nuovo.stato !== "finito";
  const vecchioInCorso = vecchio.stato !== "finito";
  if (nuovoInCorso !== vecchioInCorso) return nuovoInCorso;
  return nuovo.dal > vecchio.dal;
};

/** Collega ogni abbonamento a un cliente: `metadata.slug` → `stripe_customer` del
 *  registro n8n → e-mail del brief. Senza match (o e-mail comune a più clienti)
 *  l'abbonamento in corso finisce tra i «non collegati»; i finiti orfani si ignorano. */
export function abbinaAbbonamenti(subs: StripeSub[], clienti: ClienteDaAbbinare[]): { perSlug: Record<string, Abbonamento>; nonCollegati: NonCollegato[] } {
  const slugs = new Set(clienti.map((c) => c.slug));
  const perCustomer = new Map(clienti.filter((c) => c.stripeCustomer).map((c) => [c.stripeCustomer as string, c.slug]));
  const perEmail = new Map<string, string[]>();
  for (const c of clienti) {
    const e = normEmail(c.email);
    if (e) perEmail.set(e, [...(perEmail.get(e) ?? []), c.slug]);
  }
  const perSlug: Record<string, Abbonamento> = {};
  const nonCollegati: NonCollegato[] = [];
  for (const sub of subs) {
    const abb = statoAbbonamento(sub);
    if (!abb) continue;
    const customer = customerDi(sub);
    const metaSlug = sub.metadata?.slug;
    let slug: string | null = metaSlug && slugs.has(metaSlug) ? metaSlug : (perCustomer.get(customer.id) ?? null);
    let ambigua = false;
    if (!slug) {
      const candidati = perEmail.get(normEmail(customer.email)) ?? [];
      if (candidati.length === 1) slug = candidati[0];
      else if (candidati.length > 1) ambigua = true;
    }
    if (slug) {
      const prev = perSlug[slug];
      if (!prev || preferisci(abb, prev)) perSlug[slug] = abb;
    } else if (abb.stato !== "finito") {
      nonCollegati.push({
        id: sub.id,
        customerId: customer.id,
        nome: customer.name || customer.email || customer.id,
        email: customer.email ?? null,
        importoMese: abb.importoMese,
        valuta: abb.valuta,
        dal: abb.dal,
        motivo: ambigua ? "email_ambigua" : "nessun_match",
        url: abb.url,
      });
    }
  }
  return { perSlug, nonCollegati };
}
