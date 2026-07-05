// intake-tally.ts — intake deterministico via API pull di Tally (niente AI qui).
// Scarica una submission del form e produce l'artifact `intake.json` (gli 11 slot
// agent:"intake" di slots.json, mappa path→valore) + `brief.json` (tutte le
// domanda→risposta normalizzate, input per il Copywriter) + `raw-submission.json`
// (audit). Il logo FILE_UPLOAD viene scaricato SUBITO (l'URL Tally ha un token a
// scadenza non documentata: mai hot-linkare).
//
// Fonte: GET https://api.tally.so/forms/{formId}/submissions (Bearer TALLY_API_KEY,
// da env o da site-renderer/.env). Decisione 2026-07-05 (docs/decisions §2): il pull
// API è la fonte primaria della Fase 1 — a differenza del payload webhook, l'API
// restituisce le opzioni di MULTIPLE_CHOICE/CHECKBOXES GIÀ RISOLTE in testo (niente
// lookup UUID→options). Il mapping è ancorato agli `id` delle question (stabili),
// mai ai `title` (modificabili) — congelato sulla response reale del 2026-07-05.
//
// Uso (da site-renderer/):
//   node --experimental-strip-types scripts/intake-tally.ts --list
//   node --experimental-strip-types scripts/intake-tally.ts [--submission <id> | --latest] -o out/intake-<slug>
//
// Exit 0 ok · 1 dati/API invalidi · 2 errore d'uso (key mancante, argomenti).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const FORM_ID = process.env.TALLY_FORM_ID ?? "QKOx9Y"; // "Iniziamo a costruire il tuo sito web 2.0"

/* ------------------------------------------------------------------ */
/* Mapping dichiarativo question-id → significato (congelato sul form  */
/* reale QKOx9Y; se il form cambia, aggiornare SOLO questa tabella).   */
/* ------------------------------------------------------------------ */
const Q = {
  businessName: "xZg2g9", // Come si chiama la tua azienda o attività?
  industry: "RL2R2v", //     In quale settore operi?
  description: "oOgog5", //  Descrivi in poche righe cosa fa la tua azienda…
  piva: "52rvKd", //         Partita IVA
  yearActive: "G0kLkQ", //   Da che anno è attiva…
  address: "O0rLrk", //      Indirizzo completo della sede
  socialChecked: "V8qVqN", // Su quali canali social sei presente?
  socialLinks: "P04l4P", //  Incolla qui i link ai tuoi profili social
  goals: "E0ALAA", //        Quali risultati concreti ti aspetti dal sito?
  goalsOther: "rEgVgp", //   Se hai selezionato altro…
  mainAction: "4jELEd", //   Azione più importante del visitatore
  clientKind: "jxgLgY", //   I tuoi clienti sono principalmente
  clientType: "2rVLVg", //   Descrivi il tuo cliente tipo
  area: "xZg2gE", //         Area geografica dei clienti
  channels: "ZJWlWA", //     Come ti trovano oggi i tuoi clienti?
  hasLogo: "N0ELEN", //      Hai un logo?
  logoUpload: "qPgOg8", //   Carica qui il tuo logo (FILE_UPLOAD)
  hasPhotos: "Q0jdjl", //    Disponi di foto professionali…
  hasWebsite: "W0QPQL", //   Hai un sito web attuale?
  websiteIssues: "aGk0kW", // Se sì, cosa non funziona…
  atmosphere: "6x4R4o", //   Che atmosfera vorresti trasmettere? → brand.tone
  hasColors: "7Zjoj6", //    Hai dei colori aziendali già definiti?
  colors: "bOgLg0", //       Se hai colori di riferimento, indicali
  avoid: "A8axao", //        Cosa non vuoi assolutamente nel sito?
  ownerName: "BB6Zg4", //    Nome e cognome
  ownerRole: "kZg5pd", //    Ruolo in azienda
  email: "v2g4pX", //        Email della azienda
  phone: "K0OLgz", //        Telefono della azienda
  recontact: "L0VXgz", //    Come preferisci essere ricontattato?
} as const;

/* ------------------------------------------------------------------ */
/* CLI + API key (da env o .env locale, mai in argv)                   */
/* ------------------------------------------------------------------ */
const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const latest = args.includes("--latest");
const subFlag = args.indexOf("--submission");
const wantedId = subFlag >= 0 ? args[subFlag + 1] : null;
const outFlag = args.indexOf("-o");
const outDir = outFlag >= 0 ? args[outFlag + 1] : null;

