# Design brief — site-factory-editor, parte 1 (shape /impeccable, 2026-07-06) — STORICO

> Archiviato il 2026-09-13: direzione visiva (tema scuro/teal, «niente sidebar»),
> vocabolario e wireframe delle prime 4 schermate, tutti superati dal refactoring del
> 2026-07-11 (`site-factory-editor/DESIGN-SYSTEM.md`: blu royal, due temi, shell con
> sidebar+topbar) e dal form bozza (Tally dismesso). Gli shape delle schede successive
> restano in `site-factory-editor/DESIGN-BRIEF.md`.

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
