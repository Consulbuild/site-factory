# Ricerca — Varietà di design con qualità garantita (2026-07-10)

> Macro-ricerca multi-agente sulla domanda: **come dare varietà al design dei siti generati
> (estetica + layout + grammatiche per-settore) mantenendo qualità da designer senior umano**,
> con strategia ibrida decisa a monte: fabbrica offline (AI propone → critico visivo → audit
> umano → libreria) + adattamenti limitati a runtime.
>
> Metodo: workflow di 30 agenti — 6 filoni di ricerca in parallelo (70 finding), direttore,
> 8 follow-up dedicati (63 finding), 10 verifiche avversariali dei claim portanti, critico di
> completezza + 4 ricerche di chiusura (32 finding). Fonti verificate al 2026-07-10.

## Sintesi esecutiva

### La risposta in breve

1. **La strategia ibrida è quella giusta, validata dall'industria.** Chi funziona (Relume,
   Squarespace Blueprint, Framer) usa esattamente il modello Site Factory: libreria curata da
   umani + AI che compone dentro vincoli. Chi genera codice libero a runtime (v0, Lovable,
   Bolt) produce la "sea of sameness" shadcn; la fascia bassa (Durable, 10Web…) col template
   fisso riempito dall'AI viene smascherata subito. **Non esiste un tool da comprare che
   sostituisca la fabbrica offline** — esistono però tutti i pezzi per costruirla.
2. **La varietà percepita nasce dalla moltiplicazione di assi ortogonali curati**
   (blueprint × preset × palette × font pairing × varianti di sezione × trattamento foto),
   non dalla generazione libera. Squarespace fa "7 personalità × 4 palette × 2 pairing":
   piccola scala curata, varietà combinatoria percepita enorme.
3. **Per estrarre design system dai riferimenti NON usare screenshot→VLM** (i VLM riconoscono
   i font al ~30%, sbagliano valori fini con sicurezza): usare l'estrazione deterministica dal
   CSS computato (Dembrandt / designlang / Project Wallace / Firecrawl branding) e riservare
   il VLM al giudizio d'insieme. Il pattern vincente: evidenza deterministica dal DOM → agente
   che redige il preset motivando ogni scelta sull'evidenza → render → critico.
4. **Il design-critic va costruito in casa** (non esiste un giudice estetico commerciale):
   stack a livelli — check deterministici (axe-core, contrasto, overflow) → UIClip come
   pre-filtro numerico locale gratuito (pesi MIT su HuggingFace, org `biglab`) → critico
   Claude con rubrica ancorata per-indicatore e few-shot → audit umano pairwise. La letteratura
   2026 ridimensiona i judge panel multi-LLM (errori correlati ≈ 2 voti effettivi): meglio un
   giudice calibrato + segnali di natura diversa (codice + umano).
5. **Le grammatiche per-settore sono permutazioni di un'anatomia di conversione invariante**,
   più 2-3 sezioni-firma per verticale (MenuList, BookingCTA, TeamCredentials, PriceList,
   Schedule) e — scoperta critica — **vincoli normativi per-verticale**: in sanità la
   L.145/2018 VIETA "visita/preventivo gratuito", testimonial enfatici e Before/After — regole
   che per l'edilizia sono lecite o addirittura raccomandate. La grammatica di settore deve
   includere sezioni vietate e claim vietati, non solo sezioni consigliate.
6. **Quadro legale (L. 132/2025, in vigore 10/10/2025)**: l'ingest di riferimenti è lecito
   dentro il perimetro TDM ma la violazione dell'opt-out è ora REATO; l'output AI è protetto
   solo con contributo umano documentato. Servono: check opt-out deterministico e loggato,
   sintesi da ≥3 riferimenti eterogenei (mai un sito singolo come modello), gate "distanza
   dalla fonte" nel critico, log delle decisioni umane della fabbrica (QA + prova di titolarità).

### L'architettura raccomandata della fabbrica di preset

```
riferimenti (One Page Love / Awwwards / Land-book / roundup di settore, raccolti a mano)
   │  check opt-out TDM loggato · ≥3 fonti eterogenee · niente concorrenti locali del cliente
   ▼
estrazione deterministica token (Dembrandt o designlang; fallback Project Wallace)
   ▼
agente "preset-designer" (claude -p): evidenza → blocco token DTCG del preset,
   ogni scelta motivata sull'evidenza (zero valori inventati)
   ▼
build deterministica: DTCG → CSS [data-preset] via Terrazzo → render /anteprima/{preset}
   ▼
GATE in cascata:
   1. deterministici: check-contrast, axe-core, overflow 390px, lint "solo classi semantiche"
   2. novelty gate: dHash anti-clone → diff token-space → CSD calibrato a percentili
      (vicino di libreria: deve essere DIVERSO; riferimento fonte: deve essere LONTANO)
   3. UIClip (locale, MIT): pre-filtro qualità "rotto vs sano"
   4. critico visivo Claude: rubrica 24 punti + Creative Distinction pesata alta,
      screenshot vivi 390px+desktop, verdetti per-sezione con nome
   ▼
audit umano PAIRWISE (nuovo preset vs migliore in libreria, stesso contenuto)
   ▼
libreria versionata: preset@semver in git, cliente pinna preset@versione,
   metadati per-asset (vettore personalità Aaker, settori, anti-pattern, vincoli di combinazione)
```

A runtime la selezione cliente→design diventa **deterministica** (filtro sui metadati →
punteggio → anti-collisione per mercato locale → tie-break con seed): niente AI nella scelta,
spiegabilità totale, zero rischio slop per-cliente.

### Esito delle 10 verifiche avversariali

| Claim | Verdetto |
|---|---|
| Dembrandt (CLI npm, ~2,1k stelle, DTCG, attivo) | CONFIRMED |
| designlang (9 estrattori, 11 output, WCAG auto-fix) | PARTIAL — esiste ma giovanissimo, 44 versioni in 2 mesi, da security-scan |
| Adobe leonardo-mcp@0.1.0 (feb 2026) | CONFIRMED — ma adozione ~zero, usare la libreria, MCP opzionale |
| Relume Wireframing 2.0 (25%→70% libreria usata, placement-aware) | CONFIRMED |
| Studio Digital Applied "2.000 pagine A/B" | PARTIAL — numeri citati fedeli ma studio non verificabile, red flag di ricerca AI-generated: non usare come fonte primaria |
| Spec W3C DTCG stabile 2025.10 | CONFIRMED |
| Terrazzo: DTCG → CSS con mode→`[data-preset]` | CONFIRMED |
| "Nine Judges, Two Effective Votes" (arXiv 2605.29800) | CONFIRMED |
| L.145/2018 divieti pubblicità sanitaria | PARTIAL — nucleo vigente e confermato; attribuzione di 2 dettagli imprecisa (v. sezione verifiche) |
| Firecrawl branding format v2 | CONFIRMED |

### Azioni raccomandate in ordine di leva

1. **Sticky CTA mobile** — il pattern con la base di evidenza più solida trovata (GoodUI #41,
   28 test), manca al renderer, è CSS `position:sticky` (compatibile col no-motion), e l'81-88%
   del traffico dei verticali target è mobile. Prima variante da costruire.
2. **Serializzare i 6 preset come file DTCG** + build CSS via Terrazzo: rende la libreria
   machine-readable e il preset "proponibile" da un agente come JSON validato (coerente con
   "l'AI non scrive codice"). Prerequisito della fabbrica.
3. **Pilota della fabbrica**: Dembrandt + designlang fianco a fianco su 3-4 riferimenti
   One Page Love → primo preset nuovo end-to-end col ciclo completo (estrazione → agente →
   render → gate → critico → audit). Misura: tempo totale e n. correzioni umane.
4. **Design-critic v1**: check deterministici + rubrica Claude calibrata su gold set
   (30-50 screenshot: siti reali + versioni degradate con defect injection, etichettate
   passa/boccia da Mattia; gate κ di Cohen prima di fidarsi).
5. **Metadati di libreria** (schema "agentic design system"): vettore personalità, settori,
   anti-pattern, vincoli di combinazione — da definire ORA, prima di popolare la libreria.
6. **Blueprint verticali**: ristorante e dentista come primi due, con sezioni-firma nuove
   (MenuList con campo allergeni, BookingCTA link-first, TeamCredentials) e vincoli normativi
   codificati in slots.json/promesse_vietate (sanità: gate dedicato).
7. **Font self-hosted**: Google Fonts va self-hostato per GDPR (la licenza lo permette) —
   azione immediata su presets.ts prima del deploy Fase C.

### Costi ricorrenti giustificati emersi

Land-book Pro ~$6/mese (libreria varianti) · GoodUI Solo ~$72 un mese una-tantum (estrazione
ranking pattern) · MYDESIGN.MD $9-19/mese (opzionale, scorciatoia bootstrap) · Argos $100/mese
(solo quando la review dei diff visivi diventa collo di bottiglia; si parte con Playwright
gratis). Tutto il resto della pipeline è open source o coperto dal piano Max (incluso Claude
Design, che condivide però la quota di Claude Code: usarlo solo in sessioni di fabbrica
pianificate).

---

# Dossier completo dei finding

## Prima ondata — i 6 filoni


### Filone: estrazione-token


#### Dembrandt: CLI open source URL→token, il candidato più pronto per la fabbrica

