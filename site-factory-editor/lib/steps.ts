import fs from "node:fs";
import path from "node:path";
import { OUT_DIR } from "./paths";
import { checkCopertura, type Contesto } from "./schemas";
import {
  readContesto,
  readClientState,
  readPalette,
  readCopy,
  readCopyCoverage,
  readCopyReview,
  readImagesTrace,
  readImageReview,
  readLavori,
  patchClientState,
  type Brief,
} from "./clients";
import { checkCoperturaCopy } from "./slots-shared";
import { snapshotFonte, driftLabels } from "./contesto-sync";
import { checkPalette } from "./contrast";
import { computeUpstream, hashValue } from "./staleness";
import { validateCopyArtifact, type CopyArtifact } from "./slots";
import { checkSlop, type SlopReport, type SlopResult } from "./slop";
import { expectedImages, probeBfl, validateImagesTrace } from "./images";
import { buildRun } from "./build";
import { getSecret } from "./secrets";
import { assignDesign, writeDesign, readDesign, registraAssegnazione, hueBucket } from "./assign-design.ts";
import type { RunEvent, PhaseResult, StepIO } from "./run-step";

// Registry degli step AI. Ogni step orchestra in TS le proprie fasi
// `claude -p` dentro run() (il seam multi-fase: copywriter→critico→correzioni
// sono più spawn, il loop di decisione è deterministico). Nuovi step = nuove
// entry qui, NON nuove route. Il gate d'ingresso, l'artifact a monte
// (staleness) e la validazione post-run restano dichiarativi.

export type StepKey = "contesto" | "palette" | "copy" | "images" | "build";
// "lavori" = side-run dello step immagini: scrive alt/didascalia delle foto reali
// (lavori.json) SENZA toccare lo stato verificato di hero/card (vedi runStep).
export type RunMode = "generate" | "update" | "critic" | "regen" | "partial" | "lavori";
export interface RunCtx {
  mode: RunMode;
  /** Solo mode "regen" (immagini): file da rigenerare, es. ["img/card-2.jpg"]. */
  files?: string[];
}

export interface StepDef {
  stateKey: StepKey;
  /** File prodotto, relativo a out/<slug>/. */
  artifact: string;
  /** Artifact a monte, per lo snapshot di staleness (lib/staleness.ts). */
  upstream: string[];
  /** Prerequisito del run: ritorna il messaggio d'errore se NON eseguibile. */
  gate?(slug: string, mode?: RunMode): string | null;
  /** Orchestrazione delle fasi `claude -p` (io.claude). L'esito è il return. */
  run(slug: string, ctx: RunCtx, io: StepIO): AsyncGenerator<RunEvent, PhaseResult>;
  /** Valida + normalizza l'artifact appena scritto. */
  validate(slug: string): { ok: boolean; errore?: string };
  /** Hook post-successo (aggiorna provenienza/drift/upstream). */
  afterSuccess?(slug: string): void;
}

function readBrief(slug: string): Brief | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT_DIR, slug, "brief.json"), "utf8")) as Brief;
  } catch {
    return null;
  }
}

// Tool delle fasi "form-only": niente rete (no invenzioni dal web), niente Bash/Edit.
const READ_SKILL_WRITE = ["Read", "Skill", "Write"];
const NO_NET_NO_BASH = ["WebSearch", "WebFetch", "Bash", "Edit", "Task"];

function contestoPrompt(slug: string, mode: RunMode): string {
  const inputs = `Input: site-renderer/out/${slug}/brief.json e site-renderer/out/${slug}/raw-submission.json.`;
  if (mode === "update") {
    // Le etichette dei campi cambiati arrivano dal drift registrato in client.json.
    const changed = driftLabels(readClientState(slug).steps.contesto.drift ?? []);
    return (
      `Il cliente «${slug}» HA GIÀ un contesto curato da un umano in site-renderer/out/${slug}/contesto.json. ` +
      `L'intake è stato corretto: i campi cambiati sono [${changed.join(", ")}]. ` +
      `Usa la skill context-enricher in MODALITÀ AGGIORNAMENTO (vedi sezione dedicata): leggi prima il contesto esistente, ` +
      `poi rivedi SOLO le parti derivate dai campi cambiati (mappa d'impatto nella skill), PRESERVANDO tutto il resto e la ` +
      `curatela umana (servizi aggiunti/rinominati/spostati, macro, promesse curate, note_operatore). Non rigenerare da zero. ` +
      `${inputs} Riscrivi site-renderer/out/${slug}/contesto.json. Solo quel file, poi una riga di conferma.`
    );
  }
  return (
    `Usa la skill context-enricher per il cliente «${slug}».\n${inputs}\n` +
    `Scrivi SOLO il file site-renderer/out/${slug}/contesto.json secondo lo schema della skill. ` +
    `Nessun altro file, nessun altro output oltre la riga di conferma finale.`
  );
}

