# Handoff Fase C — stato dei lavori e prossimi passi (aggiornato 2026-09-12)

Regole, architettura e mappa del repo sono in `CLAUDE.md` (letto automaticamente); il
debug delle run in `docs/DEBUG.md`; la UI dell'editor in
`site-factory-editor/DESIGN-SYSTEM.md`. Qui solo lo stato corrente, i punti aperti e le
prossime schede.

## Stato (tutto verificato E2E)

- **Editor**: schede Intake, Contesto, Palette (+ assegnazione deterministica del
  preset), Logo (riga con le 3-6 varianti PNG di GPT Image e il motivo del critico;
  il lockup col nome si genera nella catena, la scelta si cambia a mano senza
  rigenerare), Copy (3 round di
  critico dopo il gate anti-slop `check-slop.mjs`), Immagini (+ «I nostri lavori» da
  foto reali), Legale (foro con evidenza, catena a 3 lenti, conferma condizionata),
  Build (deterministica, anteprima :4399), Deploy su Cloudflare Workers con dominio
  custom, dashboard clienti (Stripe/Gatus/n8n/Umami), Impostazioni (chiavi nel Keychain,
  login Claude sorvegliato). Run in background (`lib/run-bus.ts`), status bar agenti,
  staleness a valle con ack. Piani vivi: `docs/piano-scheda-legale.md`,
  `docs/piano-dashboard-clienti.md`.
- **Modalità demo** (2026-09-08): lead dal form → «Avvia demo» → catena automatica
  (`lib/catena.ts`: coda a 2, riprendibile, si ferma al primo critico FAIL) → build
  `noindex` → «Pubblica demo» su `<nome-azienda>.demo.consulbuild.com` (worker
  `<slug>-demo`, scadenza 15 gg, sweep orario da `instrumentation.ts`). «Il cliente si
  è abbonato» → percorso completo → legale → dominio → build → deploy (spegne la demo).
  Provato E2E su `zz-test-demo`.
- **Form bozza** (`site-intake/`, online su https://sito.consulbuild.com dal
  2026-09-07): 21 domande, foto in originale, presa visione privacy; n8n `sf-bozza` →
  Google Drive `_inbox/<leadId>/` → «Importa» nell'editor (`lib/inbox-form.ts`).
  Foto, originali e logo JPEG escono dritti e senza EXIF/GPS (2026-09-14, `lib/metadati-foto.ts`,
  banco `scripts/test-metadati-foto.ts`). Tally dismesso. Piano vivo: `docs/piano-form-bozza.md`.
- **VPS e integrazioni** (2026-09-05/06): build con dominio → Umami + modulo reale;
  deploy → registro n8n + monitor Gatus; report mensile al rinnovo via Stripe
  `invoice.upcoming` → n8n → Brevo (tabelle Lead/Report; il primo report reale parte da
  solo al prossimo rinnovo di Cavaliere). Guida: `docs/vps-integrazioni-setup.md`.
- **Fabbrica dei preset**: completa (M0–M9), libreria a 7 preset con «ferro» dal
  pilota (`docs/piano-fabbrica-design-2026-07.md`). Prossimo passo naturale: la prima
  run con riferimenti reali scelti da Mattia.
