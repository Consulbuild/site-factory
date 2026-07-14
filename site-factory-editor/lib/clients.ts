import fs from "node:fs";
import path from "node:path";
import { OUT_DIR, clientDir } from "./paths";
import {
  ClientStateSchema,
  ContestoSchema,
  PaletteArtifactSchema,
  CopyReviewSchema,
  CopyCoverageSchema,
  ImagesTraceSchema,
  ImageReviewSchema,
  LavoriSchema,
  type ClientState,
  type Contesto,
  type PaletteArtifact,
  type CopyReview,
  type CopyCoverage,
  type ImagesTrace,
  type ImageReview,
  type Lavori,
} from "./schemas";
import { validateCopyArtifact, type CopyArtifact } from "./slots";

export type Brief = Record<string, unknown> & { _da_verificare?: string[] };
export type Intake = Record<string, unknown>;

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function writeJson(file: string, data: unknown): void {
  // Scrittura atomica (tmp + rename): un crash a metà non lascia mai un JSON
  // troncato — per client.json significherebbe perdere stati «verificato».
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

/**
 * client.json con sintesi lazy: i clienti importati prima della GUI
 * (es. cavaliere-build-srls) non ce l'hanno — si sintetizzano i default
 * in lettura e si scrive il file solo alla prima azione di scrittura.
 */
export function readClientState(slug: string): ClientState {
  const dir = clientDir(slug);
  const clientJson = path.join(dir, "client.json");
  const onDisk = readJson<unknown>(clientJson);
  if (onDisk) {
    const parsed = ClientStateSchema.safeParse(onDisk);
    if (parsed.success) return fillLazySteps(slug, parsed.data);
  }
  // File presente ma illeggibile/invalido: mai sovrascriverlo in silenzio coi
  // default (perderebbe i «verificato» per sempre) — copia in .bak e log.
  if (fs.existsSync(clientJson)) {
    fs.renameSync(clientJson, clientJson + ".bak");
    console.error(`[clients] client.json corrotto o fuori schema per "${slug}" — salvato in client.json.bak, stato risintetizzato`);
  }
  const brief = readJson<Brief>(path.join(dir, "brief.json"));
  const contesto = readJson<unknown>(path.join(dir, "contesto.json"));
  const contestoOk = contesto ? ContestoSchema.safeParse(contesto) : null;
  const st = fs.statSync(dir);
  return fillLazySteps(slug, {
    version: 1,
    submissionId: String(brief?.submissionId ?? ""),
    importedAt: st.birthtime.toISOString(),
    updatedAt: st.mtime.toISOString(),
    steps: {
      intake: { stato: "da_verificare" },
      contesto: {
        stato: contestoOk?.success ? (contestoOk.data.verificato ? "verificato" : "da_verificare") : "assente",
      },
      palette: { stato: "assente" },
      copy: { stato: "assente" },
      images: { stato: "assente" },
      build: { stato: "assente" },
    },
  });
}

/**
 * Artifact generati fuori dalla GUI (Fase B in chat): se lo stato dice
 * "assente" ma l'artifact valido esiste su disco → "da_verificare"
 * (il flat artifact non porta meta: la conferma umana avviene una volta in GUI).
 */
function fillLazySteps(slug: string, state: ClientState): ClientState {
  if (state.steps.palette.stato === "assente" && readPalette(slug)) {
    state.steps.palette.stato = "da_verificare";
  }
  if (state.steps.copy.stato === "assente") {
    const copy = readCopy(slug);
    if (copy && validateCopyArtifact(copy).length === 0) state.steps.copy.stato = "da_verificare";
  }
  if (state.steps.images.stato === "assente" && readImagesTrace(slug)) {
    state.steps.images.stato = "da_verificare";
  }
  return state;
}

export function writeClientState(slug: string, state: ClientState): void {
  writeJson(path.join(clientDir(slug), "client.json"), { ...state, updatedAt: new Date().toISOString() });
}

/** Patch parziale dello stato (legge, applica, riscrive). */
export function patchClientState(slug: string, patch: (s: ClientState) => void): ClientState {
  const state = readClientState(slug);
  patch(state);
  writeClientState(slug, state);
  return state;
}

export interface ClientSummary {
  slug: string;
  businessName: string;
  citta: string;
  referente: string;
  phone: string;
  submissionId: string;
  importedAt: string;
  updatedAt: string;
  steps: ClientState["steps"];
  flagsCount: number;
}

/** Scan delle directory in out/: un cliente = una dir con intake.json. */
export function listClients(): ClientSummary[] {
  if (!fs.existsSync(OUT_DIR)) return [];
  const clients: ClientSummary[] = [];
  for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const dir = path.join(OUT_DIR, entry.name);
    const intake = readJson<Record<string, unknown>>(path.join(dir, "intake.json"));
    if (!intake) continue;
    const brief = readJson<Brief>(path.join(dir, "brief.json"));
    const state = readClientState(entry.name);
    clients.push({
      slug: entry.name,
      businessName: String(intake["meta.businessName"] ?? entry.name),
      citta: String(intake["meta.city"] ?? ""),
      referente: String(brief?.referente ?? ""),
      phone: String(intake["contact.phone"] ?? brief?.telefono ?? ""),
      submissionId: state.submissionId,
      importedAt: state.importedAt,
      updatedAt: state.updatedAt,
      steps: state.steps,
      flagsCount: brief?._da_verificare?.length ?? 0,
    });
  }
  return clients.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Bundle completo per la pagina cliente. */
export function readClientBundle(slug: string) {
  const dir = clientDir(slug);
  if (!fs.existsSync(path.join(dir, "intake.json"))) return null;
  const logo = fs.readdirSync(dir).find((f) => /^logo\.(png|jpe?g|svg|webp)$/i.test(f)) ?? null;
  const contestoRaw = readJson<unknown>(path.join(dir, "contesto.json"));
  const contestoParsed = contestoRaw ? ContestoSchema.safeParse(contestoRaw) : null;
  return {
    slug,
    intake: readJson<Intake>(path.join(dir, "intake.json"))!,
    brief: readJson<Brief>(path.join(dir, "brief.json")) ?? {},
    client: readClientState(slug),
    contesto: contestoParsed?.success ? contestoParsed.data : null,
    palette: readPalette(slug),
    copy: readCopy(slug),
    copyReview: readCopyReview(slug),
    copyCoverage: readCopyCoverage(slug),
    imagesTrace: readImagesTrace(slug),
    imageReview: readImageReview(slug),
    lavori: readLavori(slug),
    logoFile: logo,
  };
}

/**
 * Lettura BLANDA del copy artifact (oggetto piatto di stringhe/array): un
 * copy con un budget sforato deve comunque aprire l'editor per correggerlo
 * a mano — la severità sta in validateCopyArtifact (PUT/POST/validate).
 */
export function readCopy(slug: string): CopyArtifact | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "copy.json"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const okValue = (v: unknown): boolean =>
    typeof v === "string" || (Array.isArray(v) && v.every((x) => typeof x === "string" || okValue(x)));
  for (const v of Object.values(raw)) if (!okValue(v)) return null;
  return raw as CopyArtifact;
}

