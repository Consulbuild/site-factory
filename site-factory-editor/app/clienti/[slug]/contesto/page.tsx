import Link from "next/link";
import { Breadcrumb, btnSecondary } from "@/components/ui";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { driftLabels } from "@/lib/contesto-sync";
import { ContestoRunner } from "@/components/contesto-runner";
import { ContestoEditor } from "@/components/contesto-editor";

export const dynamic = "force-dynamic";

export default async function ContestoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();

  const businessName = String(bundle.brief.azienda ?? slug);
  const intakeOk = bundle.client.steps.intake.stato === "verificato";
  const stato = bundle.client.steps.contesto.stato;

  // Con il contesto pronto → l'editor gestisce la propria navigazione (guardata).
  if (bundle.contesto) {
    const drift = driftLabels(bundle.client.steps.contesto.drift ?? []);
    return <ContestoEditor slug={slug} businessName={businessName} initial={bundle.contesto} drift={drift} />;
  }

  // In assenza di contesto → runner (nessuna modifica non salvata, nav semplice).
  return (
    <div>
      <nav className="flex items-center justify-between gap-4">
        <Breadcrumb
          items={[{ label: "Clienti", href: "/" }, { label: businessName, href: `/clienti/${slug}` }, { label: "Contesto" }]}
        />
        <Link href={`/clienti/${slug}`} className={`${btnSecondary} shrink-0`}>
          ← Torna al cliente
        </Link>
      </nav>
      <h1 className="mt-4 text-xl font-semibold">Contesto per gli agenti</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Il contesto distilla il form in fatti verificati — identità, servizi, punti di forza, promesse — ed è l&apos;input
        primario di tutti gli agenti a valle. Rivedilo con cura: qui la qualità decide la qualità del sito.
      </p>
      <ContestoRunner slug={slug} intakeOk={intakeOk} errore={stato === "errore" ? bundle.client.steps.contesto.errore : undefined} />
    </div>
  );
}
