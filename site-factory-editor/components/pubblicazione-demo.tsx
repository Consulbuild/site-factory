"use client";

// Blocco «3 · Pubblicazione» della scheda Build & Pubblica in percorso DEMO:
// solo presentazione (card di stato, banner, hint) — la logica degli stati,
// l'azione primaria e i bottoni vivono in build-panel.tsx e arrivano come
// `azioni` già renderizzate.

import type { ClientState } from "@/lib/schemas";
import { Badge, Banner, EmptyState, btnDanger, btnGhost } from "./ui";
import { ggmm } from "./portafoglio-ui";
import { Globe } from "lucide-react";

type Demo = NonNullable<ClientState["demo"]>;

const GIORNO_MS = 86_400_000;
export const giorniA = (iso: string) => Math.ceil((Date.parse(iso) - Date.now()) / GIORNO_MS);
export const dtBreve = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

/** Numero WhatsApp in formato internazionale senza «+» (cellulari italiani senza prefisso → 39). */
export function numeroWa(telefono: string): string | null {
  const d = telefono.replace(/\D/g, "").replace(/^00/, "");
  if (!d) return null;
  return /^3\d{8,9}$/.test(d) ? `39${d}` : d;
}

export function testoWa(azienda: string, referente: string | undefined, demo: Demo): string {
  const fino = demo.congelata ? "" : ` — resta online fino al ${ggmm(demo.scadenza)}`;
  return `Buongiorno${referente ? ` ${referente}` : ""}, come promesso ecco la demo del nuovo sito di ${azienda}: ${demo.url}${fino}. Se le piace, la attiviamo insieme: mi dica quando possiamo sentirci. Mattia · ConsulBuild`;
}

export function PubblicazioneDemo({
  demo,
  hostPrevisto,
  scaduta,
  nuovaBuild,
  builtAt,
  buildConfermata,
  dominioLegacy,
  azioni,
  esito,
  busy,
  onRiprovaSpegni,
  onRimuoviDominio,
}: {
  demo?: Demo;
  hostPrevisto: string;
  /** Demo accesa oltre la scadenza (il sweep orario non l'ha ancora spenta). */
  scaduta: boolean;
  /** Demo accesa ma c'è una build confermata più recente. */
  nuovaBuild: boolean;
  builtAt?: string;
  /** Build completa e confermata (noindex): pubblicabile come demo. */
  buildConfermata: boolean;
  /** Dominio salvato prima del blocco «niente dominio in demo»: va rimosso. */
  dominioLegacy?: string;
  azioni: React.ReactNode;
  esito: string | null;
  busy: boolean;
  onRiprovaSpegni: () => void;
  onRimuoviDominio: () => void;
}) {
  const accesa = !!demo && !demo.spentaAt;
  const spentaScaduta = !!demo?.spentaAt && Date.parse(demo.spentaAt) >= Date.parse(demo.scadenza);
  const giorni = demo ? giorniA(demo.scadenza) : 0;

  return (
    <div>
      {dominioLegacy && (
        <div className="mb-4">
          <Banner
            tone="warn"
            title="Dominio salvato in percorso demo"
            actions={
              <button type="button" className={btnGhost} onClick={onRimuoviDominio} disabled={busy}>
                Rimuovi dominio
              </button>
            }
          >
            Una build col dominio (<span className="mono">{dominioLegacy}</span>) non è pubblicabile come demo: il dominio si
            imposta dopo «Il cliente si è abbonato». Rimuovilo e ribuilda.
          </Banner>
        </div>
      )}

      {demo?.errore && accesa && (
        <div className="mb-4">
          <Banner
            tone="err"
            title="Spegnimento non riuscito"
            actions={
              <button type="button" className={btnDanger} onClick={onRiprovaSpegni} disabled={busy}>
                Riprova a spegnere
              </button>
            }
          >
            <span className="mono">{demo.errore}</span>
          </Banner>
        </div>
      )}

      <div className="card px-4 py-3 text-sm">
        {accesa ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {scaduta ? (
                <Badge tone="err">scaduta</Badge>
              ) : giorni <= 3 && !demo!.congelata ? (
                <Badge tone="warn">in scadenza</Badge>
              ) : (
                <Badge tone="ok">demo online</Badge>
              )}
              <a href={demo!.url} target="_blank" rel="noreferrer" className="mono text-brand hover:underline">
                {demo!.host}
              </a>
              <span className="mono ml-auto text-xs text-muted">pubblicata il {dtBreve(demo!.pubblicataAt)}</span>
            </div>
            <p className={`mt-2 text-xs ${scaduta || (giorni <= 3 && !demo!.congelata) ? "text-warn" : "text-muted"}`}>
              {demo!.congelata ? (
                "Scadenza congelata: il cliente si è abbonato."
              ) : scaduta ? (
                <>Scaduta il {ggmm(demo!.scadenza)}: si spegne da sola al prossimo giro (entro un&apos;ora).</>
              ) : (
                <>
                  Scade il {ggmm(demo!.scadenza)} ({Math.max(0, giorni)} {giorni === 1 ? "giorno" : "giorni"}).
                </>
              )}
            </p>
            <p className={`mono mt-1 text-xs ${nuovaBuild ? "text-warn" : "text-muted"}`}>
              {nuovaBuild
                ? `online: build precedente · l'ultima build è del ${dtBreve(builtAt)}`
                : `online: build del ${dtBreve(builtAt)}`}
            </p>
          </>
        ) : demo?.spentaAt ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="idle">{spentaScaduta ? "demo scaduta" : "demo spenta"}</Badge>
            <span className="text-muted">
              {spentaScaduta
                ? `Scaduta e spenta il ${ggmm(demo.spentaAt)}: 15 giorni senza abbonamento.`
                : `Spenta da te il ${ggmm(demo.spentaAt)}.`}{" "}
              Riaccenderla ripubblica l&apos;ultima build confermata su <span className="mono">{demo.host}</span>, con altri 15
              giorni.
            </span>
          </div>
        ) : buildConfermata ? (
          <span className="text-muted">
            Build confermata: pronta per andare online su <span className="mono">{hostPrevisto}</span> per 15 giorni.
          </span>
        ) : (
          <EmptyState
            icon={Globe}
            title="Nessuna demo ancora"
            hint={`Dopo build e conferma, da qui la pubblichi su ${hostPrevisto}.`}
          />
        )}
      </div>

      {esito && (
        <p className="mt-2 text-sm text-ok" role="status">
          {esito}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">{azioni}</div>

      {!dominioLegacy && (
        <p className="mt-3 text-xs text-faint">
          Il dominio si imposta dopo «Il cliente si è abbonato»: la demo non ne ha bisogno.
        </p>
      )}
    </div>
  );
}
