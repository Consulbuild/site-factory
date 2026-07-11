import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { runDir } from "@/lib/factory/paths";
import { getRun, busIdFabbrica } from "@/lib/run-bus";

export const dynamic = "force-dynamic";

/** Elimina la run (cartella intera). Un preset già pubblicato resta in libreria. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  let dir: string;
  try {
    dir = runDir(runId);
  } catch {
    return NextResponse.json({ error: "runId non valido" }, { status: 400 });
  }
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "run inesistente" }, { status: 404 });
  const viva = getRun(busIdFabbrica(runId));
  if (viva && !viva.done) {
    return NextResponse.json({ error: "run in esecuzione: fermala prima di eliminarla" }, { status: 409 });
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
