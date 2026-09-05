// Sincronizza i workflow n8n versionati in infra/n8n/ con l'istanza del VPS
// (API pubblica, header X-N8N-API-KEY, chiave nel Keychain come N8N_API_KEY).
//
//   cd site-factory-editor
//   node --experimental-strip-types scripts/n8n-import.ts export   # n8n → repo (dopo averli costruiti/modificati in UI)
//   node --experimental-strip-types scripts/n8n-import.ts import   # repo → n8n (ripristino, nuova istanza)
//
// Nome file = nome del workflow in n8n senza il prefisso «sf-»: infra/n8n/form-lead.json
// ↔ workflow «sf-form-lead». Si versionano SOLO name/nodes/connections/settings
// (l'API rifiuta i campi readOnly). Le credenziali restano nell'istanza: dopo un
// import su un'istanza nuova vanno riselezionate nei nodi (stesso nome).
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { getSecret } from "../lib/secrets.ts";
import { N8N_HOST } from "../lib/integrazioni.ts";

const DIR = path.join(REPO_ROOT, "infra", "n8n");
const WORKFLOWS = ["registra-cliente", "form-lead", "errori"];
const nomeN8n = (file: string) => `sf-${file}`;

type Workflow = { id?: string; name: string; nodes: unknown[]; connections: unknown; settings?: unknown };

const key = getSecret("N8N_API_KEY");
if (!key) {
  console.error("N8N_API_KEY assente: salvala da Impostazioni → Chiavi API.");
  process.exit(2);
}

async function api(pathname: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${N8N_HOST}/api/v1${pathname}`, {
    ...init,
    headers: { "X-N8N-API-KEY": key!, "Content-Type": "application/json" },
  });
}

async function trovaId(nome: string): Promise<string | null> {
  const r = await api(`/workflows?name=${encodeURIComponent(nome)}`);
  if (!r.ok) throw new Error(`lista workflow: ${r.status}`);
  const j = (await r.json()) as { data: Workflow[] };
  return j.data.find((w) => w.name === nome)?.id ?? null;
}

// L'API accetta in `settings` solo un sottoinsieme di chiavi (400 «must NOT have
// additional properties» su binaryMode/availableInMCP/timeSavedMode, visto 2026-09-05).
const SETTINGS_OK = new Set([
  "executionOrder", "timezone", "errorWorkflow", "saveDataErrorExecution", "saveDataSuccessExecution",
  "saveManualExecutions", "saveExecutionProgress", "executionTimeout", "callerPolicy",
]);
const pulisci = (w: Workflow) => ({
  name: w.name,
  nodes: w.nodes,
  connections: w.connections,
  settings: Object.fromEntries(Object.entries((w.settings ?? {}) as Record<string, unknown>).filter(([k]) => SETTINGS_OK.has(k))),
});

async function esporta(): Promise<void> {
  fs.mkdirSync(DIR, { recursive: true });
  for (const file of WORKFLOWS) {
    const id = await trovaId(nomeN8n(file));
    if (!id) {
      console.error(`✗ ${nomeN8n(file)}: non esiste in n8n (costruiscilo in UI, vedi docs/vps-integrazioni-setup.md)`);
      process.exitCode = 1;
      continue;
    }
    const r = await api(`/workflows/${id}`);
    if (!r.ok) throw new Error(`lettura ${id}: ${r.status}`);
    const w = pulisci((await r.json()) as Workflow);
    fs.writeFileSync(path.join(DIR, `${file}.json`), JSON.stringify(w, null, 2) + "\n");
    console.log(`✓ ${file}.json ← ${w.name} (${w.nodes.length} nodi)`);
  }
}

async function importa(): Promise<void> {
  for (const file of WORKFLOWS) {
    const src = path.join(DIR, `${file}.json`);
    if (!fs.existsSync(src)) {
      console.error(`✗ ${src} assente`);
      process.exitCode = 1;
      continue;
    }
    const w = pulisci(JSON.parse(fs.readFileSync(src, "utf8")) as Workflow);
    const id = await trovaId(w.name);
    const r = id
      ? await api(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(w) })
      : await api("/workflows", { method: "POST", body: JSON.stringify(w) });
    if (!r.ok) throw new Error(`${id ? "aggiornamento" : "creazione"} ${w.name}: ${r.status} ${await r.text()}`);
    const saved = (await r.json()) as Workflow;
    // Pubblicazione: /activate (deprecato ma presente) con fallback /publish.
    const act = await api(`/workflows/${saved.id}/activate`, { method: "POST" });
    const ok = act.ok || (await api(`/workflows/${saved.id}/publish`, { method: "POST" })).ok;
    console.log(`${ok ? "✓" : "⚠"} ${w.name} ${id ? "aggiornato" : "creato"} (${saved.id})${ok ? ", attivo" : ", NON attivato: attivalo in UI"}`);
  }
}

const modo = process.argv[2];
(modo === "export" ? esporta() : modo === "import" ? importa() : Promise.reject(new Error("uso: n8n-import.ts export|import"))).catch(
  (e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  },
);
