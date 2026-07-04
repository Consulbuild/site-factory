# Site-factory — Piano pipeline Fase B (agenti, skill, assembler)

> Status: **FASE B VERIFICATA E PROGETTATA** (2026-07-04) — 3 agenti LLM (Copy · Palette · Image)
> + 2 script deterministici (intake-parser · assembler). Skill production-ready allineate a
> `schema.ts` (report: `docs/evals/fine-tuning-report.md`); assembler implementato e testato
> (`site-renderer/scripts/assemble-site.ts`, gate E2E verde); fattibilità tecnica verificata con
> fonti in `docs/decisions/2026-07-verifiche-fase-b.md`.
> Decisioni bloccate: copy solo italiano, registro **noi+tu** · palette = 6 preset del renderer +
> solo `primary`/`accent` · image agent scrive i prompt **e** chiama l'API · modelli immagine =
> **FLUX.2 [pro]/[max] only** via BFL diretto · orchestrazione: oggi Claude Code, Fase C Agent SDK.

---

## 1. Contesto

Stiamo costruendo un **editor custom che automatizza la pipeline della web-agency** per PMI
italiane di servizi locali (edilizia / ristrutturazioni / energia — riferimenti:
`designprojectroma.it`, `newfutureservice.it`, `ssccostruzionisrls.it`). I siti generati sono
**Astro + Tailwind** (renderer in `site-renderer/`, già esistente); l'editor sarà **Next.js**
(Fase C); hosting **Cloudflare**; analytics **Umami**; intake **Tally** (webhook → parser, no
copy-paste).

**Principio non negoziabile**: l'AI non scrive mai codice — produce solo contenuti che finiscono
in un `site.json` validato da `src/lib/schema.ts` (Zod). E nemmeno il `site.json` intero: gli
agenti **riempiono gli slot** di un blueprint (`site-renderer/blueprints/conversione-locale-v1/`,
12 sezioni a ordine fisso, ~50 slot dichiarati in `slots.json` con vincoli e agente assegnato).
Struttura, ordine, varianti e microcopy di conversione sono decisi una volta nel blueprint, non
ri-decisi a ogni cliente.

La pipeline è quindi: **3 agenti LLM** (palette, copy, immagini) + **2 script deterministici**
(intake-parser da Tally, assembler blueprint+artifact→site.json). Il vecchio 4° agente "Section
Architect" è stato eliminato (vedi §4: selezione sezioni).

---

## 2. Immagini: modelli, provider, costi

Decisione confermata con ri-verifica documentale 2026-07-04 (dettagli e fonti in
`docs/decisions/2026-07-verifiche-fase-b.md`):

1. **FLUX.2 only, niente lane Google — confermato.** Imagen 4 è deprecato (Gemini API: shutdown
   17-08-2026; Firebase: già chiuso dal 24-06-2026) e il successore Gemini 3.1 Flash Image
   ("Nano Banana 2") costa ~$0.067/immagine 1K: più del doppio di [pro]. Nota: nei test
   dell'utente su LLM Arena Imagen 4 e FLUX.2 [pro] erano i migliori — l'alternativa Google
   resta solo qualitativa, non di costo, e comunque non su un modello in dismissione.
2. **La linea è [pro] + [max]** ("Flux 2 Ultra" non esiste con quel nome): **[pro]** workhorse di
   default, **[max]** per hero e scatti premium. [flex]/[dev]/[klein] fuori scope.
3. **Provider: BFL diretto** (una chiave, feature complete); fal.ai come fallback operativo:
   prezzo identico senza markup, con code persistenti e retry gestiti.

| Modello | Ruolo in pipeline | Prezzo (bfl.ai/pricing, 2026-07-04) | Endpoint |
|---|---|---|---|
| FLUX.2 [pro] | Default (card servizi, processo) | $0.03 primo MP + $0.015/MP extra | `POST api.bfl.ai/v1/flux-2-pro` |
| FLUX.2 [max] | Hero e scatti premium | $0.07 primo MP + $0.03/MP extra | `POST api.bfl.ai/v1/flux-2-max` |

Dettagli operativi verificati: auth header `x-key`; host solo-EU `api.eu.bfl.ai` disponibile
(opzione GDPR); `output_format` solo jpeg/png (niente webp nativo → conversione in pipeline);
niente raw mode su FLUX.2; **gli URL firmati di consegna scadono in ~10 minuti** → scaricare
subito e ri-ospitare; rate limit 24 task concorrenti.

