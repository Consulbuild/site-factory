/** Partita IVA: 11 numeri, controllo della cifra di verifica, mai un blocco senza uscita. */
import { checksumPiva, giudicaPiva, normalizzaPiva } from "../lib/validators";
import { OK, avviso, blocco, campoTesto, type ArgomentiComponente, type Componente } from "./base";

interface ValorePiva {
  valore: string;
  daVerificare?: boolean;
}

export function creaPiva({ domanda, valore }: ArgomentiComponente<ValorePiva>): Componente<ValorePiva> {
  const c = campoTesto({
    etichetta: domanda.testo,
    inputmode: "numeric",
    placeholder: "12345678901",
    valore: valore?.valore,
    conSpunta: true,
    maxlength: 20,
    nome: "partita_iva",
  });
  c.el.querySelector(".campo__etichetta")?.classList.add("sr-only");
  const aggiorna = () => {
    c.ok(giudicaPiva(c.input.value).ok);
    c.errore(false);
  };
  c.input.addEventListener("input", aggiorna);
  aggiorna();
  return {
    el: c.el,
    focus: () => c.input.focus(),
    leggi: () => {
      const p = normalizzaPiva(c.input.value);
      if (!p) return undefined;
      return checksumPiva(p) ? { valore: p } : { valore: p, daVerificare: true };
    },
    valida: (forza) => {
      const g = giudicaPiva(c.input.value);
      if (g.ok) return OK;
      if (g.livello === "blocco") {
        c.errore(true);
        return blocco(g.messaggio);
      }
      return forza ? OK : avviso(g.messaggio);
    },
  };
}
