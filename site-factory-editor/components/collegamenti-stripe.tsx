"use client";

// Impostazioni → «Collegamenti Stripe»: solo i casi che il collegamento
// automatico (metadata.slug → stripe_customer del registro → e-mail del brief)
// non risolve. «Collega…» si abilita con una scelta e chiede conferma: è l'unica
// scrittura verso Stripe dell'editor (scrive metadata.slug sull'abbonamento).
import { useEffect, useState } from "react";
import type { NonCollegato, Portafoglio } from "@/lib/portafoglio-shared";
import { Banner, btnSecondary } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { euro, ggmm, oraBreve } from "./portafoglio-ui";

type ClienteOpzione = { slug: string; businessName: string; citta: string };

export function CollegamentiStripe({ clienti }: { clienti: ClienteOpzione[] }) {
  const [p, setP] = useState<Portafoglio | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scelta, setScelta] = useState<Record<string, string>>({}); // subscriptionId → slug
  const [daConfermare, setDaConfermare] = useState<NonCollegato | null>(null);
  const [busy, setBusy] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);

  async function carica(aggiorna = false) {
    try {
      const res = await fetch(`/api/portafoglio${aggiorna ? "?aggiorna=1" : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`errore ${res.status}`);
      setP(await res.json());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => {
    carica();
  }, []);

  async function collega() {
    if (!daConfermare) return;
    const slug = scelta[daConfermare.id];
    setBusy(true);
    setEsito(null);
    try {
      const res = await fetch("/api/portafoglio/collega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: daConfermare.id, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error ?? `errore ${res.status}`));
      setEsito(`Collegato: «${daConfermare.nome}» → ${nomeDi(slug)}.`);
      setDaConfermare(null);
      await carica(true);
    } catch (e) {
      setEsito(`Collegamento non riuscito: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const nomeDi = (slug: string) => clienti.find((c) => c.slug === slug)?.businessName ?? slug;
  const collegati = p ? Object.entries(p.abbonamenti).filter(([, a]) => a.stato !== "finito") : [];

  return (
    <section id="stripe" className="card p-5">
      <h2 className="text-sm font-semibold text-muted">
        Collegamenti Stripe <span className="font-normal text-faint">· abbonamento ↔ cliente dell&apos;editor</span>
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Il collegamento è automatico quando l&apos;e-mail dell&apos;abbonamento è quella del brief (o il report al rinnovo l&apos;ha già
        riconosciuto). Qui compaiono solo i casi da risolvere a mano, una volta sola: l&apos;editor scrive lo slug del cliente nei
        metadati dell&apos;abbonamento, così Stripe e n8n sanno di chi si parla.
      </p>

      {esito && (
        <p className={`mt-3 text-sm ${esito.startsWith("Collegato") ? "text-ok" : "text-err"}`} role="status">
          {esito}
        </p>
      )}

      <div className="mt-4">
        {err ? (
          <Banner tone="err" title="Portafoglio non caricato">
            {err}
          </Banner>
        ) : p === null ? (
          <p className="text-sm text-muted">Carico…</p>
        ) : p.fonti.stripe.stato === "non_configurata" ? (
          <p className="text-sm text-muted">Aggiungi prima la chiave Stripe nel pannello «Chiavi API» qui sopra.</p>
        ) : p.fonti.stripe.stato === "non_raggiungibile" ? (
          <Banner tone="warn" title={`Stripe non raggiungibile da ${oraBreve(p.fonti.stripe.da)}`}>
            <span className="mono">{p.fonti.stripe.errore}</span>
          </Banner>
        ) : p.nonCollegati.length === 0 ? (
          <p className="text-sm text-muted">
            Tutti gli abbonamenti in corso sono collegati a un cliente ({collegati.length}).
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-ctl border border-line">
            {p.nonCollegati.map((n) => (
              <li key={n.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4 px-4 py-3 max-md:grid-cols-1">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{n.nome}</div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {n.email ?? "senza e-mail"} · {euro(n.importoMese, n.valuta)} al mese · dal {ggmm(n.dal)}
                    {n.motivo === "email_ambigua" && <span className="text-warn"> · e-mail comune a più clienti</span>}
                  </div>
                </div>
                <span className="text-faint" aria-hidden>
                  →
                </span>
                <label className="block text-xs text-muted">
                  Cliente dell&apos;editor
                  <select
                    className="mt-1 !w-full text-sm"
                    value={scelta[n.id] ?? ""}
                    onChange={(e) => setScelta((s) => ({ ...s, [n.id]: e.target.value }))}
                  >
                    <option value="">Scegli…</option>
                    {clienti.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.businessName}
                        {c.citta ? ` · ${c.citta}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={btnSecondary} disabled={!scelta[n.id] || busy} onClick={() => setDaConfermare(n)}>
                  Collega…
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {p && p.fonti.stripe.stato === "ok" && collegati.length > 0 && p.nonCollegati.length > 0 && (
        <details className="mt-3 text-sm text-muted">
          <summary className="cursor-pointer select-none">
            {collegati.length} {collegati.length === 1 ? "abbonamento collegato" : "abbonamenti collegati"} in automatico
          </summary>
          <ul className="mt-2 list-disc pl-5">
            {collegati.map(([slug]) => (
              <li key={slug}>
                {nomeDi(slug)} <span className="mono text-faint">{slug}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={daConfermare !== null}
        title="Collegare l'abbonamento?"
        message={
          daConfermare ? (
            <>
              Scrive <span className="mono">slug = {scelta[daConfermare.id]}</span> nei metadati dell&apos;abbonamento di «
              {daConfermare.nome}» su Stripe. Da quel momento è collegato a <b>{nomeDi(scelta[daConfermare.id] ?? "")}</b>.
              Si può annullare rimuovendo il metadato in Stripe.
            </>
          ) : null
        }
        confirmLabel={busy ? "Collego…" : "Collega"}
        confirmDisabled={busy}
        onConfirm={collega}
        onCancel={() => setDaConfermare(null)}
      />
    </section>
  );
}
