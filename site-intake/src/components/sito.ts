/** Sito attuale: Sì / No, e se Sì la casella con l'indirizzo (accettato in qualsiasi forma). */
import { giudicaSito, normalizzaSito } from "../lib/validators";
import { OK, avviso, campoTesto, h, svgIcona, type ArgomentiComponente, type Componente } from "./base";

export function creaSito({ valore }: ArgomentiComponente<string>): Componente<string> {
  const nome = "sito_si";
  const riga = (v: "si" | "no", testo: string, checked: boolean) =>
    h(
      "label",
      { class: "scelta" },
      h("input", { class: "scelta__input", type: "radio", name: nome, value: v, checked }),
      svgIcona(v === "si" ? "globo" : "x", "icona scelta__icona"),
      h("span", { class: "scelta__testo" }, testo),
      h("span", { class: "scelta__spunta", "aria-hidden": "true" }, svgIcona("spunta")),
    );
  const scelte = h(
    "div",
    { class: "scelte scelte--righe", role: "radiogroup", "aria-labelledby": "domanda" },
    riga("si", "Sì, ce l'ho", !!valore),
    riga("no", "No", valore === ""),
  );
  const c = campoTesto({
    etichetta: "Indirizzo del sito",
    tipo: "url",
    inputmode: "url",
    autocomplete: "url",
    placeholder: "es. nomeazienda.it",
    valore: valore ?? "",
    nome: "sito_attuale",
    maxlength: 200,
  });
  c.el.hidden = !valore;
  const el = h("div", { class: "campo-gruppo" }, scelte, c.el);
  const scelto = () => scelte.querySelector<HTMLInputElement>(".scelta__input:checked")?.value;
  scelte.addEventListener("change", () => {
    c.el.hidden = scelto() !== "si";
    if (scelto() === "si") c.input.focus();
  });
  return {
    el,
    focus: () => scelte.querySelector<HTMLInputElement>(".scelta__input")?.focus(),
    leggi: () => {
      const s = scelto();
      if (s === "no") return "";
      if (s === "si") return normalizzaSito(c.input.value) || undefined;
      return undefined;
    },
    valida: (forza) => {
      if (scelto() !== "si") return OK;
      const g = giudicaSito(c.input.value);
      if (!c.input.value.trim()) return forza ? OK : avviso("Scrivi l'indirizzo del sito, oppure tocca «No».");
      if (!g.ok && !forza) return avviso(g.messaggio);
      return OK;
    },
  };
}
