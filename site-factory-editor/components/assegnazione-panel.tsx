"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, btnSecondary } from "@/components/ui";

// Pannello «Assegnazione» (M8): mostra il design deciso deterministicamente
// (preset, motivo leggibile, alternative scartate, vincoli anti-collisione)
// e consente l'override umano — registrato in design.json e nel registro.

export interface AssegnazioneView {
  preset: string;
  motivo: string;
  alternativeScartate: Array<{ preset: string; perche: string }>;
  hueBucketEvitare: number[];
  aakerFonte: string;
}

export function AssegnazionePanel({
  slug,
  design,
  presetsAttivi,
  paletteEsistente,
}: {
  slug: string;
  design: AssegnazioneView | null;
  presetsAttivi: string[];
  paletteEsistente: boolean;
}) {
  const router = useRouter();
  const [scelto, setScelto] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function applica() {
    setInCorso(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/clients/${slug}/design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: scelto }),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok) throw new Error(out?.error ?? `rifiutato (${res.status})`);
      setScelto("");
      router.refresh();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Assegnazione design</h2>
        {design ? <Badge tone="brand">{design.preset}</Badge> : <Badge tone="idle">—</Badge>}
      </div>
      {design ? (
        <>
          <p className="mt-2 text-sm text-muted">{design.motivo}</p>
          <p className="mono mt-1 text-xs text-faint">personalità cliente: {design.aakerFonte}</p>
          {design.hueBucketEvitare.length > 0 && (
            <p className="mt-1 text-xs text-warn">
              Anti-collisione mercato: famiglie di tinta da evitare {design.hueBucketEvitare.join(", ")}
            </p>
          )}
          {design.alternativeScartate.length > 0 && (
            <ul className="mono mt-2 space-y-0.5 text-xs text-muted">
              {design.alternativeScartate.map((a) => (
                <li key={a.preset}>
                  {a.preset}: {a.perche}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Nessuna assegnazione registrata (palette storica, pre-M8): arriverà alla prossima
          generazione della palette.
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <select value={scelto} onChange={(e) => setScelto(e.target.value)} disabled={inCorso}>
          <option value="">Override umano…</option>
          {presetsAttivi
            .filter((p) => p !== design?.preset)
            .map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
        </select>
        <button type="button" className={btnSecondary} onClick={applica} disabled={inCorso || !scelto}>
          {inCorso ? "…" : "Applica"}
        </button>
      </div>
      {paletteEsistente && (
        <p className="mt-2 text-xs text-muted">
          L&apos;override si applica alla PROSSIMA generazione della palette (rigenera per usarlo).
        </p>
      )}
      {errore && (
        <p className="mt-2 rounded-ctl bg-err-bg px-3 py-2 text-xs text-err" role="alert">
          {errore}
        </p>
      )}
    </section>
  );
}
