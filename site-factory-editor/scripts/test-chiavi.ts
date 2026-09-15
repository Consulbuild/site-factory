// Banco di prova deterministico delle chiavi del Traffico (piano K1 §6): nessuna rete,
// nessun Keychain, nessuna chiave vera. Chiavi finte generate in memoria; fetch finto
// che registra le chiamate e risponde da tabella.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-chiavi.ts
import { generateKeyPairSync } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  firmaJwt,
  normalizzaServiceAccount,
  provaChiaveTraffico,
  redigi,
  SCOPE_GOOGLE,
  TOKEN_URL,
  type Trasporto,
} from "../lib/chiavi-traffico.ts";
import * as moduloChiavi from "../lib/chiavi-traffico.ts";
import {
  CHIAVI_TRAFFICO,
  KEY_GROUPS,
  KEY_INFO,
  KEY_LABELS,
  KNOWN_KEYS,
  MAX_VALORE_SEGRETO,
  motivoValoreNonSalvabile,
  richiestaDaQuestoMac,
  salvaSegreti,
  type ChiaveTraffico,
  type KeyName,
} from "../lib/secrets.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}

/* ---------------- Trasporto finto ---------------- */

type Chiamata = { url: string; init: RequestInit };
type Rispondi = (url: string, init: RequestInit) => Response | Error;

// Endpoint gratuiti ammessi (asserzione del banco, nessuna lista nel modulo): ogni URL
// chiamato deve iniziare con uno di questi.
const GRATUITI = [
  "https://oauth2.googleapis.com/token",
  "https://www.googleapis.com/webmasters/v3/sites",
  "https://www.googleapis.com/siteVerification/v1/webResource",
  "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?",
  "https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?",
  "https://api.dataforseo.com/v3/appendix/user_data",
  "https://api.cloudflare.com/client/v4/zones?",
];
const MAX_CHIAMATE: Record<ChiaveTraffico, number> = {
  GOOGLE_SERVICE_ACCOUNT: 3,
  GOOGLE_API_KEY: 1,
  BING_WEBMASTER_API_KEY: 1,
  DATAFORSEO_LOGIN: 1,
  DATAFORSEO_PASSWORD: 1,
  CLOUDFLARE_DNS_API_TOKEN: 1,
};
const tutteLeChiamate: Array<Chiamata & { name: ChiaveTraffico }> = [];
const sforamenti: string[] = [];
const provate = new Set<ChiaveTraffico>();

function trasporto(rispondi: Rispondi, salvate: Partial<Record<KeyName, string>> = {}) {
  const chiamate: Chiamata[] = [];
  const t: Trasporto = {
    fetch: async (url, init) => {
      chiamate.push({ url, init });
      const r = rispondi(url, init);
      if (r instanceof Error) throw r;
      return r;
    },
    getSecret: (name) => salvate[name] ?? null,
    adesso: () => new Date("2026-09-15T10:00:00Z"),
  };
  return { t, chiamate };
}

const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
const erroreGoogle = (status: number, reason: string, legacy = false) =>
  json(status, {
    error: legacy
      ? { code: status, errors: [{ reason, domain: "usageLimits" }] }
      : { code: status, status: "PERMISSION_DENIED", details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason }] },
  });
const timeout = () => new DOMException("The operation was aborted due to timeout", "TimeoutError");
const rete = () => new TypeError("fetch failed");

/** Esegue una prova registrando le chiamate per i controlli trasversali (endpoint, numero, timeout). */
async function prova(name: ChiaveTraffico, valore: string, rispondi: Rispondi, salvate: Partial<Record<KeyName, string>> = {}, altra?: string) {
  const { t, chiamate } = trasporto(rispondi, salvate);
  const esito = await provaChiaveTraffico(name, valore, t, altra);
  for (const c of chiamate) tutteLeChiamate.push({ ...c, name });
  if (chiamate.length > MAX_CHIAMATE[name]) sforamenti.push(`${name}: ${chiamate.length}`);
  provate.add(name);
  return { esito, chiamate };
}

