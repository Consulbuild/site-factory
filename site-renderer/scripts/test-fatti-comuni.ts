// Banco di prova dei fatti comunali (piano T6a §8), senza rete: estratti verbatim delle fonti
// registrati qui sotto (fonte e data accanto a ciascuno) e, per i valori dei 5 comuni di prova,
// il dataset committato data/comuni-fatti.json.
//
//   cd site-renderer && node --experimental-strip-types scripts/test-fatti-comuni.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aggiorna,
  abbinaDpr412,
  areaCentroide,
  confrontaDataset,
  correggiSigleOcr,
  distanzaNomi,
  daWindows1252,
  FONTI,
  leggiCsv,
  leggiDbf,
  leggiDpr412,
  leggiManifest,
  leggiPosas,
  leggiSardegna,
  leggiShp,
  leggiSismica,
  leggiVariazioni,
  PERCORSO_DATASET,
  BUDGET_DATASET_BYTE,
  portaAl2026,
  preparaCache,
  puntoDentro,
  puntoInterno,
  riferimento,
  serializzaDataset,
  sha256File,
  Territorio,
  utmInWgs84,
  zonaDaGradiGiorno,
  type ComuneAnagrafica,
  type IdFonte,
  type Poligono,
  type VoceManifest,
} from "./fatti-comuni.ts";
import {
  cercaComune,
  comuniEntroKm,
  distanzaKm,
  fattiComune,
  formatoIntero,
  formatoQuota,
  frasiFatto,
  quota,
  type DatasetFattiComuni,
} from "../src/lib/fatti-comuni.ts";

