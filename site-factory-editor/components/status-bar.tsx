"use client";

// Status bar degli agenti (DESIGN-REFACTOR §6.2-6.3): barra fissa in basso,
// visibile solo quando c'è lavoro in background o un esito recente. Progresso
// ONESTO: fasi reali (pip per fase, la corrente pulsa) + tempo trascorso in
// mono; il «di solito ~N min» viene dalle durate storiche — mai percentuali
// inventate. Il pannello espanso mostra la timeline delle fasi con durate e
// il log live (tail dal bus). Lo stop è esplicito e confermato.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ChevronUp, Square, X, ArrowUpRight } from "lucide-react";
import { useRuns } from "./run-provider";
import { AgentOrb } from "./agent-orb";
import { agenteDaFase, percorsoRun, nomeStep, formatElapsed } from "@/lib/agenti";
import { RunLog, type LogLine } from "./use-step-run";
import { ConfirmDialog } from "./confirm-dialog";
import { btnGhost } from "./ui";
import type { BusRunInfo } from "@/lib/run-bus";

const shorten = (p: string) => (p.length > 60 ? "…" + p.slice(-58) : p);

function statoOrb(r: BusRunInfo): "attivo" | "ok" | "errore" | "interrotto" {
  if (!r.done) return "attivo";
  if (r.esito === "ok") return "ok";
  if (r.esito === "interrotto") return "interrotto";
  return "errore";
}

/** Pip delle fasi viste: piene le concluse, pulsante la corrente. */
function FasiPips({ r, ridotto }: { r: BusRunInfo; ridotto: boolean }) {
  const fasi = r.fasi.slice(-7); // le ultime, per non crescere all'infinito
  if (fasi.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`fase ${r.fasi.length}: ${r.fase ?? ""}`}>
      {fasi.map((f, i) => {
        const corrente = i === fasi.length - 1 && !r.done;
        return corrente && !ridotto ? (
          <motion.span
            key={f.at}
            className="size-1.5 rounded-full bg-brand"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <span key={f.at} className={`size-1.5 rounded-full ${corrente ? "bg-brand" : "bg-brand/45"}`} />
        );
      })}
    </span>
  );
}

function esitoTesto(r: BusRunInfo): { testo: string; classe: string } {
  if (!r.done) return { testo: "", classe: "" };
  const durata = r.endedAt && !r.zombie ? ` in ${formatElapsed(r.endedAt - r.startedAt)}` : "";
  if (r.esito === "ok") return { testo: `Finito${durata}`, classe: "text-ok" };
  if (r.esito === "interrotto") return { testo: r.errore ?? "Interrotto", classe: "text-warn" };
  return { testo: r.errore ?? "Errore", classe: "text-err" };
}

