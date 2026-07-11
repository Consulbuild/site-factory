// Correzione contrasto AA "by construction" nello spazio HCT (M3).
// A differenza del vecchio loop RGB (che scalando verso nero/bianco desaturava
// e derivava la tinta), qui si sposta SOLO il tone: hue e chroma del brand
// restano quelli scelti dal designer. Il tone bersaglio non è un'euristica:
// Contrast.darker/lighter è la matematica inversa esatta del ratio WCAG.
// check-contrast.mjs della skill resta l'autorità finale, invariata.

import { Hct, Contrast, argbFromHex, hexFromArgb } from "@material/material-color-utilities";
import { contrastRatio } from "./wcag.ts";

/**
 * Restituisce l'hex con la stessa tinta/croma di `fg` e il tone minimo
 * spostato per raggiungere `need` contro `bg`, o null se irraggiungibile.
 */
export function fixTone(fg: string, bg: string, need: number): string | null {
  const f = Hct.fromInt(argbFromHex(fg));
  const bgTone = Hct.fromInt(argbFromHex(bg)).tone;
  const scurisci = f.tone <= bgTone; // il fg resta dal suo lato del bg
  let tone = scurisci ? Contrast.darker(bgTone, need) : Contrast.lighter(bgTone, need);
  if (tone < 0) return null; // da questo bg il ratio non esiste (bg mediano)
  // non alzare mai il contrasto già sufficiente del fg: correggi solo verso la soglia
  tone = scurisci ? Math.min(tone, f.tone) : Math.max(tone, f.tone);
  // il roundtrip tone→sRGB quantizza (±~0.3 di tone): verifica con la stessa
  // matematica WCAG e spingi a piccoli passi finché la coppia passa davvero
  for (let i = 0; i < 40; i++) {
    f.tone = Math.max(0, Math.min(100, tone));
    const hex = hexFromArgb(f.toInt());
    if (contrastRatio(hex, bg) >= need) return hex;
    tone += scurisci ? -0.25 : 0.25;
    if (tone < 0 || tone > 100) break;
  }
  return null;
}
