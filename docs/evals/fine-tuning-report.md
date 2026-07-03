# Report di fine-tuning — 3 agent/skill (Copy · Palette · Image)

Obiettivo: A/B testing critico delle 3 skill finché applicabili a un ambiente di sviluppo professionale, senza over-ingegnerizzare.

## Metodo
- **Oracolo:** 2 brief realistici (`brief-and-rubric.md`) — A: edilizia/Roma; B: energia-solare/Bari — + 3 rubriche pass/fail.
- **Generazione "reale":** ogni round un subagent fresco fa girare la skill sul brief **senza vedere la rubrica** (testo la skill, non l'agente addestrato al test).
- **Critica:** valutazione contro rubrica + **gate deterministico** per la palette (`check-contrast.mjs`, WCAG 2, ri-eseguito in modo indipendente — non mi fido del PASS auto-dichiarato dal subagent).
- 2 round: Round 1 su brief A (edilizia), Round 2 su brief B (energia = conferma fix + generalizzazione a industria diversa).

## Round 1 (brief A) — le 3 skill passano già le rubriche; rilievi mirati
| Skill | Esito | Rilievi → fix v2 |
|---|---|---|
| Copy | 9/9 PASS. Onestà eccellente (`«DA CONFERMARE»`, no dati inventati). | **C1** mancava blocco `seo` (title/meta) → aggiunto al contratto+checklist. **C2** ridondanza racconto PAS vs lista dolore→beneficio → "scegli una forma". |
| Palette | PASS, AA verificato in modo indipendente (15 coppie). | **P1** il subagent auto-testava solo 5 coppie, evitando le border-line → skill impone ora la **matrice completa** (incl. bianco-su-fill-primary). **P2** nota sui token decorativi esclusi dal gate. |
| Image | PASS. Solo FLUX.2, coerenza style-bible, alt IT, API submit+poll, volti evitati. | **I1** «senza testo» negativo vs regola "frasi in positivo" (+ auto-contraddizione skill) → eccezione tecnica esplicita. **I2** hex brand forzati su props casuali → legare a max 1 elemento pertinente / color grading. **I3** mappa nome→endpoint API. |

## Round 2 (brief B, energia) — conferma fix + generalizzazione
- **Copy:** PASS. `seo` presente (title 56, meta 157); niente ridondanza; **trappola di onestà superata** (testimonianze `[]` → placeholder «Non inventare», telefono/indirizzo/garanzia → `«DA CONFERMARE»`); incentivi energetici (GSE/CER/detrazione) accurati, guida con l'esito (bolletta/autonomia).
- **Image:** PASS. Verde legato solo a vegetazione, giallo alla luce solare (niente hex su props casuali); «senza testo/loghi» coerente; endpoint `/v1/flux-2-max`; nessun logo produttori; tecnico di spalle.
- **Palette:** PASS. Matrice **completa** a 15 coppie, **verificata in modo indipendente (exit 0)**; mid-tone trap con margine (bianco/fill-primary 7.04, bianco/CTA 6.61). **P3 trovato:** layer semantico messo in `:root` semplice → in Tailwind v4 non genera le utility `bg-*/text-*`. Corretto nell'esempio+regola della skill (`@theme inline`).

## Round 3 — allineamento al contratto reale del renderer (`schema.ts`)
Al sanity check finale è emerso che `site-renderer/` **esiste già** con un contratto preciso (la mappatura iniziale era errata): `site.json` validato da `schema.ts`, 6 preset, cascade `:root`(=meridian) < `[data-preset]` < palette inline, il cliente fornisce **solo `primary`+`accent`**, titoli con convenzione `**accent**`. Le skill v2 erano disallineate (la palette emetteva un tema OKLCH proprio invece di riusare i preset; il copy usava nomi di campo inventati). Correzioni:
- **Palette:** riscritta → output `brand = { preset, palette:{primary,accent} }` (hex); preset scelto per settore; contrasto verificato contro i **neutri reali** del preset (tabella dei 6 preset nella skill). Scratch OKLCH rimosso.
- **Copy:** output = **props di sezione secondo `schema.ts`** (nomi esatti + min/max), SEO in `meta.seoTitle/seoDescription`, accent-word `**…**` (una per titolo), niente MAIUSCOLO manuale.
- **Image:** output `image:{src,alt}` (+`caption` Gallery); niente immagini per loghi/certificazioni/volti (asset reali del cliente).
- Aggiunto `site-renderer/scripts/validate-site.ts` = **gate Zod** (`parseSiteConfig`) per l'output della pipeline.

### Gate finale (verifica indipendente, non auto-dichiarata)
Un agente di assemblaggio ha prodotto un `site.json` completo per il Brief A applicando le 3 skill insieme (`docs/evals/generated-site-A.json`). Verificato da me:
- **Zod `parseSiteConfig`: VALID** (exit 0) — 12 sezioni in ordine di conversione.
- **Contrasto:** primary `#1f4e6b`/#fff = 8.90:1; accent `#b0561a`/#fff = 5.01:1 → AA.
- **Contenuto:** `seoTitle` 56 / `seoDescription` 158; 9 titoli con **una** accent-word ciascuno (0 errori); **0 dati inventati** (3 testimonianze verbatim dal brief); nessuna immagine per loghi/certificazioni.

## Round 4 — confronto con i siti consegnati (il livello di qualità richiesto)
Analisi in dettaglio di ssccostruzionisrls.it (charcoal `#1f1f1e` + arancio `#d97732`) e
costruzionigeneralidilaceciliagiovanni.it (navy `#161b22` + blu `#2f568e`): copy verbatim,
palette dal CSS, inventario immagini. Entrambi GoHighLevel con blocchi custom; stessa
grammatica di DESIGN.md. Gap trovati negli agent → fix:

| Area | Gap vs siti consegnati | Fix nella skill |
|---|---|---|
| Copy — registro | I siti parlano in **«tu»** («Realizziamo la TUA visione», «Goditi il nuovo bagno»); la skill imponeva «voi/Lei» e il site.json generato era tutto in «voi» | Registro **noi+tu** obbligatorio; esempio corretto |
| Copy — concisione | Sub hero consegnati ≤15 parole, desc card 1 frase, bullets 2–4 parole; il generato impilava 3 prove nel subtitle | **Tetti di lunghezza vincolanti** misurati sui siti; i numeri di prova vanno in TrustBar/badges, non nel subtitle |
| Copy — titoli card | Consegnati: nomi brevi («Finiture Interne»); la skill chiedeva titoli-slogan con beneficio in coda | Titolo card = nome servizio 2–4 parole, beneficio nella desc |
| Copy — USP | CG martella «5 giorni» 5 volte (hero, trust bar, servizi, FAQ, CTA) | Regola «promessa martello»: LA promessa più concreta ripetuta su tutta la pagina |
| Copy — TrustBar | SSC non ha KPI numerici: chip qualitative («Team Esperto / Professionisti qualificati») | Promesse-chip ammesse quando i numeri non ci sono (mai inventarli) |
| Copy — FAQ | Risposte consegnate: «Sì./No.» subito + 1–2 frasi | Regola risposta diretta |
| Copy — processo | Nuovo passo di **revisione obbligatorio** (rilettura «tu» + taglio ⅓ parole + tetti) prima della checklist | qualità > velocità, come richiesto |
| Palette — tinta unica | Entrambi i siti usano UN colore per tutto (CTA, accent, eyebrow); il generato aveva primary navy + accent rame | **Default primary == accent**; due tinte solo per brand bicolore reale |
| Palette — AA | I siti live FALLISCONO AA: arancio SSC/bianco = 3.16:1, blu CG/dark = 2.63:1 (verificato con check-contrast.mjs) | Ancore corrette: `#b0561a` (5.01) e `#2f568e` (7.39); se il colore fallisce → scurire il minimo mantenendo la tinta. Il gate esistente era giusto: **corregge** i siti consegnati, non li copia |
| Palette — token | CG ha 6 varianti dello stesso blu sparse nei blocchi | Un solo hex per tinta (il sistema a token lo garantisce) |
| Immagini — fonte | Consegnati: hero AI (ChatGPT), card stock/AI, **gallery = SOLO foto reali di cantiere** (la vera prova sociale); la skill avrebbe generato anche la gallery | **Policy fonte a 3 livelli**: Gallery/BeforeAfter mai generate (foto cliente o «DA CONFERMARE»); hero [max]; card/processo [pro] solo se mancano foto reali |
| Immagini — ambientazione | Le AI dei siti live mostrano bagni/case USA per imprese italiane | Style bible: **ambientazione italiana/mediterranea obbligatoria** |
| Immagini — peso | PNG da 1.7–2.1 MB in produzione | Output jpeg/webp (`output_format`) |
| Immagini — didascalie | Gallery CG: 6 didascalie identiche | Didascalie specifiche per lavoro, mai ripetute |

Difetti dei siti consegnati da NON replicare (la pipeline fa già meglio): refusi
(«completat», «dambrosio»), «Terms and Condition» in inglese, copie desktop/mobile
disallineate, contrasti AA falliti, blu non tokenizzato, PNG pesanti.
Nota architetturale: il dark navy di CG (dark tinto di brand) non è riproducibile — per
DESIGN.md il fondo scuro è charcoal del preset, scelta deliberata. Se in futuro serve,
è un preset nuovo, non un compito del palette agent.

**Verifica Round 4** (3 subagent freschi su Brief A, skill aggiornate; controllo indipendente mio):
- **Palette:** `{preset: meridian, primary == accent == #b0561a}` (tinta unica), gate exit 0 (5.01:1). = look consegnato, AA-corretto. PASS.
- **Immagini (dry-run):** gallery 6/6 foto reali cliente con didascalie specifiche; card servizi da foto reali a soggetto; generate solo hero [max] + 4 process [pro], ambientazione romana, jpeg, hex su 1 elemento; domande di checkpoint sensate. PASS.
- **Copy:** registro tu al 100% (0 «voi/Lei»), subtitle hero 14 parole senza numeri (numeri in TrustBar), desc card 8–11 parole, titoli card nome-servizio, «referente unico» martellato 4×, FAQ con «Sì.» diretto, seoTitle 56. PASS con 2 nèi: seoDescription 161 caratteri (1 oltre il tetto) e un titolo CtaBanner dalla sintassi rivedibile — roba da checkpoint umano, non da altro giro di tuning.

## Verdetto: production-ready (contro il contratto reale E il livello dei siti consegnati)
Le 3 skill producono un `site.json` **valido contro `schema.ts`**, accessibile (AA verificato), onesto e ordinato per conversione — su 2 industrie — e dopo il Round 4 replicano voce, concisione, tinta unica e policy-immagini dei due siti consegnati (superandoli su AA, token, refusi e peso immagini). 3 wrapper agent in `.claude/agents/` allineati.

### Caveat operativi (non bug delle skill)
- **Endpoint/param BFL** (`/v1/flux-2-pro|max`) da confermare sui docs correnti alla prima integrazione con `BFL_API_KEY`.
- **Selezione+ordinamento sezioni** (ex Section Architect, eliminato): qui l'ha fatta l'agente di assemblaggio; in pipeline serve un passo/regola che scelga le sezioni dal brief.
- Brief-schema definitivo da allineare ai campi reali del form Tally.
