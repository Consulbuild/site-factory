import { NextRequest, NextResponse } from "next/server";
import { eliminaLeadForm } from "@/lib/inbox-form";

export const dynamic = "force-dynamic";

/** Elimina una richiesta del form non importata: via la cartella _inbox/<id>. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    eliminaLeadForm(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: /non trovata/.test(msg) ? 404 : 400 });
  }
}
