// Client DataForSEO del Traffico (piano docs/traffico/piano-T4.md §2.1-§2.5 e §7; decisioni T4 punti 3 e 9, K1 punto 6).
//
// - Solo Live e solo mobile: volumi Google Ads (search_volume/live) e SERP organica (organic/live/advanced).
//   Gratuite e mai registrate nei costi: saldo (appendix/user_data) e località Google Ads d'Italia.
// - Chiavi DATAFORSEO_LOGIN/PASSWORD dal Keychain con getSecret (K1): la Basic auth si costruisce in memoria, ogni
//   messaggio passa da redigi() e nessuna riga di costo contiene header o credenziali. Questo modulo legge soltanto.
// - Cache su disco ~/.cache/site-factory/dataforseo/<endpoint>/<sha256>.json (SF_DATAFORSEO_CACHE): una risposta
//   pagata non si ripaga entro il TTL (volumi 30 giorni, SERP 14, località 30); un errore, anche di forma, non va mai in cache.
// - Ogni chiamata pagata partita (anche fallita o interrotta dallo stop) = una riga in costi.ndjson col campo `cost` della risposta.
// - SF_DATAFORSEO_REGISTRATE=<cartella>: risposte registrate per banchi ed E2E senza chiavi (cache separata in
//   <cache>/registrate, mai mescolata ai dati veri). Regole di lettura: user-data.json, localita-it.json,
//   volumi-<location_code>.json (le keyword chieste e assenti dalla registrazione tornano con search_volume null,
//   come Google Ads sotto soglia), serp-*.json (serp-milano.json per le ricerche con «milano», le altre scelte dallo
//   sha256 della keyword), forza-errore.json (se c'è, risponde a ogni chiamata pagata: prove d'errore).
// Import con estensione: il banco scripts/test-mappa-query.ts lo usa con un trasporto finto.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { redigi, type Trasporto } from "./chiavi-traffico.ts";
import { getSecret } from "./secrets.ts";
import { RigaCostoSchema, type EndpointPagato, type Fonte, type RigaCosto, type VolumeLetto } from "./mappa-query.ts";
import type { SerpGrezza } from "./serp-classifica.ts";

export const BASE_URL = "https://api.dataforseo.com/v3/";
export const EP_VOLUMI: EndpointPagato = "keywords_data/google_ads/search_volume/live";
export const EP_SERP: EndpointPagato = "serp/google/organic/live/advanced";
export const EP_SALDO = "appendix/user_data";
export const EP_LOCALITA = "keywords_data/google_ads/locations/it";
const GIORNO_MS = 24 * 60 * 60 * 1000;
export const TTL_MS = { [EP_VOLUMI]: 30 * GIORNO_MS, [EP_SERP]: 14 * GIORNO_MS, [EP_LOCALITA]: 30 * GIORNO_MS } as const;
/** Tentativi totali sugli errori temporanei e attese tra un tentativo e l'altro (piano §7). */
export const TENTATIVI = 3;
export const ATTESE_MS = [5_000, 15_000] as const;
/** Google Ads Live: 12 richieste al minuto per account → almeno 5 s tra due chiamate pagate. */
export const SPAZIO_ADS_MS = 5_000;
const TIMEOUT_MS = 120_000;

/* ---------- errori ---------- */

export type TipoErrore = "auth" | "credito" | "limite" | "servizio" | "richiesta" | "forma";

/** Errore già tradotto in italiano, senza credenziali. `tipo` decide tentativi e comportamento del lavoro. */
export class ErroreDfs extends Error {
  readonly tipo: TipoErrore;
  readonly codice: number | null;
  constructor(tipo: TipoErrore, message: string, codice: number | null = null) {
    super(message);
    this.name = "ErroreDfs";
    this.tipo = tipo;
    this.codice = codice;
  }
}

