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

## Blueprint disponibili

- **conversione-locale-v1** — landing di conversione per PMI locali, golden path
  distillato da ssccostruzionisrls.it (ordine: Header, Hero, TrustBar, Services,
  Gallery, ProcessSteps, WhyChooseUs, ContactCTA-form, FAQ, CtaBanner,
  ContactCTA-canali, Footer). Palette demo: charcoal + `#b0561a`.

Varianti future già previste da DESIGN.md (da creare quando servono): la variante
"Costruzioni Generali" (TrustBar a 4 voci, ProcessSteps timeline, CtaBanner chiaro).
