/**
 * Campi a una riga: testo generico (nome azienda, referente), telefono, email.
 * La validazione vera sta in lib/validators.ts; qui solo DOM e stato visivo.
 */
import { formattaTelefono, giudicaAzienda, giudicaEmail, giudicaReferente, giudicaTelefono, normalizzaTelefono, type Giudizio } from "../lib/validators";
import { OK, avviso, blocco, campoTesto, type ArgomentiComponente, type Componente } from "./base";

/** Traduce un Giudizio dei validators in un Esito del componente. */
function esitoDa(g: Giudizio) {
  return g.ok ? OK : g.livello === "blocco" ? blocco(g.messaggio) : avviso(g.messaggio);
}

export function creaTesto({ domanda, valore }: ArgomentiComponente<string>): Componente<string> {
  const giudica = domanda.id === "referente" ? giudicaReferente : domanda.id === "azienda" ? giudicaAzienda : null;
  const c = campoTesto({
    etichetta: domanda.testo,
    facoltativo: !domanda.obbligatoria,
    placeholder: domanda.placeholder,
    autocomplete: domanda.autocomplete,
    valore,
    maxlength: 120,
    nome: domanda.id,
  });
  c.el.querySelector(".campo__etichetta")?.classList.add("sr-only"); // la domanda è già l'h1
  c.input.addEventListener("input", () => c.errore(false));
  return {
    el: c.el,
    focus: () => c.input.focus(),
    leggi: () => c.input.value.replace(/\s+/g, " ").trim() || undefined,
    valida: (forza) => {
      const v = c.input.value;
      if (giudica) {
        const g = giudica(v);
        if (!g.ok && g.livello === "avviso" && forza) return OK;
        c.errore(!g.ok && g.livello === "blocco");
        return esitoDa(g);
      }
      if (domanda.obbligatoria && !v.trim()) {
        c.errore(true);
        return blocco("Serve una risposta per andare avanti.");
      }
      return OK;
    },
  };
}

export function creaTelefono({ domanda, valore }: ArgomentiComponente<string>): Componente<string> {
  const c = campoTesto({
    etichetta: domanda.testo,
    tipo: "tel",
    inputmode: "tel",
    autocomplete: "tel-national",
    prefisso: "+39",
    placeholder: "388 893 7188",
    valore: valore ? formattaTelefono(valore).replace(/^\+39 /, "") : "",
    conSpunta: true,
    nome: "telefono",
    maxlength: 20,
  });
  c.el.querySelector(".campo__etichetta")?.classList.add("sr-only");
  const aggiorna = () => {
    const g = giudicaTelefono(c.input.value);
    c.ok(g.ok);
    c.errore(false);
  };
  c.input.addEventListener("input", aggiorna);
  c.input.addEventListener("blur", () => {
    const g = giudicaTelefono(c.input.value);
    if (g.ok) c.input.value = formattaTelefono(g.valore).replace(/^\+39 /, "");
  });
  aggiorna();
  return {
    el: c.el,
    focus: () => c.input.focus(),
    leggi: () => normalizzaTelefono(c.input.value) || undefined,
    valida: (forza) => {
      const g = giudicaTelefono(c.input.value);
      if (g.ok) return OK;
      if (g.livello === "avviso" && forza) return OK;
      c.errore(g.livello === "blocco");
      return esitoDa(g);
    },
  };
}

export function creaEmail({ domanda, valore }: ArgomentiComponente<string>): Componente<string> {
  const c = campoTesto({
    etichetta: domanda.testo,
    tipo: "email",
    inputmode: "email",
    autocomplete: "email",
    placeholder: "nome@azienda.it",
    valore,
    conSpunta: true,
    nome: "email",
    maxlength: 120,
  });
  c.el.querySelector(".campo__etichetta")?.classList.add("sr-only");
  const aggiorna = () => {
    const g = giudicaEmail(c.input.value);
    c.ok(g.ok);
    c.errore(false);
  };
  c.input.addEventListener("input", aggiorna);
  aggiorna();
  return {
    el: c.el,
    focus: () => c.input.focus(),
    leggi: () => c.input.value.replace(/\s+/g, "").toLowerCase() || undefined,
    valida: (forza) => {
      const g = giudicaEmail(c.input.value);
      if (g.ok) return OK;
      if (g.livello === "avviso" && forza) return OK;
      c.errore(g.livello === "blocco");
      // «Forse intendevi …?» → un tocco corregge
      const proposta = /^Forse intendevi (.+)\?$/.exec(g.messaggio)?.[1];
      if (proposta) {
        return avviso(g.messaggio, [
          {
            testo: `Sì, usa ${proposta}`,
            esegui: () => {
              c.input.value = proposta;
              aggiorna();
            },
          },
        ]);
      }
      return esitoDa(g);
    },
  };
}
