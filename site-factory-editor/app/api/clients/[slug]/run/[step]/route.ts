import { NextRequest } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { STEPS, STEP_MODES, type StepKey, type RunMode } from "@/lib/steps";
import { listClients } from "@/lib/clients";
import { startClientRun } from "@/lib/run-bus";
import { rispostaStreamRun } from "@/lib/run-stream";
import { catenaViva, invalidaCatena } from "@/lib/catena";

export const dynamic = "force-dynamic";
export const maxDuration = 3600; // secondi: gli step multi-fase possono durare a lungo

/**
 * Avvia uno step AI IN BACKGROUND (bus dei run) e streamma gli eventi in
 * NDJSON. Chiudere lo stream non interrompe il run: lo stop passa da
 * POST /api/runs/stop (status bar). La logica per-step (fasi, prompt,
 * modalità) vive tutta nel registry STEPS.
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

  // La catena automatica lancia gli step da sola: un avvio a mano nel mezzo
  // farebbe collidere due run sullo stesso workspace.
  if (catenaViva(slug)) {
    return new Response(JSON.stringify({ error: "catena automatica in corso per questo cliente: fermala prima di lanciare uno step a mano" }), { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const mode: RunMode = body?.mode ?? "generate";
  if (!STEP_MODES[step as StepKey].includes(mode)) {
    return new Response(JSON.stringify({ error: `modalità «${String(mode)}» non prevista per lo step ${step}` }), { status: 400 });
  }

  // Gate di ingresso dello step (es. palette richiede contesto verificato);
  // riceve il mode perché alcuni prerequisiti dipendono da esso (es. la key
  // BFL serve a generare immagini, non al solo ricontrollo del critico).
  const gateMsg = STEPS[step as StepKey].gate?.(slug, mode);
  if (gateMsg) return new Response(JSON.stringify({ error: gateMsg }), { status: 409 });
  // Un run manuale che (ri)scrive un artifact scavalca le conclusioni della
  // catena (ferma/demo_pronta/completata): non descrivono più lo stato.
  if (mode !== "critic") invalidaCatena(slug);
  // Solo mode "regen": lista dei file da rigenerare, filtrata (anti path traversal).
  const files: string[] | undefined = Array.isArray(body?.files)
    ? body.files.filter((f: unknown): f is string => typeof f === "string" && /^img\/[a-z0-9-]+\.jpg$/.test(f))
    : undefined;

  const label = listClients().find((c) => c.slug === slug)?.businessName ?? slug;
  const avvio = startClientRun(slug, step as StepKey, { mode, files }, label);
  if ("error" in avvio) return new Response(JSON.stringify({ error: avvio.error }), { status: 409 });

  return rispostaStreamRun(avvio.id);
}
