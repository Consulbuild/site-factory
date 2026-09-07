/**
 * Orchestratore del motion (tempi e curve in tokens.css, forme in motion.css).
 * - transizione(): il sipario copre la card, sotto si scambia il passo, il nuovo
 *   passo entra a scaglioni. Con prefers-reduced-motion: solo dissolvenza.
 * - scuoti(): scossa breve su un elemento che ha un errore.
 * Tutto interrompibile: una nuova transizione mentre una è in corso la sostituisce.
 */
import { riduciMotion } from "./a11y";

const durata = (nome: string): number => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return v.endsWith("ms") ? parseFloat(v) : v.endsWith("s") ? parseFloat(v) * 1000 : 0;
};

const attendi = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Assegna --i ai figli diretti: è l'indice dello scaglione nell'ingresso. */
export function scaglioni(passo: HTMLElement): void {
  [...passo.children].forEach((figlio, i) => (figlio as HTMLElement).style.setProperty("--i", String(i)));
}

let inCorso = 0;

export async function transizione(
  direzione: "avanti" | "indietro",
  stage: HTMLElement,
  sipario: HTMLElement,
  monta: () => HTMLElement,
): Promise<HTMLElement> {
  const mia = ++inCorso;
  const ridotto = riduciMotion() || durata("--d-wipe") === 0;

  if (ridotto) {
    const vecchio = stage.firstElementChild as HTMLElement | null;
    if (vecchio) {
      vecchio.style.transition = `opacity ${durata("--d-fast")}ms`;
      vecchio.style.opacity = "0";
      await attendi(durata("--d-fast"));
    }
    if (mia !== inCorso) return stage.firstElementChild as HTMLElement;
    const nuovo = monta();
    scaglioni(nuovo);
    stage.replaceChildren(nuovo);
    nuovo.classList.add("is-entrata");
    return nuovo;
  }

  // 1. il sipario entra dal lato giusto e copre la card
  sipario.style.transition = "none";
  sipario.classList.remove("is-chiuso", "is-uscita");
  sipario.classList.toggle("is-indietro", direzione === "indietro");
  void sipario.offsetWidth; // reflow: la posizione di partenza si applica senza transizione
  sipario.style.transition = "";
  sipario.classList.add("is-chiuso");
  await attendi(durata("--d-wipe") + 20);
  if (mia !== inCorso) return stage.firstElementChild as HTMLElement;

  // 2. sotto il sipario si scambia il passo (il sipario è bianco come la card: nessun salto)
  const nuovo = monta();
  scaglioni(nuovo);
  stage.replaceChildren(nuovo);

  // 3. il sipario sparisce in dissolvenza e il nuovo passo entra a scaglioni.
  //    Da qui il passo è già usabile: la coda non blocca i tocchi (un «Continua»
  //    rapido non va perso). Se nel frattempo parte un'altra transizione, la
  //    pulizia la fa lei (controllo su `mia`).
  sipario.classList.add("is-uscita");
  nuovo.classList.add("is-entrata");
  void attendi(durata("--d-fast") + 10).then(() => {
    if (mia !== inCorso) return;
    sipario.style.transition = "none";
    sipario.classList.remove("is-chiuso", "is-uscita", "is-indietro");
    void sipario.offsetWidth;
    sipario.style.transition = "";
  });
  return nuovo;
}

export function scuoti(el: HTMLElement): void {
  el.classList.remove("is-scossa");
  void el.offsetWidth;
  el.classList.add("is-scossa");
  el.addEventListener("animationend", () => el.classList.remove("is-scossa"), { once: true });
}
