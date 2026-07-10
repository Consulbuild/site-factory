// GENERATO da scripts/build-presets.mjs — NON EDITARE A MANO.
// Fonte: presets/*.tokens.json + presets/*.meta.json. Rigenera: npm run build:presets

export const PRESETS = ["meridian","atelier","nova","canon","terra","vita"] as const;
export type Preset = (typeof PRESETS)[number];

export const DEFAULT_PRESET: Preset = "meridian";

/** URL Google Fonts per preset (solo i pesi/assi realmente usati). */
export const PRESET_FONTS: Record<Preset, string> = {
  meridian: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap",
  atelier: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap",
  nova: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@500&display=swap",
  canon: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap",
  terra: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Karla:wght@400;500;700&display=swap",
  vita: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600&display=swap",
};
