/**
 * Sede: prima il comune (dall'elenco ufficiale: si trova sempre), poi via e numero
 * scritti a mano con conferma in chiaro. Pensato perché «non trovo il mio indirizzo»
 * non succeda mai: il comune arriva da 7.904 voci con tolleranza ai refusi, la via
 * è testo libero, e Avanti resta sempre attivo.
 */
import { cercaComuni, etichettaComune, trovaComune, type Comune } from "../lib/comuni";
import { pulisci } from "../lib/validators";
import { OK, avviso, blocco, campoTesto, h, type ArgomentiComponente, type Componente } from "./base";
import { attaccaSuggerimenti } from "./suggerimenti";

export interface ValoreSede {
  comune: string;
  provincia: string; // sigla
  provinciaNome?: string;
  regione: string;
  cap: string;
  via: string;
  senzaCivico?: boolean;
  daVerificare?: boolean;
}

export function creaSede({ valore }: ArgomentiComponente<ValoreSede>): Componente<ValoreSede> {
  let comune: Comune | null = valore
    ? { nome: valore.comune, sigla: valore.provincia, provincia: valore.provinciaNome ?? "", regione: valore.regione, cap: valore.cap, multiCap: !valore.cap }
    : null;
  let senzaCivico = valore?.senzaCivico ?? false;
  const perEtichetta = new Map<string, Comune>();

  const cComune = campoTesto({
    etichetta: "Comune",
    placeholder: "es. Cologno Monzese",
    autocomplete: "off",
    valore: comune ? etichettaComune(comune) : "",
    nome: "comune",
    maxlength: 80,
  });
  cComune.input.setAttribute("autocapitalize", "words");
  const cVia = campoTesto({
    etichetta: "Via e numero civico",
    placeholder: "es. Via Milano 89",
    autocomplete: "address-line1",
    valore: valore?.via ?? "",
    nome: "via",
    maxlength: 120,
  });
  cVia.input.setAttribute("autocapitalize", "words");
  const conferma = h("p", { class: "conferma", "aria-live": "polite" });

  const aggiornaConferma = () => {
    const via = pulisci(cVia.input.value);
    if (!comune || !via) {
      conferma.hidden = true;
      return;
    }
    const cap = comune.multiCap || !comune.cap ? "" : `${comune.cap} `;
    conferma.hidden = false;
    conferma.replaceChildren(
      h("span", { class: "conferma__eti" }, "Indirizzo: "),
      h("strong", {}, `${via}${senzaCivico ? " (senza numero civico)" : ""}, ${cap}${comune.nome} (${comune.sigla})`),
    );
  };

  attaccaSuggerimenti({
    input: cComune.input,
    cerca: async (q) => {
      const trovati = await cercaComuni(q);
      perEtichetta.clear();
      for (const c of trovati) perEtichetta.set(etichettaComune(c), c);
      return trovati.map(etichettaComune);
    },
    scegli: (testo) => {
      comune = perEtichetta.get(testo) ?? null;
      aggiornaConferma();
      cVia.input.focus();
    },
    cambiato: () => {
      comune = null;
      aggiornaConferma();
    },
  });
  // Chi scrive il comune senza toccare il suggerimento: lo cerchiamo noi all'uscita dal campo.
  cComune.input.addEventListener("blur", () => {
    if (comune) return;
    void trovaComune(cComune.input.value).then((c) => {
      if (c && !comune) {
        comune = c;
        cComune.input.value = etichettaComune(c);
        aggiornaConferma();
      }
    });
  });
  cVia.input.addEventListener("input", () => {
    senzaCivico = false;
    aggiornaConferma();
  });
  aggiornaConferma();

  const el = h("div", { class: "campo-gruppo" }, cComune.el, cVia.el, conferma);
  const via = () => pulisci(cVia.input.value);

  return {
    el,
    focus: () => cComune.input.focus(),
    leggi: () => {
      const v = via();
      const testoComune = pulisci(cComune.input.value);
      if (!testoComune || !v) return undefined;
      if (!comune) return { comune: testoComune, provincia: "", regione: "", cap: "", via: v, senzaCivico, daVerificare: true };
      return {
        comune: comune.nome,
        provincia: comune.sigla,
        provinciaNome: comune.provincia,
        regione: comune.regione,
        cap: comune.multiCap ? "" : comune.cap,
        via: v,
        senzaCivico: senzaCivico || undefined,
      };
    },
    valida: (forza) => {
      const testoComune = pulisci(cComune.input.value);
      if (!testoComune) {
        cComune.errore(true);
        return blocco("Scrivi il comune della sede.");
      }
      cComune.errore(false);
      if (!comune && !forza) {
        return avviso(`Non trovo «${testoComune}» nell'elenco dei comuni: controlla come è scritto, o tocca il suggerimento.`);
      }
      if (!via()) {
        cVia.errore(true);
        return blocco("Scrivi via e numero civico.");
      }
      cVia.errore(false);
      if (!/\d/.test(via()) && !senzaCivico && !forza) {
        return avviso("Manca il numero civico. Aggiungilo, oppure tocca «Non c'è il numero».", [
          {
            testo: "Non c'è il numero",
            esegui: () => {
              senzaCivico = true;
              aggiornaConferma();
              cVia.input.focus();
            },
          },
        ]);
      }
      return OK;
    },
  };
}
