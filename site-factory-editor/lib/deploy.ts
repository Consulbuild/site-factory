import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { SITE_RENDERER, childEnv, clientDir } from "./paths";
import { readClientState, patchClientState, writeJson } from "./clients";
import { getSecret } from "./secrets";

// Pubblicazione su Cloudflare Workers static assets (decisione 2026-07,
// docs/decisions/2026-07-verifiche-fase-b.md §6): wrangler.jsonc per cliente
// con la sola dist come assets, spawn di wrangler (devDependency pinnata del
// renderer). Token/account dal Keychain, iniettati come env — mai in argv.

const WRANGLER_BIN = path.join(SITE_RENDERER, "node_modules", ".bin", "wrangler");
const DEPLOY_TIMEOUT_MS = 180_000;

export interface DeployResult {
  workerName: string;
  url: string;
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

  // ponytail: nome worker = slug (già [a-z0-9-]; il più lungo oggi è 47 char,
  // ben sotto il limite Workers — se mai servisse, qui si tronca).
  const dominio = readClientState(slug).steps.build.dominio;
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
  return { workerName: slug, url };
}
