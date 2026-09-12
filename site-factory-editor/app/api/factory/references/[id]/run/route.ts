import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { referenceDir } from "@/lib/factory/paths";
import { runReference } from "@/lib/factory/run";
import { rispostaStreamGenerator } from "@/lib/run-stream";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

/** POST: ri-esegue la verifica (opt-out + estrazione) di un riferimento esistente. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let dir: string;
  try {
    dir = referenceDir(id);
  } catch {
    return NextResponse.json({ error: `id non valido: ${id}` }, { status: 400 });
  }
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "riferimento inesistente" }, { status: 404 });
  return rispostaStreamGenerator(runReference(id));
}
