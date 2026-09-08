import { NextRequest, NextResponse } from "next/server";
import { spegniDemoScadute } from "@/lib/demo-sweep";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Giro manuale del sweep delle demo scadute. Body { dryRun: true } = solo elenco. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const esiti = await spegniDemoScadute(body?.dryRun === true);
  return NextResponse.json({ ok: true, esiti });
}