export function writeCopy(slug: string, copy: CopyArtifact): void {
  writeJson(path.join(clientDir(slug), "copy.json"), copy);
}

export function readCopyReview(slug: string): CopyReview | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "copy-review.json"));
  if (!raw) return null;
  const parsed = CopyReviewSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function readCopyCoverage(slug: string): CopyCoverage | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "copy-coverage.json"));
  if (!raw) return null;
  const parsed = CopyCoverageSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function readImagesTrace(slug: string): ImagesTrace | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "images-trace.json"));
  if (!raw) return null;
  const parsed = ImagesTraceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function readImageReview(slug: string): ImageReview | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "image-review.json"));
  if (!raw) return null;
  const parsed = ImageReviewSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Foto lavori reali del cliente (vuoto = nessuna → sezione Gallery assente). */
export function readLavori(slug: string): Lavori {
  const raw = readJson<unknown>(path.join(clientDir(slug), "lavori.json"));
  if (!raw) return [];
  const parsed = LavoriSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function writeLavori(slug: string, lavori: Lavori): void {
  writeJson(path.join(clientDir(slug), "lavori.json"), lavori);
}

export function readPalette(slug: string): PaletteArtifact | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "palette.json"));
  if (!raw) return null;
  const parsed = PaletteArtifactSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function writePalette(slug: string, palette: PaletteArtifact): void {
  writeJson(path.join(clientDir(slug), "palette.json"), palette);
}

export function readContesto(slug: string): Contesto | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "contesto.json"));
  if (!raw) return null;
  const parsed = ContestoSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function writeContesto(slug: string, contesto: Contesto): void {
  writeJson(path.join(clientDir(slug), "contesto.json"), contesto);
}
