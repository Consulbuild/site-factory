"use client";

// Runner della scheda Legale: primo avvio della pipeline (foro → privacy →
// termini → gate → montaggio → catena a 3 lenti). Pattern copy-runner.

import { Banner, btnPrimary } from "@/components/ui";
import { useStepRun, RunLog } from "@/components/use-step-run";

export function LegaleRunner({ slug, intakeOk, errore }: { slug: string; intakeOk: boolean; errore?: string }) {
  const { run, running, log } = useStepRun(slug, "legale");
  return (
    <div className="mt-6 space-y-4">
      {!intakeOk && (
        <Banner tone="warn" title="Prima verifica l'intake">
          I documenti legali si scrivono sui soli dati verificati del cliente (denominazione, sede, P.IVA, recapiti).
        </Banner>
      )}
      {errore && !running && (
        <Banner tone="err" title="L'ultima generazione è fallita">
          {errore}
        </Banner>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={!intakeOk || running}
          onClick={() =>
            run(
              "generate",
              "Avvio della pipeline legale: derivazione del foro → informativa privacy → termini e condizioni → gate deterministici → montaggio → catena di verifica a 3 lenti…",
            )
          }
        >
          Genera documenti legali
        </button>
        <span className="mono text-xs text-faint">claude -p · più fasi, 20–40 minuti</span>
      </div>
      <RunLog log={log} />
    </div>
  );
}
