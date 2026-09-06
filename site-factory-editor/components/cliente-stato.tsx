// Card «Sito · Abbonamento · Lead · Visite» dell'hub cliente (server component,
// sincrona: riceve i dati già letti da leggiStatoCliente). Tre fatti per
// colonna, link al servizio nel titolo; ogni colonna gestisce da sola la fonte
// non configurata o non raggiungibile. Compare solo con un dominio: prima
// dell'online l'hub resta com'è. Decisioni: docs/piano-dashboard-clienti.md.
import Link from "next/link";
import type { StatoCliente } from "@/lib/portafoglio";
import type { StatoFonte } from "@/lib/portafoglio-shared";
import { GATUS_HOST, gatusUrl } from "@/lib/gatus";
import { UMAMI_HOST } from "@/lib/integrazioni";
import { AbbonamentoBadge, SitoStato, euro, ggmm, faMin, oraBreve } from "./portafoglio-ui";
import { AggiornaFonti } from "./aggiorna-fonti";

function Titolo({ children, href, label }: { children: React.ReactNode; href?: string; label?: string }) {
  return (
    <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-muted uppercase">
      {children}
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="font-medium tracking-normal normal-case text-muted hover:text-ink">
          {label} ↗
        </a>
      )}
    </div>
  );
}

const Big = ({ children, err = false }: { children: React.ReactNode; err?: boolean }) => (
  <div className={`mt-2 flex flex-wrap items-center gap-2 text-xl font-bold ${err ? "text-err" : ""}`}>{children}</div>
);
const Fatti = ({ children }: { children: React.ReactNode }) => <div className="mt-1.5 space-y-0.5 text-sm text-muted">{children}</div>;
const B = ({ children }: { children: React.ReactNode }) => <b className="font-semibold text-ink">{children}</b>;

/** Variazione rispetto al mese precedente, verde/rosso con segno esplicito. */
function Delta({ n, pct = false }: { n: number; pct?: boolean }) {
  if (n === 0) return <span className="text-muted">uguale</span>;
  return (
    <span className={`font-semibold ${n > 0 ? "text-ok" : "text-err"}`}>
      {n > 0 ? "+" : "−"}
      {Math.abs(n)}
      {pct ? " %" : ""}
    </span>
  );
}

/** Colonna «—» con la causa, quando la fonte non è disponibile. */
function NonDisponibile({ fonte, chiave }: { fonte: StatoFonte; chiave: string }) {
  return (
    <>
      <Big>
        <span className="text-faint">—</span>
      </Big>
      <Fatti>
        {fonte.stato === "non_configurata" ? (
          <Link href="/impostazioni" className="text-warn underline-offset-2 hover:underline">
            Aggiungi {chiave} in Impostazioni
          </Link>
        ) : fonte.stato === "non_raggiungibile" ? (
          <span className="text-warn">Non raggiungibile da {oraBreve(fonte.da)}</span>
        ) : null}
      </Fatti>
    </>
  );
}

