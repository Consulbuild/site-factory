/**
 * Controlli dei campi: funzioni pure, senza DOM, provate in tests/controlli.spec.ts.
 * Regola del form: il controllo spiega l'errore con parole semplici e non blocca
 * (l'unico blocco è il consenso). Qui si restituisce solo il giudizio; chi lo
 * mostra e come è compito dei componenti.
 */

export type Giudizio =
  | { ok: true; valore: string }
  | { ok: false; livello: "avviso" | "blocco"; messaggio: string; valore: string };

const ok = (valore: string): Giudizio => ({ ok: true, valore });
const avviso = (messaggio: string, valore: string): Giudizio => ({ ok: false, livello: "avviso", messaggio, valore });
const blocco = (messaggio: string, valore: string): Giudizio => ({ ok: false, livello: "blocco", messaggio, valore });

/** Toglie spazi doppi e ai bordi. */
export const pulisci = (s: string) => s.replace(/\s+/g, " ").trim();

// ---------- Telefono ----------
/** Solo cifre; +39 / 0039 iniziale rimosso (il prefisso è già scritto nel campo). */
export function normalizzaTelefono(grezzo: string): string {
  let s = grezzo.replace(/[^\d+]/g, "");
  if (s.startsWith("+39")) s = s.slice(3);
  else if (s.startsWith("0039")) s = s.slice(4);
  else if (s.startsWith("+")) s = s.slice(1);
  return s;
}

export function giudicaTelefono(grezzo: string): Giudizio {
  const n = normalizzaTelefono(grezzo);
  if (n.length === 0) return blocco("Manca il numero di cellulare: ci serve per ricontattarti.", n);
  // Cellulare italiano: inizia con 3 e ha 10 cifre. Fisso: inizia con 0, da 6 a 11 cifre.
  if (n.startsWith("3")) {
    const k = 10 - n.length;
    if (k > 0) return avviso(`Sembra ${k === 1 ? "manchi una cifra" : `manchino ${k} cifre`}: un cellulare ne ha 10.`, n);
    if (k < 0) return avviso(`Sembra ${k === -1 ? "ci sia una cifra di troppo" : `ci siano ${-k} cifre di troppo`}: un cellulare ne ha 10.`, n);
    return ok(n);
  }
  if (n.startsWith("0")) {
    if (n.length < 6 || n.length > 11) return avviso("Il numero fisso sembra incompleto: vuoi ricontrollarlo?", n);
    return avviso("Sembra un numero fisso: se puoi, meglio il cellulare. Va bene lo stesso?", n);
  }
  return avviso("Non sembra un numero italiano: i cellulari iniziano con 3.", n);
}

/** Formato leggibile per il riepilogo: +39 388 893 7188. */
export function formattaTelefono(n: string): string {
  const d = normalizzaTelefono(n);
  return `+39 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`.trim();
}

// ---------- Email ----------
const DOMINI_NOTI = ["gmail.com", "libero.it", "hotmail.it", "hotmail.com", "outlook.it", "outlook.com", "yahoo.it", "yahoo.com", "icloud.com", "tiscali.it", "virgilio.it", "alice.it", "tin.it", "pec.it", "legalmail.it"];

