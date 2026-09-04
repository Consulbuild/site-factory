"use client";

// Dialog condiviso di eliminazione forte del cliente (lista + hub):
// richiede la ragione sociale digitata; il server la riverifica (422).
// Decisione Mattia 2026-07-11: eliminazione diretta, niente archivio.

import { useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";

export function EliminaClienteDialog({
  open,
  slug,
  businessName,
  haSitoOnline,
  onClose,
  onDeleted,
}: {
  open: boolean;
  slug: string;
  businessName: string;
  haSitoOnline: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [nome, setNome] = useState("");
  const [errore, setErrore] = useState<string | null>(null);

  async function elimina() {
    setErrore(null);
    const res = await fetch(`/api/clients/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    if (res.ok) {
      setNome("");
      onDeleted();
    } else {
      const data = await res.json().catch(() => ({}));
      setErrore(data.error ?? `errore ${res.status}`);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title="Eliminare il cliente?"
      tone="danger"
      message={
        <>
          Verrà cancellata la cartella <span className="mono">out/{slug}</span> con tutti gli artifact (contesto,
          palette, copy, immagini, build). La submission su Tally resta e potrà essere reimportata.
          {haSitoOnline && (
            <>
              {" "}
              <strong className="text-warn">Il sito già pubblicato resta online finché non lo rimuovi da Cloudflare</strong>, ma
              viene tolto da monitor, registro del modulo e statistiche: il suo form smetterà di funzionare.
            </>
          )}
          <span className="mt-3 block">
            Per confermare digita <strong className="text-ink">{businessName}</strong>
          </span>
        </>
      }
      confirmLabel="Elimina definitivamente"
      confirmDisabled={nome.trim() !== businessName}
      onConfirm={elimina}
      onCancel={() => {
        setNome("");
        setErrore(null);
        onClose();
      }}
    >
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={businessName}
        className="mt-3"
        aria-label="Digita il nome del cliente per confermare"
        autoFocus
      />
      {errore && <p className="mt-2 text-sm text-err">{errore}</p>}
    </ConfirmDialog>
  );
}
