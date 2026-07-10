import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { PaletteArtifactSchema } from "@/lib/schemas";
import { writePalette, readPalette, patchClientState } from "@/lib/clients";
import { checkPalette } from "@/lib/contrast";
import { computeUpstream } from "@/lib/staleness";

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

/**
 * Salva la palette (override manuale). Il contrasto WCAG AA è un gate anche
 * qui: una palette non-AA fallirebbe comunque il gate del renderer a valle,
 * quindi non viene MAI scritta su disco — 422 con le coppie fallite.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!ensureClient(slug)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = PaletteArtifactSchema.safeParse(body?.palette);
  if (!parsed.success) {
    return NextResponse.json({ error: "palette non valida", issues: parsed.error.issues.slice(0, 8) }, { status: 400 });
  }
  const gate = checkPalette(
    parsed.data["brand.preset"],
    parsed.data["brand.palette.primary"],
    parsed.data["brand.palette.accent"],
  );
  if (gate.errore) return NextResponse.json({ error: gate.errore }, { status: 500 });
  if (!gate.ok) {
    return NextResponse.json({ error: "contrasto WCAG AA non superato", pairs: gate.pairs }, { status: 422 });
  }
  writePalette(slug, parsed.data);
  patchClientState(slug, (s) => {
    s.steps.palette.stato = "da_verificare";
    delete s.steps.palette.errore;
  });
  return NextResponse.json({ ok: true, pairs: gate.pairs });
}

/** Conferma la palette: ri-verifica il contrasto, poi verificato + snapshot upstream. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!ensureClient(slug)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const palette = readPalette(slug);
  if (!palette) return NextResponse.json({ error: "palette assente o non valida" }, { status: 404 });

  const gate = checkPalette(palette["brand.preset"], palette["brand.palette.primary"], palette["brand.palette.accent"]);
  if (gate.errore) return NextResponse.json({ error: gate.errore }, { status: 500 });
  if (!gate.ok) {
    return NextResponse.json({ error: "contrasto WCAG AA non superato", pairs: gate.pairs }, { status: 422 });
  }
  const client = patchClientState(slug, (s) => {
    s.steps.palette.stato = "verificato";
    delete s.steps.palette.errore;
    // La conferma umana fa nascere/aggiorna lo snapshot di staleness anche
    // per artifact pre-GUI (Fase B) che non hanno mai avuto un run.
    s.steps.palette.upstream = computeUpstream(slug, ["contesto.json"]);
  });
  return NextResponse.json({ ok: true, client });
}
