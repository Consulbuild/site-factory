// Banco di prova del nucleo deterministico dello step legale (M1 del piano
// docs/piano-scheda-legale.md): casi BUONI che devono passare e casi PIANTATI
// che devono essere bocciati col messaggio giusto — converter, gate unico,
// inferenza forma, byte-check, fonte per-area. Fixture FITTIZIE (niente dati
// reali di clienti in git); il golden Cavaliere si legge da out/ solo se c'è.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-legale-gates.ts
//
import fs from "node:fs";
import path from "node:path";
import { SITE_RENDERER } from "../lib/paths.ts";
import { agenteDaFase } from "../lib/agenti.ts";
import {
  LegaleSchema,
  LenteReviewSchema,
  docCitati,
  COSTANTI_LEGALE,
  gateLegale,
  mdToBlocks,
  splitDocCoda,
  inferForma,
  formatDenominazione,
  byteCheckDocumenti,
  legaleFonteDaBrief,
  areeCambiate,
  AREA_DOCS,
  harvestDaVerificare,
  pulisciFormNotice,
  type Legale,
  type Foro,
  type BriefLegale,
} from "../lib/legale.ts";

let falliti = 0;
let passati = 0;
function caso(nome: string, ok: boolean, dettaglio?: string): void {
  if (ok) {
    passati++;
    console.log(`  ✓ ${nome}`);
  } else {
    falliti++;
    console.error(`  ✗ ${nome}${dettaglio ? ` — ${dettaglio}` : ""}`);
  }
}
const contiene = (errs: string[], frammento: string) => errs.some((e) => e.toLowerCase().includes(frammento.toLowerCase()));

/* ---------------- fixture fittizie (base valida) ---------------- */

const BRIEF: BriefLegale = {
  azienda: "PROVA EDILE SRLS",
  partita_iva: "12345678903",
  indirizzo: "Via Milano 89 Cologno Monzese 20093",
  citta: "Cologno Monzese",
  email: "info@provaedile.example",
  telefono: "+390212345678",
};
const FORO: Foro = { foro: "Monza", fonte: "test", url: "", evidenza: "Cologno Monzese", confidenza: "alta" };

// Il caso «Via Milano 89» nell'indirizzo + Foro di Monza è DELIBERATO:
// l'exact-match del foro non deve scattare sull'indirizzo (falso positivo).
function baseLegale(): Legale {
  return {
    privacy: {
      intro: "Ai sensi dell'art. 13 del Regolamento (UE) 2016/679 («GDPR»).",
      updatedAt: "01/08/2026",
      blocks: [
        { type: "h2", text: "1. Titolare del trattamento" },
        {
          type: "p",
          text: "Il titolare è **Prova Edile S.r.l.s.**, Via Milano 89, 20093 Cologno Monzese (MI), P.IVA 12345678903. Contatti: [info@provaedile.example](mailto:info@provaedile.example) · [+39 02 1234 5678](tel:+390212345678).",
        },
        { type: "h2", text: "2. Dati trattati e finalità" },
        { type: "ul", items: ["dare riscontro alla richiesta di preventivo;", "gestire il rapporto precontrattuale."] },
        { type: "h2", text: "3. Diritti dell'interessato" },
        { type: "p", text: "Puoi proporre reclamo al Garante ([garanteprivacy.it](https://www.garanteprivacy.it))." },
      ],
    },
    termini: {
      intro: "Condizioni d'uso del sito web di Prova Edile S.r.l.s.",
      updatedAt: "01/08/2026",
      blocks: [
        { type: "p", text: "I presenti Termini disciplinano l'uso del sito." },
        { type: "h2", text: "1. Titolare del Sito" },
        { type: "ul", items: ["**Prova Edile S.r.l.s.**", "Sede: Via Milano 89, 20093 Cologno Monzese (MI)", "Partita IVA: 12345678903"] },
        { type: "h2", text: "2. Legge applicabile e foro competente" },
        {
          type: "p",
          text: "Per ogni controversia è competente il Foro di Monza. Resta ferma, per il **consumatore**, la competenza del foro di residenza (art. 66-bis Codice del Consumo).",
        },
      ],
    },
    formNotice:
      "**Informativa privacy (art. 13 GDPR)** — I dati del modulo sono trattati da **Prova Edile S.r.l.s.** per dare riscontro alla richiesta; base giuridica art. 6, par. 1, lett. b) GDPR. Puoi proporre reclamo al Garante. [Informativa completa](/privacy)",
  };
}

/* ---------------- gate: buoni e piantati ---------------- */

