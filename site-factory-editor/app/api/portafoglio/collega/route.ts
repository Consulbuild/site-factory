import { NextRequest, NextResponse } from "next/server";
import { listClients } from "@/lib/clients";
import { collegaAbbonamento } from "@/lib/stripe";
import { invalidaPortafoglio } from "@/lib/portafoglio";

export const dynamic = "force-dynamic";

/** «Collega»: scrive `metadata.slug` sull'abbonamento Stripe indicato. L'unica
 *  scrittura verso Stripe dell'editor; la UI chiede conferma prima. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const subscriptionId = String(body.subscriptionId ?? "");
  const slug = String(body.slug ?? "");
  if (!/^sub_\w+$/.test(subscriptionId)) return NextResponse.json({ error: "id abbonamento non valido" }, { status: 400 });
  if (!listClients().some((c) => c.slug === slug)) return NextResponse.json({ error: "cliente sconosciuto" }, { status: 400 });
  try {
    await collegaAbbonamento(subscriptionId, slug);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
  invalidaPortafoglio("stripe:");
  return NextResponse.json({ ok: true });
}