Dembrandt (npm `dembrandt`, GitHub ~2.1k stelle, 0 issue aperte) usa Playwright per renderizzare il sito live, legge computed styles e CSS variables dal DOM reale e distilla i pattern d'uso effettivi in design token con confidence score. Estrae: colori (incluse varianti dark mode), tipografia H1–H6, spacing, border radius, ombre, logo. Output: terminale, JSON, e formato W3C DTCG standard. Gestisce siti bot-protected (opzione Firefox) e SPA JS-heavy (`--slow`). L'autore stesso avverte che non sostituisce una brand guide curata: è materiale grezzo da raffinare — esattamente il ruolo che serve alla fabbrica (input per l'AI che propone il preset, non output finale).

**Rilevanza per la Site Factory:** Primo blocco della pipeline offline: `dembrandt <url-riferimento>` → token DTCG confidence-scored → un agente Claude li mappa sui token del preset (--brand-radius-*, --step-*, ombre, ecc.) → render su /anteprima/ → critico + audit umano. Un comando, zero API a pagamento, output già machine-readable.

**Fonti:** <https://dev.to/thevangelist/i-built-dembrandt-extract-any-websites-design-system-in-seconds-open-source-2n6d> · <https://github.com/dembrandt/dembrandt>

#### designlang: superset MIT con dark-mode pairing, auto-fix WCAG e output 'Claude Code skill'

designlang (MIT, `npx designlang <url>`, repo github.com/Manavarya09/design-extract) lancia Chromium headless e legge il DOM renderizzato con 9 estrattori: palette, tipografia, spacing, ombre, radii, componenti, regioni semantiche, contrasto, accessibilità. Peculiarità uniche dichiarate: cammina entrambi i temi (light/dark), li diffa ed emette token accoppiati; remediation WCAG con hue-shifting automatico per la AA; component clustering con variant detection; crawling autenticato; CI drift detection. Output in 11 formati: DTCG a 3 layer (primitive/semantic/composite), Tailwind, CSS vars, Figma Variables JSON, shadcn theme, e — notevole — AGENTS.md, .cursorrules e skill per Claude Code. Caveat: progetto giovane su vercel.app, da security-scannare prima dell'installazione (regola della vostra skills library).

**Rilevanza per la Site Factory:** Copre tre esigenze della Site Factory in un colpo: estrazione token dal riferimento, verifica contrasto AA (già un vostro guardrail) e output nel formato che i vostri agenti consumano (skill/markdown). Da provare fianco a fianco con Dembrandt sugli stessi 3-4 siti riferimento e tenere il migliore.

**Fonti:** <https://designlang.vercel.app/>

#### Project Wallace css-design-tokens: libreria componibile e mantenuta (v0.11.6, maggio 2026)

`@projectwallace/css-design-tokens` (EUPL-1.2) è una libreria JS pura: `css_to_tokens(css)` → token DTCG-compliant. Estrae 9 categorie: color (via ColorJS.io con alpha), font-size, font-family, line-height, gradient, box-shadow, radius, duration (in ms), easing (curve Bézier). Attivamente mantenuta (22 release, ultima 20/05/2026). Limite dichiarato: gradient e radius restano non mappati perché la spec DTCG è troppo limitata. È analisi statica del CSS: va accoppiata a un estrattore del CSS reale (il compagno extract-css-core dello stesso autore prende il CSS server+client rendered da un URL). Rispetto a Dembrandt/designlang non pondera per uso visivo effettivo: conta ciò che c'è nel CSS, non ciò che domina la pagina.

**Rilevanza per la Site Factory:** Alternativa a basso rischio (autore affermato, storia lunga) se preferite comporre la pipeline in casa dentro i vostri script Node esistenti (site-renderer/scripts/) invece di adottare una CLI monolitica. Duration+easing tokenizzati sono il match perfetto per i vostri --brand-dur-*/--brand-ease.

**Fonti:** <https://github.com/projectwallace/css-design-tokens>

#### Firecrawl 'branding format' v2: API commerciale che restituisce campi già semantici

Aggiungendo `branding` ai formats dello scrape, Firecrawl restituisce in una chiamata: colori già classificati semanticamente (primary, secondary, accent, background, textPrimary, textSecondary), typography (fontFamilies primary/heading/code, fontSizes h1/h2/body, fontWeights), spacing (baseUnit in px, borderRadius), asset (logo, favicon, og image), colorScheme light/dark e component styles quando disponibili. La v2 ha migliorato la logo detection (loghi in background-image, siti Wix/Framer). La doc avverte: non tutti i siti espongono branding completo, servono sempre fallback. Il valore differenziale vs i tool open source è la classificazione semantica: primary/accent arrivano già etichettati, mentre Dembrandt/Wallace restituiscono distribuzioni grezze da interpretare. Prezzo non indicato nelle pagine lette (piano free esistente).

**Rilevanza per la Site Factory:** Il campo `colors.primary/accent` mappa 1:1 sul blocco `brand` del vostro site.json e sull'input del palette-designer. Utile anche a runtime (cliente con sito esistente da rifare: estrazione brand automatica dal vecchio sito). Da testare sul piano free su siti PMI italiane prima di pagare.

**Fonti:** <https://www.firecrawl.dev/blog/branding-format-v2> · <https://docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook>

#### I VLM sono inaffidabili sui valori tipografici fini: ~30% di accuratezza sul riconoscimento font

Il Font Recognition Benchmark (arXiv 2503.23768, 15 typeface comuni, 13 modelli tra cui GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Flash) mostra che il miglior modello raggiunge solo ~30% di accuratezza nell'identificare font da immagini (Claude 3.5 Sonnet ~31%), che crolla a ~15% con interferenza testuale; CoT e few-shot aggiungono <4 punti. L'attention analysis mostra che i modelli non guardano i bordi dei glifi. Errori tipici: confidently wrong e bias sul contenuto testuale. Benchmark pratici confermano: i VLM sono passabili sui colori dominanti ma pessimi su font, weight, size e kerning. Nota: modelli testati fino a inizio 2025 — le generazioni 2026 potrebbero essere migliori, ma il limite architetturale (scarsa sensibilità ai dettagli locali) resta documentato.

**Rilevanza per la Site Factory:** Verdetto netto per la fabbrica: NON usare screenshot→VLM per estrarre valori di token (font, size, radius, hex esatti) — lì serve il CSS computato. Il VLM va usato dove è forte: giudizio d'insieme, mood, gerarchia, coerenza — cioè il vostro critico visivo, non l'estrattore.

**Fonti:** <https://arxiv.org/html/2503.23768v3>

#### Design2Code: i VLM migliorano su screenshot→code ma restano deficit su layout fine e colori; le sue metriche sono riusabili

Il benchmark Design2Code (484 webpage reali + subset HARD) misura la fedeltà screenshot→implementazione con metriche componibili: CLIP score tra rendering, Block-Match (recall/precision dei blocchi di testo pesati per area), e LLEM = media di existence/text/position/color dei blocchi, più SSIM/TreeBLEU. I risultati 2024-25 (GPT-4o CLIP 89, LLEM 83.7%) e gli snapshot 2026 (leader ~94.8%) mostrano progresso rapido, ma la ricerca segnala 'deficit persistenti su layout fine-grained, colori e allucinazione di strutture annidate non banali'. Per la Site Factory il punto non è generare codice (vietato dall'architettura) ma che esiste una batteria di metriche mature e citabili per quantificare 'quanto il render assomiglia al riferimento'.

**Rilevanza per la Site Factory:** Le metriche LLEM/CLIP/Block-Match sono il fondamento per la domanda 5: dopo aver applicato un preset estratto al sample /anteprima/, si può misurare la distanza dal riferimento (posizione/colore/esistenza dei blocchi) invece di affidarsi solo al giudizio soggettivo del critico AI. Conferma anche che l'architettura 'AI riempie token, non scrive markup' evita proprio i failure mode documentati.

**Fonti:** <https://www.emergentmind.com/topics/design2code-benchmark>

#### Il pattern vincente è ibrido: 'evidence capture' dal DOM + agenti che redigono la spec validando ogni claim

MYDESIGN.MD — prodotto commerciale che fa esattamente 'URL → DESIGN.md' — documenta l'architettura di riferimento: (1) evidence capture: crawl del sito live raccogliendo screenshot, computed styles, CSS e DOM prima di qualsiasi analisi; (2) validation-first generation: agenti specialisti per dominio (brand, colore, tipografia, layout, motion) redigono la spec e ogni claim viene verificato contro l'evidenza catturata — le assunzioni senza fonte vengono escluse; (3) output multi-formato (DESIGN.md, token JSON, CSS vars, Tailwind, audit report, 'agent skill'). È la stessa filosofia del vostro context-enricher ('ciò che non ha fonte non esiste') applicata al design. Pro CSS computato: valori esatti, niente allucinazioni. Pro visivo/VLM: coglie gerarchia, mood, cosa domina davvero la pagina. L'ibrido usa il primo per i numeri e il secondo per la semantica.

**Rilevanza per la Site Factory:** Blueprint architetturale diretto per la fabbrica di preset: estrattore deterministico (Dembrandt/Wallace) produce l'evidenza; un agente Claude con skill 'preset-designer' la trasforma in blocco token del vostro sistema motivando ogni scelta con riferimento all'evidenza; il critico visivo giudica il render. Zero valori inventati, tracciabilità totale — coerente con le vostre regole di ingaggio.

**Fonti:** <https://www.mydesignmd.com/>

#### MYDESIGN.MD come benchmark di mercato: il concetto è validato commercialmente ($9-19/mese)

MYDESIGN.MD vende esattamente il servizio che la fabbrica vuole costruirsi in casa: da un URL genera 8 artifact (DESIGN.md machine-readable, token JSON, CSS variables, config Tailwind, audit report, e un formato 'agent skill' pensato per Claude Code/Cursor/Copilot). Target dichiarato: team che buildano con coding agent e vogliono che l'AI segua le vere brand guideline invece di produrre interfacce generiche. Pricing: 1 estrazione free, $9/mese per ~10 estrazioni, $19/mese per ~33, top-up da $5 senza scadenza. Esiste anche un equivalente open source non approfondito (web-to-design-md su GitHub) che produce DESIGN.md 'Stitch-style' via browser eval.

**Rilevanza per la Site Factory:** Due usi: (a) validazione: il mercato conferma che 'riferimento → spec design per agenti' è un flusso che funziona; (b) scorciatoia: a $9/mese si può usare per popolare rapidamente una rosa di candidati-preset da riferimenti di qualità, prima di decidere se internalizzare con i tool open source. Il loro formato output (DESIGN.md + skill) è già il vostro formato.

**Fonti:** <https://www.mydesignmd.com/>

#### html.to.design: utile solo se il flusso passa da Figma; 12 import gratis/mese

html.to.design (‹div›RIOTS) converte qualsiasi sito in design Figma completamente editabile via plugin + estensione Chrome: crea automaticamente text style e color style come stili locali Figma, genera componenti con varianti hover, importa a viewport desktop/tablet/mobile. Pricing: 12 import/mese gratis; piano PRO con import illimitati (fair use 1.000/mese). Non produce però un file di token consumabile da una pipeline headless: l'output vive dentro Figma. Per la Site Factory — che non ha Figma nel flusso e il cui contratto è un blocco di CSS token — introdurrebbe un passaggio manuale intermedio senza beneficio, a meno che non vogliate una fase di curatela visiva umana in Figma prima di tokenizzare.

**Rilevanza per la Site Factory:** Da scartare per la pipeline automatica; da tenere in tasca come strumento di studio manuale quando l'umano audita un riferimento e vuole smontarlo pezzo per pezzo prima di approvare un nuovo preset.

**Fonti:** <https://html.to.design/home/> · <https://html.to.design/docs/pro-plan/>

#### Candidati da scartare o ridimensionare: Superposition (stantio), Visual Copilot (direzione opposta)

Superposition (app desktop free, mac/win/linux) estrae token da un sito ed esporta CSS/SCSS/JS/Figma, ma il sito promette ancora export verso Adobe XD 'in arrivo' — prodotto che Adobe ha dismesso da anni: forte segnale di abbandono, nessuna versione/data recente visibile. Sconsigliato basarci la fabbrica. Builder.io Visual Copilot è vivo e maturo (CLI 2026, integrazione design token) ma lavora nella direzione opposta al vostro bisogno: parte da file Figma e genera codice rispettando token GIÀ definiti; non estrae token da siti di riferimento. CSS Stats resta un analizzatore/report di CSS pubblici (frequenze di colori, font-size, spacing), utile come sguardo rapido ma senza output token strutturato paragonabile a Wallace/Dembrandt.

**Rilevanza per la Site Factory:** Evita di investire tempo su candidati della lista iniziale che non reggono: la shortlist operativa per la fabbrica si riduce a Dembrandt / designlang / Project Wallace (open source) + Firecrawl branding (API) + MYDESIGN.MD (SaaS).

**Fonti:** <https://superposition.design/> · <https://www.builder.io/blog/visual-copilot-2> · <https://www.projectwallace.com/>

#### Come valutare la fedeltà dell'estrazione: round-trip render + metriche visive + critico addestrato (UIClip)

Tre livelli emersi dalla ricerca. (1) Deterministico: confrontare le distribuzioni token estratte con il CSS reale (i tool computed-style sono per costruzione fedeli ai valori; il rischio è la selezione, non l'invenzione — mitigato dai confidence score di Dembrandt). (2) Round-trip visivo: applicare il preset estratto a un sample, renderizzare e misurare la distanza dal riferimento con le metriche Design2Code (CLIP similarity tollerante alle differenze minori, Block-Match, LLEM su esistenza/testo/posizione/colore) — nota: col vostro copy diverso dal riferimento, contano le metriche di stile/struttura, non il pixel-diff. (3) Giudizio appreso: UIClip (UIST 2024, CMU/Apple) è un modello addestrato su 2.3M di UI che assegna uno score di qualità del design a uno screenshot e genera suggerimenti; nel confronto con 12 designer umani ha ottenuto il massimo accordo coi ranking ground-truth.

**Rilevanza per la Site Factory:** Struttura il gate della fabbrica in 3 stadi: validazione token (deterministica, come i vostri gate di contrasto), metrica di somiglianza col riferimento (CLIP/Block-Match su render), e score qualità assoluto (UIClip o critico VLM con rubrica) prima dell'audit umano — replica per il design il loop genera→critica→correggi che già usate per copy e immagini.

**Fonti:** <https://www.emergentmind.com/topics/design2code-benchmark> · <https://arxiv.org/abs/2404.12500>

**Nozioni segnalate per approfondimento da questo filone:**
- Prova comparativa pratica Dembrandt vs designlang vs Wallace sugli stessi 4-5 siti riferimento (inclusi siti italiani PMI) — Le capacità dichiarate vanno verificate empiricamente: qualità dei confidence score, gestione di siti Wix/WordPress tipici dei riferimenti italiani, e pulizia dell'output DTCG determineranno quale adottare. designlang inoltre è un repo giovane da security-scannare secondo la vostra policy skills-library.
- UIClip: disponibilità di pesi/modello, costi di inferenza locale e applicabilità a screenshot di siti desktop full-page — Se il modello è scaricabile e gira in locale, sarebbe un critico visivo deterministico e gratuito da affiancare al critico VLM; ma è addestrato prevalentemente su UI mobile e va verificato su landing page desktop.
- Tokens Studio nel 2026: ruolo reale (gestione/trasformazione token DTCG→CSS via Style Dictionary) e se ha acquisito capacità di estrazione — Era nella lista dei candidati ma non è stato verificato in questa ricerca; storicamente è un gestore di token, non un estrattore — se resta tale, il suo posto sarebbe a valle (versionare la libreria di preset), non a monte.
- Filone 'visual self-correction' 2025-26 (UI2Code^N, WebVIA, Widget2Code, FronTalk): loop render→confronta→correggi guidati dalla visione — Questi lavori formalizzano il loop iterativo che la fabbrica vuole (genera preset → renderizza → il modello guarda e corregge); capire i loro protocolli di feedback visivo può migliorare il prompt del critico e il numero ottimale di round.
- Pricing e limiti reali di Firecrawl branding format su un campione di siti (crediti consumati, campi mancanti, qualità su siti edilizia italiani) — Le pagine lette non riportano i prezzi correnti né tassi di completezza dei campi; prima di metterlo in pipeline serve un test sul piano free e il costo per estrazione.
- web-to-design-md (GitHub Paidax01) e l'estensione Chrome 'Design Token Extractor' come alternative open source non approfondite — Entrambi promettono estrazione DOM→spec (il primo genera proprio un DESIGN.md); se maturi, coprirebbero gratis il ruolo di MYDESIGN.MD dentro la fabbrica offline.

### Filone: builder-concorrenti


#### Relume: libreria umana + AI compositore — il gemello del modello Site Factory

Relume è l'unico player che fa esattamente 'libreria vincolata + AI compone': 1.000+ componenti disegnati da umani (Figma, Webflow Client-First, React Tailwind+shadcn), l'AI genera solo sitemap → wireframe riempiendo gli slot con componenti reali e copy contestuale. La separazione è netta: wireframe UNSTYLED prima, poi uno Style Guide Builder applica il sistema visivo (palette con shades automatiche per accessibilità, tipografia, componenti UI) in modo consistente su tutte le pagine. Prezzi 2025-26: Starter $32/mese annuale, Pro $40; free tier limitato (30 componenti, 1 progetto). Non fa hosting: esporta a Figma/Webflow/React. Il flusso completo Prompt→Sitemap→Wireframe→Style Guide è lo stesso pattern del vostro blueprint→slot→preset.

**Rilevanza per la Site Factory:** Validazione diretta dell'architettura Site Factory. Da rubare: la separazione struttura/stile come due fasi distinte della pipeline (l'AI sceglie layout su wireframe 'neutro', il preset arriva dopo) e le shades automatiche per accessibilità nella palette (già parzialmente presente con --accent-strong).

**Fonti:** <https://www.relume.io/> · <https://uxpilot.ai/blogs/relume-ai> · <https://durable.com/ai-tools/relume-review>

#### Relume Wireframing 2.0: la varietà si è sbloccata con metadati per-componente e selezione 'placement-aware'

Il salto di qualità di Relume (settembre 2025) è la lezione più actionable trovata. Prima l'AI attingeva solo a ~25% della libreria; ora ~70% → 'more variety and creative layouts'. Tre meccanismi: (1) selezione di STILE in base al settore descritto ('off-grid/overlapping per agenzie; card layout per SaaS'); (2) selezione del componente in base al CONTEGGIO dei contenuti (brief con 2 piani pricing → layout a 2 colonne, non il generico a 3); (3) scelta 'with placement in mind': il selettore ragiona sull'intera pagina per migliorare ritmo e alternanza, riducendo 'repetitive beats'. In parallelo Copywriting 1.5 è passato a Claude che considera la pagina intera invece di sezioni isolate.

**Rilevanza per la Site Factory:** È la ricetta per le vostre 'grammatiche di pagina': taggare ogni variante di sezione con metadati (registro estetico, densità contenuti, ruolo nel ritmo scuro/chiaro) e far scegliere all'AI a livello di pagina intera, non slot per slot. Anche la mossa 'sblocca più libreria' dice che la varietà viene dal far VEDERE all'AI più varianti curate, non dal generare.

**Fonti:** <https://www.relume.io/whats-new/september-2025-release>

#### La critica a Relume: senza uno strato di stile forte, i siti 'sanno di Relume'

Le recensioni indipendenti convergono su un punto: se non si investe tempo a personalizzare la UI, i progetti Relume si riconoscono tra loro ('components may look similar without significant customization'); l'abuso della libreria rende i siti 'troppo familiari'. Utenti su Product Hunt segnalano inoltre che ~1/3 dei componenti aveva problemi e chiedono a Relume di rifinire i componenti esistenti invece di aggiungerne di nuovi con layout appena diversi. Un utente teme la 'commoditization of web design'. Nota: la recensione di Durable è di un concorrente, ma coincide con il sentiment Reddit/PH raccolto altrove.

**Rilevanza per la Site Factory:** Due 'da evitare': (1) crescere la libreria in larghezza (varianti quasi uguali) invece che in profondità (componenti auditati e rifiniti) — meglio poche varianti eccellenti per sezione; (2) affidare la differenziazione alla sola struttura: la firma percepita viene dallo strato estetico (i vostri preset), quindi è lì che servono i nuovi investimenti di varietà.

**Fonti:** <https://durable.com/ai-tools/relume-review> · <https://uxpilot.ai/blogs/relume-ai>

#### Squarespace Blueprint: combinatoria CURATA su assi ortogonali, non generazione

Blueprint (premiato tra le TIME Best Inventions 2025; oltre metà dei nuovi clienti parte da lì) non genera design: fa scegliere l'utente lungo assi curati da designer umani — personalità di brand (professional→quirky), sezioni homepage una per una, palette a 4 colori raggruppate per personalità, font pairing curati — con preview live. Il claim è 'miliardi di combinazioni possibili' partendo da pochi assi ortogonali. Copy e immagini AI sono 'personally curated by our design team'. Trade-off documentato: 'ogni combinazione deve funzionare' → i design audaci dei template classici Squarespace non si traducono in Blueprint, che 'prioritizza la funzione sulla forma' e risulta più generico.

**Rilevanza per la Site Factory:** Da rubare: la varietà esplode moltiplicando assi ortogonali curati (blueprint × preset × palette × font pairing × varianti sezione) — con 6 preset e poche varianti per 12 sezioni siete già a migliaia di combinazioni percepibili. Da evitare: il vincolo 'qualsiasi combinazione è valida' appiattisce verso il sicuro; meglio whitelist di combinazioni auditate dalla fabbrica offline (che è esattamente il vostro piano).

**Fonti:** <https://www.squarespace.com/blog/starting-a-website-with-squarespace-blueprint> · <https://www.feisworld.com/blog/squarespace-blueprint-ai-builder-review>

#### v0/Lovable/Bolt: la generazione libera di codice produce la 'Sea of Sameness' shadcn

I prompt-to-app builder generano codice libero ma convergono tutti sull'estetica shadcn+Tailwind 'purple' del training data: 'ottimizzano per working first, e working assomiglia al training data'. Anna Arteeva (Design Systems Collective) verifica che sono 'deeply optimised' per shadcn+Tailwind: con un design system custom (o anche MUI) l'AI perde l''intuizione' e serve guida esplicita crescente; le integrazioni di import design (Builder.io+Lovable, Anima+Bolt) funzionano SOLO alla build iniziale, dopo si torna a screenshot. La sua tesi 'basta promptare meglio' è la via debole: richiede sforzo per-progetto e non scala.

**Rilevanza per la Site Factory:** Conferma il principio non negoziabile della Site Factory (l'AI non scrive codice). Da evitare assolutamente: delegare la varietà al prompt per-cliente a runtime. Da rubare in negativo: la varietà va PRE-COTTA in artefatti curati (preset, varianti), perché il modello a runtime regredirà sempre verso la media del training.

**Fonti:** <https://annaarteeva.medium.com/the-era-of-ai-prototyping-comparison-of-lovable-bolt-replit-v0-96c6c200978d> · <https://axe-web.com/insights/ai-website-design-sameness/>

#### Webflow AI: genera solo dentro Flowkit, un framework CSS tokenizzato — ma resta 'similar'

Il site builder AI di Webflow (lanciato feb 2025, 60k+ siti pubblicati a metà 2025) costruisce ogni sito su Flowkit, framework CSS modulare proprietario: sistema strutturato di utilities, componenti e variabili riusabili, così l'output è 'customizable, consistent, scalable' e ri-editabile nel Designer. L'AI suggerisce strutture di layout in base al goal dichiarato (eCommerce, SaaS). Il teardown indipendente però nota: l'output 'is not client-ready' (copy da riscrivere, brand da applicare, breakpoint da verificare) e 'AI follows patterns, which can make designs look similar' — risolve il blank-page problem, non consegna il sito.

**Rilevanza per la Site Factory:** Anche il player più design-centrico vincola l'AI a un design system a token: ulteriore validazione dei vostri preset. Ma il monito è che token+AI da soli non bastano per la firma visiva: Webflow con Flowkit produce comunque 'similar'. La differenza la fa la curatela umana a valle — il vostro checkpoint umano in fabbrica offline è il vantaggio competitivo, non un collo di bottiglia.

**Fonti:** <https://www.thecssagency.com/blog/webflow-ai-site-builder>

#### Framer: AI separate per struttura (Wireframer) e componenti (Workshop) che EREDITANO i token di progetto

Framer ha due AI distinte: Wireframer genera bozze multi-pagina responsive con copy reale; Workshop (161k utenti, su Claude 4.5 da set. 2025) genera componenti interattivi che ereditano automaticamente font e colori del progetto ed espongono property controls — restano componenti runtime nativi, mai codice esportabile. C'è anche un AI agent che audita il sito: contrasto, typo, alt text mancanti, gap SEO e 'inconsistent styles'. Lato utenti: output 'native-feeling' apprezzato, ma inconsistenza regolare su richieste complesse ('regularly enough to become unreliable') e Trustpilot 1.7 per billing a sorpresa. Prezzi: Basic ~$10, Pro ~$30/mese.

**Rilevanza per la Site Factory:** Due meccanismi da rubare: (1) l'ereditarietà forzata dei token — qualsiasi nuova variante di sezione proposta dall'AI in fabbrica deve poter usare SOLO classi semantiche/token esistenti (verificabile con un lint deterministico, tipo il vostro guard su registry.ts); (2) l'audit agent su contrasto/consistenza stili come gate automatico del critico visivo, accanto alla rubrica a 24 punti.

**Fonti:** <https://superdesign.dev/blog/framer-ai-review>

#### Tassonomia dei marker di AI-slop: una blacklist pronta per il critico visivo

La guida 925studios (lug. 2026) elenca marker riconoscibili: Inter di default, gradiente purple→blue su hero/bottoni, card con radius 16px uniforme, hero sovradimensionato con headline vaga, gerarchia visiva piatta, spacing identico ovunque, stock photo 'diverse group at laptop', illustrazioni AI 'plastiche', copy con superlativi generici e hedging ('may help you'), motion fade-in generico. Causa nominata: 'distributional convergence' — l'AI predice il pattern più probabile del training. Fix proposti: font di carattere (es. Bricolage Grotesque), colori semantici via custom properties, foto reali, voce del founder, design system che sovrascrive i default in modo sistematico.

**Rilevanza per la Site Factory:** Materiale diretto per arricchire la rubrica anti-slop a 24 punti e i critici copy/immagini: trasformare i marker in check espliciti (mai Inter-only, mai gradienti viola-blu, radius/spacing variati per preset, headline con claim tracciabile). Nota: la Site Factory già evita quasi tutti questi marker by design — la lista serve come regression test per i NUOVI preset proposti dalla fabbrica.

**Fonti:** <https://www.925studios.co/blog/ai-slop-web-design-guide>

#### Quando la sameness costa: il sito vetrina di una PMI è sempre 'core brand experience'

AXE-WEB distingue: contesti low-stakes (landing di campagna, waitlist) tollerano il generico in cambio di velocità; le core brand experience (homepage, pagine prodotto/about) no — il déjà-vu di layout segnala 'Low Effort' e rompe il framework Know-Like-Trust, generando dubbio nei prospect. Ricetta proposta: AI con brand guidelines arriva a ~70% di brand alignment; per il 100% serve 'AI per la struttura/wireframe, umano per l'applicazione del brand'. Sconsiglia i 'prompt loop': ore a raffinare prompt invece di accettare i limiti dello strumento.

**Rilevanza per la Site Factory:** Per una PMI locale il sito single-page È l'intera brand experience: giustifica economicamente la fabbrica offline con audit umano (il 30% mancante si paga una volta per preset/variante, non per cliente). Da evitare: iterazioni prompt per-cliente a runtime per 'differenziare' — costo alto, ritorno basso; a runtime solo adattamenti parametrici (palette, foto, copy), come già deciso.

**Fonti:** <https://axe-web.com/insights/ai-website-design-sameness/>

#### Fascia bassa (Durable, 10Web, Hostinger, Dorik, B12): settore→template fisso + riempimento AI = percepito subito

I builder low-cost mappano il settore dichiarato su template/strutture predefinite e riempiono con testo AI. 10Web (WordPress+Elementor, $10-23/mese): 'placeholder content che cattura concetti generici, raramente usabile senza editing sostanziale', layout 'funzionali ma spesso generici'. Durable: velocissimo ma 'lacks fine-tuning'. Hostinger: vincolato a grid, AI inferiore a Wix/Squarespace nei test. Dorik (~$15-39/mese): ~85 template industry-specific, copy GPT-4. Wix AI: conversazionale ma 'generic results' e modifiche difficili senza ricominciare. Il pattern comune: la personalizzazione è solo lessicale (nome, testi), la struttura e l'estetica restano visibilmente da template.

**Rilevanza per la Site Factory:** Da rubare solo l'idea grezza: la mappatura settore→struttura di pagina (le vostre 'grammatiche per-settore') è il meccanismo giusto, ma va fatta a livello di sequenza di sezioni e registro visivo, non di template monolitico. Da evitare: far percepire il template — se cambiando cliente cambia solo il testo, il cliente edile che guarda il sito del concorrente vi smaschera. Le varianti di sezione servono esattamente a rompere questa firma.

**Fonti:** <https://durable.com/ai-tools/10web>

#### Rappresentazione intermedia dichiarativa e component mapping: il pattern TeleportHQ/Builder.io

TeleportHQ basa tutto su UIDL (User Interface Definition Language, open source): una rappresentazione dichiarativa dell'interfaccia da cui si generano target diversi (HTML, React, Vue, Angular), con design token globali (palette, scala tipografica, spacing) che si propagano ai componenti; cambiare i token ridisegna il sito. Builder.io punta sul 'component mapping': il design importato viene mappato sui componenti REALI del team invece di generare markup nuovo — la feature considerata quella che 'da sola giustifica il costo' enterprise. (Copertura da search + sito TeleportHQ; non ho trovato teardown indipendenti approfonditi su Fusion.)

**Rilevanza per la Site Factory:** Il vostro site.json è di fatto un UIDL specializzato: il pattern è validato dall'industria. Il component mapping di Builder.io è concettualmente identico al vostro registry.ts (type→componente curato). Possibile estensione da rubare: come TeleportHQ, trattare i preset come 'temi' interamente sostituibili a parità di UIDL — che è esattamente ciò che /anteprima/{preset}/ dimostra. Nessun cambio architetturale necessario.

**Fonti:** <https://teleporthq.io/> · <https://annaarteeva.medium.com/the-era-of-ai-prototyping-comparison-of-lovable-bolt-replit-v0-96c6c200978d>

#### Sintesi 'da rubare / da evitare' per la fabbrica di varietà

DA RUBARE: (1) metadati per-variante (registro estetico, densità contenuti, ruolo nel ritmo) + selettore AI che ragiona sull'intera pagina (Relume 2.0); (2) assi ortogonali curati con scelte raggruppate per personalità di brand (Squarespace); (3) ereditarietà forzata dei token per ogni nuova variante + audit automatico contrasto/consistenza (Framer); (4) settore→grammatica di sequenza sezioni (B12/Dorik, ma a livello strutturale); (5) blacklist marker slop nel critico visivo (925studios). DA EVITARE: (a) varietà via generazione libera o prompt-loop a runtime (v0/Lovable — regressione alla media); (b) vincolo 'ogni combinazione valida' (Squarespace — appiattisce); (c) libreria che cresce in larghezza con varianti quasi-uguali non rifinite (Relume PH); (d) personalizzazione solo lessicale su struttura fissa (fascia bassa); (e) rigenerazione monolitica non ri-editabile (Wix).

**Rilevanza per la Site Factory:** È il deliverable richiesto in forma compatta: la strategia ibrida già decisa (fabbrica offline + audit umano + adattamenti limitati a runtime) risulta allineata con ciò che funziona nei leader (Relume, Squarespace, Framer) ed evita gli errori documentati dei prompt-to-code e della fascia bassa.

**Fonti:** <https://www.relume.io/whats-new/september-2025-release> · <https://www.squarespace.com/blog/starting-a-website-with-squarespace-blueprint> · <https://superdesign.dev/blog/framer-ai-review> · <https://www.925studios.co/blog/ai-slop-web-design-guide> · <https://axe-web.com/insights/ai-website-design-sameness/>

**Nozioni segnalate per approfondimento da questo filone:**
- Relume Style Guide Builder: come genera i 'design concepts' e come applica un sistema visivo a wireframe unstyled (assi, vincoli, output) — È il pezzo di Relume più vicino alla vostra 'fabbrica di preset': capire i suoi assi (colore/tipografia/componenti) e i suoi limiti aiuterebbe a progettare il formato dei nuovi preset e il flusso proposta→render→critica.
- Come Squarespace cura le associazioni personalità-di-brand → palette/font pairing (e dataset pubblici di font pairing di qualità) — Le 'personalità' (Professional/Bold/Playful/Sophisticated) sono un layer di indicizzazione dei preset che manca alla Site Factory: permetterebbe al palette-designer di scegliere il preset per registro emotivo del settore, non solo per estetica.
- Framer AI site-audit agent: quali check fa esattamente (contrasto, stili inconsistenti) e se esistono equivalenti open-source da integrare come gate deterministico — Un audit automatico pre-critico-AI (contrasto, consistenza token, overflow) ridurrebbe i round del critico visivo nella fabbrica offline; vale una ricerca su tool esistenti (axe-core, lighthouse, linter CSS custom).
- Metodologia Client-First di Finsweet come convenzione di naming/organizzazione per librerie di componenti scalabili — È lo standard che rende la libreria Relume mantenibile su 1.000+ componenti: utile prima di far crescere la libreria di sezioni/varianti oltre i 15+8 tipi attuali.
- Tecniche per forzare diversità nella generazione AI ('distributional convergence': seed di riferimento, exemplar conditioning, sampling) — La fabbrica offline parte da 'riferimenti di qualità': la letteratura su come condizionare un modello con esemplari per uscire dalla media del training direbbe come strutturare i prompt del proponi-preset.
- Base44 (citato come terzo player della 'Sea of Sameness' accanto a Lovable e v0) — Player emergente 2025-26 non coperto dalla ricerca: verificare se ha meccanismi di varietà nuovi o è l'ennesimo prompt-to-code shadcn.

### Filone: critico-visivo


#### UIClip (UIST'24): un modello piccolo e specializzato batte i grandi VLM nello scoring di qualità UI

UIClip (CMU/Apple) è un CLIP fine-tuned che da uno screenshot + descrizione assegna un punteggio numerico di qualità del design e genera suggerimenti. Addestrato con una tecnica chiave: generazione sintetica di ~2,3M coppie 'UI buona vs degradata' introducendo DIFETTI DELIBERATI di stile e layout in UI esistenti, più 1,2K rating di designer professionisti. Nel confronto con i ranking di 12 designer umani ottiene l'agreement più alto, superando VLM molto più grandi su tre task (qualità, suggerimenti, rilevanza). Applicazioni dimostrate: code-gen quality-aware, design tips, retrieval di esempi per qualità.

**Rilevanza per la Site Factory:** Due usi per la Site Factory: (1) la tecnica del 'defect injection' è replicabile per costruire gratis il gold set del critico — degradare i golden example dei preset lungo assi noti (spacing, contrasto, gerarchia, palette) e verificare che il critico bocci la versione degradata; (2) un eventuale scorer locale economico come pre-filtro prima del giudizio Claude.

**Fonti:** <https://arxiv.org/abs/2404.12500>

#### UICrit: numeri duri sui limiti dei LLM come critici UI (e come mitigarli)

Dataset di 3.059 critiche di 7 designer esperti su 983 UI mobile. Risultati chiave: zero-shot, solo il 13,1% dei commenti di Gemini è risultato valido (qualità media 0,24); localizzazione quasi nulla (IoU 0,004 senza aiuti, 0,186 con overlay di coordinate sullo screenshot, 0,222 con patch-grid); con few-shot + visual prompting il guadagno è +55%, ma la qualità resta 0,48 vs 0,75 degli umani. Failure mode espliciti: scarsa localizzazione degli oggetti, scarsa conoscenza delle convenzioni di design, incapacità di prioritizzare quando le linee guida confliggono, hallucination di difetti. Nota importante: l'inter-rater umano è solo Fleiss κ 0,29–0,31 — il giudizio di design è intrinsecamente soggettivo anche tra esperti.

**Rilevanza per la Site Factory:** Il design-critic deve avere: few-shot calibrati nella skill, richiesta di riferirsi a sezioni/slot con NOME (mai coordinate pixel), e aspettative realistiche — il gold set va etichettato con più voti perché nemmeno gli umani concordano.

**Fonti:** <https://arxiv.org/abs/2407.08850> · <https://arxiv.org/html/2407.08850v2>

#### AesEval-Bench (2026): i VLM restano sotto il bar sull'estetica grafica; bias documentati

Paper 2026 che costruisce un benchmark su 4 dimensioni (tipografia, layout, colore, grafica) e 12 indicatori (es. gerarchia e leggibilità sotto tipografia), con 3 task quantificabili: giudizio estetico, selezione della regione, localizzazione precisa. Valuta sistematicamente VLM proprietari, open-source e reasoning-augmented: 'clear performance gaps' rispetto alle esigenze sfumate della valutazione estetica. Dai risultati riportati: position/order bias persistente (~5% anche con istruzioni esplicite), nessun VLM robusto alla simmetria dei confronti (max ~95%), uso incoerente della scala di punteggio tra modelli. Critica ai protocolli esistenti: lo scoring secco non dice DOVE sta il difetto; le critiche descrittive sono difficili da quantificare. Propongono dataset di training con labeling VLM guidato da umani e reasoning ancorato agli indicatori.

**Rilevanza per la Site Factory:** Conferma la struttura giusta per la nostra rubrica: punteggi ancorati per-indicatore (non un voto 1-10 globale), verdetto che nomina la sezione colpita, confronti pairwise in doppio ordine.

**Fonti:** <https://arxiv.org/abs/2603.01083>

#### Anthropic: l'evaluator è un agente separato che naviga la pagina VIVA con Playwright e soglie hard

Nel post di engineering sull'harness per app development, Anthropic descrive l'evaluator: agente Claude separato dal generatore, dotato di Playwright MCP, che 'naviga la pagina da solo, screenshotta e studia l'implementazione prima di produrre il giudizio' (non score su screenshot statici). Quattro criteri con soglia hard ciascuno — Product depth, Functionality, Visual design, Code quality — fallirne UNO = rigetto con feedback dettagliato. Insight centrale: 'rendere skeptical un evaluator standalone è molto più trattabile che rendere un generatore critico verso il proprio lavoro'. Failure mode osservato: l'evaluator 'identifica problemi legittimi e poi si convince che non sono gravi' — risolto con cicli di tuning del prompt esaminando i log dove il giudizio divergeva dallo standard voluto. 'Sprint contracts' negoziati prima dell'implementazione ancorano i criteri.

**Rilevanza per la Site Factory:** È il template diretto per il nostro design-critic: agente separato, browser vivo sulla preview della build, soglie bloccanti per criterio, e un budget esplicito di tuning-osservando-i-log come già fatto per copy-critic.

**Fonti:** <https://www.anthropic.com/engineering/harness-design-long-running-apps>

#### Evidenza che il wording di criteri e prompt plasma l'estetica (rubrica a 5 criteri + negative prompting)

Justin Wetch (migliorando la skill frontend-design di Anthropic) ha costruito un eval: 50 prompt, screenshot full-page via Puppeteer, confronto CIECO pairwise giudicato da Opus su 5 criteri — Prompt Adherence, Aesthetic Fit, Visual Polish & Coherence, UX & Usability, Creative Distinction. La skill riscritta (istruzioni imperative, divieti accompagnati da alternative positive, vocabolario concreto al posto di aggettivi vaghi) vince il 75% dei confronti decisivi (21/28, p=0,0063); i modelli piccoli beneficiano di più. Il cookbook Anthropic conferma il meccanismo: il negative prompting esplicito (vietare Inter/Roboto/Arial, gradienti viola su bianco) + vocabolario concreto (font specifici per contesto, pesi estremi 100/900, salti di scala 3x) sposta misurabilmente l'output; pesare di più design/originality spinge il modello a rischio estetico maggiore.

**Rilevanza per la Site Factory:** Per la fabbrica offline: 'Creative Distinction' pesata alta nel critico è la leva per ottenere VARIETÀ senza perdere qualità; i criteri vanno scritti con divieti espliciti + alternative concrete, come già fa la rubrica anti-slop a 24 punti.

**Fonti:** <https://www.justinwetch.com/blog/improvingclaudefrontend> · <https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics>

#### Il loop genera→critica VLM→correggi paga: +17,8% in 3 cicli, poi rendimenti decrescenti

Paper 2026 su refinement iterativo vision-guided per frontend code generation: un VLM fa da critico visivo strutturato su pagine renderizzate e guida la revisione del codice. Su richieste reali da WebDev Arena: fino a +17,8% di qualità in 3 cicli di refinement rispetto alla singola inferenza. Tentativo di internalizzare il critico via fine-tuning LoRA del generatore: recupera solo il 25% dei guadagni del critico-in-the-loop — cioè il critico esterno resta necessario, non si può 'assorbire' nel generatore. Conclusione degli autori: la critica VLM automatica del frontend produce soluzioni significativamente migliori della singola passata.

**Rilevanza per la Site Factory:** Valida quantitativamente sia il pattern già adottato per copy e immagini (max 3 round è coerente coi rendimenti misurati) sia la scelta di tenere il critico separato dal designer invece di 'insegnare' tutto al generatore.

**Fonti:** <https://arxiv.org/abs/2604.05839>

#### Judge panel: la letteratura 2026 ridimensiona i panel — meglio UN giudice ben calibrato + segnali davvero indipendenti

PoLL (2024) sosteneva che un panel di modelli piccoli di famiglie diverse batte il singolo giudice grande, con meno intra-model bias e costo 7x inferiore. Ma il paper 2026 'Nine Judges, Two Effective Votes' lo smonta: 9 modelli frontier di 7 famiglie sbagliano SUGLI STESSI item (errori correlati, ~75% dell'indipendenza nominale persa); 9 giudici valgono ~2 voti indipendenti effettivi; il miglior giudice singolo eguaglia o batte il panel in tutte le condizioni; l'aggregazione sofisticata recupera al massimo l'11% del gap. Raccomandazione: la diversità di famiglia di modello NON dà indipendenza — servono approcci di valutazione genuinamente diversi.

**Rilevanza per la Site Factory:** Il vincolo 'solo Claude via Max' non è una perdita: un panel multi-vendor non avrebbe aggiunto molto. L'indipendenza vera si ottiene affiancando al giudice Claude segnali di natura diversa: check deterministici (codice) e voto umano pairwise — non altri LLM.

**Fonti:** <https://arxiv.org/abs/2404.18796> · <https://arxiv.org/abs/2605.29800>

#### Il gold standard industriale per l'estetica web è il voto umano pairwise (UI-Bench, Design Arena)

UI-Bench (2025): primo benchmark di 'visual excellence' per tool text-to-app — 10 tool, 300 siti da 30 prompt, oltre 4.000 giudizi esperti in confronti pairwise, aggregati con un modello derivato da TrueSkill che produce intervalli di confidenza calibrati; prompt set e framework di valutazione open-source. Design Arena (Arcada Labs, YC S25) fa lo stesso in crowdsourcing con Elo su siti/UI component/dataviz generati come singolo file HTML. Il punto metodologico: nessuno chiede punteggi assoluti — il giudizio estetico umano è affidabile solo in forma comparativa, e i rating assoluti hanno agreement basso (coerente col Fleiss κ 0,29-0,31 di UICrit).

**Rilevanza per la Site Factory:** L'audit umano della fabbrica offline conviene strutturarlo pairwise: nuovo preset/variante vs il migliore in libreria sullo stesso contenuto, pochi voti bastano per un ranking calibrato. Stesso formato per misurare l'agreement del critico con Mattia.

**Fonti:** <https://arxiv.org/abs/2508.20410>

#### Tool commerciali: non esiste un 'giudice estetico assoluto' sul mercato — solo predizione di attenzione

Il segmento commerciale più vicino è la predictive eye-tracking, non il giudizio estetico: Attention Insight (CNN addestrata su milioni di fissazioni reali; attention heatmap, Clarity/Focus score, percentage of attention, contrast map; claim 'fino a 96% accuracy'; piano Pro €119/mese con 200 crediti e API — prezzi luglio 2026) ed EyeQuant (modelli su 1,6M punti dato da 20.000 esperimenti eye-tracking; heatmap predittive, clarity score). Nessuno dei due valuta bellezza/gusto/coerenza col brand: misurano dove andrà l'attenzione e quanto è 'pulita' la gerarchia visiva. I tool di visual testing (Applitools ecc.) restano regressione, non giudizio. Il 'giudice estetico da senior designer' non esiste come prodotto: chi lo vuole lo costruisce con VLM+rubrica (come Design Arena o gli evaluator Anthropic).

**Rilevanza per la Site Factory:** Conferma la build-vs-buy: il design-critic va costruito in casa. Un Focus/Clarity score su hero e CTA potrebbe però essere un segnale ausiliario indipendente a basso costo, se mai servisse un terzo parere non-LLM.

**Fonti:** <https://attentioninsight.com/>

#### Lo stack deterministico da mettere PRIMA del VLM: axe-core + impeccable detect (già installato) + metriche stile Design2Code

I VLM sono deboli esattamente dove il codice è perfetto: contrasto numerico, overflow, misure. Gate deterministici raccomandati: (1) axe-core via Playwright per WCAG 2.x A/AA (contrasto, heading order, touch target); (2) il detector di impeccable — 46 regole deterministiche senza LLM, eseguibili su URL vivo con `npx impeccable detect --json` per CI: verificato in locale (~/.claude/skills/impeccable/scripts/detector/rules/checks.mjs) include low-contrast, text-overflow, line-length, tiny-text, cramped-padding, monotonous-spacing, flat-type-hierarchy, overused-font, ai-color-palette, nested-cards, skipped-heading, gradient-text, justified-text, oversized-h1…; (3) per l'aderenza a un riferimento, le metriche di Design2Code: block-match, similarità testo Sørensen-Dice, colore CIEDE2000, posizione, CLIP similarity. In più, check custom banali sul nostro sistema: computed styles ∈ scala di token attesa, overflow orizzontale a 390px con parole lunghe.

**Rilevanza per la Site Factory:** Livello 1 del design-critic: gratis, istantaneo, bloccante, e libera il giudizio VLM per ciò che solo lui sa valutare (gerarchia, carattere, coerenza). Attenzione: alcune regole impeccable confliggono con lo standard ConsulBuild (H2 maiuscolo vs all-caps-body) — serve una whitelist.

**Fonti:** <https://github.com/pbakaus/impeccable> · <https://www.anthropic.com/engineering/harness-design-long-running-apps>

#### Procedura di calibrazione del giudice con label umane: gold set 30-200, κ di Cohen, recall per classe

Best practice consolidate: gold set di 30–200 esempi REALI (non sintetici) etichettati da esperti, con le classi di fallimento rappresentate; se gli umani disaccordano >20% la rubrica va riscritta prima di calibrare il giudice. Metriche insieme, mai solo accuracy: κ di Cohen (>0,8 forte; 0,6–0,8 sostanziale; <0,6 rifare la rubrica — 'un giudice con 0,9 accuracy e 0,1 κ sta tirando a indovinare'), precision/recall PER CLASSE (il recall sulla classe 'design da bocciare' è quello che conta), Spearman per gli score. Iterazione: 5–10 giri di riscrittura del prompt sui casi peggiori. Mitigazioni: pairwise valutato in entrambi gli ordini contando solo verdetti coerenti; anti-verbosity esplicito nella rubrica; canary gold set rieseguito a ogni modifica della skill per rilevare drift.

**Rilevanza per la Site Factory:** Ricetta pronta per la Site Factory: 30-50 screenshot dei siti reali + versioni degradate, etichettati passa/boccia+motivo da Mattia, κ e per-class recall come gate prima di fidarsi del critico — e rieseguiti come regression test quando si tocca la skill.

**Fonti:** <https://galtea.ai/blog/llm-as-a-judge-the-complete-guide> · <https://arxiv.org/html/2407.08850v2>

#### Architettura raccomandata per il design-critic + failure mode da mitigare

Pipeline a 3 livelli dopo `astro build`+preview server: L1 DETERMINISTICO (bloccante, gratis): axe-core AA, impeccable detect --json con whitelist ConsulBuild, no-overflow a 390px con parole lunghe maiuscole, computed styles conformi ai token del preset, palette=hex attesi. L2 CRITICO VLM: agente Claude separato con browser vivo (Playwright/preview MCP), screenshot 390px E 1280px, entrambi i temi, per-sezione + full-page; rubrica 5-7 criteri con ancore verbali 0/1/2 e soglia hard per criterio (stile copy-critic); few-shot: 2-3 esempi buoni (siti consegnati) e cattivi (degradati); verdetto JSON che nomina sezione/slot, mai coordinate; max 3 round. L3 UMANO: voto pairwise vs libreria. Failure mode noti: (a) il giudice minimizza i difetti trovati → soglie hard + tuning skeptical sui log; (b) localizzazione inaffidabile → riferimenti per nome-sezione; (c) position bias → doppio ordine nei pairwise; (d) scale incoerenti → ancore verbali, non 1-10; (e) drift → canary set in CI; (f) generatore che impara a compiacere il wording del rubric → rubrica e skill del designer mantenute separate.

**Rilevanza per la Site Factory:** È il deliverable del filone C: ogni pezzo è ancorato a evidenza (Anthropic per L2 e i failure mode a/b, AesEval per c/d, galtea per e, UICrit per b/d) e riusa infrastruttura già presente nel repo (preview server, check-contrast.mjs, pattern multi-fase di lib/run-step.ts).

**Fonti:** <https://www.anthropic.com/engineering/harness-design-long-running-apps> · <https://arxiv.org/abs/2603.01083> · <https://arxiv.org/html/2407.08850v2> · <https://galtea.ai/blog/llm-as-a-judge-the-complete-guide> · <https://github.com/pbakaus/impeccable>

**Nozioni segnalate per approfondimento da questo filone:**
- AesEval-Bench: leggere il paper completo (arxiv 2603.01083, PDF >10MB, non fetchabile) per i numeri per-indicatore — Sapere QUALI dei 12 indicatori (gerarchia, leggibilità, spacing, colore…) i VLM sbagliano di più permetterebbe di spostare con precisione il confine tra check deterministici e giudizio VLM nella nostra rubrica.
- UIClip come scorer locale: disponibilità dei pesi (HuggingFace), costo di inferenza su Mac, transfer dal dominio mobile-UI ai siti vetrina desktop — Se gira in locale sarebbe un pre-filtro numerico gratuito e istantaneo per ranking di varianti nella fabbrica offline, senza consumare sessioni Claude.
- UI-Bench: prompt set e framework open-source (arxiv 2508.20410) — riusabilità per benchmark interno dei nostri preset contro v0/Lovable/tool commerciali — Un confronto periodico dei nostri preset contro l'output dei tool text-to-app commerciali darebbe una misura oggettiva del vantaggio competitivo dell'agenzia.
- Synthetic defect injection sul nostro renderer: generare automaticamente versioni degradate dei golden example (rompere token di spacing, contrasto, scala tipografica via CSS override) — È il modo più economico per costruire il gold set di calibrazione del critico e per fare regression test della skill — la tecnica è validata da UIClip ma va progettata sul nostro sistema a token.
- Implementazione pratica delle metriche Design2Code (repo, dipendenze) per il check 'aderenza al riferimento' quando l'AI propone nuovi preset partendo da siti di ispirazione — Nella fabbrica offline serve misurare quanto un preset proposto si avvicina al riferimento di qualità senza copiarlo: block-match + CIEDE2000 + CLIP similarity sono deterministici e citabili.
- Audit di compatibilità delle 46 regole impeccable con lo standard ConsulBuild (es. all-caps-body vs H2 maiuscolo, repeated-section-kickers vs eyebrow di brand deliberato) — Prima di mettere `impeccable detect --json` come gate L1 in pipeline serve una whitelist: alcune regole anti-slop generiche bocciano scelte deliberate del design system.

### Filone: fonti-riferimento


#### One Page Love è la galleria più allineata al prodotto: single-page reali, filtro per settore

Cura SOLO siti one-page: 9.041 esempi reali (screenshot + feature breakdown, non concept), con generi filtrabili per settore — Restaurant (165 siti), Event (395), Photography (155), Portfolio, Wedding, Non Profit — più filtri per stile (Minimal, 3D, Brutalism, Scroll Effects), piattaforma (Webflow, Framer, WordPress) e schema colore. Attiva dal 2008, browsing gratuito, nessuna API/export visibile. È l'unica grande galleria il cui perimetro coincide esattamente col vostro output (vetrina single-page).

**Rilevanza per la Site Factory:** Fonte primaria per la fabbrica offline: il filtro 'Restaurant' + 'Minimal' dà direttamente riferimenti di grammatica di pagina per-settore in formato single-page — utile sia per nuovi preset sia per blueprint alternativi (ordine sezioni osservabile scrollando i siti live linkati).

**Fonti:** <https://onepagelove.com/inspiration>

#### Awwwards ha gallerie per industria con siti veri e linkati; browsing gratuito

Esistono pagine categoria per industria (Restaurant & Hotel ~40+ siti su 5 pagine, Architecture, Fashion, E-commerce), tutte con link ai siti live reali e livello di premio indicato (Honorable Mention, Site of the Day/Month, Developer Award). Browsing gratuito; il Creative Pass (€11,50/mese) serve solo per i corsi. Giuria: Design 40%, Usability 30%, Creativity 20%, Content 10%; HM richiede ≥6.5. Caveat: bias sistematico verso siti spettacolari/animati — in conflitto col vostro divieto di animazioni in-page, quindi da usare per palette/tipografia/art direction, non per motion.

**Rilevanza per la Site Factory:** Riferimento 'alto artigianato' per settore nella fabbrica offline; il critico visivo AI può usare i 4 criteri pesati di Awwwards come rubrica esterna di confronto. Filtrare sempre ciò che dipende da animazioni.

**Fonti:** <https://www.awwwards.com/websites/restaurant/> · <https://www.awwwards.com/about-evaluation/>

#### Mappa e prezzi 2026 delle gallerie 'production-first' (siti/prodotti reali, non concept)

Land-book: gratis limitato (3 board), Pro $6/mese con ricerca per COMPONENTE (hero, footer, pricing, FAQ, CTA) — il taglio più utile per varianti di sezione. Mobbin: 600k+ screenshot di app mobile+web reali, Starter $20/Pro $40 a seat/mese, API solo Enterprise; taglio SaaS/product, non PMI locali. Refero (web+iOS reali, tassonomia per page-type e UI element): free ~3% della collezione, piano paid annuale. SiteInspire: gratis, filtri Styles/Types/Subjects ma skew fashion/arte/portfolio, quasi nulla su PMI locali. Godly è stato rebrandizzato in recent.design (settembre 2025, dominio nuovo): gratis, taglio sperimentale/high-craft. Landingfolio, saaslandingpage.com e Lapa.ninja: landing page SaaS/startup — bassa rilevanza per PMI locali. Prezzi da fonti di ricerca, non verificati sulle pagine pricing (403 al fetch).

**Rilevanza per la Site Factory:** Shortlist con budget: Land-book Pro ($6/mese) è il best-buy per la libreria di varianti di sezione; One Page Love + Awwwards gratis coprono estetica e settore. Mobbin/Refero opzionali, utili solo se entrerete su verticali SaaS-like.

**Fonti:** <https://www.siteinspire.com/> · <https://refero.design/> · <https://toolradar.com/tools/land-book> · <https://www.spendhound.com/marketplace/mobbin-pricing> · <https://land-book.com/pro> · <https://recent.design/>

#### Dribbble/Behance: solo per micro-dettagli estetici, mai per layout — sono concept non costruiti

Critica ormai consolidata nella community: Dribbble premia ciò che fotografa bene, non ciò che funziona; gran parte dei lavori sono redesign concept mai messi in produzione, con pattern che falliscono i test di usabilità (menu nascosti: -43% task completion in uno studio 2025 citato; icone senza label incomprese da 8/10 utenti). La raccomandazione ricorrente dei designer senior è usare gallerie di prodotti reali (Mobbin, Refero, SiteInspire) per la struttura e tenere Dribbble/Behance solo per texture, illustrazione, micro-composizioni.

**Rilevanza per la Site Factory:** Guardrail per la fabbrica offline: vietare a monte che il proponente AI di preset/varianti citi riferimenti Dribbble/Behance per layout o pattern di conversione; ammessi solo per dettagli estetici puntuali (es. trattamento fotografico, stile icone).

**Fonti:** <https://medium.com/@mohitphogat/designing-for-real-users-not-dribbble-shots-42036a4bd3cf> · <https://uxplanet.org/stop-using-dribbble-behance-to-find-design-inspiration-use-these-15-websites-instead-b3a200c82776>

#### I siti VERI delle PMI locali si trovano nei roundup verticali delle agenzie specializzate, non nelle gallerie generaliste

Le gallerie premium skewano su agenzie/SaaS/portfolio. Per ristoranti, studi medici, estetica i riferimenti reali migliori sono i 'best of' annuali curati da agenzie verticali che mostrano SITI DI CLIENTI REALI orientati a conversione: dental — Studio 8E8 '20 Best Dental Websites' (osservazione chiave emersa: le pratiche top usano foto vere del team, non stock), Delmain, RevenueWell; ristoranti — UpMenu '25 Best Restaurant Websites', EatApp, Framer blog (20 esempi con tips); saloni — SiteBuilderReport '25+ Salon Websites', Colorlib. Più webdesign-inspiration.com (filtro per industria, es. food-drinks; fetch bloccato 403, da esplorare a mano). Questi roundup si rinnovano ogni anno: fonte ricorrente, gratuita.

**Rilevanza per la Site Factory:** È il metodo di popolamento della reference library per-settore: per ogni nuovo verticale, cercare '[settore] best websites 2025/2026' da 2-3 agenzie specializzate diverse e incrociare i siti che ricorrono. Le note editoriali di questi roundup (perché il sito converte) sono annotazioni già pronte.

**Fonti:** <https://s8e8.com/articles/best-dental-websites> · <https://www.upmenu.com/blog/best-restaurant-websites-design/> · <https://www.framer.com/blog/restaurant-website-design-examples/> · <https://www.sitebuilderreport.com/salon-websites>

#### Metodo reference library dei design studio: salva-con-contesto + tassonomia + retrieval, tool: Eagle / mymind / Are.na

Il pattern professionale documentato: (1) cattura via browser extension al momento della scoperta; (2) annotazione DIRETTA sull'immagine del perché è stata salvata (Eagle ha annotazioni sull'immagine e filtro per annotazione — 'da browsing passivo a retrieval attivo'); (3) tassonomia doppia settore × pattern (hero, processo, prova sociale…); (4) ricerca per tag, colore dominante, rating. Tool: Eagle (desktop, licenza una tantum, lo standard de facto tra designer), mymind (AI auto-tagging, zero organizzazione manuale), Are.na (canali collaborativi, adatto a moodboard condivise). Traduzione per Site Factory: accanto a ogni screenshot un JSON di token estratti (palette campionata, font riconosciuti, spaziature, struttura sezioni) — così il proponente AI di preset consuma la libreria direttamente.

**Rilevanza per la Site Factory:** Blueprint operativo della vostra libreria interna: cartella per settore, screenshot full-page + annotazione 'cosa estrarre' + token JSON. L'annotazione umana è ciò che il critico visivo AI usa poi come ground truth.

**Fonti:** <https://en.eagle.cool/blog/post/inspiration-isnt-gone-use-eagles-annotationcomment-filters-to-quickly-find-every-great-idea> · <https://medium.com/design-bootcamp/how-i-use-eagle-as-a-design-reference-library-3891d8ed9310> · <https://www.are.na/>

#### Le gallerie bloccano attivamente il fetch automatico: la raccolta deve essere manuale/browser

Dato empirico di questa ricerca: Land-book, Mobbin (anche /pricing), Lapa.ninja, recent.design e webdesign-inspiration.com hanno risposto 403 Forbidden al fetch automatico; Refero e le pagine Google Fonts servono contenuto solo via JS. Le protezioni anti-bot sono la norma nel 2026 e i ToS di queste piattaforme tipicamente vietano scraping/harvesting sistematico. One Page Love, SiteInspire, Awwwards e designresourc.es sono invece accessibili. Nessuna delle gallerie mappate offre API pubblica (Mobbin: solo Enterprise).

**Rilevanza per la Site Factory:** Vincolo architetturale per la fabbrica offline: niente pipeline di scraping delle gallerie. Il flusso corretto è: umano (o browser presidiato) scopre e cattura gli screenshot dei SITI LIVE originali (non delle gallerie), li deposita nella libreria interna, e solo da lì parte l'analisi AI. Le gallerie servono da indice di scoperta, non da fonte dati.

**Fonti:** <https://land-book.com/> · <https://mobbin.com/pricing> · <https://lapa.ninja/> · <https://recent.design/?ref=godly>

#### Legale IT — il confine ispirazione/copia: liberi stile, idee e pattern di settore; vietata la copia pedissequa e l'imitazione servile confusoria

Il sito web è opera dell'ingegno tutelata (L. 633/1941): la tutela copre layout, organizzazione grafica e alberatura, MA la violazione d'autore richiede copia pedissequa — la somiglianza generale non basta (Interpatent; unica giurisprudenza storica citata: Trib. Bari 1998). Restano espressamente liberi: idee generali, stili comuni, pattern diffusi nel settore, soluzioni alternative. Secondo binario: concorrenza sleale (art. 2598 c.c.; art. 102 l.d.a.) per imitazione sistematica di forme particolari e originali idonea a creare confusione — ma opera solo tra concorrenti dello stesso settore/mercato (caso Kiko v. Wycon sul layout commerciale). Terzo binario (raro sul web): design registrato UE, criterio 'impressione generale' più ampio.

**Rilevanza per la Site Factory:** Guardrail operativi per la Site Factory: (1) ricombinare pattern da ≥3 fonti diverse, mai un sito singolo come modello; (2) check specifico: il riferimento non deve essere un concorrente locale del cliente (lì scatta la concorrenza sleale); (3) la rubrica del critico visivo può includere un punto 'distanza dalla fonte' (nessun elemento distintivo riconoscibile di un sito specifico).

**Fonti:** <https://canellacamaiora.it/diritto-dautore-e-siti-web-alcuni-chiarimenti/> · <https://www.interpatent.it/post20180427/>

#### Screenshot altrui come input di sistemi AI interni: coperti dall'eccezione TDM (art. 70-quater l.d.a. / art. 4 DSM) salvo opt-out

L'Italia ha recepito la direttiva copyright (D.lgs. 177/2021): l'art. 70-quater consente estrazione di testo e dati a chiunque, anche a fini commerciali, su opere ad accesso lecito — salvo riserva espressa del titolare in forma machine-readable (robots.txt, metadati, ToS del sito). L'AI Act (art. 53(1)(c)) impone il rispetto degli opt-out ai provider di modelli GPAI — voi non addestrate modelli, usate screenshot come contesto di analisi: profilo di rischio più basso, ma la buona pratica è la stessa. Il rischio vero non è l'input ma l'OUTPUT: se il preset/variante generato riproduce elementi espressivi riconoscibili della fonte, si torna al finding precedente (copia).

**Rilevanza per la Site Factory:** Regole operative: (1) rispettare robots.txt/opt-out TDM nella raccolta; (2) screenshot mai pubblicati né redistribuiti, solo uso interno; (3) il gate di qualità sta sull'output (nessuna riproduzione espressiva), non sull'input. Con queste tre regole l'uso interno è difendibile.

**Fonti:** <https://www.cyberlaws.it/en/2022/diritti-privativa-text-data-mining/> · <https://blog.ai-laws.org/landmark-court-decision-in-the-eu-copyright-permissibility-of-text-and-data-mining-for-the-purpose-of-ai-training/>

#### Google Fonts: uso commerciale pienamente lecito, ma va self-hostato (GDPR) — azione concreta sul renderer

Tutte le font del catalogo Google Fonts sono OFL o Apache 2.0: uso commerciale, client work e vendita di prodotti che le includono sono espressamente consentiti. La OFL FAQ (fonte autoritativa, letta direttamente) conferma: embedding via @font-face e self-hosting ok; uniche restrizioni: non vendere le font da sole e rinominare le versioni modificate (Reserved Font Names); attribuzione NON richiesta. Il problema è solo GDPR: caricare le font dal CDN Google trasmette l'IP del visitatore a Google (sentenza LG München 2022, orientamento consolidato 2025-26: self-hosting raccomandato/de facto obbligato in UE, elimina Google dai responsabili del trattamento).

**Rilevanza per la Site Factory:** Diretta e attuabile subito: presets.ts oggi 'carica i font Google del preset' — per i siti in produzione i font dei 6 preset vanno serviti self-hosted dal dominio del cliente (licenza lo permette esplicitamente), eliminando il nodo GDPR prima del deploy Fase C.

**Fonti:** <https://openfontlicense.org/ofl-faq/> · <https://usercentrics.com/knowledge-hub/google-fonts-gdpr-compliant/>

#### designresourc.es: meta-indice gratuito per tenere aggiornata la mappa delle fonti

Directory curata da Kyler Phillips: 300+ risorse organizzate in liste tematiche (UI inspiration, design systems in produzione, AI tools per designer, icone/asset, research), gratuita, con newsletter settimanale/mensile e submission vagliate personalmente. Non è una galleria di siti ma un indice di gallerie e tool: il posto dove scoprire le nuove fonti man mano che nascono (il turnover è reale: Godly→recent.design nel solo 2025).

**Rilevanza per la Site Factory:** Manutenzione della reference library: iscrizione alla newsletter = meccanismo a costo zero per intercettare nuove gallerie e tool di estrazione token senza rifare questa ricerca ogni anno.

**Fonti:** <https://designresourc.es/>

**Nozioni segnalate per approfondimento da questo filone:**
- Legge italiana 132/2025 su AI e diritto d'autore — Emersa nelle ricerche come novità normativa italiana specifica su AI e copyright (post-recepimento DSM): potrebbe introdurre obblighi o chiarimenti che toccano direttamente l'uso di opere altrui come input AI e la tutela degli output generati — merita analisi dedicata, anche col MCP legal-it disponibile nel progetto.
- ToS puntuali delle gallerie a pagamento (Mobbin, Refero, Land-book Pro) sull'uso degli screenshot — Le pagine legali erano dietro anti-bot/JS: prima di abbonarsi va verificato a mano se i loro termini permettono di scaricare/conservare screenshot nella libreria interna o solo consultazione in-app.
- Tool di estrazione automatica di token CSS da siti live (Project Wallace, CSS Stats e simili) — Chiude il cerchio della reference library: invece di stimare i token dai pixel degli screenshot, estrarre palette/scala tipografica/spaziature direttamente dal CSS dei siti riferimento — non ho potuto valutarne qualità e limiti.
- Premi verticali di settore (eHealthcare Leadership Awards, premi hospitality/food per siti web) — I premi generalisti skewano su agenzie; esistono award di settore che premiano siti veri di cliniche/ristoranti — potenziale fonte annuale ricorrente di riferimenti per-settore non esplorata in questa passata.
- Giurisprudenza italiana recente (2015-2026) su copia di siti web, oltre Trib. Bari 1998 e Kiko v. Wycon — Le fonti citano giurisprudenza datata o su layout fisici di negozi: una verifica su sentenze recenti specifiche sul web design (via MCP legal-it/Cassazione) darebbe guardrail più solidi al protocollo 'distanza dalla fonte'.
- Workflow di cattura full-page presidiata (browser extension → Eagle → JSON token) e pricing corrente di Eagle — Il metodo è chiaro ma la meccanica concreta (cattura full-page affidabile su siti con lazy-load, naming convention, prezzo licenza Eagle 2026) va progettata e verificata prima di popolarci la libreria.

### Filone: token-a-scala


#### Lo standard W3C DTCG è stabile (2025.10): usalo come formato dei preset

Il 28/10/2025 la Design Tokens Community Group ha rilasciato la prima versione stabile della spec (2025.10): formato JSON vendor-neutral ($value/$type/$description), alias/inheritance/riferimenti a livello componente, color space moderni (OKLCH, Display P3) e supporto esplicito al theming — light/dark, varianti accessibilità e temi di brand senza duplicare file. Implementato da 10+ tool: Style Dictionary, Tokens Studio, Terrazzo, Figma, Penpot, Sketch, Supernova, zeroheight. Adozione all'84% dei team (survey zeroheight citata nei risultati). Moduli Colors/Typography/Motion ancora in lavorazione. Da luglio 2026 è ragionevole considerarlo il formato d'archivio definitivo, non più un bersaglio mobile.

**Rilevanza per la Site Factory:** Oggi i 6 preset vivono come blocchi CSS in global.css. Serializzare ogni preset come file DTCG rende la libreria machine-readable: la fabbrica offline fa proporre all'AI un JSON validabile (Zod/JSON-schema, come già per site.json), non CSS — coerente col principio 'l'AI non scrive codice'. Il CSS per-preset diventa output di build deterministico.

**Fonti:** <https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/>

#### Pattern multi-brand consolidato: primitives per-brand, semantic condiviso, componenti intoccabili

L'architettura a tier (primitive → semantic → component) è lo standard de facto per il multi-brand. Implementazione concreta con Style Dictionary (Always Twisted, parte 9): tokens/base/<brand>/*.tokens con i valori grezzi di ogni brand; tokens/semantic/ costruito UNA volta con naming unico prefissato (--ds-*) che referenzia i base ({color.base.primary} → var(--color-base-primary)); build in doppio loop brand × formato. Aggiungere un brand = aggiungere una cartella di primitives; semantic e componenti non si toccano mai. I pitfall documentati: filtrare i token per path per non mescolare i brand, e risolvere i riferimenti come var() CSS anziché valori inlined, così la cascata resta viva a runtime.

**Rilevanza per la Site Factory:** È esattamente la cascata Site Factory (:root < [data-preset] < inline cliente). La regola per passare da 6 a N preset senza caos: i componenti Astro consumano SOLO classi semantiche (già vero per disciplina — va reso contratto verificabile), ogni preset è solo un set di primitives + mapping. Un linter che vieti nei componenti qualsiasi token non-semantico è il guardrail più economico.

**Fonti:** <https://www.alwaystwisted.com/articles/a-design-tokens-workflow-part-9>

#### Naming per librerie crescenti (Nathan Curtis): il tema è un namespace, tema ≠ mode, promozione graduale

Tassonomia a 4 gruppi: base (category/property/concept: color.text.heading), modifiers (variant/state/scale/mode), object (componente), namespace (system/theme/domain — es. tema 'ocean'). Tre regole utili a chi cresce: (1) il tema è ortogonale al color mode — un tema può avere on-light/on-dark, non confondere gli assi; (2) override per aliasing, mai per duplicazione dell'albero; (3) promozione graduale: un token nasce locale a un componente e si promuove a globale solo quando ≥3 componenti condividono la decisione. Anti-regola: non includere dogmaticamente tutti i livelli nel nome, solo quelli necessari all'intento.

**Rilevanza per la Site Factory:** Schema di naming pronto per la libreria N preset: preset come namespace (terra.color.accent), settore come 'domain', il futuro dark mode come 'mode' su un asse separato. La regola di promozione dà il criterio per gli 'adattamenti runtime per-cliente': quando lo stesso override ricorre su 3+ clienti dello stesso settore, diventa token del preset di settore.

**Fonti:** <https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676>

#### Versioning: SemVer library-level per i preset, token versionati separatamente dai componenti, deprecation con finestra

Curtis (EightShapes): SemVer è lo standard anche per asset di design. Library-level (una versione per tutto) è giusto per deliverable HTML/CSS dove non si possono mescolare versioni; component-level serve solo a ecosistemi JS grandi. Consiglio chiave: versionare i TOKEN separatamente dalla libreria componenti, così lo stile evolve senza toccare il codice. Deprecation: audit dell'uso → comunicazione → timeline (Salesforce concede 18 mesi, community piccole 3-6) → doppia disponibilità durante la finestra → rimozione solo in major. Un rename di token semantico è breaking a tutti gli effetti. La spec DTCG prevede $deprecated come metadato.

**Rilevanza per la Site Factory:** Ricetta diretta: ogni preset in libreria ha versione SemVer propria + changelog; il site.json di ogni cliente pinna preset@versione, così un futuro redeploy non cambia l'estetica sotto i piedi del cliente. Deprecare un preset = $deprecated + non selezionabile per nuovi clienti, mai rimosso finché un sito live lo usa (l'editor Fase C sa già quale cliente usa cosa).

**Fonti:** <https://eightshapes.com/articles/versioning-design-systems/>

#### Terrazzo (ex Cobalt, MIT): da token DTCG a CSS per [data-preset] con un build deterministico

Terrazzo è il build tool nato DTCG-first: npx tz build genera tokens.css con CSS variables dai token JSON. Il punto forte per il multi-preset: il sistema 'permutations' mappa ogni mode/contesto su QUALSIASI selettore CSS — attribute selector ([data-theme="..."], quindi anche [data-preset="terra"]), media query, :root — con una funzione prepare() che controlla il wrapper. Supporta include/exclude per subset di token (separare primitives da semantic), CSS Color Module 4 con downconversion automatica dei colori P3 fuori gamut, transform() per override per-mode, e output anche Sass/JS/TS/Swift/Tailwind. Alternativa: Style Dictionary v4, che supporta sia formato legacy sia DTCG (non mescolabili) — più maturo ma meno DTCG-nativo.

**Rilevanza per la Site Factory:** È il pezzo che manca tra 'preset come JSON' e l'attuale global.css: la sezione per-preset di global.css può essere GENERATA da un file DTCG per preset, col mapping mode→[data-preset] identico a oggi. La fabbrica offline produce/valida JSON; Terrazzo produce il CSS; il renderer non cambia.

**Fonti:** <https://terrazzo.app/docs/integrations/css/>

#### Adobe Leonardo: palette generata DAL contrasto target — e da feb 2026 ha un server MCP

@adobe/leonardo-contrast-colors (Apache-2.0, 2.1k stars, attivamente mantenuto) genera colori a partire da ratio di contrasto TARGET contro un background: dai un colore chiave e un array di ratio (es. [3, 4.5, 7]) e ottieni una scala. Garanzia: l'output è 'slightly higher' del target per la natura discreta dell'RGB — sempre compliant perché WCAG definisce minimi; non tutti i ratio esatti sono raggiungibili. Supporta temi adattivi (lightness/contrast/saturation regolabili a runtime) e simulazione CVD. Novità rilevante: l'ultima release (21/02/2026) include @adobe/leonardo-mcp@0.1.0, un server MCP ufficiale.

**Rilevanza per la Site Factory:** Risposta alla domanda 3: sì, da un colore di marca si deriva una scala AA-garantita by-construction, con affidabilità 'compliant per costruzione' (mai sotto il target). Il server MCP è un innesto naturale nella pipeline claude -p: il palette-designer chiamerebbe Leonardo invece di proporre hex e verificarli dopo — generate-by-construction al posto dell'attuale 'scurisci finché passa', tenendo check-contrast.mjs come gate finale.

**Fonti:** <https://github.com/adobe/leonardo>

#### Material HCT: dal singolo colore brand a schema completo, col contrasto codificato nel 'tone'

material-color-utilities (Apache-2.0, ufficiale Google, TS/Java/Swift/Kotlin/Dart/C++) implementa HCT (hue-chroma-tone su base CAM16+L*): il tone è correlato direttamente al contrasto, quindi la distanza di tone tra due colori PREDICE il ratio — combinare per tonalità anziché per hex è ciò che rende accessibile 'by default' qualsiasi schema. Da un source color deriva 5 key colors (primary/secondary/tertiary/neutral/neutral-variant), tonal palette a 13 toni ciascuna, e DynamicScheme con livelli di contrasto regolabili. Regole pratiche emerse: T90-95 sfondo + T10-20 testo passa AA in entrambi i modi. Affidabilità: è il sistema in produzione su Android/Material 3, il più battle-tested del genere.

**Rilevanza per la Site Factory:** Filosofia complementare a Leonardo: HCT eccelle nel derivare TUTTO da un colore, ma in Site Factory i neutri appartengono al preset. Uso mirato: derivare accent-strong e le varianti sicure del primary cliente via matematica del tone (deterministico, niente iterazione), e in prospettiva generare secondary/tertiary armonici quando i preset di settore ne avranno bisogno.

**Fonti:** <https://github.com/material-foundation/material-color-utilities>

#### Ecosistema OKLCH (Evil Martians): apcach e Harmonizer per il contrast-first — ma il gate resti WCAG 2.x

apcach: libreria JS che COMPONE colori a partire dal contrasto desiderato (supporta sia APCA sia WCAG), con crToBg() per background arbitrari e maxChroma() per il colore più saturo che rispetta il vincolo; caveat: restituisce sempre un risultato anche fuori gamut, serve maxChroma(cap) per garantire un colore reale. Harmonizer (open source, Figma+web): palette multi-hue con livelli di lightness percettivi in cui ogni livello ha contrasto identico — cambi hue senza perdere il ratio. Polychrom: audit contrasto APCA in Figma. Avvertenza trasversale: l'ecosistema spinge APCA perché percettivamente più accurato, ma APCA NON è lo standard normativo — la conformità AA si dimostra con la formula WCAG 2.x.

**Rilevanza per la Site Factory:** apcach in modalità WCAG è l'alternativa leggera (npm, zero Figma) a Leonardo per il bottone 'Scurisci finché passa' dell'editor: calcolo diretto del colore col ratio voluto a hue costante, niente loop. La lezione di Harmonizer (livelli = contrasto costante tra hue diversi) è il modello giusto per palette di settore intercambiabili sugli stessi neutri di preset.

**Fonti:** <https://evilmartians.com/chronicles/exploring-the-oklch-ecosystem-and-its-tools> · <https://evilmartians.com/opensource/harmonizer>

#### Font pairing: nessun engine open pronto; la strada codificabile è matrice curata + vincoli semplici

La ricerca accademica (Visual Font Pairing, arXiv 1811.08015) inquadra il pairing come problema ASIMMETRICO (header e body non intercambiabili) e lo impara con metric learning da milioni di PDF — ma né dataset né modello sono diventati un tool riusabile standard. I tool pratici (Fontjoy = embedding + deep learning; Fontpair = coppie Google Fonts curate a mano) non codificano settore/tono. Le euristiche convergenti e codificabili: max 2 famiglie; contrasto complementare (display serif + testo sans o viceversa, o stessa superfamiglia); coerenza di x-height e proporzioni; mai due font della stessa categoria troppo simili. Il mapping settore→categoria (sans geometrico=tech, serif=editoriale/lusso, slab/rounded=artigianale/friendly) è consolidato nella pratica ma va curato a mano, non esiste dataset autorevole.

**Rilevanza per la Site Factory:** Conferma l'impianto attuale: il pairing vive nel preset, non a runtime. Per N preset: whitelist Google Fonts annotata a mano (categoria, x-height, tono, settori adatti) + regole codificate come vincoli nello slots.json estetico; l'AI della fabbrica propone coppie SOLO dalla whitelist, il critico visivo giudica sul render. Fontjoy/Fontpair come vivaio di candidati, mai come decisore.

**Fonti:** <https://arxiv.org/abs/1811.08015>

#### Tokens Studio 2026: il modello 'temi = combinazione di assi' è da copiare; il tool probabilmente no

Tokens Studio organizza i token in set combinabili in 'themes' su più assi (brand × color-mode × density), con git sync, release versionate con cronologia auditabile e branching. Prezzi correnti (luglio 2026, fatturazione annuale): plugin+Starter Plus €17/mese (5 progetti, export CSS, versioned releases); Essential €169/mese (1 editor, branching e direct-to-code); Organization €499/mese (5 editor, 20 progetti). Plugin Figma base gratuito, trial 14 giorni. Il flusso è fortemente Figma-centrico: il valore sta nel sync designer↔repo.

**Rilevanza per la Site Factory:** Site Factory non ha designer su Figma nel loop: file DTCG in git + Terrazzo replicano gratis la parte utile (versioning via git, build multi-tema). Da copiare invece il modello concettuale degli assi componibili: la libreria va modellata come preset (estetica) × settore (grammatica) × mode (futuro dark) — assi ortogonali, non un'esplosione di preset monolitici.

**Fonti:** <https://tokens.studio/pricing>

#### Governance alla Adobe Spectrum: diff automatici tra release di token e grafo di dipendenze

Adobe ha rinominato spectrum-tokens in spectrum-design-data: non solo token ma JSON schema dei componenti, mode-sets, registry, e soprattutto TOOLING di governance: Diff Generator (report delle differenze tra release/branch di token), Release Analyzer (frequenza e pattern dei cambi), visualizzatore S2 del grafo di dipendenze token (antenati/discendenti, filtri, uso per componente). Versioning automatizzato con Changesets; tassonomia dei nomi tenuta in un pacchetto 'sidecar' separato così i cambi di tassonomia non bumpano il pacchetto token. Lezione appresa (v12): enumerare ogni combinazione di opzioni come token fa esplodere la lista — meglio liste efficienti + schema. (Analogo, da ricognizione: Salesforce SLDS 2 GA con 'styling hooks' = custom properties globali che separano struttura da tema.)

**Rilevanza per la Site Factory:** A 6 preset la governance è a occhio; a 20+ servono gli strumenti di Spectrum in miniatura: (a) diff automatico tra versioni di preset da mostrare nell'audit umano della fabbrica; (b) registro chi-usa-cosa (cliente → preset@versione) nell'editor; (c) niente esplosione combinatoria: varianti di sezione come opzioni schema, non come token dedicati per ogni combinazione.

**Fonti:** <https://github.com/adobe/spectrum-design-data>

#### AI theme generation 2026: nessun tool sostituisce la fabbrica; il pattern vincente è 'token come contratto dell'agente'

La ricognizione 2025-2026 non ha trovato alcun tool che generi PRESET completi di qualità con vincoli estetici verificati — i 'design token generator' AI in circolazione estraggono/scaffoldano token, non fanno direzione artistica. Il pattern emergente serio (es. MindStudio) è l'inverso: token W3C in JSON con usage rules nei campi description ('accent: max una istanza per visual, mai come sfondo'), trasformati in style brief e iniettati nei prompt, con validazione finale via vision model contro criteri di brand — cioè locking della coerenza, non generazione di temi. Dai risultati di ricerca: Claude Design (Anthropic, update giugno 2026) aggiunge import di design system, sync bidirezionale con Claude Code e ruolo admin che 'locka' il sistema per il team — non approfondito direttamente.

**Rilevanza per la Site Factory:** Valida la strategia già decisa (fabbrica offline + critico + audit umano): non c'è scorciatoia da comprare. La parte azionabile subito: arricchire i token DTCG dei preset con usage rules leggibili dall'AI (il 'slots.json dell'estetica') e usare il critico visivo come vision-validation — pattern identico a quello che il mercato sta convergendo a fare.

**Fonti:** <https://www.mindstudio.ai/blog/design-token-system-ai-agents-brand-visuals>

**Nozioni segnalate per approfondimento da questo filone:**
- Leonardo MCP (@adobe/leonardo-mcp, feb 2026): capacità reali del server, tool esposti, come innestarlo nello step palette di claude -p — È l'unico generatore contrast-first con MCP ufficiale: se i tool esposti coprono 'scala da primary contro neutri fissi' sostituisce metà della skill palette-designer, ma la release è 0.1.0 e va provata.
- Claude Design (Anthropic) con import di design system e sync Claude Code — Emerso solo da snippet: se davvero permette di lockare un design system e sincronizzarlo con Claude Code sotto login Max, potrebbe entrare nella fabbrica offline a costo zero — da verificare cosa fa concretamente e cosa richiede.
- Moduli DTCG in arrivo (Colors, Typography, Motion) e il meccanismo di theming/resolver della spec — La spec stabile copre il Format; come DTCG modella ufficialmente i temi (resolver/modes) determina se la libreria preset può essere 100% standard o serve una convenzione proprietaria per gli assi preset×settore.
- Benchmark pratico Leonardo vs material-color-utilities vs apcach sul caso reale Site Factory (primary+accent cliente contro neutri di 6 preset) — Le tre librerie hanno filosofie diverse (ratio-target, tone-based, compose-from-contrast): solo un test sui casi reali dice quale produce i colori esteticamente migliori a parità di AA garantito.
- Articolo 'font matrix' di Google Fonts Knowledge (pairing per costruzione/contrasto) — La pagina non si è caricata via fetch (client-rendered): è la fonte più autorevole di euristiche di pairing codificabili e andrebbe letta con browser per estrarre gli assi della matrice da mettere nella whitelist annotata.
- Densità come asse di variante (Comfy/Compact alla SLDS 2) applicata ai preset Site Factory — Un asse density (spaziature/scala) moltiplica la varietà percepita dei layout a costo di pochi token, senza nuovi componenti né nuovi preset: candidato economico per il filone 'varietà di layout'.

### Filone: grammatiche-settore


#### L'anatomia di conversione è cross-settore: 5 elementi + "guided decision path"

Unbounce (riferimento canonico del settore) definisce 5 elementi in ordine: USP/headline con message match, hero visual, benefici (impatto, non feature), social proof specifica e non falsificabile, UNA sola conversion goal. Il framework 2026 di Unicorn Platform la raffina come percorso decisionale in 7 tappe: rilevanza primo schermo → contesto problema → meccanismo/soluzione → strato di prova → dettagli offerta → modulo d'azione → rinforzo finale contro le ultime obiezioni; ogni sezione risponde a UNA domanda e riduce UN rischio. La variabile che cambia l'ordine non è il settore in sé ma l'intent del traffico: freddo = più contesto e prova; caldo/alta intenzione = accorciare e andare all'azione.

**Rilevanza per la Site Factory:** Il blueprint conversione-locale-v1 rispecchia già questa anatomia: le grammatiche per-settore non vanno reinventate da zero ma modellate come permutazioni del decision path in base all'intent tipico del verticale (ristorante = alta intenzione → pagina corta, menu subito; dentista = ansia/fiducia → strato di prova espanso prima del booking). Ogni sezione del blueprint può dichiarare quale "domanda" risponde: utile come check del critico.

**Fonti:** <https://unbounce.com/landing-page-articles/the-anatomy-of-a-landing-page/> · <https://unicornplatform.com/blog/optimal-landing-page-structure/>

#### Evidenza quantitativa 2026: cosa vince per-sezione (studio su 2.000 pagine A/B)

Studio Digital Applied Q4 2025–Q1 2026, 2.000 pagine A/B-testate, soglia 95% significatività: social proof con nomi concreti +22%, testimonial singolo con foto+ruolo +14%, logo strip +8%, loghi stampa solo +5%; sticky-bottom CTA +11% (combinarla con CTA above-fold dà solo +12%: il compounding non esiste); CTA multiple nell'hero -8% (paralisi decisionale); stock photo generica "team sorridente col laptop" -11%; hero con un big number +18%; form: ogni campo oltre 4 dimezza la conversione (1 campo = 12,4% vs 6+ = 3,1%); LCP sotto 2s è soglia critica (4,1-4,4% → 1,7% a 4s+). Caveat: studio self-published da un'agenzia, non peer-reviewed — trattare i numeri come direzionali.

**Rilevanza per la Site Factory:** Parametri concreti per le varianti di sezione: (1) variante hero "big number" (anni di attività, cantieri completati); (2) sticky CTA mobile come variante nuova ad alto impatto; (3) il form ContactCTA deve restare ≤4 campi; (4) conferma la guerra anti-stock-photo già nella rubrica immagini; (5) testimonial con foto+nome+ruolo battono la lista anonima: vincolo per lo slot testimonial.

**Fonti:** <https://www.digitalapplied.com/blog/landing-page-conversion-study-2000-pages-tested-2026>

#### Benchmark Unbounce per industry: mediane 3,8–12,3% e leggibilità come leva

Conversion Benchmark Report Unbounce (dato 2024, il più recente pubblico: 41.000 landing page, 57M conversioni, 464M visitatori): mediana complessiva 6,6%, range per industry 3,8% (SaaS) – 12,3% (Legal); lead-gen locale nello studio Digital Applied: 6,8%. Insight strutturale chiave: pagine scritte a livello 5ª-7ª elementare convertono all'11,1% (+56% vs livello 8ª-9ª); le parole difficili (3+ sillabe) correlano -24,3% con le conversioni; l'83% delle visite è mobile ma converte l'8% in meno del desktop. Il report ha deep-dive per industry (health/wellness, professional services…) non letti in questa sessione.

**Rilevanza per la Site Factory:** Dà i numeri di riferimento per fissare aspettative realistiche per verticale (utile anche commercialmente coi clienti). La correlazione leggibilità→conversione è la conferma quantitativa della regola anti-slop del copywriter: frasi corte e parole semplici non sono solo gusto, convertono di più. I deep-dive per industry sono la fonte da spremere quando si apre un verticale nuovo.

**Fonti:** <https://unbounce.com/conversion-benchmark-report/>

#### GoodUI: la libreria di pattern rankati per evidenza A/B è il modello del "critico con dati"

GoodUI mantiene 141 pattern UI distillati da 633 A/B test reali su 147M visitatori, ciascuno rankato per esiti (165 test vincenti, 281 positivi non significativi, 144 negativi non significativi, 43 persi). Pattern attivamente validati e rilevanti per landing local-service: #41 Sticky Call To Action, #11 Gradual Reassurance (rassicurazioni progressive vicino ai punti di frizione), #45 Benefit Bar. La membership a pagamento dà 5 nuovi test al mese e sorting per impatto (prezzo non rilevato in questa sessione). È l'unico repository pubblico che lega ogni pattern di sezione a un track record sperimentale.

**Rilevanza per la Site Factory:** Due usi per la Site Factory: (1) fonte di priorità per decidere QUALI varianti di sezione costruire per prime nella fabbrica offline (partire dai pattern con più win); (2) modello metodologico per il critico visivo: invece di giudizi estetici a memoria, ancorare le regole della rubrica a pattern con evidenza. Abbonamento giustificabile nel budget.

**Fonti:** <https://goodui.org/patterns/>

#### NN/g: 4 fattori di credibilità universali — il trust è la grammatica dei settori YMYL

NN/g conferma (studio recente a Singapore che replica la ricerca di Nielsen del 1999) che i fattori di fiducia sono stabili cross-culturalmente: (1) design quality — refusi, link rotti e disordine degradano subito la credibilità; (2) upfront disclosure — contatti, prezzi, costi e policy visibili PRIMA di chiedere dati personali; gli utenti abbandonano i siti che nascondono informazioni di base; (3) contenuto completo, corretto e aggiornato — mostrare l'intera gamma di offerta con materiali di supporto; (4) connessione al resto del web — le testimonianze su siti ESTERNI sono più credute di quelle ospitate sul sito stesso.

**Rilevanza per la Site Factory:** Per i verticali trust-heavy (medico, legale) la grammatica deve pesare più "disclosure" che persuasione: sezione prezzi/processo trasparente, credenziali complete, e soprattutto recensioni di piattaforme terze (la sezione GoogleReviews già nello schema è esattamente il fattore 4 — da prioritizzare nella build dei componenti mancanti). Il fattore 1 è la giustificazione evidence-based dell'intera strategia "componenti curati a mano".

**Fonti:** <https://www.nngroup.com/articles/trustworthy-design/>

#### Grammatica ristorante: menu testuale, prenotazione sticky, food photography

BentoBox (piattaforma leader USA per siti ristorante) — 10 elementi essenziali: brand story (77% dei clienti visita il sito prima di venire), fotografia professionale (45% cerca esplicitamente foto dei piatti), mobile-first (70% del traffico è mobile), menu TESTUALE editabile — mai PDF o immagini — per SEO e accessibilità, bottoni Prenota/Ordina in navbar fissa (specie mobile), location/orari/contatti prominenti, form catering/eventi privati, e-commerce leggero (gift card), accessibilità ADA/WCAG. Dalle fonti 2025 in ricerca: ~metà delle prenotazioni ormai avviene online; l'88% della Gen Z controlla sempre il menu online prima di provare un ristorante; best practice = CTA "Prenota un tavolo" in header e above-the-fold con flusso di prenotazione brandizzato, non un modulo esterno che stona.

**Rilevanza per la Site Factory:** Sezioni NUOVE necessarie in libreria per questo verticale: MenuList (testuale, prezzi, descrizioni, etichette dietetiche — schema strutturato, non immagine), ReservationCTA (variante di ContactCTA con widget/link prenotazione e CTA sticky mobile), Gallery in variante food-first, e hero con orari+location subito visibili. L'ordine di pagina cambia: il menu sale subito dopo l'hero, il "processo numerato" dell'edilizia sparisce.

**Fonti:** <https://www.getbento.com/blog/the-10-essential-elements-of-a-restaurant-website/>

#### Vincolo normativo ristoranti: allergeni obbligatori anche nel menu digitale

Reg. UE 1169/2011: chi somministra alimenti deve informare sui 14 allergeni dell'allegato II; l'indicazione va data in modo chiaro e leggibile sia sul menu cartaceo sia su quello digitale (direttamente nel menu, con simboli+legenda, o rimando a registro ingredienti consultabile). I sistemi digitali NON possono essere l'unico strumento informativo. Sanzioni per omessa indicazione: 3.000–24.000 € (D.Lgs. 231/2017). Nota: informazioni raccolte dai risultati di ricerca (AUSL Parma, HACCP Easy, Confcommercio) — quadro coerente tra più fonti istituzionali italiane, non letto per intero un singolo documento.

**Rilevanza per la Site Factory:** Se la Factory genera un componente MenuList per ristoranti, lo schema Zod deve prevedere il campo allergeni per piatto (o un disclaimer standard "informazioni allergeni disponibili in sede"). È un esempio della categoria nuova che la grammatica per-settore deve includere: vincoli normativi di verticale, da codificare in slots.json/contesto.json come per le promesse_vietate.

**Fonti:** <https://www.haccpeasy.it/2025/07/12/indicazione-degli-allergeni-cosa-prevede-il-reg-ue-1169-11/> · <https://www.ausl.pr.it/come_fare/alimentaristi/allergeni_cibi_preconfezionati_informazioni_normativa.aspx>

#### Grammatica studio dentistico: trattamenti dedicati, credenziali E-E-A-T, booking corto e ripetuto

Pulse Digital (agenzia healthcare UK) — 9 feature del sito dentistico ad alta conversione: homepage che in secondi dice chi/dove/cosa con CTA booking prominente; velocità; mobile-first; navigazione a ≤2 click; pagine DEDICATE per trattamento (implantologia, ortodonzia, sbiancamento…) ciascuna con testimonial specifici, FAQ e CTA; CTA ripetute su tutto il sito (booking, richiamata, telefono); form di booking/enquiry corti; recensioni Google + before/after + accreditamenti nei momenti di decisione; contenuto E-E-A-T con profili dei clinici e qualifiche (il contenuto dentale è YMYL per Google). Dalle fonti in ricerca: il bottone "Prenota" almeno 3 volte per pagina; un case study citato (Chicago) riporta +89% di conversione riducendo il form da 12 a 6 campi; sezione "Meet the Team" con foto reali, anni di esperienza e specializzazioni.

**Rilevanza per la Site Factory:** Sezioni NUOVE per il verticale: TeamCredentials (foto vere + qualifiche + iscrizione ordine), TreatmentCards con FAQ per trattamento, BookingCTA; BeforeAfter e GoogleReviews sono GIÀ nello schema senza componente — questo verticale li rende prioritari (ma vedi il finding normativo). La logica "una pagina per trattamento" suggerisce che per i settori medici il single-page potrebbe non bastare a regime.

**Fonti:** <https://pulsedigital.health/insights/high-converting-dental-website-design/>

#### Vincolo normativo sanità italiana: la L.145/2018 VIETA pezzi interi della grammatica standard

Per siti di dentisti/medici in Italia (L. 145/2018 "norma Boldi", Codice deontologico, L. 175/1992): comunicazione solo informativa, veritiera e documentabile, SENZA elementi promozionali o suggestivi. Vietati: sconti e prezzi promozionali, la formula "visita/consulenza gratuita e senza impegno", TESTIMONIAL e endorsement, claim comparativi; pubblicità di dispositivi su prescrizione (es. impianti) non rivolgibile al consumatore. Obbligatori sul sito: nominativo del direttore sanitario (per strutture societarie) su ogni messaggio, numero e ordine di iscrizione, titoli, P.IVA, contatti/sede. Fonte letta per intero: webmarketingperdentisti.it (aggiornata post-Boldi); quadro confermato dagli ordini dei medici di Terni e Perugia nei risultati di ricerca.

**Rilevanza per la Site Factory:** Ribalta assunzioni core della Factory: la cortesia "preventivo/sopralluogo gratuito" (consentita in edilizia da CLAUDE.md) è VIETATA in sanità; la sezione Testimonials/GoogleReviews è giuridicamente rischiosa per questo verticale; serve uno slot fisso footer con direttore sanitario + iscrizione ordine. La grammatica per-settore deve quindi includere anche sezioni vietate e claim vietati, codificati in contesto.json (promesse_vietate) e in slots.json del blueprint verticale.

**Fonti:** <https://webmarketingperdentisti.it/norme-pubblicitarie-studio-dentistico/>

#### Convenzioni altri verticali (estetica, palestre, studi legali) — prima mappa dai risultati di ricerca

Da snippet di ricerca (fonti non lette per intero, da verificare in un pass dedicato): ESTETICA/PARRUCCHIERI — prezzi visibili nei servizi (il prezzo nascosto è la prima causa di mancata prenotazione), foto originali di lavori reali e before/after, booking embedded con disponibilità real-time (70% delle prenotazioni da mobile), 3+ canali di prenotazione = +34% appuntamenti. PALESTRE — free trial above-the-fold ("Prova gratis 7 giorni. Senza contratto."), form a 3 campi (nome, email, telefono), orario corsi facilmente trovabile, prezzi trasparenti, foto vere di spazi e staff. STUDI LEGALI — le pagine profilo degli avvocati sono le PIÙ visitate del sito; pagine per area di pratica; "Prenota una consulenza" ripetuto; tipografia pulita e palette sobria; tutto raggiungibile in ≤2 click.

**Rilevanza per la Site Factory:** Conferma il pattern trasversale: ogni verticale ha 2-3 sezioni-firma proprie (listino prezzi, orario corsi, profili professionisti con credenziali) + un meccanismo di conversione proprio (booking, free trial, consulenza) — il resto dell'anatomia è invariante. La libreria ha bisogno di: PriceList, Schedule/Timetable, TeamCredentials, BookingCTA — 4 componenti che coprono 4 verticali futuri.

**Fonti:** <https://glossgenius.com/blog/hair-salon-websites> · <https://www.glofox.com/blog/gym-landing-page/> · <https://www.paperstreet.com/blog/50-best-practice-area-pages-for-law-firms-get-creative/> · <https://www.legalgps.com/solo-attorney/law-firm-website-must-haves>

#### Il metodo corpus è già praticato: Relume, Landingfolio e Web Anatomy dimostrano che funziona

Tre precedenti sistematici: (1) Relume — 1.000+ componenti Webflow con tassonomia fissa di sezioni (Hero, Header, Feature, CTA, Contact, Pricing, FAQ, Testimonial, Logo, Blog, Gallery) usata anche dal suo AI per generare sitemap/wireframe da prompt; (2) Landingfolio — 500+ sezioni reali categorizzate con conteggi per tipo (CTA 57, Feature 57, Hero 37, Testimonial 34, Pricing 31…); (3) Web Anatomy (letto) — corpus di 286+ pagine SaaS reali taggate per TIPO DI SEZIONE × INDUSTRY × quality tier, con scoring a 6 dimensioni per hero: il 76% degli hero scora 30-59/100, solo l'8% supera 70; le best practice più rare sono "outcome timeframe" (21%) e social proof above-the-fold (81% nei best-in-class vs 41% media).

**Rilevanza per la Site Factory:** Valida il metodo corpus della Factory e regala la tassonomia di partenza (quella di Relume mappa quasi 1:1 sui tipi di sezione dello schema Zod). Web Anatomy è il modello più vicino al critico visivo della fabbrica offline: tagging sezione×settore×qualità + scoring dimensionale. Da replicare in piccolo per ogni verticale nuovo.

**Fonti:** <https://www.webanatomy.ai/best-landing-pages/sections/hero> · <https://www.relume.io/components> · <https://www.landingfolio.com/library/pricing>

#### Deliverable: metodo ripetibile "settore nuovo → grammatica curata" + bozze ristorante e dentista

Metodo in 6 passi: (1) CORPUS: 20-30 esempi top del verticale (One Page Love per categoria — 1.952 design curati con screenshot integrali —, template best-seller Webflow/ThemeForest, siti premiati, 3-4 competitor italiani veri); (2) TAGGING AI su tassonomia fissa di sezioni (base Relume/schema Zod): per ogni sito, sequenza di sezioni; (3) DISTILLAZIONE: frequenze → sezioni core (>70% del corpus), opzionali (30-70%), rare; ordine modale della pagina; (4) OVERLAY EVIDENZA (GoodUI/Unbounce/NN/g/Digital Applied) per risolvere le ambiguità di ordine; (5) OVERLAY NORMATIVO italiano (sezioni/claim vietati e obbligatori); (6) OUTPUT: blueprint.json + slots.json del verticale + lista componenti mancanti; audit umano prima dell'ingresso in libreria. BOZZE — Ristorante: Hero(foto piatto, orari, CTA Prenota sticky) → Menu testuale con allergeni → Storia/chef → Gallery food → Reviews → Location/orari/mappa → ReservationCTA. Dentista: Hero(chi/dove/booking) → barra credenziali/ordine → card trattamenti+FAQ → team con qualifiche → processo prima visita → GoogleReviews (verifica legale) → BookingCTA → footer con direttore sanitario.

**Rilevanza per la Site Factory:** È il processo operativo da implementare nella fabbrica offline: ogni passo è automatizzabile con claude -p headless tranne l'audit finale. Le due bozze sono il punto di partenza per i primi due blueprint verticali alternativi.

**Fonti:** <https://onepagelove.com/templates/landing-page-templates> · <https://www.webanatomy.ai/best-landing-pages/sections/hero> · <https://www.getbento.com/blog/the-10-essential-elements-of-a-restaurant-website/> · <https://pulsedigital.health/insights/high-converting-dental-website-design/>

**Nozioni segnalate per approfondimento da questo filone:**
- Deep-dive per-industry del Conversion Benchmark Report Unbounce (health/wellness, professional services, legal) — Il report principale ha pagine dedicate per settore con raccomandazioni specifiche (word count ottimale, sentiment, tipo di CTA) che non ho letto: sono la fonte quantitativa più diretta per calibrare le grammatiche verticali.
- Verifica legale dedicata sulla pubblicità sanitaria (L.145/2018) prima di aprire il verticale medico — Testimonial vietati, 'visita gratuita' vietata, direttore sanitario obbligatorio: serve un parere puntuale (il MCP legal-it in casa è perfetto) su cosa può contenere GoogleReviews/BeforeAfter per dentisti e quali diciture footer sono obbligatorie — il rischio è deontologico e sanzionatorio per il cliente.
- Membership GoodUI: prezzo attuale e distillazione dei pattern top in regole per il critico visivo — 141 pattern rankati su 633 test reali sono la miglior base pubblica per ancorare la rubrica del critico a evidenza sperimentale invece che a gusto; costo dell'abbonamento non rilevato in questa sessione.
- Widget di booking/prenotazione integrabili in un sito Astro statico (TheFork/Google Reserve per ristoranti, MioDottore per dentisti, Treatwell per estetica) — Tutte le grammatiche verticali convergono su un meccanismo di conversione 'booking embedded': serve capire quali widget funzionano su static hosting Cloudflare Workers, con che vincoli di branding e a che prezzo.
- Web Anatomy e Relume: licensing e possibilità d'uso come tassonomia/riferimento diretto nella fabbrica offline — Sono i precedenti più vicini al metodo corpus della Factory; da verificare se i loro contenuti sono usabili come riferimento di design (e la tassonomia Relume come standard interno) senza problemi di licenza.
- Multi-page vs single-page per i verticali medici (una pagina per trattamento) — Le fonti dentali convergono su pagine dedicate per trattamento come leva sia SEO sia di conversione: potenziale evoluzione architetturale del renderer (oggi single-page + sottopagine legali) da valutare prima di lanciare il verticale.

## Follow-up (ricerche dedicate emerse dalla prima ondata)


### Leonardo MCP e generazione palette contrast-first: investigare @adobe/leonardo-mcp@0.1.0 (release feb 2026 di github.com/adobe/leonardo) — quali tool MCP espone, se coprono il caso 'scala derivata dal primary del cliente contro neutri fissi di preset' e come innestarlo nello step palette via claude -p headless. Confrontare su docs/API le tre filosofie alternative per lo stesso caso Site Factory: @adobe/leonardo-contrast-colors (ratio-target), material-color-utilities/HCT (tone-based) e apcach in modalità WCAG (compose-from-contrast), incluso il possibile rimpiazzo del bottone 'Scurisci finché passa'.


#### @adobe/leonardo-mcp 0.1.0: wrapper stdio di 12 file su una libreria matura, ma adozione ~zero

Verificato leggendo il sorgente del tarball npm: il pacchetto è un wrapper sottile (~350 righe totali, 12 file) su @adobe/leonardo-contrast-colors, con transport StdioServerTransport, validazione Zod e bin `leonardo-mcp` lanciabile via `npx -y @adobe/leonardo-mcp`. Due sole release (0.0.1 e 0.1.0, entrambe 20-21 feb 2026, nulla da allora al 2026-07-10). Download: ~180/mese per l'MCP contro ~54.000/mese della libreria sottostante (matura, Apache-2.0, provenance attestation npm). Nato dall'iniziativa 'AI tooling' di GarthDB (issue #266, chiusa): llms.txt + Agent Skill + MCP. Nessuna issue aperta di bug sull'MCP.

**Rilevanza per la Site Factory:** Rischio di supply-chain e di manutenzione basso (auditabile in 10 minuti, dipende solo da SDK MCP + zod + la libreria matura), ma è una 0.1.0 di fatto non battle-tested: il valore vero sta nella libreria; il server è solo il trasporto che permette a claude -p di eseguirla in-loop.

**Fonti:** <https://github.com/adobe/leonardo/issues/269> · <https://github.com/adobe/leonardo/issues/266> · <https://leonardocolor.io/ai-tools.html>

#### I 4 tool esposti (schemi esatti dal sorgente): generate-theme è l'unico che conta per lo step palette

1) generate-theme: {colors[]: {name, colorKeys[], ratios: number[]|Record<string,number>, colorspace? tra LCH/LAB/RGB/HSL/HSV/HSLuv/CAM02/CAM02p/OKLAB/OKLCH}, backgroundColor: stesso schema, lightness 0-100, contrast?, saturation?, output?, formula?: wcag2|wcag3} → theme.contrastColors JSON con campo `contrast` reale per ogni value. 2) check-contrast: {foreground, background, method?} → ratio + {aa≥4.5, aaa≥7, largeText≥3} o APCA Lc. 3) convert-color: conversione formato. 4) create-palette: scala interpolata SENZA target di contrasto (createScale con smooth/shift/distributeLightness). I ratios sono minimi garantiti: il README ufficiale dichiara che Leonardo genera colori "a little more accessible than the minimum".

