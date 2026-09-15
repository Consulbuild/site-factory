// Zone servite dal form lead (piano docs/traffico/piano-T3.md; sopra il piano valgono
// docs/traffico/decisioni-piani.md «Priorità assoluta» e T3 punti 12-14).
//
// Il cliente sceglie le zone nel form lead (site-intake, passo «In quali zone lavori?»). Qui
// quelle etichette si traducono in modo deterministico in comuni, dintorni, province, regioni o
// Italia col dataset T6a (site-renderer/data/comuni-fatti.json, confini Istat al 1° gennaio 2026)
// e con l'elenco delle province del form (site-intake/public/data/province.json: la stessa tabella
// che ha scritto le etichette). Nessuna AI, nessuna rete, nessuna lettura della prosa Tally.
//
// Senza file la card mostra la PROPOSTA calcolata dal lead in lettura; out/<slug>/traffico/
// zone-servite.json nasce solo da un salvataggio dell'operatore. Una proposta con tutte le
// etichette tradotte e nessuna nota è già usabile (decisione 14): l'operatore serve solo per ciò
// che va controllato o impostato, o quando il lead cambia dopo un salvataggio.
//
// Unica porta per i consumatori (T4, G1, T5a, T2b/T8): leggiZoneServite → zoneUsabili →
// comuniServiti / areeServite / etichettaArea / regioneDiSigla. Mai il JSON letto a mano.
//
// Turbopack non importa fuori dalla radice dell'editor: confini delle regioni, ricerca per nome e
// distanza sono COPIE di site-intake/src/data/regioni.ts e site-renderer/src/lib/fatti-comuni.ts;
// il banco scripts/test-zone-servite.ts ne verifica la parità. Import con estensione e niente
// alias «@/»: il banco gira con `node --experimental-strip-types`.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { REPO_ROOT } from "./paths.ts";

/* ---------- costanti (calibrazione: piano-T3.md § Calibrazione) ---------- */

/** Raggio in linea d'aria di «X e dintorni» (decisione 14: 20 km, 15 se una sede di calibrazione supera 150 comuni). */
export const RAGGIO_DINTORNI_KM = 20;
export const MAX_ETICHETTE = 60;
export const MAX_CARATTERI = 120;
export const FILE_ZONE = "traffico/zone-servite.json";

export interface PercorsiDati {
  dataset: string;
  province: string;
}
export const PERCORSI_DATI: PercorsiDati = {
  dataset: path.join(REPO_ROOT, "site-renderer", "data", "comuni-fatti.json"),
  province: path.join(REPO_ROOT, "site-intake", "public", "data", "province.json"),
};

/** Frasi del blocco dei consumatori (T4, G1): le stesse che la card dice all'operatore. */
export const MOTIVO_DA_CONTROLLARE = "Zone servite da controllare: confermale o correggile nel dettaglio Traffico";
export const MOTIVO_DA_IMPOSTARE = "Zone servite da impostare nel dettaglio Traffico";
export const MOTIVO_LEAD_CAMBIATO = "Il form lead è cambiato dopo il salvataggio delle zone servite: rivedile nel dettaglio Traffico";

/* ---------- tabelle ---------- */

export interface Regione {
  codice: string;
  nome: string;
  confini: readonly string[];
}

/** Codici Istat (Reg01012026) e confinanti via terra: specchio di CONFINI in site-intake/src/data/regioni.ts. */
export const REGIONI: readonly Regione[] = [
  { codice: "01", nome: "Piemonte", confini: ["Valle d'Aosta/Vallée d'Aoste", "Lombardia", "Liguria", "Emilia-Romagna"] },
  { codice: "02", nome: "Valle d'Aosta/Vallée d'Aoste", confini: ["Piemonte"] },
  { codice: "03", nome: "Lombardia", confini: ["Piemonte", "Emilia-Romagna", "Veneto", "Trentino-Alto Adige/Südtirol"] },
  { codice: "04", nome: "Trentino-Alto Adige/Südtirol", confini: ["Lombardia", "Veneto"] },
  { codice: "05", nome: "Veneto", confini: ["Trentino-Alto Adige/Südtirol", "Lombardia", "Emilia-Romagna", "Friuli-Venezia Giulia"] },
  { codice: "06", nome: "Friuli-Venezia Giulia", confini: ["Veneto"] },
  { codice: "07", nome: "Liguria", confini: ["Piemonte", "Emilia-Romagna", "Toscana"] },
  { codice: "08", nome: "Emilia-Romagna", confini: ["Piemonte", "Lombardia", "Veneto", "Liguria", "Toscana", "Marche"] },
  { codice: "09", nome: "Toscana", confini: ["Liguria", "Emilia-Romagna", "Marche", "Umbria", "Lazio"] },
  { codice: "10", nome: "Umbria", confini: ["Toscana", "Marche", "Lazio"] },
  { codice: "11", nome: "Marche", confini: ["Emilia-Romagna", "Toscana", "Umbria", "Lazio", "Abruzzo"] },
  { codice: "12", nome: "Lazio", confini: ["Toscana", "Umbria", "Marche", "Abruzzo", "Molise", "Campania"] },
  { codice: "13", nome: "Abruzzo", confini: ["Marche", "Lazio", "Molise"] },
  { codice: "14", nome: "Molise", confini: ["Abruzzo", "Lazio", "Campania", "Puglia"] },
  { codice: "15", nome: "Campania", confini: ["Lazio", "Molise", "Puglia", "Basilicata"] },
  { codice: "16", nome: "Puglia", confini: ["Molise", "Campania", "Basilicata"] },
  { codice: "17", nome: "Basilicata", confini: ["Campania", "Puglia", "Calabria"] },
  { codice: "18", nome: "Calabria", confini: ["Basilicata"] },
  { codice: "19", nome: "Sicilia", confini: [] },
  { codice: "20", nome: "Sardegna", confini: [] },
];

/** Il nome come lo dice la gente (lo stesso del form): «Trentino-Alto Adige/Südtirol» → «Trentino-Alto Adige». */
export const nomeBreveRegione = (nome: string): string => nome.split("/")[0] ?? nome;

interface VoceProvincia {
  sigla: string;
  nome: string;
  regione: string;
}

/**
 * Province sarde nate col riordino in vigore dal 1° gennaio 2026 (Istat, ProvCM01012026):
 * province.json del form è precedente e non le ha (ha ancora «Sud Sardegna», soppressa).
 */
const PROVINCE_SARDE_2026: readonly VoceProvincia[] = [
  { sigla: "CI", nome: "Sulcis Iglesiente", regione: "Sardegna" },
  { sigla: "VS", nome: "Medio Campidano", regione: "Sardegna" },
  { sigla: "OG", nome: "Ogliastra", regione: "Sardegna" },
  { sigla: "OT", nome: "Gallura Nord-Est Sardegna", regione: "Sardegna" },
];
/** Province sarde che esistevano già ma hanno confini diversi dal 1° gennaio 2026. */
const CONFINI_SARDI_CAMBIATI = new Set(["SS", "NU", "OR", "CA"]);

