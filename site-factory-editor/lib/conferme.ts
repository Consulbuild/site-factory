import fs from "node:fs";
import path from "node:path";
import { clientDir } from "./paths";
import { checkCopertura, type ClientState } from "./schemas";
import { readContesto, writeContesto, readPalette, readCopy, readClientState, patchClientState, writeJson } from "./clients";
import { checkPalette } from "./contrast";
import { validateCopyArtifact } from "./slots";
import { validateImagesTrace, deriveImagesArtifact } from "./images";
import { computeUpstream } from "./staleness";
import { copyFonte, legaleFonte } from "./steps";
import { gateLegale, briefLegale, readForo, readLegale, readLegaleReview } from "./legale";

// Conferma di uno step = «verificato» + i suoi side effect (verificato:true nel
// contesto, images.json derivato, snapshot upstream/fonte). UNA sola
// implementazione, usata sia dalle route POST delle schede (conferma umana)
// sia dalla catena automatica (lib/catena.ts, auto:true → autoConferma).
// Le route restano sottili: ensureClient → confermaX → JSON con lo status qui deciso.

export type EsitoConferma =
  | { ok: true; client: ClientState }
  | { ok: false; status: 404 | 409 | 422 | 500; error: string; extra?: Record<string, unknown> };

export interface OpzioniConferma {
  /** true = confermato dalla catena, non da un umano (steps.<k>.autoConferma). */
  auto?: boolean;
  /** Solo legale: salta i motivi di rifiuto della catena avversariale/foro. */
  override?: boolean;
}

export const IMAGES_UPSTREAM = ["contesto.json", "copy.json", "palette.json"];

type StepConAuto = { autoConferma?: boolean };
const no = (status: 404 | 409 | 422 | 500, error: string, extra?: Record<string, unknown>): EsitoConferma =>
  extra ? { ok: false, status, error, extra } : { ok: false, status, error };
const marca = (step: StepConAuto, auto: boolean | undefined) => {
  if (auto) step.autoConferma = true;
  else delete step.autoConferma;
};

export function leggiBrief(slug: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(path.join(clientDir(slug), "brief.json"), "utf8"));
  } catch {
    return {};
  }
}

/** Intake: nessun gate (i flag _da_verificare restano visibili nell'hub). */
export function confermaIntake(slug: string, o: OpzioniConferma = {}): EsitoConferma {
  const client = patchClientState(slug, (s) => {
    s.steps.intake.stato = "verificato";
    marca(s.steps.intake, o.auto);
  });
  return { ok: true, client };
}

/** Contesto: gate di copertura deterministico, poi verificato:true nel json + stato. */
export function confermaContesto(slug: string, o: OpzioniConferma = {}): EsitoConferma {
  const contesto = readContesto(slug);
  if (!contesto) return no(404, "contesto assente o non valido");
  const problemi = checkCopertura(contesto);
  if (problemi.length) return no(422, "copertura incompleta", { problemi });
  writeContesto(slug, { ...contesto, verificato: true });
  const client = patchClientState(slug, (s) => {
    s.steps.contesto.stato = "verificato";
    marca(s.steps.contesto, o.auto);
  });
  return { ok: true, client };
}

/** Palette: ri-verifica il contrasto AA, poi verificato + snapshot upstream. */
export function confermaPalette(slug: string, o: OpzioniConferma = {}): EsitoConferma {
  const palette = readPalette(slug);
  if (!palette) return no(404, "palette assente o non valida");
  const gate = checkPalette(palette["brand.preset"], palette["brand.palette.primary"], palette["brand.palette.accent"]);
  if (gate.errore) return no(500, gate.errore);
  if (!gate.ok) return no(422, "contrasto WCAG AA non superato", { pairs: gate.pairs });
  const client = patchClientState(slug, (s) => {
    s.steps.palette.stato = "verificato";
    delete s.steps.palette.errore;
    marca(s.steps.palette, o.auto);
    // La conferma fa nascere/aggiorna lo snapshot di staleness anche per
    // artifact pre-GUI (Fase B) che non hanno mai avuto un run.
    s.steps.palette.upstream = computeUpstream(slug, ["contesto.json"]);
  });
  return { ok: true, client };
}

/** Logo (kit del logo-designer): verificato + snapshot sulla palette. */
export function confermaLogo(slug: string, o: OpzioniConferma = {}): EsitoConferma {
  const st = readClientState(slug).steps.logo;
  if (st.stato !== "da_verificare") return no(409, `logo in stato «${st.stato}»: nulla da confermare`);
  const client = patchClientState(slug, (s) => {
    s.steps.logo.stato = "verificato";
    delete s.steps.logo.errore;
    marca(s.steps.logo, o.auto);
    s.steps.logo.upstream = computeUpstream(slug, ["palette.json"]);
  });
  return { ok: true, client };
}

