import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { listClients } from "@/lib/clients";
import { getRun, busIdCliente } from "@/lib/run-bus";
import { STEPS, type StepKey } from "@/lib/steps";

export const dynamic = "force-dynamic";

/**
 * Eliminazione DIRETTA del cliente (decisione Mattia 2026-07-11): cancella
 * out/<slug> con tutti gli artifact. Difesa in profondità: il body deve
 * ripetere la ragione sociale esatta (la UI la fa digitare), e non si
 * elimina con un run in corso. La submission Tally resta reimportabile;
 * un eventuale sito già deployato resta online (fuori scope, detto nel dialog).
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return NextResponse.json({ error: "slug non valido" }, { status: 400 });
  }
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  for (const step of Object.keys(STEPS) as StepKey[]) {
    const run = getRun(busIdCliente(slug, step));
    if (run && !run.done) {
      return NextResponse.json({ error: "c'è un run in corso per questo cliente: fermalo prima di eliminare" }, { status: 409 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const nome = listClients().find((c) => c.slug === slug)?.businessName ?? slug;
  if (typeof body?.nome !== "string" || body.nome.trim() !== nome) {
    return NextResponse.json({ error: "conferma non valida: digita la ragione sociale esatta" }, { status: 422 });
  }

  fs.rmSync(dir, { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