const REGIONE_PER_NOME = new Map(REGIONI.map((r) => [r.nome, r]));

/* ---------- nomi ---------- */

/** Copia di normalizzaNome (fatti-comuni.ts): senza accenti, maiuscola, apostrofi/trattini/punti come spazi. */
export function normalizza(nome: string): string {
  return nome
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[’'`´\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stessa pulizia del form (site-intake/src/lib/validators.ts `pulisci`). */
const pulisci = (s: string): string => s.replace(/\s+/g, " ").trim();

const REGIONE_PER_CHIAVE = new Map<string, Regione>();
for (const r of REGIONI) for (const n of [r.nome, ...r.nome.split("/")]) REGIONE_PER_CHIAVE.set(normalizza(n), r);

/* ---------- dati (dataset T6a + province del form), memoizzati per mtime ---------- */

export class ErroreDati extends Error {}

const SIGLA = z.string().regex(/^[A-Z]{2}$/);
const RecordComuneSchema = z.object({
  nome: z.string().min(1),
  sigla: SIGLA,
  nomeAltraLingua: z.string().optional(),
  nomiPrecedenti: z.array(z.string()).optional(),
  siglePrecedenti: z.array(z.string()).optional(),
  centro: z.tuple([z.number(), z.number()]),
  popolazione: z.number().int().nonnegative().optional(),
});
const DatasetSchema = z.object({
  schema: z.literal(1),
  riferimentoTerritoriale: z.string(),
  alias: z.record(z.string(), z.object({ a: z.string() })),
  comuni: z.record(z.string().regex(/^\d{6}$/), RecordComuneSchema),
});
const ProvinceSchema = z.array(z.object({ sigla: SIGLA, nome: z.string().min(1), regione: z.string() })).min(1);

type RecordComune = z.infer<typeof RecordComuneSchema>;

interface Provincia {
  sigla: string;
  nome: string;
  /** 3 cifre: il prefisso dei codici dei suoi comuni (per le città metropolitane non è il codice UTS). */
  codice: string;
  regione: string;
}

export interface Dati {
  riferimento: string;
  comuni: Record<string, RecordComune>;
  alias: Record<string, { a: string }>;
  /** Nome normalizzato (attuale, nell'altra lingua, solo italiano o precedente) → codici. */
  perNome: Map<string, string[]>;
  province: Map<string, Provincia>;
  /** Sigle del form senza comuni nel dataset 2026 (Sud Sardegna) → nome. */
  soppresse: Map<string, string>;
  provinciaPerNome: Map<string, string>;
  sigleDiRegione: Map<string, string[]>;
}

function leggiJson(file: string, cosa: string, rimedio = ""): unknown {
  let testo: string;
  try {
    testo = fs.readFileSync(file, "utf8");
  } catch (e) {
    throw new ErroreDati(`${cosa} non leggibile (${(e as NodeJS.ErrnoException).code ?? String(e)}): ${file}${rimedio}`);
  }
  try {
    return JSON.parse(testo);
  } catch {
    throw new ErroreDati(`${cosa} non è JSON valido: ${file}${rimedio}`);
  }
}

/** province.json è generato e fuori da git (site-intake/.gitignore): manca su un checkout pulito finché site-intake non parte. */
const RIGENERA_PROVINCE = " — si rigenera con «npm run comuni» in site-intake";

const problemi = (e: z.ZodError): string =>
  e.issues
    .slice(0, 3)
    .map((i) => `${i.path.join(".") || "radice"}: ${i.message}`)
    .join("; ");

/** Nomi di ricerca di un comune: stessa regola di cercaComune in fatti-comuni.ts. */
function nomiAttuali(r: RecordComune): string[] {
  // «San Dorligo della Valle-Dolina» con nome nell'altra lingua «Dolina» → anche «San Dorligo della Valle»
  const soloItaliano = r.nomeAltraLingua && r.nome.endsWith(`-${r.nomeAltraLingua}`) ? [r.nome.slice(0, -r.nomeAltraLingua.length - 1)] : [];
  return [r.nome, ...r.nome.split("/"), ...(r.nomeAltraLingua ? [r.nomeAltraLingua] : []), ...soloItaliano];
}
const nomiPrecedenti = (r: RecordComune): string[] => (r.nomiPrecedenti ?? []).flatMap((n) => n.split("/").concat(n));

function costruisci(rawDataset: unknown, rawProvince: unknown, p: PercorsiDati): Dati {
  const schema = (rawDataset as { schema?: unknown } | null)?.schema;
  if (schema !== 1) throw new ErroreDati(`dataset dei comuni con schema ${String(schema)} non supportato (atteso 1): ${p.dataset}`);
  const ds = DatasetSchema.safeParse(rawDataset);
  if (!ds.success) throw new ErroreDati(`dataset dei comuni fuori schema (${problemi(ds.error)}): ${p.dataset}`);
  const pr = ProvinceSchema.safeParse(rawProvince);
  if (!pr.success) throw new ErroreDati(`elenco delle province fuori schema (${problemi(pr.error)}): ${p.province}`);

  const { comuni } = ds.data;
  const perNome = new Map<string, string[]>();
  const prefissi = new Map<string, Set<string>>();
  for (const [codice, r] of Object.entries(comuni)) {
    for (const chiave of new Set([...nomiAttuali(r), ...nomiPrecedenti(r)].map(normalizza))) {
      if (!chiave) continue;
      const l = perNome.get(chiave);
      if (l) l.push(codice);
      else perNome.set(chiave, [codice]);
    }
    const s = prefissi.get(r.sigla) ?? new Set<string>();
    s.add(codice.slice(0, 3));
    prefissi.set(r.sigla, s);
  }

  const province = new Map<string, Provincia>();
  const soppresse = new Map<string, string>();
  const provinciaPerNome = new Map<string, string>();
  for (const v of [...pr.data, ...PROVINCE_SARDE_2026]) {
    if (!REGIONE_PER_NOME.has(v.regione)) throw new ErroreDati(`elenco delle province: regione sconosciuta «${v.regione}» per ${v.sigla}: ${p.province}`);
    const pref = prefissi.get(v.sigla);
    if (!pref) soppresse.set(v.sigla, v.nome);
    else if (pref.size !== 1) throw new ErroreDati(`dataset dei comuni: la sigla ${v.sigla} ha più codici di provincia (${[...pref].join(", ")})`);
    else province.set(v.sigla, { sigla: v.sigla, nome: v.nome, codice: [...pref][0]!, regione: v.regione });
    for (const n of [v.nome, ...v.nome.split("/")]) provinciaPerNome.set(normalizza(n), v.sigla);
  }
  for (const s of prefissi.keys()) {
    if (!province.has(s)) throw new ErroreDati(`dataset dei comuni: la sigla ${s} non ha una provincia nell'elenco (${p.province}) né tra le province sarde 2026`);
  }
  const sigleDiRegione = new Map<string, string[]>();
  for (const pv of province.values()) sigleDiRegione.set(pv.regione, [...(sigleDiRegione.get(pv.regione) ?? []), pv.sigla]);

  return { riferimento: ds.data.riferimentoTerritoriale, comuni, alias: ds.data.alias, perNome, province, soppresse, provinciaPerNome, sigleDiRegione };
}

let memo: { chiave: string; dati: Dati } | null = null;

/** Legge e indicizza dataset e province (una volta per versione dei file). Lancia ErroreDati con un messaggio leggibile. */
export function caricaDati(p: PercorsiDati = PERCORSI_DATI): Dati {
  const stat = (f: string) => {
    try {
      const s = fs.statSync(f);
      return `${s.mtimeMs}:${s.size}`;
    } catch {
      return "assente";
    }
  };
  const chiave = `${p.dataset}|${stat(p.dataset)}|${p.province}|${stat(p.province)}`;
  if (memo?.chiave === chiave) return memo.dati;
  const dati = costruisci(leggiJson(p.dataset, "dataset dei comuni"), leggiJson(p.province, "elenco delle province", RIGENERA_PROVINCE), p);
  memo = { chiave, dati };
  return dati;
}

/* ---------- ricerca e distanza (copie di fatti-comuni.ts) ---------- */

/** Codici dei comuni con quel nome normalizzato e, se data, la sigla attuale o precedente. */
function candidati(d: Dati, chiave: string, sigla?: string): string[] {
  return (d.perNome.get(chiave) ?? []).filter((c) => {
    const r = d.comuni[c]!;
    return !sigla || r.sigla === sigla || !!r.siglePrecedenti?.includes(sigla);
  });
}

/** Specchio di cercaComune (fatti-comuni.ts): stessi candidati, stesso ordine. */
export function cercaComune(nome: string, sigla: string | undefined, d: Dati): { codice: string; nome: string; sigla: string }[] {
  const chiave = normalizza(nome);
  if (!chiave) return [];
  return candidati(d, chiave, sigla?.trim().toUpperCase() || undefined)
    .map((codice) => ({ codice, nome: d.comuni[codice]!.nome, sigla: d.comuni[codice]!.sigla }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it") || a.sigla.localeCompare(b.sigla));
}

const RAGGIO_TERRA_KM = 6371.0088;
function haversineKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * RAGGIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

/** Codice attuale (anche da un codice soppresso via alias, un livello come fatti-comuni.ts); null se ignoto. */
function risolviCodice(d: Dati, codice: string): string | null {
  if (d.comuni[codice]) return codice;
  const a = d.alias[codice];
  return a && d.comuni[a.a] ? a.a : null;
}

/** Specchio di comuniEntroKm (fatti-comuni.ts): km interi in linea d'aria, sede compresa. */
export function comuniEntroKm(codice: string, km: number, d: Dati): { codice: string; km: number }[] {
  const c = risolviCodice(d, codice);
  if (!c || !Number.isFinite(km) || km < 0) return [];
  const centro = d.comuni[c]!.centro;
  const out: { codice: string; km: number }[] = [];
  for (const [k, r] of Object.entries(d.comuni)) {
    const dist = Math.round(haversineKm(centro, r.centro));
    if (dist <= km) out.push({ codice: k, km: dist });
  }
  return out;
}

/* ---------- contratto dell'artifact ---------- */

const CODICE_COMUNE = z.string().regex(/^\d{6}$/);
const AreaSchema = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("comune"), codice: CODICE_COMUNE, nome: z.string().min(1), sigla: SIGLA }),
  z.strictObject({ tipo: z.literal("dintorni"), codice: CODICE_COMUNE, nome: z.string().min(1), sigla: SIGLA, raggioKm: z.number().int().min(1).max(100) }),
  z.strictObject({ tipo: z.literal("provincia"), codice: z.string().regex(/^\d{3}$/), sigla: SIGLA, nome: z.string().min(1) }),
  z.strictObject({ tipo: z.literal("regione"), codice: z.string().regex(/^\d{2}$/), nome: z.string().min(1) }),
  z.strictObject({ tipo: z.literal("italia") }),
]);
const EtichettaSalvataSchema = z.strictObject({
  testo: z.string().min(1).max(MAX_CARATTERI),
  origine: z.enum(["sede", "zona"]),
  provenienza: z.enum(["lead", "operatore"]),
  aree: z.array(AreaSchema),
  // Un file salvato non contiene etichette non riconosciute (le rifiuta il salvataggio).
  esito: z.enum(["tradotta", "da_controllare"]),
  nota: z.string().min(1).optional(),
});
export const ZoneServiteSchema = z
  .strictObject({
    versione: z.literal(1),
    lead: z.strictObject({
      fonte: z.enum(["form", "tally", "assente"]),
      impronta: z.string().regex(/^[0-9a-f]{64}$/),
      etichette: z.array(z.string().max(MAX_CARATTERI)).max(MAX_ETICHETTE),
    }),
    sede: z.strictObject({ codice: CODICE_COMUNE, nome: z.string().min(1), sigla: SIGLA }).nullable(),
    etichette: z.array(EtichettaSalvataSchema).min(1).max(MAX_ETICHETTE),
    confermateAt: z.iso.datetime(),
  })
  .refine((v) => v.etichette.some((e) => e.aree.length > 0), { message: "nessuna area", path: ["etichette"] });

