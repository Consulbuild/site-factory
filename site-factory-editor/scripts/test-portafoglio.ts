// Banco di prova deterministico della dashboard clienti (nessuna rete, fixture
// finte): abbinamento Stripe ↔ cliente, stati e MRR, predicati delle card,
// stato dei siti da Gatus, conteggio lead, stati delle fonti, cache.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-portafoglio.ts
import { memo, invalida } from "../lib/cache.ts";
import { statoAbbonamento, mrr, abbinaAbbonamenti, type StripeSub } from "../lib/stripe.ts";
import { statoSito, endpointDelSito, type GatusEndpoint } from "../lib/gatus.ts";
import { contaLead, daSviluppare, attivo, giu, inRitardo, isDemo, senzaAbbonamento, type Portafoglio, type ClienteMin } from "../lib/portafoglio-shared.ts";
import { fonte, invalidaPortafoglio } from "../lib/portafoglio.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}

const ORA = Date.parse("2026-09-06T12:00:00Z");
const s = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const GIORNO = 86_400;

/* ---------- fixture Stripe (finte) ---------- */
function sub(over: Partial<StripeSub> & { id: string; email?: string | null; nome?: string }): StripeSub {
  const { email = null, nome = "Cliente", ...resto } = over;
  return {
    status: "active",
    livemode: false,
    created: s("2025-09-30T10:00:00Z"),
    cancel_at_period_end: false,
    metadata: {},
    customer: { id: `cus_${over.id}`, email, name: nome },
    items: { data: [{ quantity: 1, current_period_end: s("2026-09-30T10:00:00Z"), price: { unit_amount: 5900, currency: "eur", recurring: { interval: "month", interval_count: 1 } } }] },
    ...resto,
  };
}

console.log("\nStati dell'abbonamento:");
{
  const a = statoAbbonamento(sub({ id: "a" }), ORA)!;
  caso("active → attivo con rinnovo dagli items", a.stato === "attivo" && a.rinnovo === "2026-09-30T10:00:00.000Z" && a.importoMese === 5900, a);
  const b = statoAbbonamento(sub({ id: "b", items: { data: [{ price: { unit_amount: 5900, currency: "eur", recurring: { interval: "month", interval_count: 1 } } }] }, current_period_end: s("2026-10-01T00:00:00Z") }), ORA)!;
  caso("rinnovo dal campo sull'abbonamento se manca sugli items", b.rinnovo === "2026-10-01T00:00:00.000Z", b);
  const c = statoAbbonamento(sub({ id: "c", status: "past_due", latest_invoice: { created: ORA / 1000 - 14 * GIORNO, due_date: ORA / 1000 - 12 * GIORNO } }), ORA)!;
  caso("past_due → ritardo con giorni dalla due_date", c.stato === "ritardo" && c.giorniRitardo === 12, c);
  const c2 = statoAbbonamento(sub({ id: "c2", status: "unpaid", latest_invoice: { created: ORA / 1000 - 3 * GIORNO } }), ORA)!;
  caso("unpaid senza due_date → giorni dalla created", c2.stato === "ritardo" && c2.giorniRitardo === 3, c2);
  const d = statoAbbonamento(sub({ id: "d", cancel_at_period_end: true }), ORA)!;
  caso("cancel_at_period_end → disdetto fino a fine periodo", d.stato === "disdetto" && d.fine === "2026-09-30T10:00:00.000Z", d);
  const e = statoAbbonamento(sub({ id: "e", status: "canceled", canceled_at: s("2026-08-01T00:00:00Z") }), ORA)!;
  caso("canceled → finito con data", e.stato === "finito" && e.fine === "2026-08-01T00:00:00.000Z", e);
  caso("incomplete → null", statoAbbonamento(sub({ id: "f", status: "incomplete" }), ORA) === null);
  caso("url test mode", a.url === "https://dashboard.stripe.com/test/subscriptions/a");
  caso("url live", statoAbbonamento(sub({ id: "g", livemode: true }), ORA)!.url === "https://dashboard.stripe.com/subscriptions/g");
}

