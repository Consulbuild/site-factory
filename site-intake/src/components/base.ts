/**
 * Contratto comune dei componenti-domanda e piccoli aiuti per costruire DOM.
 * Ogni componente: riceve la domanda, le risposte date finora e l'eventuale valore
 * già salvato; espone il suo elemento radice, il focus, la lettura del valore e la
 * validazione (Esito). Niente framework: DOM diretto, poche righe, leggibili.
 */
import type { Domanda, Risposte } from "../data/domande";
import { icona, type NomeIcona } from "../lib/icone";
import type { CodaUpload } from "../lib/upload";

export interface Azione {
  testo: string;
  esegui: () => void;
}

export type Esito =
  | { ok: true }
  | { ok: false; livello: "blocco" | "avviso"; messaggio: string; azioni?: Azione[] };

export const OK: Esito = { ok: true };
export const blocco = (messaggio: string): Esito => ({ ok: false, livello: "blocco", messaggio });
export const avviso = (messaggio: string, azioni?: Azione[]): Esito => ({ ok: false, livello: "avviso", messaggio, azioni });

export interface Componente<V = unknown> {
  el: HTMLElement;
  focus(): void;
  /** Il valore attuale, `undefined` se vuoto. */
  leggi(): V | undefined;
  /** `forza` = l'utente ha già visto l'avviso e vuole andare avanti lo stesso. */
  valida(forza: boolean): Esito;
  /** Chiamato quando il passo viene smontato (timer, URL di oggetti…). */
  distruggi?(): void;
}

export interface ArgomentiComponente<V = unknown> {
  domanda: Domanda;
  risposte: Risposte;
  valore?: V;
  /** Elemento già presente nell'HTML statico da adottare invece di ricreare (primo passo). */
  radice?: HTMLElement;
  /** Il componente può chiedere al motore di andare avanti (es. dopo una scelta singola). */
  avanti?: () => void;
  /** Coda di caricamento condivisa (foto e logo). */
  coda?: CodaUpload;
}

export type Fabbrica<V = unknown> = (arg: ArgomentiComponente<V>) => Componente<V>;

// ---------- Aiuti DOM ----------
type Attributi = Record<string, string | number | boolean | undefined | null | ((e: Event) => unknown)>;
type Figlio = Node | string | null | undefined | false;

/** `h("button", { class: "btn", type: "button" }, "Continua")` */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attributi = {}, ...figli: Figlio[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = String(v);
    else if (k === "html") el.innerHTML = String(v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const f of figli) {
    if (f === null || f === undefined || f === false) continue;
    el.append(typeof f === "string" ? document.createTextNode(f) : f);
  }
  return el;
}

/** Nodo SVG di un'icona (da stringa a elemento). */
export function svgIcona(nome: NomeIcona, classe = "icona"): SVGElement {
  const tpl = document.createElement("template");
  tpl.innerHTML = icona(nome, classe);
  return tpl.content.firstElementChild as SVGElement;
}

let contatoreId = 0;
export const idUnico = (prefisso: string) => `${prefisso}-${++contatoreId}`;

// ---------- Campo di testo con etichetta, prefisso/suffisso, stato ok ----------
export interface OpzioniCampo {
  etichetta: string;
  facoltativo?: boolean;
  tipo?: string;
  inputmode?: string;
  autocomplete?: string;
  placeholder?: string;
  prefisso?: string;
  suffisso?: string;
  aiuto?: string;
  valore?: string;
  maxlength?: number;
  /** Mostra la spunta verde quando `ok(true)` (solo campi complessi). */
  conSpunta?: boolean;
  nome?: string;
}

export interface CampoTesto {
  el: HTMLElement;
  input: HTMLInputElement;
  ok(si: boolean): void;
  errore(si: boolean): void;
}

export function campoTesto(o: OpzioniCampo): CampoTesto {
  const id = idUnico("campo");
  const input = h("input", {
    class: "campo__input",
    id,
    type: o.tipo ?? "text",
    inputmode: o.inputmode,
    autocomplete: o.autocomplete ?? "off",
    autocapitalize: o.tipo === "email" ? "off" : undefined,
    spellcheck: "false",
    placeholder: o.placeholder,
    value: o.valore ?? "",
    maxlength: o.maxlength,
    name: o.nome,
    "aria-describedby": o.aiuto ? `${id}-aiuto` : undefined,
  });
  const cornice = h(
    "div",
    { class: "campo__cornice" },
    o.prefisso ? h("span", { class: "campo__prefisso", "aria-hidden": "true" }, o.prefisso) : null,
    input,
    o.suffisso ? h("span", { class: "campo__suffisso", "aria-hidden": "true" }, o.suffisso) : null,
    o.conSpunta ? h("span", { class: "campo__ok", "aria-hidden": "true" }, svgIcona("spunta")) : null,
  );
  const el = h(
    "div",
    { class: `campo${o.prefisso ? " campo--prefisso" : ""}${o.suffisso ? " campo--suffisso" : ""}` },
    h(
      "label",
      { class: "campo__etichetta", for: id },
      o.etichetta,
      o.facoltativo ? h("span", { class: "campo__facoltativo" }, " (facoltativo)") : null,
    ),
    cornice,
    o.aiuto ? h("p", { class: "campo__aiuto", id: `${id}-aiuto` }, o.aiuto) : null,
  );
  return {
    el,
    input,
    ok: (si) => el.classList.toggle("campo--ok", si),
    errore: (si) => {
      el.classList.toggle("campo--errore", si);
      input.setAttribute("aria-invalid", si ? "true" : "false");
    },
  };
}
