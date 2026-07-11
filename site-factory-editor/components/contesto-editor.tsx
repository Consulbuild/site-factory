"use client";

// Editor del contesto: identità, tabella servizi atomizzati con assegnazione a
// macro-categorie (modello interno a ID, robusto ai rename), punti di forza con
// chip fonte, promesse (tag list), promessa martello, tono/materiali/note.
// [Salva bozza] = PUT · [Conferma] = POST con gate copertura deterministico.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Contesto } from "@/lib/schemas";
import { btnPrimary, btnSecondary, btnGhost } from "./ui";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { BackBar } from "./back-bar";
import { useStepRun, RunLog } from "./use-step-run";

type Servizio = { servizio: string; fonte: string; macroId: string | null };
type Macro = { id: string; nome: string };

function build(initial: Contesto): { servizi: Servizio[]; macros: Macro[] } {
  const macros = initial.macro_categorie.map((m, i) => ({ id: `m${i}`, nome: m.nome }));
  const macroByServizio = new Map<string, string>();
  initial.macro_categorie.forEach((m, i) => m.servizi.forEach((s) => macroByServizio.set(s, `m${i}`)));
  const servizi = initial.servizi_atomizzati.map((s) => ({
    servizio: s.servizio,
    fonte: s.fonte,
    macroId: macroByServizio.get(s.servizio) ?? null,
  }));
  return { servizi, macros };
}