export const STEPS: Record<StepKey, StepDef> = {
  contesto: {
    stateKey: "contesto",
    artifact: "contesto.json",
    // Il contesto ha già il meccanismo fine fonte/drift: niente hash upstream.
    upstream: [],
    gate: (slug) =>
      readClientState(slug).steps.intake.stato === "verificato"
        ? null
        : "Prima verifica i dati dell'intake: il contesto si genera dai dati corretti.",
    run: async function* (slug, ctx, io) {
      return yield* io.claude({
        phase: ctx.mode === "update" ? "context-enricher (aggiornamento)" : "context-enricher",
        prompt: contestoPrompt(slug, ctx.mode),
        allowed: READ_SKILL_WRITE,
        disallowed: NO_NET_NO_BASH,
      });
    },
    validate(slug) {
      const raw = readContesto(slug);
      if (!raw) return { ok: false, errore: "contesto.json non scritto o non valido (schema Zod)" };
      const problemi = checkCopertura(raw);
      if (problemi.length) return { ok: false, errore: "copertura servizi incompleta: " + problemi.join("; ") };
      // La GUI è autorevole sui meta: il modello non inventa date/versioni.
      const stamped: Contesto = {
        ...raw,
        version: 1,
        verificato: false,
        submissionId: String(readBrief(slug)?.submissionId ?? ""),
        generatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(OUT_DIR, slug, "contesto.json"), JSON.stringify(stamped, null, 2) + "\n");
      return { ok: true };
    },
    afterSuccess(slug) {
      // Nuovo allineamento: aggiorna lo snapshot di provenienza e azzera il drift.
      const brief = readBrief(slug);
      if (!brief) return;
      patchClientState(slug, (s) => {
        s.steps.contesto.fonte = snapshotFonte(brief);
        s.steps.contesto.drift = [];
      });
    },
  },

  palette: {
    stateKey: "palette",
    artifact: "palette.json",
    upstream: ["contesto.json"],
    gate: (slug) =>
      readClientState(slug).steps.contesto.stato === "verificato"
        ? null
        : "Prima conferma il contesto: la palette si progetta sul contesto curato.",
    run: async function* (slug, _ctx, io) {
      // Pre-fase deterministica (M8): il PRESET lo decide l'assegnazione,
      // non l'AI — la skill sceglie SOLO primary+accent contro i suoi neutri.
      yield { type: "phase", label: "Assegnazione deterministica del design" };
      let design;
      try {
        design = assignDesign(slug);
        writeDesign(slug, design);
      } catch (e) {
        return { ok: false, error: `assegnazione design fallita: ${e instanceof Error ? e.message : e}` };
      }
      yield { type: "text", text: `Preset assegnato: ${design.preset} — ${design.motivo}` };
      const vincoloHue = design.vincoliPalette.hueBucketEvitare.length
        ? `VINCOLO ANTI-COLLISIONE (nello stesso mercato ${design.preset} è già usato con quelle tinte): il PRIMARY non deve cadere nelle famiglie di tinta ${design.vincoliPalette.hueBucketEvitare.join(", ")} (bucket = floor(hue/30°), 0–11).\n`
        : "";
      if (vincoloHue) yield { type: "text", text: vincoloHue.trim() };
      return yield* io.claude({
        phase: "palette-designer",
        prompt:
          `Usa la skill palette-designer per il cliente «${slug}».\n` +
          `IL PRESET È GIÀ DECISO dall'assegnazione deterministica (site-renderer/out/${slug}/design.json): «${design.preset}» ` +
          `— ${design.motivo}. NON sceglierlo tu: scegli SOLO primary e accent contro i neutri di ${design.preset}.\n` +
          vincoloHue +
          `Input primario: site-renderer/out/${slug}/contesto.json (contesto curato e verificato dall'umano); ` +
          `secondario site-renderer/out/${slug}/brief.json per il verbatim.\n` +
          `Gate di contrasto (obbligatorio, dalla root del repo): scrivi le coppie in site-renderer/out/${slug}/coppie.json ` +
          `ed esegui \`node .claude/skills/palette-designer/check-contrast.mjs site-renderer/out/${slug}/coppie.json\` — deve uscire con codice 0.\n` +
          `Poi scrivi SOLO site-renderer/out/${slug}/palette.json in formato flat slot-map, esattamente queste 3 chiavi:\n` +
          `{"brand.preset": "${design.preset}", "brand.palette.primary": "#……", "brand.palette.accent": "#……"}\n` +
          `Nessun altro file oltre coppie.json e palette.json. Chiudi con UNA riga: la palette scelta e perché.`,
        // Bash SOLO per il gate di contrasto della skill (matcher a prefisso).
        allowed: [...READ_SKILL_WRITE, "Bash(node .claude/skills/palette-designer/check-contrast.mjs:*)"],
        disallowed: ["WebSearch", "WebFetch", "Edit", "Task"],
      });
    },
    validate(slug) {
      // coppie.json è un file di lavoro del gate: non deve restare nel workspace.
      fs.rmSync(path.join(OUT_DIR, slug, "coppie.json"), { force: true });
      const palette = readPalette(slug);
      if (!palette) return { ok: false, errore: "palette.json non scritto o non valido (preset/hex)" };
      // M8: il preset deve essere quello dell'assegnazione deterministica
      const design = readDesign(slug);
      if (design && palette["brand.preset"] !== design.preset) {
        return {
          ok: false,
          errore: `preset "${palette["brand.preset"]}" ≠ assegnazione "${design.preset}": il preset non lo sceglie la skill`,
        };
      }
      if (design?.vincoliPalette.hueBucketEvitare.includes(hueBucket(palette["brand.palette.primary"]))) {
        return {
          ok: false,
          errore: `primary ${palette["brand.palette.primary"]} cade in una famiglia di tinta vietata dall'anti-collisione (bucket ${hueBucket(palette["brand.palette.primary"])})`,
        };
      }
      const gate = checkPalette(palette["brand.preset"], palette["brand.palette.primary"], palette["brand.palette.accent"]);
      if (gate.errore) return { ok: false, errore: gate.errore };
      if (!gate.ok) {
        const falliti = gate.pairs
          .filter((p) => !p.pass)
          .map((p) => `${p.name}: ${p.ratio.toFixed(2)}:1 < ${p.need}`)
          .join("; ");
        return { ok: false, errore: `contrasto WCAG AA non superato — ${falliti}` };
      }
      return { ok: true };
    },
    afterSuccess(slug) {
      patchClientState(slug, (s) => {
        s.steps.palette.upstream = computeUpstream(slug, ["contesto.json"]);
      });
      // M8: registro anti-collisione — la voce del cliente entra/aggiorna
      // con la famiglia di tinta effettivamente scelta
      const palette = readPalette(slug);
      if (palette) registraAssegnazione(slug, hueBucket(palette["brand.palette.primary"]));
    },
  },

  copy: {
    stateKey: "copy",
    artifact: "copy.json",
    upstream: ["contesto.json"],
    gate: (slug) =>
      readClientState(slug).steps.contesto.stato === "verificato"
        ? null
        : "Prima conferma il contesto: il copy si scrive sul contesto curato (macro-categorie, promesse, martello).",
    run: copyRun,
    validate(slug) {
      const copy = readCopy(slug);
      if (!copy) return { ok: false, errore: "copy.json non scritto o non leggibile" };
      const errs = validateCopyArtifact(copy);
      if (errs.length) return { ok: false, errore: `formato non conforme: ${errs.slice(0, 5).join("; ")}` };
      // Copertura servizi (stessa definizione del CoveragePanel): la lezione
      // Cavaliere — servizi reali spariti dal sito — non deve ripetersi a valle.
      const contesto = readContesto(slug);
      const coverage = readCopyCoverage(slug);
      if (contesto && coverage) {
        const titles = copy["sections[3].props.items[*].title"];
        const cov = checkCoperturaCopy(
          contesto.servizi_atomizzati.map((s) => s.servizio),
          coverage.voci_atomiche,
          Array.isArray(titles) ? (titles as string[]) : [],
        );
        const problemi = [
          cov.scoperti.length ? `servizi del contesto senza copertura nel copy: ${cov.scoperti.join(" · ")}` : null,
          cov.extranei.length ? `voci di copertura estranee al contesto: ${cov.extranei.join(" · ")}` : null,
          cov.cardFantasma.length ? `voci mappate su card inesistenti: ${cov.cardFantasma.join(" · ")}` : null,
        ].filter(Boolean);
        if (problemi.length) return { ok: false, errore: `copertura servizi incompleta: ${problemi.join("; ")}` };
      }
      return { ok: true };
    },
    afterSuccess(slug) {
      patchClientState(slug, (s) => {
        s.steps.copy.upstream = computeUpstream(slug, ["contesto.json"]);
        s.steps.copy.fonte = copyFonte(slug) ?? undefined;
      });
    },
  },

  build: {
    stateKey: "build",
    // L'artifact del run è la dist; site.json è un intermedio della stessa run.
    artifact: "dist/index.html",
    // Staleness sugli INPUT dell'assembler (site.json lo produce build stessa).
    upstream: ["intake.json", "contesto.json", "palette.json", "copy.json", "images.json"],
    // Gate minimo comune (la route applica il gate PRIMA di leggere il mode):
    // il gate della build completa (images verificato) vive dentro buildRun.
    gate: (slug) =>
      readClientState(slug).steps.intake.stato === "verificato"
        ? null
        : "Prima verifica l'intake: anche l'anteprima parziale parte dai dati corretti.",
    run: buildRun,
    validate(slug) {
      return fs.existsSync(path.join(OUT_DIR, slug, "dist", "index.html"))
        ? { ok: true }
        : { ok: false, errore: "dist/index.html non prodotto dalla build" };
    },
    afterSuccess(slug) {
      patchClientState(slug, (s) => {
        s.steps.build.upstream = computeUpstream(slug, STEPS.build.upstream);
      });
    },
  },

  images: {
    stateKey: "images",
    // L'artifact del RUN è il trace; images.json (per l'assembler) lo deriva
    // l'editor alla conferma umana (lib/images.ts deriveImagesArtifact).
    artifact: "images-trace.json",
    upstream: ["contesto.json", "copy.json", "palette.json"],
    gate(slug, mode) {
      // Testi delle foto lavori: dipende solo dalle foto caricate (né copy/palette né BFL).
      if (mode === "lavori") return readLavori(slug).length ? null : "Carica almeno una foto dei lavori prima di generare i testi.";
      const s = readClientState(slug).steps;
      if (s.copy.stato !== "verificato" || s.palette.stato !== "verificato")
        return "Prima verifica copy e palette: le immagini derivano da titoli card e colori curati.";
      // Il solo ricontrollo del critico legge i file già generati: non chiama BFL.
      if (mode !== "critic" && !getSecret("BFL_API_KEY")) return "BFL_API_KEY non configurata: aggiungila dal pannello «Chiavi API».";
      return null;
    },
    run: imagesRun,
    validate(slug) {
      const errs = validateImagesTrace(slug);
      if (errs.length) return { ok: false, errore: `manifest non conforme: ${errs.slice(0, 5).join("; ")}` };
      return { ok: true };
    },
    afterSuccess(slug) {
      patchClientState(slug, (s) => {
        s.steps.images.upstream = computeUpstream(slug, ["contesto.json", "copy.json", "palette.json"]);
      });
    },
  },
};