export type Area = z.infer<typeof AreaSchema>;
export type ZoneServite = z.infer<typeof ZoneServiteSchema>;
export type Esito = "tradotta" | "da_controllare" | "non_riconosciuta";
export type Etichetta = Omit<ZoneServite["etichette"][number], "esito"> & { esito: Esito };
/** Proposta dal lead (confermateAt null, può avere etichette non riconosciute) o file salvato. */
export type Zone = Omit<ZoneServite, "etichette" | "confermateAt"> & { etichette: Etichetta[]; confermateAt: string | null };
export type FonteLead = ZoneServite["lead"]["fonte"];
export type EsitoProposta = "riconosciute" | "da_controllare" | "da_impostare";

/* ---------- traduzione delle etichette (piano §2, senza le righe 9-10: decisione 14) ---------- */

interface Traduzione {
  aree: Area[];
  esito: Esito;
  nota?: string;
}
const traduzione = (esito: Esito, aree: Area[], nota?: string): Traduzione => (nota ? { aree, esito, nota } : { aree, esito });
const nonRiconosciuta = (nota: string): Traduzione => ({ aree: [], esito: "non_riconosciuta", nota });

const conSigla = (nome: string, sigla: string) => `${nome} (${sigla})`;
const elencoO = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} o ${xs[xs.length - 1]}`);

export interface ContestoSede {
  /** Nome del form e nome 2026 della sede, normalizzati: «{sede} e dintorni» li riconosce. */
  chiavi: Set<string>;
  area: Extract<Area, { tipo: "comune" }>;
}

const areaComune = (d: Dati, codice: string): Extract<Area, { tipo: "comune" }> => ({ tipo: "comune", codice, nome: d.comuni[codice]!.nome, sigla: d.comuni[codice]!.sigla });
const areaRegione = (r: Regione): Area => ({ tipo: "regione", codice: r.codice, nome: r.nome });
const areaProvincia = (p: Provincia): Area => ({ tipo: "provincia", codice: p.codice, sigla: p.sigla, nome: p.nome });

/** Il nome scritto è un nome precedente (fusione, cambio di nome): la nota dice quello di oggi. */
const notaNomeCambiato = (d: Dati, codice: string, chiave: string): string | undefined => {
  const r = d.comuni[codice]!;
  return nomiAttuali(r).some((n) => normalizza(n) === chiave) ? undefined : `oggi è ${conSigla(r.nome, r.sigla)}`;
};

function suggerisciProvince(d: Dati, chiave: string): string {
  const primo = chiave.split(" ")[0] ?? "";
  if (primo.length < 3) return "";
  const nomi = [...d.province.values()].filter((p) => normalizza(p.nome).startsWith(primo)).map((p) => p.nome);
  return nomi.length ? `: forse ${elencoO(nomi.sort((a, b) => a.localeCompare(b, "it")))}` : "";
}

function suggerisciRegioni(chiave: string): string {
  const primo = chiave.split(" ")[0] ?? "";
  if (primo.length < 3) return "";
  const nomi = REGIONI.map((r) => nomeBreveRegione(r.nome)).filter((n) => normalizza(n).startsWith(primo));
  return nomi.length ? `: forse ${elencoO(nomi)}` : "";
}

function traduciComune(d: Dati, chiave: string, sigla: string | undefined, raggioKm: number | null): Traduzione {
  const cand = candidati(d, chiave, sigla);
  if (cand.length === 0) {
    return nonRiconosciuta(sigla ? `nessun comune con questo nome in provincia ${sigla} nell'elenco 2026` : "nessun comune con questo nome nell'elenco 2026");
  }
  if (cand.length > 1) {
    const nomi = cand.map((c) => conSigla(d.comuni[c]!.nome, d.comuni[c]!.sigla)).sort((a, b) => a.localeCompare(b, "it"));
    return nonRiconosciuta(`più comuni hanno questo nome: ${elencoO(nomi)}; scrivi per esempio «${nomi[0]}${raggioKm === null ? "" : " e dintorni"}»`);
  }
  const area = areaComune(d, cand[0]!);
  return traduzione("tradotta", [raggioKm === null ? area : { ...area, tipo: "dintorni", raggioKm }], notaNomeCambiato(d, cand[0]!, chiave));
}

