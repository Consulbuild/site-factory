"use client";

// Dashboard clienti (DESIGN-REFACTOR §5.1): KPI card cliccabili che SONO i
// filtri (mai metriche di vanità), riga cliente con mini-pipeline a 6 tacche,
// slug visibile sui nomi duplicati, ordinamento, menu azioni per riga con
// eliminazione forte (digita il nome). La query di ricerca arriva dalla
// topbar via URL (?q=) e filtra clienti importati E submission Tally.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Users,
  Eye,
  AlertTriangle,
  Globe,
  MoreHorizontal,
  ExternalLink,
  LinkIcon,
  Trash2,
} from "lucide-react";
import type { HomeData } from "@/lib/tally";
import type { ClientSummary } from "@/lib/clients";
import { btnSecondary, formatDate, EmptyState } from "./ui";
import { TallySetup, ImportButton, RetryTally } from "./home";
import { ConfirmDialog } from "./confirm-dialog";

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

/* ---- Derivazioni di stato per filtri e pipeline ---------------------------- */

const STEP_ORDER = ["intake", "contesto", "palette", "copy", "images", "build"] as const;
const STEP_LABEL: Record<(typeof STEP_ORDER)[number], string> = {
  intake: "Intake",
  contesto: "Contesto",
  palette: "Palette",
  copy: "Copy",
  images: "Immagini",
  build: "Build",
};

const deployUrl = (c: ClientSummary): string | null =>
  (c.steps?.build as { deploy?: { url?: string } } | undefined)?.deploy?.url ?? null;
const haDaVerificare = (c: ClientSummary) => STEP_ORDER.some((s) => c.steps[s]?.stato === "da_verificare");
const haErrore = (c: ClientSummary) => STEP_ORDER.some((s) => c.steps[s]?.stato === "errore");

type Filtro = "tutti" | "verificare" | "errore" | "online";
type Ordine = "aggiornati" | "nome" | "importati";

const TACCA: Record<string, string> = {
  verificato: "bg-ok",
  da_verificare: "bg-warn",
  in_corso: "bg-brand animate-pulse",
  errore: "bg-err",
};

function MiniPipeline({ c }: { c: ClientSummary }) {
  const titolo = STEP_ORDER.map((s) => `${STEP_LABEL[s]}: ${(c.steps[s]?.stato ?? "assente").replace("_", " ")}`).join(
    " · ",
  );
  return (
    <span className="inline-flex items-center gap-1" title={titolo} aria-label={titolo}>
      {STEP_ORDER.map((s) => (
        <span key={s} className={`h-1.5 w-4 rounded-full ${TACCA[c.steps[s]?.stato ?? ""] ?? "bg-line"}`} />
      ))}
    </span>
  );
}

/* ---- KPI card-filtro -------------------------------------------------------- */

function KpiCard({
  icona: Icona,
  label,
  n,
  attivo,
  onClick,
}: {
  icona: typeof Users;
  label: string;
  n: number;
  attivo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={attivo}
      className={`card p-4 text-left transition-colors duration-150 hover:bg-raise ${
        attivo ? "!border-brand ring-1 ring-brand" : ""
      }`}
    >
      <span className="flex items-center justify-between text-sm text-muted">
        {label}
        <Icona className="size-4 text-faint" aria-hidden />
      </span>
      <span className="mt-1 block text-[28px] leading-9 font-bold tabular-nums">{n}</span>
    </button>
  );
}

/* ---- Menu azioni per riga --------------------------------------------------- */

function RowMenu({ c, onElimina }: { c: ClientSummary; onElimina: () => void }) {
  const [copiato, setCopiato] = useState(false);
  const url = deployUrl(c);
  return (
    <details className="relative" onClick={(e) => e.stopPropagation()}>
      <summary
        className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-raise hover:text-ink [&::-webkit-details-marker]:hidden"
        aria-label={`Azioni per ${c.businessName}`}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </summary>
      <div className="card absolute right-0 z-20 mt-1 w-56 p-1 shadow-raise">
        {url && (
          <>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-ctl px-3 py-2 text-sm hover:bg-raise"
            >
              <ExternalLink className="size-4 text-muted" aria-hidden /> Apri il sito online
            </a>
            <button
              className="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-sm hover:bg-raise"
              onClick={(e) => {
                navigator.clipboard.writeText(url);
                setCopiato(true);
                setTimeout(() => {
                  setCopiato(false);
                  (e.target as HTMLElement).closest("details")?.removeAttribute("open");
                }, 900);
              }}
            >
              <LinkIcon className="size-4 text-muted" aria-hidden /> {copiato ? "Copiato ✓" : "Copia link del sito"}
            </button>
            <div className="my-1 border-t border-line" />
          </>
        )}
        <button
          className="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-sm text-err hover:bg-err-bg"
          onClick={onElimina}
        >
          <Trash2 className="size-4" aria-hidden /> Elimina cliente…
        </button>
      </div>
    </details>
  );
}

