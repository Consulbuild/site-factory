// generate-image.mjs — genera UNA immagine via FLUX.2 (API BFL) e la scarica subito.
// È il punto di swap del provider immagini: l'agente image-prompter e la futura UI
// chiamano SOLO questo script; i prompt (con i profili per sezione) vivono nella skill.
//
// Uso (da site-renderer/, BFL_API_KEY in env o nel Keychain macOS):
//   node scripts/generate-image.mjs --prompt "…" --width 1920 --height 1088 \
//     --model pro|max --out out/x/img/hero.jpg [--seed 42]
//
// Note verificate (decisions §4): width/height MULTIPLI DI 16 (lo script arrotonda),
// max 4MP, output jpeg; gli URL firmati di consegna scadono in ~10 min → download
// IMMEDIATO, mai riusare l'URL BFL. Poll sulla polling_url restituita, mai hardcoded.
// Exit 0 ok · 1 errore API/timeout · 2 uso/key mancante.
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const prompt = flag("--prompt");
const out = flag("--out");
const model = flag("--model") ?? "pro";
const seed = flag("--seed");
const round16 = (v) => Math.max(16, Math.round(Number(v) / 16) * 16);
const width = round16(flag("--width") ?? 1920);
const height = round16(flag("--height") ?? 1088);

if (!prompt || !out || !["pro", "max"].includes(model)) {
  console.error('uso: generate-image.mjs --prompt "…" --out file.jpg [--width 1920 --height 1088] [--model pro|max] [--seed n]');
  process.exit(2);
}
if ((width * height) > 4_194_304) {
  console.error(`dimensioni ${width}x${height} oltre il tetto di 4MP dell'API BFL`);
  process.exit(2);
}

function apiKey() {
  if (process.env.BFL_API_KEY) return process.env.BFL_API_KEY;
  // Le key vivono nel Keychain macOS (servizio site-factory), mai in chiaro su disco.
  const r = spawnSync("/usr/bin/security", ["find-generic-password", "-s", "site-factory", "-a", "BFL_API_KEY", "-w"], { encoding: "utf8" });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  console.error(`BFL_API_KEY mancante.
Aggiungila dal pannello «Chiavi API» dell'editor (Keychain) o passala come env:
  BFL_API_KEY=xxx node scripts/generate-image.mjs …
Crea la chiave su https://dashboard.bfl.ai (1 credito = $0.01; [pro] ~$0.03/MP, [max] ~$0.07/MP).`);
  process.exit(2);
}
const key = apiKey();

// 1) submit
const submit = await fetch(`https://api.bfl.ai/v1/flux-2-${model}`, {
  method: "POST",
  headers: { "x-key": key, "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, width, height, output_format: "jpeg", ...(seed ? { seed: Number(seed) } : {}) }),
});
if (!submit.ok) {
  console.error(`BFL submit: HTTP ${submit.status} — ${(await submit.text()).slice(0, 300)}`);
  if (submit.status === 429) console.error("rate limit (24 task concorrenti): riprovare tra poco.");
  process.exit(1);
}
const task = await submit.json();
if (!task.polling_url) { console.error(`submit senza polling_url: ${JSON.stringify(task).slice(0, 300)}`); process.exit(1); }

// 2) poll sulla polling_url restituita (backoff 1.5s, timeout 120s)
const deadline = Date.now() + 120_000;
let result = null;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 1500));
  const poll = await fetch(task.polling_url, { headers: { "x-key": key } });
  if (!poll.ok) { console.error(`BFL poll: HTTP ${poll.status}`); process.exit(1); }
  const j = await poll.json();
  if (j.status === "Ready") { result = j.result; break; }
  if (j.status && j.status !== "Pending" && j.status !== "Queued" && j.status !== "Processing") {
    console.error(`BFL task ${j.status}: ${JSON.stringify(j).slice(0, 300)}`);
    process.exit(1);
  }
}
if (!result?.sample) { console.error("timeout (120s) o result senza sample"); process.exit(1); }

// 3) download IMMEDIATO (l'URL firmato scade in ~10 minuti)
const dl = await fetch(result.sample);
if (!dl.ok) { console.error(`download fallito: HTTP ${dl.status}`); process.exit(1); }
mkdirSync(dirname(out) || ".", { recursive: true });
writeFileSync(out, Buffer.from(await dl.arrayBuffer()));
console.log(`OK — ${out} (flux-2 [${model}], ${width}x${height}${seed ? `, seed ${seed}` : ""})`);
