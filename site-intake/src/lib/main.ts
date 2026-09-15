/**
 * Avvio del form: collega motore, render, motion, progresso, tastiera, History,
 * coda di caricamento e invio. È l'unico modulo che conosce gli id di index.astro.
 */
import { DOMANDE, quotaProgresso, sezioneDi, TOTALE_SEZIONI } from "../data/domande";
import { MESTIERI } from "../data/tassonomia";
import { montaFatto } from "../components/fatto";
import { montaRiepilogo, type RiepilogoMontato } from "../components/riepilogo";
import { annuncia, focusTitolo } from "./a11y";
import { cambioPasso, pagina, secondiSulPasso, traccia, urlPasso } from "./analytics";
import { caricaOAvvia, INDICE_FATTO, INDICE_RIEPILOGO, Motore, type Passo } from "./engine";
import { proponiNomiSito } from "./validators";
import { mostraAttesa, rivelazione, scaglioni, transizione } from "./motion";
import { montaDomanda, type PassoMontato } from "./render";
import { ErroreTrasporto, invia, salvaBozza } from "./transport";
import { CodaUpload } from "./upload";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const stage = $("stage");
const card = $("card");
const etichetta = $("progresso-eti");
const barra = $("progresso");
const riempi = $("progresso-riempi");

const url = new URL(location.href);
const stato = caricaOAvvia(url);
/** Vero se il form riparte da uno stato salvato (chi torna dopo aver lasciato a metà). */
const ripresa = stato.indice > 0 || Object.keys(stato.risposte).length > 0;
const motore = new Motore(stato);
const coda = new CodaUpload(stato.leadId);

// ---------- Statistiche (Umami, senza dati personali): nomi e tempi dei passi ----------
const idPasso = (p: Passo) => (p.tipo === "domanda" ? p.domanda.id : p.tipo);
const titoloPasso = (p: Passo) => (p.tipo === "domanda" ? p.domanda.testo : p.tipo === "riepilogo" ? "Controlla le tue risposte" : "Fatto");
/** Pageview virtuale del passo corrente (`/passo/NN-id`). */
const paginaPasso = () => pagina(urlPasso(motore.indice + 1, idPasso(motore.passo)), titoloPasso(motore.passo));
const secondiTotali = () => Math.round((Date.now() - Date.parse(motore.stato.iniziatoAt)) / 1000);
let ritorni = 0; // «Indietro», tasto del browser e «Modifica»: quante volte in questa compilazione

// Il mestiere può arrivare dall'annuncio (?mestiere=idraulico o utm_content=idraulico): progresso «dotato».
if (!motore.risposte.mestiere) {
  const dall = stato.origine.utm["mestiere"] ?? stato.origine.utm["utm_content"];
  if (dall && MESTIERI.some((m) => m.id === dall)) motore.stato.risposte.mestiere = { id: dall };
}

let corrente: PassoMontato | null = null;
let riepilogo: RiepilogoMontato | null = null;
/** L'avviso mostrato e il valore che l'ha causato: il secondo «Continua» forza solo se il valore non è cambiato. */
let ultimoAvviso: { messaggio: string; valore: string } | null = null;
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
        traccia("modifica", { domanda: DOMANDE[indice]?.id ?? String(indice) });
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
  // Lasciando una domanda (indietro, tasto del browser, «Salva» dopo Modifica) si tiene
  // ciò che c'è nel campo adesso, anche vuoto: quel che il titolare cancella non ricompare.
  const lasciata = motore.passo;
  if (corrente && lasciata.tipo === "domanda") motore.annota(lasciata.domanda.id, corrente.comp.leggi());
  corrente?.comp.distruggi?.();
  const da = idPasso(lasciata);
  const secondi = cambioPasso();
  const verso = lasciata.tipo === "riepilogo" && tornaAlRiepilogo ? "modifica" : direzione;
  if (verso !== "avanti") ritorni++;
  motore.vaiA(indice);
  if (spingi) history.pushState({ indice: motore.indice }, "");
  const nuovo = await transizione(direzione, stage, () => monta());
  aggiornaProgresso();
  focusTitolo(nuovo);
  paginaPasso();
  // `tempo` = «passo lasciato:secondi», così Umami dà la distribuzione dei tempi per domanda.
  traccia("passo", { id: idPasso(motore.passo), n: motore.indice + 1, sezione: motore.sezione, da, direzione: verso, secondi, tempo: `${da}:${secondi}` });
  inTransizione = false;
}

