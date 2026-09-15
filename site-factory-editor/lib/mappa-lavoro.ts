// Lavoro «traffico:<slug>:mappa» (piano docs/traffico/piano-T4.md §7): letture degli ingressi, generatore delle sei
// fasi sul run-bus, scritture atomiche della mappa, esclusioni e riammissioni senza chiamate.
//
// Nessuno stato «in corso» su disco (niente zombie da riparare): uno stop o un errore lasciano intatta la mappa
// precedente. client.json e traffico/zone-servite.json non si toccano mai. Stato del Sito, dominio e configurazione
// delle chiavi li passa chi chiama (route e pagina): questo modulo gira anche nel banco con strip-types.
import fs from "node:fs";
import path from "node:path";
import type { RunEvent } from "./run-step.ts";
import { REPO_ROOT } from "./paths.ts";
import { caricaDati, comuniServiti, leggiZoneServite, regioneDiSigla, zoneUsabili, ErroreDati, type Dati, type Zone } from "./zone-servite.ts";
import * as mq from "./mappa-query.ts";
import { dominiIgnoti, formatoIntero, riduciSerp, type Domini } from "./serp-classifica.ts";
import { EP_SERP, EP_VOLUMI, ErroreDfs, corpoSerp, corpoVolumi, trovaLocalita, type ClientDfs } from "./dataforseo.ts";

/* ---------- letture ---------- */

export const PERCORSI_REGOLE = {
  lessico: path.join(REPO_ROOT, "site-factory-editor", "lib", "mappa-lessico.json"),
  domini: path.join(REPO_ROOT, "site-factory-editor", "lib", "mappa-domini.json"),
};

export interface Regole {
  lessico: mq.Lessico;
  lessicoSha: string;
  domini: Domini;
  dominiSha: string;
}

/** Lessico e domini versionati con i loro sha. Un file fuori schema è un difetto dell'editor: errore leggibile. */
export function leggiRegole(p = PERCORSI_REGOLE): Regole {
  const uno = <T>(file: string, schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }) => {
    const testo = fs.readFileSync(file, "utf8");
    const r = schema.safeParse(JSON.parse(testo));
    if (!r.success) throw new Error(`${path.basename(file)} fuori schema: ${r.error.issues.slice(0, 2).map((i) => `${i.path.join(".") || "radice"} ${i.message}`).join("; ")}`);
    return { dati: r.data, sha: mq.sha256(testo) };
  };
  const l = uno(p.lessico, mq.LessicoSchema);
  const d = uno(p.domini, mq.DominiSchema);
  return { lessico: l.dati, lessicoSha: l.sha, domini: d.dati as Domini, dominiSha: d.sha };
}

const leggiTesto = (file: string): string | null => {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
};
const problemi = (issues: readonly { path: PropertyKey[]; message: string }[]) =>
  issues
    .slice(0, 2)
    .map((i) => `${i.path.join(".") || "radice"}: ${i.message}`)
    .join("; ");

export type LetturaContesto = { ok: true; contesto: mq.ContestoMappa; sha: string } | { ok: false; motivo: string };
export function leggiContesto(dir: string): LetturaContesto {
  const testo = leggiTesto(path.join(dir, "contesto.json"));
  if (testo === null) return { ok: false, motivo: "contesto.json assente: la mappa nasce dai servizi del contesto del cliente" };
  let raw: unknown;
  try {
    raw = JSON.parse(testo);
  } catch {
    return { ok: false, motivo: "contesto.json non è JSON valido: correggilo o rigeneralo" };
  }
  const r = mq.ContestoMappaSchema.safeParse(raw);
  if (!r.success) return { ok: false, motivo: `contesto.json non valido per la mappa (${problemi(r.error.issues)}): correggilo o rigeneralo` };
  if (r.data.servizi_atomizzati.length === 0) return { ok: false, motivo: "contesto.json senza servizi: la mappa nasce dai servizi del cliente" };
  return { ok: true, contesto: r.data, sha: mq.sha256(testo) };
}

