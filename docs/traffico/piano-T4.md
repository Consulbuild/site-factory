# Piano T4 — Mappa query → pagine

Stato: **fase 1 (piano) — in revisione dall'orchestratore**, 2026-09-14. Fonti: `docs/traffico/README.md` (§1-§5),
`docs/traffico/brief-T4.md`, `piano-T0.md` (§3-§4), `piano-T3.md` (§5 schemi di `dati.json`/`foto.json`), `piano-T6a.md`
(§3-§4 dataset e API), `docs/ricerca-traffico-2026-09.md` §3, §4, §6.2, §8, `~/knowledge/seo/ricerche-2026-09-14/p4-serp-italia.md`
e `p9-strumenti.md`, `ricerca-scheda-google-2026-09.md` §3-§5 e §7 (termini DataForSEO); codice: `lib/run-bus.ts`,
`lib/run-step.ts`, `lib/portafoglio.ts`, `lib/cache.ts`, `lib/secrets.ts`, `app/api/setup/keys/route.ts`.

Letture aggiuntive, minime e dichiarate (servivano a un elenco file esatto e a esempi veri): `contesto.json` e `brief.json` di
Cavaliere (nomi dei 24 servizi, 5 macro, `zona.sede`, `brief.citta`), codici ISTAT degli esempi da
`site-intake/data-src/comuni.json`, `app/traffico/[slug]/page.tsx` (dove va il pannello), i consumatori di `BusRunInfo.kind`
(`lib/agenti.ts`, `components/run-provider.tsx`, `step-run-live.tsx`), `components/confirm-dialog.tsx` (props),
`DESIGN-SYSTEM.md` §5-§12. Il CSV pubblico delle località DataForSEO è stato letto in streaming (nessun file salvato).

## 1. Contesto

Obiettivo: per ogni cliente con servizio Sito **attivo**, decidere in modo ripetibile, spiegabile e misurato **8-20 ricerche
reali su cui puntare** e **quale pagina** risponde a ciascuna. Base di T5 (pagine da costruire), T6b (comuni che meritano una
pagina), T7 (cosa misurare), G1 (keyword della scheda).

Fatti che vincolano il piano (letti o verificati oggi):

- **Nessun `StepKey`**: il lavoro vive sul run-bus come `traffico:<slug>:mappa` (README §2). Il bus oggi conosce solo
  `kind: "cliente" | "fabbrica"`; `fileEventiPerId`, `agenteDaFase`, `percorsoRun`, `nomeStep` vanno estesi. I filtri esistenti
  (`build-panel`, `catena-card`, `step-run-live`) cercano `kind === "cliente"`: un terzo `kind` non li tocca.
- `run-step.ts` esegue fasi `claude` o `script`; T4 non usa `claude -p` (nessuna quota Max) né script esterni: il lavoro è un
  generatore TS che emette `RunEvent` (`phase`/`text`/`done`/`error`), accettato così com'è da `avvia()` del bus.
- `fonte()`/`memo()` sono cache **in memoria**: perfette per letture a TTL, inutili per non ripagare risposte dopo un riavvio.
  Serve una cache su disco.
- `secrets.ts` non ha chiavi DataForSEO; `KNOWN_KEYS` alimenta da solo la lista di Impostazioni (GET della route chiavi).
- `contesto.json` di Cavaliere: `servizi_atomizzati[].servizio` **senza id**, `macro_categorie[{nome, servizi}]`,
  `settore_normalizzato: "Edilizia"`, `zona.sede: "Cologno Monzese"` (solo nome). T3 porta in `dati.json` `RifServizio {id, nome}`
  senza dire come nasce l'id: **T4 unisce per nome normalizzato**, mai per id (§14, dubbio 8).
- T3: i consumatori usano `dati.json` e `foto.json` **solo con `stato: "verificato"`**. T6a: dataset in
  `site-renderer/data/comuni-fatti.json` con codici 2026, `alias`, `centro` (punto interno), `popolazione` 2025, `nomeAltraLingua`;
  l'editor non importa `site-renderer/src` → T4 legge il JSON (non il modulo).
- `.claude/scope.json` oggi = perimetro di **T1a** (in fase 2). T3 modificherà `app/traffico/[slug]/page.tsx` e
  `DESIGN-BRIEF.md`, gli stessi file della UI di T4: **fase 2 di T4 dopo T1a chiuso e dopo T3** (§11 M0).

Fuori perimetro: rank tracking periodico (T2b/T7), pagine e copy (T5), gate delle pagine-comune (T6b), ricerche di marca (le misura
Search Console, ricerca §3.4), analisi tecnica dei siti concorrenti (età, sitemap, schema: ricerca §4.3, rinviata).

## 2. Decisioni motivate

### 2.1 Fonte dei dati: DataForSEO, due endpoint, modalità Live

Verificato su docs.dataforseo.com e sulle pagine prezzi il 2026-09-14.

| Dato | Endpoint | Parametri fissati | Prezzo | Limiti |
|---|---|---|---|---|
| Volumi | `POST /v3/keywords_data/google_ads/search_volume/live` | `keywords` ≤ 1.000 per task (≤ 80 caratteri, ≤ 10 parole, convertite in minuscolo), `location_code`, `language_code: "it"`, `search_partners: false`, date di default (ultimi 12 mesi) | **0,09 $ a task** live, 0,06 $ standard (turnaround 1-3 ore); il costo non dipende dal numero di keyword | **12 richieste/minuto per account** sugli endpoint Google Ads Live |
| Risultati di Google | `POST /v3/serp/google/organic/live/advanced` | `keyword`, `location_coordinate: "lat,lng,raggio"` (raggio 199-199.999 mm), `language_code: "it"`, `device: "mobile"`, `os: "android"`, `depth: 10`, `load_async_ai_overview: true` | **0,002 $ a pagina da 10 risultati** live (0,0006 standard, 0,0012 priority); dal 19/09/2025 si paga ogni 10 risultati; `load_async_ai_overview` **+0,002 $** | 2.000 chiamate/min, 30 simultanee |
| Saldo (prima di spendere) | `GET /v3/appendix/user_data` → `money.balance` | — | gratis | — |
| Località Google Ads d'Italia | `GET /v3/keywords_data/google_ads/locations/it` | — | gratis | — |

Campi usati: volumi → `keyword`, `search_volume` (intero o `null`), `monthly_searches[]` (per la data dei dati), `spell`;
SERP → `check_url`, `datetime`, `item_types`, `items[]` di tipo `organic` (`rank_absolute`, `domain`, `url`, `title`),
`local_pack` (`domain`, `cid`, `is_paid`), `paid`, `ai_overview`, `local_services`; top-level `cost`, `status_code`,
`tasks[].status_code`.

Perché **Live** anche se costa di più: lo Standard dei volumi risponde in 1-3 ore (un lavoro che Mattia lancia dall'editor col Mac
acceso non può aspettare) e lo Standard delle SERP richiede `task_post` + polling di `tasks_ready` + `task_get`, codice in più per
risparmiare circa 0,19 $ a mappa. *ponytail: solo Live; passare a `task_post` sopra i 100 clienti o se i prezzi salgono.*

Scartati, con evidenza:
- **DataForSEO Labs `bulk_keyword_difficulty`**: «Country is the only supported location_type» — la difficoltà nazionale non
  descrive «servizio + comune»; e le long-tail comunali non sono nel suo database. La difficoltà la calcoliamo dalla SERP locale (§4).
- **Clickstream Search Volume**: esempio 0,15 $ per 4 keyword, copertura geografica non dichiarata: sproporzionato.
- **Backlinks API** per l'autorità dei concorrenti: rinviata; è il primo rialzo se la calibrazione (§12 C3) non raggiunge l'80 %.

### 2.2 Google Ads API (Keyword Planner): **non si costruisce**

| Domanda | Evidenza (2026-09-14) | Esito |
|---|---|---|
| Dati diversi da DataForSEO? | Help DataForSEO «What is Search Volume» (agg. 05/08/2025): Google Ads «provides the same data through API»; gli endpoint `keywords_data/google_ads/*` sono quella fonte. Doc località: il `location_code` «corresponds to Google's geographical targeting system» | stessa fonte, stessi geo target |
| Volumi esatti o fasce senza spesa? | Nessuna fonte primaria Google risponde: la pagina *Access levels* (agg. 2026-09-11) e *Generate Historical Metrics* (agg. 2026-09-10) non parlano di spesa né di fasce; i thread del forum API (2015, 2022) nemmeno. Le fasce «1K-10K» agli account senza spesa sono documentate solo per la **UI** (community Google Ads). In entrambe le strade il numero è comunque **arrotondato**: «Google has around 80 search volume values that are logarithmically proportioned» e le varianti vicine sono sommate (help DataForSEO; doc `search_volume`: «combined search volume values for groups of similar keywords») | nessun guadagno di precisione dimostrabile |
| Geo target comunali italiani? | CSV `locations_kwrd_2026_09_01.csv`: Italia = 1 Country (`2380`), 20 Region, 110 Province, **1.462 City**, **7.722 Municipality**; es. Cologno Monzese City `1008436` e Municipality `9201369`. Disponibili già via DataForSEO | nessun guadagno |
| Costo dell'accesso diretto | *Access levels*: Explorer **blocca** `KeywordPlanIdeaService`; Basic richiede brand verification e domanda da Google Cloud, «typically take» circa 10 giorni lavorativi. In più: OAuth (client, refresh token), customer id, developer token | complessità vera per risparmiare 0,18-0,45 $ a mappa |

