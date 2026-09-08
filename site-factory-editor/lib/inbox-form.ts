import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OUT_DIR, clientDir } from "./paths.ts";
import { normalizeToJpg } from "./lavori.ts";
import type { Lavori } from "./schemas.ts";
// Import con estensione e nessuna dipendenza da lib/clients.ts: così il banco di prova
// (scripts/test-import-form.ts) gira con `node --experimental-strip-types`.

/**
 * Testi della tassonomia del form (site-intake/src/data/tassonomia.ts), id → testo o
 * valoreBrief. È una COPIA: Turbopack non importa moduli fuori dalla radice dell'editor.
 * Il banco di prova la confronta con l'originale: se il form cambia, il test lo dice.
 */
export const TESTI = {
  mestieri: { "impresa-edile": "Impresa edile", ristrutturazioni: "Ristrutturazioni", idraulico: "Idraulico", elettricista: "Elettricista", cartongesso: "Cartongesso e controsoffitti", serramenti: "Serramenti", imbianchino: "Imbianchino", altro: "Altro" },
  lavori: {
    "impresa-edile": { "costruzioni-nuove": "Costruzioni nuove", "ristrutturazioni-complete": "Ristrutturazioni complete", "ampliamenti-e-sopraelevazioni": "Ampliamenti e sopraelevazioni", "rifacimento-tetti": "Rifacimento tetti", "facciate-e-cappotti-termici": "Facciate e cappotti termici", impermeabilizzazioni: "Impermeabilizzazioni", "opere-murarie-e-demolizioni": "Opere murarie e demolizioni", "pavimenti-e-rivestimenti": "Pavimenti e rivestimenti", "intonaci-e-rasature": "Intonaci e rasature", "bagni-e-cucine": "Bagni e cucine", "lavori-chiavi-in-mano": "Lavori chiavi in mano", "manutenzioni-condominiali": "Manutenzioni condominiali" },
    ristrutturazioni: { "ristrutturazioni-complete": "Ristrutturazioni complete", bagni: "Bagni", cucine: "Cucine", "pavimenti-e-rivestimenti": "Pavimenti e rivestimenti", "cartongesso-e-controsoffitti": "Cartongesso e controsoffitti", tinteggiature: "Tinteggiature", "impianti-idraulici": "Impianti idraulici", "impianti-elettrici": "Impianti elettrici", "infissi-e-porte": "Infissi e porte", "facciate-e-cappotti": "Facciate e cappotti", "negozi-e-uffici": "Negozi e uffici", "lavori-chiavi-in-mano": "Lavori chiavi in mano" },
    idraulico: { "impianti-idraulici-nuovi": "Impianti idraulici nuovi", "rifacimento-bagni": "Rifacimento bagni", "caldaie-e-scaldabagni": "Caldaie e scaldabagni", "riscaldamento-a-pavimento": "Riscaldamento a pavimento", condizionatori: "Condizionatori", "pompe-di-calore": "Pompe di calore", "pannelli-solari-termici": "Pannelli solari termici", "riparazioni-e-perdite": "Riparazioni e perdite", "sanitari-e-rubinetteria": "Sanitari e rubinetteria", "impianti-gas": "Impianti gas", "manutenzione-caldaie": "Manutenzione caldaie", "pronto-intervento": "Pronto intervento" },
    elettricista: { "impianti-elettrici-nuovi": "Impianti elettrici nuovi", "rifacimento-impianti": "Rifacimento impianti", domotica: "Domotica", fotovoltaico: "Fotovoltaico", "illuminazione-a-led": "Illuminazione a LED", "videosorveglianza-e-antifurto": "Videosorveglianza e antifurto", "citofoni-e-videocitofoni": "Citofoni e videocitofoni", "quadri-elettrici": "Quadri elettrici", "certificazioni-di-conformit": "Certificazioni di conformità", "riparazioni-e-guasti": "Riparazioni e guasti", "ricarica-auto-elettriche": "Ricarica auto elettriche", "pronto-intervento": "Pronto intervento" },
    cartongesso: { controsoffitti: "Controsoffitti", "pareti-divisorie": "Pareti divisorie", "velette-e-faretti": "Velette e faretti", "isolamento-acustico": "Isolamento acustico", "isolamento-termico": "Isolamento termico", "librerie-e-nicchie": "Librerie e nicchie", "rasature-e-finiture": "Rasature e finiture", "cabine-armadio": "Cabine armadio", contropareti: "Contropareti", tinteggiature: "Tinteggiature" },
    serramenti: { "finestre-in-pvc": "Finestre in PVC", "finestre-in-alluminio": "Finestre in alluminio", "finestre-in-legno": "Finestre in legno", "porte-interne": "Porte interne", "portoni-blindati": "Portoni blindati", "persiane-e-tapparelle": "Persiane e tapparelle", zanzariere: "Zanzariere", "vetrate-e-verande": "Vetrate e verande", "portoni-da-garage": "Portoni da garage", "riparazioni-e-sostituzioni": "Riparazioni e sostituzioni" },
    imbianchino: { "tinteggiature-interne": "Tinteggiature interne", "tinteggiature-esterne": "Tinteggiature esterne", "decorazioni-e-stucchi": "Decorazioni e stucchi", cartongesso: "Cartongesso", rasature: "Rasature", "carta-da-parati": "Carta da parati", "trattamento-muffa-e-umidit": "Trattamento muffa e umidità", "verniciatura-ringhiere-e-infissi": "Verniciatura ringhiere e infissi", "resine-per-pareti": "Resine per pareti", "pitture-speciali": "Pitture speciali" },
    altro: { ristrutturazioni: "Ristrutturazioni", costruzioni: "Costruzioni", impianti: "Impianti", finiture: "Finiture", "esterni-e-giardini": "Esterni e giardini", manutenzioni: "Manutenzioni" },
  } as Record<string, Record<string, string>>,
  anni: { "meno-1": "<1", "1-3": "1-3", "4-10": "4-10", "11-20": "11-20", "oltre-20": ">20" },
  punti: { "sopralluogo-gratuito": "Sopralluogo gratuito", "preventivo-24h": "Preventivo entro 24 ore", "referente-unico": "Un solo referente", "squadra-propria": "Squadra nostra, niente subappalti", "chiavi-in-mano": "Lavori chiavi in mano", tempi: "Rispettiamo i tempi", garanzia: "Garanzia scritta", certificazioni: "Certificazioni", "cantiere-pulito": "Puliamo il cantiere ogni giorno", altro: "Altro" },
  clienti: { privati: "Privati", condomini: "Condomini e amministratori", negozi: "Negozi, bar e ristoranti", uffici: "Uffici e aziende", industrie: "Capannoni e industrie", agenzie: "Agenzie immobiliari", imprese: "Costruttori e altre imprese edili", studi: "Architetti, geometri e studi tecnici", alberghi: "Alberghi e strutture ricettive", enti: "Enti pubblici", altro: "Altro" },
  stili: { pulito: "Minimale e pulito", allegro: "Colorato e vivace", elegante: "Elegante e sofisticato", tecnico: "Tecnico e professionale", caldo: "Caldo e artigianale", deciso: "Moderno e audace" },
  colori: { blu: "Blu", azzurro: "Azzurro", verde: "Verde", "verde-scuro": "Verde scuro", rosso: "Rosso", arancione: "Arancione", giallo: "Giallo", oro: "Oro", marrone: "Marrone", nero: "Nero", grigio: "Grigio", bianco: "Bianco" },
  contatto: { whatsapp: "WhatsApp", telefonata: "Telefonata" },
} satisfies Record<string, Record<string, unknown>>;

