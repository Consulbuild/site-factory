# Piano T1b — Pagine leggere

Brief: `docs/traffico/brief-T1b.md`. Roadmap: `docs/traffico/README.md`. Stato: **fase 1 (piano) scritta il
2026-09-14, da rivedere dall'orchestratore**. Nessun file del repo toccato: misure in sola lettura, prove e
spike solo nello scratchpad. `.claude/scope.json` è occupato dal perimetro «T6a» di un'altra sessione: la
fase 2 parte solo quando quel perimetro è svuotato (README §5).

## 1. Contesto

I siti col servizio Traffico «Sito» attivo o sospeso devono caricarsi in fretta da mobile senza cambiare
aspetto né contenuto. Oggi ogni foto è servita com'è: nessun `srcset`, nessun formato moderno, nessuna
dimensione esplicita. T1b aggiunge:

1. varianti delle immagini (larghezze e formati) prodotte da una **fase deterministica della build**, un
   manifest passato al renderer via env (stesso schema di `DATI_STRUTTURATI_JSON` di T1a) e un solo
   componente `Foto.astro` che rende `<picture>` quando la variante esiste e l'`<img>` di oggi quando no;
2. un **budget per pagina come gate** della build, calcolato in modo statico sulla `dist`;
3. per i font, solo ciò che le misure giustificano (§2.5, §4.4).

Tutto gira con la stessa regola delle fondamenta: `fondamentaAttese()` non nulla (servizio attivo o sospeso,
dominio, percorso non demo, build completa). A servizio spento la `dist` segue il criterio di T5a (§4.7).

Vincoli a monte: T1a (`testoIndicizzabile` ignora `src`/`srcset`, conta gli `alt`; `og:image` e `image` del
JSON-LD puntano agli originali in `/media/<slug>/`); T5a (criterio di sicurezza, decisione 1; componenti
`src/pagine/` con foto: `HeroPagina`, `SchedeLavori`, `Gallery` riusata); decisione 3 del README (tutto
attivabile per cliente).

## 2. Misure attuali (sola lettura, 2026-09-14)

Script di misura e copie in `/private/tmp/claude-501/-Users-mattia-Claude-Projects-Site-factory/700accc8-ece8-420b-a22c-2db8c846d1ad/scratchpad/t1b/`
(`misura.cjs`, `box.cjs`, `comprimi.cjs`, `ricetta.cjs`, `confronta.cjs`, `spike/`).

### 2.1 `dist` su disco

`site-renderer/out/cavaliere-build-srls/dist` (build del 6/09, prima di T1a, con Umami): **9 548 KB**.

| Tipo | File | KB | Note |
|---|---|---|---|
| JPG | 18 | 8 149 | hero 1 005 · 5 card 384-490 · 12 lavori 212-612 |
| WOFF2 | 24 | 994 | i font di **tutti** i 7 preset (copia di `public/fonts`): peso su disco, non scaricato |
| SVG | 1 | 145 | `favicon.svg` |
| PNG | 1 | 114 | `mark.png` 285×240, mostrato alto 36-48 px |
| CSS | 1 | 69 | 10,9 KB gzip; di cui `@font-face` 28 KB grezzi, **1 KB gzip** |
| HTML | 4 | 77 | `index.html` 47 KB, 10,7 KB gzip |

Altri clienti (tutti `meridian`): Costruzioni Generali 2,6 MB (media 1,5 MB), Mattia Saggin 5,4 MB (media 4,3 MB).

### 2.2 Immagini sorgente di Cavaliere

| File | Dimensioni | Origine | Formato |
|---|---|---|---|
| `hero.jpg` | 1920×1088 | FLUX (`generate-image.mjs`) | JPEG baseline 4:4:4, niente EXIF né ICC |
| `card-1..5.jpg` | 1216×912 | FLUX | idem |
| `lavoro-1..12.jpg` | 1200×1600 (11), 1600×1200 (1) | form, raddrizzate e ridotte a lato lungo 1600 da `lib/lavori.ts` | JPEG progressivo 4:2:0, senza metadati |

### 2.3 Cosa scarica il browser (Chromium, 390×844, DPR 3, server locale)

