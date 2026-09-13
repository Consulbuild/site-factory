import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { clientDirEsistente as dirDi, SITE_RENDERER, NODE_BIN, childEnv } from "@/lib/paths";
import { readLogoTrace, writeLogoTrace, readIntake, writeIntake, readLogoBrief, patchClientState } from "@/lib/clients";
import { VARIANTE_RE, faviconArgs, applicaScelta, conBrandMark, parseEsito } from "@/lib/logo";
import { getSecret } from "@/lib/secrets";

export const dynamic = "force-dynamic";

// Varianti del logo generate da GPT Image (out/<slug>/logo/mark-N.png, 3-6 per
// cliente): GET serve un PNG (allow-list stretta, compreso il foglio di contatto
// del critico), POST cambia la variante scelta SENZA rigenerare nulla: copia del
// PNG in mark.png, favicon dal simbolo (edits, ~0,01 $, o ritaglio), trace
// aggiornato, brand.mark scritto se mancava (run finito senza scelta), step logo
// da riconfermare, build stale (logo-trace.json è tra gli upstream della build).

const FILE_OK = /^(mark(-[1-6])?|favicon|contatto(-[1-6])?)\.png$/;

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = dirDi(slug);
  const f = req.nextUrl.searchParams.get("f") ?? "";
  if (!dir || !FILE_OK.test(f)) return new NextResponse(null, { status: 404 });
  const file = path.join(dir, /^(mark-\d|contatto)/.test(f) ? "logo" : "", f);
  if (!fs.existsSync(file)) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = dirDi(slug);
  if (!dir) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const scelta = String(body.scelta ?? "");
  if (!VARIANTE_RE.test(scelta) || !fs.existsSync(path.join(dir, "logo", scelta))) {
    return NextResponse.json({ error: "variante non trovata" }, { status: 404 });
  }
  const trace = readLogoTrace(slug);
  if (!trace) return NextResponse.json({ error: "logo-trace.json assente o non valido" }, { status: 409 });

  fs.copyFileSync(path.join(dir, "logo", scelta), path.join(dir, "mark.png"));
  const r = spawnSync(NODE_BIN, faviconArgs(dir), {
    cwd: SITE_RENDERER,
    env: childEnv({ OPENAI_API_KEY: getSecret("OPENAI_API_KEY") ?? "" }),
    encoding: "utf8",
    timeout: 180_000,
  });
  if (r.status !== 0) return NextResponse.json({ error: `favicon fallita: ${(r.stderr || r.stdout).trim().slice(-300)}` }, { status: 500 });
  const esito = parseEsito((r.stdout ?? "").split("\n"));
  const favicon = { via: esito?.via === "edits" ? ("edits" as const) : ("ritaglio" as const), costo_usd: typeof esito?.costo_usd === "number" ? esito.costo_usd : 0 };

  const nuovo = applicaScelta(trace, `logo/${scelta}`, "scelta dall'operatore nel controllo finale", favicon);
  writeLogoTrace(slug, nuovo);
  const intake = readIntake(slug);
  if (intake) writeIntake(slug, conBrandMark(intake, readLogoBrief(slug)?.alt ?? `Logo ${String(intake["meta.businessName"] ?? slug)}`));
  patchClientState(slug, (s) => {
    s.steps.logo.stato = "da_verificare";
    delete s.steps.logo.autoConferma;
    delete s.steps.logo.errore;
  });
  return NextResponse.json({ ok: true, scelta: nuovo.scelta, favicon });
}
