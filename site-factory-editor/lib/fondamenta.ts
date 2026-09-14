// Fondamenta SEO del servizio Traffico «Sito» (docs/traffico/piano-T1a.md): la regola
// unica «fondamenta attese» (build e deploy), il JSON-LD della home, l'hash del testo
// indicizzabile per `lastmod`, sitemap, robots, _headers, chiave IndexNow e i due
// orchestratori su file chiamati da lib/build.ts: dati strutturati PRIMA di astro,
// cottura POST-build sulla dist. A servizio spento nulla di questo gira: la dist resta
// quella di sempre. Solo node:fs/path/crypto e import con estensione (o di solo tipo):
// il banco scripts/test-fondamenta.ts gira con `node --experimental-strip-types`.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pivaValida } from "./piva.ts";
import { leggiTraffico, fondamentaAccese } from "./traffico.ts";
import type { ClientState } from "./schemas";

/* ------------------------------------------------------------------ */
/* Regola unica e interlock del deploy                                 */
/* ------------------------------------------------------------------ */

/**
 * Dominio per cui la build DEVE cuocere le fondamenta, o null. Unica regola per build e
 * deploy: servizio «Sito» attivo o sospeso (decisione 11: restano online), dominio,
 * percorso non demo (una demo resta noindex anche con il servizio ritoccato a mano).
 * La build la applica solo se non è parziale.
 */
export function fondamentaAttese(st: { traffico?: ClientState["traffico"]; percorso?: ClientState["percorso"] }, dominio: string | undefined): string | null {
  return dominio && st.percorso !== "demo" && fondamentaAccese(leggiTraffico(st)) ? dominio : null;
}

const RIBUILDA = "Ribuilda, riconferma e poi pubblica.";

/** Perché il deploy rifiuta (null = coincidono): `cotte` dalla build, `attese` da fondamentaAttese(). */
export function motivoRifiutoFondamenta(cotte: string | null, attese: string | null): string | null {
  if (cotte === attese) return null;
  if (!cotte) {
    return `la build è stata prodotta senza le fondamenta SEO (sitemap, robots, dati strutturati), ma il servizio Traffico «Sito» è acceso per ${attese}. ${RIBUILDA}`;
  }
  if (!attese) {
    return `la build contiene le fondamenta SEO per ${cotte}, ma il servizio Traffico «Sito» è spento o manca il dominio. ${RIBUILDA}`;
  }
  return `le fondamenta SEO della build sono per ${cotte}, il dominio attuale è ${attese}. ${RIBUILDA}`;
}

/* ------------------------------------------------------------------ */
/* Tipo schema.org                                                      */
/* ------------------------------------------------------------------ */

/** Sottotipi di HomeAndConstructionBusiness usati (verificati su schema.org, piano §Calibrazione). */
export type TipoSchema =
  | "GeneralContractor"
  | "Plumber"
  | "Electrician"
  | "HousePainter"
  | "RoofingContractor"
  | "HVACBusiness"
  | "HomeAndConstructionBusiness";

const GENERICO: TipoSchema = "HomeAndConstructionBusiness";

/**
 * id del mestiere del form (site-intake/src/data/tassonomia.ts) → tipo. Ogni id ha una
 * voce esplicita (il banco lo verifica): null = mestiere scritto a mano («altro»), decide
 * il settore di contesto.json come per i clienti storici senza id.
 */
export const TIPO_PER_MESTIERE: Record<string, TipoSchema | null> = {
  "impresa-edile": "GeneralContractor",
  ristrutturazioni: "GeneralContractor",
  idraulico: "Plumber",
  elettricista: "Electrician",
  imbianchino: "HousePainter",
  cartongesso: GENERICO, // nessun sottotipo specifico
  serramenti: GENERICO, // nessun sottotipo specifico (non è Locksmith)
  altro: null,
};

/** Inizi di parola di contesto.json settore_normalizzato → tipo (testo minuscolo, senza accenti). */
const TIPO_PER_SETTORE: [prefissi: string[], tipo: TipoSchema][] = [
  [["edil", "ristruttur", "costruzion"], "GeneralContractor"],
  [["idraul", "termoidraul"], "Plumber"],
  [["elettric"], "Electrician"],
  [["imbianc", "pittur", "pittor", "tinteggi"], "HousePainter"],
  [["tett", "copertur"], "RoofingContractor"],
  [["climatizz", "condizionat", "riscaldament", "termotecn"], "HVACBusiness"],
];

