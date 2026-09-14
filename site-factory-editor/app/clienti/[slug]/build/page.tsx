import path from "node:path";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { STEPS } from "@/lib/steps";
import { staleFiles } from "@/lib/staleness";
import { hasSecret } from "@/lib/secrets";
import { UMAMI_HOST } from "@/lib/integrazioni";
import { catenaViva } from "@/lib/catena";
import { etichettaDemo, DEMO_ZONA } from "@/lib/deploy";
import { demoScaduta } from "@/lib/portafoglio-shared";
import { previewRoot } from "@/lib/preview";
import { BuildPanel } from "@/components/build-panel";

export const dynamic = "force-dynamic";

export default async function BuildPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();

  const client = bundle.client;
  const steps = client.steps;
  const brief = bundle.brief;
  const stale = steps.build.stato !== "assente" ? staleFiles(slug, STEPS.build.upstream, steps.build.upstream) : [];
  const root = previewRoot();

  return (
    <BuildPanel
      slug={slug}
      businessName={String(brief.azienda ?? slug)}
      referente={brief.referente ? String(brief.referente) : undefined}
      telefono={brief.telefono ? String(brief.telefono) : undefined}
      build={steps.build}
      percorso={client.percorso}
      demo={client.demo}
      catena={client.catena}
      catenaViva={catenaViva(slug)}
      demoScaduta={demoScaduta({ slug, steps, percorso: client.percorso, demo: client.demo })}
      hostPrevisto={client.demo?.host ?? `${etichettaDemo(String(brief.azienda ?? slug), slug)}.${DEMO_ZONA}`}
      anteprimaAttiva={root ? path.basename(path.dirname(root)) : null}
      imagesOk={steps.images.stato === "verificato"}
      staleFiles={stale}
      cfTokenOk={hasSecret("CLOUDFLARE_API_TOKEN")}
      cfAccountOk={hasSecret("CLOUDFLARE_ACCOUNT_ID")}
      vpsKeysOk={{ umami: hasSecret("UMAMI_PASSWORD"), n8n: hasSecret("N8N_REGISTRA_KEY") }}
      umamiHost={UMAMI_HOST}
    />
  );
}
