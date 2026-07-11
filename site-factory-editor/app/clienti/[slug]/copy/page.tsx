import Link from "next/link";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { STEPS } from "@/lib/steps";
import { staleFiles } from "@/lib/staleness";
import { copySlots } from "@/lib/slots";
import { CopyRunner } from "@/components/copy-runner";
import { CopyEditor } from "@/components/copy-editor";

export const dynamic = "force-dynamic";

export default async function CopyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();

  const businessName = String(bundle.brief.azienda ?? slug);
  const contestoOk = bundle.client.steps.contesto.stato === "verificato";
  const stato = bundle.client.steps.copy.stato;

  // Col copy su disco → editor (guardia navigazione propria).
  if (bundle.copy) {
    const stale = staleFiles(slug, STEPS.copy.upstream, bundle.client.steps.copy.upstream).length > 0;
    return (
      <CopyEditor
        slug={slug}
        businessName={businessName}
        initial={bundle.copy}
        slots={copySlots()}
        review={bundle.copyReview}
        coverage={bundle.copyCoverage}
        contestoServizi={bundle.contesto?.servizi_atomizzati.map((s) => s.servizio) ?? []}
        accent={bundle.palette?.["brand.palette.accent"] ?? null}
        stale={stale}
        verificato={stato === "verificato"}
      />
    );
  }

  // In assenza di copy → runner (nessuna modifica non salvata, nav semplice).
  return (
    <div>
      <nav className="flex items-center justify-between gap-4 text-sm text-muted">
        <span className="truncate">
          <Link href="/" className="hover:text-ink">
            Clienti
          </Link>{" "}
          /{" "}
          <Link href={`/clienti/${slug}`} className="hover:text-ink">
            {businessName}
          </Link>{" "}
          / <span className="text-ink">Copy</span>
        </span>
        <Link
          href={`/clienti/${slug}`}
          className="shrink-0 rounded-ctl border border-line bg-surface px-3.5 py-1.5 font-medium text-ink transition-colors duration-150 hover:border-line2 hover:bg-raise"
        >
          ← Torna al cliente
        </Link>
      </nav>
      <h1 className="mt-4 text-xl font-semibold">Copy del sito</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Il copywriter scrive tutti i testi del sito dal contesto curato (macro-categorie → card, promesse consentite,
        promessa martello), poi il critico avversariale lo boccia o lo promuove — fino a 3 round di correzioni. Alla
        fine lo rivedi qui, campo per campo, coi budget del renderer.
      </p>
      <CopyRunner
        slug={slug}
        contestoOk={contestoOk}
        errore={stato === "errore" ? bundle.client.steps.copy.errore : undefined}
      />
    </div>
  );
}