/** Il messaggio atteso c'è e non contiene segreti né dettagli di trasporto. */
function messaggio(nome: string, esito: string | null, atteso: string, segreti: string[]): void {
  const vietati = [...segreti, "apikey=", "Authorization", "Bearer", "Basic ", "http"];
  const trovato = esito ? vietati.find((v) => esito.includes(v)) : undefined;
  caso(nome, esito !== null && esito.includes(atteso) && !trovato, { esito, atteso, trovato });
}

/* ---------------- 7. Registro e gruppi ---------------- */

console.log("registro delle chiavi:");
const nelleGruppi = KEY_GROUPS.flatMap((g) => g.chiavi);
caso("ogni KNOWN_KEYS in un solo gruppo", nelleGruppi.length === KNOWN_KEYS.length && KNOWN_KEYS.every((k) => nelleGruppi.filter((x) => x === k).length === 1), nelleGruppi);
caso(
  "tre gruppi con 4, 5, 6 chiavi nell'ordine del brief",
  isDeepStrictEqual(KEY_GROUPS.map((g) => [g.titolo, g.chiavi.length]), [["Produzione e sviluppo siti", 4], ["VPS e dashboard clienti", 5], ["Ottimizzazione del traffico", 6]]),
);
caso("le 9 chiavi esistenti restano in testa con le etichette di prima", KNOWN_KEYS.slice(0, 9).join() === "BFL_API_KEY,OPENAI_API_KEY,CLOUDFLARE_API_TOKEN,CLOUDFLARE_ACCOUNT_ID,UMAMI_PASSWORD,N8N_REGISTRA_KEY,N8N_API_KEY,STRIPE_API_KEY,GATUS_PASSWORD" && KEY_LABELS.CLOUDFLARE_API_TOKEN === "Cloudflare (token deploy Workers)");
caso("KEY_INFO solo per le 6 chiavi del Traffico", isDeepStrictEqual(Object.keys(KEY_INFO).sort(), [...CHIAVI_TRAFFICO].sort()));
caso("ogni «dove si prende» è https://", Object.values(KEY_INFO).every((i) => i.dove.startsWith("https://")));
caso("il modulo non esporta una lista di endpoint", !Object.keys(moduloChiavi).some((k) => /ENDPOINT/i.test(k)), Object.keys(moduloChiavi));
caso(
  "coppia solo DataForSEO, simmetrica (login ↔ password)",
  isDeepStrictEqual(Object.entries(KEY_INFO).filter(([, i]) => i.coppia).map(([n, i]) => [n, i.coppia]), [["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"], ["DATAFORSEO_PASSWORD", "DATAFORSEO_LOGIN"]]),
);

/* ---------------- Route solo da questo Mac ---------------- */

console.log("\nroute delle chiavi solo dall'editor su questo Mac (Host e Origin):");
const casiHost: Array<[string, string | null, string | null, boolean]> = [
  ["localhost senza Origin (fetch GET, curl locale)", "localhost:3311", null, true],
  ["127.0.0.1 con Origin uguale", "127.0.0.1:3311", "http://127.0.0.1:3311", true],
  ["[::1] con Origin uguale", "[::1]:3311", "http://[::1]:3311", true],
  ["browser dalla LAN (Host = IP del Mac)", "192.168.1.20:3311", null, false],
  ["DNS rebinding (Host = dominio esterno)", "attaccante.example:3311", null, false],
  ["Host che inizia con localhost ma è un altro dominio", "localhost.attaccante.example:3311", null, false],
  ["fetch no-cors da un altro sito (Origin diverso)", "localhost:3311", "https://attaccante.example", false],
  ["altra porta locale", "localhost:3311", "http://localhost:3000", false],
  ["Origin «null» (origine opaca)", "localhost:3311", "null", false],
  ["Host assente", null, null, false],
];
for (const [nome, host, origin, atteso] of casiHost) caso(`${nome} → ${atteso ? "ammessa" : "403"}`, richiestaDaQuestoMac(host, origin) === atteso);

/* ---------------- 8. Tetto del Keychain ---------------- */

