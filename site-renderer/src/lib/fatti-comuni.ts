// fatti-comuni.ts — lettura del dataset dei fatti comunali (piano T6a).
//
// Il dataset `data/comuni-fatti.json` è generato da `scripts/fatti-comuni.ts aggiorna`
// da open data con fonte, licenza e riferimento temporale. Qui solo tipi e funzioni
// pure (unico I/O: caricaFattiComuni): nessuna rete, nessuna stima, nessuna prosa
// generata, solo valori con template fissi e attribuzione. Un fatto assente nel
// dataset non esiste (mai uno «0» al suo posto).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
  /** Abbinamenti non letterali, da poter rivedere a mano (campo → regola → voci). */
  abbinamentiApprossimati: Record<string, Record<string, string[]>>;
  alias: Record<string, { a: string; motivo: MotivoAlias; dal: string }>;
  comuni: Record<string, RecordComune>;
}

/* ---------- fatti esposti ---------- */

export type ChiaveFatto =
  | "popolazione"
  | "edifici_residenziali"
  | "edifici_ante_1981"
  | "zona_climatica"
  | "gradi_giorno"
  | "altitudine_casa_comunale"
  | "periodo_riscaldamento"
  | "zona_sismica"
  | "famiglie_proprietarie";

export interface Fatto {
  chiave: ChiaveFatto;
  /** Le quote sono già arrotondate a 1 decimale. */
  valore: number | string;
  unita: string;
  /** Per le quote: i conteggi pubblicati da cui è calcolata. */
  base?: { parte: number; totale: number };
  riferimento: string;
  fonteId: string;
  fonte: string;
  url: string;
  licenza: string;
  licenzaUrl: string;
  /** Già scelta tra dato grezzo ed elaborazione (quote, somme per fusione). */
  dicitura: string;
  derivazione?: Derivazione;
}

export interface ComuneFatti {
  codice: string;
  nome: string;
  sigla: string;
  nomeAltraLingua?: string;
  centro: [number, number];
  raggioKm: number;
  /** Presente quando il codice richiesto non è più valido. */
  alias?: { da: string; motivo: MotivoAlias; dal: string };
  fatti: Fatto[];
}

export interface FraseFatto {
  chiave: ChiaveFatto;
  testo: string;
  citazione: string;
  url: string;
}

/**
 * DPR 16 aprile 2013, n. 74, art. 4 c. 2 (periodi e ore di accensione per zona climatica),
 * testo vigente verificato con Normattiva. Abrogabile dal decreto previsto dall'art. 4
 * c. 1-quinquies D.Lgs. 192/2005 (D.Lgs. 48/2020 art. 17 c. 4): ricontrollare ogni anno.
 */
export const DPR74_VERIFICATO_IL = "14 settembre 2026";
export const FONTE_DPR74 = {
  id: "dpr74-2013-art4",
  titolo: "DPR 16 aprile 2013, n. 74, art. 4 comma 2",
  url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:2013-01-01;74~art4",
  licenza: "atto ufficiale escluso dal diritto d'autore (art. 5 L. 633/1941)",
  licenzaUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1941-04-22;633~art5",
  dicitura: "DPR 16 aprile 2013, n. 74, art. 4 comma 2",
  riferimento: `testo vigente verificato il ${DPR74_VERIFICATO_IL}`,
} as const;
export const PERIODI_RISCALDAMENTO: Record<string, { dal: string; al: string; ore: number } | null> = {
  A: { dal: "1° dicembre", al: "15 marzo", ore: 6 },
  B: { dal: "1° dicembre", al: "31 marzo", ore: 8 },
  C: { dal: "15 novembre", al: "31 marzo", ore: 10 },
  D: { dal: "1° novembre", al: "15 aprile", ore: 12 },
  E: { dal: "15 ottobre", al: "15 aprile", ore: 14 },
  F: null,
};

/** Classi di epoca 0-4 del record: costruiti fino al 1980. */
const CLASSI_ANTE_1981 = 5;

/* ---------- numeri ---------- */

