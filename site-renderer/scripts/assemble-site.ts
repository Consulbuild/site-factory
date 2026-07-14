// assemble-site.ts — l'assembler deterministico della pipeline (blueprint + artifact → site.json).
// Fonde gli output degli agenti (artifact JSON, mappa path→valore) nello scheletro del
// blueprint rispettando slots.json: rifiuta scritture fuori slot o dell'agente sbagliato,
// applica i constraint per-slot (maxChars/hex/accentMarker) e le dipendenze (dependsOn),
// poi valida il risultato con parseSiteConfig (Zod). NON è un agente: nessuna AI qui.
//
// Uso:
//   node --experimental-strip-types scripts/assemble-site.ts <dir-blueprint> <dir-artifact> [-o out/site.json] [--partial]
//
//   <dir-blueprint>  cartella con blueprint.json + slots.json (es. blueprints/conversione-locale-v1)
//   <dir-artifact>   cartella con un file <agente>.json per ogni voce di `pipeline` in slots.json
//                    (es. intake.json, palette.json, copy.json, images.json)
//   --partial        consente artifact mancanti (run per-checkpoint); gli slot non riempiti
//                    restano ai valori d'oro del blueprint e vengono elencati come warning.
//   --foto-reali <n|dir>  quante foto reali ha fornito il cliente (numero, o cartella da
//                    contare). Sotto 4 → drop POST-merge della Gallery (regola 6 del README:
//                    la gallery non si genera MAI) + rimozione della voce nav collegata.
//   --lavori <manifest.json>  manifest [{file,alt,caption}] delle foto reali caricate
//                    dall'operatore: popola DIRETTAMENTE sections[4].props.images (src =
//                    /media/<slug>/<file>) e ne usa il numero per il drop. Vince su --foto-reali.
//
// Formato artifact: { "<path-slot>": valore, ... } con i path ESATTI di slots.json.
// Per i path con wildcard `[*]` il valore è un array (annidato per wildcard multiple:
// "items[*].bullets[*]" → array di array). La lunghezza può differire da quella del
// blueprint: l'array target viene ridimensionato (taglio, o clone dell'ultimo elemento),
// ma tutti gli slot che toccano lo stesso array devono concordare sulla lunghezza.
// Exit 0 se valido; 1 su violazione slot/constraint o Zod; 2 su errore d'uso.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { parseSiteConfig } from "../src/lib/schema.ts";

type Slot = {
  path: string;
  agent: string;
  constraints?: { maxChars?: number; type?: string; accentMarker?: boolean };
  dependsOn?: string;
  note?: string;
  spec?: unknown;
};
type Segment = { key: string; index?: number; wildcard?: boolean };

const args = process.argv.slice(2);
const partial = args.includes("--partial");
const outFlag = args.indexOf("-o");
const outPath = outFlag >= 0 ? args[outFlag + 1] : null;
const fotoFlag = args.indexOf("--foto-reali");
// numero esplicito, oppure cartella di cui contare le immagini; null = flag assente (nessun drop)
const fotoReali: number | null =
  fotoFlag >= 0
    ? /^\d+$/.test(args[fotoFlag + 1] ?? "")
      ? Number(args[fotoFlag + 1])
      : readdirSync(args[fotoFlag + 1]).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).length
    : null;
const lavoriFlag = args.indexOf("--lavori");
const lavoriPath = lavoriFlag >= 0 ? args[lavoriFlag + 1] : null;
const consumed = new Set([outFlag + 1, fotoFlag >= 0 ? fotoFlag + 1 : -1, lavoriFlag >= 0 ? lavoriFlag + 1 : -1]);
const positional = args.filter((a, i) => !a.startsWith("-") && !consumed.has(i));
const [blueprintDir, artifactsDir] = positional;
if (!blueprintDir || !artifactsDir) {
  console.error("uso: node --experimental-strip-types scripts/assemble-site.ts <dir-blueprint> <dir-artifact> [-o out.json] [--partial]");
  process.exit(2);
}

const blueprint = JSON.parse(readFileSync(join(blueprintDir, "blueprint.json"), "utf8"));
const slotsFile = JSON.parse(readFileSync(join(blueprintDir, "slots.json"), "utf8"));
const slots: Slot[] = slotsFile.slots;
const pipeline: string[] = slotsFile.pipeline;
const slotByPath = new Map(slots.map((s) => [s.path, s]));