function traduciProvincia(d: Dati, chiave: string, esito: "tradotta" | "da_controllare"): Traduzione {
  const sigla = d.provinciaPerNome.get(chiave);
  if (!sigla) return nonRiconosciuta(`nessuna provincia si chiama così${suggerisciProvince(d, chiave)}`);
  const soppressa = d.soppresse.get(sigla);
  if (soppressa) {
    const eredi = new Set<string>();
    for (const r of Object.values(d.comuni)) if (r.siglePrecedenti?.includes(sigla)) eredi.add(d.province.get(r.sigla)!.nome);
    return nonRiconosciuta(`la provincia ${soppressa} non esiste più dal 1° gennaio 2026: scegli le nuove (${[...eredi].sort((a, b) => a.localeCompare(b, "it")).join(", ")})`);
  }
  const p = d.province.get(sigla)!;
  const nota = CONFINI_SARDI_CAMBIATI.has(sigla)
    ? `confini cambiati dal 1° gennaio 2026 col riordino delle province sarde: oggi ${Object.values(d.comuni).filter((r) => r.sigla === sigla).length} comuni`
    : undefined;
  return traduzione(esito, [areaProvincia(p)], nota);
}

/** Nome esatto fuori dalla grammatica del form: regione, altrimenti comune unico, altrimenti provincia. Sempre da controllare. */
function traduciNomeLibero(d: Dati, chiave: string): Traduzione {
  const regione = REGIONE_PER_CHIAVE.get(chiave);
  const comuni = candidati(d, chiave);
  if (regione) {
    const nota = comuni.length === 1 ? `è anche il nome di un comune: per il solo comune scrivi «${conSigla(d.comuni[comuni[0]!]!.nome, d.comuni[comuni[0]!]!.sigla)}»` : undefined;
    return traduzione("da_controllare", [areaRegione(regione)], nota);
  }
  const sigla = d.provinciaPerNome.get(chiave);
  if (comuni.length > 0) {
    const t = traduciComune(d, chiave, undefined, null);
    if (t.esito === "non_riconosciuta") return t;
    const note = [t.nota, sigla && d.province.has(sigla) ? `è anche una provincia: per tutta la provincia scrivi «Provincia di ${d.province.get(sigla)!.nome}»` : undefined].filter(Boolean);
    return traduzione("da_controllare", t.aree, note.join("; ") || undefined);
  }
  if (sigla) return traduciProvincia(d, chiave, "da_controllare");
  // Le forme riconosciute le elenca l'aiuto sotto il campo della card: qui solo il perché.
  return nonRiconosciuta(`nessun comune, provincia o regione si chiama così${suggerisciRegioni(chiave) || suggerisciProvince(d, chiave)}`);
}

function traduciParte(d: Dati, n: string, ctx: ContestoSede | null, raggioKm: number): Traduzione {
  if (n === "TUTTA ITALIA" || n === "TUTTA L ITALIA") return traduzione("tradotta", [{ tipo: "italia" }]);
  let m = /^TUTTA LA REGIONE (.+)$/.exec(n);
  if (m) {
    const r = REGIONE_PER_CHIAVE.get(m[1]!);
    return r ? traduzione("tradotta", [areaRegione(r)]) : nonRiconosciuta(`nessuna regione si chiama così${suggerisciRegioni(m[1]!)}`);
  }
  m = /^(.+) E REGIONI VICINE$/.exec(n);
  if (m) {
    const r = REGIONE_PER_CHIAVE.get(m[1]!);
    if (!r) return nonRiconosciuta(`nessuna regione si chiama così${suggerisciRegioni(m[1]!)}`);
    const vicine = r.confini.map((nome) => REGIONE_PER_NOME.get(nome)!);
    const breve = nomeBreveRegione(r.nome);
    return traduzione("tradotta", [r, ...vicine].map(areaRegione), vicine.length ? undefined : `${breve} non confina con altre regioni: resta solo ${breve}`);
  }
  m = /^PROVINCIA DI (.+)$/.exec(n) ?? /^(.+) E PROVINCIA$/.exec(n);
  if (m) return traduciProvincia(d, m[1]!, "tradotta");
  m = /^(.+) E DINTORNI$/.exec(n);
  if (m) {
    const conSiglaScritta = /^(.+) \(([A-Z]{2})\)$/.exec(m[1]!);
    if (!conSiglaScritta && ctx?.chiavi.has(m[1]!)) return traduzione("tradotta", [{ ...ctx.area, tipo: "dintorni", raggioKm }]);
    return traduciComune(d, conSiglaScritta ? conSiglaScritta[1]! : m[1]!, conSiglaScritta?.[2], raggioKm);
  }
  m = /^(.+) \(([A-Z]{2})\)$/.exec(n);
  if (m) return traduciComune(d, m[1]!, m[2], null);
  return traduciNomeLibero(d, n);
}

