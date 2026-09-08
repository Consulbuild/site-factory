import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { SITE_RENDERER, childEnv, clientDir } from "./paths";
import { readClientState, patchClientState, writeJson } from "./clients";
import { getSecret } from "./secrets";
import { syncInfra, type InfraEsito } from "./integrazioni";

// Pubblicazione su Cloudflare Workers static assets (decisione 2026-07,
// docs/decisions/2026-07-verifiche-fase-b.md §6): wrangler.jsonc per cliente
// con la sola dist come assets, spawn di wrangler (devDependency pinnata del
// renderer). Token/account dal Keychain, iniettati come env — mai in argv.
// Dopo la pubblicazione il cliente viene proiettato sull'infra del VPS
// (registro n8n del modulo, monitor Gatus): esito in steps.build.infra.
//
// Demo (2026-09-08): worker SEPARATO «<slug>-demo» con route
// <nome>.demo.consulbuild.com (config wrangler.demo.jsonc). Oggetto Cloudflare
// distinto dal sito vero: spegnere la demo (unico `wrangler delete` del
// progetto) non può mai toccare il sito pagato. Niente infra per le demo.

const WRANGLER_BIN = path.join(SITE_RENDERER, "node_modules", ".bin", "wrangler");
const DEPLOY_TIMEOUT_MS = 180_000;
const COMPATIBILITY_DATE = "2026-07-08";

export const DEMO_ZONA = "demo.consulbuild.com";
export const DEMO_GIORNI = 15;
const GIORNO_MS = 86_400_000;
const DEMO_CONFIG = "wrangler.demo.jsonc";

export interface DeployResult {
  workerName: string;
  url: string;
  infra: InfraEsito;
}

function chiaviCloudflare(): { token: string; account: string } {
  const token = getSecret("CLOUDFLARE_API_TOKEN");
  const account = getSecret("CLOUDFLARE_ACCOUNT_ID");
  if (!token || !account) {
    throw new Error("chiavi Cloudflare mancanti: configura token e account ID dal pannello «Chiavi API»");
  }
  return { token, account };
}

/** Esegue wrangler nella cartella del cliente; ritorna stdout, lancia con la coda dell'output se fallisce. */
async function wrangler(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  const { token, account } = chiaviCloudflare();
  const child = spawn(WRANGLER_BIN, args, {
    cwd,
    env: childEnv({
      CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: account,
      WRANGLER_SEND_METRICS: "false",
      NO_COLOR: "1",
    }),
  });
  const timer = setTimeout(() => child.kill("SIGTERM"), DEPLOY_TIMEOUT_MS);
  const killer = setTimeout(() => child.kill("SIGKILL"), DEPLOY_TIMEOUT_MS + 10_000);

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
  child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
  const code = await new Promise<number>((resolve, reject) => {
    child.on("close", (c) => resolve(c ?? 1));
    child.on("error", reject);
  });
  clearTimeout(timer);
  clearTimeout(killer);

  if (code !== 0) {
    const coda = (stderr.trim() || stdout.trim()).split("\n").slice(-6).join("\n");
    throw new Error(`wrangler ${args[0]} fallito (exit ${code}):\n${coda}`);
  }
  return { stdout, stderr };
}

