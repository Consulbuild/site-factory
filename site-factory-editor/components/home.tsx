"use client";

// Componenti interattivi della lista clienti: form generico per una API key,
// pannello Chiavi API (Keychain), bottone Importa (con conferma overwrite su 409).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge, Banner, btnPrimary, btnSecondary, btnGhost } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Form generico di inserimento/aggiornamento di una API key: la valida con
 * una chiamata reale e la salva nel Keychain macOS (mai in chiaro su disco).
 * Riusato nel pannello chiavi e nelle schede che richiedono
 * una key mancante (es. Immagini → BFL).
 */
export function KeySetup({
  name,
  title,
  description,
  placeholder,
  compact = false,
  aiuto,
  coppia,
  onBusyChange,
  onSaved,
}: {
  name: string;
  title: string;
  description: string;
  placeholder?: string;
  /** true = solo form, senza il riquadro sezione (per righe di pannello). */
  compact?: boolean;
  /** Riga d'aiuto sotto il form (es. «Incolla tutto il file JSON»). */
  aiuto?: string;
  /** Altra metà di una credenziale a due pezzi: secondo campo facoltativo, provato e salvato insieme. */
  coppia?: { name: string; label: string; placeholder?: string };
  /** Avvisa il contenitore che la verifica è in corso (la POST non si può annullare). */
  onBusyChange?: (busy: boolean) => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [altra, setAltra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    const res = await fetch("/api/setup/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, key, ...(coppia && altra.trim() ? { altra } : {}) }),
    }).catch(() => null);
    setBusy(false);
    onBusyChange?.(false);
    if (!res) {
      setError("L'editor non ha risposto: riprova");
    } else if (res.ok) {
      setKey("");
      setAltra("");
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
        className={compact ? "flex flex-wrap gap-2" : "mt-3 flex gap-2"}
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
          autoFocus={compact}
          className={compact ? "min-w-0 grow sm:max-w-sm" : "max-w-sm"}
          aria-label={title}
          aria-describedby={aiuto ? `${name}-aiuto` : undefined}
        />
        {coppia && (
          <input
            type="password"
            value={altra}
            onChange={(e) => setAltra(e.target.value)}
            placeholder={coppia.placeholder}
            autoComplete="off"
            className={compact ? "min-w-0 grow sm:max-w-sm" : "max-w-sm"}
            aria-label={coppia.label}
            aria-describedby={aiuto ? `${name}-aiuto` : undefined}
          />
        )}
        <button type="submit" className={btnPrimary} disabled={busy || !key.trim()}>
          {busy ? "Verifico…" : "Salva e verifica"}
        </button>
      </form>
      {aiuto && (
        <p id={`${name}-aiuto`} className="mt-1.5 text-xs text-muted">
          {aiuto}
        </p>
      )}
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

interface KeyInfo {
  name: string;
  label: string;
  configured: boolean;
  hint: string | null;
  /** Solo chiavi del Traffico: pagina dove si crea, segnaposto, riga d'aiuto. */
  dove?: string;
  segnaposto?: string;
  aiuto?: string;
  /** Altra metà della credenziale (DataForSEO), inseribile nello stesso form. */
  coppia?: string;
}

interface KeyGroup {
  id: string;
  titolo: string;
  frase: string;
  chiavi: KeyInfo[];
}

/** Pannello di gestione di tutte le API key della pipeline, per gruppi (stato + aggiorna). */
export function ApiKeysPanel() {
  // null = in caricamento, "errore" = GET fallito (mai una lista vuota muta).
  const [gruppi, setGruppi] = useState<KeyGroup[] | "errore" | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  // Prova in corso: la POST arriva comunque al salvataggio, quindi niente Annulla né altre righe finché non risponde.
  const [verifica, setVerifica] = useState(false);

  async function load() {
    const res = await fetch("/api/setup/keys").catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    setGruppi(Array.isArray(data?.gruppi) ? data.gruppi : "errore");
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <details className="card" open>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-muted">
        Chiavi API
      </summary>
      <div className="border-t border-line px-4 py-3">
        <p className="text-sm text-muted">
          Salvate nel portachiavi macOS (Keychain, cifrate a riposo), mai in chiaro su disco. Al primo accesso macOS
          può chiedere un consenso una tantum.
        </p>
        {gruppi === null ? (
          <p className="mt-3 text-sm text-muted">Carico…</p>
        ) : gruppi === "errore" ? (
          <div className="mt-3">
            <Banner
              tone="err"
              title="Stato delle chiavi non leggibile"
              actions={
                <button
                  className={btnSecondary}
                  onClick={() => {
                    setGruppi(null);
                    load();
                  }}
                >
                  Riprova
                </button>
              }
            >
              L&apos;editor non ha risposto: le chiavi salvate non sono state toccate.
            </Banner>
          </div>
        ) : (
          gruppi.map((g) => {
            const configurate = g.chiavi.filter((k) => k.configured).length;
            return (
              <section key={g.id} aria-labelledby={`chiavi-${g.id}`} className="mt-4 border-t border-line pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 id={`chiavi-${g.id}`} className="text-sm font-semibold">
                    {g.titolo}
                  </h3>
                  <span className="text-xs text-muted">
                    {configurate} di {g.chiavi.length} {configurate === 1 ? "configurata" : "configurate"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{g.frase}</p>
                <ul className="mt-2 divide-y divide-line">
                  {g.chiavi.map((k) => {
                    const aperta = openKey === k.name;
                    const coppia = k.coppia ? g.chiavi.find((x) => x.name === k.coppia) : undefined;
                    return (
                      <li key={k.name} className="flex flex-wrap items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{k.label}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {k.configured ? (
                              <>
                                <Badge tone="ok">Configurata</Badge>
                                {k.hint && <span className="mono text-xs text-muted">{k.hint}</span>}
                              </>
                            ) : (
                              <Badge tone="idle">Mancante</Badge>
                            )}
                            {k.dove && (
                              <a
                                href={k.dove}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                              >
                                Dove si prende
                                <ExternalLink aria-hidden className="size-3" />
                                <span className="sr-only">(nuova scheda)</span>
                              </a>
                            )}
                          </div>
                        </div>
                        <button
                          className={aperta ? `${btnGhost} disabled:cursor-not-allowed disabled:opacity-40` : btnSecondary}
                          aria-expanded={aperta}
                          disabled={verifica}
                          onClick={() => setOpenKey(aperta ? null : k.name)}
                        >
                          {aperta ? "Annulla" : k.configured ? "Aggiorna" : "Aggiungi"}
                        </button>
                        {aperta && (
                          <div className="basis-full">
                            <KeySetup
                              compact
                              name={k.name}
                              title={k.label}
                              placeholder={k.segnaposto}
                              aiuto={k.aiuto}
                              coppia={coppia && { name: coppia.name, label: coppia.label, placeholder: coppia.segnaposto }}
                              onBusyChange={setVerifica}
                              onSaved={() => {
                                setOpenKey((o) => (o === k.name ? null : o));
                                load();
                              }}
                              description=""
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </details>
  );
}

/**
 * Richiesta nuova dal form: «Avvia demo» (primaria: importa e lancia subito la
 * catena automatica, poi apre l'hub) + «Importa soltanto» (ghost: per guardare
 * l'intake prima). Decisione Mattia 2026-09-08.
 */
export function ImportButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"avvia" | "importa" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confermaSlug, setConfermaSlug] = useState<string | null>(null);
  const [avviaDopo, setAvviaDopo] = useState(false);

  async function doImport(overwrite = false, avvia = avviaDopo) {
    setBusy(avvia ? "avvia" : "importa");
    setAvviaDopo(avvia);
    setError(null);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, overwrite }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (avvia) {
        const c = await fetch(`/api/clients/${data.slug}/catena`, { method: "POST" });
        if (!c.ok) {
          const e = await c.json().catch(() => ({}));
          setError(`importato, ma la catena non è partita: ${e.error ?? c.status}`);
        }
      }
      router.push(`/clienti/${data.slug}`);
      router.refresh();
      return;
    }
    setBusy(null);
    if (res.status === 409) {
      setConfermaSlug(data.slug); // apre il dialog di conferma reimport
    } else {
      setError(data.error ?? `errore ${res.status}`);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button className={btnGhost} disabled={busy !== null} onClick={() => doImport(false, false)}>
          {busy === "importa" ? "Importo…" : "Importa soltanto"}
        </button>
        <button className={btnPrimary} disabled={busy !== null} onClick={() => doImport(false, true)}>
          {busy === "avvia" ? "Avvio…" : "Avvia demo"}
        </button>
      </div>
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

/**
 * Elimina una richiesta del form senza importarla (prove della pipeline, spam).
 * Cancella l'intera cartella _inbox/<id> su Drive: è l'unico posto dove la
 * richiesta esiste (n8n non conserva le esecuzioni riuscite).
 */
export function EliminaRichiestaButton({
  submissionId,
  businessName,
  onDeleted,
}: {
  submissionId: string;
  businessName: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elimina() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/inbox/${submissionId}`, { method: "DELETE" });
    setBusy(false);
    setOpen(false);
    if (res.ok) {
      onDeleted();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? `errore ${res.status}`);
  }

  return (
    <>
      <button className={btnGhost} disabled={busy} onClick={() => setOpen(true)} aria-label={`Elimina la richiesta di ${businessName || "questa azienda"}`}>
        {busy ? "Elimino…" : "Elimina"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-err">{error}</p>}
      <ConfirmDialog
        open={open}
        title="Eliminare la richiesta?"
        tone="danger"
        message={
          <>
            La richiesta di <strong className="text-ink">{businessName || "(senza nome)"}</strong> sparisce con tutti i suoi
            dati: risposte del form, foto e logo. Niente resta in n8n (non conserva le esecuzioni riuscite). La cartella
            finisce nel Cestino di Google Drive, che si svuota da solo dopo 30 giorni.
          </>
        }
        confirmLabel="Elimina la richiesta"
        onConfirm={elimina}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
