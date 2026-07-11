import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRun } from "@/lib/factory/state";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ references: z.array(z.string()).min(1) });

/** POST: crea una run di fabbrica. I gate (≥3 riferimenti, opt-out consentito,
 *  attestazione, estrazione presente) vivono in createRun: violazione = 422. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "dati non validi" }, { status: 400 });
  try {
    const { runId } = createRun(parsed.data.references);
    return NextResponse.json({ ok: true, runId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 422 });
  }
}