export async function deployClient(slug: string): Promise<DeployResult> {
  chiaviCloudflare();
  const dir = clientDir(slug);
  if (!fs.existsSync(path.join(dir, "dist", "index.html"))) {
    throw new Error("nessuna build da pubblicare: builda prima il sito");
  }

  const build = readClientState(slug).steps.build;
  if (build.noindex) {
    throw new Error("la build è noindex (demo): ribuilda in percorso completo per pubblicare il sito reale.");
  }
  const dominio = build.dominio;
  // canonical e og: assoluti sono cotti nell'HTML al momento della build
  // (SITE_URL): se il dominio è cambiato dopo, pubblicare metterebbe online
  // un sito senza (o con) il canonical sbagliato. Si richiede il rebuild.
  const siteUrlAttesa = dominio ? `https://${dominio}` : undefined;
  if (build.siteUrl !== siteUrlAttesa) {
    throw new Error(
      dominio
        ? `la build è stata prodotta ${build.siteUrl ? `con SITE_URL ${build.siteUrl}` : "senza dominio"}: canonical e og: assoluti non corrispondono a https://${dominio}. Ribuilda, riconferma e poi pubblica.`
        : `la build è stata prodotta col dominio ${build.siteUrl} ora rimosso: canonical e og: assoluti puntano ancora lì. Ribuilda, riconferma e poi pubblica.`,
    );
  }
  // Stessa regola per le integrazioni cotte nell'HTML (script Umami, action del
  // modulo): col dominio devono esserci e puntare al sito Umami corrente; senza
  // dominio non devono esserci (un sito demo non registra statistiche né lead).
  const integrazioniAttese = dominio
    ? !!build.integrazioni && build.integrazioni.umamiWebsiteId === build.umamiWebsiteId
    : !build.integrazioni;
  if (!integrazioniAttese) {
    throw new Error(
      dominio
        ? "la build è stata prodotta senza le integrazioni del dominio (statistiche Umami e modulo reale) o con un sito Umami diverso. Ribuilda, riconferma e poi pubblica."
        : "la build contiene ancora le integrazioni del dominio ora rimosso (statistiche e modulo). Ribuilda, riconferma e poi pubblica.",
    );
  }

  // ponytail: nome worker = slug (già [a-z0-9-]; il più lungo oggi è 47 char,
  // ben sotto il limite Workers — se mai servisse, qui si tronca).
  writeJson(path.join(dir, "wrangler.jsonc"), {
    name: slug,
    compatibility_date: COMPATIBILITY_DATE,
    assets: { directory: "./dist" },
    // workers.dev resta attivo anche col dominio custom (anteprima/failover):
    // dichiarando `routes`, wrangler altrimenti lo SPEGNE di default — visto
    // in produzione sul primo deploy con dominio (2026-07-22).
    workers_dev: true,
    ...(dominio ? { routes: [{ pattern: dominio, custom_domain: true }] } : {}),
  });

  const { stdout } = await wrangler(["deploy"], dir);
  // wrangler stampa l'URL di pubblicazione (workers.dev, o il dominio custom).
  const url =
    stdout.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i)?.[0] ??
    (dominio ? `https://${dominio}` : null);
  if (!url) {
    throw new Error(`deploy riuscito ma URL non trovato nell'output di wrangler:\n${stdout.trim().split("\n").slice(-6).join("\n")}`);
  }

  patchClientState(slug, (s) => {
    s.steps.build.deploy = {
      workerName: slug,
      url,
      deployedAt: new Date().toISOString(),
      ...(dominio ? { dominio } : {}),
    };
  });
  // Proiezione sull'infra: SEMPRE (senza dominio rimuove un eventuale monitor
  // di un dominio tolto). Non fa fallire il deploy: il sito è già online,
  // l'esito (anche negativo) è nello stato e la scheda lo mostra.
  const infra = await syncInfra(slug);
  patchClientState(slug, (s) => {
    s.steps.build.infra = infra;
  });
  // Go-live col dominio: la demo ha finito il suo lavoro. Best effort come
  // l'infra (il sito vero è già online; l'errore resta in demo.errore).
  const demo = readClientState(slug).demo;
  if (dominio && demo && !demo.spentaAt) {
    await spegniDemo(slug).catch(() => undefined);
  }
  return { workerName: slug, url, infra };
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

/**
 * Etichetta dell'host demo dal nome sito scelto dal cliente nel form
 * («cavalierebuild.it (libero)» → «cavalierebuild»): il lead vede già il suo
 * nome. Fallback: lo slug. Solo [a-z0-9-], max 40, mai trattini ai bordi.
 */
export function etichettaDemo(dominioScelto: unknown, slug: string): string {
  const base = String(dominioScelto ?? "")
    .toLowerCase()
    .replace(/\s*\((libero|preso|sconosciuto)\)\s*$/, "")
    .trim()
    .replace(/^www\./, "")
    .replace(/\.[a-z]{2,}$/, "");
  const etichetta = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return etichetta || slug;
}

