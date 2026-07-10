// Matematica WCAG 2 per il display LIVE client-side della scheda Palette.
// ⚠ Duplicata (in piccolo) da .claude/skills/palette-designer/check-contrast.mjs:
// il gate AUTORITATIVO resta lo script, spawnato server-side in lib/contrast.ts
// a ogni salvataggio/conferma. Se cambia là, cambiare qui.

function lin(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = (h.match(/.{2}/g) ?? ["00", "00", "00"]).map((x) => {
    const c = parseInt(x, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return [r, g, b];
}

const lum = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function contrastRatio(fg: string, bg: string): number {
  const a = lum(lin(fg));
  const b = lum(lin(bg));
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export const isHex6 = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

function scale(hex: string, k: number, verso: "nero" | "bianco"): string {
  const h = hex.replace("#", "");
  const ch = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16);
    const v = verso === "nero" ? c * k : c + (255 - c) * (1 - k);
    return Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/**
 * La regola della skill in un click: «scurisci del minimo necessario
 * mantenendo la tinta» (o schiarisci, su sfondo scuro tipo nova). Scala i
 * canali RGB a piccoli passi verso nero/bianco finché la coppia passa.
 */
export function fixUntilPass(fg: string, bg: string, need: number): string | null {
  const verso: "nero" | "bianco" = lum(lin(fg)) < lum(lin(bg)) ? "nero" : "bianco";
  let out = fg;
  for (let i = 0; i < 120; i++) {
    if (contrastRatio(out, bg) >= need) return out;
    out = scale(out, 0.98, verso);
  }
  return contrastRatio(out, bg) >= need ? out : null;
}

/** Direzione della correzione, per l'etichetta del bottone. */
export function versoCorrezione(fg: string, bg: string): "Scurisci" | "Schiarisci" {
  return lum(lin(fg)) < lum(lin(bg)) ? "Scurisci" : "Schiarisci";
}
