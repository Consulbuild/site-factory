// generate-logo.mjs — logo completo (simbolo + nome) via OpenAI Images API, PNG
// trasparente; favicon dal solo simbolo; foglio di contatto + metriche per il
// critico. L'AI riceve SOLO il prompt composto dall'editor (lib/logo.ts).
//
// Uso (da site-renderer/, OPENAI_API_KEY in env o nel Keychain macOS):
//   node scripts/generate-logo.mjs --prompt "…" --out out/x/logo/mark-1.png [--size 1536x1024] [--quality high] [--model gpt-image-2.5-sunburst]
//   node scripts/generate-logo.mjs --favicon-da out/x/mark.png --out out/x/favicon.png   # edits (medium) → fallback ritaglio
//   node scripts/generate-logo.mjs --contatto out/x/logo/contatto.png --bg "#fff" out/x/logo/mark-1.png …   # + metriche.json accanto
//
// Ultima riga di stdout: `ESITO {json}` (usage, costo_usd stimato, metriche) —
// l'editor la legge (parseEsito) e la mette nel trace. Exit 0 ok · 1 API/file · 2 uso/key.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, basename, join } from "node:path";
// ponytail: sharp è transitiva di astro in site-renderer/node_modules; se sparisce, `npm i sharp`.
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const prompt = flag("--prompt");
const out = flag("--out");
const faviconDa = flag("--favicon-da");
const contatto = flag("--contatto");
const size = flag("--size") ?? "1536x1024";
const quality = flag("--quality") ?? "high";
const model = flag("--model") ?? "gpt-image-2.5-sunburst";
const bg = flag("--bg") ?? "#ffffff";
const SCURO = "#1a1a1a"; // fondo scuro di riferimento per la tessera «su scuro»

const esito = (o) => console.log(`ESITO ${JSON.stringify(o)}`);
const fail = (msg, code = 1) => { console.error(msg); process.exit(code); };

if (!contatto && (!out || (!prompt && !faviconDa))) {
  fail('uso: generate-logo.mjs (--prompt "…" | --favicon-da mark.png | --contatto out.png …) --out file.png', 2);
}

/* ---------------- OpenAI ---------------- */
function apiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  // Le key vivono nel Keychain macOS (servizio site-factory), mai in chiaro su disco.
  const r = spawnSync("/usr/bin/security", ["find-generic-password", "-s", "site-factory", "-a", "OPENAI_API_KEY", "-w"], { encoding: "utf8" });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  fail(`OPENAI_API_KEY mancante.
Aggiungila dal pannello «Chiavi API» dell'editor (Keychain) o passala come env:
  OPENAI_API_KEY=xxx node scripts/generate-logo.mjs …
Crea la chiave su https://platform.openai.com (serve la verifica dell'organizzazione per i modelli gpt-image).`, 2);
}

// Listino 2026-09 ($/M token): il costo è una stima dai token restituiti nella risposta.
const PREZZI = { text_in: 5, image_in: 8, image_out: 30 };
const costo = (u) =>
  Math.round((((u?.input_tokens_details?.text_tokens ?? 0) * PREZZI.text_in + (u?.input_tokens_details?.image_tokens ?? 0) * PREZZI.image_in + (u?.output_tokens ?? 0) * PREZZI.image_out) / 1e6) * 10000) / 10000;