/* ---- Dashboard --------------------------------------------------------------- */

export function ClientsBrowser({ initial, q }: { initial: HomeData; q: string }) {
  const router = useRouter();
  const [data, setData] = useState<HomeData>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [ordine, setOrdine] = useState<Ordine>("aggiornati");
  const [daEliminare, setDaEliminare] = useState<ClientSummary | null>(null);
  const [nomeDigitato, setNomeDigitato] = useState("");
  const [erroreElimina, setErroreElimina] = useState<string | null>(null);

  const perQuery = data.clients.filter((c) => match(q, c.businessName, c.referente, c.phone, c.citta));
  const conteggi = {
    tutti: perQuery.length,
    verificare: perQuery.filter(haDaVerificare).length,
    errore: perQuery.filter(haErrore).length,
    online: perQuery.filter((c) => deployUrl(c)).length,
  };
  const clients = useMemo(() => {
    let lista = perQuery;
    if (filtro === "verificare") lista = lista.filter(haDaVerificare);
    else if (filtro === "errore") lista = lista.filter(haErrore);
    else if (filtro === "online") lista = lista.filter((c) => deployUrl(c));
    const copia = [...lista];
    if (ordine === "nome") copia.sort((a, b) => a.businessName.localeCompare(b.businessName, "it"));
    else if (ordine === "importati") copia.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    // "aggiornati" è già l'ordine del server
    return copia;
  }, [perQuery, filtro, ordine]);

  // Nomi duplicati → lo slug diventa il disambiguante visibile.
  const nomiDoppi = useMemo(() => {
    const conta = new Map<string, number>();
    for (const c of data.clients) conta.set(c.businessName, (conta.get(c.businessName) ?? 0) + 1);
    return new Set([...conta.entries()].filter(([, n]) => n > 1).map(([nome]) => nome));
  }, [data.clients]);

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
          ? "Configura prima la API key di Tally (Impostazioni)."
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

  async function elimina() {
    if (!daEliminare) return;
    setErroreElimina(null);
    const res = await fetch(`/api/clients/${daEliminare.slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeDigitato }),
    });
    if (res.ok) {
      setDaEliminare(null);
      setNomeDigitato("");
      setData((d) => ({ ...d, clients: d.clients.filter((c) => c.slug !== daEliminare.slug) }));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setErroreElimina(data.error ?? `errore ${res.status}`);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Clienti</h1>
        <div className="flex items-center gap-3">
          {refreshMsg && <span className="text-xs text-muted">{refreshMsg}</span>}
          <button
            onClick={refresh}
            disabled={refreshing}
            className={btnSecondary}
            title="Interroga di nuovo il form Tally e recupera eventuali nuove richieste"
          >
            <RefreshCw aria-hidden className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Controllo…" : "Controlla nuovi dal form"}
          </button>
        </div>
      </div>

      {/* KPI = filtri: il numero su cui si agisce, mai decorazione */}
      <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
        <KpiCard icona={Users} label="Clienti" n={conteggi.tutti} attivo={filtro === "tutti"} onClick={() => setFiltro("tutti")} />
        <KpiCard
          icona={Eye}
          label="Da verificare"
          n={conteggi.verificare}
          attivo={filtro === "verificare"}
          onClick={() => setFiltro(filtro === "verificare" ? "tutti" : "verificare")}
        />
        <KpiCard
          icona={AlertTriangle}
          label="In errore"
          n={conteggi.errore}
          attivo={filtro === "errore"}
          onClick={() => setFiltro(filtro === "errore" ? "tutti" : "errore")}
        />
        <KpiCard
          icona={Globe}
          label="Online"
          n={conteggi.online}
          attivo={filtro === "online"}
          onClick={() => setFiltro(filtro === "online" ? "tutti" : "online")}
        />
      </div>

      {/* Clienti importati */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-muted">
            Importati {q && `· ${clients.length}/${data.clients.length}`}
          </h2>
          <label className="flex items-center gap-2 text-xs text-muted">
            Ordina
            <select
              value={ordine}
              onChange={(e) => setOrdine(e.target.value as Ordine)}
              className="!w-auto !py-1 text-sm"
            >
              <option value="aggiornati">Aggiornati di recente</option>
              <option value="nome">Nome A–Z</option>
              <option value="importati">Importati di recente</option>
            </select>
          </label>
        </div>
        {clients.length === 0 ? (
          <div className="card mt-3">
            <EmptyState
              icon={Users}
              title={
                data.clients.length === 0
                  ? "Nessun cliente importato."
                  : filtro !== "tutti"
                    ? "Nessun cliente in questo stato."
                    : "Nessun cliente corrisponde alla ricerca."
              }
              hint={
                data.clients.length === 0
                  ? "Le submission del form Tally appariranno qui sotto: importale per iniziare."
                  : undefined
              }
            />
          </div>
        ) : (
          <ul className="card mt-3 divide-y divide-line">
            {clients.map((c) => {
              const url = deployUrl(c);
              return (
                <li key={c.slug} className="flex items-center gap-2 pr-2">
                  <Link
                    href={`/clienti/${c.slug}`}
                    className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-raise"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-medium">{c.businessName}</span>
                        {nomiDoppi.has(c.businessName) && <span className="mono text-xs text-faint">{c.slug}</span>}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-muted">
                        {[c.citta, c.referente].filter(Boolean).join(" · ")}
                        {c.flagsCount > 0 && <span className="text-warn"> · {c.flagsCount} flag</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {url && (
                        <span className="inline-flex items-center gap-1 text-xs text-ok" title={url}>
                          <span className="size-1.5 rounded-full bg-ok" aria-hidden /> online
                        </span>
                      )}
                      <MiniPipeline c={c} />
                      <span className="mono text-xs text-faint">{formatDate(c.updatedAt)}</span>
                    </div>
                  </Link>
                  <RowMenu c={c} onElimina={() => setDaEliminare(c)} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Nuove richieste dal form (non importate) */}
      {data.tally === "key_mancante" ? (
        <TallySetup />
      ) : data.tally === "errore" ? (
        <section className="card flex items-center justify-between px-4 py-3">
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
            <ul className="card mt-3 divide-y divide-line">
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

      {/* Eliminazione forte: digita il nome (decisione Mattia: diretta, niente archivio) */}
      <ConfirmDialog
        open={daEliminare !== null}
        title="Eliminare il cliente?"
        tone="danger"
        message={
          <>
            Verrà cancellata la cartella <span className="mono">out/{daEliminare?.slug}</span> con tutti gli artifact
            (contesto, palette, copy, immagini, build). La submission su Tally resta e potrà essere reimportata.
            {daEliminare && deployUrl(daEliminare) && (
              <>
                {" "}
                <strong className="text-warn">
                  Il sito già pubblicato resta online finché non lo rimuovi da Cloudflare.
                </strong>
              </>
            )}
            <span className="mt-3 block">
              Per confermare digita <strong className="text-ink">{daEliminare?.businessName}</strong>
            </span>
          </>
        }
        confirmLabel="Elimina definitivamente"
        confirmDisabled={nomeDigitato.trim() !== daEliminare?.businessName}
        onConfirm={elimina}
        onCancel={() => {
          setDaEliminare(null);
          setNomeDigitato("");
          setErroreElimina(null);
        }}
      >
        <input
          type="text"
          value={nomeDigitato}
          onChange={(e) => setNomeDigitato(e.target.value)}
          placeholder={daEliminare?.businessName}
          className="mt-3"
          aria-label="Digita il nome del cliente per confermare"
          autoFocus
        />
        {erroreElimina && <p className="mt-2 text-sm text-err">{erroreElimina}</p>}
      </ConfirmDialog>
    </div>
  );
}
