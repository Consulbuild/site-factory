// Step logo (GPT Image): funzioni PURE e costanti — niente rete, niente sharp.
// Il prompt è codice (le 4 righe approvate il 2026-09-13), il verdetto del
// critico lo calcola fondiReview() da parametri oggettivi: il modello trascrive
// e misura, il TS decide. Banco: scripts/test-logo-gates.ts.
// Import con estensione .ts e solo di tipo verso schemas: il modulo deve girare
// nel banco con `node --experimental-strip-types` (come lib/legale.ts).
import fs from "node:fs";
import path from "node:path";
import { contrastRatio, isHex6 } from "./wcag.ts";
import type { LogoBrief, LogoMetriche, LogoReview, LogoTrace, LogoVariante, PaletteArtifact } from "./schemas";

/** Codici che il critico può emettere (lista chiusa: gli altri vengono scartati da fondiReview). */
export const CODICI_CRITICO_LOGO = ["nome_assente", "illeggibile", "artefatto_testo", "mockup", "fatto_inventato"] as const;

export const LOGO_MODEL = "gpt-image-2.5-sunburst";
export const LOGO_SIZE = "1536x1024";
export const LOGO_QUALITY = "high";
export const LOGO_UPSTREAM = ["palette.json", "contesto.json"];
export const VARIANTE_RE = /^mark-[1-6]\.png$/;
export const VARIANTI_PER_ROUND = 3;
export const MAX_ROUND_LOGO = 2;
export const SCRIPT_LOGO = "scripts/generate-logo.mjs"; // cwd = site-renderer/

/* ---------------- testo ---------------- */

