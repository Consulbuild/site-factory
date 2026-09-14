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
  LogoBriefSchema,
  LogoTraceSchema,
  LogoReviewSchema,
  LavoriSchema,
  type ClientState,
  type Contesto,
  type PaletteArtifact,
  type CopyReview,
  type CopyCoverage,
  type ImagesTrace,
  type ImageReview,
  type LogoBrief,
  type LogoTrace,
  type LogoReview,
  type Lavori,
} from "./schemas";
import { validateCopyArtifact, type CopyArtifact } from "./slots";
import { readLegale, readForo, readLegaleReview } from "./legale";

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
export const readClientState = (slug: string): ClientState => leggi(slug).state;

/**
 * Motivo per cui client.json NON è leggibile (null = ok). Un file presente ma
 * fuori schema non si tocca mai: lo stato sintetizzato serve solo a mostrare
 * l'hub col banner, e ogni scrittura (patchClientState) è rifiutata finché il
 * file non viene corretto a mano — così nessun «verificato» va perso.
 */
export const motivoCorrotto = (slug: string): string | null => leggi(slug).corrotto;

function leggi(slug: string): { state: ClientState; corrotto: string | null } {
  const dir = clientDir(slug);
  const clientJson = path.join(dir, "client.json");
  let corrotto: string | null = null;
  const onDisk = readJson<unknown>(clientJson);
  if (onDisk) {
    const parsed = ClientStateSchema.safeParse(onDisk);
    if (parsed.success) return { state: fillLazySteps(slug, parsed.data), corrotto: null };
    corrotto = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  } else if (fs.existsSync(clientJson)) {
    corrotto = "JSON non parsabile";
  }
  if (corrotto) console.error(`[clients] client.json fuori schema per "${slug}" (${corrotto}): file intatto, scritture bloccate`);
  return { state: sintetizza(slug), corrotto };
}

/** Stato di default per i clienti importati prima della GUI (nessun client.json). */
function sintetizza(slug: string): ClientState {
  const dir = clientDir(slug);
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
      logo: { stato: "assente" },
      copy: { stato: "assente" },
      images: { stato: "assente" },
      legale: { stato: "assente" },
      build: { stato: "assente" },
    },
    percorso: "completo",
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
  // Documenti legali prodotti fuori GUI (flusso manuale Cavaliere, 21/07):
  // conformi al contratto → la conferma umana avviene una volta in scheda.
  if (state.steps.legale.stato === "assente" && readLegale(slug)) {
    state.steps.legale.stato = "da_verificare";
  }
  return state;
}

export function writeClientState(slug: string, state: ClientState): void {
  writeJson(path.join(clientDir(slug), "client.json"), { ...state, updatedAt: new Date().toISOString() });
}

/** Patch parziale dello stato (legge, applica, riscrive). */
export function patchClientState(slug: string, patch: (s: ClientState) => void): ClientState {
  const { state, corrotto } = leggi(slug);
  if (corrotto) throw new Error(`client.json non leggibile (${corrotto}): correggi il file a mano prima di continuare`);
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
  email: string; // e-mail del brief: collegamento con l'abbonamento Stripe (dashboard)
  submissionId: string;
  importedAt: string;
  updatedAt: string;
  steps: ClientState["steps"];
  percorso: ClientState["percorso"];
  catena?: ClientState["catena"];
  demo?: ClientState["demo"];
  /** Servizi Traffico (portafoglio /traffico); assente = entrambi spenti. */
  traffico?: ClientState["traffico"];
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
      email: String(brief?.email ?? intake["contact.email"] ?? ""),
      submissionId: state.submissionId,
      importedAt: state.importedAt,
      updatedAt: state.updatedAt,
      steps: state.steps,
      percorso: state.percorso,
      ...(state.catena ? { catena: state.catena } : {}),
      ...(state.demo ? { demo: state.demo } : {}),
      ...(state.traffico ? { traffico: state.traffico } : {}),
      flagsCount: brief?._da_verificare?.length ?? 0,
    });
  }
  return clients.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** intake.json (slot flat del blueprint) — null se assente o illeggibile. */
export function readIntake(slug: string): Intake | null {
  return readJson<Intake>(path.join(clientDir(slug), "intake.json"));
}

export function writeIntake(slug: string, intake: Intake): void {
  writeJson(path.join(clientDir(slug), "intake.json"), intake);
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
    /** client.json presente ma fuori schema: l'hub lo dice e blocca le azioni. */
    corrotto: motivoCorrotto(slug),
    contesto: contestoParsed?.success ? contestoParsed.data : null,
    palette: readPalette(slug),
    copy: readCopy(slug),
    copyReview: readCopyReview(slug),
    copyCoverage: readCopyCoverage(slug),
    imagesTrace: readImagesTrace(slug),
    imageReview: readImageReview(slug),
    lavori: readLavori(slug),
    legale: readLegale(slug),
    foro: readForo(slug),
    legaleReview: readLegaleReview(slug),
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

export function readLogoBrief(slug: string): LogoBrief | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "logo-brief.json"));
  if (!raw) return null;
  const parsed = LogoBriefSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function readLogoTrace(slug: string): LogoTrace | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "logo-trace.json"));
  if (!raw) return null;
  const parsed = LogoTraceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function writeLogoTrace(slug: string, trace: LogoTrace): void {
  writeJson(path.join(clientDir(slug), "logo-trace.json"), trace);
}

export function readLogoReview(slug: string): LogoReview | null {
  const raw = readJson<unknown>(path.join(clientDir(slug), "logo-review.json"));
  if (!raw) return null;
  const parsed = LogoReviewSchema.safeParse(raw);
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
