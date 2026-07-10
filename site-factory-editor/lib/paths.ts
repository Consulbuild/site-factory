import path from "node:path";
import { homedir } from "node:os";

// Unico punto di ancoraggio dei path. L'editor gira sempre con
// cwd = site-factory-editor/, quindi la root del repo è "..".
// ATTENZIONE: il path contiene uno spazio ("Claude Projects") —
// mai interpolare in stringhe shell, sempre spawn(bin, [args]).
export const REPO_ROOT = path.resolve(process.cwd(), "..");
export const SITE_RENDERER = path.join(REPO_ROOT, "site-renderer");
export const OUT_DIR = path.join(SITE_RENDERER, "out");
export const ENV_FILE = path.join(SITE_RENDERER, ".env");
export const INTAKE_SCRIPT = path.join(SITE_RENDERER, "scripts", "intake-tally.ts");

// Node e claude vivono in ~/.local/bin (non nel PATH di default dei processi GUI).
const LOCAL_BIN = path.join(homedir(), ".local", "bin");
export const NODE_BIN = path.join(LOCAL_BIN, "node");
export const CLAUDE_BIN = path.join(LOCAL_BIN, "claude");

/** Env per i processi figli: PATH con ~/.local/bin in testa. */
export function childEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...process.env, PATH: `${LOCAL_BIN}:${process.env.PATH ?? ""}`, ...extra };
}

/** Path del workspace di un cliente. Rifiuta slug che escono da out/. */
export function clientDir(slug: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error(`slug non valido: ${slug}`);
  return path.join(OUT_DIR, slug);
}