console.log("\ntetto del Keychain (prima di security):");
caso("4000 caratteri → salvabile", motivoValoreNonSalvabile("a".repeat(MAX_VALORE_SEGRETO)) === null);
caso("4001 caratteri → rifiutato col conteggio", motivoValoreNonSalvabile("a".repeat(4001)) === "valore troppo lungo per il portachiavi (4001 caratteri, massimo 4000)", motivoValoreNonSalvabile("a".repeat(4001)));
caso("le virgolette contano dopo l'escape", motivoValoreNonSalvabile(`${"a".repeat(3999)}"`) !== null);
caso("regola esistente invariata (spazi, < 8)", motivoValoreNonSalvabile("con spazio") !== null && motivoValoreNonSalvabile("corta") !== null);

/* ---------------- Salvataggio della coppia con ripristino ---------------- */

console.log("\nsalvataggio con ripristino (portachiavi finto):");
{
  // `nega`: scrittura rifiutata (come «Nega» sul consenso di macOS); `tronca`: valore che il portachiavi rilegge diverso.
  const portachiavi = (iniziali: Partial<Record<KeyName, string>>, nega: (n: KeyName, v: string) => boolean = () => false, tronca?: string) => {
    const m = new Map(Object.entries(iniziali) as Array<[KeyName, string]>);
    const pc = {
      getSecret: (n: KeyName) => m.get(n) ?? null,
      setSecret: (n: KeyName, v: string) => {
        if (nega(n, v)) throw new Error("scrittura Keychain fallita: exit 1\n");
        m.set(n, v === tronca ? v.slice(0, -1) : v);
      },
      deleteSecret: (n: KeyName) => void m.delete(n),
    };
    return { pc, stato: () => Object.fromEntries(m) };
  };
  const vecchie = { DATAFORSEO_LOGIN: "vecchio@consulbuild.com", DATAFORSEO_PASSWORD: "passwordVecchiaDataForSeo" };
  const nuove: Array<[KeyName, string]> = [["DATAFORSEO_LOGIN", "nuovo@consulbuild.com"], ["DATAFORSEO_PASSWORD", "passwordNuovaDataForSeo"]];
  const segreti = [...Object.values(vecchie), ...nuove.map(([, v]) => v)];
  const senzaSegreti = (e: string | null) => e !== null && !segreti.some((s) => e.includes(s));
  const negaPassword = (n: KeyName) => n === "DATAFORSEO_PASSWORD";

  const ok = portachiavi(vecchie);
  caso("coppia scritta e riletta → null, due valori nuovi", salvaSegreti(nuove, ok.pc) === null && isDeepStrictEqual(ok.stato(), Object.fromEntries(nuove)), ok.stato());

  const negata = portachiavi(vecchie, negaPassword);
  const eNegata = salvaSegreti(nuove, negata.pc);
  caso("seconda scrittura negata → login e password tornano quelli di prima (mai login nuovo con password vecchia)", isDeepStrictEqual(negata.stato(), vecchie), negata.stato());
  caso("seconda scrittura negata → messaggio «tornato com'era», senza valori", senzaSegreti(eNegata) && eNegata?.startsWith("scrittura Keychain fallita: exit 1: il portachiavi è tornato com'era, riprova") === true, eNegata);

  const troncata = portachiavi(vecchie, undefined, "passwordNuovaDataForSeo");
  const eTroncata = salvaSegreti(nuove, troncata.pc);
  caso("rilettura diversa → «incompleto» e coppia di prima ripristinata", eTroncata === "salvataggio nel portachiavi incompleto: il portachiavi è tornato com'era, riprova" && isDeepStrictEqual(troncata.stato(), vecchie), { eTroncata, stato: troncata.stato() });

  const senzaLogin = portachiavi({ DATAFORSEO_PASSWORD: vecchie.DATAFORSEO_PASSWORD }, negaPassword);
  salvaSegreti(nuove, senzaLogin.pc);
  caso("login che prima non c'era → tolto al ripristino, password di prima intatta", isDeepStrictEqual(senzaLogin.stato(), { DATAFORSEO_PASSWORD: vecchie.DATAFORSEO_PASSWORD }), senzaLogin.stato());

  // Password negata, poi negato anche il ripristino del login vecchio.
  const doppia = portachiavi(vecchie, (n, v) => negaPassword(n) || v === vecchie.DATAFORSEO_LOGIN);
  const eDoppia = salvaSegreti(nuove, doppia.pc);
  caso("ripristino negato → il messaggio nomina solo la chiave rimasta diversa e dice di ricaricare", senzaSegreti(eDoppia) && eDoppia?.endsWith("ripristino non riuscito per «DataForSEO (login API)»: ricarica la pagina e inseriscila di nuovo") === true, eDoppia);
}

