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
  Tally dismesso. Piano vivo: `docs/piano-form-bozza.md`.
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

1. **Traffico ai siti dei clienti** (ricerca profonda 2026-09-14 in
   `docs/ricerca-traffico-2026-09.md`, fonti primarie in `~/knowledge/seo/`, sintesi
   nella memoria `strategia-traffico-lead`; supera la parte traffico della ricerca del
   07/09). Quattro piani in ordine: **A' Fondamenta e sensori** (sitemap, JSON-LD,
   Search Console e Bing verificati via API al deploy, IndexNow, PageSpeed, scheda
   «Visibilità», aspettative nel report) → **B' Sito strutturato** (pagina per
   servizio, zone servite con OSRM, lavori, FAQ, link interni, 4 componenti mancanti)
   → **C' Volano** (open data comunali + pagine-comune con gate anti-doorway, regole
   Search Console → proposta di pagina, rank sampling DataForSEO) → **D' Kit presenza**
   (portfolio consulbuild.com/clienti, kit NAP/QR/e-mail a un clic). Da fare subito
   senza codice: chiave DataForSEO nel Keychain e campione di 384 SERP; developer token
   Google Ads; service account Google Cloud. La scheda Google Business resta fuori
   scope per decisione di Mattia.
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
