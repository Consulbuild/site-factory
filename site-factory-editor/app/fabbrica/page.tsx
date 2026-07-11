import Link from "next/link";
import { listPresets, listReferences, listRuns, referenceUsabile } from "@/lib/factory/state";
import { Badge, formatDate } from "@/components/ui";
import { NuovaRun } from "@/components/fabbrica/nuova-run";

export const dynamic = "force-dynamic";

// La fabbrica design: libreria dei preset pubblicati + run di fabbrica.
// L'unica azione primaria della pagina è "Crea run" (nel pannello NuovaRun).
export default async function FabbricaPage() {
  const presets = listPresets();
  const references = listReferences();
  const runs = listRuns();
  const usabili = references.filter(referenceUsabile);

  return (
    <div className="space-y-10">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fabbrica design</h1>
          <p className="mt-1 text-sm text-muted">
            La libreria degli style-preset e le run che ne producono di nuovi da riferimenti veri.
          </p>
        </div>
        <Link href="/fabbrica/riferimenti" className="text-sm text-muted hover:text-ink">
          Riferimenti ({references.length}) →
        </Link>
      </div>

      {/* libreria */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Libreria ({presets.length})
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{p.nome}</p>
                <div className="flex items-center gap-2">
                  <span className="mono text-xs text-muted">v{p.version}</span>
                  <Badge tone={p.stato === "attivo" ? "ok" : p.stato === "candidato" ? "warn" : "idle"}>
                    {p.stato}
                  </Badge>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2" aria-hidden>
                {[p.neutri.bg, p.neutri.surface, p.neutri.ink].map((hex, i) => (
                  <span
                    key={i}
                    className="inline-block size-4 rounded-full border border-line"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
                <span className="mono ml-1 text-xs text-muted">{p.fontLabel}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{p.estetica}</p>
              <p className="mono mt-2 text-xs text-muted">
                {p.aakerPrimaria} · {p.settoriConsigliati.slice(0, 3).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* run di fabbrica */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Run di fabbrica ({runs.length})
        </h2>
        {runs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nessuna run. Una run parte da almeno 3 riferimenti verificati e produce un candidato
            preset che passa i gate (L1–L4) prima dell&apos;audit umano.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line card">
            {runs.map((r) => (
              <li key={r.runId} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/fabbrica/run/${r.runId}`} className="mono font-medium hover:underline">
                    {r.runId}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(r.creatoIl)} · {r.references.length} riferimenti
                  </p>
                </div>
                <RunBadge stato={r.stato} />
              </li>
            ))}
          </ul>
        )}
        <NuovaRun usabili={usabili.map((r) => ({ id: r.id, url: r.meta.url }))} totale={references.length} />
      </section>
    </div>
  );
}

function RunBadge({ stato }: { stato: string }) {
  const map: Record<string, { tone: "ok" | "warn" | "brand" | "err" | "idle"; label: string }> = {
    creata: { tone: "idle", label: "Creata" },
    in_corso: { tone: "brand", label: "In corso…" },
    fallita: { tone: "err", label: "Fallita" },
    da_audire: { tone: "warn", label: "Da audire" },
    pubblicata: { tone: "ok", label: "Pubblicata" },
    scartata: { tone: "idle", label: "Scartata" },
  };
  const { tone, label } = map[stato] ?? { tone: "idle" as const, label: stato };
  return <Badge tone={tone}>{label}</Badge>;
}
