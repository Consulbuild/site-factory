// fatti-comuni.ts — dataset dei fatti comunali da open data (piano T6a).
//
// Uso (da site-renderer/):
//   node --experimental-strip-types scripts/fatti-comuni.ts aggiorna [--offline] [--solo-verifica] [--parziale]
//   node --experimental-strip-types scripts/fatti-comuni.ts mostra <codice|"nome" [sigla]> [--da <codice>] [--json]
//
// `aggiorna` scarica le fonti in una cache fuori dal repo (~/.cache/site-factory/fatti-comuni,
// override FATTI_COMUNI_CACHE), scrive manifest.json (URL, sha256, byte, last-modified), le
// legge, porta ogni fonte ai confini comunali al 1/1/2026 con le variazioni Istat, esegue i
// gate e scrive data/comuni-fatti.json SOLO se tutto passa (file temporaneo + rename).
// Una fonte non raggiungibile ferma l'aggiornamento; con --parziale il dataset si scrive
// lo stesso ma dichiara `completo: false` e `fontiMancanti` (mai un dataset parziale
// spacciato per completo). --offline usa solo la cache.
//
// PROCEDURA ANNUALE (aprile, dopo i confini al 1/1 e la POSAS definitiva) — piano T6a §9:
//  1. Controllare le pagine Istat (codici dei comuni, confini amministrativi, demo.istat.it) e
//     DPC: nuovo LimitiAAAA_g.zip, POSAS dell'anno precedente SENZA «stima», CSV variazioni
//     aggiornato, eventuali tabelle di corrispondenza regionali (come quella sarda), CSV sismico.
//  2. Verificare con cite_law che il DPR 74/2013 art. 4 sia vigente e invariato; aggiornare
//     DPR74_VERIFICATO_IL in src/lib/fatti-comuni.ts o togliere il periodo di riscaldamento.
//  3. Aggiornare le costanti FONTI qui sotto (un solo punto).
//  4. `aggiorna`; se il gate di chiusura fallisce c'è una variazione non coperta: cercarne la
//     tabella Istat prima di forzare qualunque cosa.
//  5. Leggere il report di diff; rilanciare scripts/test-fatti-comuni.ts (anno del golden).
//  6. Commit di dataset e costanti con il report nel messaggio; push.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { once } from "node:events";
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  caricaFattiComuni,
  cercaComune,
  distanzaKm,
  fattiComune,
  frasiFatto,
  normalizzaNome,
  type CampoAdditivo,
  type DatasetFattiComuni,
  type Derivazione,
  type FonteDataset,
  type MotivoAlias,
  type RecordComune,
} from "../src/lib/fatti-comuni.ts";

/* ====================================================================================== */
/* Costanti delle fonti (unico punto da aggiornare ogni anno)                             */
/* ====================================================================================== */

export type IdFonte =
  | "istat-confini-2026"
  | "istat-variazioni"
  | "istat-sardegna-2026"
  | "istat-posas-2025"
  | "istat-edifici-2011"
  | "istat-famiglie-2021"
  | "dpc-sismica-2025"
  | "dpr412-allegato-a";

interface DefFonte extends Omit<FonteDataset, "stato" | "file" | "scaricatoIl" | "righe"> {
  file: { nome: string; url: string }[];
  /** Senza questa fonte non si costruisce nulla (anagrafica e variazioni). */
  strutturale: boolean;
}

const CC_BY = { licenza: "CC BY 4.0", licenzaUrl: "https://creativecommons.org/licenses/by/4.0/deed.it" };
const GU_ALLEGATO_A = (p: number) =>
  "https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.versione=1&art.idGruppo=0&art.flagTipoArticolo=1" +
  "&art.codiceRedazionale=093G0451&art.idArticolo=1&art.idSottoArticolo=1&art.idSottoArticolo1=10" +
  `&art.dataPubblicazioneGazzetta=1993-10-14&art.progressivo=${p}`;

export const RIFERIMENTO_TERRITORIALE = "2026-01-01";

export const FONTI: Record<IdFonte, DefFonte> = {
  "istat-confini-2026": {
    titolo: "Confini delle unità amministrative a fini statistici al 1° gennaio 2026 (versione generalizzata)",
    ente: "Istat",
    url: "https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip",
    ...CC_BY,
    dicitura: "Fonte: Istat, Confini delle unità amministrative a fini statistici al 1° gennaio 2026",
    dicituraElaborazione: "Elaborazione su dati Istat, Confini delle unità amministrative a fini statistici al 1° gennaio 2026",
    riferimento: "1° gennaio 2026",
    riferimentoTerritoriale: "2026-01-01",
    file: [{ nome: "istat-confini-2026.zip", url: "https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip" }],
    strutturale: true,
  },
  "istat-variazioni": {
    titolo: "Variazioni amministrative e territoriali dei comuni dal 1991",
    ente: "Istat",
    url: "https://www.istat.it/storage/codici-unita-amministrative/Variazioni-amministrative-e-territoriali-dal-1991.zip",
    ...CC_BY,
    dicitura: "Fonte: Istat, Variazioni amministrative e territoriali dei comuni dal 1991",
    riferimento: "dal 1991 al 10 dicembre 2024",
    riferimentoTerritoriale: "2024-12-10",
    file: [{ nome: "istat-variazioni.zip", url: "https://www.istat.it/storage/codici-unita-amministrative/Variazioni-amministrative-e-territoriali-dal-1991.zip" }],
    strutturale: true,
  },
  "istat-sardegna-2026": {
    titolo: "Codici statistici e denominazioni delle unità amministrative della Sardegna in vigore dal 1° gennaio 2026",
    ente: "Istat",
    url: "https://www.istat.it/wp-content/uploads/2024/09/Codici-statistici-e-denominazioni-delle-unita-amministrative-della-Sardegna.zip",
    ...CC_BY,
    dicitura: "Fonte: Istat, Codici statistici delle unità amministrative della Sardegna dal 1° gennaio 2026",
    riferimento: "1° gennaio 2026",
    riferimentoTerritoriale: "2026-01-01",
    file: [{ nome: "istat-sardegna-2026.zip", url: "https://www.istat.it/wp-content/uploads/2024/09/Codici-statistici-e-denominazioni-delle-unita-amministrative-della-Sardegna.zip" }],
    strutturale: true,
  },
  "istat-posas-2025": {
    titolo: "Popolazione residente per età, sesso e stato civile al 1° gennaio 2025",
    ente: "Istat",
    url: "https://demo.istat.it/data/posas/POSAS_2025_it_Comuni.zip",
    ...CC_BY,
    dicitura: "Fonte: Istat, Popolazione residente al 1° gennaio 2025",
    dicituraElaborazione: "Elaborazione su dati Istat, Popolazione residente al 1° gennaio 2025",
    riferimento: "1° gennaio 2025",
    riferimentoTerritoriale: "2025-01-01",
    file: [{ nome: "istat-posas-2025.zip", url: "https://demo.istat.it/data/posas/POSAS_2025_it_Comuni.zip" }],
    strutturale: false,
  },
  "istat-edifici-2011": {
    titolo: "Censimento della popolazione e delle abitazioni 2011 — edifici residenziali per epoca di costruzione",
    ente: "Istat",
    url: "https://esploradati.istat.it/databrowser/DWL/censtatv5db/Popolazione/DICA_EDIFICIRES-data.zip",
    ...CC_BY,
    dicitura: "Fonte: Istat, Censimento della popolazione e delle abitazioni 2011",
    dicituraElaborazione: "Elaborazione su dati Istat, Censimento della popolazione e delle abitazioni 2011",
    riferimento: "9 ottobre 2011",
    riferimentoTerritoriale: "2011-10-09",
    file: [{ nome: "istat-edifici-2011.zip", url: "https://esploradati.istat.it/databrowser/DWL/censtatv5db/Popolazione/DICA_EDIFICIRES-data.zip" }],
    strutturale: false,
  },
  "istat-famiglie-2021": {
    titolo: "Censimento permanente della popolazione e delle abitazioni 2021 — famiglie per titolo di godimento dell'abitazione",
    ente: "Istat",
    url: "https://esploradati.istat.it/SDMXWS/rest/data/IT1,DF_DCSS_HUDW_1_COM,1.0/ALL/ALL?detail=full&format=csv",
    ...CC_BY,
    dicitura: "Fonte: Istat, Censimento permanente della popolazione e delle abitazioni 2021",
    dicituraElaborazione: "Elaborazione su dati Istat, Censimento permanente della popolazione e delle abitazioni 2021",
    riferimento: "2021",
    riferimentoTerritoriale: "2021-12-31",
    file: [{ nome: "istat-famiglie-2021.csv", url: "https://esploradati.istat.it/SDMXWS/rest/data/IT1,DF_DCSS_HUDW_1_COM,1.0/ALL/ALL?detail=full&format=csv" }],
    strutturale: false,
  },
  "dpc-sismica-2025": {
    titolo: "Classificazione sismica aggiornata a maggio 2025",
    ente: "Dipartimento della Protezione Civile",
    url: "https://rischi.protezionecivile.gov.it/static/4717c6a369cdc298b69730c9d740e39a/classificazione-sismica-aggiornata-maggio-2025.csv",
    ...CC_BY,
    dicitura: "Fonte: Dipartimento della Protezione Civile-Presidenza del Consiglio dei Ministri",
    riferimento: "31 maggio 2025",
    riferimentoTerritoriale: "2025-05-31",
    file: [{ nome: "dpc-sismica-2025.csv", url: "https://rischi.protezionecivile.gov.it/static/4717c6a369cdc298b69730c9d740e39a/classificazione-sismica-aggiornata-maggio-2025.csv" }],
    strutturale: false,
  },
  "dpr412-allegato-a": {
    titolo: "DPR 26 agosto 1993, n. 412, allegato A — tabella dei gradi giorno dei comuni italiani",
    ente: "Gazzetta Ufficiale della Repubblica Italiana",
    url: "https://www.gazzettaufficiale.it/atto/serie_generale/caricaDettaglioAtto/originario?atto.dataPubblicazioneGazzetta=1993-10-14&atto.codiceRedazionale=093G0451",
    licenza: "atto ufficiale escluso dal diritto d'autore (art. 5 L. 633/1941)",
    licenzaUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1941-04-22;633~art5",
    dicitura: "DPR 26 agosto 1993, n. 412, allegato A",
    riferimento: "testo originario del 1993",
    riferimentoTerritoriale: "1993-10-14",
    file: [1, 2, 3].map((p) => ({ nome: `dpr412-allegato-a-${p}.html`, url: GU_ALLEGATO_A(p) })),
    strutturale: false,
  },
};

