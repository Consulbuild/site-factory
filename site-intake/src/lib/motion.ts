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

/** Il cerchio blu con la «C» del logo: usato nel pannello di attesa e nella rivelazione. */
const MARCHIO_SVG =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M42 24a12 12 0 1 0 0 16" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>';

export interface Attesa {
  aggiorna(testo: string, sotto: string, frazione: number): void;
  /** L'elemento del logo: centro della rivelazione. */
  logo: HTMLElement;
  chiudi(): void;
}

/**
 * Pannello di attesa (dal video: il bottone si espande in un pannello bianco con il
 * logo e le onde). Copre la card sopra il riepilogo mentre finiscono i caricamenti
 * e parte l'invio.
 */
export function mostraAttesa(card: HTMLElement): Attesa {
  const logo = document.createElement("div");
  logo.className = "attesa__logo";
  logo.innerHTML = MARCHIO_SVG;
  const onde = document.createElement("div");
  onde.className = "attesa__onde";
  onde.innerHTML = '<span class="onda"></span><span class="onda"></span><span class="onda"></span>';
  const testo = document.createElement("p");
  testo.className = "attesa__testo";
  const sotto = document.createElement("p");
  sotto.className = "attesa__sotto";
  const barra = document.createElement("div");
  barra.className = "attesa__barra";
  barra.innerHTML = '<span class="attesa__riempi"></span>';
  const riempi = barra.firstElementChild as HTMLElement;
  const el = document.createElement("div");
  el.className = "attesa";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  const centro = document.createElement("div");
  centro.className = "attesa__centro";
  centro.append(onde, logo);
  el.append(centro, testo, sotto, barra);
  card.append(el);
  // La card si accorcia dall'altezza del riepilogo a quella di un passo normale, animando
  // l'altezza (una sola volta, un solo elemento): il pannello «cresce» dal bottone.
  const da = card.offsetHeight;
  const a = Math.min(560, innerHeight - 24);
  card.style.height = `${da}px`;
  card.classList.add("is-attesa");
  window.scrollTo({ top: 0, behavior: riduciMotion() ? "auto" : "smooth" });
  void el.offsetWidth;
  el.classList.add("is-aperta");
  card.style.height = `${a}px`;
  return {
    logo,
    aggiorna(t, s, f) {
      testo.textContent = t;
      sotto.textContent = s;
      riempi.style.setProperty("--p", String(Math.max(0.04, Math.min(1, f))));
    },
    chiudi() {
      el.remove();
      card.classList.remove("is-attesa");
      card.style.height = "";
    },
  };
}

/**
 * Rivelazione: un cerchio blu parte dal logo e copre tutto lo schermo (dal video:
 * il «rovescio»). A metà, `alCulmine` cambia la pagina sotto (card blu, fondo chiaro,
 * schermata Fatto); poi il cerchio si dissolve. Con reduced-motion: solo il cambio.
 */
export async function rivelazione(origine: HTMLElement, alCulmine: () => void): Promise<void> {
  if (riduciMotion() || durata("--d-reveal") === 0) {
    alCulmine();
    return;
  }
  const r = origine.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const raggio = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
  const cerchio = document.createElement("div");
  cerchio.className = "rivelazione";
  cerchio.style.left = `${cx}px`;
  cerchio.style.top = `${cy}px`;
  cerchio.style.setProperty("--scala", String((raggio * 2) / 20 + 1));
  document.body.append(cerchio);
  void cerchio.offsetWidth;
  cerchio.classList.add("is-aperta");
  await attendi(durata("--d-reveal") + 30);
  alCulmine();
  await attendi(80);
  cerchio.classList.add("is-sparisce");
  await attendi(durata("--d-enter") + 30);
  cerchio.remove();
}

export function scuoti(el: HTMLElement): void {
  el.classList.remove("is-scossa");
  void el.offsetWidth;
  el.classList.add("is-scossa");
  el.addEventListener("animationend", () => el.classList.remove("is-scossa"), { once: true });
}
