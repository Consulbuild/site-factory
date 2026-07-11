import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { FACTORY_ROOT } from "@/lib/factory/paths";

export const dynamic = "force-dynamic";

const PRESET_OK = /^[a-z][a-z0-9]*$/;
const FILE_OK = /^[a-z0-9-]+\.jpg$/;

/** GET: uno shot di un preset ESISTENTE (calibration; meridian vive nel goldset). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ preset: string; file: string }> }) {
  const { preset, file } = await ctx.params;
  if (!PRESET_OK.test(preset) || !FILE_OK.test(file)) {
    return NextResponse.json({ error: "parametri non validi" }, { status: 400 });
  }
  const base =
    preset === "meridian"
      ? path.join(FACTORY_ROOT, "calibration", "goldset", "passa-golden-meridian")
      : path.join(FACTORY_ROOT, "calibration", "presets", preset);
  const f = path.join(base, file);
  if (!fs.existsSync(f)) return NextResponse.json({ error: "shot assente" }, { status: 404 });
  return new Response(fs.readFileSync(f), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
  });
}