/** Campo del record → fonte da cui viene. */
export const FATTI: Record<string, IdFonte> = {
  nome: "istat-confini-2026",
  sigla: "istat-confini-2026",
  centro: "istat-confini-2026",
  raggioKm: "istat-confini-2026",
  popolazione: "istat-posas-2025",
  edificiEpoca: "istat-edifici-2011",
  clima: "dpr412-allegato-a",
  sismica: "dpc-sismica-2025",
  famiglie: "istat-famiglie-2021",
};

/** Membri degli zip (dipendono dall'anno dei confini). */
const ZIP = {
  comuniDbf: "Com01012026_g/Com01012026_g_WGS84.dbf",
  comuniShp: "Com01012026_g/Com01012026_g_WGS84.shp",
  provinceDbf: "ProvCM01012026_g/ProvCM01012026_g_WGS84.dbf",
};

/**
 * Sigle di province del 1993 che oggi hanno un'altra sigla o non esistono più (serve solo a
 * disambiguare gli omonimi dell'allegato A): Forlì FO (oggi FC), Pesaro PS (oggi PU), le
 * quattro province sarde storiche (codici 090-095, sostituite dal riordino del 1/1/2026).
 */
const SIGLE_STORICHE: Record<string, string[]> = {
  "040": ["FO"],
  "041": ["PS"],
  "090": ["SS"],
  "091": ["NU"],
  "092": ["CA"],
  "095": ["OR"],
};

const UA = "site-factory-fatti-comuni/1.0 (+mailto:info@consulbuild.com)";
const TENTATIVI = 3;
const ATTESE_MS = [5_000, 15_000];
const TIMEOUT_RISPOSTA_MS = 45_000;
const TIMEOUT_CORPO_MS = 15 * 60_000;
export const BUDGET_DATASET_BYTE = 2_500_000;

const RADICE_RENDERER = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PERCORSO_DATASET = join(RADICE_RENDERER, "data", "comuni-fatti.json");
export const CARTELLA_CACHE = process.env.FATTI_COMUNI_CACHE || join(homedir(), ".cache", "site-factory", "fatti-comuni");

/* ====================================================================================== */
/* Lettura dei formati                                                                    */
/* ====================================================================================== */

/** CSV con campi tra virgolette anche su più righe, CRLF o LF, BOM tollerato. */
export function leggiCsv(testo: string, sep = ";"): string[][] {
  const t = testo.charCodeAt(0) === 0xfeff ? testo.slice(1) : testo;
  const n = t.length;
  const righe: string[][] = [];
  let i = 0;
  while (i < n) {
    const riga: string[] = [];
    for (;;) {
      let campo: string;
      if (t[i] === '"') {
        campo = "";
        let j = i + 1;
        for (;;) {
          const q = t.indexOf('"', j);
          if (q < 0) throw new Error(`CSV: virgolette non chiuse (riga ${righe.length + 1})`);
          campo += t.slice(j, q);
          if (t[q + 1] === '"') {
            campo += '"';
            j = q + 2;
          } else {
            i = q + 1;
            break;
          }
        }
        if (i < n && t[i] !== sep && t[i] !== "\r" && t[i] !== "\n") {
          throw new Error(`CSV: carattere dopo le virgolette di chiusura (riga ${righe.length + 1})`);
        }
      } else {
        let j = i;
        while (j < n && t[j] !== sep && t[j] !== "\n" && t[j] !== "\r") j++;
        campo = t.slice(i, j);
        i = j;
      }
      riga.push(campo);
      if (t[i] === sep) {
        i++;
        continue;
      }
      if (t[i] === "\r") i++;
      if (t[i] === "\n") i++;
      break;
    }
    righe.push(riga);
  }
  return righe;
}

const decodificaWindows1252 = new TextDecoder("windows-1252", { fatal: false });
export const daWindows1252 = (b: Uint8Array): string => decodificaWindows1252.decode(b);
export function daUtf8(b: Uint8Array, cosa: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    throw new Error(`${cosa}: il file non è UTF-8 valido`);
  }
}

export type RigaDbf = Record<string, string>;

/** DBF (dBase III) con testo UTF-8, come i confini Istat. */
export function leggiDbf(buf: Buffer, cosa: string): RigaDbf[] {
  if (buf.length < 33) throw new Error(`${cosa}: DBF troppo corto`);
  const n = buf.readUInt32LE(4);
  const lunghezzaTesta = buf.readUInt16LE(8);
  const lunghezzaRiga = buf.readUInt16LE(10);
  const campi: { nome: string; lunghezza: number }[] = [];
  for (let off = 32; buf[off] !== 0x0d; off += 32) {
    if (off + 32 > lunghezzaTesta) throw new Error(`${cosa}: intestazione DBF senza terminatore`);
    const nome = buf.toString("latin1", off, off + 11).replace(/\0.*$/s, "");
    campi.push({ nome, lunghezza: buf[off + 16]! });
  }
  if (lunghezzaTesta + n * lunghezzaRiga > buf.length) throw new Error(`${cosa}: DBF troncato`);
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  const righe: RigaDbf[] = [];
  for (let r = 0; r < n; r++) {
    const base = lunghezzaTesta + r * lunghezzaRiga;
    if (buf[base] === 0x2a) continue; // record cancellato
    let p = base + 1;
    const riga: RigaDbf = {};
    for (const c of campi) {
      try {
        riga[c.nome] = utf8.decode(buf.subarray(p, p + c.lunghezza)).trim();
      } catch {
        throw new Error(`${cosa}: record ${r + 1}, campo ${c.nome} non è UTF-8`);
      }
      p += c.lunghezza;
    }
    righe.push(riga);
  }
  return righe;
}

/** Anelli di un poligono: coordinate piatte [x0, y0, x1, y1, …], chiusi (ultimo = primo). */
export interface Poligono {
  anelli: Float64Array[];
}

/** SHP con soli poligoni (tipo 5), nell'ordine dei record del DBF. */
export function leggiShp(buf: Buffer, cosa: string): Poligono[] {
  if (buf.length < 100 || buf.readInt32BE(0) !== 9994) throw new Error(`${cosa}: non è uno shapefile`);
  if (buf.readInt32LE(32) !== 5) throw new Error(`${cosa}: attesi poligoni (tipo 5), trovato ${buf.readInt32LE(32)}`);
  const lunghezzaFile = buf.readInt32BE(24) * 2;
  if (lunghezzaFile > buf.length) throw new Error(`${cosa}: shapefile troncato`);
  const poligoni: Poligono[] = [];
  let off = 100;
  while (off < lunghezzaFile) {
    const lunghezza = buf.readInt32BE(off + 4) * 2;
    const c = off + 8;
    const tipo = buf.readInt32LE(c);
    if (tipo !== 5) throw new Error(`${cosa}: record ${poligoni.length + 1} di tipo ${tipo}, atteso 5`);
    const parti = buf.readInt32LE(c + 36);
    const punti = buf.readInt32LE(c + 40);
    const inizi: number[] = [];
    for (let k = 0; k < parti; k++) inizi.push(buf.readInt32LE(c + 44 + 4 * k));
    const basePunti = c + 44 + 4 * parti;
    const anelli: Float64Array[] = [];
    for (let k = 0; k < parti; k++) {
      const da = inizi[k]!;
      const a = k + 1 < parti ? inizi[k + 1]! : punti;
      const anello = new Float64Array((a - da) * 2);
      for (let q = da; q < a; q++) {
        anello[(q - da) * 2] = buf.readDoubleLE(basePunti + q * 16);
        anello[(q - da) * 2 + 1] = buf.readDoubleLE(basePunti + q * 16 + 8);
      }
      anelli.push(anello);
    }
    poligoni.push({ anelli });
    off = c + lunghezza;
  }
  return poligoni;
}

/* ====================================================================================== */
/* Geometria                                                                              */
/* ====================================================================================== */

/** Area (valore assoluto, unità² del piano) e centroide d'area; i buchi sottraggono. */
export function areaCentroide(p: Poligono): { area: number; x: number; y: number } {
  const primo = p.anelli[0];
  if (!primo || primo.length < 6) throw new Error("poligono vuoto");
  const x0 = primo[0]!;
  const y0 = primo[1]!;
  let doppiaArea = 0;
  let sx = 0;
  let sy = 0;
  for (const r of p.anelli) {
    for (let i = 0; i + 3 < r.length; i += 2) {
      const xa = r[i]! - x0;
      const ya = r[i + 1]! - y0;
      const xb = r[i + 2]! - x0;
      const yb = r[i + 3]! - y0;
      const cr = xa * yb - xb * ya;
      doppiaArea += cr;
      sx += (xa + xb) * cr;
      sy += (ya + yb) * cr;
    }
  }
  if (doppiaArea === 0) throw new Error("poligono di area nulla");
  return { area: Math.abs(doppiaArea) / 2, x: x0 + sx / (3 * doppiaArea), y: y0 + sy / (3 * doppiaArea) };
}

