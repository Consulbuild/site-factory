import fs from "node:fs";
import path from "node:path";
import { SITE_RENDERER, NODE_BIN, clientDir } from "./paths";
import { readClientState, patchClientState, readCopy, readLavori } from "./clients";
import { validateCopyArtifact } from "./slots";
import type { RunEvent, PhaseResult, StepIO } from "./run-step";
import type { RunCtx } from "./steps";

// Build deterministica del sito (mai claude): media → assemble → patch logo →
// validate → astro build → pulizia. Vive qui e non in steps.ts perché è fs +
// io.script, un dominio diverso dall'orchestrazione `claude -p` del registry.

const PUBLIC_MEDIA = path.join(SITE_RENDERER, "public", "media");
const ASTRO_BIN = path.join(SITE_RENDERER, "node_modules", ".bin", "astro");
const BLUEPRINT = "blueprints/conversione-locale-v1";

const distDirOf = (slug: string) => path.join(clientDir(slug), "dist");

/** Conta i file *.html in dist (ricorsivo) e la dimensione totale in KB. */
function distStats(dist: string): { pages: number; sizeKb: number } {
  let pages = 0;
  let bytes = 0;
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else {
        bytes += fs.statSync(p).size;
        if (e.name.endsWith(".html")) pages++;
      }
    }
  };
  walk(dist);
  return { pages, sizeKb: Math.round(bytes / 1024) };
}

// La build usa risorse condivise TRA clienti (public/media viene svuotata e
// ricopiata, astro builda nella stessa cwd): due build simultanee mescolerebbero
// i media di un cliente nel sito dell'altro. Catena di promise = mutex globale.
let buildLock: Promise<void> = Promise.resolve();

export async function* buildRun(slug: string, ctx: RunCtx, io: StepIO): AsyncGenerator<RunEvent, PhaseResult> {
  const prev = buildLock;
  let release!: () => void;
  buildLock = new Promise((r) => (release = r));
  await prev;
  try {
    return yield* buildRunSerial(slug, ctx, io);
  } finally {
    release();
  }
}

