# Brief T5a — Contratto multipagina e renderer

Leggi prima `docs/traffico/README.md` (§1-§5) e `docs/traffico/decisioni-piani.md`. Dipende da
**T0** (stato del servizio Sito) e **T1a** (`docs/traffico/piano-T1a.md`: sitemap e `lastmod`
calcolati dall'editor su tutte le pagine indicizzabili della `dist`, JSON-LD della home passato
via `DATI_STRUTTURATI_JSON`, avvisi su title/H1/description, `_headers`). Contratti a valle:
**T5b** genererà il copy delle pagine, **T5c** le integrerà nella build dei clienti, **T6b**
aggiungerà le pagine per comune con i fatti di **T6a** (`docs/traffico/piano-T6a.md`) e le foto
dei cantieri di **T3** (`docs/traffico/piano-T3.md`).

## Obiettivo

Il renderer sa costruire, oltre alla home, un piccolo insieme di pagine indicizzabili per il
servizio Sito: **una pagina per servizio**, **Zone servite**, **Lavori** (indice) e **pagina del
singolo cantiere**, predisponendo il tipo **pagina comune** per T6b. Tutto con la grammatica di
design ConsulBuild e senza cambiare nulla dei siti senza pagine (HTML identico byte per byte).

## Decisioni che riguardano T5a

- Il multipagina è **additivo**: la home e gli slot per indice (`slots.json`) non cambiano;
  le pagine arrivano in un blocco nuovo e opzionale del contratto.
- Le pagine esistono solo per clienti con servizio Sito attivo o sospeso (decisione 3 e 11):
  l'editor le passa solo in quel caso; a servizio spento la `dist` resta identica.
- Fattore n. 1 dell'organico locale: pagina per servizio; poi rilevanza geografica e link
  interni (ricerca §3.2, §6.2): ogni pagina a ≤ 2 clic dalla home, ≥ 2 link in entrata, anchor
  descrittivi, niente pagine orfane raggiungibili solo dalla sitemap.
- Niente doorway: nessuna pagina servizio × comune; le pagine comune (T6b) solo con dati reali.
- URL stabili: slug definiti dall'editor e congelati (il registro è di T5c); il renderer li
  usa così come arrivano, con barra finale coerente con canonical e sitemap di T1a.
- Una sola H1 per pagina, title e description per pagina (avvisi di T1a).
- Sezioni ancora senza componente (ricerca §6.2): in T5a solo quelle che hanno dati reali in
  arrivo e servono alle pagine (valuta `Certifications` con i dati attestati di T3); le altre
  restano fuori e il guard di `registry.ts` resta com'è per quelle.

## Contesto da leggere

- `CLAUDE.md` (sezioni Flusso di rendering, Blueprint + slot, Lo standard ConsulBuild, Theming,
  Regole di qualità)
- `site-renderer/DESIGN.md`, `site-renderer/PRODUCT.md`
- `site-renderer/src/lib/schema.ts`, `src/lib/registry.ts`, `src/lib/loadSite.ts`, `src/lib/ui.ts`
- `site-renderer/src/layouts/Base.astro`, `src/layouts/SubPage.astro`
- `site-renderer/src/pages/index.astro`, `privacy.astro`, `anteprima/[preset].astro`,
  `anteprima-componenti/[preset].astro`
- `site-renderer/src/sections/{Header,Hero,Services,Gallery,ProcessSteps,FAQ,ContactCTA,CtaBanner,Footer,StickyCta}.astro`,
  `src/components/SectionHeader.astro`
- `site-renderer/blueprints/README.md`, `blueprints/conversione-locale-v1/{blueprint.json,slots.json}`
- `site-renderer/scripts/assemble-site.ts`, `scripts/validate-site.ts`, `scripts/check-overflow.mjs`
- `site-renderer/tests/visual.spec.ts`, `tests/a11y.spec.ts`, `playwright.config.ts`
- `site-factory-editor/lib/fondamenta.ts` (solo `elencoPagine`, `controllaPagina`) per la
  compatibilità con sitemap e controlli di T1a
- `docs/ricerca-traffico-2026-09.md` §2.3, §3.2, §4.2 (cosa hanno i siti che si posizionano),
  §6.2, §6.3 (gate anti-doorway), §7

Non leggere: editor UI, n8n, skill (arrivano in T5b).

## Cosa deve esistere a fine T5a

1. **Contratto** Zod additivo (`pages` o nome scelto nel piano) con tipi di pagina espliciti, id e
   slug stabili, meta per pagina, H1, sezioni riusando la union esistente dove possibile, dati
   per breadcrumb; validazione degli slug (unici, formato, nessun conflitto con `/privacy`,
   `/termini`, `/grazie`, asset).
2. **Route statiche** per le pagine; layout indicizzabile con navbar, footer e StickyCta (la
   `SubPage` noindex delle pagine legali resta com'è); 404 solo quando ci sono pagine;
   BreadcrumbList JSON-LD e breadcrumb visibile nelle pagine; link interni dalla home (card dei
   servizi → pagina servizio, galleria → Lavori) **solo quando le pagine esistono**.
3. **Componenti** per le sezioni specifiche delle pagine (dettaglio servizio, elenco zone con
   fatti e distanze, indice lavori, dettaglio cantiere con foto reali e didascalie), sulla
   grammatica di `DESIGN.md`, token e classi semantiche, 7 preset, AA, mobile 390 px prima.
4. **Blueprint**: esempio golden con pagine (servizi, zone, lavori, un cantiere) che valida e
   builda; anteprime per preset delle nuove pagine per VRT e a11y.
5. **Assembler e validatore**: il validatore conosce le pagine; l'assembler accetta le pagine da
   un file separato passato dall'editor (senza generarle: la generazione è T5b), senza toccare
   il merge per indice della home.
6. **Documenti**: piano chiuso, stato README §7, handoff; nota in `DESIGN.md` sulle pagine
   interne (grammatica, header, breadcrumb) solo se nascono regole nuove.

## Uscita verificabile

- Senza pagine: `dist` di una fixture clonata da un cliente identica byte per byte a prima.
- Con pagine (blueprint golden): tutte le pagine buildano, una H1 ciascuna, title e description
  propri, canonical corretto, link interni ≤ 2 clic, nessuna pagina orfana, breadcrumb valido,
  controlli di T1a (`controllaPagina`, `elencoPagine`) senza errori.
- `npm run build`, `npm run check` (solo l'errore noto di `registry.ts`, ridotto se nascono
  componenti), validatore, `test:visual` con nuove baseline per le pagine nuove e **baseline
  esistenti invariate**, `test:a11y`, `gate:overflow` a 390 px su parole lunghe italiane.
- Design giudicato con `/impeccable critique` e il design-critic della pipeline a 390 e 1280.

## Calibrazione (fase 3)

Ordine e densità delle sezioni della pagina servizio (conversione + risposta alla ricerca),
header con molte pagine su mobile, lunghezze massime dei campi nel contratto.
