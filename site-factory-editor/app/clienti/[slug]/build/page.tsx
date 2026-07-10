import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { STEPS } from "@/lib/steps";
import { staleFiles } from "@/lib/staleness";
import { hasSecret } from "@/lib/secrets";
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

  const steps = bundle.client.steps;
  const stale =
    steps.build.stato !== "assente" ? staleFiles(slug, STEPS.build.upstream, steps.build.upstream) : [];

  return (
    <BuildPanel
      slug={slug}
      businessName={String(bundle.brief.azienda ?? slug)}
      build={steps.build}
      imagesOk={steps.images.stato === "verificato"}
      staleFiles={stale}
      cfTokenOk={hasSecret("CLOUDFLARE_API_TOKEN")}
      cfAccountOk={hasSecret("CLOUDFLARE_ACCOUNT_ID")}
    />
  );
}