const errors: string[] = [];
const warnings: string[] = [];

/* ---------------- path: parsing e accesso ---------------- */

function parsePath(path: string): Segment[] {
  return path.split(".").map((seg) => {
    const m = seg.match(/^([A-Za-z_]\w*)(?:\[(\d+|\*)\])?$/);
    if (!m) throw new Error(`path malformato: "${path}" (segmento "${seg}")`);
    if (m[2] === undefined) return { key: m[1] };
    if (m[2] === "*") return { key: m[1], wildcard: true };
    return { key: m[1], index: Number(m[2]) };
  });
}

// Lunghezze già imposte agli array toccati da wildcard: tutti gli slot che scrivono
// sullo stesso array devono concordare (es. items[*].title e items[*].desc).
const arrayLengths = new Map<string, { length: number; by: string }>();

function resizeArray(arr: unknown[], length: number, where: string, slotPath: string): unknown[] {
  const prev = arrayLengths.get(where);
  if (prev && prev.length !== length) {
    errors.push(`"${slotPath}": lunghezza array ${length} in conflitto con ${prev.length} già imposta da "${prev.by}" su ${where}`);
    return arr;
  }
  if (!prev) arrayLengths.set(where, { length, by: slotPath });
  if (length === arr.length) return arr;
  if (length < arr.length) return arr.slice(0, length);
  const template = arr[arr.length - 1];
  return [...arr, ...Array.from({ length: length - arr.length }, () => structuredClone(template))];
}

// Applica `value` a `target` seguendo i segmenti; sulle wildcard consuma un livello di array.
function applyPath(target: any, segs: Segment[], value: unknown, slotPath: string, where = ""): void {
  const [seg, ...rest] = segs;
  const here = where ? `${where}.${seg.key}` : seg.key;
  let node = target[seg.key];
  if (node === undefined && !(seg.key in target)) {
    errors.push(`"${slotPath}": il blueprint non ha "${here}" — slot e scheletro sono disallineati`);
    return;
  }
  if (seg.wildcard) {
    if (!Array.isArray(node)) return void errors.push(`"${slotPath}": "${here}" non è un array nel blueprint`);
    if (!Array.isArray(value)) return void errors.push(`"${slotPath}": path con [*] richiede un array come valore`);
    node = resizeArray(node, value.length, here, slotPath);
    target[seg.key] = node;
    node.forEach((item: any, i: number) => {
      if (rest.length === 0) node[i] = value[i];
      else applyPath(item, rest, value[i], slotPath, `${here}[${i}]`);
    });
    return;
  }
  if (seg.index !== undefined) {
    if (!Array.isArray(node) || node[seg.index] === undefined)
      return void errors.push(`"${slotPath}": "${here}[${seg.index}]" non esiste nel blueprint`);
    if (rest.length === 0) node[seg.index] = value;
    else applyPath(node[seg.index], rest, value, slotPath, `${here}[${seg.index}]`);
    return;
  }
  if (rest.length === 0) target[seg.key] = value;
  else applyPath(node, rest, value, slotPath, here);
}

// Legge i valori a un path (le wildcard raccolgono array) — per il check dependsOn.
function readPath(target: any, segs: Segment[]): unknown {
  const [seg, ...rest] = segs;
  let node = target?.[seg.key];
  if (seg.wildcard) return Array.isArray(node) ? node.map((it: any) => (rest.length ? readPath(it, rest) : it)) : undefined;
  if (seg.index !== undefined) node = Array.isArray(node) ? node[seg.index] : undefined;
  return rest.length ? readPath(node, rest) : node;
}

/* ---------------- constraint per-slot ---------------- */

// Applica il check a ogni foglia (i valori wildcard sono array, anche annidati).
function eachLeaf(value: unknown, fn: (leaf: unknown) => void): void {
  if (Array.isArray(value)) value.forEach((v) => eachLeaf(v, fn));
  else fn(value);
}

