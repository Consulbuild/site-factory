import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { runDir } from "@/lib/factory/paths";

export const dynamic = "force-dynamic";

const FILE_OK = /^[a-z0-9-]+\.jpg$/;

/** GET: uno shot del candidato della run (per l'audit pairwise). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ runId: string; file: string }> }) {
  const { runId, file } = await ctx.params;
  if (!FILE_OK.test(file)) return NextResponse.json({ error: "file non valido" }, { status: 400 });
  let f: string;
  try {
    f = path.join(runDir(runId), "shots", file);
  } catch {
    return NextResponse.json({ error: "runId non valido" }, { status: 400 });
  }
  if (!fs.existsSync(f)) return NextResponse.json({ error: "shot assente" }, { status: 404 });
  return new Response(fs.readFileSync(f), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
  });
}
