# Piano T1c — Telefono veloce

Brief: `docs/traffico/brief-T1c.md`. Decisione di riferimento: `decisioni-piani.md` T1b punto 9 (sopra il punto 8
per i telefoni). Stato: **sviluppo e calibrazione fatti** (15/09/2026: M1 `5daed74`, M2 `18f7fbd`, M3 `1eb6fe7`,
documenti a seguire); **pubblicazione di Cavaliere e PageSpeed dal vivo in attesa della conferma di Mattia** («Verifica»,
«Dubbi aperti»). Stime nello scratchpad: `t1c/stima.mjs` (foto di Cavaliere, sola lettura).

## 1. Contesto e numeri

**Come si arriva a 90.** Su Cavaliere FCP (0,9 s), Speed Index (0,9 s), TBT (0) e CLS (0) hanno già punteggio
pieno: il totale è 75 + 25 × punteggio LCP (curva di Lighthouse mobile: 10° percentile 2,5 s, mediana 4 s).
Oggi LCP 5,7 s → 0,16 → **79**. **90 ⇔ LCP ≤ ~3,6 s**, 95 ⇔ ≤ 2,9 s, 97 ⇔ ≤ 2,5 s. Il CSS e i font non
spostano il punteggio: conta solo quanti byte arrivano prima che la foto hero sia dipinta.

**Modello del LCP simulato** (profilo 412 px, DPR 1,75, 1,6 Mbps ≈ 200 KB/s, RTT 150 ms), tarato sulle 6 misure
Lighthouse locali della tornata 1 di T1b (errore ≤ 0,1 s; prevede 9,9 s per la ricetta in produzione, misurati 9,75):

`LCP_locale ≈ 1,05 s + 5,4 ms × KB della hero + 3,25 ms × KB delle altre immagini e font partiti prima del LCP`

5,4 ms/KB è la banda del profilo (1 KB = 5 ms); le card pigre contano perché Chromium le richiede a 249 ms, prima
del LCP osservato, e il simulatore le mette in concorrenza con la hero. PSI dal vivo è più ottimista del locale
(79 / 5,7 s contro 75 / 9,75 s con gli stessi byte): parte variabile × ~0,54. Obiettivo in locale **≥ 90**, che dal
vivo lascia margine.

**Quanto può pesare la foto LCP.** Con le altre risorse pre-LCP a ~340 KB (card da telefono + marchio + font):
90 in locale ⇒ hero ≤ ~265 KB; LCP 2,5 s in locale ⇒ hero ≤ ~60 KB (dal vivo ≤ ~340 KB). Il vincolo vero è la
somma: hero e card vanno alleggerite insieme.

**Misure per la ricetta** (Cavaliere; SSIM luminanza media / 2° percentile delle finestre, alla resa 412@1,75):

| | q50 | q60 | q70 | q80 | q90 |
|---|---|---|---|---|---|
| hero ritaglio 860×1088 | 90 KB · 0,960/0,786 | 146 · 0,982/0,911 | **183 · 0,988/0,947** | 229 · 0,991/0,968 | 345 · 0,996/0,983 |
| stesso sotto il velo più chiaro (0,38) | 0,976/0,883 | 0,988/0,949 | **0,992/0,969** | 0,994/0,981 | 0,997/0,990 |
| card-1 640 px (resa 637) | 30 · 0,958/0,840 | 45 · 0,975/0,910 | **58 · 0,982/0,940** | 76 · 0,987/0,959 | 121 · 0,992/0,971 |
| card-4 640 px (resa 637) | 24 · 0,929/0,727 | 38 · 0,957/0,846 | **51 · 0,970/0,897** | 67 · 0,978/0,924 | 108 · 0,986/0,938 |

Marchio alto 120 px (3 × 40 px del telefono): PNG senza perdita 32 KB, palette 11 KB (oggi 285×240, 112 KB).
Hero intera 1920 px: q90 708 KB, q70 377 KB, q55 242 KB (T1b): anche a q55 da sola vale ~1,3 s.

## 2. Soluzione (la più semplice che arriva a 90) e guadagno stimato

Una **serie da telefono** accanto a quella di T1b, scelta dal browser con `<source media>`; nessuna fase nuova,
nessun file nuovo. Per ogni foto con varianti `Foto.astro` rende:

```html
<picture>
  <source media="(max-width: 430px)" type="image/avif" srcset="…hero.<sha8>-r400.avif 400w, …-r860.avif 860w" sizes="600px"><!-- solo hero a tutta pagina -->
  <source media="(max-width: 767px)" type="image/avif" srcset="…-t400.avif 400w, …-t640.avif 640w, …" sizes="S">
  <source type="image/avif" srcset="(serie T1b, invariata)" sizes="S">
  <img src srcset="(JPEG T1b)" sizes="S" width height …>
</picture>
```

