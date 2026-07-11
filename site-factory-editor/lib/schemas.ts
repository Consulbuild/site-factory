import { z } from "zod";
import { PRESET_KEYS } from "./presets";

// ---------------------------------------------------------------------------
// client.json — stato per-cliente OWNED dalla GUI (gli script pipeline non lo
// leggono mai). Vive in site-renderer/out/<slug>/client.json.
// ---------------------------------------------------------------------------

export const StatoIntake = z.enum(["da_verificare", "verificato"]);
export const StatoStep = z.enum(["assente", "in_corso", "da_verificare", "verificato", "errore"]);
/** @deprecated alias storico: lo stesso enum vale per tutti gli step. */
export const StatoContesto = StatoStep;

// Metriche minime dell'ultimo run dello step (scritte da run-step.ts): durata,
// modalità ed esito — il minimo per osservare costi e convergenza dei loop.
const UltimaRun = z
  .object({ mode: z.string(), durataMs: z.number(), esito: z.enum(["ok", "errore"]), quando: z.string() })
  .optional();

export const ClientStateSchema = z.object({
  version: z.literal(1),
  submissionId: z.string(),
  importedAt: z.string(),
  updatedAt: z.string(),
  steps: z.object({
    intake: z.object({ stato: StatoIntake }),
    contesto: z.object({
      stato: StatoStep,
      errore: z.string().optional(),
      // Provenienza: valori dei campi-fonte del brief all'ultimo allineamento
      // del contesto (generazione/riallineamento/dismiss). Serve a rilevare il drift.
      fonte: z.record(z.string(), z.string()).optional(),
      // Campi SEMANTICI del brief cambiati dopo l'allineamento: se non vuoto,
      // il contesto potrebbe non riflettere le correzioni → banner + riallinea.
      drift: z.array(z.string()).optional(),
      ultimaRun: UltimaRun,
    }),
    // .default(): i client.json esistenti senza la chiave restano validi
    // (niente migrazione, la chiave nasce alla prima riscrittura).
    palette: z
      .object({
        stato: StatoStep,
        errore: z.string().optional(),
        // Hash degli artifact a monte all'ultima generazione/conferma
        // (lib/staleness.ts): se divergono → banner "a monte è cambiato".
        upstream: z.record(z.string(), z.string()).optional(),
        ultimaRun: UltimaRun,
      })
      .default({ stato: "assente" }),
    copy: z
      .object({
        stato: StatoStep,
        errore: z.string().optional(),
        upstream: z.record(z.string(), z.string()).optional(),
        // Estratto per-campo del contesto all'ultimo allineamento (hash dei
        // campi chiave): permette all'update-mode di dire COSA è cambiato.
        fonte: z.record(z.string(), z.string()).optional(),
        ultimaRun: UltimaRun,
      })
      .default({ stato: "assente" }),
    images: z
      .object({
        stato: StatoStep,
        errore: z.string().optional(),
        upstream: z.record(z.string(), z.string()).optional(),
        ultimaRun: UltimaRun,
      })
      .default({ stato: "assente" }),
    build: z
      .object({
        stato: StatoStep,
        errore: z.string().optional(),
        upstream: z.record(z.string(), z.string()).optional(),
        /** true = ultima build con --partial (segnaposto del blueprint): mai confermabile/pubblicabile. */
        partial: z.boolean().optional(),
        builtAt: z.string().optional(),
        pages: z.number().optional(),
        sizeKb: z.number().optional(),
        /** Dominio custom (input UI persistito); usato al prossimo deploy. */
        dominio: z.string().optional(),
        // Il deploy non è uno step: è la storia dell'ultima pubblicazione.
        deploy: z
          .object({
            workerName: z.string(),
            url: z.string(),
            deployedAt: z.string(),
            dominio: z.string().optional(),
          })
          .optional(),
        ultimaRun: UltimaRun,
      })
      .default({ stato: "assente" }),
  }),
});
export type ClientState = z.infer<typeof ClientStateSchema>;

// ---------------------------------------------------------------------------
// copy-review.json / copy-coverage.json — artifact del ciclo copywriter↔critico.
// Schemi TOLLERANTI (passthrough): il critico aggiunge chiavi di lavoro
// (es. passata_fresca_C1_C6) che non vanno rifiutate.
// ---------------------------------------------------------------------------