**Decisione**: nessun client Google Ads. Il developer token esce dalla lista di Mattia per T4; G1 riusa `mappa-query.json`
(R1 §3 lo prevede già). Da riaprire solo se DataForSEO chiude l'endpoint o il prezzo sale di 10 volte. (Dubbio 1.)

### 2.3 Località per comune

- **Ricerche con il comune nel testo** («ristrutturazione bagno brugherio»): volume misurato sull'**Italia** (`location_code 2380`).
  Il testo porta già il luogo; misurarlo solo nel comune perderebbe chi cerca da Milano un'impresa di Brugherio. Un task ogni
  1.000 keyword.
- **Ricerche senza comune** («ristrutturazione bagno», «… vicino a me»): Google localizza la SERP; il volume si misura nel
  **comune della sede** (un task). `location_code` trovato nella lista gratuita delle località: nome normalizzato uguale a nome
  italiano, `nomeAltraLingua` di T6a o esonimo (tabella breve verificata sul CSV: Milan, Rome, Naples, Turin, Florence, Venice,
  Genoa, Padua, Syracuse, Mantua…), **e** regione uguale (tabella fissa delle 20 regioni in inglese: Lombardy, Apulia, Sardinia,
  «Trentino-Alto Adige/Sudtirol», da ricontrollare sul CSV in M2). A parità: **City** prima di **Municipality** (da calibrare,
  §12 C4). Sede non trovata → volumi delle implicite `non_richiesto` + avviso; nessuna località inventata.
- **SERP**: `location_coordinate` = punto interno del comune di T6a (`centro`), raggio fisso 100.000 mm. Funziona per tutti i
  7.896 comuni senza abbinamenti di nomi (nel CSV ci sono «Milan», «Ratschings»), è riproducibile ed è lo stesso punto della
  distanza di T6a. Implicite → punto della sede. Controllo in calibrazione contro `location_code` (§12 C5). `check_url` salvato
  per aprire la stessa SERP a mano.

### 2.4 Cache delle risposte

- Su disco in `~/.cache/site-factory/dataforseo/<endpoint>/<sha256>.json` (override `SF_DATAFORSEO_CACHE`), come la cache di T6a:
  fuori da git e dal sync di Drive. Chiave = sha256 dell'endpoint + corpo canonico (keyword ordinate, coordinate a 4 decimali).
  File = `{ richiesta, lettoAt, costoUsd, risposta }` (task intero, per poter rileggere campi in futuro).
- **TTL**: volumi 30 giorni (Google li aggiorna ogni mese), SERP 14 giorni, lista località 30 giorni. Un errore non va in cache.
- La cache serve a **non ripagare**; la **spiegabilità** vive in `mappa-query.json` (per ogni numero: endpoint, sha della
  richiesta, data, costo). Persa la cache si perde al massimo un ricalcolo (< 1 $).
- Nessun dato personale inviato: solo keyword di servizio + nomi di comuni e coordinate di centroidi. Nessuna ricerca di marca.
- Termini DataForSEO (§7.1 «not … compete with … search engine providers», §7.2 manleva): uso interno per i propri clienti, stessa
  lettura di R1 [interpretazione, non parere legale].

### 2.5 Costo per cliente

Fixture tipo Cavaliere (§3.5): 32 teste, 11 comuni, 824 keyword misurate, 60 SERP.

| Voce | Fixture | Caso peggiore (40 comuni) |
|---|---|---|
| Volumi con comune (Italia) | 726 keyword → 1 task → 0,09 $ | 3.680 → 4 task → 0,36 $ |
| Volumi senza comune (sede) | 98 keyword → 1 task → 0,09 $ | 1 task → 0,09 $ |
| SERP (live + AI Overview) | 60 × 0,004 $ = 0,24 $ | 80 × 0,004 $ = 0,32 $ |
| **Totale a mappa** | **≈ 0,42 $** | **≈ 0,77 $** |
| Ricalcolo entro i TTL · esclusione | 0 $ (cache / nessuna chiamata) | 0 $ |
| Anno, ricalcolo trimestrale | ≈ 1,7 $ | ≈ 3,1 $ |
| Campione di calibrazione (una tantum) | 384 × 0,004 $ = **1,54 $** | — |

Tetti rigidi per lavoro: ≤ 6 task di volumi e ≤ 100 SERP (costanti); saldo letto prima di spendere. Costo **reale** dal campo
`cost` di ogni risposta, una riga per chiamata pagata in `costi.ndjson` (§6.2).

## 3. Universo delle query

### 3.1 Ingressi (tutti obbligatori salvo `foto.json`)

| Ingresso | Da dove | Uso |
|---|---|---|
| Servizi, macro, settore, sede | `out/<slug>/contesto.json` | teste di servizio, pagine servizio, mestiere, nome della sede |
| Priorità, prezzi, comuni serviti | `out/<slug>/traffico/dati.json` con `stato: "verificato"` | priorità commerciale, ammissione di «costo», comuni |
| Cantieri | `out/<slug>/traffico/foto.json` (T3; considerato solo se `dati.json` verificato; foto con `escludi: false`) | prova per le pagine-comune candidate (§5) |
| Popolazione, centro, alias, altro nome | `site-renderer/data/comuni-fatti.json` (T6a) | taglia, coordinate SERP, distanza dalla sede |
| Dominio del cliente | `client.json` → `steps.build.deploy.dominio` | riconoscere il cliente nella SERP |
| Lessico e domini | `lib/mappa-lessico.json`, `lib/mappa-domini.json` (versionati, sha nella mappa) | regole |
| Esclusioni | `out/<slug>/traffico/mappa-esclusioni.json` | fuori dalla selezione |

**Sede**: `contesto.zona.sede` normalizzato → prima tra i `dati.comuni` (hanno `regione`), poi in `site-intake/data-src/comuni.json`
(stessa lettura di T3) solo se il nome è unico → codice → record T6a via `alias`. La sede entra sempre nei comuni delle query con
comune (avviso se non è tra i serviti). Non risolta → avviso, nessuna query implicita misurata.

### 3.2 Il lessico (`lib/mappa-lessico.json`)

Nessuna query nasce fuori dai servizi reali: il lessico traduce il **nome di un servizio del contesto** nelle 1-2 forme con cui lo
cercano gli italiani. Il volume decide poi quale forma esiste davvero; una forma senza volume non è un'invenzione, è una misura a zero.

```jsonc
{
  "versione": "2026-09-a",
  "fonti": ["p4-serp-italia.md §1 (struttura «servizio + comune» senza preposizione, modificatori)", "ricerca-traffico §6.2"],
  "mestieri": [
    { "settori": ["edilizia"], "teste": [
      { "testo": "impresa edile", "gruppo": "impresa-edile" }, { "testo": "ditta edile", "gruppo": "impresa-edile" },
      { "testo": "impresa di costruzioni", "gruppo": "impresa-costruzioni" },
      { "testo": "impresa ristrutturazioni", "gruppo": "impresa-ristrutturazioni" } ] }
  ],
  "servizi": [
    { "tutte": ["ristruttur", "bagn"], "teste": [ { "testo": "ristrutturazione bagno", "gruppo": "bagno" },
                                                 { "testo": "rifacimento bagno", "gruppo": "bagno" } ] },
    { "tutte": ["impiant", "idraulic"], "teste": [ { "testo": "idraulico", "gruppo": "idraulico", "mestiere": "idraulico" } ] },
    { "tutte": ["cappott", "termic"], "teste": [ { "testo": "cappotto termico", "gruppo": "cappotto" } ] }
    // … una voce per servizio tipico dei mestieri ConsulBuild (edile, ristrutturazioni, idraulico, elettricista,
    //   cappotto, serramenti, imbianchino, pavimenti)
  ],
  "vietati": ["migliore", "migliori", "economico", "low cost", "gratis", "urgente"]
}
```

Regole: nome del servizio normalizzato (NFKD, minuscolo, senza accenti e apostrofi) → ogni voce i cui prefissi `tutte` compaiono
tutti come inizio di parola; più voci possono valere; ordine del file = ordine delle teste. Prima testa di una voce = **primaria**,
le altre **sinonimi**. `mestiere` segna una testa che nomina un mestiere autonomo: se non è tra i mestieri del cliente (dal
`settore_normalizzato`) la riga ha `mestiereAltrui: true` (test «È» di R1 §4.2). Servizio senza voci → `serviziSenzaQuery`
(mostrato nei dettagli: è lavoro di curatela del lessico, mai una query inventata). `vietati` documenta i modificatori che non si
generano mai (superlativi non dimostrabili, liste-portale; urgenze che il cliente non ha dichiarato).

### 3.3 Modificatori e composizione

| Tipo | Modificatore | Forma | Ammessa se |
|---|---|---|---|
| con comune | `base` | `{testa} {comune}` | sempre |
| con comune | `preventivo` | `preventivo {testa} {comune}` | sempre |
| con comune | `costo` | `costo {testa} {comune}` | testa di **servizio** e almeno un servizio della testa ha un prezzo in `dati.prezzi` con `validoFino ≥ oggi` |
| senza comune | `base` | `{testa}` | sempre |
| senza comune | `vicino_a_me` | `{testa} vicino a me` | sempre |
| senza comune | `preventivo` | `preventivo {testa}` | sempre |
| senza comune | `costo` | `costo {testa}` | come sopra |

