# Brief T1a — Fondamenta SEO dietro l'interruttore

Leggi prima `docs/traffico/README.md` (§1-§5). Dipende da **T0** (`docs/traffico/piano-T0.md`):
lo stato del servizio vive in `client.json.traffico`, le regole pure in
`site-factory-editor/lib/traffico.ts` (`leggiTraffico`, `fondamentaAccese`, `cicloAttivo`).
Se T0 non è ancora committato, pianifica sulle firme di `piano-T0.md` §3-§4.

## Obiettivo

Quando il servizio Sito è `attivo` o `sospeso` e il cliente ha un dominio, la build del sito
emette le fondamenta tecniche SEO; quando è `spento` l'output è **identico a oggi byte per byte**.
Il deploy rifiuta una build che non corrisponde allo stato atteso.

## Cosa comprende

1. **robots.txt per cliente**: oggi `site-renderer/public/robots.txt` è statico e condiviso.
   A servizio spento il contenuto resta identico; ad acceso: allow-all (anche ai crawler AI,
   decisione della ricerca §6.1) + riga `Sitemap: https://<dominio>/sitemap.xml`. Le demo non
   cambiano.
2. **sitemap.xml** con i soli URL indicizzabili (oggi: la home; privacy/termini/grazie sono
   noindex e restano fuori), `lastmod` onesto: cambia solo quando cambia il contenuto visibile
   della pagina (hash del testo, non la data di build), registro persistito per cliente in
   `out/<slug>/traffico/`. Il piano sceglie dove calcolarlo (post-build in `lib/build.ts` sulla
   `dist` oppure nel renderer) motivando: deve essere deterministico e testabile senza rete.
   Deve funzionare anche quando T5a aggiungerà pagine (lista URL generica).
3. **JSON-LD** nella home: `@type` più specifico tra i sottotipi schema.org di
   `HomeAndConstructionBusiness` (GeneralContractor, Plumber, Electrician, HousePainter,
   RoofingContractor, HVACBusiness, …) mappato dal mestiere del cliente, altrimenti
   `HomeAndConstructionBusiness`. **Solo campi reali**: name, url, telephone, email, address
   strutturato (via, CAP, comune, provincia), vatID/taxID dalla P.IVA, logo, image (hero),
   sameAs (social reali), areaServed solo se esiste un elenco reale (comuni del mini-form T3;
   finché manca, niente), `hasOfferCatalog` o `makesOffer` solo con i servizi di
   `contesto.json`. **Mai** `aggregateRating`/`review` (policy self-serving), mai FAQPage come
   leva (rich result rimossi), mai `geo` inventato. I dati arrivano al renderer da un file JSON
   generato dall'editor (percorso passato via env di build, come `SITE_JSON`), non da nuovi
   campi obbligatori di `site.json`. Escape sicuro nel `<script type="application/ld+json">`.
4. **Chiave IndexNow**: generata una volta per cliente, persistita in `out/<slug>/traffico/`,
   pubblicata come file `<chiave>.txt` alla radice della `dist` (verrà usata da T2a).
5. **Interlock**: la build registra se ha cotto le fondamenta (e con quale dominio); il deploy
   rifiuta con messaggio leggibile se non coincide con `fondamentaAccese(traffico)` e il dominio
   atteso, nello stesso stile dei controlli esistenti su `siteUrl` e integrazioni.
6. **Title/description**: nessun cambio al copy; controlla solo che il title della home non
   superi i limiti e che canonical e URL in sitemap coincidano (barra finale).

Fuori da T1a: pagine nuove (T5a), breadcrumb (arriva con le pagine), immagini (T1b), verifica
Search Console e ping (T2a), UI (il pannello arriva con T2b; al massimo una riga di stato nella
scheda Traffico se serve a capire perché il deploy è rifiutato).

## Contesto da leggere

- `CLAUDE.md` (sezioni Renderer, Flusso di rendering, Theming: per non rompere i preset)
- `site-renderer/src/layouts/Base.astro`, `site-renderer/src/layouts/SubPage.astro`,
  `site-renderer/astro.config.mjs`, `site-renderer/src/lib/loadSite.ts`,
  `site-renderer/src/lib/schema.ts` (solo `MetaSchema`, `ContactSchema`, radice),
  `site-renderer/src/pages/*.astro`, `site-renderer/public/robots.txt`
- `site-factory-editor/lib/build.ts` (env passate ad Astro, fase media, stato build),
  `site-factory-editor/lib/deploy.ts` (interlock esistenti), `site-factory-editor/lib/schemas.ts`
  (step build), `site-factory-editor/lib/traffico.ts` (da T0)
- dati reali di forma: `site-renderer/out/cavaliere-build-srls/{brief.json,contesto.json,
  site.json,raw-submission.json}` (non riportare dati personali nei documenti)
- `site-intake/src/data/tassonomia.ts` (id dei mestieri) e `site-factory-editor/lib/inbox-form.ts`
  (come mestiere e sede arrivano nel brief)
- `docs/ricerca-traffico-2026-09.md` §2.3, §6.1, §7, §9 (solo queste)
- Google: https://developers.google.com/search/docs/appearance/structured-data/local-business ,
  https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap (leggi le
  regole su lastmod), https://www.indexnow.org/documentation

Non leggere: skill, n8n, editor UI, fabbrica.

## Uscita verificabile

- Fixture `out/zz-test-t1a` clonata da Cavaliere (senza `dist`, slug diverso, client.json con
  dominio di prova): build con servizio spento → `dist` identica (diff ricorsivo vuoto) alla
  build della stessa fixture fatta **prima** delle modifiche; build con servizio attivo →
  robots con Sitemap, sitemap valida (XML ben formato, URL assoluti = canonical), JSON-LD
  valido (parse + campi obbligatori Google + nessun campo vietato), file chiave IndexNow.
- Ribuild senza cambi di contenuto → `lastmod` invariati; cambio di un testo in home →
  `lastmod` della home aggiornato.
- Deploy rifiutato (senza chiamare wrangler) quando build e stato atteso non coincidono;
  accettato quando coincidono (test con `deployClient` fermato prima di wrangler o con banco).
- `npm run build` + `npm run check` (renderer, con l'errore atteso noto di `registry.ts`),
  validatore su blueprint, `npm run test:visual` e `test:a11y` invariati; editor `npx tsc
  --noEmit` + `npm run build`; banco nuovo `site-factory-editor/scripts/test-fondamenta.ts`
  senza rete; banchi esistenti verdi.
- Fixture rimosse a fine lavoro; Cavaliere non ribuildato né toccato.

## Calibrazione (fase 3)

Campi del JSON-LD e mappa mestiere → tipo schema.org (verificare ogni tipo su schema.org);
normalizzazione del testo per l'hash di lastmod (niente falsi cambi da asset o whitespace).

## Domande aperte da decidere nel piano

- Dove calcolare sitemap e lastmod (editor post-build o renderer) — scegli e motiva.
- Come trattare l'host `*.workers.dev` che resta attivo (oggi coperto solo dal canonical).