/** Distanza di Levenshtein: basta per i refusi da tastiera (email, comuni). */
export function distanza(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const riga: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = riga[0] as number;
    riga[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = riga[j] as number;
      riga[j] = Math.min((riga[j] as number) + 1, (riga[j - 1] as number) + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return riga[n] as number;
}

/** Dominio scritto male tra quelli comuni → proposta («gmail.con» → «gmail.com»). */
export function suggerisciDominioEmail(email: string): string | null {
  const [utente, dominio] = email.toLowerCase().split("@");
  if (!utente || !dominio || DOMINI_NOTI.includes(dominio)) return null;
  let migliore: string | null = null;
  let minima = 3;
  for (const noto of DOMINI_NOTI) {
    const d = distanza(dominio, noto);
    if (d > 0 && d < minima) {
      minima = d;
      migliore = noto;
    }
  }
  return migliore ? `${utente}@${migliore}` : null;
}

export function giudicaEmail(grezzo: string): Giudizio {
  const e = grezzo.replace(/\s+/g, "").toLowerCase();
  if (!e) return blocco("Manca l'email dell'azienda: ci serve per scriverti.", e);
  const parti = e.split("@");
  if (parti.length !== 2 || !parti[0] || !parti[1] || !parti[1].includes(".") || parti[1].endsWith(".")) {
    return avviso("L'email sembra incompleta: di solito è come nome@azienda.it.", e);
  }
  const proposta = suggerisciDominioEmail(e);
  if (proposta) return avviso(`Forse intendevi ${proposta}?`, e);
  return ok(e);
}

// ---------- Partita IVA ----------
export function normalizzaPiva(grezzo: string): string {
  return grezzo.replace(/^\s*IT/i, "").replace(/[\s.\-]/g, "");
}

/** Cifra di controllo della Partita IVA italiana (algoritmo di Luhn a 11 cifre). */
export function checksumPiva(cifre: string): boolean {
  if (!/^\d{11}$/.test(cifre)) return false;
  let somma = 0;
  for (let i = 0; i < 11; i++) {
    let c = Number(cifre[i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somma += c;
  }
  return somma % 10 === 0;
}

export function giudicaPiva(grezzo: string): Giudizio {
  const p = normalizzaPiva(grezzo);
  if (!p) return blocco("Manca la Partita IVA: sono 11 numeri.", p);
  if (/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(p)) {
    return avviso("Questo sembra un codice fiscale: qui serve la Partita IVA, 11 numeri.", p);
  }
  if (/\D/.test(p)) return avviso("La Partita IVA è fatta solo di numeri: sembra ci sia qualche lettera.", p);
  if (p.length < 11) {
    const k = 11 - p.length;
    return avviso(`Sembra ${k === 1 ? "manchi un numero" : `manchino ${k} numeri`}: la Partita IVA ne ha 11.`, p);
  }
  if (p.length > 11) {
    const k = p.length - 11;
    return avviso(`Sembra ${k === 1 ? "ci sia un numero di troppo" : `ci siano ${k} numeri di troppo`}: la Partita IVA ne ha 11.`, p);
  }
  if (!checksumPiva(p)) return avviso("Sembra ci sia un numero non corretto: vuoi ricontrollare?", p);
  return ok(p);
}

// ---------- Sito attuale ----------
/** «cavalierebuild.it», «www.x.it», «https://x.it/» → https://x.it (senza percorso vuoto). */
export function normalizzaSito(grezzo: string): string {
  let s = pulisci(grezzo).toLowerCase();
  if (!s) return "";
  if (!/^https?:\/\//.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return u.pathname === "/" && !u.search ? `${u.protocol}//${u.host}` : u.href.replace(/\/$/, "");
  } catch {
    return s;
  }
}

export function giudicaSito(grezzo: string): Giudizio {
  const s = normalizzaSito(grezzo);
  if (!s) return ok("");
  const host = s.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (!host.includes(".")) return avviso("L'indirizzo sembra incompleto: di solito è come nomeazienda.it.", s);
  return ok(s);
}

// ---------- Nome del sito (dominio, solo la parte prima di .it) ----------
const SIGLE = /\b(s\.?r\.?l\.?s?|s\.?n\.?c|s\.?a\.?s|s\.?p\.?a|s\.?s|di|ditta|&|e)\b/gi;

/** Solo a-z, 0-9 e trattino; accenti tolti; spazi tolti. Mai più di 63 caratteri. */
export function pulisciNomeSito(grezzo: string): string {
  return grezzo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

/** Per mestiere: la parola che precede il nome e quella che lo segue («idraulicorossi», «rossiidraulica»). */
const AFFISSI: Record<string, [string, string]> = {
  "impresa-edile": ["impresa", "costruzioni"],
  ristrutturazioni: ["ristrutturazioni", "ristrutturazioni"],
  idraulico: ["idraulico", "idraulica"],
  elettricista: ["elettricista", "impianti"],
  cartongesso: ["cartongesso", "interni"],
  serramenti: ["serramenti", "infissi"],
  imbianchino: ["imbianchino", "tinteggiature"],
};

/**
 * Cinque proposte dal nome dell'azienda (senza sigle) e dal mestiere, in ordine di
 * naturalezza: unito, con trattino, mestiere+nome, nome+mestiere, mestiere-nome.
 */
export function proponiNomiSito(azienda: string, mestiere?: string): string[] {
  const base = pulisci(azienda.replace(SIGLE, " "));
  const parole = base
    .split(" ")
    .map((p) => pulisciNomeSito(p))
    .filter(Boolean);
  const primo = parole[0];
  if (!primo) return [];
  const [prefisso, suffisso] = AFFISSI[mestiere ?? ""] ?? ["impresa", "servizi"];
  const unito = parole.join("");
  const trattino = parole.join("-");
  // Niente doppioni goffi tipo «impiantiimpianti» se il nome contiene già la parola.
  const conPrefisso = parole.includes(prefisso) ? [] : [`${prefisso}${primo}`, `${prefisso}-${trattino}`];
  const conSuffisso = parole.includes(suffisso) ? [] : [`${primo}${suffisso}`, `${primo}-${suffisso}`];
  const candidati = [unito, trattino, conPrefisso[0], conSuffisso[0], conPrefisso[1], conSuffisso[1]]
    .filter((c): c is string => !!c)
    .map(pulisciNomeSito);
  return [...new Set(candidati)].filter((n) => n.length >= 3).slice(0, 5);
}

export function giudicaNomeSito(grezzo: string): Giudizio {
  const n = pulisciNomeSito(grezzo);
  if (!n) return blocco("Manca il nome del sito: puoi toccarne uno proposto o scriverne uno tuo.", n);
  if (n.length < 3) return avviso("Il nome è un po' corto: servono almeno 3 caratteri.", n);
  return ok(n);
}

// ---------- Nomi ----------
export function giudicaReferente(grezzo: string): Giudizio {
  const s = pulisci(grezzo);
  if (!s) return blocco("Manca il nome di chi compila: ci serve per sapere con chi parliamo.", s);
  if (s.split(" ").length < 2) return avviso("Se puoi, aggiungi anche il cognome.", s);
  return ok(s);
}

export function giudicaAzienda(grezzo: string): Giudizio {
  const s = pulisci(grezzo);
  if (!s) return blocco("Manca il nome dell'azienda: è quello che comparirà sul sito.", s);
  return ok(s);
}

// ---------- Social ----------
/** «@nome», «nome», o link intero → link canonico della piattaforma. */
export function normalizzaSocial(piattaforma: "facebook" | "instagram" | "tiktok", grezzo: string): string {
  const s = pulisci(grezzo);
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const handle = s.replace(/^@/, "").replace(/^(www\.)?(facebook|instagram|tiktok)\.com\//i, "").replace(/\/$/, "");
  const base = { facebook: "https://www.facebook.com/", instagram: "https://www.instagram.com/", tiktok: "https://www.tiktok.com/@" }[
    piattaforma
  ];
  return base + handle;
}
