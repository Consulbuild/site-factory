#!/usr/bin/env node
// Guardrail perimetro-per-task (vedi CLAUDE.md, regola 8).
// Attivo SOLO se .claude/scope.json esiste con "perimetro" non vuoto: blocca
// Edit/Write fuori dal perimetro dichiarato nel piano approvato. Inerte
// altrimenti (zero attrito sui task senza piano). Vale anche per i subagent:
// gli hook PreToolUse girano pure nelle loro tool call.
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const scopeFile = resolve(root, ".claude/scope.json");

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const filePath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
if (!filePath || !existsSync(scopeFile)) process.exit(0);

let scope = {};
try {
  scope = JSON.parse(readFileSync(scopeFile, "utf8")) ?? {};
} catch {
  process.exit(0); // scope illeggibile → non blocco (guardrail anti-svista, non gabbia)
}
const perimetro = Array.isArray(scope.perimetro) ? scope.perimetro : [];
if (perimetro.length === 0) process.exit(0);

const norm = (p) => p.replace(/\\/g, "/").replace(/^\.\//, "");
const target = norm(relative(root, resolve(root, filePath)));

// Fuori repo (scratchpad, /tmp…): non è competenza di questo guard.
if (target.startsWith("..")) process.exit(0);
// Cartelle DATI scritte dai run `claude -p` della fabbrica (cwd = root del repo,
// run-step.ts): esenti, così un run concorrente non viene mai bloccato da un
// task dev. ponytail: prefissi hardcoded; se la fabbrica scriverà altrove, aggiungerli.
const DATI_FABBRICA = ["out/", "site-renderer/out/", "factory/runs/", "factory/references/"];
if (DATI_FABBRICA.some((d) => target.startsWith(d))) process.exit(0);
// Aggiornare scope.json è l'atto ESPLICITO (visibile a Mattia) di allargare il perimetro.
if (target === ".claude/scope.json") process.exit(0);

const dentro = perimetro.some((raw) => {
  const p = norm(String(raw));
  if (p.endsWith("/**")) return target.startsWith(p.slice(0, -2)); // "dir/**" → prefisso "dir/"
  return target === p;
});
if (dentro) process.exit(0);

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        `FUORI PERIMETRO: «${target}» non è tra i file del task «${scope.task ?? "?"}» ` +
        "(.claude/scope.json). Se è una svista, torna al piano. Se il file serve davvero: " +
        "fermati, spiega a Mattia perché, e SOLO dopo il suo ok aggiungilo a scope.json e riprova.",
    },
  }),
);