/* ---------------- 1-2. Service account ---------------- */

console.log("\nservice account:");
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const fileSa = {
  type: "service_account",
  project_id: "consulbuild-prova",
  private_key_id: "0123456789abcdef0123456789abcdef01234567",
  private_key: privateKey,
  client_email: "site-factory@consulbuild-prova.iam.gserviceaccount.com",
  client_id: "123456789012345678901",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: TOKEN_URL,
  universe_domain: "googleapis.com",
};
const scaricato = JSON.stringify(fileSa, null, 2); // come il file di Google Cloud
const incollato = scaricato.replace(/[\r\n]/g, ""); // l'input password toglie gli a capo
const n1 = normalizzaServiceAccount(incollato);
const compatto = { client_email: fileSa.client_email, private_key: privateKey, private_key_id: fileSa.private_key_id };
caso("JSON incollato → ok", n1.ok, n1);
const valoreSa = n1.ok ? n1.valore : "";
caso("forma base64url, sotto il tetto di 4000", /^[A-Za-z0-9_-]+$/.test(valoreSa) && valoreSa.length < MAX_VALORE_SEGRETO && motivoValoreNonSalvabile(valoreSa) === null, valoreSa.length);
caso("decodifica identica al JSON compatto", isDeepStrictEqual(JSON.parse(Buffer.from(valoreSa, "base64url").toString("utf8")), compatto));
const n2 = normalizzaServiceAccount(Buffer.from(scaricato).toString("base64"));
caso("base64 del file → stesso valore", n2.ok && n2.valore === valoreSa);
const n3 = normalizzaServiceAccount(valoreSa);
caso("idempotente sul valore già salvato", n3.ok && n3.valore === valoreSa);

const scarti: Array<[string, string, string]> = [
  ["type diverso", JSON.stringify({ ...fileSa, type: "authorized_user" }), "altra credenziale"],
  ["client_email non iam.gserviceaccount.com", JSON.stringify({ ...fileSa, client_email: "123-compute@developer.gserviceaccount.com" }), "…iam.gserviceaccount.com"],
  ["PEM rotto", JSON.stringify({ ...fileSa, private_key: privateKey.slice(0, 200) + privateKey.slice(260) }), "chiave privata nel JSON è illeggibile"],
  ["testo qualsiasi", "questa non è una chiave", "Non è il JSON di un service account"],
  ["JSON non oggetto", "[1,2,3]", "Non è il JSON di un service account"],
  ["JSON senza private_key", JSON.stringify({ ...fileSa, private_key: undefined }), "Non è il JSON di un service account"],
];
for (const [nome, testo, atteso] of scarti) {
  const n = normalizzaServiceAccount(testo);
  const errore = n.ok ? null : n.errore;
  caso(`${nome} → messaggio senza il testo`, errore !== null && errore.includes(atteso) && !errore.includes("BEGIN PRIVATE KEY") && !errore.includes(testo.slice(0, 20)), errore);
}

/* ---------------- 3. JWT ---------------- */

console.log("\nfirma JWT:");
const jwt = firmaJwt(compatto, new Date("2026-09-15T10:00:00Z"));
const [h, c, s] = jwt.split(".");
const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
const claim = JSON.parse(Buffer.from(c, "base64url").toString("utf8"));
caso("header RS256/JWT con kid", isDeepStrictEqual(header, { alg: "RS256", typ: "JWT", kid: compatto.private_key_id }), header);
caso(
  "claim iss, scope, aud, iat −30 s, exp +1 h",
  claim.iss === compatto.client_email && claim.scope === SCOPE_GOOGLE && claim.aud === TOKEN_URL && claim.iat === Date.parse("2026-09-15T10:00:00Z") / 1000 - 30 && claim.exp === claim.iat + 3600,
  claim,
);
caso("firma base64url presente", /^[A-Za-z0-9_-]{300,}$/.test(s ?? ""));

/* ---------------- 4. Prove e messaggi ---------------- */

