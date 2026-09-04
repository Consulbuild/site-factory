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

const WRANGLER_BIN = path.join(SITE_RENDERER, "node_modules", ".bin", "wrangler");
const DEPLOY_TIMEOUT_MS = 180_000;

export interface DeployResult {
  workerName: string;
  url: string;
  infra: InfraEsito;
}

export async function deployClient(slug: string): Promise<DeployResult> {
  const token = getSecret("CLOUDFLARE_API_TOKEN");
  const account = getSecret("CLOUDFLARE_ACCOUNT_ID");
  if (!token || !account) {
    throw new Error("chiavi Cloudflare mancanti: configura token e account ID dal pannello «Chiavi API»");
  }
  const dir = clientDir(slug);
  if (!fs.existsSync(path.join(dir, "dist", "index.html"))) {
    throw new Error("nessuna build da pubblicare: builda prima il sito");
  }

  const build = readClientState(slug).steps.build;
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
    compatibility_date: "2026-07-08",
    assets: { directory: "./dist" },
    // workers.dev resta attivo anche col dominio custom (anteprima/failover):
    // dichiarando `routes`, wrangler altrimenti lo SPEGNE di default — visto
    // in produzione sul primo deploy con dominio (2026-07-22).
    workers_dev: true,
    ...(dominio ? { routes: [{ pattern: dominio, custom_domain: true }] } : {}),
  });

  const child = spawn(WRANGLER_BIN, ["deploy"], {
    cwd: dir,
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
    throw new Error(`wrangler deploy fallito (exit ${code}):\n${coda}`);
  }
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
  return { workerName: slug, url, infra };
}