export const CopyReviewSchema = z
  .object({
    verdict: z.enum(["PASS", "FAIL"]),
    round: z.number(),
    findings: z
      .array(
        z
          .object({
            rubrica: z.string(),
            gravita: z.enum(["bloccante", "minore"]),
            slot: z.string(),
            problema: z.string(),
            fix: z.string(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();
export type CopyReview = z.infer<typeof CopyReviewSchema>;

export const CopyCoverageSchema = z
  .object({
    card: z.array(z.string()),
    voci_atomiche: z.array(z.object({ servizio: z.string(), card: z.string() }).passthrough()),
  })
  .passthrough();
export type CopyCoverage = z.infer<typeof CopyCoverageSchema>;

// ---------------------------------------------------------------------------
// images-trace.json / image-review.json — artifact del ciclo image-prompter↔
// image-critic. Il trace è la memoria di lavorazione (prompt, modello, seed);
// images.json per l'assembler NON è qui: lo DERIVA l'editor alla conferma
// (lib/images.ts deriveImagesArtifact), mai il modello. Schemi tolleranti.
// ---------------------------------------------------------------------------

export const ImageTraceEntrySchema = z
  .object({
    file: z.string(), // es. "img/hero.jpg"
    sezione: z.enum(["hero", "card"]),
    index: z.number(), // 0 per hero, 1-based per le card
    riferimento: z.string(), // attività (hero) | items[i].title (card)
    profilo: z.string(),
    prompt: z.string(),
    alt: z.string(),
    model: z.enum(["pro", "max"]),
    width: z.number(),
    height: z.number(),
    seed: z.number().optional(),
  })
  .passthrough();

export const ImagesTraceSchema = z
  .object({
    styleBible: z.string(),
    immagini: z.array(ImageTraceEntrySchema),
  })
  .passthrough();
export type ImagesTrace = z.infer<typeof ImagesTraceSchema>;

export const ImageReviewSchema = z
  .object({
    verdict: z.enum(["PASS", "FAIL"]),
    round: z.number(),
    immagini: z
      .array(
        z
          .object({
            file: z.string(),
            esito: z.enum(["ok", "scarto"]),
            motivo: z.string().optional(),
            fix_prompt: z.string().optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();
export type ImageReview = z.infer<typeof ImageReviewSchema>;

// ---------------------------------------------------------------------------
// palette.json — artifact flat slot-path → valore (formato assembler), scritto
// dal palette-designer e rivisto/confermato dall'umano nella scheda Palette.
// Nessun meta: `verificato` vive in client.json.
// ---------------------------------------------------------------------------

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex a 6 cifre, es. #b0561a");

export const PaletteArtifactSchema = z.object({
  "brand.preset": z.enum(PRESET_KEYS),
  "brand.palette.primary": hex,
  "brand.palette.accent": hex,
});
export type PaletteArtifact = z.infer<typeof PaletteArtifactSchema>;

// ---------------------------------------------------------------------------
// contesto.json — artifact prodotto dal context-enricher (claude -p),
// verificato dall'umano nella GUI, input primario dei futuri agenti.
// Regola d'oro: niente fonte nel form ⇒ la voce non esiste.
// ---------------------------------------------------------------------------

const nonEmpty = z.string().min(1);

export const ContestoSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  submissionId: z.string(),
  verificato: z.boolean(),

  identita: z.object({
    frase: nonEmpty,
    fonte: z.array(nonEmpty).min(1),
  }),
  settore_normalizzato: nonEmpty,
  sottosettore: nonEmpty,

  servizi_atomizzati: z
    .array(z.object({ servizio: nonEmpty, fonte: nonEmpty }))
    .min(1),
  macro_categorie: z
    .array(z.object({ nome: nonEmpty, servizi: z.array(nonEmpty) }))
    .min(3)
    .max(5),

  target: z.object({
    tipo: z.enum(["privati", "aziende", "entrambi"]),
    descrizione: z.string(),
    tipo_lavori: z.string(),
  }),
  zona: z.object({ sede: nonEmpty, area_intervento: z.string() }),

  punti_di_forza: z.array(z.object({ claim: nonEmpty, fonte: nonEmpty })),
  promesse_consentite: z.array(nonEmpty),
  promesse_vietate: z.array(nonEmpty),
  promessa_martello: z.string(),

  tono: z.object({ registro: z.string(), da_evitare: z.string() }),
  // M8: personalità di marca per l'assegnazione deterministica del design.
  // Opzionale per retrocompatibilità: i contesti storici non ce l'hanno e
  // assign-design usa un fallback deterministico dichiarato (dal tono).
  personalita_aaker: z
    .object({
      sincerity: z.number().min(0).max(2),
      excitement: z.number().min(0).max(2),
      competence: z.number().min(0).max(2),
      sophistication: z.number().min(0).max(2),
      ruggedness: z.number().min(0).max(2),
      primaria: z.enum(["sincerity", "excitement", "competence", "sophistication", "ruggedness"]),
      fonte: z.array(nonEmpty).min(1),
    })
    .optional(),
  materiali: z.object({
    logo: z.boolean(),
    foto_reali: z.string(),
    colori: z.string(),
  }),
  note_operatore: z.string(),
});
export type Contesto = z.infer<typeof ContestoSchema>;

/**
 * Gate deterministico di copertura: ogni servizio atomico assegnato a
 * esattamente una macro-categoria, e ogni voce delle macro esiste tra gli
 * atomici. Ritorna la lista dei problemi (vuota = copertura totale).
 */
export function checkCopertura(c: Contesto): string[] {
  const problemi: string[] = [];
  const atomici = new Set(c.servizi_atomizzati.map((s) => s.servizio));
  const assegnati = new Map<string, string>();

  for (const macro of c.macro_categorie) {
    for (const servizio of macro.servizi) {
      if (!atomici.has(servizio))
        problemi.push(`«${servizio}» in «${macro.nome}» non esiste tra i servizi atomizzati`);
      const prev = assegnati.get(servizio);
      if (prev) problemi.push(`«${servizio}» assegnato sia a «${prev}» che a «${macro.nome}»`);
      assegnati.set(servizio, macro.nome);
    }
  }
  for (const servizio of atomici) {
    if (!assegnati.has(servizio)) problemi.push(`«${servizio}» non assegnato a nessuna macro-categoria`);
  }
  return problemi;
}
