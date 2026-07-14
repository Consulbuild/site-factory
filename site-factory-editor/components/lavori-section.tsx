"use client";

// Sezione «I nostri lavori»: foto REALI del cliente → sezione Gallery del sito.
// Autonoma e indipendente da hero/card: compare sempre nella scheda Immagini
// (sia prima di generare le immagini AI, nel runner, sia dopo, nell'editor).
// 0 foto = sezione assente · 1–3 = non basta · ≥4 = compare (soglia assembler).
// Salvataggio e guardia modifiche propri (non l'action bar delle immagini AI).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Sparkles, Upload, X } from "lucide-react";
import type { Lavori } from "@/lib/schemas";
import { Badge, btnPrimary, btnSecondary } from "./ui";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { useStepRun, RunLog } from "./use-step-run";

const CAPTION_MAX = 28;
const ALT_MAX = 140;
const GALLERY_MIN = 4; // sotto 4 foto reali la sezione non compare (assembler)
const LAVORI_MAX = 12;
type Lavoro = Lavori[number];

export function LavoriSection({ slug, initial }: { slug: string; initial: Lavori }) {
  const router = useRouter();
  const runner = useStepRun(slug, "images"); // side-run "lavori" (non tocca hero/card)
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [lavori, setLavori] = useState<Lavori>(initial);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Ri-sincronizza dal server (dopo refresh: salva o «Genera testi con l'AI»)
  // solo senza modifiche non salvate, che hanno la precedenza.
  useEffect(() => {
    if (!dirty) setLavori(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Guardia beforeunload finché ci sono testi non salvati.
  useUnsavedGuard(dirty);

  const count = lavori.length;
  const full = count >= LAVORI_MAX;
  const anyBusy = uploading || busy || runner.running;
  // Errori bloccanti: testi oltre limite (schema Zod) sempre; alt mancante solo
  // con ≥4 foto (sotto, la sezione non esce → non blocca il salvataggio).
  const blocking = lavori.filter(
    (l) => l.caption.length > CAPTION_MAX || l.alt.length > ALT_MAX || (count >= GALLERY_MIN && !l.alt.trim()),
  ).length;

  const setField = (i: number, patch: Partial<Lavoro>) => {
    setLavori((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    setDirty(true);
    setMsg(null);
  };
  const move = (i: number, dir: -1 | 1) => {
    setLavori((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };
  const remove = (i: number) => {
    setLavori((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
    setMsg(null);
  };

  const pick = () => fileRef.current?.click();
  const takeFiles = (fl: FileList | null) => {
    if (fl && fl.length) upload(Array.from(fl));
    if (fileRef.current) fileRef.current.value = ""; // ricaricare lo stesso file dev'essere possibile
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!anyBusy && !full) takeFiles(e.dataTransfer.files);
  };

  async function upload(files: File[]) {
    if (!files.length || anyBusy) return;
    setUploading(true);
    setMsg(null);
    setErrors([]);
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    const res = await fetch(`/api/clients/${slug}/lavori`, { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as { lavori?: Lavori; errors?: string[]; error?: string };
    setUploading(false);
    if (!res.ok) {
      setErrors([data.error ?? `errore ${res.status}`]);
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
    if (data.errors?.length) setErrors(data.errors);
  }

  async function salva() {
    setBusy(true);
    setMsg(null);
    setErrors([]);
    const res = await fetch(`/api/clients/${slug}/lavori`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lavori }),
    });
    setBusy(false);
    if (res.ok) {
      setDirty(false);
      setMsg({ tone: "ok", text: "Salvato." });
      router.refresh();
      return;
    }
    const d = await res.json().catch(() => ({}));
    setErrors(Array.isArray(d.errors) ? d.errors : [d.error ?? `errore ${res.status}`]);
    setMsg({ tone: "err", text: "Salvataggio non riuscito." });
  }

  function generaTesti() {
    // L'AI riscrive alt+didascalia guardando le foto: come la rigenerazione,
    // scarta le modifiche non salvate e riparte dal disco.
    setDirty(false);
    runner.run("lavori", "L'AI guarda ogni foto dei lavori e scrive didascalia e alt…");
  }

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

      {(runner.running || runner.log.length > 0) && (
        <div className="mt-4">
          {runner.running && <p className="text-sm text-brand">L&apos;AI sta guardando le foto (claude -p)…</p>}
          <RunLog log={runner.log} />
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 rounded-ctl border border-err/40 bg-err-bg px-4 py-3 text-sm">
          <p className="font-medium text-err">Problemi ({errors.length})</p>
          <ul className="mt-1.5 space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-err">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

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
            if (!anyBusy) setDrag(true);
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
          <button type="button" className={`${btnSecondary} mt-2`} onClick={pick} disabled={anyBusy}>
            {uploading ? "Caricamento…" : "Scegli file"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={btnSecondary} onClick={pick} disabled={anyBusy || full}>
              <ImagePlus aria-hidden className="size-4" /> Aggiungi foto
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={generaTesti}
              disabled={anyBusy}
              title="L'AI guarda ogni foto e propone didascalia e alt, poi li rivedi"
            >
              <Sparkles aria-hidden className="size-4" /> Genera testi con l&apos;AI
            </button>
            {uploading && <span className="text-sm text-muted">Caricamento…</span>}
            {full && <span className="text-sm text-faint">Massimo {LAVORI_MAX} foto</span>}
            <div className="ml-auto flex items-center gap-3">
              {msg && <span className={`text-sm ${msg.tone === "ok" ? "text-ok" : "text-err"}`}>{msg.text}</span>}
              {blocking > 0 && <span className="text-sm text-err">{blocking} da completare</span>}
              <button type="button" className={btnPrimary} onClick={salva} disabled={anyBusy || !dirty}>
                {busy ? "…" : "Salva lavori"}
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!anyBusy && !full) setDrag(true);
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
                disabled={anyBusy}
                onField={(patch) => setField(i, patch)}
                onMove={(dir) => move(i, dir)}
                onRemove={() => remove(i)}
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
