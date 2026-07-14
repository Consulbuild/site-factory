import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { clientDir } from "@/lib/paths";
import { readLavori, writeLavori } from "@/lib/clients";
import { LavoriSchema } from "@/lib/schemas";
import { LAVORO_RE, nextLavoroName, normalizeToJpg } from "@/lib/lavori";

export const dynamic = "force-dynamic";

// Foto REALI dei lavori del cliente → sezione Gallery del sito. Le foto vivono in
// out/<slug>/img/lavoro-N.jpg (servite dalla route img/[file] già esistente) e i
// metadati in lavori.json. NON generate dall'AI: le carica l'operatore qui.

// Allow-list tipo→estensione (trust boundary: si valida l'upload, non il nome file).
// Include l'HEIC/HEIF dell'iPhone: sips lo converte in jpg alla scrittura.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
const EXT_RE = /\.(jpe?g|png|webp|heic|heif)$/i;
const MAX_BYTES = 15 * 1024 * 1024; // foto da smartphone: 15 MB è abbondante
const MAX_FOTO = 12; // limite della Gallery (schema renderer: max 12)

function imgDir(slug: string): string | null {
  try {
    return path.join(clientDir(slug), "img");
  } catch {
    return null;
  }
}

/** File lavoro-*.jpg realmente presenti su disco (fonte di verità per il naming). */
function lavoriOnDisk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => LAVORO_RE.test(f));
}

/** Estensione dedotta dal MIME, con fallback sul nome file (l'HEIC arriva spesso senza type). */
function extFor(file: File): string | null {
  const byMime = EXT_BY_MIME[file.type];
  if (byMime) return byMime;
  const m = EXT_RE.exec(file.name);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : null;
}

/** Aggiunge foto: multipart con campo `files` (uno o più). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = imgDir(slug);
  if (!dir || !fs.existsSync(clientDir(slug))) {
    return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  }
  fs.mkdirSync(dir, { recursive: true });

  const form = await req.formData().catch(() => null);
  const files = form?.getAll("files").filter((f): f is File => f instanceof File) ?? [];
  if (files.length === 0) return NextResponse.json({ error: "nessun file" }, { status: 400 });

  const lavori = readLavori(slug);
  const errors: string[] = [];
  let count = lavori.length;
  let i = 0;

  for (const file of files) {
    if (count >= MAX_FOTO) {
      errors.push(`limite di ${MAX_FOTO} foto raggiunto: "${file.name}" e le successive non caricate`);
      break;
    }
    const ext = extFor(file);
    if (!ext) {
      errors.push(`"${file.name}": formato non supportato (usa JPG, PNG, WebP o HEIC)`);
      continue;
    }
    if (file.size === 0) {
      errors.push(`"${file.name}": file vuoto`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      errors.push(`"${file.name}": troppo grande (${(file.size / 1e6).toFixed(1)} MB, max 15 MB)`);
      continue;
    }

    const tmp = path.join(dir, `.tmp-upload-${process.pid}-${i++}.${ext}`);
    const name = nextLavoroName(lavoriOnDisk(dir));
    try {
      fs.writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));
      normalizeToJpg(tmp, path.join(dir, name));
      lavori.push({ file: name, alt: "", caption: "" });
      count++;
    } catch (e) {
      errors.push(`"${file.name}": ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  writeLavori(slug, lavori);
  return NextResponse.json({ ok: true, lavori, errors });
}

/**
 * Salva metadati + ordine: body { items: [{ file, alt, caption }] }. L'ordine è
 * l'ordine in pagina. Riconcilia le rimozioni: ogni lavoro-*.jpg non più
 * referenziato viene cancellato dal disco. `alt` vuoto ammesso (bozza).
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = imgDir(slug);
  if (!dir || !fs.existsSync(clientDir(slug))) {
    return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = LavoriSchema.safeParse(body?.items);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    return NextResponse.json({ error: "lavori non validi", errors }, { status: 422 });
  }
  const items = parsed.data;

  // Ogni voce deve puntare a un file lavoro-*.jpg realmente presente (niente path arbitrari).
  const onDisk = new Set(lavoriOnDisk(dir));
  const errors = items.filter((it) => !LAVORO_RE.test(it.file) || !onDisk.has(it.file)).map((it) => `file assente: ${it.file}`);
  if (errors.length) return NextResponse.json({ error: "riferimenti non validi", errors }, { status: 422 });

  // Riconcilia rimozioni: cancella le foto non più in lista.
  const keep = new Set(items.map((it) => it.file));
  for (const f of onDisk) if (!keep.has(f)) fs.rmSync(path.join(dir, f), { force: true });

  writeLavori(slug, items);
  return NextResponse.json({ ok: true, lavori: items });
}
