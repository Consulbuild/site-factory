// Gatus (monitor) per la dashboard: stato su/giù di ogni sito e uptime. API con
// basic auth (utente `consulbuild`, password nel Keychain come GATUS_PASSWORD).
// L'endpoint di un cliente è quello generato al deploy (integrazioni.ts):
// gruppo `clienti`, nome = dominio. La chiave si legge dalla risposta, non si
// ricostruisce. `statoSito` è pura (scripts/test-portafoglio.ts).
import { getSecret } from "./secrets.ts";
import { http, DASHBOARD_TIMEOUT_MS } from "./integrazioni.ts";
import type { StatoSito } from "./portafoglio-shared.ts";

export const GATUS_HOST = "https://monitor.consulbuild.com";
const GATUS_USER = "consulbuild";

export type GatusRisultato = {
  status: number;
  duration: number; // nanosecondi
  success: boolean;
  timestamp: string;
  conditionResults?: Array<{ condition: string; success: boolean }>;
};

export type GatusEndpoint = { name: string; group?: string; key: string; results: GatusRisultato[] };

function auth(password: string | null): HeadersInit {
  if (!password) throw new Error("chiave GATUS_PASSWORD mancante: configurala dal pannello «Chiavi API»");
  return { Authorization: `Basic ${Buffer.from(`${GATUS_USER}:${password}`).toString("base64")}` };
}

/** Stati di tutti gli endpoint (ultimi controlli inclusi). ponytail: pageSize 100,
 *  si pagina quando i siti saranno più di 100. */
export async function leggiStatiSiti(password = getSecret("GATUS_PASSWORD")): Promise<GatusEndpoint[]> {
  const r = await http(`${GATUS_HOST}/api/v1/endpoints/statuses?page=1&pageSize=100`, { headers: auth(password) }, DASHBOARD_TIMEOUT_MS);
  if (!r.ok) throw new Error(`Gatus ha risposto ${r.status}`);
  return (await r.json()) as GatusEndpoint[];
}

/** Uptime a 30 giorni di un endpoint (0..1). Risposta text/plain. */
export async function uptime30(key: string, password = getSecret("GATUS_PASSWORD")): Promise<number | null> {
  const r = await http(`${GATUS_HOST}/api/v1/endpoints/${encodeURIComponent(key)}/uptimes/30d`, { headers: auth(password) }, DASHBOARD_TIMEOUT_MS);
  if (!r.ok) return null;
  const n = parseFloat((await r.text()).trim());
  return Number.isFinite(n) ? n : null;
}

/** Prova della password (pannello Chiavi API). */
export async function gatusPing(password: string): Promise<string | null> {
  return leggiStatiSiti(password).then(
    () => null,
    (e: unknown) => (e instanceof Error ? e.message : String(e)),
  );
}

/** Link alla pagina dell'endpoint nel monitor. */
export const gatusUrl = (key: string) => `${GATUS_HOST}/endpoints/${encodeURIComponent(key)}`;

/** Endpoint del sito di un cliente: gruppo `clienti`, nome = dominio. */
export const endpointDelSito = (endpoints: GatusEndpoint[], dominio: string): GatusEndpoint | undefined =>
  endpoints.find((e) => e.group === "clienti" && e.name === dominio);

/** Stato di un sito dall'ultimo controllo; se giù, da quando e perché. I `results`
 *  vengono ordinati per timestamp (l'ordine dell'API non è un contratto). */
export function statoSito(ep: GatusEndpoint | undefined): StatoSito | null {
  if (!ep || !ep.results?.length) return null;
  const risultati = [...ep.results].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const ultimo = risultati[risultati.length - 1];
  const base: StatoSito = {
    su: ultimo.success,
    ms: Math.round(ultimo.duration / 1e6),
    ultimoControllo: ultimo.timestamp,
    key: ep.key,
  };
  if (ultimo.success) return base;
  let i = risultati.length - 1;
  while (i > 0 && !risultati[i - 1].success) i -= 1; // i = primo fallimento della coda
  const ultimoSu = i > 0 ? risultati[i - 1].timestamp : undefined;
  const causa = (ultimo.conditionResults ?? [])
    .filter((c) => !c.success)
    .map((c) => c.condition)
    .join(", ");
  return {
    ...base,
    da: risultati[i].timestamp,
    falliti: risultati.length - i,
    ...(causa ? { causa } : {}),
    ...(ultimoSu ? { ultimoSu } : {}),
  };
}
