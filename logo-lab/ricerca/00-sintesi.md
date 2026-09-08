# Loghi professionali per PMI con l'AI: cosa dice la ricerca e come scrivere i prompt

Sintesi dei quattro rapporti in questa cartella (2026-09-08): `01-principi-logo-design.md` (37 fonti), `02-prompt-engineering-loghi.md` (~50 fonti, doc ufficiali di tutti i modelli), `03-skill-ecosistema-claude.md` (~30 skill valutate), `04-claude-design.md` (37 fonti). Ogni affermazione qui sotto è tracciabile a quei file.

## 1. Cosa rende un logo «professionale» (e cosa il prompt deve quindi imporre)

1. **Un solo concetto.** Airey: «focus on one thing»; UCDA: «don't be too literal»; Rand: il logo identifica, non descrive. Il cavaliere *più* la casa dei nostri test è un doppio soggetto: il critico lo ha già segnalato come affollato a 16 px.
2. **Deve reggere a 16–32 px e in bianco e nero.** «Start in black and white — it's impossible to rescue a poor idea with an interesting palette». I designer testano favicon, monocromo, squint, «descrivilo a parole».
3. **2 colori + un neutro**, mai dipendenza dal colore. Nel settore edile il 53% dei loghi usa due colori. L'**oro** è segnalato come sovrautilizzato negli ultimi anni, «tacky» se abbondante, e in stampa vira al marrone: va dosato, non escluso.
4. **Tipografia**: sans bold, x-height alta, contatori aperti, massimo due caratteri, nome dominante sulla tagline; i font thin spariscono a favicon.
5. **Tipo di logo per una ditta locale sconosciuta**: combination mark (simbolo + nome separabili) o wordmark. **Mascotte ed emblemi sono legittimi** ma «highly detailed mascots don't translate well on small materials»: richiedono per forza una variante semplificata per la favicon. I riferimenti forniti (mascotte, emblema con nastro) stanno in questa categoria: funzionano nell'header, non da soli nella scheda del browser.
6. **Cliché del settore** (casetta, martello, gru, casco, stretta di mano, swoosh): non vietati, ma vanno **riprogettati con intenzione** (tubo che diventa lettera, tetto in negative space, casa fusa col monogramma). Il cliché letterale «hints strongly that the company is dull, average».
7. **Segnali di logo AI/amatoriale** che un umano coglie in mezzo secondo: spessori di linea che cambiano, curve e raggi non uguali, gradienti/riflessi metallici, ombre, 3D, lettere storpiate, kerning irregolare, elementi che si toccano, cornici e nastri vuoti da template, look da sticker/esports.

Il rapporto 01 chiude con una checklist di 12 criteri verificabili: è il materiale per il critico (vedi §5).

## 2. Come si scrive il prompt: il bilanciamento che le fonti indicano

**Convergenza di tutte le doc ufficiali 2025-26** (BFL, OpenAI, Google, Ideogram, Recraft): prosa naturale, non liste di tag; ciò che viene prima pesa di più; **30–80 parole** è la fascia ideale (BFL: «usually ideal for most projects»; Ideogram accetta fino a ~150 ma «only if well structured»); niente aggettivi valutativi («professional», «modern», «high quality» «mean nothing to an image model»).

**Cosa fissare e cosa lasciare libero** (Recraft: «short prompts → the model designs with you; long prompts → the model executes your architecture»; community: «the biggest mistake is describing the subject in too much detail»):

| Fissare | Lasciare al modello |
|---|---|
| tipo di logo (combination mark / mark / emblem) | come costruire la forma |
| UN concetto, come direzione («un simbolo che fonde X e Y») | posa, proporzioni, dettagli |
| 4-6 parole di stile concrete (flat vector, bold consistent stroke, strong silhouette, negative space) | il «carattere» dentro quei vincoli |
| 2 colori + neutro, con hex dove il modello li legge (FLUX, Ideogram, Recraft) | |
| testo tra virgolette, breve, tipografia descritta a parole («bold geometric sans-serif, all caps»), «render verbatim» | il carattere specifico |
| sfondo e formato (fondo pieno, centrato, margine) | |
| esclusioni in coda | |

**Ordine**: tipo di logo + azienda → concetto → stile → colori → testo → sfondo → esclusioni.