**Policy fonte immagini (Round 4, vincolante)**: Gallery e BeforeAfter **mai generate** (solo
foto reali del cliente, altrimenti la sezione si droppa); hero generata con [max]; card
servizi/processo con [pro] solo se mancano foto reali. Ambientazione italiana/mediterranea,
output jpeg/webp.

**Probe pronto**: `.claude/skills/image-prompt-generator/probe-bfl.mjs` — submit 512×512 + poll,
da eseguire alla consegna di `BFL_API_KEY` per confermare endpoint e parametri live (gli endpoint
`/v1/flux-2-pro|max` restano da validare contro l'API reale).

---

## 3. I tre agenti e le loro skill

Ogni agente è un wrapper sottile `.claude/agents/<nome>.md` (ruolo + tool + "usa sempre la tua
skill"); la conoscenza riusabile vive in `.claude/skills/<nome>/SKILL.md`. Tutti gli output sono
**artifact JSON** (mappa `path-slot → valore`, vedi §5) conformi a `slots.json`.

### 3.1 Palette Designer — skill `palette-designer`
**Compito:** scegliere il preset estetico e la palette cliente, conformi al contratto reale del
renderer.
- Output = blocco `brand`: `{ preset, palette: { primary, accent } }` in hex. **Niente scale
  OKLCH né theme.css custom**: i neutri appartengono ai 6 preset del renderer (`meridian`
  default, poi atelier/nova/canon/terra/vita); il cliente porta solo `primary` + `accent`, e di
  norma **accent = primary** (tinta unica, come nei siti consegnati).
- Preset per settore/estetica richiesta nel form (minimal→atelier, futuristico→nova, …).
- **Gate WCAG AA (hard pass/fail)**: coppie obbligatorie verificate con
  `.claude/skills/palette-designer/check-contrast.mjs` (bianco su primary ≥4.5:1, accent su
  fondi del preset ≥3:1) contro i **neutri reali del preset**. I siti consegnati di riferimento
  falliscono AA: la pipeline li corregge, non li copia.

### 3.2 Copywriter — skill `local-service-copywriter`
**Compito:** copy italiano, specifico, conciso, orientato conversione, direttamente nei props di
sezione con i **nomi campo esatti di `schema.ts`**.
- **Registro: noi+tu** (deciso al Round 4 sui siti consegnati — non voi/Lei); italiano piano,
  niente anglicismi.
- Framework: AIDA a livello pagina, PAS per pain/value, FAB per servizi/processo, 4 U's come QA
  dei titoli, "So what?" per trasformare feature in benefici.
- **Budget di lunghezza vincolanti** (guida in `slots.json`, enforcement in Zod e
  nell'assembler): es. hero title ≤52, subtitle ≤180, desc card ≤110, FAQ answer ≤420. Marcatore
  `**…**`: UNA sola frase in accent per titolo. Nessuna parola >18 glifi nei titoli (mobile
  390px).
- **Gate anti-generico**: ogni riga deve fallire il test "potrebbe descriverla qualunque
  concorrente?"; banned: *qualità, i migliori, leader del settore, professionalità e serietà,
  soluzioni su misura, passione, da anni al vostro fianco* + weasel words. Numeri esatti
  verificabili; dati mancanti = «DA CONFERMARE», mai inventati.
- SEO locale: servizio + città in `meta.seoTitle` (50–60) / `meta.seoDescription` (150–160) e
  nell'H1; NAP coerente col Google Business Profile.

### 3.3 Image Prompt Generator — skill `image-prompt-generator`
**Compito:** scegliere il modello ([pro]/[max]), scrivere il prompt, **chiamare l'API BFL**,
restituire `image: { src, alt }` (+ `caption` in Gallery) con alt text italiano.
- Prompt FLUX.2 in **prosa** (Subject+Action+Style+Context, elemento chiave per primo), testo tra
  virgolette, **palette hex legata a oggetti** ("the sign is #b0561a"), fino a 8 reference image,
  negativi espressi in positivo.
- Style bible per sito (stessa luce, stesso registro fotografico) così le immagini sembrano un
  unico shooting; aspect ratio per sezione (hero 16:9, gallery/card 4:3).
- API BFL async: submit → poll con retry/backoff; gli URL di consegna sono firmati e scadono →
  scaricare subito. `BFL_API_KEY` da env; scelta tier cost-aware.
- Rispetta la policy fonte immagini del §2 (mai generare gallery/loghi/certificazioni/volti).

---

## 4. I due step deterministici (niente LLM)

### 4.1 Intake — futuro `site-renderer/scripts/intake-tally.ts`
**Parser deterministico del webhook Tally, non un agente.** Gli 11 slot `intake` di `slots.json`
sono tutti verbatim o meccanici: `meta.slug` = kebab-case del nome, `contact.social` = filtro dei
soli social forniti, `brand.logo` = null se assente, `brand.tone` = aggettivi verbatim dal form.
Nessun giudizio da modello → niente costi, niente non-determinismo.

Fattibilità verificata sul payload reale (2026-07-04, fonti nel doc decisioni): `data.fields[]`
con `{key, label, type, value, options?}`; regole del parser — ancorare alle `key` (stabili),
MAI alle `label`; multiple choice/dropdown consegnano l'**UUID dell'opzione** → lookup
obbligatorio in `options[].text`; telefono in formato libero → normalizzazione deterministica
con country default IT; logo (`FILE_UPLOAD`) → **scaricare e ri-ospitare subito** (URL con
token, scadenza non documentata); firma `Tally-Signature` HMAC-SHA256 sul raw body (due formati
documentati: supportarli entrambi). Webhook, firma e API REST di fallback
(`GET api.tally.so/forms/{id}/submissions`) sono disponibili anche sul piano free.
Il mapping dichiarativo `tally-field-key → path slot` si completa quando l'utente esporta i
campi reali del form (open item §8) + una submission di prova con log del payload raw.

### 4.2 Selezione sezioni + assembler — `site-renderer/scripts/assemble-site.ts` (fatto)
Il Section Architect è stato eliminato: **la selezione e l'ordine delle sezioni sono fissi nel
blueprint** (un archetipo = una cartella versionata). Le sezioni condizionali si gestiscono con
**drop POST-merge nell'assembler** (unico caso attuale: Gallery rimossa se il cliente non
fornisce ≥4 foto reali) — post-merge perché gli slot indirizzano le sezioni per indice numerico.

L'assembler (implementato e testato, vedi README blueprint per l'uso):
- fonde blueprint + artifact nell'ordine della chiave `pipeline`;
- **rifiuta** ogni path fuori da `slots.json` o dell'agente sbagliato;
- applica i constraint per-slot (`maxChars` senza contare `**`, `hex`, `accentMarker`,
  `dependsOn`) prima del gate Zod finale;
- `--partial` per i run per-checkpoint.

---

## 5. Pipeline, artifact e checkpoint

```
Tally webhook
   │
   ▼
intake-tally.ts (script) ──▶ artifacts/<slug>/intake.json
   │
   ├─▶ [Palette Designer] ──▶ palette.json ──▶ ✔ checkpoint
   └─▶ [Copywriter] ───────▶ copy.json ─────▶ ✔ checkpoint   (palette ∥ copy)
                                │ (caption gallery)
                                ▼
       [Image Prompt Gen] ──▶ images.json ──▶ ✔ checkpoint
                                │
                                ▼
       assemble-site.ts ──▶ site.json ──▶ parseSiteConfig (Zod)
                                │
                                ▼
       npm run build (Astro) ──▶ check-contrast ──▶ deploy Cloudflare
```

**Il contratto che rende tutto intercambiabile**: ogni step produce un **artifact JSON su disco**
(`artifacts/<slug>/{intake,palette,copy,images}.json`, mappa piatta `path → valore`).
Il checkpoint umano = revisione/modifica dell'artifact prima di lanciare lo step successivo —
identico oggi in chat e domani nella UI dell'editor. Palette e copy sono indipendenti (in
parallelo); le immagini dipendono dalle caption del copy (`dependsOn` in `slots.json`).