console.log("\nMRR:");
{
  const mese = statoAbbonamento(sub({ id: "m" }), ORA)!;
  const anno = statoAbbonamento(sub({ id: "y", items: { data: [{ price: { unit_amount: 58800, currency: "eur", recurring: { interval: "year", interval_count: 1 } } }] } }), ORA)!;
  const doppio = statoAbbonamento(sub({ id: "q", items: { data: [{ quantity: 2, price: { unit_amount: 5900, currency: "eur", recurring: { interval: "month", interval_count: 1 } } }] } }), ORA)!;
  const usd = statoAbbonamento(sub({ id: "u", items: { data: [{ price: { unit_amount: 9900, currency: "usd", recurring: { interval: "month", interval_count: 1 } } }] } }), ORA)!;
  const ritardo = statoAbbonamento(sub({ id: "r", status: "past_due" }), ORA)!;
  const finito = statoAbbonamento(sub({ id: "k", status: "canceled" }), ORA)!;
  caso("annuale ÷ 12", anno.importoMese === 4900, anno.importoMese);
  caso("quantità 2", doppio.importoMese === 11800, doppio.importoMese);
  caso("somma attivo + ritardo + annuale, ignora finito e valuta estranea", mrr([mese, anno, doppio, usd, ritardo, finito]) === 5900 + 4900 + 11800 + 5900);
  const sett = statoAbbonamento(sub({ id: "w", items: { data: [{ price: { unit_amount: 1000, currency: "eur", recurring: { interval: "week", interval_count: 2 } } }] } }), ORA)!;
  caso("bisettimanale normalizzato al mese", sett.importoMese === Math.round(1000 / (14 / 30.4375)), sett.importoMese);
}

console.log("\nAbbinamento abbonamento ↔ cliente:");
{
  const clienti = [
    { slug: "cavaliere", email: "Info@CavaliereBuild.it " },
    { slug: "rossi", email: "rossi@example.com" },
    { slug: "bianchi", email: "condivisa@example.com" },
    { slug: "verdi", email: "condivisa@example.com" },
    { slug: "neri", email: "", stripeCustomer: "cus_neri1" },
  ];
  const subs = [
    sub({ id: "1", email: "info@cavalierebuild.it" }), // e-mail, case/spazi
    sub({ id: "2", email: "altra@example.com", metadata: { slug: "rossi" } }), // metadata vince
    sub({ id: "3", email: "condivisa@example.com", nome: "Ambiguo Srl" }), // e-mail su 2 clienti
    sub({ id: "4", email: "nessuno@example.com", nome: "Orfano" }), // nessun match
    sub({ id: "5", email: "nessuno2@example.com", status: "canceled" }), // orfano finito: ignorato
    { ...sub({ id: "neri1", email: null }), customer: { id: "cus_neri1", email: null, name: "Neri" } }, // stripe_customer dal registro
    sub({ id: "6", email: "rossi@example.com", status: "canceled", created: s("2024-01-01T00:00:00Z") }), // vecchio finito dello stesso cliente
  ];
  const { perSlug, nonCollegati } = abbinaAbbonamenti(subs, clienti);
  caso("e-mail case-insensitive con spazi", perSlug.cavaliere?.id === "1", perSlug.cavaliere);
  caso("metadata.slug batte l'e-mail", perSlug.rossi?.id === "2", perSlug.rossi);
  caso("stripe_customer del registro n8n", perSlug.neri?.id === "neri1", perSlug.neri);
  caso("e-mail ambigua → non collegato con motivo", nonCollegati.some((n) => n.id === "3" && n.motivo === "email_ambigua"), nonCollegati);
  caso("nessun match → non collegato", nonCollegati.some((n) => n.id === "4" && n.motivo === "nessun_match" && n.nome === "Orfano"));
  caso("orfano finito ignorato", !nonCollegati.some((n) => n.id === "5") && nonCollegati.length === 2, nonCollegati.length);
  caso("stesso cliente: vince l'abbonamento in corso", perSlug.rossi?.stato === "attivo");
  caso("nessun abbonamento per bianchi/verdi (ambigui)", !perSlug.bianchi && !perSlug.verdi);
}

