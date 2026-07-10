import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/**
 * Serve una directory statica (con risoluzione index.html) su una porta
 * effimera di loopback. Usato dai gate L1 (overflow, lint-tokens) per
 * esercitare la dist senza dipendere da `astro preview`.
 */
export async function serveDir(dir) {
  const radice = normalize(dir);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let file = normalize(join(radice, decodeURIComponent(url.pathname)));
      if (!file.startsWith(radice)) throw new Error("path fuori dalla dir servita");
      if (!extname(file)) file = join(file, "index.html");
      const corpo = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(corpo);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((ok) => server.close(ok)),
  };
}
