import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { clientDir } from "@/lib/paths";
import { listClients, readClientState } from "@/lib/clients";
import { getRun, busIdCliente, busIdTraffico } from "@/lib/run-bus";
import { STEPS, type StepKey } from "@/lib/steps";
import { deleteUmamiWebsite, rimuoviInfra } from "@/lib/integrazioni";
import { catenaViva } from "@/lib/catena";
import { spegniDemo } from "@/lib/deploy";

export const dynamic = "force-dynamic";

/**
 * Eliminazione DIRETTA del cliente (decisione Mattia 2026-07-11): cancella
 * out/<slug> con tutti gli artifact. Difesa in profondità: il body deve
 * ripetere la ragione sociale esatta (la UI la fa digitare), e non si
 * elimina con un run in corso. La richiesta del form non è recuperabile (tolta da _inbox all'import);
 * una demo accesa viene spenta (worker «<slug>-demo» cancellato) prima di tutto;
 * un eventuale sito già deployato resta online (fuori scope, detto nel dialog),
 * ma NON resta nel registro del modulo, nel monitor né su Umami: la
 * deregistrazione è best effort (la cartella è già via; gli errori tornano
 * come avviso).
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

  if (catenaViva(slug)) {
    return NextResponse.json({ error: "catena automatica in corso per questo cliente: fermala prima di eliminare" }, { status: 409 });
  }
  for (const step of Object.keys(STEPS) as StepKey[]) {
    const run = getRun(busIdCliente(slug, step));
    if (run && !run.done) {
      return NextResponse.json({ error: "c'è un run in corso per questo cliente: fermalo prima di eliminare" }, { status: 409 });
    }
  }
  const mappa = getRun(busIdTraffico(slug, "mappa"));
  if (mappa && !mappa.done) {
    return NextResponse.json({ error: "calcolo della mappa query in corso per questo cliente: fermalo dalla barra dei lavori prima di eliminare" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const nome = listClients().find((c) => c.slug === slug)?.businessName ?? slug;
  if (typeof body?.nome !== "string" || body.nome.trim() !== nome) {
    return NextResponse.json({ error: "conferma non valida: digita la ragione sociale esatta" }, { status: 422 });
  }

  const stato = readClientState(slug);
  const build = stato.steps.build;

  // Demo accesa: si spegne PRIMA di cancellare la cartella (serve il config
  // wrangler e lo stato). Se Cloudflare non risponde non si elimina: un worker
  // «<slug>-demo» orfano resterebbe online per sempre, fuori dallo sweep.
  if (stato.demo && !stato.demo.spentaAt) {
    try {
      await spegniDemo(slug);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `demo non spenta, cliente non eliminato: ${msg}` }, { status: 502 });
    }
  }

  fs.rmSync(dir, { recursive: true, force: true });

  const avvisi: string[] = [];
  if (build.umamiWebsiteId || build.deploy?.dominio) {
    const [umami, infra] = await Promise.allSettled([
      build.umamiWebsiteId ? deleteUmamiWebsite(build.umamiWebsiteId) : Promise.resolve(),
      rimuoviInfra(slug),
    ]);
    if (umami.status === "rejected") avvisi.push(umami.reason instanceof Error ? umami.reason.message : String(umami.reason));
    if (infra.status === "rejected") avvisi.push(infra.reason instanceof Error ? infra.reason.message : String(infra.reason));
    else if (infra.value.errore) avvisi.push(infra.value.errore);
  }
  return NextResponse.json({ ok: true, ...(avvisi.length ? { avviso: `deregistrazione incompleta: ${avvisi.join(" · ")}` } : {}) });
}
