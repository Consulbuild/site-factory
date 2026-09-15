import crypto from "node:crypto";
import type { ChiaveTraffico, KeyName } from "./secrets.ts";

// Prove delle chiavi del Traffico prima del salvataggio (docs/traffico/piano-K1.md §2)
// e normalizzazione del service account Google (la riusano T2a e T2b).
// - Solo chiamate GRATUITE, ognuna con timeout: il banco scripts/test-chiavi.ts
//   impone l'elenco chiuso degli endpoint e il numero massimo di chiamate.
// - Trasporto iniettato (fetch + getSecret): il modulo gira nel banco con
//   strip-types, senza rete né Keychain.
// - Nessun messaggio contiene il valore, un URL o un header: i testi sono scritti
//   qui, mai copiati dalle risposte, e passano comunque da redigi().

export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const SCOPE_GOOGLE = "https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters";
const TIMEOUT_MS = 10_000;
const TIMEOUT_PSI_MS = 60_000; // PageSpeed misura davvero la pagina: fino a un minuto

export type ServiceAccount = { client_email: string; private_key: string; private_key_id?: string };

export interface Trasporto {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  getSecret: (name: KeyName) => string | null;
  adesso?: () => Date;
}

type Esito = string | null;

/* ---------------- Service account ---------------- */

const MSG_NON_SA = "Non è il JSON di un service account: incolla il file intero scaricato da Google Cloud, senza modifiche";

/**
 * JSON del file scaricato da Google Cloud (a capo tolti dall'input password), il suo
 * base64, oppure il valore già normalizzato → base64url del JSON compatto
 * `{ client_email, private_key, private_key_id }` (~2,5 KB, sotto il tetto del Keychain).
 * Idempotente. Gli errori non ripetono mai il testo ricevuto.
 */
export function normalizzaServiceAccount(
  testo: string,
): { ok: true; valore: string; sa: ServiceAccount } | { ok: false; errore: string } {
  const t = testo.trim();
  let json: string;
  if (t.startsWith("{")) json = t;
  else if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(t)) json = Buffer.from(t, "base64").toString("utf8"); // base64 e base64url
  else return { ok: false, errore: MSG_NON_SA };

  let dati: unknown;
  try {
    dati = JSON.parse(json);
  } catch {
    return { ok: false, errore: MSG_NON_SA };
  }
  if (!dati || typeof dati !== "object" || Array.isArray(dati)) return { ok: false, errore: MSG_NON_SA };
  const o = dati as Record<string, unknown>;
  // Il valore normalizzato non ha più `type`: si controlla solo quando c'è.
  if (o.type !== undefined && o.type !== "service_account") {
    return {
      ok: false,
      errore: "Il file JSON è un'altra credenziale, non un service account: in Google Cloud apri il service account → Chiavi → Aggiungi chiave → JSON",
    };
  }
  if (typeof o.client_email !== "string" || typeof o.private_key !== "string") return { ok: false, errore: MSG_NON_SA };
  if (!/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(o.client_email)) {
    return {
      ok: false,
      errore: "Il JSON non è di un service account creato nel progetto (e-mail …iam.gserviceaccount.com): usa la chiave del service account di Site-factory",
    };
  }
  try {
    if (crypto.createPrivateKey(o.private_key).asymmetricKeyType !== "rsa") throw new Error("non RSA");
  } catch {
    return {
      ok: false,
      errore: "La chiave privata nel JSON è illeggibile: scarica di nuovo il file JSON da Google Cloud e incollalo senza modifiche",
    };
  }
  const sa: ServiceAccount = {
    client_email: o.client_email,
    private_key: o.private_key,
    ...(typeof o.private_key_id === "string" && o.private_key_id ? { private_key_id: o.private_key_id } : {}),
  };
  return { ok: true, valore: Buffer.from(JSON.stringify(sa)).toString("base64url"), sa };
}

/** JWT del service account (OAuth 2.0 for Server to Server Applications), firmato con node:crypto. */
export function firmaJwt(sa: ServiceAccount, adesso: Date): string {
  const iat = Math.floor(adesso.getTime() / 1000) - 30; // margine sull'orologio
  const parte = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const dati = `${parte({ alg: "RS256", typ: "JWT", ...(sa.private_key_id ? { kid: sa.private_key_id } : {}) })}.${parte({
    iss: sa.client_email,
    scope: SCOPE_GOOGLE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  })}`;
  return `${dati}.${crypto.sign("RSA-SHA256", Buffer.from(dati), sa.private_key).toString("base64url")}`;
}