/**
 * Una etichetta → zero o più aree con esito e nota. Il testo del form si divide su «,» e «;»
 * (il campo «Aggiungi una zona» accetta testo libero, es. «Bergamo, Lombardia»): una parte non
 * riconosciuta rende non riconosciuta l'etichetta intera, mai un'area persa in silenzio.
 */
export function traduciEtichetta(testo: string, ctx: ContestoSede | null, d: Dati, raggioKm = RAGGIO_DINTORNI_KM): Traduzione {
  const pulito = pulisci(testo);
  if (!pulito) return nonRiconosciuta("zona vuota");
  if (pulito.length > MAX_CARATTERI) return nonRiconosciuta(`troppo lunga (${pulito.length} caratteri, massimo ${MAX_CARATTERI})`);
  const parti = pulito.split(/[,;]/).map((p) => normalizza(p)).filter(Boolean);
  if (parti.length === 0) return nonRiconosciuta("zona vuota");
  if (parti.length === 1) return traduciParte(d, parti[0]!, ctx, raggioKm);
  const esiti = parti.map((p) => traduciParte(d, p, ctx, raggioKm));
  const scartate = pulito.split(/[,;]/).map((p) => p.trim()).filter((p) => normalizza(p));
  const ignote = esiti.flatMap((e, i) => (e.esito === "non_riconosciuta" ? [`«${scartate[i]}»: ${e.nota}`] : []));
  if (ignote.length) return nonRiconosciuta(`scritta a mano in più parti; ${ignote.join("; ")}`);
  const note = esiti.flatMap((e, i) => (e.nota ? [`«${scartate[i]}» ${e.nota}`] : []));
  return traduzione("da_controllare", esiti.flatMap((e) => e.aree), [`scritta a mano in ${parti.length} parti`, ...note].join("; "));
}

/* ---------- lead ---------- */

interface Lead {
  fonte: FonteLead;
  /** sha256 di ciò che conta per le zone (zone + comune e sigla della sede): altri campi del lead non la cambiano. */
  impronta: string;
  etichette: string[];
  zone: unknown;
  sede: unknown;
}

const sha256 = (v: unknown) => crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const eOggetto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** raw-submission.json (scritto dall'import, lib/inbox-form.ts): form v4 = `risposte`, Tally = `responses`. Letto come JSON grezzo. */
function leggiLead(dir: string): Lead {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dir, "raw-submission.json"), "utf8"));
  } catch {
    raw = null;
  }
  if (eOggetto(raw) && eOggetto(raw.risposte)) {
    const { zone, sede } = raw.risposte;
    const sedeImpronta = eOggetto(sede) ? { comune: sede.comune ?? null, provincia: sede.provincia ?? null } : null;
    const etichette = Array.isArray(zone)
      ? zone
          .filter((z): z is string => typeof z === "string")
          .slice(0, MAX_ETICHETTE)
          .map((z) => z.slice(0, MAX_CARATTERI))
      : [];
    return { fonte: "form", impronta: sha256({ fonte: "form", zone: zone ?? null, sede: sedeImpronta }), etichette, zone, sede };
  }
  const fonte: FonteLead = eOggetto(raw) && Array.isArray(raw.responses) ? "tally" : "assente";
  return { fonte, impronta: sha256({ fonte }), etichette: [], zone: undefined, sede: undefined };
}

interface Proposta {
  zone: Zone;
  esito: EsitoProposta;
  /** Problemi del lead che non stanno in una etichetta (zone non in elenco, voci non testuali, sede assente). */
  avvisi: string[];
  ctx: ContestoSede | null;
  sede: { chiave: string; traduzione: Traduzione } | null;
}

const troncato = (s: string) => (s.length > MAX_CARATTERI ? `${s.slice(0, MAX_CARATTERI - 1)}…` : s);

function calcolaProposta(lead: Lead, d: Dati): Proposta {
  const avvisi: string[] = [];
  const etichette: Etichetta[] = [];
  const viste = new Set<string>();
  let ctx: ContestoSede | null = null;
  let sede: Proposta["sede"] = null;

  if (lead.fonte === "form") {
    const s = lead.sede;
    const comune = eOggetto(s) && typeof s.comune === "string" ? pulisci(s.comune) : "";
    if (!comune) {
      avvisi.push("il form lead non ha il comune della sede");
    } else {
      const sigla = eOggetto(s) && typeof s.provincia === "string" && /^[A-Za-z]{2}$/.test(s.provincia.trim()) ? s.provincia.trim().toUpperCase() : undefined;
      const testo = troncato(sigla ? conSigla(comune, sigla) : comune);
      const chiave = normalizza(comune);
      const cand = candidati(d, chiave, sigla);
      let t: Traduzione;
      if (cand.length === 1) {
        const area = areaComune(d, cand[0]!);
        ctx = { chiavi: new Set([chiave, normalizza(area.nome)]), area };
        const note = [notaNomeCambiato(d, cand[0]!, chiave), sigla ? undefined : `comune della sede scritto a mano nel form, senza provincia: controlla che sia ${conSigla(area.nome, area.sigla)}`].filter(Boolean);
        t = traduzione("tradotta", [area], note.join("; ") || undefined);
      } else if (cand.length === 0) {
        t = nonRiconosciuta("sede non trovata nell'elenco dei comuni 2026");
      } else {
        t = nonRiconosciuta(`sede ambigua: ${elencoO(cand.map((c) => conSigla(d.comuni[c]!.nome, d.comuni[c]!.sigla)))}`);
      }
      sede = { chiave: normalizza(testo), traduzione: t };
      viste.add(sede.chiave);
      etichette.push({ testo, origine: "sede", provenienza: "lead", ...t });
    }

    if (!Array.isArray(lead.zone)) {
      avvisi.push(lead.zone === undefined ? "il form lead non ha zone" : "le zone del form lead non sono un elenco: ignorate");
    } else {
      const testi = lead.zone.filter((z): z is string => typeof z === "string");
      if (testi.length < lead.zone.length) avvisi.push(`${lead.zone.length - testi.length} zone del form lead non sono testo: ignorate`);
      // La riga della sede conta nel massimo del file: la proposta resta salvabile così com'è.
      const posti = MAX_ETICHETTE - etichette.length;
      if (testi.length > posti) avvisi.push(`il form lead ha ${testi.length} zone: considerate le prime ${posti}${posti < MAX_ETICHETTE ? ` (con la sede, il massimo è ${MAX_ETICHETTE})` : ""}`);
      const vuote = testi.slice(0, posti).filter((z) => !pulisci(z)).length;
      if (vuote) avvisi.push(`${vuote} zone vuote nel form lead: ignorate`);
      for (const grezza of testi.slice(0, posti)) {
        const testo = pulisci(grezza);
        const chiave = normalizza(testo);
        if (!testo || viste.has(chiave)) continue;
        viste.add(chiave);
        etichette.push({ testo: troncato(testo), origine: "zona", provenienza: "lead", ...traduciEtichetta(testo, ctx, d) });
      }
    }
  }

  const aree = etichette.reduce((n, e) => n + e.aree.length, 0);
  const esito: EsitoProposta =
    aree === 0 ? "da_impostare" : avvisi.length || etichette.some((e) => e.esito !== "tradotta" || e.nota) ? "da_controllare" : "riconosciute";
  const zone: Zone = {
    versione: 1,
    lead: { fonte: lead.fonte, impronta: lead.impronta, etichette: lead.etichette },
    sede: ctx ? { codice: ctx.area.codice, nome: ctx.area.nome, sigla: ctx.area.sigla } : null,
    etichette,
    confermateAt: null,
  };
  return { zone, esito, avvisi, ctx, sede };
}

