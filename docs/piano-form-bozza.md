# Piano — Form bozza (`site-intake/`, sito.consulbuild.com)

Piano vivo della scheda. Il piano approvato sta in
`~/.claude/plans/buzzing-swimming-lightning.md`; qui il decision log, lo stato e i punti
aperti. Ricerca alla base: `docs/ricerca-intake-lead-2026-09.md` e
`docs/ricerca-storage-foto-lead-2026-09.md`; domande approvate nel documento vivo
«Domande del form bozza» (v4, 2026-09-07). Progetto: `site-intake/` (README con
architettura e comandi, `PRODUCT.md` per il design).

## Decisioni (Mattia, 2026-09-07)

- **Solo il form** in questa scheda: le risposte e i file finiscono in
  `site-intake/.dev-inbox/<leadId>/` con lo stesso contratto HTTP che useranno i webhook
  n8n (scheda B); l'import nell'editor è la scheda C.
- **Progetto Astro dedicato**, statico, zero framework UI, pubblicato come Worker con assets
  su `sito.consulbuild.com`. **Caricamento istantaneo** come requisito: budget misurato da
  `scripts/check-budget.mjs` (HTML+CSS ≤25 KB, JS ≤35 KB, font ≤45 KB, totale ≤110 KB gz).
- **Web font con personalità**: Atkinson Hyperlegible Next (variabile 200-800, un solo
  file da 33 KB, self-hosted), scelto perché disegnato per chi vede meno bene. Alternativa
  pronta: Bricolage Grotesque sui titoli (è un token).
- **Fondo navy dell'hero con card bianca**, blu `#2563eb` unico accento, mono-tema.
- **Foto in qualità originale, massimo 15**, chieste a metà form con upload in background
  (M3); nessuna compressione sul telefono.
- **Privacy: presa visione, non consenso.** La skill `informativa-breve-form` ha
  stabilito la base giuridica art. 6.1.b (misure precontrattuali): la casella finale è
  «Ho letto l'informativa sulla privacy». Testo in `site-intake/legale/informativa-breve.md`
  (validato) e `src/data/privacy.ts`. Da verificare: l'informativa completa su
  consulbuild.site/privacy-policy deve coprire questo modulo.
- **Disponibilità del nome del sito via DNS-over-HTTPS** (Cloudflare, CORS aperto): il
  Registro .it non ha RDAP e le API GoDaddy sono riservate a 50+ domini. Esito prudente,
  salvato nel lead e riverificato all'acquisto.
- **Comune dall'elenco ISTAT** (7.904 voci, a pezzi per iniziale, tolleranza ai refusi),
  via scritta a mano: «non trovo il mio indirizzo» non deve mai bloccare.
- **Controlli che spiegano e non bloccano**: l'unico blocco è la presa visione privacy;
  gli avvisi hanno «Va bene così, continua» e segnano il dato da verificare.

## Stato

- **M0 fatto** (commit 140e2db): scaffold, token, layout, font, inbox dev, comuni, budget.
- **M1 fatto** (a1e33a9): motore, 21 domande in configurazione, scelte, testo/telefono/email,
  sipario e scaglioni, progresso, autosalvataggio, ripresa, History.
- **M2 in chiusura**: Partita IVA, sito attuale, nome del sito, sede, zone, stile, colori,
  social, presa visione con dialog, riepilogo con «Modifica» e ritorno, invio, «Fatto».
  Test Playwright: `controlli.spec.ts` (validators) e `flusso.spec.ts` (percorso completo
  su telefono/tablet/computer + ripresa). Scoperto e corretto: un tocco nei 130 ms finali
  della transizione veniva ignorato.
- **M3 fatto** (0468cd1): foto e logo con coda in background (2 in parallelo, retry
  0/1/3/5 s, miniature dal decoder, HEIC e foto piccole segnalate, max 15, 25 MB per
  file), pannello di attesa con onde, rivelazione blu, «Fatto» rovesciato; test
  end-to-end con caricamenti reali.
- **M4 in corso**: craft-floor letto; detector impeccable su `dist` → tre rilievi
  accettati e motivati in `site-intake/DESIGN.md` (bordo del sipario, ombra blu della
  CTA, padding della card nei figli); contrasto errori alzato (rosso 700) e testi
  secondari sulle scelte selezionate a ink-2 dopo axe; pannello di attesa ad altezza
  normale; dialog privacy con testo scorrevole e bottone sempre visibile; schermate a 9
  larghezze (`tests/schermate.spec.ts`), axe (`tests/a11y.spec.ts`), README e DESIGN.md
  scritti, `wrangler.jsonc` pronto; finish review con agente separato (istruzioni del
  finish reviewer di impeccable in modalità degradata: gli agenti nativi della skill non
  sono installati in questo harness). **Esito «fix» con 8 correzioni materiali, tutte
  applicate**: fondo chiaro di «Fatto» anche su `<html>`, card che si accorcia con
  transizione all'invio, primo passo in 680 px (test `390x680-01`), niente etichette
  impilate né eyebrow duplicata, spunta SVG, nomi presi non selezionabili, primo passo
  statico senza animazione, card «Fatto» a misura e binario sticky. Verdict pass: 7
  risolti, 1 parziale (card «Fatto» stirata a ≥1024 dallo stretch della scena) e una
  regressione (righe della griglia disuguali a 390) → corretti con `align-self` sulla
  card finale e `grid-auto-rows: 1fr` con spazi compensati sotto i 430 px; secondo
  verdict pass sui due punti: **ship** (copre i fix punteggiati), nessuna regressione.
