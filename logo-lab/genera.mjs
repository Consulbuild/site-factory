#!/usr/bin/env node
// logo-lab/genera.mjs — genera UN logo raster (PNG, lockup completo: simbolo + nome)
// con il servizio scelto. Stesso prompt per tutti: è il banco per confrontare i
// servizi prima di sceglierne uno da integrare nella pipeline.
//
//   node logo-lab/genera.mjs --servizio bfl|openai|gemini|ideogram --prompt "…" --out mark.png [--model …]
//
// Chiavi: env o Keychain macOS (servizio site-factory, come generate-image.mjs):
//   security add-generic-password -s site-factory -a OPENAI_API_KEY -w '<chiave>'
//   BFL_API_KEY (dashboard.bfl.ai) · OPENAI_API_KEY (platform.openai.com) ·
//   GEMINI_API_KEY (aistudio.google.com) · IDEOGRAM_API_KEY (ideogram.ai/manage-api)
// Exit 0 ok · 1 errore API · 2 uso/chiave mancante. Stampa su stdout una riga
// "OK — <file> (<servizio>/<modello>)". Nessuna dipendenza.
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const servizio = flag("--servizio");
const prompt = flag("--prompt");
const out = flag("--out");
const modelFlag = flag("--model");
if (!servizio || !prompt || !out) {
  console.error('uso: genera.mjs --servizio bfl|openai|gemini|ideogram --prompt "…" --out file.png [--model …]');
  process.exit(2);
}

function chiave(nome, dove) {
  if (process.env[nome]) return process.env[nome];
  const r = spawnSync("/usr/bin/security", ["find-generic-password", "-s", "site-factory", "-a", nome, "-w"], { encoding: "utf8" });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  console.error(`${nome} mancante (${dove}). Aggiungila al Keychain:\n  security add-generic-password -s site-factory -a ${nome} -w '<chiave>'`);
  process.exit(2);
}
const fail = (msg) => { console.error(msg); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function scarica(url) {
  const r = await fetch(url);
  if (!r.ok) fail(`download: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const SERVIZI = {
  // FLUX.2 (già usato dalla pipeline per le foto): submit + poll, png quadrato.
  async bfl() {
    const key = chiave("BFL_API_KEY", "dashboard.bfl.ai");
    const model = modelFlag ?? "pro";
    const s = await fetch(`https://api.bfl.ai/v1/flux-2-${model}`, {
      method: "POST", headers: { "x-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, width: 1024, height: 1024, output_format: "png" }),
    });
    if (!s.ok) fail(`BFL submit: HTTP ${s.status} — ${(await s.text()).slice(0, 300)}`);
    const task = await s.json();
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      await sleep(1500);
      const p = await fetch(task.polling_url, { headers: { "x-key": key } });
      if (!p.ok) fail(`BFL poll: HTTP ${p.status}`);
      const j = await p.json();
      if (j.status === "Ready") return { png: await scarica(j.result.sample), model: `flux-2-${model}` };
      if (!["Pending", "Queued", "Processing"].includes(j.status)) fail(`BFL task ${j.status}: ${JSON.stringify(j).slice(0, 300)}`);
    }
    fail("BFL: timeout 120s");
  },
  // OpenAI gpt-image-1 (il servizio con cui sono stati fatti i riferimenti).
  async openai() {
    const key = chiave("OPENAI_API_KEY", "platform.openai.com");
    const model = modelFlag ?? "gpt-image-1";
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, size: "1024x1024", quality: "high", n: 1 }),
    });
    if (!r.ok) fail(`OpenAI: HTTP ${r.status} — ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    const d = j.data?.[0];
    if (d?.b64_json) return { png: Buffer.from(d.b64_json, "base64"), model };
    if (d?.url) return { png: await scarica(d.url), model };
    fail(`OpenAI: risposta senza immagine ${JSON.stringify(j).slice(0, 300)}`);
  },
  // Google Gemini image (nano banana): generateContent con parte inlineData.
  async gemini() {
    const key = chiave("GEMINI_API_KEY", "aistudio.google.com");
    const model = modelFlag ?? "gemini-2.5-flash-image";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
    });
    if (!r.ok) fail(`Gemini: HTTP ${r.status} — ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) fail(`Gemini: nessuna immagine nella risposta ${JSON.stringify(j).slice(0, 300)}`);
    return { png: Buffer.from(part.inlineData.data, "base64"), model };
  },
  // Ideogram 3 (forte sul testo): multipart, style DESIGN.
  async ideogram() {
    const key = chiave("IDEOGRAM_API_KEY", "ideogram.ai/manage-api");
    const model = modelFlag ?? "ideogram-v3";
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("aspect_ratio", "1x1");
    form.append("rendering_speed", "DEFAULT");
    form.append("style_type", "DESIGN");
    form.append("num_images", "1");
    const r = await fetch(`https://api.ideogram.ai/v1/${model}/generate`, { method: "POST", headers: { "Api-Key": key }, body: form });
    if (!r.ok) fail(`Ideogram: HTTP ${r.status} — ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    const url = j.data?.[0]?.url;
    if (!url) fail(`Ideogram: risposta senza url ${JSON.stringify(j).slice(0, 300)}`);
    return { png: await scarica(url), model };
  },
};

if (!SERVIZI[servizio]) { console.error(`servizio sconosciuto: ${servizio} (bfl|openai|gemini|ideogram)`); process.exit(2); }
const { png, model } = await SERVIZI[servizio]();
mkdirSync(dirname(out) || ".", { recursive: true });
writeFileSync(out, png);
console.log(`OK — ${out} (${servizio}/${model}, ${Math.round(png.length / 1024)} KB)`);
