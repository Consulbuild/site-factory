// Banco di prova deterministico degli stati dei servizi «Traffico» (nessuna rete,
// nessun cliente reale): default del file senza campo, transizioni ammesse e
// vietate, guard del percorso demo, date dei passaggi (prima attivazione
// immutabile), azione del dettaglio, gruppi del portafoglio, fondamenta e ciclo.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-traffico-stato.ts
import { isDeepStrictEqual } from "node:util";
import {
  leggiTraffico,
  motivoRifiuto,
  transizione,
  azioneServizio,
  gruppoPortafoglio,
  fondamentaAccese,
  cicloAttivo,
  fraseDate,
  dataValida,
  nessunServizioAcceso,
  MOTIVO_DEMO,
  type Traffico,
  type StatoServizio,
} from "../lib/traffico.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}

const T0 = "2026-09-14T08:00:00.000Z";
const T1 = "2026-09-20T08:00:00.000Z";
const T2 = "2026-10-01T08:00:00.000Z";
const T3 = "2026-10-15T08:00:00.000Z";
const SPENTI: Traffico = { sito: { stato: "spento" }, scheda: { stato: "spento" } };

/** Applica una transizione che deve riuscire (fallisce il banco se rifiutata). */
function passa(t: Traffico, servizio: "sito" | "scheda", verso: StatoServizio, adesso: string, percorso: "demo" | "completo" = "completo"): Traffico {
  const e = transizione(t, servizio, verso, percorso, adesso);
  if (!e.ok) throw new Error(`transizione attesa ok, rifiutata: ${e.errore}`);
  return e.traffico;
}

console.log("leggiTraffico:");
caso("stato senza traffico → entrambi spenti", isDeepStrictEqual(leggiTraffico({}), SPENTI), leggiTraffico({}));
const a = leggiTraffico({});
const b = leggiTraffico({});
a.sito.stato = "attivo";
caso("due chiamate → oggetti distinti (mutarne uno non tocca l'altro)", b.sito.stato === "spento" && a.sito !== b.sito);
const presente: Traffico = { sito: { stato: "attivo", primaAttivazioneAt: T0, attivatoAt: T0 }, scheda: { stato: "spento" } };
const letto = leggiTraffico({ traffico: presente });
caso("con traffico presente → restituito uguale", isDeepStrictEqual(letto, presente), letto);
letto.sito.stato = "sospeso";
caso("mutare il letto non tocca lo stato d'origine", presente.sito.stato === "attivo");

console.log("\ntransizione / motivoRifiuto:");
const att = passa(SPENTI, "sito", "attivo", T0);
caso("spento→attivo: prima attivazione e attivo dal = adesso, niente sospeso", isDeepStrictEqual(att.sito, { stato: "attivo", primaAttivazioneAt: T0, attivatoAt: T0 }), att.sito);
const sosp = passa(att, "sito", "sospeso", T1);
caso("attivo→sospeso: sospesoAt = adesso, le due date di attivazione conservate", isDeepStrictEqual(sosp.sito, { stato: "sospeso", primaAttivazioneAt: T0, attivatoAt: T0, sospesoAt: T1 }), sosp.sito);
const riatt = passa(sosp, "sito", "attivo", T2);
caso(
  "sospeso→attivo: attivatoAt = adesso, prima attivazione immutata, ultima sospensione conservata",
  isDeepStrictEqual(riatt.sito, { stato: "attivo", primaAttivazioneAt: T0, attivatoAt: T2, sospesoAt: T1 }),
  riatt.sito,
);
const risosp = passa(riatt, "sito", "sospeso", T3);
caso("seconda sospensione: sospesoAt aggiornata, prima attivazione ancora T0", risosp.sito.sospesoAt === T3 && risosp.sito.primaAttivazioneAt === T0 && risosp.sito.attivatoAt === T2, risosp.sito);

const rif = (da: StatoServizio, verso: StatoServizio, percorso: "demo" | "completo" = "completo") => motivoRifiuto(da, verso, percorso)?.codice ?? null;
caso("spento→sospeso → 400", rif("spento", "sospeso") === 400);
caso("stesso stato → 400 (attivo, sospeso, spento)", rif("attivo", "attivo") === 400 && rif("sospeso", "sospeso") === 400 && rif("spento", "spento") === 400);
caso("attivo→spento e sospeso→spento → 400", rif("attivo", "spento") === 400 && rif("sospeso", "spento") === 400);
caso("il 400 dice cosa si può fare", /si può solo sospendere/.test(motivoRifiuto("attivo", "spento", "completo")?.errore ?? ""));
const vietata = transizione(att, "sito", "spento", "completo", T1);
caso("transizione rifiutata → ok:false col codice e l'errore", !vietata.ok && vietata.codice === 400 && vietata.errore.length > 0, vietata);

