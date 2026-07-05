# Verifiche di fattibilità Fase B — decisioni (luglio 2026)

ADR leggero: per ogni area, esito della verifica, decisione e stato. Fonte di verità
operativa: `docs/agents-skills-plan.md` (riscritto in pari data). Verifiche eseguite
il 2026-07-04.

## 1. Assembler deterministico — ✅ VERIFICATA (spike verde)

**Verifica**: scritto e testato `site-renderer/scripts/assemble-site.ts` (TS via
`node --experimental-strip-types`, zero dipendenze — stesso pattern di
`validate-site.ts`).

- Round-trip golden: artifact estratti dal blueprint → riassemblati → **output
  byte-identico al blueprint**, 50/50 slot riempiti, Zod valido.
- 7 casi negativi rifiutati con errore puntuale: path fuori slot, path di un altro
  agente, `maxChars` sforato, doppio `**accent**`, hex invalido, `dependsOn` violato
  (caption vuote prima delle foto gallery), lunghezze array in conflitto tra slot
  fratelli.
- `--partial` per i run per-checkpoint: verde.

**Decisione**: formato artifact = un JSON piatto per agente
(`{intake,palette,copy,images}.json`, mappa `path → valore`, array per le wildcard).
Enforcement dei constraint pre-merge nell'assembler + Zod come gate finale (i budget
restano duplicati per design, regola 3 del README blueprint). Documentato in
`site-renderer/blueprints/README.md`.

## 2. Intake Tally — ✅ architettura chiusa, mapping in attesa dei campi reali

**Decisione**: **parser deterministico, non agente LLM.** Gli 11 slot `intake` di
`slots.json` sono tutti verbatim o meccanici (slug = kebab-case del nome, filtro dei
social forniti, `logo: null` se assente, `tone` = aggettivi verbatim): nessun giudizio
da modello, quindi niente costi né non-determinismo. Futuro
`site-renderer/scripts/intake-tally.ts` con mapping dichiarativo
`tally-field-key → path slot`.

**Verifica payload webhook (2026-07-04)** — fonti: tally.so/help/webhooks,
developers.tally.so (via snippet indicizzati: il proxy blocca il fetch diretto) +
codice reale dell'integrazione npm `n8n-nodes-tallyforms`:

- Payload `FORM_RESPONSE`: `{ eventId, eventType, data: { formId, fields: [{ key,
  label, type, value, options? }] } }`. Tipi: `INPUT_TEXT/EMAIL/PHONE_NUMBER` (value
  stringa); `MULTIPLE_CHOICE`/`DROPDOWN`/`CHECKBOXES` → **value = UUID opzione**, il
  testo si risolve con lookup in `options[{id,text}]` (deterministico ma
  obbligatorio); `FILE_UPLOAD` → array di oggetti con `url`.
- Firma: header `Tally-Signature`, HMAC-SHA256; **due formati documentati** (base64
  del body nei help doc; `t=<ts>,v1=<hex>` nei developer doc) → supportarli entrambi
  e calcolare sempre sul raw body. Webhook + firma + API REST disponibili **anche sul
  piano free**.
- API REST: `GET api.tally.so/forms/{id}/submissions` (Bearer API key, free).
  **Aggiornamento 2026-07-05: il pull API è la fonte PRIMARIA della Fase 1** (l'utente ha
  la key e nessun endpoint pubblico); il webhook con firma HMAC diventa rilevante solo
  con n8n sul VPS (retry webhook: 5 tentativi con backoff fino a 24h + retry via API).
- Logo: l'URL nel webhook include un access token; **scadenza non documentata** →
  scaricare e ri-ospitare subito, mai hot-linkare nel site.json.
- Normalizzazioni deterministiche necessarie: telefono/WhatsApp in formato libero
  (assumere country default IT), slug con translitterazione accenti, ancorare il
  parsing alle `key` dei campi (stabili) e MAI alle `label` (modificabili).

