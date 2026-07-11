"use client";

// Lista run di fabbrica gestibile: filtri-contatore per stato, timeline
// compatta delle 5 fasi, metriche (durata, round critico), elimina con
// conferma. Le run vecchie non si accumulano più senza rimedio.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { RunBadge, formatDate, EmptyState } from "../ui";
import { ConfirmDialog } from "../confirm-dialog";
import { Factory } from "lucide-react";

export type RunRow = {
  runId: string;
  stato: string;
  creatoIl: string;
  nReferences: number;
  fasi: Array<{ nome: string; esito: string }>;
  durataMin?: number;
  roundCritico?: number;
};

const TACCA: Record<string, string> = {
  ok: "bg-ok",
  in_corso: "bg-brand animate-pulse",
  fallita: "bg-err",
};

type Filtro = "tutte" | "da_audire" | "fallita" | "pubblicata";

export function RunsBrowser({ runs }: { runs: RunRow[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("tutte");
  const [daEliminare, setDaEliminare] = useState<RunRow | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const conteggi = {
    tutte: runs.length,
    da_audire: runs.filter((r) => r.stato === "da_audire").length,
    fallita: runs.filter((r) => r.stato === "fallita").length,
    pubblicata: runs.filter((r) => r.stato === "pubblicata").length,
  };
  const visibili = filtro === "tutte" ? runs : runs.filter((r) => r.stato === filtro);

  async function elimina() {
    if (!daEliminare) return;
    setErrore(null);
    const res = await fetch(`/api/factory/runs/${daEliminare.runId}`, { method: "DELETE" });
    if (res.ok) {
      setDaEliminare(null);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setErrore(d.error ?? `errore ${res.status}`);
    }
  }

  const FILTRI: Array<{ key: Filtro; label: string }> = [
    { key: "tutte", label: "Tutte" },
    { key: "da_audire", label: "Da audire" },
    { key: "fallita", label: "Fallite" },
    { key: "pubblicata", label: "Pubblicate" },
  ];

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FILTRI.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            aria-pressed={filtro === f.key}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
              filtro === f.key
                ? "border-brand bg-brand-dim text-brand"
                : "border-line bg-surface text-muted hover:bg-raise"
            }`}
          >
            {f.label} · {conteggi[f.key]}
          </button>
        ))}
      </div>
      {errore && <p className="mt-2 text-sm text-err">{errore}</p>}
      {visibili.length === 0 ? (
        <div className="card mt-3">
          <EmptyState
            icon={Factory}
            title={runs.length === 0 ? "Nessuna run." : "Nessuna run in questo stato."}
            hint={
              runs.length === 0
                ? "Una run parte da almeno 3 riferimenti verificati e produce un candidato preset che passa i gate (L1–L4) prima dell'audit umano."
                : undefined
            }
          />
        </div>
      ) : (
        <ul className="card mt-3 divide-y divide-line">
          {visibili.map((r) => (
            <li key={r.runId} className="flex items-center gap-3 pr-2">
              <Link
                href={`/fabbrica/run/${r.runId}`}
                className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-raise"
              >
                <div className="min-w-0 flex-1">
                  <span className="mono font-medium">{r.runId}</span>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(r.creatoIl)} · {r.nReferences} riferimenti
                    {r.durataMin !== undefined && ` · ${r.durataMin} min`}
                    {r.roundCritico !== undefined && ` · critico ×${r.roundCritico}`}
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-1"
                  title={r.fasi.map((f) => `${f.nome}: ${f.esito.replace("_", " ")}`).join(" · ")}
                >
                  {r.fasi.map((f) => (
                    <span key={f.nome} className={`h-1.5 w-4 rounded-full ${TACCA[f.esito] ?? "bg-line"}`} />
                  ))}
                </span>
                <RunBadge stato={r.stato} />
              </Link>
              <button
                onClick={() => setDaEliminare(r)}
                className="flex size-8 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-err-bg hover:text-err"
                title="Elimina la run…"
                aria-label={`Elimina la run ${r.runId}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={daEliminare !== null}
        title="Eliminare la run?"
        tone="danger"
        message={
          <>
            Verrà cancellata la cartella della run <span className="mono">{daEliminare?.runId}</span> con candidato,
            gate, screenshot e audit. Un preset già pubblicato da questa run resta in libreria.
          </>
        }
        confirmLabel="Elimina la run"
        onConfirm={elimina}
        onCancel={() => setDaEliminare(null)}
      />
    </>
  );
}