/** Pari-dispari su tutti gli anelli (buchi e parti multiple inclusi). */
export function puntoDentro(p: Poligono, x: number, y: number): boolean {
  let dentro = false;
  for (const r of p.anelli) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const yi = r[i + 1]!;
      const yj = r[j + 1]!;
      if (yi > y !== yj > y) {
        const xi = r[i]!;
        const xj = r[j]!;
        if (x < xi + ((y - yi) * (xj - xi)) / (yj - yi)) dentro = !dentro;
      }
    }
  }
  return dentro;
}

function puntoSuOrizzontale(p: Poligono, y: number): { x: number; y: number } | null {
  const xs: number[] = [];
  for (const r of p.anelli) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const yi = r[i + 1]!;
      const yj = r[j + 1]!;
      if (yi > y !== yj > y) xs.push(r[i]! + ((y - yi) * (r[j]! - r[i]!)) / (yj - yi));
    }
  }
  xs.sort((a, b) => a - b);
  let migliore: { x: number; y: number } | null = null;
  let lunghezza = 0;
  for (let k = 0; k + 1 < xs.length; k += 2) {
    const l = xs[k + 1]! - xs[k]!;
    if (l > lunghezza) {
      lunghezza = l;
      migliore = { x: (xs[k]! + xs[k + 1]!) / 2, y };
    }
  }
  return migliore && puntoDentro(p, migliore.x, migliore.y) ? migliore : null;
}

/**
 * Punto rappresentativo interno: il centroide d'area se cade dentro; altrimenti il centro del
 * segmento interno più lungo sull'orizzontale del centroide (poi su quelle dell'anello più
 * grande). Il risultato è sempre verificato dentro il poligono.
 */
export function puntoInterno(p: Poligono): { x: number; y: number; area: number; spostato: boolean } {
  const c = areaCentroide(p);
  if (puntoDentro(p, c.x, c.y)) return { x: c.x, y: c.y, area: c.area, spostato: false };
  const candidate = [c.y];
  let maggiore: Float64Array | null = null;
  let areaMaggiore = 0;
  for (const r of p.anelli) {
    const a = areaCentroide({ anelli: [r] }).area;
    if (a > areaMaggiore) {
      areaMaggiore = a;
      maggiore = r;
    }
  }
  if (maggiore) {
    let ymin = Infinity;
    let ymax = -Infinity;
    for (let i = 1; i < maggiore.length; i += 2) {
      ymin = Math.min(ymin, maggiore[i]!);
      ymax = Math.max(ymax, maggiore[i]!);
    }
    candidate.push(areaCentroide({ anelli: [maggiore] }).y);
    for (const f of [0.5, 0.25, 0.75, 0.125, 0.375, 0.625, 0.875]) candidate.push(ymin + f * (ymax - ymin) + 1e-7);
  }
  for (const y of candidate) {
    const q = puntoSuOrizzontale(p, y);
    if (q) return { x: q.x, y: q.y, area: c.area, spostato: true };
  }
  throw new Error("nessun punto interno trovato");
}

/** UTM → WGS84 (serie di Krüger all'ordine n³, errore sub-millimetrico entro 1.000 km dal meridiano). */
export function utmInWgs84(est: number, nord: number, zona = 32): [number, number] {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const n = f / (2 - f);
  const A = (a / (1 + n)) * (1 + (n * n) / 4 + (n ** 4) / 64);
  const beta = [n / 2 - (2 * n * n) / 3 + (37 * n ** 3) / 96, (n * n) / 48 + (n ** 3) / 15, (17 * n ** 3) / 480];
  const delta = [2 * n - (2 * n * n) / 3 - 2 * n ** 3, (7 * n * n) / 3 - (8 * n ** 3) / 5, (56 * n ** 3) / 15];
  const xi = nord / (k0 * A);
  const eta = (est - 500000) / (k0 * A);
  let xi1 = xi;
  let eta1 = eta;
  for (let j = 1; j <= 3; j++) {
    xi1 -= beta[j - 1]! * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    eta1 -= beta[j - 1]! * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }
  const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
  let phi = chi;
  for (let j = 1; j <= 3; j++) phi += delta[j - 1]! * Math.sin(2 * j * chi);
  const lambda0 = ((zona * 6 - 183) * Math.PI) / 180;
  const lambda = lambda0 + Math.atan(Math.sinh(eta1) / Math.cos(xi1));
  return [(phi * 180) / Math.PI, (lambda * 180) / Math.PI];
}

/* ====================================================================================== */
/* Variazioni amministrative                                                              */
/* ====================================================================================== */

export type TipoVariazione = "CS" | "ES" | "AQES" | "AQ" | "CE" | "CECS" | "AP" | "CD";
const TIPI = new Set<string>(["CS", "ES", "AQES", "AQ", "CE", "CECS", "AP", "CD"]);

export interface Variazione {
  anno: number;
  tipo: TipoVariazione;
  codice: string;
  nome: string;
  codiceAssociato: string;
  nomeAssociato: string;
  /** Chiave d'ordine ISO; senza data di decorrenza vale 31/12 dell'anno. */
  chiave: string;
  dataEsplicita: boolean;
  origine: "istat-variazioni" | "istat-sardegna-2026";
}

const CODICE = /^\d{6}$/;

export function leggiVariazioni(testo: string): Variazione[] {
  const righe = leggiCsv(testo, ";");
  const testa = (righe[0] ?? []).map((c) => c.trim());
  const attese: [number, string][] = [
    [0, "Anno"],
    [1, "Tipo variazione"],
    [4, "Codice Comune formato alfanumerico"],
    [5, "Denominazione Comune"],
    [12, "Data decorrenza validità amministrativa"],
  ];
  for (const [i, nome] of attese) {
    if (testa[i] !== nome) throw new Error(`variazioni: colonna ${i + 1} attesa «${nome}», trovata «${testa[i] ?? ""}»`);
  }
  const out: Variazione[] = [];
  righe.slice(1).forEach((r, k) => {
    if (r.every((c) => c.trim() === "")) return;
    const dove = `variazioni: riga ${k + 2}`;
    if (r.length < 13) throw new Error(`${dove}: ${r.length} campi, attesi 14`);
    const tipo = r[1]!.trim();
    if (!TIPI.has(tipo)) throw new Error(`${dove}: tipo «${tipo}» sconosciuto`);
    const codice = r[4]!.trim();
    const codiceAssociato = r[8]!.trim();
    if (!CODICE.test(codice) || !CODICE.test(codiceAssociato)) throw new Error(`${dove}: codici «${codice}» / «${codiceAssociato}» non validi`);
    const anno = Number(r[0]);
    if (!Number.isInteger(anno) || anno < 1991) throw new Error(`${dove}: anno «${r[0]}» non valido`);
    const d = r[12]!.trim();
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
    if (d && !m) throw new Error(`${dove}: data di decorrenza «${d}» non valida`);
    out.push({
      anno,
      tipo: tipo as TipoVariazione,
      codice,
      nome: r[5]!.trim(),
      codiceAssociato,
      nomeAssociato: r[9]!.trim(),
      chiave: m ? `${m[3]}-${m[2]}-${m[1]}` : `${anno}-12-31`,
      dataEsplicita: Boolean(m),
      origine: "istat-variazioni",
    });
  });
  return out;
}

/** Tabella sarda: codice nuovo ↔ precedente, in vigore dal 1/1/2026; resa come righe AP. */
export function leggiSardegna(testo: string): Variazione[] {
  const righe = leggiCsv(testo, ";");
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const iTesta = righe.findIndex((r) => r.map(norm).includes("Codice Comune precedente"));
  if (iTesta < 0) throw new Error("tabella sarda: intestazione «Codice Comune precedente» non trovata");
  const testa = righe[iTesta]!.map(norm);
  const iNuovo = testa.indexOf("Codice Comune");
  const iNome = testa.indexOf("Denominazione Comune");
  const iPrec = testa.indexOf("Codice Comune precedente");
  if (iNuovo < 0 || iNome < 0) throw new Error("tabella sarda: colonne «Codice Comune»/«Denominazione Comune» non trovate");
  const out: Variazione[] = [];
  for (const r of righe.slice(iTesta + 1)) {
    if (r.every((c) => c.trim() === "")) continue;
    const nuovo = (r[iNuovo] ?? "").trim();
    const prec = (r[iPrec] ?? "").trim();
    if (!CODICE.test(nuovo) || !CODICE.test(prec)) throw new Error(`tabella sarda: codici «${nuovo}» / «${prec}» non validi`);
    if (nuovo === prec) continue;
    const nome = (r[iNome] ?? "").trim();
    out.push({ anno: 2026, tipo: "AP", codice: prec, nome, codiceAssociato: nuovo, nomeAssociato: nome, chiave: "2026-01-01", dataEsplicita: true, origine: "istat-sardegna-2026" });
  }
  return out;
}

/** Istante di riferimento territoriale di una fonte. */
export interface Riferimento {
  data: string;
  anno: number;
}
export const riferimento = (data: string): Riferimento => ({ data, anno: Number(data.slice(0, 4)) });

