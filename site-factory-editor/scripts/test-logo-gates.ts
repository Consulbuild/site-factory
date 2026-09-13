// Banco di prova deterministico dello step logo (nessuna rete, nessuna immagine
// reale): brief e prompt, gate sulle metriche, confronto del nome trascritto,
// numeri inventati, fusione del verdetto (anti-falso-negativo), trace.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-logo-gates.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  gateLogoBrief,
  componiPromptLogo,
  RIGA_DESIGNER,
  RIGA_NOME,
  promptRound2,
  FIX_FALLBACK,
  FIX_INVENTATI,
  parseEsito,
  gateVariante,
  levenshtein,
  confrontaNome,
  numeriInventati,
  fondiReview,
  applicaScelta,
  validateLogoTrace,
  senzaFormaGiuridica,
  VARIANTE_RE,
} from "../lib/logo.ts";
import { agenteDaFase } from "../lib/agenti.ts";
// Solo tipi da schemas (import erasato da strip-types: schemas.ts non è caricabile qui).
import type { LogoMetriche, LogoTrace, LogoVariante, LogoReview } from "../lib/schemas.ts";
// I JSON del critico/trace qui sono già nella forma post-parse (default applicati).
const rev = (r: { round: number; varianti: unknown[]; fix_prompt?: string | null }): LogoReview => ({ fix_prompt: null, ...r } as LogoReview);

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}

const BUSINESS = "COSTRUZIONI GENERALI A. L. DI LA CECILIA GIOVANNI";
const brief = { nome: "LA CECILIA", mestiere_en: "family-run bathroom renovation company", citta: "San Severo", regione: "Puglia", alt: "Logo di La Cecilia, ristrutturazioni di bagni a San Severo" };
const palette = { "brand.preset": "meridian", "brand.palette.primary": "#2f568e", "brand.palette.accent": "#c98a1b" } as const;

console.log("\nbrief:");
caso("brief buono → nessun errore", gateLogoBrief(brief, BUSINESS).length === 0, gateLogoBrief(brief, BUSINESS));
caso("nome con parola inventata → errore", gateLogoBrief({ ...brief, nome: "ROSSI IMPIANTI" }, "TERMOIDRAULICA ROSSI").some((e) => e.includes("IMPIANTI")));
caso("accenti nel nome tollerati (CAFFÈ vs CAFFE)", gateLogoBrief({ ...brief, nome: "CAFFÈ ROMA", alt: "Logo di Caffè Roma" }, "CAFFE ROMA SRL").length === 0);
caso("mestiere_en con cifra → errore", gateLogoBrief({ ...brief, mestiere_en: "renovation company since 1990" }, BUSINESS).some((e) => e.includes("cifre")));
caso("mestiere_en troppo corto → errore", gateLogoBrief({ ...brief, mestiere_en: "renovation company" }, BUSINESS).some((e) => e.includes("parole")));
caso("citta con virgola → errore", gateLogoBrief({ ...brief, citta: "San Severo, Foggia" }, BUSINESS).some((e) => e.startsWith("citta")));
caso("alt senza nome → errore", gateLogoBrief({ ...brief, alt: "Logo aziendale" }, BUSINESS).some((e) => e.startsWith("alt")));
caso("senzaFormaGiuridica", senzaFormaGiuridica("CAVALIERE BUILD SRLS") === "CAVALIERE BUILD" && senzaFormaGiuridica("Rossi S.r.l.") === "Rossi" && senzaFormaGiuridica("Marini S.p.A.") === "Marini");