/** Le risposte del form (specchio di `Risposte` in site-intake/src/data/domande.ts). */
export interface Risposte {
  mestiere?: { id: string; altro?: string };
  lavori?: { ids: string[]; altro?: string };
  azienda?: string;
  nome_sito?: { nome: string; esito: "libero" | "preso" | "sconosciuto" };
  sede?: { comune: string; provincia: string; provinciaNome?: string; regione: string; cap: string; via: string; senzaCivico?: boolean; daVerificare?: boolean };
  zone?: string[];
  esperienza_anni?: { id: string };
  sito_attuale?: string;
  telefono?: string;
  foto?: number;
  logo?: { nome?: string; nessuno?: boolean };
  punti_di_forza?: { ids: string[]; altro?: string; certificazioni?: string };
  clienti?: { ids: string[]; altro?: string };
  stile?: string[];
  colori?: { ids: string[]; testo?: string; nessuno?: boolean };
  referente?: string;
  email?: string;
  partita_iva?: { valore: string; daVerificare?: boolean };
  social?: { facebook?: string; instagram?: string; tiktok?: string };
  ricontatto?: { id: string };
  consenso?: boolean;
}

/** Scrittura atomica come lib/clients.ts writeJson (copiata: quel modulo non gira sotto strip-types). */
function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(file + ".tmp", JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(file + ".tmp", file);
}

