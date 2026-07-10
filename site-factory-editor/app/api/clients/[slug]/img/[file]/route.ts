import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { clientDir } from "@/lib/paths";

export const dynamic = "force-dynamic";

// Thumbnail delle immagini generate: serve out/<slug>/img/<file>. Sola lettura
// (le immagini nascono solo dalla pipeline). Allow-list sul nome = anti path
// traversal: il param non tocca mai il filesystem senza il match.
const IMG_RE = /^[a-z0-9-]+\.jpg$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await ctx.params;
  if (!IMG_RE.test(file)) return new NextResponse(null, { status: 400 });
  let abs: string;
  try {
    abs = path.join(clientDir(slug), "img", file);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!fs.existsSync(abs)) return new NextResponse(null, { status: 404 });
  const buf = fs.readFileSync(abs);
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
  });
}
