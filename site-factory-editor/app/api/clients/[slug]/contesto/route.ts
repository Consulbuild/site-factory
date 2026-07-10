import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { ContestoSchema, checkCopertura } from "@/lib/schemas";
import { writeContesto, patchClientState, readContesto } from "@/lib/clients";

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

/** Salva la bozza del contesto (valida schema, non impone ancora la copertura). */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!ensureClient(slug)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = ContestoSchema.safeParse(body?.contesto);
  if (!parsed.success) {
    return NextResponse.json({ error: "contesto non valido", issues: parsed.error.issues.slice(0, 8) }, { status: 400 });
  }
  writeContesto(slug, { ...parsed.data, verificato: false });
  patchClientState(slug, (s) => {
    s.steps.contesto.stato = "da_verificare";
  });
  return NextResponse.json({ ok: true });
}

/** Conferma il contesto: gate di copertura deterministico, poi verificato. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!ensureClient(slug)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const contesto = readContesto(slug);
  if (!contesto) return NextResponse.json({ error: "contesto assente o non valido" }, { status: 404 });

  const problemi = checkCopertura(contesto);
  if (problemi.length) {
    return NextResponse.json({ error: "copertura incompleta", problemi }, { status: 422 });
  }
  writeContesto(slug, { ...contesto, verificato: true });
  const client = patchClientState(slug, (s) => {
    s.steps.contesto.stato = "verificato";
  });
  return NextResponse.json({ ok: true, client });
}