- **Scheda chiusa il 2026-09-07.** File toccati rispetto al piano: tutto dentro
  `site-intake/**` (come previsto), `docs/piano-form-bozza.md`, `docs/handoff-fase-c.md`;
  nessun file fuori perimetro. Fuori scheda, come da piano: webhook n8n e Drive
  (scheda B), import nell'editor (scheda C), deploy su `sito.consulbuild.com` (solo su ok
  di Mattia), test su iPhone reale dentro Instagram, Lighthouse (non eseguito: il gate del
  budget copre i pesi; da lanciare sul sito pubblicato).

## Rilievi del detector accettati (2026-09-07)

`side-tab` su `.sipario::before` (bordo del sipario dal video, non accento su card);
`dark-glow` sull'ombra della CTA (offset 10 px, sfocatura 28 px, sta sulla card bianca);
`cramped-padding` sulla `.card` (il padding vive in testata, progresso e passo). La
regola generica di impeccable contro gli eyebrow sopra i titoli non si applica: l'eyebrow
di sezione è il nome della sezione (pattern GOV.UK «caption»), grammatica ConsulBuild.

## Lezioni

- In un tab del browser nascosto Chrome rallenta i timer a uno al secondo: le prove
  manuali via JavaScript sembravano rotte, il codice no. Le verifiche affidabili sono i
  test Playwright headless.
- I selettori di test devono usare i ruoli o le classi del componente: i testi delle
  scelte con sottotitolo e l'annuncio per screen reader creano doppioni.

## Scheda B (2026-09-07): webhook n8n → Google Drive — FATTA

Piano in `~/.claude/plans/buzzing-swimming-lightning.md` (sostituisce quello del form);
guida e verifica in `docs/vps-integrazioni-setup.md` §10. Decisioni: id del lead in
query (`?id=`) perché n8n con `:id` nel path antepone l'id del nodo; file piatti nella
cartella del lead (`foto-NN-<nome>`, niente sottocartella: una cartella in meno da creare
in concorrenza); stesso nome = aggiornamento (retry senza doppioni); il form serializza le
richieste fino alla prima risposta 2xx (cartella creata una volta sola); autosalvataggio
su Drive come `bozza.json`; Telegram con solo id e conteggi; pulizia a 60 giorni con
allarme oltre 300 cartelle; **Turnstile rimandato** (rischio basso, si aggiunge se
compare spam). Scoperte: consulbuild.com non era su Cloudflare (Mattia ha spostato i
nameserver: prerequisito del Worker con dominio custom); i service account Google non
scrivono più nel «Mio Drive» → OAuth dell'account agenzia. File toccati rispetto al
piano: tutti quelli elencati tranne `site-intake/playwright.config.ts` (non serviva: le
env passano da sole al server di sviluppo).

## Pubblicazione (2026-09-07)

Online su **https://sito.consulbuild.com** (scelta di Mattia: «sito» parla del risultato
promesso, non del mezzo), Worker `sf-bozza`, build con `PUBLIC_INTAKE_URL` verso n8n,
record DNS creato da wrangler nella zona Cloudflare.

## Scheda C (2026-09-07): import nell'editor — FATTA

`site-factory-editor/lib/inbox-form.ts`: le richieste complete (con `lead.json`) della
cartella Drive sincronizzata compaiono in home accanto a quelle Tally (chip
«sito.consulbuild.com»); «Importa» crea `out/<slug>/` con `brief.json` (mappa
`risposte → brief`, campi propri `servizi[]`, `punti_di_forza[]`, `esperienza_anni`,
`dominio_scelto`, `provincia`, `regione`; campi non chiesti dal form vuoti per
costruzione), `intake.json` (11 slot), `raw-submission.json` (= lead.json),
`logo.<ext>`, `foto-originali/` (qualità originale) e `img/lavoro-N.jpg` a 1600 px
via `sips` + `lavori.json` (massimo 12 in Gallery), `client.json`; poi la cartella
sparisce da `_inbox` (Cestino di Drive). Controllo di sincronizzazione prima di
scrivere (Drive Desktop può mostrare segnaposto). L'API di import riconosce la fonte
dall'id (nessuna modifica al pulsante). Scheda «Revisione intake» con le righe nuove.
Tassonomia: copia dei testi nell'editor (Turbopack non importa fuori radice) con
guardia di deriva nel banco di prova `scripts/test-import-form.ts`. Skill
`context-enricher` istruita sui brief dal form. Verificato: banco di prova, build,
catena reale n8n → Drive → Mac → editor (lista, import, scheda, pulizia).
Fuori scheda: symlink `out/` → Drive (backup, indipendente da questo import).

## Punti aperti

1. **Link «informativa completa» del form**: punta a consulbuild.site/privacy-policy, sito
   che Mattia non usa più. Prima di riaccendere l'annuncio va puntato a una pagina valida
   (es. una pagina privacy su sito.consulbuild.com). Deciso il 2026-09-07 di non toccarlo ora.
2. Test su iPhone reale dentro Instagram (Mattia, con il link pubblicato).
3. Turnstile, se compare spam (`PUBLIC_TURNSTILE_SITE_KEY` già prevista nel form).
4. Symlink `site-renderer/out` → Drive (strategia di backup, memoria `backup-strategia`).