function checkConstraints(slot: Slot, value: unknown): void {
  const c = slot.constraints;
  if (!c) return;
  eachLeaf(value, (leaf) => {
    if (typeof leaf !== "string") {
      if (leaf != null) errors.push(`"${slot.path}": atteso testo, ricevuto ${typeof leaf}`);
      return;
    }
    if (c.type === "hex" && !/^#[0-9a-fA-F]{6}$/.test(leaf))
      errors.push(`"${slot.path}": "${leaf}" non è un colore hex #rrggbb`);
    const markers = (leaf.match(/\*\*/g) ?? []).length;
    if (c.accentMarker) {
      if (markers !== 2 || !/\*\*[^*]+\*\*/.test(leaf))
        errors.push(`"${slot.path}": serve ESATTAMENTE una frase evidenziata con **...** (trovati ${markers / 2} marker) in "${leaf}"`);
    } else if (markers > 0) {
      errors.push(`"${slot.path}": marker **...** non ammesso qui`);
    }
    if (c.maxChars !== undefined) {
      const len = leaf.replaceAll("**", "").length;
      if (len > c.maxChars) errors.push(`"${slot.path}": ${len} caratteri > max ${c.maxChars} — "${leaf.slice(0, 60)}…"`);
    }
  });
}

function checkDependsOn(slot: Slot, merged: unknown): void {
  if (!slot.dependsOn) return;
  const dep = readPath(merged, parsePath(slot.dependsOn));
  let ok = dep !== undefined;
  eachLeaf(dep, (leaf) => {
    if (typeof leaf !== "string" || leaf.trim() === "") ok = false;
  });
  if (!ok) errors.push(`"${slot.path}": dipende da "${slot.dependsOn}" che non è ancora valorizzato — rispettare l'ordine della pipeline`);
}

/* ---------------- merge in ordine di pipeline ---------------- */

const merged = structuredClone(blueprint);
const filled = new Set<string>();

for (const agent of pipeline) {
  const file = join(artifactsDir, `${agent}.json`);
  if (!existsSync(file)) {
    if (partial) { warnings.push(`artifact mancante per "${agent}" (${file}) — slot lasciati ai valori d'oro`); continue; }
    console.error(`artifact mancante per l'agente "${agent}": ${file} (usa --partial per i run per-checkpoint)`);
    process.exit(2);
  }
  const artifact = JSON.parse(readFileSync(file, "utf8"));
  for (const [path, value] of Object.entries(artifact)) {
    const slot = slotByPath.get(path);
    if (!slot) { errors.push(`[${agent}] path fuori dagli slot dichiarati: "${path}" — scrittura rifiutata`); continue; }
    if (slot.agent !== agent) { errors.push(`[${agent}] "${path}" appartiene all'agente "${slot.agent}" — scrittura rifiutata`); continue; }
    checkConstraints(slot, value);
    checkDependsOn(slot, merged);
    applyPath(merged, parsePath(path), value, path);
    filled.add(path);
  }
}

for (const s of slots) if (!filled.has(s.path)) warnings.push(`slot non riempito: "${s.path}" (agente ${s.agent}) — resta il valore d'oro del blueprint`);

/* ---------------- sezioni condizionali: drop POST-merge (regola 6 README) ---------------- */

// La Gallery mostra SOLO foto reali del cliente (policy Round 4: mai generate).
// Con meno di 4 foto la sezione esce dalla pagina, insieme alla sua voce nav
// (un'ancora morta in navbar è il primo segnale di "sito rotto" per il visitatore).
const GALLERY_DROP = { index: 4, type: "Gallery", navHref: "#lavori", minFoto: 4 };

// --lavori: le foto reali del cliente popolano DIRETTAMENTE la Gallery. Non passa
// dagli slot perché caption è dell'agente copy e src/alt dell'images: con N foto
// variabili gli array andrebbero in conflitto di lunghezza. Qui si sovrascrive
// sections[4].props.images e si usa il conteggio per il drop.
let effectiveFoto: number | null = fotoReali;
if (lavoriPath) {
  const manifest = JSON.parse(readFileSync(lavoriPath, "utf8"));
  if (!Array.isArray(manifest)) {
    console.error(`--lavori: ${lavoriPath} non è un array [{file,alt,caption}]`);
    process.exit(1);
  }
  const section = merged.sections?.[GALLERY_DROP.index];
  if (section?.type !== GALLERY_DROP.type) {
    console.error(`--lavori: sections[${GALLERY_DROP.index}] è "${section?.type}", atteso "${GALLERY_DROP.type}" — il blueprint è cambiato, aggiornare GALLERY_DROP`);
    process.exit(1);
  }
  const slug = basename(artifactsDir);
  for (const m of manifest as Array<{ file: string }>) {
    if (!existsSync(join(artifactsDir, "img", m.file))) {
      console.error(`--lavori: foto referenziata assente su disco: img/${m.file}`);
      process.exit(1);
    }
  }
  section.props.images = (manifest as Array<{ file: string; alt: string; caption?: string }>).map((m) => ({
    src: `/media/${slug}/${m.file}`,
    alt: m.alt,
    ...(m.caption ? { caption: m.caption } : {}),
  }));
  effectiveFoto = manifest.length;
}

if (effectiveFoto !== null && effectiveFoto < GALLERY_DROP.minFoto) {
  const section = merged.sections?.[GALLERY_DROP.index];
  if (section?.type !== GALLERY_DROP.type) {
    console.error(`drop Gallery: sections[${GALLERY_DROP.index}] è "${section?.type}", atteso "${GALLERY_DROP.type}" — il blueprint è cambiato, aggiornare GALLERY_DROP`);
    process.exit(1);
  }
  merged.sections.splice(GALLERY_DROP.index, 1);
  // toglie OGNI link all'ancora rimossa, ovunque sia (nav dell'Header, colonne del Footer, …)
  const pruneHref = (node: any): void => {
    if (Array.isArray(node)) {
      node.forEach(pruneHref);
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (Array.isArray(v)) node[k] = v.filter((it: any) => it?.href !== GALLERY_DROP.navHref);
        pruneHref(node[k]);
      }
    }
  };
  pruneHref(merged.sections);
  warnings.push(`Gallery rimossa (${effectiveFoto} foto reali < ${GALLERY_DROP.minFoto}) + link "${GALLERY_DROP.navHref}" tolti da nav e footer`);
}

