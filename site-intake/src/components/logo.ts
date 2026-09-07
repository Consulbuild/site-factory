/** Logo: un file (PNG, JPG, SVG, PDF) o «Non ce l'ho». Caricato dalla stessa coda delle foto. */
import { miniatura } from "../lib/immagini";
import type { CodaUpload } from "../lib/upload";
import { OK, avviso, h, svgIcona, type ArgomentiComponente, type Componente } from "./base";

interface ValoreLogo {
  nome?: string;
  nessuno?: boolean;
}

const ACCETTA = "image/png,image/jpeg,image/svg+xml,application/pdf";
const MAX_BYTES = 25 * 1024 * 1024;

export function creaLogo({ coda, valore }: ArgomentiComponente<ValoreLogo>): Componente<ValoreLogo> {
  if (!coda) throw new Error("creaLogo: manca la coda di caricamento");
  let nessuno = valore?.nessuno ?? false;
  const input = h("input", { type: "file", accept: ACCETTA, class: "sr-only", id: "logo-input" });
  const anteprima = h("div", { class: "logo-anteprima", hidden: true });
  const messaggi = h("div", { class: "foto-messaggi", "aria-live": "polite" });
  const btnNessuno = h("button", { class: "btn btn--secondario btn--blocco", type: "button" }, "Non ce l'ho");

  const rendi = () => {
    const v = coda.di("logo")[0];
    anteprima.hidden = !v;
    btnNessuno.classList.toggle("is-scelto", nessuno && !v);
    btnNessuno.replaceChildren(...(nessuno && !v ? [svgIcona("spunta"), "Non ce l'ho: lo disegnate voi"] : ["Non ce l'ho"]));
    if (!v) return;
    const figli: Node[] = [
      v.miniatura ? h("img", { src: v.miniatura, alt: "Anteprima del logo", class: "logo-anteprima__img" }) : h("span", { class: "logo-anteprima__file" }, svgIcona("immagine"), v.nome),
      h(
        "span",
        { class: `logo-anteprima__stato is-${v.stato}` },
        v.stato === "fatto" ? "Caricato" : v.stato === "errore" ? "Non caricato" : `Caricamento… ${Math.round(v.frazione * 100)}%`,
      ),
    ];
    if (v.stato === "errore") figli.push(h("button", { class: "btn btn--sm btn--secondario", type: "button", onclick: () => coda.riprova(v) }, "Riprova"));
    figli.push(h("button", { class: "btn btn--sm btn--ghost", type: "button", "aria-label": `Togli ${v.nome}`, onclick: () => coda.rimuovi(v) }, svgIcona("x"), "Togli"));
    anteprima.replaceChildren(...figli);
  };
  const stacca = coda.onCambio(rendi);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    messaggi.replaceChildren();
    if (!file) return;
    if (file.size > MAX_BYTES) {
      messaggi.replaceChildren(h("p", { class: "avviso avviso--attenzione is-nuovo" }, svgIcona("attenzione"), h("span", {}, "Il file è troppo grande: il massimo è 25 MB.")));
      return;
    }
    for (const v of coda.di("logo")) coda.rimuovi(v); // un logo solo: il nuovo sostituisce il vecchio
    nessuno = false;
    const url = file.type === "application/pdf" ? null : file.type === "image/svg+xml" ? URL.createObjectURL(file) : await miniatura(file, 320);
    coda.aggiungi("logo", file, url);
  });
  btnNessuno.addEventListener("click", () => {
    nessuno = true;
    for (const v of coda.di("logo")) coda.rimuovi(v);
    rendi();
  });

  const el = h(
    "div",
    { class: "campo-gruppo logo" },
    input,
    h("label", { class: "btn btn--primario btn--blocco", for: "logo-input" }, svgIcona("immagine"), "Carica il logo"),
    anteprima,
    btnNessuno,
    messaggi,
  );
  rendi();
  return {
    el,
    focus: () => el.querySelector<HTMLElement>("label.btn")?.focus(),
    leggi: () => {
      const v = coda.di("logo")[0];
      if (v) return { nome: v.nome };
      return nessuno ? { nessuno: true } : undefined;
    },
    valida: (forza) => {
      const v = coda.di("logo")[0];
      if (v?.stato === "errore" && !forza) return avviso("Il logo non si è caricato: tocca «Riprova» oppure toglilo.");
      return OK;
    },
    distruggi: () => stacca(),
  };
}
