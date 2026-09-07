/**
 * Tassonomia del form: i riquadri e i chip che il lead tocca invece di scrivere.
 * Nicchia: edilizia e affini (decisione Mattia, 2026-09-07). I testi sono quelli
 * del documento «Domande del form bozza» v4. `valoreBrief` conserva, dove serve,
 * la stringa che il vecchio form Tally produceva, così l'import nell'editor
 * resta compatibile con contesto.json e palette.
 *
 * Per aggiungere un mestiere: una voce in MESTIERI e la sua lista in LAVORI.
 */
import type { NomeIcona } from "../lib/icone";

export interface Opzione {
  id: string;
  testo: string;
  /** Sotto-testo breve nel riquadro (facoltativo). */
  nota?: string;
  icona?: NomeIcona;
  /** Se presente, la scelta apre una casella di testo con questa etichetta. */
  testoLibero?: string;
  valoreBrief?: string;
}

export const MESTIERI: readonly Opzione[] = [
  { id: "impresa-edile", testo: "Impresa edile", icona: "casa" },
  { id: "ristrutturazioni", testo: "Ristrutturazioni", icona: "martello" },
  { id: "idraulico", testo: "Idraulico", icona: "chiave" },
  { id: "elettricista", testo: "Elettricista", icona: "fulmine" },
  { id: "cartongesso", testo: "Cartongesso e controsoffitti", icona: "strati" },
  { id: "serramenti", testo: "Serramenti", icona: "porta" },
  { id: "imbianchino", testo: "Imbianchino", icona: "rullo" },
  { id: "altro", testo: "Altro", icona: "altro", testoLibero: "Scrivi il tuo mestiere" },
];

const lavori = (voci: string[]): Opzione[] =>
  voci.map((testo) => ({ id: testo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), testo }));

/** Lavori proposti per ogni mestiere; «Altro» apre sempre la casella. */
export const LAVORI: Record<string, readonly Opzione[]> = {
  "impresa-edile": lavori([
    "Costruzioni nuove",
    "Ristrutturazioni complete",
    "Ampliamenti e sopraelevazioni",
    "Rifacimento tetti",
    "Facciate e cappotti termici",
    "Impermeabilizzazioni",
    "Opere murarie e demolizioni",
    "Pavimenti e rivestimenti",
    "Intonaci e rasature",
    "Bagni e cucine",
    "Lavori chiavi in mano",
    "Manutenzioni condominiali",
  ]),
  ristrutturazioni: lavori([
    "Ristrutturazioni complete",
    "Bagni",
    "Cucine",
    "Pavimenti e rivestimenti",
    "Cartongesso e controsoffitti",
    "Tinteggiature",
    "Impianti idraulici",
    "Impianti elettrici",
    "Infissi e porte",
    "Facciate e cappotti",
    "Negozi e uffici",
    "Lavori chiavi in mano",
  ]),
  idraulico: lavori([
    "Impianti idraulici nuovi",
    "Rifacimento bagni",
    "Caldaie e scaldabagni",
    "Riscaldamento a pavimento",
    "Condizionatori",
    "Pompe di calore",
    "Pannelli solari termici",
    "Riparazioni e perdite",
    "Sanitari e rubinetteria",
    "Impianti gas",
    "Manutenzione caldaie",
    "Pronto intervento",
  ]),
  elettricista: lavori([
    "Impianti elettrici nuovi",
    "Rifacimento impianti",
    "Domotica",
    "Fotovoltaico",
    "Illuminazione a LED",
    "Videosorveglianza e antifurto",
    "Citofoni e videocitofoni",
    "Quadri elettrici",
    "Certificazioni di conformità",
    "Riparazioni e guasti",
    "Ricarica auto elettriche",
    "Pronto intervento",
  ]),
  cartongesso: lavori([
    "Controsoffitti",
    "Pareti divisorie",
    "Velette e faretti",
    "Isolamento acustico",
    "Isolamento termico",
    "Librerie e nicchie",
    "Rasature e finiture",
    "Cabine armadio",
    "Contropareti",
    "Tinteggiature",
  ]),
  serramenti: lavori([
    "Finestre in PVC",
    "Finestre in alluminio",
    "Finestre in legno",
    "Porte interne",
    "Portoni blindati",
    "Persiane e tapparelle",
    "Zanzariere",
    "Vetrate e verande",
    "Portoni da garage",
    "Riparazioni e sostituzioni",
  ]),
  imbianchino: lavori([
    "Tinteggiature interne",
    "Tinteggiature esterne",
    "Decorazioni e stucchi",
    "Cartongesso",
    "Rasature",
    "Carta da parati",
    "Trattamento muffa e umidità",
    "Verniciatura ringhiere e infissi",
    "Resine per pareti",
    "Pitture speciali",
  ]),
  altro: lavori(["Ristrutturazioni", "Costruzioni", "Impianti", "Finiture", "Esterni e giardini", "Manutenzioni"]),
};