/**
 * Tipo più specifico con la sua fonte. Prima il mestiere del form; senza (clienti
 * storici, «altro», id sconosciuto) le parole del settore: un solo tipo trovato → quello;
 * più tipi → GeneralContractor se c'è (l'impresa che coordina i mestieri), altrimenti il
 * generico. Nessuna parola nota → HomeAndConstructionBusiness. Mai un tipo senza fonte.
 */
export function tipoSchema(mestiereId: string | undefined, settore: string | undefined): { tipo: TipoSchema; fonte: string } {
  const daMestiere = mestiereId ? TIPO_PER_MESTIERE[mestiereId] : undefined;
  if (daMestiere) return { tipo: daMestiere, fonte: `mestiere «${mestiereId}»` };
  const parole = parolePer(settore ?? "");
  const trovati = new Set<TipoSchema>();
  for (const [prefissi, tipo] of TIPO_PER_SETTORE) {
    if (parole.some((p) => prefissi.some((x) => p.startsWith(x)))) trovati.add(tipo);
  }
  const tipo = trovati.size === 1 ? [...trovati][0] : trovati.has("GeneralContractor") ? "GeneralContractor" : GENERICO;
  return { tipo, fonte: trovati.size ? `settore «${(settore ?? "").trim()}»` : "nessun mestiere o settore riconosciuto" };
}

/** Minuscole e accenti tolti, UN carattere per carattere: le posizioni restano quelle del testo originale. */
function perConfronto(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const base = s[i].normalize("NFD")[0].toLowerCase();
    out += base.length === 1 ? base : s[i];
  }
  return out;
}

/** Parole per il confronto: apostrofi, trattini e punteggiatura separano («Sant’Angelo» = sant angelo). */
const parolePer = (s: string) => perConfronto(s).split(/[^a-z0-9]+/).filter(Boolean);

/** Ordine per codepoint, indipendente dalla locale: sitemap e registro identici su ogni macchina. */
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/* ------------------------------------------------------------------ */
/* Indirizzo strutturato                                               */
/* ------------------------------------------------------------------ */

export type Comune = { nome: string; sigla: string; cap: string[] };
export type PostalAddressLd = {
  "@type": "PostalAddress";
  streetAddress: string;
  addressLocality: string;
  postalCode: string;
  addressRegion: string;
  addressCountry: "IT";
};

const escRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Indirizzo MOSTRATO in pagina → PostalAddress, con l'elenco ISTAT dei comuni. Stesse
 * regole per la forma storica («Via Roma 1 Cologno Monzese 20093») e per quella del form
 * («Via Roma 1, 36100 Vicenza (VI)»): un solo CAP; comune con quel CAP nominato nel testo
 * (vince il nome più lungo, pareggio = ambiguo); sigla tra parentesi coerente; via = testo
 * prima del CAP o dell'ULTIMA occorrenza del comune (una via può chiamarsi come il comune).
 */
