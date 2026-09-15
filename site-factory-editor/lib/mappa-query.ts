// Mappa query → pagine (piano docs/traffico/piano-T4.md; sopra il piano valgono docs/traffico/decisioni-piani.md
// «Priorità assoluta», T3 punti 12-14, T4 punti 1-9 e K1 punto 6).
//
// Per un cliente col servizio Sito: 8-20 ricerche reali, in italiano e nei comuni delle zone servite, e la pagina
// del sito che risponde a ciascuna. Qui stanno le regole PURE (nessun I/O): schemi degli artifact, universo delle
// ricerche (lessico × comuni usati × modificatori), lotti dei volumi, candidati alle pagine di Google, punteggio,
// selezione, assegnazione, frasi del «perché», vista per la UI, blocchi e staleness. Le letture, le chiamate e le
// scritture stanno in lib/mappa-lavoro.ts e lib/dataforseo.ts.
//
// Zone SOLO da lib/zone-servite.ts (mai il JSON a mano), nessuna priorità dichiarata, nessuna pagina-comune.
// Import con estensione e niente alias «@/»: il banco scripts/test-mappa-query.ts gira con strip-types.
import crypto from "node:crypto";
import { z } from "zod";
import { areeServite, etichettaArea, type ComuneServito, type Dati, type Zone } from "./zone-servite.ts";
import { difficolta, fraseDifficolta, fraseFeature, formatoIntero, spazioOrganico, type LuogoQuery, type SerpRidotta } from "./serp-classifica.ts";

/* ---------- costanti (calibrazione: piano-T4.md § Calibrazione) ---------- */

export const VERSIONE_REGOLE = "2026-09-b";
export const MAX_COMUNI = 40;
export const MAX_KEYWORD_TASK = 1000;
export const MAX_KEYWORD_CON_COMUNE = 5000;
export const MAX_TASK_VOLUMI = 6;
export const SERP_CANDIDATE = 60;
export const MAX_SERP = 100;
export const SOGLIA_PUNTEGGIO = 35;
export const MIN_TARGET = 8;
export const MAX_TARGET = 20;
export const MAX_PER_PAGINA = 3;
export const JACCARD_VARIANTE = 0.6;
export const LOCATION_ITALIA = 2380;
export const RAGGIO_SERP_MM = 100_000;
/** Prezzi Live verificati il 2026-09-14 (piano §2.1): il costo registrato è sempre il campo `cost` della risposta. */
export const PREZZO_VOLUMI_TASK_USD = 0.09;
export const PREZZO_SERP_USD = 0.004;
export const PESI = { volume: 0.45, vincibilita: 0.35, rilevanza: 0.2 } as const;

export const FILE_MAPPA = "traffico/mappa-query.json";
export const FILE_ESCLUSIONI = "traffico/mappa-esclusioni.json";
export const FILE_STORICO = "traffico/mappa-storico.ndjson";
export const FILE_COSTI = "traffico/costi.ndjson";
export const FILE_LOG_MAPPA = "traffico/logs/run-mappa.ndjson";

/* ---------- schemi (§6) ---------- */

const Sha = z.string().regex(/^[a-f0-9]{64}$/);
const Istat = z.string().regex(/^\d{6}$/);
const Mese = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const MODIFICATORI = ["base", "vicino_a_me", "preventivo"] as const;
export const CLASSI = ["portale", "directory", "impresa_locale", "cliente", "altro"] as const;
export const ENDPOINT_PAGATI = ["keywords_data/google_ads/search_volume/live", "serp/google/organic/live/advanced"] as const;
export type Modificatore = (typeof MODIFICATORI)[number];
export type Classe = (typeof CLASSI)[number];
export type EndpointPagato = (typeof ENDPOINT_PAGATI)[number];

export const FonteSchema = z.strictObject({
  endpoint: z.enum(ENDPOINT_PAGATI),
  richiestaSha: Sha, // chiave della cache: la richiesta esatta
  lettoAt: z.iso.datetime(), // quando DataForSEO ha risposto (anche se servita dalla cache)
  costoUsd: z.number().nonnegative(),
});
export type Fonte = z.infer<typeof FonteSchema>;

const FattoreSchema = z.strictObject({
  codice: z.string().min(1),
  testo: z.string().min(1),
  valore: z.union([z.number(), z.string(), z.null()]),
  punti: z.number(),
});
export type Fattore = z.infer<typeof FattoreSchema>;

const SerpSchema = z.strictObject({
  fonte: FonteSchema,
  coordinate: z.string().regex(/^-?\d+\.\d{1,7},-?\d+\.\d{1,7},\d+$/),
  checkUrl: z.url(),
  vuota: z.boolean(),
  feature: z.strictObject({
    localPack: z.number().int().min(0),
    aiOverview: z.boolean(),
    annunci: z.number().int().min(0),
    localServices: z.boolean(),
  }),
  organici: z
    .array(
      z.strictObject({
        pos: z.number().int().min(1).max(100),
        dominio: z.string().min(1),
        url: z.url(),
        titolo: z.string().max(300),
        classe: z.enum(CLASSI),
        regola: z.string().min(1),
      }),
    )
    .max(10),
  localPackDomini: z.array(z.string()).max(20),
});
export type Serp = z.infer<typeof SerpSchema>;

const ComuneRigaSchema = z.strictObject({
  istat: Istat,
  nome: z.string().min(1),
  sigla: z.string().regex(/^[A-Z]{2}$/),
  popolazione: z.number().int().positive().nullable(),
  km: z.number().int().min(0).nullable(),
  /** etichettaArea della prima area che lo comprende; null = sede fuori dalle zone servite. */
  area: z.string().nullable(),
});

const RigaSchema = z.strictObject({
  /** Chiave stabile (esclusioni, storico). Oltre 80 caratteri o 10 parole la riga resta, non ammessa. */
  testo: z.string().min(2).max(200),
  tipo: z.enum(["con_comune", "senza_comune"]),
  modificatore: z.enum(MODIFICATORI),
  testa: z.strictObject({
    testo: z.string().min(1),
    gruppo: z.string().min(1),
    origine: z.enum(["servizio", "mestiere"]),
    primaria: z.boolean(),
    servizi: z.array(z.string()).max(60),
    macro: z.string().nullable(),
    mestiereAltrui: z.boolean(),
  }),
  /** con_comune: il comune nel testo; senza_comune: la sede (null se la sede non è riconosciuta). */
  comune: ComuneRigaSchema.nullable(),
  ammessa: z.boolean(),
  motivi: z.array(z.string()),
  volume: z.strictObject({
    valore: z.number().int().min(0).nullable(),
    stato: z.enum(["misurato", "non_disponibile", "non_richiesto"]), // null da Google = non_disponibile
    geo: z.strictObject({ locationCode: z.number().int().positive(), nome: z.string() }).nullable(),
    datiAl: Mese.nullable(),
    fonte: FonteSchema.nullable(),
  }),
  serp: SerpSchema.nullable(),
  difficolta: z
    .strictObject({
      livello: z.enum(["bassa", "media", "alta"]),
      punti: z.number().int(),
      fattori: z.array(FattoreSchema).min(1),
    })
    .nullable(),
  punteggio: z.strictObject({ totale: z.number().min(0).max(100), fattori: z.array(FattoreSchema).length(3) }).nullable(),
});
export type Riga = z.infer<typeof RigaSchema>;

const PaginaSchema = z.strictObject({
  chiave: z.string().regex(/^(home|zone|servizio:[a-z0-9-]+)$/),
  tipo: z.enum(["home", "servizio", "zone"]),
  etichetta: z.string().min(1),
});
export type Pagina = z.infer<typeof PaginaSchema>;

const TargetSchema = z.strictObject({
  testo: z.string(),
  pagina: z.string(),
  ruolo: z.enum(["principale", "secondaria"]),
  sottoSoglia: z.boolean(),
  perche: z.array(z.string()).min(1),
});
export type Target = z.infer<typeof TargetSchema>;