// ---------------------------------------------------------------------------
// Step copy: orchestrazione multi-fase copywriter → critico → correzioni.
// ---------------------------------------------------------------------------

/**
 * Estratto per-campo del contesto da cui il copy deriva: hash dei campi
 * chiave, così l'update-mode può dire all'agente COSA è cambiato a monte
 * (non solo "il contesto è cambiato").
 */
export function copyFonte(slug: string): Record<string, string> | null {
  const c = readContesto(slug);
  if (!c) return null;
  return {
    "identità": hashValue(c.identita),
    "servizi e macro-categorie": hashValue([c.servizi_atomizzati, c.macro_categorie]),
    "promesse (consentite/vietate/martello)": hashValue([c.promesse_consentite, c.promesse_vietate, c.promessa_martello]),
    "punti di forza": hashValue(c.punti_di_forza),
    "tono": hashValue(c.tono),
    "zona e target": hashValue([c.zona, c.target]),
  };
}

/** Campi chiave del contesto cambiati rispetto all'ultimo allineamento del copy. */
export function copyFonteCambiati(slug: string): string[] {
  const prev = readClientState(slug).steps.copy.fonte;
  const cur = copyFonte(slug);
  if (!prev || !cur) return [];
  return Object.keys(cur).filter((k) => prev[k] !== undefined && prev[k] !== cur[k]);
}