const breve = (s: unknown) => (typeof s === "string" ? s.replace(/[^\p{L}\p{N} .,:;'()/-]/gu, "").slice(0, 80).trim() : "");

/** HTTP e status_code DataForSEO → errore (null = ok). Codici da docs.dataforseo.com/v3/appendix/errors (2026-09-14). */
export function erroreDaCodice(http: number, codice: number | null, messaggio?: unknown): ErroreDfs | null {
  if (http === 200 && (codice === 20000 || codice === null)) return null;
  const c = codice ?? http;
  const dettaglio = breve(messaggio);
  if (codice === 40207) return new ErroreDfs("auth", "L'IP di questo Mac non è nella whitelist di DataForSEO: aggiungilo in app.dataforseo.com → API Access.", c);
  if (http === 401 || codice === 40100) return new ErroreDfs("auth", "DataForSEO ha rifiutato login o password: controllali in Impostazioni → Chiavi API.", c);
  // 40101 è «Internal SE Server Error» (Google non ha risposto a DataForSEO), non un problema di credenziali: visto
  // dal vivo nel campione del 15/09 dopo 11 e 48 pagine riuscite con le stesse chiavi. Si ritenta come un guasto del servizio.
  if (codice === 40101) return new ErroreDfs("servizio", `Google non ha risposto a DataForSEO (40101${dettaglio ? ` ${dettaglio}` : ""}): riprova più tardi.`, c);
  if (codice === 40104 || codice === 40201 || codice === 40204 || codice === 40206) {
    return new ErroreDfs("auth", `L'account DataForSEO non può usare queste API (${c}${dettaglio ? ` ${dettaglio}` : ""}): controllalo su app.dataforseo.com.`, c);
  }
  if (http === 402 || codice === 40200 || codice === 40210) return new ErroreDfs("credito", `Credito DataForSEO esaurito (${c}): ricarica e rilancia, le risposte già pagate non si ripagano.`, c);
  if (http === 429 || codice === 40202 || codice === 40209) return new ErroreDfs("limite", `DataForSEO limita le richieste (${c}): riprova tra qualche minuto.`, c);
  if (http >= 500 || (codice !== null && codice >= 50000)) return new ErroreDfs("servizio", `DataForSEO non risponde (${c}): riprova più tardi.`, c);
  return new ErroreDfs("richiesta", `DataForSEO ha rifiutato la richiesta (${c}${dettaglio ? ` ${dettaglio}` : ""}): difetto dell'editor, vedi docs/DEBUG.md.`, c);
}

const percorsoZod = (base: string, e: z.ZodError) => {
  const i = e.issues[0];
  const p = (i?.path ?? []).map((x) => (typeof x === "number" ? `[${x}]` : `.${String(x)}`)).join("");
  return `Risposta DataForSEO inattesa in ${base}${p}: ${i?.message ?? "forma sconosciuta"}`;
};

/* ---------- forme delle risposte (solo i campi usati) ---------- */

const BustaSchema = z.object({
  status_code: z.number().int(),
  status_message: z.string().optional(),
  cost: z.number().optional(),
  tasks: z
    .array(
      z.object({
        status_code: z.number().int(),
        status_message: z.string().optional(),
        cost: z.number().optional(),
        result: z.array(z.unknown()).nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});
type Busta = z.infer<typeof BustaSchema>;
type Task = NonNullable<Busta["tasks"]>[number];

const VoceVolumeSchema = z.object({
  keyword: z.string(),
  spell: z.string().nullable().optional(),
  search_volume: z.number().int().min(0).nullable(),
  monthly_searches: z
    .array(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12), search_volume: z.number().nullable() }))
    .nullable()
    .optional(),
});
const RisultatoSerpSchema = z.object({ check_url: z.url(), items: z.array(z.looseObject({ type: z.string() })).nullable() });
const OrganicoSchema = z.object({ rank_absolute: z.number().int().min(1), domain: z.string().min(1), url: z.url(), title: z.string().nullable().optional() });
const LocalPackSchema = z.object({ domain: z.string().nullable().optional(), is_paid: z.boolean().nullable().optional() });
const LocalitaSchema = z.object({
  location_code: z.number().int(),
  location_name: z.string(),
  location_code_parent: z.number().int().nullable(),
  location_type: z.string(),
});
export type Localita = z.infer<typeof LocalitaSchema>;
const SaldoSchema = z.object({ money: z.object({ balance: z.number() }) });

/* ---------- località (§2.3) ---------- */

/** Regioni Istat → nome della regione nelle località Google Ads (verificato sul CSV locations_kwrd_2026_09_01, 15/09). */
export const REGIONI_EN: Readonly<Record<string, string>> = {
  "01": "Piedmont",
  "02": "Aosta Valley",
  "03": "Lombardy",
  "04": "Trentino-Alto Adige/Sudtirol",
  "05": "Veneto",
  "06": "Friuli-Venezia Giulia",
  "07": "Liguria",
  "08": "Emilia-Romagna",
  "09": "Tuscany",
  "10": "Umbria",
  "11": "Marche",
  "12": "Lazio",
  "13": "Abruzzo",
  "14": "Molise",
  "15": "Campania",
  "16": "Apulia",
  "17": "Basilicata",
  "18": "Calabria",
  "19": "Sicily",
  "20": "Sardinia",
};
/** Nomi City/Municipality del CSV diversi dal nome Istat (stessa verifica del 15/09: 14 casi). */
export const ESONIMI: Readonly<Record<string, string>> = {
  Milan: "Milano",
  Rome: "Roma",
  Naples: "Napoli",
  Turin: "Torino",
  Florence: "Firenze",
  Venice: "Venezia",
  Genoa: "Genova",
  Padua: "Padova",
  Syracuse: "Siracusa",
  Mantua: "Mantova",
  "Reggio Emilia": "Reggio nell'Emilia",
  "Reggio Calabria": "Reggio di Calabria",
  Iesi: "Jesi",
  "Tremiti Islands": "Isole Tremiti",
};

const chiaveNome = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Località Google Ads del comune (per i volumi delle ricerche senza comune): City prima di Municipality. null se assente. */
export function trovaLocalita(localita: readonly Localita[], comune: { nome: string; altraLingua?: string }, regioneCodice: string): Localita | null {
  const en = REGIONI_EN[regioneCodice];
  const regione = en ? localita.find((l) => l.location_type === "Region" && l.location_name === `${en},Italy`) : undefined;
  if (!regione) return null;
  const nomi = new Set([comune.nome, ...comune.nome.split("/"), ...(comune.altraLingua ? [comune.altraLingua] : [])].map(chiaveNome));
  const rango = (t: string) => (t === "City" ? 0 : 1);
  return (
    localita
      .filter((l) => (l.location_type === "City" || l.location_type === "Municipality") && l.location_code_parent === regione.location_code)
      .filter((l) => {
        const primo = l.location_name.split(",")[0]!.trim();
        return nomi.has(chiaveNome(primo)) || (ESONIMI[primo] !== undefined && nomi.has(chiaveNome(ESONIMI[primo]!)));
      })
      .sort((a, b) => rango(a.location_type) - rango(b.location_type) || a.location_code - b.location_code)[0] ?? null
  );
}

/* ---------- cache su disco ---------- */

export const CACHE_PREDEFINITA = path.join(os.homedir(), ".cache", "site-factory", "dataforseo");

interface VoceCache {
  richiesta: { endpoint: string; corpo: unknown };
  lettoAt: string;
  costoUsd: number;
  risposta: unknown;
}

const chiaveRichiesta = (endpoint: string, corpo: unknown) => crypto.createHash("sha256").update(`${endpoint}\n${JSON.stringify(corpo)}`).digest("hex");

function scriviAtomico(file: string, testo: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, testo, "utf8");
  fs.renameSync(tmp, file);
}

/* ---------- risposte registrate ---------- */

/** fetch sulle risposte registrate di `dir` (esportato per il banco, che lo compone con errori mirati). */
export function fetchRegistrato(dir: string): Trasporto["fetch"] {
  const leggi = (nome: string): unknown => {
    const file = path.join(dir, nome);
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      throw new Error(`risposta registrata non leggibile: ${file} (${(e as NodeJS.ErrnoException).code ?? "JSON non valido"})`);
    }
  };
  const risposta = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200, headers: { "content-type": "application/json" } });
  // Latenza finta (SF_DATAFORSEO_LATENZA_MS) per vedere nell'E2E la fase live, lo stop e il calcolo in parallelo rifiutato.
  const latenza = Math.max(0, Number(process.env.SF_DATAFORSEO_LATENZA_MS) || 0);
  return async (url, init) => {
    if (latenza) await attesaReale(latenza, init.signal ?? undefined);
    const endpoint = url.startsWith(BASE_URL) ? url.slice(BASE_URL.length) : url;
    if (endpoint === EP_SALDO) return risposta(leggi("user-data.json"));
    if (endpoint === EP_LOCALITA) return risposta(leggi("localita-it.json"));
    if (fs.existsSync(path.join(dir, "forza-errore.json"))) return risposta(leggi("forza-errore.json"));
    const task = (JSON.parse(String(init.body ?? "[]")) as Record<string, unknown>[])[0] ?? {};
    if (endpoint === EP_VOLUMI) {
      const nome = `volumi-${String(task.location_code)}.json`;
      const registrata = fs.existsSync(path.join(dir, nome)) ? (leggi(nome) as Busta) : { status_code: 20000, cost: 0.09, tasks: [{ status_code: 20000, cost: 0.09, result: [] }] };
      const chieste = (task.keywords as string[]) ?? [];
      const note = new Map(((registrata.tasks?.[0]?.result ?? []) as { keyword: string }[]).map((v) => [v.keyword, v]));
      const result = chieste.map(
        (k) => note.get(k) ?? { keyword: k, spell: null, location_code: task.location_code, language_code: "it", search_partners: false, competition: null, competition_index: null, search_volume: null, low_top_of_page_bid: null, high_top_of_page_bid: null, cpc: null, monthly_searches: null },
      );
      return risposta({ ...registrata, tasks: [{ ...registrata.tasks?.[0], data: task, result_count: result.length, result }] });
    }
    if (endpoint === EP_SERP) {
      const keyword = String(task.keyword ?? "");
      const serp = fs
        .readdirSync(dir)
        .filter((f) => /^serp-.+\.json$/.test(f) && f !== "serp-milano.json")
        .sort();
      const nome = / milano$|^milano /.test(keyword) && fs.existsSync(path.join(dir, "serp-milano.json")) ? "serp-milano.json" : serp[crypto.createHash("sha256").update(keyword).digest()[0]! % Math.max(1, serp.length)];
      if (!nome) throw new Error(`nessuna SERP registrata in ${dir}`);
      return risposta(leggi(nome));
    }
    throw new Error(`endpoint senza risposta registrata: ${endpoint}`);
  };
}

