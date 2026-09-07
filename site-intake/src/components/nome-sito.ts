/**
 * Nome del sito: tre proposte dal nome dell'azienda più «oppure scrivilo tu», con
 * la disponibilità controllata dal vivo (lib/dominio.ts). Il .it è fisso.
 */
import { disponibilita, TESTO_ESITO, type EsitoDominio } from "../lib/dominio";
import { giudicaNomeSito, proponiNomiSito, pulisciNomeSito } from "../lib/validators";
import { OK, avviso, blocco, campoTesto, h, svgIcona, type ArgomentiComponente, type Componente } from "./base";

interface ValoreNomeSito {
  nome: string;
  esito: EsitoDominio;
}

export function creaNomeSito({ risposte, valore }: ArgomentiComponente<ValoreNomeSito>): Componente<ValoreNomeSito> {
  const proposte = proponiNomiSito(risposte.azienda ?? "", risposte.mestiere?.id);
  const esiti = new Map<string, EsitoDominio>();
  if (valore) esiti.set(valore.nome, valore.esito);
  const personalizzato = !!valore && !proposte.includes(valore.nome);

  const stato = (nome: string) => {
    const e = esiti.get(nome);
    const span = h("span", { class: `stato-dominio${e ? ` is-${e}` : ""}`, "data-nome": nome }, e ? TESTO_ESITO[e] : "Controllo…");
    return span;
  };
  const aggiornaStato = (nome: string, e: EsitoDominio) => {
    esiti.set(nome, e);
    el.querySelectorAll<HTMLElement>(`.stato-dominio[data-nome="${nome}"]`).forEach((s) => {
      s.className = `stato-dominio is-${e}`;
      s.textContent = TESTO_ESITO[e];
    });
  };
  const controlla = (nome: string) => {
    if (nome.length < 3) return;
    if (!esiti.has(nome)) void disponibilita(nome).then((e) => aggiornaStato(nome, e));
  };

  const righe = proposte.map((n) =>
    h(
      "label",
      { class: "scelta scelta--dominio" },
      h("input", { class: "scelta__input", type: "radio", name: "nome_sito", value: n, checked: valore?.nome === n }),
      h("span", { class: "scelta__testo" }, h("span", { class: "dominio__nome" }, n, h("span", { class: "dominio__tld" }, ".it")), stato(n)),
      h("span", { class: "scelta__spunta", "aria-hidden": "true" }, svgIcona("spunta")),
    ),
  );
  const scelte = h("div", { class: "scelte scelte--righe", role: "radiogroup", "aria-labelledby": "domanda" }, ...righe);
  const c = campoTesto({
    etichetta: proposte.length ? "Oppure scrivilo tu" : "Scrivi il nome del sito",
    suffisso: ".it",
    placeholder: "nomeazienda",
    autocomplete: "off",
    valore: personalizzato ? valore?.nome : "",
    maxlength: 63,
    nome: "nome_sito_libero",
  });
  const statoLibero = h("p", { class: "campo__aiuto" });
  c.el.append(statoLibero);
  let timer = 0;
  c.input.addEventListener("input", () => {
    // pulizia mentre scrive: minuscole, niente accenti, niente spazi; il trattino finale resta finché scrive
    const pulito = c.input.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9-]+/g, "")
      .replace(/-{2,}/g, "-");
    if (pulito !== c.input.value) c.input.value = pulito;
    scelte.querySelectorAll<HTMLInputElement>(".scelta__input").forEach((i) => (i.checked = false));
    statoLibero.replaceChildren();
    clearTimeout(timer);
    const nome = pulisciNomeSito(pulito);
    if (nome.length >= 3) {
      statoLibero.append(stato(nome));
      timer = window.setTimeout(() => controlla(nome), 500);
    }
  });
  scelte.addEventListener("change", () => {
    c.input.value = "";
    statoLibero.replaceChildren();
  });
  const el = h("div", { class: "campo-gruppo" }, proposte.length ? scelte : null, c.el);
  for (const n of proposte) controlla(n);
  if (personalizzato && valore) {
    statoLibero.append(stato(valore.nome));
    controlla(valore.nome);
  }

  const nomeScelto = (): string => {
    const radio = scelte.querySelector<HTMLInputElement>(".scelta__input:checked")?.value;
    return radio ?? pulisciNomeSito(c.input.value);
  };
  return {
    el,
    focus: () => (proposte.length ? scelte.querySelector<HTMLInputElement>(".scelta__input")?.focus() : c.input.focus()),
    leggi: () => {
      const nome = nomeScelto();
      return nome ? { nome, esito: esiti.get(nome) ?? "sconosciuto" } : undefined;
    },
    valida: (forza) => {
      const g = giudicaNomeSito(nomeScelto());
      if (!g.ok) return g.livello === "blocco" ? blocco(g.messaggio) : forza ? OK : avviso(g.messaggio);
      if (esiti.get(g.valore) === "preso" && !forza) return avviso("Questo nome è già preso: tocca un altro o scrivine uno tuo.");
      return OK;
    },
  };
}
