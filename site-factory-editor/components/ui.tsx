// Vocabolario componenti condiviso (DESIGN-BRIEF.md): badge di stato pill,
// classi bottone. Un solo posto, stessa grammatica su tutte le schermate.

export type BadgeTone = "warn" | "ok" | "brand" | "err" | "idle";

const TONES: Record<BadgeTone, string> = {
  warn: "bg-warn-bg text-warn",
  ok: "bg-ok-bg text-ok",
  brand: "bg-brand-dim text-brand",
  err: "bg-err-bg text-err",
  idle: "bg-surface text-muted",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Badge per lo stato di uno step (client.json). */
export function StepBadge({ stato, extra }: { stato: string; extra?: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    da_verificare: { tone: "warn", label: "Da verificare" },
    verificato: { tone: "ok", label: "Verificato" },
    in_corso: { tone: "brand", label: "In corso…" },
    errore: { tone: "err", label: "Errore" },
    assente: { tone: "idle", label: "—" },
  };
  const { tone, label } = map[stato] ?? { tone: "idle" as BadgeTone, label: stato };
  return (
    <Badge tone={tone}>
      {label}
      {extra ? ` · ${extra}` : ""}
    </Badge>
  );
}

export const btnPrimary =
  "inline-flex items-center gap-2 rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-brand-ink transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
export const btnSecondary =
  "inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-line2 hover:bg-raise disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted transition-colors duration-150 hover:bg-raise hover:text-ink";

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}
