/**
 * «Controlla le tue risposte»: elenco per sezione con «Modifica» accanto a ogni riga
 * (che porta alla domanda e poi TORNA qui), poi il bottone d'invio. Modello GOV.UK
 * «check your answers». La formattazione dei valori sta qui, vicino a chi la legge.
 */
import { DOMANDE, SEZIONI, type Domanda, type Risposte } from "../data/domande";
import { ANNI, CLIENTI, COLORI, CONTATTO, LAVORI, MESTIERI, PUNTI_DI_FORZA, STILI, ALTRO_LAVORO } from "../data/tassonomia";
import { formattaTelefono } from "../lib/validators";
import { h, svgIcona, type Azione, type Esito } from "./base";

const ETICHETTE: Record<string, string> = {
  mestiere: "Mestiere",
  lavori: "Lavori",
  azienda: "Azienda",
  nome_sito: "Nome del sito",
  sede: "Sede",
  zone: "Zone",
  esperienza_anni: "Anni di mestiere",
  sito_attuale: "Sito attuale",
  telefono: "Cellulare",
  foto: "Foto dei lavori",
  logo: "Logo",
  punti_di_forza: "Punti di forza",
  clienti: "Clienti",
  stile: "Stile",
  colori: "Colori",
  referente: "Nome e cognome",
  email: "Email",
  partita_iva: "Partita IVA",
  social: "Pagine social",
  ricontatto: "Come contattarti",
  consenso: "Privacy",
};

const testoDi = (lista: readonly { id: string; testo: string }[], id: string) => lista.find((o) => o.id === id)?.testo ?? id;

/** Testo leggibile di una risposta, per il riepilogo. */
export function formattaRisposta(d: Domanda, r: Risposte): string {
  const v = (r as Record<string, unknown>)[d.id];
  if (v === undefined) return "—";
  switch (d.id) {
    case "mestiere": {
      const m = r.mestiere!;
      return m.altro ? `${testoDi(MESTIERI, m.id)}: ${m.altro}` : testoDi(MESTIERI, m.id);
    }
    case "lavori": {
      const l = r.lavori!;
      const lista = [...(LAVORI[r.mestiere?.id ?? "altro"] ?? []), ALTRO_LAVORO];
      return l.ids.map((id) => (id === "altro" && l.altro ? l.altro : testoDi(lista, id))).join(", ");
    }
    case "nome_sito":
      return `${r.nome_sito!.nome}.it`;
    case "sede": {
      const s = r.sede!;
      return `${s.via}${s.senzaCivico ? " (senza numero civico)" : ""}, ${s.cap ? `${s.cap} ` : ""}${s.comune}${s.provincia ? ` (${s.provincia})` : ""}`;
    }
    case "zone":
      return r.zone!.join(", ");
    case "esperienza_anni":
      return testoDi(ANNI, (v as { id: string }).id ?? String(v));
    case "sito_attuale":
      return r.sito_attuale ? r.sito_attuale : "No";
    case "telefono":
      return formattaTelefono(r.telefono!);
    case "punti_di_forza": {
      const p = r.punti_di_forza!;
      return p.ids
        .map((id) => (id === "altro" && p.altro ? p.altro : id === "certificazioni" && p.certificazioni ? `Certificazioni: ${p.certificazioni}` : testoDi(PUNTI_DI_FORZA, id)))
        .join(", ");
    }
    case "clienti": {
      const c = r.clienti!;
      return c.ids.map((id) => (id === "altro" && c.altro ? c.altro : testoDi(CLIENTI, id))).join(", ");
    }
    case "stile":
      return r.stile!.map((id) => testoDi(STILI, id)).join(" + ");
    case "colori": {
      const c = r.colori!;
      if (c.nessuno) return "Scegliete voi";
      const nomi = c.ids.map((id) => testoDi(COLORI, id));
      return [...nomi, c.testo].filter(Boolean).join(", ") || "—";
    }
    case "partita_iva":
      return r.partita_iva!.valore + (r.partita_iva!.daVerificare ? " (da controllare)" : "");
    case "social": {
      const s = r.social!;
      return [s.facebook, s.instagram, s.tiktok].filter(Boolean).join(" · ") || "—";
    }
    case "ricontatto":
      return testoDi(CONTATTO, (v as { id: string }).id ?? String(v));
    case "consenso":
      return "Informativa letta";
    default:
      return typeof v === "string" ? v : JSON.stringify(v);
  }
}

