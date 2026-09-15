// media-varianti.ts — varianti delle immagini per le «pagine leggere» (docs/traffico/piano-T1b.md §4.1).
//
// Uso (da site-renderer/, lo lancia site-factory-editor/lib/build.ts solo col servizio
// Traffico «Sito» attivo o sospeso):
//   node --experimental-strip-types scripts/media-varianti.ts out/<slug>/site.json \
//     --media public/media/<slug> -o out/<slug>/traffico/media-varianti.json
//
// Per ogni `src` di site.json sotto /media/<slug>/: foto → larghezze della scala in AVIF +
// JPEG mozjpeg (PNG se la sorgente ha trasparenza), con la larghezza dell'originale sempre come
// gradino più grande; logo e marchio → PNG senza perdita alto fino a 288 px; SVG e GIF → solo
// le dimensioni. In più una copia leggera della favicon e
// l'anteprima og:image 1200×630 dalla foto della hero. Le varianti vanno in
// public/media/<slug>/v/ (le copia Astro, le cancella la pulizia dei media della build
// successiva) con il nome <nome>.<sha8>-<misura>.<formato>: una foto rigenerata con lo stesso
// nome cambia URL. Il manifest lo legge src/lib/media.ts via MEDIA_VARIANTI_JSON.
//
// Cache in node_modules/.cache/media-varianti/<sha256 sorgente>-<tipo>-<ricetta>/ (altrove con
// MEDIA_VARIANTI_CACHE), scrittura atomica (cartella temporanea + rename): a caldo nessuna codifica.
// ponytail: cache mai potata (~15 MB per versione delle foto di un cliente); si aggiunge una
// pulizia per data quando il disco lo chiede.
//
// Errori (sorgente assente o illeggibile, formato non gestito, sharp che fallisce): exit 1 con
// una riga leggibile su stderr, che l'editor mostra nella scheda Build.

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const RADICE_RENDERER = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Override con MEDIA_VARIANTI_CACHE (prove e calibrazioni in una cartella a parte). */
export const CACHE_PREDEFINITA = process.env.MEDIA_VARIANTI_CACHE || join(RADICE_RENDERER, "node_modules", ".cache", "media-varianti");

/**
 * Ricetta delle varianti: ogni cambio, una nuova versione di sharp/libvips o una modifica a questo
 * script (la codifica decide parametri che qui non compaiono: density e palette della favicon,
 * ritaglio della og, compressione PNG, riuso dell'originale) rigenera tutto.
 */
export const RICETTA = {
  /** Una sola scala per tutte le foto (più l'originale in cima); il `sizes` per uso vive nei componenti. */
  larghezze: [400, 640, 960, 1280, 1920],
  /**
   * Qualità per origine (decisione di Mattia T1b punto 8 e calibrazione C1, piano T1b § Calibrazione):
   * indistinguibile dagli originali anche con lo zoom. AVIF q90 = un gradino sopra la prima qualità
   * che passa il gate (SSIM media ≥ 0,99, zone peggiori ≥ 0,95), «nel dubbio si sale». JPEG di
   * ripiego q95; alla larghezza dell'originale il JPEG è il file originale stesso (vedi `codifica`).
   */
  qualita: {
    generata: { avif: 90, jpeg: 95 },
    reale: { avif: 90, jpeg: 95 },
  },
  /** Effort 2 è 3× più veloce ma perde SSIM a pari peso (C2): la codifica si fa una volta sola. */
  avifEffort: 4,
  /**
   * Logo e marchio: PNG senza perdita (C4, «nel dubbio PNG lossless»), alto quanto l'originale fino
   * a 288 px = 2 × 48 px dell'intestazione × DPR 3 (regola dello zoom).
   */
  logoAltezzaMax: 288,
  /** Favicon: lato del PNG e soglia sotto cui l'originale resta com'è. */
  faviconLato: 96,
  faviconMaxByte: 10 * 1024,
  og: { w: 1200, h: 630 },
} as const;

