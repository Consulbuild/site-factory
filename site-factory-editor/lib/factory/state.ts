import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { REFERENCES_DIR, RUNS_DIR, PRESETS_MANIFEST, referenceDir, runDir } from "./paths.ts";
import {
  ReferenceMetaSchema,
  OptoutSchema,
  RunSchema,
  FASI_RUN,
  type ReferenceMeta,
  type ReferenceSummary,
  type FactoryRun,
} from "./schemas.ts";

// Stato della fabbrica su disco (D6): la presenza dei file È lo stato —
// meta.json (scelta umana), optout.json (gate), extraction.tokens.json.
// Stesso pattern CRUD JSON di lib/clients.ts.

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}
const writeJson = (file: string, data: unknown) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");

// ---------- libreria preset (manifest + meta, per la pagina /fabbrica) ----------

export interface PresetCard {
  id: string;
  version: string;
  stato: string;
  nome: string;
  estetica: string;
  per: string;
  fontLabel: string;
  aakerPrimaria: string;
  settoriConsigliati: string[];
  neutri: { bg: string; ink: string; surface: string };
  scuro: boolean;
}

export function listPresets(): PresetCard[] {
  const manifest = readJson<{
    presets: Array<{
      id: string;
      version: string;
      stato: string;
      aaker: { primaria: string };
      settoriConsigliati: string[];
      neutri: { bg: string; ink: string; surface: string };
      scuro: boolean;
      editor: { nome: string; estetica: string; per: string; fontLabel: string };
    }>;
  }>(PRESETS_MANIFEST);
  return (manifest?.presets ?? []).map((p) => ({
    id: p.id,
    version: p.version,
    stato: p.stato,
    nome: p.editor.nome,
    estetica: p.editor.estetica,
    per: p.editor.per,
    fontLabel: p.editor.fontLabel,
    aakerPrimaria: p.aaker.primaria,
    settoriConsigliati: p.settoriConsigliati,
    neutri: p.neutri,
    scuro: p.scuro,
  }));
}

// ---------- riferimenti ----------

/** id deterministico e leggibile: host senza tld strani + hash corto dell'url. */
export function referenceIdFor(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "").replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase();
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 6);
  return `${host}-${hash}`.replace(/^-+/, "");
}

export function createReference(url: string, meta: Omit<ReferenceMeta, "url" | "aggiuntoIl">): string {
  const id = referenceIdFor(url);
  const dir = referenceDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const record: ReferenceMeta = { url, aggiuntoIl: new Date().toISOString(), ...meta };
  writeJson(path.join(dir, "meta.json"), ReferenceMetaSchema.parse(record));
  return id;
}

export function readReference(id: string): ReferenceSummary | null {
  const dir = referenceDir(id);
  const meta = readJson<unknown>(path.join(dir, "meta.json"));
  const parsed = ReferenceMetaSchema.safeParse(meta);
  if (!parsed.success) return null;
  const optout = OptoutSchema.safeParse(readJson(path.join(dir, "optout.json")));
  return {
    id,
    meta: parsed.data,
    optout: optout.success ? optout.data : null,
    estratto: fs.existsSync(path.join(dir, "extraction.tokens.json")),
    screenshots: fs.existsSync(path.join(dir, "screenshot-1280.png")),
  };
}

export function listReferences(): ReferenceSummary[] {
  if (!fs.existsSync(REFERENCES_DIR)) return [];
  return fs
    .readdirSync(REFERENCES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readReference(d.name))
    .filter((r): r is ReferenceSummary => r !== null)
    .sort((a, b) => b.meta.aggiuntoIl.localeCompare(a.meta.aggiuntoIl));
}

/** Un riferimento è usabile in una run solo se: attestato, opt-out consentito, estratto. */
export const referenceUsabile = (r: ReferenceSummary) =>
  r.meta.attestazioneNonConcorrente === true && r.optout?.esito === "consentito" && r.estratto;

// ---------- run di fabbrica ----------

export function createRun(references: string[]): { runId: string } {
  // gate deterministici di creazione (accettazione M5): mai una run con
  // riferimenti insufficienti, bloccati o non estratti.
  if (references.length < 3)
    throw new Error(`servono ALMENO 3 riferimenti eterogenei (ne hai scelti ${references.length})`);
  const doppioni = references.filter((x, i) => references.indexOf(x) !== i);
  if (doppioni.length) throw new Error(`riferimenti duplicati: ${doppioni.join(", ")}`);
  for (const id of references) {
    const r = readReference(id);
    if (!r) throw new Error(`riferimento inesistente: ${id}`);
    if (r.optout?.esito !== "consentito")
      throw new Error(`riferimento "${id}" non consentito dal gate opt-out (${r.optout?.esito ?? "non verificato"}: ${r.optout?.motivo ?? "verifica mancante"})`);
    if (!r.meta.attestazioneNonConcorrente) throw new Error(`riferimento "${id}" senza attestazione non-concorrente`);
    if (!r.estratto) throw new Error(`riferimento "${id}" senza estrazione token`);
  }
  const runId = `run-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString("hex")}`;
  const dir = runDir(runId);
  fs.mkdirSync(path.join(dir, "gates"), { recursive: true });
  const run: FactoryRun = {
    runId,
    creatoIl: new Date().toISOString(),
    references,
    stato: "creata",
    fasi: FASI_RUN.map((nome) => ({ nome, esito: "in_attesa" })),
  };
  writeJson(path.join(dir, "run.json"), RunSchema.parse(run));
  return { runId };
}

export function readRun(runId: string): FactoryRun | null {
  const parsed = RunSchema.safeParse(readJson(path.join(runDir(runId), "run.json")));
  return parsed.success ? parsed.data : null;
}

export function listRuns(): FactoryRun[] {
  if (!fs.existsSync(RUNS_DIR)) return [];
  return fs
    .readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readRun(d.name))
    .filter((r): r is FactoryRun => r !== null)
    .sort((a, b) => b.creatoIl.localeCompare(a.creatoIl));
}
