/**
 * LE 21 DOMANDE del form, come configurazione tipizzata: specchio esatto del
 * documento vivo «Domande del form bozza» v4 (2026-09-07), approvato da Mattia.
 *
 * Per cambiare un testo, un aiuto o l'ordine: si modifica QUI. Per un tipo di
 * risposta nuovo: si aggiunge il tipo a `TipoDomanda`, un componente in
 * src/components/ e la sua voce nel registro di src/lib/render.ts.
 *
 * `id` è la chiave in lead.json → risposte, già allineata ai campi di brief.json
 * (docs «Domande» v4, colonna «campo»); la mappa finale la fa l'import nell'editor.
 */
import {
  ALTRO_LAVORO,
  ANNI,
  CLIENTI,
  COLORI,
  CONTATTO,
  LAVORI,
  MESTIERI,
  PUNTI_DI_FORZA,
  STILI,
  type Colore,
  type Opzione,
} from "./tassonomia";

export const SEZIONI = [
  { n: 1, nome: "Il tuo lavoro" },
  { n: 2, nome: "La tua azienda" },
  { n: 3, nome: "Il tuo numero" },
  { n: 4, nome: "Le tue foto", incoraggiamento: "Bene, il grosso è fatto." },
  { n: 5, nome: "Perché scegliere te" },
  { n: 6, nome: "Lo stile del sito", incoraggiamento: "Ci siamo quasi." },
  { n: 7, nome: "Per finire" },
] as const;
export type NumeroSezione = (typeof SEZIONI)[number]["n"];

export type TipoDomanda =
  | "scelta" // una sola opzione (riquadri con icona o righe)
  | "scelta-multipla" // più opzioni (righe o chip), con eventuale «altro» a testo
  | "testo" // una riga di testo
  | "telefono"
  | "email"
  | "piva"
  | "sito" // indirizzo del sito attuale (Sì/No + casella)
  | "nome-sito" // proposte dal nome azienda + verifica disponibilità
  | "sede" // comune (elenco ISTAT) + via e numero + conferma
  | "zone" // riquadri creati dal comune della sede
  | "foto" // fino a 15 foto, upload in background
  | "logo"
  | "stile" // card visuali, massimo 2
  | "colori" // pallini colore + testo, o «scegliete voi»
  | "social" // Facebook, Instagram, TikTok
  | "consenso";

export type LayoutScelte = "riquadri" | "righe" | "chip";

export interface Domanda {
  id: string;
  sezione: NumeroSezione;
  tipo: TipoDomanda;
  testo: string;
  /** Riga sotto la domanda, solo dove serve (mai oltre 20 parole). */
  aiuto?: string;
  obbligatoria: boolean;
  /** Opzioni fisse, o calcolate dalle risposte precedenti (es. lavori ← mestiere). */
  opzioni?: readonly Opzione[] | ((risposte: Risposte) => readonly Opzione[]);
  layout?: LayoutScelte;
  /** Scelte multiple: massimo selezionabili (es. stile = 2). */
  max?: number;
  placeholder?: string;
  autocomplete?: string;
  /** Dove finisce il dato (documentazione per chi fa l'import). */
  campo: string;
}

/** Forma delle risposte, per tipo (lead.json → risposte). */
export interface Risposte {
  mestiere?: { id: string; altro?: string };
  lavori?: { ids: string[]; altro?: string };
  azienda?: string;
  nome_sito?: { nome: string; esito: "libero" | "preso" | "sconosciuto" };
  sede?: { comune: string; provincia: string; regione: string; cap: string; via: string; senzaCivico?: boolean };
  zone?: string[];
  esperienza_anni?: string;
  sito_attuale?: string;
  telefono?: string;
  punti_di_forza?: { ids: string[]; altro?: string; certificazioni?: string };
  clienti?: { ids: string[]; altro?: string };
  stile?: string[];
  colori?: { ids: string[]; testo?: string; nessuno?: boolean };
  referente?: string;
  email?: string;
  partita_iva?: { valore: string; daVerificare?: boolean };
  social?: { facebook?: string; instagram?: string; tiktok?: string };
  ricontatto?: string;
  consenso?: boolean;
}