console.log("\nservice account → Google:");
const tokenOk = () => json(200, { access_token: "ya29.token-finto-di-prova", expires_in: 3599, token_type: "Bearer" });
{
  const { esito, chiamate } = await prova("GOOGLE_SERVICE_ACCOUNT", valoreSa, (url) => (url === TOKEN_URL ? tokenOk() : json(200, {})));
  caso("tutto ok → null con 3 chiamate (token, Search Console, Site Verification)", esito === null && chiamate.length === 3, { esito, n: chiamate.length });
  const [tok, sc, sv] = chiamate;
  const corpo = new URLSearchParams(String(tok?.init.body ?? ""));
  caso("il token viene chiesto con l'asserzione JWT", tok?.init.method === "POST" && corpo.get("grant_type") === "urn:ietf:params:oauth:grant-type:jwt-bearer" && (corpo.get("assertion") ?? "").split(".").length === 3);
  const autorizzazione = (x?: Chiamata) => new Headers(x?.init.headers).get("Authorization");
  caso("le letture usano il token", autorizzazione(sc) === "Bearer ya29.token-finto-di-prova" && autorizzazione(sv) === "Bearer ya29.token-finto-di-prova");
  caso("ordine: Search Console poi Site Verification", sc?.url.includes("/webmasters/") === true && sv?.url.includes("/siteVerification/") === true);
}
const casiSa: Array<[string, Rispondi, string, number]> = [
  ["invalid_grant", () => json(400, { error: "invalid_grant", error_description: "Invalid JWT Signature." }), "revocata o cancellata", 1],
  ["invalid_client 401", () => json(401, { error: "invalid_client", error_description: "The OAuth client was not found." }), "non trova il service account", 1],
  ["Search Console API spenta", (url) => (url === TOKEN_URL ? tokenOk() : erroreGoogle(403, "SERVICE_DISABLED")), "Google Search Console API non è abilitata", 2],
  ["Site Verification API spenta", (url) => (url === TOKEN_URL ? tokenOk() : url.includes("webmasters") ? json(200, {}) : erroreGoogle(403, "SERVICE_DISABLED")), "Site Verification API non è abilitata", 3],
  ["API spenta (formato legacy accessNotConfigured)", (url) => (url === TOKEN_URL ? tokenOk() : erroreGoogle(403, "accessNotConfigured", true)), "non è abilitata", 2],
  ["token senza access_token", () => json(200, {}), "non ha rilasciato il token", 1],
  ["timeout del token", () => timeout(), "Google non ha risposto entro 10 s", 1],
  ["rete giù", () => rete(), "Google non raggiungibile", 1],
  ["5xx sul token", () => json(503, {}), "Google ha un problema temporaneo (503)", 1],
  ["403 generico in lettura", (url) => (url === TOKEN_URL ? tokenOk() : erroreGoogle(403, "PERMISSION_DENIED")), "ha negato l'accesso al service account (403 PERMISSION_DENIED)", 2],
];
for (const [nome, rispondi, atteso, nChiamate] of casiSa) {
  const { esito, chiamate } = await prova("GOOGLE_SERVICE_ACCOUNT", valoreSa, rispondi);
  messaggio(`${nome} → «${atteso}»`, esito, atteso, [valoreSa, "ya29.token-finto-di-prova", "PRIVATE KEY"]);
  caso(`${nome}: stop dopo ${nChiamate} chiamate`, chiamate.length === nChiamate, chiamate.length);
}
{
  const { esito, chiamate } = await prova("GOOGLE_SERVICE_ACCOUNT", "{ rotto", () => json(200, {}));
  caso("valore non normalizzabile → nessuna chiamata", esito !== null && chiamate.length === 0, esito);
}

