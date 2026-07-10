"use client";

// Gestione del logo cliente nella scheda intake: preview + carica / sostituisci
// / elimina. Azioni immediate (il file sta su disco, non è un campo del form);
// l'eliminazione è confermata perché distruttiva.

import { useRef, useState } from "react";
import { btnSecondary, btnGhost } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";

export function LogoField({
  slug,
  initialPresent,
  briefLogoText,
}: {
  slug: string;
  initialPresent: boolean;
  briefLogoText: string;
}) {
  const [present, setPresent] = useState(initialPresent);
  const [version, setVersion] = useState(0); // cache-bust della preview
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chiediElimina, setChiediElimina] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function carica(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/clients/${slug}/logo`, { method: "PUT", body });
    setBusy(false);
    if (res.ok) {
      setPresent(true);
      setVersion((v) => v + 1);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? `errore ${res.status}`);
    }
  }

  async function elimina() {
    setChiediElimina(false);
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/clients/${slug}/logo`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setPresent(false);
      setVersion((v) => v + 1);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? `errore ${res.status}`);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {present ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/clients/${slug}/logo?v=${version}`}
            alt="Logo del cliente"
            className="max-h-16 max-w-40 rounded-md border border-line bg-surface object-contain p-2"
          />
        ) : (
          <span className="text-sm text-muted">Nessun file logo.</span>
        )}
        <span className="text-xs text-faint">{briefLogoText}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) carica(f);
            e.target.value = ""; // permette di ricaricare lo stesso file
          }}
        />
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "…" : present ? "Sostituisci" : "Carica logo"}
        </button>
        {present && (
          <button type="button" className={`${btnGhost} text-err hover:text-err`} disabled={busy} onClick={() => setChiediElimina(true)}>
            Elimina
          </button>
        )}
        <span className="text-xs text-faint">PNG, JPG, SVG o WebP · max 5 MB</span>
      </div>

      {error && <p className="mt-1 text-sm text-err">{error}</p>}

      <ConfirmDialog
        open={chiediElimina}
        title="Eliminare il logo?"
        message="Il file del logo verrà rimosso da questo cliente. Potrai caricarne uno nuovo in qualsiasi momento."
        confirmLabel="Elimina logo"
        cancelLabel="Annulla"
        tone="danger"
        onConfirm={elimina}
        onCancel={() => setChiediElimina(false)}
      />
    </div>
  );
}
