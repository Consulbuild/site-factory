/**
 * Accessibilità del cambio passo: annuncio per screen reader e focus sul titolo.
 * Una sola regione aria-live (index.astro #annuncio), aggiornata a ogni passo.
 */
let regione: HTMLElement | null = null;

export function annuncia(testo: string): void {
  regione ??= document.getElementById("annuncio");
  if (!regione) return;
  regione.textContent = "";
  // Lo svuotamento e il nuovo testo in due tick: altrimenti alcuni lettori non rileggono lo stesso annuncio.
  requestAnimationFrame(() => {
    if (regione) regione.textContent = testo;
  });
}

/** Porta il focus sul titolo del passo senza far scorrere la pagina di scatto. */
export function focusTitolo(passo: HTMLElement): void {
  const h1 = passo.querySelector<HTMLElement>("h1");
  h1?.focus({ preventScroll: true });
}

export const riduciMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