console.log("\nPredicati delle card:");
{
  const c = (slug: string, deploy?: { url?: string; dominio?: string }): ClienteMin => ({ slug, steps: deploy ? { build: { deploy } } : {} });
  const lav = c("lav");
  const demo = c("demo", { url: "https://demo.workers.dev" });
  const att = c("att", { url: "https://x.it", dominio: "x.it" });
  const rit = c("rit", { url: "https://y.it", dominio: "y.it" });
  const dis = c("dis", { url: "https://z.it", dominio: "z.it" });
  const fin = c("fin", { url: "https://w.it", dominio: "w.it" });
  const online = c("online", { url: "https://v.it", dominio: "v.it" });
  const A = (stato: "attivo" | "ritardo" | "disdetto" | "finito") => ({ id: stato, customerId: "c", stato, importoMese: 5900, valuta: "eur", dal: "2025-01-01T00:00:00.000Z", url: "" });
  const p: Portafoglio = {
    fonti: { stripe: { stato: "ok", at: "x" }, gatus: { stato: "ok", at: "x" }, lead: { stato: "ok", at: "x" } },
    abbonamenti: { att: A("attivo"), rit: A("ritardo"), dis: A("disdetto"), fin: A("finito") },
    nonCollegati: [],
    mrr: 0, valuta: "eur", nAbbonamenti: 3, incassato: null,
    siti: { att: { su: true, ms: 400, ultimoControllo: "x", key: "k" }, rit: { su: false, ms: 0, ultimoControllo: "x", key: "k2", da: "x" } },
    lead: {},
  };
  const tutti = [lav, demo, att, rit, dis, fin, online];
  caso("isDemo: url senza dominio", isDemo(demo) && !isDemo(att) && !isDemo(lav));
  caso("Da sviluppare = in lavorazione + demo", tutti.filter((x) => daSviluppare(x, p)).map((x) => x.slug).join() === "lav,demo");
  caso("Attivi = attivo + ritardo + disdetto", tutti.filter((x) => attivo(x, p)).map((x) => x.slug).join() === "att,rit,dis");
  caso("Siti down", tutti.filter((x) => giu(x, p)).map((x) => x.slug).join() === "rit");
  caso("In ritardo", tutti.filter((x) => inRitardo(x, p)).map((x) => x.slug).join() === "rit");
  caso("Senza abbonamento = online con dominio ma senza sub (anche finito)", tutti.filter((x) => senzaAbbonamento(x, p)).map((x) => x.slug).join() === "online");
  caso("Con portafoglio nullo conta solo Da sviluppare", tutti.filter((x) => daSviluppare(x, null)).length === 2 && !tutti.some((x) => attivo(x, null) || giu(x, null) || inRitardo(x, null)));
}