async function* buildRunSerial(slug: string, ctx: RunCtx, io: StepIO): AsyncGenerator<RunEvent, PhaseResult> {
  const partial = ctx.mode === "partial";
  const dir = clientDir(slug);
  const siteJson = path.join(dir, "site.json");
  const dist = distDirOf(slug);

  // Gate della build COMPLETA (la parziale può girare da intake verificato).
  if (!partial && readClientState(slug).steps.images.stato !== "verificato") {
    return { ok: false, error: "Prima verifica le immagini: la build completa monta gli artifact confermati (usa «Anteprima parziale» per vedere il sito a metà pipeline)." };
  }

  // Difesa in profondità: lo stato «verificato» è una promessa, il file è la
  // verità — un copy.json fuori contratto (visto in produzione: drift tra stato
  // e disco) farebbe fallire l'assembler con un muro di log. Qui l'errore è
  // puntuale e dice dove correggere.
  if (!partial) {
    const errs = validateCopyArtifact(readCopy(slug) ?? {});
    if (errs.length) {
      return { ok: false, error: `copy.json non rispetta più il contratto — riapri la scheda Copy e correggi:\n${errs.slice(0, 5).join("\n")}` };
    }
    // La Gallery compare solo con ≥4 foto reali; se ci sono, ogni foto DEVE avere
    // l'alt (accessibilità + vincolo Zod del renderer). Sotto le 4 la sezione non
    // esce, quindi gli alt mancanti non bloccano.
    const lavori = readLavori(slug);
    if (lavori.length >= 4) {
      const senzaAlt = lavori.filter((l) => !l.alt.trim()).length;
      if (senzaAlt) {
        return { ok: false, error: `${senzaAlt} foto lavori senza alt — riapri la scheda Immagini → «I nostri lavori» e completa gli alt (o usa «Genera testi con l'AI»).` };
      }
    }
  }

  // FASE media (deterministica): astro copia TUTTA public/ in dist — si pulisce
  // e si copia SOLO il cliente corrente, o i media degli altri finiscono nel sito.
  yield { type: "phase", label: "media" };
  fs.rmSync(PUBLIC_MEDIA, { recursive: true, force: true });
  const imgDir = path.join(dir, "img");
  if (fs.existsSync(imgDir)) {
    fs.cpSync(imgDir, path.join(PUBLIC_MEDIA, slug), { recursive: true });
    yield { type: "text", text: `copiati ${fs.readdirSync(imgDir).length} file in public/media/${slug}/` };
  } else {
    yield { type: "text", text: partial ? "nessuna immagine generata (build parziale)" : "img/ assente" };
  }

  // FASE assemble (script della pipeline, unica fonte del merge blueprint+artifact).
  const a = yield* io.script({
    phase: partial ? "assemble (parziale)" : "assemble",
    bin: NODE_BIN,
    args: [
      "--experimental-strip-types",
      "scripts/assemble-site.ts",
      BLUEPRINT,
      `out/${slug}`,
      "-o",
      `out/${slug}/site.json`,
      // Le foto reali del cliente popolano la Gallery via lavori.json (sotto 4 →
      // sezione droppata). Senza il file: --foto-reali 0 (nessuna gallery).
      ...(fs.existsSync(path.join(dir, "lavori.json"))
        ? ["--lavori", `out/${slug}/lavori.json`]
        : ["--foto-reali", "0"]),
      // Documenti legali reali (Fase 3): se il workspace ha legale.json le
      // pagine /privacy e /termini rendono il documento vero senza banner.
      ...(fs.existsSync(path.join(dir, "legale.json")) ? ["--legale", `out/${slug}/legale.json`] : []),
      ...(partial ? ["--partial"] : []),
    ],
    cwd: SITE_RENDERER,
    timeoutMs: 60_000,
  });
  if (!a.ok) return a;

  // FASE logo (patch deterministica): gli artifact possono referenziare "./file"
  // relativo al workspace (logo del cliente, kit mark/favicon del logo-designer)
  // — sul sito deve diventare /media/<slug>/file.
  const site = JSON.parse(fs.readFileSync(siteJson, "utf8"));
  let sitePatched = false;
  const patchMedia = (src: string): string | null => {
    const file = path.basename(src);
    const abs = path.join(dir, file);
    if (!fs.existsSync(abs)) return null;
    fs.mkdirSync(path.join(PUBLIC_MEDIA, slug), { recursive: true });
    fs.copyFileSync(abs, path.join(PUBLIC_MEDIA, slug, file));
    sitePatched = true;
    return `/media/${slug}/${file}`;
  };
  for (const key of ["logo", "mark"] as const) {
    const src: string | undefined = site?.brand?.[key]?.src;
    if (src?.startsWith("./")) {
      const patched = patchMedia(src);
      if (!patched) return { ok: false, error: `il brand.${key} punta a ${src} ma il file non esiste nel workspace` };
      site.brand[key].src = patched;
      yield { type: "text", text: `${key}: ${path.basename(src)} → ${patched}` };
    }
  }
  if (typeof site?.brand?.favicon === "string" && site.brand.favicon.startsWith("./")) {
    const patched = patchMedia(site.brand.favicon);
    if (!patched) return { ok: false, error: `il brand.favicon punta a ${site.brand.favicon} ma il file non esiste nel workspace` };
    site.brand.favicon = patched;
    yield { type: "text", text: `favicon → ${patched}` };
  }
  if (sitePatched) fs.writeFileSync(siteJson, JSON.stringify(site, null, 2) + "\n");

  // FASE validate (gate Zod del renderer, stesso script del CLI).
  const v = yield* io.script({
    phase: "validate",
    bin: NODE_BIN,
    args: ["--experimental-strip-types", "scripts/validate-site.ts", `out/${slug}/site.json`],
    cwd: SITE_RENDERER,
    timeoutMs: 30_000,
  });
  if (!v.ok) return v;

  // FASE astro build → out/<slug>/dist (path assoluti: fuori dal renderer).
  const b = yield* io.script({
    phase: "astro build",
    bin: ASTRO_BIN,
    args: ["build", "--outDir", dist],
    cwd: SITE_RENDERER,
    env: { SITE_JSON: siteJson },
    timeoutMs: 180_000,
  });
  if (!b.ok) return b;

  // Post-build: /anteprima/[preset] sono pagine QA interne, non vanno al cliente.
  fs.rmSync(path.join(dist, "anteprima"), { recursive: true, force: true });
  const { pages, sizeKb } = distStats(dist);
  patchClientState(slug, (s) => {
    s.steps.build.partial = partial;
    s.steps.build.builtAt = new Date().toISOString();
    s.steps.build.pages = pages;
    s.steps.build.sizeKb = sizeKb;
    // deploy NON si azzera: il sito online resta online; la UI segnala
    // «build più recente non pubblicata» confrontando builtAt/deployedAt.
  });
  yield { type: "text", text: `build ok — ${pages} pagine, ${sizeKb} KB${partial ? " (parziale)" : ""}` };
  return { ok: true };
}
