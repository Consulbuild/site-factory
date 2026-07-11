import { NextRequest } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { STEPS, type StepKey, type RunMode } from "@/lib/steps";
import { listClients } from "@/lib/clients";
import { startClientRun, stopRun, busIdCliente } from "@/lib/run-bus";
import { rispostaStreamRun } from "@/lib/run-stream";

export const dynamic = "force-dynamic";
export const maxDuration = 3600; // secondi: gli step multi-fase possono durare a lungo

const MODES: RunMode[] = ["generate", "update", "critic", "regen", "partial"];

/**
 * Avvia uno step AI IN BACKGROUND (bus dei run) e streamma gli eventi in
 * NDJSON. Chiudere lo stream non interrompe più il run: lo stop è il DELETE.
 * La logica per-step (fasi, prompt, modalità) vive tutta nel registry STEPS.
 */
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

  const label = listClients().find((c) => c.slug === slug)?.businessName ?? slug;
  const avvio = startClientRun(slug, step as StepKey, { mode, files }, label);
  if ("error" in avvio) return new Response(JSON.stringify({ error: avvio.error }), { status: 409 });

  return rispostaStreamRun(avvio.id);
}

/** Stop esplicito del run in corso (SIGTERM ai child; stato → errore). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string; step: string }> }) {
  const { slug, step } = await ctx.params;
  const fermato = stopRun(busIdCliente(slug, step));
  if (!fermato) return new Response(JSON.stringify({ error: "nessun run in corso" }), { status: 404 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
