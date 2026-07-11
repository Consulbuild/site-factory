import { NextRequest, NextResponse } from "next/server";
import { eventiDaBuffer, eventiDaFile } from "@/lib/run-bus";

export const dynamic = "force-dynamic";

/**
 * Tail a polling degli eventi di un run: ?id=<busId>&since=<indice>.
 * Buffer in memoria per i run del processo vivo; fallback sul run.ndjson
 * persistito per consultare un run dopo un riavvio dell'editor.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id mancante" }, { status: 400 });
  const since = Math.max(0, Number(req.nextUrl.searchParams.get("since") ?? 0) || 0);

  const buf = eventiDaBuffer(id, since);
  if (buf) return NextResponse.json(buf, { headers: { "Cache-Control": "no-store" } });

  const file = eventiDaFile(id);
  if (file) {
    return NextResponse.json(
      { ...file, events: file.events.slice(since) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json({ error: "run sconosciuto" }, { status: 404 });
}
