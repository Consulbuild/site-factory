# Blueprints — lo scheletro-dati della Site Factory

Un **blueprint** è un `site.json` completo e valido che fa da scheletro standard:
struttura, ordine delle sezioni, varianti, ritmo scuro/chiaro e microcopy fisso sono
**decisi qui una volta sola**, non ri-decisi dall'AI per ogni cliente. Gli agenti
della pipeline non generano mai un sito da zero: **riempiono gli slot** dichiarati
in `slots.json`.

## Come funziona (opzione C, decisione 2026-07)

```
blueprint.json  = scheletro + valori d'oro (valida contro schema.ts, builda così com'è)
slots.json      = contratto: quali path può toccare ogni agente, con vincoli e guida
     │
     ▼
intake (Tally) → palette → copy → images        (ogni agente vede solo i SUOI slot)
     │
     ▼
assembler (script deterministico, NON un agente): blueprint + slot → site.json
     │
     ▼
parseSiteConfig() (Zod) → build Astro → deploy
```

Regole:

1. **Il blueprint deve sempre validare e buildare da solo** — è anche il golden
   example che il renderer usa in dev (`src/pages/index.astro` lo importa).
2. **Gli agenti toccano solo i path in `slots.json`.** Tutto il resto è fisso.
   L'assembler deve rifiutare scritture fuori dagli slot dichiarati.
3. **I vincoli di lunghezza sono duplicati per design**: in `slots.json` come guida
   per l'agente, in `src/lib/schema.ts` (Zod) come enforcement. Se cambi un budget,
   cambialo in entrambi.
4. **Dipendenze tra agenti**: dove uno slot ha `dependsOn` (es. le foto della gallery
   dipendono dalle caption del copywriter), l'assembler deve rispettare l'ordine
   della chiave `pipeline`.
5. **Un blueprint nuovo = una cartella nuova** (`nome-vX/`), mai modificare in place
   un blueprint già usato in produzione: i siti generati devono restare riproducibili.
6. **Sezioni condizionali = drop POST-merge.** Gli slot indirizzano le sezioni per
   indice numerico (`sections[4]`): rimuovere una sezione prima di applicare gli slot
   invaliderebbe tutti i path successivi. Se una sezione va tolta (es. Gallery senza
   almeno 4 foto reali del cliente), l'assembler la rimuove DOPO il merge, prima della
   validazione Zod. Se in futuro serviranno regole condizionali dichiarate nel
   blueprint, prima bisogna passare dai path indicizzati ai path per `id` di sezione.

## Assembler — `scripts/assemble-site.ts`

Lo script deterministico che fonde blueprint e output degli agenti:

```
node --experimental-strip-types scripts/assemble-site.ts \
  blueprints/conversione-locale-v1 <dir-artifact> -o out/site.json [--partial]
```

- **Formato artifact**: un file `<agente>.json` per ogni voce di `pipeline`
  (`intake.json`, `palette.json`, `copy.json`, `images.json`), ciascuno una mappa
  piatta `"<path-slot>": valore` con i path ESATTI di `slots.json`. Per i path con
  `[*]` il valore è un array (annidato per wildcard multiple: `items[*].bullets[*]`
  → array di array). La lunghezza può differire da quella del blueprint (es. 3 card
  servizi invece di 4): l'array viene ridimensionato, ma tutti gli slot che toccano
  lo stesso array devono concordare sulla lunghezza.
- **Enforcement pre-merge**: path fuori da `slots.json` o dell'agente sbagliato →
  rifiuto; `maxChars` (contati senza i marker `**`), `type:"hex"`, `accentMarker`
  (esattamente una coppia `**…**`) e `dependsOn` verificati slot per slot.
- **`--partial`**: consente run per-checkpoint con artifact mancanti (gli slot non
  riempiti restano ai valori d'oro e vengono elencati come warning).
- L'output passa comunque da `parseSiteConfig()` (Zod): l'assembler è il gate di
  contratto, Zod resta il gate finale.

Il checkpoint umano tra gli step della pipeline = revisione (ed eventuale modifica)
del file artifact prima di lanciare lo step successivo: identico in chat oggi e
nell'editor di Fase C domani.

## Blueprint disponibili

- **conversione-locale-v1** — landing di conversione per PMI locali, golden path
  distillato da ssccostruzionisrls.it (ordine: Header, Hero, TrustBar, Services,
  Gallery, ProcessSteps, ContactCTA-form, FAQ, CtaBanner, ContactCTA-canali,
  Footer, StickyCta). Palette demo: charcoal + `#b0561a`.

Varianti future già previste da DESIGN.md (da creare quando servono): la variante
"Costruzioni Generali" (TrustBar a 4 voci, ProcessSteps timeline, CtaBanner chiaro).