export const ALTRO_LAVORO: Opzione = { id: "altro", testo: "Altro", testoLibero: "Scrivi che lavoro è, anche in due parole" };

export const ANNI: readonly Opzione[] = [
  { id: "meno-1", testo: "Meno di 1 anno", valoreBrief: "<1" },
  { id: "1-3", testo: "Da 1 a 3 anni", valoreBrief: "1-3" },
  { id: "4-10", testo: "Da 4 a 10 anni", valoreBrief: "4-10" },
  { id: "11-20", testo: "Da 11 a 20 anni", valoreBrief: "11-20" },
  { id: "oltre-20", testo: "Più di 20 anni", valoreBrief: ">20" },
];

export const PUNTI_DI_FORZA: readonly Opzione[] = [
  { id: "sopralluogo-gratuito", testo: "Sopralluogo gratuito" },
  { id: "preventivo-24h", testo: "Preventivo entro 24 ore" },
  { id: "referente-unico", testo: "Un solo referente" },
  { id: "squadra-propria", testo: "Squadra nostra, niente subappalti" },
  { id: "chiavi-in-mano", testo: "Lavori chiavi in mano" },
  { id: "tempi", testo: "Rispettiamo i tempi" },
  { id: "garanzia", testo: "Garanzia scritta" },
  { id: "certificazioni", testo: "Certificazioni", testoLibero: "Quali certificazioni?" },
  { id: "cantiere-pulito", testo: "Puliamo il cantiere ogni giorno" },
  { id: "altro", testo: "Altro", testoLibero: "Scrivi cosa ti distingue" },
];

export const CLIENTI: readonly Opzione[] = [
  { id: "privati", testo: "Privati", nota: "case e appartamenti" },
  { id: "condomini", testo: "Condomini e amministratori" },
  { id: "negozi", testo: "Negozi, bar e ristoranti" },
  { id: "uffici", testo: "Uffici e aziende" },
  { id: "industrie", testo: "Capannoni e industrie" },
  { id: "agenzie", testo: "Agenzie immobiliari" },
  { id: "imprese", testo: "Costruttori e altre imprese edili" },
  { id: "studi", testo: "Architetti, geometri e studi tecnici" },
  { id: "alberghi", testo: "Alberghi e strutture ricettive" },
  { id: "enti", testo: "Enti pubblici" },
  { id: "altro", testo: "Altro", testoLibero: "Scrivi chi sono" },
];

/** Le 6 atmosfere di sempre, con parole più semplici; valoreBrief = stringa del vecchio Tally. */
export const STILI: readonly Opzione[] = [
  { id: "pulito", testo: "Pulito ed essenziale", valoreBrief: "Minimale e pulito" },
  { id: "allegro", testo: "Colorato e allegro", valoreBrief: "Colorato e vivace" },
  { id: "elegante", testo: "Elegante", valoreBrief: "Elegante e sofisticato" },
  { id: "tecnico", testo: "Tecnico e professionale", valoreBrief: "Tecnico e professionale" },
  { id: "caldo", testo: "Caldo e artigianale", valoreBrief: "Caldo e artigianale" },
  { id: "deciso", testo: "Moderno e deciso", valoreBrief: "Moderno e audace" },
];

export interface Colore {
  id: string;
  testo: string;
  hex: string;
}

export const COLORI: readonly Colore[] = [
  { id: "blu", testo: "Blu", hex: "#1d4ed8" },
  { id: "azzurro", testo: "Azzurro", hex: "#38bdf8" },
  { id: "verde", testo: "Verde", hex: "#16a34a" },
  { id: "verde-scuro", testo: "Verde scuro", hex: "#14532d" },
  { id: "rosso", testo: "Rosso", hex: "#dc2626" },
  { id: "arancione", testo: "Arancione", hex: "#ea580c" },
  { id: "giallo", testo: "Giallo", hex: "#facc15" },
  { id: "oro", testo: "Oro", hex: "#ca8a04" },
  { id: "marrone", testo: "Marrone", hex: "#78350f" },
  { id: "nero", testo: "Nero", hex: "#111827" },
  { id: "grigio", testo: "Grigio", hex: "#6b7280" },
  { id: "bianco", testo: "Bianco", hex: "#f8fafc" },
];

export const CONTATTO: readonly Opzione[] = [
  { id: "whatsapp", testo: "WhatsApp", icona: "messaggio", valoreBrief: "WhatsApp" },
  { id: "telefonata", testo: "Telefonata", icona: "telefono", valoreBrief: "Telefonata" },
];
