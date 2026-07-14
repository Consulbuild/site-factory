"use client";

// Scheda Immagini (DESIGN-BRIEF.md §Scheda Immagini): le immagini sono le
// protagoniste — hero grande, card in griglia, esito del critico INLINE sotto
// ogni thumbnail, rigenerazione selettiva via checkbox. Sotto-componenti a
// module scope (regola anti-remount).

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Sparkles, Upload, X } from "lucide-react";
import type { ImagesTrace, ImageReview, Lavori } from "@/lib/schemas";
import { Badge, btnPrimary, btnSecondary, btnGhost, btnDanger } from "./ui";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { useSaveShortcut } from "./use-save-shortcut";
import { useStepRun, RunLog } from "./use-step-run";
import { BackBar } from "./back-bar";
import { ConfirmDialog } from "./confirm-dialog";

const ALT_MAX = 140;
const CAPTION_MAX = 28;
const GALLERY_MIN = 4; // sotto 4 foto reali la sezione «Lavori» non compare (assembler)
const LAVORI_MAX = 12;
type TraceEntry = ImagesTrace["immagini"][number];
type ReviewEntry = NonNullable<ImageReview>["immagini"][number];
type Lavoro = Lavori[number];

export function ImagesEditor({
  slug,
  businessName,
  trace,
  review,
  lavori: lavoriInitial,
  stale = [],
  verificato,
}: {
  slug: string;
  businessName: string;
  trace: ImagesTrace;
  review: ImageReview | null;
  /** Foto reali dei lavori del cliente (vuoto = nessuna → sezione Gallery assente). */
  lavori: Lavori;
  /** File a monte cambiati dopo la generazione (vuoto = fresco). */
  stale?: string[];
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

  // Foto lavori: stato locale editabile + dirty separato dagli alt AI. Upload e
  // testi-AI passano dal disco (già persistiti); ordine/testi/rimozioni si
  // bufferizzano e li salva l'action bar. Le mutazioni strutturali NON fanno
  // refresh, così l'effetto sotto non le sovrascrive.
  const [lavori, setLavori] = useState<Lavori>(lavoriInitial);
  const [lavoriDirty, setLavoriDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Ri-sincronizza dal server (dopo refresh: salva o «Genera testi con l'AI»),
  // ma solo se non ci sono modifiche non salvate (che avrebbero la precedenza).
  useEffect(() => {
    if (!lavoriDirty) setLavori(lavoriInitial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lavoriInitial]);

  const { navigate, dialog } = useUnsavedGuard(dirty || lavoriDirty);
  useSaveShortcut(() => {
    if (!busy && (dirty || lavoriDirty)) salva();
  });

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

  // Errori bloccanti dei lavori: testi oltre limite (schema Zod) sempre; alt
  // mancante solo con ≥4 foto (sotto, la sezione non esce → non blocca).
  const worksBlocking = lavori.filter(
    (l) => l.caption.length > CAPTION_MAX || l.alt.length > ALT_MAX || (lavori.length >= GALLERY_MIN && !l.alt.trim()),
  ).length;

  function setLavoro(index: number, patch: Partial<Lavoro>) {
    setLavori((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    setLavoriDirty(true);
    setMsg(null);
  }
  function moveLavoro(index: number, dir: -1 | 1) {
    setLavori((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setLavoriDirty(true);
  }
  function removeLavoro(index: number) {
    setLavori((prev) => prev.filter((_, i) => i !== index));
    setLavoriDirty(true);
    setMsg(null);
  }
  async function uploadLavori(files: File[]) {
    if (!files.length || uploading) return;
    setUploading(true);
    setMsg(null);
    setServerErrors([]);
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    const res = await fetch(`/api/clients/${slug}/lavori`, { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as { lavori?: Lavori; errors?: string[]; error?: string };
    setUploading(false);
    if (!res.ok) {
      setServerErrors([data.error ?? `errore ${res.status}`]);
      return;
    }
    // Le nuove foto sono già su disco + in lavori.json: le aggiungo in coda
    // preservando ordine/modifiche correnti (niente refresh, niente dirty).
    const server = data.lavori ?? [];
    setLavori((prev) => {
      const known = new Set(prev.map((l) => l.file));
      const nuove = server.filter((l) => !known.has(l.file));
      return nuove.length ? [...prev, ...nuove] : prev;
    });
    if (data.errors?.length) setServerErrors(data.errors);
  }
  function generaTestiLavori() {
    // L'AI riscrive alt+didascalia guardando le foto: come la rigenerazione,
    // scarta le modifiche non salvate e riparte dal disco.
    setLavoriDirty(false);
    runner.run("lavori", "L'AI guarda ogni foto dei lavori e scrive didascalia e alt…");
  }

  async function salva(): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    setServerErrors([]);
    const errs: string[] = [];
    if (dirty) {
      const res = await fetch(`/api/clients/${slug}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alts }),
      });
      if (res.ok) setDirty(false);
      else {
        const d = await res.json().catch(() => ({}));
        errs.push(...(Array.isArray(d.errors) ? d.errors : [d.error ?? `alt immagini: errore ${res.status}`]));
      }
    }
    if (lavoriDirty) {
      const res = await fetch(`/api/clients/${slug}/lavori`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lavori }),
      });
      if (res.ok) setLavoriDirty(false);
      else {
        const d = await res.json().catch(() => ({}));
        errs.push(...(Array.isArray(d.errors) ? d.errors : [d.error ?? `foto lavori: errore ${res.status}`]));
      }
    }
    setBusy(false);
    if (errs.length) {
      setServerErrors(errs);
      setMsg({ tone: "err", text: "Salvataggio incompleto." });
      return false;
    }
    setMsg({ tone: "ok", text: "Salvato." });
    router.refresh();
    return true;
  }

  async function conferma() {
    if (dirty && !(await salva())) return;
    setBusy(true);
    setMsg(null);
    setServerErrors([]);
    const res = await fetch(`/api/clients/${slug}/images`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setDirty(false);
      router.push(`/clienti/${slug}`);
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setServerErrors(Array.isArray(data.errors) ? data.errors : [data.error ?? `errore ${res.status}`]);
    setMsg({ tone: "err", text: "Set non conforme al manifest." });
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
          ⟳ Rigenera con l&apos;AI
        </button>
      </div>

      {runner.running || runner.log.length > 0 ? (
        <div className="mt-4">
          {runner.running && <p className="text-sm text-brand">Pipeline immagini in corso (claude -p + FLUX.2)…</p>}
          <RunLog log={runner.log} />
        </div>
      ) : (
        <>
          {stale.length > 0 && (
            <div className="mt-4 rounded-ctl border border-warn/40 bg-warn-bg px-4 py-3 text-sm">
              <p className="font-medium text-warn">⚠ Cambiato a monte dopo la generazione delle immagini</p>
            <p className="mono mt-1 text-warn">{stale.join(" · ")}</p>
              <p className="mt-1 text-warn">
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
              <li key={i} className="text-err">
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
      </section>

      <LavoriPanel
        slug={slug}
        lavori={lavori}
        uploading={uploading}
        running={runner.running}
        onUpload={uploadLavori}
        onField={setLavoro}
        onMove={moveLavoro}
        onRemove={removeLavoro}
        onGenerate={generaTestiLavori}
      />

      {/* ACTION BAR */}
      <div className="fixed inset-x-0 bottom-(--statusbar-offset) border-t border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-4 px-6 py-3">
          {msg && <span className={`text-sm ${msg.tone === "ok" ? "text-ok" : "text-err"}`}>{msg.text}</span>}
          {altErrors > 0 && <span className="text-sm text-err">{altErrors} alt da sistemare</span>}
          {worksBlocking > 0 && (
            <span className="text-sm text-err">
              {worksBlocking} {worksBlocking === 1 ? "foto lavori da completare" : "foto lavori da completare"}
            </span>
          )}
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setChiediRegenSel(true)}
            disabled={busy || runner.running || uploading || selected.size === 0}
            title={selected.size === 0 ? "Seleziona le immagini da rifare con le checkbox" : undefined}
          >
            Rigenera selezionate{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={salva}
            disabled={busy || runner.running || uploading || (!dirty && !lavoriDirty)}
          >
            {busy ? "…" : "Salva"}
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={conferma}
            disabled={busy || runner.running || uploading || altErrors > 0 || worksBlocking > 0}
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
      <button className={`${btnSecondary} ml-auto shrink-0`} onClick={onRecheck} disabled={busy}>
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

// ---------------------------------------------------------------------------
// Pannello «I nostri lavori»: foto reali del cliente (sezione Gallery).
// 0 foto = sezione assente · ≥4 = visibile. Upload (incl. HEIC), testi AI,
// riordino e rimozione. Le foto NON sono generate dall'AI.
// ---------------------------------------------------------------------------

function LavoriPanel({
  slug,
  lavori,
  uploading,
  running,
  onUpload,
  onField,
  onMove,
  onRemove,
  onGenerate,
}: {
  slug: string;
  lavori: Lavori;
  uploading: boolean;
  running: boolean;
  onUpload: (files: File[]) => void;
  onField: (index: number, patch: Partial<Lavoro>) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  onGenerate: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const count = lavori.length;
  const busy = uploading || running;
  const full = count >= LAVORI_MAX;

  const pick = () => fileRef.current?.click();
  const takeFiles = (fl: FileList | null) => {
    if (fl && fl.length) onUpload(Array.from(fl));
    if (fileRef.current) fileRef.current.value = ""; // ricaricare lo stesso file dev'essere possibile
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!busy && !full) takeFiles(e.dataTransfer.files);
  };
  const mancano = GALLERY_MIN - count;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-faint uppercase">I nostri lavori</h2>
        {count === 0 ? (
          <Badge tone="idle">La sezione «Lavori» non comparirà nel sito</Badge>
        ) : count < GALLERY_MIN ? (
          <Badge tone="warn">
            {count} foto — {mancano === 1 ? "ne manca 1" : `ne mancano ${mancano}`} perché la sezione compaia
          </Badge>
        ) : (
          <Badge tone="ok">{count} foto — la sezione comparirà sul sito</Badge>
        )}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Foto reali dei lavori del cliente — l&apos;unica sezione non generata dall&apos;AI: sono vere, e per questo
        aumentano la fiducia. Servono almeno {GALLERY_MIN} foto perché la sezione compaia; senza foto non appare.
      </p>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
        className="hidden"
        onChange={(e) => takeFiles(e.target.files)}
      />

      {count === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`mt-4 flex flex-col items-center gap-2 rounded-ctl border border-dashed px-6 py-10 text-center transition-colors ${
            drag ? "border-brand bg-brand-dim" : "border-line bg-surface"
          }`}
        >
          <Upload aria-hidden className="size-6 text-faint" strokeWidth={1.75} />
          <p className="text-sm font-medium text-muted">Trascina qui le foto dei lavori</p>
          <p className="max-w-md text-sm text-faint">
            JPG · PNG · WebP · HEIC (iPhone) · fino a {LAVORI_MAX} foto · max 15 MB l&apos;una
          </p>
          <button type="button" className={`${btnSecondary} mt-2`} onClick={pick} disabled={busy}>
            {uploading ? "Caricamento…" : "Scegli file"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={btnSecondary} onClick={pick} disabled={busy || full}>
              <ImagePlus aria-hidden className="size-4" /> Aggiungi foto
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={onGenerate}
              disabled={busy}
              title="L'AI guarda ogni foto e propone didascalia e alt, poi li rivedi"
            >
              <Sparkles aria-hidden className="size-4" /> Genera testi con l&apos;AI
            </button>
            {uploading && <span className="text-sm text-muted">Caricamento…</span>}
            {full && <span className="text-sm text-faint">Massimo {LAVORI_MAX} foto</span>}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy && !full) setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={`mt-4 grid gap-4 rounded-ctl ${drag ? "ring-2 ring-brand ring-offset-2 ring-offset-bg" : ""}`}
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
          >
            {lavori.map((l, i) => (
              <LavoroTile
                key={l.file}
                slug={slug}
                item={l}
                index={i}
                count={count}
                disabled={busy}
                onField={(patch) => onField(i, patch)}
                onMove={(dir) => onMove(i, dir)}
                onRemove={() => onRemove(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function LavoroTile({
  slug,
  item,
  index,
  count,
  disabled,
  onField,
  onMove,
  onRemove,
}: {
  slug: string;
  item: Lavoro;
  index: number;
  count: number;
  disabled: boolean;
  onField: (patch: Partial<Lavoro>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const capLen = item.caption.length;
  const altLen = item.alt.length;
  const capTone = capLen > CAPTION_MAX ? "text-err" : capLen >= CAPTION_MAX * 0.9 ? "text-warn" : "text-faint";
  const altEmptyBlock = count >= GALLERY_MIN && altLen === 0;
  const altTone = altLen > ALT_MAX || altEmptyBlock ? "text-err" : altLen >= ALT_MAX * 0.9 ? "text-warn" : "text-faint";
  const iconBtn = "rounded-full bg-bg/80 p-1 backdrop-blur-sm transition-opacity hover:opacity-100 disabled:opacity-30";

  return (
    <div className="overflow-hidden rounded-ctl border border-line bg-surface">
      <div className="relative aspect-[4/3] bg-raise">
        {/* eslint-disable-next-line @next/next/no-img-element -- route locale, niente ottimizzatore */}
        <img
          src={`/api/clients/${slug}/img/${item.file}`}
          alt={item.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {index === 0 && (
          <span className="absolute top-2 left-2">
            <Badge tone="idle">Foto principale</Badge>
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            type="button"
            aria-label="Sposta prima"
            className={`${iconBtn} text-ink`}
            onClick={() => onMove(-1)}
            disabled={disabled || index === 0}
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Sposta dopo"
            className={`${iconBtn} text-ink`}
            onClick={() => onMove(1)}
            disabled={disabled || index === count - 1}
          >
            <ArrowDown className="size-4" />
          </button>
          <button type="button" aria-label="Rimuovi foto" className={`${iconBtn} text-err`} onClick={onRemove} disabled={disabled}>
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-xs font-medium text-muted" htmlFor={`cap-${item.file}`}>
              Didascalia
            </label>
            <span className={`mono shrink-0 text-xs ${capTone}`}>
              {capLen}/{CAPTION_MAX}
            </span>
          </div>
          <input
            id={`cap-${item.file}`}
            value={item.caption}
            onChange={(e) => onField({ caption: e.target.value })}
            placeholder="Es. Ristrutturazione bagno"
            className="mt-1 w-full text-sm"
            disabled={disabled}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-xs font-medium text-muted" htmlFor={`alt-${item.file}`}>
              Alt
            </label>
            <span className={`mono shrink-0 text-xs ${altTone}`}>
              {altLen}/{ALT_MAX}
            </span>
          </div>
          <textarea
            id={`alt-${item.file}`}
            value={item.alt}
            onChange={(e) => onField({ alt: e.target.value })}
            rows={2}
            placeholder="Cosa si vede nella foto (accessibilità e SEO)"
            className="mt-1 w-full resize-none text-sm"
            disabled={disabled}
          />
          {altEmptyBlock && <p className="mt-1 text-xs text-err">Alt richiesto per mostrare la foto sul sito.</p>}
        </div>
      </div>
    </div>
  );
}
