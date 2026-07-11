"use client";

// Scheda Immagini (DESIGN-BRIEF.md §Scheda Immagini): le immagini sono le
// protagoniste — hero grande, card in griglia, esito del critico INLINE sotto
// ogni thumbnail, rigenerazione selettiva via checkbox. Sotto-componenti a
// module scope (regola anti-remount).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImagesTrace, ImageReview } from "@/lib/schemas";
import { Badge, btnPrimary, btnSecondary, btnGhost } from "./ui";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { useStepRun, RunLog } from "./use-step-run";
import { BackBar } from "./back-bar";
import { ConfirmDialog } from "./confirm-dialog";

const ALT_MAX = 140;
type TraceEntry = ImagesTrace["immagini"][number];
type ReviewEntry = NonNullable<ImageReview>["immagini"][number];

export function ImagesEditor({
  slug,
  businessName,
  trace,
  review,
  stale,
  verificato,
}: {
  slug: string;
  businessName: string;
  trace: ImagesTrace;
  review: ImageReview | null;
  stale: boolean;
  verificato: boolean;
}) {
  const router = useRouter();
  const runner = useStepRun(slug, "images");

  const hero = trace.immagini.find((i) => i.sezione === "hero") ?? null;
  const cards = useMemo(
    () => trace.immagini.filter((i) => i.sezione === "card").sort((a, b) => a.index - b.index),
    [trace],
  );
  const reviewByFile = useMemo(() => {
    const m = new Map<string, ReviewEntry>();
    for (const r of review?.immagini ?? []) m.set(r.file, r);
    return m;
  }, [review]);
  const scarti = useMemo(
    () => (review?.immagini ?? []).filter((r) => r.esito === "scarto").map((r) => r.file),
    [review],
  );

  const [alts, setAlts] = useState<Record<string, string>>(() =>
    Object.fromEntries(trace.immagini.map((i) => [i.file, i.alt])),
  );
  const [dirty, setDirty] = useState(false);
  // Gli scarti del critico partono pre-selezionati per la rigenerazione.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(scarti));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [chiediRigenera, setChiediRigenera] = useState(false);
  const [chiediRegenSel, setChiediRegenSel] = useState(false);

  const { navigate, dialog } = useUnsavedGuard(dirty);

  const setAlt = (file: string, v: string) => {
    setAlts((prev) => ({ ...prev, [file]: v }));
    setDirty(true);
    setMsg(null);
  };
  const toggle = (file: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });

  const altErrors = trace.immagini.filter((i) => {
    const a = alts[i.file] ?? "";
    return !a.trim() || a.length > ALT_MAX;
  }).length;

  async function salva(): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    setServerErrors([]);
    const res = await fetch(`/api/clients/${slug}/images`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alts }),
    });
    setBusy(false);
    if (res.ok) {
      setDirty(false);
      setMsg({ tone: "ok", text: "Salvato." });
      router.refresh();
      return true;
    }
    const data = await res.json().catch(() => ({}));
    setServerErrors(Array.isArray(data.errors) ? data.errors : [data.error ?? `errore ${res.status}`]);
    setMsg({ tone: "err", text: "Alt non validi." });
    return false;
  }

  async function conferma() {
    if (dirty && !(await salva())) return;
    setBusy(true);
    setMsg(null);
    setServerErrors([]);
    const res = await fetch(`/api/clients/${slug}/images`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setMsg({ tone: "ok", text: "Immagini confermate: images.json derivato per la build." });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setServerErrors(Array.isArray(data.errors) ? data.errors : [data.error ?? `errore ${res.status}`]);
      setMsg({ tone: "err", text: "Set non conforme al manifest." });
    }
  }

  async function vaBeneCosi() {
    await fetch(`/api/clients/${slug}/steps/images/ack-upstream`, { method: "POST" });
    router.refresh();
  }

  const regenSelezionate = () => {
    setChiediRegenSel(false);
    setDirty(false);
    setSelected(new Set());
    runner.run("regen", `Rigenerazione selettiva di ${selected.size} immagini (seed nuovo)…`, {
      files: [...selected],
    });
  };

  return (
    <div className="pb-24">
      {dialog}
      <ConfirmDialog
        open={chiediRigenera}
        title="Rigenerare tutte le immagini?"
        message="La pipeline riparte da zero (prompter → critico, fino a 3 round) e sovrascrive tutte le immagini e gli alt, comprese le modifiche fatte a mano. Costo API ~0,3 $."
        confirmLabel="Rigenera tutto"
        onConfirm={() => {
          setChiediRigenera(false);
          setDirty(false);
          runner.run("generate", "Rigenerazione completa delle immagini…");
        }}
        onCancel={() => setChiediRigenera(false)}
      />
      <ConfirmDialog
        open={chiediRegenSel}
        title={`Rigenerare ${selected.size} ${selected.size === 1 ? "immagine" : "immagini"}?`}
        message={
          dirty
            ? "Hai alt non salvati: la rigenerazione ricarica il trace e li perde. Le immagini selezionate vengono rifatte con seed nuovo (poi ripassa il critico)."
            : "Le immagini selezionate vengono rifatte con seed nuovo applicando i fix del critico, poi il critico ripassa sul set."
        }
        confirmLabel="Rigenera"
        onConfirm={regenSelezionate}
        onCancel={() => setChiediRegenSel(false)}
      />
      <BackBar slug={slug} businessName={businessName} step="Immagini" onNavigate={navigate} />

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Immagini del sito</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Hero e card servizi generate con FLUX.2 sul contesto curato. Guardale come le vedrebbe il titolare: mestiere
            giusto, ambienti italiani, zero tell da AI.
          </p>
        </div>
        <button className={`${btnGhost} shrink-0`} onClick={() => setChiediRigenera(true)} disabled={runner.running}>
          ⟳ Rigenera tutto
        </button>
      </div>

      {runner.running || runner.log.length > 0 ? (
        <div className="mt-4">
          {runner.running && <p className="text-sm text-brand">Pipeline immagini in corso (claude -p + FLUX.2)…</p>}
          <RunLog log={runner.log} logRef={runner.logRef} />
        </div>
      ) : (
        <>
          {stale && (
            <div className="mt-4 rounded-ctl border border-warn/40 bg-warn-bg px-4 py-3 text-sm">
              <p className="font-medium text-warn">⚠ Contesto, copy o palette sono cambiati dopo la generazione</p>
              <p className="mt-1 text-warn/90">
                Soggetti delle card, colori dello style bible o identità potrebbero non riflettere le correzioni.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={btnSecondary}
                  onClick={() => {
                    setDirty(false);
                    runner.run("generate", "Rigenerazione completa delle immagini dal contesto corrente…");
                  }}
                >
                  Rigenera da zero
                </button>
                <button className={btnGhost} onClick={vaBeneCosi}>
                  Va bene così
                </button>
              </div>
            </div>
          )}
          <CriticSummary
            review={review}
            scarti={scarti.length}
            totale={trace.immagini.length}
            busy={runner.running}
            onRecheck={() => runner.run("critic", "Nuovo passaggio del critico visivo sul set corrente…")}
          />
        </>
      )}

      {serverErrors.length > 0 && (
        <div className="mt-4 rounded-ctl border border-err/40 bg-err-bg px-4 py-3 text-sm">
          <p className="font-medium text-err">Problemi da sistemare ({serverErrors.length})</p>
          <ul className="mt-1.5 space-y-1">
            {serverErrors.map((e, i) => (
              <li key={i} className="text-err/90">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {verificato && (
        <p className="mt-4 rounded-ctl bg-ok-bg px-4 py-2 text-sm text-ok">
          ✓ Immagini confermate. Puoi ancora modificare gli alt o rigenerare.
        </p>
      )}

      {hero && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">Hero</h2>
          <div className="max-w-2xl">
            <ImageTile
              slug={slug}
              entry={hero}
              review={reviewByFile.get(hero.file)}
              alt={alts[hero.file] ?? ""}
              onAlt={(v) => setAlt(hero.file, v)}
              selected={selected.has(hero.file)}
              onToggle={() => toggle(hero.file)}
              disabled={runner.running}
            />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">Card servizi</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {cards.map((c) => (
            <ImageTile
              key={c.file}
              slug={slug}
              entry={c}
              review={reviewByFile.get(c.file)}
              alt={alts[c.file] ?? ""}
              onAlt={(v) => setAlt(c.file, v)}
              selected={selected.has(c.file)}
              onToggle={() => toggle(c.file)}
              disabled={runner.running}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-faint">
          La galleria «I nostri lavori» usa solo foto reali del cliente (arriveranno da una scheda dedicata): senza foto
          la build la esclude dal sito.
        </p>
      </section>

      {/* ACTION BAR */}
      <div className="fixed inset-x-0 bottom-(--statusbar-offset) border-t border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-4 px-6 py-3">
          {msg && <span className={`text-sm ${msg.tone === "ok" ? "text-ok" : "text-err"}`}>{msg.text}</span>}
          {altErrors > 0 && (
            <span className="text-sm text-err">
              {altErrors} {altErrors === 1 ? "alt da sistemare" : "alt da sistemare"}
            </span>
          )}
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setChiediRegenSel(true)}
            disabled={busy || runner.running || selected.size === 0}
            title={selected.size === 0 ? "Seleziona le immagini da rifare con le checkbox" : undefined}
          >
            Rigenera selezionate{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
          <button type="button" className={btnSecondary} onClick={salva} disabled={busy || runner.running || !dirty}>
            {busy ? "…" : "Salva"}
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={conferma}
            disabled={busy || runner.running || altErrors > 0}
          >
            Conferma immagini
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sotto-componenti (module scope)
// ---------------------------------------------------------------------------

function CriticSummary({
  review,
  scarti,
  totale,
  busy,
  onRecheck,
}: {
  review: ImageReview | null;
  scarti: number;
  totale: number;
  busy: boolean;
  onRecheck: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 card px-4 py-3 text-sm">
      {review ? (
        <>
          <Badge tone={review.verdict === "PASS" ? "ok" : "err"}>
            {review.verdict} · round {review.round}
          </Badge>
          <span className="text-muted">
            {scarti === 0 ? `Nessuno scarto su ${totale} immagini.` : `${scarti} scarti su ${totale} immagini — motivi sotto le thumbnail.`}
          </span>
        </>
      ) : (
        <span className="text-muted">Il critico visivo non è ancora passato su questo set.</span>
      )}
      <button className={`${btnGhost} ml-auto shrink-0`} onClick={onRecheck} disabled={busy}>
        Ricontrolla col critico
      </button>
    </div>
  );
}

function ImageTile({
  slug,
  entry,
  review,
  alt,
  onAlt,
  selected,
  onToggle,
  disabled,
}: {
  slug: string;
  entry: TraceEntry;
  review?: ReviewEntry;
  alt: string;
  onAlt: (v: string) => void;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const basename = entry.file.replace(/^img\//, "");
  // Cache-bust deterministico: cambia quando l'immagine viene rigenerata.
  const v = `${entry.seed ?? 0}-${entry.prompt.length}`;
  const scarto = review?.esito === "scarto";
  const len = alt.length;
  const tone = len > ALT_MAX || len === 0 ? "text-err" : len >= ALT_MAX * 0.9 ? "text-warn" : "text-faint";

  return (
    <div className={`overflow-hidden rounded-ctl border ${scarto ? "border-err/50" : "border-line"} bg-surface`}>
      <div className="relative bg-raise" style={{ aspectRatio: `${entry.width} / ${entry.height}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- route locale, niente ottimizzatore */}
        <img
          src={`/api/clients/${slug}/img/${basename}?v=${encodeURIComponent(v)}`}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {review && (
          <span className="absolute top-2 right-2">
            <Badge tone={scarto ? "err" : "ok"}>{scarto ? "scarto ✗" : "ok ✓"}</Badge>
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="mono truncate text-xs text-faint" title={entry.prompt}>
            {entry.file}
          </span>
          <span className={`mono shrink-0 text-xs ${tone}`}>
            {len}/{ALT_MAX}
          </span>
        </div>
        <p className="truncate text-xs text-muted" title={entry.riferimento}>
          {entry.riferimento}
        </p>
        <textarea
          value={alt}
          onChange={(e) => onAlt(e.target.value)}
          rows={2}
          aria-label={`Alt di ${entry.file}`}
          className="w-full resize-none text-sm"
          disabled={disabled}
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
          <input type="checkbox" checked={selected} onChange={onToggle} disabled={disabled} />
          rigenera
        </label>
        {scarto && (
          <p className="rounded-ctl bg-warn-bg px-2.5 py-1.5 text-xs text-warn" title={review?.fix_prompt}>
            ⚠ {review?.motivo ?? "scartata dal critico"}
          </p>
        )}
      </div>
    </div>
  );
}