**Rilevanza per la Site Factory:** generate-theme con ratios named (es. {accent:3, accentStrong:4.5, accentAAA:7}) produce in UNA chiamata tutte le varianti che oggi la skill palette-designer propone a mano e poi verifica: accent-strong, hover, varianti per .section-dark (secondo theme a lightness bassa). check-contrast è ridondante col gate esistente.

**Fonti:** <https://registry.npmjs.org/@adobe/leonardo-mcp/-/leonardo-mcp-0.1.0.tgz (sorgente src/server.js e src/tools/*)> · <https://raw.githubusercontent.com/adobe/leonardo/main/packages/contrast-colors/README.md>

#### Gap critico: generate-theme NON accetta uno sfondo hex fisso — il background è generato, non preservato

Il caso Site Factory è 'scala dal primary del cliente contro neutri FISSI di preset'. Ma nel tool il background si dichiara come BackgroundColor (scala) + `lightness` 0-100, documentato come "desired lightness of GENERATED theme background color": Leonardo risolve il background interpolando i colorKeys a quella lightness, non usa il tuo hex tal quale. Workaround: bgDef.colorKeys=[neutroDelPreset] + lightness ≈ L del neutro → background risolto vicino ma non garantito identico al hex del preset; i ratio riportati sono calcolati contro il background risolto. Conseguenza: i colori derivati vanno comunque ri-verificati contro i neutri VERI del preset.