export interface ArgomentiRiepilogo {
  risposte: Risposte;
  confermate: string[];
  /** Vai alla domanda (indice nel form) per modificarla, poi torna qui. */
  modifica: (indice: number) => void;
  invia: () => void;
  puoIndietro: boolean;
  indietro: () => void;
}

export interface RiepilogoMontato {
  el: HTMLElement;
  btnInvia: HTMLButtonElement;
  mostraEsito(esito: Esito | null, extra?: Azione[]): void;
}

export function montaRiepilogo(a: ArgomentiRiepilogo): RiepilogoMontato {
  const gruppi = SEZIONI.map((s) => {
    const righe = DOMANDE.filter((d) => d.sezione === s.n && a.confermate.includes(d.id) && d.id !== "consenso" && d.id !== "foto" && d.id !== "logo");
    if (righe.length === 0) return null;
    return h(
      "section",
      { class: "riepilogo__sezione" },
      h("h2", { class: "riepilogo__titolo" }, s.nome),
      h(
        "dl",
        { class: "riepilogo__lista" },
        ...righe.flatMap((d) => [
          h(
            "div",
            { class: "riepilogo__riga" },
            h("dt", {}, ETICHETTE[d.id] ?? d.testo),
            h("dd", {}, formattaRisposta(d, a.risposte)),
            h(
              "button",
              { class: "btn btn--ghost btn--sm riepilogo__modifica", type: "button", "aria-label": `Modifica: ${ETICHETTE[d.id] ?? d.testo}`, onclick: () => a.modifica(DOMANDE.indexOf(d)) },
              svgIcona("matita"),
              "Modifica",
            ),
          ),
        ]),
      ),
    );
  });
  const slot = h("div", { class: "passo__esito", "aria-live": "assertive" });
  const btnInvia = h("button", { class: "btn btn--primario btn--blocco btn--invia", type: "button" }, "Voglio vedere il mio sito", svgIcona("destra"));
  const btnIndietro = h("button", { class: "btn btn--ghost", type: "button", hidden: !a.puoIndietro, onclick: a.indietro }, svgIcona("sinistra"), "Indietro");
  btnInvia.addEventListener("click", a.invia);
  const el = h(
    "section",
    { class: "passo passo--riepilogo", "data-passo": "riepilogo", "aria-labelledby": "domanda" },
    h("p", { class: "passo__sezione" }, "Per finire"),
    h("h1", { class: "passo__titolo", id: "domanda", tabindex: "-1" }, "Controlla le tue risposte"),
    h("p", { class: "passo__aiuto" }, "Tocca «Modifica» se vuoi cambiare qualcosa. Poi chiedi il tuo sito: lo prepariamo in 48 ore."),
    h("div", { class: "passo__campo riepilogo" }, ...gruppi.filter((g): g is HTMLElement => g !== null)),
    slot,
    h("footer", { class: "passo__azioni passo__azioni--colonna" }, btnInvia, btnIndietro),
  );
  return {
    el,
    btnInvia,
    mostraEsito: (esito, extra = []) => {
      slot.replaceChildren();
      if (!esito || esito.ok) return;
      const azioni = [...(esito.azioni ?? []), ...extra];
      slot.append(
        h(
          "div",
          { class: `avviso is-nuovo ${esito.livello === "blocco" ? "avviso--errore" : "avviso--attenzione"}`, role: "alert" },
          svgIcona("attenzione"),
          h("div", {}, h("p", {}, esito.messaggio), azioni.length ? h("div", { class: "avviso__azioni" }, ...azioni.map((az) => h("button", { class: "btn btn--sm", type: "button", onclick: az.esegui }, az.testo))) : null),
        ),
      );
    },
  };
}