/* ---------------- guard fixture: il golden example non va MAI in una build completa ---------------- */

// La build parziale usa i valori d'oro by design; quella completa no: un
// marcatore della fixture nell'output completo è un leak (foto stock altrui,
// brand inventato) che finirebbe pubblicato sul dominio del cliente.
const MARCATORI_FIXTURE = ["Edil Roma", "unsplash.com"];
if (!partial) {
  const testo = JSON.stringify(merged);
  for (const m of MARCATORI_FIXTURE)
    if (testo.includes(m)) errors.push(`marcatore fixture del golden example ("${m}") presente in una build completa`);
}

/* ---------------- contatti meccanici: le CTA tel: seguono SEMPRE contact ---------------- */

// Il golden example ha un numero fittizio nelle CTA telefoniche (es. hero secondaria),
// che non sono slot: senza questa riscrittura ogni cliente pubblicherebbe il numero
// finto. I dati di contatto sono meccanici — mai del modello, mai del blueprint.
const PHONE_LIKE = /^[+\d][\d\s./-]{5,}$/;
const fixTelCtas = (node: any): void => {
  if (Array.isArray(node)) return void node.forEach(fixTelCtas);
  if (!node || typeof node !== "object") return;
  if (typeof node.href === "string" && node.href.startsWith("tel:") && merged.contact?.phone) {
    node.href = `tel:${String(merged.contact.phone).replace(/[^+\d]/g, "")}`;
    if (typeof node.label === "string" && PHONE_LIKE.test(node.label.trim())) node.label = merged.contact.phone;
  }
  for (const v of Object.values(node)) fixTelCtas(v);
};
fixTelCtas(merged.sections);

/* ---------------- esito ---------------- */

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error(`\nassemblaggio RIFIUTATO — ${errors.length} violazione/i del contratto slots.json:\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

try {
  const cfg = parseSiteConfig(merged);
  const out = outPath ?? "site.json";
  mkdirSync(dirname(out) || ".", { recursive: true });
  writeFileSync(out, JSON.stringify(merged, null, 2) + "\n");
  console.log(`OK — ${out} assemblato e valido · ${cfg.sections.length} sezioni · preset "${cfg.brand.preset}" · ${cfg.meta.businessName} · ${filled.size}/${slots.length} slot riempiti`);
  process.exit(0);
} catch (e) {
  console.error("site.json assemblato ma INVALIDO per lo schema Zod:\n");
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