/** Dati anonimi sulla risposta appena confermata: cosa dicono le domande «difficili». */
function tracciaRisposta(id: string): void {
  const r = motore.risposte;
  const secondi = secondiSulPasso();
  switch (id) {
    case "nome_sito": {
      const n = r.nome_sito;
      if (n) traccia("nome_sito", { esito: n.esito, personalizzato: !proponiNomiSito(r.azienda ?? "", r.mestiere?.id).includes(n.nome) });
      break;
    }
    case "zone": {
      const z = r.zone ?? [];
      traccia("zone", { n: z.length, regione: z.some((x) => /region/i.test(x)), italia: z.includes("Tutta Italia") }); // «regione» e «regioni vicine»
      break;
    }
    case "orari_lavoro": {
      const o = r.orari_lavoro ?? {};
      const fasce = Object.values(o);
      const chiave = (f: { dalle: string; alle: string }[]) => f.map((x) => `${x.dalle}-${x.alle}`).join(",");
      traccia("orari", { giorni: fasce.length, pausa: fasce.some((f) => f.length > 1), uguali: new Set(fasce.map(chiave)).size <= 1, secondi });
      break;
    }
    case "orari_telefono":
      if (r.orari_telefono) traccia("telefono_orari", { come: r.orari_telefono.come });
      break;
    case "foto":
      traccia("foto", { n: coda.di("foto").length, errori: coda.inErrore.filter((v) => v.kind === "foto").length, secondi });
      break;
    case "logo":
      traccia("logo", { caricato: coda.di("logo").length > 0, nessuno: !!r.logo?.nessuno });
      break;
  }
}

/** «Continua»: valida, salva, avanza. Un avviso già mostrato non ferma il secondo tocco. */
function continua(forza: boolean): void {
  if (!corrente || inTransizione) return;
  const passo = motore.passo;
  if (passo.tipo !== "domanda") return;
  const valoreOra = JSON.stringify(corrente.comp.leggi() ?? null);
  if (forza) traccia("forzato", { domanda: passo.domanda.id });
  const esito = corrente.comp.valida(forza || ultimoAvviso?.valore === valoreOra);
  if (!esito.ok) {
    ultimoAvviso = { messaggio: esito.messaggio, valore: valoreOra };
    corrente.mostraEsito(esito, esito.livello === "avviso" ? [{ testo: "Va bene così, continua", esegui: () => continua(true) }] : []);
    // `dove` = «domanda:livello» per la distribuzione in Umami; `codice` = l'inizio del messaggio, per riconoscerlo.
    traccia("avviso", { domanda: passo.domanda.id, livello: esito.livello, dove: `${passo.domanda.id}:${esito.livello}`, codice: esito.messaggio.slice(0, 40) });
    return;
  }
  corrente.mostraEsito(null);
  motore.rispondi(passo.domanda.id, corrente.comp.leggi());
  tracciaRisposta(passo.domanda.id);
  salvaBozza(motore.stato.leadId, { risposte: motore.risposte, indice: motore.indice + 1, aggiornatoAt: new Date().toISOString() });
  if (tornaAlRiepilogo) {
    tornaAlRiepilogo = false;
    void vai(INDICE_RIEPILOGO, "avanti");
  } else {
    void vai(motore.indice + 1, "avanti");
  }
}

/** Il lead completo che parte con «Richiedi il tuo nuovo sito». */
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
      pendenti ? `${pendenti} foto ancora in arrivo: non chiudere la pagina.` : "Un momento.",
      pendenti ? coda.frazioneTotale * 0.9 : 0.95,
    );
  };
  const stacca = coda.onCambio(aggiorna);
  aggiorna();
  try {
    await coda.attendiTutto();
    await invia(motore.stato.leadId, componiLead());
    attesa.aggiorna("Fatto!", "", 1);
    traccia("invio", { foto: coda.manifesto("foto").length, secondi_totali: secondiTotali(), indietro: ritorni, ripresa });
    motore.chiudi();
    inTransizione = true;
    await rivelazione(attesa.logo, () => {
      document.documentElement.classList.add("is-fatto"); // anche <html>: è lui a dipingere il fondo sotto il body
      document.body.classList.add("is-fatto");
      card.classList.add("is-fatto");
      const nuovo = monta();
      scaglioni(nuovo);
      stage.replaceChildren(nuovo);
      nuovo.classList.add("is-entrata");
      attesa.chiudi();
      aggiornaProgresso();
      focusTitolo(nuovo);
      paginaPasso();
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
    traccia("errore-invio", { ripetibile });
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

// Chi chiude la scheda prima dell'invio: su quale domanda, dopo quanto. (`pagehide`: Umami
// spedisce con keepalive, quindi l'evento parte anche mentre la pagina se ne va.)
window.addEventListener("pagehide", () => {
  if (motore.indice >= INDICE_FATTO) return;
  traccia("uscita", { domanda: idPasso(motore.passo), n: motore.indice + 1, secondi_sul_passo: secondiSulPasso(), secondi_totali: secondiTotali() });
});

// Statistiche all'apertura: la pageview vera (URL con utm/fbclid: provenienza e campagna),
// poi la pagina virtuale del passo mostrato e l'evento di avvio.
pagina();
paginaPasso();
traccia("avvio", { ripresa, indice: motore.indice, passo: idPasso(motore.passo) });
export {};
