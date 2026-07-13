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

`<step>` ∈ `contesto · palette · copy · images · build`. Il record cliente più recente è il
file col **nome numerico più alto** nella cartella `logs/<step>/`.

> I dati cliente (`out/`) sono fuori da git (sync Google Drive); i log di fabbrica sono
> gitignorati. `run.json` e i `gates/*.json` della fabbrica restano invece tracciati: per un
> **fallimento di gate** il motivo vero sta lì, non nel record.

## Sintomo → dove guardare → cosa leggere

| Sintomo | File | Cosa leggere nel record |
|---|---|---|
| Step cliente fallito (scheda rossa) | record più recente di `logs/<step>/`, **ultima riga** | `error.message` (= msg UI), `error.classe` (`auth`/`timeout`/`result`/`exit`/`spawn`/`abort`), **`error.stderr` integrale**, `error.code` |
| Migliorare un prompt / capire cosa ha fatto il modello | stesso file, la fase interessata | `prompt` (esatto), `actions` (sequenza tool), `testo` (conclusione del modello) |
| Fase lenta / costosa / turni esauriti | stesso file | `metrics`: `hitMaxTurns` (loop!), `numTurns`, `durationMs`, `inputTokens`/`outputTokens`, `costUsd` |
| Un tool fallisce (Read/Write/Bash/Skill) | stesso file | `actions[].error` (il tool_result d'errore, troncato) |
| Una skill "non ha potuto" fare qualcosa | stesso file | `metrics.permessiNegati` (tool bloccati da `allowedTools`/`disallowedTools`) |
| Loop critico↔correzioni che non converge (copy/immagini) | record: le fasi `critico (round N)` in sequenza + gli artifact `copy-review.json`/`image-review.json` | verdetti e `actions` round per round |
| Run di fabbrica fallita | `factory/runs/<runId>/record.ndjson` (ultima riga) **+** `gates/*.json`, `critic-review.json` | `error.*` nel record; il motivo strutturato di un gate nei `gates/*.json` |
| Run sparita dalla status bar (>15 min) o dopo un riavvio | il record **persiste** su disco a prescindere dal TTL in memoria | leggi il record; se manca la riga terminale (`ok`/`error`) la run è stata **interrotta** a metà fase |

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
della fabbrica), l'**import intake/Tally**, **build/deploy**, e non c'è una pagina UI di
dettaglio-run per i clienti (esiste per la fabbrica). Se un test tocca queste aree e serve più
contesto, sono i primi follow-up.