1. **`sizes` onesti sotto 768 px** (`sizesPerZoom`): le voci con `max-width` ≤ 767 restano senza raddoppio; prima
   della prima voce oltre 767 (o della finale) si inserisce `(max-width: 767px) <stessa lunghezza non raddoppiata>`,
   il resto si raddoppia come oggi. Es. card → `(max-width: 639px) calc(100vw - 3rem), (max-width: 767px)
   calc(50vw - 2.25rem), (max-width: 1023px) calc(100vw - 4.5rem), 800px`; logo `57px` → `(max-width: 767px) 57px,
   114px`. Da 768 px in su l'HTML sceglie gli stessi candidati di oggi (punto 8 intatto).
2. **Serie da telefono per ogni foto**: AVIF alla stessa scala di T1b (originale in cima), qualità per origine
   calibrata a dimensione resa (C1). Serve una serie a parte perché i gradini 640/960 li usa anche il computer
   (galleria a 1280@1) a q90. Niente JPEG da telefono: i browser senza AVIF (Safari < 16.4) usano il JPEG di T1b
   con i `sizes` del punto 1, già più leggero.
3. **Ritaglio da telefono della hero** (varianti A, C, D; non B, incorniciata 4:3): fascia centrale alta quanto
   l'originale, larga `h × 430/544` (860×1088 su Cavaliere, 45 % dei pixel), usata fino a 430 px. **Zona visibile
   identica per costruzione**: sotto 768 px il riquadro è alto almeno `min-h-[34rem]` = 544 px, quindi fino a 430 px
   il suo rapporto è ≤ 430/544 e `object-cover` centrato (l'`object-position` di oggi) mostra dal ritaglio gli stessi
   pixel dell'originale, alla stessa scala. Nessuna perdita di definizione: i telefoni di riferimento (412@1,75 con
   riquadro alto 626 px, 390@3) chiedono già tutta l'altezza dell'originale. Foto già più strette di 430/544: nessun ritaglio. Da 431 a 767 px la serie da
   telefono non ritagliata con `1170px` non raddoppiato (sceglie l'originale 1920: pochi dispositivi, niente LCP di
   Lighthouse). `sizes` del ritaglio = larghezza coperta massima misurata (iniziale `600px`, C3).
4. **Logo e marchio**: seconda variante PNG senza perdita alta 120 px (3 × 40 px, altezza massima da telefono)
   accanto a quella di T1b fino a 288 px; con il `sizes` del punto 1 il telefono sceglie quella da 120.
5. **CSS bloccante (11 KB, 160 ms): non si tocca.** FCP è già a punteggio pieno, il LCP è dominato dai byte delle
   foto (§1); inlinearlo solo col servizio vorrebbe una condizione in `astro.config.mjs` e peggiorerebbe la cache
   tra le pagine di T5a. Si riapre solo se la mediana locale dopo C1 resta sotto 90 (dubbio 3).

**Guadagno stimato** (modello locale di §1; punteggio con FCP/SI/TBT/CLS invariati; dal vivo tra parentesi):

| Passo (cumulativo) | Byte pre-LCP (hero + altri) | LCP locale | Punteggio locale (dal vivo) |
|---|---|---|---|
| Oggi, ricetta T1b | 708 + 1.557 | 9,75 s misurato | 75 (79 misurato) |
| 1 `sizes` da telefono (card 640 q90) | 708 + 722 | ~7,2 s | ~76 (~86) |
| 3 ritaglio hero q90 | 345 + 722 | ~5,3 s | ~81 (~93) |
| 4 marchio 120 px | 345 + 642 | ~5,0 s | ~82 (~94) |
| 2 qualità da telefono q70 (hero e card) | 183 + 342 | **~3,2 s** | **~94 (~99)** |
| variante q80 | 229 + 427 | ~3,7 s | ~90 (~98) |

Senza la qualità a dimensione resa il 90 locale non si raggiunge; senza il ritaglio la hero a 1920 px dovrebbe
scendere a ~q55 (242 KB) per sfiorarlo, spendendo più di metà dei byte in pixel che il telefono non mostra. Q80 è
al limite in locale: C1 decide sui numeri e sulle schermate.

## 3. Ricetta delle varianti aggiornata (`RICETTA` in `scripts/media-varianti.ts`)

