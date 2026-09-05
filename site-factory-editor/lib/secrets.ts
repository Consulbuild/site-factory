import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { ENV_FILE } from "./paths.ts"; // .ts: importabile anche standalone (script strip-types)

// Store delle API key della pipeline: macOS Keychain (cifrato a riposo dall'OS),
// servizio "site-factory", account = nome della key. Il valore NON tocca mai
// argv (visibile in `ps`): scrittura via stdin (`security -i`), lettura da stdout.
// Migrazione lazy: una key trovata in site-renderer/.env viene importata nel
// Keychain e la riga RIMOSSA dal file (scrub) — self-healing anche per key
// aggiunte a mano in futuro. Mai loggare o ritornare il valore alle route UI.
const SECURITY = "/usr/bin/security";
const SERVICE = "site-factory";

export const KNOWN_KEYS = [
  "TALLY_API_KEY",
  "BFL_API_KEY",
  "RECRAFT_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  // VPS sf-prod-01 (docs/vps-integrazioni-setup.md)
  "UMAMI_PASSWORD",
  "N8N_REGISTRA_KEY",
  "N8N_API_KEY",
] as const;
export type KeyName = (typeof KNOWN_KEYS)[number];

export const KEY_LABELS: Record<KeyName, string> = {
  TALLY_API_KEY: "Tally (import form)",
  BFL_API_KEY: "Black Forest Labs (immagini FLUX.2)",
  RECRAFT_API_KEY: "Recraft (logo vettoriale)",
  CLOUDFLARE_API_TOKEN: "Cloudflare (token deploy Workers)",
  CLOUDFLARE_ACCOUNT_ID: "Cloudflare (account ID)",
  UMAMI_PASSWORD: "Umami (password utente site-factory)",
  N8N_REGISTRA_KEY: "n8n (segreto webhook registra-cliente)",
  N8N_API_KEY: "n8n (API key, solo import workflow)",
};

function keychainRead(name: KeyName): string | null {
  const r = spawnSync(SECURITY, ["find-generic-password", "-s", SERVICE, "-a", name, "-w"], {
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  const v = r.stdout.trim();
  return v.length ? v : null;
}

/** Salva/aggiorna la key nel Keychain. Il valore passa SOLO su stdin. */
export function setSecret(name: KeyName, value: string): void {
  if (!/^[\x21-\x7E]{8,}$/.test(value)) throw new Error("key non valida: attesi ≥8 caratteri stampabili senza spazi");
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const r = spawnSync(SECURITY, ["-i"], {
    input: `add-generic-password -U -s ${SERVICE} -a ${name} -w "${escaped}"\n`,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`scrittura Keychain fallita: ${r.stderr || r.error?.message || `exit ${r.status}`}`);
}

/** Rimuove la riga NAME=… da .env (scrub post-migrazione), preservando il resto. */
function scrubEnvLine(name: KeyName): void {
  try {
    const src = fs.readFileSync(ENV_FILE, "utf8");
    const out = src
      .split("\n")
      .filter((l) => !l.startsWith(`${name}=`))
      .join("\n");
    if (out !== src) fs.writeFileSync(ENV_FILE, out, { mode: 0o600 });
  } catch {
    /* .env assente: niente da scrubbare */
  }
}

/** Keychain → (migrazione da .env + scrub) → null. MAI logga il valore. */
export function getSecret(name: KeyName): string | null {
  const fromKeychain = keychainRead(name);
  if (fromKeychain) return fromKeychain;
  try {
    const m = fs.readFileSync(ENV_FILE, "utf8").match(new RegExp(`^${name}=(.+)$`, "m"));
    const legacy = m?.[1]?.trim();
    if (legacy) {
      setSecret(name, legacy);
      scrubEnvLine(name);
      return legacy;
    }
  } catch {
    /* .env assente */
  }
  return null;
}

export function hasSecret(name: KeyName): boolean {
  return getSecret(name) !== null;
}

/** Solo per la UI: "…" + ultimi 4 caratteri, mai il valore intero. */
export function secretHint(name: KeyName): string | null {
  const v = getSecret(name);
  return v ? `…${v.slice(-4)}` : null;
}
