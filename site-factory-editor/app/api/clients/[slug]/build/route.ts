import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { clientDir } from "@/lib/paths";
import { readClientState, patchClientState } from "@/lib/clients";
import { setPreviewRoot } from "@/lib/preview";

export const dynamic = "force-dynamic";

// Azioni non-run della scheda Build: anteprima locale, conferma umana,
// dominio custom. La build vera passa dalla route generica run/[step].

// Etichette [a-z0-9-] (senza trattini ai bordi) separate da punti singoli + TLD.
const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return NextResponse.json({ error: "slug non valido" }, { status: 400 });
  }
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "preview") {
    const dist = path.join(dir, "dist");
    if (!fs.existsSync(path.join(dist, "index.html"))) {
      return NextResponse.json({ error: "nessuna build da mostrare: builda prima il sito" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, url: setPreviewRoot(dist) });
  }

  if (action === "confirm") {
    const build = readClientState(slug).steps.build;
    if (build.stato !== "da_verificare") {
      return NextResponse.json({ error: `build in stato «${build.stato}»: nulla da confermare` }, { status: 409 });
    }
    if (build.partial) {
      return NextResponse.json(
        { error: "l'ultima build è PARZIALE (segnaposto del blueprint): si conferma solo una build completa" },
        { status: 409 },
      );
    }
    patchClientState(slug, (s) => {
      s.steps.build.stato = "verificato";
      delete s.steps.build.errore;
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "domain") {
    const dominio = String(body.dominio ?? "").trim().toLowerCase();
    if (dominio && !DOMAIN_RE.test(dominio)) {
      return NextResponse.json({ error: "dominio non valido (es. impresarossi.it)" }, { status: 422 });
    }
    patchClientState(slug, (s) => {
      s.steps.build.dominio = dominio || undefined;
    });
    return NextResponse.json({ ok: true, dominio: dominio || null });
  }

  return NextResponse.json({ error: `azione sconosciuta: ${action}` }, { status: 400 });
}
