/**
 * Orari di lavoro e di risposta al telefono: tipi, testo leggibile e controlli.
 * Puro (niente DOM), provato in tests/controlli.spec.ts. La forma «per giorno, con
 * fasce dalle/alle» è la stessa della scheda Google Business (periodi per giorno):
 * quando il passo Scheda Google li leggerà, la conversione sarà una riga.
 */
export const GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;
export type Giorno = (typeof GIORNI)[number];

export const NOME_GIORNO: Record<Giorno, string> = {
  lun: "Lunedì",
  mar: "Martedì",
  mer: "Mercoledì",
  gio: "Giovedì",
  ven: "Venerdì",
  sab: "Sabato",
  dom: "Domenica",
};
export const SIGLA_GIORNO: Record<Giorno, string> = { lun: "Lun", mar: "Mar", mer: "Mer", gio: "Gio", ven: "Ven", sab: "Sab", dom: "Dom" };

/** Una fascia oraria, «HH:MM» a 24 ore (il valore nativo di <input type="time">). */
export interface Fascia {
  dalle: string;
  alle: string;
}
/** Giorno assente = chiuso. Due fasce = pausa in mezzo. */
export type Orari = Partial<Record<Giorno, Fascia[]>>;

export type OrariTelefono = { come: "lavoro" } | { come: "h24" } | { come: "diversi"; orari: Orari };

export type EsitoOrari = { ok: true } | { ok: false; livello: "avviso" | "blocco"; messaggio: string };
const blocco = (messaggio: string): EsitoOrari => ({ ok: false, livello: "blocco", messaggio });
const avviso = (messaggio: string): EsitoOrari => ({ ok: false, livello: "avviso", messaggio });

/** «08:30» → 510. Vuoto o malformato → NaN. */
export const minuti = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m) ? NaN : h * 60 + m;
};

/** «08:00» → «8:00» (come lo si scrive a mano). */
export const ora = (hhmm: string): string => hhmm.replace(/^0(\d:)/, "$1");

const completa = (f: Fascia): boolean => !!f.dalle && !!f.alle;

export const formattaFasce = (fasce: Fascia[]): string => fasce.map((f) => `${ora(f.dalle)}–${ora(f.alle)}`).join(" e ");

/**
 * Testo per il riepilogo, il brief e il sito: i giorni consecutivi con le stesse fasce
 * si raggruppano. «Lun–Ven 8:00–12:00 e 13:30–18:00 · Sab 8:00–12:00». Vuoto se non
 * c'è nessun giorno completo.
 */
export function formattaOrari(o: Orari): string {
  const chiave = (g: Giorno): string | null => {
    const fasce = o[g];
    return fasce && fasce.length > 0 && fasce.every(completa) ? fasce.map((f) => `${f.dalle}-${f.alle}`).join(",") : null;
  };
  const gruppi: { da: number; a: number; testo: string }[] = [];
  GIORNI.forEach((g, i) => {
    const k = chiave(g);
    if (!k) return;
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.a === i - 1 && chiave(GIORNI[ultimo.da] as Giorno) === k) ultimo.a = i;
    else gruppi.push({ da: i, a: i, testo: formattaFasce(o[g] as Fascia[]) });
  });
  return gruppi
    .map(({ da, a, testo }) => {
      const s1 = SIGLA_GIORNO[GIORNI[da] as Giorno];
      const s2 = SIGLA_GIORNO[GIORNI[a] as Giorno];
      const giorni = da === a ? s1 : a === da + 1 ? `${s1} e ${s2}` : `${s1}–${s2}`;
      return `${giorni} ${testo}`;
    })
    .join(" · ");
}

export function formattaOrariTelefono(t: OrariTelefono): string {
  if (t.come === "lavoro") return "Negli stessi orari di lavoro";
  if (t.come === "h24") return "Sempre, 24 ore su 24";
  return formattaOrari(t.orari);
}

/** Controlli: manca un giorno o un orario = blocco (è un vuoto); orari incoerenti = avviso. */
export function giudicaOrari(o: Orari): EsitoOrari {
  const giorni = GIORNI.filter((g) => o[g]);
  if (giorni.length === 0) return blocco("Ci serve almeno un giorno: tocca quelli in cui lavori.");
  for (const g of giorni) {
    const fasce = o[g] as Fascia[];
    const nome = NOME_GIORNO[g];
    if (fasce.length === 0 || fasce.some((f) => !completa(f))) return blocco(`Manca l'orario di ${nome.toLowerCase()}.`);
    for (const f of fasce) {
      if (minuti(f.alle) <= minuti(f.dalle)) return avviso(`${nome}: l'orario di fine viene prima dell'inizio, vuoi ricontrollarlo?`);
    }
    const [prima, seconda] = fasce;
    if (prima && seconda && minuti(seconda.dalle) < minuti(prima.alle)) {
      return avviso(`${nome}: la seconda fascia inizia prima che finisca la prima, vuoi ricontrollarla?`);
    }
  }
  return { ok: true };
}