console.log("\nprompt:");
const prompt = componiPromptLogo(brief, palette);
const righe = prompt.split("\n");
caso("4 righe", righe.length === 4, righe.length);
caso("riga 1: nome tra virgolette, mestiere, città, regione, Italy", righe[0] === 'Logo for the website landing page of "LA CECILIA", a family-run bathroom renovation company in San Severo, Puglia, Italy.', righe[0]);
caso("righe 2-3 byte-identiche alle costanti", righe[1] === RIGA_DESIGNER && righe[2] === RIGA_NOME);
caso("riga 4: i due hex della palette", righe[3] === "Brand colors to use: #2f568e and #c98a1b.", righe[3]);
caso("accent = primary → un solo colore", componiPromptLogo(brief, { ...palette, "brand.palette.accent": "#2f568e" }).split("\n")[3] === "Brand colors to use: #2f568e.");
caso("round 2: fix di una riga → 5 righe", promptRound2(prompt, "Use a single symbol.").split("\n").length === 5);
caso("round 2: fix con a capo viene appiattito", !promptRound2(prompt, "Use a\nsingle symbol.").split("\n")[4].includes("\n") && promptRound2(prompt, "Use a\nsingle symbol.").split("\n").length === 5);
caso("round 2: fix troppo lungo → fallback", promptRound2(prompt, "x".repeat(300)).endsWith(FIX_FALLBACK));
caso("round 2: fix nullo → fallback", promptRound2(prompt, null).endsWith(FIX_FALLBACK));

console.log("\nparseEsito:");
caso("ultima riga ESITO", parseEsito(["OK — x", 'ESITO {"costo_usd":0.08}'])?.costo_usd === 0.08);
caso("ESITO non ultima riga", parseEsito(['ESITO {"a":1}', "altro"])?.a === 1);
caso("nessuna riga → null", parseEsito(["OK"]) === null);
caso("JSON rotto → null", parseEsito(["ESITO {a"]) === null);

console.log("\ngate sulle metriche:");
const buona: LogoMetriche = { alpha: true, copertura: 0.3, bordo_opaco: false, width: 1300, height: 700, ratio: 1.86, larghezza_a_40px: 74, colori_dominanti: [{ hex: "#1e3a8a", quota: 0.6 }, { hex: "#f97316", quota: 0.3 }], n_colori: 2, ink40: 0.4, ink256: 0.42, dettaglio: 0.95, bbox_simbolo: null };
const BG = "#ffffff";
caso("variante buona → nessun codice", gateVariante(buona, BG).length === 0, gateVariante(buona, BG));
caso("senza alpha → sfondo_pieno", gateVariante({ ...buona, alpha: false }, BG).includes("sfondo_pieno"));
caso("copertura 0.95 → sfondo_pieno", gateVariante({ ...buona, copertura: 0.95 }, BG).includes("sfondo_pieno"));
caso("bordo opaco → tagliato", gateVariante({ ...buona, bordo_opaco: true }, BG).includes("tagliato"));
caso("copertura 0.001 → vuoto", gateVariante({ ...buona, copertura: 0.001, ink256: 0.001 }, BG).includes("vuoto"));
caso("ratio 0.2 → proporzioni", gateVariante({ ...buona, ratio: 0.2 }, BG).includes("proporzioni"));
caso("ratio 7 → proporzioni", gateVariante({ ...buona, ratio: 7 }, BG).includes("proporzioni"));
caso("colori chiarissimi su bianco → invisibile_su_header", gateVariante({ ...buona, colori_dominanti: [{ hex: "#f2f2f2", quota: 1 }] }, BG).includes("invisibile_su_header"));
caso("colore scuro su header scuro → invisibile", gateVariante({ ...buona, colori_dominanti: [{ hex: "#111111", quota: 1 }] }, "#0a0a0f").includes("invisibile_su_header"));
caso("un colore chiaro tra i dominanti basta su header scuro", !gateVariante({ ...buona, colori_dominanti: [{ hex: "#111111", quota: 0.7 }, { hex: "#ffffff", quota: 0.3 }] }, "#0a0a0f").includes("invisibile_su_header"));

