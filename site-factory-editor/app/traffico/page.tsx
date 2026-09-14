import Link from "next/link";
import { ChevronRight, Signpost, Users } from "lucide-react";
import { listClients, motivoCorrotto } from "@/lib/clients";
import { dominioDi } from "@/lib/portafoglio-shared";
import { gruppoPortafoglio, nessunServizioAcceso, type GruppoPortafoglio } from "@/lib/traffico";
import { EmptyState } from "@/components/ui";
import { StatoServizi } from "@/components/traffico-ui";

export const dynamic = "force-dynamic";

// Portafoglio Traffico (DESIGN-BRIEF §Area Traffico): vista di sola lettura, chi ha
// quale servizio in che stato, raggruppata per stato. Nessuna azione qui: si
// attiva dal dettaglio. Server component senza JS client; la lettura non scrive mai.

const GRUPPI: Array<{ key: GruppoPortafoglio; titolo: string; nota?: string }> = [
  { key: "non_leggibile", titolo: "Stato non leggibile" },
  { key: "accesi", titolo: "Con un servizio acceso" },
  { key: "spenti", titolo: "Spenti" },
  { key: "demo", titolo: "In demo", nota: "si attivano dopo «Il cliente si è abbonato»" },
];

export default function TrafficoPage() {
  const righe = listClients()
    .map((c) => {
      const corrotto = motivoCorrotto(c.slug);
      return { c, corrotto, gruppo: gruppoPortafoglio(c, !!corrotto) };
    })
    .sort((a, b) => a.c.businessName.localeCompare(b.c.businessName, "it"));
  const nessunoAcceso = nessunServizioAcceso(righe.map((r) => r.gruppo));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Traffico</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Due servizi separati per cliente: <b className="font-medium text-ink">Sito</b>, l&apos;ottimizzazione del sito per
          le ricerche locali, e <b className="font-medium text-ink">Scheda Google</b>, la scheda consigliata che poi inserisci
          tu. Si attivano dal dettaglio del cliente.
        </p>
        {/* Con i clienti elencati sotto non è un vuoto vero: una riga, non una card (densità da strumento). */}
        {righe.length > 0 && nessunoAcceso && (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink">
            <Signpost aria-hidden className="size-4 shrink-0 text-faint" />
            Nessun servizio acceso per ora.
          </p>
        )}
      </header>

      {righe.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="Nessun cliente importato."
            hint="I servizi Traffico si attivano per cliente: importa prima un cliente dalla home."
          />
        </div>
      ) : (
        <>
          {GRUPPI.map((g) => {
            const lista = righe.filter((r) => r.gruppo === g.key);
            if (lista.length === 0) return null;
            return (
              <section key={g.key} aria-labelledby={`gruppo-${g.key}`}>
                <h2 id={`gruppo-${g.key}`} className="text-sm font-semibold text-muted">
                  {g.titolo} · {lista.length}
                  {g.nota && <span className="font-normal"> — {g.nota}</span>}
                </h2>
                <ul className="card mt-3 divide-y divide-line">
                  {lista.map(({ c, corrotto }) => {
                    const dominio = dominioDi(c);
                    const meta = corrotto
                      ? "client.json fuori schema: correggilo a mano"
                      : c.percorso === "demo"
                        ? "percorso demo"
                        : (dominio ?? "senza dominio");
                    // Un solo Link a blocco: dentro nessun altro link (niente <a> annidati).
                    return (
                      <li key={c.slug}>
                        <Link
                          href={`/traffico/${c.slug}`}
                          className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 transition-colors duration-150 hover:bg-raise"
                        >
                          <span className="min-w-0 flex-1 basis-60">
                            <span className="block truncate font-medium">{c.businessName}</span>
                            <span className={`mt-0.5 block truncate text-sm ${corrotto ? "text-err" : "text-muted"}`}>
                              {[c.citta.trim(), meta].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <StatoServizi traffico={c.traffico} corrotto={!!corrotto} conData />
                          <ChevronRight aria-hidden className="size-4 shrink-0 text-faint max-sm:hidden" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