/* ---------- lettura ---------- */

export type LetturaZone =
  | { stato: "proposta"; zone: Zone; esito: EsitoProposta; avvisi: string[]; leadCambiato: false }
  | {
      stato: "confermate";
      zone: ZoneServite;
      leadCambiato: boolean;
      /** Proposta dal lead attuale: il banner «Da rivedere» mostra le sue etichette. */
      proposta: { zone: Zone; esito: EsitoProposta; avvisi: string[] };
    }
  | { stato: "non_leggibile"; motivo: string; file: string; leadCambiato: false }
  | { stato: "errore_dati"; motivo: string; leadCambiato: false };

function leggiFile(file: string): { stato: "assente" } | { stato: "non_leggibile"; motivo: string } | { stato: "ok"; zone: ZoneServite } {
  let testo: string;
  try {
    testo = fs.readFileSync(file, "utf8");
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "ENOENT" ? { stato: "assente" } : { stato: "non_leggibile", motivo: `lettura non riuscita (${(e as NodeJS.ErrnoException).code ?? String(e)})` };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(testo);
  } catch {
    return { stato: "non_leggibile", motivo: "JSON non valido" };
  }
  const parsed = ZoneServiteSchema.safeParse(raw);
  return parsed.success ? { stato: "ok", zone: parsed.data } : { stato: "non_leggibile", motivo: problemi(parsed.error) };
}

/** Stato delle zone di un cliente (dir = out/<slug>), senza scritture. */
export function leggiZoneServite(dir: string, percorsi: PercorsiDati = PERCORSI_DATI): LetturaZone {
  let d: Dati;
  try {
    d = caricaDati(percorsi);
  } catch (e) {
    if (e instanceof ErroreDati) return { stato: "errore_dati", motivo: e.message, leadCambiato: false };
    throw e;
  }
  const lead = leggiLead(dir);
  const { zone, esito, avvisi } = calcolaProposta(lead, d);
  const file = path.join(dir, FILE_ZONE);
  const salvato = leggiFile(file);
  if (salvato.stato === "assente") return { stato: "proposta", zone, esito, avvisi, leadCambiato: false };
  if (salvato.stato === "non_leggibile") return { stato: "non_leggibile", motivo: salvato.motivo, file, leadCambiato: false };
  return { stato: "confermate", zone: salvato.zone, leadCambiato: salvato.zone.lead.impronta !== lead.impronta, proposta: { zone, esito, avvisi } };
}

/** Le zone si possono usare (T4, G1, T5a…)? Confermate col lead di allora, o proposta riconosciuta per intero (decisione 14). */
export function zoneUsabili(l: LetturaZone): { ok: true; zone: Zone } | { ok: false; motivo: string } {
  switch (l.stato) {
    case "errore_dati":
      return { ok: false, motivo: `Dati dei comuni non leggibili: ${l.motivo}` };
    case "non_leggibile":
      return { ok: false, motivo: `${FILE_ZONE} non leggibile (${l.motivo}): correggilo a mano` };
    case "confermate":
      return l.leadCambiato ? { ok: false, motivo: MOTIVO_LEAD_CAMBIATO } : { ok: true, zone: l.zone };
    case "proposta":
      if (l.esito === "riconosciute") return { ok: true, zone: l.zone };
      return { ok: false, motivo: l.esito === "da_controllare" ? MOTIVO_DA_CONTROLLARE : MOTIVO_DA_IMPOSTARE };
  }
}

/* ---------- scrittura ---------- */

export type EsitoSalvataggio =
  | { ok: true; zone: ZoneServite }
  | { ok: false; codice: 409 | 422 | 503; errore: string; nonRiconosciute?: { testo: string; nota: string }[] };

