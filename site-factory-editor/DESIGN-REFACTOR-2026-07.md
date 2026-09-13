# Refactoring design editor — studio UX/UI (Fase 1, 2026-07-11)

> **STATO: IMPLEMENTATO** (Fase 2 completata 2026-07-11, fette A–H nei commit
> `368460e…f003fca` + fix post-review). Questo documento resta la spec di
> riferimento del design v2 (§4-7); l'audit pre-refactor (§1-3), il piano delle fette
> (§8) e le questioni poi risolte (§9) sono in
> `docs/archivio/design-refactor-2026-07-audit-e-piano.md`.

Studio completo pre-implementazione richiesto da Mattia: audit UX pagina-per-pagina,
sistema di coerenza, concept della **status bar agenti**, direzione visiva e piano
Fase 2. Registro: **product** (PRODUCT.md). Metodo: 2 agenti di inventario sul codice
(area clienti + area fabbrica, ogni claim con file:riga), ricognizione browser di
tutte le 12 pagine in entrambi i temi (dati reali, 3 clienti di test), scan
deterministico anti-pattern (`detect.mjs`: **0 finding**), rubriche impeccable
(euristiche Nielsen, cognitive load, personas) e database ui-ux-pro-max.

**Decisioni già prese da Mattia (2026-07-11, vincolanti):**
1. Librerie: sì con misura — `motion` (animazioni status bar) + `lucide-react` (icone). Niente component library.
2. Eliminazione clienti: **diretta** (cancella `out/<slug>/`), con conferma forte (digitare il nome).
3. Progresso run: **fasi reali + tempo trascorso** — mai percentuali inventate.
4. Riferimento visivo: **screenshot "Shopeers" forniti da Mattia (2026-07-11)** — dashboard SaaS chiara: sidebar bianca, card morbide, blu primario, KPI card, search globale. Direzione estratta in §7. «Prendi ispirazione e copia per la UI e UX del tool.»

---

## 4. Sistema di coerenza (vale per TUTTE le pagine)

**Vocabolario unificato** (una parola per concetto, ovunque):
- Rigenerazione totale: **«⟳ Rigenera con l'AI»** (ghost in header) + ConfirmDialog sempre.
- Update conservativo: **«Aggiorna con l'AI»** (primaria nel banner staleness, dove esiste il mode update).
- Ack staleness/drift: **«Va bene così»** (ghost) — sostituisce "Ho sistemato a mano".
- Salvataggio: **«Salva»** (secondaria) — sostituisce "Salva bozza"; Intake resta l'unica combinata «Salva e segna verificato».
- Critico: **«Ricontrolla col critico»** sempre secondaria.
- Badge: **un solo componente** `Badge`/`StatoBadge` in ui.tsx che copre step clienti, run fabbrica, fasi, opt-out (oggi 3 copie inline). Etichette sempre Capitalizzate.
- Breadcrumb: **un solo componente** (oggi BackBar negli editor + 3 copie inline nei runner/hub). Nav header con **stato attivo** (oggi Clienti/Fabbrica sono sempre muted).

**Regole di flusso:**
- Post-conferma: **sempre → hub**, con l'hub che evidenzia il prossimo passo (vedi §5.2). Mai "resta in pagina" silenzioso.
- ConfirmDialog obbligatorio per: rigenerazioni totali, eliminazioni, **Pubblica/Ripubblica** (oggi manca), «Rigenera da zero» del contesto (oggi manca), stop di un run.
- Staleness: il banner elenca **cosa** è cambiato (file + per il contesto i campi in drift), non solo "è cambiato qualcosa".
- Guardia unsaved anche su Build (campo dominio).
- Container: **una larghezza per pagina** — form 3xl (intake/copy), pagine ricche 5xl — con action bar SEMPRE allineata al container del contenuto (oggi copy ha contenuto 3xl e barra 5xl).

**Tastiera (poche, quotidiane):** `⌘S`/`Ctrl+S` = Salva nella scheda; `/` = focus
ricerca in lista; `Esc` = chiudi dialog/pannello status bar; `⏎` = conferma nel
dialog. Niente sistemi di shortcut elaborati (YAGNI).

