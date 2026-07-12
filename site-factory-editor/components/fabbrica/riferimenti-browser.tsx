"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReferenceSummary } from "@/lib/factory/schemas";
import { Badge, OptoutBadge, btnPrimary, btnGhost, formatDate } from "@/components/ui";
import { RunLog, type LogLine } from "@/components/use-step-run";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Trash2 } from "lucide-react";

// Registro riferimenti: form di aggiunta (attestazione legale OBBLIGATORIA),
// verifica opt-out + estrazione in streaming NDJSON, lista con esiti.

const VUOTO = { url: "", galleria: "", settore: "", zonaGeografica: "", nota: "" };

export function RiferimentiBrowser({ references }: { references: ReferenceSummary[] }) {
  const router = useRouter();
  const [form, setForm] = useState(VUOTO);
  const [attestato, setAttestato] = useState(false);
  const [running, setRunning] = useState<string | null>(null); // id o "nuovo"
  const [log, setLog] = useState<LogLine[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"tutti" | "usabili" | "bloccati">("tutti");
  const [daEliminare, setDaEliminare] = useState<{ id: string; url: string } | null>(null);

  async function elimina() {
    if (!daEliminare) return;
    await fetch(`/api/factory/references/${daEliminare.id}`, { method: "DELETE" }).catch(() => {});
    setDaEliminare(null);
    router.refresh();
  }

  const append = (l: LogLine) => setLog((prev) => [...prev, l]); // scroll: sticky-bottom in RunLog

  async function consuma(res: Response) {
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error ?? `richiesta rifiutata (${res.status})`);
    }
    const reader = res.body.getReader();
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
        else if (ev.type === "done") append({ kind: "info", text: "Verifica completata." });
        else if (ev.type === "error") {
          setErrore(ev.message);
          append({ kind: "err", text: ev.message });
        }
      }
    }
  }

  async function aggiungi(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setLog([]);
    setRunning("nuovo");
    try {
      const res = await fetch("/api/factory/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: form.url.trim(),
          galleria: form.galleria.trim() || undefined,
          settore: form.settore.trim() || undefined,
          zonaGeografica: form.zonaGeografica.trim() || undefined,
          nota: form.nota.trim() || undefined,
          attestazioneNonConcorrente: attestato,
        }),
      });
      await consuma(res);
      setForm(VUOTO);
      setAttestato(false);
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(null);
    }
  }

  async function riverifica(id: string) {
    setErrore(null);
    setLog([]);
    setRunning(id);
    try {
      await consuma(await fetch(`/api/factory/references/${id}/run`, { method: "POST" }));
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Riferimenti</h1>
          <p className="mt-1 text-sm text-muted">
            Siti scelti a mano come evidenza per i preset nuovi. Ogni URL passa il gate opt-out TDM
            (L.132/2025) prima dell&apos;estrazione; il log è la prova di diligenza.
          </p>
        </div>
        <Link href="/fabbrica" className="whitespace-nowrap text-sm text-muted hover:text-ink">
          ← Fabbrica
        </Link>
      </div>

      {/* form di aggiunta — l'azione primaria della pagina */}
      <form onSubmit={aggiungi} className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm">
            <span className="text-muted">URL del sito *</span>
            <input
              type="url"
              required
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
              className="mt-1.5 w-full"
              disabled={!!running}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Galleria di provenienza</span>
            <input
              value={form.galleria}
              onChange={(e) => setForm({ ...form, galleria: e.target.value })}
              placeholder="One Page Love, Awwwards…"
              className="mt-1.5 w-full"
              disabled={!!running}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Settore</span>
            <input
              value={form.settore}
              onChange={(e) => setForm({ ...form, settore: e.target.value })}
              placeholder="architettura, food…"
              className="mt-1.5 w-full"
              disabled={!!running}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Zona geografica</span>
            <input
              value={form.zonaGeografica}
              onChange={(e) => setForm({ ...form, zonaGeografica: e.target.value })}
              placeholder="estero, nord Italia…"
              className="mt-1.5 w-full"
              disabled={!!running}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Nota</span>
            <input
              value={form.nota}
              onChange={(e) => setForm({ ...form, nota: e.target.value })}
              placeholder="perché è un buon riferimento"
              className="mt-1.5 w-full"
              disabled={!!running}
            />
          </label>
        </div>

        <label className="mt-4 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={attestato}
            onChange={(e) => setAttestato(e.target.checked)}
            className="mt-0.5"
            disabled={!!running}
          />
          <span>
            Attesto che questo sito <strong>non è un concorrente locale</strong> di alcun cliente
            ConsulBuild e non è un brand che seguiamo nel tempo.{" "}
            <span className="text-muted">(obbligatoria, registrata nel meta del riferimento)</span>
          </span>
        </label>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-xs text-muted">
            Verifica robots.txt · TDMRep · meta noai — poi estrazione token dal CSS computato.
          </p>
          <button type="submit" className={btnPrimary} disabled={!!running || !attestato || !form.url.trim()}>
            {running === "nuovo" ? "Verifica in corso…" : "Verifica e registra"}
          </button>
        </div>
      </form>

      {errore && (
        <p className="rounded-ctl bg-err-bg px-3 py-2 text-sm text-err" role="alert">
          {errore}
        </p>
      )}
      {(running || log.length > 0) && <RunLog log={log} />}

      {/* registro */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Registro ({references.length})
          </h2>
          <div className="flex items-center gap-2">
            {([
              ["tutti", "Tutti"],
              ["usabili", "Usabili"],
              ["bloccati", "Bloccati"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFiltro(k)}
                aria-pressed={filtro === k}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                  filtro === k ? "border-brand bg-brand-dim text-brand" : "border-line bg-surface text-muted hover:bg-raise"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {references.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nessun riferimento. Aggiungi il primo qui sopra: per una run di fabbrica ne servono
            almeno 3, eterogenei.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line card">
            {references
              .filter((r) =>
                filtro === "usabili"
                  ? r.optout?.esito === "consentito" && r.estratto
                  : filtro === "bloccati"
                    ? r.optout?.esito === "bloccato"
                    : true,
              )
              .map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                {r.screenshots ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/factory/references/${r.id}`}
                    alt=""
                    loading="lazy"
                    className="h-14 w-20 shrink-0 rounded-ctl border border-line bg-raise object-cover object-top"
                  />
                ) : (
                  <span className="h-14 w-20 shrink-0 rounded-ctl border border-line bg-raise" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    <a href={r.meta.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {r.meta.url}
                    </a>
                  </p>
                  <p className="mono mt-0.5 text-xs text-muted">
                    {r.id} · {formatDate(r.meta.aggiuntoIl)}
                    {r.meta.galleria ? ` · ${r.meta.galleria}` : ""}
                    {r.meta.settore ? ` · ${r.meta.settore}` : ""}
                  </p>
                  {r.optout && r.optout.esito !== "consentito" && (
                    <p className="mt-1 text-xs text-err">{r.optout.motivo}</p>
                  )}
                </div>
                <OptoutBadge esito={r.optout?.esito ?? null} />
                <Badge tone={r.estratto ? "ok" : "idle"}>{r.estratto ? "Estratto" : "Non estratto"}</Badge>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => riverifica(r.id)}
                  disabled={!!running}
                >
                  {running === r.id ? "In corso…" : "Riverifica"}
                </button>
                <button
                  type="button"
                  onClick={() => setDaEliminare({ id: r.id, url: r.meta.url })}
                  className="flex size-8 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-err-bg hover:text-err"
                  title="Elimina il riferimento…"
                  aria-label={`Elimina ${r.meta.url}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ConfirmDialog
        open={daEliminare !== null}
        title="Eliminare il riferimento?"
        tone="danger"
        message={
          <>
            <span className="mono">{daEliminare?.url}</span> esce dal registro (screenshot ed estrazione compresi). Un
            URL con refuso si elimina e si ricrea: l&apos;id è l&apos;hash dell&apos;URL.
          </>
        }
        confirmLabel="Elimina"
        onConfirm={elimina}
        onCancel={() => setDaEliminare(null)}
      />
    </div>
  );
}


