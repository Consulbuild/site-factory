// Cache in memoria con TTL per le letture dei servizi esterni (Stripe, Gatus,
// n8n, Umami). Vive su globalThis come il run-bus, così sopravvive all'HMR di
// Next in dev e vale per tutte le route/pagine del processo. Memoizza la
// PROMISE, non il valore: due chiamate concorrenti (home + hub + refresh)
// producono un solo fetch. Zero import: importabile ovunque, anche negli script.

type Voce = { scade: number; p: Promise<unknown> };

const g = globalThis as { __sfCache?: Map<string, Voce> };
const STORE = (g.__sfCache ??= new Map<string, Voce>());

/** Un errore resta in cache poco: si ritenta dopo 60 s, non dopo l'intero TTL
 *  (altrimenti una fonte giù al primo accesso resterebbe «giù» per 1 h). */
const ERRORE_MS = 60_000;

/** Ritorna la promise memoizzata per `key` se non è scaduta, altrimenti esegue `fn`. */
export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const ora = Date.now();
  const esistente = STORE.get(key);
  if (esistente && esistente.scade > ora) return esistente.p as Promise<T>;
  const p = fn();
  const voce: Voce = { scade: ora + ttlMs, p };
  STORE.set(key, voce);
  p.catch(() => {
    if (STORE.get(key) === voce) voce.scade = Date.now() + ERRORE_MS;
  });
  return p;
}

/** Invalida le voci il cui nome inizia con `prefisso` ("" = tutte). */
export function invalida(prefisso = ""): void {
  for (const k of STORE.keys()) if (k.startsWith(prefisso)) STORE.delete(k);
}
