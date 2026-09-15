// Banco delle zone servite dal form lead (lib/zone-servite.ts, piano docs/traffico/piano-T3.md §7):
// senza rete, dataset T6a e province del form veri, lead sintetici in cartelle temporanee (nessun
// cliente reale, nessun dato personale). Sezioni: A etichette del form, B omonimi, C comuni fusi,
// alias e Sardegna 2026, D brief Tally (nessuna lettura della prosa: decisione 14), E input
// corrotti, F parità con le copie (CONFINI del form, ricerca e distanza T6a), G artifact e vista.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-zone-servite.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  FILE_ZONE,
  MAX_ETICHETTE,
  MOTIVO_DA_CONTROLLARE,
  MOTIVO_DA_IMPOSTARE,
  MOTIVO_LEAD_CAMBIATO,
  PERCORSI_DATI,
  RAGGIO_DINTORNI_KM,
  REGIONI,
  anteprimaEtichetta,
  areeServite,
  caricaDati,
  cercaComune,
  comuniEntroKm,
  comuniServiti,
  etichettaArea,
  leggiZoneServite,
  regioneDiSigla,
  salvaZoneServite,
  traduciEtichetta,
  vistaZone,
  zoneUsabili,
  type Area,
  type ContestoSede,
  type LetturaZone,
  type Zone,
} from "../lib/zone-servite.ts";
import { CONFINI } from "../../site-intake/src/data/regioni.ts";
import { caricaFattiComuni, cercaComune as cercaComuneT6a, comuniEntroKm as comuniEntroKmT6a } from "../../site-renderer/src/lib/fatti-comuni.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio).slice(0, 600)}` : ""}`);
}

const d = caricaDati();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sf-zone-"));
let n = 0;

/** Cartella cliente sintetica con raw-submission.json (oggetto) o testo grezzo. */
function cliente(raw: unknown, testoGrezzo?: string): string {
  const dir = path.join(tmp, `c${++n}`);
  fs.mkdirSync(dir);
  if (raw !== undefined || testoGrezzo !== undefined) fs.writeFileSync(path.join(dir, "raw-submission.json"), testoGrezzo ?? JSON.stringify(raw));
  return dir;
}
const SANDRIGO = { comune: "Sandrigo", provincia: "VI", provinciaNome: "Vicenza", regione: "Veneto", cap: "36066", via: "Via Prova 1" };
const leadForm = (zone: unknown, sede: unknown = SANDRIGO) => ({ versione: 1, formVersione: "v4-2026-09-07", leadId: "zz-test", risposte: { sede, zone, telefono: "3000000000" } });
const proposta = (l: LetturaZone) => {
  if (l.stato !== "proposta") throw new Error(`atteso proposta, letto ${l.stato}`);
  return l;
};
const codici = (aree: Area[]) => aree.map((a) => (a.tipo === "italia" ? "italia" : `${a.tipo}:${a.codice}`));
const zonaDi = (testo: string, ctx: ContestoSede | null = null): Pick<Zone, "etichette" | "sede"> => ({
  etichette: [{ testo, origine: "zona", provenienza: "lead", ...traduciEtichetta(testo, ctx, d) }],
  sede: null,
});
const quanti = (testo: string, ctx: ContestoSede | null = null) => comuniServiti(zonaDi(testo, ctx), d).length;
const sedeSandrigo: ContestoSede = { chiavi: new Set(["SANDRIGO"]), area: { tipo: "comune", codice: "024091", nome: "Sandrigo", sigla: "VI" } };

