/**
 * Statistiche senza cookie via Umami (stesso impianto dei siti clienti). Attivo
 * solo se Base.astro ha caricato lo script (env PUBLIC_UMAMI_*); altrimenti no-op.
 * Eventi: «passo» (id, sezione), «invio», «foto» (quante), «errore-invio».
 */
declare global {
  interface Window {
    umami?: { track: (evento: string, dati?: Record<string, string | number | boolean>) => void };
  }
}

export function traccia(evento: string, dati?: Record<string, string | number | boolean>): void {
  try {
    window.umami?.track(evento, dati);
  } catch {
    /* mai rompere il form per le statistiche */
  }
}
