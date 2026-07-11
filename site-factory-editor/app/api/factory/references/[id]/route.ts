import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { referenceDir } from "@/lib/factory/paths";

export const dynamic = "force-dynamic";

/** Thumbnail del riferimento (screenshot-1280.png catturato alla verifica). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let dir: string;
  try {
    dir = referenceDir(id);
  } catch {
    return NextResponse.json({ error: "id non valido" }, { status: 400 });
  }
  const file = path.join(dir, "screenshot-1280.png");
  if (!fs.existsSync(file)) return NextResponse.json({ error: "screenshot assente" }, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}

/** Elimina il riferimento (un URL sbagliato si elimina e si ricrea: l'id è l'hash dell'URL). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let dir: string;
  try {
    dir = referenceDir(id);
  } catch {
    return NextResponse.json({ error: "id non valido" }, { status: 400 });
  }
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "riferimento inesistente" }, { status: 404 });
  fs.rmSync(dir, { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