console.log("\nAPI key Google → PageSpeed:");
const apiKey = `AIza${"Sy0123456789abcdefghijklmnopqrstu".padEnd(35, "x")}`;
{
  const { esito, chiamate } = await prova("GOOGLE_API_KEY", apiKey, () => json(200, { lighthouseResult: {} }));
  const c0 = chiamate[0];
  caso("200 → null", esito === null);
  caso("chiave nell'header X-Goog-Api-Key, mai nell'URL", new Headers(c0?.init.headers).get("X-Goog-Api-Key") === apiKey && !c0?.url.includes(apiKey));
  caso("PSI su google.com, mobile, solo performance", c0?.url === "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=https%3A%2F%2Fwww.google.com%2F&strategy=mobile&category=performance");
  const { esito: e429 } = await prova("GOOGLE_API_KEY", apiKey, () => json(429, {}));
  caso("429 = chiave valida → null", e429 === null);
  const { esito: eFormato, chiamate: cFormato } = await prova("GOOGLE_API_KEY", "chiave-senza-formato", () => json(200, {}));
  caso("formato sbagliato → messaggio e nessuna chiamata", eFormato?.includes("inizia con «AIza»") === true && cFormato.length === 0, eFormato);
}
const casiPsi: Array<[string, Rispondi, string]> = [
  ["API_KEY_INVALID", () => erroreGoogle(400, "API_KEY_INVALID"), "Google non riconosce la API key"],
  ["SERVICE_DISABLED", () => erroreGoogle(403, "SERVICE_DISABLED"), "PageSpeed Insights API non è abilitata"],
  ["API_KEY_SERVICE_BLOCKED", () => erroreGoogle(403, "API_KEY_SERVICE_BLOCKED"), "aggiungi PageSpeed Insights API e Chrome UX Report API"],
  ["API_KEY_HTTP_REFERRER_BLOCKED", () => erroreGoogle(403, "API_KEY_HTTP_REFERRER_BLOCKED"), "restrizioni per sito, IP o app"],
  ["timeout 60 s", () => timeout(), "Google PageSpeed Insights non ha risposto entro 60 s"],
  ["rete giù", () => rete(), "Google PageSpeed Insights non raggiungibile"],
  ["5xx", () => json(500, {}), "problema temporaneo (500)"],
];
for (const [nome, rispondi, atteso] of casiPsi) {
  const { esito } = await prova("GOOGLE_API_KEY", apiKey, rispondi);
  messaggio(`${nome} → «${atteso}»`, esito, atteso, [apiKey]);
}

console.log("\nBing Webmaster Tools:");
const bingKey = "f1n7a0bing0key0di0prova0123456789";
{
  const { esito, chiamate } = await prova("BING_WEBMASTER_API_KEY", bingKey, () => json(200, { d: [] }));
  caso("200 con d array → null", esito === null && chiamate.length === 1);
}
const casiBing: Array<[string, Rispondi, string]> = [
  ["InvalidApiKey nel corpo", () => json(400, { ErrorCode: 3, Message: "ERROR!!! InvalidApiKey" }), "Bing non riconosce la API key"],
  ["200 senza d", () => json(200, { altro: true }), "Bing Webmaster Tools ha risposto 200 in un formato inatteso"],
  ["403 generico", () => json(403, {}), "Bing Webmaster Tools ha risposto 403"],
  ["timeout", () => timeout(), "Bing Webmaster Tools non ha risposto entro 10 s"],
  ["rete giù", () => rete(), "Bing Webmaster Tools non raggiungibile"],
  ["5xx", () => json(502, {}), "problema temporaneo (502)"],
];
for (const [nome, rispondi, atteso] of casiBing) {
  const { esito } = await prova("BING_WEBMASTER_API_KEY", bingKey, rispondi);
  messaggio(`${nome} → «${atteso}»`, esito, atteso, [bingKey]);
}