export function indirizzoStrutturato(testo: string, comuni: Comune[]): { ok: true; address: PostalAddressLd } | { ok: false; motivo: string } {
  const t = testo.replace(/\s+/g, " ").trim();
  if (!t) return { ok: false, motivo: "indirizzo vuoto" };
  const caps = [...t.matchAll(/(?<!\d)\d{5}(?!\d)/g)];
  if (caps.length === 0) return { ok: false, motivo: `CAP assente in «${t}»` };
  if (caps.length > 1) return { ok: false, motivo: `più di un CAP (${caps.map((m) => m[0]).join(", ")}) in «${t}»` };
  const cap = caps[0][0];
  const posCap = caps[0].index ?? 0;

  const norm = perConfronto(t);
  const candidati: { comune: Comune; pos: number; lung: number }[] = [];
  for (const c of comuni) {
    if (!c.cap.includes(cap)) continue;
    const parole = parolePer(c.nome);
    if (!parole.length) continue;
    const re = new RegExp(`(?<![a-z0-9])${parole.map(escRegex).join("[^a-z0-9]+")}(?![a-z0-9])`, "g");
    const trovati = [...norm.matchAll(re)];
    if (trovati.length) candidati.push({ comune: c, pos: trovati[trovati.length - 1].index ?? 0, lung: parole.join(" ").length });
  }
  if (!candidati.length) return { ok: false, motivo: `nessun comune col CAP ${cap} nominato in «${t}»` };
  candidati.sort((a, b) => b.lung - a.lung);
  if (candidati.length > 1 && candidati[1].lung === candidati[0].lung) {
    return { ok: false, motivo: `comune ambiguo per il CAP ${cap}: ${candidati.filter((c) => c.lung === candidati[0].lung).map((c) => c.comune.nome).join(" o ")}` };
  }
  const { comune, pos } = candidati[0];

  const sigla = [...t.matchAll(/\(([A-Za-z]{2})\)/g)].map((m) => m[1].toUpperCase()).find((s) => s !== comune.sigla);
  if (sigla) return { ok: false, motivo: `sigla (${sigla}) diversa da ${comune.sigla} di ${comune.nome}` };

  const via = t.slice(0, Math.min(posCap, pos)).replace(/[\s,;:–-]+$/, "").trim();
  if (!/\p{L}/u.test(via)) return { ok: false, motivo: `via assente prima di CAP e comune in «${t}»` };

  return {
    ok: true,
    address: { "@type": "PostalAddress", streetAddress: via, addressLocality: comune.nome, postalCode: cap, addressRegion: comune.sigla, addressCountry: "IT" },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD della home                                                  */
/* ------------------------------------------------------------------ */

/** Mai nel JSON-LD: recensioni self-serving, coordinate e orari senza fonte, dati personali. */
export const CHIAVI_VIETATE = ["aggregateRating", "review", "geo", "openingHours", "openingHoursSpecification", "priceRange", "areaServed", "taxID"];

/** Chiavi vietate (e FAQPage) trovate a qualunque profondità; [] = pulito. */
export function chiaviVietate(v: unknown): string[] {
  const trovate: string[] = [];
  const visita = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visita);
    if (!n || typeof n !== "object") return;
    for (const [k, x] of Object.entries(n)) {
      if (CHIAVI_VIETATE.includes(k)) trovate.push(k);
      if (k === "@type" && (x === "FAQPage" || (Array.isArray(x) && x.includes("FAQPage")))) trovate.push("FAQPage");
      visita(x);
    }
  };
  visita(v);
  return [...new Set(trovate)];
}

const RETI = { instagram: "instagram.com", facebook: "facebook.com", tiktok: "tiktok.com", linkedin: "linkedin.com" } as const;

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Numero mostrato → formato internazionale; null se non riconoscibile. */
function telefonoInternazionale(v: string): string | null {
  const t = v.replace(/[\s.\-()/]/g, "");
  if (/^\+\d{8,15}$/.test(t)) return t;
  if (/^00\d{8,15}$/.test(t)) return `+${t.slice(2)}`;
  if (/^[03]\d{5,10}$/.test(t)) return `+39${t}`; // fisso (0…) o mobile (3…) italiano
  return null;
}

