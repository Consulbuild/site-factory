// Vocabolario componenti condiviso (DESIGN-REFACTOR-2026-07.md §4): badge di
// stato unificati, classi bottone pill, Banner, EmptyState, Breadcrumb.
// Un solo posto, stessa grammatica su tutte le schermate.

import type { LucideIcon } from "lucide-react";

export type BadgeTone = "warn" | "ok" | "brand" | "err" | "idle";

const TONES: Record<BadgeTone, string> = {
  warn: "bg-warn-bg text-warn",
  ok: "bg-ok-bg text-ok",
  brand: "bg-brand-dim text-brand",
  err: "bg-err-bg text-err",
  idle: "bg-raise text-muted",
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

/* ---- Badge di stato unificati (unica fonte: niente copie inline) ---------- */

/** Stato di uno step cliente (client.json). */
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

/** Stato di una run di fabbrica (run.json). */
export function RunBadge({ stato }: { stato: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    creata: { tone: "idle", label: "Creata" },
    in_corso: { tone: "brand", label: "In corso…" },
    fallita: { tone: "err", label: "Fallita" },
    interrotta: { tone: "warn", label: "Interrotta" },
    da_audire: { tone: "warn", label: "Da audire" },
    pubblicata: { tone: "ok", label: "Pubblicata" },
    scartata: { tone: "idle", label: "Scartata" },
  };
  const { tone, label } = map[stato] ?? { tone: "idle" as BadgeTone, label: stato };
  return <Badge tone={tone}>{label}</Badge>;
}

/** Esito di una fase di run (in_attesa|in_corso|ok|fallita). */
export function FaseBadge({ esito }: { esito: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    ok: { tone: "ok", label: "Ok" },
    in_corso: { tone: "brand", label: "In corso…" },
    fallita: { tone: "err", label: "Fallita" },
    in_attesa: { tone: "idle", label: "In attesa" },
  };
  const { tone, label } = map[esito] ?? { tone: "idle" as BadgeTone, label: esito };
  return <Badge tone={tone}>{label}</Badge>;
}

/** Esito opt-out TDM di un riferimento della fabbrica. */
export function OptoutBadge({ esito }: { esito: string | null }) {
  if (esito === "consentito") return <Badge tone="ok">Opt-out: consentito</Badge>;
  if (esito === "bloccato") return <Badge tone="err">Bloccato (opt-out TDM)</Badge>;
  if (esito === "errore") return <Badge tone="warn">Non verificabile</Badge>;
  return <Badge tone="idle">Da verificare</Badge>;
}

/* ---- Bottoni (pill — anatomia del riferimento) ---------------------------- */

export const btnPrimary =
  "inline-flex items-center gap-2 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-brand-ink transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
export const btnSecondary =
  "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-line2 hover:bg-raise disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm text-muted transition-colors duration-150 hover:bg-raise hover:text-ink";
export const btnDanger =
  "inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-err transition-colors duration-150 hover:border-err hover:bg-err-bg disabled:cursor-not-allowed disabled:opacity-40";

/* ---- Banner di stato (staleness, conferme, errori di pagina) -------------- */

const BANNER_TONES: Record<Exclude<BadgeTone, "idle">, string> = {
  warn: "border-warn/30 bg-warn-bg text-warn",
  ok: "border-ok/30 bg-ok-bg text-ok",
  err: "border-err/30 bg-err-bg text-err",
  brand: "border-brand/30 bg-brand-dim text-brand",
};

export function Banner({
  tone,
  title,
  children,
  actions,
}: {
  tone: Exclude<BadgeTone, "idle">;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`rounded-ctl border px-4 py-3 text-sm ${BANNER_TONES[tone]}`}>
      {title ? <div className="font-semibold">{title}</div> : null}
      {children ? <div className={title ? "mt-1" : ""}>{children}</div> : null}
      {actions ? <div className="mt-2.5 flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ---- Empty state ----------------------------------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {Icon ? <Icon aria-hidden className="size-6 text-faint" strokeWidth={1.75} /> : null}
      <p className="text-sm font-medium text-muted">{title}</p>
      {hint ? <p className="max-w-md text-sm text-faint">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ---- Breadcrumb unificato (editor E runner: una sola implementazione) ----- */

export function Breadcrumb({
  items,
  onNavigate,
}: {
  /** Ultima voce = pagina corrente (non cliccabile). */
  items: Array<{ label: string; href?: string }>;
  /** Passa dalla guardia dirty quando fornito; altrimenti nav diretta. */
  onNavigate?: (href: string) => void;
}) {
  return (
    <nav className="min-w-0 truncate text-sm text-muted" aria-label="Percorso">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i}>
            {i > 0 ? " / " : ""}
            {last || !it.href ? (
              <span className={last ? "text-ink" : undefined}>{it.label}</span>
            ) : onNavigate ? (
              <button onClick={() => onNavigate(it.href!)} className="hover:text-ink">
                {it.label}
              </button>
            ) : (
              <a href={it.href} className="hover:text-ink">
                {it.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}
