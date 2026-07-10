"use client";

// Guardia "modifiche non salvate": mentre `dirty` è true, avvisa prima di
// uscire dalla scheda — sia con il beforeunload nativo (refresh/chiusura tab),
// sia intercettando la navigazione interna (link di ritorno al menù/dashboard).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./confirm-dialog";

export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // richiesto da alcuni browser per mostrare il prompt
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  /** Naviga verso href; se ci sono modifiche non salvate, chiede conferma. */
  const navigate = useCallback(
    (href: string) => {
      if (dirty) setPending(href);
      else router.push(href);
    },
    [dirty, router],
  );

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title="Modifiche non salvate"
      message="Hai modifiche non salvate in questa scheda. Se esci ora vengono perse."
      confirmLabel="Esci senza salvare"
      cancelLabel="Resta"
      tone="danger"
      onConfirm={() => {
        const href = pending!;
        setPending(null);
        router.push(href);
      }}
      onCancel={() => setPending(null)}
    />
  );

  return { navigate, dialog };
}