/** URL http(s) assoluto di un asset del sito (stessa risoluzione di og:image in Base.astro), o null. */
function urlAsset(src: string, base: string): string | null {
  if (!src) return null;
  try {
    const u = new URL(src, base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

export type InputDatiStrutturati = {
  /** site.json finale (dopo la patch dei media): contatti, brand e card mostrati in pagina. */
  site: unknown;
  brief: unknown;
  rawSubmission: unknown;
  contesto: unknown;
  lavori: unknown;
  slug: string;
  dominio: string;
  /** Elenco ISTAT; null = non leggibile (indirizzo omesso con avviso). */
  comuni: Comune[] | null;
};

/**
 * JSON-LD dell'attività: SOLO campi con una fonte reale e visibile. `avvisi` = dati
 * presenti ma non utilizzabili (vanno corretti); `riepilogo` = una riga per il log con
 * tipo, esito dei campi chiave e campi omessi per mancanza di fonte. Deterministico.
 */
export function datiStrutturati(i: InputDatiStrutturati): { jsonld: Rec; avvisi: string[]; riepilogo: string } {
  const avvisi: string[] = [];
  const omessi: string[] = [];
  const site = rec(i.site);
  const meta = rec(site.meta);
  const contact = rec(site.contact);
  const brand = rec(site.brand);
  const sections = Array.isArray(site.sections) ? site.sections.map(rec) : [];
  const url = `https://${i.dominio}/`;

  const mestiereId = str(rec(rec(rec(i.rawSubmission).risposte).mestiere).id) || undefined;
  const { tipo, fonte } = tipoSchema(mestiereId, str(rec(i.contesto).settore_normalizzato) || undefined);
  const ld: Rec = { "@context": "https://schema.org", "@type": tipo, "@id": `${url}#azienda`, name: str(meta.businessName), url };
  if (!ld.name) avvisi.push("nome dell'attività assente in site.json (meta.businessName)");

  const telefono = str(contact.phone);
  const tel = telefonoInternazionale(telefono);
  if (tel) ld.telephone = tel;
  else avvisi.push(telefono ? `telefono omesso: «${telefono}» non è un numero riconoscibile` : "telefono omesso: nessun numero nei contatti");

  const email = str(contact.email);
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) ld.email = email;
  else if (email) avvisi.push(`email omessa: «${email}» non è un indirizzo valido`);
  else omessi.push("email (nessuna)");

  let esitoIndirizzo = "omesso";
  if (!i.comuni) {
    avvisi.push("indirizzo omesso: elenco dei comuni (site-intake/data-src/comuni.json) non leggibile");
  } else if (!str(contact.address)) {
    avvisi.push("indirizzo omesso: nessun indirizzo nei contatti (Google lo richiede per le attività locali)");
  } else {
    const a = indirizzoStrutturato(str(contact.address), i.comuni);
    if (a.ok) {
      ld.address = a.address;
      esitoIndirizzo = "ok";
    } else avvisi.push(`indirizzo omesso: ${a.motivo} — correggi l'indirizzo nei contatti`);
  }

  const piva = str(rec(i.brief).partita_iva).replace(/\s/g, "").replace(/^IT/i, "");
  if (piva && pivaValida(piva)) ld.vatID = `IT${piva}`;
  else avvisi.push(piva ? `P.IVA omessa: «${piva}» non supera il controllo` : "P.IVA omessa: assente nel brief");

  const logo = urlAsset(str(rec(brand.logo).src) || str(rec(brand.mark).src), url);
  if (logo) ld.logo = logo;
  else omessi.push("logo (nessun logo né simbolo)");

  // Una foto REALE dei lavori (mai la hero, che può essere generata).
  const foto = Array.isArray(i.lavori) ? str(rec(i.lavori[0]).file) : "";
  const image = foto ? urlAsset(`/media/${i.slug}/${foto}`, url) : null;
  if (image) ld.image = image;
  else omessi.push("image (nessuna foto reale dei lavori)");

  const sameAs: string[] = [];
  const social = rec(contact.social);
  for (const [rete, host] of Object.entries(RETI)) {
    const v = str(social[rete]);
    if (!v) continue;
    let valido = false;
    try {
      const u = new URL(v);
      valido = u.protocol === "https:" && (u.hostname === host || u.hostname.endsWith(`.${host}`));
    } catch {
      /* non è un URL */
    }
    if (valido) sameAs.push(v);
    else avvisi.push(`${rete} omesso da sameAs: «${v}» non è un URL https di ${host}`);
  }
  if (sameAs.length) ld.sameAs = sameAs;
  else if (!Object.values(social).some((v) => str(v))) omessi.push("sameAs (nessun social)");

  const servizi = sections.find((s) => s.type === "Services");
  const titoli = Array.isArray(rec(servizi?.props).items) ? (rec(servizi?.props).items as unknown[]).map((x) => str(rec(x).title)).filter(Boolean) : [];
  if (titoli.length) ld.makesOffer = titoli.map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } }));
  else avvisi.push("makesOffer omesso: nessuna card nella sezione Servizi");

  const riepilogo = [
    `JSON-LD: ${tipo} (${fonte})`,
    `indirizzo ${esitoIndirizzo}`,
    `P.IVA ${ld.vatID ? "ok" : "omessa"}`,
    `${titoli.length} servizi`,
    ...(omessi.length ? [`omessi: ${omessi.join(", ")}`] : []),
  ].join(" · ");
  return { jsonld: ld, avvisi, riepilogo };
}

