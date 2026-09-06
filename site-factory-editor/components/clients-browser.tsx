"use client";

// Dashboard clienti (DESIGN-REFACTOR §5.1 + docs/piano-dashboard-clienti.md):
// KPI card cliccabili che SONO i filtri (mai metriche di vanità) — Da sviluppare,
// Attivi, Siti down, In ritardo — alimentate dal portafoglio (Stripe, Gatus,
// lead n8n) caricato lato client con scheletro; riga cliente essenziale
// (abbonamento · sito · lead · mini-pipeline a 7 tacche) col dominio cliccabile,
// slug visibile sui nomi duplicati, ordinamento, menu azioni per riga con
// eliminazione forte (digita il nome). La query di ricerca arriva dalla
// topbar via URL (?q=) e filtra clienti importati E submission Tally.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Users,
  Hammer,
  Check,
  AlertTriangle,
  CreditCard,
  MoreHorizontal,
  ExternalLink,
  LinkIcon,
  Trash2,
} from "lucide-react";
import type { HomeData } from "@/lib/tally";
import type { ClientSummary } from "@/lib/clients";
import { type Portafoglio, dominioDi, isDemo, daSviluppare, attivo, giu, inRitardo, senzaAbbonamento } from "@/lib/portafoglio-shared";
import { Badge, Banner, btnPrimary, btnSecondary, btnGhost, formatDate, EmptyState } from "./ui";
import { AbbonamentoBadge, SitoStato, Skeleton, euro, faMin, ggmm, oraBreve } from "./portafoglio-ui";
import { TallySetup, ImportButton, RetryTally } from "./home";
import { EliminaClienteDialog } from "./elimina-cliente-dialog";

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

const STEP_ORDER = ["intake", "contesto", "palette", "copy", "images", "legale", "build"] as const;
const STEP_LABEL: Record<(typeof STEP_ORDER)[number], string> = {
  intake: "Intake",
  contesto: "Contesto",
  palette: "Palette",
  copy: "Copy",
  images: "Immagini",
  legale: "Legale",
  build: "Build",
};

const deployUrl = (c: ClientSummary): string | null => c.steps.build.deploy?.url ?? null;

type Filtro = "tutti" | "sviluppare" | "attivi" | "giu" | "ritardo";
const FILTRO_LABEL: Record<Exclude<Filtro, "tutti">, string> = {
  sviluppare: "Da sviluppare",
  attivi: "Attivi",
  giu: "Siti down",
  ritardo: "In ritardo",
};
type Ordine = "aggiornati" | "nome" | "importati" | "lead" | "rinnovo";

type Fonte = keyof Portafoglio["fonti"];
const NOME_FONTE: Record<Fonte, string> = { stripe: "Stripe (abbonamenti)", gatus: "Monitor dei siti (Gatus)", lead: "Lead (n8n)" };

// Forma oltre al colore (daltonismo): errore = spigolo vivo, il resto pillola.
const TACCA: Record<string, string> = {
  verificato: "bg-ok rounded-full",
  da_verificare: "bg-warn rounded-full",
  in_corso: "bg-brand rounded-full animate-pulse",
  errore: "bg-err rounded-none",
};

function MiniPipeline({ c }: { c: ClientSummary }) {
  const titolo = STEP_ORDER.map((s) => `${STEP_LABEL[s]}: ${(c.steps[s]?.stato ?? "assente").replace("_", " ")}`).join(
    " · ",
  );
  return (
    <span className="inline-flex items-center gap-1" title={titolo} aria-label={titolo}>
      {STEP_ORDER.map((s) => (
        <span key={s} className={`h-1.5 w-4 ${TACCA[c.steps[s]?.stato ?? ""] ?? "bg-line rounded-full"}`} />
      ))}
    </span>
  );
}

/* ---- KPI card-filtro -------------------------------------------------------- */

/** Card = filtro. `sub` fa il lavoro dell'avviso (chi, o la composizione);
 *  `off` = dato non disponibile (fonte giù o non configurata): niente «0»
 *  rassicurante, filtro spento, fondo piatto senza opacità (l'AA regge). */
