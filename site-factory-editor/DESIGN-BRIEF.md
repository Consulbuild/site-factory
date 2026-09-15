> Il manuale operativo della UI è **`DESIGN-SYSTEM.md`** (leggerlo PRIMA di toccare
> l'editor); lo studio che l'ha prodotto è `DESIGN-REFACTOR-2026-07.md`. Qui restano
> gli shape /impeccable delle singole schede, citati dai componenti che le realizzano.
> Lo shape delle prime 4 schermate (2026-07-06, tema scuro/teal, poi superato) è in
> `docs/archivio/design-brief-editor-parte1-2026-07.md`.

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
dati tecnici, blu royal per azione/selezione). Le immagini sono le protagoniste: chrome
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
   sito. In fondo il pannello «I nostri lavori» (foto reali del cliente → sezione
   Gallery), vedi shape sotto.
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

## Pannello «I nostri lavori» (shape /impeccable — 2026-07-14)

Terza sezione dell'editor, dopo Hero e Card servizi. Foto REALI del cliente →
sezione Gallery del sito (NON generate dall'AI). Regola di prodotto resa visibile:
**0 foto = sezione assente · 1–3 = non basta · ≥4 = compare** (soglia dell'assembler).

1. **Badge soglia live** accanto al titolo: `idle` a 0 («non comparirà»), `warn`
   a 1–3 («ne mancano N»), `ok` a ≥4 («comparirà sul sito»). È il contatore che
   insegna la regola, non un errore.
2. **Empty state** = dropzone tratteggiata (drag&drop + [Scegli file]) che elenca
   i formati (JPG/PNG/WebP/HEIC iPhone, ≤12, ≤15 MB) e ripete la regola dei 4.
3. **Tile foto** (griglia auto-fit, 4/3 come la Gallery): foto + `[↑][↓]` riordino
   (il primo tile = «Foto principale», quello grande del masonry) + [✕] rimuovi;
   sotto, **Didascalia** (≤28) e **Alt** (≤140) editabili con contatore live.
4. **Testi via AI**: [Genera testi con l'AI] (side-run `lavori`) fa GUARDARE ogni
   foto a `claude -p` e propone didascalia+alt in italiano, poi si rivedono. Non
   tocca lo stato verificato di hero/card, non chiama BFL.
5. **Persistenza**: upload immediato (server: sips → jpg, incl. HEIC); ordine/testi/
   rimozioni bufferizzati nel dirty condiviso e salvati da [Salva] (PUT `/lavori`).
   [Conferma immagini] si blocca se, con ≥4 foto, un alt manca o un testo sfora.

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

---

# Modalità demo: card «Catena», home, riga Logo (shape /impeccable — 2026-09-08)

Modo: **Operate**. Chi arriva: Mattia, 7 lead in due giorni, deve capire in un
colpo d'occhio *dove sta ogni demo* e fare l'unica cosa che tocca a lui: la
verifica finale e la pubblicazione. Successo = zero domande in chat, zero
click superflui, nessuno stato ambiguo. Decisioni confermate da Mattia:
**la catena è l'unica primaria dell'hub in percorso demo**; in home la
richiesta nuova ha **«Avvia demo» (importa + lancia) + «Importa soltanto»**.

## Card «Catena» (hub, sopra la lista degli step; solo se percorso demo, o se esiste una catena/demo)

Una `card` a tre righe: titolo («Demo» / «Completamento») + `Badge` di stato ·
una frase di fatto (mai un progress %) · riga azioni. Stati e primaria:

| Stato | Frase | Primaria | Altre |
|---|---|---|---|
| nessuna catena, demo | «Contesto → palette → logo → copy → immagini → build, senza fermarsi. Di solito 60–90 min.» | **Avvia demo** | — |
| in_coda | «In coda · posizione N» | — | Togli dalla coda (ghost) |
| in_corso | «Passo: Copy · copywriter · 12:31» (fase live dal bus, tempo mono) | — | Ferma (danger ghost) |
| attesa_limite | «Limite di utilizzo del piano raggiunto · riprova alle 15:40» | — | Ferma |
| ferma | «Ferma a Copy: critico del copy FAIL (2 bloccanti)» in `err` | **Riprendi** | Apri Copy → (secondaria) |
| in_corso senza processo (riavvio) | «Interrotta dal riavvio dell'editor» | **Riprendi** | — |
| demo_pronta | «Demo costruita: guardala come la vedrebbe il titolare, poi pubblica.» | **Pubblica demo** (ConfirmDialog: host, «il certificato può richiedere qualche minuto») | Apri anteprima ↗ |
| demo online | host cliccabile · «scade il gg/mm (tra N gg)» (warn ≤ 3) · «pubblicata il gg/mm» | **Ripubblica demo** solo se c'è una build più nuova, altrimenti nessuna | Copia link · Invia su WhatsApp · Proroga +15 gg (ghost) · Il cliente si è abbonato (secondaria, dialog) · Spegni demo (danger, dialog) |
| demo spenta | «Demo spenta il gg/mm» | Riaccendi demo | Il cliente si è abbonato |
| completo, ferma a deploy | «Manca il dominio: inseriscilo nella scheda Build e riprendi» | **Riprendi** (se dominio presente) | Apri Build → |
| completata | «Sito online · url» | — | — |

Percorso completo senza catena (clienti storici): card compatta con
«Esegui in automatico gli step mancanti» **secondaria**; la primaria resta il
prossimo passo di oggi. Durante la catena la card si aggiorna da sola (refresh
10 s) e le righe degli step mostrano stato + fase live, tutte con «Apri» grigio.

## Home

- Riga cliente: colonna sito → `host.demo.consulbuild.com ↗ · scade tra N gg`
  (warn ≤ 3) / «demo spenta il gg/mm» / «catena: Copy» / «senza sito». Colonna
  stato → `Demo online` (idle) / `Demo da controllare` (warn) / `Catena in corso`
  (brand) / `Catena ferma` (err) / `In lavorazione`. Menu riga: «Avvia demo» /
  «Riprendi» quando il percorso è demo e la catena non è viva.
- `MiniPipeline` a 8 tacche (+Logo, stessa forma/colore).
- Richieste dal form: **Avvia demo** (primaria: importa, lancia, va all'hub) +
  **Importa soltanto** (ghost).

## Riga «Logo» nell'hub (4ª, tra Palette e Copy)

Cliente con logo → badge idle «fornito dal cliente», nessun bottone. Altrimenti
stato come gli altri step; con un kit presente: miniatura del mark (28 px) +
«Varianti» che apre inline una griglia 6×(mark + motivo dello scarto/scelta)
con «Usa questa» per variante (ricoloro offline deterministico → logo
`da_verificare` → build «cambiato a monte»). Niente scheda dedicata.

## Anti-obiettivi

Nessuna percentuale, nessun banner flottante, nessuna card annidata, nessun
timer che riannuncia (tempo `aria-hidden`), nessuna azione distruttiva senza
`ConfirmDialog`, nessun bottone blu oltre l'unico della catena.

---

# Area Traffico: portafoglio, dettaglio, riga nell'hub (shape /impeccable — 2026-09-14)

Modo: **Operate**. Piano: `docs/traffico/piano-T0.md` (§2 lo studio completo,
§Calibrazione i testi). Chi arriva: Mattia, dalla sidebar per sapere per quali
clienti lavora sul traffico, o dall'hub quando un cliente compra o disdice un
servizio. Verità specifica: **due servizi separati** (Sito, Scheda Google), rari
da cambiare, una decisione commerciale e non il prossimo passo di una pipeline.
Successo = zero ambiguità tra spento e sospeso, nessuna attivazione accidentale,
mai «Spento» su un file che non si sa leggere, nessuna promessa di risultati.

## Layout

```
PORTAFOGLIO /traffico  (sola lettura, niente JS client)
  Traffico
  intro: i due servizi, si attivano dal dettaglio · «Nessun servizio acceso per ora.»
  Stato non leggibile · 1        riga → nome · «client.json fuori schema»   [Non leggibile] ×2
  Con un servizio acceso · 1     riga → nome · città · dominio   Sito [Attivo] dal 14/09 · Scheda Google [Spento]  ›
  Spenti · 1
  In demo · 1 — si attivano dopo «Il cliente si è abbonato»

DETTAGLIO /traffico/[slug]
  Traffico / Azienda                                             [Apri il cliente →]
  Azienda · città · percorso · dominio ↗ | senza dominio
  (demo) frase del blocco  ·  (file illeggibile) Banner err
  ┌ card ── Zone servite [badge] ─────────── [Conferma le zone] [Modifica | Imposta le zone]
  │ descrizione · frase di stato (role=status) · (lead cambiato / file illeggibile) Banner
  │ Tutta la regione Veneto   [Da controllare]                              560 comuni
  │ regione Veneto · dal form lead  ·  Nota: …            (righe a blocco sotto sm)
  │ Area servita: 560 comuni · 4.853.472 residenti
  │ (Modifica) righe con «Togli» · campo «Aggiungi una zona» + aiuto · [Salva e conferma] Annulla · motivo
  ┌ card ── Sito [badge] ─────────────────────── [Attiva… | Sospendi… | Riattiva…]
  │ descrizione · riga date (role=status) · (senza dominio) Banner warn
  │ Cosa comparirà qui            │ Cosa servirà
  └ card ── Scheda Google: stessa anatomia

HUB /clienti/[slug]  (dopo la lista degli step)
  ┌ card ── Traffico   Sito [badge]   Scheda Google [badge]          [Apri Traffico →]
```

## Decisioni UX

1. **Portafoglio in sola lettura raggruppato per stato** (non leggibile → accesi →
   spenti → demo, nomi A–Z): nessuno switch in lista, l'errore di mira costerebbe
   troppo. Riga = un solo `Link` a blocco, etichetta inline prima di ogni badge
   (regge a 400 px senza intestazioni di colonna).
2. **Dettaglio a due sezioni impilate**, niente tab: lo stato di entrambi i servizi
   è sempre visibile e le sezioni a tutta larghezza reggono i pannelli futuri.
3. **Bottoni con conferma, non interruttori** (approvato): `btnSecondary` con i
   puntini, la primaria sta solo nel `ConfirmDialog`. **Nessuna primaria in T0**:
   il blu inviterebbe al clic. Quando un piano porterà un prossimo passo del
   servizio (es. l'invio del mini-form), diventerà lui la primaria della sezione.
4. **Dopo il cambio si resta nel dettaglio** (`router.refresh()`, focus di nuovo sul
   bottone): il nuovo stato è l'esito visibile. Scostamento consapevole da
   «Post-conferma → hub», che riguarda gli step della pipeline.
5. **Date**: «Attivo dal …», «Sospeso dal …», con la prima attivazione (non cambia
   mai) e l'ultima sospensione o riattivazione quando diverse.
6. **Motivo del blocco scritto una volta, in testa** (demo: la stessa frase della
   route 409; file illeggibile: il banner), richiamato dai bottoni disabilitati con
   `aria-describedby`. Con client.json illeggibile nessuna riga date, nessun
   percorso né dominio (sarebbero sintetizzati) e badge «Non leggibile».
7. **Sito senza dominio**: attivazione ammessa, con `Banner warn` nella sezione e
   un paragrafo a parte nella conferma («fondamenta tecniche e sensori partiranno
   solo da quel momento»).
8. **Errori nel dialog** (`role="alert"`): un 4xx (stato cambiato altrove, demo,
   file illeggibile) disabilita la conferma e «Chiudi» rilegge la pagina; un errore
   di rete o di disco offre «Riprova».
9. **Stati vuoti onesti**: «Cosa comparirà qui» (chiude con «Per ora nessuna di
   queste parti è disponibile») e «Cosa servirà», elenchi semplici senza spunte
   finte; mai posizioni, clienti in più o tempi.
10. **Badge**: `ServizioBadge` in `components/traffico-ui.tsx` (Spento idle, Attivo
    ok, Sospeso warn: online resta ma nessuno lo cura, Non leggibile err); la parola
    sempre oltre al colore. Icona sidebar `Signpost` («farsi trovare», senza
    promettere crescita).

### Card «Zone servite» (piano T3, 2026-09-15)

Piano `docs/traffico/piano-T3.md` §4 con i tagli della decisione T3 punto 14
(`docs/traffico/decisioni-piani.md`). Componente `components/zone-servite.tsx`,
vista calcolata sul server da `lib/zone-servite.ts` (`vistaZone`).

11. **Sopra Sito e Scheda, sempre visibile** (anche a servizi spenti, in demo e con
    client.json illeggibile: le zone vivono in `traffico/zone-servite.json` o nel
    lead), mai scritta all'apertura.
12. **Nessuna conferma obbligatoria**: una proposta tradotta per intero e senza note
    ha badge ok «Dal form lead», «Modifica» secondaria e **nessuna primaria**. La
    primaria compare solo quando l'operatore serve: «Modifica» con zone da
    controllare («Conferma le zone» secondaria, solo senza zone non riconosciute),
    «Imposta le zone» senza zone (brief Tally, lead senza zone riconosciute, lead
    illeggibile), «Usa / Rivedi le zone del nuovo lead» nel banner del lead cambiato
    (con «Va bene così» ghost, come la staleness). È l'unica primaria della pagina.
13. **Una riga per etichetta** (non per area): il testo del cliente verbatim, sotto
    la traduzione e la provenienza («dal form lead», «aggiunta a mano»), a destra
    l'ampiezza in comuni (mono). Esito come parola in un `Badge` («Da controllare»
    anche per una traduzione certa con nota, «Non riconosciuta»); le zone salvate
    tengono la nota ma non il badge, sono già state controllate. In fondo «Area
    servita: N comuni · M residenti»: quanto è larga l'area, senza promettere nulla.
14. **Modifica inline**, niente modal: «Togli» ghost con `aria-label`, campo
    «Aggiungi una zona» → anteprima dal server → riga o errore `role="alert"` sotto
    il campo (omonimi coi candidati, provincia soppressa con le nuove, «forse …»);
    aiuto fisso con le forme del form. «Salva e conferma» disabilitata col motivo
    scritto accanto (zone non riconosciute, nessuna zona, testo non aggiunto nel
    campo). `useUnsavedGuard`, `⌘S`, focus sul titolo della card dopo il salvataggio;
    la modifica si chiude insieme alla pagina riletta (`useTransition`), mai un attimo
    con le zone vecchie.
15. **Lead cambiato dopo un salvataggio**: `Banner warn` con le etichette nuove; «Usa
    le zone del nuovo lead» chiede conferma solo se le zone salvate hanno correzioni
    a mano (le nomina), «Rivedi…» apre la modifica quando il lead nuovo ha zone non
    riconosciute. Un 409 (lead cambiato mentre si lavorava) offre «Rileggi».

## Anti-obiettivi

Niente KPI card o numeri-eroe (nessun dato da mostrare), niente switch, niente
tab, nessun bottone blu nel portafoglio, nell'hub o nei servizi del dettaglio (l'unico
è quello delle zone quando chiedono l'operatore), nessun motivo di blocco in un
`title`, nessuna scrittura di `client.json` o delle zone alla sola apertura delle
pagine. Zone: nessuna mappa, nessun select con 8.000 comuni, nessun modal per
modificare, nessuna promessa di risultati.
