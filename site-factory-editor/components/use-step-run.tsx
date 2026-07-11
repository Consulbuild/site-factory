"use client";

// Hook condiviso per eseguire uno step AI via streaming NDJSON (generate o
// update) e mostrare il log live. Usato dai runner iniziali e dai
// riallineamenti/rigenerazioni negli editor delle schede.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type LogLine = { kind: "tool" | "text" | "info" | "err" | "phase"; text: string };

const shorten = (p: string) => (p.length > 60 ? "…" + p.slice(-58) : p);

export function useStepRun(slug: string, step: string) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const append = (l: LogLine) => {
    setLog((prev) => [...prev, l]);
    queueMicrotask(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }));
  };

  async function run(
    mode: "generate" | "update" | "critic" | "regen" | "partial",
    startMsg: string,
    extra: Record<string, unknown> = {},
  ) {
    setRunning(true);
    setFailed(null);
    setLog([{ kind: "info", text: startMsg }]);
    try {
      const res = await fetch(`/api/clients/${slug}/run/${step}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, ...extra }),
      });
      // Rifiuto pre-stream (gate 409, slug 400, …): il body è JSON, non NDJSON.
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `richiesta rifiutata (${res.status})`);
      }
      if (!res.body) throw new Error("nessuno stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let ok = false;
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
          if (ev.type === "tool") append({ kind: "tool", text: `${ev.name}${ev.detail ? "  " + shorten(ev.detail) : ""}` });
          else if (ev.type === "phase") append({ kind: "phase", text: ev.label });
          else if (ev.type === "text") append({ kind: "text", text: ev.text });
          else if (ev.type === "done") {
            ok = true;
            append({ kind: "info", text: "Fatto. Aggiorno la scheda…" });
          } else if (ev.type === "error") {
            setFailed(ev.message);
            append({ kind: "err", text: ev.message });
          }
        }
      }
      if (ok) {
        router.refresh();
        return;
      }
    } catch (e) {
      setFailed(e instanceof Error ? e.message : String(e));
    }
    setRunning(false);
  }

  return { run, running, log, failed, logRef };
}

/** Pannello log stile terminale, condiviso. */
export function RunLog({
  log,
  logRef,
  className,
}: {
  log: LogLine[];
  logRef: React.RefObject<HTMLDivElement | null>;
  /** Override del dimensionamento (default: blocco da scheda, max-h-96). */
  className?: string;
}) {
  if (log.length === 0) return null;
  return (
    <div
      ref={logRef}
      className={`mono overflow-y-auto card p-4 text-xs leading-relaxed ${className ?? "mt-5 max-h-96"}`}
    >
      {log.map((l, i) =>
        l.kind === "phase" ? (
          <div key={i} className="mt-2 font-semibold text-faint first:mt-0">
            ── {l.text} ──
          </div>
        ) : (
          <div
            key={i}
            className={
              l.kind === "tool" ? "text-brand" : l.kind === "err" ? "text-err" : l.kind === "info" ? "text-muted" : "text-ink"
            }
          >
            {l.kind === "tool" ? "› " : l.kind === "info" ? "• " : "  "}
            {l.text}
          </div>
        ),
      )}
    </div>
  );
}
