/** Colori aziendali: «Sì» apre dodici pallini più una casella; «No, scegliete voi» chiude. Facoltativa. */
import { COLORI } from "../data/tassonomia";
import { pulisci } from "../lib/validators";
import { OK, avviso, campoTesto, h, svgIcona, type ArgomentiComponente, type Componente } from "./base";

interface ValoreColori {
  ids: string[];
  testo?: string;
  nessuno?: boolean;
}

export function creaColori({ valore }: ArgomentiComponente<ValoreColori>): Componente<ValoreColori> {
  const haColori = !!valore && !valore.nessuno && (valore.ids.length > 0 || !!valore.testo);
  const riga = (v: "si" | "no", testo: string, checked: boolean) =>
    h(
      "label",
      { class: "scelta" },
      h("input", { class: "scelta__input", type: "radio", name: "colori_si", value: v, checked }),
      h("span", { class: "scelta__testo" }, testo),
      h("span", { class: "scelta__spunta", "aria-hidden": "true" }, svgIcona("spunta")),
    );
  const scelte = h(
    "div",
    { class: "scelte scelte--righe", role: "radiogroup", "aria-labelledby": "domanda" },
    riga("si", "Sì, ho dei colori", haColori),
    riga("no", "No, scegliete voi", !!valore?.nessuno),
  );
  const scelti = new Set(valore?.ids ?? []);
  const tavolozza = h(
    "div",
    { class: "tavolozza", role: "group", "aria-label": "Colori" },
    ...COLORI.map((c) =>
      h(
        "label",
        { class: "swatch", style: `--sw: ${c.hex}` },
        h("input", { class: "scelta__input", type: "checkbox", name: "colori", value: c.id, checked: scelti.has(c.id) }),
        h("span", { class: "swatch__cerchio", "aria-hidden": "true" }, svgIcona("spunta")),
        h("span", { class: "swatch__nome" }, c.testo),
      ),
    ),
  );
  const cTesto = campoTesto({
    etichetta: "Altri colori o dettagli",
    facoltativo: true,
    placeholder: "es. nero e oro come il logo",
    valore: valore?.testo ?? "",
    nome: "colori_testo",
    maxlength: 120,
  });
  const dettaglio = h("div", { class: "campo-gruppo", hidden: !haColori }, tavolozza, cTesto.el);
  scelte.addEventListener("change", () => {
    dettaglio.hidden = scelte.querySelector<HTMLInputElement>(".scelta__input:checked")?.value !== "si";
  });
  const el = h("div", { class: "campo-gruppo" }, scelte, dettaglio);
  const sceltoSi = () => scelte.querySelector<HTMLInputElement>(".scelta__input:checked")?.value === "si";
  const ids = () => [...tavolozza.querySelectorAll<HTMLInputElement>(".scelta__input:checked")].map((i) => i.value);
  return {
    el,
    focus: () => scelte.querySelector<HTMLInputElement>(".scelta__input")?.focus(),
    leggi: () => {
      const v = scelte.querySelector<HTMLInputElement>(".scelta__input:checked")?.value;
      if (v === "no") return { ids: [], nessuno: true };
      if (v === "si") {
        const testo = pulisci(cTesto.input.value);
        return { ids: ids(), ...(testo ? { testo } : {}) };
      }
      return undefined;
    },
    valida: (forza) => {
      if (sceltoSi() && ids().length === 0 && !pulisci(cTesto.input.value) && !forza) {
        return avviso("Tocca almeno un colore o scrivilo nella casella. Oppure tocca «No, scegliete voi».");
      }
      return OK;
    },
  };
}