/** Maiuscolo, senza diacritici, & → E, solo [A-Z0-9] e spazi singoli. */
export function normalizza(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/&/g, " E ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export const normalizzaParole = (s: string): string[] => normalizza(s).split(" ").filter(Boolean);

const FORMA_GIURIDICA_RE = /\b(s\.?\s?r\.?\s?l\.?\s?s?\.?|s\.?\s?p\.?\s?a\.?|s\.?\s?n\.?\s?c\.?|s\.?\s?a\.?\s?s\.?|s\.?\s?s\.?|snc|sas|srls?|spa)\b\.?/gi;
/** Ragione sociale senza forma giuridica (per il nome atteso nel logo). */
export const senzaFormaGiuridica = (s: string): string => s.replace(FORMA_GIURIDICA_RE, " ").replace(/\s+/g, " ").trim();

export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/* ---------------- brief e prompt ---------------- */

/** Errori del brief (vuoto = ok). Il nome non può contenere parole assenti dalla ragione sociale. */
export function gateLogoBrief(b: LogoBrief, businessName: string): string[] {
  const errs: string[] = [];
  const ragione = new Set(normalizzaParole(businessName));
  const parole = normalizzaParole(b.nome);
  if (!parole.length) errs.push("nome vuoto");
  for (const p of parole) if (!ragione.has(p)) errs.push(`nome: la parola «${p}» non è nella ragione sociale «${businessName}»`);
  const nMest = b.mestiere_en.trim().split(/\s+/).filter(Boolean).length;
  if (nMest < 4 || nMest > 9) errs.push(`mestiere_en: ${nMest} parole, servono 4-9`);
  if (/\d/.test(b.mestiere_en)) errs.push("mestiere_en: niente cifre o numeri");
  if (!/^[A-Za-z' -]+$/.test(b.mestiere_en.trim())) errs.push("mestiere_en: solo lettere, spazi, trattini e apostrofi");
  if (!b.citta.trim() || /,/.test(b.citta)) errs.push("citta: solo il comune, senza virgole");
  if (!b.regione.trim() || /,/.test(b.regione)) errs.push("regione: solo il nome della regione, senza virgole");
  if (!normalizza(b.alt).includes(normalizza(b.nome))) errs.push("alt: deve contenere il nome");
  return errs;
}

// Le 4 righe approvate da Mattia (v9b, 2026-09-13) + la riga colori come DATI.
// Righe 2 e 3 sono costanti: il banco le verifica byte-identiche.
// Riga 3 aggiornata da Mattia il 2026-09-14: lockup ORIZZONTALE (nome a destra
// del simbolo, mai sotto) — un lockup impilato a 40 px d'altezza rende il nome
// illeggibile nell'header; quello orizzontale sfrutta la larghezza della barra.
export const RIGA_DESIGNER =
  "Design it as a senior brand designer would for a paying client: think the concept through before drawing, so it is distinctive and still clear at small size in the site header.";
export const RIGA_NOME =
  "The logo also shows the name, placed to the right of the symbol and vertically centered on it, never below it: a horizontal lockup.";

export function componiPromptLogo(b: LogoBrief, palette: PaletteArtifact): string {
  const primary = palette["brand.palette.primary"];
  const accent = palette["brand.palette.accent"] ?? primary;
  const colori = accent && accent !== primary ? `${primary} and ${accent}` : primary;
  const mestiere = b.mestiere_en.trim();
  const articolo = /^[aeiou]/i.test(mestiere) ? "an" : "a";
  return [
    `Logo for the website landing page of "${b.nome}", ${articolo} ${mestiere} in ${b.citta.trim()}, ${b.regione.trim()}, Italy.`,
    RIGA_DESIGNER,
    RIGA_NOME,
    `Brand colors to use: ${colori}.`,
  ].join("\n");
}

export const FIX_FALLBACK = "Keep it clean: only the name, the trade and the city as text, one clear symbol, flat solid colors.";
export const FIX_INVENTATI = "No dates, numbers or claims: only the name and, at most, the trade and the city.";
/** Prompt del round 2: le 4 righe + UNA riga di fix (senza a capo, ≤ 240 caratteri). */
export function promptRound2(prompt: string, fix: string | null | undefined): string {
  const riga = (fix ?? "").replace(/\s+/g, " ").trim();
  return `${prompt}\n${riga && riga.length <= 240 ? riga : FIX_FALLBACK}`;
}

/** Ultima riga `ESITO {json}` di uno script (stdout), o null. */
export function parseEsito(righe: string[]): Record<string, unknown> | null {
  for (let i = righe.length - 1; i >= 0; i--) {
    const m = /^ESITO (\{.*\})\s*$/.exec(righe[i]);
    if (m) {
      try {
        return JSON.parse(m[1]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/* ---------------- gate deterministici sulle metriche ---------------- */

/** Codici di scarto senza AI. `bg` = fondo reale dell'header del preset (neutri.bg). */
export function gateVariante(m: LogoMetriche, bg: string): string[] {
  const c: string[] = [];
  if (!m.alpha || m.copertura > 0.9) c.push("sfondo_pieno");
  if (m.bordo_opaco) c.push("tagliato");
  if (m.copertura < 0.005 || m.ink256 < 0.02) c.push("vuoto");
  // Lockup orizzontale (dal 2026-09-14): un lockup impilato (simbolo sopra il
  // nome, ratio ≈1.2-1.8) a 40 px rende il nome illeggibile → scarto; un nome
  // lungo su una riga può arrivare a ratio ≈8.
  if (m.ratio < 2 || m.ratio > 8) c.push("proporzioni");
  const contrasti = m.colori_dominanti.filter((k) => isHex6(k.hex)).map((k) => contrastRatio(k.hex, bg));
  if (isHex6(bg) && contrasti.length && Math.max(...contrasti) < 3) c.push("invisibile_su_header");
  return c;
}

export const MOTIVO_GATE: Record<string, string> = {
  sfondo_pieno: "sfondo non trasparente",
  tagliato: "logo mozzato sul bordo",
  vuoto: "immagine vuota",
  proporzioni: "proporzioni inadatte all'header (serve il lockup orizzontale: nome a destra del simbolo)",
  invisibile_su_header: "colori senza contrasto sul fondo dell'header",
};

/* ---------------- nome e fatti ---------------- */

type TestoLetto = { testo: string; certo: boolean; ruolo: "nome" | "descrittore" | "altro" };
export type EsitoNome = { esito: "ok" | "nome_errato" | "nome_assente" | "incerto"; distanza: number; letto: string };

/**
 * Confronta i testi trascritti dal critico col nome atteso: candidati = ogni
 * elemento «nome» e ogni sequenza di elementi consecutivi (nome su due righe).
 * incerto = distanza 1-2 con una lettura non certa: si ritrascrive una volta.
 */
export function confrontaNome(testi: TestoLetto[], atteso: string): EsitoNome {
  const target = normalizza(atteso);
  if (!testi.length) return { esito: "nome_assente", distanza: Infinity, letto: "" };
  let best: { d: number; letto: string; certo: boolean } | null = null;
  for (let i = 0; i < testi.length; i++) {
    let acc = "";
    let certo = true;
    for (let j = i; j < testi.length; j++) {
      acc = normalizza(`${acc} ${testi[j].testo}`);
      certo = certo && testi[j].certo;
      const d = levenshtein(acc, target);
      if (!best || d < best.d) best = { d, letto: acc, certo };
      if (acc.length > target.length + 12) break;
    }
  }
  if (!best) return { esito: "nome_assente", distanza: Infinity, letto: "" };
  if (best.d === 0) return { esito: "ok", distanza: 0, letto: best.letto };
  if (best.d <= 2 && !best.certo) return { esito: "incerto", distanza: best.d, letto: best.letto };
  if (best.d > Math.max(3, Math.floor(target.length / 2))) return { esito: "nome_assente", distanza: best.d, letto: best.letto };
  return { esito: "nome_errato", distanza: best.d, letto: best.letto };
}

/** Numeri/anni nei testi NON del nome che non compaiono nelle fonti (contesto + intake). */
export function numeriInventati(testi: TestoLetto[], fonti: string): string[] {
  const out: string[] = [];
  for (const t of testi) {
    if (t.ruolo === "nome") continue;
    for (const n of t.testo.match(/\d+/g) ?? []) if (!fonti.includes(n)) out.push(t.testo.trim());
  }
  return [...new Set(out)];
}

/* ---------------- verdetto ---------------- */

export type Bloccante = { codice: string; prova: string };
export type Giudizio = { file: string; bloccanti: Bloccante[]; preferenza: number; classifica: number; motivo: string; incerto: boolean };
// P1–P6 × 4, con P2 («cosa c'è di questo cliente») contato doppio: nelle scelte umane
// del 13/9 il monogramma dell'iniziale, intero, ha battuto ogni simbolo generico di mestiere.
export const PREFERENZA_MAX = 28;
const PESO_P: Record<"P1" | "P2" | "P3" | "P4" | "P5" | "P6", number> = { P1: 1, P2: 2, P3: 1, P4: 1, P5: 1, P6: 1 };
export type Verdetto = { verdict: "PASS" | "FAIL"; scelta: string | null; giudizi: Giudizio[]; incerti: string[]; fix_prompt: string };

const CRITERIO_BLOCCANTE: Record<string, string> = { L1: "illeggibile", L2: "artefatto_testo", L3: "mockup", L4: "fatto_inventato" };

/**
 * Fonde gate duri, trascrizione del critico e sue osservazioni in un verdetto.
 * PASS ⇔ almeno una variante senza bloccanti; scelta = la pulita con la
 * preferenza più alta (spareggi: meno colori, più dettaglio, indice minore).
 */
export function fondiReview(
  varianti: LogoVariante[],
  review: LogoReview | null,
  opts: { nomeAtteso: string; fonti: string; bg: string },
): Verdetto {
  const giudizi: Giudizio[] = varianti.map((v) => {
    const b: Bloccante[] = [];
    const m = v.metriche;
    if (m) for (const c of gateVariante(m, opts.bg)) b.push({ codice: c, prova: MOTIVO_GATE[c] });
    const r = review?.varianti.find((x) => x.file === v.file || x.file === v.file.replace(/^logo\//, ""));
    let incerto = false;
    let pref = 0;
    let classifica = 99;
    if (!r) {
      b.push({ codice: "non_giudicata", prova: "il critico non ha giudicato questa variante" });
    } else {
      const testi = r.testi_letti as TestoLetto[];
      const n = confrontaNome(testi, opts.nomeAtteso);
      if (n.esito === "incerto") incerto = true;
      else if (n.esito !== "ok") b.push({ codice: n.esito, prova: `letto «${n.letto}», atteso «${normalizza(opts.nomeAtteso)}»` });
      for (const t of numeriInventati(testi, opts.fonti)) b.push({ codice: "fatto_inventato", prova: `«${t}»: numero assente dal form` });
      const p = r.punteggi;
      for (const [k, codice] of Object.entries(CRITERIO_BLOCCANTE)) {
        const score = p[k as keyof typeof p];
        if (score === 0 && !b.some((x) => x.codice === codice)) b.push({ codice, prova: r.prove[k] ?? `${k} = 0` });
      }
      for (const x of r.bloccanti) {
        const ok = (CODICI_CRITICO_LOGO as readonly string[]).includes(x.codice) && x.prova.trim().length >= 20;
        if (ok && !b.some((y) => y.codice === x.codice)) b.push({ codice: x.codice, prova: x.prova.trim() });
      }
      pref = (Object.keys(PESO_P) as Array<keyof typeof PESO_P>).reduce((s, k) => s + PESO_P[k] * Math.max(0, Math.min(4, p[k] ?? 0)), 0);
      if (Number.isInteger(r.classifica) && (r.classifica as number) >= 1) classifica = r.classifica as number;
    }
    const motivo = b.length ? b.map((x) => `${x.codice}: ${x.prova}`).join("; ") : (r?.preferenza_motivo ?? `preferenza ${pref}/${PREFERENZA_MAX}`);
    return { file: v.file, bloccanti: b, preferenza: pref, classifica, motivo, incerto };
  });
  const pulite = giudizi.filter((g) => !g.bloccanti.length && !g.incerto);
  const idx = (f: string) => Number(/mark-(\d)/.exec(f)?.[1] ?? 9);
  const met = (f: string) => varianti.find((v) => v.file === f)?.metriche;
  // ordine: totale di preferenza → classifica comparativa del critico → meno colori → più dettaglio → indice
  pulite.sort(
    (a, b) =>
      b.preferenza - a.preferenza ||
      a.classifica - b.classifica ||
      (met(a.file)?.n_colori ?? 99) - (met(b.file)?.n_colori ?? 99) ||
      (met(b.file)?.dettaglio ?? 0) - (met(a.file)?.dettaglio ?? 0) ||
      idx(a.file) - idx(b.file),
  );
  const tuttiInventati = giudizi.length > 0 && giudizi.every((g) => g.bloccanti.some((x) => x.codice === "fatto_inventato"));
  const fixCritico = (review?.fix_prompt ?? "").replace(/\s+/g, " ").trim();
  const fix_prompt = tuttiInventati ? FIX_INVENTATI : fixCritico && fixCritico.length <= 240 ? fixCritico : FIX_FALLBACK;
  return {
    verdict: pulite.length ? "PASS" : "FAIL",
    scelta: pulite[0]?.file ?? null,
    giudizi,
    incerti: giudizi.filter((g) => g.incerto && !g.bloccanti.length).map((g) => g.file),
    fix_prompt,
  };
}

/* ---------------- trace ---------------- */

/** Riscrive gli esiti del trace attorno alla variante scelta (dal critico o dall'operatore). */
export function applicaScelta(trace: LogoTrace, file: string, motivo: string, favicon?: LogoTrace["favicon"]): LogoTrace {
  const varianti = trace.varianti.map((v) => ({
    ...v,
    esito: v.file === file ? ("scelta" as const) : v.esito === "scelta" ? ("usabile" as const) : v.esito,
    ...(v.file === file ? { motivo } : {}),
  }));
  const fav = favicon === undefined ? trace.favicon : favicon;
  const costo = varianti.reduce((s, v) => s + (v.costo_usd ?? 0), 0) + (fav?.costo_usd ?? 0);
  return { ...trace, varianti, scelta: file, motivo, favicon: fav, costo_usd_totale: Math.round(costo * 1000) / 1000 };
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
export function isPng(file: string): boolean {
  try {
    const fd = fs.openSync(file, "r");
    const b = Buffer.alloc(4);
    fs.readSync(fd, b, 0, 4, 0);
    fs.closeSync(fd);
    return b.equals(PNG_MAGIC);
  } catch {
    return false;
  }
}

/** Errori del trace rispetto ai file su disco (vuoto = ok). */
export function validateLogoTrace(dir: string, trace: LogoTrace): string[] {
  const errs: string[] = [];
  if (trace.varianti.length > 6) errs.push("più di 6 varianti");
  for (const v of trace.varianti) if (!isPng(path.join(dir, v.file))) errs.push(`${v.file} assente o non PNG`);
  if (trace.scelta !== null) {
    if (!trace.varianti.some((v) => v.file === trace.scelta)) errs.push(`scelta ${trace.scelta} non è tra le varianti`);
    for (const f of ["mark.png", "favicon.png"]) if (!isPng(path.join(dir, f))) errs.push(`${f} assente o non PNG alla radice del workspace`);
  }
  return errs;
}

/** Argomenti di generate-logo.mjs (cwd = site-renderer/). */
export const generaArgs = (prompt: string, out: string): string[] => [SCRIPT_LOGO, "--prompt", prompt, "--out", out, "--size", LOGO_SIZE, "--quality", LOGO_QUALITY, "--model", LOGO_MODEL];
export const faviconArgs = (dir: string): string[] => [SCRIPT_LOGO, "--favicon-da", path.join(dir, "mark.png"), "--out", path.join(dir, "favicon.png")];
export const contattoArgs = (out: string, files: string[], bg: string): string[] => [SCRIPT_LOGO, "--contatto", out, "--bg", bg, ...files];

/** Il logo scelto entra nell'intake: brand.mark (lockup completo, il nome è già nel PNG) + favicon. */
export function conBrandMark<T extends Record<string, unknown>>(intake: T, alt: string): T {
  return { ...intake, "brand.mark": { src: "./mark.png", alt, lockup: true }, "brand.favicon": "./favicon.png" };
}

/** Testi che il logo può legittimamente mostrare oltre al nome (per il critico). */
export function testiConsentiti(contesto: Record<string, unknown> | null, intake: Record<string, unknown> | null, brief: LogoBrief): string[] {
  const out = new Set<string>([brief.nome, brief.citta, brief.regione]);
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.add(v.trim());
  };
  if (contesto) {
    const c = contesto as Record<string, unknown>;
    push(c.settore_normalizzato);
    push(c.sottosettore);
    const zona = c.zona as Record<string, unknown> | undefined;
    push(zona?.sede);
    for (const m of (c.macro_categorie as Array<Record<string, unknown>> | undefined) ?? []) {
      push(m.nome);
      for (const s of (m.servizi as unknown[]) ?? []) push(s);
    }
  }
  if (intake) {
    push(intake["meta.businessName"]);
    push(intake["meta.city"]);
    push(intake["meta.industry"]);
  }
  return [...out];
}
