import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { runDir } from "@/lib/factory/paths";
import { AuditSchema } from "@/lib/factory/schemas";
import { readRun, aggiornaRun } from "@/lib/factory/state";

export const dynamic = "force-dynamic";

/** POST: salva l'audit umano (audit.json). Su "scarta" chiude la run. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  const run = readRun(runId);
  if (!run) return NextResponse.json({ error: "run inesistente" }, { status: 404 });
  if (run.stato !== "da_audire" && run.stato !== "pubblicata") {
    return NextResponse.json({ error: `la run è "${run.stato}": l'audit richiede "da_audire"` }, { status: 409 });
  }
  const body = await req.json().catch(() => null);
  const parsed = AuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "audit non valido", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 },
    );
  }
  if (parsed.data.decisione === "approva" && !parsed.data.meta) {
    return NextResponse.json({ error: "su «approva» i metadati del preset sono obbligatori" }, { status: 422 });
  }
  fs.writeFileSync(path.join(runDir(runId), "audit.json"), JSON.stringify(parsed.data, null, 2) + "\n");
  if (parsed.data.decisione === "scarta") {
    aggiornaRun(runId, (r) => {
      r.stato = "scartata";
    });
  }
  return NextResponse.json({ ok: true });
}
