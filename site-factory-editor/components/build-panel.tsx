"use client";

// Scheda «Build & Pubblica» (piano 2026-09-14): UNA scheda per tutta la
// pubblicazione, demo e sito reale. Tre momenti in sequenza reale
// (1·Build → 2·Revisione → 3·Pubblicazione, il terzo diverso per percorso),
// UNA azione primaria che vive SOLO nella action bar fissa, e a sinistra della
// bar il motivo — scritto, mai in un tooltip — per cui si è pronti o bloccati.
// Le sezioni rendono le altre azioni (secondary/ghost/danger) e omettono la
// primaria. Con un run vivo per il cliente tutto è disabilitato.
// La build è deterministica (io.script): il RunLog mostra assemble/validate/astro.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LinkIcon, MessageCircle } from "lucide-react";
import type { ClientState } from "@/lib/schemas";
import { motivoRebuildFondamenta } from "@/lib/traffico";
import { formatElapsed, nomeStep } from "@/lib/agenti";
import { Badge, Banner, StepBadge, btnPrimary, btnSecondary, btnGhost, btnDanger } from "./ui";
import { useStepRun, RunLog } from "./use-step-run";
import { useRuns } from "./run-provider";
import { BackBar } from "./back-bar";
import { ConfirmDialog } from "./confirm-dialog";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { ggmm } from "./portafoglio-ui";
import { PubblicazioneDemo, dtBreve, giorniA, numeroWa, testoWa } from "./pubblicazione-demo";
import { PubblicazioneSito } from "./pubblicazione-sito";

type BuildState = ClientState["steps"]["build"];
type Demo = NonNullable<ClientState["demo"]>;
type Catena = NonNullable<ClientState["catena"]>;

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

/** Un'azione della scheda: la primaria va nella bar, le altre nella sezione. */
type Azione = {
  key: string;
  label: string;
  tone: "secondary" | "ghost" | "danger";
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
};
const CLASSE: Record<Azione["tone"], string> = { secondary: btnSecondary, ghost: btnGhost, danger: btnDanger };

function Bottone({ a, bloccata }: { a: Azione; bloccata: boolean }) {
  const disabled = bloccata || !!a.disabled;
  if (a.href && !disabled) {
    return (
      <a href={a.href} target="_blank" rel="noreferrer" className={CLASSE[a.tone]}>
        {a.icon} {a.label}
      </a>
    );
  }
  return (
    <button type="button" className={CLASSE[a.tone]} onClick={a.onClick} disabled={disabled}>
      {a.icon} {a.label}
    </button>
  );
}

