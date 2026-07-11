#!/usr/bin/env node
// Gate "zero invenzioni" (M6) — valida un preset candidato prodotto dal
// designer AI: ogni valore deve essere TRACCIABILE (assunzione modello n.2 del
// piano: il designer inventa valori plausibili senza evidenza). Deterministico:
//  1. forma — JSON valido, ogni token con $type/$value, shadow SEMPRE array
//     di layer (guardia identica a build-presets.mjs: il resolver Terrazzo
//     ignora in silenzio l'override oggetto su base array);
//  2. universo — chiavi ⊆ meridian.tokens.json (il resolver rifiuta token
//     assenti dal base) + chiavi obbligatorie del preset minimo;
//  3. font — famiglie ∈ presets/font-whitelist.json, pesi w-* ∈ unione dei
//     pesi delle famiglie scelte, corpoTesto=true per il body;
//  4. colori — ogni hex deve avere una voce in motivazioni.json: evidenza
//     verificata VERBATIM (case-insensitive) nell'extraction.tokens.json del
//     riferimento citato (+ derivazione dichiarata se l'hex differisce), oppure
//     derivazioneDa un altro token del candidato. Hex senza voce = inventato.
//     (I colori interni ai layer shadow sono strutturali: non richiedono voce.)
//  5. stringhe raw — solo var(--…) dell'universo, numeri, unità e parole
//     chiave CSS note; gli hex dentro le raw seguono la stessa regola dei colori;
//  6. step-display/step-4/step-5 — formato clamp(Xrem, Yrem + Zvw, Wrem) con
//     X ≤ 3rem (minimi tarati a 390px, Decision Log: mai alzarli senza test).
//
// Uso: node scripts/factory/validate-candidate.mjs <candidate.tokens.json> \
//        <motivazioni.json> <cartella-run> --refs <dir-riferimento> [--refs …]
//      Ogni <dir-riferimento> contiene extraction.tokens.json ({dtcg, raw},
//      da extract-tokens.mjs); l'id citato in evidenza[].ref = basename della dir.
// Scrive <cartella-run>/gates/validate.json {esito, violazioni}.
// Exit: 0 ok · 1 violazioni · 2 errore d'uso

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, resolve } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const errore = (msg) => {
  console.error(`errore: ${msg}\nuso: validate-candidate.mjs <candidate.tokens.json> <motivazioni.json> <cartella-run> --refs <dir> [--refs <dir> …]`);
  process.exit(2);
};

// ---------- CLI ----------
const posizionali = [];
const dirRefs = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--refs") {
    if (!args[i + 1]) errore("--refs senza cartella");
    dirRefs.push(args[++i]);
  } else posizionali.push(args[i]);
}
const [fileCandidato, fileMotivazioni, cartellaRun] = posizionali;
if (!fileCandidato || !fileMotivazioni || !cartellaRun) errore("argomenti mancanti");
for (const f of [fileCandidato, fileMotivazioni]) if (!existsSync(f)) errore(`file non trovato: ${f}`);

// Riferimenti: id = basename della dir, testo = extraction.tokens.json verbatim
// (minuscolo: la ricerca dell'evidenza è case-insensitive).
const riferimenti = new Map();
for (const dir of dirRefs) {
  const file = join(dir, "extraction.tokens.json");
  if (!existsSync(file)) errore(`riferimento senza extraction.tokens.json: ${dir}`);
  riferimenti.set(basename(resolve(dir)), { testo: readFileSync(file, "utf8").toLowerCase() });
}

// ---------- input e universo ----------
const universo = JSON.parse(readFileSync(join(ROOT, "presets", "meridian.tokens.json"), "utf8"));
const whitelist = JSON.parse(readFileSync(join(ROOT, "presets", "font-whitelist.json"), "utf8"));

const violazioni = [];
const boccia = (token, problema, dettaglio) => violazioni.push({ token, problema, dettaglio });

let candidato = null;
let motivazioni = {};
try {
  candidato = JSON.parse(readFileSync(fileCandidato, "utf8"));
  if (!candidato || typeof candidato !== "object" || Array.isArray(candidato)) throw new Error("atteso un oggetto flat di token");
} catch (e) {
  candidato = null;
  boccia("(candidato)", "JSON non valido", e.message);
}
try {
  motivazioni = JSON.parse(readFileSync(fileMotivazioni, "utf8"));
  if (!motivazioni || typeof motivazioni !== "object" || Array.isArray(motivazioni)) throw new Error("atteso un oggetto { token-id: voce }");
} catch (e) {
  motivazioni = {};
  boccia("(motivazioni)", "JSON non valido", e.message);
}

// ---------- helper colori ----------
// #abc → #aabbcc per confrontare forme corte e lunghe dello stesso colore
const normHex = (h) => {
  h = h.toLowerCase();
  return /^#[0-9a-f]{3,4}$/.test(h) ? "#" + [...h.slice(1)].map((c) => c + c).join("") : h;
};

