"use client";

// [Genera copy] iniziale + log live multi-fase. Al done ricarica → editor.

import { btnPrimary } from "./ui";
import { useStepRun, RunLog } from "./use-step-run";

export function CopyRunner({ slug, contestoOk, errore }: { slug: string; contestoOk: boolean; errore?: string }) {
  const { run, running, log, failed } = useStepRun(slug, "copy");
  const err = failed ?? errore ?? null;

  return (
    <div className="mt-8">
      {!contestoOk && (
        <p className="mb-4 rounded-ctl bg-warn-bg px-4 py-2.5 text-sm text-warn">
          Prima conferma il contesto: il copy si scrive sulle macro-categorie, le promesse e la promessa martello curate.
        </p>
      )}
      {err && (
        <div className="mb-4 rounded-ctl bg-err-bg px-4 py-3 text-sm text-err">
          <p className="font-medium">Generazione fallita</p>
          <p className="mt-1 whitespace-pre-wrap">{err}</p>
        </div>
      )}

      <button
        className={btnPrimary}
        onClick={() => run("generate", "Avvio della pipeline copy: copywriter → critico → correzioni (max 3 round)…")}
        disabled={running || !contestoOk}
      >
        {running ? "Generazione in corso…" : err ? "Riprova" : "Genera copy"}
      </button>
      <span className="ml-3 text-xs text-faint">claude -p · più fasi, 10–30 minuti</span>

      <RunLog log={log} />
    </div>
  );
}
