// Campione delle 384 pagine di Google per tarare la difficoltà (piano docs/traffico/piano-T4.md §9; decisioni T4 punti 2,
// 7, 8 e 9). Stesso client e stesse regole della mappa (lib/dataforseo.ts, lib/serp-classifica.ts); nessuna riga del
// campione entra in una mappa.
//
//   cd site-factory-editor
//   node --experimental-strip-types scripts/campione-serp.ts esegui                        → solo la stima, nessuna chiamata
//   node --experimental-strip-types scripts/campione-serp.ts esegui --registrate <dir>     → risposte registrate (banco, prove)
//   node --experimental-strip-types scripts/campione-serp.ts esegui --conferma-spesa       → DataForSEO vero (≈ 1,54 $, ok di Mattia)
//   node --experimental-strip-types scripts/campione-serp.ts giudizio <campione.ndjson> [--seme 20260915]
//   node --experimental-strip-types scripts/campione-serp.ts accordo <giudizio.csv> [<campione.ndjson>]
//
// Dati grezzi (campione-<data>.ndjson) nella cache locale ~/.cache/site-factory/calibrazione-T4/ (decisione T4 punto 8);
// in git solo composizione-<data>.json, giudizio-<data>.csv e costi.ndjson in docs/traffico/calibrazione-T4/. Con le
// risposte registrate tutto va in --uscita (predefinita: cartella temporanea), mai nei documenti.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { caricaDati, type Dati } from "../lib/zone-servite.ts";
import * as mq from "../lib/mappa-query.ts";
import { difficolta, riduciSerp, type Domini, type Livello, type SerpRidotta } from "../lib/serp-classifica.ts";
import { creaClientDfs, type ClientDfs } from "../lib/dataforseo.ts";
import { leggiRegole } from "../lib/mappa-lavoro.ts";

/* ---------- la matrice (ricerca §4.3) ---------- */

export const MESTIERI_CAMPIONE = ["impresa edile", "ristrutturazione bagno", "idraulico", "elettricista", "cappotto termico", "serramenti", "imbianchino", "posa pavimenti"] as const;
export const MODIFICATORI_CAMPIONE = ["base", "vicino_a_me", "preventivo", "costo"] as const;
export type Taglia = "piccolo" | "medio" | "grande";
export const COMUNI_CAMPIONE: readonly { istat: string; taglia: Taglia }[] = [
  { istat: "024091", taglia: "piccolo" }, // Sandrigo (VI)
  { istat: "015081", taglia: "piccolo" }, // Cologno Monzese (MI)
  { istat: "054013", taglia: "piccolo" }, // Città di Castello (PG)
  { istat: "075052", taglia: "piccolo" }, // Nardò (LE)
  { istat: "108033", taglia: "medio" }, // Monza (MB)
  { istat: "026086", taglia: "medio" }, // Treviso (TV)
  { istat: "054039", taglia: "medio" }, // Perugia (PG)
  { istat: "068028", taglia: "medio" }, // Pescara (PE)
  { istat: "015146", taglia: "grande" }, // Milano (MI)
  { istat: "001272", taglia: "grande" }, // Torino (TO)
  { istat: "058091", taglia: "grande" }, // Roma (RM)
  { istat: "063049", taglia: "grande" }, // Napoli (NA)
];

export const tagliaDi = (popolazione: number): Taglia => (popolazione < 50_000 ? "piccolo" : popolazione <= 250_000 ? "medio" : "grande");

export interface VoceCampione {
  id: string;
  query: string;
  mestiere: string;
  modificatore: (typeof MODIFICATORI_CAMPIONE)[number];
  taglia: Taglia;
  comune: { istat: string; nome: string; sigla: string; popolazione: number };
  coordinate: string;
}

/** 8 mestieri × 12 comuni × 4 modificatori; un comune fuori dalla sua fascia di popolazione ferma tutto. */
export function matrice(d: Dati, comuni = COMUNI_CAMPIONE): VoceCampione[] {
  const out: VoceCampione[] = [];
  for (const c of comuni) {
    const r = d.comuni[c.istat];
    if (!r) throw new Error(`comune ${c.istat} assente dal dataset T6a`);
    if (r.popolazione === undefined || tagliaDi(r.popolazione) !== c.taglia) {
      throw new Error(`${r.nome} (${r.sigla}) ha ${r.popolazione ?? "?"} abitanti: fuori dalla fascia «${c.taglia}», il campione non è più quello della ricerca §4.3`);
    }
    const nome = mq.nomeInQuery(r.nome, r.nomeAltraLingua);
    for (const m of MESTIERI_CAMPIONE) {
      for (const mod of MODIFICATORI_CAMPIONE) {
        const query = mod === "base" ? `${m} ${nome}` : mod === "vicino_a_me" ? `${m} vicino a me` : `${mod} ${m} ${nome}`;
        out.push({
          id: `${c.istat}-${m.replace(/ /g, "-")}-${mod}`,
          query,
          mestiere: m,
          modificatore: mod,
          taglia: c.taglia,
          comune: { istat: c.istat, nome: r.nome, sigla: r.sigla, popolazione: r.popolazione },
          coordinate: mq.coordinateDi(r.centro),
        });
      }
    }
  }
  return out;
}

