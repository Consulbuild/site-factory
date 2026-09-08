# Ricerca ecosistema Claude Code: skill per loghi, gusto di design, prompt per generatori di immagini

Rapporto di ricerca (agente, 2026-09-08).

## Metodo e perimetro

16 query (le 12 suggerite più varianti su Recraft, Ideogram, FLUX, design critique, Reddit/X) e 45 pagine aperte con WebFetch: repository GitHub, skills.sh, anthropics/skills, awesome-claude-skills (travisvn 15k★, ComposioHQ 74,7k★), claudeskills.info, awesomeskill.ai, getclaudeskills, blog ufficiali BFL/Ideogram/Anthropic. **Non raggiunte**: 4 schede mcpmarket.com (HTTP 429: logo-creator-1, Midjourney-Style Flux Pro, Ideogram Core Workflow, AI Artist), l'articolo UX Planet su Claude Design (403), la skill Recraft `openclaw/skills/nkrcrft/recraft` (404). **Reddit e X**: nessuna query ha restituito thread specifici su skill per loghi; trovati solo blog (neonwatty, 0xdoublemoon, substack "Claude Code for Designers"). Le date di ultimo commit non sono esposte dalla pagina GitHub letta via fetch: riportati conteggio commit e date dove il repo le dichiara. Letta anche la skill `logo-designer` già presente nel repo Site-factory per calibrare il giudizio finale.

Criterio di voto (1–5): utilità per «generare loghi professionali per PMI italiane a partire dai dati di un form», in una pipeline headless senza checkpoint umano.

---

## Fronte A — Skill che generano loghi

