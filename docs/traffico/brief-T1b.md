# Brief T1b — Pagine leggere

Leggi prima `docs/traffico/README.md` (§1-§5) e `docs/traffico/decisioni-piani.md` (in
particolare T1a e T5a punto 1: criterio di sicurezza a servizio spento). Dipende da **T1a**
(fondamenta cotte dalla build col servizio Sito) e dal criterio stabilito per **T5a**.

## Obiettivo

I siti con servizio Sito attivo o sospeso pesano poco e si caricano in fretta su mobile:
immagini responsive e compresse, dimensioni esplicite, caricamento pigro sotto la piega, hero
prioritario, font ridotti al necessario, e un **budget come gate** della build. Serve alla
conversione da mobile e ai Core Web Vitals; nel leak Google `clutterScore` penalizza le risorse
fastidiose, non il peso, quindi niente ottimizzazioni che cambino l'aspetto o tolgano contenuto.

## Fatti di partenza

- `site-renderer/out/cavaliere-build-srls/dist` pesa 9,8 MB: `hero.jpg` ~1 MB, 12 JPG da
  350-610 KB senza `srcset` né formati moderni, font ~1 MB (piano T1a/README §2).
- Le foto del form arrivano già dritte e senza EXIF/GPS (commit `d0c473b`,
  `site-factory-editor/lib/metadati-foto.ts`); le immagini generate arrivano da
  `site-renderer/scripts/generate-image.mjs`.
- `sharp` è presente in `site-renderer/node_modules`; `site-intake/scripts/check-budget.mjs` è un
  gate di budget già usato dal form (riusabile come modello).
- Decisione 3 (tutto attivabile): l'ottimizzazione vale per i clienti con servizio Sito attivo o
  sospeso. **Domanda aperta da porre nel piano**: estenderla a tutti i siti (qualità del prodotto)
  o tenerla dietro l'interruttore; finché Mattia non decide, dietro l'interruttore.

## Contesto da leggere

- `site-renderer/DESIGN.md` (media, rapporti, `media-frame`), `site-renderer/src/styles/global.css`
  (solo classi media e font-face), `src/lib/presets.ts`, `scripts/fetch-fonts.mjs`
- `site-renderer/src/sections/{Hero,Gallery,Services}.astro` e i componenti immagine
- `site-factory-editor/lib/build.ts` (fase media: copia in `public/media/<slug>/`, env di build),
  `lib/fondamenta.ts` (`controllaPagina`, avvisi)
- `site-intake/scripts/check-budget.mjs`, `site-renderer/tests/visual.spec.ts`,
  `playwright.config.ts`
- documentazione Astro 5 sulle immagini (`astro:assets`) e sui font, per decidere se usare la
  pipeline di Astro o una fase deterministica dell'editor con `sharp`

## Cosa deve esistere a fine T1b

1. Varianti delle immagini per larghezze e formati moderni (con fallback), `srcset`/`sizes`
   corretti per ogni uso, `width`/`height` espliciti, `loading="lazy"` e `decoding` sotto la
   piega, hero con priorità; nessuna perdita di qualità visibile sui 7 preset.
2. Font: solo pesi e set di caratteri usati dal preset assegnato, `font-display` coerente.
3. Budget per pagina come gate della build (peso totale, peso immagini, numero di richieste;
   soglie tarate su Cavaliere) con messaggio leggibile nella scheda Build & Pubblica.
4. A servizio spento: stesso criterio di sicurezza di T5a (HTML identico a meno degli hash degli
   asset, CSS solo additivo, VRT esistenti identici).
5. Documenti: piano chiuso, README §7, handoff, `docs/DEBUG.md`.

## Uscita verificabile

- Fixture clonata da Cavaliere con servizio attivo: home sotto la soglia di budget decisa in
  calibrazione, PageSpeed mobile ≥ 90 misurato in locale con Lighthouse o sulla preview (senza
  deploy su domini di clienti), nessuna immagine senza dimensioni, VRT delle anteprime entro soglia
  giudicata a occhio sulle immagini (Mattia rivede le schermate a fine piano).
- `npm run build`, `npm run check`, validatore, `test:visual`, `test:a11y`; editor `npx tsc
  --noEmit`, `npm run build`, banchi esistenti verdi.

## Calibrazione (fase 3)

Qualità AVIF/WebP/JPEG per foto reali e generate, larghezze delle varianti, soglie del budget.
