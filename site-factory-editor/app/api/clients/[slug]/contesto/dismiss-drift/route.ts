import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { clientDir } from "@/lib/paths";
import { patchClientState, type Brief } from "@/lib/clients";
import { snapshotFonte } from "@/lib/contesto-sync";

export const dynamic = "force-dynamic";

/** «Ho sistemato a mano»: azzera il drift e riallinea lo snapshot al brief corrente. */
export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return NextResponse.json({ error: "slug non valido" }, { status: 400 });
  }
  const briefPath = path.join(dir, "brief.json");
  if (!fs.existsSync(briefPath)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  const brief = JSON.parse(fs.readFileSync(briefPath, "utf8")) as Brief;
  const client = patchClientState(slug, (s) => {
    s.steps.contesto.fonte = snapshotFonte(brief);
    s.steps.contesto.drift = [];
  });
  return NextResponse.json({ ok: true, client });
}
