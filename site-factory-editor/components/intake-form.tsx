"use client";

// Revisione intake: form denso a gruppi (label a sinistra), flag qualità
// inline sotto il campo interessato, dual-write al salvataggio.

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pivaValida } from "@/lib/piva";
import { btnPrimary, btnGhost } from "./ui";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { BackBar } from "./back-bar";
import { LogoField } from "./logo-field";

type Brief = Record<string, unknown> & { _da_verificare?: string[] };

// Pattern flag → campo interessato (il flag compare inline sotto quel campo).
const FLAG_FIELD: Array<[RegExp, string]> = [
  [/città non estraibile/, "citta"],
  [/senza CAP/, "indirizzo"],
  [/social dichiarato senza link/, "social"],
  [/anno di inizio/, "anno_inizio"],
  [/email sospetta/, "email"],
];

function flagField(flag: string): string | null {
  for (const [re, field] of FLAG_FIELD) if (re.test(flag)) return field;
  return null;
}

const SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "linkedin"] as const;

// I componenti di layout DEVONO stare a livello di modulo: se definiti dentro
// IntakeForm, a ogni render cambierebbe la loro identità e React rimonterebbe
// gli input, facendo perdere il focus dopo ogni carattere digitato.
// I flag e l'handler «risolvi» arrivano via context (evita di passarli a ogni Riga).
const FlagCtx = createContext<{ flags: string[]; risolvi: (f: string) => void }>({
  flags: [],
  risolvi: () => {},
});

function Flags({ campo }: { campo: string }) {
  const { flags, risolvi } = useContext(FlagCtx);
  const own = flags.filter((f) => flagField(f) === campo);
  if (own.length === 0) return null;
  return (
    <>
      {own.map((f) => (
        <div
          key={f}
          className="col-start-2 flex items-start justify-between gap-3 rounded-ctl bg-warn-bg px-3 py-2 text-sm text-warn"
        >
          <span>⚠ {f}</span>
          <button type="button" className="shrink-0 text-xs underline hover:no-underline" onClick={() => risolvi(f)}>
            Risolto ✕
          </button>
        </div>
      ))}
    </>
  );
}

function Riga({
  label,
  campo,
  children,
  hint,
}: {
  label: string;
  campo?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-[11rem_1fr] items-start gap-x-4 gap-y-1.5 py-2">
      <label className="pt-1.5 text-sm text-muted">{label}</label>
      <div>{children}</div>
      {hint && <p className="col-start-2 text-xs text-faint">{hint}</p>}
      {campo && <Flags campo={campo} />}
    </div>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-5 first:border-t-0">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">{titolo}</h2>
      {children}
    </section>
  );
}

const daConfermare = (v: string) => (v.includes("DA CONFERMARE") ? { style: { borderColor: "var(--color-warn)" } } : {});

