"use client";

// Scheda Copy (DESIGN-BRIEF.md §Scheda Copy): l'editor si legge come la PAGINA
// del sito — gruppi nell'ordine reale delle sezioni, pannello del critico in
// testa come coda di lavoro, contatori live con la stessa definizione di
// conteggio del validatore server. Tutti i sotto-componenti a module scope
// (regola anti-remount: mai definire componenti dentro componenti).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  visibleLen,
  accentOk,
  arrayPrefix,
  checkCoperturaCopy,
  ARRAY_BOUNDS,
  BULLETS_MAX,
  type CopySlot,
  type CopyValue,
  type CopyArtifact,
} from "@/lib/slots-shared";
import type { CopyReview, CopyCoverage } from "@/lib/schemas";
import { Badge, btnPrimary, btnSecondary, btnGhost } from "./ui";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { useSaveShortcut } from "./use-save-shortcut";
import { useStepRun, RunLog } from "./use-step-run";
import { BackBar } from "./back-bar";
import { ConfirmDialog } from "./confirm-dialog";

// ---------------------------------------------------------------------------
// Etichette operative
// ---------------------------------------------------------------------------

const LEAF_LABELS: Record<string, string> = {
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  eyebrow: "Eyebrow (micro-label)",
  title: "Titolo",
  headline: "Titolo",
  subtitle: "Sottotitolo",
  value: "Valore",
  label: "Etichetta",
  desc: "Descrizione",
  bullets: "Bullets",
  caption: "Didascalia",
  q: "Domanda",
  a: "Risposta",
  formNote: "Nota sotto il form",
  note: "Nota",
  tagline: "Tagline",
  legalNote: "Riga legale",
};
const leafLabel = (p: string) => LEAF_LABELS[p.split(".").pop() ?? ""] ?? p.split(".").pop() ?? p;

const ROW_NOUNS: Record<string, string> = {
  "sections[2].props.items": "Punto",
  "sections[3].props.items": "Card",
  "sections[4].props.images": "Foto",
  "sections[5].props.steps": "Passo",
  "sections[7].props.items": "Domanda",
};

const anchorId = (path: string) => "slot-" + path.replace(/[^a-zA-Z0-9]+/g, "-");
/** I finding del critico citano path indicizzati (items[1]): normalizza a [*].
 *  L'indice di sezione (sections[5]) invece è parte del path e va PRESERVATO. */
const normalizePath = (p: string) => p.replace(/(?<!sections)\[\d+\]/g, "[*]").trim();

// ---------------------------------------------------------------------------
// Struttura: gruppi per sezione, nell'ordine di pagina
// ---------------------------------------------------------------------------

interface Group {
  key: string;
  label: string;
  scalars: CopySlot[];
  arrays: { prefix: string; slots: CopySlot[] }[];
}

function buildGroups(slots: CopySlot[]): Group[] {
  const byKey = new Map<string, Group>();
  const order: string[] = [];
  for (const s of slots) {
    const key = s.sectionIndex === null ? "meta" : `s${s.sectionIndex}`;
    if (!byKey.has(key)) {
      byKey.set(key, { key, label: s.sectionIndex === null ? "SEO" : s.sectionLabel, scalars: [], arrays: [] });
      order.push(key);
    }
    const g = byKey.get(key)!;
    if (s.wildcardDepth === 0) {
      g.scalars.push(s);
    } else {
      const prefix = arrayPrefix(s.path);
      let a = g.arrays.find((x) => x.prefix === prefix);
      if (!a) g.arrays.push((a = { prefix, slots: [] }));
      a.slots.push(s);
    }
  }
  return order.map((k) => byKey.get(k)!);
}

