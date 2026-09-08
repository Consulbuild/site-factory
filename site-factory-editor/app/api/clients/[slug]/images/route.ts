import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { readImagesTrace, patchClientState } from "@/lib/clients";
import { writeImagesTrace } from "@/lib/images";
import { confermaImages, rispostaConferma } from "@/lib/conferme";

export const dynamic = "force-dynamic";

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

/** Conferma umana delle immagini (rivalida il set, deriva images.json — lib/conferme.ts). */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!ensureClient(slug)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  const { body, status } = rispostaConferma(confermaImages(slug));
  return NextResponse.json(body, { status });
}
