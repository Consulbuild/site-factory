// Classificazione di una pagina di Google (SERP) e difficoltà di una ricerca (piano docs/traffico/piano-T4.md §4).
//
// Modulo PURO (nessun I/O): lo usano la mappa (lib/mappa-query.ts, lib/mappa-lavoro.ts) e il campione di
// calibrazione (scripts/campione-serp.ts), così le due misure seguono le stesse regole. Nessun giudizio AI:
// elenchi di domini versionati (lib/mappa-domini.json) + regole in ordine, ciascuna scritta nella riga.
// Import solo di tipo da mappa-query.ts (erasati da strip-types: nessun ciclo a runtime).
import type { Classe, Fattore, Serp } from "./mappa-query.ts";

/* ---------- ingressi ---------- */

export interface VoceDominio {
  dominio: string;
  nome: string;
  nota?: string;
}
export interface Domini {
  versione: string;
  aggiornato: string;
  portali: VoceDominio[];
  directory: VoceDominio[];
  altro: VoceDominio[];
}

/** Risposta DataForSEO già letta da lib/dataforseo.ts: solo i campi usati, nessuna classificazione. */
export interface SerpGrezza {
  checkUrl: string;
  /** Status 40102 (nessun risultato) o nessun item organico. */
  vuota: boolean;
  organici: { rankAbsolute: number; dominio: string; url: string; titolo: string }[];
  localPack: { dominio: string | null; pagata: boolean }[];
  aiOverview: boolean;
  annunci: number;
  localServices: boolean;
}

/** Il luogo della ricerca: il comune nel testo, o la sede per le ricerche senza comune. */
export interface LuogoQuery {
  nome: string;
  sigla: string;
  /** Nome della provincia (per il segnale locale), null se ignoto. */
  provincia: string | null;
  popolazione: number | null;
}

export type SerpRidotta = Omit<Serp, "fonte" | "coordinate">;

/* ---------- testo e domini ---------- */

const interi = new Intl.NumberFormat("it-IT", { useGrouping: "always", maximumFractionDigits: 0 });
export const formatoIntero = (n: number): string => interi.format(n);

/** Minuscolo, senza accenti, ogni carattere non alfanumerico come spazio. */
const perConfronto = (s: string): string =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const parole = (s: string): string[] => perConfronto(s).split(" ").filter(Boolean);