/* ---------- esecuzione ---------- */

export interface RigaCampione extends VoceCampione {
  serp: (SerpRidotta & { fonte: mq.Fonte }) | null;
  errore: string | null;
  difficolta: { livello: Livello; punti: number; fattori: mq.Fattore[] } | null;
}

export const STIMA_CAMPIONE_USD = mq.stimaCostoUsd(0, 384);
export const CACHE_CALIBRAZIONE = path.join(os.homedir(), ".cache", "site-factory", "calibrazione-T4");
export const DOCS_CALIBRAZIONE = path.join(import.meta.dirname, "..", "..", "docs", "traffico", "calibrazione-T4");
const oggi = () => new Date().toISOString().slice(0, 10);

export async function eseguiCampione(opz: {
  d: Dati;
  domini: Domini;
  client: ClientDfs | null;
  uscitaGrezzi: string;
  uscitaDocs: string;
  data?: string;
  log?: (s: string) => void;
}): Promise<{ righe: RigaCampione[]; composizione: Composizione; file: string[] } | { stimaUsd: number; eseguito: false }> {
  const voci = matrice(opz.d);
  const log = opz.log ?? console.log;
  if (!opz.client) {
    log(`Campione di ${voci.length} pagine di Google: stima ${STIMA_CAMPIONE_USD.toFixed(2)} $. Nessuna chiamata: rilancia con --conferma-spesa (con l'ok di Mattia) o --registrate <dir>.`);
    return { stimaUsd: STIMA_CAMPIONE_USD, eseguito: false };
  }
  const client = opz.client;
  if (!client.registrate) log(`Saldo DataForSEO ${(await client.assicuraSaldo(STIMA_CAMPIONE_USD)).toFixed(2)} $, stima ${STIMA_CAMPIONE_USD.toFixed(2)} $`);
  const righe: RigaCampione[] = new Array(voci.length);
  const coda = voci.map((v, i) => [v, i] as const);
  let fatte = 0;
  const operaio = async () => {
    for (let x = coda.shift(); x; x = coda.shift()) {
      const [v, i] = x;
      const luogo = { nome: v.comune.nome, sigla: v.comune.sigla, provincia: opz.d.province.get(v.comune.sigla)?.nome ?? null, popolazione: v.comune.popolazione };
      try {
        const { grezza, fonte } = await client.serp(v.query, v.coordinate);
        const serp = riduciSerp(grezza, { domini: opz.domini, dominioCliente: null, luogo });
        righe[i] = { ...v, serp: { ...serp, fonte }, errore: null, difficolta: difficolta(serp, v.mestiere, luogo) };
      } catch (e) {
        // Credenziali e credito fermano tutto: nessun senso continuare a chiedere.
        if (e && typeof e === "object" && "tipo" in e && (e.tipo === "auth" || e.tipo === "credito")) throw e;
        righe[i] = { ...v, serp: null, errore: e instanceof Error ? e.message : String(e), difficolta: null };
      }
      if (++fatte % 48 === 0) log(`Pagine di Google ${fatte}/${voci.length}`);
    }
  };
  await Promise.all(Array.from({ length: 5 }, operaio));

  const data = opz.data ?? oggi();
  fs.mkdirSync(opz.uscitaGrezzi, { recursive: true });
  fs.mkdirSync(opz.uscitaDocs, { recursive: true });
  const fileCampione = path.join(opz.uscitaGrezzi, `campione-${data}.ndjson`);
  fs.writeFileSync(fileCampione, righe.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const comp = composizione(righe, data, client.registrate);
  const fileComp = path.join(opz.uscitaDocs, `composizione-${data}.json`);
  fs.writeFileSync(fileComp, JSON.stringify(comp, null, 2) + "\n");
  log(tabella(comp));
  return { righe, composizione: comp, file: [fileCampione, fileComp] };
}

/* ---------- composizione ---------- */

interface Misure {
  n: number;
  lette: number;
  quote: Record<mq.Classe, number>;
  senzaImpreseLocali: number;
  localPack: { presenza: number; schedeMedie: number };
  aiOverview: number;
  annunciMedi: number;
  localServices: number;
  vuote: number;
  quotaIgnoto: number;
  difficolta: Record<Livello, number>;
}
export interface Composizione {
  data: string;
  registrate: boolean;
  regole: string;
  totale: Misure;
  perTaglia: Record<string, Misure>;
  perMestiere: Record<string, Misure>;
  perModificatore: Record<string, Misure>;
  perCella: Record<string, Misure>;
}

const tre = (x: number) => Math.round(x * 1000) / 1000;

function misura(righe: readonly RigaCampione[]): Misure {
  const lette = righe.filter((r) => r.serp);
  const organici = lette.flatMap((r) => r.serp!.organici);
  const quote = Object.fromEntries(mq.CLASSI.map((c) => [c, organici.length ? tre(organici.filter((o) => o.classe === c).length / organici.length) : 0])) as Record<mq.Classe, number>;
  const frazione = (f: (r: RigaCampione) => boolean) => (lette.length ? tre(lette.filter(f).length / lette.length) : 0);
  const conPack = lette.filter((r) => r.serp!.feature.localPack > 0);
  return {
    n: righe.length,
    lette: lette.length,
    quote,
    senzaImpreseLocali: frazione((r) => !r.serp!.organici.some((o) => o.classe === "impresa_locale")),
    localPack: { presenza: frazione((r) => r.serp!.feature.localPack > 0), schedeMedie: conPack.length ? tre(conPack.reduce((s, r) => s + r.serp!.feature.localPack, 0) / conPack.length) : 0 },
    aiOverview: frazione((r) => r.serp!.feature.aiOverview),
    annunciMedi: lette.length ? tre(lette.reduce((s, r) => s + r.serp!.feature.annunci, 0) / lette.length) : 0,
    localServices: frazione((r) => r.serp!.feature.localServices),
    vuote: frazione((r) => r.serp!.vuota),
    quotaIgnoto: organici.length ? tre(organici.filter((o) => o.regola.startsWith("ignoto")).length / organici.length) : 0,
    difficolta: { bassa: lette.filter((r) => r.difficolta?.livello === "bassa").length, media: lette.filter((r) => r.difficolta?.livello === "media").length, alta: lette.filter((r) => r.difficolta?.livello === "alta").length },
  };
}

export function composizione(righe: readonly RigaCampione[], data: string, registrate: boolean): Composizione {
  const per = (chiave: (r: RigaCampione) => string) => {
    const gruppi = new Map<string, RigaCampione[]>();
    for (const r of righe) gruppi.set(chiave(r), [...(gruppi.get(chiave(r)) ?? []), r]);
    return Object.fromEntries([...gruppi.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, misura(v)]));
  };
  return {
    data,
    registrate,
    regole: mq.VERSIONE_REGOLE,
    totale: misura(righe),
    perTaglia: per((r) => r.taglia),
    perMestiere: per((r) => r.mestiere),
    perModificatore: per((r) => r.modificatore),
    perCella: per((r) => `${r.taglia} · ${r.mestiere} · ${r.modificatore}`),
  };
}