**Rilevanza per la Site Factory:** Metà della skill può diventare 'AA by construction' solo in senso pratico, non formale: pipeline corretta = generate-theme per derivare i candidati → gate deterministico esistente (check-contrast.mjs, spawnat da lib/contrast.ts) contro i neutri reali. Coerente con la filosofia attuale belt-and-braces; il gate NON si tocca (resta l'unica fonte del calcolo, come da CLAUDE.md).

**Fonti:** <https://raw.githubusercontent.com/adobe/leonardo/main/packages/contrast-colors/README.md> · <https://registry.npmjs.org/@adobe/leonardo-mcp/-/leonardo-mcp-0.1.0.tgz (src/tools/generate-theme.js)>

#### Innesto in claude -p: --mcp-config + --strict-mcp-config, con pin di versione e pre-warm di npx

La CLI installata (verificato con claude --help) supporta `--mcp-config <json|file>` e `--strict-mcp-config` (ignora ogni altra config MCP — ideale per uno step sandboxato). Ricetta per il runner lib/steps.ts/run-step.ts: mcp-config {"mcpServers":{"leonardo":{"command":"npx","args":["-y","@adobe/leonardo-mcp@0.1.0"]}}} + allowedTools limitati a mcp__leonardo__generate-theme (e volendo create-palette); Bash resta ristretto a check-contrast.mjs. Due accorgimenti: pinnare la versione (è una 0.x, API instabile per definizione semver) e pre-installare il pacchetto (primo `npx -y` scarica da npm: latenza e dipendenza dalla rete a ogni run se la cache è fredda). Esiste anche una Agent Skill ufficiale (`npx skills add https://github.com/adobe/leonardo`) come alternativa senza runtime.

**Rilevanza per la Site Factory:** L'integrazione è a basso attrito e reversibile: nessuna modifica architetturale, solo flag del comando claude -p nello step palette. --strict-mcp-config evita che lo step erediti gli altri MCP dell'utente (es. legal-it).

**Fonti:** <https://leonardocolor.io/ai-tools.html> · <https://github.com/adobe/leonardo/issues/269> · <output locale di `claude --help`>

#### Filosofia 2 — HCT/material-color-utilities: l'unica davvero 'AA by construction' contro hex fissi, e deterministica

Garanzia documentata verbatim in hct.ts: "A difference of 40 in HCT tone guarantees a contrast ratio >= 3.0, and a difference of 50 guarantees a contrast ratio >= 4.5" — perché il tone è L* CIELAB, lineare rispetto alla luminanza WCAG. Per neutri fissi il ricettario è banale e senza AI: calcola una volta (offline, per preset) il tone di ogni neutro; a runtime `Hct.fromInt(primary); hct.tone = toneNeutro − 50` → passa AA per costruzione, hue invariata, chroma ridotta automaticamente se fuori gamut sRGB (HctSolver). @material/material-color-utilities: 0.4.0, ultimo publish gen 2026, ~870k download/mese — il più adottato e mantenuto dei tre. Contro: garanzia conservativa (spesso scurisce più del minimo necessario), nessun MCP ufficiale, API 0.x.

**Rilevanza per la Site Factory:** Se l'obiettivo è eliminare il proponi-e-verifica dalla DERIVAZIONE (non dalla scelta estetica), questa è la via più solida: 20 righe deterministiche in lib/, bound di tone pre-calcolati per i 6 preset, zero chiamate AI e zero MCP. La scelta creativa di hue/chroma resta al modello; la conformità diventa matematica.

**Fonti:** <https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/hct/hct.ts> · <https://github.com/material-foundation/material-color-utilities> · <registry npm (npm view @material/material-color-utilities)>

#### Filosofia 3 — apcach in modalità WCAG: il fit concettuale perfetto per 'Scurisci finché passa', ma il pacchetto è fermo dal 2023

apcach compone il colore A PARTIRE dal contrasto: `apcach(crToBg("#E8E8E8", 4.5, "wcag"), chroma, hue)` → colore OKLCH esattamente al ratio richiesto contro un hex FISSO, preservando chroma e hue (searchDirection auto/darker/lighter; maxChroma() per il clamp di gamut). È esattamente il contrario dell'attuale fixUntilPass in lib/wcag.ts, che scala i canali RGB verso nero/bianco a passi del 2% — desaturando e derivando la tinta. Però: versione 0.6.4, ultimo publish nov 2023 (2,5+ anni fermo), ~2.300 download/mese, e caveat documentato "apcach always returns a result even if the color doesn't exist in any color space".

**Rilevanza per la Site Factory:** Per il bottone «Scurisci finché passa»: prendere l'IDEA, non la dipendenza. Riscrivere fixUntilPass come binary search sulla L in OKLCH a C,H costanti, verificata con la matematica WCAG già presente in wcag.ts/check-contrast.mjs (che già sa leggere oklch) = risultato apcach-equivalente in ~30 righe, zero dipendenze nuove, gate invariato.

**Fonti:** <https://github.com/antiflasher/apcach> · <registry npm (npm view apcach)> · </Users/mattia/Claude Projects/Site-factory/site-factory-editor/lib/wcag.ts (fixUntilPass attuale)>

#### Confronto sintetico delle tre filosofie sul caso Site Factory

Leonardo (ratio-target): dichiari i ratio, ottieni scale complete multi-stop con contrast riportato; forte per generare l'intero sistema di varianti (hover, accent-strong, .section-dark) in un colpo; debole sul background fisso (risolto, non preservato) e interpolazione che può spostare la hue tra i key colors. HCT (tone-based): garanzia matematica contro qualsiasi sfondo di cui conosci il tone, deterministico, mantenutissimo; debole per scale espressive multi-key e conservativo sul minimo. apcach (compose-from-contrast): fit esatto al ratio contro hex fissi preservando chroma/hue; debole perché non mantenuto e senza guardrail di gamut. Nessuno dei tre elimina il gate: Leonardo per il gap del background risolto, HCT per l'over-shoot conservativo (innocuo), apcach per i colori inesistenti.

**Rilevanza per la Site Factory:** Architettura consigliata per lo step palette: (a) derivazione deterministica AA-by-construction in lib/ (HCT o binary search OKLCH) per accent-strong e correzioni — sostituisce fixUntilPass; (b) opzionale, leonardo-mcp dietro --strict-mcp-config per la parte esplorativa/generativa del modello nella fabbrica offline di preset; (c) gate check-contrast.mjs invariato come autorità finale. Così metà della skill smette di proporre hex a mano senza riprogettare nulla.

**Fonti:** <https://raw.githubusercontent.com/adobe/leonardo/main/packages/contrast-colors/README.md> · <https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/hct/hct.ts> · <https://github.com/antiflasher/apcach>

### UIClip come scorer locale di qualità UI: verificare se pesi e codice del modello (paper arXiv 2404.12500, UIST'24 CMU/Apple, addestrato su ~2,3M UI) sono pubblici su HuggingFace/GitHub, il costo di inferenza su Apple Silicon, e quanto il modello trasferisce dal dominio mobile-UI agli screenshot full-page di siti vetrina desktop. Censire anche eventuali successori 2025-26 di UI-quality scoring scaricabili in locale.


#### Pesi UIClip pubblici su HuggingFace, licenza MIT, con codice d'inferenza nel model card

I pesi sono rilasciati dall'org 'biglab' (CMU) su HuggingFace in 3 varianti; quella consigliata e più scaricata è uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs (0.2B parametri, CLIP ViT-B/32, input 224px, licenza MIT, ~3.5k download). Non esiste un repo GitHub standalone: il 'codice' è lo snippet nel model card (transformers: AutoProcessor + AutoModelForZeroShotImageClassification — si embedda descrizione e screenshot, si normalizza, dot-product = score). Anche i dataset di training sono pubblici (jitteredwebsites-merged-224-paraphrased 2.47M campioni, uiclip_human_data_hf). Nota dal paper: la variante 'webpairs' (senza human pairs) ha l'accuracy più alta in assoluto (75.12%), quindi vale la pena confrontare entrambe.

**Rilevanza per la Site Factory:** Il prerequisito è soddisfatto: si può integrare oggi come scorer locale nella fabbrica offline con ~20 righe di Python, senza costi API e con licenza compatibile con uso commerciale interno.

**Fonti:** <https://huggingface.co/biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs> · <https://huggingface.co/biglab> · <https://uimodeling.github.io/uiclip/>

#### Il timore del transfer mobile→desktop è rovesciato: UIClip è addestrato soprattutto su SITI WEB

Il 99.9% del training (dataset JitterWeb) sono 2.3M screenshot da ~300k pagine web reali (URL dal corpus MC4), catturate a viewport desktop, tablet e mobile, degradate con 6 famiglie di 'jitter' CSS (colori, font-size, contrasto testo, margini/padding, rimozione elementi, layout flow). La parte mobile-app (BetterApp, da VINS/Rico) è solo 892 coppie umane. Il paper dichiara anzi il problema opposto: l'accuracy cala sulle vere app mobile (57.89%) rispetto alle schermate sintetiche web-like (67.65%). Il dominio nativo del modello è quindi proprio lo screenshot di pagina web, incluse le landing desktop.

**Rilevanza per la Site Factory:** Per la Site Factory il fit di dominio è migliore del previsto: screenshot full-page dei siti vetrina Astro sono vicini alla distribuzione di training. E i difetti che il modello sa riconoscere (contrasto rotto, spacing sballato, colori incoerenti) sono esattamente ciò che può andare storto in un nuovo preset/palette.

**Fonti:** <https://arxiv.org/html/2404.12500v1> · <https://arxiv.org/abs/2404.12500>

#### Come si usa in pratica: prompt 'ui screenshot. well-designed. {caption}' + sliding window per pagine lunghe

Lo score si ottiene prependendo alla caption il prefisso 'ui screenshot. well-designed. ' e calcolando la similarità testo-immagine. Per screenshot non quadrati il paper prescrive: resize col lato corto a 224px, poi finestre 224×224 equispaziate lungo il lato lungo (⌊d/224⌋+1 finestre) e media degli embedding. Caveat forte: a 224px di larghezza il testo è illeggibile — il modello giudica la gestalt (colore, contrasto, densità, layout), non la microtipografia; e la media delle finestre diluisce i difetti localizzati. Per una single-page da ~6000px conviene quindi scorare anche per-sezione (screenshot di ogni sezione separatamente) oltre che full-page, così un difetto in una sezione non viene mediato via.

**Rilevanza per la Site Factory:** Ricetta d'integrazione diretta per la fabbrica offline: dopo il render Astro, screenshot per-sezione (già prodotti per l'image-critic) + score UIClip con caption tipo 'landing page for a renovation company'. Ranking per-sezione più sensibile del full-page.

**Fonti:** <https://arxiv.org/html/2404.12500v1> · <https://huggingface.co/biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs>

#### Costo d'inferenza su Apple Silicon: effettivamente gratis e deterministico

Non esistono benchmark pubblicati di UIClip su M-series, ma l'ancora è solida: è un CLIP ViT-B/32 (0.2B parametri totali, il visual encoder è la parte piccola), e la famiglia MobileCLIP di Apple documenta 3–15ms per encoder di classe simile o superiore su un iPhone 12 Pro Max — un Mac M-series via PyTorch/MPS o Core ML sta comodamente sotto. Una pagina lunga = 5–10 finestre da 224px → decine di millisecondi per sito, centinaia di varianti al minuto, RAM < 1GB. Essendo un forward pass puro, lo score è deterministico e riproducibile: stessa immagine + stessa caption = stesso numero, requisito che nessun giudizio LLM soddisfa.

**Rilevanza per la Site Factory:** Soddisfa in pieno il ruolo di pre-filtro numerico: rankare decine di combinazioni preset×palette×variante in secondi, senza consumare sessioni Claude, con numeri confrontabili tra run della fabbrica offline.

**Fonti:** <https://machinelearning.apple.com/research/mobileclip> · <https://github.com/apple/ml-mobileclip> · <https://huggingface.co/biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs>

#### Limite d'uso corretto: ottimo per 'rotto vs sano', debole per rankare due design entrambi buoni

UIClip è addestrato a preferire la versione pulita rispetto alla stessa pagina degradata con jitter CSS: eccelle come detector di regressioni/difetti, non come giudice estetico fine. Segnali dal paper e dal follow-up DesignPref (CMU/Apple, nov 2025): accordo tra designer umani bassissimo (Krippendorff α=0.37 in BetterApp, α=0.25 in DesignPref), accuracy UIClip 73–75% su coppie con verdetto umano, e i modelli personalizzati di DesignPref si fermano a ~60% — segno che sopra una certa soglia di qualità il ranking è preferenza soggettiva, non misura. Nota utile: GPT-4V come scorer faceva 51.6% (caso), quindi UIClip resta molto meglio di un VLM generico usato a freddo come giudice numerico.

**Rilevanza per la Site Factory:** Nella fabbrica offline va posizionato come GATE (scartare varianti sotto soglia, ordinare grossolanamente), non come sostituto del critico visivo Claude né dell'audit umano: la scelta finale tra due preset entrambi competenti resta a valle. Calibrare la soglia su coppie note buone/rotte dei propri render.

**Fonti:** <https://arxiv.org/html/2404.12500v1> · <https://arxiv.org/html/2511.20513>

#### Successore 2026 scaricabile: reward model Apple 'ml-rldf' (UIClip-init, addestrato su feedback di designer su UI web)

Il follow-up diretto è 'Improving User Interface Generation Models from Designer Feedback' (Wu et al., Apple, arXiv 2509.16779, pubblicato 2026): reward model inizializzato dai pesi UIClip e raffinato su 1.460 annotazioni di 21 designer (commenti, sketch, revisioni — non solo ranking) raccolte su UI WEB generate in HTML+Tailwind. Repo pubblico github.com/apple/ml-rldf: 4 varianti di reward model (ranking/comment/sketch/revision) + dataset; i pesi si scaricano dal CDN Apple con LICENSE_MODEL dedicata (termini da verificare per uso commerciale, non è chiaramente MIT). Stessa interfaccia di UIClip: screenshot + descrizione → score. È il candidato 'versione migliorata' più concreto trovato; non sono emersi altri scorer UI locali 2025-26 con pesi pubblici.

**Rilevanza per la Site Factory:** Se la licenza modello lo consente, è un drop-in upgrade di UIClip già orientato a UI web moderne (Tailwind-style) e a giudizi di designer veri: da benchmarcare fianco a fianco con UIClip sul dominio Site Factory.

**Fonti:** <https://arxiv.org/html/2509.16779> · <https://github.com/apple/ml-rldf>

#### Attenzione alla collisione di nomi: 'Jl-wei/uiclip-vit-base-patch32' è un ALTRO modello, academic-only

Su HuggingFace esiste Jl-wei/uiclip-vit-base-patch32, che NON è il UIClip di CMU/Apple: è stato rinominato GUIClip dal suo autore (paper arXiv 2405.00145, un CLIP per il dominio GUI addestrato su immagini promozionali di app), e il suo README dichiara esplicitamente 'the model can only be used for academic purpose'. Chi cerca 'uiclip' su HF lo trova per primo tra i risultati fuori dall'org biglab e rischia di scaricare il modello sbagliato con la licenza sbagliata.

**Rilevanza per la Site Factory:** Per la Site Factory (uso commerciale di agenzia) vanno usati SOLO i checkpoint dell'org 'biglab' (MIT). Da annotare nel registry/skill della fabbrica offline per evitare che un agente peschi il modello omonimo con licenza accademica.

**Fonti:** <https://huggingface.co/Jl-wei/uiclip-vit-base-patch32/blob/main/README.md> · <https://huggingface.co/biglab>

#### Ecosistema 2025 di valutazione web-design: niente altri scorer locali, ma materiale per potenziare il critico Claude

Il censimento non ha trovato altri modelli di UI-quality scoring 2025-26 con pesi scaricabili oltre a biglab/UIClip e apple/ml-rldf. Il campo si è spostato su MLLM-as-judge con checklist: ArtifactsBench (Tencent, luglio 2025) valuta artefatti web renderizzati con screenshot temporali + giudice multimodale guidato da checklist per-task, dichiarando 94.4% di consistenza di ranking con WebDev Arena e ~91% di accordo pairwise con esperti umani — la metodologia 'checklist fine-grained per task' è la parte trasferibile. UICrit (Berkeley, UIST 2024) rilascia 3.059 critiche testuali + rating di designer esperti su 983 UI: usate come few-shot migliorano del 55% la qualità del feedback di design generato da LLM.

**Rilevanza per la Site Factory:** Due upgrade a costo zero per il critico visivo già previsto (che gira su Claude Max, non su API): (a) strutturarlo a checklist per-sezione stile ArtifactsBench invece che a giudizio olistico; (b) iniettare esempi UICrit come few-shot per critiche più concrete. UIClip fa il pre-filtro numerico, il critico Claude il giudizio ricco.

**Fonti:** <https://arxiv.org/html/2507.04952v2> · <https://arxiv.org/html/2407.08850v2> · <https://arxiv.org/html/2510.15306v1>

### 'Claude Design' di Anthropic (update giugno 2026, emerso solo da snippet): cosa è concretamente, come funzionano l'import e il 'lock' di un design system e il sync bidirezionale con Claude Code, se è disponibile sotto piano Max senza API a pagamento, e se può ospitare il ciclo della fabbrica offline (proposta preset → render → critica) o almeno la libreria di preset lockata.


#### Claude Design è reale: prodotto Anthropic Labs (aprile 2026), incluso nel piano Max senza API a pagamento

Lanciato il 17 aprile 2026 come research preview di Anthropic Labs: chat a sinistra + canvas a destra su claude.ai/design e nella sidebar dell'app desktop. Genera design, prototipi interattivi, slide, landing page; export in HTML autonomo, PDF, PPTX, zip, più connettori (Canva, Vercel, Replit, Miro, Wix...). Powered by Opus 4.7. Incluso senza costo extra in Pro, Max, Team ed Enterprise (in Enterprise è off di default). Nessuna API key richiesta: gira sul login claude.ai, quindi è compatibile col vincolo 'niente API Anthropic a pagamento' della Site Factory. Il rischio 'feature immaginata' è escluso: pagina prodotto, help center e blog ufficiali confermano tutto.

**Rilevanza per la Site Factory:** Entra nel budget a costo zero: è già dentro l'abbonamento Max di Mattia. Qualunque uso nella fabbrica offline non viola la regola n.4 del progetto (no ANTHROPIC_API_KEY).

**Fonti:** <https://www.anthropic.com/news/claude-design-anthropic-labs> · <https://claude.com/product/design> · <https://support.claude.com/en/articles/14604416-get-started-with-claude-design>

#### Update 17 giugno 2026: import di design system con self-check automatico dell'output

L'update introduce: (1) import di uno o più design system da repo GitHub, file di design, upload raw o codebase locale; (2) una volta importato, Claude costruisce con quei componenti e VERIFICA il proprio output contro il design system, auto-correggendo i mismatch prima di mostrare il risultato — un mini-loop genera→critica→correggi interno; (3) canvas editing WYSIWYG (drag, resize, align, annotazioni che viaggiano fino a Claude Code); (4) handoff diretto a Claude Code con contesto già caricato (componenti usati, layout, annotazioni — niente screenshot-e-ricostruisci); (5) supporto a più design system contemporanei per progetto. Snapshot statico: l'import non osserva il repo, va rilanciato dopo ogni modifica a componenti/token.

**Rilevanza per la Site Factory:** Il self-check contro il design system importato è concettualmente lo stesso pattern del critico visivo della Site Factory — ma interno, opaco e non configurabile con la rubrica anti-slop a 24 punti. Utile come primo filtro, non sostituisce il critico proprietario.

**Fonti:** <https://claude.com/blog/claude-design-stays-on-brand-for-daily-work> · <https://support.claude.com/en/articles/14604416-get-started-with-claude-design> · <https://chatforest.com/builders-log/claude-design-june-2026-design-system-imports-code-sync-token-fix-builder-guide/> · <https://blog.vibecoder.me/claude-design-system-sync-code-handoff>

#### Il 'lock' del design system è una permission SOLO Enterprise — su Max non esiste (e non serve)

Il 'lock' emerso dagli snippet è la permission 'Claude Design Admin' configurabile via custom roles SOLO sul piano Enterprise: chi ha 'Can manage' può pubblicare un design system per tutta l'org, impostarlo come default dei nuovi progetti ed eliminarlo; gli altri membri possono usare i design system pubblicati ma non pubblicare/cancellare. Sul piano Team non c'è restrizione granulare equivalente; su Max (individuale) non c'è organizzazione, quindi il lock formale non è disponibile. Per un'agenzia mono-operatore il punto è però irrilevante: il controllo della libreria resta l'audit umano già previsto dalla strategia ibrida. Le permission impiegano fino a 15 minuti ad applicarsi.

**Rilevanza per la Site Factory:** Ridimensiona l'ipotesi iniziale: il lock non è la feature che sposta la libreria preset su Claude Design sotto Max. La 'lockatura' della libreria per la Site Factory resta il git repo + audit umano, che è già più forte.

**Fonti:** <https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans> · <https://claude.com/blog/claude-design-stays-on-brand-for-daily-work>

#### Sync bidirezionale con Claude Code confermato di prima mano: il tool DesignSync è già nel Claude Code installato (2.1.206)

