import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";
// Solo import relativi CON estensione .ts: questo modulo gira anche via
// `node --experimental-strip-types` (scripts/test-legale-gates.ts), come slots.ts.
import { clientDir } from "./paths.ts";

/** Stessa formula di staleness.hashValue (sha256, 12 hex) — locale perché
 *  staleness.ts non è importabile fuori da Next (import senza estensione). */
const hashValue = (v: unknown): string => crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 12);

// Nucleo deterministico dello step legale (docs/piano-scheda-legale.md):
// specchio del contratto renderer, costanti d'agenzia, profilo builder,
// converter md→blocks a regole chiuse, gate unico, fonte per-area, byte-check.
// Tutto ciò che può essere codice invece che giudizio AI vive qui.

/* ------------------------------------------------------------------ */
/* Contratto (specchio di site-renderer/src/lib/schema.ts LegalSchema)  */
/* ------------------------------------------------------------------ */

// Specchio per i 422 della PUT e per validate(): il bound VERO resta la
// prova di montaggio (assemble --legale + validate-site) dentro il run.
export const LegaleBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("h2"), text: z.string().min(1) }),
  z.object({ type: z.literal("p"), text: z.string().min(1) }),
  z.object({ type: z.literal("ul"), items: z.array(z.string().min(1)).min(1) }),
]);
export type LegaleBlock = z.infer<typeof LegaleBlockSchema>;

export const LegaleDocSchema = z.object({
  intro: z.string().default(""),
  updatedAt: z.string().min(1),
  blocks: z.array(LegaleBlockSchema).min(1),
});
export type LegaleDoc = z.infer<typeof LegaleDocSchema>;

export const LegaleSchema = z.object({
  privacy: LegaleDocSchema,
  termini: LegaleDocSchema,
  formNotice: z.string().min(1),
});
export type Legale = z.infer<typeof LegaleSchema>;

export type LegaleDocKey = "privacy" | "termini" | "formNotice";
export const LEGALE_DOC_KEYS: LegaleDocKey[] = ["privacy", "termini", "formNotice"];

/** foro.json — derivazione del foro con evidenza (fase «foro» del run). */
export const ForoSchema = z.object({
  foro: z.string().min(1), // città del tribunale (es. "Monza")
  fonte: z.string().min(1), // nome della fonte (tool MCP / pagina del tribunale)
  url: z.string().default(""),
  evidenza: z.string().min(1), // citazione verbatim che contiene il comune
  confidenza: z.enum(["alta", "bassa"]),
});
export type Foro = z.infer<typeof ForoSchema>;

/** Review di UNA lente (legale-src/review-<lente>.json): il formato che ogni
 *  fase-lente scrive; l'aggregazione in legale-review.json la fa il TS. */
export const LenteReviewSchema = z
  .object({
    verdict: z.enum(["PASS", "FAIL"]),
    findings: z.array(
      z
        .object({
          // Stringa libera: i finding trasversali («privacy/termini») sono
          // legittimi — il primo run E2E l'ha dimostrato. I documenti citati
          // si estraggono con docCitati() per il byte-check.
          doc: z.string(),
          path: z.string().default(""),
          gravita: z.enum(["bloccante", "avviso"]),
          problema: z.string(),
          fix: z.string().default(""),
        })
        .passthrough(),
    ),
  })
  .passthrough();
export type LenteReview = z.infer<typeof LenteReviewSchema>;

/** Documenti citati da un finding (doc libero + path): per il byte-check. */
export function docCitati(f: { doc: string; path?: string }): LegaleDocKey[] {
  const testo = `${f.doc} ${f.path ?? ""}`;
  return LEGALE_DOC_KEYS.filter((k) => testo.includes(k));
}

