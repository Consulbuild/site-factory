"use client";

// Card «Zone servite» del dettaglio Traffico (DESIGN-BRIEF §Area Traffico, piano-T3.md §4 con i
// tagli della decisione 14). Mostra la traduzione delle zone del form lead, quanto è larga l'area
// e, solo quando serve, la chiede all'operatore: confermare, correggere, impostare o scegliere
// dopo un cambio del lead. Tutto passa dal server (POST /api/clients/[slug]/traffico/zone):
// traduzione, provenienza e scrittura; qui solo stato dell'interfaccia. Nessuna scrittura
// all'apertura. Una proposta riconosciuta per intero non ha primaria: è già usabile.

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./confirm-dialog";
import { Badge, Banner, btnGhost, btnPrimary, btnSecondary, formatDate } from "./ui";
import { ggmm } from "./portafoglio-ui";
import { useSaveShortcut } from "./use-save-shortcut";
import { useUnsavedGuard } from "./use-unsaved-guard";
import type { RigaZona, StatoCard, VistaZone } from "@/lib/zone-servite";

type Tono = React.ComponentProps<typeof Badge>["tone"];
type Errore = { testo: string; rileggi: boolean };

const TITOLO_ID = "zone-servite";
const BLOCCO_ID = "zone-servite-blocco";

function badge(v: VistaZone): { tone: Tono; label: string } {
  const b: Record<StatoCard, { tone: Tono; label: string }> = {
    riconosciute: { tone: "ok", label: "Dal form lead" },
    da_controllare: { tone: "warn", label: "Da controllare" },
    da_impostare: { tone: "warn", label: "Da impostare" },
    senza_lead: { tone: "idle", label: "Senza form lead" },
    confermate: { tone: "ok", label: v.confermateAt ? `Confermate il ${ggmm(v.confermateAt)}` : "Confermate" },
    lead_cambiato: { tone: "warn", label: "Da rivedere" },
    non_leggibile: { tone: "err", label: "Non leggibile" },
    errore_dati: { tone: "err", label: "Non leggibile" },
  };
  return b[v.stato];
}

