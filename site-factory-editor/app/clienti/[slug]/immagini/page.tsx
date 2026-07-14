import Link from "next/link";
import { Breadcrumb, btnSecondary } from "@/components/ui";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { STEPS } from "@/lib/steps";
import { staleFiles } from "@/lib/staleness";
import { hasSecret } from "@/lib/secrets";
import { ImagesRunner } from "@/components/images-runner";
import { ImagesEditor } from "@/components/images-editor";

export const dynamic = "force-dynamic";

export default async function ImmaginiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();

  const businessName = String(bundle.brief.azienda ?? slug);
  const steps = bundle.client.steps;

  // Col trace su disco → editor (guardia navigazione propria).
  if (bundle.imagesTrace) {
    const stale = staleFiles(slug, STEPS.images.upstream, steps.images.upstream);
    return (
      <ImagesEditor
        slug={slug}
        businessName={businessName}
        trace={bundle.imagesTrace}
        review={bundle.imageReview}
        lavori={bundle.lavori}
        stale={stale}
        verificato={steps.images.stato === "verificato"}
      />
    );
  }

  // In assenza di trace → runner (nessuna modifica non salvata, nav semplice).
  const gateMsg =
    steps.copy.stato !== "verificato" || steps.palette.stato !== "verificato"
      ? "Prima verifica copy e palette: i soggetti delle card vengono dai titoli curati, i colori dallo style bible."
      : null;

  return (
    <div>
      <nav className="flex items-center justify-between gap-4">
        <Breadcrumb
          items={[{ label: "Clienti", href: "/" }, { label: businessName, href: `/clienti/${slug}` }, { label: "Immagini" }]}
        />
        <Link href={`/clienti/${slug}`} className={`${btnSecondary} shrink-0`}>
          ← Torna al cliente
        </Link>
      </nav>
      <h1 className="mt-4 text-xl font-semibold">Immagini del sito</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        L&apos;image-prompter genera hero e card servizi con FLUX.2 (soggetti dal contesto e dai titoli card, colori
        dalla palette), poi il critico visivo GUARDA ogni immagine e scarta slop e incoerenze — fino a 3 round. Alla
        fine le rivedi qui, con alt editabili e rigenerazione selettiva. La gallery usa solo foto reali (scheda futura).
      </p>
      <ImagesRunner
        slug={slug}
        gateMsg={gateMsg}
        bflOk={hasSecret("BFL_API_KEY")}
        errore={steps.images.stato === "errore" ? steps.images.errore : undefined}
      />
    </div>
  );
}
