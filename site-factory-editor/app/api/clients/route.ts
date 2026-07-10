import { NextRequest, NextResponse } from "next/server";
import { getHomeData, importSubmission, TallyKeyMissingError, TallyApiError, SlugExistsError } from "@/lib/tally";

export const dynamic = "force-dynamic";

/** Lista merged: clienti su disco + submission Tally non ancora importate. */
export async function GET() {
  return NextResponse.json(await getHomeData());
}

/** Import di una submission → crea out/<slug>/. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const submissionId = String(body.submissionId ?? "");
  if (!submissionId) return NextResponse.json({ error: "submissionId mancante" }, { status: 400 });
  try {
    const slug = await importSubmission(submissionId, body.overwrite === true);
    return NextResponse.json({ slug });
  } catch (e) {
    if (e instanceof SlugExistsError) return NextResponse.json({ error: "esiste", slug: e.slug }, { status: 409 });
    if (e instanceof TallyKeyMissingError) return NextResponse.json({ error: "key_mancante" }, { status: 428 });
    if (e instanceof TallyApiError) return NextResponse.json({ error: e.message }, { status: 502 });
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
