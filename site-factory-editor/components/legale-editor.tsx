"use client";

// Editor della scheda Legale: striscia profilo (foro con evidenza), i 3
// documenti come editor a blocchi, pannello della catena di verifica con
// ancore ai blocchi, report interno, staleness, Salva + Conferma con
// condizioni riverificate dal server. Sotto-componenti a module scope
// (regola anti-remount). Edit di testo soltanto: la struttura si cambia
// rigenerando (v1, vedi piano).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Banner, btnPrimary, btnSecondary, btnGhost } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BackBar } from "@/components/back-bar";
import { useStepRun, RunLog } from "@/components/use-step-run";
import { useUnsavedGuard } from "@/components/use-unsaved-guard";
import { useSaveShortcut } from "@/components/use-save-shortcut";

/* ---- tipi client-safe (specchio del contratto; la validazione vera è server) ---- */
type Block = { type: "h2"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };
type Doc = { intro: string; updatedAt: string; blocks: Block[] };
export type LegaleData = { privacy: Doc; termini: Doc; formNotice: string };
type Finding = { lente: string; doc: string; path: string; gravita: string; problema: string; fix: string };
export type ReviewData = {
  verdict: "PASS" | "FAIL";
  round: number;
  lenti: Record<string, "PASS" | "FAIL">;
  findings: Finding[];
} | null;
export type ForoData = { foro: string; fonte: string; url: string; evidenza: string; confidenza: "alta" | "bassa" } | null;

const NOME_LENTE: Record<string, string> = {
  antiInvenzione: "anti-invenzione",
  conformita: "conformità-skill",
  refusi: "refusi e coerenza",
};
const NOME_DOC: Record<string, string> = { privacy: "Informativa privacy", termini: "Termini e condizioni", formNotice: "Informativa breve del form" };

const anchorId = (doc: string, i: number | null) => (i === null ? `blocco-${doc}` : `blocco-${doc}-${i}`);
/** «privacy.blocks[7]» → ancora del blocco; «formNotice» → ancora del campo. */
function anchorDaPath(p: string): string {
  const m = p.match(/^(privacy|termini)\.blocks\[(\d+)\]/);
  if (m) return anchorId(m[1], Number(m[2]));
  return anchorId(p.startsWith("termini") ? "termini" : p.startsWith("privacy") ? "privacy" : "formNotice", null);
}

function goto(anchor: string): void {
  const el = document.getElementById(anchor);
  if (!el) return;
  el.scrollIntoView({ block: "center" });
  el.style.outline = "2px solid var(--brand)";
  el.style.outlineOffset = "4px";
  setTimeout(() => {
    el.style.outline = "";
    el.style.outlineOffset = "";
  }, 1400);
}

/* ---- sotto-componenti ---- */

