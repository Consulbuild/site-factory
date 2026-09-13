/**
 * Orchestratore del motion (tempi e curve in tokens.css, forme in motion.css).
 * - transizione(): cambio passo «a sequenza». I figli del passo che se ne va escono in
 *   onda (verso l'alto andando avanti, verso il basso tornando indietro); il nuovo passo
 *   si monta subito e i suoi figli entrano dal lato opposto a scaglioni (is-entrata,
 *   motion.css); l'altezza dello stage si interpola dalla vecchia alla nuova. Uscita e
 *   altezza con Web Animations API (la pulizia aspetta `finished`, niente tempi a mano);
 *   ingresso in CSS, così vale anche per il primo paint. Con prefers-reduced-motion:
 *   solo dissolvenza del nuovo passo.
 * - scuoti(): scossa breve su un elemento che ha un errore.
 * Interrompibile: un nuovo cambio durante l'ingresso funziona, perché le animazioni
 * d'uscita (script) prevalgono su quelle CSS d'ingresso ancora in corso.
 */
import { riduciMotion } from "./a11y";

const token = (nome: string): string => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
const durata = (nome: string): number => {
  const v = token(nome);
  return v.endsWith("ms") ? parseFloat(v) : v.endsWith("s") ? parseFloat(v) * 1000 : 0;
};

const attendi = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Assegna --i ai figli diretti: è l'indice dello scaglione nell'ingresso. */
export function scaglioni(passo: HTMLElement): void {
  [...passo.children].forEach((figlio, i) => (figlio as HTMLElement).style.setProperty("--i", String(i)));
}

/** Dal sesto figlio in poi niente scaglione (il riepilogo ne ha molti): stesso limite di motion.css. */
const MAX_SCAGLIONE = 5;

export async function transizione(
  direzione: "avanti" | "indietro",
  stage: HTMLElement,
  monta: () => HTMLElement,
): Promise<HTMLElement> {
  // Il passo corrente è quello in flusso: un cambio rapido può trovare ancora in scena
  // l'onda d'uscita del passo precedente (is-uscita), che si pulisce da sola.
  const vecchio = stage.querySelector<HTMLElement>(".passo:not(.is-uscita)");
  const h0 = stage.offsetHeight;
  const nuovo = monta();
  scaglioni(nuovo);
  nuovo.classList.toggle("is-indietro", direzione === "indietro");
  if (vecchio) {
    // Fuori flusso sopra il nuovo, ma solo come immagine: niente focus, niente lettori di
    // schermo, e l'id «domanda» (unico nella pagina) passa subito al nuovo titolo.
    vecchio.classList.add("is-uscita");
    vecchio.setAttribute("aria-hidden", "true");
    vecchio.setAttribute("inert", "");
    vecchio.querySelector("#domanda")?.removeAttribute("id");
  }
  stage.append(nuovo);
  nuovo.classList.add("is-entrata");
  if (!vecchio) return nuovo;

  const ridotto = riduciMotion() || durata("--d-exit") === 0;
  if (ridotto) {
    vecchio.remove();
    return nuovo;
  }

  const h1 = stage.offsetHeight;
  if (h1 !== h0) {
    const altezza = stage.animate([{ height: `${h0}px` }, { height: `${h1}px` }], {
      duration: durata("--d-enter"),
      easing: token("--e-standard"),
      fill: "both",
    });
    altezza.finished.then(() => altezza.cancel()).catch(() => {});
  }
  const verso = direzione === "avanti" ? -16 : 16;
  const uscite = [...vecchio.children].map((figlio, i) =>
    figlio.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${verso}px)` }], {
      duration: durata("--d-exit"),
      delay: Math.min(i, MAX_SCAGLIONE) * durata("--stagger-out"),
      easing: token("--e-accel"),
      fill: "forwards",
    }),
  );
  // Il nuovo passo è già usabile: un «Continua» rapido non va perso. Il vecchio si toglie
  // da solo a onda finita.
  void Promise.allSettled(uscite.map((a) => a.finished)).then(() => vecchio.remove());
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