Il flusso pubblico: /design-sync (da Claude Code v2.1.181+) fa pull del design system dalla codebase verso Claude Design e push dello stato implementato indietro; il comando complementare /design crea/edita/sincronizza interi progetti design dal terminale. Evidenza diretta: nell'ambiente di Mattia (binario /Users/mattia/.local/share/claude/versions/2.1.206) esiste il tool nativo DesignSync che legge/scrive 'design-system projects' su claude.ai 'through the user's claude.ai login', con metodi list/get/create_project, finalize_plan (piano di scrittura approvato dall'utente), write_files/delete_files. Nessuna API key: opera sul login Max. Limite: sync a snapshot, mai wholesale-replace (incrementale, un componente per volta).

**Rilevanza per la Site Factory:** Conferma operativa che l'integrazione repo↔Claude Design funziona oggi, dalla macchina di Mattia, sotto login Max. Il canale tecnico per pubblicare la libreria preset esiste già ed è pronto all'uso.

**Fonti:** <https://support.claude.com/en/articles/14604416-get-started-with-claude-design> · <https://blog.vibecoder.me/claude-design-system-sync-code-handoff> · <https://claude.com/product/design>

#### Dentro /design-sync c'è già un ciclo render→grade automatico (evidenza dal binario), ma orientato alla fedeltà del sync, non alla qualità estetica

Dalle stringhe del binario 2.1.206: la skill costruisce una dir locale .design-sync/ con preview per componente (.tsx compilate via esbuild), riconosce due 'shape' di design system (storybook — con reference build sb-reference — e package React), renderizza ogni componente in card HTML con marker <!-- @dsCard group="…" --> e manifest _ds_manifest.json, poi esegue un ciclo di validazione con grading (compare/<nome>.grade.json, .render-check.json con contatori total/bad/thin/variantsIdentical/iterations, check deterministici tipo GRID_OVERFLOW) e un sistema di learnings/NOTES.md che accumula conoscenza tra i run. È letteralmente proposta→render→verifica→correzione in loop — ma giudica 'la preview rappresenta fedelmente il componente?', non 'questo design è bello?'.

**Rilevanza per la Site Factory:** Pattern di riferimento pregiato per la fabbrica offline della Site Factory: il meccanismo grade-key + render-check + learnings è un'architettura collaudata da copiare per il critico visivo dei preset (render /anteprima/{preset} → screenshot → grade JSON → rubrica). Da studiare come design, anche senza adottare il prodotto.

**Fonti:** <https://support.claude.com/en/articles/14604416-get-started-with-claude-design> · <https://chatforest.com/builders-log/claude-design-june-2026-design-system-imports-code-sync-token-fix-builder-guide/>

#### Fit con la libreria preset: possibile come CATALOGO VISIVO via card HTML, ma la pipeline automatica è tarata su React — Astro non è una shape supportata

La pipeline automatica di /design-sync rileva shape 'storybook' e 'package' (componenti React/.tsx; il manifest d'import documentato usa "framework": "react"); nessuna fonte documenta supporto Astro o CSS-token puri, e i blogger segnalano rischio drift con 'logica di rendering custom o framework non standard'. Però il progetto design-system su claude.ai è in fondo una collezione di file HTML statici con marker @dsCard (il tool DesignSync accetta progetti hand-authored): la Site Factory può generare le preview reali (15 sezioni × 6 preset, build Astro statica già esistente) e pubblicarle come card raggruppate per preset. Risultato: catalogo navigabile/condivisibile della libreria e design system importabile nei progetti Claude Design.

**Rilevanza per la Site Factory:** La libreria preset NON si sposta su Claude Design (la fonte di verità resta global.css + presets.ts nel repo), ma una sua proiezione HTML può viverci come vetrina e come base per far generare a Claude Design proposte on-brand. Costo: uno script di export dalla build Astro, fattibile in poche ore.

**Fonti:** <https://mikekwal.com/blog/claude-design-system-import/> · <https://chatforest.com/builders-log/claude-design-june-2026-design-system-imports-code-sync-token-fix-builder-guide/> · <https://blog.vibecoder.me/claude-design-system-sync-code-handoff>

#### Può ospitare il ciclo della fabbrica offline? No come motore, sì come generatore di proposte: fedeltà 50-75%, 4-7 min/prompt, editing limitato

Le review hands-on (giugno-luglio 2026) convergono: fedeltà al brand/design system stimata 50–75% ('abbastanza vicino a colpo d'occhio, non abbastanza da fidarsi come rappresentazione di produzione'), generazione lenta (~4–7 minuti a prompt), editing canvas limitato a bordi/colori/font/margini (per il resto si torna alla chat), elementi interattivi a volte rotti. È esplicitamente consigliato per la fase esplorativa — 'uccidere in fretta le idee cattive e validare le buone' — non per output di produzione. Per la Site Factory: il ciclo proposta→render→critica→audit resta nel repo (renderer Astro + critici claude -p + rubrica 24 punti, tutti già deterministici e proprietari); Claude Design entra a monte, come sorgente di direzioni estetiche nuove ('design explorations' multiple sul design system importato) da tradurre poi a mano in token di preset.

**Rilevanza per la Site Factory:** Risponde alla domanda centrale della ricerca: non cambia dove vive la libreria né sostituisce il critico visivo; aggiunge un generatore di riferimenti/varianti a costo zero per lo step 'l'AI propone nuovi preset partendo da riferimenti di qualità'.

**Fonti:** <https://uxpilot.ai/blogs/claude-design-review> · <https://chatforest.com/builders-log/claude-design-june-2026-design-system-imports-code-sync-token-fix-builder-guide/> · <https://claude.com/product/design>

#### Attenzione alla quota: da fine maggio 2026 Claude Design drena lo STESSO pool di Claude Code — rischio per la pipeline claude -p

Dal 27–28 maggio 2026 Claude Design non ha più budget separato: condivide la quota (finestra 5h + cap settimanale) con chat, Claude Code e Cowork. Gira su Opus 4.7, il modello più token-hungry: segnalazioni reali di un singolo prompt che consuma il 20–65% della finestra 5h, un utente Pro fuori quota in 36 minuti/5 prompt, un Max 20x passato dal 10% a oltre 90% di utilizzo in pochi scambi sul canvas. L'update di giugno dichiara 'meno token per generazione', ma il principio resta. Prezzi correnti: Pro $20/mese, Max 5x $100/mese, Max 20x $200/mese, Team Standard $20/utente, Team Premium $125/utente. Ogni sessione di design sottrae capacità alla pipeline produttiva (context-enricher, palette, copy, critici) che gira via claude -p sullo stesso login Max.

**Rilevanza per la Site Factory:** Vincolo operativo concreto: usare Claude Design SOLO nella fabbrica offline (sessioni esplorative pianificate, magari in orari senza run pipeline), mai a runtime per-cliente, o rischia di far fallire i run claude -p dell'editor per quota esaurita.

**Fonti:** <https://pasqualepillitteri.it/en/news/3673/claude-design-shares-usage-limits-claude-ai-claude-code> · <https://uxpilot.ai/blogs/claude-design-review> · <https://support.claude.com/en/articles/14604416-get-started-with-claude-design>

### Quadro legale italiano aggiornato per la fabbrica di riferimenti: analizzare la legge 132/2025 su AI e diritto d'autore (obblighi su input e tutela degli output AI), cercare giurisprudenza 2015-2026 su copia/imitazione di web design (oltre Trib. Bari 1998 e Kiko v. Wycon) e confermare il perimetro TDM ex art. 70-quater l.d.a. con relativi opt-out. Usare il MCP legal-it in casa (Normattiva, Cassazione, cite_law) più fonti web.


#### L. 132/2025 (in vigore dal 10/10/2025): l'output AI è protetto solo se c'è lavoro intellettuale umano documentabile

L'art. 25 c.1 lett. a) della legge 132/2025 riscrive l'art. 1 l.d.a.: sono protette le opere dell'ingegno «umano»... «anche laddove create con l'ausilio di strumenti di intelligenza artificiale, purché costituenti risultato del lavoro intellettuale dell'autore» (testo vigente verificato su Normattiva). Il contenuto generato interamente dall'AI senza apporto creativo umano NON gode di tutela autorale. È la prima codificazione italiana del principio: l'ausilio AI è lecito, ma la titolarità nasce dalla curatela umana.

**Rilevanza per la Site Factory:** I preset, le varianti e i blueprint prodotti dalla fabbrica offline sono opponibili a terzi (es. concorrenti che copiano i siti ConsulBuild) solo se l'audit umano è un contributo creativo tracciabile, non un semplice timbro. Azione concreta: loggare per ogni preset/variante le decisioni umane (selezioni, correzioni, motivazioni di scarto) — quel log è insieme QA e prova di titolarità.

**Fonti:** <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2025-09-23;132~art25> · <https://www.osservatorio-ip.it/2025/10/02/intelligenza-artificiale-e-diritto-dautore-la-legge-132-2025-traccia-i-confini-della-nuova-creativita-umana/>

#### Nuovo art. 70-septies l.d.a.: l'ingest di riferimenti via AI è lecito SOLO dentro il perimetro TDM (70-ter/70-quater)

L'art. 25 c.1 lett. b) L. 132/2025 introduce l'art. 70-septies l.d.a.: riproduzioni ed estrazioni «attraverso modelli e sistemi di intelligenza artificiale, anche generativa» sono consentite solo in conformità agli artt. 70-ter (ricerca scientifica — non applicabile a un'agenzia commerciale) e 70-quater (TDM generale). Il 70-quater, verificato nel testo vigente, pone tre condizioni: (1) accesso legittimo alle opere (no paywall aggirati, no login violati); (2) uso non «espressamente riservato» dai titolari (opt-out); (3) le copie si conservano «solo per il tempo necessario ai fini dell'estrazione». Un'agenzia NON è organismo di ricerca ex 70-ter c.4-5 (influenza determinante di impresa commerciale).

**Rilevanza per la Site Factory:** È la base legale dell'intera fabbrica di riferimenti. Regole operative: verifica opt-out PRIMA di ogni ingest; distillare dalle screenshot le feature astratte (token, proporzioni, pattern) e poi cancellare le copie — niente libreria permanente di screenshot altrui; ingest solo da pagine pubblicamente accessibili.

**Fonti:** <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1941-04-22;633~art70quater> · <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1941-04-22;633~art70ter> · <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1941-04-22;633~art70septies>

#### Scraping in violazione dell'opt-out è ora REATO: art. 171 c.1 lett. a-ter l.d.a. + aggravante penale per uso di AI

L'art. 26 c.3 L. 132/2025 inserisce nell'art. 171 l.d.a. la lettera a-ter: è punito chi «riproduce o estrae testo o dati da opere o altri materiali disponibili in rete o in banche di dati in violazione degli articoli 70-ter e 70-quater, anche attraverso sistemi di intelligenza artificiale» (pena: multa; testo vigente verificato). Lo stesso art. 26 introduce l'aggravante comune art. 61 n. 11-undecies c.p. (fatto commesso con AI quale mezzo insidioso). La violazione dell'opt-out TDM passa quindi da inadempimento civilistico a fattispecie penale — inedito in Europa.

**Rilevanza per la Site Factory:** Il check opt-out del crawler della fabbrica non è un nice-to-have: deve essere deterministico, bloccante e loggato (il log è prova di diligenza). Ogni URL ingerito deve avere in audit-trail l'esito della verifica robots.txt/TDMRep alla data dell'accesso.

**Fonti:** <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2025-09-23;132~art26> · <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1941-04-22;633~art171>

#### Come si esprime l'opt-out: machine-readable E machine-actionable (OLG Hamburg, Kneschke v LAION, 5 U 104/24, 10/12/2025)

Prima pronuncia d'appello europea sul TDM per AI: la raccolta di foto per il dataset LAION-5B è stata giudicata coperta dalle eccezioni TDM (art. 3 e 4 DSM, gemelle dei nostri 70-ter/quater). Sulla riserva: non basta che il testo sia leggibile da macchina, deve essere interpretabile in modo che un processo automatico possa bloccare il TDM; riserve in linguaggio naturale nei ToS (che nemmeno nominavano il TDM) non bastavano nel 2021. MA il criterio è dinamico — «state of the art al momento dell'uso»: nel 2026, con LLM capaci di leggere ToS, riserve testuali chiare potrebbero diventare opponibili. L'AI Act art. 53(1)(c) impone comunque ai provider GPAI policy di rispetto degli opt-out. Vocabolari standard (TDMRep W3C) ancora in via di consolidamento.

**Rilevanza per la Site Factory:** Il crawler deve rispettare come minimo: robots.txt, protocollo TDMRep, meta tag noai/noimageai; prudenzialmente anche riserve testuali esplicite e visibili nei ToS (dato il criterio evolutivo, giudicheranno con lo stato dell'arte 2026, non 2021). Sentenza tedesca su norme UE identiche: persuasiva ma non vincolante in Italia.

**Fonti:** <https://legalblogs.wolterskluwer.com/copyright-blog/laion-round-2-machine-readable-but-still-not-actionable-the-lack-of-progress-on-tdm-opt-outs-part-1/> · <https://www.dlapiper.com/en/insights/blogs/mse-today/2025/robert-kneschke-v-laion>

#### GEMA v OpenAI (LG München I, 42 O 14139/24, 11/11/2025): il TDM NON copre memorizzazione e output riconoscibili — fondamento normativo del guardrail «distanza dalla fonte»

Il tribunale di Monaco ha ritenuto che l'eccezione TDM copre la fase di raccolta/preparazione dei dati ma NON la memorizzazione di opere nel modello né la loro riproduzione negli output: «un'interpretazione favorevole all'innovazione che copra le riproduzioni nel modello è vietata dal chiaro tenore letterale». Nove testi di canzoni riprodotti da ChatGPT = violazione, con inibitoria, danni e penali fino a 250.000 euro per violazione; la lunghezza/complessità dei testi escludeva la casualità. Sentenza non definitiva (appello atteso), tedesca ma su norme di derivazione UE identiche agli artt. 70-ter/quater italiani.

**Rilevanza per la Site Factory:** Conferma che la liceità della raccolta NON sana un output troppo vicino alla fonte: se un preset/variante generato è riconoscibilmente derivato da un riferimento ingerito, si esce dall'ombrello TDM. Il critico visivo della fabbrica deve avere una dimensione bloccante «somiglianza col riferimento» (confronto screenshot-vs-output), speculare alla rubrica anti-slop.

**Fonti:** <https://merlin.obs.coe.int/article/10428>

#### Giurisprudenza italiana 2015-2026 sulla copia di web design: vuoto sostanziale — il quadro resta Trib. Bari 1998 + analogia Kiko (Cass. 8433/2020)

Verifica su fonti specialistiche e full-text Cassazione 2020+ (Italgiure via MCP): non esistono pronunce edite recenti specifiche sul look&feel di siti web; una fonte specialistica lo dichiara espressamente («manca giurisprudenza contemporanea» dopo Trib. Bari 1998, che tutelava il sito come opera creativa se originali accesso/organizzazione/consultazione). Il precedente forte per analogia resta Cass. 8433/2020 (Kiko v Wycon): un progetto d'ambiente è opera dell'architettura (art. 2 n. 5 l.d.a.) se ha progettazione unitaria, schema definito e visivamente apprezzabile, chiara chiave stilistica, impronta personale — senza necessità che i singoli elementi siano nuovi: conta la combinazione originale. Un design system coerente di un sito è l'equivalente digitale più prossimo.

**Rilevanza per la Site Factory:** Il rischio va calibrato sui principi, non su precedenti puntuali: il singolo layout/pattern ha soglia di tutela alta (creatività da provare caso per caso), ma l'identità visiva complessiva e distintiva di un sito può essere opera protetta. Per la fabbrica: estrarre pattern atomici è a rischio basso; replicare la «chiave stilistica» unitaria di un sito specifico è l'area rossa.

**Fonti:** <https://legalfordigital.it/copyright/copyright-sito-web/> · <https://www.ipinitalia.com/concorrenza-sleale/caso-kiko-wycon-la-tutela-del-concept-store-tra-diritto-dautore-e-concorrenza-sleale/> · <https://www.ilcaso.it/sentenze/ultime/27176/stampa>

#### Concorrenza sleale: il rischio reale è la parassitaria (imitazione sistematica di UN concorrente), non il riuso di pattern

Due binari ex art. 2598 c.c.: (1) imitazione servile (n. 1) — rileva solo la riproduzione di forme «superflue, arbitrarie, capricciose» non funzionali, con rischio di confusione sull'origine (giurisprudenza costante, Trib. Milano 2023); i pattern funzionali (griglie, hero, form, processi numerati) sono liberi. (2) Parassitaria (n. 3) — richiede «continuo e sistematico operare sulle orme dell'imprenditore concorrente» (Cass. 2980/2020) su una pluralità di iniziative originali; caso Supreme Italia (Trib. Milano 2020): condannato chi aveva ricalcato l'intero sistema (stile, strategie, comunicazione). Kiko: la «mera somiglianza complessiva» non basta, serve accertare l'originalità effettiva delle iniziative imitate.

**Rilevanza per la Site Factory:** Regola d'oro per la fabbrica, ora fondata su giurisprudenza: ogni preset deve sintetizzare N riferimenti eterogenei (mai clone di un sito), e la pipeline non deve mai seguire nel tempo lo stesso brand/design (è la sistematicità diacronica che fa scattare la parassitaria). Da codificare nel prompt del proponente e nella checklist del critico: «nessun riferimento singolo riconoscibile».

**Fonti:** <https://legalfordigital.it/e-commerce/concorrenza-parassitaria/> · <https://www.ipinitalia.com/concorrenza-sleale/caso-kiko-wycon-la-tutela-del-concept-store-tra-diritto-dautore-e-concorrenza-sleale/>

#### Garante privacy, provv. 329 del 20/05/2024: lo scraping tocca anche il GDPR e i segnali difensivi dei siti pesano contro chi li ignora

Il Garante ha pubblicato la prima nota informativa italiana su web scraping e AI generativa (in G.U. 7/6/2024): raccogliere pagine web è anche trattamento di dati personali (foto, nomi, recensioni, testimonial). Indica ai gestori le contromisure: aree riservate, clausole anti-scraping nei ToS, monitoraggio del traffico, interventi sui bot via robots.txt. Sono misure non obbligatorie per i siti, ma la loro presenza è un segnale: aggirarle compromette sia il «legittimo accesso» richiesto dall'art. 70-quater sia la posizione GDPR dello scraper.

**Rilevanza per la Site Factory:** La fabbrica deve: (a) minimizzare i dati personali nell'ingest (interessa il layout, non le persone — crop/esclusione di volti, nomi, recensioni); (b) trattare i segnali anti-bot come opt-out di fatto; (c) documentare una LIA (legittimo interesse) per la raccolta. Nota: misure pensate per PMI italiane — proprio i clienti ConsulBuild potrebbero adottarle sui siti generati.

**Fonti:** <https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10020316> · <https://legalfordigital.it/copyright/copyright-sito-web/>

### Parere operativo su pubblicità sanitaria per il verticale dentisti/medici: L.145/2018 (commi 525-536), L.175/1992 e Codice deontologico FNOMCeO — cosa possono contenere legittimamente le sezioni GoogleReviews e BeforeAfter, quali diciture footer sono obbligatorie (direttore sanitario, iscrizione all'ordine), e la lista esatta di claim e cortesie vietati (es. 'visita gratuita') da codificare in promesse_vietate e nello slots.json verticale. Via MCP legal-it su fonti primarie.


#### Perimetro vigente (comma 525 post-L.103/2023): il sito medico può contenere SOLO informazione, vietato ogni elemento 'attrattivo e suggestivo' incluse offerte/sconti/promozioni

Testo vigente verificato su Normattiva: le comunicazioni informative di strutture sanitarie private e iscritti agli albi (in qualsiasi forma giuridica, incluse le società ex L.124/2017) possono contenere UNICAMENTE le informazioni dell'art. 2 c.1 D.L. 223/2006 (titoli e specializzazioni, caratteristiche del servizio, prezzo e costi complessivi, con trasparenza e veridicità verificate dall'ordine), «restando escluso... qualsiasi elemento di carattere attrattivo e suggestivo, tra cui comunicazioni contenenti offerte, sconti e promozioni, che possa determinare il ricorso improprio a trattamenti sanitari». La L.103/2023 ha reso cumulativi i requisiti (attrattivo E suggestivo) ma ha esplicitato il divieto di offerte/sconti/promozioni; nota ministeriale 26/10/2023 conferma la lettura. Anche la grafica conta: immagini eccessivamente emotive (sorrisi enfatici, paura) sono considerate suggestive dagli ordini.

**Rilevanza per la Site Factory:** Definisce la 'grammatica' dell'intero blueprint medico: tono informativo, niente CTA promozionali/urgency, niente slot sconti/promo (la sezione Incentives va esclusa dal verticale), e vincola anche l'image-prompter (no volti iper-sorridenti da stock, no pathos). Il copy-critic per questo verticale deve avere un bloccante automatico su qualsiasi lessico promozionale.

**Fonti:** <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2018-01-01;145~art1> · <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2006-01-01;223~art2> · <https://www.studiolegalestefanelli.it/it/approfondimenti/il-dl-n-692023-modifica-le-regole-e-i-divieti-della-pubblicita-sanitaria-cosa-cambia-rispetto-a-prima> · <https://www.odontoiatria33.it/normative/24131/pubblicita-sanitaria-le-precisazioni-del-ministero.html>

#### 'Visita/preventivo gratuito' è VIETATO nel verticale medico: la cortesia di settore della Factory va invertita — lista promesse_vietate

La CCEPS (2019) ha confermato la sospensione (5-6 mesi) di un direttore sanitario per la pubblicità «prima visita, diagnosi, radiografia e preventivo gratuiti»: la gratuità è ammessa solo in 'particolari circostanze' (fini sociali/umanitari), mai come leva di acquisizione pazienti perché genera 'spinte consumistiche'. Lista da codificare in promesse_vietate: prima visita/check-up/consulenza gratuita; preventivo gratuito; 'senza impegno'; sconti, offerte, promozioni, pacchetti, prezzi civetta (caso AGCM 'impianto a 1 euro': prezzo reale 752€/dente, ingannevole); garanzie di risultato ('risultato garantito', 'indolore'); superlativi e comparativi ('i migliori', 'leader') — la comparativa è ammessa solo con indicatori clinici misurabili condivisi dalla comunità scientifica, quindi in pratica da evitare.

**Rilevanza per la Site Factory:** Ribalta la regola 5 del CLAUDE.md ('preventivo/sopralluogo gratuito' consentito come cortesia di settore): nel verticale dentisti/medici è l'esatto contrario e va disattivata a livello di contesto.json/slots.json. La lista sopra è il seed di promesse_vietate del context-enricher e di un gate regex deterministico prima del checkpoint umano.

**Fonti:** <https://www.odontoiatria33.it/normative/17526/visita-e-preventivo-gratuito-la-cceps-conferma-sospensione-per-direttore-sanitario.html> · <https://www.odontoiatria33.it/approfondimenti/13564/l-ordine-di-milano-denuncia-all-agcm-la-pubblicita-dell-impianto-ad-un-euro-senna-e-ingannevole.html> · <https://www.doctor-web.it/recensioni-google-medici-privacy-deontologia/>

#### Sezione GoogleReviews: ripubblicare recensioni sul sito le trasforma in comunicazione sanitaria soggetta al comma 525 — pattern sicuro: rating aggregato + link, niente citazioni cliniche

Le recensioni spontanee su piattaforme terze restano fuori dal controllo della struttura; ma quando la struttura le incorpora nel proprio sito diventano strumento di comunicazione informativa sanitaria soggetto a comma 525 e deontologia. Vietate: recensioni con esiti clinici dichiarati o toni enfatici/celebrativi/emotivi (aspettative non garantibili = ingannevoli/suggestive); recensioni incentivate, comprate o selezionate solo positive; risposte che confermino visite/diagnosi/terapie anche se citate dal paziente (violazione GDPR su dati salute, sanzionabile dal Garante fino a 20M€/4%). Tollerate solo recensioni autentiche generiche di cortesia ('personale gentile, mi sono trovata bene').

**Rilevanza per la Site Factory:** Il componente GoogleReviews per il verticale medico va riprogettato: variante 'badge' con punteggio aggregato + numero recensioni + link al profilo Google (nessun verbatim), oppure quote curate solo generiche filtrate dal critico copy con regola bloccante 'nessun esito clinico, nessun tono enfatico'. Il titolo di sezione non può essere 'storie di successo' o simili.

**Fonti:** <https://www.studiolegaledelliponti.eu/recensioni-on-line-e-pubblicita-sanitaria/> · <https://www.doctor-web.it/recensioni-google-medici-privacy-deontologia/>

#### Sezione BeforeAfter: da escludere dal blueprint medico — prima/dopo considerati promozionali/ingannevoli anche col consenso del paziente

Convergenza di fonti: gli ordini qualificano le foto 'prima e dopo' come tecnica ingannevole e suggestiva se non supportate da informazioni scientifiche che evitino false aspettative (artt. 55-56 Codice deontologico); dottrina legale le ritiene di natura promozionale e non informativa — trasformano il paziente in strumento di marketing e restano contrarie alla correttezza della comunicazione anche con consenso formale; l'IAP (dec. 69/2019) ha censurato immagini 'eccessive ed illusorie'. Sul fronte privacy servono consensi distinti (cura ≠ diffusione immagini per comunicazione: esplicito, libero, specifico per finalità) e il Garante ha già sanzionato un medico per foto sui social senza consenso.

**Rilevanza per la Site Factory:** Decisione di prodotto netta: NON prioritizzare il componente BeforeAfter per il verticale medico/dentisti (resta prezioso per edilizia/ristrutturazioni, dove è nato). Il blueprint medico lo omette; se un cliente lo chiede, checkpoint umano obbligatorio + doppio consenso documentato — di fatto fuori dalla pipeline automatica.

**Fonti:** <https://canellacamaiora.it/mostrare-i-pazienti-online-tra-privacy-deontologia-e-pubblicita-vietata/> · <https://www.studiolegalestefanelli.it/it/approfondimenti/pubblicita-sanitaria-foto-prima-e-dopo-trattamento-sono-ingannevoli>

#### Diciture footer obbligatorie: direttore sanitario (pena sospensione autorizzazione 6-12 mesi), ordine+numero iscrizione, P.IVA, e per le strutture gli estremi dell'autorizzazione regionale

Tre fonti cumulative: (1) L.175/1992 art. 4 c.2: obbligatoria l'indicazione di nome, cognome e titoli del medico responsabile della direzione sanitaria in ogni pubblicità di strutture; art. 5 c.5: l'omissione sospende l'autorizzazione all'esercizio da 6 mesi a 1 anno; TAR e Consiglio di Stato confermano l'obbligo per ogni mezzo rivolto alla collettività indifferenziata (siti web inclusi). Comma 536 L.145/2018: ogni struttura privata deve dotarsi di direttore sanitario che comunica l'incarico all'ordine territoriale. (2) D.Lgs. 70/2003 art. 7 (professioni regolamentate online): ordine di iscrizione + numero, titolo professionale e Stato di rilascio, riferimento alle norme professionali, P.IVA, email, sede, prezzi chiari. (3) Art. 5 c.3 L.175/1992: gli annunci delle strutture devono indicare gli estremi dell'autorizzazione regionale (prassi variabile per regione).

**Rilevanza per la Site Factory:** Il footer del blueprint medico ha slot OBBLIGATORI nuovi: direttore_sanitario (nome+titoli), ordine_e_numero_iscrizione, p_iva, estremi_autorizzazione. Vanno raccolti nel form Tally verticale e resi bloccanti nel gate di copertura del context-enricher: senza direttore sanitario il sito non si builda. È il rischio sanzionatorio più concreto e più facilmente automatizzabile.

**Fonti:** <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1992-01-01;175> · <https://www.odontoiatria33.it/normative/22279/pubblicita-consiglio-di-stato-conferma-obbligo-di-indicare-il-direttore-sanitario.html> · <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-01-01;70~art7>

#### Linee guida FNOMCeO (artt. 55-57) per i siti: requisiti aggiuntivi e divieti che vincolano slots.json — no link/loghi commerciali, statistiche solo da fonti pubbliche, tariffe mai aspetto esclusivo

Letta verbatim la linea-guida FNOMCeO (riproposta dagli ordini ancora a giugno 2026): il sito deve contenere anche estremi di laurea/abilitazione e università, dichiarazione di conformità alla linea-guida, comunicazione del sito all'Ordine provinciale (onere del direttore sanitario per le strutture), dominio registrato IT/UE. Divieti: notizie che ingenerino aspettative illusorie/false/non verificabili, timori infondati o spinte consumistiche; pubblicità personale mascherata da informazione; spazi pubblicitari o link a siti commerciali/farmaceutici; pubblicizzazione o vendita di prodotti/servizi; link ipertestuali solo verso istituzioni (Ministero, ISS, ordini, università, società scientifiche); statistiche sulle prestazioni solo da dati pubblici delle autorità sanitarie. Tariffe pubblicabili ma mai come aspetto esclusivo del messaggio. Raccomandata conformità HONCode.

**Rilevanza per la Site Factory:** Vincoli diretti per il verticale: LogoBar con loghi di partner commerciali è a rischio (ok invece ordini/società scientifiche/convenzioni mutue); vietata una sezione 'numeri' con statistiche di successo proprie non verificabili (il pattern '500 impianti/anno' va sourced o eliminato); i link esterni vanno whitelistati a istituzioni. In positivo: le 'pagine di educazione sanitaria' sono esplicitamente ammesse — ottimo sostituto informativo delle sezioni promozionali.

**Fonti:** <https://ape.agenas.it/documenti/provider/medici_FNOMCEO_pubblicita_dell'informazione_sanitaria_Linee_Guida.pdf> · <https://www.omceopr.it/2026/06/16/pubblicita-dellinformazione-sanitaria-linee-guida/>

#### Enforcement a luglio 2026: sanzioni AGCOM mai entrate in vigore (emendamento DDL 1241 soppresso 4/2025) — il rischio resta disciplinare sugli iscritti + AGCM sulle strutture

L'emendamento al DDL 1241 'prestazioni sanitarie' che dava ad AGCOM poteri sanzionatori (10% del valore della campagna, minimo 10.000€) è stato approvato in Commissione Affari Sociali (marzo 2025) ma soppresso dalla Commissione Bilancio l'8 aprile 2025 su parere del MEF: le sanzioni economiche non sono mai entrate in vigore. Oggi il quadro reale è: (a) procedimento disciplinare degli ordini territoriali ex comma 536 (avvertimento→radiazione; la CCEPS conferma sospensioni per pubblicità gratuita); (b) segnalazione ad AGCOM senza regime dedicato; (c) AGCM/Codice del consumo per pratiche commerciali scorrette delle strutture (prezzi civetta, enfasi sui risultati, omissione rischi, tecnologie vantate ma non usate); (d) sospensione dell'autorizzazione per omessa indicazione del direttore sanitario. Tema politicamente caldo: nuovi tentativi legislativi probabili.

**Rilevanza per la Site Factory:** Il rischio ricade sul cliente (professionista, direttore sanitario, struttura), non sull'agenzia — ma un sito sanzionabile è un cliente perso e un danno reputazionale. Giustifica un gate di compliance dedicato nel verticale (regex promesse_vietate + checklist footer) e una voce di monitoraggio normativo: se il potere sanzionatorio AGCOM rientra in una prossima legge, i siti già pubblicati vanno ri-auditati.

**Fonti:** <https://www.dentaljournal.it/ddl-1241-agcom-pubblicita-sanitaria/> · <https://www.odontoiatria33.it/cronaca/25813/pubblicita-sanitaria-passa-l-emendamento-che-da-poteri-sanzionatori-all-agcom.html> · <https://www.agcm.it/competenze/tutela-del-consumatore/pratiche-commerciali-scorrette/>

#### Safe list: cosa il copy medico PUÒ dire — la mappa sezione-per-sezione del blueprint verticale

Contenuti legittimi (comma 525 + D.L. 223/2006 + linee guida): titoli e specializzazioni verificabili (con enti di rilascio); curriculum e attività certificate; menzione di disciplina non specialistica solo alle condizioni L.175/1992 art. 1 c.4; branche specialistiche con nominativi dei responsabili; caratteristiche del servizio, metodiche diagnostiche/terapeutiche effettivamente utilizzate e attrezzature realmente presenti in studio (la disponibilità effettiva è criterio di veridicità); orari, sedi, modalità di prenotazione, mappa; convenzioni e mutue; tariffe (non esclusive); educazione sanitaria. Mappa per la Factory: Services=branche+responsabili; About=curriculum e titoli; trust bar=iscrizioni/certificazioni (MAI testimonial); Process='il percorso di visita' (sequenza reale, ammessa); CTA='Prenota una visita'/'Richiedi un appuntamento' (mai 'approfitta', 'solo questo mese').

**Rilevanza per la Site Factory:** È lo scheletro della 'grammatica di pagina' per-settore prevista dalla strategia: il blueprint medico si costruisce per sottrazione (via Incentives, BeforeAfter, testimonial) e per sostituzione (educazione sanitaria e percorso di cura al posto di leve promozionali). Ogni slot del nuovo slots.json verticale può citare la fonte normativa del proprio vincolo, rendendo il copy-critic verificabile.

**Fonti:** <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2018-01-01;145~art1> · <https://ape.agenas.it/documenti/provider/medici_FNOMCEO_pubblicita_dell'informazione_sanitaria_Linee_Guida.pdf> · <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1992-01-01;175>

### Widget di prenotazione integrabili in un sito Astro statico servito da Cloudflare Workers static assets: TheFork/Google Reserve e Zenchef per ristoranti, MioDottore per studi medici, Treatwell/Fresha per estetica e parrucchieri. Per ciascuno: modalità di embed (script, iframe, deep-link), vincoli di branding e personalizzazione visiva, costi per l'esercente, implicazioni GDPR/consenso cookie.


#### TheFork: 6 modalità di embed, tutte compatibili con hosting statico; l'iframe è la più ricca ma resta brandizzato TheFork

TheFork documenta pubblicamente 6 opzioni: link testuale, bottone, bottone flottante (tutti deep-link che aprono il modulo in nuova tab), iframe puro, iframe responsive con media query pre-configurate (altezze 840/650/550px per breakpoint), e ibrido iframe+bottone (bottone su mobile per evitare scroll orizzontale). Nessuna dipendenza server: solo HTML/CSS statico, perfetto per Astro su Cloudflare Workers. La personalizzazione visiva è minima: si può stilare il contenitore (classe .thefork) ma il modulo dentro l'iframe è UI TheFork, non ricolorabile con la palette cliente. Esiste anche un repo GitHub ufficiale (thefork-widgets/Iframe-auto-resizer) per l'auto-fit dell'altezza. Il widget richiede solo il link widget del ristorante partner.

**Rilevanza per la Site Factory:** Il BookingCTA per la grammatica ristoranti può includere l'iframe TheFork in un componente Astro statico senza alcun adattamento dell'hosting. Ma la sezione va disegnata accettando che il blocco prenotazione NON erediterà preset/palette: meglio incorniciarlo in un .media-frame con heading e contesto nostri, o preferire la variante deep-link stilata come .btn-primary che eredita il design system al 100%.

**Fonti:** <https://calendarexamples.thefork.com/website-instructions/> · <https://www.theforkmanager.com/en/blog/thefork-tools/download-thefork-booking-widgets-free-and-get-more-bookings>

#### TheFork: widget gratuito e senza commissioni sulle prenotazioni dal proprio sito, ma il ristorante paga abbonamento + commissioni marketplace

Dichiarazione ufficiale TheFork: le prenotazioni ricevute tramite i widget su sito/social sono "free of commission fees", senza costi di installazione, uso o rimozione. Il prerequisito è però essere partner TheFork Manager: piani ~29€/mese (Visibility), ~89€ (Performance), ~159€ (Enterprise) + ~400€ di setup una tantum; le prenotazioni da app/marketplace TheFork pagano commissione per coperto indicizzata sul ticket medio (1,50–2,50€ a 25€ di ticket, fino a 6€ a 80€), più 0,95% + 0,50€ sui prepagamenti. Listino non più pubblico, serve preventivo; fonte terza (Twintable, 2026) stima 8.600–35.000€/anno di costo totale. Prezzi da riconfermare col commerciale TheFork.

**Rilevanza per la Site Factory:** Per la Site Factory il widget in sé è a costo zero e anzi fa risparmiare il cliente (le prenotazioni dal SUO sito non pagano commissione): argomento di vendita forte per il sito vetrina. Il blueprint ristorante può assumere che se il cliente è già su TheFork, l'embed non aggiunge costi; se non lo è, l'abbonamento è una decisione del cliente, non della factory.

**Fonti:** <https://www.theforkmanager.com/en/blog/thefork-tools/download-thefork-booking-widgets-free-and-get-more-bookings> · <https://twintable.io/blog/couts-caches-thefork>

#### Zenchef: embed via SDK script con vera personalizzazione (colore hex, lingua, posizione) e modello zero commissioni

Il widget ZenchefOS (e il gemello Formitable, stesso gruppo) si installa con uno script CDN + un div (ft-widget-b2) prima di </body>: puro client-side, ok su statico. È il più personalizzabile dei quattro: data-color accetta HEX/RGB per allineare il colore primario al brand, data-language include 'it', posizione left/center/right, auto-open con delay, bottone flottante nascondibile, anchor #ft-open per agganciare CTA proprie, eventi JS e API programmatica (FT.open()). Configuratore self-service su sdk.zenchef.com. Modello economico: nessuna commissione per coperto, solo canone (fonti 2026: ~69€/mese Essential, ~119€ Premium; il sito ufficiale elenca piani Reserve/Manage/Grow — prezzi variabili per mercato, da confermare). Attenzione: l'SDK si auto-integra con Google Analytics e Facebook Pixel se rilevati, con flag per disabilitare GTM/GA4.

**Rilevanza per la Site Factory:** Zenchef è il candidato ideale per un BookingCTA nativo nella grammatica ristoranti: l'anchor #ft-open permette di usare i NOSTRI bottoni .btn-primary (design system intatto) che aprono l'overlay Zenchef, e data-color si può riempire dallo slot palette di site.json. I flag disable-GTM/GA4 vanno impostati di default per ridurre la superficie GDPR.

**Fonti:** <https://formitable.com/en/developers/widget/> · <https://sdk.zenchef.com/configure.html?restaurant=357246> · <https://www.zenchef.com/discover-the-zenchef-widget> · <https://restaurantbookingsystem.com/compare/zenchef-pricing/>

#### MioDottore: niente calendario embeddabile — solo bottone HTML deep-link verso il profilo MioDottore (gratuito, forma/colore personalizzabili)

Docplanner/MioDottore offre un generatore di widget nel profilo del professionista che produce codice HTML da incollare nel sito: è un pulsante di prenotazione che porta il paziente all'agenda online sul dominio MioDottore, personalizzabile in forma e colore, completamente gratuito per i professionisti abbonati. Non esiste un calendario embedded documentato pubblicamente: il flusso di prenotazione avviene sempre su MioDottore (2 step). Offrono anche link permanente all'agenda, QR code, widget Instagram/Facebook e autoresponder WhatsApp. L'abbonamento MioDottore PRO ha prezzo solo su preventivo (non pubblico). La prenotazione resta legata al profilo marketplace del medico.

**Rilevanza per la Site Factory:** Per la grammatica studi medici il BookingCTA deve nascere come deep-link, non come embed: bottone .btn-primary nostro con href allo slug MioDottore del cliente (uno slot stringa in site.json), zero JS di terze parti, zero cookie, design system intatto. Il 'widget' MioDottore ufficiale è opzionale e ridondante rispetto a un semplice link stilato da noi.

**Fonti:** <https://help.docplanner.com/s/article/Enhance-your-Visibility-Configure-the-Docplanner-Online-Booking-Links-and-Widgets?language=it> · <https://pro.miodottore.it/blog/dottori/topic/marketing/post/come-consentire-ai-pazienti-di-prenotare-direttamente-da-google-search-e-da-google-maps>

#### Fresha: nessun embed possibile — solo link-out alla pagina Fresha; costi 2026: abbonamento + 20% sui nuovi clienti marketplace

Recensione indipendente 2026 (The Salon Business): la prenotazione online Fresha "cannot be embedded directly into your website" — si aggiunge solo un book button/link che manda il cliente sulla pagina di prenotazione fresha.com, la cui personalizzazione grafica è limitata. Costi 2026: Fresha non è più gratuito — $19,95/mese piano Individual, $14,95/mese per membro prenotabile nel piano Team; 20% di commissione (min $6) solo sui NUOVI clienti arrivati dal marketplace Fresha; fee pagamenti 2,29%+$0,20 in persona, 2,79%+$0,20 online. Prezzi in USD dal mercato USA: verificare i listini EUR per l'Italia. Le prenotazioni da link sul proprio sito non pagano la fee marketplace (cliente 'diretto').

**Rilevanza per la Site Factory:** Per estetica/parrucchieri con Fresha, il blueprint DEVE ripiegare su deep-link: bottone nostro → pagina Fresha. Nessun compromesso visivo dentro la pagina (il salto di dominio avviene dopo il click) e zero implicazioni cookie. Il renderer non ha bisogno di alcun componente embed per questo provider: basta lo slot URL.

**Fonti:** <https://thesalonbusiness.com/fresha-review/>

#### Treatwell: widget "Prenota subito" gratuito multi-canale, ma dettagli tecnici solo in area partner; commissioni 25% primo appuntamento, 0% sui ritorni

Il widget "Prenota subito" è gratuito e funziona su sito web, Facebook, Instagram e Google (Treatwell dichiara una collaborazione con Google per prenotare da Search/Maps). Mostra solo gli slot realmente disponibili sincronizzati con l'agenda Treatwell Pro. La documentazione tecnica di installazione (codice per il sito) sta dietro il portale partner (partnercare.treatwell.com, non accessibile senza login — da verificare con un account partner se è script/iframe o solo link). Prezzi dal listino ufficiale: 25% di commissione sul primo appuntamento di ogni nuovo cliente dal marketplace, 0% sulle prenotazioni dei clienti che ritornano, 2% sui prepagamenti online, contratto minimo 12 mesi, piani Starter e Advanced a canone.

**Rilevanza per la Site Factory:** Per la grammatica beauty il BookingCTA può promettere 'prenotazione in tempo reale' se il cliente ha Treatwell Pro, e le prenotazioni dal sito dei clienti abituali sono a commissione zero — altro argomento di vendita del sito vetrina. Finché il meccanismo esatto dell'embed non è verificato con un account partner, il blueprint deve trattare Treatwell come deep-link con upgrade opzionale a widget.

**Fonti:** <https://www.treatwell.it/partners/prezzi/> · <https://www.treatwell.it/partners/funzionalita/il-widget/> · <https://www.treatwell.it/business-info/prenota-subito/>

#### Reserve with Google non si embedda nel sito: vive su Google Search/Maps via partner (TheFork, MioDottore, Treatwell) — è configurazione GBP, non una sezione

Reserve with Google è un'integrazione end-to-end tra il sistema di prenotazione partner e le superfici Google: il bottone 'Prenota un tavolo'/'Prenota online' appare su Search e Maps, non è un widget installabile su siti terzi. Per i ristoranti arriva automaticamente col pacchetto TheFork Performance (disponibilità in tempo reale, prenotazione scalata da tutti i canali); per i medici MioDottore lo attiva gratuitamente collegando il Profilo Google Business all'agenda MioDottore (il 35% delle prenotazioni avviene fuori orario di studio); Treatwell fa lo stesso per i saloni. In tutti i casi il flusso di prenotazione avviene su Google/piattaforma, mai sul sito del cliente.

**Rilevanza per la Site Factory:** Nessun blueprint deve prevedere una 'sezione Google Reserve': è un deliverable di onboarding (collegare GBP alla piattaforma del cliente), da mettere semmai nella checklist di consegna della factory, non in site.json. Il sito e RwG sono canali paralleli che puntano alla stessa agenda — il BookingCTA del sito non deve duplicare né linkare Google.

**Fonti:** <https://www.theforkmanager.com/en/blog/thefork-tools/maximise-reservations-reserve-google> · <https://pro.miodottore.it/blog/dottori/topic/marketing/post/come-consentire-ai-pazienti-di-prenotare-direttamente-da-google-search-e-da-google-maps>

#### GDPR: deep-link = zero consenso; iframe/script di booking richiedono blocco preventivo — pattern consent-gated implementabile in Astro statico

I deep-link (Fresha, MioDottore, varianti link di TheFork/Treatwell) non caricano nulla di terza parte prima del click: nessun cookie, nessun banner necessario per quel componente. Gli embed attivi (iframe TheFork, SDK Zenchef) caricano invece contenuto di terza parte che può impostare cookie al load: la normativa cookie italiana (Garante) impone il blocco preventivo fino al consenso. Il pattern standard (documentato da iubenda, leader nelle PMI italiane) è deterministico e statico-friendly: iframe con class _iub_cs_activate, src="about:blank" e l'URL reale in data-suppressedsrc; script con type="text/plain"; la CMP ripristina src/type al consenso. Nota: l'SDK Zenchef/Formitable si auto-aggancia a GA4/Facebook Pixel se presenti — va incluso nella categoria marketing della CMP, non solo 'funzionale'.

**Rilevanza per la Site Factory:** Decisione architetturale pronta per il BookingCTA: variante 'link' (default universale, zero-consent, .btn-primary con URL da site.json) e variante 'embed' consent-gated — placeholder statico con facciata brandizzata + click che inietta l'iframe/script (two-click), compatibile col divieto di animazioni e col rendering statico. Serve però scegliere una CMP di serie per i siti della factory, oggi assente dallo stack.

**Fonti:** <https://www.iubenda.com/en/help/1229-manual-tagging-blocking-cookies/> · <https://formitable.com/en/developers/widget/> · <https://calendarexamples.thefork.com/website-instructions/>

### Basi di evidenza quantitativa per grammatiche e rubrica del critico: leggere i deep-dive per-industry del Conversion Benchmark Report di Unbounce (health/wellness, professional services, legal — word count ottimale, sentiment, tipo di CTA) e censire la membership GoodUI (prezzo 2026, accesso ai 141 pattern rankati su 633 A/B test, pattern top per win-rate come #41 Sticky CTA e #11 Gradual Reassurance), distillando il tutto in regole citabili per slots.json e critico visivo.


#### Unbounce 2024: la leggibilità è la leva #1 misurata — regola trasversale per il copy-critic

Report 2024 (dati 23/7/2023–23/7/2024: 464M visitatori, 57M conversioni, 41k landing page; escluse pagine <50 visitatori e industry <400 pagine). Pagine scritte a livello 5ª–7ª elementare convertono all'11,1% — +56% vs livello 8ª–9ª e >2x vs scrittura 'professional' (5,3%). Correlazione word count↔conversioni: -18,6%; parole difficili (3+ sillabe): -24,3%, un impatto negativo cresciuto del 62% dal 2020. La leggibilità è calcolata come 'readability consensus' di 8 formule (Flesch-Kincaid, SMOG, Gunning Fog, ecc.). Mediana generale: 6,6%.

**Rilevanza per la Site Factory:** Regola citabile nella rubrica del copy-critic: penalizzare parole lunghe/latinate e frasi complesse non è gusto ma evidenza (-24,3%). Le formule sono tarate sull'inglese: per l'italiano serve l'equivalente (Gulpease/Flesch-Vacca) come gate deterministico — vedi followup. I budget parole in slots.json/Zod hanno ora un ancoraggio sperimentale.

**Fonti:** <https://unbounce.com/conversion-benchmark-report/> · <https://unbounce.com/conversion-benchmark-report/methodology/> · <https://unbounce.com/landing-pages/whats-a-good-conversion-rate/>

#### Professional services (il verticale attuale: edilizia/impianti): ~500 parole totali, mobile 81% del traffico

Mediana 6,1% (75° percentile 'good' = 14,1%). Word count ottimale 275–745 con picco a ~500 parole; parole difficili max 45–120 (~15% del testo); target ≤7ª: passare da 5ª–7ª (12,9%) a 8ª–9ª (6,6%) costa -49%. Mobile = 81% delle visite ma converte -40% del desktop (8,3% vs 11,6%). Canali: email 13,9%, paid search 7,8% (+77% vs paid social 4,4%). Dettaglio chiave per ConsulBuild: i servizi di riparazione/manutenzione convertono quasi 3x meglio della home renovation.

**Rilevanza per la Site Factory:** Il budget copy TOTALE della pagina del blueprint conversione-locale dovrebbe stare nella banda 275–745 parole (picco ~500): oggi ~50 slot rischiano di sforare — vale un conteggio aggregato nel gate deterministico. Mobile-first non negoziabile nel critico visivo. Per clienti ristrutturazioni attendersi conversioni strutturalmente più basse → più reassurance/prova sociale nella grammatica.

**Fonti:** <https://unbounce.com/conversion-benchmark-report/professional-services-conversion-rate/> · <https://unbounce.com/landing-pages/whats-a-good-conversion-rate/>

#### Health & wellness (futuro verticale medici/estetica): pagine più lunghe ammesse, leggibilità ancora più punitiva

Mediana 5,1% (wellness 8,2%, medical 5,3%, dental 4,3%). Word count ottimale 355–1.020 parole — banda molto più larga dei professional services; parole difficili 65–155. Leggibilità: 5ª–7ª converte 10,8%; salire a 8ª–9ª costa -48%, a 10ª–12ª -55,6%. Mobile porta 7x il traffico del desktop ma converte -22%. Canali: email ~2x paid search+social; Instagram 7,7% mediana (top 39,7%), TikTok 2,8% (top 12,6%), Google Ads 4,7%.

**Rilevanza per la Site Factory:** La grammatica per-settore 'health' può prevedere un blueprint più lungo (sezioni informative/educative fino a ~1.000 parole totali) mentre 'edilizia' resta a ~500: prima evidenza quantitativa che i blueprint alternativi per verticale devono differire nel budget di contenuto, non solo nell'ordine sezioni. Regola leggibilità nel critico: per health il linguaggio clinico-tecnico è il rischio principale.

**Fonti:** <https://unbounce.com/conversion-benchmark-report/healthcare-wellness-conversion-rate/>

#### Legal (futuro verticale professionisti): l'eccezione a tutte le regole — più testo, registro alto, mobile che converte meglio

Mediana 6,3% ('good' 13,1%); family/disability 6,3%, immigration 5,6%. Word count raccomandato ~600 (secondo più alto tra le industry); parole difficili 66–149. È l'unica industry dove il registro alto paga: livello college/university converte 7,2% (il migliore), solo 'professional' crolla (5%). Ed è l'anomalia mobile: 88% del traffico e converte +32% MEGLIO del desktop (21% vs 15,9%). Canali: paid search 8,3% (Google 8,6% = 3x Bing), paid social 4,8% (Instagram 13%), email solo 2,7%.

**Rilevanza per la Site Factory:** La grammatica 'professionisti/legal' deve invertire due regole della rubrica attuale: consentire lessico tecnico-formale (il critico non deve penalizzarlo come per edilizia) e progettare il funnel come mobile-primario con CTA telefonica prominente. Conferma che la rubrica a 24 punti ha bisogno di pesi per-verticale, non di una soglia unica di leggibilità.

**Fonti:** <https://unbounce.com/conversion-benchmark-report/legal-conversion-rate/> · <https://unbounce.com/landing-pages/whats-a-good-conversion-rate/>

#### Sentiment per verticale (report 2021 via analisi HubSpot — dato datato, usare come euristica)

Analisi Unbounce su 74M visitatori con NRC Emotion Lexicon (8 emozioni). Regole per-industry: anche solo 1% di copy fear/anger → fino a -25% conversioni (travel). Business consulting: paradossalmente 1–2% di fear AIUTA, ma anticipation >1,5% ('predict', 'excel') → -25%. Business services: trust words >8% ('leading', 'compliance', 'account') aiuta; e <100 parole convertono +50% vs >500. Home improvement: le pagine migliori hanno <1% di linguaggio 'joy'. Legal: joy correlata negativamente, fear pure. Credit: trust >3% → -10%. ATTENZIONE: dati 2021, lessico inglese; il report 2024 segnala aumenti di linguaggio negativo ma il dettaglio sentiment per-industry non è nelle pagine pubbliche 2024.

**Rilevanza per la Site Factory:** Regole citabili per il copy-critic per-verticale: per edilizia (≈home improvement) vietare il tono gioioso-entusiasta (slop tipico dell'AI!) e spingere sul lessico di affidabilità; per il futuro verticale legal bandire sia enfasi positiva che leva sulla paura. Da trattare come direzione, non come soglie hard per l'italiano.

**Fonti:** <https://blog.hubspot.com/marketing/ways-emotion-and-word-count-affect-your-landing-pages> · <https://unbounce.com/conversion-benchmark-report/>

#### GoodUI censita: 141 pattern / 633 test / 147M visitatori; ranking e effect size SOLO a pagamento — Solo $60-72/mese

Numeri free (luglio 2026): 141 pattern, 633 test, 147.071.944 visitatori totali; esiti aggregati: 165 test vinti, 281 positivi non significativi, 144 negativi non significativi, 43 persi. Prezzi 2026: Solo $60/mese fatturato annuale ($720) o $72/mese mensile, 1 utente; Team $120/mese annuale ($1.440), 5 utenti; Expert-Guided $1.950/mese con 1 review di test al mese con Jakub Linowski. Tutti i piani: 633+ test ricercabili, ordinamento pattern/test per impatto, ~5 nuovi test/mese, 'results guarantee' con rimborso 100% entro 30 giorni. Le pagine pattern pubbliche mostrano conteggio test, potenza statistica e screenshot, ma gli effetti mediani sono mascherati come 'X.X%'.

**Rilevanza per la Site Factory:** Per trasformare i pattern in regole numerate citabili nella rubrica serve 1 mese di Solo ($72, rientra nel budget 'tool a pagamento ok se giustificati'): un'estrazione una-tantum del ranking per repeatability/median effect dei 141 pattern, da distillare in slots.json e rubrica, poi disdire. Il free tier basta solo per sapere QUALI pattern sono più testati, non quanto rendono.

**Fonti:** <https://goodui.org/join/> · <https://goodui.org/patterns/> · <https://goodui.org/>

#### Sticky CTA (#41) è il pattern con la base d'evidenza più solida vista: 28 test — e manca alla Site Factory

Pattern #41 Sticky Call To Action (CTA persistente/flottante che resta visibile allo scroll): 28 test, 88,4% del target di potenza cumulativa 90% a 1% MDE — statisticamente il più robusto tra i pattern esaminati; testato su progression (18), sales (20), lead gen, signup, su desktop e mobile, con test recenti anche 2026 (Obs.no, Kensingtontours). Effetti esatti paywalled. In confronto, il pattern #60 Repeated Bottom CTA (già presente di fatto nello standard ConsulBuild come 'CTA ricorrenti') ha solo 7 test e il 30,1% del target di potenza a 2% MDE: evidenza molto più debole.

**Rilevanza per la Site Factory:** La variante di sezione da costruire per PRIMA è una sticky CTA bar mobile ('Chiama / Preventivo gratuito') — oggi assente dal renderer. È posizionamento CSS (position:sticky), non animazione: compatibile col vincolo 'niente motion'. Dato che l'81-88% del traffico dei verticali target è mobile, è anche il pattern col reach maggiore. Le CTA ricorrenti già in DESIGN.md restano, ma con consapevolezza che la loro evidenza è più tenue.

**Fonti:** <https://goodui.org/patterns/41/> · <https://goodui.org/patterns/60/> · <https://goodui.org/>

#### Gradual Reassurance (#11): +20% documentato pubblicamente — candidato per la variante del form ContactCTA

Pattern #11 = gradual engagement + reassurance: spezzare l'interazione in micro-step progressivi, ognuno accompagnato da rassicurazioni, invece di un blocco unico. 13 test, 74,8% del target di potenza 90% a 2% MDE; test recenti fino a giugno 2026 (Livefresh.de 96k visitatori). Unico caso con numeri pubblici: su wpallimport.com, sostituendo un video homepage con reassurance interattiva → +20% di 'sale starts' e possibile +12% sulle prime vendite, test durato 5 mesi. Applicato soprattutto su Home & Landing (9 test su 13).

**Rilevanza per la Site Factory:** Variante candidata #2: ContactCTA multi-step — chiedere prima solo il tipo di lavoro, poi i contatti, con rassicurazioni progressive tra gli step (preventivo gratuito, tempi di risposta, riga GDPR). La logica form c'è già (simulata): la variante è puro layout+copy, quindi nel perimetro 'varianti di sezione' della fabbrica offline. Coerente anche col finding professional services (più reassurance dove la conversione è strutturalmente bassa, es. ristrutturazioni).

**Fonti:** <https://goodui.org/patterns/11/> · <https://goodui.org/blog/20-sale-starts-from-gradual-reassurance/>

### Assi codificabili per la whitelist di font pairing dei nuovi preset: leggere con browser (fetch fallito, client-rendered) gli articoli di pairing di Google Fonts Knowledge (la 'font matrix' per costruzione/contrasto), ricostruire come Squarespace Blueprint raggruppa palette e font pairing per personalità di brand (Professional→Quirky), e censire fonti curate di coppie Google Fonts (Fontpair, Typewolf) con attributi di settore/tono riusabili come annotazioni.


#### Font matrix (Kupferschmid/Google Fonts): i 3 assi codificabili per ogni font della whitelist

L'articolo GF Knowledge descrive un sistema a 3 layer: (1) Skeleton/form model — dynamic (aperture aperte, asse diagonale), rational (aperture chiuse, asse verticale), geometric (forme costruite, 'o' circolare); (2) Flesh — contrasto (linear vs contrasting) × grazie (serif vs sans); (3) Skin — dettagli/genere (stencil, western…), opzionale. Regole di pairing deterministiche: stessa colonna (stesso form model) = OK; combinazione diagonale (skeleton E flesh diversi) = OK; stessa riga (stesso flesh, skeleton diverso) = da EVITARE (risultato 'irritante'). Limiti dichiarati: casi intermedi ('semi-rational', es. Roboto Slab), script/display sono comunque contrastanti; contano anche x-height e larghezza simili, e pesi/stili possono salvare una coppia imperfetta.

**Rilevanza per la Site Factory:** È lo schema di annotazione della whitelist: ogni font riceve form_model (dynamic|rational|geometric, con gradazione), contrast (linear|contrasting), serif (bool). Il critico della fabbrica può validare un pairing proposto con una regola deterministica (rifiuta same-row) prima ancora del giudizio visivo AI — analogo al gate WCAG già esistente per le palette.

**Fonti:** <https://fonts.google.com/knowledge/choosing_type/pairing_typefaces_based_on_their_construction_using_the_font_matrix>

#### Celle della matrice già popolate con Google Fonts + aggettivi di mood per form model

L'articolo GF classifica esplicitamente: Dynamic → Minerva Modern, Alegreya, Source Sans Pro, Bitter; Rational → Arya, Bodoni Moda, Helvetica, Zilla Slab; Geometric → Tenor Sans, Candida, Outfit, Memphis. Pimp my Type (l'autore dell'articolo GF, Oliver Schöndorfer) associa aggettivi ai form model: dynamic = friendly, open, approachable, warm, inviting, personal, timeless; rational = orderly, reserved, noble, elegant, serious, authoritative; geometric = simple, technical, modern, functional, systematic, clean. Roboto è indicato come intermedio tra rational e dynamic. Esempio operativo GF: primario Bitter (dynamic linear serif) → secondario monospace dynamic → Fira Code.

**Rilevanza per la Site Factory:** Seed pronto per ~12 font della whitelist e, soprattutto, il ponte form model → tono: 'rational contrasting serif' ↔ elegante/autorevole (studi professionali), 'dynamic' ↔ caldo/artigianale (edilizia, ristorazione), 'geometric' ↔ tecnico/moderno (impianti). L'asse emotivo per-settore diventa derivabile dagli attributi strutturali, non inventato dall'AI.

**Fonti:** <https://fonts.google.com/knowledge/choosing_type/pairing_typefaces_based_on_their_construction_using_the_font_matrix> · <https://pimpmytype.com/font-matrix/>

#### Regole di contorno GF: ruolo del secondary, distinzione/armonia, fallback serif+sans

L'articolo 'Pairing typefaces' fissa: un secondo font si aggiunge SOLO se fa qualcosa che il primario non può (cambio contesto, ammorbidire un brand troppo serio, pesi/corsivi mancanti, copertura caratteri). Il criterio è 'different enough, but not too different' (distinction vs harmony, Santa Maria); in dubbio, serif+sans 'quasi garantisce variazione sufficiente'. Modello di Jessica Hische: parentele — sibling (x-height, contrasto, larghezza, mood simili), cousin (2-3 proprietà condivise), distant relative (1 sola). 'Emotive considerations' aggiunge: la reazione emotiva del lettore precede tutto, si fonda su convenzioni culturali/storiche, ma la scelta emotiva va sempre seguita dal check tecnico (pesi, supporto lingua).

**Rilevanza per la Site Factory:** Traducibile in campi della whitelist: ogni pairing dichiara il ruolo del secondary (display/body/dati) e il grado di parentela voluto (sibling/cousin); il gate tecnico deterministico (n. pesi ≥ X, italics, caratteri italiani) gira PRIMA del critico visivo. Il fallback serif+sans è la scelta di default a bassa varianza per i preset conservativi.

**Fonti:** <https://fonts.google.com/knowledge/choosing_type/pairing_typefaces> · <https://fonts.google.com/knowledge/choosing_type/emotive_considerations_for_choosing_typefaces>

#### Superfamiglie Google Fonts = tier di pairing a rischio zero

L'articolo GF su famiglie/superfamiglie: coppie della stessa superfamiglia condividono skeleton, metriche verticali, x-height, proporzioni e motivi — si possono scambiare senza rompere il layout. Coppie citate disponibili su Google Fonts: Merriweather + Merriweather Sans, Roboto Slab + Roboto Mono, Nunito + Nunito Sans, Quattrocento + Quattrocento Sans. Un font esterno si introduce solo per contrasto di tono che la famiglia non offre (es. script).

**Rilevanza per la Site Factory:** Nella whitelist conviene un attributo 'tier': tier-1 = superfamiglie (pairing garantito, zero audit tipografico), tier-2 = same form model, tier-3 = diagonale ad alto contrasto (serve audit umano più attento). Il selettore runtime per-cliente può pescare solo da tier-1/2; le proposte tier-3 restano alla fabbrica offline.

**Fonti:** <https://fonts.google.com/knowledge/choosing_type/pairing_typefaces_within_a_family_superfamily>

#### Squarespace Blueprint: 7 personalità × 4 palette × 2 pairing — la scala giusta è piccola e curata

Blueprint AI fa scegliere una tra 7 brand personality (Professional, Playful, Sophisticated, Friendly, Bold, Quirky, Innovative); la personalità pilota tutto: palette, font e tono del copy generato. Le palette sono raggruppate PER personalità (4 schemi da 4 colori ciascuna, ~28 totali, curate da designer umani; la personalità scelta appare in cima con banner 'recommended' ma le altre restano sfogliabili). I font: 2 pairing suggeriti per personalità, 14 font totali in tutto il sistema, con preview live sul sito reale. Il blog ufficiale: 'Design Intelligence suggerisce colori che corrispondono all'energia che vuoi far percepire' (es. palette neutra per un business mindfulness; sans bold per estetica high-energy).

**Rilevanza per la Site Factory:** Valida la strategia ConsulBuild e ne dà i numeri: l'asse 'personalità' è il criterio emotivo mancante al selettore. Replica concreta: taggare i 6 preset esistenti con 1-2 personalità ciascuno, dare a ogni settore una personalità di default nel contesto.json, e mantenere il rapporto 'recommended ma non esclusivo'. 14 font e ~28 palette sono una scala auditabile a mano.

**Fonti:** <https://www.squarespace.com/blog/starting-a-website-with-squarespace-blueprint> · <https://www.websitebuilderexpert.com/website-builders/squarespace-blueprint-ai/>

#### Typewolf: whitelist di partenza già pronta (40 font, agg. gennaio 2026) con l'attributo 'body text friendly'

La collezione curata di Typewolf (aggiornata 12/1/2026) elenca 40 Google Fonts con criteri espliciti: solo foundry/designer reputati, multi-peso multi-stile, esclusi i display single-weight. Ogni voce riporta pesi e italics; il flag 'body text friendly' = regular+italic+bold, contrasto basso-moderato, counter grandi, aperture aperte, x-height grande — un attributo direttamente codificabile. Il blog companion dà 5 pairing con motivazione testuale: Cormorant Garamond+Proza Libre (eleganza, humanist+old style), Libre Franklin+Libre Baskerville (classico, 'established and traditional'), Trirong+Rubik (scheletri geometrici, moderno), Work Sans+Taviraj (contemporaneo, accogliente, 'friendly terminals'), Eczar+Gentium (espressivo editoriale, serif+serif).

**Rilevanza per la Site Factory:** I 40 font sono il pool iniziale della whitelist (intersezione forte coi preset esistenti: Fraunces, Lora, Manrope…); 'body_text_friendly' e 'n. pesi/italics' diventano colonne del gate tecnico. Le motivazioni dei 5 pairing sono il template dello stile di annotazione tono/uso che la fabbrica deve produrre per ogni coppia nuova.

**Fonti:** <https://www.typewolf.com/google-fonts> · <https://www.typewolf.com/blog/google-fonts-combinations>

#### Fontpair: pool ampio ma SENZA attributi di mood/settore — utile solo come cava, non come tassonomia

Fontpair (fontpair.co) organizza migliaia di coppie Google Fonts/Fontshare in sole 6 categorie di genere (Sans Serif, Serif, Slab, Display, Monospace, Handwriting) e per combinazione (es. 'sans-serif + serif'). Le coppie NON hanno tag di mood, settore o personalità: solo descrizione generica e 3 hex di esempio. Coppie recenti visibili: Epilogue+Baskervville, Work Sans+Bitter, EB Garamond+DM Mono, DM Sans+Staatliches, Unbounded+Albert Sans. Gratuito.

**Rilevanza per la Site Factory:** Ridimensiona l'aspettativa: Fontpair serve come cava di candidati già 'sensati' da cui la fabbrica pesca coppie da annotare, ma l'annotazione settore/tono va prodotta in casa (con gli assi della font matrix + personalità Squarespace-style). Non conviene importarlo com'è.

**Fonti:** <https://fontpair.co/all> · <https://fontpair.co/>

#### typ.io e Fonts In Use: l'evidenza 'settore reale' per annotare i pairing

typ.io estrae coppie di font da siti web reali ben disegnati (~3.500 sample, 347 pagine) e le taglia con tag di stile E settore visibili in home: business, finance, investment, wellness, health, agency, portfolio, ai, developer, green/ecological, marketing…; ha 7 liste per struttura (es. 'Different fonts for headers and content', 356 suggerimenti). Fonts In Use ha una tassonomia industrie a 34 topic (tra cui Home/Interior, Services, Local, Business/Finance, Health/Fitness, Architecture) incrociabile col formato Web e col singolo typeface (URL tipo /in/1/topics/28/home-interior); 34.000 usi, 6.293 staff picks. Nota: /industries restituiva errore 500 al momento della visita (10/7/2026); la navigazione per topic dalla home funziona.

**Rilevanza per la Site Factory:** Sono le due fonti per l'annotazione di settore basata su evidenza: per ogni macro-settore della Site Factory (edilizia→Home/Interior+Services+Local, medici→Health/Fitness…) si censiscono i font ricorrenti nei casi reali e si annota la whitelist con 'visto in uso nel settore X' — l'anti-invenzione applicato alla tipografia.

**Fonti:** <https://typ.io/> · <https://typ.io/lists> · <https://fontsinuse.com/>

## Verifiche avversariali dei claim portanti


### Dembrandt è una CLI npm open source (~2,1k stelle, 0 issue aperte) che estrae design token da un URL via Playwright e computed styles, con confidence score e output nel formato W3C DTCG, opzione Firefox per siti bot-protected e --slow per SPA

**Verdetto: confirmed**

Il claim regge quasi alla lettera, verificato oggi (2026-07-10) su fonti primarie.

1) Repo GitHub reale e attivo: github.com/dembrandt/dembrandt esiste, non archiviato, licenza MIT, creato 2025-11-22, ultimo push 2026-07-03 (release v0.22.0 del 3 luglio 2026, 232 commit su main). Stelle: 2.108 via API GitHub — combacia con il "~2,1k" del claim. Issue: la pagina GitHub mostra 0 issue aperte; l'API riporta open_issues_count=1, ma quel contatore include le PR aperte, quindi "0 issue aperte" è sostanzialmente corretto (al più c'è 1 PR aperta).

2) Pacchetto npm reale e CLI: `dembrandt` esiste sul registry npm, latest 0.22.0, 60+ versioni pubblicate, autore thevangelist, campo `bin` con due eseguibili (`dembrandt` CLI + `dembrandt-mcp` server MCP). Download ultima settimana (2–8 lug 2026): 1.933. Non è un progetto fantasma ma nemmeno mainstream: ~2k download/settimana.

3) README conferma ogni feature citata: usa Playwright per renderizzare la pagina e legge i computed styles dal DOM; confidence score sui colori (High = logo/elementi interattivi primari, Medium = secondari, Low filtrati); output W3C DTCG via flag `--dtcg`; `--browser=firefox` esplicitamente per sistemi di bot detection; `--slow` per SPA (timeout 3x, 24s di hydration). Bonus non nel claim: modalità MCP server per Claude/Cursor e drift detection per CI.

4) L'articolo dev.to dichiarato come fonte esiste (29 dic 2025, autore thevangelist = autore del pacchetto npm) e descrive le stesse feature.

