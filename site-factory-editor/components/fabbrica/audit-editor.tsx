"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, btnGhost } from "@/components/ui";
import { RunLog, type LogLine } from "@/components/use-step-run";
import { ConfirmDialog } from "@/components/confirm-dialog";

// Audit pairwise (M7): candidato vs preset più vicino, stesso golden content,
// DOPPIO ordine (AB e BA) per togliere il bias di posizione — i lati sono
// anonimi («Sinistra/Destra»), il componente sa chi è chi e lo registra.
// L'audit è QA e insieme prova di titolarità (contributo umano documentato).

const SHOTS = ["hero-1280", "servizi-1280", "centro-1280", "footer-1280", "hero-390", "servizi-390", "coda-390"];

interface Prefill {
  id: string;
  aaker: Record<string, number | string>;
  settori: string;
  antiPatterns: string;
  nome: string;
  estetica: string;
  per: string;
  fontLabel: string;
  serifHeading: boolean;
  serifBody: boolean;
  photographySpec: Record<string, string>;
}

export function AuditEditor({
  runId,
  stato,
  contro,
  controVersion,
  prefill,
}: {
  runId: string;
  stato: string;
  contro: string;
  controVersion: string;
  prefill: Prefill;
}) {
  const router = useRouter();
  const [shot, setShot] = useState(SHOTS[0]);
  const [scelte, setScelte] = useState<{ AB?: string; BA?: string }>({});
  const [meta, setMeta] = useState(prefill);
  const [photoSpecText, setPhotoSpecText] = useState(() => JSON.stringify(prefill.photographySpec, null, 2));
  const [fluxStyleFragment, setFluxStyleFragment] = useState("");
  const [chiediScarto, setChiediScarto] = useState(false);
  const [note, setNote] = useState("");
  const [decisoDa, setDecisoDa] = useState("Mattia");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const append = (l: LogLine) =>
    setLog((prev) => {
      queueMicrotask(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }));
      return [...prev, l];
    });

  const urlCandidato = (s: string) => `/api/factory/runs/${runId}/shots/${s}.jpg`;
  const urlEsistente = (s: string) => `/api/factory/presets-shots/${contro}/${s}.jpg`;

  const confronti = useMemo(
    () =>
      (["AB", "BA"] as const).map((ordine) => ({
        ordine,
        sinistra: ordine === "AB" ? urlCandidato : urlEsistente,
        destra: ordine === "AB" ? urlEsistente : urlCandidato,
        // "sinistra"/"destra" → chi è stato scelto davvero
        risolvi: (lato: string) =>
          lato === "pari" ? "pari" : (ordine === "AB") === (lato === "sinistra") ? "candidato" : "esistente",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runId, contro],
  );

  async function salva(decisione: "approva" | "scarta") {
    setInCorso(true);
    setErrore(null);
    setLog([]);
    try {
      let photographySpec: Record<string, string> = meta.photographySpec;
      if (decisione === "approva") {
        try {
          photographySpec = JSON.parse(photoSpecText);
        } catch {
          throw new Error("photographySpec non è JSON valido");
        }
      }
      const body = {
        decisione,
        confronti: confronti
          .filter((c) => scelte[c.ordine])
          .map((c) => ({ contro: `${contro}@${controVersion}`, ordine: c.ordine, scelto: c.risolvi(scelte[c.ordine]!) })),
        note: note.trim() || undefined,
        decisoDa,
        data: new Date().toISOString(),
        meta:
          decisione === "approva"
            ? {
                id: meta.id.trim(),
                aaker: {
                  sincerity: Number(meta.aaker.sincerity),
                  excitement: Number(meta.aaker.excitement),
                  competence: Number(meta.aaker.competence),
                  sophistication: Number(meta.aaker.sophistication),
                  ruggedness: Number(meta.aaker.ruggedness),
                  primaria: String(meta.aaker.primaria),
                },
                settoriConsigliati: meta.settori.split(",").map((s) => s.trim()).filter(Boolean),
                antiPatterns: meta.antiPatterns.split(",").map((s) => s.trim()).filter(Boolean),
                editor: {
                  nome: meta.nome,
                  estetica: meta.estetica,
                  per: meta.per,
                  fontLabel: meta.fontLabel,
                  serifHeading: meta.serifHeading,
                  serifBody: meta.serifBody,
                },
                photographySpec,
                fluxStyleFragment: fluxStyleFragment.trim() || undefined,
              }
            : undefined,
      };
      const res = await fetch(`/api/factory/runs/${runId}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok) throw new Error(out?.issues?.join("; ") ?? out?.error ?? `rifiutato (${res.status})`);

      if (decisione === "approva") {
        append({ kind: "phase", text: "Audit salvato — pubblicazione in corso" });
        const pub = await fetch(`/api/factory/runs/${runId}/publish`, { method: "POST" });
        if (!pub.ok || !pub.body) {
          const err = await pub.json().catch(() => null);
          throw new Error(err?.error ?? `pubblicazione rifiutata (${pub.status})`);
        }
        const reader = pub.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line);
            if (ev.type === "phase") append({ kind: "phase", text: ev.label });
            else if (ev.type === "text") append({ kind: "text", text: ev.text });
            else if (ev.type === "done") append({ kind: "info", text: "Preset pubblicato." });
            else if (ev.type === "error") {
              setErrore(ev.message);
              append({ kind: "err", text: ev.message });
            }
          }
        }
      }
      router.refresh();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setInCorso(false);
    }
  }

  const confrontiFatti = confronti.every((c) => scelte[c.ordine]);
  const chiuso = stato === "pubblicata" || stato === "scartata";

  return (
    <div className="space-y-8">
      {/* selettore shot */}
      <div className="flex flex-wrap gap-2">
        {SHOTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setShot(s)}
            className={`mono rounded-full border px-3 py-1 text-xs ${s === shot ? "border-brand text-brand" : "border-line text-muted hover:border-line2"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* i due round AB/BA */}
      {confronti.map((c, i) => (
        <section key={c.ordine}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Confronto {i + 1} di 2 — quale regge meglio?
          </h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {(["sinistra", "destra"] as const).map((lato) => (
              <figure
                key={lato}
                className={`overflow-hidden rounded-ctl border ${scelte[c.ordine] === lato ? "border-brand" : "border-line"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(lato === "sinistra" ? c.sinistra : c.destra)(shot)}
                  alt={`${lato} — ${shot}`}
                  loading="lazy"
                  className="min-h-24 w-full bg-raise"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.minHeight = "6rem";
                    (e.target as HTMLImageElement).alt = "screenshot mancante";
                  }}
                />
                <figcaption className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-muted">{lato}</span>
                  {!chiuso && (
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => setScelte((p) => ({ ...p, [c.ordine]: lato }))}
                      disabled={inCorso}
                    >
                      {scelte[c.ordine] === lato ? "Scelto ✓" : "Scelgo questo"}
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
          {!chiuso && (
            <button
              type="button"
              className={`${btnGhost} mt-2`}
              onClick={() => setScelte((p) => ({ ...p, [c.ordine]: "pari" }))}
              disabled={inCorso}
            >
              {scelte[c.ordine] === "pari" ? "Pari ✓" : "Sono pari"}
            </button>
          )}
        </section>
      ))}

      {/* metadati del preset (prefill dalle motivazioni del designer) */}
      {!chiuso && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Metadati del preset (compilati all&apos;audit)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted">Id preset (slug) *</span>
              <input value={meta.id} onChange={(e) => setMeta({ ...meta, id: e.target.value })} className="mono mt-1.5 w-full" disabled={inCorso} />
            </label>
            <label className="text-sm">
              <span className="text-muted">Nome per l&apos;editor *</span>
              <input value={meta.nome} onChange={(e) => setMeta({ ...meta, nome: e.target.value })} className="mt-1.5 w-full" disabled={inCorso} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">Estetica in una riga *</span>
              <input value={meta.estetica} onChange={(e) => setMeta({ ...meta, estetica: e.target.value })} className="mt-1.5 w-full" disabled={inCorso} />
            </label>
            <label className="text-sm">
              <span className="text-muted">Per chi è pensato *</span>
              <input value={meta.per} onChange={(e) => setMeta({ ...meta, per: e.target.value })} className="mt-1.5 w-full" disabled={inCorso} />
            </label>
            <label className="text-sm">
              <span className="text-muted">Font label *</span>
              <input value={meta.fontLabel} onChange={(e) => setMeta({ ...meta, fontLabel: e.target.value })} className="mt-1.5 w-full" disabled={inCorso} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={meta.serifHeading}
                onChange={(e) => setMeta({ ...meta, serifHeading: e.target.checked })}
                disabled={inCorso}
              />
              <span>Titoli serif (editor)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={meta.serifBody}
                onChange={(e) => setMeta({ ...meta, serifBody: e.target.checked })}
                disabled={inCorso}
              />
              <span>Body serif (editor)</span>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">photographySpec (JSON — guida fotografica per le skill immagini)</span>
              <textarea
                value={photoSpecText}
                onChange={(e) => setPhotoSpecText(e.target.value)}
                rows={4}
                className="mono mt-1.5 w-full"
                disabled={inCorso}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">fluxStyleFragment (frammento di stile per i prompt FLUX, opzionale)</span>
              <input
                value={fluxStyleFragment}
                onChange={(e) => setFluxStyleFragment(e.target.value)}
                className="mono mt-1.5 w-full"
                disabled={inCorso}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Settori consigliati (virgole)</span>
              <input value={meta.settori} onChange={(e) => setMeta({ ...meta, settori: e.target.value })} className="mt-1.5 w-full" disabled={inCorso} />
            </label>
            <label className="text-sm">
              <span className="text-muted">Anti-pattern (virgole)</span>
              <input value={meta.antiPatterns} onChange={(e) => setMeta({ ...meta, antiPatterns: e.target.value })} className="mt-1.5 w-full" disabled={inCorso} />
            </label>
            <div className="text-sm sm:col-span-2">
              <span className="text-muted">Personalità Aaker (0–2) — primaria: </span>
              <select
                value={String(meta.aaker.primaria)}
                onChange={(e) => setMeta({ ...meta, aaker: { ...meta.aaker, primaria: e.target.value } })}
                disabled={inCorso}
                className="ml-1"
              >
                {["sincerity", "excitement", "competence", "sophistication", "ruggedness"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-3">
                {(["sincerity", "excitement", "competence", "sophistication", "ruggedness"] as const).map((d) => (
                  <label key={d} className="mono text-xs text-muted">
                    {d.slice(0, 4)}
                    <input
                      type="number"
                      min={0}
                      max={2}
                      value={Number(meta.aaker[d])}
                      onChange={(e) => setMeta({ ...meta, aaker: { ...meta.aaker, [d]: Number(e.target.value) } })}
                      className="ml-1 w-14"
                      disabled={inCorso}
                    />
                  </label>
                ))}
              </div>
            </div>
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">Note dell&apos;audit</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1.5 w-full" disabled={inCorso} />
            </label>
            <label className="text-sm">
              <span className="text-muted">Deciso da *</span>
              <input value={decisoDa} onChange={(e) => setDecisoDa(e.target.value)} className="mt-1.5 w-full" disabled={inCorso} />
            </label>
          </div>
        </section>
      )}

      {errore && (
        <p className="rounded-ctl bg-err-bg px-3 py-2 text-sm text-err" role="alert">
          {errore}
        </p>
      )}
      {(inCorso || log.length > 0) && <RunLog log={log} logRef={logRef} />}

      {!chiuso && (
        <div className="flex items-center justify-between">
          <button type="button" className={btnGhost} onClick={() => setChiediScarto(true)} disabled={inCorso || !confrontiFatti}>
            Scarta candidato
          </button>
          <ConfirmDialog
            open={chiediScarto}
            title="Scartare il candidato?"
            message="La run si chiude come 'scartata' e il candidato non entra in libreria. La decisione è definitiva (l'audit resta come prova)."
            confirmLabel="Scarta il candidato"
            tone="danger"
            onConfirm={() => {
              setChiediScarto(false);
              salva("scarta");
            }}
            onCancel={() => setChiediScarto(false)}
          />
          <button
            type="button"
            className={btnPrimary}
            onClick={() => salva("approva")}
            disabled={inCorso || !confrontiFatti || !meta.id.trim() || !meta.nome.trim()}
          >
            {inCorso ? "In corso…" : "Approva e pubblica"}
          </button>
        </div>
      )}
    </div>
  );
}
