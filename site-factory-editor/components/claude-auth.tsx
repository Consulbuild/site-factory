"use client";

// Login CLI Claude: avviso globale (montato nella shell) + pannello per la
// pagina Impostazioni. È un avviso di STATO, non un toast a tempo: compare
// quando la sessione `claude login` è scaduta e sparisce da solo quando
// l'operatore rifà il login (o lo nasconde per questa sessione dell'app).
// Design system: Banner/btn*/Badge da ui.tsx, z-toast=60, offset status bar.

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Terminal } from "lucide-react";
import { Badge, Banner, btnGhost, btnSecondary } from "@/components/ui";

type StatoAuth = { loggedIn: boolean; authMethod: string } | null; // null = non ancora noto

const POLL_OK_MS = 5 * 60_000; // da loggati basta un controllo di cortesia
const POLL_KO_MS = 30_000; // da scaduti: così l'avviso sparisce da solo dopo il login

function useClaudeAuth() {
  const [stato, setStato] = useState<StatoAuth>(null);
  const [aperturaInCorso, setAperturaInCorso] = useState(false);
  const [terminaleAperto, setTerminaleAperto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const ricontrolla = useCallback(async () => {
    try {
      const r = await fetch("/api/claude-auth");
      if (!r.ok) return; // stato non leggibile: non allarmare con falsi avvisi
      const dati = (await r.json()) as { loggedIn: boolean; authMethod: string };
      setStato(dati);
      if (dati.loggedIn) {
        setTerminaleAperto(false);
        setErrore(null);
      }
    } catch {
      // editor offline/riavvio: si riprova al prossimo giro
    }
  }, []);

  useEffect(() => {
    ricontrolla();
    const t = setInterval(ricontrolla, stato?.loggedIn === false ? POLL_KO_MS : POLL_OK_MS);
    window.addEventListener("focus", ricontrolla);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", ricontrolla);
    };
  }, [ricontrolla, stato?.loggedIn]);

  const apriLogin = useCallback(async () => {
    setAperturaInCorso(true);
    setErrore(null);
    try {
      const r = await fetch("/api/claude-auth", { method: "POST" });
      if (r.ok) {
        setTerminaleAperto(true);
      } else {
        const dati = await r.json().catch(() => ({}));
        setErrore(String(dati.error ?? "apertura del Terminale fallita"));
      }
    } catch {
      setErrore("apertura del Terminale fallita");
    } finally {
      setAperturaInCorso(false);
    }
  }, []);

  return { stato, ricontrolla, apriLogin, aperturaInCorso, terminaleAperto, errore };
}

/** Comando da lanciare a mano se l'apertura automatica non è possibile. */
function ComandoManuale() {
  return (
    <>
      Aprilo a mano e lancia: <span className="mono">claude login</span>
    </>
  );
}

/**
 * Avviso globale, flottante sopra la status bar (z-toast). Montato una volta
 * nella shell (app/layout.tsx): compare su qualunque pagina quando serve.
 */
export function ClaudeAuthNotice() {
  const { stato, ricontrolla, apriLogin, aperturaInCorso, terminaleAperto, errore } = useClaudeAuth();
  const [nascosto, setNascosto] = useState(true); // true finché non leggiamo sessionStorage (no flash)

  useEffect(() => {
    setNascosto(sessionStorage.getItem("claude-login-avviso") === "nascosto");
  }, []);

  if (nascosto || stato === null || stato.loggedIn) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-6 bottom-(--statusbar-offset) z-[60] mb-4 w-[calc(100vw-3rem)] max-w-md shadow-overlay"
    >
      <Banner
        tone="warn"
        title="Sessione Claude scaduta"
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={apriLogin} disabled={aperturaInCorso}>
              <Terminal className="size-4" aria-hidden />
              {aperturaInCorso ? "Apro il Terminale…" : "Apri il Terminale per il login"}
            </button>
            <button type="button" className={btnGhost} onClick={ricontrolla}>
              <RefreshCw className="size-4" aria-hidden />
              Ho fatto il login
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                sessionStorage.setItem("claude-login-avviso", "nascosto");
                setNascosto(true);
              }}
            >
              Nascondi
            </button>
          </>
        }
      >
        {errore ? (
          <>
            {errore}. <ComandoManuale />
          </>
        ) : terminaleAperto ? (
          <>Terminale aperto: completa il login nel browser. L&apos;avviso sparirà da solo.</>
        ) : (
          <>Il login della CLI è scaduto: gli step AI (contesto, palette, copy, immagini, legale) non possono partire.</>
        )}
      </Banner>
    </div>
  );
}

/** Pannello per la pagina Impostazioni: stato del login + stesse azioni. */
export function ClaudeAuthPanel() {
  const { stato, ricontrolla, apriLogin, aperturaInCorso, terminaleAperto, errore } = useClaudeAuth();

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Claude CLI (login Max)</h2>
          <p className="mt-1 text-sm text-muted">
            Gli step AI girano via <span className="mono">claude -p</span> col login Max: senza sessione attiva i run non
            partono e falliscono con errore di autenticazione.
          </p>
        </div>
        {stato === null ? (
          <Badge tone="idle">controllo…</Badge>
        ) : stato.loggedIn ? (
          <Badge tone="ok">sessione attiva</Badge>
        ) : (
          <Badge tone="err">sessione scaduta</Badge>
        )}
      </div>

      {stato?.loggedIn && stato.authMethod ? (
        <p className="mono mt-2 text-xs text-faint">metodo: {stato.authMethod}</p>
      ) : null}
      {stato?.loggedIn === false ? (
        <p className="mt-2 text-sm text-muted">
          {terminaleAperto ? (
            "Terminale aperto: completa il login nel browser, poi lo stato qui si aggiorna da solo."
          ) : (
            <>
              Il bottone apre il Terminale con <span className="mono">claude login</span> già avviato: il login si completa
              nel browser.
            </>
          )}
        </p>
      ) : null}
      {errore ? (
        <p className="mt-2 text-sm text-err">
          {errore}. <ComandoManuale />
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className={btnSecondary} onClick={apriLogin} disabled={aperturaInCorso}>
          <Terminal className="size-4" aria-hidden />
          {aperturaInCorso ? "Apro il Terminale…" : "Apri il Terminale per il login"}
        </button>
        <button type="button" className={btnGhost} onClick={ricontrolla}>
          <RefreshCw className="size-4" aria-hidden />
          Ricontrolla
        </button>
      </div>
    </section>
  );
}
