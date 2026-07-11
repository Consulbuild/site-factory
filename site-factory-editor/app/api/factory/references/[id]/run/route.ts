import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { referenceDir } from "@/lib/factory/paths";
import { runReference } from "@/lib/factory/run";

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runReference(id))
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