**Resta aperto**: il mapping definitivo richiede l'export dei campi reali del form
Tally (input dell'utente) + una submission di prova con log del payload raw prima di
congelare il parser.

## 3. Selezione sezioni (post drop del Section Architect) — ✅ chiusa per v1

**Verifica**: gli slot indirizzano le sezioni **per indice numerico**
(`sections[4]` = Gallery): un drop prima dell'applicazione degli slot invaliderebbe
tutti i path successivi. Confermato sul contratto reale.

**Decisione**: blueprint fisso per archetipo (oggi: `conversione-locale-v1`, 12
sezioni a ordine testato). Le sezioni condizionali si gestiscono con **drop
POST-merge nell'assembler** — unico caso già emerso: Gallery rimossa se il cliente
non fornisce ≥4 foto reali (policy Round 4: la gallery non si genera mai). Nessun
mini-step LLM: con un solo archetipo aggiungerebbe varianza senza valore. Evoluzione
v2 (regole `when` dichiarate nel blueprint) richiede prima il passaggio a path per
`id` di sezione — annotato nel README blueprint, non ora.

## 4. Immagini: provider e modelli — ✅ confermata su docs (validazione live alla key)

**Verifica (2026-07-04, docs.bfl.ai + bfl.ai/pricing via ricerca indicizzata; il
proxy blocca il fetch diretto di api.bfl.ai/docs.bfl.ai/fal.ai, quindi il curl di
reachability è NON conclusivo — 403 del gateway, non dell'API):**

- **Endpoint confermati**: `POST https://api.bfl.ai/v1/flux-2-pro` e `/v1/flux-2-max`.
  Host regionali: `api.bfl.ai` (globale, consigliato), `api.eu.bfl.ai` (solo-EU, opzione
  GDPR rilevante per PMI italiane). Usare SEMPRE la `polling_url` restituita.
- **Auth**: header `x-key`. Rate limit: 24 task attivi concorrenti (429 oltre).
  Crediti: 1 credito = $0.01, acquisto su dashboard.bfl.ai.
- **Parametri**: `width`/`height` multipli di 16 (max 4MP), `output_format` solo
  **jpeg/png** (⚠ niente webp nativo: conversione in pipeline se serve), `seed`,
  webhook opzionale, reference `input_image`…`input_image_8`, prompt JSON strutturato
  supportato. **⚠ raw mode NON esiste su FLUX.2** (era di FLUX 1.1 ultra) — rimosso
  dalla skill.
- **URL firmati di consegna: scadono in ~10 minuti** → la pipeline scarica subito e
  ri-ospita (mai riusare l'URL BFL nel site.json).
- **Prezzi confermati** (bfl.ai/pricing): [pro] $0.03 primo MP + $0.015/MP extra;
  [max] $0.07 primo MP + $0.03/MP extra. Le stime di giugno valgono a 1MP; oltre, il
  marginale è più basso (hero 1920×1080 ≈ $0.045 con [pro]).
- **fal.ai come fallback**: `fal-ai/flux-2-pro` a **prezzo identico, nessun markup**;
  vantaggi: coda persistente, retry automatici fino a 10×, webhook con retry 2h,
  output su fal.media con scadenza controllabile (niente vincolo dei 10 minuti).
- **Lane Google chiusa, confermato**: Imagen 4 deprecato (Gemini API: shutdown
  17-08-2026; Firebase AI Logic: già chiuso dal 24-06-2026 — fonti ai.google.dev e
  firebase.google.com). Il successore Gemini 3.1 Flash Image ("Nano Banana 2") costa
  ~$0.067/immagine 1K: più del doppio di [pro] e quasi quanto [max] → **FLUX.2-only
  resta valida anche economicamente**. Nota utente: su LLM Arena Imagen 4 e FLUX.2
  [pro] erano i migliori — l'alternativa Google resta solo qualitativa, non di costo,
  e comunque non su Imagen 4.

**Decisione**: BFL diretto, [pro] default + [max] hero; fal.ai fallback documentato.
Probe pronto: `.claude/skills/image-prompt-generator/probe-bfl.mjs` (submit 512×512 +
poll; senza `BFL_API_KEY` esce con istruzioni — exit 2 verificato). SKILL.md immagini
corretta (endpoint verificati, no raw mode, no webp, scadenza URL, prezzi).

## 5. Orchestrazione — ✅ CONFERMATA su docs ufficiali (nessun vicolo cieco)

**Verifica** (code.claude.com/docs/en/agent-sdk, 2026-07-04): il Claude Agent SDK
TypeScript (`@anthropic-ai/claude-agent-sdk`):

- carica le **stesse** `.claude/skills/*/SKILL.md` e `.claude/agents/*.md` del repo
  (`options: { cwd, settingSources: ["project"] }`) — fonte:
  code.claude.com/docs/en/agent-sdk/skills;
- espone checkpoint di approvazione programmabili: callback `canUseTool`, hook
  `PreToolUse`, e `defer` + `resume` per sospendere in attesa dell'approvazione da
  UI — fonti: …/agent-sdk/permissions, …/agent-sdk/user-input;
- gira in un processo server Node locale (API route Next.js), richiede
  `ANTHROPIC_API_KEY`; subagent invocabili programmaticamente, output strutturato
  richiedendo JSON nel prompt — fonti: …/agent-sdk/typescript, …/agent-sdk/subagents.

⚠ **Correzione 2026-07-05 (vincolo di costo)**: l'utente lavora col piano Claude Max e
NON vuole pagare API finché il cliente non paga — l'Agent SDK con `ANTHROPIC_API_KEY`
configge con questo vincolo. Per la Fase C l'alternativa a costo zero è lo **spawn
headless di `claude -p`** dal backend Next.js (usa il login Max; artifact su disco =
stesso contratto) oppure il token da `claude setup-token`. Da rivalutare quando la
Fase C parte; il contratto runner-agnostico del punto 1 resta invariato.

Managed Agents (server-hosted Anthropic) scartati: non caricano skill filesystem.
Messages API raw scartata: reimplementerebbe skill loading + tool + loop agentico
senza vantaggi.

**Decisione a due livelli**:
1. **Contratto stabile runner-agnostico**: ogni step produce un artifact JSON su
   disco; assemblaggio e validazione sono CLI deterministiche. Checkpoint umano =
   revisione dell'artifact prima dello step successivo.
2. **Runner per fase**: oggi Claude Code interattivo con i 3 subagent; Fase C =
   Agent SDK dal backend Next.js con `canUseTool` come gate di approvazione UI.
   Skill, agenti e artifact restano invariati: cambia solo chi invoca.

## 6. Deploy Cloudflare (Fase C) — ✅ verificata su docs: **Workers static assets, NON Pages**

**Verifica (2026-07-04)**: Cloudflare ha dichiarato ufficialmente che Pages e Workers stanno
convergendo e che tutti gli investimenti vanno su Workers ("you should start with Workers…
all of our investment… will be dedicated to improving Workers" —
blog.cloudflare.com/pages-and-workers-are-converging-into-one-experience). Pages non è
deprecato ma è **congelato** (nessuna feature nuova, auto-migrazione futura annunciata).
Nota ambiente: developers.cloudflare.com è bloccato dal proxy (403) — claim verificati via
ricerca indicizzata sui docs ufficiali, URL citati comunque corretti.

**Decisione**: **Workers static assets** per i siti generati. Per Astro statico non servono né
adapter né codice Worker:

```jsonc
// wrangler.jsonc per cliente
{ "name": "cliente-x", "compatibility_date": "2026-07-01", "assets": { "directory": "./dist" } }
```

- Deploy CLI: `npx wrangler deploy` con env `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare
  Workers") + `CLOUDFLARE_ACCOUNT_ID`.
- Deploy programmatico dall'editor (Fase C): **Direct Uploads API di Workers** (3 chiamate:
  assets-upload-session con manifest+hash → upload dei soli file mancanti → PUT dello script),
  con dedup nativo dei file invariati; esempio end-to-end nell'SDK ufficiale
  `cloudflare-typescript` (examples/workers/script-with-assets-upload.ts). In alternativa:
  spawn di `wrangler deploy` come child process.
- Limiti Free ampiamente sufficienti: 100 Worker/account (= 100 clienti; 500 su Paid $5/mese),
  20k file/deploy, 25 MiB/file, **asset statici serviti gratis e illimitati** (non contano nel
  limite richieste del Free).
- Vincolo operativo da pianificare: il dominio custom di ogni cliente richiede la **zona DNS
  sull'account Cloudflare** (Workers Custom Domains crea DNS+certificato in automatico).
- Fonti: developers.cloudflare.com/workers/static-assets/ (+ /direct-upload/,
  /framework-guides/web-apps/astro/, /platform/limits/), blog.cloudflare.com (convergenza),
  changelog 2025-09-02 (limiti asset).

## 6-bis. Loghi: mai raster AI, simbolo vettoriale Recraft + tipografia del preset (2026-07-05)

**Problema**: i loghi generati con modelli raster (FLUX/Imagen/Claude che "disegna") sono
AI-slop riconoscibile — lettere storpiate, gradienti/3D, cliché, colori fuori palette,
output non vettoriale. Inadatti a rappresentare una PMI reale.

**Verifica (2026-07-05, ricerca web + docs.recraft.ai)**:
- **Recraft** è l'unico servizio maturo con **SVG nativo via API**: V4.1 Standard Vector
  $0.08/img, V4.1 Pro Vector $0.30/img; API a crediti prepagati ($1 = 1.000 unit).
  Gli **style curati** (icon/pictogram/emblem) sono su `recraftv3_vector` — i modelli V4
  non supportano ancora gli styles. Vectorize di un raster esistente: $0.01.
- **Diritti**: piano PAID = piena proprietà e uso commerciale (anche per clienti di
  un'agenzia); piano FREE = nessun diritto commerciale, output pubblici → vietato per
  lavoro clienti.
- Alternative valutate: Ideogram (ottima tipografia ma raster), Logo Diffusion/Kittl/
  Looka (consumer, no API solida), Firefly (raster, indennizzo enterprise).

**Decisione (architettura anti-slop, 3 regole)**:
1. **L'AI genera SOLO il simbolo** (pittogramma SVG, prompt con divieto assoluto di
   testo/lettere): la tipografia del lockup è SEMPRE quella del preset, resa dall'Header.
2. **Il colore lo impone il sistema**: mark generato monocromo e ricolorato
   deterministicamente sull'hex primary (`generate-logo.mjs`; bianchi → trasparente,
   così sfondo e knockout funzionano su chiaro e scuro).
3. **6 varianti + checkpoint umano** (~50¢/cliente); lista nera dei cliché nella skill.

Strumenti: `.claude/skills/logo-designer/` + `.claude/agents/logo-designer.md` +
`site-renderer/scripts/generate-logo.mjs` (generazione+ricoloro, `--recolor` testato;
probe integrato: senza `RECRAFT_API_KEY` esce 2 con istruzioni). Cliente CON logo dal
form → la skill non si usa (al più vectorize $0.01).

**Aperto**: `RECRAFT_API_KEY` (piano paid) per la validazione live di endpoint/parametri
(`external.api.recraft.ai/v1/images/generations` — da confermare col primo run, i docs
indicizzati non fanno fede).

## 7. Gate E2E Fase B — ✅ VERDE (2026-07-04, zero costi API)

Catena completa: artifact golden → `assemble-site.ts` (50/50 slot) →
`validate-site.ts` exit 0 → `npm run build` verde (10 pagine) →
`check-contrast.mjs` PASS (bianco/`#b0561a` = 5.01:1 ≥ 4.5). Più i 7 casi negativi
dell'assembler correttamente rifiutati.

## Scoperte collaterali (da sistemare / annotate)

- **`docs/evals/generated-site-A.json` è INVALIDO contro lo schema attuale** (icona
  `hard-hat` fuori enum, `desc` >110, `title` >40, `legalNote` >90) e usa un ordine
  sezioni superato con `ProblemAgitation` (schema-only, senza componente). Lo schema
  è evoluto dopo l'eval: il claim "Zod VALID" del fine-tuning report va letto come
  storico. Non usarlo come fixture; gli artifact di test si estraggono dal blueprint.
- **Ordine sezioni nel README blueprint corretto** (citava WhyChooseUs; il blueprint
  reale ha ContactCTA-form a `sections[6]` e StickyCta in coda).

## Dipendenze esterne residue

1. `BFL_API_KEY` → eseguire `probe-bfl.mjs` e confermare endpoint/parametri live.
2. Export dei campi reali del form Tally → completare il mapping di
   `intake-tally.ts`.
