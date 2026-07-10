#!/usr/bin/env node
// check-slop.mjs — Gate deterministico anti-slop per copy.json (Site Factory).
// Controlla: frasi bandite (verbatim + pattern), sequenze di 3+ parole ripetute
// in >2 slot, occorrenze verbatim del martello, connettivi meccanici, lineette.
//
// Uso:
//   node check-slop.mjs <path-copy.json> [--bandite <path>] [--martello "frase"]
//        [--max-verbatim 2] [--consenti "Nome Azienda"] [--json]
//
// --consenti è ripetibile: nome azienda, città multi-parola, slogan di brand —
// tutto ciò che DEVE poter ricorrere senza far scattare il controllo sequenze.
// Exit code: 0 = pass · 1 = bloccanti presenti · 2 = errore d'uso.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- CLI ----------
const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith('--')) {
  console.error('Uso: node check-slop.mjs <copy.json> [--bandite path] [--martello "frase"] [--max-verbatim 2] [--consenti "Nome"] [--json]');
  process.exit(2);
}
const copyPath = args[0];
const opt = {
  bandite: resolve(__dirname, '../references/frasi-bandite.json'),
  martello: null,
  maxVerbatim: 2,
  consenti: [],
  json: false,
};
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === '--bandite') opt.bandite = args[++i];
  else if (a === '--martello') opt.martello = args[++i];
  else if (a === '--max-verbatim') opt.maxVerbatim = parseInt(args[++i], 10);
  else if (a === '--consenti') opt.consenti.push(args[++i]);
  else if (a === '--json') opt.json = true;
  else { console.error(`Opzione sconosciuta: ${a}`); process.exit(2); }
}

// ---------- Utils ----------
const norm = (s) => String(s)
  .replace(/\*\*/g, '')           // marcatore accent **...** presente nel JSON
  .replace(/[’‘]/g, "'")
  .toLowerCase()
  .normalize('NFC')
  .replace(/\s+/g, ' ')
  .trim();

