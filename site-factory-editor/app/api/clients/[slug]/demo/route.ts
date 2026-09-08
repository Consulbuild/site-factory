import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { readClientState, patchClientState } from "@/lib/clients";
import { deployDemo, spegniDemo, prorogaDemo } from "@/lib/deploy";
import { avviaCatena } from "@/lib/catena";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Azioni sulla demo del cliente (decisione 2026-09-08): pubblica sul worker
// «<slug>-demo», spegni, proroga di 15 giorni, «il cliente si è abbonato»
// (percorso completo + scadenza congelata). Tutte confermate in UI.

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    if (!fs.existsSync(clientDir(slug))) throw new Error();
  } catch {
    return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  try {
    if (action === "pubblica") {
      const demo = await deployDemo(slug);
      return NextResponse.json({ ok: true, demo });
    }
    if (action === "spegni") {
      if (!readClientState(slug).demo) return NextResponse.json({ error: "nessuna demo pubblicata" }, { status: 409 });
      await spegniDemo(slug);
      return NextResponse.json({ ok: true });
    }
    if (action === "proroga") {
      return NextResponse.json({ ok: true, scadenza: prorogaDemo(slug) });
    }
    if (action === "abbonato") {
      const client = patchClientState(slug, (s) => {
        s.percorso = "completo";
        if (s.demo) s.demo.congelata = true;
      });
      // Il completamento (legale, poi build col dominio) parte da solo; se una
      // catena è già viva continuerà leggendo il percorso aggiornato.
      const catena = avviaCatena(slug);
      return NextResponse.json({ ok: true, percorso: client.percorso, catena: "error" in catena ? catena.error : "avviata" });
    }
    return NextResponse.json({ error: `azione sconosciuta: ${action}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
