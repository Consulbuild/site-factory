"use client";

// Scheda Palette (DESIGN-BRIEF.md §Scheda Palette): la mini-preview è la
// protagonista — i colori si giudicano VISTI applicati, non da un hex.
// Controlli + tabella WCAG la servono; il gate autoritativo è server-side.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESETS, PRESET_KEYS, type PresetKey } from "@/lib/presets";
import type { PaletteArtifact } from "@/lib/schemas";
import { contrastRatio, fixUntilPass, isHex6, versoCorrezione } from "@/lib/wcag";
import { btnPrimary, btnSecondary, btnGhost } from "./ui";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { useSaveShortcut } from "./use-save-shortcut";
import { useStepRun, RunLog } from "./use-step-run";
import { BackBar } from "./back-bar";
import { ConfirmDialog } from "./confirm-dialog";

/** Estratto del contesto che serve a giudicare la coerenza della scelta. */
export interface ContestoRef {
  settore: string;
  registro: string;
  colori: string;
}

export function PaletteEditor({
  slug,
  businessName,
  initial,
  contestoRef,
  stale = [],
  presetAssegnato = null,
  verificato: verificatoIniziale,
}: {
  slug: string;
  businessName: string;
  initial: PaletteArtifact;
  contestoRef: ContestoRef | null;
  /** File a monte cambiati dopo la generazione (vuoto = fresco). */
  stale?: string[];
  /** Preset dell'assegnazione deterministica (design.json), per la nota override. */
  presetAssegnato?: string | null;
  verificato: boolean;
}) {
  const router = useRouter();
  const [preset, setPreset] = useState<PresetKey>(initial["brand.preset"]);
  const [primary, setPrimary] = useState(initial["brand.palette.primary"]);
  const [accent, setAccent] = useState(initial["brand.palette.accent"]);
  const [sameAccent, setSameAccent] = useState(
    initial["brand.palette.primary"] === initial["brand.palette.accent"],
  );
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [chiediRigenera, setChiediRigenera] = useState(false);
  const { navigate, dialog } = useUnsavedGuard(dirty);
  const runner = useStepRun(slug, "palette");
  useSaveShortcut(() => {
    if (!busy && !runner.running) salva();
  });

  const p = PRESETS[preset];
  const accentEff = sameAccent ? primary : accent;
  const hexOk = isHex6(primary) && isHex6(accentEff);
  const verificato = verificatoIniziale && !dirty;

  // Le stesse 3 coppie del gate della skill, ricalcolate live per il display.
  // La terza copre il guardrail del renderer: sulle bande scure le CTA
  // passano all'accent col testo bianco (il ratio è simmetrico, quindi
  // fg=accent per mostrare la swatch giusta e correggere l'accent).
  const pairs = useMemo(() => {
    if (!hexOk) return [];
    return [
      { label: "Testo bianco sui bottoni", fg: primary, bg: "#ffffff", need: 4.5, set: setPrimary },
      { label: "Parola accent sui titoli", fg: accentEff, bg: p.neutri.bg, need: 3, set: sameAccent ? setPrimary : setAccent },
      { label: "Testo bianco sulle CTA accent (bande scure)", fg: accentEff, bg: "#ffffff", need: 4.5, set: sameAccent ? setPrimary : setAccent },
    ].map((c) => {
      const ratio = contrastRatio(c.fg, c.bg);
      return { ...c, ratio, pass: ratio >= c.need };
    });
  }, [hexOk, primary, accentEff, p.neutri.bg, sameAccent]);
  const allPass = hexOk && pairs.every((c) => c.pass);

  function toArtifact(): PaletteArtifact {
    return {
      "brand.preset": preset,
      "brand.palette.primary": primary.toLowerCase(),
      "brand.palette.accent": accentEff.toLowerCase(),
    };
  }

  async function salva(): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/clients/${slug}/palette`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ palette: toArtifact() }),
    });
    setBusy(false);
    if (res.ok) {
      // Una sola fonte di verità: un preset diverso dall'assegnazione viene
      // registrato come override umano in design.json (stesso endpoint del
      // pannello Assegnazione) — palette.json e design.json non divergono più.
      if (presetAssegnato && preset !== presetAssegnato) {
        await fetch(`/api/clients/${slug}/design`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preset }),
        }).catch(() => {});
      }
      setDirty(false);
      setMsg({ tone: "ok", text: "Salvata ✓" });
      return true;
    }
    const d = await res.json().catch(() => ({}));
    setMsg({ tone: "err", text: d.error ?? `errore ${res.status}` });
    return false;
  }

  async function conferma() {
    if (!(await salva())) return;
    setBusy(true);
    const res = await fetch(`/api/clients/${slug}/palette`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      router.push(`/clienti/${slug}`);
      router.refresh();
      return;
    }
    const d = await res.json().catch(() => ({}));
    setMsg({ tone: "err", text: d.error ?? `errore ${res.status}` });
  }

  async function vaBeneCosi() {
    await fetch(`/api/clients/${slug}/steps/palette/ack-upstream`, { method: "POST" });
    router.refresh();
  }

  const touch = () => {
    setDirty(true);
    setMsg(null);
  };

  return (
    <div className="pb-24">
      {dialog}
      <ConfirmDialog
        open={chiediRigenera}
        title="Rigenerare la palette con l'AI?"
        message="Il palette-designer riparte dal contesto corrente e sovrascrive preset e colori attuali, comprese le modifiche fatte a mano."
        confirmLabel="Rigenera"
        onConfirm={() => {
          setChiediRigenera(false);
          setDirty(false);
          runner.run("generate", "Rigenerazione della palette dal contesto corrente…");
        }}
        onCancel={() => setChiediRigenera(false)}
      />
      <BackBar slug={slug} businessName={businessName} step="Palette" onNavigate={navigate} />

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Palette e preset</h1>
          {contestoRef && (
            <p className="mt-1 text-sm text-muted">
              Dal contesto: {contestoRef.settore}
              {contestoRef.registro ? <> · tono {contestoRef.registro}</> : null}
              {contestoRef.colori ? (
                <>
                  {" "}
                  · colori del cliente: <span className="mono rounded bg-surface px-1.5 py-0.5">«{contestoRef.colori}»</span>
                </>
              ) : null}
            </p>
          )}
        </div>
        <button className={`${btnGhost} shrink-0`} onClick={() => setChiediRigenera(true)} disabled={runner.running}>
          ⟳ Rigenera con l&apos;AI
        </button>
      </div>

      {runner.running || runner.log.length > 0 ? (
        <div className="mt-4">
          {runner.running && <p className="text-sm text-brand">Rigenerazione in corso (claude -p)…</p>}
          <RunLog log={runner.log} />
        </div>
      ) : (
        stale.length > 0 && (
          <div className="mt-4 rounded-ctl border border-warn/40 bg-warn-bg px-4 py-3 text-sm">
            <p className="font-medium text-warn">⚠ Cambiato a monte dopo la generazione della palette</p>
            <p className="mono mt-1 text-warn">{stale.join(" · ")}</p>
            <p className="mt-1 text-warn">
              Settore, tono o colori del cliente potrebbero essere diversi: controlla che preset e colori siano ancora
              coerenti.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={btnPrimary}
                onClick={() => {
                  setDirty(false);
                  runner.run("generate", "Rigenerazione della palette dal contesto aggiornato…");
                }}
                title="Il palette-designer riparte dal contesto corrente (sovrascrive le scelte attuali)"
              >
                Rigenera palette
              </button>
              <button className={btnGhost} onClick={vaBeneCosi}>
                Va bene così
              </button>
            </div>
          </div>
        )
      )}

      {verificato && (
        <p className="mt-4 rounded-ctl bg-ok-bg px-4 py-2 text-sm text-ok">✓ Palette confermata. Puoi ancora modificarla.</p>
      )}

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        {/* CONTROLLI */}
        <div className="w-full shrink-0 lg:w-95">
          <label className="mb-1 block text-sm text-muted" htmlFor="preset">
            Preset estetico
          </label>
          <select
            id="preset"
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value as PresetKey);
              touch();
            }}
          >
            {PRESET_KEYS.map((k) => (
              <option key={k} value={k}>
                {PRESETS[k].nome} — {PRESETS[k].per}
              </option>
            ))}
          </select>
          <div className="mt-2 rounded-ctl border border-line bg-surface px-3 py-2.5 text-sm">
            <p className="text-ink">{p.estetica}</p>
            <p className="mt-1.5 flex items-center gap-2 text-muted">
              <span className="inline-flex overflow-hidden rounded border border-line">
                {[p.neutri.bg, p.neutri.surface, p.neutri.ink].map((c) => (
                  <span key={c} className="size-4" style={{ background: c }} title={c} />
                ))}
              </span>
              neutri del preset · font: {p.fontLabel}
              {presetAssegnato && preset !== presetAssegnato && (
                <span className="mt-1 block text-warn">
                  Diverso dall'assegnazione deterministica ({presetAssegnato}): al salvataggio viene registrato come
                  override umano.
                </span>
              )}
            </p>
          </div>

          <ColorField id="primary" label="Primary (bottoni, CTA)" value={primary} onChange={(v) => { setPrimary(v); touch(); }} />
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="size-4 w-auto"
              checked={sameAccent}
              onChange={(e) => {
                setSameAccent(e.target.checked);
                if (!e.target.checked) setAccent(primary);
                touch();
              }}
            />
            Accent uguale al primary (lo standard: un solo colore di marca)
          </label>
          {!sameAccent && (
            <ColorField id="accent" label="Accent (parola nei titoli, link)" value={accent} onChange={(v) => { setAccent(v); touch(); }} />
          )}

          {/* CONTRASTO */}
          <h2 className="mt-6 mb-2 text-xs font-semibold tracking-wide text-faint uppercase">Contrasto WCAG AA</h2>
          {!hexOk && <p className="text-sm text-err">Inserisci colori hex a 6 cifre (es. #b0561a).</p>}
          <ul className="divide-y divide-line rounded-ctl border border-line text-sm">
            {pairs.map((c) => (
              <li key={c.label} className="px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="size-3.5 rounded-sm border border-line" style={{ background: c.fg }} />
                    {c.label}
                  </span>
                  <span className={`mono ${c.pass ? "text-ok" : "text-err"}`}>
                    {c.ratio.toFixed(2)}:1 ≥{c.need} {c.pass ? "✓" : "✗"}
                  </span>
                </div>
                {!c.pass && (
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-err">
                    <span className="text-xs">Il minimo AA non è rispettato: correggi la tinta.</span>
                    <button
                      type="button"
                      className="rounded-ctl bg-err-bg px-2 py-1 text-xs font-medium hover:opacity-80"
                      onClick={() => {
                        const fixed = fixUntilPass(c.fg, c.bg, c.need);
                        if (fixed) {
                          c.set(fixed);
                          touch();
                        }
                      }}
                    >
                      {versoCorrezione(c.fg, c.bg)} finché passa
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-faint">
            Verifica indicativa live; al salvataggio fa fede il gate della pipeline (check-contrast).
          </p>
        </div>

        {/* ANTEPRIMA */}
        <Preview preset={preset} primary={hexOk ? primary : "#888888"} accent={hexOk ? accentEff : "#888888"} />
      </div>

      {/* ACTION BAR */}
      <div className="fixed inset-x-0 bottom-(--statusbar-offset) border-t border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-4 px-6 py-3">
          {msg && <span className={`text-sm ${msg.tone === "ok" ? "text-ok" : "text-err"}`}>{msg.text}</span>}
          {!allPass && hexOk && <span className="text-sm text-err">contrasto AA non superato</span>}
          <button type="button" className={btnSecondary} onClick={salva} disabled={busy || !allPass}>
            {busy ? "…" : "Salva"}
          </button>
          <button type="button" className={btnPrimary} onClick={conferma} disabled={busy || !allPass}>
            Conferma palette
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-4">
      <label className="mb-1 block text-sm text-muted" htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (selettore)`}
          value={isHex6(value) ? value : "#888888"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-ctl border border-field bg-surface p-1"
        />
        <input id={id} value={value} onChange={(e) => onChange(e.target.value.trim())} className="mono" spellCheck={false} />
      </div>
    </div>
  );
}