function KpiCard({
  icona: Icona,
  label,
  n,
  sub,
  attivo,
  off = false,
  err = false,
  onClick,
}: {
  icona: typeof Users;
  label: string;
  n: React.ReactNode;
  sub?: React.ReactNode;
  attivo: boolean;
  off?: boolean;
  err?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={off ? undefined : onClick}
      aria-pressed={attivo}
      aria-disabled={off || undefined}
      title={off ? "Dato non disponibile: il filtro è spento" : undefined}
      className={`card p-4 text-left transition-colors duration-150 ${off ? "cursor-default bg-raise shadow-none" : "hover:bg-raise"} ${
        attivo ? "!border-brand ring-1 ring-brand" : ""
      }`}
    >
      <span className="flex items-center justify-between text-sm text-muted">
        {label}
        <Icona className="size-4 text-faint" aria-hidden />
      </span>
      <span className={`mt-1 block text-[28px] leading-9 font-bold tabular-nums ${off ? "text-faint" : err ? "text-err" : ""}`}>{n}</span>
      <span className={`mt-0.5 block min-h-[18px] text-xs ${err ? "font-medium text-err" : off ? "text-warn" : "text-muted"}`}>{sub}</span>
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

  // Portafoglio (Stripe, Gatus, lead): caricato lato client con scheletro, così la
  // lista locale è già lì; «Aggiorna»/«Riprova» svuotano la cache del server.
  const [p, setP] = useState<Portafoglio | null>(null);
  const [pErr, setPErr] = useState<string | null>(null);
  const [pBusy, setPBusy] = useState(false);
  async function carica(aggiorna = false) {
    setPBusy(true);
    try {
      const res = await fetch(`/api/portafoglio${aggiorna ? "?aggiorna=1" : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`errore ${res.status}`);
      setP(await res.json());
      setPErr(null);
    } catch (e) {
      setPErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPBusy(false);
    }
  }
  useEffect(() => {
    carica();
  }, []);
  // Esc toglie il filtro (quando nessun dialog è aperto).
  useEffect(() => {
    if (filtro === "tutti" || daEliminare) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltro("tutti");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtro, daEliminare]);

  const caricamento = p === null && pErr === null;
  const fonteOk = (f: Fonte) => p?.fonti[f].stato === "ok";
  const fontiGiu = p ? (Object.keys(NOME_FONTE) as Fonte[]).filter((f) => p.fonti[f].stato === "non_raggiungibile") : [];

  const perQuery = data.clients.filter((c) => match(q, c.businessName, c.referente, c.phone, c.citta));
  const PRED: Record<Exclude<Filtro, "tutti">, (c: ClientSummary) => boolean> = {
    sviluppare: (c) => daSviluppare(c),
    attivi: (c) => attivo(c, p),
    giu: (c) => giu(c, p),
    ritardo: (c) => inRitardo(c, p),
  };
  const conteggi = {
    sviluppare: perQuery.filter(PRED.sviluppare),
    attivi: perQuery.filter(PRED.attivi),
    giu: perQuery.filter(PRED.giu),
    ritardo: perQuery.filter(PRED.ritardo),
  };
  const clients = useMemo(() => {
    const lista = filtro === "tutti" ? perQuery : perQuery.filter(PRED[filtro]);
    const copia = [...lista];
    if (ordine === "nome") copia.sort((a, b) => a.businessName.localeCompare(b.businessName, "it"));
    else if (ordine === "importati") copia.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    else if (ordine === "lead") {
      // Prima i pochi lead (segnale di disdetta); chi non ha un sito in fondo.
      const n = (c: ClientSummary) => (dominioDi(c) ? (p?.lead[c.slug]?.n30 ?? 0) : Infinity);
      copia.sort((a, b) => n(a) - n(b));
    } else if (ordine === "rinnovo") {
      const r = (c: ClientSummary) => p?.abbonamenti[c.slug]?.rinnovo ?? "~";
      copia.sort((a, b) => r(a).localeCompare(r(b)));
    }
    // "aggiornati" è già l'ordine del server
    return copia;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- PRED deriva da p
  }, [perQuery, filtro, ordine, p]);

  // Sottorighe delle card: chi (≤2 nomi) o la composizione. Mai uno «0» a fonte giù.
  const subFonte = (f: Fonte) =>
    p?.fonti[f].stato === "non_raggiungibile"
      ? `non raggiungibile da ${oraBreve(p.fonti[f].da)}`
      : f === "stripe"
        ? "Aggiungi la chiave Stripe in Impostazioni"
        : "Aggiungi la password del monitor in Impostazioni";
  const subSviluppare = () => {
    const lav = conteggi.sviluppare.filter((c) => !isDemo(c)).length;
    const demo = conteggi.sviluppare.length - lav;
    const paganti = conteggi.sviluppare.filter((c) => attivo(c, p)).length; // pagano già: i primi da fare
    if (!conteggi.sviluppare.length) return "nessuno";
    return [`${lav} in lavorazione`, `${demo} demo ${demo === 1 ? "inviata" : "inviate"}`, paganti ? `${paganti} già ${paganti === 1 ? "pagante" : "paganti"}` : ""]
      .filter(Boolean)
      .join(" · ");
  };
  const subAttivi = () => {
    if (!p) return null;
    const dis = conteggi.attivi.filter((c) => p.abbonamenti[c.slug]?.stato === "disdetto").length;
    const senza = perQuery.filter((c) => senzaAbbonamento(c, p)).length;
    return [
      `${euro(p.mrr, p.valuta)} al mese`,
      dis ? `${dis} in disdetta` : "",
      p.nonCollegati.length ? `${p.nonCollegati.length} da collegare` : "",
      senza ? `${senza} online senza abbonamento` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const subGiu = () => {
    const gatus = p?.fonti.gatus;
    if (!p || gatus?.stato !== "ok") return null;
    const l = conteggi.giu;
    if (l.length === 0) return `tutti su · controllo ${faMin(gatus.at)}`;
    if (l.length <= 2) return l.map((c) => `${dominioDi(c)} · da ${faMin(p.siti[c.slug]?.da ?? gatus.at)}`).join(" · ");
    return `${l.length} siti non rispondono`;
  };
  const subRitardo = () => {
    if (!p) return null;
    const l = conteggi.ritardo;
    if (l.length === 0) return "nessun pagamento scaduto";
    if (l.length <= 2) return l.map((c) => `${c.businessName} · ${p.abbonamenti[c.slug]?.giorniRitardo ?? 0} gg`).join(" · ");
    return `${l.length} pagamenti scaduti`;
  };
  const toggle = (f: Exclude<Filtro, "tutti">) => setFiltro(filtro === f ? "tutti" : f);

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

      {/* Stato delle fonti: un banner di pagina, mai flottante. Stripe assente è
          l'unico caso con una primaria in home (il passo da fare). */}
      {pErr ? (
        <Banner
          tone="err"
          title="Portafoglio non caricato"
          actions={
            <button className={btnSecondary} onClick={() => carica(true)} disabled={pBusy}>
              {pBusy ? "Riprovo…" : "Riprova"}
            </button>
          }
        >
          {pErr}
        </Banner>
      ) : p?.fonti.stripe.stato === "non_configurata" ? (
        <Banner
          tone="warn"
          title="Stripe non è ancora configurato"
          actions={
            <Link href="/impostazioni" className={btnPrimary}>
              Aggiungi la chiave →
            </Link>
          }
        >
          Senza la chiave ristretta l&apos;editor non sa chi paga: «Attivi», «In ritardo» ed entrate restano vuoti. Serve una
          volta sola.
        </Banner>
      ) : fontiGiu.length > 0 ? (
        <Banner
          tone="warn"
          title={fontiGiu.length === 1 ? "Una fonte non risponde" : "Alcune fonti non rispondono"}
          actions={
            <button className={btnSecondary} onClick={() => carica(true)} disabled={pBusy}>
              {pBusy ? "Riprovo…" : "Riprova"}
            </button>
          }
        >
          <ul className="space-y-0.5">
            {fontiGiu.map((f) => {
              const s = p!.fonti[f];
              return (
                <li key={f}>
                  {NOME_FONTE[f]} · da {s.stato === "non_raggiungibile" ? oraBreve(s.da) : ""} ·{" "}
                  <span className="mono">{s.stato === "non_raggiungibile" ? s.errore : ""}</span>
                </li>
              );
            })}
          </ul>
        </Banner>
      ) : null}

      {/* KPI = filtri: il numero su cui si agisce, mai decorazione */}
      <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
        <KpiCard
          icona={Hammer}
          label="Da sviluppare"
          n={conteggi.sviluppare.length}
          sub={subSviluppare()}
          attivo={filtro === "sviluppare"}
          onClick={() => toggle("sviluppare")}
        />
        <KpiCard
          icona={Check}
          label="Attivi"
          n={caricamento ? <Skeleton className="h-6 w-10" /> : fonteOk("stripe") ? conteggi.attivi.length : "—"}
          sub={caricamento ? <Skeleton className="w-28" /> : fonteOk("stripe") ? subAttivi() : subFonte("stripe")}
          attivo={filtro === "attivi"}
          off={!caricamento && !fonteOk("stripe")}
          onClick={() => toggle("attivi")}
        />
        <KpiCard
          icona={AlertTriangle}
          label="Siti down"
          n={caricamento ? <Skeleton className="h-6 w-10" /> : fonteOk("gatus") ? conteggi.giu.length : "—"}
          sub={caricamento ? <Skeleton className="w-28" /> : fonteOk("gatus") ? subGiu() : subFonte("gatus")}
          attivo={filtro === "giu"}
          off={!caricamento && !fonteOk("gatus")}
          err={conteggi.giu.length > 0}
          onClick={() => toggle("giu")}
        />
        <KpiCard
          icona={CreditCard}
          label="In ritardo"
          n={caricamento ? <Skeleton className="h-6 w-10" /> : fonteOk("stripe") ? conteggi.ritardo.length : "—"}
          sub={caricamento ? <Skeleton className="w-28" /> : fonteOk("stripe") ? subRitardo() : subFonte("stripe")}
          attivo={filtro === "ritardo"}
          off={!caricamento && !fonteOk("stripe")}
          err={conteggi.ritardo.length > 0}
          onClick={() => toggle("ritardo")}
        />
      </div>

      {/* Entrate: non è un filtro, quindi non è una card KPI. L'ora dell'ultima
          lettura è sempre visibile; «Aggiorna» svuota la cache del server. */}
      {p && p.fonti.stripe.stato === "ok" && (
        <div className="card flex flex-wrap items-baseline gap-x-5 gap-y-1 px-4 py-3">
          <span className="text-sm text-muted">Entrate ricorrenti</span>
          <span className="text-lg font-bold tabular-nums">
            {euro(p.mrr, p.valuta)} <span className="text-sm font-medium text-muted">al mese</span>
          </span>
          <span className="text-sm text-muted">
            {p.nAbbonamenti} {p.nAbbonamenti === 1 ? "abbonamento collegato" : "abbonamenti collegati"}
          </span>
          {p.incassato && (
            <>
              <span className="ml-1 text-sm text-muted">Incassato {p.incassato.anno}</span>
              <span className="font-semibold tabular-nums">{euro(p.incassato.lordo, p.valuta)}</span>
              {p.incassato.netto === null ? (
                <span className="text-sm text-warn" title={p.incassato.erroreNetto}>
                  netto — (alla chiave Stripe manca il permesso «Balance read»)
                </span>
              ) : (
                <span className="text-sm text-muted">netto {euro(p.incassato.netto, p.valuta)}</span>
              )}
            </>
          )}
          <span className="ml-auto flex items-center gap-2 text-xs text-muted">
            Stripe · <span className="mono">{faMin(p.fonti.stripe.at)}</span>
            <button className={btnGhost} onClick={() => carica(true)} disabled={pBusy}>
              {pBusy ? "Aggiorno…" : "Aggiorna"}
            </button>
          </span>
        </div>
      )}

      {p && p.nonCollegati.length > 0 && (
        <Banner
          tone="warn"
          title={
            p.nonCollegati.length === 1
              ? "1 abbonamento Stripe da collegare a un cliente"
              : `${p.nonCollegati.length} abbonamenti Stripe da collegare a un cliente`
          }
          actions={
            <Link href="/impostazioni#stripe" className={btnSecondary}>
              Collega in Impostazioni →
            </Link>
          }
        >
          {p.nonCollegati.map((n) => `«${n.nome}»${n.email ? ` (${n.email})` : ""} · ${euro(n.importoMese, n.valuta)} al mese`).join(" · ")}. Finché
          non sono collegati non entrano nelle cifre né nei report.
        </Banner>
      )}

      {/* Clienti importati */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
            {filtro === "tutti" ? (
              <>Importati {q && `· ${clients.length}/${data.clients.length}`}</>
            ) : (
              <>
                {FILTRO_LABEL[filtro]} · {clients.length} di {perQuery.length}
                <button className={btnGhost} onClick={() => setFiltro("tutti")}>
                  Mostra tutti ×
                </button>
              </>
            )}
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
              <option value="lead">Lead 30 gg, prima i pochi</option>
              <option value="rinnovo">Rinnovo più vicino</option>
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
              const dominio = dominioDi(c);
              const demo = isDemo(c);
              const abb = p?.abbonamenti[c.slug];
              const sito = p?.siti[c.slug];
              const lead = p?.lead[c.slug]?.n30 ?? 0;
              // Riga intera cliccabile via router (comodità del puntatore); il NOME è il
              // vero Link (tastiera, screen reader, cmd-click). Il dominio è un <a> a
              // parte: mai un <a> dentro un Link (annidati, rompono il DOM).
              return (
                <li
                  key={c.slug}
                  className="flex cursor-pointer items-center gap-2 pr-2 transition-colors duration-150 hover:bg-raise"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a, button, summary")) return;
                    router.push(`/clienti/${c.slug}`);
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <Link href={`/clienti/${c.slug}`} className="truncate font-medium">
                          {c.businessName}
                        </Link>
                        {nomiDoppi.has(c.businessName) && <span className="mono text-xs text-faint">{c.slug}</span>}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-muted">
                        {c.citta}
                        {" · "}
                        {dominio ? (
                          <a
                            href={`https://${dominio}`}
                            target="_blank"
                            rel="noreferrer"
                            className="border-b border-line2 transition-colors duration-150 hover:border-ink hover:text-ink"
                          >
                            {dominio} ↗
                          </a>
                        ) : demo ? (
                          "anteprima su workers.dev"
                        ) : (
                          "senza sito"
                        )}
                        {c.referente && ` · ${c.referente}`}
                        {c.flagsCount > 0 && <span className="text-warn"> · {c.flagsCount} flag</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="flex w-40 items-baseline gap-1.5 text-xs text-muted">
                        {abb ? (
                          <AbbonamentoBadge a={abb} /> /* paga già, anche senza sito: si vede */
                        ) : !dominio ? (
                          demo ? (
                            <>
                              <Badge tone="idle">Demo inviata</Badge>
                              {c.steps.build.deploy?.deployedAt && <span>il {ggmm(c.steps.build.deploy.deployedAt)}</span>}
                            </>
                          ) : (
                            <Badge tone="idle">In lavorazione</Badge>
                          )
                        ) : caricamento ? (
                          <Skeleton className="w-24" />
                        ) : !fonteOk("stripe") ? (
                          <span className="text-faint" title="Stripe non disponibile">
                            —
                          </span>
                        ) : abb ? (
                          <AbbonamentoBadge a={abb} />
                        ) : (
                          <Link href="/impostazioni#stripe" title="Sito online senza un abbonamento collegato">
                            <Badge tone="warn">Senza abbonamento</Badge>
                          </Link>
                        )}
                      </span>
                      <span className="w-28 text-sm">
                        {!dominio ? (
                          demo && <span className="text-faint">anteprima</span>
                        ) : caricamento ? (
                          <Skeleton className="w-16" />
                        ) : !fonteOk("gatus") ? (
                          <span className="text-faint" title="Monitor non disponibile">
                            —
                          </span>
                        ) : sito ? (
                          <SitoStato s={sito} />
                        ) : (
                          <span className="text-faint" title="Il monitor non ha ancora questo sito">
                            non nel monitor
                          </span>
                        )}
                      </span>
                      <span className={`w-16 text-right text-sm ${lead === 0 && dominio && fonteOk("lead") ? "text-warn" : "text-muted"}`}>
                        {!dominio ? null : caricamento ? (
                          <Skeleton className="w-10" />
                        ) : !fonteOk("lead") ? (
                          <span className="text-faint" title="Lead non disponibili">
                            —
                          </span>
                        ) : (
                          <>
                            <b className={lead === 0 ? "" : "text-ink"}>{lead}</b> lead
                          </>
                        )}
                      </span>
                      <MiniPipeline c={c} />
                    </div>
                  </div>
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

      {/* Eliminazione forte condivisa (decisione Mattia: diretta, niente archivio) */}
      <EliminaClienteDialog
        open={daEliminare !== null}
        slug={daEliminare?.slug ?? ""}
        businessName={daEliminare?.businessName ?? ""}
        haSitoOnline={!!(daEliminare && deployUrl(daEliminare))}
        onClose={() => setDaEliminare(null)}
        onDeleted={() => {
          const slug = daEliminare?.slug;
          setDaEliminare(null);
          if (slug) setData((d) => ({ ...d, clients: d.clients.filter((c) => c.slug !== slug) }));
          router.refresh();
        }}
      />
    </div>
  );
}
