"use client";

// Componenti interattivi della lista clienti: setup key first-run,
// pannello Chiavi API (Keychain), bottone Importa (con conferma overwrite
// su 409), riprova Tally.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Form generico di inserimento/aggiornamento di una API key: la valida con
 * una chiamata reale e la salva nel Keychain macOS (mai in chiaro su disco).
 * Riusato in home (Tally, pannello chiavi) e nelle schede che richiedono
 * una key mancante (es. Immagini → BFL).
 */
export function KeySetup({
  name,
  title,
  description,
  placeholder,
  compact = false,
  onSaved,
}: {
  name: string;
  title: string;
  description: string;
  placeholder?: string;
  /** true = solo form, senza il riquadro sezione (per righe di pannello). */
  compact?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/setup/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, key }),
    });
    setBusy(false);
    if (res.ok) {
      setKey("");
      if (onSaved) onSaved();
      else router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `errore ${res.status}`);
    }
  }

  const form = (
    <>
      <form
        className={compact ? "flex gap-2" : "mt-3 flex gap-2"}
        onSubmit={(e) => {
          e.preventDefault();
          if (key.trim()) save();
        }}
      >
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="max-w-sm"
          aria-label={`API key ${title}`}
        />
        <button type="submit" className={btnPrimary} disabled={busy || !key.trim()}>
          {busy ? "Verifico…" : "Salva e verifica"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-err">{error}</p>}
    </>
  );

  if (compact) return <div>{form}</div>;
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {form}
    </section>
  );
}

export function TallySetup() {
  return (
    <KeySetup
      name="TALLY_API_KEY"
      title="Configura Tally"
      description="Incolla la API key di Tally per vedere le submission del form. Viene salvata nel portachiavi macOS (Keychain), mai in chiaro su disco."
      placeholder="tly-…"
    />
  );
}

interface KeyInfo {
  name: string;
  label: string;
  configured: boolean;
  hint: string | null;
}

/** Pannello di gestione di tutte le API key della pipeline (stato + aggiorna). */
export function ApiKeysPanel({ aperto = false }: { aperto?: boolean }) {
  const [keys, setKeys] = useState<KeyInfo[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/setup/keys").catch(() => null);
    setKeys(res?.ok ? await res.json() : []);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <details className="card" open={aperto}>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-muted">
        Chiavi API
      </summary>
      <div className="border-t border-line px-4 py-3">
        <p className="text-sm text-muted">
          Salvate nel portachiavi macOS (Keychain, cifrate a riposo), mai in chiaro su disco. Al primo accesso macOS
          può chiedere un consenso una tantum.
        </p>
        {keys === null ? (
          <p className="mt-3 text-sm text-muted">Carico…</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {keys.map((k) => (
              <li key={k.name} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{k.label}</div>
                  <div className="mono mt-0.5 text-xs text-muted">
                    {k.configured ? `configurata · ${k.hint}` : "mancante"}
                  </div>
                </div>
                {openKey === k.name ? (
                  <KeySetup
                    compact
                    name={k.name}
                    title={k.label}
                    onSaved={() => {
                      setOpenKey(null);
                      load();
                    }}
                    description=""
                  />
                ) : (
                  <button className={btnSecondary} onClick={() => setOpenKey(k.name)}>
                    {k.configured ? "Aggiorna" : "Aggiungi"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function ImportButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confermaSlug, setConfermaSlug] = useState<string | null>(null);

  async function doImport(overwrite = false) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, overwrite }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/clienti/${data.slug}`);
      router.refresh();
      return;
    }
    setBusy(false);
    if (res.status === 409) {
      setConfermaSlug(data.slug); // apre il dialog di conferma reimport
    } else {
      setError(data.error ?? `errore ${res.status}`);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className={btnSecondary} disabled={busy} onClick={() => doImport()}>
        {busy ? "Importo…" : "Importa"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-err">{error}</p>}
      <ConfirmDialog
        open={confermaSlug !== null}
        title="Cliente già presente"
        message={
          <>
            <span className="mono">{confermaSlug}</span> esiste già. Reimportare i dati del form? Il contesto e lo stato
            vengono preservati; l&apos;intake tornerà «da verificare».
          </>
        }
        confirmLabel="Reimporta"
        cancelLabel="Annulla"
        onConfirm={() => {
          setConfermaSlug(null);
          doImport(true);
        }}
        onCancel={() => setConfermaSlug(null)}
      />
    </div>
  );
}

export function RetryTally() {
  const router = useRouter();
  return (
    <button className={btnSecondary} onClick={() => router.refresh()}>
      Riprova
    </button>
  );
}
