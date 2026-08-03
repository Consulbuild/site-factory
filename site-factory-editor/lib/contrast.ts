import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { REPO_ROOT, NODE_BIN, childEnv } from "./paths";
import { PRESETS, type PresetKey } from "./presets";

// Gate contrasto WCAG AA della palette. Il calcolo NON è reimplementato:
// si esegue lo stesso script della skill (unica fonte del gate, condivisa
// con l'agente) e si parsa lo stdout, che è un formato nostro e stabile.
const CHECK_CONTRAST = path.join(REPO_ROOT, ".claude", "skills", "palette-designer", "check-contrast.mjs");

export interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
  /** Soglia AA applicata (3 per testo grande, 4.5 altrimenti). */
  need: number;
  ratio: number;
  pass: boolean;
}

export interface ContrastResult {
  ok: boolean;
  pairs: ContrastPair[];
  /** Errore di esecuzione dello script (non un FAIL di contrasto). */
  errore?: string;
}

/**
 * Le coppie obbligatorie della skill: primary/#fff ≥ 4.5 (testo bianco dei
 * bottoni), accent/bg(preset) ≥ 3 (parola-accent, testo grande) — su nova
 * il bg è quello scuro — e bianco/accent ≥ 4.5: sulle bande .section-dark
 * il guardrail del renderer (global.css) passa le CTA primarie all'accent
 * tenendo il testo bianco, quindi anche l'accent deve reggere il bianco.
 */
export function pairsForPalette(preset: PresetKey, primary: string, accent: string) {
  const bg = PRESETS[preset].neutri.bg;
  return [
    { name: "primary / bianco (bottoni)", fg: primary, bg: "#ffffff" },
    { name: `accent / sfondo ${preset}`, fg: accent, bg, large: true },
    { name: "bianco / accent (CTA su bande scure)", fg: "#ffffff", bg: accent },
  ];
}

/** Esegue check-contrast.mjs sulle coppie obbligatorie e parsa i ratio. */
export function checkPalette(preset: PresetKey, primary: string, accent: string): ContrastResult {
  const pairs = pairsForPalette(preset, primary, accent);
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "palette-gate-")), "coppie.json");
  try {
    fs.writeFileSync(tmp, JSON.stringify(pairs));
    // Path con spazio nel repo: sempre spawn(bin, [args]), mai stringhe shell.
    const res = spawnSync(NODE_BIN, [CHECK_CONTRAST, tmp], { env: childEnv(), encoding: "utf8" });
    if (res.error || res.status === 2 || typeof res.status !== "number") {
      return { ok: false, pairs: [], errore: `check-contrast non eseguibile: ${res.error?.message ?? res.stderr}` };
    }
    // Una riga per coppia, nell'ordine: "PASS  4.72:1  (soglia 4.5)  nome …"
    const lines = res.stdout.split("\n").filter((l) => /^(PASS|FAIL)\s/.test(l));
    if (lines.length !== pairs.length) {
      return { ok: false, pairs: [], errore: `output inatteso da check-contrast:\n${res.stdout}` };
    }
    const parsed: ContrastPair[] = pairs.map((p, i) => {
      const m = lines[i].match(/^(PASS|FAIL)\s+([\d.]+):1\s+\(soglia ([\d.]+)\)/);
      return {
        name: p.name,
        fg: p.fg,
        bg: p.bg,
        need: m ? Number(m[3]) : p.large ? 3 : 4.5,
        ratio: m ? Number(m[2]) : 0,
        pass: m?.[1] === "PASS",
      };
    });
    return { ok: res.status === 0, pairs: parsed };
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
}