| Voce | T1b (invariata) | T1c (in più, valori iniziali; C1/C3 li tarano) |
|---|---|---|
| Foto | AVIF q90 + JPEG q95 (originale in cima), scala 400/640/960/1280/1920 + originale | `telefono`: AVIF stessa scala, `qualitaTelefono` generata q70 / reale q70, nomi `-t<w>.avif` |
| Hero A/C/D | come le foto; og:image 1200×630 | `ritaglio`: centro, `h × 430/544` se la foto è più larga, scala tagliata alla sua larghezza, `qualitaRitaglio` q70, nomi `-r<w>.avif` |
| Logo, marchio | PNG senza perdita alto fino a 288 px | PNG senza perdita alto 120 px (se l'originale è più alto) |
| Favicon | PNG 96 a palette | invariata |

Manifest (campi opzionali in più, `versione` 1): `"telefono": [[url, w], …]` in ogni foto;
`"ritaglio": { "w": 860, "h": 1088, "avif": [[url, w], …] }` sulla sola hero; il `png` del logo con due candidati.
Il ritaglio è una voce di cache a parte (tipo `ritaglio`, come `og`), la serie da telefono sta nella voce della
foto. Cambiando lo script cambia la ricetta: la prima build di ogni cliente col servizio ricodifica (Cavaliere a
freddo stimato ~130 s contro 81 s, sotto il timeout di fase di 300 s).

In `src/lib/media.ts`: `TELEFONO_MAX = 767`, `RITAGLIO = { media: "(max-width: 430px)", sizes: "600px" }`,
`sizesPerZoom` del punto 1. In `Foto.astro`: prop `ritaglioTelefono?: boolean` (la passa solo `Hero.astro` sulla foto
a tutta pagina) e i due `<source media>`. In `budget-pagine.ts`: il primo `<source type="image/avif">` il cui
`media` (grammatica `(max-width: Npx)`) vale a 412 px, altrimenti quello senza `media`, altrimenti l'`<img>`;
avviso nuovo «foto LCP da telefono» sull'immagine con `fetchpriority="high"` oltre `SOGLIE.fotoLcpKb`.

## 4. File e perimetro

Modificati (nessun file nuovo): `site-renderer/scripts/media-varianti.ts`, `site-renderer/src/lib/media.ts`,
`site-renderer/src/components/Foto.astro`, `site-renderer/src/sections/Hero.astro` (una prop),
`site-renderer/scripts/budget-pagine.ts`, `site-renderer/scripts/test-media.ts`; documenti
`docs/traffico/piano-T1c.md`, `docs/traffico/README.md` (§7), `docs/handoff-fase-c.md`, `docs/DEBUG.md`.

Non toccati: `global.css` (le regole `picture` e `picture > source` bastano), `Header.astro`, `SubPage.astro`,
`Base.astro`, `lib/build.ts` (fasi e timeout invariati), `astro.config.mjs`, `schema.ts`, baseline VRT, `presets/*`.

`.claude/scope.json` (primo atto della fase 2, a perimetro T4 svuotato):

```json
{
  "task": "T1c: telefono veloce (docs/traffico/piano-T1c.md)",
  "perimetro": [
    "site-renderer/scripts/media-varianti.ts",
    "site-renderer/src/lib/media.ts",
    "site-renderer/src/components/Foto.astro",
    "site-renderer/src/sections/Hero.astro",
    "site-renderer/scripts/budget-pagine.ts",
    "site-renderer/scripts/test-media.ts",
    "docs/traffico/**",
    "docs/handoff-fase-c.md",
    "docs/DEBUG.md"
  ]
}
```

## 5. Milestone (ogni verifica passa prima della successiva; commit con path espliciti + push)

`export PATH="$HOME/.local/bin:$PATH"`; script di verifica nello scratchpad, riusando `t1b-dev/` (identità,
`verifica-acceso.mjs`, `lh/` con Lighthouse 13.4.1 già installato, `calib/lh.mjs`); nessun file del repo per i test.

| M | Contenuto | Verifica |
|---|---|---|
| **M0** | `BASE` = commit corrente; fixture `out/zz-test-t1c` da Cavaliere come M0 di T1b (senza `siteUrl`, Umami, integrazioni, deploy, infra; `dominio: "zz-test-t1c.invalid"`; `src` delle immagini riportati allo slug); build accesa con la ricetta T1b | Lighthouse ×5 home: riferimento (atteso ~75, LCP ~9,7 s) |
| **M1** | `sizesPerZoom`, costanti, `Foto.astro`, prop in `Hero.astro`; casi nel banco | `test-media.ts` verde (nuovi: `sizesPerZoom` su tutti gli `SIZES`, galleria, logo e 767 esatto); **identità a servizio spento** 12/12 (golden + 3 clienti × env a/b/c, HTML uguale a meno degli hash, CSS identico o solo additivo con le regole elencate); `npm run build`, `npm run check` (solo l'errore noto di `registry.ts`), `npm run test:visual` **senza update** 28/28 e `git status` delle baseline vuoto |
| **M2** | serie da telefono, ritaglio, logo 120 in `media-varianti.ts`; `<source media>` e avviso foto LCP in `budget-pagine.ts`; casi nel banco | banco verde (serie `t`, ritaglio 860×1088 da 1920×1088, nessun ritaglio da foto 3:4 né da hero B, logo con 2 PNG, cache a caldo, budget che sceglie il `source` da telefono a 412 px e avvisa oltre soglia); fixture × 7 preset con manifest: **box** identici a 360@2, 390@3, 412@1,75, 430@3, 768@2, 1280@1, 1920@1; **zona visibile**: scarto pixel della sezione hero tra ricetta T1b e T1c a 360/390/412/430 entro il rumore di ricampionamento (medio ≤ 1, 0 % oltre 24); **sizes onesti**: ≤ 767 px candidato ≥ resa × DPR e non oltre il gradino successivo, da 768 px regola dello zoom di T1b invariata (0 errori); axe 390@3 e 1280 senza violazioni nuove; `hashPagina` invariato. **Commit 1** |
| **M3** | calibrazione C1-C4 (§6) | sezione «Calibrazione»; schermate a Mattia; Lighthouse ×5 home meridian **e canon** (hero più alta) **≥ 90**, /privacy/ invariata (99-100). **Commit 2** |
| **M4** | E2E dall'editor sulla fixture (route della scheda Build): E1 spento (fasi di sempre, nessun `traffico/`), E2 attivo (voci `telefono`/`ritaglio`, tabella budget, `lastmod` con l'hash di sempre), E3 seconda build dalla cache e `diff -r` vuoto, E6 sospeso = E3, E7 `DELETE` col nome esatto e `out/` = 3 clienti; editor `npx tsc --noEmit`, `npm run build`, `test-fondamenta`, `test-traffico-stato`; renderer `test:a11y`, `gate:tokens`, `gate:overflow`, validatore | tutto verde, esiti in «Verifica». **Commit 3** |
| **M5** | dal vivo (§7), chiusura: README §7, handoff, DEBUG (una riga: «foto pesante da telefono → manifest `telefono`/`ritaglio` e avviso foto LCP»), file toccati contro §4, `scope.json` svuotato | «Verifica» completa. **Commit 4** |

## 6. Calibrazione (fase 3, nello scratchpad, sulle foto dei 3 clienti)

- **C1 qualità da telefono** per origine (generate: hero, card; reali: lavori di Cavaliere e Mattia Saggin): AVIF
  q 55/62/70/78/85. Gate «indistinguibile a dimensione resa»: SSIM contro l'originale ridotto **alla larghezza che
  il telefono sceglie** (412@1,75 e 390@3, senza zoom), media ≥ 0,97 sulla foto mediana e ≥ 0,94 sulla peggiore
  (gate G1 della tornata 1 di T1b, allora giudicato «nessuna differenza a occhio al 100 %»); la hero sotto il velo
  più chiaro del gradiente (0,38). Si sceglie la qualità più bassa che passa **più un gradino** («nel dubbio si
  sale»), poi schermate affiancate T1b / T1c al 100 % a 390@3 e 412@1,75 di hero, servizi e lavori, 7 preset, in
  `~/.cache/site-factory/revisione-T1c/`. Dalle misure di §1 l'attesa è q70-78.
- **C2 ritaglio**: rapporto 430/544 confermato dal controllo della zona visibile di M2; se un preset rende il
  riquadro meno alto di 544 px a 430 px (rem diverso) il rapporto si ricava da quel minimo.
- **C3 `sizes` del ritaglio**: larghezza coperta massima misurata sui 7 preset fino a 430 px (altezza del riquadro
  × 430/544), arrotondata in su a 10 px; controllo «sizes onesti» del telefono a 0 errori.
- **C4 soglie del budget**: home e sottopagine dei 3 clienti × 7 preset a 412@1,75 con la ricetta nuova; soglie =
  massimo + ~20 % (così un ritorno al raddoppio da telefono torna ad avvisare). **Foto LCP da telefono**: avviso oltre
  **250 KB** (dal modello di §1 tiene il locale sotto ~3,5 s con ~340 KB di altre risorse), tarato sul massimo
  misurato + 20 % se più alto e comunque ≤ 265 KB; è un avviso «Pagine leggere:», mai un blocco (T1b punto 2).
- Il marchio da telefono resta PNG senza perdita (nessuna calibrazione: 32 KB, −80 KB).

## 7. Verifica finale dal vivo (ripubblicazione autorizzata da Mattia il 15/09)

1. Build di Cavaliere dall'editor (servizio Sito attivo): controlli come la pubblicazione del 15/09 (robots con
   Sitemap, sitemap, JSON-LD, noindex solo su workers.dev, nessuna immagine rotta a 390 e 1280, avvisi «Pagine
   leggere:» letti); schermate della home a 390@3 e 1280 prima del deploy; poi il deploy dalla scheda.