export const demoWorkerName = (slug: string) => `${slug}-demo`;

function leggiDominioScelto(dir: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "brief.json"), "utf8")).dominio_scelto;
  } catch {
    return undefined;
  }
}

export interface DemoResult {
  host: string;
  url: string;
  scadenza: string;
}

/**
 * Pubblica la build demo sul worker «<slug>-demo» con route
 * <etichetta>.demo.consulbuild.com. Cloudflare crea DNS e certificato (il
 * certificato del 3° livello arriva in qualche minuto: verificato 2026-09-08).
 * Ripubblicare una demo accesa NON allunga la scadenza (15 gg dalla prima
 * pubblicazione); una demo spenta riparte da zero.
 */
export async function deployDemo(slug: string): Promise<DemoResult> {
  chiaviCloudflare();
  const dir = clientDir(slug);
  if (!fs.existsSync(path.join(dir, "dist", "index.html"))) {
    throw new Error("nessuna build da pubblicare: builda prima il sito");
  }
  const st = readClientState(slug);
  const build = st.steps.build;
  if (build.stato !== "verificato" || build.partial) {
    throw new Error("si pubblica solo una build completa e confermata");
  }
  if (!build.noindex) {
    throw new Error("la build non è noindex: ribuilda in percorso demo prima di pubblicare la demo");
  }
  if (build.siteUrl || build.integrazioni) {
    throw new Error("la build contiene dominio o integrazioni (statistiche, modulo reale): una demo non deve averli. Togli il dominio e ribuilda.");
  }

  const host = `${etichettaDemo(leggiDominioScelto(dir), slug)}.${DEMO_ZONA}`;
  const workerName = demoWorkerName(slug);
  writeJson(path.join(dir, DEMO_CONFIG), {
    name: workerName,
    compatibility_date: COMPATIBILITY_DATE,
    assets: { directory: "./dist" },
    workers_dev: true,
    routes: [{ pattern: host, custom_domain: true }],
  });
  await wrangler(["deploy", "--config", DEMO_CONFIG], dir);

  const now = new Date();
  const accesa = st.demo && !st.demo.spentaAt;
  const pubblicataAt = accesa ? st.demo!.pubblicataAt : now.toISOString();
  const scadenza = accesa ? st.demo!.scadenza : new Date(now.getTime() + DEMO_GIORNI * GIORNO_MS).toISOString();
  patchClientState(slug, (s) => {
    s.demo = {
      host,
      workerName,
      url: `https://${host}`,
      pubblicataAt,
      scadenza,
      ...(s.demo?.congelata ? { congelata: true } : {}),
    };
  });
  return { host, url: `https://${host}`, scadenza };
}

/**
 * Spegne la demo: cancella SOLO il worker «<slug>-demo» (route e DNS cadono
 * con lui). Worker già assente = spenta comunque. Registra spentaAt.
 */
export async function spegniDemo(slug: string): Promise<void> {
  const dir = clientDir(slug);
  const workerName = demoWorkerName(slug);
  const args = ["delete", "--force", "--name", workerName];
  if (fs.existsSync(path.join(dir, DEMO_CONFIG))) args.push("--config", DEMO_CONFIG);
  try {
    await wrangler(args, dir);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/not found|10007|does not exist/i.test(msg)) {
      patchClientState(slug, (s) => {
        if (s.demo) s.demo.errore = msg;
      });
      throw e;
    }
  }
  patchClientState(slug, (s) => {
    if (s.demo) {
      s.demo.spentaAt = new Date().toISOString();
      delete s.demo.errore;
    }
  });
}

/** Proroga la scadenza della demo accesa di altri DEMO_GIORNI. */
export function prorogaDemo(slug: string): string {
  let scadenza = "";
  patchClientState(slug, (s) => {
    if (!s.demo || s.demo.spentaAt) throw new Error("nessuna demo accesa da prorogare");
    const base = Math.max(Date.parse(s.demo.scadenza), Date.now());
    scadenza = new Date(base + DEMO_GIORNI * GIORNO_MS).toISOString();
    s.demo.scadenza = scadenza;
  });
  return scadenza;
}