export type LetturaEsclusioni = { ok: true; esclusioni: mq.Esclusioni } | { ok: false; motivo: string };
export function leggiEsclusioni(dir: string): LetturaEsclusioni {
  const testo = leggiTesto(path.join(dir, mq.FILE_ESCLUSIONI));
  if (testo === null) return { ok: true, esclusioni: { versione: 1, voci: [] } };
  try {
    const r = mq.EsclusioniSchema.safeParse(JSON.parse(testo));
    if (r.success) return { ok: true, esclusioni: r.data };
    return { ok: false, motivo: `${mq.FILE_ESCLUSIONI} non leggibile (${problemi(r.error.issues)}): correggilo a mano, non viene sovrascritto` };
  } catch {
    return { ok: false, motivo: `${mq.FILE_ESCLUSIONI} non è JSON valido: correggilo a mano, non viene sovrascritto` };
  }
}

export type LetturaMappa = { stato: "assente" } | { stato: "non_leggibile"; motivo: string } | { stato: "ok"; mappa: mq.MappaQuery };
export function leggiMappa(dir: string): LetturaMappa {
  const testo = leggiTesto(path.join(dir, mq.FILE_MAPPA));
  if (testo === null) return { stato: "assente" };
  try {
    const r = mq.MappaQuerySchema.safeParse(JSON.parse(testo));
    return r.success ? { stato: "ok", mappa: r.data } : { stato: "non_leggibile", motivo: problemi(r.error.issues) };
  } catch {
    return { stato: "non_leggibile", motivo: "JSON non valido" };
  }
}

/** Ultimo esito del lavoro dal log degli eventi (il bus lo azzera a ogni avvio). */
export function ultimoEsito(dir: string): { esito: "ok" | "errore"; messaggio: string | null; at: number | null } | null {
  const testo = leggiTesto(path.join(dir, mq.FILE_LOG_MAPPA));
  if (!testo) return null;
  const eventi = testo
    .split("\n")
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as { type: string; message?: string; t?: number }];
      } catch {
        return [];
      }
    });
  const ultimo = [...eventi].reverse().find((e) => e.type === "done" || e.type === "error");
  if (!ultimo) return null;
  return { esito: ultimo.type === "done" ? "ok" : "errore", messaggio: ultimo.message ?? null, at: ultimo.t ?? null };
}

/* ---------- ingressi (snapshot della route prima di avviare) ---------- */

export interface StatoCliente {
  sito: mq.IngressiBlocco["sito"];
  dominio: string | null;
  configurata: boolean;
}

export interface IngressiMappa {
  dir: string;
  contesto: mq.ContestoMappa;
  contestoSha: string;
  zone: Zone;
  dati: Dati;
  teste: mq.Testa[];
  serviziSenzaQuery: string[];
  comuni: Extract<mq.EsitoComuni, { ok: true }>;
  universo: mq.Riga[];
  doppioni: number;
  pagine: mq.Pagina[];
  esclusioni: mq.Esclusioni;
  regole: Regole;
  dominioCliente: string | null;
  zoneSha: string;
}

export type LetturaIngressi = { ok: true; ingressi: IngressiMappa } | { ok: false; blocco: NonNullable<ReturnType<typeof mq.motivoBloccoMappa>> };

/** Tutto ciò che serve al calcolo, letto una volta; il primo blocco con la sua frase se non si può calcolare. */
export function leggiIngressi(dir: string, stato: StatoCliente, regole: Regole = leggiRegole()): LetturaIngressi {
  const contesto = leggiContesto(dir);
  const zone = zoneUsabili(leggiZoneServite(dir));
  const esclusioni = leggiEsclusioni(dir);
  let dati: Dati | null = null;
  let comuni: mq.EsitoComuni | null = null;
  let teste: ReturnType<typeof mq.testeDelContesto> | null = null;
  if (contesto.ok && zone.ok) {
    try {
      dati = caricaDati();
    } catch (e) {
      if (!(e instanceof ErroreDati)) throw e;
      comuni = { ok: false, motivo: `Dati dei comuni non leggibili: ${e.message}` };
    }
    if (dati) {
      teste = mq.testeDelContesto(contesto.contesto, regole.lessico);
      comuni = mq.comuniUsati(zone.zone, comuniServiti(zone.zone, dati), teste.teste.length, dati);
    }
  }
  const blocco = mq.motivoBloccoMappa({
    sito: stato.sito,
    contesto: contesto.ok ? { ok: true } : contesto,
    zone: zone.ok ? { ok: true } : zone,
    comuni: comuni && !comuni.ok ? comuni : { ok: true },
    configurata: stato.configurata,
    esclusioni: esclusioni.ok ? { ok: true } : esclusioni,
  });
  if (blocco) return { ok: false, blocco };
  if (!contesto.ok || !zone.ok || !esclusioni.ok || !dati || !teste || !comuni?.ok) throw new Error("ingressi incoerenti dopo i controlli");
  if (teste.teste.length === 0) {
    return { ok: false, blocco: { codice: "contesto", motivo: "Nessun servizio del contesto ha ricerche nel lessico: va curato lib/mappa-lessico.json" } };
  }
  const { universo, doppioni } = mq.componiUniverso(teste.teste, comuni);
  return {
    ok: true,
    ingressi: {
      dir,
      contesto: contesto.contesto,
      contestoSha: contesto.sha,
      zone: zone.zone,
      dati,
      teste: teste.teste,
      serviziSenzaQuery: teste.serviziSenzaQuery,
      comuni,
      universo,
      doppioni,
      pagine: mq.pagineDelContesto(contesto.contesto),
      esclusioni: esclusioni.esclusioni,
      regole,
      dominioCliente: stato.dominio,
      zoneSha: mq.zoneSha(comuni.sede?.istat ?? null, comuni.usati),
    },
  };
}

