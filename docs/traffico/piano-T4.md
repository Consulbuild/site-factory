# Piano T4 — Mappa query → pagine

Riallineato il 15/09 alle decisioni T3 12-14 e K1.

Stato: **chiuso il 2026-09-15, da calibrare con chiave** (sviluppo M1-M5, calibrazione senza chiavi, due revisioni e
collaudo finale delle fasi 4-5: § Calibrazione e § Verifica; la calibrazione a pagamento resta in attesa della ricarica
DataForSEO e, per la mappa di Cavaliere, della sede nelle sue zone servite). Piano scritto il 2026-09-14, riallineato il 2026-09-15 («Priorità assoluta», T3
punti 12-14, T4 punti 1-7, K1 di `decisioni-piani.md`). Contratti reali letti nel codice il 15/09: `lib/zone-servite.ts` (T3,
chiuso), `lib/secrets.ts` e `lib/chiavi-traffico.ts` (K1, chiuso). Fonti: `docs/traffico/README.md` (§1-§5), `brief-T4.md`,
`piano-T0.md` (§3-§4), `piano-T3.md` (§3 contratto delle zone), `piano-K1.md` (§8), `piano-T6a.md` (§3-§4 dataset),
`docs/ricerca-traffico-2026-09.md` §3, §4, §6.2, §8, `~/knowledge/seo/ricerche-2026-09-14/p4-serp-italia.md` e `p9-strumenti.md`,
`ricerca-scheda-google-2026-09.md` §3-§5 e §7 (termini DataForSEO); codice: `lib/run-bus.ts`, `lib/run-step.ts`, `lib/agenti.ts`,
`lib/portafoglio.ts`, `lib/cache.ts`, `lib/zone-servite.ts`, `lib/secrets.ts`, `lib/chiavi-traffico.ts`,
`app/traffico/[slug]/page.tsx`, `components/zone-servite.tsx`.

Letture aggiuntive, minime e dichiarate: `contesto.json` di Cavaliere (nomi dei 24 servizi, 5 macro, `settore_normalizzato`), i
consumatori di `BusRunInfo.kind` (`lib/agenti.ts`, `components/run-provider.tsx`, `step-run-live.tsx`),
`components/confirm-dialog.tsx` (props), `DESIGN-SYSTEM.md` §5-§12. Comuni, codici, popolazioni e distanze degli esempi calcolati
il 15/09 con `comuniServiti` sul dataset T6a (script usa e getta nello scratchpad, nessun file nel repo). Il CSV pubblico delle
località DataForSEO è stato letto in streaming (nessun file salvato).

## 1. Contesto

