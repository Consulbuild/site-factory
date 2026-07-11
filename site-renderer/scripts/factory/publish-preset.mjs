#!/usr/bin/env node
// Pubblicazione di un candidato approvato all'audit (M7): il candidato entra
// nella libreria come preset versionato e TUTTO il derivato si rigenera dallo
// stesso toolchain (css, gen.ts, manifest, editor, tabella skill, font,
// baseline VRT delle sole celle nuove). Idempotente: rifiuta un id già
// pubblicato (il version bump è un'operazione futura, non un overwrite).
// A pubblicazione avvenuta si eliminano gli screenshot dei riferimenti
// (TDM: "solo il tempo necessario") — token estratti e log restano.
//
// Uso: node scripts/factory/publish-preset.mjs <cartella-run>
// Exit: 0 pubblicato · 1 guardia/verifica fallita · 2 errore d'uso

import { readFileSync, writeFileSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PRESETS_DIR = join(ROOT, "presets");
const runDir = process.argv[2];
if (!runDir || !existsSync(join(runDir, "run.json"))) {
  console.error("uso: publish-preset.mjs <cartella-run>");
  process.exit(2);
}
const leggi = (f) => JSON.parse(readFileSync(f, "utf8"));

// ---------- guardie ----------
const run = leggi(join(runDir, "run.json"));
const auditFile = join(runDir, "audit.json");
if (!existsSync(auditFile)) {
  console.error("audit.json assente: la pubblicazione richiede l'audit umano");
  process.exit(1);
}
const audit = leggi(auditFile);
if (audit.decisione !== "approva") {
  console.error(`audit: decisione "${audit.decisione}" — si pubblica solo su "approva"`);
  process.exit(1);
}
const meta = audit.meta;
const id = meta?.id;
if (!id || !/^[a-z][a-z0-9]*$/.test(id)) {
  console.error(`id preset non valido: "${id}" (atteso slug minuscolo semplice, es. "ferro")`);
  process.exit(1);
}
if (existsSync(join(PRESETS_DIR, `${id}.tokens.json`))) {
  console.error(`preset "${id}" già pubblicato: la ripubblicazione richiede un version bump esplicito (non implementato di proposito)`);
  process.exit(1);
}
const candidato = leggi(join(runDir, "candidate.tokens.json"));

// ---------- fonts.googleCss del preset (famiglie del candidato, pesi della whitelist) ----------
const whitelist = leggi(join(PRESETS_DIR, "font-whitelist.json")).famiglie;
const famiglie = [
  ...new Set(
    ["brand-font-heading", "brand-font-body", "brand-font-mono", "brand-font-eyebrow"]
      .map((k) => candidato[k]?.$value)
      .filter((f) => typeof f === "string" && whitelist[f]),
  ),
];
const googleCss =
  "https://fonts.googleapis.com/css2?" +
  famiglie.map((f) => `family=${f.replaceAll(" ", "+")}:wght@${whitelist[f].pesi.join(";")}`).join("&") +
  "&display=swap";

// ---------- scrittura preset + meta + resolver ----------
writeFileSync(join(PRESETS_DIR, `${id}.tokens.json`), JSON.stringify(candidato, null, 2) + "\n");
const oggi = new Date().toISOString().slice(0, 10);
const metaPreset = {
  id,
  version: "1.0.0",
  stato: "attivo",
  aaker: meta.aaker,
  settoriConsigliati: meta.settoriConsigliati ?? [],
  antiPatterns: meta.antiPatterns ?? [],
  requisitiContenuto: meta.requisitiContenuto ?? {},
  vincoliCombinazione: meta.vincoliCombinazione ?? {},
  photographySpec: meta.photographySpec ?? {},
  fluxStyleFragment: meta.fluxStyleFragment ?? {},
  fonts: { googleCss },
  editor: meta.editor,
  provenance: { runId: run.runId, references: run.references, auditRef: `factory/runs/${run.runId}/audit.json` },
  changelog: [{ version: "1.0.0", data: oggi, nota: `pubblicato dalla run ${run.runId} (audit: ${audit.decisoDa})` }],
};
writeFileSync(join(PRESETS_DIR, `${id}.meta.json`), JSON.stringify(metaPreset, null, 2) + "\n");
const resolver = leggi(join(PRESETS_DIR, "resolver.json"));
resolver.modifiers.preset.contexts[id] = [{ $ref: `${id}.tokens.json` }];
writeFileSync(join(PRESETS_DIR, "resolver.json"), JSON.stringify(resolver, null, 2) + "\n");
console.log(`preset "${id}" scritto (tokens+meta+resolver)`);

// ---------- rigenerazione completa + build + VRT delle celle nuove ----------
const fontsGenPrima = existsSync(join(PRESETS_DIR, "fonts.gen.json"))
  ? readFileSync(join(PRESETS_DIR, "fonts.gen.json"), "utf8")
  : null;
const passo = (nome, bin, args, timeout = 6 * 60 * 1000) => {
  console.log(`→ ${nome}`);
  const res = spawnSync(bin, args, { cwd: ROOT, encoding: "utf8", timeout, env: process.env });
  if (res.status !== 0) {
    console.error(`${nome} FALLITO:\n${(res.stderr || res.stdout).slice(-1200)}`);
    // rollback COMPLETO dei file scritti/rigenerati: pubblicazione tutta-o-niente
    rmSync(join(PRESETS_DIR, `${id}.tokens.json`), { force: true });
    rmSync(join(PRESETS_DIR, `${id}.meta.json`), { force: true });
    delete resolver.modifiers.preset.contexts[id];
    writeFileSync(join(PRESETS_DIR, "resolver.json"), JSON.stringify(resolver, null, 2) + "\n");
    if (fontsGenPrima) writeFileSync(join(PRESETS_DIR, "fonts.gen.json"), fontsGenPrima);
    spawnSync("node", [join(ROOT, "scripts", "build-presets.mjs")], { cwd: ROOT, env: process.env });
    process.exit(1);
  }
};
passo("fetch-fonts (famiglie/pesi eventualmente nuovi)", "node", [join(ROOT, "scripts", "fetch-fonts.mjs")]);
passo("build:presets (css, gen.ts, manifest, editor, skill)", "node", [join(ROOT, "scripts", "build-presets.mjs")]);
passo("baseline VRT delle celle nuove", "npx", [
  "playwright", "test", "--grep", "@visual",
  "--project", `${id}-390`, "--project", `${id}-1280`,
  "--update-snapshots",
], 10 * 60 * 1000);
passo("verifica VRT delle celle nuove", "npx", [
  "playwright", "test", "--grep", "@visual",
  "--project", `${id}-390`, "--project", `${id}-1280`,
], 10 * 60 * 1000);

// ---------- igiene TDM + stato run ----------
for (const ref of run.references) {
  for (const w of [390, 1280]) {
    rmSync(join(ROOT, "..", "factory", "references", ref, `screenshot-${w}.png`), { force: true });
  }
}
console.log("screenshot dei riferimenti eliminati (TDM: solo il tempo necessario)");
run.stato = "pubblicata";
writeFileSync(join(runDir, "run.json"), JSON.stringify(run, null, 2) + "\n");
console.log(`pubblicato: "${id}"@1.0.0 — libreria rigenerata, VRT esteso e verde sulle celle nuove`);
