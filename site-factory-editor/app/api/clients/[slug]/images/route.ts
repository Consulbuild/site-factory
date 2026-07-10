import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { clientDir } from "@/lib/paths";
import { readImagesTrace, patchClientState, writeJson } from "@/lib/clients";
import { writeImagesTrace, validateImagesTrace, deriveImagesArtifact } from "@/lib/images";
import { computeUpstream } from "@/lib/staleness";

export const dynamic = "force-dynamic";

const IMAGES_UPSTREAM = ["contesto.json", "copy.json", "palette.json"];

function ensureClient(slug: string): string | null {
  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return null;
  }
  return fs.existsSync(dir) ? dir : null;
}

/** Salva gli alt curati a mano: { alts: { "img/hero.jpg": "…" } } → trace aggiornato. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!ensureClient(slug)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const alts = body?.alts;
  if (!alts || typeof alts !== "object" || Array.isArray(alts)) {
    return NextResponse.json({ error: "body atteso: { alts: { \"img/…\": \"alt\" } }" }, { status: 400 });
  }
  const trace = readImagesTrace(slug);
  if (!trace) return NextResponse.json({ error: "images-trace.json assente" }, { status: 404 });

  const errors: string[] = [];
  for (const [file, alt] of Object.entries(alts)) {
    const entry = trace.immagini.find((i) => i.file === file);
    if (!entry) {
      errors.push(`file non nel trace: ${file}`);
      continue;
    }
    if (typeof alt !== "string" || !alt.trim()) errors.push(`${file}: alt vuoto`);
    else if (alt.length > 140) errors.push(`${file}: alt oltre 140 caratteri (${alt.length})`);
    else entry.alt = alt.trim();
  }
  if (errors.length) return NextResponse.json({ error: "alt non validi", errors }, { status: 422 });

  writeImagesTrace(slug, trace);
  patchClientState(slug, (s) => {
    s.steps.images.stato = "da_verificare";
    delete s.steps.images.errore;
  });
  return NextResponse.json({ ok: true });
}

/**
 * Conferma umana: rivalida il set contro il manifest, DERIVA images.json
 * (artifact flat per l'assembler — mai scritto dal modello), poi verificato
 * + snapshot upstream.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = ensureClient(slug);
  if (!dir) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const errors = validateImagesTrace(slug);
  if (errors.length) {
    return NextResponse.json({ error: "set immagini non conforme al manifest", errors }, { status: 422 });
  }
  writeJson(path.join(dir, "images.json"), deriveImagesArtifact(slug));
  const client = patchClientState(slug, (s) => {
    s.steps.images.stato = "verificato";
    delete s.steps.images.errore;
    s.steps.images.upstream = computeUpstream(slug, IMAGES_UPSTREAM);
  });
  return NextResponse.json({ ok: true, client });
}
