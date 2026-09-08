# logo-lab — banco di prova per la generazione dei loghi

Ambiente leggero per capire **dove** la pipeline dei loghi fallisce, variando una
leva alla volta (o in matrice) nelle stesse condizioni dello step `logo`
dell'editor: stesso `claude -p` (modello/effort/tool permessi di `run-step.ts`),
stesso prompt di `steps.ts` (copiato in `prompts/agente-pipeline.md`), stessa
skill, stesso `site-renderer/scripts/generate-logo.mjs`.

```bash
export PATH="$HOME/.local/bin:$PATH"          # dalla root del repo
node logo-lab/lab.mjs run logo-lab/configs/base.json               # baseline = pipeline com'è
node logo-lab/lab.mjs run logo-lab/configs/recraft-diretto.json    # solo Recraft (niente agente)
node logo-lab/lab.mjs run logo-lab/configs/stile-riferimenti.json  # verso i riferimenti
node logo-lab/lab.mjs render logo-lab/runs/<run>                   # rasterizza + metriche
node logo-lab/lab.mjs critica logo-lab/runs/<run> logo-lab/prompts/critico-v2.md
node logo-lab/lab.mjs galleria                                      # runs/index.html
open logo-lab/runs/index.html
```

## Le leve (config JSON)

| chiave | cosa varia |
|---|---|
| `cliente` | slug in `site-renderer/out/` (copia contesto+palette) o `{slug, primary, contesto}` sintetico |
| `modo` | `agente` (replica della pipeline) · `diretto` (chiama Recraft senza agente: isola la leva Recraft) |
| `agente.model/effort/maxTurns` | il `claude -p` dell'agente |
| `agente.prompt` | template del prompt (`{{slug}} {{base}} {{primary}} {{script}}`) |
| `agente.skill` | testo alternativo della skill, inlined nel prompt (tool Skill escluso); `null` = skill reale |
| `recraft.model/style/substyle` | modello e stile Recraft (substyle richiede il suo style) |
| `recraft.colors` | palette imposta a Recraft (`controls.colors`) |
| `recraft.keepColors` | `true` = niente appiattimento monocromo (solo sfondo tolto) |
| `recraft.technical` | formula tecnica appesa al prompt (`""` = nessuna) |
| `recraft.prompt/varianti` | solo in modo diretto: soggetto e numero di seed |
| `critico.model/effort/prompt` | il critico visivo (`prompts/critico-v1.md` rubrica icona, `critico-v2.md` rubrica sui riferimenti) |
| `matrice` | `{"chiave.puntata": [valori]}` → prodotto cartesiano; valori-oggetto si fondono (es. `{"style":"icon","substyle":"outline"}`) |

Ogni run scrive in `runs/<ts>-<nome>/`: `config.json`, `ws/` (workspace come in
`out/<slug>`), `agente-prompt.md`, `agente-azioni.json`, `agente-esito.json`,
`agente.stream.jsonl`, `render/foglio.png` (16/32/64/256 su bianco, 64 su scuro,
scheda browser simulata), `render/metriche.json` (path, KB, fill, sfondo residuo,
ink32/ink256, flag `blob|vuoto|dettagli_persi|colori_residui|sfondo_residuo|testo`),
`critico.json`, `report.md`. `runs/index.html` confronta tutte le run.

I riferimenti del bersaglio (loghi che vogliamo raggiungere) sono descritti in
`riferimenti/README.md`: mettere lì le immagini con i nomi indicati e il critico v2
le guarda.

## Risultati (2026-09-08, iterazione 1)

Sei run su Cavaliere Build (primary `#1a160f`, accent `#8a6d15`). Vedi `runs/index.html`.

1. **I marchi in produzione erano rotti dal ricoloro, non dal modello**: tutti gli SVG
   di `out/cavaliere-build-srls/logo/` hanno un rettangolo di sfondo a tutta tela
   che ricolorato diventa un quadrato pieno (flag `sfondo_residuo` + `blob`). Il fix
   `stripBackground` in `generate-logo.mjs` (non ancora committato) li ripara:
   ripassati, sono silhouette di palazzi/gru da 90–400 path, cioè illustrazioni, non
   simboli.
2. **Baseline (pipeline com'è: opus-4-8 xhigh + skill, 410 s, 19 azioni)**: sceglie
   una cazzuola dentro triangoli concentrici; corretto rispetto alla skill, ma a 16–32 px
   i triangoli annidati diventano rumore ed è un'icona da set UI, non un logo con
   carattere. **L'agente non vede le varianti**: `Read` gli restituisce il sorgente
   SVG e lui «giudica» contando path. La scelta è cieca per costruzione.
3. **Recraft diretto senza stile**: 3 cazzuole pulite (10–17 path), leggibili a 16 px.
   Il modello sa fare pittogrammi puliti quando il soggetto è semplice. Gli stili
   `icon/*` NON esistono sul modello vector v3 (HTTP 400); `vector_illustration/
   bold_stroke` produce blob, `roundish_flat` illustrazioni.
4. **Verso i riferimenti** (`stile-riferimenti.json`: `controls.colors` = primary+
   accent+bianco, `keepColors`, formula «flat vector logo mascot, 3 flat colors»,
   soggetto «cavaliere che regge una casa»): **al livello del riferimento Cavaliere
   Build** già alla prima ronda (mark-2 è quasi identico), leggibile a 32 px,
   58–67 path. Residui: 1–2 tinte fuori palette e un `url(#gradient)` in una
   variante (da vietare nel prompt o da normalizzare nello script).
   La materializzazione del kit con `--recolor` monocromo lo distrugge (blob):
   con `--keep-colors` no.

**Diagnosi**: il limite non è l'intelligenza del modello né Recraft. Sono tre
scelte della pipeline: (a) la filosofia della skill (monocromo, «solo pittogramma»,
casa in lista nera) è l'opposto del bersaglio; (b) il ricoloro appiattisce a un
colore; (c) l'agente sceglie senza vedere. Prossima iterazione: skill v2 sul
bersaglio (mascotte/emblema, 3 colori, casa ammessa), kit `--keep-colors` con
`controls.colors`, scelta fatta da un critico che GUARDA il foglio (`critico-v2.md`)
invece che dall'agente sul sorgente. Nota: i crediti Recraft sono finiti a metà
matrice (`not_enough_credits`): le run `casa` ed `elmetto` sono da rilanciare.
