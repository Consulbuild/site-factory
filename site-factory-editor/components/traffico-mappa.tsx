"use client";

// «Ricerche su cui puntare» nella card Sito del dettaglio Traffico (piano docs/traffico/piano-T4.md §8,
// DESIGN-BRIEF §Area Traffico). La vista la calcola il server (vistaMappa in lib/mappa-query.ts); qui solo le
// azioni: calcolare o ricalcolare (lavoro traffico:<slug>:mappa sul run-bus, fase live dalla status bar),
// escludere una ricerca col perché e riammetterla, senza spendere credito. Mai posizioni, clic o clienti stimati.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./confirm-dialog";
import { Badge, Banner, btnGhost, btnPrimary, btnSecondary, formatDate } from "./ui";
import { useRuns } from "./run-provider";
import { formatElapsed } from "@/lib/agenti";
import type { RigaVista, VistaMappa } from "@/lib/mappa-query";

const TITOLO_ID = "mappa-query";
const usd = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Riga({ r, onEscludi }: { r: RigaVista; onEscludi: (() => void) | null }) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="min-w-0 text-sm font-medium break-words text-ink">{r.testo}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="mono break-words text-muted">{r.volume}</span>
          {r.difficolta && <Badge tone={r.difficolta === "bassa" ? "ok" : "warn"}>Difficoltà {r.difficolta}</Badge>}
          {onEscludi && (
            <button type="button" className={btnGhost} onClick={onEscludi} aria-label={`Escludi «${r.testo}»`}>
              Escludi…
            </button>
          )}
        </div>
      </div>
      <details className="mt-0.5 text-sm">
        <summary className="w-fit cursor-pointer text-muted select-none hover:text-ink">Perché</summary>
        <ul className="mt-2 max-w-2xl list-disc space-y-1 pl-4 text-muted">
          {r.perche.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {r.checkUrl && (
          <a href={r.checkUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-brand underline-offset-2 hover:underline">
            Apri la ricerca su Google ↗
          </a>
        )}
      </details>
    </li>
  );
}