/** Stato iniziale: tutti gli slot presenti (i mancanti → vuoti, coerenti coi sibling). */
function initCopy(slots: CopySlot[], initial: CopyArtifact): CopyArtifact {
  const out: CopyArtifact = {};
  const lenOf = (prefix: string): number => {
    for (const s of slots) {
      if (s.wildcardDepth >= 1 && arrayPrefix(s.path) === prefix) {
        const v = initial[s.path];
        if (Array.isArray(v)) return v.length;
      }
    }
    return ARRAY_BOUNDS[prefix]?.min ?? 3;
  };
  for (const s of slots) {
    const v = initial[s.path];
    if (s.wildcardDepth === 0) out[s.path] = typeof v === "string" ? v : "";
    else {
      const n = lenOf(arrayPrefix(s.path));
      const arr = Array.isArray(v) ? [...(v as unknown[])] : [];
      while (arr.length < n) arr.push(s.wildcardDepth === 2 ? [] : "");
      out[s.path] = arr.slice(0, n) as CopyValue;
    }
  }
  return out;
}

/** Errori evidenti lato client (budget/accent/bound) — il gate vero è il server. */
function clientErrors(slots: CopySlot[], copy: CopyArtifact): string[] {
  const errs: string[] = [];
  for (const s of slots) {
    const v = copy[s.path];
    const leaves: string[] =
      s.wildcardDepth === 0
        ? [v as string]
        : s.wildcardDepth === 1
          ? (v as string[])
          : (v as string[][]).flat();
    for (const leaf of leaves) {
      if (typeof leaf !== "string") continue;
      if (s.wildcardDepth === 0 || s.accentMarker || s.maxChars !== undefined) {
        if (s.maxChars !== undefined && visibleLen(leaf) > s.maxChars) errs.push(`${s.path}: oltre budget`);
      }
      if (s.accentMarker && !accentOk(leaf)) errs.push(`${s.path}: frase accent mancante o doppia`);
      if (!s.accentMarker && leaf.includes("**")) errs.push(`${s.path}: ** non ammesso`);
      if (leaf.trim() === "") errs.push(`${s.path}: vuoto`);
    }
    if (s.wildcardDepth === 2) {
      for (const sub of v as string[][]) if (sub.length > BULLETS_MAX) errs.push(`${s.path}: troppe bullets`);
    }
  }
  return errs;
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function CopyEditor({
  slug,
  businessName,
  initial,
  slots,
  review,
  coverage,
  contestoServizi,
  accent,
  stale = [],
  verificato: verificatoIniziale,
}: {
  slug: string;
  businessName: string;
  initial: CopyArtifact;
  slots: CopySlot[];
  review: CopyReview | null;
  coverage: CopyCoverage | null;
  contestoServizi: string[];
  accent: string | null;
  /** File a monte cambiati dopo la generazione (vuoto = fresco). */
  stale?: string[];
  verificato: boolean;
}) {
  const router = useRouter();
  const groups = useMemo(() => buildGroups(slots), [slots]);
  const [copy, setCopy] = useState<CopyArtifact>(() => initCopy(slots, initial));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [chiediRigenera, setChiediRigenera] = useState(false);
  const { navigate, dialog } = useUnsavedGuard(dirty);
  const runner = useStepRun(slug, "copy");
  useSaveShortcut(() => {
    if (!busy && !runner.running) salva();
  });

  const verificato = verificatoIniziale && !dirty;
  const erroriClient = useMemo(() => clientErrors(slots, copy), [slots, copy]);

  // Stato per gruppo per il rail indice: err (contratto violato) > warn (finding del critico) > ok.
  const statoGruppo = useMemo(() => {
    const m = new Map<string, "err" | "warn" | "ok">();
    for (const g of groups) {
      const paths = [...g.scalars.map((x) => x.path), ...g.arrays.flatMap((a) => a.slots.map((x) => x.path))];
      let stato: "err" | "warn" | "ok" = "ok";
      for (const pth of paths) {
        if (erroriClient.some((e) => e.startsWith(`${pth}:`))) {
          stato = "err";
          break;
        }
        if ((review?.findings ?? []).some((f) => normalizePath(f.slot) === pth)) stato = "warn";
      }
      m.set(g.key, stato);
    }
    return m;
  }, [groups, erroriClient, review]);

  const findingsBySlot = useMemo(() => {
    const m = new Map<string, CopyReview["findings"]>();
    for (const f of review?.findings ?? []) {
      const key = normalizePath(f.slot);
      m.set(key, [...(m.get(key) ?? []), f]);
    }
    return m;
  }, [review]);

  const set = (path: string, v: CopyValue) => {
    setCopy((prev) => ({ ...prev, [path]: v }));
    setDirty(true);
    setMsg(null);
  };

  // Operazioni di riga: mutano TUTTI i sibling insieme (coerenza garantita).
  const addRow = (prefix: string, siblings: CopySlot[]) => {
    setCopy((prev) => {
      const next = { ...prev };
      for (const s of siblings) {
        const arr = [...(prev[s.path] as unknown[])];
        arr.push(s.wildcardDepth === 2 ? [] : "");
        next[s.path] = arr as CopyValue;
      }
      return next;
    });
    setDirty(true);
  };
  const removeRow = (prefix: string, siblings: CopySlot[], i: number) => {
    setCopy((prev) => {
      const next = { ...prev };
      for (const s of siblings) {
        const arr = [...(prev[s.path] as unknown[])];
        arr.splice(i, 1);
        next[s.path] = arr as CopyValue;
      }
      return next;
    });
    setDirty(true);
  };

  async function salva(): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    setServerErrors([]);
    const res = await fetch(`/api/clients/${slug}/copy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copy }),
    });
    setBusy(false);
    if (res.ok) {
      setDirty(false);
      setMsg({ tone: "ok", text: "Salvato ✓" });
      return true;
    }
    const d = await res.json().catch(() => ({}));
    setServerErrors(d.errors ?? []);
    setMsg({ tone: "err", text: d.error ?? `errore ${res.status}` });
    return false;
  }

  async function conferma() {
    if (!(await salva())) return;
    setBusy(true);
    const res = await fetch(`/api/clients/${slug}/copy`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      router.push(`/clienti/${slug}`);
      router.refresh();
      return;
    }
    const d = await res.json().catch(() => ({}));
    setServerErrors(d.errors ?? []);
    setMsg({ tone: "err", text: d.error ?? `errore ${res.status}` });
  }

  async function ricontrolla() {
    if (dirty && !(await salva())) return;
    runner.run("critic", "Ricontrollo del copy corrente col critico avversariale…");
  }

  async function vaBeneCosi() {
    await fetch(`/api/clients/${slug}/steps/copy/ack-upstream`, { method: "POST" });
    router.refresh();
  }

  const goto = (slotPath: string) => {
    const el = document.getElementById(anchorId(normalizePath(slotPath)));
    if (!el) return;
    // Salto istantaneo (affidabile ovunque) + flash del campo per orientarsi.
    el.scrollIntoView({ block: "center" });
    el.style.outline = "2px solid var(--brand)";
    el.style.outlineOffset = "4px";
    el.style.borderRadius = "8px";
    setTimeout(() => {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.borderRadius = "";
    }, 1400);
  };

  const cardTitles = (copy["sections[3].props.items[*].title"] as string[]) ?? [];

  return (
    <div className="pb-24">
      {dialog}
      <ConfirmDialog
        open={chiediRigenera}
        title="Rigenerare il copy con l'AI?"
        message="La pipeline riparte da zero dal contesto corrente (copywriter → critico, fino a 3 round) e sovrascrive tutti i testi, comprese le modifiche fatte a mano."
        confirmLabel="Rigenera"
        onConfirm={() => {
          setChiediRigenera(false);
          setDirty(false);
          runner.run("generate", "Rigenerazione completa del copy dal contesto corrente…");
        }}
        onCancel={() => setChiediRigenera(false)}
      />
      <BackBar slug={slug} businessName={businessName} step="Copy" onNavigate={navigate} />

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Copy del sito</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Rivedilo come lo leggerebbe il titolare al telefono: i gruppi seguono l&apos;ordine delle sezioni del sito.
          </p>
        </div>
        <button className={`${btnGhost} shrink-0`} onClick={() => setChiediRigenera(true)} disabled={runner.running}>
          ⟳ Rigenera con l&apos;AI
        </button>
      </div>

      {runner.running || runner.log.length > 0 ? (
        <div className="mt-4">
          {runner.running && <p className="text-sm text-brand">Pipeline copy in corso (claude -p, più fasi)…</p>}
          <RunLog log={runner.log} logRef={runner.logRef} />
        </div>
      ) : (
        <>
          {stale.length > 0 && (
            <div className="mt-4 rounded-ctl border border-warn/40 bg-warn-bg px-4 py-3 text-sm">
              <p className="font-medium text-warn">⚠ Cambiato a monte dopo la generazione del copy</p>
              <p className="mono mt-1 text-warn/90">{stale.join(" · ")}</p>
              <p className="mt-1 text-warn/90">
                Macro-categorie, promesse o identità potrebbero essere diverse: i testi derivati potrebbero non
                riflettere le correzioni.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={btnPrimary}
                  onClick={() => {
                    setDirty(false);
                    runner.run("update", "Aggiornamento intelligente: rivedo solo gli slot impattati…");
                  }}
                >
                  Aggiorna con l&apos;AI
                </button>
                <button
                  className={btnSecondary}
                  onClick={() => {
                    setDirty(false);
                    runner.run("generate", "Rigenerazione completa del copy dal contesto corrente…");
                  }}
                  title="Riparte da zero (perdi le modifiche fatte a mano)"
                >
                  Rigenera da zero
                </button>
                <button className={btnGhost} onClick={vaBeneCosi}>
                  Va bene così
                </button>
              </div>
            </div>
          )}
          <CriticPanel review={review} onRecheck={ricontrolla} busy={busy} goto={goto} />
        </>
      )}

      {serverErrors.length > 0 && (
        <div className="mt-4 rounded-ctl border border-err/40 bg-err-bg px-4 py-3 text-sm">
          <p className="font-medium text-err">Contratto di formato non rispettato ({serverErrors.length})</p>
          <ul className="mt-1.5 space-y-1">
            {serverErrors.map((e, i) => {
              const m = e.match(/«([^»]+)»/);
              return (
                <li key={i} className="flex items-start gap-2 text-err/90">
                  <span className="flex-1">{e}</span>
                  {m && (
                    <button className="shrink-0 underline underline-offset-2 hover:opacity-80" onClick={() => goto(m[1])}>
                      vai al campo →
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {verificato && (
        <p className="mt-4 rounded-ctl bg-ok-bg px-4 py-2 text-sm text-ok">✓ Copy confermato. Puoi ancora modificarlo.</p>
      )}

      <div className="relative mx-auto max-w-3xl">
        {/* Rail indice sticky (≥xl): la pagina è lunga ~9000px, il rail è la mappa. */}
        <nav className="absolute top-0 bottom-0 -left-48 hidden w-40 xl:block" aria-label="Sezioni del copy">
          <ol className="sticky top-20 space-y-0.5 text-xs">
            {groups.map((g) => {
              const st = statoGruppo.get(g.key) ?? "ok";
              return (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => document.getElementById(`gruppo-${g.key}`)?.scrollIntoView({ behavior: "smooth" })}
                    className="flex w-full items-center gap-2 rounded-ctl px-2 py-1 text-left text-muted transition-colors duration-150 hover:bg-raise hover:text-ink"
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 shrink-0 rounded-full ${st === "err" ? "bg-err" : st === "warn" ? "bg-warn" : "bg-line2"}`}
                    />
                    <span className="truncate">{g.key === "meta" ? g.label : `${g.key.slice(1)} · ${g.label}`}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        {groups.map((g) => (
          <section key={g.key} id={`gruppo-${g.key}`} className="scroll-mt-20 border-t border-line py-6 first:border-t-0">
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">
              {g.key === "meta" ? g.label : `${g.key.slice(1)} · ${g.label}`}
            </h2>
            {g.scalars.map((s) => (
              <ScalarField
                key={s.path}
                slot={s}
                value={copy[s.path] as string}
                onChange={(v) => set(s.path, v)}
                accent={accent}
                findings={findingsBySlot.get(s.path)}
              />
            ))}
            {g.arrays.map((a) => (
              <ArrayRows
                key={a.prefix}
                prefix={a.prefix}
                siblings={a.slots}
                copy={copy}
                accent={accent}
                findingsBySlot={findingsBySlot}
                onLeaf={(path, i, v) => {
                  const arr = [...(copy[path] as string[])];
                  arr[i] = v;
                  set(path, arr);
                }}
                onBullets={(path, i, v) => {
                  const arr = (copy[path] as string[][]).map((x) => [...x]);
                  arr[i] = v;
                  set(path, arr);
                }}
                onAdd={() => addRow(a.prefix, a.slots)}
                onRemove={(i) => removeRow(a.prefix, a.slots, i)}
              />
            ))}
            {g.key === "s3" && (
              <CoveragePanel coverage={coverage} contestoServizi={contestoServizi} cardTitles={cardTitles} />
            )}
            {g.key === "s4" && (
              <p className="mt-1 text-xs text-faint">
                Le immagini della galleria verranno GENERATE da queste didascalie: scrivile pensando alla foto che vuoi.
              </p>
            )}
          </section>
        ))}
      </div>

      {/* ACTION BAR */}
      <div className="fixed inset-x-0 bottom-(--statusbar-offset) border-t border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-4 px-6 py-3">
          {msg && <span className={`text-sm ${msg.tone === "ok" ? "text-ok" : "text-err"}`}>{msg.text}</span>}
          {erroriClient.length > 0 && (
            <span className="text-sm text-err">
              {erroriClient.length} {erroriClient.length === 1 ? "campo da sistemare" : "campi da sistemare"}
            </span>
          )}
          <button type="button" className={btnSecondary} onClick={salva} disabled={busy || runner.running}>
            {busy ? "…" : "Salva"}
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={conferma}
            disabled={busy || runner.running || erroriClient.length > 0}
          >
            Conferma copy
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sotto-componenti (module scope)
// ---------------------------------------------------------------------------

function Counter({ text, max }: { text: string; max?: number }) {
  if (max === undefined) return null;
  const len = visibleLen(text);
  const tone = len > max ? "text-err" : len >= max * 0.9 ? "text-warn" : "text-faint";
  return (
    <span className={`mono ${tone}`}>
      {len}/{max}
    </span>
  );
}

function FindingChips({ findings, }: { findings?: CopyReview["findings"] }) {
  if (!findings?.length) return null;
  return (
    <span
      className="inline-flex items-center rounded-full bg-err-bg px-1.5 py-0.5 text-xs font-medium text-err"
      title={findings.map((f) => `${f.rubrica} ${f.gravita}: ${f.problema}`).join("\n\n")}
    >
      ⚠ {findings.length}
    </span>
  );
}

/** Anteprima del titolo con la frase **accent** colorata col colore vero del cliente. */
function AccentPreview({ text, accent }: { text: string; accent: string | null }) {
  const parts = text.split(/\*\*([^*]*)\*\*/);
  return (
    <p className="mt-1 text-sm text-muted">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold" style={{ color: accent ?? "var(--brand)" }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
      <span className={`ml-2 text-xs ${accentOk(text) ? "text-ok" : "text-err"}`}>
        {accentOk(text) ? "1 frase accent ✓" : "serve UNA frase **accent** ✗"}
      </span>
    </p>
  );
}

function ScalarField({
  slot,
  value,
  onChange,
  accent,
  findings,
}: {
  slot: CopySlot;
  value: string;
  onChange: (v: string) => void;
  accent: string | null;
  findings?: CopyReview["findings"];
}) {
  const long = (slot.maxChars ?? 0) > 90;
  return (
    <div className="mb-3" id={anchorId(slot.path)}>
      <label className="mb-1 flex items-baseline justify-between gap-3 text-sm text-muted">
        <span className="flex items-center gap-2">
          {leafLabel(slot.path)}
          <FindingChips findings={findings} />
        </span>
        <Counter text={value} max={slot.maxChars} />
      </label>
      {long ? (
        <textarea rows={slot.maxChars && slot.maxChars > 200 ? 4 : 2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {slot.accentMarker && <AccentPreview text={value} accent={accent} />}
      {slot.guida && <p className="mt-0.5 text-xs text-faint">{slot.guida}</p>}
    </div>
  );
}

function BulletChips({ value, max, onChange }: { value: string[]; max: number; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((b, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 rounded-ctl px-2 py-0.5 text-sm ${b.length > 36 ? "bg-err-bg text-err" : "bg-surface text-ink"}`}
          title={b.length > 36 ? `${b.length}/36 caratteri: troppo lunga` : `${b.length}/36`}
        >
          {b}
          <button type="button" className="opacity-60 hover:opacity-100" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            ✕
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...value, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder="+ bullet…"
          className="w-28 border-0 bg-transparent px-1 py-0.5 text-sm"
        />
      )}
    </div>
  );
}

function ArrayRows({
  prefix,
  siblings,
  copy,
  accent,
  findingsBySlot,
  onLeaf,
  onBullets,
  onAdd,
  onRemove,
}: {
  prefix: string;
  siblings: CopySlot[];
  copy: CopyArtifact;
  accent: string | null;
  findingsBySlot: Map<string, CopyReview["findings"]>;
  onLeaf: (path: string, i: number, v: string) => void;
  onBullets: (path: string, i: number, v: string[]) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  const bounds = ARRAY_BOUNDS[prefix];
  const noun = ROW_NOUNS[prefix] ?? "Voce";
  const n = ((copy[siblings[0].path] as unknown[]) ?? []).length;

  return (
    <div className="space-y-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-faint">
              {noun} {i + 1}
            </span>
            {(!bounds || n > bounds.min) && (
              <button
                type="button"
                className="text-xs text-faint hover:text-err"
                onClick={() => onRemove(i)}
                title={`Elimina ${noun.toLowerCase()} ${i + 1} (tutti i campi della riga)`}
              >
                ✕ elimina
              </button>
            )}
          </div>
          {siblings.map((s) => {
            const findings = findingsBySlot.get(s.path);
            if (s.wildcardDepth === 2) {
              const v = (copy[s.path] as string[][])[i] ?? [];
              return (
                <div key={s.path} className="mb-2" id={i === 0 ? anchorId(s.path) : undefined}>
                  <label className="mb-1 flex items-center gap-2 text-sm text-muted">
                    {leafLabel(s.path)} <span className="text-xs text-faint">(2–4 parole, max {BULLETS_MAX})</span>
                    {i === 0 && <FindingChips findings={findings} />}
                  </label>
                  <BulletChips value={v} max={BULLETS_MAX} onChange={(nv) => onBullets(s.path, i, nv)} />
                </div>
              );
            }
            const v = (copy[s.path] as string[])[i] ?? "";
            const long = (s.maxChars ?? 0) > 90;
            return (
              <div key={s.path} className="mb-2" id={i === 0 ? anchorId(s.path) : undefined}>
                <label className="mb-1 flex items-baseline justify-between gap-3 text-sm text-muted">
                  <span className="flex items-center gap-2">
                    {leafLabel(s.path)}
                    {i === 0 && <FindingChips findings={findings} />}
                  </span>
                  <Counter text={v} max={s.maxChars} />
                </label>
                {long ? (
                  <textarea rows={s.maxChars && s.maxChars > 200 ? 4 : 2} value={v} onChange={(e) => onLeaf(s.path, i, e.target.value)} />
                ) : (
                  <input value={v} onChange={(e) => onLeaf(s.path, i, e.target.value)} />
                )}
              </div>
            );
          })}
        </div>
      ))}
      {(!bounds || n < bounds.max) && (
        <button type="button" className={btnGhost} onClick={onAdd}>
          + {noun.toLowerCase()}
        </button>
      )}
      {bounds && (
        <p className="text-xs text-faint">
          {bounds.label}: tra {bounds.min} e {bounds.max}
        </p>
      )}
    </div>
  );
}

function CriticPanel({
  review,
  onRecheck,
  busy,
  goto,
}: {
  review: CopyReview | null;
  onRecheck: () => void;
  busy: boolean;
  goto: (slot: string) => void;
}) {
  return (
    <div className="mt-4 card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Critico avversariale</span>
          {review ? (
            <>
              <Badge tone={review.verdict === "PASS" ? "ok" : "err"}>{review.verdict}</Badge>
              <span className="mono text-faint">round {review.round}</span>
            </>
          ) : (
            <span className="text-faint">nessun verdetto ancora</span>
          )}
        </div>
        <button className={btnSecondary} onClick={onRecheck} disabled={busy} title="Salva e fai rigiudicare il copy corrente">
          Ricontrolla col critico
        </button>
      </div>
      {review && review.findings.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          {review.findings.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <Badge tone={f.gravita === "bloccante" ? "err" : "warn"}>
                {f.rubrica} {f.gravita}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-ink">{f.problema}</p>
                <p className="mt-0.5 text-muted">Fix proposto: {f.fix}</p>
              </div>
              <button className="shrink-0 text-xs underline underline-offset-2 hover:text-ink" onClick={() => goto(f.slot)}>
                vai al campo →
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CoveragePanel({
  coverage,
  contestoServizi,
  cardTitles,
}: {
  coverage: CopyCoverage | null;
  contestoServizi: string[];
  cardTitles: string[];
}) {
  if (!coverage) return null;
  // Stessa definizione del validate deterministico dello step (lib/steps.ts).
  const { scoperti, extranei, cardFantasma } = checkCoperturaCopy(contestoServizi, coverage.voci_atomiche, cardTitles);

  return (
    <details className="mt-3 card px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">
        Copertura servizi ({coverage.voci_atomiche.length} voci → {coverage.card.length} card)
        {(scoperti.length > 0 || extranei.length > 0 || cardFantasma.length > 0) && (
          <span className="ml-2 text-warn">⚠ da controllare</span>
        )}
      </summary>
      {scoperti.length > 0 && (
        <p className="mt-2 rounded-ctl bg-warn-bg px-3 py-1.5 text-sm text-warn">
          Nel contesto ma non in copertura: {scoperti.join(" · ")}
        </p>
      )}
      {extranei.length > 0 && (
        <p className="mt-2 rounded-ctl bg-warn-bg px-3 py-1.5 text-sm text-warn">
          In copertura ma non nel contesto: {extranei.join(" · ")}
        </p>
      )}
      {cardFantasma.length > 0 && (
        <p className="mt-2 rounded-ctl bg-warn-bg px-3 py-1.5 text-sm text-warn">
          Card in copertura assenti dalle card correnti: {cardFantasma.join(" · ")}
        </p>
      )}
      <table className="mt-2 w-full text-sm">
        <tbody>
          {coverage.voci_atomiche.map((v, i) => (
            <tr key={i} className="border-t border-line">
              <td className="py-1 pr-3">{v.servizio}</td>
              <td className="py-1 text-muted">{v.card}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