/** Scrittura atomica come lib/clients.ts writeJson (copiata: quel modulo non gira sotto strip-types). */
function scriviJson(file: string, data: unknown): void {
  fs.writeFileSync(file + ".tmp", JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(file + ".tmp", file);
}

/**
 * Traduce sul server l'elenco dell'operatore; provenienza e origine le decide il server (rispetto al lead
 * attuale), mai il client. Un testo già tra le `confermate` tiene le sue aree, esito e nota invece di
 * essere ritradotto: raggioKm di allora, «X e dintorni» tradotta con la sede di allora. Tiene anche la
 * provenienza: una zona venuta da un lead (la vecchia sede compresa) non diventa «aggiunta a mano» dopo «Va bene così».
 */
function traduciElenco(etichette: readonly string[], p: Proposta, d: Dati, confermate: readonly Etichetta[] = []): Etichetta[] {
  const dalLead = new Set(p.zone.etichette.map((e) => normalizza(e.testo)));
  const giaConfermate = new Map(confermate.map((e) => [normalizza(e.testo), e]));
  const righe: Etichetta[] = [];
  const viste = new Set<string>();
  for (const grezza of etichette) {
    const testo = pulisci(grezza);
    const chiave = normalizza(testo);
    if (testo && viste.has(chiave)) continue;
    viste.add(chiave);
    const eSede = !!p.sede && chiave === p.sede.chiave;
    const c = giaConfermate.get(chiave);
    const t = c ? traduzione(c.esito, c.aree, c.nota) : eSede ? p.sede!.traduzione : traduciEtichetta(testo, p.ctx, d);
    righe.push({ testo: troncato(testo) || "(vuota)", origine: eSede ? "sede" : "zona", provenienza: dalLead.has(chiave) ? "lead" : (c?.provenienza ?? "operatore"), ...t });
  }
  return righe;
}

/**
 * Etichette del file da non ritradurre: col lead del file (Modifica, anteprima) o quando l'operatore tiene le zone
 * salvate dopo un cambio del lead («Va bene così»). Le zone del nuovo lead si ritraducono: la card le ha mostrate così.
 */
const daRiusare = (file: ReturnType<typeof leggiFile>, lead: Lead, tieni: boolean): Etichetta[] =>
  file.stato === "ok" && (tieni || file.zone.lead.impronta === lead.impronta) ? file.zone.etichette : [];

/**
 * «Salva e conferma» e «Conferma le zone» (= salva le etichette della proposta). 409 se il lead è
 * cambiato dall'apertura (impronta) o se il file esistente è fuori schema (mai sovrascritto); 422 con
 * l'elenco se resta una etichetta non riconosciuta o nessuna area; 503 se i dati non si leggono.
 * Un errore di disco si propaga (la route risponde 500). `tieni`: «Va bene così» col lead cambiato
 * (le etichette sono quelle salvate e ne tengono le aree).
 */
export function salvaZoneServite(dir: string, etichette: readonly string[], impronta: string, adesso: string, tieni = false, percorsi: PercorsiDati = PERCORSI_DATI): EsitoSalvataggio {
  let d: Dati;
  try {
    d = caricaDati(percorsi);
  } catch (e) {
    if (e instanceof ErroreDati) return { ok: false, codice: 503, errore: `Dati dei comuni non leggibili: ${e.message}` };
    throw e;
  }
  const file = path.join(dir, FILE_ZONE);
  const prima = leggiFile(file);
  if (prima.stato === "non_leggibile") {
    return { ok: false, codice: 409, errore: `${FILE_ZONE} non leggibile (${prima.motivo}): correggilo a mano, non viene sovrascritto` };
  }
  const lead = leggiLead(dir);
  if (lead.impronta !== impronta) {
    return { ok: false, codice: 409, errore: "Il form lead di questo cliente è cambiato mentre lavoravi sulle zone: rileggi la pagina e ricontrollale" };
  }
  if (etichette.length > MAX_ETICHETTE) return { ok: false, codice: 422, errore: `Troppe zone (${etichette.length}, massimo ${MAX_ETICHETTE})` };

  const proposta = calcolaProposta(lead, d);
  const righe = traduciElenco(etichette, proposta, d, daRiusare(prima, lead, tieni));
  const nonRiconosciute = righe.filter((e) => e.esito === "non_riconosciuta").map((e) => ({ testo: e.testo, nota: e.nota ?? "non riconosciuta" }));
  if (nonRiconosciute.length) {
    return { ok: false, codice: 422, errore: `Zone non riconosciute: ${nonRiconosciute.map((e) => `«${e.testo}»`).join(", ")}. Toglile o riscrivile.`, nonRiconosciute };
  }
  if (!righe.some((e) => e.aree.length > 0)) return { ok: false, codice: 422, errore: "Nessuna zona: aggiungine almeno una" };

  const zone = ZoneServiteSchema.parse({
    versione: 1,
    lead: { fonte: lead.fonte, impronta: lead.impronta, etichette: lead.etichette },
    sede: proposta.zone.sede,
    etichette: righe,
    confermateAt: adesso,
  } satisfies Zone);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  scriviJson(file, zone);
  return { ok: true, zone };
}

/* ---------- contratto per i consumatori ---------- */

const chiaveArea = (a: Area): string => (a.tipo === "italia" ? "italia" : a.tipo === "dintorni" ? `dintorni:${a.codice}:${a.raggioKm}` : `${a.tipo}:${a.codice}`);

/** Aree uniche nell'ordine delle etichette (G1: province e regioni intere dove l'etichetta è larga, comuni dove è precisa). */
export function areeServite(zone: Pick<Zone, "etichette">): Area[] {
  const uniche = new Map<string, Area>();
  for (const e of zone.etichette) for (const a of e.aree) if (!uniche.has(chiaveArea(a))) uniche.set(chiaveArea(a), a);
  return [...uniche.values()];
}

function espandi(d: Dati, a: Area): string[] {
  switch (a.tipo) {
    case "comune": {
      const c = risolviCodice(d, a.codice);
      return c ? [c] : [];
    }
    case "dintorni":
      return comuniEntroKm(a.codice, a.raggioKm, d).map((x) => x.codice);
    case "provincia":
      return Object.keys(d.comuni).filter((c) => d.comuni[c]!.sigla === a.sigla);
    case "regione": {
      const sigle = new Set(d.sigleDiRegione.get(REGIONI.find((r) => r.codice === a.codice)?.nome ?? "") ?? []);
      return Object.keys(d.comuni).filter((c) => sigle.has(d.comuni[c]!.sigla));
    }
    case "italia":
      return Object.keys(d.comuni);
  }
}

export interface ComuneServito {
  codice: string;
  nome: string;
  sigla: string;
  popolazione?: number;
  /** Linea d'aria dal centro della sede, km interi; null senza sede. */
  kmDallaSede: number | null;
  /** Indici in areeServite(zone) delle aree che lo comprendono. */
  aree: number[];
}

/** Comuni unici dell'area servita (codici 2026, anche da codici soppressi via alias), dal più vicino alla sede. */
export function comuniServiti(zone: Pick<Zone, "etichette" | "sede">, d: Dati = caricaDati()): ComuneServito[] {
  const aree = areeServite(zone);
  const per = new Map<string, number[]>();
  aree.forEach((a, i) => {
    for (const c of espandi(d, a)) {
      const l = per.get(c);
      if (!l) per.set(c, [i]);
      else if (!l.includes(i)) l.push(i);
    }
  });
  const sede = zone.sede ? risolviCodice(d, zone.sede.codice) : null;
  const centroSede = sede ? d.comuni[sede]!.centro : null;
  return [...per.entries()]
    .map(([codice, indici]) => {
      const r = d.comuni[codice]!;
      return {
        codice,
        nome: r.nome,
        sigla: r.sigla,
        ...(r.popolazione !== undefined ? { popolazione: r.popolazione } : {}),
        kmDallaSede: centroSede ? Math.round(haversineKm(centroSede, r.centro)) : null,
        aree: indici,
      };
    })
    .sort((a, b) => (a.kmDallaSede ?? Infinity) - (b.kmDallaSede ?? Infinity) || a.nome.localeCompare(b.nome, "it"));
}

/** Nome pubblico di un'area (T5a: pagina «Zone servite» e areaServed). */
export function etichettaArea(a: Area): string {
  switch (a.tipo) {
    case "comune":
      return conSigla(a.nome, a.sigla);
    case "dintorni":
      return `${a.nome} e dintorni, ${a.raggioKm} km`;
    case "provincia":
      return `Provincia di ${a.nome}`;
    case "regione":
      return nomeBreveRegione(a.nome);
    case "italia":
      return "Tutta Italia";
  }
}

/** Regione di una sigla 2026 (T2b/T8: quota di visite dalle regioni servite). */
export function regioneDiSigla(sigla: string, d: Dati = caricaDati()): { codice: string; nome: string } | null {
  const r = REGIONE_PER_NOME.get(d.province.get(sigla.trim().toUpperCase())?.regione ?? "");
  return r ? { codice: r.codice, nome: r.nome } : null;
}

/* ---------- vista per la card del dettaglio Traffico (dati serializzabili) ---------- */

export type StatoCard = "riconosciute" | "da_controllare" | "da_impostare" | "senza_lead" | "confermate" | "lead_cambiato" | "non_leggibile" | "errore_dati";

export interface RigaZona {
  testo: string;
  origine: Etichetta["origine"];
  provenienza: Etichetta["provenienza"];
  esito: Esito;
  nota: string | null;
  /** «regione Veneto», «comuni entro 20 km da Sandrigo (VI)». */
  traduzione: string;
  /** «560 comuni». */
  ampiezza: string;
}

export interface VistaZone {
  stato: StatoCard;
  fonte: FonteLead | null;
  /** Impronta del lead attuale: torna al server con «salva». */
  impronta: string;
  etichetteLead: string[];
  righe: RigaZona[];
  /** Solo con il lead cambiato: le etichette tradotte dal lead nuovo. */
  righeNuovoLead: RigaZona[];
  /** Solo con il lead cambiato: esito della proposta del lead nuovo (usabile con un clic solo se «riconosciute»). */
  esitoNuovoLead: EsitoProposta | null;
  avvisi: string[];
  /** «560 comuni · 4.851.851 residenti». */
  totale: string | null;
  confermateAt: string | null;
  motivo: string | null;
  file: string | null;
  /** MAX_ETICHETTE: la card non importa il modulo (fs), il massimo le arriva qui. */
  maxZone: number;
}

const interi = new Intl.NumberFormat("it-IT", { useGrouping: "always", maximumFractionDigits: 0 });
const quantiComuni = (n: number) => `${interi.format(n)} ${n === 1 ? "comune" : "comuni"}`;

function descriviAree(aree: Area[], origine: Etichetta["origine"]): string {
  if (aree.length === 0) return "";
  if (aree.length > 1 && aree.every((a) => a.tipo === "regione")) return `regioni ${aree.map((a) => etichettaArea(a)).join(", ")}`;
  const parti = aree.map((a) => {
    switch (a.tipo) {
      case "comune":
        return `comune ${conSigla(a.nome, a.sigla)}`;
      case "dintorni":
        return `comuni entro ${a.raggioKm} km da ${conSigla(a.nome, a.sigla)}`;
      case "provincia":
        return `provincia di ${conSigla(a.nome, a.sigla)}`;
      case "regione":
        return `regione ${nomeBreveRegione(a.nome)}`;
      case "italia":
        return "tutta Italia";
    }
  });
  return parti.join(", ") + (origine === "sede" ? ", sede del cliente" : "");
}

function riga(e: Etichetta, d: Dati): RigaZona {
  const comuni = new Set(e.aree.flatMap((a) => espandi(d, a))).size;
  return {
    testo: e.testo,
    origine: e.origine,
    provenienza: e.provenienza,
    esito: e.esito,
    nota: e.nota ?? null,
    traduzione: descriviAree(e.aree, e.origine),
    ampiezza: e.aree.length ? quantiComuni(comuni) : "",
  };
}

function totale(zone: Zone, d: Dati): string | null {
  const comuni = comuniServiti(zone, d);
  if (comuni.length === 0) return null;
  return `${quantiComuni(comuni.length)} · ${interi.format(comuni.reduce((s, c) => s + (c.popolazione ?? 0), 0))} residenti`;
}

/** Dalla lettura alla vista della card (nessuna scrittura). */
export function vistaZone(l: LetturaZone, percorsi: PercorsiDati = PERCORSI_DATI): VistaZone {
  const vuota = { fonte: null, impronta: "", etichetteLead: [], righe: [], righeNuovoLead: [], esitoNuovoLead: null, avvisi: [], totale: null, confermateAt: null, maxZone: MAX_ETICHETTE };
  if (l.stato === "errore_dati") return { ...vuota, stato: "errore_dati", motivo: l.motivo, file: null };
  if (l.stato === "non_leggibile") return { ...vuota, stato: "non_leggibile", motivo: l.motivo, file: l.file };
  const d = caricaDati(percorsi);
  if (l.stato === "proposta") {
    const stato: StatoCard = l.zone.lead.fonte === "assente" ? "senza_lead" : l.esito;
    return {
      stato,
      fonte: l.zone.lead.fonte,
      impronta: l.zone.lead.impronta,
      etichetteLead: l.zone.lead.etichette,
      righe: l.zone.etichette.map((e) => riga(e, d)),
      righeNuovoLead: [],
      esitoNuovoLead: null,
      avvisi: l.avvisi,
      totale: totale(l.zone, d),
      confermateAt: null,
      motivo: null,
      file: null,
      maxZone: MAX_ETICHETTE,
    };
  }
  const nuovo = l.proposta.zone;
  // Ogni salvataggio prende la sede del lead attuale (anche «Va bene così»): il banner lo dice, anche quando la perde.
  const prima = l.zone.sede;
  const sedeCambiata =
    l.leadCambiato && nuovo.sede && nuovo.sede.codice !== prima?.codice
      ? [`la sede ora è ${conSigla(nuovo.sede.nome, nuovo.sede.sigla)}${prima ? `, non più ${conSigla(prima.nome, prima.sigla)}` : ""}`]
      : [];
  const sedePersa = l.leadCambiato && prima && !nuovo.sede ? [`nessuna sede riconosciuta, quindi salvando ${conSigla(prima.nome, prima.sigla)} non è più la sede`] : [];
  return {
    stato: l.leadCambiato ? "lead_cambiato" : "confermate",
    fonte: nuovo.lead.fonte,
    impronta: nuovo.lead.impronta,
    etichetteLead: nuovo.lead.etichette,
    righe: l.zone.etichette.map((e) => riga(e, d)),
    righeNuovoLead: l.leadCambiato ? nuovo.etichette.map((e) => riga(e, d)) : [],
    esitoNuovoLead: l.leadCambiato ? l.proposta.esito : null,
    avvisi: l.leadCambiato ? [...sedeCambiata, ...sedePersa, ...l.proposta.avvisi] : [],
    totale: totale(l.zone, d),
    confermateAt: l.zone.confermateAt,
    motivo: null,
    file: null,
    maxZone: MAX_ETICHETTE,
  };
}

/** Anteprima di una etichetta scritta dall'operatore, nel contesto della sede del lead attuale (nessuna scrittura). */
export function anteprimaEtichetta(dir: string, testo: string, percorsi: PercorsiDati = PERCORSI_DATI): { ok: true; riga: RigaZona } | { ok: false; codice: 503; errore: string } {
  let d: Dati;
  try {
    d = caricaDati(percorsi);
  } catch (e) {
    if (e instanceof ErroreDati) return { ok: false, codice: 503, errore: `Dati dei comuni non leggibili: ${e.message}` };
    throw e;
  }
  // Stessa traduzione del salvataggio: una zona confermata tolta e riscritta torna com'era.
  const lead = leggiLead(dir);
  const [e] = traduciElenco([testo], calcolaProposta(lead, d), d, daRiusare(leggiFile(path.join(dir, FILE_ZONE)), lead, false));
  return { ok: true, riga: riga(e!, d) };
}
