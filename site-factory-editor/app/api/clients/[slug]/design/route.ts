import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { z } from "zod";
import { clientDir } from "@/lib/paths";
import { readDesign, writeDesign, registraAssegnazione, assignDesign } from "@/lib/assign-design";
import { listPresets } from "@/lib/factory/state";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ preset: z.string().min(1) });

/** POST: override umano dell'assegnazione design (registrato, mai silenzioso). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return NextResponse.json({ error: "slug non valido" }, { status: 400 });
  }
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "cliente inesistente" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "dati non validi" }, { status: 400 });
  const attivi = listPresets().filter((p) => p.stato === "attivo").map((p) => p.id);
  if (!attivi.includes(parsed.data.preset)) {
    return NextResponse.json({ error: `preset "${parsed.data.preset}" non attivo` }, { status: 422 });
  }

  // base: l'assegnazione esistente, o una fresca se il cliente non l'ha ancora
  let design = readDesign(slug);
  if (!design) {
    try {
      design = assignDesign(slug);
    } catch (e) {
      return NextResponse.json(
        { error: `assegnazione non calcolabile: ${e instanceof Error ? e.message : e}` },
        { status: 422 },
      );
    }
  }
  const da = design.preset;
  const versione = listPresets().find((p) => p.id === parsed.data.preset)?.version ?? "1.0.0";
  writeDesign(slug, {
    ...design,
    preset: parsed.data.preset,
    version: versione,
    motivo: `override umano (da «${da}» a «${parsed.data.preset}») — ${new Date().toISOString().slice(0, 10)}; assegnazione originale: ${design.motivo}`,
    assegnatoIl: new Date().toISOString(),
  });
  registraAssegnazione(slug, null); // hue arriverà dalla prossima palette
  return NextResponse.json({ ok: true });
}
