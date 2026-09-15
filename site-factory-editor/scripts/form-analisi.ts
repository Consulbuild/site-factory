// Analisi del comportamento nel form bozza dai dati Umami (API), da terminale:
// funnel per passo, tempi per domanda, avvisi e forzature, ritorni e modifiche, abbandoni,
// esiti delle domande «difficili», dispositivi e provenienza. Anonimo: Umami non ha dati
// personali. Cosa misura il form: site-intake/README.md «Statistiche».
//
//   cd site-factory-editor
//   node --experimental-strip-types scripts/form-analisi.ts            # ultimi 7 giorni
//   node --experimental-strip-types scripts/form-analisi.ts --giorni 30
import { umami, umamiLogin } from "../lib/integrazioni.ts";
import { passiDelForm, sitoFormUmami, urlPasso } from "./umami-form-setup.ts";

const giorni = Number(process.argv[process.argv.indexOf("--giorni") + 1]) || 7;
const endAt = Date.now();
const startAt = endAt - giorni * 864e5;

type Metrica = { x: string | null; y: number };
type Valore = { value: string; total: number };

async function main() {
  const token = await umamiLogin();
  const sito = await sitoFormUmami(token);
  if (!sito) throw new Error("sito Umami del form non trovato: lancia prima scripts/umami-form-setup.ts");
  const q = `startAt=${startAt}&endAt=${endAt}`;
  const leggi = async <T,>(pathname: string, fallback: T): Promise<T> => {
    const r = await umami(token, pathname);
    return r.ok ? ((await r.json()) as T) : fallback;
  };
  // `type=path` nelle versioni recenti di Umami (prima `url`): si prova la prima, poi l'altra.
  const metriche = async (tipo: string): Promise<Metrica[]> => {
    const j = await leggi<unknown>(`/websites/${sito.id}/metrics?type=${tipo}&${q}`, null);
    const righe = j === null && tipo === "path" ? await leggi<unknown>(`/websites/${sito.id}/metrics?type=url&${q}`, []) : (j ?? []);
    return (Array.isArray(righe) ? righe : ((righe as { data?: Metrica[] }).data ?? [])) as Metrica[];
  };
  const valori = async (evento: string, prop: string): Promise<Valore[]> => {
    // Il filtro per evento si chiama `event` (con `eventName` Umami restituisce la proprietà di TUTTI gli eventi).
    const j = await leggi<unknown>(`/websites/${sito.id}/event-data/values?${q}&event=${evento}&propertyName=${prop}`, []);
    const righe = Array.isArray(j) ? j : ((j as { data?: unknown[] }).data ?? []);
    return (righe as Record<string, unknown>[]).map((r) => ({ value: String(r.value ?? r.x ?? ""), total: Number(r.total ?? r.y ?? r.count ?? 0) }));
  };
  const conteggi = (v: Valore[]) => {
    const m = new Map<string, number>();
    for (const x of v) m.set(x.value, (m.get(x.value) ?? 0) + x.total);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const riga = (...celle: (string | number)[]) => console.log("  " + celle.map((c, i) => String(c).padEnd(i === 0 ? 34 : 9)).join(""));
  const titolo = (t: string) => console.log(`\n${t}\n${"─".repeat(t.length)}`);

  console.log(`Form bozza · ultimi ${giorni} giorni · sito Umami ${sito.id}`);

  // A · Quadro
  const stats = await leggi<{ pageviews?: number; visitors?: number; visits?: number }>(`/websites/${sito.id}/stats?${q}`, {});
  const eventi = await metriche("event");
  const n = (nome: string) => eventi.find((e) => e.x === nome)?.y ?? 0;
  const avvii = conteggi(await valori("avvio", "ripresa"));
  titolo("Quadro");
  riga("visitatori", stats.visitors ?? 0);
  riga("visite (sessioni)", stats.visits ?? 0);
  riga("avvii del form", n("avvio"), `di cui riprese ${avvii.find(([k]) => k === "true")?.[1] ?? 0}`);
  riga("invii riusciti", n("invio"), `conversione ${pct(n("invio"), stats.visitors ?? 0)} dei visitatori`);
  riga("invii falliti (errore-invio)", n("errore-invio"));
  riga("uscite prima dell'invio", n("uscita"));

  // B · Funnel per passo (pageview virtuali)
  const urls = await metriche("path");
  const passi = passiDelForm();
  titolo("Funnel: visite per passo (caduta rispetto al passo prima)");
  let prec = 0;
  const primo = urls.find((u) => u.x === urlPasso(1, passi[0]?.id ?? ""))?.y ?? 0;
  for (const p of passi) {
    const y = urls.find((u) => u.x === urlPasso(p.n, p.id))?.y ?? 0;
    riga(`${String(p.n).padStart(2, "0")} ${p.id}`, y, pct(y, primo), prec ? `${y - prec >= 0 ? "+" : ""}${y - prec}` : "");
    prec = y;
  }

  // C · Tempo per domanda: `tempo` = "passo:secondi"
  const tempi = new Map<string, number[]>();
  for (const v of await valori("passo", "tempo")) {
    const [id, s] = v.value.split(":");
    if (!id || s === undefined) continue;
    const lista = tempi.get(id) ?? [];
    for (let i = 0; i < v.total; i++) lista.push(Number(s));
    tempi.set(id, lista);
  }
  const mediana = (a: number[]) => {
    const s = [...a].sort((x, y) => x - y);
    return s.length ? (s[Math.floor((s.length - 1) / 2)] ?? 0) : 0;
  };
  titolo("Tempo per domanda (secondi: mediana · media · quante volte)");
  for (const [id, lista] of [...tempi.entries()].sort((a, b) => mediana(b[1]) - mediana(a[1]))) {
    riga(id, mediana(lista), Math.round(lista.reduce((x, y) => x + y, 0) / lista.length), lista.length);
  }

  // D · Avvisi, forzature, ritorni, modifiche
  titolo("Avvisi per domanda (domanda:livello · volte) e forzature («Va bene così»)");
  const forzati = new Map(conteggi(await valori("forzato", "domanda")));
  for (const [k, v] of conteggi(await valori("avviso", "dove"))) riga(k, v, forzati.get(k.split(":")[0] ?? "") ? `forzati ${forzati.get(k.split(":")[0] ?? "")}` : "");
  const direzioni = conteggi(await valori("passo", "direzione"));
  riga("cambi di passo per direzione", direzioni.map(([k, v]) => `${k} ${v}`).join(" · "));
  const modifiche = conteggi(await valori("modifica", "domanda"));
  if (modifiche.length) riga("modifiche dal riepilogo", modifiche.map(([k, v]) => `${k} ${v}`).join(" · "));

  // E · Abbandoni
  titolo("Uscite prima dell'invio, per domanda");
  for (const [k, v] of conteggi(await valori("uscita", "domanda"))) riga(k, v);

  // F · Le domande «difficili»
  titolo("Esiti delle domande");
  const stampa = async (etichetta: string, evento: string, prop: string) => {
    const c = conteggi(await valori(evento, prop));
    if (c.length) riga(etichetta, c.map(([k, v]) => `${k} ${v}`).join(" · "));
  };
  await stampa("nome sito: esito", "nome_sito", "esito");
  await stampa("nome sito: scritto a mano", "nome_sito", "personalizzato");
  await stampa("zone: quante", "zone", "n");
  await stampa("zone: con una regione", "zone", "regione");
  await stampa("orari: giorni", "orari", "giorni");
  await stampa("orari: con pausa", "orari", "pausa");
  await stampa("orari: uguali tutti i giorni", "orari", "uguali");
  await stampa("telefono: orari", "telefono_orari", "come");
  await stampa("foto: quante", "foto", "n");
  await stampa("foto: errori di caricamento", "foto", "errori");
  await stampa("logo: caricato", "logo", "caricato");
  await stampa("invio: dopo una ripresa", "invio", "ripresa");
  await stampa("invio: ritorni indietro", "invio", "indietro");

  // G · Dispositivi e provenienza
  titolo("Dispositivi e provenienza (visitatori)");
  for (const tipo of ["device", "os", "browser", "country", "region", "city", "referrer"]) {
    const m = (await metriche(tipo)).slice(0, 8);
    if (m.length) riga(tipo, m.map((x) => `${x.x ?? "(vuoto)"} ${x.y}`).join(" · "));
  }
  const query = (await metriche("query")).filter((x) => /utm_|fbclid/.test(x.x ?? "")).slice(0, 10);
  if (query.length) riga("campagne (query)", query.map((x) => `${x.x} ${x.y}`).join(" · "));
  console.log(`\nIl resto (mappe, percorsi, funnel con finestra, retention) è nell'interfaccia: https://stats.consulbuild.com → Form bozza.`);
}

main().catch((e) => {
  console.error("ERRORE:", e instanceof Error ? e.message : e);
  process.exit(1);
});
