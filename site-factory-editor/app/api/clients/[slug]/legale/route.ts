import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { clientDir } from "@/lib/paths";
import { patchClientState, writeJson } from "@/lib/clients";
import { LegaleSchema, gateLegale, briefLegale, readForo } from "@/lib/legale";
import { confermaLegale, leggiBrief, rispostaConferma } from "@/lib/conferme";

export const dynamic = "force-dynamic";

// Scheda Legale: PUT = salva l'artifact modificato a mano (mai su disco un
// artifact non conforme — specchio Zod + gate unico → 422); POST = conferma
// umana. Il server RIVERIFICA le condizioni di conferma (lib/conferme.ts,
// indurito per il costo d'errore legale: 409 salvo override esplicito).

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
  const body = await req.json().catch(() => ({}));
  const { body: out, status } = rispostaConferma(confermaLegale(slug, { override: body?.override === true }));
  return NextResponse.json(status === 200 ? { ok: true } : out, { status });
}
