"use client";

// Blocco «3 · Pubblicazione» della scheda Build & Pubblica in percorso
// COMPLETO (abbonato): chiavi Cloudflare, dominio, motivi di ribuild, stato del
// sito online e delle integrazioni, ultima pubblicazione fallita, avvisi delle
// fondamenta SEO, demo ancora accesa. Solo presentazione: logica, primaria e
// bottoni in build-panel.tsx.

import Link from "next/link";
import type { ClientState } from "@/lib/schemas";
import { Badge, Banner, btnDanger, btnSecondary } from "./ui";
import { KeySetup } from "./home";
import { dtBreve } from "./pubblicazione-demo";

type BuildState = ClientState["steps"]["build"];
type Demo = NonNullable<ClientState["demo"]>;

export function PubblicazioneSito({
  slug,
  build,
  umamiHost,
  cfTokenOk,
  cfAccountOk,
  vpsKeysOk,
  dominio,
  setDominio,
  dominioMsg,
  onSalvaDominio,
  rebuildMotivi,
  avvisiFondamenta,
  buildNonPubblicata,
  demo,
  azioni,
  esito,
  busy,
  onSpegniDemo,
}: {
  slug: string;
  build: BuildState;
  umamiHost: string;
  cfTokenOk: boolean;
  cfAccountOk: boolean;
  vpsKeysOk: { umami: boolean; n8n: boolean };
  dominio: string;
  setDominio: (v: string) => void;
  dominioMsg: string | null;
  onSalvaDominio: () => void;
  /** Perché l'ultima build non è pubblicabile così com'è (vuoto = ok). */
  rebuildMotivi: string[];
  /** Avvisi delle fondamenta SEO cotte (dati omessi dal JSON-LD, title/description/H1 fuori misura): mai bloccanti. */
  avvisiFondamenta: string[];
  buildNonPubblicata: boolean;
  demo?: Demo;
  azioni: React.ReactNode;
  esito: string | null;
  busy: boolean;
  onSpegniDemo: () => void;
}) {
  const demoAccesa = !!demo && !demo.spentaAt;

  if (!cfTokenOk || !cfAccountOk) {
    return (
      <div className="space-y-4">
        <Banner tone="warn" title="Pubblicazione bloccata: chiavi Cloudflare mancanti">
          Senza token e account ID non si pubblica nulla. Le chiavi restano nel portachiavi macOS.
        </Banner>
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
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted" htmlFor="dominio">
          Dominio del cliente
        </label>
        <input
          id="dominio"
          value={dominio}
          onChange={(e) => setDominio(e.target.value)}
          placeholder="impresarossi.it"
          className="max-w-xs"
          autoComplete="off"
        />
        <button type="button" className={btnSecondary} onClick={onSalvaDominio} disabled={busy || dominio === (build.dominio ?? "")}>
          Salva
        </button>
      </div>
      <p className="mt-2 text-xs text-faint">
        Senza dominio il sito va su workers.dev (anteprima); col dominio comprato, con la zona DNS già attiva su Cloudflare, si
        attivano statistiche e modulo reale.
      </p>
      {dominioMsg && (
        <p className="mt-2 text-sm text-ok" role="status">
          {dominioMsg}
        </p>
      )}

      {build.dominio && !(vpsKeysOk.umami && vpsKeysOk.n8n) && (
        <div className="mt-4">
          <Banner tone="warn" title="Build bloccata: chiavi del VPS mancanti">
            Col dominio la build registra il sito su Umami e il modulo sul registro n8n: servono{" "}
            {!vpsKeysOk.umami && <span className="mono">UMAMI_PASSWORD</span>}
            {!vpsKeysOk.umami && !vpsKeysOk.n8n && " e "}
            {!vpsKeysOk.n8n && <span className="mono">N8N_REGISTRA_KEY</span>} in{" "}
            <Link href="/impostazioni" className="text-brand hover:underline">
              Impostazioni → Chiavi API
            </Link>
            .
          </Banner>
        </div>
      )}

      {rebuildMotivi.length > 0 && (
        <div className="mt-4">
          <Banner tone="warn" title="Ribuilda prima di pubblicare">
            <ul className="mono list-disc space-y-0.5 pl-4 text-xs">
              {rebuildMotivi.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Banner>
        </div>
      )}

      {build.deployErrore && (
        <div className="mt-4">
          <Banner tone="err" title={`Ultima pubblicazione fallita il ${dtBreve(build.deployErrore.quando)}`}>
            <span className="mono whitespace-pre-wrap">{build.deployErrore.messaggio}</span>
          </Banner>
        </div>
      )}

      {avvisiFondamenta.length > 0 && (
        <div className="mt-4">
          <Banner
            tone="warn"
            title={`Fondamenta SEO: ${avvisiFondamenta.length} ${avvisiFondamenta.length === 1 ? "avviso" : "avvisi"} nell'ultima build`}
          >
            Non bloccano la pubblicazione: per toglierli correggi i dati indicati e ribuilda.
            <ul className="mono mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
              {avvisiFondamenta.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Banner>
        </div>
      )}

      <div className="mt-4 card px-4 py-3 text-sm">
        {build.deploy ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="ok">online</Badge>
              <a href={build.deploy.url} target="_blank" rel="noreferrer" className="mono text-brand hover:underline">
                {build.deploy.url}
              </a>
              <span className="mono ml-auto text-xs text-muted">pubblicato il {dtBreve(build.deploy.deployedAt)}</span>
            </div>
            <p className={`mono mt-1 text-xs ${buildNonPubblicata ? "text-warn" : "text-muted"}`}>
              {buildNonPubblicata
                ? `online: build precedente · l'ultima build è del ${dtBreve(build.builtAt)}`
                : `online: build del ${dtBreve(build.builtAt)}`}
            </p>
            {build.deploy.dominio && (
              <div className="mono mt-3 grid gap-1 border-t border-line pt-3 text-xs text-muted">
                <p>
                  Statistiche ·{" "}
                  {build.umamiWebsiteId ? (
                    <a
                      href={`${umamiHost}/websites/${build.umamiWebsiteId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      Umami {build.umamiWebsiteId}
                    </a>
                  ) : (
                    "non registrate"
                  )}
                </p>
                <p>Modulo · {build.integrazioni?.formAction ?? `form-lead?slug=${slug}`}</p>
                <p>
                  Monitor e registro ·{" "}
                  {build.infra
                    ? `${build.infra.commit ? `commit ${build.infra.commit} · ` : ""}push ${build.infra.pushed ? "ok" : "non riuscito"} · registro n8n ${build.infra.n8nOk ? "ok" : "KO"} · ${dtBreve(build.infra.at)}`
                    : "non ancora sincronizzati"}
                </p>
              </div>
            )}
          </>
        ) : (
          <span className="text-muted">
            Non ancora pubblicato
            {build.dominio ? (
              <>
                : andrà su <span className="mono">https://{build.dominio}</span>.
              </>
            ) : (
              <>
                : senza dominio andrà su <span className="mono">https://{slug}.&lt;account&gt;.workers.dev</span>.
              </>
            )}
          </span>
        )}
      </div>

      {build.infra?.errore && (
        <div className="mt-4">
          <Banner tone="err" title="Integrazioni non sincronizzate">
            Il sito è online, ma monitor o registro del modulo non sono aggiornati:{" "}
            <span className="mono">{build.infra.errore}</span>.
          </Banner>
        </div>
      )}

      {demo && demoAccesa && (
        <div className="mt-4">
          <Banner
            tone="brand"
            title="Demo ancora online"
            actions={
              <button type="button" className={btnDanger} onClick={onSpegniDemo} disabled={busy}>
                {demo.errore ? "Riprova a spegnere" : "Spegni demo"}
              </button>
            }
          >
            <a href={demo.url} target="_blank" rel="noreferrer" className="mono text-brand hover:underline">
              {demo.host}
            </a>{" "}
            {demo.congelata ? "(scadenza congelata)" : ""}: si spegne da sola al go-live col dominio.
            {demo.errore && (
              <>
                {" "}
                Spegnimento non riuscito: <span className="mono">{demo.errore}</span>
              </>
            )}
          </Banner>
        </div>
      )}

      {esito && (
        <p className="mt-2 text-sm text-ok" role="status">
          {esito}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">{azioni}</div>
    </div>
  );
}
