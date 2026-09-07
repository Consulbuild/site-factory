/**
 * Scelte a tocco: singola (radio) e multipla (checkbox), nei tre layout
 * riquadri / righe / chip. Un'opzione con `testoLibero` apre una casella sotto
 * («Altro», «Certificazioni»). Il componente singolo può ADOTTARE il markup già
 * presente nell'HTML statico del primo passo (stesso schema di index.astro).
 */
import type { Opzione } from "../data/tassonomia";
import { opzioniDi } from "../data/domande";
import { pulisci } from "../lib/validators";
import { OK, avviso, blocco, campoTesto, h, idUnico, svgIcona, type ArgomentiComponente, type Componente } from "./base";

interface ValoreSingolo {
  id: string;
  altro?: string;
}
interface ValoreMultiplo {
  ids: string[];
  altro?: string;
  certificazioni?: string;
}

function rigaScelta(o: Opzione, tipo: "radio" | "checkbox", nome: string, layout: string, checked: boolean): HTMLLabelElement {
  const input = h("input", { class: "scelta__input", type: tipo, name: nome, value: o.id, checked });
  return h(
    "label",
    { class: "scelta", "data-id": o.id },
    input,
    o.icona ? svgIcona(o.icona, "icona scelta__icona") : null,
    h("span", { class: "scelta__testo" }, o.testo, o.nota && layout !== "chip" ? h("span", { class: "scelta__nota" }, o.nota) : null),
    h("span", { class: "scelta__spunta", "aria-hidden": "true" }, svgIcona("spunta")),
  );
}

/** Casella che si apre sotto la griglia quando l'opzione con testo libero è selezionata. */
function caselleLibere(griglia: HTMLElement, opzioni: readonly Opzione[], valori: Record<string, string>) {
  const caselle = new Map<string, ReturnType<typeof campoTesto>>();
  for (const o of opzioni) {
    if (!o.testoLibero) continue;
    const c = campoTesto({ etichetta: o.testoLibero, valore: valori[o.id] ?? "", maxlength: 120 });
    c.el.classList.add("scelta-testo");
    c.el.hidden = true;
    griglia.append(c.el);
    caselle.set(o.id, c);
  }
  const aggiorna = () => {
    for (const [id, c] of caselle) {
      const on = griglia.querySelector<HTMLInputElement>(`.scelta__input[value="${id}"]`)?.checked ?? false;
      const era = !c.el.hidden;
      c.el.hidden = !on;
      if (on && !era) c.input.focus({ preventScroll: false });
    }
  };
  griglia.addEventListener("change", aggiorna);
  aggiorna();
  return caselle;
}

// ---------- Singola ----------
export function creaSceltaSingola({ domanda, risposte, valore, radice, avanti }: ArgomentiComponente<ValoreSingolo>): Componente<ValoreSingolo> {
  const opzioni = opzioniDi(domanda, risposte);
  const nome = domanda.id;
  const layout = domanda.layout ?? "righe";
  let griglia: HTMLElement;
  if (radice) {
    griglia = radice;
    if (valore) {
      const inp = griglia.querySelector<HTMLInputElement>(`.scelta__input[value="${valore.id}"]`);
      if (inp) inp.checked = true;
    }
  } else {
    griglia = h(
      "div",
      { class: `scelte scelte--${layout}`, role: "radiogroup", "aria-labelledby": "domanda" },
      ...opzioni.map((o) => rigaScelta(o, "radio", nome, layout, valore?.id === o.id)),
    );
  }
  const caselle = caselleLibere(griglia, opzioni, valore?.altro ? { [opzioni.find((o) => o.testoLibero)?.id ?? ""]: valore.altro } : {});

  // Scelta singola senza casella: un tocco basta, si avanza da soli dopo un breve stato «selezionato»
  // (mai istantaneo: il titolare deve vedere cosa è successo).
  griglia.addEventListener("change", (e) => {
    const inp = e.target as HTMLInputElement;
    const o = opzioni.find((x) => x.id === inp.value);
    if (avanti && o && !o.testoLibero) setTimeout(avanti, 320);
  });

  const scelto = () => griglia.querySelector<HTMLInputElement>(".scelta__input:checked")?.value;
  return {
    el: griglia,
    focus: () => (griglia.querySelector<HTMLInputElement>(".scelta__input:checked") ?? griglia.querySelector<HTMLInputElement>(".scelta__input"))?.focus(),
    leggi: () => {
      const id = scelto();
      if (!id) return undefined;
      const altro = pulisci(caselle.get(id)?.input.value ?? "");
      return altro ? { id, altro } : { id };
    },
    valida: (forza) => {
      const id = scelto();
      if (!id) return blocco("Tocca una risposta per andare avanti.");
      const c = caselle.get(id);
      if (c && !pulisci(c.input.value) && !forza) return avviso("Scrivi che cos'è, anche in due parole.");
      return OK;
    },
  };
}

// ---------- Multipla ----------
export function creaSceltaMultipla({ domanda, risposte, valore }: ArgomentiComponente<ValoreMultiplo>): Componente<ValoreMultiplo> {
  const opzioni = opzioniDi(domanda, risposte);
  const nome = domanda.id;
  const layout = domanda.layout ?? "righe";
  const max = domanda.max;
  const gruppoId = idUnico("gruppo");
  const scelti = new Set(valore?.ids ?? []);
  const griglia = h(
    "div",
    { class: `scelte scelte--${layout}`, role: "group", "aria-labelledby": "domanda", id: gruppoId },
    ...opzioni.map((o) => rigaScelta(o, "checkbox", nome, layout, scelti.has(o.id))),
  );
  const caselle = caselleLibere(griglia, opzioni, {
    altro: valore?.altro ?? "",
    certificazioni: valore?.certificazioni ?? "",
  });
  let sulMassimo: (() => void) | null = null;
  if (max) {
    griglia.addEventListener("change", (e) => {
      const inp = e.target as HTMLInputElement;
      const n = griglia.querySelectorAll(".scelta__input:checked").length;
      if (inp.checked && n > max) {
        inp.checked = false;
        sulMassimo?.();
      }
    });
  }
  const ids = () => [...griglia.querySelectorAll<HTMLInputElement>(".scelta__input:checked")].map((i) => i.value);
  return {
    el: griglia,
    focus: () => griglia.querySelector<HTMLInputElement>(".scelta__input")?.focus(),
    leggi: () => {
      const v = ids();
      if (v.length === 0) return undefined;
      const out: ValoreMultiplo = { ids: v };
      const altro = pulisci(caselle.get("altro")?.input.value ?? "");
      const cert = pulisci(caselle.get("certificazioni")?.input.value ?? "");
      if (altro) out.altro = altro;
      if (cert) out.certificazioni = cert;
      return out;
    },
    valida: (forza) => {
      const v = ids();
      if (v.length === 0 && domanda.obbligatoria) return blocco("Tocca almeno una risposta per andare avanti.");
      for (const id of v) {
        const c = caselle.get(id);
        if (c && !pulisci(c.input.value) && !forza) return avviso("Scrivi che cos'è, anche in due parole.");
      }
      return OK;
    },
    // Esposto per chi vuole mostrare «Massimo N» (render.ts lo aggancia all'avviso del passo).
    distruggi: () => {
      sulMassimo = null;
    },
    ...({
      alMassimo(fn: () => void) {
        sulMassimo = fn;
      },
    } as object),
  } as Componente<ValoreMultiplo> & { alMassimo?: (fn: () => void) => void };
}
