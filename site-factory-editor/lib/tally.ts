import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { SITE_RENDERER, OUT_DIR, NODE_BIN, INTAKE_SCRIPT, childEnv, clientDir } from "./paths";
import { writeJson } from "./clients";
import { getSecret } from "./secrets";

// Wrapper attorno a scripts/intake-tally.ts: UNA sola fonte per API key,
// form ID e mapping domande. Exit codes del contratto CLI: 0 ok · 1 dati/API · 2 uso (key mancante).

interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runIntakeScript(args: string[], extraEnv: Record<string, string> = {}): Promise<SpawnResult> {
  // La key vive nel Keychain (lib/secrets): iniettata come env al child, così lo
  // script non deve mai cercarla su disco. extraEnv (key in prova) vince.
  const stored = getSecret("TALLY_API_KEY");
  return new Promise((resolve, reject) => {
    const child = spawn(NODE_BIN, ["--experimental-strip-types", INTAKE_SCRIPT, ...args], {
      cwd: SITE_RENDERER, // ./logo.* del parser è relativo a site-renderer/
      env: childEnv({ ...(stored ? { TALLY_API_KEY: stored } : {}), ...extraEnv }),
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export class TallyKeyMissingError extends Error {}
export class TallyApiError extends Error {}

export interface TallySubmission {
  id: string;
  submittedAt: string;
  businessName: string;
  ownerName: string;
  phone: string;
}

/** `--list-json` → array ricco {id, submittedAt, businessName, ownerName, phone}
 *  (referente e telefono servono a cercarli anche prima dell'import). */
export async function listSubmissions(apiKey?: string): Promise<TallySubmission[]> {
  const res = await runIntakeScript(["--list-json"], apiKey ? { TALLY_API_KEY: apiKey } : {});
  if (res.code === 2) throw new TallyKeyMissingError(res.stderr.trim());
  if (res.code !== 0) throw new TallyApiError(res.stderr.trim() || `exit ${res.code}`);
  let rows: TallySubmission[];
  try {
    rows = JSON.parse(res.stdout);
  } catch {
    throw new TallyApiError("output --list-json non valido");
  }
  return rows.filter((s) => s.id && s.submittedAt);
}

export interface HomeData {
  clients: import("./clients").ClientSummary[];
  nonImportati: TallySubmission[];
  tally: "ok" | "key_mancante" | "errore";
  tallyError?: string;
}

/** Lista merged disco + Tally, usata sia dalla pagina che dalla API route. */
export async function getHomeData(): Promise<HomeData> {
  const { listClients } = await import("./clients");
  const clients = listClients();
  const importedIds = new Set(clients.map((c) => c.submissionId).filter(Boolean));
  try {
    const nonImportati = (await listSubmissions()).filter((s) => !importedIds.has(s.id));
    return { clients, nonImportati, tally: "ok" };
  } catch (e) {
    if (e instanceof TallyKeyMissingError) return { clients, nonImportati: [], tally: "key_mancante" };
    return {
      clients,
      nonImportati: [],
      tally: "errore",
      tallyError: e instanceof Error ? e.message : String(e),
    };
  }
}

export class SlugExistsError extends Error {
  constructor(public slug: string) {
    super(`slug già esistente: ${slug}`);
  }
}

/**
 * Import di una submission: il parser scrive in una dir temporanea
 * out/.import-<id>, poi si legge meta.slug da intake.json (robusto,
 * niente parsing di stdout) e si fa rename a out/<slug>.
 */
export async function importSubmission(submissionId: string, overwrite = false): Promise<string> {
  const tmpDir = path.join(OUT_DIR, `.import-${submissionId}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const res = await runIntakeScript(["--submission", submissionId, "-o", tmpDir]);
  if (res.code === 2) throw new TallyKeyMissingError(res.stderr.trim());
  if (res.code !== 0) throw new TallyApiError(res.stderr.trim() || `exit ${res.code}`);

  const intake = JSON.parse(fs.readFileSync(path.join(tmpDir, "intake.json"), "utf8"));
  const slug = String(intake["meta.slug"]);
  const dest = clientDir(slug);

  if (fs.existsSync(dest)) {
    if (!overwrite) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      throw new SlugExistsError(slug);
    }
    // Re-import: sovrascrive gli artifact intake ma PRESERVA client.json e
    // contesto.json (lavoro umano), resettando intake a da_verificare.
    for (const f of fs.readdirSync(tmpDir)) {
      fs.renameSync(path.join(tmpDir, f), path.join(dest, f));
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } else {
    fs.renameSync(tmpDir, dest);
  }

  const now = new Date().toISOString();
  const prevState = fs.existsSync(path.join(dest, "client.json"))
    ? JSON.parse(fs.readFileSync(path.join(dest, "client.json"), "utf8"))
    : null;
  writeJson(path.join(dest, "client.json"), {
    version: 1,
    submissionId,
    importedAt: prevState?.importedAt ?? now,
    updatedAt: now,
    steps: {
      intake: { stato: "da_verificare" },
      contesto: prevState?.steps?.contesto ?? { stato: "assente" },
    },
  });
  return slug;
}
