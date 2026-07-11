"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { btnPrimary } from "@/components/ui";

// Pannello "nuova run": selezione dei riferimenti USABILI (attestati,
// opt-out consentito, estratti) — il gate ≥3 vive anche server-side.

export function NuovaRun({ usabili, totale }: { usabili: { id: string; url: string }[]; totale: number }) {
  const router = useRouter();
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [creando, setCreando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const toggle = (id: string) =>
    setScelti((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function crea() {
    setCreando(true);
    setErrore(null);
    try {
      const res = await fetch("/api/factory/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references: [...scelti] }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `richiesta rifiutata (${res.status})`);
      setScelti(new Set());
      router.push(`/fabbrica/run/${body.runId}`);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
      setCreando(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold">Nuova run</h3>
      {usabili.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Nessun riferimento usabile{totale > 0 ? ` (${totale} registrati, nessuno con opt-out consentito ed estrazione)` : ""}.{" "}
          <Link href="/fabbrica/riferimenti" className="text-brand hover:underline">
            Aggiungi riferimenti →
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            Scegli ALMENO 3 riferimenti eterogenei (mai un sito singolo come modello).
          </p>
          <ul className="mt-3 space-y-1.5">
            {usabili.map((r) => (
              <li key={r.id}>
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={scelti.has(r.id)} onChange={() => toggle(r.id)} disabled={creando} />
                  <span className="mono truncate">{r.url}</span>
                </label>
              </li>
            ))}
          </ul>
          {errore && (
            <p className="mt-3 rounded-md bg-err-bg px-3 py-2 text-sm text-err" role="alert">
              {errore}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted">{scelti.size}/3 minimi selezionati</span>
            <button type="button" className={btnPrimary} onClick={crea} disabled={creando || scelti.size < 3}>
              {creando ? "Creazione…" : "Crea run"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
