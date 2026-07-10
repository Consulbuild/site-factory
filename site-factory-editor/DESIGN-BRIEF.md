# Design brief — site-factory-editor, parte 1 (shape /impeccable)

Register: **product** (da PRODUCT.md). Fedeltà: production-ready. Ampiezza: 4 schermate + stati. Interattività: shipped-quality.

## Direzione visiva (CONFERMATA dall'utente: scuro/tecnico — 2026-07-06)

- **Scena**: Mattia in sessione di lavoro serale, monitor come unica fonte di luce, davanti alla console della sua pipeline — sala di controllo, non brochure. → **Tema scuro**.
- **Strategia colore**: Restrained su fondo scuro puro (DEFAULT B della guida palette). Bg quasi-nero `oklch(0.11 0 0)` a chroma zero, surface `oklch(0.15 0 0)`, bordi `oklch(0.24 0 0)`, ink chiaro `oklch(0.93 0.005 172)`, muted `oklch(0.68 0.008 172)`. **Primary teal luminoso `oklch(0.78 0.11 172)`** (azioni primarie, selezione, link, focus ring). Semantici adattati al dark: ambra (flag/DA CONFERMARE), verde (verificato), rosso (errore) — su tinte scure al 15-20%, mai neon.
- **Anchor references**: Vercel dashboard (nero puro, bordi sottili, monospace per i dati tecnici), Linear dark (form di settings: densità calma, una colonna, label a sinistra).
- **Tocco tecnico**: ID submission, slug, date e log dell'enricher in **monospace** con tabular-nums; il log live della generazione è un vero pannello terminale.
- **Tipografia**: una sola famiglia (system-ui/Inter), scala rem fissa 1.125, tabular-nums per ID e date. Niente display font.
- **Motion**: 150–250ms ease-out, solo cambi di stato (comparsa flag, aggiornamento badge, stream del log). `prefers-reduced-motion` = crossfade istantaneo.
- **Chrome**: topbar minima (wordmark "Site-factory" + breadcrumb cliente). NIENTE sidebar (4 pagine non la giustificano). Contenuto max ~880px per i form, tabelle più larghe ok.

## Vocabolario componenti (coerente su tutte le schermate)

- **Badge stato step**: pill sobria — `Da verificare` (ambra tenue), `Verificato` (verde tenue), `In corso` (teal + spinner puntini), `Errore` (rosso tenue), `—` (grigio, assente).
- **Flag qualità**: riga ambra inline SOTTO il campo interessato, icona ⚠ + testo del flag + azione "Risolto ✕". Banner riassuntivo in testa alla pagina intake ("3 punti da verificare") che àncora ai campi.
- **Chip fonte**: elemento chiave della tracciabilità — piccola chip grigia `settore: «…citazione…»` accanto a ogni proposta AI; hover = citazione completa. Non editabile, la riga è eliminabile.
- **Azione primaria**: un solo bottone primary per schermata, in basso a destra in una action bar sticky.

## Wireframe

### 1. `/` — Lista clienti (+ first-run key)

