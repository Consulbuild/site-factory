import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { patchClientState } from "@/lib/clients";
import { computeUpstream } from "@/lib/staleness";
import { STEPS, copyFonte, legaleFonte, type StepKey } from "@/lib/steps";

export const dynamic = "force-dynamic";

/**
 * «Va bene così» generico: l'operatore ha visto che gli artifact a monte sono
 * cambiati e decide che lo step resta valido — ri-snapshotta gli hash upstream
 * (e per il copy anche l'estratto per-campo del contesto).
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string; step: string }> }) {
  const { slug, step } = await ctx.params;
  try {
    if (!fs.existsSync(clientDir(slug))) throw new Error();
  } catch {
    return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  }
  const def = step in STEPS ? STEPS[step as StepKey] : null;
  if (!def || def.upstream.length === 0) {
    return NextResponse.json({ error: `step senza staleness a monte: ${step}` }, { status: 400 });
  }
  patchClientState(slug, (s) => {
    const key = def.stateKey as "palette" | "copy" | "images" | "legale";
    s.steps[key].upstream = computeUpstream(slug, def.upstream);
    if (key === "copy") s.steps.copy.fonte = copyFonte(slug) ?? undefined;
    if (key === "legale") s.steps.legale.fonte = legaleFonte(slug) ?? undefined;
  });
  return NextResponse.json({ ok: true });
}
