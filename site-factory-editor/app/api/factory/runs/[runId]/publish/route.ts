import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { IO } from "@/lib/run-step";
import { NODE_BIN, SITE_RENDERER } from "@/lib/paths";
import { runDir } from "@/lib/factory/paths";
import { readRun } from "@/lib/factory/state";

export const dynamic = "force-dynamic";
export const maxDuration = 1800; // fetch-fonts + build + baseline/verifica VRT

/** POST: pubblica il candidato approvato (streaming NDJSON di publish-preset.mjs). */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  const run = readRun(runId);
  if (!run) return NextResponse.json({ error: "run inesistente" }, { status: 404 });
  const dir = runDir(runId);
  if (!fs.existsSync(path.join(dir, "audit.json"))) {
    return NextResponse.json({ error: "audit assente: prima l'audit pairwise" }, { status: 409 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emetti = (ev: unknown) => controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      try {
        const gen = IO.script({
          phase: "Pubblicazione preset (tokens → libreria → VRT)",
          bin: NODE_BIN,
          args: [path.join(SITE_RENDERER, "scripts", "factory", "publish-preset.mjs"), dir],
          cwd: SITE_RENDERER,
          timeoutMs: 25 * 60 * 1000,
        });
        let next = await gen.next();
        while (!next.done) {
          emetti(next.value);
          next = await gen.next();
        }
        if (next.value.ok) emetti({ type: "done", artifact: "preset pubblicato" });
        else emetti({ type: "error", message: next.value.error ?? "pubblicazione fallita" });
      } catch (e) {
        emetti({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