```
┌──────────────────────────────────────────────────────────────┐
│ Site-factory                                                 │
├──────────────────────────────────────────────────────────────┤
│  Clienti                                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ CAVALIERE BUILD SRLS          Cologno Monzese          │  │
│  │ Intake [Da verificare · 1 flag]  Contesto [—]     →    │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ … altri clienti importati (ordinati per updatedAt) …   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Dal form Tally (non importati)                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ COSTRUZIONI GENERALI A.L.   28/05/2026     [Importa]   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```
- **First-run (428 key mancante)**: al posto della sezione Tally, pannello "Configura Tally" — input key (type=password), nota "salvata in site-renderer/.env, mai committata", [Salva e verifica]. La lista disco resta visibile sopra.
- **Tally irraggiungibile**: sezione Tally sostituita da riga di warning sobria + [Riprova]; clienti disco intatti.
- **Import in corso**: bottone → spinner inline "Importo…" (l'operazione scarica anche il logo). Errore import: riga rossa sotto la submission con lo stderr utile.
- **Empty state totale**: "Nessun cliente ancora. Le submission del form Tally appariranno qui." + link al form.

### 2. `/clienti/[slug]` — Dashboard cliente

```
┌──────────────────────────────────────────────────────────────┐
│ Site-factory · Clienti / CAVALIERE BUILD SRLS                │
├──────────────────────────────────────────────────────────────┤
│  CAVALIERE BUILD SRLS                Cologno Monzese         │
│  Submission RWYNBaJ · importato 05/07/2026                   │
│                                                              │
│  1 · Intake      [Da verificare · 1 flag]   [Rivedi dati →]  │
│  2 · Contesto    [—]           [Genera contesto] (disabil.)  │
│  ─────────────────────────────────────────────────────────   │
│  3 · Palette     [prossimamente]                             │
│  4 · Copy        [prossimamente]                             │
│  5 · Immagini    [prossimamente]                             │
│  6 · Build       [prossimamente]                             │
└──────────────────────────────────────────────────────────────┘
```
- Lista verticale di step-row (NON card grid), numerata perché È una sequenza reale di pipeline. Step futuri in grigio = seam visivo.
- "Genera contesto" abilitato solo con intake verificato (tooltip spiega perché).

### 3. `/clienti/[slug]/intake` — Revisione intake

```
│  Revisione dati form            [banner: ⚠ 1 da verificare] │
│                                                              │
│  ANAGRAFICA                                                  │
│  Ragione sociale   [CAVALIERE BUILD SRLS            ]        │
│  P.IVA             [14763170967]  ✓ checksum valido          │
│  Anno inizio       [2024]                                    │
│  Indirizzo         [Via … Cologno Monzese]                   │
│    ⚠ indirizzo senza CAP: "…"              [Risolto ✕]       │
│  Città             [Cologno Monzese]   Slug  cavaliere-…     │
│                                                              │
│  ATTIVITÀ / CLIENTI E OBIETTIVI / PRESENZA ONLINE /          │
│  MATERIALI (logo preview 64px | "nessun logo") / CONTATTI    │
│  (telefono + WhatsApp separato, nota sul default parser)     │
│                                                              │
│  ────────────────────────────────── [Salva e segna verificato]│
```
- Label a sinistra (stile Linear settings), una colonna, gruppi con heading maiuscoletto sobrio (heading di gruppo, non eyebrow decorativo).
- Ogni salvataggio riscrive brief.json + intake.json coerenti (dual-write).

### 4. `/clienti/[slug]/contesto` — Genera + revisione contesto

Stato assente:
```
│  Contesto per gli agenti                                     │
│  Il contesto distilla il form in fatti verificati…           │
│  [Genera contesto]  (claude -p · ~2-5 min)                   │
│  ── durante: log live stile terminale, righe tool/testo ──   │
```
Stato da verificare/verificato:
```
│  Identità  [Impresa edile che costruisce e ristruttura…]     │
│            fonte: settore · descrizione                      │
│  Settore   [Edilizia]   Sottosettore [Costruzioni e ristr.]  │
│                                                              │
│  SERVIZI ATOMIZZATI (33)          [+ Aggiungi servizio]      │
│  ┌─────────────────────────────┬──────────────────┬───┐      │
│  │ Costruzione edifici civili  │ [Costruzioni ▾]  │ ✕ │      │
│  │ Ristrutturazione bagni      │ [Ristrutturaz.▾] │ ✕ │      │
│  └─────────────────────────────┴──────────────────┴───┘      │
│  Macro-categorie: [Costruzioni ✎] [Ristrutturazioni ✎] …     │
│  (3–5; contatore "2 servizi senza macro" ambra se >0)        │
│                                                              │
│  PUNTI DI FORZA    claim + chip fonte + ✕                    │
│  PROMESSE  consentite [tag×n]  vietate [tag×n, rosso tenue]  │
│  Promessa martello  [select tra le consentite ▾]             │
│  TONO / MATERIALI / NOTE OPERATORE [textarea]                │
│                                                              │
│  ──────────────────── [Salva bozza]  [Conferma contesto]     │
```
- Conferma con servizi scoperti → 422: il contatore ambra diventa il messaggio d'errore, scroll al primo scoperto.
- Rigenera possibile da stato errore/da_verificare (conferma prima di sovrascrivere modifiche manuali).

## Stati chiave trasversali

| Stato | Trattamento |
|---|---|
| Loading pagina | skeleton righe (no spinner centrale) |
| Enricher in corso | log live NDJSON + badge "In corso"; ricarica pagina = stato coerente da client.json |
| Errore claude -p / login Max scaduto | pannello rosso sobrio con messaggio esatto + "esegui `claude login` nel terminale" + [Riprova] |
| Salvataggio | bottone → "Salvato ✓" 2s, niente toast library |

## Riferimenti raccomandati per l'implementazione

`interaction-design` (form-heavy), `layout` (densità/ritmo), `harden` (error states), `clarify` (microcopy italiano).

---

# Scheda Palette (shape /impeccable — 2026-07-07)

**Compito dell'operatore**: giudicare se la scelta estetica dell'AI (preset + colori brand)
è giusta PER QUEL cliente, correggerla se serve, confermarla. Insight centrale: i colori
non si giudicano da un hex — si giudicano **visti applicati**. La mini-preview è la
protagonista della schermata (principio 1: i dati prima dell'interfaccia); controlli e
tabella WCAG la servono.

## Layout (stato da_verificare/verificato)

```
│ Site-factory · Clienti / CLIENTE / Palette      [← Torna]    │
│  Palette e preset                     [Badge] [Rigenera ⟳]   │
│  Dal contesto: Edilizia · tono istituzionale ·               │
│  colori cliente: «grigio antracite e arancione»              │
│  (⚠ banner staleness se contesto cambiato a monte)           │
│                                                              │
│  ┌─ CONTROLLI (≈380px) ──┐  ┌─ ANTEPRIMA (flessibile) ────┐  │
│  │ Preset   [Meridian ▾] │  │  ── EYEBROW CON LINEETTA    │  │
│  │  «professionale…      │  │  UN TITOLO CON **ACCENT**   │  │
│  │   per edilizia»       │  │  lead di prova…  [Bottone]  │  │
│  │  font: Archivo        │  │  (bg + surface del preset,  │  │
│  │  neutri: ▪▪▪          │  │   font Google del preset)   │  │
│  │ Primary  [■] [#b0561a]│  ├─────────────────────────────┤  │
│  │ ☑ Accent = primary    │  │  variante section-dark      │  │
│  │ (se ☐: Accent [■][#]) │  └─────────────────────────────┘  │
│  │                       │                                   │
│  │ CONTRASTO WCAG AA     │                                   │
│  │ Testo bianco bottoni  │   5.01:1 ≥4.5  ✓                  │
│  │ Parola accent titoli  │   5.01:1 ≥3    ✓                  │
│  │ (se FAIL: riga rossa + [Scurisci finché passa])           │
│  └───────────────────────┘                                   │
│  ─────────────────────────────  [Salva]  [Conferma palette]  │
```

## Decisioni UX

1. **Preview live protagonista**: blocco hero fedele alla grammatica ConsulBuild (eyebrow
   con lineetta, H2 con parola accent, bottone primary, chiaro + section-dark) coi neutri
   e i FONT VERI del preset (link Google Fonts del solo preset selezionato). Ogni modifica
   a preset/colori si riflette subito. NON è il sito Astro (quello arriva con Build).
2. **«Accent = primary» come toggle, spuntato di default**: lo standard dei siti consegnati
   è UN colore di marca (regola della skill); il secondo picker appare solo deselezionando —
   la UI codifica la regola invece di affidarla alla memoria.
3. **Tabella contrasti in italiano operativo**, non gergo: «Testo bianco sui bottoni»,
   «Parola accent sui titoli», ratio + soglia + ✓/✗ coi token ok/err. Ricalcolo client
   istantaneo (stessa matematica WCAG dello script, duplicata e marcata); il gate
   autoritativo resta server-side (spawn di check-contrast.mjs) a ogni salvataggio.
4. **[Scurisci finché passa]** sul FAIL: applica la regola della skill («scurisci del
   minimo necessario mantenendo la tinta») in un click — scala RGB verso il nero a piccoli
   passi finché la coppia passa. Niente trial-and-error manuale.
5. **Riga «Dal contesto»**: settore · tono · colori del cliente (chip citazione) — la
   tracciabilità che permette di giudicare la coerenza senza aprire la scheda contesto.
6. **Stati**: assente → runner (gate: contesto verificato, copy che spiega il perché);
   in_corso → RunLog; errore → pannello rosso + Riprova; da_verificare/verificato →
   review; modifiche salvate riportano a da_verificare (come contesto). Staleness →
   banner ambra [Rigenera palette] / [Va bene così]. [Rigenera ⟳] sempre disponibile
   con ConfirmDialog (sovrascrive le scelte manuali).
7. **Una azione primaria**: [Conferma palette]; [Salva] secondaria; guardia modifiche
   non salvate; su schermi stretti la preview passa sopra i controlli (resta protagonista).

---

# Scheda Copy (shape /impeccable — 2026-07-07)

**Compito dell'operatore**: leggere il copy come lo leggerebbe il titolare al telefono,
correggere il wording, ARBITRARE i finding del critico (es. una promessa vietata che il
blueprint però promette nella CTA fissa), confermare. 32 slot sono tanti: il rischio è
la "form dump". Insight centrale: **l'editor si legge come la PAGINA** — i gruppi seguono
l'ordine reale delle sezioni del sito (Hero → Trust → Servizi → … → Footer), così la
revisione è una lettura narrativa, non una compilazione.

## Layout

```
│ …breadcrumb… Copy                                [← Torna]   │
│  Copy del sito                     [Badge] [⟳ Rigenera]      │
│  (⚠ banner staleness — Aggiorna con l'AI / Rigenera / Va bene)│
│  ┌─ CRITICO ────────────────────────────────────────────────┐│
│  │ FAIL · round 3 · 12 finding      [Ricontrolla col critico]││
│  │ C3 bloccante · Hero eyebrow → «preventivo gratuito» è     ││
│  │   vietata … fix: …                        [vai al campo →]││
│  └──────────────────────────────────────────────────────────┘│
│  SEO ─ seoTitle [………] 54/70 ─ seoDescription [………] 148/160   │
│  1 · HERO ─ eyebrow · title (anteprima **accent** col colore  │
│      vero della palette + indicatore «1 frase accent ✓»)      │
│  2 · TRUST BAR ─ righe Punto 1..3 (value+label)  [+ punto]    │
│  3 · SERVIZI ─ card 1..5 (titolo+desc+bullets chip)           │
│      ▸ Copertura servizi (tabella voce→card, warn se diverge  │
│        da contesto.servizi_atomizzati)                        │
│  4 · GALLERIA ─ didascalie (nota: le immagini AI nasceranno   │
│      DA queste) · 5 · PROCESSO ─ passi · 6 · FORM · 7 · FAQ   │
│      (domanda+risposta) · 8 · CTA · 9 · CANALI · 10 · FOOTER  │
│  ───────────────────────────── [Salva]  [Conferma copy]      │
```

## Decisioni UX

1. **Ordine di pagina, una colonna** (max ~880px): la revisione scorre come il sito.
2. **Pannello critico in testa = coda di lavoro**: verdetto+round (il round è
   un'informazione, il tetto di 3 vale solo nel run automatico), finding con gravità,
   prova e fix, **[vai al campo →]** che scrolla allo slot; il campo colpito porta anche
   un chip rosso inline (⚠ n) così il contesto è visibile scorrendo.
3. **Contatore live per campo** `47/52` (mono, senza contare i `**`; err oltre budget,
   warn ≥90%) — stessa definizione di conteggio del validatore (slots-shared).
4. **Slot accent**: indicatore «1 frase **accent** ✓/✗» + riga di anteprima col colore
   accent VERO della palette del cliente (fallback token brand).
5. **Array come RIGHE** (Card 1 = titolo+desc+bullets; Punto trust = value+label;
   Domanda = q+a): aggiungere/togliere una riga muta TUTTI i sibling insieme — la
   coerenza di lunghezza è garantita dalla struttura, coi bound del renderer sui bottoni
   (card 3–5, trust 2–5, passi 2–4, FAQ 3–8, didascalie 3–12; bullets ≤5).
6. **Copertura sotto Servizi** (non in testa: appartiene a quella sezione), con
   cross-check client vs `contesto.servizi_atomizzati` e vs i titoli card correnti —
   warn informativo, il blocco resta al critico/umano.
7. **Gate deterministico**: [Salva]/[Conferma] → il server rifiuta con 422 puntuale
   (mai su disco un artifact non conforme); client-side i contatori/accent disabilitano
   [Conferma] sugli errori evidenti.
8. Staleness banner ([Aggiorna con l'AI] = update-mode che preserva la curatela /
   [Rigenera da zero] / [Va bene così]); [⟳ Rigenera] in header con ConfirmDialog;
   runner iniziale con log multi-fase («copywriter → critico → correzioni», stima
   10–30 min).


# Scheda Immagini (shape /impeccable — 2026-07-08)

Register: **product** (vocabolario esistente: badge pill, bordi sottili, mono per
dati tecnici, teal per azione/selezione). Le immagini sono le protagoniste: chrome
minimo intorno alle thumbnail. Fedeltà: production-ready, una pagina a due rami.

## Layout (editor, trace presente)

```
│ Clienti / CAVALIERE BUILD / Immagini        [← Torna al cliente] │
│  Immagini del sito            [⟳ Rigenera tutto] (ghost+confirm) │
│  [banner staleness ambra se contesto/copy/palette cambiati]      │
│  [riepilogo critico: FAIL round 2 · 2 scarti su 6  [Ricontrolla]]│
│                                                                  │
│  HERO                                                            │
│  ┌────────────────────────────────┐  16:9, grande (max ~640px)   │
│  │        [thumbnail hero]    ok✓ │  img/hero.jpg (mono)         │
│  │  Alt: [__________________] 87/140                             │
│  │  ☐ rigenera                                                   │
│  └────────────────────────────────┘                              │
│                                                                  │
│  CARD SERVIZI          (griglia auto-fit minmax(240px,1fr))      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│  │[thumb] ✓ │ │[thumb] ✗ │ │[thumb] ✓ │   soggetto atteso        │
│  │card-1.jpg│ │card-2.jpg│ │card-3.jpg│   (riferimento) sotto    │
│  │Alt: [__] │ │Alt: [__] │ │Alt: [__] │   il nome file           │
│  │☐ rigenera│ │☑ rigenera│ │☐ rigenera│                          │
│  └──────────┘ │⚠ motivo   │ └──────────┘                          │
│               │  scarto   │                                      │
│               └──────────┘                                       │
│  ── [n selezionate → Rigenera selezionate] [Salva] [Conferma] ── │
```

## Decisioni UX

1. **Esito critico INLINE sotto ogni thumbnail** (confermato da Mattia): badge
   ok✓/scarto✗ sull'angolo, riga ambra col motivo (+fix proposto in title) sotto
   il riquadro scartato. Riepilogo in testa con conteggio scarti + [Ricontrolla
   col critico]. Coerente con «il dubbio è visibile, inline sul campo».
2. **Rigenerazione selettiva = checkbox per riquadro** + bottone nell'action bar
   («Rigenera selezionate (n)», disabilitato a 0); gli scarti del critico partono
   pre-selezionati. Mode `regen` con lista file.
3. **Hero grande, card in griglia auto-fit**: la gerarchia rispecchia il peso nel
   sito. Niente gallery (solo foto reali, scheda futura) — nota informativa in fondo.
4. **Alt editabile per immagine** con contatore live n/140 (stessa definizione del
   validatore server), guardia unsaved, [Salva] = PUT alts.
5. **Thumbnail via route** `/api/clients/<slug>/img/<file>?v=<hash trace>` per
   cache-bust dopo rigenerazione; `loading="lazy"`, aspect-ratio fisso per zero
   layout shift, sfondo raise durante il load.
6. **Runner** (trace assente): gate esplicativo se copy/palette non verificati;
   se manca BFL_API_KEY → KeySetup inline (Keychain) al posto del bottone;
   [Genera immagini] + RunLog multi-fase («prompter → critico → rigenera scarti»,
   stima 10–30 min, costo ~0,3 $/run).
7. **Conferma immagini** (azione primaria unica) = POST che rivalida il manifest,
   DERIVA images.json e marca verificato; 422 puntuale mostrato in testa.

# Scheda Build & Pubblica (shape /impeccable — 2026-07-08)

Register: **product**, vocabolario esistente. È la scheda più "console" di tutte:
tre momenti in sequenza reale (Build → Revisione → Pubblicazione), quindi la
numerazione è informazione, non scaffolding. Un'unica azione primaria per volta,
contestuale allo stato; tutto il resto secondario/ghost.

## Layout (flusso verticale a 3 momenti)

```
│ Clienti / CAVALIERE BUILD / Build            [← Torna al cliente] │
│  Build & pubblicazione                                            │
│  [banner staleness ambra: «Cambiati a monte: copy.json, …»]       │
│                                                                   │
│  1 · BUILD                              ultima: 08/07 15:44 ·     │
│  [Builda il sito]  [Anteprima parziale]   4 pagine · 222 KB      │
│  (primario se       (ghost, sempre       [badge «parziale» se     │
│   images ok)         attiva)              partial]                │
│  ┌─ RunLog live (── media ── assemble ── validate ── astro) ─┐    │
│                                                                   │
│  2 · REVISIONE                                    [StepBadge]     │
│  [Apri anteprima ↗]  «controlla desktop e mobile»                 │
│  [Conferma build]  (primario se da_verificare e non parziale)     │
│                                                                   │
│  3 · PUBBLICAZIONE                                                │
│  [KeySetup token/account se mancanti]                             │
│  Dominio custom (opzionale): [____________] [Salva]               │
│    «richiede la zona DNS già sull'account Cloudflare»             │
│  Stato: ● online — https://slug.sub.workers.dev [copia] [apri ↗]  │
│         pubblicato il 08/07 16:02 · ⚠ build più recente non       │
│         pubblicata (se builtAt > deployedAt)                      │
│  [Pubblica su Cloudflare / Ripubblica] (primario se verificato)   │
```

## Decisioni UX

1. **Numerazione 1·2·3 reale** (è una sequenza vera, come il processo dei siti):
   ogni momento è una sezione con header uppercase faint, separata da border-t.
2. **Una primaria contestuale**: Builda (stato ≤ assente/errore o staleness) →
   Conferma build (da_verificare, build completa) → Pubblica (verificato).
   Le altre azioni scalano a secondary/ghost. Il flusso si legge da solo.
3. **Parziale sempre disponibile ma marchiata**: badge ambra «parziale» sull'esito,
   conferma e pubblicazione la rifiutano con spiegazione (guard anche server).
4. **Esito build come riga dati mono** (builtAt · pages · KB): stile console,
   niente hero-metric.
5. **Pubblicazione = pannello stato**: pallino verde + URL cliccabile + copia;
   avviso «build più recente non pubblicata» quando builtAt > deployedAt;
   errore wrangler verbatim in blocco err (è il messaggio utile).
6. **Dominio custom**: campo con salvataggio proprio (non guardia globale),
   nota fissa sul prerequisito DNS; usato al deploy successivo.
7. **Prerequisiti inline**: KeySetup per le 2 key CF al posto del bottone
   Pubblica; nota una tantum sul subdomain workers.dev al primo deploy.
