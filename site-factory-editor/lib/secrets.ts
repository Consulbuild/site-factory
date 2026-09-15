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

/** Chiavi dei servizi Traffico (docs/traffico/piano-K1.md): prove gratuite in lib/chiavi-traffico.ts. */
export const CHIAVI_TRAFFICO = [
  "GOOGLE_SERVICE_ACCOUNT",
  "GOOGLE_API_KEY",
  "BING_WEBMASTER_API_KEY",
  "DATAFORSEO_LOGIN",
  "DATAFORSEO_PASSWORD",
  "CLOUDFLARE_DNS_API_TOKEN",
] as const;
export type ChiaveTraffico = (typeof CHIAVI_TRAFFICO)[number];

export const KNOWN_KEYS = [
  "BFL_API_KEY",
  "OPENAI_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  // VPS sf-prod-01 (docs/vps-integrazioni-setup.md)
  "UMAMI_PASSWORD",
  "N8N_REGISTRA_KEY",
  "N8N_API_KEY",
  // Dashboard clienti (docs/piano-dashboard-clienti.md)
  "STRIPE_API_KEY",
  "GATUS_PASSWORD",
  ...CHIAVI_TRAFFICO,
] as const;
export type KeyName = (typeof KNOWN_KEYS)[number];

export const KEY_LABELS: Record<KeyName, string> = {
  BFL_API_KEY: "Black Forest Labs (immagini FLUX.2)",
  OPENAI_API_KEY: "OpenAI (logo con GPT Image)",
  CLOUDFLARE_API_TOKEN: "Cloudflare (token deploy Workers)",
  CLOUDFLARE_ACCOUNT_ID: "Cloudflare (account ID)",
  UMAMI_PASSWORD: "Umami (password utente site-factory)",
  N8N_REGISTRA_KEY: "n8n (segreto webhook registra-cliente)",
  N8N_API_KEY: "n8n (API key: import workflow e lettura lead)",
  STRIPE_API_KEY: "Stripe (chiave ristretta: abbonamenti ed entrate)",
  GATUS_PASSWORD: "Gatus (password del monitor, per «Siti down»)",
  GOOGLE_SERVICE_ACCOUNT: "Google Cloud (service account di scrittura: verifica siti e Search Console)",
  GOOGLE_API_KEY: "Google Cloud (API key: PageSpeed Insights e CrUX)",
  BING_WEBMASTER_API_KEY: "Bing Webmaster Tools (API key)",
  DATAFORSEO_LOGIN: "DataForSEO (login API)",
  DATAFORSEO_PASSWORD: "DataForSEO (password API)",
  CLOUDFLARE_DNS_API_TOKEN: "Cloudflare (token solo DNS: verifica Google e Bing)",
};

/** Gruppi del pannello «Chiavi API»: ogni chiave di KNOWN_KEYS in uno solo (banco test-chiavi.ts). */
export const KEY_GROUPS: ReadonlyArray<{ id: string; titolo: string; frase: string; chiavi: readonly KeyName[] }> = [
  {
    id: "siti",
    titolo: "Produzione e sviluppo siti",
    frase: "Servono alla catena che crea i siti: immagini, logo e pubblicazione su Cloudflare.",
    chiavi: ["BFL_API_KEY", "OPENAI_API_KEY", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
  },
  {
    id: "vps",
    titolo: "VPS e dashboard clienti",
    frase: "Collegano l'editor ai servizi sul VPS e a Stripe: form, statistiche, monitor e abbonamenti.",
    chiavi: ["UMAMI_PASSWORD", "N8N_REGISTRA_KEY", "N8N_API_KEY", "STRIPE_API_KEY", "GATUS_PASSWORD"],
  },
  {
    id: "traffico",
    titolo: "Ottimizzazione del traffico",
    frase:
      "Servono ai servizi Traffico: avvisare Google e Bing, misurare la velocità, leggere ricerche e schede della zona. Le prove usano solo chiamate gratuite.",
    chiavi: CHIAVI_TRAFFICO,
  },
];

/**
 * Dove si prende (URL), segnaposto e aiuto: solo per le chiavi del Traffico (le altre restano com'erano).
 * `coppia`: l'altra metà di una credenziale a due pezzi, inseribile nello stesso form (cambio account).
 */
export const KEY_INFO: Record<ChiaveTraffico, { dove: string; segnaposto: string; aiuto?: string; coppia?: ChiaveTraffico }> = {
  GOOGLE_SERVICE_ACCOUNT: {
    dove: "https://console.cloud.google.com/iam-admin/serviceaccounts",
    segnaposto: '{ "type": "service_account", … }',
    aiuto: "Incolla tutto il file JSON scaricato da Google Cloud.",
  },
  GOOGLE_API_KEY: {
    dove: "https://console.cloud.google.com/apis/credentials",
    segnaposto: "AIza…",
    aiuto: "La prova misura google.com: può servire fino a un minuto.",
  },
  BING_WEBMASTER_API_KEY: { dove: "https://www.bing.com/webmasters/settings/api", segnaposto: "API key…" },
  DATAFORSEO_LOGIN: {
    dove: "https://app.dataforseo.com/api-access",
    segnaposto: "login API…",
    aiuto: "La prova parte quando ci sono login e password; se lasci vuota la password usa quella già salvata. Per cambiare account compila i due campi.",
    coppia: "DATAFORSEO_PASSWORD",
  },
  DATAFORSEO_PASSWORD: {
    dove: "https://app.dataforseo.com/api-access",
    segnaposto: "password API…",
    aiuto: "La prova parte quando ci sono login e password; se lasci vuoto il login usa quello già salvato. Per cambiare account compila i due campi.",
    coppia: "DATAFORSEO_LOGIN",
  },
  CLOUDFLARE_DNS_API_TOKEN: { dove: "https://dash.cloudflare.com/profile/api-tokens", segnaposto: "token…" },
};

/**
 * La route delle chiavi risponde solo all'editor aperto su questo Mac: Host locale (niente browser
 * dalla LAN, niente DNS rebinding) e Origin, se presente, con lo stesso host (niente fetch da altri
 * siti). Chi forgia l'header Host da un altro host (curl) passa: lo ferma solo il dev server legato
 * a 127.0.0.1. Funzione pura, esportata per il banco.
 */
export function richiestaDaQuestoMac(host: string | null, origin: string | null): boolean {
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i.test(host)) return false;
  if (origin === null) return true;
  try {
    return new URL(origin).host === host.toLowerCase();
  } catch {
    return false; // «null» (origine opaca) o valore malformato
  }
}