console.log("\nGate unico — casi buoni:");
{
  const errs = gateLegale(baseLegale(), BRIEF, FORO);
  caso("base valida passa (con «Via Milano 89» nell'indirizzo e Foro di Monza)", errs.length === 0, errs.join(" | "));
}

console.log("\nGate unico — piantati che DEVONO fallire:");
{
  const l = baseLegale();
  (l.termini.blocks[4] as { text: string }).text = l.termini.blocks[4].type === "p" ? "Per ogni controversia è competente il Foro di Milano." : "";
  caso("foro «Milano» nella sezione foro → bocciato", contiene(gateLegale(l, BRIEF, FORO), "Foro di Milano"));
}
{
  const l = baseLegale();
  (l.privacy.blocks[1] as { text: string }).text = (l.privacy.blocks[1] as { text: string }).text.replace("12345678903", "99999999999");
  const errs = gateLegale(l, BRIEF, FORO);
  caso("P.IVA alterata → bocciata", contiene(errs, "99999999999"));
}
{
  const l = baseLegale();
  (l.privacy.blocks[3] as { items: string[] }).items.push("dato mancante: {{titolare.rea}}");
  caso("segnaposto {{…}} residuo → bocciato", contiene(gateLegale(l, BRIEF, FORO), "segnaposto"));
}
{
  const l = baseLegale();
  (l.privacy.blocks[2] as { text: string }).text = "4. Dati trattati e finalità";
  caso("numerazione con buco (1→4) → bocciata", contiene(gateLegale(l, BRIEF, FORO), "non progressiva"));
}
{
  const l = baseLegale();
  l.termini.blocks.push({ type: "p", text: "Il presente documento non costituisce consulenza legale." });
  caso("disclaimer interno nei blocchi → bocciato", contiene(gateLegale(l, BRIEF, FORO), "disclaimer"));
}
{
  const l = baseLegale();
  l.formNotice = "Riga uno.\nRiga due. [Informativa completa](/privacy) art. 6 Garante Prova Edile SRLS";
  caso("formNotice multilinea → bocciata", contiene(gateLegale(l, BRIEF, FORO), "a-capo"));
}
{
  const l = baseLegale();
  l.formNotice = l.formNotice.replace("](/privacy)", "](https://esempio.example/privacy)");
  caso("formNotice senza link interno /privacy → bocciata", contiene(gateLegale(l, BRIEF, FORO), "/privacy"));
}
{
  const l = baseLegale();
  (l.privacy.blocks[1] as { text: string }).text = (l.privacy.blocks[1] as { text: string }).text.replace(
    "mailto:info@provaedile.example",
    "mailto:altro@example.com",
  );
  caso("mailto diverso dal brief → bocciato", contiene(gateLegale(l, BRIEF, FORO), "altro@example.com"));
}
{
  const l = baseLegale();
  (l.privacy.blocks[1] as { text: string }).text = (l.privacy.blocks[1] as { text: string }).text.replace("tel:+390212345678", "tel:+390298765432");
  caso("tel href diverso dal brief → bocciato", contiene(gateLegale(l, BRIEF, FORO), "telefono"));
}
{
  const l = baseLegale();
  (l.termini.blocks[0] as { text: string }).text += " Vedi [nota](http://insicuro.example).";
  caso("URL http:// (non ammesso) → bocciato", contiene(gateLegale(l, BRIEF, FORO), "URL non ammesso"));
}
{
  const l = baseLegale();
  (l.termini.blocks[0] as { text: string }).text += " Testo con **grassetto sbilanciato.";
  caso("** sbilanciati → bocciati", contiene(gateLegale(l, BRIEF, FORO), "sbilanciati"));
}
{
  const l = baseLegale();
  (l.privacy.blocks[5] as { text: string }).text += " [DA VERIFICARE: hosting extra-UE]";
  caso("[DA VERIFICARE] nel documento pubblicato → bocciato", contiene(gateLegale(l, BRIEF, FORO), "DA VERIFICARE"));
}
{
  const l = baseLegale();
  l.privacy.updatedAt = "2026-08-01";
  caso("updatedAt non GG/MM/AAAA → bocciato", contiene(gateLegale(l, BRIEF, FORO), "GG/MM/AAAA"));
}
{
  caso("foro.json assente → bocciato", contiene(gateLegale(baseLegale(), BRIEF, null), "foro.json assente"));
}
{
  const l = baseLegale();
  l.termini.blocks.splice(3, 2); // via la sezione foro
  caso("sezione foro mancante nei termini → bocciata", contiene(gateLegale(l, BRIEF, FORO), "Legge applicabile"));
}

