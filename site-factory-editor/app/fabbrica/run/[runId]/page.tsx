import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readRun, readReference } from "@/lib/factory/state";
import { runDir } from "@/lib/factory/paths";
import { Badge, FaseBadge, formatDate, Breadcrumb, btnSecondary } from "@/components/ui";
import { RunRunner } from "@/components/fabbrica/run-runner";

export const dynamic = "force-dynamic";

const NOMI_FASE: Record<string, string> = {
  designer: "Preset-designer (evidenza → candidato)",
  validate: "Validatore zero-invenzioni",
  build: "Build candidato + anteprima",
  gates: "Gate L1–L3 (deterministici, novelty, UIClip)",
  critico: "Critico visivo (L4, max 3 round)",
};

/** Ultimo motivo di fallimento persistito nel run.ndjson (tee del bus). */
function motivoFallimento(dir: string): string | null {
  try {
    const file = path.join(dir, "run.ndjson");
    if (!fs.existsSync(file)) return null;
    const righe = fs.readFileSync(file, "utf8").trim().split("\n");
    for (let i = righe.length - 1; i >= 0; i--) {
      try {
        const ev = JSON.parse(righe[i]);
        if (ev.type === "error") return String(ev.message);
      } catch {
        /* riga troncata */
      }
    }
  } catch {
    /* log illeggibile */
  }
  return null;
}

// Dettaglio run di fabbrica: timeline fasi, screenshot del candidato appena
// esistono, metriche e motivo del fallimento persistito (non più solo nello
// stream perso). La run è riprendibile dalla fase fallita, o fermabile.
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
  const dir = runDir(runId);
  const shotsDir = path.join(dir, "shots");
  const shots = fs.existsSync(shotsDir) ? fs.readdirSync(shotsDir).filter((f) => f.endsWith(".jpg")) : [];
  const motivo = run.stato === "fallita" ? motivoFallimento(dir) : null;

  return (
    <div className="space-y-8">
      <nav className="flex items-center justify-between gap-4">
        <Breadcrumb items={[{ label: "Fabbrica", href: "/fabbrica" }, { label: run.runId }]} />
        <Link href="/fabbrica" className={`${btnSecondary} shrink-0`}>
          ← Fabbrica
        </Link>
      </nav>
      <div className="!mt-4">
        <h1 className="mono text-xl font-semibold tracking-tight">{run.runId}</h1>
        <p className="mt-1 text-sm text-muted">
          Creata il {formatDate(run.creatoIl)}
          {run.misure?.durataMin !== undefined && ` · ultima esecuzione ${run.misure.durataMin} min`}
          {run.misure?.roundCritico !== undefined && ` · critico ×${run.misure.roundCritico}`}
        </p>
      </div>

      {motivo && (
        <div className="rounded-ctl border border-err/40 bg-err-bg px-4 py-3 text-sm text-err">
          <p className="font-medium">Motivo del fallimento</p>
          <p className="mt-1 whitespace-pre-wrap">{motivo}</p>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Riferimenti ({refs.length})</h2>
        <ul className="card mt-3 divide-y divide-line">
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
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Fasi</h2>
        <ol className="card mt-3 divide-y divide-line">
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
        {(run.stato === "da_audire" || run.stato === "pubblicata" || run.stato === "scartata") && (
          <div className="mt-4 flex justify-end">
            <Link href={`/fabbrica/run/${run.runId}/audit`} className="text-sm text-brand hover:underline">
              {run.stato === "da_audire" ? "Vai all'audit pairwise →" : "Rivedi l'audit →"}
            </Link>
          </div>
        )}
      </section>

      {shots.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            Screenshot del candidato ({shots.length})
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {shots.map((f) => (
              <li key={f} className="card overflow-hidden p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/factory/runs/${run.runId}/shots/${f}`}
                  alt={`Screenshot ${f}`}
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-raise object-cover object-top"
                />
                <p className="mono px-2.5 py-1.5 text-[11px] text-muted">{f}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
