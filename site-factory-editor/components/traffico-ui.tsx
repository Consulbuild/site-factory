// Mattoni presentazionali dell'area Traffico, condivisi da portafoglio, dettaglio e
// riga dell'hub: niente "use client", niente stato. Il badge di un servizio porta
// sempre la parola oltre al colore; con client.json fuori schema mostra «Non
// leggibile», mai «Spento» (lo stato vero non si conosce).
import { Badge } from "./ui";
import { ggmm } from "./portafoglio-ui";
import { ETICHETTA_SERVIZIO, SERVIZI, dataValida, leggiTraffico, type StatoServizio, type Traffico } from "@/lib/traffico";

type Tono = React.ComponentProps<typeof Badge>["tone"];

const BADGE: Record<StatoServizio | "non_leggibile", { tone: Tono; label: string }> = {
  spento: { tone: "idle", label: "Spento" },
  attivo: { tone: "ok", label: "Attivo" },
  // Ambra: ciò che è online resta, ma nessuno lo cura più. Da tenere d'occhio.
  sospeso: { tone: "warn", label: "Sospeso" },
  non_leggibile: { tone: "err", label: "Non leggibile" },
};

export function ServizioBadge({ stato }: { stato: StatoServizio | "non_leggibile" }) {
  const { tone, label } = BADGE[stato];
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * «Sito [Attivo] dal 14/09 · Scheda Google [Spento]»: etichetta inline prima di ogni badge, regge a capo a 400 px.
 * La data eredita muted, mai faint: sul fondo hover della riga (raise, tema scuro) faint scende sotto AA.
 */
export function StatoServizi({ traffico, corrotto, conData = false }: { traffico?: Traffico; corrotto: boolean; conData?: boolean }) {
  const t = leggiTraffico({ traffico });
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {SERVIZI.map((k) => {
        const s = t[k];
        const dal = s.stato === "attivo" ? s.attivatoAt : s.stato === "sospeso" ? s.sospesoAt : undefined;
        return (
          <span key={k} className="inline-flex items-center gap-1.5 text-sm text-muted">
            {ETICHETTA_SERVIZIO[k]}
            <ServizioBadge stato={corrotto ? "non_leggibile" : s.stato} />
            {conData && !corrotto && dataValida(dal) && <span className="mono">dal {ggmm(dal)}</span>}
          </span>
        );
      })}
    </span>
  );
}
