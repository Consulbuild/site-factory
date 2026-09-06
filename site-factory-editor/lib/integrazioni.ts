import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
// Import con estensione .ts (come legale.ts): il modulo gira anche standalone
// con `node --experimental-strip-types` (script di sync/test), non solo in Next.
import { REPO_ROOT, childEnv, clientDir } from "./paths.ts";
import { getSecret } from "./secrets.ts";

// Integrazioni del VPS (sf-prod-01) nella pipeline: Umami (statistiche senza
// cookie), n8n (modulo del sito + registro clienti), Gatus (monitor). Sono
// INFRASTRUTTURA dell'agenzia, mai contenuto: non passano da site.json/slots —
// l'HTML le riceve come env di build (precedente: SITE_URL) e lo stato
// per-cliente ne tiene l'impronta (schemas.ts). Tutto idempotente: ripubblicare
// non duplica nulla. Guida operativa: docs/vps-integrazioni-setup.md.

export const UMAMI_HOST = "https://stats.consulbuild.com";
export const N8N_HOST = "https://n8n.consulbuild.com";
const UMAMI_USER = "site-factory"; // utente dedicato (ruolo user): vede solo i propri siti
const GATUS_CLIENTI_REL = "infra/gatus/config/clienti";
const GATUS_CLIENTI = path.join(REPO_ROOT, GATUS_CLIENTI_REL);
const HTTP_TIMEOUT_MS = 15_000;
const GIT = "/usr/bin/git";

/** Endpoint del modulo del sito: un solo webhook a path fisso, lo slug in query
 *  string (n8n lo cerca nel registro). Non un parametro di path (`:slug`): n8n
 *  antepone a quei webhook l'id interno del nodo, che cambierebbe ricreando il
 *  workflow — verificato 2026-09-05. */