const tokenize = (s) =>
  (norm(s).match(/[a-z0-9àèéìíîòóùú]+(?:'[a-z0-9àèéìíîòóùú]+)?/g) || []);

const STOP = new Set([
  'di','a','da','in','con','su','per','tra','fra','il','lo','la','i','gli','le',
  "l'",'un','uno','una',"un'",'e','ed','o','od','ma','che','chi','cui','non','più',
  'del','della','dei','delle','dello','degli','al','alla','ai','alle','allo','agli',
  'dal','dalla','dai','dalle','nel','nella','nei','nelle','sul','sulla','sui','sulle',
  'è','sono','si','ci','vi','come','anche','se','tuo','tua','tuoi','tue','suo','sua',
  'nostro','nostra','nostri','nostre','questo','questa','questi','queste','ogni',
  'già','poi','qui',
]);

// Appiattisce copy.json: foglie stringa con chiave puntata (gestisce flat e annidato).
function flatten(node, prefix = '', out = {}) {
  if (typeof node === 'string') { out[prefix || '(root)'] = node; return out; }
  if (Array.isArray(node)) {
    node.forEach((v, i) => flatten(v, prefix ? `${prefix}[${i}]` : `[${i}]`, out));
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    return out;
  }
  return out; // numeri/bool ignorati
}

// ---------- Load ----------
let copyRaw, bandite;
try { copyRaw = JSON.parse(readFileSync(copyPath, 'utf8')); }
catch (e) { console.error(`Impossibile leggere ${copyPath}: ${e.message}`); process.exit(2); }
try { bandite = JSON.parse(readFileSync(opt.bandite, 'utf8')); }
catch (e) { console.error(`Impossibile leggere la lista bandite ${opt.bandite}: ${e.message}`); process.exit(2); }

const slots = flatten(copyRaw);
const slotEsclusi = new RegExp(bandite.slot_esclusi_regex || '$^', 'i');
const bloccanti = [];
const avvisi = [];

// Sequenze consentite: da config + --consenti, tokenizzate come i trigrammi.
const consentite = [
  ...(bandite.sequenze_consentite || []),
  ...opt.consenti,
].map((s) => tokenize(s).join(' ')).filter(Boolean);
const isConsentita = (phrase) =>
  consentite.some((c) => c.includes(phrase) || phrase.includes(c));

// ---------- 1) Frasi e pattern banditi ----------
for (const [key, text] of Object.entries(slots)) {
  const t = norm(text);
  for (const f of bandite.bloccanti || []) {
    if (t.includes(norm(f))) bloccanti.push({ tipo: 'frase_bandita', slot: key, frase: f });
  }
  for (const rx of bandite.bloccanti_regex || []) {
    const m = t.match(new RegExp(rx, 'i'));
    if (m) bloccanti.push({ tipo: 'pattern_bandito', slot: key, frase: m[0].slice(0, 80) });
  }
  for (const f of bandite.avvisi || []) {
    if (t.includes(norm(f))) avvisi.push({ tipo: 'frase_debole', slot: key, frase: f });
  }
  for (const rx of bandite.avvisi_regex || []) {
    const m = t.match(new RegExp(rx, 'i'));
    if (m) avvisi.push({ tipo: 'pattern_debole', slot: key, frase: m[0].slice(0, 80) });
  }
}

// ---------- 2) Sequenze di 3+ parole in più di 2 slot ----------
const triMap = new Map(); // trigramma -> Set(slot)
for (const [key, text] of Object.entries(slots)) {
  if (slotEsclusi.test(key)) continue;
  const toks = tokenize(text);
  const visti = new Set();
  for (let i = 0; i + 2 < toks.length; i++) {
    const tri = [toks[i], toks[i + 1], toks[i + 2]];
    if (!tri.some((w) => !STOP.has(w) && w.length >= 4)) continue; // serve ≥1 parola piena
    const phrase = tri.join(' ');
    if (visti.has(phrase) || isConsentita(phrase)) continue;
    visti.add(phrase);
    if (!triMap.has(phrase)) triMap.set(phrase, new Set());
    triMap.get(phrase).add(key);
  }
}
for (const [phrase, set] of triMap) {
  if (set.size > 2) {
    bloccanti.push({
      tipo: 'sequenza_ripetuta',
      slot: [...set].join(', '),
      frase: phrase,
      dettaglio: `presente in ${set.size} slot (max 2) — riformulare, il copy ripetitivo suona robotico`,
    });
  }
}

// ---------- 3) Martello verbatim ----------
if (opt.martello) {
  const m = norm(opt.martello);
  let count = 0;
  const dove = [];
  for (const [key, text] of Object.entries(slots)) {
    const occ = norm(text).split(m).length - 1;
    if (occ > 0) { count += occ; dove.push(`${key}×${occ}`); }
  }
  if (count > opt.maxVerbatim) {
    bloccanti.push({
      tipo: 'martello_verbatim',
      slot: dove.join(', '),
      frase: opt.martello,
      dettaglio: `${count} occorrenze verbatim (max ${opt.maxVerbatim}) — il martello si rifrange, non si ripete`,
    });
  }
}

// ---------- 4) Connettivi meccanici (avviso, soglia globale) ----------
const conn = bandite.connettivi_meccanici || [];
if (conn.length) {
  let tot = 0;
  const det = {};
  const needles = conn.map((c) => ' ' + tokenize(c).join(' ') + ' ');
  for (const text of Object.values(slots)) {
    const padded = ' ' + tokenize(text).join(' ') + ' ';
    needles.forEach((needle, i) => {
      let idx = 0;
      while ((idx = padded.indexOf(needle, idx)) !== -1) {
        tot++; det[conn[i]] = (det[conn[i]] || 0) + 1; idx += 1;
      }
    });
  }
  const soglia = bandite.max_connettivi ?? 3;
  if (tot > soglia) {
    avvisi.push({
      tipo: 'connettivi_meccanici',
      slot: '(globale)',
      frase: Object.entries(det).map(([k, v]) => `${k}×${v}`).join(', '),
      dettaglio: `${tot} connettivi da prosa AI (soglia ${soglia}) — usarli come colla rende il testo meccanico`,
    });
  }
}

// ---------- 5) Lineette (avviso, soglia globale) ----------
{
  const soglia = bandite.max_lineette ?? 2;
  let n = 0;
  for (const text of Object.values(slots)) n += (String(text).match(/[—–]/g) || []).length;
  if (n > soglia) {
    avvisi.push({
      tipo: 'lineette',
      slot: '(globale)',
      frase: '— / –',
      dettaglio: `${n} lineette nel copy (soglia ${soglia}): tratto tipico della prosa AI, preferire punteggiatura normale`,
    });
  }
}

// ---------- Output ----------
const esito = bloccanti.length ? 'fail' : 'pass';
if (opt.json) {
  console.log(JSON.stringify({ esito, bloccanti, avvisi }, null, 2));
} else {
  console.log(`\n== check-slop: ${esito.toUpperCase()} — ${bloccanti.length} bloccanti, ${avvisi.length} avvisi ==\n`);
  for (const b of bloccanti) {
    console.log(`  ✗ [${b.tipo}] ${b.slot}`);
    console.log(`     «${b.frase}»${b.dettaglio ? ' — ' + b.dettaglio : ''}`);
  }
  if (bloccanti.length && avvisi.length) console.log('');
  for (const a of avvisi) {
    console.log(`  ⚠ [${a.tipo}] ${a.slot}`);
    console.log(`     «${a.frase}»${a.dettaglio ? ' — ' + a.dettaglio : ''}`);
  }
  console.log('');
}
process.exit(esito === 'fail' ? 1 : 0);
