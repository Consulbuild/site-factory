import { NextResponse } from "next/server";
import { activeRuns } from "@/lib/run-bus";

export const dynamic = "force-dynamic";

/** Stato dei run per la status bar: vivi, esiti recenti, zombie riparati. */
export async function GET() {
  return NextResponse.json(activeRuns(), { headers: { "Cache-Control": "no-store" } });
}