/**
 * Mini-preview fedele alla grammatica ConsulBuild (eyebrow con lineetta, H2
 * con parola accent, CTA) coi neutri e i font VERI del preset. È un'anteprima
 * indicativa — il sito reale arriverà con la scheda Build.
 */
function Preview({ preset, primary, accent }: { preset: PresetKey; primary: string; accent: string }) {
  const p = PRESETS[preset];
  // Variante "section-dark": il renderer ricolora da solo su fondo scuro;
  // qui l'approssimazione è ink come fondo e bg come testo (nova: ancora più scuro).
  const darkBg = p.scuro ? "#050508" : p.neutri.ink;
  const darkInk = p.scuro ? p.neutri.ink : p.neutri.bg;
  return (
    <div className="min-w-0 flex-1">
      {/* React 19 issa il link nel <head>; carica solo i font del preset attivo. */}
      <link rel="stylesheet" href={p.fontsHref} precedence="default" />
      <div className="overflow-hidden card">
        <section className="px-8 py-10" style={{ background: p.neutri.bg, color: p.neutri.ink, fontFamily: p.fontBody }}>
          <Eyebrow accent={accent}>Impresa edile · {p.nome}</Eyebrow>
          <h2 className="mt-3 text-3xl leading-tight font-bold text-balance" style={{ fontFamily: p.fontHeading }}>
            La tua casa, <span style={{ color: accent }}>chiavi in mano</span>
          </h2>
          <p className="mt-3 max-w-md text-[15px]" style={{ opacity: 0.85 }}>
            Costruzione e ristrutturazione con un unico referente, dal progetto alla consegna.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="rounded-ctl px-4 py-2 text-sm font-semibold" style={{ background: primary, color: "#ffffff" }}>
              Preventivo gratuito
            </span>
            <span className="text-sm font-medium underline underline-offset-4" style={{ color: accent }}>
              I nostri servizi
            </span>
          </div>
          <div className="mt-6 rounded-ctl px-4 py-3 text-sm" style={{ background: p.neutri.surface }}>
            Card su superficie del preset — testo secondario di prova.
          </div>
        </section>
        <section className="px-8 py-8" style={{ background: darkBg, color: darkInk, fontFamily: p.fontBody }}>
          <Eyebrow accent={accent}>Sezione scura</Eyebrow>
          <h3 className="mt-2 text-xl font-bold text-balance" style={{ fontFamily: p.fontHeading }}>
            Il ritmo <span style={{ color: accent }}>scuro/chiaro</span> dello standard
          </h3>
          <div className="mt-4">
            <span className="rounded-ctl px-4 py-2 text-sm font-semibold" style={{ background: primary, color: "#ffffff" }}>
              Contattaci
            </span>
          </div>
        </section>
      </div>
      <p className="mt-1.5 text-xs text-faint">Anteprima indicativa coi font e i neutri del preset — non è il sito reale.</p>
    </div>
  );
}

function Eyebrow({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase" style={{ color: accent }}>
      <span className="inline-block h-px w-6" style={{ background: accent }} />
      {children}
    </p>
  );
}