const COPY_PATHS = (slug: string) => ({
  contesto: `site-renderer/out/${slug}/contesto.json`,
  brief: `site-renderer/out/${slug}/brief.json`,
  copy: `site-renderer/out/${slug}/copy.json`,
  coverage: `site-renderer/out/${slug}/copy-coverage.json`,
  review: `site-renderer/out/${slug}/copy-review.json`,
  slots: "site-renderer/blueprints/conversione-locale-v1/slots.json",
});

function promptCopywriter(slug: string, mode: RunMode): string {
  const p = COPY_PATHS(slug);
  const base =
    `Input PRIMARIO: ${p.contesto} (contesto curato e verificato); secondario ${p.brief} (verbatim del form). ` +
    `Contratto degli slot: ${p.slots} (agente copy). ` +
    `Scrivi ESATTAMENTE due file come da sezione «Formato artifact» della skill: ${p.copy} (mappa flat, TUTTI i 32 slot copy) ` +
    `e ${p.coverage}. Nessun altro file, poi una riga di conferma.`;
  if (mode === "update") {
    const cambiati = copyFonteCambiati(slug);
    return (
      `Il cliente «${slug}» HA GIÀ un copy curato da un umano in ${p.copy}. ` +
      `Il contesto è cambiato a monte${cambiati.length ? ` — parti cambiate: [${cambiati.join(", ")}]` : ""}. ` +
      `Usa la skill local-service-copywriter in MODALITÀ AGGIORNAMENTO (sezione dedicata): leggi il copy esistente, ` +
      `rivedi SOLO gli slot derivati dalle parti cambiate, lascia tutti gli altri byte-identici. ` +
      base
    );
  }
  return `Usa la skill local-service-copywriter per il cliente «${slug}». ` + base;
}

function promptCritico(slug: string, round: number, gate?: SlopReport, postFix = false): string {
  const p = COPY_PATHS(slug);
  return (
    `Usa la skill copy-critic per il cliente «${slug}». ` +
    `Input: ${p.contesto} (verità curata), ${p.brief} (verbatim), ${p.copy} (l'imputato), ${p.coverage}, ${p.slots}. ` +
    (postFix
      ? `È un round successivo a una correzione: il review precedente è in ${p.review} (leggilo PRIMA di sovrascriverlo); ` +
        `il copywriter ha corretto SOLO gli slot nei suoi findings. Rivaluta quegli slot corretti e le dimensioni ` +
        `globali G1/G2; gli slot promossi al round precedente restano promossi salvo regressione evidente. `
      : "") +
    (gate
      ? `Report del gate deterministico anti-slop (check-slop.mjs), già eseguito a monte — i suoi esiti valgono ` +
        `così come sono: non ridiscuterli e non ripeterli, parti da lì e valuta il resto.\n${JSON.stringify(gate, null, 1)}\n`
      : "") +
    `Scrivi SOLO ${p.review} con "round": ${round}, nel formato della sezione «Formato output» della skill ` +
    `(verdict/findings; ogni finding cita la frase VERBATIM; i rilievi G1/G2 ancorati a slot concreti). ` +
    `Ricorda: promesse_vietate nel copy = bloccante automatico (salvo le cortesie di norma di settore). ` +
    `Poi una riga col verdetto.`
  );
}

function promptSlopFix(slug: string, report: SlopReport): string {
  const p = COPY_PATHS(slug);
  return (
    `Sei il copywriter (skill local-service-copywriter) del cliente «${slug}». Il gate deterministico anti-slop ` +
    `(check-slop.mjs) ha trovato bloccanti in ${p.copy}:\n${JSON.stringify(report.bloccanti, null, 1)}\n` +
    `Riscrivi in ${p.copy} SOLO gli slot coinvolti: elimina le frasi/pattern banditi, riformula le sequenze ` +
    `ripetute (ogni slot dal proprio angolo, sezione «Ritmo e anti-ripetizione» della skill), riporta il martello ` +
    `entro le 2 occorrenze verbatim. Tutti gli altri slot restano BYTE-IDENTICI. ` +
    `Input di verità: ${p.contesto} (primario) + ${p.brief}. Rispetta budget (senza **), accent e lunghezze sibling. ` +
    `Nessun altro file, poi una riga di conferma.`
  );
}

function promptFix(slug: string, review: unknown, round: number, mode: RunMode): string {
  const p = COPY_PATHS(slug);
  return (
    `Sei il copywriter (skill local-service-copywriter) del cliente «${slug}». Il critico ha bocciato il copy (round ${round}). ` +
    `Findings (JSON integrale):\n${JSON.stringify(review, null, 1)}\n` +
    `Riscrivi in ${p.copy} SOLO gli slot elencati nei findings applicando i fix proposti — ` +
    `tutti gli altri slot restano BYTE-IDENTICI${mode === "update" ? " (contengono curatela umana)" : ""}. ` +
    `Aggiorna ${p.coverage} solo se cambia la mappa servizio→card. ` +
    `Input di verità: ${p.contesto} (primario) + ${p.brief}. Rispetta budget (senza **), accent e lunghezze sibling. ` +
    `Nessun altro file, poi una riga di conferma.`
  );
}

function promptFormato(slug: string, errs: string[]): string {
  const p = COPY_PATHS(slug);
  return (
    `Il file ${p.copy} del cliente «${slug}» viola il contratto di formato degli slot (${p.slots}). ` +
    `Errori del validatore (verbatim):\n- ${errs.join("\n- ")}\n` +
    `Correggi in ${p.copy} SOLO questi problemi, senza riscrivere nient'altro (accorcia il minimo necessario, ` +
    `mantieni i fatti; i budget si contano SENZA i marker **). Non toccare ${p.coverage} se non serve. ` +
    `Nessun altro file, poi una riga di conferma.`
  );
}

