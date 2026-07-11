import path from "node:path";
import { REPO_ROOT, SITE_RENDERER } from "../paths";

// Path della fabbrica design (D6): tutto file JSON in <repo>/factory/.
export const FACTORY_ROOT = path.join(REPO_ROOT, "factory");
export const REFERENCES_DIR = path.join(FACTORY_ROOT, "references");
export const RUNS_DIR = path.join(FACTORY_ROOT, "runs");

// Script deterministici della fabbrica (vivono nel renderer: lì ci sono
// Playwright e dembrandt fra le devDependencies).
export const CHECK_OPTOUT = path.join(SITE_RENDERER, "scripts", "factory", "check-optout.mjs");
export const EXTRACT_TOKENS = path.join(SITE_RENDERER, "scripts", "factory", "extract-tokens.mjs");
export const PRESETS_MANIFEST = path.join(SITE_RENDERER, "presets", "presets.manifest.json");
export const PRESETS_DIR = path.join(SITE_RENDERER, "presets");

const ID_VALIDO = /^[a-z0-9][a-z0-9-]*$/;

/** Cartella di un riferimento. Rifiuta id che escono da references/. */
export function referenceDir(id: string): string {
  if (!ID_VALIDO.test(id)) throw new Error(`id riferimento non valido: ${id}`);
  return path.join(REFERENCES_DIR, id);
}

/** Cartella di una run di fabbrica. */
export function runDir(runId: string): string {
  if (!ID_VALIDO.test(runId)) throw new Error(`runId non valido: ${runId}`);
  return path.join(RUNS_DIR, runId);
}