export type Origine = keyof typeof RICETTA.qualita;
export type Tipo = "foto-generata" | "foto-reale" | "logo" | "favicon" | "og";

/** sha256 del sorgente di questo script: ogni modifica alla logica di codifica cambia la chiave della cache. */
const CODICE = createHash("sha256").update(readFileSync(fileURLToPath(import.meta.url))).digest("hex");

export const hashRicetta = (ricetta: unknown = RICETTA): string =>
  createHash("sha256").update(JSON.stringify({ ricetta, versioni: sharp.versions, codice: CODICE })).digest("hex").slice(0, 12);

/**
 * Larghezze di una foto: i gradini più stretti della sorgente e, sempre come gradino più grande, la
 * larghezza della sorgente (anche oltre l'ultimo gradino: con lo zoom nessuna foto perde definizione
 * rispetto all'originale). Mai ingrandire.
 */
export function scala(larghezzaSorgente: number, gradini: readonly number[] = RICETTA.larghezze): number[] {
  return [...gradini.filter((w) => w < larghezzaSorgente), larghezzaSorgente];
}

/** URL di una variante: /media/<slug>/v/<nome>.<sha8>-<suffisso>. */
export function urlVariante(src: string, sha256: string, suffisso: string): string {
  const nome = basename(src, extname(src));
  return `${src.slice(0, src.lastIndexOf("/"))}/v/${nome}.${sha256.slice(0, 8)}-${suffisso}`;
}

export type Riferimenti = {
  /** src → tipo, in ordine di comparsa; una foto usata anche come foto reale resta reale. */
  immagini: Map<string, "foto-generata" | "foto-reale" | "logo">;
  favicon: string | null;
  hero: string | null;
};

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});

/** I `src` locali di site.json (sotto `prefisso` = /media/<slug>/), per tipo. */
export function raccogliRiferimenti(site: unknown, prefisso: string): Riferimenti {
  const immagini: Riferimenti["immagini"] = new Map();
  const locale = (v: unknown): v is string => typeof v === "string" && v.startsWith(prefisso);
  const aggiungi = (src: string, tipo: "foto-generata" | "foto-reale" | "logo") => {
    const prima = immagini.get(src);
    if (!prima || (prima === "foto-generata" && tipo === "foto-reale")) immagini.set(src, tipo);
  };
  const visita = (v: unknown, tipo: "foto-generata" | "foto-reale") => {
    if (Array.isArray(v)) return v.forEach((x) => visita(x, tipo));
    if (!v || typeof v !== "object") return;
    for (const [k, x] of Object.entries(v)) {
      if (k === "src" && locale(x)) aggiungi(x, tipo);
      else visita(x, tipo);
    }
  };
  const s = rec(site);
  const brand = rec(s.brand);
  for (const k of ["logo", "mark"]) {
    const src = rec(brand[k]).src;
    if (locale(src)) aggiungi(src, "logo");
  }
  let hero: string | null = null;
  for (const sezione of Array.isArray(s.sections) ? s.sections : []) {
    const r = rec(sezione);
    // Le foto della galleria sono i lavori reali del cliente (lavori.json); le altre le genera la pipeline.
    visita(r.props, r.type === "Gallery" ? "foto-reale" : "foto-generata");
    const img = rec(rec(r.props).image).src;
    if (r.type === "Hero" && hero === null && locale(img)) hero = img;
  }
  return { immagini, favicon: locale(brand.favicon) ? brand.favicon : null, hero };
}

export type Candidato = [url: string, larghezza: number];
export type VociImmagine = { w: number; h: number; avif?: Candidato[]; jpeg?: Candidato[]; png?: Candidato[] };
export type Manifest = {
  versione: 1;
  ricetta: string;
  immagini: Record<string, VociImmagine>;
  favicon?: string;
  og?: { src: string; w: number; h: number };
};

/** Voce in cache: file per suffisso e voce del manifest con i suffissi al posto degli URL. */
type VoceCache = { w: number; h: number; formati: Partial<Record<"avif" | "jpeg" | "png", Candidato[]>>; file: string[] };