/* ---------------- Redazione e chiamate ---------------- */

/** Toglie dal testo ogni segreto (anche nella forma codificata per URL). */
export function redigi(testo: string, ...segreti: string[]): string {
  let out = testo;
  for (const s of segreti) {
    if (s.length < 4) continue;
    for (const forma of new Set([s, encodeURIComponent(s)])) out = out.split(forma).join("[chiave nascosta]");
  }
  return out;
}

/** Messaggio già tradotto: esce dalla prova così com'è (dopo redigi). */
class ProvaFallita extends Error {}

type Risposta = { status: number; corpo: unknown; testo: string };

async function chiama(t: Trasporto, servizio: string, url: string, init: RequestInit, timeoutMs: number): Promise<Risposta> {
  try {
    const r = await t.fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const testo = await r.text();
    let corpo: unknown = null;
    try {
      corpo = JSON.parse(testo);
    } catch {
      /* corpo non JSON: resta null */
    }
    return { status: r.status, corpo, testo };
  } catch (e) {
    const nome = e instanceof Error ? e.name : "";
    if (nome === "TimeoutError" || nome === "AbortError") {
      throw new ProvaFallita(`${servizio} non ha risposto entro ${timeoutMs / 1000} s: riprova`);
    }
    throw new ProvaFallita(`${servizio} non raggiungibile: controlla la connessione`);
  }
}

/** Esiti comuni a tutti i servizi (troppe richieste, guasti del server). */
function erroreComune(servizio: string, status: number): Esito {
  if (status === 429) return `${servizio} ha ricevuto troppe richieste: riprova tra qualche minuto`;
  if (status >= 500) return `${servizio} ha un problema temporaneo (${status}): riprova tra qualche minuto`;
  return null;
}

function campo(corpo: unknown, nome: string): unknown {
  return corpo && typeof corpo === "object" ? (corpo as Record<string, unknown>)[nome] : undefined;
}

/** Motivi degli errori Google: `error.details[].reason`, `error.errors[].reason`, `error.status` (solo codici). */
function ragioniGoogle(corpo: unknown): string[] {
  const errore = campo(corpo, "error");
  const out: string[] = [];
  for (const lista of [campo(errore, "details"), campo(errore, "errors")]) {
    if (!Array.isArray(lista)) continue;
    for (const voce of lista) {
      const r = campo(voce, "reason");
      if (typeof r === "string") out.push(r);
    }
  }
  const status = campo(errore, "status");
  if (typeof status === "string") out.push(status);
  return out.filter((r) => /^[A-Za-z_]{1,64}$/.test(r));
}

const apiDisabilitata = (ragioni: string[]) => ragioni.includes("SERVICE_DISABLED") || ragioni.includes("accessNotConfigured");

/* ---------------- Prove ---------------- */