- **Logo con GPT Image** (2026-09-13, sostituisce Recraft): step `logo` = brief dal
  logo-designer → prompt di solo contesto composto in `lib/logo.ts` → 3 varianti
  `gpt-image-2.5-sunburst` (≈0,24 $ a cliente, demo incluse) → foglio di contatto +
  metriche → logo-critic (trascrive e osserva) → verdetto in TS → favicon dal
  simbolo; un round in più al massimo, poi decide l'umano. Ricerca in
  `docs/logo-ricerca/`; banco `scripts/test-logo-gates.ts`. **Lockup orizzontale
  standard dal 2026-09-14** (decisione Mattia: il lockup impilato a 40 px rendeva
  il nome illeggibile nell'header): riga 3 del prompt chiede il nome a destra del
  simbolo; `generate-logo.mjs` cerca il simbolo prima come blocco sinistro
  (colonna trasparente) poi come blocco superiore; gate `proporzioni` = ratio
  fuori 2–8; header a 40/48 px per il lockup (`Header.astro`); rubrica P4 del
  logo-critic aggiornata (100–260 px). Prova reale su Mattia Saggin Costruzioni:
  `logo/mark-4.png` (ratio 4,47, simbolo rilevato, favicon via edits ok). Da
  fare: i clienti con lockup impilato già generato vanno rigenerati dalla riga
  Logo; la taratura del critico (oro impilato) andrà ripetuta con loghi
  orizzontali. **Critico tarato il
  2026-09-13** (`scripts/calibrate-logo-critic.ts`, report in
  `factory/calibration/report-logo-critic.json`): 6 item oro in
  `scripts/fixtures/logo-gold/` (3 loghi ChatGPT approvati da Mattia + 3 clienti
  fittizi × 3 varianti generate dalla pipeline con `scripts/genera-logo-gold.ts`,
  costo reale 0,042 $ a immagine), 2 run ciascuno: gate superato, stabilità 1,
  scelta = umana 10/10, zero pari merito. Logica di selezione emersa dalle scelte
  di Mattia e portata nella skill: monogramma dell'iniziale INTERA del cliente
  batte il simbolo generico di mestiere (P2 doppio, P6 forme complete con test
  sul PNG nativo), tra monogrammi vince la resa più piatta (P5 senza texture);
  scala 0–4, classifica comparativa come spareggio. Per allenare ancora: nuova
  cartella con `brief.json` + `contesto.json` + `atteso.json`, `genera-logo-gold`
  (max 9 immagini a run), Mattia indica `scelta_umana`, calibratore con
  `--force`. Da fare: la prima run reale su un cliente senza logo.

- **Solidità degli stati** (2026-09-14, audit + 13 fix, piano
  `vectorized-petting-snowglobe`): regole pure in `lib/stati.ts` (il solo critico
  non cambia mai lo stato; decisione della catena su un passo; flag «auto»), banco
  `scripts/test-stati.ts`. Staleness con snapshot a null (file comparso/sparito =
  stale, `lavori.json` tra gli upstream della build); stop tardivo non marca
  «errore»; `STEP_MODES` per step (400 su mode estraneo); intake salvato a mano
  toglie «auto»; gate della build unico (immagini verificate per la completa) per
  route/catena/hub/scheda; Legale «non serve in demo»; dominio rifiutato in demo
  (409) e `rebuildPerPercorso` nella scheda; **la catena si ferma e lo dice** su uno
  step verificato ma cambiato a monte (decisione Mattia; il logo è escluso finché la
  riga Logo non ha «Va bene così»); un run manuale cancella la conclusione della
  catena; errore del contesto visibile nell'editor con «Riprova»; `client.json`
  fuori schema non viene più rinominato/azzerato: banner rosso, scritture rifiutate.
  Fuori scope: «Va bene così» per la build, staleness sui sorgenti del renderer.
- **Scheda «Build & Pubblica» unificata** (2026-09-14, studio UX impeccable modo
  Operate + piano): UNA scheda per tutta la pubblicazione — blocco demo
  (`components/pubblicazione-demo.tsx`: pubblica/ripubblica/riaccendi, WhatsApp, copia
  link, proroga con dialog, spegni, «Il cliente si è abbonato» in ogni stato, demo
  scaduta/spenta-da-te/scaduta-e-spenta, spegnimento fallito con riprova, dominio
  legacy da rimuovere) e blocco sito (`pubblicazione-sito.tsx`: chiavi Cloudflare,
  dominio, motivi di ribuild in elenco, online/integrazioni, deploy fallito persistito
  in `steps.build.deployErrore`, demo ancora accesa). `build-panel.tsx` decide stato →
  (primaria, frase della bar, azioni): la primaria vive SOLO nell'action bar fissa, a
  sinistra il perché («Pronto per …» / «… bloccata: …» / «Niente da fare»), mai
  `title`; tutto disabilitato con un run vivo; «Anteprima parziale» chiede conferma se
  c'è qualcosa online. La card Catena dell'hub tiene solo stato + Avvia/Riprendi/Ferma
  + «Apri Build & Pubblica →»; badge «demo scaduta» (predicato `demoScaduta`);
  `lib/preview.ts previewRoot()` dice di quale cliente è l'anteprima :4399. Verificato
  su un cliente di prova per gli stati A1/A6/A8/B2/B8, entrambi i temi, 1280 e 400 px;
  detector impeccable pulito. Fuori scope: storico delle pubblicazioni, verifica DNS.
- **Traffico T0 — area «Traffico»: forma e scheletro** (2026-09-14, piano chiuso in
  `docs/traffico/piano-T0.md`): voce «Traffico» in sidebar → portafoglio `/traffico`
  (gruppi non leggibile / accesi / spenti / demo) → dettaglio `/traffico/[slug]` con le
  sezioni Sito e Scheda Google (Attiva… / Sospendi… / Riattiva… con conferma, date,
  vuoti onesti), riga compatta nell'hub dopo gli step. Stato in `client.json` →
  `traffico` opzionale (assente = spento, mai scritto dalla lettura); regole pure in
  `lib/traffico.ts` (`fondamentaAccese`, `cicloAttivo` per i piani successivi), banco
  `scripts/test-traffico-stato.ts`, route `POST /api/clients/[slug]/traffico` (400
  transizione, 409 demo e file illeggibile, 403/415 anti-CSRF). In T0 attivare registra
  solo stato e date: online non cambia nulla. Prossimo: T1a (fondamenta SEO).
- **Traffico T1a — fondamenta SEO dietro l'interruttore** (2026-09-14, piano chiuso in
  `docs/traffico/piano-T1a.md`): con il servizio «Sito» attivo o sospeso, un dominio e il
  percorso completo la build scrive robots con `Sitemap`, `sitemap.xml` con `lastmod` da
  hash del testo indicizzabile (registro `out/<slug>/traffico/lastmod.json`, ancorato
  all'ultima pubblicazione), JSON-LD reale in home (file `traffico/dati-strutturati.json`
  passato al renderer con `DATI_STRUTTURATI_JSON`), chiave IndexNow e `_headers` con
  `noindex` su workers.dev; a servizio spento la `dist` è identica byte per byte a prima
  (provato con un worktree sul commit precedente). Regole in `lib/fondamenta.ts`
  (`fondamentaAttese` unica per build e deploy), banco `scripts/test-fondamenta.ts`,
  interlock in `lib/deploy.ts` prima di wrangler, avvisi in `steps.build.fondamenta.avvisi`.
  Nessun cliente ribuildato. **Integrazione** (2026-09-14, chiusa dopo il collaudo finale,
  `90adaca`, `0376844`, `4e9f327`): la regola
  pura `motivoRebuildFondamenta` (`lib/traffico.ts`) fa rifare la build alla catena
  (`buildDaRifare`) e mette il motivo tra i `rebuildMotivi` della scheda Build (primaria
  «Builda il sito», attese calcolate nella pagina server); avvisi delle fondamenta in un
  banner warn nel blocco Pubblicazione; il dialog «Attiva Sito» dice che le fondamenta
  arrivano con la prossima build col dominio e vanno online solo pubblicando; con una build
  da rifare «Ripubblica» non compare in nessun ramo (anche a chiavi VPS mancanti). Aperto: il
  dettaglio `/traffico/[slug]` elenca ancora le fondamenta tra «Cosa comparirà qui».
