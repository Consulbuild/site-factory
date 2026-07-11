/**
 * Manifest dei 6 style-preset. La fonte di verità sono i file DTCG in
 * presets/*.tokens.json (+ *.meta.json): PRESETS e DEFAULT_PRESET sono
 * GENERATI da `npm run build:presets` in presets.gen.ts. I font di preset
 * sono self-hosted (@font-face in presets.gen.css, via fetch-fonts.mjs).
 * Qui vive solo il codice a mano (override font del cliente).
 */

export { PRESETS, DEFAULT_PRESET, type Preset } from "./presets.gen";

/** Costruisce un URL Google Fonts da famiglie arbitrarie (override cliente). */
export function customFontsHref(families: string[]): string {
  const fam = (n: string) => n.trim().replace(/\s+/g, "+");
  const params = families
    .filter(Boolean)
    .map((f) => `family=${fam(f)}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
