# Piano: Fabbrica di design — varietà e professionalità della pipeline Site-factory

> **Nota per chi implementa**: al primo passo di implementazione, copiare questo piano nel
> repo come `docs/piano-fabbrica-design-2026-07.md` (versionato, è il contratto vivo che la
> skill `harness-build` terrà aggiornato). Fonte di ricerca a monte:
> `docs/ricerca-varieta-design-2026-07.md` (1.731 righe, 165 finding verificati, 2026-07-10).

## Scopo

Trasformare la libreria estetica della Site-factory da "6 blocchi CSS scritti a mano in
`global.css`" a una **libreria machine-readable (W3C DTCG) alimentata da una fabbrica
offline**: Mattia sceglie siti di riferimento veri disegnati da esperti → check legale
opt-out → estrazione deterministica dei token dal CSS computato → un agente
"preset-designer" (`claude -p`, solo JSON, mai codice) propone un preset nuovo motivando
ogni valore sull'evidenza → build CSS deterministica → gate in cascata (deterministici →
novelty → UIClip locale → critico visivo Claude calibrato) → audit umano pairwise →
pubblicazione versionata. A valle, l'assegnazione cliente→design diventa deterministica
(zero AI a runtime) con anti-collisione per mercato locale.

Criterio di qualità dominante: **un sito generato deve reggere il confronto pairwise con
i siti consegnati a mano da ConsulBuild** — indistinguibile da lavoro di designer/dev
senior umani. La velocità della fabbrica è secondaria (è offline). La varietà percepita
nasce dalla moltiplicazione di assi ortogonali curati (preset × palette × varianti ×
trattamento foto), mai da generazione libera.

## Progress [viva]

- [x] 2026-07-10 M0a — Terrazzo PROMOSSO: round-trip fedele al 100% (0 divergenze su
      49 custom property × 2 preset + 6 stili risolti di controllo), hackLines=10 ≤ 30,
      repo ripristinato pulito. Cascata cliente>preset verificata intatta (le var()
      restano verbatim nel CSS generato). Evidenza: scratchpad spikes/m0a/report.md.
- [x] 2026-07-10 M0b — Dembrandt (v0.23.1) ADOTTATO: 4/4 estrazioni riuscite al primo
      colpo, accuratezza 3/3 sui siti del criterio (4/4 col bonus) contro ground truth
      da computed styles, DTCG valido; catena check opt-out provata (curl, pronta per
      M5). Evidenza: scratchpad spikes/m0b/report.md.
- [x] 2026-07-10 M0c — Runtime Python PROMOSSO: uv+Python 3.12.13, torch MPS ok, UIClip
      0.25s/img a caldo offline e discrimina (0.679 sano vs 0.147 degradato —
      riverificato di persona fuori dallo spike), CSD 768-dim 0.16s/img, Vendi ok.
      Download totali 2.9GB (gitignorati). Infrastruttura REALE in factory/tools/
      (pyproject pin 3.12, scripts/, report.md). Evidenza: factory/tools/report.md.
- [x] 2026-07-10 M1 — VRT Playwright + gate deterministici L1. Accettazione osservata:
      `npx playwright test --grep @visual` verde 12/12 (×2 run consecutivi, stabilità);
      mutation test: `--brand-radius-card` di terra alterato → falliscono SOLO
      terra-390/terra-1280 (10 passed), ripristino pulito; `gate:overflow` esce 0 sui 6
      preset e 1 sulla fixture degradata (scrollWidth 1490>390); `gate:tokens` pulito
      (statico + 4/4 computed per preset); `gate:impeccable` produce JSON filtrato
      (3 regole whitelistate motivate, 4 residui overused-font → M4); suite @a11y
      operativa (trova violazioni reali → M4). 144 baseline (47MB) in git.
- [x] 2026-07-11 M2 — ponte DTCG: 6 preset serializzati + build Terrazzo + manifest
      unico. Accettazione osservata: dump computed-vars pre/post = **0 divergenze**
      (49 token × 6 preset + 6 stili risolti × 6); VRT 12/12 contro le baseline M1
      PRE-migrazione (parità pixel-perfect); mutation via `terra.tokens.json`
      (radius 18→2px) → falliscono solo le celle terra, ripristino verificato;
      `astro check` invariato (1 errore atteso registry); editor `tsc --noEmit` +
      `next build` verdi col nuovo presets.gen.json; diff della skill = soli marker
      (tabella rigenerata byte-identica). global.css −312 righe; la terza copia dei
      neutri è morta (editor importa il JSON generato). 4 trascrizioni via agenti
      paralleli auto-verificate + confronto indipendente.
- [x] 2026-07-11 M3 — font self-hosted + palette AA-by-construction (HCT).
      Accettazione osservata: dist senza alcuna richiesta a
      `fonts.googleapis|gstatic` (grep = 0; 24 WOFF2 in public/fonts, 1.0MB,
      latin+latin-ext); VRT meridian 2/2 verde SENZA update (parità del
      self-hosting in sé); `check-hct.ts` → 40/40 coppie corrette passano
      check-contrast.mjs (autorità), deriva tinta max 0.88°; editor `tsc` +
      `next build` verdi. In più (sorpresa → fix alla radice): pesi sintetici
      eliminati su tutti i preset — censimento (famiglia,peso) usato vs
      dichiarato, URL font corretti nei meta.json, token `w-strong`
      (800; nova 700 perché Space Grotesk finisce a 700), classe `.font-strong`
      al posto di `font-extrabold` hardcoded, gate "pesi orfani" in
      lint-tokens + ban statico `font-(extrabold|black)`; baseline dei 5 preset
      alternativi rigenerate consapevolmente dopo verifica visiva → VRT 12/12.
      Nato `presets/font-whitelist.json` (10 famiglie, vincolo fabbrica M6).
