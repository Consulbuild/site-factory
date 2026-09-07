/**
 * Avvio del form: collega motore, render, motion, progresso, tastiera, History,
 * coda di caricamento e invio. È l'unico modulo che conosce gli id di index.astro.
 */
import { DOMANDE, quotaProgresso, sezioneDi, TOTALE_SEZIONI } from "../data/domande";
import { MESTIERI } from "../data/tassonomia";
import { montaFatto } from "../components/fatto";
import { montaRiepilogo, type RiepilogoMontato } from "../components/riepilogo";
import { annuncia, focusTitolo } from "./a11y";
import { traccia } from "./analytics";
import { caricaOAvvia, INDICE_FATTO, INDICE_RIEPILOGO, Motore, type Passo } from "./engine";
import { mostraAttesa, rivelazione, scaglioni, transizione } from "./motion";
import { montaDomanda, type PassoMontato } from "./render";
import { ErroreTrasporto, invia, salvaBozza } from "./transport";
import { CodaUpload } from "./upload";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const stage = $("stage");
const sipario = $("sipario");
const card = $("card");
const etichetta = $("progresso-eti");
const barra = $("progresso");
const riempi = $("progresso-riempi");

const url = new URL(location.href);
const stato = caricaOAvvia(url);
const motore = new Motore(stato);
const coda = new CodaUpload(stato.leadId);

// Il mestiere può arrivare dall'annuncio (?mestiere=idraulico o utm_content=idraulico): progresso «dotato».
if (!motore.risposte.mestiere) {
  const dall = stato.origine.utm["mestiere"] ?? stato.origine.utm["utm_content"];
  if (dall && MESTIERI.some((m) => m.id === dall)) motore.stato.risposte.mestiere = { id: dall };
}

let corrente: PassoMontato | null = null;
let riepilogo: RiepilogoMontato | null = null;
let ultimoAvviso: string | null = null;
let ultimaSezione = 0;
/** Dopo «Modifica» dal riepilogo, il prossimo «Continua» torna al riepilogo invece di andare oltre. */
let tornaAlRiepilogo = false;

const SPUNTA_SVG =
  '<svg class="icona" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function aggiornaProgresso(): void {
  const n = motore.sezione;
  const s = sezioneDi(n);
  const finito = motore.indice >= INDICE_FATTO;
  etichetta.innerHTML = finito ? "<b>Fatto</b>" : `<b>Sezione ${n}</b> di ${TOTALE_SEZIONI}`;
  barra.setAttribute("aria-valuenow", String(finito ? TOTALE_SEZIONI : n));
  barra.setAttribute("aria-valuetext", finito ? "Completato" : `Sezione ${n} di ${TOTALE_SEZIONI}: ${s.nome}`);
  riempi.style.setProperty("--p", String(quotaProgresso(finito ? TOTALE_SEZIONI : n)));
  document.querySelectorAll<HTMLElement>(".binario__voce").forEach((v) => {
    const k = Number(v.dataset["sezione"]);
    const attiva = k === n && !finito;
    const fatta = k < n || finito;
    if (attiva) v.setAttribute("aria-current", "step");
    else v.removeAttribute("aria-current");
    v.classList.toggle("is-fatta", fatta);
    const num = v.querySelector(".binario__num");
    if (num) num.innerHTML = fatta ? SPUNTA_SVG : String(k);
  });
  if (n !== ultimaSezione) {
    if (ultimaSezione !== 0) annuncia(finito ? "Completato" : `Sezione ${n} di ${TOTALE_SEZIONI}: ${s.nome}`);
    ultimaSezione = n;
  }
}

/** Costruisce il DOM del passo corrente (senza inserirlo). */
function monta(adotta?: HTMLElement): HTMLElement {
  const passo: Passo = motore.passo;
  ultimoAvviso = null;
  corrente = null;
  riepilogo = null;
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
      coda,
    });
    corrente.btnAvanti.onclick = () => continua(false);
    corrente.btnIndietro.onclick = () => vai(motore.indice - 1, "indietro");
    if (tornaAlRiepilogo) {
      corrente.btnAvanti.replaceChildren("Salva e torna al riepilogo");
      corrente.btnIndietro.onclick = () => {
        tornaAlRiepilogo = false;
        vai(INDICE_RIEPILOGO, "avanti");
      };
    }
    return corrente.el;
  }
  if (passo.tipo === "riepilogo") {
    riepilogo = montaRiepilogo({
      risposte: motore.risposte,
      confermate: motore.stato.confermate,
      foto: coda.di("foto").filter((v) => v.stato === "fatto").length,
      logo: coda.di("logo")[0]?.nome ?? (motore.risposte.logo?.nessuno ? "Lo disegnate voi" : null),
      puoIndietro: motore.puoIndietro,
      indietro: () => vai(motore.indice - 1, "indietro"),
      modifica: (indice) => {
        tornaAlRiepilogo = true;
        vai(indice, "indietro");
      },
      invia: () => void inviaLead(),
    });
    return riepilogo.el;
  }
  return montaFatto(motore.risposte);
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
    corrente.mostraEsito(esito, esito.livello === "avviso" ? [{ testo: "Va bene così, continua", esegui: () => continua(true) }] : []);
    return;
  }
  corrente.mostraEsito(null);
  motore.rispondi(passo.domanda.id, corrente.comp.leggi());
  salvaBozza(motore.stato.leadId, { risposte: motore.risposte, indice: motore.indice + 1, aggiornatoAt: new Date().toISOString() });
  if (tornaAlRiepilogo) {
    tornaAlRiepilogo = false;
    void vai(INDICE_RIEPILOGO, "avanti");
  } else {
    void vai(motore.indice + 1, "avanti");
  }
}