let passati = 0;
let falliti = 0;
const nonVerificabili: string[] = [];
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}
function lancia(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
const vicino = (a: number, b: number, tolleranza: number) => Math.abs(a - b) <= tolleranza;

/* ---------- estratti verbatim ---------- */

// Istat, Variazioni amministrative e territoriali dal 1991 (zip del 09/01/2025, sha256 222fa3cc…),
// CSV «;» in windows-1252 con CRLF; la riga di Grana Monferrato ha un campo tra virgolette su due righe.
const TESTA_VARIAZIONI =
  "Anno;Tipo variazione;Codice Regione;Codice Unità territoriale sovracomunale;Codice Comune formato alfanumerico;Denominazione Comune;Codice Regione associato alla variazione;Codice Unità territoriale sovracomunale associato alla variazione;Codice del Comune associato alla variazione o nuovo codice Istat del Comune ;Denominazione Comune associata alla variazione o nuova denominazione;Provvedimento e Documento;Contenuto del provvedimento;Data decorrenza validità amministrativa;Flag_note";
const RIGHE_VARIAZIONI = [
  `1991;CD;02;007;007064;Saint-Rhémy;02;007;007064;Saint-Rhémy-en-Bosses;"Legge Regionale 30 luglio 1991, n.27; B.U.R. n.35 del 6 agosto 1991";Assunta la nuova denominazione di Saint-Rhémy-en-Bosses;;`,
  `2009;AP;03;015;015149;Monza;03;108;108033;;"Legge 11 giugno 2004, n. 146; G.U. n. 138 del 15 giugno 2004";Comune della Provincia di Milano andato a costituire la nuova Provincia di Monza e della Brianza;30/06/2009;`,
  `2010;CE;03;016;016024;Bergamo;03;016;016150;Orio al Serio;Legge Regionale 25 gennaio 2010, n. 2: B.U.R. n. 4 del 29 gennaio 2010, 1° S.O.;Modificata la circoscrizione territoriale a seguito del distacco di una zona di territorio aggregata al Comune di Orio al Serio;13/02/2010;`,
  `2010;AQ;03;016;016150;Orio al Serio;03;016;016024;Bergamo;Legge Regionale 25 gennaio 2010, n. 2: B.U.R. n. 4 del 29 gennaio 2010, 1° S.O.;Modificata la circoscrizione territoriale a seguito dell'aggregazione di una zona di territorio staccata dal Comune di Bergamo;13/02/2010;`,
  ...["037004;Bazzano", "037018;Castello di Serravalle", "037023;Crespellano", "037043;Monteveglio", "037058;Savigno"].map(
    (p) => `2014;CS;08;037;037061;Valsamoggia;08;037;${p};"Legge Regionale 7 febbraio 2013, n. 1; Parte Prima del B.U.R. n. 27 del 7 febbraio 2013";Nuovo Comune costituito mediante fusione dei Comuni di Bazzano, Castello di Serravalle, Crespellano, Monteveglio e Savigno ;01/01/2014;`,
  ),
  `2014;ES;08;037;037004;Bazzano;08;037;037061;Valsamoggia;"Legge Regionale 7 febbraio 2013, n. 1; Parte Prima del B.U.R. n. 27 del 7 febbraio 2013";Soppresso ed unitamente ai Comuni di Castello di Serravalle, Crespellano, Monteveglio e Savigno passa a costituire il nuovo Comune di Valsamoggia;01/01/2014;`,
  `2014;ES;08;037;037018;Castello di Serravalle;08;037;037061;Valsamoggia;"Legge Regionale 7 febbraio 2013, n. 1; Parte Prima del B.U.R. n. 27 del 7 febbraio 2013";Soppresso ed unitamente ai Comuni di Bazzano, Crespellano, Monteveglio e Savigno passa a costituire il nuovo Comune di Valsamoggia;01/01/2014;`,
  `2014;ES;08;037;037023;Crespellano;08;037;037061;Valsamoggia;"Legge Regionale 7 febbraio 2013, n. 1; Parte Prima del B.U.R. n. 27 del 7 febbraio 2013";Soppresso ed unitamente ai Comuni di Bazzano, Castello di Serravalle, Monteveglio e Savigno passa a costituire il nuovo Comune di Valsamoggia;01/01/2014;`,
  `2014;ES;08;037;037043;Monteveglio;08;037;037061;Valsamoggia;"Legge Regionale 7 febbraio 2013, n. 1; Parte Prima del B.U.R. n. 27 del 7 febbraio 2013";Soppresso ed unitamente ai Comuni di Bazzano, Castello di Serravalle, Crespellano e Savigno passa a costituire il nuovo Comune di Valsamoggia;01/01/2014;`,
  `2014;ES;08;037;037058;Savigno;08;037;037061;Valsamoggia;"Legge Regionale 7 febbraio 2013, n. 1; Parte Prima del B.U.R. n. 27 del 7 febbraio 2013";Soppresso ed unitamente ai Comuni di Bazzano, Castello di Serravalle, Crespellano e Monteveglio passa a costituire il nuovo Comune di Valsamoggia;01/01/2014;`,
  `2014;CS;03;020;020071;Borgo Virgilio;03;020;020069;Virgilio;"Legge Regionale 30 gennaio 2014, n. 9; Suppl. n. 6 al B.U. del 3 febbraio 2014";Nuovo Comune costituito mediante fusione dei Comuni di Virgilio e Borgoforte;04/02/2014;`,
  `2014;CS;03;020;020071;Borgo Virgilio;03;020;020005;Borgoforte;"Legge Regionale 30 gennaio 2014, n. 9; Suppl. n. 6 al B.U. del 3 febbraio 2014";Nuovo Comune costituito mediante fusione dei Comuni di Virgilio e Borgoforte;04/02/2014;`,
  `2014;ES;03;020;020069;Virgilio;03;020;020071;Borgo Virgilio;"Legge Regionale 30 gennaio 2014, n. 9; Suppl. n. 6 al B.U. del 3 febbraio 2014";Soppresso e unitamente al Comune di Borgoforte passa a costituire il nuovo Comune di Borgo Virgilio;04/02/2014;`,
  `2014;ES;03;020;020005;Borgoforte;03;020;020071;Borgo Virgilio;"Legge Regionale 30 gennaio 2014, n. 9; Suppl. n. 6 al B.U. del 3 febbraio 2014";Soppresso e unitamente al Comune di Virgilio passa a costituire il nuovo Comune di Borgo Virgilio;04/02/2014;`,
  `2015;ES;03;014;014042;Menarola;03;014;014032;Gordona;"Legge Regionale 6 novembre 2015, n. 35; Suppl. al B.U.R.L. n. 46 del 10 novembre 2015";Soppresso e aggregato alla circoscrizione territoriale del Comune di Gordona;25/11/2015;`,
  `2015;AQES;03;014;014032;Gordona;03;014;014042;Menarola;"Legge Regionale 6 novembre 2015, n. 35; Suppl. al B.U.R.L. n. 46 del 10 novembre 2015";Modificata la circoscrizione territoriale a seguito dellaggregazione del territorio del soppresso Comune di Menarola;25/11/2015;`,
  `2023;CD;01;005;005056;Grana;01;005;005056;Grana Monferrato;"Deliberazione della Giunta comunale di presa datto della modifica del 17 gennaio 2023, n 2 e Delibera del Consiglio della Regione Piemonte del 29 novembre 2022, n. 252-23658, \r\npubblicata sul Suppl. ord. n. 1 al B.U. n. 50 del 15 dicembre 2022";Assunta la nuova denominazione di Grana Monferrato;17/01/2023;`,
  `2024;CS;05;024;024128;Sovizzo;05;024;024044;Gambugliano;"Legge Regionale 29 dicembre 2023, n. 33; B.U.R. n. 171 del 29 dicembre 2023";Istituito il Comune di Sovizzo mediante fusione dei Comuni di Sovizzo e Gambugliano;22/01/2024;`,
  `2024;CS;05;024;024128;Sovizzo;05;024;024103;Sovizzo;"Legge Regionale 29 dicembre 2023, n. 33; B.U.R. n. 171 del 29 dicembre 2023";Istituito il Comune di Sovizzo mediante fusione dei Comuni di Sovizzo e Gambugliano;22/01/2024;`,
  `2024;ES;05;024;024044;Gambugliano;05;024;024128;Sovizzo;"Legge Regionale 29 dicembre 2023, n. 33; B.U.R. n. 171 del 29 dicembre 2023";Istituito il Comune di Sovizzo mediante fusione dei Comuni di Sovizzo e Gambugliano;22/01/2024;`,
  `2024;ES;05;024;024103;Sovizzo;05;024;024128;Sovizzo;"Legge Regionale 29 dicembre 2023, n. 33; B.U.R. n. 171 del 29 dicembre 2023";Istituito il Comune di Sovizzo mediante fusione dei Comuni di Sovizzo e Gambugliano;22/01/2024;`,
  `2024;CE;03;020;020071;Borgo Virgilio;03;020;020003;Bagnolo San Vito;"Legge Regionale 30 gennaio 2024, n. 2; Supplemento al B.U.R. n. 5 del 2 febbraio 2024";Distacco di zone di territorio dal Comune di Borgo Virgilio e relativa aggregazione al Comune di Bagnolo San Vito;17/02/2024;`,
  `2024;AQ;03;020;020003;Bagnolo San Vito;03;020;020071;Borgo Virgilio;"Legge Regionale 30 gennaio 2024, n. 2; Supplemento al B.U.R. n. 5 del 2 febbraio 2024";Distacco di zone di territorio dal Comune di Borgo Virgilio e relativa aggregazione al Comune di Bagnolo San Vito;17/02/2024;`,
  `2024;AQ;03;016;016150;Orio al Serio;03;016;016024;Bergamo;"Legge Regionale 3 aprile 2024, n. 6; Supplemento al B.U.R. n. 14 del 5 aprile 2024";Distacco di zone di territorio dal Comune di Bergamo e relativa aggregazione al Comune di Orio al Serio;18/04/2024;`,
  `2024;CE;03;016;016024;Bergamo;03;016;016150;Orio al Serio;"Legge Regionale 3 aprile 2024, n. 6; Supplemento al B.U.R. n. 14 del 5 aprile 2024";Distacco di zone di territorio dal Comune di Bergamo e relativa aggregazione al Comune di Orio al Serio;18/04/2024;`,
];
const CSV_VARIAZIONI = Buffer.from([TESTA_VARIAZIONI, ...RIGHE_VARIAZIONI, ""].join("\r\n"), "latin1");

// Istat, Codici statistici delle unità amministrative della Sardegna dal 1/1/2026 (zip del 04/08/2025,
// sha256 6fb4b421…): titolo, intestazione su più righe tra virgolette, prima riga dati.
const CSV_SARDEGNA = Buffer.from(
  'Codici statistici e denominazioni delle unità amministrative rispondenti ai nuovi assetti territoriali della Sardegna. In vigore dal 1° gennaio 2026;;;;;;\r\n' +
    '"Denominazione Provincia/\nCittà metropolitana";"Codice Provincia/\nCittà metropolitana";Codice Comune;Denominazione Comune;Codice Comune precedente;"Codice Provincia/\nCittà metropolitana precedente";"Denominazione Provincia/\nCittà metropolitana\n(ripartizione precedente)"\r\n' +
    "Città metropolitana di Sassari;312;112001;Alghero;090003;090;Provincia di Sassari\r\n",
  "latin1",
);

// Gazzetta Ufficiale, DPR 412/1993 allegato A, frammenti del 14/09/2026 (sha256 c9a22e4d…, fa0705b8…):
// righe verbatim, con zeri resi «O» dall'OCR; l'apostrofo di Cassina è qui come entità per provare la decodifica.
const HTML_DPR412 = `<span class="dettaglio_atto_testo"><pre>                           ALLEGATO A
pr z gr-g alt comune
MI E 2404 131 COLOGNO MONZESE
MI E 2404 130 CASSINA DE&#39; PECCHI
AT F 2698 257 CUNICO
AP E 21O2 395 ROTELLA
AR E 2234 42O PRATOVECCHIO
BG E 2386 348 CASTRO
LE C 1161 98 CASTRO
MI E 2404 162 MONZA
VI E 2380 44 SOVIZZO
AO F 4511 1519 SAINT RHEMY
VI E 2429 147 THIENNE
BN C 1170 55 TELESE
BG E 2383 133 CORTENOVA
SS D 1500 100 CASTRO
Note: all'interno di ciascuna provincia i comuni sono elencati
</pre></span>`;

/* ---------- geometria ---------- */

console.log("\nGeometria:");
{
  // anelli esterni in senso orario (convenzione shapefile), buchi antiorari
  const anello = (...p: [number, number][]) => new Float64Array(p.flat());
  const u: Poligono = { anelli: [anello([0, 0], [0, 10], [2, 10], [2, 2], [8, 2], [8, 10], [10, 10], [10, 0], [0, 0])] };
  const cu = areaCentroide(u);
  caso("U: area 52 e centroide fuori dal poligono", cu.area === 52 && !puntoDentro(u, cu.x, cu.y), cu);
  const pu = puntoInterno(u);
  caso("U: punto interno dentro, sul segmento più lungo dell'orizzontale", pu.spostato && puntoDentro(u, pu.x, pu.y) && vicino(pu.x, 1, 1e-9), pu);
  const buco: Poligono = { anelli: [anello([0, 0], [0, 10], [10, 10], [10, 0], [0, 0]), anello([4, 4], [6, 4], [6, 6], [4, 6], [4, 4])] };
  const pb = puntoInterno(buco);
  caso("poligono con buco: area 96, punto fuori dal buco", pb.area === 96 && puntoDentro(buco, pb.x, pb.y) && !(pb.x > 4 && pb.x < 6 && pb.y > 4 && pb.y < 6), pb);
  const dueParti: Poligono = { anelli: [anello([0, 0], [0, 1], [1, 1], [1, 0], [0, 0]), anello([9, 0], [9, 1], [10, 1], [10, 0], [9, 0])] };
  const pd = puntoInterno(dueParti);
  caso("poligono in due parti: punto dentro una delle parti", pd.spostato && puntoDentro(dueParti, pd.x, pd.y), pd);
  const pieno: Poligono = { anelli: [anello([0, 0], [0, 1000], [1000, 1000], [1000, 0], [0, 0])] };
  const pp = puntoInterno(pieno);
  caso("quadrato: centroide esatto, non spostato", !pp.spostato && pp.x === 500 && pp.y === 500, pp);
  const [lat, lon] = utmInWgs84(500000, 4982950.4);
  caso("UTM 32N (500000; 4982950,4) → (45°; 9°) entro 1e-6", vicino(lat, 45, 1e-6) && vicino(lon, 9, 1e-6), [lat, lon]);
  const [lat2, lon2] = utmInWgs84(501000, 4982950.4);
  const a = 6378137;
  const e2 = 0.00669437999014;
  const phi = (lat * Math.PI) / 180;
  const metri = ((a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2)) * Math.cos(phi) * ((lon2 - lon) * Math.PI)) / 180;
  caso("1.000 m di griglia sul meridiano centrale ≈ 1.000,4 m sull'ellissoide (k0 = 0,9996)", vicino(metri, 1000.4, 0.05) && vicino(lat2, lat, 1e-5), metri);
}

