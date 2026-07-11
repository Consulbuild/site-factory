// Accettazione M3: per 20 hex casuali (seed fisso, riproducibile) il colore
// corretto da lib/hct.ts passa SEMPRE check-contrast.mjs — l'autorità WCAG
// della skill, non la matematica interna. Coppie realistiche della scheda
// Palette: fg/bianco a 4.5 (bottoni) e fg/bg-preset a 3 (accent, testo grande).
//
//   cd site-factory-editor && node --experimental-strip-types scripts/check-hct.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { REPO_ROOT, NODE_BIN, childEnv } from "../lib/paths.ts";
import { PRESETS, PRESET_KEYS } from "../lib/presets.ts";
import { fixTone } from "../lib/hct.ts";
import { Hct, argbFromHex } from "@material/material-color-utilities";

// PRNG deterministico (mulberry32): il check deve fallire solo per regressioni
const rng = ((seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
})(20260711);
const hexCasuale = () =>
  "#" + Array.from({ length: 6 }, () => "0123456789abcdef"[Math.floor(rng() * 16)]).join("");

const coppie: { name: string; fg: string; bg: string; large?: boolean }[] = [];
let derivaTintaMax = 0;
for (let i = 0; i < 20; i++) {
  const fg = hexCasuale();
  const preset = PRESET_KEYS[i % PRESET_KEYS.length];
  const casi = [
    { bg: "#ffffff", need: 4.5, large: false, name: `hex${i} su bianco` },
    { bg: PRESETS[preset].neutri.bg, need: 3, large: true, name: `hex${i} su bg ${preset}` },
  ];
  for (const c of casi) {
    const corretto = fixTone(fg, c.bg, c.need);
    if (!corretto) {
      console.error(`FALLITO: fixTone(${fg}, ${c.bg}, ${c.need}) = null`);
      process.exit(1);
    }
    const dHue = Math.abs(Hct.fromInt(argbFromHex(fg)).hue - Hct.fromInt(argbFromHex(corretto)).hue);
    derivaTintaMax = Math.max(derivaTintaMax, Math.min(dHue, 360 - dHue));
    coppie.push({ name: c.name, fg: corretto, bg: c.bg, large: c.large });
  }
}

// verdetto dell'autorità (stesso protocollo di lib/contrast.ts)
const CHECK = path.join(REPO_ROOT, ".claude", "skills", "palette-designer", "check-contrast.mjs");
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "check-hct-")), "coppie.json");
fs.writeFileSync(tmp, JSON.stringify(coppie));
const res = spawnSync(NODE_BIN, [CHECK, tmp], { env: childEnv(), encoding: "utf8" });
fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
const bocciate = res.stdout.split("\n").filter((l) => l.startsWith("FAIL"));
if (res.status !== 0 || bocciate.length) {
  console.error(`check-hct FALLITO — ${bocciate.length} coppie bocciate dall'autorità:\n${bocciate.join("\n")}`);
  process.exit(1);
}
console.log(
  `check-hct ok — ${coppie.length}/${coppie.length} coppie corrette passano check-contrast.mjs; deriva tinta max ${derivaTintaMax.toFixed(2)}°`,
);
