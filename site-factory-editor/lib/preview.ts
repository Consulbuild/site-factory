import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// Anteprima locale delle build: un http.Server statico nel processo Next,
// porta 4399, che serve UNA dist alla volta. Serve un server separato perché
// la dist vive fuori dal progetto Next (path assoluti in out/<slug>/dist) e
// le route /api non possono servirla come sito navigabile.
// ponytail: singleton per-processo via globalThis — sopravvive all'HMR di
// `next dev`; a un riavvio del dev server basta ripremere «Apri anteprima».

const PORT = 4399;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

interface PreviewState {
  server: http.Server;
  root: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __previewServer: PreviewState | undefined;
}

function createServer(): http.Server {
  const server = http.createServer((req, res) => {
    const root = globalThis.__previewServer?.root;
    if (!root) {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Nessuna anteprima attiva: apri una build dall'editor.");
      return;
    }
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let abs = path.normalize(path.join(root, urlPath));
    // Anti path traversal: mai uscire dalla dist servita.
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      res.writeHead(404).end();
      return;
    }
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) abs = path.join(abs, "index.html");
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(abs).pipe(res);
  });
  server.on("error", (err) => {
    // EADDRINUSE: la porta resta occupata (altro processo editor?) — il
    // singleton si azzera così un retry può ritentare la listen.
    console.error(`[preview:4399] ${err.message}`);
    globalThis.__previewServer = undefined;
  });
  server.listen(PORT);
  return server;
}

/** Punta l'anteprima sulla dist data e ritorna l'URL locale. */
export function setPreviewRoot(distDir: string): string {
  globalThis.__previewServer ??= { server: createServer(), root: null };
  globalThis.__previewServer.root = path.resolve(distDir);
  return `http://localhost:${PORT}/`;
}