export const MappaQuerySchema = z
  .strictObject({
    versione: z.literal(1),
    /** Data del calcolo (volumi e pagine di Google): Escludi e Riammetti non la toccano. */
    generataAt: z.iso.datetime(),
    /** Ultima riselezione senza chiamate (Escludi o Riammetti); assente se la mappa non è stata toccata dopo il calcolo. */
    selezionataAt: z.iso.datetime().optional(),
    stato: z.enum(["completa", "parziale", "insufficiente"]),
    regole: z.strictObject({ versione: z.string(), lessicoSha: Sha, dominiSha: Sha }),
    ingressi: z.strictObject({
      contestoSha: Sha,
      zoneSha: Sha, // sha256 di { sede, codici dei comuni usati in ordine }: l'impronta delle zone di T4
      sede: Istat.nullable(),
      comuniArea: z.number().int().min(0),
      comuniUsati: z.number().int().min(0).max(MAX_COMUNI),
      dominioCliente: z.string().nullable(),
      registrate: z.boolean(), // risposte di prova (SF_DATAFORSEO_REGISTRATE), mai dati veri
    }),
    costo: z.strictObject({ usd: z.number().nonnegative(), chiamatePagate: z.number().int().min(0), dallaCache: z.number().int().min(0) }),
    avvisi: z.array(z.string()),
    /** Solo con stato «insufficiente»: perché le ricerche utilizzabili sono meno di 8. */
    motivi: z.array(z.string()),
    serviziSenzaQuery: z.array(z.string()),
    dominiNonInElenco: z.array(z.string()),
    /** Ricerche candidate la cui pagina di Google non si è letta (errore dopo i tentativi): mappa «parziale». */
    serpNonLette: z.array(z.string()),
    /** Testi esclusi dall'operatore al momento della selezione (copia di mappa-esclusioni.json). */
    escluse: z.array(z.string()).max(500),
    /** Testi esclusi al momento del calcolo: le loro pagine di Google non sono state lette (una riammissione chiede un ricalcolo). */
    escluseAlCalcolo: z.array(z.string()).max(500).optional(),
    universo: z.array(RigaSchema).max(5500),
    pagine: z.array(PaginaSchema).min(1),
    target: z.array(TargetSchema).max(MAX_TARGET),
  })
  .superRefine((m, ctx) => {
    const problema = (message: string, path: (string | number)[]) => ctx.addIssue({ code: "custom", message, path });
    const righe = new Map<string, Riga>();
    m.universo.forEach((r, i) => {
      if (righe.has(r.testo)) problema(`testo ripetuto «${r.testo}»`, ["universo", i, "testo"]);
      righe.set(r.testo, r);
      if (r.ammessa && r.testo.length > 80) problema("ricerca ammessa oltre 80 caratteri", ["universo", i, "testo"]);
      if ((r.volume.stato !== "non_richiesto") !== (r.volume.fonte !== null)) problema("volume misurato senza fonte o fonte senza misura", ["universo", i, "volume"]);
      if (r.tipo === "con_comune" && !r.comune) problema("ricerca con comune senza comune", ["universo", i, "comune"]);
    });
    const chiavi = new Set(m.pagine.map((p) => p.chiave));
    const escluse = new Set(m.escluse);
    const perPagina = new Map<string, { n: number; principali: number }>();
    const viste = new Set<string>();
    m.target.forEach((t, i) => {
      if (viste.has(t.testo)) problema(`target ripetuto «${t.testo}»`, ["target", i]);
      viste.add(t.testo);
      const r = righe.get(t.testo);
      if (!r) return problema(`target «${t.testo}» fuori dall'universo`, ["target", i]);
      if (!r.ammessa || escluse.has(t.testo)) problema(`target «${t.testo}» non ammesso o escluso`, ["target", i]);
      if (!r.difficolta || r.difficolta.livello === "alta") problema(`target «${t.testo}» senza difficoltà o con difficoltà alta`, ["target", i]);
      if (!chiavi.has(t.pagina)) problema(`pagina «${t.pagina}» inesistente`, ["target", i, "pagina"]);
      const p = perPagina.get(t.pagina) ?? { n: 0, principali: 0 };
      p.n += 1;
      if (t.ruolo === "principale") p.principali += 1;
      perPagina.set(t.pagina, p);
    });
    for (const [pagina, p] of perPagina) {
      if (p.n > MAX_PER_PAGINA) problema(`${p.n} target sulla pagina ${pagina} (massimo ${MAX_PER_PAGINA})`, ["target"]);
      if (p.principali !== 1) problema(`${p.principali} target principali sulla pagina ${pagina} (atteso 1)`, ["target"]);
    }
    if ((m.stato === "insufficiente") !== m.target.length < MIN_TARGET) problema(`stato «${m.stato}» con ${m.target.length} target`, ["stato"]);
  });
export type MappaQuery = z.infer<typeof MappaQuerySchema>;

export const EsclusioniSchema = z.strictObject({
  versione: z.literal(1),
  voci: z
    .array(z.strictObject({ testo: z.string().min(2).max(200), motivo: z.string().trim().min(3).max(200), at: z.iso.datetime() }))
    .max(500),
});
export type Esclusioni = z.infer<typeof EsclusioniSchema>;

export const RigaCostoSchema = z.strictObject({
  at: z.iso.datetime(),
  lavoro: z.enum(["mappa", "campione"]),
  endpoint: z.enum(ENDPOINT_PAGATI), // solo chiamate a pagamento: le gratuite non fanno rumore
  task: z.number().int().positive(),
  voci: z.number().int().positive(), // keyword del task o 1 SERP
  costoUsd: z.number().nonnegative(), // campo `cost` della risposta, mai stimato
  statusCode: z.number().int(), // status_code DataForSEO o HTTP
  esito: z.enum(["ok", "errore"]),
  durataMs: z.number().int().nonnegative(),
});
export type RigaCosto = z.infer<typeof RigaCostoSchema>;

/** Solo i campi del contesto che la mappa usa (lo schema completo è in lib/schemas.ts, fuori da strip-types). */
export const ContestoMappaSchema = z.object({
  settore_normalizzato: z.string().trim().min(1),
  servizi_atomizzati: z.array(z.object({ servizio: z.string().trim().min(1) })),
  macro_categorie: z.array(z.object({ nome: z.string().trim().min(1), servizi: z.array(z.string()) })),
});
export type ContestoMappa = z.infer<typeof ContestoMappaSchema>;

const VoceTestaSchema = z.strictObject({
  testo: z.string().regex(/^[a-zàèéìòù]+( [a-zàèéìòù]+)*$/),
  gruppo: z.string().regex(/^[a-z0-9-]+$/),
  mestiere: z.string().min(1).optional(),
});
export const LessicoSchema = z
  .strictObject({
    versione: z.string().min(1),
    fonti: z.array(z.string()),
    mestieri: z.array(z.strictObject({ id: z.string().regex(/^[a-z-]+$/), settori: z.array(z.string().min(3)).min(1), teste: z.array(VoceTestaSchema).min(1) })),
    // nessuna: prefissi che escludono la voce («Verniciatura infissi» non è «sostituzione infissi»).
    servizi: z.array(z.strictObject({ tutte: z.array(z.string().min(3)).min(1), nessuna: z.array(z.string().min(3)).optional(), teste: z.array(VoceTestaSchema).min(1) })),
    vietati: z.array(z.string().min(2)),
  })
  .superRefine((l, ctx) => {
    const mestieri = new Set(l.mestieri.map((m) => m.id));
    const gruppi = new Map<string, string>();
    for (const t of [...l.mestieri.flatMap((m) => m.teste), ...l.servizi.flatMap((s) => s.teste)]) {
      if (t.mestiere && !mestieri.has(t.mestiere)) ctx.addIssue({ code: "custom", message: `mestiere «${t.mestiere}» sconosciuto in «${t.testo}»` });
      if (l.vietati.some((v) => ` ${t.testo} `.includes(` ${v} `))) ctx.addIssue({ code: "custom", message: `testa «${t.testo}» con un modificatore vietato` });
      const g = gruppi.get(t.testo);
      if (g && g !== t.gruppo) ctx.addIssue({ code: "custom", message: `testa «${t.testo}» in due gruppi (${g}, ${t.gruppo})` });
      gruppi.set(t.testo, t.gruppo);
    }
  });
export type Lessico = z.infer<typeof LessicoSchema>;

const VoceDominioSchema = z.strictObject({ dominio: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/), nome: z.string().min(1), nota: z.string().optional() });
export const DominiSchema = z.strictObject({
  versione: z.string().min(1),
  aggiornato: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  portali: z.array(VoceDominioSchema),
  directory: z.array(VoceDominioSchema),
  altro: z.array(VoceDominioSchema),
});

/* ---------- testo ---------- */

export const sha256 = (testo: string): string => crypto.createHash("sha256").update(testo).digest("hex");

