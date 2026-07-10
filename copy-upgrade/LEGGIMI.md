# Upgrade copy — cosa c'è e dove va

## Contenuto
```
copywriter/
  SKILL.md                      ← bozza aggiornata (2 segnaposto da preservare)
  references/esempi-oro.md      ← calibro di qualità dai 5 siti reali
copy-critic/
  SKILL.md                      ← bozza aggiornata (1 segnaposto)
  references/frasi-bandite.json ← UNICA fonte delle frasi vietate (skill + gate)
  scripts/check-slop.mjs        ← gate deterministico anti-slop (testato, zero dipendenze)
esempio/
  copy-esempio.json             ← campione con violazioni note, per provare il gate
```

## Merge nelle skill esistenti
Le due SKILL.md sono complete ma contengono sezioni marcate `[SEGNAPOSTO — MANTENERE …]`: lì restano le tue sezioni attuali («Formato artifact», «Modalità aggiornamento», convenzioni dello step). In Claude Code: "unisci questa bozza alla skill esistente preservando le sezioni segnaposto" e verifica il diff prima di committare.

## Integrazione del gate nell'editor
Flusso attuale: copywriter → **gate formato** → critic. Il nuovo controllo si aggiunge al gate, prima del critic:

```
node .claude/skills/copy-critic/scripts/check-slop.mjs out/<slug>/copy.json \
  --consenti "<nome azienda dal contesto>" \
  --martello "<frase martello dal contesto>" \
  --json
```

- Exit 0/1 = pass/fail. Con `--json` l'output va passato al prompt del critic, che per skill NON lo ridiscute.
- `--consenti` è importante e ripetibile: nome azienda (e città multi-parola) ricorrono legittimamente e non devono far scattare il controllo sequenze.
- Pattern identico a `check-contrast.mjs`: lo script vive nella skill, l'editor lo spawna — unica fonte del calcolo. In alternativa, Bash ristretto a questo solo script nello step critic, come per palette.
- Prova subito: `node copy-critic/scripts/check-slop.mjs esempio/copy-esempio.json` → 5 bloccanti (2 sequenze ripetute, 2 frasi bandite, 1 pattern "non solo … ma anche") + avvisi (connettivi, frasi deboli). Lo slot `cta.button.label` non scatta: è escluso dal controllo sequenze ed è formula di cortesia consentita.

## Manutenzione della lista
`frasi-bandite.json` è l'unica fonte: gate e skill leggono da lì. Nuovo riempitivo ricorrente → si aggiunge lì e vale ovunque. `bloccanti` ferma la build; `avvisi` segnala senza fermare (frasi al limite: "su misura", "di alta qualità"…). I `connettivi_meccanici` e le lineette hanno soglie configurabili nello stesso file.

## Piano di test (prima di toccare altro)
Genera end-to-end 5 siti su nicchie diverse — es.: impresa edile Roma · fotovoltaico Catania · idraulico Milano · restauro facciate Bologna · imbianchino Torino — con brief realistici e volutamente magri. Valuta a mano con la rubrica del critic stampata, annotando PER DIMENSIONE dove il copy fallisce. Solo dopo si ritoccano regole e lista: iterare su dati, non su teoria.

## Nota onesta
I 5 siti di riferimento sono strutturalmente forti (job per sezione già giusti, martelli chiari) ma contengono slop misurabile: ripetizioni seriali, frasi oggi bandite, residui d'inglese, refusi. Dettagli in `esempi-oro.md`, sezione "Cosa NON replicare". Il campione `copy-esempio.json` è costruito con quei difetti reali: il gate li prende tutti.
