import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { writeJson, patchClientState, readContesto, writeContesto } from "@/lib/clients";
import { syncIntakeFromBrief } from "@/lib/intake-map";
import { snapshotFonte, applyIntakeToContesto } from "@/lib/contesto-sync";
import type { Brief } from "@/lib/clients";

export const dynamic = "force-dynamic";

/**
 * Riconcilia il contesto (se già generato) con l'intake appena salvato:
 * i campi meccanici si aggiornano da soli; i cambi semantici diventano drift.
 * Con contesto pre-esistente senza snapshot (`fonte`) → bootstrap silenzioso.
 */
function reconcileContesto(slug: string, brief: Brief): void {
  const contesto = readContesto(slug);
  if (!contesto) return; // nessun contesto ancora: niente da riconciliare
  const before = JSON.stringify(contesto);
  patchClientState(slug, (s) => {
    const fonte = s.steps.contesto.fonte;
    if (!fonte) {
      s.steps.contesto.fonte = snapshotFonte(brief); // baseline per i prossimi salvataggi
      return;
    }
    const res = applyIntakeToContesto(contesto, brief, fonte); // muta `contesto` in-place
    s.steps.contesto.fonte = res.fonte;
    if (res.driftFields.length) {
      s.steps.contesto.drift = Array.from(new Set([...(s.steps.contesto.drift ?? []), ...res.driftFields]));
    }
    if (JSON.stringify(res.contesto) !== before) writeContesto(slug, res.contesto);
  });
}

/** Salva la revisione intake: dual-write brief.json + intake.json, stato → verificato. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return NextResponse.json({ error: "slug non valido" }, { status: 400 });
  }
  const intakePath = path.join(dir, "intake.json");
  const briefPath = path.join(dir, "brief.json");
  if (!fs.existsSync(intakePath)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.brief !== "object" || typeof body.whatsapp !== "string") {
    return NextResponse.json({ error: "body atteso: { brief, whatsapp }" }, { status: 400 });
  }

  // Il brief arriva intero dal client (era stato caricato da disco); i campi
  // immutabili restano quelli su disco per sicurezza.
  const onDisk = JSON.parse(fs.readFileSync(briefPath, "utf8"));
  const brief = { ...onDisk, ...body.brief, submissionId: onDisk.submissionId, submittedAt: onDisk.submittedAt };

  const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
  const nextIntake = syncIntakeFromBrief(intake, brief, body.whatsapp);

  writeJson(briefPath, brief);
  writeJson(intakePath, nextIntake);
  patchClientState(slug, (s) => {
    s.steps.intake.stato = "verificato";
  });
  // Riconcilia il contesto già generato con i dati appena verificati.
  reconcileContesto(slug, brief);
  const client = patchClientState(slug, () => {}); // rilegge lo stato aggiornato
  return NextResponse.json({ ok: true, client });
}
