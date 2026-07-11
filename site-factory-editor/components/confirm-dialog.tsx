"use client";

// Dialog di conferma in-app (non window.confirm: migliore UX e non blocca
// l'automazione browser). Overlay fisso, Esc annulla, focus sul bottone
// primario. `children` ospita contenuto extra (es. l'input «digita il nome»
// delle eliminazioni forti) e `confirmDisabled` ne vincola la conferma.

import { useEffect, useRef } from "react";
import { btnPrimary, btnSecondary } from "./ui";

export interface ConfirmProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "brand";
  confirmDisabled?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Annulla",
  tone = "brand",
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Con contenuto interattivo (input) il focus va lì, non sul bottone.
    if (!children) confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, children]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "inline-flex items-center gap-2 rounded-full bg-err px-4 py-1.5 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      : btnPrimary;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div className="card w-full max-w-md p-5 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-muted">{message}</div>
        {children}
        <div className="mt-5 flex justify-end gap-3">
          <button className={btnSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} className={confirmClass} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