/* ---------- client ---------- */

export interface OpzioniDfs {
  /** fetch + getSecret (banco: finti). Predefinito: fetch globale e Keychain. */
  trasporto?: Trasporto;
  /** Cartella di risposte registrate; predefinita SF_DATAFORSEO_REGISTRATE. `null` = mai. */
  registrate?: string | null;
  cacheDir?: string;
  /** Righe di costo: file e lavoro (null = nessuna riga, per le sole letture gratuite). */
  costi?: { file: string; lavoro: RigaCosto["lavoro"] } | null;
  signal?: AbortSignal;
  attendi?: (ms: number, signal?: AbortSignal) => Promise<void>;
  adesso?: () => Date;
}

const attesaReale = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export interface EsitoVolumi {
  risultati: Map<string, VolumeLetto>;
  fonte: Fonte;
  dallaCache: boolean;
}
export interface EsitoSerp {
  grezza: SerpGrezza;
  fonte: Fonte;
  dallaCache: boolean;
}

export const corpoVolumi = (keywords: readonly string[], locationCode: number) => [
  { keywords: [...keywords].sort(), location_code: locationCode, language_code: "it", search_partners: false },
];
export const corpoSerp = (keyword: string, coordinate: string) => [
  { keyword, location_coordinate: coordinate, language_code: "it", device: "mobile", os: "android", depth: 10, load_async_ai_overview: true },
];