/* ---------- formati ---------- */

console.log("\nFormati:");
{
  const righe = leggiCsv('﻿a;"b;c"\r\n"x\ny";"con ""virgolette"""\n', ";");
  caso("CSV: BOM, separatore tra virgolette, campo su due righe, virgolette raddoppiate", JSON.stringify(righe) === JSON.stringify([["a", "b;c"], ["x\ny", 'con "virgolette"']]), righe);
  caso("CSV: virgolette non chiuse → errore", lancia(() => leggiCsv('a;"b\n', ";")) !== null);

  // DBF minimo costruito qui: 1 record con testo UTF-8
  const campi = [
    { nome: "PRO_COM_T", lunghezza: 6 },
    { nome: "COMUNE", lunghezza: 20 },
  ];
  const testa = 32 + 32 * campi.length + 1;
  const lunghezzaRiga = 1 + campi.reduce((s, c) => s + c.lunghezza, 0);
  const dbf = Buffer.alloc(testa + lunghezzaRiga + 1, 0x20);
  dbf.fill(0, 0, testa);
  dbf.writeUInt8(3, 0);
  dbf.writeUInt32LE(1, 4);
  dbf.writeUInt16LE(testa, 8);
  dbf.writeUInt16LE(lunghezzaRiga, 10);
  campi.forEach((c, i) => {
    dbf.write(c.nome, 32 + 32 * i, "latin1");
    dbf.writeUInt8(0x43, 32 + 32 * i + 11);
    dbf.writeUInt8(c.lunghezza, 32 + 32 * i + 16);
  });
  dbf.writeUInt8(0x0d, testa - 1);
  dbf.write(" 001001", testa, "latin1");
  dbf.write("Agliè", testa + 7, "utf8");
  dbf.writeUInt8(0x1a, testa + lunghezzaRiga);
  const r = leggiDbf(dbf, "prova");
  caso("DBF: record e testo UTF-8 («Agliè»)", r.length === 1 && r[0]!.PRO_COM_T === "001001" && r[0]!.COMUNE === "Agliè", r);

  // SHP minimo: un poligono quadrato 0..10
  const punti = [0, 0, 0, 10, 10, 10, 10, 0, 0, 0];
  const contenuto = 44 + 4 + 16 * 5;
  const shp = Buffer.alloc(100 + 8 + contenuto);
  shp.writeInt32BE(9994, 0);
  shp.writeInt32BE(shp.length / 2, 24);
  shp.writeInt32LE(1000, 28);
  shp.writeInt32LE(5, 32);
  shp.writeInt32BE(1, 100);
  shp.writeInt32BE(contenuto / 2, 104);
  shp.writeInt32LE(5, 108);
  shp.writeInt32LE(1, 108 + 36);
  shp.writeInt32LE(5, 108 + 40);
  shp.writeInt32LE(0, 108 + 44);
  punti.forEach((v, i) => shp.writeDoubleLE(v, 108 + 48 + 8 * i));
  const poligoni = leggiShp(shp, "prova");
  caso("SHP: un poligono, un anello di 5 punti", poligoni.length === 1 && poligoni[0]!.anelli[0]!.length === 10 && areaCentroide(poligoni[0]!).area === 100, poligoni);
  shp.writeInt32LE(1, 32);
  caso("SHP: tipo diverso da poligono → errore", lancia(() => leggiShp(shp, "prova"))?.includes("tipo 5") === true);

  const minimo = {
    schema: 1,
    generatoIl: "2026-09-14T00:00:00.000Z",
    riferimentoTerritoriale: "2026-01-01",
    completo: true,
    fontiMancanti: [],
    fonti: {},
    fatti: {},
    copertura: { comuni: 2 },
    scarti: {},
    alias: { "090003": { a: "112001", motivo: "cambio_codice", dal: "2026-01-01" } },
    comuni: {
      "015081": { nome: "Cologno Monzese", sigla: "MI", centro: [45.5333, 9.2802], raggioKm: 1.65 },
      "112001": { nome: "Alghero", sigla: "SS", centro: [40.5998, 8.2989], raggioKm: 8.47 },
    },
  } as unknown as DatasetFattiComuni;
  const testo = serializzaDataset(minimo);
  const righeComuni = testo.split("\n").filter((l) => /^ {4}"\d{6}": \{/.test(l));
  caso("serializzazione: JSON valido, un comune e un alias per riga", JSON.stringify(JSON.parse(testo)) === JSON.stringify(minimo) && righeComuni.length === 3, righeComuni);
  const modificato = structuredClone(minimo);
  modificato.comuni["015081"]!.popolazione = 46994;
  const diff = confrontaDataset(minimo, modificato);
  caso("report di diff: conta i valori cambiati per campo", diff.some((l) => l.includes("popolazione: 1 comuni cambiati")), diff);
}

/* ---------- variazioni ---------- */

console.log("\nVariazioni:");
const variazioni = leggiVariazioni(daWindows1252(CSV_VARIAZIONI));
const sarde = leggiSardegna(daWindows1252(CSV_SARDEGNA));
const CODICI_2026 = new Set(["015081", "108033", "016024", "016150", "037061", "020071", "020003", "014032", "005056", "024128", "112001", "015060", "016065", "075096"]);
const territorio = new Territorio([...variazioni, ...sarde], CODICI_2026);
const nomeStorico = (c: string) => variazioni.find((v) => v.codice === c)?.nome ?? c;
const R2011 = riferimento("2011-10-09");
const R2025 = riferimento("2025-01-01");
const somma = (v: number[]) => v.reduce((a, b) => a + b, 0);
{
  const grana = variazioni.find((v) => v.tipo === "CD" && v.codice === "005056");
  caso(
    "CSV variazioni: windows-1252, CRLF, campo su due righe (Grana → Grana Monferrato)",
    variazioni.length === RIGHE_VARIAZIONI.length && grana?.nome === "Grana" && grana.nomeAssociato === "Grana Monferrato" && grana.chiave === "2023-01-17",
    grana,
  );
  caso("tabella sarda: 090003 → 112001 come cambio di codice al 1/1/2026", sarde.length === 1 && sarde[0]!.codice === "090003" && sarde[0]!.codiceAssociato === "112001" && sarde[0]!.chiave === "2026-01-01", sarde);
  caso("intestazione variazioni cambiata → errore leggibile", lancia(() => leggiVariazioni("Anno;Tipo;x\r\n"))?.includes("colonna") === true);

  const edifici = new Map([
    ["037004", [10, 20]],
    ["037018", [1, 2]],
    ["037023", [100, 200]],
    ["037043", [1000, 2000]],
    ["037058", [5, 5]],
  ]);
  const sommaVettori = (v: number[][]) => v[0]!.map((_, i) => somma(v.map((x) => x[i]!)));
  const valsa = portaAl2026(territorio, edifici, R2011, { additivo: true, somma: sommaVettori, nomeStorico });
  const v = valsa.valori.get("037061");
  caso(
    "fusione integrale (Valsamoggia 2014): somma dei 5 comuni d'origine con derivazione dichiarata",
    JSON.stringify(v?.valore) === "[1116,2227]" && v?.derivazione?.regola === "somma_fusione" && v.derivazione.da.join() === "037004,037018,037023,037043,037058" && v.derivazione.nomi[0] === "Bazzano" && valsa.errori.length === 0,
    v,
  );
  const senzaUno = new Map(edifici);
  senzaUno.delete("037058");
  const parziale = portaAl2026(territorio, senzaUno, R2011, { additivo: true, somma: sommaVettori, nomeStorico });
  caso("fusione con un'origine senza dato → nessun fatto, scarto dichiarato", !parziale.valori.has("037061") && parziale.scarti.origine_senza_dato?.[0]?.startsWith("037061") === true, parziale.scarti);
  const sismicaFusa = portaAl2026(territorio, new Map([["037004", "3"], ["037018", "3"], ["037023", "3"], ["037043", "3"], ["037058", "3"]]), R2011, { additivo: false, nomeStorico });
  caso("fatto non additivo di comuni poi fusi → mai derivato", !sismicaFusa.valori.has("037061") && sismicaFusa.scarti.fusione_dopo_riferimento?.[0] === "037061", sismicaFusa.scarti);

  const bv = portaAl2026(territorio, new Map([["020069", 1], ["020005", 2], ["020003", 3]]), R2011, { additivo: true, somma, nomeStorico });
  caso(
    "fusione seguita da scambio parziale (Borgo Virgilio 2014 → Bagnolo San Vito 2024): nessun fatto 2011 per entrambi",
    !bv.valori.has("020071") && !bv.valori.has("020003") && bv.scarti.scambio_parziale?.join() === "020003,020071",
    bv,
  );
  const bv2025 = portaAl2026(territorio, new Map([["020071", 15137], ["020003", 5950]]), R2025, { additivo: true, somma, nomeStorico });
  caso("stesso comune con fonte del 2025: fatti presenti", bv2025.valori.get("020071")?.valore === 15137 && bv2025.valori.get("020003")?.valore === 5950, bv2025);

  const gordona = portaAl2026(territorio, new Map([["014032", 1800], ["014042", 40]]), R2011, { additivo: true, somma, nomeStorico });
  caso("incorporazione (Gordona ← Menarola 2015): il comune che incorpora somma il soppresso", gordona.valori.get("014032")?.valore === 1840 && gordona.valori.get("014032")?.derivazione?.da.join() === "014032,014042", gordona);
  const gordonaSola = portaAl2026(territorio, new Map([["014032", 1800]]), R2011, { additivo: true, somma, nomeStorico });
  caso("incorporazione senza il dato del soppresso → nessun fatto", !gordonaSola.valori.has("014032"), gordonaSola);

  const bg = portaAl2026(territorio, new Map([["016024", 100], ["016150", 10]]), R2011, { additivo: true, somma, nomeStorico });
  caso("scambio parziale puro (Bergamo/Orio al Serio 2024): fatti 2011 assenti per entrambi", bg.valori.size === 0 && bg.scarti.scambio_parziale?.length === 2, bg);
  const bg2021 = portaAl2026(territorio, new Map([["016024", 100], ["016150", 10]]), riferimento("2021-12-31"), { additivo: true, somma, nomeStorico });
  caso("… anche per un fatto del 2021", bg2021.valori.size === 0, bg2021);

  const alghero = portaAl2026(territorio, new Map([["090003", "4"]]), riferimento("2025-05-31"), { additivo: false, nomeStorico });
  const alias = territorio.alias();
  caso("cambio codice sardo: dato di 090003 sul record 112001, alias cambio_codice", alghero.valori.get("112001")?.valore === "4" && alias.get("090003")?.a === "112001" && alias.get("090003")?.motivo === "cambio_codice", [alghero, alias.get("090003")]);
  caso("alias di un comune soppresso per fusione (Menarola → Gordona)", alias.get("014042")?.a === "014032" && alias.get("014042")?.motivo === "fusione", alias.get("014042"));
  caso("alias di un cambio di provincia (Monza 015149 → 108033)", alias.get("015149")?.a === "108033" && alias.get("015149")?.motivo === "cambio_codice", alias.get("015149"));

  const ignoto = portaAl2026(territorio, new Map([["999999", 1]]), R2011, { additivo: true, somma, nomeStorico });
  caso("gate di chiusura: codice che non si risolve → errore", ignoto.errori.length === 1 && ignoto.errori[0]!.includes("999999"), ignoto.errori);
  const nato = portaAl2026(territorio, new Map([["024128", 1]]), R2011, { additivo: true, somma, nomeStorico });
  caso("gate: codice nato dopo il riferimento della fonte → errore (data territoriale sbagliata)", nato.errori.length === 1 && nato.errori[0]!.includes("non esisteva"), nato.errori);
}

/* ---------- DPR 412/1993 ---------- */

console.log("\nDPR 412/1993 allegato A:");
{
  const righe = leggiDpr412(HTML_DPR412);
  caso("righe tabellari estratte, intestazione e note ignorate", righe.length === 14, righe.map((r) => r.testo));
  const rotella = righe.find((r) => r.nome === "ROTELLA");
  const prato = righe.find((r) => r.nome === "PRATOVECCHIO");
  caso("zeri OCR: 21O2 → 2102, 42O → 420", rotella?.gradiGiorno === 2102 && rotella.zeriOcr && prato?.altitudine === 420, [rotella, prato]);
  caso("entità HTML nel nome: CASSINA DE' PECCHI", righe.some((r) => r.nome === "CASSINA DE' PECCHI"));
  caso("soglie art. 2 c. 1: 600 → A, 601 → B, 2100 → D, 3001 → F", zonaDaGradiGiorno(600) === "A" && zonaDaGradiGiorno(601) === "B" && zonaDaGradiGiorno(2100) === "D" && zonaDaGradiGiorno(3001) === "F");

  const anagrafica = new Map<string, ComuneAnagrafica>(
    [
      ["015081", "Cologno Monzese", "MI"],
      ["015060", "Cassina de' Pecchi", "MI"],
      ["016065", "Castro", "BG"],
      ["075096", "Castro", "LE"],
      ["108033", "Monza", "MB"],
      ["024128", "Sovizzo", "VI"],
      ["007064", "Saint-Rhémy-en-Bosses", "AO"],
      ["024105", "Thiene", "VI"],
      ["062074", "Telese Terme", "BN"],
      ["016083", "Cortenuova", "BG"],
      ["097025", "Cortenova", "LC"],
    ].map(([codice, nome, sigla]) => [codice!, { codice: codice!, nome: nome!, sigla: sigla! }]),
  );
  const sigle = new Map([["015", ["MI"]], ["016", ["BG"]], ["075", ["LE"]], ["108", ["MB"]], ["024", ["VI"]], ["007", ["AO"]], ["062", ["BN"]], ["097", ["LC"]]]);
  const { clima, scarti, approssimati } = abbinaDpr412(righe, anagrafica, territorio, sigle);
  caso("Cologno Monzese abbinato: E, 2.404 GG, 131 m", JSON.stringify(clima.get("015081")) === '["E",2404,131]', clima.get("015081"));
  caso("Cassina de' Pecchi abbinato senza badare ad apostrofi", JSON.stringify(clima.get("015060")) === '["E",2404,130]');
  caso("coerenza: «AT F 2698 257 CUNICO» → scarto zona_incoerente", scarti.zona_incoerente?.join() === "AT F 2698 257 CUNICO", scarti);
  caso("omonimi risolti con la sigla: Castro BG e Castro LE", clima.get("016065")?.[1] === 2386 && clima.get("075096")?.[1] === 1161, [clima.get("016065"), clima.get("075096")]);
  caso("omonimo senza sigla utile (SS CASTRO) → non emesso", scarti.sigla_diversa?.join() === "SS D 1500 100 CASTRO" && ![...clima.values()].some((v) => v[1] === 1500), scarti);
  caso("provincia cambiata: «MI … MONZA» → Monza (MB) via il codice storico 015149", JSON.stringify(clima.get("108033")) === '["E",2404,162]', clima.get("108033"));
  caso("comune nato da fusione dopo il 1993 (Sovizzo 024128): nessuna zona benché il nome coincida", !clima.has("024128") && scarti.comune_nato_dopo_1993?.[0]?.startsWith("024128") === true, scarti);
  caso("zeri OCR nel nome: «PATERN0'» → PATERNO'", leggiDpr412("CT C 1087 225 PATERN0'")[0]?.nome === "PATERNO'");
  const ocr = correggiSigleOcr(leggiDpr412("MT D 1837 515 GRASSANO\nMT D 1787 481 GROTTOLE\nMR D 1885 548 IRSINA\nMT D 1418 200 MATERA\nFO E 2789 492 BAGNO DI ROMAGNA"));
  caso("sigla OCR isolata tra righe della stessa provincia: MR → MT; FO in coda non si tocca", ocr.righe[2]?.sigla === "MT" && ocr.righe[4]?.sigla === "FO" && ocr.correzioni.length === 1, ocr.correzioni);
  caso("distanza fra nomi: trasposizione = 1, due modifiche = 2", distanzaNomi("PIORINO", "POIRINO") === 1 && distanzaNomi("THIENNE", "THIENE") === 1 && distanzaNomi("ISOLA DI BARI", "MOLA DI BARI") === 2);
  caso("riga senza un comune di quel nome nell'anagrafica (Rotella) → non_trovato",scarti.non_trovato?.includes("AP E 21O2 395 ROTELLA") === true, scarti.non_trovato);
  caso("nome già cambiato prima del 1993 (CD 1991): «SAINT RHEMY» → Saint-Rhémy-en-Bosses", clima.get("007064")?.[1] === 4511, clima.get("007064"));
  caso("una lettera di differenza, stessa provincia: «THIENNE» → Thiene, dichiarato", clima.get("024105")?.[1] === 2429 && approssimati.una_lettera?.some((v) => v.startsWith("024105 Thiene ← ")) === true, approssimati);
  caso("inizio del nome a parola intera: «TELESE» → Telese Terme, dichiarato", clima.get("062074")?.[1] === 1170 && approssimati.inizio_del_nome?.[0]?.startsWith("062074") === true, approssimati);
  caso("nome esistente solo in un'altra provincia: «BG … CORTENOVA» → Cortenuova (BG), non Cortenova (LC)", clima.get("016083")?.[1] === 2383 && !clima.has("097025"), [clima.get("016083"), clima.get("097025")]);
  caso("il secondo passaggio non tocca comuni già abbinati esattamente né nati dopo il 1993", !approssimati.una_lettera?.some((v) => v.startsWith("015081") || v.startsWith("024128")));
  const cunico = abbinaDpr412(leggiDpr412("AT F 2698 257 CUNICO\nAT E 2600 300 CUNIC"), new Map([["005051", { codice: "005051", nome: "Cunico", sigla: "AT" }]]), territorio, new Map([["005", ["AT"]]]));
  caso(
    "riga esatta scartata (zona incoerente): il secondo passaggio non dà a Cunico la riga «CUNIC» di un altro comune",
    !cunico.clima.has("005051") && cunico.scarti.zona_incoerente?.length === 1 && cunico.scarti.non_trovato?.join() === "AT E 2600 300 CUNIC",
    cunico,
  );
}

/* ---------- POSAS e sismica ---------- */

console.log("\nPOSAS e sismica:");
{
  // Istat, POSAS 2025 (zip del 30/01/2026, sha256 5f549156…): titolo, intestazione, righe di Abano Terme ridotte a 2 età
  const testa = '"Codice comune";"Comune";"Età";"Celibi";"Coniugati";"Divorziati";"Vedovi";"Uniti civilmente";"Maschi già in unione civile (per scioglimento unione)";"Maschi già in unione civile (per decesso del partner)";"Totale maschi";"Nubili";"Coniugate";"Divorziate";"Vedove";"Unite civilmente";"Femmine già in unione civile (per scioglimento unione)";"Femmine già in unione civile (per decesso del partner)";"Totale femmine";"Totale"';
  const corpo = ['"028001";"Abano Terme";0;57;0;0;0;0;0;0;57;48;0;0;0;0;0;0;48;105', '"028001";"Abano Terme";1;59;0;0;0;0;0;0;59;51;0;0;0;0;0;0;51;110'];
  const posas = (titolo: string, totale: number) => ["﻿" + titolo, testa, ...corpo, `"028001";"Abano Terme";999;116;0;0;0;;;;116;99;0;0;0;;;;99;${totale}`, ""].join("\n");
  const ok = leggiPosas(posas('"Popolazione residente per età, sesso e stato civile al 1° gennaio 2025"', 215), "1° gennaio 2025");
  caso("POSAS: totale dalla riga «Età 999» uguale alla somma delle età", ok.valori.get("028001") === 215, ok);
  caso("POSAS: totale diverso dalla somma → errore", lancia(() => leggiPosas(posas('"Popolazione residente per età, sesso e stato civile al 1° gennaio 2025"', 216), "1° gennaio 2025"))?.includes("somma") === true);
  caso("POSAS: titolo con «(stima)» rifiutato", lancia(() => leggiPosas(posas('"Popolazione residente per età, sesso e stato civile al 1° gennaio 2026 (stima)"', 215), "1° gennaio 2026"))?.includes("stimato") === true);

  // DPC, classificazione sismica maggio 2025 (sha256 89568b25…): BOM, CRLF, codici senza zeri iniziali
  const sismica = (zona: string) => `﻿REGIONE;PROV_CITTA_METROPOLITANA;SIGLA_PROV;COMUNE;COD_ISTAT_COMUNE;ZONA_SISMICA\r\nLombardia;Milano;MI;Cologno Monzese;15081;3\r\nLazio;Roma;RM;Roma;58091;${zona}\r\n`;
  const s = leggiSismica(sismica("2A-3A-3B"));
  caso("sismica: BOM rimosso, codice riempito a 6 cifre, «2A-3A-3B» verbatim", s.valori.get("015081") === "3" && s.valori.get("058091") === "2A-3A-3B", [...s.valori]);
  caso("sismica: zona «5» → errore di gate", lancia(() => leggiSismica(sismica("5")))?.includes("fuori formato") === true);
}

/* ---------- aggiornamento senza fonti ---------- */

console.log("\nAggiornamento:");
{
  const cartella = mkdtempSync(join(tmpdir(), "fatti-comuni-"));
  const dataset = join(cartella, "comuni-fatti.json");
  writeFileSync(dataset, '{"schema":1,"sentinella":true}\n');
  const log: string[] = [];
  const ok = await aggiorna({ cache: join(cartella, "cache"), dataset, offline: true, soloVerifica: false, parziale: false, log: (r) => log.push(r) });
  caso("--offline con fonti assenti: errore esplicito, dataset esistente intatto", !ok && readFileSync(dataset, "utf8").includes("sentinella") && log.some((r) => r.includes("aggiornamento fermato")), log.slice(-3));
  const okParziale = await aggiorna({ cache: join(cartella, "cache"), dataset, offline: true, soloVerifica: false, parziale: true, log: () => {} });
  caso("--parziale senza le fonti strutturali: nulla scritto", !okParziale && readFileSync(dataset, "utf8").includes("sentinella"));
  rmSync(cartella, { recursive: true, force: true });

  // cache con una copia buona di sismica e allegato A; la rete (finta) risponde HTTP 200 con una pagina d'errore a ogni URL
  const cache = mkdtempSync(join(tmpdir(), "fatti-comuni-cache-"));
  writeFileSync(join(cache, FONTI["dpc-sismica-2025"].file[0]!.nome), "﻿REGIONE;PROV_CITTA_METROPOLITANA;SIGLA_PROV;COMUNE;COD_ISTAT_COMUNE;ZONA_SISMICA\r\nLombardia;Milano;MI;Cologno Monzese;15081;3\r\n");
  FONTI["dpr412-allegato-a"].file.forEach((f, i) => writeFileSync(join(cache, f.nome), `<pre>\n${Array.from({ length: 2700 }, (_, k) => `MI E 2404 131 COMUNE ${i} ${k}`).join("\n")}\n</pre>`));
  const voce = (id: IdFonte): VoceManifest => ({
    stato: "ok",
    file: FONTI[id].file.map((f) => ({ nome: f.nome, url: f.url, sha256: sha256File(join(cache, f.nome)), byte: statSync(join(cache, f.nome)).size })),
    scaricatoIl: "2026-09-14T00:00:00.000Z",
    ultimoTentativo: "2026-09-14T00:00:00.000Z",
  });
  const buoni = { "dpc-sismica-2025": voce("dpc-sismica-2025"), "dpr412-allegato-a": voce("dpr412-allegato-a") };
  writeFileSync(join(cache, "manifest.json"), JSON.stringify(buoni));
  const fetchVera = globalThis.fetch;
  const reteGuasta = (async () => new Response("<html><body>Servizio temporaneamente non disponibile</body></html>", { status: 200 })) as typeof fetch;
  const logCache: string[] = [];
  globalThis.fetch = reteGuasta;
  try {
    await preparaCache(cache, false, (r) => logCache.push(r));
  } finally {
    globalThis.fetch = fetchVera;
  }
  const dopo = leggiManifest(cache);
  const intatta = (id: keyof typeof buoni) => dopo[id]?.stato === "ok" && dopo[id]!.file.every((f, i) => f.sha256 === buoni[id].file[i]!.sha256 && sha256File(join(cache, f.nome)) === f.sha256);
  caso(
    "HTTP 200 con pagina d'errore: sismica e allegato A (non zip) restano la copia buona in cache, nessun .part",
    intatta("dpc-sismica-2025") && intatta("dpr412-allegato-a") && logCache.filter((r) => r.includes("uso la copia in cache")).length === 2 && !readdirSync(cache).some((n) => n.endsWith(".part")),
    logCache,
  );
  caso("… e uno zip d'errore non entra in cache", dopo["istat-confini-2026"]?.stato === "non_raggiungibile" && !existsSync(join(cache, FONTI["istat-confini-2026"].file[0]!.nome)), dopo["istat-confini-2026"]);

  const urlVecchio = structuredClone(buoni);
  urlVecchio["dpc-sismica-2025"].file[0]!.url = "https://rischi.protezionecivile.gov.it/static/vecchio/classificazione-sismica.csv";
  writeFileSync(join(cache, "manifest.json"), JSON.stringify(urlVecchio));
  const offline = await preparaCache(cache, true, () => {});
  caso(
    "copia in cache scaricata da un URL diverso da quello attuale di FONTI → non usata; l'altra fonte sì",
    offline["dpc-sismica-2025"]?.stato === "non_raggiungibile" && offline["dpc-sismica-2025"].errore?.includes("URL") === true && offline["dpr412-allegato-a"]?.stato === "ok",
    offline["dpc-sismica-2025"],
  );

  const manifestPrima = readFileSync(join(cache, "manifest.json"), "utf8");
  mkdirSync(join(cache, "manifest.json.tmp")); // la scrittura del file temporaneo fallisce
  globalThis.fetch = reteGuasta;
  const guasto = await preparaCache(cache, false, () => {}).then(
    () => null,
    (e: unknown) => String(e),
  );
  globalThis.fetch = fetchVera;
  caso("scrittura del manifest fallita: il manifest precedente resta intero e leggibile", guasto !== null && readFileSync(join(cache, "manifest.json"), "utf8") === manifestPrima, guasto);

  // la sismica arriva valida e diversa, poi la scrittura del manifest subito dopo fallisce
  rmSync(join(cache, "manifest.json.tmp"), { recursive: true });
  writeFileSync(join(cache, "manifest.json"), JSON.stringify(buoni));
  const csvSismica = join(cache, FONTI["dpc-sismica-2025"].file[0]!.nome);
  globalThis.fetch = (async (url: string) => {
    if (url !== FONTI["dpc-sismica-2025"].file[0]!.url) return reteGuasta(url);
    mkdirSync(join(cache, "manifest.json.tmp"));
    return new Response(readFileSync(csvSismica, "utf8") + "Lazio;Roma;RM;Roma;58091;2A-3A-3B\r\n", { status: 200 });
  }) as typeof fetch;
  const guastoDopoDownload = await preparaCache(cache, false, () => {}).then(
    () => null,
    (e: unknown) => String(e),
  );
  globalThis.fetch = fetchVera;
  const offlineDopoGuasto = await preparaCache(cache, true, () => {});
  caso(
    "download valido e diverso, poi scrittura del manifest fallita: torna la copia descritta dal manifest e --offline la usa",
    guastoDopoDownload !== null && offlineDopoGuasto["dpc-sismica-2025"]?.stato === "ok" && sha256File(csvSismica) === buoni["dpc-sismica-2025"].file[0]!.sha256 && !readdirSync(cache).some((n) => n.endsWith(".prec")),
    [guastoDopoDownload, offlineDopoGuasto["dpc-sismica-2025"]],
  );

  // corsa uccisa a metà: frammento 1 dell'allegato A già spostato in .prec e sostituito, manifest non ancora
  // scritto; e una .prec della sismica rimasta dopo la scrittura del manifest
  const frammento1 = join(cache, FONTI["dpr412-allegato-a"].file[0]!.nome);
  renameSync(frammento1, `${frammento1}.prec`);
  writeFileSync(frammento1, readFileSync(`${frammento1}.prec`, "utf8").replace("COMUNE 0 0", "COMUNE 0 NUOVO"));
  writeFileSync(`${csvSismica}.prec`, "copia superata\n");
  const offlineDopoKill = await preparaCache(cache, true, () => {});
  caso(
    "corsa interrotta durante la sostituzione: torna la copia descritta dal manifest, la .prec superata si cancella, --offline usa la cache",
    offlineDopoKill["dpr412-allegato-a"]?.stato === "ok" && offlineDopoKill["dpc-sismica-2025"]?.stato === "ok" && !readdirSync(cache).some((n) => n.endsWith(".prec")),
    [offlineDopoKill["dpr412-allegato-a"], offlineDopoKill["dpc-sismica-2025"]],
  );
  rmSync(cache, { recursive: true, force: true });
}

/* ---------- dataset committato ---------- */

console.log("\nDataset committato:");
{
  const byte = statSync(PERCORSO_DATASET).size;
  caso(`dimensione ${(byte / 1e6).toFixed(2)} MB entro il budget di ${BUDGET_DATASET_BYTE / 1e6} MB`, byte < BUDGET_DATASET_BYTE);
  const t0 = performance.now();
  const ds = JSON.parse(readFileSync(PERCORSO_DATASET, "utf8")) as DatasetFattiComuni;
  const ms = performance.now() - t0;
  console.log(`  (lettura + JSON.parse: ${ms.toFixed(0)} ms)`);
  caso("caricamento sotto i 100 ms indicativi", ms < 100, ms);
  const comuni = Object.values(ds.comuni);
  caso(`${comuni.length} comuni, tutti con nome, sigla, centro nel riquadro dell'Italia e raggio`, comuni.length === ds.copertura.comuni && comuni.every((c) => c.nome && /^[A-Z]{2}$/.test(c.sigla) && c.centro[0] > 35.2 && c.centro[0] < 47.2 && c.centro[1] > 6.5 && c.centro[1] < 18.6 && c.raggioKm > 0));
  caso("completo/fontiMancanti coerenti con lo stato delle fonti", ds.completo === (ds.fontiMancanti.length === 0) && ds.fontiMancanti.every((id) => ds.fonti[id]?.stato === "non_raggiungibile"), ds.fontiMancanti);
  const vicenza = ds.comuni["024116"];
  // municipio di Vicenza (Palazzo Trissino) circa a 45,547; 11,546: il file di terze parti della ricerca lo metteva 15 km più a nord
  caso("Vicenza: centro entro 2 km dal municipio, non 15 km fuori", vicenza !== undefined && Math.hypot((vicenza.centro[0] - 45.547) * 111, (vicenza.centro[1] - 11.546) * 78) < 2, vicenza?.centro);

  // Tabella della prova pratica: docs/ricerca-traffico-2026-09.md §6.3 (e rapporto w2-3-opendata §2)
  console.log("\nGolden dei 5 comuni di prova (ricerca §6.3):");
  const golden = [
    { codice: "015081", nome: "Cologno Monzese", pop: 46994, edifici: 3087, ante: 69.7, zona: "E", gg: 2404, alt: 131, sismica: "3", famiglie: 78.1 },
    { codice: "071051", nome: "San Severo", pop: 49136, edifici: 7539, ante: 75.2, zona: "D", gg: 1494, alt: 86, sismica: "2", famiglie: 79.0 },
    { codice: "024091", nome: "Sandrigo", pop: 8303, edifici: 1628, ante: 74.4, zona: "E", gg: 2343, alt: 64, sismica: "2", famiglie: 80.8 },
    { codice: "108033", nome: "Monza", pop: 123032, edifici: 8879, ante: 75.8, zona: "E", gg: 2404, alt: 162, sismica: "3", famiglie: 74.2 },
    { codice: "026086", nome: "Treviso", pop: 85652, edifici: 13696, ante: 83.2, zona: "E", gg: 2378, alt: 15, sismica: "2", famiglie: 65.9 },
  ];
  const verificaFonte = (id: string, nome: string, fn: () => void) => {
    if (ds.fonti[id]?.stato === "ok") fn();
    else nonVerificabili.push(`${nome}: fonte ${id} non raggiungibile all'ultimo aggiornamento`);
  };
  for (const g of golden) {
    const f = fattiComune(g.codice, ds);
    const v = (k: string) => f?.fatti.find((x) => x.chiave === k)?.valore;
    caso(`${g.nome}: nome`, f?.nome === g.nome, f?.nome);
    // la popolazione si confronta solo finché la fonte è la POSAS 2025
    verificaFonte("istat-posas-2025", `${g.nome} popolazione`, () => caso(`${g.nome}: ${formatoIntero(g.pop)} residenti al 1/1/2025`, v("popolazione") === g.pop, v("popolazione")));
    verificaFonte("dpr412-allegato-a", `${g.nome} clima`, () => caso(`${g.nome}: zona ${g.zona}, ${g.gg} GG, ${g.alt} m`, v("zona_climatica") === g.zona && v("gradi_giorno") === g.gg && v("altitudine_casa_comunale") === g.alt, [v("zona_climatica"), v("gradi_giorno"), v("altitudine_casa_comunale")]));
    verificaFonte("dpc-sismica-2025", `${g.nome} sismica`, () => caso(`${g.nome}: zona sismica ${g.sismica}`, v("zona_sismica") === g.sismica, v("zona_sismica")));
    verificaFonte("istat-edifici-2011", `${g.nome} edifici`, () => caso(`${g.nome}: ${g.edifici} edifici, ${g.ante}% ante 1981`, v("edifici_residenziali") === g.edifici && v("edifici_ante_1981") === g.ante, [v("edifici_residenziali"), v("edifici_ante_1981")]));
    verificaFonte("istat-famiglie-2021", `${g.nome} famiglie`, () => caso(`${g.nome}: ${g.famiglie}% famiglie proprietarie`, v("famiglie_proprietarie") === g.famiglie, v("famiglie_proprietarie")));
  }

  console.log("\nCodici, alias, ricerca e distanza sul dataset:");
  caso('"15081" e 15081 → Cologno Monzese', fattiComune("15081", ds)?.codice === "015081" && fattiComune(15081, ds)?.nome === "Cologno Monzese");
  caso('"999999", "abc", "", -1 → null senza eccezioni', [fattiComune("999999", ds), fattiComune("abc", ds), fattiComune("", ds), fattiComune(-1, ds)].every((x) => x === null));
  const alghero = fattiComune("090003", ds);
  caso('fattiComune("090003") → Alghero 112001 con alias cambio_codice', alghero?.codice === "112001" && alghero.alias?.motivo === "cambio_codice" && alghero.alias.da === "090003", alghero?.alias);
  caso("«Cologno Monzese» → 015081", JSON.stringify(cercaComune("Cologno Monzese", undefined, ds).map((c) => c.codice)) === '["015081"]');
  caso("«cassina de pecchi» senza apostrofo → 015060", cercaComune("cassina de pecchi", undefined, ds)[0]?.codice === "015060");
  caso("nome precedente: «Grana» → Grana Monferrato (005056)", cercaComune("Grana", "AT", ds).some((c) => c.codice === "005056"), cercaComune("Grana", undefined, ds));
  caso("omonimo: «Castro» → 2 risultati, con sigla «le» → 1", cercaComune("Castro", undefined, ds).length === 2 && cercaComune("Castro", "le", ds).length === 1);
  caso("bilingue: «Bozen» → Bolzano/Bozen", cercaComune("Bozen", undefined, ds)[0]?.codice === "021008");
  caso("sigla precedente salvata dal form: «Carbonia» SU → 119003 (oggi CI)", JSON.stringify(cercaComune("Carbonia", "SU", ds).map((c) => c.codice)) === '["119003"]', cercaComune("Carbonia", undefined, ds));
  const dalForm: [string, string, string][] = [
    ["Montagna", "BZ", "021053"], // nome precedente bilingue «Montagna/Montan»
    ["Alano di Piave", "BL", "025075"], // comune d'origine della fusione di Setteville
    ["San Dorligo della Valle", "TS", "032004"], // solo la parte italiana di «San Dorligo della Valle-Dolina»
    ["Murisengo", "AL", "006113"], // ridenominazione del 2025 (nome POSAS al 1/1/2025)
  ];
  const trovati = dalForm.map(([n, s]) => cercaComune(n, s, ds).map((c) => c.codice).join());
  caso("nomi del form rinominati o fusi: «Montagna» BZ, «Alano di Piave» BL, «San Dorligo della Valle» TS, «Murisengo» AL", trovati.join(";") === dalForm.map((f) => f[2]).join(";"), trovati);
  const d = distanzaKm("015081", "108033", ds);
  caso("distanza Cologno → Monza: 6 km in linea d'aria (5,8 arrotondato), metodo dichiarato, citabile", d?.km === 6 && d.citabile && d.metodo === "linea_aria_centroidi" && d.citazione.includes("linea d'aria") && d.citazione.includes("non su strada"), d);
  const confinanti = distanzaKm("058091", "058118", ds);
  caso("distanza sotto la somma dei raggi (Roma → Ciampino) → non citabile", confinanti !== null && !confinanti.citabile, [confinanti, ds.comuni["058091"]?.raggioKm, ds.comuni["058118"]?.raggioKm]);
  caso("distanza con codice ignoto → null", distanzaKm("015081", "999999", ds) === null);
  const entro = comuniEntroKm("015081", 6, ds);
  caso(
    "comuniEntroKm: sede a 0 km in testa, ordinati, Monza compresa",
    entro[0]?.codice === "015081" && entro[0].km === 0 && entro.every((c, i) => i === 0 || c.km >= entro[i - 1]!.km) && entro.some((c) => c.codice === "108033"),
    entro.slice(0, 5),
  );
  caso("comuniEntroKm con codice ignoto → []", comuniEntroKm("abc", 10, ds).length === 0);

  const cli = (...args: string[]) => spawnSync(process.execPath, ["--experimental-strip-types", fileURLToPath(new URL("./fatti-comuni.ts", import.meta.url)), ...args], { encoding: "utf8" });
  const senzaDa = [cli("mostra", "108012", "--da"), cli("mostra", "108012", "--da", "--json")];
  caso(
    "CLI: «mostra 108012 --da» senza codice (anche seguito da --json) → uso e codice 2, nessun fatto stampato",
    senzaDa.every((r) => r.status === 2 && r.stdout === "" && r.stderr.includes("uso:")),
    senzaDa.map((r) => [r.status, r.stdout.slice(0, 80), r.stderr.slice(0, 200)]),
  );
}

/* ---------- modulo: numeri, fatti e frasi ---------- */

console.log("\nNumeri, fatti e frasi (dataset in memoria):");
{
  caso("2151/3087 → 69,7", quota(2151, 3087) === 69.7 && formatoQuota(quota(2151, 3087)) === "69,7");
  caso("8303 → «8.303», 46994 → «46.994», 79 → «79,0»", formatoIntero(8303) === "8.303" && formatoIntero(46994) === "46.994" && formatoQuota(79) === "79,0");

  const istat = (titolo: string, riferimento: string) => ({
    titolo,
    ente: "Istat",
    url: `https://esempio.istat.it/${titolo.length}`,
    licenza: "CC BY 4.0",
    licenzaUrl: "https://creativecommons.org/licenses/by/4.0/deed.it",
    dicitura: `Fonte: Istat, ${titolo}`,
    dicituraElaborazione: `Elaborazione su dati Istat, ${titolo}`,
    riferimento,
    riferimentoTerritoriale: "2011-10-09",
    stato: "ok" as const,
  });
  const ds = {
    schema: 1,
    generatoIl: "2026-09-14T00:00:00.000Z",
    riferimentoTerritoriale: "2026-01-01",
    completo: true,
    fontiMancanti: [],
    fonti: {
      "istat-posas-2025": istat("Popolazione residente al 1° gennaio 2025", "1° gennaio 2025"),
      "istat-edifici-2011": istat("Censimento della popolazione e delle abitazioni 2011", "9 ottobre 2011"),
      "istat-famiglie-2021": istat("Censimento permanente della popolazione e delle abitazioni 2021", "2021"),
      "dpc-sismica-2025": {
        titolo: "Classificazione sismica aggiornata a maggio 2025",
        ente: "Dipartimento della Protezione Civile",
        url: "https://rischi.protezionecivile.gov.it/static/x.csv",
        licenza: "CC BY 4.0",
        licenzaUrl: "https://creativecommons.org/licenses/by/4.0/deed.it",
        dicitura: "Fonte: Dipartimento della Protezione Civile-Presidenza del Consiglio dei Ministri",
        riferimento: "31 maggio 2025",
        riferimentoTerritoriale: "2025-05-31",
        stato: "ok",
      },
      "dpr412-allegato-a": {
        titolo: "DPR 26 agosto 1993, n. 412, allegato A",
        ente: "Gazzetta Ufficiale della Repubblica Italiana",
        url: "https://www.gazzettaufficiale.it/x",
        licenza: "atto ufficiale escluso dal diritto d'autore (art. 5 L. 633/1941)",
        licenzaUrl: "https://www.normattiva.it/x",
        dicitura: "DPR 26 agosto 1993, n. 412, allegato A",
        riferimento: "testo originario del 1993",
        riferimentoTerritoriale: "1993-10-14",
        stato: "ok",
      },
    },
    fatti: { popolazione: "istat-posas-2025", edificiEpoca: "istat-edifici-2011", clima: "dpr412-allegato-a", sismica: "dpc-sismica-2025", famiglie: "istat-famiglie-2021" },
    copertura: {},
    scarti: {},
    alias: { "037004": { a: "037061", motivo: "fusione", dal: "2014-01-01" } },
    comuni: {
      // epoche ante 1981 e totali di Cologno Monzese dalla ricerca (≤1918: 78 · 1946-60: 704 · 1961-70: 650 ·
      // 1971-80: 563; 2.151 su 3.087); la ripartizione dopo il 1981 e i conteggi delle famiglie sono di prova
      // (stesse quote: 69,7% e 78,1%)
      "015081": { nome: "Cologno Monzese", sigla: "MI", centro: [45.5333, 9.2802], raggioKm: 1.65, popolazione: 46994, edificiEpoca: [78, 156, 704, 650, 563, 400, 300, 136, 100], clima: ["E", 2404, 131], sismica: "3", famiglie: [15000, 19206] },
      "001263": { nome: "Sestriere", sigla: "TO", centro: [44.95, 6.87], raggioKm: 3.3, clima: ["F", 5165, 2035] },
      "037061": {
        nome: "Valsamoggia",
        sigla: "BO",
        centro: [44.444, 11.0913],
        raggioKm: 7.53,
        edificiEpoca: [10, 10, 10, 10, 10, 10, 10, 10, 10],
        derivati: { edificiEpoca: { regola: "somma_fusione", da: ["037004", "037018"], nomi: ["Bazzano", "Castello di Serravalle"] } },
      },
    },
  } as unknown as DatasetFattiComuni;

  const cologno = frasiFatto("015081", ds);
  const testo = (k: string) => cologno.find((f) => f.chiave === k);
  caso("frase popolazione «46.994 residenti» con dicitura Istat e data", testo("popolazione")?.testo === "46.994 residenti" && testo("popolazione")!.citazione.startsWith("Fonte: Istat, Popolazione residente al 1° gennaio 2025"), testo("popolazione"));
  caso("frase edifici: «69,7% … prima del 1981 (2.151 su 3.087)» con «Elaborazione su dati Istat» e anno", testo("edifici_ante_1981")?.testo === "69,7% degli edifici residenziali costruiti prima del 1981 (2.151 su 3.087)" && testo("edifici_ante_1981")!.citazione.startsWith("Elaborazione su dati Istat") && testo("edifici_ante_1981")!.citazione.includes("2011"), testo("edifici_ante_1981"));
  caso("frase clima con casa comunale e allegato A", testo("zona_climatica")?.testo === "zona climatica E, 2.404 gradi giorno (casa comunale a 131 m)" && testo("zona_climatica")!.citazione.includes("allegato A") && testo("zona_climatica")!.citazione.includes("1993"), testo("zona_climatica"));
  caso("frase riscaldamento zona E dal DPR 74/2013", testo("periodo_riscaldamento")?.testo === "riscaldamento consentito dal 15 ottobre al 15 aprile, 14 ore al giorno" && testo("periodo_riscaldamento")!.citazione.includes("DPR 16 aprile 2013, n. 74"), testo("periodo_riscaldamento"));
  caso("frase sismica con la dicitura DPC letterale", testo("zona_sismica")?.testo === "zona sismica 3" && testo("zona_sismica")!.citazione.startsWith("Fonte: Dipartimento della Protezione Civile-Presidenza del Consiglio dei Ministri"), testo("zona_sismica"));
  caso("frase famiglie «78,1% …» come elaborazione", testo("famiglie_proprietarie")?.testo === "78,1% delle famiglie in abitazione di proprietà" && testo("famiglie_proprietarie")!.citazione.startsWith("Elaborazione su dati Istat"), testo("famiglie_proprietarie"));
  caso("ogni frase ha citazione con anno e URL", cologno.length === 7 && cologno.every((f) => /\b(19|20)\d{2}\b/.test(f.citazione) && f.url.startsWith("https://")), cologno);
  const sestriere = frasiFatto("001263", ds);
  caso("zona F → «nessuna limitazione»", sestriere.some((f) => f.chiave === "periodo_riscaldamento" && f.testo.includes("nessuna limitazione")), sestriere);
  caso("fonti mancanti nel record (Sestriere senza popolazione, edifici, famiglie): nessun fatto né frase, mai «0»", !sestriere.some((f) => ["popolazione", "edifici_residenziali", "famiglie_proprietarie"].includes(f.chiave)) && !fattiComune("001263", ds)!.fatti.some((f) => f.valore === 0), sestriere.map((f) => f.chiave));
  const valsa = fattiComune("037004", ds);
  const fraseValsa = frasiFatto("037061", ds).find((f) => f.chiave === "edifici_residenziali");
  caso(
    "somma per fusione: derivazione nel fatto, citazione come elaborazione con i comuni d'origine",
    valsa?.codice === "037061" && valsa.alias?.motivo === "fusione" && valsa.fatti[0]?.derivazione?.regola === "somma_fusione" && fraseValsa?.citazione.startsWith("Elaborazione") === true && fraseValsa.citazione.includes("Bazzano, Castello di Serravalle"),
    fraseValsa,
  );
  caso("codice ignoto → nessuna frase", frasiFatto("999999", ds).length === 0);
}

console.log(`\n${passati} passati, ${falliti} falliti${nonVerificabili.length ? `, ${nonVerificabili.length} NON VERIFICABILI` : ""}`);
for (const n of nonVerificabili) console.log(`  ⚠ ${n}`);
process.exit(falliti ? 1 : 0);