caso("demo: spento→attivo → 409", rif("spento", "attivo", "demo") === 409);
caso("demo: sospeso→attivo → 409", rif("sospeso", "attivo", "demo") === 409);
caso("demo: attivo→sospeso → ammessa (spegnere è sempre sicuro)", rif("attivo", "sospeso", "demo") === null);
caso("demo: spento→sospeso → 400 (la validità precede il guard)", rif("spento", "sospeso", "demo") === 400);

const soloScheda = passa(att, "scheda", "attivo", T1);
caso("cambiare scheda lascia sito identico", isDeepStrictEqual(soloScheda.sito, att.sito));
caso("cambiare sito lascia scheda identica", isDeepStrictEqual(passa(soloScheda, "sito", "sospeso", T2).scheda, soloScheda.scheda));

const snapshot = JSON.stringify(att);
passa(att, "sito", "sospeso", T1);
transizione(att, "sito", "spento", "completo", T1);
caso("l'input non viene mutato (né da ok né da rifiuto)", JSON.stringify(att) === snapshot);

const demo409 = transizione(SPENTI, "sito", "attivo", "demo", T0);
caso(
  "il messaggio 409 è la stessa frase del bottone disabilitato",
  !demo409.ok && demo409.errore === MOTIVO_DEMO && demo409.errore === azioneServizio({ stato: "spento" }, "demo").motivoBlocco,
  demo409,
);

const aMano: Traffico = { sito: { stato: "attivo" }, scheda: { stato: "sospeso" } };
caso("attivo ritoccato a mano senza date → sospeso senza prima attivazione inventata", isDeepStrictEqual(passa(aMano, "sito", "sospeso", T1).sito, { stato: "sospeso", sospesoAt: T1 }));
caso("sospeso ritoccato a mano senza date → riattivato con prima attivazione = adesso", isDeepStrictEqual(passa(aMano, "scheda", "attivo", T1).scheda, { stato: "attivo", primaAttivazioneAt: T1, attivatoAt: T1 }));

console.log("\nazioneServizio:");
const az = (stato: StatoServizio, percorso: "demo" | "completo" = "completo") => azioneServizio({ stato }, percorso);
caso("spento → Attiva verso attivo", az("spento").etichetta === "Attiva" && az("spento").verso === "attivo");
caso("attivo → Sospendi verso sospeso", az("attivo").etichetta === "Sospendi" && az("attivo").verso === "sospeso");
caso("sospeso → Riattiva verso attivo", az("sospeso").etichetta === "Riattiva" && az("sospeso").verso === "attivo");
caso("completo → nessun blocco", az("spento").motivoBlocco === null && az("attivo").motivoBlocco === null && az("sospeso").motivoBlocco === null);
caso("demo + spento e demo + sospeso → bloccati col motivo", az("spento", "demo").motivoBlocco === MOTIVO_DEMO && az("sospeso", "demo").motivoBlocco === MOTIVO_DEMO);
caso("demo + attivo → sospendere non è bloccato", az("attivo", "demo").motivoBlocco === null);

console.log("\ngruppoPortafoglio:");
caso("corrotto → non_leggibile (anche se lo stato sintetizzato è spento)", gruppoPortafoglio({ percorso: "completo" }, true) === "non_leggibile");
caso("un servizio attivo → accesi", gruppoPortafoglio({ percorso: "completo", traffico: att }, false) === "accesi");
caso("un servizio sospeso in demo → accesi", gruppoPortafoglio({ percorso: "demo", traffico: { sito: { stato: "spento" }, scheda: { stato: "sospeso", sospesoAt: T1 } } }, false) === "accesi");
caso("entrambi spenti, completo → spenti", gruppoPortafoglio({ percorso: "completo", traffico: SPENTI }, false) === "spenti");
caso("entrambi spenti, demo → demo", gruppoPortafoglio({ percorso: "demo", traffico: SPENTI }, false) === "demo");
caso("senza campo → come spenti", gruppoPortafoglio({ percorso: "completo" }, false) === "spenti" && gruppoPortafoglio({ percorso: "demo" }, false) === "demo");
caso("nessun servizio acceso: solo spenti e demo → sì", nessunServizioAcceso(["spenti", "demo"]) && nessunServizioAcceso([]));
caso("nessun servizio acceso: un acceso → no", !nessunServizioAcceso(["spenti", "accesi"]));
caso("nessun servizio acceso: un file illeggibile → no (il suo stato non si conosce)", !nessunServizioAcceso(["spenti", "non_leggibile"]));