/** Buffer di `security -i` (4096 byte per comando) meno il comando attorno al valore. */
export const MAX_VALORE_SEGRETO = 4000;

/** Controllo puro del valore prima di `security` (esportato per il banco): null se salvabile, altrimenti il motivo. */
export function motivoValoreNonSalvabile(value: string): string | null {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  if (escaped.length > MAX_VALORE_SEGRETO) {
    return `valore troppo lungo per il portachiavi (${escaped.length} caratteri, massimo ${MAX_VALORE_SEGRETO})`;
  }
  if (!/^[\x21-\x7E]{8,}$/.test(value)) return "key non valida: attesi ≥8 caratteri stampabili senza spazi";
  return null;
}

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
  const motivo = motivoValoreNonSalvabile(value);
  if (motivo) throw new Error(motivo);
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const r = spawnSync(SECURITY, ["-i"], {
    input: `add-generic-password -U -s ${SERVICE} -a ${name} -w "${escaped}"\n`,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`scrittura Keychain fallita: ${r.stderr || r.error?.message || `exit ${r.status}`}`);
}

/** Toglie la voce dal Keychain (solo per il ripristino di salvaSegreti: la voce prima non c'era). */
export function deleteSecret(name: KeyName): void {
  const r = spawnSync(SECURITY, ["delete-generic-password", "-s", SERVICE, "-a", name], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`rimozione dal Keychain fallita: exit ${r.status}`);
}

export interface Portachiavi {
  getSecret: (name: KeyName) => string | null;
  setSecret: (name: KeyName, value: string) => void;
  deleteSecret: (name: KeyName) => void;
}

/**
 * Salva una o più chiavi come un'operazione sola (coppia DataForSEO): legge i valori di prima, scrive e rilegge;
 * se una scrittura o la rilettura fallisce rimette i valori di prima (o toglie la voce che non c'era), così una
 * coppia mai provata non resta nel portachiavi. null se salvato, altrimenti il messaggio (mai i valori).
 * Portachiavi iniettabile per il banco.
 */
export function salvaSegreti(
  scritture: ReadonlyArray<readonly [KeyName, string]>,
  pc: Portachiavi = { getSecret, setSecret, deleteSecret },
): string | null {
  const prima = scritture.map(([n]) => [n, pc.getSecret(n)] as const);
  let errore: string | null = null;
  try {
    for (const [n, v] of scritture) pc.setSecret(n, v);
    // Rilettura: un valore troncato dal Keychain non deve sembrare salvato.
    if (scritture.some(([n, v]) => pc.getSecret(n) !== v)) errore = "salvataggio nel portachiavi incompleto";
  } catch (e) {
    errore = (e instanceof Error ? e.message : String(e)).trim();
  }
  if (!errore) return null;
  const nonRipristinate = prima
    .filter(([n, v]) => {
      try {
        if (pc.getSecret(n) === v) return false;
        if (v === null) pc.deleteSecret(n);
        else pc.setSecret(n, v);
        return pc.getSecret(n) !== v;
      } catch {
        return true;
      }
    })
    .map(([n]) => `«${KEY_LABELS[n]}»`);
  return nonRipristinate.length
    ? `${errore}; ripristino non riuscito per ${nonRipristinate.join(" e ")}: ricarica la pagina e ${nonRipristinate.length > 1 ? "inseriscile" : "inseriscila"} di nuovo`
    : `${errore}: il portachiavi è tornato com'era, riprova`;
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