/* ---------- scritture ---------- */

function scriviAtomico(file: string, testo: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, testo, "utf8");
  fs.renameSync(`${file}.tmp`, file);
}

function scriviMappa(dir: string, m: mq.MappaQuery): void {
  // Compatto: con 2.656 righe il file indentato passa i 3 MB (si legge con jq, vedi docs/DEBUG.md).
  scriviAtomico(path.join(dir, mq.FILE_MAPPA), JSON.stringify(m) + "\n");
  fs.appendFileSync(path.join(dir, mq.FILE_STORICO), JSON.stringify({ at: m.generataAt, versioneRegole: m.regole.versione, stato: m.stato, target: m.target.map((t) => ({ testo: t.testo, pagina: t.pagina })) }) + "\n");
}

/* ---------- il lavoro (§7) ---------- */

export const FASI = ["Controllo dei dati", "Ricerche possibili", "Volumi di ricerca", "Risultati di Google", "Classificazione e punteggio", "Scrittura della mappa"] as const;
const PARALLELE_SERP = 5;
const dollari = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Sei fasi, eventi per il bus. Un errore DataForSEO (credenziali, credito, limiti dopo i tentativi, forma) ferma il
 * lavoro con un solo `error` e nessuna scrittura; una pagina di Google non letta dopo i tentativi rende la mappa «parziale».
 */
