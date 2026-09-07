/**
 * Monta un passo nel DOM: eyebrow di sezione, h1 = domanda, riga di aiuto, il
 * componente del tipo giusto, lo spazio per l'avviso, i bottoni. Il registro
 * REGISTRO collega ogni TipoDomanda alla sua fabbrica: per un tipo nuovo si
 * aggiunge una riga qui e un file in src/components/.
 */
import type { Domanda, Risposte, TipoDomanda } from "../data/domande";
import { sezioneDi } from "../data/domande";
import { creaPlaceholder } from "../components/placeholder";
import { creaSceltaMultipla, creaSceltaSingola } from "../components/scelte";
import { creaEmail, creaTelefono, creaTesto } from "../components/testo";
import { h, svgIcona, type Azione, type Componente, type Esito, type Fabbrica } from "../components/base";
import { scuoti } from "./motion";

// Il valore di ogni componente ha una forma diversa (vedi Risposte in domande.ts):
// il registro è volutamente non tipizzato sul valore; la forma la garantisce ogni componente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabbricaQualsiasi = Fabbrica<any>;
const REGISTRO: Record<TipoDomanda, FabbricaQualsiasi> = {
  scelta: creaSceltaSingola,
  "scelta-multipla": creaSceltaMultipla,
  testo: creaTesto,
  telefono: creaTelefono,
  email: creaEmail,
  piva: creaPlaceholder,
  sito: creaPlaceholder,
  "nome-sito": creaPlaceholder,
  sede: creaPlaceholder,
  zone: creaPlaceholder,
  foto: creaPlaceholder,
  logo: creaPlaceholder,
  stile: creaPlaceholder,
  colori: creaPlaceholder,
  social: creaPlaceholder,
  consenso: creaPlaceholder,
};

export interface PassoMontato {
  el: HTMLElement;
  comp: Componente;
  btnAvanti: HTMLButtonElement;
  btnIndietro: HTMLButtonElement;
  /** Mostra un avviso/errore sotto il campo (o lo toglie con null). */
  mostraEsito(esito: Esito | null, extra?: Azione[]): void;
}

export interface ArgomentiMonta {
  domanda: Domanda;
  risposte: Risposte;
  valore: unknown;
  primoDellaSezione: boolean;
  puoIndietro: boolean;
  /** Passo già nell'HTML statico da adottare (primo caricamento). */
  adotta?: HTMLElement;
  avanti?: () => void;
}

export function montaDomanda(a: ArgomentiMonta): PassoMontato {
  const sezione = sezioneDi(a.domanda.sezione);
  const fabbrica = REGISTRO[a.domanda.tipo];

  if (a.adotta) {
    // Primo passo: il markup c'è già (index.astro); si aggancia il componente al suo campo.
    const radice = a.adotta.querySelector<HTMLElement>(".passo__campo > *") ?? undefined;
    const comp = fabbrica({ domanda: a.domanda, risposte: a.risposte, valore: a.valore as never, radice, avanti: a.avanti });
    const btnAvanti = a.adotta.querySelector<HTMLButtonElement>(".btn--primario")!;
    const btnIndietro = a.adotta.querySelector<HTMLButtonElement>(".btn--ghost")!;
    const slot = h("div", { class: "passo__esito", "aria-live": "assertive" });
    a.adotta.querySelector(".passo__campo")?.after(slot);
    return { el: a.adotta, comp, btnAvanti, btnIndietro, mostraEsito: creaMostraEsito(slot, a.adotta) };
  }

  const comp = fabbrica({ domanda: a.domanda, risposte: a.risposte, valore: a.valore as never, avanti: a.avanti });
  const slot = h("div", { class: "passo__esito", "aria-live": "assertive" });
  const btnIndietro = h("button", { class: "btn btn--ghost", type: "button", hidden: !a.puoIndietro }, svgIcona("sinistra"), "Indietro");
  const btnAvanti = h("button", { class: "btn btn--primario", type: "button" }, "Continua", svgIcona("destra"));
  const el = h(
    "section",
    { class: "passo", "data-passo": a.domanda.id, "aria-labelledby": "domanda" },
    a.primoDellaSezione && "incoraggiamento" in sezione && sezione.incoraggiamento
      ? h("p", { class: "passo__brindisi" }, svgIcona("spunta"), sezione.incoraggiamento)
      : null,
    h("p", { class: "passo__sezione" }, sezione.nome),
    h("h1", { class: "passo__titolo", id: "domanda", tabindex: "-1" }, a.domanda.testo),
    a.domanda.aiuto ? h("p", { class: "passo__aiuto" }, a.domanda.aiuto) : null,
    h("div", { class: "passo__campo" }, comp.el),
    slot,
    h("footer", { class: "passo__azioni" }, btnIndietro, btnAvanti),
  );
  return { el, comp, btnAvanti, btnIndietro, mostraEsito: creaMostraEsito(slot, el) };
}

function creaMostraEsito(slot: HTMLElement, passo: HTMLElement) {
  return (esito: Esito | null, extra: Azione[] = []) => {
    slot.replaceChildren();
    if (!esito || esito.ok) return;
    const azioni = [...(esito.azioni ?? []), ...extra];
    const box = h(
      "div",
      { class: `avviso is-nuovo ${esito.livello === "blocco" ? "avviso--errore" : "avviso--attenzione"}`, role: "alert" },
      svgIcona("attenzione"),
      h(
        "div",
        {},
        h("p", {}, esito.messaggio),
        azioni.length
          ? h(
              "div",
              { class: "avviso__azioni" },
              ...azioni.map((az) =>
                h("button", { class: "btn btn--sm", type: "button", onclick: az.esegui }, az.testo),
              ),
            )
          : null,
      ),
    );
    slot.append(box);
    scuoti(passo.querySelector<HTMLElement>(".passo__campo") ?? passo);
  };
}