/** v è successiva al riferimento R: le righe senza data dell'anno di R contano come successive (scelta prudente). */
export function successiva(v: Variazione, R: Riferimento): boolean {
  return v.dataEsplicita ? v.chiave > R.data : v.anno >= R.anno;
}

export interface Risoluzione {
  codice: string;
  fusione: boolean;
}

/**
 * Indice delle variazioni per portare codici di date diverse ai confini 2026 (piano §3.4).
 * - partenze: ES e AP (comprese le righe sarde) per codice di partenza
 * - arriviEs: ES per codice d'arrivo; creazioni: CS per codice nuovo e AP per codice d'arrivo
 * - parziali: AQ, CE, CECS e CS senza la ES corrispondente (nuovo comune da parte di territorio)
 */
export class Territorio {
  codici2026: Set<string>;
  private partenze = new Map<string, Variazione[]>();
  private arriviEs = new Map<string, Variazione[]>();
  private creazioni = new Map<string, Variazione[]>();
  parziali: Variazione[] = [];
  ridenominazioni: Variazione[] = [];
  private cacheOrigini = new Map<string, string[]>();

  constructor(variazioni: Variazione[], codici2026: Set<string>) {
    this.codici2026 = codici2026;
    const ordinate = [...variazioni].sort((a, b) => (a.chiave < b.chiave ? -1 : a.chiave > b.chiave ? 1 : 0));
    const es = new Set(ordinate.filter((v) => v.tipo === "ES").map((v) => `${v.codice}>${v.codiceAssociato}>${v.chiave}`));
    const aggiungi = (m: Map<string, Variazione[]>, k: string, v: Variazione) => {
      const l = m.get(k);
      if (l) l.push(v);
      else m.set(k, [v]);
    };
    for (const v of ordinate) {
      switch (v.tipo) {
        case "ES":
          aggiungi(this.partenze, v.codice, v);
          aggiungi(this.arriviEs, v.codiceAssociato, v);
          break;
        case "AP":
          aggiungi(this.partenze, v.codice, v);
          aggiungi(this.creazioni, v.codiceAssociato, v);
          break;
        case "CS":
          aggiungi(this.creazioni, v.codice, v);
          if (!es.has(`${v.codiceAssociato}>${v.codice}>${v.chiave}`)) this.parziali.push(v);
          break;
        case "AQ":
        case "CE":
        case "CECS":
          this.parziali.push(v);
          break;
        case "CD":
          this.ridenominazioni.push(v);
          break;
        case "AQES":
          break; // l'incorporazione è già descritta dalla riga ES del comune soppresso
      }
    }
  }

  /** Codice a cui `codice` arriva seguendo soppressioni e cambi di codice dopo R (o dopo la riga `da`). */
  risolvi(codice: string, da: Riferimento | Variazione, inclusivo = false): Risoluzione {
    let c = codice;
    let fusione = false;
    let dopo = (v: Variazione) => ("dataEsplicita" in da ? (inclusivo ? v.chiave >= da.chiave : v.chiave > da.chiave) : successiva(v, da));
    for (let passi = 0; ; passi++) {
      if (passi > 100) throw new Error(`variazioni: ciclo a partire dal codice ${codice}`);
      const v = (this.partenze.get(c) ?? []).find(dopo);
      if (!v) return { codice: c, fusione };
      if (v.tipo === "ES") fusione = true;
      c = v.codiceAssociato;
      const chiave = v.chiave;
      dopo = (x) => x.chiave > chiave;
    }
  }

  /** Codici esistenti al riferimento R il cui territorio compone oggi il comune `codice2026`. */
  origini(codice2026: string, R: Riferimento): string[] {
    const k = `${codice2026}@${R.data}`;
    const inCache = this.cacheOrigini.get(k);
    if (inCache) return inCache;
    const foglie = new Set<string>();
    const visita = (c: string, fino: string | null, profondita: number): void => {
      if (profondita > 100) throw new Error(`variazioni: ciclo risalendo dal codice ${codice2026}`);
      const inFinestra = (v: Variazione) => successiva(v, R) && (fino === null || v.chiave < fino);
      const creazione = (this.creazioni.get(c) ?? []).filter(inFinestra).at(-1);
      if (creazione?.tipo === "AP") visita(creazione.codice, creazione.chiave, profondita + 1);
      if (!creazione) foglie.add(c);
      for (const v of this.arriviEs.get(c) ?? []) {
        if (inFinestra(v) && (!creazione || v.chiave >= creazione.chiave)) visita(v.codice, v.chiave, profondita + 1);
      }
    };
    visita(codice2026, null, 0);
    const out = [...foglie].sort();
    this.cacheOrigini.set(k, out);
    return out;
  }

  /** Comuni 2026 toccati da scambi parziali di territorio dopo R, con le righe responsabili. */
  scambiParziali(R: Riferimento): Map<string, Variazione[]> {
    const out = new Map<string, Variazione[]>();
    for (const v of this.parziali) {
      if (!successiva(v, R)) continue;
      for (const c of [v.codice, v.codiceAssociato]) {
        const k = this.risolvi(c, v, true).codice;
        const l = out.get(k);
        if (l) l.push(v);
        else out.set(k, [v]);
      }
    }
    return out;
  }

  /** true se il comune (o la catena dei suoi cambi di codice) è stato costituito (CS) dopo R. */
  natoDopo(codice2026: string, R: Riferimento): boolean {
    const prima = (v: Variazione, limite: string | null) => limite === null || v.chiave < limite;
    let c = codice2026;
    let fino: string | null = null;
    for (let passi = 0; passi < 100; passi++) {
      const limite: string | null = fino;
      const creazione: Variazione | undefined = (this.creazioni.get(c) ?? []).filter((v) => successiva(v, R) && prima(v, limite)).at(-1);
      if (!creazione) return false;
      if (creazione.tipo === "CS") return true;
      c = creazione.codice;
      fino = creazione.chiave;
    }
    throw new Error(`variazioni: ciclo risalendo dal codice ${codice2026}`);
  }

  /** Tutti i codici precedenti del comune lungo i cambi di codice, a qualunque data. */
  codiciStorici(codice2026: string): string[] {
    const visti = new Set<string>([codice2026]);
    const coda = [codice2026];
    while (coda.length) {
      const c = coda.pop()!;
      for (const v of this.creazioni.get(c) ?? []) {
        if (v.tipo === "AP" && !visti.has(v.codice)) {
          visti.add(v.codice);
          coda.push(v.codice);
        }
      }
    }
    return [...visti];
  }

  /** Codici non più validi → codice 2026 (cambi di codice e soppressioni). */
  alias(): Map<string, { a: string; motivo: MotivoAlias; dal: string; chiave: string }> {
    const out = new Map<string, { a: string; motivo: MotivoAlias; dal: string; chiave: string }>();
    for (const [codice, righe] of this.partenze) {
      if (this.codici2026.has(codice)) continue;
      for (const v of righe) {
        const r = this.risolvi(v.codiceAssociato, v);
        if (!this.codici2026.has(r.codice)) continue;
        const prec = out.get(codice);
        if (prec && prec.chiave > v.chiave) continue;
        out.set(codice, {
          a: r.codice,
          motivo: v.tipo === "ES" || r.fusione ? "fusione" : "cambio_codice",
          dal: v.dataEsplicita ? v.chiave : String(v.anno),
          chiave: v.chiave,
        });
      }
    }
    return out;
  }
}

export interface EsitoPortaAl2026<T> {
  valori: Map<string, { valore: T; derivazione?: Derivazione }>;
  scarti: Record<string, string[]>;
  errori: string[];
}

/**
 * Porta i valori di una fonte (codici al riferimento R) ai codici 2026 con le regole §3.4:
 * stesso territorio → passa; fusione integrale → somma dei fatti additivi (dichiarata) se
 * tutte le origini hanno il dato; scambio parziale dopo R → nessun fatto additivo; fatti non
 * additivi mai derivati. Un codice che non si risolve è un errore di gate.
 */
export function portaAl2026<T>(
  territorio: Territorio,
  valoriFonte: Map<string, T>,
  R: Riferimento,
  opzioni: { additivo: boolean; somma?: (valori: T[]) => T; nomeStorico: (codice: string) => string },
): EsitoPortaAl2026<T> {
  const errori: string[] = [];
  const scarti: Record<string, string[]> = {};
  const scarta = (motivo: string, voce: string) => (scarti[motivo] ??= []).push(voce);
  const gruppi = new Map<string, string[]>();
  for (const c of valoriFonte.keys()) {
    if (!CODICE.test(c)) {
      errori.push(`codice «${c}» non valido`);
      continue;
    }
    const k = territorio.risolvi(c, R).codice;
    if (!territorio.codici2026.has(k)) {
      errori.push(`codice ${c} non si risolve in un comune al ${RIFERIMENTO_TERRITORIALE} (arriva a ${k})`);
      continue;
    }
    if (!territorio.origini(k, R).includes(c)) {
      errori.push(`codice ${c} non esisteva al ${R.data} secondo le variazioni Istat (comune ${k})`);
      continue;
    }
    const g = gruppi.get(k);
    if (g) g.push(c);
    else gruppi.set(k, [c]);
  }
  const scambi = opzioni.additivo ? territorio.scambiParziali(R) : new Map<string, Variazione[]>();
  const valori = new Map<string, { valore: T; derivazione?: Derivazione }>();
  for (const [k, presenti] of [...gruppi].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const origini = territorio.origini(k, R);
    if (opzioni.additivo && scambi.has(k)) {
      scarta("scambio_parziale", k);
      continue;
    }
    if (origini.length === 1) {
      valori.set(k, { valore: valoriFonte.get(presenti[0]!)! });
      continue;
    }
    if (!opzioni.additivo || !opzioni.somma) {
      scarta("fusione_dopo_riferimento", k);
      continue;
    }
    const mancanti = origini.filter((o) => !valoriFonte.has(o));
    if (mancanti.length) {
      scarta("origine_senza_dato", `${k} (${mancanti.join(", ")})`);
      continue;
    }
    valori.set(k, {
      valore: opzioni.somma(origini.map((o) => valoriFonte.get(o)!)),
      derivazione: { regola: "somma_fusione", da: origini, nomi: origini.map(opzioni.nomeStorico) },
    });
  }
  return { valori, scarti, errori };
}

