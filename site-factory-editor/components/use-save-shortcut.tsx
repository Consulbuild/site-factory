"use client";

// ⌘S / Ctrl+S = Salva nella scheda corrente (DESIGN-REFACTOR §4, tastiera
// quotidiana). Previene il salvataggio-pagina del browser.

import { useEffect } from "react";

export function useSaveShortcut(onSave: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSave, enabled]);
}
