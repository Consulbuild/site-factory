# DEBUG — dove guardare quando una run della pipeline si rompe

Mappa d'ingresso per diagnosticare (o migliorare) una run della pipeline con **dati reali
della run**, non congetture. Quando qualcosa non va — uno step fallisce, un output è mediocre,
una fase è lenta — parti da qui.

## Principio: segnale, non volume

Di ogni fase `claude -p` (clienti **e** fabbrica) si salva **solo il segnale utile** a
diagnosticare e migliorare, non il volume grezzo (che è rumore e peggiora il ragionamento di
chi legge). Quindi nel record trovi:

- **c'è**: prompt esatto · azioni (tool chiamati + input compatto) · **errori dei tool** ·
  testo conclusivo del modello · metriche compatte (turni, durata, token, costo, permessi
  negati) · esito con **stderr integrale + exit code + classe** *solo* al fallimento.
- **NON c'è (di proposito)**: dump grezzo dello stream-json · risultati integrali dei tool
  riusciti (i file letti stanno già su disco — rileggili) · thinking · l'accumulo di tutti i
  blocchi di testo.

Implementazione: `site-factory-editor/lib/run-record.ts` (schema + parser + sink), agganciata
nel seam `lib/run-step.ts` (`claudePhase`) e nel bus `lib/run-bus.ts`.

## I due canali su disco

| Canale | Cos'è | File (cliente) | File (fabbrica) |
|---|---|---|---|
| **Record curato** ⟵ leggi questo | 1 riga NDJSON **per fase** — il segnale qui sopra. **Con storia.** | `site-renderer/out/<slug>/logs/<step>/<timestamp>.ndjson` | `factory/runs/<runId>/record.ndjson` |
| **Eventi live** | Stream distillato per la status bar (nome-tool + testo). **Ultimo tentativo, azzerato a ogni run.** | `site-renderer/out/<slug>/logs/run-<step>.ndjson` | `factory/runs/<runId>/run.ndjson` |

`<step>` ∈ `contesto · palette · logo · copy · images · legale · build`. Il record cliente più
recente è il file col **nome numerico più alto** nella cartella `logs/<step>/`.

> I dati cliente (`out/`) sono fuori da git (sync Google Drive); i log di fabbrica sono
> gitignorati. `run.json` e i `gates/*.json` della fabbrica restano invece tracciati: per un
> **fallimento di gate** il motivo vero sta lì, non nel record.

## Sintomo → dove guardare → cosa leggere