/* ====================================================================================== */
/* Fonti statistiche                                                                      */
/* ====================================================================================== */

export interface ValoriFonte<T> {
  valori: Map<string, T>;
  nomi: Map<string, string>;
  righe: number;
}

/** POSAS: totale dalla riga «Età 999», verificato uguale alla somma delle età. */
export function leggiPosas(testo: string, riferimentoAtteso: string): ValoriFonte<number> {
  const righe = leggiCsv(testo, ";");
  const titolo = righe[0]?.[0] ?? "";
  if (/stima/i.test(titolo)) throw new Error(`POSAS: dato stimato, non definitivo («${titolo}»)`);
  if (!titolo.includes(`al ${riferimentoAtteso}`)) throw new Error(`POSAS: titolo «${titolo}» non riferito al ${riferimentoAtteso}`);
  const testa = righe[1] ?? [];
  const iCodice = testa.indexOf("Codice comune");
  const iNome = testa.indexOf("Comune");
  const iEta = testa.indexOf("Età");
  const iTotale = testa.lastIndexOf("Totale");
  if (iCodice < 0 || iEta < 0 || iTotale < 0 || iNome < 0) throw new Error("POSAS: colonne «Codice comune», «Comune», «Età», «Totale» non trovate");
  const totali = new Map<string, number>();
  const somme = new Map<string, number>();
  const nomi = new Map<string, string>();
  let n = 0;
  for (const r of righe.slice(2)) {
    if (r.length === 1 && r[0] === "") continue;
    n++;
    const codice = r[iCodice]!;
    const eta = Number(r[iEta]);
    const totale = Number(r[iTotale]);
    if (!CODICE.test(codice) || !Number.isInteger(eta) || !Number.isInteger(totale) || totale < 0 || r[iTotale] === "") {
      throw new Error(`POSAS: riga ${n + 2} non valida (${r.slice(0, 3).join(";")})`);
    }
    nomi.set(codice, r[iNome]!);
    if (eta === 999) {
      if (totali.has(codice)) throw new Error(`POSAS: totale duplicato per ${codice}`);
      totali.set(codice, totale);
    } else somme.set(codice, (somme.get(codice) ?? 0) + totale);
  }
  for (const [codice, t] of totali) {
    if (somme.get(codice) !== t) throw new Error(`POSAS: ${codice} totale ${t} diverso dalla somma delle età ${somme.get(codice)}`);
    if (t <= 0 || t > 3_000_000) throw new Error(`POSAS: ${codice} popolazione ${t} fuori intervallo`);
  }
  for (const codice of somme.keys()) if (!totali.has(codice)) throw new Error(`POSAS: ${codice} senza riga «Età 999»`);
  return { valori: totali, nomi, righe: n };
}

export const ZONA_SISMICA = /^[1-4][A-Da-dS]?(-[1-4][A-Da-dS]?)*$/;

export function leggiSismica(testo: string): ValoriFonte<string> {
  const righe = leggiCsv(testo, ";");
  const testa = (righe[0] ?? []).join(";");
  if (testa !== "REGIONE;PROV_CITTA_METROPOLITANA;SIGLA_PROV;COMUNE;COD_ISTAT_COMUNE;ZONA_SISMICA") {
    throw new Error(`sismica: intestazione inattesa «${testa}»`);
  }
  const valori = new Map<string, string>();
  const nomi = new Map<string, string>();
  let n = 0;
  for (const r of righe.slice(1)) {
    if (r.length === 1 && r[0] === "") continue;
    n++;
    const grezzo = (r[4] ?? "").trim();
    if (!/^\d{1,6}$/.test(grezzo)) throw new Error(`sismica: riga ${n + 1}, codice «${grezzo}» non valido`);
    const codice = grezzo.padStart(6, "0");
    const zona = (r[5] ?? "").trim();
    if (!ZONA_SISMICA.test(zona)) throw new Error(`sismica: ${codice} zona «${zona}» fuori formato`);
    if (valori.has(codice)) throw new Error(`sismica: codice ${codice} duplicato`);
    valori.set(codice, zona);
    nomi.set(codice, (r[3] ?? "").trim());
  }
  return { valori, nomi, righe: n };
}

/* ---------- DPR 412/1993 allegato A ---------- */

export interface RigaDpr412 {
  sigla: string;
  zona: string;
  gradiGiorno: number;
  altitudine: number;
  nome: string;
  testo: string;
  zeriOcr: boolean;
}

const ENTITA: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodificaEntita(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tutto, e: string) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : tutto;
    }
    return ENTITA[e.toLowerCase()] ?? tutto;
  });
}

/** Riga dell'allegato: SIGLA ZONA GRADI_GIORNO ALTITUDINE NOME; l'OCR della GU rende alcuni zeri con «O». */
const RIGA_DPR412 = /^([A-Z]{2}) ([A-F]) ([\dO]{3,5}) (-?[\dO]{1,4}) (.+)$/;

export function leggiDpr412(html: string): RigaDpr412[] {
  const testo = decodificaEntita(html.replace(/<[^>]*>/g, ""));
  const out: RigaDpr412[] = [];
  for (const riga of testo.split(/\r?\n/)) {
    const u = riga.replace(/\s+/g, " ").trim();
    const m = RIGA_DPR412.exec(u);
    if (!m) continue;
    const gg = m[3]!;
    const alt = m[4]!;
    out.push({
      sigla: m[1]!,
      zona: m[2]!,
      gradiGiorno: Number(gg.replaceAll("O", "0")),
      altitudine: Number(alt.replaceAll("O", "0")),
      nome: m[5]!,
      testo: u,
      zeriOcr: gg.includes("O") || alt.includes("O"),
    });
  }
  return out;
}

/** Soglie dell'art. 2 c. 1 DPR 412/1993. */
export function zonaDaGradiGiorno(gg: number): string {
  if (gg <= 600) return "A";
  if (gg <= 900) return "B";
  if (gg <= 1400) return "C";
  if (gg <= 2100) return "D";
  if (gg <= 3000) return "E";
  return "F";
}

export const INTERVALLO_GRADI_GIORNO: [number, number] = [500, 5200];
export const INTERVALLO_ALTITUDINE: [number, number] = [-5, 2100];

export interface ComuneAnagrafica {
  codice: string;
  nome: string;
  nomeAltraLingua?: string;
  sigla: string;
}

/**
 * Abbina le righe dell'allegato A ai comuni 2026 per nome (attuale, parti bilingui, nomi
 * precedenti dopo il 1993) e sigla (attuale o storica). Regole §3.4.4-5: zona incoerente,
 * omonimi non risolti, comuni nati da fusione dopo il 14/10/1993 → nessun fatto.
 */
export function abbinaDpr412(
  righe: RigaDpr412[],
  anagrafica: Map<string, ComuneAnagrafica>,
  territorio: Territorio,
  siglePerProvincia: Map<string, string[]>,
): { clima: Map<string, [string, number, number]>; scarti: Record<string, string[]> } {
  const R = riferimento(FONTI["dpr412-allegato-a"].riferimentoTerritoriale);
  const scarti: Record<string, string[]> = {};
  const scarta = (motivo: string, voce: string) => (scarti[motivo] ??= []).push(voce);
  const indice = new Map<string, Set<string>>();
  const indicizza = (nome: string, codice: string) => {
    const k = normalizzaNome(nome);
    if (!k) return;
    const s = indice.get(k);
    if (s) s.add(codice);
    else indice.set(k, new Set([codice]));
  };
  for (const c of anagrafica.values()) {
    indicizza(c.nome, c.codice);
    for (const parte of c.nome.split("/")) indicizza(parte, c.codice);
    if (c.nomeAltraLingua) indicizza(c.nomeAltraLingua, c.codice);
  }
  for (const v of territorio.ridenominazioni) {
    if (!successiva(v, R)) continue;
    const k = territorio.risolvi(v.codice, v, true).codice;
    if (anagrafica.has(k)) indicizza(v.nome, k);
  }
  const sigleDi = (codice: string): Set<string> => {
    const s = new Set([anagrafica.get(codice)!.sigla]);
    for (const c of territorio.codiciStorici(codice)) {
      const p = c.slice(0, 3);
      for (const sigla of [...(siglePerProvincia.get(p) ?? []), ...(SIGLE_STORICHE[p] ?? [])]) s.add(sigla);
    }
    return s;
  };
  const assegnate = new Map<string, RigaDpr412[]>();
  for (const r of righe) {
    if (zonaDaGradiGiorno(r.gradiGiorno) !== r.zona) {
      scarta("zona_incoerente", r.testo);
      continue;
    }
    if (r.gradiGiorno < INTERVALLO_GRADI_GIORNO[0] || r.gradiGiorno > INTERVALLO_GRADI_GIORNO[1] || r.altitudine < INTERVALLO_ALTITUDINE[0] || r.altitudine > INTERVALLO_ALTITUDINE[1]) {
      scarta("fuori_intervallo", r.testo);
      continue;
    }
    const candidati = [...(indice.get(normalizzaNome(r.nome)) ?? [])];
    if (!candidati.length) {
      scarta("non_trovato", r.testo);
      continue;
    }
    const conSigla = candidati.filter((c) => sigleDi(c).has(r.sigla));
    if (conSigla.length !== 1) {
      scarta(conSigla.length === 0 && candidati.length === 1 ? "sigla_diversa" : "nome_ambiguo", r.testo);
      continue;
    }
    const codice = conSigla[0]!;
    if (territorio.natoDopo(codice, R)) {
      scarta("comune_nato_dopo_1993", `${codice} ${r.testo}`);
      continue;
    }
    const l = assegnate.get(codice);
    if (l) l.push(r);
    else assegnate.set(codice, [r]);
  }
  const clima = new Map<string, [string, number, number]>();
  for (const [codice, l] of [...assegnate].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (l.length > 1) {
      for (const r of l) scarta("righe_multiple", `${codice} ${r.testo}`);
      continue;
    }
    clima.set(codice, [l[0]!.zona, l[0]!.gradiGiorno, l[0]!.altitudine]);
  }
  return { clima, scarti };
}

