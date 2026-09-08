"use client";

// Testata dell'hub cliente: contatti a copia rapida + menu azioni
// (apri sito, elimina forte). Niente re-import: la richiesta del form viene
// tolta da _inbox all'import (lib/inbox-form.ts).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ExternalLink, Trash2, Phone, Mail } from "lucide-react";
import { EliminaClienteDialog } from "./elimina-cliente-dialog";

function CopiaChip({
  icona: Icona,
  valore,
  label,
  urgente = false,
}: {
  icona: typeof Phone;
  valore: string;
  label: string;
  /** Sito giù: il telefono diventa l'azione, in rosso (dashboard). */
  urgente?: boolean;
}) {
  const [copiato, setCopiato] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(valore);
        setCopiato(true);
        setTimeout(() => setCopiato(false), 1200);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 ${
        urgente
          ? "border-transparent bg-err-bg font-semibold text-err hover:border-err"
          : "border-line bg-surface text-muted hover:bg-raise hover:text-ink"
      }`}
      title={`Copia ${label}`}
    >
      <Icona className="size-3.5" aria-hidden />
      {copiato ? "Copiato ✓" : urgente ? `Chiama · ${valore}` : valore}
    </button>
  );
}

export function ClienteAzioni({
  slug,
  businessName,
  telefono,
  email,
  deployUrl,
  sitoGiu = false,
}: {
  slug: string;
  businessName: string;
  telefono?: string;
  email?: string;
  deployUrl?: string;
  /** Dal monitor (dashboard): a sito giù l'azione è chiamare il referente. */
  sitoGiu?: boolean;
}) {
  const router = useRouter();
  const [eliminaAperto, setEliminaAperto] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {telefono && <CopiaChip icona={Phone} valore={telefono} label="telefono" urgente={sitoGiu} />}
      {email && <CopiaChip icona={Mail} valore={email} label="email" />}
      <details className="relative">
        <summary
          className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-raise hover:text-ink [&::-webkit-details-marker]:hidden"
          aria-label={`Azioni per ${businessName}`}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </summary>
        <div className="card absolute right-0 z-20 mt-1 w-60 p-1 shadow-raise">
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-ctl px-3 py-2 text-sm hover:bg-raise"
            >
              <ExternalLink className="size-4 text-muted" aria-hidden /> Apri il sito online
            </a>
          )}
          {deployUrl && <div className="my-1 border-t border-line" />}
          <button
            className="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-sm text-err hover:bg-err-bg"
            onClick={(e) => {
              (e.target as HTMLElement).closest("details")?.removeAttribute("open");
              setEliminaAperto(true);
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Elimina cliente…
          </button>
        </div>
      </details>

      <EliminaClienteDialog
        open={eliminaAperto}
        slug={slug}
        businessName={businessName}
        haSitoOnline={!!deployUrl}
        onClose={() => setEliminaAperto(false)}
        onDeleted={() => {
          setEliminaAperto(false);
          router.push("/");
          router.refresh();
        }}
      />
    </div>
  );
}
