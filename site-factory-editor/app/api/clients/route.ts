import { NextRequest, NextResponse } from "next/server";
import { getHomeData } from "@/lib/home-data";
import { importLeadForm, SlugEsistente, LeadNonPronto } from "@/lib/inbox-form";

export const dynamic = "force-dynamic";

/** Lista merged: clienti su disco + richieste del form non ancora importate. */
export async function GET() {
  return NextResponse.json(getHomeData());
}

/** Import di una richiesta del form (_inbox/<id>) → crea out/<slug>/. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const submissionId = String(body.submissionId ?? "");
  if (!submissionId) return NextResponse.json({ error: "submissionId mancante" }, { status: 400 });
  try {
    const slug = importLeadForm(submissionId, body.overwrite === true);
    return NextResponse.json({ slug });
  } catch (e) {
    if (e instanceof SlugEsistente) return NextResponse.json({ error: "esiste", slug: e.slug }, { status: 409 });
    if (e instanceof LeadNonPronto) return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