async function provaServiceAccount(valore: string, t: Trasporto, segreti: string[]): Promise<Esito> {
  const n = normalizzaServiceAccount(valore);
  if (!n.ok) return n.errore;
  let jwt: string;
  try {
    jwt = firmaJwt(n.sa, t.adesso?.() ?? new Date());
  } catch {
    return "La chiave privata del service account non riesce a firmare: scarica di nuovo il file JSON da Google Cloud";
  }
  segreti.push(jwt, n.sa.private_key);

  // 1. Token: prova la chiave.
  const tok = await chiama(
    t,
    "Google",
    TOKEN_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }).toString(),
    },
    TIMEOUT_MS,
  );
  const errOauth = campo(tok.corpo, "error");
  if (errOauth === "invalid_grant") {
    return "Google ha rifiutato la chiave del service account: è stata revocata o cancellata in Google Cloud, oppure l'ora del Mac è sbagliata (Impostazioni di Sistema → Generali → Data e ora)";
  }
  if (errOauth === "invalid_client" || tok.status === 401) {
    return "Google non trova il service account: è stato cancellato o disattivato in Google Cloud; crea una chiave JSON nuova";
  }
  const accessToken = campo(tok.corpo, "access_token");
  if (tok.status !== 200 || typeof accessToken !== "string" || !accessToken) {
    return erroreComune("Google", tok.status) ?? `Google non ha rilasciato il token del service account (${tok.status})`;
  }
  segreti.push(accessToken);
  const auth = { Authorization: `Bearer ${accessToken}` };

  // 2-3. Una lettura per API: dice quale manca (stop al primo errore).
  const letture = [
    { servizio: "Google Search Console", api: "Google Search Console API", url: "https://www.googleapis.com/webmasters/v3/sites" },
    { servizio: "Google Site Verification", api: "Site Verification API", url: "https://www.googleapis.com/siteVerification/v1/webResource" },
  ];
  for (const { servizio, api, url } of letture) {
    const r = await chiama(t, servizio, url, { headers: auth }, TIMEOUT_MS);
    if (r.status === 200) continue;
    const ragioni = ragioniGoogle(r.corpo);
    if (apiDisabilitata(ragioni)) {
      return `La ${api} non è abilitata nel progetto del service account: abilitala in Google Cloud → API e servizi → Libreria, poi riprova tra qualche minuto`;
    }
    const comune = erroreComune(servizio, r.status);
    if (comune) return comune;
    if (r.status === 403) return `${servizio} ha negato l'accesso al service account (403${ragioni[0] ? ` ${ragioni[0]}` : ""})`;
    return `${servizio} ha risposto ${r.status}`;
  }
  return null;
}

async function provaApiKeyGoogle(valore: string, t: Trasporto): Promise<Esito> {
  if (!/^AIza[0-9A-Za-z_-]{35}$/.test(valore)) {
    return "Non è una API key di Google Cloud: inizia con «AIza» ed è lunga 39 caratteri; copiala da API e servizi → Credenziali";
  }
  const servizio = "Google PageSpeed Insights";
  const r = await chiama(
    t,
    servizio,
    "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=https%3A%2F%2Fwww.google.com%2F&strategy=mobile&category=performance",
    { headers: { "X-Goog-Api-Key": valore } },
    TIMEOUT_PSI_MS,
  );
  if (r.status === 200 || r.status === 429) return null; // 429 = chiave valida, quota esaurita per ora
  const ragioni = ragioniGoogle(r.corpo);
  if (ragioni.includes("API_KEY_INVALID")) {
    return "Google non riconosce la API key: copiala di nuovo da Google Cloud → API e servizi → Credenziali";
  }
  if (apiDisabilitata(ragioni)) {
    return "La PageSpeed Insights API non è abilitata nel progetto della chiave: abilitala in Google Cloud → API e servizi → Libreria, poi riprova tra qualche minuto";
  }
  if (ragioni.includes("API_KEY_SERVICE_BLOCKED")) {
    return "La API key è limitata ad altre API: nelle restrizioni della chiave aggiungi PageSpeed Insights API e Chrome UX Report API";
  }
  if (ragioni.some((x) => /^API_KEY_[A-Z_]+_BLOCKED$/.test(x))) {
    return "La API key ha restrizioni per sito, IP o app che bloccano l'editor: in Google Cloud togli le restrizioni delle applicazioni della chiave";
  }
  return erroreComune(servizio, r.status) ?? `${servizio} ha risposto ${r.status}`;
}

async function provaBing(valore: string, t: Trasporto): Promise<Esito> {
  const servizio = "Bing Webmaster Tools";
  const r = await chiama(
    t,
    servizio,
    `https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=${encodeURIComponent(valore)}`,
    {},
    TIMEOUT_MS,
  );
  if (r.status === 200 && Array.isArray(campo(r.corpo, "d"))) return null;
  if (/InvalidApiKey/i.test(r.testo)) {
    return "Bing non riconosce la API key: rigenerala in Bing Webmaster Tools → Impostazioni → Accesso API";
  }
  return erroreComune(servizio, r.status) ?? `${servizio} ha risposto ${r.status}${r.status === 200 ? " in un formato inatteso" : ""}`;
}