const pct = (x: number) => `${Math.round(x * 100)} %`.padStart(5);
export function tabella(c: Composizione): string {
  const riga = (nome: string, m: Misure) =>
    `${nome.padEnd(24)} ${String(m.lette).padStart(4)} ${pct(m.quote.impresa_locale)} ${pct(m.quote.portale + m.quote.directory)} ${pct(m.quote.altro)} ${pct(m.localPack.presenza)} ${pct(m.aiOverview)} ${m.annunciMedi.toFixed(1).padStart(5)} ${pct(m.quotaIgnoto)}  ${m.difficolta.bassa}/${m.difficolta.media}/${m.difficolta.alta}`;
  const intestazione = `${"".padEnd(24)} lette imprese port+dir altro  pack   AIO  annunci ignoto  b/m/a`;
  const blocchi = [
    ["Totale", { totale: c.totale }],
    ["Per taglia", c.perTaglia],
    ["Per mestiere", c.perMestiere],
    ["Per modificatore", c.perModificatore],
  ] as const;
  return [`Composizione ${c.data}${c.registrate ? " (risposte registrate: non sono dati reali)" : ""}`, ...blocchi.flatMap(([t, g]) => ["", t, intestazione, ...Object.entries(g).map(([k, m]) => riga(k, m))])].join("\n");
}

/* ---------- giudizio cieco (protocollo §9) ---------- */