**Regole per il testo integrato** (la parte più fragile): virgolette doppie, una-due parole per stringa, testo presto nel prompt, «render the text verbatim, no extra characters»; per nomi difficili GPT Image accetta lo spelling lettera per lettera. Modelli affidabili sul testo: GPT Image 2 e Ideogram 3/4 (OCR ~0,97); FLUX.2 buono se si spegne il prompt upsampling; Nano Banana 2 meno preciso su stringhe lunghe; Midjourney v8 «still not reliable enough». La mitigazione più citata resta: simbolo con «no text» + wordmark composto a parte (che è ciò che fa l'Header del renderer).

**Parole che rovinano un logo**: realistic, photorealistic, detailed, shading, texture, metallic, «in the style of», e i complimenti al modello.

**Differenze pratiche per servizio**: FLUX.2 non ha negative prompt (si descrive lo stato voluto: «flat solid background, single centered mark»); Gemini idem (negativi semantici); Ideogram spegnere Magic Prompt quando c'è testo, opzione JSON con `color_palette` fino a 16 hex e bounding box; GPT Image `background: transparent` nativo; Midjourney `--style raw --s 50 --no …`.

## 3. Dal form al prompt: la mappatura

| Campo del form | Slot del prompt | Regola |
|---|---|---|
| Nome azienda | testo tra virgolette | maiuscolo, senza forma giuridica (SRL/SRLS), max 2-3 parole |
| Settore + descrizione | «a local [settore] company in Italy» + **una** direzione di concetto | dalla descrizione si estrae il fatto distintivo (es. «bagni in 5 giorni» → velocità + acqua), non l'elenco dei servizi |
| Atmosfera / tono | 3-4 parole di stile **concrete** | «minimale e pulito» → geometric, single weight, negative space; «solido/affidabile» → heavy stroke, compact block; «amichevole» → rounded shapes, friendly character (qui la mascotte è appropriata) |
| Colori aziendali | 2 hex + neutro | se «aperto a proposte»: palette di settore (dati claudekit `industries.csv`: Construction #F97316/#CA8A04/#334155; Plumbing #0EA5E9/#F97316/#334155; Electrical #F97316/#FBBF24/#334155) o la palette del preset già scelta |
| «Cosa non vuoi» | esclusioni in coda | più i cliché letterali del settore |

**Direzioni di concetto per settore (2-3 alternative ciascuno, per non dare la stessa cazzuola a tutti):**
- Ristrutturazioni/edilizia: profilo di facciata in negative space dentro un blocco; monogramma dell'iniziale costruito con mattoni/livelli; filo a piombo stilizzato.
- Bagni/idraulica: goccia e piastrella fuse in una forma; tubo che diventa l'iniziale; miscelatore ridotto a due segni.
- Termoidraulica: fiamma e goccia in un unico tratto continuo; iniziale con serpentina.
- Coperture/impermeabilizzazioni: iniziale i cui vertici sono falde di tetto; linea di gronda + onda d'acqua in un solo segno.
- Impianti elettrici: saetta in negative space dentro l'iniziale; presa ridotta a tre segni.

## 4. I tre prompt di prova riscritti (soggetto libero, ~65 parole)

Struttura identica, cambia solo il primo blocco. Versione **con nome integrato** (per GPT Image, Ideogram, FLUX.2); per la versione **solo simbolo** togliere la frase sul testo e aggiungere «no text». Sono in `../prompts/prompt-test-3-clienti.md`.

**La Cecilia (dati reali: bagni in 5 giorni, vasca in doccia in 8 ore, Puglia, tono minimale e pulito, colori aperti)**

> Combination-mark logo for "LA CECILIA", a bathroom renovation company in Puglia, Italy. Mark: one symbol that fuses a water drop with a simple bathroom shape, geometric construction, single consistent stroke weight, strong silhouette. Colors: deep blue #1E3A8A and orange #F97316 on flat white. The name "LA CECILIA" in bold geometric sans-serif, all caps, evenly spaced, to the right of the mark, rendered verbatim. Centered, generous margin, no gradients, no shadows, no mockup.

**Termoidraulica Rossi (fixture: caldaie, bagni, pompe di calore, pronto intervento; affidabile e amichevole)**

> Combination-mark logo for "TERMOIDRAULICA ROSSI", a plumbing and heating company in Bergamo, Italy. Mark: a flame and a water drop drawn as one continuous shape, bold flat vector, rounded corners, clear negative space. Colors: orange #F97316 and slate #334155 on flat white. The name "TERMOIDRAULICA ROSSI" in bold rounded sans-serif, all caps, to the right of the mark, rendered verbatim. Centered, generous margin, no gradients, no shadows, no mockup.

**Coperture Marini (fixture: tetti, terrazzi, isolamento, grondaie; solido e affidabile)**

> Combination-mark logo for "COPERTURE MARINI", a roofing and waterproofing contractor in Treviso, Italy. Mark: the letter M whose two peaks read as roof ridges, heavy geometric strokes, compact silhouette, flat vector. Colors: charcoal #1F2937 and brick red #B91C1C on flat white. The name "COPERTURE MARINI" in bold condensed sans-serif, all caps, to the right of the mark, rendered verbatim. Centered, generous margin, no gradients, no shadows, no mockup.

Perché così: un concetto per prompt dato come direzione (non come disegno), stile in 4-6 parole concrete, hex, testo tra virgolette con «verbatim», fondo pieno, esclusioni in prosa (valide anche su FLUX e Gemini che non hanno negative prompt). Cosa guardare: nome esatto, un solo soggetto, spessori coerenti, leggibilità del simbolo a 32 px, zero gradienti.

**Nota onesta sui riferimenti forniti** (mascotte e emblemi a 3 colori con oro): sono uno stile legittimo per toni «amichevole/caratteriale» e nell'header funzionano; la letteratura però li dà come i tipi che peggio reggono la favicon e segnala l'oro come sovrautilizzato. Proposta: usare lo stile illustrativo quando il tono del form lo chiede, e prevedere sempre un simbolo semplificato per la scheda del browser.

## 5. Skill: cosa esiste, cosa serve, cosa manca

**Da installare (dopo lo scan di sicurezza previsto dalle regole):**
- `black-forest-labs/skills` (ufficiale BFL, MIT, 4/5): regole di prompt FLUX.2 coerenti con il modello già in pipeline (prosa > tag, hex, testo tra virgolette, niente negative). Unica skill ufficiale di un provider trovata.

**Da cui prendere frammenti per il critico (non da installare intere):**
- `Leonxlnx/taste-skill → brandkit` (4/5): blacklist anti-generico e 6 metodi di concept (monogram+meaning, negative space, construction geometry…).
- `rampstackco/claude-skills → brand-identity` (4/5): criteri verificabili (16 px, monocolore, silhouette distintiva, WCAG).
- `anthropics/skills → frontend-design` (3/5): il test «è la scelta di default per qualsiasi brief o una scelta per QUESTO brief?».
- La checklist di 12 criteri del rapporto 01 e la lista dei segnali AI (Left Hand Design, Corwin).

**Già installata e utile come dato**: la skill `design` (claudekit, companion di ui-ux-pro-max) ha un modulo logo con `industries.csv` (55 settori con stili consigliati, colori, simboli e «avoid»: Construction, Plumbing, Electrical inclusi) e `logo-prompt-engineering.md`. I suoi template però sono liste di keyword (superate dalle doc 2025-26 che vogliono prosa) e la sua regola «AI struggles with text; generate mark separately» conferma la scelta dell'Header. Genera via Gemini/MuAPI: non aggiunge servizi rispetto a `genera.mjs`.

**Skill che fanno disegnare SVG a Claude** (neonwatty 80★, pranavred, op7418 2,1k★, rknall): tutte producono pittogrammi geometrici «da icona», nessuna affronta la tipografia, tutte presuppongono un umano che sceglie in chat. Utili solo se si volesse il monogramma geometrico; **non** sono la strada per lo stile illustrativo dei riferimenti. Claude Design (rapporto 04): stessa capacità (SVG scritto dal modello), senza API, MCP first-party rotto a settembre 2026 (403/404), quote pesanti; buono per ideazione interattiva dell'operatore, non per pipeline.

**Cosa manca nell'ecosistema e va scritto in casa** (nessuna skill trovata lo fa): un **critico visivo di loghi** headless che guardi il render a 16/32/64 px e applichi soglie hard (la checklist a 12 criteri + i segnali AI + la blacklist di settore + il test «default vs scelta»); e una **mappa settore → 2-3 direzioni di concetto** (§3) per non ripetere lo stesso simbolo a tutti i clienti dello stesso mestiere. Il `critico-v4-lockup.md` del lab è il seme del primo; la tabella del §3 è il seme del secondo.

## 6. Passi proposti (non eseguiti)

1. Provare i tre prompt del §4 su Arena (side-by-side GPT Image 2 / Ideogram 3 / FLUX.2 / Nano Banana 2) e giudicarli a occhio con la checklist a 12 criteri.
2. Portare la checklist e i segnali AI nel critico (v5), così il pre-filtro automatico ragiona con gli stessi criteri dei designer.
3. Codificare la mappa settore → concetti e la mappa tono → parole di stile nella skill, come tabelle, non come prosa.
4. Solo dopo la scelta del servizio: sfondo trasparente/ritaglio, separazione simbolo/nome, eventuale vettorizzazione.