/** Gate deterministico di formato, con UNA fase di correzione se serve. */
async function* formatGate(slug: string, io: StepIO): AsyncGenerator<RunEvent, PhaseResult> {
  let errs = validateCopyArtifact(readCopy(slug) ?? {});
  if (!errs.length) return { ok: true };
  const r = yield* io.claude({
    phase: "correzioni formato",
    prompt: promptFormato(slug, errs),
    allowed: READ_SKILL_WRITE,
    disallowed: NO_NET_NO_BASH,
  });
  if (!r.ok) return r;
  errs = validateCopyArtifact(readCopy(slug) ?? {});
  if (errs.length) return { ok: false, error: `formato non conforme dopo la correzione: ${errs.slice(0, 5).join("; ")}` };
  return { ok: true };
}

/** Esegue il gate anti-slop con nome azienda (dal brief), città/area (dal
 *  contesto) e martello (dal contesto): le zone legittime ricorrono per SEO
 *  locale e non devono scattare come sequenze ripetute. */
function runSlop(slug: string): SlopResult {
  const azienda = readBrief(slug)?.azienda;
  const contesto = readContesto(slug);
  const consenti = [typeof azienda === "string" ? azienda : undefined, contesto?.zona.sede, contesto?.zona.area_intervento].filter(
    (s): s is string => typeof s === "string",
  );
  return checkSlop(slug, consenti, contesto?.promessa_martello);
}

/** Timbra il review con l'hash dell'artifact giudicato: senza, una review può
 *  sopravvivere a un artifact che nel frattempo è cambiato o non esiste più. */
function stampReview(slug: string, reviewFile: string, artifact: string): void {
  const p = path.join(OUT_DIR, slug, reviewFile);
  try {
    const r = JSON.parse(fs.readFileSync(p, "utf8"));
    r.giudicatoSu = computeUpstream(slug, [artifact]);
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + "\n");
  } catch {
    // review mancante o invalida: lo segnala già il chiamante
  }
}

/** Il prompt delle correzioni impone «tutti gli altri slot BYTE-IDENTICI»:
 *  questo è il sensore che lo verifica davvero. `citati` sono gli slot dei
 *  finding (eventualmente con indici appesi, es. "…bullets[*][3][4]"). */
function verificaByteIdentici(prima: CopyArtifact | null, dopo: CopyArtifact | null, citati: string[]): string | null {
  if (!prima || !dopo) return null; // artifact illeggibile: lo segnala il gate formato
  const autorizzato = (k: string) => citati.some((c) => c.startsWith(k) || k.startsWith(c));
  const toccati = Object.keys(prima).filter(
    (k) => !autorizzato(k) && JSON.stringify(prima[k]) !== JSON.stringify(dopo[k]),
  );
  return toccati.length
    ? `la correzione ha toccato slot non autorizzati (dovevano restare byte-identici): ${toccati.slice(0, 5).join(", ")}`
    : null;
}

/**
 * Gate deterministico anti-slop (dopo il gate formato, prima del critico),
 * con UNA fase di correzione se serve — stesso pattern del gate formato.
 * Ritorna il report (bloccanti+avvisi) da includere nel prompt del critico.
 */
async function* slopGate(slug: string, io: StepIO): AsyncGenerator<RunEvent, PhaseResult & { report?: SlopReport }> {
  let s = runSlop(slug);
  if (s.errore) return { ok: false, error: s.errore };
  if (s.ok) return { ok: true, report: s.report };
  const primaDelFix = readCopy(slug);
  const r = yield* io.claude({
    phase: "correzioni anti-slop",
    prompt: promptSlopFix(slug, s.report!),
    allowed: READ_SKILL_WRITE,
    disallowed: NO_NET_NO_BASH,
  });
  if (!r.ok) return r;
  const errs = validateCopyArtifact(readCopy(slug) ?? {});
  if (errs.length) return { ok: false, error: `formato non conforme dopo la correzione anti-slop: ${errs.slice(0, 5).join("; ")}` };
  const citati = s.report!.bloccanti.flatMap((b) => b.slot.split(",").map((x) => x.trim()));
  const fuoriSlot = verificaByteIdentici(primaDelFix, readCopy(slug), citati);
  if (fuoriSlot) return { ok: false, error: fuoriSlot };
  s = runSlop(slug);
  if (s.errore) return { ok: false, error: s.errore };
  // ponytail: una sola correzione come il gate formato; se non basta lo step fallisce e decide l'umano.
  if (!s.ok) {
    const resti = s.report!.bloccanti.map((b) => `[${b.tipo}] «${b.frase}»`).slice(0, 5).join("; ");
    return { ok: false, error: `slop non risolto dopo la correzione: ${resti}` };
  }
  return { ok: true, report: s.report };
}

const COPYWRITER_TIMEOUT = 20 * 60 * 1000;
const COPYWRITER_TURNS = 60;
const MAX_ROUNDS = 3;