export const COLORI_OPZIONI: readonly Colore[] = COLORI;

export const DOMANDE: readonly Domanda[] = [
  // ---- 1 · Il tuo lavoro ----
  {
    id: "mestiere",
    sezione: 1,
    tipo: "scelta",
    testo: "Qual è il tuo mestiere?",
    aiuto: "Tocca quello principale. Gli altri lavori li scegli dopo.",
    obbligatoria: true,
    opzioni: MESTIERI,
    layout: "riquadri",
    campo: "brief.settore",
  },
  {
    id: "lavori",
    sezione: 1,
    tipo: "scelta-multipla",
    testo: "Quali lavori fai?",
    aiuto: "Tocca tutti quelli che fai davvero. Se manca qualcosa, scrivilo in fondo.",
    obbligatoria: true,
    opzioni: (r) => [...(LAVORI[r.mestiere?.id ?? "altro"] ?? LAVORI["altro"] ?? []), ALTRO_LAVORO],
    layout: "chip",
    campo: "brief.servizi[]",
  },
  // ---- 2 · La tua azienda ----
  {
    id: "azienda",
    sezione: 2,
    tipo: "testo",
    testo: "Come si chiama la tua azienda?",
    aiuto: "Scrivilo come vuoi che compaia sul sito.",
    obbligatoria: true,
    placeholder: "es. Cavaliere Build Srls",
    autocomplete: "organization",
    campo: "brief.azienda",
  },
  {
    id: "nome_sito",
    sezione: 2,
    tipo: "nome-sito",
    testo: "Come vuoi che si chiami il tuo sito?",
    aiuto: "È l'indirizzo che la gente scriverà per trovarti. Finisce sempre con .it: tu scegli solo il nome.",
    obbligatoria: true,
    campo: "brief.dominio_scelto",
  },
  {
    id: "sede",
    sezione: 2,
    tipo: "sede",
    testo: "Dov'è la sede?",
    aiuto: "Prima il comune, poi la via e il numero.",
    obbligatoria: true,
    campo: "brief.indirizzo, brief.citta",
  },
  {
    id: "zone",
    sezione: 2,
    tipo: "zone",
    testo: "In quali zone lavori?",
    aiuto: "Tocca tutte le zone dove accetti lavori.",
    obbligatoria: true,
    campo: "brief.area_geografica",
  },
  {
    id: "esperienza_anni",
    sezione: 2,
    tipo: "scelta",
    testo: "Da quanti anni fai questo mestiere?",
    aiuto: "Contano anche gli anni prima di aprire l'azienda.",
    obbligatoria: true,
    opzioni: ANNI,
    layout: "righe",
    campo: "brief.esperienza_anni",
  },
  {
    id: "sito_attuale",
    sezione: 2,
    tipo: "sito",
    testo: "Hai già un sito internet?",
    aiuto: "Anche se è vecchio o non ti piace: ci aiuta a capire meglio la tua attività.",
    obbligatoria: false,
    campo: "brief.sito_attuale",
  },
  // ---- 3 · Il tuo numero ----
  {
    id: "telefono",
    sezione: 3,
    tipo: "telefono",
    testo: "Il tuo numero di cellulare",
    obbligatoria: true,
    campo: "brief.telefono",
  },
  // ---- 4 · Le tue foto ----
  {
    id: "foto",
    sezione: 4,
    tipo: "foto",
    testo: "Mostraci i tuoi lavori",
    aiuto:
      "Scegli fino a 15 foto di lavori finiti: bagni, cucine, facciate, cantieri consegnati. Vanno bene anche le foto fatte col telefono.",
    obbligatoria: false,
    campo: "out/<slug>/img/lavoro-N.jpg",
  },
  {
    id: "logo",
    sezione: 4,
    tipo: "logo",
    testo: "Hai un logo? Caricalo qui",
    aiuto: "Il file del tuo logo, se ce l'hai. Se non ce l'hai, lo disegniamo noi.",
    obbligatoria: false,
    campo: "brand.logo",
  },
  // ---- 5 · Perché scegliere te ----
  {
    id: "punti_di_forza",
    sezione: 5,
    tipo: "scelta-multipla",
    testo: "Perché i clienti scelgono te?",
    aiuto: "Tocca solo quello che è vero: lo scriveremo sul sito.",
    obbligatoria: true,
    opzioni: PUNTI_DI_FORZA,
    layout: "righe",
    campo: "contesto.punti_di_forza",
  },
  {
    id: "clienti",
    sezione: 5,
    tipo: "scelta-multipla",
    testo: "Chi sono i tuoi clienti?",
    aiuto: "Tocca tutti quelli per cui lavori.",
    obbligatoria: true,
    opzioni: CLIENTI,
    layout: "righe",
    campo: "brief.clienti, brief.cliente_tipo",
  },
  // ---- 6 · Lo stile del sito ----
  {
    id: "stile",
    sezione: 6,
    tipo: "stile",
    testo: "Che stile vuoi che abbia il tuo sito?",
    aiuto: "Tocca al massimo 2.",
    obbligatoria: true,
    opzioni: STILI,
    max: 2,
    campo: "brief.tono_preferito",
  },
  {
    id: "colori",
    sezione: 6,
    tipo: "colori",
    testo: "Hai dei colori della tua azienda?",
    aiuto: "Quelli del logo, del furgone o delle divise, se ci sono.",
    obbligatoria: false,
    campo: "brief.colori",
  },
  // ---- 7 · Per finire ----
  {
    id: "referente",
    sezione: 7,
    tipo: "testo",
    testo: "Nome e cognome",
    aiuto: "Di chi compila il form.",
    obbligatoria: true,
    placeholder: "es. Mario Rossi",
    autocomplete: "name",
    campo: "brief.referente",
  },
  {
    id: "email",
    sezione: 7,
    tipo: "email",
    testo: "L'email dell'azienda",
    obbligatoria: true,
    campo: "brief.email",
  },
  {
    id: "partita_iva",
    sezione: 7,
    tipo: "piva",
    testo: "La Partita IVA",
    aiuto: "11 numeri. La trovi su una fattura o sul timbro.",
    obbligatoria: true,
    campo: "brief.partita_iva",
  },
  {
    id: "social",
    sezione: 7,
    tipo: "social",
    testo: "Hai una pagina Facebook, Instagram o TikTok dell'azienda?",
    aiuto: "Scrivi il nome della pagina o incolla il link. Se non ce l'hai, vai avanti.",
    obbligatoria: false,
    campo: "brief.social",
  },
  {
    id: "ricontatto",
    sezione: 7,
    tipo: "scelta",
    testo: "Come preferisci essere contattato per vedere il tuo nuovo sito?",
    obbligatoria: true,
    opzioni: CONTATTO,
    layout: "righe",
    campo: "brief.ricontatto_preferito",
  },
  {
    id: "consenso",
    sezione: 7,
    tipo: "consenso",
    testo: "Ho letto l'informativa sulla privacy e acconsento",
    aiuto: "Usiamo i tuoi dati solo per preparare il tuo nuovo sito e per contattarti. Leggi l'informativa (si apre qui, senza uscire).",
    obbligatoria: true,
    campo: "consenso",
  },
];

/** Passi «virtuali» dopo le domande: riepilogo e schermata finale. */
export const PASSI_FINALI = ["riepilogo", "fatto"] as const;

export const TOTALE_SEZIONI = SEZIONI.length;

/** Le opzioni di una domanda, risolte contro le risposte date finora. */
export function opzioniDi(d: Domanda, risposte: Risposte): readonly Opzione[] {
  if (!d.opzioni) return [];
  return typeof d.opzioni === "function" ? d.opzioni(risposte) : d.opzioni;
}

export function sezioneDi(n: NumeroSezione) {
  return SEZIONI.find((s) => s.n === n) ?? SEZIONI[0];
}

/** Quota della barra per una sezione (progresso «dotato»: la sezione 1 non parte da zero). */
export function quotaProgresso(sezione: number): number {
  return Math.min(1, sezione / TOTALE_SEZIONI);
}