/** Nome di un servizio, di una macro o di un settore per gli abbinamenti: senza accenti, apostrofi e punteggiatura. */
export function normalizzaNome(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Testo di una ricerca: minuscolo, apostrofi come spazi, spazi compressi; accenti conservati («muggiò»). */
export function normalizzaQuery(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’'`´]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Il nome del comune come lo scrive chi cerca: la parte italiana dei nomi bilingui. */
export function nomeInQuery(nome: string, altraLingua?: string): string {
  let n = nome.split("/")[0]!;
  if (altraLingua && n.endsWith(`-${altraLingua}`)) n = n.slice(0, -altraLingua.length - 1);
  return normalizzaQuery(n);
}

export function motivoNonAmmessa(testo: string): string | null {
  const parole = testo.split(" ").length;
  if (testo.length > 80) return `troppo lunga per Google Ads: ${testo.length} caratteri (massimo 80)`;
  if (parole > 10) return `troppo lunga per Google Ads: ${parole} parole (massimo 10)`;
  return null;
}

export const slugMacro = (nome: string): string => normalizzaNome(nome).replace(/ /g, "-") || "servizio";

/* ---------- teste dal contesto e dal lessico (§3.2) ---------- */

export interface Testa {
  testo: string;
  gruppo: string;
  origine: "servizio" | "mestiere";
  primaria: boolean;
  servizi: string[];
  macro: string | null;
  mestiereAltrui: boolean;
}

const inizia = (parole: string[], prefissi: readonly string[]) => prefissi.every((p) => parole.some((w) => w.startsWith(p)));

/**
 * Teste delle ricerche: prima quelle del mestiere del cliente (settore_normalizzato), poi quelle dei servizi, nell'ordine
 * del lessico (così l'ordine dei servizi nel contesto non cambia nulla). Un servizio senza voci non genera ricerche.
 */
export function testeDelContesto(c: ContestoMappa, l: Lessico): { teste: Testa[]; serviziSenzaQuery: string[]; mestieri: string[] } {
  const settore = normalizzaNome(c.settore_normalizzato).split(" ");
  const mestieri = l.mestieri.filter((m) => m.settori.some((p) => settore.some((w) => w.startsWith(p))));
  const ids = new Set(mestieri.map((m) => m.id));
  const macroNorm = c.macro_categorie.map((m) => new Set(m.servizi.map(normalizzaNome)));
  const indiceMacro = (servizio: string) => {
    const i = macroNorm.findIndex((s) => s.has(normalizzaNome(servizio)));
    return i < 0 ? Infinity : i;
  };

  const teste = new Map<string, Testa & { ordine: number }>();
  let ordine = 0;
  for (const m of mestieri) {
    m.teste.forEach((t, i) => {
      if (!teste.has(t.testo)) teste.set(t.testo, { testo: t.testo, gruppo: t.gruppo, origine: "mestiere", primaria: i === 0, servizi: [], macro: null, mestiereAltrui: false, ordine: ordine++ });
    });
  }
  const serviziSenzaQuery: string[] = [];
  const perVoce = new Map<number, string[]>();
  for (const { servizio } of c.servizi_atomizzati) {
    const parole = normalizzaNome(servizio).split(" ");
    let trovata = false;
    l.servizi.forEach((v, i) => {
      if (!inizia(parole, v.tutte) || (v.nessuna ?? []).some((p) => parole.some((w) => w.startsWith(p)))) return;
      trovata = true;
      perVoce.set(i, [...(perVoce.get(i) ?? []), servizio]);
    });
    if (!trovata) serviziSenzaQuery.push(servizio);
  }
  for (const [i, v] of l.servizi.entries()) {
    const servizi = perVoce.get(i);
    if (!servizi) continue;
    v.teste.forEach((t, j) => {
      const esistente = teste.get(t.testo);
      if (esistente) {
        for (const s of servizi) if (!esistente.servizi.includes(s)) esistente.servizi.push(s);
        if (j === 0 && esistente.origine === "servizio") esistente.primaria = true;
        return;
      }
      teste.set(t.testo, {
        testo: t.testo,
        gruppo: t.gruppo,
        origine: "servizio",
        primaria: j === 0,
        servizi: [...servizi],
        macro: null,
        mestiereAltrui: !!t.mestiere && !ids.has(t.mestiere),
        ordine: ordine++,
      });
    });
  }
  const perNome = (a: string, b: string) => a.localeCompare(b, "it");
  const out = [...teste.values()]
    .sort((a, b) => a.ordine - b.ordine)
    .map(({ ordine: _ordine, ...t }) => {
      const servizi = [...t.servizi].sort(perNome);
      const im = Math.min(...servizi.map(indiceMacro));
      return { ...t, servizi, macro: t.origine === "servizio" && Number.isFinite(im) ? c.macro_categorie[im]!.nome : null };
    });
  return { teste: out, serviziSenzaQuery: serviziSenzaQuery.sort(perNome), mestieri: [...ids] };
}

/* ---------- comuni usati (§2.3) ---------- */

export interface ComuneUsato {
  istat: string;
  nome: string;
  sigla: string;
  popolazione: number | null;
  km: number | null;
  area: string | null;
  /** Il nome nel testo della ricerca. */
  testo: string;
}

export type EsitoComuni =
  | { ok: true; usati: ComuneUsato[]; comuniArea: number; tetto: number; sede: ComuneUsato | null; sedeNellArea: boolean; avvisi: string[] }
  | { ok: false; motivo: string };

const PRECISIONE = { comune: 0, dintorni: 1, provincia: 2, regione: 3, italia: 4 } as const;
export const MOTIVO_SENZA_SEDE ="Zone senza sede: con «Tutta Italia» serve la sede per scegliere i comuni";
export const tettoComuni = (nTeste: number): number => Math.max(1, Math.min(MAX_COMUNI, Math.floor(MAX_KEYWORD_CON_COMUNE / (2 * Math.max(1, nTeste)))));
const peso = (c: { popolazione: number | null; km: number | null }) => (c.popolazione ?? 0) / (c.km === null ? 2 : 1 + c.km / 10);

/**
 * I comuni delle ricerche: area servita (un comune raggiunto solo da «Tutta Italia» resta se è nella provincia della
 * sede), ordinata per popolazione / (1 + km/10), poi km, poi nome; tetto min(40, ⌊5.000 / (2 × teste)⌋) con la sede
 * sempre dentro se è nell'area. Mai un comune fuori dalle zone servite.
 */
export function comuniUsati(zone: Pick<Zone, "etichette" | "sede">, comuni: ComuneServito[], nTeste: number, d: Dati): EsitoComuni {
  const aree = areeServite(zone);
  const sedeCodice = zone.sede ? (d.comuni[zone.sede.codice] ? zone.sede.codice : (d.alias[zone.sede.codice]?.a ?? null)) : null;
  const sedeRecord = sedeCodice ? d.comuni[sedeCodice] : undefined;
  const soloItalia = aree.length > 0 && aree.every((a) => a.tipo === "italia");
  if (soloItalia && !sedeRecord) return { ok: false, motivo: MOTIVO_SENZA_SEDE };
  const avvisi: string[] = [];

  const area = comuni
    .filter((c) => c.aree.some((i) => aree[i]!.tipo !== "italia") || (sedeRecord !== undefined && c.sigla === sedeRecord.sigla))
    .map((c): ComuneUsato => {
      const r = d.comuni[c.codice]!;
      // L'area più precisa che lo comprende (comune, dintorni, provincia, regione, Italia; poi il nome): non dipende
      // dall'ordine delle etichette.
      const area = c.aree
        .map((i) => aree[i]!)
        .sort((a, b) => PRECISIONE[a.tipo] - PRECISIONE[b.tipo] || etichettaArea(a).localeCompare(etichettaArea(b), "it"))[0]!;
      return {
        istat: c.codice,
        nome: c.nome,
        sigla: c.sigla,
        popolazione: c.popolazione && c.popolazione > 0 ? c.popolazione : null,
        km: c.kmDallaSede,
        area: etichettaArea(area),
        testo: nomeInQuery(r.nome, r.nomeAltraLingua),
      };
    })
    .sort((a, b) => peso(b) - peso(a) || (a.km ?? Infinity) - (b.km ?? Infinity) || a.nome.localeCompare(b.nome, "it"));
  if (area.length === 0) return { ok: false, motivo: "Nessun comune nelle zone servite: controllale nel dettaglio Traffico" };
  if (aree.some((a) => a.tipo === "italia")) {
    avvisi.push(sedeRecord ? `Area «Tutta Italia»: ricerche locali nei comuni della provincia della sede (${sedeRecord.sigla})` : "Area «Tutta Italia» ignorata: la sede non è riconosciuta");
  }

  const tetto = tettoComuni(nTeste);
  let usati = area.slice(0, tetto);
  const sedeInArea = sedeCodice ? area.find((c) => c.istat === sedeCodice) : undefined;
  if (sedeInArea && !usati.includes(sedeInArea)) usati = [...usati.slice(0, tetto - 1), sedeInArea];
  const fuori = area.filter((c) => !usati.includes(c));
  if (fuori.length) {
    avvisi.push(`${formatoIntero(fuori.length)} comuni dell'area non misurati (tetto ${tetto}): ${fuori.slice(0, 5).map((c) => c.nome).join(", ")}${fuori.length > 5 ? "…" : ""}`);
  }

  let sede: ComuneUsato | null = null;
  if (sedeCodice && sedeRecord) {
    sede = sedeInArea
      ? { ...sedeInArea, km: 0 }
      : { istat: sedeCodice, nome: sedeRecord.nome, sigla: sedeRecord.sigla, popolazione: sedeRecord.popolazione || null, km: 0, area: null, testo: nomeInQuery(sedeRecord.nome, sedeRecord.nomeAltraLingua) };
    if (!sedeInArea) {
      avvisi.push(`La sede ${sedeRecord.nome} (${sedeRecord.sigla}) non è tra le zone servite: nessuna ricerca col suo comune; le ricerche senza comune restano misurate lì`);
    }
  } else {
    avvisi.push("Sede non riconosciuta: le ricerche senza comune non si misurano");
  }
  return { ok: true, usati, comuniArea: area.length, tetto, sede, sedeNellArea: !!sedeInArea, avvisi };
}

/** Impronta delle zone per la staleness: sede e comuni usati, in ordine (un comune oltre il tetto non la cambia). */
export const zoneSha = (sede: string | null, usati: readonly { istat: string }[]): string => sha256(JSON.stringify({ sede, comuni: usati.map((c) => c.istat) }));

/* ---------- universo (§3.3) ---------- */

const VOLUME_NON_RICHIESTO: Riga["volume"] = { valore: null, stato: "non_richiesto", geo: null, datiAl: null, fonte: null };

/** Tutte le ricerche possibili: per ogni testa, «{testa} {comune}» e «preventivo {testa} {comune}», poi le tre senza comune. */
export function componiUniverso(teste: Testa[], com: { usati: ComuneUsato[]; sede: ComuneUsato | null }): { universo: Riga[]; doppioni: number } {
  const universo: Riga[] = [];
  const visti = new Set<string>();
  let doppioni = 0;
  const comuneRiga = (c: ComuneUsato): NonNullable<Riga["comune"]> => ({ istat: c.istat, nome: c.nome, sigla: c.sigla, popolazione: c.popolazione, km: c.km, area: c.area });
  const aggiungi = (grezzo: string, tipo: Riga["tipo"], modificatore: Modificatore, t: Testa, c: ComuneUsato | null) => {
    const testo = normalizzaQuery(grezzo);
    if (visti.has(testo)) {
      doppioni += 1;
      return;
    }
    visti.add(testo);
    const motivo = motivoNonAmmessa(testo);
    const motivi = motivo ? [motivo] : [];
    if (!motivo && tipo === "senza_comune" && !c) motivi.push("volume non richiesto: sede non riconosciuta");
    universo.push({
      testo,
      tipo,
      modificatore,
      testa: { testo: t.testo, gruppo: t.gruppo, origine: t.origine, primaria: t.primaria, servizi: t.servizi, macro: t.macro, mestiereAltrui: t.mestiereAltrui },
      comune: c ? comuneRiga(c) : null,
      ammessa: !motivo,
      motivi,
      volume: VOLUME_NON_RICHIESTO,
      serp: null,
      difficolta: null,
      punteggio: null,
    });
  };
  for (const t of teste) {
    for (const c of com.usati) {
      aggiungi(`${t.testo} ${c.testo}`, "con_comune", "base", t, c);
      aggiungi(`preventivo ${t.testo} ${c.testo}`, "con_comune", "preventivo", t, c);
    }
    aggiungi(t.testo, "senza_comune", "base", t, com.sede);
    aggiungi(`${t.testo} vicino a me`, "senza_comune", "vicino_a_me", t, com.sede);
    aggiungi(`preventivo ${t.testo}`, "senza_comune", "preventivo", t, com.sede);
  }
  return { universo, doppioni };
}

/* ---------- volumi (§2.3, §2.5) ---------- */

export interface Lotto {
  locationCode: number;
  nome: string;
  keywords: string[];
}

/** Lotti ≤ 1.000 keyword ordinate: con comune misurate sull'Italia, senza comune nel comune della sede. */
export function lottiVolumi(universo: readonly Riga[], sedeGeo: { locationCode: number; nome: string } | null): Lotto[] {
  const conComune = [...new Set(universo.filter((r) => r.ammessa && r.tipo === "con_comune").map((r) => r.testo))].sort();
  const senza = sedeGeo ? [...new Set(universo.filter((r) => r.ammessa && r.tipo === "senza_comune" && r.comune).map((r) => r.testo))].sort() : [];
  const lotti: Lotto[] = [];
  for (let i = 0; i < conComune.length; i += MAX_KEYWORD_TASK) lotti.push({ locationCode: LOCATION_ITALIA, nome: "Italia", keywords: conComune.slice(i, i + MAX_KEYWORD_TASK) });
  for (let i = 0; i < senza.length; i += MAX_KEYWORD_TASK) lotti.push({ locationCode: sedeGeo!.locationCode, nome: sedeGeo!.nome, keywords: senza.slice(i, i + MAX_KEYWORD_TASK) });
  return lotti;
}

export interface VolumeLetto {
  valore: number | null;
  datiAl: string | null;
  spell: string | null;
}
export interface EsitoLotto {
  lotto: Lotto;
  risultati: ReadonlyMap<string, VolumeLetto>;
  fonte: Fonte;
}

/** Volumi nelle righe: null da Google = «non_disponibile», mai 0; ogni riga misurata porta la sua fonte. */
export function applicaVolumi(universo: readonly Riga[], esiti: readonly EsitoLotto[]): Riga[] {
  const per = new Map<string, { esito: EsitoLotto; letto: VolumeLetto | undefined }>();
  for (const e of esiti) for (const k of e.lotto.keywords) per.set(k, { esito: e, letto: e.risultati.get(k) });
  return universo.map((r) => {
    const x = per.get(r.testo);
    if (!x) return r;
    const valore = x.letto?.valore ?? null;
    const motivi = x.letto?.spell ? [...r.motivi, `Google Ads la corregge in «${x.letto.spell}»`] : r.motivi;
    return {
      ...r,
      motivi,
      volume: {
        valore,
        stato: valore === null ? "non_disponibile" : "misurato",
        geo: { locationCode: x.esito.lotto.locationCode, nome: x.esito.lotto.nome },
        datiAl: x.letto?.datiAl ?? null,
        fonte: x.esito.fonte,
      },
    };
  });
}

/* ---------- punteggio (§5.1) ---------- */

export const fattoreVolume = (vol: number | null): number => (!vol || vol <= 0 ? 0 : Math.min(1, Math.log10(1 + vol) / Math.log10(1001)));
export const VINCIBILITA = { bassa: 1, media: 0.4, alta: 0 } as const;

export function vicinanza(km: number | null): number {
  if (km === null) return 0.75;
  if (km === 0) return 1;
  if (km <= 10) return 0.9;
  if (km <= 25) return 0.75;
  return 0.6;
}

export function rilevanza(r: Pick<Riga, "testa" | "comune">): number {
  const base = r.testa.origine === "mestiere" ? 0.9 : r.testa.primaria ? 1 : 0.8;
  return base * (r.testa.mestiereAltrui ? 0.5 : 1) * vicinanza(r.comune ? r.comune.km : null);
}

const unDecimale = (n: number) => Math.round(n * 10 + Number.EPSILON * 10) / 10;

/** Punteggio 0-100 con i tre fattori (volume pesato dallo spazio organico, vincibilità, rilevanza). Serve la SERP. */
export function calcolaPunteggio(r: Riga): Riga["punteggio"] {
  if (!r.serp || !r.difficolta) return null;
  const V = fattoreVolume(r.volume.valore);
  const O = spazioOrganico(r.serp.feature);
  const W = VINCIBILITA[r.difficolta.livello];
  const R = rilevanza(r);
  const pv = 100 * PESI.volume * V * O;
  const pw = 100 * PESI.vincibilita * W;
  const pr = 100 * PESI.rilevanza * R;
  return {
    totale: unDecimale(pv + pw + pr),
    fattori: [
      { codice: "volume", testo: `volume ${unDecimale(pv)}`, valore: r.volume.valore, punti: unDecimale(pv) },
      { codice: "difficolta", testo: `difficoltà ${unDecimale(pw)}`, valore: r.difficolta.livello, punti: unDecimale(pw) },
      { codice: "rilevanza", testo: `rilevanza ${unDecimale(pr)}`, valore: unDecimale(R * 100) / 100, punti: unDecimale(pr) },
    ],
  };
}

/** Punteggio prima di spendere per la SERP (§5.2): solo volume e rilevanza. */
export const punteggioPre = (r: Riga): number => 100 * (PESI.volume * fattoreVolume(r.volume.valore) + PESI.rilevanza * rilevanza(r));

/** Luogo per la classificazione: il comune della ricerca (o la sede), con la provincia dal dataset. */
export function luogoDi(r: Riga, d: Pick<Dati, "province">): LuogoQuery | null {
  if (!r.comune) return null;
  return { nome: r.comune.nome, sigla: r.comune.sigla, provincia: d.province.get(r.comune.sigla)?.nome ?? null, popolazione: r.comune.popolazione };
}

/** SERP letta → riga con SERP, difficoltà e punteggio. */
export function applicaSerp(r: Riga, serp: SerpRidotta & Pick<Serp, "fonte" | "coordinate">, luogo: LuogoQuery): Riga {
  const d = difficolta(serp, r.testa.testo, luogo);
  const conSerp: Riga = { ...r, serp, difficolta: d };
  return { ...conSerp, punteggio: calcolaPunteggio(conSerp) };
}

/* ---------- candidati alla SERP (§5.2) ---------- */

const ordineVolume = (a: Riga, b: Riga) => (b.volume.valore ?? -1) - (a.volume.valore ?? -1);
const ordinePopolazione = (a: Riga, b: Riga) => (b.comune?.popolazione ?? -1) - (a.comune?.popolazione ?? -1);
const chiaveGruppo = (r: Riga) => `${r.testa.gruppo}|${r.tipo}|${r.comune?.istat ?? "-"}|${r.modificatore}`;

/** Righe di cui leggere la pagina di Google: una per gruppo, le prime 60 per Spre più le 3 migliori di ogni macro, tetto 100. */
export function candidatiSerp(universo: readonly Riga[], escluse: ReadonlySet<string>, macroOrdine: readonly string[]): Riga[] {
  const migliori = new Map<string, { r: Riga; s: number }>();
  for (const r of universo) {
    if (!r.ammessa || r.volume.stato === "non_richiesto" || !r.comune || escluse.has(r.testo)) continue;
    const s = punteggioPre(r);
    const k = chiaveGruppo(r);
    const m = migliori.get(k);
    if (!m || s > m.s || (s === m.s && r.testo < m.r.testo)) migliori.set(k, { r, s });
  }
  const ordinati = [...migliori.values()].sort((a, b) => b.s - a.s || ordineVolume(a.r, b.r) || ordinePopolazione(a.r, b.r) || (a.r.testo < b.r.testo ? -1 : 1)).map((x) => x.r);
  const presi = ordinati.slice(0, SERP_CANDIDATE);
  const scelti = new Set(presi);
  for (const macro of macroOrdine) {
    for (const r of ordinati.filter((x) => x.testa.macro === macro).slice(0, 3)) {
      if (presi.length >= MAX_SERP) break;
      if (!scelti.has(r)) {
        presi.push(r);
        scelti.add(r);
      }
    }
  }
  return presi.slice(0, MAX_SERP);
}

/** Coordinate della SERP: punto interno del comune (dataset T6a), raggio fisso; 4 decimali = chiave della cache stabile. */
export const coordinateDi = (centro: readonly [number, number]): string => `${centro[0].toFixed(4)},${centro[1].toFixed(4)},${RAGGIO_SERP_MM}`;

/* ---------- pagine e assegnazione (§3.4, §5.4) ---------- */

export function pagineDelContesto(c: ContestoMappa): Pagina[] {
  const usate = new Set<string>();
  const servizi = c.macro_categorie.map((m) => {
    let slug = slugMacro(m.nome);
    for (let i = 2; usate.has(slug); i++) slug = `${slugMacro(m.nome)}-${i}`;
    usate.add(slug);
    return { chiave: `servizio:${slug}`, tipo: "servizio" as const, etichetta: m.nome };
  });
  return [{ chiave: "home", tipo: "home", etichetta: "Home" }, ...servizi, { chiave: "zone", tipo: "zone", etichetta: "Zone servite" }];
}

export type RegolaPagina = "A1" | "A2" | "A3" | "A4" | "A3-senza-macro";

export function paginaDi(r: Riga, sede: string | null, pagine: readonly Pagina[]): { pagina: Pagina; regola: RegolaPagina } | null {
  const inSede = r.tipo === "senza_comune" || (!!sede && r.comune?.istat === sede);
  const trova = (chiave: string) => pagine.find((p) => p.chiave === chiave);
  if (r.testa.origine === "mestiere") {
    const p = trova(inSede ? "home" : "zone");
    return p ? { pagina: p, regola: inSede ? "A1" : "A2" } : null;
  }
  if (r.testa.macro) {
    const p = pagine.find((x) => x.tipo === "servizio" && x.etichetta === r.testa.macro);
    if (p) return { pagina: p, regola: inSede ? "A3" : "A4" };
  }
  // Servizio in nessuna macro: in home con avviso, mai per un mestiere altrui.
  if (r.testa.mestiereAltrui) return null;
  const home = trova("home");
  return home ? { pagina: home, regola: "A3-senza-macro" } : null;
}

/* ---------- frasi del «perché» (§5.5) ---------- */

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
function periodo(datiAl: string): string {
  const [a, m] = datiAl.split("-").map(Number) as [number, number];
  const inizio = a * 12 + (m - 1) - 11;
  return `${MESI[inizio % 12]} ${Math.floor(inizio / 12)} – ${MESI[m - 1]} ${a}`;
}
const decimale = (n: number) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(n);
const conSigla = (c: { nome: string; sigla: string }) => `${c.nome} (${c.sigla})`;

export function fraseVolume(r: Riga): string {
  const dove = r.tipo === "con_comune" ? "in Italia" : `a ${r.comune?.nome ?? "—"}`;
  const quando = r.volume.datiAl ? `, media ${periodo(r.volume.datiAl)}` : "";
  if (r.volume.stato === "non_richiesto") return "Volume non richiesto a Google Ads.";
  if (r.volume.valore === null) return "Volume non misurato da Google Ads: sotto la soglia di misura o assente.";
  return `Circa ${formatoIntero(r.volume.valore)} ricerche al mese ${dove} (Google Ads tramite DataForSEO${quando}, valori arrotondati da Google).`;
}

export function fraseComune(r: Riga, sede: string | null): string {
  const c = r.comune;
  if (!c) return "Ricerca senza comune e senza sede riconosciuta.";
  const area = c.area && c.area !== conSigla(c) ? `, nell'area «${c.area}»` : "";
  if (r.tipo === "senza_comune") return `Ricerca senza comune: Google mostra i risultati vicini a chi cerca; misurata a ${conSigla(c)}, sede del cliente.`;
  if (c.istat === sede) return `Comune della sede: ${conSigla(c)}${area}.`;
  return `Comune servito: ${conSigla(c)}, ${c.km === null ? "distanza dalla sede non nota" : `${formatoIntero(c.km)} km dalla sede`}${area}.`;
}

export function frasePagina(r: Riga, p: { pagina: Pagina; regola: RegolaPagina }): string {
  const inSede = p.regola === "A1" || p.regola === "A3";
  const dove = r.tipo === "senza_comune" ? "senza comune" : inSede ? "nel comune della sede" : `a ${r.comune?.nome ?? "—"}`;
  switch (p.regola) {
    case "A1":
      return `Pagina: home, il mestiere cercato ${dove}.`;
    case "A2":
      return `Pagina: Zone servite, il mestiere cercato ${dove}, comune tra le zone servite.`;
    case "A3":
      return `Pagina: servizio «${p.pagina.etichetta}», lavoro cercato ${dove}.`;
    case "A4":
      return `Pagina: servizio «${p.pagina.etichetta}», che nomina anche ${r.comune?.nome ?? "il comune"} tra le zone servite.`;
    case "A3-senza-macro":
      return "Pagina: home, perché il servizio non è in nessuna macro-categoria del contesto.";
  }
}

export function frasePunteggio(r: Riga): string {
  if (!r.punteggio) return "Punteggio non calcolato: pagina di Google non letta.";
  const [v, d, ril] = r.punteggio.fattori as [Fattore, Fattore, Fattore];
  return `Punteggio ${decimale(r.punteggio.totale)} su 100 (volume ${decimale(v.punti)} · difficoltà ${decimale(d.punti)} · rilevanza ${decimale(ril.punti)}).`;
}

export function perche(r: Riga, p: { pagina: Pagina; regola: RegolaPagina }, copre: readonly string[], sottoSoglia: boolean, sede: string | null): string[] {
  const frasi = [fraseVolume(r), fraseComune(r, sede)];
  if (r.difficolta) frasi.push(fraseDifficolta(r.difficolta));
  if (r.serp && !r.serp.vuota) frasi.push(fraseFeature(r.serp.feature));
  frasi.push(frasePagina(r, p), frasePunteggio(r));
  if (r.testa.mestiereAltrui) frasi.push("Il lavoro nomina un mestiere diverso da quello del cliente: rilevanza dimezzata.");
  if (sottoSoglia) frasi.push(`Sotto la soglia di ${SOGLIA_PUNTEGGIO} punti: scelta per coprire un servizio o arrivare a ${MIN_TARGET} ricerche.`);
  if (copre.length) frasi.push(`Copre anche ${copre.map((t) => `«${t}»`).join(", ")}: stessa intenzione o quasi gli stessi risultati di Google.`);
  return frasi;
}

/* ---------- selezione (§5.3) ---------- */

interface Candidata {
  r: Riga;
  p: { pagina: Pagina; regola: RegolaPagina };
  copre: string[];
  urls: Set<string>;
}

const urlConfrontabile = (u: string) => u.replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let comuni = 0;
  for (const x of a) if (b.has(x)) comuni += 1;
  return comuni / (a.size + b.size - comuni);
}

const ordineTarget = (a: Riga, b: Riga) => (b.punteggio?.totale ?? 0) - (a.punteggio?.totale ?? 0) || ordineVolume(a, b) || ordinePopolazione(a, b) || (a.testo < b.testo ? -1 : 1);

export interface EsitoSelezione {
  target: Target[];
  stato: MappaQuery["stato"];
  motivi: string[];
}

/** Da universo misurato a target: idonee, doppioni d'intento, soglia, 3 per pagina, copertura delle macro, minimo 8. */
export function seleziona(universo: readonly Riga[], escluse: ReadonlySet<string>, pagine: readonly Pagina[], sede: string | null, serpNonLette: number): EsitoSelezione {
  const idonee: Candidata[] = [];
  let senzaPagina = 0;
  for (const r of [...universo].sort(ordineTarget)) {
    if (!r.ammessa || escluse.has(r.testo) || !r.serp || !r.difficolta || r.difficolta.livello === "alta" || !r.punteggio) continue;
    const p = paginaDi(r, sede, pagine);
    if (!p) {
      senzaPagina += 1;
      continue;
    }
    idonee.push({ r, p, copre: [], urls: new Set(r.serp.organici.map((o) => urlConfrontabile(o.url))) });
  }

  // Doppioni d'intento: stesso gruppo nello stesso comune, poi stessi risultati di Google sulla stessa pagina.
  const perGruppo = new Map<string, Candidata>();
  const uniche: Candidata[] = [];
  for (const c of idonee) {
    const k = `${c.r.testa.gruppo}|${c.r.tipo}|${c.r.comune?.istat ?? "-"}`;
    const vincente = perGruppo.get(k) ?? uniche.find((u) => u.p.pagina.chiave === c.p.pagina.chiave && jaccard(u.urls, c.urls) >= JACCARD_VARIANTE);
    if (vincente) {
      vincente.copre.push(c.r.testo);
      // Anche una variante coperta per risultati di Google porta il suo gruppo alla vincente: i fratelli dello stesso
      // gruppo e comune (es. «preventivo …») vanno alla stessa vincente, non diventano ricerche separate.
      perGruppo.set(k, vincente);
      continue;
    }
    perGruppo.set(k, c);
    uniche.push(c);
  }

  const presi: Candidata[] = [];
  const perPagina = (chiave: string) => presi.filter((x) => x.p.pagina.chiave === chiave).length;
  const senzaVolume = (c: Candidata) => !c.r.volume.valore;
  const puo = (c: Candidata, meta: boolean) => {
    if (presi.includes(c) || presi.length >= MAX_TARGET || perPagina(c.p.pagina.chiave) >= MAX_PER_PAGINA) return false;
    if (!meta || !senzaVolume(c)) return true;
    const nulli = presi.filter(senzaVolume).length;
    return nulli + 1 <= presi.length - nulli; // al massimo metà dei target senza volume
  };
  for (const c of uniche) {
    if ((c.r.punteggio?.totale ?? 0) < SOGLIA_PUNTEGGIO) break;
    if (puo(c, true)) presi.push(c);
  }
  // Copertura dei servizi: ogni macro con una ricerca idonea ne ha almeno una, anche sotto soglia.
  for (const pagina of pagine.filter((p) => p.tipo === "servizio")) {
    if (perPagina(pagina.chiave) > 0) continue;
    const migliore = uniche.find((c) => c.p.pagina.chiave === pagina.chiave);
    if (!migliore) continue;
    if (presi.length >= MAX_TARGET) {
      const sostituibile = [...presi].reverse().find((x) => perPagina(x.p.pagina.chiave) >= 2);
      if (!sostituibile) continue;
      presi.splice(presi.indexOf(sostituibile), 1);
    }
    presi.push(migliore);
  }
  // Minimo 8: prima col limite dei volumi nulli, poi senza (mancano alternative).
  for (const meta of [true, false]) {
    for (const c of uniche) {
      if (presi.length >= MIN_TARGET) break;
      if (puo(c, meta)) presi.push(c);
    }
  }

  const ordinePagine = new Map(pagine.map((p, i) => [p.chiave, i]));
  const scelti = [...presi].sort((a, b) => ordinePagine.get(a.p.pagina.chiave)! - ordinePagine.get(b.p.pagina.chiave)! || ordineTarget(a.r, b.r));
  const principali = new Set<string>();
  const target: Target[] = scelti.map((c) => {
    const principale = !principali.has(c.p.pagina.chiave);
    principali.add(c.p.pagina.chiave);
    const sottoSoglia = (c.r.punteggio?.totale ?? 0) < SOGLIA_PUNTEGGIO;
    return { testo: c.r.testo, pagina: c.p.pagina.chiave, ruolo: principale ? "principale" : "secondaria", sottoSoglia, perche: perche(c.r, c.p, c.copre, sottoSoglia, sede) };
  });

  const motivi: string[] = [];
  if (target.length < MIN_TARGET) {
    const attive = universo.filter((r) => r.ammessa && !escluse.has(r.testo));
    const alte = attive.filter((r) => r.difficolta?.livello === "alta").length;
    const quante = (n: number, testo: string) => `${formatoIntero(n)} ${n === 1 ? "ricerca" : "ricerche"} ${testo}`;
    if (alte) motivi.push(quante(alte, "con difficoltà alta"));
    if (serpNonLette) motivi.push(quante(serpNonLette, "senza pagina di Google letta"));
    if (escluse.size) motivi.push(quante([...escluse].filter((t) => universo.some((r) => r.testo === t)).length, "escluse da te"));
    if (senzaPagina) motivi.push(quante(senzaPagina, "senza una pagina del sito che le possa ospitare"));
    if (uniche.length >= MIN_TARGET) motivi.push(`al massimo ${MAX_PER_PAGINA} ricerche per pagina: le ${formatoIntero(uniche.length)} utilizzabili stanno su poche pagine`);
    if (uniche.length === 0 && !motivi.length) motivi.push("nessuna ricerca con volume e pagina di Google letta");
  }
  return { target, stato: target.length < MIN_TARGET ? "insufficiente" : serpNonLette > 0 ? "parziale" : "completa", motivi };
}

/* ---------- composizione della mappa ---------- */

export type DatiMappa = Omit<MappaQuery, "versione" | "stato" | "motivi" | "target">;

/** Mappa completa e validata: la selezione è funzione di universo, esclusioni, pagine e sede (riselezione senza chiamate). */
export function componiMappa(d: DatiMappa): MappaQuery {
  const s = seleziona(d.universo, new Set(d.escluse), d.pagine, d.ingressi.sede, d.serpNonLette.length);
  return MappaQuerySchema.parse({ versione: 1, ...d, stato: s.stato, motivi: s.motivi, target: s.target } satisfies MappaQuery);
}

/** Esclusione o riammissione: stessa mappa (e stessa data del calcolo), nuova selezione, nessuna chiamata. */
export function riseleziona(m: MappaQuery, escluse: readonly string[], selezionataAt: string): MappaQuery {
  const { versione: _v, stato: _s, motivi: _m, target: _t, ...dati } = m;
  return componiMappa({ ...dati, escluse: [...escluse], selezionataAt });
}

/** Stima del costo di una mappa (UI e controllo del saldo): lotti di volumi e pagine di Google, al massimo. */
export const stimaCostoUsd = (lotti: number, serp: number): number => Math.round((lotti * PREZZO_VOLUMI_TASK_USD + serp * PREZZO_SERP_USD) * 100) / 100;

/** Pagine di Google al massimo per un universo (prima dei volumi): gruppi misurabili, 60 + 3 per macro, tetto 100. */
export function serpMassime(universo: readonly Riga[], nMacro: number): number {
  const gruppi = new Set(universo.filter((r) => r.ammessa && r.comune).map(chiaveGruppo)).size;
  return Math.min(MAX_SERP, gruppi, SERP_CANDIDATE + 3 * nMacro);
}

/* ---------- esclusioni ---------- */

export type EsitoEsclusione = { ok: true; esclusioni: Esclusioni } | { ok: false; codice: 409 | 422; errore: string };

export function aggiungiEsclusione(m: MappaQuery, e: Esclusioni, testo: string, motivo: string, at: string): EsitoEsclusione {
  const t = normalizzaQuery(testo);
  const mot = motivo.trim();
  if (!m.universo.some((r) => r.testo === t)) return { ok: false, codice: 422, errore: `«${t}» non è tra le ricerche della mappa` };
  if (e.voci.some((v) => v.testo === t)) return { ok: false, codice: 422, errore: `«${t}» è già esclusa` };
  if (mot.length < 3 || mot.length > 200) return { ok: false, codice: 422, errore: "Il motivo dell'esclusione va da 3 a 200 caratteri" };
  if (e.voci.length >= 500) return { ok: false, codice: 422, errore: "Troppe esclusioni (massimo 500): riammettine qualcuna" };
  return { ok: true, esclusioni: { versione: 1, voci: [...e.voci, { testo: t, motivo: mot, at }] } };
}

export function togliEsclusione(e: Esclusioni, testo: string): EsitoEsclusione {
  const t = normalizzaQuery(testo);
  if (!e.voci.some((v) => v.testo === t)) return { ok: false, codice: 422, errore: `«${t}» non è tra le ricerche escluse` };
  return { ok: true, esclusioni: { versione: 1, voci: e.voci.filter((v) => v.testo !== t) } };
}

/* ---------- blocchi e staleness (§8) ---------- */

/** Errore scritto dal lavoro quando l'operatore lo ferma dalla status bar (la vista non lo tratta come un fallimento). */
export const MESSAGGIO_INTERROTTO = "run interrotto";
export const MOTIVO_NON_CONFIGURATA ="DataForSEO non configurata: per calcolare la mappa servono login e password in Impostazioni → Chiavi API";
export type CodiceBlocco = "sito" | "contesto" | "zone" | "zone_bloccate" | "chiavi" | "esclusioni";

export interface IngressiBlocco {
  sito: "spento" | "attivo" | "sospeso" | "non_leggibile";
  contesto: { ok: true } | { ok: false; motivo: string };
  zone: { ok: true } | { ok: false; motivo: string };
  comuni: { ok: true } | { ok: false; motivo: string } | null;
  configurata: boolean;
  esclusioni: { ok: true } | { ok: false; motivo: string };
}

/** Primo motivo per cui la mappa non si calcola (null = si può). Le frasi di zoneUsabili passano identiche. */
export function motivoBloccoMappa(i: IngressiBlocco): { codice: CodiceBlocco; motivo: string } | null {
  if (i.sito === "non_leggibile") return { codice: "sito", motivo: "client.json non leggibile: correggilo a mano prima di calcolare la mappa" };
  if (i.sito === "spento") return { codice: "sito", motivo: "Il servizio Sito non è attivo: attivalo per calcolare la mappa" };
  if (i.sito === "sospeso") return { codice: "sito", motivo: "Servizio Sito sospeso: la mappa resta com'è" };
  if (!i.contesto.ok) return { codice: "contesto", motivo: i.contesto.motivo };
  if (!i.zone.ok) {
    const attesa = /da controllare|da impostare|form lead è cambiato/.test(i.zone.motivo);
    return { codice: attesa ? "zone" : "zone_bloccate", motivo: i.zone.motivo };
  }
  if (i.comuni && !i.comuni.ok) return { codice: "zone_bloccate", motivo: i.comuni.motivo };
  if (!i.esclusioni.ok) return { codice: "esclusioni", motivo: i.esclusioni.motivo };
  if (!i.configurata) return { codice: "chiavi", motivo: MOTIVO_NON_CONFIGURATA };
  return null;
}

export interface ImpronteAttuali {
  contestoSha: string | null;
  zoneSha: string | null;
  lessicoSha: string;
  dominiSha: string;
}

/** Cosa è cambiato dagli ingressi della mappa (mono nel banner «Da ricalcolare»). */
export function cambiati(m: Pick<MappaQuery, "ingressi" | "regole">, a: ImpronteAttuali): string[] {
  const out: string[] = [];
  if (a.contestoSha && a.contestoSha !== m.ingressi.contestoSha) out.push("contesto.json");
  if (a.zoneSha && a.zoneSha !== m.ingressi.zoneSha) out.push("zone servite");
  if (a.lessicoSha !== m.regole.lessicoSha) out.push("lib/mappa-lessico.json");
  if (a.dominiSha !== m.regole.dominiSha) out.push("lib/mappa-domini.json");
  if (m.regole.versione !== VERSIONE_REGOLE) out.push("regole del punteggio");
  return out;
}

/* ---------- vista per la UI (§8, dati serializzabili) ---------- */

export type StatoVista =
  | "non_configurata"
  | "attesa_zone"
  | "bloccata"
  | "da_calcolare"
  | "in_calcolo"
  | "non_riuscita"
  | "non_leggibile"
  | "pronta"
  | "parziale"
  | "poche"
  | "da_ricalcolare"
  | "in_pausa";
export type TonoVista = "ok" | "warn" | "err" | "brand" | "idle";

export interface RigaVista {
  testo: string;
  /** «70 al mese», «90 al mese a Cologno Monzese», «volume non misurato». */
  volume: string;
  difficolta: "bassa" | "media" | null;
  perche: string[];
  checkUrl: string | null;
}
export interface GruppoVista {
  chiave: string;
  titolo: string;
  righe: RigaVista[];
}
export interface VistaMappa {
  stato: StatoVista;
  badge: { tone: TonoVista; label: string };
  /** Una mappa leggibile c'è, anche con 0 ricerche scelte: decide «Ricalcola…» (con dialog) al posto di «Calcola la mappa». */
  haMappa: boolean;
  /** Frase di stato (role=status): cosa succede o cosa manca. */
  frase: string | null;
  /** Il calcolo non si può avviare: il perché, scritto accanto al bottone disabilitato. */
  motivoBlocco: string | null;
  meta: string | null;
  gruppi: GruppoVista[];
  dettagli: { riepilogo: string; serviziSenzaQuery: string[]; dominiNonInElenco: string[]; avvisi: string[] } | null;
  escluse: { testo: string; motivo: string; at: string }[];
  cambiati: string[];
  /** Ultimo calcolo fallito dopo la mappa mostrata (o senza mappa). */
  erroreUltimo: string | null;
  motiviPoche: string[];
  registrate: boolean;
  /** Stima massima del costo del prossimo calcolo, per i dialog (null: ingressi non leggibili). */
  stimaUsd: number | null;
  comuniUsati: number | null;
  /** Escludi e Riammetti disponibili (Sito attivo, mappa leggibile, nessun calcolo in corso). */
  modificabile: boolean;
}

export interface IngressiVista {
  sito: IngressiBlocco["sito"];
  lettura: { stato: "assente" } | { stato: "non_leggibile"; motivo: string } | { stato: "ok"; mappa: MappaQuery };
  esclusioni: Esclusioni | null;
  blocco: { codice: CodiceBlocco; motivo: string } | null;
  impronte: ImpronteAttuali | null;
  inCalcolo: boolean;
  ultimo: { esito: "ok" | "errore"; messaggio: string | null; at: number | null } | null;
  stimaUsd: number | null;
  comuniUsati: number | null;
}

const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const dataIt = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Rome" });
const ggmm = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", timeZone: "Europe/Rome" });
const usd = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function volumeBreve(r: Riga): string {
  if (r.volume.stato === "non_richiesto") return "volume non richiesto";
  if (r.volume.valore === null) return "volume non misurato";
  const n = `${formatoIntero(r.volume.valore)} al mese`;
  return r.tipo === "senza_comune" && r.comune ? `${n} a ${r.comune.nome}` : n;
}

/** Dalla mappa e dallo stato del cliente alla vista della sotto-sezione «Ricerche su cui puntare» (nessuna scrittura). */
export function vistaMappa(i: IngressiVista): VistaMappa {
  const m = i.lettura.stato === "ok" ? i.lettura.mappa : null;
  const vuota: VistaMappa = {
    stato: "da_calcolare",
    badge: { tone: "brand", label: "Da calcolare" },
    haMappa: false,
    frase: null,
    motivoBlocco: i.blocco?.motivo ?? null,
    meta: null,
    gruppi: [],
    dettagli: null,
    escluse: i.esclusioni?.voci ?? [],
    cambiati: [],
    erroreUltimo: null,
    motiviPoche: [],
    registrate: false,
    stimaUsd: i.stimaUsd,
    comuniUsati: i.comuniUsati,
    modificabile: false,
  };
  // Uno stop dell'operatore non è un fallimento: la mappa (o la sua assenza) resta com'era, nessun banner.
  const interrotto = i.ultimo?.messaggio?.startsWith(MESSAGGIO_INTERROTTO) ?? false;
  const erroreUltimo = i.ultimo?.esito === "errore" && !interrotto && (!m || (i.ultimo.at ?? 0) > Date.parse(m.generataAt)) ? (i.ultimo.messaggio ?? "errore senza messaggio") : null;

  if (i.lettura.stato === "non_leggibile") {
    return { ...vuota, stato: i.inCalcolo ? "in_calcolo" : "non_leggibile", badge: i.inCalcolo ? { tone: "brand", label: "In calcolo" } : { tone: "err", label: "Non leggibile" }, frase: `${FILE_MAPPA} non leggibile (${i.lettura.motivo}): ricalcolala per riscriverla.`, erroreUltimo };
  }
  if (!m) {
    if (i.inCalcolo) return { ...vuota, stato: "in_calcolo", badge: { tone: "brand", label: "In calcolo" } };
    if (i.sito === "sospeso") return { ...vuota, stato: "in_pausa", badge: { tone: "idle", label: "In pausa" }, frase: "Servizio sospeso: la mappa non si calcola finché il Sito resta sospeso." };
    switch (i.blocco?.codice) {
      case "zone":
        return { ...vuota, stato: "attesa_zone", badge: { tone: "idle", label: "In attesa delle zone" }, frase: `${i.blocco.motivo}.` };
      case "chiavi":
        return { ...vuota, stato: "non_configurata", badge: { tone: "idle", label: "Non configurata" }, frase: "Per calcolare la mappa servono login e password di DataForSEO in Impostazioni → Chiavi API." };
      case "contesto":
      case "zone_bloccate":
      case "esclusioni":
      case "sito":
        return { ...vuota, stato: "bloccata", badge: { tone: "err", label: "Bloccata" }, frase: null };
    }
    if (erroreUltimo) return { ...vuota, stato: "non_riuscita", badge: { tone: "err", label: "Non riuscita" }, erroreUltimo };
    const n = i.comuniUsati ?? 0;
    const stima = i.stimaUsd === null ? "" : ` Costo stimato circa ${usd(i.stimaUsd)} $.`;
    return { ...vuota, frase: `Sceglie da ${MIN_TARGET} a ${MAX_TARGET} ricerche reali per i lavori del cliente nei ${formatoIntero(n)} comuni più popolosi e vicini delle zone servite.${stima}` };
  }

  // Mappa presente.
  const escluseFile = new Set((i.esclusioni?.voci ?? []).map((v) => v.testo));
  const diverse = i.esclusioni !== null && (escluseFile.size !== m.escluse.length || m.escluse.some((t) => !escluseFile.has(t)));
  // Riammesse dopo un calcolo che le aveva escluse: senza pagina di Google non possono tornare tra le scelte finché non si
  // ricalcola. Contano solo quelle che il calcolo leggerebbe (candidate): le altre non cambierebbero nulla.
  const alCalcolo = new Set(m.escluseAlCalcolo ?? []);
  const macroOrdine = m.pagine.filter((p) => p.tipo === "servizio").map((p) => p.etichetta);
  const riammesse = alCalcolo.size ? candidatiSerp(m.universo, new Set(m.escluse), macroOrdine).filter((r) => !r.serp && alCalcolo.has(r.testo)).length : 0;
  const cambiato = [
    ...(i.impronte ? cambiati(m, i.impronte) : []),
    ...(diverse ? [FILE_ESCLUSIONI] : []),
    ...(riammesse ? [`${riammesse === 1 ? "1 ricerca riammessa" : `${formatoIntero(riammesse)} ricerche riammesse`} senza pagina di Google`] : []),
  ];
  const perTesto = new Map(m.universo.map((r) => [r.testo, r]));
  const gruppi: GruppoVista[] = m.pagine
    .map((p) => ({
      chiave: p.chiave,
      titolo: p.tipo === "servizio" ? `Servizio · ${p.etichetta}` : p.etichetta,
      righe: m.target
        .filter((t) => t.pagina === p.chiave)
        .map((t) => {
          const r = perTesto.get(t.testo)!;
          return { testo: t.testo, volume: volumeBreve(r), difficolta: r.difficolta?.livello === "alta" ? null : (r.difficolta?.livello ?? null), perche: t.perche, checkUrl: r.serp?.checkUrl ?? null };
        }),
    }))
    .filter((g) => g.righe.length > 0);

  const mesi = m.universo.map((r) => r.volume.datiAl).filter((x): x is string => !!x).sort();
  const serpLette = m.universo.filter((r) => r.serp);
  const letteAt = serpLette.map((r) => r.serp!.fonte.lettoAt).sort();
  const fonti = new Map<string, number>();
  for (const r of m.universo) {
    if (r.volume.fonte) fonti.set(r.volume.fonte.richiestaSha, r.volume.fonte.costoUsd);
    if (r.serp) fonti.set(r.serp.fonte.richiestaSha, r.serp.fonte.costoUsd);
  }
  const costoDati = [...fonti.values()].reduce((s, x) => s + x, 0);
  const ultimoMese = mesi.at(-1);
  const meta = [
    `Calcolata il ${dataIt(m.generataAt)}`,
    `${formatoIntero(m.ingressi.comuniUsati)} comuni delle zone servite`,
    ...(ultimoMese ? [`volumi Google Ads fino ${/^[aeiou]/.test(MESI_LUNGHI[Number(ultimoMese.slice(5)) - 1]!) ? "ad" : "a"} ${MESI_LUNGHI[Number(ultimoMese.slice(5)) - 1]} ${ultimoMese.slice(0, 4)}`] : []),
    ...(letteAt.length ? [`pagine di Google lette il ${ggmm(letteAt.at(-1)!)}`] : []),
    `costo dei dati ${usd(costoDati)} $${m.costo.chiamatePagate === 0 && m.costo.dallaCache > 0 ? " (dalla cache)" : ""}`,
  ].join(" · ");

  let stato: StatoVista = m.stato === "completa" ? "pronta" : m.stato === "parziale" ? "parziale" : "poche";
  if (cambiato.length) stato = "da_ricalcolare";
  if (i.sito === "sospeso") stato = "in_pausa";
  if (i.inCalcolo) stato = "in_calcolo";
  const badge: Record<StatoVista, VistaMappa["badge"]> = {
    pronta: { tone: "ok", label: "Pronta" },
    parziale: { tone: "warn", label: "Parziale" },
    poche: { tone: "warn", label: "Poche ricerche" },
    da_ricalcolare: { tone: "warn", label: "Da ricalcolare" },
    in_pausa: { tone: "idle", label: "In pausa" },
    in_calcolo: { tone: "brand", label: "In calcolo" },
    non_configurata: { tone: "idle", label: "Non configurata" },
    attesa_zone: { tone: "idle", label: "In attesa delle zone" },
    bloccata: { tone: "err", label: "Bloccata" },
    da_calcolare: { tone: "brand", label: "Da calcolare" },
    non_riuscita: { tone: "err", label: "Non riuscita" },
    non_leggibile: { tone: "err", label: "Non leggibile" },
  };
  const frase =
    stato === "in_pausa"
      ? "Servizio sospeso: la mappa resta com'è."
      : stato === "parziale"
        ? `${formatoIntero(m.serpNonLette.length)} ${m.serpNonLette.length === 1 ? "ricerca" : "ricerche"} senza pagina di Google letta: ricalcola per completarle.`
        : stato === "poche"
          ? `Solo ${formatoIntero(m.target.length)} ${m.target.length === 1 ? "ricerca utilizzabile" : "ricerche utilizzabili"} (ne servono almeno ${MIN_TARGET}):`
          : null;
  return {
    ...vuota,
    stato,
    badge: badge[stato],
    haMappa: true,
    frase,
    meta,
    gruppi,
    dettagli: {
      riepilogo: `${formatoIntero(m.universo.length)} ricerche · ${formatoIntero(m.ingressi.comuniUsati)} comuni su ${formatoIntero(m.ingressi.comuniArea)} · ${formatoIntero(serpLette.length)} pagine di Google`,
      serviziSenzaQuery: m.serviziSenzaQuery,
      dominiNonInElenco: m.dominiNonInElenco,
      avvisi: m.avvisi,
    },
    cambiati: cambiato,
    erroreUltimo,
    motiviPoche: m.stato === "insufficiente" ? m.motivi : [],
    registrate: m.ingressi.registrate,
    comuniUsati: i.comuniUsati ?? m.ingressi.comuniUsati,
    modificabile: i.sito === "attivo" && !i.inCalcolo && i.esclusioni !== null,
  };
}
