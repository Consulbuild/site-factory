/**
 * Orari: «Quando lavori?» e «Quando rispondi al telefono?».
 * Lo strumento è quello della scheda Google e di Apple Business Connect, ridotto
 * all'essenziale per un telefono: chip dei giorni, una riga per giorno selezionato
 * (dalle / alle, «+ pausa» per la seconda fascia), un solo bottone «Usa questi orari
 * per tutti i giorni» sotto la prima riga completa, e la conferma in chiaro sotto.
 * Gli orari si scrivono con l'input nativo dell'ora (rotella di sistema sul telefono).
 */
import { formattaOrari, giudicaOrari, GIORNI, NOME_GIORNO, SIGLA_GIORNO, type Fascia, type Giorno, type Orari, type OrariTelefono } from "../lib/orari";
import { OK, blocco, h, svgIcona, type ArgomentiComponente, type Componente, type Esito } from "./base";

const GIORNI_DEFAULT: readonly Giorno[] = ["lun", "mar", "mer", "gio", "ven"];

interface Strumento {
  el: HTMLElement;
  focus(): void;
  leggi(): Orari;
  valida(): Esito;
}

const campoOra = (etichetta: string, ariaLabel: string, valore: string): { el: HTMLElement; input: HTMLInputElement } => {
  const input = h("input", { type: "time", class: "campo__input orari__ora", "aria-label": ariaLabel, value: valore, step: 300 });
  return { el: h("label", { class: "orari__campo" }, h("span", {}, etichetta), input), input };
};

/** Chip dei giorni + righe per giorno + copia + conferma. `iniziale` vuoto → giorni di default senza orari. */
function creaStrumento(iniziale: Orari | undefined): Strumento {
  const attivi = new Set<Giorno>(iniziale ? (Object.keys(iniziale) as Giorno[]) : GIORNI_DEFAULT);

  const chip = (g: Giorno) =>
    h(
      "label",
      { class: "scelta" },
      h("input", { class: "scelta__input", type: "checkbox", name: "giorni", value: g, checked: attivi.has(g), "aria-label": NOME_GIORNO[g] }),
      h("span", { class: "scelta__testo" }, SIGLA_GIORNO[g]),
    );
  const giorni = h("div", { class: "scelte scelte--chip orari__giorni", role: "group", "aria-label": "Giorni" }, ...GIORNI.map(chip));

  interface Riga {
    el: HTMLElement;
    g: Giorno;
    f1: [HTMLInputElement, HTMLInputElement];
    f2: [HTMLInputElement, HTMLInputElement];
    fascia2: HTMLElement;
    pausa: HTMLButtonElement;
  }
  const righe: Riga[] = GIORNI.map((g) => {
    const nome = NOME_GIORNO[g];
    const v = iniziale?.[g] ?? [];
    const a = campoOra("Dalle", `${nome}, dalle`, v[0]?.dalle ?? "");
    const b = campoOra("Alle", `${nome}, alle`, v[0]?.alle ?? "");
    const c = campoOra("e dalle", `${nome}, seconda fascia dalle`, v[1]?.dalle ?? "");
    const d = campoOra("alle", `${nome}, seconda fascia alle`, v[1]?.alle ?? "");
    const fascia2 = h("div", { class: "orari__fascia orari__fascia--2", hidden: !v[1] }, c.el, d.el);
    const pausa = h("button", { class: "orari__pausa", type: "button", "aria-pressed": v[1] ? "true" : "false", "aria-label": `${nome}: pausa in mezzo` }, "+ pausa");
    const el = h(
      "div",
      { class: "orari__riga", "data-giorno": g, hidden: !attivi.has(g) },
      h("span", { class: "orari__giorno" }, nome),
      pausa,
      h("div", { class: "orari__fascia" }, a.el, b.el),
      fascia2,
    );
    return { el, g, f1: [a.input, b.input], f2: [c.input, d.input], fascia2, pausa };
  });
  const copia = h("button", { class: "btn btn--secondario btn--sm btn--blocco orari__copia", type: "button", hidden: true }, "Usa questi orari per tutti i giorni");
  const conferma = h("p", { class: "conferma", "aria-live": "polite", hidden: true });
  const lista = h("div", { class: "orari__righe" }, ...righe.map((r) => r.el));
  const el = h("div", { class: "campo-gruppo orari" }, giorni, lista, copia, conferma);

  const conPausa = (r: Riga) => r.pausa.getAttribute("aria-pressed") === "true";
  const fasceDi = (r: Riga): Fascia[] => {
    const f: Fascia[] = [{ dalle: r.f1[0].value, alle: r.f1[1].value }];
    if (conPausa(r)) f.push({ dalle: r.f2[0].value, alle: r.f2[1].value });
    return f;
  };
  const visibili = () => righe.filter((r) => !r.el.hidden);
  const leggi = (): Orari => Object.fromEntries(visibili().map((r) => [r.g, fasceDi(r)])) as Orari;
  const completa = (r: Riga) => fasceDi(r).every((f) => f.dalle && f.alle);

  const aggiorna = () => {
    // Il bottone «copia» sta sotto la prima riga visibile, e solo quando quella è completa e ci sono altre righe.
    const v = visibili();
    const prima = v[0];
    copia.hidden = !(prima && completa(prima) && v.length > 1);
    if (prima) prima.el.after(copia);
    const g = giudicaOrari(leggi());
    conferma.hidden = !g.ok;
    if (g.ok) conferma.replaceChildren(h("span", { class: "conferma__eti" }, "Orari: "), h("strong", {}, formattaOrari(leggi())));
  };

  giorni.addEventListener("change", (e) => {
    const inp = e.target as HTMLInputElement;
    const r = righe.find((x) => x.g === inp.value);
    if (r) r.el.hidden = !inp.checked;
    aggiorna();
  });
  lista.addEventListener("input", aggiorna);
  for (const r of righe) {
    r.pausa.addEventListener("click", () => {
      const on = !conPausa(r);
      r.pausa.setAttribute("aria-pressed", String(on));
      r.pausa.textContent = on ? "senza pausa" : "+ pausa";
      r.fascia2.hidden = !on;
      if (on) r.f2[0].focus();
      aggiorna();
    });
    if (conPausa(r)) r.pausa.textContent = "senza pausa";
  }
  copia.addEventListener("click", () => {
    const [prima, ...altre] = visibili();
    if (!prima) return;
    const [f1, f2] = fasceDi(prima);
    for (const r of altre) {
      r.f1[0].value = f1?.dalle ?? "";
      r.f1[1].value = f1?.alle ?? "";
      const on = !!f2;
      r.pausa.setAttribute("aria-pressed", String(on));
      r.pausa.textContent = on ? "senza pausa" : "+ pausa";
      r.fascia2.hidden = !on;
      r.f2[0].value = f2?.dalle ?? "";
      r.f2[1].value = f2?.alle ?? "";
    }
    aggiorna();
    conferma.focus?.();
  });
  aggiorna();

  return {
    el,
    focus: () => (visibili()[0]?.f1[0] ?? giorni.querySelector<HTMLInputElement>(".scelta__input"))?.focus(),
    leggi,
    valida: () => {
      const g = giudicaOrari(leggi());
      return g.ok ? OK : { ok: false, livello: g.livello, messaggio: g.messaggio };
    },
  };
}

