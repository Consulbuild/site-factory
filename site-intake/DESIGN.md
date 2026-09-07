# Design — Form bozza (site-intake)

Registro del mondo visivo costruito, letto dal codice (`src/styles/*.css`,
`src/components/*`), non dalle intenzioni. Vale solo per il form
`bozza.consulbuild.com`; i siti dei clienti hanno il loro standard in
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
  `.stage` con un solo `.passo`, `.sipario` per le transizioni. Altezza minima stabile
  (680 px o l'altezza dello schermo) così i bottoni non saltano tra un passo e l'altro.
- **Passo**: eyebrow con lineetta = nome della sezione (orientamento, pattern GOV.UK
  «caption»; scelta deliberata contro la regola generica di impeccable sui kicker), h1 =
  la domanda, riga di aiuto, campo, avviso, azioni (Indietro ghost a sinistra, Continua a
  pillola a destra).
- **Scelte** in tre layout: riquadri con icona (2 colonne, 108 px min), righe (1 colonna),
  chip (pillole). Selezionata = bordo blu + fondo blu 8 % + spunta a molla in alto a
  destra (chip: fondo blu pieno). Input nativi nascosti ma accessibili.
- **Campi** con etichetta sopra (nascosta quando coincide con l'h1), prefisso/suffisso
  fissi (+39, .it), spunta verde a destra sui campi complessi, errore = bordo rosso +
  avviso sotto.
- **Avvisi**: riquadro tinta (rosso = blocco, ambra = attenzione) con icona, testo e
  bottoni-azione a pillola bianca («Va bene così, continua», «Sì, usa …»).
- **Suggerimenti**: elenco sotto il campo, voci da 48 px, evidenza blu tenue.
- **Stile**: card con anteprima SVG 4:3 e nome. **Colori**: pallini 44 px con anello blu
  alla selezione. **Foto**: griglia 3 colonne di miniature quadrate con barra in basso,
  spunta verde, «×» da 48 px, «Riprova» rosso. **Logo**: anteprima 96 px + stato.
- **Riepilogo**: sezioni con eyebrow, righe `dt/dd` + «Modifica» a destra, bottone d'invio
  da 64 px a tutta larghezza.
- **Attesa**: pannello bianco sulla card con logo in cerchio blu, tre onde, testo, barra.
- **Fatto**: `body.is-fatto` fondo `#f8fafc`, `.card.is-fatto` blu con testo bianco,
  timeline a tre tappe con numeri bianchi.
- **Binario** (≥1024 px): le 7 sezioni a sinistra della card, voce corrente con fondo
  bianco 8 %, fatte con spunta.

## Motion (`motion.css`, `motion.ts`)

Tempi: 120 / 200 / 300 / 450 / 500 / 550 ms; curve standard `cubic-bezier(.2,0,0,1)`,
decel `(.05,.7,.1,1)`, accel `(.3,0,1,1)`, molla `(.34,1.56,.64,1)`. Un solo momento
autoriale ricorrente (il sipario con bordo blu di 6 px, scelta deliberata dal video di
riferimento: non è un «side-tab» decorativo) e uno finale (la rivelazione). Tutto su
`transform`/`opacity`, interrompibile, e con `prefers-reduced-motion` tutto diventa una
dissolvenza da 120 ms.

## Superfici del browser

Selezione testo blu tenue, cursore blu (`caret-color`), `accent-color` blu sui controlli
nativi, scrollbar sottile grigia, focus 3 px blu con offset 3 px, sottolineature con
offset 3 px.

## Rilievi del detector impeccable accettati (2026-09-07)

`side-tab` sul `.sipario::before` (è il bordo del sipario, non un accento su card);
`dark-glow` sull'ombra blu della CTA (ha offset e sfocatura, sta sulla card bianca);
`cramped-padding` sulla `.card` (il padding vive nei figli: testata, progresso, passo).
