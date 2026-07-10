import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { clientDir, childEnv, NODE_BIN, SITE_RENDERER } from "./paths";
import { getSecret } from "./secrets";
import { type ImagesTrace } from "./schemas";
import { readContesto, readCopy, readImagesTrace, writeJson } from "./clients";

// Contratti dello step Immagini. Il manifest (quali file, con che soggetto e
// dimensioni) è DETERMINISTICO da copy.json+contesto.json: il modello riempie
// prompt/alt, non decide i nomi. Gallery NON generata in AI (solo foto reali,
// scheda futura): niente slot sections[4] finché non esistono foto del cliente.

export interface ExpectedImage {
  file: string; // "img/hero.jpg" | "img/card-<i>.jpg"
  sezione: "hero" | "card";
  index: number; // 0 per hero, 1-based per le card
  riferimento: string;
  profilo: "hero" | "card";
  model: "pro" | "max";
  width: number;
  height: number;
}

// Dimensioni multiple di 16 (vincolo BFL), 16:9 hero e 4:3 card.
const HERO = { width: 1920, height: 1088, model: "max" as const };
const CARD = { width: 1216, height: 912, model: "pro" as const };

export function writeImagesTrace(slug: string, trace: ImagesTrace): void {
  writeJson(path.join(clientDir(slug), "images-trace.json"), trace);
}

/** Manifest deterministico: hero + una card per titolo in copy.json. */
export function expectedImages(slug: string): ExpectedImage[] | null {
  const copy = readCopy(slug);
  const titles = copy?.["sections[3].props.items[*].title"];
  if (!Array.isArray(titles) || titles.length === 0) return null;
  const attivita = readContesto(slug)?.identita.frase ?? "";
  return [
    { file: "img/hero.jpg", sezione: "hero", index: 0, riferimento: attivita, profilo: "hero", ...HERO },
    ...titles.map((t, i) => ({
      file: `img/card-${i + 1}.jpg`,
      sezione: "card" as const,
      index: i + 1,
      riferimento: String(t),
      profilo: "card" as const,
      ...CARD,
    })),
  ];
}

/**
 * Gate deterministico post-fase: il trace copre ESATTAMENTE il manifest,
 * ogni jpg esiste su disco (>10KB: scarta file troncati), alt presenti (≤140).
 */
export function validateImagesTrace(slug: string): string[] {
  const errs: string[] = [];
  const expected = expectedImages(slug);
  if (!expected) return ["copy.json assente o senza card servizi: manifest non derivabile"];
  const trace = readImagesTrace(slug);
  if (!trace) return ["images-trace.json assente o non valido"];

  const inTrace = new Map(trace.immagini.map((i) => [i.file, i]));
  for (const e of expected) {
    const t = inTrace.get(e.file);
    if (!t) {
      errs.push(`manca dal trace: ${e.file} (${e.riferimento})`);
      continue;
    }
    if (!t.alt.trim()) errs.push(`${e.file}: alt vuoto`);
    if (t.alt.length > 140) errs.push(`${e.file}: alt oltre 140 caratteri (${t.alt.length})`);
    const abs = path.join(clientDir(slug), t.file);
    let size = 0;
    try {
      size = fs.statSync(abs).size;
    } catch {
      /* assente */
    }
    if (size < 10_240) errs.push(`${t.file}: file assente o troncato su disco (${size} byte)`);
  }
  for (const t of trace.immagini) {
    if (!expected.some((e) => e.file === t.file)) errs.push(`nel trace ma fuori manifest: ${t.file}`);
  }
  return errs;
}

/**
 * Sonda deterministica dell'API BFL: una generazione minima (256×256, [pro]).
 * Se l'API rifiuta ogni submit (key revocata, credito esaurito: HTTP 402) la
 * sonda fallisce SENZA costi e restituisce l'errore verbatim dello script;
 * se invece genera, costa ~1 credito. Va usata solo nel path di errore del
 * gate immagini (file mai scritti), mai nel flusso sano.
 */
export function probeBfl(): { ok: true } | { ok: false; errore: string } {
  const out = path.join(os.tmpdir(), `bfl-probe-${process.pid}.jpg`);
  const r = spawnSync(
    NODE_BIN,
    ["scripts/generate-image.mjs", "--prompt", "cantiere edile italiano, fotografia realistica", "--width", "256", "--height", "256", "--model", "pro", "--out", out],
    { cwd: SITE_RENDERER, env: childEnv({ BFL_API_KEY: getSecret("BFL_API_KEY") ?? "" }), encoding: "utf8", timeout: 120_000 },
  );
  fs.rmSync(out, { force: true });
  if (r.status === 0) return { ok: true };
  const msg = ((r.stderr || "") + (r.stdout || "")).trim().split("\n").slice(-3).join(" ");
  return { ok: false, errore: msg || `generate-image.mjs uscito con codice ${r.status}` };
}

/** images.json flat per l'assembler, derivato da trace (alt curati). Pura. */
export function deriveImagesArtifact(slug: string): Record<string, unknown> {
  const trace = readImagesTrace(slug);
  if (!trace) throw new Error("images-trace.json assente");
  const media = (file: string) => `/media/${slug}/${path.basename(file)}`;
  const hero = trace.immagini.find((i) => i.sezione === "hero");
  const cards = trace.immagini.filter((i) => i.sezione === "card").sort((a, b) => a.index - b.index);
  if (!hero) throw new Error("hero mancante dal trace");
  return {
    "sections[1].props.image": { src: media(hero.file), alt: hero.alt },
    "sections[3].props.items[*].image": cards.map((c) => ({ src: media(c.file), alt: c.alt })),
  };
}
