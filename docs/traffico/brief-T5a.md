# Brief T5a — Contratto multipagina e renderer

Riallineato il 15/09 alle decisioni T3 12-14 e K1.

Leggi prima `docs/traffico/README.md` (§1-§5) e `docs/traffico/decisioni-piani.md` («Priorità assoluta», T3
punti 12-14, K1, T5a). Dipende da **T0** (stato del servizio Sito), **T1a** (`docs/traffico/piano-T1a.md`:
sitemap e `lastmod` calcolati dall'editor su tutte le pagine indicizzabili della `dist`, JSON-LD della home
passato via `DATI_STRUTTURATI_JSON`, avvisi su title/H1/description, `_headers`), **T1b** (immagini via
`Foto.astro`) e **T3** (zone servite dal form lead: `site-factory-editor/lib/zone-servite.ts`). Contratti a
valle: **T5b** genererà il copy delle pagine, **T5c** le integrerà nella build dei clienti. **T6b** (pagine
per comune) è sospeso: nessuna fonte verificata del luogo dei lavori.

## Obiettivo

Il renderer sa costruire, oltre alla home, un piccolo insieme di pagine indicizzabili per il servizio Sito:
**una pagina per servizio**, **Zone servite** e, se ci sono foto reali in `lavori.json`, l'indice **Lavori**
(senza comune né anno). Il JSON-LD della home dichiara `areaServed` dalle zone servite. Tutto con la grammatica
di design ConsulBuild e senza cambiare i siti senza pagine (criterio della decisione T5a punto 1).

## Decisioni che riguardano T5a

- Priorità assoluta: più traffico dall'Italia e dalle zone dove il cliente lavora; nessuna pagina fuori zona.
- Il multipagina è **additivo**: la home e gli slot per indice (`slots.json`) non cambiano; le pagine arrivano
  in un blocco nuovo e opzionale del contratto.
- Le pagine esistono solo per clienti con servizio Sito attivo o sospeso (decisione 3 e 11): l'editor le passa
  solo in quel caso; a servizio spento HTML uguale a meno degli hash, CSS solo additivo, VRT esistenti identici.
- Fattore n. 1 dell'organico locale: pagina per servizio; poi rilevanza geografica e link interni (ricerca
  §3.2, §6.2): ogni pagina a ≤ 2 clic dalla home, ≥ 2 link in entrata, anchor descrittivi, niente pagine orfane.
- Niente doorway: nessuna pagina servizio × comune, nessuna pagina comune; i comuni si coprono con «Zone
  servite» (`etichettaArea`, `comuniServiti`) e `areaServed`.
- Niente prezzi, abilitazioni, pagine cantiere né componente `Certifications` (T3 punto 13: non si raccolgono).
- URL stabili: slug definiti dall'editor e congelati (il registro è di T5c); il renderer li usa così come
  arrivano, con barra finale coerente con canonical e sitemap di T1a.
- Una sola H1 per pagina, title e description per pagina (avvisi di T1a); `testoIndicizzabile` ignora header,
  nav e footer; gli avvisi di T1a nominano scheda e campo (decisione T5a punto 7 e punto aperto di T1a).
- Nessuna chiave né API (K1 non riguarda T5a).

## Contesto da leggere

- `CLAUDE.md` (sezioni Flusso di rendering, Blueprint + slot, Lo standard ConsulBuild, Theming,
  Regole di qualità)
- `site-renderer/DESIGN.md`, `site-renderer/PRODUCT.md`
- `site-renderer/src/lib/schema.ts`, `src/lib/registry.ts`, `src/lib/loadSite.ts`, `src/lib/ui.ts`,
  `src/lib/media.ts`, `src/components/Foto.astro`
- `site-renderer/src/layouts/Base.astro`, `src/layouts/SubPage.astro`
- `site-renderer/src/pages/index.astro`, `privacy.astro`, `anteprima/[preset].astro`,
  `anteprima-componenti/[preset].astro`
