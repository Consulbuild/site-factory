import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Sito statico: nessun adapter, build → dist/ pronta per Cloudflare Workers.
// SITE_URL (es. https://cavalierebuild.it) arriva dalla build per-cliente
// quando il dominio esiste: attiva canonical/og:url/og:image in Base.astro.
// Assente (dev, blueprint, anteprime): nessun tag assoluto, resa invariata.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  vite: {
    plugins: [tailwindcss()],
  },
});