function apiKey(): string {
  if (process.env.TALLY_API_KEY) return process.env.TALLY_API_KEY;
  if (existsSync(".env")) {
    const m = readFileSync(".env", "utf8").match(/^TALLY_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  console.error("TALLY_API_KEY mancante: mettila in site-renderer/.env (gitignored) o come env var.");
  process.exit(2);
}

if (!listOnly && !outDir) {
  console.error("uso: intake-tally.ts --list | [--submission <id> | --latest] -o <outdir>");
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/* Fetch + selezione submission                                        */
/* ------------------------------------------------------------------ */
type Answer = string | number | string[] | Array<{ id: string; name: string; url: string }> | null;
type ApiResponse = {
  questions: Array<{ id: string; type: string; title: string }>;
  submissions: Array<{ id: string; submittedAt: string; responses: Array<{ questionId: string; answer: Answer }> }>;
};

const res = await fetch(`https://api.tally.so/forms/${FORM_ID}/submissions`, {
  headers: { Authorization: `Bearer ${apiKey()}` },
});
if (!res.ok) {
  console.error(`API Tally: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  process.exit(1);
}
const data = (await res.json()) as ApiResponse;
if (!Array.isArray(data.questions) || !Array.isArray(data.submissions)) {
  console.error("Response API inattesa: mancano questions/submissions — struttura cambiata? Loggare e aggiornare il parser.");
  process.exit(1);
}

if (listOnly) {
  for (const s of data.submissions) {
    const name = s.responses.find((r) => r.questionId === Q.businessName)?.answer ?? "?";
    console.log(`${s.id}  ${s.submittedAt}  ${name}`);
  }
  process.exit(0);
}

const submission = wantedId
  ? data.submissions.find((s) => s.id === wantedId)
  : latest
    ? [...data.submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
    : data.submissions.length === 1
      ? data.submissions[0]
      : null;
if (!submission) {
  console.error(wantedId ? `submission "${wantedId}" non trovata.` : `${data.submissions.length} submission nel form: scegli con --submission <id> o --latest (elenco: --list)`);
  process.exit(2);
}

const ans = new Map(submission.responses.map((r) => [r.questionId, r.answer]));
const text = (qid: string): string => {
  const v = ans.get(qid);
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim();
  if (typeof v === "number") return String(v);
  return "";
};
const multi = (qid: string): string[] => {
  const v = ans.get(qid);
  return Array.isArray(v) ? (v as string[]).filter((x) => typeof x === "string").map((x) => x.trim()) : [];
};

/* ------------------------------------------------------------------ */
/* Normalizzazioni deterministiche                                     */
/* ------------------------------------------------------------------ */
const review: string[] = []; // campi da verificare a mano al checkpoint
const MARK = "«DA CONFERMARE»";

const businessName = text(Q.businessName);
const email = text(Q.email);
const phone = text(Q.phone);
for (const [field, v] of [["businessName", businessName], ["email", email], ["phone", phone]] as const) {
  if (!v) {
    console.error(`campo obbligatorio vuoto nella submission: ${field}`);
    process.exit(1);
  }
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) review.push(`email sospetta: "${email}"`);

// slug: kebab-case traslitterato (accenti → ASCII)
const slug = businessName
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

// città: euristica dall'indirizzo libero — le parole dopo l'ultimo numero
// (civico o CAP), tolta l'eventuale sigla provincia. Se fallisce → marker.
const address = text(Q.address);
function extractCity(addr: string): string | null {
  const tokens = addr.split(/[\s,]+/).filter(Boolean);
  let lastNum = -1;
  tokens.forEach((t, i) => { if (/^\d+[a-zA-Z]?$/.test(t)) lastNum = i; });
  let tail = tokens.slice(lastNum + 1).filter((t) => !/^\(?[A-Z]{2}\)?$/.test(t));
  return lastNum >= 0 && tail.length ? tail.join(" ") : null;
}
const city = extractCity(address);
if (!city) review.push(`città non estraibile dall'indirizzo "${address}" — inserirla a mano in meta.city`);
if (address && !/\b\d{5}\b/.test(address)) review.push(`indirizzo senza CAP: "${address}"`);

// social: solo i link realmente forniti, classificati per dominio (chiavi dello schema)
const SOCIAL_HOSTS: Array<[RegExp, "instagram" | "facebook" | "tiktok" | "linkedin"]> = [
  [/instagram\.com/i, "instagram"],
  [/facebook\.com|fb\.com/i, "facebook"],
  [/tiktok\.com/i, "tiktok"],
  [/linkedin\.com/i, "linkedin"],
];
const social: Record<string, string> = {};
for (const url of text(Q.socialLinks).match(/https?:\/\/\S+/g) ?? []) {
  const hit = SOCIAL_HOSTS.find(([re]) => re.test(url));
  if (hit) social[hit[1]] = url.replace(/[),.]+$/, "");
}
const declared = multi(Q.socialChecked).filter((s) => s !== "Nessuno al momento" && s !== "Altro");
for (const name of declared) {
  const k = name.toLowerCase().replace(/\s|\(.*\)/g, "");
  if (!Object.keys(social).some((s) => k.includes(s))) review.push(`social dichiarato senza link: ${name}`);
}

// tono: gli aggettivi del form, verbatim in minuscolo
const tone = multi(Q.atmosphere).join(", ").toLowerCase();

// anno attività: non è uno slot intake ma va nel brief — flag se implausibile
const year = text(Q.yearActive);
const yearNum = Number(year);
if (year && (yearNum < 1900 || yearNum > new Date().getFullYear())) review.push(`anno di inizio attività implausibile: "${year}" (forse sono gli ANNI di attività?)`);

/* ------------------------------------------------------------------ */
/* Logo: download immediato                                            */
/* ------------------------------------------------------------------ */
mkdirSync(outDir!, { recursive: true });
let logo: { src: string; alt: string } | null = null;
const uploads = ans.get(Q.logoUpload);
if (Array.isArray(uploads) && uploads.length && typeof uploads[0] === "object") {
  const file = uploads[0] as { name: string; url: string };
  const ext = (file.name.match(/\.(\w+)$/)?.[1] ?? "png").toLowerCase();
  const dl = await fetch(file.url);
  if (!dl.ok) {
    console.error(`download logo fallito (HTTP ${dl.status}) da ${file.url.split("?")[0]} — token scaduto? Rifare il pull.`);
    process.exit(1);
  }
  writeFileSync(join(outDir!, `logo.${ext}`), Buffer.from(await dl.arrayBuffer()));
  logo = { src: `./logo.${ext}`, alt: `Logo ${businessName}` };
  console.log(`logo scaricato: ${outDir}/logo.${ext}`);
}

/* ------------------------------------------------------------------ */
/* Artifact                                                            */
/* ------------------------------------------------------------------ */
const intake = {
  "meta.businessName": businessName,
  "meta.industry": text(Q.industry),
  "meta.city": city ?? MARK,
  "meta.slug": slug,
  "contact.phone": phone,
  "contact.whatsapp": phone, // le PMI usano lo stesso numero; correggere al checkpoint se serve
  "contact.email": email,
  "contact.address": address,
  "contact.social": social,
  "brand.logo": logo,
  "brand.tone": tone,
};

// brief.json: tutto il form normalizzato, input del Copywriter allo step 3
const brief = {
  submissionId: submission.id,
  submittedAt: submission.submittedAt,
  azienda: businessName,
  settore: text(Q.industry),
  descrizione: text(Q.description),
  partita_iva: text(Q.piva),
  anno_inizio: year,
  indirizzo: address,
  citta: city ?? MARK,
  social,
  obiettivi_sito: multi(Q.goals).concat(text(Q.goalsOther) ? [text(Q.goalsOther)] : []),
  azione_principale: text(Q.mainAction),
  clienti: multi(Q.clientKind).join(", "),
  cliente_tipo: text(Q.clientType),
  area_geografica: multi(Q.area).join(", "),
  canali_attuali: multi(Q.channels),
  logo: multi(Q.hasLogo).join(", "),
  foto_professionali: multi(Q.hasPhotos).join(", "),
  sito_attuale: multi(Q.hasWebsite).join(", "),
  problemi_sito_attuale: text(Q.websiteIssues),
  tono_preferito: tone,
  colori: `${multi(Q.hasColors).join(", ")}${text(Q.colors) ? ` — ${text(Q.colors)}` : ""}`,
  da_evitare: text(Q.avoid),
  referente: `${text(Q.ownerName)} (${text(Q.ownerRole)})`,
  email,
  telefono: phone,
  ricontatto_preferito: multi(Q.recontact).join(", "),
  _da_verificare: review,
};

writeFileSync(join(outDir!, "intake.json"), JSON.stringify(intake, null, 2) + "\n");
writeFileSync(join(outDir!, "brief.json"), JSON.stringify(brief, null, 2) + "\n");
writeFileSync(join(outDir!, "raw-submission.json"), JSON.stringify(submission, null, 2) + "\n");

console.log(`OK — ${outDir}/intake.json (${Object.keys(intake).length} slot) + brief.json + raw-submission.json · ${businessName} → slug "${slug}"`);
if (review.length) {
  console.warn(`\n⚠ ${review.length} campo/i da verificare al checkpoint umano:`);
  for (const r of review) console.warn(`  • ${r}`);
}
