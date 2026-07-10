// Identità dei 6 style-preset del renderer, per la scheda Palette.
//
// ⚠ TERZA copia dei neutri. Le altre due (le fonti):
//   - site-renderer/src/styles/global.css  (la verità CSS, :root + [data-preset])
//   - .claude/skills/palette-designer/SKILL.md  (tabella «Neutri REALI per preset»)
// I font sono gli URL di site-renderer/src/lib/presets.ts (PRESET_FONTS).
// Se cambiano lì, cambiare anche qui.

export const PRESET_KEYS = ["meridian", "atelier", "nova", "canon", "terra", "vita"] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];

export interface PresetInfo {
  nome: string;
  /** Estetica in una riga (dalla tabella della skill). */
  estetica: string;
  /** Per chi è pensato. */
  per: string;
  /** Famiglie tipografiche, per la card identità. */
  fontLabel: string;
  /** URL Google Fonts (copiato da site-renderer/src/lib/presets.ts). */
  fontsHref: string;
  /** font-family CSS per la mini-preview (titoli / testo). */
  fontHeading: string;
  fontBody: string;
  neutri: { bg: string; ink: string; surface: string };
  /** true solo per nova: il gate accent si verifica contro il bg scuro. */
  scuro?: true;
}

export const PRESETS: Record<PresetKey, PresetInfo> = {
  meridian: {
    nome: "Meridian",
    estetica: "professionale, elevazione soffusa — lo standard ConsulBuild",
    per: "studi tecnici, consulenza, edilizia/impianti (default)",
    fontLabel: "Archivo (unica famiglia)",
    fontsHref: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap",
    fontHeading: '"Archivo", system-ui, sans-serif',
    fontBody: '"Archivo", system-ui, sans-serif',
    neutri: { bg: "#ffffff", ink: "#1b1a17", surface: "#f5f4f0" },
  },
  atelier: {
    nome: "Atelier",
    estetica: "minimal near-monocromo, zero ombre",
    per: "chi vuole sobrietà",
    fontLabel: "Inter Tight + Inter",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap",
    fontHeading: '"Inter Tight", system-ui, sans-serif',
    fontBody: '"Inter", system-ui, sans-serif',
    neutri: { bg: "#ffffff", ink: "#18181b", surface: "#f7f7f8" },
  },
  nova: {
    nome: "Nova",
    estetica: "dark, indaco+ciano neon, glass/glow (unico scuro)",
    per: "software, AI, tech",
    fontLabel: "Space Grotesk + Inter",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@500&display=swap",
    fontHeading: '"Space Grotesk", system-ui, sans-serif',
    fontBody: '"Inter", system-ui, sans-serif',
    neutri: { bg: "#0a0a0f", ink: "#f5f5ff", surface: "#14141c" },
    scuro: true,
  },
  canon: {
    nome: "Canon",
    estetica: "editoriale serif, carta",
    per: "studi creativi, lusso, restauro, portfolio",
    fontLabel: "Playfair Display + Source Serif 4",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap",
    fontHeading: '"Playfair Display", serif',
    fontBody: '"Source Serif 4", serif',
    neutri: { bg: "#fbfaf7", ink: "#1a1714", surface: "#f3efe7" },
  },
  terra: {
    nome: "Terra",
    estetica: "artigianale caldo, terracotta/salvia, bordi 1.5px",
    per: "artigiani, legno, food, «fatto con cura»",
    fontLabel: "Fraunces + Karla",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Karla:wght@400;500;700&display=swap",
    fontHeading: '"Fraunces", serif',
    fontBody: '"Karla", system-ui, sans-serif',
    neutri: { bg: "#faf4ec", ink: "#3b2f26", surface: "#f0e6d8" },
  },
  vita: {
    nome: "Vita",
    estetica: "friendly rounded, micro-bounce",
    per: "startup, servizi consumer, app person-facing",
    fontLabel: "Plus Jakarta Sans + Inter",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600&display=swap",
    fontHeading: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontBody: '"Inter", system-ui, sans-serif',
    neutri: { bg: "#ffffff", ink: "#1e1b2e", surface: "#f5f5ff" },
  },
};