Unica sfumatura: il DTCG non è il formato di default ma un'opzione (`--dtcg` — il claim dice "output nel formato W3C DTCG", tecnicamente vero come capacità); e il progetto è giovane (nato nov 2025), quindi le 2,1k stelle sono cresciute in fretta ma la manutenzione a oggi è attiva (release 7 giorni fa). Nessun elemento del claim risulta falso o misdescritto: resta un candidato valido per la pipeline di estrazione.

_Nota:_ Attenzione operativa: progetto molto giovane (nov 2025) con singolo maintainer — attivo oggi, ma per una pipeline di produzione vale un fallback (es. estrazione computed-styles in proprio via Playwright è ~200 righe se il tool venisse abbandonato). Il DTCG richiede il flag --dtcg, non è il default.

**Fonti:** <https://github.com/dembrandt/dembrandt> · <https://api.github.com/repos/dembrandt/dembrandt> · <https://registry.npmjs.org/dembrandt> · <https://api.npmjs.org/downloads/point/last-week/dembrandt> · <https://dev.to/thevangelist/i-built-dembrandt-extract-any-websites-design-system-in-seconds-open-source-2n6d>

### designlang (`npx designlang <url>`, repo github.com/Manavarya09/design-extract, MIT) ha 9 estrattori, diffa i temi light/dark emettendo token accoppiati, fa auto-remediation WCAG via hue-shifting e produce 11 formati output inclusa una 'skill per Claude Code'

**Verdetto: partial**

VERIFICA ADVERSARIALE (2026-07-10), sub-claim per sub-claim:

1) «npx designlang <url>» — VERO. Il pacchetto npm `designlang` esiste (latest 12.21.0, bin `designlang`, MIT nel package.json e file LICENSE nel tarball, © Manavarya Singh). Creato 2026-04-15, ultimo publish 2026-06-14 (~1 mese fa), 44 versioni in 2 mesi: giovanissimo e ad alto churn.

2) «repo github.com/Manavarya09/design-extract, MIT» — FALSO OGGI. Il repo risponde 404 e ANCHE l'utente GitHub Manavarya09 è 404 (account cancellato/rinominato/sospeso); nessun redirect da rename, e la ricerca GitHub non trova alcun repo spostato equivalente. Il claim della landing «fully open source on GitHub» oggi non regge: l'unica fonte del codice è il tarball npm, e nel package.json latest i campi repository/homepage sono null. Anche il comando `npx skills add Manavarya09/design-extract` nel README punta nel vuoto.

3) «9 estrattori» — NUMERO DI MARKETING, incoerente ovunque: la landing dice 9, il README dice «17 extractor modules» e «26 capabilities», il tarball contiene 46 moduli in src/extractors/ (colors, typography, dark-mode-pair, a11y-remediation, motion, component-anatomy, voice, seo…). La capacità supera il claim, ma il numero dichiarato non corrisponde a nulla nel codice.

4) «diffa light/dark emettendo token accoppiati» — VERO nel codice: src/extractors/dark-mode-pair.js percorre entrambi i temi, accoppia colori per ruolo e CSS variables ({light, dark} solo dove differiscono) e segnala i token presenti in un tema e assenti nell'altro.

5) «auto-remediation WCAG via hue-shifting» — FALSO COME FORMULATO. src/extractors/a11y-remediation.js propone, per ogni coppia fg/bg bocciata, il colore DELLA PALETTE ESISTENTE più vicino che passa AA/AAA (campo `suggestion`: è un suggerimento, non una riscrittura automatica). Nessun hue-shifting nel percorso WCAG; la rotazione hue OKLCH esiste solo in src/recolor.js / theme-swap, che è re-branding attorno a un nuovo primary, non remediation. Lo stesso README lo ammette: «Nearest palette color passing AA / AAA». La frase della landing «the smallest hue-shift that passes AA» è marketing che non corrisponde al codice (e tecnicamente dubbia: il contrasto WCAG dipende dalla luminanza, non dalla hue).

6) «11 formati output inclusa una skill per Claude Code» — SOSTANZIALMENTE VERO: 41 moduli in src/formatters/ (DTCG, Tailwind v3/v4, shadcn, Figma, iOS SwiftUI, Android Compose, Flutter, WordPress, PDF brand book, Storybook…), quindi ≥11 formati. La «skill per Claude Code» è reale in due sensi: `--emit-agent-rules` emette `.claude/skills/designlang/SKILL.md` + frammento CLAUDE.md (src/formatters/agent-rules.js:76-113), e il pacchetto stesso è un plugin Claude Code (.claude-plugin/plugin.json + skills/extract-design/SKILL.md).

SEGNALI SECURITY-SCAN (primo passaggio sul tarball 12.21.0):
- postinstall = `npx playwright install chromium --with-deps` → download di rete (Chromium intero) all'install. Standard per tool Playwright, ma è un postinstall attivo da mettere a registro.
- src/classifiers/smart.js chiama DIRETTAMENTE https://api.anthropic.com/v1/messages se trova ANTHROPIC_API_KEY in env e si passa `--smart` (fallback: AtlasCloud — sponsor del README con link utm — e OpenAI). Per Site-factory questo tocca la regola «niente API Anthropic a pagamento»: opt-in e no-op silenzioso senza key, ma se una key è in env il flag la usa.
- Nessuna telemetria/exfiltrazione trovata: le stringhe posthog/sentry/GA sono fingerprint di rilevamento del sito TARGET, non chiamate a casa. child_process solo per ffmpeg e `open` di file locali. Codice leggibile, commentato, niente obfuscation.
- Rischio supply-chain principale: NESSUN repo sorgente pubblico → il tarball non è verificabile contro una storia git, autore sparito da GitHub, mantainer singolo, versioning aggressivo (1.0.0→12.21.0 in 2 mesi). Il security-scan obbligatorio andrebbe fatto sul tarball npm, non su un clone.

Tarball ispezionato in /private/tmp/claude-501/-Users-mattia-Claude-Projects-Site-factory/abd4e570-5fba-4f25-892d-cd1f6149b1c8/scratchpad/dl/package.

