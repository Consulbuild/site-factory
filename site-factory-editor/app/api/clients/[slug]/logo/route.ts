import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { clientDir } from "@/lib/paths";
import { writeJson } from "@/lib/clients";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

// Allow-list tipo→estensione (trust boundary: si valida l'upload, non ci si fida
// del nome file). Sono i formati che la pipeline usa per i loghi.
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024; // i loghi sono piccoli; 5MB è già abbondante

const LOGO_RE = /^logo\.(png|jpe?g|svg|webp)$/i;

function resolveDir(slug: string): string | null {
  try {
    const dir = clientDir(slug);
    return fs.existsSync(dir) ? dir : null;
  } catch {
    return null;
  }
}

/** Rimuove ogni file logo.* nella cartella (per non lasciare estensioni orfane). */
function removeLogos(dir: string): void {
  for (const f of fs.readdirSync(dir)) if (LOGO_RE.test(f)) fs.rmSync(path.join(dir, f), { force: true });
}

function updateIntakeLogo(dir: string, value: { src: string; alt: string } | null): void {
  const p = path.join(dir, "intake.json");
  if (!fs.existsSync(p)) return;
  const intake = JSON.parse(fs.readFileSync(p, "utf8"));
  intake["brand.logo"] = value;
  writeJson(p, intake);
}

/** Serve il file logo del cliente. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = resolveDir(slug);
  if (!dir) return new NextResponse(null, { status: 404 });
  const file = fs.readdirSync(dir).find((f) => LOGO_RE.test(f));
  if (!file) return new NextResponse(null, { status: 404 });
  const buf = fs.readFileSync(path.join(dir, file));
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-store" },
  });
}

/** Sostituisce/carica il logo: multipart con campo `file`. */
export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = resolveDir(slug);
  if (!dir) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file mancante" }, { status: 400 });

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json({ error: `formato non supportato: ${file.type || "sconosciuto"} (usa PNG, JPG, SVG o WebP)` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `file troppo grande (${(file.size / 1e6).toFixed(1)} MB, max 5 MB)` }, { status: 413 });
  }
  if (file.size === 0) return NextResponse.json({ error: "file vuoto" }, { status: 400 });

  removeLogos(dir); // toglie eventuali estensioni precedenti diverse
  fs.writeFileSync(path.join(dir, `logo.${ext}`), Buffer.from(await file.arrayBuffer()));

  const intake = JSON.parse(fs.readFileSync(path.join(dir, "intake.json"), "utf8"));
  const alt = `Logo ${intake["meta.businessName"] ?? slug}`;
  updateIntakeLogo(dir, { src: `./logo.${ext}`, alt });
  return NextResponse.json({ ok: true, ext });
}

/** Elimina il logo del cliente. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const dir = resolveDir(slug);
  if (!dir) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });
  removeLogos(dir);
  updateIntakeLogo(dir, null);
  return NextResponse.json({ ok: true });
}