export function ClienteStato({
  stato,
  dominio,
  demo,
  umamiWebsiteId,
}: {
  stato: StatoCliente;
  dominio: string | null;
  demo: { url: string; dal: string } | null;
  umamiWebsiteId?: string;
}) {
  if (!dominio) {
    return (
      <p className="card mt-6 px-4 py-3 text-sm text-muted">
        {demo ? (
          <>
            Demo inviata il <B>{ggmm(demo.dal)}</B> ·{" "}
            <a href={demo.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              anteprima su workers.dev ↗
            </a>{" "}
            · il cliente non è ancora abbonato: con il dominio compaiono abbonamento, monitor, lead e visite.
          </>
        ) : (
          "Nessun sito pubblicato: abbonamento, monitor, lead e visite compaiono dopo la pubblicazione con dominio."
        )}
      </p>
    );
  }

  const { fonti, abbonamento: abb, sito, uptime30, lead, visite } = stato;
  const conv = visite && visite.visitatori30 > 0 ? ((lead.n30 / visite.visitatori30) * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 }) : null;
  const dv = visite && visite.visitatori30Prec > 0 ? Math.round(((visite.visitatori30 - visite.visitatori30Prec) / visite.visitatori30Prec) * 100) : null;
  const orario = [fonti.lead, fonti.umami].find((f): f is Extract<StatoFonte, { stato: "ok" }> => f.stato === "ok");

  return (
    <section className="mt-6" aria-label="Sito, abbonamento, lead e visite">
      <div className="card grid grid-cols-4 divide-x divide-line max-md:grid-cols-2">
        <div className="min-w-0 p-4">
          <Titolo href={sito ? gatusUrl(sito.key) : GATUS_HOST} label="Gatus">
            Sito
          </Titolo>
          {fonti.gatus.stato !== "ok" ? (
            <NonDisponibile fonte={fonti.gatus} chiave="la password del monitor" />
          ) : !sito ? (
            <>
              <Big>
                <span className="text-faint">—</span>
              </Big>
              <Fatti>Non ancora nel monitor: dopo la pubblicazione Coolify lo aggiunge in pochi minuti.</Fatti>
            </>
          ) : sito.su ? (
            <>
              <Big>
                <SitoStato s={{ ...sito, ms: sito.ms }} />
              </Big>
              <Fatti>
                <div>
                  Ultimo controllo <B>{faMin(sito.ultimoControllo)}</B>
                </div>
                {uptime30 !== null && (
                  <div>
                    Uptime 30 gg <B>{(uptime30 * 100).toLocaleString("it-IT", { maximumFractionDigits: 2 })} %</B>
                  </div>
                )}
                <div>
                  <a href={`https://${dominio}`} target="_blank" rel="noreferrer" className="mono underline-offset-2 hover:underline">
                    {dominio}
                  </a>
                </div>
              </Fatti>
            </>
          ) : (
            <>
              <Big err>
                <SitoStato s={sito} />
              </Big>
              <Fatti>
                <div>
                  <B>{sito.falliti ?? 1} controlli falliti</B>
                  {sito.causa ? ` · ${sito.causa}` : ""}
                </div>
                <div>
                  Ultima risposta buona <B>{sito.ultimoSu ? oraBreve(sito.ultimoSu) : "—"}</B>
                </div>
                <div>Avviso Telegram inviato dal monitor</div>
              </Fatti>
            </>
          )}
        </div>

        <div className="min-w-0 p-4">
          <Titolo href={abb?.url} label="Stripe">
            Abbonamento
          </Titolo>
          {fonti.stripe.stato !== "ok" ? (
            <NonDisponibile fonte={fonti.stripe} chiave="la chiave Stripe" />
          ) : !abb ? (
            <>
              <Big>
                <span className="text-faint">—</span>
              </Big>
              <Fatti>
                <Link href="/impostazioni#stripe" className="text-warn underline-offset-2 hover:underline">
                  Nessun abbonamento collegato: collega in Impostazioni
                </Link>
              </Fatti>
            </>
          ) : (
            <>
              <Big>
                <AbbonamentoBadge a={{ ...abb, rinnovo: undefined, fine: undefined }} />
                <span className="text-sm font-medium text-muted">{euro(abb.importoMese, abb.valuta)} al mese</span>
              </Big>
              <Fatti>
                {abb.stato === "attivo" && abb.rinnovo && (
                  <div>
                    Prossimo rinnovo <B>{ggmm(abb.rinnovo)}</B>
                  </div>
                )}
                {abb.stato === "ritardo" && (
                  <div>
                    Pagamento scaduto da <B>{abb.giorniRitardo ?? 0} giorni</B>
                  </div>
                )}
                {(abb.stato === "disdetto" || abb.stato === "finito") && abb.fine && (
                  <div>
                    {abb.stato === "disdetto" ? "Attivo fino al" : "Finito il"} <B>{ggmm(abb.fine)}</B>
                  </div>
                )}
                <div>
                  Cliente dal <B>{new Date(abb.dal).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}</B>
                </div>
              </Fatti>
            </>
          )}
        </div>

        <div className="min-w-0 p-4">
          <Titolo>Lead</Titolo>
          {fonti.lead.stato !== "ok" ? (
            <NonDisponibile fonte={fonti.lead} chiave="la API key di n8n" />
          ) : (
            <>
              <Big>
                <span className="tabular-nums">{lead.n30}</span>
                <span className="text-sm font-medium text-muted">negli ultimi 30 gg</span>
              </Big>
              <Fatti>
                <div>
                  Ultimo <B>{lead.ultimo ? `${ggmm(lead.ultimo)}, ${oraBreve(lead.ultimo)}` : "nessuno"}</B>
                </div>
                <div>
                  Mese precedente: {lead.n30Prec} · <Delta n={lead.n30 - lead.n30Prec} />
                </div>
              </Fatti>
            </>
          )}
        </div>

        <div className="min-w-0 p-4">
          <Titolo href={umamiWebsiteId ? `${UMAMI_HOST}/websites/${umamiWebsiteId}` : undefined} label="Umami">
            Visite
          </Titolo>
          {!umamiWebsiteId ? (
            <>
              <Big>
                <span className="text-faint">—</span>
              </Big>
              <Fatti>Statistiche non attive: si accendono alla prossima build con dominio.</Fatti>
            </>
          ) : fonti.umami.stato !== "ok" || !visite ? (
            <NonDisponibile fonte={fonti.umami} chiave="la password Umami" />
          ) : (
            <>
              <Big>
                <span className="tabular-nums">{visite.visitatori30.toLocaleString("it-IT")}</span>
                <span className="text-sm font-medium text-muted">visitatori, 30 gg</span>
              </Big>
              <Fatti>
                <div>
                  Conversione <B>{conv ?? "—"}{conv ? " %" : ""}</B> <span className="text-faint">(lead ÷ visitatori)</span>
                </div>
                <div>
                  Mese precedente: {visite.visitatori30Prec.toLocaleString("it-IT")} · {dv === null ? <span className="text-muted">—</span> : <Delta n={dv} pct />}
                </div>
              </Fatti>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted">
        {orario && (
          <>
            Lead e visite: <span className="mono">{faMin(orario.at)}</span>
          </>
        )}
        <AggiornaFonti />
      </div>
    </section>
  );
}