const RASTER = new Set(["jpeg", "png", "webp", "heif", "tiff"]);
const SOLO_DIMENSIONI = new Set(["svg", "gif"]);

async function codifica(buf: Buffer, tipo: Tipo, ricetta: typeof RICETTA, dir: string): Promise<VoceCache> {
  // Il form accetta il logo anche in PDF (site-intake/src/components/logo.ts): né sharp né il browser
  // lo mostrano come immagine, quindi si dice all'operatore cosa fare invece dell'errore di libvips.
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    throw new Error(
      tipo === "logo"
        ? "il logo è un PDF, che il sito non può mostrare: carica il logo in PNG o SVG nella scheda Intake (Materiali → Logo) e rilancia la build"
        : "è un PDF, che il sito non può mostrare: sostituiscilo con un JPEG, PNG o SVG e rilancia la build",
    );
  }
  const meta = await sharp(buf).metadata();
  const w = meta.autoOrient?.width ?? meta.width;
  const h = meta.autoOrient?.height ?? meta.height;
  if (!meta.format || !w || !h) throw new Error("dimensioni non leggibili");
  const voce: VoceCache = { w, h, formati: {}, file: [] };
  if (tipo === "favicon") {
    if (buf.length <= ricetta.faviconMaxByte) return voce;
    const lato = ricetta.faviconLato;
    const out = await sharp(buf, { density: 300 }).autoOrient().resize(lato, lato, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true }).toBuffer();
    writeFileSync(join(dir, `${lato}.png`), out);
    voce.file.push(`${lato}.png`);
    return voce;
  }
  if (SOLO_DIMENSIONI.has(meta.format)) return voce;
  if (!RASTER.has(meta.format)) throw new Error(`formato «${meta.format}» non gestito (attesi JPEG, PNG, WebP, AVIF, TIFF, SVG o GIF)`);

  const base = sharp(buf).autoOrient();
  const scrivi = async (img: sharp.Sharp, formato: "avif" | "jpeg" | "png", misura: number | string, q?: number) => {
    const ext = formato === "jpeg" ? "jpg" : formato;
    const file = `${misura}.${ext}`;
    const out =
      formato === "avif"
        ? img.avif({ quality: q, effort: ricetta.avifEffort })
        : formato === "jpeg"
          ? img.jpeg({ quality: q, mozjpeg: true })
          : img.png({ compressionLevel: 9 });
    writeFileSync(join(dir, file), await out.toBuffer());
    voce.file.push(file);
    return file;
  };

  if (tipo === "og") {
    const k = Math.min(1, w / ricetta.og.w, h / ricetta.og.h);
    const [ow, oh] = [Math.round(ricetta.og.w * k), Math.round(ricetta.og.h * k)];
    const file = await scrivi(base.clone().resize(ow, oh, { fit: "cover", position: "centre" }), "jpeg", "og", ricetta.qualita.generata.jpeg);
    voce.formati.jpeg = [[file, ow]];
    voce.h = oh;
    voce.w = ow;
    return voce;
  }
  if (tipo === "logo") {
    const alt = Math.min(h, ricetta.logoAltezzaMax);
    const lw = Math.round((w * alt) / h);
    voce.formati.png = [[await scrivi(base.clone().resize({ height: alt }), "png", lw), lw]];
    return voce;
  }
  const q = ricetta.qualita[tipo === "foto-reale" ? "reale" : "generata"];
  const ripiego = meta.hasAlpha ? "png" : "jpeg";
  // Alla larghezza dell'originale il JPEG di ripiego è il file com'è (la qualità servita oggi, senza
  // una seconda compressione), se non porta metadati (EXIF/XMP/IPTC: posizione, apparecchio) né
  // una rotazione da applicare; altrimenti si ricodifica.
  const originaleRiusabile = meta.format === "jpeg" && !meta.exif && !meta.xmp && !meta.iptc && (meta.orientation ?? 1) === 1;
  voce.formati.avif = [];
  voce.formati[ripiego] = [];
  for (const lw of scala(w, ricetta.larghezze)) {
    const img = base.clone().resize({ width: lw });
    voce.formati.avif.push([await scrivi(img.clone(), "avif", lw, q.avif), lw]);
    if (ripiego === "jpeg" && lw === w && originaleRiusabile) {
      writeFileSync(join(dir, `${lw}.jpg`), buf);
      voce.file.push(`${lw}.jpg`);
      voce.formati.jpeg!.push([`${lw}.jpg`, lw]);
    } else voce.formati[ripiego]!.push([await scrivi(img.clone(), ripiego, lw, q.jpeg), lw]);
  }
  return voce;
}