- **Traffico T6a — fatti comunali da open data** (2026-09-14, piano chiuso in
  `docs/traffico/piano-T6a.md`): `site-renderer/data/comuni-fatti.json` (1,72 MB, in git,
  una riga per comune) con i 7.896 comuni al 1/1/2026, centri interni al poligono Istat,
  1.483 alias (codici soppressi, fusioni, riordino sardo), popolazione 1/1/2025, zona
  sismica DPC, zona climatica dall'allegato A del DPR 412/1993 (7.727 comuni) ed edifici
  residenziali 2011 per epoca (7.830 comuni, somma delle sezioni di censimento con il metodo
  scritto nel fatto), ogni fatto con fonte, URL, licenza e dicitura. Aggiornamento e consultazione con
  `scripts/fatti-comuni.ts aggiorna|mostra` (procedura annuale nel commento di testa),
  funzioni pure in `src/lib/fatti-comuni.ts` (`fattiComune`, `frasiFatto`, `cercaComune`,
  `distanzaKm` in linea d'aria con `citabile`, `comuniEntroKm`), banco senza rete
  `scripts/test-fatti-comuni.ts`. Nessuna pagina lo importa ancora (T5a/T6b). **Dataset
  dichiarato incompleto** (`completo: false`) solo per le famiglie 2021: aspettano
  `esploradati.istat.it`, in timeout dal pomeriggio del 14/09 (3 tentativi e 10 ricerche di
  altre copie ufficiali la sera, senza esito); gli edifici 2011 arrivano dal file per sezioni
  di censimento su `www.istat.it` (completamento `04d6203`, revisione `42edae0`/`ed8041c`,
  collaudato e chiuso: ricalcolo indipendente identico per 7.830 comuni). Il
  comando per completare le famiglie è nei punti aperti del piano. Tutti i 7.904 comuni del
  form si risolvono in un solo codice 2026: T3 parte da qui.
- **Traffico T1b — pagine leggere dietro l'interruttore** (2026-09-15, piano chiuso in
  `docs/traffico/piano-T1b.md`): ogni foto e logo dei componenti passa da `Foto.astro`; con il servizio «Sito»
  attivo o sospeso la build (fase «pagine leggere», `site-renderer/scripts/media-varianti.ts` con `sharp` 0.34.5,
  cache sul contenuto in `node_modules/.cache/media-varianti/`) scrive in `public/media/<slug>/v/` le varianti AVIF
  q90 + JPEG q95 (alla larghezza dell'originale il file stesso), il logo PNG senza perdita, la favicon leggera e
  l'og:image, e il manifest `out/<slug>/traffico/media-varianti.json` arriva al renderer con `MEDIA_VARIANTI_JSON`.
  `sizes` = larghezza resa per uso in `src/lib/media.ts`, × 2 nell'HTML (**decisione di Mattia: qualità degli
  originali anche con lo zoom**, candidato ≥ 2 × resa × DPR). Sottopagine con i font del preset precaricati. Dopo
  astro la fase «budget pagine» (`scripts/budget-pagine.ts`, profilo mobile di Lighthouse) accoda gli avvisi
  «Pagine leggere:» a `steps.build.fondamenta.avvisi`; bloccano solo i guasti tecnici. A servizio spento HTML
  identico (CSS + 2 regole `picture`). Banco `scripts/test-media.ts`. Nessun cliente ribuildato. Aperti: Lighthouse
  mobile 75 sulla home con la hero a 1920 px, varianti per tutti i siti o solo col servizio, `dist` ~4,8× su disco;
  schermate da rivedere in `~/.cache/site-factory/revisione-T1b/`.
  Revisione `e40e87c` (hero SVG/GIF, logo PDF con errore leggibile, tabella del budget, chiave della cache legata
  allo script) e collaudo finale del 15/09: suite verdi (banco 61/0), identità a servizio spento 12/12, E1-E7
  dall'editor sulla fixture poi cancellata; `load` della home da profilo Google 11,2 → 7,8 s. Ogni modifica a
  `media-varianti.ts` fa ricodificare tutte le foto alla prima build (cache da potare a mano, 114 MB).