/* ====================================================================================== */
/* Cache, download e manifest                                                             */
/* ====================================================================================== */

export interface VoceManifest {
  stato: "ok" | "non_raggiungibile";
  file: { nome: string; url: string; sha256: string; byte: number; ultimaModifica?: string }[];
  scaricatoIl?: string;
  ultimoTentativo: string;
  errore?: string;
}
export type Manifest = Partial<Record<IdFonte, VoceManifest>>;

const attendi = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const messaggio = (e: unknown): string => {
  if (e instanceof Error) {
    const causa = (e as Error & { cause?: { code?: string; message?: string } }).cause;
    return causa ? `${e.message} (${causa.code ?? causa.message ?? "causa ignota"})` : e.message;
  }
  return String(e);
};

async function scaricaUnaVolta(url: string, destinazione: string): Promise<{ sha256: string; byte: number; ultimaModifica?: string }> {
  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(new Error(`nessuna risposta in ${TIMEOUT_RISPOSTA_MS / 1000} s`)), TIMEOUT_RISPOSTA_MS);
  const parte = `${destinazione}.part`;
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    clearTimeout(timer);
    timer = setTimeout(() => ctrl.abort(new Error(`download oltre ${TIMEOUT_CORPO_MS / 60000} minuti`)), TIMEOUT_CORPO_MS);
    const hash = createHash("sha256");
    let byte = 0;
    const out = createWriteStream(parte);
    try {
      for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
        hash.update(chunk);
        byte += chunk.length;
        if (!out.write(chunk)) await once(out, "drain");
      }
      await new Promise<void>((ok, ko) => out.end((e?: Error | null) => (e ? ko(e) : ok())));
    } catch (e) {
      out.destroy();
      throw e;
    }
    if (byte === 0) throw new Error("risposta vuota");
    return { sha256: hash.digest("hex"), byte, ultimaModifica: res.headers.get("last-modified") ?? undefined };
  } catch (e) {
    rmSync(parte, { force: true });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function scarica(url: string, destinazione: string): Promise<{ sha256: string; byte: number; ultimaModifica?: string }> {
  let ultimo: unknown;
  for (let t = 1; t <= TENTATIVI; t++) {
    try {
      return await scaricaUnaVolta(url, destinazione);
    } catch (e) {
      ultimo = e;
      if (t < TENTATIVI) {
        console.error(`  … tentativo ${t}/${TENTATIVI} fallito (${messaggio(e)}), riprovo`);
        await attendi(ATTESE_MS[t - 1]!);
      }
    }
  }
  throw new Error(messaggio(ultimo));
}

export const sha256File = (percorso: string): string => createHash("sha256").update(readFileSync(percorso)).digest("hex");

export function leggiManifest(cache: string): Manifest {
  const p = join(cache, "manifest.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Manifest;
  } catch (e) {
    throw new Error(`manifest della cache illeggibile (${p}): ${messaggio(e)}`);
  }
}

/** La copia in cache è utilizzabile: file presenti, sha uguali al manifest, zip integri. */
function cacheValida(cache: string, id: IdFonte, voce: VoceManifest | undefined): string | null {
  if (!voce || voce.stato !== "ok" || voce.file.length !== FONTI[id].file.length) return "nessuna copia in cache";
  for (const f of voce.file) {
    const p = join(cache, f.nome);
    if (!existsSync(p)) return `${f.nome} assente dalla cache`;
    if (sha256File(p) !== f.sha256) return `${f.nome}: sha256 diverso dal manifest (cache corrotta)`;
    if (f.nome.endsWith(".zip")) {
      try {
        execFileSync("unzip", ["-tqq", p], { stdio: "pipe" });
      } catch {
        return `${f.nome}: zip corrotto (unzip -t)`;
      }
    }
  }
  return null;
}

/** Aggiorna la cache: scarica ogni fonte (o usa la copia valida) e scrive il manifest. */
export async function preparaCache(cache: string, offline: boolean, log: (s: string) => void = console.log): Promise<Manifest> {
  mkdirSync(cache, { recursive: true });
  const manifest = leggiManifest(cache);
  const ora = new Date().toISOString();
  for (const id of Object.keys(FONTI) as IdFonte[]) {
    const def = FONTI[id];
    const precedente = manifest[id];
    if (offline) {
      // in sola lettura: il manifest su disco non si tocca
      const problema = cacheValida(cache, id, precedente);
      if (problema) manifest[id] = { stato: "non_raggiungibile", file: [], ultimoTentativo: ora, errore: `--offline: ${problema}` };
      log(`${problema ? "✗" : "✓"} ${id}: ${problema ? `--offline, ${problema}` : `dalla cache del ${precedente!.scaricatoIl}`}`);
      continue;
    }
    try {
      const file: VoceManifest["file"] = [];
      for (const f of def.file) {
        const esito = await scarica(f.url, join(cache, f.nome));
        file.push({ nome: f.nome, url: f.url, ...esito });
      }
      for (const f of file) {
        renameSync(join(cache, `${f.nome}.part`), join(cache, f.nome));
        if (f.nome.endsWith(".zip")) {
          try {
            execFileSync("unzip", ["-tqq", join(cache, f.nome)], { stdio: "pipe" });
          } catch {
            throw new Error(`${f.nome}: zip scaricato ma corrotto (unzip -t)`);
          }
        }
      }
      const cambiato = precedente?.file.map((x) => x.sha256).join() !== file.map((x) => x.sha256).join();
      manifest[id] = { stato: "ok", file, scaricatoIl: ora, ultimoTentativo: ora };
      log(`✓ ${id}: scaricato (${file.map((x) => `${(x.byte / 1e6).toFixed(1)} MB`).join(" + ")})${precedente?.stato === "ok" && cambiato ? " — CAMBIATO rispetto alla copia precedente" : ""}`);
    } catch (e) {
      for (const f of def.file) rmSync(join(cache, `${f.nome}.part`), { force: true });
      const problema = cacheValida(cache, id, precedente);
      if (!problema) {
        manifest[id] = { ...precedente!, ultimoTentativo: ora, errore: messaggio(e) };
        log(`! ${id}: non raggiungibile (${messaggio(e)}), uso la copia in cache del ${precedente!.scaricatoIl}`);
      } else {
        manifest[id] = { stato: "non_raggiungibile", file: [], ultimoTentativo: ora, errore: messaggio(e) };
        log(`✗ ${id}: non raggiungibile (${messaggio(e)}) e ${problema}`);
      }
    }
    writeFileSync(join(cache, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  }
  return manifest;
}

function membroZip(zip: string, membro: string): Buffer {
  try {
    return execFileSync("unzip", ["-p", zip, membro], { maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    throw new Error(`${zip}: membro «${membro}» non estraibile (${messaggio(e)})`);
  }
}

/* ====================================================================================== */
/* Costruzione del dataset                                                                */
/* ====================================================================================== */

const arrotonda = (x: number, decimali: number) => Math.round(x * 10 ** decimali) / 10 ** decimali;
export const RIQUADRO_ITALIA = { lat: [35.2, 47.2], lon: [6.5, 18.6] } as const;
export const INTERVALLO_NUMERO_COMUNI: [number, number] = [7700, 8100];

export interface EsitoCostruzione {
  dataset: DatasetFattiComuni;
  errori: string[];
  note: string[];
}

export function costruisciDataset(cache: string, manifest: Manifest, generatoIl: string): EsitoCostruzione {
  const errori: string[] = [];
  const note: string[] = [];
  const presente = (id: IdFonte) => manifest[id]?.stato === "ok";
  const percorso = (id: IdFonte, i = 0) => join(cache, FONTI[id].file[i]!.nome);
  const mancanti = (Object.keys(FONTI) as IdFonte[]).filter((id) => !presente(id));
  const strutturaliMancanti = mancanti.filter((id) => FONTI[id].strutturale);
  if (strutturaliMancanti.length) throw new Error(`fonti strutturali mancanti: ${strutturaliMancanti.join(", ")}`);
  const righePerFonte: Partial<Record<IdFonte, number>> = {};

  /* ---- anagrafica e centroidi 2026 ---- */
  const zipConfini = percorso("istat-confini-2026");
  const dbf = leggiDbf(membroZip(zipConfini, ZIP.comuniDbf), "comuni DBF");
  const shp = leggiShp(membroZip(zipConfini, ZIP.comuniShp), "comuni SHP");
  const prov = leggiDbf(membroZip(zipConfini, ZIP.provinceDbf), "province DBF");
  righePerFonte["istat-confini-2026"] = dbf.length;
  if (dbf.length !== shp.length) throw new Error(`confini: ${dbf.length} record DBF e ${shp.length} poligoni`);
  if (dbf.length < INTERVALLO_NUMERO_COMUNI[0] || dbf.length > INTERVALLO_NUMERO_COMUNI[1]) {
    throw new Error(`confini: ${dbf.length} comuni, fuori dall'intervallo atteso ${INTERVALLO_NUMERO_COMUNI.join("-")}`);
  }
  const siglaPerUts = new Map(prov.map((p) => [p.COD_UTS!, p.SIGLA!]));
  const siglePerProvincia = new Map<string, string[]>();
  for (const p of prov) {
    const k = p.COD_PROV!.padStart(3, "0");
    siglePerProvincia.set(k, [...(siglePerProvincia.get(k) ?? []), p.SIGLA!]);
  }
  const anagrafica = new Map<string, ComuneAnagrafica>();
  const comuni: Record<string, RecordComune> = {};
  let spostati = 0;
  dbf.forEach((r, i) => {
    const codice = r.PRO_COM_T ?? "";
    const sigla = siglaPerUts.get(r.COD_UTS ?? "") ?? "";
    if (!CODICE.test(codice)) return void errori.push(`confini: record ${i + 1} con codice «${codice}»`);
    if (anagrafica.has(codice)) return void errori.push(`confini: codice ${codice} duplicato`);
    if (!r.COMUNE) return void errori.push(`confini: ${codice} senza nome`);
    if (!/^[A-Z]{2}$/.test(sigla)) return void errori.push(`confini: ${codice} senza sigla di provincia (COD_UTS ${r.COD_UTS})`);
    const nomeAltraLingua = r.COMUNE_A || undefined;
    anagrafica.set(codice, { codice, nome: r.COMUNE, nomeAltraLingua, sigla });
    let punto: ReturnType<typeof puntoInterno>;
    try {
      punto = puntoInterno(shp[i]!);
    } catch (e) {
      return void errori.push(`confini: ${codice} ${r.COMUNE}: ${messaggio(e)}`);
    }
    if (punto.spostato) spostati++;
    const [lat, lon] = utmInWgs84(punto.x, punto.y);
    if (lat < RIQUADRO_ITALIA.lat[0] || lat > RIQUADRO_ITALIA.lat[1] || lon < RIQUADRO_ITALIA.lon[0] || lon > RIQUADRO_ITALIA.lon[1]) {
      return void errori.push(`confini: ${codice} ${r.COMUNE} centro ${lat},${lon} fuori dall'Italia`);
    }
    comuni[codice] = {
      nome: r.COMUNE,
      sigla,
      ...(nomeAltraLingua ? { nomeAltraLingua } : {}),
      centro: [arrotonda(lat, 4), arrotonda(lon, 4)],
      raggioKm: arrotonda(Math.sqrt(punto.area / Math.PI) / 1000, 2),
    };
  });
  note.push(`centri: ${Object.keys(comuni).length} comuni, ${spostati} con centroide d'area fuori dal comune sostituito dal punto interno`);

  /* ---- variazioni ---- */
  const variazioni = leggiVariazioni(daWindows1252(membroZip(percorso("istat-variazioni"), "*.csv")));
  const sarde = leggiSardegna(daWindows1252(membroZip(percorso("istat-sardegna-2026"), "*.csv")));
  righePerFonte["istat-variazioni"] = variazioni.length;
  righePerFonte["istat-sardegna-2026"] = sarde.length;
  const codici2026 = new Set(anagrafica.keys());
  for (const v of sarde) {
    if (!codici2026.has(v.codiceAssociato)) errori.push(`tabella sarda: codice nuovo ${v.codiceAssociato} (${v.nome}) assente dai confini 2026`);
    if (codici2026.has(v.codice)) errori.push(`tabella sarda: codice precedente ${v.codice} ancora presente nei confini 2026`);
  }
  const territorio = new Territorio([...variazioni, ...sarde], codici2026);
  const nomiStorici = new Map<string, string>();
  for (const v of [...variazioni, ...sarde]) {
    nomiStorici.set(v.codice, v.nome);
    if (v.nomeAssociato) nomiStorici.set(v.codiceAssociato, v.nomeAssociato);
  }
  const nomeStorico = (c: string) => nomiStorici.get(c) ?? anagrafica.get(c)?.nome ?? c;

  for (const v of territorio.ridenominazioni) {
    const k = territorio.risolvi(v.codice, v, true).codice;
    const rec = comuni[k];
    if (!rec || normalizzaNome(v.nome) === normalizzaNome(rec.nome)) continue;
    const l = (rec.nomiPrecedenti ??= []);
    if (!l.includes(v.nome)) l.push(v.nome);
  }

  const scarti: Record<string, Record<string, string[]>> = {};
  const unisciScarti = (campo: string, s: Record<string, string[]>) => {
    for (const [motivo, voci] of Object.entries(s)) ((scarti[campo] ??= {})[motivo] ??= []).push(...voci);
  };
  const applica = <T>(campo: CampoAdditivo | "sismica", id: IdFonte, letti: ValoriFonte<T>, opzioni: { additivo: boolean; somma?: (v: T[]) => T }) => {
    righePerFonte[id] = letti.righe;
    const esito = portaAl2026(territorio, letti.valori, riferimento(FONTI[id].riferimentoTerritoriale), { ...opzioni, nomeStorico });
    for (const e of esito.errori) errori.push(`${id}: ${e}`);
    unisciScarti(campo, esito.scarti);
    for (const [k, { valore, derivazione }] of esito.valori) {
      const rec = comuni[k];
      if (!rec) continue;
      (rec as unknown as Record<string, unknown>)[campo] = valore;
      if (derivazione && campo !== "sismica") (rec.derivati ??= {})[campo] = derivazione;
    }
  };

  /* ---- popolazione ---- */
  if (presente("istat-posas-2025")) {
    const letti = leggiPosas(daUtf8(membroZip(percorso("istat-posas-2025"), "*.csv"), "POSAS"), FONTI["istat-posas-2025"].riferimento);
    applica("popolazione", "istat-posas-2025", letti, { additivo: true, somma: (v) => v.reduce((a, b) => a + b, 0) });
  }

  /* ---- sismica ---- */
  if (presente("dpc-sismica-2025")) {
    const letti = leggiSismica(daUtf8(readFileSync(percorso("dpc-sismica-2025")), "sismica"));
    applica("sismica", "dpc-sismica-2025", letti, { additivo: false });
  }

  /* ---- zona climatica ---- */
  if (presente("dpr412-allegato-a")) {
    const righe = FONTI["dpr412-allegato-a"].file.flatMap((_, i) => leggiDpr412(daUtf8(readFileSync(percorso("dpr412-allegato-a", i)), "allegato A")));
    righePerFonte["dpr412-allegato-a"] = righe.length;
    if (righe.length < 8000) errori.push(`allegato A: solo ${righe.length} righe estratte (attese oltre 8.000): parser rotto o pagina cambiata`);
    const { clima, scarti: s } = abbinaDpr412(righe, anagrafica, territorio, siglePerProvincia);
    unisciScarti("clima", s);
    for (const [k, v] of clima) if (comuni[k]) comuni[k]!.clima = v;
    note.push(`allegato A: ${righe.length} righe (${righe.filter((r) => r.zeriOcr).length} con zeri OCR «O»), ${clima.size} comuni abbinati`);
  }

  /* ---- alias ---- */
  const alias: DatasetFattiComuni["alias"] = {};
  for (const [codice, a] of [...territorio.alias()].sort(([x], [y]) => (x < y ? -1 : 1))) alias[codice] = { a: a.a, motivo: a.motivo, dal: a.dal };

  /* ---- intestazione ---- */
  const fonti: DatasetFattiComuni["fonti"] = {};
  for (const id of Object.keys(FONTI) as IdFonte[]) {
    const { file, strutturale: _s, ...def } = FONTI[id];
    const voce = manifest[id];
    fonti[id] = {
      ...def,
      stato: presente(id) ? "ok" : "non_raggiungibile",
      ...(presente(id)
        ? {
            file: voce!.file.map((f) => ({ sha256: f.sha256, byte: f.byte, ...(f.ultimaModifica ? { ultimaModifica: f.ultimaModifica } : {}) })),
            scaricatoIl: voce!.scaricatoIl,
            righe: righePerFonte[id],
          }
        : {}),
    };
    void file;
  }
  const campiCopertura = ["centro", "popolazione", "edificiEpoca", "clima", "sismica", "famiglie"] as const;
  const copertura: Record<string, number> = { comuni: Object.keys(comuni).length };
  for (const c of campiCopertura) copertura[c] = Object.values(comuni).filter((r) => r[c] !== undefined).length;

  const ordinati: Record<string, RecordComune> = {};
  for (const k of Object.keys(comuni).sort()) ordinati[k] = comuni[k]!;
  const dataset: DatasetFattiComuni = {
    schema: 1,
    generatoIl,
    riferimentoTerritoriale: RIFERIMENTO_TERRITORIALE,
    completo: mancanti.length === 0,
    fontiMancanti: mancanti,
    fonti,
    fatti: FATTI,
    copertura,
    scarti,
    alias,
    comuni: ordinati,
  };
  return { dataset, errori, note };
}

/** Un comune e un alias per riga: il diff annuale si legge riga per riga. */
export function serializzaDataset(ds: DatasetFattiComuni): string {
  const parti: string[] = [];
  for (const [chiave, valore] of Object.entries(ds)) {
    if (chiave === "comuni" || chiave === "alias") {
      const voci = Object.entries(valore as Record<string, unknown>).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
      parti.push(`  ${JSON.stringify(chiave)}: {\n${voci.join(",\n")}\n  }`);
    } else {
      parti.push(`  ${JSON.stringify(chiave)}: ${JSON.stringify(valore, null, 2).replace(/\n/g, "\n  ")}`);
    }
  }
  return `{\n${parti.join(",\n")}\n}\n`;
}

/** Report delle differenze rispetto al dataset precedente. */
export function confrontaDataset(prec: DatasetFattiComuni | null, nuovo: DatasetFattiComuni): string[] {
  if (!prec) return ["nessun dataset precedente"];
  const righe: string[] = [];
  const a = new Set(Object.keys(prec.comuni));
  const b = new Set(Object.keys(nuovo.comuni));
  const entrati = [...b].filter((k) => !a.has(k));
  const usciti = [...a].filter((k) => !b.has(k));
  righe.push(`comuni: ${a.size} → ${b.size} (entrati ${entrati.length}${entrati.length ? `: ${entrati.slice(0, 10).join(", ")}` : ""}; usciti ${usciti.length}${usciti.length ? `: ${usciti.slice(0, 10).join(", ")}` : ""})`);
  const campi = new Set<string>();
  for (const r of [...Object.values(prec.comuni), ...Object.values(nuovo.comuni)]) for (const c of Object.keys(r)) campi.add(c);
  for (const c of [...campi].sort()) {
    let cambiati = 0;
    for (const k of b) {
      if (!a.has(k)) continue;
      const x = (prec.comuni[k] as unknown as Record<string, unknown>)[c];
      const y = (nuovo.comuni[k] as unknown as Record<string, unknown>)[c];
      if (JSON.stringify(x) !== JSON.stringify(y)) cambiati++;
    }
    righe.push(`  ${c}: ${cambiati} comuni cambiati · copertura ${prec.copertura[c] ?? "—"} → ${nuovo.copertura[c] ?? "—"}`);
  }
  for (const [id, f] of Object.entries(nuovo.fonti)) {
    const p = prec.fonti[id];
    const shaP = p?.file?.map((x) => x.sha256).join() ?? "";
    const shaN = f.file?.map((x) => x.sha256).join() ?? "";
    if (shaP !== shaN) righe.push(`  fonte ${id}: ${p ? "file cambiato" : "nuova"} (${p?.stato ?? "—"} → ${f.stato})`);
  }
  return righe;
}

/* ====================================================================================== */
/* CLI                                                                                    */
/* ====================================================================================== */

export async function aggiorna(opzioni: { cache: string; dataset: string; offline: boolean; soloVerifica: boolean; parziale: boolean; log?: (s: string) => void }): Promise<boolean> {
  const log = opzioni.log ?? console.log;
  log(`cache: ${opzioni.cache}${opzioni.offline ? " (offline)" : ""}`);
  const manifest = await preparaCache(opzioni.cache, opzioni.offline, log);
  const mancanti = (Object.keys(FONTI) as IdFonte[]).filter((id) => manifest[id]?.stato !== "ok");
  if (mancanti.length && !opzioni.parziale) {
    log(`\n✗ aggiornamento fermato: fonti non disponibili ${mancanti.join(", ")} (dettaglio in ${join(opzioni.cache, "manifest.json")}).`);
    log("  Dataset esistente intatto. Per scrivere comunque un dataset dichiarato incompleto: --parziale.");
    return false;
  }
  const t0 = Date.now();
  let esito: EsitoCostruzione;
  try {
    esito = costruisciDataset(opzioni.cache, manifest, new Date().toISOString());
  } catch (e) {
    log(`\n✗ costruzione fallita: ${messaggio(e)}. Dataset esistente intatto.`);
    return false;
  }
  const { dataset, errori, note } = esito;
  const testo = serializzaDataset(dataset);
  const byte = Buffer.byteLength(testo);
  if (byte > BUDGET_DATASET_BYTE) errori.push(`dataset di ${byte} byte oltre il budget di ${BUDGET_DATASET_BYTE}`);
  log(`\ncostruito in ${((Date.now() - t0) / 1000).toFixed(1)} s · ${(byte / 1e6).toFixed(2)} MB`);
  for (const n of note) log(`  ${n}`);
  log("copertura:");
  for (const [c, n] of Object.entries(dataset.copertura)) log(`  ${c}: ${n}`);
  log("scarti:");
  for (const [c, s] of Object.entries(dataset.scarti)) for (const [m, v] of Object.entries(s)) log(`  ${c}.${m}: ${v.length}`);
  if (mancanti.length) log(`\n! DATASET INCOMPLETO: fonti non raggiungibili ${mancanti.join(", ")}`);
  let precedente: DatasetFattiComuni | null = null;
  if (existsSync(opzioni.dataset)) {
    try {
      precedente = JSON.parse(readFileSync(opzioni.dataset, "utf8")) as DatasetFattiComuni;
    } catch {
      log("! dataset precedente illeggibile: niente confronto");
    }
  }
  log("\ndifferenze dal dataset precedente:");
  for (const r of confrontaDataset(precedente, dataset)) log(`  ${r}`);
  if (errori.length) {
    log(`\n✗ ${errori.length} errori di gate (dataset esistente intatto):`);
    for (const e of errori.slice(0, 50)) log(`  - ${e}`);
    if (errori.length > 50) log(`  … altri ${errori.length - 50}`);
    return false;
  }
  if (opzioni.soloVerifica) {
    log("\n✓ gate verdi (--solo-verifica: nulla scritto)");
    return true;
  }
  mkdirSync(dirname(opzioni.dataset), { recursive: true });
  const tmp = `${opzioni.dataset}.tmp`;
  writeFileSync(tmp, testo);
  renameSync(tmp, opzioni.dataset);
  log(`\n✓ scritto ${opzioni.dataset}`);
  return true;
}

/** Punto d'accesso della pipeline copy: `mostra <codice|"nome" [sigla]> [--da <codice>] [--json]`. */
function mostra(argomenti: string[], json: boolean, da: string | undefined): number {
  const ds = caricaFattiComuni(PERCORSO_DATASET);
  const [primo = "", sigla] = argomenti;
  let codice = primo;
  if (!/^\d{1,6}$/.test(primo)) {
    const candidati = cercaComune(primo, sigla, ds);
    if (candidati.length !== 1) {
      console.error(
        candidati.length
          ? `«${primo}» è ambiguo: ${candidati.map((c) => `${c.codice} ${c.nome} (${c.sigla})`).join(", ")}. Indicare la sigla o il codice.`
          : `nessun comune di nome «${primo}»${sigla ? ` in ${sigla}` : ""}`,
      );
      return 1;
    }
    codice = candidati[0]!.codice;
  }
  const comune = fattiComune(codice, ds);
  if (!comune) {
    console.error(`codice Istat «${primo}» sconosciuto`);
    return 1;
  }
  const frasi = frasiFatto(codice, ds);
  const distanza = da === undefined ? undefined : distanzaKm(da, codice, ds);
  if (da !== undefined && !distanza) {
    console.error(`codice di partenza «${da}» sconosciuto`);
    return 1;
  }
  const avviso = ds.completo ? undefined : `dataset incompleto: fonti non raggiungibili all'ultimo aggiornamento (${ds.fontiMancanti.join(", ")})`;
  if (json) {
    console.log(JSON.stringify({ comune, frasi, ...(distanza ? { distanza: { da, ...distanza } } : {}), ...(avviso ? { avviso } : {}) }, null, 2));
    return 0;
  }
  console.log(`${comune.nome} (${comune.sigla}) — Istat ${comune.codice}${comune.alias ? ` (richiesto ${comune.alias.da}: ${comune.alias.motivo} dal ${comune.alias.dal})` : ""}`);
  if (avviso) console.log(`! ${avviso}`);
  for (const f of frasi) console.log(`- ${f.testo}\n    ${f.citazione}\n    ${f.url}`);
  if (distanza) console.log(`- ${distanza.km} km da ${da} (${distanza.citazione})`);
  return 0;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const comando = argv[0];
  const flag = (f: string) => argv.includes(f);
  const valore = (f: string) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  if (comando === "aggiorna") {
    const ok = await aggiorna({ cache: CARTELLA_CACHE, dataset: PERCORSO_DATASET, offline: flag("--offline"), soloVerifica: flag("--solo-verifica"), parziale: flag("--parziale") });
    return ok ? 0 : 1;
  }
  if (comando === "mostra") {
    const da = valore("--da");
    const posizionali = argv.slice(1).filter((a, i, l) => !a.startsWith("--") && l[i - 1] !== "--da");
    if (!posizionali.length) {
      console.error('uso: fatti-comuni.ts mostra <codice|"nome" [sigla]> [--da <codice>] [--json]');
      return 2;
    }
    return mostra(posizionali, flag("--json"), da);
  }
  console.error("uso:\n  fatti-comuni.ts aggiorna [--offline] [--solo-verifica] [--parziale]\n  fatti-comuni.ts mostra <codice|\"nome\" [sigla]> [--da <codice>] [--json]");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(
    (codice) => process.exit(codice),
    (e) => {
      console.error(`errore: ${messaggio(e)}`);
      process.exit(1);
    },
  );
}