export function TrafficoMappa({ slug, vista: v }: { slug: string; vista: VistaMappa }) {
  const router = useRouter();
  const { vivi, refresh } = useRuns();
  const titolo = useRef<HTMLHeadingElement>(null);
  const motivoId = useId();
  const run = vivi.find((r) => r.kind === "traffico" && r.slug === slug && r.step === "mappa");
  const [ora, setOra] = useState(() => Date.now());
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [daEscludere, setDaEscludere] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ricalcola, setRicalcola] = useState(false);
  // Chi ha aperto un dialog riprende il focus quando lo si annulla (Esc o Annulla).
  const origine = useRef<HTMLElement | null>(null);
  const apri = (fn: () => void) => {
    origine.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fn();
  };
  const annulla = (fn: () => void) => {
    fn();
    requestAnimationFrame(() => (origine.current ?? titolo.current)?.focus());
  };

  // Fine del calcolo (il run sparisce dai vivi): la pagina rilegge la mappa dal disco.
  const eraVivo = useRef(!!run);
  useEffect(() => {
    if (eraVivo.current && !run) router.refresh();
    eraVivo.current = !!run;
  }, [run, router]);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setOra(Date.now()), 1000);
    return () => clearInterval(t);
  }, [run]);

  const invia = useCallback(
    async (corpo: Record<string, string>): Promise<boolean> => {
      setInviando(true);
      setErrore(null);
      try {
        const res = await fetch(`/api/clients/${slug}/traffico/mappa`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
        const data: { error?: unknown } = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrore(typeof data.error === "string" ? data.error : `Errore ${res.status}`);
          return false;
        }
        return true;
      } catch (e) {
        setErrore(`Richiesta non riuscita: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      } finally {
        setInviando(false);
      }
    },
    [slug],
  );

  const calcola = async () => {
    setRicalcola(false);
    if (await invia({ azione: "calcola" })) {
      await refresh();
      router.refresh();
    }
    titolo.current?.focus();
  };
  const escludi = async () => {
    const testo = daEscludere;
    if (!testo) return;
    setDaEscludere(null);
    if (await invia({ azione: "escludi", testo, motivo: motivo.trim() })) router.refresh();
    setMotivo("");
    titolo.current?.focus();
  };
  const riammetti = async (testo: string) => {
    if (await invia({ azione: "riammetti", testo })) router.refresh();
    titolo.current?.focus();
  };

  const inCalcolo = !!run || v.stato === "in_calcolo";
  const badge = inCalcolo ? { tone: "brand" as const, label: "In calcolo" } : v.badge;
  const haMappa = v.gruppi.length > 0 || v.stato === "poche";
  const bloccato = !!v.motivoBlocco;
  const modificabile = v.modificabile && !inCalcolo && !inviando;
  const motivoValido = motivo.trim().length >= 3 && motivo.trim().length <= 200;
  // Senza mappa, in attesa delle zone o senza chiavi, la frase di stato è già il motivo: niente doppioni.
  const motivoNellaFrase = v.stato === "in_pausa" || (!haMappa && (v.stato === "attesa_zone" || v.stato === "non_configurata"));

  // Una sola primaria nella pagina: Calcola, Riprova o Ricalcola quando è il prossimo passo; mai con un blocco
  // (la card delle zone ha la sua primaria quando chiede l'operatore, e allora la mappa aspetta).
  let azione: React.ReactNode = null;
  if (!inCalcolo && v.stato !== "in_pausa" && v.stato !== "attesa_zone") {
    const disabilitato = bloccato || inviando;
    const descritto = bloccato ? motivoId : undefined;
    if (!haMappa && v.stato !== "non_leggibile") {
      const etichetta = v.stato === "non_riuscita" ? "Riprova" : "Calcola la mappa";
      const primaria = !bloccato && (v.stato === "da_calcolare" || v.stato === "non_riuscita");
      azione = (
        <button type="button" className={primaria ? btnPrimary : btnSecondary} disabled={disabilitato} aria-describedby={descritto} onClick={() => void calcola()}>
          {inviando ? "Avvio…" : etichetta}
        </button>
      );
    } else {
      const primaria = !bloccato && (v.stato === "da_ricalcolare" || v.stato === "non_leggibile");
      azione = (
        <button type="button" className={primaria ? btnPrimary : btnSecondary} disabled={disabilitato} aria-describedby={descritto} onClick={() => apri(() => setRicalcola(true))}>
          {inviando ? "Avvio…" : "Ricalcola…"}
        </button>
      );
    }
  } else if (v.stato === "attesa_zone") {
    azione = (
      <button type="button" className={btnSecondary} disabled aria-describedby={motivoId}>
        Calcola la mappa
      </button>
    );
  }

  return (
    <section aria-labelledby={TITOLO_ID} className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 id={TITOLO_ID} ref={titolo} tabIndex={-1} className="font-semibold">
            Ricerche su cui puntare
          </h3>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        {azione}
      </div>
      {v.meta && <p className="mono mt-1 text-muted">{v.meta}</p>}

      {inCalcolo ? (
        <p role="status" className="mt-2 text-sm text-ink">
          {run?.fase ?? "Avvio del calcolo"}
          {run && (
            <span className="mono text-muted" aria-hidden>
              {" "}
              · {formatElapsed(ora - run.startedAt)}
            </span>
          )}
          . Puoi chiudere la pagina: il calcolo continua.
        </p>
      ) : (
        v.frase && (
          <p role="status" id={motivoNellaFrase ? motivoId : undefined} className="mt-2 text-sm text-ink">
            {v.frase}
          </p>
        )
      )}
      {!inCalcolo && bloccato && !motivoNellaFrase && (
        <p id={motivoId} className={`mt-2 text-sm ${v.stato === "bloccata" ? "text-err" : "text-muted"}`}>
          {v.stato === "bloccata" ? v.motivoBlocco : `Ricalcolo non disponibile. ${v.motivoBlocco}.`}
        </p>
      )}
      {v.motiviPoche.length > 0 && (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted">
          {v.motiviPoche.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      {errore && (
        <p role="alert" className="mt-3 text-sm text-err">
          {errore}
        </p>
      )}
      {v.erroreUltimo && !inCalcolo && (
        <div className="mt-3">
          <Banner tone="err" title={haMappa ? "L'ultimo ricalcolo non è riuscito" : "Il calcolo non è riuscito"}>
            {v.erroreUltimo}
            {haMappa && " Resta la mappa del calcolo precedente."}
          </Banner>
        </div>
      )}
      {v.cambiati.length > 0 && !inCalcolo && v.stato === "da_ricalcolare" && (
        <div className="mt-3">
          <Banner tone="warn" title="Ingressi cambiati dopo il calcolo">
            È cambiato: <span className="mono">{v.cambiati.join(", ")}</span>. Ricalcola per aggiornare le ricerche; quelle escluse restano escluse.
          </Banner>
        </div>
      )}
      {v.registrate && (
        <div className="mt-3">
          <Banner tone="warn">Mappa calcolata con risposte registrate di prova: volumi e pagine di Google non sono dati reali.</Banner>
        </div>
      )}

      {v.gruppi.map((g) => (
        <div key={g.chiave} className="mt-4">
          <h4 className="text-sm font-semibold text-muted">{g.titolo}</h4>
          <ul className="divide-y divide-line">
            {g.righe.map((r) => (
              <Riga key={r.testo} r={r} onEscludi={modificabile ? () => apri(() => setDaEscludere(r.testo)) : null} />
            ))}
          </ul>
        </div>
      ))}

      {v.dettagli && (
        <details className="mt-4 border-t border-line pt-3 text-sm">
          <summary className="w-fit cursor-pointer text-muted select-none hover:text-ink">
            Dettagli del calcolo: <span className="mono">{v.dettagli.riepilogo}</span>
          </summary>
          <div className="mt-2 space-y-3 text-muted">
            {v.dettagli.serviziSenzaQuery.length > 0 && (
              <div>
                <p className="font-medium text-ink">Lavori senza ricerche ({v.dettagli.serviziSenzaQuery.length})</p>
                <p>{v.dettagli.serviziSenzaQuery.join(" · ")}</p>
              </div>
            )}
            {v.dettagli.dominiNonInElenco.length > 0 && (
              <div>
                <p className="font-medium text-ink">Siti da classificare ({v.dettagli.dominiNonInElenco.length})</p>
                <p className="mono break-words">{v.dettagli.dominiNonInElenco.join(" · ")}</p>
              </div>
            )}
            {v.dettagli.avvisi.length > 0 && (
              <div>
                <p className="font-medium text-ink">Avvisi ({v.dettagli.avvisi.length})</p>
                <ul className="list-disc space-y-1 pl-4">
                  {v.dettagli.avvisi.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {v.escluse.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="w-fit cursor-pointer text-muted select-none hover:text-ink">Escluse da te ({v.escluse.length})</summary>
          <ul className="mt-1 divide-y divide-line">
            {v.escluse.map((e) => (
              <li key={e.testo} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium break-words text-ink">{e.testo}</p>
                  <p className="text-muted">
                    «{e.motivo}» · <span className="mono">{formatDate(e.at)}</span>
                  </p>
                </div>
                {modificabile && (
                  <button type="button" className={`${btnGhost} shrink-0`} disabled={inviando} onClick={() => void riammetti(e.testo)} aria-label={`Riammetti «${e.testo}»`}>
                    Riammetti
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={daEscludere !== null}
        title="Escludere questa ricerca?"
        message={`«${daEscludere ?? ""}» esce dalle ricerche su cui puntare e il posto va alla successiva. Non si spende credito.`}
        confirmLabel="Escludi la ricerca"
        confirmDisabled={!motivoValido}
        onConfirm={() => void escludi()}
        onCancel={() =>
          annulla(() => {
            setDaEscludere(null);
            setMotivo("");
          })
        }
      >
        <label htmlFor="mappa-motivo" className="mt-4 block text-sm font-medium text-ink">
          Perché la escludi
        </label>
        <textarea
          id="mappa-motivo"
          className="mt-1.5 w-full"
          rows={3}
          maxLength={200}
          value={motivo}
          autoFocus
          aria-describedby="mappa-motivo-aiuto"
          onChange={(e) => setMotivo(e.target.value)}
        />
        <p id="mappa-motivo-aiuto" className="mt-1 text-xs text-faint">
          Da 3 a 200 caratteri: resta accanto alla ricerca in «Escluse da te».
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={ricalcola}
        title="Ricalcolare la mappa?"
        message={`Volumi dell'ultimo mese e pagine di Google degli ultimi 14 giorni vengono dalla cache; il resto si paga a DataForSEO, al massimo circa ${v.stimaUsd === null ? "—" : usd(v.stimaUsd)} $. Le esclusioni restano.`}
        confirmLabel="Ricalcola"
        onConfirm={() => void calcola()}
        onCancel={() => annulla(() => setRicalcola(false))}
      />
    </section>
  );
}