/** Dominio confrontabile: minuscolo, senza punto finale né «www.». */
export function normalizzaDominio(d: string): string {
  return d.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

/** Il dominio è `base` o un suo sottodominio («it.indeed.com» → indeed.com). */
const suffisso = (dominio: string, base: string): boolean => dominio === base || dominio.endsWith(`.${base}`);

/** Etichetta registrabile compatta: «imbianchino-vicenza.it» → «imbianchinovicenza». ponytail: ignora i suffissi a due livelli (.co.uk), assenti nelle SERP italiane. */
function etichettaDominio(dominio: string): string {
  const parti = dominio.split(".");
  return (parti.length >= 2 ? parti[parti.length - 2]! : parti[0]!).replace(/[^a-z0-9]/g, "");
}

const PAROLE_VUOTE = new Set(["di", "a", "in", "da", "e", "ed", "del", "della", "dei", "delle", "al", "alla", "per", "con", "su", "il", "la", "lo", "le", "gli", "un", "una", "vicino", "me"]);
/** Parole della testa che da sole non dicono il lavoro («impresa», «ristrutturazione»): contano solo se non c'è altro. */
const GENERICHE_TESTA = new Set(["impresa", "ditta", "azienda", "lavori", "posa", "installazione", "sostituzione", "rifacimento", "ristrutturazione", "costruzione", "manutenzione", "riparazione", "impianto", "preventivo"]);
/** Prime parole dei nomi dei comuni che non li distinguono («San Donato Milanese» → «donato»). */
const GENERICHE_COMUNE = new Set(["san", "santa", "santo", "sant", "monte", "castel", "castello", "villa", "borgo", "porto", "marina", "torre", "ponte", "casal", "casale", "colle", "rocca", "terme"]);

/** Radice tollerante al plurale: parola ≥ 5 lettere senza l'ultima («bagno» ~ «bagni»). */
const combacia = (parolaTesto: string, token: string): boolean => (token.length >= 5 ? parolaTesto.startsWith(token.slice(0, -1)) : parolaTesto === token);
const contiene = (testo: string[], token: string): boolean => testo.some((p) => combacia(p, token));

/** Parole distintive della testa: «ristrutturazione bagno» → [bagno]; «impresa di costruzioni» → [impresa, costruzioni]. */
export function tokenTesta(testa: string): string[] {
  const utili = parole(testa).filter((p) => p.length >= 3 && !PAROLE_VUOTE.has(p));
  const distintive = utili.filter((p) => !GENERICHE_TESTA.has(p));
  return distintive.length ? distintive : utili;
}

/** Parola che riconosce il comune in un titolo: la prima non generica di almeno 3 lettere, con la forma originale per le frasi. */
export function tokenComune(nome: string): { token: string; forma: string } {
  const originali = nome.split("/")[0]!.split(/[\s’'`´\-]+/).filter(Boolean);
  const scelta = originali.find((w) => perConfronto(w).length >= 3 && !GENERICHE_COMUNE.has(perConfronto(w))) ?? originali[0] ?? nome;
  return { token: perConfronto(scelta).replace(/ /g, ""), forma: scelta };
}

/** Il testo (titolo o URL) nomina il luogo: comune per intero o la sua parola distintiva, provincia, o «(MI)». */
function segnaleLocale(testoOriginale: string, luogo: LuogoQuery): boolean {
  const t = parole(testoOriginale);
  const frase = ` ${t.join(" ")} `;
  if (frase.includes(` ${parole(luogo.nome).join(" ")} `)) return true;
  if (t.includes(tokenComune(luogo.nome).token)) return true;
  if (luogo.provincia && t.includes(tokenComune(luogo.provincia).token)) return true;
  return new RegExp(`\\(\\s*${luogo.sigla}\\s*\\)`, "i").test(testoOriginale);
}

/* ---------- riduzione e classi (§4.1-§4.2) ---------- */

const PA = [/\.gov\.it$/, /(^|\.)comune\.[a-z0-9-]+\.[a-z]{2,}$/, /(^|\.)regione\.[a-z0-9-]+\.[a-z]{2,}$/];

function classe(
  dominio: string,
  titolo: string,
  url: string,
  ctx: { domini: Domini; cliente: string | null; localPack: Set<string>; luogo: LuogoQuery },
): { classe: Classe; regola: string } {
  if (ctx.cliente && suffisso(dominio, ctx.cliente)) return { classe: "cliente", regola: "cliente" };
  for (const [elenco, c] of [
    ["portali", "portale"],
    ["directory", "directory"],
    ["altro", "altro"],
  ] as const) {
    const voce = ctx.domini[elenco].find((v) => suffisso(dominio, normalizzaDominio(v.dominio)));
    if (voce) return { classe: c, regola: `elenco:${elenco}:${normalizzaDominio(voce.dominio)}` };
  }
  if (PA.some((re) => re.test(dominio))) return { classe: "altro", regola: "pa" };
  if ([...ctx.localPack].some((d) => suffisso(dominio, d) || suffisso(d, dominio))) return { classe: "impresa_locale", regola: "local-pack" };
  let percorso = url;
  try {
    percorso = new URL(url).pathname;
  } catch {
    /* url già validato a monte: resta il testo intero */
  }
  if (segnaleLocale(titolo, ctx.luogo) || segnaleLocale(percorso, ctx.luogo)) return { classe: "impresa_locale", regola: "ignoto+segnale-locale" };
  return { classe: "altro", regola: "ignoto" };
}

/** Da risposta letta a SERP ridotta e classificata: primi 10 organici, feature, domini del local pack. */
export function riduciSerp(g: SerpGrezza, opz: { domini: Domini; dominioCliente: string | null; luogo: LuogoQuery }): SerpRidotta {
  const localPackDomini = [...new Set(g.localPack.filter((s) => !s.pagata && s.dominio).map((s) => normalizzaDominio(s.dominio!)))].sort().slice(0, 20);
  const ctx = { domini: opz.domini, cliente: opz.dominioCliente ? normalizzaDominio(opz.dominioCliente) : null, localPack: new Set(localPackDomini), luogo: opz.luogo };
  const organici = [...g.organici]
    .sort((a, b) => a.rankAbsolute - b.rankAbsolute || a.url.localeCompare(b.url))
    .slice(0, 10)
    .map((o, i) => {
      const dominio = normalizzaDominio(o.dominio);
      const titolo = o.titolo.length > 300 ? `${o.titolo.slice(0, 299)}…` : o.titolo;
      return { pos: i + 1, dominio, url: o.url, titolo, ...classe(dominio, o.titolo, o.url, ctx) };
    });
  return {
    checkUrl: g.checkUrl,
    vuota: g.vuota || organici.length === 0,
    feature: {
      localPack: g.localPack.filter((s) => !s.pagata).length,
      aiOverview: g.aiOverview,
      annunci: g.annunci,
      localServices: g.localServices,
    },
    organici,
    localPackDomini,
  };
}

/** Domini classificati dalle regole 7-8 (fuori dagli elenchi): lavoro di curatela di mappa-domini.json. */
export const dominiIgnoti = (s: Pick<Serp, "organici">): string[] => s.organici.filter((o) => o.regola.startsWith("ignoto")).map((o) => o.dominio);

/* ---------- difficoltà (§4.3) e spazio organico ---------- */

export const SOGLIA_MEDIA = 3;
export const SOGLIA_ALTA = 6;
export type Livello = "bassa" | "media" | "alta";
export interface Difficolta {
  livello: Livello;
  punti: number;
  fattori: Fattore[];
}

export const livelloDaPunti = (punti: number): Livello => (punti >= SOGLIA_ALTA ? "alta" : punti >= SOGLIA_MEDIA ? "media" : "bassa");
const plurale = (n: number, uno: string, molti: string) => `${formatoIntero(n)} ${n === 1 ? uno : molti}`;

export function difficolta(serp: SerpRidotta, testa: string, luogo: LuogoQuery): Difficolta {
  if (serp.vuota) {
    return { livello: "bassa", punti: 0, fattori: [{ codice: "vuota", testo: "pagina di Google senza risultati utili", valore: null, punti: 0 }] };
  }
  const pop = luogo.popolazione;
  const f1: Fattore = {
    codice: "F1",
    testo: pop === null ? `abitanti di ${luogo.nome} non noti` : `${luogo.nome} ha ${formatoIntero(pop)} abitanti`,
    valore: pop,
    punti: pop === null || pop < 50_000 ? 0 : pop <= 250_000 ? 2 : 5,
  };
  const teste = tokenTesta(testa);
  const comune = tokenComune(luogo.nome);
  const nomina = (titolo: string) => {
    const t = parole(titolo);
    return teste.some((x) => contiene(t, x)) && (contiene(t, comune.token) || ` ${t.join(" ")} `.includes(` ${parole(luogo.nome).join(" ")} `));
  };
  const ottimizzate = serp.organici.filter((o) => o.classe === "impresa_locale" && nomina(o.titolo)).length;
  const exact = serp.organici.filter((o) => {
    if (o.classe === "cliente") return false;
    const e = etichettaDominio(o.dominio);
    return teste.some((x) => e.includes(x.length >= 5 ? x.slice(0, -1) : x)) && e.includes(comune.token);
  }).length;
  const forti = serp.organici.filter((o) => o.pos <= 3 && (o.classe === "portale" || o.classe === "directory")).length;
  const deboli = serp.organici.filter((o) => o.classe === "altro").length;
  const tok = teste[0] ?? testa;
  const fattori: Fattore[] = [
    f1,
    { codice: "F2", testo: `${plurale(ottimizzate, "impresa locale", "imprese locali")} con ${tok} e ${comune.forma} nel titolo`, valore: ottimizzate, punti: Math.min(4, ottimizzate) },
    { codice: "F3", testo: `${plurale(exact, "dominio", "domini")} con ${tok} e ${comune.forma} nel nome`, valore: exact, punti: Math.min(2, exact) },
    { codice: "F4", testo: `${plurale(forti, "portale o directory", "portali o directory")} nei primi 3`, valore: forti, punti: Math.min(3, forti) },
    { codice: "F5", testo: plurale(deboli, "risultato debole", "risultati deboli"), valore: deboli, punti: -Math.min(3, deboli) },
    {
      codice: "F6",
      testo: `solo ${plurale(serp.organici.length, "risultato organico", "risultati organici")}`,
      valore: serp.organici.length,
      punti: serp.organici.length < 6 ? -1 : 0,
    },
  ];
  const cliente = serp.organici.find((o) => o.classe === "cliente");
  if (cliente) fattori.push({ codice: "cliente", testo: `il sito del cliente è già in posizione ${cliente.pos}`, valore: cliente.pos, punti: 0 });
  const punti = fattori.reduce((s, f) => s + f.punti, 0);
  return { livello: livelloDaPunti(punti), punti, fattori };
}

/** Quota di clic che la pagina lascia ai risultati organici: pesa il volume, non la difficoltà. */
export function spazioOrganico(f: Serp["feature"]): number {
  const o = 1 - (f.localPack > 0 ? 0.2 : 0) - (f.aiOverview ? 0.15 : 0) - 0.05 * Math.min(f.annunci, 4) - (f.localServices ? 0.1 : 0);
  return Math.max(0.4, Math.round(o * 1000) / 1000);
}

/** Frase della difficoltà (§5.5): F1 sempre, gli altri fattori solo se pesano, il cliente se c'è. */
export function fraseDifficolta(d: Difficolta): string {
  const parti = d.fattori.filter((f) => f.codice === "F1" || f.codice === "vuota" || f.codice === "cliente" || f.punti !== 0).map((f) => f.testo);
  const nome = { bassa: "bassa", media: "media", alta: "alta" }[d.livello];
  return `Difficoltà ${nome} (${d.punti === 1 || d.punti === -1 ? `${d.punti} punto` : `${d.punti} punti`}): ${parti.join("; ")}.`;
}

/** Frase delle feature (§5.5): «mappa con 3 schede, nessuna panoramica AI, nessun annuncio». */
export function fraseFeature(f: Serp["feature"]): string {
  const parti = [
    f.localPack > 0 ? `mappa con ${plurale(f.localPack, "scheda", "schede")}` : "nessuna mappa",
    f.aiOverview ? "panoramica AI" : "nessuna panoramica AI",
    f.annunci > 0 ? plurale(f.annunci, "annuncio", "annunci") : "nessun annuncio",
  ];
  if (f.localServices) parti.push("annunci Local Services");
  return `Nella pagina di Google: ${parti.join(", ")}.`;
}
