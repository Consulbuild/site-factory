// Parity check dev-only: validateCopyArtifact (editor) deve concordare con
// assemble-site.ts (pipeline) sugli stessi artifact. Baseline = il copy REALE
// di cavaliere + mutazioni sintetiche una-per-regola.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/parity-copy.ts
//
// Unica divergenza dichiarata: slot MANCANTE → per l'assembler --partial è
// tollerato (warning), per l'editor è errore (il testo d'oro finirebbe sul
// sito del cliente) → il confronto exit-code salta il caso "mancante".
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SITE_RENDERER, NODE_BIN, childEnv } from "../lib/paths.ts";
import { validateCopyArtifact } from "../lib/slots.ts";

const SRC = path.join(SITE_RENDERER, "out", "cavaliere-build-srls");
const BLUEPRINT = path.join(SITE_RENDERER, "blueprints", "conversione-locale-v1");
const ASSEMBLE = path.join(SITE_RENDERER, "scripts", "assemble-site.ts");

function assembleExit(copy: Record<string, unknown>): number {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-"));
  try {
    for (const f of ["intake.json", "palette.json"]) fs.copyFileSync(path.join(SRC, f), path.join(dir, f));
    fs.writeFileSync(path.join(dir, "copy.json"), JSON.stringify(copy));
    const res = spawnSync(NODE_BIN, ["--experimental-strip-types", ASSEMBLE, BLUEPRINT, dir, "--partial", "-o", path.join(dir, "site.json")], {
      cwd: SITE_RENDERER,
      env: childEnv(),
      encoding: "utf8",
    });
    return res.status ?? 1;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const base = JSON.parse(fs.readFileSync(path.join(SRC, "copy.json"), "utf8")) as Record<string, unknown>;

type Caso = { nome: string; mutate: (c: Record<string, unknown>) => void; skipAssembler?: boolean };
const casi: Caso[] = [
  { nome: "baseline cavaliere (valido)", mutate: () => {} },
  {
    nome: "sforo budget (hero title > 52)",
    mutate: (c) => (c["sections[1].props.title"] = "Questo titolo è volutamente troppo lungo per superare il budget di **cinquantadue** caratteri"),
  },
  {
    nome: "accent mancante su slot accentMarker",
    mutate: (c) => (c["sections[1].props.title"] = "Titolo senza marker accent"),
  },
  {
    nome: "accent su slot vietato (subtitle)",
    mutate: (c) => (c["sections[1].props.subtitle"] = "Sottotitolo con **marker vietato** qui"),
  },
  {
    nome: "sibling di lunghezza diversa (trust value vs label)",
    mutate: (c) => (c["sections[2].props.items[*].value"] = ["Solo", "Due"]),
  },
  {
    nome: "chiave fuori dagli slot copy",
    mutate: (c) => (c["sections[1].props.image"] = "hack.jpg"),
  },
  {
    nome: "foglia non-string (numero)",
    mutate: (c) => (c["sections[8].props.note"] = 42 as unknown as string),
  },
  {
    // Solo editor: --partial tollera, per noi è errore (testo d'oro sul sito).
    nome: "slot mancante (divergenza dichiarata)",
    mutate: (c) => delete c["sections[10].props.tagline"],
    skipAssembler: true,
  },
];

let falliti = 0;
for (const caso of casi) {
  const copy = structuredClone(base);
  caso.mutate(copy);
  const errsEditor = validateCopyArtifact(copy);
  const editorOk = errsEditor.length === 0;
  const expectOk = caso.nome.startsWith("baseline");
  let esito = editorOk === expectOk;
  let dettaglio = editorOk ? "editor: ok" : `editor: ${errsEditor[0]}`;

  if (!caso.skipAssembler) {
    const exit = assembleExit(copy);
    const assemblerOk = exit === 0;
    if (assemblerOk !== editorOk) {
      esito = false;
      dettaglio += ` — DISACCORDO con assembler (exit ${exit})`;
    } else {
      dettaglio += ` · assembler concorde (exit ${exit})`;
    }
  }
  if (!esito) falliti++;
  console.log(`${esito ? "PASS" : "FAIL"}  ${caso.nome}\n      ${dettaglio}`);
}

console.log(falliti ? `\n${falliti} casi FALLITI` : "\nParity OK: editor e assembler concordano");
process.exit(falliti ? 1 : 0);