/** Il lead completo che parte con «Voglio vedere il mio sito». */
function componiLead() {
  const foto = coda.manifesto("foto");
  const logo = coda.manifesto("logo")[0] ?? null;
  return {
    versione: 1,
    formVersione: "v4-2026-09-07",
    leadId: motore.stato.leadId,
    iniziatoAt: motore.stato.iniziatoAt,
    inviatoAt: new Date().toISOString(),
    risposte: motore.risposte,
    foto,
    fotoAttese: foto.length,
    fotoArrivate: foto.filter((f) => f.stato === "fatto").length,
    logo,
    origine: motore.stato.origine,
  };
}

let invioInCorso = false;

async function inviaLead(): Promise<void> {
  if (!riepilogo || inTransizione || invioInCorso) return;
  invioInCorso = true;
  riepilogo.mostraEsito(null);
  const attesa = mostraAttesa(card);
  const aggiorna = () => {
    const pendenti = coda.attive;
    attesa.aggiorna(
      pendenti ? "Stiamo salvando le tue foto…" : "Stiamo salvando le tue risposte…",
      pendenti ? `${pendenti} ${pendenti === 1 ? "foto ancora in arrivo" : "foto ancora in arrivo"}: non chiudere la pagina.` : "Un momento.",
      pendenti ? coda.frazioneTotale * 0.9 : 0.95,
    );
  };
  const stacca = coda.onCambio(aggiorna);
  aggiorna();
  try {
    await coda.attendiTutto();
    await invia(motore.stato.leadId, componiLead());
    attesa.aggiorna("Fatto!", "", 1);
    traccia("invio", { foto: coda.manifesto("foto").length });
    motore.chiudi();
    inTransizione = true;
    await rivelazione(attesa.logo, () => {
      document.body.classList.add("is-fatto");
      card.classList.add("is-fatto");
      const nuovo = monta();
      scaglioni(nuovo);
      stage.replaceChildren(nuovo);
      nuovo.classList.add("is-entrata");
      attesa.chiudi();
      aggiornaProgresso();
      focusTitolo(nuovo);
    });
    inTransizione = false;
  } catch (e) {
    attesa.chiudi();
    const ripetibile = e instanceof ErroreTrasporto ? e.ripetibile : true;
    riepilogo.mostraEsito({
      ok: false,
      livello: "blocco",
      messaggio: ripetibile
        ? "Non siamo riusciti a inviare le risposte: controlla la connessione e riprova. Le tue risposte sono al sicuro su questo dispositivo."
        : "Qualcosa non ha funzionato dal nostro lato. Riprova tra un minuto: le tue risposte sono salvate.",
      azioni: [{ testo: "Riprova", esegui: () => void inviaLead() }],
    });
    traccia("errore-invio");
  } finally {
    stacca();
    invioInCorso = false;
  }
}

// ---------- Avvio ----------
const statico = stage.querySelector<HTMLElement>('.passo[data-passo="mestiere"]');
if (motore.indice === 0 && statico) {
  monta(statico); // adotta l'HTML già dipinto: niente doppia animazione
} else {
  const nuovo = monta();
  scaglioni(nuovo);
  nuovo.classList.add("is-entrata");
  stage.replaceChildren(nuovo);
}
aggiornaProgresso();
history.replaceState({ indice: motore.indice }, "");

// Indietro/avanti del browser = indietro/avanti del form (senza ripetere il push).
window.addEventListener("popstate", (e) => {
  const a = (e.state as { indice?: number } | null)?.indice;
  if (typeof a !== "number" || a === motore.indice || motore.indice >= INDICE_FATTO) return;
  void vai(a, a < motore.indice ? "indietro" : "avanti", false);
});

// Invio con Enter dai campi a una riga (non da quelli con suggerimenti: lì Invio sceglie).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const t = e.target as HTMLElement;
  if (t instanceof HTMLInputElement && t.type !== "checkbox" && t.type !== "radio" && t.type !== "file" && t.dataset["enter"] !== "ignora") {
    e.preventDefault();
    continua(false);
  }
});

// Foto ancora in viaggio: avvisa prima di chiudere (il browser mostra il suo dialogo).
window.addEventListener("beforeunload", (e) => {
  if (coda.attive > 0 && motore.indice < INDICE_FATTO) {
    e.preventDefault();
    e.returnValue = "";
  }
});

traccia("passo", { id: DOMANDE[motore.indice]?.id ?? "finale", sezione: motore.sezione });
export {};
