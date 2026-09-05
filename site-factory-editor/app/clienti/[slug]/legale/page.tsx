import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { clientDir } from "@/lib/paths";
import { STEPS, areeCambiateLegale } from "@/lib/steps";
import { staleFiles, computeUpstream } from "@/lib/staleness";
import { inferForma } from "@/lib/legale";
import { Breadcrumb, btnSecondary } from "@/components/ui";
import { LegaleRunner } from "@/components/legale-runner";
import { LegaleEditor } from "@/components/legale-editor";

export const dynamic = "force-dynamic";

// Scheda Legale: biforcazione runner/editor come il copy. I dati derivati
// server-side (staleness, correntezza della review, forma inferita, report)
// arrivano all'editor come props client-safe.

export default async function LegalePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();
  const { client } = bundle;
  const azienda = String(bundle.brief.azienda ?? slug);
  const statoLegale = client.steps.legale;

  if (!bundle.legale) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <nav className="flex items-center justify-between gap-4">
          <Breadcrumb items={[{ label: "Clienti", href: "/" }, { label: azienda, href: `/clienti/${slug}` }, { label: "Legale" }]} />
          <Link href={`/clienti/${slug}`} className={`${btnSecondary} shrink-0`}>
            ← Torna al cliente
          </Link>
        </nav>
        <h1 className="mt-6 text-xl font-semibold">Documenti legali</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          La pipeline deriva il foro dal circondario del tribunale (con evidenza), genera privacy e termini dai soli dati verificati
          del cliente, monta l&apos;informativa breve del form dal modello approvato e fa passare tutto da gate deterministici + una
          catena di verifica a 3 lenti. Alla fine decide l&apos;operatore.
        </p>
        <LegaleRunner slug={slug} intakeOk={client.steps.intake.stato === "verificato"} errore={statoLegale.errore} />
      </div>
    );
  }

  // Staleness = brief cambiato (upstream) + stack dell'agenzia cambiato dopo la
  // generazione (statistiche/modulo): l'update-mode rigenera solo la privacy.
  const stale = [
    ...staleFiles(slug, STEPS.legale.upstream, statoLegale.upstream),
    ...(areeCambiateLegale(slug).includes("stack") ? ["fatti di stack (statistiche Umami, modulo n8n)"] : []),
  ];
  const reviewCorrente =
    !!bundle.legaleReview?.giudicatoSu &&
    JSON.stringify(bundle.legaleReview.giudicatoSu) === JSON.stringify(computeUpstream(slug, ["legale.json"]));
  let report: string | null = null;
  try {
    report = fs.readFileSync(path.join(clientDir(slug), "legale-report.md"), "utf8");
  } catch {
    // report assente (artifact pre-GUI): la scheda funziona lo stesso
  }

  return (
    <LegaleEditor
      slug={slug}
      azienda={azienda}
      initial={bundle.legale}
      foro={bundle.foro}
      review={bundle.legaleReview}
      reviewCorrente={reviewCorrente}
      report={report}
      stale={stale}
      verificato={statoLegale.stato === "verificato"}
      forma={inferForma(azienda)}
      erroreRun={statoLegale.stato === "errore" ? statoLegale.errore : undefined}
    />
  );
}