console.log("\nDataForSEO:");
const login = "prova@consulbuild.com";
const password = "passwordFintaDataForSeo01";
const basic = Buffer.from(`${login}:${password}`).toString("base64");
{
  const soloLogin = await prova("DATAFORSEO_LOGIN", login, () => json(200, { status_code: 20000 }));
  const soloPassword = await prova("DATAFORSEO_PASSWORD", password, () => json(200, { status_code: 20000 }));
  caso("metà sola (login) → null e zero chiamate", soloLogin.esito === null && soloLogin.chiamate.length === 0);
  caso("metà sola (password) → null e zero chiamate", soloPassword.esito === null && soloPassword.chiamate.length === 0);
  const ok = await prova("DATAFORSEO_LOGIN", login, () => json(200, { status_code: 20000, tasks: [{ result: [{ money: { balance: 50 } }] }] }), { DATAFORSEO_PASSWORD: password });
  caso("coppia completa → una chiamata con Basic auth", ok.esito === null && ok.chiamate.length === 1 && new Headers(ok.chiamate[0]?.init.headers).get("Authorization") === `Basic ${basic}`);
  const inversa = await prova("DATAFORSEO_PASSWORD", password, () => json(200, { status_code: 20000 }), { DATAFORSEO_LOGIN: login });
  caso("simmetrica: password con login salvato → stessa coppia", inversa.esito === null && new Headers(inversa.chiamate[0]?.init.headers).get("Authorization") === `Basic ${basic}`);

  // Cambio account: la coppia salvata è di un altro account, le due metà nuove arrivano insieme.
  const vecchie = { DATAFORSEO_LOGIN: "vecchio@consulbuild.com", DATAFORSEO_PASSWORD: "passwordVecchiaDataForSeo" };
  const cambio = await prova("DATAFORSEO_LOGIN", login, (_url, init) => json(new Headers(init.headers).get("Authorization") === `Basic ${basic}` ? 200 : 401, { status_code: 20000 }), vecchie, password);
  caso("cambio account: login e password insieme → prova la coppia nuova, non la password salvata", cambio.esito === null && cambio.chiamate.length === 1 && new Headers(cambio.chiamate[0]?.init.headers).get("Authorization") === `Basic ${basic}`, cambio.esito);
  const cambioInverso = await prova("DATAFORSEO_PASSWORD", password, () => json(200, { status_code: 20000 }), vecchie, login);
  caso("cambio account dalla riga password → stessa coppia nuova", cambioInverso.esito === null && new Headers(cambioInverso.chiamate[0]?.init.headers).get("Authorization") === `Basic ${basic}`);
  const insiemeSenzaSalvate = await prova("DATAFORSEO_LOGIN", login, () => json(200, { status_code: 20000 }), {}, password);
  caso("primo inserimento con i due campi → una prova (non salvataggio senza prova)", insiemeSenzaSalvate.esito === null && insiemeSenzaSalvate.chiamate.length === 1);
  const coppiaNuovaRifiutata = await prova("DATAFORSEO_LOGIN", login, () => json(401, { status_code: 40100 }), vecchie, password);
  messaggio("coppia nuova rifiutata → «login o password», senza parlare della metà salvata", coppiaNuovaRifiutata.esito, "DataForSEO ha rifiutato login o password", [login, password, basic]);
  caso("coppia nuova rifiutata: nessun «già salvat…»", !coppiaNuovaRifiutata.esito?.includes("già salvat"), coppiaNuovaRifiutata.esito);
  const loginConVecchia = await prova("DATAFORSEO_LOGIN", login, () => json(401, { status_code: 40100 }), vecchie);
  messaggio("login nuovo con password salvata rifiutato → il messaggio nomina la password già salvata e il secondo campo", loginConVecchia.esito, "rifiutato il login con la password già salvata: se hai cambiato account inserisci anche la password nuova nel secondo campo", [login, vecchie.DATAFORSEO_PASSWORD]);
}
const casiDfs: Array<[string, Rispondi, string]> = [
  ["401", () => json(401, { status_code: 40100, status_message: "You are not authorized" }), "DataForSEO ha rifiutato la password con il login già salvato"],
  ["40100 con HTTP 200", () => json(200, { status_code: 40100 }), "DataForSEO ha rifiutato la password con il login già salvato"],
  ["40104 account da verificare", () => json(403, { status_code: 40104 }), "va verificato prima di usare le API"],
  ["40207 IP non in whitelist", () => json(403, { status_code: 40207 }), "non è nella whitelist di DataForSEO"],
  ["codice ignoto", () => json(402, { status_code: 40200 }), "DataForSEO ha risposto 402 (codice 40200)"],
  ["timeout", () => timeout(), "DataForSEO non ha risposto entro 10 s"],
  ["rete giù", () => rete(), "DataForSEO non raggiungibile"],
  ["5xx", () => json(500, { status_code: 50000 }), "problema temporaneo (500)"],
];
for (const [nome, rispondi, atteso] of casiDfs) {
  const { esito } = await prova("DATAFORSEO_PASSWORD", password, rispondi, { DATAFORSEO_LOGIN: login });
  messaggio(`${nome} → «${atteso}»`, esito, atteso, [login, password, basic]);
}

