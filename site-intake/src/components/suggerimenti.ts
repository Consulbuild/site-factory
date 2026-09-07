/**
 * Elenco di suggerimenti sotto un campo di testo (comuni, zone): si apre mentre si
 * scrive, si sceglie con un tocco o con le frecce e Invio, si chiude con Esc o
 * uscendo dal campo. Un aiuto, mai un obbligo: il testo scritto resta valido.
 */
import { h } from "./base";

export interface OpzioniSuggerimenti {
  input: HTMLInputElement;
  cerca: (query: string) => Promise<string[]>;
  scegli: (testo: string) => void;
  /** Chiamato a ogni digitazione (per azzerare la scelta precedente). */
  cambiato?: () => void;
}

export function attaccaSuggerimenti(o: OpzioniSuggerimenti): { chiudi: () => void; el: HTMLElement } {
  const listaId = `${o.input.id || "campo"}-suggerimenti`;
  const lista = h("ul", { class: "suggerimenti", role: "listbox", id: listaId, "aria-label": "Suggerimenti", hidden: true });
  o.input.after(lista);
  o.input.setAttribute("role", "combobox");
  o.input.setAttribute("aria-controls", listaId);
  o.input.setAttribute("aria-autocomplete", "list");
  o.input.setAttribute("aria-expanded", "false");
  o.input.dataset["enter"] = "ignora"; // Invio qui sceglie, non manda avanti il form
  let voci: string[] = [];
  let attivo = -1;
  let timer = 0;
  let richiesta = 0;

  const chiudi = () => {
    lista.hidden = true;
    lista.replaceChildren();
    o.input.setAttribute("aria-expanded", "false");
    attivo = -1;
  };
  const evidenzia = () => {
    [...lista.children].forEach((li, i) => {
      li.classList.toggle("is-attivo", i === attivo);
      li.setAttribute("aria-selected", i === attivo ? "true" : "false");
    });
  };
  const mostra = (v: string[]) => {
    voci = v;
    if (v.length === 0) return chiudi();
    // L'opzione è il <li> stesso (niente bottone dentro: un'opzione non contiene altri controlli).
    lista.replaceChildren(
      ...v.map((testo, i) =>
        h(
          "li",
          {
            role: "option",
            class: "suggerimenti__voce",
            "data-i": i,
            "aria-selected": "false",
            onmousedown: (e: Event) => e.preventDefault(), // il campo non perde il focus prima del click
            onclick: () => scegli(i),
          },
          testo,
        ),
      ),
    );
    lista.hidden = false;
    o.input.setAttribute("aria-expanded", "true");
    attivo = -1;
  };
  const scegli = (i: number) => {
    const t = voci[i];
    if (t === undefined) return;
    o.input.value = t;
    chiudi();
    o.scegli(t);
  };

  o.input.addEventListener("input", () => {
    o.cambiato?.();
    clearTimeout(timer);
    const q = o.input.value;
    const mia = ++richiesta;
    timer = window.setTimeout(async () => {
      const v = await o.cerca(q);
      if (mia === richiesta) mostra(v);
    }, 120);
  });
  o.input.addEventListener("keydown", (e) => {
    if (lista.hidden) {
      if (e.key === "Enter") {
        e.preventDefault();
        // Invio con l'elenco chiuso: sceglie il primo risultato se c'è, così chi non tocca nulla non resta bloccato
        void o.cerca(o.input.value).then((v) => {
          if (v.length && v[0]) {
            voci = v;
            scegli(0);
          }
        });
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      attivo = Math.min(attivo + 1, voci.length - 1);
      evidenzia();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      attivo = Math.max(attivo - 1, 0);
      evidenzia();
    } else if (e.key === "Enter") {
      e.preventDefault();
      scegli(attivo >= 0 ? attivo : 0);
    } else if (e.key === "Escape") {
      chiudi();
    }
  });
  o.input.addEventListener("blur", () => setTimeout(chiudi, 150));
  return { chiudi, el: lista };
}