/** PRNG deterministico (mulberry32): stesso seme, stesso file. */
function prng(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mescola = <T>(xs: T[], r: () => number): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};

/** 20 righe stratificate: fino a 7 per livello del software, tutte le taglie a turno, ordine casuale col seme. */
export function selezionaGiudizio(righe: readonly RigaCampione[], seme = 20260915, quante = 20): RigaCampione[] {
  const r = prng(seme);
  const lette = righe.filter((x) => x.serp && x.difficolta).sort((a, b) => a.id.localeCompare(b.id));
  const scelte: RigaCampione[] = [];
  const taglie: Taglia[] = ["piccolo", "medio", "grande"];
  for (const livello of ["bassa", "media", "alta"] as const) {
    const perTaglia = taglie.map((t) => mescola(lette.filter((x) => x.difficolta!.livello === livello && x.taglia === t), r));
    for (let i = 0, prese = 0; prese < 7 && perTaglia.some((l) => l.length); i++) {
      const x = perTaglia[i % 3]!.shift();
      if (x) {
        scelte.push(x);
        prese += 1;
      }
    }
  }
  const resto = mescola(lette.filter((x) => !scelte.includes(x)), r);
  while (scelte.length < quante && resto.length) scelte.push(resto.shift()!);
  return mescola(scelte.slice(0, quante), r);
}

const COLONNE = ["id", "query", "comune", "abitanti", "top10", "local_pack", "ai_overview", "annunci", "check_url", "giudizio", "note"] as const;
const campo = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV cieco: nessun livello né punti del software. */
export function csvGiudizio(righe: readonly RigaCampione[]): string {
  const linee = righe.map((x) => {
    const s = x.serp!;
    const top10 = s.organici.map((o) => `${o.pos}. ${o.dominio} — ${o.titolo}`).join(" | ");
    return [x.id, x.query, `${x.comune.nome} (${x.comune.sigla})`, x.comune.popolazione, top10, s.feature.localPack, s.feature.aiOverview ? "sì" : "no", s.feature.annunci, s.checkUrl, "", ""].map(campo).join(",");
  });
  return [COLONNE.join(","), ...linee].join("\n") + "\n";
}