export function IntakeForm({
  slug,
  businessName,
  initialBrief,
  whatsappIniziale,
  hasLogoFile,
}: {
  slug: string;
  businessName: string;
  initialBrief: Brief;
  whatsappIniziale: string;
  hasLogoFile: boolean;
}) {
  const router = useRouter();
  const [brief, setBrief] = useState<Brief>(initialBrief);
  const [whatsapp, setWhatsapp] = useState(whatsappIniziale);
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { navigate, dialog } = useUnsavedGuard(dirty);

  const flags = (brief._da_verificare ?? []) as string[];
  const social = (brief.social ?? {}) as Record<string, string>;

  const set = (k: string, v: unknown) => {
    setBrief((b) => ({ ...b, [k]: v }));
    setSalvato(false);
    setDirty(true);
  };
  const risolvi = (flag: string) =>
    set("_da_verificare", flags.filter((f) => f !== flag));

  const str = (k: string) => String(brief[k] ?? "");
  const righe = (k: string) => ((brief[k] ?? []) as string[]).join("\n");
  const setRighe = (k: string, v: string) =>
    set(k, v.split("\n").map((r) => r.trim()).filter(Boolean));

  const pivaOk = useMemo(() => pivaValida(str("partita_iva")), [brief]);

  async function salva() {
    setBusy(true);
    setErrore(null);
    const res = await fetch(`/api/clients/${slug}/intake`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, whatsapp }),
    });
    setBusy(false);
    if (res.ok) {
      setSalvato(true);
      setDirty(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setErrore(data.error ?? `errore ${res.status}`);
    }
  }

  const flagsOrfani = flags.filter((f) => flagField(f) === null);

  return (
    <FlagCtx.Provider value={{ flags, risolvi }}>
    <div className="mx-auto max-w-3xl pb-24">
      {dialog}
      <BackBar slug={slug} businessName={businessName} step="Intake" onNavigate={navigate} />
      <h1 className="mt-4 text-xl font-semibold">Revisione dati form</h1>
      <p className="mt-1 text-sm text-muted">
        Correggi qui i dati prima di passarli agli agenti: ogni campo salvato riscrive brief e slot in modo coerente.
      </p>
      {flags.length > 0 && (
        <div className="mt-5 rounded-ctl border border-warn/30 bg-warn-bg px-4 py-3 text-sm text-warn">
          ⚠ {flags.length === 1 ? "1 punto da verificare" : `${flags.length} punti da verificare`} — sono segnalati
          accanto ai campi. Correggi il valore e premi «Risolto».
          {flagsOrfani.map((f) => (
            <div key={f} className="mt-2 flex items-start justify-between gap-3">
              <span>⚠ {f}</span>
              <button type="button" className="shrink-0 text-xs underline hover:no-underline" onClick={() => risolvi(f)}>
                Risolto ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          salva();
        }}
      >
        <Gruppo titolo="Anagrafica">
          <Riga label="Ragione sociale" campo="azienda">
            <input value={str("azienda")} onChange={(e) => set("azienda", e.target.value)} />
          </Riga>
          <Riga label="Partita IVA" campo="partita_iva">
            <div className="flex items-center gap-3">
              <input className="mono max-w-48" value={str("partita_iva")} onChange={(e) => set("partita_iva", e.target.value)} />
              {str("partita_iva") &&
                (pivaOk ? (
                  <span className="text-xs text-ok">✓ checksum valido</span>
                ) : (
                  <span className="text-xs text-err">✗ checksum non valido</span>
                ))}
            </div>
          </Riga>
          <Riga label="Anno inizio attività" campo="anno_inizio">
            <input className="mono max-w-32" value={str("anno_inizio")} onChange={(e) => set("anno_inizio", e.target.value)} />
          </Riga>
          <Riga label="Indirizzo" campo="indirizzo">
            <input value={str("indirizzo")} onChange={(e) => set("indirizzo", e.target.value)} />
          </Riga>
          <Riga label="Città" campo="citta">
            <input value={str("citta")} onChange={(e) => set("citta", e.target.value)} {...daConfermare(str("citta"))} />
          </Riga>
          <Riga label="Slug" hint="Identificatore del workspace, non modificabile.">
            <span className="mono text-muted">{slug}</span>
          </Riga>
        </Gruppo>

        <Gruppo titolo="Attività">
          <Riga label="Settore / servizi" campo="settore" hint="Testo libero del form: è la fonte primaria dei servizi.">
            <textarea rows={3} value={str("settore")} onChange={(e) => set("settore", e.target.value)} />
          </Riga>
          <Riga label="Descrizione" campo="descrizione">
            <textarea rows={3} value={str("descrizione")} onChange={(e) => set("descrizione", e.target.value)} />
          </Riga>
          <Riga label="Azione principale" campo="azione_principale" hint="Cosa deve fare il visitatore del sito.">
            <input value={str("azione_principale")} onChange={(e) => set("azione_principale", e.target.value)} />
          </Riga>
        </Gruppo>

        <Gruppo titolo="Clienti e obiettivi">
          <Riga label="Clienti" campo="clienti">
            <select className="max-w-48" value={str("clienti")} onChange={(e) => set("clienti", e.target.value)}>
              <option>Privati</option>
              <option>Aziende</option>
              <option>Entrambi</option>
            </select>
          </Riga>
          <Riga label="Cliente tipo" campo="cliente_tipo">
            <textarea rows={3} value={str("cliente_tipo")} onChange={(e) => set("cliente_tipo", e.target.value)} />
          </Riga>
          <Riga label="Area geografica" campo="area_geografica">
            <input className="max-w-64" value={str("area_geografica")} onChange={(e) => set("area_geografica", e.target.value)} />
          </Riga>
          <Riga label="Obiettivi sito" campo="obiettivi_sito" hint="Uno per riga.">
            <textarea rows={4} value={righe("obiettivi_sito")} onChange={(e) => setRighe("obiettivi_sito", e.target.value)} />
          </Riga>
          <Riga label="Canali attuali" campo="canali_attuali" hint="Uno per riga.">
            <textarea rows={3} value={righe("canali_attuali")} onChange={(e) => setRighe("canali_attuali", e.target.value)} />
          </Riga>
        </Gruppo>

        <Gruppo titolo="Presenza online">
          <Riga label="Sito attuale" campo="sito_attuale">
            <input className="max-w-64" value={str("sito_attuale")} onChange={(e) => set("sito_attuale", e.target.value)} />
          </Riga>
          <Riga label="Problemi sito attuale" campo="problemi_sito_attuale">
            <input value={str("problemi_sito_attuale")} onChange={(e) => set("problemi_sito_attuale", e.target.value)} />
          </Riga>
          <Riga label="Social" campo="social" hint="Solo link reali e verificati: finiscono nel footer del sito.">
            <div className="space-y-2">
              {SOCIAL_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-20 text-sm text-muted capitalize">{k}</span>
                  <input
                    placeholder={`https://…`}
                    value={social[k] ?? ""}
                    onChange={(e) => {
                      const next = { ...social };
                      if (e.target.value.trim()) next[k] = e.target.value.trim();
                      else delete next[k];
                      set("social", next);
                    }}
                  />
                </div>
              ))}
            </div>
          </Riga>
        </Gruppo>

        <Gruppo titolo="Materiali">
          <Riga label="Logo" campo="logo">
            <LogoField slug={slug} initialPresent={hasLogoFile} briefLogoText={str("logo")} />
          </Riga>
          <Riga label="Foto professionali" campo="foto_professionali">
            <input value={str("foto_professionali")} onChange={(e) => set("foto_professionali", e.target.value)} />
          </Riga>
          <Riga label="Colori preferiti" campo="colori">
            <input value={str("colori")} onChange={(e) => set("colori", e.target.value)} />
          </Riga>
          <Riga label="Tono preferito" campo="tono_preferito">
            <input value={str("tono_preferito")} onChange={(e) => set("tono_preferito", e.target.value)} />
          </Riga>
          <Riga label="Da evitare" campo="da_evitare">
            <input value={str("da_evitare")} onChange={(e) => set("da_evitare", e.target.value)} />
          </Riga>
        </Gruppo>

        <Gruppo titolo="Contatti">
          <Riga label="Referente" campo="referente">
            <input value={str("referente")} onChange={(e) => set("referente", e.target.value)} />
          </Riga>
          <Riga label="Email" campo="email">
            <input type="email" className="max-w-80" value={str("email")} onChange={(e) => set("email", e.target.value)} />
          </Riga>
          <Riga label="Telefono" campo="telefono">
            <input className="mono max-w-56" value={str("telefono")} onChange={(e) => set("telefono", e.target.value)} />
          </Riga>
          <Riga
            label="WhatsApp"
            hint="Il form non lo chiede: il parser lo imposta uguale al telefono. Correggilo se il numero WhatsApp è diverso."
          >
            <input
              className="mono max-w-56"
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(e.target.value);
                setSalvato(false);
                setDirty(true);
              }}
            />
          </Riga>
          <Riga label="Ricontatto preferito" campo="ricontatto_preferito">
            <input className="max-w-48" value={str("ricontatto_preferito")} onChange={(e) => set("ricontatto_preferito", e.target.value)} />
          </Riga>
        </Gruppo>

        <div className="fixed inset-x-0 bottom-(--statusbar-offset) border-t border-line bg-bg/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-end gap-4 px-6 py-3">
            {errore && <span className="text-sm text-err">{errore}</span>}
            {salvato && <span className="text-sm text-ok">Salvato ✓</span>}
            {flags.length > 0 && <span className="text-sm text-warn">{flags.length} flag ancora aperti</span>}
            <button type="button" className={btnGhost} onClick={() => navigate(`/clienti/${slug}`)}>
              Annulla
            </button>
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? "Salvo…" : "Salva e segna verificato"}
            </button>
          </div>
        </div>
      </form>
    </div>
    </FlagCtx.Provider>
  );
}
