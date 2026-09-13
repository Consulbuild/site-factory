# site-renderer

Il **motore** della Site Factory: trasforma un singolo file `site.json` in un sito
vetrina statico (Astro 5 + Tailwind v4), pubblicato su Cloudflare Workers (static
assets) dall'editor.

> Principio chiave: **l'AI non scrive codice, produce solo dati.** Tutta la qualità
> vive nei componenti curati a mano in `src/sections/`; la pipeline riempie gli slot
> di un blueprint e l'assembler produce un `site.json` valido contro `src/lib/schema.ts`.

## Come funziona

1. `src/lib/schema.ts` definisce il **contratto dati** (Zod): brand (preset + palette),
   contatti, testi legali e un array ordinato di `sections`, ognuna con `type`, `variant`
   e `props` tipizzate.
2. `src/pages/index.astro` valida il golden example (`blueprints/conversione-locale-v1/
   blueprint.json`, o il file indicato da `SITE_JSON`) e, per ogni sezione, recupera il
   componente dal **registry** (`src/lib/registry.ts`) e lo renderizza con le sue props.
3. `src/layouts/Base.astro` mette `data-preset` su `<html>` e inietta la palette del
   cliente come variabili CSS inline: **cambiare palette = cambiare i token, zero codice.**
   Con le env di build (`FORM_ACTION`, `UMAMI_HOST`, `UMAMI_WEBSITE_ID`) il modulo e le
   statistiche diventano reali; senza, il sito è identico ma simulato.

## Comandi

```bash
export PATH="$HOME/.local/bin:$PATH"   # Node vive in ~/.local
npm install
npm run dev          # anteprima live su http://localhost:4321
npm run build        # dist/ statica
npm run check        # astro check (1 errore atteso: guard del registry, vedi CLAUDE.md)
npm run test:visual  # snapshot Playwright, 7 preset × 2 viewport (+ anteprima componenti)
npm run test:a11y    # axe
node --experimental-strip-types scripts/validate-site.ts <site.json>
```

`/anteprima/{preset}/` renderizza lo stesso sample con ogni preset; è la pagina usata
dai test e dai gate (`gate:overflow`, `gate:tokens`).

## Libreria e design

Il design segue **lo standard ConsulBuild** (`DESIGN.md` + `PRODUCT.md`), distillato dai
siti consegnati ai clienti reali. Le 15 sezioni in `src/sections/` sono tutte
data-driven: nessun testo o immagine hardcoded. I 7 style-preset vivono come token DTCG
in `presets/*.tokens.json` (+ `*.meta.json`); `npm run build:presets` genera
`src/styles/presets.gen.css`, `src/lib/presets.gen.ts` e la copia per l'editor —
mai editare i file `.gen.*` a mano.

## Blueprint e script della pipeline

`blueprints/conversione-locale-v1/` è insieme lo scheletro che la pipeline riempie
(`slots.json` dichiara gli slot per agente) e il golden example: vedi
`blueprints/README.md`. In `scripts/`: `assemble-site.ts` (blueprint + artifact →
site.json), `validate-site.ts`, `generate-image.mjs` (FLUX.2 via BFL),
`generate-logo.mjs` (logo con GPT Image via OpenAI: lockup PNG, favicon, foglio di
contatto + metriche), i gate della libreria (`check-overflow.mjs`, `lint-tokens.mjs`) e in
`scripts/factory/` gli script della fabbrica dei preset, tutti spawnati dall'editor.
