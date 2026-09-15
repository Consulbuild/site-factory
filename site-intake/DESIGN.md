# Design — Form bozza (site-intake)

Registro del mondo visivo costruito, letto dal codice (`src/styles/*.css`,
`src/components/*`), non dalle intenzioni. Vale solo per il form
`sito.consulbuild.com`; i siti dei clienti hanno il loro standard in
`site-renderer/DESIGN.md`, l'editor in `site-factory-editor/DESIGN-SYSTEM.md`.

## Il mondo in una frase

Una card bianca che galleggia sul navy dell'hero di consulbuild.site, con un solo
accento blu che segna ciò che si tocca e ciò che avanza; alla fine la card si rovescia in
blu su un fondo chiaro. Un tema solo, dichiarato: chi compila è al sole in cantiere, il
contrasto conta più dell'atmosfera.

## Colore (`tokens.css`)

| Ruolo | Valore | Uso |
|---|---|---|
| `--bg` / `--bg-deep` | `#0f172a` / `#0a0f1a` + bagliore radiale `rgba(37,99,235,.32)` | fondo pagina |
| `--surface` / `--surface-2` / `--surface-3` | `#fff` / `#f8fafc` / `#f1f5f9` | card, riquadri di conferma, barra vuota |
| `--ink` / `--ink-2` / `--ink-3` | `#0f172a` / `#475569` / `#64748b` | testo, testo secondario, etichette (ink-3 solo su bianco) |
| `--line` / `--line-strong` | `#e2e8f0` / `#cbd5e1` | bordi delle scelte e dei campi |
| `--accent` / `--accent-hover` | `#2563eb` / `#1d4ed8` | CTA, selezioni, progresso, focus, eyebrow, rivelazione |
| `--accent-soft` / `--accent-soft-2` / `--accent-ring` | blu al 8 % / 16 % / 35 % | fondo delle scelte selezionate, selezione testo, anello di focus dei campi |
| `--ok` / `--warn` / `--err` (+ `-soft`) | `#15803d` / `#b45309` / `#b91c1c` su `#dcfce7` / `#fef3c7` / `#fee2e2` | spunte, avvisi, errori: ≥4,5:1 sul loro fondo |
| `--on-bg`, `--on-bg-2`, `--on-bg-3` | bianco, `#cbd5e1`, `#94a3b8` | testo sul navy (binario, piè di pagina) |

Regola: il blu è l'unico accento; verde, ambra e rosso sono stati, mai decorazione. Nessun
gradiente sui testi, nessun colore letterale nei componenti (solo nelle illustrazioni delle
anteprime di stile).

## Tipografia

Un solo carattere, **Atkinson Hyperlegible Next** (variabile 200-800, latin, 33 KB,
self-hosted; fallback metrico «Atkinson Fallback» su Helvetica/Arial). Scala: domanda
`clamp(26px, 4.2vw + 14px, 30px)` peso 800 tracking −0.02em, `text-wrap: balance`, max
22ch; corpo e input 18 px; aiuto 16 px; piccolo 15 px; eyebrow 13 px maiuscolo tracking
0.1em peso 700; scelte 17 px peso 600. Interlinea 1.15 titoli, 1.3 controlli, 1.5 corpo.

## Forme e profondità

Card raggio 24 px con ombra profonda a offset (`0 32px 80px` + `0 2px 10px`); campi e
scelte raggio 14-16 px con bordo 2 px; chip e bottoni a pillola; CTA con ombra blu a
offset 10 px. Target minimo 48 px (`--tap`), CTA e campi 56 px. Spazi su base 4 px
(`--s-1`…`--s-16`); padding della card `clamp(20px, 5vw, 36px)`.

## Componenti (`components.css`, `upload.css`)

- **Card** = il dispositivo: testata (marchio + «Sezione N di 7»), barra di progresso 6 px,
  `.stage` con un solo `.passo` (due durante il cambio: quello in uscita è fuori flusso,
  vedi Motion). Altezza minima stabile
  (680 px o l'altezza dello schermo) così i bottoni non saltano tra un passo e l'altro;
  due eccezioni volute: all'invio la card si accorcia con una transizione di altezza
  (350 ms) fino al pannello di attesa, e la card «Fatto», senza bottoni, è alta quanto il
  contenuto. Sotto i 430 px la griglia dei riquadri si compatta (76 px) perché il primo
  passo intero, «Continua» compreso, stia nei 680 px del browser interno di Instagram.
- **Passo**: eyebrow con lineetta = nome della sezione (orientamento, pattern GOV.UK
  «caption»; scelta deliberata contro la regola generica di impeccable sui kicker), h1 =
  la domanda, riga di aiuto, campo, avviso, azioni (Indietro ghost a sinistra, Continua a
  pillola a destra). Mai due etichette impilate: al primo passo delle sezioni 4 e 6 la riga
  verde di incoraggiamento prende il posto dell'eyebrow; su «Fatto» l'eyebrow non c'è (la
  testata dice già «Fatto»); da 1024 px, col binario in vista, l'eyebrow è nascosta.
