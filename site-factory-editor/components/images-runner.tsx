"use client";

// [Genera immagini] iniziale + log live multi-fase. Al done ricarica → editor.
// Se manca la key BFL mostra il KeySetup (Keychain) al posto del bottone.

import { btnPrimary } from "./ui";
import { useStepRun, RunLog } from "./use-step-run";
import { KeySetup } from "./home";

export function ImagesRunner({
  slug,
  gateMsg,
  bflOk,
  errore,
}: {
  slug: string;
  /** Motivo per cui il run non è eseguibile (copy/palette non verificati), o null. */
  gateMsg: string | null;
  bflOk: boolean;
  errore?: string;
}) {
  const { run, running, log, failed, logRef } = useStepRun(slug, "images");
  const err = failed ?? errore ?? null;

  return (
    <div className="mt-8">
      {gateMsg && <p className="mb-4 rounded-md bg-warn-bg px-4 py-2.5 text-sm text-warn">{gateMsg}</p>}
      {err && (
        <div className="mb-4 rounded-md bg-err-bg px-4 py-3 text-sm text-err">
          <p className="font-medium">Generazione fallita</p>
          <p className="mt-1 whitespace-pre-wrap">{err}</p>
        </div>
      )}

      {!bflOk ? (
        <KeySetup
          name="BFL_API_KEY"
          title="Configura Black Forest Labs"
          description="Le immagini si generano con FLUX.2 via API BFL. Incolla la API key (dashboard.bfl.ai): viene salvata nel portachiavi macOS (Keychain), mai in chiaro su disco."
          placeholder="bfl-…"
        />
      ) : (
        <>
          <button
            className={btnPrimary}
            onClick={() => run("generate", "Avvio della pipeline immagini: prompter → critico → rigenera scarti (max 3 round)…")}
            disabled={running || gateMsg !== null}
          >
            {running ? "Generazione in corso…" : err ? "Riprova" : "Genera immagini"}
          </button>
          <span className="ml-3 text-xs text-faint">claude -p + FLUX.2 · più fasi, 10–30 minuti · ~0,3 $/run</span>
        </>
      )}

      <RunLog log={log} logRef={logRef} />
    </div>
  );
}