export const formAction = (slug: string) => `${N8N_HOST}/webhook/form-lead?slug=${slug}`;

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** fetch con timeout. Le letture della dashboard passano un timeout più corto
 *  (una fonte giù non deve tenere in attesa l'hub per 15 s). */
export async function http(url: string, init: RequestInit = {}, timeoutMs = HTTP_TIMEOUT_MS): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

/* ---------------- Umami ---------------- */

export async function umamiLogin(password = getSecret("UMAMI_PASSWORD")): Promise<string> {
  if (!password) throw new Error("chiave UMAMI_PASSWORD mancante: configurala dal pannello «Chiavi API»");
  const r = await http(`${UMAMI_HOST}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: UMAMI_USER, password }),
  });
  if (!r.ok) throw new Error(`Umami: login rifiutato (${r.status})`);
  const j = (await r.json()) as { token?: string };
  if (!j.token) throw new Error("Umami: login senza token");
  return j.token;
}

type UmamiWebsite = { id: string; name: string; domain: string };

export function umami(token: string, pathname: string, init: RequestInit = {}): Promise<Response> {
  return http(`${UMAMI_HOST}/api${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

/** Sito Umami del cliente: riusa websiteId (allineando nome/dominio se cambiati),
 *  altrimenti lo crea. Ritorna l'id da cuocere nell'HTML. */
export async function ensureUmamiWebsite(dominio: string, nome: string, websiteId?: string): Promise<string> {
  const token = await umamiLogin();
  if (websiteId) {
    const r = await umami(token, `/websites/${websiteId}`);
    if (r.ok) {
      const w = (await r.json()) as UmamiWebsite;
      if (w.domain !== dominio || w.name !== nome) {
        const u = await umami(token, `/websites/${websiteId}`, {
          method: "POST",
          body: JSON.stringify({ name: nome, domain: dominio }),
        });
        if (!u.ok) throw new Error(`Umami: aggiornamento del sito fallito (${u.status})`);
      }
      return websiteId;
    }
    if (r.status !== 404) throw new Error(`Umami: lettura del sito fallita (${r.status})`);
    // 404 = cancellato lato Umami: si ricrea (l'id vecchio nello stato viene sostituito)
  }
  const c = await umami(token, "/websites", { method: "POST", body: JSON.stringify({ name: nome, domain: dominio }) });
  if (!c.ok) throw new Error(`Umami: creazione del sito fallita (${c.status}) — l'utente ${UMAMI_USER} può creare siti?`);
  const w = (await c.json()) as UmamiWebsite;
  if (!w.id) throw new Error("Umami: creazione del sito senza id");
  return w.id;
}

export async function deleteUmamiWebsite(websiteId: string): Promise<void> {
  const token = await umamiLogin();
  const r = await umami(token, `/websites/${websiteId}`, { method: "DELETE" });
  if (!r.ok && r.status !== 404) throw new Error(`Umami: eliminazione del sito fallita (${r.status})`);
}

/* ---------------- n8n ---------------- */

/** Prova della API key (usata solo dallo script di import dei workflow). */
export async function n8nPing(apiKey: string): Promise<string | null> {
  const r = await http(`${N8N_HOST}/api/v1/workflows?limit=1`, { headers: { "X-N8N-API-KEY": apiKey } });
  return r.ok ? null : `n8n ha risposto ${r.status}: API key non valida`;
}

export type RegistraCliente = {
  slug: string;
  azione: "upsert" | "rimuovi" | "ping";
  azienda?: string;
  dominio?: string;
  email?: string;
  /** Referente del brief: secondo criterio (dopo l'e-mail) con cui il report al
   *  rinnovo riconosce il cliente Stripe. */
  referente?: string;
  /** Sito Umami del cliente: il report al rinnovo legge da qui le statistiche. */
  umamiWebsiteId?: string;
};

/** Registro clienti di n8n (Data table «Clienti»): il workflow form-lead vi
 *  cerca lo slug del sito e recapita il lead all'e-mail del cliente; il
 *  workflow report-rinnovo vi trova e-mail, referente e sito Umami. */
export async function registraCliente(p: RegistraCliente, key = getSecret("N8N_REGISTRA_KEY")): Promise<void> {
  if (!key) throw new Error("chiave N8N_REGISTRA_KEY mancante: configurala dal pannello «Chiavi API»");
  const r = await http(`${N8N_HOST}/webhook/registra-cliente`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Site-Factory-Key": key },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw new Error(`n8n registra-cliente ha risposto ${r.status}`);
}

/* ---------------- Gatus (monitor) ---------------- */

/** Blocco YAML del monitor di un sito (formato piatto: niente dipendenza yaml;
 *  il dominio è già validato da DOMAIN_RE alla scrittura). */
export function gatusYaml(dominio: string): string {
  return [
    `# Generato dall'editor al deploy — non modificare a mano.`,
    `endpoints:`,
    `  - name: ${dominio}`,
    `    group: clienti`,
    `    url: "https://${dominio}/"`,
    `    interval: 5m`,
    `    conditions:`,
    `      - "[STATUS] == 200"`,
    `      - "[RESPONSE_TIME] < 3000"`,
    `      - "[CERTIFICATE_EXPIRATION] > 168h"`,
    `    alerts:`,
    `      - type: telegram`,
    ``,
  ].join("\n");
}

/** Scrive/rimuove clienti/<slug>.yaml; true se qualcosa è cambiato su disco. */
function syncGatusFile(slug: string, dominio: string | null): boolean {
  const file = path.join(GATUS_CLIENTI, `${slug}.yaml`);
  if (!dominio) {
    if (!fs.existsSync(file)) return false;
    fs.rmSync(file);
    return true;
  }
  const next = gatusYaml(dominio);
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === next) return false;
  fs.mkdirSync(GATUS_CLIENTI, { recursive: true });
  fs.writeFileSync(file, next);
  return true;
}

function git(args: string[]): { ok: boolean; out: string } {
  // GIT_TERMINAL_PROMPT=0: mai un processo appeso in attesa di credenziali
  // (il remote è HTTPS con osxkeychain: le credenziali ci sono o si fallisce).
  const r = spawnSync(GIT, args, { cwd: REPO_ROOT, encoding: "utf8", env: childEnv({ GIT_TERMINAL_PROMPT: "0" }) });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

/** Commit + push del SOLO path dei monitor (pathspec: lo staging dell'operatore
 *  resta com'è). Coolify ridistribuisce Gatus a ogni push su main. */
function commitGatus(messaggio: string): { commit?: string; pushed: boolean; errore?: string } {
  const add = git(["add", "--", GATUS_CLIENTI_REL]);
  if (!add.ok) return { pushed: false, errore: `git add: ${add.out}` };
  const st = git(["status", "--porcelain", "--", GATUS_CLIENTI_REL]);
  if (!st.ok) return { pushed: false, errore: `git status: ${st.out}` };
  if (!st.out) return { pushed: true }; // già allineato: niente commit
  const c = git(["commit", "-m", messaggio, "--", GATUS_CLIENTI_REL]);
  if (!c.ok) return { pushed: false, errore: `git commit: ${c.out}` };
  const commit = git(["rev-parse", "--short", "HEAD"]).out;
  const p = git(["push", "origin", "HEAD:main"]);
  return p.ok ? { commit, pushed: true } : { commit, pushed: false, errore: `git push: ${p.out.split("\n").slice(-2).join(" ")}` };
}

/* ---------------- proiezione al deploy / all'eliminazione ---------------- */

export type InfraEsito = { at: string; commit?: string; pushed: boolean; n8nOk: boolean; errore?: string };

/** Lettura tollerante di un JSON del workspace (niente Zod qui: il modulo
 *  resta importabile standalone senza trascinarsi clients.ts). */
function readJsonLoose(slug: string, file: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(path.join(clientDir(slug), file), "utf8"));
  } catch {
    return {};
  }
}

/** Dopo un deploy: registro n8n + monitor Gatus (commit/push). Non lancia mai:
 *  il sito è già online, gli errori tornano nell'esito e la scheda li mostra. */
export async function syncInfra(slug: string): Promise<InfraEsito> {
  const stato = readJsonLoose(slug, "client.json") as {
    steps?: { build?: { deploy?: { dominio?: string }; umamiWebsiteId?: string } };
  };
  const dominio = stato.steps?.build?.deploy?.dominio ?? null;
  const brief = readJsonLoose(slug, "brief.json");
  return proietta(slug, {
    dominio,
    azienda: String(brief.azienda ?? slug),
    email: String(brief.email ?? ""),
    referente: String(brief.referente ?? ""),
    umamiWebsiteId: stato.steps?.build?.umamiWebsiteId,
  });
}

/** Dopo l'eliminazione del cliente: via dal registro e dal monitor. */
export async function rimuoviInfra(slug: string): Promise<InfraEsito> {
  return proietta(slug, { dominio: null });
}

type DatiRegistro = { dominio: string | null } & Pick<RegistraCliente, "azienda" | "email" | "referente" | "umamiWebsiteId">;

async function proietta(slug: string, c: DatiRegistro): Promise<InfraEsito> {
  const errori: string[] = [];
  let n8nOk = false;
  try {
    const { dominio, ...dati } = c;
    await registraCliente(dominio ? { slug, azione: "upsert", dominio, ...dati } : { slug, azione: "rimuovi" });
    n8nOk = true;
  } catch (e) {
    errori.push(msg(e));
  }
  let commit: string | undefined;
  let pushed = true;
  try {
    if (syncGatusFile(slug, c.dominio)) {
      const g = commitGatus(c.dominio ? `Monitor: +${slug} (${c.dominio})` : `Monitor: −${slug} (cliente rimosso)`);
      commit = g.commit;
      pushed = g.pushed;
      if (g.errore) errori.push(g.errore);
    }
  } catch (e) {
    pushed = false;
    errori.push(msg(e));
  }
  return {
    at: new Date().toISOString(),
    ...(commit ? { commit } : {}),
    pushed,
    n8nOk,
    ...(errori.length ? { errore: errori.join(" · ") } : {}),
  };
}

/* ---------------- letture per la dashboard (docs/piano-dashboard-clienti.md) ---------------- */

/** Timeout delle letture della dashboard: una fonte giù non blocca la pagina a lungo. */
export const DASHBOARD_TIMEOUT_MS = 8_000;

async function n8nGet<T>(pathname: string, apiKey: string | null): Promise<T> {
  if (!apiKey) throw new Error("chiave N8N_API_KEY mancante: configurala dal pannello «Chiavi API»");
  const r = await http(`${N8N_HOST}/api/v1${pathname}`, { headers: { "X-N8N-API-KEY": apiKey } }, DASHBOARD_TIMEOUT_MS);
  if (!r.ok) throw new Error(`n8n ha risposto ${r.status} su ${pathname}`);
  return (await r.json()) as T;
}

/** Tutte le righe di una Data table n8n, risolta per NOME (l'id non si cabla:
 *  cambia se la tabella viene ricreata). Pagina con `cursor`, unico parametro
 *  accettato insieme a `limit` (max 100: verificato 2026-09-06). */
export async function n8nDataTable(nome: string, apiKey = getSecret("N8N_API_KEY")): Promise<Record<string, unknown>[]> {
  const tabelle = await n8nGet<{ data: Array<{ id: string; name: string }> }>("/data-tables", apiKey);
  const t = tabelle.data.find((x) => x.name === nome);
  if (!t) throw new Error(`Data table «${nome}» non trovata in n8n`);
  const righe: Record<string, unknown>[] = [];
  let cursor: string | null = null;
  do {
    const pagina: { data: Record<string, unknown>[]; nextCursor: string | null } = await n8nGet(
      `/data-tables/${t.id}/rows?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      apiKey,
    );
    righe.push(...pagina.data);
    cursor = pagina.nextCursor;
  } while (cursor);
  return righe;
}

/** Lead ricevuti (tabella «Lead», scritta da sf-form-lead dopo l'e-mail): solo slug e data. */
export async function leggiLead(): Promise<Array<{ slug: string; quando: string }>> {
  const righe = await n8nDataTable("Lead");
  return righe.map((r) => ({ slug: String(r.slug ?? ""), quando: String(r.quando ?? "") }));
}

/** Registro «Clienti» di n8n: serve `stripe_customer`, scritto dal report al
 *  rinnovo al primo abbinamento, come secondo criterio di collegamento. */
export async function leggiRegistroClienti(): Promise<Array<{ slug: string; stripeCustomer: string | null }>> {
  const righe = await n8nDataTable("Clienti");
  return righe.map((r) => ({ slug: String(r.slug ?? ""), stripeCustomer: r.stripe_customer ? String(r.stripe_customer) : null }));
}

export type UmamiRiepilogo = { visitatori30: number; visitatori30Prec: number };

/** Visitatori degli ultimi 30 giorni e dei 30 precedenti (`stats` con `comparison`,
 *  forma vista sull'istanza il 2026-09-05: valori piatti). */
export async function umamiRiepilogo(websiteId: string, ora = Date.now()): Promise<UmamiRiepilogo> {
  const token = await umamiLogin();
  const start = ora - 30 * 86_400_000;
  const r = await umami(token, `/websites/${websiteId}/stats?startAt=${start}&endAt=${ora}`);
  if (!r.ok) throw new Error(`Umami: statistiche non lette (${r.status})`);
  const j = (await r.json()) as { visitors?: number; comparison?: { visitors?: number } };
  return { visitatori30: Number(j.visitors ?? 0), visitatori30Prec: Number(j.comparison?.visitors ?? 0) };
}
