# Piano T6a — Fatti comunali da open data

Stato: **chiuso il 2026-09-14 (fasi 2-5), dataset dichiarato incompleto** finché `esploradati.istat.it`
non risponde: edifici 2011 e famiglie 2021 mancano (vedi «Calibrazione» e «Verifica», punti aperti). Commit
`14f2fe3`, `8561389`, `1f66586`, `c22a76e`, `866e6f6`, `4997dad` + chiusura documenti. Piano del 2026-09-14. Fonti: `docs/traffico/README.md`
(§1-§5), `docs/traffico/brief-T6a.md`, `~/knowledge/seo/ricerche-2026-09-14/w2-3-opendata.md` e i tre script di
prova, `docs/ricerca-traffico-2026-09.md` §6.3, `site-intake/data-src/comuni.json` e `scripts/build-comuni.mjs`,
i due `package.json`, `site-factory-editor/scripts/test-portafoglio.ts`. Verifiche di sola lettura fatte oggi
su tutte le fonti (download piccoli nello scratchpad, prototipi usa e getta di centroidi e parser DPR 412).

## 1. Contesto

Obiettivo: un dataset versionato di **fatti veri, datati e citabili per ogni comune italiano**, letto offline
dalla build (pagine-comune T6b, «Zone servite» T5a/T5b) e dalla pipeline copy. Ogni fatto porta valore,
unità, riferimento temporale, fonte, URL, licenza e dicitura. Nessun numero stimato; se manca, il fatto
non esiste. T6a non tocca editor, build né deploy: produce dati, uno script di aggiornamento, un modulo di
lettura e un banco.