/** Copy: rivalida da disco (32/32), poi verificato + snapshot provenienza. */
export function confermaCopy(slug: string, o: OpzioniConferma = {}): EsitoConferma {
  const copy = readCopy(slug);
  if (!copy) return no(404, "copy assente o non leggibile");
  const errors = validateCopyArtifact(copy);
  if (errors.length) return no(422, "contratto di formato non rispettato", { errors });
  const client = patchClientState(slug, (s) => {
    s.steps.copy.stato = "verificato";
    delete s.steps.copy.errore;
    marca(s.steps.copy, o.auto);
    s.steps.copy.upstream = computeUpstream(slug, ["contesto.json"]);
    s.steps.copy.fonte = copyFonte(slug) ?? undefined;
  });
  return { ok: true, client };
}

/**
 * Immagini: rivalida il set contro il manifest, DERIVA images.json (artifact
 * flat per l'assembler — mai scritto dal modello), poi verificato + upstream.
 */
export function confermaImages(slug: string, o: OpzioniConferma = {}): EsitoConferma {
  const errors = validateImagesTrace(slug);
  if (errors.length) return no(422, "set immagini non conforme al manifest", { errors });
  writeJson(path.join(clientDir(slug), "images.json"), deriveImagesArtifact(slug));
  const client = patchClientState(slug, (s) => {
    s.steps.images.stato = "verificato";
    delete s.steps.images.errore;
    marca(s.steps.images, o.auto);
    s.steps.images.upstream = computeUpstream(slug, IMAGES_UPSTREAM);
  });
  return { ok: true, client };
}

/** Motivi per cui il legale NON è confermabile senza override (catena avversariale, foro). */
export function motiviLegale(slug: string): string[] {
  const review = readLegaleReview(slug);
  const corrente =
    !!review?.giudicatoSu && JSON.stringify(review.giudicatoSu) === JSON.stringify(computeUpstream(slug, ["legale.json"]));
  const foro = readForo(slug);
  return [
    !review ? "la catena di verifica non è mai stata eseguita" : review.verdict !== "PASS" ? "verifica della catena: FAIL" : null,
    review && !corrente ? "la verifica non è aggiornata all'artifact corrente (usa «Riverifica»)" : null,
    foro?.confidenza !== "alta" ? "derivazione del foro a confidenza bassa: va confermata dall'operatore" : null,
  ].filter((m): m is string => !!m);
}

/**
 * Legale: la conferma più severa (costo d'errore legale) — gate unico + motivi
 * della catena avversariale/foro (409, salvo override esplicito), poi verificato
 * + snapshot upstream/fonte.
 */
export function confermaLegale(slug: string, o: OpzioniConferma = {}): EsitoConferma {
  const legale = readLegale(slug);
  if (!legale) return no(422, "nessun legale.json da confermare");
  const b = briefLegale(leggiBrief(slug));
  if ("errore" in b) return no(422, b.errore);
  const errs = gateLegale(legale, b, readForo(slug));
  if (errs.length) return no(422, "gate legale non superato", { errors: errs.slice(0, 10) });
  if (!o.override) {
    const motivi = motiviLegale(slug);
    if (motivi.length) return no(409, motivi.join("; "));
  }
  const client = patchClientState(slug, (s) => {
    s.steps.legale.stato = "verificato";
    s.steps.legale.upstream = computeUpstream(slug, ["brief.json"]);
    s.steps.legale.fonte = legaleFonte(slug) ?? undefined;
    delete s.steps.legale.errore;
    marca(s.steps.legale, o.auto);
  });
  return { ok: true, client };
}

/** Build: solo una build completa in da_verificare si conferma. */
export function confermaBuild(slug: string, o: OpzioniConferma = {}): EsitoConferma {
  const build = readClientState(slug).steps.build;
  if (build.stato !== "da_verificare") return no(409, `build in stato «${build.stato}»: nulla da confermare`);
  if (build.partial) return no(409, "l'ultima build è PARZIALE (segnaposto del blueprint): si conferma solo una build completa");
  const client = patchClientState(slug, (s) => {
    s.steps.build.stato = "verificato";
    delete s.steps.build.errore;
    marca(s.steps.build, o.auto);
  });
  return { ok: true, client };
}

/** Risposta JSON standard delle route di conferma. */
export function rispostaConferma(r: EsitoConferma): { body: Record<string, unknown>; status: number } {
  return r.ok ? { body: { ok: true, client: r.client }, status: 200 } : { body: { error: r.error, ...(r.extra ?? {}) }, status: r.status };
}
