"use client";

// Card «Agenti al lavoro» in fondo alla sidebar (lo slot che nel riferimento
// ospita l'upsell): compare solo con run vivi, click = apre il pannello della
// status bar. Nella sidebar collassata a icone non c'è spazio: nascosta.

import { motion, useReducedMotion } from "motion/react";
import { useRuns } from "./run-provider";
import { AgentOrb } from "./agent-orb";
import { agenteDaFase, nomeStep, formatElapsed } from "@/lib/agenti";

export function AgentiCard() {
  const { vivi, setEspanso } = useRuns();
  const ridotto = useReducedMotion();
  if (vivi.length === 0) return null;

  return (
    <motion.button
      initial={ridotto ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setEspanso(true)}
      className="card w-full p-3 text-left transition-colors duration-150 hover:bg-raise max-lg:hidden"
      title="Apri il pannello dei run"
    >
      <div className="text-xs font-semibold text-muted">
        {vivi.length === 1 ? "1 agente al lavoro" : `${vivi.length} agenti al lavoro`}
      </div>
      <ul className="mt-2 space-y-2">
        {vivi.slice(0, 2).map((r) => {
          const a = agenteDaFase(r.fase, r.step, r.kind);
          return (
            <li key={r.id} className="flex items-center gap-2">
              <AgentOrb agente={a} size={20} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{a.nome}</span>
                <span className="block truncate text-[11px] text-muted">
                  {r.label} · {nomeStep(r)}
                </span>
              </span>
              <span className="mono text-[11px] text-faint">{formatElapsed(Date.now() - r.startedAt)}</span>
            </li>
          );
        })}
        {vivi.length > 2 && <li className="text-[11px] text-faint">e altri {vivi.length - 2}…</li>}
      </ul>
    </motion.button>
  );
}
