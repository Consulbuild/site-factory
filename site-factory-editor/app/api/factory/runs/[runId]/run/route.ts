import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { runDir } from "@/lib/factory/paths";
import { startFactoryRun, stopRun, busIdFabbrica } from "@/lib/run-bus";
import { rispostaStreamRun } from "@/lib/run-stream";

export const dynamic = "force-dynamic";
export const maxDuration = 3600; // designer + build + gate + critico (max 3 round)

/**
 * POST: esegue la run dalla prima fase non conclusa, IN BACKGROUND (bus dei
 * run), streaming NDJSON degli eventi. Chiudere lo stream non interrompe la
 * run; lo stop è il DELETE.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  let dir: string;
  try {
    dir = runDir(runId);
  } catch {
    return NextResponse.json({ error: `runId non valido: ${runId}` }, { status: 400 });
  }
  if (!fs.existsSync(path.join(dir, "run.json"))) {
    return NextResponse.json({ error: "run inesistente" }, { status: 404 });
  }

  const avvio = startFactoryRun(runId);
  if ("error" in avvio) return NextResponse.json({ error: avvio.error }, { status: 409 });
  return rispostaStreamRun(avvio.id);
}

/** Stop esplicito della run in corso (SIGTERM ai child; stato → fallita, riprendibile). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  const fermato = stopRun(busIdFabbrica(runId));
  if (!fermato) return NextResponse.json({ error: "nessuna run in corso" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
