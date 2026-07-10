"use client";

// [Genera contesto] iniziale + log live. Al done ricarica → compare l'editor.

import { btnPrimary } from "./ui";
import { useStepRun, RunLog } from "./use-step-run";

export function ContestoRunner({ slug, intakeOk, errore }: { slug: string; intakeOk: boolean; errore?: string }) {
  const { run, running, log, failed, logRef } = useStepRun(slug, "contesto");
  const err = failed ?? errore ?? null;

  return (
    <div className="mt-8">
      {!intakeOk && (
        <p className="mb-4 rounded-md bg-warn-bg px-4 py-2.5 text-sm text-warn">
          Prima verifica i dati dell&apos;intake: il contesto si genera dai dati corretti.
        </p>
      )}
      {err && (
        <div className="mb-4 rounded-md bg-err-bg px-4 py-3 text-sm text-err">
          <p className="font-medium">Generazione fallita</p>
          <p className="mt-1 whitespace-pre-wrap">{err}</p>
        </div>
      )}

      <button
        className={btnPrimary}
        onClick={() => run("generate", "Avvio del context-enricher (claude -p, Opus 4.8 · effort xhigh)…")}
        disabled={running || !intakeOk}
      >
        {running ? "Generazione in corso…" : err ? "Riprova" : "Genera contesto"}
      </button>
      <span className="ml-3 text-xs text-faint">claude -p · può richiedere qualche minuto</span>

      <RunLog log={log} logRef={logRef} />
    </div>
  );
}
