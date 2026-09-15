// Banco della mappa query → pagine (piano docs/traffico/piano-T4.md §13): senza rete, dataset T6a e province del
// form veri, lead sintetici in cartelle temporanee (nessun cliente reale, nessun dato personale), trasporto
// DataForSEO finto. Sezioni: universo e zone (1-8), client e volumi (9-14), località (15), classificazione (16-18),
// difficoltà e punteggio (19-20), selezione e assegnazione (21-26), chiavi (27), lavoro (28-30), campione (31-33).
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-mappa-query.ts
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import * as mq from "../lib/mappa-query.ts";
import { difficolta, livelloDaPunti, normalizzaDominio, riduciSerp, spazioOrganico, type Domini, type LuogoQuery, type SerpGrezza } from "../lib/serp-classifica.ts";
import { ATTESE_MS, BASE_URL, ErroreDfs, creaClientDfs, corpoVolumi, fetchRegistrato, trovaLocalita, type Localita } from "../lib/dataforseo.ts";
import { FASI, escludiRicerca, eseguiMappa, leggiContesto, leggiEsclusioni, leggiIngressi, leggiMappa, leggiRegole, riammettiRicerca } from "../lib/mappa-lavoro.ts";
import { agenteDaFase, nomeStep, percorsoRun } from "../lib/agenti.ts";
import {
  MOTIVO_DA_CONTROLLARE,
  MOTIVO_DA_IMPOSTARE,
  MOTIVO_LEAD_CAMBIATO,
  caricaDati,
  comuniServiti,
  leggiZoneServite,
  regioneDiSigla,
  salvaZoneServite,
  traduciEtichetta,
  zoneUsabili,
  type Zone,
} from "../lib/zone-servite.ts";
import type { KeyName } from "../lib/secrets.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio).slice(0, 700)}` : ""}`);
}
async function lancia(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e;
  }
}

const QUI = import.meta.dirname;
const FIXTURE = path.join(QUI, "fixtures", "mappa-query");
const RISPOSTE = path.join(FIXTURE, "risposte");
const leggi = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const lessico = mq.LessicoSchema.parse(leggi(path.join(QUI, "..", "lib", "mappa-lessico.json")));
const domini = mq.DominiSchema.parse(leggi(path.join(QUI, "..", "lib", "mappa-domini.json"))) as Domini;
const contesto = mq.ContestoMappaSchema.parse(leggi(path.join(FIXTURE, "contesto.json")));
const d = caricaDati();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sf-mappa-"));
let n = 0;
const ADESSO = "2026-09-15T10:00:00.000Z";

/** Cartella cliente sintetica con il lead del form v4. */
function cliente(zone: unknown, sede: unknown = { comune: "Cologno Monzese", provincia: "MI" }): string {
  const dir = path.join(tmp, `c${++n}`);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, "raw-submission.json"), JSON.stringify({ versione: 1, formVersione: "v4-2026-09-07", leadId: "zz", risposte: { sede, zone } }));
  return dir;
}
function zoneOk(dir: string): Zone {
  const u = zoneUsabili(leggiZoneServite(dir));
  if (!u.ok) throw new Error(`zone non usabili: ${u.motivo}`);
  return u.zone;
}
/** Zone costruite a mano (casi non raggiungibili da un lead: sede nulla, sola Italia). */
const zoneDi = (etichette: string[], sede: Zone["sede"]): Pick<Zone, "etichette" | "sede"> => ({
  etichette: etichette.map((testo) => ({ testo, origine: "zona", provenienza: "lead", ...traduciEtichetta(testo, null, d) })),
  sede,
});
const COLOGNO = { codice: "015081", nome: "Cologno Monzese", sigla: "MI" };

function preparaUniverso(z: Pick<Zone, "etichette" | "sede">, c = contesto, l = lessico) {
  const { teste, serviziSenzaQuery } = mq.testeDelContesto(c, l);
  const com = mq.comuniUsati(z, comuniServiti(z, d), teste.length, d);
  if (!com.ok) throw new Error(com.motivo);
  const { universo } = mq.componiUniverso(teste, com);
  return { teste, serviziSenzaQuery, com, universo };
}

/* ---------- misure finte e deterministiche (volumi e SERP) ---------- */

const hash = (s: string) => crypto.createHash("sha256").update(s).digest()[0]!;
const FONTE_V: mq.Fonte = { endpoint: "keywords_data/google_ads/search_volume/live", richiestaSha: "a".repeat(64), lettoAt: ADESSO, costoUsd: 0.09 };
const FONTE_S: mq.Fonte = { endpoint: "serp/google/organic/live/advanced", richiestaSha: "b".repeat(64), lettoAt: ADESSO, costoUsd: 0.004 };

function volumeFinto(r: mq.Riga): number | null {
  const base: Record<string, number> = { "015146": 700, "108033": 110, "015209": 50, "015081": 40, "015077": 40, "108012": 20 };
  if (r.tipo === "senza_comune") return r.modificatore === "base" ? 20 + (hash(r.testo) % 5) * 10 : null;
  const b = base[r.comune!.istat];
  if (!b || r.modificatore === "preventivo") return r.modificatore === "preventivo" && b ? 0 : null;
  return hash(r.testo) % 3 === 0 ? null : b;
}
function misuraVolumi(u: mq.Riga[], vol: (r: mq.Riga) => number | null = volumeFinto): mq.Riga[] {
  const lotti = mq.lottiVolumi(u, { locationCode: 1008436, nome: "Cologno Monzese" });
  const per = new Map(u.map((r) => [r.testo, r]));
  return mq.applicaVolumi(
    u,
    lotti.map((lotto) => ({ lotto, fonte: FONTE_V, risultati: new Map(lotto.keywords.map((k) => [k, { valore: vol(per.get(k)!), datiAl: "2026-08", spell: null }])) })),
  );
}
function serpFinta(r: mq.Riga, tipo?: "alta" | "bassa"): SerpGrezza {
  const c = r.comune!;
  const h = hash(`serp:${r.testo}`);
  const org = (i: number, dominio: string, titolo: string) => ({ rankAbsolute: i + 3, dominio, url: `https://${dominio}/p${i}`, titolo });
  const scelta = tipo ?? ((c.popolazione ?? 0) > 250_000 ? "alta" : h % 3 === 0 ? "media" : "bassa");
  const organici =
    scelta === "alta"
      ? [org(1, "www.prontopro.it", "x"), org(2, "www.instapro.it", "x"), org(3, "www.paginegialle.it", "x"), ...[4, 5, 6, 7, 8, 9, 10].map((i) => org(i, `impresa${i}.example`, `${r.testa.testo} ${c.nome}`))]
      : scelta === "media"
        ? [org(1, "www.prontopro.it", "x"), org(2, "www.paginegialle.it", "x"), org(3, "loc3.example", `${r.testa.testo} ${c.nome}`), org(4, "loc4.example", `${r.testa.testo} a ${c.nome}`), org(5, "loc5.example", `${r.testa.testo} ${c.nome}`), org(6, "loc6.example", "Studio"), org(7, "www.facebook.com", "fb")]
        : [org(1, "www.paginegialle.it", "x"), org(2, "www.facebook.com", "fb"), org(3, "www.subito.it", "annunci"), org(4, "loc4.example", `Impresa ${c.nome}`), org(5, "blog.example", "Idee casa"), org(6, "www.youtube.com", "video")];
  return { checkUrl: `https://www.google.it/search?q=${encodeURIComponent(r.testo)}`, vuota: false, organici, localPack: h % 2 ? [{ dominio: "loc3.example", pagata: false }] : [], aiOverview: h % 5 === 0, annunci: h % 4, localServices: false };
}
function misuraSerp(u: mq.Riga[], escluse = new Set<string>(), finta: (r: mq.Riga) => SerpGrezza = (r) => serpFinta(r), ordina?: (s: SerpGrezza) => SerpGrezza): mq.Riga[] {
  const candidati = new Set(mq.candidatiSerp(u, escluse, contesto.macro_categorie.map((m) => m.nome)).map((r) => r.testo));
  return u.map((r) => {
    if (!candidati.has(r.testo)) return r;
    const luogo = mq.luogoDi(r, d)!;
    let g = finta(r);
    if (ordina) g = ordina(g);
    const serp = { ...riduciSerp(g, { domini, dominioCliente: "cliente-prova.it", luogo }), fonte: FONTE_S, coordinate: mq.coordinateDi(d.comuni[r.comune!.istat]!.centro) };
    return mq.applicaSerp(r, serp, luogo);
  });
}
function mappaDi(u: mq.Riga[], com: Extract<mq.EsitoComuni, { ok: true }>, escluse: string[] = [], c = contesto): mq.MappaQuery {
  return mq.componiMappa({
    generataAt: ADESSO,
    regole: { versione: mq.VERSIONE_REGOLE, lessicoSha: "c".repeat(64), dominiSha: "d".repeat(64) },
    ingressi: { contestoSha: "e".repeat(64), zoneSha: mq.zoneSha(com.sede?.istat ?? null, com.usati), sede: com.sede?.istat ?? null, comuniArea: com.comuniArea, comuniUsati: com.usati.length, dominioCliente: "cliente-prova.it", registrate: false },
    costo: { usd: 0, chiamatePagate: 0, dallaCache: 0 },
    avvisi: com.avvisi,
    serviziSenzaQuery: [],
    dominiNonInElenco: [],
    serpNonLette: [],
    escluse,
    universo: u,
    pagine: mq.pagineDelContesto(c),
  });
}

