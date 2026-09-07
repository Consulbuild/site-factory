/**
 * «Mostraci i tuoi lavori»: fino a 15 foto in qualità originale, scelte dalla
 * galleria (o scattate), caricate in background dalla coda (lib/upload.ts) mentre
 * il lead continua. Griglia di miniature con barra per foto, «×» per togliere,
 * «Riprova» se una non è arrivata. Mai bloccante: senza foto si va avanti.
 */
import { ispeziona, miniatura } from "../lib/immagini";
import type { CodaUpload, VoceUpload } from "../lib/upload";
import { OK, avviso, h, svgIcona, type ArgomentiComponente, type Componente } from "./base";

const MAX_FOTO = 15;
const MAX_BYTES = 25 * 1024 * 1024;
const MIN_LATO = 1200;
// Mai `image/*`: su iPhone farebbe arrivare HEIC invece di JPEG (docs storage §2, regola 1).
const ACCETTA = "image/jpeg,image/png,image/webp";

function formattaMB(b: number): string {
  return `${(b / 1024 / 1024).toFixed(b >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function creaFoto({ coda }: ArgomentiComponente): Componente<number> {
  if (!coda) throw new Error("creaFoto: manca la coda di caricamento");
  const input = h("input", { type: "file", accept: ACCETTA, multiple: true, class: "sr-only", id: "foto-input" });
  const scatta = h("input", { type: "file", accept: ACCETTA, capture: "environment", class: "sr-only", id: "foto-scatta" });
  const griglia = h("div", { class: "foto-griglia", role: "list", "aria-label": "Foto scelte" });
  const contatore = h("p", { class: "foto-contatore", "aria-live": "polite" });
  const messaggi = h("div", { class: "foto-messaggi", "aria-live": "polite" });
  const piccole = new Set<number>();

  const messaggio = (testo: string) => {
    const m = h("p", { class: "avviso avviso--attenzione is-nuovo" }, svgIcona("attenzione"), h("span", {}, testo));
    messaggi.replaceChildren(m);
  };

  const rendi = () => {
    const foto = coda.di("foto");
    griglia.replaceChildren(
      ...foto.map((v) =>
        h(
          "figure",
          { class: `foto-voce is-${v.stato}`, role: "listitem", "data-n": v.n },
          v.miniatura
            ? h("img", { src: v.miniatura, alt: "", class: "foto-voce__img" })
            : h("span", { class: "foto-voce__segnaposto", "aria-hidden": "true" }, svgIcona("immagine")),
          h("span", { class: "foto-voce__barra", "aria-hidden": "true" }, h("span", { class: "foto-voce__riempi", style: `--p: ${v.stato === "fatto" ? 1 : v.frazione}` })),
          h("figcaption", { class: "sr-only" }, `${v.nome}, ${v.stato === "fatto" ? "caricata" : v.stato === "errore" ? "non caricata" : "in caricamento"}`),
          v.stato === "fatto" ? h("span", { class: "foto-voce__ok", "aria-hidden": "true" }, svgIcona("spunta")) : null,
          v.stato === "errore"
            ? h("button", { class: "foto-voce__riprova", type: "button", "aria-label": `Riprova a caricare ${v.nome}`, onclick: () => coda.riprova(v) }, "Riprova")
            : null,
          piccole.has(v.n) ? h("span", { class: "foto-voce__nota" }, "Piccola") : null,
          h("button", { class: "foto-voce__togli", type: "button", "aria-label": `Togli ${v.nome}`, onclick: () => coda.rimuovi(v) }, svgIcona("x")),
        ),
      ),
    );
    const fatte = foto.filter((v) => v.stato === "fatto").length;
    const errori = foto.filter((v) => v.stato === "errore").length;
    contatore.textContent =
      foto.length === 0
        ? ""
        : `${foto.length} di ${MAX_FOTO} foto · ${fatte} ${fatte === 1 ? "caricata" : "caricate"}${errori ? ` · ${errori} non ${errori === 1 ? "caricata" : "caricate"}` : ""}`;
    griglia.hidden = foto.length === 0;
  };
  const stacca = coda.onCambio(rendi);

  const aggiungiFile = async (files: FileList | null) => {
    if (!files) return;
    messaggi.replaceChildren();
    const posto = MAX_FOTO - coda.di("foto").length;
    const lista = [...files];
    if (lista.length > posto) messaggio(`Massimo ${MAX_FOTO} foto: ne ho tenute ${Math.max(posto, 0)}. Tieni le migliori.`);
    for (const file of lista.slice(0, Math.max(posto, 0))) {
      if (!file.type.startsWith("image/")) {
        messaggio(`«${file.name}» non è una foto: scegli un'immagine.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        messaggio(`«${file.name}» pesa ${formattaMB(file.size)}: il massimo è 25 MB per foto.`);
        continue;
      }
      if (coda.doppione(file)) continue; // stessa foto due volte: la seconda non si aggiunge
      const info = await ispeziona(file);
      if (info.heic) {
        messaggio(`«${file.name}» è in formato HEIC: scattala o esportala in JPEG e ricaricala.`);
        continue;
      }
      const url = await miniatura(file); // una per volta: la memoria del telefono ringrazia
      const voce: VoceUpload = coda.aggiungi("foto", file, url);
      if (info.larghezza && info.altezza && Math.max(info.larghezza, info.altezza) < MIN_LATO) {
        piccole.add(voce.n);
        messaggio("Una foto è piccola: se hai l'originale, meglio quello. Puoi tenerla lo stesso.");
        rendi();
      }
    }
  };
  input.addEventListener("change", () => {
    void aggiungiFile(input.files);
    input.value = "";
  });
  scatta.addEventListener("change", () => {
    void aggiungiFile(scatta.files);
    scatta.value = "";
  });

  const el = h(
    "div",
    { class: "campo-gruppo foto" },
    h(
      "div",
      { class: "foto-azioni" },
      input,
      h("label", { class: "btn btn--primario btn--blocco", for: "foto-input" }, svgIcona("immagine"), "Scegli le foto"),
      scatta,
      h("label", { class: "btn btn--secondario btn--blocco foto-azioni__scatta", for: "foto-scatta" }, svgIcona("fotocamera"), "Scatta una foto"),
    ),
    h("p", { class: "campo__aiuto" }, "Le foto si caricano da sole mentre continui."),
    contatore,
    griglia,
    messaggi,
  );
  rendi();

  let avvisoZeroMostrato = false;
  return {
    el,
    focus: () => el.querySelector<HTMLElement>("label.btn")?.focus(),
    leggi: () => coda.di("foto").length,
    valida: (forza) => {
      const foto = coda.di("foto");
      const errori = coda.inErrore.filter((v) => v.kind === "foto");
      if (errori.length && !forza) {
        return avviso(`${errori.length === 1 ? "Una foto non si è caricata" : `${errori.length} foto non si sono caricate`}: tocca «Riprova» oppure toglile.`, [
          { testo: "Riprova tutte", esegui: () => errori.forEach((v) => coda.riprova(v)) },
        ]);
      }
      if (foto.length === 0 && !forza && !avvisoZeroMostrato) {
        avvisoZeroMostrato = true;
        return avviso("Senza foto, sul sito non ci sarà la parte «I nostri lavori». Puoi mandarcele anche dopo.");
      }
      return OK;
    },
    distruggi: () => stacca(),
  };
}
