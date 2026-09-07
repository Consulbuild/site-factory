/**
 * Presa visione dell'informativa privacy (base giuridica art. 6.1.b: nessun consenso
 * da raccogliere, vedi src/data/privacy.ts). Casella grande, sintesi in due righe,
 * finestra con il primo livello completo e il link al secondo livello.
 */
import { INFORMATIVA_BREVE_HTML, INFORMATIVA_SINTESI } from "../data/privacy";
import { OK, blocco, h, svgIcona, type ArgomentiComponente, type Componente } from "./base";

export function creaConsenso({ valore }: ArgomentiComponente<boolean>): Componente<boolean> {
  const input = h("input", { class: "scelta__input", type: "checkbox", name: "consenso", checked: valore === true, "aria-describedby": "consenso-sintesi" });
  const casella = h(
    "label",
    { class: "scelta consenso" },
    input,
    h("span", { class: "consenso__quadrato", "aria-hidden": "true" }, svgIcona("spunta")),
    h("span", { class: "scelta__testo" }, "Ho letto l'informativa sulla privacy"),
  );
  const btnChiudi = h("button", { class: "btn btn--primario btn--blocco", type: "button" }, "Ho capito, chiudi");
  const dialogo: HTMLDialogElement = h(
    "dialog",
    { class: "informativa", "aria-labelledby": "informativa-titolo" },
    h(
      "div",
      { class: "informativa__corpo" },
      h("h2", { class: "informativa__titolo", id: "informativa-titolo" }, "Informativa sulla privacy"),
      h("div", { class: "informativa__testo", html: INFORMATIVA_BREVE_HTML }),
      btnChiudi,
    ),
  );
  btnChiudi.addEventListener("click", () => dialogo.close());
  dialogo.addEventListener("click", (e: MouseEvent) => {
    if (e.target === dialogo) dialogo.close(); // tocco fuori dal foglio = chiudi
  });
  const apri = h("button", { class: "btn btn--secondario btn--sm", type: "button" }, svgIcona("lucchetto"), "Leggi tutta l'informativa");
  apri.addEventListener("click", () => dialogo.showModal());
  const el = h(
    "div",
    { class: "campo-gruppo" },
    casella,
    h("p", { class: "consenso__sintesi", id: "consenso-sintesi" }, INFORMATIVA_SINTESI),
    apri,
    dialogo,
  );
  input.addEventListener("change", () => casella.classList.remove("is-errore"));
  return {
    el,
    focus: () => input.focus(),
    leggi: () => (input.checked ? true : undefined),
    valida: () => {
      if (input.checked) return OK;
      casella.classList.add("is-errore");
      return blocco("Serve la spunta per proseguire: conferma di aver letto l'informativa.");
    },
    distruggi: () => {
      if (dialogo.open) dialogo.close();
    },
  };
}