try {
  /* ---------- A. etichette del form ---------- */
  {
    const zone = ["Sandrigo e dintorni", "Vicenza e provincia", "Tutta la regione Veneto", "Veneto e regioni vicine", "Tutta Italia"];
    const l = proposta(leggiZoneServite(cliente(leadForm(zone))));
    const [sede, ...righe] = l.zone.etichette;
    caso("A sede v4 → comune 024091, origine sede, tradotta", sede?.testo === "Sandrigo (VI)" && sede.origine === "sede" && isDeepStrictEqual(codici(sede.aree), ["comune:024091"]) && sede.esito === "tradotta", sede);
    caso("A «Sandrigo e dintorni» → dintorni 024091 a 20 km", isDeepStrictEqual(righe[0]?.aree, [{ tipo: "dintorni", codice: "024091", nome: "Sandrigo", sigla: "VI", raggioKm: RAGGIO_DINTORNI_KM }]), righe[0]);
    caso("A tutte le etichette della proposta tradotte, provenienza lead", righe.length === 5 && righe.every((e) => e.esito === "tradotta" && !e.nota && e.provenienza === "lead" && e.origine === "zona"), righe);
    caso("A lead.etichette verbatim", isDeepStrictEqual(l.zone.lead.etichette, zone) && l.zone.lead.fonte === "form");
    caso("A proposta riconosciute → usabile senza conferma (decisione 14)", l.esito === "riconosciute" && zoneUsabili(l).ok, l.esito);
  }
  caso("A «Sandrigo e dintorni» = 65 comuni", quanti("Sandrigo e dintorni", sedeSandrigo) === 65, quanti("Sandrigo e dintorni", sedeSandrigo));
  for (const t of ["Vicenza e provincia", "Provincia di Vicenza"]) {
    caso(`A «${t}» → VI/024, 113 comuni`, isDeepStrictEqual(traduciEtichetta(t, null, d).aree, [{ tipo: "provincia", codice: "024", sigla: "VI", nome: "Vicenza" }]) && quanti(t) === 113);
  }
  caso("A «Tutta la regione Veneto» → 05, 560 comuni", isDeepStrictEqual(codici(traduciEtichetta("Tutta la regione Veneto", null, d).aree), ["regione:05"]) && quanti("Tutta la regione Veneto") === 560);
  {
    const t = traduciEtichetta("Veneto e regioni vicine", null, d);
    caso("A «Veneto e regioni vicine» → 5 regioni, 2.889 comuni", isDeepStrictEqual(codici(t.aree), ["regione:05", "regione:04", "regione:03", "regione:08", "regione:06"]) && quanti("Veneto e regioni vicine") === 2889, t);
  }
  caso("A «Tutta Italia» → 7.896 comuni", isDeepStrictEqual(traduciEtichetta("Tutta Italia", null, d).aree, [{ tipo: "italia" }]) && quanti("Tutta Italia") === 7896);
  const attese: [string, string[]][] = [
    ["Tutta la regione Trentino-Alto Adige", ["regione:04"]],
    ["Valle d'Aosta/Vallée d'Aoste e provincia", ["provincia:007"]],
    ["Monza e della Brianza e provincia", ["provincia:108"]],
    ["Provincia di Monza e della Brianza", ["provincia:108"]],
    ["Pesaro e Urbino e provincia", ["provincia:041"]],
    ["Bolzano/Bozen e provincia", ["provincia:021"]],
    ["Reggio Calabria e provincia", ["provincia:080"]],
    ["Milano e provincia", ["provincia:015"]],
    ["TUTTA LA REGIONE veneto", ["regione:05"]],
    ["valle d’aosta e provincia", ["provincia:007"]],
    ["Vallee d'Aoste e provincia", ["provincia:007"]],
    ["  tutta   italia ", ["italia"]],
    ["Friuli Venezia Giulia e regioni vicine", ["regione:06", "regione:05"]],
  ];
  for (const [t, c] of attese) {
    const r = traduciEtichetta(t, null, d);
    caso(`A «${t}» → ${c.join(" + ")}`, r.esito === "tradotta" && isDeepStrictEqual(codici(r.aree), c) && !r.nota, r);
  }
  {
    const l = proposta(leggiZoneServite(cliente(leadForm(["Tutta la regione Veneto", "tutta la regione VENETO", "Sandrigo (VI)"]))));
    caso("A duplicati (anche con la sede) una volta sola", l.zone.etichette.length === 2 && l.zone.etichette[1]?.testo === "Tutta la regione Veneto", l.zone.etichette.map((e) => e.testo));
  }
  caso("A etichettaArea", isDeepStrictEqual(
    [
      { tipo: "comune", codice: "024091", nome: "Sandrigo", sigla: "VI" },
      { tipo: "dintorni", codice: "024091", nome: "Sandrigo", sigla: "VI", raggioKm: 20 },
      { tipo: "provincia", codice: "024", sigla: "VI", nome: "Vicenza" },
      { tipo: "regione", codice: "04", nome: "Trentino-Alto Adige/Südtirol" },
      { tipo: "italia" },
    ].map((a) => etichettaArea(a as Area)),
    ["Sandrigo (VI)", "Sandrigo e dintorni, 20 km", "Provincia di Vicenza", "Trentino-Alto Adige", "Tutta Italia"],
  ));

  /* ---------- B. omonimi ---------- */
  caso("B «Castro (BG)» → 016065", isDeepStrictEqual(codici(traduciEtichetta("Castro (BG)", null, d).aree), ["comune:016065"]));
  {
    const l = proposta(leggiZoneServite(cliente(leadForm(["Castro e dintorni"], { comune: "Castro", provincia: "LE", provinciaNome: "Lecce", regione: "Puglia" }))));
    caso("B «Castro e dintorni» con sede Castro (LE) → dintorni 075096", isDeepStrictEqual(codici(l.zone.etichette[1]!.aree), ["dintorni:075096"]) && l.zone.sede?.codice === "075096" && l.esito === "riconosciute", l.zone.etichette);
  }
  {
    const t = traduciEtichetta("Castro", null, d);
    caso("B «Castro» libero → non riconosciuta coi 2 candidati", t.esito === "non_riconosciuta" && t.aree.length === 0 && !!t.nota?.includes("Castro (BG) o Castro (LE)"), t);
    const e = traduciEtichetta("Castro e dintorni", null, d);
    caso("B «Castro e dintorni» senza sede → non riconosciuta, suggerisce «Castro (BG) e dintorni»", e.esito === "non_riconosciuta" && !!e.nota?.includes("«Castro (BG) e dintorni»"), e);
    caso("B «Castro (LE) e dintorni» → dintorni 075096", isDeepStrictEqual(codici(traduciEtichetta("Castro (LE) e dintorni", null, d).aree), ["dintorni:075096"]));
  }
  caso("B «Samone (TN)» → 022165", isDeepStrictEqual(codici(traduciEtichetta("Samone (TN)", null, d).aree), ["comune:022165"]));
  {
    const t = traduciEtichetta("Molise", null, d);
    caso("B «Molise» libero → regione 14, da controllare, nota del comune", t.esito === "da_controllare" && isDeepStrictEqual(codici(t.aree), ["regione:14"]) && !!t.nota?.includes("Molise (CB)"), t);
    const b = traduciEtichetta("Bergamo", null, d);
    caso("B «Bergamo» libero → comune 016024, nota «è anche una provincia»", b.esito === "da_controllare" && isDeepStrictEqual(codici(b.aree), ["comune:016024"]) && !!b.nota?.includes("Provincia di Bergamo"), b);
    const m = traduciEtichetta("Monza e della Brianza", null, d);
    caso("B «Monza e della Brianza» libero → provincia 108, da controllare", m.esito === "da_controllare" && isDeepStrictEqual(codici(m.aree), ["provincia:108"]), m);
  }

  /* ---------- C. fusi, alias, Sardegna ---------- */
  {
    const t = traduciEtichetta("Seppiana (VB)", null, d);
    caso("C «Seppiana (VB)» → 103078 con nota «oggi è Borgomezzavalle (VB)»", isDeepStrictEqual(codici(t.aree), ["comune:103078"]) && t.nota === "oggi è Borgomezzavalle (VB)" && t.esito === "tradotta", t);
    const c = traduciEtichetta("Carbonia (SU)", null, d);
    caso("C «Carbonia (SU)» → 119003 (CI), senza nota", isDeepStrictEqual(c.aree, [{ tipo: "comune", codice: "119003", nome: "Carbonia", sigla: "CI" }]) && !c.nota, c);
    caso("C «San Dorligo della Valle (TS)» → 032004", isDeepStrictEqual(codici(traduciEtichetta("San Dorligo della Valle (TS)", null, d).aree), ["comune:032004"]));
    caso("C «San Giovanni di Fassa (TN)» → 022250", isDeepStrictEqual(codici(traduciEtichetta("San Giovanni di Fassa (TN)", null, d).aree), ["comune:022250"]));
    const su = traduciEtichetta("Sud Sardegna e provincia", null, d);
    caso("C «Sud Sardegna e provincia» → non riconosciuta con le province nuove", su.esito === "non_riconosciuta" && !!su.nota?.includes("Sulcis Iglesiente") && !!su.nota.includes("Medio Campidano"), su);
    const ss = traduciEtichetta("Sassari e provincia", null, d);
    caso("C «Sassari e provincia» → SS 2026 (112), 66 comuni, nota dei confini", isDeepStrictEqual(ss.aree, [{ tipo: "provincia", codice: "112", sigla: "SS", nome: "Sassari" }]) && quanti("Sassari e provincia") === 66 && !!ss.nota?.includes("66 comuni"), ss);
    const ci = traduciEtichetta("Sulcis Iglesiente e provincia", null, d);
    caso("C provincia sarda nuova «Sulcis Iglesiente e provincia» → CI 119, senza nota", isDeepStrictEqual(codici(ci.aree), ["provincia:119"]) && !ci.nota && quanti("Sulcis Iglesiente e provincia") === 24, ci);
    const l = proposta(leggiZoneServite(cliente(leadForm(["Sassari e provincia"], { comune: "Sassari", provincia: "SS", provinciaNome: "Sassari", regione: "Sardegna" }))));
    caso("C lead con provincia sarda cambiata → da controllare, non usabile", l.esito === "da_controllare" && !zoneUsabili(l).ok, l.esito);
  }
  {
    const [soppresso, a] = Object.entries(d.alias).find(([, v]) => v.a === "103079")!;
    const zona: Pick<Zone, "etichette" | "sede"> = { etichette: [{ testo: "vecchio", origine: "zona", provenienza: "operatore", esito: "tradotta", aree: [{ tipo: "comune", codice: soppresso, nome: "Vecchio", sigla: "VB" }] }], sede: null };
    const c = comuniServiti(zona, d);
    caso("C comuniServiti con codice soppresso → codice 2026 via alias", c.length === 1 && c[0]!.codice === a.a && !d.comuni[soppresso], c);
    const dint = comuniServiti({ etichette: [{ ...zona.etichette[0]!, aree: [{ tipo: "dintorni", codice: soppresso, nome: "Vecchio", sigla: "VB", raggioKm: 10 }] }], sede: null }, d);
    caso("C dintorni di un codice soppresso → centro del comune 2026", dint.some((x) => x.codice === a.a) && dint.length > 1, dint.length);
  }

  /* ---------- D. brief Tally: nessuna lettura della prosa ---------- */
  {
    const dir = cliente({ id: "tally-1", formId: "x", responses: [{ questionId: "q", answer: "Lavoriamo in Lombardia e in tutta Italia" }] });
    fs.writeFileSync(path.join(dir, "brief.json"), JSON.stringify({ citta: "Cologno Monzese", descrizione: "Lavoriamo in Lombardia e ci spostiamo in tutta Italia", area_geografica: "Regionale" }));
    const l = proposta(leggiZoneServite(dir));
    const u = zoneUsabili(l);
    caso("D Tally → da impostare, nessuna etichetta, nessuna area dalla prosa", l.esito === "da_impostare" && l.zone.lead.fonte === "tally" && l.zone.etichette.length === 0 && l.zone.sede === null, l);
    caso("D Tally → non usabile col motivo «da impostare»", !u.ok && u.motivo === MOTIVO_DA_IMPOSTARE, u);
    const v = vistaZone(l);
    caso("D vista Tally: stato da_impostare, fonte tally", v.stato === "da_impostare" && v.fonte === "tally" && v.righe.length === 0 && v.totale === null, v);
    const s = salvaZoneServite(dir, ["Cologno Monzese (MI)", "Tutta la regione Lombardia"], v.impronta, "2026-09-15T10:00:00.000Z");
    const letta = leggiZoneServite(dir);
    caso("D Tally: l'operatore imposta le zone una volta → confermate, provenienza operatore", s.ok && letta.stato === "confermate" && !letta.leadCambiato && letta.zone.etichette.every((e) => e.provenienza === "operatore") && zoneUsabili(letta).ok, s);
  }

  /* ---------- E. input corrotti ---------- */
  {
    const assente = proposta(leggiZoneServite(cliente(undefined)));
    caso("E raw-submission.json assente → fonte assente, da impostare, vista senza_lead", assente.zone.lead.fonte === "assente" && assente.esito === "da_impostare" && vistaZone(assente).stato === "senza_lead");
    const rotto = proposta(leggiZoneServite(cliente(undefined, "{ non è json")));
    caso("E raw-submission.json non JSON → come assente", rotto.zone.lead.fonte === "assente" && rotto.esito === "da_impostare");
    const nonElenco = proposta(leggiZoneServite(cliente(leadForm("Tutta la regione Veneto"))));
    caso("E zone non elenco → avviso, solo la sede, da controllare", nonElenco.esito === "da_controllare" && nonElenco.zone.etichette.length === 1 && nonElenco.avvisi.some((a) => a.includes("non sono un elenco")), nonElenco.avvisi);
    const lunga = "x".repeat(2000);
    const sporche = proposta(leggiZoneServite(cliente(leadForm([42, "", "   ", lunga, null, "Tutta la regione Veneto"]))));
    const rigaLunga = sporche.zone.etichette.find((e) => e.testo.startsWith("xxx"));
    caso(
      "E zone con numeri, vuote e 2.000 caratteri → avvisi, lunga non riconosciuta e troncata, da controllare",
      sporche.esito === "da_controllare" && sporche.avvisi.length === 2 && rigaLunga?.esito === "non_riconosciuta" && rigaLunga.testo.length === 120 && !!rigaLunga.nota?.includes("2000 caratteri") && sporche.zone.lead.etichette.every((e) => e.length <= 120),
      { avvisi: sporche.avvisi, riga: rigaLunga?.nota },
    );
    const trecento = proposta(leggiZoneServite(cliente(leadForm(Array.from({ length: 300 }, (_, i) => `Zona ${i}`)))));
    caso("E 300 voci → sede + prime 59 zone = 60 righe (il massimo del file), avviso", trecento.zone.lead.etichette.length === MAX_ETICHETTE && trecento.zone.etichette.length === MAX_ETICHETTE && trecento.avvisi.some((a) => a.includes("300 zone") && a.includes("prime 59")), trecento.avvisi);
    {
      // Una proposta con più zone del massimo resta salvabile così com'è («Conferma le zone» senza togliere nulla).
      const settanta = [...d.province.values()].slice(0, 70).map((p) => `Provincia di ${p.nome}`);
      const dir70 = cliente(leadForm(settanta));
      const l70 = proposta(leggiZoneServite(dir70));
      const s70 = salvaZoneServite(dir70, l70.zone.etichette.map((e) => e.testo), l70.zone.lead.impronta, "2026-09-15T10:00:00.000Z");
      caso("E 70 zone valide + sede → 60 righe, «Conferma le zone» salva (niente 400/422 sul massimo)", settanta.length === 70 && l70.zone.etichette.length === MAX_ETICHETTE && s70.ok, { righe: l70.zone.etichette.length, avvisi: l70.avvisi, s70: s70.ok || s70.errore });
    }
    const senzaSigla = proposta(leggiZoneServite(cliente(leadForm(["Sandrigo e dintorni"], { comune: "Sandrigo", provincia: "", regione: "", cap: "", via: "x", daVerificare: true }))));
    const sede = senzaSigla.zone.etichette[0];
    caso("E sede senza sigla → comune unico con nota, dintorni riconosciuti, da controllare", sede?.testo === "Sandrigo" && sede.esito === "tradotta" && !!sede.nota?.includes("senza provincia") && senzaSigla.esito === "da_controllare" && isDeepStrictEqual(codici(senzaSigla.zone.etichette[1]!.aree), ["dintorni:024091"]), senzaSigla.zone.etichette);
    const sedeIgnota = proposta(leggiZoneServite(cliente(leadForm(["Sandrgo e dintorni"], { comune: "Sandrgo", provincia: "", daVerificare: true }))));
    caso("E sede non trovata e dintorni ignoti → da impostare", sedeIgnota.esito === "da_impostare" && sedeIgnota.zone.sede === null && sedeIgnota.zone.etichette.every((e) => e.esito === "non_riconosciuta"), sedeIgnota.zone.etichette);
    const senzaSede = proposta(leggiZoneServite(cliente(leadForm(["Tutta la regione Veneto"], null))));
    const comuniSenzaSede = comuniServiti(senzaSede.zone, d);
    caso("E lead senza sede → avviso, regione tradotta, da controllare, kmDallaSede null", senzaSede.esito === "da_controllare" && senzaSede.zone.sede === null && senzaSede.avvisi.length === 1 && comuniSenzaSede.length === 560 && comuniSenzaSede.every((c) => c.kmDallaSede === null), senzaSede.avvisi);
    const dirSenzaBrief = cliente(leadForm(["Tutta la regione Veneto"]));
    caso("E brief.json assente → nessun effetto sul form v4", proposta(leggiZoneServite(dirSenzaBrief)).esito === "riconosciute" && !fs.existsSync(path.join(dirSenzaBrief, "brief.json")));
    const script = traduciEtichetta("<script>alert(1)</script>", null, d);
    caso("E «<script>» → non riconosciuta, testo intatto", script.esito === "non_riconosciuta" && proposta(leggiZoneServite(cliente(leadForm(["<script>alert(1)</script>"])))).zone.etichette[1]?.testo === "<script>alert(1)</script>", script);
    caso("E etichetta scritta a mano in più parti con una ignota → non riconosciuta per intero", traduciEtichetta("Bergamo, zona nord", null, d).esito === "non_riconosciuta");
    const piuParti = traduciEtichetta("Bergamo, Lombardia", null, d);
    caso("E «Bergamo, Lombardia» → comune + regione, da controllare", piuParti.esito === "da_controllare" && isDeepStrictEqual(codici(piuParti.aree), ["comune:016024", "regione:03"]), piuParti);

    // dati illeggibili → errore_dati (mai una proposta vuota spacciata per vera)
    const dirOk = cliente(leadForm(["Tutta la regione Veneto"]));
    const schema2 = path.join(tmp, "schema2.json");
    fs.writeFileSync(schema2, JSON.stringify({ schema: 2, comuni: {} }));
    const nonJson = path.join(tmp, "rotto.json");
    fs.writeFileSync(nonJson, "[");
    const casi: [string, { dataset: string; province: string }][] = [
      ["province.json assente", { ...PERCORSI_DATI, province: path.join(tmp, "manca.json") }],
      ["province.json non JSON", { ...PERCORSI_DATI, province: nonJson }],
      ["dataset assente", { ...PERCORSI_DATI, dataset: path.join(tmp, "manca.json") }],
      ["dataset con schema ≠ 1", { ...PERCORSI_DATI, dataset: schema2 }],
    ];
    for (const [nome, p] of casi) {
      const l = leggiZoneServite(dirOk, p);
      const s = salvaZoneServite(dirOk, ["Tutta la regione Veneto"], "x", "2026-09-15T10:00:00.000Z", false, p);
      const a = anteprimaEtichetta(dirOk, "Tutta Italia", p);
      caso(`E ${nome} → errore_dati, salva e anteprima 503, vista errore_dati`, l.stato === "errore_dati" && !zoneUsabili(l).ok && !s.ok && s.codice === 503 && !a.ok && vistaZone(l, p).stato === "errore_dati", { l, s });
    }
    {
      // province.json è generato e fuori da git: su un checkout pulito manca, il messaggio dice come rigenerarlo.
      const l = leggiZoneServite(dirOk, { ...PERCORSI_DATI, province: path.join(tmp, "manca.json") });
      caso("E province.json assente → il motivo dice «npm run comuni» in site-intake", l.stato === "errore_dati" && l.motivo.includes("ENOENT") && l.motivo.includes("«npm run comuni» in site-intake"), l);
    }
    const provinceSenzaVI = path.join(tmp, "province-senza-vi.json");
    fs.writeFileSync(provinceSenzaVI, JSON.stringify(JSON.parse(fs.readFileSync(PERCORSI_DATI.province, "utf8")).filter((p: { sigla: string }) => p.sigla !== "VI")));
    const l = leggiZoneServite(dirOk, { ...PERCORSI_DATI, province: provinceSenzaVI });
    caso("E province.json senza una sigla del dataset → errore_dati che la nomina", l.stato === "errore_dati" && l.motivo.includes("VI"), l);

    // file fuori schema: mai sovrascritto
    const dirRotto = cliente(leadForm(["Tutta la regione Veneto"]));
    fs.mkdirSync(path.join(dirRotto, "traffico"));
    fs.writeFileSync(path.join(dirRotto, FILE_ZONE), JSON.stringify({ versione: 1, etichette: "no" }));
    const lr = leggiZoneServite(dirRotto);
    const impronta = proposta(leggiZoneServite(cliente(leadForm(["Tutta la regione Veneto"])))).zone.lead.impronta;
    const sr = salvaZoneServite(dirRotto, ["Tutta la regione Veneto"], impronta, "2026-09-15T10:00:00.000Z");
    caso("E zone-servite.json fuori schema → non_leggibile, salva 409, file intatto", lr.stato === "non_leggibile" && !sr.ok && sr.codice === 409 && fs.readFileSync(path.join(dirRotto, FILE_ZONE), "utf8").includes('"no"') && vistaZone(lr).stato === "non_leggibile", { lr, sr });
    fs.writeFileSync(path.join(dirRotto, FILE_ZONE), "{");
    caso("E zone-servite.json non JSON → non_leggibile", leggiZoneServite(dirRotto).stato === "non_leggibile");
  }

  /* ---------- F. parità con le copie ---------- */
  caso("F REGIONI = CONFINI di site-intake/src/data/regioni.ts", isDeepStrictEqual(Object.fromEntries(REGIONI.map((r) => [r.nome, [...r.confini]])), CONFINI));
  {
    const ds = caricaFattiComuni();
    const dirComuni = path.resolve(import.meta.dirname, "../../site-intake/public/data/comuni");
    const coppie: [string, string][] = fs.readdirSync(dirComuni).flatMap((f) => (JSON.parse(fs.readFileSync(path.join(dirComuni, f), "utf8")) as [string, string][]).map((r) => [r[0], r[1]] as [string, string]));
    const diverse = coppie.filter(([nome, sigla]) => !isDeepStrictEqual(cercaComune(nome, sigla, d), cercaComuneT6a(nome, sigla, ds)));
    const nonUniche = coppie.filter(([nome, sigla]) => cercaComune(nome, sigla, d).length !== 1);
    caso(`F ricerca = cercaComune T6a sulle ${coppie.length} coppie del form, ognuna a un solo comune 2026`, coppie.length === 7904 && diverse.length === 0 && nonUniche.length === 0, { diverse: diverse.slice(0, 5), nonUniche: nonUniche.slice(0, 5) });
    const precedenti = Object.values(ds.comuni).flatMap((r) => r.nomiPrecedenti ?? []).slice(0, 400);
    const diversePrec = precedenti.filter((nome) => !isDeepStrictEqual(cercaComune(nome, undefined, d), cercaComuneT6a(nome, undefined, ds)));
    caso(`F ricerca = cercaComune T6a su ${precedenti.length} nomi precedenti senza sigla`, precedenti.length > 100 && diversePrec.length === 0, diversePrec.slice(0, 5));
    const sedi = ["024091", "015081", "071051"];
    const ordina = (l: { codice: string; km: number }[]) => l.map((x) => `${x.codice}:${x.km}`).sort();
    const diverseKm = sedi.flatMap((s) => [10, 15, 20, 30].filter((km) => !isDeepStrictEqual(ordina(comuniEntroKm(s, km, d)), ordina(comuniEntroKmT6a(s, km, ds)))).map((km) => `${s}@${km}`));
    caso("F distanza = comuniEntroKm T6a per 3 sedi × 10/15/20/30 km", diverseKm.length === 0, diverseKm);
    const sigle = [...new Set(Object.values(d.comuni).map((r) => r.sigla))];
    caso(`F ognuna delle ${sigle.length} sigle del dataset ha una regione`, sigle.length === 110 && sigle.every((s) => regioneDiSigla(s, d) !== null), sigle.filter((s) => !regioneDiSigla(s, d)));
    caso("F regioneDiSigla: CI → Sardegna 20, MB → Lombardia 03, XX → null", isDeepStrictEqual(regioneDiSigla("CI", d), { codice: "20", nome: "Sardegna" }) && regioneDiSigla("mb", d)?.codice === "03" && regioneDiSigla("XX", d) === null);
    const province = JSON.parse(fs.readFileSync(PERCORSI_DATI.province, "utf8")) as { sigla: string; nome: string }[];
    const irrisolte = province.filter((p) => {
      const t = traduciEtichetta(`${p.nome} e provincia`, null, d);
      return p.sigla === "SU" ? t.esito !== "non_riconosciuta" : !(t.aree.length === 1 && t.aree[0]!.tipo === "provincia" && t.aree[0]!.sigla === p.sigla);
    });
    caso(`F ogni nome delle ${province.length} province del form risolve («Sud Sardegna» soppressa)`, province.length === 107 && irrisolte.length === 0, irrisolte);
    const regioniForm = REGIONI.flatMap((r) => [`Tutta la regione ${r.nome.split("/")[0]}`, ...(r.confini.length ? [`${r.nome.split("/")[0]} e regioni vicine`] : [])]);
    caso(`F le ${regioniForm.length} etichette-regione del form si traducono senza note`, regioniForm.every((t) => {
      const r = traduciEtichetta(t, null, d);
      return r.esito === "tradotta" && !r.nota;
    }));
  }

  /* ---------- G. artifact, contratto e vista ---------- */
  {
    const T0 = "2026-09-15T10:00:00.000Z";
    const dir = cliente(leadForm(["Sandrigo e dintorni", "zona nord"]));
    const l0 = proposta(leggiZoneServite(dir));
    const v0 = vistaZone(l0);
    caso("G proposta con una etichetta non riconosciuta → da controllare, motivo per i consumatori", l0.esito === "da_controllare" && v0.stato === "da_controllare" && isDeepStrictEqual(zoneUsabili(l0), { ok: false, motivo: MOTIVO_DA_CONTROLLARE }), v0);
    const imp = l0.zone.lead.impronta;

    const s422 = salvaZoneServite(dir, l0.zone.etichette.map((e) => e.testo), imp, T0);
    caso("G salva con una non riconosciuta → 422 con l'elenco, nessun file", !s422.ok && s422.codice === 422 && s422.nonRiconosciute?.[0]?.testo === "zona nord" && !fs.existsSync(path.join(dir, FILE_ZONE)), s422);
    const vuoto = salvaZoneServite(dir, [], imp, T0);
    caso("G salva senza etichette → 422 «Nessuna zona»", !vuoto.ok && vuoto.codice === 422 && vuoto.errore.startsWith("Nessuna zona"), vuoto);
    const s409 = salvaZoneServite(dir, ["Tutta Italia"], "0".repeat(64), T0);
    caso("G salva con impronta di un altro lead → 409, nessun file", !s409.ok && s409.codice === 409 && !fs.existsSync(path.join(dir, FILE_ZONE)), s409);
    const troppe = salvaZoneServite(dir, Array.from({ length: 61 }, (_, i) => `Zona ${i}`), imp, T0);
    caso("G salva con 61 etichette → 422", !troppe.ok && troppe.codice === 422, troppe);

    const s = salvaZoneServite(dir, ["Sandrigo (VI)", "Sandrigo e dintorni", "Tutta la regione Veneto", "sandrigo e DINTORNI"], imp, T0);
    const l1 = leggiZoneServite(dir);
    caso("G salva → 200, nessun .tmp rimasto", s.ok && !fs.readdirSync(path.join(dir, "traffico")).some((f) => f.endsWith(".tmp")), s);
    caso("G leggi → confermate, lead invariato, usabili", l1.stato === "confermate" && !l1.leadCambiato && l1.zone.confermateAt === T0 && zoneUsabili(l1).ok, l1.stato);
    if (l1.stato === "confermate") {
      const e = l1.zone.etichette;
      caso(
        "G provenienza e origine calcolate dal server (sede, lead, operatore), duplicati tolti",
        e.length === 3 && e[0]!.origine === "sede" && e[0]!.provenienza === "lead" && e[1]!.provenienza === "lead" && e[2]!.provenienza === "operatore" && e[2]!.origine === "zona",
        e,
      );
      caso("G lead.etichette del file = etichette originali del lead", isDeepStrictEqual(l1.zone.lead.etichette, ["Sandrigo e dintorni", "zona nord"]));
      const c = comuniServiti(l1.zone, d);
      caso("G comuniServiti: sede e dintorni dentro la regione senza doppioni, sede a 0 km in testa", c.length === 560 && new Set(c.map((x) => x.codice)).size === 560 && c[0]!.codice === "024091" && c[0]!.kmDallaSede === 0 && c.every((x) => typeof x.popolazione === "number"), c.slice(0, 2));
      const aree = areeServite(l1.zone);
      const sandrigo = c[0]!;
      caso("G aree dei comuni = indici in areeServite (sede, dintorni, regione)", aree.length === 3 && isDeepStrictEqual(sandrigo.aree, [0, 1, 2]) && c.filter((x) => x.aree.includes(1)).length === 65, { aree, sandrigo });
      const v = vistaZone(l1);
      caso("G vista confermate: righe, totale, data", v.stato === "confermate" && v.righe.length === 3 && v.totale?.startsWith("560 comuni · ") === true && v.confermateAt === T0 && v.righe[1]!.traduzione === "comuni entro 20 km da Sandrigo (VI)" && v.righe[1]!.ampiezza === "65 comuni" && v.righe[0]!.traduzione === "comune Sandrigo (VI), sede del cliente", v);
    }
    const a = anteprimaEtichetta(dir, "Provincia di Vicenza");
    caso("G anteprima: riga tradotta, provenienza operatore, nessuna scrittura", a.ok && a.riga.esito === "tradotta" && a.riga.provenienza === "operatore" && a.riga.ampiezza === "113 comuni" && a.riga.traduzione === "provincia di Vicenza (VI)", a);
    const aSede = anteprimaEtichetta(dir, "sandrigo (vi)");
    caso("G anteprima della sede → origine sede, provenienza lead", aSede.ok && aSede.riga.origine === "sede" && aSede.riga.provenienza === "lead", aSede);

    // Il lead cambia dopo il salvataggio (re-import): consumatori bloccati, vista «da rivedere».
    const lead = JSON.parse(fs.readFileSync(path.join(dir, "raw-submission.json"), "utf8"));
    lead.risposte.orari = "lun-ven 8-18"; // un campo nuovo del lead non cambia l'impronta
    fs.writeFileSync(path.join(dir, "raw-submission.json"), JSON.stringify(lead));
    const lOrari = leggiZoneServite(dir);
    caso("G un campo del lead estraneo alle zone non cambia l'impronta", lOrari.stato === "confermate" && !lOrari.leadCambiato);
    lead.risposte.zone = ["Vicenza e provincia"];
    fs.writeFileSync(path.join(dir, "raw-submission.json"), JSON.stringify(lead));
    const l2 = leggiZoneServite(dir);
    const u2 = zoneUsabili(l2);
    const v2 = vistaZone(l2);
    caso("G zone del lead cambiate → leadCambiato, zoneUsabili falso col motivo", l2.stato === "confermate" && l2.leadCambiato && isDeepStrictEqual(u2, { ok: false, motivo: MOTIVO_LEAD_CAMBIATO }), u2);
    caso("G vista lead_cambiato: righe salvate + righe del nuovo lead + impronta nuova", v2.stato === "lead_cambiato" && v2.righe.length === 3 && v2.righeNuovoLead.map((r) => r.testo).join("|") === "Sandrigo (VI)|Vicenza e provincia" && v2.impronta !== imp && isDeepStrictEqual(v2.etichetteLead, ["Vicenza e provincia"]), v2);
    const vecchia = salvaZoneServite(dir, ["Tutta Italia"], imp, T0);
    caso("G salva con l'impronta vecchia → 409", !vecchia.ok && vecchia.codice === 409, vecchia);
    caso("G vista lead_cambiato con un nuovo lead tradotto senza note → esitoNuovoLead riconosciute", v2.esitoNuovoLead === "riconosciute" && vistaZone(l1).esitoNuovoLead === null, v2.esitoNuovoLead);
    const bene = salvaZoneServite(dir, v2.righe.map((r) => r.testo), v2.impronta, "2026-09-16T10:00:00.000Z", true);
    const l3 = leggiZoneServite(dir);
    caso(
      "G «Va bene così» = risalva le zone con l'impronta nuova → confermate, ogni zona tiene la sua provenienza (dal vecchio lead resta lead)",
      bene.ok && l3.stato === "confermate" && !l3.leadCambiato && isDeepStrictEqual(l3.zone.etichette.map((e) => e.provenienza), ["lead", "lead", "operatore"]),
      l3,
    );
    caso("G vista: maxZone = MAX_ETICHETTE (la card blocca il salvataggio oltre, niente 400)", v2.maxZone === MAX_ETICHETTE && vistaZone(l3).maxZone === MAX_ETICHETTE && v0.maxZone === MAX_ETICHETTE, v2.maxZone);

    // Proposta riconosciuta: nessuna conferma serve, e un cambio del lead cambia solo la proposta.
    const dirR = cliente(leadForm(["Tutta la regione Veneto"]));
    const r1 = vistaZone(leggiZoneServite(dirR));
    caso("G vista riconosciute: sede + regione, totale 560 comuni, nessun file scritto in lettura", r1.stato === "riconosciute" && r1.righe.length === 2 && r1.totale?.startsWith("560 comuni") === true && !fs.existsSync(path.join(dirR, "traffico")), r1);

    const T1 = "2026-09-16T10:00:00.000Z";
    const rilead = (dirC: string, raw: unknown) => fs.writeFileSync(path.join(dirC, "raw-submission.json"), JSON.stringify(raw));
    const salvaProposta = (dirC: string) => {
      const p = proposta(leggiZoneServite(dirC));
      return salvaZoneServite(dirC, p.zone.etichette.map((e) => e.testo), p.zone.lead.impronta, T0);
    };
    const areeDi = (l: LetturaZone, testo: string) => (l.stato === "confermate" ? codici(l.zone.etichette.find((e) => e.testo === testo)?.aree ?? []) : []);

    // Lead cambiato con zone da controllare: nessun salvataggio a un clic di traduzioni mai mostrate (la card apre la modifica).
    const dirV = cliente(leadForm(["Tutta la regione Veneto"]));
    const sV = salvaProposta(dirV);
    rilead(dirV, leadForm(["Bergamo", "Molise"]));
    const vV = vistaZone(leggiZoneServite(dirV));
    caso(
      "G lead cambiato in «Bergamo», «Molise» (omonimi con nota) → esitoNuovoLead da_controllare, righe del nuovo lead con le note",
      sV.ok && vV.stato === "lead_cambiato" && vV.esitoNuovoLead === "da_controllare" && vV.righeNuovoLead.filter((r) => r.esito === "da_controllare" && r.nota).length === 2,
      vV,
    );

    // «Va bene così» con la sede cambiata: le zone salvate tengono le aree (niente 422 con l'omonimo), la sede nuova la dice il banner.
    const CASTRO_LE = { comune: "Castro", provincia: "LE", provinciaNome: "Lecce", regione: "Puglia" };
    const dirC = cliente(leadForm(["Castro e dintorni"], CASTRO_LE));
    const sC = salvaProposta(dirC);
    rilead(dirC, leadForm(["Lecce e dintorni"], { comune: "Lecce", provincia: "LE", provinciaNome: "Lecce", regione: "Puglia" }));
    const vC = vistaZone(leggiZoneServite(dirC));
    const senzaTieni = salvaZoneServite(dirC, vC.righe.map((r) => r.testo), vC.impronta, T1);
    const tieni = salvaZoneServite(dirC, vC.righe.map((r) => r.testo), vC.impronta, T1, true);
    const lC = leggiZoneServite(dirC);
    caso(
      "G «Va bene così» dopo il cambio di sede Castro (LE) → Lecce: 200, «Castro e dintorni» resta dintorni 075096 (ritradotta sarebbe 422)",
      sC.ok && vC.stato === "lead_cambiato" && !senzaTieni.ok && senzaTieni.codice === 422 && tieni.ok && lC.stato === "confermate" && !lC.leadCambiato && isDeepStrictEqual(areeDi(lC, "Castro e dintorni"), ["dintorni:075096"]),
      { vC: vC.stato, senzaTieni, tieni },
    );
    caso(
      "G lead cambiato con un'altra sede → avviso nel banner, e il file prende la sede del lead attuale",
      vC.avvisi[0] === "la sede ora è Lecce (LE), non più Castro (LE)" && lC.stato === "confermate" && lC.zone.sede?.nome === "Lecce" && lC.zone.etichette[0]?.origine === "zona",
      { avvisi: vC.avvisi, sede: lC.stato === "confermate" && lC.zone.sede },
    );

    // «Va bene così» con la sede del nuovo lead ambigua o non trovata: il file resta senza sede, ma il banner lo dice prima.
    for (const [nome, sedeNuova] of [
      ["ambigua «Castro» senza sigla", { comune: "Castro", provincia: "", daVerificare: true }],
      ["non trovata «Sandrigoo (VI)»", { ...SANDRIGO, comune: "Sandrigoo" }],
    ] as const) {
      const dirP = cliente(leadForm(["Sandrigo e dintorni"]));
      const sP = salvaProposta(dirP);
      rilead(dirP, leadForm(["Sandrigo e dintorni"], sedeNuova));
      const vP = vistaZone(leggiZoneServite(dirP));
      const tieniP = salvaZoneServite(dirP, vP.righe.map((r) => r.testo), vP.impronta, T1, true);
      const lP = leggiZoneServite(dirP);
      caso(
        `G lead cambiato con la sede ${nome} → avviso «non è più la sede» nel banner; «Va bene così» salva senza sede`,
        sP.ok && vP.stato === "lead_cambiato" && vP.avvisi[0] === "nessuna sede riconosciuta, quindi salvando Sandrigo (VI) non è più la sede" && tieniP.ok && lP.stato === "confermate" && lP.zone.sede === null,
        { avvisi: vP.avvisi, tieniP },
      );
    }
    {
      // Senza sede prima e senza sede dopo non si perde nulla: nessun avviso sulla sede.
      const dirN = cliente(leadForm(["Tutta la regione Veneto"], null));
      const sN = salvaProposta(dirN);
      rilead(dirN, leadForm(["Tutta Italia"], null));
      const vN = vistaZone(leggiZoneServite(dirN));
      caso("G lead cambiato senza sede né prima né dopo → nessun avviso sulla sede", sN.ok && vN.stato === "lead_cambiato" && !vN.avvisi.some((a) => a.includes("sede riconosciuta")), vN.avvisi);
    }

    // «Va bene così» con la sede cambiata: la vecchia sede resta «dal form lead», anche dopo una Modifica successiva.
    const dirS = cliente(leadForm(["Sandrigo e dintorni"]));
    const sS = salvaProposta(dirS);
    rilead(dirS, leadForm(["Sandrigo e dintorni"], { ...SANDRIGO, comune: "Vicenza" }));
    const vS = vistaZone(leggiZoneServite(dirS));
    const tieniS = salvaZoneServite(dirS, vS.righe.map((r) => r.testo), vS.impronta, T1, true);
    const lS = leggiZoneServite(dirS);
    const vS2 = vistaZone(lS);
    const vecchiaSede = lS.stato === "confermate" ? lS.zone.etichette.find((e) => e.testo === "Sandrigo (VI)") : undefined;
    caso(
      "G «Va bene così» con la sede Sandrigo → Vicenza: «Sandrigo (VI)» resta zona dal lead, nessuna correzione a mano nella vista",
      sS.ok && tieniS.ok && vecchiaSede?.origine === "zona" && vecchiaSede.provenienza === "lead" && vS2.stato === "confermate" && vS2.righe.every((r) => r.provenienza === "lead"),
      { vecchiaSede, righe: vS2.righe },
    );
    const modS = salvaZoneServite(dirS, [...vS2.righe.map((r) => r.testo), "Provincia di Padova"], vS2.impronta, "2026-09-17T10:00:00.000Z");
    const lS2 = leggiZoneServite(dirS);
    caso(
      "G Modifica dopo «Va bene così» → «Sandrigo (VI)» ancora dal lead, solo «Provincia di Padova» aggiunta a mano",
      modS.ok && lS2.stato === "confermate" && isDeepStrictEqual(lS2.zone.etichette.filter((e) => e.provenienza === "operatore").map((e) => e.testo), ["Provincia di Padova"]),
      lS2.stato === "confermate" && lS2.zone.etichette,
    );

    // «Usa le zone del nuovo lead» con lo stesso testo: si ritraduce col lead nuovo, come l'ha mostrato la card.
    const dirB = cliente(leadForm(["Castro e dintorni"], CASTRO_LE));
    const sB = salvaProposta(dirB);
    rilead(dirB, leadForm(["Castro e dintorni"], { comune: "Castro", provincia: "BG", provinciaNome: "Bergamo", regione: "Lombardia" }));
    const vB = vistaZone(leggiZoneServite(dirB));
    const usa = salvaZoneServite(dirB, vB.righeNuovoLead.map((r) => r.testo), vB.impronta, T1);
    const lB = leggiZoneServite(dirB);
    caso(
      "G «Usa le zone del nuovo lead» con sede Castro (BG) → «Castro e dintorni» dintorni 016065 come nella card, non l'area salvata",
      sB.ok && vB.esitoNuovoLead === "riconosciute" && vB.righeNuovoLead[1]?.traduzione === "comuni entro 20 km da Castro (BG)" && usa.ok && isDeepStrictEqual(areeDi(lB, "Castro e dintorni"), ["dintorni:016065"]),
      { righe: vB.righeNuovoLead, usa },
    );

    // Un'area confermata tiene il suo raggioKm: una Modifica (o l'anteprima) non la ritraduce con la costante di oggi.
    const dirK = cliente(leadForm(["Sandrigo e dintorni"]));
    const sK = salvaProposta(dirK);
    const fileK = path.join(dirK, FILE_ZONE);
    const salvatoK = JSON.parse(fs.readFileSync(fileK, "utf8"));
    salvatoK.etichette[1].aree[0].raggioKm = 15; // confermata quando la costante era 15
    fs.writeFileSync(fileK, JSON.stringify(salvatoK));
    const aK = anteprimaEtichetta(dirK, "sandrigo e dintorni");
    const sK2 = salvaZoneServite(dirK, ["Sandrigo (VI)", "Sandrigo e dintorni", "Provincia di Padova"], salvatoK.lead.impronta, T1);
    const lK = leggiZoneServite(dirK);
    const dintK = lK.stato === "confermate" ? lK.zone.etichette[1]?.aree[0] : undefined;
    caso(
      "G Modifica che aggiunge «Provincia di Padova» → i dintorni confermati restano a 15 km (costante 20), anteprima uguale",
      (RAGGIO_DINTORNI_KM as number) !== 15 && sK.ok && sK2.ok && dintK?.tipo === "dintorni" && dintK.raggioKm === 15 && aK.ok && aK.riga.traduzione === "comuni entro 15 km da Sandrigo (VI)",
      { dintK, anteprima: aK.ok && aK.riga.traduzione },
    );
  }
} catch (e) {
  falliti += 1;
  console.error("✗ eccezione nel banco:", e);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${passati} passati, ${falliti} falliti`);
if (falliti) process.exitCode = 1;