**Precondizione**: `.claude/scope.json` oggi contiene il perimetro di T0. Il file è unico per il repo: la
fase 2 di T6a parte quando T0 lo svuota (o l'orchestratore decide come gestire perimetri paralleli). I file
di T6a non si sovrappongono a quelli di T0/T1a (solo i documenti comuni `README.md`, `handoff-fase-c.md`,
`DEBUG.md`, toccati a fine piano).

Fatti rilevati oggi, che cambiano la prova pratica del mattino:

- **I comuni oggi sono 7.896 al 1/1/2026** (confini Istat) e **7.894 dal 21/02/2026** (fusione in provincia
  di Vicenza, pagina Istat dei codici). `site-intake/data-src/comuni.json` ne ha **7.904 ed è vecchio**:
  contiene i codici sardi precedenti al **riordino delle province sarde del 1/1/2026** (≈377 comuni passati
  da 090/091/092/095/111 a 112-119, es. Alghero `090003` → `112001`) e i comuni fusi nel 2024. Il form
  (`build-comuni.mjs`) salva nome e sigla, **non il codice Istat**. Tutte le fonti statistiche usano codici
  vecchi (POSAS 2025 e 2026, sismica: Alghero `090003`). Serve quindi una tabella di corrispondenza verso i
  codici 2026 e una ricerca per nome.
- **`esploradati.istat.it` non risponde** (timeout alle 14:50-15:05 su tre tentativi, IPv4; la ricerca lo
  aveva visto su alle 10:08 e giù alle 10:33). Da lì arrivano i due bulk del Censimento 2011 e l'SDMX delle
  famiglie 2021: non riverificabili oggi (milestone M0).
- **La popolazione non serve più via SDMX live**: il bulk `demo.istat.it` POSAS 2025 riproduce identici i
  5 valori della ricerca (46.994 · 49.136 · 8.303 · 123.032 · 85.652, riga «Età 999»).
- **La classificazione sismica si aggiorna allo stesso URL**: `last-modified` 02/09/2026 con il nome
  «maggio 2025», 7.896 righe con i codici sardi precedenti al 2026 (i 7.887 della ricerca erano gli
  abbinamenti con l'elenco da 7.904). I 5 valori restano (3 · 2 · 2 · 3 · 2). I valori non sono solo 1-4:
  ci sono sottozone regionali (`2A`, `3S`, `2A-3A-3B` per Roma).
- **DPR 412/93**: i tre frammenti GU danno ancora 8.088 righe, 47 con zeri resi «O»; i 5 comuni sono
  riprodotti. **3 righe hanno zona incoerente con i gradi giorno** delle soglie dell'art. 2 c. 1 (Cunico
  «F 2698», Caprese Michelangelo «E 1641», Mongiana «E 1779»: OCR o originale, non decidibile). 11 nomi
  compaiono due volte (Samone, Calliano, Livo, Castro, Valverde, San Teodoro, Cuneo…).
- **Art. 2 DPR 412/93** (verificato con `cite_law`): l'allegato A «può essere modificato ed integrato, con
  decreto del Ministro… anche in relazione all'istituzione di nuovi comuni» (c. 2); i comuni non presenti
  adottano i gradi giorno con **provvedimento del Sindaco** (c. 3); porzioni di territorio possono avere zona
  diversa (c. 4). Il fatto riguarda quindi la **casa comunale** secondo l'allegato A, non l'intero territorio.
- **DPR 74/2013 art. 4 c. 2** (verificato): periodi e ore di accensione per zona. Nota Normattiva: il D.Lgs.
  48/2020 art. 17 c. 4 lo abroga all'entrata in vigore del decreto previsto dall'art. 4 c. 1-quinquies del
  D.Lgs. 192/2005. Va ricontrollato a ogni aggiornamento.
- **OSRM demo**: la policy limita l'uso a «reasonable, non-commercial use-cases», 1 richiesta al secondo,
  nessuna garanzia. Un'agenzia è uso commerciale: **escluso**.
- Prototipo centroidi sul file Istat 2026 generalizzato: 7.896 poligoni, **166 centroidi d'area cadono fuori
  dal proprio comune** (forme concave o in più parti) → serve il punto interno. Distanza tra centroide e
  municipio: Monza 0,15 km, Cologno 0,55, Vicenza 0,56, Sandrigo 1,1, Treviso 1,25, Roma 2,0, San Severo 4,9.
  Linea d'aria Cologno→Monza 5,8 km (OSRM su strada: 8,1); Sandrigo→Vicenza 13,1 (strada: 19,4).
- Variazioni Istat 1991-2024 (CSV): dal 2011 **124 comuni nuovi da fusione**, **18 incorporazioni**, **81
  comuni con scambi parziali di territorio**. Il CSV ha campi tra virgolette su più righe (Grana Monferrato)
  e codifica latin1; l'unico file 2025 (`…Anni-1991-2025.xlsx`) contiene solo tavole di conteggio.
- `Intl.NumberFormat("it-IT")` scrive «8303» (raggruppamento minimo a 2 cifre di CLDR): per «8.303» serve
  `useGrouping: "always"`.
- Nessun import da `site-renderer/src` nell'editor: l'editor usa il renderer lanciandone gli script per path
  (`lib/paths.ts` → `SITE_RENDERER`). `npm run check` del renderer tipizza anche `scripts/**` (include `**/*`).

## 2. Fonti confermate

Licenze: **Istat** — «Salvo diversa indicazione, tutti i contenuti pubblicati su questo sito sono soggetti
alla licenza Creative Commons – Attribuzione – versione 4.0», con obbligo di menzione, link alla licenza e
**indicazione delle modifiche** (istat.it/note-legali). **Protezione Civile** — CC BY 4.0 con dicitura
obbligatoria «Fonte: Dipartimento della Protezione Civile-Presidenza del Consiglio dei Ministri»
(protezionecivile.gov.it/it/approfondimento/note-legali-0). **Testi normativi** — art. 5 L. 633/1941
(verificato): la legge sul diritto d'autore «non si applica ai testi degli atti ufficiali».

| Id fonte | Cosa | URL esatto | Formato | Aggiornamento | Dimensione | Stato oggi |
|---|---|---|---|---|---|---|
| `istat-confini-2026` | Confini comunali e provinciali al 1/1/2026 (anagrafica: codice, nome, sigla; centroidi) | `https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip` | ZIP → shapefile WGS84 UTM 32N (`Com01012026_g_WGS84.shp/.dbf`, `ProvCM…dbf` con `SIGLA`), DBF in UTF-8 | annuale (1/1), pubblicato a marzo | 10,5 MB (Com .shp 12,7 MB) | **scaricato e parsato**: 7.896 comuni, campi `PRO_COM_T`, `COMUNE`, `COMUNE_A`, `COD_UTS` |
| `istat-variazioni` | Variazioni amministrative e territoriali dal 1991 | `https://www.istat.it/storage/codici-unita-amministrative/Variazioni-amministrative-e-territoriali-dal-1991.zip` | ZIP → CSV `;` latin1 CRLF, campi multiriga | a gennaio (ultima: 09/01/2025, righe fino al 10/12/2024) | 228 KB | **scaricato e parsato**: tipi CS, ES, AQES, AQ, CE, CECS, AP, CD |
| `istat-sardegna-2026` | Codici statistici delle unità amministrative della Sardegna, in vigore dal 1/1/2026 (codice nuovo ↔ precedente) | `https://www.istat.it/wp-content/uploads/2024/09/Codici-statistici-e-denominazioni-delle-unita-amministrative-della-Sardegna.zip` | ZIP → CSV `;` latin1 (nome file con byte non UTF-8: estrarre con `unzip -p '*.csv'`) | una tantum (riordino) | 62 KB | **scaricato**: 384 righe, es. `112001;Alghero;090003` |
| `istat-posas-2025` | Popolazione residente al 1° gennaio 2025 per età e sesso, per comune | `https://demo.istat.it/data/posas/POSAS_2025_it_Comuni.zip` | ZIP → CSV `;`, titolo in riga 1, totale in «Età 999» | annuale; il definitivo esce a gennaio dell'anno dopo | 8,5 MB (CSV 46,8 MB) | **scaricato**: 7.896 comuni, 5 valori identici. Il 2026 esiste ma è «(stima)»: escluso finché non è definitivo |
| `istat-edifici-2011` | Censimento 2011, edifici residenziali per epoca di costruzione (9 classi) | `https://esploradati.istat.it/databrowser/DWL/censtatv5db/Popolazione/DICA_EDIFICIRES-data.zip` | ZIP → CSV `\|` (46 MB secondo la ricerca) | congelato | da misurare | host in timeout: **verifica in M0** |
| `istat-asia-2011` | Censimento industria e servizi 2011, unità locali e addetti Ateco F | `https://esploradati.istat.it/databrowser/DWL/censtatv5db/Industria%20e%20servizi/DICA_ASIAUL-data.zip` | ZIP 166 MB → CSV 177 MB `\|` solo codici | congelato | 166 MB | host in timeout: **verifica in M0** |
| `istat-famiglie-2021` | Censimento permanente 2021, famiglie per titolo di godimento (`DF_DCSS_HUDW_1_COM`) | `https://esploradati.istat.it/SDMXWS/rest/data/IT1,DF_DCSS_HUDW_1_COM,1.0/<chiave>/ALL?detail=full&format=csv` | SDMX → CSV | censimento permanente (ricontrollare se esce il 2022+) | da misurare | host in timeout: **in M0** si legge la DSD e si sceglie **una** query per tutti i comuni (fallback: una per provincia), mai 7.896 chiamate |
| `dpc-sismica-2025` | Classificazione sismica aggiornata al 31 maggio 2025 | `https://rischi.protezionecivile.gov.it/static/4717c6a369cdc298b69730c9d740e39a/classificazione-sismica-aggiornata-maggio-2025.csv` | CSV `;` UTF-8 con BOM, codice senza zeri iniziali | quando le Regioni riclassificano; il file cambia **allo stesso URL** | 332 KB | **scaricato**: 7.896 righe, sha256 `89568b25…a324`, `last-modified` 02/09/2026 |
| `dpr412-allegato-a` | DPR 26 agosto 1993 n. 412, allegato A (zona, gradi giorno, altitudine della casa comunale) | `https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.versione=1&art.idGruppo=0&art.flagTipoArticolo=1&art.codiceRedazionale=093G0451&art.idArticolo=1&art.idSottoArticolo=1&art.idSottoArticolo1=10&art.dataPubblicazioneGazzetta=1993-10-14&art.progressivo=<1\|2\|3>` (User-Agent browser) | 3 frammenti HTML | testo del 1993; modificabile per decreto (art. 2 c. 2) | 80 + 81 + 57 KB | **scaricato e parsato**: 2.987 + 2.998 + 2.103 = 8.088 righe; sha256 `c9a22e4d…`, `fa0705b8…`, `7cf0cf11…` |
| `dpr74-2013-art4` | Periodi e ore di accensione per zona | Normattiva `urn:nir:stato:decreto.del.presidente.della.repubblica:2013-01-01;74~art4` | tabella di 6 righe nel modulo | a ogni aggiornamento con `cite_law` | — | **verificato** 14/09/2026 |

Scartate, con motivo: **OMI** (licenza non aperta, fermo al 2018); **SDMX popolazione live** (sostituita dal
bulk POSAS, stesso dato, nessuna chiamata per comune); **coordinate opendatasicilia**, **comuni-json**
(nessuna licenza dichiarata, errori, anagrafica ferma); **Nominatim** (non serve: i centroidi Istat coprono
tutti i comuni con la stessa licenza delle altre fonti); **OSRM demo** (uso commerciale escluso dalla
policy); **confini non generalizzati** (99 MB, precisione inutile per un punto interno);
**`Elenco-comuni-italiani.csv`** (fermo al 26/01/2024: l'elenco aggiornato esiste solo in XLSX, e i confini
2026 danno la stessa anagrafica senza parser XLSX).

## 3. Decisioni tecniche

### 3.1 Dove vive e perché

| Pezzo | Percorso | Motivo |
|---|---|---|
| Dataset | `site-renderer/data/comuni-fatti.json`, **in git** | Già fissato dal README §3. Chi lo legge davvero è la build Astro (T5a/T6b) e deve funzionare offline e riproducibile da un checkout: niente rete in build. |
| Modulo di lettura | `site-renderer/src/lib/fatti-comuni.ts` | Funzioni pure accanto a `schema.ts`/`ui.ts`, importabili dalle pagine Astro. Unico I/O: `caricaFattiComuni()` memoizzata con `fs` (build-time). |
| Script di aggiornamento + consultazione | `site-renderer/scripts/fatti-comuni.ts` (`aggiorna` \| `mostra`) | Convenzione del renderer: script pipeline in `scripts/`, eseguiti con `node --experimental-strip-types`, lanciabili dall'editor per path (come `assemble-site.ts`). `mostra <codice> --json` è il punto d'accesso della pipeline copy (T5b) senza import incrociati editor→renderer e senza specchi da tenere in parità. |
| Cache delle fonti | `~/.cache/site-factory/fatti-comuni/` (override `FATTI_COMUNI_CACHE`), **fuori dal repo** | ≈ 230 MB di zip: fuori da git senza toccare `.gitignore`, e fuori da `out/` che finisce nel sync di Google Drive. |
| Banco | `site-renderer/scripts/test-fatti-comuni.ts` | Stile `test-portafoglio.ts`; estratti delle fonti registrati inline nel file (righe verbatim con fonte e sha), nessuna cartella fixture binaria. |

Niente dipendenze nuove: `fetch`, `node:crypto` (sha256), `node:readline`, `node:child_process` → `unzip -p`
(presente su macOS con ZIP64, necessario per il CSV ASIA da 177 MB in streaming), `Intl`. Niente XLSX.

### 3.2 Formato

Un solo JSON **normalizzato**: le attribuzioni (≈ 250 byte ciascuna) stanno una volta nell'intestazione
`fonti`, la mappa `fatti` dice da quale fonte viene ogni chiave; il record del comune porta solo i valori
grezzi. Ripeterle per fatto × comune costerebbe ≈ 20 MB. Il modulo ricompone per ogni fatto l'oggetto
completo richiesto dal brief (valore, unità, riferimento, fonte, URL, licenza, dicitura).

- **Un comune per riga** (serializzatore a righe): il diff annuale è leggibile riga per riga.
- Chiavi leggibili (niente abbreviazioni): +0,4 MB accettati per il debug. Stima 1,5-1,9 MB; **budget
  duro 2,5 MB** controllato dallo script e dal banco.
- Si memorizzano i **conteggi pubblicati**, mai le percentuali: le quote si calcolano nel modulo con regola
  unica (`Math.round(x × 10) / 10`), così una somma per fusione resta esatta.
- Coordinate a 4 decimali (≈ 11 m).
- Build non rallentate: in T6a nessuna pagina importa il modulo; il dataset si legge solo su richiesta
  (lettura + `JSON.parse` misurati dal banco, soglia indicativa 100 ms).

Forma:

```jsonc
{
  "schema": 1,
  "generatoIl": "2026-09-…",
  "riferimentoTerritoriale": "2026-01-01",
  "fonti": {
    "istat-edifici-2011": {
      "titolo": "Censimento della popolazione e delle abitazioni 2011 — edifici residenziali per epoca di costruzione",
      "ente": "Istat", "url": "https://esploradati.istat.it/…/DICA_EDIFICIRES-data.zip",
      "licenza": "CC BY 4.0", "licenzaUrl": "https://creativecommons.org/licenses/by/4.0/deed.it",
      "dicitura": "Fonte: Istat, Censimento della popolazione e delle abitazioni 2011",
      "dicituraElaborazione": "Elaborazione su dati Istat, Censimento della popolazione e delle abitazioni 2011",
      "riferimento": "9 ottobre 2011", "riferimentoTerritoriale": "2011-10-09",
      "sha256": "…", "byte": 0, "righe": 0, "scaricatoIl": "…"
    }
    // … una voce per ogni fonte della tabella §2
  },
  "copertura": { "popolazione": 7896, "edificiEpoca": 0, "clima": 0, "…": 0 },
  "scarti": { "clima": { "zona_incoerente": ["…"], "nome_ambiguo": ["…"], "comune_nato_dopo_1993": ["…"] }, "…": {} },
  "alias": { "090003": { "a": "112001", "motivo": "cambio_codice", "dal": "2026-01-01" },
             "024103": { "a": "024128", "motivo": "fusione", "dal": "2025-01-01" } },
  "comuni": {
    "015081": {"nome":"Cologno Monzese","sigla":"MI","centro":[45.5333,9.2802],"raggioKm":1.65,"popolazione":46994,"edificiEpoca":[78,…],"clima":["E",2404,131],"sismica":"3","famiglie":[…,…],"costruzioni":[521,1278]},
    "…": {}
  }
}
```

Campi opzionali per comune: `nomeAltraLingua` (`COMUNE_A`), `nomiPrecedenti` (dalle righe CD), `derivati`
(`{ "edificiEpoca": { "regola": "somma_fusione", "da": ["037004", …] } }`). Un campo assente = fatto assente.

### 3.3 Schema per fatto

| Chiave nel record | Valore memorizzato | Fatti esposti dal modulo (unità) | Riferimento | Fonte | Regola variazioni (§3.4) | Plausibilità (gate) |
|---|---|---|---|---|---|---|
| `nome`, `sigla`, `nomeAltraLingua` | stringhe | anagrafica | 1/1/2026 | `istat-confini-2026` | — | 7.896 comuni; sigla presente |
| `centro`, `raggioKm` | `[lat, lon]`, raggio del cerchio di pari area | `distanzaKm` (km, linea d'aria) | 1/1/2026 | `istat-confini-2026` (elaborazione) | codici 2026 nativi | punto **dentro il proprio poligono**; lat 35,2-47,2, lon 6,5-18,6 |
| `popolazione` | intero | `popolazione` (residenti) | 1 gennaio 2025 | `istat-posas-2025` | cambio codice | 0 < p ≤ 3.000.000; totale «999» = somma delle età |
| `edificiEpoca` | 9 conteggi (≤1918, 1919-45, 1946-60, 1961-70, 1971-80, 1981-90, 1991-2000, 2001-05, ≥2006) | `edifici_residenziali` (edifici), `edifici_ante_1981` (edifici e %) | 2011 | `istat-edifici-2011` | additivo | somma classi = riga «ALL»; totale > 0 |
| `clima` | `[zona, gradi giorno, altitudine]` | `zona_climatica`, `gradi_giorno` (GG), `altitudine_casa_comunale` (m s.l.m.), `periodo_riscaldamento` (dal DPR 74/2013) | allegato A, 1993 | `dpr412-allegato-a`, `dpr74-2013-art4` | non additivo | zona coerente con le soglie dell'art. 2 c. 1; GG 500-5.200; quota -5-2.100 |
| `sismica` | stringa verbatim (`"3"`, `"2A-3A-3B"`) | `zona_sismica` | 31 maggio 2025 | `dpc-sismica-2025` | cambio codice | `^[1-4][A-Da-dS]?(-[1-4][A-Da-dS]?)*$` |
| `famiglie` | `[in proprietà, totale]` | `famiglie_proprietarie` (%) | 2021 | `istat-famiglie-2021` | additivo | 0 < proprietà ≤ totale |
| `costruzioni` | `[unità locali, addetti]` | `unita_locali_costruzioni`, `addetti_costruzioni` | 2011 | `istat-asia-2011` | additivo | 0 ≤ UL ≤ addetti |

Per le quote la citazione usa `dicituraElaborazione` (la CC BY 4.0 Istat chiede di indicare le modifiche); il
dato grezzo usa `dicitura`. La Protezione Civile ha sempre la sua dicitura letterale.

### 3.4 Regole comuni per soppressi, fusi e scambi di territorio

Chiave del dataset: codici e nomi al **1/1/2026**. Ogni fonte dichiara la sua data territoriale R; per
portarla al 2026 si applicano in ordine di decorrenza le righe Istat con decorrenza in (R, 1/1/2026], più la
tabella sarda (decorrenza 1/1/2026). Righe senza data di decorrenza con anno uguale a R contano come
successive (scelta prudente).

1. **Stesso territorio** — `CD` (nome), `AP` (appartenenza/codice), tabella sarda: il dato passa al codice
   nuovo; il vecchio codice va in `alias` (`cambio_codice`), il vecchio nome in `nomiPrecedenti`.
2. **Fusione integrale** — `ES`+`CS` (nuovo comune) o `ES`+`AQES` (incorporazione in un comune esistente):
   per i **soli fatti additivi** il valore è la **somma dei predecessori**, con `derivati` che li elenca,
   **solo se** tutti i predecessori hanno il dato e né loro né il risultante hanno scambi parziali in (R,
   2026]. I codici soppressi vanno in `alias` (`fusione`). Il fatto esposto porta
   `derivazione: { regola: "somma_fusione", da: […] }` e la citazione dice «nel territorio degli ex comuni
   di …». *(Decisione da confermare, §11.)*
3. **Scambio parziale** — `AQ`, `CE`, `CECS` in (R, 2026] su un comune: i fatti additivi con data R
   precedente **non si emettono** per nessuno dei due comuni coinvolti (i confini non coincidono e non si sa
   quanti edifici o famiglie siano passati). I fatti con R successivo restano. Scarto registrato.
4. **Fatti non additivi** (zona climatica, gradi giorno, altitudine) non si derivano mai. Un comune nato
   (`CS`) dopo il 14/10/1993 non ha zona climatica, anche se porta il nome di un predecessore (es. Sovizzo
   `024128`): l'art. 2 c. 3 affida la classificazione a un provvedimento del Sindaco che non abbiamo. Chi ha
   incorporato altri comuni (`AQES`) conserva la propria riga: l'ente e la casa comunale sono gli stessi.
5. **Abbinamento DPR 412 per nome**: nome normalizzato (NFKD, senza accenti, maiuscolo, apostrofi e
   trattini → spazio) confrontato con nome attuale e `nomiPrecedenti`; se più candidati, filtro sulla sigla
   (attuale o del 1993); se ancora ambiguo o assente → non emesso, scarto `nome_ambiguo`/`non_trovato`. Righe
   con zona incoerente con i gradi giorno → scarto `zona_incoerente` (oggi 3).
6. **Gate di chiusura**: dopo le regole, ogni codice di ogni fonte deve risolversi in un codice 2026 o in uno
   scarto dichiarato; un codice che non si risolve **ferma l'aggiornamento** (segnala variazioni successive al
   CSV Istat non ancora coperte). Il dataset precedente resta intatto.
7. **Codici dopo il 1/1/2026** (fusione vicentina del 21/02/2026): il nuovo comune non è nel dataset fino
   all'aggiornamento 2027; `fattiComune` restituisce `null`, i codici soppressi non hanno alias. Dichiarato.

### 3.5 Centroidi e distanza: linea d'aria, non OSRM

**Centroidi**: dai confini Istat 2026 generalizzati. Per ogni comune: centroide d'area in UTM 32N (piano,
quindi esatto); se cade fuori dal poligono (166 casi oggi) si prende il **punto interno** sulla retta
orizzontale che passa per il centroide, al centro del segmento interno più lungo; controllo pari-dispari
che il punto sia dentro; conversione UTM 32N → WGS84 con le formule inverse di Gauss-Krüger. Salvati anche
`raggioKm` (raggio del cerchio di pari area) come misura dell'incertezza del «centro». Plausibilità: punto
dentro il proprio poligono (è esattamente il controllo che l'errore «Vicenza 15 km fuori» non supera),
dentro il riquadro dell'Italia, 7.896 su 7.896.

**Distanza**: **haversine tra i due centroidi, arrotondata al km, dichiarata «in linea d'aria tra i centri
geografici dei comuni»**, dalla sede come comune (non dall'indirizzo: niente geocoding, niente dati personali).

Valutazione di OSRM:

- *Server demo*: uso limitato a casi «non-commercial» dalla policy → escluso per un'agenzia.
- *Self-hosting*: l'estratto Geofabrik Italia pesa **2,23 GB** (13/09/2026). La wiki OSRM indica per il
  pianeta (61 GiB) ≈ 123 GiB di RAM a runtime col profilo auto e ≈ 300 GB di file, con scala «roughly
  linear»: per l'Italia ≈ 4 GiB di RAM residente e ≈ 10 GB di disco, più i picchi di preprocessing. Il VPS
  CX33 ha 8 GB con ≈ 2-2,5 GB già usati da n8n/Gatus/Umami: resterebbe senza margine, con un servizio in più
  da aggiornare ogni mese.
- *Valore*: il tempo in auto è gradevole ma non decisivo per una pagina-comune; la linea d'aria è esatta,
  riproducibile, offline e con la stessa licenza del resto. Il limite noto (sottostima rispetto alla strada:
  5,8 contro 8,1 km) si gestisce con la dicitura, mai «in auto».

Se T6b dimostra che i minuti in auto servono davvero, le opzioni restano un OSRM self-hosted su macchina
dedicata o un servizio a pagamento con licenza commerciale, con risultati per coppia salvati nel cliente.

## 4. API del modulo `site-renderer/src/lib/fatti-comuni.ts`

```ts
export type ChiaveFatto =
  | "popolazione" | "edifici_residenziali" | "edifici_ante_1981" | "zona_climatica" | "gradi_giorno"
  | "altitudine_casa_comunale" | "periodo_riscaldamento" | "zona_sismica" | "famiglie_proprietarie"
  | "unita_locali_costruzioni" | "addetti_costruzioni";

export interface Fonte { id: string; titolo: string; ente: string; url: string; licenza: string;
  licenzaUrl: string; dicitura: string; dicituraElaborazione?: string; riferimento: string }
export interface DatasetFattiComuni { schema: 1; riferimentoTerritoriale: string; fonti: Record<string, Fonte>;
  copertura: Record<string, number>; alias: Record<string, { a: string; motivo: "cambio_codice" | "fusione"; dal: string }>;
  comuni: Record<string, RecordComune> }

export interface Fatto {
  chiave: ChiaveFatto;
  valore: number | string;          // % già arrotondata a 1 decimale dove è una quota
  unita: string;                    // "residenti" | "edifici" | "%" | "GG" | "m s.l.m." | "zona" | …
  base?: { parte: number; totale: number };   // per le quote: 2151 su 3087
  riferimento: string;              // "1 gennaio 2025", "2011", "allegato A (1993)"
  fonte: string; url: string; licenza: string; licenzaUrl: string;
  dicitura: string;                 // già scelta tra dicitura ed elaborazione
  derivazione?: { regola: "somma_fusione"; da: string[] };
}
export interface ComuneFatti { codice: string; nome: string; sigla: string; centro: [number, number];
  raggioKm: number; alias?: { da: string; motivo: "cambio_codice" | "fusione" }; fatti: Fatto[] }
export interface FraseFatto { chiave: ChiaveFatto; testo: string; citazione: string; url: string }

/** Unico I/O: legge e memoizza data/comuni-fatti.json. */
export function caricaFattiComuni(percorso?: string): DatasetFattiComuni;
/** Accetta "015081", "15081", 15081 e codici soppressi (via alias, dichiarato). Codice ignoto → null. */
export function fattiComune(codice: string | number, ds?: DatasetFattiComuni): ComuneFatti | null;
/** Valori + attribuzione, template fissi e numeri all'italiana; nessun fatto → nessuna frase. */
export function frasiFatto(codice: string | number, ds?: DatasetFattiComuni): FraseFatto[];
/** Nome (anche precedente, accenti/apostrofi indifferenti) + sigla opzionale → candidati. */
export function cercaComune(nome: string, sigla?: string, ds?: DatasetFattiComuni): { codice: string; nome: string; sigla: string }[];
/** Linea d'aria tra centroidi, km interi; null se un codice è ignoto. */
export function distanzaKm(da: string | number, a: string | number, ds?: DatasetFattiComuni):
  { km: number; metodo: "linea_aria_centroidi"; citazione: string } | null;
/** Comuni entro `km` dalla sede, ordinati per distanza (per «Zone servite» e T4). */
export function comuniEntroKm(da: string | number, km: number, ds?: DatasetFattiComuni): { codice: string; nome: string; sigla: string; km: number }[];
```

`ds` in coda con default `caricaFattiComuni()`: la firma del brief (`fattiComune(codiceIstat)`) resta, e il
banco passa un dataset in memoria. Esempi di `testo` (template fissi, niente prosa generata):
«46.994 residenti», «69,7% degli edifici residenziali costruiti prima del 1981 (2.151 su 3.087)», «zona
climatica E, 2.404 gradi giorno (casa comunale a 131 m)», «riscaldamento consentito dal 15 ottobre al 15
aprile, 14 ore al giorno», «zona sismica 3», «78,1% delle famiglie in abitazione di proprietà». Numeri con
`Intl.NumberFormat("it-IT", { useGrouping: "always" })`.

Script: `node --experimental-strip-types scripts/fatti-comuni.ts aggiorna [--offline] [--solo-verifica]` e
`… mostra <codice|"nome" [sigla]> [--da <codice>] [--json]`.

`aggiorna`: scarica nella cache (User-Agent identificativo, 3 tentativi con attesa, timeout), scrive
`manifest.json` (URL, sha256, byte, `last-modified`, data), controlla gli zip con `unzip -t`, legge,
applica le regole, esegue i gate (§3.3, §3.4), confronta col dataset precedente (quanti valori cambiano per
fatto, comuni entrati e usciti, fonti con sha diverso) e **scrive solo se tutto passa** (file temporaneo +
rename). `--offline` usa solo la cache e fallisce con messaggio chiaro se manca una fonte.

## 5. File (elenco esatto)

| File | Nuovo/modifica | Contenuto |
|---|---|---|
| `site-renderer/scripts/fatti-comuni.ts` | nuovo | costanti `FONTI` (URL, date territoriali), download + cache + manifest, parser esportati (DBF/SHP, UTM, punto interno, CSV con virgolette multiriga, variazioni, tabella sarda, POSAS, edifici, ASIA, famiglie, sismica, DPR 412), regole §3.4, gate, scrittura a righe, report di diff, comando `mostra`; nel commento di testa la procedura annuale (§9) |
| `site-renderer/src/lib/fatti-comuni.ts` | nuovo | tipi e funzioni del §4, tabella DPR 74/2013 art. 4 c. 2 con citazione e data di verifica |
| `site-renderer/data/comuni-fatti.json` | nuovo (generato) | dataset §3.2 |
| `site-renderer/scripts/test-fatti-comuni.ts` | nuovo | banco §7 |
| `docs/traffico/piano-T6a.md` | nuovo | questo piano, poi «Calibrazione» e «Verifica» |
| `docs/traffico/README.md` | modifica | riga T6a in §7 |
| `docs/handoff-fase-c.md` | modifica | stato T6a |
| `docs/DEBUG.md` | modifica | righe «fatto comunale assente o sospetto» → `copertura`/`scarti` nel dataset → `fatti-comuni.ts mostra`; «aggiornamento fallito» → manifest in cache |

Non si toccano: `site-renderer/package.json` (nessuna dipendenza, nessuno script npm), `.gitignore`, editor,
`site-intake/`.

## 6. Perimetro per `.claude/scope.json` (primo atto della fase 2, dopo lo svuotamento di T0)

```json
{
  "task": "T6a Fatti comunali da open data (docs/traffico/piano-T6a.md)",
  "perimetro": [
    "site-renderer/scripts/fatti-comuni.ts",
    "site-renderer/scripts/test-fatti-comuni.ts",
    "site-renderer/src/lib/fatti-comuni.ts",
    "site-renderer/data/comuni-fatti.json",
    "docs/traffico/piano-T6a.md",
    "docs/traffico/README.md",
    "docs/handoff-fase-c.md",
    "docs/DEBUG.md"
  ]
}
```

La cache fuori repo è scritta dallo script via Node, non da Edit/Write: non passa dallo scope-guard.

## 7. Milestone (ogni verifica passa prima della successiva)

| # | Cosa | Verifica | Commit |
|---|---|---|---|
| M0 | Con `esploradati` raggiungibile: dimensioni e sha dei due bulk 2011, colonne dei CSV (posizioni già usate dalla ricerca), DSD di `DF_DCSS_HUDW_1_COM` e query unica per tutti i comuni con i soli totali; aggiornare §2 | tabella §2 senza «da misurare»; le 5 quote famiglie della ricerca riprodotte a mano | nessuno (solo piano) |
| M1 | Script: cache + manifest + anagrafica e centroidi 2026 (DBF, SHP, punto interno, UTM) + serializzatore + `mostra` minimale | `aggiorna` produce 7.896 comuni tutti col punto dentro il poligono; `mostra 015081` e `mostra 024116`; banco sezioni geometria/formato verdi | sì |
| M2 | Variazioni + tabella sarda → risoluzione codici, alias, `nomiPrecedenti`, gate di chiusura | gate verde sulle fonti reali; banco sezione variazioni verde; `mostra 090003` → Alghero `112001` con alias | con M3 |
| M3 | Fatti: POSAS, sismica, DPR 412, edifici, ASIA, famiglie; regole §3.4; copertura e scarti; budget 2,5 MB | **i 5 comuni identici alla tabella della ricerca**; copertura per fonte stampata e scritta nel dataset; nessun valore fuori range; `npm run check` senza errori nuovi (resta solo quello atteso su `registry.ts`) | sì |
| M4 | Modulo `src/lib/fatti-comuni.ts`: `fattiComune`, `frasiFatto`, `cercaComune`, `distanzaKm`, `comuniEntroKm`; `mostra` lo usa | banco completo verde; `npm run build` verde con durata invariata (nessuna pagina importa il modulo); tempo di caricamento stampato | sì |
| M5 | Calibrazione (§«Calibrazione»), documenti, README §7, handoff, DEBUG.md; diff riga per riga; file toccati vs §5; `scope.json` svuotato | tutti i controlli rilanciati; sezione «Verifica» compilata | sì, poi push |

## 8. Banco `site-renderer/scripts/test-fatti-comuni.ts` (senza rete)

Estratti verbatim delle fonti incollati nel file (con fonte e data), più il dataset committato per i valori
dei 5 comuni. Casi:

1. **DPR 412, zeri OCR**: righe con `21O2` e `42O` → 2102 e 420; entità HTML nei nomi («CASSINA DE' PECCHI»);
   righe non tabellari ignorate.
2. **DPR 412, coerenza**: `AT F 2698 257 CUNICO` → scarto `zona_incoerente`, nessun fatto clima.
3. **DPR 412, omonimi e province cambiate**: `CASTRO` BG/LE risolti con la sigla; `MI E 2404 162 MONZA` →
   Monza (MB) per nome unico; omonimo senza sigla utile → non emesso.
4. **DPR 412, comune nato dopo il 1993**: Sovizzo `024128` senza zona benché il nome coincida.
5. **CSV variazioni**: latin1, CRLF, campo tra virgolette su due righe (Grana Monferrato 2023).
6. **Fusione integrale**: Valsamoggia (5 predecessori, 2014) → edifici e unità locali = somma, `derivazione`
   con i 5 codici.
7. **Fusione seguita da scambio parziale**: Borgo Virgilio (fusione 2014, cessione a Bagnolo San Vito 2024)
   → nessun fatto 2011/2021; popolazione 2025 e sismica presenti.
8. **Incorporazione (`AQES`)**: il comune che incorpora somma il predecessore solo se integrale.
9. **Scambio parziale puro**: Bergamo e Orio al Serio (2024) → fatti additivi 2011/2021 assenti per entrambi.
10. **Cambio codice sardo**: dati di `090003` sul record `112001`; `fattiComune("090003")` → Alghero con
    `alias.motivo = "cambio_codice"`.
11. **Codici**: `"15081"` e `15081` → Cologno; `"999999"`, `"abc"`, `""` → `null` senza eccezioni.
12. **Fonte mancante**: record senza `famiglie` → nessun fatto né frase, mai «0»; `aggiorna --offline` con
    una fonte assente in una cache temporanea → errore esplicito e dataset esistente intatto.
13. **POSAS**: titolo con «(stima)» rifiutato; totale «999» uguale alla somma delle età.
14. **Sismica**: `2A-3A-3B` conservato verbatim; `5` → errore di gate; BOM rimosso; codice senza zeri.
15. **Geometria**: poligono a U con centroide esterno → punto interno dentro; poligono con buco; poligono in
    due parti; UTM (500000; 4982950,4) → (45,0°; 9,0°) entro 1e-6; due punti a 1.000 m lungo l'asse E vicino
    al meridiano centrale → ≈ 1.000,4 m.
16. **Numeri e quote**: 2151/3087 → «69,7»; 8303 → «8.303»; 46994 → «46.994».
17. **Golden dei 5 comuni sul dataset committato**: popolazione 2025, edifici totali e % ante 1981, zona/GG,
    altitudine, sismica, % famiglie proprietarie, unità locali e addetti = tabella della ricerca (la
    popolazione si confronta solo se la fonte è ancora POSAS 2025).
18. **Frasi**: ogni frase ha citazione con dicitura, anno e URL; le quote usano «Elaborazione su dati Istat»;
    la sismica la dicitura DPC letterale; zona F → «nessuna limitazione»; nessuna frase su un fatto assente.
19. **`cercaComune`**: «Cologno Monzese» → `015081`; «cassina de pecchi» senza apostrofo; nome precedente
    (Grana → Grana Monferrato); omonimo senza sigla → 2 risultati, con sigla → 1.
20. **Distanza**: `distanzaKm("015081", "108033")` → 6 (5,8 arrotondato) con metodo dichiarato;
    `comuniEntroKm` ordinato e comprende la sede a 0 km; codice ignoto → `null`.
21. **Budget**: dataset < 2,5 MB; caricamento stampato.

Uscita come `test-portafoglio.ts`: `✓/✗`, conteggio, `process.exit(1)` se qualcosa fallisce.

## 9. Procedura di aggiornamento annuale (aprile, dopo confini 1/1 e POSAS definitivo)

1. Controllare le pagine Istat (codici dei comuni; confini amministrativi; demo.istat.it) e DPC: nuovo
   `LimitiAAAA_g.zip`, POSAS dell'anno precedente **senza «stima»**, CSV variazioni aggiornato, eventuali
   tabelle di corrispondenza regionali (come quella sarda), nuovo CSV sismico.
2. Verificare con `cite_law` che il DPR 74/2013 art. 4 sia ancora vigente e invariato; aggiornare la data di
   verifica nel modulo o togliere `periodo_riscaldamento`.
3. Aggiornare le costanti `FONTI` nello script (un solo punto).
4. `cd site-renderer && node --experimental-strip-types scripts/fatti-comuni.ts aggiorna`; se il gate di
   chiusura fallisce, c'è una variazione non coperta: cercarne la tabella Istat prima di forzare qualunque cosa.
5. Leggere il report di diff (copertura, scarti, comuni entrati/usciti, sha cambiati); rilanciare il banco
   (aggiornare l'anno del golden della popolazione).
6. Commit di dataset e costanti con il report nel messaggio; push. Le pagine già online prendono i fatti nuovi
   al rebuild successivo (lastmod da hash, T1a/T5c).

## 10. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| `esploradati.istat.it` instabile (giù oggi) | cache con manifest, 3 tentativi, `--offline`; l'aggiornamento non è urgente; mai scritture parziali |
| URL che cambiano (`wp-content/uploads`, hash statici DPC) o file riscritti allo stesso URL (sismica: `last-modified` 02/09/2026 su un file «maggio 2025») | costanti in un solo punto; sha256 nel manifest e nel dataset; il report di diff mostra quali fonti sono cambiate |
| Variazioni 2025-2026 fuori dal CSV Istat | tabella sarda; gate di chiusura sui codici; scambi parziali 2025 non visibili: limite dichiarato, recuperato all'aggiornamento successivo |
| Comuni dopo il 1/1/2026 (fusione vicentina) | assenti fino al 2027, `null` dichiarato |
| Allegato A modificato da decreti per singoli comuni (art. 2 c. 2) o zone diverse per porzioni di territorio (c. 4) | fatto sempre «secondo l'allegato A del DPR 412/1993, casa comunale»; campione di controllo in calibrazione; rettifiche solo con un atto ufficiale citabile |
| DPR 74/2013 abrogabile (D.Lgs. 48/2020 art. 17 c. 4) | data di verifica nel modulo; controllo `cite_law` nella procedura annuale |
| Centroide ≠ centro abitato (San Severo 4,9 km dal municipio) | km interi, «in linea d'aria tra i centri geografici»; `raggioKm` per tarare la soglia sotto cui non si cita la distanza |
| La linea d'aria sottostima la strada | dicitura obbligatoria; mai «in auto» (regola da passare al critico di T5b) |
| Fatti del 2011 letti come attuali | anno sempre nel testo e nella citazione |
| Obbligo CC BY di indicare le modifiche | `dicituraElaborazione` per quote e somme |
| Codici vecchi a monte (form con 7.904 comuni, nessun codice salvato) | `alias` + `cercaComune`; segnalato a T3 l'aggiornamento di `site-intake/data-src/comuni.json` (fuori perimetro) |
| Dataset in git (1,5-1,9 MB, riscritto ogni anno per la popolazione) | una riga per comune, budget 2,5 MB, nessun import in pagina fino a T6b |
| Arrotondamento JS diverso da `round()` di Python sui pareggi | regola JS canonica; golden dei 5 comuni nel banco |
| CSV ASIA da 177 MB | streaming con `unzip -p`; fonte congelata: si rilegge solo se lo sha cambia |
| Query famiglie troppo grande per una chiamata SDMX | decisa in M0 sulla DSD; fallback per provincia con cache |

## 11. Dubbi che richiedono una decisione

1. **Fusioni**: somma dei predecessori per i fatti additivi (regola §3.4.2, dichiarata nel fatto) oppure
   niente fatti 2011/2021 per i comuni fusi (≈ 140 comuni)? Proposta: somma.
2. **Distanza**: linea d'aria dichiarata al posto di «km e minuti in auto» (OSRM escluso per licenza e
   risorse)? Proposta: sì; si riapre in T6b solo con un bisogno misurato.
3. **Zona climatica**: pubblicabile citando l'allegato A del 1993 anche sapendo che singoli comuni possono
   essere stati riclassificati per decreto? Proposta: sì, con la dicitura del §10 e il campione di
   calibrazione.
4. **ASIA 2011** (unità locali e addetti nelle costruzioni): il brief e la tabella della ricerca lo
   includono, ma sono dati di 15 anni fa sulla concorrenza del cliente e costano 166 MB di download. Tenerlo
   come contesto per T4/T6b o toglierlo? Proposta: tenerlo, fuori dalle frasi pubblicabili se il critico lo
   ritiene fuorviante.
5. **Perimetro parallelo**: `.claude/scope.json` è uno solo; T6a attende lo svuotamento di T0 o
   l'orchestratore unisce i perimetri?

## Calibrazione

Fase 3, 2026-09-14, sulle fonti reali scaricate oggi (sha256 nel manifest della cache e nel dataset).
Decisioni dell'orchestratore applicate (`decisioni-piani.md` §T6a): somma dichiarata per i fusi, linea
d'aria senza OSRM, zona climatica citando l'allegato A con campione di controllo, **ASIA 2011 tolta** da
script, dataset e banco (niente download da 166 MB, niente chiavi `costruzioni` né fatti
`unita_locali_costruzioni`/`addetti_costruzioni`).

**M0 non chiusa: `esploradati.istat.it` non ha mai risposto** (timeout di connessione a ogni tentativo
dalle 18:00 alle 18:45 circa, un tentativo ogni 2 minuti). Senza quell'host mancano edifici 2011 e famiglie
2021: il dataset committato è scritto con `--parziale` e dichiara `completo: false`,
`fontiMancanti: ["istat-edifici-2011", "istat-famiglie-2021"]` e le due fonti con `stato:
"non_raggiungibile"`; `mostra` lo avvisa e il banco conta 10 valori golden come «non verificabili» (mai
come passati). I lettori di quei due file e la query SDMX unica non sono ancora scritti: vanno fatti sui
file veri appena l'host risponde (colonne, DSD, data territoriale reale delle famiglie). Il gate di chiusura
dirà se la data territoriale dichiarata (`2021-12-31`) è sbagliata. Nuovo gate di **copertura**: una fonte
presente che dà il suo fatto a meno del 90% dei comuni ferma l'aggiornamento (provato marcando presente la
fonte edifici senza lettore: errore, niente `completo: true`).

**Alternativa verificata per gli edifici 2011, da decidere** (non adottata: cambia la tabella §2): le
«variabili censuarie per sezione di censimento 2011» di Istat,
`https://www.istat.it/storage/cartografia/variabili-censuarie/dati-cpa_2011.zip` (52,4 MB, `last-modified`
29/08/2022, su `www.istat.it`, che risponde), stesso censimento e stessa licenza. Colonne `PROCOM`, `E3`
(edifici residenziali) ed `E8`-`E16` (le stesse 9 epoche). Sommate per comune riproducono **identici** i 5
valori della ricerca: Cologno 3.087 e 2.151 ante 1981 (69,7%), Monza 8.879 (75,8%), Sandrigo 1.628
(74,4%), Treviso 13.696 (83,2%), San Severo 7.539 (75,2%); in tutti e 5 `E3` = somma delle epoche. Per le
famiglie 2021 non c'è un'alternativa equivalente fuori da esploradati (il file per sezioni 2021 non esiste;
quello 2011 dà un altro anno).

### DPR 412/1993, allegato A

| Passo | Effetto sulle 8.088 righe |
|---|---|
| Solo nome esatto + sigla (prima taratura) | 7.637 comuni; 432 non trovati, 10 sigla diversa, 3 zona incoerente, 6 nati dopo il 1993 |
| Zeri OCR anche nei nomi (`PATERN0'`, `ZEFFIRI0`: nessun nome contiene cifre) | +2 (Paternò, Bruzzano Zeffirio) |
| Righe CD dal 1991 invece che dal 14/10/1993 (l'allegato usa nomi già cambiati: `SAINT RHEMY`, `SAN POLOMATESE`, `CIANO D'ENZA`) | +5 (con Canossa, Ollastra, Telese Terme); nessun omonimo ambiguo in più (0 scarti `nome_ambiguo`) |
| Sigla OCR isolata tra righe della stessa provincia (`MR … IRSINA` tra righe MT: l'allegato è ordinato per provincia) | +1, regola generale e non una tabella di eccezioni |
| Secondo passaggio, solo per righe senza comune (o col nome solo in altre province) verso comuni esistenti nel 1993 e rimasti senza riga, stessa sigla attuale o storica, candidato unico: **inizio del nome a parola intera** | +13 (`VENARIA` → Venaria Reale, `BASTIA` → Bastia Umbra, `TRIPI` → Tripi - Abakainon) |
| Stesso passaggio: **una sola lettera diversa, mancante, in più o scambiata con la vicina** (distanza OSA = 1) | +69 (`THIENNE`, `IESOLO`, `SAN REMO`, `PIORINO` → Poirino, `BG CORTENOVA` → Cortenuova e non Cortenova LC) |
| **Finale** | **7.727 comuni** (97,9%); 345 non trovati, 7 sigla diversa, 3 zona incoerente, 6 nati dopo il 1993; ogni abbinamento non letterale elencato in `abbinamentiApprossimati.clima` (83) |

Soglie scelte e scartate:

- **Distanza 2 esclusa**: aggiungerebbe una decina di casi quasi tutti giusti ma anche `ISOLA DI BARI` → Mola di
  Bari (BA), non decidibile. Con distanza 1 e la sigla il campione non ha mostrato abbinamenti sbagliati.
- **La sigla resta obbligatoria anche per i nomi unici**: senza, `PV … SANTA MARGHERITA DI BELICE` (righe
  scambiate nell'allegato tra PV e AG) e `TN … CUNEO` darebbero valori di altri comuni. Restano scartati.
- Le 3 righe con zona incoerente con i gradi giorno (Cunico, Caprese Michelangelo, Mongiana) restano senza
  zona: OCR o originale, non decidibile senza un atto.
- I 345 non trovati sono in grande maggioranza comuni soppressi dopo il 1993 (fusioni) e i comuni sardi nati
  nel 1988-1991 assenti dall'allegato (Erula, Stintino, Elmas…): corretto non emetterli (art. 2 c. 3).
- Intervalli di plausibilità confermati sui dati: gradi giorno 568 (Lampedusa e Linosa) – 5.165 (Sestriere)
  dentro 500-5.200; altitudine 0-2.035 dentro -5-2.100; nessuno scarto `fuori_intervallo`. Zone: E 4.088,
  D 1.585, C 969, F 931, B 152, A 2.

**Campione di controllo** (decisione n. 3): 143 comuni, cioè tutti gli 83 abbinamenti non letterali più 60
abbinamenti esatti presi a passo fisso sull'elenco, confrontati con i «Gradi giorno» delle voci di
it.wikipedia (voce trovata dal codice Istat via Wikidata P635). Esito: **119 uguali, 1 diverso, 23 senza il
dato su Wikipedia**. Esatti: 56 uguali su 56 confrontabili. Non letterali: 63 uguali su 64 confrontabili.
L'unico diverso è Albissola Marina (allegato A: C, 1.393 GG; Wikipedia: 1.490): l'abbinamento del nome è
giusto (`ALBISOLA MARINA`), il valore diverge. È il rischio già noto dell'art. 2 c. 2 (tabella modificabile
per decreto): il fatto resta «secondo l'allegato A del DPR 412/1993, testo originario», e una rettifica si fa
solo con un atto ufficiale citabile. Da ricontrollare nella procedura annuale.

### Comuni fusi e scambi di territorio

Conteggi sui codici 2026 con le variazioni Istat + tabella sarda:

| Riferimento della fonte | Comuni da fusione (somma dichiarata) | …di cui con scambi dopo | Comuni con scambi parziali (niente fatti additivi) | Nati da parti di altri comuni | Solo cambio di codice |
|---|---|---|---|---|---|
| 9/10/2011 (edifici) | 137 | 2 | 66 | 2 | 381 |
| 31/12/2021 (famiglie) | 7 | 0 | 10 | 0 | 377 |
| 1/1/2025 (popolazione) | 0 | 0 | 0 | 0 | 377 |
| 31/5/2025 (sismica) | 0 | 0 | 0 | 0 | 377 |

Popolazione e sismica passano quindi al 2026 senza perdite (7.896 su 7.896; il gate di chiusura è verde:
tutti i codici delle due fonti si risolvono). Per i fatti del 2011 la regola costa 66 comuni su 7.896 (0,8%):
accettato, perché un edificio passato da un comune all'altro non è ricostruibile. Le CS senza la ES
corrispondente (nuovo comune da parte di territorio, es. Fiumicino, Mappano) sono trattate come scambi
parziali. 1.483 alias (95 KB) coprono codici soppressi, cambi di provincia e il riordino sardo.

### Centri e distanza

- 166 comuni su 7.896 hanno il centroide d'area fuori dal proprio poligono (come nel prototipo): tutti
  sostituiti dal punto interno, tutti verificati dentro. Raggio di pari area: p10 1,4 km, mediana 2,7, p90
  5,2, massimo 20,3 (Roma).
- Centri dei comuni di prova coerenti col prototipo (Cologno 45,5333; 9,2802) e Vicenza entro 2 km dal
  municipio (il file di terze parti della ricerca lo metteva 15 km più a nord).
- **Linea d'aria confermata**: Cologno → Monza 6 km (5,8), Sandrigo → Vicenza 13, dichiarata «in linea d'aria
  tra i centri geografici dei comuni, non su strada».
- **Distanza minima citabile**: `distanzaKm` restituisce `citabile: false` quando la distanza è minore della
  somma dei due raggi di pari area. Motivo: il centro dista dal municipio fino a circa mezzo raggio (San
  Severo 4,9 km su 10,3), quindi sotto quella soglia l'errore supera metà del valore; lì T6b dirà «comune
  vicino». Su un campione di 41.276 coppie entro 30 km la soglia esclude il 2,7%; Cologno → Monza (6 km,
  raggi 4,9), Sandrigo → Vicenza (13; 8,1) e San Severo → Foggia (26; 23,1) restano citabili, Roma →
  Ciampino no.

### Formato

Dataset 1,31 MB con le fonti oggi disponibili (budget 2,5 MB); lettura + `JSON.parse` 12 ms; build del
renderer invariata (nessuna pagina importa il modulo). Con edifici e famiglie la stima resta 1,6-1,8 MB.

## Verifica

Collaudo finale (fasi 4-5) del 2026-09-14 sul commit `4997dad`, da `site-renderer/`, rilanciato per intero.

### Suite

| Comando | Esito reale |
|---|---|
| `node --experimental-strip-types scripts/test-fatti-comuni.ts` | exit 0 · «119 passati, 0 falliti, 10 NON VERIFICABILI» (i 10 sono edifici e famiglie dei 5 comuni, fonti non raggiungibili: mai contati come passati) |
| … lo stesso con `fetch` sostituito da una funzione che lancia (`node --import` di un modulo che vieta la rete) e cache inesistente | identico: 119 / 0 / 10, nessuna chiamata di rete; nessuna cartella `fatti-comuni-*` lasciata in `tmpdir` |
| `npm run build` | exit 0 · «18 page(s) built in 914ms», 2,7 s totali; nessun file di `src/pages`, `src/sections` o `src/layouts` importa il modulo |
| `npm run check` | «Result (63 files): 1 error, 0 warnings»: solo l'errore atteso su `src/lib/registry.ts`, nessuno sui file di T6a |
| `node --experimental-strip-types scripts/validate-site.ts blueprints/conversione-locale-v1/blueprint.json` | «OK — site.json valido · 12 sezioni · preset "meridian"» |
| `node --experimental-strip-types scripts/fatti-comuni.ts mostra --json 015081` | exit 0 · Cologno Monzese (MI), centro 45,5333; 9,2802, raggio 1,65 km; 46.994 residenti, zona E, 2.404 GG, 131 m, riscaldamento 15/10-15/4 14 h, zona sismica 3; `avviso` «dataset incompleto: … (istat-edifici-2011, istat-famiglie-2021)» |

### Criteri del brief, uno per uno

| Criterio | Prova | Esito |
|---|---|---|
| Script TS riproducibile, cache fuori da git, verifica, dataset | `aggiorna --offline --parziale` richiamato su una copia del dataset nello scratchpad: gate verdi, 2,2 s, **file identico a quello committato salvo `generatoIl`** (diff di una riga); report di diff «0 comuni cambiati» per ogni campo. `aggiorna --offline --solo-verifica` senza `--parziale` → exit 1 «aggiornamento fermato: fonti non disponibili…», dataset intatto (sha256 `fdf4c55c…` prima e dopo), `manifest.json` della cache non toccato | sì |
| Dataset per codice Istat con valore, unità, riferimento, fonte, URL, licenza, dicitura | `mostra --json` di Cologno: ogni fatto porta tutti i campi; frasi con citazione, anno e URL (banco §18) | sì |
| Soppressi e fusi mai attribuiti senza regola | banco: Valsamoggia, Borgo Virgilio, Gordona ← Menarola, Bergamo/Orio al Serio, Sovizzo, Alghero `090003`; `fattiComune("090003")` → `112001` con alias dichiarato; 1.483 alias, tutti con destinazione esistente | sì |
| Centroidi affidabili con plausibilità; distanza scelta | 7.896 centri nel riquadro dell'Italia (controllo indipendente sul JSON), punto interno verificato dallo script; Vicenza entro 2 km dal municipio; `mostra 024116 --da 024091 --json` → 13 km, `citabile: true`, metodo e citazione «in linea d'aria … non su strada» | sì |
| Modulo di funzioni pure con frasi citate | banco §11, §16, §18-§20; nessuna prosa generata (template fissi) | sì |
| I 5 comuni identici alla ricerca | popolazione, zona/GG e sismica identici per tutti e 5 (Cologno, San Severo, Sandrigo, Monza, Treviso); **edifici ante 1981 e famiglie proprietarie non verificabili** (fonte giù); unità locali costruzioni tolte per decisione dell'orchestratore | **in parte** |
| Copertura per fonte e nessun valore fuori range | `copertura` nel dataset: comuni 7.896, centro 7.896, popolazione 7.896, clima 7.727, sismica 7.896, edifici 0, famiglie 0. Controllo indipendente su tutti i record (codice a 6 cifre, sigla, raggio 0-25 km, popolazione intera 1-3.000.000, sismica con la regex del gate, zona coerente con i GG, GG 500-5.200, quota -5-2.100): **0 fuori range** | sì |
| Banco senza rete su dati registrati | vedi Suite (rete vietata): DPR 412 con zeri OCR, fusi, comune inesistente, fonte mancante, cache corrotta | sì |
| Dimensione ragionevole e build non rallentate | 1,34 MB (budget 2,5 MB, una riga per comune), lettura + `JSON.parse` 12 ms, build invariata | sì |
| Utilità per T3 (codici 2026 dal form) | tutti i 7.904 comuni di `site-intake/data-src/comuni.json`: `cercaComune(nome, sigla)` → **esattamente 1** candidato per 7.904 su 7.904, e `fattiComune(codice del form)` porta allo stesso codice 2026 in 7.904 casi su 7.904 | sì |

CLI: `mostra 999999` → exit 1 «codice Istat sconosciuto»; `mostra abc` → exit 1; `mostra Castro` → exit 1 con i
2 candidati; `mostra 090003` → Alghero 112001 «richiesto 090003: cambio_codice dal 2026-01-01».

### File toccati contro il §5

I sei commit del piano toccano solo `site-renderer/scripts/fatti-comuni.ts`, `site-renderer/scripts/test-fatti-comuni.ts`,
`site-renderer/src/lib/fatti-comuni.ts`, `site-renderer/data/comuni-fatti.json` e `docs/traffico/piano-T6a.md`; la
chiusura aggiunge `docs/traffico/README.md`, `docs/handoff-fase-c.md`, `docs/DEBUG.md`. **Nessun file fuori
perimetro**; `package.json`, `.gitignore`, editor e `site-intake/` intatti. Nessuna modifica non committata del
piano (le modifiche presenti nel working tree, `decisioni-piani.md`, `factory/assignments.json` e i piani T1b/G1,
sono di altre sessioni e restano fuori da questi commit). Revisione: 9 problemi corretti nei giri precedenti
(`c22a76e`, `866e6f6`, `4997dad`); il collaudo finale non ne ha trovati altri.

### Punti aperti

1. **M0**: `esploradati.istat.it` ancora in timeout alle 20:15 del 14/09. Quando risponde: lettori di edifici 2011
   e famiglie 2021 sui file veri, query SDMX unica, `aggiorna` senza `--parziale`, golden completi nel banco.
2. **Decisione**: adottare per gli edifici 2011 le variabili censuarie per sezione (`dati-cpa_2011.zip` su
   `www.istat.it`, stessi 5 valori della ricerca) invece del bulk di esploradati (§«Calibrazione»).
3. `site-intake/data-src/comuni.json` resta con i codici precedenti al 2026: T3 usa i codici di T6a
   (`cercaComune` o gli alias), come da `decisioni-piani.md` §T3 punto 6.