/* ---------------- converter md→blocks ---------------- */

console.log("\nConverter md→blocks (regole chiuse):");
{
  const md = [
    "# Termini e Condizioni", // H1: scartato
    "",
    "Paragrafo di apertura prima della prima sezione.",
    "",
    "## 1. Titolare",
    "Riga uno del paragrafo",
    "che continua sulla seconda riga.",
    "",
    "- primo punto;",
    "- secondo punto.",
    "",
    "### 3.1 Sottosezione",
    "",
    "> Avvertenza: blocco per il report, non per la pagina.",
    "",
    "*Documento generato automaticamente.*",
  ].join("\n");
  const { blocks, note, errori } = mdToBlocks(md);
  caso("nessun errore sul set ammesso", errori.length === 0, errori.join(" | "));
  caso("H1 scartato", !blocks.some((b) => b.type === "h2" && /Termini e Condizioni/.test(b.text)));
  caso("testo pre-## → blocco p", blocks[0]?.type === "p" && /apertura/.test((blocks[0] as { text: string }).text));
  caso("## → h2", blocks.some((b) => b.type === "h2" && b.text === "1. Titolare"));
  caso("paragrafo multi-riga unito", blocks.some((b) => b.type === "p" && /Riga uno del paragrafo che continua/.test((b as { text: string }).text)));
  caso("bullet → ul", blocks.some((b) => b.type === "ul" && b.items.length === 2));
  caso("### → p in grassetto", blocks.some((b) => b.type === "p" && (b as { text: string }).text === "**3.1 Sottosezione**"));
  caso("blockquote → note report", note.some((n) => /Avvertenza/.test(n)) && !blocks.some((b) => b.type === "p" && /Avvertenza/.test((b as { text: string }).text)));
  caso("riga in corsivo → note report", note.some((n) => /generato automaticamente/.test(n)));
}
{
  caso("tabella markdown → errore hard", mdToBlocks("## 1. X\n| a | b |").errori.length > 0);
  caso("elenco numerato nel corpo → errore hard", mdToBlocks("## 1. X\n1. primo\n2. secondo").errori.length > 0);
  caso("HTML → errore hard", mdToBlocks("## 1. X\n<div>ciao</div>").errori.length > 0);
}
{
  const { docMd, codaMd } = splitDocCoda("## 1. Titolare\ntesto\n\n## Riferimenti normativi (citati nel documento)\n- art. 13 GDPR [LEGGE]");
  caso("split a PREFISSO sul marker con suffisso", /## 1\. Titolare/.test(docMd) && /Riferimenti normativi/.test(codaMd) && !/Riferimenti/.test(docMd));
}
{
  caso("harvest [DA VERIFICARE] dalla coda", harvestDaVerificare("## Note\n[DA VERIFICARE: DPF del provider]").length === 1);
  caso("pulisciFormNotice appiattisce gli a-capo", !/\n/.test(pulisciFormNotice("riga uno\n  riga due")));
}

/* ---------------- inferenza forma e denominazione ---------------- */

console.log("\nInferenza forma giuridica e denominazione:");
caso("SRLS → societa", inferForma("PROVA EDILE SRLS").forma === "societa");
caso("S.R.L. → societa", inferForma("COSTRUZIONI ALFA S.R.L.").forma === "societa");
caso("nessun suffisso → ditta_individuale", inferForma("Impresa Edile Rossi").forma === "ditta_individuale");
caso(
  "formatDenominazione: PROVA EDILE SRLS → Prova Edile S.r.l.s.",
  formatDenominazione("PROVA EDILE SRLS") === "Prova Edile S.r.l.s.",
  formatDenominazione("PROVA EDILE SRLS"),
);

/* ---------------- byte-check e fonte per-area ---------------- */

console.log("\nByte-check per-documento e fonte per-area:");
{
  const prima = baseLegale();
  const dopo = baseLegale();
  (dopo.privacy.blocks[5] as { text: string }).text += " (modificato)";
  caso("modifica privacy con soli termini citati → bocciata", byteCheckDocumenti(prima, dopo, ["termini"]) !== null);
  caso("modifica privacy con privacy citata → ammessa", byteCheckDocumenti(prima, dopo, ["privacy"]) === null);
}
{
  const a = legaleFonteDaBrief({ ...BRIEF });
  const b = legaleFonteDaBrief({ ...BRIEF, citta: "Sesto San Giovanni" });
  const cambiate = Object.keys(a).filter((k) => a[k] !== b[k]);
  caso("cambio città → cambia SOLO l'area «sede e foro»", cambiate.length === 1 && cambiate[0] === "sede e foro", cambiate.join(","));
}

/* ---------------- area «stack» (integrazioni VPS 2026-09) ---------------- */

console.log("\nAree cambiate (brief + stack):");
{
  const cur = legaleFonteDaBrief({ ...BRIEF });
  caso("senza provenienza (artifact pre-GUI) → solo «stack»", JSON.stringify(areeCambiate(undefined, cur)) === JSON.stringify(["stack"]));
  const { stack: _s, ...senzaStack } = cur;
  caso("provenienza legacy senza chiave stack → «stack»", JSON.stringify(areeCambiate(senzaStack, cur)) === JSON.stringify(["stack"]));
  caso("provenienza identica → nessuna area", areeCambiate(cur, cur).length === 0);
  const prevCitta = legaleFonteDaBrief({ ...BRIEF, citta: "Sesto San Giovanni" });
  caso("brief cambiato con stack uguale → solo l'area del brief", JSON.stringify(areeCambiate(prevCitta, cur)) === JSON.stringify(["sede e foro"]));
  caso("«stack» rigenera SOLO la privacy", JSON.stringify(AREA_DOCS.stack) === JSON.stringify(["privacy"]));
}

/* ---------------- regressioni dalla review avversariale 2026-08-02 ---------------- */

console.log("\nRegressioni review 2026-08-02 (converter):");
{
  const { blocks, errori } = mdToBlocks("## 1. X\ntesto.\n\n---\n");
  caso("separatore --- del template scartato (mai in pagina)", errori.length === 0 && !blocks.some((b) => b.type === "p" && b.text === "---"));
}
{
  const { blocks } = mdToBlocks("**Ultimo aggiornamento: 21/07/2026**\n\n## 1. X\ntesto.");
  caso("riga «**Ultimo aggiornamento**» scartata (updatedAt lo timbra il TS)", !blocks.some((b) => b.type === "p" && /aggiornamento/i.test(b.text)));
}
{
  const { blocks, note } = mdToBlocks("*Prova Edile S.r.l.s. — documento redatto\nsulla base della normativa (D.lgs. 70/2003).*");
  caso("footer corsivo MULTI-riga → report, non in pagina", blocks.length === 0 && note.some((n) => /normativa/.test(n)));
}
{
  const { blocks } = mdToBlocks("##" + " " + "1. Titolare");
  caso("NBSP dopo ## normalizzato → h2", blocks[0]?.type === "h2" && blocks[0].text === "1. Titolare");
}

console.log("\nRegressioni review 2026-08-02 (gate):");
{
  const l = baseLegale();
  (l.termini.blocks[4] as { text: string }).text =
    "In via esclusiva è competente il Foro di Monza in deroga a ogni altro foro, per il **consumatore** resta il foro di residenza (art. 66-bis).";
  caso("«Foro di Monza in via esclusiva…» (minuscole dopo la città) → passa", !gateLegale(l, BRIEF, FORO).some((e) => e.includes("Foro di")));
}
{
  const l = baseLegale();
  (l.termini.blocks[4] as { text: string }).text = "È competente il Foro di Monza (foro erariale escluso), salvo il **consumatore** (art. 66-bis).";
  caso("«Foro di Monza (…)» → la città viene trovata, passa", !gateLegale(l, BRIEF, FORO).some((e) => e.includes("Foro di")));
}
{
  const l = baseLegale();
  (l.privacy.blocks[1] as { text: string }).text =
    "Titolare: **Prova Edile S.r.l.s.**, P.IVA 12345678903. 20093 Cologno Monzese (MI). Contatti: [info@provaedile.example](mailto:info@provaedile.example) · [tel](tel:+390212345678).";
  caso("«P.IVA …903. 20093» (CAP dopo il punto) → non ingloba il CAP, passa", !gateLegale(l, BRIEF, FORO).some((e) => e.startsWith("P.IVA")));
}
{
  const l = baseLegale();
  l.privacy.updatedAt = "99/99/2026";
  caso("updatedAt «99/99/2026» → bocciata (data non reale)", contiene(gateLegale(l, BRIEF, FORO), "data reale"));
}
{
  const l = baseLegale();
  l.formNotice = l.formNotice.replace("art. 6, par. 1, lett. b) GDPR", "art. 66-bis del Codice del Consumo");
  caso("formNotice con SOLO art. 66-bis → manca la base giuridica", contiene(gateLegale(l, BRIEF, FORO), "base giuridica"));
}
{
  const l = baseLegale();
  (l.privacy.blocks[5] as { text: string }).text += " Scrivi a altro@example.com per assistenza.";
  caso("e-mail estranea IN CHIARO (senza mailto:) → bocciata", contiene(gateLegale(l, BRIEF, FORO), "altro@example.com"));
}
{
  const l = baseLegale();
  (l.privacy.blocks[5] as { text: string }).text += " Oppure scrivi a garante@gpdp.it.";
  caso("recapito istituzionale del Garante in chiaro → ammesso", !contiene(gateLegale(l, BRIEF, FORO), "garante@gpdp.it"));
}

console.log("\nRegressioni dal primo run E2E 2026-08-03:");
{
  const r = LenteReviewSchema.safeParse({
    lente: "refusi",
    verdict: "PASS",
    findings: [{ doc: "privacy/termini", path: "privacy.blocks[1].text  vs  termini.blocks[3].items[3]", gravita: "avviso", problema: "x", fix: "y" }],
  });
  caso("review con finding trasversale «privacy/termini» → accettata", r.success);
  caso(
    "docCitati estrae entrambi i documenti dal finding trasversale",
    JSON.stringify(docCitati({ doc: "privacy/termini", path: "" })) === JSON.stringify(["privacy", "termini"]),
  );
}
caso(
  "introTermini: niente punto doppio dopo «S.r.l.s.»",
  COSTANTI_LEGALE.introTermini("Prova Edile S.r.l.s.") === "Condizioni d'uso del sito web di Prova Edile S.r.l.s." &&
    COSTANTI_LEGALE.introTermini("Impresa Edile Rossi") === "Condizioni d'uso del sito web di Impresa Edile Rossi.",
);

console.log("\nRegressioni review 2026-08-02 (identità agenti):");
{
  caso("«Assegnazione deterministica del design» NON è il giurista (chip script)", agenteDaFase("Assegnazione deterministica del design").key === "script");
  caso("«termini e condizioni» → giurista", agenteDaFase("termini e condizioni").nome === "giurista");
  caso("«privacy (informativa estesa)» → giurista", agenteDaFase("privacy (informativa estesa)").nome === "giurista");
  caso("«informativa breve» → giurista", agenteDaFase("informativa breve").nome === "giurista");
  caso("«lente anti-invenzione (round 1)» → critico", agenteDaFase("lente anti-invenzione (round 1)").key === "critico");
  caso("«correzioni formato» resta del copywriter", agenteDaFase("correzioni formato").key === "copy");
}

/* ---------------- golden Cavaliere (solo se presente in out/) ---------------- */

const GOLDEN = path.join(SITE_RENDERER, "out", "cavaliere-build-srls", "legale.json");
if (fs.existsSync(GOLDEN)) {
  console.log("\nGolden Cavaliere (da out/, non in git):");
  const parsed = LegaleSchema.safeParse(JSON.parse(fs.readFileSync(GOLDEN, "utf8")));
  caso("golden conforme allo specchio Zod", parsed.success);
  if (parsed.success) {
    const golden = parsed.data;
    // Roundtrip: blocks → md → mdToBlocks deve riprodurre gli stessi blocchi.
    const md = golden.privacy.blocks
      .map((b) => (b.type === "h2" ? `## ${b.text}` : b.type === "p" ? b.text : b.items.map((i) => `- ${i}`).join("\n")))
      .join("\n\n");
    const { blocks, errori } = mdToBlocks(md);
    caso("roundtrip privacy: md ricostruito → stessi blocchi", errori.length === 0 && JSON.stringify(blocks) === JSON.stringify(golden.privacy.blocks));
    const outline = golden.privacy.blocks.filter((b) => b.type === "h2").map((b) => b.text);
    caso("outline privacy 1..9 progressivo", outline.length === 9 && outline.every((t, i) => t.startsWith(`${i + 1}. `)));
    // Il gate sul golden coi dati REALI del brief (letti da out/, mai inline).
    const brief = JSON.parse(fs.readFileSync(path.join(SITE_RENDERER, "out", "cavaliere-build-srls", "brief.json"), "utf8"));
    const b = {
      azienda: String(brief.azienda),
      partita_iva: String(brief.partita_iva),
      indirizzo: String(brief.indirizzo),
      citta: String(brief.citta),
      email: String(brief.email),
      telefono: String(brief.telefono),
    };
    const errs = gateLegale(golden, b, { foro: "Monza", fonte: "verifica manuale 21/07/2026", url: "", evidenza: "circondario Tribunale di Monza", confidenza: "alta" });
    caso("golden passa il gate unico", errs.length === 0, errs.join(" | "));
  }
} else {
  console.log("\n(golden Cavaliere assente da out/: check saltati — ok su macchine senza dati clienti)");
}

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