## Clienti in `site-renderer/out/` (fuori git)

- `cavaliere-build-srls`: online su cavalierebuild.it con modulo reale e Umami;
  **resta la Conferma umana del legale** nella scheda.
- `costruzioni-generali-…`: in lavorazione (contesto verificato; palette e copy da
  verificare in scheda).

## Punti aperti (Mattia)

- Stripe: permesso «Balance read» sulla chiave ristretta (netto); collegare i 2
  abbonamenti live «Futur Service» e «Design project» quando entrano nell'editor;
  provare «Collega» dalla UI.
- n8n: cancellare da UI le righe di prova in `Lead` e `Report` (del 6/9).
- **Obbligo operativo** finché non è automatizzato: eliminare a mano (home → Elimina)
  i clienti non convertiti entro 60 giorni dall'invio del modulo, come promesso
  nell'informativa (n8n cancella solo la richiesta grezza su Drive).
- Form: test su iPhone reale dentro Instagram; Turnstile solo se compare spam.
- Backup: symlink `site-renderer/out` → Google Drive (memoria `backup-strategia`).

## Prossime schede (una per volta, sempre pianificando prima)

1. **Area «Traffico»** (in sviluppo dal 2026-09-14): roadmap viva, decisioni, stato
   dei 20 piani e lavoro manuale di Mattia in **`docs/traffico/README.md`**; ricerca a
   monte in `docs/ricerca-traffico-2026-09.md`, fonti primarie in `~/knowledge/seo/`.
   Due servizi attivabili per cliente: **Sito** (fondamenta SEO, multipagina, sensori,
   volano, report) e **Scheda Google** (scheda consigliata che Mattia inserisce a mano).
2. **Badge «da cancellare»** in home per i lead non convertiti a 60 gg (automatizza
   l'obbligo operativo sopra).
3. Idee minori: eventi Chiama/WhatsApp nell'hub; Gatus su scadenza certificati e disco
   del VPS; «ignora» per gli abbonamenti Stripe estranei.

Passate di design rimandate (2026-09-13, emerse dalla pulizia; ognuna = mini-scheda
con verifica visiva umana, mai da fare «di passaggio»):
- **Eyebrow in mono per nova e ferro**: i token lo prevedevano ma il CSS non li
  leggeva, quindi non è mai stato renderizzato né giudicato; ora il token è cablato
  (`--font-eyebrow`) e vale body ovunque. Riaprirlo richiede un peso mono ospitato
  (oggi solo JetBrains Mono 500, l'eyebrow è 700), screenshot a 390/1280 su hero
  scuro e fasce chiare, baseline VRT rigenerate e il tuo occhio.
- **Variante Servizi «compact» proposta dal critico**: il copy-critic segnalava la
  ridondanza desc/bullet in un campo che nessuna UI leggeva; tolto dalla skill per
  tenere il critico sulla rubrica. Da riprendere come loop completo: suggerimento nel
  pannello critico + azione «applica» che scrive `sections[3].variant` nell'intake.

## Verifiche standard per ogni scheda

`npx tsc --noEmit` + `npm run build` (editor) · parity dove c'è un contratto
(`scripts/parity-copy.ts`) · banchi di prova deterministici (`scripts/test-*.ts`) ·
run E2E sui clienti reali · passata /impeccable (shape PRIMA della UI, critique/polish
dopo, entrambi i temi; gli studi per scheda stanno in `DESIGN-BRIEF.md`) · commit +
push a verifiche passate (regola 7 di CLAUDE.md).