| Sintomo | File | Cosa leggere nel record |
|---|---|---|
| Step cliente fallito (scheda rossa) | record più recente di `logs/<step>/`, **ultima riga** | `error.message` (= msg UI), `error.classe` (`auth`/`timeout`/`result`/`exit`/`spawn`/`abort`), **`error.stderr` integrale**, `error.code` |
| Avviso «Sessione Claude scaduta» (o run falliti con classe `auth`) | `site-factory-editor/app/api/claude-auth/route.ts` (stato via `claude auth status`, cache 20s) + `components/claude-auth.tsx` (avviso globale + pannello Impostazioni) | il bottone apre il Terminale con `claude login` (osascript, solo macOS); l'avviso sparisce da solo al login (poll 30s). Se l'apertura fallisce: `dettaglio` nella risposta POST |
| Migliorare un prompt / capire cosa ha fatto il modello | stesso file, la fase interessata | `prompt` (esatto), `actions` (sequenza tool), `testo` (conclusione del modello) |
| Fase lenta / costosa / turni esauriti | stesso file | `metrics`: `hitMaxTurns` (loop!), `numTurns`, `durationMs`, `inputTokens`/`outputTokens`, `costUsd` |
| Un tool fallisce (Read/Write/Bash/Skill) | stesso file | `actions[].error` (il tool_result d'errore, troncato) |
| Una skill "non ha potuto" fare qualcosa | stesso file | `metrics.permessiNegati` (tool bloccati da `allowedTools`/`disallowedTools`) |
| Uno stato di step sembra sbagliato (non «verificato» quando dovrebbe, «errore» dopo un run ok, «auto» residuo, ⚠ che non compare o compare a vuoto) | `lib/stati.ts` (regole pure: `statoDopoRun`, `decidiPasso`, `marca`) + `lib/staleness.ts` (`diffUpstream`: null = file mancante, comparso/sparito = stale) + `client.json.steps.<k>.{stato,upstream,ultimaRun}` | il solo critico non cambia mai lo stato; il mode deve essere in `STEP_MODES` (400 altrimenti); un run manuale cancella `catena` terminale (`invalidaCatena`); la catena si FERMA su uno step verificato ma cambiato a monte (`motivoStale` in `lib/catena.ts`). Banco: `scripts/test-stati.ts` |
| Hub con banner rosso «client.json non leggibile» | `site-renderer/out/<slug>/client.json` (fuori schema: il dettaglio Zod è nel banner) | il file non viene mai toccato né rinominato; ogni scrittura è rifiutata (`patchClientState` lancia) finché non lo correggi a mano; lo schema è `lib/schemas.ts ClientStateSchema` |
| Immagini: «file assente o troncato su disco (0 byte)» su hero/card con sonda BFL ok | `logs/run-images.ndjson`: i `tool` Bash e i `text` del modello | il modello ha invocato lo script in una forma fuori allowlist (`export PATH=…` bloccato dal guard della shell, `cd`, path assoluti, `node -e`) e in headless nessuno può approvare: ogni chiamata torna «This command requires approval». L'unica forma che passa è `node site-renderer/scripts/generate-image.mjs …` dalla root; i prompt lo impongono (`IMG_FORMA_COMANDO` in `lib/steps.ts`) |
| Loop critico↔correzioni che non converge (copy/immagini/logo) | record: le fasi `critico (round N)` in sequenza + gli artifact `copy-review.json`/`image-review.json`/`logo-review.json` | verdetti e `actions` round per round. Per il logo il verdetto NON è nel review (il critico trascrive e osserva): lo calcola `lib/logo.ts fondiReview` e finisce in `logo-trace.json` (`scelta`, `esito`/`motivo` per variante, `costo_usd` per immagine dalla riga `ESITO` dello script; lo stesso costo è in `metrics.costUsd` delle fasi script del record). Banco: `scripts/test-logo-gates.ts` |
| Documenti legali sbagliati / catena legale in FAIL | `out/<slug>/legale-review.json` (verdetti 3 lenti + findings con path dei blocchi) + `legale-src/review-*.json` (per-lente) + `foro.json` (derivazione con evidenza/URL) + `legale-report.md` | il gate deterministico vive in `site-factory-editor/lib/legale.ts` (`gateLegale`, converter a regole chiuse); banco di prova: `scripts/test-legale-gates.ts`. I md sorgente (write-once) in `legale-src/` |
| Run di fabbrica fallita | `factory/runs/<runId>/record.ndjson` (ultima riga) **+** `gates/*.json`, `critic-review.json` | `error.*` nel record; il motivo strutturato di un gate nei `gates/*.json` |
| Una richiesta del form (sito.consulbuild.com) non compare in home / «Importa» fallisce | `~/Library/CloudStorage/GoogleDrive-info@consulbuild.com/Il mio Drive/site-factory-clienti/_inbox/<leadId>/` (serve `lead.json`: solo `bozza.json` = abbandonata) + esecuzioni di `sf-bozza` in n8n + avviso Telegram | file presenti e completi (Drive Desktop può mostrare segnaposto non scaricati: l'import risponde «non è ancora scaricato, riprova»); logica in `site-factory-editor/lib/inbox-form.ts`; banco di prova `scripts/test-import-form.ts`; guida `docs/vps-integrazioni-setup.md` §10 |
| Run sparita dalla status bar (>15 min) o dopo un riavvio | il record **persiste** su disco a prescindere dal TTL in memoria | leggi il record; se manca la riga terminale (`ok`/`error`) la run è stata **interrotta** a metà fase |
| Catena automatica ferma / non parte / «interrotta dal riavvio» | `out/<slug>/logs/catena.ndjson` (una riga per passo: `run` / `gia_verificato` / `saltato` / `da_verificare_esistente` / `auto_conferma` / `attesa_limite` / `ferma` con motivo) + `client.json.catena` (`stato`, `passo`, `errore`, `riprovaAlle`) | il motivo di `ferma` è il messaggio UI: gate dello step (`motivoGate`), verdetto del critico (`copy-review.json`/`image-review.json`, per il logo `logo-trace.json` senza `scelta`), conferma rifiutata (`lib/conferme.ts`), run in errore (→ record dello step come sopra). La coda vive solo in memoria (`lib/catena.ts`): dopo un riavvio si preme «Riprendi». Classe `limite` nel record = limite del piano Max (la catena attende 30′ e riprova, max 3) |
| Demo non raggiungibile / certificato | `client.json.demo` (`host`, `workerName`, `pubblicataAt`, `scadenza`, `spentaAt`, `errore`) + `out/<slug>/wrangler.demo.jsonc` | il certificato del 3° livello arriva in ~4 min (handshake TLS fallito prima); `spegniDemo` cancella SOLO `<slug>-demo`; go-live col dominio spegne la demo da solo (`lib/deploy.ts`) |
| Demo spenta «da sola» / non spenta alla scadenza | `site-renderer/out/.demo-sweep.log` (una riga per decisione: `spenta`/`saltata`/`errore`/`prova`) | il sweep gira ogni ora nel processo dell'editor (`instrumentation.ts`): predicato `demoScaduta` in `lib/portafoglio-shared.ts` (mai completo/congelata/dominio) + Stripe attivo ⇒ `saltata`. Prova manuale: `POST /api/demo/sweep {"dryRun":true}` |
| Deploy rifiutato: «fondamenta SEO» (servizio Traffico «Sito») | `client.json` → `steps.build.fondamenta.dominio` (cotte dall'ultima build) contro `traffico.sito.stato`, `steps.build.dominio` e `percorso` | la regola è una sola, `fondamentaAttese` in `site-factory-editor/lib/fondamenta.ts` (attivo o sospeso + dominio + percorso non demo; mai nelle build parziali), confrontata da `motivoRifiutoFondamenta` prima di wrangler. Si risolve ribuildando: la scheda Build lo mostra già tra i motivi di ribuild (primaria «Builda il sito») e la catena ribuilda da sola a «Riprendi», entrambe con lo specchio `motivoRebuildFondamenta` di `lib/traffico.ts` (attese calcolate lato server). Se la catena si ferma lo stesso al deploy con questo motivo, lo specchio e l'interlock divergono: banco `scripts/test-fondamenta.ts` (24 combinazioni) |
| Build ferma alla fase «fondamenta SEO (sitemap, robots, IndexNow)» | record della build: `error.message` elenca pagina per pagina gli errori tecnici | canonical diversa dall'URL della sitemap, JSON-LD assente in home / di un altro dominio / non valido / con campi vietati, `x.html` fuori forma cartella, `traffico/indexnow.json` o `traffico/lastmod.json` illeggibili (si correggono o si cancellano: nessun file viene riscritto in silenzio). In questo caso nessun file è stato scritto |
| `lastmod` che non cambia o cambia sempre | `out/<slug>/traffico/lastmod.json` (`pagine` = ultima build cotta, `pubblicate` = ultimo deploy riuscito; hash e lastmod per path) + riga «sitemap: N URL · lastmod …» nel log della build | l'hash è su `testoIndicizzabile` (title, description, JSON-LD, testo, alt e href del body): class/style/asset/Umami/action e l'anno del copyright non contano. Un contenuto uguale a quello pubblicato riprende il `lastmod` di `pubblicate`. Per capire cosa è cambiato, confrontare `testoIndicizzabile` delle due `index.html` |
| Fatto comunale assente o sospetto (pagine-comune, «Zone servite», pipeline copy) | `site-renderer/data/comuni-fatti.json` → `completo`/`fontiMancanti`, `fonti.<id>.stato`, `copertura`, `scarti.<campo>.<motivo>` (liste di voci), `abbinamentiApprossimati.clima` (righe dell'allegato A abbinate per nome simile) e `alias` | `cd site-renderer && node --experimental-strip-types scripts/fatti-comuni.ts mostra <codice\|"nome" [sigla]> [--da <codice>] [--json]`: fatti, frasi con citazione, alias usato, avviso di dataset incompleto. Un campo assente nel record = fatto non emesso per regola (fonte giù, comune fuso con scambi di territorio o nato da parti di altri dopo la fonte, nato dopo il 1993, zona incoerente coi gradi giorno), mai uno «0». Edifici 2011 = somma delle sezioni di censimento: il metodo è in `fonti.istat-edifici-2011.metodo` e nel campo `metodo` del fatto (per questo si citano come elaborazione). Regole in `scripts/fatti-comuni.ts` (`portaAl2026`, `abbinaDpr412`), lettura in `src/lib/fatti-comuni.ts`; banco `scripts/test-fatti-comuni.ts`. Distanza sotto la somma dei raggi → `citabile: false` («comune vicino») |
| Card «Zone servite» in «Non leggibile» con «Dati dei comuni non leggibili», salvataggio 503, T4/G1 fermi per tutti i clienti | il motivo nel banner della card (= `zoneUsabili(...).motivo`) | `elenco delle province non leggibile (ENOENT)` = `site-intake/public/data/province.json` mancante: è generato e fuori da git (checkout pulito, ripristino dal backup, `git clean -X`), si rigenera con `cd site-intake && npm run comuni` (lo fanno anche `predev`/`prebuild`); «dataset dei comuni …» = `site-renderer/data/comuni-fatti.json` (riga sopra). Regole in `site-factory-editor/lib/zone-servite.ts` (`caricaDati`), banco `scripts/test-zone-servite.ts` |
| Zone servite «Da controllare», «Da impostare» o «Da rivedere», o T4/G1 fermi su «Zone servite…» / «Il form lead è cambiato…» | la card nel dettaglio `/traffico/<slug>` (note per riga e «Nel form lead: …») + `out/<slug>/raw-submission.json` → `risposte.zone` e `risposte.sede` + `out/<slug>/traffico/zone-servite.json` (`lead.impronta`, `etichette[].provenienza`) | «Da impostare» con Tally = normale (niente zone nel vecchio modulo); una nota qualunque (sede senza sigla, provincia sarda coi confini cambiati, nome scritto a mano) rende la proposta da controllare; «Da rivedere» = re-import del lead dopo un salvataggio (l'impronta è sha256 di `zone` + comune e sigla della sede: gli altri campi non contano). Per vedere la traduzione di una etichetta senza scrivere: `POST /api/clients/<slug>/traffico/zone {"azione":"anteprima","etichetta":"…"}`. Regole in `site-factory-editor/lib/zone-servite.ts`, banco `scripts/test-zone-servite.ts` |
| `fatti-comuni.ts aggiorna` fallito o dataset non riscritto | output del comando (copertura, scarti, differenze, «errori di gate») + `~/.cache/site-factory/fatti-comuni/manifest.json` (override `FATTI_COMUNI_CACHE`) | nel manifest, per fonte: `stato`, `errore`, `ultimoTentativo`, `file[].url/sha256`. Fonte `non_raggiungibile` → l'aggiornamento si ferma (con `--parziale` scrive un dataset `completo: false`); «gate di chiusura» = variazione Istat non coperta (cercarne la tabella, mai forzare); «copertura» sotto il 90% con la fonte presente = lettore rotto (o mancante: le famiglie 2021 non hanno ancora il lettore, procedura nei punti aperti di `docs/traffico/piano-T6a.md`); «sezioni 2011: …» = zip degli edifici diverso dal tracciato atteso (regioni, E3 ≠ somma delle epoche, sezione ripetuta, 8.092 comuni: lo zip nuovo non sostituisce la copia in cache). Il dataset esistente resta intatto in ogni caso; `--offline` non tocca il manifest. Procedura annuale nel commento di testa dello script |
| Build ferma alla fase «pagine leggere (varianti immagini)» (servizio Traffico «Sito») | record della build: `error.message` = la riga `media-varianti: <src>: …` | `<src>: site.json lo usa ma il file non c'è` = foto di `images.json`/`lavori.json` o marchio/favicon senza file in `out/<slug>/img` (o nel workspace); «fuori da» = `src` con `..`; «formato non gestito» / messaggio di sharp = file rotto o non immagine; «il logo è un PDF» = logo del form in PDF, da ricaricare in PNG o SVG nella scheda Intake. Script `site-renderer/scripts/media-varianti.ts` (ricetta in `RICETTA`), banco `scripts/test-media.ts`. Cache in `site-renderer/node_modules/.cache/media-varianti/<sha256>-<tipo>-<ricetta>/`: la ricetta include il sorgente dello script, quindi dopo ogni sua modifica la prima build ricodifica tutto (Cavaliere 51-81 s, timeout della fase 300 s; la riga finale della fase dice «N dalla cache»); cancellarla forza la ricodifica, mai necessario per una foto cambiata (nome e chiave seguono i byte); le cartelle con ricette vecchie si possono cancellare a mano |
| Build ferma alla fase «budget pagine» | record della build: `error.message` = fino a 3 righe `<pagina>: …` | `file referenziato assente nella dist` (manifest e `public/media/<slug>/v/` non allineati: rifare la build), `<img> di /media senza width/height` o `senza srcset` (un componente rende un'immagine senza `Foto.astro`, o `MEDIA_VARIANTI_JSON` non è arrivato ad astro), `sizes … fuori grammatica` (valore nuovo in `src/lib/media.ts` fuori da `Npx`/`Nvw`/`calc(Nvw - Nrem)`). A mano: `cd site-renderer && node --experimental-strip-types scripts/budget-pagine.ts out/<slug>/dist` stampa la tabella per pagina |
| Avviso «Pagine leggere: budget superato su …» / foto più morbide dell'originale | banner «Fondamenta SEO: N avvisi» nella scheda Build & Pubblica · `client.json` → `steps.build.fondamenta.avvisi` · righe `avviso:` della fase «budget pagine» nel log | l'avviso nomina le 3 risorse più pesanti (foto con la larghezza scelta a 412 px e DPR 1,75): una foto reale molto dettagliata o un `sizes` troppo largo. Manifest in `out/<slug>/traffico/media-varianti.json` (URL e larghezze per `src`); soglie in `SOGLIE` di `scripts/budget-pagine.ts`, `sizes` per uso in `src/lib/media.ts`. Mai un blocco: l'avviso non ferma né la build né il deploy |
| JSON-LD senza indirizzo, P.IVA, telefono o col tipo sbagliato | scheda Build & Pubblica → banner «Fondamenta SEO: N avvisi» (nascosto se le fondamenta cotte non sono quelle attese) · `client.json` → `steps.build.fondamenta.avvisi` + righe «JSON-LD: …» e «avviso: …» nel log della build; il file è `out/<slug>/traffico/dati-strutturati.json` | avviso = dato presente ma non utilizzabile (indirizzo senza CAP o comune riconoscibile in `comuni.json`, P.IVA che non passa il controllo, social non https dell'host giusto); «omessi» nel riepilogo = nessuna fonte (niente social, logo, foto reali). Tipo: `mestiere` in `raw-submission.json`, altrimenti `settore_normalizzato` di `contesto.json` (`tipoSchema`) |

## Come leggere un record

Ogni riga = una fase. Esempi (`jq`):

```bash
DIR=site-renderer/out/<slug>/logs/copy
F=$(ls "$DIR"/*.ndjson | sort | tail -1)          # il tentativo più recente

jq -c '{phase, ok, classe: .error.classe}' "$F"    # panoramica fasi + esiti
jq 'select(.ok==false) | .error' "$F"              # errore completo (stderr integrale) della fase fallita
jq -c '{phase, metrics}' "$F"                       # metriche per fase (turni/durata/token/costo)
jq -r 'select(.phase|test("critico")) | .prompt' "$F"  # il prompt esatto inviato al critico
```

## Retention

- **Clienti**: ultimi **~10 tentativi per step** (`logs/<step>/`, pruning automatico all'avvio).
- **Fabbrica**: un `record.ndjson` per `runId`, **append-only** (accumula anche i resume dello
  stesso run).

## Cosa NON è (ancora) strumentato

Fuori dalla passata di osservabilità 2026-07 (per scelta): i **gate deterministici lato
cliente** (slop/formato/copertura — il report pieno non è ancora durevole come i `gates/*.json`
della fabbrica), l'**import dal form** (`lib/inbox-form.ts`), **build/deploy**, e non c'è una pagina UI di
dettaglio-run per i clienti (esiste per la fabbrica). Se un test tocca queste aree e serve più
contesto, sono i primi follow-up.
