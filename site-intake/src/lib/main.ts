/**
 * Avvio del form: collega motore, render, motion, progresso, tastiera e History.
 * È l'unico modulo che conosce gli id di index.astro.
 */
import { DOMANDE, quotaProgresso, sezioneDi, TOTALE_SEZIONI } from "../data/domande";
import { MESTIERI } from "../data/tassonomia";
import { annuncia, focusTitolo } from "./a11y";
import { traccia } from "./analytics";
import { caricaOAvvia, INDICE_FATTO, INDICE_RIEPILOGO, Motore, type Passo } from "./engine";
import { transizione } from "./motion";
import { montaDomanda, type PassoMontato } from "./render";
import { salvaBozza } from "./transport";
import { h } from "../components/base";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const stage = $("stage");
const sipario = $("sipario");
const etichetta = $("progresso-eti");
const barra = $("progresso");
const riempi = $("progresso-riempi");

const url = new URL(location.href);
const stato = caricaOAvvia(url);
const motore = new Motore(stato);

// Il mestiere può arrivare dall'annuncio (?mestiere=idraulico o utm_content=idraulico): progresso «dotato».
if (!motore.risposte.mestiere) {
  const dall = stato.origine.utm["mestiere"] ?? stato.origine.utm["utm_content"];
  if (dall && MESTIERI.some((m) => m.id === dall)) motore.stato.risposte.mestiere = { id: dall };
}

let corrente: PassoMontato | null = null;
let ultimoAvviso: string | null = null;
let ultimaSezione = 0;

function aggiornaProgresso(): void {
  const n = motore.sezione;
  const s = sezioneDi(n);
  etichetta.innerHTML = `<b>Sezione ${n}</b> di ${TOTALE_SEZIONI}`;
  barra.setAttribute("aria-valuenow", String(n));
  barra.setAttribute("aria-valuetext", `Sezione ${n} di ${TOTALE_SEZIONI}: ${s.nome}`);
  riempi.style.setProperty("--p", String(quotaProgresso(motore.indice >= INDICE_FATTO ? TOTALE_SEZIONI : n)));
  document.querySelectorAll<HTMLElement>(".binario__voce").forEach((v) => {
    const k = Number(v.dataset["sezione"]);
    v.toggleAttribute("aria-current", k === n);
    if (k === n) v.setAttribute("aria-current", "step");
    v.classList.toggle("is-fatta", k < n);
    const num = v.querySelector(".binario__num");
    if (num) num.innerHTML = k < n ? '<svg class="icona" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' : String(k);
  });
  if (n !== ultimaSezione) {
    if (ultimaSezione !== 0) annuncia(`Sezione ${n} di ${TOTALE_SEZIONI}: ${s.nome}`);
    ultimaSezione = n;
  }
}

/** Costruisce il DOM del passo corrente (senza inserirlo). */
function monta(adotta?: HTMLElement): HTMLElement {
  const passo: Passo = motore.passo;
  ultimoAvviso = null;
  if (passo.tipo === "domanda") {
    const d = passo.domanda;
    corrente = montaDomanda({
      domanda: d,
      risposte: motore.risposte,
      valore: (motore.risposte as Record<string, unknown>)[d.id],
      primoDellaSezione: motore.primoDellaSezione(),
      puoIndietro: motore.puoIndietro,
      adotta,
      avanti: () => continua(false),
    });
    corrente.btnAvanti.onclick = () => continua(false);
    corrente.btnIndietro.onclick = () => vai(motore.indice - 1, "indietro");
    return corrente.el;
  }
  corrente = null;
  // Riepilogo e Fatto arrivano in M2/M3: per ora un segnaposto che chiude il giro.
  const titolo = passo.tipo === "riepilogo" ? "Controlla le tue risposte" : "Fatto!";
  const btn = h("button", { class: "btn btn--primario", type: "button", onclick: () => (passo.tipo === "riepilogo" ? vai(INDICE_FATTO, "avanti") : location.reload()) }, passo.tipo === "riepilogo" ? "Voglio vedere il mio sito" : "Ricomincia");
  const indietro = h("button", { class: "btn btn--ghost", type: "button", hidden: passo.tipo === "fatto", onclick: () => vai(motore.indice - 1, "indietro") }, "Indietro");
  return h(
    "section",
    { class: "passo", "data-passo": passo.tipo, "aria-labelledby": "domanda" },
    h("p", { class: "passo__sezione" }, "Per finire"),
    h("h1", { class: "passo__titolo", id: "domanda", tabindex: "-1" }, titolo),
    h("pre", { class: "passo__aiuto", style: "white-space: pre-wrap; font-size: 14px" }, JSON.stringify(motore.risposte, null, 1)),
    h("footer", { class: "passo__azioni" }, indietro, btn),
  );
}

let inTransizione = false;

async function vai(indice: number, direzione: "avanti" | "indietro", spingi = true): Promise<void> {
  if (inTransizione) return;
  inTransizione = true;
  corrente?.comp.distruggi?.();
  motore.vaiA(indice);
  if (spingi) history.pushState({ indice: motore.indice }, "");
  const nuovo = await transizione(direzione, stage, sipario, () => monta());
  aggiornaProgresso();
  focusTitolo(nuovo);
  const p = motore.passo;
  traccia("passo", { id: p.tipo === "domanda" ? p.domanda.id : p.tipo, sezione: motore.sezione });
  inTransizione = false;
}

/** «Continua»: valida, salva, avanza. Un avviso già mostrato non ferma il secondo tocco. */
function continua(forza: boolean): void {
  if (!corrente || inTransizione) return;
  const passo = motore.passo;
  if (passo.tipo !== "domanda") return;
  const esito = corrente.comp.valida(forza || ultimoAvviso !== null);
  if (!esito.ok) {
    ultimoAvviso = esito.messaggio;
    corrente.mostraEsito(
      esito,
      esito.livello === "avviso" ? [{ testo: "Va bene così, continua", esegui: () => continua(true) }] : [],
    );
    return;
  }
  corrente.mostraEsito(null);
  motore.rispondi(passo.domanda.id, corrente.comp.leggi());
  salvaBozza(motore.stato.leadId, { risposte: motore.risposte, indice: motore.indice + 1, aggiornatoAt: new Date().toISOString() });
  void vai(motore.indice + 1, "avanti");
}

// ---------- Avvio ----------
const statico = stage.querySelector<HTMLElement>('.passo[data-passo="mestiere"]');
if (motore.indice === 0 && statico) {
  monta(statico); // adotta l'HTML già dipinto: niente doppia animazione
} else {
  const nuovo = monta();
  nuovo.classList.add("is-entrata");
  [...nuovo.children].forEach((c, i) => (c as HTMLElement).style.setProperty("--i", String(i)));
  stage.replaceChildren(nuovo);
}
aggiornaProgresso();
history.replaceState({ indice: motore.indice }, "");

// Indietro/avanti del browser = indietro/avanti del form (senza ripetere il push).
window.addEventListener("popstate", (e) => {
  const a = (e.state as { indice?: number } | null)?.indice;
  if (typeof a !== "number" || a === motore.indice) return;
  void vai(a, a < motore.indice ? "indietro" : "avanti", false);
});

// Invio con Enter dai campi a una riga.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const t = e.target as HTMLElement;
  if (t instanceof HTMLInputElement && t.type !== "checkbox" && t.type !== "radio") {
    e.preventDefault();
    continua(false);
  }
});

traccia("passo", { id: DOMANDE[motore.indice]?.id ?? "finale", sezione: motore.sezione });
export {};
