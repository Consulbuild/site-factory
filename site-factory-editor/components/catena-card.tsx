"use client";

// Card «Catena» dell'hub: dove sta la catena automatica e quello che tocca
// all'operatore su di essa (Avvia / Riprendi / Ferma / Togli dalla coda).
// Dal 2026-09-14 TUTTE le azioni di pubblicazione (demo e sito reale) vivono
// nella scheda «Build & Pubblica»: qui solo lo stato — badge, una frase di
// fatto (fase live dal bus, tempo mono, mai %) — e il link alla scheda.
// Mentre la catena corre la card si ricarica da sola (router.refresh ogni 10 s).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientState } from "@/lib/schemas";
import { formatElapsed, nomeStep } from "@/lib/agenti";
import { Badge, btnPrimary, btnSecondary, btnGhost, btnDanger } from "./ui";
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

export function CatenaCard({
  slug,
  percorso,
  catena,
  demo,
  demoScaduta,
  build,
  viva,
  posizione,
  hostPrevisto,
  primaria,
}: {
  slug: string;
  percorso: ClientState["percorso"];
  catena?: Catena;
  demo?: Demo;
  /** Demo accesa oltre la scadenza (lib/portafoglio-shared.ts). */
  demoScaduta: boolean;
  build: { stato: string; partial?: boolean; noindex?: boolean; builtAt?: string; deployUrl?: string };
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

  async function chiama(method: "POST" | "DELETE", chiave: string): Promise<void> {
    setBusy(chiave);
    setErrore(null);
    const res = await fetch(`/api/clients/${slug}/catena`, { method });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setErrore(String(data.error ?? `errore ${res.status}`));
      return;
    }
    router.refresh();
  }
  const avvia = () => chiama("POST", "avvia");
  const ferma = () => chiama("DELETE", "ferma");

  const demoAccesa = !!demo && !demo.spentaAt;
  const buildPronta = build.stato === "verificato" && !build.partial && !!build.noindex;
  const nuovaBuild = demoAccesa && !!build.builtAt && build.builtAt > demo!.pubblicataAt;
  const interrotta = !!catena && inCorso && !viva;
  const pri = (attiva: boolean) => (attiva && primaria ? btnPrimary : btnSecondary);
  const titolo = percorso === "demo" ? "Demo" : "Completamento";
  // La scheda Build & Pubblica è il passo successivo quando la catena ha
  // consegnato qualcosa da pubblicare o gestire.
  const schedaPrimaria = !inCorso && !interrotta && catena?.stato !== "ferma" && (catena?.stato === "demo_pronta" || catena?.stato === "completata" || !!demo);

  // Badge di stato della card (una parola, mai una %).
  let badge: React.ReactNode = null;
  if (interrotta) badge = <Badge tone="err">interrotta</Badge>;
  else if (catena?.stato === "in_coda") badge = <Badge tone="idle">in coda</Badge>;
  else if (catena?.stato === "in_corso") badge = <Badge tone="brand">in corso</Badge>;
  else if (catena?.stato === "attesa_limite") badge = <Badge tone="warn">in attesa</Badge>;
  else if (catena?.stato === "ferma") badge = <Badge tone="err">ferma</Badge>;
  else if (demoScaduta) badge = <Badge tone="err">demo scaduta</Badge>;
  else if (demoAccesa) badge = <Badge tone="ok">demo online</Badge>;
  else if (demo?.spentaAt) badge = <Badge tone="idle">demo spenta</Badge>;
  else if (catena?.stato === "demo_pronta" && buildPronta) badge = <Badge tone="warn">da pubblicare</Badge>;
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
                {" · "}riprova alle{" "}
                <span className="mono">{new Date(catena.riprovaAlle).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
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
            ) : demoScaduta ? (
              <span className="font-medium text-err">scaduta il {ggmm(demo!.scadenza)}: si spegne al prossimo giro</span>
            ) : (
              <span className={giorniA(demo!.scadenza) <= 3 ? "font-medium text-warn" : ""}>
                scade il {ggmm(demo!.scadenza)} ({Math.max(0, giorniA(demo!.scadenza))} {giorniA(demo!.scadenza) === 1 ? "giorno" : "giorni"})
              </span>
            )}
            {nuovaBuild && <span className="text-warn"> · c&apos;è una build più recente non pubblicata</span>}
            {demo!.errore && <span className="text-err"> · spegnimento non riuscito</span>}
          </>
        ) : demo?.spentaAt ? (
          <>Demo spenta il {ggmm(demo.spentaAt)}. Dalla scheda Build &amp; Pubblica la riaccendi con l&apos;ultima build confermata.</>
        ) : catena?.stato === "demo_pronta" && buildPronta ? (
          "Demo costruita: guardala come la vedrebbe il titolare, desktop e telefono, poi pubblicala dalla scheda Build & Pubblica."
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

      {/* Azioni: solo quelle sulla catena, più il link alla scheda */}
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
        ) : schedaPrimaria ? (
          <Link href={`/clienti/${slug}/build`} className={pri(true)}>
            Apri Build &amp; Pubblica →
          </Link>
        ) : (
          <>
            <button className={pri(percorso === "demo")} disabled={busy !== null} onClick={avvia}>
              {busy === "avvia" ? "Avvio…" : percorso === "demo" ? "Avvia demo" : "Esegui in automatico gli step mancanti"}
            </button>
            {build.stato !== "assente" && (
              <Link href={`/clienti/${slug}/build`} className={btnGhost}>
                Apri Build &amp; Pubblica →
              </Link>
            )}
          </>
        )}
      </div>
    </section>
  );
}
