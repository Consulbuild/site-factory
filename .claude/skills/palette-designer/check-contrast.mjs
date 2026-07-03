// check-contrast.mjs — verifica contrasto WCAG 2 (AA) su coppie di colori (hex o oklch).
// Uso:
//   node check-contrast.mjs coppie.json      # array [{name, fg, bg, large?}]
//   node check-contrast.mjs "#111" "#fff"    # coppia singola (hex o "oklch(..)")
//   node check-contrast.mjs --selftest
// Nessuna dipendenza. Exit 1 se una coppia non passa AA.
// ponytail: colori fuori dal gamut sRGB vengono clampati a [0,1] — è un gate di verifica, non una conversione color-managed esatta.
import { readFileSync } from 'node:fs';

const clamp01 = v => Math.min(1, Math.max(0, v));

function linFromHex(hex){
  let h = hex.replace('#','').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return h.match(/.{2}/g).map(x => {
    const c = parseInt(x, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}
function linFromOklch(L, C, h){
  const hr = h * Math.PI / 180, a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = L + 0.3963377774*a + 0.2158037573*b;
  const m_ = L - 0.1055613458*a - 0.0638541728*b;
  const s_ = L - 0.0894841775*a - 1.2914855480*b;
  const l = l_**3, m = m_**3, s = s_**3;
  return [
    clamp01( 4.0767416621*l - 3.3077115913*m + 0.2309699292*s),
    clamp01(-1.2684380046*l + 2.6097574011*m - 0.3413193965*s),
    clamp01(-0.0041960863*l - 0.7034186147*m + 1.7076147010*s),
  ];
}
function lin(str){
  const s = String(str).trim();
  const m = s.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i);
  if (m){ let L = parseFloat(m[1]); if (m[2] === '%') L /= 100; return linFromOklch(L, parseFloat(m[3]), parseFloat(m[4])); }
  return linFromHex(s);
}
const lum = ([r,g,b]) => 0.2126*r + 0.7152*g + 0.0722*b;
function contrast(fg, bg){
  const a = lum(lin(fg)), b = lum(lin(bg));
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

if (process.argv.includes('--selftest')){
  const bw = contrast('#000', '#fff');
  console.assert(Math.abs(bw - 21) < 0.01, 'hex nero/bianco deve essere 21:1');
  const ok = contrast('oklch(0% 0 0)', 'oklch(100% 0 0)');
  console.assert(Math.abs(ok - 21) < 0.2, 'oklch nero/bianco ~21:1');
  console.log(`selftest OK — hex ${bw.toFixed(2)}:1, oklch ${ok.toFixed(2)}:1`);
  process.exit(0);
}

const argv = process.argv.slice(2);
let pairs;
if (argv[0]?.endsWith('.json')) pairs = JSON.parse(readFileSync(argv[0], 'utf8'));
else if (argv.length >= 2) pairs = [{ name: 'cli', fg: argv[0], bg: argv[1] }];
else { console.error('uso: coppie.json | "#fg" "#bg" | --selftest'); process.exit(2); }

let fail = 0;
for (const p of pairs){
  const r = contrast(p.fg, p.bg);
  const need = p.large ? 3 : 4.5;
  const ok = r >= need;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (soglia ${need})  ${p.name || ''}  ${p.fg} / ${p.bg}`);
}
console.log(fail ? `\n${fail} coppie FALLITE (AA)` : `\nTutte PASS (AA)`);
process.exit(fail ? 1 : 0);
