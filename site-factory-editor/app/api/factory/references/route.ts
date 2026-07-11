import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { z } from "zod";
import { referenceDir } from "@/lib/factory/paths";
import { createReference, referenceIdFor } from "@/lib/factory/state";
import { runReference } from "@/lib/factory/run";

export const dynamic = "force-dynamic";
export const maxDuration = 900; // opt-out + dembrandt + screenshot

const BodySchema = z.object({
  url: z.string().url().startsWith("http"),
  galleria: z.string().trim().max(120).optional(),
  settore: z.string().trim().max(120).optional(),
  zonaGeografica: z.string().trim().max(120).optional(),
  nota: z.string().trim().max(500).optional(),
  // checkbox obbligatoria e loggata: mai concorrenti locali dei clienti
  attestazioneNonConcorrente: z.literal(true),
});

/** POST: registra un riferimento e streamma verifica opt-out + estrazione (NDJSON). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "dati non validi", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 },
    );
  }
  const { url, ...meta } = parsed.data;
  const id = referenceIdFor(url);
  if (fs.existsSync(referenceDir(id))) {
    return NextResponse.json({ error: `riferimento già registrato (${id})` }, { status: 409 });
  }
  createReference(url, meta);

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