**Fondamenta tecniche nuove:** `lucide-react` per le icone (oggi zero icone: refresh,
cerca, elimina, apri-esterno, stop, chevron…); `motion` SOLO per status bar e
micro-transizioni di stato (150–250ms, ease-out, `prefers-reduced-motion` →
crossfade); scala z-index semantica (`--z-sticky/-bar/-dialog/-toast`); token
spaziatura densità 8/10 (già di fatto così); Button/Banner/EmptyState/Skeleton come
componenti (oggi stringhe di classi + copie).

**Shell applicativa (nuova — dagli screenshot di riferimento, supera il «niente
sidebar» del brief 2026-07-06, deciso quando le pagine erano 4; oggi sono 12):**
- **Sidebar bianca fissa** (~240px): wordmark in alto; voci con icona+label —
  Clienti, Fabbrica (gruppo espandibile: Run, Riferimenti), divisore, Impostazioni
  (le Chiavi API escono dal pannello a fondo home e diventano pagina propria),
  Aiuto se mai servirà (YAGNI per ora). Voce attiva = pill con tinta primaria +
  testo primario + barretta sinistra 3px (pattern del riferimento). Badge conteggio
  a destra della voce (es. run attivi in Fabbrica).
- **Slot inferiore della sidebar** (dove il riferimento ha la card premium): card
  **«Agenti al lavoro»** — compare quando c'è ≥1 run: sfera dell'agente + fase +
  tempo; click = apre il pannello della status bar. Vuota = non renderizzata.
- **Topbar**: ricerca globale clienti stile riferimento (pill con icona + kbd ⌘K,
  apre/filtra la lista da qualunque pagina), toggle tema, avatar/menu NO (YAGNI:
  un operatore). Il breadcrumb resta nel contenuto sotto la topbar.
- Su viewport strette la sidebar collassa a icone (64px) — niente drawer mobile
  (tool desktop).

## 5. Studio pagina per pagina (esistente → manca → proposta)

### 5.1 `/` Lista clienti → **Dashboard clienti**
- **C'è**: ricerca live (nome/referente/telefono), refresh Tally con dedup, import con overwrite-dialog, pannello chiavi, empty state.
- **Manca**: visibilità pipeline (solo Intake+Contesto), filtri/sort, azioni per riga, slug/data (duplicati indistinguibili: il test client mostra lo stesso nome di cavaliere), contatori, elimina.
- **Proposta**:
  - Riga cliente = nome + città·referente + **mini-pipeline a 6 tacche** (una per step, colore = stato, ⚠ se stale, ● online cliccabile) + data aggiornamento + slug mono quando il nome è duplicato.
  - Testata con **4 KPI card in stile riferimento** (Clienti · Da lavorare · Da
    verificare · Online): numero grande tabulare, icona piccola, sotto-riga con
    delta reale dove esiste (es. «+2 questa settimana» dai timestamp di import) —
    e **cliccabili: la card È il filtro** della lista (stato attivo = bordo/tinta
    primaria). Niente metriche di vanità: solo numeri su cui si agisce. Accanto:
    select ordinamento (Aggiornati di recente / Nome / Importati).
  - **Menu azioni per riga** (…): Apri, Apri sito online, Copia link sito, **Elimina…** → dialog forte: «Digita CAVALIERE BUILD SRLS per eliminare la cartella out/cavaliere-build-srls. La submission Tally resta e potrà essere reimportata.» (decisione Mattia: eliminazione diretta). Server: `DELETE /api/clients/[slug]` con `rm -rf` di `out/<slug>` (+ revalidate).
  - `/` focalizza la ricerca; sezione Tally invariata.

### 5.2 `/clienti/[slug]` Hub → **Cabina del cliente**
- **C'è**: sequenza 6 step numerata con badge, staleness, gating con tooltip, breadcrumb.
- **Manca**: prossimo passo evidente, meta per step (quando, durata), messaggio d'errore inline, azioni cliente, contatti/link utili.
- **Proposta**:
  - **Il prossimo step ha l'unica azione primaria** della pagina (regola PRODUCT.md «un gate per schermata» applicata alla sequenza); gli altri restano secondari. Fraseologia staleness unificata («⚠ contesto cambiato» ovunque).
  - Ogni riga step: badge + **meta mono a destra** (verificato il 07/07 · ultima run 12 min) da `steps.<k>.ultimaRun` (già registrato, mai mostrato); se `errore`, la riga mostra il messaggio (oggi solo nella scheda).
  - Testata cliente: telefono/email dal brief (copia rapida), link sito online quando esiste, e menu (…) con Reimporta da Tally, Elimina cliente (stesso dialog della lista).
  - Se un run è attivo sul cliente: la riga step mostra la **fase corrente live** (alimentata dalla stessa fonte della status bar).

