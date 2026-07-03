import type { Cta } from "./schema";

/** Classi semantiche per una CTA in base allo stile (token-driven, vedi global.css). */
export function ctaClass(style: Cta["style"] = "primary"): string {
  switch (style) {
    case "secondary":
      return "btn btn-secondary";
    case "ghost":
      return "btn btn-ghost";
    case "primary":
    default:
      return "btn btn-primary";
  }
}

/** Padding verticale fluido delle sezioni (scala con --brand-space del preset). */
export const sectionPad = "section-pad";

/**
 * Converte i marcatori `**frase**` di un titolo in <span class="accent-word">
 * (la firma dello standard: UNA frase in accent per titolo). Il testo viene
 * prima escapato, quindi l'output è sicuro per set:html.
 */
export function renderAccent(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<span class="accent-word">$1</span>');
}

/**
 * Microcopy con separatore "·" ("Sopralluogo gratuito · Risposta in 24 ore"):
 * ogni voce diventa un inline-block, così su mobile il wrap avviene solo tra
 * voci intere, mai a metà frase ("RISPOSTA IN / 24 ORE"). Sicuro per set:html.
 */
export function renderDotted(text: string): string {
  return text
    .split(" · ")
    .map((part) => `<span class="inline-block">${escapeHtml(part)}</span>`)
    .join(' <span class="opacity-60" aria-hidden="true">·</span> ');
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Genera un href telefonico pulito. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

/** Genera un link WhatsApp da un numero. */
export function waHref(num: string): string {
  return `https://wa.me/${num.replace(/[^\d]/g, "")}`;
}