// ---------- «Quando lavori?» ----------
export function creaOrariLavoro({ valore }: ArgomentiComponente<Orari>): Componente<Orari> {
  const s = creaStrumento(valore);
  return {
    el: s.el,
    focus: s.focus,
    leggi: () => (Object.keys(s.leggi()).length ? s.leggi() : undefined),
    valida: (forza) => {
      const e = s.valida();
      return !e.ok && e.livello === "avviso" && forza ? OK : e;
    },
  };
}

// ---------- «Quando rispondi al telefono?» ----------
const MODI: { id: OrariTelefono["come"]; testo: string; nota?: string }[] = [
  { id: "lavoro", testo: "Negli stessi orari di lavoro" },
  { id: "diversi", testo: "In orari diversi", nota: "Per esempio anche la sera o il sabato" },
  { id: "h24", testo: "Sempre, 24 ore su 24", nota: "Pronto intervento: anche di notte e nei festivi" },
];

export function creaOrariTelefono({ risposte, valore }: ArgomentiComponente<OrariTelefono>): Componente<OrariTelefono> {
  const scelte = h(
    "div",
    { class: "scelte scelte--righe", role: "radiogroup", "aria-labelledby": "domanda" },
    ...MODI.map((m) =>
      h(
        "label",
        { class: "scelta" },
        h("input", { class: "scelta__input", type: "radio", name: "orari_telefono", value: m.id, checked: valore?.come === m.id }),
        h("span", { class: "scelta__testo" }, m.testo, m.nota ? h("span", { class: "scelta__nota" }, m.nota) : null),
        h("span", { class: "scelta__spunta", "aria-hidden": "true" }, svgIcona("spunta")),
      ),
    ),
  );
  // «In orari diversi»: lo stesso strumento, già riempito con gli orari di lavoro (si allunga solo dove serve).
  const strumento = creaStrumento(valore?.come === "diversi" ? valore.orari : risposte.orari_lavoro);
  strumento.el.hidden = valore?.come !== "diversi";
  const scelto = () => scelte.querySelector<HTMLInputElement>(".scelta__input:checked")?.value as OrariTelefono["come"] | undefined;
  scelte.addEventListener("change", () => {
    strumento.el.hidden = scelto() !== "diversi";
    if (!strumento.el.hidden) strumento.focus();
  });
  const el = h("div", { class: "campo-gruppo" }, scelte, strumento.el);
  return {
    el,
    focus: () => scelte.querySelector<HTMLInputElement>(".scelta__input")?.focus(),
    leggi: () => {
      const come = scelto();
      if (!come) return undefined;
      return come === "diversi" ? { come, orari: strumento.leggi() } : { come };
    },
    valida: (forza) => {
      const come = scelto();
      if (!come) return blocco("Per andare avanti ci serve una risposta: tocca quella giusta per te.");
      if (come !== "diversi") return OK;
      const e = strumento.valida();
      return !e.ok && e.livello === "avviso" && forza ? OK : e;
    },
  };
}