async function* copyRun(slug: string, ctx: RunCtx, io: StepIO): AsyncGenerator<RunEvent, PhaseResult> {
  // «Ricontrolla col critico»: solo giudizio sull'artifact corrente, niente fix round.
  // Il gate anti-slop qui si esegue solo per dare il report al critico: eventuali
  // bloccanti finiscono nel review, non aprono correzioni.
  if (ctx.mode === "critic") {
    if (!readCopy(slug)) return { ok: false, error: "nessun copy.json da ricontrollare" };
    const gate = runSlop(slug);
    if (gate.errore) return { ok: false, error: gate.errore };
    const round = (readCopyReview(slug)?.round ?? 0) + 1;
    const r = yield* io.claude({
      phase: `critico (round ${round})`,
      prompt: promptCritico(slug, round, gate.report),
      allowed: READ_SKILL_WRITE,
      disallowed: NO_NET_NO_BASH,
    });
    if (!r.ok) return r;
    if (!readCopyReview(slug)) return { ok: false, error: "copy-review.json non scritto o non valido" };
    stampReview(slug, "copy-review.json", "copy.json");
    return { ok: true };
  }

  // generate | update: copywriter → gate formato → loop critico/correzioni.
  const w = yield* io.claude({
    phase: ctx.mode === "update" ? "copywriter (aggiornamento)" : "copywriter",
    prompt: promptCopywriter(slug, ctx.mode),
    allowed: READ_SKILL_WRITE,
    disallowed: NO_NET_NO_BASH,
    timeoutMs: COPYWRITER_TIMEOUT,
    maxTurns: COPYWRITER_TURNS,
  });
  if (!w.ok) return w;
  let g = yield* formatGate(slug, io);
  if (!g.ok) return g;
  let s = yield* slopGate(slug, io);
  if (!s.ok) return s;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const c = yield* io.claude({
      phase: `critico (round ${round})`,
      prompt: promptCritico(slug, round, s.report, round > 1),
      allowed: READ_SKILL_WRITE,
      disallowed: NO_NET_NO_BASH,
    });
    if (!c.ok) return c;
    const review = readCopyReview(slug);
    if (!review) return { ok: false, error: "copy-review.json non scritto o non valido" };
    stampReview(slug, "copy-review.json", "copy.json");
    if (review.verdict === "PASS") return { ok: true };
    // FAIL all'ultimo round: si consegna comunque — decide l'umano col review in scheda.
    if (round === MAX_ROUNDS) return { ok: true };

    // Byte-check applicabile solo se TUTTI i finding citano slot reali: un
    // finding globale (es. «globale (framing target)») autorizza modifiche larghe.
    const citati = review.findings.map((f) => f.slot);
    const vincolabile = citati.length > 0 && citati.every((c2) => /^(meta\.|sections\[)/.test(c2));
    const primaDelFix = vincolabile ? readCopy(slug) : null;

    const f = yield* io.claude({
      phase: `correzioni (round ${round})`,
      prompt: promptFix(slug, review, round, ctx.mode),
      allowed: READ_SKILL_WRITE,
      disallowed: NO_NET_NO_BASH,
      timeoutMs: COPYWRITER_TIMEOUT,
      maxTurns: COPYWRITER_TURNS,
    });
    if (!f.ok) return f;
    if (vincolabile) {
      const fuoriSlot = verificaByteIdentici(primaDelFix, readCopy(slug), citati);
      if (fuoriSlot) return { ok: false, error: fuoriSlot };
    }
    g = yield* formatGate(slug, io);
    if (!g.ok) return g;
    s = yield* slopGate(slug, io);
    if (!s.ok) return s;
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Step images: orchestrazione multi-fase image-prompter → image-critic.
// Il manifest (nomi file, soggetti, dimensioni) è DETERMINISTICO (lib/images.ts):
// il modello scrive prompt/alt e chiama lo script provider, non decide i nomi.
// La key BFL arriva dal Keychain come env del child: mai in argv né nel prompt.
// ---------------------------------------------------------------------------

const IMAGES_TIMEOUT = 30 * 60 * 1000; // submit+poll BFL sequenziali per ~7 immagini
const IMAGES_TURNS = 80;
const IMG_ALLOWED = ["Read", "Skill", "Write", "Bash(node site-renderer/scripts/generate-image.mjs:*)"];
const IMG_DISALLOWED = ["WebSearch", "WebFetch", "Edit", "Task"];
const bflEnv = () => ({ BFL_API_KEY: getSecret("BFL_API_KEY") ?? "" });

const IMAGES_PATHS = (slug: string) => ({
  contesto: `site-renderer/out/${slug}/contesto.json`,
  brief: `site-renderer/out/${slug}/brief.json`,
  copy: `site-renderer/out/${slug}/copy.json`,
  palette: `site-renderer/out/${slug}/palette.json`,
  dir: `site-renderer/out/${slug}`,
  trace: `site-renderer/out/${slug}/images-trace.json`,
  review: `site-renderer/out/${slug}/image-review.json`,
});

/** Il manifest vincolante reso come elenco per il prompt. */
function manifestRighe(slug: string): string {
  const exp = expectedImages(slug) ?? [];
  return exp
    .map((e) => `- ${e.file} → profilo ${e.profilo}, ${e.width}x${e.height}, modello ${e.model}, soggetto: ${e.riferimento}`)
    .join("\n");
}

function promptImagePrompter(slug: string): string {
  const p = IMAGES_PATHS(slug);
  return (
    `Usa la skill image-prompt-generator per il cliente «${slug}». ` +
    `Input PRIMARIO: ${p.contesto} (mestiere, zona, target); poi ${p.palette} (hex per lo style bible), ` +
    `${p.copy} (i titoli card sono già scritti: non reinventarli), ${p.brief} (verbatim). ` +
    `Genera ESATTAMENTE queste immagini — manifest vincolante, nomi file compresi (niente gallery: solo foto reali, non in questa fase):\n` +
    manifestRighe(slug) +
    `\nOgni immagine SOLO via: node site-renderer/scripts/generate-image.mjs --prompt "…" --width W --height H ` +
    `--model pro|max --out ${p.dir}/img/<file> [--seed n] (la key è già nell'ambiente). ` +
    `Se lo script fallisce due volte di fila con lo stesso errore (es. HTTP 402 credito esaurito), smetti di generare: ` +
    `scrivi comunque il trace con i prompt preparati e riporta l'errore verbatim al posto della conferma. ` +
    `Poi scrivi ${p.trace} come da sezione «Formato artifact» della skill: ` +
    `{"styleBible": "…", "immagini": [{"file": "img/…", "sezione": "hero"|"card", "index": n, "riferimento": "…", ` +
    `"profilo": "…", "prompt": "…integrale…", "alt": "…italiano, ≤140…", "model": "pro"|"max", "width": n, "height": n, "seed": n}]}. ` +
    `Nessun altro file, poi una riga di conferma.`
  );
}

function promptImageCritic(slug: string, round: number): string {
  const p = IMAGES_PATHS(slug);
  return (
    `Usa la skill image-critic per il cliente «${slug}». ` +
    `Input: ${p.trace} (prompt e soggetti attesi), ${p.copy}, ${p.contesto}, ${p.brief}. ` +
    `GUARDA ogni immagine con Read multimodale (i file sono in ${p.dir}/img/) e applica la rubrica V1–V6. ` +
    (round > 1
      ? `È un round successivo a una rigenerazione: rivaluta gli ex-scarti e la coerenza d'insieme (stesso servizio fotografico); gli "ok" precedenti restano ok. `
      : "") +
    `Scrivi SOLO ${p.review} con "round": ${round} ` +
    `({"verdict": "PASS"|"FAIL", "round": ${round}, "immagini": [{"file": "img/…", "esito": "ok"|"scarto", "motivo": "…", "fix_prompt": "…"}]}). ` +
    `Poi una riga col verdetto.`
  );
}

function promptImagesRegen(slug: string, files: string[], daReview: boolean): string {
  const p = IMAGES_PATHS(slug);
  const review = readImageReview(slug);
  const dettagli = files
    .map((f) => {
      const r = review?.immagini.find((i) => i.file === f && i.esito === "scarto");
      return r ? `- ${f}: ${r.motivo ?? "scartata"}${r.fix_prompt ? ` → fix: ${r.fix_prompt}` : ""}` : `- ${f}`;
    })
    .join("\n");
  return (
    `Usa la skill image-prompt-generator (sezione «Modalità rigenerazione») per il cliente «${slug}». ` +
    (daReview ? `Il critico ha scartato queste immagini:` : `L'operatore chiede di rigenerare queste immagini:`) +
    `\n${dettagli}\n` +
    `Rigenera SOLO questi file: stesso nome, stesse dimensioni e profilo del trace ${p.trace}, prompt corretto ` +
    `(applica i fix) e SEED NUOVO, via node site-renderer/scripts/generate-image.mjs --out ${p.dir}/img/<file>. ` +
    `Aggiorna nel trace SOLO le entry rigenerate (prompt/alt/seed), tutto il resto byte-identico. ` +
    `Se lo script fallisce due volte di fila con lo stesso errore, fermati e riporta l'errore verbatim. ` +
    `Input di verità: ${p.contesto} (primario) + ${p.copy} + ${p.palette}. Nessun altro file, poi una riga di conferma.`
  );
}

const LAVORI_TIMEOUT = 15 * 60 * 1000; // Read multimodale su ≤12 foto + scrittura

/** Fa scrivere all'AI alt+didascalia delle foto reali GUARDANDOLE (nessuna generazione). */
function promptLavoriTesti(slug: string): string {
  const p = IMAGES_PATHS(slug);
  const file = `site-renderer/out/${slug}/lavori.json`;
  return (
    `Scrivi didascalia e alt in ITALIANO per ogni foto reale dei lavori del cliente «${slug}». ` +
    `Il file ${file} è un array [{"file","alt","caption"}]; le foto sono in ${p.dir}/img/ (il nome è nel campo "file"). ` +
    `GUARDA ogni foto con Read multimodale. Leggi ${p.contesto} per usare i termini giusti del mestiere (servizi reali, zona). ` +
    `Per ogni voce:\n` +
    `- "caption" ≤28 caratteri: il TIPO di lavoro mostrato, concreto (es. "Ristrutturazione bagno", "Cappotto termico"). Niente slogan, niente nome azienda.\n` +
    `- "alt" ≤140 caratteri: descrizione FEDELE di ciò che è visibile (accessibilità + SEO), coerente col mestiere.\n` +
    `Regole: descrivi SOLO ciò che si vede davvero; zero claim inventati (niente "migliore", premi, numeri non verificabili); nessuna emoji. ` +
    `Se una foto non mostra un lavoro riconoscibile, usa didascalia/alt onesti e generici. ` +
    `Riscrivi SOLO ${file} mantenendo ESATTAMENTE gli stessi "file" e lo stesso ORDINE (cambia solo "alt" e "caption"). ` +
    `Nessun altro file, poi una riga di conferma.`
  );
}

/** Gate deterministico sul trace, con UNA fase di correzione (pattern formatGate). */
async function* imagesTraceGate(slug: string, io: StepIO): AsyncGenerator<RunEvent, PhaseResult> {
  let errs = validateImagesTrace(slug);
  if (!errs.length) return { ok: true };
  // File mai scritti o trace assente = quasi sempre l'API che rifiuta ogni
  // submit (key revocata, credito esaurito): sonda deterministica PRIMA di
  // spendere una fase claude di correzione che rifallirebbe allo stesso modo.
  if (errs.some((e) => e.includes("file assente o troncato") || e.includes("images-trace.json assente"))) {
    yield { type: "phase", label: "sonda API BFL" };
    const probe = probeBfl();
    if (!probe.ok) {
      return { ok: false, error: `l'API BFL rifiuta le generazioni — ${probe.errore}` };
    }
    yield { type: "text", text: "API BFL raggiungibile e credito ok: procedo con la correzione." };
  }
  const p = IMAGES_PATHS(slug);
  const r = yield* io.claude({
    phase: "correzioni manifest",
    prompt:
      `Il set immagini del cliente «${slug}» non rispetta il manifest. Errori del validatore (verbatim):\n- ` +
      errs.join("\n- ") +
      `\nCorreggi SOLO questi problemi: rigenera i file mancanti/troncati via node site-renderer/scripts/generate-image.mjs ` +
      `(dimensioni e soggetto dal manifest:\n${manifestRighe(slug)}\n), sistema ${p.trace} (entry mancanti, alt vuoti o oltre 140, file fuori manifest da rimuovere). ` +
      `Se lo script fallisce due volte di fila con lo stesso errore, fermati e riporta l'errore verbatim. ` +
      `Nessun altro file, poi una riga di conferma.`,
    allowed: IMG_ALLOWED,
    disallowed: IMG_DISALLOWED,
    timeoutMs: IMAGES_TIMEOUT,
    env: bflEnv(),
  });
  if (!r.ok) return r;
  errs = validateImagesTrace(slug);
  if (errs.length) return { ok: false, error: `manifest non conforme dopo la correzione: ${errs.slice(0, 5).join("; ")}` };
  return { ok: true };
}

async function* imagesRun(slug: string, ctx: RunCtx, io: StepIO): AsyncGenerator<RunEvent, PhaseResult> {
  // «Genera testi con l'AI»: side-run che riempie alt/didascalia delle foto lavori
  // guardandole. Non chiama BFL e non tocca lo stato di hero/card (vedi runStep).
  if (ctx.mode === "lavori") {
    const before = readLavori(slug);
    if (!before.length) return { ok: false, error: "nessuna foto lavori: caricane prima di generare i testi" };
    const r = yield* io.claude({
      phase: "testi lavori (l'AI guarda le foto)",
      prompt: promptLavoriTesti(slug),
      allowed: ["Read", "Write"],
      disallowed: NO_NET_NO_BASH,
      timeoutMs: LAVORI_TIMEOUT,
    });
    if (!r.ok) return r;
    const after = readLavori(slug);
    const sameFiles = after.length === before.length && before.every((b) => after.some((a) => a.file === b.file));
    if (!sameFiles) return { ok: false, error: "lavori.json alterato (foto aggiunte/rimosse): riapri il pannello e riprova" };
    return { ok: true };
  }

  // «Ricontrolla col critico»: solo giudizio sulle immagini correnti.
  if (ctx.mode === "critic") {
    if (!readImagesTrace(slug)) return { ok: false, error: "nessun images-trace.json da ricontrollare" };
    const round = (readImageReview(slug)?.round ?? 0) + 1;
    const r = yield* io.claude({
      phase: `image-critic (round ${round})`,
      prompt: promptImageCritic(slug, round),
      allowed: READ_SKILL_WRITE,
      disallowed: NO_NET_NO_BASH,
    });
    if (!r.ok) return r;
    if (!readImageReview(slug)) return { ok: false, error: "image-review.json non scritto o non valido" };
    stampReview(slug, "image-review.json", "images-trace.json");
    return { ok: true };
  }

  // regen (selezione umana) | generate: prompter → gate manifest → loop critico.
  let round0 = 0;
  if (ctx.mode === "regen") {
    const trace = readImagesTrace(slug);
    const files = (ctx.files ?? []).filter((f) => trace?.immagini.some((i) => i.file === f));
    if (!files.length) return { ok: false, error: "nessun file selezionato per la rigenerazione" };
    const r = yield* io.claude({
      phase: "image-prompter (rigenerazione selettiva)",
      prompt: promptImagesRegen(slug, files, false),
      allowed: IMG_ALLOWED,
      disallowed: IMG_DISALLOWED,
      timeoutMs: IMAGES_TIMEOUT,
      maxTurns: IMAGES_TURNS,
      env: bflEnv(),
    });
    if (!r.ok) return r;
    round0 = readImageReview(slug)?.round ?? 0;
  } else {
    const w = yield* io.claude({
      phase: "image-prompter",
      prompt: promptImagePrompter(slug),
      allowed: IMG_ALLOWED,
      disallowed: IMG_DISALLOWED,
      timeoutMs: IMAGES_TIMEOUT,
      maxTurns: IMAGES_TURNS,
      env: bflEnv(),
    });
    if (!w.ok) return w;
  }

  let g = yield* imagesTraceGate(slug, io);
  if (!g.ok) return g;

  for (let round = round0 + 1; round <= round0 + MAX_ROUNDS; round++) {
    const c = yield* io.claude({
      phase: `image-critic (round ${round})`,
      prompt: promptImageCritic(slug, round),
      allowed: READ_SKILL_WRITE,
      disallowed: NO_NET_NO_BASH,
    });
    if (!c.ok) return c;
    const review = readImageReview(slug);
    if (!review) return { ok: false, error: "image-review.json non scritto o non valido" };
    stampReview(slug, "image-review.json", "images-trace.json");
    if (review.verdict === "PASS") return { ok: true };
    // FAIL all'ultimo round: si consegna comunque — decide l'umano con gli scarti in scheda.
    if (round === round0 + MAX_ROUNDS) return { ok: true };

    const scarti = review.immagini.filter((i) => i.esito === "scarto").map((i) => i.file);
    if (!scarti.length) return { ok: true }; // FAIL senza scarti puntuali: non c'è nulla da rigenerare
    const f = yield* io.claude({
      phase: `rigenerazione scarti (round ${round})`,
      prompt: promptImagesRegen(slug, scarti, true),
      allowed: IMG_ALLOWED,
      disallowed: IMG_DISALLOWED,
      timeoutMs: IMAGES_TIMEOUT,
      maxTurns: IMAGES_TURNS,
      env: bflEnv(),
    });
    if (!f.ok) return f;
    g = yield* imagesTraceGate(slug, io);
    if (!g.ok) return g;
  }
  return { ok: true };
}

/** Segna lo stato di uno step in client.json, preservando gli altri campi (fonte/drift/upstream). */
export function setStepState(slug: string, key: StepKey, stato: string, errore?: string) {
  patchClientState(slug, (s) => {
    const step = s.steps[key];
    step.stato = stato as never;
    if (errore) step.errore = errore;
    else delete step.errore;
  });
}

/** Registra le metriche minime dell'ultimo run (durata/mode/esito) in client.json. */
export function patchStepMeta(
  slug: string,
  key: StepKey,
  ultimaRun: { mode: string; durataMs: number; esito: "ok" | "errore"; quando: string },
) {
  patchClientState(slug, (s) => {
    s.steps[key].ultimaRun = ultimaRun;
  });
}