---

## 6. Orchestrazione (oggi e Fase C)

Verificato sui docs ufficiali (2026-07-04, fonti nel doc decisioni): **nessun vicolo cieco**.

- **Oggi**: Claude Code interattivo — i 3 subagent in `.claude/agents/` invocano le skill,
  l'utente approva a ogni checkpoint in conversazione, gli script girano da CLI.
- **Fase C**: l'editor Next.js usa il **Claude Agent SDK TypeScript**
  (`@anthropic-ai/claude-agent-sdk`) dal backend: carica le **stesse** `.claude/skills` e
  `.claude/agents` (`options: { cwd, settingSources: ["project"] }`); i checkpoint diventano
  gate UI tramite `canUseTool` / hook `PreToolUse` / `defer` + `resume`. Skill, agenti, artifact
  e script restano invariati: **cambia solo chi invoca gli agenti**.
- Scartati: Messages API raw (reimplementerebbe skill loading + loop agentico senza vantaggi) e
  Managed Agents server-side (non caricano skill filesystem locali).
- **Deploy (Fase C)**: **Cloudflare Workers static assets** (non Pages: piattaforma congelata,
  convergenza ufficiale su Workers). Astro statico senza adapter: `wrangler deploy` con
  `assets.directory: ./dist`; dall'editor, Direct Uploads API con dedup dei file. Limiti Free ok
  (100 Worker = 100 clienti, asset serviti gratis). Dettagli e fonti nel doc decisioni.

