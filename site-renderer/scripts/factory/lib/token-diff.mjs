// Distanza pesata tra due set di token DTCG (gate novelty L2, asse "vs libreria").
// Ogni set va prima RISOLTO come { ...meridian, ...override }: meridian è il base
// completo, gli altri preset (e i candidati) sono override sparsi.
//
// Pesi dei gruppi (somma = 1, decisi nel piano fabbrica-design):
//   colori     0.40  distanza euclidea RGB (componenti 0..1, normalizzata su √3)
//                    sui token $type=color condivisi, media
//   font       0.30  famiglia heading diversa = 1, body diversa = 0.6, media dei due
//   forma      0.20  radius: |Δpx| normalizzato su 32 (clamp 1);
//                    shadow: n° layer + blur/offset del primo layer (blur/40, offset/24)
//   scala/cassa 0.10 heading-case diverso = 1; step-display: Δ del massimo del
//                    clamp in rem, normalizzato su 4rem (clamp 1); media dei due
// Risultato in 0..1. topContributi = gruppi ordinati per contributo (peso × punteggio).

import { readFileSync } from "node:fs";

export const PESI = { colori: 0.4, font: 0.3, forma: 0.2, scala: 0.1 };

export const caricaTokens = (path) => JSON.parse(readFileSync(path, "utf8"));

/** Risolve un preset/candidato sul base meridian (override sparsi → set completo). */
export const risolvi = (base, override) => ({ ...base, ...override });

/** Token colore DTCG da un hex "#rrggbb" (per ricostruire override di palette). */
export const coloreDaHex = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return {
    $type: "color",
    $value: {
      colorSpace: "srgb",
      components: [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255],
      alpha: 1,
      hex,
    },
  };
};

const arrotonda = (x) => Math.round(x * 10000) / 10000;
const media = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const rgb = (tok) => (tok?.$type === "color" ? tok.$value.components : null);
const px = (tok) => (tok?.$type === "dimension" ? tok.$value.value : null);
const famiglia = (tok) => (typeof tok?.$value === "string" ? tok.$value : null);

/** Massimo di uno step fluido: ultimo valore rem del clamp (o dimension rem secca). */
const maxStepRem = (tok) => {
  if (tok?.$type === "dimension" && tok.$value.unit === "rem") return tok.$value.value;
  if (typeof tok?.$value !== "string") return null;
  const rems = [...tok.$value.matchAll(/([\d.]+)\s*rem/g)].map((m) => Number(m[1]));
  return rems.length ? Math.max(...rems) : null;
};

const distColore = (a, b) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / Math.sqrt(3);

const scoreOmbra = (la, lb) => {
  const dLayer = Math.min(Math.abs(la.length - lb.length), 1);
  const A = la[0], B = lb[0];
  const dBlur = Math.min(Math.abs(A.blur.value - B.blur.value) / 40, 1);
  const dOff = Math.min(
    (Math.abs(A.offsetX.value - B.offsetX.value) + Math.abs(A.offsetY.value - B.offsetY.value)) / 24,
    1,
  );
  return (dLayer + dBlur + dOff) / 3;
};

/**
 * Distanza pesata 0..1 tra due set di token GIÀ risolti.
 * @returns {{ totale:number, gruppi:object, topContributi:Array }}
 */
export function tokenDiff(a, b) {
  // colori: tutti i token $type=color presenti in entrambi
  const chiaviColore = Object.keys(a).filter((k) => rgb(a[k]) && rgb(b[k]));
  const colori = media(chiaviColore.map((k) => distColore(rgb(a[k]), rgb(b[k]))));

  // font: heading pesa 1, body 0.6 (la testata definisce la voce del sito)
  const font =
    ((famiglia(a["brand-font-heading"]) !== famiglia(b["brand-font-heading"]) ? 1 : 0) +
      (famiglia(a["brand-font-body"]) !== famiglia(b["brand-font-body"]) ? 0.6 : 0)) /
    2;

  // forma: radius + ombre
  const radii = ["brand-radius-card", "brand-radius-input", "brand-radius-pill"]
    .filter((k) => px(a[k]) != null && px(b[k]) != null)
    .map((k) => Math.min(Math.abs(px(a[k]) - px(b[k])) / 32, 1));
  const ombre = ["brand-shadow-card", "brand-shadow-cta", "brand-shadow-float", "brand-shadow-hover"]
    .filter((k) => Array.isArray(a[k]?.$value) && Array.isArray(b[k]?.$value))
    .map((k) => scoreOmbra(a[k].$value, b[k].$value));
  const forma = media([...radii, ...ombre]);

  // scala/cassa
  const cassa = a["heading-case"]?.$value !== b["heading-case"]?.$value ? 1 : 0;
  const dA = maxStepRem(a["step-display"]);
  const dB = maxStepRem(b["step-display"]);
  const passo = dA != null && dB != null ? Math.min(Math.abs(dA - dB) / 4, 1) : 0;
  const scala = (cassa + passo) / 2;

  const gruppi = { colori, font, forma, scala };
  const totale = Object.entries(PESI).reduce((s, [g, p]) => s + p * gruppi[g], 0);
  const topContributi = Object.entries(gruppi)
    .map(([gruppo, punteggio]) => ({
      gruppo,
      punteggio: arrotonda(punteggio),
      peso: PESI[gruppo],
      contributo: arrotonda(punteggio * PESI[gruppo]),
    }))
    .sort((x, y) => y.contributo - x.contributo);
  return { totale: arrotonda(totale), gruppi, topContributi };
}
