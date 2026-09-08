import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { avviaCatena, fermaCatena } from "@/lib/catena";

export const dynamic = "force-dynamic";

// Catena automatica del cliente: POST = avvia/riprendi (202: il lavoro è
// staccato dalla richiesta, come i run del bus), DELETE = ferma.

export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    if (!fs.existsSync(clientDir(slug))) throw new Error();
  } catch {
    return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  }
  const r = avviaCatena(slug);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 409 });
  return NextResponse.json({ ok: true, posizione: r.posizione }, { status: 202 });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!fermaCatena(slug)) return NextResponse.json({ error: "nessuna catena in corso" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