---

## 7. File della pipeline

```
.claude/
  agents/    copywriter.md · palette-designer.md · image-prompter.md
  skills/
    local-service-copywriter/SKILL.md
    palette-designer/SKILL.md + check-contrast.mjs
    image-prompt-generator/SKILL.md + probe-bfl.mjs
site-renderer/
  blueprints/conversione-locale-v1/  blueprint.json + slots.json   (contratto slot)
  scripts/   validate-site.ts · assemble-site.ts · [intake-tally.ts: da fare]
docs/
  decisions/2026-07-verifiche-fase-b.md   (esiti verifiche con fonti)
  evals/fine-tuning-report.md             (A/B test delle skill)
```

---

## 8. Open items

1. **`BFL_API_KEY`**: creare la chiave, aggiungerla come env var, approvare la permission per
   `api.bfl.ai` in `settings.local.json`, eseguire `probe-bfl.mjs` (conferma live di
   endpoint/parametri — costo ~centesimi).
2. **Campi reali del form Tally**: esportarli per completare il mapping di `intake-tally.ts`
   (l'architettura è chiusa, manca solo la tabella key→slot) e fare una submission di prova
   loggando il payload raw prima di congelare il parser.
3. **Permission locali**: aggiungere in `.claude/settings.local.json` le entry
   `WebFetch(domain:docs.bfl.ai)`, `WebFetch(domain:api.bfl.ai)`, `WebFetch(domain:tally.so)`,
   `WebFetch(domain:developers.tally.so)` e `Bash(curl -sI https://api.bfl.ai/:*)` (da fare a
   mano: la modifica automatica delle permission è bloccata per policy). Nota ambiente remoto:
   il proxy blocca comunque il CONNECT verso api.bfl.ai/docs.bfl.ai/fal.ai/tally.so — il probe
   live va eseguito da una macchina senza proxy o dopo sblocco della policy di rete.

---

## 9. Verifica (gate E2E — già verde il 2026-07-04)

Catena completa senza costi API, ripetibile a ogni modifica del contratto:

1. Artifact golden estratti dal blueprint → `assemble-site.ts` → output identico al blueprint,
   50/50 slot, exit 0.
2. `validate-site.ts` sul site.json assemblato → exit 0.
3. `npm run build` → verde (10 pagine).
4. `check-contrast.mjs` sulle coppie palette (bianco/primary ≥4.5) → PASS.
5. Casi negativi dell'assembler (path fuori slot, agente sbagliato, maxChars, doppio accent, hex
   invalido, dependsOn violato, lunghezze array in conflitto) → tutti rifiutati con errore chiaro.

Quando arriverà la `BFL_API_KEY`: aggiungere al gate l'esecuzione reale di `probe-bfl.mjs` e un
dry-run end-to-end su un brief fittizio (ditta ristrutturazioni a Roma) con conferma visiva in
browser e re-check contrasto sulla pagina resa.

Attenzione: `docs/evals/generated-site-A.json` NON è più una fixture valida (schema evoluto dopo
l'eval: icone fuori enum, budget più stretti, ordine sezioni superato) — gli artifact di test si
estraggono dal blueprint corrente.
