"use client";

// Azione di un servizio Traffico nel dettaglio del cliente (DESIGN-BRIEF §Area
// Traffico): bottone secondario con puntini → ConfirmDialog → POST alla route →
// router.refresh(), si resta nel dettaglio e il nuovo stato è l'esito visibile.
// Nessuna primaria: attivare è una decisione commerciale rara, non il prossimo passo.
// Il motivo di un blocco lo scrive la pagina accanto al bottone (aria-describedby).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./confirm-dialog";
import { btnSecondary } from "./ui";
import { ETICHETTA_SERVIZIO, NOTA_DOMINIO, type ServizioKey } from "@/lib/traffico";

type Props = {
  slug: string;
  azienda: string;
  servizio: ServizioKey;
  verso: "attivo" | "sospeso";
  etichetta: "Attiva" | "Sospendi" | "Riattiva";
  disabilitato: boolean;
  /** id del paragrafo col motivo del blocco. */
  descrittoDa?: string;
  /** Servizio Sito di un cliente senza dominio: la conferma lo ricorda. */
  senzaDominio: boolean;
};

// Testi calibrati (docs/traffico/piano-T0.md §Calibrazione): cosa cambia davvero oggi,
// mai posizioni, clienti in più o tempi. Il paragrafo sul dominio (NOTA_DOMINIO) sta a
// parte: è la sola informazione che può cambiare la decisione.

function testi({ azienda, servizio, verso, etichetta, senzaDominio }: Props): { titolo: string; messaggio: React.ReactNode; bottone: string } {
  const nome = ETICHETTA_SERVIZIO[servizio];
  const conNota = (testo: string) => (
    <>
      <p>{testo}</p>
      {servizio === "sito" && senzaDominio && <p className="mt-2">{NOTA_DOMINIO}</p>}
    </>
  );
  if (verso === "sospeso") {
    return {
      titolo: `Sospendere il servizio ${nome}?`,
      messaggio:
        servizio === "sito"
          ? "Il ciclo di ottimizzazione si ferma. Ciò che il servizio ha già messo online resta online, anche nelle build successive. Puoi riattivarlo quando vuoi."
          : "Il lavoro sulla scheda si ferma e la scheda Google del cliente resta com'è. Puoi riattivarlo quando vuoi.",
      bottone: "Sospendi",
    };
  }
  if (etichetta === "Riattiva") {
    return {
      titolo: `Riattivare il servizio ${nome}?`,
      messaggio: conNota("Il servizio torna attivo da oggi. La data della prima attivazione resta quella originale."),
      bottone: "Riattiva",
    };
  }
  return {
    titolo: `Attivare il servizio ${nome}?`,
    messaggio:
      servizio === "sito"
        ? conNota(`${azienda} entra nel servizio Sito. Per ora l'editor registra solo lo stato e la data: online non cambia nulla.`)
        : `${azienda} entra nel servizio Scheda Google. Per ora l'editor registra solo lo stato e la data. L'editor non modifica mai la scheda Google del cliente: le modifiche le inserisci tu.`,
    bottone: `Attiva ${nome}`,
  };
}

export function TrafficoAzione(props: Props) {
  const { slug, servizio, verso, etichetta, disabilitato, descrittoDa } = props;
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [salvo, setSalvo] = useState(false);
  // riprovabile = rete o disco (5xx): ha senso confermare di nuovo. Un 4xx (stato
  // cambiato altrove, demo, file illeggibile) si risolve solo guardando lo stato vero.
  const [errore, setErrore] = useState<{ testo: string; riprovabile: boolean } | null>(null);

  // Alla chiusura il focus torna al bottone (tastiera): il dialog non lo restituisce da solo.
  const bottone = useRef<HTMLButtonElement>(null);

  // La conferma premuta si disabilita («Salvo…») e il focus cade sul body: con un errore
  // lo si porta sul messaggio, dentro il dialog (Tab → Chiudi, Riprova), mai sulla pagina sotto.
  const avviso = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (errore) avviso.current?.focus();
  }, [errore]);

  // Chiudere dopo un errore rilegge la pagina: lo stato mostrato torna quello vero.
  const chiudi = useCallback(() => {
    if (salvo) return;
    setAperto(false);
    bottone.current?.focus();
    if (errore) {
      setErrore(null);
      router.refresh();
    }
  }, [salvo, errore, router]);

  async function conferma() {
    setSalvo(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/clients/${slug}/traffico`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ servizio, stato: verso }),
      });
      const data: { error?: unknown } = await res.json().catch(() => ({}));
      if (!res.ok) {
        const testo = typeof data.error === "string" ? data.error : `Errore ${res.status}`;
        setErrore({ testo, riprovabile: res.status >= 500 });
        return;
      }
      setAperto(false);
      bottone.current?.focus();
      router.refresh();
    } catch (e) {
      setErrore({ testo: `Richiesta non riuscita: ${e instanceof Error ? e.message : String(e)}`, riprovabile: true });
    } finally {
      setSalvo(false);
    }
  }

  const t = testi(props);
  return (
    <>
      <button
        ref={bottone}
        type="button"
        className={btnSecondary}
        disabled={disabilitato}
        aria-describedby={descrittoDa}
        // Due sezioni, due bottoni «Attiva…»: il nome accessibile dice quale servizio (inizia col testo visibile, WCAG 2.5.3).
        aria-label={`${etichetta} ${ETICHETTA_SERVIZIO[servizio]}…`}
        onClick={() => setAperto(true)}
      >
        {etichetta}…
      </button>
      <ConfirmDialog
        open={aperto}
        title={t.titolo}
        message={t.messaggio}
        confirmLabel={salvo ? "Salvo…" : errore?.riprovabile ? "Riprova" : t.bottone}
        confirmDisabled={salvo || (!!errore && !errore.riprovabile)}
        // Durante il salvataggio chiudi() non fa nulla (la scrittura non si può fermare): l'etichetta lo dice.
        cancelLabel={salvo ? "Attendi…" : errore ? "Chiudi" : "Annulla"}
        onConfirm={conferma}
        onCancel={chiudi}
      >
        {errore && (
          <p ref={avviso} tabIndex={-1} role="alert" className="mt-3 text-sm text-err">
            {errore.riprovabile ? errore.testo : `${errore.testo}. Chiudi per vedere lo stato aggiornato.`}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