- **Primo caricamento senza scroll: 11 richieste, 3 540 KB**: hero 1 005 · **5 card 2 268** (hanno
  `loading="lazy"` ma stanno entro la soglia di anticipo di Chrome) · mark 114 · CSS 69 · HTML 47 · **font 34**
  (`archivo-400-latin.woff2`, l'unico) · script Umami.
- LCP = foto hero; CLS 0-0,001; **nessuna `<img>` ha `width`/`height`**; pagina alta 11 648 px.
- Con throttling DevTools (1,6 Mbps, RTT 150 ms, CPU ×4): **LCP 10,7-11,0 s**.

### 2.4 Larghezza resa delle immagini (CSS px; hero = lato che copre il box con `object-cover`)

| Viewport | Hero | Card servizio | Galleria (masonry) | Mark |
|---|---|---|---|---|
| 360 | 1170 | 310 | 312 / 150 | 43 |
| 390 | 1152 | 340 | 342 / 165 | 43 |
| 768 | 1073 | 338 | 704 / 344 | 48 |
| 1024 | 1110 | 302 | 472 / 309 / 228 | 48 |
| 1280-1920 | = viewport | 222 (5 card) | 600 / 395 / 292 | 48 |

La hero da mobile è ritagliata: il box è verticale e la foto larga, quindi copre ~1150 px CSS anche a 390.

### 2.5 Font per preset (ciò che una pagina può scaricare)

| Preset | Titoli / testo | File latin | KB |
|---|---|---|---|
| meridian | Archivo / Archivo | archivo-400-latin | 34 |
| atelier | Inter Tight / Inter | inter-tight + inter | 91 |
| nova | Space Grotesk / Inter | space-grotesk + inter | 69 |
| canon | Playfair Display / Source Serif 4 | playfair (normale + corsivo) + source-serif-4 | 180 |
| terra | Fraunces / Karla | fraunces (normale + corsivo) + karla | 131 |
| vita | Plus Jakarta Sans / Inter | plus-jakarta-sans + inter | 74 |
| ferro | Space Grotesk / Karla | space-grotesk + karla | 45 |

Sono **font variabili**: un file per famiglia, stile e subset serve tutti i pesi. Il browser scarica solo
le famiglie usate e solo i subset toccati (`unicode-range`): l'italiano sta tutto in `latin`. Il «~1 MB di
font» del brief è il peso su disco della `dist`, non ciò che scarica una pagina. Tutti i blocchi hanno
`font-display: swap`; CLS misurato 0-0,001.

### 2.6 Prove di compressione (copie, sharp 0.34.5; SSIM = indice approssimato sulla luminanza, variante vs sorgente ridotta)

| Immagine, larghezza | JPEG q82 mozjpeg | WebP q80 | AVIF q55 |
|---|---|---|---|
| hero 1920 | 334 KB · 0,946 | 342 · 0,974 | 242 · 0,965 |
| hero 1280 | 154 · 0,963 | 146 · 0,973 | 105 · 0,967 |
| card 960 | 109 · 0,973 | 93 · 0,976 | 67 · 0,971 |
| card 640 | 56 · 0,968 | 50 · 0,975 | 38 · 0,971 |
| lavoro-11 (fitto) 800 | 211 · 0,949 | 234 · 0,977 | 186 · 0,968 |
| lavoro-2 (liscio) 800 | 90 · 0,969 | 62 · 0,957 | 41 · 0,951 |

- WebP guadagna poco e non sempre su mozjpeg (meglio sulla hero, peggio su lavoro-11 a 1200: q70 400 KB ·
  0,971 contro JPEG q75 393 KB · 0,979); AVIF pesa il 25-40 % in meno di JPEG a SSIM simile (card 960: 67 contro
  109 KB).
- Sulle foto reali a texture fine (fughe, cementine, intonaco) AVIF q55 perde più di JPEG: la qualità va
  tarata per origine (C1).
- Tempi AVIF: effort 4 (default) hero 1920 1,5 s, effort 2 0,24 s a peso simile (230 vs 242 KB).
- Ricetta completa su Cavaliere (18 foto, scala §4.1, AVIF q55 effort 4 + JPEG q80): **26 s a freddo** su 10
  core; su disco 6,0 MB AVIF + 8,3 MB JPEG.
- Mark alto 144 px: PNG lossless 45 KB, PNG a palette 15 KB, AVIF 9,5 KB (oggi 114 KB).

### 2.7 Spike nello scratchpad (copie di `site-renderer` da `git archive HEAD`, `node_modules` in symlink, cache Astro/Vite dentro le copie)

| # | Prova | Esito |
|---|---|---|
| S1 | `Foto.astro` + `media.ts` al posto delle `<img>` di Hero, Services, Gallery; regola `picture{display:contents}`; **nessun manifest**; build del golden e di Cavaliere con `SITE_URL` | 4 pagine × 2 casi: **HTML identico a meno del nome hash del CSS**; il CSS cambia solo per **una regola aggiunta** (`picture{display:contents}`) |
| S2 | Stessa build **con manifest** (varianti di §2.6 in `/media/<slug>/v/`) contro quella di S1 con gli originali | a 390@3×, 768@2×, 1280, 1920: **box di tutte le immagini, delle sezioni e altezza pagina identici**; hero e card: pixel con scarto > 24 ≤ 0,06 % |
| S3 | Galleria di S2 con un solo `sizes` approssimato (`(max-width:1023px) 50vw, 400px`) | 2-3 % di pixel con scarto: a 1280 una cella da 600 px riceve la variante da 400, **morbidezza visibile** sulle cementine → servono `sizes` per cella |
| S4 | Primo caricamento con manifest (390@3×) | **945 KB, 10 richieste** (contro 3 540 KB, 11): hero AVIF 312 KB (q62), card 50-85 KB, mark ancora 114 KB |
| S5 | LCP con throttling DevTools e testo compresso | senza varianti: LCP = foto hero a 10,7 s. Con `srcset`: LCP = sottotitolo della hero a ~0,65 s e **la foto non compare come candidata** (anche senza `<picture>` e senza `display:contents`); con `<img src>` senza `srcset` la foto torna candidata. Da capire con Lighthouse vero (§8.3): il LCP si misura, non si deduce |

## 3. Decisione: fase deterministica con sharp orchestrata dall'editor, non la pipeline di Astro

| Criterio | Pipeline di Astro (`<Picture>`, `astro:assets`) | Fase deterministica (script del renderer spawnato da `lib/build.ts`) |
|---|---|---|
| Build dei clienti in `out/` | le immagini in `public/` **non vengono ottimizzate** (docs Astro): servirebbe copiare `out/<slug>/img` dentro `src/` e risolvere i `src` di `site.json` con `import.meta.glob`, più una cartella nuova da ignorare in git | lavora su `public/media/<slug>/` che `build.ts` già riempie; `site.json` e assembler invariati |
| URL degli originali | l'uscita va in `_astro/<nome>_<hash>.<fmt>` e l'originale non referenziato viene cancellato: `og:image` (Base.astro) e `image` del JSON-LD (T1a) perderebbero il file | gli originali restano in `/media/<slug>/`; le varianti accanto, in `/media/<slug>/v/` |
| Cache delle varianti | `node_modules/.astro/assets`, chiave sul contenuto (sicura) | `node_modules/.cache/media-varianti/`, chiave = sha256 della sorgente + ricetta: sicura e indipendente dagli aggiornamenti di Astro |
| Controllo dell'encoder | il servizio sharp di Astro passa solo `quality` (niente mozjpeg, niente effort AVIF) | mozjpeg, effort, qualità per origine della foto: le leve di §2.6 |
| Tempi | la generazione dentro `astro build` (timeout 180 s), effort AVIF fisso | fase propria con timeout suo; a caldo < 1 s |
| Anteprime e VRT | il golden usa URL Unsplash remoti: servirebbe `image.remotePatterns`, quindi rete in build e baseline da rifare, oppure un doppio percorso | nessun manifest nelle anteprime: `/anteprima/*` resta identica da sola, baseline intatte |
| Servizio spento | `<Picture>` da rendere condizionale comunque | provato in S1: HTML identico, un solo `picture{display:contents}` aggiunto al CSS |

**Scelta: fase deterministica.** Sta nel solco di `assemble-site.ts`/`validate-site.ts` (script del renderer,
`io.script` dall'editor) e del file via env di T1a. `sharp` è già in `site-renderer/node_modules` come
dipendenza opzionale di Astro: si dichiara in `package.json` alla stessa versione, senza nuovi download.

## 4. Progetto

### 4.1 Ricetta delle varianti (`scripts/media-varianti.ts`)

- **Ingressi**: `out/<slug>/site.json` (dopo assemble, patch logo e validate) e `public/media/<slug>/`. Si
  visitano tutte le chiavi `src` di `site.json` che iniziano con `/media/<slug>/` (sezioni, `brand.logo`,
  `brand.mark`). Remote, favicon e file non raster non generano varianti; gli SVG danno solo `w`/`h`.
- **Formati**: `<source type="image/avif">` + fallback JPEG mozjpeg nell'`<img>`. Niente WebP (§2.6). AVIF si
  vede su Chrome 85+, Firefox 93+, Safari 16.4+; gli altri ricevono il JPEG ridimensionato, già 3-5 volte
  più leggero di oggi.
- **Larghezze**: una sola scala per tutte le foto, **400, 640, 960, 1280, 1920**, tagliata alla larghezza della
  sorgente, più la larghezza della sorgente se non è un gradino (card 400/640/960/1216, lavori 400/640/960/1200,
  hero 400→1920). Mai ingrandire. La scala resta unica; `sizes` per uso vive nei componenti (§4.3).
- **Logo e mark raster**: una variante alta 144 px (3× i 48 px del header), AVIF + PNG lossless (C4 valuta
  la palette).
- **Qualità iniziale** (da tarare in C1): AVIF q55, JPEG q80 mozjpeg; effort AVIF da tarare (C2).
- **Metadati**: sharp non copia EXIF/XMP/ICC nelle uscite (colore convertito in sRGB).
- **Nomi**: `/media/<slug>/v/<nome>.<sha8>-<w>.<avif|jpg>` (`sha8` = sha256 dei byte della sorgente): una foto
  rigenerata con lo stesso nome cambia URL.
- **Uscita**: file in `public/media/<slug>/v/` (li copia Astro, li cancella la pulizia iniziale di
  `build.ts`) e manifest in `out/<slug>/traffico/media-varianti.json`:

```json
{
  "ricetta": "<hash della ricetta + versione di sharp>",
  "immagini": {
    "/media/cavaliere-build-srls/hero.jpg": {
      "w": 1920, "h": 1088,
      "avif": [["/media/cavaliere-build-srls/v/hero.1a2b3c4d-400.avif", 400], "…"],
      "jpeg": [["/media/cavaliere-build-srls/v/hero.1a2b3c4d-400.jpg", 400], "…"]
    }
  }
}
```

- **Cache**: `site-renderer/node_modules/.cache/media-varianti/<sha256>-<ricetta>/`, scrittura atomica
  (file temporaneo + `rename`). Il mutex di `build.ts` serializza già le build.
  `ponytail:` nessuna pulizia della cache (~15 MB per versione di foto); si aggiunge quando il disco lo chiede.
- Errori (sorgente illeggibile, `src` che punta a un file assente) → exit 1 con una riga leggibile su stderr.

### 4.2 Renderer

- **`src/lib/media.ts`**: legge `MEDIA_VARIANTI_JSON` (path assoluto) una volta, come `datiStrutturati` in
  `loadSite.ts`; assente = `null`. Esporta `SIZES` per uso e `sizesGalleria(spanSotto, spanLg)`.
- **`src/components/Foto.astro`** (props `src`, `alt`, `class`, `loading`, `fetchpriority`, `uso`):
  - senza voce nel manifest → `<img src alt class loading fetchpriority>`, gli stessi attributi nello stesso
    ordine di oggi (S1);
  - con voce → `<picture><source type="image/avif" srcset sizes><img src=<JPEG ≤ 1280> srcset sizes width height
    alt class loading decoding fetchpriority></picture>`, con `decoding="async"` solo sulle `lazy`. La hero
    resta `eager` + `fetchpriority="high"`, senza `decoding`. Niente `<link rel=preload>`: l'`<img>` è
    nell'HTML iniziale.
- **`global.css`**: `@layer base { picture { display: contents; } }`. `<img>` resta figlia diretta di flex,
  grid e `figure` agli effetti del layout (S2); oggi nessuna pagina ha `<picture>`.
- `width`/`height` danno solo il rapporto: le classi esistenti (`h-full w-full`, `aspect-[4/3]`, `h-10 w-auto`)
  continuano a decidere il box (S2).

### 4.3 `sizes` per uso (valori iniziali dai box di §2.4; verificati in M2 con il controllo «sizes onesti», §8.2)

| Uso | Componente | `sizes` |
|---|---|---|
| `hero` (A, C, D: foto a tutta pagina con `object-cover`) | `Hero.astro`; T5a `HeroPagina.astro` | `(max-width: 1279px) 1170px, 100vw` (C3 lo confronta con `100vw`) |
| `hero-split` (B, colonna 6/12) | `Hero.astro` | `(max-width: 1023px) calc(100vw - 3rem), 600px` |
| `card` (griglia, compact) | `Services.astro`; T5a `SchedeLavori.astro` | `(max-width: 639px) calc(100vw - 3rem), (max-width: 1023px) calc(50vw - 2.75rem), 400px` |
| `card-riga` (variante list, 2fr/5fr) | `Services.astro` | `(max-width: 639px) calc(100vw - 3rem), 480px` |
| galleria, **per cella** | `Gallery.astro` (anche nella pagina cantiere di T5a) | da `spanFor(i)`: sotto lg `calc(100vw - 3rem)` a tutta riga o `calc(50vw - 2rem)`; da lg col-span 6/4/3 → `calc(50vw - 2.5rem)` / `calc(33vw - 2rem)` / `calc(25vw - 1.75rem)` fino a 1279, poi 600/400/300px |
| `evidenza` (7/12) | `FeatureHighlight.astro` | `(max-width: 1023px) calc(100vw - 3rem), 720px` |
| `processo` (max-w-md) | `ProcessSteps.astro` | `(max-width: 639px) calc(100vw - 8rem), 448px` |
| `logo` | `Header.astro`, `SubPage.astro` | variante unica, `sizes` = larghezza a 48 px di altezza |

Grammatica chiusa (la legge il budget): voci `(max-width: Npx) LUNGHEZZA` separate da virgola e una
`LUNGHEZZA` finale, dove LUNGHEZZA è `Npx`, `Nvw` o `calc(Nvw - Nrem)`.

### 4.4 Font

- **Nessuna modifica ai file né ai `@font-face`.** Sul filo la regola del brief vale già (§2.5): famiglie del
  preset, subset latin, un file variabile per tutti i pesi. Ridurre ancora (togliere l'asse `opsz` di Source
  Serif 4, sottoinsiemi di glifi) cambierebbe l'aspetto; togliere i blocchi degli altri preset dal CSS
  romperebbe il criterio «CSS solo additivo» per 1 KB gzip.
- `font-display: swap` resta (CLS misurato ~0).
- **Precaricamento** del file latin della famiglia dei titoli: solo se C5 lo giustifica. Nel caso, in
  `Base.astro`, solo con `MEDIA_VARIANTI_JSON` presente e senza font imposti dal cliente (`brand.fonts`).

### 4.5 Budget come gate (`scripts/budget-pagine.ts <dist>`)

Calcolo **statico e deterministico** su ogni `.html` della `dist` (anteprime già cancellate), per il
dispositivo di riferimento del profilo mobile di Lighthouse: **412 px, DPR 1,75**, pagina scorsa tutta.

- **Peso** = HTML gzip + CSS/JS locali collegati gzip + file latin delle famiglie titoli/testo del preset
  (`data-preset` → `presets/<p>.tokens.json` → `presets/fonts.gen.json`, contati una volta) + per ogni immagine
  il candidato scelto dal browser: il più piccolo con larghezza ≥ `sizes` × 1,75, altrimenti il più grande
  (AVIF se c'è `<source>`, altrimenti `srcset` dell'`<img>`, altrimenti `src`).
- **Richieste** = documento + fogli + script (gli esterni come Umami contano 1, peso 0) + font + immagini +
  favicon.
- **Errori tecnici** (sempre bloccanti): `<img>` senza `width` o `height`; `<img>` raster di `/media/` senza
  `srcset`; `sizes` fuori grammatica; più di un `fetchpriority="high"` per pagina, o insieme a
  `loading="lazy"`; file referenziato assente nella `dist`.
- **Soglie iniziali** (C6 le tara): per pagina **totale ≤ 1 100 KB, immagini ≤ 950 KB, richieste ≤ 30**. Stima
  per la home di Cavaliere con la ricetta di §4.1: ~860 KB, ~800 KB di immagini, 24 richieste.
- **Uscita**: una tabella per pagina nel log di build; se sfora, exit 1 e al massimo 3 righe su stderr
  (`io.script` le mostra così come sono nella scheda Build & Pubblica), per esempio:
  `Budget sforato su / : immagini 1 240 KB (max 950). Le più pesanti: lavoro-11 (1200w, 347 KB), hero (1920w, 242 KB), lavoro-7 (1200w, 301 KB).`
- Blocca la build (proposta; dubbio §11-2).

### 4.6 `site-factory-editor/lib/build.ts`

Due fasi, entrambe solo se `fondamenta` è non nullo (build completa, stessa regola di T1a):

1. **«pagine leggere (varianti immagini)»** dopo la fase «fondamenta SEO (dati strutturati)» e prima di
   `astro build`: `io.script` → `node --experimental-strip-types scripts/media-varianti.ts out/<slug>/site.json
   --media public/media/<slug> -o out/<slug>/traffico/media-varianti.json`, timeout 300 s; poi
   `MEDIA_VARIANTI_JSON` nell'env di `astro build`.
2. **«budget pagine»** dopo la pulizia delle pagine QA e **prima** di `cuociFondamenta`: una build fuori budget
   non scrive `traffico/lastmod.json`.

Niente di nuovo in `client.json`, in `deploy.ts` o nell'interlock: le varianti seguono le fondamenta e
`motivoRifiutoFondamenta` copre già attivazione e spegnimento. `sizeKb` resta il peso su disco (dubbio §11-6).

### 4.7 Criterio di sicurezza a servizio spento (decisione 1 di T5a)

(a) HTML identico a meno dei nomi hash dei file CSS/JS; (b) CSS che cambia solo per aggiunta (attesa: la
sola regola `picture`, più eventuali utility nate dalla scansione Tailwind dei file nuovi, elencate e
giustificate); (c) baseline VRT esistenti identiche al pixel; (d) nessuna differenza in `robots.txt`,
`_headers`, `media/`, `fonts/`, nessun file in più. Lato editor: a servizio spento non gira nessuna fase
nuova, nessuna cartella `v/` né manifest.

A servizio acceso, in più: box delle immagini identici tra originali e varianti (7 preset × 4 viewport);
`hashPagina` (T1a) invariato tra build senza e con varianti, così `lastmod` non cambia.

## 5. File (elenco esatto)

Modificati:

1. `site-renderer/src/sections/Hero.astro` (A/C/D `hero`, B `hero-split`)
2. `site-renderer/src/sections/Services.astro` (`card`, `card-riga`)
3. `site-renderer/src/sections/Gallery.astro` (`sizes` per cella da `spanFor`)
4. `site-renderer/src/sections/FeatureHighlight.astro`
5. `site-renderer/src/sections/ProcessSteps.astro`
6. `site-renderer/src/sections/Header.astro` (logo e mark)
7. `site-renderer/src/layouts/SubPage.astro` (logo e mark delle sottopagine)
8. `site-renderer/src/styles/global.css` (una regola)
9. `site-renderer/src/layouts/Base.astro` — **solo se C5 adotta il precaricamento del font**
10. `site-renderer/package.json`, `site-renderer/package-lock.json` (`sharp` 0.34.5 dichiarato; `npm install
    --save-exact --offline sharp@0.34.5`; se l'offline fallisce ci si ferma a chiedere)
11. `site-renderer/DESIGN.md` (una riga in «Anti-slop»: le foto passano da `Foto.astro` con l'uso giusto)
12. `site-factory-editor/lib/build.ts`
13. `docs/traffico/piano-T1b.md`, `docs/traffico/README.md` (§7 e la riga «font ~1 MB» di §2),
    `docs/handoff-fase-c.md`, `docs/DEBUG.md`

Nuovi:

14. `site-renderer/src/components/Foto.astro`
15. `site-renderer/src/lib/media.ts`
16. `site-renderer/scripts/media-varianti.ts`
17. `site-renderer/scripts/budget-pagine.ts`
18. `site-renderer/scripts/test-media.ts` (banco senza rete)

Condizionati all'ordine con T5a (dubbio §11-4): se T5a è chiuso prima di T1b, anche
`site-renderer/src/pagine/HeroPagina.astro` e `site-renderer/src/pagine/SchedeLavori.astro`.

Non toccati: `schema.ts`, `slots.json`, `blueprint.json`, `registry.ts`, `loadSite.ts`, `tests/*.spec.ts` e
baseline, `playwright.config.ts`, `lib/deploy.ts`, `lib/fondamenta.ts`, `lib/schemas.ts`, UI dell'editor,
`generate-image.mjs`, `lib/lavori.ts`, `public/fonts`, `presets/*`, `CLAUDE.md`.

## 6. Perimetro per `.claude/scope.json` (primo atto della fase 2, a perimetro T6a svuotato)

```json
{
  "task": "T1b: pagine leggere (docs/traffico/piano-T1b.md)",
  "perimetro": [
    "site-renderer/src/components/Foto.astro",
    "site-renderer/src/lib/media.ts",
    "site-renderer/src/sections/Hero.astro",
    "site-renderer/src/sections/Services.astro",
    "site-renderer/src/sections/Gallery.astro",
    "site-renderer/src/sections/FeatureHighlight.astro",
    "site-renderer/src/sections/ProcessSteps.astro",
    "site-renderer/src/sections/Header.astro",
    "site-renderer/src/layouts/SubPage.astro",
    "site-renderer/src/layouts/Base.astro",
    "site-renderer/src/styles/global.css",
    "site-renderer/scripts/media-varianti.ts",
    "site-renderer/scripts/budget-pagine.ts",
    "site-renderer/scripts/test-media.ts",
    "site-renderer/package.json",
    "site-renderer/package-lock.json",
    "site-renderer/DESIGN.md",
    "site-factory-editor/lib/build.ts",
    "docs/traffico/**",
    "docs/handoff-fase-c.md",
    "docs/DEBUG.md"
  ]
}
```

`Base.astro` è nel perimetro per C5: se il precaricamento non passa, a fine task risulta non toccato. Con T5a
già chiuso si aggiungono i due file di `src/pagine/` **prima** di iniziare, con l'ok dell'orchestratore.

## 7. Milestone (ogni verifica passa prima della successiva; commit con path espliciti + push)

| M | Contenuto | Verifica |
|---|---|---|
| **M0** allestimento | `git log --oneline -5`, `git status --short`, `scope.json` libero → scritto; `BASE` = commit corrente annotato qui; fixture `out/zz-test-t1b` come F1-F5 di T1a (senza `umamiWebsiteId`, `siteUrl`, `integrazioni`, `deploy`, `infra`; `dominio: "zz-test-t1b.invalid"`; `grep -c` di id Umami e `cavalierebuild.it` = 0); build «prima» ×2 | `diff -r prima-A prima-B` vuoto (determinismo) |
| **M1** componente senza manifest | `Foto.astro`, `media.ts` (`SIZES`, lettura env), regola in `global.css`, le 7 sostituzioni | §8.1 completo; `npm run build`; `npm run check` (solo l'errore noto di `registry.ts`); `npm run test:visual` **senza** update verde. **Commit 1** |
| **M2** varianti | `media-varianti.ts` (scala, nomi, cache, manifest), parte varianti di `test-media.ts`, `sharp` in `package.json` | banco verde; build del renderer della fixture con manifest (scratchpad): ogni `<img>` di `/media/` ha `srcset`, `width`, `height`; §8.2 (box, sizes onesti, `hashPagina`); seconda esecuzione tutta dalla cache (< 2 s); foto modificata → `sha8` nuovo solo per lei |
| **M3** budget e build | `budget-pagine.ts` + casi nel banco; `lib/build.ts` | banco verde; editor `npx tsc --noEmit`, `npm run build`, banchi `scripts/test-*.ts` esistenti verdi; E2E §8.5. **Commit 2** (M2+M3) |
| **M4** calibrazione (fase 3) | C1-C6 | sezione «Calibrazione»; schermate a Mattia; eventuale `Base.astro`. **Commit 3** |
| **M5** test e chiusura | §8 completo, revisione del diff riga per riga, file toccati vs §5, `scope.json` svuotato, README §7, handoff, DEBUG | sezione «Verifica». **Commit 4** |

Calibrazione (fase 3), da scrivere in «Calibrazione»:

- **Decisione di Mattia (14/09 sera), vale sopra C1, C3, C4 e il controllo «sizes onesti» del §8.2**: qualità
  uguale ai siti dei clienti di oggi anche con lo zoom, su PC, telefono e tablet; candidato scelto ≥ 2 × resa
  × DPR (fino all'originale); dettagli in `decisioni-piani.md`, T1b punto 8.
- **C1 qualità**: AVIF q 50/55/62/70 e JPEG q 75/80/85 su foto generate (hero, card) e reali (le 12 di
  Cavaliere + quelle di Mattia Saggin), SSIM approssimato come filtro e poi schermate a confronto
  (originale / variante) a 390@3× e 1280 per le celle con texture fine. Soglia proposta: nessuna differenza
  visibile a occhio a 100 %; possibili qualità diverse per foto reali e generate.
- **C2 tempi**: effort AVIF 2 vs 4 (peso e SSIM a pari q); tempo a freddo e a caldo sui 3 clienti.
- **C3 hero da mobile**: `sizes` onesto (sceglie 1920) vs `100vw` (sceglie 1280): schermate a 390@3× dei 7
  preset con overlay, LCP con Lighthouse. Decide Mattia sulle schermate.
- **C4 logo**: PNG lossless vs palette vs AVIF su mark e lockup dei 3 clienti (bordi, sfumature oro).
- **C5 font**: Lighthouse ×5 (mediana) con e senza precaricamento, su home con foto e su una sottopagina senza
  foto; si adotta solo con FCP o LCP migliori di ≥ 100 ms e nessun peggioramento della home.
- **C6 soglie**: budget misurato sui 3 clienti (build del renderer con manifest nello scratchpad) e sulle
  pagine T5a se esistono; soglia = massimo misurato + ~20 %, arrotondata; eventuale riduzione della scala JPEG
  (disco).

## 8. Test e verifica

`export PATH="$HOME/.local/bin:$PATH"`; `$T` = cartella dello scratchpad.

### 8.1 Identità a servizio spento (gate di M1 e di ogni commit che tocca il renderer)

- Sorgenti `git archive $BASE site-renderer` e `git archive HEAD site-renderer` in `$T/prima` e `$T/dopo`,
  `node_modules` in symlink, `cacheDir` e `vite.cacheDir` dentro le copie (così la cache del repo non si
  tocca), come in §2.7.
- Ingressi: golden e copie di `site.json` dei 3 clienti. Varianti: (a) `SITE_URL` + `DATI_STRUTTURATI_JSON` +
  `FORM_ACTION`/`UMAMI_*` fittizi; (b) `NOINDEX=1`; (c) nessuna env. Mai `MEDIA_VARIANTI_JSON`.
- `astro build` → `rm -rf anteprima anteprima-componenti` → per ogni file: identico dopo aver sostituito i nomi
  `_astro/*.<hash>.(css|js)`; elenco dei file identico; `media/`, `fonts/`, `robots.txt` identici.
- CSS additivo: script nello scratchpad che analizza i due CSS con `lightningcss` (già in `node_modules`) e
  verifica che ogni regola di «prima» esista uguale in «dopo»; stampa le regole aggiunte.
- Con le cartelle QA: `/anteprima/*` e `/anteprima-componenti/*` identiche (nessun manifest).
- `npm run test:visual` **senza** `--update-snapshots`: tutto verde;
  `git status --short site-renderer/tests/visual.spec.ts-snapshots` vuoto.

### 8.2 Servizio acceso sulla fixture (renderer, nello scratchpad)

- Stesso `site.json` della fixture con `brand.preset` forzato su ciascuno dei 7 preset: build senza e con
  manifest (media e varianti copiati nelle due `dist`).
- **Box identici** (`confronta.cjs` esteso): immagini, sezioni e altezza pagina a 390@3×, 768@2×, 1280, 1920.
  Errore a qualunque differenza.
- **Sizes onesti** (`box.cjs` esteso): per ogni immagine e viewport, larghezza del candidato scelto ≥ 2 ×
  larghezza resa × DPR (o l'originale) e non oltre il gradino successivo (decisione di Mattia,
  `decisioni-piani.md` T1b punto 8). Viewport: 390@3, 412@1,75, 768@2, 1280@1, 1280@2, 1920@1. Le eccezioni si
  scrivono in «Verifica».
- **Pixel**: scarto per sezione tra originali e varianti con le soglie decise in C1; schermate affiancate in
  `$T/schermate/` per la revisione di Mattia (hero, servizi, lavori; 390 e 1280; 7 preset).
- **Fondamenta**: script che importa `site-factory-editor/lib/fondamenta.ts` per path assoluto:
  `hashPagina(senza) === hashPagina(con)` per ogni pagina; `controllaPagina` senza errori nuovi.
- **Accessibilità**: axe (`@axe-core/playwright`) sulla home con varianti a 390 e 1280 nei 7 preset, nessuna
  violazione nuova rispetto alla build senza.
- **Budget**: `budget-pagine.ts` sulla `dist` con varianti → ok; sulla `dist` senza varianti → errori tecnici
  attesi (immagini senza dimensioni); il testo dell'errore letto a voce alta resta comprensibile.

### 8.3 Prestazioni

- **Lighthouse locale** (`npx lighthouse@12` nello scratchpad con `CHROME_PATH` = Chromium di Playwright:
  **richiede un download, da approvare**, dubbio §11-5), profilo mobile di default, 5 esecuzioni e mediana, su
  server statico nello scratchpad che comprime il testo come Cloudflare e serve `image/avif`. Home e
  `/privacy/` della fixture: prima (servizio spento) e dopo. **Uscita richiesta: Performance ≥ 90 sulla home.**
  Si annotano LCP (elemento e tempo), CLS, FCP, TBT e peso totale. Nessun deploy su domini di clienti; la
  preview su un worker `zz-test-t1b` workers.dev solo con ok e poi cancellata (precedente T1a-6).
- Misura di rete `misura.cjs` (390@3× e 412@1,75×) prima/dopo, con e senza throttling, per il confronto con §2.3.

### 8.4 Banchi e suite

- `node --experimental-strip-types scripts/test-media.ts` (senza rete): scala (sorgente 1216 → 400/640/960/1216;
  720 → 400/640/720; 300 → 300; mai ingrandire); nomi con `sha8`; chiave di cache che cambia con byte e
  ricetta; manifest da una piccola immagine sintetica creata con sharp in una cartella temporanea (JPEG, PNG con
  alfa, SVG → solo `w`/`h`); `src` assente → errore; `valutaSizes` su tutti i valori di §4.3 a 412 px e sulle
  forme vietate; scelta del candidato; budget su una `dist` sintetica: sotto soglia, sopra soglia (messaggio con
  le 3 immagini più pesanti), `<img>` senza dimensioni, `/media` senza `srcset`, due `fetchpriority="high"`,
  file mancante.
- Renderer: `npm run build`, `npm run check`, validatore su golden e 3 clienti, `npm run test:visual`,
  `npm run test:a11y`, `npm run gate:tokens`, `npm run gate:overflow`.
- Editor: `npx tsc --noEmit`, `npm run build`, `scripts/test-fondamenta.ts` e gli altri `scripts/test-*.ts`.

### 8.5 E2E sulla fixture `out/zz-test-t1b` (via editor, route della scheda Build)

- E1 **Spento**: build → `diff -r` con `prima-A` vuoto a meno del nome hash del CSS in `_astro/` e nell'HTML;
  nessun `traffico/media-varianti.json`, nessuna `media/*/v/`.
- E2 **Attivo** (`POST /api/clients/zz-test-t1b/traffico {"servizio":"sito","stato":"attivo"}`) → build: nel log
  le fasi «pagine leggere» e «budget pagine» con la tabella; `dist/media/zz-test-t1b/v/` con le varianti;
  `sitemap.xml` e `lastmod` come senza T1b (hash invariato); `steps.build.fondamenta` presente.
- E3 **Stabilità**: seconda build → `diff -r` vuoto, fase varianti tutta da cache.
- E4 **Foto cambiata**: sostituzione di `img/card-2.jpg` con un'altra foto della fixture → cambiano solo le
  varianti e i riferimenti di `card-2`.
- E5 **Budget sforato**: soglia abbassata in una copia di `budget-pagine.ts` nello scratchpad, eseguita sulla
  `dist` di E2 → exit 1, 3 righe leggibili. Nessuna modifica dei file del repo per il test.
- E6 **Sospeso** → build → identica a E3.
- E7 **Pulizia**: `DELETE /api/clients/zz-test-t1b` col nome esatto (cancella il sito Umami di prova creato alla
  prima build, precedente T1a F14); `ls out/` = i 3 clienti.

## 9. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| HTML dei siti a servizio spento che cambia (attributi, spazi del componente) | S1 lo esclude su 3 sezioni; gate §8.1 a M1 su tutte e 7 le sostituzioni, 4 ingressi × 3 env |
| Layout diverso con `<picture>` (flex, grid, `h-full`) | `picture{display:contents}`; box identici 7 preset × 4 viewport (S2 già verde su meridian) |
| Perdita di qualità visibile (AVIF liscia fughe, cementine, intonaco) | C1 per origine della foto; schermate affiancate a Mattia; qualità separate per foto reali se serve |
| Foto morbide per `sizes` sottostimati (visto in S3) | `sizes` per cella nella galleria; controllo «sizes onesti» §8.2 a ogni viewport |
| Hero da mobile: peso (LCP) contro nitidezza | C3 con schermate e Lighthouse; decide Mattia |
| LCP che passa dalla foto al testo con `srcset` (S5) | si misura con Lighthouse (§8.3) e si annota l'elemento LCP; nessuna scelta fatta per spostare la metrica |
| Cache che serve una foto vecchia | chiave = sha256 dei byte + ricetta; `sha8` nel nome del file; E4 |
| Build a freddo più lenta (~26 s su Cavaliere) | cache; C2 (effort 2 ≈ 6× più veloce); timeout di fase 300 s; la catena demo (servizio spento) non cambia |
| `sharp` binario rotto dopo un aggiornamento di Astro | dichiarato alla versione esatta; errore leggibile della fase; i siti a servizio spento non lo usano |
| Utility Tailwind nate da parole nei file nuovi (Tailwind v4 scansiona tutto ciò che git non ignora) | criterio (b) le elenca; testi e commenti dei file nuovi senza nomi di utility |
| Budget con falsi positivi o soglie arbitrarie | C6 sui 3 clienti; messaggio con le immagini più pesanti; dubbio blocco/avviso |
| `dist` su disco ~2,5× (originali + varianti AVIF + JPEG) e sync su Drive | Workers carica solo gli asset nuovi (per hash), limiti lontani (20 000 file, 25 MiB per file); C6 può ridurre la scala JPEG; `sizeKb` fuorviante (dubbio §11-6) |
| Stessi file di T5a (`Services`, `Gallery`, `SubPage`, `Base`, `global.css`) | mai in parallelo; ordine deciso dall'orchestratore (dubbio §11-4) |
| Safari/iOS non verificabile in locale (c'è solo Chromium di Playwright) | fallback JPEG via `<source type>`, comportamento standard; verifica su iPhone reale di Mattia sulla preview, se approvata |
| Immagini remote in un `site.json` con servizio attivo | errore tecnico del budget («immagine senza dimensioni»), non una build silenziosamente pesante |
| Residui fuori perimetro: `og:image` = hero originale da 1 MB (anteprime WhatsApp), `favicon.svg` 148 KB | annotati in handoff; eventuale piano a parte (dubbio §11-7) |

## 10. Domanda aperta a Mattia: pagine leggere per tutti i siti o dietro l'interruttore?

Finché Mattia non decide: **dietro l'interruttore** (servizio Sito attivo o sospeso), come chiede il brief.
Tecnicamente cambia una sola condizione in `lib/build.ts` (le due fasi girano con `fondamenta` o con ogni
build completa); il resto del piano è identico.

| | Tutti i siti (demo comprese) | Dietro l'interruttore |
|---|---|---|
| Pro | la qualità del prodotto non dipende da un servizio in più (regola 1); **la demo**, che il potenziale cliente apre dal telefono, pesa ~1 MB invece di 3,5; un solo percorso di resa in produzione da mantenere e testare; ogni cliente ha subito un sito più veloce | rispetta la decisione 3 (tutto attivabile); i siti già online e le demo non cambiano finché non si sceglie; rollout graduale partendo da Cavaliere; nessun tempo di build in più sulla catena demo |
| Contro | al primo rebuild cambiano HTML e asset di tutti i siti online: serve una revisione visiva per cliente; la catena demo si allunga di ~5-25 s a freddo per cliente; un problema di `sharp` blocca tutte le build; `dist` più pesanti per tutti | due percorsi di resa da mantenere per sempre (VRT e gate per entrambi); demo e siti senza servizio restano lenti da mobile; il valore «sito veloce» diventa una voce del servizio invece che uno standard |

## 11. Dubbi che richiedono una decisione (proposta tra parentesi)

1. **Ambito** (Mattia): §10 (**interruttore finché non decide**).
2. **Budget sforato**: blocco della build o avviso (**blocco**: è un errore tecnico come i controlli di
   T1a; soglie con margine e messaggio che dice cosa alleggerire).
3. **Formati**: AVIF + JPEG, niente WebP (**sì**, §2.6).
4. **Ordine con T5a** (stessi 5 file): (**T1b prima di T5a M2**; `decisioni-piani.md` annota che le immagini
   dei componenti nuovi di T5a passano da `Foto.astro` con l'uso di §4.3. Se T5a va prima, T1b aggiunge
   `HeroPagina.astro` e `SchedeLavori.astro` al perimetro prima di iniziare.)
5. **Lighthouse via `npx`** nello scratchpad (download di un pacchetto npm): permesso (**sì**, nessuna
   dipendenza nuova nel repo); in alternativa preview su worker `zz-test-t1b` + PageSpeed Insights quando la
   chiave Google esisterà (S0).
6. **`sizeKb` nella scheda Build** crescerà (originali + varianti): lasciarlo com'è, peso su disco (**sì in
   T1b**; se serve, un piano UI mostra il peso della pagina più pesante accanto).
7. **`og:image` e favicon pesanti**: fuori da T1b (**sì**, annotati in handoff).
8. **VRT a servizio acceso non versionata** (le foto dei clienti non vanno in git, le fixture Unsplash
   richiederebbero download): verifica nello scratchpad + revisione di Mattia (**sì**).
9. **Precaricamento del font** solo se C5 lo giustifica (**sì**).

## Calibrazione

## Verifica
