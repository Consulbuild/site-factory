// GENERATO da scripts/build-presets.mjs — NON EDITARE A MANO.
// Fonte: presets/*.tokens.json + presets/*.meta.json. Rigenera: npm run build:presets

export const PRESETS = ["meridian","atelier","nova","canon","terra","vita"] as const;
export type Preset = (typeof PRESETS)[number];

export const DEFAULT_PRESET: Preset = "meridian";
