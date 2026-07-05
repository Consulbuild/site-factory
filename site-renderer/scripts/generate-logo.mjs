// generate-logo.mjs — genera il SIMBOLO del logo (mark SVG, senza testo) via Recraft
// e lo ricolora deterministicamente sulla palette. Il lockup completo (mark + nome)
// lo compone l'Header con la tipografia del preset: l'AI non tocca mai il testo.
//
// Uso (da site-renderer/, RECRAFT_API_KEY in env o in .env):
//   node scripts/generate-logo.mjs --prompt "<soggetto>" --color "#90711c" --out out/x/logo/mark-1.svg
//     [--model recraftv3_vector] [--substyle icon]     # default: recraftv3_vector
//   node scripts/generate-logo.mjs --recolor <file.svg> --color "#90711c" --out <out.svg>
//     # solo ricoloro (niente API): utile per varianti dark e per testare il ricoloro
//
// Il ricoloro produce anche <out>-dark.svg (mark bianco per le sezioni scure).
// Senza key: exit 2 con istruzioni (stesso pattern di probe-bfl.mjs).
// Exit 0 ok · 1 errore API/file · 2 uso/key mancante.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const prompt = flag("--prompt");
const color = flag("--color");
const out = flag("--out");
const recolorSrc = flag("--recolor");
const model = flag("--model") ?? "recraftv3_vector";
const substyle = flag("--substyle");

if (!out || !color || (!prompt && !recolorSrc)) {
  console.error('uso: generate-logo.mjs (--prompt "…" | --recolor file.svg) --color "#rrggbb" --out mark.svg [--model …] [--substyle …]');
  process.exit(2);
}
if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
  console.error(`--color "${color}" non è un hex #rrggbb`);
  process.exit(2);
}

/* ---------------- ricoloro deterministico ---------------- */
// Il modello genera monocromo "quasi nero" su fondo bianco. Regola universale:
// i bianchi diventano TRASPARENTI (sfondo via, knockout interni = superficie
// sottostante), tutto il resto diventa il colore di marca. Così lo stesso mark
// funziona su header chiaro e su sezioni scure senza casi speciali.
const WHITEISH = /^(#fff(?:fff)?|#f[e-f]{5}|white|transparent)$/i;
function recolor(svg, hex) {
  const map = (val) => (val.trim() === "none" ? "none" : WHITEISH.test(val.trim()) ? "none" : hex);
  return svg
    .replace(/(fill|stroke)="([^"]+)"/gi, (_, attr, val) => `${attr}="${map(val)}"`)
    .replace(/(fill|stroke):\s*([^;"'}]+)/gi, (_, attr, val) => `${attr}:${map(val)}`);
}
function writeKit(svg, outPath, hex) {
  mkdirSync(dirname(outPath) || ".", { recursive: true });
  writeFileSync(outPath, recolor(svg, hex));
  const dark = outPath.replace(/\.svg$/, "-dark.svg");
  writeFileSync(dark, recolor(svg, "#ffffff"));
  console.log(`OK — ${outPath} (su ${hex}) + ${dark} (variante per sezioni scure)`);
}

if (recolorSrc) {
  if (!existsSync(recolorSrc)) { console.error(`file non trovato: ${recolorSrc}`); process.exit(1); }
  writeKit(readFileSync(recolorSrc, "utf8"), out, color);
  process.exit(0);
}

/* ---------------- generazione Recraft ---------------- */
function apiKey() {
  if (process.env.RECRAFT_API_KEY) return process.env.RECRAFT_API_KEY;
  if (existsSync(".env")) {
    const m = readFileSync(".env", "utf8").match(/^RECRAFT_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  console.error(`RECRAFT_API_KEY mancante.
Questo generatore va eseguito quando la chiave sarà disponibile:
  RECRAFT_API_KEY=xxx node scripts/generate-logo.mjs …
Crea la chiave su https://www.recraft.ai (piano PAID obbligatorio: il free
non dà diritti commerciali sugli output — mai usarlo per loghi di clienti).`);
  process.exit(2);
}

// Guardrail anti-slop nel prompt, sempre appesi al soggetto (vedi SKILL.md logo-designer).
const TECHNICAL = "flat vector pictogram, single solid dark color on white background, bold geometric shapes, clean silhouette, no gradients, no shadows, no 3d, no letters, no text, no words";

const body = {
  prompt: `${prompt}, ${TECHNICAL}`,
  model,
  ...(substyle ? { substyle } : {}),
  ...(model.includes("vector") ? {} : { style: "vector_illustration" }),
};

const res = await fetch("https://external.api.recraft.ai/v1/images/generations", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`Recraft API: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  console.error("Se l'errore riguarda i parametri (style/substyle/model), confrontare con https://www.recraft.ai/docs/api-reference/styles.md e aggiornare questo script: è il probe live a fare fede, non i docs indicizzati.");
  process.exit(1);
}
const json = await res.json();
const url = json?.data?.[0]?.url;
if (!url) { console.error(`response senza URL immagine: ${JSON.stringify(json).slice(0, 300)}`); process.exit(1); }

// download SUBITO (gli URL degli output scadono) e verifica che sia SVG vero
const dl = await fetch(url);
const svg = await dl.text();
if (!svg.trimStart().startsWith("<") || !svg.includes("<svg")) {
  console.error("l'output non è un SVG: controllare model/endpoint (serve la variante *_vector).");
  process.exit(1);
}
writeKit(svg, out, color);