console.log("\nfondamentaAccese / cicloAttivo:");
const conSito = (stato: StatoServizio): Traffico => ({ sito: { stato }, scheda: { stato: "attivo" } });
caso("sito spento → fondamenta spente (la scheda non conta)", fondamentaAccese(conSito("spento")) === false);
caso("sito attivo o sospeso → fondamenta accese", fondamentaAccese(conSito("attivo")) && fondamentaAccese(conSito("sospeso")));
caso("senza campo → fondamenta spente", fondamentaAccese(leggiTraffico({})) === false);
caso("ciclo: solo attivo", cicloAttivo(conSito("attivo"), "sito") && !cicloAttivo(conSito("sospeso"), "sito") && !cicloAttivo(conSito("spento"), "sito"));
caso("ciclo: per servizio indipendente", cicloAttivo(conSito("spento"), "scheda") && !cicloAttivo(conSito("spento"), "sito"));

console.log("\nfraseDate:");
const d = (iso: string) => iso.slice(0, 10);
caso("spento → Mai attivato", fraseDate({ stato: "spento" }, d) === "Mai attivato");
caso("attivo la prima volta → solo «Attivo dal»", fraseDate(att.sito, d) === "Attivo dal 2026-09-14", fraseDate(att.sito, d));
caso("sospeso → dal + prima attivazione", fraseDate(sosp.sito, d) === "Sospeso dal 2026-09-20 · prima attivazione 2026-09-14", fraseDate(sosp.sito, d));
caso(
  "riattivato → dal + prima attivazione + ultima sospensione",
  fraseDate(riatt.sito, d) === "Attivo dal 2026-10-01 · prima attivazione 2026-09-14 · ultima sospensione 2026-09-20",
  fraseDate(riatt.sito, d),
);
caso(
  "risospeso → dal + prima attivazione + ultima riattivazione",
  fraseDate(risosp.sito, d) === "Sospeso dal 2026-10-15 · prima attivazione 2026-09-14 · ultima riattivazione 2026-10-01",
  fraseDate(risosp.sito, d),
);

// Stesso giorno: Attiva, Sospendi, Riattiva, Sospendi il 14/09 a ore diverse → una data sola.
const G = (ora: string) => `2026-09-14T${ora}:00:00.000Z`;
const giornata = passa(passa(passa(SPENTI, "sito", "attivo", G("08")), "sito", "sospeso", G("09")), "sito", "attivo", G("10"));
caso("stesso giorno, riattivato → «Attivo dal» senza ripetere la data", fraseDate(giornata.sito, d) === "Attivo dal 2026-09-14", fraseDate(giornata.sito, d));
const giornata2 = passa(giornata, "sito", "sospeso", G("11"));
caso("stesso giorno, risospeso → «Sospeso dal» senza ripetere la data", fraseDate(giornata2.sito, d) === "Sospeso dal 2026-09-14", fraseDate(giornata2.sito, d));
const misto = passa(passa(passa(SPENTI, "sito", "attivo", G("08")), "sito", "sospeso", G("09")), "sito", "attivo", T1);
caso("sospeso lo stesso giorno della prima attivazione → la data compare una volta", fraseDate(misto.sito, d) === "Attivo dal 2026-09-20 · prima attivazione 2026-09-14", fraseDate(misto.sito, d));

// Date ritoccate a mano in formato non ISO: con il formattatore vero, mai «Invalid Date».
const vera = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
caso("dataValida: ISO sì; gg/mm/aaaa, testo, vuoto e assente no", dataValida(T0) && dataValida("2026-09-14") && !dataValida("14/09/2026") && !dataValida("01/09/2026") && !dataValida("ieri") && !dataValida("") && !dataValida(undefined));
caso("attivo dal non ISO → «Attivo»", fraseDate({ stato: "attivo", attivatoAt: "14/09/2026" }, vera) === "Attivo", fraseDate({ stato: "attivo", attivatoAt: "14/09/2026" }, vera));
const sporco = fraseDate({ stato: "sospeso", primaAttivazioneAt: "14/09/2026", attivatoAt: "14/09/2026", sospesoAt: T1 }, vera);
caso("sospeso con prima attivazione non ISO → la data illeggibile si omette", sporco === `Sospeso dal ${vera(T1)}` && !sporco.includes("Invalid"), sporco);
caso("spento con prima attivazione non ISO → «Spento», mai «Mai attivato»", fraseDate({ stato: "spento", primaAttivazioneAt: "ieri" }, vera) === "Spento");

console.log(`\n${passati} passati, ${falliti} falliti`);
if (falliti) process.exit(1);