async function provaDataForSeo(name: "DATAFORSEO_LOGIN" | "DATAFORSEO_PASSWORD", valore: string, t: Trasporto, segreti: string[]): Promise<Esito> {
  const altra = t.getSecret(name === "DATAFORSEO_LOGIN" ? "DATAFORSEO_PASSWORD" : "DATAFORSEO_LOGIN");
  if (!altra) return null; // la prova parte quando ci sono entrambe (come l'account ID Cloudflare)
  const [login, password] = name === "DATAFORSEO_LOGIN" ? [valore, altra] : [altra, valore];
  const basic = Buffer.from(`${login}:${password}`).toString("base64");
  segreti.push(altra, basic);
  const servizio = "DataForSEO";
  // user_data: dati dell'account, gratuito («Your account will not be charged»).
  const r = await chiama(t, servizio, "https://api.dataforseo.com/v3/appendix/user_data", { headers: { Authorization: `Basic ${basic}` } }, TIMEOUT_MS);
  const codice = campo(r.corpo, "status_code");
  if (r.status === 200 && codice === 20000) return null;
  if (codice === 40104) return "L'account DataForSEO va verificato prima di usare le API: completa la verifica su app.dataforseo.com";
  if (codice === 40207) {
    return "L'IP di questo Mac non è nella whitelist di DataForSEO: aggiungilo, o togli la whitelist, in app.dataforseo.com → API Access";
  }
  if (r.status === 401 || codice === 40100) {
    return "DataForSEO ha rifiutato login o password: controllali su app.dataforseo.com → API Access";
  }
  const comune = erroreComune(servizio, r.status);
  if (comune) return comune;
  return `${servizio} ha risposto ${r.status}${typeof codice === "number" ? ` (codice ${codice})` : ""}`;
}

const MSG_ZONA =
  "Il token non vede la zona consulbuild.com: servono i permessi Zone: Read e DNS: Edit su tutte le zone dell'account ConsulBuild";

async function provaCloudflareDns(valore: string, t: Trasporto): Promise<Esito> {
  const account = t.getSecret("CLOUDFLARE_ACCOUNT_ID");
  const servizio = "Cloudflare";
  const r = await chiama(
    t,
    servizio,
    `https://api.cloudflare.com/client/v4/zones?name=consulbuild.com&per_page=5${account ? `&account.id=${encodeURIComponent(account)}` : ""}`,
    { headers: { Authorization: `Bearer ${valore}` } },
    TIMEOUT_MS,
  );
  const zone = campo(r.corpo, "result");
  if (r.status === 200 && Array.isArray(zone)) return zone.length > 0 ? null : MSG_ZONA;
  // Calibrazione 15/09: un token ben formato ma inesistente risponde 403 con
  // `errors[].message` «Invalid access token» (codice 9109), non 401.
  const errori = campo(r.corpo, "errors");
  const tokenInvalido = Array.isArray(errori) && errori.some((e) => /invalid (access|api) token/i.test(String(campo(e, "message") ?? "")));
  if (r.status === 400 || r.status === 401 || tokenInvalido) {
    return "Cloudflare non riconosce il token: non è valido o è scaduto; creane uno in Cloudflare → Profilo → API Tokens";
  }
  if (r.status === 403) return MSG_ZONA;
  return erroreComune(servizio, r.status) ?? `${servizio} ha risposto ${r.status}`;
}

/**
 * Prova gratuita di una chiave del Traffico. null = valida (o, per DataForSEO,
 * metà della coppia senza l'altra salvata); altrimenti il motivo in italiano,
 * senza il valore. Non lancia mai.
 */
export async function provaChiaveTraffico(name: ChiaveTraffico, valore: string, t: Trasporto): Promise<Esito> {
  const segreti = [valore];
  try {
    let esito: Esito;
    if (name === "GOOGLE_SERVICE_ACCOUNT") esito = await provaServiceAccount(valore, t, segreti);
    else if (name === "GOOGLE_API_KEY") esito = await provaApiKeyGoogle(valore, t);
    else if (name === "BING_WEBMASTER_API_KEY") esito = await provaBing(valore, t);
    else if (name === "CLOUDFLARE_DNS_API_TOKEN") esito = await provaCloudflareDns(valore, t);
    else esito = await provaDataForSeo(name, valore, t, segreti);
    return esito === null ? null : redigi(esito, ...segreti);
  } catch (e) {
    if (e instanceof ProvaFallita) return redigi(e.message, ...segreti);
    // Mai il messaggio dell'eccezione: potrebbe contenere il valore.
    return `prova interrotta da un errore imprevisto (${e instanceof Error ? e.name : "sconosciuto"}): riprova`;
  }
}
