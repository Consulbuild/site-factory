"use client";

// La sfera dell'agente (DESIGN-REFACTOR §6.4): gradiente radiale a due
// fermate del colore-agente + highlight speculare, tutto in CSS — nessuna
// immagine. Respiro in idle, pulso dell'anello al cambio attività, morph in
// spunta/croce a esito. I passi deterministici NON hanno la sfera: chip
// quadrato neutro. prefers-reduced-motion: tutto statico, lo stato resta
// leggibile da colore+icona (mai solo colore).

import { motion, useReducedMotion } from "motion/react";
import { Check, X, Square, TerminalSquare } from "lucide-react";
import type { AgenteInfo } from "@/lib/agenti";

export function AgentOrb({
  agente,
  stato = "attivo",
  size = 26,
}: {
  agente: AgenteInfo;
  stato?: "attivo" | "ok" | "errore" | "interrotto";
  size?: number;
}) {
  const ridotto = useReducedMotion();
  const c = `var(--agent-${agente.key})`;

  if (!agente.sfera) {
    // Passo deterministico: chip quadrato, niente respiro.
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center rounded-[6px] border border-line bg-raise text-muted"
        style={{ width: size, height: size }}
        title={agente.nome}
      >
        <TerminalSquare style={{ width: size * 0.58, height: size * 0.58 }} strokeWidth={2} />
      </span>
    );
  }

  const anello =
    stato === "errore"
      ? "0 0 0 1.5px var(--err)"
      : stato === "interrotto"
        ? "0 0 0 1.5px var(--warn)"
        : `0 0 0 1px color-mix(in oklch, ${c}, transparent 55%)`;

  return (
    <motion.span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center rounded-full"
      title={agente.nome}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 26%, oklch(1 0 0 / 0.6), transparent 44%), radial-gradient(circle at 62% 68%, ${c}, color-mix(in oklch, ${c}, black 38%))`,
        boxShadow: `${anello}, 0 3px 10px color-mix(in oklch, ${c}, transparent 65%)`,
      }}
      animate={stato === "attivo" && !ridotto ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={stato === "attivo" && !ridotto ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {stato === "ok" && <Check className="size-[60%] text-white drop-shadow" strokeWidth={3} aria-hidden />}
      {stato === "errore" && <X className="size-[60%] text-white drop-shadow" strokeWidth={3} aria-hidden />}
      {stato === "interrotto" && <Square className="size-[45%] fill-white text-white drop-shadow" aria-hidden />}
    </motion.span>
  );
}