2. PageSpeed Insights API con `GOOGLE_API_KEY` letta da `lib/secrets.ts`: **una chiamata `strategy=mobile` e una
   `strategy=desktop`** su `https://cavalierebuild.it/`, nessun ripetere; JSON in
   `~/.cache/site-factory/psi-{mobile,desktop}-cavaliere-<data>.json`. Si annotano punteggio, LCP (elemento, byte,
   tempo), FCP, CLS, TBT e peso; atteso mobile ≥ 90 (stima ~98), desktop ≥ 98 (invariato).
3. Esito sotto 90 dal vivo con la locale ≥ 90: nessun secondo deploy; numeri e diagnosi a Mattia.

## 8. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| Zona visibile della hero diversa dal telefono | rapporto dal minimo garantito dal CSS; scarto pixel 7 preset × 4 larghezze in M2 |
| Perdita visibile sulle foto da telefono | gate SSIM a dimensione resa + un gradino in più + schermate a Mattia; il computer resta a q90 |
| 90 non raggiungibile con la qualità minima accettabile | ci si ferma e decide Mattia coi numeri (dubbio 4), mai qualità sotto il gate in silenzio |
| HTML dei siti a servizio spento che cambia | `Foto.astro` senza manifest invariato; identità 12/12 a ogni commit che tocca il renderer; VRT senza update |
| Tablet sotto 768 px (iPad mini verticale, 744 px) senza margine 2× | conforme alla regola «≤ 767 px» del punto 9; annotato |
| Varianza di Lighthouse e PSI (±2-3 punti) | mediana di 5 in locale, locale più pessimista del vivo (§1) |
| Codifica a freddo più lunga, `dist` più pesante (~+5 MB su Cavaliere) | cache; timeout di 300 s lontano; misurato in E2 (se oltre 240 s ci si ferma a chiedere) |
| Safari/iOS non verificabile in locale | `<source media type>` standard; controllo sull'iPhone di Mattia dopo il deploy |
| Il LCP passa al testo della hero | si annota l'elemento; nessuna scelta fatta per spostare la metrica |

