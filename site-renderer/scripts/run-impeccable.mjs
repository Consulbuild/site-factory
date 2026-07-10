#!/usr/bin/env node
// Gate L1: detector impeccable (regole anti-pattern deterministiche, zero LLM)
// sulla dist di anteprima, filtrato dalla whitelist ConsulBuild — le regole in
// conflitto DELIBERATO con lo standard (DESIGN.md), documentate una per una in
// factory/impeccable-whitelist.json. Voci con "soloPreset" valgono solo lì.
//
// Uso: node scripts/run-impeccable.mjs [preset ...] [--gate]
//   default: tutti i preset, exit 0 (report); --gate: exit 1 se restano finding.
// Prerequisito: `npm run build` già eseguito.

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DETECT = join(homedir(), ".claude/skills/impeccable/scripts/detect.mjs");
const WHITELIST = JSON.parse(
  readFileSync(join(ROOT, "..", "factory", "impeccable-whitelist.json"), "utf8"),
);

const argomenti = process.argv.slice(2);
const gate = argomenti.includes("--gate");
const scelti = argomenti.filter((a) => !a.startsWith("--"));
const presets = scelti.length
  ? scelti
  : ["meridian", "atelier", "nova", "canon", "terra", "vita"];

const residui = [];
for (const preset of presets) {
  const file = join(ROOT, "dist", "anteprima", preset, "index.html");
  if (!existsSync(file)) {
    console.error(`manca ${file} — esegui prima npm run build`);
    process.exit(2);
  }
  const r = spawnSync("node", [DETECT, "--json", file], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  let findings;
  try {
    findings = JSON.parse(r.stdout);
  } catch {
    console.error(`output detector non parsabile per ${preset}:\n${r.stdout}\n${r.stderr}`);
    process.exit(2);
  }
  const filtrati = findings.filter((f) => {
    const voce = WHITELIST.ignora.find(
      (w) => w.regola === f.antipattern && (!w.soloPreset || w.soloPreset.includes(preset)),
    );
    return !voce;
  });
  residui.push(...filtrati.map((f) => ({ preset, ...f })));
  console.error(
    `${preset}: ${findings.length} finding, ${findings.length - filtrati.length} whitelistati, ${filtrati.length} residui`,
  );
}

console.log(JSON.stringify(residui, null, 2));
if (gate && residui.length) process.exit(1);
