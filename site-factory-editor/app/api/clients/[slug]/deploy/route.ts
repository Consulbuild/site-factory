import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { readClientState } from "@/lib/clients";
import { deployClient } from "@/lib/deploy";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // wrangler può impiegare minuti al primo upload

// Route dedicata (non una fase della run route): il deploy non è uno StepDef —
// runStep azzererebbe il «verificato» appena confermato, e qui non c'è
// artifact né validate. POST semplice, esito JSON.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    if (!fs.existsSync(clientDir(slug))) throw new Error();
  } catch {
    return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  }

  const build = readClientState(slug).steps.build;
  if (build.stato !== "verificato") {
    return NextResponse.json(
      { error: "la build va prima rivista e confermata: si pubblica solo ciò che hai approvato" },
      { status: 409 },
    );
  }
  if (build.partial) {
    return NextResponse.json(
      { error: "l'ultima build è PARZIALE (segnaposto del blueprint): builda il sito completo prima di pubblicare" },
      { status: 409 },
    );
  }

  try {
    const r = await deployClient(slug);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
