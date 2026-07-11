import { defineConfig } from "@playwright/test";

// Matrice VRT: 6 preset × 2 viewport (390 = mobile primario, tarato sulle parole
// italiane lunghe in maiuscolo; 1280 = desktop). Il nome del project codifica la
// cella ("terra-390"): i test ne ricavano il preset per l'URL di anteprima.
// Le baseline si generano SOLO sul Mac di lavoro (mai miste tra macchine: il
// rendering dei font varia per OS/hardware).
// La lista viene dal generato (fonte: presets/*.tokens.json): un preset nuovo
// pubblicato dalla fabbrica estende la matrice VRT senza toccare questo file.
import { PRESETS } from "./src/lib/presets.gen";
const VIEWPORTS: Record<string, { width: number; height: number }> = {
  "390": { width: 390, height: 844 },
  "1280": { width: 1280, height: 900 },
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // Zero tolleranza: sito statico, niente animazioni in-page → rendering
  // deterministico sulla stessa macchina. Allentare solo davanti a flake
  // documentato nel Decision Log del piano.
  expect: { toHaveScreenshot: { maxDiffPixels: 0, animations: "disabled" } },
  webServer: {
    // Porta dedicata improbabile + reuseExistingServer:false: astro dev
    // auto-incrementa la porta (un dev dell'editor lanciato per 4321 è finito
    // su 4322) e riusare in silenzio un server già in ascolto significa
    // testare il rendering DEV (dev toolbar inclusa) invece della build
    // statica. Meglio un errore esplicito "porta occupata".
    command: "npm run build && npx astro preview --port 4787",
    url: "http://localhost:4787/anteprima/meridian/",
    reuseExistingServer: false,
    timeout: 180_000,
  },
  use: { baseURL: "http://localhost:4787" },
  projects: PRESETS.flatMap((preset) =>
    Object.entries(VIEWPORTS).map(([w, viewport]) => ({
      name: `${preset}-${w}`,
      use: { viewport },
    })),
  ),
});