function leggiJsonSeEsiste(file: string): unknown {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Scrittura atomica (tmp + rename): un crash a metà non lascia file troncati. */
function scriviAtomico(file: string, contenuto: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, contenuto);
  fs.renameSync(tmp, file);
}

/**
 * Legge gli artifact del cliente, genera il JSON-LD e lo salva in
 * `traffico/dati-strutturati.json` (solo JSON-LD: il renderer lo riceve via
 * DATI_STRUTTURATI_JSON). `fileComuni` illeggibile → indirizzo omesso con avviso.
 */
export function scriviDatiStrutturati(dirCliente: string, site: unknown, dominio: string, fileComuni: string): { file: string; avvisi: string[]; riepilogo: string } {
  let comuni: Comune[] | null = null;
  try {
    const c = JSON.parse(fs.readFileSync(fileComuni, "utf8"));
    comuni = Array.isArray(c) ? c : null;
  } catch {
    comuni = null;
  }
  const r = datiStrutturati({
    site,
    brief: leggiJsonSeEsiste(path.join(dirCliente, "brief.json")),
    rawSubmission: leggiJsonSeEsiste(path.join(dirCliente, "raw-submission.json")),
    contesto: leggiJsonSeEsiste(path.join(dirCliente, "contesto.json")),
    lavori: leggiJsonSeEsiste(path.join(dirCliente, "lavori.json")),
    slug: path.basename(dirCliente),
    dominio,
    comuni,
  });
  const file = path.join(dirCliente, "traffico", "dati-strutturati.json");
  scriviAtomico(file, JSON.stringify(r.jsonld, null, 2) + "\n");
  return { file, avvisi: r.avvisi, riepilogo: r.riepilogo };
}

/* ------------------------------------------------------------------ */
/* HTML: attributi, testo indicizzabile, hash                           */
/* ------------------------------------------------------------------ */

// ponytail: estrazione a regex sull'HTML prodotto dai NOSTRI componenti Astro (attributi
// tra virgolette doppie, niente HTML arbitrario). Se l'output diventasse imprevedibile,
// si passa a un parser HTML.
const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

const ENTITA: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodifica(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ENTITA[e.toLowerCase()] ?? m;
  });
}