// Unica fonte dei clienti (Tally dismesso il 2026-09-08): le richieste del form
// sito.consulbuild.com che n8n (infra/n8n/bozza.json) lascia nel Drive dell'agenzia,
// sincronizzato dal Mac in _inbox/<leadId>/ {lead.json, bozza.json, foto-NN-<nome>,
// logo.<ext>}. Una richiesta è completa solo se c'è lead.json (bozza.json da sola =
// abbandonata: non si importa, la pulizia notturna la cestina dopo 60 giorni).
// Import = copia in out/<slug>/ + cancellazione da _inbox (nella cartella sincronizzata
// la cancellazione finisce nel Cestino di Drive): non dipende dal symlink di out/.
// La mappa risposte → brief segue le annotazioni `campo:` di
// site-intake/src/data/domande.ts; i testi vengono dalla tassonomia del form.

export const INBOX_DIR =
  process.env.SF_INBOX_DIR ??
  path.join(os.homedir(), "Library/CloudStorage/GoogleDrive-info@consulbuild.com/Il mio Drive/site-factory-clienti/_inbox");

const ID_OK = /^[a-z0-9-]{8,64}$/i;
const MAX_FOTO = 12; // limite della Gallery (schema renderer): le altre restano tra gli originali

interface VoceFile {
  n: number;
  kind: "foto" | "logo";
  nome: string;
  bytes: number;
  tipo: string;
  stato: string;
}
export interface LeadForm {
  versione: number;
  formVersione: string;
  leadId: string;
  iniziatoAt: string;
  inviatoAt: string;
  risposte: Risposte;
  foto: VoceFile[];
  fotoAttese: number;
  fotoArrivate: number;
  logo: VoceFile | null;
  origine: { utm: Record<string, string>; ua: string };
}

export interface RichiestaForm {
  id: string;
  submittedAt: string;
  businessName: string;
  ownerName: string;
  phone: string;
  fonte: "form";
}

export class LeadNonPronto extends Error {}

function leggiLead(id: string): LeadForm | null {
  try {
    const lead = JSON.parse(fs.readFileSync(path.join(INBOX_DIR, id, "lead.json"), "utf8")) as LeadForm;
    return lead && typeof lead === "object" && lead.risposte ? lead : null;
  } catch {
    return null;
  }
}

