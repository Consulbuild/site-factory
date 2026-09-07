# site-intake — il form bozza (sito.consulbuild.com)

Il lead che clicca l'annuncio risponde qui a 21 domande in 7 sezioni e carica foto e
logo; le risposte alimentano la pipeline Site-factory che produce il suo sito in 48 ore.
Decisioni e ricerca: `docs/ricerca-intake-lead-2026-09.md`,
`docs/ricerca-storage-foto-lead-2026-09.md`, piano vivo `docs/piano-form-bozza.md`,
documento vivo «Domande del form bozza» (v4). Contesto prodotto per il design:
`PRODUCT.md`; sistema visivo: `DESIGN.md`.

## Comandi

```bash
export PATH="$HOME/.local/bin:$PATH"   # Node in ~/.local, niente Homebrew
cd site-intake
npm run dev            # http://localhost:4321 — in dev risposte e file finiscono in .dev-inbox/
npm run build          # dist/ (rigenera i comuni) + gate del budget di prestazioni
npm run check          # astro check (type-check)
npm test               # Playwright: controlli, percorso completo (telefono/tablet/computer), a11y, schermate
npm run test:a11y      # solo axe
npm run test:schermate # schermate a 9 larghezze in .impeccable/review/schermate/
npm run font           # riscarica il font self-hosted (src/styles/font.gen.css)
npm run comuni         # rigenera public/data/comuni/*.json da data-src/comuni.json
```

Prove utili in dev: `INBOX_DELAY_MS=1500 npm run dev` (server lento, si vedono barre e
attesa), `INBOX_FAIL_EVERY=3 npm run dev` (un file su tre fallisce: si vedono i retry).

## Architettura

Una pagina statica (`src/pages/index.astro`) con il primo passo già nell'HTML, così
compare prima del JavaScript. Poi il motore prende il controllo:

| Modulo | Ruolo |
|---|---|
| `src/data/domande.ts` | **Le 21 domande** come configurazione tipizzata (testo, aiuto, tipo, opzioni, obbligatoria, campo di destinazione). Specchio del documento v4. |
| `src/data/tassonomia.ts` | Mestieri → lavori, punti di forza, clienti, stili, colori, modi di contatto. |
| `src/data/privacy.ts` | Informativa breve (art. 6.1.b, presa visione) generata con la skill `informativa-breve-form` da `legale/informativa-breve.md`. |
| `src/lib/engine.ts` | Stato: passo corrente, risposte, avanti/indietro, salvataggio in `localStorage`, ripresa con `?r=<leadId>`. Niente DOM. |
| `src/lib/render.ts` | Monta un passo: eyebrow di sezione, h1, aiuto, componente, avviso, bottoni. Il **registro** tipo → componente. |
| `src/components/*` | Un modulo per tipo di domanda, stessa interfaccia `{ el, focus, leggi, valida }` (`base.ts`). |
| `src/lib/validators.ts` | Controlli puri (telefono, email, Partita IVA, nome del sito, social). Provati in `tests/controlli.spec.ts`. |
| `src/lib/comuni.ts` · `dominio.ts` | Elenco ISTAT a pezzi con ricerca tollerante; disponibilità del nome del sito via DNS-over-HTTPS. |
| `src/lib/upload.ts` · `immagini.ts` | Coda di caricamento (2 in parallelo, retry 0/1/3/5 s) e ispezione leggera delle immagini (HEIC, dimensioni, miniature dal decoder). |
| `src/lib/motion.ts` | Sipario tra i passi, ingresso a scaglioni, scossa d'errore, pannello di attesa, rivelazione blu. |
| `src/lib/transport.ts` | Le tre route HTTP verso il backend (dev: `dev/inbox.mjs`; prod: webhook n8n). |
| `src/lib/main.ts` | L'unico modulo che conosce gli id di `index.astro`: collega tutto, progresso, History, invio. |
| `src/lib/a11y.ts` · `analytics.ts` | Annunci per screen reader e focus; eventi Umami (no-op senza env). |

### Come cambiare una domanda

1. Testo, aiuto, obbligatorietà, opzioni: `src/data/domande.ts` (e `tassonomia.ts` per
   le liste). Le chiavi `id` sono le chiavi di `lead.json → risposte`: cambiarle rompe
   l'import nell'editor.
2. Un tipo di risposta nuovo: componente in `src/components/`, riga nel registro di
   `src/lib/render.ts`, forma del valore in `Risposte` (`domande.ts`), formattazione nel
   riepilogo (`components/riepilogo.ts`), un passo nel test `tests/flusso.spec.ts`.
3. Aggiornare il documento vivo «Domande del form bozza» e, se il dato ha un consumatore
   nuovo, `docs/piano-form-bozza.md`.

### Contratto di uscita (`lead.json`, versione 1)