console.log("\nCloudflare DNS:");
const cfToken = "cfTokenFintoDiProva0123456789abcdefghij";
const accountId = "0123456789abcdef0123456789abcdef";
{
  const zona = await prova("CLOUDFLARE_DNS_API_TOKEN", cfToken, () => json(200, { success: true, result: [{ name: "consulbuild.com" }] }), { CLOUDFLARE_ACCOUNT_ID: accountId });
  caso("una zona visibile → null", zona.esito === null && zona.chiamate.length === 1);
  const u = new URL(zona.chiamate[0]?.url ?? "https://x");
  caso("filtro nome e account salvato nell'URL", u.searchParams.get("name") === "consulbuild.com" && u.searchParams.get("account.id") === accountId && !zona.chiamate[0]?.url.includes(cfToken));
  const senzaAccount = await prova("CLOUDFLARE_DNS_API_TOKEN", cfToken, () => json(200, { success: true, result: [{}] }));
  caso("senza account ID salvato → nessun filtro account", senzaAccount.esito === null && !senzaAccount.chiamate[0]?.url.includes("account.id"));
}
const casiCf: Array<[string, Rispondi, string]> = [
  ["lista vuota", () => json(200, { success: true, result: [] }), "non vede la zona consulbuild.com"],
  ["403 senza permesso", () => json(403, { success: false, errors: [{ code: 9109, message: "Unauthorized to access requested resource" }] }), "non vede la zona consulbuild.com"],
  ["403 «Invalid access token» (risposta reale a un token finto)", () => json(403, { success: false, errors: [{ code: 9109, message: "Invalid access token" }] }), "Cloudflare non riconosce il token"],
  ["400 token malformato", () => json(400, { success: false, errors: [{ code: 6003 }] }), "Cloudflare non riconosce il token"],
  ["401", () => json(401, { success: false }), "Cloudflare non riconosce il token"],
  ["timeout", () => timeout(), "Cloudflare non ha risposto entro 10 s"],
  ["rete giù", () => rete(), "Cloudflare non raggiungibile"],
  ["5xx", () => json(504, {}), "problema temporaneo (504)"],
];
for (const [nome, rispondi, atteso] of casiCf) {
  const { esito } = await prova("CLOUDFLARE_DNS_API_TOKEN", cfToken, rispondi);
  messaggio(`${nome} → «${atteso}»`, esito, atteso, [cfToken]);
}

console.log("\nerrori imprevisti e redazione:");
{
  const { t } = trasporto(() => json(200, {}));
  const esploso: Trasporto = { ...t, fetch: async () => { throw new RangeError(`valore ${bingKey} dentro l'eccezione`); } };
  const esito = await provaChiaveTraffico("BING_WEBMASTER_API_KEY", bingKey, esploso);
  caso("eccezione di altro tipo → rete, senza il suo messaggio", esito !== null && !esito.includes(bingKey), esito);
  caso("redigi toglie valore e forma URL-encoded", redigi(`a ${login} b ${encodeURIComponent(login)}`, login) === "a [chiave nascosta] b [chiave nascosta]");
}

/* ---------------- 6. Trasversali ---------------- */

console.log("\ncontrolli trasversali su tutte le chiamate:");
const fuori = tutteLeChiamate.filter((c) => !GRATUITI.some((g) => c.url === g || (g.endsWith("?") && c.url.startsWith(g))));
caso(`ogni URL chiamato è un endpoint gratuito (${tutteLeChiamate.length} chiamate)`, fuori.length === 0, fuori.map((c) => c.url));
caso("ogni chiamata ha un timeout (AbortSignal)", tutteLeChiamate.every((c) => c.init.signal instanceof AbortSignal));
caso("DataForSEO: solo user_data", tutteLeChiamate.filter((c) => c.name.startsWith("DATAFORSEO")).every((c) => c.url === "https://api.dataforseo.com/v3/appendix/user_data"));
caso("nessuna prova supera il suo massimo di chiamate (service account 3, le altre 1)", sforamenti.length === 0, sforamenti);
caso("ogni chiave del Traffico è stata provata", CHIAVI_TRAFFICO.every((n) => provate.has(n)), [...provate]);

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