console.log("\nnome:");
caso("levenshtein", levenshtein("ROSSI", "ROSI") === 1 && levenshtein("", "AB") === 2 && levenshtein("CECILIA", "CECILIA") === 0);
const T = (testo: string, ruolo: "nome" | "descrittore" | "altro" = "nome", certo = true) => ({ testo, ruolo, certo });
caso("nome su due righe unite = ok", confrontaNome([T("TERMOIDRAULICA"), T("ROSSI"), T("PADRE E FIGLIO", "descrittore")], "TERMOIDRAULICA ROSSI").esito === "ok");
caso("nome esatto = ok", confrontaNome([T("LA CECILIA"), T("RISTRUTTURAZIONI BAGNI", "descrittore")], "LA CECILIA").esito === "ok");
caso("diacritici tollerati", confrontaNome([T("La Cecília")], "LA CECILIA").esito === "ok");
caso("forma giuridica strippata a monte", confrontaNome([T("CAVALIERE BUILD")], senzaFormaGiuridica("CAVALIERE BUILD SRLS")).esito === "ok");
caso("ROSI certo → nome_errato", confrontaNome([T("TERMOIDRAULICA"), T("ROSI")], "TERMOIDRAULICA ROSSI").esito === "nome_errato");
caso("ROSI incerto → incerto (si ritrascrive)", confrontaNome([T("TERMOIDRAULICA"), T("ROSI", "nome", false)], "TERMOIDRAULICA ROSSI").esito === "incerto");
caso("solo descrittore, niente nome → nome_assente", confrontaNome([T("RISTRUTTURAZIONI BAGNI", "descrittore")], "LA CECILIA").esito === "nome_assente");
caso("nessun testo → nome_assente", confrontaNome([], "LA CECILIA").esito === "nome_assente");

console.log("\nnumeri inventati:");
const fontiRossi = JSON.stringify({ identita: { frase: "Termoidraulica di Bergamo, padre e figlio" } });
caso("DAL 1985 senza fonte → inventato", numeriInventati([T("TERMOIDRAULICA ROSSI"), T("PADRE E FIGLIO · DAL 1985 · BERGAMO", "descrittore")], fontiRossi).length === 1);
caso("DAL 1985 con fonte → ok", numeriInventati([T("PADRE E FIGLIO · DAL 1985", "descrittore")], fontiRossi + " dal 1985").length === 0);
caso("numeri nel nome non contano", numeriInventati([T("STUDIO 33", "nome")], "").length === 0);
caso("«BAGNI IN 5 GIORNI» con fonte → ok", numeriInventati([T("BAGNI IN 5 GIORNI", "descrittore")], "bagno completo in 5 giorni").length === 0);

