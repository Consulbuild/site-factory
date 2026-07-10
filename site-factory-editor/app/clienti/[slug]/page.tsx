import Link from "next/link";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { STEPS } from "@/lib/steps";
import { staleFiles } from "@/lib/staleness";
import { Badge, StepBadge, formatDate, btnSecondary } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();
  const { brief, client } = bundle;
  const flags = brief._da_verificare?.length ?? 0;
  const intakeOk = client.steps.intake.stato === "verificato";
  const contestoOk = client.steps.contesto.stato === "verificato";
  const paletteStale =
    client.steps.palette.stato !== "assente" &&
    staleFiles(slug, STEPS.palette.upstream, client.steps.palette.upstream).length > 0;
  const copyStale =
    client.steps.copy.stato !== "assente" &&
    staleFiles(slug, STEPS.copy.upstream, client.steps.copy.upstream).length > 0;
  const copyFail = client.steps.copy.stato !== "assente" && bundle.copyReview?.verdict === "FAIL";
  const copyOk = client.steps.copy.stato === "verificato";
  const paletteOk = client.steps.palette.stato === "verificato";
  const imagesStale =
    client.steps.images.stato !== "assente" &&
    staleFiles(slug, STEPS.images.upstream, client.steps.images.upstream).length > 0;
  const imagesFail = client.steps.images.stato !== "assente" && bundle.imageReview?.verdict === "FAIL";
  const buildStale =
    client.steps.build.stato !== "assente" &&
    staleFiles(slug, STEPS.build.upstream, client.steps.build.upstream).length > 0;
  const deployUrl = client.steps.build.deploy?.url;

  return (
    <div>
      <nav className="flex items-center justify-between gap-4 text-sm text-muted">
        <span className="truncate">
          <Link href="/" className="hover:text-ink">
            Clienti
          </Link>{" "}
          / <span className="text-ink">{String(brief.azienda ?? slug)}</span>
        </span>
        <Link href="/" className={`${btnSecondary} shrink-0`}>
          ← Tutti i clienti
        </Link>
      </nav>

      <header className="mt-4">
        <h1 className="text-xl font-semibold">{String(brief.azienda ?? slug)}</h1>
        <p className="mono mt-1 text-muted">
          {String(brief.citta ?? "")} · submission {client.submissionId} · importato {formatDate(client.importedAt)}
        </p>
      </header>

      <ol className="mt-8 divide-y divide-line rounded-lg border border-line">
        <li className="flex items-center gap-4 px-4 py-3.5">
          <span className="mono w-5 text-muted">1</span>
          <span className="flex-1 font-medium">Intake</span>
          <StepBadge stato={client.steps.intake.stato} extra={flags > 0 ? `${flags} flag` : undefined} />
          <Link href={`/clienti/${slug}/intake`} className={btnSecondary}>
            Rivedi dati →
          </Link>
        </li>
        <li className="flex items-center gap-4 px-4 py-3.5">
          <span className="mono w-5 text-muted">2</span>
          <span className="flex-1 font-medium">Contesto</span>
          <StepBadge stato={client.steps.contesto.stato} />
          {intakeOk ? (
            <Link href={`/clienti/${slug}/contesto`} className={btnSecondary}>
              {client.steps.contesto.stato === "assente" ? "Genera contesto →" : "Apri contesto →"}
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-md border border-line px-3.5 py-1.5 text-sm text-faint"
              title="Prima verifica i dati dell'intake: il contesto si genera dai dati corretti."
            >
              Genera contesto
            </span>
          )}
        </li>
        <li className="flex items-center gap-4 px-4 py-3.5">
          <span className="mono w-5 text-muted">3</span>
          <span className="flex-1 font-medium">Palette</span>
          {paletteStale && <Badge tone="warn">⚠ contesto cambiato</Badge>}
          <StepBadge stato={client.steps.palette.stato} />
          {contestoOk ? (
            <Link href={`/clienti/${slug}/palette`} className={btnSecondary}>
              {client.steps.palette.stato === "assente" ? "Genera palette →" : "Apri palette →"}
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-md border border-line px-3.5 py-1.5 text-sm text-faint"
              title="Prima conferma il contesto: la palette si progetta sul contesto curato."
            >
              Genera palette
            </span>
          )}
        </li>
        <li className="flex items-center gap-4 px-4 py-3.5">
          <span className="mono w-5 text-muted">4</span>
          <span className="flex-1 font-medium">Copy</span>
          {copyStale && <Badge tone="warn">⚠ contesto cambiato</Badge>}
          {copyFail && <Badge tone="err">critico: FAIL</Badge>}
          <StepBadge stato={client.steps.copy.stato} />
          {contestoOk ? (
            <Link href={`/clienti/${slug}/copy`} className={btnSecondary}>
              {client.steps.copy.stato === "assente" ? "Genera copy →" : "Apri copy →"}
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-md border border-line px-3.5 py-1.5 text-sm text-faint"
              title="Prima conferma il contesto: il copy si scrive sul contesto curato."
            >
              Genera copy
            </span>
          )}
        </li>
        <li className="flex items-center gap-4 px-4 py-3.5">
          <span className="mono w-5 text-muted">5</span>
          <span className="flex-1 font-medium">Immagini</span>
          {imagesStale && <Badge tone="warn">⚠ a monte è cambiato</Badge>}
          {imagesFail && <Badge tone="err">critico: FAIL</Badge>}
          <StepBadge stato={client.steps.images.stato} />
          {copyOk && paletteOk ? (
            <Link href={`/clienti/${slug}/immagini`} className={btnSecondary}>
              {client.steps.images.stato === "assente" ? "Genera immagini →" : "Apri immagini →"}
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-md border border-line px-3.5 py-1.5 text-sm text-faint"
              title="Prima verifica copy e palette: le immagini derivano da titoli card e colori curati."
            >
              Genera immagini
            </span>
          )}
        </li>
        <li className="flex items-center gap-4 px-4 py-3.5">
          <span className="mono w-5 text-muted">6</span>
          <span className="flex-1 font-medium">Build &amp; Pubblica</span>
          {deployUrl && (
            <a href={deployUrl} target="_blank" rel="noreferrer">
              <Badge tone="ok">● online</Badge>
            </a>
          )}
          {buildStale && <Badge tone="warn">⚠ a monte è cambiato</Badge>}
          {client.steps.build.partial && <Badge tone="warn">parziale</Badge>}
          <StepBadge stato={client.steps.build.stato} />
          {intakeOk ? (
            <Link href={`/clienti/${slug}/build`} className={btnSecondary}>
              {client.steps.build.stato === "assente" ? "Builda il sito →" : "Apri build →"}
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-md border border-line px-3.5 py-1.5 text-sm text-faint"
              title="Prima verifica l'intake: anche l'anteprima parziale parte dai dati corretti."
            >
              Builda il sito
            </span>
          )}
        </li>
      </ol>
    </div>
  );
}