export function StatusBar() {
  const { runs, vivi, espanso, setEspanso, stopODismiss } = useRuns();
  const ridotto = useReducedMotion() ?? false;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [daFermare, setDaFermare] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const visibile = runs.length > 0;
  const focused = runs.find((r) => r.id === focusId) ?? vivi[0] ?? runs[0];

  // Le action bar delle schede si alzano di conseguenza (var globale).
  useEffect(() => {
    document.documentElement.style.setProperty("--statusbar-offset", visibile ? "56px" : "0px");
    return () => {
      document.documentElement.style.setProperty("--statusbar-offset", "0px");
    };
  }, [visibile]);

  // Ticker del tempo trascorso (solo con run vivi).
  useEffect(() => {
    if (vivi.length === 0) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [vivi.length]);

  // Esc chiude il pannello.
  useEffect(() => {
    if (!espanso) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEspanso(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [espanso, setEspanso]);

  if (!visibile || !focused) return null;

  const agente = agenteDaFase(focused.fase, focused.step, focused.kind);
  const esito = esitoTesto(focused);
  const altri = runs.filter((r) => r.id !== focused.id);

  return (
    <>
      {espanso && <PannelloRun focused={focused} onFocus={setFocusId} />}

      {/* Niente animazione d'ingresso al mount: con la tab in background il
          rAF è sospeso e la barra resterebbe parcheggiata fuori viewport. Il
          componente monta già solo quando c'è un run da mostrare. */}
      <div
        role="status"
        aria-label="Lavoro degli agenti in background"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 shadow-raise backdrop-blur-sm"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <AgentOrb agente={agente} stato={statoOrb(focused)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-semibold">{agente.nome}</span>
              <span className="truncate text-muted">
                {focused.label} · {nomeStep(focused)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
              {focused.done ? (
                <span className={esito.classe}>{esito.testo}</span>
              ) : (
                <>
                  <FasiPips r={focused} ridotto={ridotto} />
                  <span className="truncate">{focused.fase ?? "avvio…"}</span>
                </>
              )}
            </div>
          </div>

          {/* Run in parallelo: sfere mini per cambiare focus */}
          {altri.length > 0 && (
            <div className="flex items-center gap-1.5">
              {altri.slice(0, 3).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setFocusId(r.id)}
                  title={`${r.label} · ${nomeStep(r)}`}
                  className="rounded-full transition-transform duration-150 hover:scale-110"
                >
                  <AgentOrb agente={agenteDaFase(r.fase, r.step, r.kind)} stato={statoOrb(r)} size={18} />
                </button>
              ))}
              {altri.length > 3 && <span className="text-xs text-faint">+{altri.length - 3}</span>}
            </div>
          )}

          {!focused.done && (
            // aria-hidden: il cronometro ticca ogni secondo e la barra è una
            // live-region atomica (role="status") — senza questo lo screen
            // reader ri-annuncerebbe tutto ogni secondo. Fase ed esito, che
            // cambiano di rado, restano annunciati.
            <span className="mono text-sm text-ink" aria-hidden>
              {formatElapsed(Date.now() - focused.startedAt)}
              {focused.tipicoMs ? (
                <span className="text-faint"> · di solito ~{Math.max(1, Math.round(focused.tipicoMs / 60000))} min</span>
              ) : null}
            </span>
          )}

          <Link href={percorsoRun(focused)} className={btnGhost} title="Apri la scheda del run">
            Apri scheda <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
          {focused.done ? (
            <button
              onClick={() => stopODismiss(focused.id)}
              className={btnGhost}
              title="Nascondi l'esito"
              aria-label="Nascondi l'esito"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : (
            <button
              onClick={() => setDaFermare(focused.id)}
              className={`${btnGhost} hover:!text-err`}
              title="Ferma il run"
              aria-label="Ferma il run"
            >
              <Square className="size-3.5" aria-hidden />
            </button>
          )}
          <button
            onClick={() => setEspanso(!espanso)}
            className={btnGhost}
            aria-expanded={espanso}
            aria-label={espanso ? "Chiudi il pannello dei run" : "Apri il pannello dei run"}
          >
            <motion.span animate={{ rotate: espanso ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronUp className="size-4" aria-hidden />
            </motion.span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={daFermare !== null}
        title="Fermare il run?"
        message="I processi in corso vengono interrotti (SIGTERM) e lo step passa in errore. Potrai rilanciarlo dalla scheda."
        confirmLabel="Ferma il run"
        cancelLabel="Annulla"
        tone="danger"
        onConfirm={() => {
          if (daFermare) stopODismiss(daFermare);
          setDaFermare(null);
        }}
        onCancel={() => setDaFermare(null)}
      />
    </>
  );
}

/* ---- Pannello espanso: lista run + timeline fasi + log live ---------------- */

function PannelloRun({
  focused,
  onFocus,
}: {
  focused: BusRunInfo;
  onFocus: (id: string) => void;
}) {
  const { runs } = useRuns();
  const [log, setLog] = useState<LogLine[]>([]);
  const cursore = useRef(0);
  const runId = focused.id;

  // Lo scroll (sticky-bottom) lo gestisce RunLog: qui solo accodare.
  const aggiungi = useCallback((nuovi: LogLine[]) => {
    if (nuovi.length === 0) return;
    setLog((prev) => [...prev, ...nuovi]);
  }, []);

  // Tail del log del run selezionato (poll 1,2s finché vivo; una volta se finito).
  useEffect(() => {
    cursore.current = 0;
    setLog([]);
    let fermo = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tira() {
      try {
        const res = await fetch(`/api/runs/events?id=${encodeURIComponent(runId)}&since=${cursore.current}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data: { events: Array<Record<string, unknown>>; next: number; done: boolean } = await res.json();
          cursore.current = data.next;
          const nuovi: LogLine[] = [];
          for (const ev of data.events) {
            if (ev.type === "tool")
              nuovi.push({ kind: "tool", text: `${ev.name}${ev.detail ? "  " + shorten(String(ev.detail)) : ""}` });
            else if (ev.type === "text") nuovi.push({ kind: "text", text: String(ev.text) });
            else if (ev.type === "phase") nuovi.push({ kind: "phase", text: String(ev.label) });
            else if (ev.type === "error") nuovi.push({ kind: "err", text: String(ev.message) });
            else if (ev.type === "done") nuovi.push({ kind: "info", text: "Fatto." });
          }
          if (!fermo) aggiungi(nuovi);
          if (data.done) return; // niente altro da tirare
        }
      } catch {
        /* riproverà */
      }
      if (!fermo) timer = setTimeout(tira, 1200);
    }
    tira();
    return () => {
      fermo = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, aggiungi]);

  return (
    // Entrata via CSS (classe `panel-in`), NON motion: sotto reduced-motion
    // motion può congelare initial (opacity/transform) e lasciare il pannello
    // invisibile o fuori schermo. Un'animazione CSS invece, quando la regola
    // globale prefers-reduced-motion azzera la durata, salta allo stato FINALE
    // (visibile, posizionato) — mai congelata a metà.
    <div className="panel-in fixed inset-x-0 bottom-14 z-30 border-t border-line bg-surface shadow-overlay">
      <div className="mx-auto grid h-[340px] max-w-7xl grid-cols-[280px_1fr] gap-0 max-md:grid-cols-1">
        {/* Lista run */}
        <div className="overflow-y-auto border-r border-line py-2 max-md:hidden">
          {runs.map((r) => {
            const a = agenteDaFase(r.fase, r.step, r.kind);
            const attivo = r.id === focused.id;
            return (
              <button
                key={r.id}
                onClick={() => onFocus(r.id)}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-150 ${
                  attivo ? "bg-brand-dim" : "hover:bg-raise"
                }`}
              >
                <AgentOrb agente={a} stato={statoOrb(r)} size={20} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.label}</span>
                  <span className="block truncate text-xs text-muted">
                    {nomeStep(r)} · {r.done ? esitoTesto(r).testo : (r.fase ?? "avvio…")}
                  </span>
                </span>
                {!r.done && <span className="mono text-xs text-faint">{formatElapsed(Date.now() - r.startedAt)}</span>}
              </button>
            );
          })}
        </div>

        {/* Timeline fasi + log. min-h-0 + overflow-hidden: senza, la cella grid
            ha min-height:auto e cresce col contenuto invece di far scrollare il
            log — è il motivo per cui il pannello finiva "tagliato" sotto. */}
        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden p-4">
          <TimelineFasi r={focused} />
          <RunLog
            log={log.length ? log : [{ kind: "info", text: "In attesa di eventi…" }]}
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
}

function TimelineFasi({ r }: { r: BusRunInfo }) {
  if (r.fasi.length === 0) return null;
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {r.fasi.map((f, i) => {
        const fine = i < r.fasi.length - 1 ? r.fasi[i + 1].at : (r.endedAt ?? Date.now());
        const corrente = i === r.fasi.length - 1 && !r.done;
        return (
          <li key={f.at} className={`inline-flex items-center gap-1.5 ${corrente ? "text-ink" : "text-muted"}`}>
            <span className={`size-1.5 rounded-full ${corrente ? "bg-brand" : "bg-ok"}`} aria-hidden />
            <span className={corrente ? "font-medium" : ""}>{f.label}</span>
            <span className="mono text-faint">{formatElapsed(fine - f.at)}</span>
          </li>
        );
      })}
    </ol>
  );
}