- **Primo passo**: già nell'HTML e visibile al primo paint, senza animazione d'ingresso;
  gli scaglioni valgono solo per i passi montati dopo.
- **Scelte** in tre layout: riquadri con icona (2 colonne, 108 px min), righe (1 colonna),
  chip (pillole). Selezionata = bordo blu + fondo blu 8 % + spunta a molla in alto a
  destra (chip: fondo blu pieno). Input nativi nascosti ma accessibili.
- **Campi** con etichetta sopra (nascosta quando coincide con l'h1), prefisso/suffisso
  fissi (+39, .it), spunta verde a destra sui campi complessi, errore = bordo rosso +
  avviso sotto.
- **Avvisi**: riquadro tinta (rosso = blocco, ambra = attenzione) con icona, testo e
  bottoni-azione a pillola bianca («Va bene così, continua», «Sì, usa …»).
- **Suggerimenti**: elenco sotto il campo, voci da 48 px, evidenza blu tenue.
- **Orari** (schema della scheda Google, ridotto per il telefono): chip dei giorni
  (Lun–Ven già toccati), una riga per giorno selezionato con «Dalle / Alle» nativi da
  48 px e «+ pausa» per la seconda fascia, un solo bottone «Usa questi orari per tutti i
  giorni» sotto la prima riga completa, «Cancella» per giorno, conferma «Orari: Lun–Ven
  8:00–12:00 e 13:30–18:00» in chiaro. Orari suggeriti solo al tocco di una casella
  vuota (8:00–18:00; con la pausa 8:00–12:00 e 13:00–18:00): il selettore si apre già
  sull'ora giusta, la casella non è mai precompilata. Il telefono parte da tre scelte a righe (stessi orari /
  diversi / 24 ore) e apre lo strumento già riempito solo se serve.
- **Stile**: card con anteprima SVG 4:3 e nome. **Colori**: pallini 44 px con anello blu
  alla selezione. **Foto**: griglia 3 colonne di miniature quadrate con barra in basso,
  spunta verde, «×» da 48 px, «Riprova» rosso. **Logo**: anteprima 96 px + stato.
- **Riepilogo**: sezioni con eyebrow, righe `dt/dd` + «Modifica» a destra, bottone d'invio
  da 64 px a tutta larghezza.
- **Attesa**: pannello bianco sulla card con logo in cerchio blu, tre onde, testo, barra.
- **Fatto**: `body.is-fatto` fondo `#f8fafc`, `.card.is-fatto` blu con testo bianco,
  timeline a tre tappe con numeri bianchi.
- **Binario** (≥1024 px): le 7 sezioni a sinistra della card, voce corrente con fondo
  bianco 8 %, fatte con spunta; resta fisso allo scroll (sticky) sui passi lunghi.
- **Nome del sito**: le proposte «già prese» sono attenuate e non selezionabili, così la
  prima card viva è sempre un nome libero; lo stato «Libero» usa l'icona spunta SVG.

## Motion (`motion.css`, `motion.ts`)

Tempi: 120 / 140 / 200 / 360 / 500 / 550 ms; curve standard `cubic-bezier(.2,0,0,1)`,
decel `(.05,.7,.1,1)`, accel `(.3,0,1,1)`, expo `(.16,1,.3,1)`, molla `(.34,1.56,.64,1)`.
Un solo momento autoriale ricorrente, la **sequenza** tra i passi (scelta 2026-09-13 al
posto del sipario con bordo blu, che copriva invece di trasformare): i cinque elementi del
passo (sezione, titolo, aiuto, campo, azioni) escono in onda verso l'alto (140 ms,
scaglione 25 ms, accel) e i nuovi entrano dal basso nello stesso ordine (360 ms dopo 80 ms
di anticipo, scaglione 45 ms, expo: uscita breve e accelerata, ingresso lungo e
decelerato); tornando indietro il verso si inverte; l'altezza dello stage si interpola
(360 ms). Un solo asse, spostamenti di 16–20 px, mai occlusione. E un momento finale (la
rivelazione). Tutto su `transform`/`opacity` (più l'altezza dello stage, un elemento
solo), interrompibile, e con `prefers-reduced-motion` tutto diventa una dissolvenza da
120 ms.

## Superfici del browser

Selezione testo blu tenue, cursore blu (`caret-color`), `accent-color` blu sui controlli
nativi, scrollbar sottile grigia, focus 3 px blu con offset 3 px, sottolineature con
offset 3 px.

## Rilievi del detector impeccable accettati (2026-09-07)

`dark-glow` sull'ombra blu della CTA (ha offset e sfocatura, sta sulla card bianca);
`cramped-padding` sulla `.card` (il padding vive nei figli: testata, progresso, passo).