_Nota:_ Verdetto PARTIAL: il tool esiste ed è più capace di quanto la landing dica (46 estrattori, 41 formatter), dark-mode pairing e skill Claude Code sono reali; ma il repo GitHub dichiarato NON esiste più (utente incluso), il «9 estrattori» non corrisponde a nulla e la remediation WCAG è sostituzione-da-palette suggerita, non hue-shifting automatico. Per l'uso in Site-factory: utile solo come estrattore ispirazionale nella fabbrica offline, ma installarlo significa fidarsi di un tarball senza sorgente pubblico e con postinstall di rete — e mai lanciarlo con `--smart` se ANTHROPIC_API_KEY è nell'env (userebbe l'API a pagamento). Alternative con repo vivo trovate in ricerca: arvindrk/extract-design-system, dembrandt/dembrandt.

**Fonti:** <https://designlang.vercel.app/> · <https://github.com/Manavarya09/design-extract> · <https://registry.npmjs.org/designlang> · <https://www.npmjs.com/package/designlang>

### La release di Adobe Leonardo del 21/02/2026 include @adobe/leonardo-mcp@0.1.0, server MCP ufficiale

**Verdetto: confirmed**

Il claim regge su tutte le fonti primarie, verificate oggi (2026-07-10). (1) API GitHub del repo adobe/leonardo: esiste la release con tag "@adobe/leonardo-mcp@0.1.0", published_at 2026-02-21T01:10:39Z, marcata Latest, con changelog "Add @adobe/leonardo-mcp — MCP server for Leonardo contrast colors (generate-theme, check-contrast, convert-color, create-palette)". (2) Registry npm: il pacchetto @adobe/leonardo-mcp esiste, dist-tag latest = 0.1.0, pubblicato il 2026-02-21T01:10:38Z (una v0.0.1 era uscita poche ore prima, il 2026-02-20T22:53Z — dettaglio che non intacca il claim). (3) È ufficiale Adobe: tra i maintainer c'è adobe-admin (grp-opensourceoffice@adobe.com), repository = github.com/adobe/leonardo, licenza Apache-2.0, dipende da @adobe/leonardo-contrast-colors@1.1.0 e @modelcontextprotocol/sdk. (4) Il README conferma i 4 tool esposti: generate-theme (tema a contrasto in JSON stile theme.contrastColors), check-contrast (verifica WCAG), convert-color, create-palette; server stdio avviabile con "npx @adobe/leonardo-mcp", Node >=18. Nessun elemento contraddice il claim: la proposta di riprogettare lo step palette può poggiare sull'esistenza reale del pacchetto. Unica cautela operativa: è una 0.1.0 di febbraio 2026 (API potenzialmente instabile), e il calcolo contrasto di Leonardo dovrebbe comunque essere riconciliato con l'attuale fonte unica del progetto (check-contrast.mjs) per evitare due verità sul WCAG.

_Nota:_ Verificato via API GitHub e registry npm (macchina-leggibili), non solo via pagine HTML. La pagina npmjs.com restituiva 403 a WebFetch ma il registry JSON è pubblico e autorevole.

**Fonti:** <https://github.com/adobe/leonardo/releases/tag/%40adobe/leonardo-mcp%400.1.0> · <https://api.github.com/repos/adobe/leonardo/releases> · <https://registry.npmjs.org/@adobe%2Fleonardo-mcp>

### Relume Wireframing 2.0 (settembre 2025) ha portato l'AI dal ~25% al ~70% della libreria utilizzata, con selezione per stile di settore, per conteggio dei contenuti del brief e 'placement-aware' sull'intera pagina

**Verdetto: confirmed**

Verificato direttamente sull'HTML grezzo della pagina ufficiale (ancora online al 2026-07-10): "Release Day | Smarter Wireframes & Copywriting, Plus New Pricing Components", datata 10 settembre 2025. Tutti gli elementi del claim compaiono, quasi in quei termini esatti, nella tabella comparativa Wireframing 1.0 vs 2.0:

1) PERCENTUALI — "Library coverage: Uses ~25% of marketing components" (1.0) → "Uses ~70% of marketing components" (2.0). Nella prosa: "Wireframing 1.0 only drew from about 25% of our component library—mostly the safer, more common layouts". Il 25%→70% è quindi testuale.
2) STILE PER SETTORE — "Brand style fit: [1.0] Mixed styles, not brand-aware → [2.0] Selects styles that match the project description (e.g., off-grid/overlapping for agencies; card layouts for SaaS)".
3) CONTEGGIO CONTENUTI — "Section content match: [1.0] Defaulted to generic layouts (e.g., always 3 pricing plans), relying only on the section title → [2.0] Selects components based on content count using both title & description (e.g., '2 pricing plans' generates a 2-plan layout)".
4) PLACEMENT-AWARE — "Page flow awareness: [1.0] No awareness of position/order → [2.0] Chooses components with placement in mind; improves rhythm and alternation. Smoother narrative and fewer repetitive beats down the page". In più una quarta meccanica non citata nel claim: "Site-wide consistency: components are reused across pages for coherence".

Tre sfumature da citare correttamente se il claim diventa base di design: (a) le percentuali si riferiscono ai "marketing components" (la parte marketing della libreria), non a tutta la libreria Relume; (b) "stile di settore" è in realtà "styles that match the project description" — la selezione parte dalla descrizione del progetto, con i settori (agencies, SaaS) come esempi, non da una tassonomia di settore esplicita; (c) "placement-aware" è una parafrasi fedele di "chooses components with placement in mind" sotto la voce "Page flow awareness" — il termine esatto "placement-aware" non compare come tale. Contesto utile: Wireframing 1.0 era GPT-3.5 e limitato deliberatamente al 25% per evitare mismatch; il salto al 70% è attribuito a "smarter models and systems". Nessuna cifra di prezzo rilevante nella pagina.

_Nota:_ Claim confermato sulla fonte primaria dichiarata, con tre precisazioni terminologiche (marketing components, project description vs settore, "placement in mind" vs "placement-aware") che non ne cambiano la sostanza ma vanno riportate se lo si cita come riferimento di design.

**Fonti:** <https://www.relume.io/whats-new/september-2025-release>

### Studio Digital Applied su 2.000 pagine A/B (Q4 2025–Q1 2026): social proof con nomi concreti +22%, sticky-bottom CTA +11%, CTA multiple nell'hero -8%, ogni campo form oltre 4 dimezza la conversione (1 campo 12,4% vs 6+ 3,1%), stock photo generica -11%, hero con big number +18%

**Verdetto: partial**

LA CITAZIONE È FEDELE, MA LO STUDIO NON È VERIFICABILE E HA FORTI RED FLAG DI "RICERCA ORIGINALE" GENERATA DA AI.

PARTE CHE REGGE (riporto accurato della fonte):
- La pagina esiste all'URL dichiarato: "Landing Page Conversion in 2026: 2,000 Pages Tested", pubblicata il 26 aprile 2026.
- Tutti e 6 i numeri corrispondono esattamente: social proof con nomi concreti +22% (vs logo strip +8%), sticky-bottom CTA +11% (above-fold +6%, insieme solo +12% — nessun compounding), CTA multiple nell'hero -8%, form 1 campo 12,4% vs 6+ campi 3,1%, stock photo generica -11%, hero con big number/single-stat +18%.
- La metodologia DICHIARATA corrisponde: 2.000 pagine A/B, ottobre 2025–marzo 2026 (= Q4 2025–Q1 2026), significatività 95%, minimo 1.000 sessioni per variante, canale costante nei test, max 30 giorni, ~11% dei test esclusi; breakdown per categoria (B2B SaaS n=620, agency n=380, DTC n=480, lead-gen n=320, webinar n=200).

PARTE CHE NON REGGE (peso probatorio ~zero):
1. AUTORE: nessuna persona fisica firma lo studio — solo "Digital Applied Team / Senior strategists". Digital Applied è una boutique di Bratislava fondata nel 2019, autodefinita "small team" il cui modello dichiarato è "AI runs the production work; a senior strategist owns the call". Unico nome sul sito: Richard Gibbons (founder).
2. CONTENT FARM: il blog dichiara 1.671 articoli, con 3-5+ post AL GIORNO (es. 24 post datati 9-10 luglio 2026), zero byline individuali. È produzione programmatica AI su scala, non un reparto ricerca.
3. DATI NON VERIFICABILI: le pagine verrebbero dal "portafoglio clienti attivo più partner agencies" MAI nominate ("condition of category-level reporting only"); nessun dataset scaricabile, nessuna appendice, nessuna piattaforma di testing citata (no GA4/Optimizely/VWO).
4. PLAUSIBILITÀ: 2.000 A/B test con ≥1.000 sessioni/variante in 6 mesi implica ≥4M di sessioni sotto gestione — scala improbabile per una piccola boutique slovacca, e impossibile da verificare.
5. ZERO CITAZIONI INDIPENDENTI: nessun sito terzo cita lo studio; tutti i riferimenti trovati sono interni a digitalapplied.com.
6. NUMERI SOSPETTOSAMENTE DERIVATIVI: il dato form-field (12,4% a 1 campo → 3,1% a 6+) ricalca da vicino il benchmark storico HubSpot/settore (13,4% a 1 campo → 3,6% a 9 campi) con cifre leggermente alterate — pattern tipico di "ricerca originale" AI che parafrasa benchmark esistenti. Anche le altre direzioni (meno campi = più conversioni, stock photo penalizzante, CTA singola nell'hero) sono folklore CRO consolidato da fonti più vecchie e meglio documentate (HubSpot, Unbounce, MECLABS, KlientBoost).

COME PESARLO PER LE VARIANTI DI SEZIONE: usare solo i segnali DIREZIONALI (che coincidono con letteratura CRO indipendente e più antica: form corti, una sola CTA primaria nell'hero, no stock photo generica, social proof specifica) e MAI le percentuali specifiche come parametri. Non parametrizzare le prime varianti su questi numeri: trattarlo come un riassunto ben confezionato di best practice note, non come evidenza sperimentale nuova. Per i segnali meno standard (sticky-bottom CTA +11%, hero con big number +18%) cercare conferma in fonti con dati verificabili prima di investirci varianti.

_Nota:_ Verdetto "partial" nel senso: la fonte esiste e i numeri sono riportati fedelmente, ma lo "studio" è self-published da una content farm AI senza autori, dati grezzi, partner nominati o citazioni indipendenti — il claim regge come citazione, non come evidenza. Peso consigliato: solo direzionale, mai parametrico.

**Fonti:** <https://www.digitalapplied.com/blog/landing-page-conversion-study-2000-pages-tested-2026> · <https://www.digitalapplied.com/blog> · <https://www.digitalapplied.com/about> · <https://blog.hubspot.com/blog/tabid/6307/bid/6746/which-types-of-form-fields-lower-landing-page-conversions.aspx> · <https://neilpatel.com/marketing-stats/conversion-rate-by-form-fields/> · <https://www.klientboost.com/landing-pages/landing-page-forms/>

### La spec W3C Design Tokens (DTCG) ha raggiunto la prima versione stabile 2025.10 il 28/10/2025, con color space moderni (OKLCH, Display P3) e supporto esplicito al theming, implementata da 10+ tool

**Verdetto: confirmed**

Il claim regge alla verifica avversariale su fonti primarie (verificate oggi, luglio 2026). (1) DATA/VERSIONE: l'annuncio ufficiale del W3C Design Tokens Community Group, "Design Tokens specification reaches first stable version", è datato 28/10/2025 e rilascia la versione 2025.10; la spec pubblicata su designtokens.org/TR/2025.10/ è un "Final Community Group Report" con dicitura testuale "This specification is considered stable. Further updates will be provided in superseding specifications." (2) PERIMETRO — il punto critico da controllare: la 2025.10 NON copre solo il Format. Include TRE moduli, tutti stabili: Format, Color e Resolver. Il sospetto che "resolver/temi restino in draft" è smentito: il Resolver Module è parte della release stabile del 28/10/2025, con meccanismo sets+modifiers+contexts esplicitamente pensato per light/dark, varianti accessibilità e temi multi-brand ("manage light/dark modes, accessibility variants, and brand themes without file duplication"). (3) COLOR SPACE: il Color Module stabile supporta 14 color space, inclusi esplicitamente oklch e display-p3 (più oklab, lab, lch, rec2020, ecc. — "all CSS Color Module 4 spaces" secondo l'annuncio). (4) TOOL: l'annuncio cita 3 implementazioni di riferimento (Style Dictionary, Tokens Studio, Terrazzo) più tool che supportano lo standard (Penpot, Figma, Sketch, Framer, Knapsack, Supernova, zeroheight) = 10 nominati, coerente con "10+". Non esistono moduli separati Typography/Motion rimasti in draft: typography, shadow, transition e gradient sono tipi compositi DENTRO il Format Module stabile. Due precisazioni minori (non invalidanti): (a) è un W3C Community Group Final Report, non uno standard W3C sul Recommendation track — "spec W3C" è quindi leggermente impreciso ma è la dicitura d'uso comune; (b) la profondità di implementazione dei singoli tool varia — "10+ tool" nell'annuncio mescola implementazioni di riferimento complete e tool che supportano il formato (non necessariamente i moduli Color/Resolver nuovi); se la decisione "preset serializzati come DTCG" dipende da un tool specifico (es. Style Dictionary), va verificato il supporto di quel tool ai moduli Color e Resolver. Nota di attualità: su designtokens.org/TR/drafts/ esiste una preview draft datata giugno 2026 di modifiche in corso verso una versione successiva ("Do not implement this version") — la 2025.10 resta la baseline stabile su cui poggiare la decisione. Conclusione per il progetto: la decisione "preset serializzati come DTCG" poggia su un perimetro stabile PIÙ ampio di quanto temuto — colori moderni e theming/resolver sono inclusi nella 2025.10.

_Nota:_ Unica sfumatura: "spec W3C" = Final Community Group Report (non Recommendation W3C), e il conteggio "10+ tool" include tool con profondità di supporto variabile — verificare il supporto ai moduli Color/Resolver nel tool concreto scelto per la pipeline.

**Fonti:** <https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/> · <https://www.designtokens.org/TR/2025.10/> · <https://www.designtokens.org/TR/2025.10/color/> · <https://www.designtokens.org/TR/2025.10/resolver/> · <https://www.designtokens.org/TR/drafts/format/>

### Terrazzo (ex Cobalt) genera CSS variables da token DTCG e con il sistema 'permutations' mappa ogni mode su qualsiasi selettore CSS, inclusi attribute selector come [data-preset="terra"]

**Verdetto: confirmed**

Tutti i punti del claim reggono ai controlli sulle fonti primarie (luglio 2026):

1) CSS variables da token DTCG — confermato verbatim nei docs del plugin CSS: "Convert DTCG tokens into CSS variables for use in any web application or native app with webview."

2) Nome esatto della feature: "permutations" — è un'opzione del config del plugin CSS. Esempio verbatim dai docs: `permutations: [{ input: { mode: "light" }, prepare: (contents) => '[data-theme="light"] {\n ${contents}}' }, { input: { mode: "dark" }, prepare: (contents) => '[data-theme="dark"] {\n ${contents}\n}' }]`. Il wrapper è una funzione JS arbitraria ("You control the wrapper CSS, so check for mistakes!"), quindi un attribute selector come [data-preset="terra"] è direttamente supportato — l'esempio ufficiale usa esattamente quel pattern ([data-theme="dark"]), cambia solo il valore. Nessuna restrizione documentata sui selettori.

3) "Ex Cobalt" — confermato dal deprecation notice ufficiale su npm di @cobalt-ui/plugin-css (latest 1.7.5): "This package is no longer maintained. Please upgrade to @terrazzo/plugin-css."

4) Manutenzione attiva — @terrazzo/plugin-css latest 2.4.0 pubblicata 2026-06-13, con release regolari (2.0.0 mar 2026, 2.1.0 apr, 2.2.0 mag, 2.3.0 giu, 2.4.0 giu); repo GitHub terrazzoapp/terrazzo non archiviato, ultimo push 2026-07-08 (2 giorni fa), 423 stelle, 33 issue aperte. MIT license.

_Nota:_ Due sfumature operative per il ponte preset→global.css (non inficiano il claim): (a) in Terrazzo 2.x i modes si dichiarano via DTCG Resolver spec — un resolver con `modifiers` → `contexts` che mappa ogni context ai file di token override (es. modifier "preset" con contexts meridian/atelier/nova/...), quindi i 6 preset vanno strutturati come contexts di un modifier, non come semplici $extensions inline; (b) le permutations vanno elencate esplicitamente nel config (una entry per preset con la sua funzione prepare) — non è una mappatura automatica di "ogni mode", ma con 6 preset sono 6 righe generabili anche programmaticamente nel tzconfig. La cascata attuale (":root per meridian di default + [data-preset=x] per gli altri") si riproduce impostando meridian come context di default (emesso su :root) e gli altri come permutations con selettore [data-preset="..."].

**Fonti:** <https://terrazzo.app/docs/integrations/css/> · <https://terrazzo.app/docs/guides/resolvers/> · <https://www.npmjs.com/package/@terrazzo/plugin-css> · <https://www.npmjs.com/package/@cobalt-ui/plugin-css> · <https://github.com/terrazzoapp/terrazzo>

### 'Nine Judges, Two Effective Votes' (arXiv 2605.29800, 2026): 9 giudici LLM frontier di 7 famiglie hanno errori correlati e valgono ~2 voti indipendenti effettivi; il miglior giudice singolo eguaglia o batte il panel in tutte le condizioni

**Verdetto: confirmed**

Il paper esiste: arXiv 2605.29800, "Nine Judges, Two Effective Votes: Correlated Errors Undermine LLM Evaluation Panels", Guneet Kohli, submitted 28 maggio 2026 (anche su Apple Machine Learning Research). L'abstract conferma verbatim ogni parte del claim: (1) panel di 9 LLM frontier da 7 famiglie (GPT-4o, GPT-4o-mini, Claude Sonnet 4.5, Gemini 2.5 Pro, Llama 4 Maverick, Llama 4 Scout, Qwen3-32B, Mistral Large 3, DeepSeek-V3 — OpenAI, Anthropic, Google, Meta, Alibaba, Mistral, DeepSeek); (2) "the 9 judges effectively provide only about 2 independent votes' worth of information" — circa 3/4 dell'indipendenza nominale persa per errori correlati (framework Kish effective sample size + teorema di Condorcet); accuratezza del panel 8-22 punti sotto l'ideale a voti indipendenti; (3) abstract: "the best single judge matches or outperforms the full panel across all conditions"; conclusione: "the panel matches or underperforms the best individual judge across all conditions". Sul confronto con PoLL 2024: il paper cita esplicitamente PoLL e dichiara di NON contraddirlo — PoLL confronta il panel col giudice MEDIO (dove il panel vince diversificando), questo paper col giudice MIGLIORE (dove il voto di maggioranza diluisce il segnale del migliore con voti ridondanti più deboli). Quindi la formulazione del claim ("il miglior giudice singolo eguaglia o batte il panel") è esatta e la tensione con PoLL è risolta, non ignorata.

_Nota:_ Caveat rilevante per la scelta 'un solo giudice Claude + segnali deterministici': i risultati valgono su task di CLASSIFICAZIONE (3 dataset NLI con 100 annotazioni umane per item) e gli autori dichiarano esplicitamente che NON generalizzano a "open-ended generation evaluation or code review" — cioè proprio il tipo di giudizio (critica visiva/copy aperta) usato in Site-factory. Il claim è confermato così com'è formulato, ma come supporto architetturale è un'estrapolazione dichiarata fuori scope dal paper stesso. La direzione (errori correlati tra vendor → panel multi-vendor sopravvalutato, miglior giudice singolo sufficiente) resta comunque l'evidenza migliore disponibile, e la scelta di affiancare segnali deterministici + voto umano è coerente con essa. Ulteriore limite dichiarato: "snapshot in time" dei modelli frontier attuali (mid-2026).

**Fonti:** <https://arxiv.org/abs/2605.29800> · <https://arxiv.org/html/2605.29800> · <https://machinelearning.apple.com/research/correlated-llm-evaluation-panels>

### La L.145/2018 (norma Boldi) vieta nella comunicazione sanitaria elementi promozionali/suggestivi, inclusi testimonial/endorsement e formule tipo 'visita gratuita e senza impegno', e impone l'indicazione del direttore sanitario nelle comunicazioni delle strutture

**Verdetto: partial**

Il nucleo del claim REGGE ed è vigente a oggi (testo Normattiva verificato 2026-07-10), ma l'attribuzione di due elementi alla L.145/2018 è imprecisa. (1) CONFERMATO: l'art. 1 comma 525 L.145/2018 (norma Boldi), come modificato nel 2023 dal DL 69/2023 conv. L.103/2023 (procedura infrazione UE 2018/2175), vieta nelle comunicazioni sanitarie «qualsiasi elemento di carattere attrattivo e suggestivo, tra cui comunicazioni contenenti offerte, sconti e promozioni»; consentite solo le informazioni ex art. 2 c.1 DL 223/2006 (titoli, caratteristiche del servizio, prezzi/costi complessivi). Si applica sia alle strutture sanitarie private sia ai SINGOLI iscritti agli albi, in qualsiasi forma giuridica (incluse società ex L.124/2017) — più ampio di quanto il claim suggerisce. Sanzioni (comma 536): procedimento disciplinare dell'ordine contro professionisti e società iscritte + segnalazione ad AGCOM; la fonte secondaria sbaglia parlando di 'sequestro 6 mesi' (la sospensione 6 mesi-1 anno ex art. 5 c.5 L.175/1992 riguarda l'autorizzazione amministrativa, per indicazioni false o mancata indicazione del direttore sanitario). (2) PARZIALE — testimonial e 'visita gratuita e senza impegno': NON sono nominati nella legge; il divieto discende dall'interpretazione consolidata degli organi disciplinari, che è però operativamente vincolante: raccomandazioni CAO testuali «Prestazione gratuita e formule equivalenti (es. visita senza impegno) risultano non consentite nel momento in cui vengono pubblicizzate» (erogare gratis è lecito, pubblicizzarlo no); linee guida di federazione (FNOVI, speculari a FNOMCeO) elencano tra la pubblicità promozionale vietata «sconti, coupon, offerte speciali, l'utilizzo di testimonial, campioni gratuiti, offerte on-line»; Codice deontologia medica artt. 55-57 (pubblicità mai promozionale/suggestiva, divieto di patrocinio a fini commerciali, no notizie che generino «spinte consumistiche»). (3) PARZIALE — direttore sanitario: l'obbligo di INDICARLO nelle comunicazioni delle strutture viene dalla L.175/1992 art. 4 c.2 («È in ogni caso obbligatoria l'indicazione del nome, cognome e titoli professionali del medico responsabile della direzione sanitaria»), tuttora vigente; la L.145/2018 comma 536 impone solo di DOTARSI di un direttore sanitario iscritto all'albo. CONSEGUENZE PER SITE-FACTORY (verticale sanitario: dentisti, studi medici, e per analogia veterinari): (a) la cortesia standard 'preventivo/visita gratuita e senza impegno' è VIETATA come messaggio pubblicitario — l'eccezione 'cortesie di norma di settore' del CLAUDE.md non vale per questo verticale; (b) sezione testimonial/recensioni con taglio suggestivo (pazienti felici, endorsement) ad alto rischio disciplinare — da escludere o degradare a informazione fattuale; (c) niente sconti/offerte/promozioni nel copy; (d) per le strutture, nome+cognome+titoli del direttore sanitario obbligatori nelle comunicazioni (footer del sito); (e) vale anche per il singolo professionista, non solo per le strutture. La blueprint-grammar per-settore deve codificare questi vincoli come bloccanti automatici del copy-critic.

_Nota:_ Verdetto 'partial' per rigore attributivo, ma per le decisioni di prodotto il claim va trattato come sostanzialmente vero: tutti i divieti citati esistono e sono applicati oggi (2026), solo che testimonial e visite gratuite sono vietati via interpretazione disciplinare degli ordini (CAO/FNOMCeO) del comma 525, e l'obbligo di indicare il direttore sanitario sta nella L.175/1992 art. 4, non nella L.145/2018. Nota: la modifica 2023 (L.103/2023) ha RAFFORZATO il divieto rendendo esplicito 'offerte, sconti e promozioni', e il Ministero della Salute ne ha difeso la compatibilità UE — nessun segnale di allentamento normativo.

**Fonti:** <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2018-12-30;145> · <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1992-01-01;175> · <https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2006-01-01;223~art2> · <https://www.odontoiatria33.it/approfondimenti/18132/queste-le-regole-da-seguire-per-una-informazione-sanitaria-corretta-la-cao-rilascia-le-raccomandazioni.html> · <https://www.fnovi.it/sites/default/files/_Pubblicit%C3%A0%20Sanitaria%20-%20LineeGuida%20-%20Appendice.pdf> · <https://ape.agenas.it/documenti/provider/medici_FNOMCEO_pubblicita_dell'informazione_sanitaria_Linee_Guida.pdf> · <https://www.ordinemedici.piacenza.it/notizie/notizie-dell-ordine/tutte-le-notizie/531-pubblicit%C3%A0-sanitaria,-legge-10-agosto-2023,-n-103-nota-del-ministero-della-salute.html>

### Firecrawl 'branding format' v2 restituisce in una chiamata colori già classificati semanticamente (primary, secondary, accent, background, textPrimary, textSecondary), typography, spacing, asset (logo/favicon) e colorScheme light/dark; esiste un piano free

**Verdetto: confirmed**

Il claim regge integralmente sui documenti ufficiali correnti (verificati 2026-07-10, docs scaricati verbatim, non riassunti da terzi).

1) SCHEMA — La pagina docs ufficiale dello scrape (sezione "/scrape (with branding) endpoint") mostra il JSON di esempio e la spec del `BrandingProfile`, verbatim: `colors` contiene esattamente `primary`, `secondary`, `accent`, `background`, `textPrimary`, `textSecondary` (più semantici `link/success/warning/error`); `colorScheme` è documentato come `"light"` o `"dark"`; `typography` con `fontFamilies` (primary/heading/code), `fontSizes` (h1-h3/body), `fontWeights`, `lineHeights`; `spacing` con `baseUnit`, `borderRadius`, `padding`, `margins`; `images` con `logo`, `favicon`, `ogImage` (più `logo` anche top-level). Bonus non nel claim: `components` (stili buttonPrimary/buttonSecondary/input), `icons`, `animations`, `layout`, `personality`. Tutto in UNA chiamata `/scrape` con `formats: ['branding']`, combinabile con markdown/screenshot nella stessa chiamata.

2) "V2" — Il blog post https://www.firecrawl.dev/blog/branding-format-v2 esiste, datato 6 feb 2026, e descrive il miglioramento (estrazione logo più affidabile + "color palette, typography, spacing scale, UI component styles"). Il post non elenca lo schema campo per campo, ma i docs correnti (punto 1) sì — quindi la sostanza del claim è coperta.

3) COSTO — Docs scrape: "Each scrape consumes 1 credit. Additional credits apply for certain options: JSON mode costs 4 additional credits... question/highlights 4... enhanced proxy 4... PII redaction 4... audio/video 4". Il formato branding NON è nell'elenco dei sovrapprezzi → uno scrape branding costa 1 credito (base).

4) FREE TIER — Pagina pricing (HTML grezzo): "free for 1,000 pages every month (1,000 free credits per month)", senza carta di credito, 2 richieste concorrenti, rate limit bassi. Piani a pagamento correnti (fatturazione annuale): Hobby $16/mese 5k crediti, Standard $83 100k, Growth $333 500k, Scale $599 1M.

Unica nota (non inficia il claim): non esiste una pagina docs dedicata `/features/branding` (404) — la documentazione vive dentro la pagina scrape. E il blog v2 da solo non basterebbe come fonte dello schema; la fonte vera è la docs page.

_Nota:_ Per il caso d'uso Site-factory: 1 credito/scrape con 1.000 crediti/mese gratis significa che l'intera fase di harvesting riferimenti per la fabbrica offline sta comodamente nel free tier (1.000 siti/mese). Il differenziale vs tool open source (classificazione semantica primary/accent già pronta per il blocco `brand` di site.json) è reale e documentato.

**Fonti:** <https://docs.firecrawl.dev/features/scrape> · <https://www.firecrawl.dev/blog/branding-format-v2> · <https://www.firecrawl.dev/pricing>

## Ricerche di chiusura (gap rilevati dal critico di completezza)


### Metriche di distanza e 'novelty gate' per la fabbrica offline: come misurare quantitativamente che un nuovo preset/variante è (a) abbastanza DIVERSO dagli asset già in libreria — embedding visivi su screenshot renderizzati (CLIP/DINOv2, LPIPS), distanza in token-space DTCG, soglie di near-duplicate — e (b) abbastanza DISTANTE dal riferimento sorgente da cui è stato ispirato, operazionalizzando il guardrail legale «distanza dalla fonte» emerso dalla ricerca legale (GEMA/TDM). Censire metodi, tool pronti e soglie usate in industria/letteratura e come innestarli come gate deterministico accanto al critico di qualità.


#### Il novelty gate richiede TRE famiglie di metriche distinte, non una: copy-detection, stile, struttura

La letteratura separa nettamente: (1) copy-detection — SSCD di Meta (github.com/facebookresearch/sscd-copy-detection, open source), addestrato apposta per riconoscere copie/derivazioni anche alterate, con GeM pooling e score normalization contro una distribuzione di background; (2) similarità di STILE — CSD (Contrastive Style Descriptors), CLIP fine-tuned su 512k immagini taggate per stile; (3) similarità SEMANTICA generica — CLIP/DINOv2, che risponde 'stesso soggetto', non 'stesso design'. Per la Site Factory: l'asse (b) 'distanza dalla fonte ispiratrice' è un problema di copy-detection (SSCD sui render vs screenshot del riferimento), l'asse (a) 'diverso dalla libreria' è un problema di stile+struttura. Usare CLIP da solo confonderebbe i due assi: due siti di ristrutturazioni avranno sempre alta similarità semantica (stesso soggetto) pur essendo design diversissimi.

**Rilevanza per la Site Factory:** Definisce l'architettura del gate: due assi, tre estrattori. SSCD per il guardrail legale verso la fonte; CSD+metrica strutturale per la varietà interna alla libreria. Tutti girano offline su screenshot renderizzati, zero API a pagamento.

**Fonti:** <https://www.emergentmind.com/papers/2202.10261> · <https://arxiv.org/html/2404.01292v1>

#### Gli embedding VLM generici COLLASSANO sugli screenshot di UI: cosine 0.94–0.96 tra design visivamente diversi

UISearch (arXiv 2511.19380, nov 2025) documenta il 'representation collapse': CLIP (varie taglie), SigLIP e DINOv2-large assegnano embedding quasi identici (cosine 0.94–0.96) a UI visivamente distinte, perché sono addestrati su categorie semantiche, non su differenze compositive. La loro soluzione: convertire lo screenshot in un grafo diretto di elementi UI (detection YOLO di 15 tipi, relazioni spaziali e di contenimento) e imparare embedding 128-d con un graph autoencoder contrastivo — distribuzione delle similarità ampia (media 0.18, dev.std 0.11, 2.7× più discriminativa). Il codice però NON è pubblico. Conseguenza pratica: la distanza di LAYOUT tra blueprint/varianti non va misurata con embedding di immagini ma su una rappresentazione strutturale — che la Site Factory ha già gratis: il site.json (ordine sezioni, varianti) e il vettore di token del preset.

**Rilevanza per la Site Factory:** Evita l'errore più probabile: un gate su cosine CLIP tra screenshot che approverebbe tutto (o niente) perché tutti i siti generati stanno a 0.95 tra loro. La distanza strutturale va calcolata in token/blueprint-space (deterministica, spiegabile): ad es. distanza pesata sul vettore DTCG (famiglia font, ratio scala, radius, ombre, spacing) + edit distance sull'ordine sezioni. Nessun tool DTCG-diff pronto è emerso dalla ricerca: va scritto in casa (~50 righe).

**Fonti:** <https://arxiv.org/html/2511.19380>

#### CSD dà soglie di stile pubblicate e codice pronto: <0.5 = stile assente, >0.8 = forte presenza

Il paper 'Measuring Style Similarity in Diffusion Models' (CSD) propone soglie esplicite sulla cosine similarity dei suoi descriptor: 'un punteggio sotto 0.5 indica assenza dello stile dell'artista, sopra 0.8 ne indica fortemente la presenza'. Il modello (ViT-B/L inizializzato da CLIP, embedding 1024-d) e il codice sono pubblici (github.com/learn2phoenix/CSD; pesi anche su HuggingFace yuxi-liu-wired/CSD). Tecnica utile riusabile: il 'General Style Similarity' — media degli embedding di più immagini di uno stesso stile come prototipo, contro cui misurare i candidati. Applicato alla fabbrica: prototipo = media degli screenshot delle pagine /anteprima/{preset}/ di ogni preset esistente; un candidato con CSD >0.8 verso il prototipo di meridian è un clone stilistico anche se i suoi hex sono diversi.

**Rilevanza per la Site Factory:** È il componente 'stile' del gate con numeri di partenza citabili: bocciare se CSD verso il preset di libreria più vicino supera ~0.8, e bocciare se CSD verso il riferimento sorgente supera la stessa banda. Gira in locale su GPU/CPU come script deterministico accanto al critico di qualità.

**Fonti:** <https://arxiv.org/html/2404.01292v1>

#### Le soglie di cosine grezze NON si trasferiscono: servono calibrazione a percentili e casi noti

Un paper 2026 ('When Style Similarity Scores Fail: Diagnosing Raw CSD Cosine') dimostra che le soglie assolute su CSD/embedding falliscono per maledizione della dimensionalità, hubness (alcuni embedding risultano simili a tutto) e dipendenza dal dominio. Rimedi proposti: (1) costruire una distribuzione di baseline da coppie che si SA essere non-copie, (2) convertire i punteggi in percentili o z-score rispetto a quella baseline, (3) validare la soglia su casi di copia noti, (4) accettare che non esiste soglia universale. Per la Site Factory la baseline è economica da costruire: tutte le coppie preset×preset esistenti (noti diversi), più coppie 'stesso preset, palette diversa' (noti quasi-uguali) — poche decine di screenshot renderizzati.

**Rilevanza per la Site Factory:** Trasforma il gate da 'numero magico' a procedura: prima run di calibrazione sulla libreria attuale (6 preset × sample = matrice di similarità nota), poi soglia fissata come percentile (es. 'boccia se il candidato è più simile al vicino di quanto lo siano il 95° percentile delle coppie note-diverse'). Deterministica, ri-calibrabile a ogni nuovo preset approvato.

**Fonti:** <https://arxiv.org/pdf/2605.09030>

#### Vendi Score: il KPI di diversità della libreria, senza dataset di riferimento — gate sul guadagno marginale

Il Vendi Score (VS) = esponenziale dell'entropia di Shannon degli autovalori della matrice di similarità (kernel PSD, es. cosine tra embedding): si interpreta come 'numero effettivo di elementi distinti'. VS=n se tutti dissimili, VS=1 se tutti cloni. È reference-free, ha codice pronto (github.com/vertaix/Vendi-Score, pip install), e funziona su collezioni piccole — con l'avvertenza che a n piccolo la scelta della funzione di similarità pesa molto. Gate operativo: calcolare VS della libreria (embedding CSD degli screenshot dei preset) prima e dopo l'aggiunta del candidato; se ΔVS ≈ 0 il candidato non aggiunge varietà reale, qualunque sia la sua qualità. Esempio concreto: 6 cloni di meridian con hue diverse darebbero VS≈1–2, non 6 — esattamente il caso che il critico di qualità non vede. Esiste anche la variante quality-weighted (qVS) per bilanciare qualità e diversità in un solo numero.

**Rilevanza per la Site Factory:** È la metrica di missione: 'quanti preset DAVVERO diversi ho?' diventa un numero in dashboard dell'editor. Il gate smette di essere solo pairwise (vicino più prossimo) e misura il contributo del candidato alla diversità complessiva. Costo: uno script numpy.

**Fonti:** <https://arxiv.org/html/2210.02410v2>

#### Tier deterministico a costo zero: dHash/pHash con Hamming ≤2 come pre-filtro anti-clone

Esperienza di produzione documentata (200k+ immagini): dHash a 128 bit (griglia 9×9 su scala di grigi), soglia di Hamming distance ≤2 bit per dichiarare near-duplicate; già a 4–5 bit comparivano falsi positivi. Velocissimo (confronti a milioni/secondo, XOR su interi). Punto chiave per la Site Factory: dHash lavora su luminanza, quindi è CIECO alla hue — un re-colour di meridian con palette diversa produce hash quasi identico e viene catturato subito, prima ancora di scomodare gli embedding. Non serve infrastruttura: sharp/imagemagick + 30 righe di Node nello stack già presente. Limite: non cattura cloni con layout uguale ma font/spacing diversi — per quello ci sono i tier CSD e token-space.

**Rilevanza per la Site Factory:** Primo stadio della pipeline del gate (ordine: dHash → token-space diff → CSD calibrato → Vendi ΔVS → critico visivo AI → umano). Boccia in millisecondi il caso peggiore e più probabile: la variante-fotocopia. Deterministico al 100%, perfetto accanto ai gate già deterministici del progetto (contrasto WCAG, formato copy).

**Fonti:** <https://benhoyt.com/writings/duplicate-image-detection/>

#### Ricetta novelty-search pronta: punteggio k-NN contro l'archivio, con qualità delegata a un giudice separato

Wander (arXiv 2511.00686, 2025) implementa novelty search per generazione di immagini diverse: novelty(x) = distanza cosine media dai k vicini più prossimi nell'archivio (embedding CLIP), pool a dimensione fissa dove un candidato entra solo se il suo punteggio di novelty supera il minimo del pool. La qualità NON è nel punteggio: è verificata separatamente (nel loro caso post-hoc; nel caso Site Factory dal critico visivo già esistente). È la formalizzazione esatta della fabbrica offline: l'AI propone varianti, il gate di novelty decide se il candidato 'merita un posto' rispetto a ciò che c'è già, il critico di qualità decide se è ben fatto — due giudizi ortogonali, mai fusi in un solo punteggio (fondere qualità e diversità in una media è l'errore classico: un clone bellissimo passerebbe).

