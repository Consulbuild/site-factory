// Identità degli style-preset del renderer, per la scheda Palette.
//
// GENERATO A MONTE: i dati vengono da lib/presets.gen.json, emesso da
// `npm run build:presets` in site-renderer (fonte di verità: i file DTCG in
// site-renderer/presets/). Qui restano solo i tipi, derivati dal JSON: un
// preset nuovo pubblicato dalla fabbrica arriva qui senza toccare questo file.
// La vecchia terza copia dei neutri è morta con la milestone M2.

import gen from "./presets.gen.json" with { type: "json" };

export type PresetKey = keyof typeof gen;
export const PRESET_KEYS = Object.keys(gen) as PresetKey[];

export interface PresetInfo {
  nome: string;
  /** Estetica in una riga. */
  estetica: string;
  /** Per chi è pensato. */
  per: string;
  /** Famiglie tipografiche, per la card identità. */
  fontLabel: string;
  /** URL Google Fonts. */
  fontsHref: string;
  /** font-family CSS per la mini-preview (titoli / testo). */
  fontHeading: string;
  fontBody: string;
  neutri: { bg: string; ink: string; surface: string };
  /** true solo per i preset scuri: il gate accent si verifica contro il bg scuro. */
  scuro?: boolean;
}

export const PRESETS: Record<PresetKey, PresetInfo> = gen;