/** Lettore CSV minimo (virgolette doppie, a capo nelle celle). */
export function leggiCsv(testo: string): Record<string, string>[] {
  const righe: string[][] = [];
  let riga: string[] = [];
  let cella = "";
  let virgolette = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]!;
    if (virgolette) {
      if (c === '"' && testo[i + 1] === '"') {
        cella += '"';
        i++;
      } else if (c === '"') virgolette = false;
      else cella += c;
    } else if (c === '"') virgolette = true;
    else if (c === ",") {
      riga.push(cella);
      cella = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && testo[i + 1] === "\n") i++;
      riga.push(cella);
      righe.push(riga);
      riga = [];
      cella = "";
    } else cella += c;
  }
  if (cella || riga.length) righe.push([...riga, cella]);
  const [intestazione, ...dati] = righe.filter((r) => r.some((x) => x.trim()));
  return dati.map((r) => Object.fromEntries((intestazione ?? []).map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

export interface Accordo {
  n: number;
  esatto: number;
  adiacente: number;
  /** righe = giudizio di Mattia, colonne = livello del software (bassa, media, alta). */
  matrice: number[][];
  disaccordi: { id: string; query: string; mattia: Livello; software: Livello; fattori: string }[];
}

const LIVELLI: Livello[] = ["bassa", "media", "alta"];
export function accordo(csv: readonly Record<string, string>[], software: ReadonlyMap<string, RigaCampione>): Accordo {
  const matrice = LIVELLI.map(() => LIVELLI.map(() => 0));
  const disaccordi: Accordo["disaccordi"] = [];
  let esatto = 0;
  let adiacente = 0;
  let n = 0;
  for (const r of csv) {
    const g = r.giudizio?.toLowerCase() as Livello;
    const x = software.get(r.id ?? "");
    if (!LIVELLI.includes(g) || !x?.difficolta) continue;
    n += 1;
    const i = LIVELLI.indexOf(g);
    const j = LIVELLI.indexOf(x.difficolta.livello);
    matrice[i]![j]! += 1;
    if (i === j) esatto += 1;
    if (Math.abs(i - j) <= 1) adiacente += 1;
    if (i !== j) disaccordi.push({ id: x.id, query: x.query, mattia: g, software: x.difficolta.livello, fattori: x.difficolta.fattori.map((f) => `${f.codice} ${f.punti}`).join(", ") });
  }
  return { n, esatto: n ? tre(esatto / n) : 0, adiacente: n ? tre(adiacente / n) : 0, matrice, disaccordi };
}

/* ---------- riga di comando ---------- */

const leggiNdjson = (file: string): RigaCampione[] =>
  fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as RigaCampione);

async function main(argv: string[]): Promise<number> {
  const [comando, ...resto] = argv;
  const opzione = (nome: string) => {
    const i = resto.indexOf(nome);
    return i >= 0 ? resto[i + 1] : undefined;
  };
  if (comando === "esegui") {
    const regole = leggiRegole();
    const registrate = opzione("--registrate");
    const conferma = resto.includes("--conferma-spesa");
    const d = caricaDati();
    if (!registrate && !conferma) {
      await eseguiCampione({ d, domini: regole.domini, client: null, uscitaGrezzi: CACHE_CALIBRAZIONE, uscitaDocs: DOCS_CALIBRAZIONE });
      return 0;
    }
    const uscitaProva = opzione("--uscita") ?? path.join(os.tmpdir(), "sf-campione-registrate");
    const client = creaClientDfs({
      registrate: registrate ?? null,
      costi: registrate ? { file: path.join(uscitaProva, "costi.ndjson"), lavoro: "campione" } : { file: path.join(DOCS_CALIBRAZIONE, "costi.ndjson"), lavoro: "campione" },
    });
    if (!client.configurata()) {
      console.error(mq.MOTIVO_NON_CONFIGURATA);
      return 1;
    }
    const esito = await eseguiCampione({ d, domini: regole.domini, client, uscitaGrezzi: registrate ? uscitaProva : CACHE_CALIBRAZIONE, uscitaDocs: registrate ? uscitaProva : DOCS_CALIBRAZIONE });
    if ("file" in esito) console.log(`\nScritti: ${esito.file.join(", ")} · costo ${client.statistiche().costoUsd.toFixed(3)} $ (${client.statistiche().chiamatePagate} chiamate pagate, ${client.statistiche().dallaCache} dalla cache)`);
    return 0;
  }
  if (comando === "giudizio") {
    const file = resto[0];
    if (!file) throw new Error("uso: giudizio <campione.ndjson> [--seme N]");
    const scelte = selezionaGiudizio(leggiNdjson(file), Number(opzione("--seme") ?? 20260915));
    const data = /campione-(\d{4}-\d{2}-\d{2})/.exec(file)?.[1] ?? oggi();
    const uscita = opzione("--uscita") ?? DOCS_CALIBRAZIONE;
    fs.mkdirSync(uscita, { recursive: true });
    const out = path.join(uscita, `giudizio-${data}.csv`);
    fs.writeFileSync(out, csvGiudizio(scelte));
    console.log(`${scelte.length} righe cieche in ${out}: compila la colonna «giudizio» con bassa, media o alta.`);
    return 0;
  }
  if (comando === "accordo") {
    const [csv, campione] = resto;
    if (!csv) throw new Error("uso: accordo <giudizio.csv> [<campione.ndjson>]");
    const data = /giudizio-(\d{4}-\d{2}-\d{2})/.exec(csv)?.[1] ?? oggi();
    const righe = leggiNdjson(campione ?? path.join(CACHE_CALIBRAZIONE, `campione-${data}.ndjson`));
    const a = accordo(leggiCsv(fs.readFileSync(csv, "utf8")), new Map(righe.map((r) => [r.id, r])));
    console.log(`Righe giudicate: ${a.n} · accordo esatto ${Math.round(a.esatto * 100)} % (atteso ≥ 80 %) · adiacente ${Math.round(a.adiacente * 100)} %`);
    console.log(`Matrice (righe Mattia, colonne software: bassa media alta)\n${a.matrice.map((r, i) => `${LIVELLI[i]!.padEnd(6)} ${r.map((x) => String(x).padStart(5)).join("")}`).join("\n")}`);
    for (const x of a.disaccordi) console.log(`- ${x.query} (${x.id}): Mattia ${x.mattia}, software ${x.software} · ${x.fattori}`);
    return 0;
  }
  console.error("comandi: esegui [--registrate <dir> [--uscita <dir>]] [--conferma-spesa] · giudizio <campione.ndjson> [--seme N] · accordo <giudizio.csv> [<campione.ndjson>]");
  return 2;
}

// import.meta.main (Node ≥ 22.18) non è nei tipi di @types/node 20: il banco importa il modulo senza eseguirlo.
if ((import.meta as { main?: boolean }).main) {
  main(process.argv.slice(2)).then(
    (codice) => process.exit(codice),
    (e) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    },
  );
}