async function openai(path, body) {
  const key = apiKey();
  const isForm = body instanceof FormData;
  const res = await fetch(`https://api.openai.com/v1/images/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, ...(isForm ? {} : { "Content-Type": "application/json" }) },
    body: isForm ? body : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`OpenAI: risposta senza immagine ${JSON.stringify(json).slice(0, 300)}`);
  return { png: Buffer.from(b64, "base64"), usage: json.usage ?? null };
}

/* ---------------- metriche (sharp) ---------------- */
async function rgba(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Ritaglia i margini trasparenti e misura: copertura, bbox, colori, ink a 40/256 px, simbolo. */
// `ritagliato`: il PNG è già senza margini (mark-N.png salvato), quindi il contenuto
// tocca il bordo per definizione e il test «mozzato» ha senso solo sulla tela originale.
async function analizza(buf, { ritagliato = false } = {}) {
  const meta = await sharp(buf).metadata();
  const { data, w, h } = await rgba(buf);
  const alpha = (x, y) => data[(y * w + x) * 4 + 3];
  let minX = w, minY = h, maxX = -1, maxY = -1, opachi = 0;
  const conta = new Map();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a <= 16) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (a > 200) {
        opachi++;
        const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        conta.set(k, (conta.get(k) ?? 0) + 1);
      }
    }
  }
  const alphaOk = meta.hasAlpha === true && opachi < w * h * 0.98;
  if (maxX < 0) return { png: buf, metriche: { alpha: alphaOk, copertura: 0, bordo_opaco: false, width: w, height: h, ratio: 1, larghezza_a_40px: 40, colori_dominanti: [], n_colori: 0, ink40: 0, ink256: 0, dettaglio: 0, bbox_simbolo: null } };
  let bordo = false;
  for (let x = 0; x < w && !bordo && !ritagliato; x++) if (alpha(x, 0) > 200 || alpha(x, h - 1) > 200) bordo = true;
  for (let y = 0; y < h && !bordo && !ritagliato; y++) if (alpha(0, y) > 200 || alpha(w - 1, y) > 200) bordo = true;
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const png = await sharp(buf).extract({ left: minX, top: minY, width: bw, height: bh }).png().toBuffer();
  const tot = [...conta.values()].reduce((s, n) => s + n, 0) || 1;
  const colori = [...conta.entries()].map(([k, n]) => ({ hex: "#" + [(k >> 10) & 31, (k >> 5) & 31, k & 31].map((q) => ((q << 3) + 4).toString(16).padStart(2, "0")).join(""), quota: Math.round((n / tot) * 1000) / 1000 })).filter((c) => c.quota >= 0.01).sort((a, b) => b.quota - a.quota).slice(0, 8);
  const ink = async (H) => {
    const { data: d, w: rw, h: rh } = await rgba(await sharp(png).resize({ height: H }).flatten({ background: "#ffffff" }).png().toBuffer());
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 200) n++;
    return Math.round((n / (rw * rh)) * 1000) / 1000;
  };
  const ink40 = await ink(40), ink256 = await ink(256);
  // simbolo: dal 2026-09-14 il prompt chiede il lockup ORIZZONTALE (nome a destra
  // del simbolo), quindi si cerca PRIMA una colonna trasparente (≥1.5% della
  // larghezza) che separi un blocco sinistro tra il 12% e il 60% della larghezza;
  // in subordine la fascia orizzontale storica (lockup impilato: blocco
  // superiore 30-70%, fascia ≥2% dell'altezza).
  let simbolo = null;
  let gapStart = -1;
  for (let x = minX; x <= maxX + 1; x++) {
    let vuota = true;
    if (x <= maxX) for (let y = minY; y <= maxY; y++) if (alpha(x, y) > 16) { vuota = false; break; }
    if (vuota && gapStart < 0) gapStart = x;
    if (!vuota && gapStart >= 0) {
      const left = gapStart - minX;
      if (x - gapStart >= bw * 0.015 && left >= bw * 0.12 && left <= bw * 0.6) {
        let sy = h, ey = -1;
        for (let xx = minX; xx < gapStart; xx++) for (let y = minY; y <= maxY; y++) if (alpha(xx, y) > 16) { if (y < sy) sy = y; if (y > ey) ey = y; }
        simbolo = { x: 0, y: sy - minY, w: left, h: ey - sy + 1 };
        break;
      }
      gapStart = -1;
    }
  }
  gapStart = -1;
  for (let y = minY; y <= maxY + 1 && !simbolo; y++) {
    let vuota = true;
    if (y <= maxY) for (let x = minX; x <= maxX; x++) if (alpha(x, y) > 16) { vuota = false; break; }
    if (vuota && gapStart < 0) gapStart = y;
    if (!vuota && gapStart >= 0) {
      const top = gapStart - minY;
      if (y - gapStart >= bh * 0.02 && top >= bh * 0.3 && top <= bh * 0.7) {
        let sx = w, ex = -1;
        for (let yy = minY; yy < gapStart; yy++) for (let x = minX; x <= maxX; x++) if (alpha(x, yy) > 16) { if (x < sx) sx = x; if (x > ex) ex = x; }
        simbolo = { x: sx - minX, y: 0, w: ex - sx + 1, h: top };
        break;
      }
      gapStart = -1;
    }
  }
  const ratio = Math.round((bw / bh) * 100) / 100;
  return {
    png,
    metriche: { alpha: alphaOk, copertura: Math.round((opachi / (bw * bh)) * 1000) / 1000, bordo_opaco: bordo, width: bw, height: bh, ratio, larghezza_a_40px: Math.round(40 * ratio), colori_dominanti: colori, n_colori: colori.length, ink40, ink256, dettaglio: ink256 ? Math.round((ink40 / ink256) * 100) / 100 : 0, bbox_simbolo: simbolo },
  };
}

/* ---------------- generazione ---------------- */
if (prompt) {
  let r;
  try {
    r = await openai("generations", { model, prompt, size, quality, background: "transparent", output_format: "png", n: 1 });
  } catch (e) {
    fail(e.message);
  }
  const { png, metriche } = await analizza(r.png);
  mkdirSync(dirname(out) || ".", { recursive: true });
  writeFileSync(out, png);
  console.log(`OK — ${out} (${model}, ${size}, ${quality}, ${metriche.width}x${metriche.height}${metriche.alpha ? "" : ", SENZA trasparenza"})`);
  esito({ file: out, model, size, quality, usage: r.usage, costo_usd: costo(r.usage), metriche });
  process.exit(0);
}

/* ---------------- favicon: solo il simbolo ---------------- */
if (faviconDa) {
  const src = readFileSync(faviconDa);
  let png = null, via = "edits", usage = null;
  try {
    const form = new FormData();
    form.append("image", new Blob([src], { type: "image/png" }), "mark.png");
    form.append("model", model);
    form.append("prompt", "Keep only the symbol of this logo, remove all text and letters, centered, same colors, transparent background.");
    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("background", "transparent");
    form.append("output_format", "png");
    const r = await openai("edits", form);
    const a = await analizza(r.png);
    if (a.metriche.alpha && a.metriche.copertura > 0.01) { png = a.png; usage = r.usage; }
  } catch (e) {
    console.error(`edit favicon non riuscito, ritaglio deterministico: ${e.message}`);
  }
  if (!png) {
    via = "ritaglio";
    const a = await analizza(src);
    const m = a.metriche;
    const box = m.bbox_simbolo ?? { x: 0, y: 0, w: Math.min(m.width, m.height), h: Math.min(m.width, m.height) };
    png = await sharp(a.png).extract({ left: box.x, top: box.y, width: box.w, height: box.h }).png().toBuffer();
  }
  const lato = 512;
  const fav = await sharp(png).resize({ width: lato - 32, height: lato - 32, fit: "inside" }).extend({ top: 16, bottom: 16, left: 16, right: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize({ width: lato, height: lato, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  mkdirSync(dirname(out) || ".", { recursive: true });
  writeFileSync(out, fav);
  console.log(`OK — ${out} (favicon via ${via})`);
  esito({ file: out, via, usage, costo_usd: via === "edits" ? costo(usage) : 0 });
  process.exit(0);
}

/* ---------------- foglio di contatto + metriche ---------------- */
const svgText = (t, size, color, w) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size + 8}"><text x="0" y="${size}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" fill="${color}">${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`);
const tela = (w, h, background) => sharp({ create: { width: w, height: h, channels: 4, background } }).png();
const fit = (png, w, h) => sharp(png).resize({ width: w, height: h, fit: "inside" }).png().toBuffer();

async function foglioContatto(outFile, files) {
  const W = 1400, RH = 640;
  const metriche = {};
  const righe = [];
  for (const f of files) {
    const a = await analizza(readFileSync(f), { ritagliato: true });
    const m = a.metriche;
    metriche[`logo/${basename(f)}`] = m;
    const lockup = a.png;
    const comp = [];
    // A: 512 px su bianco
    comp.push({ input: await fit(lockup, 512, 480), left: 16, top: 40 });
    // B: striscia header 40 px su bg del preset + finta nav
    const nav = svgText("Home    Servizi    Lavori    Contatti", 14, "#444444", 300);
    const hdr = await tela(560, 64, bg).composite([{ input: await fit(lockup, 220, 40), left: 12, top: 12 }, { input: nav, left: 250, top: 22 }]).toBuffer();
    comp.push({ input: hdr, left: 560, top: 40 });
    // C: 40 px su scuro
    const dark = await tela(560, 64, SCURO).composite([{ input: await fit(lockup, 220, 40), left: 12, top: 12 }]).toBuffer();
    comp.push({ input: dark, left: 560, top: 120 });
    // D: 96 px · E: 256 px
    comp.push({ input: await fit(lockup, 300, 96), left: 560, top: 210 });
    comp.push({ input: await fit(lockup, 500, 256), left: 880, top: 210 });
    // F: simbolo a 32 px (se separabile)
    if (m.bbox_simbolo) {
      const sym = await sharp(lockup).extract({ left: m.bbox_simbolo.x, top: m.bbox_simbolo.y, width: m.bbox_simbolo.w, height: m.bbox_simbolo.h }).png().toBuffer();
      comp.push({ input: await fit(sym, 32, 32), left: 560, top: 330 });
      comp.push({ input: await tela(48, 48, SCURO).composite([{ input: await fit(sym, 32, 32), left: 8, top: 8 }]).toBuffer(), left: 610, top: 322 });
      comp.push({ input: svgText("simbolo 32 px", 12, "#666666", 200), left: 670, top: 336 });
    }
    const etichetta = `${basename(f)} · ${m.width}x${m.height} · ratio ${m.ratio} · ${m.larghezza_a_40px} px di larghezza nell'header · colori ${m.n_colori} · dettaglio ${m.dettaglio}${m.alpha ? "" : " · SENZA TRASPARENZA"}${m.bordo_opaco ? " · MOZZATO" : ""}`;
    comp.push({ input: svgText(etichetta, 16, "#222222", W - 32), left: 16, top: 8 });
    comp.push({ input: svgText("512 px", 12, "#888888", 100), left: 16, top: 528 });
    comp.push({ input: svgText("header 40 px · su fondo scuro 40 px · 96 px · 256 px", 12, "#888888", 500), left: 560, top: 528 });
    righe.push(await tela(W, RH, "#ffffff").composite(comp).toBuffer());
  }
  const H = righe.length * RH;
  const foglio = await tela(W, H, "#ffffff").composite(righe.map((r, i) => ({ input: r, left: 0, top: i * RH }))).toBuffer();
  mkdirSync(dirname(outFile) || ".", { recursive: true });
  writeFileSync(outFile, foglio);
  writeFileSync(join(dirname(outFile), "metriche.json"), JSON.stringify(metriche, null, 2));
  console.log(`OK — ${outFile} (${files.length} varianti) + metriche.json`);
  esito({ file: outFile, metriche });
}

if (contatto) {
  const files = args.slice(args.indexOf("--contatto") + 2).filter((a) => !a.startsWith("--") && a !== bg);
  if (!files.length) fail('uso: --contatto <out.png> [--bg "#hex"] <mark-1.png> …', 2);
  await foglioContatto(contatto, files);
}
