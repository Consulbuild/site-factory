import Link from "next/link";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { STEPS, type StepKey } from "@/lib/steps";
import { staleFiles } from "@/lib/staleness";
import { Badge, StepBadge, formatDate, btnPrimary, btnSecondary, Breadcrumb } from "@/components/ui";
import { ClienteAzioni } from "@/components/cliente-azioni";
import { StepRunLive } from "@/components/step-run-live";

export const dynamic = "force-dynamic";

// Cabina del cliente (DESIGN-REFACTOR §5.2): sequenza a 6 step dove IL
// PROSSIMO PASSO ha l'unica azione primaria della pagina; meta per step
// (ultima run), errori inline, fase live se un run è in corso, azioni
// cliente in testata (contatti, reimporta, elimina).

type Riga = {
  n: number;
  key: StepKey | "intake";
  nome: string;
  href: string;
  stato: string;
  errore?: string;
  ultimaRun?: { durataMs: number; quando: string; esito: string };
  stale?: boolean;
  fail?: boolean;
  extraBadges?: React.ReactNode;
  abilitato: boolean;
  motivoGate?: string;
  labelGenera: string;
  labelApri: string;
};

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
  const azienda = String(brief.azienda ?? slug);
  const intakeOk = client.steps.intake.stato === "verificato";
  const contestoOk = client.steps.contesto.stato === "verificato";
  const copyOk = client.steps.copy.stato === "verificato";
  const paletteOk = client.steps.palette.stato === "verificato";
  const deployUrl = client.steps.build.deploy?.url;

  const stale = (k: StepKey) =>
    client.steps[k].stato !== "assente" &&
    staleFiles(slug, STEPS[k].upstream, (client.steps[k] as { upstream?: Record<string, string> }).upstream).length > 0;

  const righe: Riga[] = [
    {
      n: 1,
      key: "intake",
      nome: "Intake",
      href: `/clienti/${slug}/intake`,
      stato: client.steps.intake.stato,
      extraBadges: flags > 0 ? undefined : undefined,
      abilitato: true,
      labelGenera: "Rivedi dati",
      labelApri: "Rivedi dati",
    },
    {
      n: 2,
      key: "contesto",
      nome: "Contesto",
      href: `/clienti/${slug}/contesto`,
      stato: client.steps.contesto.stato,
      errore: client.steps.contesto.errore,
      ultimaRun: client.steps.contesto.ultimaRun,
      abilitato: intakeOk,
      motivoGate: "Prima verifica i dati dell'intake: il contesto si genera dai dati corretti.",
      labelGenera: "Genera contesto",
      labelApri: "Apri contesto",
    },
    {
      n: 3,
      key: "palette",
      nome: "Palette",
      href: `/clienti/${slug}/palette`,
      stato: client.steps.palette.stato,
      errore: client.steps.palette.errore,
      ultimaRun: client.steps.palette.ultimaRun,
      stale: stale("palette"),
      abilitato: contestoOk,
      motivoGate: "Prima conferma il contesto: la palette si progetta sul contesto curato.",
      labelGenera: "Genera palette",
      labelApri: "Apri palette",
    },
    {
      n: 4,
      key: "copy",
      nome: "Copy",
      href: `/clienti/${slug}/copy`,
      stato: client.steps.copy.stato,
      errore: client.steps.copy.errore,
      ultimaRun: client.steps.copy.ultimaRun,
      stale: stale("copy"),
      fail: client.steps.copy.stato !== "assente" && bundle.copyReview?.verdict === "FAIL",
      abilitato: contestoOk,
      motivoGate: "Prima conferma il contesto: il copy si scrive sul contesto curato.",
      labelGenera: "Genera copy",
      labelApri: "Apri copy",
    },
    {
      n: 5,
      key: "images",
      nome: "Immagini",
      href: `/clienti/${slug}/immagini`,
      stato: client.steps.images.stato,
      errore: client.steps.images.errore,
      ultimaRun: client.steps.images.ultimaRun,
      stale: stale("images"),
      fail: client.steps.images.stato !== "assente" && bundle.imageReview?.verdict === "FAIL",
      abilitato: copyOk && paletteOk,
      motivoGate: "Prima verifica copy e palette: le immagini derivano da titoli card e colori curati.",
      labelGenera: "Genera immagini",
      labelApri: "Apri immagini",
    },
    {
      n: 6,
      key: "build",
      nome: "Build & Pubblica",
      href: `/clienti/${slug}/build`,
      stato: client.steps.build.stato,
      errore: client.steps.build.errore,
      stale: stale("build"),
      abilitato: intakeOk,
      motivoGate: "Prima verifica l'intake: anche l'anteprima parziale parte dai dati corretti.",
      labelGenera: "Builda il sito",
      labelApri: "Apri build",
    },
  ];

  // Il prossimo passo: il primo step abilitato non ancora verificato.
  const prossimo = righe.find((r) => r.abilitato && r.stato !== "verificato")?.key ?? null;

  return (
    <div>
      <nav className="flex items-center justify-between gap-4">
        <Breadcrumb items={[{ label: "Clienti", href: "/" }, { label: azienda }]} />
        <Link href="/" className={`${btnSecondary} shrink-0`}>
          ← Tutti i clienti
        </Link>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{azienda}</h1>
          <p className="mono mt-1 text-muted">
            {String(brief.citta ?? "")} · submission {client.submissionId} · importato {formatDate(client.importedAt)}
          </p>
        </div>
        <ClienteAzioni
          slug={slug}
          businessName={azienda}
          submissionId={client.submissionId}
          telefono={brief.telefono ? String(brief.telefono) : undefined}
          email={brief.email ? String(brief.email) : undefined}
          deployUrl={deployUrl}
        />
      </header>

      <ol className="card mt-8 divide-y divide-line">
        {righe.map((r) => {
          const primario = r.key === prossimo;
          const label = r.stato === "assente" ? r.labelGenera : r.labelApri;
          return (
            <li key={r.n} className="px-4 py-3.5">
              <div className="flex items-center gap-4">
                <span className="mono w-5 text-muted">{r.n}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.nome}</span>
                  {r.key !== "intake" && (
                    <span className="ml-3 inline-flex">
                      <StepRunLive slug={slug} step={r.key} />
                    </span>
                  )}
                </span>
                {r.key === "build" && deployUrl && (
                  <a href={deployUrl} target="_blank" rel="noreferrer">
                    <Badge tone="ok">● online</Badge>
                  </a>
                )}
                {r.stale && <Badge tone="warn">⚠ cambiato a monte</Badge>}
                {r.fail && <Badge tone="err">critico: FAIL</Badge>}
                {r.key === "build" && client.steps.build.partial && <Badge tone="warn">parziale</Badge>}
                <StepBadge stato={r.stato} extra={r.key === "intake" && flags > 0 ? `${flags} flag` : undefined} />
                {r.ultimaRun && r.stato !== "in_corso" && (
                  <span
                    className="mono hidden text-xs text-faint lg:inline"
                    title={`Ultima run: ${r.ultimaRun.esito} · ${formatDate(r.ultimaRun.quando)}`}
                  >
                    {Math.max(1, Math.round(r.ultimaRun.durataMs / 60000))} min
                  </span>
                )}
                {r.abilitato ? (
                  <Link href={r.href} className={primario ? btnPrimary : btnSecondary}>
                    {label} →
                  </Link>
                ) : (
                  <span
                    className="cursor-not-allowed rounded-full border border-line px-4 py-1.5 text-sm text-faint"
                    title={r.motivoGate}
                  >
                    {r.labelGenera}
                  </span>
                )}
              </div>
              {r.stato === "errore" && r.errore && (
                <p className="mt-1.5 truncate pl-9 text-sm text-err" title={r.errore}>
                  {r.errore}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
