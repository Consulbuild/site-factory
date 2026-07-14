import { spawnSync } from "node:child_process";

// Helper delle foto lavori (server-only). La normalizzazione usa `sips`, il
// convertitore nativo di macOS: nessuna dipendenza npm (niente sharp) e legge
// anche l'HEIC dell'iPhone.
// ponytail: sips è solo-macOS — coerente con l'editor, che gira in locale sul Mac.

/** File delle foto lavori dentro out/<slug>/img/. */
export const LAVORO_RE = /^lavoro-(\d+)\.jpg$/;

/** Primo nome `lavoro-N.jpg` libero dato l'elenco dei file già in img/. */
export function nextLavoroName(existing: string[]): string {
  const used = new Set<number>();
  for (const f of existing) {
    const m = LAVORO_RE.exec(f);
    if (m) used.add(Number(m[1]));
  }
  let n = 1;
  while (used.has(n)) n++;
  return `lavoro-${n}.jpg`;
}

const MAX_SIDE = 1600; // una gallery 4/3 rende a ~1200px: oltre è solo peso

/**
 * Converte un file immagine qualsiasi (HEIC/PNG/WebP/JPG) in JPEG. Ridimensiona
 * il lato lungo a 1600px SOLO se più grande (`-Z` di sips ingrandirebbe anche le
 * foto piccole → sfocatura e peso inutile). Lancia se sips fallisce.
 */
export function normalizeToJpg(srcTmp: string, outPath: string): void {
  const dims = spawnSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", srcTmp], { encoding: "utf8", timeout: 15_000 });
  const max = Math.max(0, ...[...(dims.stdout || "").matchAll(/pixel(?:Width|Height):\s*(\d+)/g)].map((m) => Number(m[1])));
  const resize = max > MAX_SIDE ? ["-Z", String(MAX_SIDE)] : []; // max 0 (dim illeggibili) → solo conversione
  const r = spawnSync("sips", ["-s", "format", "jpeg", ...resize, srcTmp, "--out", outPath], {
    encoding: "utf8",
    timeout: 30_000,
  });
  if (r.status !== 0) {
    const msg = ((r.stderr || "") + (r.stdout || "")).trim().split("\n").slice(-2).join(" ");
    throw new Error(`conversione immagine fallita (sips): ${msg || `codice ${r.status}`}`);
  }
}
