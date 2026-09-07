// Inbox locale di SVILUPPO: plugin Vite che risponde, durante `astro dev`,
// alle stesse route HTTP che in produzione saranno i webhook n8n
// (docs/ricerca-storage-foto-lead-2026-09.md §3). Scrive tutto in
// site-intake/.dev-inbox/<leadId>/ così il percorso completo (risposte, foto,
// logo, invio) si prova end-to-end senza VPS.
//
// Contratto (identico a produzione, base = PUBLIC_INTAKE_URL, in dev "/api"):
//   PATCH {base}/lead/{id}          JSON risposte parziali  → bozza.json   (autosalvataggio)
//   POST  {base}/lead/{id}/file     multipart {kind, index, file} → foto/NN-<nome> | logo.<ext>
//   POST  {base}/lead/{id}          JSON lead completo      → lead.json
// Risposta: 200 {"ok":true,...} · 4xx {"ok":false,"errore":"…"}.
//
// Latenza artificiale (per provare barre e retry): INBOX_DELAY_MS=1500 astro dev
// Errori artificiali (1 su N richieste di file): INBOX_FAIL_EVERY=4 astro dev
// Non usa dipendenze: il multipart lo legge `Request.formData()` di Node ≥18.
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";

const RADICE = resolve(process.cwd(), ".dev-inbox");
const ID_OK = /^[a-z0-9-]{8,64}$/i; // UUID o simile: mai path traversal
const DELAY = Number(process.env.INBOX_DELAY_MS ?? 0);
const FAIL_EVERY = Number(process.env.INBOX_FAIL_EVERY ?? 0);
let contatoreFile = 0;

const rispondi = (res, status, corpo) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(corpo));
};

/** Converte l'IncomingMessage di Node in una Request WHATWG (per formData/json). */
function comeRequest(req) {
  const url = `http://localhost${req.url}`;
  return new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req,
    duplex: "half",
  });
}

const pulisciNome = (nome) =>
  nome
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 80) || "file";

export function devInbox() {
  return {
    name: "site-intake-dev-inbox",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res, next) => {
        const m = /^\/lead\/([^/]+)(\/file)?$/.exec(req.url?.split("?")[0] ?? "");
        if (!m) return next();
        const [, id, isFile] = m;
        if (!ID_OK.test(id)) return rispondi(res, 400, { ok: false, errore: "leadId non valido" });
        const dir = join(RADICE, id);
        if (DELAY) await new Promise((r) => setTimeout(r, DELAY));
        try {
          if (isFile && req.method === "POST") {
            contatoreFile += 1;
            if (FAIL_EVERY && contatoreFile % FAIL_EVERY === 0) {
              return rispondi(res, 503, { ok: false, errore: "errore artificiale (INBOX_FAIL_EVERY)" });
            }
            const form = await comeRequest(req).formData();
            const file = form.get("file");
            const kind = String(form.get("kind") ?? "");
            const index = Number(form.get("index") ?? 0);
            if (!(file instanceof File)) return rispondi(res, 400, { ok: false, errore: "manca il file" });
            let rel;
            if (kind === "logo") rel = `logo${extname(file.name).toLowerCase() || ".bin"}`;
            else if (kind === "foto") rel = join("foto", `${String(index).padStart(2, "0")}-${pulisciNome(file.name)}`);
            else return rispondi(res, 400, { ok: false, errore: "kind deve essere foto o logo" });
            await mkdir(join(dir, "foto"), { recursive: true });
            await writeFile(join(dir, rel), Buffer.from(await file.arrayBuffer()));
            return rispondi(res, 200, { ok: true, file: rel, bytes: file.size });
          }
          if (!isFile && (req.method === "POST" || req.method === "PATCH")) {
            const corpo = await comeRequest(req).json();
            await mkdir(dir, { recursive: true });
            const nome = req.method === "POST" ? "lead.json" : "bozza.json";
            await writeFile(join(dir, nome), JSON.stringify(corpo, null, 2) + "\n");
            return rispondi(res, 200, { ok: true, file: nome });
          }
          return rispondi(res, 405, { ok: false, errore: "metodo non previsto" });
        } catch (e) {
          return rispondi(res, 500, { ok: false, errore: e instanceof Error ? e.message : String(e) });
        }
      });
    },
  };
}
