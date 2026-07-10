"use client";

// Schermata clienti interattiva: barra di ricerca (nome azienda / referente /
// telefono) su clienti importati E submission Tally, + refresh manuale che
// ri-chiama l'API Tally e segnala le nuove richieste (dedup per submissionId).
// Pensata per scalare a molti clienti: filtro live lato client.

import { useState } from "react";
import Link from "next/link";
import type { HomeData } from "@/lib/tally";
import { StepBadge, formatDate } from "./ui";
import { TallySetup, ImportButton, RetryTally, ApiKeysPanel } from "./home";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
const digits = (s: string) => s.replace(/\D/g, "");

function match(q: string, ...fields: string[]): boolean {
  if (!q.trim()) return true;
  const nq = norm(q.trim());
  const dq = digits(q);
  return fields.some((f) => norm(f).includes(nq)) || (dq.length >= 3 && fields.some((f) => digits(f).includes(dq)));
}

export function ClientsBrowser({ initial }: { initial: HomeData }) {
  const [data, setData] = useState<HomeData>(initial);
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const clients = data.clients.filter((c) => match(q, c.businessName, c.referente, c.phone, c.citta));
  const subs = data.nonImportati.filter((s) => match(q, s.businessName, s.ownerName, s.phone));

  async function refresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/clients", { cache: "no-store" });
      const fresh: HomeData = await res.json();
      const prima = new Set(data.nonImportati.map((s) => s.id));
      const nuovi = fresh.nonImportati.filter((s) => !prima.has(s.id)).length;
      setData(fresh);
      setRefreshMsg(
        fresh.tally === "key_mancante"
          ? "Configura prima la API key di Tally."
          : fresh.tally === "errore"
            ? `Tally non raggiungibile: ${fresh.tallyError ?? ""}`
            : nuovi > 0
              ? `${nuovi} ${nuovi === 1 ? "nuova richiesta" : "nuove richieste"} dal form`
              : "Nessuna nuova richiesta",
      );
    } catch (e) {
      setRefreshMsg(`errore: ${e instanceof Error ? e.message : String(e)}`);
    }
    setRefreshing(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">Clienti</h1>
          <div className="flex items-center gap-3">
            {refreshMsg && <span className="text-xs text-muted">{refreshMsg}</span>}
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-line2 hover:bg-raise disabled:opacity-50"
              title="Interroga di nuovo il form Tally e recupera eventuali nuove richieste"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={refreshing ? "animate-spin" : ""}
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
              </svg>
              {refreshing ? "Controllo…" : "Controlla nuovi dal form"}
            </button>
          </div>
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nome azienda, referente o telefono…"
          className="mt-3"
          aria-label="Cerca clienti"
        />
      </div>

      {/* Clienti importati */}
      <section>
        <h2 className="text-sm font-semibold text-muted">
          Importati {q && `· ${clients.length}/${data.clients.length}`}
        </h2>
        {clients.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {data.clients.length === 0 ? "Nessun cliente importato." : "Nessun cliente corrisponde alla ricerca."}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {clients.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/clienti/${c.slug}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-raise"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.businessName}</div>
                    <div className="mt-0.5 truncate text-sm text-muted">
                      {[c.citta, c.referente].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Intake</span>
                    <StepBadge stato={c.steps.intake.stato} extra={c.flagsCount > 0 ? `${c.flagsCount} flag` : undefined} />
                    <span className="ml-2 text-xs text-muted">Contesto</span>
                    <StepBadge stato={c.steps.contesto.stato} />
                  </div>
                  <span className="text-muted" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Nuove richieste dal form (non importate) */}
      {data.tally === "key_mancante" ? (
        <TallySetup />
      ) : data.tally === "errore" ? (
        <section className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-sm text-muted">
            Tally non raggiungibile: <span className="text-err">{data.tallyError}</span>
          </p>
          <RetryTally />
        </section>
      ) : subs.length > 0 || (q && data.nonImportati.length > 0) ? (
        <section>
          <h2 className="text-sm font-semibold text-muted">
            Dal form Tally (non importati) {q && `· ${subs.length}/${data.nonImportati.length}`}
          </h2>
          {subs.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nessuna richiesta corrisponde alla ricerca.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.businessName || "(senza nome)"}</div>
                    <div className="mono mt-0.5 truncate text-muted">
                      {[s.ownerName, formatDate(s.submittedAt), s.phone].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <ImportButton submissionId={s.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Gestione chiavi API (Keychain) */}
      <ApiKeysPanel />
    </div>
  );
}
