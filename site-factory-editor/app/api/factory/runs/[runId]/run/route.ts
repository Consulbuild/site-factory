import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { runDir } from "@/lib/factory/paths";
import { eseguiRun } from "@/lib/factory/fasi";

export const dynamic = "force-dynamic";
export const maxDuration = 3600; // designer + build + gate + critico (max 3 round)

/** POST: esegue la run dalla prima fase non conclusa, streaming NDJSON. */
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of eseguiRun(runId))
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      } catch (e) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", message: e instanceof Error ? e.message : String(e) }) + "\n"),
        );
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
