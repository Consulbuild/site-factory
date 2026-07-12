"use client";

// [Genera palette] iniziale + log live. Al done ricarica → compare l'editor.

import { btnPrimary } from "./ui";
import { useStepRun, RunLog } from "./use-step-run";

export function PaletteRunner({ slug, contestoOk, errore }: { slug: string; contestoOk: boolean; errore?: string }) {
  const { run, running, log, failed } = useStepRun(slug, "palette");
  const err = failed ?? errore ?? null;

  return (
    <div className="mt-8">
      {!contestoOk && (
        <p className="mb-4 rounded-ctl bg-warn-bg px-4 py-2.5 text-sm text-warn">
          Prima conferma il contesto: la palette si progetta sul contesto curato (settore, tono, colori del cliente).
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
        onClick={() => run("generate", "Avvio del palette-designer (claude -p, Opus 4.8 · effort xhigh)…")}
        disabled={running || !contestoOk}
      >
        {running ? "Generazione in corso…" : err ? "Riprova" : "Genera palette"}
      </button>
      <span className="ml-3 text-xs text-faint">claude -p · un paio di minuti</span>

      <RunLog log={log} />
    </div>
  );
}
