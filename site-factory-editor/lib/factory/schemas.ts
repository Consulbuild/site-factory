import { z } from "zod";

// Contratti dati della fabbrica (piano §4, §5): specchio Zod dei file JSON
// in factory/references/<id>/ e factory/runs/<runId>/.

/** meta.json di un riferimento — chi l'ha scelto attesta che non è un concorrente locale. */
export const ReferenceMetaSchema = z.object({
  url: z.string().url(),
  galleria: z.string().optional(), // da dove arriva (One Page Love, Awwwards, …)
  settore: z.string().optional(),
  zonaGeografica: z.string().optional(),
  nota: z.string().optional(),
  aggiuntoIl: z.string(),
  attestazioneNonConcorrente: z.literal(true),
});
export type ReferenceMeta = z.infer<typeof ReferenceMetaSchema>;

/** optout.json — l'esito del gate TDM (scritto da check-optout.mjs). */
const SegnaleSchema = z.object({ stato: z.string(), dettagli: z.array(z.string()) });
export const OptoutSchema = z.object({
  url: z.string(),
  verificatoIl: z.string(),
  robotsTxt: SegnaleSchema,
  tdmRep: SegnaleSchema,
  metaNoai: SegnaleSchema,
  esito: z.enum(["consentito", "bloccato", "errore"]),
  motivo: z.string(),
});
export type Optout = z.infer<typeof OptoutSchema>;

/** Vista aggregata di un riferimento per la UI. */
export interface ReferenceSummary {
  id: string;
  meta: ReferenceMeta;
  optout: Optout | null;
  estratto: boolean; // extraction.tokens.json presente
  screenshots: boolean;
}

/** run.json — stato di una run di fabbrica (le fasi si eseguono in M6). */
export const FASI_RUN = ["designer", "validate", "build", "gates", "critico"] as const;
export const RunSchema = z.object({
  runId: z.string(),
  creatoIl: z.string(),
  references: z.array(z.string()).min(3),
  stato: z.enum(["creata", "in_corso", "fallita", "da_audire", "pubblicata", "scartata"]),
  fasi: z.array(
    z.object({
      nome: z.enum(FASI_RUN),
      esito: z.enum(["in_attesa", "in_corso", "ok", "fallita"]),
      avviatoIl: z.string().optional(),
      report: z.string().optional(), // path del report in gates/
    }),
  ),
  misure: z
    .object({
      durataMin: z.number().optional(),
      roundCritico: z.number().optional(),
      correzioniUmane: z.number().optional(),
    })
    .optional(),
});
export type FactoryRun = z.infer<typeof RunSchema>;
