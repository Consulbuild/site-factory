// Banco di allenamento del logo-critic: per ogni item oro con `brief.json` e ancora
// senza varianti genera VARIANTI_PER_ROUND loghi con GPT Image — STESSO prompt della
// pipeline (componiPromptLogo, v9b + riga colori) e stesso script — più il foglio di
// contatto. Poi Mattia indica la sua variante → `scelta_umana` in atteso.json →
// calibrate-logo-critic.ts misura se il critico concorda.
// Ogni immagine costa (≈0,08 $): al massimo 9 generazioni per run (limite di Mattia).
//
//   cd site-factory-editor && node --experimental-strip-types scripts/genera-logo-gold.ts [--only <id>]
//
// brief.json: { "brief": {nome, mestiere_en, citta, regione, alt},
//               "palette": {"brand.preset", "brand.palette.primary", "brand.palette.accent"} }
// Lascia `generazione.json` (prompt, usage e costo per variante) accanto ad atteso.json.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { componiPromptLogo, contattoArgs, generaArgs, parseEsito, LOGO_MODEL, LOGO_QUALITY, LOGO_SIZE, VARIANTI_PER_ROUND } from "../lib/logo.ts";
import type { LogoBrief, PaletteArtifact } from "../lib/schemas.ts";

const EDITOR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RENDERER = path.join(EDITOR, "..", "site-renderer");
const GOLD = path.join(EDITOR, "scripts", "fixtures", "logo-gold");
const NODE_BIN = path.join(homedir(), ".local", "bin", "node");
const MAX_GENERAZIONI = 9;

const argv = process.argv.slice(2);
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;

type BriefFile = { brief: LogoBrief; palette: PaletteArtifact };
const items = fs
  .readdirSync(GOLD, { withFileTypes: true })
  .filter((d) => d.isDirectory() && (!ONLY || d.name === ONLY))
  .map((d) => ({ id: d.name, dir: path.join(GOLD, d.name) }))
  .filter((it) => fs.existsSync(path.join(it.dir, "brief.json")) && !fs.existsSync(path.join(it.dir, "logo", "mark-1.png")));

if (!items.length) {
  console.log("niente da generare: ogni item con brief.json ha già logo/mark-1.png");
  process.exit(0);
}
if (items.length * VARIANTI_PER_ROUND > MAX_GENERAZIONI) {
  console.error(`${items.length} item × ${VARIANTI_PER_ROUND} varianti supera il tetto di ${MAX_GENERAZIONI} generazioni per run: usa --only <id>`);
  process.exit(2);
}

let costoTotale = 0;
for (const it of items) {
  const { brief, palette } = JSON.parse(fs.readFileSync(path.join(it.dir, "brief.json"), "utf8")) as BriefFile;
  const prompt = componiPromptLogo(brief, palette);
  const logoDir = path.join(it.dir, "logo");
  fs.mkdirSync(logoDir, { recursive: true });
  const varianti: Record<string, unknown>[] = [];
  for (let n = 1; n <= VARIANTI_PER_ROUND; n++) {
    const out = path.join(logoDir, `mark-${n}.png`);
    const r = spawnSync(NODE_BIN, generaArgs(prompt, out), { cwd: RENDERER, encoding: "utf8" });
    const esito = parseEsito((r.stdout ?? "").split("\n"));
    if (r.status !== 0 || !esito) {
      console.error(`${it.id} mark-${n}: generazione fallita — ${(r.stderr || r.stdout).slice(-400)}`);
      process.exit(1);
    }
    costoTotale += Number(esito.costo_usd ?? 0);
    varianti.push({ file: `logo/mark-${n}.png`, usage: esito.usage, costo_usd: esito.costo_usd, metriche: esito.metriche });
    console.log(`${it.id} mark-${n}: ok · ${esito.costo_usd} $`);
  }
  const files = varianti.map((v) => path.join(it.dir, v.file as string));
  const attesoFile = path.join(it.dir, "atteso.json");
  const bg = fs.existsSync(attesoFile) ? ((JSON.parse(fs.readFileSync(attesoFile, "utf8")) as { bg?: string }).bg ?? "#ffffff") : "#ffffff";
  const foglio = spawnSync(NODE_BIN, contattoArgs(path.join(logoDir, "contatto.png"), files, bg), { cwd: RENDERER, encoding: "utf8" });
  if (foglio.status !== 0) console.error(`${it.id}: foglio di contatto fallito — ${(foglio.stderr || foglio.stdout).slice(-300)}`);
  fs.writeFileSync(
    path.join(it.dir, "generazione.json"),
    JSON.stringify({ data: new Date().toISOString().slice(0, 10), model: LOGO_MODEL, size: LOGO_SIZE, quality: LOGO_QUALITY, prompt, varianti }, null, 2) + "\n",
  );
}
console.log(`\ncosto stimato della run: ${costoTotale.toFixed(3)} $`);
