/**
 * Disponibilità del nome del sito (dominio .it). Il Registro .it non offre RDAP
 * (verificato sul bootstrap IANA il 2026-09-07) e le API di GoDaddy sono riservate
 * agli account con 50+ domini: qui si usa il DNS pubblico via HTTPS (Cloudflare,
 * CORS aperto): un dominio senza record (NXDOMAIN) è quasi certamente libero, uno
 * con record è preso. È un segnale prudente: l'esito viene salvato e riverificato
 * dall'operatore al momento dell'acquisto.
 */
export type EsitoDominio = "libero" | "preso" | "sconosciuto";

const cache = new Map<string, EsitoDominio>();
const DOH = "https://cloudflare-dns.com/dns-query";

export async function disponibilita(nome: string, timeoutMs = 1500): Promise<EsitoDominio> {
  const dominio = `${nome}.it`;
  const noto = cache.get(dominio);
  if (noto) return noto;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${DOH}?name=${encodeURIComponent(dominio)}&type=NS`, {
      headers: { accept: "application/dns-json" },
      signal: ctrl.signal,
    });
    if (!r.ok) return "sconosciuto";
    const j = (await r.json()) as { Status?: number };
    const esito: EsitoDominio = j.Status === 3 ? "libero" : j.Status === 0 ? "preso" : "sconosciuto";
    cache.set(dominio, esito);
    return esito;
  } catch {
    return "sconosciuto";
  } finally {
    clearTimeout(timer);
  }
}

export const TESTO_ESITO: Record<EsitoDominio, string> = {
  libero: "Libero",
  preso: "Già preso",
  sconosciuto: "Non riusciamo a controllare adesso: lo verifichiamo noi",
};