- [x] 2026-07-11 M4 — critico visivo calibrato + re-audit dei 5 preset.
      Accettazione osservata: `calibrate-critic.mjs` → **κ di Cohen = 1.0,
      recall(boccia) = 1.0** su 40/40 item validi, 0 errori (gate κ≥0.6 ∧
      recall≥0.9 superato al primo colpo, nessuna iterazione di rubrica);
      i degradati canary bocciati nominando sezione e difetto giusti
      (spot-check: contrasto→D3, overflow→D5 con «RISTRUTTURAZIONE 16 glifi»,
      slop→D4+D6, collisione→D4); re-audit = 5 review JSON valide
      (`factory/calibration/reviews/preset-*.json`). Verdetti: atelier/canon/
      terra/vita PASS con backlog, **nova FAIL** (D3=0, 3 bloccanti di
      contrasto sull'hero e sulle fasce chiare — triangolato coi 29 nodi axe).
      Deliverable: gold set 40 item (make-goldset.mjs, defect injection su
      6 classi, basi miste), skill+agente design-critic (rubrica D1–D6,
      congiunzione su soglie hard, blacklist AI-slop), canary.json (10 fissi),
      report-critico.json, `docs/decisions/2026-07-re-audit-preset.md`
      (backlog: bloccanti nova + display serif 390 + renderAccent).
- [x] 2026-07-11 fix backlog re-audit (pre-M7, chiesti da Mattia): axe
      color-contrast **0 nodi su 6 preset × 2 viewport** (@a11y 12/12), parole
      spezzate **0** su h1/h2 a 390/768/1280, re-audit post-fix **5/5 PASS**
      (nova sbloccata), canary critico 10/10 su gold set rigenerato, VRT
      rigenerato e stabile ×2. Dettaglio in
      docs/decisions/2026-07-re-audit-preset.md («Esito dei fix»).
- [x] 2026-07-11 M5 — fabbrica: modello dati, riferimenti+opt-out+estrazione,
      area editor. Accettazione osservata E2E nel browser (entrambi i temi):
      fixture locale con TDMRep `tdm-reservation:1` → riferimento **BLOCCATO**
      con motivo verbatim, badge rosso, NESSUNA estrazione eseguita, non
      selezionabile; fixture pulita → `consentito` + extraction.tokens.json
      (dtcg+raw dembrandt@0.23.1) + 2 screenshot su disco; run con 2 rif →
      422 «servono ALMENO 3»; run con rif bloccato → 422 col motivo del gate;
      run valida con 3 → creata, timeline 5 fasi «In attesa» renderizzata.
      check-optout.mjs testato anche live (Guardian→bloccato per robots AI,
      example.com→consentito, host morto→errore fail-closed). Deliverable:
      scripts/factory/{check-optout,extract-tokens}.mjs, `export IO` (D5),
      lib/factory/{paths,schemas,state,run}.ts, 3 route API (references
      streaming NDJSON, references/[id]/run, runs), pagine /fabbrica,
      /fabbrica/riferimenti, /fabbrica/run/[runId] (studio UX impeccable
      prima della UI, vocabolario editor esistente), nav header. Screenshot
      di terzi gitignorati. tsc+build verdi; dati di test rimossi.
- [x] 2026-07-11 M6 — fabbrica: preset-designer + gate L1–L4, pipeline
      completa. Accettazione osservata (le 5 del piano): (1) re-colour di
      meridian → BOCCIATO L2 «clone strutturale (dHash 0 ≤2 E csd 0.0052 <
      p10)» + tokenDiff sotto p5; (2) candidato quasi-identico a un
      riferimento → BOCCIATO sull'asse fonte con motivazione in linguaggio
      legale; (3) i 6 preset come pseudo-candidati passano L2 (sanity, vita
      con warning ΔVS); (4) run E2E VERA con 3 fixture eterogenee: il
      designer ha sintetizzato la corsia «ferro» (light freddo-industriale,
      Space Grotesk+Karla+mono, slate-navy) → attraversa L1–L3 → critico
      PASS round 1 (D6 distinzione=2) → stato **da_audire** (run
      run-2026-07-11-43f47a in factory/runs/, con tutti i report); (5) ogni
      fase fallita lascia il report col motivo e la run RIPARTE dalla fase
      fallita — esercitato 3 volte per davvero (bug validator posizionamento
      → fix → resume; L2 tokenDiff 0.198<p5 «troppo vicino a meridian» →
      correzione designer automatica; L1 peso orfano «Space Grotesk 800» →
      escalation umana + staleness reset che rifà build+gates). Deliverable:
      build-presets --extra (candidato = 7° contesto nello stesso Terrazzo),
      make-goldset --candidato, skill+agente preset-designer (zero-invenzioni,
      ereditarietà sparsa documentata), validate-candidate.mjs (5 fixture),
      novelty.mjs+calibrate-novelty.mjs (baseline 22 coppie), l1-candidato.mjs,
      l3-uiclip.mjs (declassato a warning: calibrazione debole misurata),
      lib/factory/fasi.ts (orchestrazione riprendibile, correzione unica per
      gate, loop critico max 3 round), route run NDJSON + RunRunner UI.
- [x] 2026-07-11 M7 — pilota end-to-end: **«ferro»@1.0.0 pubblicato, libreria
      = 7**. Audit UI pairwise (contro il più vicino per tokenDiff = meridian,
      doppio ordine AB/BA a lati anonimi, metadati prefillati dalle
      motivazioni del designer, audit.json = prova di titolarità) esercitata
      nel browser reale; decisione «approva» con 2 confronti «pari» (delega
      autonoma di Mattia registrata in decisoDa). publish-preset.mjs:
      tokens+meta+resolver → fetch-fonts → build:presets → baseline VRT delle
      SOLE celle nuove + verifica → igiene TDM (screenshot riferimenti
      eliminati) → run «pubblicata»; rollback tutta-o-niente PROVATO sul
      campo (primo tentativo fallito dalla guardia → zero residui).
      Accettazione: /anteprima/ferro renderizza (VRT ferro 2/2), card Ferro
      nella scheda Palette dell'editor e riga nella skill palette-designer
      (rigenerate), **VRT completo 14/14** (12 celle vecchie intatte), ΔVS
      +0.003 registrato nel novelty report, gate tutti verdi con ferro
      (a11y 14/14, overflow, lint-tokens 4/4+0 orfani, impeccable 0 residui),
      misure {roundCritico: 1, correzioniUmane: 1}. Fonte-unica completata:
      resolver.json governa anche build-presets, lint-tokens, check-overflow,
      dump-vars e playwright.config (prima erano 5 liste hardcoded — il bug
      è emerso proprio alla prima pubblicazione).
- [ ] M8 — assegnazione deterministica cliente→design + anti-collisione
- [ ] M9 — varianti di sezione, layout per-preset, trattamento foto, fotografia per-preset

## Sorprese & Scoperte [viva]

- 2026-07-10 (M0a) — **Terrazzo `makeCSSVar()` collassa `--step--1` in `--step-1` in
  SILENZIO**: 86 dichiarazioni emesse contro 87 attese, nessun warning. Contromisura per
  M2: il builder deve avere un check deterministico "n. dichiarazioni emesse = n. token
  sorgente" (e valutare il rename della property nel renderer). Evidenza: report M0a.
- 2026-07-10 (M0a) — Dettagli Terrazzo 2.4.0 per M2: notazione stringa per
  color/dimension/duration è lint error (servono oggetti `{value, unit}` /
  `colorSpace+components`); `legacyHex:true` necessario; tracking in `em` va come
  string; shadow multi-layer richiede transform custom (8 righe: l'emissione nativa
  `0px 1px 2px 0px #hex` diverge dalla sorgente). `color-mix()` su var() e `clamp()`
  passano verbatim con `$type:"string"` + `$extensions raw:true`.
- 2026-07-10 (M0b) — **I 2 siti ConsulBuild live sono build legacy GoHighLevel (font
  Barlow), NON l'output Astro/Archivo del repo**: le dist in `out/<slug>/` non sono
  deployate su quei domini. Impatto su M4: il gold set "siti consegnati reali" va
  costruito dai render del REPO (`out/<slug>/dist`), non dagli URL live. Il primary
  repo (#2f568e) resta valido e ritrovato dall'estrattore.
- 2026-07-10 (M0b) — Rumori sistematici di dembrandt da filtrare a valle (M6):
  `#000000` sempre in testa alla palette (conteggio gonfiato dai default); l'accent
  "semantico" è inaffidabile (blu default browser/GHL in 2 casi su 4 — fidarsi del
  primary, ricavare l'accent dall'evidenza per frequenza+contesto); typography.styles
  ordinata per stili distinti, non per volume (usare il campo `context`). Inoltre
  dembrandt auto-clicca "accept" sui cookie banner: da annotare nel log del gate M5.
- 2026-07-10 (M0c) — transformers 5.13: `get_image/text_features` ritorna
  `BaseModelOutputWithPooling` → fix `.pooler_output` in `scripts/uiclip_score.py`.
  Per M6: tenere i modelli caricati in un processo long-running (il load 0.4–6s domina
  sullo score 0.16–0.25s) e `HF_HUB_OFFLINE=1` dopo il primo download.
- 2026-07-10 (M1) — **Astro auto-incrementa la porta**: l'astro dev dell'editor
  (lanciato per 4321, finito su 4322) veniva riusato in silenzio da
  `reuseExistingServer:true` → i test giravano sul rendering DEV con dev toolbar. E i
  locator Playwright ATTRAVERSANO gli shadow root (18 `section` viste contro le 9 di
  querySelectorAll: le 9 extra erano della toolbar, invisibili → timeout). Fix triplo:
  porta dedicata 4787 + `reuseExistingServer:false` (errore esplicito se occupata) +
  locator scopati `body >`. Le prime baseline erano contaminate: cancellate e rigenerate.
- 2026-07-10 (M1) — Le immagini lazy della Gallery gareggiano col decode durante gli
  screenshot per-sezione (flake 19% pixel su atelier): fix eager+`decode()` prima degli
  shot. Le baseline restano dipendenti da Unsplash finché il golden sample usa URL
  remoti: se ri-flappa, cache locale via route interception.
- 2026-07-10 (M1) — Semantica corretta del check computed di lint-tokens: "elemento =
  token" era sbagliato (i re-skin per-preset sono leciti: canon `.surface-card` radius 0
  deliberato). Confronto giusto: elemento nel componente vs SONDA con la stessa classe
  semantica; per i font conta la prima famiglia (i componenti aggiungono lo stack di
  fallback Tailwind, conforme).
- 2026-07-11 (M2) — **Bug silenzioso del resolver Terrazzo**: l'override di una shadow
  multi-layer (array) con una single-layer (oggetto) NON viene applicato — il blocco
  emette il valore BASE di meridian senza alcun warning (7 divergenze: shadow-card/hover
  di terra/vita, shadow-hover di atelier). La guardia conteggio-dichiarazioni non può
  vederlo (la dichiarazione c'è, col valore sbagliato): l'ha beccato il **confronto
  indipendente dump pre/post** — che è quindi parte permanente della procedura (mai
  fidarsi della sola build verde). Fix: tutte le shadow normalizzate ad array-di-layer
  nei file DTCG + guardia pre-build in build-presets.mjs che rifiuta shadow-oggetto.
- 2026-07-11 (M2) — Le 4 trascrizioni via agenti paralleli erano PERFETTE
  (auto-verifica hex-ricostruito=sorgente su ogni colore): le divergenze venivano
  dal toolchain, non dalla trascrizione. Ordine token nel CSS generato = alfabetico
  (Terrazzo), irrilevante per le custom property.
- 2026-07-10 (M1) — **I gate trovano problemi reali sui preset attuali** (input M4):
  axe color-contrast serious su 12/12 celle (1–29 nodi; peggiori: span dell'eyebrow,
  `.accent-word` su hero scuro, `.t-lead`) — conferma il sospetto di CLAUDE.md sui 5
  preset da ri-auditare; impeccable: 4 residui `overused-font` (Inter/Fraunces/Space
  Grotesk/Plus Jakarta sui preset alternativi) — input per la font-whitelist M3 e il
  re-audit M4.

- 2026-07-11 (M3) — **Tutti i preset alternativi usavano pesi font mai
  caricati**: col CDN ogni pagina dichiarava solo i pesi del proprio URL e il
  browser falsificava i mancanti (grassetto sintetico: atelier Inter 700 e
  Inter Tight 800, nova Inter 600/700, canon Playfair 800 e Source Serif
  500/700, terra Fraunces 700/800 e Karla 600). Il difetto è emerso perché
  presets.gen.css dichiara l'UNIONE delle facce: su nova il matching ha scelto
  l'Inter 600 vero (di atelier) al posto del sintetico → VRT rosso su nova
  sola. Meridian era l'unico preset senza pesi orfani. Caso limite: Space
  Grotesk non ha l'800 (range 300–700) che i componenti chiedevano via
  `font-extrabold` hardcoded → token `w-strong`. Il censimento è ora un gate
  permanente (lint-tokens: "pesi orfani" = 0).
- 2026-07-11 (M3) — `@material/material-color-utilities` 0.4.0 ha un import
  ESM rotto (`dynamiccolor/dynamic_color` senza estensione): funziona nei
  bundler, crasha in node puro (script di check). Pinnata **0.2.7** (stabile,
  Hct+Contrast presenti). `Contrast.ratioOfTones(100,50)=4.484`: la regola
  Material "gap di tone 50 ⇒ 4.5" è FALSA al margine — si usa la matematica
  inversa esatta `Contrast.darker/lighter` + verifica con nudge ≤0.25 di tone.

- 2026-07-11 (M4) — **Calibrazione perfetta al primo colpo (κ=1.0)** — da
  leggere con prudenza: i difetti iniettati sono decisivi per costruzione
  (valori scelti per essere inequivocabili). Il gold set separa bene
  rotto/sano ma non misura ancora i casi-limite: quando la fabbrica produrrà
  candidati "quasi buoni", aggiungere item near-miss al gold set. Intanto il
  critico ha dimostrato qualità oltre il verdetto: ogni classe di difetto
  presa dal criterio GIUSTO, e sul re-audit ha trovato difetti REALI di nova
  convergenti con axe (29 nodi) senza conoscerne l'esito.
- 2026-07-11 (M4) — Il re-audit ha scoperto una radice condivisa: i minimi di
  `--step-display` sono tarati sulle metriche dell'Archivo maiuscolo
  (meridian); i display SERIF di terra e canon spezzano «ristrutturazione» a
  metà parola a 390px → servono minimi per-preset nei token. E un bug vero di
  `renderAccent` (spazio spurio prima della virgola quando l'accent-word va a
  capo). Backlog completo in docs/decisions/2026-07-re-audit-preset.md.
- 2026-07-11 (M4) — I 4 residui impeccable `overused-font` sono spariti coi
  fix font di M3: impeccable = 0 residui su tutti i 6 preset.
- 2026-07-11 (M4) — Deviazione da D5: `calibrate-critic.mjs` NON passa dal
  seam `io.claude()` (streaming per la UI) — è batch sincrono con spawn
  proprio. Il seam si esporta in M5 per la fabbrica, come da piano.
- 2026-07-11 (fix M4) — **Le variabili `--color-*` di @theme si sostituiscono
  a `:root`**: un override scoped di `--brand-*` dentro una banda non le
  raggiunge più (il valore è già risolto a monte). La cascata della palette
  cliente funziona SOLO perché lo style inline vive sullo stesso elemento
  `<html>` dei token. Regola operativa: le override scoped (bande inverse,
  hero su foto) ridefiniscono le variabili THEME (`--color-muted`,
  `--color-inverse-*`), mai le `--brand-*`. Scoperto perché il primo fix
  "giusto in teoria" ha PEGGIORATO axe (21–46 nodi): mai fidarsi del fix
  senza il dump dei nodi reali.
- 2026-07-11 (fix M4) — **`overflow-wrap:anywhere` + `text-wrap:balance` =
  parole spezzate anche quando starebbero**: con `anywhere` ogni punto è un
  break legale e il balance lo usa. Rete di sicurezza giusta: `break-word`
  (spezza solo in emergenza vera). E **Fraunces ha l'asse ottico (opsz)**: le
  metriche cambiano non linearmente con la taglia — le stime lineari
  sottostimano; misurare sempre sul render (probe getClientRects per parola).
- 2026-07-11 (fix M4) — **Terrazzo rifiuta token presenti solo in un set
  override** («No token …», stavolta errore esplicito, non silenzioso):
  i token guardrail vivono nel BASE meridian come identità
  (`var(--brand-accent)`) e i preset che ne hanno bisogno li ridefiniscono.
- 2026-07-11 (fix M4) — **L'inverso dell'inverso**: la card bianca del form
  dentro la sezione scura ereditava il muted invertito (grigio chiaro su
  bianco, ratio 1.5). Regola: le superfici in tinta base dentro `.section-dark`
  ripristinano `--color-muted: var(--brand-muted)`.

- 2026-07-11 (M5) — dembrandt 0.23.1 **non ha un campo confidence** (né nel
  formato default né nel DTCG): la nota M0b si riferiva ai conteggi d'uso.
  extraction.tokens.json salva ENTRAMBI i formati (`dtcg` per il designer,
  `raw` con frequenze e `context` per i filtri anti-rumore M6). E promemoria
  dalle fixture: TDMRep è **origin-scoped** (/.well-known alla radice del
  dominio) — una riserva su un path non esiste.

- 2026-07-11 (M6) — **Il dHash non discrimina tra preset legittimi**: tutti i
  render condividono il layout del golden sample, 4 coppie di preset veri
  hanno Hamming 0. Il "clone strutturale vs libreria" è quindi una
  CONGIUNZIONE (dHash ≤2 E csd < p10); verso i RIFERIMENTI esterni (layout
  diversi per natura) dHash ≤2 resta bocciante da solo. E i percentili della
  baseline sono nearest-rank: con l'interpolazione p5 > minimo osservato e
  meridian/atelier sarebbero bocciati per costruzione al sanity test.
- 2026-07-11 (M6) — **CSD e tokenDiff separano nettamente** (quasi-uguali
  csd ≤0.023 vs diverse ≥0.073, zero sovrapposizione; tokenDiff 0.028 vs
  0.32): sono i segnali portanti di L2. Sanity: i 6 preset come
  pseudo-candidati passano tutti (vita con warning ΔVS≤0, non bloccante);
  il re-colour di meridian è bocciato come clone strutturale; un candidato
  quasi-identico a un riferimento è bocciato sull'asse fonte con motivazione
  in linguaggio legale.
- 2026-07-11 (M6, run E2E) — **La difesa in profondità ha pagato tre volte
  nella stessa run**: (a) il validator aveva un bug (bocciava il blocco
  «posizionamento» come token senza motivo) scoperto solo dall'E2E — le
  fixture non lo esercitavano; (b) la font-whitelist MENTIVA (Space Grotesk
  «800» ereditato da un mio errore M3 mai corretto lì): il validator ha
  approvato contro dati falsi e L1 l'ha preso al render («peso orfano»);
  (c) l'ereditarietà sparsa del candidato (i token non scritti ereditano
  meridian, inclusi i pesi) ha prodotto un secondo peso orfano — ora
  documentata nella skill come trappola esplicita. E il designer in
  correzione ha RETTIFICATO di sua iniziativa un'affermazione imprecisa
  delle proprie motivazioni (Helvetica Neue ≠ narrow grotesk): il contratto
  «evidenza tracciabile» spinge all'onestà anche nei round successivi.
- 2026-07-11 (M6) — **UIClip separa MALE sul nostro gold set** (25/40 item
  sbagliati, direzione a tratti invertita: canon pulito scora più di meridian
  pulito). Cause misurate: per 3 classi di difetto gli shot hero/servizi-1280
  sono BYTE-IDENTICI alla base pulita (hero = testo su foto, la banda scura
  si ricolora da sola: l'iniezione non li tocca) e lo score varia più per
  base estetica che per difetto. → Fallback dichiarato di M0c applicato:
  **L3 declassato a warning** (non blocca; decide L4). Eventuale ricalibro
  futuro: score sugli shot 390 e sulle sezioni dove i difetti vivono.

## Decision Log [viva]

- 2026-07-11 (M6) — **Il candidato è un 7° contesto nello STESSO toolchain
  Terrazzo** (`build-presets --extra`, contesto temporaneo nel resolver, la
  lista del config deriva dal resolver): mai un serializzatore parallelo —
  è la classe di bug M2. In modalità candidato si emettono SOLO css+gen.ts;
  manifest/editor/skill restano quelli committati (il candidato non è MAI
  offerto alla pipeline cliente). I generati restano sporchi durante la run
  e la fase build li ripristina alla fine.
- 2026-07-11 (M6) — **L3 (UIClip) resta nel flusso ma come warning-only**
  finché la calibrazione non separa (criterio: ≤20% item sbagliati sul gold
  set, verificato dal gate a ogni run leggendo uiclip-soglia.json). La
  pipeline perde un pre-filtro, non si blocca; L4 è il giudice.
- 2026-07-11 (M5) — Il gate opt-out è **fail-closed**: pagina o robots.txt
  non raggiungibili = esito «errore», riferimento non selezionabile finché la
  verifica non riesce. UA trasparente
  («ConsulBuild-SiteFactory/1.0 … info@consulbuild.com»): è una verifica di
  conformità, ci si identifica. Blocco totale di `*` in robots.txt trattato
  come riserva (prudenza). Il runner del riferimento legge l'ESITO da
  optout.json, mai dall'exit code (bloccato non è un crash).
- 2026-07-11 — **nova è bloccato per l'assegnazione finché il FAIL del
  re-audit non rientra** (3 bloccanti di contrasto). I fix del backlog sono
  quasi tutti token/overlay per-preset; chiusura misurabile: axe
  color-contrast = 0 nodi su tutti i preset + canary del critico verde.
  Dettaglio e criteri in docs/decisions/2026-07-re-audit-preset.md.
- 2026-07-11 — **Pesi font: mai sintetici.** Ogni coppia (famiglia, peso,
  stile) usata nel render deve avere una @font-face vera: gate deterministico
  in lint-tokens (censimento su elementi visibili vs document.fonts), utility
  `font-extrabold|font-black` bandite staticamente, peso "forte" degli accenti
  di brand tokenizzato in `w-strong`. Le baseline VRT dei 5 preset alternativi
  sono state rigenerate una tantum (2026-07-11) dopo verifica visiva: il
  rendering coi pesi veri È il fix, meridian resta la prova di parità del
  self-hosting (2/2 verde senza update).
- 2026-07-11 — **Font self-hosted = mirror verbatim della CSS di Google**
  (descriptor family/style/weight/unicode-range identici, src locale, subset
  latin+latin-ext): niente reinterpretazione, il rendering identico lo prova
  il VRT. `fetch-fonts.mjs` è idempotente e whitelist-driven; il CDN resta
  SOLO per l'override font esplicito del cliente (raro, scelta sua).
- 2026-07-10 — Decisioni di kickoff prese con Mattia: (1) perimetro = SOLO asse design,
  niente verticali nuovi (ristorante/dentista = piano successivo che riuserà questa
  infrastruttura); (2) budget = solo tool gratuiti, si paga solo davanti a un collo di
  bottiglia dimostrato; (3) sequenza = fondamenta → pilota fabbrica, quick win dopo;
  (4) riferimenti scelti manualmente da Mattia, pipeline fa opt-out+estrazione.
- 2026-07-10 — Verificato in ambiente: `uv 0.11.25` in `~/.local/bin/uv`; Python di
  sistema 3.14.6 (→ pin 3.12 nel progetto uv per wheel torch/MPS); detector impeccable
  presente in `~/.claude/skills/impeccable/scripts/detector/` (invocazione esatta da
  verificare in M1). `StickyCta` ESISTE già (componente + blueprint): la ricerca su quel
  punto è superata, non va costruito.
- 2026-07-10 — M0b, scelta siti di prova (deviazione minore dal piano, che prevedeva
  "scelti da Mattia"): per non bloccare lo spike si usano 2 siti consegnati da
  ConsulBuild (ssccostruzionisrls.it, costruzionigeneralidilaceciliagiovanni.it — ground
  truth nota nel repo: Archivo, primary #2f568e) + 2 esterni già noti al progetto
  (newfutureservice.it, designprojectroma.it), con check opt-out eseguito comunque su
  tutti come prova generale del gate M5. Lo spike è rilanciabile in minuti su siti scelti
  da Mattia se vorrà un campione diverso. Alternativa scartata: chiedere e aspettare.
- 2026-07-10 — **D2 RISOLTA (esito M0a): si adotta Terrazzo** per il builder M2, con due
  contromisure obbligatorie: transform custom per le shadow e check "dichiarazioni
  emesse = token sorgente" contro il collasso silenzioso di `--step--1`. Alternativa
  scartata: emitter in-house (non necessario, fedeltà 100% con 10 righe di hack).
- 2026-07-10 — **M0b RISOLTA: si adotta dembrandt (v0.23.1)** come estrattore della
  fabbrica, col post-filtro del rumore documentato in Sorprese. Fallback in-house non
  necessario (resta descritto nel piano come piano B se il progetto venisse abbandonato).
- 2026-07-10 — **M0c RISOLTA: runtime uv/Python 3.12 promosso** (UIClip+CSD+Vendi tutti
  operativi su MPS, offline, sotto i 5s). `samples/` aggiunto al .gitignore di
  factory/tools: gli screenshot di siti terzi non si versionano (igiene TDM "solo il
  tempo necessario"); si rigenerano al bisogno.
- 2026-07-11 — (M2) Le copie dei neutri si eliminano GENERANDO, non sorvegliando: al
  posto di `check-presets-sync.mjs` (previsto dal piano come alternativa) il builder
  emette direttamente `site-factory-editor/lib/presets.gen.json` (l'editor importa il
  JSON, tipi derivati con `keyof typeof`) e la tabella della skill tra marker
  TABELLA-NEUTRI. Un preset nuovo pubblicato dalla fabbrica si propaga a renderer,
  schema Zod, editor e skill con `npm run build:presets`, zero edit a mano.
- 2026-07-11 — (M2) Convenzione DTCG interna: shadow SEMPRE array di layer (anche
  singolo) — vedi Sorprese; `--step--1` resta col nome storico nel renderer, il token
  si chiama `step-n1` e il builder lo rinomina in emissione (alternativa scartata:
  rename nel renderer, avrebbe toccato componenti e baseline senza beneficio).
- 2026-07-10 — (M1) `rounded-full` AMMESSO dal lint-tokens, in deviazione dall'esempio
  di CLAUDE.md: lo standard consegnato lo usa deliberatamente per i badge circolari
  (nodo processo, FAB chiamata) e un cerchio è un cerchio in ogni preset. Il lint
  bandisce le scale estetiche (shadow-sm..2xl, rounded-sm..3xl, text-xs..9xl), gli hex
  letterali e gli style= non funzionali (ammessi solo env(/var().

## Contesto e orientamento

Repo: `/Users/mattia/Claude Projects/Site-factory`. Due workspace:

- **`site-renderer/`** (Astro): l'AI non scrive mai codice, produce solo `site.json`
  validato da Zod (`src/lib/schema.ts`, `parseSiteConfig()`). Theming a cascata in
  `src/styles/global.css` (741 righe): `:root` (= preset `meridian`, lo standard
  ConsulBuild) < `[data-preset="x"]` (5 blocchi, righe 129–361) < style inline cliente
  (solo `primary`+`accent` obbligatori). Font per preset in `src/lib/presets.ts` (oggi
  URL Google CDN). 15 componenti in `src/sections/` (incluso `StickyCta`), registry 15
  chiavi; 8 tipi schema senza componente = guard voluto, FUORI da questo piano.
  `/anteprima/[preset]` = 6 pagine con lo stesso golden sample, solo `brand.preset`
  cambia (la prova "estetica senza markup"). Blueprint unico `conversione-locale-v1`
  (12 sezioni fisse) + `slots.json` (~50 slot) + assembler deterministico
  `scripts/assemble-site.ts`. Gate contrasto: `.claude/skills/palette-designer/check-contrast.mjs`
  = UNICA fonte del calcolo WCAG. `npm` da `site-renderer/`; PATH: `export PATH="$HOME/.local/bin:$PATH"`.
- **`site-factory-editor/`** (Next.js 16): pipeline per-cliente a step
  (`lib/steps.ts`: `contesto|palette|copy|images|build`), seam multi-fase
  `io.claude()`/`io.script()` in `lib/run-step.ts` (spawn `claude -p --model
  claude-opus-4-8 --effort xhigh`, login Max, MAI `ANTHROPIC_API_KEY`), route NDJSON
  generica `app/api/clients/[slug]/run/[step]/route.ts`, staleness per hash
  (`lib/staleness.ts`). Artifact per-cliente in `site-renderer/out/<slug>/`.
  Verifica per scheda: `npx tsc --noEmit` + `npm run build`.

Termini: **preset** = set di token estetici (colori/font/radius/ombre/motion/cassa/scala)
applicato via `data-preset`; **DTCG** = formato W3C Design Tokens 2025.10 (stabile:
Format+Color+Resolver); **fabbrica offline** = ciclo proposta→render→gate→critica→audit
che produce asset di libreria, mai output per-cliente a runtime; **golden sample** = il
blueprint renderizzato usato da `/anteprima`.

Vincoli di ingaggio ereditati da `CLAUDE.md` (non negoziabili): qualità = unico criterio;
l'AI non scrive mai codice/CSS; niente API a pagamento (tutto via `claude -p` login Max);
niente invenzioni (ogni valore tracciabile all'evidenza); niente animazioni in-page;
nulla si committa senza chiedere; una scheda per volta.

### Guardrail legali (dalla ricerca, vincolanti)

L. 132/2025 (vigente dal 10/10/2025): violare l'opt-out TDM è **reato** → il check
opt-out è un gate hard, bloccante e loggato (robots.txt + TDMRep + meta noai; anche
riserve testuali esplicite nei ToS, criterio "state of the art"). GEMA v OpenAI: la
liceità della raccolta NON sana un output riconoscibilmente derivato → gate "distanza
dalla fonte" (il candidato deve essere LONTANO dai riferimenti). Concorrenza sleale:
ogni preset sintetizza **≥3 riferimenti eterogenei**, mai un sito singolo come modello,
mai concorrenti locali dei clienti, mai lo stesso brand seguito nel tempo. L'output AI è
protetto solo con contributo umano documentato → il log dell'audit (`audit.json`) è
insieme QA e prova di titolarità. Screenshot dei riferimenti: uso interno, mai
redistribuiti, conservati solo il tempo dell'estrazione (le feature distillate restano,
le copie si eliminano a preset pubblicato).

## Architettura

Pattern: **workflow con gate deterministici** (i passi sono prevedibili) + loop
generatore→critico a budget fisso + checkpoint umano finale. Niente agente autonomo,
niente multi-agente, niente panel di giudici (letteratura 2026: errori correlati ≈ 2 voti
effettivi; meglio UN giudice calibrato + segnali di natura diversa: codice + umano).

```
Mattia sceglie URL riferimenti (gallerie: One Page Love, Awwwards, roundup di settore)
   │  attestazione: ≥3 fonti eterogenee · nessun concorrente locale
   ▼
check opt-out TDM (deterministico, loggato, HARD)          → factory/references/<id>/optout.json
   ▼
estrazione token dal CSS computato (Dembrandt | fallback in-house)  → extraction.tokens.json
   ▼                                                          MAI screenshot→VLM per i valori
preset-designer (claude -p): evidenza → candidate.tokens.json (DTCG) + motivazioni.json
   │  validatore zero-invenzioni deterministico (schema, font ∈ whitelist, hex ∈ evidenza∪derivazioni)
   ▼
build deterministica DTCG → presets.gen.css → render /anteprima/candidato-<runId>
   ▼
GATE in cascata (ogni fase = report JSON in factory/runs/<id>/gates/):
   L1 deterministici: check-contrast.mjs · axe-core AA · overflow 390px · lint-tokens · impeccable+whitelist
   L2 novelty (2 assi): vs LIBRERIA deve essere DIVERSO, vs RIFERIMENTI deve essere LONTANO
       dHash (anti-clone, Hamming ≤2) → diff token-space pesato (~50 righe in casa)
       → CSD a percentili calibrati → Vendi Score ΔVS (≈0 = nessuna varietà aggiunta)
   L3 UIClip locale (MIT, org biglab su HF): pre-filtro "rotto vs sano", per-sezione + full-page
   L4 critico visivo Claude: rubrica ancorata, soglie hard, browser vivo, max 3 round,
       corregge SOLO i token nominati nei findings (mai rigenerazione totale)
   ▼
audit umano PAIRWISE (candidato vs preset più vicino, stesso golden content, doppio ordine AB/BA)
   ▼
pubblicazione: site-renderer/presets/<id>.tokens.json@1.0.0 + meta + manifest + VRT baseline
   ▼
runtime (per-cliente, zero AI): assegnazione deterministica
   contesto.json (vettore Aaker) → hard filter → scoring → anti-collisione mercato → seed=slug
```

### Decisioni architetturali (prese, con alternative scartate)

**D1 — Ponte DTCG→CSS: file generato affiancato, MAI riscrittura di `global.css`.**
`global.css` mescla 4 cose: (a) blocco `@theme` Tailwind (righe 17–48), (b) token
per-preset (righe 55–361), (c) base+classi semantiche (366–699), (d) re-skin per-preset
delle classi semantiche (702–742). **Solo (b) diventa DTCG.** I token vivono in
`site-renderer/presets/*.tokens.json`; un builder emette `src/styles/presets.gen.css`
(in git, diffabile); `global.css` perde le righe 55–361 e guadagna
`@import "./presets.gen.css"`. Niente byte-identico (ordinamento/commenti cambiano): la
parità si prova con VRT a zero diff + dump dei computed custom-properties valore-per-valore.
I re-skin (d) restano CSS a mano: sono grammatica curata, non token. Conseguenza di
perimetro: **lo spazio di output della fabbrica è il token-space**; eventuali re-skin per
un preset nuovo sono un'aggiunta umana post-audit (coerente con "l'AI non scrive CSS").

**D2 — Terrazzo con fallback emitter in-house, deciso dallo spike M0a.**
Tre classi di valori non sono tipi DTCG puri: `color-mix()` su var, `clamp()` della scala
fluida, più i compositi ok (shadow multi-layer, cubicBezier). Si serializzano con
`$extensions:{"com.consulbuild":{raw:true}}` ed emissione verbatim. Se Terrazzo li regge
senza hack fragili (>~30 righe di tzconfig = fragile) → Terrazzo; altrimenti emitter
in-house ~150 righe (`scripts/build-presets.mjs`: DTCG flat → custom properties per
selettore). Il contratto è il FILE DTCG, non il tool: il fallback non tocca nient'altro.

**D3 — Metadati in file affiancato** (`<id>.meta.json`), non dentro il DTCG: il file token
resta puro (hash stabile per staleness/versioning); i metadati (Aaker, settori,
photography spec) li edita l'umano all'audit. Un manifest generato
(`presets.manifest.json`) alimenta renderer, editor e skill: **muore la terza copia dei
neutri** (editor `lib/presets.ts` e tabella nella skill palette-designer → generati o
verificati da script di sync).

**D4 — Pinning versione: registrato e avvisato, non multi-CSS.** `brand.preset` resta
l'id semplice; la versione pinnata vive in `design.json` del cliente e nel registro
assegnazioni; la build cliente confronta pinned vs manifest e alza il banner staleness su
major mismatch (pattern `staleness.ts`). Non si shippano N versioni di CSS (YAGNI).

**D5 — Riuso del seam runner: `export const IO`** da `lib/run-step.ts` (oggi privato) +
runner parallelo `lib/factory/run.ts` con `FactoryStepDef` chiavato su `runId`, stato in
`factory/runs/<runId>/run.json`. La pipeline cliente non si tocca fino a M8 (e lì in modo
additivo/retrocompatibile).

**D6 — La fabbrica vive in `<repo>/factory/`**, tutto file JSON in git (audit trail =
prova di diligenza legale). Niente DB, niente framework di eval: script node + uv.

```
factory/
  references/<ref-id>/{meta.json, optout.json, extraction.tokens.json, screenshot-{390,1280}.png}
  runs/<run-id>/{run.json, candidate.tokens.json, motivazioni.json, gates/*.json,
                 critic-review.json, audit.json, shots/*.png}
  calibration/{baseline.json, goldset/(screenshot+labels.json), canary.json}
  assignments.json
  impeccable-whitelist.json
  tools/{pyproject.toml, uv.lock, scripts/*.py}     # .cache/ (pesi HF) gitignorata
```

### Contratti dati

1. **Preset token** — `site-renderer/presets/<id>.tokens.json` (DTCG 2025.10). Mappa 1:1
   fissa token→custom property (il contratto implicito di global.css reso esplicito):
   `color.primary→--brand-primary`, `font.heading→--brand-font-heading`,
   `radius.card→--brand-radius-card`, `shadow.card→--brand-shadow-card`,
   `motion.ease→--brand-ease`, `type.case→--heading-case`, `type.step-4→--step-4`,
   `space.mult→--brand-space`, ecc. (~40–46 token/preset — esattamente i nomi oggi nelle
   righe 55–361). Valori CSS-expression marcati `raw:true`.
2. **Metadati preset** — `site-renderer/presets/<id>.meta.json`:
   `{id, version (SemVer), stato: attivo|candidato|ritirato, aaker:{5 dim 0–2 + primaria},
   settoriConsigliati[], antiPatterns[], requisitiContenuto{minFotoReali,…},
   vincoliCombinazione{}, photographySpec{soggetto,angolo,luce,grading,mood},
   fluxStyleFragment{style,lighting,film_reference,color_palette[]},
   provenance{runId,references[],auditRef}, changelog[]}`.
3. **Resolver** — `site-renderer/presets/resolver.json`: modifier `preset`, un context per
   id, `meridian` default su `:root`, gli altri su `[data-preset="<id>"]`.
4. **Riferimento** — `factory/references/<id>/meta.json`
   `{url, galleria, settore, zonaGeografica, aggiuntoIl, nota, attestazioneNonConcorrente:true}`
   (checkbox obbligatoria in UI, loggata); `optout.json`
   `{url, verificatoIl, robotsTxt, tdmRep, metaNoai, esito: consentito|bloccato, dettagli}`.
5. **Run** — `factory/runs/<id>/run.json`
   `{runId, creatoIl, references[], stato, fasi:[{nome,esito,avviatoIl,report}],
   misure:{durataMin, roundCritico, correzioniUmane}}`.
6. **Report novelty** — `gates/novelty.json`: dHash vs libreria e vs riferimenti,
   tokenDiff per-preset con topContributi, CSD con percentile sulla baseline, Vendi
   prima/dopo/delta, esito+motivi.
7. **Verdetto critico** — `critic-review.json` (pattern copy-review):
   `{round, verdict: PASS|FAIL, criteri:[{nome, score:0|1|2, sogliaHard, motivo}],
   findings:[{sezione (NOME, mai coordinate), viewport, gravita, motivo, fixTokenProposto?}]}`.
8. **Audit** — `audit.json`
   `{decisione: approva|scarta, confronti:[{contro:"terra@1.2.0", ordine:AB|BA, scelto}],
   note, decisoDa:"Mattia", data}`.
9. **Registro assegnazioni** — `factory/assignments.json`:
   `{assegnazioni:[{slug, mercato:{macroSettore,comune,provincia}, preset, presetVersion,
   hueBucket, varianti{}, data}]}`.
10. **Assegnazione cliente** — `site-renderer/out/<slug>/design.json`
    `{preset, version, seed, motivo, alternativeScartate:[{preset, perche}]}`.

### Assunzioni sul modello (claude-opus-4-8 — rivedere a ogni release, canary alla mano)

1. Non deriva valori estetici affidabili da screenshot (font ~30% accuracy) → estrazione
   SOLO da computed styles.
2. Inventa valori plausibili senza evidenza → validatore zero-invenzioni deterministico
   prima di ogni render.
3. Self-evaluation inaffidabile → generatore e critico separati, gate deterministici prima.
4. Il giudice minimizza i difetti trovati → soglie hard per criterio, verdetto a
   congiunzione (mai media), κ-gate con recall sulla classe "boccia".
5. Localizzazione spaziale debole → verdetti per nome sezione, mai coordinate/pixel.
6. Regredisce alla media estetica (Inter, gradiente purple-blue, radius 16 uniforme) →
   blacklist nominale in rubrica + lint deterministici.
7. Aritmetica/percentili non affidabili in-prompt → ogni numero (contrasto, distanze, κ,
   Vendi) viene da script, mai dal modello.

## Sistema di qualità

- **Gate deterministici (L1, gratis, bloccanti, girano sempre)**: `check-contrast.mjs`
  (autorità WCAG invariata) · axe-core AA via Playwright · overflow orizzontale a 390px
  con parole lunghe maiuscole · `lint-tokens.mjs` (componenti usano solo classi
  semantiche/token; computed styles ∈ token del preset; nessun blocco `[data-preset]`
  scritto a mano fuori dal generato) · impeccable detect con whitelist
  (`factory/impeccable-whitelist.json`: es. la regola anti-all-caps confligge con l'H2
  maiuscolo dello standard).
- **Novelty gate (L2)**: due assi MAI fusi in un punteggio unico — un clone bellissimo
  deve essere bocciato. Vs libreria: DIVERSO (dHash → tokenDiff → CSD percentili → ΔVS>0).
  Vs riferimenti: LONTANO (dHash+CSD, soglia = percentile basso della distribuzione
  note-diverse; motivazione nel report nei termini legali "riconoscibilità/impressione
  generale"). Soglie MAI assolute: calibrate sulla baseline delle coppie preset×preset
  esistenti (note-diverse) + coppie stesso-preset-palette-diversa (note-quasi-uguali).
- **UIClip (L3)**: pre-filtro numerico locale, deterministico, gratuito. Solo org
  `biglab` su HuggingFace (MIT) — `Jl-wei/uiclip` è un ALTRO modello, academic-only.
  Ottimo per "rotto vs sano", NON per rankare due design buoni: mai usarlo come giudice
  finale.
- **Critico visivo (L4)**: skill `.claude/skills/design-critic/SKILL.md`, agente separato
  dal designer, browser vivo sulla build reale, screenshot 390 E 1280 per-sezione +
  full-page, rubrica 5–7 criteri con ancore verbali 0/1/2 e soglia hard per criterio,
  "Creative Distinction" pesata alta (la leva per varietà senza perdere qualità),
  blacklist marker AI-slop nominale, few-shot 2–3 buoni (siti consegnati) + cattivi
  (degradati). Budget: max 3 round; su FAIL si correggono SOLO i token nominati.
- **Calibrazione ed eval**: gold set 40 item (10 passa / 30 boccia da defect injection),
  gate **κ di Cohen ≥ 0.6 E recall(boccia) ≥ 0.9** prima di fidarsi del critico; canary
  set 10 item fissi rieseguito a ogni modifica della skill e a ogni release modello. VRT
  Playwright come regression estetica permanente (projects = matrice preset×viewport).
- **Checkpoint umani** (pochi, ad alto valore): scelta riferimenti (gusto in ingresso) e
  audit pairwise finale (gusto in uscita + titolarità legale). Mai review umana dei
  passaggi intermedi.

## Piano di lavoro: milestone

Percorso critico: M0a → M1 → M2 → M4 → M6 → M7. M3 e M5 parallelizzabili. M8 dopo M7.
M9 a fette dopo M7. Sforzo: S < M < L.

### M0 — Spike di de-risk (3 prototipi usa-e-getta) — M

Tre incognite esterne, ciascuna con criterio promuovi/scarta. Il codice degli spike NON
entra in main così com'è (scratchpad/branch).

- **M0a Terrazzo round-trip** (l'incognita più strutturale): serializzare A MANO
  meridian+nova in DTCG con resolver+permutations, generare CSS, confrontare i computed
  styles su `/anteprima/meridian` e `/anteprima/nova` pre/post con uno script Playwright
  che dumpa tutte le `--brand-*`/`--step-*`/`--w-*`/`--heading-*`.
  *Accettazione*: dump identico valore-per-valore per entrambi i preset, incluse le 3
  classi problematiche (color-mix, clamp, shadow multi-layer). *Scelta*: >~30 righe di
  hack nel tzconfig per i raw token → si promuove l'emitter in-house (D2).
- **M0b Dembrandt su PMI reali**: `npx dembrandt <url> --dtcg` su 3 siti reali di PMI
  italiane (scelti da Mattia, opt-out verificato a mano prima).
  *Accettazione*: per ≥2 su 3, font e colori primari estratti coincidono con l'ispezione
  DevTools manuale, confidence sensata. Altrimenti fallback:
  `scripts/factory/extract-tokens.mjs` in-house (~200 righe Playwright: computed styles
  su body/h1/h2/bottoni/card + palette per frequenza) — stesso output DTCG.
- **M0c Runtime Python su Apple Silicon**: `factory/tools/pyproject.toml` **pinnato a
  Python 3.12** (il 3.14.6 di sistema rischia di non avere wheel torch/MPS), deps: torch,
  transformers/open_clip, vendi-score, pillow; pesi UIClip (org `biglab`) e CSD
  (`yuxi-liu-wired/CSD`) con `HF_HOME=factory/tools/.cache`.
  *Accettazione*: `uv run --project factory/tools python scripts/uiclip_score.py
  shot.png --caption "…"` e `csd_embed.py` producono score/embedding in <5s/screenshot a
  caldo, offline.
  *Fallback dichiarato*: pesi non scaricabili/rotti → L2 regge su dHash+tokenDiff+Vendi,
  L3 si omette — la pipeline perde un filtro, non si blocca.

### M1 — Rete di sicurezza: VRT + gate deterministici L1 — M

Prerequisito di tutto: la migrazione M2 si prova contro questa baseline; il re-audit M4
la usa.

- Playwright devDependency di `site-renderer/`; `playwright.config.ts` con **projects =
  matrice preset×viewport** (`meridian-390`, `meridian-1280`, … 12 project), webServer =
  `astro build && astro preview` (statico e deterministico: niente animazioni in-page).
- `tests/visual.spec.ts` (tag `@visual`): screenshot per-sezione (locator sulle section
  di `/anteprima/[preset]`) + full-page; baseline in git, generate SOLO sul Mac di Mattia.
- Gate L1 come script singoli riusabili (identici nella fabbrica):
  `tests/a11y.spec.ts` (axe-core AA su ogni anteprima) ·
  `scripts/check-overflow.mjs` (scrollWidth>clientWidth a 390px) ·
  `scripts/lint-tokens.mjs` (grep statico su `src/sections/` per hex/inline-style fuori
  allowlist + check Playwright computed-styles ∈ token del preset) ·
  `scripts/run-impeccable.mjs` (prima azione: verificare l'invocazione esatta del
  detector in `~/.claude/skills/impeccable/scripts/detector/`; wrapper con whitelist).

*Accettazione*: da `site-renderer/`: `npx playwright test --grep @visual` verde sui 6
preset; alterando localmente un token (es. `--brand-radius-card` di terra) il run
fallisce SOLO sulle celle terra; `node scripts/check-overflow.mjs` esce 0 sui 6 preset e
1 su una pagina-campione degradata; il wrapper impeccable produce JSON filtrato.

### M2 — Ponte DTCG: serializzazione 6 preset + build deterministica + manifest — L

- `site-renderer/presets/{meridian,atelier,nova,canon,terra,vita}.tokens.json` +
  `resolver.json`: trascrizione fedele delle righe 55–361 (lavoro di precisione, non
  creativo) + `<id>.meta.json` con vettori Aaker annotati dalla ricerca
  (meridian≈Competence, nova≈Excitement/Sophistication, terra≈Ruggedness/Sincerity,
  canon≈Sophistication/Competence, vita≈Excitement/Sincerity,
  atelier≈Competence/Sophistication) e photography spec iniziali.
- Builder (Terrazzo o emitter, esito M0a): `scripts/build-presets.mjs` →
  `src/styles/presets.gen.css` + `src/lib/presets.gen.ts` (PRESETS, DEFAULT_PRESET,
  fonts) + `presets.manifest.json`. Script npm `build:presets`, output IN GIT.
- `global.css`: via le righe 55–361, dentro `@import "./presets.gen.css"` (l'@theme, le
  classi semantiche e i re-skin 702–742 restano dove sono).
- Unificazione delle 3 copie: `src/lib/presets.ts` re-esporta dal generato; `PresetEnum`
  in `schema.ts` costruita dal manifest; editor `lib/presets.ts` generato o coperto da
  `scripts/check-presets-sync.mjs` (esce 1 se diverge); tabella neutri nella skill
  palette-designer rigenerata con nota "generata, non editare".
- `lint-tokens.mjs` esteso: nessun blocco `[data-preset]` con `--brand-*` scritto a mano
  fuori dal file generato.

*Accettazione*: `npm run build:presets && npx playwright test --grep @visual` → **zero
diff** vs baseline M1; dump computed-vars identico per i 6 preset; cambiare `radius.card`
in `terra.tokens.json` → rigenera → VRT fallisce solo su terra; `astro check` e build dei
clienti esistenti invariati; `node scripts/check-presets-sync.mjs` esce 0.

### M3 — Quick win: font self-hosted + palette AA-by-construction — S

- **Font**: WOFF2 (pesi/assi come in PRESET_FONTS) in `site-renderer/public/fonts/`;
  `scripts/fetch-fonts.mjs` whitelist-driven; il builder M2 emette `@font-face` in
  `presets.gen.css`; `Base.astro` smette di puntare a Google CDN (GDPR; licenza OFL ok).
  Nasce `site-renderer/presets/font-whitelist.json` (famiglie curate + attributi: form
  model, pesi, body-text-friendly): sarà il **vincolo di generazione della fabbrica**.
- **HCT**: `site-factory-editor/lib/hct.ts` (~20 righe su
  `@material/material-color-utilities`): tone±50 ⇒ ratio≥4.5 garantito, sostituisce il
  loop `fixUntilPass` in `lib/wcag.ts` (bottone "Scurisci finché passa" smette di
  desaturare/derivare la tinta). `check-contrast.mjs` resta autorità finale, invariato.

*Accettazione*: la dist di un cliente non contiene richieste a
`fonts.googleapis.com|gstatic` (grep su HTML/CSS della dist); VRT invariato (stessi font,
self-hosted); per 20 hex casuali, il colore derivato da `hct.ts` passa sempre
`check-contrast.mjs`.

### M4 — Critico visivo calibrato + re-audit dei 5 preset — L

Il critico PRIMA della fabbrica; il suo primo uso reale è il re-audit dei 5 preset
alternativi che CLAUDE.md chiede da tempo (i componenti sono stati ridisegnati sullo
standard meridian, gli altri preset mai riverificati).

- **Gold set (40 item)** in `factory/calibration/goldset/`: ~10 "passa" (screenshot di
  `/anteprima/meridian` post-M2 + 2–3 siti consegnati reali), ~30 "boccia" generati da
  `site-renderer/scripts/make-goldset.mjs` con **defect injection via override CSS dei
  token** (tecnica UIClip): 6 classi di difetto × ~5 istanze — spacing collassato
  (`--brand-space:0.5`), contrasto slavato, gerarchia piatta, palette in collisione (hue
  ruotata), marker AI-slop (Inter ovunque + radius 16 uniforme + gradiente purple-blue),
  overflow/disallineamenti. Etichette di Mattia in `labels.json`.
- **Skill** `.claude/skills/design-critic/SKILL.md` + agente `.claude/agents/design-critic.md`:
  rubrica come da "Sistema di qualità", formato output = contratto §7.
- **Harness di calibrazione** `site-factory-editor/scripts/calibrate-critic.mjs` (node
  puro, usa il seam IO): critico su ogni item del gold set → **κ di Cohen** vs etichette
  e **recall("boccia")**. Gate: **κ ≥ 0.6 E recall ≥ 0.9** (l'errore costoso è promuovere
  un design rotto). Sotto soglia: 1 iterazione di riscrittura rubrica budgetata; se
  ancora sotto: meno criteri, ancore più concrete. **Canary** = 10 item fissi in
  `factory/calibration/canary.json`.
- **Re-audit**: critico su `/anteprima/{atelier,nova,canon,terra,vita}` → 5 verdetti in
  `docs/decisions/2026-XX-re-audit-preset.md` + backlog. I fix bloccanti dei COMPONENTI
  vanno chiusi prima del pilota M7 (i candidati renderizzano con gli stessi componenti:
  un difetto di componente farebbe bocciare candidati incolpevoli).

*Accettazione*: `node scripts/calibrate-critic.mjs` stampa κ e recall sopra soglia; il
critico boccia i 5 degradati canary nominando la sezione giusta; il re-audit produce 5
review JSON validi.

### M5 — Fabbrica: modello dati, riferimenti + opt-out + estrazione, area editor — M

- **Opt-out (hard, loggato)**: `scripts/factory/check-optout.mjs` — robots.txt
  (direttive TDM), TDMRep (`/.well-known/tdmrep.json` + header), meta `noai/noimageai` →
  `optout.json`. "Bloccato" = riferimento non selezionabile in nessuna run.
- **Estrazione**: `scripts/factory/extract-tokens.mjs` (Dembrandt o fallback, esito M0b)
  → `extraction.tokens.json` (DTCG + confidence) + screenshot 390/1280 via Playwright.
- **Seam**: `export const IO` in `lib/run-step.ts` (una riga); `lib/factory/paths.ts`,
  `lib/factory/state.ts` (CRUD run.json, pattern `clients.ts`), `lib/factory/steps.ts`
  (FactoryStepDef: `estrazione|designer|build|gates|critico`), `lib/factory/run.ts`.
- **Editor**: `app/fabbrica/page.tsx` (libreria: card preset da manifest+meta,
  stato/versione, Vendi score, "nuova run"), `app/fabbrica/riferimenti/page.tsx`
  (URL → check opt-out immediato con esito visibile + checkbox attestazione),
  `app/fabbrica/run/[runId]/page.tsx` (timeline fasi, riuso `use-step-run.tsx`). API:
  `app/api/factory/references/route.ts`, `app/api/factory/runs/route.ts`,
  `app/api/factory/runs/[runId]/run/[fase]/route.ts` (NDJSON, pattern esistente).
  Studio UX `/impeccable` PRIMA della UI, come da regole di ingaggio.

*Accettazione*: dall'editor, URL con TDMRep di opt-out (fixture) → riferimento "bloccato"
con motivo verbatim e non selezionabile; URL consentito → `extraction.tokens.json` con
confidence + 2 screenshot su disco; run con <3 riferimenti o non attestati → rifiutata.

### M6 — Fabbrica: preset-designer + gate L1–L4 (pipeline completa) — L

- **Skill** `.claude/skills/preset-designer/SKILL.md` (+ agente): input = N
  `extraction.tokens.json` + DESIGN.md/PRODUCT.md (grammatica e anti-references) +
  sintesi libreria (manifest+meta) + `font-whitelist.json`; output =
  `candidate.tokens.json` (schema §1, Zod) + `motivazioni.json` dove OGNI gruppo di token
  cita l'evidenza (ref-id + valore osservato) o la regola di derivazione dichiarata.
- **Validatore zero-invenzioni** `scripts/factory/validate-candidate.mjs`: schema ok,
  font ∈ whitelist, hex ∈ evidenza ∪ derivazioni dichiarate (mix/scurimento), numerici
  nel range dell'evidenza; violazione = fase fallita PRIMA di ogni render.
- **Build candidato**: builder M2 con `--extra factory/runs/<id>/candidate.tokens.json` →
  anteprima `candidato-<runId>`; manifest con `stato:"candidato"` (renderizzabile su
  /anteprima, MAI offerto alla pipeline cliente).
- **Gate orchestrati** in `lib/factory/steps.ts` (tutti `io.script`, report in `gates/`):
  L1 (riuso identico degli script M1 + check-contrast sulle coppie del candidato);
  L2 `scripts/factory/novelty.mjs` (dHash via sharp + tokenDiff pesato in casa + CSD via
  `uv run` con percentili da `factory/calibration/baseline.json`, generata da
  `scripts/factory/calibrate-novelty.mjs` sulle coppie note + Vendi prima/dopo; verso i
  riferimenti logica inversa); L3 UIClip per-sezione+full-page, soglia dal gold set M4;
  L4 design-critic sul build reale, max 3 round, correzioni SOLO sui token nominati.
- Ordine fasi: designer → validate → build → L1 → L2 → L3 → L4 → stato `da_audire`.

*Accettazione (con fixture)*: un re-colour di meridian (fixture: soli hex cambiati) viene
bocciato da L2 con motivo "dHash Hamming ≤2 vs meridian"; un candidato quasi-identico a
un riferimento viene bocciato dal check sorgente; i 6 preset esistenti passati come
pseudo-candidati l'uno contro gli altri 5 PASSANO L2 (sanity della calibrazione); un
candidato scritto a mano ragionevolmente nuovo attraversa L1–L3 e produce
`critic-review.json`; ogni fase fallita lascia il report col motivo e la run riparte
dalla fase fallita.

### M7 — Pilota end-to-end: primo preset nuovo + audit pairwise + pubblicazione — M

- Mattia sceglie ≥3 riferimenti eterogenei dalle gallerie; run completa.
- **Audit UI** `app/fabbrica/run/[runId]/audit/page.tsx`: pairwise candidato vs preset
  più vicino (da novelty.json), stesso golden content, **doppio ordine AB/BA**, due
  iframe /anteprima; all'audit si compilano i metadati (Aaker, settori, antiPatterns) →
  `audit.json` (prova titolarità).
- **Pubblicazione** `scripts/factory/publish-preset.mjs`: candidato →
  `site-renderer/presets/<nome>.tokens.json@1.0.0` + meta (provenance completa),
  rigenerazione manifest/CSS/enum/editor, `fetch-fonts.mjs` per famiglie nuove,
  estensione projects VRT + baseline SOLO per il preset nuovo, aggiornamento tabella
  skill palette-designer. Idempotente: rifiuta id esistente senza version bump. A
  pubblicazione avvenuta si eliminano gli screenshot dei riferimenti (norma TDM
  "solo il tempo necessario"), conservando token estratti e log.
- Misure in run.json: durata totale, n. round critico, n. correzioni umane (KPI del pilota).

*Accettazione*: `/anteprima/<nuovo>` renderizza il golden sample; il preset appare nella
scheda Palette e nella skill; VRT verde con le celle nuove; ΔVS > 0 registrato; libreria
= 7; la pipeline cliente esistente builda invariata (VRT clienti a zero diff).

### M8 — Assegnazione deterministica cliente→design + anti-collisione — M

- Estensione skill context-enricher: campo `personalita_aaker` in contesto.json
  (5 punteggi 0–2 + primaria, tracciabile ai campi del form come tutto il resto).
- `site-factory-editor/lib/assign-design.ts` (puro TS, zero AI): hard filter
  (antiPatterns/settore/requisiti contenuto) → scoring distanza Aaker (primaria ×2) →
  anti-collisione su `factory/assignments.json` (chiave macro-settore+comune/provincia;
  vietata stessa combo preset+hue-bucket; a parità differenziare nell'ordine
  palette→varianti→preset) → tie-break seed=slug. Output `design.json` (§10) con
  spiegazione leggibile ("scelto terra perché Ruggedness 2/2; nova vietato per il settore").
- **Contratto col passo palette (retrocompatibile)**: lo step palette acquisisce una
  pre-fase deterministica che scrive `design.json`; la skill palette-designer riceve il
  preset GIÀ deciso ("il preset è X, scegli SOLO primary+accent contro i suoi neutri");
  `palette.json` resta a 3 chiavi con `brand.preset` copiato da design.json (assembler e
  slots.json invariati). Clienti esistenti intoccati finché non si rigenera. Scheda
  Palette: pannello "Assegnazione" con motivo e override umano (aggiorna design.json e
  registro).

*Accettazione*: stesso contesto.json → stesso design.json a ogni run (2 fixture); due
fixture stesso settore+comune ricevono combo preset+hue-bucket diverse con motivazione;
override umano registrato; run copy/images/build di un cliente esistente invariata.

### M9 — Varianti di sezione, layout per-preset, trattamento foto, fotografia — L (a fette, dopo M7)

- **Varianti** col pattern `variant` enum esistente; regola di split scritta in
  DESIGN.md: "variante finché consuma gli stessi slot Zod, altrimenti nuovo tipo". Prime
  due con evidenza A/B: ContactCTA "gradual reassurance" multi-step, hero big-number.
  StickyCta esiste già: non si rifà. Ogni variante = 1 valore enum + 1 ramo classi + 1
  esempio blueprint; primitive intrinseche (flex-wrap+flex-basis, auto-fit), niente
  media query per-variante.
- **Layout-nei-token**: aree nominate (`grid-area: media|heading|body|cta`) in 2–3
  sezioni pilota; `grid-template-areas` per-preset nel blocco re-skin (markup identico).
  NO style queries (Baseline troppo recente per PMI).
- **Trattamento foto come token**: gruppo `media` nel DTCG (duotone via mix-blend-mode
  parametrico sulla palette, grain feTurbulence data-URI statico, overlay) applicato in
  `.media-frame`/`.hero-overlay`; regola "mai su volti" (U.Oregon) nel CSS E come voce
  bloccante image-critic; gate AA esteso al testo su immagini trattate.
- **Fotografia per-preset**: `photographySpec`+`fluxStyleFragment` dei meta alimentano
  image-prompt-generator (frammento JSON style/lighting/film_reference/color_palette con
  hex ancorati a oggetti) + nuove voci rubrica image-critic (medium conforme, divieti
  trattamento, chiave di luce, dominanti, no doppio scurimento). Un frammento entra in
  libreria solo dopo prova su hero+card+gallery di 2–3 soggetti diversi.
- VRT: projects estesi (~540 shot/run, tag @visual separato dalla pipeline funzionale).

*Accettazione per fetta*: la variante nuova appare in slots.json e l'assembler la rifiuta
fuori enum; su un preset con grid-areas invertite il DOM è identico (diff HTML vuoto) e
lo screenshot diverso; foto trattata con testo sopra passa il gate AA esteso;
image-critic boccia un'immagine col trattamento vietato su volto (fixture).

## Idempotenza e recovery

Ogni fase di run scrive il proprio report e la run è riprendibile dalla fase fallita
(run.json append-only sugli esiti). `publish-preset.mjs` idempotente (rifiuta id
esistente senza version bump). La migrazione M2 è reversibile: le righe 55–361 restano
nella history git e il VRT certifica la parità prima di cancellare. Baseline VRT
rigenerate SOLO consapevolmente (`--update-snapshots`) e solo sul Mac di Mattia (mai
baseline miste tra macchine). Nulla si committa senza chiedere (regola di ingaggio).

## Budget

- Loop critico: **max 3 round** (fabbrica e re-audit), 1 correzione per gate
  deterministico. Oltre: escalation a Mattia.
- Una run di fabbrica ≈ 6–12 fasi `claude -p` (designer 1 + fix ≤3 + critico ≤3 +
  correzioni gate) sotto quota Max: run pianificate, MAI in parallelo con la pipeline
  clienti (la quota è condivisa). Calibrazione critico: 40 chiamate una-tantum + canary
  10 a ogni modifica della skill.
- Spesa ricorrente: **0 €**. Tutto locale/open source (Playwright, sharp, uv+torch,
  UIClip/CSD/Vendi, Dembrandt) o coperto dal piano Max. Upgrade a pagamento solo davanti
  a un collo di bottiglia dimostrato (es. Argos se la review dei diff visivi diventa il
  collo di bottiglia; GoodUI Solo 1 mese se servirà il ranking evidenze per la rubrica) —
  decisione esplicita di Mattia, non del piano.

## Rischi principali

| Rischio | Mitigazione |
|---|---|
| Terrazzo non regge i raw token (color-mix/clamp) | Fallback emitter in-house ~150 righe; contratto = file DTCG (M0a decide) |
| Dembrandt fallisce sulle PMI italiane | Estrattore Playwright in-house ~200 righe, stesso output (M0b decide) |
| torch/CSD/UIClip rotti su Py3.14/MPS | uv pinna Python 3.12; degrado dichiarato: L2 senza CSD, L3 assente (M0c decide) |
| κ < 0.6 alla calibrazione del critico | 1 iterazione rubrica budgetata; poi meno criteri + ancore più concrete; mai fidarsi di un critico non calibrato |
| Migrazione DTCG altera i preset | VRT baseline pre-migrazione + dump computed-vars valore-per-valore |
| Difetti dei componenti fanno bocciare candidati | Re-audit M4 e fix bloccanti PRIMA del pilota M7 |
| Opt-out/vicinanza legale al riferimento | Gate opt-out hard loggato; check sorgente "deve essere LONTANO"; audit.json come evidenza di diligenza; screenshot riferimenti eliminati a pubblicazione |
| Quota Max esaurita da run di fabbrica | Run pianificate in orari senza pipeline clienti; Claude Design NON in pipeline |

## Fuori perimetro (deciso, non ripianificare)

designlang (repo sparito, tarball non verificabile, postinstall di rete — bocciato dal
security-scan della ricerca) · panel multi-LLM · Claude Design in pipeline (solo tool
esplorativo manuale opzionale in sessioni pianificate) · scraping delle gallerie ·
soglie cosine assolute · verticali nuovi (ristorante/dentista) · gli 8 tipi schema senza
componente · Argos/Chromatic/MYDESIGN/GoodUI (riesaminabili a colli di bottiglia
dimostrati) · style queries CSS (fino a Baseline widely-available).

## Retrospettiva [viva]

(da compilare a fine lavoro)
