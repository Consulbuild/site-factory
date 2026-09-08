"use client";

// Card «Catena» dell'hub (DESIGN-BRIEF.md §Modalità demo): dove sta la demo e
// l'unica cosa che tocca all'operatore. Tre righe — titolo + stato, una frase
// di fatto (fase live dal bus, tempo mono, mai %), azioni — con UNA primaria
// quando la card possiede il gate della pagina. Mentre la catena corre la card
// si ricarica da sola (router.refresh ogni 10 s: lo stato vive in client.json).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LinkIcon, MessageCircle } from "lucide-react";
import type { ClientState } from "@/lib/schemas";
import { formatElapsed, nomeStep } from "@/lib/agenti";
import { Badge, btnPrimary, btnSecondary, btnGhost, btnDanger } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useRuns } from "./run-provider";
import { ggmm } from "./portafoglio-ui";

type Catena = NonNullable<ClientState["catena"]>;
type Demo = NonNullable<ClientState["demo"]>;

const SCHEDA: Record<string, string> = {
  contesto: "contesto",
  palette: "palette",
  copy: "copy",
  images: "immagini",
  lavori: "immagini",
  legale: "legale",
  build: "build",
  deploy: "build",
};
const NOME_PASSO: Record<string, string> = {
  intake: "Intake",
  contesto: "Contesto",
  palette: "Palette",
  logo: "Logo",
  copy: "Copy",
  lavori: "Foto dei lavori",
  images: "Immagini",
  legale: "Legale",
  build: "Build",
  deploy: "Pubblicazione",
};

const GIORNO_MS = 86_400_000;
const giorniA = (iso: string) => Math.ceil((Date.parse(iso) - Date.now()) / GIORNO_MS);

/** Numero WhatsApp in formato internazionale senza «+» (cellulari italiani senza prefisso → 39). */
function numeroWa(telefono: string): string | null {
  const d = telefono.replace(/\D/g, "").replace(/^00/, "");
  if (!d) return null;
  return /^3\d{8,9}$/.test(d) ? `39${d}` : d;
}

