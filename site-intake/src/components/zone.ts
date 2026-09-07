/**
 * Zone di lavoro: riquadri creati dal comune della sede (comune, provincia, regione,
 * Italia) più «Aggiungi una zona» con suggerimenti di province e comuni. Il lead non
 * scrive nomi di posti: li tocca.
 */
import { cercaZone } from "../lib/comuni";
import { pulisci } from "../lib/validators";
import { OK, blocco, campoTesto, h, svgIcona, type ArgomentiComponente, type Componente } from "./base";
import { attaccaSuggerimenti } from "./suggerimenti";

export function creaZone({ risposte, valore }: ArgomentiComponente<string[]>): Componente<string[]> {
  const sede = risposte.sede;
  const proposte: string[] = [];
  if (sede?.comune) proposte.push(`${sede.comune} e dintorni`);
  if (sede?.provinciaNome && sede.provinciaNome !== sede.comune) proposte.push(`${sede.provinciaNome} e provincia`);
  else if (sede?.provinciaNome) proposte.push(`Provincia di ${sede.provinciaNome}`);
  if (sede?.regione) proposte.push(`Tutta la regione ${sede.regione}`);
  proposte.push("Tutta Italia");
  const scelte = new Set(valore ?? []);
  for (const z of scelte) if (!proposte.includes(z)) proposte.push(z);

  const griglia = h("div", { class: "scelte scelte--chip", role: "group", "aria-labelledby": "domanda" });
  const chip = (testo: string, checked: boolean) =>
    h(
      "label",
      { class: "scelta" },
      h("input", { class: "scelta__input", type: "checkbox", name: "zone", value: testo, checked }),
      h("span", { class: "scelta__testo" }, testo),
    );
  for (const p of proposte) griglia.append(chip(p, scelte.has(p)));

  const c = campoTesto({ etichetta: "Aggiungi una zona", placeholder: "es. Bergamo", autocomplete: "off", nome: "zona_extra", maxlength: 80 });
  c.el.classList.add("zone__aggiungi");
  const aggiungi = (testo: string) => {
    const t = pulisci(testo);
    if (!t) return;
    const esistente = griglia.querySelector<HTMLInputElement>(`.scelta__input[value="${CSS.escape(t)}"]`);
    if (esistente) esistente.checked = true;
    else griglia.append(chip(t, true));
    c.input.value = "";
  };
  attaccaSuggerimenti({ input: c.input, cerca: (q) => cercaZone(q), scegli: aggiungi });
  const btnAggiungi = h("button", { class: "btn btn--secondario btn--sm", type: "button", onclick: () => aggiungi(c.input.value) }, svgIcona("piu"), "Aggiungi");
  c.el.querySelector(".campo__cornice")?.append(btnAggiungi);

  const el = h("div", { class: "campo-gruppo" }, griglia, c.el);
  const lette = () => [...griglia.querySelectorAll<HTMLInputElement>(".scelta__input:checked")].map((i) => i.value);
  return {
    el,
    focus: () => griglia.querySelector<HTMLInputElement>(".scelta__input")?.focus(),
    leggi: () => (lette().length ? lette() : undefined),
    valida: () => (lette().length ? OK : blocco("Tocca almeno una zona per andare avanti.")),
  };
}
