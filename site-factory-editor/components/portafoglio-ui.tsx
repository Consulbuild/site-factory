// Mattoni presentazionali della dashboard clienti, condivisi da home (client) e
// hub (server): niente "use client", niente stato. Formattazione italiana e
// stati con forma oltre al colore (pallino = su, quadrato = giù, come le tacche).
import type { Abbonamento, StatoSito } from "@/lib/portafoglio-shared";
import { Badge } from "./ui";

export function euro(centesimi: number, valuta = "eur"): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: valuta.toUpperCase(), maximumFractionDigits: 0 }).format(centesimi / 100);
}

/** «30/09» */
export function ggmm(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", timeZone: "Europe/Rome" });
  } catch {
    return iso;
  }
}

/** «09:41» — fuso esplicito: l'hub renderizza lato server. */
export function oraBreve(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  } catch {
    return iso;
  }
}

/** «adesso» · «12 min fa» · «3 h fa» · «2 giorni fa» */
export function faMin(iso: string, ora = Date.now()): string {
  const min = Math.max(0, Math.round((ora - Date.parse(iso)) / 60_000));
  if (Number.isNaN(min)) return iso;
  if (min < 1) return "adesso";
  if (min < 60) return `${min} min fa`;
  const ore = Math.round(min / 60);
  if (ore < 24) return `${ore} h fa`;
  const giorni = Math.round(ore / 24);
  return giorni === 1 ? "1 giorno fa" : `${giorni} giorni fa`;
}

/** Segnaposto delle colonne live alla prima apertura (i dati locali sono già lì). */
export function Skeleton({ className = "w-16" }: { className?: string }) {
  return <span aria-hidden className={`inline-block h-3 animate-pulse rounded-full bg-line align-middle ${className}`} />;
}

export function AbbonamentoBadge({ a }: { a: Abbonamento }) {
  switch (a.stato) {
    case "attivo":
      return (
        <>
          <Badge tone="ok">Attivo</Badge>
          {a.rinnovo && <span className="text-xs text-muted">rinnovo {ggmm(a.rinnovo)}</span>}
        </>
      );
    case "ritardo":
      return <Badge tone="err">In ritardo · {a.giorniRitardo ?? 0} gg</Badge>;
    case "disdetto":
      return (
        <>
          <Badge tone="warn">Disdetto</Badge>
          {a.fine && <span className="text-xs text-muted">fino al {ggmm(a.fine)}</span>}
        </>
      );
    default:
      return <Badge tone="idle">Finito{a.fine ? ` il ${ggmm(a.fine)}` : ""}</Badge>;
  }
}

/** Pallino verde = su, quadrato rosso = giù (distinguibili senza colore). */
export function SitoStato({ s }: { s: StatoSito }) {
  return s.su ? (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="size-1.5 rounded-full bg-ok" aria-hidden />
      <span className="font-medium">su</span>
      <span className="mono text-faint">{s.ms} ms</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-err">
      <span className="size-1.5 rounded-none bg-err" aria-hidden />
      giù{s.da ? ` da ${faMin(s.da)}` : ""}
    </span>
  );
}
