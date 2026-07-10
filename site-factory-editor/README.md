# site-factory-editor

Console locale della pipeline Site-factory (Fase C, parte 1). App Next.js per un solo
operatore: importa le PMI dal form Tally, revisiona i dati, genera e verifica il
**contesto arricchito** che alimenta gli agenti a valle. UI italiana, tema scuro.

## Prerequisiti

- Node in `~/.local/bin` (come il resto del repo): `export PATH="$HOME/.local/bin:$PATH"`.
- **Login Claude Max attivo**: lo step «Genera contesto» lancia `claude -p` headless col
  tuo login Max (nessuna `ANTHROPIC_API_KEY`, nessuna API a pagamento). Se la sessione
  scade, l'editor lo segnala: esegui `claude login` nel terminale e riprova.
- API key Tally: la incolli alla prima apertura (schermata «Configura Tally»); viene
  salvata in `../site-renderer/.env` (gitignored, mai committata).

## Avvio

```bash
cd site-factory-editor
npm install       # solo la prima volta
npm run dev       # http://localhost:3000
```

## Flusso

1. **Lista** (`/`): clienti già importati + submission Tally da importare. Prima volta:
   pannello per incollare la API key.
   - **Ricerca**: barra in cima che filtra live per nome azienda, referente o telefono
     (case/accento-insensitive, telefono per sole cifre), su importati E nuovi da Tally.
   - **Controlla nuovi dal form**: bottone che ri-interroga Tally e mostra le nuove
     richieste (dedup per `submissionId`, nessun duplicato). Lo script `intake-tally.ts`
     pagina tutte le submission del form (`--list-json`), quindi regge molti clienti.
2. **Importa**: lancia `intake-tally.ts` → crea `../site-renderer/out/<slug>/` (intake,
   brief, logo, raw-submission, client.json).
3. **Revisione intake** (`/clienti/<slug>/intake`): correggi i campi del form, i flag di
   qualità sono inline; salvare fa dual-write coerente brief+intake e segna «verificato».
4. **Genera contesto** (`/clienti/<slug>/contesto`): l'enricher (`claude -p`, Opus 4.8,
   effort xhigh) distilla il form in `contesto.json`; il log scorre live. Poi lo rivedi
   nell'editor e lo confermi (il gate di copertura blocca se un servizio non è assegnato
   a una macro-categoria).
5. **Palette** (`/clienti/<slug>/palette`): il palette-designer sceglie preset + colori
   (primary/accent) dal **contesto verificato** e li scrive in `palette.json` (mappa flat
   per l'assembler). La scheda mostra la scelta **applicata a una mini-preview** coi font
   e i neutri veri del preset, con tabella contrasti WCAG AA live, override manuale
   (picker + hex, «Accent = primary» di default) e il bottone «Scurisci finché passa»
   sul FAIL. Gate hard: una palette non-AA non si salva (422); al salvataggio fa fede
   `check-contrast.mjs` (lo stesso script della skill, spawnato server-side).
6. **Copy** (`/clienti/<slug>/copy`): pipeline **multi-fase orchestrata in TS**
   (`lib/steps.ts copyRun`): copywriter (contesto = verità: macro→card, promesse
   consentite/vietate, martello) → gate deterministico di formato → **critico
   avversariale** → correzioni SOLO sugli slot bocciati, fino a 3 round; al 3° FAIL
   decide l'umano col review in scheda. L'editor si legge come la pagina del sito
   (gruppi nell'ordine delle sezioni): pannello critico in testa con [vai al campo →],
   contatori live sui budget di `slots.json` (conteggio senza `**`, stessa definizione
   del validatore — `lib/slots-shared.ts`), anteprima della frase **accent** col colore
   vero della palette, righe-array coerenti per costruzione (card/trust/FAQ/passi),
   tabella di copertura con cross-check sul contesto, «Ricontrolla col critico» dopo
   le modifiche a mano. Gate: un copy non conforme al contratto non si salva (422 con
   errori puntuali); `validateCopyArtifact` (`lib/slots.ts`) è lo SPECCHIO
   dell'assembler + i bound Zod del renderer — parity check in
   `scripts/parity-copy.ts` (`node --experimental-strip-types scripts/parity-copy.ts`).

## Staleness a valle (contesto → palette → …)

Ogni step a valle registra in `client.json` (`steps.<key>.upstream`) l'hash degli artifact
a monte al momento della generazione/conferma (`lib/staleness.ts`; le chiavi volatili
`verificato`/`generatedAt` sono escluse). Se il contesto cambia dopo, la scheda mostra il
banner «⚠ il contesto è cambiato» e la dashboard il badge ⚠; l'ack è la route generica
`POST /api/clients/<slug>/steps/<step>/ack-upstream`. Il copy registra in più `steps.copy.fonte`
un **estratto per-campo** (hash di identità/servizi+macro/promesse/punti di forza/tono/zona):
così «Aggiorna con l'AI» dice al copywriter COSA è cambiato e la modalità aggiornamento
rivede solo gli slot impattati preservando la curatela. Il contesto mantiene il suo
meccanismo fine per-campo (drift).

## Riconciliazione intake → contesto (niente doppio lavoro)

Se correggi l'intake DOPO aver generato il contesto, il contesto non resta stale:
- **Campi meccanici** (città, tipo clienti, tono, colori, foto, da-evitare) → sincronizzati
  **automaticamente** nel contesto al salvataggio, senza AI, senza perdere curatela.
- **Campi semantici** (settore, descrizione, cliente-tipo, azione, area, anno) → generano
  un **drift**: la scheda contesto mostra un banner con i campi cambiati e tre azioni:
  **Riallinea con l'AI** (l'enricher in *modalità update* rivede solo le parti impattate e
  preserva la curatela — servizi spostati/rinominati, note, promesse), **Rigenera da zero**,
  o **Ho sistemato a mano**. La provenienza è tracciata in `client.json` (`steps.contesto.fonte`).

## Memoria per PMI

Ogni cliente vive in `../site-renderer/out/<slug>/` (il filesystem È il database). Ci
torni in qualsiasi momento dalla lista per rivedere/modificare. `client.json` è di
proprietà della GUI (traccia gli stati degli step); gli script della pipeline non lo
leggono. **Backup**: la cartella `out/` è gitignored (dati cliente fuori da git) → il
backup è responsabilità tua (Time Machine).

## Architettura (per estenderla)

- `lib/paths.ts` — unico punto per i path del repo (root, out, bin). Il path ha uno
  spazio: sempre `spawn(bin, [args])`, mai stringhe shell.
- `lib/steps.ts` — **registry degli step AI**. Oggi solo `contesto`; palette/copy/immagini
  si aggiungono qui come nuove entry, non come nuove route (`/api/clients/[slug]/run/[step]`
  è generico).
- `lib/run-step.ts` — spawn `claude -p`, parse stream-json, timeout, validazione
  deterministica post-run.
- Contratto invariato con la pipeline: ogni step produce un artifact JSON su disco;
  l'umano lo rivede prima dello step successivo.