/* ---------- lettori dei task (ErroreDfs «forma» se fuori forma): gli stessi per la risposta, la cache e la stima ---------- */

function leggiTaskVolumi(task: Task): Map<string, VolumeLetto> {
  const voci = z.array(VoceVolumeSchema).safeParse(task.result ?? []);
  if (!voci.success) throw new ErroreDfs("forma", percorsoZod("tasks[0].result", voci.error));
  const letti = new Map<string, VolumeLetto>();
  for (const v of voci.data) {
    const mesi = (v.monthly_searches ?? []).map((m) => m.year * 12 + (m.month - 1));
    const ultimo = mesi.length ? Math.max(...mesi) : null;
    const datiAl = ultimo === null ? null : `${Math.floor(ultimo / 12)}-${String((ultimo % 12) + 1).padStart(2, "0")}`;
    letti.set(v.keyword.normalize("NFC").toLowerCase(), { valore: v.search_volume, datiAl, spell: v.spell ?? null });
  }
  return letti;
}

function leggiTaskSerp(keyword: string, task: Task): SerpGrezza {
  if (task.status_code === 40102 || !task.result?.length) {
    return { checkUrl: `https://www.google.it/search?q=${encodeURIComponent(keyword)}&hl=it&gl=it`, vuota: true, organici: [], localPack: [], aiOverview: false, annunci: 0, localServices: false };
  }
  const r = RisultatoSerpSchema.safeParse(task.result[0]);
  if (!r.success) throw new ErroreDfs("forma", percorsoZod("tasks[0].result[0]", r.error));
  const items = r.data.items ?? [];
  const organici: SerpGrezza["organici"] = [];
  const localPack: SerpGrezza["localPack"] = [];
  for (const [i, item] of items.entries()) {
    if (item.type === "organic") {
      const x = OrganicoSchema.safeParse(item);
      if (!x.success) throw new ErroreDfs("forma", percorsoZod(`tasks[0].result[0].items[${i}]`, x.error));
      organici.push({ rankAbsolute: x.data.rank_absolute, dominio: x.data.domain, url: x.data.url, titolo: x.data.title ?? "" });
    } else if (item.type === "local_pack") {
      const x = LocalPackSchema.safeParse(item);
      if (!x.success) throw new ErroreDfs("forma", percorsoZod(`tasks[0].result[0].items[${i}]`, x.error));
      localPack.push({ dominio: x.data.domain ?? null, pagata: x.data.is_paid === true });
    }
  }
  return {
    checkUrl: r.data.check_url,
    vuota: organici.length === 0,
    organici,
    localPack,
    aiOverview: items.some((x) => x.type === "ai_overview"),
    annunci: items.filter((x) => x.type === "paid").length,
    localServices: items.some((x) => x.type === "local_services"),
  };
}