/** Legge dalla cache o codifica (cartella temporanea + rename). */
async function voceDaCache(buf: Buffer, sha: string, tipo: Tipo, ricetta: typeof RICETTA, cacheDir: string): Promise<{ voce: VoceCache; dir: string; daCache: boolean }> {
  const dir = join(cacheDir, `${sha}-${tipo}-${hashRicetta(ricetta)}`);
  const fileVoce = join(dir, "voce.json");
  if (existsSync(fileVoce)) {
    try {
      const voce = JSON.parse(readFileSync(fileVoce, "utf8")) as VoceCache;
      if (voce.file.every((f) => existsSync(join(dir, f)))) return { voce, dir, daCache: true };
    } catch {
      /* voce illeggibile (disco, copia a metà): si ricodifica e si sostituisce */
    }
  }
  const tmp = `${dir}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
  mkdirSync(tmp, { recursive: true });
  try {
    const voce = await codifica(buf, tipo, ricetta, tmp);
    writeFileSync(join(tmp, "voce.json"), JSON.stringify(voce));
    rmSync(dir, { recursive: true, force: true });
    renameSync(tmp, dir);
    return { voce, dir, daCache: false };
  } catch (e) {
    rmSync(tmp, { recursive: true, force: true });
    throw e;
  }
}

export type Esito = { manifest: Manifest; righe: string[] };

/**
 * Varianti di tutte le immagini locali di `site` in `<mediaDir>/v/` e manifest.
 * `mediaDir` = public/media/<slug>: lo slug è il nome della cartella.
 */
export async function generaVarianti(opts: { site: unknown; mediaDir: string; cacheDir?: string; ricetta?: typeof RICETTA }): Promise<Esito> {
  const ricetta = opts.ricetta ?? RICETTA;
  const cacheDir = opts.cacheDir ?? CACHE_PREDEFINITA;
  const mediaDir = resolve(opts.mediaDir);
  const prefisso = `/media/${basename(mediaDir)}/`;
  const rif = raccogliRiferimenti(opts.site, prefisso);
  const dirV = join(mediaDir, "v");
  rmSync(dirV, { recursive: true, force: true });
  mkdirSync(dirV, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });

  const lavori: { src: string; tipo: Tipo }[] = [...rif.immagini].map(([src, tipo]) => ({ src, tipo }));
  if (rif.favicon) lavori.push({ src: rif.favicon, tipo: "favicon" });
  if (rif.hero) lavori.push({ src: rif.hero, tipo: "og" });

  const manifest: Manifest = { versione: 1, ricetta: hashRicetta(ricetta), immagini: {} };
  const righe: string[] = [];
  const t0 = performance.now();
  let daCache = 0;
  // allSettled: al primo errore le altre codifiche finiscono e ripuliscono le loro cartelle
  // temporanee, poi si segnala il primo errore.
  const esitiGrezzi = await Promise.allSettled(
    lavori.map(async ({ src, tipo }) => {
      const file = resolve(mediaDir, src.slice(prefisso.length));
      if (!file.startsWith(mediaDir + sep)) throw new Error(`${src}: percorso fuori da ${relative(RADICE_RENDERER, mediaDir)}`);
      if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`${src}: site.json lo usa ma il file non c'è in ${relative(RADICE_RENDERER, mediaDir) || mediaDir}`);
      const buf = readFileSync(file);
      const sha = createHash("sha256").update(buf).digest("hex");
      try {
        const r = await voceDaCache(buf, sha, tipo, ricetta, cacheDir);
        if (r.daCache) daCache++;
        // Copia con il nome definitivo e URL al posto dei suffissi.
        const url = (suffisso: string) => urlVariante(src, sha, suffisso);
        for (const f of r.voce.file) copyFileSync(join(r.dir, f), join(dirV, basename(url(f))));
        return { src, tipo, voce: r.voce, url, daCache: r.daCache };
      } catch (e) {
        throw new Error(`${src}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),
  );
  const fallito = esitiGrezzi.find((e) => e.status === "rejected");
  if (fallito) throw fallito.reason;
  const esiti = esitiGrezzi.flatMap((e) => (e.status === "fulfilled" ? [e.value] : []));
  for (const { src, tipo, voce, url, daCache: dallaCache } of esiti) {
    // Le codifiche girano in parallelo: il tempo ha senso solo sul totale (ultima riga).
    const come = dallaCache ? "cache" : "codificata";
    const aUrl = (c: Candidato[] | undefined) => c?.map(([f, w]): Candidato => [url(f), w]);
    if (tipo === "favicon") {
      if (voce.file.length) {
        manifest.favicon = url(voce.file[0]);
        righe.push(`${src}: favicon → ${voce.file[0]} (${come})`);
      } else righe.push(`${src}: favicon già leggera, resta l'originale`);
      continue;
    }
    if (tipo === "og") {
      // Hero in SVG o GIF: la codifica dà solo le dimensioni, niente anteprima; Base.astro usa l'originale.
      const og = voce.formati.jpeg?.[0];
      if (og) {
        manifest.og = { src: url(og[0]), w: og[1], h: voce.h };
        righe.push(`${src}: og:image ${og[1]}×${voce.h} (${come})`);
      } else righe.push(`${src}: og:image non generata (hero non raster), resta l'originale della hero`);
      continue;
    }
    const v: VociImmagine = { w: voce.w, h: voce.h };
    for (const k of ["avif", "jpeg", "png"] as const) if (voce.formati[k]) v[k] = aUrl(voce.formati[k]);
    manifest.immagini[src] = v;
    const larghezze = (v.avif ?? v.png ?? v.jpeg ?? []).map(([, w]) => w);
    righe.push(`${src}: ${larghezze.length ? `${tipo} ${larghezze.join("/")} px` : `${tipo}, solo dimensioni ${voce.w}×${voce.h}`} (${come})`);
  }
  righe.push(`${esiti.length} voci, ${daCache} dalla cache, ${esiti.length - daCache} codificate in ${((performance.now() - t0) / 1000).toFixed(1)} s · ricetta ${manifest.ricetta}`);
  return { manifest, righe };
}

function uso(msg: string): never {
  console.error(`media-varianti: ${msg}\nuso: media-varianti.ts <site.json> --media public/media/<slug> -o <manifest.json>`);
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const val = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const siteJson = argv[0];
  const mediaDir = val("--media");
  const out = val("-o");
  if (!siteJson || siteJson.startsWith("-") || !mediaDir || !out) uso("argomenti mancanti");
  let site: unknown;
  try {
    site = JSON.parse(readFileSync(siteJson, "utf8"));
  } catch (e) {
    uso(`${siteJson} illeggibile (${e instanceof Error ? e.message : String(e)})`);
  }
  if (!existsSync(mediaDir)) uso(`cartella dei media ${mediaDir} assente: la fase media della build non l'ha creata`);
  try {
    const { manifest, righe } = await generaVarianti({ site, mediaDir });
    for (const r of righe) console.log(r);
    mkdirSync(dirname(resolve(out)), { recursive: true });
    const tmp = `${out}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(manifest, null, 2) + "\n");
    renameSync(tmp, out);
    console.log(`manifest → ${out}`);
  } catch (e) {
    console.error(`media-varianti: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