export async function* eseguiMappa(ing: IngressiMappa, client: ClientDfs, opz: { signal: AbortSignal; adesso?: () => Date }): AsyncGenerator<RunEvent> {
  const adesso = opz.adesso ?? (() => new Date());
  const avvisi = [...ing.comuni.avvisi];
  try {
    yield { type: "phase", label: FASI[0] };
    const sede = ing.comuni.sede;
    let sedeGeo: { locationCode: number; nome: string } | null = null;
    if (sede) {
      const record = ing.dati.comuni[sede.istat]!;
      const regione = regioneDiSigla(sede.sigla, ing.dati);
      const loc = regione ? trovaLocalita(await client.localitaIT(), { nome: record.nome, altraLingua: record.nomeAltraLingua }, regione.codice) : null;
      if (loc) sedeGeo = { locationCode: loc.location_code, nome: sede.nome };
      else avvisi.push(`Località Google Ads non trovata per ${sede.nome} (${sede.sigla}): le ricerche senza comune non si misurano`);
    }
    const lotti = mq.lottiVolumi(ing.universo, sedeGeo);
    if (lotti.length > mq.MAX_TASK_VOLUMI) throw new ErroreDfs("richiesta", `Troppi lotti di volumi (${lotti.length}, massimo ${mq.MAX_TASK_VOLUMI}): difetto dell'editor, vedi docs/DEBUG.md.`);
    const lottiDaPagare = lotti.filter((l) => !client.inCache(EP_VOLUMI, corpoVolumi(l.keywords, l.locationCode))).length;
    const stima = mq.stimaCostoUsd(lottiDaPagare, mq.serpMassime(ing.universo, ing.contesto.macro_categorie.length));
    const saldo = lottiDaPagare > 0 ? await client.assicuraSaldo(stima) : null;
    yield {
      type: "text",
      text: `${formatoIntero(ing.comuni.usati.length)} comuni su ${formatoIntero(ing.comuni.comuniArea)} delle zone servite · ${saldo === null ? "volumi dalla cache" : `saldo DataForSEO ${dollari(saldo)} $, stima ${dollari(stima)} $`}${client.registrate ? " · risposte registrate" : ""}`,
    };

    yield { type: "phase", label: FASI[1] };
    const ammesse = ing.universo.filter((r) => r.ammessa).length;
    yield {
      type: "text",
      text: `${formatoIntero(lotti.reduce((s, l) => s + l.keywords.length, 0))} ricerche da misurare su ${formatoIntero(ammesse)} ammesse, ${formatoIntero(ing.serviziSenzaQuery.length)} servizi senza ricerche${ing.esclusioni.voci.length ? `, ${formatoIntero(ing.esclusioni.voci.length)} escluse da te` : ""}`,
    };

    yield { type: "phase", label: FASI[2] };
    const esiti: mq.EsitoLotto[] = [];
    for (const [i, lotto] of lotti.entries()) {
      const v = await client.volumi(lotto.keywords, lotto.locationCode);
      esiti.push({ lotto, risultati: v.risultati, fonte: v.fonte });
      yield { type: "text", text: `Lotto ${i + 1}/${lotti.length}: ${formatoIntero(lotto.keywords.length)} ricerche (${lotto.nome})${v.dallaCache ? " · dalla cache" : ""}` };
    }
    let universo = mq.applicaVolumi(ing.universo, esiti);

    yield { type: "phase", label: FASI[3] };
    const escluse = new Set(ing.esclusioni.voci.map((v) => v.testo));
    const candidati = mq.candidatiSerp(universo, escluse, ing.contesto.macro_categorie.map((m) => m.nome));
    const coordinate = (r: mq.Riga) => mq.coordinateDi(ing.dati.comuni[r.comune!.istat]!.centro);
    const serpDaPagare = candidati.filter((r) => !client.inCache(EP_SERP, corpoSerp(r.testo, coordinate(r)))).length;
    if (serpDaPagare > 0) await client.assicuraSaldo(mq.stimaCostoUsd(0, serpDaPagare));
    const perTesto = new Map(universo.map((r, i) => [r.testo, i]));
    const serpNonLette: string[] = [];
    let fatte = 0;
    let fatale: unknown = null;
    const coda = [...candidati];
    const operaio = async () => {
      for (let r = coda.shift(); r && !fatale; r = coda.shift()) {
        try {
          const coord = coordinate(r);
          const { grezza, fonte } = await client.serp(r.testo, coord);
          const luogo = mq.luogoDi(r, ing.dati)!;
          const serp = { ...riduciSerp(grezza, { domini: ing.regole.domini, dominioCliente: ing.dominioCliente, luogo }), fonte, coordinate: coord };
          universo[perTesto.get(r.testo)!] = mq.applicaSerp(universo[perTesto.get(r.testo)!]!, serp, luogo);
        } catch (e) {
          if (e instanceof ErroreDfs && (e.tipo === "limite" || e.tipo === "servizio")) {
            serpNonLette.push(r.testo);
            avvisi.push(`Pagina di Google non letta per «${r.testo}» (${e.codice ?? e.tipo})`);
          } else fatale ??= e;
        } finally {
          fatte += 1;
        }
      }
    };
    const lavori = Array.from({ length: Math.min(PARALLELE_SERP, candidati.length) }, operaio);
    let annunciate = 0;
    const tutti = Promise.all(lavori);
    for (;;) {
      const finito = await Promise.race([tutti.then(() => true), new Promise<false>((r) => setTimeout(() => r(false), 250))]);
      if (fatte - annunciate >= 10 || (finito && fatte > annunciate)) {
        annunciate = fatte;
        yield { type: "text", text: `Pagine di Google ${formatoIntero(fatte)}/${formatoIntero(candidati.length)}` };
      }
      if (finito) break;
    }
    if (fatale) throw fatale;
    universo = [...universo];

    yield { type: "phase", label: FASI[4] };
    const senzaMacro = ing.teste.filter((t) => t.origine === "servizio" && !t.macro).map((t) => t.testo);
    if (senzaMacro.length) avvisi.push(`Ricerche di servizi fuori dalle macro-categorie, assegnate alla home: ${senzaMacro.join(", ")}`);
    if (ing.doppioni) avvisi.push(`${formatoIntero(ing.doppioni)} ricerche uguali tra comuni omonimi: contate una volta`);
    const stat = client.statistiche();
    const mappa = mq.componiMappa({
      generataAt: adesso().toISOString(),
      regole: { versione: mq.VERSIONE_REGOLE, lessicoSha: ing.regole.lessicoSha, dominiSha: ing.regole.dominiSha },
      ingressi: {
        contestoSha: ing.contestoSha,
        zoneSha: ing.zoneSha,
        sede: ing.comuni.sede?.istat ?? null,
        comuniArea: ing.comuni.comuniArea,
        comuniUsati: ing.comuni.usati.length,
        dominioCliente: ing.dominioCliente,
        registrate: client.registrate,
      },
      costo: { usd: stat.costoUsd, chiamatePagate: stat.chiamatePagate, dallaCache: stat.dallaCache },
      avvisi,
      serviziSenzaQuery: ing.serviziSenzaQuery,
      dominiNonInElenco: [...new Set(universo.flatMap((r) => (r.serp ? dominiIgnoti(r.serp) : [])))].sort(),
      serpNonLette: serpNonLette.sort(),
      escluse: [...escluse].sort(),
      universo,
      pagine: ing.pagine,
    });
    const pagineUsate = new Set(mappa.target.map((t) => t.pagina)).size;
    yield { type: "text", text: `${formatoIntero(mappa.target.length)} ricerche scelte su ${formatoIntero(pagineUsate)} pagine · ${formatoIntero(mappa.dominiNonInElenco.length)} domini fuori elenco` };

    yield { type: "phase", label: FASI[5] };
    if (opz.signal.aborted) throw opz.signal.reason;
    scriviMappa(ing.dir, mappa);
    yield { type: "text", text: `Costo ${dollari(mappa.costo.usd)} $ · ${formatoIntero(mappa.costo.chiamatePagate)} chiamate pagate · ${formatoIntero(mappa.costo.dallaCache)} dalla cache` };
    yield { type: "done", artifact: mq.FILE_MAPPA };
  } catch (e) {
    if (opz.signal.aborted) yield { type: "error", message: "run interrotto: la mappa precedente resta com'era" };
    else if (e instanceof ErroreDfs) yield { type: "error", message: e.message };
    else yield { type: "error", message: `Calcolo della mappa non riuscito: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/* ---------- esclusioni (decisione T4 punto 5: reversibili, mai a mano) ---------- */

export type EsitoAzione = { ok: true; mappa: mq.MappaQuery } | { ok: false; codice: 409 | 422; errore: string };

function preparaAzione(dir: string): { ok: true; mappa: mq.MappaQuery; esclusioni: mq.Esclusioni } | { ok: false; codice: 409; errore: string } {
  const m = leggiMappa(dir);
  if (m.stato === "assente") return { ok: false, codice: 409, errore: "La mappa non c'è ancora: calcolala prima di escludere o riammettere ricerche" };
  if (m.stato === "non_leggibile") return { ok: false, codice: 409, errore: `${mq.FILE_MAPPA} non leggibile (${m.motivo}): ricalcola la mappa` };
  const e = leggiEsclusioni(dir);
  if (!e.ok) return { ok: false, codice: 409, errore: e.motivo };
  return { ok: true, mappa: m.mappa, esclusioni: e.esclusioni };
}

function applica(dir: string, mappa: mq.MappaQuery, esito: mq.EsitoEsclusione, adesso: string): EsitoAzione {
  if (!esito.ok) return esito;
  // Prima le esclusioni (la curatela dell'operatore), poi la mappa riselezionata senza chiamate.
  scriviAtomico(path.join(dir, mq.FILE_ESCLUSIONI), JSON.stringify(esito.esclusioni, null, 2) + "\n");
  const nuova = mq.riseleziona(mappa, esito.esclusioni.voci.map((v) => v.testo).sort(), adesso);
  scriviMappa(dir, nuova);
  return { ok: true, mappa: nuova };
}

export function escludiRicerca(dir: string, testo: string, motivo: string, adesso: string): EsitoAzione {
  const p = preparaAzione(dir);
  if (!p.ok) return p;
  return applica(dir, p.mappa, mq.aggiungiEsclusione(p.mappa, p.esclusioni, testo, motivo, adesso), adesso);
}

export function riammettiRicerca(dir: string, testo: string, adesso: string): EsitoAzione {
  const p = preparaAzione(dir);
  if (!p.ok) return p;
  return applica(dir, p.mappa, mq.togliEsclusione(p.esclusioni, testo), adesso);
}
