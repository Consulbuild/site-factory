import Link from "next/link";
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
      <nav className="flex items-center justify-between gap-4 text-sm text-muted">
        <span className="truncate">
          <Link href="/" className="hover:text-ink">
            Clienti
          </Link>{" "}
          /{" "}
          <Link href={`/clienti/${slug}`} className="hover:text-ink">
            {businessName}
          </Link>{" "}
          / <span className="text-ink">Contesto</span>
        </span>
        <Link
          href={`/clienti/${slug}`}
          className="shrink-0 rounded-md border border-line bg-surface px-3.5 py-1.5 font-medium text-ink transition-colors duration-150 hover:border-line2 hover:bg-raise"
        >
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