### 5.3 Contesto
- **C'è**: runner con gate, editor completo (servizi/macro/punti di forza/promesse/martello), drift per campo con riallineo update-mode, 422 con scroll al problema.
- **Manca**: rigenera persistente (senza drift l'AI è irraggiungibile), ConfirmDialog su «Rigenera da zero», riordino servizi.
- **Proposta**: header «⟳ Rigenera con l'AI» + dialog come palette/copy; «Ho sistemato a mano» → «Va bene così»; «Salva bozza» → «Salva». Riordino: NO (YAGNI — l'ordine non ha semantica a valle).

### 5.4 Palette
- **C'è**: la scheda più matura — preview protagonista coi font veri, WCAG live + «scurisci finché passa», staleness+ack, assegnazione design con override.
- **Manca**: coerenza tra le due vie di cambio preset (select editor = subito; override pannello = prossima generazione) — confusione documentata; il PUT non verifica `preset == design.preset`.
- **Proposta**: unificare la semantica: il select preset dell'editor mostra una nota quando diverge dall'assegnazione («diverso dall'assegnazione: Meridian — registro come override») e il salvataggio registra l'override in design.json (una fonte di verità). Il resto non si tocca.

### 5.5 Copy
- **C'è**: form narrativo in ordine di pagina con contatori live, anteprima accent col colore vero, critico con anchor ai campi, copertura servizi, staleness a 3 azioni.
- **Manca**: navigazione interna (9135px di pagina, 10 gruppi: si scrolla al buio); action bar disallineata (3xl vs 5xl).
- **Proposta**: **rail indice sticky** a sinistra (1·Hero … 10·Footer) con pallino di stato per gruppo (err/warn/ok dai contatori e dai finding del critico) e scroll-to; su schermi stretti si comprime a select. Allineare la barra al container. Il pannello critico resta in testa (è la coda di lavoro).

### 5.6 Immagini & Build
- **C'è**: immagini — griglia con esito critico inline, rigenerazione selettiva, alt con contatori, KeySetup inline; build — 3 momenti numerati, primaria contestuale, esito mono, dominio custom, KeySetup CF.
- **Manca**: immagini — update-mode assente (solo rigenera), conferma resta in pagina (incoerente); build — guardia unsaved sul dominio, conferma su Pubblica, cronologia.
- **Proposta**: post-conferma → hub anche qui; ConfirmDialog su Pubblica/Ripubblica («Il sito online verrà sostituito»); guardia sul dominio. Cronologia build: NO (YAGNI — c'è una sola dist per cliente). Upload immagine propria: rinviato alla scheda gallery/foto reali già pianificata.

### 5.7 `/fabbrica` Dashboard
- **C'è**: libreria 7 preset (card con swatch/font/aaker), lista run, nuova run con gate ≥3 riferimenti.
- **Manca**: filtri/ricerca run, eliminare/archiviare run, empty state libreria, polling (una run in corso non si aggiorna), card preset inerti.
- **Proposta**: run row con **timeline 5 tacche compatta** + metriche (`durataMin`, `roundCritico` — già su disco) + menu (…) Elimina run (con conferma; cancella la cartella run) / filtro per stato con contatori-filtro come i clienti. Run `in_corso` viva via status bar (stessa fonte). Card preset → click apre l'anteprima `/anteprima/{preset}/` del renderer (già esiste!) in nuova tab.

### 5.8 Run di fabbrica
- **C'è**: riferimenti con badge, timeline 5 fasi persistita, esegui/riprendi, refresh live a ogni fase.
- **Manca**: shot invisibili, motivo del fallimento non ripescato, log effimero, metriche nascoste, stop, zombie senza avviso.
- **Proposta**: sotto le fasi, **griglia dei 7 shot** appena esistono (route già pronta); pannello «Ultima esecuzione» con esito/durata/round e — su fallita — il motivo persistito; log storico dall'event-log (§6.1); bottone Stop durante l'esecuzione; run interrotta rilevata via heartbeat → badge «Interrotta» + «Riprendi».

### 5.9 Riferimenti & Audit
- **C'è**: riferimenti — form con attestazione TDM e verifica streaming, registro con badge; audit — confronto pairwise doppio-cieco, corsia del designer, form meta, pubblicazione.
- **Manca**: riferimenti — thumbnail (lo screenshot esiste su disco!), edit meta, elimina, filtri; audit — tokenDiff nascosto, campi meta mancanti (serif/photography/flux), «Scarta candidato» senza conferma, img senza fallback/aspect-ratio.
- **Proposta**: registro con thumbnail 1280 + menu (…) Elimina/Modifica meta (id resta hash URL: l'URL non si edita, si elimina e ricrea); filtro Usabili/Bloccati. Audit: mostrare `tokenDiff vs contro` accanto alla corsia, aggiungere i 4 campi meta mancanti al form, ConfirmDialog su Scarta, aspect-ratio + fallback sugli shot.

## 6. Status bar agenti (il pezzo nuovo — concept completo)

**Obiettivo (Mattia):** da qualunque pagina, capire a colpo d'occhio *chi* sta
lavorando (quale agente), *per chi* (cliente/run), *a che punto è* (fase reale +
tempo), *con quale skill* — con qualità Apple, sferette per agente, entrambi i temi.
Progresso onesto: **fasi + tempo**, mai % inventate (decisione Mattia).

### 6.1 Prerequisito architetturale: run che sopravvivono (senza questo la barra mente)

Oggi: POST `/run/[step]` esegue `claude -p` legato allo stream; abbandono = kill
(`run-step.ts:94-96,160`). Cambiamento minimo:

1. **Tee su disco**: ogni evento NDJSON del run viene anche appeso a
   `out/<slug>/steps/<step>/run.ndjson` (fabbrica: `runs/<id>/run.ndjson`), con
   heartbeat (`{type:"hb", t}` ogni ~5s) e `startedAt/pid` in `client.json`
   (`steps.<k>.inFlight` già esiste).
2. **Sgancio dal ciclo di vita HTTP**: il child NON viene ucciso alla chiusura dello
   stream (si rimuove il kill su `req.signal`); lo stream resta come prima per la
   scheda aperta.
3. **Ri-attacco**: `GET /api/runs/active` (scansione stati `in_corso` clienti +
   fabbrica, con fase corrente e startedAt) e `GET …/run/events?since=<byte>` (tail
   del file). Polling 2s — niente websocket (YAGNI: locale, un operatore).
4. **Stop esplicito**: `DELETE /run/[step]` → SIGTERM al child (pid registrato),
   stato → `errore` con messaggio «Interrotto manualmente» — al posto del kill
   implicito di oggi. ConfirmDialog.
5. **Zombie**: `in_corso` con heartbeat più vecchio di ~20s → mostrato come
   **«Interrotta»** con azione Riprendi/Riprova (oggi resta «In corso…» per sempre).

Le schede continuano a funzionare come oggi (RunLog live); semplicemente leggono la
stessa fonte. Nessun cambiamento alle skill o a `claude -p`.

### 6.2 Anatomia (collassata, ~48px, fissa in basso, tutte le pagine)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ (( ● )) copywriter — CAVALIERE BUILD · Copy   [■■□□] critico (round 2)     │
│                                                fase 2/4 · 04:12 · ~10–30m  │
│                                            [Apri scheda] [⏹] [⌃ espandi]  │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Sfera agente** a sinistra (vedi 6.4) + nome agente (= skill in esecuzione, dagli
  eventi `phase`: context-enricher, palette-designer, copywriter, copy-critic,
  image-prompter, image-critic, preset-designer, critico visivo…) + cliente/run e
  scheda.
- **Barra a segmenti = fasi reali** dello step (copy: copywriter → gate formato →
  critico → correzioni; immagini: sonda BFL → prompter → critico → rigenera scarti;
  fabbrica: designer → validatore → build → gate → critico). Segmento pieno = fase
  conclusa; segmento attivo = shimmer sottile (indeterminato, onesto); i round del
  critico aggiungono segmenti dinamicamente («round 2/3»). Sotto: `fase 2/4 · 04:12`
  (tempo trascorso, mono tabulare) e, quando `ultimaRun` ha storia, «di solito
  ~N min» etichettato come tipico — mai una %.
- **Azioni**: Apri scheda (link alla pagina del run), Stop (⏹, con conferma),
  espandi (⌃).
- **Run multipli**: le sfere si affiancano a sinistra (max 3 + «+n»); la sfera
  attiva/cliccata decide cosa mostra il resto della barra. Run deterministici
  (build, deploy, gate) NON hanno sfera: hanno un **chip quadrato** neutro con
  icona — la sfera è riservata agli agenti AI (distinzione onesta uomo/macchina…
  anzi: AI/script).
- **Fine run**: il segmento finale diventa ok-verde, la sfera fa il morph in ✓,
  la barra resta 60s poi scompare (o subito con ✕); errore = barra in tinta err
  con messaggio e [Riprova] [Apri scheda], resta finché non gestita.
- La barra appare solo quando c'è ≥1 run attivo o esito recente non gestito; le
  action bar delle schede scalano sopra di lei (z-scale, `pb` dinamico sul main).

### 6.3 Pannello espanso (~360px, spring morbida da bordo inferiore)

- Lista run attivi (riga per run: sfera, agente, cliente, fase, tempo) — click
  seleziona.
- Per il run selezionato: **timeline verticale delle fasi** con durata per fase
  (dagli eventi `phase` + timestamp: «copywriter 6:21 ✓ · gate 0:03 ✓ · critico
  round 1 2:44 …») e il **log live** (RunLog attuale, riusato e ristilizzato) che
  tail-a `run.ndjson`.
- Footer: Apri scheda · Stop. `Esc` chiude.

### 6.4 Le sfere (design)

- **Costruzione**: cerchio 24px (28px nel pannello) con gradiente radiale a 2 fermate
  del colore-agente (chiaro→profondo, offset alto-sinistra per la luce), highlight
  speculare `radial-gradient` bianco 35% in alto a sinistra, anello esterno 1px
  del colore al 30%. Niente immagini: solo CSS. Su tema chiaro la sfera scurisce
  la fermata profonda (+contrasto col bianco), su scuro si accende (+luminanza) —
  stessi hue, due taglienti, AA sul testo adiacente sempre garantito dai token.
- **Colori-agente (token `--agent-*`, oklch, entrambe le declinazioni tema)**:
  famiglia per ruolo — generatori con hue proprio, critici accomunati dall'ambra:
  - `context-enricher` teal 172 (famiglia brand — è "il" contesto)
  - `palette-designer` violetto ~300 · `preset-designer` indaco ~265
  - `copywriter` blu ~250 · `image-prompter` magenta ~340 · `logo-designer` corallo ~30
  - **critici** (copy-critic, image-critic, critico visivo) ambra ~75 — la stessa
    semantica visiva di «da verificare»: il critico è il dubbio istituzionalizzato
  - script deterministici: chip acciaio (nessuna sfera)
  I valori esatti si fissano in implementazione con check AA su entrambi i temi.
- **Motion (libreria `motion`, decisione Mattia)**: idle = respiro (scale
  1→1.035, 2.6s, ease-in-out); evento `tool` = micro-pulse dell'anello (150ms);
  cambio fase = mezzo giro del gradiente interno (spring, stiffness bassa);
  completamento = morph in ✓ con spring; errore = sfera ferma, anello err.
  `prefers-reduced-motion`: tutto statico, stato affidato a colore+icona+testo
  (mai solo colore). Budget: solo transform/opacity, mai layout.

### 6.5 Dati (tutto già esistente o §6.1)

| Elemento UI | Fonte |
|---|---|
| Agente/skill corrente | evento `phase` (emesso da `StepDef.run` in `lib/steps.ts` e dalle fasi di `lib/factory/fasi.ts`) |
| Sequenza segmenti | fasi note per step + append dinamico sui round |
| Cliente/scheda | slug+step del run attivo (`client.json steps.<k>`) |
| Tempo trascorso | `startedAt` (§6.1) |
| «di solito ~N min» | `steps.<k>.ultimaRun.durataMs` (già registrato, mai mostrato) |
| Esito/errore | evento `done`/`error` + stato persistito |

## 7. Direzione visiva — estratta dagli screenshot di riferimento (Shopeers, 2026-07-11)

Riferimento: dashboard SaaS **chiara, ariosa, morbida** — l'opposto tonale della
«sala di controllo» attuale, con però la stessa disciplina (un accento, semantici
sobri, mono per i dati tecnici che TENIAMO). Grammatica estratta e mappatura:

**Superfici e profondità**
- Pagina grigio-freddo chiarissimo (`oklch ~0.965 0.004 250`), **card bianche pure**
  con **ombra soffusa diffusa** (`0 1px 2px` + `0 8px 24px` a bassissima opacità)
  al posto dei bordi hairline come separatore primario; bordo quasi invisibile di
  rinforzo. Oggi: bordi-only, zero ombre → nuovo token `--elev-card/-raise/-overlay`.
- Raggio: card **14–16px**, controlli 10px, bottoni e chip **pill** (oggi 6–8px).
- **Tema scuro derivato** (il riferimento è light-only): grafite tinta blu
  (`~0.14 0.01 250`) invece del nero puro, card `~0.18`, ombre sostituite da fill
  elevato + bordo — stessa gerarchia, letta al buio. Resta «sala di controllo»,
  ma accordata al nuovo hue.

**Colore**
- **Primario blu royal** (`~oklch 0.55 0.19 262`, dark: `~0.72 0.15 262`) per
  azioni primarie, voce nav attiva, selezione, focus, link — sostituisce il teal
  (il teal resta ai SITI generati: l'editor si distingue dal prodotto che produce).
- Delta e stati: verde/rosso in **chip a tinta morbida** (pill bg 12-15% + testo
  pieno, come i badge attuali ma pill); triade dati blu/verde/arancio per
  ripartizioni (già così nei clienti del riferimento: Retailers/Distributors/
  Wholesalers → nostre ripartizioni step/stati).
- Semantici ok/warn/err: invariati nella logica, ritarati sul nuovo neutro.

**Tipografia**
- **Inter** via `next/font` (self-hosted, niente request esterne) al posto di
  system-ui: è il carattere del riferimento e rende identici i due temi su ogni
  macchina. Scala invariata (15px base, rem 1.125) — il riferimento è più arioso
  ma PRODUCT.md impone densità da strumento: compromesso = padding card +4px,
  form compatti come oggi. Numeri grandi delle KPI card: 28px bold tabulare.
  Mono invariato per ID/slug/log/contatori.

**Componenti chiave del riferimento → nostri**
| Riferimento | Nostro uso |
|---|---|
| KPI stat card con delta chip | §5.1 card-filtro della dashboard clienti |
| Sidebar bianca + voce attiva a pill | Shell §4 |
| Search topbar con ⌘K | Ricerca clienti globale |
| Tabella prodotti (ID mono, hover, valori colorati) | Lista clienti/run — stessa anatomia |
| Bar chart giorno-attivo (una barra evidenziata) | Timeline fasi run fabbrica (5 tacche) |
| Gauge radiale «on track» | NO (YAGNI: nessuna metrica a target) |
| Widget «Add widget» drag&drop | NO (YAGNI: un operatore, layout fisso) |
| **Card AI Assistant con sfera blu lucida** | **Conferma 1:1 l'estetica delle sfere agente (§6.4)**: gradiente radiale, highlight speculare, ombra colorata soffusa |
| Card premium in fondo sidebar | Card «Agenti al lavoro» (§4 Shell) |
| Bottone Export pill blu con icona | Anatomia del nuovo `btnPrimary` |

**Cosa NON si copia** (bans di registro product): gauge decorativi, upsell,
notifiche a campanella (la status bar è il nostro canale), avatar/multiutente,
gradient text. Il numero-eroe gigante si usa SOLO nelle 4 KPI card della home.

Le sonde visive generate (probe immagini) restano saltate: il harness non ha
generazione immagini nativa; il riferimento fornito da Mattia svolge quel ruolo.

Decisioni prese a valle dello studio e ancora valide: niente notifiche di sistema
macOS a fine run (la status bar è il canale); il teal resta ai siti generati.