Obiettivo (priorità assoluta: più traffico dall'Italia e dalle zone dove il cliente lavora): per ogni cliente con servizio Sito
**attivo**, decidere in modo ripetibile, spiegabile e misurato **8-20 ricerche reali, in italiano e nei comuni delle zone servite,
su cui puntare** e **quale pagina** risponde a ciascuna. Base di T5 (pagine da costruire), T7 (cosa misurare), G1 (keyword della
scheda).

Fatti che vincolano il piano (letti nel codice il 15/09):

- **Nessun `StepKey`**: il lavoro vive sul run-bus come `traffico:<slug>:mappa` (README §2). `run-bus.ts` oggi conosce solo
  `kind: "cliente" | "fabbrica"`; `kind: "traffico"` **nasce in T4** (G1 lo riusa): `fileEventiPerId`, `agenteDaFase` (oggi
  `kind?: "cliente" | "fabbrica"`), `percorsoRun`, `nomeStep` vanno estesi. I filtri esistenti (`build-panel`, `catena-card`,
  `step-run-live`) cercano `kind === "cliente"`: un terzo `kind` non li tocca.
- `run-step.ts` esegue fasi `claude` o `script`; T4 non usa `claude -p` (nessuna quota Max) né script esterni: il lavoro è un
  generatore TS che emette `RunEvent` (`phase`/`text`/`done`/`error`), accettato così com'è da `avvia()` del bus.
- `fonte()`/`memo()` sono cache **in memoria**: perfette per letture a TTL, inutili per non ripagare risposte dopo un riavvio.
  Serve una cache su disco.
- **Zone servite (T3, chiuso)**: l'unica porta sono le funzioni di `lib/zone-servite.ts`, mai il JSON letto a mano.
  `leggiZoneServite(dir)` → `LetturaZone` (senza scritture); `zoneUsabili(lettura)` → `{ ok: true; zone } | { ok: false; motivo }`
  (ok con zone confermate e lead invariato, **oppure** con la proposta dal form lead in stato `riconosciute`: nessuna conferma
  obbligatoria); `comuniServiti(zone, dati?)` → `{ codice, nome, sigla, popolazione?, kmDallaSede: number | null, aree: number[] }[]`
  ordinati dal più vicino alla sede (codici 2026, alias risolti); `areeServite(zone)` → le aree (`comune` · `dintorni` ·
  `provincia` · `regione` · `italia`) a cui puntano gli indici `aree`; `zone.sede` = `{ codice, nome, sigla } | null`;
  `caricaDati()` → dataset T6a con `comuni[codice].centro` e `nomeAltraLingua`; `regioneDiSigla(sigla)`; `etichettaArea(area)`.
  Non esistono `dati.json`, `foto.json`, priorità commerciali, prezzi né orari: nessuna priorità dichiarata e nessuna
  pagina-comune candidata. `improntaZone` non esiste: T4 calcola la propria impronta delle zone (§6.1).
- **Chiavi (K1, chiuso)**: `DATAFORSEO_LOGIN` e `DATAFORSEO_PASSWORD` sono già in `CHIAVI_TRAFFICO` di `lib/secrets.ts`, con campi
  in Impostazioni e prova gratuita (`user_data`) in `provaChiaveTraffico` di `lib/chiavi-traffico.ts`. T4 **non tocca**
  `secrets.ts`, `chiavi-traffico.ts` né la route delle chiavi: `lib/dataforseo.ts` le legge con `getSecret` e riusa `redigi` e il
  tipo `Trasporto` di `chiavi-traffico.ts` (solo import).
- `contesto.json` di Cavaliere: `servizi_atomizzati[].servizio` **senza id**, `macro_categorie[{nome, servizi}]`,
  `settore_normalizzato: "Edilizia"`. I servizi si abbinano per **nome normalizzato** (decisione T4 punto 6).
- `.claude/scope.json` vuoto; T1a, T3 e K1 chiusi: la fase 2 di T4 può partire (§12 M0).

Fuori perimetro: rank tracking periodico (T2b/T7), pagine e copy (T5), pagine-comune (T6b, sospeso: nessuna fonte verificata del
luogo dei lavori), ricerche di marca (le misura Search Console, ricerca §3.4), analisi tecnica dei siti concorrenti (età, sitemap,
schema: ricerca §4.3, rinviata), ricerche fuori dalle zone servite o in lingue diverse dall'italiano.

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

**Solo Live e solo mobile** (decisione T4 punto 3): lo Standard dei volumi risponde in 1-3 ore (un lavoro che Mattia lancia
dall'editor col Mac acceso non può aspettare) e lo Standard delle SERP richiede `task_post` + polling di `tasks_ready` +
`task_get`, codice in più per risparmiare circa 0,2 $ a mappa. *ponytail: solo Live; passare a `task_post` sopra i 100 clienti o se
i prezzi salgono.*

Scartati, con evidenza:
- **DataForSEO Labs `bulk_keyword_difficulty`**: «Country is the only supported location_type» — la difficoltà nazionale non
  descrive «servizio + comune»; e le long-tail comunali non sono nel suo database. La difficoltà la calcoliamo dalla SERP locale (§4).
- **Clickstream Search Volume**: esempio 0,15 $ per 4 keyword, copertura geografica non dichiarata: sproporzionato.
- **Backlinks API** per l'autorità dei concorrenti: rinviata; è il primo rialzo se la calibrazione (C3) non raggiunge l'80 %.

### 2.2 Google Ads API (Keyword Planner): **non si costruisce** (decisione T4 punto 1)

| Domanda | Evidenza (2026-09-14) | Esito |
|---|---|---|
| Dati diversi da DataForSEO? | Help DataForSEO «What is Search Volume» (agg. 05/08/2025): Google Ads «provides the same data through API»; gli endpoint `keywords_data/google_ads/*` sono quella fonte. Doc località: il `location_code` «corresponds to Google's geographical targeting system» | stessa fonte, stessi geo target |
| Volumi esatti o fasce senza spesa? | Nessuna fonte primaria Google risponde: la pagina *Access levels* (agg. 2026-09-11) e *Generate Historical Metrics* (agg. 2026-09-10) non parlano di spesa né di fasce; i thread del forum API (2015, 2022) nemmeno. Le fasce «1K-10K» agli account senza spesa sono documentate solo per la **UI** (community Google Ads). In entrambe le strade il numero è comunque **arrotondato**: «Google has around 80 search volume values that are logarithmically proportioned» e le varianti vicine sono sommate (help DataForSEO; doc `search_volume`: «combined search volume values for groups of similar keywords») | nessun guadagno di precisione dimostrabile |
| Geo target comunali italiani? | CSV `locations_kwrd_2026_09_01.csv`: Italia = 1 Country (`2380`), 20 Region, 110 Province, **1.462 City**, **7.722 Municipality**; es. Cologno Monzese City `1008436` e Municipality `9201369`. Disponibili già via DataForSEO | nessun guadagno |
| Costo dell'accesso diretto | *Access levels*: Explorer **blocca** `KeywordPlanIdeaService`; Basic richiede brand verification e domanda da Google Cloud, «typically take» circa 10 giorni lavorativi. In più: OAuth (client, refresh token), customer id, developer token | complessità vera per risparmiare 0,3-0,5 $ a mappa |

**Decisione**: nessun client Google Ads; il developer token esce dalla lista di Mattia nel README §8 alla chiusura (M6). G1 riusa
`mappa-query.json` (R1 §3 lo prevede già). Da riaprire solo se DataForSEO chiude l'endpoint o il prezzo sale di 10 volte.

### 2.3 Comuni delle zone servite e località

**Comuni usati** (le sole località delle query con comune; nessuna query fuori dai comuni serviti):

1. `zoneUsabili(leggiZoneServite(out/<slug>))` non ok → la mappa è bloccata col suo `motivo` (§8).
2. `comuniServiti(zone, dati)`; un comune raggiunto **solo** da aree `italia` resta se ha la sigla della sede (area Italia = ricerche
   locali dalla provincia della sede); un comune che sta anche in un'area precisa resta sempre. Area solo `italia` e `zone.sede`
   null → blocco «Zone senza sede: con "Tutta Italia" serve la sede per scegliere i comuni».
3. Ordine per peso `popolazione / (1 + kmDallaSede / 10)` desc (popolazione assente → 0; `kmDallaSede` null → divisore 2), poi
   `kmDallaSede` asc, poi nome (`localeCompare` it). **Tetto** `min(40, ⌊5.000 / (2 × teste)⌋)` comuni: tiene le righe con comune
   dentro 5 task di volumi (§2.5). La sede, se è nell'area, entra sempre (al posto dell'ultimo). Comuni oltre il tetto: avviso
   «N comuni dell'area non misurati (tetto 40): …» coi primi 5 nomi.

Il peso mette insieme dove si cerca di più (popolazione) e dove il cliente lavora davvero (vicinanza): con «Cologno Monzese e
dintorni» (132 comuni entro 20 km) entrano Milano, Monza, Sesto San Giovanni, Cologno Monzese, Cinisello Balsamo, Brugherio… fino
ad Agrate Brianza (40°); Carugate (5 km) è 31°, Cassina de' Pecchi (8 km) resta fuori. Da calibrare (C8).

**Località delle chiamate** (ricerche solo in italiano: `language_code: "it"` sempre):

- **Ricerche con il comune nel testo** («ristrutturazione bagno brugherio»): volume misurato sull'**Italia** (`location_code 2380`).
  Il testo porta già il luogo; misurarlo solo nel comune perderebbe chi cerca da Milano un'impresa di Brugherio. Un task ogni
  1.000 keyword.
- **Ricerche senza comune** («ristrutturazione bagno», «… vicino a me»): Google localizza la SERP; il volume si misura nel **comune
  della sede** (`zone.sede`, un task). `location_code` trovato nella lista gratuita delle località: nome normalizzato uguale al nome
  del dataset, a `nomeAltraLingua` (da `caricaDati()`) o a un esonimo (tabella breve verificata sul CSV: Milan, Rome, Naples,
  Turin, Florence, Venice, Genoa, Padua, Syracuse, Mantua…), **e** regione uguale (`regioneDiSigla(sede.sigla)` tradotta con la
  tabella fissa delle 20 regioni in inglese: Lombardy, Apulia, Sardinia, «Trentino-Alto Adige/Sudtirol», da ricontrollare sul CSV
  in M2). A parità: **City** prima di **Municipality** (da calibrare, C4). Sede null o località non trovata → volumi delle
  implicite `non_richiesto` + avviso; nessuna località inventata.
- **SERP**: `location_coordinate` = punto interno del comune (`caricaDati().comuni[codice].centro`), raggio fisso 100.000 mm.
  Funziona per tutti i comuni senza abbinamenti di nomi (nel CSV ci sono «Milan», «Ratschings»), è riproducibile ed è lo stesso
  punto di `kmDallaSede`. Implicite → punto della sede. Controllo in calibrazione contro `location_code` (C5). `check_url` salvato
  per aprire la stessa SERP a mano.
- **Sede fuori dall'area** (l'operatore l'ha tolta dalle zone): nessuna query col comune della sede; le implicite restano misurate
  alla sede (è lì che Google localizza chi cerca vicino all'impresa), con avviso.

### 2.4 Cache delle risposte

- Su disco in `~/.cache/site-factory/dataforseo/<endpoint>/<sha256>.json` (override `SF_DATAFORSEO_CACHE`), come la cache di T6a:
  fuori da git e dal sync di Drive. Chiave = sha256 dell'endpoint + corpo canonico (keyword ordinate, coordinate a 4 decimali).
  File = `{ richiesta, lettoAt, costoUsd, risposta }` (task intero, per poter rileggere campi in futuro).
- **TTL**: volumi 30 giorni (Google li aggiorna ogni mese), SERP 14 giorni, lista località 30 giorni. Un errore non va in cache.
- La cache serve a **non ripagare**; la **spiegabilità** vive in `mappa-query.json` (per ogni numero: endpoint, sha della
  richiesta, data, costo). Persa la cache si perde al massimo un ricalcolo (< 1 $).
- Nessun dato personale inviato: solo keyword di servizio + nomi di comuni e coordinate di centroidi; nessuna ricerca col nome del
  cliente (vale anche per le ditte individuali, T3 punto 10). Nessuna ricerca di marca.
- Termini DataForSEO (§7.1 «not … compete with … search engine providers», §7.2 manleva): uso interno per i propri clienti, stessa
  lettura di R1 [interpretazione, non parere legale].

### 2.5 Costo per cliente

Fixture tipo Cavaliere (§3.5): 32 teste, 40 comuni usati su 132 dell'area, 2.656 keyword misurate, 60 SERP.

| Voce | Fixture | Caso peggiore (tetti) |
|---|---|---|
| Volumi con comune (Italia) | 2.560 keyword → 3 task → 0,27 $ | 5.000 → 5 task → 0,45 $ |
| Volumi senza comune (sede) | 96 keyword → 1 task → 0,09 $ | 1 task → 0,09 $ |
| SERP (live + AI Overview) | 60 × 0,004 $ = 0,24 $ | 100 × 0,004 $ = 0,40 $ |
| **Totale a mappa** | **≈ 0,60 $** | **≈ 0,94 $** |
| Ricalcolo entro i TTL · esclusione · riammissione | 0 $ (cache / nessuna chiamata) | 0 $ |
| Anno, ricalcolo trimestrale | ≈ 2,4 $ | ≈ 3,8 $ |
| Campione di calibrazione (una tantum) | 384 × 0,004 $ = **1,54 $** | — |

Tetti rigidi per lavoro: ≤ 6 task di volumi e ≤ 100 SERP (costanti); saldo letto prima di spendere. Costo **reale** dal campo
`cost` di ogni risposta, una riga per chiamata pagata in `costi.ndjson` (§6.2).

## 3. Universo delle query

### 3.1 Ingressi (tutti obbligatori)

| Ingresso | Da dove | Uso |
|---|---|---|
| Servizi, macro, settore | `out/<slug>/contesto.json` | teste di servizio, pagine servizio, mestiere |
| Zone servite, sede, comuni | `lib/zone-servite.ts`: `leggiZoneServite` + `zoneUsabili` + `comuniServiti` (+ `caricaDati` per `centro` e `nomeAltraLingua`, `regioneDiSigla`, `etichettaArea`) | comuni usati (§2.3), sede delle implicite, distanza, popolazione, coordinate SERP, area del «perché» |
| Dominio del cliente | `client.json` → `steps.build.deploy.dominio` | riconoscere il cliente nella SERP |
| Lessico e domini | `lib/mappa-lessico.json`, `lib/mappa-domini.json` (versionati, sha nella mappa) | regole |
| Esclusioni | `out/<slug>/traffico/mappa-esclusioni.json` | fuori dalla selezione |

**Ordine senza priorità dichiarata**: nessun servizio vale più di un altro per decisione; l'ordine lo danno volumi, vincibilità e
rilevanza (§5) e la copertura delle macro-categorie del contesto (§5.3).

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

| Tipo | Modificatore | Forma |
|---|---|---|
| con comune | `base` | `{testa} {comune}` |
| con comune | `preventivo` | `preventivo {testa} {comune}` |
| senza comune | `base` | `{testa}` |
| senza comune | `vicino_a_me` | `{testa} vicino a me` |
| senza comune | `preventivo` | `preventivo {testa}` |

Fonti dei modificatori: p4 §1 («vicino a me», «preventivo»; «ditta/impresa» come varianti di mestiere, qui già nel lessico).
Scartati con motivo: preposizioni «a/in» (Google somma le varianti vicine), frazioni e quartieri (solo grandi città), «costo» e
«prezzi» (nessuna pagina li può soddisfare: T5a e T5b sono senza prezzi, T3 punto 13).

Normalizzazione del testo: minuscolo, apostrofo → spazio, spazi compressi («cassina de' pecchi» → «cassina de pecchi»), accenti
conservati («muggiò»). Oltre 80 caratteri o 10 parole → riga non ammessa («troppo lunga per Google Ads»). Il testo è la **chiave
stabile** della riga (esclusioni, storico). Le righe non ammesse **non si misurano** (nessun costo) ma restano nell'universo col
motivo.

### 3.4 Pagine disponibili

`home` · `servizio:<slug della macro>` (una per `macro_categorie`, slug kebab del nome; etichetta = nome) · `zone` (pagina «Zone
servite» di T5a). Sono chiavi di identità, non URL: T5a/T5c le traducono in slug congelati. Nessuna pagina-comune (T5a non la
costruisce, T6b sospeso).

### 3.5 Esempio sulla fixture tipo Cavaliere

Fixture `scripts/fixtures/mappa-query/`: contesto con i 24 servizi e le 5 macro reali di Cavaliere; lead del form v4
(`raw-submission.json`) con `risposte.zone: ["Cologno Monzese e dintorni"]` e sede Cologno Monzese (MI) → proposta `riconosciute`
(verificato il 15/09 con `leggiZoneServite`), 132 comuni entro 20 km, **40 usati** (§2.3): tra questi Cologno Monzese (MI)
`015081` sede, Milano `015146` (11 km), Monza (MB) `108033` (6 km), Sesto San Giovanni (MI) `015209` (3 km), Brugherio (MB)
`108012` (3 km), Segrate (MI) `015205` (6 km), Vimodrone (MI) `015242` (2 km), Muggiò (MB) (7 km), Carugate (MI) `015051` (5 km).

Lessico sui 24 servizi: 28 teste di servizio; 4 servizi senza query (Finiture interne ed esterne, Assistenza tecnica in cantiere,
Coordinamento delle lavorazioni, Ripristini e manutenzioni esterne); 4 teste di mestiere (edilizia). Conteggi attesi:

| Gruppo | Righe | Ammesse e misurate |
|---|---|---|
| con comune, servizio `base` + `preventivo` | 28 × 40 × 2 = 2.240 | 2.240 |
| con comune, mestiere `base` + `preventivo` | 4 × 40 × 2 = 320 | 320 |
| senza comune, servizio (3 modificatori) | 28 × 3 = 84 | 84 |
| senza comune, mestiere (3 modificatori) | 4 × 3 = 12 | 12 |
| **Totale** | **2.656** | **2.656** in 4 task |

| Testo | Tipo · modificatore | Testa (gruppo, origine) | Esito |
|---|---|---|---|
| impresa edile cologno monzese | con comune · base | impresa-edile, mestiere | ammessa |
| ristrutturazione bagno cologno monzese | con comune · base | bagno, servizio | ammessa |
| rifacimento bagno brugherio | con comune · base | bagno, sinonimo | ammessa (3 km dalla sede) |
| preventivo ristrutturazione appartamento monza | con comune · preventivo | appartamento | ammessa |
| cappotto termico vicino a me | senza comune · vicino_a_me | cappotto | ammessa, volume a Cologno Monzese |
| idraulico cologno monzese | con comune · base | idraulico, `mestiereAltrui` | ammessa, rilevanza dimezzata |
| preventivo cartongesso muggiò | con comune · preventivo | cartongesso | ammessa (accento conservato) |
| impresa edile milano | con comune · base | impresa-edile | ammessa; difficoltà **alta** (Milano > 250.000 ab.) → mai target |
| ristrutturazione bagno cassina de pecchi | — | — | **non generata**: comune dell'area oltre il tetto dei 40 (nell'avviso) |
| ristrutturazione bagno bergamo | — | — | **non generata**: fuori dalle zone servite |

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
| F1 taglia del comune (popolazione da `comuniServiti`) | < 50.000 → 0 · 50.000-250.000 → +2 · > 250.000 → +5 · ignota → 0 con avviso | ricerca §3: capoluogo fuori portata nei primi 180 giorni; «servizio + comune medio» con directory forti = media |
| F2 imprese locali ottimizzate: `impresa_locale` con token della testa **e** del comune nel titolo | +1 ciascuna, max +4 | concorrenza che ha già fatto il lavoro on-page (p4 §4.2: city nel title nel 69 %) |
| F3 domini exact-match: etichetta del dominio con token della testa e del comune | +1 ciascuno, max +2 | tattica diffusa e forte (p4 §5.4) |
| F4 `portale` o `directory` nelle posizioni 1-3 | +1 ciascuno, max +3 | domini forti in cima |
| F5 risultati deboli: `altro` in top 10 | −1 ciascuno, max −3 | posti occupati da social, lavoro, fuori tema: spazio per un sito vero |
| F6 meno di 6 organici in top 10 | −1 | SERP scarna (p4 §5.2: sotto una soglia restano solo directory) |

Livello: **punti ≤ 2 bassa · 3-5 media · ≥ 6 alta**. SERP `vuota` → bassa con fattore «SERP senza risultati utili». Il cliente già
in top 10 non cambia i punti: si aggiunge il fattore informativo «già presente in posizione N» (0 punti). Limite dichiarato: nessun
dato sui link (la KD di Ahrefs è la media dei domini referenti, ricerca §3.1); si prova l'accordo con Mattia (C3) prima di
aggiungerli.

Spazio organico (clic che la SERP lascia ai risultati): `O = 1 − 0,20·[local pack] − 0,15·[AI Overview] − 0,05·min(annunci, 4) −
0,10·[Local Services]`, minimo 0,4. Non cambia la difficoltà: pesa il volume (§5.1).

## 5. Punteggio, selezione, assegnazione

### 5.1 Punteggio (0-100, un decimale; costanti in `lib/mappa-query.ts` con `VERSIONE_REGOLE`)

`S = 100 × (0,45·V·O + 0,35·W + 0,20·R)` — i pesi 35/30/15 del piano del 14/09 riproporzionati dopo l'uscita della priorità
commerciale (nessuna priorità dichiarata, T3 punto 13).

| Componente | Valori |
|---|---|
| V volume | `min(1, log10(1+vol) / log10(1001))`; `null` o 0 → 0 (scala assoluta: un'esclusione non cambia gli altri punteggi) |
| W vincibilità | bassa 1 · media 0,4 · alta 0 |
| R rilevanza | testa primaria 1 · sinonimo 0,8 · mestiere del cliente 0,9 · × 0,5 se `mestiereAltrui` · × vicinanza (`kmDallaSede`): sede 1, ≤ 10 km 0,9, ≤ 25 km 0,75, oltre 0,6, ignota 0,75 |

Esempio: «ristrutturazione bagno cologno monzese», volume 40, local pack presente, difficoltà media, testa primaria, sede:
V = log10(41)/log10(1001) = 0,5375; O = 0,8; S = 100 × (0,45 × 0,4300 + 0,35 × 0,4 + 0,20 × 1) = **53,4**.

Ogni riga salva i fattori `{codice, testo, valore, punti}`: nessun numero senza la sua origine.

### 5.2 Candidati alla SERP (prima di spendere)

`Spre = 100 × (0,45·V + 0,20·R)` sulle righe ammesse, misurate e non escluse; una sola riga per gruppo
`(testa.gruppo, comune, modificatore)` (la migliore); primi **60** gruppi, più i 3 migliori di ogni macro-categoria del contesto se
fuori dai 60; tetto 100.

### 5.3 Selezione 8-20

1. Idonee: ammesse, non escluse, con SERP letta, difficoltà ≠ alta.
2. Duplicati d'intento: stesso gruppo e stesso comune (es. «rifacimento bagno monza» e «ristrutturazione bagno monza») → la
   migliore; due query con Jaccard ≥ 0,6 sugli URL della top 10 e stessa pagina → la migliore, l'altra «variante coperta».
3. Ordine: `S` desc → volume desc (`null` in fondo) → popolazione desc → testo asc (determinismo).
4. Presa: finché `S ≥ 35` e target < 20; massimo **3 per pagina** (la prima è `principale`); massimo metà dei target con volume
   `null` o 0, salvo che manchino alternative.
5. Copertura dei servizi del contesto: ogni macro-categoria con almeno una target se esiste una riga idonea (entra anche sotto
   soglia, al posto dell'ultima di una pagina già coperta).
6. Sotto 8 con la soglia → si completa con le migliori idonee, `sottoSoglia: true`. Meno di 8 idonee in tutto → `stato:
   "insufficiente"` con i motivi (es. «42 query con difficoltà alta», «nessuna SERP letta per 3 comuni»).

### 5.4 Assegnazione query → pagina (prima regola che vale)

| # | Condizione | Pagina |
|---|---|---|
| A1 | testa di mestiere del cliente, senza comune o comune = sede | `home` |
| A2 | testa di mestiere del cliente, comune ≠ sede | `zone` |
| A3 | testa di servizio, senza comune o comune = sede (qualunque modificatore) | `servizio:<macro>` |
| A4 | testa di servizio, comune ≠ sede | `servizio:<macro>` (menzione della zona) |

Macro: la prima, nell'ordine di `macro_categorie`, che contiene un servizio della testa. Servizio in nessuna macro → `home` con
avviso. `mestiereAltrui` non va mai in `home`. Nessuna pagina servizio×comune né pagina-comune: niente doorway (ricerca §4.2); i
comuni servibili li coprono «Zone servite», `areaServed` e l'area servita della scheda (Priorità assoluta, punto 2).

### 5.5 Frasi del «perché» (template fissi)

«Circa 40 ricerche al mese in Italia (Google Ads tramite DataForSEO, media set 2025 – ago 2026, valori arrotondati da Google).» ·
«Volume non misurato da Google Ads: sotto la soglia di misura o assente.» · «Comune servito: Brugherio (MB), 3 km dalla sede,
nell'area «Cologno Monzese e dintorni, 20 km».» · «Difficoltà media (4 punti): Cologno Monzese ha 46.994 abitanti; 2 imprese
locali con bagno e Cologno nel titolo; 2 portali o directory nei primi 3; 1 risultato debole.» · «Nella pagina di Google: mappa con
3 schede, nessuna panoramica AI, nessun annuncio.» · «Pagina: servizio «Ristrutturazioni e manutenzioni», lavoro cercato nel comune
della sede.» · «Punteggio 53,4 su 100 (volume 19,4 · difficoltà 14 · rilevanza 20).»

## 6. Schemi

### 6.1 `out/<slug>/traffico/mappa-query.json` (`lib/mappa-query.ts`)

```ts
export const VERSIONE_REGOLE = "2026-09-b";
const Sha = z.string().regex(/^[a-f0-9]{64}$/);
const Istat = z.string().regex(/^\d{6}$/);
const Mese = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const MODIFICATORI = ["base", "vicino_a_me", "preventivo"] as const;
export const CLASSI = ["portale", "directory", "impresa_locale", "cliente", "altro"] as const;
export const ENDPOINT_PAGATI = ["keywords_data/google_ads/search_volume/live", "serp/google/organic/live/advanced"] as const;

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
    popolazione: z.number().int().positive().nullable(), km: z.number().int().min(0).nullable(),
    area: z.string().nullable() }).strict(),  // senza_comune = sede; area = etichettaArea della prima area (null: sede fuori area)
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
  punteggio: z.object({ totale: z.number().min(0).max(100), fattori: z.array(Fattore).length(3) }).strict().nullable(),
}).strict();

const Pagina = z.object({
  chiave: z.string().regex(/^(home|zone|servizio:[a-z0-9-]+)$/),
  tipo: z.enum(["home", "servizio", "zone"]),
  etichetta: z.string().min(1),
}).strict();

export const MappaQuerySchema = z.object({
  versione: z.literal(1),
  generataAt: z.string().datetime(),
  stato: z.enum(["completa", "parziale", "insufficiente"]),
  regole: z.object({ versione: z.string(), lessicoSha: Sha, dominiSha: Sha }).strict(),
  ingressi: z.object({ contestoSha: Sha,
    zoneSha: Sha,                    // sha256 di { sede, codici dei comuni usati in ordine }: l'impronta delle zone di T4
    sede: Istat.nullable(), comuniArea: z.number().int().min(0), comuniUsati: z.number().int().min(0).max(40),
    dominioCliente: z.string().nullable(), registrate: z.boolean() }).strict(),   // registrate = risposte di prova
  costo: z.object({ usd: z.number().nonnegative(), chiamatePagate: z.number().int().min(0),
    dallaCache: z.number().int().min(0) }).strict(),
  avvisi: z.array(z.string()),
  serviziSenzaQuery: z.array(z.string()),
  dominiNonInElenco: z.array(z.string()),
  universo: z.array(Riga).max(5500),
  pagine: z.array(Pagina).min(1),
  target: z.array(z.object({ testo: z.string(), pagina: z.string(), ruolo: z.enum(["principale", "secondaria"]),
    sottoSoglia: z.boolean(), perche: z.array(z.string()).min(1) }).strict()).max(20),
}).strict().superRefine(/* testi unici; ogni target → riga ammessa, non esclusa, difficoltà ≠ alta, pagina esistente;
  ≤ 3 target per pagina e una sola principale; stato "insufficiente" ⇔ target < 8; volume.stato "misurato" ⇔ fonte ≠ null */);

export const EsclusioniSchema = z.object({ versione: z.literal(1), voci: z.array(z.object({
  testo: z.string().min(2).max(80), motivo: z.string().trim().min(3).max(200), at: z.string().datetime() }).strict()).max(500) }).strict();
```

Accanto: `traffico/mappa-storico.ndjson`, una riga per mappa scritta `{at, versioneRegole, stato, target: [{testo, pagina}]}` (T7
deve sapere da quando una query è target; è l'unico storico). Scritture atomiche (tmp + rename). `client.json` e
`traffico/zone-servite.json` mai toccati (nessuna staleness indotta).

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
in `docs/traffico/calibrazione-T4/costi.ndjson`. `ENDPOINT_PAGATI` e `RigaCostoSchema` esportati: G1 li estende.

## 7. Lavoro sul run-bus

- **Id** `traffico:<slug>:mappa`, `kind: "traffico"`, `step: "mappa"`, `label` = azienda. Eventi in
  `out/<slug>/traffico/logs/run-mappa.ndjson` (tee del bus, riletto da `eventiDaFile` dopo un riavvio). `busIdTraffico(slug, lavoro)`
  e `startTrafficoRun(slug, lavoro, label, esegui)` sono generici sul lavoro (G1 aggiunge `scheda`).
- **Avvio** `startTrafficoRun` rifiuta se lo stesso id è vivo; per `mappa` anche **se un'altra mappa è in corso** (un solo account
  DataForSEO: 12 richieste/min sugli endpoint Google Ads live). Priorità rispetto alla catena demo: nessun conflitto, T4 non usa la
  quota Max.
- **Ingressi letti dalla route prima di avviare** (snapshot): ciò che cambia durante il lavoro vale al calcolo successivo
  (staleness per sha, §8).

| Fase (`phase`) | Cosa fa | Testo (`text`) tipico |
|---|---|---|
| Controllo dei dati | schema del contesto; `zoneUsabili`; comuni usati e sede (§2.3); saldo (`user_data`) ≥ 2 × stima | «40 comuni su 132 delle zone servite · saldo DataForSEO 48,20 $, stima 0,60 $» |
| Ricerche possibili | universo, esclusioni | «2.656 ricerche da misurare, 4 lavori senza ricerche» |
| Volumi di ricerca | lotti ≤ 1.000, uno alla volta, ≥ 5 s tra le chiamate Google Ads | «Lotto 1/4: 1.000 ricerche (Italia) · dalla cache» |
| Risultati di Google | candidati, 5 SERP in parallelo | «SERP 30/60» ogni 10 |
| Classificazione e punteggio | classi, difficoltà, punteggi, selezione, pagine | «14 ricerche scelte su 5 pagine · 12 domini fuori elenco» |
| Scrittura della mappa | `mappa-query.json`, `mappa-storico.ndjson` | → `done` con `traffico/mappa-query.json` |

**Errori** (`ErroreDfs` con `tipo`; messaggi in italiano passati da `redigi`, mai credenziali):

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

**Posto**: dentro la card «Sito» di `/traffico/[slug]` (`SezioneServizio` del servizio `sito`; la card delle zone servite di T3 sta
sopra, a sé), sotto-sezione `<section aria-labelledby>` con h3 **«Ricerche su cui puntare»** + badge. Visibile con Sito `attivo` o
`sospeso`; nascosta se spento.

```
│ ─ Ricerche su cui puntare ──────────────────────────────────────── [Pronta] ─ │
│ Calcolata il 16/09/2026 · 40 comuni delle zone servite · volumi Google Ads     │
│ fino ad agosto 2026 · pagine di Google lette il 16/09 · costo 0,60 $ [Ricalcola…]│
│                                                                                │
│ Home                                                                           │
│   impresa edile cologno monzese                70 al mese · [Difficoltà media] │
│   ▸ Perché                                                        Escludi…     │
│ Servizio · Ristrutturazioni e manutenzioni                                     │
│   ristrutturazione bagno cologno monzese       40 al mese · [Difficoltà bassa] │
│   ▸ Perché                                                        Escludi…     │
│   ristrutturazione bagno                90 al mese a Cologno · [Difficoltà bassa]│
│ Zone servite                                                                   │
│   impresa edile brugherio              volume non misurato · [Difficoltà bassa]│
│ ▸ Dettagli del calcolo: 2.656 ricerche · 40 comuni su 132 · 60 pagine di       │
│   Google · lavori senza ricerche (4) · domini da classificare (12) · avvisi (1)│
│ ▸ Escluse da te (2)                                                            │
│   ristrutturazione bagno milano · «troppo lontano per i cantieri» · 16/09      │
│                                                                   Riammetti    │
```

- Gruppi per pagina (home → servizi in ordine di macro → zone); righe a blocco che vanno a capo a 400 px, nessuna tabella larga.
  Volume in `mono`; «al mese» (con comune) o «al mese a Cologno» (senza). Badge difficoltà con la parola: bassa `ok`, media `warn`.
  «Perché» = `<details>` nativo con le frasi del §5.5 e il link «Apri la ricerca su Google ↗» (`checkUrl`).
- «Escludi…» (`btnGhost`) → `ConfirmDialog` tono `brand`: titolo «Escludere questa ricerca?», messaggio «"…" esce dalle
  ricerche su cui puntare e il posto va alla successiva. Non si spende credito.», `children` = textarea «Perché la escludi»
  (3-200 caratteri, `confirmDisabled` finché non è valida), bottone «Escludi la ricerca». Poi `router.refresh()`, focus sull'h3.
- **«Riammetti»** (decisione T4 punto 5, `btnGhost`, senza dialog: l'azione è reversibile e gratuita) nell'elenco «Escluse da te»,
  che mostra per ogni voce testo, motivo e data. La voce esce da `mappa-esclusioni.json`, la mappa si riseleziona senza chiamate;
  poi `router.refresh()`, focus sull'h3. Mai correzione a mano del file.
- «Ricalcola…» → `ConfirmDialog`: «Ricalcolare la mappa?» · «Volumi dell'ultimo mese e pagine di Google degli ultimi 14 giorni
  vengono dalla cache; il resto si paga a DataForSEO, al massimo circa {stima} $. Le esclusioni restano.»
- In calcolo: fase da `useRuns()` (`kind === "traffico" && slug && step === "mappa"`), tempo `mono` `aria-hidden`, frase «Puoi
  chiudere la pagina: il calcolo continua.»; alla sparizione del run `router.refresh()`. Stop solo dalla status bar (chip quadrato:
  `agenteDaFase` restituisce «script»).

| Stato | Badge | Cosa si legge | Primaria | Secondarie |
|---|---|---|---|---|
| chiavi assenti | `idle` Non configurata | «Per calcolare la mappa servono login e password di DataForSEO in Impostazioni → Chiavi API.» | — (Calcola disabilitato, `aria-describedby`) | — |
| zone da controllare, da impostare, lead cambiato | `idle` In attesa delle zone | il `motivo` di `zoneUsabili` (es. «Zone servite da impostare nel dettaglio Traffico») | — | — |
| zone o dataset non leggibili, contesto invalido, zone senza sede con sola «Tutta Italia» | `err` Bloccata | motivo con il percorso in `mono` | — | — |
| pronta a calcolare | `brand` Da calcolare | «Sceglie da 8 a 20 ricerche reali per i lavori del cliente nei {n} comuni più popolosi e vicini delle zone servite. Costo stimato circa {stima} $.» | **Calcola la mappa** | — |
| in calcolo | `brand` In calcolo | fase + tempo | — | — |
| ultimo calcolo fallito, nessuna mappa | `err` Non riuscita | `Banner err` col messaggio (ultimo `error` di `run-mappa.ndjson`) | **Riprova** | — |
| ultimo ricalcolo fallito, mappa precedente | come la mappa | `Banner err` «L'ultimo ricalcolo non è riuscito: …; resta la mappa del gg/mm.» | — | Ricalcola… |
| pronta | `ok` Pronta | meta + gruppi | — | Ricalcola… · Escludi… · Riammetti |
| parziale | `warn` Parziale | «N ricerche senza pagina di Google letta.» | — | Ricalcola… |
| poche ricerche | `warn` Poche ricerche | «Solo N ricerche utilizzabili (ne servono almeno 8):» + motivi | — | Ricalcola… · Riammetti |
| ingressi cambiati (sha diversi) | `warn` Da ricalcolare | `Banner warn` con ciò che è cambiato in `mono` (contesto.json, zone servite, lessico, domini) | **Ricalcola…** | Escludi… · Riammetti |
| Sito sospeso | `idle` In pausa | mappa in lettura, «Servizio sospeso: la mappa resta com'è.» | — | — |

Una sola primaria nella pagina: quando la card delle zone servite ha la sua primaria (zone da controllare o da impostare) la mappa è
«In attesa delle zone» e il suo bottone è `btnSecondary` disabilitato. Anti-obiettivi: niente posizioni, clic o clienti stimati,
niente percentuali, niente grafici, niente «keyword» o «SERP» nei testi. Solo token e componenti di `DESIGN-SYSTEM.md` §5; nessuna
coppia di colori nuova.

## 9. Campione delle 384 SERP e protocollo di giudizio

`scripts/campione-serp.ts` (editor, `node --experimental-strip-types`), stesso client e stesse regole della mappa. Serve a tarare le
regole di difficoltà, non a scegliere ricerche per un cliente: nessuna riga del campione entra in una mappa.

- `esegui [--registrate <dir>] [--conferma-spesa]` — matrice 8 mestieri × 12 comuni × 4 modificatori (ricerca §4.3): mestieri
  «impresa edile», «ristrutturazione bagno», «idraulico», «elettricista», «cappotto termico», «serramenti», «imbianchino», «posa
  pavimenti»; modificatori base («{m} {comune}»), «{m} vicino a me» (coordinate del comune), «preventivo {m} {comune}», «costo {m}
  {comune}» (nel campione resta: misura la composizione delle SERP italiane, non genera query); comuni **piccoli** < 50.000 ab.:
  Sandrigo (VI) `024091`, Cologno Monzese (MI) `015081`, Città di Castello (PG) `054013`, Nardò (LE) `075052`; **medi**
  50.000-250.000: Monza (MB) `108033`, Treviso (TV) `026086`, Perugia (PG) `054039`, Pescara (PE) `068028`; **grandi** > 250.000:
  Milano `015146`, Torino `001272`, Roma `058091`, Napoli `063049` (Nord 6, Centro 3, Sud 3). Popolazione e coordinate da
  `caricaDati()`: se un comune esce dalla sua fascia lo script si ferma. Senza `--conferma-spesa` stampa solo la stima (1,54 $) ed
  esce. Scrive `docs/traffico/calibrazione-T4/campione-<data>.ndjson` (una SERP ridotta e classificata per riga, ≈ 3 KB) e
  `composizione-<data>.json`: per taglia × mestiere × modificatore e marginali, quota di `portale`/`directory`/`impresa_locale`/
  `altro` in top 10, SERP senza imprese locali, local pack (presenza, schede medie), AI Overview, annunci medi, Local Services,
  quota di organici classificati da `ignoto`, distribuzione dei livelli di difficoltà; stampa la tabella.
- `giudizio <campione.ndjson>` — 20 righe stratificate (7 per ciascun livello del software se possibili, tutte le taglie), ordine
  casuale con seme fisso, **cieche** (senza livello né punti): `giudizio-<data>.csv` con `id, query, comune, abitanti, top10 ("pos.
  dominio — titolo" | …), local_pack, ai_overview, annunci, check_url, giudizio, note`.
- `accordo <giudizio.csv>` — accordo esatto e adiacente, matrice 3×3, righe in disaccordo con i fattori.

Protocollo (≈ 30 minuti di Mattia): per ogni riga, guardando la top 10 (e se serve `check_url`): «Un sito nuovo di un'impresa
locale, con una pagina curata per questa ricerca e senza link, entra nei primi 10 in 4-10 settimane?» → `bassa` (probabile) ·
`media` (forse, in mesi e con qualche link locale) · `alta` (no nei primi 6 mesi) — le fasce della ricerca §3. Atteso **accordo
esatto ≥ 80 %** (16/20, decisione T4 punto 7). Sotto: si ritoccano prima le soglie (2/3 e 5/6), poi i punti dei fattori, sul
campione intero; nuove 20 righe mai viste per confermare (niente taratura sulle stesse righe). Esito in «Calibrazione».

## 10. File

| File | Tipo | Cosa |
|---|---|---|
| `site-factory-editor/lib/mappa-query.ts` | A | schemi §6, normalizzazione, comuni usati §2.3, universo §3, lotti dei volumi, candidati §5.2, punteggio, selezione, assegnazione, frasi, `vistaMappa` (modello per la UI), `motivoBloccoMappa`, `stimaCostoUsd`, `zoneSha` e staleness per sha; puro, import `.ts` |
| `site-factory-editor/lib/serp-classifica.ts` | A | riduzione della SERP, classi §4.2, difficoltà §4.3, spazio organico; puro (lo usano mappa e campione) |
| `site-factory-editor/lib/mappa-lessico.json` | A | lessico §3.2 |
| `site-factory-editor/lib/mappa-domini.json` | A | elenchi §4.2 |
| `site-factory-editor/lib/dataforseo.ts` | A | client: Basic auth da `getSecret("DATAFORSEO_LOGIN"/"DATAFORSEO_PASSWORD")` costruita in memoria, trasporto iniettabile (tipo `Trasporto` di `chiavi-traffico.ts`), `redigi` sui messaggi, `SF_DATAFORSEO_REGISTRATE` (risposte registrate per E2E senza chiave), cache su disco §2.4, tentativi, `ErroreDfs`, costi, `saldo`, `localitaIT`, `trovaLocalita`, `volumi`, `serp`, `configurata()` |
| `site-factory-editor/lib/mappa-lavoro.ts` | A | lettura ingressi (contesto; zone con `leggiZoneServite` + `zoneUsabili` + `comuniServiti`, `caricaDati`, `regioneDiSigla`, `etichettaArea`), generatore delle fasi §7, scritture atomiche, `escludi` e `riammetti` (riselezione senza chiamate) |
| `site-factory-editor/lib/run-bus.ts` | M | `kind: "traffico"`, `busIdTraffico`, `startTrafficoRun` (una mappa alla volta), `fileEventiPerId` |
| `site-factory-editor/lib/agenti.ts` | M | `kind` allargato; `percorsoRun` → `/traffico/<slug>`; `nomeStep` → «Traffico · mappa» |
| `site-factory-editor/app/api/clients/[slug]/traffico/mappa/route.ts` | A | `POST {azione:"calcola"}` → 202 `{id}` · `POST {azione:"escludi", testo, motivo}` → 200 · `POST {azione:"riammetti", testo}` → 200; 400 slug/corpo · 403 `Sec-Fetch-Site` · 415 content-type · 404 cliente · 409 `client.json` illeggibile, Sito non attivo, blocco (§8, zone comprese), calcolo in corso, mappa assente · 422 query non nell'universo o non tra le escluse |
| `site-factory-editor/components/traffico-mappa.tsx` | A | blocco §8 (client: azioni, dialog, fase live) |
| `site-factory-editor/app/traffico/[slug]/page.tsx` | M | legge mappa, esclusioni, blocco e staleness; monta `TrafficoMappa` nella card Sito |
| `site-factory-editor/scripts/test-mappa-query.ts` | A | banco §13 |
| `site-factory-editor/scripts/campione-serp.ts` | A | §9 |
| `site-factory-editor/scripts/fixtures/mappa-query/contesto.json`, `raw-submission.json`, `localita-it.json` | A | fixture §3.5 (lead form v4 sintetico senza dati personali; località: estratto vero del CSV DataForSEO); comuni dal dataset T6a vero |
| `site-factory-editor/scripts/fixtures/mappa-query/risposte/*.json` | A | risposte registrate sulla forma documentata: `volumi-italia-1..3`, `volumi-sede`, 8 `serp-*` (local pack, AI Overview, annunci, solo directory, Milano, vuota 40102), `errore-40100`, `errore-40210`, `errore-40202`, `errore-50000`, `user-data`; sostituite da 3 risposte reali in calibrazione |
| `site-factory-editor/DESIGN-BRIEF.md` | M | sezione «Ricerche su cui puntare (shape — data)» |
| `docs/traffico/calibrazione-T4/` | A (solo con chiave e ok alla spesa) | `campione-<data>.ndjson`, `composizione-<data>.json`, `giudizio-<data>.csv`, `costi.ndjson` |
| `docs/traffico/piano-T4.md` | M | Calibrazione, Verifica, chiusura |
| `docs/traffico/README.md` | M | §7 T4 («fatto, da calibrare con chiave»); §8 developer token Google Ads tolto (decisione T4 punto 1) |
| `docs/handoff-fase-c.md` | M | stato T4 |
| `docs/DEBUG.md` | M | «la mappa non parte o fallisce» → `traffico/logs/run-mappa.ndjson` (fasi, errore) + `costi.ndjson`; «in attesa delle zone» → card delle zone servite (`zoneUsabili`); «numeri strani» → `mappa-query.json` (`fonte.richiestaSha` → file in `~/.cache/site-factory/dataforseo/`); «dominio classificato male» → `mappa-domini.json`; «comune che manca» → avviso del tetto in `mappa-query.json` |

Fixture fuori git: `site-renderer/out/zz-test-t4/` (`client.json` con Sito attivo e dominio finto, `brief.json`,
`raw-submission.json` form v4 con «Cologno Monzese e dintorni», `contesto.json`; varianti: lead Tally per «da impostare», etichetta
non riconosciuta per «da controllare»), nel Cestino a fine fase 4.

Non si toccano: `lib/zone-servite.ts`, `components/zone-servite.tsx`, `lib/secrets.ts`, `lib/chiavi-traffico.ts`,
`app/api/setup/keys/route.ts`, `lib/steps.ts`, `lib/catena.ts`, `lib/build.ts`, `lib/deploy.ts`, `lib/schemas.ts`,
`lib/traffico.ts`, `lib/clients.ts`, `lib/staleness.ts`, `lib/run-step.ts`, renderer, `site-intake/`, n8n, skill.

## 11. Perimetro per `.claude/scope.json` (primo atto della fase 2)

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

**M0 — Precondizioni (nessun codice).** `scope.json` vuoto; T3 e K1 chiusi (verificato il 15/09: `lib/zone-servite.ts` con
`leggiZoneServite`/`zoneUsabili`/`comuniServiti`, `DATAFORSEO_*` in `CHIAVI_TRAFFICO`); `site-renderer/data/comuni-fatti.json` in git
e `site-intake/public/data/province.json` presente (generato, fuori da git: se manca `npm run comuni` in `site-intake/`, punto
aperto di T3). Rilettura in `node_modules/next/dist/docs/` di `route.md`, `dynamic-routes.md`, `use-router.md`.
`git log --oneline -5`, `git status --short`.

**M1 — Regole pure.** `mappa-query.ts`, `serp-classifica.ts`, lessico, domini, fixture, banco casi 1-8 e 15-26. Verifica: banco verde,
`npx tsc --noEmit`. Nessun commit da solo.

**M2 — Client.** `dataforseo.ts`, banco casi 9-14, 27. Verifica: banco, `tsc`, `npm run build`; tabella delle regioni e degli
esonimi confrontata col CSV pubblico (streaming, nessun file); con le chiavi di Mattia già salvate (K1): `saldo()` una volta (solo
`user_data`, gratis). **Commit 1** (M1+M2) + push.

**M3 — Lavoro e route.** `run-bus.ts`, `agenti.ts`, `mappa-lavoro.ts`, route; banco casi 28-30. Verifica sul dev server (:3311) con
`zz-test-t4` e `SF_DATAFORSEO_REGISTRATE=scripts/fixtures/mappa-query/risposte`: (1) `calcola` → 202, run nella status bar con le 6
fasi, `mappa-query.json` valido (schema) con 8-20 target e `comuniUsati: 40`, `costi.ndjson` con 4 righe «volumi» e le righe SERP;
(2) secondo `calcola` → mappa uguale salvo `generataAt`, nessuna riga di costo nuova; (3) `escludi` una target → 200, rimpiazzata,
universo invariato, nessuna chiamata; (4) `riammetti` la stessa → 200, target di prima, nessuna chiamata; (5) risposte 40210 →
errore «Credito…», mappa precedente intatta (sha); (6) senza chiavi né variabile → 409 «non configurata»; (7) variante Tally (zone da
impostare), Sito sospeso, `client.json` illeggibile → 409 col motivo; (8) due `calcola` in parallelo su due clienti → il secondo
409; (9) stop dalla status bar → «interrotto», nessuna mappa scritta. sha256 di `client.json` e dell'eventuale
`traffico/zone-servite.json` della fixture prima e dopo: identici. **Commit 2** + push.

**M4 — UI.** `traffico-mappa.tsx`, `page.tsx`, sezione in `DESIGN-BRIEF.md`. Verifica: `tsc`, `npm run build`; browser a 1280 e 400 px,
tema chiaro e scuro, ogni stato della tabella §8 (fixture con varianti di file), dialog Escludi con tastiera (`Esc`, focus, textarea
obbligatoria), Riammetti, Ricalcola, fase live, una sola primaria con la card delle zone «da impostare»; `impeccable detect --json`
sui file UI; `/impeccable critique` sul blocco. **Commit 3** + push.

**M5 — Campione.** `campione-serp.ts`, banco casi 31-33; `esegui --registrate` sulle fixture. Con chiave **e ok esplicito di Mattia
alla spesa (≈ 1,54 $, decisione T4 punto 2)**: `esegui --conferma-spesa`, `giudizio`, giudizio di Mattia, `accordo`; controlli C1-C8
(§«Calibrazione»). **Commit 4** + push.

**M6 — Chiusura.** DEBUG.md, README §7 e §8, handoff, «Verifica»; diff riga per riga; file toccati = §10; fixture nel Cestino;
`scope.json` svuotato; commit finale dopo le verifiche dell'orchestratore.

## 13. Banco `scripts/test-mappa-query.ts` (senza rete, stile `test-traffico-stato.ts`; dataset T6a e `province.json` veri, lead sintetici in cartella temporanea come `test-zone-servite.ts`)

Universo e zone
1. Fixture Cavaliere → 32 teste, i 4 servizi senza query elencati, 40 comuni usati su 132, 2.656 righe tutte misurabili in 4 lotti (tabella §3.5).
2. Normalizzazione: «Cassina de' Pecchi» → «cassina de pecchi»; «Muggiò» conserva l'accento; niente doppi spazi; 81 caratteri o 11 parole → non ammessa col motivo.
3. Tracciabilità: ogni riga ha una testa legata a un servizio del contesto o al mestiere del settore; nessun testo con `vietati`; nessun modificatore fuori da `MODIFICATORI`; ogni comune di riga ∈ `comuniServiti` (nessuna query fuori zona).
4. Comuni usati: ordine per `popolazione / (1 + km/10)`, poi km, poi nome; tetto 40 e `⌊5.000 / (2 × teste)⌋` con un lessico largo; sede sempre inclusa se nell'area; avviso col numero dei comuni esclusi; etichette permutate → stessi comuni.
5. Area `italia`: comuni = provincia della sede (MI → 133, poi tetto); `italia` + «Bergamo e provincia» → MI ∪ BG; sola `italia` senza sede → blocco «Zone senza sede».
6. Sede: `zone.sede` null con area precisa → implicite `non_richiesto` + avviso; sede fuori dall'area → nessuna query col suo comune, implicite misurate alla sede, avviso.
7. `motivoBloccoMappa`: zone `da_controllare`, `da_impostare`, lead cambiato, file non leggibile, dataset non leggibile (frasi di `zoneUsabili` identiche), contesto invalido, chiavi assenti, Sito sospeso → frase esatta; proposta `riconosciute` o zone confermate con tutto il resto ok → `null`.
8. Servizio in nessuna macro → pagina `home` con avviso; contesto senza servizi → blocco col motivo.

Client e volumi
9. Lotti: keyword ordinate, ≤ 1.000 per task, `2380` per le query con comune, codice della sede per le altre; permutare l'input non cambia i lotti.
10. `search_volume: null` → `non_disponibile`; `0` → `misurato` 0; `datiAl` = ultimo mese di `monthly_searches`.
11. Cache: seconda chiamata identica senza `fetch` e senza riga di costo; TTL scaduto → `fetch`; risposta d'errore mai in cache.
12. Errori: 40100 → `auth` subito (1 tentativo); 40210 → `credito`; 40202 poi 20000 → ok al 2° tentativo (attese finte); 50000 ×3 → `servizio`; `fetch` che lancia → `servizio`; forma sbagliata → `forma` col percorso.
13. Saldo < 2 × stima → errore `credito` prima di qualunque chiamata pagata.
14. `costi.ndjson`: una riga per chiamata pagata col `cost` della risposta; valida con `RigaCostoSchema`; nessuna credenziale (né la Basic auth) nelle righe né nei messaggi.

Località
15. `trovaLocalita`: Cologno Monzese (regione da `regioneDiSigla("MI")`) → City `1008436` prima di Municipality `9201369`; «Cologno al Serio» non confuso; Milano → «Milan» via esonimo; Bolzano → trovato; nome assente → `null`.

Classificazione
16. Regole §4.2 una per una: `www.` e `it.` come suffissi; `comune.monza.it` e `.gov.it` → `pa`; dominio anche nel local pack → `impresa_locale`; ignoto con «Brugherio» nel titolo → `impresa_locale`; ignoto senza segnali → `altro`; dominio del cliente → `cliente`.
17. Feature: schede del local pack senza `is_paid`, AI Overview, annunci contati, Local Services.
18. SERP vuota (40102 o zero organici) → `vuota`, difficoltà bassa col fattore dedicato.

Difficoltà e punteggio
19. Milano → alta; SERP con 5 imprese ottimizzate a Cologno → media; comune piccolo con solo directory e social → bassa; somma dei fattori = punti; confini 2/3 e 5/6.
20. Esempio §5.1 → 53,4 esatto; `O` minimo 0,4; `V` con 0, `null`, 1.000, 50.000; tre fattori per riga.

Selezione e assegnazione
21. Fixture: 8 ≤ target ≤ 20; ≤ 3 per pagina con una principale; ogni macro con una riga idonea coperta; nessuna alta; «rifacimento bagno X» e «ristrutturazione bagno X» mai entrambe; metà massima con volume nullo; pagine solo `home`, `servizio:*`, `zone`.
22. Meno di 8 idonee → `insufficiente` coi motivi; tutti i volumi `null` → 8 target scelti per W e R con «volume non misurato» nel perché.
23. Esclusione di una target → sparisce, entra la successiva, nessun altro punteggio cambia; riammissione → mappa uguale a prima dell'esclusione salvo `generataAt`; testo assente dall'universo o non tra le escluse → errore; motivo < 3 caratteri → errore.
24. A1-A4: mestiere + sede → `home`; mestiere + Brugherio → `zone`; servizio + sede → `servizio:ristrutturazioni-e-manutenzioni`; servizio + Brugherio → stessa pagina servizio; `mestiereAltrui` mai `home`.
25. Determinismo: pipeline completa due volte con trasporto finto → uguale salvo `generataAt`; input permutati (servizi, etichette delle zone, item SERP) → uguale.
26. Staleness: cambio di sha di `contesto.json`, lessico o domini, o di `zoneSha` (sede o comuni usati cambiati) → `vistaMappa().daRicalcolare` con l'elenco; un comune cambiato oltre il tetto dei 40 → nessuna staleness.

Chiavi
27. `getSecret` iniettato senza valori e senza `SF_DATAFORSEO_REGISTRATE` → `configurata()` false, `motivoBloccoMappa` «non configurata», nessuna eccezione; `dataforseo.ts` non importa `setSecret`/`salvaSegreti`.

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
| **Volumi `null` diffusi** nei comuni piccoli | `null` ≠ 0 dichiarato; selezione per vincibilità e rilevanza; massimo metà dei target senza volume; popolazione nel perché; il peso dei comuni usati privilegia i più popolosi vicini |
| **Area larga** (provincia, regione, «Tutta Italia») con centinaia di comuni | «Tutta Italia» = provincia della sede; tetto 40 per popolazione e vicinanza; avviso coi comuni non misurati; C8 |
| Zone cambiate dopo il calcolo | `zoneSha` (sede + comuni usati) → «Da ricalcolare»; zone non più usabili → mappa in lettura con «In attesa delle zone» |
| Varianti sommate da Google (stesso numero su forme diverse) | gruppi del lessico + Jaccard sulla top 10; il volume si legge «circa, arrotondato da Google» |
| **Difficoltà senza dati sui link** | calibrazione con giudizio cieco ≥ 80 %; primo rialzo: Backlinks API sui domini della top 10 (costo da misurare) |
| Elenco domini incompleto | regole 6-8 prudenti; `dominiNonInElenco` in UI e nel campione; C1: quota `ignoto` ≤ 15 % |
| SERP per coordinate ≠ telefono vero | C5 contro `location_code`; `checkUrl` per il controllo a mano; `device: mobile` dichiarato |
| Costi fuori controllo (bug, cicli) | tetti per lavoro (6 task, 100 SERP, 40 comuni), saldo prima di spendere, cache, `--conferma-spesa` nel campione, costo reale per chiamata |
| Limite Google Ads live (12/min) e 30 simultanee | una mappa alla volta in tutto l'editor, ≥ 5 s tra i lotti, 5 SERP in parallelo, tentativi su 40202/40209 |
| Credenziali nei log | Basic auth costruita in memoria; `redigi` su ogni messaggio; righe di costo senza header; banco 14 |
| Mappa vecchia rispetto ai dati | sha degli ingressi e delle regole → «Da ricalcolare» con ciò che è cambiato |
| **Doorway** (servizio × comune) | nessuna pagina servizio×comune né pagina-comune; le query con comune vanno a pagina servizio o «Zone servite» |
| Query di mestieri che il cliente non fa come attività | `mestiereAltrui`: rilevanza dimezzata, mai home |
| Promesse implicite nella UI | niente posizioni, clic o stime di traffico; «volume» come ricerche medie arrotondate con fonte e data |
| Forma delle API cambiata | parse Zod solo dei campi usati; errore `forma` col percorso; fixture sostituite da risposte reali in calibrazione |
| Termini DataForSEO (§7.1-7.2 in R1) | uso interno per i propri clienti, nessuna rivendita dei dati; rischio verso Google a carico di ConsulBuild dichiarato |
| `province.json` assente su un checkout pulito (punto aperto di T3) | `zoneUsabili` → «Dati dei comuni non leggibili: …» con il rimedio `npm run comuni`; mappa bloccata, nessuna eccezione |
| Pilota unico, niente gruppo di controllo | la mappa sceglie cosa misurare; gli effetti li giudica T7 con `mappa-storico.ndjson` |

## 15. Decisioni prese e dubbi aperti

Già decisi (`decisioni-piani.md`, valgono sopra questo testo): solo DataForSEO, niente client Google Ads (T4-1); spesa di prova con
API vere quando Mattia inserisce la chiave (T4-2); solo Live e solo mobile (T4-3); esclusione reversibile con «Riammetti» (T4-5);
servizi abbinati per nome normalizzato (T4-6); soglie e pesi iniziali da calibrare con accordo ≥ 80 % su 20 righe cieche (T4-7);
zone solo da `lib/zone-servite.ts`, nessuna priorità, nessuna pagina-comune, `lib/dataforseo.ts` e `kind: "traffico"` nati in T4
(T3-13, T3-14); nessuna modifica a `secrets.ts` né alla route delle chiavi (K1-6). La decisione T4-4 (pagina-comune con cantiere) è
superata da T3-13.

Dubbi aperti (proposta tra parentesi):

1. Tetto di 40 comuni pesati `popolazione / (1 + km/10)`, con «Tutta Italia» ristretta alla provincia della sede (sì; C8 li fa
   guardare a Mattia su `zz-test-t4`, gratis).
2. Modificatore «costo» tolto dall'universo: nessuna pagina senza prezzi lo soddisfa (sì; torna se T5a reintroduce i prezzi).
3. Pesi senza priorità 45/35/20 al posto di 35/30/20/15, stessa soglia 35 (sì, da calibrare in C3/C6).
4. Sede tolta dalle zone dall'operatore: nessuna query col suo comune, implicite misurate alla sede con avviso (sì).
5. Sola «Tutta Italia» e sede non risolta: blocco, mai un comune scelto a caso (sì).
6. Spesa di prova di una mappa ≈ 0,60 $ invece di 0,42 $ (40 comuni invece di 11), dentro la decisione T4-2 (sì, dopo M4).
7. Dati del campione in git in `docs/traffico/calibrazione-T4/` (≈ 1,2 MB), risposte integrali solo in cache (sì).
8. Nessuna ricerca di marca nell'universo: la misura Search Console (sì).

## Calibrazione

Fase 3 del 2026-09-15. **Chiavi DataForSEO assenti all'avvio dello sviluppo** (Keychain): sviluppo e prove su risposte
registrate sintetiche (`scripts/fixtures/mappa-query/risposte/`, forma documentata, domini finti `.example`). Mattia le ha
inserite durante la giornata: a fine fase 3 `configurata() = true` e **saldo 1,00 $** letto con `user_data` (gratuito, unica
chiamata fatta con le chiavi vere). Il saldo è sotto il doppio della stima di ogni passo a pagamento (campione 3,08 $ richiesti,
mappa 1,32 $): il client si fermerebbe con «Credito DataForSEO insufficiente» prima di spendere, quindi la calibrazione a
pagamento resta **in attesa della ricarica** (README §8: 50 $) e dell'ok di Mattia al protocollo qui sotto.

### Fatta senza chiavi (gratis)

**Lessico** (curatela, `lib/mappa-lessico.json` 2026-09-b, commit `d14714e`). Letti in sola lettura i `contesto.json` dei 3
clienti e i lavori proposti dal form per i 7 mestieri (`site-intake/src/data/tassonomia.ts`).

| Contesto | Teste | Servizi senza ricerche dopo la calibrazione |
|---|---|---|
| Cavaliere (24 servizi) | 32 (28 + 4 di mestiere), invariato | Assistenza tecnica in cantiere · Coordinamento delle lavorazioni · Finiture interne ed esterne · Ripristini e manutenzioni esterne |
| La Cecilia (8) | 13 | Scelta dei materiali (prima anche «Ristrutturazione case», «Trasformazione vasca in doccia») |
| Saggin (11) | 16 | Pittura artistica (prima anche «Pavimenti», «Rivestimenti») |
| Lavori del form: impresa edile, ristrutturazioni | 24 e 24 | nessuno |
| idraulico · elettricista · cartongesso · serramenti · imbianchino | 12 · 9 · 9 · 8 · 9 | Pronto intervento · LED, pronto intervento, rifacimento impianti, riparazioni · cabine armadio, contropareti, librerie, velette · riparazioni e sostituzioni · decorazioni, pitture speciali, resine |

Restano scoperti di proposito i servizi ambigui tra mestieri (una testa del lessico è fissa: «Pronto intervento» o «Rifacimento
impianti» valgono per l'idraulico e per l'elettricista) e quelli senza una ricerca tipica verificabile. Aggiunto il campo
facoltativo `nessuna` alle voci: «Verniciatura ringhiere e infissi» di un imbianchino generava «sostituzione infissi» e
«serramentista» (banco caso 8). Da decidere con Mattia: la voce generica «Impermeabilizzazioni» oggi dà «impermeabilizzazione
terrazzo» (non «tetto»).

**C8 — comuni usati** (da guardare con Mattia, nessuna modifica alle regole):
- `zz-test-t4`, «Cologno Monzese e dintorni»: 40 su 132, da Milano (1°) ad Agrate Brianza (40°), come il §2.3; fuori Meda,
  Arcore, Mariano Comense, Melzo, Cesano Boscone…
- Saggin, «Tutta la regione Veneto», sede Sandrigo (sola lettura): 40 su 560. Il peso porta dentro i capoluoghi lontani (Padova
  35 km, Verona 53, Venezia 61, Rovigo 67, Chioggia 70, San Donà di Piave 77) e lascia fuori comuni piccoli a 5-10 km dalla sede
  (San Martino di Lupari, Rubano… nell'avviso). La rilevanza scende già a 0,6 oltre 25 km. **Domanda per Mattia**: per le aree
  regionali la vicinanza deve pesare di più (per esempio `popolazione / (1 + km/5)`)? Proposta: decidere dopo C6 sulla mappa vera.

**Testi** (frasi del perché e UI, rivisti sui 19 target della fixture a 1280 e 400 px): «fino ad agosto» (d eufonica); niente
«nell'area «Cologno Monzese (MI)»» ripetuto per il comune della sede; «Ricalcolo non disponibile. {motivo}.» invece di due
coppie di due punti; in attesa delle zone, senza chiavi e in pausa la frase di stato è il motivo (niente doppioni); uno stop dalla status bar non
mostra «non riuscito»; nel banner d'errore «Resta la mappa del calcolo precedente.»; «Lavori senza ricerche» e «Siti da
classificare» nei dettagli (niente «SERP» o «keyword»).

**Soglie e pesi**: invariati (valori iniziali del piano, decisione T4 punto 7). Osservazione dal campione sulle risposte registrate
(non è un dato reale, solo il comportamento delle regole): una città oltre 250.000 abitanti con 3 risultati deboli scende a
«bassa» (F1 +5, F5 −3 → 2 punti), contro il «capoluogo fuori portata» della ricerca §3. Se C2 e C3 lo confermano su pagine vere,
prima correzione proposta: F5 al massimo −1 quando F1 vale +5 (oppure «alta» fissa sopra 250.000).

**Revisione /impeccable del blocco**: `impeccable detect --json` su `components/traffico-mappa.tsx` e `page.tsx` → `[]`.
Critique in un solo contesto (questo agente non ha sub-agenti; nessuno snapshot scritto in `.impeccable/`, fuori perimetro): corretti
lo scorrimento orizzontale a 400 px (volume e badge non andavano a capo), «Escludi…» spostato sulla riga della ricerca così il
«Perché» aperto usa tutta la larghezza, focus restituito al bottone quando un dialog si annulla.

### In attesa delle chiavi: protocollo del test mirato (tetto 3 $ in tutto, decisione T4 punto 9)

Tutto passa dalla cache (`~/.cache/site-factory/dataforseo/`): un passo rilanciato entro i TTL non si ripaga. Ogni costo è il campo
`cost` delle risposte, in `docs/traffico/calibrazione-T4/costi.ndjson` (campione) e `out/<slug>/traffico/costi.ndjson` (mappa).

1. Mattia inserisce login e password in Impostazioni → Chiavi API (prova gratuita `user_data`).
2. **Campione (≈ 1,54 $)**: `cd site-factory-editor && node --experimental-strip-types scripts/campione-serp.ts esegui` (solo stima),
   poi con l'ok di Mattia `… esegui --conferma-spesa` (legge il saldo e si ferma se è sotto 3,08 $). Grezzi in
   `~/.cache/site-factory/calibrazione-T4/campione-<data>.ndjson`, in git `composizione-<data>.json`.
   - **C1**: `totale.quotaIgnoto` ≤ 15 %; altrimenti i domini più frequenti fra le regole `ignoto*` entrano in `lib/mappa-domini.json`.
   - **C2**: `perTaglia` (quote di imprese locali, portali e directory; livelli b/m/a) contro le fasce 50.000/250.000 di F1.
3. **C3 (≈ 30 minuti di Mattia)**: `… giudizio ~/.cache/site-factory/calibrazione-T4/campione-<data>.ndjson` → Mattia compila la colonna
   `giudizio` di `docs/traffico/calibrazione-T4/giudizio-<data>.csv` con la domanda del §9 → `… accordo <csv>`. Atteso accordo esatto
   ≥ 80 %; sotto si ritoccano le soglie 2/3 e 5/6, poi i punti dei fattori, e si conferma su 20 righe nuove (`--seme` diverso).
4. **Mappa di Cavaliere (≈ 0,66 $ al massimo)**: le sue zone sono «Da impostare» (brief Tally): Mattia le imposta nella card, poi
   «Calcola la mappa». **C6** revisione dei target con Mattia; **C7** costo reale da `out/cavaliere-build-srls/traffico/costi.ndjson`.
   **Prima di spendere (collaudo finale, 15/09)**: le zone di Cavaliere ora sono impostate («Cologno Monzese e dintorni» + «Tutta la
   regione Lombardia», `traffico/zone-servite.json` delle 16:36) ma con `sede: null` (lead Tally: la card di T3 non ha un campo per la
   sede). Letti in sola lettura con `leggiIngressi`: 40 comuni su 1.502 scelti per sola popolazione (Milano, Brescia, Monza, Bergamo,
   Busto Arsizio, Como, Varese… Mantova, Voghera, Crema; Cologno Monzese 19°), nessuna ricerca senza comune misurata e nessuna ricerca
   assegnata alla home (A1 e A3 vogliono la sede). La mappa sarebbe coerente con le regole del §2.3 ma inutile per il pilota: **serve
   prima la sede nelle zone di Cavaliere** (T3, fuori da questo perimetro), poi il passo 4.
5. **C4 e C5 (≈ 0,26 $)**, dalla stessa cache: volumi di 10 ricerche senza comune della sede su City e su Municipality (2 task,
   `creaClientDfs().volumi(keywords, 1008436)` e `(keywords, 9201369)`); 10 ricerche con comune lette con `location_coordinate` e con
   `location_code` del comune (Jaccard dei domini ≥ 0,8, altrimenti si passa al `location_code`).
6. Tre risposte reali (un lotto di volumi e due pagine di Google) prese dalla cache sostituiscono le omologhe registrate in
   `scripts/fixtures/mappa-query/risposte/` (decisione T4 punto 8); il banco resta verde.

Somma prevista 2,46 $ (campione 1,54 + mappa 0,66 + C4-C5 0,26), sotto il tetto di 3 $.

### Calibrazione sui dati reali (15/09, decisione T4 punti 10-11, regole `2026-09-c`)

- **C-a comuni vicini**: con la sede, i comuni misurati sono prima quelli entro `RAGGIO_VICINI_KM` = 25 km (o il raggio più ampio
  di un «dintorni») per popolazione, poi i successivi per distanza; senza sede resta popolazione / (1 + km/10). Il raggio va nella
  mappa (`ingressi.raggioKm`) e `puoEssereTarget` esclude dalle pagine di Google da leggere e dai target le ricerche con comune
  oltre il raggio: si misurano, non si puntano. Banco 4 e 25.
- **C-b mestiere altrui**: le teste di mestiere di un altro mestiere (`mestiere` nel lessico: elettricista, idraulico,
  imbianchino, serramentista) restano nell'universo e si misurano, ma non sono mai candidate né target (tolti il dimezzamento
  della rilevanza e la sua frase, ora irraggiungibili). Cavaliere (contesto reale = fixture, confrontati il 15/09): altrui
  «elettricista», «idraulico», «imbianchino»; restano le 25 teste di servizio. Banco 24.
- **C-c domini nazionali**: un dominio fuori elenco (né elenchi, né PA, né cliente) nei risultati di comuni di **almeno 3
  province** del campione non è un'impresa locale: `portale` se la pagina nomina il luogo o è nel local pack (una pagina per
  città), altrimenti `altro`; regola `nazionale:piu-province`. Elenco ricavato dal campione con `campione-serp.ts ricalcola`
  (384 pagine dalla cache, 0 chiamate, 0 $), copiato in `lib/mappa-domini.json` (`nazionali`, 49 domini) con il dettaglio delle
  province in `calibrazione-T4/nazionali-2026-09-15.json`. Banco 16 e 31.
  - **Soglia**: su 775 domini fuori elenco, 668 in 1 provincia, 58 in 2, 49 in 3 o più. A 2 province metà dei casi sono imprese
    vere di due province vicine (27 su 58: Milano e Monza, Vicenza e Treviso: rgmedilizia, supermario24, artedecori…); da 3 in su
    quasi solo portali, reti di pagine per città, catene e guide (controllo sotto). Le 31 coppie di regioni diverse (idraulicisubito Pescara e Napoli, handoo, finstral…)
    sono quasi tutte reti o portali: estensione possibile «2 province di regioni diverse», non applicata.
  - **Controllo a mano dei 20 domini riclassificati più frequenti** (titoli e URL nel campione): 19 corretti — preventivofacile,
    houzz, taskrabbit, cercoproitalia, pgcasa, archisio, edilportale, la-certificazione-energetica (portali); leroymerlin (catena);
    costo-ristrutturazione-casa (guide); ristrutturazioni.milano.it, alexprontointervento, sporext-group, ecoisolamentotermico,
    imbiancatura.com, pronto-intervento24, idraulicoin (reti di pagine per città); sgombero.eu, metrabuilding (elenchi). **1
    sbagliato**: posainoperapavimentiroma.it, impresa romana che a Roma è locale (fuori elenco anche perinotto.com e
    vanzinpavimenti.it di Treviso, 1 risultato ciascuno): l'elenco è unico per tutta Italia, e in una mappa della loro provincia
    contano come portale (+1 solo nei primi 3) invece che come impresa ottimizzata (+1 ovunque).
  - **Composizione prima → dopo** (`composizione-2026-09-15.json` → `composizione-2026-09-15-nazionali.json`; «prima» ricalcolata
    identica a quella registrata):

    | | imprese locali | portali + directory | altro | fuori elenco (ignoto) | difficoltà b/m/a |
    |---|---|---|---|---|---|
    | Totale | 43 % → 35 % | 44 % → 53 % | 13 % → 13 % | 46 % → 33 % | 80/107/197 → 82/114/188 |
    | Comuni piccoli | 32 % → 26 % | 53 % → 59 % | 15 % | 35 % → 24 % | 67/58/3 → 72/53/3 |
    | Comuni medi | 44 % → 35 % | 45 % → 54 % | 11 % | 45 % → 33 % | 13/35/80 → 10/46/72 |
    | Città grandi | 54 % → 43 % | 34 % → 45 % | 12 % | 58 % → 42 % | 0/14/114 → 0/15/113 |

    35 dei 49 domini erano imprese locali in almeno una pagina (preventivofacile 29 risultati, leroymerlin 24, houzz 18,
    taskrabbit 18…). Le pagine «alta» passano da 197 a 188 (meno imprese «ottimizzate» contate in F2); soglie e punti invariati.
- **Ricalcolo della mappa di Cavaliere** (15/09 dall'editor, regole `2026-09-c`): stima prima di spendere 0,42 $ al massimo
  (3 lotti di volumi nuovi, quello della sede in cache, ≤ 75 pagine di Google a 0,002 $ reali; la stima interna a 0,004 $ diceva
  0,57); **spesa reale 0,35 $** (3 lotti 0,27 + 37 pagine 0,076; 26 dalla cache), saldo 49,53 → 49,19 $. Spesa totale dei test T4
  1,79 $. 40 comuni tutti entro 25 km (Milano 11 km … Treviglio 24, Cantù 25), 62 pagine lette, 41 risultati «nazionali».
  Target **13 → 16**, stato «completa»:

  | Pagina | Prima (regole `2026-09-b`) | Dopo |
  |---|---|---|
  | Home | — (nessuno) | impresa edile (senza comune, 30) · impresa edile cologno monzese (30) |
  | Costruzioni | preventivo costruzione casa | = |
  | Ristrutturazioni | ristrutturazione bagno varese (49 km) | ristrutturazione bagno lissone (10 km) · … cologno monzese · … brugherio |
  | Opere e finiture | demolizioni monza · cinisello balsamo · desio | demolizioni monza · cinisello balsamo · controsoffitti |
  | Impianti e servizi tecnici | elettricista bergamo (35 km) · brescia (74) · varese (49) | ristrutturazione chiavi in mano |
  | Esterni | cappotto termico · impermeabilizzazione balcone | + impermeabilizzazione terrazzo |
  | Zone servite | impresa edile saronno (22 km) · bergamo (35) · paderno dugnano (10) | impresa edile seregno (14) · giussano (19) · vimercate (11) |

  Nessun target oltre 25 km né di mestiere altrui (restano misurati: idraulico milano 27.100, elettricista milano 14.800).
  Escono per il tetto di 3 per pagina, a punteggio invariato: «demolizioni desio» (69,4, superata da «controsoffitti» 70,6),
  «impresa edile saronno» (65,2) e «paderno dugnano» (52,4, superate da Seregno 67,9, Giussano e Vimercate 66,4; Giussano è
  un comune nuovo tra i 40). La pagina Impianti ospita solo «ristrutturazione
  chiavi in mano» (servizio della sua macro): «Impianti idraulici» ed «elettrici» non hanno forme di servizio nel lessico.

### Scostamenti dal testo del piano (motivati)

- **Schema**: `comune` nullable solo per le ricerche senza comune quando la sede non è riconosciuta (§2.3 le vuole «non richiesto»,
  lo schema del §6.1 non le poteva rappresentare); `volume.fonte` presente anche per `non_disponibile` (anche il «null» di Google ha
  una provenienza: il vincolo è `stato ≠ non_richiesto ⇔ fonte ≠ null`); campi `escluse` (per validare «target non escluso» e
  accorgersi di un file delle esclusioni diverso), `serpNonLette` (lo stato «parziale» sopravvive a una riselezione) e `motivi`
  (le frasi di «Poche ricerche»); `testo` fino a 200 caratteri perché le righe oltre 80 restano nell'universo non ammesse (§3.3).
  Dopo la revisione indipendente: `selezionataAt` facoltativo (Escludi e Riammetti non spostano più `generataAt`, che resta la data
  del calcolo per la meta e per il banner dell'ultimo errore; lo storico usa `selezionataAt ?? generataAt`) e `escluseAlCalcolo`
  facoltativo (una ricerca esclusa al calcolo e poi riammessa non ha pagina di Google: la vista la segnala «Da ricalcolare» se il
  calcolo la leggerebbe).
- **Impronta del contesto** sui soli campi usati (settore, servizi, macro), non sui byte del file: una data o un tono cambiati non
  chiedono un ricalcolo (banco caso 26).
- **Mappa scritta compatta**: indentata pesava 3,5 MB con 2.656 righe.
- **Tentativi**: 3 in tutto con attese di 5 e 15 s (il banco 12 vuole «50000 ×3 → servizio»); i 45 s del §7 non servono.
- **Risposte registrate**: un file per località (`volumi-<location_code>.json`, le keyword assenti tornano con volume nullo), pagine
  di Google scelte per sha della keyword (`serp-milano.json` per Milano), `forza-errore.json` per le prove d'errore e
  `SF_DATAFORSEO_LATENZA_MS` per vedere nell'E2E la fase live, lo stop e il rifiuto del secondo calcolo.
- **Campione**: grezzi nella cache locale (decisione T4 punto 8, sopra il §9); `accordo` accetta il percorso del campione come
  secondo argomento.
- `datiVista` (letture per la pagina) sta in `lib/mappa-lavoro.ts`; la route di escludi e riammetti risponde solo `{ ok, stato,
  target }` (la mappa intera pesa megabyte e la pagina la rilegge).

## Verifica

### Sviluppo (fasi 2-3, 2026-09-15)

- **Banco** `node --experimental-strip-types scripts/test-mappa-query.ts`: **151 passati, 0 falliti** (casi 1-33 del §13 più vista,
  impronta del contesto e `nessuna`), 2 s, senza rete.
- `npx tsc --noEmit` pulito; `npm run build` verde (route `/api/clients/[slug]/traffico/mappa`).
- Banchi esistenti: `test-zone-servite` 110/0, `test-chiavi` 121/0, `test-traffico-stato` 58/0, `test-portafoglio` 43/0.
- **E2E M3** su `zz-test-t4` (`next start -p 3312` con `SF_DATAFORSEO_REGISTRATE`, cache nello scratchpad): (1) `calcola` → 202, 6 fasi,
  mappa valida, 19 target, 40 comuni, 64 righe di costo (4 volumi + 60 pagine); (2) secondo calcolo → stessi target e universo, costo
  0, 64 dalla cache, nessuna riga nuova; (3) `escludi` → 200, rimpiazzata, universo invariato; (4) `riammetti` → target di prima;
  422 su testo assente, non escluso, motivo corto; 400/403/415/404; (5) 40210 → «Credito DataForSEO esaurito (40210)…», mappa
  identica (sha); (6) senza chiavi né variabile → 409 «DataForSEO non configurata…»; (7) lead Tally → 409 «Zone servite da
  impostare…», Sito sospeso → 409, client.json fuori schema → 409; (8) seconda mappa in parallelo → 409 «si calcola una mappa alla
  volta»; (9) stop dalla status bar → «interrotto», mappa identica. sha256 di `client.json` identico prima e dopo; nessun
  `traffico/zone-servite.json` creato.
- **M4 browser** (`/traffico/zz-test-t4` e `zz-test-t4b` su :3311 e :3312): 1280 e 400 px, chiaro e scuro, nessuno scroll orizzontale;
  Escludi con tastiera (focus nel campo, conferma disabilitata sotto 3 caratteri, `Esc` e focus restituito), Riammetti, Ricalcola
  col dialog, fase live con tempo e status bar («1 agente al lavoro», chip «Traffico · mappa»), rilettura automatica a fine calcolo;
  stati Pronta, In attesa delle zone (unica primaria «Imposta le zone» della card zone), Non configurata, In pausa, Bloccata, Da
  ricalcolare (primaria Ricalcola…), Non riuscita (primaria Riprova) e ultimo ricalcolo fallito.
- **Campione** su risposte registrate: `esegui` senza opzioni stampa la stima 1,54 $ senza chiamate; `esegui --registrate` → 384
  pagine, composizione e tabella; `giudizio` → CSV cieco di 20 righe; `accordo` su un giudizio finto → matrice e disaccordi.
- Fixture `site-renderer/out/zz-test-t4/` e la variante `zz-test-t4b/` nel Cestino a fine prove (`ls site-renderer/out/` = i 3
  clienti). Per rifarle: `contesto.json` e `raw-submission.json` da `scripts/fixtures/mappa-query/`, `brief.json` e `intake.json` con
  `azienda`, `client.json` minimo con `traffico.sito.stato: "attivo"` e `steps.build.deploy.dominio` finto; l'editor di prova con
  `SF_DATAFORSEO_REGISTRATE=scripts/fixtures/mappa-query/risposte SF_DATAFORSEO_CACHE=<cartella temporanea>` (più
  `SF_DATAFORSEO_LATENZA_MS=700` per vedere la fase live). Nessuna scrittura nelle cartelle dei clienti reali; cache vera
  `~/.cache/site-factory/dataforseo/` mai creata.
- Commit: `ddcede0` (M1+M2), `16c0984` (M3), `532f5ed` (M4), `66e6482` (M5), `d14714e` (lessico) + documenti.

### Correzioni dopo la revisione indipendente (2026-09-15)

- Corretti: riammessa dopo un ricalcolo senza pagina di Google → «Da ricalcolare» («1 ricerca riammessa senza pagina di Google»,
  un'esclusione dopo il calcolo invece non chiede nulla); lessico «rivestiment» con `nessuna` cappotto/facciata/pietra/legno/esterni e
  «sanitar» con `nessuna` idrico/impianti; `generataAt` intatto a Escludi e Riammetti (`selezionataAt`); variante coperta per
  risultati di Google che porta il suo gruppo alla vincente; `haMappa` esplicito nella vista (mappa con 0 ricerche → «Ricalcola…» col
  dialog); Sito sospeso o spento durante il calcolo → stop prima della chiamata pagata successiva e nessuna scrittura; focus del
  dialog «Ricalcolare la mappa?» stabile (onCancel stabile); «solo annunci Local Services» invece di «nessun annuncio, annunci Local
  Services»; risposta pagata fuori forma mai in cache e voce di cache fuori forma = assente; riga di costo anche per un tentativo
  interrotto dallo stop.
- Banco `test-mappa-query.ts` **162 passati, 0 falliti** (11 casi nuovi, tutti falliti sul codice prima delle correzioni);
  `tsc --noEmit` pulito, `npm run build` verde; `test-zone-servite` 110/0, `test-chiavi` 121/0, `test-traffico-stato` 58/0,
  `test-portafoglio` 43/0.
- Browser (`next start -p 3312`, risposte registrate, fixture `zz-test-t4` e `zz-test-t4b` rifatte e poi nel Cestino): focus su
  «Annulla» dopo 6 s di poller a 1280 e 400 px, chiaro e scuro; Escludi → Ricalcola → Riammetti → «Da ricalcolare» col banner e primaria
  Ricalcola…, poi ricalcolo con la ricerca di nuovo tra le scelte (0 chiamate pagate); «solo annunci Local Services» nel Perché; mappa con
  0 ricerche e contesto cambiato → primaria «Ricalcola…» che apre il dialog; Sospendi subito dopo Calcola → «run interrotto: il servizio
  Sito non è più attivo…», mappa identica (sha), nessuna riga di costo.
- Fuori perimetro, da decidere: DELETE del cliente senza controllo del lavoro `traffico:<slug>:mappa`
  (`app/api/clients/[slug]/route.ts`), guard 409 sulla transizione del Sito con la mappa in calcolo
  (`app/api/clients/[slug]/traffico/route.ts`), effetto del focus in `components/confirm-dialog.tsx` per gli altri dialog.

### Correzioni dopo la seconda revisione (2026-09-15)

- Corretti: la stima prima di spendere usa la regola della cache di `volumi()` e `serp()` (`volumiInCache`/`serpInCache` su
  `vocePronta`): una voce fuori forma scritta dal codice di prima conta «da pagare» e il saldo si controlla, niente «volumi dalla
  cache» a lavoro che paga; `registraCosto` crea solo `traffico/` e mai la cartella di un cliente eliminato a calcolo in corso (le
  chiamate già partite non la fanno rinascere); il run-bus chiude «interrotto» (stato giallo) un lavoro Traffico che termina col
  prefisso `MESSAGGIO_INTERROTTO`, la stessa regola della vista: Sito sospeso, spento o cliente eliminato durante il calcolo non è
  più un errore rosso nella status bar.
- Banco `test-mappa-query.ts` **165 passati, 0 falliti** (3 casi nuovi: stima con voci fuori forma nel client e nel lavoro con 2
  controlli del saldo, cartella del cliente eliminato non ricreata; tutti e 3 falliti sul codice di `9e25c60`). La regola del bus non
  è nel banco (`run-bus.ts` importa senza estensione): verificata E2E.
- E2E (`next start -p 3312`, risposte registrate con latenza 700 ms, cache vuota nello scratchpad, fixture sintetiche: `zz-test-t4` poi
  nel Cestino, `zz-test-t4b` eliminata dalla prova stessa): DELETE di `zz-test-t4b` con 5 pagine di Google in volo → 200, run «interrotto», cartella assente
  anche 3 s dopo la fine; Sospendi su `zz-test-t4` con 5 pagine in volo → run «interrotto» (`text-warn` nella status bar), mappa
  precedente identica (sha), righe di costo 59 → 64 (solo le chiamate già partite); Riattiva e ricalcolo → «completa», 18 target, 40
  comuni. Browser 1280 e 400 px, chiaro e scuro: nessuno scroll orizzontale.
- Resta fuori perimetro: il guard 409 del DELETE sul lavoro `traffico:<slug>:mappa` (`app/api/clients/[slug]/route.ts`), ora senza
  cartelle orfane ma col cliente eliminato mentre il calcolo finisce.

### Collaudo finale (fasi 4-5, 2026-09-15, su `a7126a6`)

Suite rilanciata da zero (editor, `PATH=$HOME/.local/bin`):

| Comando | Esito |
|---|---|
| `npx tsc --noEmit` | pulito (exit 0) |
| `npm run build` | verde, route `/api/clients/[slug]/traffico/mappa` e `/traffico/[slug]` |
| `node --experimental-strip-types scripts/test-mappa-query.ts` | **165 passati, 0 falliti** |
| `scripts/test-zone-servite.ts` · `test-chiavi.ts` · `test-traffico-stato.ts` · `test-portafoglio.ts` | 110/0 · 121/0 · 58/0 · 43/0 |
| `scripts/campione-serp.ts esegui` (senza opzioni) | «stima 1.54 $. Nessuna chiamata», exit 0 |

**E2E** su fixture sintetica `zz-test-t4` (contesto e lead di `scripts/fixtures/mappa-query/`, Sito attivo, dominio `.example`) con
`next start -p 3312`, `SF_DATAFORSEO_REGISTRATE` su una copia delle risposte nello scratchpad, cache nello scratchpad, latenza 150 ms:

| Prova (M3 e brief) | Esito |
|---|---|
| 1 `calcola` | 202, 6 fasi nel log, mappa valida per `MappaQuerySchema`, «completa», 18 target su 7 pagine (≤ 3 per pagina, una principale), 40 comuni su 132, 2.656 righe; `costi.ndjson` 64 righe valide (4 volumi + 60 pagine), costo 0,60 $, nessuna credenziale; ogni target con fonte del volume, pagina di Google, fattori di difficoltà, 3 fattori di punteggio e almeno 3 frasi del perché |
| 2 secondo `calcola` | mappa identica salvo `generataAt` e `costo` (0 $, 64 dalla cache), nessuna riga di costo nuova: **deterministica** |
| 3-4 `escludi` e `riammetti` | 200, target rimpiazzato con universo invariato (sha), poi target e mappa identici a prima salvo le date, `generataAt` intatto, nessuna chiamata; 422 su testo non escluso, fuori universo («… bergamo»), motivo di 2 caratteri; 400 azione e slug, 404, 415, 403 `Sec-Fetch-Site: cross-site` |
| 5 credito (40210, cache vuota) | «Credito DataForSEO esaurito (40210)…», mappa identica (sha), una riga di costo `errore` |
| servizio (50000) | 3 tentativi a 0, 5 e 20 s (3 righe), poi «DataForSEO non risponde (50000)» |
| 8 in parallelo | durante il calcolo: `escludi` e secondo `calcola` → 409 «Calcolo della mappa in corso»; `calcola` su `zz-test-t4b` → 409 «si calcola una mappa alla volta» |
| 7 varianti su `zz-test-t4b` | lead Tally → 409 «Zone servite da impostare nel dettaglio Traffico» (`codice: zone`); Sito sospeso → 409; `client.json` fuori schema → 409 col campo; nessuna cartella `traffico/` creata |
| 9 stop dalla status bar | «interrotto» (non errore), mappa identica, righe di costo solo per le chiamate partite |
| Sospendi durante il calcolo | «run interrotto: il servizio Sito non è più attivo…», mappa identica; Riattiva e ricalcolo → «completa», 15 chiamate pagate e 49 dalla cache |
| 6 senza chiavi | non ripetibile E2E: le chiavi vere sono nel Keychain dal 15/09 (il collaudo non le tocca); coperto dal banco caso 27 e dall'E2E di sviluppo |

**Browser** (`/traffico/zz-test-t4` e `zz-test-t4b`, 1280 e 400 px, chiaro e scuro): «Pronta» col banner delle risposte registrate e i 7
gruppi; Escludi col dialog (focus nel campo, conferma disabilitata sotto 3 caratteri, `Esc` chiude e rende il focus al bottone della
riga, il poller di 3 s non sposta il focus), conferma → «Escluse da te (1)» e focus sull'h3; Riammetti → elenco vuoto e focus sull'h3;
Ricalcola… col dialog e la stima «al massimo circa 0,66 $»; «Da ricalcolare» con banner «È cambiato: contesto.json» e unica primaria
Ricalcola…; «In attesa delle zone» con unica primaria «Imposta le zone» della card zone; a 400 px nessuno scorrimento orizzontale
(`scrollWidth` 400), volume, badge ed Escludi… vanno a capo. Nel riquadro di prova i tasti Invio e Spazio non attivano i bottoni
(nemmeno un `<summary>`): limite dello strumento, conferme fatte col clic.

**Criteri del brief**: universo deterministico dai servizi e dai soli comuni serviti (banco 1-5, E2E 2); client senza dipendenze nuove
con costo reale per chiamata (E2E 1, 5); classificazione con elenco versionato e difficoltà spiegata (banco 16-19, perché nella UI);
8-20 target con pagina e provenienza di ogni numero (E2E 1); lavoro `traffico:<slug>:mappa` con log NDJSON e cache (E2E 1-2, 9);
campione pronto senza spesa; UI in lettura con Escludi e Riammetti; nessun client Google Ads. «Da calibrare con chiave» resta vero.

**Perimetro**: i commit del piano (`ddcede0`, `16c0984`, `532f5ed`, `66e6482`, `d14714e`, `af04d29`, `4068be0`, `9e25c60`,
`a7126a6`) toccano solo file del §10-§11 (in `site-factory-editor/components/home.tsx` c'è solo `1ffcc39` di K1); nessuna modifica
del piano non committata. Cartelle dei clienti reali e `~/.cache/site-factory/dataforseo/` mai scritte; fixture `zz-test-t4` e
`zz-test-t4b` nel Cestino (`ls site-renderer/out/` = i 3 clienti).

**Revisione del diff** (route, `mappa-lavoro.ts`, `dataforseo.ts`, `mappa-query.ts`, `run-bus.ts`, `agenti.ts`, pagina e componente):
nessun difetto nuovo nel perimetro. Scostamento notato e lasciato: nella selezione i doppioni d'intento per gruppo distinguono anche
il tipo (così «impresa edile» e «impresa edile cologno monzese» restano due target della home; il §5.3 dice «stesso gruppo e stesso
comune»): sono ricerche con pagine di Google diverse, e la regola di Jaccard le unisce se i risultati coincidono.

Punti aperti emersi (fuori perimetro):
- **Sede di Cavaliere assente** nelle zone servite (lead Tally, la card di T3 non ha il campo): la mappa sceglierebbe comuni solo per
  popolazione in tutta la Lombardia e nessuna ricerca per la home (§ Calibrazione, passo 4). Da risolvere in T3 prima della spesa.
- `components/confirm-dialog.tsx` non trattiene il focus: `Tab` dal bottone di conferma esce dal dialog (vale per tutti i dialog
  dell'editor).
- Il guard 409 del DELETE sul lavoro della mappa (già segnalato sopra).

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