function attributi(corpo: string): Record<string, string> {
  const a: Record<string, string> = {};
  for (const m of corpo.matchAll(/([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    a[m[1].toLowerCase()] = decodifica(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return a;
}

/** Attributi dei tag `nome` in ordine di documento. */
function tags(html: string, nome: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  for (const m of html.matchAll(TAG)) if (m[1].toLowerCase() === nome) out.push(attributi(m[2]));
  return out;
}

const spazi = (s: string) => s.replace(/\s+/g, " ").trim();

function titolo(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? spazi(decodifica(m[1])) : null;
}

function metaContent(html: string, name: string): string | null {
  const t = tags(html, "meta").find((a) => a.name?.toLowerCase() === name);
  return t ? (t.content ?? "") : null;
}

function jsonLdGrezzi(html: string): string[] {
  return [...html.matchAll(/<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => attributi(m[1]).type?.toLowerCase() === "application/ld+json")
    .map((m) => m[2]);
}

/**
 * Ciò che conta per `lastmod`, normalizzato: title, description, JSON-LD riserializzati e,
 * del body senza script/style/svg/commenti, testo con entità decodificate e spazi compressi
 * più `alt` delle immagini e `href` dei link in ordine di documento. Fuori: class, style,
 * data-*, src e asset con hash, canonical/og, script Umami, action del modulo.
 */
export function testoIndicizzabile(html: string): string {
  const ld = jsonLdGrezzi(html).map((j) => {
    try {
      return JSON.stringify(JSON.parse(j));
    } catch {
      return spazi(j);
    }
  });
  const body = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(TAG, (_m, nome: string, corpo: string) => {
      const n = nome.toLowerCase();
      if (n === "img") return ` [img ${attributi(corpo).alt ?? ""}] `;
      if (n === "a") return ` [a ${attributi(corpo).href ?? ""}] `;
      return " ";
    })
    .replace(/<\/[a-zA-Z][^>]*>/g, " ");
  return [
    `title: ${titolo(html) ?? ""}`,
    `description: ${spazi(metaContent(html, "description") ?? "")}`,
    ...ld.map((j) => `ld: ${j}`),
    `body: ${spazi(decodifica(body))}`,
  ].join("\n");
}

export function hashPagina(html: string): string {
  return crypto.createHash("sha256").update(testoIndicizzabile(html)).digest("hex");
}

/* ------------------------------------------------------------------ */
/* lastmod, sitemap, robots, _headers                                  */
/* ------------------------------------------------------------------ */

export type RegistroLastmod = { pagine: Record<string, { hash: string; lastmod: string }> };

/** W3C Datetime in UTC senza millisecondi. */
const w3c = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * Hash uguale → `lastmod` conservato; diverso o pagina nuova → `adesso`; pagina sparita →
 * tolta (registro = sitemap). ponytail: `lastmod` = prima BUILD con quel contenuto, non il
 * deploy; se servisse allinearlo alla pubblicazione, lo fa T2a che tocca già il deploy.
 */
export function aggiornaLastmod(prec: RegistroLastmod | null, pagine: { path: string; hash: string }[], adesso: Date): { registro: RegistroLastmod; cambiate: string[] } {
  const registro: RegistroLastmod = { pagine: {} };
  const cambiate: string[] = [];
  for (const p of [...pagine].sort((a, b) => cmp(a.path, b.path))) {
    const vecchia = prec?.pagine[p.path];
    if (vecchia && vecchia.hash === p.hash) registro.pagine[p.path] = vecchia;
    else {
      registro.pagine[p.path] = { hash: p.hash, lastmod: w3c(adesso) };
      cambiate.push(p.path);
    }
  }
  return { registro, cambiate };
}

const xmlEsc = (s: string) => s.replace(/[&<>'"]/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", "'": "apos", '"': "quot" }[c]};`);

export function sitemapXml(pagine: { loc: string; lastmod: string }[]): string {
  const urls = [...pagine]
    .sort((a, b) => cmp(a.loc, b.loc))
    .map((p) => `  <url>\n    <loc>${xmlEsc(p.loc)}</loc>\n    <lastmod>${xmlEsc(p.lastmod)}</lastmod>\n  </url>\n`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
}

/** Allow-all anche ai crawler AI (ricerca §6.1): `User-agent: *` li copre, nessun blocco. */
export function robotsTxt(dominio: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: https://${dominio}/sitemap.xml\n`;
}

/** Cloudflare Workers static assets: il file non viene servito; `noindex` solo su <worker>.<account>.workers.dev. */
export const HEADERS_WORKERS_DEV = "https://:version.:subdomain.workers.dev/*\n  X-Robots-Tag: noindex\n";

/* ------------------------------------------------------------------ */
/* Controlli sulle pagine indicizzabili                                */
/* ------------------------------------------------------------------ */

export const MAX_TITLE = 60; // stesso limite Zod di meta.seoTitle
export const MAX_DESCRIPTION = 160; // stesso limite Zod di meta.seoDescription

/**
 * Errori TECNICI (bloccano: canonical ≠ URL della sitemap, JSON-LD non valido o con
 * chiavi vietate) e avvisi di copy (title, description, H1: mai bloccanti, decisione
 * dell'orchestratore del 2026-09-14).
 */
export function controllaPagina(html: string, urlAtteso: string): { errori: string[]; avvisi: string[] } {
  const errori: string[] = [];
  const avvisi: string[] = [];
  const canonical = tags(html, "link").find((a) => a.rel?.toLowerCase() === "canonical")?.href;
  if (!canonical) errori.push(`canonical assente (atteso ${urlAtteso})`);
  else if (canonical !== urlAtteso) errori.push(`canonical ${canonical} diversa dall'URL della sitemap ${urlAtteso}`);

  for (const j of jsonLdGrezzi(html)) {
    try {
      const vietate = chiaviVietate(JSON.parse(j));
      if (vietate.length) errori.push(`JSON-LD con campi vietati: ${vietate.join(", ")}`);
    } catch (e) {
      errori.push(`JSON-LD non valido (${e instanceof Error ? e.message : String(e)})`);
    }
  }

  const t = titolo(html);
  if (!t) avvisi.push("title assente: compila «SEO title» nella scheda Copy");
  else if (t.length > MAX_TITLE) avvisi.push(`title di ${t.length} caratteri (max ${MAX_TITLE}): accorcia «SEO title» nella scheda Copy`);
  const d = spazi(metaContent(html, "description") ?? "");
  if (!d) avvisi.push("meta description assente: compila «SEO description» nella scheda Copy");
  else if (d.length > MAX_DESCRIPTION) avvisi.push(`meta description di ${d.length} caratteri (max ${MAX_DESCRIPTION}): accorcia «SEO description» nella scheda Copy`);
  const h1 = tags(html, "h1").length;
  if (h1 !== 1) avvisi.push(`${h1} titoli H1 (atteso 1)`);
  return { errori, avvisi };
}

const CARTELLE_ASSET = new Set(["_astro", "media", "fonts"]);

/**
 * Pagine indicizzabili della dist: ogni `x/index.html` senza meta robots noindex, con
 * l'URL canonico derivato dal path (barra finale). Esclusi asset, `404.html` e noindex;
 * un `.html` fuori dalla forma cartella/index.html è un errore.
 */
export function elencoPagine(dist: string, dominio: string): { pagine: { path: string; url: string; html: string }[]; errori: string[] } {
  const pagine: { path: string; url: string; html: string }[] = [];
  const errori: string[] = [];
  const visita = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => cmp(a.name, b.name))) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!(rel === "" && CARTELLE_ASSET.has(e.name))) visita(path.join(dir, e.name), r);
        continue;
      }
      if (!e.name.endsWith(".html") || r === "404.html") continue;
      const html = fs.readFileSync(path.join(dir, e.name), "utf8");
      if ((metaContent(html, "robots") ?? "").toLowerCase().includes("noindex")) continue;
      if (e.name !== "index.html") {
        errori.push(`${r}: pagina fuori dalla forma cartella/index.html, URL canonico non derivabile`);
        continue;
      }
      const p = rel ? `/${rel}/` : "/";
      pagine.push({ path: p, url: `https://${dominio}${p}`, html });
    }
  };
  visita(dist, "");
  return { pagine: pagine.sort((a, b) => cmp(a.path, b.path)), errori };
}

/* ------------------------------------------------------------------ */
/* Chiave IndexNow e cottura                                           */
/* ------------------------------------------------------------------ */

/**
 * Chiave del cliente: nasce alla prima build con fondamenta (32 esadecimali) e non cambia
 * più, anche dopo sospensione e riattivazione. Pubblica per protocollo: niente Keychain.
 * File presente ma rotto → errore: rigenerarla in silenzio nasconderebbe il guasto.
 */
export function chiaveIndexNow(dirCliente: string, adesso: Date): string {
  const file = path.join(dirCliente, "traffico", "indexnow.json");
  if (!fs.existsSync(file)) {
    const chiave = crypto.randomBytes(16).toString("hex");
    scriviAtomico(file, JSON.stringify({ chiave, creataAt: w3c(adesso) }, null, 2) + "\n");
    return chiave;
  }
  let chiave: unknown;
  try {
    chiave = rec(JSON.parse(fs.readFileSync(file, "utf8"))).chiave;
  } catch (e) {
    throw new Error(`traffico/indexnow.json illeggibile (${e instanceof Error ? e.message : String(e)}): correggilo, oppure cancellalo per generare una chiave nuova.`);
  }
  if (typeof chiave !== "string" || !/^[a-zA-Z0-9-]{8,128}$/.test(chiave)) {
    throw new Error("traffico/indexnow.json senza una chiave valida (8-128 caratteri tra a-z, A-Z, 0-9 e -): correggilo, oppure cancellalo per generare una chiave nuova.");
  }
  return chiave;
}

function leggiRegistro(file: string): RegistroLastmod | null {
  if (!fs.existsSync(file)) return null;
  let r: unknown;
  try {
    r = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`traffico/lastmod.json illeggibile (${e instanceof Error ? e.message : String(e)}): correggilo, oppure cancellalo (tutti i lastmod ripartono da oggi).`);
  }
  const pagine = rec(r).pagine;
  const valido =
    !!pagine &&
    typeof pagine === "object" &&
    Object.values(pagine).every((p) => typeof rec(p).hash === "string" && typeof rec(p).lastmod === "string");
  if (!valido) throw new Error("traffico/lastmod.json fuori formato ({ pagine: { \"/\": { hash, lastmod } } }): correggilo, oppure cancellalo (tutti i lastmod ripartono da oggi).");
  return r as RegistroLastmod;
}

export type EsitoCottura = { ok: true; urls: number; cambiate: string[]; avvisi: string[] } | { ok: false; errore: string };

/**
 * Post-build: controlli su tutte le pagine indicizzabili → se c'è un errore tecnico esce
 * SENZA scrivere nulla → chiave IndexNow → hash e registro → robots.txt, sitemap.xml,
 * <chiave>.txt, _headers nella dist → traffico/lastmod.json (atomico, per ultimo).
 */
export function cuociFondamenta(dist: string, dirCliente: string, dominio: string, adesso: Date): EsitoCottura {
  const { pagine, errori } = elencoPagine(dist, dominio);
  const avvisi: string[] = [];
  for (const p of pagine) {
    const c = controllaPagina(p.html, p.url);
    errori.push(...c.errori.map((e) => `${p.path}: ${e}`));
    avvisi.push(...c.avvisi.map((a) => `${p.path}: ${a}`));
  }
  const home = pagine.find((p) => p.path === "/");
  if (!home) errori.push("la home (index.html) manca o è noindex: nessun URL principale da mettere in sitemap");
  else {
    // Il JSON-LD arriva via env al renderer: se manca o non è quello del dominio, il collegamento è rotto.
    const ld = jsonLdGrezzi(home.html);
    let azienda: Rec | null = null;
    try {
      if (ld.length === 1) azienda = rec(JSON.parse(ld[0]));
    } catch {
      /* JSON non valido: già tra gli errori di controllaPagina */
    }
    if (ld.length !== 1) errori.push(`/: attesi i dati strutturati dell'attività (1 blocco JSON-LD), trovati ${ld.length}`);
    else if (azienda) {
      if (azienda["@context"] !== "https://schema.org" || typeof azienda["@type"] !== "string" || !str(azienda.name)) {
        errori.push("/: JSON-LD senza @context schema.org, @type o name");
      }
      if (azienda["@id"] !== `${home.url}#azienda` || azienda.url !== home.url) {
        errori.push(`/: JSON-LD per ${String(azienda.url)}, atteso ${home.url}`);
      }
    }
  }
  if (errori.length) return { ok: false, errore: `fondamenta SEO non cotte (nessun file scritto):\n- ${errori.join("\n- ")}` };

  try {
    const chiave = chiaveIndexNow(dirCliente, adesso);
    const fileRegistro = path.join(dirCliente, "traffico", "lastmod.json");
    const { registro, cambiate } = aggiornaLastmod(leggiRegistro(fileRegistro), pagine.map((p) => ({ path: p.path, hash: hashPagina(p.html) })), adesso);
    const urlDi = new Map(pagine.map((p) => [p.path, p.url]));
    fs.writeFileSync(path.join(dist, "robots.txt"), robotsTxt(dominio));
    fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemapXml(Object.entries(registro.pagine).map(([p, v]) => ({ loc: urlDi.get(p)!, lastmod: v.lastmod }))));
    fs.writeFileSync(path.join(dist, `${chiave}.txt`), chiave);
    fs.writeFileSync(path.join(dist, "_headers"), HEADERS_WORKERS_DEV);
    scriviAtomico(fileRegistro, JSON.stringify(registro, null, 2) + "\n");
    return { ok: true, urls: pagine.length, cambiate, avvisi };
  } catch (e) {
    return { ok: false, errore: `fondamenta SEO non cotte: ${e instanceof Error ? e.message : String(e)}` };
  }
}