## 9. Dubbi (proposta tra parentesi)

1. **Rapporto del ritaglio**: 430/544, identico fino a 430 px per costruzione, oppure 412/626 (716 px, −17 % di
   byte) che però taglia la zona visibile sulle hero basse (**430/544**).
2. **JPEG da telefono** per i browser senza AVIF (**no**: meno dell'1 % dei telefoni, già alleggeriti dal punto 1).
3. **CSS inline col servizio** (−~0,15 s su FCP e LCP) (**no in T1c**; solo se la mediana locale resta sotto 90, e
   allora si chiede di aggiungere `astro.config.mjs` al perimetro).
4. **Conflitto qualità/velocità**: se la qualità più bassa che passa C1 non dà 90 in locale (**decide Mattia sulle
   schermate e sui numeri**, come per il punto 8).
5. **Gate qualità da telefono** = G1 della tornata 1 di T1b a dimensione resa + un gradino (**sì**).
6. **Avviso foto LCP da telefono** a 250 KB e soglie del budget ricalibrate a massimo + 20 % (**sì**, avvisi).
7. **Lighthouse locale** su meridian e canon, non su tutti i 7 preset (**sì**: canon ha la hero più alta; gli altri
   5 condividono la stessa hero e differiscono solo nei byte dei font).

## Scostamenti dal piano nello sviluppo (M1-M2)

Emersi dal banco del browser o dalle correzioni del controllore; nessun file fuori perimetro.

1. **Marchio da telefono solo sotto 768 px.** Con il `png` a due candidati del §3 il computer a DPR 1 (1280@1, 1920@1)
   sceglieva il PNG da telefono al posto di quello di T1b: contro «tablet e computer scelgono gli stessi file di oggi».
   Il PNG da telefono sta nella voce `telefono` (`[-t143, 285]`) e Foto.astro lo offre con un `<source media="(max-width:
   767px)">`; l'`<img>` resta con il solo PNG di T1b.
2. **Larghezza esatta per il marchio.** Con `sizes` arrotondato al pixel (47,5 → 48 px) un DPR 3 chiedeva 144 px e
   Chromium (primo candidato con densità ≥ DPR, nessuna media geometrica) prendeva il PNG da 285: `sizesLogo` scrive la
   larghezza esatta arrotondata per difetto al millesimo (47.5px) e la variante da telefono è larga `ceil(w × 120 / h)`
   (143 px, alta 120). Per eccesso (prima versione) sbagliava quando `120 × w / h` è intero non multiplo di 3: marchio
   500×300, `66.667px`, un DPR 3 chiedeva 200,001 px e Safari/Firefox (densità ≥ DPR) prendevano il PNG da 480; il banco
   ora prova il 500×300 codificato e 7.604 rapporti. Il riquadro del marchio sul telefono cambia di 0,14 px (42,89 contro
   42,75 a 36 px d'altezza: il PNG intero non ha il rapporto esatto 285/240); da 768 px nessuna differenza.
3. **Serie da telefono e ritaglio come voci di cache a parte** (tipi `telefono-generata`, `telefono-reale`, `ritaglio`):
   con la correzione del controllore la foto usata solo come hero a tutta pagina non riceve la serie da telefono, quindi
   la serie non può stare nella voce della foto.
4. **Foto della hero già più stretta di 430/544** (verticale): ritaglio = foto intera alla qualità del ritaglio, invece di
   «nessun ritaglio», così fino a 430 px non torna alla serie q90 con `sizes` 1170px; la zona visibile è la stessa (niente
   da tagliare) e `sizes` resta onesto (larghezza coperta ≤ quella del ritaglio 430/544).
5. **Il budget legge ogni `<source>`** (anche il PNG del marchio), non solo quelli AVIF.

## Calibrazione

Fase 3, 15/09/2026, nello scratchpad (`t1c/`: `c1.mjs`, `acceso.sh`, `acceso90.sh`, `verifica-t1c.mjs`, `lh.mjs`,
`c4.sh`, `revisione.mjs`) sulla fixture `out/zz-test-t1c` (clone di Cavaliere) e sulle copie delle foto dei 3 clienti.
Lighthouse **13.4.1** con il Chromium di Playwright, profilo mobile predefinito, 5 esecuzioni e mediana, server statico che
comprime il testo; Umami e n8n bloccati.

- **C1 qualità da telefono** (SSIM luminanza, finestre 8×8 passo 4, contro l'originale ridotto alla larghezza scelta dal
  telefono: card generate 640 e originale, lavori reali 400/640/originale, hero = ritaglio 860 sotto il velo 0,38; KB
  medi · SSIM media mediana / peggiore; gate: mediana ≥ 0,97 e peggiore ≥ 0,94):

  | | q55 | q62 | **q70** | q78 | q85 |
  |---|---|---|---|---|---|
  | generate (26 misure) | 45 · 0,963/0,946 no | 58 · 0,973/0,961 passa | **71 · 0,979/0,969** | 90 · 0,985/0,977 | 124 · 0,991/0,984 |
  | reali (54 misure) | 74 · 0,964/0,918 no | 89 · 0,972/0,943 passa | **102 · 0,979/0,959** | 119 · 0,985/0,973 | 144 · 0,991/0,986 |
  | hero sotto il velo (3) | 87 · 0,978/0,966 passa | **109 · 0,984/0,970** | 132 · 0,988/0,974 | 165 · 0,991/0,981 | 220 · 0,994/0,988 |

  Prima qualità che passa: q62 per generate e reali, q55 (la più bassa provata) per la hero sotto il velo. Più un
  gradino: **serie da telefono q70** (generate e reali), **ritaglio q62**. Peggiori: lavoro-10 di Cavaliere a 400 px
  (0,959 a q70), hero di Costruzioni Generali (0,974 sotto il velo a q62; 0,935 senza velo, che però non si vede mai).
- **C2 ritaglio**: riquadro della hero fino a 430 px alto 626-734 px nei 7 preset (meridian 626 a 412, atelier 734 a
  360), sempre ≥ 544: rapporto **430/544** confermato. Zona visibile: il confronto del piano «scarto medio ≤ 1, 0 % oltre
  24» non è raggiungibile nemmeno a pari qualità, perché due codifiche AVIF indipendenti (1920 q90 intera contro 860 q90
  ritagliata) differiscono sui bordi fini e il telefono le ingrandisce (×1,06-1,73): scarto medio 0,48-3,34, il più alto su
  vita a 412@1,75 (impalcature sotto la parte chiara del velo). Criterio sostituito con quello geometrico: a pari qualità
  (ritaglio q90) lo scarto minimo sta a spostamento **(0,0) su 28/28** confronti (7 preset × 360/390/412/430) cercando a un
  quarto di pixel del dispositivo; uno spostamento di 1 px vale 2-6 volte lo scarto. Con q62: medio 0,84-3,41, oltre 24
  ≤ 2,86 %; a occhio al 100 % nessuna differenza (schermate sotto).
- **C3 `sizes` del ritaglio**: larghezza coperta massima 580 px (atelier a 360 px) → **590px**. Con 590px ogni telefono da
  DPR 1,09 in su chiede più di 640 px, quindi nessun viewport di verifica sceglie i gradini 400 e 640: la scala del
  ritaglio parte da 960 più la larghezza del ritaglio, e per le hero 1920×1088 è **un file solo** (`-r860`, 157 KB su
  Cavaliere). Banco del browser sulla ricetta finale, 7 preset × 9 viewport: 0 errori (box, sizes onesti fino a 767 px, da
  768 px stessi file di T1b, marchio `-t143` a 390@3, 412@1,75 e 430@3, axe 0 violazioni come senza varianti).
- **C4 soglie del budget** (412 px · DPR 1,75, ricetta finale): home della fixture 1.098 KB (meridian) - **1.243 KB
  (canon)**, immagini 1.034 KB, 23-25 richieste; Mattia Saggin 610/755 KB, 17/19 richieste; Costruzioni Generali 139/284
  KB; sottopagine 47-242 KB. Soglie = massimo + ~20 %: **totale 1.500 KB, immagini 1.250 KB, 30 richieste** (la ricetta
  T1b sul telefono, 5.320 KB, torna ad avvisare). Foto LCP da telefono: massimo 157 KB (hero di Mattia Saggin), + 20 % =
  188 KB sotto i 250: resta **250 KB**.
- **Marchio**: PNG senza perdita `-t143` 33 KB contro 114 KB (nessuna calibrazione, come da piano).
- **Tempi e disco**: 39 voci di Cavaliere a freddo 81-124 s (T1b 51-81 s; timeout di fase 300 s), a caldo dalla cache;
  `dist` 45,2 → 54,4 MB (222 varianti contro 151).

**Lighthouse locale** (home e /privacy/, mediana di 5):

| Dist | Home | LCP | FCP | Peso | /privacy/ |
|---|---|---|---|---|---|
| M0 riferimento, ricetta T1b (meridian) | 75 | 9,68 s | 1,06 s | 2.287 KB | 100 |
| **T1c meridian** (preset di Cavaliere) | **95** | **3,00 s** | 1,06 s | 481 KB | 100 |
| T1c ferro · nova · terra · vita · atelier | 94 · 92 · 92 · 92 · 91 | 3,08-3,38 s | 1,20-1,51 s | 493-539 KB | — |
| **T1c canon** | **88** | 3,75 s | 1,80 s | 604 KB | 99 |
| canon con CSS inline (prova, `astro.config.mjs` non toccato) | 87 | 3,83 s | 1,80 s | 604 KB | 100 |
| canon alla qualità minima che passa il gate (serie q62, ritaglio q55) | 91 | 3,30 s | 1,80 s | 527 KB | — |

LCP sempre sulla foto della hero. **Canon resta sotto 90 per i font**, non per le foto: Playfair Display 600 (38 KB) e
Source Serif 4 400 (120 KB) partono prima del primo disegno e il simulatore li mette davanti a FCP e LCP (+0,75 s su
entrambi rispetto a meridian con 34 KB di Archivo). Il CSS inline non sposta nulla (la home aspetta font e foto, non i 9 KB
di CSS): `astro.config.mjs` resta fuori dal perimetro. La qualità minima del gate arriva a 91, quindi la condizione di stop
della decisione non scatta; resta la ricetta con il gradino di margine (q70/q62) e la scelta per canon passa a Mattia
(«Dubbi aperti»).

**Schermate per la revisione di Mattia** (fuori da git e da `out/`, `~/.cache/site-factory/revisione-T1c/`):
`<preset>/<390|412>-<hero|servizi|lavori>.png` = sezione a 390@3 e 412@1,75 al 100 % (pixel del dispositivo), ricetta T1b
(zoom, q90) affiancata alla ricetta T1c (serie q70, ritaglio q62); per meridian e canon una terza colonna con la qualità
minima del gate (q62/q55).

## Verifica

15/09/2026. `BASE` = `a5e5b25` (ricetta T1b). Script nello scratchpad (`t1c/`: `id/identita.sh` +
`id/confronta-dist.mjs`, `acceso.sh`, `acceso90.sh`, `verifica-t1c.mjs`, `hash-pagine.ts`, `lh.mjs`, `c4.sh`,
`revisione.mjs`, `live/rotte.mjs`); nessun file del repo modificato per i test.

- **M0**: fixture `out/zz-test-t1c` da Cavaliere come M0 di T1b (senza `dist`, log, `traffico/`, `siteUrl`, Umami,
  integrazioni, deploy, infra; servizio spento; `dominio: "zz-test-t1c.invalid"`; `src` allo slug). Riferimento con la
  ricetta T1b: Lighthouse 75, LCP 9,68 s, 2.287 KB.
- **Identità a servizio spento** (M1, M2, M3): golden + 3 clienti × env (a)(b)(c) **12/12**, HTML identico a meno degli
  hash, **CSS identico** (0 dichiarazioni aggiunte); il comparatore segnala le differenze vere (18 errori con env diverse).
- **Banchi e suite** (codice di M3): `test-media.ts` **83/0** (sizes per l'HTML su 16 usi da 320 a 2000 px, 767/768
  esatti, `sizesLogo` esatto, serie `-t`, ritaglio 860×1088 e 1146×1450 centrato, hero B, hero verticale, marchio `-t143`
  solo da telefono, cache a caldo, budget con `<source media>`, avviso foto LCP, `media` fuori grammatica; mutazioni del
  centraggio e della scelta della sorgente fanno fallire i casi). Renderer: `npm run build` ok, `npm run check` 68 file
  con il solo errore noto di `registry.ts`, validatore ok su golden e 3 clienti, `test:visual` **28/28** senza aggiornare
  (`git status` delle baseline vuoto), `test:a11y` **14/14**, `gate:tokens` pulito, `gate:overflow` 7/7. Editor (non
  toccato): `npx tsc --noEmit` ok, `test-fondamenta` 114/0, `test-traffico-stato` 58/0.
- **M2-M3 servizio acceso** (fixture × 7 preset × 360@2, 390@3, 412@1,75, 430@3, 768@2, 1280@1, 1280@2, 1920@1, 1920@2):
  **0 errori** su box di immagini e sezioni (unica differenza ammessa e annotata: larghezza del marchio da telefono,
  scostamento 2), sizes onesti, file da 768 px uguali a T1b, marchio `-t143` sui telefoni, axe 0 violazioni come senza
  varianti; zona visibile della hero allineata (0,0) 28/28 («Calibrazione» C2); `hashPagina` e `controllaPagina` invariati
  su 28 pagine; budget con la ricetta T1b → avvisi (5.320 KB, foto LCP 707 KB), con T1c nessun avviso.
- **M4 E2E**: le prove E1, E6 ed E7 sulla fixture dall'editor **non fatte**: la prima build con dominio crea un sito Umami di
  prova sul VPS (e E7 lo cancella), una modifica online esclusa dall'orchestratore per questo piano. T1c non tocca
  `lib/build.ts` (fasi e condizioni del servizio verificate in T1b E1-E7) e l'identità a servizio spento è provata sul
  renderer; E2 ed E3 fatti sulla build reale di Cavaliere (sotto). Fixture spostata nello scratchpad
  (`t1c/fixture-zz-test-t1c`), `out/` = 3 clienti, `client.json` di Cavaliere uguale a M0 fino alla build.
- **M5 build di Cavaliere dall'editor** (route della scheda Build, servizio Sito attivo): fasi di sempre più «pagine
  leggere» (**39 voci codificate in 84,3 s**) e «budget pagine» (home 1.098 KB / 1.034 KB / 24 richieste, sottopagine
  86-88 KB, nessun avviso); `robots.txt`, `sitemap.xml`, `_headers`, JSON-LD e `lastmod.json` **identici** alla versione
  pubblicata; HTML identico fuori dai `<picture>`, CSS invariato; 0 immagini rotte e 0 richieste fallite su 4 pagine a
  390@3, 412@1,75, 430@3 e 1280@1 (a 1280 gli stessi file di prima); seconda build 39/39 dalla cache, `dist` e manifest
  identici (E3). Lighthouse locale ×5 sulla `dist` di Cavaliere: **75 → 94**, LCP 9,75 → 3,08 s, 2.288 → 482 KB,
  /privacy/ 99 → 100. Schermate della home a 390 e 1280 in `~/.cache/site-factory/revisione-T1c/cavaliere-prima-del-deploy/`.
- **Pubblicazione e PageSpeed dal vivo: non fatti.** Conferma della build, deploy su cavalierebuild.it e le due chiamate
  PageSpeed (mobile e desktop) cambiano un sito pubblico del cliente: vanno lanciati con la conferma diretta di Mattia
  (l'agente di sviluppo non può riceverla). Stato di Cavaliere: build nuova **da verificare** nell'editor, sito online
  ancora con la ricetta T1b. Comandi, nell'ordine: `POST /api/clients/cavaliere-build-srls/build {"action":"confirm"}`,
  `POST /api/clients/cavaliere-build-srls/deploy`, poi PageSpeed `strategy=mobile` e `strategy=desktop` su
  `https://cavalierebuild.it/` con `GOOGLE_API_KEY` da `lib/secrets.ts`, JSON in
  `~/.cache/site-factory/psi-{mobile,desktop}-cavaliere-2026-09-15-t1c.json` (quello del mattino resta come «prima»);
  attesi mobile ≥ 90 (prima 79, LCP 5,7 s) e desktop ≥ 98.
- **Correzioni dei revisori** (`sizesLogo` per difetto al millesimo, scostamento 2; riga di `docs/DEBUG.md` su hero B e
  SVG/GIF): `test-media.ts` **85/0** (nuovi: marchio 500×300 codificato → `-t200` a 390@3, 412@1,75 e 430@3; 7.604
  rapporti × 48/40/32 px, 2.308 fallivano per eccesso); WebKit e Chromium veri a 390@3 con `-t200`/480: `66.667px` →
  480, `66.666px` → 200. Identità a servizio spento contro `25e391a` 12/12; `npm run build`, `npm run check` (solo
  `registry.ts`), validatore, `test:visual` 28/28 senza aggiornare, `test:a11y` 14/14, `gate:tokens`, `gate:overflow`
  7/7; fixture meridian con manifest byte-identica alla build di M3 (marchio 285×240, larghezze esatte), Lighthouse ×5
  **95** (LCP 3,00 s), /privacy/ 100; editor `tsc` ok, `test-fondamenta` 114/0, `test-traffico-stato` 58/0.
  `media-varianti.ts` non toccato: ricetta e cache delle varianti di Cavaliere invariate, build già pronta valida.

**File toccati rispetto al §4**: `scripts/media-varianti.ts`, `src/lib/media.ts`, `src/components/Foto.astro`,
`src/sections/Hero.astro` (una prop), `scripts/budget-pagine.ts`, `scripts/test-media.ts`, `docs/traffico/piano-T1c.md`,
`docs/traffico/README.md`, `docs/handoff-fase-c.md`, `docs/DEBUG.md`. Nessun file fuori perimetro; `astro.config.mjs`
provato solo nello scratchpad e non aggiunto. Fuori da git: cache delle varianti in `site-renderer/node_modules/.cache/
media-varianti/` (voci di Cavaliere della ricetta `705ff5a2904e`), schermate in `~/.cache/site-factory/revisione-T1c/`.

## Dubbi aperti per Mattia

1. **Canon a 88 in locale.** (a) Ricetta calibrata con un gradino di margine: 6 preset su 7 ≥ 91, canon 88; (b) qualità
   minima del gate per tutti i siti (serie q62, ritaglio q55): canon 91, foto al limite del gate su tutti i preset; (c)
   alleggerire i font di canon (Source Serif 4 latin 120 KB) in un piano a parte, fuori da T1c. Proposta: **(a) + (c)**;
   nessun cliente oggi usa canon, Cavaliere (meridian) è a 95.
2. **Pubblicazione di Cavaliere** con la build T1c già pronta e verificata in locale (94): conferma, deploy e PageSpeed dal
   vivo con i comandi in «Verifica», dopo l'ok diretto di Mattia; poi controllo sull'iPhone (Safari non verificabile in
   locale).
