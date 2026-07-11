"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary } from "@/components/ui";
import { RunLog, type LogLine } from "@/components/use-step-run";

// Esecuzione di una run di fabbrica: un bottone, log streaming, refresh della
// timeline a ogni evento di fase (run.json è la verità, la pagina la rilegge).

export function RunRunner({ runId, stato }: { runId: string; stato: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const append = (l: LogLine) =>
    setLog((prev) => {
      const next = [...prev, l];
      queueMicrotask(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }));
      return next;
    });

  async function esegui() {
    setRunning(true);
    setErrore(null);
    setLog([]);
    try {
      const res = await fetch(`/api/factory/runs/${runId}/run`, { method: "POST" });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `richiesta rifiutata (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "phase") {
            append({ kind: "phase", text: ev.label });
            router.refresh(); // la timeline rilegge run.json
          } else if (ev.type === "tool") append({ kind: "tool", text: ev.name + (ev.detail ? `  ${ev.detail}` : "") });
          else if (ev.type === "text") append({ kind: "text", text: ev.text });
          else if (ev.type === "done") append({ kind: "info", text: "Run completata: da audire." });
          else if (ev.type === "error") {
            setErrore(ev.message);
            append({ kind: "err", text: ev.message });
          }
        }
      }
      router.refresh();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const finita = stato === "da_audire" || stato === "pubblicata" || stato === "scartata";
  return (
    <div className="space-y-3">
      {!finita && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted">
            Le fasi ripartono dalla prima non conclusa; ogni fallimento lascia il motivo nel report.
          </p>
          <button type="button" className={btnPrimary} onClick={esegui} disabled={running}>
            {running ? "In esecuzione…" : stato === "fallita" ? "Riprendi run" : "Esegui run"}
          </button>
        </div>
      )}
      {errore && (
        <p className="rounded-md bg-err-bg px-3 py-2 text-sm text-err" role="alert">
          {errore}
        </p>
      )}
      {(running || log.length > 0) && <RunLog log={log} logRef={logRef} />}
    </div>
  );
}
