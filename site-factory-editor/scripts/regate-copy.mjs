#!/usr/bin/env node
// Riesegue il gate anti-slop (check-slop.mjs) su TUTTI i copy.json in
// site-renderer/out/ con gli stessi argomenti della pipeline (lib/slop.ts:
// azienda dal brief, città/area dal contesto, martello dal contesto).
// Solo REPORT: non tocca client.json — serve a vedere quali clienti storici
// (pre-gate) vanno rigenerati col flusso nuovo. Exit 1 se almeno un FAIL.
// Uso (da site-factory-editor/): node scripts/regate-copy.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(REPO_ROOT, "site-renderer", "out");
const CHECK_SLOP = join(REPO_ROOT, ".claude", "skills", "copy-critic", "scripts", "check-slop.mjs");
const leggi = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

let falliti = 0;
for (const slug of readdirSync(OUT).filter((d) => existsSync(join(OUT, d, "copy.json")))) {
  const brief = leggi(join(OUT, slug, "brief.json"));
  const contesto = leggi(join(OUT, slug, "contesto.json"));
  const args = [CHECK_SLOP, join(OUT, slug, "copy.json"), "--json"];
  for (const c of [brief?.azienda, contesto?.zona?.sede, contesto?.zona?.area_intervento])
    if (typeof c === "string" && c.trim()) args.push("--consenti", c);
  if (contesto?.promessa_martello) args.push("--martello", contesto.promessa_martello);
  const res = spawnSync(process.execPath, args, { encoding: "utf8" });
  const report = (() => { try { return JSON.parse(res.stdout); } catch { return null; } })();
  if (!report) { console.log(`?? ${slug}: check-slop non eseguibile — ${res.stderr}`); falliti++; continue; }
  if (res.status === 0) console.log(`PASS ${slug} (${report.avvisi.length} avvisi)`);
  else {
    falliti++;
    console.log(`FAIL ${slug} — ${report.bloccanti.length} bloccanti:`);
    for (const b of report.bloccanti) console.log(`  ✗ [${b.tipo}] "${b.frase}" → ${b.slot}`);
  }
}
process.exit(falliti ? 1 : 0);