/** Richieste complete in _inbox, le più recenti prima. Cartella assente = nessuna. */
export function listLeadsForm(): RichiestaForm[] {
  if (!fs.existsSync(INBOX_DIR)) return [];
  const righe: RichiestaForm[] = [];
  for (const e of fs.readdirSync(INBOX_DIR, { withFileTypes: true })) {
    if (!e.isDirectory() || !ID_OK.test(e.name)) continue;
    const lead = leggiLead(e.name);
    if (!lead) continue;
    righe.push({
      id: e.name,
      submittedAt: lead.inviatoAt,
      businessName: lead.risposte.azienda ?? "",
      ownerName: lead.risposte.referente ?? "",
      phone: lead.risposte.telefono ?? "",
      fonte: "form",
    });
  }
  return righe.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export const isLeadForm = (id: string): boolean => ID_OK.test(id) && fs.existsSync(path.join(INBOX_DIR, id, "lead.json"));

// Stesso nome che dà n8n ai file (nodo «Prepara» in infra/n8n/bozza.json) e dev/inbox.mjs.
const pulisciNome = (nome: string) =>
  nome.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").toLowerCase().slice(0, 80) || "file";
const nomeServer = (v: VoceFile) => (v.kind === "logo" ? `logo${(/\.[a-z0-9]+$/i.exec(v.nome)?.[0] ?? ".bin").toLowerCase()}` : `foto-${String(v.n).padStart(2, "0")}-${pulisciNome(v.nome)}`);

// Regola kebab storica (stessa dell'import Tally dismesso): stesso slug per la
// stessa ragione sociale, così i clienti importati prima restano deduplicati.
const slugDi = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const testoDi = (tabella: Record<string, string>, id: string) => tabella[id] ?? id;

/** risposte → brief.json (input del context-enricher) + intake.json (11 slot). */
export function mappaLead(lead: LeadForm, logoSrc: string | null) {
  const r = lead.risposte;
  const flag: string[] = [];

  const mestiere = r.mestiere?.id ?? "";
  const settore = mestiere === "altro" ? (r.mestiere?.altro ?? "").trim() : testoDi(TESTI.mestieri, mestiere);
  const lavoriOpz = TESTI.lavori[mestiere] ?? TESTI.lavori["altro"] ?? {};
  const servizi = (r.lavori?.ids ?? []).filter((id) => id !== "altro").map((id) => testoDi(lavoriOpz, id));
  if (r.lavori?.altro?.trim()) servizi.push(r.lavori.altro.trim());

  const sede = r.sede;
  const via = sede?.via?.trim() ?? "";
  const indirizzo = sede
    ? [`${via}${sede.senzaCivico ? " (senza numero civico)" : ""}`, [sede.cap, sede.comune].filter(Boolean).join(" ") + (sede.provincia ? ` (${sede.provincia})` : "")]
        .filter((p) => p.trim())
        .join(", ")
    : "";
  if (sede?.daVerificare) flag.push(`comune scritto a mano, non trovato nell'elenco: "${sede.comune}"`);
  if (sede && !sede.cap) flag.push(`CAP vuoto: ${sede.comune} ha più CAP, ricavarlo dalla via "${via}"`);
  if (sede?.senzaCivico) flag.push(`indirizzo senza numero civico: "${via}"`);
  if (r.partita_iva?.daVerificare) flag.push(`partita IVA da controllare: "${r.partita_iva.valore}" (checksum non valido)`);
  if (r.nome_sito && r.nome_sito.esito !== "libero") flag.push(`nome sito "${r.nome_sito.nome}.it" risultato ${r.nome_sito.esito === "preso" ? "già preso" : "non verificabile"}: ricontrollare prima dell'acquisto`);
  if (lead.fotoArrivate < lead.fotoAttese) flag.push(`foto arrivate ${lead.fotoArrivate} su ${lead.fotoAttese}: chiedere le mancanti`);
  if (!r.email) flag.push("e-mail assente");

  const punti = (r.punti_di_forza?.ids ?? []).filter((id) => id !== "altro" && id !== "certificazioni").map((id) => testoDi(TESTI.punti, id));
  if (r.punti_di_forza?.ids?.includes("certificazioni")) punti.push(`Certificazioni: ${r.punti_di_forza.certificazioni?.trim() || "(non indicate)"}`);
  if (r.punti_di_forza?.altro?.trim()) punti.push(r.punti_di_forza.altro.trim());

  const clienti = (r.clienti?.ids ?? []).filter((id) => id !== "altro").map((id) => testoDi(TESTI.clienti, id));
  if (r.clienti?.altro?.trim()) clienti.push(r.clienti.altro.trim());

  const colori = r.colori?.nessuno
    ? "Nessuna preferenza"
    : [(r.colori?.ids ?? []).map((id) => testoDi(TESTI.colori, id)).join(", "), r.colori?.testo?.trim()].filter(Boolean).join(" — ");
  const tono = (r.stile ?? []).map((id) => testoDi(TESTI.stili, id)).join(", ");
  const social = Object.fromEntries(Object.entries(r.social ?? {}).filter(([, v]) => typeof v === "string" && v.trim()));
  const telefono = r.telefono ?? "";
  const azienda = (r.azienda ?? "").trim();

  const brief = {
    submissionId: lead.leadId,
    submittedAt: lead.inviatoAt,
    fonte: "form",
    formVersione: lead.formVersione,
    azienda,
    settore,
    servizi,
    descrizione: "", // il form non lo chiede: niente invenzioni (regola 5)
    partita_iva: r.partita_iva?.valore ?? "",
    anno_inizio: "",
    esperienza_anni: r.esperienza_anni ? testoDi(TESTI.anni, r.esperienza_anni.id) : "",
    indirizzo,
    citta: sede?.comune ?? "",
    provincia: sede?.provincia ?? "",
    regione: sede?.regione ?? "",
    social,
    obiettivi_sito: [] as string[],
    azione_principale: "",
    clienti: clienti.join(", "),
    cliente_tipo: clienti.join(", "),
    area_geografica: (r.zone ?? []).join(", "),
    canali_attuali: [] as string[],
    logo: logoSrc ? "Sì (dal form)" : r.logo?.nessuno ? "No, da creare" : "No",
    foto_professionali: `${lead.fotoArrivate} foto dal form`,
    sito_attuale: r.sito_attuale ?? "",
    problemi_sito_attuale: "",
    tono_preferito: tono,
    colori,
    da_evitare: "",
    punti_di_forza: punti,
    dominio_scelto: r.nome_sito ? `${r.nome_sito.nome}.it (${r.nome_sito.esito})` : "",
    referente: r.referente ?? "",
    email: r.email ?? "",
    telefono,
    ricontatto_preferito: r.ricontatto ? testoDi(TESTI.contatto, r.ricontatto.id) : "",
    origine: lead.origine?.utm ?? {},
    _da_verificare: flag,
  };

  const intake = {
    "meta.businessName": azienda,
    "meta.industry": settore,
    "meta.city": sede?.comune ?? "",
    "meta.slug": slugDi(azienda),
    "contact.phone": telefono,
    "contact.whatsapp": telefono, // le PMI usano lo stesso numero; correggere al checkpoint se serve
    "contact.email": r.email ?? "",
    "contact.address": indirizzo,
    "contact.social": social,
    "brand.logo": logoSrc ? { src: logoSrc, alt: `Logo ${azienda}` } : null,
    "brand.tone": tono,
  };
  return { brief, intake };
}

export class SlugEsistente extends Error {
  slug: string; // niente parameter property: il banco di prova gira con --experimental-strip-types
  constructor(slug: string) {
    super(`slug già esistente: ${slug}`);
    this.slug = slug;
  }
}

/** Un file di _inbox è pronto solo se Drive Desktop l'ha scaricato per intero. */
function fileSincronizzato(file: string, bytes: number): boolean {
  try {
    return fs.statSync(file).size === bytes;
  } catch {
    return false;
  }
}

/**
 * Import di una richiesta del form → out/<slug>/: dir temporanea, poi rename;
 * con overwrite (stesso slug già esistente) si preservano client.json e
 * contesto.json. Alla fine la cartella sparisce da _inbox.
 */
export function importLeadForm(id: string, overwrite = false): string {
  if (!ID_OK.test(id)) throw new Error("id non valido");
  const src = path.join(INBOX_DIR, id);
  const lead = leggiLead(id);
  if (!lead) throw new Error("richiesta non trovata in _inbox");
  if (!lead.risposte.azienda?.trim()) throw new Error("richiesta senza nome azienda: non importabile");

  // Prima di scrivere: tutti i file del manifesto devono essere scaricati.
  const voci = [...lead.foto.filter((f) => f.stato === "fatto").sort((a, b) => a.n - b.n), ...(lead.logo?.stato === "fatto" ? [lead.logo] : [])];
  for (const v of voci) {
    if (!fileSincronizzato(path.join(src, nomeServer(v)), v.bytes)) {
      throw new LeadNonPronto(`«${v.nome}» non è ancora scaricato da Google Drive: riprova tra qualche secondo`);
    }
  }

  const logoVoce = lead.logo?.stato === "fatto" ? lead.logo : null;
  const { brief, intake } = mappaLead(lead, logoVoce ? `./${nomeServer(logoVoce)}` : null);
  const slug = String(intake["meta.slug"]);
  if (!slug) throw new Error("slug vuoto");
  const dest = clientDir(slug);
  if (fs.existsSync(dest) && !overwrite) throw new SlugEsistente(slug);

  const tmpDir = path.join(OUT_DIR, `.import-${id}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(tmpDir, "img"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "foto-originali"), { recursive: true });

  if (logoVoce) fs.copyFileSync(path.join(src, nomeServer(logoVoce)), path.join(tmpDir, nomeServer(logoVoce)));
  const lavori: Lavori = [];
  for (const v of lead.foto.filter((f) => f.stato === "fatto").sort((a, b) => a.n - b.n)) {
    const orig = path.join(src, nomeServer(v));
    fs.copyFileSync(orig, path.join(tmpDir, "foto-originali", nomeServer(v)));
    if (lavori.length < MAX_FOTO) {
      const nome = `lavoro-${lavori.length + 1}.jpg`;
      normalizeToJpg(orig, path.join(tmpDir, "img", nome));
      lavori.push({ file: nome, alt: "", caption: "" });
    }
  }
  if (lead.foto.filter((f) => f.stato === "fatto").length > MAX_FOTO) {
    brief._da_verificare.push(`${lead.fotoArrivate} foto: in Gallery ne entrano ${MAX_FOTO}, le altre sono in foto-originali/`);
  }

  writeJson(path.join(tmpDir, "intake.json"), intake);
  writeJson(path.join(tmpDir, "brief.json"), brief);
  writeJson(path.join(tmpDir, "raw-submission.json"), lead); // il «grezzo» letto dal context-enricher
  writeJson(path.join(tmpDir, "lavori.json"), lavori);

  if (fs.existsSync(dest)) {
    // Re-import: sovrascrive gli artifact ma preserva client.json e contesto.json
    // (non stanno nella dir temporanea, quindi la copia non li tocca).
    fs.cpSync(tmpDir, dest, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } else {
    fs.renameSync(tmpDir, dest);
  }

  // client.json: stati preservati in overwrite, intake da verificare. Un lead
  // del form nasce in percorso «demo» (lib/schemas.ts); catena/demo di un
  // eventuale cliente sovrascritto si preservano come gli step.
  const now = new Date().toISOString();
  const prev = fs.existsSync(path.join(dest, "client.json")) ? JSON.parse(fs.readFileSync(path.join(dest, "client.json"), "utf8")) : null;
  writeJson(path.join(dest, "client.json"), {
    version: 1,
    submissionId: id,
    importedAt: prev?.importedAt ?? now,
    updatedAt: now,
    steps: { ...(prev?.steps ?? {}), intake: { stato: "da_verificare" }, contesto: prev?.steps?.contesto ?? { stato: "assente" } },
    percorso: prev?.percorso ?? "demo",
    ...(prev?.catena ? { catena: prev.catena } : {}),
    ...(prev?.demo ? { demo: prev.demo } : {}),
  });

  fs.rmSync(src, { recursive: true, force: true }); // nella cartella sincronizzata = Cestino di Drive
  return slug;
}
