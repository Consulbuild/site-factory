"use client";

// Barra di navigazione in testa alle schede: breadcrumb (Clienti = menù
// principale, nome = dashboard cliente) + bottone esplicito di ritorno.
// `onNavigate` passa dalla guardia dirty quando la scheda ha modifiche.

import { btnSecondary } from "./ui";

export function BackBar({
  slug,
  businessName,
  step,
  onNavigate,
}: {
  slug: string;
  businessName: string;
  step: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <nav className="min-w-0 truncate text-sm text-muted">
        <button onClick={() => onNavigate("/")} className="hover:text-ink">
          Clienti
        </button>{" "}
        /{" "}
        <button onClick={() => onNavigate(`/clienti/${slug}`)} className="hover:text-ink">
          {businessName}
        </button>{" "}
        / <span className="text-ink">{step}</span>
      </nav>
      <button onClick={() => onNavigate(`/clienti/${slug}`)} className={`${btnSecondary} shrink-0`}>
        ← Torna al cliente
      </button>
    </div>
  );
}
