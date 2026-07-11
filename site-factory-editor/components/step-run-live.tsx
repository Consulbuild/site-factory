"use client";

// Fase live di uno step nell'hub: se c'è un run in corso per (slug, step),
// mostra la fase corrente + tempo trascorso, alimentati dal RunsProvider
// (stessa fonte della status bar).

import { useEffect, useState } from "react";
import { useRuns } from "./run-provider";
import { formatElapsed } from "@/lib/agenti";

export function StepRunLive({ slug, step }: { slug: string; step: string }) {
  const { vivi } = useRuns();
  const run = vivi.find((r) => r.kind === "cliente" && r.slug === slug && r.step === step);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [run]);

  if (!run) return null;
  return (
    <span className="truncate text-xs text-brand">
      {run.fase ?? "avvio…"} · <span className="mono">{formatElapsed(Date.now() - run.startedAt)}</span>
    </span>
  );
}