| Skill | Autore / URL | ★ · licenza | Come genera | Script / chiavi | Voto |
|---|---|---|---|---|---|
| logo-designer-skill | [neonwatty](https://github.com/neonwatty/logo-designer-skill) | 80 · MIT · 25 commit | SVG scritto a mano da Claude, 4 fasi (interview → 3-5 concept → refine → export), test a 16/32/64 px | `resvg` npm per PNG; `lineage-handoff.mjs` locale; nessuna API | 3 |
| claude-code-logodesign-skill | [pranavred](https://github.com/pranavred/claude-code-logodesign-skill) | 0 · MIT · 5 commit | SVG a mano, `viewBox` 24×24, `currentColor`, varianti dark, 8 file `references/` (path-patterns, icon-design, pitfalls) | SVGO; installer `npx`; nessuna API | 3 |
| logo-generator-skill | [op7418](https://github.com/op7418/logo-generator-skill) | 2,1k · MIT · 4 commit | LLM scrive ≥6 SVG geometrici; Gemini «Nano Banana» genera solo gli sfondi showcase dal PNG | Python: `google-genai`, `cairosvg`, `Pillow`; `GEMINI_API_KEY` (anche endpoint terzi via `GEMINI_API_BASE_URL`) | 3 |
| logo-creator (opc-skills) | [ReScienceLab](https://github.com/resciencelab/opc-skills) | 1,8k · Apache-2 | Gemini raster (fino a 20 varianti) → remove.bg → Recraft **vettorizza**; preview HTML | `vectorize.py`, `remove_bg.py`, `crop_logo.py`; 3 chiavi (Gemini, remove.bg, Recraft) | 2 |
| generate-image | [K-Dense-AI](https://github.com/K-Dense-AI/claude-scientific-writer/blob/main/skills/generate-image/SKILL.md) | (sub-skill) | OpenRouter Images API, ~30 modelli; per loghi consiglia `recraft/recraft-v4-vector` → SVG nativo | `generate_image.py` solo stdlib; `OPENROUTER_API_KEY` | 3 |
| svg-logo-designer | [rknall](https://github.com/rknall/claude-skills) | 67 · licenza non dichiarata · ultimo commit 20-10-2025 | SVG a mano, 30-75 file (3-5 concept × layout × colori) | nessuno | 2 |
| logo-designer | [inbharatai](https://github.com/inbharatai/claude-skills) | 33 · MIT | SVG a mano; skill **autogenerata** («zero manual editing», 183 skill) | nessuno | 1 |
| ai-graphic-design-skill | [designrique](https://github.com/designrique/ai-graphic-design-skill) | 24 · MIT · 3 commit | Non genera: mappa 15 tool (Recraft per SVG, Ideogram, Midjourney), pipeline raster→vettore, IP | nessuno | 2 |
| logo-design-guide | [inference-sh](https://github.com/inference-sh/skills) | 729 · MIT | 6 tipi di logo, squint test 16 px, checklist monocolore/invertito; genera via CLI `belt` (FLUX, Seedream, Grok) | **binario CLI + `belt login`** (account) | 2 |
| image-studio | [pexoai/pexo-skills](https://github.com/pexoai/pexo-skills) | 777 · MIT · 57 commit | Midjourney/Flux/Ideogram/Recraft/Gemini con una chiave Pexo (intermediario a crediti) | script in `tools/`; chiave Pexo | 2 |
| Ideogram MCP + ideogram4 | [ideogram.ai/blog/claude-mcp](https://ideogram.ai/blog/claude-mcp/), [ideogram-oss/ideogram4](https://github.com/ideogram-oss/ideogram4) | 2,8k · Apache-2 (pesi non-commerciali) · 06-2026 | MCP ufficiale (`generate_image`, `remix_image`); prompt JSON strutturato con `color_palette` fino a 16 hex; testo leggibile | chiave Ideogram; skill `/ideogram-prompt` citata dal blog ma non verificata su GitHub | 3 |
| svg.new plugin | [svgnew](https://github.com/svgnew/plugin) | 5 · 1 commit | Vettorizzazione raster→SVG a crediti (piano Pro) | `SVG_NEW_API_KEY` | 1 |
| Claude Design | [Anthropic Labs](https://www.anthropic.com/news/claude-design-anthropic-labs) | prodotto, 17-04-2026, Pro/Max | Web only; export Canva/PDF/PPTX/HTML, **SVG non dichiarato**; non invocabile da `claude -p` | — | 2 |
| web-asset-generator | [alonw0](https://github.com/alonw0/web-asset-generator) | 493 · MIT | Non disegna: da un logo produce favicon 16→512, icone PWA, OG image; verifica contrasto | Python/Pillow | 3 (post-processing) |

**Osservazioni.** Le skill «SVG a mano» (neonwatty, pranavred, op7418, rknall) condividono lo stesso limite strutturale: Claude ragiona bene su primitive geometriche ma il risultato è pittogrammi «da icona», e la tipografia la evitano tutte (neonwatty: «no external fonts»; op7418 non tratta il wordmark). Sono pensate per un umano in chat che itera (37 iterazioni nell'esempio di neonwatty), non per una pipeline. Il **valore trasferibile** sta nei `references/` di pranavred (path-patterns, pitfalls) e nel test a piccola dimensione anticipato di neonwatty («always check small sizes early»). Il pattern di opc-skills (raster Gemini → trace) è esattamente quello che la skill di casa vieta («mai raster+trace»). Sicurezza: op7418 e opc-skills installano dipendenze Python e leggono chiavi da `.env`; inference-sh scarica ed esegue un binario CLI; midjourney-cc-skill (sotto) automatizza un browser loggato.

---

## Fronte B — Skill che danno «gusto» e criteri di giudizio

| Skill | Autore / URL | ★ · licenza | Cosa contiene | Applicabilità al giudizio di un logo | Voto |
|---|---|---|---|---|---|
| brandkit | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/brandkit/SKILL.md) | 85,4k (repo) · MIT · ~800 righe | Prompt system per board di brand: 6 metodi di concept (monogram+meaning, negative space, construction geometry…), 8 «visual mode», anti-generic («Do not generate generic logos… messy AI moodboards»), regole: «simple, memorable, symbolic, scalable, ownable» | Alta come **rubrica**: la blacklist (fulmini, animali casuali, clipart) e i 6 metodi sono riusabili in un critico; ma è pensata per generare immagini di board | 4 |
| brand-identity | [rampstackco/claude-skills](https://github.com/rampstackco/claude-skills/blob/main/skills/brand-identity/SKILL.md) | 830 · MIT · 203 righe | Sistema logo (primary, wordmark, symbol, lockup): leggibile a 16 px, riproducibile monocolore, silhouette distintiva; colore con WCAG AA; 6 step con stress-test | Criteri concreti e verificabili; niente rubrica a punteggio | 4 |
| frontend-design | [anthropics/skills](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | 175k (repo) · Apache-2 | 5 cluster «default AI» (cream+terracotta, dark+acid green, broadsheet, SaaS cards, template chrome); review «default per qualsiasi brief vs scelta per questo brief» | Il test «default vs scelta» è il singolo criterio più utile per un critico di loghi; nessuna regola sui marchi | 3 |
| design-taste-frontend | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) | idem · ~12k parole | Bandi meccanici (em-dash, palette beige/ottone, 3 card uguali, eyebrow max 1 ogni 3 sezioni), 1 accento con saturazione <80% | Tratta i loghi solo come vincolo esistente («REAL SVG logos, not text wordmarks») | 2 |
| claude-design-skill | [jiji262](https://github.com/jiji262/claude-design-skill) | 190 · MIT | Adattamento del system prompt Design di Claude.ai; «Core Asset Protocol» a 5 step per loghi/product shot come «first-class citizens» | Gestisce loghi forniti, non li giudica | 2 |
| claude-design-critic | [OneWave-AI](https://github.com/OneWave-AI/claude-skills/blob/main/claude-design-critic/SKILL.md) | — | Tell AI in design **e copy**; verdetto SHIP / FIX FIRST / REBUILD | Struttura del verdetto riusabile; scope siti | 2 |
| design-critic | [curiositech](https://github.com/curiositech/some_claude_skills/blob/main/.claude/skills/design-critic/SKILL.md) | — · 166 righe | 6 dimensioni pesate 0-100 (accessibilità 20%, colore 15%, tipografia 15%, layout 20%, modernità, usabilità) | Legge **codice**, non immagini; nessuna dimensione per marchi | 2 |
| impeccable | [pbakaus](https://github.com/pbakaus/impeccable) | 66,5k · Apache-2 | 23 comandi (critique, audit, polish…) — già installata | Nessun comando per loghi; l'hook scarica un binario pinned in `~/.impeccable/bin/` | 2 |
| ui-ux-pro-max | [nextlevelbuilder](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 126k · MIT | 192 palette per settore, 74 coppie di font (BM25 in Python) — già installata | «Logo Design» solo nel tier **premium** a pagamento | 2 |
| brand-guidelines | anthropics/skills | Apache-2 | Codifica il brand **di Anthropic** (#d97757, Poppins/Lora); non è un template | Nulla sui loghi | 1 |
| canvas-design | anthropics/skills | Apache-2 | Poster/arte in PNG/PDF con «design philosophy» manifesto; esplicitamente non loghi | — | 1 |
| theme-factory / algorithmic-art | anthropics/skills | Apache-2 | 10 temi colore+font per artifact; p5.js generativo | Solo ispirazione palette | 1 |
| design-critique | [richhemsley3](https://github.com/richhemsley3/claude-design-skills) | 0 · MIT · 1 commit | Euristiche Nielsen, Laws of UX | UX, non identità | 1 |
| Package brand guidelines in a skill | [academy.claude.com](https://academy.claude.com/use-cases/package-your-brand-guidelines-in-a-skill) | ufficiale | Struttura SKILL.md + specs.md + `brand_utils.py` | Nessuna regola sui loghi | 1 |

**Osservazioni.** Le skill ufficiali Anthropic non contengono nulla di specifico per giudicare un marchio: brand-guidelines è l'identità di Anthropic, canvas-design si dichiara «not for logos», frontend-design è il migliore per il *metodo* (catalogo dei default e review anti-generico) ma il suo dominio sono pagine web. Le uniche fonti con criteri esplicitamente sul logo sono **brandkit** (blacklist e metodi di concept) e **brand-identity** di rampstackco (16 px, monocolore, silhouette). Nessuna skill trovata *guarda* un'immagine di logo e produce un verdetto strutturato: i critici della community leggono CSS o URL.

---

## Fronte C — Prompt engineering per generatori di immagini

| Skill | Autore / URL | ★ · licenza | Contenuto | Rischi | Voto |
|---|---|---|---|---|---|
| flux-image-best-practices + bfl-api | [black-forest-labs/skills](https://github.com/black-forest-labs/skills) (ufficiale) | 115 · MIT · 53 commit | Prosa > keyword, la luce è la leva principale, testo tra virgolette, hex `#RRGGBB` accanto ai nomi colore, **niente negative prompt**; pattern async/polling Python-TS; esempi flat-vector | chiave BFL (già in uso nella pipeline) | 4 |
| Ideogram 4 prompting guide | [ideogram-oss/ideogram4 docs/prompting.md](https://github.com/ideogram-oss/ideogram4) | 2,8k · Apache-2 | JSON strutturato (Magic Prompt OFF = «what you specify is what renders»), `color_palette` 16 hex, bounding box di layout, ordine dei campi vincolante | pesi non commerciali; API a pagamento | 3 |
| midjourney-prompting | [mike-coulbourn/claude-vibes](https://github.com/mike-coulbourn/claude-vibes) | 39 · MIT · 106 commit | Framework a 7 elementi, F.O.C.A.L., `--sref/--cref`, librerie di stile foto/illustrazione | Midjourney non ha API: solo copia-incolla | 2 |
| midjourney-cc-skill | [JustinPerea](https://github.com/JustinPerea/midjourney-cc-skill) | 11 · MIT · 22 commit | V7 params, 124 keyword valutate, 94 pattern, SQLite di apprendimento | **Playwright** su midjourney.com con cookie di login persistenti, `--headed`; automazione contro ToS | 1 |
| imagegen-frontend-web | Leonxlnx/taste-skill | 85,4k · MIT | Motore combinatorio a 12 categorie, bandi (gradienti viola, blob, fake dashboard) | «Not applicable» ai loghi per costruzione | 2 |
| ai-image-generator | [jezweb/claude-skills](https://github.com/jezweb/claude-skills/blob/main/plugins/design-assets/skills/ai-image-generator/SKILL.md) | — | Framework a 5 parti (tipo, soggetto, ambiente, tecnica, vincoli), Gemini + gpt-image-2 in Python `urllib` | Vincolo standard «no text, no logos» | 2 |
| image-prompt-generator | [Fullsuite Agency](https://www.getclaudeskills.com/skills/image-prompt-generator-fullsuite-agency) | repo non indicato | 6 reference per Midjourney/Flux/SD/Gemini/Seedream | non verificabile il codice sorgente | 2 |
| baoyu-image-gen | [JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills) | 25,7k · MIT · 732 commit | 10 provider (GPT Image 2, Gemini, Replicate, Seedream…), batch, reference image; nessuna skill logo né guida di stile per marchi | 10 variabili `*_API_KEY` in `.env` | 2 |
| claude-image-generation | [hex](https://github.com/hex/claude-image-generation) | 8 · MIT · 120 commit | Bash `curl`+`jq` per Gemini/OpenAI/Grok/OpenRouter | nessuna capacità SVG | 2 |

Le schede mcpmarket «Midjourney-Style Flux Pro» (struttura a 5 livelli per FLUX 1.1 su Replicate), «AI Artist» e «Ideogram Core Workflow» esistono nei risultati ma **non sono state aperte** (429): non valutate.

---

## Classifiche

**Fronte A (generazione)**
1. **K-Dense generate-image** (3) — unico script stdlib che parla direttamente a `recraft-v4-vector` con output SVG; via OpenRouter però, quindi doppio intermediario rispetto alla chiamata Recraft diretta già in casa.
2. **neonwatty logo-designer-skill** (3) — il workflow SVG-a-mano più maturo; da cui rubare il gate «16/32/64 px prima di tutto».
3. **pranavred logodesign-skill** (3) — per i `references/` (path-patterns, pitfalls, dark variant), non per la skill.
4. **op7418 logo-generator-skill** (3) — 2,1k★, pattern geometrici ≥6 varianti; Gemini serve solo agli showcase.
5. **web-asset-generator** (3) — non genera ma chiude il kit (favicon, OG) dal mark.

**Fronte B (gusto)**
1. **brandkit** (4) — blacklist e 6 metodi di concept: materiale grezzo per una rubrica.
2. **rampstackco brand-identity** (4) — criteri verificabili (16 px, monocolore, silhouette).
3. **anthropics frontend-design** (3) — il test «default vs scelta» e il catalogo dei cliché.
4. **OneWave claude-design-critic** (2) — schema di verdetto SHIP/FIX/REBUILD.
5. **ui-ux-pro-max** (2) — 192 palette per settore come sanity check del preset.

**Fronte C (prompt)**
1. **black-forest-labs/skills** (4) — ufficiale, coerente con FLUX.2 già in pipeline.
2. **Ideogram 4 prompting guide** (3) — il JSON con `color_palette` hex è il modo più controllabile di imporre la palette a un generatore raster.
3. **claude-vibes midjourney-prompting** (2) — framework a 7 elementi trasferibile a qualunque modello.
4. **jezweb ai-image-generator** (2) — framework a 5 parti, esempi in prosa.
5. **imagegen-frontend-web** (2) — solo per l'idea del motore combinatorio di varianti.

---

## Cosa manca nell'ecosistema (giudizio onesto)

1. **Nessuna skill è headless.** Tutte le skill per loghi presuppongono un umano che sceglie tra 5-20 varianti in chat. Non trovata una sola skill con selezione autonoma motivata e tracciata — che è esattamente ciò che `logo-designer` di Site-factory fa già (`logo-trace.json`, modalità pipeline). Su questo punto la skill di casa è **più avanti dell'ecosistema**.
2. **Nessun critico visivo di loghi.** Non esiste una skill che legga l'immagine del mark (Read multimodale) e produca un verdetto a rubrica con soglie (leggibilità a 32 px, conteggio colori residui, cliché, pertinenza col mestiere). I critici trovati leggono codice o URL. Va scritta in casa, sul modello di `image-critic`/`design-critic` già nel repo, fondendo: blacklist brandkit + criteri rampstackco (16 px, monocolore, silhouette) + test «default vs scelta» di frontend-design + i vincoli locali.
3. **Recraft vettoriale è quasi assente.** Solo K-Dense (via OpenRouter) e opc-skills (per vettorizzare raster) lo toccano; la skill dedicata `openclaw/skills` è 404.
4. **Nessuna skill mappa settore → soggetto.** La tabella «ristrutturazioni → cazzuola/filo a piombo/facciata con impalcatura» e la lista nera sono un'esclusiva locale; l'ecosistema si ferma a «be simple, memorable, scalable». Se c'è un investimento da fare, è **ampliare questa mappa** con più settori delle PMI italiane e con 2-3 soggetti alternativi ciascuno.
5. **Tipografia del logo: tutti la evitano.** Nessuna skill affronta il lockup mark + wordmark.
6. **Prompt craft riusabile**: da BFL e Ideogram vale la pena portare in casa due regole precise — «hex accanto al nome del colore» e «niente negative prompt su FLUX».

**Sintesi**: dall'ecosistema si prendono frammenti di rubrica (brandkit, rampstackco), un gate (piccole dimensioni prima), e due regole di prompt (BFL, Ideogram). Il pezzo che manca — un **logo-critic** visivo, headless, con soglie hard e blacklist di settore — non esiste e va scritto in casa.
