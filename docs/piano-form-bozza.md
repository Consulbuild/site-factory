# Piano — Form bozza (`site-intake/`, sito.consulbuild.com)

Piano vivo della scheda: decision log, lezioni e punti aperti. Ricerca alla base:
`docs/ricerca-storage-foto-lead-2026-09.md` e, in archivio,
`docs/archivio/ricerca-intake-lead-2026-09.md`; le domande approvate («Domande del form
bozza» v4, 2026-09-07, non versionato) sono specchiate in `site-intake/src/data/`.
Progetto: `site-intake/` (README con architettura e comandi, `PRODUCT.md` per il design).

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

- **Scheda chiusa il 2026-09-07** (M0–M4, dettaglio nella storia git): motore e 21
  domande in configurazione, foto e logo con coda in background (2 in parallelo, retry
  0/1/3/5 s, miniature dal decoder, max 15, 25 MB per file), presa visione con dialog,
  riepilogo con «Modifica», invio e «Fatto»; test Playwright (`controlli`, `flusso` su
  3 dispositivi + ripresa, `a11y`, `schermate` a 9 larghezze); detector e finish review
  impeccable con 8 correzioni applicate e verdetto ship; `wrangler.jsonc` pronto.
  Lezione tecnica: un tocco nei 130 ms finali della transizione veniva ignorato (corretto).
- Non eseguito: Lighthouse sul sito pubblicato (il gate del budget copre i pesi).

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

1. Test su iPhone reale dentro Instagram (Mattia, con il link pubblicato).
2. Turnstile, se compare spam (da aggiungere insieme al codice che lo legge: nessuna
   env predisposta).
3. Symlink `site-renderer/out` → Drive (strategia di backup, memoria `backup-strategia`).

Chiuso il 2026-09-08: il link «informativa completa» del form punta alla pagina
`sito.consulbuild.com/privacy` (`src/pages/privacy.astro`).