export function ContestoEditor({
  slug,
  businessName,
  initial,
  drift = [],
}: {
  slug: string;
  businessName: string;
  initial: Contesto;
  drift?: string[];
}) {
  const router = useRouter();
  const built = useMemo(() => build(initial), [initial]);
  const runner = useStepRun(slug, "contesto");

  async function sistematoAMano() {
    await fetch(`/api/clients/${slug}/contesto/dismiss-drift`, { method: "POST" });
    router.refresh();
  }
  const [servizi, setServizi] = useState<Servizio[]>(built.servizi);
  const [macros, setMacros] = useState<Macro[]>(built.macros);
  const [identita, setIdentita] = useState(initial.identita);
  const [settore, setSettore] = useState(initial.settore_normalizzato);
  const [sottosettore, setSottosettore] = useState(initial.sottosettore);
  const [target, setTarget] = useState(initial.target);
  const [zona, setZona] = useState(initial.zona);
  const [puntiForza, setPuntiForza] = useState(initial.punti_di_forza);
  const [consentite, setConsentite] = useState(initial.promesse_consentite);
  const [vietate, setVietate] = useState(initial.promesse_vietate);
  const [martello, setMartello] = useState(initial.promessa_martello);
  const [tono, setTono] = useState(initial.tono);
  const [materiali, setMateriali] = useState(initial.materiali);
  const [note, setNote] = useState(initial.note_operatore);

  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const touch = () => setDirty(true);
  const { navigate, dialog } = useUnsavedGuard(dirty);

  const scoperti = servizi.filter((s) => s.macroId === null);
  const verificato = initial.verificato && !dirty;

  function toContesto(): Contesto {
    return {
      ...initial,
      identita,
      settore_normalizzato: settore,
      sottosettore,
      servizi_atomizzati: servizi.map((s) => ({ servizio: s.servizio, fonte: s.fonte })),
      macro_categorie: macros.map((m) => ({
        nome: m.nome,
        servizi: servizi.filter((s) => s.macroId === m.id).map((s) => s.servizio),
      })),
      target,
      zona,
      punti_di_forza: puntiForza,
      promesse_consentite: consentite,
      promesse_vietate: vietate,
      promessa_martello: martello,
      tono,
      materiali,
      note_operatore: note,
    };
  }

  async function salvaBozza() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/clients/${slug}/contesto`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contesto: toContesto() }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ tone: "ok", text: "Bozza salvata ✓" });
      setDirty(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ tone: "err", text: d.error ?? `errore ${res.status}` });
    }
  }

  async function conferma() {
    // Salva prima, poi conferma (il server valuta la copertura sul file).
    setBusy(true);
    setMsg(null);
    const put = await fetch(`/api/clients/${slug}/contesto`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contesto: toContesto() }),
    });
    if (!put.ok) {
      setBusy(false);
      setMsg({ tone: "err", text: "salvataggio fallito prima della conferma" });
      return;
    }
    const res = await fetch(`/api/clients/${slug}/contesto`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setDirty(false);
      router.push(`/clienti/${slug}`);
      router.refresh();
      return;
    }
    const d = await res.json().catch(() => ({}));
    if (res.status === 422) {
      setMsg({ tone: "err", text: `Copertura incompleta: ${(d.problemi ?? []).join("; ")}` });
      document.getElementById("servizi")?.scrollIntoView({ behavior: "smooth" });
    } else {
      setMsg({ tone: "err", text: d.error ?? `errore ${res.status}` });
    }
  }

  // --- azioni sui servizi/macro -----------------------------------------
  const assegna = (i: number, macroId: string | null) => {
    setServizi((prev) => prev.map((s, j) => (j === i ? { ...s, macroId } : s)));
    touch();
  };
  const rinominaServizio = (i: number, v: string) => {
    setServizi((prev) => prev.map((s, j) => (j === i ? { ...s, servizio: v } : s)));
    touch();
  };
  const eliminaServizio = (i: number) => {
    setServizi((prev) => prev.filter((_, j) => j !== i));
    touch();
  };
  const aggiungiServizio = () => {
    setServizi((prev) => [...prev, { servizio: "", fonte: "aggiunto manualmente", macroId: null }]);
    touch();
  };
  const rinominaMacro = (id: string, v: string) => {
    setMacros((prev) => prev.map((m) => (m.id === id ? { ...m, nome: v } : m)));
    touch();
  };
  const aggiungiMacro = () => {
    if (macros.length >= 5) return;
    setMacros((prev) => [...prev, { id: `m${Date.now()}`, nome: "Nuova categoria" }]);
    touch();
  };
  const eliminaMacro = (id: string) => {
    setServizi((prev) => prev.map((s) => (s.macroId === id ? { ...s, macroId: null } : s)));
    setMacros((prev) => prev.filter((m) => m.id !== id));
    touch();
  };

  return (
    <div className="pb-24">
      {dialog}
      <BackBar slug={slug} businessName={businessName} step="Contesto" onNavigate={navigate} />
      <h1 className="mt-4 text-xl font-semibold">Contesto per gli agenti</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Rivedi i fatti distillati dal form prima di passarli agli agenti: qui la qualità decide la qualità del sito.
      </p>

      {runner.running || runner.log.length > 0 ? (
        <div className="mt-4">
          {runner.running && <p className="text-sm text-brand">Riallineamento in corso (claude -p)…</p>}
          <RunLog log={runner.log} logRef={runner.logRef} />
        </div>
      ) : (
        drift.length > 0 && (
          <div className="mt-4 rounded-ctl border border-warn/40 bg-warn-bg px-4 py-3 text-sm">
            <p className="font-medium text-warn">⚠ L&apos;intake è cambiato dopo la generazione del contesto</p>
            <p className="mt-1 text-warn/90">
              Campi cambiati: <strong>{drift.join(", ")}</strong>. Le parti derivate (identità, servizi, punti di forza,
              promesse) potrebbero non riflettere le correzioni. I campi semplici (città, tono, colori…) sono già stati
              allineati automaticamente.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={btnPrimary}
                onClick={() => runner.run("update", "Riallineamento intelligente: aggiorno solo le parti impattate…")}
              >
                Riallinea con l&apos;AI
              </button>
              <button
                className={btnSecondary}
                onClick={() => runner.run("generate", "Rigenerazione da zero del contesto…")}
                title="Rigenera tutto il contesto dai dati correnti (perdi le modifiche fatte a mano)"
              >
                Rigenera da zero
              </button>
              <button className={btnGhost} onClick={sistematoAMano}>
                Ho sistemato a mano
              </button>
            </div>
          </div>
        )
      )}

      {verificato && (
        <p className="mt-4 mb-2 rounded-ctl bg-ok-bg px-4 py-2 text-sm text-ok">✓ Contesto confermato. Puoi ancora modificarlo.</p>
      )}

      {/* IDENTITÀ */}
      <Section titolo="Identità">
        <Field label="Cosa fa davvero l'azienda">
          <textarea
            rows={3}
            value={identita.frase}
            onChange={(e) => {
              setIdentita({ ...identita, frase: e.target.value });
              touch();
            }}
          />
          <Fonti fonti={identita.fonte} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Settore">
            <input value={settore} onChange={(e) => { setSettore(e.target.value); touch(); }} />
          </Field>
          <Field label="Sottosettore">
            <input value={sottosettore} onChange={(e) => { setSottosettore(e.target.value); touch(); }} />
          </Field>
        </div>
      </Section>

      {/* SERVIZI + MACRO */}
      <Section titolo={`Servizi atomizzati (${servizi.length})`} id="servizi">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Macro-categorie ({macros.length}/5):</span>
          {macros.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1 rounded-ctl border border-line bg-surface px-1.5 py-0.5">
              <input
                value={m.nome}
                onChange={(e) => rinominaMacro(m.id, e.target.value)}
                className="w-auto min-w-32 border-0 bg-transparent px-1 py-0 text-sm"
                style={{ width: `${Math.max(8, m.nome.length)}ch` }}
              />
              <button type="button" className="text-faint hover:text-err" onClick={() => eliminaMacro(m.id)} title="Elimina categoria (i servizi tornano non assegnati)">
                ✕
              </button>
            </span>
          ))}
          {macros.length < 5 && (
            <button type="button" className={btnGhost} onClick={aggiungiMacro}>
              + categoria
            </button>
          )}
        </div>

        {scoperti.length > 0 && (
          <p className="mb-2 rounded-ctl bg-warn-bg px-3 py-1.5 text-sm text-warn">
            ⚠ {scoperti.length} {scoperti.length === 1 ? "servizio senza" : "servizi senza"} macro-categoria — assegnali per poter confermare.
          </p>
        )}

        <div className="overflow-hidden card">
          {servizi.map((s, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_14rem_auto] items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 ${
                s.macroId === null ? "bg-warn-bg/30" : ""
              }`}
            >
              <div>
                <input
                  value={s.servizio}
                  onChange={(e) => rinominaServizio(i, e.target.value)}
                  className="border-0 bg-transparent px-0 py-0"
                  placeholder="nome servizio"
                />
                <span className="mono block truncate text-faint" title={s.fonte}>
                  {s.fonte}
                </span>
              </div>
              <select value={s.macroId ?? ""} onChange={(e) => assegna(i, e.target.value || null)}>
                <option value="">— non assegnato —</option>
                {macros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
              <button type="button" className="text-faint hover:text-err" onClick={() => eliminaServizio(i)} title="Elimina servizio">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnGhost} mt-2`} onClick={aggiungiServizio}>
          + Aggiungi servizio
        </button>
      </Section>

      {/* TARGET + ZONA */}
      <Section titolo="Target e zona">
        <div className="grid grid-cols-[11rem_1fr] items-center gap-x-4 gap-y-2">
          <label className="text-sm text-muted">Tipo cliente</label>
          <select className="max-w-48" value={target.tipo} onChange={(e) => { setTarget({ ...target, tipo: e.target.value as typeof target.tipo }); touch(); }}>
            <option value="privati">Privati</option>
            <option value="aziende">Aziende</option>
            <option value="entrambi">Entrambi</option>
          </select>
          <label className="text-sm text-muted">Descrizione target</label>
          <input value={target.descrizione} onChange={(e) => { setTarget({ ...target, descrizione: e.target.value }); touch(); }} />
          <label className="text-sm text-muted">Tipo lavori</label>
          <input value={target.tipo_lavori} onChange={(e) => { setTarget({ ...target, tipo_lavori: e.target.value }); touch(); }} />
          <label className="text-sm text-muted">Sede</label>
          <input className="max-w-64" value={zona.sede} onChange={(e) => { setZona({ ...zona, sede: e.target.value }); touch(); }} />
          <label className="text-sm text-muted">Area d&apos;intervento</label>
          <input value={zona.area_intervento} onChange={(e) => { setZona({ ...zona, area_intervento: e.target.value }); touch(); }} />
        </div>
      </Section>

      {/* PUNTI DI FORZA */}
      <Section titolo="Punti di forza">
        <div className="space-y-2">
          {puntiForza.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <input
                  value={p.claim}
                  onChange={(e) => { setPuntiForza((prev) => prev.map((x, j) => (j === i ? { ...x, claim: e.target.value } : x))); touch(); }}
                />
                <span className="mono mt-0.5 block truncate text-faint" title={p.fonte}>
                  {p.fonte}
                </span>
              </div>
              <button type="button" className="pt-2 text-faint hover:text-err" onClick={() => { setPuntiForza((prev) => prev.filter((_, j) => j !== i)); touch(); }}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnGhost} mt-2`} onClick={() => { setPuntiForza((prev) => [...prev, { claim: "", fonte: "aggiunto manualmente" }]); touch(); }}>
          + Aggiungi punto di forza
        </button>
      </Section>

      {/* PROMESSE */}
      <Section titolo="Promesse">
        <Field label="Consentite (deducibili dal form)">
          <TagList tags={consentite} tone="ok" onChange={(t) => { setConsentite(t); touch(); }} />
        </Field>
        <Field label="Vietate (non provate dal form)">
          <TagList tags={vietate} tone="err" onChange={(t) => { setVietate(t); touch(); }} />
        </Field>
        <Field label="Promessa martello (ripetuta sul sito)">
          <select value={martello} onChange={(e) => { setMartello(e.target.value); touch(); }}>
            <option value="">— nessuna —</option>
            {[martello, ...consentite].filter((v, i, a) => v && a.indexOf(v) === i).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* TONO / MATERIALI / NOTE */}
      <Section titolo="Tono, materiali e note">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registro">
            <input value={tono.registro} onChange={(e) => { setTono({ ...tono, registro: e.target.value }); touch(); }} />
          </Field>
          <Field label="Da evitare (tono)">
            <input value={tono.da_evitare} onChange={(e) => { setTono({ ...tono, da_evitare: e.target.value }); touch(); }} />
          </Field>
          <Field label="Foto reali">
            <input value={materiali.foto_reali} onChange={(e) => { setMateriali({ ...materiali, foto_reali: e.target.value }); touch(); }} />
          </Field>
          <Field label="Colori">
            <input value={materiali.colori} onChange={(e) => { setMateriali({ ...materiali, colori: e.target.value }); touch(); }} />
          </Field>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="size-4 w-auto" checked={materiali.logo} onChange={(e) => { setMateriali({ ...materiali, logo: e.target.checked }); touch(); }} />
          Il cliente ha già un logo
        </label>
        <Field label="Note per gli agenti">
          <textarea rows={3} value={note} onChange={(e) => { setNote(e.target.value); touch(); }} placeholder="Indicazioni tue per gli agenti a valle…" />
        </Field>
      </Section>

      {/* ACTION BAR */}
      <div className="fixed inset-x-0 bottom-(--statusbar-offset) border-t border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-4 px-6 py-3">
          {msg && <span className={`text-sm ${msg.tone === "ok" ? "text-ok" : "text-err"}`}>{msg.text}</span>}
          {scoperti.length > 0 && <span className="text-sm text-warn">{scoperti.length} servizi da assegnare</span>}
          <button type="button" className={btnSecondary} onClick={salvaBozza} disabled={busy}>
            {busy ? "…" : "Salva bozza"}
          </button>
          <button type="button" className={btnPrimary} onClick={conferma} disabled={busy || scoperti.length > 0}>
            Conferma contesto
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ titolo, id, children }: { titolo: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-line py-6 first:border-t-0">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-faint uppercase">{titolo}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm text-muted">{label}</label>
      {children}
    </div>
  );
}

function Fonti({ fonti }: { fonti: string[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {fonti.map((f) => (
        <span key={f} className="mono rounded bg-surface px-1.5 py-0.5 text-faint">
          {f}
        </span>
      ))}
    </div>
  );
}

function TagList({ tags, tone, onChange }: { tags: string[]; tone: "ok" | "err"; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const cls = tone === "ok" ? "bg-ok-bg text-ok" : "bg-err-bg text-err";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t, i) => (
        <span key={i} className={`inline-flex items-center gap-1 rounded-ctl px-2 py-0.5 text-sm ${cls}`}>
          {t}
          <button type="button" className="opacity-60 hover:opacity-100" onClick={() => onChange(tags.filter((_, j) => j !== i))}>
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            onChange([...tags, draft.trim()]);
            setDraft("");
          }
        }}
        placeholder="+ aggiungi…"
        className="w-32 border-0 bg-transparent px-1 py-0.5 text-sm"
      />
    </div>
  );
}
