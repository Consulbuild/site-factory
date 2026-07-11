import Link from "next/link";
import { notFound } from "next/navigation";
import { readRun, readReference } from "@/lib/factory/state";
import { Badge, formatDate } from "@/components/ui";
import { RunRunner } from "@/components/fabbrica/run-runner";

export const dynamic = "force-dynamic";

const NOMI_FASE: Record<string, string> = {
  designer: "Preset-designer (evidenza → candidato)",
  validate: "Validatore zero-invenzioni",
  build: "Build candidato + anteprima",
  gates: "Gate L1–L3 (deterministici, novelty, UIClip)",
  critico: "Critico visivo (L4, max 3 round)",
};

// Dettaglio run di fabbrica: timeline delle fasi. L'esecuzione arriva con M6 —
// qui lo stato è sempre leggibile e la run è riprendibile dalla fase fallita.
export default async function RunPage(ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  let run;
  try {
    run = readRun(runId);
  } catch {
    notFound();
  }
  if (!run) notFound();

  const refs = run.references.map((id) => ({ id, ref: readReference(id) }));

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="mono text-xl font-semibold tracking-tight">{run.runId}</h1>
          <p className="mt-1 text-sm text-muted">Creata il {formatDate(run.creatoIl)}</p>
        </div>
        <Link href="/fabbrica" className="text-sm text-muted hover:text-ink">
          ← Fabbrica
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Riferimenti ({refs.length})
        </h2>
        <ul className="mt-3 divide-y divide-line card">
          {refs.map(({ id, ref }) => (
            <li key={id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="mono min-w-0 flex-1 truncate">{ref?.meta.url ?? id}</span>
              {ref?.optout?.esito === "consentito" ? (
                <Badge tone="ok">consentito</Badge>
              ) : (
                <Badge tone="err">{ref?.optout?.esito ?? "?"}</Badge>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Fasi</h2>
        <ol className="mt-3 divide-y divide-line card">
          {run.fasi.map((f, i) => (
            <li key={f.nome} className="flex items-center gap-4 px-4 py-3">
              <span className="mono text-xs text-muted">{i + 1}</span>
              <span className="flex-1 text-sm">{NOMI_FASE[f.nome] ?? f.nome}</span>
              <FaseBadge esito={f.esito} />
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <RunRunner runId={run.runId} stato={run.stato} />
        </div>
        {(run.stato === "da_audire" || run.stato === "pubblicata") && (
          <div className="mt-4 flex justify-end">
            <Link href={`/fabbrica/run/${run.runId}/audit`} className="text-sm text-brand hover:underline">
              {run.stato === "da_audire" ? "Vai all'audit pairwise →" : "Rivedi l'audit →"}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function FaseBadge({ esito }: { esito: string }) {
  if (esito === "ok") return <Badge tone="ok">ok</Badge>;
  if (esito === "in_corso") return <Badge tone="brand">In corso…</Badge>;
  if (esito === "fallita") return <Badge tone="err">Fallita</Badge>;
  return <Badge tone="idle">In attesa</Badge>;
}