console.log("\nfondiReview:");
const V = (n: number, m: Partial<LogoMetriche> = {}): LogoVariante => ({ file: `logo/mark-${n}.png`, round: 1, esito: "usabile", costo_usd: 0.08, metriche: { ...buona, ...m } });
const P = (P1: number, P2: number, P3: number, P4: number, P5: number, P6: number) => ({ L1: 2, L2: 2, L3: 2, L4: 2, L5: 1, P1, P2, P3, P4, P5, P6 });
const R = (file: string, over: Record<string, unknown> = {}) => ({ file, testi_letti: [T("LA CECILIA"), T("RISTRUTTURAZIONI BAGNI", "descrittore")], punteggi: P(4, 4, 4, 4, 4, 4), prove: { L1: "40 px: nome leggibile" }, bloccanti: [], preferenza_motivo: "pulita", ...over });
const opts = { nomeAtteso: "LA CECILIA", fonti: "ristrutturazioni bagni San Severo", bg: BG };
const review1 = rev({ round: 1, varianti: [R("logo/mark-1.png"), R("logo/mark-2.png", { punteggi: P(4, 4, 4, 4, 3, 4) }), R("logo/mark-3.png")], fix_prompt: null });
const v1 = fondiReview([V(1), V(2), V(3)], review1, opts);
caso("tre pulite → PASS", v1.verdict === "PASS");
caso("scelta = preferenza massima (mark-1 e mark-3 a 28, spareggio indice → mark-1)", v1.scelta === "logo/mark-1.png" && v1.giudizi[0].preferenza === 28, v1.scelta);
const v1b = fondiReview([V(1, { n_colori: 4 }), V(2), V(3, { n_colori: 2 })], review1, opts);
caso("spareggio: meno colori vince", v1b.scelta === "logo/mark-3.png", v1b.scelta);
const reviewClassifica = rev({ round: 1, varianti: [R("logo/mark-1.png", { classifica: 2 }), R("logo/mark-3.png", { classifica: 1 })], fix_prompt: null });
caso("a pari totale la classifica del critico batte i colori", fondiReview([V(1, { n_colori: 2 }), V(3, { n_colori: 6 })], reviewClassifica, opts).scelta === "logo/mark-3.png");
const reviewTotale = rev({ round: 1, varianti: [R("logo/mark-1.png", { classifica: 2, punteggi: P(4, 4, 4, 4, 4, 4) }), R("logo/mark-2.png", { classifica: 1, punteggi: P(4, 4, 4, 4, 4, 2) })], fix_prompt: null });
caso("il totale P1–P6 batte la classifica (P6 forme incomplete: mark-2 a 26)", fondiReview([V(1), V(2)], reviewTotale, opts).scelta === "logo/mark-1.png");
const reviewClamp = rev({ round: 1, varianti: [R("logo/mark-1.png", { punteggi: { ...P(4, 4, 4, 4, 4, 4), P1: 9, P2: -3 } })], fix_prompt: null });
caso("punteggi fuori scala → clamp 0–4 (9 e -3 → 4 e 0 = 20)", fondiReview([V(1)], reviewClamp, opts).giudizi[0].preferenza === 20);
const reviewP2 = rev({ round: 1, varianti: [R("logo/mark-1.png", { punteggi: P(4, 2, 4, 4, 4, 4) }), R("logo/mark-3.png", { punteggi: P(2, 4, 4, 4, 4, 4) })], fix_prompt: null });
caso("P2 pesa doppio: iniziale intera (P2 4, P1 2) batte simbolo generico (P2 2, P1 4)", fondiReview([V(1), V(3)], reviewP2, opts).scelta === "logo/mark-3.png");
const reviewFail = rev({ round: 1, varianti: [R("logo/mark-1.png", { verdict: "FAIL", bloccanti: [{ codice: "cliche", prova: "è una goccia, troppo comune e banale" }] })], fix_prompt: "Try again" });
const v2 = fondiReview([V(1)], reviewFail, opts);
caso("bloccante con codice fuori lista (cliché) → ignorato, PASS", v2.verdict === "PASS" && v2.giudizi[0].bloccanti.length === 0);
const reviewProvaCorta = rev({ round: 1, varianti: [R("logo/mark-1.png", { bloccanti: [{ codice: "mockup", prova: "scena" }] })] });
caso("bloccante senza prova sufficiente → ignorato", fondiReview([V(1)], reviewProvaCorta, opts).verdict === "PASS");
const reviewMockup = rev({ round: 1, varianti: [R("logo/mark-1.png", { punteggi: { L1: 2, L2: 2, L3: 0, L4: 2, L5: 1, P1: 1, P2: 1, P3: 1, P4: 1, P5: 1 }, prove: { L3: "512 px: il logo è stampato su un biglietto da visita fotografato" } })] });
const v3 = fondiReview([V(1)], reviewMockup, opts);
caso("L3 = 0 senza bloccante → mockup aggiunto dal TS, FAIL", v3.verdict === "FAIL" && v3.giudizi[0].bloccanti.some((b) => b.codice === "mockup"));
const reviewNome = rev({ round: 1, varianti: [R("logo/mark-1.png", { testi_letti: [T("LA CECILA")] })] });
caso("nome storpiato → nome_errato, FAIL", fondiReview([V(1)], reviewNome, opts).giudizi[0].bloccanti.some((b) => b.codice === "nome_errato"));
const reviewIncerto = rev({ round: 1, varianti: [R("logo/mark-1.png", { testi_letti: [T("LA CECILA", "nome", false)] })] });
const v4 = fondiReview([V(1)], reviewIncerto, opts);
caso("nome incerto → non scelta, segnalata in incerti", v4.scelta === null && v4.incerti.includes("logo/mark-1.png"));
const reviewInv = rev({ round: 1, varianti: [R("logo/mark-1.png", { testi_letti: [T("LA CECILIA"), T("DAL 1970", "descrittore")] })] });
const v5 = fondiReview([V(1)], reviewInv, opts);
caso("anno inventato → fatto_inventato, FAIL, fix mirato", v5.verdict === "FAIL" && v5.giudizi[0].bloccanti[0].codice === "fatto_inventato" && v5.fix_prompt === FIX_INVENTATI);
caso("variante non giudicata dal critico → non scelta", fondiReview([V(1), V(2)], rev({ round: 1, varianti: [R("logo/mark-2.png")] }), opts).scelta === "logo/mark-2.png");
caso("gate duro batte il critico (sfondo pieno → scartata anche se pulita)", fondiReview([V(1, { alpha: false })], review1, opts).verdict === "FAIL");
caso("review assente → FAIL", fondiReview([V(1)], null, opts).verdict === "FAIL");
caso("critico accetta file senza prefisso logo/", fondiReview([V(1)], rev({ round: 1, varianti: [R("mark-1.png")] }), opts).verdict === "PASS");
caso("fix_prompt del critico usato se valido", fondiReview([V(1)], reviewMockup, opts).fix_prompt === FIX_FALLBACK);
caso("descrittore vero sotto il nome non boccia", fondiReview([V(1)], rev({ round: 1, varianti: [R("logo/mark-1.png", { testi_letti: [T("LA CECILIA"), T("RISTRUTTURAZIONI BAGNI · SAN SEVERO", "descrittore")] })] }), opts).verdict === "PASS");

