# Kickoff sviluppo — Fase 1 della pipeline (da Claude Code, terminale)

> Handoff post-verifica (2026-07-04). La pianificazione e la verifica di fattibilità della
> Fase B sono CHIUSE: leggere `docs/agents-skills-plan.md` (piano aggiornato) e
> `docs/decisions/2026-07-verifiche-fase-b.md` (decisioni con fonti) prima di scrivere codice.

## Stato di partenza (già fatto, non rifare)

| Pezzo | Stato | Dove |
|---|---|---|
| Renderer Astro + contratto Zod | ✅ Fase A (15/23 sezioni) | `site-renderer/src/` |
| Blueprint + contratto slot | ✅ | `site-renderer/blueprints/conversione-locale-v1/` |
| 3 skill + 3 agenti fine-tuned | ✅ | `.claude/skills/` · `.claude/agents/` |
| **Assembler deterministico** | ✅ implementato e testato | `site-renderer/scripts/assemble-site.ts` |
| Validatore Zod | ✅ | `site-renderer/scripts/validate-site.ts` |
| Gate contrasto WCAG | ✅ | `.claude/skills/palette-designer/check-contrast.mjs` |
| Probe API BFL | ✅ scritto, MAI eseguito (serve `BFL_API_KEY`) | `.claude/skills/image-prompt-generator/probe-bfl.mjs` |
| Gate E2E | ✅ verde (round-trip golden + 7 casi negativi) | vedi §Verifica sotto |

## Fase 1 di sviluppo — obiettivo: prima pipeline completa su un brief reale

In ordine (ogni step ha un criterio di done verificabile):

1. **`site-renderer/scripts/intake-tally.ts`** — parser deterministico **API pull** Tally → `intake.json`.
   Fonte: `GET https://api.tally.so/forms/{formId}/submissions` (Bearer `TALLY_API_KEY` da
   `.env`, mai committata né passata in argv) — decisione 2026-07-05: l'utente ha la API key e
   nessun endpoint pubblico, quindi pull e non webhook; la firma `Tally-Signature` HMAC-SHA256
   (doppio formato) resta annotata in decisions §2 per quando arriverà n8n sul VPS.
   Regole verificate (dettagli in decisions §2): ancorarsi alle `key`/`id` dei campi (mai alle
   `label`); multiple choice/dropdown → il valore è l'UUID dell'opzione, risolvere con lookup
   nelle `options[].text` esposte dall'API; telefono normalizzato con country default IT; logo
   `FILE_UPLOAD` → scaricare il file subito e ri-ospitarlo (URL con token, scadenza non
   documentata). Mapping key→slot dichiarativo in testa al file, congelato sulla struttura
   reale della prima response API (non su docs).
   **Done**: submission reale → `intake.json` con gli 11 slot; response malformata/campo mancante rifiutati con errore chiaro.
2. **Drop condizionale Gallery nell'assembler** — in `assemble-site.ts`, POST-merge e prima del
   gate Zod: se il cliente non fornisce ≥4 foto reali, rimuovere `sections[4]` (Gallery). Vedi
   README blueprint regola 6 (mai pre-merge: i path sono per indice).
   **Done**: run con <4 foto → site.json valido a 11 sezioni.
3. **Primo run pipeline reale (senza immagini generate)** — brief fittizio (ditta
   ristrutturazioni a Roma): invocare in Claude Code i subagent `palette-designer` e
   `copywriter` facendogli emettere gli artifact `palette.json` e `copy.json`
   (formato: mappa piatta `"<path-slot>": valore`, vedi README blueprint); immagini con
   placeholder/foto reali; checkpoint = revisione dei file artifact; poi assembler → validate →
   build → check-contrast.
   **Done**: sito buildato e visivamente sensato in `npm run preview`.
4. **(Quando arriva `BFL_API_KEY`)** eseguire `probe-bfl.mjs` per confermare endpoint live, poi
   collegare l'agente immagini all'API vera (scaricare SUBITO gli output: URL firmati ~10 min;
   output jpeg, conversione webp in pipeline se serve).

Fuori scope Fase 1: le 8 sezioni senza componente (Fase A), l'editor Next.js e il deploy
Cloudflare Workers (Fase C — decisione già presa: Workers static assets, NON Pages).

## Comandi (da `site-renderer/`, con `export PATH="$HOME/.local/bin:$PATH"`)

```bash
npm run build                # build statica (deve restare verde)
node --experimental-strip-types scripts/assemble-site.ts \
  blueprints/conversione-locale-v1 <dir-artifact> -o out/site.json [--partial]
node --experimental-strip-types scripts/validate-site.ts out/site.json
node ../.claude/skills/palette-designer/check-contrast.mjs <coppie.json>
```

## Verifica di non-regressione (il gate E2E già verde)

Estrarre gli artifact golden dal blueprint (ogni slot di `slots.json` letto dal
`blueprint.json`, raggruppato per agente) → assemblare → l'output deve essere **identico al
blueprint**, 50/50 slot, exit 0 → validate → build → contrasto PASS. I casi negativi (path
fuori slot, agente sbagliato, maxChars, doppio `**`, hex invalido, dependsOn violato, array in
conflitto) devono uscire 1 con errore chiaro.
⚠ `docs/evals/generated-site-A.json` NON è una fixture valida (schema evoluto dopo l'eval).

## Dipendenze esterne aperte (bloccano solo lo step relativo)

1. `BFL_API_KEY` → step 4 (nota: da eseguire su una macchina senza proxy che blocchi api.bfl.ai).
1-bis. `RECRAFT_API_KEY` (piano PAID: il free non dà diritti commerciali) → loghi per i
   clienti senza logo dal form (skill `logo-designer`, decisions §6-bis).
2. `TALLY_API_KEY` in `.env` + una chiamata reale a `GET /forms/{id}/submissions` con log
   della response raw → congela il mapping dello step 1 (il form ha già submission reali).
3. Permission da aggiungere a mano in `.claude/settings.local.json`: vedi
   `docs/agents-skills-plan.md` §8.3.

## Prompt di avvio per Claude Code (copia-incolla)

```
Leggi docs/kickoff-sviluppo-fase-1.md, docs/agents-skills-plan.md e
docs/decisions/2026-07-verifiche-fase-b.md, poi CLAUDE.md e
site-renderer/blueprints/README.md. Parti dallo step 1 della Fase 1
(intake-tally.ts): proponi prima il piano di implementazione, poi sviluppa
rispettando i criteri di done. Non toccare schema.ts, slots.json né i budget
di lunghezza senza chiedermelo. A ogni step chiuso, riesegui il gate di
non-regressione descritto nel kickoff.
```
