"use client";

// Stato condiviso dei run in background: polling di /api/runs/active (2,5s,
// in pausa a tab nascosta) consumato dalla status bar e dalla card sidebar
// «Agenti al lavoro». Un solo poller per tutta l'app.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import type { BusRunInfo } from "@/lib/run-bus";

type RunsCtx = {
  runs: BusRunInfo[];
  vivi: BusRunInfo[];
  espanso: boolean;
  setEspanso: (v: boolean) => void;
  /** Stop di un run vivo o dismiss di un esito, poi refresh immediato. */
  stopODismiss: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<RunsCtx | null>(null);

export function useRuns(): RunsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRuns fuori da RunsProvider");
  return ctx;
}

export function RunsProvider({ children }: { children: React.ReactNode }) {
  const [runs, setRuns] = useState<BusRunInfo[]>([]);
  const [espanso, setEspanso] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/runs/active", { cache: "no-store" });
      if (res.ok) setRuns(await res.json());
    } catch {
      /* editor offline o in riavvio: riproverà al prossimo giro */
    }
  }, []);

  useEffect(() => {
    refresh();
    // Sempre attivo anche a tab nascosta: il costo è una GET locale ogni
    // 2,5s e la barra deve essere già giusta quando torni sulla finestra.
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  const stopODismiss = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/runs/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch {
        /* già sparito */
      }
      await refresh();
    },
    [refresh],
  );

  const vivi = runs.filter((r) => !r.done);
  return (
    <Ctx.Provider value={{ runs, vivi, espanso, setEspanso, stopODismiss, refresh }}>
      {/* reducedMotion="user": ogni componente motion dell'app rispetta
          prefers-reduced-motion senza doverlo gate-are a mano (il default di
          motion è "never"). Copre status bar, sfere, card agenti e futuri. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </Ctx.Provider>
  );
}
