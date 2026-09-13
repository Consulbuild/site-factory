"use client";

// Riga Logo dell'hub: miniatura del lockup in uso + «Varianti» che apre inline
// le 3-6 proposte di GPT Image con il motivo del critico e «Usa questa»
// (copia + favicon, nessuna rigenerazione: le varianti restano salvate, si
// cambia idea senza spendere). Niente scheda dedicata: è il minimo per
// cambiare logo nel controllo finale senza passare da una chat.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnGhost, btnSecondary } from "./ui";

export type VarianteLogo = { file: string; esito: string; motivo?: string };

export function LogoVarianti({ slug, scelta, varianti }: { slug: string; scelta: string; varianti: VarianteLogo[] }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(!scelta); // senza scelta le varianti sono la prossima azione: aperte
  const [busy, setBusy] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [v, setV] = useState(0); // cache-buster della miniatura dopo un cambio
  const nome = (file: string) => file.replace(/^logo\//, "");

  async function usa(file: string) {
    setBusy(file);
    setErrore(null);
    const res = await fetch(`/api/clients/${slug}/logo/varianti`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scelta: nome(file) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setErrore(String(data.error ?? `errore ${res.status}`));
      return;
    }
    setV((n) => n + 1);
    setAperto(false);
    router.refresh();
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-3">
        {scelta ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/clients/${slug}/logo/varianti?f=mark.png&v=${v}`} alt="Logo in uso" className="h-7 w-auto max-w-40 shrink-0" />
        ) : (
          <span className="text-xs text-warn">nessuna variante scelta</span>
        )}
        <button className={btnGhost} onClick={() => setAperto((a) => !a)} aria-expanded={aperto}>
          {aperto ? "Nascondi varianti" : `Varianti (${varianti.length})`}
        </button>
        {errore && <span className="text-xs text-err">{errore}</span>}
      </div>
      {aperto && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Varianti del logo">
          {varianti.map((x) => {
            const inUso = x.file === scelta;
            return (
              <li key={x.file} className={`rounded-ctl border p-3 ${inUso ? "border-brand bg-brand-dim" : "border-line bg-raise"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/clients/${slug}/logo/varianti?f=${nome(x.file)}`} alt="" className="h-16 w-auto max-w-full rounded-ctl bg-surface p-1" />
                <div className="mt-2 min-w-0 text-xs">
                  <div className="mono text-muted">
                    {nome(x.file)} · {inUso ? "in uso" : x.esito}
                  </div>
                  {x.motivo && <p className="mt-0.5 text-muted">{x.motivo}</p>}
                </div>
                {!inUso && (
                  <button className={`${btnSecondary} mt-2`} disabled={busy !== null} onClick={() => usa(x.file)}>
                    {busy === x.file ? "Applico…" : "Usa questa"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
