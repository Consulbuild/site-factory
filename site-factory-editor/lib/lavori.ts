import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eJpeg, orientamentoExif, senzaMetadati } from "./metadati-foto.ts";

// Helper delle foto lavori (server-only). La normalizzazione usa `sips`, il
// convertitore nativo di macOS, e i metadati li toglie lib/metadati-foto.ts: nessuna
// dipendenza npm. Niente sharp: non legge l'HEIC dell'iPhone ed è solo asincrono.
// `sips` da solo NON basta: conserva EXIF, GPS e Orientation senza ruotare i pixel.
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

/** Il file non si converte in immagine (vuoto, rovinato, formato sconosciuto): colpa del file, non del sistema. */
export class ImmagineIlleggibile extends Error {
  constructor() {
    super("immagine illeggibile: file vuoto, rovinato o in un formato non supportato");
  }
}

function sips(args: string[]): void {
  const r = spawnSync("sips", args, { encoding: "utf8", timeout: 30_000 });
  if (r.status !== 0) {
    const msg = ((r.stderr || "") + (r.stdout || "")).trim().split("\n").slice(-2).join(" ");
    throw new Error(`conversione immagine fallita (sips): ${msg || `codice ${r.status}`}`);
  }
}

// Rotazione e specchio di sips che portano nei pixel ogni orientamento EXIF (tutti e 8
// verificati in scripts/test-metadati-foto.ts). sips lascia il tag: lo toglie senzaMetadati.
const RADDRIZZA: Record<number, string[]> = {
  2: ["-f", "horizontal"],
  3: ["-r", "180"],
  4: ["-f", "vertical"],
  5: ["-r", "270", "-f", "horizontal"],
  6: ["-r", "90"],
  7: ["-r", "90", "-f", "horizontal"],
  8: ["-r", "270"],
};

/** Sul posto: applica ai pixel l'orientamento EXIF, poi toglie tutti i metadati (GPS compreso). */
export function pulisciJpeg(file: string): void {
  const o = orientamentoExif(fs.readFileSync(file));
  if (o !== 1) sips([...RADDRIZZA[o], file, "--out", file]);
  fs.writeFileSync(file, senzaMetadati(fs.readFileSync(file)));
}

const regolare = (buf: Buffer) => {
  try {
    return senzaMetadati(buf).length > 0;
  } catch {
    return false;
  }
};

/**
 * Converte un file immagine qualsiasi (HEIC/PNG/WebP/JPG) in un JPEG dritto e senza
 * metadati. Ridimensiona il lato lungo a `maxLato` SOLO se più grande (`-Z` di sips
 * ingrandirebbe anche le foto piccole → sfocatura e peso inutile); un JPEG già a misura
 * non si ricodifica (`maxLato` Infinity = originale fedele). File che sips non converte
 * → `ImmagineIlleggibile`; altri errori (disco, sips assente) passano così come sono.
 * ponytail: foto grande e ruotata = due codifiche a qualità `high` (peso −0,8%, invisibile
 * a 1600px); se servisse, passare RADDRIZZA alla conversione quando la sorgente è JPEG.
 */
export function normalizeToJpg(srcTmp: string, outPath: string, maxLato = MAX_SIDE): void {
  const dims = spawnSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", srcTmp], { encoding: "utf8", timeout: 15_000 });
  const max = Math.max(0, ...[...(dims.stdout || "").matchAll(/pixel(?:Width|Height):\s*(\d+)/g)].map((m) => Number(m[1])));
  // Semilavorati fuori da out/: la build copia img/ per intero, un file a metà (con GPS) finirebbe online.
  const lavoro = fs.mkdtempSync(path.join(os.tmpdir(), "sf-foto-"));
  const tmp = path.join(lavoro, "foto.jpg");
  try {
    const src = fs.readFileSync(srcTmp);
    // JPEG irregolare (byte spuri tra i segmenti…): lo riscrive sips, che lo tollera.
    if (eJpeg(src) && max > 0 && max <= maxLato && regolare(src)) fs.writeFileSync(tmp, src);
    else {
      const args = ["-s", "format", "jpeg", ...(max > maxLato ? ["-Z", String(maxLato)] : []), srcTmp, "--out", tmp]; // max 0 (dim illeggibili) → solo conversione
      const r = spawnSync("sips", args, { encoding: "utf8", timeout: 30_000 });
      // sips assente: non è colpa del file. Timeout (immagine enorme o patologica) sì.
      if (r.error && (r.error as NodeJS.ErrnoException).code !== "ETIMEDOUT") throw r.error;
      // Un file vuoto esce con codice 0 ma senza immagine.
      if (r.status !== 0 || !fs.existsSync(tmp)) throw new ImmagineIlleggibile();
    }
    pulisciJpeg(tmp);
    fs.copyFileSync(tmp, outPath);
  } finally {
    fs.rmSync(lavoro, { recursive: true, force: true });
  }
}
