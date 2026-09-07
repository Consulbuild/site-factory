/**
 * Schermata finale «Fatto»: cosa succede adesso, con la timeline in tre tappe e il
 * numero a cui scriveremo. La rivelazione blu che la introduce sta in motion.ts (M3).
 */
import type { Risposte } from "../data/domande";
import { formattaTelefono } from "../lib/validators";
import { h, svgIcona } from "./base";

export function montaFatto(risposte: Risposte): HTMLElement {
  const tel = risposte.telefono ? formattaTelefono(risposte.telefono) : "";
  const canale = risposte.ricontatto?.id === "telefonata" ? "Ti chiamiamo" : "Ti scriviamo su WhatsApp";
  const tappa = (n: string, titolo: string, testo: string) =>
    h("li", { class: "tappa" }, h("span", { class: "tappa__n", "aria-hidden": "true" }, n), h("div", {}, h("strong", {}, titolo), h("p", {}, testo)));
  return h(
    "section",
    { class: "passo passo--fatto", "data-passo": "fatto", "aria-labelledby": "domanda" },
    h("p", { class: "passo__sezione" }, "Fatto"),
    h("h1", { class: "passo__titolo", id: "domanda", tabindex: "-1" }, "Il tuo nuovo sito è in lavorazione"),
    h("p", { class: "passo__aiuto" }, `Grazie${risposte.referente ? `, ${risposte.referente.split(" ")[0]}` : ""}. Ecco cosa succede adesso.`),
    h(
      "ol",
      { class: "tappe" },
      tappa("1", "Oggi", "Abbiamo ricevuto le tue risposte" + (risposte.azienda ? ` per ${risposte.azienda}` : "") + "."),
      tappa("2", "Entro 48 ore", "Prepariamo il tuo sito: testi, colori e le tue foto."),
      tappa("3", "Poi", `${canale}${tel ? ` al ${tel}` : ""} per mostrartelo. Se ti piace, lo attiviamo insieme.`),
    ),
    h("p", { class: "fatto__nota" }, svgIcona("fotocamera"), "Hai altre foto dei lavori? Puoi mandarcele quando ti contattiamo."),
  );
}