// Regola 4 applicata a un hex (di un token color o dentro una stringa raw):
// la voce in motivazioni deve tracciarlo a un riferimento o a un altro token.
function verificaHex(tokenId, hex) {
  const voce = motivazioni[tokenId];
  if (!voce || typeof voce !== "object") {
    return boccia(tokenId, "colore inventato", `hex ${hex} senza voce in motivazioni.json`);
  }
  if (voce.derivazioneDa !== undefined) {
    if (typeof voce.derivazioneDa !== "string" || voce.derivazioneDa === tokenId || !(voce.derivazioneDa in (candidato ?? {})))
      boccia(tokenId, "derivazione non tracciabile", `derivazioneDa ${JSON.stringify(voce.derivazioneDa)} non è un ALTRO token del candidato`);
    return;
  }
  const evidenza = Array.isArray(voce.evidenza) ? voce.evidenza : [];
  if (!evidenza.length) {
    return boccia(tokenId, "colore inventato", `hex ${hex}: voce senza evidenza né derivazioneDa`);
  }
  const osservati = [];
  for (const e of evidenza) {
    const oss = String(e?.valoreOsservato ?? "");
    const rif = riferimenti.get(String(e?.ref ?? ""));
    if (!rif) {
      boccia(tokenId, "riferimento sconosciuto", `evidenza cita ref ${JSON.stringify(e?.ref)} non passato con --refs`);
      continue;
    }
    if (!oss || !rif.testo.includes(oss.toLowerCase())) {
      boccia(tokenId, "evidenza non trovata", `"${oss}" non compare verbatim in ${e.ref}/extraction.tokens.json`);
      continue;
    }
    osservati.push(normHex(oss));
  }
  if (!osservati.length) return; // già bocciato sopra, evidenza tutta invalida
  const derivato = typeof voce.derivazione === "string" && voce.derivazione.trim().length > 0;
  if (!osservati.includes(normHex(hex)) && !derivato)
    boccia(tokenId, "colore inventato", `hex ${hex} ≠ valori osservati (${osservati.join(", ")}) e nessuna derivazione dichiarata`);
}