**Rilevanza per la Site Factory:** Dà la formula del gate di libreria: novelty = media delle distanze (CSD calibrato + token-space, pesate) dai k=2–3 preset più vicini; soglia = percentile della baseline (finding 4). E dà il principio architetturale: gate di novelty e critico di qualità restano due passi separati della pipeline, in AND.

**Fonti:** <https://arxiv.org/html/2511.00686>

#### Il guardrail legale si operazionalizza come test di riconoscibilità + 'impressione generale', non come soglia numerica

GEMA v. OpenAI (Trib. Monaco I, 11/11/2025) usa come criterio la RICONOSCIBILITÀ dell'opera nell'output (le aggiunte/hallucination non salvano se la fonte resta riconoscibile); la dottrina richiama Pelham/CGUE: si esce dall'infrazione rendendo il materiale 'irriconoscibile'. Nessun tribunale ha fissato soglie quantitative. Per il design di siti, il test italiano/UE (design registrato, ma anche concorrenza sleale ex art. 102 l.d.a.) è l''impressione generale suscitata nell'utilizzatore informato', pesata su affollamento del settore e margine di libertà del designer (settore affollato = bastano differenze minori). Proxy operativo a tre livelli: (1) SSCD/dHash vs screenshot della fonte come lower bound duro (se un copy-detector scatta, un giudice riconoscerà la fonte a fortiori); (2) domanda esplicita al critico visivo AI: 'un utilizzatore informato di siti di questo settore ricaverebbe la stessa impressione generale?'; (3) log dell'audit come evidenza di diligenza.

**Rilevanza per la Site Factory:** Chiude il cerchio col guardrail 'distanza dalla fonte' della ricerca legale: il gate verso il riferimento sorgente usa le stesse metriche del gate di libreria ma con logica inversa (deve essere LONTANO) e si documenta nei termini che un giudice usa (riconoscibilità, impressione generale), rendendo l'audit trail della fabbrica anche un artefatto difensivo.

**Fonti:** <https://legalblogs.wolterskluwer.com/copyright-blog/copyright-in-formaldehyde-how-gema-v-openai-freezes-doctrine-and-chills-ai-part-1/> · <https://www.interpatent.it/post20180427/>

### Ingegneria delle varianti di layout nel renderer Astro e QA della matrice combinatoria. Due sotto-domande: (1) pattern implementativo delle varianti di sezione — prop `variant` vs componenti separati vs quanta varietà di layout può vivere nei SOLI token con CSS moderno (grid-template-areas per data-preset, container queries, :has) senza toccare markup, rispettando il vincolo 'zero markup per preset'; (2) tooling di visual regression (Playwright screenshot-diff, Lost Pixel, Argos, BackstopJS, Chromatic: costi 2026, local-first, DX) per tenere sotto controllo presets × varianti × blueprint × viewport a ogni modifica di componente o token.


#### Prop `variant` enum: il pattern già in uso è quello giusto — serve solo una regola di split esplicita

Il renderer ha già il pattern corretto: 13 sezioni con `variant: z.enum([...])` in schema.ts e switch condizionale nel componente (es. FeatureHighlight: `variant` = lato foto → classe/ordine). È l'idioma Astro consolidato: interfaccia `Props` tipizzata con union literal, destructuring con default, `class:list` per classi condizionali — niente CVA/Tailwind necessari. Il consenso di settore (design system Figma/coded): varianti per variazioni visive dello STESSO contenuto; componente separato quando struttura e logica divergono. Regola operativa per la Site Factory: una variante è legittima finché consuma gli stessi slot (stessa shape Zod dei dati); se un layout richiede campi contenuto diversi, è un nuovo tipo di sezione nella union discriminata. Così le varianti restano gratis per la pipeline AI (un enum in più in slots.json) e non moltiplicano il contratto dati.

**Rilevanza per la Site Factory:** Non serve rifattorizzare: estendere gli enum esistenti (es. Hero A/B/C → D) e documentare la regola di split in DESIGN.md. Ogni variante nuova = 1 valore enum + 1 ramo di classi nel componente + 1 esempio nel blueprint, mai un file nuovo finché gli slot coincidono.

**Fonti:** <https://www.kristiannielsen.com/blog/how-to-make-reusable-components-with-astro/>

#### Layout-nei-token via `[data-preset]` + grid-template-areas: molta varietà di layout vive in CSS puro, supporto universale

grid-template-areas permette di riarrangiare COMPLETAMENTE una sezione (ordine visivo, colonne, posizioni) cambiando solo una stringa CSS, markup identico: `"thumb content"` → `"content thumb"` inverte il layout; tre disposizioni diverse di un header si ottengono ridefinendo solo le aree. global.css ha già ~20 override `[data-preset]`: la stessa cascata può portare layout, non solo estetica — basta che i componenti nominino le aree (`grid-area: media/heading/body/cta`) e ogni preset ridefinisca `grid-template-areas` in fondo a global.css. Funziona in ogni browser, oggi. Gotcha verificati: le aree devono essere rettangolari; l'ordine visivo diverge dal DOM (l'ordine sorgente resta quello logico per screen reader — non riordinare contenuti interattivi); `:has()` consente layout condizionali (es. figure senza figcaption).

**Rilevanza per la Site Factory:** Il vincolo 'zero markup per preset' regge anche per il layout: un preset può avere hero a colonne invertite o header impilato senza toccare i componenti. È l'estensione più economica del terzo asse: costo ≈ righe CSS in global.css, zero nuovi file, zero modifiche a schema/blueprint.

**Fonti:** <https://ishadeed.com/article/css-grid-area/>

#### Style queries sui custom property: layout token-nativo, Baseline maggio 2026 — ma non ancora per siti PMI in produzione

`@container style(--hero-layout: split) { ... }` fa reagire i discendenti al VALORE di un token: la variante di layout viaggia nel custom property, non in classi/attributi. Meccanica verificata su MDN: si interroga sempre il CONTENITORE antenato, mai se stessi (ok per le sezioni: il wrapper porta il token, la griglia interna lo interroga); tutti gli elementi sono style container di default; con `@property` + `syntax` il confronto diventa semantico. Supporto (caniuse, luglio 2026): Chrome/Edge 111+, Safari 18+, Firefox solo dalla 151 (maggio 2026) — Baseline 'newly available', 88,4% globale. Per siti vetrina pubblici di PMI è prematuro: un Firefox ESR o Safari 17 vedrebbe il layout di fallback.

**Rilevanza per la Site Factory:** Oggi il meccanismo primario resta l'attributo (`data-preset`/`data-variant`, supporto 100%); le style queries sono la via token-nativa da adottare tra 12-18 mesi, quando Baseline diventa 'widely available'. Decisione pratica: architettare le aree grid ora (finding 2), così migrare da selettori-attributo a style() sarà un rename, non un redesign.

**Fonti:** <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_size_and_style_queries> · <https://caniuse.com/mdn-css_at-rules_container_style_queries_for_custom_properties>

#### Primitive di layout intrinseche (Every Layout) comprimono la matrice varianti × viewport

La filosofia Every Layout (Pickering/Bell): comporre da primitive auto-governanti (Stack, Cluster, Sidebar, Switcher) che si riconfigurano in base allo spazio disponibile e alla larghezza intrinseca del contenuto, senza media query — i breakpoint diventano override manuali, non requisiti. Una sezione composta da primitive intrinseche funziona a ogni viewport SENZA varianti mobile/tablet/desktop separate: la 'variante' si riduce a un token (soglia di switch, measure, gap). Conseguenza diretta sulla QA: se il layout è intrinseco, la dimensione viewport della matrice di test si riduce a 2-3 punti di controllo (390px per le parole italiane lunghe, ~768, desktop) invece di dover certificare ogni breakpoint per ogni variante.

**Rilevanza per la Site Factory:** Quando si scrivono le nuove varianti di sezione, costruirle come composizioni intrinseche (flex-wrap + flex-basis soglia, grid auto-fit) anziché con media query per-variante: ogni media query aggiunta è una cella in più nella matrice di regression. Coerente con la scala tipografica fluida già in uso (clamp).

**Fonti:** <https://every-layout.dev/rudiments/composition/>

#### Playwright toHaveScreenshot è la base local-first: i 'projects' SONO la matrice preset × viewport

Workflow verificato sui doc: baseline in repo (`[nome]-[project]-[piattaforma].png`), aggiornamento con `--update-snapshots`, tolleranze `maxDiffPixels`/`maxDiffPixelRatio`, `stylePath` per neutralizzare elementi dinamici, `mask` per zone volatili. Punto chiave: col multi-project il nome del project sostituisce il browser nel filename → definire un project per cella (es. `meridian-390`, `nova-1280`) genera e confronta l'intera matrice con un solo comando. Il rendering varia per OS/hardware: baseline generate in CI o nell'immagine Docker ufficiale Playwright, mai miste. Per la Site Factory: screenshot per-sezione (element locator su `/anteprima/{preset}/`), non full-page — segnale di failure più chiaro, meno flake. Bonus: la regola 'niente animazioni in-page' (decisione 2026-07-03) rende gli screenshot naturalmente deterministici.

**Rilevanza per la Site Factory:** Costo zero, gira in locale (vincolo no-API rispettato), baseline versionate in git accanto ai componenti. Stima matrice attuale: 6 preset × 15 sezioni × ~2 varianti × 3 viewport ≈ 500-550 shot per run — banale per Playwright locale, e `--grep @visual` la tiene fuori dalla pipeline funzionale.

**Fonti:** <https://playwright.dev/docs/test-snapshots>

#### Mercato VRT ripulito nel 2026: Lost Pixel è morto, BackstopJS dormiente — la shortlist reale è Playwright / Argos / Chromatic

Verificato sui repo: lost-pixel/lost-pixel è stato ARCHIVIATO il 22 aprile 2026 (read-only, ultima release v3.22.0 di novembre 2024) — il team è passato a Figma e il prodotto è in sunsetting; qualunque guida 2024-2025 che lo raccomanda è obsoleta. BackstopJS: ultima release v5.0.2 del luglio 2023, nessuna release da ~3 anni — funziona ancora per siti statici ma è in fase dormiente, da non adottare per infrastruttura nuova nel 2026 (i blog che lo dicono 'actively maintained' sono smentiti dalla pagina release). Restano tre opzioni vive: Playwright nativo (local-first, gratis), Argos (open-core, cloud review), Chromatic (managed, Storybook-first).

**Rilevanza per la Site Factory:** Evita due vicoli ciechi: non investire in config BackstopJS né in Lost Pixel OSS mode. La decisione si riduce a: Playwright da solo basta? (sì per iniziare) — e se serve review UI, Argos è l'unico complemento open-core sopravvissuto.

**Fonti:** <https://github.com/lost-pixel/lost-pixel> · <https://github.com/garris/BackstopJS/releases>

#### Argos: il complemento cloud se serve una review UI — free 5.000 screenshot/mese, Pro $100/mese

Prezzi verificati (luglio 2026): Hobby gratis fino a 5.000 screenshot/mese; Pro $100/mese con 35.000 inclusi, overage $0,004/screenshot ($0,0015 Storybook); programma sponsorship open source. Integrazione Playwright verificata: helper `argosScreenshot` con stabilizzazione integrata (launchOptions che disabilitano subpixel/font hinting per rendering identico locale/CI), baseline nel cloud Argos confrontate per branch di riferimento (niente PNG in repo), review UI su PR GitHub/GitLab. Dettaglio interessante per la fabbrica offline: espone 'agent-ready CLI & REST API' fin dal piano gratuito — i diff sono interrogabili programmaticamente. Con la matrice stimata (~540 shot/run) il free tier copre ~9 run completi al mese; il Pro ne copre ~65.

**Rilevanza per la Site Factory:** Percorso a due stadi: partire con Playwright puro (gratis, locale); passare ad Argos quando l'approvazione umana dei diff diventa il collo di bottiglia della fabbrica offline — la REST API permetterebbe al critico visivo AI di leggere i diff come input, trasformando la regression in segnale per il loop genera→critica.

**Fonti:** <https://argos-ci.com/pricing> · <https://argos-ci.com/docs/quickstart/playwright-quickstart.md>

#### Chromatic + storybook-astro: tecnicamente possibile, ma ridondante e costoso per questo renderer

Chromatic (prezzi verificati luglio 2026): free 5.000 snapshot/mese solo Chrome; Starter $179/mese per 35.000 snapshot, overage $0,008 — quasi il doppio di Argos a parità di volume. Richiede Storybook: oggi esiste `@storybook-astro/framework`, community framework che renderizza .astro server-side in Storybook 10 (Astro 5/6, demo per 7), con `composeStories` per test Vitest — ma è mantenuto da 4 contributor, giovane. Il valore centrale di Chromatic (isolare i componenti in story) è già duplicato dalla pagina `/anteprima/{preset}/`, che è di fatto la 'story' dell'intera libreria e in più esercita la cascata di token reale su `<html>`, cosa che l'isolamento Storybook renderebbe artificiosa.

**Rilevanza per la Site Factory:** Da scartare per la QA della matrice: costo doppio, dipendenza da un framework community giovane, e beneficio già coperto da /anteprima. storybook-astro resta interessante solo come eventuale futuro ambiente di sviluppo componenti, non come infrastruttura di regression.

**Fonti:** <https://www.chromatic.com/pricing> · <https://storybook-astro.org/>

### La funzione di assegnazione runtime cliente→design: come mappare contesto.json (settore, tono, personalità di brand dichiarata nel form) su preset+blueprint+varianti. Cercare framework validati personalità→attributi visivi (Aaker brand personality, studi di congruenza tipografica/cromatica, il mapping personality di Squarespace oltre i font), definire lo schema di annotazione/metadati che ogni asset di libreria deve portare per essere selezionabile in modo deterministico, e la policy anti-collisione intra-portafoglio: due clienti concorrenti stesso settore+città non devono ricevere siti quasi identici (esclusività di combo preset+palette per mercato locale, tracking delle assegnazioni).


#### Esiste un framework validato Aaker→(colori, tipografia, forme): usarlo come spina dorsale del mapping

Andrade, Morais e Soares de Lima (Int. J. of Visual Design, 2024) assegnano set di elementi visivi alle 5 dimensioni Aaker e li validano su N=127: Sincerity = bianco/giallo/rosa + monospaced o decorative + forme organiche/circolari; Excitement = rosso/arancio/giallo + sans serif o decorative + triangolo/spirale; Competence = blu/marrone + serif + quadrato; Sophistication = nero/viola/rosa + script + cerchio; Ruggedness = marrone/verde + display pesante + triangolo. Nel test, 8 identità su 10 sono state riconosciute correttamente come prima scelta (Competence 40-44%, Sophistication 46-52%, Ruggedness 43-46%, Excitement fino a 67%); Sincerity è la dimensione più difficile da comunicare visivamente. Il paper avverte: non serve usare TUTTI gli elementi, basta aumentarne la presenza relativa.

**Rilevanza per la Site Factory:** Le 5 dimensioni Aaker diventano il vocabolario pivot della Site Factory: contesto.json esprime la personalità dichiarata nel form come vettore a 5 punteggi (primaria+secondaria), e ogni preset/variante in libreria porta lo stesso vettore nei metadati. Il matching è allora una similarità tra vettori, deterministico e spiegabile. La tabella del paper è direttamente la guida per annotare i 6 preset esistenti (es. meridian≈Competence, nova≈Excitement/Sophistication, terra≈Ruggedness/Sincerity) e per la fabbrica offline di nuovi preset.

**Fonti:** <https://edirlei.com/papers/The-personality-of-visual-elements-2024.pdf>

#### Colore: l'hue fissa la dimensione, saturazione e lightness sono manopole di amplificazione indipendenti

Labrecque & Milne (JAMS 2012, 4 studi) mappano gli hue sulle dimensioni Aaker (blu→competenza, rosso→eccitazione, ecc., riportati in Tabella 1 del paper 2024) e — punto meno noto ma più utile — dimostrano in Studio 2 che saturazione e value modulano i tratti a prescindere dall'hue: alta saturazione aumenta la percezione di excitement (β=.204), alto value (colori chiari) riduce ruggedness (β=-.344). Studio 3 mostra che il colore può alterare strategicamente la personalità percepita e l'intenzione d'acquisto.

**Rilevanza per la Site Factory:** Per la palette-designer skill: quando il cliente impone i propri colori (caso frequente), l'hue non si tocca ma S/L diventano i gradi di libertà per allineare la palette al tono del contesto.json — un impiantista 'solido e affidabile' vuole saturazioni contenute e value medio-bassi, un'impresa 'giovane e dinamica' saturazioni alte. Regola codificabile deterministicamente in check aggiuntivi accanto al gate WCAG già esistente, e utile anche come asse anti-collisione (stesso hue, bucket S/L diversi).

**Fonti:** <https://laurenlabrecque.com/2023/01/02/exciting-red-and-competent-blue-the-importance-of-color-in-marketing/> · <https://edirlei.com/papers/The-personality-of-visual-elements-2024.pdf>

#### Tipografia: le categorie e il peso del tratto hanno mapping di personalità consistenti in letteratura

La sintesi della letteratura (Henderson/Giese/Cote 2004; Shaikh 2006-07; McCarthy & Mothersbaugh 2002, riassunta nel paper 2024): serif→professionale/formale/stabile (Competence); sans serif→pulito/moderno (neutro, tende a Excitement); script corsivo→elegante/drammatico (Sophistication); monospaced→semplicità/purezza (Sincerity); display a tratto spesso→maschile/ruvido/forte (Ruggedness); lettere arrotondate→giovane/amichevole (Sincerity+Excitement, effetto 'baby-face bias'). Trasversale: tratto pesante = forte/aggressivo, tratto fine = delicato/raffinato; la caratteristica fisica pesa più della categoria nominale (Comic Sans è script ma percepito friendly/unprofessional). Henderson et al. riducono tutto a 6 dimensioni di design misurabili: elaborate, harmony, natural, flourish, weight, compressed.

**Rilevanza per la Site Factory:** I font di ogni preset sono già fissati: annotarli con categoria+peso permette di DERIVARE il vettore Aaker del preset invece di assegnarlo a intuito, rendendo l'annotazione ricalcolabile. Per la fabbrica offline, la tabella è il vincolo di generazione: un preset 'per idraulici' non può montare script leggeri; il critico visivo può verificare la congruenza tipografia↔personalità dichiarata come check di rubrica.

**Fonti:** <https://edirlei.com/papers/The-personality-of-visual-elements-2024.pdf>

#### Squarespace Blueprint valida l'architettura 'catalogo curato + selezione' e ne dà la scala giusta: 7 personalità × opzioni finite

Blueprint AI usa esattamente 7 brand personality (Professional, Playful, Sophisticated, Friendly, Bold, Quirky, Innovative). Ogni personalità ha 2 font pairing curati da designer umani (14 font totali) e 4 palette colore curate; l'utente sceglie la personalità al passo 1 e il sistema FILTRA il catalogo — l'AI non genera design, e i contenuti AI sono pre-vagliati dal team di design interno. Wix ha lo stesso pattern (ADI→Harmony): domande su settore + preferenza di stile → assemblaggio da kit curati per nicchia. Il claim 'miliardi di combinazioni' nasce dal prodotto cartesiano di poche scelte curate, non da generazione libera.

**Rilevanza per la Site Factory:** Conferma la strategia ibrida della Site Factory ed evita l'over-engineering: al form Tally bastano ~7 etichette di personalità comprensibili da una PMI; a runtime la selezione è un filtro su metadati con 2-4 opzioni valide per etichetta, non un ranking sofisticato. La varietà commerciale percepita nasce dal prodotto preset × palette × varianti, quindi conviene investire nel numero di assi combinabili più che nel numero di preset.

**Fonti:** <https://www.websitebuilderexpert.com/website-builders/squarespace-blueprint-ai/> · <https://www.squarespace.com/blog/starting-a-website-with-squarespace-blueprint>

#### Schema di annotazione: il pattern 'agentic design system' definisce i campi che ogni asset di libreria deve portare

La pratica emergente 2025-26 (nessuno standard formale ancora; un W3C community group ci sta lavorando) è un JSON di metadati co-locato per ogni componente/asset con: identity/category, purpose (una frase d'intento), variants con giustificazione per ciascuna, tokens consumati, commonPatterns/useCases, antiPatterns ESPLICITI (cosa l'agente non deve mai fare), relationships (vincoli di contesto/parent), e aiHints.selectionCriteria per scegliere tra varianti. Il punto chiave: i token dicono all'agente i valori giusti, ma non QUALE asset scegliere né quando evitarlo — serve il layer di reasoning per-asset sopra i token.

**Rilevanza per la Site Factory:** Schema proposto per ogni preset/variante/blueprint della Site Factory, da decidere ORA prima di popolare la libreria: vettore Aaker (5 punteggi), settori consigliati e antiPatterns settoriali (es. 'nova: mai per artigiani tradizionali'), requisiti di contenuto (min foto reali, n° servizi per la variante card), vincoli di combinazione (hero full-bleed richiede immagine ≥X), selectionCriteria testuali per il caso ambiguo. Speculare a slots.json già esistente: stesso principio 'contratto machine-readable', esteso dal copy al design.

**Fonti:** <https://designproject.io/blog/agentic-design-system/>

#### Anti-collisione: la 'market exclusivity' con cap per dimensione città è pratica commerciale consolidata e copiabile

GBC Digital Marketing (agenzia USA per contractor edilizi) pubblica la policy: sotto 500k abitanti 1 solo cliente per mestiere, 0,5-2M fino a 2, oltre 2,1M fino a 3 — 'hard caps, not targets'. Quando coesistono più clienti stesso mestiere in una metro area, li differenzia per: entry-point di servizio (riparazione vs sostituzione vs specialità), priorità geografiche (quartieri diversi), messaggi e prove distinti (foto, recensioni, punti di forza), strategie di conversione diverse. Forbes Agency Council raccomanda di definire l'esclusiva in modo niche (prodotti/servizi specifici, non interi settori) e gestirla con trasparenza contrattuale. Anche in Italia alcune agenzie dichiarano 'esclusiva merceologica e territoriale'.

**Rilevanza per la Site Factory:** Policy diretta per la Site Factory: chiave di mercato = (macro-settore da contesto.json, bacino territoriale — comune o provincia per città piccole). Registro assegnazioni (es. assignments.json in editor, per cliente: preset, hue-bucket della primary, variante hero, blueprint) consultato dallo step di assegnazione: nello stesso mercato vietata la stessa combo preset+hue-bucket; a parità inevitabile, differenziare nell'ordine palette → varianti sezione/hero → preset, replicando la scala di differenziazione GBC. Il cap è anche un argomento di vendita ('esclusiva di zona').

**Fonti:** <https://gbcdigitalmarketing.com/market-exclusivity-for-contractors/> · <https://www.forbes.com/sites/forbesagencycouncil/2019/04/01/managing-the-thin-line-of-client-exclusivity/>

#### La funzione di assegnazione può essere interamente deterministica: filtro → punteggio → anti-collisione → tie-break con seed

Sintesi operativa dai sistemi osservati (Blueprint e ADI sono di fatto filtri su cataloghi taggati): (1) hard filter sui metadati — settore vietato negli antiPatterns, requisiti di contenuto non soddisfatti (niente foto reali → varianti photo-heavy escluse), colori imposti dal cliente incompatibili col preset; (2) scoring = distanza tra vettore Aaker del contesto.json e vettore dell'asset (somma pesata, primaria×2); (3) check sul registro anti-collisione del mercato; (4) tie-break deterministico con seed = slug cliente, così la stessa run produce sempre lo stesso risultato ed è riproducibile/testabile. L'AI serve solo a monte (derivare il vettore personalità dal form, già compito del context-enricher) e come fallback sui casi a punteggio ambiguo.

**Rilevanza per la Site Factory:** Coerente con l'architettura non negoziabile: lo step 'design-assignment' dell'editor può essere puro TypeScript come il gate di copertura — niente claude -p a runtime per la scelta, zero drift, spiegabilità totale ('scelto terra perché Ruggedness 2/2 e nova vietato per il settore'). Il costo è solo tenere aggiornati i metadati, che è comunque il prerequisito di qualsiasi alternativa.

**Fonti:** <https://www.squarespace.com/blog/starting-a-website-with-squarespace-blueprint> · <https://www.websitebuilderexpert.com/website-builders/squarespace-blueprint-ai/> · <https://designproject.io/blog/agentic-design-system/>

#### Kansei Engineering: la procedura ripetibile per calibrare i mapping quando la factory entra in un nuovo settore

Il metodo (origine giapponese, applicato al web design in studi 2024-25): (1) raccogliere aggettivi affettivi del dominio da utenti/esperti/letteratura ('affidabile', 'elegante', 'innovativo'…); (2) ridurli per clustering a ~15 coppie bipolari; (3) far valutare campioni di siti renderizzati su scale a differenziale semantico a 5 punti; (4) PCA per estrarre le dimensioni emotive dominanti; (5) incrociare le feature di design (saturazione, dimensione font, densità, n° colori) con i rating per ottenere una matrice feature→emozione come deliverable. Nel caso studio trasporti: alta saturazione→bello/innovativo, tipografia grande e variata→completo/affidabile.

**Rilevanza per la Site Factory:** È il protocollo per la fabbrica offline quando arriveranno ristoranti/studi medici/estetica: le kansei words del settore (derivabili da form clienti reali + critico AI) diventano metadati della grammatica di settore, e il critico visivo può fare da 'campione' valutando i preset renderizzati sulle scale bipolari invece di applicare mapping generici. Con pochi clienti reali per settore, il giudizio AI multi-run sostituisce il panel di consumatori come proxy economico — da validare a campione con l'audit umano.

**Fonti:** <https://arxiv.org/html/2405.03223v1>

### L'art direction delle immagini come asse di varietà del preset: come design system e builder codificano lo stile fotografico/illustrativo per tema (trattamenti duotone/overlay/grain come token CSS applicati alle foto, scelta fotografia vs illustrazione vs 3D come attributo di tema), e come legare per-preset un 'frammento di stile' riusabile ai prompt FLUX.2 della pipeline immagini esistente (skill image-prompt-generator/image-critic) — così che nova produca immagini dark/moody e terra calde/artigianali — incluse le voci da aggiungere alla rubrica dell'image-critic per verificare la coerenza immagine↔preset.


#### Il trattamento foto come token di tema è un pattern industriale consolidato (WordPress theme.json duotone)

WordPress codifica i duotone come preset per-tema in theme.json: `settings.color.duotone` è un array di `{colors: [ombra, luce], name, slug}`; il filtro è applicato via SVG filter + proprietà CSS `filter`, senza toccare il file immagine. WordPress genera classi/proprietà per ogni preset (`--wp--preset--duotone--{slug}`), con un limite noto: il duotone WP non accetta custom properties dinamiche (issue aperta). La guida ufficiale consiglia immagini ad alto contrasto, colori analoghi per effetti sottili sotto testo, complementari per effetti vibranti. È la prova che 'trattamento fotografico = token del tema' è già grammatica dei builder, non un'invenzione.

**Rilevanza per la Site Factory:** Aggiungere alla cascata di global.css un token per-preset di trattamento immagine applicato in `.media-frame`/`.hero-overlay` (es. nova = duotone scuro, terra = overlay caldo + grain, meridian = neutro). Vantaggio decisivo: il trattamento CSS uniforma anche le foto reali del cliente, non solo quelle generate.

**Fonti:** <https://wordpress.org/news/2021/05/coloring-your-images-with-duotone-filters/> · <https://developer.wordpress.org/themes/global-settings-and-styles/settings/color/>

#### Tecniche CSS/SVG concrete: duotone via blend-mode (parametrico sulla palette) e grain via feTurbulence

Duotone senza asset: contenitore con immagine + pseudo-elementi `::before/::after` colorati e `mix-blend-mode` (darken sulle luci, lighten sulle ombre — tecnica Una Kravets/colofilter.css, descritta da José M. Pérez). A differenza del duotone WP, questa via accetta `var(--brand-primary)`: il trattamento si adatta da solo alla palette cliente. Grain: `feTurbulence type=fractalNoise` con `baseFrequency` 0.02–0.2 e `numOctaves` 2–5, inline come data-URI (compatibile con siti statici, zero richieste). Codrops avverte: filtri animati su aree grandi costano molto — ma la Site Factory vieta già le animazioni in-page, quindi il grain statico è a costo quasi nullo. Attenzione WCAG: il color mapping riduce il contrasto del testo sovrapposto.

**Rilevanza per la Site Factory:** Implementazione diretta dei token di trattamento nel renderer: tutta CSS, parametrica su primary/accent, per-preset in fondo a global.css come gli altri re-skin. Serve però estendere il guardrail AA esistente al testo su immagini trattate.

**Fonti:** <https://jmperezperez.com/blog/duotone-using-css-blend-modes/> · <https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/>

#### I brand system reali codificano i trattamenti foto come regole nominate con divieti espliciti (Univ. of Oregon)

Il brand system di UOregon definisce 4 trattamenti nominati — color overlay, monotone/duotone, selective color, texture/noise — con specifiche tecniche precise (grayscale → overlay colore brand al 100% + secondo layer al 60%; noise gaussiano monocromatico 'sottile') e un divieto assoluto: 'Do not place brand colors over images of people' — le persone restano full-color o grayscale. I trattamenti si applicano a edifici, natura, texture. Il pattern generale: ogni trattamento ha colori ammessi, opacità prescritte e casi d'uso/divieti.

**Rilevanza per la Site Factory:** Modello per la spec di ogni preset: non basta 'nova = duotone', servono le regole d'uso. Il divieto sulle persone è critico per l'edilizia (foto di operai/artigiani nei siti): duotone/overlay pieno solo su cantieri, materiali, dettagli — mai su volti. Questa regola va sia nella scelta CSS (quali sezioni trattare) sia come voce bloccante della rubrica image-critic.

**Fonti:** <https://communications.uoregon.edu/uo-brand/visual-identity/photo-color-treatments>

#### La 'photography spec' per-preset: gli assi da fissare li dà GitLab Pajamas

GitLab codifica la fotografia on-brand su assi riusabili: categorie di soggetto (ritratti eye-level su fondo neutro, metafore top-down su texture/pattern, collaborazione over-the-shoulder), luce (naturale, morbida), profondità di campo (shallow per togliere distrazioni), grading (minimo, 'no unnatural hues', no effetti cinematic), autenticità (candid, no pose teatrali), più do/don't verificabili. È esattamente la struttura di un attributo di tema: soggetto + angolo + luce + grading + mood.

**Rilevanza per la Site Factory:** Definire per ognuno dei 6 preset una photography spec su questi 5 assi, salvata accanto ai token (es. in presets.ts o file affiancato): nova = low-key/notturno/contrasto alto/superfici riflettenti; terra = luce calda radente/materiali/mani al lavoro/macro texture; atelier = alta chiave/negative space/still minimali; canon = editoriale/still-life composto. La spec alimenta sia il frammento di prompt sia la rubrica del critico — una sola fonte di verità.

**Fonti:** <https://design.gitlab.com/brand-design/photography/>

#### Il frammento di stile FLUX.2: JSON con style/lighting/color_palette + riferimenti camera/pellicola per il mood

La guida ufficiale BFL dà le leve esatte: (1) prompting JSON strutturato con campi dedicati `style`, `lighting`, `color_palette` (array di hex) per workflow di produzione; (2) l'ordine conta — subject → action → style → context, il modello pesa di più ciò che viene prima; (3) hex sempre ancorati a oggetti ('the car is #FF0000', mai 'use #FF0000 somewhere'), meglio con nome descrittivo ('matte terracotta #C4725A'); (4) il mood si controlla con riferimenti camera/film stock: 'Kodak Portra 400, natural grain, organic colors' = analogico caldo (→ terra), 'Sony A7IV, clean sharp, high dynamic range' = moderno pulito (→ meridian), low-key + tre punti luce descritti = dark/moody (→ nova).

**Rilevanza per la Site Factory:** Il 'frammento di stile per-preset' diventa un oggetto JSON {style, lighting, film_reference, mood, color_palette} derivato dalla photography spec; image-prompt-generator lo inietta dopo soggetto e azione in ogni prompt, con gli hex della palette cliente ancorati a elementi concreti della scena.

**Fonti:** <https://docs.bfl.ml/guides/prompting_guide_flux2>

#### BFL pubblica skill ufficiali (flux-best-practices) e il multi-reference rende lo stile del preset un asset, non solo testo

Il repo github.com/black-forest-labs/skills contiene skill in spec agentskills.io (compatibili Claude Code): 'flux-best-practices' (guida per modello klein/max/pro/flex/dev e per use case T2I/I2I/multi-ref/tipografia, JSON prompting, hex, niente negative prompt) e 'bfl-api' (polling, rate limit, webhook). Inoltre l'API [pro] accetta fino a 8 immagini di riferimento (~9MP totali) con ruoli assegnati nel prompt: la via più robusta alla coerenza stilistica secondo la guida — il pattern 'Style Elements' di mercato usa 8–15 reference proprio perché il testo da solo soffre di color variance e lighting drift.

**Rilevanza per la Site Factory:** Due mosse: (a) allineare/sincronizzare la skill image-prompt-generator alle best practice ufficiali BFL; (b) nella fabbrica offline, per ogni preset curare 2–4 immagini 'canone' approvate dall'umano e passarle come reference multi-ref nelle generazioni successive — lo stile smette di dipendere solo dalla fedeltà del prompt.

**Fonti:** <https://github.com/black-forest-labs/skills> · <https://docs.bfl.ml/guides/prompting_guide_flux2>

#### Rubrica image-critic per coerenza immagine↔preset: gate pass/fail prima, scale ancorate poi, verdetto a congiunzione

Il cookbook OpenAI sugli image evals dà il metodo: prima gate binari non negoziabili, poi metriche graduate con ancore concrete per punteggio; un criterio per campo JSON (mai giudizi composti); reference images incluse nell'input del judge; verdetto per congiunzione ('FAIL se qualsiasi metrica ≤ 2'), mai per media — così un'alta qualità visiva non maschera un gate fallito; anchor examples periodici contro il drift del valutatore. Voci da aggiungere alla rubrica esistente: GATE (a) medium conforme al preset (foto/illustrazione/3D dichiarato), (b) divieti del trattamento (es. niente duotone/overlay pieno su volti); SCALA 0–2 (c) chiave di luce e mood conformi alla photography spec del preset, (d) dominanti cromatiche nella gamma (hex ancorati), (e) compatibilità col trattamento CSS a valle — se il preset applica overlay scuro, l'immagine non deve già essere scura (doppio scurimento) né avere grain se il CSS lo aggiunge.

**Rilevanza per la Site Factory:** Estensione diretta della skill image-critic: stesso formato 0/1/2 già in uso, con la photography spec del preset passata come input del giudizio e le immagini 'canone' come reference visiva.

**Fonti:** <https://developers.openai.com/cookbook/examples/multimodal/image_evals> · <https://design.gitlab.com/brand-design/photography/>

#### Validare il frammento di stile su soggetti diversi PRIMA di lockarlo in libreria (failure modes noti del testo-solo)

La letteratura di settore (getimg.ai, 2026) identifica tre failure mode del solo prompt testuale per la coerenza: color interpretation variance (stesso hex reso diverso tra run), lighting drift (descrizioni con più interpretazioni valide), compositional defaults (inquadrature che regrediscono alla media del modello). Il rimedio prescritto: testare lo 'style element' su soggetti eterogenei — prodotto, lifestyle, ritratto — prima dell'uso in produzione, e usare reference varie (8–15, mai quasi-identiche) che mostrino l'estetica su scene e proporzioni diverse.

**Rilevanza per la Site Factory:** Procedura per la fabbrica offline già decisa: un frammento di stile per-preset non entra in libreria finché non è stato provato su hero + card servizio + gallery di almeno 2–3 settori diversi (cantiere, cucina ristorante, studio medico), renderizzato nel sito e passato da image-critic + audit umano. Il lighting drift è ciò che il critico deve misurare tra immagini della stessa run: coerenza intra-sito, non solo per-immagine.

**Fonti:** <https://getimg.ai/blog/how-to-generate-images-in-consistent-brand-style-with-ai>