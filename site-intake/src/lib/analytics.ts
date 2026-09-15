/**
 * Statistiche senza cookie via Umami (stesso impianto dei siti clienti). Attivo solo se
 * Base.astro ha caricato lo script; altrimenti tutto è no-op e il form non se ne accorge.
 *
 * Disegno della misura (README «Statistiche»):
 * - ogni passo è una PAGINA VIRTUALE `/passo/NN-id`: la tabella Pagine di Umami è già il
 *   funnel ordinato, e Funnel / Percorsi / Retention lavorano sugli URL;
 * - gli EVENTI portano solo id, conteggi e secondi, mai dati personali; le proprietà
 *   «chiave:valore» (es. tempo = "azienda:12") permettono a Umami di dare la
 *   distribuzione per domanda senza leggere le singole visite.
 * Lo script Umami è `defer`: le chiamate arrivate prima che esista si mettono in coda
 * e partono al `load`.
 */
type Dati = Record<string, string | number | boolean>;
type PropsPagina = { url?: string; title?: string; referrer?: string; [k: string]: unknown };

declare global {
  interface Window {
    umami?: {
      track: ((evento: string, dati?: Dati) => void) & ((props: (p: PropsPagina) => PropsPagina) => void) & (() => void);
    };
  }
}

const coda: (() => void)[] = [];
let attesaLoad = false;

function esegui(fn: () => void): void {
  try {
    if (window.umami) {
      fn();
      return;
    }
    coda.push(fn);
    if (!attesaLoad) {
      attesaLoad = true;
      window.addEventListener("load", () => {
        for (const f of coda.splice(0)) if (window.umami) f();
      });
    }
  } catch {
    /* mai rompere il form per le statistiche */
  }
}

export function traccia(evento: string, dati?: Dati): void {
  esegui(() => window.umami?.track(evento, dati));
}

/** Pageview: vera all'apertura (URL reale con utm/fbclid), virtuale per ogni passo (`/passo/NN-id`). */
export function pagina(url?: string, titolo?: string): void {
  esegui(() => (url ? window.umami?.track((p) => ({ ...p, url, title: titolo ?? p.title })) : window.umami?.track()));
}

/** URL virtuale di un passo: numerato, così la tabella Pagine è già in ordine. */
export const urlPasso = (n: number, id: string): string => `/passo/${String(n).padStart(2, "0")}-${id}`;

// ---------- Cronometro del passo ----------
let ingresso = performance.now();

/** Secondi passati sul passo corrente (arrotondati). */
export const secondiSulPasso = (): number => Math.round((performance.now() - ingresso) / 1000);

/** Chiude il cronometro del passo lasciato e lo riapre per il nuovo: restituisce i secondi del passo lasciato. */
export function cambioPasso(): number {
  const s = secondiSulPasso();
  ingresso = performance.now();
  return s;
}