function ProfiloStrip({ foro, forma, formaBase }: { foro: ForoData; forma: string; formaBase: string }) {
  return (
    <section className="card mt-6 p-5">
      <h2 className="text-sm font-semibold text-muted">Su cosa poggiano i documenti</h2>
      <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-faint">Foro competente (dal circondario, mai dalla provincia)</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-medium">{foro ? `Foro di ${foro.foro}` : "non derivato"}</span>
            {foro && <Badge tone={foro.confidenza === "alta" ? "ok" : "warn"}>confidenza {foro.confidenza}</Badge>}
          </dd>
          {foro && (
            <dd className="mono mt-1 text-xs text-faint" title={foro.evidenza}>
              fonte: {foro.url ? (
                <a href={foro.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {foro.fonte}
                </a>
              ) : (
                foro.fonte
              )}
            </dd>
          )}
        </div>
        <div>
          <dt className="text-xs text-faint">Forma giuridica (inferita) e base giuridica del form</dt>
          <dd className="mt-0.5 font-medium">{forma === "societa" ? "società" : "ditta individuale"}</dd>
          <dd className="mono mt-1 text-xs text-faint">
            {formaBase} · form preventivo → art. 6.1.b GDPR (niente consenso)
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ReviewPanel({ review, corrente, onRiverifica, running }: { review: ReviewData; corrente: boolean; onRiverifica: () => void; running: boolean }) {
  return (
    <section className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Catena di verifica</h2>
        <div className="flex flex-wrap items-center gap-2">
          {review ? (
            <>
              <Badge tone={review.verdict === "PASS" ? "ok" : "err"}>{review.verdict}</Badge>
              <span className="mono text-xs text-faint">round {review.round}</span>
              {!corrente && <Badge tone="warn">non aggiornata alle ultime modifiche</Badge>}
            </>
          ) : (
            <Badge tone="warn">mai eseguita</Badge>
          )}
          <button type="button" className={btnSecondary} onClick={onRiverifica} disabled={running}>
            Riverifica
          </button>
        </div>
      </div>
      {review && (
        <ul className="mono mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {Object.entries(review.lenti).map(([k, v]) => (
            <li key={k}>
              {NOME_LENTE[k] ?? k}: <span className={v === "PASS" ? "text-ok" : "text-err"}>{v}</span>
            </li>
          ))}
        </ul>
      )}
      {review && review.findings.length > 0 && (
        <ul className="mt-4 space-y-3">
          {review.findings.map((f, i) => (
            <li key={i} className="rounded-ctl bg-raise p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={f.gravita === "bloccante" ? "err" : "warn"}>{f.gravita}</Badge>
                <span className="mono text-xs text-faint">
                  {NOME_LENTE[f.lente] ?? f.lente} · {f.path || f.doc}
                </span>
                <button type="button" className={`${btnGhost} ml-auto`} onClick={() => goto(anchorDaPath(f.path || f.doc))}>
                  vai al blocco →
                </button>
              </div>
              <p className="mt-1.5">{f.problema}</p>
              {f.fix && <p className="mt-1 text-muted">Fix proposto: {f.fix}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BlockField({ doc, i, block, onChange }: { doc: string; i: number; block: Block; onChange: (b: Block) => void }) {
  if (block.type === "h2") {
    return (
      <input
        id={anchorId(doc, i)}
        className="w-full rounded-ctl border border-field bg-raise px-3 py-2 font-semibold"
        value={block.text}
        onChange={(e) => onChange({ type: "h2", text: e.target.value })}
        aria-label={`Titolo di sezione ${i + 1}`}
      />
    );
  }
  if (block.type === "ul") {
    return (
      <textarea
        id={anchorId(doc, i)}
        className="mono w-full rounded-ctl border border-field bg-raise px-3 py-2 text-sm"
        rows={Math.max(2, block.items.length)}
        value={block.items.join("\n")}
        onChange={(e) => onChange({ type: "ul", items: e.target.value.split("\n") })}
        aria-label={`Elenco puntato (una voce per riga)`}
      />
    );
  }
  return (
    <textarea
      id={anchorId(doc, i)}
      className="w-full rounded-ctl border border-field bg-raise px-3 py-2 text-sm leading-relaxed"
      rows={Math.max(2, Math.ceil(block.text.length / 90))}
      value={block.text}
      onChange={(e) => onChange({ type: "p", text: e.target.value })}
      aria-label={`Paragrafo`}
    />
  );
}

function DocSection({ docKey, doc, onChange }: { docKey: "privacy" | "termini"; doc: Doc; onChange: (d: Doc) => void }) {
  return (
    <section id={anchorId(docKey, null)} className="card mt-6 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{NOME_DOC[docKey]}</h2>
        <span className="mono text-xs text-faint">
          {doc.intro} · aggiornato {doc.updatedAt}
        </span>
      </div>
      <p className="mt-1 text-xs text-faint">
        Qui si correggono i testi; per cambiare la struttura (aggiungere/togliere sezioni) si rigenera o si aggiorna con l&apos;AI.
      </p>
      <div className="mt-4 space-y-3">
        {doc.blocks.map((b, i) => (
          <BlockField
            key={i}
            doc={docKey}
            i={i}
            block={b}
            onChange={(nb) => onChange({ ...doc, blocks: doc.blocks.map((x, j) => (j === i ? nb : x)) })}
          />
        ))}
      </div>
    </section>
  );
}

/* ---- editor ---- */

export function LegaleEditor(props: {
  slug: string;
  azienda: string;
  initial: LegaleData;
  foro: ForoData;
  review: ReviewData;
  reviewCorrente: boolean;
  report: string | null;
  stale: string[];
  verificato: boolean;
  forma: { forma: string; base: string };
  erroreRun?: string;
}) {
  const { slug, azienda } = props;
  const router = useRouter();
  const runner = useStepRun(slug, "legale");
  const [data, setData] = useState<LegaleData>(() => JSON.parse(JSON.stringify(props.initial)) as LegaleData);
  const [erroriServer, setErroriServer] = useState<string[]>([]);
  const [dialogo, setDialogo] = useState<"rigenera" | "override" | null>(null);
  const [salvando, setSalvando] = useState(false);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(props.initial), [data, props.initial]);
  const { navigate, dialog } = useUnsavedGuard(dirty);

  const pulita = (): LegaleData => ({
    ...data,
    privacy: { ...data.privacy, blocks: puliziaBlocchi(data.privacy.blocks) },
    termini: { ...data.termini, blocks: puliziaBlocchi(data.termini.blocks) },
    formNotice: data.formNotice.trim(),
  });

  async function salva(): Promise<boolean> {
    setSalvando(true);
    setErroriServer([]);
    try {
      const r = await fetch(`/api/clients/${slug}/legale`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legale: pulita() }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErroriServer([d.error, ...(d.errors ?? [])].filter(Boolean));
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setSalvando(false);
    }
  }

  async function conferma(override: boolean): Promise<void> {
    const r = await fetch(`/api/clients/${slug}/legale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(override ? { override: true } : {}),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      if (r.status === 409 && !override) {
        setDialogo("override");
        setErroriServer([d.error].filter(Boolean));
        return;
      }
      setErroriServer([d.error, ...(d.errors ?? [])].filter(Boolean));
      return;
    }
    navigate(`/clienti/${slug}`); // post-conferma → hub, come le altre schede
  }

  async function riverifica(): Promise<void> {
    if (dirty && !(await salva())) return;
    runner.run("critic", "Riverifica della catena a 3 lenti sui documenti correnti (nessuna rigenerazione)…");
  }

  useSaveShortcut(() => void salva(), dirty && !salvando);

  const motiviConfermaBloccata = [
    dirty ? "modifiche non salvate" : null,
    !props.review ? "catena mai eseguita" : props.review.verdict !== "PASS" ? "catena in FAIL" : null,
    props.review && !props.reviewCorrente ? "verifica non aggiornata" : null,
    props.foro?.confidenza !== "alta" ? "foro a confidenza bassa" : null,
  ].filter((x): x is string => x !== null);

  return (
    <div className="mx-auto w-full max-w-3xl pb-28">
      {dialog}
      <ConfirmDialog
        open={dialogo === "rigenera"}
        title="Rigenerare i documenti legali con l'AI?"
        message="La rigenerazione riparte dai soli dati del cliente e sostituisce i tre documenti (le modifiche manuali si perdono). La catena di verifica rigira da capo."
        confirmLabel="Rigenera da zero"
        tone="danger"
        onConfirm={() => {
          setDialogo(null);
          runner.run("generate", "Rigenerazione completa dei documenti legali…");
        }}
        onCancel={() => setDialogo(null)}
      />
      <ConfirmDialog
        open={dialogo === "override"}
        title="Confermare NONOSTANTE le condizioni non soddisfatte?"
        message={`Il server segnala: ${erroriServer.join("; ") || "condizioni di conferma non soddisfatte"}. Un documento legale pubblicato con errori è un danno per il cliente: conferma solo se hai verificato di persona.`}
        confirmLabel="Conferma comunque"
        tone="danger"
        onConfirm={() => {
          setDialogo(null);
          void conferma(true);
        }}
        onCancel={() => setDialogo(null)}
      />

      <BackBar slug={slug} businessName={azienda} step="Legale" onNavigate={navigate} />

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Documenti legali</h1>
          <p className="mt-1 text-sm text-muted">
            Privacy (/privacy), termini (/termini) e informativa breve del form — generati dai soli dati verificati, con catena di
            verifica. Il report interno documenta fonti e derivazioni.
          </p>
        </div>
        <button type="button" className={btnGhost} onClick={() => setDialogo("rigenera")} disabled={runner.running}>
          ⟳ Rigenera con l&apos;AI
        </button>
      </header>

      {runner.running ? (
        <div className="mt-6">
          <RunLog log={runner.log} />
        </div>
      ) : (
        <>
          {props.erroreRun && (
            <div className="mt-6">
              <Banner tone="err" title="L'ultimo run è fallito">
                {props.erroreRun}
              </Banner>
            </div>
          )}
          {props.stale.length > 0 && (
            <div className="mt-6">
              <Banner
                tone="warn"
                title="Cambiato a monte dopo la generazione dei documenti"
                actions={
                  <>
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={() => runner.run("update", "Aggiornamento mirato: si rigenerano solo i documenti impattati dalle aree cambiate…")}
                    >
                      Aggiorna con l&apos;AI
                    </button>
                    <button type="button" className={btnSecondary} onClick={() => setDialogo("rigenera")}>
                      Rigenera da zero
                    </button>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={async () => {
                        await fetch(`/api/clients/${slug}/steps/legale/ack-upstream`, { method: "POST" });
                        router.refresh();
                      }}
                    >
                      Va bene così
                    </button>
                  </>
                }
              >
                <span className="mono text-xs">{props.stale.join(" · ")}</span> — l&apos;aggiornamento rigenera SOLO i documenti delle
                aree cambiate; gli edit manuali dei documenti rigenerati si perdono.
              </Banner>
            </div>
          )}

          {erroriServer.length > 0 && dialogo === null && (
            <div className="mt-6">
              <Banner tone="err" title="Il salvataggio è stato rifiutato">
                <ul className="space-y-1">
                  {erroriServer.map((e, i) => {
                    const m = e.match(/«([^»]+)»/);
                    return (
                      <li key={i}>
                        {e}{" "}
                        {m && (
                          <button type="button" className="underline underline-offset-2" onClick={() => goto(anchorDaPath(m[1]))}>
                            vai al campo →
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Banner>
            </div>
          )}

          {props.verificato && !dirty && (
            <div className="mt-6">
              <Banner tone="ok" title="Documenti confermati">
                La build monterà questi documenti su /privacy, /termini e sotto il form.
              </Banner>
            </div>
          )}

          <ProfiloStrip foro={props.foro} forma={props.forma.forma} formaBase={props.forma.base} />
          <ReviewPanel review={props.review} corrente={props.reviewCorrente} onRiverifica={() => void riverifica()} running={runner.running} />

          <DocSection docKey="privacy" doc={data.privacy} onChange={(d) => setData({ ...data, privacy: d })} />
          <DocSection docKey="termini" doc={data.termini} onChange={(d) => setData({ ...data, termini: d })} />

          <section id={anchorId("formNotice", null)} className="card mt-6 p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{NOME_DOC.formNotice}</h2>
              <span className={`mono text-xs ${data.formNotice.length > 800 ? "text-err" : "text-faint"}`}>
                {data.formNotice.length}/800
              </span>
            </div>
            <p className="mt-1 text-xs text-faint">
              Un solo paragrafo sotto il modulo di contatto; deve rinviare a [Informativa completa](/privacy).
            </p>
            <textarea
              className="mt-3 w-full rounded-ctl border border-field bg-raise px-3 py-2 text-sm leading-relaxed"
              rows={5}
              value={data.formNotice}
              onChange={(e) => setData({ ...data, formNotice: e.target.value })}
              aria-label="Informativa breve del form"
            />
          </section>

          {props.report && (
            <details className="card mt-6 p-5">
              <summary className="cursor-pointer font-semibold [&::-webkit-details-marker]:hidden">
                Report interno (non va online)
              </summary>
              <pre className="mono mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted">
                {props.report}
              </pre>
            </details>
          )}

          <div className="fixed inset-x-0 bottom-(--statusbar-offset) z-10 border-t border-line bg-bg/95 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-3">
              <span className="text-xs text-faint">
                {motiviConfermaBloccata.length > 0 ? `Conferma bloccata: ${motiviConfermaBloccata.join(" · ")}` : "Pronto per la conferma"}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className={btnSecondary} onClick={() => void salva()} disabled={!dirty || salvando}>
                  {salvando ? "Salvo…" : "Salva"}
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => (motiviConfermaBloccata.length === 0 ? void conferma(false) : setDialogo("override"))}
                  disabled={runner.running || dirty}
                  title={motiviConfermaBloccata.join(" · ") || undefined}
                >
                  Conferma legale
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function puliziaBlocchi(blocks: Block[]): Block[] {
  return blocks.map((b) =>
    b.type === "ul" ? { type: "ul" as const, items: b.items.map((i) => i.trim()).filter(Boolean) } : { ...b, text: b.text.trim() },
  );
}
