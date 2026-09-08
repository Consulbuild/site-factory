import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { clientDir, SITE_RENDERER, NODE_BIN, childEnv } from "@/lib/paths";
import { readPalette, patchClientState, writeJson } from "@/lib/clients";

export const dynamic = "force-dynamic";

// Varianti del mark generate dal logo-designer (out/<slug>/logo/mark-N.svg):
// GET serve un SVG (allow-list stretta), POST cambia la variante scelta col
// ricoloro OFFLINE dello script (niente Recraft, niente claude): kit alla
// radice riscritto, trace aggiornato, step logo da riconfermare, build stale
// (logo-trace.json è tra gli upstream della build).

const FILE_OK = /^(mark(-\d)?(-dark)?|favicon)\.svg$/;
const VARIANTE_OK = /^mark-\d\.svg$/;
const SCRIPT = path.join(SITE_RENDERER, "scripts", "generate-logo.mjs");

function dirDi(slug: string): string | null {
  try {
    const d = clientDir(slug);
    return fs.existsSync(d) ? d : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = dirDi(slug);
  const f = req.nextUrl.searchParams.get("f") ?? "";
  if (!dir || !FILE_OK.test(f)) return new NextResponse(null, { status: 404 });
  const file = path.join(dir, /^mark-\d/.test(f) ? "logo" : "", f);
  if (!fs.existsSync(file)) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = dirDi(slug);
  if (!dir) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const scelta = String(body.scelta ?? "");
  if (!VARIANTE_OK.test(scelta) || !fs.existsSync(path.join(dir, "logo", scelta))) {
    return NextResponse.json({ error: "variante non trovata" }, { status: 404 });
  }
  const primary = readPalette(slug)?.["brand.palette.primary"];
  if (!primary) return NextResponse.json({ error: "palette assente: il mark si ricolora sul primary" }, { status: 409 });

  const src = path.join(dir, "logo", scelta);
  for (const out of ["mark.svg", "favicon.svg"]) {
    const r = spawnSync(NODE_BIN, [SCRIPT, "--recolor", src, "--color", primary, "--out", path.join(dir, out)], {
      cwd: SITE_RENDERER,
      env: childEnv(),
      encoding: "utf8",
    });
    if (r.status !== 0) return NextResponse.json({ error: `ricoloro fallito: ${(r.stderr || r.stdout).trim().slice(-300)}` }, { status: 500 });
  }

  const traceFile = path.join(dir, "logo-trace.json");
  let trace: { scelta?: string; varianti?: Array<{ file: string; esito: string; motivo?: string }> } = {};
  try {
    trace = JSON.parse(fs.readFileSync(traceFile, "utf8"));
  } catch {
    /* trace assente: se ne scrive uno minimo */
  }
  trace.scelta = `logo/${scelta}`;
  trace.varianti = (trace.varianti ?? []).map((v) => ({
    ...v,
    esito: v.file === `logo/${scelta}` ? "scelta" : v.esito === "scelta" ? "scartata" : v.esito,
    ...(v.file === `logo/${scelta}` ? { motivo: "scelta dall'operatore nel controllo finale" } : {}),
  }));
  writeJson(traceFile, trace);
  patchClientState(slug, (s) => {
    s.steps.logo.stato = "da_verificare";
    delete s.steps.logo.autoConferma;
    delete s.steps.logo.errore;
  });
  return NextResponse.json({ ok: true, scelta: trace.scelta });
}