/** legale-review.json — verdetti delle 3 lenti + findings ancorabili in UI. */
export const LegaleReviewSchema = z
  .object({
    verdict: z.enum(["PASS", "FAIL"]),
    round: z.number(),
    lenti: z.object({
      antiInvenzione: z.enum(["PASS", "FAIL"]),
      conformita: z.enum(["PASS", "FAIL"]),
      refusi: z.enum(["PASS", "FAIL"]),
    }),
    findings: z.array(
      z
        .object({
          lente: z.enum(["antiInvenzione", "conformita", "refusi"]),
          doc: z.string(),
          /** Ancora UI, es. "privacy.blocks[7]" — NON lo scope del byte-check. */
          path: z.string(),
          gravita: z.enum(["bloccante", "avviso"]),
          problema: z.string(),
          fix: z.string(),
        })
        .passthrough(),
    ),
    giudicatoSu: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();
export type LegaleReview = z.infer<typeof LegaleReviewSchema>;

/* ------------------------------------------------------------------ */
/* Costanti d'agenzia (lo standard validato sul golden Cavaliere)       */
/* ------------------------------------------------------------------ */

// I FATTI standard dei nostri siti vetrina (form preventivo, Umami assente,
// hosting UE con clausola condizionale): validati una volta qui, mai
// re-inventati per cliente. I fatti PER-cliente arrivano solo dal brief.
export const COSTANTI_LEGALE = {
  moduli: ["contatti"] as const,
  informativa_estesa_url: "/privacy",
  tipo_form_contatto: "preventivo_appuntamento", // → base art. 6.1.b, niente checkbox consenso
  finalita: [
    "dare riscontro alla richiesta di preventivo o di contatto",
    "in caso di successivo incarico, gestire il rapporto precontrattuale e contrattuale",
  ],
  basi_giuridiche: ["art. 6, par. 1, lett. b) GDPR — esecuzione di misure precontrattuali adottate su richiesta dell'interessato"],
  categorie_dati: [
    "nome e cognome",
    "numero di telefono",
    "indirizzo e-mail (facoltativo)",
    "città in cui si trova l'immobile (facoltativa)",
    "descrizione dei lavori richiesti",
  ],
  destinatari: [
    "soggetti autorizzati che operano sotto l'autorità del Titolare",
    "fornitori tecnici di hosting e infrastruttura, nominati responsabili ex art. 28 GDPR",
  ],
  periodo_conservazione: "il tempo necessario a gestire la richiesta; in assenza di seguito, cancellazione entro 12 mesi",
  conservazione_contatto: "12 mesi in assenza di seguito",
  campi_obbligatori_form: "nome e telefono",
  pubblico_b2c: true, // clausola consumatore sempre presente: dovuta per B2C, innocua per B2B
  intro_privacy: "Ai sensi dell'art. 13 del Regolamento (UE) 2016/679 («GDPR»).",
  // Niente punto doppio se la denominazione finisce con un'abbreviazione
  // («S.r.l.s.» + «.» = refuso — beccato dalla lente refusi sul primo run E2E).
  introTermini: (denominazione: string) =>
    `Condizioni d'uso del sito web di ${denominazione}${denominazione.endsWith(".") ? "" : "."}`,
} as const;

/* ------------------------------------------------------------------ */
/* Denominazione e forma giuridica (inferenza, niente raccolta dati)    */
/* ------------------------------------------------------------------ */

const SUFFISSI_SOCIETA: Array<[RegExp, string]> = [
  [/\bs\.?\s*r\.?\s*l\.?\s*s\b\.?/i, "S.r.l.s."],
  [/\bs\.?\s*r\.?\s*l\b\.?/i, "S.r.l."],
  [/\bs\.?\s*p\.?\s*a\b\.?/i, "S.p.A."],
  [/\bs\.?\s*n\.?\s*c\b\.?/i, "S.n.c."],
  [/\bs\.?\s*a\.?\s*s\b\.?/i, "S.a.s."],
  [/\bsoc\.?\s*coop\b\.?|\bscarl\b/i, "Soc. Coop."],
];

/** Forma giuridica inferita dalla denominazione (decisione 2026-08-02: niente
 *  raccolta dati societari). Inferenza incerta → ditta_individuale, degrado
 *  sicuro: le righe condizionali REA/PEC si omettono comunque. */
export function inferForma(denominazione: string): { forma: "societa" | "ditta_individuale"; base: string } {
  for (const [re, label] of SUFFISSI_SOCIETA) {
    if (re.test(denominazione)) return { forma: "societa", base: `suffisso «${label}» nella denominazione` };
  }
  return { forma: "ditta_individuale", base: "nessun suffisso societario nella denominazione" };
}

/** Forma di visualizzazione suggerita: Title Case + suffisso societario
 *  puntato ("CAVALIERE BUILD SRLS" → "Cavaliere Build S.r.l.s."). Il gate
 *  confronta in forma NORMALIZZATA, quindi la resa resta libera. */
export function formatDenominazione(azienda: string): string {
  const words = azienda.trim().split(/\s+/);
  const out = words.map((w) => {
    for (const [re, label] of SUFFISSI_SOCIETA) {
      if (re.test(w) && w.replace(/[.\s]/g, "").length <= 5) return label;
    }
    return w
      .toLowerCase()
      .split(/([-'’])/)
      .map((p) => (/[a-zà-ú]/i.test(p[0] ?? "") ? p.charAt(0).toUpperCase() + p.slice(1) : p))
      .join("");
  });
  return out.join(" ");
}

/** Normalizzazione per i confronti d'identità: solo lettere/cifre, minuscole. */
export const normAlnum = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
export const soloCifre = (s: string) => s.replace(/\D/g, "");

/* ------------------------------------------------------------------ */
/* Profilo legale (input inline delle fasi: l'AI non sceglie i fatti)   */
/* ------------------------------------------------------------------ */

export type BriefLegale = {
  azienda: string;
  partita_iva: string;
  indirizzo: string;
  citta: string;
  email: string;
  telefono: string;
};

export function briefLegale(brief: Record<string, unknown>): BriefLegale | { errore: string } {
  const campi = ["azienda", "partita_iva", "indirizzo", "citta", "email", "telefono"] as const;
  const mancanti = campi.filter((c) => typeof brief[c] !== "string" || !(brief[c] as string).trim());
  if (mancanti.length) return { errore: `campi del brief mancanti per il legale: ${mancanti.join(", ")}` };
  return Object.fromEntries(campi.map((c) => [c, String(brief[c]).trim()])) as BriefLegale;
}

/** Profilo per le due skill + parametri MCP, calcolato in TS ed EMBEDDATO nei
 *  prompt (niente file di lavoro). `note` finisce nel report (trasparenza). */
export function buildProfilo(b: BriefLegale, dominio?: string | null) {
  const den = formatDenominazione(b.azienda);
  const { forma, base } = inferForma(b.azienda);
  const sede = `${b.indirizzo}${normAlnum(b.indirizzo).includes(normAlnum(b.citta)) ? "" : `, ${b.citta}`}`;
  const sitoUrl = dominio?.trim() ? `https://${dominio.replace(/^https?:\/\//, "")}` : "il presente sito web";
  const note = [
    `Forma giuridica inferita: ${forma} (${base}).`,
    ...(forma === "societa"
      ? [
          "Società di capitali senza REA/PEC/capitale sociale: il form non li raccoglie (decisione 2026-08-02) — art. 2250 c.c. / art. 7 D.lgs. 70/2003 li richiederebbero; nessun placeholder pubblicato, righe condizionali omesse.",
        ]
      : []),
    ...(sitoUrl === "il presente sito web" ? ["Dominio non noto alla generazione: i T&C usano «il presente sito web»."] : []),
  ];
  return {
    denominazione: den,
    forma,
    tc: {
      titolare: { denominazione: den, forma, sede, email: b.email, partita_iva: b.partita_iva },
      sito: { url: sitoUrl },
      foro: { citta: "" }, // riempito dalla fase foro (foro.json)
      pubblico_b2c: COSTANTI_LEGALE.pubblico_b2c,
      privacy_policy_url: COSTANTI_LEGALE.informativa_estesa_url,
      vende_online: false,
    },
    breve: {
      titolare: { denominazione: den, email: b.email },
      moduli: [...COSTANTI_LEGALE.moduli],
      informativa_estesa_url: COSTANTI_LEGALE.informativa_estesa_url,
      tipo_form_contatto: COSTANTI_LEGALE.tipo_form_contatto,
      finalita_contatto: COSTANTI_LEGALE.finalita[0],
      conservazione_contatto: COSTANTI_LEGALE.conservazione_contatto,
      campi_obbligatori_form: COSTANTI_LEGALE.campi_obbligatori_form,
    },
    mcp: {
      titolare: `${den}, ${sede}`,
      finalita: [...COSTANTI_LEGALE.finalita],
      basi_giuridiche: [...COSTANTI_LEGALE.basi_giuridiche],
      categorie_dati: [...COSTANTI_LEGALE.categorie_dati],
      destinatari: [...COSTANTI_LEGALE.destinatari],
      periodo_conservazione: COSTANTI_LEGALE.periodo_conservazione,
    },
    note,
  };
}

/* ------------------------------------------------------------------ */
/* Converter md→blocks (set CHIUSO di regole, dai template reali)       */
/* ------------------------------------------------------------------ */

/** Marker di coda: PREFISSO (la skill tc-sito-it usa il suffisso
 *  «(citati nel documento)»). Tutto dal marker in poi è materiale report. */
const MARKER_CODA = "## Riferimenti normativi";

export function splitDocCoda(md: string): { docMd: string; codaMd: string } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const i = lines.findIndex((l) => l.trim().startsWith(MARKER_CODA));
  if (i < 0) return { docMd: lines.join("\n"), codaMd: "" };
  return { docMd: lines.slice(0, i).join("\n"), codaMd: lines.slice(i).join("\n") };
}

export type ConversioneMd = { blocks: LegaleBlock[]; note: string[]; errori: string[] };

/** Regole chiuse (evidenziate dai template delle skill e dal golden):
 *  `## ` → h2 · paragrafi → p (righe contigue unite) · `- `/`* ` → ul ·
 *  `### X` → p con **X** · `# H1` scartato (il titolo lo mette la pagina) ·
 *  `> ` e righe solo-corsivo → note (report, mai online) ·
 *  tabelle/HTML/liste annidate/numerate → errore hard (UNA correzione claude). */
export function mdToBlocks(docMd: string): ConversioneMd {
  const blocks: LegaleBlock[] = [];
  const note: string[] = [];
  const errori: string[] = [];
  let par: string[] = [];
  let ul: string[] = [];

  const flushPar = () => {
    const text = par.join(" ").trim();
    par = [];
    if (!text) return;
    // Il footer del template è un paragrafo corsivo MULTI-riga: ricomposto
    // qui, va nel report come le righe corsive singole (review 2026-08-02).
    if (/^\*[^*].*[^*]\*$/.test(text)) note.push(text.replace(/^\*|\*$/g, ""));
    else blocks.push({ type: "p", text });
  };
  const flushUl = () => {
    if (ul.length) blocks.push({ type: "ul", items: ul });
    ul = [];
  };

  // NBSP → spazio normale (i template incollati ne portano). ATTENZIONE: la
  // regex contiene un NBSP LETTERALE (U+00A0), invisibile — non "riformattarlo";
  // il banco di prova ha un caso che fallisce se viene normalizzato.
  for (const raw of docMd.replace(/ /g, " ").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const t = line.trim();
    if (!t) {
      flushPar();
      flushUl();
      continue;
    }
    // Separatore `---` del template (riga 118 di template_tc.md): mai in pagina.
    if (/^[-_*]{3,}$/.test(t)) {
      flushPar();
      flushUl();
      continue;
    }
    // «**Ultimo aggiornamento: …**» del template: updatedAt è timbrato dal TS
    // e reso dalla pagina — pubblicarlo qui lo duplicherebbe.
    if (/^\*\*ultimo aggiornamento/i.test(t)) {
      flushPar();
      continue;
    }
    if (/^\|/.test(t)) return { blocks, note, errori: [...errori, "tabella markdown nel documento: fuori dal set ammesso (riformulare in paragrafi o elenco)"] };
    if (/^<[a-z!/]/i.test(t)) return { blocks, note, errori: [...errori, `HTML nel documento («${t.slice(0, 40)}…»): fuori dal set ammesso`] };
    if (/^\d+\.\s/.test(t)) return { blocks, note, errori: [...errori, `elenco numerato nel corpo («${t.slice(0, 40)}…»): fuori dal set ammesso (usare elenco puntato o prosa)`] };
    if (/^(-|\*)\s/.test(t)) {
      if (/^\s{2,}/.test(line) && ul.length) return { blocks, note, errori: [...errori, "elenco annidato: fuori dal set ammesso"] };
      flushPar();
      ul.push(t.replace(/^(-|\*)\s+/, ""));
      continue;
    }
    flushUl();
    if (t.startsWith("# ") && !t.startsWith("## ")) continue; // H1 del template: il titolo lo mette la pagina
    if (t.startsWith("## ")) {
      flushPar();
      blocks.push({ type: "h2", text: t.slice(3).trim() });
      continue;
    }
    if (t.startsWith("### ")) {
      flushPar();
      blocks.push({ type: "p", text: `**${t.slice(4).trim()}**` });
      continue;
    }
    if (t.startsWith(">")) {
      note.push(t.replace(/^>\s?/, ""));
      continue;
    }
    if (/^\*[^*].*[^*]\*$/.test(t)) {
      note.push(t.replace(/^\*|\*$/g, ""));
      continue;
    }
    par.push(t);
  }
  flushPar();
  flushUl();
  return { blocks, note, errori };
}

/** L'informativa breve del form è UNA stringa piatta: qui solo la pulizia
 *  meccanica (trim, spazi doppi) — la stesura è output primario della fase. */
export function pulisciFormNotice(s: string): string {
  return s.trim().replace(/\s*\n\s*/g, " ").replace(/ {2,}/g, " ");
}

/* ------------------------------------------------------------------ */
/* Gate unico deterministico (assorbe validate.py + exact-match + resa) */
/* ------------------------------------------------------------------ */

const testoBlocchi = (doc: LegaleDoc): string[] =>
  doc.blocks.flatMap((b) => (b.type === "ul" ? b.items : [b.text]));

/** Placeholder e marker che non devono MAI raggiungere i blocchi pubblicati. */
const PATTERN_VIETATI: Array<[RegExp, string]> = [
  [/\{\{[^}]*\}\}/, "segnaposto {{…}} residuo"],
  [/\[___/, "segnaposto [___ DA FORNIRE …] residuo"],
  [/<!--\s*\/?INCLUDI/i, "marker <!-- INCLUDI --> non rimosso"],
  [/\[DA VERIFICARE/i, "nota [DA VERIFICARE …] nel documento pubblicato (va nel report)"],
  [/non costituisce consulenza legale/i, "disclaimer interno nel documento pubblicato (vive solo nel report)"],
  [/(^|\s)#{1,6}\s/, "markdown residuo (#) nel testo di un blocco"],
];

function checkInline(testo: string, dove: string, errs: string[]): void {
  for (const [re, msg] of PATTERN_VIETATI) if (re.test(testo)) errs.push(`«${dove}»: ${msg}`);
  const bold = (testo.match(/\*\*/g) ?? []).length;
  if (bold % 2 !== 0) errs.push(`«${dove}»: marcatori ** sbilanciati`);
  if (/(^|[^*])\*(?!\*)/.test(testo.replace(/\*\*/g, ""))) errs.push(`«${dove}»: asterisco singolo/corsivo non ammesso`);
  for (const m of testo.matchAll(/\[([^\]]+)\]\(([^)\s]*)\)/g)) {
    const url = m[2];
    if (!/^(mailto:|tel:|\/|https:\/\/)/.test(url)) errs.push(`«${dove}»: URL non ammesso «${url}» (solo mailto:, tel:, /interno, https://)`);
  }
  const aperti = (testo.match(/\[/g) ?? []).length;
  const linkOk = [...testo.matchAll(/\[([^\]]+)\]\(([^)\s]*)\)/g)].length;
  if (aperti > linkOk) errs.push(`«${dove}»: parentesi quadra senza link ben formato [testo](url)`);
}

/** Numerazione h2 «N. Titolo» progressiva 1..n senza buchi (regola delle
 *  skill + interlock con la numerazione a buchi del tool MCP privacy). */
function checkNumerazione(doc: LegaleDoc, nome: string, errs: string[]): void {
  const numeri = doc.blocks
    .filter((b): b is Extract<LegaleBlock, { type: "h2" }> => b.type === "h2")
    .map((b) => {
      const m = b.text.match(/^(\d+)\.\s+\S/);
      if (!m) errs.push(`«${nome}»: h2 senza numerazione «N. Titolo» («${b.text.slice(0, 40)}»)`);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n !== null);
  numeri.forEach((n, i) => {
    if (n !== i + 1) errs.push(`«${nome}»: numerazione sezioni non progressiva (attesa ${i + 1}, trovata ${n})`);
  });
}

/** Il foro si verifica SOLO nella sezione «Legge applicabile e foro» dei
 *  termini (match sull'h2): un indirizzo come «Via Milano 89» non deve
 *  scattare come falso positivo. */
function checkForo(termini: LegaleDoc, foro: Foro, errs: string[]): void {
  const blocks = termini.blocks;
  const start = blocks.findIndex((b) => b.type === "h2" && /foro/i.test(b.text));
  if (start < 0) {
    errs.push("«termini»: manca la sezione «Legge applicabile e foro competente»");
    return;
  }
  let fine = blocks.length;
  for (let i = start + 1; i < blocks.length; i++)
    if (blocks[i].type === "h2") {
      fine = i;
      break;
    }
  const testo = blocks
    .slice(start, fine)
    .flatMap((b) => (b.type === "ul" ? b.items : [b.text]))
    .join(" ");
  // Cattura SOLO parole maiuscole consecutive («Monza», «Monza Brianza»):
  // «Foro di Monza in via esclusiva» non deve inglobare il seguito minuscolo
  // e «Foro di Monza (foro erariale…)» deve comunque trovare la città
  // (falsi positivi dimostrati dalla review 2026-08-02).
  const fori = [...testo.matchAll(/Foro di\s+([A-ZÀ-Ú][\p{L}'’-]*(?:\s+[A-ZÀ-Ú][\p{L}'’-]*)*)/gu)].map((m) => m[1].trim());
  if (!fori.length) errs.push("«termini» sezione foro: manca «Foro di <città>»");
  for (const f of fori)
    if (normAlnum(f) !== normAlnum(foro.foro))
      errs.push(`«termini» sezione foro: «Foro di ${f}» ≠ foro derivato «${foro.foro}» (foro.json: ${foro.fonte})`);
}

/** Exact-match normalizzati contro il brief: l'anti-invenzione meccanica.
 *  P.IVA a cifre; mailto/tel a cifre/minuscole; denominazione per contenimento
 *  normalizzato (la resa tipografica è libera, le lettere no). */
function checkIdentita(legale: Legale, b: BriefLegale, errs: string[]): void {
  const tuttoTesto = [
    ...testoBlocchi(legale.privacy),
    ...testoBlocchi(legale.termini),
    legale.formNotice,
    legale.privacy.intro,
    legale.termini.intro,
  ].join("\n");
  const den = normAlnum(b.azienda);
  if (!normAlnum(tuttoTesto).includes(den)) errs.push(`denominazione «${b.azienda}» assente dai documenti (confronto normalizzato)`);
  const piva = soloCifre(b.partita_iva);
  // Un solo separatore tra i gruppi di cifre: «12345678903. 20093» (numero +
  // CAP dopo il punto) si ferma al punto+spazio e non ingloba il CAP.
  for (const m of tuttoTesto.matchAll(/(?:p\.?\s?iva|partita\s+iva)[:\s]*(\d+(?:[ .]\d+)*)/gi)) {
    const trovata = soloCifre(m[1]);
    if (trovata && trovata !== piva) errs.push(`P.IVA nei documenti «${trovata}» ≠ brief «${piva}»`);
  }
  if (!soloCifre(tuttoTesto).includes(piva)) errs.push(`P.IVA «${piva}» assente dai documenti`);
  // Ogni e-mail nel testo (anche in chiaro, non solo negli href mailto:) deve
  // essere quella del brief o un recapito istituzionale del Garante.
  const EMAIL_CONSENTITE = new Set([b.email.toLowerCase(), "garante@gpdp.it", "protocollo@pec.gpdp.it"]);
  for (const m of tuttoTesto.matchAll(/(?:mailto:)?([\w.+-]+@[\w.-]+\.[a-z]{2,})/gi)) {
    if (!EMAIL_CONSENTITE.has(m[1].toLowerCase())) errs.push(`e-mail nei documenti «${m[1]}» ≠ brief «${b.email}»`);
  }
  for (const m of tuttoTesto.matchAll(/tel:([+\d]+)/g)) {
    if (soloCifre(m[1]) !== soloCifre(b.telefono)) errs.push(`telefono (href) nei documenti «${m[1]}» ≠ brief «${b.telefono}»`);
  }
}

function checkFormNotice(s: string, b: BriefLegale, errs: string[]): void {
  if (/\n/.test(s)) errs.push("«formNotice»: deve essere un solo paragrafo (niente a-capo)");
  if (s.length > 800) errs.push(`«formNotice»: ${s.length} caratteri > tetto 800`);
  if (!/\]\(\/privacy\)/.test(s)) errs.push("«formNotice»: manca il link all'informativa completa [..](/privacy)");
  // (?![\d-]) esclude «art. 66-bis»: citarlo non è dichiarare la base giuridica.
  if (!/art\.?\s*6(?![\d-])/i.test(s)) errs.push("«formNotice»: manca la base giuridica (art. 6)");
  if (!/garante/i.test(s)) errs.push("«formNotice»: manca il riferimento al reclamo al Garante");
  if (!normAlnum(s).includes(normAlnum(b.azienda))) errs.push("«formNotice»: manca la denominazione del titolare");
}

const RE_DATA = /^\d{2}\/\d{2}\/\d{4}$/;
/** GG/MM/AAAA con valori reali («99/99/2026» non è una data). */
function dataValida(s: string): boolean {
  if (!RE_DATA.test(s)) return false;
  const [g, m, a] = s.split("/").map(Number);
  return g >= 1 && g <= 31 && m >= 1 && m <= 12 && a >= 2020 && a <= 2100;
}

/** Il gate unico: tutte le violazioni, con ancora «doc.blocks[i]» dove utile. */
export function gateLegale(legale: Legale, brief: BriefLegale, foro: Foro | null): string[] {
  const errs: string[] = [];
  for (const key of ["privacy", "termini"] as const) {
    const doc = legale[key];
    if (!dataValida(doc.updatedAt)) errs.push(`«${key}»: updatedAt «${doc.updatedAt}» non è una data reale GG/MM/AAAA`);
    doc.blocks.forEach((bl, i) => {
      const dove = `${key}.blocks[${i}]`;
      if (bl.type === "ul") bl.items.forEach((it) => checkInline(it, dove, errs));
      else checkInline(bl.text, dove, errs);
    });
    checkNumerazione(doc, key, errs);
    checkInline(doc.intro, `${key}.intro`, errs);
  }
  checkInline(legale.formNotice, "formNotice", errs);
  checkFormNotice(legale.formNotice, brief, errs);
  if (foro) checkForo(legale.termini, foro, errs);
  else errs.push("foro.json assente o non valido: la derivazione del foro è obbligatoria prima del gate");
  checkIdentita(legale, brief, errs);
  return errs;
}

/** Harvest dei [DA VERIFICARE …] dalla coda md: vanno nel report, mai online. */
export function harvestDaVerificare(codaMd: string): string[] {
  return [...codaMd.matchAll(/\[DA VERIFICARE[^\]]*\]/gi)].map((m) => m[0]);
}

/* ------------------------------------------------------------------ */
/* formNotice: template deterministico (decisione 2026-08-03)          */
/* ------------------------------------------------------------------ */

/** L'informativa breve del form è il modello APPROVATO sul golden Cavaliere
 *  (catena avversariale + umano + deploy reale): le uniche variabili sono
 *  denominazione ed e-mail — ciò che è fisso per design non passa dall'AI.
 *  Le regole di merito restano nella skill informativa-breve-form, che la
 *  lente conformità legge per giudicare anche questa stringa. */
export function formNoticeTemplate(denominazione: string, email: string): string {
  return (
    `**Informativa privacy (art. 13 GDPR)** — I dati inseriti nel modulo sono trattati da ` +
    `**${denominazione}** ([${email}](mailto:${email})) al solo fine di dare riscontro alla tua ` +
    `richiesta di preventivo o contatto; base giuridica: art. 6, par. 1, lett. b) GDPR ` +
    `(misure precontrattuali), nessun consenso richiesto. Nome e telefono sono necessari per ` +
    `risponderti; e-mail e città sono facoltative. Senza seguito, i dati sono cancellati entro ` +
    `12 mesi. Puoi esercitare i diritti degli artt. 15–21 GDPR e proporre reclamo al Garante. ` +
    `[Informativa completa](/privacy)`
  );
}

/** Oggi in formato GG/MM/AAAA (timbro TS: mai dall'AI). */
export function oggiGGMMAAAA(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/* Conversione completa md → artifact (per il run e le correzioni gate) */
/* ------------------------------------------------------------------ */

export type EsitoConversione = {
  legale: Legale | null;
  /** Errori bloccanti (converter fuori-set + gate unico). */
  errori: string[];
  /** Note instradate al report (blockquote/corsivi dei md). */
  noteReport: Record<string, string[]>;
};

/** Converte i sorgenti md (documenti impattati) + il template formNotice in un
 *  artifact conforme, riusando l'esistente per i documenti non impattati.
 *  Timbra intro/updatedAt e pretende il disclaimer nella CODA di ogni md. */
export function convertiLegale(opts: {
  privacyMd: string | null; // null = riusa esistente
  terminiMd: string | null;
  esistente: Legale | null;
  brief: BriefLegale;
  foro: Foro | null;
}): EsitoConversione {
  const den = formatDenominazione(opts.brief.azienda);
  const errori: string[] = [];
  const noteReport: Record<string, string[]> = {};
  const oggi = oggiGGMMAAAA();

  const daMd = (md: string, key: "privacy" | "termini"): LegaleDoc | null => {
    const { docMd, codaMd } = splitDocCoda(md);
    if (!/non costituisce consulenza legale/i.test(codaMd)) {
      errori.push(`«${key}»: disclaimer «non costituisce consulenza legale» assente dalla coda del md (deve stare nel report)`);
    }
    const conv = mdToBlocks(docMd);
    if (conv.note.length) noteReport[key] = conv.note;
    if (conv.errori.length) {
      errori.push(...conv.errori.map((e) => `«${key}» (md): ${e}`));
      return null;
    }
    if (!conv.blocks.length) {
      errori.push(`«${key}»: nessun blocco convertito dal md`);
      return null;
    }
    return {
      intro: key === "privacy" ? COSTANTI_LEGALE.intro_privacy : COSTANTI_LEGALE.introTermini(den),
      updatedAt: oggi,
      blocks: conv.blocks,
    };
  };

  const privacy = opts.privacyMd !== null ? daMd(opts.privacyMd, "privacy") : opts.esistente?.privacy ?? null;
  const termini = opts.terminiMd !== null ? daMd(opts.terminiMd, "termini") : opts.esistente?.termini ?? null;
  if (opts.privacyMd === null && !opts.esistente?.privacy) errori.push("privacy non impattata ma legale.json esistente assente");
  if (opts.terminiMd === null && !opts.esistente?.termini) errori.push("termini non impattati ma legale.json esistente assente");
  if (!privacy || !termini) return { legale: null, errori, noteReport };

  const legale: Legale = { privacy, termini, formNotice: formNoticeTemplate(den, opts.brief.email) };
  errori.push(...gateLegale(legale, opts.brief, opts.foro));
  return { legale: errori.length ? null : legale, errori, noteReport };
}

/* ------------------------------------------------------------------ */
/* Report: legale-report.md renderizzato in TS dagli artifact           */
/* ------------------------------------------------------------------ */

/** Sezioni della coda di un md («## Titolo» → testo), per il report. */
export function sezioniCoda(codaMd: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parti = codaMd.split(/^## +/m).slice(1);
  for (const p of parti) {
    const nl = p.indexOf("\n");
    const titolo = (nl < 0 ? p : p.slice(0, nl)).trim();
    out[titolo] = nl < 0 ? "" : p.slice(nl + 1).trim();
  }
  return out;
}

export function renderLegaleReport(opts: {
  slug: string;
  profilo: ReturnType<typeof buildProfilo>;
  brief: BriefLegale;
  foro: Foro | null;
  codaPrivacy: string;
  codaTermini: string;
  noteConversione: Record<string, string[]>;
  review: LegaleReview | null;
  mode: string;
  areeCambiate?: string[];
}): string {
  const oggi = oggiGGMMAAAA();
  const sezPrivacy = sezioniCoda(opts.codaPrivacy);
  const sezTermini = sezioniCoda(opts.codaTermini);
  const sezione = (nome: string) =>
    [sezTermini, sezPrivacy]
      .map((s, i) => {
        const chiave = Object.keys(s).find((k) => k.toLowerCase().startsWith(nome.toLowerCase()));
        return chiave ? `**${i === 0 ? "Termini" : "Privacy"}:**\n${s[chiave]}` : null;
      })
      .filter(Boolean)
      .join("\n\n");
  const harvest = [...harvestDaVerificare(opts.codaPrivacy), ...harvestDaVerificare(opts.codaTermini)];
  const note = Object.entries(opts.noteConversione).map(([doc, righe]) => `- (${doc}, instradato dal converter) ${righe.join(" · ")}`);
  const r = opts.review;
  const righeReview = r
    ? [
        `Verdetto: **${r.verdict}** (round ${r.round}) — anti-invenzione ${r.lenti.antiInvenzione} · conformità ${r.lenti.conformita} · refusi ${r.lenti.refusi}`,
        ...r.findings.map((f) => `- [${f.gravita}] (${f.lente}) ${f.doc} · ${f.path}: ${f.problema} — fix: ${f.fix}`),
      ]
    : ["(catena non ancora eseguita su questa versione)"];

  return [
    `# Documenti legali ${opts.profilo.denominazione} — deliverable di generazione (${oggi})`,
    ``,
    `> Deliverable INTERNO all'agenzia: non va online. Run \`${opts.mode}\`${opts.areeCambiate?.length ? ` — aree cambiate: ${opts.areeCambiate.join(", ")}` : ""}.`,
    ``,
    `## Profilo cliente usato (fonte: brief.json / intake verificato)`,
    ``,
    `- Denominazione: ${opts.profilo.denominazione} (forma: ${opts.profilo.forma})`,
    `- Sede: ${opts.brief.indirizzo} — ${opts.brief.citta}`,
    `- P.IVA: ${opts.brief.partita_iva} · e-mail: ${opts.brief.email} · tel: ${opts.brief.telefono}`,
    `- Sito: ${opts.profilo.tc.sito.url} · pubblico B2C: ${COSTANTI_LEGALE.pubblico_b2c ? "sì (clausola consumatore art. 66-bis)" : "no"}`,
    ``,
    `## Derivazione del foro`,
    ``,
    opts.foro
      ? `- Foro: **${opts.foro.foro}** (confidenza: ${opts.foro.confidenza})\n- Fonte: ${opts.foro.fonte}${opts.foro.url ? ` — ${opts.foro.url}` : ""}\n- Evidenza: «${opts.foro.evidenza}»`
      : `- foro.json assente`,
    ``,
    `## Riferimenti normativi citati`,
    ``,
    sezione("Riferimenti normativi") || "(nessuna coda estratta)",
    ``,
    `## Note e avvertenze`,
    ``,
    [...opts.profilo.note.map((n) => `- ${n}`), ...note, sezione("Note e avvertenze")].filter(Boolean).join("\n") || "(nessuna)",
    ``,
    `## Campi mancanti / da verificare`,
    ``,
    [sezione("Campi mancanti"), ...harvest.map((h) => `- ${h}`)].filter(Boolean).join("\n") || "(nessuno)",
    ``,
    `## Esito catena di verifica`,
    ``,
    righeReview.join("\n"),
    ``,
    `> Il presente materiale è un modello generato automaticamente sulla base dei dati`,
    `> forniti dal cliente e non costituisce consulenza legale. Prima della messa online`,
    `> di casi non standard è raccomandata una revisione legale.`,
    ``,
    `*Vigenza delle norme citate verificata alla data di generazione (${oggi}).*`,
    ``,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Fonte per-area (update-mode) e byte-check per-documento              */
/* ------------------------------------------------------------------ */

/** Aree del brief da cui il legale deriva → hash per l'update-mode
 *  (stesso modello di copyFonte). Mappa area→documenti in AREA_DOCS. */
export function legaleFonteDaBrief(brief: Record<string, unknown>): Record<string, string> {
  return {
    "identità": hashValue([brief.azienda, brief.partita_iva]),
    "sede e foro": hashValue([brief.indirizzo, brief.citta]),
    recapiti: hashValue([brief.email, brief.telefono]),
  };
}

export const AREA_DOCS: Record<string, LegaleDocKey[]> = {
  "identità": ["privacy", "termini", "formNotice"],
  "sede e foro": ["privacy", "termini"], // indirizzo nei due doc + ri-derivazione foro; il formNotice non contiene la sede
  recapiti: ["privacy", "termini", "formNotice"],
};

/** «I documenti non citati restano JSON-identici»: il sensore. La granularità
 *  è il DOCUMENTO (privacy/termini/formNotice): dentro un documento corretto
 *  la rinumerazione sposta indici e testi h2, quindi il vincolo per-blocco
 *  non regge (stress-test del piano, punto 2). */
export function byteCheckDocumenti(prima: Legale | null, dopo: Legale | null, citati: LegaleDocKey[]): string | null {
  if (!prima || !dopo) return null; // artifact illeggibile: lo segnala il gate
  const toccati = LEGALE_DOC_KEYS.filter(
    (k) => !citati.includes(k) && JSON.stringify(prima[k]) !== JSON.stringify(dopo[k]),
  );
  return toccati.length
    ? `la correzione ha toccato documenti non autorizzati (dovevano restare identici): ${toccati.join(", ")}`
    : null;
}

/* ------------------------------------------------------------------ */
/* Letture/scritture artifact                                          */
/* ------------------------------------------------------------------ */

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function readLegale(slug: string): Legale | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "legale.json"));
  if (!raw) return null;
  const parsed = LegaleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function readForo(slug: string): Foro | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "foro.json"));
  if (!raw) return null;
  const parsed = ForoSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function readLegaleReview(slug: string): LegaleReview | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "legale-review.json"));
  if (!raw) return null;
  const parsed = LegaleReviewSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
