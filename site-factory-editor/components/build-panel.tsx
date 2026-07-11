"use client";

// Scheda Build & Pubblica (DESIGN-BRIEF.md §Scheda Build): tre momenti in
// sequenza reale (1·Build → 2·Revisione → 3·Pubblicazione), UNA azione
// primaria contestuale allo stato, esiti in riga dati mono. La build è
// deterministica (io.script): il RunLog mostra le fasi assemble/validate/astro.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientState } from "@/lib/schemas";
import { Badge, StepBadge, btnPrimary, btnSecondary, btnGhost } from "./ui";
import { useStepRun, RunLog } from "./use-step-run";
import { BackBar } from "./back-bar";
import { ConfirmDialog } from "./confirm-dialog";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { KeySetup } from "./home";

type BuildState = ClientState["steps"]["build"];

const dt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

export function BuildPanel({
  slug,
  businessName,
  build,
  imagesOk,
  staleFiles,
  cfTokenOk,
  cfAccountOk,
}: {
  slug: string;
  businessName: string;
  build: BuildState;
  imagesOk: boolean;
  staleFiles: string[];
  cfTokenOk: boolean;
  cfAccountOk: boolean;
}) {
  const router = useRouter();
  const runner = useStepRun(slug, "build");

  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [dominio, setDominio] = useState(build.dominio ?? "");
  const [dominioMsg, setDominioMsg] = useState<string | null>(null);
  const [chiediPubblica, setChiediPubblica] = useState(false);
  // Guardia sull'unico campo editabile della scheda: il dominio non salvato.
  const dominioDirty = dominio !== (build.dominio ?? "");
  const { navigate, dialog } = useUnsavedGuard(dominioDirty);

  const completa = build.stato !== "assente" && !build.partial;
  const daConfermare = build.stato === "da_verificare" && completa;
  const verificata = build.stato === "verificato" && completa;
  const buildNonPubblicata =
    !!build.deploy && !!build.builtAt && build.builtAt > build.deploy.deployedAt;

  // Una sola primaria contestuale: build → conferma → pubblica.
  const momento: "build" | "conferma" | "pubblica" =
    staleFiles.length > 0 || !completa ? "build" : daConfermare ? "conferma" : "pubblica";

  async function azione(body: Record<string, string>): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setErrore(null);
    const res = await fetch(`/api/clients/${slug}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErrore(String(data.error ?? `errore ${res.status}`));
      return null;
    }
    return data;
  }

  async function apriAnteprima() {
    const data = await azione({ action: "preview" });
    if (data?.url) window.open(String(data.url), "_blank");
  }

  async function conferma() {
    if (await azione({ action: "confirm" })) router.refresh();
  }

  async function salvaDominio() {
    setDominioMsg(null);
    const data = await azione({ action: "domain", dominio });
    if (data) {
      setDominioMsg(dominio ? "Dominio salvato: sarà usato alla prossima pubblicazione." : "Dominio rimosso.");
      router.refresh(); // riallinea build.dominio (spegne la guardia unsaved)
    }
  }

  async function pubblica() {
    setBusy(true);
    setErrore(null);
    const res = await fetch(`/api/clients/${slug}/deploy`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErrore(String(data.error ?? `errore ${res.status}`));
      return;
    }
    router.refresh();
  }

  return (
    <div className="pb-16">
      {dialog}
      <BackBar slug={slug} businessName={businessName} step="Build" onNavigate={navigate} />

      <div className="mt-4">
        <h1 className="text-xl font-semibold">Build &amp; pubblicazione</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Montaggio deterministico degli artifact confermati (niente AI): assemble → validazione → build statica.
          Rivedi l&apos;anteprima, conferma, pubblica su Cloudflare.
        </p>
      </div>

      <ConfirmDialog
        open={chiediPubblica}
        title={build.deploy ? "Ripubblicare il sito?" : "Pubblicare il sito?"}
        message={
          build.deploy
            ? "Il sito online su Cloudflare verrà sostituito con questa build. L'operazione può richiedere qualche minuto."
            : "La build confermata va online su Cloudflare Workers. L'operazione può richiedere qualche minuto."
        }
        confirmLabel={build.deploy ? "Ripubblica" : "Pubblica"}
        onConfirm={() => {
          setChiediPubblica(false);
          pubblica();
        }}
        onCancel={() => setChiediPubblica(false)}
      />

      {staleFiles.length > 0 && !runner.running && (
        <div className="mt-4 rounded-ctl border border-warn/40 bg-warn-bg px-4 py-3 text-sm">
          <p className="font-medium text-warn">⚠ Cambiato a monte dopo l&apos;ultima build</p>
          <p className="mono mt-1 text-warn">{staleFiles.join(" · ")}</p>
          <p className="mt-1 text-warn">Ribuilda per portare le correzioni nel sito.</p>
        </div>
      )}

      {errore && (
        <div className="mt-4 rounded-ctl border border-err/40 bg-err-bg px-4 py-3 text-sm text-err">
          <p className="whitespace-pre-wrap">{errore}</p>
        </div>
      )}

      {/* 1 · BUILD */}
      <section className="mt-8 border-t border-line pt-6 first:border-t-0">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">1 · Build</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={momento === "build" ? btnPrimary : btnSecondary}
            onClick={() => runner.run("generate", "Build completa: media → assemble → validate → astro build…")}
            disabled={runner.running || !imagesOk}
            title={!imagesOk ? "Prima verifica le immagini: la build completa monta gli artifact confermati." : undefined}
          >
            {runner.running ? "Build in corso…" : "Builda il sito"}
          </button>
          <button
            className={btnGhost}
            onClick={() => runner.run("partial", "Build parziale: gli artifact mancanti restano ai segnaposto del blueprint…")}
            disabled={runner.running}
            title="Builda anche a metà pipeline: gli artifact mancanti usano i testi d'esempio del blueprint. Non pubblicabile."
          >
            Anteprima parziale
          </button>
          {build.builtAt && (
            <span className="mono ml-auto text-xs text-muted">
              ultima: {dt(build.builtAt)} · {build.pages} pagine · {build.sizeKb} KB{" "}
              {build.partial && <Badge tone="warn">parziale</Badge>}
            </span>
          )}
        </div>
        {(runner.running || runner.log.length > 0) && <RunLog log={runner.log} logRef={runner.logRef} />}
        {runner.failed && <p className="mt-2 text-sm text-err whitespace-pre-wrap">{runner.failed}</p>}
      </section>

      {/* 2 · REVISIONE */}
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">2 · Revisione</h2>
        {build.stato === "assente" ? (
          <p className="text-sm text-faint">Dopo la build, qui apri l&apos;anteprima e la confermi.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button className={btnSecondary} onClick={apriAnteprima} disabled={busy || runner.running}>
              Apri anteprima ↗
            </button>
            <span className="text-xs text-muted">
              localhost:4399 — guardala come la vedrebbe il titolare, desktop e mobile.
            </span>
            <span className="ml-auto flex items-center gap-3">
              <StepBadge stato={build.stato} />
              <button
                className={momento === "conferma" ? btnPrimary : btnSecondary}
                onClick={conferma}
                disabled={busy || runner.running || !daConfermare}
                title={
                  build.partial
                    ? "L'ultima build è parziale: si conferma solo una build completa."
                    : build.stato !== "da_verificare"
                      ? "Nulla da confermare in questo stato."
                      : undefined
                }
              >
                Conferma build
              </button>
            </span>
          </div>
        )}
      </section>

      {/* 3 · PUBBLICAZIONE */}
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">3 · Pubblicazione</h2>

        {!cfTokenOk || !cfAccountOk ? (
          <div className="space-y-4">
            {!cfTokenOk && (
              <KeySetup
                name="CLOUDFLARE_API_TOKEN"
                title="Token Cloudflare"
                description="Token API con permesso «Edit Cloudflare Workers» (dash.cloudflare.com → My Profile → API Tokens). Salvato nel portachiavi macOS, mai in chiaro su disco."
                placeholder="token…"
              />
            )}
            {!cfAccountOk && (
              <KeySetup
                name="CLOUDFLARE_ACCOUNT_ID"
                title="Account ID Cloudflare"
                description="L'ID account (32 caratteri esadecimali, in dashboard sotto Workers & Pages → Overview)."
                placeholder="0123abcd…"
              />
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-muted" htmlFor="dominio">
                Dominio custom (opzionale)
              </label>
              <input
                id="dominio"
                value={dominio}
                onChange={(e) => {
                  setDominio(e.target.value);
                  setDominioMsg(null);
                }}
                placeholder="impresarossi.it"
                className="max-w-xs"
                autoComplete="off"
              />
              <button className={btnSecondary} onClick={salvaDominio} disabled={busy || dominio === (build.dominio ?? "")}>
                Salva
              </button>
              <span className="text-xs text-faint">richiede la zona DNS già attiva sull&apos;account Cloudflare</span>
            </div>
            {dominioMsg && <p className="mt-2 text-sm text-ok">{dominioMsg}</p>}

            <div className="mt-4 card px-4 py-3 text-sm">
              {build.deploy ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="ok">● online</Badge>
                  <a href={build.deploy.url} target="_blank" rel="noreferrer" className="mono text-brand hover:underline">
                    {build.deploy.url}
                  </a>
                  <button
                    className={btnGhost}
                    onClick={() => navigator.clipboard.writeText(build.deploy!.url)}
                    title="Copia l'URL da mandare al cliente"
                  >
                    copia
                  </button>
                  <span className="mono ml-auto text-xs text-muted">pubblicato il {dt(build.deploy.deployedAt)}</span>
                </div>
              ) : (
                <span className="text-muted">Non ancora pubblicato.</span>
              )}
              {buildNonPubblicata && (
                <p className="mt-2 text-xs text-warn">⚠ La build più recente non è ancora pubblicata: ripubblica.</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className={momento === "pubblica" ? btnPrimary : btnSecondary}
                onClick={() => setChiediPubblica(true)}
                disabled={busy || runner.running || !verificata}
                title={
                  !verificata
                    ? "Si pubblica solo una build completa, rivista e confermata."
                    : undefined
                }
              >
                {busy ? "Pubblicazione in corso… (può richiedere qualche minuto)" : build.deploy ? "Ripubblica" : "Pubblica su Cloudflare"}
              </button>
              <span className="text-xs text-faint">
                URL standard: https://{slug}.&lt;account&gt;.workers.dev — al primissimo deploy dell&apos;account
                Cloudflare può servire registrare il subdomain workers.dev dalla dashboard (una tantum).
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
