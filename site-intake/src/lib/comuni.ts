/**
 * Elenco ufficiale dei comuni (ISTAT + CAP ANCI) per la domanda «Dov'è la sede»:
 * il comune si trova SEMPRE, anche scritto male. I dati stanno in
 * public/data/comuni/<iniziale>.json (generati da scripts/build-comuni.mjs) e si
 * scaricano solo quando l'utente inizia a scrivere, una lettera per volta.
 */
import { distanza } from "./validators";

export interface Comune {
  nome: string;
  sigla: string;
  provincia: string;
  regione: string;
  cap: string;
  multiCap: boolean;
}

export interface Provincia {
  sigla: string;
  nome: string;
  regione: string;
}

type Riga = [string, string, string, string, string, number];

const cache = new Map<string, Promise<Comune[]>>();
let province: Promise<Provincia[]> | null = null;

/** Senza accenti, minuscolo, apostrofi come spazi: «Sant'Àngelo» → «sant angelo». */
export const normalizza = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const iniziale = (n: string): string => {
  const c = n[0] ?? "_";
  return /[a-z]/.test(c) ? c : "_";
};

export function caricaLettera(lettera: string): Promise<Comune[]> {
  let p = cache.get(lettera);
  if (!p) {
    p = fetch(`/data/comuni/${lettera}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Riga[]>) : []))
      .then((righe) => righe.map(([nome, sigla, provincia, regione, cap, multi]) => ({ nome, sigla, provincia, regione, cap, multiCap: multi === 1 })))
      .catch(() => {
        cache.delete(lettera); // riprova alla prossima digitazione (rete assente)
        return [] as Comune[];
      });
    cache.set(lettera, p);
  }
  return p;
}

export function caricaProvince(): Promise<Provincia[]> {
  province ??= fetch("/data/province.json")
    .then((r) => (r.ok ? (r.json() as Promise<Provincia[]>) : []))
    .catch(() => []);
  return province;
}

/**
 * Suggerimenti per ciò che l'utente ha scritto: prima chi inizia così, poi chi ha una
 * parola che inizia così, poi chi lo contiene, infine i quasi-uguali (refusi: distanza ≤ 2).
 */
export async function cercaComuni(query: string, max = 8): Promise<Comune[]> {
  const q = normalizza(query);
  if (q.length < 2) return [];
  const lista = await caricaLettera(iniziale(q));
  const punteggio = (c: Comune): number => {
    const n = normalizza(c.nome);
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (n.split(" ").some((p) => p.startsWith(q))) return 2;
    if (n.includes(q)) return 3;
    if (q.length >= 4 && distanza(n.slice(0, q.length), q) <= 2) return 4;
    return 99;
  };
  return lista
    .map((c) => ({ c, s: punteggio(c) }))
    .filter((x) => x.s < 99)
    .sort((a, b) => a.s - b.s || a.c.nome.length - b.c.nome.length || a.c.nome.localeCompare(b.c.nome, "it"))
    .slice(0, max)
    .map((x) => x.c);
}

/** Il comune che corrisponde esattamente al testo (per chi scrive senza toccare il suggerimento). */
export async function trovaComune(testo: string, sigla?: string): Promise<Comune | null> {
  const q = normalizza(testo.replace(/\s*\([A-Z]{2}\)\s*$/i, ""));
  if (q.length < 2) return null;
  const lista = await caricaLettera(iniziale(q));
  const candidati = lista.filter((c) => normalizza(c.nome) === q);
  if (candidati.length === 0) return null;
  return (sigla ? candidati.find((c) => c.sigla === sigla) : undefined) ?? candidati[0] ?? null;
}

export const etichettaComune = (c: Comune): string => `${c.nome} (${c.sigla})`;

/** Suggerimenti misti per le zone: province e comuni. */
export async function cercaZone(query: string, max = 8): Promise<string[]> {
  const q = normalizza(query);
  if (q.length < 2) return [];
  const [prov, comuni] = await Promise.all([caricaProvince(), cercaComuni(query, max)]);
  const provinceTrovate = prov.filter((p) => normalizza(p.nome).startsWith(q)).map((p) => `${p.nome} e provincia`);
  const comuniTrovati = comuni.map((c) => `${c.nome} (${c.sigla})`);
  return [...new Set([...provinceTrovate, ...comuniTrovati])].slice(0, max);
}
