import { defineConfig } from "astro/config";
import { devInbox } from "./dev/inbox.mjs";

// Form bozza: sito statico (nessun adapter), build → dist/ pubblicata come
// Cloudflare Worker con static assets (wrangler.jsonc). Il CSS è sempre inline
// nell'HTML: è piccolo e il primo passo deve comparire senza attendere altre
// richieste. In `astro dev` il plugin devInbox risponde alle stesse route HTTP
// che in produzione saranno i webhook n8n (vedi README «Trasporto»).
export default defineConfig({
  site: "https://bozza.consulbuild.com",
  build: { inlineStylesheets: "always" },
  vite: {
    plugins: [devInbox()],
  },
});