const corrette = (righe: RigaZona[]) => righe.some((r) => r.provenienza === "operatore");
const nonRiconosciute = (righe: RigaZona[]) => righe.filter((r) => r.esito === "non_riconosciuta");
const elenco = (xs: string[]) => xs.map((x) => `«${x}»`).join(", ");
/** Stessa chiave del server (normalizza in lib/zone-servite.ts): maiuscole, accenti e apostrofi non contano. */
const chiave = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toUpperCase().replace(/[’'`´\-.]/g, " ").replace(/\s+/g, " ").trim();

/** Frase di stato (role=status): cosa è successo e, se serve, cosa aspetta l'operatore. Mai promesse di risultati. */
function frase(v: VistaZone): string | null {
  const data = v.confermateAt ? formatDate(v.confermateAt) : "";
  switch (v.stato) {
    case "riconosciute":
      return "Tradotte dal form lead e già in uso. Correggile solo se il cliente lavora altrove.";
    case "da_controllare":
      return nonRiconosciute(v.righe).length
        ? "Alcune zone del form lead non sono riconosciute: correggile con «Modifica». Finché mancano, ricerche e scheda Google aspettano."
        : "Alcune zone del form lead vanno controllate: confermale o correggile. Finché non lo fai, ricerche e scheda Google aspettano.";
    case "da_impostare":
      return v.fonte === "tally"
        ? "Il cliente è arrivato dal vecchio modulo Tally, che non aveva zone da tradurre: impostale tu, una volta."
        : "Nessuna zona del form lead è stata riconosciuta: impostale tu. Finché mancano, ricerche e scheda Google aspettano.";
    case "senza_lead":
      return "Questo cliente non ha un form lead leggibile: imposta tu le zone.";
    case "confermate":
      if (v.righe.every((r) => r.provenienza === "operatore")) return `Impostate a mano il ${data}.`;
      return `Confermate il ${data}${corrette(v.righe) ? ", con correzioni a mano" : ""}.`;
    default: // lead_cambiato e file illeggibili: lo dice il banner
      return null;
  }
}

function Riga({ r, salvata = false, onTogli }: { r: RigaZona; salvata?: boolean; onTogli?: () => void }) {
  const dettaglio = [r.traduzione, r.provenienza === "lead" ? "dal form lead" : "aggiunta a mano"].filter(Boolean).join(" · ");
  return (
    <li className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium break-words text-ink">
          <span className="min-w-0 break-words">{r.testo}</span>
          {r.esito === "non_riconosciuta" && <Badge tone="err">Non riconosciuta</Badge>}
          {/* Una nota rende da controllare anche una traduzione certa (proposta non «riconosciuta»): la riga
              lo dice. Una zona salvata è già stata controllata: resta solo la nota. */}
          {!salvata && r.esito !== "non_riconosciuta" && (r.esito === "da_controllare" || r.nota) && <Badge tone="warn">Da controllare</Badge>}
        </p>
        <p className="text-sm text-muted">{dettaglio}</p>
        {r.nota && <p className="text-sm text-muted">Nota: {r.nota}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        {r.ampiezza && <span className="mono text-muted">{r.ampiezza}</span>}
        {onTogli && (
          <button type="button" className={btnGhost} onClick={onTogli} aria-label={`Togli «${r.testo}»`}>
            Togli
          </button>
        )}
      </div>
    </li>
  );
}

export function ZoneServite({ slug, vista: v }: { slug: string; vista: VistaZone }) {
  const router = useRouter();
  const titolo = useRef<HTMLHeadingElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  // salvate: chiavi delle righe già confermate da cui parte la modifica (restano senza badge di esito).
  const [modifica, setModifica] = useState<{ righe: RigaZona[]; iniziali: string; salvate: Set<string> } | null>(null);
  const [testo, setTesto] = useState("");
  const [erroreCampo, setErroreCampo] = useState<string | null>(null);
  const [aggiungo, setAggiungo] = useState(false);
  const [annuncio, setAnnuncio] = useState("");
  const [inviando, setInviando] = useState(false);
  // Dopo il salvataggio la modifica si chiude insieme alla pagina riletta (transizione):
  // mai un attimo con le zone vecchie.
  const [aggiornando, startTransition] = useTransition();
  const salvo = inviando || aggiornando;
  const [errore, setErrore] = useState<Errore | null>(null);
  const [confermaNuovoLead, setConfermaNuovoLead] = useState(false);

  const firma = (righe: RigaZona[]) => JSON.stringify(righe.map((r) => r.testo));
  const dirty = !!modifica && (firma(modifica.righe) !== modifica.iniziali || testo.trim() !== "");
  const { dialog: guardia } = useUnsavedGuard(dirty);

  const apri = (righe: RigaZona[]) => {
    setErrore(null);
    setErroreCampo(null);
    setTesto("");
    setAnnuncio("");
    setModifica({ righe, iniziali: firma(righe), salvate: new Set(v.stato === "confermate" ? righe.map((r) => chiave(r.testo)) : []) });
    requestAnimationFrame(() => campo.current?.focus());
  };

  const rileggi = () => {
    setErrore(null);
    setModifica(null);
    router.refresh();
  };

  const salva = useCallback(
    // tieni: «Va bene così», le zone salvate tengono le aree confermate (il server non le ritraduce).
    async (etichette: string[], tieni = false) => {
      setInviando(true);
      setErrore(null);
      try {
        const res = await fetch(`/api/clients/${slug}/traffico/zone`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ azione: "salva", etichette, impronta: v.impronta, ...(tieni ? { tieni } : {}) }),
        });
        const data: { error?: unknown } = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrore({ testo: typeof data.error === "string" ? data.error : `Errore ${res.status}`, rileggi: res.status === 409 });
          return;
        }
        startTransition(() => {
          setModifica(null);
          setTesto("");
          router.refresh();
        });
        titolo.current?.focus();
      } catch (e) {
        setErrore({ testo: `Richiesta non riuscita: ${e instanceof Error ? e.message : String(e)}`, rileggi: false });
      } finally {
        setInviando(false);
      }
    },
    [slug, v.impronta, router],
  );

  async function aggiungi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modifica || aggiungo) return;
    const t = testo.replace(/\s+/g, " ").trim();
    if (!t) return;
    // Doppione controllato prima dell'anteprima: mentre è in corso l'elenco può solo accorciarsi (Togli) o chiudersi (Annulla).
    if (modifica.righe.some((r) => chiave(r.testo) === chiave(t))) {
      setErroreCampo(`«${t}» è già nell'elenco.`);
      return;
    }
    const form = e.currentTarget;
    setErroreCampo(null);
    setAggiungo(true);
    try {
      const res = await fetch(`/api/clients/${slug}/traffico/zone`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ azione: "anteprima", etichetta: t }),
      });
      const data: { riga?: RigaZona; error?: unknown } = await res.json().catch(() => ({}));
      if (!res.ok || !data.riga) {
        setErroreCampo(typeof data.error === "string" ? data.error : `Errore ${res.status}`);
        return;
      }
      const riga = data.riga;
      if (riga.esito === "non_riconosciuta") {
        setErroreCampo(`«${riga.testo}» non riconosciuta: ${riga.nota ?? "riscrivila"}.`);
        return;
      }
      // Sull'elenco di adesso, non su quello di prima dell'anteprima: un Annulla o un Togli nel frattempo restano.
      setModifica((m) => m && { ...m, righe: [...m.righe, riga] });
      setTesto("");
      const controllo = riga.esito === "da_controllare" || riga.nota ? ", da controllare" : "";
      setAnnuncio(`Aggiunta «${riga.testo}»${riga.ampiezza ? `, ${riga.ampiezza}` : ""}${controllo}.`);
    } catch (err) {
      setErroreCampo(`Richiesta non riuscita: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAggiungo(false);
      // Si continua dal campo (dopo un errore lo descrive aria-describedby): mai il focus perso sul body.
      // Non se nel frattempo l'operatore è andato altrove (Annulla, Togli).
      const qui = document.activeElement;
      if (!qui || qui === document.body || form.contains(qui)) campo.current?.focus();
    }
  }

  function togli(i: number) {
    const tolta = modifica?.righe[i];
    setModifica((m) => m && { ...m, righe: m.righe.filter((_, j) => j !== i) });
    if (tolta) setAnnuncio(`Tolta «${tolta.testo}».`);
    // Focus sul «Togli» della riga che prende il posto di quella tolta, altrimenti sul campo.
    requestAnimationFrame(() => (lista.current?.querySelectorAll("button")[i] ?? campo.current)?.focus());
  }

  const ignote = modifica ? nonRiconosciute(modifica.righe) : [];
  // Oltre il massimo il server rifiuterebbe il corpo con un 400 tecnico: il blocco lo dice prima.
  const inPiu = modifica ? modifica.righe.length - v.maxZone : 0;
  const motivoBlocco = !modifica
    ? null
    : ignote.length
      ? `Togli o riscrivi le zone non riconosciute: ${elenco(ignote.map((r) => r.testo))}.`
      : inPiu > 0
        ? `Al massimo ${v.maxZone} zone: togline ${inPiu === 1 ? "una" : inPiu}.`
        : !modifica.righe.some((r) => r.ampiezza)
          ? "Aggiungi almeno una zona."
          : testo.trim()
            ? erroreCampo
              ? "Correggi la zona scritta nel campo, o svuotalo."
              : "Premi «Aggiungi» per la zona scritta nel campo, o svuotalo."
            : null;
  const salvaModifica = useCallback(() => {
    if (modifica && !motivoBlocco && !salvo) void salva(modifica.righe.map((r) => r.testo));
  }, [modifica, motivoBlocco, salvo, salva]);
  useSaveShortcut(salvaModifica, !!modifica);

  const b = badge(v);
  const f = frase(v);
  // Un clic salva e conferma senza mostrare le righe del nuovo lead: solo se non c'è niente da controllare.
  const nuovoLeadPulito = v.esitoNuovoLead === "riconosciute";
  const primaria = !modifica && (v.stato === "da_controllare" || v.stato === "da_impostare" || v.stato === "senza_lead");
  const puoConfermare = v.stato === "da_controllare" && nonRiconosciute(v.righe).length === 0;

  const erroreAzione = errore && (
    <p role="alert" className="mt-3 text-sm text-err">
      {errore.testo}{" "}
      {errore.rileggi && (
        <button type="button" className={`${btnGhost} align-baseline`} onClick={rileggi}>
          Rileggi
        </button>
      )}
    </p>
  );

  return (
    <section aria-labelledby={TITOLO_ID} className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id={TITOLO_ID} ref={titolo} tabIndex={-1} className="font-semibold">
            Zone servite
          </h2>
          <Badge tone={b.tone}>{b.label}</Badge>
        </div>
        {!modifica && (
          <div className="flex flex-wrap items-center gap-2">
            {puoConfermare && (
              <button type="button" className={btnSecondary} disabled={salvo} onClick={() => void salva(v.righe.map((r) => r.testo))}>
                {salvo ? "Salvo…" : "Conferma le zone"}
              </button>
            )}
            {(v.stato === "riconosciute" || v.stato === "confermate" || v.stato === "da_controllare") && (
              <button type="button" className={primaria ? btnPrimary : btnSecondary} disabled={salvo} onClick={() => apri(v.righe)}>
                Modifica
              </button>
            )}
            {(v.stato === "da_impostare" || v.stato === "senza_lead") && (
              <button type="button" className={btnPrimary} onClick={() => apri(v.righe)}>
                Imposta le zone
              </button>
            )}
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Dove il cliente accetta lavori: le usano ricerche, scheda Google e pagine.</p>
      {f && (
        <p role="status" className="mt-2 text-sm text-ink">
          {f}
        </p>
      )}

      {v.stato === "non_leggibile" && (
        <div className="mt-3">
          <Banner tone="err" title="Zone servite non leggibili">
            Il file non rispetta lo schema e non viene toccato: correggilo a mano in <span className="mono">site-renderer/out/{slug}/traffico/zone-servite.json</span>, poi ricarica.
            Fino ad allora ricerche e scheda Google aspettano. Dettaglio: <span className="mono">{v.motivo}</span>
          </Banner>
        </div>
      )}
      {v.stato === "errore_dati" && (
        <div className="mt-3">
          <Banner tone="err" title="Dati dei comuni non leggibili">
            Le zone non si possono tradurre finché l&apos;elenco dei comuni o delle province non si legge. Dettaglio: <span className="mono">{v.motivo}</span>
          </Banner>
        </div>
      )}
      {v.stato === "lead_cambiato" && !modifica && (
        <div className="mt-3">
          <Banner
            tone="warn"
            title={`Il form lead è cambiato dopo il salvataggio del ${v.confermateAt ? formatDate(v.confermateAt) : "—"}`}
            actions={
              <>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={salvo}
                  onClick={() => (!nuovoLeadPulito ? apri(v.righeNuovoLead) : corrette(v.righe) ? setConfermaNuovoLead(true) : void salva(v.righeNuovoLead.map((r) => r.testo)))}
                >
                  {nuovoLeadPulito ? "Usa le zone del nuovo lead" : "Rivedi le zone del nuovo lead"}
                </button>
                <button type="button" className={btnGhost} disabled={salvo} onClick={() => void salva(v.righe.map((r) => r.testo), true)}>
                  Va bene così
                </button>
              </>
            }
          >
            <span role="status">
              {v.etichetteLead.length ? `Ora dice: ${elenco(v.etichetteLead)}.` : "Ora non ha zone."}
              {v.avvisi.length > 0 && ` Nel nuovo lead: ${v.avvisi.join("; ")}.`} Qui sotto restano le zone salvate: finché non scegli, ricerche e scheda Google
              aspettano.
            </span>
          </Banner>
        </div>
      )}
      {v.stato === "da_controllare" && v.avvisi.length > 0 && !modifica && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
          {v.avvisi.map((a) => (
            <li key={a}>Nel form lead: {a}</li>
          ))}
        </ul>
      )}
      {v.stato === "confermate" && corrette(v.righe) && v.etichetteLead.length > 0 && !modifica && (
        <p className="mt-2 text-sm text-muted">Nel form lead: {elenco(v.etichetteLead)}</p>
      )}
      {!modifica && erroreAzione}

      {!modifica && v.righe.length > 0 && (
        <>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {v.righe.map((r, i) => (
              <Riga key={`${i}-${r.testo}`} r={r} salvata={v.stato === "confermate" || v.stato === "lead_cambiato"} />
            ))}
          </ul>
          {v.totale && (
            <p className="mt-2 border-t border-line pt-3 text-sm text-muted">
              Area servita: <span className="mono">{v.totale}</span>
            </p>
          )}
        </>
      )}

      {modifica && (
        <div className="mt-4 border-t border-line pt-4">
          {modifica.righe.length > 0 ? (
            <ul ref={lista} className="divide-y divide-line">
              {modifica.righe.map((r, i) => (
                <Riga key={`${i}-${r.testo}`} r={r} salvata={modifica.salvate.has(chiave(r.testo))} onTogli={() => togli(i)} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nessuna zona nell&apos;elenco.</p>
          )}

          <form onSubmit={aggiungi} className="mt-4">
            <label htmlFor="zona-nuova" className="text-sm font-medium text-ink">
              Aggiungi una zona
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <input
                ref={campo}
                id="zona-nuova"
                className="min-w-0 flex-1 basis-56"
                value={testo}
                maxLength={120}
                autoComplete="off"
                aria-invalid={!!erroreCampo}
                aria-describedby={`${erroreCampo ? "zona-errore " : ""}zona-aiuto`}
                onChange={(e) => {
                  setTesto(e.target.value);
                  setErroreCampo(null);
                }}
              />
              {/* Mai disabilitato durante l'anteprima (il focus finirebbe sul body): la doppia richiesta la ferma aggiungi(). */}
              <button type="submit" className={btnSecondary} disabled={!testo.trim()}>
                {aggiungo ? "Controllo…" : "Aggiungi"}
              </button>
            </div>
            <p role="status" className="sr-only">
              {annuncio}
            </p>
            {erroreCampo && (
              <p id="zona-errore" role="alert" className="mt-1.5 text-sm text-err">
                {erroreCampo}
              </p>
            )}
            <p id="zona-aiuto" className="mt-1.5 text-xs text-faint">
              Scrivila come nel form: «Monza (MB)» · «Monza e dintorni» · «Provincia di Monza e della Brianza» · «Tutta la regione Lombardia» · «Lombardia e regioni vicine» · «Tutta Italia»
            </p>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <button type="button" className={btnPrimary} disabled={!!motivoBlocco || salvo} aria-describedby={motivoBlocco ? BLOCCO_ID : undefined} onClick={salvaModifica}>
              {salvo ? "Salvo…" : "Salva e conferma"}
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={salvo}
              onClick={() => {
                setModifica(null);
                setErrore(null);
                titolo.current?.focus();
              }}
            >
              Annulla
            </button>
            {motivoBlocco && (
              <p id={BLOCCO_ID} className="text-sm text-muted">
                {motivoBlocco}
              </p>
            )}
          </div>
          {erroreAzione}
        </div>
      )}

      <ConfirmDialog
        open={confermaNuovoLead}
        title="Usare le zone del nuovo lead?"
        message={`Le zone salvate hanno correzioni a mano (${elenco(v.righe.filter((r) => r.provenienza === "operatore").map((r) => r.testo))}): con le zone del nuovo lead si perdono. Potrai sempre modificarle dopo.`}
        confirmLabel={salvo ? "Salvo…" : "Usa le zone del nuovo lead"}
        confirmDisabled={salvo}
        cancelLabel="Annulla"
        onConfirm={() => {
          // L'esito (o l'errore) si legge nella card: il dialog si chiude subito.
          setConfermaNuovoLead(false);
          void salva(v.righeNuovoLead.map((r) => r.testo));
        }}
        onCancel={() => setConfermaNuovoLead(false)}
      />
      {guardia}
    </section>
  );
}