export function CatenaCard({
  slug,
  azienda,
  referente,
  telefono,
  percorso,
  catena,
  demo,
  build,
  viva,
  posizione,
  hostPrevisto,
  primaria,
}: {
  slug: string;
  azienda: string;
  referente?: string;
  telefono?: string;
  percorso: ClientState["percorso"];
  catena?: Catena;
  demo?: Demo;
  build: { stato: string; partial?: boolean; noindex?: boolean; builtAt?: string; dominio?: string; deployUrl?: string };
  /** La catena è viva nel processo (coda o in corso). */
  viva: boolean;
  posizione: number;
  hostPrevisto: string;
  /** true = la card possiede l'unica azione primaria della pagina. */
  primaria: boolean;
}) {
  const router = useRouter();
  const { vivi } = useRuns();
  const run = vivi.find((r) => r.kind === "cliente" && r.slug === slug);
  const [busy, setBusy] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"pubblica" | "spegni" | "abbonato" | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [, setTick] = useState(0);

  const inCorso = !!catena && (catena.stato === "in_coda" || catena.stato === "in_corso" || catena.stato === "attesa_limite");
  useEffect(() => {
    if (!inCorso) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [inCorso, router]);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [run]);

  async function chiama(url: string, method: "POST" | "DELETE", body?: Record<string, unknown>, chiave = "x"): Promise<boolean> {
    setBusy(chiave);
    setErrore(null);
    const res = await fetch(url, {
      method,
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setErrore(String(data.error ?? `errore ${res.status}`));
      return false;
    }
    router.refresh();
    return true;
  }
  const avvia = () => chiama(`/api/clients/${slug}/catena`, "POST", undefined, "avvia");
  const ferma = () => chiama(`/api/clients/${slug}/catena`, "DELETE", undefined, "ferma");
  const demoAzione = (action: string) => chiama(`/api/clients/${slug}/demo`, "POST", { action }, action);
  async function anteprima() {
    setErrore(null);
    const res = await fetch(`/api/clients/${slug}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setErrore(String(data.error ?? `errore ${res.status}`));
    else if (data.url) window.open(String(data.url), "_blank");
  }

  const demoAccesa = !!demo && !demo.spentaAt;
  const buildPronta = build.stato === "verificato" && !build.partial && !!build.noindex;
  const nuovaBuild = demoAccesa && !!build.builtAt && build.builtAt > demo!.pubblicataAt;
  const interrotta = !!catena && inCorso && !viva;
  const pri = (attiva: boolean) => (attiva && primaria ? btnPrimary : btnSecondary);
  const wa = telefono ? numeroWa(telefono) : null;
  const testoWa =
    demoAccesa && `Buongiorno${referente ? ` ${referente}` : ""}, come promesso ecco la demo del nuovo sito di ${azienda}: ${demo!.url} — resta online per 15 giorni. Se le piace, la attiviamo insieme: mi dica quando possiamo sentirci. Mattia · ConsulBuild`;

  const titolo = percorso === "demo" ? "Demo" : "Completamento";

  // Badge di stato della card (una parola, mai una %).
  let badge: React.ReactNode = null;
  if (interrotta) badge = <Badge tone="err">interrotta</Badge>;
  else if (catena?.stato === "in_coda") badge = <Badge tone="idle">in coda</Badge>;
  else if (catena?.stato === "in_corso") badge = <Badge tone="brand">in corso</Badge>;
  else if (catena?.stato === "attesa_limite") badge = <Badge tone="warn">in attesa</Badge>;
  else if (catena?.stato === "ferma") badge = <Badge tone="err">ferma</Badge>;
  else if (demoAccesa) badge = <Badge tone="ok">demo online</Badge>;
  else if (demo?.spentaAt) badge = <Badge tone="idle">demo spenta</Badge>;
  else if (catena?.stato === "demo_pronta" && buildPronta) badge = <Badge tone="warn">da controllare</Badge>;
  else if (catena?.stato === "completata") badge = <Badge tone="ok">sito online</Badge>;

  return (
    <section className="card mt-6 px-4 py-3.5" aria-label={`Catena automatica: ${titolo}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">{titolo}</h2>
        {badge}
        <span className="mono ml-auto text-xs text-faint">{hostPrevisto}</span>
      </div>

      {/* Una frase di fatto */}
      <p className="mt-1.5 text-sm text-muted">
        {interrotta ? (
          "Interrotta dal riavvio dell'editor: riprendi da dove si era fermata."
        ) : catena?.stato === "in_coda" ? (
          <>In coda · posizione {posizione || "—"} · massimo due catene per volta.</>
        ) : catena?.stato === "in_corso" ? (
          <>
            Passo: <b className="text-ink">{NOME_PASSO[catena.passo ?? ""] ?? catena.passo}</b>
            {run && (
              <>
                {" · "}
                <span className="text-brand">{run.fase ?? `${nomeStep(run)}: avvio…`}</span>
                {" · "}
                <span className="mono" aria-hidden>
                  {formatElapsed(Date.now() - run.startedAt)}
                </span>
              </>
            )}
          </>
        ) : catena?.stato === "attesa_limite" ? (
          <>
            Limite di utilizzo del piano raggiunto su <b className="text-ink">{NOME_PASSO[catena.passo ?? ""] ?? catena.passo}</b>
            {catena.riprovaAlle && (
              <>
                {" · "}riprova alle <span className="mono">{new Date(catena.riprovaAlle).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
              </>
            )}
          </>
        ) : catena?.stato === "ferma" ? (
          <span className="text-err">
            Ferma a <b>{NOME_PASSO[catena.passo ?? ""] ?? catena.passo}</b>
            {catena.errore ? `: ${catena.errore}` : ""}
          </span>
        ) : demoAccesa ? (
          <>
            <a href={demo!.url} target="_blank" rel="noreferrer" className="mono text-brand hover:underline">
              {demo!.host}
            </a>
            {" · "}pubblicata il {ggmm(demo!.pubblicataAt)}
            {" · "}
            {demo!.congelata ? (
              <span>scadenza congelata (abbonato)</span>
            ) : (
              <span className={giorniA(demo!.scadenza) <= 3 ? "font-medium text-warn" : ""}>
                scade il {ggmm(demo!.scadenza)} ({Math.max(0, giorniA(demo!.scadenza))} {giorniA(demo!.scadenza) === 1 ? "giorno" : "giorni"})
              </span>
            )}
            {nuovaBuild && <span className="text-warn"> · c&apos;è una build più recente non pubblicata</span>}
            {demo!.errore && <span className="text-err"> · {demo!.errore}</span>}
          </>
        ) : demo?.spentaAt ? (
          <>Demo spenta il {ggmm(demo.spentaAt)}. Riaccenderla ripubblica l&apos;ultima build confermata.</>
        ) : catena?.stato === "demo_pronta" && buildPronta ? (
          "Demo costruita: guardala come la vedrebbe il titolare, desktop e telefono, poi pubblicala."
        ) : catena?.stato === "completata" ? (
          <>
            Sito online
            {build.deployUrl && (
              <>
                {" · "}
                <a href={build.deployUrl} target="_blank" rel="noreferrer" className="mono text-brand hover:underline">
                  {build.deployUrl}
                </a>
              </>
            )}
          </>
        ) : percorso === "demo" ? (
          "Contesto → palette → logo → copy → immagini → build, senza fermarsi. Di solito 60–90 minuti."
        ) : (
          "Esegue da sola gli step mancanti (legale compreso) fino alla build; col dominio anche la pubblicazione."
        )}
      </p>

      {errore && <p className="mt-2 text-sm text-err whitespace-pre-wrap">{errore}</p>}

      {/* Azioni */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {interrotta || catena?.stato === "ferma" ? (
          <>
            <button className={pri(true)} disabled={busy !== null} onClick={avvia}>
              {busy === "avvia" ? "Riprendo…" : "Riprendi"}
            </button>
            {catena?.passo && SCHEDA[catena.passo] && (
              <Link href={`/clienti/${slug}/${SCHEDA[catena.passo]}`} className={btnSecondary}>
                Apri {NOME_PASSO[catena.passo] ?? catena.passo} →
              </Link>
            )}
          </>
        ) : catena?.stato === "in_coda" ? (
          <button className={btnGhost} disabled={busy !== null} onClick={ferma}>
            Togli dalla coda
          </button>
        ) : catena?.stato === "in_corso" || catena?.stato === "attesa_limite" ? (
          <button className={btnDanger} disabled={busy !== null} onClick={ferma}>
            {busy === "ferma" ? "Fermo…" : "Ferma"}
          </button>
        ) : demoAccesa ? (
          <>
            {nuovaBuild && (
              <button className={pri(true)} disabled={busy !== null} onClick={() => setDialog("pubblica")}>
                Ripubblica demo
              </button>
            )}
            <button
              className={btnSecondary}
              onClick={() => {
                navigator.clipboard.writeText(demo!.url);
                setCopiato(true);
                setTimeout(() => setCopiato(false), 1200);
              }}
            >
              <LinkIcon className="size-3.5" aria-hidden /> {copiato ? "Copiato ✓" : "Copia link"}
            </button>
            {wa && testoWa && (
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(testoWa)}`} target="_blank" rel="noreferrer" className={btnSecondary}>
                <MessageCircle className="size-3.5" aria-hidden /> Invia su WhatsApp
              </a>
            )}
            <button className={btnSecondary} disabled={busy !== null} onClick={() => setDialog("abbonato")}>
              Il cliente si è abbonato
            </button>
            {!demo!.congelata && (
              <button className={btnGhost} disabled={busy !== null} onClick={() => demoAzione("proroga")}>
                {busy === "proroga" ? "Prorogo…" : "Proroga +15 gg"}
              </button>
            )}
            <button className={`${btnDanger} ml-auto`} disabled={busy !== null} onClick={() => setDialog("spegni")}>
              Spegni demo
            </button>
          </>
        ) : demo?.spentaAt ? (
          <>
            <button className={pri(buildPronta)} disabled={busy !== null || !buildPronta} onClick={() => setDialog("pubblica")}>
              Riaccendi demo
            </button>
            <button className={btnSecondary} disabled={busy !== null} onClick={() => setDialog("abbonato")}>
              Il cliente si è abbonato
            </button>
          </>
        ) : catena?.stato === "demo_pronta" && buildPronta ? (
          <>
            <button className={pri(true)} disabled={busy !== null} onClick={() => setDialog("pubblica")}>
              Pubblica demo
            </button>
            <button className={btnSecondary} onClick={anteprima}>
              <ExternalLink className="size-3.5" aria-hidden /> Apri anteprima
            </button>
            <button className={btnGhost} disabled={busy !== null} onClick={() => setDialog("abbonato")}>
              Il cliente si è abbonato
            </button>
          </>
        ) : catena?.stato === "completata" ? null : (
          <button className={pri(percorso === "demo")} disabled={busy !== null} onClick={avvia}>
            {busy === "avvia" ? "Avvio…" : percorso === "demo" ? "Avvia demo" : "Esegui in automatico gli step mancanti"}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={dialog === "pubblica"}
        title={demoAccesa ? "Ripubblicare la demo?" : "Pubblicare la demo?"}
        message={
          <>
            La build confermata va online su <span className="mono">{demoAccesa ? demo!.host : hostPrevisto}</span>: modulo
            simulato, nessuna statistica, fuori dai motori di ricerca.{" "}
            {demoAccesa ? "La scadenza non cambia." : "Resta online 15 giorni, poi si spegne da sola."} Al primo avvio il
            certificato può richiedere qualche minuto.
          </>
        }
        confirmLabel={busy === "pubblica" ? "Pubblico…" : demoAccesa ? "Ripubblica" : "Pubblica"}
        confirmDisabled={busy !== null}
        onConfirm={async () => {
          if (await demoAzione("pubblica")) setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "spegni"}
        title="Spegnere la demo?"
        message={
          <>
            <span className="mono">{demo?.host}</span> smette di rispondere. Solo il worker della demo viene cancellato: la
            build resta e la puoi riaccendere.
          </>
        }
        confirmLabel={busy === "spegni" ? "Spengo…" : "Spegni"}
        tone="danger"
        confirmDisabled={busy !== null}
        onConfirm={async () => {
          if (await demoAzione("spegni")) setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "abbonato"}
        title="Il cliente si è abbonato?"
        message={
          <>
            Il cliente passa al percorso completo: la demo non scade più e la catena riparte da sola con i documenti
            legali. Quando avrai comprato il dominio, inseriscilo nella scheda Build e la catena pubblicherà il sito.
          </>
        }
        confirmLabel={busy === "abbonato" ? "Confermo…" : "Sì, si è abbonato"}
        confirmDisabled={busy !== null}
        onConfirm={async () => {
          if (await demoAzione("abbonato")) setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </section>
  );
}
