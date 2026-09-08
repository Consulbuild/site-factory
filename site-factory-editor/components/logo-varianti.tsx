"use client";

// Riga Logo dell'hub: miniatura del mark in uso + «Varianti» che apre inline
// le 6 proposte del logo-designer con il motivo di scelta/scarto e «Usa questa»
// (ricoloro offline, poi il logo torna da confermare). Niente scheda dedicata:
// è il minimo per cambiare simbolo nel controllo finale senza passare da una chat.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnGhost, btnSecondary } from "./ui";

export type VarianteLogo = { file: string; esito: string; motivo?: string };

export function LogoVarianti({ slug, scelta, varianti }: { slug: string; scelta: string; varianti: VarianteLogo[] }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/clients/${slug}/logo/varianti?f=mark.svg&v=${v}`} alt="Simbolo del logo in uso" className="size-7 shrink-0" />
        <button className={btnGhost} onClick={() => setAperto((a) => !a)} aria-expanded={aperto}>
          {aperto ? "Nascondi varianti" : `Varianti (${varianti.length})`}
        </button>
        {errore && <span className="text-xs text-err">{errore}</span>}
      </div>
      {aperto && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Varianti del simbolo">
          {varianti.map((x) => {
            const inUso = x.file === scelta;
            return (
              <li key={x.file} className={`rounded-ctl border p-3 ${inUso ? "border-brand bg-brand-dim" : "border-line bg-raise"}`}>
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/clients/${slug}/logo/varianti?f=${nome(x.file)}`} alt="" className="size-12 shrink-0 rounded-ctl bg-surface p-1" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="mono text-muted">
                      {nome(x.file)} · {inUso ? "in uso" : x.esito}
                    </div>
                    {x.motivo && <p className="mt-0.5 text-muted">{x.motivo}</p>}
                  </div>
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
