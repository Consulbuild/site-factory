# Piano — Form bozza (`site-intake/`, bozza.consulbuild.com)

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
  su `bozza.consulbuild.com`. **Caricamento istantaneo** come requisito: budget misurato da
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
- **M3**: foto e logo (upload in background), pannello di attesa con onde, rivelazione blu.
- **M4**: rifinitura con impeccable (craft-floor, detect, critique, finish reviewer,
  documenter → DESIGN.md), schermate a 9 larghezze, axe, Lighthouse, README completo,
  `wrangler.jsonc`, handoff.

## Lezioni

- In un tab del browser nascosto Chrome rallenta i timer a uno al secondo: le prove
  manuali via JavaScript sembravano rotte, il codice no. Le verifiche affidabili sono i
  test Playwright headless.
- I selettori di test devono usare i ruoli o le classi del componente: i testi delle
  scelte con sottotitolo e l'annuncio per screen reader creano doppioni.

## Punti aperti

1. Piano Workspace e quota Drive (scheda B).
2. Turnstile: chiavi e verifica lato n8n (scheda B).
3. Informativa completa del sito da estendere a questo modulo (Mattia con la catena legale).
4. Test su iPhone reale dentro Instagram (Mattia, con il link di anteprima).
