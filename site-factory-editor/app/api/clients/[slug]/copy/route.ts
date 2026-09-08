import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { writeCopy, patchClientState } from "@/lib/clients";
import { validateCopyArtifact, type CopyArtifact } from "@/lib/slots";
import { confermaCopy, rispostaConferma } from "@/lib/conferme";

export const dynamic = "force-dynamic";

function ensureClient(slug: string): string | null {
  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return null;
  }
  return fs.existsSync(dir) ? dir : null;
}

/**
 * Salva il copy (modifica manuale). Il contratto di formato è un gate anche
 * qui: un artifact non conforme fallirebbe l'assembler a valle, quindi non
 * viene MAI scritto su disco — 422 con l'elenco puntuale degli errori.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!ensureClient(slug)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const copy = body?.copy;
  if (!copy || typeof copy !== "object" || Array.isArray(copy)) {
    return NextResponse.json({ error: "body atteso: { copy: <mappa slot→valore> }" }, { status: 400 });
  }
  const errors = validateCopyArtifact(copy);
  if (errors.length) {
    return NextResponse.json({ error: "contratto di formato non rispettato", errors }, { status: 422 });
  }
  writeCopy(slug, copy as CopyArtifact);
  patchClientState(slug, (s) => {
    s.steps.copy.stato = "da_verificare";
    delete s.steps.copy.errore;
  });
  return NextResponse.json({ ok: true });
}

/** Conferma umana del copy (rivalida 32/32 + snapshot provenienza in lib/conferme.ts). */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!ensureClient(slug)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  const { body, status } = rispostaConferma(confermaCopy(slug));
  return NextResponse.json(body, { status });
}