Fonti dei modificatori: p4 §1 («vicino a me», «preventivo», «costo/prezzi»; «ditta/impresa» come varianti di mestiere, qui già nel
lessico). Scartati con motivo: preposizioni «a/in» (Google somma le varianti vicine), frazioni e quartieri (solo grandi città),
«prezzi» (variante di «costo», stesso gruppo per Google).

Normalizzazione del testo: minuscolo, apostrofo → spazio, spazi compressi («cassina de' pecchi» → «cassina de pecchi»), accenti
conservati. Oltre 80 caratteri o 10 parole → riga non ammessa («troppo lunga per Google Ads»). Il testo è la **chiave stabile** della
riga (esclusioni, storico). Le righe non ammesse **non si misurano** (nessun costo) ma restano nell'universo col motivo.

### 3.4 Pagine disponibili

`home` · `servizio:<slug della macro>` (una per `macro_categorie`, slug kebab del nome; etichetta = nome) · `zone` ·
`comune:<istat>` (solo candidate). Sono chiavi di identità, non URL: T5a/T5c le traducono in slug congelati.

### 3.5 Esempio sulla fixture tipo Cavaliere

Fixture `scripts/fixtures/mappa-query/`: contesto con i 24 servizi e le 5 macro reali di Cavaliere; `dati.json` verificato con
priorità 1 Ristrutturazione bagni, 2 Ristrutturazioni complete di appartamenti, 3 Cappotti termici; un prezzo «Ristrutturazione
bagni da 4.500 € a lavoro, IVA inclusa»; 11 comuni lombardi: Cologno Monzese (MI) `015081` sede, Brugherio (MB) `108012`, Sesto San
Giovanni (MI) `015209`, Monza (MB) `108033`, Vimodrone (MI) `015242`, Cernusco sul Naviglio (MI) `015070`, Carugate (MI) `015051`,
Segrate (MI) `015205`, Pioltello (MI) `015175`, Cassina de' Pecchi (MI) `015060`, Milano (MI) `015146`; `foto.json` con un cantiere
verificato «Ristrutturazione bagni · Brugherio · 2025».

Lessico sui 24 servizi: 28 teste di servizio; 4 servizi senza query (Finiture interne ed esterne, Assistenza tecnica in cantiere,
Coordinamento delle lavorazioni, Ripristini e manutenzioni esterne); 4 teste di mestiere (edilizia). Conteggi attesi:

| Gruppo | Righe | Ammesse e misurate |
|---|---|---|
| con comune, servizio `base` + `preventivo` | 28 × 11 × 2 = 616 | 616 |
| con comune, servizio `costo` | 28 × 11 = 308 | 22 (solo le 2 teste del bagno) |
| con comune, mestiere `base` + `preventivo` | 4 × 11 × 2 = 88 | 88 |
| senza comune, servizio (4 modificatori) | 28 × 4 = 112 | 86 |
| senza comune, mestiere (`base`, `vicino_a_me`, `preventivo`) | 4 × 3 = 12 | 12 |
| **Totale** | **1.136** | **824** in 2 task |

| Testo | Tipo · modificatore | Testa (gruppo, origine) | Esito |
|---|---|---|---|
| impresa edile cologno monzese | con comune · base | impresa-edile, mestiere | ammessa |
| ristrutturazione bagno cologno monzese | con comune · base | bagno, servizio (priorità 1) | ammessa |
| rifacimento bagno brugherio | con comune · base | bagno, sinonimo | ammessa (cantiere verificato a Brugherio) |
| preventivo ristrutturazione appartamento monza | con comune · preventivo | appartamento (priorità 2) | ammessa |
| costo ristrutturazione bagno sesto san giovanni | con comune · costo | bagno | ammessa: prezzo verificato |
| costo cappotto termico segrate | con comune · costo | cappotto (priorità 3) | **non ammessa**: «nessun prezzo verificato per Cappotti termici» |
| cappotto termico vicino a me | senza comune · vicino_a_me | cappotto | ammessa, volume a Cologno Monzese |
| idraulico cologno monzese | con comune · base | idraulico, `mestiereAltrui` | ammessa, rilevanza dimezzata |
| preventivo cartongesso cassina de pecchi | con comune · preventivo | cartongesso | ammessa (apostrofo normalizzato) |
| impresa edile milano | con comune · base | impresa-edile | ammessa; difficoltà **alta** (Milano > 250.000 ab.) → mai target |

## 4. Classificazione della SERP e vincibilità

### 4.1 Riduzione

Da ogni risposta si salvano solo: `checkUrl`, data, `vuota` (status 40102 o zero organici), feature (`localPack` = schede non
pagate del local pack, `aiOverview`, `annunci` = item `paid`, `localServices`), i primi 10 `organic` (`pos`, `dominio`, `url`,
`titolo`) e i domini del local pack.

### 4.2 Classe di ogni risultato organico (in ordine, prima regola che vale)

| # | Regola | Classe | `regola` scritta nella riga |
|---|---|---|---|
| 1 | dominio = dominio del cliente (anche `www.`) | `cliente` | `cliente` |
| 2 | dominio o suo suffisso in `portali` | `portale` | `elenco:portali:prontopro.it` |
| 3 | in `directory` | `directory` | `elenco:directory:paginegialle.it` |
| 4 | in `altro` (social, lavoro, annunci, enciclopedie, produttori e catene, guide editoriali) | `altro` | `elenco:altro:facebook.com` |
| 5 | pubblica amministrazione: `.gov.it`, `comune.<x>.it`, `regione.<x>.it` | `altro` | `pa` |
| 6 | dominio presente anche nel local pack | `impresa_locale` | `local-pack` |
| 7 | fuori elenco, con segnale locale: nome del comune della query, della provincia o sigla tra parentesi nel titolo o nell'URL | `impresa_locale` | `ignoto+segnale-locale` |
| 8 | fuori elenco, senza segnale locale | `altro` | `ignoto` |

`lib/mappa-domini.json` = `{ versione, aggiornato, portali: [{dominio, nome, nota}], directory: [...], altro: [...] }`, semi dalla
misura p4 §2 e §4 (portali: prontopro.it, instapro.it, edilnet.it, starofservice.it, quotalo.it, habitissimo.it, cronoshare.it,
ristrutturazioni.com, artinrete.it; directory: paginegialle.it, paginebianche.it, virgilio.it, tuttocitta.it, cylex-italia.it,
infobel.com, misterimprese.it; altro: facebook.com, instagram.com, youtube.com, linkedin.com, it.indeed.com, subito.it,
wikipedia.org) ed estesa in calibrazione. I domini finiti nelle regole 7-8 escono in `dominiNonInElenco` (curatela). Niente
giudizi AI.

### 4.3 Difficoltà (per riga con SERP; testa e comune della query, o sede per le implicite)

| Fattore | Punti | Perché |
|---|---|---|
| F1 taglia del comune (T6a, popolazione 2025) | < 50.000 → 0 · 50.000-250.000 → +2 · > 250.000 → +5 · ignota → 0 con avviso | ricerca §3: capoluogo fuori portata nei primi 180 giorni; «servizio + comune medio» con directory forti = media |
| F2 imprese locali ottimizzate: `impresa_locale` con token della testa **e** del comune nel titolo | +1 ciascuna, max +4 | concorrenza che ha già fatto il lavoro on-page (p4 §4.2: city nel title nel 69 %) |
| F3 domini exact-match: etichetta del dominio con token della testa e del comune | +1 ciascuno, max +2 | tattica diffusa e forte (p4 §5.4) |
| F4 `portale` o `directory` nelle posizioni 1-3 | +1 ciascuno, max +3 | domini forti in cima |
| F5 risultati deboli: `altro` in top 10 | −1 ciascuno, max −3 | posti occupati da social, lavoro, fuori tema: spazio per un sito vero |
| F6 meno di 6 organici in top 10 | −1 | SERP scarna (p4 §5.2: sotto una soglia restano solo directory) |

Livello: **punti ≤ 2 bassa · 3-5 media · ≥ 6 alta**. SERP `vuota` → bassa con fattore «SERP senza risultati utili». Il cliente già
in top 10 non cambia i punti: si aggiunge il fattore informativo «già presente in posizione N» (0 punti). Limite dichiarato: nessun
dato sui link (la KD di Ahrefs è la media dei domini referenti, ricerca §3.1); si prova l'accordo con Mattia (§12 C3) prima di
aggiungerli.

Spazio organico (clic che la SERP lascia ai risultati): `O = 1 − 0,20·[local pack] − 0,15·[AI Overview] − 0,05·min(annunci, 4) −
0,10·[Local Services]`, minimo 0,4. Non cambia la difficoltà: pesa il volume (§5.1).

## 5. Punteggio, selezione, assegnazione

### 5.1 Punteggio (0-100, un decimale; costanti in `lib/mappa-query.ts` con `VERSIONE_REGOLE`)

`S = 100 × (0,35·V·O + 0,30·W + 0,20·P + 0,15·R)`

| Componente | Valori |
|---|---|
| V volume | `min(1, log10(1+vol) / log10(1001))`; `null` o 0 → 0 (scala assoluta: un'esclusione non cambia gli altri punteggi) |
| W vincibilità | bassa 1 · media 0,4 · alta 0 |
| P priorità commerciale | servizio in priorità 1 → 1 · 2 → 0,85 · 3 → 0,7 · stessa macro di una priorità → 0,4 · altro servizio → 0,2 · mestiere del cliente → 0,6 |
| R rilevanza | testa primaria 1 · sinonimo 0,8 · mestiere del cliente 0,9 · × 0,5 se `mestiereAltrui` · × vicinanza: sede 1, ≤ 10 km 0,9, ≤ 25 km 0,75, oltre 0,6, ignota 0,75 |

Esempio: «ristrutturazione bagno cologno monzese», volume 40, local pack presente, difficoltà media, priorità 1, sede:
V = log10(41)/log10(1001) = 0,5375; O = 0,8; S = 100 × (0,35 × 0,43 + 0,30 × 0,4 + 0,20 × 1 + 0,15 × 1) = **62,1**.

Ogni riga salva i fattori `{codice, testo, valore, punti}`: nessun numero senza la sua origine.

### 5.2 Candidati alla SERP (prima di spendere)

`Spre = 100 × (0,35·V + 0,20·P + 0,15·R)` sulle righe ammesse, misurate e non escluse; una sola riga per gruppo
`(testa.gruppo, comune, modificatore)` (la migliore); primi **60** gruppi, più i 3 migliori di ogni servizio prioritario se fuori
dai 60; tetto 100.

### 5.3 Selezione 8-20

1. Idonee: ammesse, non escluse, con SERP letta, difficoltà ≠ alta.
2. Duplicati d'intento: stesso gruppo e stesso comune (es. «rifacimento bagno monza» e «ristrutturazione bagno monza») → la
   migliore; due query con Jaccard ≥ 0,6 sugli URL della top 10 e stessa pagina → la migliore, l'altra «variante coperta».
3. Ordine: `S` desc → priorità (1, 2, 3, poi 0) → volume desc (`null` in fondo) → popolazione desc → testo asc (determinismo).
4. Presa: finché `S ≥ 35` e target < 20; massimo **3 per pagina** (la prima è `principale`); massimo metà dei target con volume
   `null` o 0, salvo che manchino alternative.
5. Copertura: ogni servizio prioritario con almeno una target se esiste una riga idonea (entra anche sotto soglia, al posto
   dell'ultima non prioritaria).
6. Sotto 8 con la soglia → si completa con le migliori idonee, `sottoSoglia: true`. Meno di 8 idonee in tutto → `stato:
   "insufficiente"` con i motivi (es. «42 query con difficoltà alta», «nessuna SERP letta per 3 comuni»).

### 5.4 Assegnazione query → pagina (prima regola che vale)

| # | Condizione | Pagina | Candidata · ripiego |
|---|---|---|---|
| A1 | testa di mestiere del cliente, senza comune o comune = sede | `home` | — |
| A2 | testa di mestiere del cliente, comune ≠ sede | `comune:<istat>` | candidata · ripiego `zone` |
| A3 | testa di servizio, senza comune o comune = sede (qualunque modificatore) | `servizio:<macro>` | — |
| A4 | testa di servizio, comune ≠ sede, cantiere **verificato** di un servizio della testa in quel comune (`foto.json`) | `comune:<istat>` | candidata · ripiego `servizio:<macro>` |
| A5 | testa di servizio, comune ≠ sede, senza cantiere | `servizio:<macro>` (menzione della zona) | — |

Macro: quella del servizio della testa con priorità più alta, a parità la prima in `macro_categorie`. Servizio in nessuna macro →
`home` con avviso. `mestiereAltrui` non va mai in `home`. Nessuna pagina servizio×comune: niente doorway (ricerca §4.2); le
pagine-comune restano **candidate** e le decide T6b con i suoi gate.

### 5.5 Frasi del «perché» (template fissi)

«Circa 40 ricerche al mese in Italia (Google Ads tramite DataForSEO, media set 2025 – ago 2026, valori arrotondati da Google).» ·
«Volume non misurato da Google Ads: sotto la soglia di misura o assente.» · «Difficoltà media (4 punti): Cologno Monzese ha
46.994 abitanti; 2 imprese locali con bagno e Cologno nel titolo; 2 portali o directory nei primi 3; 1 risultato debole.» ·
«Nella pagina di Google: mappa con 3 schede, nessuna panoramica AI, nessun annuncio.» · «Lavoro prioritario n. 1 del cliente:
Ristrutturazione bagni.» · «Pagina: servizio «Ristrutturazioni e manutenzioni», lavoro cercato nel comune della sede.» ·
«Punteggio 62,1 su 100 (volume 15,1 · difficoltà 12 · priorità 20 · rilevanza 15).»

## 6. Schemi

### 6.1 `out/<slug>/traffico/mappa-query.json` (`lib/mappa-query.ts`)

```ts
export const VERSIONE_REGOLE = "2026-09-a";
const Sha = z.string().regex(/^[a-f0-9]{64}$/);
const Istat = z.string().regex(/^\d{6}$/);
const Mese = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const MODIFICATORI = ["base", "vicino_a_me", "preventivo", "costo"] as const;
export const CLASSI = ["portale", "directory", "impresa_locale", "cliente", "altro"] as const;
const ENDPOINT_PAGATI = ["keywords_data/google_ads/search_volume/live", "serp/google/organic/live/advanced"] as const;

const Fonte = z.object({
  endpoint: z.enum(ENDPOINT_PAGATI),
  richiestaSha: Sha,                 // chiave della cache: la richiesta esatta
  lettoAt: z.string().datetime(),    // quando DataForSEO ha risposto (anche se servita dalla cache)
  costoUsd: z.number().nonnegative(),
}).strict();
const Fattore = z.object({ codice: z.string().min(1), testo: z.string().min(1),
  valore: z.union([z.number(), z.string(), z.null()]), punti: z.number() }).strict();

const Serp = z.object({
  fonte: Fonte,
  coordinate: z.string().regex(/^-?\d+\.\d{1,7},-?\d+\.\d{1,7},\d+$/),
  checkUrl: z.string().url(),
  vuota: z.boolean(),
  feature: z.object({ localPack: z.number().int().min(0), aiOverview: z.boolean(),
    annunci: z.number().int().min(0), localServices: z.boolean() }).strict(),
  organici: z.array(z.object({ pos: z.number().int().min(1).max(100), dominio: z.string().min(1),
    url: z.string().url(), titolo: z.string().max(300), classe: z.enum(CLASSI), regola: z.string().min(1) }).strict()).max(10),
  localPackDomini: z.array(z.string()).max(20),
}).strict();

const Riga = z.object({
  testo: z.string().min(2).max(80),                                   // chiave stabile
  tipo: z.enum(["con_comune", "senza_comune"]),
  modificatore: z.enum(MODIFICATORI),
  testa: z.object({ testo: z.string(), gruppo: z.string(), origine: z.enum(["servizio", "mestiere"]),
    primaria: z.boolean(), servizi: z.array(z.string()).max(24), macro: z.string().nullable(),
    mestiereAltrui: z.boolean() }).strict(),
  comune: z.object({ istat: Istat, nome: z.string(), sigla: z.string().regex(/^[A-Z]{2}$/),
    popolazione: z.number().int().positive().nullable(), km: z.number().int().min(0).nullable() }).strict(), // senza_comune = sede
  priorita: z.number().int().min(0).max(3),                           // 0 = nessuna
  ammessa: z.boolean(),
  motivi: z.array(z.string()),
  volume: z.object({
    valore: z.number().int().min(0).nullable(),
    stato: z.enum(["misurato", "non_disponibile", "non_richiesto"]),   // null da Google = non_disponibile
    geo: z.object({ locationCode: z.number().int().positive(), nome: z.string() }).strict().nullable(),
    datiAl: Mese.nullable(),
    fonte: Fonte.nullable(),
  }).strict(),
  serp: Serp.nullable(),
  difficolta: z.object({ livello: z.enum(["bassa", "media", "alta"]), punti: z.number().int(),
    fattori: z.array(Fattore).min(1) }).strict().nullable(),
  punteggio: z.object({ totale: z.number().min(0).max(100), fattori: z.array(Fattore).length(4) }).strict().nullable(),
}).strict();

const Pagina = z.object({
  chiave: z.string().regex(/^(home|zone|servizio:[a-z0-9-]+|comune:\d{6})$/),
  tipo: z.enum(["home", "servizio", "zone", "comune"]),
  etichetta: z.string().min(1),
  candidata: z.boolean(),
  ripiego: z.string().nullable(),
}).strict();

export const MappaQuerySchema = z.object({
  versione: z.literal(1),
  generataAt: z.string().datetime(),
  stato: z.enum(["completa", "parziale", "insufficiente"]),
  regole: z.object({ versione: z.string(), lessicoSha: Sha, dominiSha: Sha }).strict(),
  ingressi: z.object({ contestoSha: Sha, datiSha: Sha, fotoSha: Sha.nullable(), sede: Istat.nullable(),
    dominioCliente: z.string().nullable(), registrate: z.boolean() }).strict(),   // registrate = risposte di prova
  costo: z.object({ usd: z.number().nonnegative(), chiamatePagate: z.number().int().min(0),
    dallaCache: z.number().int().min(0) }).strict(),
  avvisi: z.array(z.string()),
  serviziSenzaQuery: z.array(z.string()),
  dominiNonInElenco: z.array(z.string()),
  universo: z.array(Riga).max(5000),
  pagine: z.array(Pagina).min(1),
  target: z.array(z.object({ testo: z.string(), pagina: z.string(), ruolo: z.enum(["principale", "secondaria"]),
    sottoSoglia: z.boolean(), perche: z.array(z.string()).min(1) }).strict()).max(20),
}).strict().superRefine(/* testi unici; ogni target → riga ammessa, non esclusa, difficoltà ≠ alta, pagina esistente;
  ≤ 3 target per pagina e una sola principale; stato "insufficiente" ⇔ target < 8; volume.stato "misurato" ⇔ fonte ≠ null */);

export const EsclusioniSchema = z.object({ versione: z.literal(1), voci: z.array(z.object({
  testo: z.string().min(2).max(80), motivo: z.string().trim().min(3).max(200), at: z.string().datetime() }).strict()).max(500) }).strict();
```

Accanto: `traffico/mappa-storico.ndjson`, una riga per mappa scritta `{at, versioneRegole, stato, target: [{testo, pagina}]}` (T7
deve sapere da quando una query è target; è l'unico storico). Scritture atomiche (tmp + rename). `client.json` mai toccato
(nessuna staleness indotta).

### 6.2 `out/<slug>/traffico/costi.ndjson`

```ts
export const RigaCostoSchema = z.object({
  at: z.string().datetime(),
  lavoro: z.enum(["mappa", "campione"]),
  endpoint: z.enum(ENDPOINT_PAGATI),        // solo chiamate a pagamento: le gratuite non fanno rumore
  task: z.number().int().positive(),
  voci: z.number().int().positive(),        // keyword del task o 1 SERP
  costoUsd: z.number().nonnegative(),       // campo `cost` della risposta, mai stimato
  statusCode: z.number().int(),             // status_code DataForSEO o HTTP
  esito: z.enum(["ok", "errore"]),
  durataMs: z.number().int().nonnegative(),
}).strict();
```

Una riga per chiamata pagata effettivamente partita (anche se fallita); nessuna riga per le risposte dalla cache. Il campione scrive
in `docs/traffico/calibrazione-T4/costi.ndjson`.

## 7. Lavoro sul run-bus

- **Id** `traffico:<slug>:mappa`, `kind: "traffico"`, `step: "mappa"`, `label` = azienda. Eventi in
  `out/<slug>/traffico/logs/run-mappa.ndjson` (tee del bus, riletto da `eventiDaFile` dopo un riavvio).
- **Avvio** `startTrafficoRun(slug, "mappa", label, esegui)` rifiuta se lo stesso id è vivo **o se un'altra mappa è in corso**
  (un solo account DataForSEO: 12 richieste/min sugli endpoint Google Ads live). Priorità rispetto alla catena demo: nessun
  conflitto, T4 non usa la quota Max.
- **Ingressi letti dalla route prima di avviare** (snapshot): ciò che cambia durante il lavoro vale al calcolo successivo
  (staleness per sha, §8).

| Fase (`phase`) | Cosa fa | Testo (`text`) tipico |
|---|---|---|
| Controllo dei dati | schemi di contesto, dati, foto, dataset T6a; sede; saldo (`user_data`) ≥ 2 × stima | «Saldo DataForSEO 48,20 $, stima 0,42 $» |
| Ricerche possibili | universo, esclusioni | «1.136 ricerche, 824 da misurare, 4 lavori senza ricerche» |
| Volumi di ricerca | lotti ≤ 1.000, uno alla volta, ≥ 5 s tra le chiamate Google Ads | «Lotto 1/2: 726 ricerche (Italia) · dalla cache» |
| Risultati di Google | candidati, 5 SERP in parallelo | «SERP 30/60» ogni 10 |
| Classificazione e punteggio | classi, difficoltà, punteggi, selezione, pagine | «14 ricerche scelte su 5 pagine · 12 domini fuori elenco» |
| Scrittura della mappa | `mappa-query.json`, `mappa-storico.ndjson` | → `done` con `traffico/mappa-query.json` |

**Errori** (`ErroreDfs` con `tipo`; messaggi in italiano, mai credenziali):

| Codice | Tipo | Comportamento | Messaggio |
|---|---|---|---|
| HTTP 401, 40100 | `auth` | stop | «DataForSEO ha rifiutato login o password: controllali in Impostazioni → Chiavi API.» |
| 40200, 40210; saldo < 2 × stima | `credito` (**quota esaurita**) | stop; le risposte già pagate restano in cache | «Credito DataForSEO esaurito (40210): ricarica e rilancia, le risposte già pagate non si ripagano.» |
| 40202, 40209, HTTP 429 | `limite` | 3 tentativi (5 s, 15 s, 45 s), poi stop | «DataForSEO limita le richieste: riprova tra qualche minuto.» |
| 50000, 50401, HTTP 5xx, rete | `servizio` | 3 tentativi, poi stop | «DataForSEO non risponde (50401): riprova più tardi.» |
| 40501, 40503 | `richiesta` | stop | «DataForSEO ha rifiutato la richiesta (40501 Invalid Field): difetto dell'editor, vedi docs/DEBUG.md.» |
| risposta fuori forma | `forma` | stop | «Risposta DataForSEO inattesa in tasks[0].result[0].items: …» |
| 40102 su una SERP | — | riga con SERP `vuota` | — |
| errore di un solo task SERP dopo i tentativi | — | riga `serp: null`, avviso, mappa `parziale` | «SERP non letta per "…" (50000)» |
| stop dalla status bar | abort | `fetch` interrotte, nessuna mappa scritta | «run interrotto» |

Uno stop lascia intatta la mappa precedente. Nessuno stato «in corso» su disco → nessuno zombie da riparare.

## 8. UI (mini-shape, coerente con T0 e T3)

**Posto**: dentro la card «Sito» di `/traffico/[slug]`, dopo il blocco «Dati per farti trovare» di T3, sotto-sezione
`<section aria-labelledby>` con h3 **«Ricerche su cui puntare»** + badge. Visibile con Sito `attivo` o `sospeso`; nascosta se spento.

```
│ ─ Ricerche su cui puntare ──────────────────────────────────────── [Pronta] ─ │
│ Calcolata il 14/09/2026 · volumi Google Ads fino ad agosto 2026 ·              │
│ pagine di Google lette il 14/09 · costo 0,42 $                  [Ricalcola…]   │
│                                                                                │
│ Home                                                                           │
│   impresa edile cologno monzese                70 al mese · [Difficoltà media] │
│   ▸ Perché                                                        Escludi…     │
│ Servizio · Ristrutturazioni e manutenzioni                                     │
│   ristrutturazione bagno cologno monzese       40 al mese · [Difficoltà bassa] │
│   ▸ Perché                                                        Escludi…     │
│   ristrutturazione bagno                90 al mese a Cologno · [Difficoltà bassa]│
│ Comune da valutare · Brugherio (MB)  se la pagina non nasce: Ristrutturazioni… │
│   rifacimento bagno brugherio        volume non misurato · [Difficoltà bassa]  │
│ ▸ Dettagli del calcolo: 1.136 ricerche · 824 misurate · 60 pagine di Google ·  │
│   lavori senza ricerche (4) · domini da classificare (12) · avvisi (1)         │
│ ▸ Escluse da te (2)                                                            │
```

- Gruppi per pagina (home → servizi in ordine di macro → comuni candidati → zone); righe a blocco che vanno a capo a 400 px, nessuna
  tabella larga. Volume in `mono`; «al mese» (con comune) o «al mese a Cologno» (senza). Badge difficoltà con la parola:
  bassa `ok`, media `warn`. «Perché» = `<details>` nativo con le frasi del §5.5 e il link «Apri la ricerca su Google ↗» (`checkUrl`).
- «Escludi…» (`btnGhost`) → `ConfirmDialog` tono `brand`: titolo «Escludere questa ricerca?», messaggio «"…" esce dalle
  ricerche su cui puntare e il posto va alla successiva. Non si spende credito.», `children` = textarea «Perché la escludi»
  (3-200 caratteri, `confirmDisabled` finché non è valida), bottone «Escludi la ricerca». Poi `router.refresh()`, focus sull'h3.
- «Ricalcola…» → `ConfirmDialog`: «Ricalcolare la mappa?» · «Volumi dell'ultimo mese e pagine di Google degli ultimi 14 giorni
  vengono dalla cache; il resto si paga a DataForSEO, al massimo circa {stima} $. Le esclusioni restano.»
- In calcolo: fase da `useRuns()` (`kind === "traffico" && slug && step === "mappa"`), tempo `mono` `aria-hidden`, frase «Puoi
  chiudere la pagina: il calcolo continua.»; alla sparizione del run `router.refresh()`. Stop solo dalla status bar (chip quadrato:
  `agenteDaFase` restituisce «script»).

| Stato | Badge | Cosa si legge | Primaria | Secondarie |
|---|---|---|---|---|
| chiavi assenti | `idle` Non configurata | «Per calcolare la mappa servono login e password di DataForSEO in Impostazioni → Chiavi API.» | — (Calcola disabilitato, `aria-describedby`) | — |
| dati assenti o da verificare | `idle` In attesa dei dati | «La mappa parte dai lavori prioritari e dai comuni confermati in «Dati per farti trovare».» | — | — |
| dataset comuni assente, contesto invalido, sede non risolta senza comuni | `err` Bloccata | motivo con il percorso in `mono` | — | — |
| pronta a calcolare | `brand` Da calcolare | «Sceglie da 8 a 20 ricerche reali tra quelle possibili per i lavori e i comuni del cliente. Costo stimato circa {stima} $.» | **Calcola la mappa** | — |
| in calcolo | `brand` In calcolo | fase + tempo | — | — |
| ultimo calcolo fallito, nessuna mappa | `err` Non riuscita | `Banner err` col messaggio (ultimo `error` di `run-mappa.ndjson`) | **Riprova** | — |
| ultimo ricalcolo fallito, mappa precedente | come la mappa | `Banner err` «L'ultimo ricalcolo non è riuscito: …; resta la mappa del gg/mm.» | — | Ricalcola… |
| pronta | `ok` Pronta | meta + gruppi | — | Ricalcola… · Escludi… |
| parziale | `warn` Parziale | «N ricerche senza pagina di Google letta.» | — | Ricalcola… |
| poche ricerche | `warn` Poche ricerche | «Solo N ricerche utilizzabili (ne servono almeno 8):» + motivi | — | Ricalcola… |
| ingressi cambiati (sha diversi) | `warn` Da ricalcolare | `Banner warn` con i file cambiati in `mono` (contesto.json, dati.json, foto.json, lessico, domini) | **Ricalcola…** | Escludi… |
| Sito sospeso | `idle` In pausa | mappa in lettura, «Servizio sospeso: la mappa resta com'è.» | — | — |

Una sola primaria nella pagina: nei casi in cui il blocco di T3 ha la sua primaria (dati da verificare) la mappa è bloccata e il suo
bottone è `btnSecondary` disabilitato. Anti-obiettivi: niente posizioni, clic o clienti stimati, niente percentuali, niente grafici,
niente «keyword» o «SERP» nei testi. Solo token e componenti di `DESIGN-SYSTEM.md` §5; nessuna coppia di colori nuova.
Riammettere una query esclusa **non** è previsto dal brief (dubbio 7): si toglie a mano da `mappa-esclusioni.json` (riga in DEBUG.md).

## 9. Campione delle 384 SERP e protocollo di giudizio

`scripts/campione-serp.ts` (editor, `node --experimental-strip-types`), stesso client e stesse regole della mappa:

- `esegui [--registrate <dir>] [--conferma-spesa]` — matrice 8 mestieri × 12 comuni × 4 modificatori (ricerca §4.3): mestieri
  «impresa edile», «ristrutturazione bagno», «idraulico», «elettricista», «cappotto termico», «serramenti», «imbianchino», «posa
  pavimenti»; modificatori base («{m} {comune}»), «{m} vicino a me» (coordinate del comune), «preventivo {m} {comune}», «costo {m}
  {comune}»; comuni **piccoli** < 50.000 ab.: Sandrigo (VI) `024091`, Cologno Monzese (MI) `015081`, Città di Castello (PG)
  `054013`, Nardò (LE) `075052`; **medi** 50.000-250.000: Monza (MB) `108033`, Treviso (TV) `026086`, Perugia (PG) `054039`, Pescara
  (PE) `068028`; **grandi** > 250.000: Milano `015146`, Torino `001272`, Roma `058091`, Napoli `063049` (Nord 6, Centro 3, Sud 3).
  Popolazione e coordinate dal dataset T6a: se un comune esce dalla sua fascia lo script si ferma. Senza `--conferma-spesa` stampa
  solo la stima (1,54 $) ed esce. Scrive `docs/traffico/calibrazione-T4/campione-<data>.ndjson` (una SERP ridotta e classificata per
  riga, ≈ 3 KB) e `composizione-<data>.json`: per taglia × mestiere × modificatore e marginali, quota di `portale`/`directory`/
  `impresa_locale`/`altro` in top 10, SERP senza imprese locali, local pack (presenza, schede medie), AI Overview, annunci medi,
  Local Services, quota di organici classificati da `ignoto`, distribuzione dei livelli di difficoltà; stampa la tabella.
- `giudizio <campione.ndjson>` — 20 righe stratificate (7 per ciascun livello del software se possibili, tutte le taglie), ordine
  casuale con seme fisso, **cieche** (senza livello né punti): `giudizio-<data>.csv` con `id, query, comune, abitanti, top10 ("pos.
  dominio — titolo" | …), local_pack, ai_overview, annunci, check_url, giudizio, note`.
- `accordo <giudizio.csv>` — accordo esatto e adiacente, matrice 3×3, righe in disaccordo con i fattori.

Protocollo (≈ 30 minuti di Mattia): per ogni riga, guardando la top 10 (e se serve `check_url`): «Un sito nuovo di un'impresa
locale, con una pagina curata per questa ricerca e senza link, entra nei primi 10 in 4-10 settimane?» → `bassa` (probabile) ·
`media` (forse, in mesi e con qualche link locale) · `alta` (no nei primi 6 mesi) — le fasce della ricerca §3. Atteso **accordo
esatto ≥ 80 %** (16/20). Sotto: si ritoccano prima le soglie (2/3 e 5/6), poi i punti dei fattori, sul campione intero; nuove 20
righe mai viste per confermare (niente taratura sulle stesse righe). Esito in «Calibrazione».

## 10. File

| File | Tipo | Cosa |
|---|---|---|
| `site-factory-editor/lib/mappa-query.ts` | A | schemi §6, normalizzazione, universo §3, lotti dei volumi, candidati §5.2, punteggio, selezione, assegnazione, frasi, `vistaMappa` (modello per la UI), `motivoBloccoMappa`, `stimaCostoUsd`, staleness per sha; puro, import `.ts` |
| `site-factory-editor/lib/serp-classifica.ts` | A | riduzione della SERP, classi §4.2, difficoltà §4.3, spazio organico; puro (lo usano mappa e campione) |
| `site-factory-editor/lib/mappa-lessico.json` | A | lessico §3.2 |
| `site-factory-editor/lib/mappa-domini.json` | A | elenchi §4.2 |
| `site-factory-editor/lib/dataforseo.ts` | A | client: Basic auth dal Keychain, trasporto iniettabile, `SF_DATAFORSEO_REGISTRATE` (risposte registrate per E2E senza chiave), cache su disco §2.4, tentativi, `ErroreDfs`, costi, `saldo`, `localitaIT`, `trovaLocalita`, `volumi`, `serp`, `configurata()` |
| `site-factory-editor/lib/mappa-lavoro.ts` | A | lettura ingressi (contesto, `dati.json`/`foto.json` con gli schemi di T3, JSON T6a con alias, sede), generatore delle fasi §7, scritture atomiche, `ricalcolaDopoEsclusione` |
| `site-factory-editor/lib/run-bus.ts` | M | `kind: "traffico"`, `busIdTraffico`, `startTrafficoRun` (una mappa alla volta), `fileEventiPerId` |
| `site-factory-editor/lib/agenti.ts` | M | `kind` allargato; `percorsoRun` → `/traffico/<slug>`; `nomeStep` → «Traffico · mappa» |
| `site-factory-editor/lib/secrets.ts` | M | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` + etichette |
| `site-factory-editor/app/api/setup/keys/route.ts` | M | prova reale: `user_data` con la coppia (login da solo = formato; prova combinata se l'altra metà è salvata, come l'account Cloudflare) |
| `site-factory-editor/app/api/clients/[slug]/traffico/mappa/route.ts` | A | `POST {azione:"calcola"}` → 202 `{id}` · `POST {azione:"escludi", testo, motivo}` → 200; 400 slug/corpo · 403 `Sec-Fetch-Site` · 415 content-type · 404 cliente · 409 `client.json` illeggibile, Sito non attivo, blocco (§8), calcolo in corso, mappa assente · 422 query non nell'universo |
| `site-factory-editor/components/traffico-mappa.tsx` | A | blocco §8 (client: azioni, dialog, fase live) |
| `site-factory-editor/app/traffico/[slug]/page.tsx` | M | legge mappa, esclusioni, blocco e staleness; monta `TrafficoMappa` nella card Sito |
| `site-factory-editor/scripts/test-mappa-query.ts` | A | banco §12 |
| `site-factory-editor/scripts/campione-serp.ts` | A | §9 |
| `site-factory-editor/scripts/fixtures/mappa-query/contesto.json`, `dati.json`, `foto.json`, `comuni-fatti.json`, `localita-it.json` | A | fixture §3.5 (comuni e località: estratti veri di T6a e del CSV DataForSEO) |
| `site-factory-editor/scripts/fixtures/mappa-query/risposte/*.json` | A | risposte registrate sulla forma documentata: `volumi-italia`, `volumi-sede`, 8 `serp-*` (local pack, AI Overview, annunci, solo directory, Milano, vuota 40102), `errore-40100`, `errore-40210`, `errore-40202`, `errore-50000`, `user-data`; sostituite da 3 risposte reali in calibrazione |
| `site-factory-editor/DESIGN-BRIEF.md` | M | sezione «Ricerche su cui puntare (shape — data)» |
| `docs/traffico/calibrazione-T4/` | A (solo con chiave e ok alla spesa) | `campione-<data>.ndjson`, `composizione-<data>.json`, `giudizio-<data>.csv`, `costi.ndjson` |
| `docs/traffico/piano-T4.md` | M | Calibrazione, Verifica, chiusura |
| `docs/traffico/README.md` | M | §7 T4 («fatto, da calibrare con chiave»); §8 developer token Google Ads tolto (se dubbio 1 approvato) |
| `docs/handoff-fase-c.md` | M | stato T4 |
| `docs/DEBUG.md` | M | «la mappa non parte o fallisce» → `traffico/logs/run-mappa.ndjson` (fasi, errore) + `costi.ndjson`; «numeri strani» → `mappa-query.json` (`fonte.richiestaSha` → file in `~/.cache/site-factory/dataforseo/`); «dominio classificato male» → `mappa-domini.json`; «riammettere una query» → `mappa-esclusioni.json` a mano |

Fixture fuori git: `site-renderer/out/zz-test-t4/` (`client.json` con Sito attivo e dominio finto, `brief.json`, `contesto.json`,
`traffico/dati.json` verificato, `traffico/foto.json`), nel Cestino a fine fase 4.

Non si toccano: `lib/steps.ts`, `lib/catena.ts`, `lib/build.ts`, `lib/deploy.ts`, `lib/schemas.ts`, `lib/traffico.ts`,
`lib/clients.ts`, `lib/staleness.ts`, `lib/run-step.ts`, i file di T3 (`lib/dati-traffico*.ts`), renderer, `site-intake/`, n8n, skill.

## 11. Perimetro per `.claude/scope.json` (primo atto della fase 2, a perimetro di T1a svuotato)

```json
{
  "task": "T4 Mappa query → pagine (docs/traffico/piano-T4.md)",
  "perimetro": [
    "site-factory-editor/lib/mappa-query.ts",
    "site-factory-editor/lib/serp-classifica.ts",
    "site-factory-editor/lib/mappa-lessico.json",
    "site-factory-editor/lib/mappa-domini.json",
    "site-factory-editor/lib/dataforseo.ts",
    "site-factory-editor/lib/mappa-lavoro.ts",
    "site-factory-editor/lib/run-bus.ts",
    "site-factory-editor/lib/agenti.ts",
    "site-factory-editor/lib/secrets.ts",
    "site-factory-editor/app/api/setup/keys/route.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/mappa/route.ts",
    "site-factory-editor/app/traffico/[slug]/page.tsx",
    "site-factory-editor/components/traffico-mappa.tsx",
    "site-factory-editor/scripts/test-mappa-query.ts",
    "site-factory-editor/scripts/campione-serp.ts",
    "site-factory-editor/scripts/fixtures/mappa-query/**",
    "site-factory-editor/DESIGN-BRIEF.md",
    "docs/traffico/**",
    "docs/DEBUG.md",
    "docs/handoff-fase-c.md"
  ]
}
```

La cache `~/.cache/site-factory/dataforseo/` e la fixture in `site-renderer/out/` sono scritte da Node o esenti dal guard.

## 12. Milestone (ogni verifica passa prima della successiva)

**M0 — Precondizioni (nessun codice).** `scope.json` di T1a svuotato; T3 ha committato `lib/dati-traffico.ts` (schemi) e la sezione
del dettaglio; T6a ha committato `site-renderer/data/comuni-fatti.json`. Se T6a manca: si sviluppa sulla fixture e il lavoro reale
resta bloccato con motivo. Rilettura in `node_modules/next/dist/docs/` di `route.md`, `dynamic-routes.md`, `use-router.md`.
`git log --oneline -5`, `git status --short`.

**M1 — Regole pure.** `mappa-query.ts`, `serp-classifica.ts`, lessico, domini, fixture, banco casi 1-8 e 15-26. Verifica: banco verde,
`npx tsc --noEmit`. Nessun commit da solo.

**M2 — Client e chiavi.** `dataforseo.ts`, `secrets.ts`, route chiavi, banco casi 9-14, 27. Verifica: banco, `tsc`, `npm run build`;
tabella delle regioni e degli esonimi confrontata col CSV pubblico (streaming, nessun file); con le chiavi di Mattia: prova in
Impostazioni (solo `user_data`, gratis). **Commit 1** (M1+M2) + push.

**M3 — Lavoro e route.** `run-bus.ts`, `agenti.ts`, `mappa-lavoro.ts`, route; banco casi 28-30. Verifica sul dev server (:3311) con
`zz-test-t4` e `SF_DATAFORSEO_REGISTRATE=scripts/fixtures/mappa-query/risposte`: (1) `calcola` → 202, run nella status bar con le 6
fasi, `mappa-query.json` valido (schema) con 8-20 target, `costi.ndjson` con 2 righe «volumi» e le righe SERP; (2) secondo
`calcola` → mappa uguale salvo `generataAt`, nessuna riga di costo nuova; (3) `escludi` una target → 200, rimpiazzata, universo
invariato, nessuna chiamata; (4) risposte 40210 → errore «Credito…», mappa precedente intatta (sha); (5) senza chiavi né variabile
→ 409 «non configurata»; (6) Sito sospeso, `client.json` illeggibile, dati da verificare → 409 col motivo; (7) due `calcola` in
parallelo su due clienti → il secondo 409; (8) stop dalla status bar → «interrotto», nessuna mappa scritta. sha256 di `client.json`
della fixture prima e dopo: identici. **Commit 2** + push.

**M4 — UI.** `traffico-mappa.tsx`, `page.tsx`, sezione in `DESIGN-BRIEF.md`. Verifica: `tsc`, `npm run build`; browser a 1280 e 400 px,
tema chiaro e scuro, ogni stato della tabella §8 (fixture con varianti di file), dialog Escludi con tastiera (`Esc`, focus, textarea
obbligatoria), Ricalcola, fase live; `impeccable detect --json` sui file UI; `/impeccable critique` sul blocco. **Commit 3** + push.

**M5 — Campione.** `campione-serp.ts`, banco casi 31-33; `esegui --registrate` sulle fixture. Con chiave **e ok esplicito di Mattia
alla spesa (≈ 1,54 $)**: `esegui --conferma-spesa`, `giudizio`, giudizio di Mattia, `accordo`; controlli C1-C7 (§«Calibrazione»).
**Commit 4** + push.

**M6 — Chiusura.** DEBUG.md, README §7, handoff, «Verifica»; diff riga per riga; file toccati = §10; fixture nel Cestino;
`scope.json` svuotato; commit finale dopo le verifiche dell'orchestratore.

## 13. Banco `scripts/test-mappa-query.ts` (senza rete, stile `test-traffico-stato.ts`)

Universo
1. Fixture Cavaliere → 32 teste, i 4 servizi senza query elencati, 1.136 righe, 824 misurabili (tabella §3.5).
2. Normalizzazione: «Cassina de' Pecchi» → «cassina de pecchi»; niente doppi spazi; 81 caratteri o 11 parole → non ammessa col motivo.
3. Tracciabilità: ogni riga ha una testa legata a un servizio del contesto o al mestiere del settore; nessun testo con `vietati`.
4. `costo` senza prezzo → non ammessa col motivo; con prezzo scaduto (`validoFino` < oggi) → non ammessa; valido → ammessa.
5. Priorità con nome assente dal contesto → avviso, nessuna query, nessuna eccezione.
6. Comune con codice soppresso (alias T6a) → risolto; comune ignoto → avviso e saltato.
7. Sede omonima non tra i serviti → nessuna sede, implicite `non_richiesto`, avviso; sede fuori dai serviti → aggiunta con avviso.
8. `motivoBloccoMappa`: dati assenti, `da_verificare`, contesto invalido, dataset assente, chiavi assenti, Sito sospeso → frase esatta; tutto ok → `null`.

Client e volumi
9. Lotti: keyword ordinate, ≤ 1.000 per task, `2380` per le query con comune, codice della sede per le altre; permutare l'input non cambia i lotti.
10. `search_volume: null` → `non_disponibile`; `0` → `misurato` 0; `datiAl` = ultimo mese di `monthly_searches`.
11. Cache: seconda chiamata identica senza `fetch` e senza riga di costo; TTL scaduto → `fetch`; risposta d'errore mai in cache.
12. Errori: 40100 → `auth` subito (1 tentativo); 40210 → `credito`; 40202 poi 20000 → ok al 2° tentativo (attese finte); 50000 ×3 → `servizio`; `fetch` che lancia → `servizio`; forma sbagliata → `forma` col percorso.
13. Saldo < 2 × stima → errore `credito` prima di qualunque chiamata pagata.
14. `costi.ndjson`: una riga per chiamata pagata col `cost` della risposta; valida con `RigaCostoSchema`; nessuna credenziale nelle righe né nei messaggi.

Località
15. `trovaLocalita`: Cologno Monzese (Lombardia) → City `1008436` prima di Municipality `9201369`; «Cologno al Serio» non confuso; Milano → «Milan» via esonimo; Bolzano → trovato; nome assente → `null`.

Classificazione
16. Regole §4.2 una per una: `www.` e `it.` come suffissi; `comune.monza.it` e `.gov.it` → `pa`; dominio anche nel local pack → `impresa_locale`; ignoto con «Brugherio» nel titolo → `impresa_locale`; ignoto senza segnali → `altro`; dominio del cliente → `cliente`.
17. Feature: schede del local pack senza `is_paid`, AI Overview, annunci contati, Local Services.
18. SERP vuota (40102 o zero organici) → `vuota`, difficoltà bassa col fattore dedicato.

Difficoltà e punteggio
19. Milano → alta; SERP con 5 imprese ottimizzate a Cologno → media; comune piccolo con solo directory e social → bassa; somma dei fattori = punti; confini 2/3 e 5/6.
20. Esempio §5.1 → 62,1 esatto; `O` minimo 0,4; `V` con 0, `null`, 1.000, 50.000.

Selezione e assegnazione
21. Fixture: 8 ≤ target ≤ 20; ≤ 3 per pagina con una principale; ogni priorità coperta; nessuna alta; «rifacimento bagno X» e «ristrutturazione bagno X» mai entrambe; metà massima con volume nullo.
22. Meno di 8 idonee → `insufficiente` coi motivi; tutti i volumi `null` → 8 target scelti per W, P, R con «volume non misurato» nel perché.
23. Esclusione di una target → sparisce, entra la successiva, nessun altro punteggio cambia; testo assente → errore; motivo < 3 caratteri → errore.
24. A1-A5: mestiere + sede → `home`; mestiere + altro comune → `comune:` candidata, ripiego `zone`; servizio + sede → `servizio:ristrutturazioni-e-manutenzioni`; servizio + Brugherio con cantiere verificato → `comune:108012`; senza cantiere → pagina servizio; `mestiereAltrui` mai `home`.
25. Determinismo: pipeline completa due volte con trasporto finto → uguale salvo `generataAt`; input permutati (servizi, comuni, item SERP) → uguale.
26. Staleness: cambio di sha di `dati.json`, `contesto.json`, lessico o domini → `vistaMappa().daRicalcolare` con l'elenco dei file.

Chiavi
27. Senza chiavi e senza `SF_DATAFORSEO_REGISTRATE` → `configurata()` false, `motivoBloccoMappa` «non configurata», nessuna eccezione.

Lavoro
28. Generatore con trasporto finto: sequenza delle 6 fasi, `done` con l'artifact; su 40210 un solo `error` e nessun file scritto.
29. Un task SERP in errore permanente → mappa `parziale` con avviso.
30. `agenteDaFase(<ognuna delle 6 fasi>, "mappa", "traffico").sfera === false` (chip «script», nessuna regola AI catturata per sbaglio); `percorsoRun` → `/traffico/<slug>`.

Campione
31. Matrice = 384 query uniche; comune fuori fascia → errore; senza `--conferma-spesa` nessuna chiamata.
32. `giudizio`: 20 righe, colonne cieche, stesso seme → stesso file.
33. `accordo` su un CSV di 20 righe con 17 uguali → 85 %, matrice corretta.

## 14. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **Volumi `null` diffusi** nei comuni piccoli | `null` ≠ 0 dichiarato; selezione per vincibilità, priorità e rilevanza; massimo metà dei target senza volume; popolazione nel perché |
| Varianti sommate da Google (stesso numero su forme diverse) | gruppi del lessico + Jaccard sulla top 10; il volume si legge «circa, arrotondato da Google» |
| **Difficoltà senza dati sui link** | calibrazione con giudizio cieco ≥ 80 %; primo rialzo: Backlinks API sui domini della top 10 (costo da misurare) |
| Elenco domini incompleto | regole 6-8 prudenti; `dominiNonInElenco` in UI e nel campione; C1: quota `ignoto` ≤ 15 % |
| SERP per coordinate ≠ telefono vero | C5 contro `location_code`; `checkUrl` per il controllo a mano; `device: mobile` dichiarato |
| Costi fuori controllo (bug, cicli) | tetti per lavoro (6 task, 100 SERP), saldo prima di spendere, cache, `--conferma-spesa` nel campione, costo reale per chiamata |
| Limite Google Ads live (12/min) e 30 simultanee | una mappa alla volta in tutto l'editor, ≥ 5 s tra i lotti, 5 SERP in parallelo, tentativi su 40202/40209 |
| Credenziali nei log | Basic auth costruita in memoria; messaggi e righe di costo senza header; banco 14 |
| Mappa vecchia rispetto ai dati | sha degli ingressi e delle regole → «Da ricalcolare» col nome dei file |
| **Doorway** (servizio × comune) | nessuna pagina servizio×comune; pagine-comune solo candidate e con prova (cantiere verificato); T6b decide |
| Query di mestieri che il cliente non fa come attività | `mestiereAltrui`: rilevanza dimezzata, mai home |
| Promesse implicite nella UI | niente posizioni, clic o stime di traffico; «volume» come ricerche medie arrotondate con fonte e data |
| Forma delle API cambiata | parse Zod solo dei campi usati; errore `forma` col percorso; fixture sostituite da risposte reali in calibrazione |
| Termini DataForSEO (§7.1-7.2 in R1) | uso interno per i propri clienti, nessuna rivendita dei dati; rischio verso Google a carico di ConsulBuild dichiarato |
| Collisione con T1a e T3 (stessi file UI) | fase 2 dopo T1a chiuso e dopo T3 (M0); perimetro unico |
| Dipendenze non pronte (T3, T6a) | fixture con la stessa forma; lavoro reale bloccato con motivo leggibile |
| Pilota unico, niente gruppo di controllo | la mappa sceglie cosa misurare; gli effetti li giudica T7 con `mappa-storico.ndjson` |

## 15. Dubbi che richiedono una decisione (proposta tra parentesi)

1. Google Ads API: non costruita e developer token tolto dalla lista di Mattia nel README §8 (sì).
2. Spesa reale: ok a ≈ 1,54 $ per il campione e ≈ 0,42 $ per una mappa di prova su `zz-test-t4` con API vere; la mappa di Cavaliere
   aspetta il suo `dati.json` verificato (sì, entrambe dopo M4).
3. Solo modalità Live (≈ 0,19 $ in più a mappa, niente polling) (sì).
4. SERP solo `mobile` (sì; C5 dice se serve anche desktop).
5. Query senza comune misurate solo nella sede, non in ogni comune servito (sì: le query con comune coprono la domanda per comune).
6. Pagina-comune candidata solo con cantiere verificato in quel comune (A4); altrimenti la query va alla pagina servizio (sì).
7. «Riammetti» non previsto dal brief: correzione a mano del file (sì per ora; un bottone costa poco se serve).
8. Unione con T3 per nome normalizzato dei servizi, non per `id` (sì, finché T3 non fissa come nasce l'id).
9. Soglie e pesi iniziali (difficoltà 2/3 e 5/6; pesi 35/30/20/15; soglia 35; tetto 1.000 ricerche per `V`) come da §4-§5, tarati in C3/C6.
10. Dati del campione in git in `docs/traffico/calibrazione-T4/` (≈ 1,2 MB), risposte integrali solo in cache (sì).
11. Nessuna ricerca di marca nell'universo: la misura Search Console (sì).

## Calibrazione

*(fase 3 — con chiave e ok alla spesa: C1 copertura dell'elenco domini; C2 soglie di taglia dal campione; C3 accordo difficoltà ≥ 80 %
su 20 righe cieche; C4 City contro Municipality sui volumi della sede, 10 comuni, 2 task; C5 coordinate contro `location_code` sulla
SERP, 10 query, Jaccard dei domini ≥ 0,8; C6 revisione di Mattia dei target di `zz-test-t4`; C7 costo reale per mappa da
`costi.ndjson`. Senza chiave: script e protocollo pronti, stato «da calibrare con chiave» nel README §7.)*

## Verifica

*(fase 4: output del banco, `npx tsc --noEmit`, `npm run build`, banchi esistenti, E2E M3 e M4, sha dei `client.json`, costi reali.)*

## Fonti verificate il 2026-09-14

- https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-live/ (parametri, limiti, 12 richieste/min, varianti sommate)
- https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/ e `…/task_post/` (parametri, `location_coordinate`, item, addebiti extra)
- https://dataforseo.com/pricing/serp/google-organic-serp-api · https://dataforseo.com/help-center/serp-api-pricing-depth-update-faq (per 10 risultati dal 19/09/2025)
- https://dataforseo.com/pricing/keywords-data/google-ads (0,06 $ standard, 0,09 $ live a task) · https://dataforseo.com/update/pricing-update-in-dataforseo-apis (1/7/2026: Keywords Data +20 %, SERP non toccata)
- https://docs.dataforseo.com/v3/dataforseo_labs/locations_and_languages/ (solo Country) · https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api
- https://docs.dataforseo.com/v3/keywords_data/google_ads/locations/ · https://cdn.dataforseo.com/v3/locations/locations_kwrd_2026_09_01.csv
- https://docs.dataforseo.com/v3/appendix/errors/ · https://docs.dataforseo.com/v3/appendix/user_data/
- https://dataforseo.com/help-center/what-is-search-volume · https://dataforseo.com/help-center/how-to-get-precise-search-volume-for-keywords-with-the-dataforseo-search-volume-endpoint
- https://developers.google.com/google-ads/api/docs/api-policy/access-levels (agg. 2026-09-11) · https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics e `…/generate-keyword-ideas` (agg. 2026-09-10)
- https://groups.google.com/g/adwords-api/c/YVZEnu97JIA · https://groups.google.com/g/adwords-api/c/YgJUSBiKAgo
