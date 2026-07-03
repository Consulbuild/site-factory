# site-renderer

Il **motore** della Site Factory: trasforma un singolo file `site.json` in un sito
vetrina statico (Astro + Tailwind v4), pronto per Cloudflare Pages.

> Principio chiave: **l'AI non scrive codice, produce solo dati.** Tutta la qualità
> vive nei componenti curati a mano in `src/sections/`. La pipeline AI dovrà solo
> generare un `site.json` valido contro `src/lib/schema.ts`.

## Come funziona

1. `src/lib/schema.ts` definisce il **contratto dati** (Zod): brand, contatti, e un
   array ordinato di `sections`, ognuna con `type`, `variant` e `props` tipizzate.
2. `src/pages/index.astro` valida il `site.json` e, per ogni sezione, recupera il
   componente dal **registry** (`src/lib/registry.ts`) e lo renderizza con le sue props.
3. Il **layout** (`src/layouts/Base.astro`) inietta la palette del brand come variabili
   CSS inline su `<html>`. Le utility Tailwind (`bg-primary`, `text-ink`, `font-heading`…)
   puntano a quelle variabili → **cambiare palette = cambiare i token, zero codice.**

## Comandi

```bash
npm install
npm run dev      # anteprima live su http://localhost:4321
npm run build    # genera dist/ statica
npm run preview  # serve la build
```

> Node: usa la versione in `~/.local/bin` (`export PATH="$HOME/.local/bin:$PATH"`).

## Libreria sezioni (standard ConsulBuild)

Il design segue **lo standard ConsulBuild** (vedi `DESIGN.md` + `PRODUCT.md`),
distillato dai siti consegnati ai clienti reali: eyebrow con lineetta, titoli maiuscoli
con una frase in accent (`**...**` nel JSON), ritmo scuro/chiaro, CTA ricorrenti.

`Header` · `Hero` (A/B/C) · `TrustBar` · `ValueProp` (A/B) · `Services` (grid/list) ·
`ProcessSteps` (cards/timeline) · `Gallery` (grid/masonry) · `FeatureHighlight`
(left/right) · `WhyChooseUs` · `Testimonials` · `FAQ` · `CtaBanner` ·
`ContactCTA` (form/canali) · `Footer`.

Tutte data-driven: nessun testo o immagine hardcoded, tutto via `props`.

## Blueprint (scheletro-dati + golden example)

`blueprints/conversione-locale-v1/blueprint.json` è un sito completo (settore
edilizia) che segue l'ordine canonico dello standard: è insieme lo SCHELETRO che la
pipeline riempie (gli slot sono dichiarati in `slots.json`, vedi
`blueprints/README.md`) e il golden example renderizzato in dev. Le immagini usano
foto Unsplash verificate come placeholder; in produzione saranno URL generati
dall'API immagini (FLUX.2).

## Integrazione con l'editor (prossima fase)

L'editor scriverà il `site.json` del cliente, lancerà `npm run build` e farà il deploy
su Cloudflare Pages. Lo `schema.ts` è il punto di verità condiviso: gli agenti AI devono
produrre output conforme allo stesso schema.
