import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { IntakeForm } from "@/components/intake-form";

export const dynamic = "force-dynamic";

export default async function IntakePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();

  return (
    <div>
      <IntakeForm
        slug={slug}
        businessName={String(bundle.brief.azienda ?? slug)}
        initialBrief={bundle.brief}
        whatsappIniziale={String(bundle.intake["contact.whatsapp"] ?? "")}
        hasLogoFile={bundle.logoFile !== null}
      />
    </div>
  );
}