`leadId`, `iniziatoAt`, `inviatoAt`, `formVersione`, `risposte` (chiavi = id delle
domande; forme in `Risposte`), `foto[]` e `logo` (manifesto della coda: `n`, `nome`,
`bytes`, `tipo`, `stato`), `fotoAttese`/`fotoArrivate`, `origine` (utm, fbclid, mestiere
dall'annuncio, user agent). I file: `foto-NN-<nome>`, `logo.<ext>` e `bozza.json`
(ultimo autosalvataggio) piatti accanto al JSON, nella cartella `<leadId>/`.

### Trasporto (dev = prod)

`PATCH {base}/lead?id=` autosalvataggio · `POST {base}/lead/file?id=` multipart
`{kind, index, file}` · `POST {base}/lead?id=` lead completo. `base` =
`PUBLIC_INTAKE_URL` alla build (prod: `https://n8n.consulbuild.com/webhook/bozza`,
workflow `sf-bozza` in `infra/n8n/bozza.json`, guida in
`docs/vps-integrazioni-setup.md` §10), altrimenti `/api` servito da `dev/inbox.mjs` in
`.dev-inbox/<leadId>/`. L'id sta nella query perché n8n, con `:id` nel path, antepone
all'URL l'id del nodo. Un file = una richiesta (≤25 MB): niente chunk, niente ripresa,
retry per file; stesso nome già presente = aggiornamento, mai doppioni. Finché il
backend non ha risposto 2xx una prima volta, le richieste partono una alla volta
(`transport.ts`): la cartella del lead nasce alla prima richiesta e non va creata due
volte da due richieste parallele.

## Design system

Token in `src/styles/tokens.css` (unica fonte di colori, tipo, spazi, raggi, ombre,
motion); componenti in `components.css`, `upload.css`; motion in `motion.css`. Mondo
visivo: fondo navy dell'hero di consulbuild.site con bagliore blu, card bianca, blu
`#2563eb` come unico accento, stati semantici separati. Carattere: Atkinson
Hyperlegible Next (variabile 200-800, self-hosted, 33 KB). Un solo tema. Dettagli e
motivazioni in `DESIGN.md`.

Motion (dal video di riferimento): sipario 450 ms `cubic-bezier(.2,0,0,1)` che copre la
card, scambio del passo sotto, ingresso a scaglioni 300 ms con 60 ms di ritardo per
figlio; selezioni con spunta a molla 200 ms; barra `scaleX` 500 ms; errore = comparsa +
scossa 4 px; invio = pannello con logo e onde; rivelazione = cerchio blu dal logo che
copre lo schermo, poi card blu su fondo chiaro. `prefers-reduced-motion` azzera tutto a
dissolvenze da 120 ms. Solo `transform`/`opacity`; le transizioni sono interrompibili e
la coda della transizione non blocca i tocchi.

## Prestazioni

`scripts/check-budget.mjs` fallisce la build oltre: HTML+CSS 25 KB, JS 35 KB, font
45 KB, totale 110 KB (gzip). Oggi: ~8,5 + 25 + 33 = 67 KB. Il primo passo è nell'HTML,
il CSS è inline, il font è preloadato, i comuni si scaricano per lettera solo alla
domanda «Dov'è la sede», Umami e Turnstile non stanno nel percorso critico.

## Accessibilità e dispositivi

Testo ≥16 px (domande 26-30 px), target ≥48 px, contrasto AA (verificato con axe in
`tests/a11y.spec.ts`), focus visibile 3 px, tastiere giuste (`inputmode`,
`autocomplete`), annuncio del cambio sezione in una regione `aria-live`, focus sull'h1 a
ogni passo, `dialog` nativo per l'informativa. Layout: card a tutta larghezza su
telefono, 640 px su tablet, 600 px + binario delle sezioni da 1024 px. Schermate di
controllo a 360/390/430/768/820/1024/1280/1440/1920 con `npm run test:schermate`.

Lezione: in un tab nascosto Chrome rallenta i timer a uno al secondo; per verificare il
motion e i tempi si usano i test Playwright, non il pannello browser nascosto.

## Deploy

`wrangler.jsonc`: Worker `sf-bozza` con static assets su un sottodominio di
consulbuild.com (zona su Cloudflare dal 2026-09-07; il record DNS lo crea wrangler).
Build con le env pubbliche, poi `npx wrangler deploy --config wrangler.jsonc` (token nel
Keychain come per i siti clienti). Env alla build: `PUBLIC_INTAKE_URL`
(`https://n8n.consulbuild.com/webhook/bozza`), `PUBLIC_UMAMI_HOST`/
`PUBLIC_UMAMI_WEBSITE_ID` (statistiche), `PUBLIC_TURNSTILE_SITE_KEY` (Turnstile non è
attivo: si aggiunge se compare spam). Prova contro n8n vero senza pubblicare:
`PUBLIC_INTAKE_URL=… INTAKE_REALE=1 npx playwright test tests/flusso.spec.ts
--project=telefono` (salta le asserzioni sull'inbox locale; i file si controllano su Drive).

## Test

- `tests/controlli.spec.ts`: i validators, senza browser.
- `tests/flusso.spec.ts`: il percorso completo con errori corretti, foto e logo reali
  (`tests/fixtures/`), riepilogo con «Modifica», invio e file nell'inbox; più la ripresa
  dopo un ricaricamento. Sui tre progetti telefono / tablet / computer.
- `tests/a11y.spec.ts`: axe WCAG A/AA su passi rappresentativi e sul dialog.
- `tests/schermate.spec.ts`: evidenza visiva per la critique, non baseline pixel.