const interi = new Intl.NumberFormat("it-IT", { useGrouping: "always", maximumFractionDigits: 0 });
const unDecimale = new Intl.NumberFormat("it-IT", { useGrouping: "always", minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** «8.303», «46.994» (il raggruppamento di CLDR per l'italiano salterebbe le 4 cifre). */
export const formatoIntero = (n: number): string => interi.format(n);
/** Quota a 1 decimale con regola unica: «69,7». */
export const quota = (parte: number, totale: number): number => Math.round((parte / totale) * 1000) / 10;
export const formatoQuota = (q: number): string => unDecimale.format(q);

/* ---------- caricamento ---------- */

const caricati = new Map<string, DatasetFattiComuni>();

/** Unico I/O: legge e memoizza il dataset (default: data/comuni-fatti.json accanto a src/). */
export function caricaFattiComuni(percorso?: string): DatasetFattiComuni {
  const p = percorso ?? fileURLToPath(new URL("../../data/comuni-fatti.json", import.meta.url));
  const inMemoria = caricati.get(p);
  if (inMemoria) return inMemoria;
  const ds = JSON.parse(readFileSync(p, "utf8")) as DatasetFattiComuni;
  if (ds.schema !== 1) throw new Error(`${p}: schema ${String(ds.schema)} non supportato (atteso 1)`);
  caricati.set(p, ds);
  return ds;
}

/** "015081", "15081", 15081 → "015081"; tutto il resto → null. */
function codiceNormalizzato(codice: string | number): string | null {
  const s = typeof codice === "number" ? (Number.isInteger(codice) && codice > 0 ? String(codice) : "") : codice.trim();
  return /^\d{1,6}$/.test(s) ? s.padStart(6, "0") : null;
}

function risolvi(codice: string | number, ds: DatasetFattiComuni): { codice: string; rec: RecordComune; alias?: ComuneFatti["alias"] } | null {
  const c = codiceNormalizzato(codice);
  if (!c) return null;
  const rec = ds.comuni[c];
  if (rec) return { codice: c, rec };
  const a = ds.alias[c];
  const dest = a ? ds.comuni[a.a] : undefined;
  return a && dest ? { codice: a.a, rec: dest, alias: { da: c, motivo: a.motivo, dal: a.dal } } : null;
}

/* ---------- API ---------- */

/** Fatti di un comune con attribuzione completa. Accetta codici soppressi (via alias, dichiarato). Codice ignoto → null. */
export function fattiComune(codice: string | number, ds: DatasetFattiComuni = caricaFattiComuni()): ComuneFatti | null {
  const r = risolvi(codice, ds);
  if (!r) return null;
  const { rec } = r;
  const fatti: Fatto[] = [];
  const attribuzione = (campo: string, elaborazione: boolean) => {
    const id = ds.fatti[campo]!;
    const f = ds.fonti[id]!;
    return {
      riferimento: f.riferimento,
      fonteId: id,
      fonte: f.titolo,
      url: f.url,
      licenza: f.licenza,
      licenzaUrl: f.licenzaUrl,
      dicitura: elaborazione ? (f.dicituraElaborazione ?? f.dicitura) : f.dicitura,
    };
  };
  const derivazione = (campo: CampoAdditivo) => rec.derivati?.[campo];

  if (rec.popolazione !== undefined) {
    const d = derivazione("popolazione");
    fatti.push({ chiave: "popolazione", valore: rec.popolazione, unita: "residenti", ...attribuzione("popolazione", Boolean(d)), ...(d ? { derivazione: d } : {}) });
  }
  if (rec.edificiEpoca) {
    const d = derivazione("edificiEpoca");
    const totale = rec.edificiEpoca.reduce((a, b) => a + b, 0);
    const parte = rec.edificiEpoca.slice(0, CLASSI_ANTE_1981).reduce((a, b) => a + b, 0);
    fatti.push({ chiave: "edifici_residenziali", valore: totale, unita: "edifici", ...attribuzione("edificiEpoca", Boolean(d)), ...(d ? { derivazione: d } : {}) });
    if (totale > 0) {
      fatti.push({ chiave: "edifici_ante_1981", valore: quota(parte, totale), unita: "%", base: { parte, totale }, ...attribuzione("edificiEpoca", true), ...(d ? { derivazione: d } : {}) });
    }
  }
  if (rec.clima) {
    const [zona, gg, alt] = rec.clima;
    fatti.push({ chiave: "zona_climatica", valore: zona, unita: "zona", ...attribuzione("clima", false) });
    fatti.push({ chiave: "gradi_giorno", valore: gg, unita: "GG", ...attribuzione("clima", false) });
    fatti.push({ chiave: "altitudine_casa_comunale", valore: alt, unita: "m s.l.m.", ...attribuzione("clima", false) });
    const periodo = PERIODI_RISCALDAMENTO[zona];
    if (periodo !== undefined) {
      fatti.push({
        chiave: "periodo_riscaldamento",
        valore: periodo ? `dal ${periodo.dal} al ${periodo.al}, ${periodo.ore} ore al giorno` : "nessuna limitazione",
        unita: "periodo",
        riferimento: FONTE_DPR74.riferimento,
        fonteId: FONTE_DPR74.id,
        fonte: FONTE_DPR74.titolo,
        url: FONTE_DPR74.url,
        licenza: FONTE_DPR74.licenza,
        licenzaUrl: FONTE_DPR74.licenzaUrl,
        dicitura: FONTE_DPR74.dicitura,
      });
    }
  }
  if (rec.sismica !== undefined) {
    fatti.push({ chiave: "zona_sismica", valore: rec.sismica, unita: "zona", ...attribuzione("sismica", false) });
  }
  if (rec.famiglie && rec.famiglie[1] > 0) {
    const d = derivazione("famiglie");
    const [parte, totale] = rec.famiglie;
    fatti.push({ chiave: "famiglie_proprietarie", valore: quota(parte, totale), unita: "%", base: { parte, totale }, ...attribuzione("famiglie", true), ...(d ? { derivazione: d } : {}) });
  }
  return {
    codice: r.codice,
    nome: rec.nome,
    sigla: rec.sigla,
    ...(rec.nomeAltraLingua ? { nomeAltraLingua: rec.nomeAltraLingua } : {}),
    centro: rec.centro,
    raggioKm: rec.raggioKm,
    ...(r.alias ? { alias: r.alias } : {}),
    fatti,
  };
}

function citazione(f: Fatto, extra?: string): string {
  const conData = f.dicitura.includes(f.riferimento) ? f.dicitura : `${f.dicitura} (${f.riferimento})`;
  const origine = f.derivazione ? `; somma dei dati dei comuni d'origine: ${f.derivazione.nomi.join(", ")}` : "";
  return `${conData}${extra ? `; ${extra}` : ""}${origine}; ${f.licenza.startsWith("CC ") ? `licenza ${f.licenza}` : f.licenza}`;
}

/** Frasi-fatto con citazione: template fissi e numeri all'italiana; nessun fatto → nessuna frase. */
export function frasiFatto(codice: string | number, ds: DatasetFattiComuni = caricaFattiComuni()): FraseFatto[] {
  const c = fattiComune(codice, ds);
  if (!c) return [];
  const per = new Map(c.fatti.map((f) => [f.chiave, f]));
  const frasi: FraseFatto[] = [];
  const aggiungi = (f: Fatto, testo: string, extra?: string) => frasi.push({ chiave: f.chiave, testo, citazione: citazione(f, extra), url: f.url });

  const pop = per.get("popolazione");
  if (pop) aggiungi(pop, `${formatoIntero(pop.valore as number)} residenti`);
  const edifici = per.get("edifici_residenziali");
  if (edifici) aggiungi(edifici, `${formatoIntero(edifici.valore as number)} edifici residenziali`);
  const ante = per.get("edifici_ante_1981");
  if (ante?.base) aggiungi(ante, `${formatoQuota(ante.valore as number)}% degli edifici residenziali costruiti prima del 1981 (${formatoIntero(ante.base.parte)} su ${formatoIntero(ante.base.totale)})`);
  const zona = per.get("zona_climatica");
  const gg = per.get("gradi_giorno");
  const alt = per.get("altitudine_casa_comunale");
  if (zona && gg && alt) {
    aggiungi(zona, `zona climatica ${zona.valore}, ${formatoIntero(gg.valore as number)} gradi giorno (casa comunale a ${formatoIntero(alt.valore as number)} m)`, "valori riferiti alla casa comunale");
  }
  const periodo = per.get("periodo_riscaldamento");
  if (periodo && zona) {
    const testo = periodo.valore === "nessuna limitazione" ? "riscaldamento: nessuna limitazione di periodo e di orario" : `riscaldamento consentito ${periodo.valore}`;
    aggiungi(periodo, testo, `per la zona climatica ${zona.valore} dell'allegato A del DPR 412/1993`);
  }
  const sismica = per.get("zona_sismica");
  if (sismica) aggiungi(sismica, `zona sismica ${sismica.valore}`, sismica.fonte);
  const famiglie = per.get("famiglie_proprietarie");
  if (famiglie) aggiungi(famiglie, `${formatoQuota(famiglie.valore as number)}% delle famiglie in abitazione di proprietà`);
  return frasi;
}

/** Nome (attuale, nell'altra lingua o precedente; accenti e apostrofi indifferenti) e sigla opzionale → candidati. */
export function cercaComune(nome: string, sigla?: string, ds: DatasetFattiComuni = caricaFattiComuni()): { codice: string; nome: string; sigla: string }[] {
  const chiave = normalizzaNome(nome);
  if (!chiave) return [];
  const s = sigla?.trim().toUpperCase();
  const out: { codice: string; nome: string; sigla: string }[] = [];
  for (const [codice, r] of Object.entries(ds.comuni)) {
    if (s && r.sigla !== s) continue;
    const nomi = [r.nome, ...r.nome.split("/"), ...(r.nomeAltraLingua ? [r.nomeAltraLingua] : []), ...(r.nomiPrecedenti ?? [])];
    if (nomi.some((n) => normalizzaNome(n) === chiave)) out.push({ codice, nome: r.nome, sigla: r.sigla });
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "it") || a.sigla.localeCompare(b.sigla));
}

const RAGGIO_TERRA_KM = 6371.0088;
function haversineKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * RAGGIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

export const CITAZIONE_DISTANZA = "distanza in linea d'aria tra i centri geografici dei comuni, non su strada; elaborazione su dati Istat, Confini delle unità amministrative a fini statistici al 1° gennaio 2026";

/**
 * Linea d'aria tra i centri dei due comuni, km interi; null se un codice è ignoto.
 * `citabile` è false quando la distanza è minore della somma dei due raggi di pari area: lì
 * l'incertezza del «centro» (fino a circa metà raggio dal municipio) pesa più di metà del valore
 * e conviene dire «comune vicino» invece di un numero (calibrazione T6a: 2,7% delle coppie entro 30 km).
 */
export function distanzaKm(
  da: string | number,
  a: string | number,
  ds: DatasetFattiComuni = caricaFattiComuni(),
): { km: number; citabile: boolean; metodo: "linea_aria_centroidi"; citazione: string } | null {
  const x = risolvi(da, ds);
  const y = risolvi(a, ds);
  if (!x || !y) return null;
  const d = haversineKm(x.rec.centro, y.rec.centro);
  return { km: Math.round(d), citabile: d >= x.rec.raggioKm + y.rec.raggioKm, metodo: "linea_aria_centroidi", citazione: CITAZIONE_DISTANZA };
}

/** Comuni entro `km` (linea d'aria, km interi) dalla sede, sede compresa, ordinati per distanza. */
export function comuniEntroKm(da: string | number, km: number, ds: DatasetFattiComuni = caricaFattiComuni()): { codice: string; nome: string; sigla: string; km: number }[] {
  const x = risolvi(da, ds);
  if (!x || !Number.isFinite(km) || km < 0) return [];
  const out: { codice: string; nome: string; sigla: string; km: number }[] = [];
  for (const [codice, r] of Object.entries(ds.comuni)) {
    const d = Math.round(haversineKm(x.rec.centro, r.centro));
    if (d <= km) out.push({ codice, nome: r.nome, sigla: r.sigla, km: d });
  }
  return out.sort((a, b) => a.km - b.km || a.nome.localeCompare(b.nome, "it"));
}
