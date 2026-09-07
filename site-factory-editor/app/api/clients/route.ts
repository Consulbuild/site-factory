import { NextRequest, NextResponse } from "next/server";
import { getHomeData, importSubmission, TallyKeyMissingError, TallyApiError, SlugExistsError } from "@/lib/tally";
import { isLeadForm, importLeadForm, SlugEsistente, LeadNonPronto } from "@/lib/inbox-form";

export const dynamic = "force-dynamic";

/** Lista merged: clienti su disco + richieste (form e Tally) non ancora importate. */
export async function GET() {
  return NextResponse.json(await getHomeData());
}

/** Import di una richiesta → crea out/<slug>/. L'id dice da solo la fonte: se è in _inbox è del form. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const submissionId = String(body.submissionId ?? "");
  if (!submissionId) return NextResponse.json({ error: "submissionId mancante" }, { status: 400 });
  try {
    const slug = isLeadForm(submissionId) ? importLeadForm(submissionId, body.overwrite === true) : await importSubmission(submissionId, body.overwrite === true);
    return NextResponse.json({ slug });
  } catch (e) {
    if (e instanceof SlugExistsError || e instanceof SlugEsistente) return NextResponse.json({ error: "esiste", slug: e.slug }, { status: 409 });
    if (e instanceof LeadNonPronto) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof TallyKeyMissingError) return NextResponse.json({ error: "key_mancante" }, { status: 428 });
    if (e instanceof TallyApiError) return NextResponse.json({ error: e.message }, { status: 502 });
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