try {
  /* ---------- 1-8 universo e zone ---------- */
  const dirCologno = cliente(["Cologno Monzese e dintorni"]);
  const zCologno = zoneOk(dirCologno);
  const base = preparaUniverso(zCologno);
  {
    const { teste, serviziSenzaQuery, com, universo } = base;
    caso("1. fixture Cavaliere: 32 teste (28 di servizio, 4 di mestiere)", teste.length === 32 && teste.filter((t) => t.origine === "mestiere").length === 4, teste.map((t) => t.testo));
    caso(
      "1. i 4 servizi senza ricerche",
      isDeepStrictEqual(serviziSenzaQuery, ["Assistenza tecnica in cantiere", "Coordinamento delle lavorazioni", "Finiture interne ed esterne", "Ripristini e manutenzioni esterne"]),
      serviziSenzaQuery,
    );
    caso("1. 40 comuni usati su 132 dell'area", com.ok && com.usati.length === 40 && com.comuniArea === 132, com.ok && [com.usati.length, com.comuniArea]);
    caso("1. 2.656 righe tutte ammesse", universo.length === 2656 && universo.every((r) => r.ammessa), universo.length);
    const lotti = mq.lottiVolumi(universo, { locationCode: 1008436, nome: "Cologno Monzese" });
    caso("1. 4 lotti di volumi (1.000 + 1.000 + 560 con comune, 96 alla sede)", isDeepStrictEqual(lotti.map((l) => [l.locationCode, l.keywords.length]), [[2380, 1000], [2380, 1000], [2380, 560], [1008436, 96]]), lotti.map((l) => [l.locationCode, l.keywords.length]));
    const esempi = ["impresa edile cologno monzese", "ristrutturazione bagno cologno monzese", "rifacimento bagno brugherio", "preventivo ristrutturazione appartamento monza", "cappotto termico vicino a me", "idraulico cologno monzese", "preventivo cartongesso muggiò", "impresa edile milano"];
    caso("1. esempi della tabella §3.5 presenti", esempi.every((e) => universo.some((r) => r.testo === e)), esempi.filter((e) => !universo.some((r) => r.testo === e)));
    caso("1. «ristrutturazione bagno cassina de pecchi» e «… bergamo» non generate", !universo.some((r) => r.testo.includes("cassina de pecchi") || r.testo.includes("bergamo")));
    const idraulico = universo.find((r) => r.testo === "idraulico cologno monzese")!;
    caso("1. «idraulico» è un mestiere altrui per un'impresa edile", idraulico.testa.mestiereAltrui && idraulico.testa.origine === "servizio");
  }
  {
    caso("2. «Cassina de' Pecchi» → «cassina de pecchi»", mq.nomeInQuery("Cassina de' Pecchi") === "cassina de pecchi");
    caso("2. «Muggiò» conserva l'accento", mq.nomeInQuery("Muggiò") === "muggiò" && base.universo.some((r) => r.testo === "posa pavimenti muggiò"));
    caso("2. niente doppi spazi né spazi ai bordi", base.universo.every((r) => !/\s{2}|^\s|\s$/.test(r.testo)));
    caso("2. nome bilingue: la parte italiana", mq.nomeInQuery("Bolzano/Bozen", "Bozen") === "bolzano" && mq.nomeInQuery("San Dorligo della Valle-Dolina", "Dolina") === "san dorligo della valle");
    const lunga = "a".repeat(81);
    caso("2. 81 caratteri → non ammessa col motivo", mq.motivoNonAmmessa(lunga)?.includes("81 caratteri") === true && mq.motivoNonAmmessa("a".repeat(80)) === null);
    caso("2. 11 parole → non ammessa col motivo", mq.motivoNonAmmessa("a b c d e f g h i j k")?.includes("11 parole") === true && mq.motivoNonAmmessa("a b c d e f g h i j") === null);
    const lessicoLungo = mq.LessicoSchema.parse({ ...lessico, servizi: [{ tutte: ["bagn"], teste: [{ testo: "ristrutturazione completa del bagno con sanitari sospesi e piatto doccia filo pavimento", gruppo: "bagno-lungo" }] }] });
    const u = preparaUniverso(zCologno, contesto, lessicoLungo).universo;
    const nonAmmesse = u.filter((r) => !r.ammessa);
    caso(
      "2. le righe troppo lunghe restano nell'universo, senza volume richiesto",
      nonAmmesse.length > 0 && nonAmmesse.every((r) => r.motivi[0]!.startsWith("troppo lunga") && r.volume.stato === "non_richiesto") && mq.lottiVolumi(u, null).every((l) => l.keywords.every((k) => k.length <= 80)),
    );
  }
  {
    const servizi = new Set(contesto.servizi_atomizzati.map((s) => s.servizio));
    const mestiere = new Set(lessico.mestieri.find((m) => m.id === "edile")!.teste.map((t) => t.testo));
    const codici = new Set(comuniServiti(zCologno, d).map((c) => c.codice));
    const bad = base.universo.filter(
      (r) =>
        (r.testa.origine === "servizio" ? r.testa.servizi.length === 0 || r.testa.servizi.some((s) => !servizi.has(s)) : !mestiere.has(r.testa.testo)) ||
        lessico.vietati.some((v) => ` ${r.testo} `.includes(` ${v} `)) ||
        !mq.MODIFICATORI.includes(r.modificatore) ||
        !r.comune ||
        !codici.has(r.comune.istat),
    );
    caso("3. ogni riga: testa da un servizio del contesto o dal mestiere, nessun vietato, comune nelle zone servite", bad.length === 0, bad.slice(0, 3).map((r) => r.testo));
  }
  {
    const com = base.com as Extract<mq.EsitoComuni, { ok: true }>;
    const peso = (c: mq.ComuneUsato) => (c.popolazione ?? 0) / (c.km === null ? 2 : 1 + c.km / 10);
    caso("4. ordine per popolazione / (1 + km/10)", com.usati.every((c, i) => i === 0 || peso(com.usati[i - 1]!) >= peso(c)));
    caso("4. Milano primo, Agrate Brianza 40°, Carugate 31°", com.usati[0]!.nome === "Milano" && com.usati[39]!.nome === "Agrate Brianza" && com.usati[30]!.nome === "Carugate");
    caso("4. avviso coi comuni oltre il tetto", com.avvisi.some((a) => a.startsWith("92 comuni dell'area non misurati (tetto 40): Meda, Arcore")), com.avvisi);
    caso("4. tetto ⌊5.000 / (2 × teste)⌋", mq.tettoComuni(32) === 40 && mq.tettoComuni(100) === 25 && mq.tettoComuni(500) === 5);
    const zVimodrone = zoneDi(["Milano e dintorni"], { codice: "015242", nome: "Vimodrone", sigla: "MI" });
    const c5 = mq.comuniUsati(zVimodrone, comuniServiti(zVimodrone, d), 500, d);
    caso("4. sede sempre inclusa (al posto dell'ultimo) se è nell'area", c5.ok && c5.usati.length === 5 && c5.usati[4]!.istat === "015242" && c5.sedeNellArea, c5.ok && c5.usati.map((c) => c.nome));
    const z1 = zoneDi(["Cologno Monzese (MI)", "Provincia di Bergamo", "Monza e dintorni"], COLOGNO);
    const z2 = zoneDi(["Monza e dintorni", "Provincia di Bergamo", "Cologno Monzese (MI)"], COLOGNO);
    const a = mq.comuniUsati(z1, comuniServiti(z1, d), 32, d);
    const b = mq.comuniUsati(z2, comuniServiti(z2, d), 32, d);
    caso("4. etichette permutate → stessi comuni e stesse aree", a.ok && b.ok && isDeepStrictEqual(a.usati, b.usati));
  }
  {
    const mi = Object.values(d.comuni).filter((c) => c.sigla === "MI").length;
    const bg = Object.values(d.comuni).filter((c) => c.sigla === "BG").length;
    const zIt = zoneOk(cliente(["Tutta Italia"]));
    const cIt = mq.comuniUsati(zIt, comuniServiti(zIt, d), 32, d);
    caso(`5. «Tutta Italia» → comuni della provincia della sede (MI: ${mi}), poi tetto`, cIt.ok && cIt.comuniArea === mi && mi === 133 && cIt.usati.length === 40 && cIt.usati.every((c) => c.sigla === "MI"), cIt.ok && cIt.comuniArea);
    const zItBg = zoneOk(cliente(["Tutta Italia", "Bergamo e provincia"]));
    const cItBg = mq.comuniUsati(zItBg, comuniServiti(zItBg, d), 32, d);
    caso("5. «Tutta Italia» + «Bergamo e provincia» → MI ∪ BG", cItBg.ok && cItBg.comuniArea === mi + bg, cItBg.ok && cItBg.comuniArea);
    const zSolo = zoneDi(["Tutta Italia"], null);
    const cSolo = mq.comuniUsati(zSolo, comuniServiti(zSolo, d), 32, d);
    caso("5. sola «Tutta Italia» senza sede → blocco", !cSolo.ok && cSolo.motivo === mq.MOTIVO_SENZA_SEDE);
  }
  {
    const zSenzaSede = zoneDi(["Monza e dintorni"], null);
    const s = preparaUniverso(zSenzaSede);
    const implicite = s.universo.filter((r) => r.tipo === "senza_comune");
    const lotti = mq.lottiVolumi(s.universo, null);
    caso("6. sede nulla con area precisa → senza comune «non richiesto» e avviso", implicite.length === 96 && implicite.every((r) => r.comune === null && r.volume.stato === "non_richiesto") && lotti.every((l) => l.locationCode === 2380) && s.com.ok && s.com.avvisi.some((a) => a.startsWith("Sede non riconosciuta")));
    const zFuori = zoneDi(["Provincia di Bergamo"], COLOGNO);
    const f = preparaUniverso(zFuori);
    caso(
      "6. sede fuori dall'area → nessuna ricerca col suo comune, senza comune misurate alla sede, avviso",
      !f.universo.some((r) => r.tipo === "con_comune" && r.comune!.istat === "015081") &&
        f.universo.filter((r) => r.tipo === "senza_comune").every((r) => r.comune?.istat === "015081" && r.comune.area === null) &&
        f.com.ok &&
        f.com.avvisi.some((a) => a.includes("non è tra le zone servite")),
    );
  }
  {
    const ok = { ok: true } as const;
    const blocco = (zone: ReturnType<typeof zoneUsabili>, extra: Partial<mq.IngressiBlocco> = {}) =>
      mq.motivoBloccoMappa({ sito: "attivo", contesto: ok, zone: zone.ok ? ok : zone, comuni: ok, configurata: true, esclusioni: ok, ...extra });
    const daControllare = zoneUsabili(leggiZoneServite(cliente(["Lombardia"])));
    const tally = path.join(tmp, "tally");
    fs.mkdirSync(tally);
    fs.writeFileSync(path.join(tally, "raw-submission.json"), JSON.stringify({ responses: [] }));
    const daImpostare = zoneUsabili(leggiZoneServite(tally));
    const cambiato = cliente(["Cologno Monzese e dintorni"]);
    const l0 = leggiZoneServite(cambiato);
    salvaZoneServite(cambiato, ["Cologno Monzese (MI)", "Cologno Monzese e dintorni"], l0.stato === "proposta" ? l0.zone.lead.impronta : "", ADESSO);
    fs.writeFileSync(path.join(cambiato, "raw-submission.json"), JSON.stringify({ versione: 1, formVersione: "v4-2026-09-07", leadId: "zz", risposte: { sede: { comune: "Cologno Monzese", provincia: "MI" }, zone: ["Monza e dintorni"] } }));
    const leadCambiato = zoneUsabili(leggiZoneServite(cambiato));
    const rotto = cliente(["Cologno Monzese e dintorni"]);
    fs.mkdirSync(path.join(rotto, "traffico"));
    fs.writeFileSync(path.join(rotto, "traffico", "zone-servite.json"), "{");
    const illeggibile = zoneUsabili(leggiZoneServite(rotto));
    const senzaDati = zoneUsabili(leggiZoneServite(dirCologno, { dataset: path.join(tmp, "assente.json"), province: path.join(tmp, "assente2.json") }));
    for (const [nome, z, codice] of [
      ["da controllare", daControllare, "zone"],
      ["da impostare", daImpostare, "zone"],
      ["lead cambiato", leadCambiato, "zone"],
      ["file non leggibile", illeggibile, "zone_bloccate"],
      ["dataset non leggibile", senzaDati, "zone_bloccate"],
    ] as const) {
      const b = blocco(z);
      caso(`7. zone ${nome} → frase di zoneUsabili identica`, !z.ok && b?.motivo === z.motivo && b.codice === codice, [z, b]);
    }
    caso("7. le tre frasi d'attesa sono quelle di lib/zone-servite.ts", [daControllare, daImpostare, leadCambiato].every((z, i) => !z.ok && z.motivo === [MOTIVO_DA_CONTROLLARE, MOTIVO_DA_IMPOSTARE, MOTIVO_LEAD_CAMBIATO][i]));
    caso("7. contesto invalido → il suo motivo", blocco({ ok: true, zone: zCologno }, { contesto: { ok: false, motivo: "contesto.json non valido" } })?.motivo === "contesto.json non valido");
    caso("7. chiavi assenti → «non configurata»", blocco({ ok: true, zone: zCologno }, { configurata: false })?.motivo === mq.MOTIVO_NON_CONFIGURATA && mq.MOTIVO_NON_CONFIGURATA.includes("non configurata"));
    caso("7. Sito sospeso → «la mappa resta com'è»", blocco({ ok: true, zone: zCologno }, { sito: "sospeso" })?.motivo === "Servizio Sito sospeso: la mappa resta com'è");
    caso("7. proposta riconosciuta e tutto a posto → nessun blocco", blocco(zoneUsabili(leggiZoneServite(dirCologno))) === null);
  }
  {
    const senzaMacro = mq.ContestoMappaSchema.parse({ ...contesto, macro_categorie: contesto.macro_categorie.map((m) => ({ ...m, servizi: m.servizi.filter((s) => s !== "Cappotti termici") })) });
    const { teste } = mq.testeDelContesto(senzaMacro, lessico);
    const cappotto = teste.find((t) => t.testo === "cappotto termico")!;
    const riga = { ...base.universo.find((r) => r.testo === "cappotto termico cologno monzese")!, testa: { ...base.universo[0]!.testa, ...cappotto } };
    const p = mq.paginaDi(riga, "015081", mq.pagineDelContesto(senzaMacro));
    caso("8. servizio in nessuna macro → pagina home", cappotto.macro === null && p?.pagina.chiave === "home" && p.regola === "A3-senza-macro");
    const vuoto = mq.testeDelContesto({ ...contesto, servizi_atomizzati: [] }, lessico);
    caso("8. contesto senza servizi → nessuna testa di servizio (il blocco lo dice il lavoro)", vuoto.teste.every((t) => t.origine === "mestiere"));
  }

  /* ---------- 9-14 client e volumi ---------- */
  {
    const permutato = [...base.universo].reverse();
    const geo = { locationCode: 1008436, nome: "Cologno Monzese" };
    const a = mq.lottiVolumi(base.universo, geo);
    caso("9. lotti ordinati, ≤ 1.000, Italia per le ricerche con comune e sede per le altre", a.every((l) => l.keywords.length <= 1000 && isDeepStrictEqual(l.keywords, [...l.keywords].sort())) && a.slice(0, 3).every((l) => l.keywords.every((k) => base.universo.find((r) => r.testo === k)!.tipo === "con_comune")));
    caso("9. input permutato → stessi lotti", isDeepStrictEqual(a, mq.lottiVolumi(permutato, geo)));
  }

  /** Trasporto finto: risposte in coda per endpoint, registro delle chiamate. */
  function finto(risposte: Record<string, (Response | (() => Response) | Error)[]>, segreti: Partial<Record<KeyName, string>> = { DATAFORSEO_LOGIN: "login-prova", DATAFORSEO_PASSWORD: "password-segreta-123" }) {
    const chiamate: { url: string; init: RequestInit }[] = [];
    return {
      chiamate,
      trasporto: {
        getSecret: (k: KeyName) => segreti[k] ?? null,
        fetch: async (url: string, init: RequestInit) => {
          chiamate.push({ url, init });
          const coda = risposte[url.slice(BASE_URL.length)] ?? [];
          const r = coda.length > 1 ? coda.shift()! : coda[0];
          if (!r) throw new Error(`nessuna risposta finta per ${url}`);
          if (r instanceof Error) throw r;
          return typeof r === "function" ? r() : r.clone();
        },
      },
    };
  }
  const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
  const bustaVolumi = (result: unknown[], cost = 0.09) => ({ status_code: 20000, cost, tasks: [{ status_code: 20000, cost, result }] });
  const EP_V = "keywords_data/google_ads/search_volume/live";
  const EP_S = "serp/google/organic/live/advanced";
  const errore = (nome: string) => json(leggi(path.join(RISPOSTE, "errori", nome)));
  const cacheDir = () => fs.mkdtempSync(path.join(tmp, "cache-"));
  const attese: number[] = [];
  const attendi = async (ms: number) => void attese.push(ms);
  {
    const f = finto({
      [EP_V]: [
        json(
          bustaVolumi([
            { keyword: "a", search_volume: null, monthly_searches: null },
            { keyword: "b", search_volume: 0, monthly_searches: [{ year: 2026, month: 8, search_volume: 0 }] },
            { keyword: "c", search_volume: 40, monthly_searches: [{ year: 2025, month: 9, search_volume: 40 }, { year: 2026, month: 8, search_volume: 30 }, { year: 2026, month: 1, search_volume: 50 }] },
          ]),
        ),
      ],
    });
    const costi = path.join(tmp, "costi-10.ndjson");
    const client = creaClientDfs({ trasporto: f.trasporto, registrate: null, cacheDir: cacheDir(), costi: { file: costi, lavoro: "mappa" }, attendi });
    const v = await client.volumi(["c", "a", "b"], 2380);
    const righe = mq.applicaVolumi(
      ["a", "b", "c"].map((testo) => ({ ...base.universo[0]!, testo })),
      [{ lotto: { locationCode: 2380, nome: "Italia", keywords: ["a", "b", "c"] }, risultati: v.risultati, fonte: v.fonte }],
    );
    caso("10. search_volume null → «non_disponibile»", righe[0]!.volume.stato === "non_disponibile" && righe[0]!.volume.valore === null && righe[0]!.volume.fonte !== null);
    caso("10. 0 → «misurato» 0", righe[1]!.volume.stato === "misurato" && righe[1]!.volume.valore === 0);
    caso("10. datiAl = ultimo mese di monthly_searches", righe[2]!.volume.datiAl === "2026-08" && righe[2]!.volume.valore === 40);
    const corpo = JSON.parse(String(f.chiamate[0]!.init.body));
    caso("10. corpo: keyword ordinate, italiano, niente search partners", isDeepStrictEqual(corpo, corpoVolumi(["a", "b", "c"], 2380)) && corpo[0].language_code === "it");

    // 11. cache
    const f2 = finto({ [EP_V]: [json(bustaVolumi([{ keyword: "x", search_volume: 10, monthly_searches: null }]))] });
    const dir = cacheDir();
    const costi2 = path.join(tmp, "costi-11.ndjson");
    let giorno = new Date(ADESSO);
    const c2 = () => creaClientDfs({ trasporto: f2.trasporto, registrate: null, cacheDir: dir, costi: { file: costi2, lavoro: "mappa" }, attendi, adesso: () => giorno });
    await c2().volumi(["x"], 2380);
    const seconda = await c2().volumi(["x"], 2380);
    caso("11. seconda chiamata identica: dalla cache, niente fetch né riga di costo", f2.chiamate.length === 1 && seconda.dallaCache && fs.readFileSync(costi2, "utf8").trim().split("\n").length === 1);
    giorno = new Date(Date.parse(ADESSO) + 31 * 24 * 3600 * 1000);
    await c2().volumi(["x"], 2380);
    caso("11. TTL scaduto (31 giorni) → nuova chiamata", f2.chiamate.length === 2);
    const f3 = finto({ [EP_V]: [errore("errore-50000.json"), errore("errore-50000.json"), errore("errore-50000.json"), json(bustaVolumi([{ keyword: "y", search_volume: 5, monthly_searches: null }]))] });
    const dir3 = cacheDir();
    await lancia(() => creaClientDfs({ trasporto: f3.trasporto, registrate: null, cacheDir: dir3, attendi }).volumi(["y"], 2380));
    const dopo = await creaClientDfs({ trasporto: f3.trasporto, registrate: null, cacheDir: dir3, attendi }).volumi(["y"], 2380);
    caso("11. una risposta d'errore non va mai in cache", f3.chiamate.length === 4 && !dopo.dallaCache);

    // 12. errori
    const prova = async (coda: (Response | Error)[], fn: (c: ReturnType<typeof creaClientDfs>) => Promise<unknown> = (c) => c.volumi(["z"], 2380)) => {
      const f = finto({ [EP_V]: coda, [EP_S]: coda });
      attese.length = 0;
      const e = await lancia(() => fn(creaClientDfs({ trasporto: f.trasporto, registrate: null, cacheDir: cacheDir(), attendi })));
      return { e, chiamate: f.chiamate.length, attese: [...attese] };
    };
    const auth = await prova([errore("errore-40100.json")]);
    caso("12. 40100 → «auth» al primo tentativo", auth.e instanceof ErroreDfs && auth.e.tipo === "auth" && auth.chiamate === 1, auth);
    const http401 = await prova([json({ status_code: 40100 }, 401)]);
    caso("12. HTTP 401 → «auth»", http401.e instanceof ErroreDfs && http401.e.tipo === "auth");
    const credito = await prova([errore("errore-40210.json")]);
    caso("12. 40210 → «credito» col messaggio", credito.e instanceof ErroreDfs && credito.e.tipo === "credito" && credito.e.message.startsWith("Credito DataForSEO esaurito (40210)") && credito.chiamate === 1);
    const limite = await prova([errore("errore-40202.json"), json(bustaVolumi([{ keyword: "z", search_volume: 1, monthly_searches: null }]))]);
    caso("12. 40202 poi 20000 → ok al 2° tentativo dopo 5 s", limite.e === null && limite.chiamate === 2 && isDeepStrictEqual(limite.attese, [ATTESE_MS[0]]), limite);
    const servizio = await prova([errore("errore-50000.json")]);
    caso("12. 50000 ×3 → «servizio» dopo 3 tentativi (5 s, 15 s)", servizio.e instanceof ErroreDfs && servizio.e.tipo === "servizio" && servizio.chiamate === 3 && isDeepStrictEqual(servizio.attese, [5000, 15000]), servizio);
    const rete = await prova([new TypeError("fetch failed")]);
    caso("12. fetch che lancia → «servizio»", rete.e instanceof ErroreDfs && rete.e.tipo === "servizio" && rete.chiamate === 3);
    const forma = await prova([json(bustaVolumi([{ keyword: "z", search_volume: "tanti" }]))]);
    caso("12. forma sbagliata → «forma» col percorso", forma.e instanceof ErroreDfs && forma.e.tipo === "forma" && forma.e.message.includes("tasks[0].result[0].search_volume"), forma.e instanceof Error ? forma.e.message : forma.e);
    const formaSerp = await prova([json({ status_code: 20000, cost: 0.004, tasks: [{ status_code: 20000, cost: 0.004, result: [{ check_url: "https://www.google.it/search?q=z", items: [{ type: "organic", rank_absolute: 1, domain: "x.it" }] }] }] })], (c) => c.serp("z", "45.0000,9.0000,100000"));
    caso("12. SERP fuori forma → «forma» con l'item", formaSerp.e instanceof ErroreDfs && formaSerp.e.message.includes("items[0].url"), formaSerp.e instanceof Error ? formaSerp.e.message : formaSerp.e);

    // 13. saldo
    const f13 = finto({ "appendix/user_data": [json(leggi(path.join(RISPOSTE, "user-data.json")))], [EP_V]: [json(bustaVolumi([]))] });
    const c13 = creaClientDfs({ trasporto: f13.trasporto, registrate: null, cacheDir: cacheDir(), attendi });
    const e13 = await lancia(() => c13.assicuraSaldo(30));
    caso("13. saldo (48,20 $) < 2 × stima (30 $) → «credito» senza chiamate pagate", e13 instanceof ErroreDfs && e13.tipo === "credito" && f13.chiamate.every((c) => c.url.endsWith("appendix/user_data")), e13 instanceof Error ? e13.message : e13);
    caso("13. saldo sufficiente → ritorna il saldo", (await c13.assicuraSaldo(0.6)) === 48.2);

    // 14. costi.ndjson
    const f14 = finto({ [EP_V]: [errore("errore-40202.json"), json(bustaVolumi([{ keyword: "k", search_volume: 1, monthly_searches: null }], 0.09))], [EP_S]: [errore("errore-40100.json")] });
    const costi14 = path.join(tmp, "costi-14.ndjson");
    const c14 = creaClientDfs({ trasporto: f14.trasporto, registrate: null, cacheDir: cacheDir(), costi: { file: costi14, lavoro: "mappa" }, attendi });
    await c14.volumi(["k"], 2380);
    const e14 = await lancia(() => c14.serp("k", "45.0000,9.0000,100000"));
    const testo14 = fs.readFileSync(costi14, "utf8");
    const righe14 = testo14.trim().split("\n").map((l) => JSON.parse(l));
    const basic = Buffer.from("login-prova:password-segreta-123").toString("base64");
    caso("14. una riga per chiamata pagata partita, anche fallita, col costo della risposta", righe14.length === 3 && righe14.every((r) => mq.RigaCostoSchema.safeParse(r).success) && righe14[1].costoUsd === 0.09 && righe14[1].esito === "ok" && righe14[0].esito === "errore" && righe14[2].statusCode === 40100, righe14);
    caso("14. nessuna credenziale nelle righe né nei messaggi", ![testo14, e14 instanceof Error ? e14.message : ""].some((t) => t.includes("login-prova") || t.includes("password-segreta-123") || t.includes(basic)));
    caso("14. la Basic auth parte solo nell'header", f14.chiamate.every((c) => (c.init.headers as Record<string, string>).Authorization === `Basic ${basic}` && !c.url.includes("password")));
  }

  /* ---------- 15 località ---------- */
  {
    const localita = leggi(path.join(RISPOSTE, "localita-it.json")).tasks[0].result as Localita[];
    const lombardia = regioneDiSigla("MI", d)!.codice;
    const cologno = trovaLocalita(localita, { nome: "Cologno Monzese" }, lombardia);
    caso("15. Cologno Monzese → City 1008436 prima della Municipality 9201369", cologno?.location_code === 1008436);
    caso("15. Cologno al Serio non confuso", trovaLocalita(localita, { nome: "Cologno al Serio" }, lombardia)?.location_code === 9232414);
    caso("15. Milano → «Milan» via esonimo", trovaLocalita(localita, { nome: "Milano" }, lombardia)?.location_code === 1008463);
    const bz = d.comuni["021008"]!;
    caso("15. Bolzano trovato", trovaLocalita(localita, { nome: bz.nome, altraLingua: bz.nomeAltraLingua }, regioneDiSigla("BZ", d)!.codice)?.location_code === 1008190, bz);
    caso("15. nome assente → null", trovaLocalita(localita, { nome: "Comune Inesistente" }, lombardia) === null);
  }

  /* ---------- 16-18 classificazione ---------- */
  const brugherio: LuogoQuery = { nome: "Brugherio", sigla: "MB", provincia: "Monza e della Brianza", popolazione: 35367 };
  const g = (organici: [string, string, string?][], extra: Partial<SerpGrezza> = {}): SerpGrezza => ({
    checkUrl: "https://www.google.it/search?q=prova",
    vuota: false,
    organici: organici.map(([dominio, titolo, url], i) => ({ rankAbsolute: i + 1, dominio, titolo, url: url ?? `https://${dominio}/` })),
    localPack: [],
    aiOverview: false,
    annunci: 0,
    localServices: false,
    ...extra,
  });
  {
    const s = riduciSerp(
      g(
        [
          ["www.cliente-prova.it", "Cliente"],
          ["it.indeed.com", "Lavoro"],
          ["www.prontopro.it", "Portale"],
          ["paginegialle.it", "Directory"],
          ["www.comune.monza.it", "Comune"],
          ["regione.lombardia.it", "Regione"],
          ["agenzia.gov.it", "Agenzia"],
          ["mappa.example", "Impresa"],
          ["locale.example", "Bagni a Brugherio"],
          ["ignoto.example", "Idee casa"],
        ],
        { localPack: [{ dominio: "www.mappa.example", pagata: false }] },
      ),
      { domini, dominioCliente: "cliente-prova.it", luogo: brugherio },
    );
    const regole = s.organici.map((o) => `${o.classe}/${o.regola}`);
    caso(
      "16. regole §4.2 una per una",
      isDeepStrictEqual(regole, ["cliente/cliente", "altro/elenco:altro:indeed.com", "portale/elenco:portali:prontopro.it", "directory/elenco:directory:paginegialle.it", "altro/pa", "altro/pa", "altro/pa", "impresa_locale/local-pack", "impresa_locale/ignoto+segnale-locale", "altro/ignoto"]),
      regole,
    );
    caso("16. «www.» tolto dal dominio", s.organici[0]!.dominio === "cliente-prova.it" && normalizzaDominio("WWW.Esempio.IT.") === "esempio.it");
    const url = riduciSerp(g([["edil.example", "Edil", "https://edil.example/ristrutturazioni-brugherio/"], ["sigla.example", "Impresa Rossi (MB)"]]), { domini, dominioCliente: null, luogo: brugherio });
    caso("16. segnale locale anche nell'URL o con la sigla tra parentesi", url.organici.every((o) => o.regola === "ignoto+segnale-locale"));
    const f = riduciSerp(g([["a.example", "x"]], { localPack: [{ dominio: "a.example", pagata: false }, { dominio: null, pagata: false }, { dominio: "b.example", pagata: true }], aiOverview: true, annunci: 3, localServices: true }), { domini, dominioCliente: null, luogo: brugherio });
    caso("17. feature: schede non pagate del local pack, AI Overview, annunci, Local Services", isDeepStrictEqual(f.feature, { localPack: 2, aiOverview: true, annunci: 3, localServices: true }) && isDeepStrictEqual(f.localPackDomini, ["a.example"]));
    const vuota = riduciSerp(g([], { vuota: true }), { domini, dominioCliente: null, luogo: brugherio });
    const dv = difficolta(vuota, "ristrutturazione bagno", brugherio);
    caso("18. SERP vuota → bassa col fattore dedicato", vuota.vuota && dv.livello === "bassa" && dv.fattori.length === 1 && dv.fattori[0]!.codice === "vuota");
    caso("18. zero organici → vuota", riduciSerp(g([]), { domini, dominioCliente: null, luogo: brugherio }).vuota);
  }

  /* ---------- 19-20 difficoltà e punteggio ---------- */
  {
    const luogo = (nome: string, sigla: string, popolazione: number): LuogoQuery => ({ nome, sigla, provincia: d.province.get(sigla)?.nome ?? null, popolazione });
    const milano = luogo("Milano", "MI", 1_365_698);
    const sM = riduciSerp(g([["www.prontopro.it", "a"], ["www.instapro.it", "b"], ["x1.example", "ristrutturazione bagno Milano"], ["x2.example", "Bagni Milano"], ["x3.example", "bagno a Milano"], ["x4.example", "Ristrutturazioni bagni Milano"], ["x5.example", "c"], ["x6.example", "d"]]), { domini, dominioCliente: null, luogo: milano });
    const dM = difficolta(sM, "ristrutturazione bagno", milano);
    caso("19. Milano → alta", dM.livello === "alta", dM);
    const cologno = luogo("Cologno Monzese", "MI", 46_994);
    const sC = riduciSerp(g([["b1.example", "Ristrutturazione bagno Cologno Monzese"], ["b2.example", "Bagni a Cologno"], ["b3.example", "bagno cologno monzese"], ["b4.example", "Bagno nuovo Cologno"], ["b5.example", "Rifacimento bagni Cologno Monzese"], ["www.paginegialle.it", "Imprese a Cologno"], ["b7.example", "Edil Prova Cologno Monzese"]]), { domini, dominioCliente: null, luogo: cologno });
    const dC = difficolta(sC, "ristrutturazione bagno", cologno);
    caso("19. 5 imprese ottimizzate a Cologno → media (F2 massimo 4)", dC.livello === "media" && dC.fattori.find((f) => f.codice === "F2")!.punti === 4, dC);
    const sandrigo = luogo("Sandrigo", "VI", 8_500);
    const sS = riduciSerp(g([["www.paginegialle.it", "a"], ["www.paginebianche.it", "b"], ["www.virgilio.it", "c"], ["www.facebook.com", "d"], ["www.youtube.com", "e"]]), { domini, dominioCliente: null, luogo: sandrigo });
    const dS = difficolta(sS, "idraulico", sandrigo);
    caso("19. comune piccolo con solo directory e social → bassa", dS.livello === "bassa", dS);
    caso("19. somma dei fattori = punti", [dM, dC, dS].every((x) => x.fattori.reduce((s, f) => s + f.punti, 0) === x.punti));
    caso("19. confini 2/3 e 5/6", isDeepStrictEqual([2, 3, 5, 6].map(livelloDaPunti), ["bassa", "media", "media", "alta"]));
    const esempio: mq.Riga = {
      ...base.universo.find((r) => r.testo === "ristrutturazione bagno cologno monzese")!,
      volume: { valore: 40, stato: "misurato", geo: { locationCode: 2380, nome: "Italia" }, datiAl: "2026-08", fonte: FONTE_V },
      serp: { ...riduciSerp(g([["a.example", "x"]], { localPack: [{ dominio: "a.example", pagata: false }] }), { domini, dominioCliente: null, luogo: cologno }), fonte: FONTE_S, coordinate: "45.5286,9.2757,100000" },
      difficolta: { livello: "media", punti: 4, fattori: [{ codice: "F1", testo: "x", valore: null, punti: 4 }] },
    };
    const p = mq.calcolaPunteggio(esempio)!;
    caso("20. esempio §5.1 → 53,4 esatto", p.totale === 53.4 && p.fattori.length === 3 && p.fattori[0]!.punti === 19.4 && p.fattori[1]!.punti === 14 && p.fattori[2]!.punti === 20, p);
    caso("20. frase del punteggio", mq.frasePunteggio({ ...esempio, punteggio: p }) === "Punteggio 53,4 su 100 (volume 19,4 · difficoltà 14 · rilevanza 20).");
    caso("20. O minimo 0,4", spazioOrganico({ localPack: 3, aiOverview: true, annunci: 6, localServices: true }) === 0.4 && spazioOrganico({ localPack: 0, aiOverview: false, annunci: 0, localServices: false }) === 1);
    caso("20. V con 0, null, 1.000, 50.000", mq.fattoreVolume(0) === 0 && mq.fattoreVolume(null) === 0 && mq.fattoreVolume(1000) === 1 && mq.fattoreVolume(50000) === 1);
  }

  /* ---------- 21-26 selezione e assegnazione ---------- */
  const com = base.com as Extract<mq.EsitoComuni, { ok: true }>;
  const misurato = misuraSerp(misuraVolumi(base.universo));
  const mappa = mappaDi(misurato, com);
  {
    const per = new Map<string, number>();
    for (const t of mappa.target) per.set(t.pagina, (per.get(t.pagina) ?? 0) + 1);
    const righe = mappa.target.map((t) => misurato.find((r) => r.testo === t.testo)!);
    caso("21. 8 ≤ target ≤ 20", mappa.target.length >= 8 && mappa.target.length <= 20 && mappa.stato === "completa", [mappa.target.length, mappa.stato, mappa.motivi]);
    caso("21. ≤ 3 per pagina con una principale", [...per.values()].every((x) => x <= 3) && [...per.keys()].every((k) => mappa.target.filter((t) => t.pagina === k && t.ruolo === "principale").length === 1));
    const pagineServizio = mappa.pagine.filter((p) => p.tipo === "servizio");
    const idonea = (pagina: string) => misurato.some((r) => r.ammessa && r.difficolta && r.difficolta.livello !== "alta" && mq.paginaDi(r, "015081", mappa.pagine)?.pagina.chiave === pagina);
    caso("21. ogni macro con una riga idonea è coperta", pagineServizio.every((p) => !idonea(p.chiave) || per.has(p.chiave)), [...per.keys()]);
    caso("21. nessuna difficoltà alta", righe.every((r) => r.difficolta!.livello !== "alta"));
    const gruppi = righe.map((r) => `${r.testa.gruppo}|${r.tipo}|${r.comune?.istat}`);
    caso("21. mai due ricerche dello stesso gruppo nello stesso comune (rifacimento/ristrutturazione bagno)", new Set(gruppi).size === gruppi.length);
    caso("21. al massimo metà dei target senza volume", righe.filter((r) => !r.volume.valore).length * 2 <= righe.length);
    caso("21. pagine solo home, servizio:*, zone", mappa.target.every((t) => /^(home|zone|servizio:[a-z0-9-]+)$/.test(t.pagina)));
    caso("21. ogni target ha il suo perché con volume, comune, difficoltà, pagina e punteggio", mappa.target.every((t) => t.perche.length >= 5 && t.perche.some((f) => f.startsWith("Pagina:")) && t.perche.some((f) => f.startsWith("Punteggio"))));
  }
  {
    const tutteAlte = misuraSerp(misuraVolumi(base.universo), new Set(), (r) => serpFinta(r, hash(r.testo) % 40 === 0 ? "bassa" : "alta"));
    const m = mappaDi(tutteAlte, com);
    caso("22. meno di 8 idonee → «insufficiente» coi motivi", m.stato === "insufficiente" && m.target.length < 8 && m.motivi.some((x) => x.includes("con difficoltà alta")), [m.target.length, m.motivi]);
    const nulli = misuraSerp(misuraVolumi(base.universo, () => null));
    const mn = mappaDi(nulli, com);
    caso("22. tutti i volumi nulli → 8 target scelti per vincibilità e rilevanza", mn.target.length === 8 && mn.target.every((t) => t.perche[0]!.startsWith("Volume non misurato")), [mn.target.length, mn.stato]);
  }
  {
    const t0 = mappa.target.find((t) => t.ruolo === "secondaria") ?? mappa.target[0]!;
    const e0: mq.Esclusioni = { versione: 1, voci: [] };
    const e1 = mq.aggiungiEsclusione(mappa, e0, t0.testo, "troppo lontano per i cantieri", ADESSO);
    if (!e1.ok) throw new Error(e1.errore);
    const esclusa = mq.riseleziona(mappa, e1.esclusioni.voci.map((v) => v.testo), "2026-09-16T10:00:00.000Z");
    caso("23. esclusione: la ricerca sparisce e il numero dei target resta", !esclusa.target.some((t) => t.testo === t0.testo) && esclusa.target.length === mappa.target.length);
    caso("23. nessun altro punteggio cambia (universo identico)", isDeepStrictEqual(esclusa.universo, mappa.universo));
    const e2 = mq.togliEsclusione(e1.esclusioni, t0.testo);
    if (!e2.ok) throw new Error(e2.errore);
    const riammessa = mq.riseleziona(esclusa, e2.esclusioni.voci.map((v) => v.testo), "2026-09-17T10:00:00.000Z");
    caso("23. riammissione → mappa uguale a prima salvo generataAt", isDeepStrictEqual({ ...riammessa, generataAt: "" }, { ...mappa, generataAt: "" }));
    const assente = mq.aggiungiEsclusione(mappa, e0, "ricerca inesistente", "motivo valido", ADESSO);
    const nonEsclusa = mq.togliEsclusione(e0, t0.testo);
    const corto = mq.aggiungiEsclusione(mappa, e0, t0.testo, "no", ADESSO);
    caso("23. testo assente, non tra le escluse, motivo corto → errore 422", !assente.ok && assente.codice === 422 && !nonEsclusa.ok && nonEsclusa.codice === 422 && !corto.ok && corto.codice === 422);
  }
  {
    const pagine = mq.pagineDelContesto(contesto);
    const r = (testo: string) => base.universo.find((x) => x.testo === testo)!;
    const chiave = (testo: string) => mq.paginaDi(r(testo), "015081", pagine)?.pagina.chiave;
    caso("24. A1 mestiere + sede → home", chiave("impresa edile cologno monzese") === "home" && chiave("impresa edile vicino a me") === "home");
    caso("24. A2 mestiere + Brugherio → zone", chiave("impresa edile brugherio") === "zone");
    caso("24. A3 servizio + sede → pagina servizio", chiave("ristrutturazione bagno cologno monzese") === "servizio:ristrutturazioni-e-manutenzioni");
    caso("24. A4 servizio + Brugherio → stessa pagina servizio", chiave("ristrutturazione bagno brugherio") === "servizio:ristrutturazioni-e-manutenzioni");
    caso("24. mestiere altrui mai in home", chiave("idraulico cologno monzese") === "servizio:impianti-e-servizi-tecnici" && mq.paginaDi({ ...r("idraulico cologno monzese"), testa: { ...r("idraulico cologno monzese").testa, macro: null } }, "015081", pagine) === null);
  }
  {
    const zPerm = { ...zCologno, etichette: [...zCologno.etichette].reverse() };
    const contestoPerm = { ...contesto, servizi_atomizzati: [...contesto.servizi_atomizzati].reverse() };
    const perm = preparaUniverso(zPerm, contestoPerm);
    const comPerm = perm.com as Extract<mq.EsitoComuni, { ok: true }>;
    const rovescia = (s: SerpGrezza): SerpGrezza => ({ ...s, organici: [...s.organici].reverse(), localPack: [...s.localPack].reverse() });
    const mPerm = mappaDi(misuraSerp(misuraVolumi(perm.universo), new Set(), (r) => serpFinta(r), rovescia), comPerm, [], contestoPerm);
    const due = mappaDi(misuraSerp(misuraVolumi(base.universo)), com);
    caso("25. due volte → mappa uguale", isDeepStrictEqual(due, mappa));
    caso("25. servizi, zone e item SERP permutati → mappa uguale", isDeepStrictEqual(mPerm, mappa));
  }
  {
    const imp: mq.ImpronteAttuali = { contestoSha: mappa.ingressi.contestoSha, zoneSha: mappa.ingressi.zoneSha, lessicoSha: mappa.regole.lessicoSha, dominiSha: mappa.regole.dominiSha };
    caso("26. ingressi uguali → niente da ricalcolare", mq.cambiati(mappa, imp).length === 0);
    caso(
      "26. contesto, zone, lessico, domini cambiati → elenco",
      isDeepStrictEqual(mq.cambiati(mappa, { contestoSha: "1".repeat(64), zoneSha: "2".repeat(64), lessicoSha: "3".repeat(64), dominiSha: "4".repeat(64) }), ["contesto.json", "zone servite", "lib/mappa-lessico.json", "lib/mappa-domini.json"]),
    );
    const altraSede = mq.zoneSha("015146", com.usati);
    const altroComune = mq.zoneSha("015081", [...com.usati.slice(0, 39), { istat: "015051" }]);
    caso("26. sede o comuni usati cambiati → zoneSha diverso", altraSede !== mappa.ingressi.zoneSha && altroComune !== mappa.ingressi.zoneSha);
    const zPiu = zoneDi(["Cologno Monzese e dintorni", "Cassina de' Pecchi (MI)"], COLOGNO);
    const cPiu = mq.comuniUsati(zPiu, comuniServiti(zPiu, d), 32, d);
    caso("26. un comune oltre il tetto dei 40 → nessuna staleness", cPiu.ok && mq.zoneSha("015081", cPiu.usati) === mappa.ingressi.zoneSha);
  }

  /* ---------- vista (§8) ---------- */
  {
    const imp: mq.ImpronteAttuali = { contestoSha: mappa.ingressi.contestoSha, zoneSha: mappa.ingressi.zoneSha, lessicoSha: mappa.regole.lessicoSha, dominiSha: mappa.regole.dominiSha };
    const baseVista: mq.IngressiVista = { sito: "attivo", lettura: { stato: "ok", mappa }, esclusioni: { versione: 1, voci: [] }, blocco: null, impronte: imp, inCalcolo: false, ultimo: null, stimaUsd: 0.66, comuniUsati: 40 };
    const vista = (x: Partial<mq.IngressiVista>) => mq.vistaMappa({ ...baseVista, ...x });
    const pronta = vista({});
    caso("vista: mappa completa → «Pronta», gruppi in ordine di pagina, Escludi disponibile", pronta.stato === "pronta" && pronta.gruppi[0]!.chiave === "home" && pronta.gruppi.at(-1)!.chiave === "zone" && pronta.modificabile && pronta.gruppi.flatMap((g) => g.righe).length === mappa.target.length);
    caso("vista: meta con data, comuni, mese dei volumi e costo dei dati", /^Calcolata il \d{2}\/\d{2}\/2026 · 40 comuni delle zone servite · volumi Google Ads fino ad agosto 2026 · pagine di Google lette il 15\/09 · costo dei dati /.test(pronta.meta ?? ""), pronta.meta);
    const stale = vista({ impronte: { ...imp, contestoSha: "f".repeat(64) } });
    caso("vista: contesto cambiato → «Da ricalcolare» con l'elenco", stale.stato === "da_ricalcolare" && isDeepStrictEqual(stale.cambiati, ["contesto.json"]));
    caso("vista: Sito sospeso → «In pausa» in sola lettura", vista({ sito: "sospeso" }).stato === "in_pausa" && !vista({ sito: "sospeso" }).modificabile);
    caso("vista: calcolo in corso → «In calcolo» senza Escludi", vista({ inCalcolo: true }).stato === "in_calcolo" && !vista({ inCalcolo: true }).modificabile);
    const ora = Date.parse(mappa.generataAt) + 60_000;
    caso("vista: ultimo ricalcolo fallito → banner, resta la mappa", vista({ ultimo: { esito: "errore", messaggio: "Credito DataForSEO esaurito (40210): …", at: ora } }).erroreUltimo?.startsWith("Credito") === true);
    caso("vista: stop dell'operatore → nessun banner d'errore", vista({ ultimo: { esito: "errore", messaggio: `${mq.MESSAGGIO_INTERROTTO}: la mappa precedente resta com'era`, at: ora } }).erroreUltimo === null);
    caso("vista: esclusioni del file diverse dalla mappa → da ricalcolare", vista({ esclusioni: { versione: 1, voci: [{ testo: "impresa edile", motivo: "prova", at: ADESSO }] } }).cambiati.includes(mq.FILE_ESCLUSIONI));
    const senza = (x: Partial<mq.IngressiVista>) => vista({ lettura: { stato: "assente" }, ...x });
    caso("vista: senza mappa e senza blocchi → «Da calcolare» con la stima", senza({}).stato === "da_calcolare" && senza({}).frase!.includes("40 comuni") && senza({}).frase!.includes("0,66 $"));
    caso("vista: zone da impostare → «In attesa delle zone»", senza({ blocco: { codice: "zone", motivo: MOTIVO_DA_IMPOSTARE } }).stato === "attesa_zone");
    caso("vista: chiavi assenti → «Non configurata»", senza({ blocco: { codice: "chiavi", motivo: mq.MOTIVO_NON_CONFIGURATA } }).stato === "non_configurata");
    caso("vista: contesto invalido → «Bloccata» col motivo", senza({ blocco: { codice: "contesto", motivo: "contesto.json non valido" } }).stato === "bloccata" && senza({ blocco: { codice: "contesto", motivo: "x" } }).motivoBlocco === "x");
    caso("vista: calcolo fallito senza mappa → «Non riuscita»", senza({ ultimo: { esito: "errore", messaggio: "DataForSEO non risponde (50401): riprova più tardi.", at: ora } }).stato === "non_riuscita");
    caso("vista: mappa illeggibile → «Non leggibile»", vista({ lettura: { stato: "non_leggibile", motivo: "JSON non valido" } }).stato === "non_leggibile");
    const poche = mappaDi(misuraSerp(misuraVolumi(base.universo), new Set(), (r) => serpFinta(r, hash(r.testo) % 40 === 0 ? "bassa" : "alta")), com);
    const vp = vista({ lettura: { stato: "ok", mappa: poche } });
    caso("vista: poche ricerche → «Poche ricerche» coi motivi", vp.stato === "poche" && vp.motiviPoche.length > 0 && vp.frase!.startsWith("Solo "));
  }

  /* ---------- 27 chiavi ---------- */
  {
    const vuoto = creaClientDfs({ trasporto: { fetch: async () => json({}), getSecret: () => null }, registrate: null, cacheDir: cacheDir() });
    caso("27. senza chiavi né risposte registrate → non configurata", vuoto.configurata() === false);
    const e = await lancia(() => vuoto.volumi(["x"], 2380));
    caso("27. nessuna eccezione non tradotta senza chiavi", e instanceof ErroreDfs && e.message.includes("non configurata"));
    const registrate = creaClientDfs({ trasporto: { fetch: async () => json({}), getSecret: () => null }, registrate: RISPOSTE, cacheDir: cacheDir() });
    caso("27. con SF_DATAFORSEO_REGISTRATE → configurata senza chiavi", registrate.configurata() && registrate.registrate);
    const sorgente = fs.readFileSync(path.join(QUI, "..", "lib", "dataforseo.ts"), "utf8");
    caso("27. dataforseo.ts non importa setSecret né salvaSegreti", !/setSecret|salvaSegreti|deleteSecret/.test(sorgente));
  }

  /* ---------- 28-30 lavoro ---------- */
  {
    const regole = leggiRegole();
    const nuovoCliente = (nome: string) => {
      const dir = path.join(tmp, nome);
      fs.mkdirSync(dir);
      for (const f of ["contesto.json", "raw-submission.json"]) fs.copyFileSync(path.join(FIXTURE, f), path.join(dir, f));
      return dir;
    };
    const stato = { sito: "attivo" as const, dominio: "cliente-prova.it", configurata: true };
    const esegui = async (dir: string, client: ReturnType<typeof creaClientDfs>, adesso = ADESSO) => {
      const letti = leggiIngressi(dir, stato, regole);
      if (!letti.ok) throw new Error(letti.blocco.motivo);
      const eventi: { type: string; label?: string; artifact?: string; message?: string; text?: string }[] = [];
      for await (const ev of eseguiMappa(letti.ingressi, client, { signal: new AbortController().signal, adesso: () => new Date(adesso) })) eventi.push(ev);
      return eventi;
    };
    const nessunaChiave = { fetch: async () => json({}), getSecret: () => null };

    const dirJob = nuovoCliente("job");
    const cache = cacheDir();
    const costi = path.join(dirJob, mq.FILE_COSTI);
    const eventi = await esegui(dirJob, creaClientDfs({ trasporto: nessunaChiave, registrate: RISPOSTE, cacheDir: cache, costi: { file: costi, lavoro: "mappa" } }));
    const fasi = eventi.filter((e) => e.type === "phase").map((e) => e.label);
    const ultimo = eventi[eventi.length - 1]!;
    caso("28. sei fasi nell'ordine e done con l'artifact", isDeepStrictEqual(fasi, [...FASI]) && ultimo.type === "done" && ultimo.artifact === mq.FILE_MAPPA, eventi.filter((e) => e.type !== "text"));
    const letta = leggiMappa(dirJob);
    const m1 = letta.stato === "ok" ? letta.mappa : null;
    caso("28. mappa valida con 8-20 target, 40 comuni usati, risposte registrate dichiarate", !!m1 && m1.target.length >= 8 && m1.target.length <= 20 && m1.ingressi.comuniUsati === 40 && m1.ingressi.registrate, letta.stato === "ok" ? [letta.mappa.stato, letta.mappa.target.length, letta.mappa.motivi] : letta);
    const righeCosti = fs.readFileSync(costi, "utf8").trim().split("\n").map((l) => JSON.parse(l) as mq.RigaCosto);
    const serpPagate = righeCosti.filter((r) => r.endpoint === "serp/google/organic/live/advanced").length;
    caso("28. costi.ndjson: 4 righe di volumi e una per ogni pagina di Google", righeCosti.filter((r) => r.endpoint === "keywords_data/google_ads/search_volume/live").length === 4 && serpPagate >= 60 && serpPagate <= 100 && m1?.costo.chiamatePagate === righeCosti.length, [righeCosti.length, serpPagate]);
    caso("28. storico: una riga per mappa scritta", fs.readFileSync(path.join(dirJob, mq.FILE_STORICO), "utf8").trim().split("\n").length === 1);
    await esegui(dirJob, creaClientDfs({ trasporto: nessunaChiave, registrate: RISPOSTE, cacheDir: cache, costi: { file: costi, lavoro: "mappa" } }), "2026-09-16T10:00:00.000Z");
    const l2 = leggiMappa(dirJob);
    const m2 = l2.stato === "ok" ? l2.mappa : null;
    caso("28. secondo calcolo → stessa mappa salvo generataAt e costo, nessuna riga di costo nuova", !!m1 && !!m2 && isDeepStrictEqual({ ...m2, generataAt: "", costo: null }, { ...m1, generataAt: "", costo: null }) && m2.costo.chiamatePagate === 0 && m2.costo.dallaCache === righeCosti.length && fs.readFileSync(costi, "utf8").trim().split("\n").length === righeCosti.length);

    const errori = fs.mkdtempSync(path.join(tmp, "registrate-40210-"));
    for (const f of ["user-data.json", "localita-it.json"]) fs.copyFileSync(path.join(RISPOSTE, f), path.join(errori, f));
    fs.copyFileSync(path.join(RISPOSTE, "errori", "errore-40210.json"), path.join(errori, "forza-errore.json"));
    const shaPrima = mq.sha256(fs.readFileSync(path.join(dirJob, mq.FILE_MAPPA), "utf8"));
    const ev40210 = await esegui(dirJob, creaClientDfs({ trasporto: nessunaChiave, registrate: errori, cacheDir: cacheDir() }));
    const errs = ev40210.filter((e) => e.type === "error");
    caso("28. 40210 → un solo error «Credito…» e nessuna scrittura (mappa precedente intatta)", errs.length === 1 && errs[0]!.message!.startsWith("Credito DataForSEO esaurito") && !ev40210.some((e) => e.type === "done") && mq.sha256(fs.readFileSync(path.join(dirJob, mq.FILE_MAPPA), "utf8")) === shaPrima, ev40210.filter((e) => e.type !== "text"));
    const dirNuovo = nuovoCliente("job-40210");
    await esegui(dirNuovo, creaClientDfs({ trasporto: nessunaChiave, registrate: errori, cacheDir: cacheDir() }));
    caso("28. 40210 senza mappa precedente → nessun file della mappa", !fs.existsSync(path.join(dirNuovo, mq.FILE_MAPPA)));

    // 29. una SERP in errore permanente
    const registrato = fetchRegistrato(RISPOSTE);
    const guasta = "impresa edile cologno monzese";
    const dirParziale = nuovoCliente("job-parziale");
    const ev29 = await esegui(
      dirParziale,
      creaClientDfs({
        trasporto: {
          getSecret: (k: KeyName) => (k === "DATAFORSEO_LOGIN" ? "login-prova" : "password-segreta-123"),
          fetch: async (url, init) => (url.endsWith("organic/live/advanced") && String(init.body).includes(`"keyword":"${guasta}"`) ? errore("errore-50000.json") : registrato(url, init)),
        },
        registrate: null,
        cacheDir: cacheDir(),
        attendi,
      }),
    );
    const l29 = leggiMappa(dirParziale);
    caso(
      "29. una pagina di Google in errore permanente → mappa «parziale» con avviso",
      l29.stato === "ok" && l29.mappa.stato === "parziale" && isDeepStrictEqual(l29.mappa.serpNonLette, [guasta]) && l29.mappa.avvisi.some((a) => a.includes(`«${guasta}»`)) && l29.mappa.universo.find((r) => r.testo === guasta)!.serp === null,
      l29.stato === "ok" ? [l29.mappa.stato, l29.mappa.serpNonLette] : [l29, ev29.filter((e) => e.type === "error")],
    );

    // Esclusione e riammissione sul disco: nessuna chiamata, file delle esclusioni scritto.
    const t = m2!.target[0]!.testo;
    const ex = escludiRicerca(dirJob, t, "troppo lontano per i cantieri", "2026-09-16T11:00:00.000Z");
    const esclusioniFile = leggiEsclusioni(dirJob);
    caso("23. escludi sul disco → esclusioni salvate, target rimpiazzato", ex.ok && !ex.mappa.target.some((x) => x.testo === t) && esclusioniFile.ok && esclusioniFile.esclusioni.voci[0]?.testo === t);
    const ri = riammettiRicerca(dirJob, t, "2026-09-16T12:00:00.000Z");
    caso("23. riammetti sul disco → target di prima", ri.ok && isDeepStrictEqual(ri.mappa.target, m2!.target));
    const rotte = path.join(dirJob, mq.FILE_ESCLUSIONI);
    fs.writeFileSync(rotte, "{");
    const bloccata = leggiIngressi(dirJob, stato, regole);
    const exRotta = escludiRicerca(dirJob, t, "motivo valido", ADESSO);
    caso("7. esclusioni illeggibili → blocco e 409, file non sovrascritto", !bloccata.ok && bloccata.blocco.codice === "esclusioni" && !exRotta.ok && exRotta.codice === 409 && fs.readFileSync(rotte, "utf8") === "{");
    fs.rmSync(rotte);

    const senzaServizi = nuovoCliente("senza-servizi");
    fs.writeFileSync(path.join(senzaServizi, "contesto.json"), JSON.stringify({ ...leggi(path.join(FIXTURE, "contesto.json")), servizi_atomizzati: [] }));
    const bs = leggiIngressi(senzaServizi, stato, regole);
    caso("8. contesto senza servizi → blocco col motivo", !bs.ok && bs.blocco.codice === "contesto" && bs.blocco.motivo.includes("senza servizi"));
    const senzaContesto = nuovoCliente("senza-contesto");
    fs.rmSync(path.join(senzaContesto, "contesto.json"));
    const bc = leggiIngressi(senzaContesto, stato, regole);
    caso("7. contesto assente → blocco col motivo", !bc.ok && bc.blocco.motivo.startsWith("contesto.json assente"));
    const shaDi = (dir: string) => {
      const c = leggiContesto(dir);
      return c.ok ? c.sha : null;
    };
    const dirSha = nuovoCliente("sha-contesto");
    const sha0 = shaDi(dirSha);
    const originale = leggi(path.join(FIXTURE, "contesto.json"));
    fs.writeFileSync(path.join(dirSha, "contesto.json"), JSON.stringify({ ...originale, sottosettore: "Altro", tono: { registro: "diverso", da_evitare: "" }, generatedAt: "2027-01-01T00:00:00.000Z" }, null, 4));
    const sha1 = shaDi(dirSha);
    fs.writeFileSync(path.join(dirSha, "contesto.json"), JSON.stringify({ ...originale, servizi_atomizzati: [...originale.servizi_atomizzati, { servizio: "Rifacimento tetti", fonte: "x" }] }));
    const sha2 = shaDi(dirSha);
    caso("26. impronta del contesto: campi non usati non contano, un servizio nuovo sì", sha0 !== null && sha0 === sha1 && sha2 !== sha0);
    const bk = leggiIngressi(nuovoCliente("senza-chiavi"), { ...stato, configurata: false }, regole);
    caso("27. chiavi assenti → blocco «non configurata» dagli ingressi", !bk.ok && bk.blocco.codice === "chiavi");
  }
  {
    const tutte = FASI.map((f) => agenteDaFase(f, "mappa", "traffico"));
    caso("30. le sei fasi hanno il chip «script», mai la sfera", tutte.every((a) => a.sfera === false && a.key === "script"));
    caso("30. percorso e nome del lavoro", percorsoRun({ kind: "traffico", slug: "zz-test-t4", step: "mappa" }) === "/traffico/zz-test-t4" && nomeStep({ kind: "traffico", step: "mappa" }) === "Traffico · mappa");
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