console.log("\ntrace:");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "logo-gates-"));
fs.mkdirSync(path.join(tmp, "logo"));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const n of [1, 2, 3]) fs.writeFileSync(path.join(tmp, "logo", `mark-${n}.png`), PNG);
const trace: LogoTrace = { model: "gpt-image-2.5-sunburst", nome: "LA CECILIA", prompt, round: 1, scelta: null, varianti: [V(1), V(2), V(3)], favicon: null };
caso("trace senza scelta, PNG presenti → valido", validateLogoTrace(tmp, trace).length === 0, validateLogoTrace(tmp, trace));
const scelto = applicaScelta(trace, "logo/mark-2.png", "critico: preferenza 10", { via: "edits", costo_usd: 0.013 });
caso("applicaScelta: esiti e costo totale", scelto.scelta === "logo/mark-2.png" && scelto.varianti[1].esito === "scelta" && scelto.varianti[0].esito === "usabile" && scelto.costo_usd_totale === 0.253, scelto.costo_usd_totale);
caso("applicaScelta: la vecchia scelta torna usabile", applicaScelta(scelto, "logo/mark-1.png", "operatore").varianti[1].esito === "usabile");
caso("scelta senza mark.png alla radice → errore", validateLogoTrace(tmp, scelto).some((e) => e.includes("mark.png")));
fs.writeFileSync(path.join(tmp, "mark.png"), PNG);
fs.writeFileSync(path.join(tmp, "favicon.png"), Buffer.from("non png"));
caso("favicon non PNG → errore", validateLogoTrace(tmp, scelto).some((e) => e.includes("favicon.png")));
fs.writeFileSync(path.join(tmp, "favicon.png"), PNG);
caso("kit completo → valido", validateLogoTrace(tmp, scelto).length === 0, validateLogoTrace(tmp, scelto));
caso("scelta non tra le varianti → errore", validateLogoTrace(tmp, { ...scelto, scelta: "logo/mark-5.png" }).some((e) => e.includes("non è tra")));
caso("VARIANTE_RE", VARIANTE_RE.test("mark-6.png") && !VARIANTE_RE.test("mark-7.png") && !VARIANTE_RE.test("mark-1.svg") && !VARIANTE_RE.test("../mark-1.png"));
fs.rmSync(tmp, { recursive: true, force: true });

console.log("\nagenti:");
caso("«logo-critic (round 1)» → critico", agenteDaFase("logo-critic (round 1)").key === "critico", agenteDaFase("logo-critic (round 1)"));
caso("«logo-designer (brief)» → logo", agenteDaFase("logo-designer (brief)").key === "logo", agenteDaFase("logo-designer (brief)"));

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