- `site-renderer/src/sections/{Header,Hero,Services,Gallery,FAQ,ContactCTA,Footer,StickyCta}.astro`,
  `src/components/SectionHeader.astro`
- `site-renderer/blueprints/README.md`, `blueprints/conversione-locale-v1/{blueprint.json,slots.json}`
- `site-renderer/scripts/assemble-site.ts`, `scripts/validate-site.ts`, `scripts/check-overflow.mjs`
- `site-renderer/tests/visual.spec.ts`, `tests/a11y.spec.ts`, `playwright.config.ts`
- `site-factory-editor/lib/fondamenta.ts` (`elencoPagine`, `controllaPagina`, `datiStrutturati`,
  `testoIndicizzabile`) e `lib/zone-servite.ts` (`leggiZoneServite`, `zoneUsabili`, `areeServite`,
  `etichettaArea`, `comuniServiti`)
- `docs/ricerca-traffico-2026-09.md` §2.3, §3.2, §4.2, §6.2, §6.3, §7

Non leggere: editor UI, n8n, skill (arrivano in T5b).

## Cosa deve esistere a fine T5a

1. **Contratto** Zod additivo (`pages`) con i tipi servizio, zone e lavori, id e slug stabili, meta per
   pagina, H1, dati per breadcrumb; validazione degli slug (unici, formato, nessun conflitto con `/privacy`,
   `/termini`, `/grazie`, asset).
2. **Route statiche** per le pagine; layout indicizzabile con navbar, footer e StickyCta (la `SubPage` noindex
   delle pagine legali resta com'è); 404 solo quando ci sono pagine; BreadcrumbList JSON-LD e breadcrumb
   visibile; link interni dalla home (card dei servizi → pagina servizio, nav → Zone servite e Lavori) **solo
   quando le pagine esistono**.
3. **Componenti** per dettaglio servizio, elenco zone (aree servite, comuni con distanza in linea d'aria, fatti
   T6a con fonte) e foto dei lavori, sulla grammatica di `DESIGN.md`, immagini via `Foto.astro`, token e classi
   semantiche, 7 preset, AA, mobile 390 px prima.
4. **Editor**: `areaServed` nel JSON-LD della home dalle zone usabili, `testoIndicizzabile` senza header, nav e
   footer, avvisi di T1a con scheda e campo.
5. **Blueprint**: esempio golden con pagine (servizi, zone, lavori) che valida e builda; anteprime per preset
   delle nuove pagine per VRT e a11y.
6. **Assembler e validatore**: il validatore conosce le pagine; l'assembler accetta le pagine da un file
   separato passato dall'editor (senza generarle: la generazione è T5b), senza toccare il merge per indice.
7. **Documenti**: piano chiuso, stato README §7, handoff; nota in `DESIGN.md` sulle pagine interne solo se
   nascono regole nuove.

## Uscita verificabile

- Senza pagine: `dist` delle fixture clonate dai clienti uguale a prima a meno degli hash, CSS solo additivo,
  baseline VRT esistenti identiche.
- Con pagine (blueprint golden): tutte le pagine buildano, una H1 ciascuna, title e description propri,
  canonical corretto, link interni ≤ 2 clic, nessuna pagina orfana, breadcrumb valido, controlli di T1a
  (`controllaPagina`, `elencoPagine`) senza errori.
- `npm run build`, `npm run check` (solo l'errore noto di `registry.ts`), validatore, `test:visual` con nuove
  baseline per le pagine nuove e **baseline esistenti invariate**, `test:a11y`, `gate:overflow` a 390 px su
  parole lunghe italiane; banco `test-fondamenta.ts`, `tsc --noEmit` e build dell'editor.
- Design giudicato con `/impeccable critique` e il design-critic della pipeline a 390 e 1280.

## Calibrazione (fase 3)

Ordine e densità delle sezioni della pagina servizio (conversione + risposta alla ricerca), header con molte
pagine su mobile, lunghezze massime dei campi nel contratto, numero di comuni elencati nella pagina zone.