export type ClientDfs = ReturnType<typeof creaClientDfs>;

export function creaClientDfs(o: OpzioniDfs = {}) {
  const t: Trasporto = o.trasporto ?? { fetch: (u, i) => fetch(u, i), getSecret };
  const dirRegistrate = o.registrate === undefined ? process.env.SF_DATAFORSEO_REGISTRATE || null : o.registrate;
  const registrate = dirRegistrate ? path.resolve(dirRegistrate) : null;
  const fetchUsato = registrate ? fetchRegistrato(registrate) : t.fetch;
  const cacheBase = o.cacheDir ?? (process.env.SF_DATAFORSEO_CACHE || CACHE_PREDEFINITA);
  const cacheDir = registrate ? path.join(cacheBase, "registrate") : cacheBase;
  const attendi = o.attendi ?? attesaReale;
  const adesso = o.adesso ?? (() => new Date());
  const stat = { costoUsd: 0, chiamatePagate: 0, dallaCache: 0 };
  let ultimaAds = 0;

  const credenziali = (): { basic: string; segreti: string[] } | null => {
    if (registrate) return { basic: "", segreti: [] };
    const login = t.getSecret("DATAFORSEO_LOGIN");
    const password = t.getSecret("DATAFORSEO_PASSWORD");
    if (!login || !password) return null;
    const basic = Buffer.from(`${login}:${password}`).toString("base64");
    return { basic, segreti: [login, password, basic] };
  };

  const fileCache = (endpoint: string, sha: string) => path.join(cacheDir, endpoint.replace(/\//g, "_"), `${sha}.json`);
  function leggiCache(endpoint: keyof typeof TTL_MS, sha: string): VoceCache | null {
    try {
      const v = JSON.parse(fs.readFileSync(fileCache(endpoint, sha), "utf8")) as VoceCache;
      const eta = adesso().getTime() - Date.parse(v.lettoAt);
      return Number.isFinite(eta) && eta >= 0 && eta <= TTL_MS[endpoint] ? v : null;
    } catch {
      return null;
    }
  }

  /** Voce di cache fresca che il lettore del task accetta; una voce fuori forma vale come assente (si richiede e si riscrive). */
  function vocePronta<T>(endpoint: EndpointPagato, sha: string, leggi: (task: Task) => T): { dati: T; voce: VoceCache } | null {
    const voce = leggiCache(endpoint, sha);
    if (!voce) return null;
    try {
      return { dati: leggi(voce.risposta as Task), voce };
    } catch {
      return null;
    }
  }

  function registraCosto(riga: RigaCosto): void {
    if (!o.costi) return;
    const r = RigaCostoSchema.parse(riga);
    const dir = path.dirname(o.costi.file);
    // Solo l'ultima cartella (traffico/): un cliente eliminato a calcolo in corso non rinasce dalle chiamate già partite.
    if (!fs.existsSync(path.dirname(dir))) return;
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(o.costi.file, JSON.stringify(r) + "\n");
  }

  /** Una chiamata HTTP: busta letta o ErroreDfs. Mai credenziali nei messaggi. */
  async function chiama(metodo: "GET" | "POST", endpoint: string, corpo: unknown): Promise<{ busta: Busta; http: number }> {
    const cred = credenziali();
    if (!cred) throw new ErroreDfs("auth", "DataForSEO non configurata: servono login e password in Impostazioni → Chiavi API.");
    const segnali = [AbortSignal.timeout(TIMEOUT_MS), ...(o.signal ? [o.signal] : [])];
    let r: Response;
    try {
      r = await fetchUsato(`${BASE_URL}${endpoint}`, {
        method: metodo,
        headers: { ...(cred.basic ? { Authorization: `Basic ${cred.basic}` } : {}), ...(corpo ? { "Content-Type": "application/json" } : {}) },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
        signal: AbortSignal.any(segnali),
      });
    } catch (e) {
      if (o.signal?.aborted) throw o.signal.reason ?? e;
      const nome = e instanceof Error ? e.name : "";
      const msg = nome === "TimeoutError" ? `DataForSEO non ha risposto entro ${TIMEOUT_MS / 1000} s: riprova più tardi.` : "DataForSEO non raggiungibile: controlla la connessione e riprova.";
      throw new ErroreDfs("servizio", redigi(msg, ...cred.segreti), 0);
    }
    let json: unknown = null;
    try {
      json = JSON.parse(await r.text());
    } catch {
      /* corpo non JSON: deciso sotto */
    }
    // Prima il codice (anche su un corpo incompleto), poi la forma della busta.
    const grezzo = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    const err = erroreDaCodice(r.status, typeof grezzo.status_code === "number" ? grezzo.status_code : null, grezzo.status_message);
    if (err) throw new ErroreDfs(err.tipo, redigi(err.message, ...cred.segreti), err.codice);
    const busta = BustaSchema.safeParse(json);
    if (!busta.success) throw new ErroreDfs("forma", redigi(percorsoZod("risposta", busta.error), ...cred.segreti));
    return { busta: busta.data, http: r.status };
  }

  /**
   * Chiamata pagata con tentativi, spaziatura Google Ads, riga di costo per ogni tentativo partito e cache. `leggi` valida
   * il task e ne estrae i dati (ErroreDfs «forma» se fuori forma): in cache va solo un task letto, e una voce di cache che
   * non si legge vale come assente (vocePronta, la stessa regola della stima).
   */
  async function pagata<T>(endpoint: EndpointPagato, corpo: unknown[], voci: number, taskOk: (codice: number) => boolean, leggi: (task: Task) => T): Promise<{ dati: T; fonte: Fonte; dallaCache: boolean }> {
    const sha = chiaveRichiesta(endpoint, corpo);
    const pronta = vocePronta(endpoint, sha, leggi);
    if (pronta) {
      stat.dallaCache += 1;
      return { dati: pronta.dati, fonte: { endpoint, richiestaSha: sha, lettoAt: pronta.voce.lettoAt, costoUsd: pronta.voce.costoUsd }, dallaCache: true };
    }
    for (let tentativo = 1; ; tentativo++) {
      // Spaziatura solo al primo tentativo: le attese dei tentativi (≥ 5 s) la coprono già.
      if (endpoint === EP_VOLUMI && !registrate && tentativo === 1) {
        const attesa = ultimaAds + SPAZIO_ADS_MS - Date.now();
        if (ultimaAds && attesa > 0) await attendi(attesa, o.signal);
        ultimaAds = Date.now();
      }
      // Già fermato: il tentativo non parte (e non lascia una riga di costo).
      o.signal?.throwIfAborted();
      const inizio = Date.now();
      const at = adesso().toISOString();
      let costo = 0;
      let codice = 0;
      try {
        const { busta, http } = await chiama("POST", endpoint, corpo);
        const task = busta.tasks?.[0];
        costo = task?.cost ?? busta.cost ?? 0;
        codice = task?.status_code ?? busta.status_code ?? http;
        if (!task) throw new ErroreDfs("forma", "Risposta DataForSEO inattesa in tasks: nessun task");
        if (!taskOk(task.status_code)) {
          const err = erroreDaCodice(200, task.status_code, task.status_message)!;
          throw err;
        }
        const dati = leggi(task);
        registraCosto({ at, lavoro: o.costi?.lavoro ?? "mappa", endpoint, task: 1, voci, costoUsd: costo, statusCode: codice, esito: "ok", durataMs: Date.now() - inizio });
        stat.costoUsd += costo;
        stat.chiamatePagate += 1;
        const lettoAt = adesso().toISOString();
        scriviAtomico(fileCache(endpoint, sha), JSON.stringify({ richiesta: { endpoint, corpo }, lettoAt, costoUsd: costo, risposta: task } satisfies VoceCache));
        return { dati, fonte: { endpoint, richiestaSha: sha, lettoAt, costoUsd: costo }, dallaCache: false };
      } catch (e) {
        if (e instanceof ErroreDfs) codice = e.codice ?? codice;
        // Anche un tentativo interrotto dallo stop lascia la sua riga: DataForSEO addebita comunque un task partito
        // (costo e codice non noti: 0), così il registro resta confrontabile col saldo.
        registraCosto({ at, lavoro: o.costi?.lavoro ?? "mappa", endpoint, task: 1, voci, costoUsd: costo, statusCode: codice, esito: "errore", durataMs: Date.now() - inizio });
        stat.costoUsd += costo;
        stat.chiamatePagate += 1;
        if (o.signal?.aborted) throw o.signal.reason ?? e;
        if (e instanceof ErroreDfs && (e.tipo === "limite" || e.tipo === "servizio") && tentativo < TENTATIVI) {
          await attendi(ATTESE_MS[tentativo - 1] ?? ATTESE_MS[ATTESE_MS.length - 1], o.signal);
          continue;
        }
        throw e;
      }
    }
  }

  async function leggiSaldo(): Promise<number> {
    const { busta } = await chiama("GET", EP_SALDO, null);
    const r = SaldoSchema.safeParse(busta.tasks?.[0]?.result?.[0]);
    if (!r.success) throw new ErroreDfs("forma", percorsoZod("tasks[0].result[0]", r.error));
    return r.data.money.balance;
  }

  return {
    /** true con le risposte registrate: la mappa lo scrive (`ingressi.registrate`) e la UI lo dice. */
    registrate: !!registrate,
    configurata: (): boolean => credenziali() !== null,
    statistiche: () => ({ ...stat, costoUsd: Math.round(stat.costoUsd * 10000) / 10000 }),

    /** Stima del costo prima di spendere: true solo se volumi() e serp() userebbero la cache (fresca e leggibile), non la pagherebbero. */
    volumiInCache: (keywords: readonly string[], locationCode: number): boolean => vocePronta(EP_VOLUMI, chiaveRichiesta(EP_VOLUMI, corpoVolumi(keywords, locationCode)), leggiTaskVolumi) !== null,
    serpInCache: (keyword: string, coordinate: string): boolean => vocePronta(EP_SERP, chiaveRichiesta(EP_SERP, corpoSerp(keyword, coordinate)), (task) => leggiTaskSerp(keyword, task)) !== null,

    /** Saldo in dollari (user_data, gratuito, mai in cache). */
    saldo: leggiSaldo,

    /** Prima di spendere: saldo almeno doppio della stima, altrimenti errore «credito» senza chiamate pagate. Ritorna il saldo. */
    async assicuraSaldo(stimaUsd: number): Promise<number> {
      const saldo = await leggiSaldo();
      if (saldo < 2 * stimaUsd) {
        throw new ErroreDfs("credito", `Credito DataForSEO insufficiente: saldo ${saldo.toFixed(2)} $, servono almeno ${(2 * stimaUsd).toFixed(2)} $ (il doppio della stima): ricarica e rilancia.`);
      }
      return saldo;
    },

    /** Località Google Ads d'Italia (gratuite, cache 30 giorni). */
    async localitaIT(): Promise<Localita[]> {
      const sha = chiaveRichiesta(EP_LOCALITA, null);
      const c = leggiCache(EP_LOCALITA, sha);
      let result: unknown = c?.risposta;
      if (!c) {
        const { busta } = await chiama("GET", EP_LOCALITA, null);
        result = busta.tasks?.[0]?.result ?? null;
        const ok = z.array(LocalitaSchema).safeParse(result);
        if (!ok.success) throw new ErroreDfs("forma", percorsoZod("tasks[0].result", ok.error));
        scriviAtomico(fileCache(EP_LOCALITA, sha), JSON.stringify({ richiesta: { endpoint: EP_LOCALITA, corpo: null }, lettoAt: adesso().toISOString(), costoUsd: 0, risposta: result } satisfies VoceCache));
      }
      const ok = z.array(LocalitaSchema).safeParse(result);
      if (!ok.success) throw new ErroreDfs("forma", percorsoZod("tasks[0].result", ok.error));
      return ok.data;
    },

    /** Volumi Google Ads di ≤ 1.000 keyword in una località (un task Live). */
    async volumi(keywords: readonly string[], locationCode: number): Promise<EsitoVolumi> {
      const { dati: risultati, fonte, dallaCache } = await pagata(EP_VOLUMI, corpoVolumi(keywords, locationCode), keywords.length, (c) => c === 20000, leggiTaskVolumi);
      return { risultati, fonte, dallaCache };
    },

    /** Pagina di Google da mobile per una ricerca e un punto (un task Live, primi 10 risultati, AI Overview). */
    async serp(keyword: string, coordinate: string): Promise<EsitoSerp> {
      const { dati: grezza, fonte, dallaCache } = await pagata(EP_SERP, corpoSerp(keyword, coordinate), 1, (c) => c === 20000 || c === 40102, (task) => leggiTaskSerp(keyword, task));
      return { grezza, fonte, dallaCache };
    },
  };
}