console.log("\nStato del sito (Gatus):");
{
  const r = (min: number, success: boolean, ms = 412) => ({
    status: success ? 200 : 0,
    duration: ms * 1e6,
    success,
    timestamp: new Date(ORA - min * 60_000).toISOString(),
    conditionResults: [{ condition: "[STATUS] == 200", success }, { condition: "[RESPONSE_TIME] < 3000", success: true }],
  });
  const su: GatusEndpoint = { name: "x.it", group: "clienti", key: "clienti_x.it", results: [r(5, true), r(15, true, 380), r(10, true)] };
  const st = statoSito(su)!;
  caso("su, ms dall'ultimo controllo (ordine sparso)", st.su && st.ms === 412 && st.key === "clienti_x.it" && !st.da, st);
  const giuEp: GatusEndpoint = { ...su, results: [r(20, true), r(5, false), r(15, false), r(10, false)] };
  const sg = statoSito(giuEp)!;
  caso("giù: da = primo fallimento dopo l'ultimo successo, falliti 3, causa, ultimoSu", !sg.su && sg.da === r(15, false).timestamp && sg.falliti === 3 && sg.causa === "[STATUS] == 200" && sg.ultimoSu === r(20, true).timestamp, sg);
  const tuttiGiu = statoSito({ ...su, results: [r(5, false), r(10, false)] })!;
  caso("tutti falliti: da = primo risultato, nessun ultimoSu", tuttiGiu.da === r(10, false).timestamp && tuttiGiu.falliti === 2 && !tuttiGiu.ultimoSu, tuttiGiu);
  caso("endpoint assente → null", statoSito(undefined) === null && statoSito({ ...su, results: [] }) === null);
  caso("endpointDelSito: gruppo clienti e nome = dominio", endpointDelSito([{ ...su, group: "vps" }, su], "x.it")?.group === "clienti" && !endpointDelSito([su], "y.it"));
}

console.log("\nConteggio lead:");
{
  const q = (giorni: number) => new Date(ORA - giorni * 86_400_000).toISOString();
  const righe = [
    { slug: "a", quando: q(1) }, { slug: "a", quando: q(29) }, { slug: "a", quando: q(31) }, { slug: "a", quando: q(59) }, { slug: "a", quando: q(61) },
    { slug: "b", quando: "non-una-data" }, { slug: "", quando: q(2) }, { slug: "c", quando: q(-1) },
  ];
  const l = contaLead(righe, ORA);
  caso("30 gg e 30 precedenti, ultimo", l.a.n30 === 2 && l.a.n30Prec === 2 && l.a.ultimo === q(1), l.a);
  caso("date non valide, slug vuoto e futuro ignorati", !l.b && !l[""] && !l.c, l);
}

console.log("\nStati delle fonti e cache:");
{
  let chiamate = 0;
  const nc = await fonte("t:nc", 1000, false, async () => { chiamate += 1; return 1; });
  caso("non configurata: fn non chiamata", nc.fonte.stato === "non_configurata" && nc.val === null && chiamate === 0);
  const ko1 = await fonte("t:ko", 1000, true, async () => { chiamate += 1; throw new Error("boom"); });
  const ko2 = await fonte("t:ko", 1000, true, async () => { chiamate += 1; throw new Error("boom2"); });
  caso("non raggiungibile con «da» stabile ed errore in cache", ko1.fonte.stato === "non_raggiungibile" && ko2.fonte.stato === "non_raggiungibile" && ko1.fonte.da === ko2.fonte.da && chiamate === 1, [ko1, ko2, chiamate]);
  invalidaPortafoglio("t:ko");
  const ok = await fonte("t:ko", 1000, true, async () => { chiamate += 1; return 42; });
  caso("dopo invalida: ok con at, valore", ok.fonte.stato === "ok" && ok.val === 42 && chiamate === 2, ok);
  const ok2 = await fonte("t:ko", 1000, true, async () => { chiamate += 1; return 43; });
  caso("entro il TTL: valore in cache, at invariato", ok2.val === 42 && ok2.fonte.stato === "ok" && ok.fonte.stato === "ok" && ok2.fonte.at === ok.fonte.at && chiamate === 2);

  let n = 0;
  const f = () => memo("c:x", 50, async () => ++n);
  const [a, b] = await Promise.all([f(), f()]);
  caso("memo: chiamate concorrenti → una esecuzione", a === 1 && b === 1 && n === 1);
  await new Promise((r) => setTimeout(r, 60));
  caso("memo: dopo il TTL riesegue", (await f()) === 2);
  invalida("c:");
  caso("invalida per prefisso", (await f()) === 3 && (await memo("d:y", 50, async () => "y")) === "y");
}

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
