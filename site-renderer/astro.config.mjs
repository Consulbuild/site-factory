import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Sito statico: nessun adapter, build → dist/ pronta per Cloudflare Pages.
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