export function BuildPanel({
  slug,
  businessName,
  referente,
  telefono,
  build,
  fondamentaAttese,
  percorso,
  demo,
  catena,
  catenaViva,
  demoScaduta,
  hostPrevisto,
  anteprimaAttiva,
  imagesOk,
  staleFiles,
  cfTokenOk,
  cfAccountOk,
  vpsKeysOk,
  umamiHost,
}: {
  slug: string;
  businessName: string;
  referente?: string;
  telefono?: string;
  build: BuildState;
  /** Dominio per cui la build deve avere le fondamenta SEO (fondamentaAttese, calcolata nella pagina server), o null. */
  fondamentaAttese: string | null;
  percorso: ClientState["percorso"];
  demo?: Demo;
  catena?: Catena;
  /** La catena è viva nel processo (coda o in corso). */
  catenaViva: boolean;
  /** Demo accesa oltre la scadenza (predicato del sweep, lib/portafoglio-shared.ts). */
  demoScaduta: boolean;
  hostPrevisto: string;
  /** Slug del cliente servito ora su :4399 (null = nessuno). */
  anteprimaAttiva: string | null;
  imagesOk: boolean;
  staleFiles: string[];
  cfTokenOk: boolean;
  cfAccountOk: boolean;
  /** Chiavi del VPS presenti (Umami, registro n8n): senza, la build col dominio si ferma. */
  vpsKeysOk: { umami: boolean; n8n: boolean };
  umamiHost: string;
}) {
  const router = useRouter();
  const runner = useStepRun(slug, "build");
  const { vivi } = useRuns();
  const runVivo = vivi.find((r) => r.kind === "cliente" && r.slug === slug);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!runVivo) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [runVivo]);

  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const [dominio, setDominio] = useState(build.dominio ?? "");
  const [dominioMsg, setDominioMsg] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"pubblica" | "demo" | "spegni" | "abbonato" | "proroga" | "parziale" | null>(null);
  // Guardia sull'unico campo editabile della scheda: il dominio non salvato.
  const dominioDirty = dominio !== (build.dominio ?? "");
  const { navigate, dialog: guardia } = useUnsavedGuard(dominioDirty);

  /* ---------------- stato derivato ---------------- */
  const isDemo = percorso === "demo";
  const completa = build.stato !== "assente" && !build.partial;
  const daConfermare = build.stato === "da_verificare" && completa;
  const verificata = build.stato === "verificato" && completa;
  const catenaAttiva = !!catena && ["in_coda", "in_corso", "attesa_limite"].includes(catena.stato) && catenaViva;
  const inCorso = runner.running || !!runVivo || catenaAttiva;

  const demoAccesa = !!demo && !demo.spentaAt;
  const demoSpenta = !!demo?.spentaAt;
  const nuovaBuildDemo = demoAccesa && !!build.builtAt && build.builtAt > demo!.pubblicataAt;
  const giorniDemo = demoAccesa ? giorniA(demo!.scadenza) : 0;
  const inScadenza = demoAccesa && !demo!.congelata && !demoScaduta && giorniDemo <= 3;
  const dominioLegacy = isDemo && build.dominio ? build.dominio : undefined;

  const buildNonPubblicata = !!build.deploy && !!build.builtAt && build.builtAt > build.deploy.deployedAt;
  const vpsOk = vpsKeysOk.umami && vpsKeysOk.n8n;

  // Perché l'ultima build non è pubblicabile così com'è: specchio degli
  // interlock di deployClient/deployDemo (noindex vs percorso, SITE_URL,
  // integrazioni e fondamenta SEO cotte alla build) — così la primaria torna su «Builda».
  const rebuildMotivi: string[] = [];
  if (completa && !!build.noindex !== isDemo) {
    rebuildMotivi.push(build.noindex ? "build demo (noindex): il cliente è abbonato, serve il sito reale" : "build reale: il cliente è in percorso demo, serve la build noindex");
  }
  if (completa && !isDemo && build.siteUrl !== (build.dominio ? `https://${build.dominio}` : undefined)) {
    rebuildMotivi.push(
      build.dominio
        ? `build prodotta ${build.siteUrl ? `con ${build.siteUrl}` : "senza dominio"}: canonical e og: devono puntare a https://${build.dominio}`
        : `build prodotta col dominio ${build.siteUrl} ora rimosso`,
    );
  }
  if (completa && !isDemo && (build.dominio ? !build.integrazioni || build.integrazioni.umamiWebsiteId !== build.umamiWebsiteId : !!build.integrazioni)) {
    rebuildMotivi.push(build.dominio ? "integrazioni del dominio (Umami, modulo reale) assenti o di un altro sito Umami" : "integrazioni del dominio rimosso ancora nell'HTML");
  }
  const motivoFondamenta = completa ? motivoRebuildFondamenta(percorso, build, fondamentaAttese) : null;
  if (motivoFondamenta) rebuildMotivi.push(motivoFondamenta);
  // Avvisi delle fondamenta cotte, solo se sono quelle attese: da rifare, la prossima build li riscrive (o le toglie).
  const avvisiFondamenta = motivoFondamenta ? [] : (build.fondamenta?.avvisi ?? []);
  const rebuild = rebuildMotivi.length > 0;
  const buildBloccataVps = !isDemo && !!build.dominio && !vpsOk;

  /* ---------------- chiamate ---------------- */
  async function post(url: string, body?: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setErrore(null);
    const res = await fetch(url, {
      method: "POST",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    setBusy(false);
    if (!res.ok) {
      setErrore(String(data.error ?? `errore ${res.status}`));
      return null;
    }
    return data;
  }
  const azioneBuild = (body: Record<string, string>) => post(`/api/clients/${slug}/build`, body);

  async function apriAnteprima() {
    const data = await azioneBuild({ action: "preview" });
    if (data?.url) {
      window.open(String(data.url), "_blank");
      router.refresh();
    }
  }
  async function conferma() {
    if (await azioneBuild({ action: "confirm" })) router.refresh();
  }
  async function salvaDominio(valore = dominio) {
    setDominioMsg(null);
    const data = await azioneBuild({ action: "domain", dominio: valore });
    if (data) {
      setDominio(valore);
      setDominioMsg(valore ? "Dominio salvato: sarà usato alla prossima build e pubblicazione." : "Dominio rimosso.");
      router.refresh(); // riallinea build.dominio (spegne la guardia unsaved)
    }
  }
  async function pubblicaSito() {
    const data = await post(`/api/clients/${slug}/deploy`);
    if (data) router.refresh();
  }
  async function demoAzione(action: "pubblica" | "spegni" | "abbonato" | "proroga"): Promise<boolean> {
    setEsito(null);
    const data = await post(`/api/clients/${slug}/demo`, { action });
    if (!data) return false;
    if (action === "proroga" && typeof data.scadenza === "string") setEsito(`Prorogata fino al ${ggmm(data.scadenza)}.`);
    if (action === "spegni") setEsito("Demo spenta.");
    if (action === "pubblica") setEsito(demoAccesa ? "Demo ripubblicata." : "Demo online.");
    router.refresh();
    return true;
  }
  function copiaLink(url: string) {
    void navigator.clipboard.writeText(url);
    setEsito("Link copiato.");
  }
  const lanciaBuild = () => runner.run("generate", "Build completa: media → assemble → validate → astro build…");
  const lanciaParziale = () => runner.run("partial", "Build parziale: gli artifact mancanti restano ai segnaposto del blueprint…");

  /* ---------------- azioni per stato ---------------- */
  const wa = telefono ? numeroWa(telefono) : null;
  const A = {
    builda: { key: "builda", label: "Builda il sito", tone: "secondary", onClick: lanciaBuild, disabled: !imagesOk || buildBloccataVps || !!dominioLegacy } as Azione,
    parziale: {
      key: "parziale",
      label: "Anteprima parziale",
      tone: "ghost",
      onClick: () => (verificata || build.deploy || demoAccesa ? setDialog("parziale") : lanciaParziale()),
    } as Azione,
    anteprima: { key: "anteprima", label: "Apri anteprima", tone: "secondary", onClick: apriAnteprima, icon: <ExternalLink className="size-3.5" aria-hidden /> } as Azione,
    conferma: { key: "conferma", label: "Conferma build", tone: "secondary", onClick: conferma, disabled: !daConfermare } as Azione,
    pubblicaDemo: { key: "pubblica-demo", label: demoSpenta ? "Riaccendi demo" : demoAccesa ? "Ripubblica demo" : "Pubblica demo", tone: "secondary", onClick: () => setDialog("demo") } as Azione,
    whatsapp: demoAccesa && wa
      ? ({ key: "whatsapp", label: "Invia su WhatsApp", tone: "secondary", href: `https://wa.me/${wa}?text=${encodeURIComponent(testoWa(businessName, referente, demo!))}`, icon: <MessageCircle className="size-3.5" aria-hidden /> } as Azione)
      : null,
    copia: demoAccesa ? ({ key: "copia", label: "Copia link", tone: "secondary", onClick: () => copiaLink(demo!.url), icon: <LinkIcon className="size-3.5" aria-hidden /> } as Azione) : null,
    apriDemo: demoAccesa ? ({ key: "apri-demo", label: "Apri demo", tone: "ghost", href: demo!.url, icon: <ExternalLink className="size-3.5" aria-hidden /> } as Azione) : null,
    abbonato: { key: "abbonato", label: "Il cliente si è abbonato", tone: "secondary", onClick: () => setDialog("abbonato") } as Azione,
    proroga: demoAccesa && !demo!.congelata ? ({ key: "proroga", label: "Proroga +15 gg", tone: "ghost", onClick: () => setDialog("proroga") } as Azione) : null,
    spegni: demoAccesa ? ({ key: "spegni", label: demoScaduta ? "Spegni demo adesso" : "Spegni demo", tone: "danger", onClick: () => setDialog("spegni") } as Azione) : null,
    // Con un motivo di rebuild il deploy rifiuterebbe comunque: l'azione sparisce in ogni ramo (anche a VPS bloccato).
    pubblicaSito: rebuild ? null : ({ key: "pubblica-sito", label: build.deployErrore ? "Riprova la pubblicazione" : build.deploy ? "Ripubblica" : "Pubblica su Cloudflare", tone: "secondary", onClick: () => setDialog("pubblica") } as Azione),
    copiaSito: build.deploy ? ({ key: "copia-sito", label: "Copia link", tone: "ghost", onClick: () => copiaLink(build.deploy!.url), icon: <LinkIcon className="size-3.5" aria-hidden /> } as Azione) : null,
  };

  // Decisione: (primaria, frase della bar, azioni della sezione 3). Una sola
  // primaria; se non c'è nulla da fare la bar lo dice.
  let primaria: Azione | null = null;
  let bar = "";
  let azioni3: Array<Azione | null> = [];

  if (inCorso) {
    primaria = null;
    bar = runner.running
      ? "Build in corso: le azioni tornano quando finisce."
      : catenaAttiva
        ? `Catena in corso · passo ${NOME_PASSO[catena?.passo ?? ""] ?? catena?.passo ?? "—"}${runVivo ? ` · ${runVivo.fase ?? `${nomeStep(runVivo)}: avvio…`} · ${formatElapsed(Date.now() - runVivo.startedAt)}` : ""}: le azioni tornano quando finisce.`
        : `${nomeStep(runVivo!)} in corso${runVivo?.fase ? ` · ${runVivo.fase}` : ""} · ${formatElapsed(Date.now() - runVivo!.startedAt)}: le azioni tornano quando finisce.`;
    azioni3 = isDemo ? [A.whatsapp, A.copia, A.apriDemo, A.abbonato, A.proroga, A.spegni] : [A.pubblicaSito, A.copiaSito];
  } else if (dominioLegacy) {
    primaria = null;
    bar = "Demo bloccata: rimuovi il dominio salvato e ribuilda.";
    azioni3 = [A.abbonato];
  } else if (buildBloccataVps) {
    primaria = null;
    bar = "Build bloccata: chiavi del VPS mancanti (UMAMI_PASSWORD, N8N_REGISTRA_KEY) — aggiungile in Impostazioni.";
    azioni3 = [A.pubblicaSito, A.copiaSito];
  } else if (staleFiles.length > 0 || !completa || rebuild) {
    primaria = { ...A.builda, disabled: !imagesOk };
    bar = !imagesOk
      ? "Build bloccata: immagini non verificate — conferma prima la scheda Immagini."
      : staleFiles.length > 0
        ? `Pronto per ribuildare: cambiato a monte (${staleFiles.join(", ")}).`
        : build.partial
          ? "Conferma bloccata: l'ultima build è parziale (segnaposto del blueprint) — builda il sito completo."
          : rebuild
            ? `Pronto per ribuildare: ${rebuildMotivi[0]}.`
            : "Prossimo passo: builda il sito.";
    azioni3 = isDemo ? [A.whatsapp, A.copia, A.apriDemo, A.abbonato, A.proroga, A.spegni] : [A.copiaSito];
  } else if (daConfermare) {
    primaria = A.conferma;
    bar = "Pronto per la conferma: guardala come la vedrebbe il titolare, desktop e telefono.";
    azioni3 = isDemo ? [A.whatsapp, A.copia, A.apriDemo, A.abbonato, A.proroga, A.spegni] : [A.copiaSito];
  } else if (isDemo) {
    if (demoScaduta) {
      primaria = { key: "proroga", label: "Proroga +15 gg", tone: "secondary", onClick: () => setDialog("proroga") };
      bar = "Demo scaduta: proroga se il cliente è ancora interessato, altrimenti spegnila.";
      azioni3 = [A.whatsapp, A.copia, A.apriDemo, A.abbonato, A.spegni];
    } else if (nuovaBuildDemo) {
      primaria = A.pubblicaDemo;
      bar = `Pronto per ripubblicare: la build del ${dtBreve(build.builtAt)} è più recente della demo online (${dtBreve(demo!.pubblicataAt)}).`;
      azioni3 = [A.whatsapp, A.copia, A.apriDemo, A.abbonato, A.proroga, A.spegni];
    } else if (inScadenza) {
      primaria = { key: "proroga", label: "Proroga +15 gg", tone: "secondary", onClick: () => setDialog("proroga") };
      bar = `La demo scade tra ${Math.max(0, giorniDemo)} ${giorniDemo === 1 ? "giorno" : "giorni"}: proroga o lascia che si spenga.`;
      azioni3 = [A.whatsapp, A.copia, A.apriDemo, A.abbonato, A.spegni];
    } else if (demoAccesa) {
      primaria = A.whatsapp ?? A.copia;
      bar = "Demo online e aggiornata: mandala al cliente.";
      azioni3 = [A.whatsapp, A.copia, A.apriDemo, A.abbonato, A.proroga, A.spegni];
    } else if (demoSpenta) {
      primaria = A.pubblicaDemo;
      bar = `Pronto per riaccendere la demo su ${demo!.host}.`;
      azioni3 = [A.anteprima, A.abbonato];
    } else {
      primaria = A.pubblicaDemo;
      bar = `Pronto per pubblicare la demo su ${hostPrevisto} (15 giorni).`;
      azioni3 = [A.anteprima, A.abbonato];
    }
  } else if (!cfTokenOk || !cfAccountOk) {
    primaria = null;
    bar = "Pubblicazione bloccata: chiavi Cloudflare mancanti.";
    azioni3 = [];
  } else if (build.deployErrore && !buildNonPubblicata) {
    primaria = A.pubblicaSito;
    bar = "Pubblicazione fallita: correggi la causa e riprova.";
    azioni3 = [A.copiaSito];
  } else if (!build.deploy) {
    primaria = A.pubblicaSito;
    bar = build.dominio ? `Pronto per pubblicare su https://${build.dominio}.` : "Pronto per pubblicare su workers.dev (senza dominio: anteprima, niente statistiche né modulo).";
    azioni3 = [A.anteprima];
  } else if (buildNonPubblicata) {
    primaria = A.pubblicaSito;
    bar = `Pronto per ripubblicare: la build del ${dtBreve(build.builtAt)} è più recente del sito online (${dtBreve(build.deploy.deployedAt)}).`;
    azioni3 = [A.copiaSito];
  } else if (build.infra?.errore) {
    primaria = A.pubblicaSito;
    bar = "Sito online, ma monitor o registro non aggiornati: ripubblica per riprovare.";
    azioni3 = [A.copiaSito];
  } else {
    primaria = null;
    bar = "Niente da fare: sito online e aggiornato all'ultima build.";
    azioni3 = [A.pubblicaSito, A.copiaSito];
  }

  const bloccata = inCorso || busy;
  const rendi = (lista: Array<Azione | null>) =>
    lista.filter((a): a is Azione => !!a && a.key !== primaria?.key).map((a) => <Bottone key={a.key} a={a} bloccata={bloccata} />);

  const anteprimaAltrui = anteprimaAttiva && anteprimaAttiva !== slug ? anteprimaAttiva : null;

  return (
    <div className="pb-28">
      {guardia}
      <BackBar slug={slug} businessName={businessName} step="Build & Pubblica" onNavigate={navigate} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Build &amp; Pubblica</h1>
        <Badge tone={isDemo ? "brand" : "ok"}>{isDemo ? "percorso demo" : "percorso completo"}</Badge>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        {isDemo ? (
          <>
            Build noindex → demo su <span className="mono">{hostPrevisto}</span> per 15 giorni. Il sito reale si builda dopo
            l&apos;abbonamento.
          </>
        ) : (
          <>Build reale col dominio → Cloudflare, con statistiche e modulo attivi. Montaggio deterministico, niente AI.</>
        )}
      </p>

      {/* dialog */}
      <ConfirmDialog
        open={dialog === "pubblica"}
        title={build.deploy ? "Ripubblicare il sito?" : "Pubblicare il sito?"}
        message={
          (build.deploy
            ? "Il sito online su Cloudflare verrà sostituito con questa build. L'operazione può richiedere qualche minuto."
            : "La build confermata va online su Cloudflare Workers. L'operazione può richiedere qualche minuto.") +
          (build.dominio ? " Col dominio: sito registrato su Umami e nel monitor, modulo reale attivo; la demo si spegne da sola." : "")
        }
        confirmLabel={busy ? "Pubblico…" : build.deploy ? "Ripubblica" : "Pubblica"}
        confirmDisabled={busy}
        onConfirm={async () => {
          setDialog(null);
          await pubblicaSito();
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "demo"}
        title={demoAccesa ? "Ripubblicare la demo?" : demoSpenta ? "Riaccendere la demo?" : "Pubblicare la demo?"}
        message={
          <>
            La build confermata va online su <span className="mono">{demoAccesa ? demo!.host : hostPrevisto}</span>: modulo
            simulato, nessuna statistica, fuori dai motori di ricerca.{" "}
            {demoAccesa ? "La scadenza non cambia." : "Resta online 15 giorni, poi si spegne da sola."} Al primo avvio il
            certificato può richiedere qualche minuto.
          </>
        }
        confirmLabel={busy ? "Pubblico…" : demoAccesa ? "Ripubblica" : demoSpenta ? "Riaccendi" : "Pubblica"}
        confirmDisabled={busy}
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
        confirmLabel={busy ? "Spengo…" : "Spegni"}
        tone="danger"
        confirmDisabled={busy}
        onConfirm={async () => {
          if (await demoAzione("spegni")) setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "proroga"}
        title="Prorogare la demo di 15 giorni?"
        message={
          demo ? (
            <>
              Nuova scadenza: <span className="mono">{ggmm(new Date(Math.max(Date.parse(demo.scadenza), Date.now()) + 15 * 86_400_000).toISOString())}</span>{" "}
              (15 giorni da oggi o dalla scadenza attuale, la più lontana).
            </>
          ) : (
            ""
          )
        }
        confirmLabel={busy ? "Prorogo…" : "Proroga"}
        confirmDisabled={busy}
        onConfirm={async () => {
          if (await demoAzione("proroga")) setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "abbonato"}
        title="Il cliente si è abbonato?"
        message={
          <>
            Il cliente passa al percorso completo: la demo non scade più e la catena riparte da sola con i documenti
            legali. Quando avrai comprato il dominio, inseriscilo qui e la catena pubblicherà il sito.
          </>
        }
        confirmLabel={busy ? "Confermo…" : "Sì, si è abbonato"}
        confirmDisabled={busy}
        onConfirm={async () => {
          if (await demoAzione("abbonato")) setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "parziale"}
        title="Sovrascrivere la build?"
        message="L'anteprima parziale sostituisce la dist dell'ultima build e annulla la conferma. Ciò che è online resta online, ma da qui non potrai ripubblicarlo finché non ribuildi il sito completo."
        confirmLabel="Builda parziale"
        tone="danger"
        onConfirm={() => {
          setDialog(null);
          lanciaParziale();
        }}
        onCancel={() => setDialog(null)}
      />

      {staleFiles.length > 0 && !runner.running && (
        <div className="mt-4">
          <Banner tone="warn" title="Cambiato a monte dopo l'ultima build">
            <span className="mono">{staleFiles.join(" · ")}</span> — ribuilda per portare le correzioni nel sito.
          </Banner>
        </div>
      )}
      {catena?.stato === "ferma" && (
        <div className="mt-4">
          <Banner
            tone="warn"
            title={`Catena ferma a ${NOME_PASSO[catena.passo ?? ""] ?? catena.passo ?? "—"}`}
            actions={
              <Link href={`/clienti/${slug}`} className={btnGhost}>
                Riprendi dal cliente →
              </Link>
            }
          >
            {catena.errore}
          </Banner>
        </div>
      )}
      {errore && (
        <div className="mt-4">
          <Banner tone="err" title="Errore">
            <span className="whitespace-pre-wrap">{errore}</span>
          </Banner>
        </div>
      )}

      {/* 1 · BUILD */}
      <section className="mt-8 border-t border-line pt-6 first:border-t-0">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">1 · Build</h2>
        <div className="flex flex-wrap items-center gap-3">
          {rendi([A.builda, A.parziale])}
          {build.builtAt && (
            <span className="mono ml-auto flex items-center gap-2 text-xs text-muted">
              ultima: {dtBreve(build.builtAt)} · {build.pages} pagine · {build.sizeKb} KB
              {build.partial && <Badge tone="warn">parziale</Badge>}
              {build.noindex && <Badge tone="idle">noindex</Badge>}
            </span>
          )}
        </div>
        {(runner.running || runner.log.length > 0) && <RunLog log={runner.log} />}
        {runner.failed && <p className="mt-2 text-sm text-err whitespace-pre-wrap">{runner.failed}</p>}
      </section>

      {/* 2 · REVISIONE */}
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">2 · Revisione</h2>
        {build.stato === "assente" ? (
          <p className="text-sm text-faint">Dopo la build, qui apri l&apos;anteprima e la confermi.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {rendi([A.anteprima])}
            <span className="text-xs text-muted">
              localhost:4399 — guardala come la vedrebbe il titolare, desktop e mobile.
              {anteprimaAltrui && (
                <>
                  {" "}
                  <span className="text-warn">
                    L&apos;anteprima mostra ora <span className="mono">{anteprimaAltrui}</span>: riaprila per vedere questo cliente.
                  </span>
                </>
              )}
            </span>
            <span className="ml-auto flex items-center gap-3">
              <StepBadge stato={build.stato} />
              {daConfermare && rendi([A.conferma])}
            </span>
          </div>
        )}
      </section>

      {/* 3 · PUBBLICAZIONE */}
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">3 · Pubblicazione {isDemo ? "· demo" : "· sito"}</h2>
        {isDemo ? (
          <PubblicazioneDemo
            demo={demo}
            hostPrevisto={hostPrevisto}
            scaduta={demoScaduta}
            nuovaBuild={nuovaBuildDemo}
            builtAt={build.builtAt}
            buildConfermata={verificata && !!build.noindex}
            dominioLegacy={dominioLegacy}
            azioni={rendi(azioni3)}
            esito={esito}
            busy={bloccata}
            onRiprovaSpegni={() => setDialog("spegni")}
            onRimuoviDominio={() => void salvaDominio("")}
          />
        ) : (
          <PubblicazioneSito
            slug={slug}
            build={build}
            umamiHost={umamiHost}
            cfTokenOk={cfTokenOk}
            cfAccountOk={cfAccountOk}
            vpsKeysOk={vpsKeysOk}
            dominio={dominio}
            setDominio={(v) => {
              setDominio(v);
              setDominioMsg(null);
            }}
            dominioMsg={dominioMsg}
            onSalvaDominio={() => void salvaDominio()}
            rebuildMotivi={rebuildMotivi}
            avvisiFondamenta={avvisiFondamenta}
            buildNonPubblicata={buildNonPubblicata}
            demo={demo}
            azioni={rendi(azioni3)}
            esito={esito}
            busy={bloccata}
            onSpegniDemo={() => setDialog("spegni")}
          />
        )}
      </section>

      {/* action bar fissa: il motivo a sinistra, l'unica primaria a destra */}
      <div className="fixed inset-x-0 bottom-(--statusbar-offset) z-10 border-t border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-6 py-3">
          <span className="text-xs text-faint" role="status">
            {bar}
          </span>
          {primaria ? (
            primaria.href && !bloccata ? (
              <a href={primaria.href} target="_blank" rel="noreferrer" className={`${btnPrimary} shrink-0`}>
                {primaria.icon} {primaria.label}
              </a>
            ) : (
              <button type="button" className={`${btnPrimary} shrink-0`} onClick={primaria.onClick} disabled={bloccata || !!primaria.disabled}>
                {busy ? "Un momento…" : primaria.label}
              </button>
            )
          ) : inCorso ? (
            <Link href={`/clienti/${slug}`} className={`${btnGhost} shrink-0`}>
              Gestisci la catena nel cliente →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