// ---------- verifiche (solo se il candidato è parsabile) ----------
if (candidato) {
  const tokens = Object.entries(candidato);
  const isRaw = (t) => t?.$extensions?.["com.consulbuild"]?.raw === true;

  // 1. forma: $type/$value ovunque, shadow sempre array di layer
  for (const [id, t] of tokens) {
    if (!t || typeof t !== "object" || Array.isArray(t) || !("$type" in t) || !("$value" in t)) {
      boccia(id, "token malformato", "ogni token deve essere un oggetto con $type e $value");
    } else if (t.$type === "shadow" && !Array.isArray(t.$value)) {
      boccia(id, "shadow non array", "il $value delle shadow deve essere un array di layer (il resolver Terrazzo ignora in silenzio l'override oggetto)");
    }
  }

  // 2. universo + chiavi obbligatorie
  const OBBLIGATORIE = [
    "brand-font-heading", "brand-font-body", "brand-bg", "brand-ink",
    "brand-surface", "brand-muted", "brand-inverse-bg", "brand-inverse-ink",
    "brand-radius-card", "brand-shadow-card", "step-display", "w-display", "heading-case",
  ];
  for (const [id] of tokens)
    if (!(id in universo)) boccia(id, "chiave fuori dall'universo", `"${id}" non esiste in meridian.tokens.json: il resolver rifiuta token assenti dal base`);
  for (const id of OBBLIGATORIE)
    if (!(id in candidato)) boccia(id, "chiave obbligatoria assente", `"${id}" è parte del preset minimo e manca nel candidato`);

  // 3. font: famiglie in whitelist, corpoTesto per il body, pesi w-* ammessi
  const famigliaDi = (id) => {
    let v = candidato[id]?.$value;
    if (Array.isArray(v)) v = v[0];
    // alias DTCG "{altro-token}": risolto nel candidato, poi nell'universo
    for (let salti = 0; typeof v === "string" && /^\{.+\}$/.test(v) && salti < 4; salti++) {
      v = (candidato[v.slice(1, -1)] ?? universo[v.slice(1, -1)])?.$value;
      if (Array.isArray(v)) v = v[0];
    }
    return typeof v === "string" ? v : null;
  };
  const famiglieScelte = new Set();
  for (const id of ["brand-font-heading", "brand-font-body", "brand-font-mono"]) {
    if (!(id in candidato)) continue;
    const fam = famigliaDi(id);
    if (!fam || !(fam in whitelist.famiglie)) {
      boccia(id, "famiglia fuori whitelist", `${JSON.stringify(fam ?? candidato[id]?.$value)} non è tra le famiglie curate: ${Object.keys(whitelist.famiglie).join(", ")}`);
      continue;
    }
    famiglieScelte.add(fam);
    if (id === "brand-font-body" && whitelist.famiglie[fam].corpoTesto !== true)
      boccia(id, "famiglia non adatta al corpo testo", `"${fam}" ha corpoTesto=false nella whitelist: non leggibile su paragrafi lunghi`);
  }
  // ponytail: pesi ammessi = unione dei pesi delle famiglie scelte (heading+body+mono),
  // per-token per-famiglia se l'unione lasciasse passare pesi sbagliati.
  const pesiAmmessi = new Set([...famiglieScelte].flatMap((f) => whitelist.famiglie[f].pesi));
  for (const [id, t] of tokens) {
    if (!id.startsWith("w-")) continue;
    const peso = Number(t?.$value);
    if (famiglieScelte.size && !pesiAmmessi.has(peso))
      boccia(id, "peso non disponibile", `${JSON.stringify(t?.$value)} ∉ pesi delle famiglie scelte {${[...pesiAmmessi].sort((a, b) => a - b).join(", ")}}`);
  }

  // 4. colori: ogni hex tracciabile via motivazioni.json
  for (const [id, t] of tokens) {
    if (t?.$type !== "color") continue;
    const hex = t?.$value?.hex;
    if (typeof hex !== "string" || !/^#[0-9a-f]{6,8}$/i.test(hex)) {
      boccia(id, "colore senza hex", "il $value di un color deve avere il campo hex (#rrggbb) per la tracciabilità");
      continue;
    }
    verificaHex(id, hex);
  }

  // 5. stringhe raw: solo var() dell'universo, numeri/unità, keyword CSS note;
  //    hex dentro le raw = stessa regola dei colori (punto 4)
  for (const [id, t] of tokens) {
    if (t?.$type !== "string" || !isRaw(t) || typeof t.$value !== "string") continue;
    const s = t.$value;
    for (const m of s.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) verificaHex(id, m[0]);
    for (const m of s.matchAll(/var\(\s*--([a-zA-Z0-9-]+)\s*\)/g)) {
      const nome = m[1] === "step--1" ? "step-n1" : m[1]; // rename di build-presets
      if (!(nome in universo)) boccia(id, "var fuori dall'universo", `var(--${m[1]}) non corrisponde a nessun token di meridian`);
    }
    const residuo = s
      .replace(/var\(\s*--[a-zA-Z0-9-]+\s*\)/g, " ")
      .replace(/#[0-9a-fA-F]{3,8}\b/g, " ")
      .replace(/\b(color-mix|in|oklab|srgb|clamp|transparent|none|uppercase)\b/gi, " ")
      .replace(/\d*\.?\d+(rem|em|px|vw|ms|%)?/g, " ")
      .replace(/[(),+\-*/\s]+/g, "");
    if (residuo) boccia(id, "stringa raw con contenuto non ammesso", `residuo non riconosciuto "${residuo}" in ${JSON.stringify(s)}`);
  }

  // 6. scale fluide: clamp(Xrem, Yrem + Zvw, Wrem) con minimo X ≤ 3rem
  const CLAMP = /^clamp\(\s*(\d*\.?\d+)rem\s*,\s*\d*\.?\d+rem\s*\+\s*\d*\.?\d+vw\s*,\s*\d*\.?\d+rem\s*\)$/;
  for (const id of ["step-display", "step-4", "step-5"]) {
    const t = candidato[id];
    if (!t) continue;
    const m = typeof t.$value === "string" ? t.$value.match(CLAMP) : null;
    if (!m) boccia(id, "formato clamp non valido", `atteso clamp(Xrem, Yrem + Zvw, Wrem), trovato ${JSON.stringify(t.$value)}`);
    else if (Number(m[1]) > 3) boccia(id, "minimo tipografico troppo alto", `${m[1]}rem > 3rem: minimi tarati su parole italiane lunghe a 390px — mai alzarli senza test`);
  }

  // contratto motivazioni: motivo non vuoto per ogni voce-token presente
  // («posizionamento» è il blocco di metadati della corsia, non un token)
  for (const [id, voce] of Object.entries(motivazioni)) {
    if (id === "posizionamento") continue;
    if (!voce || typeof voce !== "object" || typeof voce.motivo !== "string" || !voce.motivo.trim())
      boccia(id, "motivo assente", "ogni voce di motivazioni.json deve avere un campo motivo (stringa non vuota)");
  }
}

// ---------- report ----------
const report = { esito: violazioni.length ? "violazioni" : "ok", violazioni };
mkdirSync(join(cartellaRun, "gates"), { recursive: true });
writeFileSync(join(cartellaRun, "gates", "validate.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
process.exit(violazioni.length ? 1 : 0);
