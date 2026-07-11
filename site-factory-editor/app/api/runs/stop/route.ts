import { NextRequest, NextResponse } from "next/server";
import { stopRun } from "@/lib/run-bus";

export const dynamic = "force-dynamic";

/** Stop di un run vivo (con conferma lato UI); su un run finito = dismiss dalla barra. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id mancante" }, { status: 400 });
  if (!stopRun(id)) return NextResponse.json({ error: "run sconosciuto" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
