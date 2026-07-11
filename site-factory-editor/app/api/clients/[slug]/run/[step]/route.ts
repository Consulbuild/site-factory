import { NextRequest } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { runStep } from "@/lib/run-step";
import { STEPS, type StepKey, type RunMode } from "@/lib/steps";

export const dynamic = "force-dynamic";
export const maxDuration = 3600; // secondi: gli step multi-fase possono durare a lungo

const MODES: RunMode[] = ["generate", "update", "critic", "regen", "partial"];

/** Esegue uno step AI e streamma gli eventi in NDJSON. Route generica: la
 *  logica per-step (fasi, prompt, modalità) vive tutta nel registry STEPS. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string; step: string }> }) {
  const { slug, step } = await ctx.params;

  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return new Response(JSON.stringify({ error: "slug non valido" }), { status: 400 });
  }
  if (!fs.existsSync(dir)) return new Response(JSON.stringify({ error: "cliente non trovato" }), { status: 404 });
  if (!(step in STEPS)) return new Response(JSON.stringify({ error: `step sconosciuto: ${step}` }), { status: 400 });

  const body = await req.json().catch(() => ({}));
  const mode: RunMode = MODES.includes(body?.mode) ? body.mode : "generate";

  // Gate di ingresso dello step (es. palette richiede contesto verificato);
  // riceve il mode perché alcuni prerequisiti dipendono da esso (es. la key
  // BFL serve a generare immagini, non al solo ricontrollo del critico).
  const gateMsg = STEPS[step as StepKey].gate?.(slug, mode);
  if (gateMsg) return new Response(JSON.stringify({ error: gateMsg }), { status: 409 });
  // Solo mode "regen": lista dei file da rigenerare, filtrata (anti path traversal).
  const files: string[] | undefined = Array.isArray(body?.files)
    ? body.files.filter((f: unknown): f is string => typeof f === "string" && /^img\/[a-z0-9-]+\.jpg$/.test(f))
    : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runStep(slug, step as StepKey, { mode, files })) {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
        }
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
