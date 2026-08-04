import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { clientDir } from "@/lib/paths";
import { patchClientState, writeJson } from "@/lib/clients";
import { computeUpstream } from "@/lib/staleness";
import { legaleFonte } from "@/lib/steps";
import { LegaleSchema, gateLegale, briefLegale, readForo, readLegale, readLegaleReview } from "@/lib/legale";

export const dynamic = "force-dynamic";

// Scheda Legale: PUT = salva l'artifact modificato a mano (mai su disco un
// artifact non conforme — specchio Zod + gate unico → 422); POST = conferma
// umana. Il server RIVERIFICA le condizioni di conferma (pattern copy/route,
// indurito per il costo d'errore legale).

function leggiBrief(slug: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(path.join(clientDir(slug), "brief.json"), "utf8"));
  } catch {
    return {};
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    if (!fs.existsSync(clientDir(slug))) throw new Error();
  } catch {
    return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = LegaleSchema.safeParse(body?.legale);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "formato non conforme al contratto", errors: parsed.error.issues.slice(0, 8).map((i) => `«${i.path.join(".")}»: ${i.message}`) },
      { status: 422 },
    );
  }
  const b = briefLegale(leggiBrief(slug));
  if ("errore" in b) return NextResponse.json({ error: b.errore }, { status: 422 });
  const errs = gateLegale(parsed.data, b, readForo(slug));
  if (errs.length) return NextResponse.json({ error: "gate legale non superato", errors: errs.slice(0, 10) }, { status: 422 });
  writeJson(path.join(clientDir(slug), "legale.json"), parsed.data);
  patchClientState(slug, (s) => {
    s.steps.legale.stato = "da_verificare";
    delete s.steps.legale.errore;
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    if (!fs.existsSync(clientDir(slug))) throw new Error();
  } catch {
    return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  }
  const legale = readLegale(slug);
  if (!legale) return NextResponse.json({ error: "nessun legale.json da confermare" }, { status: 422 });
  const b = briefLegale(leggiBrief(slug));
  if ("errore" in b) return NextResponse.json({ error: b.errore }, { status: 422 });
  const errs = gateLegale(legale, b, readForo(slug));
  if (errs.length) return NextResponse.json({ error: "gate legale non superato", errors: errs.slice(0, 10) }, { status: 422 });

  const body = await req.json().catch(() => ({}));
  if (body?.override !== true) {
    const review = readLegaleReview(slug);
    const corrente =
      !!review?.giudicatoSu && JSON.stringify(review.giudicatoSu) === JSON.stringify(computeUpstream(slug, ["legale.json"]));
    const foro = readForo(slug);
    const motivi = [
      !review ? "la catena di verifica non è mai stata eseguita" : review.verdict !== "PASS" ? "verifica della catena: FAIL" : null,
      review && !corrente ? "la verifica non è aggiornata all'artifact corrente (usa «Riverifica»)" : null,
      foro?.confidenza !== "alta" ? "derivazione del foro a confidenza bassa: va confermata dall'operatore" : null,
    ].filter(Boolean);
    if (motivi.length) return NextResponse.json({ error: motivi.join("; ") }, { status: 409 });
  }
  patchClientState(slug, (s) => {
    s.steps.legale.stato = "verificato";
    s.steps.legale.upstream = computeUpstream(slug, ["brief.json"]);
    s.steps.legale.fonte = legaleFonte(slug) ?? undefined;
    delete s.steps.legale.errore;
  });
  return NextResponse.json({ ok: true });
}
