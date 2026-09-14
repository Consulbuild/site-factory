# Piano T2b — Sensori sul VPS e pannello «Visibilità su Google»

Stato: **fase 1 (piano) scritta il 2026-09-14**, da rivedere dall'orchestratore. Nessun codice toccato.
Fonti: `docs/traffico/README.md` (§1-§8), `docs/traffico/decisioni-piani.md`, `docs/traffico/brief-T2b.md`,
`docs/traffico/piano-T2a.md`, `docs/traffico/piano-T1a.md` (§2.4 registro `lastmod`, Integrazione), `docs/traffico/piano-T4.md`
(§6.1 `mappa-query.json` e `mappa-storico.ndjson`, §8 UI), `docs/ricerca-traffico-2026-09.md` §3 e §6.4,
`~/knowledge/seo/ricerche-2026-09-14/w2-5-verifiche-tecniche.md`, `docs/traffico/ricerca-scheda-google-2026-09.md` §8.4,
`docs/vps-integrazioni-setup.md` §4 e §10; codice: `infra/n8n/report-rinnovo.json`, `infra/n8n/registra-cliente.json`,
`infra/n8n/errori.json`, `scripts/n8n-import.ts`, `lib/integrazioni.ts`, `lib/portafoglio.ts`, `lib/cache.ts`, `lib/traffico.ts`,
`app/traffico/[slug]/page.tsx`, `components/traffico-ui.tsx`, `DESIGN-SYSTEM.md`, `DESIGN-BRIEF.md` (Area Traffico);
documentazione ufficiale letta il 2026-09-14 (§14).

Letture aggiuntive, minime e dichiarate: `lib/portafoglio-shared.ts` (tipo `StatoFonte`), `KNOWN_KEYS` di `lib/secrets.ts`,
`instrumentation.ts`, `scripts/test-portafoglio.ts` (import di `fonte()` nel banco), l'elenco di `app/api/clients/[slug]/traffico/`,
`infra/n8n/bozza-pulizia.json` (struttura), `docs/traffico/piano-T3.md` §2.8 (posto dei blocchi nella card Sito); sull'istanza n8n
una sola lettura con l'API pubblica (`GET /api/v1/data-tables`: tabelle `Clienti`, `Lead`, `Report` e le loro colonne) e
`GET /rest/settings` pubblico (non espone la versione).

## 1. Contesto

Obiettivo: per ogni cliente con servizio Sito **attivo** e proprietà Search Console verificata, il VPS raccoglie ogni notte,
anche col Mac spento, i totali giornalieri di Search Console e lo stato di indicizzazione delle pagine della sitemap; l'editor
li mostra nella card Sito del dettaglio Traffico insieme al dettaglio per ricerca e pagina letto su richiesta, alla regola delle
8 settimane, ai Core Web Vitals reali e alla misura PageSpeed dell'ultima pubblicazione. Numeri sempre con fonte e data, mai a
fonte giù.

Fatti del codice e dell'istanza (2026-09-14):

- **n8n**: tabella `Clienti` con `slug, azienda, dominio, email, referente, umami_id, stripe_customer` (tutte stringhe), scritta da
  `sf-registra-cliente` (upsert per `slug` con le sole colonne mappate: `stripe_customer` è `removed` nello schema e sopravvive).
  L'API pubblica dell'istanza, provata il 06/09, accetta sulle righe solo `limit` (≤ 100) e `cursor` (`lib/integrazioni.ts`
  `n8nDataTable`): nessun filtro lato server via API. Il nodo Data table invece filtra (`report-rinnovo.json`: condizioni `eq`,
  `gte`, `lt`, `matchType: allConditions`). I nodi HTTP del report usano `fullResponse` + `neverError`; i workflow hanno
  `errorWorkflow` = `sf-errori` (Telegram) e `callerPolicy: workflowsFromSameOwner`. I Code node **non** possono leggere le Data
  table (documentazione n8n) e nei workflow versionati non usano librerie.
- **Editor**: `fonte(key, ttl, configurata, fn)` di `lib/portafoglio.ts` dà `{ stato: "ok", at } | { stato: "non_configurata" } |
  { stato: "non_raggiungibile", da, errore }` con cache in memoria (`memo`, errore ritentato dopo 60 s) ed è già importato con
  strip-types da `scripts/test-portafoglio.ts`. `http(url, init, timeoutMs)` e `DASHBOARD_TIMEOUT_MS = 8_000` in
  `lib/integrazioni.ts`. `syncInfra(slug)` legge `client.json` in modo tollerante e fa l'upsert nel registro `Clienti` a ogni
  deploy.
- **Dettaglio Traffico** (`app/traffico/[slug]/page.tsx`, server component, `force-dynamic`): `SezioneServizio` per Sito e
  Scheda; T2a vi aggiunge il blocco «Motori di ricerca» (locale a `page.tsx`), T3 «Dati per farti trovare», T4 «Ricerche su cui
  puntare» (`components/traffico-mappa.tsx`, client). `components/traffico-ui.tsx` è importato anche da componenti client: niente
  moduli con `node:*` lì.
- **T2a** (piano pronto, non sviluppato): proprietà `sc-domain:<zona>` per il dominio, verificata dal service account di
  scrittura (`GOOGLE_SERVICE_ACCOUNT`, scope `siteverification` + `webmasters`) con il **service account di lettura del VPS già tra
  i proprietari** (decisione T2a.1); `steps.build.motori.google.proprieta`; `traffico/registro.ndjson` (una riga per deploy con
  `urlCambiati`); `traffico/psi.json` (misura PageSpeed dopo il deploy, `GOOGLE_API_KEY` limitata a PageSpeed e CrUX); token
  Google in memoria in `lib/motori.ts`.
- **T1a**: `https://<dominio>/sitemap.xml` con `<loc>` = canonical e `<lastmod>` W3C, solo pagine indicizzabili.
- **T4** (piano pronto): `traffico/mappa-query.json` → `target[] { testo, pagina, ruolo }` (8-20), `pagina` = `home | zone |
  servizio:<id> | comune:<istat>`; `traffico/mappa-storico.ndjson` = `{ at, versioneRegole, stato, target: [{ testo, pagina }] }`
  per ogni mappa scritta («T7 deve sapere da quando una query è target»). Il path di una pagina diversa dalla home arriva con il
  registro degli slug di T5c (non ancora pianificato).
- `.claude/scope.json` oggi = perimetro «T6a-completamento» di un'altra sessione: la fase 2 di T2b parte solo a perimetro vuoto e
  **dopo la chiusura di T2a** (stessi file: `page.tsx`, e T2b importa `lib/motori.ts`).

Fatti esterni verificati (documentazione ufficiale, §14):

- **searchAnalytics.query**: dimensioni `country, device, page, query, searchAppearance, date, hour`; `rowLimit` 1-25.000
  (default 1.000), paginazione con `startRow`; `dataState` `final` (default) / `all` (dati freschi) / `hourly_all`;
  `aggregationType` `auto | byPage | byProperty` (`byPage` vietato raggruppando o filtrando per pagina); filtri `contains, equals,
  notContains, notEquals, includingRegex, excludingRegex`; date in **ora del Pacifico**; `metadata.first_incomplete_date`
  presente «only when the request's dataState is all and data is grouped by date, and the requested date range contains
  incomplete data points»; «does not guarantee to return all data rows but rather top ones»; massimo **50.000 righe al giorno per
  tipo di ricerca**; «Data is typically available after 2-3 days»; con `page` e `query` insieme «some data may be dropped»;
  consiglio «running a daily query for one day's worth of data». Carico: «Queries grouped/filtered by page AND query string are
  the most expensive», cresce con l'intervallo di date. Quote: 1.200 QPM per sito e per utente, 40.000 QPM e 30.000.000 QPD per
  progetto. Scope: `webmasters.readonly` basta.
- **urlInspection.index.inspect**: `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect` `{ inspectionUrl,
  siteUrl, languageCode }`; `inspectionResult.inspectionResultLink`, `indexStatusResult { verdict: PASS|PARTIAL|FAIL|NEUTRAL,
  coverageState (testo), robotsTxtState: ALLOWED|DISALLOWED, indexingState: INDEXING_ALLOWED|BLOCKED_BY_META_TAG|
  BLOCKED_BY_HTTP_HEADER|BLOCKED_BY_ROBOTS_TXT, lastCrawlTime, pageFetchState: SUCCESSFUL|SOFT_404|BLOCKED_ROBOTS_TXT|NOT_FOUND|
  ACCESS_DENIED|SERVER_ERROR|REDIRECT_ERROR|ACCESS_FORBIDDEN|BLOCKED_4XX|INTERNAL_CRAWL_ERROR|INVALID_URL, googleCanonical,
  userCanonical, sitemap[], referringUrls[], crawledAs }`; `mobileUsabilityResult` **deprecato**. Quote: **2.000 QPD e 600 QPM
  per proprietà**, 10.000.000 QPD e 15.000 QPM per progetto. Sola lettura: non chiede l'indicizzazione (niente Indexing API,
  ricerca §3.2).
- **CrUX API**: `POST https://chromeuxreport.googleapis.com/v1/records:queryRecord` `{ origin | url, formFactor?: PHONE|DESKTOP|
  TABLET, metrics? }`; `record.metrics.<m>.percentiles.p75` e `histogram` a tre intervalli, `collectionPeriod.firstDate/lastDate`
  (28 giorni), aggiornata ogni giorno verso le 04:00 UTC; senza dati **404 `chrome ux report data not found`**; entrano solo
  origini e pagine «publicly discoverable» e «sufficiently popular» (soglia non pubblicata: «Pages and origins that don't meet the
  popularity threshold are not included»); 150 richieste al minuto per progetto, gratis. History API: 25 periodi settimanali di
  default, fino a 40, aggiornata il lunedì.
- **n8n**: credenziale «Google Service Account» con *Set up for use in HTTP Request node* e campo **Scopes** (obbligatorio in quel
  caso); Data table: spazio complessivo di tutte le tabelle limitato per istanza (documentazione attuale 200 MiB; il default è
  stato 50 MB nelle versioni del 2025), variabile `N8N_DATA_TABLES_MAX_SIZE_BYTES`, avviso all'80 %, oltre il limite **le
  scritture dei workflow falliscono**; la versione dell'istanza non è leggibile senza login → spazio reale da leggere nella UI in
  M4. API pubblica recente: filtri, upsert e delete sulle righe (non ancora sull'istanza al 06/09).
- **Bing**: `GetRankAndTrafficStats(siteUrl)` dà clic e impression giornalieri del sito, stessa API key di T2a.

Fuori da T2b: proposte del volano e sostitute delle query fuori portata (T7a), report al cliente (T8, che leggerà le tabelle di
T2b), rinomina delle pagine e registro degli slug (T5c), scheda Google (G3), numeri nell'hub e nel portafoglio.

## 2. Decisioni motivate

### 2.1 Cosa vive sul VPS e cosa si legge su richiesta

| Dato | Dove | Perché |
|---|---|---|
| Totali giornalieri per sito (impression, clic, posizione) | **VPS**, Data table `TrafficoGiorni`, raccolta notturna | un giorno = una riga, pochi byte; servono al report T8 col Mac spento, alle «tappe» del cold start (prima impression, primo clic), a distinguere **zero misurato** da **dato mancante** |
| Stato di indicizzazione per pagina | **VPS**, Data table `TrafficoPagine` | l'API dà solo lo stato di oggi: la data del cambio e la prima indicizzazione esistono solo se qualcuno le annota; 2.000 ispezioni/giorno per proprietà si spendono meglio ogni giorno che a Mac acceso |
| Stato della raccolta per cliente e fonte | **VPS**, Data table `TrafficoFonti` | «dati fino al», ultimo esito, dead-man a 36 h, allarme solo sulle transizioni |
| Ricerche e pagine (28 giorni), prima impression delle ricerche su cui puntare | **Search Console su richiesta** dall'editor, cache 6 h | Search Console è l'archivio a 16 mesi (README §3); ricerche × pagine × giorni in una Data table sarebbero milioni di righe; nessuna ricerca degli utenti salvata sul VPS |
| Core Web Vitals reali | **CrUX su richiesta**, cache 24 h | una media mobile di 28 giorni aggiornata ogni giorno; la History API tiene 40 settimane: niente si perde a Mac spento |
| PageSpeed | **`traffico/psi.json` di T2a** (misura dopo ogni deploy) | un sito statico cambia solo col deploy: una misura settimanale ripeterebbe lo stesso numero con il rumore del laboratorio |

### 2.2 Data table: formato, dimensione, retention

Tre tabelle nuove (colonne in §4.1) e una colonna nuova in `Clienti` (`traffico_sito`).

- **`TrafficoGiorni`**: una riga per (slug, dominio, giorno). Stima ~150 byte con le colonne di servizio: 50 clienti × 486 giorni =
  24.300 righe ≈ 3,6 MB; 200 clienti ≈ 14,6 MB. **Retention 486 giorni** (16 mesi, come Search Console): il dispatcher cancella
  ogni notte le righe più vecchie. Nessuno storico oltre (dubbio 2).
- **`TrafficoPagine`**: una riga per (slug, URL della sitemap), sovrascritta; ~700 byte (tre URL, testo di copertura, link).
  50 clienti × 30 pagine ≈ 1 MB; 200 × 60 ≈ 8,4 MB. Una pagina che esce dalla sitemap esce dalla tabella.
- **`TrafficoFonti`**: due righe per cliente (`gsc`, `ispezione`), trascurabile.
- Totale a 200 clienti ≈ 23 MB più indici, sotto 50 MB anche nel caso peggiore della versione vecchia. In M4 si legge nella UI di
  n8n lo spazio usato e il limite reale; soglia d'intervento: 60 % → `N8N_DATA_TABLES_MAX_SIZE_BYTES` su Coolify (riga in
  `docs/vps-integrazioni-setup.md`).
- Esecuzioni: `saveDataSuccessExecution: "none"` nei tre workflow nuovi (le risposte di centinaia di ispezioni non restano nel
  database di n8n; gli errori sì), come `sf-bozza`.

### 2.3 Accesso del lettore e proprietà

- Il service account di lettura (`sf-sensori-lettura`) vive **solo in n8n** come credenziale «Search Console lettura», scope
  `https://www.googleapis.com/auth/webmasters.readonly`. Il Mac non ne ha una copia.
- La proprietà non si passa dall'editor: ogni notte `GET https://www.googleapis.com/webmasters/v3/sites` (una chiamata per
  tutti) e per ogni cliente si sceglie la proprietà più specifica che copre il dominio: `sc-domain:<zona>` con `dominio = zona`
  o `dominio` che finisce con `.<zona>`, altrimenti un prefisso URL `https://<dominio>/`; `permissionLevel` diverso da
  `siteUnverifiedUser`. Così vale anche per una proprietà creata a mano da Mattia (S0) in cui il lettore è stato aggiunto come
  utente, e nessun file di T2a va toccato.
- Rischio documentato: un proprietario delegato con la Site Verification API potrebbe non comparire in `sites.list` senza un
  `sites.add` fatto da lui (T2a lo fa per lo scrittore, D7). Si prova in M4; se non compare, ripiego già scritto: scope
  `webmasters` pieno per il lettore e un `PUT …/sites/<proprietà>` idempotente nel workflow prima della lettura (dubbio 8).

### 2.4 Quale host si misura

Ogni lettura di Search Analytics filtra `page` con `includingRegex` `^https?://(www\.)?<dominio senza www, escapato>/`.
Motivi: una proprietà Dominio copre tutti i sottodomini (il vecchio sito del cliente, e per la prova dal vivo
`zz-test-t2b.consulbuild.com` dentro `sc-domain:consulbuild.com`); con il filtro si conta solo il sito che pubblichiamo.
Conseguenza: l'aggregazione diventa per pagina (come il rapporto «Pagine» di Search Console) e i totali possono superare di
poco quelli per proprietà. Riga in `docs/DEBUG.md` («i totali non coincidono con Search Console»).

### 2.5 «Dati fino al» e zeri misurati

- Richiesta notturna: `dimensions: ["date"]`, `dataState: "all"`, filtro §2.4, `startDate` = `datiFinoAl` precedente − 10
  giorni (i dati tardivi si correggono da soli), alla prima raccolta oggi − 485 giorni; `endDate` = oggi in ora del Pacifico.
- `datiFinoAl` = `metadata.first_incomplete_date` − 1 giorno; si scrivono **solo** i giorni prima del primo incompleto.
- Senza `metadata` e con righe: `datiFinoAl` = `endDate`. Senza `metadata` e senza righe: `datiFinoAl` resta quello
  precedente, nessuna riga scritta, stato `ok` con causa «nessun dato» (comportamento reale da confermare in calibrazione).
- Zeri: dal giorno `raccolta_dal` a `datiFinoAl` ogni giorno senza riga di Google si scrive con 0 impression e 0 clic, senza
  posizione. `raccolta_dal` = alla prima raccolta il primo giorno con dati nella finestra, oppure `datiFinoAl` se non ce ne sono;
  poi non cambia (salvo cambio di dominio, §2.7). Così «nessuna impression dal 14/09 all'11/10» è un fatto, e prima di
  `raccolta_dal` il pannello non afferma nulla.
- Posizione di un periodo = media delle posizioni giornaliere **pesata per impression** (la media semplice darebbe peso a giorni
  con un'impression sola).
- Date come stringhe `AAAA-MM-GG` dall'inizio alla fine: nella Data table `AAAA-MM-GGT00:00:00.000Z`, l'editor prende i primi 10
  caratteri e formatta `gg/mm` senza passare da `Date` (niente spostamenti di fuso).

### 2.6 Ispezioni: quali pagine, quando, quante

Funzione pura nel nodo «Piano» (banco 22-27):

- Pagine = `<loc>` della sitemap del dominio (T1a), al massimo 200. Sitemap illeggibile → si ispeziona solo `https://<dominio>/`,
  nessuna pagina tolta, fonte `ispezione` con causa «sitemap non leggibile (HTTP n)».
- Da ispezionare oggi: mai ispezionata; oppure non `PASS` e ispezionata più di 20 ore fa; oppure `lastmod` della sitemap più
  recente dell'ultimo passaggio di Google e ispezionata più di 20 ore fa; oppure ispezionata più di 7 giorni fa.
- Tetto 200 al giorno per proprietà (10 % della quota di 2.000), una richiesta ogni 250 ms (240 al minuto contro 600).
  `ponytail:` tetto fisso, da rendere proporzionale se un sito supera 200 pagine.
- `languageCode: "it-IT"`: `coverageState` arriva nelle parole italiane di Search Console e si mostra così com'è; la logica usa
  solo gli enum.
- `verdetto_dal` cambia solo quando cambia il verdetto; `prima_indicizzata` nasce al primo `PASS` visto e non cambia più (è la
  data in cui **il sensore** l'ha vista, detto così nel pannello).

### 2.7 Servizio sospeso, cliente eliminato, dominio cambiato

- **Sospeso**: il dispatcher misura solo `traffico_sito = "attivo"` (decisione T2a.5, README §1.11: si ferma il ciclo). Le righe
  restano; il pannello mostra gli ultimi dati con «raccolta ferma dal gg/mm» e non chiama Search Console né CrUX.
- **Allineamento dello stato sul VPS**, tre punti, nessun timer nuovo: (1) `syncInfra` a ogni deploy manda `trafficoSito` nel
  upsert di `Clienti`; (2) la route del cambio di stato chiama subito il webhook `traffico-stato` (best effort); (3) il webhook
  `traffico-stato` che l'editor chiama per leggere **dichiara lo stato attuale** e il workflow lo scrive prima di rispondere
  (§3.3). Un cambio che non arriva al VPS si riallinea alla prima apertura del dettaglio o al deploy successivo; nel frattempo un
  sospeso letto una notte in più non cambia nulla online.
- **Cliente eliminato**: il ramo `rimuovi` di `sf-registra-cliente` cancella anche le sue righe nelle tre tabelle (zero dati
  sporchi).
- **Dominio cambiato**: `dominio` è colonna di `TrafficoGiorni` e `TrafficoFonti`; righe e `raccolta_dal` di un dominio diverso
  da quello del registro non si usano (nuova raccolta dal nuovo dominio, le vecchie escono con la retention); le pagine del vecchio
  host escono dalla tabella perché non sono nella nuova sitemap.

### 2.8 Come legge l'editor

- **Dati del VPS**: `POST https://n8n.consulbuild.com/webhook/traffico-stato` con header `X-Site-Factory-Key` (chiave esistente
  `N8N_REGISTRA_KEY`, dubbio 5) e corpo `{ slug, servizio }`; risposta compatta §4.2 filtrata per slug **dal nodo Data table**
  (l'API pubblica dell'istanza non filtra: leggere 24.000 righe a pagine da 100 per aprire un cliente non regge). Stesso modello
  dei `sf-*` e di §8.4 della ricerca sulla scheda. `fonte("visibilita:vps:<slug>:<servizio>", 10 min, hasSecret("N8N_REGISTRA_KEY"),
  …)`, timeout 8 s.
- **Search Console su richiesta**: dal Mac con il token del service account di scrittura di T2a (già proprietario, scope
  `webmasters`), finestra di 28 giorni che finisce a `datiFinoAl` **del VPS** (così totali e dettaglio parlano degli stessi giorni).
  Due chiamate: `["page"]` (totali per pagina) e `["page","query"]` (`rowLimit` 1.000). Con ricerche su cui puntare, una terza
  `["date","query"]` dal primo giorno utile della regola a `datiFinoAl`, `rowLimit` 25.000, al massimo 4 pagine (`ponytail:` tetto
  a 100.000 righe). `fonte("visibilita:gsc:<slug>:<datiFinoAl>", 6 h, …)`: cambia chiave quando arriva un giorno nuovo. Senza
  `datiFinoAl` (VPS giù o prima raccolta) il dettaglio non si legge.
- **CrUX su richiesta**: `origin: https://<dominio>`, `formFactor: PHONE` (le ricerche locali sono da telefono; T4 misura solo
  mobile), metriche `largest_contentful_paint`, `interaction_to_next_paint`, `cumulative_layout_shift`; se l'origine ha dati, una
  seconda richiesta con `url` della home. Chiave `GOOGLE_API_KEY` di T2a nell'header `X-Goog-Api-Key`. 404 = «non disponibile»,
  non un errore. `fonte("visibilita:crux:<dominio>", 24 h, …)`. Categoria dalla p75 confrontata con i confini dell'istogramma
  restituito (nessuna soglia scritta a mano); CLS arriva come stringa.
- **PageSpeed**: lettura tollerante di `traffico/psi.json` (T2a) per la home, strategia mobile.
- **Rendering**: il blocco è un server component asincrono dentro `<Suspense>` con scheletro (DESIGN-SYSTEM §10): il resto del
  dettaglio non aspetta le fonti esterne. Le tre letture partono in parallelo. Prima di scrivere: guide Next in
  `node_modules/next/dist/docs/01-app/` su streaming/Suspense, route handler e server component.
- **Risposte registrate**: con `SF_VISIBILITA_REGISTRATE=<cartella>` (solo sviluppo) `lib/visibilita-fonti.ts` legge i JSON della
  cartella al posto della rete e considera configurate le chiavi: gli stati del pannello si provano nel browser senza chiavi
  (stesso meccanismo di `SF_DATAFORSEO_REGISTRATE` di T4).

### 2.9 Regola delle 8 settimane (funzione pura `regolaOttoSettimane`)

- Ingressi: `target` di `mappa-query.json`; `mappa-storico.ndjson`; `registro.ndjson` di T2a; `datiFinoAl`; righe
  `["date","query"]` della terza chiamata; il path della pagina (`home` → `/`; altre pagine → path dal registro degli slug di T5c
  quando esisterà, oggi `null`, `ponytail:` collegare a T5c).
- `targetDal` = `at` della prima riga dello storico dell'**ultima sequenza continua** di mappe che contengono il testo (tolta e
  rimessa → il conto riparte). `paginaOnlineDal` = `quando` della prima riga del registro con l'URL della pagina tra
  `urlCambiati`. `inizio` = il più recente dei due.
- Corrispondenza ricerca ↔ target: minuscole, accenti tolti, punteggiatura in spazi, parole vuote tolte (`a, al, alla, con, da,
  dei, del, della, delle, di, e, gli, i, il, in, la, le, lo, nel, nella, per, su, un, una`); una ricerca vale se contiene **tutte**
  le parole del target, in qualunque ordine. `ponytail:` niente sinonimi; se T4 esporta la sua normalizzazione, si usa quella.
- Settimane = giorni interi tra `inizio` e `datiFinoAl` diviso 7 (col ritardo di Google, mai con la data di oggi).
- Esiti: `pagina_non_online` («Le 8 settimane partono quando la pagina è online») · `in_misura` (meno di 56 giorni, nessuna
  impression: «settimana 3 di 8, nessuna impression finora») · `vista` («vista da Google dal 12/10: 34 impression, 2 clic,
  posizione media 18,4» e la pagina che compare) · `fuori_portata` (56 giorni o più senza impression: «nessuna impression in 8
  settimane, dal 01/09 al 27/10») · `dati_insufficienti` (Search Console non ok o `datiFinoAl` assente: nessuna frase sui numeri).
- La proposta di una sostituta non si fa qui (T7a).

### 2.10 Cosa non si fa (e quando aggiungerlo)

- **Bing**: per un artigiano italiano i volumi Bing sono una frazione di quelli Google (ricerca §6.1: 4,8 % del mercato) e
  `GetRankAndTrafficStats` non ha dettaglio per ricerca; resta la riga di stato di T2a. Aggiungere quando un sito mostra traffico
  Bing apprezzabile nell'interfaccia (dubbio 1).
- **PageSpeed periodica sul VPS**: vedi §2.1; si aggiunge se compaiono script di terze parti nei siti.
- **Storico oltre 16 mesi**: dubbio 2; da decidere prima che il primo cliente attivo compia 16 mesi di dati.
- **Allarmi per pagina** (home fuori dall'indice): li mostra l'editor; Telegram resta per i guasti della raccolta (§3.1), come
  per i lead (niente notifiche che diventano rumore).
- **Hub e portafoglio**: nessun numero (riconsiderazione chiesta da T0 §5: la riga resta com'è; i segnali arrivano con T7a).
- **«Raccogli ora» dall'editor**: la prima raccolta avviene la notte dopo; per le prove c'è il webhook `traffico-sensori`.

## 3. Workflow n8n

Tre workflow nuovi e una modifica, versionati in `infra/n8n/` e sincronizzati con `scripts/n8n-import.ts` (nomi aggiunti a
`TUTTI`). Settings di tutti: `executionOrder: "v1"`, `timezone: "Europe/Rome"`, `errorWorkflow` = id di `sf-errori`,
`callerPolicy: "workflowsFromSameOwner"`, `saveDataSuccessExecution: "none"` (non per `sf-registra-cliente`, invariato).

### 3.1 `sf-traffico-sensori` — dispatcher notturno

| # | Nodo | Tipo | Cosa |
|---|---|---|---|
| 1 | «Ogni notte» | Schedule Trigger | 05:30 Europe/Rome (dopo `sf-bozza-pulizia` alle 04:00) |
| 2 | «Prova» | Webhook POST `traffico-sensori` | Header Auth «Site-factory registra», risposta immediata; corpo `{ slug?, oggi? }` (un cliente solo, data finta per le prove) |
| 3 | «Clienti» | Data table · Get | tutte le righe, `executeOnce` |
| 4 | «Proprietà» | HTTP GET `https://www.googleapis.com/webmasters/v3/sites` | credenziale «Search Console lettura», `fullResponse`, `neverError`, `executeOnce` |
| 5 | «Fonti prima» | Data table · Get `TrafficoFonti` | tutte, `executeOnce`, `alwaysOutputData` |
| 6 | «Da misurare» | Code | `Proprietà` ≠ 200 → `throw` («Search Console: elenco delle proprietà non letto (HTTP n, <reason>)»: guasto globale → `sf-errori`); clienti con `traffico_sito = "attivo"` e dominio valido (con `slug` della prova: solo quello); proprietà per §2.3; `oggi` in ora del Pacifico da `new Date()` (o dal corpo); un item `{ slug, dominio, proprieta \| null, oggi, adesso }` per cliente |
| 7 | «Misura il cliente» | Execute Workflow | `sf-traffico-cliente`, un'esecuzione per item, attende la fine, *On Error: Continue (using error output)* |
| 8 | «Fonti dopo» | Data table · Get `TrafficoFonti` | tutte, `executeOnce`, `alwaysOutputData` |
| 9 | «Vecchi giorni» | Data table · Delete `TrafficoGiorni` | `data` `lt` oggi − 486 giorni, `executeOnce`, `alwaysOutputData` |
| 10 | «Riassunto» | Code | transizioni da `ok` (o assente) a `errore`/`non_configurata` tra «Fonti prima» e «Fonti dopo» + esecuzioni figlie fallite → `throw new Error("Traffico: <slug> gsc 403 accesso negato; …")` → `sf-errori` → Telegram **una volta** per guasto; nessun dato personale, solo slug e causa |

Idempotenza: rilanciare nello stesso giorno riscrive gli stessi giorni e non ripete ispezioni (regola delle 20 ore). Mac spento:
nulla dipende dall'editor. VPS spento una notte: la finestra di 10 giorni recupera il buco alla notte successiva.

### 3.2 `sf-traffico-cliente` — un cliente

Rami terminali dopo «Piano», in quest'ordine dall'alto (con `executionOrder v1` n8n esegue un ramo alla volta dall'alto): un ramo
che produce zero item si ferma senza toccare gli altri, nessun item vuoto arriva a una scrittura.

| # | Nodo | Tipo | Cosa |
|---|---|---|---|
| 1 | «Dal dispatcher» | Execute Workflow Trigger | accetta tutti i dati |
| 2 | «Proprietà trovata?» | If | `proprieta` vuota → ramo 2b: Code «Senza proprietà» (riga `gsc` `non_configurata`, causa «il service account di lettura non vede una proprietà Search Console per <dominio>») → Data table · Upsert `TrafficoFonti` (match `slug` + `fonte`) |
| 3 | «Fonti del cliente» | Data table · Get `TrafficoFonti` `slug` = … | `executeOnce`, `alwaysOutputData` |
| 4 | «Pagine del cliente» | Data table · Get `TrafficoPagine` `slug` = … | `returnAll`, `executeOnce`, `alwaysOutputData` |
| 5 | «Richiesta giorni» | Code | corpo §2.5 con il filtro §2.4 |
| 6 | «Search Console giorni» | HTTP POST `https://www.googleapis.com/webmasters/v3/sites/{{ encodeURIComponent(proprieta) }}/searchAnalytics/query` | credenziale, `fullResponse`, `neverError`, timeout 30 s |
| 7 | «Sitemap» | HTTP GET `https://<dominio>/sitemap.xml` | formato testo, `fullResponse`, `neverError`, timeout 15 s, `executeOnce` |
| 8 | «Piano» | Code (puro) | un item `{ fonti: [gsc, ispezione], giorni: [...], daIspezionare: [...], daTogliere: [...] }` (§2.5, §2.6, §2.7) |
| 9a | «Fonti» → «Salva fonti» | Code → Data table · Upsert `TrafficoFonti` | match `slug` + `fonte`; `aggiornato` sempre. Riga `gsc` dall'esito di «Search Console giorni»: 401/403 → `errore` («accesso negato alla proprietà: il service account di lettura è ancora proprietario?»), 429 → `quota`, 5xx/rete → `errore`, `ultimo_ok` conservato. Riga `ispezione`: stato e causa dell'ultima ispezione conservati, più l'eventuale causa della sitemap (la sostituisce 9e solo se oggi ci sono state ispezioni) |
| 9b | «Righe giorni» → «Salva giorni» | Code → Data table · Upsert `TrafficoGiorni` | match `slug` + `dominio` + `data` |
| 9c | «Pagine da togliere» → «Togli pagine» | Code → Data table · Delete | `slug` + `url`, un item per pagina (solo con sitemap letta) |
| 9d | «Pagine da ispezionare» → «Ispeziona» → «Esiti» → «Salva pagine» | Code → HTTP POST `…/v1/urlInspection/index:inspect` (batching 1 item ogni 250 ms, `fullResponse`, `neverError`) → Code → Data table · Upsert `TrafficoPagine` (match `slug` + `url`) | solo le ispezioni riuscite diventano righe |
| 9e | «Fonte ispezione» → «Salva fonte ispezione» | Code `executeOnce` dopo «Ispeziona» → Upsert `TrafficoFonti` | esito delle ispezioni di oggi: `ok` · `quota` (un 429 ferma le altre del cliente per oggi) · `errore` con causa («3 pagine non ispezionate: 403») |

Quote per cliente, a regime: 1 Search Analytics + 1 sitemap + le ispezioni dovute (poche al giorno dopo la prima settimana); alla
prima raccolta di un sito da 60 pagine ~60 ispezioni in ~75 s. Nessun costo.

### 3.3 `sf-traffico-stato` — lettura (e allineamento) per l'editor

| # | Nodo | Tipo | Cosa |
|---|---|---|---|
| 1 | «Webhook» | POST `traffico-stato` | Header Auth «Site-factory registra», `responseMode: responseNode` |
| 2 | «Valida» | Code | `slug` `^[a-z0-9][a-z0-9-]{0,63}$`, `servizio` ∈ `attivo \| sospeso`; altrimenti `{ ok: false, errore }` |
| 3 | «Valida?» | If | no → «Rispondi 400» (Respond to Webhook, 400, `{ ok: false, errore }`) |
| 4 | «Allinea» | Data table · Update `Clienti` | `slug` = …, `traffico_sito` = `servizio`; `executeOnce`, `alwaysOutputData` (cliente non registrato: nessuna riga, si prosegue) |
| 5 | «Cliente» | Data table · Get `Clienti` `slug` = … | `executeOnce`, `alwaysOutputData` |
| 6-8 | «Fonti» · «Pagine» · «Giorni» | Data table · Get per `slug` | `returnAll`, `executeOnce`, `alwaysOutputData` |
| 9 | «Risposta» | Code `executeOnce` | JSON §4.2 |
| 10 | «Rispondi» | Respond to Webhook | 200 JSON |

### 3.4 `sf-registra-cliente` — modifica

- **Upsert**: colonna `traffico_sito` = `{{ $json.body.trafficoSito ?? '' }}` nello schema e nel mapping. L'editor la manda
  sempre; `sf-form-lead` e `sf-report-rinnovo` leggono le colonne per nome e non cambiano. Per chi non ha il servizio vale
  `spento` e i sensori lo ignorano: comportamento identico per tutti gli altri clienti.
- **Rimuovi**: «Delete row(s)» con `alwaysOutputData`, poi «Togli giorni», «Togli pagine», «Togli fonti» (Data table · Delete
  per `slug` = `{{ $('Webhook').first().json.body.slug }}`), ciascuno `executeOnce` + `alwaysOutputData` (senza, la cancellazione
  di 486 righe farebbe girare il nodo dopo 486 volte, e una tabella senza righe fermerebbe la catena).
- Prima dell'import: prova a secco sul workflow copiato come `sf-registra-cliente-prova` con slug `zz-test-t2b` (upsert, rimuovi,
  ping), poi import dell'originale.

### 3.5 Regole comuni (le trappole di n8n, verificate in M4)

- Ogni Get che può tornare vuoto: `alwaysOutputData`; ogni nodo dopo un nodo che produce N righe e che deve girare una volta:
  `executeOnce`; i Code leggono gli altri nodi per nome (`$('Piano').first().json`).
- I Code usano solo JavaScript standard (`Date`, `Intl`, regex), mai `$now`/Luxon, `require` o rete: il banco li esegue fuori da
  n8n (§10).
- Nessun segreto nei JSON versionati: le credenziali sono riferimenti per id/nome; nessuna chiave in un URL.
- Punti da verificare sull'istanza in M4, con il ripiego già deciso: upsert con più condizioni (ripiego: colonna `chiave` =
  `slug|dominio|data` e match su quella); Delete con condizione `lt` su una data (ripiego: Get dei vecchi + Delete per id);
  Execute Workflow e il suo trigger nella versione installata (ripiego: Loop Over Items nello stesso workflow); nome interno del
  tipo di credenziale Google Service Account nel nodo HTTP (si legge dall'export dopo la selezione a mano); formato delle date
  restituite dalla Data table.

## 4. Schemi

### 4.1 Data table

| Tabella | Colonne (tipo) |
|---|---|
| `Clienti` (esistente) | + `traffico_sito` (string: `spento` \| `attivo` \| `sospeso`) |
| `TrafficoGiorni` | `slug` (string) · `dominio` (string) · `data` (date, giorno PT) · `clic` (number) · `impression` (number) · `posizione` (number, vuota senza impression) · `letto` (date) |
| `TrafficoPagine` | `slug` · `url` · `verdetto` · `copertura` · `recupero` · `indicizzazione` · `robots` · `canonica_google` · `canonica_dichiarata` · `link` (string) · `ultimo_crawl` · `lastmod` · `ispezionata` · `verdetto_dal` · `prima_indicizzata` (date) |
| `TrafficoFonti` | `slug` · `dominio` · `fonte` (`gsc` \| `ispezione`) · `stato` (`ok` \| `errore` \| `quota` \| `non_configurata`) · `causa` (≤ 200 caratteri) · `proprieta` (string) · `dati_fino_al` · `raccolta_dal` · `ultimo_ok` · `aggiornato` (date) |

### 4.2 Risposta di `traffico-stato` (v1)

```json
{
  "v": 1,
  "registrato": true,
  "servizioVps": "attivo",
  "fonti": [
    { "fonte": "gsc", "stato": "ok", "causa": "", "dominio": "edilprova.it", "proprieta": "sc-domain:edilprova.it",
      "datiFinoAl": "2026-10-11", "raccoltaDal": "2026-09-16", "ultimoOk": "2026-10-14T03:31:02Z", "aggiornato": "2026-10-14T03:31:02Z" }
  ],
  "pagine": [
    { "url": "https://edilprova.it/", "verdetto": "PASS", "copertura": "Pagina inviata e indicizzata", "recupero": "SUCCESSFUL",
      "indicizzazione": "INDEXING_ALLOWED", "robots": "ALLOWED", "canonicaGoogle": "https://edilprova.it/",
      "canonicaDichiarata": "https://edilprova.it/", "link": "https://search.google.com/search-console/inspect?…",
      "ultimoCrawl": "2026-10-09T08:12:00Z", "lastmod": "2026-09-14T09:12:31Z", "ispezionata": "2026-10-14T03:31:20Z",
      "verdettoDal": "2026-09-20", "primaIndicizzata": "2026-09-20" }
  ],
  "giorni": [["2026-10-10", 1, 37, 21.4], ["2026-10-11", 0, 0, null]]
}
```

`registrato: false` = nessuna riga in `Clienti` (sito mai pubblicato col registro). Al massimo 200 pagine e 486 giorni
(~120 KB). In `lib/visibilita.ts` lo schema Zod `RispostaVpsSchema` la valida; una risposta fuori forma è «non raggiungibile» con
l'errore «risposta del VPS inattesa: <percorso>».

### 4.3 Modello per la UI (`vistaVisibilita`, puro)

`{ badge: { tono, parola }, fonti: RigaFonte[], avviso?: { tono, testo }, periodo?: { dal, al, totali, precedenti, tappe,
frasiVuoto? }, pagine?: { indicizzate, totale, problemi: RigaPagina[], ok: RigaPagina[] }, ricerche?: { righe, altre, nota },
perPagina?: RigaPaginaNumeri[], target?: { conteggi, righe }, velocita: { campo?, laboratorio? } }` — ogni gruppo di numeri
esiste solo se la sua fonte è `ok`; frasi e date già formattate; nessun `0` quando la fonte non è ok (banco 1-6).

## 5. Editor: letture e stati delle fonti

| Fonte (riga del pannello) | Configurata se | Chiave in cache · TTL | Non raggiungibile quando |
|---|---|---|---|
| Raccolta notturna (VPS) | `N8N_REGISTRA_KEY` | `visibilita:vps:<slug>:<servizio>` · 10 min | rete, timeout 8 s, HTTP ≠ 200 (403 = «chiave rifiutata dal VPS»), JSON fuori forma |
| Ricerche e pagine (Search Console) | `GOOGLE_SERVICE_ACCOUNT` e `steps.build.motori.google.proprieta` | `visibilita:gsc:<slug>:<datiFinoAl>` · 6 h | token rifiutato, 403, 429, 5xx, rete |
| Velocità reale (CrUX) | `GOOGLE_API_KEY` | `visibilita:crux:<dominio>` · 24 h | 400/403 (`API_KEY_INVALID`, `SERVICE_DISABLED` tradotti), 5xx, rete; 404 = non disponibile, non errore |
| Laboratorio (PageSpeed) | file `traffico/psi.json` | nessuna (lettura del file) | — (file assente = «nessuna misura») |

Stato della raccolta dedotto da risposta e `client.json` (banco 7-14): `non_registrato` (nessuna riga nel registro VPS: «parte
dopo la pubblicazione») · `in_attesa_verifica` (`steps.build.motori.google` non `ok`) · `prima_raccolta` (registrato e attivo,
nessuna riga `gsc`) · `senza_proprieta` · `ok` · `in_ritardo` (`aggiornato` di `gsc` più vecchio di 36 h: dati mostrati con la
loro data) · `ferma` (`gsc` in `errore`) · `quota` · `in_pausa` (servizio sospeso).

La route del cambio di stato (`app/api/clients/[slug]/traffico/route.ts`), dopo una transizione riuscita del servizio Sito di un
cliente con dominio pubblicato: `void statoRaccolta(slug, nuovoStato).catch(() => undefined)` e
`invalidaPortafoglio(\`visibilita:vps:${slug}:\`)` (le chiavi di `fonte()` hanno il prefisso `portafoglio:`). La risposta della route
non cambia.

## 6. Pannello «Visibilità su Google» — mini-shape /impeccable

`impeccable context` letto (PRODUCT.md dell'editor; DESIGN.md assente, mondo visivo nel codice e in `DESIGN-SYSTEM.md`).
Superficie: **estensione di una superficie esistente** (card Sito del dettaglio Traffico), modo **Operate**: mondo e composizione
ereditati, niente torneo di concept (regola della skill per le estensioni). Nella sessione non c'è uno strumento di domanda
strutturata: le domande della skill hanno le risposte del pianificatore, prese dal registro delle decisioni; l'orchestratore le
può correggere in revisione.

### 6.1 Intervista

1. *A cosa serve e che problema risolve?* — Dire a Mattia se Google conosce il sito del cliente, per quali ricerche lo mostra,
   se le ricerche su cui puntiamo sono alla portata e se la misura stessa è affidabile; decidere se non fare nulla (cold start
   normale), correggere una pagina (non indicizzata, canonica sbagliata, `noindex`) o aspettare.
2. *Chi arriva, in che momento?* — Mattia alla scrivania: dopo una pubblicazione, prima di sentire il cliente, a campione ogni
   settimana. Verifica, non esplora: vuole la risposta in dieci secondi e il dettaglio solo se serve.
3. *Cosa è vero solo qui?* — Numeri minuscoli (0-150 clic al mese) dove il rumore domina; due-tre giorni di ritardo; mesi di
   cold start in cui «zero» è la risposta giusta; la storia onesta è «indicizzato → impression → prime ricerche → clic» (ricerca
   §6.4). Un 3 → 5 clic non deve sembrare una crescita.
4. *Materiale e intervalli?* — Pagine 1 (one-page di oggi) → ~60 (T5/T6b); ricerche distinte in 28 giorni 0 → ~1.000; ricerche su
   cui puntare 0 o 8-20; CWV reali quasi sempre assenti; PageSpeed dopo ogni deploy.
5. *Stati che contano?* — Tutti quelli di §5 più: dati normali con una pagina problematica, sito nuovo a zero, dettaglio giù con
   VPS ok, molte ricerche e molte pagine, sospeso, client.json illeggibile (blocco assente).
6. *Cosa deve restare intatto e cosa renderebbe sbagliato un risultato curato?* — Card Sito, badge del servizio, blocchi di T2a,
   T3, T4 e la primaria di T3. Sbagliato: numeri-eroe, frecce e percentuali di variazione, grafici, un colore che rende «buona» o
   «cattiva» una differenza di pochi clic, uno «0» a fonte giù, gergo («SERP», «coverage», «CTR») senza parole italiane, date senza
   fonte.

### 6.2 Brief

1. **Lavoro e pubblico**: Operate, un solo operatore esperto; il blocco risponde a «funziona? c'è qualcosa che devo sistemare?».
2. **Esito e prova**: successo = in una lettura Mattia sa quanto è fresca la misura, quali pagine non sono su Google e perché,
   quante impression e clic negli ultimi 28 giorni rispetto ai 28 prima, quali ricerche mostrano il sito; ogni cifra con fonte e
   data verificabili (link «Apri in Search Console ↗»).
3. **Direzione — «un registro, non un cruscotto»**: frasi brevi con i numeri in `mono` dentro il testo, ordinate per urgenza:
   stato della raccolta → problemi di indicizzazione → totali del periodo → dettaglio su richiesta (`<details>` nativi). Momento
   focale: le righe dei problemi di indicizzazione, visibili senza aprire nulla (principio «il dubbio è visibile»). Conseguenza:
   nessun componente nuovo oltre al blocco; `Badge`, `Banner`, `mono`, `text-muted`, liste e `dl` esistenti.
4. **Ambito**: sotto-sezione della card Sito in `/traffico/[slug]`, produzione, sola lettura, nessuna azione (la primaria della
   pagina resta di T3). Posto: dopo «Motori di ricerca» (T2a) e prima di «Dati per farti trovare» (T3) — Google sa del sito → cosa
   vede → cosa serve → dove puntare. Visibile con Sito `attivo` o `sospeso`, dominio pubblicato, percorso completo e `client.json`
   leggibile. Anti-obiettivi: KPI card, numeri grandi, grafici e sparkline, percentuali, frecce, verde/rosso sulle variazioni,
   posizioni stimate, tempi promessi, tooltip col perché, scritture all'apertura.
5. **Stati e intervalli**: tabella §6.3.
6. **Interazione e layout**: schizzo §6.4. Righe a blocco che vanno a capo a 400 px (nessuna tabella larga); numeri `tabular-nums`
   allineati a destra solo nelle righe di dettaglio; `<details>` con il conteggio nel `summary` («Indicizzate (3)», «Altre 32
   ricerche», «Per pagina (4)»); nessun motion; nessuna live region (render statico).
7. **Vincoli e decisioni per chi costruisce**: token e componenti di `DESIGN-SYSTEM.md` §5, nessuna coppia di colori nuova; parola
   sempre accanto al colore; icone solo `lucide-react` con `aria-hidden` (non previste); numeri `Intl.NumberFormat("it-IT")`,
   posizione con una cifra decimale; date `gg/mm` (anno solo se diverso da quello corrente); link esterni con `↗` e
   `rel="noreferrer"`; h3 «Visibilità su Google» con `id` per `aria-labelledby`; scheletro durante il caricamento con le stesse
   altezze delle righe di stato. Da non inventare: testi degli stati (§6.3), soglie (§2.6, §5), ordine dei gruppi.

### 6.3 Stati del blocco

| Stato | Badge (tono · parola) | Cosa si legge |
|---|---|---|
| chiave VPS assente | idle · Non configurata | «Per leggere la raccolta serve la chiave «n8n (segreto webhook registra-cliente)» in Impostazioni → Chiavi API.» (link) |
| non registrato sul VPS | idle · In attesa | «Il sito non è ancora nel registro del VPS: la raccolta parte dopo la pubblicazione col dominio.» |
| Search Console non verificata (T2a) | idle · In attesa | «I dati arrivano dopo la verifica di Search Console (vedi «Motori di ricerca»).» |
| prima raccolta non ancora fatta | idle · In attesa | «La prima raccolta è stanotte alle 05:30, anche col Mac spento.» |
| proprietà non visibile al lettore | warn · Da sistemare | «Il service account di lettura non vede una proprietà Search Console per <dominio>: controlla in Search Console → Impostazioni → Utenti che «sf-sensori-lettura@…» ci sia.» |
| VPS non raggiungibile | err · Non raggiungibile | «Il VPS non risponde dalle 10:42 (n8n ha risposto 502). I numeri tornano quando risponde.» — nessun numero |
| raccolta ferma (errore) | err · Raccolta ferma | «Raccolta ferma dal 09/10: accesso negato alla proprietà (403).» + ultimi dati con la loro data |
| raccolta in ritardo (> 36 h) | warn · In ritardo | «Ultima raccolta il 08/10 alle 05:31: controlla il workflow «sf-traffico-sensori» in n8n.» + dati con la loro data |
| quota | warn · Quota | «Google ha limitato le ispezioni di oggi: riprendono domani.» |
| servizio sospeso | idle · In pausa | «Servizio sospeso: raccolta ferma dal 02/10. Ultimi dati raccolti:» — totali e pagine, niente dettaglio né CrUX |
| ok, sito nuovo a zero | ok · Raccolta attiva | «Nessuna impression dal 16/09 all'11/10.» e, solo se la prima pubblicazione con fondamenta ha meno di 56 giorni, «Per un sito online da poche settimane è normale.» Pagine: «Google la conosce ma non l'ha ancora indicizzata: per un sito nuovo può richiedere settimane.» |
| ok, con dati | ok · Raccolta attiva | schizzo §6.4 |
| dettaglio giù, VPS ok | (badge del VPS) | nella sezione ricerche: «Ricerche non lette: Search Console non risponde dalle 10:42.» |
| CrUX assente | — | «Dati reali di Chrome non disponibili: il sito non ha ancora abbastanza visite (Google non pubblica la soglia).» |
| PageSpeed assente | — | «Nessuna misura di laboratorio: parte alla prossima pubblicazione con la chiave Google API.» |

Frasi delle pagine (enum → frase, oltre al testo `copertura` di Google): `BLOCKED_BY_META_TAG`/`BLOCKED_BY_HTTP_HEADER` → «ha
`noindex`: controlla le fondamenta dell'ultima build»; `BLOCKED_BY_ROBOTS_TXT`/`DISALLOWED` → «bloccata da robots.txt»;
`NOT_FOUND`/`SOFT_404` → «Google riceve una pagina inesistente»; `SERVER_ERROR`/`ACCESS_*`/`BLOCKED_4XX`/`REDIRECT_ERROR` → «Google
non riesce a scaricarla (<enum in parole>)»; `googleCanonical` ≠ `userCanonical` → «Google sceglie come canonica <url>»; `NEUTRAL`
senza passaggi → «Google non la conosce ancora». Ordine: problemi tecnici, poi non indicizzate, poi indicizzate (chiuse).

### 6.4 Schizzo (1280 px; a 400 px ogni riga va a capo sotto l'etichetta)

```
│ ─ Visibilità su Google ────────────────────────────────────── [Raccolta attiva] ─ │
│ Raccolta notturna: dati di Search Console fino all'11/10 · letti oggi alle 05:31   │
│ Indicizzazione: pagine controllate oggi alle 05:33 · Velocità reale: non disponibile│
│                                                                                  │
│ Pagine su Google · 3 di 4 indicizzate                                            │
│   /ristrutturazione-bagni/   Scansionata, ma attualmente non indicizzata          │
│     dal 03/10 · ultimo passaggio di Google 02/10 · Apri in Search Console ↗      │
│   ▸ Indicizzate (3)                                                              │
│                                                                                  │
│ Ultimi 28 giorni · 14/09 – 11/10                                                 │
│   412 impression · 9 clic · posizione media 23,4                                 │
│   28 giorni prima: 120 impression · 2 clic · posizione media 31,0                │
│   Prima impression il 18/09 · primo clic il 02/10                                │
│                                                                                  │
│ Ricerche che mostrano il sito                                                    │
│   impresa edile cologno monzese      /             88 impr. · 3 clic · pos. 7,2  │
│   rifacimento bagno cologno          /             41 impr. · 1 clic · pos. 12,8 │
│   … (10)                                                                         │
│   ▸ Altre 32 ricerche   ▸ Per pagina (4)                                         │
│   Google omette le ricerche troppo rare: le righe non sommano ai totali.         │
│                                                                                  │
│ Ricerche su cui puntare: 2 viste da Google · 1 in misura · 1 senza impression    │
│ dopo 8 settimane (dettaglio in «Ricerche su cui puntare»)                        │
│                                                                                  │
│ Velocità (telefono)                                                              │
│   Dati reali di Chrome: non disponibili — il sito non ha ancora abbastanza visite│
│   Laboratorio, home, dopo la pubblicazione del 20/09: punteggio 97 · LCP 1,8 s · │
│   CLS 0,01 · TBT 40 ms                                                           │
```

Con dati CrUX: «Dati reali di Chrome, 28 giorni fino al 12/10: LCP 2,1 s [Buono] · INP 180 ms [Buono] · CLS 0,12 [Da
migliorare]» (badge ok/warn/err con la parola). La regola delle 8 settimane per singola ricerca si legge nelle righe del blocco
«Ricerche su cui puntare» di T4 (M5): sotto la difficoltà, una riga `text-muted` con l'esito di §2.9 e, per `fuori_portata`, un
`Badge warn` «Fuori portata». Nel blocco di T2b resta solo il conteggio: una lista, non due.

In fase 2: sezione «Visibilità su Google (shape — data)» in `DESIGN-BRIEF.md` con §6.2-§6.4 ridotti; dopo la costruzione
`/impeccable critique` e `impeccable detect --json` sui file cambiati, nei due temi a 1280 e 400 px.

## 7. File (elenco esatto)

| File | Tipo | Cosa |
|---|---|---|
| `site-factory-editor/lib/visibilita.ts` | A | puro, import `.ts`/tipo + `zod`: `RispostaVpsSchema`, `regexHost`, aritmetica delle date `AAAA-MM-GG`, `finestra28`, `totali` (posizione pesata), `tappe`, `statoRaccolta`, `righePagine` (enum → frase, ordine), `righeRicerche`, `normalizzaRicerca`, `corrisponde`, `regolaOttoSettimane`, `categoriaCwv`, `leggiPsiHome`, `vistaVisibilita` |
| `site-factory-editor/lib/visibilita-fonti.ts` | A | I/O: `statoRaccolta(slug, servizio)` (webhook), `dettaglioGsc` (tre chiamate, paginazione, token da `lib/motori.ts`), `cruxSito`, letture tolleranti di `traffico/psi.json`, `mappa-query.json`, `mappa-storico.ndjson`, `registro.ndjson`; `leggiVisibilita` con `fonte()`; `SF_VISIBILITA_REGISTRATE`; `redigi` dei messaggi |
| `site-factory-editor/components/traffico-visibilita.tsx` | A | server component asincrono (senza `"use client"`): chiama `leggiVisibilita`, rende `vistaVisibilita`; esporta anche lo scheletro per `<Suspense>` |
| `site-factory-editor/app/traffico/[slug]/page.tsx` | M | monta `<Suspense>` + blocco nella card Sito dopo «Motori di ricerca»; `CONTENUTI.sito`: «lo stato dell'indicizzazione su Google e Bing» passa da «Cosa comparirà qui» a «Già disponibile» come «lo stato dell'indicizzazione e le ricerche che mostrano il sito su Google, raccolti ogni notte» |
| `site-factory-editor/app/api/clients/[slug]/traffico/route.ts` | M | dopo una transizione riuscita del Sito: `statoRaccolta` in best effort e invalidazione della cache |
| `site-factory-editor/lib/integrazioni.ts` | M | `RegistraCliente.trafficoSito`; `syncInfra` legge `traffico.sito.stato` (tollerante, default `spento`) e lo passa a `proietta` |
| `site-factory-editor/scripts/n8n-import.ts` | M | `TUTTI` + `traffico-sensori`, `traffico-cliente`, `traffico-stato` |
| `site-factory-editor/scripts/test-visibilita.ts` | A | banco §10 |
| `site-factory-editor/scripts/fixtures/visibilita/` | A | `gsc-siti.json`, `gsc-giorni.json`, `gsc-giorni-senza-righe.json`, `gsc-giorni-senza-metadata.json`, `gsc-pagine.json`, `gsc-pagine-ricerche.json`, `gsc-date-ricerche-1.json`, `gsc-date-ricerche-2.json`, `ispezione-pass.json`, `ispezione-neutral.json`, `ispezione-noindex.json`, `ispezione-canonica.json`, `errore-403.json`, `errore-429.json`, `crux-origine.json`, `crux-404.json`, `sitemap.xml`, `psi.json`, `mappa-query.json`, `mappa-storico.ndjson`, `registro.ndjson`; `ui/<stato>/` (una cartella per riga di §6.3 con `stato.json`, `gsc-*.json`, `crux.json`) |
| `infra/n8n/traffico-sensori.json` | A | §3.1 |
| `infra/n8n/traffico-cliente.json` | A | §3.2 |
| `infra/n8n/traffico-stato.json` | A | §3.3 |
| `infra/n8n/registra-cliente.json` | M | §3.4 |
| `site-factory-editor/components/traffico-mappa.tsx` | M (solo M5) | riga dell'esito della regola sotto ogni ricerca su cui puntare |
| `site-factory-editor/DESIGN-BRIEF.md` | M | sezione «Visibilità su Google (shape — data)» |
| `docs/vps-integrazioni-setup.md` | M | §12 «Sensori Traffico (T2b)»: service account di lettura, credenziale, tre tabelle con colonne, workflow, prova a comando, spazio delle Data table, righe Bitwarden |
| `docs/DEBUG.md` | M | «pannello Visibilità vuoto o fermo» → `TrafficoFonti` (causa, `aggiornato`) ed esecuzioni di `sf-traffico-sensori`/`sf-traffico-cliente`; «totali diversi da Search Console» → §2.4; «pagina ferma a non indicizzata» → `TrafficoPagine` + link di ispezione; «regola delle 8 settimane strana» → `mappa-storico.ndjson`, `registro.ndjson`, `datiFinoAl` |
| `docs/traffico/piano-T2b.md` | M | Calibrazione, Verifica, chiusura |
| `docs/traffico/README.md` | M | §7 stato T2b; §8 service account di lettura in n8n (non più «con chiave JSON» sul Mac) |
| `docs/handoff-fase-c.md` | M | riga T2b |

Non si toccano: `lib/motori.ts` (solo import del token), `lib/schemas.ts` (nessun campo nuovo in `client.json`), `lib/secrets.ts`
e `app/api/setup/keys/route.ts` (nessuna chiave nuova sul Mac), `lib/portafoglio.ts` e `lib/cache.ts` (solo import),
`lib/traffico.ts`, `components/traffico-ui.tsx`, `lib/deploy.ts`, `lib/build.ts`, `lib/catena.ts`, `instrumentation.ts`, il renderer,
`site-intake/`, le skill, gli altri workflow n8n. Dipendenze nuove: nessuna.

## 8. Perimetro per `.claude/scope.json` (primo atto della fase 2, a perimetro vuoto e T2a chiuso)

```json
{
  "task": "T2b Sensori sul VPS e pannello Visibilità su Google (docs/traffico/piano-T2b.md)",
  "perimetro": [
    "site-factory-editor/lib/visibilita.ts",
    "site-factory-editor/lib/visibilita-fonti.ts",
    "site-factory-editor/components/traffico-visibilita.tsx",
    "site-factory-editor/app/traffico/[slug]/page.tsx",
    "site-factory-editor/app/api/clients/[slug]/traffico/route.ts",
    "site-factory-editor/lib/integrazioni.ts",
    "site-factory-editor/scripts/n8n-import.ts",
    "site-factory-editor/scripts/test-visibilita.ts",
    "site-factory-editor/scripts/fixtures/visibilita/**",
    "infra/n8n/traffico-sensori.json",
    "infra/n8n/traffico-cliente.json",
    "infra/n8n/traffico-stato.json",
    "infra/n8n/registra-cliente.json",
    "site-factory-editor/DESIGN-BRIEF.md",
    "docs/vps-integrazioni-setup.md",
    "docs/DEBUG.md",
    "docs/traffico/**",
    "docs/handoff-fase-c.md"
  ]
}
```

M5 aggiunge `site-factory-editor/components/traffico-mappa.tsx` solo se T4 è chiuso (dubbio 4), dichiarandolo prima. La fixture in
`site-renderer/out/zz-test-t2b` è esente dal guard; script e prima/dopo nello scratchpad.

## 9. Milestone (ogni verifica passa prima della successiva)

**M0 — Precondizioni (nessun codice).** `git log --oneline -5`, `git status --short`; `scope.json` vuoto; T2a chiuso (nomi reali di
token, `steps.build.motori`, `psi.json`, registro letti dal codice); guide Next lette (streaming e Suspense, route handler, server
component). Baseline con i conteggi: `npx tsc --noEmit`, `npm run build`, `test-fondamenta.ts`, `test-traffico-stato.ts`,
`test-portafoglio.ts`, `test-stati.ts`, `test-demo.ts`, `test-motori.ts`. Poi `scope.json` §8.

**M1 — Regole pure.** `lib/visibilita.ts`, fixture, banco casi 1-21 (anche con `TZ=Asia/Tokyo`: stessi risultati). Verifica:
banco verde, `tsc`. **Commit 1** + push (nessun chiamante).

**M2 — Workflow versionati, senza import.** I tre JSON nuovi e la modifica di `registra-cliente.json`; Code node scritti come
funzioni pure; `n8n-import.ts`; `integrazioni.ts`. Verifica: banco casi 22-27 e 36-40 (nodi estratti dai JSON e strutture), `tsc`,
`test-portafoglio.ts` invariato; `git diff` di `registra-cliente.json` limitato a colonna, schema e tre nodi di cancellazione.
**Commit 2** + push (niente sull'istanza).

**M3 — Lettura e pannello.** `visibilita-fonti.ts`, componente, `page.tsx`, route. Verifica: `tsc`, `npm run build`, banco completo
(28-35 e 41-46 con `fetch` finto), tutti i banchi di M0 con gli stessi conteggi. Fixture `out/zz-test-t2b` (copia di Cavaliere senza `dist`,
`.wrangler`, `wrangler.jsonc`, `logs`; nome, recapiti, dominio `.invalid`, Umami, integrazioni e deploy finti, `grep` dei valori veri
= 0; Sito attivo; `steps.build.motori` scritto a mano) e dev server con `SF_VISIBILITA_REGISTRATE` su ogni cartella `ui/<stato>`:
schermate a 1280 e 400 px nei due temi, nessuno scroll orizzontale, `/impeccable critique` e `impeccable detect --json`, contrasto
AA delle coppie usate (nessuna nuova). **Commit 3** + push.

**M4 — Prova dal vivo sul VPS** (§11), quando Mattia ha creato il service account di lettura e la credenziale. Verifica: passi e
controlli di §11, punti di §3.5 annotati in Calibrazione. **Commit 4** + push (JSON riesportati con gli id reali, documenti). Senza
credenziali T2b si chiude dichiarando M4 «da eseguire».

**M5 — Regola delle 8 settimane nel blocco di T4** (precondizione: T4 chiuso). `traffico-mappa.tsx` riceve dalla pagina gli esiti per
testo; fixture con mappa e storico. Verifica: `tsc`, build, banco T4 invariato, schermate dei cinque esiti. **Commit 5** + push.

Fasi 3-5: Calibrazione, test completi, revisione del diff riga per riga, file toccati vs §7, fixture rimossa (righe di prova tolte
col ramo `rimuovi`, `ls out/` = clienti reali, hash di `cavaliere-build-srls/client.json` invariato), `scope.json` svuotato, README §7
e §8, handoff, DEBUG.

## 10. Banco `scripts/test-visibilita.ts` (senza rete, stile `test-portafoglio.ts`)

`globalThis.fetch` sostituito da un router finto che registra metodo, URL, header e corpo; una richiesta non prevista fa fallire il
caso. I nodi Code si leggono da `infra/n8n/*.json` per nome e girano con `new Function("$input", "$", codice)` e uno stub di
`$input.all()/first()` e `$("Nome").first()/all()`: si prova il codice che andrà davvero su n8n. Date fisse.

Regole dell'editor
1. Fonte VPS `non_raggiungibile` → vista senza alcun campo numerico, badge err, frase con l'orario.
2. `non_configurata` → nessuna chiamata, frase con il nome della chiave e il link.
3. Risposta fuori schema (campo mancante, data non `AAAA-MM-GG`) → non raggiungibile con il percorso del campo.
4. Dettaglio Search Console giù con VPS ok → totali e pagine sì, ricerche «non lette», nessuno «0».
5. CrUX 404 → «non disponibile», nessun errore; 400 `API_KEY_INVALID` → errore tradotto senza la chiave.
6. Mai «Invalid Date»: date non valide omesse; `2026-10-11T00:00:00.000Z` → «11/10» (il banco si lancia anche con `TZ=Asia/Tokyo`).
7. `statoRaccolta`: non registrato, in attesa della verifica, prima raccolta, senza proprietà, ok, in ritardo a 36 h + 1 min (non a
   35 h 59), ferma, quota, in pausa.
8. Servizio sospeso → nessuna chiamata a Search Console e CrUX, dati del VPS con «raccolta ferma dal».
9. `totali`: posizione pesata per impression (2 giorni: 1 impr. pos. 50, 99 impr. pos. 10 → 10,4), giorni senza impression esclusi
   dalla media, clic e impression sommati.
10. `finestra28` e periodo precedente attraverso fine mese e anno bisestile.
11. `tappe`: prima impression e primo clic; nessuno → assenti, mai «il 01/01/1970».
12. Righe di `dominio` diverso ignorate.
13. Sito a zero: frase «Nessuna impression dal … al …»; «normale» solo con prima pubblicazione < 56 giorni.
14. `righePagine`: ogni enum → frase di §6.3; canonica diversa; ordine problemi → non indicizzate → indicizzate.
15. `righeRicerche`: prime 10, «Altre N», path relativo, ricerche su cui puntare segnate.
16. `normalizzaRicerca`/`corrisponde`: accenti, ordine diverso, parole vuote, parola in più nella ricerca sì, parola mancante no.
17. `regolaOttoSettimane`: `pagina_non_online` (path nullo o assente dal registro); `in_misura` a 55 giorni; `fuori_portata` a 56;
    `vista` con prima data e pagina; tolta e rimessa nello storico → conto dalla rimessa; `inizio` = pagina online dopo il target;
    settimane contate su `datiFinoAl`, non su oggi; `dati_insufficienti`.
18. `categoriaCwv` dai confini dell'istogramma; CLS stringa `"0.12"`.
19. `leggiPsiHome`: file assente, `runtimeError`, forma di T2a.
20. `regexHost`: `edilprova.it`, `www.edilprova.it`, punti escapati, nessun match su `edilprova.it.evil.com` né su
    `altro.edilprova.it`.
21. Numeri in italiano: «1.234», «23,4».

Nodi n8n (codice estratto dai JSON)
22. «Da misurare»: solo `attivo`; `sc-domain` più specifico; prefisso URL; `siteUnverifiedUser` escluso; slug della prova; HTTP 403 su
    `sites` → eccezione con il codice.
23. «Richiesta giorni»: prima raccolta oggi − 485, poi `datiFinoAl` − 10; data PT anche alle 01:00 italiane; filtro §2.4.
24. «Piano» giorni: `first_incomplete_date` rispettato; zeri da `raccolta_dal`; nessuna riga prima; senza metadata con e senza righe
    (§2.5); dominio cambiato → `raccolta_dal` nuovo.
25. «Piano» sitemap: `<loc>` con `&amp;`, 201 URL → 200; sitemap 404 → solo home, nessuna pagina tolta.
26. «Piano» ispezioni: mai ispezionata; non PASS a 19 h no e a 21 h sì; `lastmod` > ultimo passaggio; PASS stabile a 6 e 8 giorni; tetto.
27. «Esiti»: mappatura dei campi; `verdetto_dal` invariato a verdetto uguale; `prima_indicizzata` solo al primo PASS e mai
    sovrascritta; 403 → fonte `errore`; 429 → `quota`; 400 su una pagina → causa con il conteggio.

Letture (fetch finto)
28. `statoRaccolta`: URL, header `X-Site-Factory-Key`, corpo `{ slug, servizio }`, timeout; 403 → «chiave rifiutata dal VPS».
29. `dettaglioGsc`: proprietà codificata (`sc-domain%3Aedilprova.it`), finestra su `datiFinoAl`, filtro, `rowLimit`; terza chiamata
    solo con target; paginazione che si ferma a una pagina corta e al tetto di 4.
30. `cruxSito`: header `X-Goog-Api-Key`, nessuna `key=` nell'URL; seconda richiesta sulla home solo con origine disponibile.
31. Cache: seconda apertura entro il TTL senza chiamate; `datiFinoAl` nuovo → nuova lettura; invalidazione della route.
32. Errore ritentato dopo 60 s (comportamento di `memo`), `da` stabile tra due fallimenti (`fonte`).
33. `SF_VISIBILITA_REGISTRATE`: nessuna chiamata di rete, stati della cartella.
34. Nessun segreto: sentinelle di chiave n8n, token Google e API key assenti da viste, errori e console catturata.
35. `vistaVisibilita` a 60 pagine e 1.000 ricerche: dimensioni limitate (10 righe visibili, resto nei `details`).

Strutture dei workflow
36. Tutti: `errorWorkflow`, `timezone`, `executionOrder: v1`; i tre nuovi con `saveDataSuccessExecution: "none"`.
37. Nessuna stringa che somigli a una chiave o a un token nei JSON; webhook con `headerAuth`.
38. Get che possono tornare vuoti con `alwaysOutputData`; nodi dopo una Get di molte righe con `executeOnce` (elenco dichiarato nel banco).
39. `registra-cliente.json`: colonna `traffico_sito` nell'upsert; ramo `rimuovi` con i tre Delete `executeOnce` + `alwaysOutputData`;
    resto del workflow identico al commit precedente (confronto profondo tolti i nodi nuovi).
40. Ordine dei rami di «Piano» per posizione verticale: fonti, giorni, pagine da togliere, ispezioni.

Integrazione
41. `syncInfra` → corpo dell'upsert con `trafficoSito` (`attivo`, `sospeso`, `spento` senza campo, valore strano → `spento`).
42. `rimuoviInfra` invariato.
43. Route: transizione Sito riuscita → una chiamata a `traffico-stato` e cache invalidata; errore del VPS → risposta della route identica.
44. Route: transizione della Scheda → nessuna chiamata.
45. Route: cliente senza dominio pubblicato → nessuna chiamata.
46. Pagina: con `SF_VISIBILITA_REGISTRATE` e `ui/vps-giu` il resto del dettaglio si rende (Suspense), verificato in M3 nel browser.

## 11. Prova dal vivo (quando Mattia crea il service account di lettura)

Precondizioni: T2a provato dal vivo (proprietà `sc-domain:consulbuild.com` verificata, lettore tra i proprietari); editor con chiavi
di T2a; nessun cliente reale con `traffico_sito = attivo` finché la prova non è chiusa.

**Mattia (una volta)**

1. Google Cloud → progetto dell'agenzia → IAM & Admin → Service Accounts → `sf-sensori-lettura`, nessun ruolo → Keys → JSON. (Se
   T2a l'ha già creato per la lista dei proprietari: solo la chiave.)
2. n8n → Credentials → Add → «Google Service Account API» → nome «Search Console lettura»: Service Account Email = `client_email`,
   Private Key = `private_key` senza virgolette, *Set up for use in HTTP Request node* attivo, Scopes
   `https://www.googleapis.com/auth/webmasters.readonly`. Salvare, poi cancellare il JSON da Download. Bitwarden: nota «n8n
   Search Console lettura» con l'email del service account (non la chiave).
3. Solo se sceglie la prova B su dati veri (dubbio 3): Search Console di cavalierebuild.it → Impostazioni → Utenti e autorizzazioni
   → Aggiungi utente → email del service account → autorizzazione «Limitata».

**Sviluppatore**

4. Tabelle: `POST /api/v1/data-tables` con le colonne di §4.1 da uno script nello scratchpad (chiave `N8N_API_KEY`); se l'istanza
   risponde 404/405, Mattia le crea dall'interfaccia con la tabella §4.1. Colonna `traffico_sito` aggiunta a `Clienti` allo stesso modo.
   Annotare lo spazio usato e il limite mostrati in n8n → Data tables.
5. Id delle tabelle nei JSON; `n8n-import.ts import traffico-cliente`, poi id del figlio nel dispatcher, `import traffico-sensori`,
   `import traffico-stato`; Mattia seleziona «Search Console lettura» nei nodi HTTP Google; `export` dei tre → id della credenziale e
   tipo interno nel JSON; nessun segreto nel diff.
6. `sf-registra-cliente`: copia di prova (§3.4) con `zz-test-t2b` → upsert, rimuovi, ping; poi `import registra-cliente`; un
   `ping` dall'editor (prova della chiave) = 200.
7. **Prova A — sito nuovo**: fixture `zz-test-t2b` pubblicata come nella prova di T2a su `zz-test-t2b.consulbuild.com` (worker di
   prova, fondamenta cotte, pubblicazione senza la route come T2a §8 passo 8) con servizio Sito attivo; riga nel registro scritta
   da uno script dello scratchpad con `registraCliente({ slug: "zz-test-t2b", azione: "upsert", dominio, azienda: "zz prova
   sensori", email: "info@consulbuild.com", trafficoSito: "attivo" })` → `curl -X POST
   https://n8n.consulbuild.com/webhook/traffico-sensori -H "X-Site-Factory-Key: …" -H "Content-Type: application/json" -d
   '{"slug":"zz-test-t2b"}'`. Controlli: esecuzioni di dispatcher e figlio riuscite; `TrafficoFonti` con `gsc` `ok`, `proprieta`
   `sc-domain:consulbuild.com`, `dati_fino_al` (annotare presenza di `metadata` senza righe); `TrafficoGiorni` coerente con §2.5;
   `TrafficoPagine` con la home (`NEUTRAL` atteso: «Google non la conosce ancora»); seconda esecuzione subito dopo → nessuna
   ispezione, righe identiche.
8. **Editor**: `/traffico/zz-test-t2b` senza `SF_VISIBILITA_REGISTRATE` → stato «ok, sito nuovo a zero», nei due temi; allineamento:
   «Sospendi…» dalla pagina → la riga di `Clienti` diventa `sospeso` entro pochi secondi → nuova esecuzione del dispatcher → nessuna
   chiamata per `zz-test-t2b`; «Riattiva…» → di nuovo `attivo`; `traffico_sito` scritto a mano a `sospeso` in n8n → apertura del
   dettaglio → torna `attivo` (allineamento alla lettura).
9. **Prova B — dati veri in sola lettura** (se approvata): riga temporanea `zz-test-t2b-cav` in `Clienti` (azienda «zz prova sensori»,
   e-mail dell'agenzia: nessun abbinamento possibile con Stripe) con `dominio` `cavalierebuild.it` e `traffico_sito = attivo`, scritta
   con `registraCliente`, dispatcher con quello slug: totali per
   16 mesi, pagine ispezionate, confronto a occhio con l'interfaccia di Search Console (stessa finestra, rapporto Pagine filtrato
   per host) → differenze annotate in Calibrazione; lettura dell'editor con una fixture che punta a quel dominio: totali e pagine sì,
   ricerche «non lette» (il service account di scrittura non ha accesso a quella proprietà: atteso, prova lo stato «dettaglio giù
   con VPS ok»). Nessuna scrittura su Cavaliere, nessun deploy.
10. **Errori**: togliere al lettore l'accesso alla proprietà di prova → esecuzione → `gsc` `errore` 403 e **un** messaggio Telegram;
    seconda esecuzione → nessun nuovo messaggio; accesso ridato → `ok`. Webhook senza chiave → 403. Corpo con slug non valido → 400.
    Dead-man: `aggiornato` spostato a tre giorni prima dall'interfaccia n8n → editor «In ritardo».
11. **Segreti**: `grep -rF` degli ultimi 12 caratteri di `N8N_REGISTRA_KEY`, di `N8N_API_KEY` e di una riga interna della chiave
    privata del lettore su `infra/n8n/`, `out/zz-test-t2b/`, log del dev server e output degli script → 0 risultati.
12. **Pulizia**: `rimuovi` per `zz-test-t2b` e `zz-test-t2b-cav` → nessuna riga nelle quattro tabelle; worker di prova cancellato
    come in T2a; accesso «Limitato» su Cavaliere tolto o lasciato secondo la decisione di Mattia; `sf-registra-cliente-prova`
    eliminato; fixture eliminata dall'editor col nome; `ls out/` = clienti reali.

## 12. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **Quote Google** | 1 Search Analytics al giorno per sito con intervallo breve; ispezioni solo dovute, tetto 200 e 4 al secondo contro 2.000/giorno e 600/minuto per proprietà; dettaglio su richiesta con cache 6 h e finestra di 28 giorni; CrUX cache 24 h (150/minuto per progetto); 429 → `quota`, niente tentativi a raffica. |
| **Dati ritardati e fuso del Pacifico** | «Dati fino al» da `first_incomplete_date`; righe solo dei giorni completi; finestra di recupero di 10 giorni; regola delle 8 settimane contata su `datiFinoAl`; date mai convertite con `Date` (banco 6, 23). |
| **Numeri diversi da Search Console** | filtro per host dichiarato (§2.4), nota «le righe non sommano ai totali» nel pannello, riga in DEBUG, confronto nella prova B. |
| **Token e credenziali** | chiave del lettore solo in n8n cifrata con `N8N_ENCRYPTION_KEY` (già in Bitwarden), scope in sola lettura; accesso perso → 403 → stato `errore` e un solo Telegram; token del Mac quelli di T2a in memoria; nessun segreto nei JSON, nei log e nelle risposte (banco 34, 37; §11 passo 11); rotazione = nuova chiave nella credenziale, nessun cambio di codice. |
| **Data table piene** | stima §2.2 (≈ 23 MB a 200 clienti), retention 486 giorni, pagine sovrascritte, esecuzioni riuscite non salvate, spazio e limite letti in M4, soglia 60 % → variabile d'ambiente; se il limite si raggiunge le scritture falliscono → errore del figlio → Telegram. |
| **Costo** | API Google gratuite; nessun servizio nuovo; carico sul VPS di pochi minuti a notte. |
| **Trappole di n8n** (zero item, esecuzioni ripetute, upsert multi-condizione, delete `lt`, versione dell'Execute Workflow) | regole §3.5, banco 38-40, verifiche in M4 con ripieghi già scelti. |
| **Lettore non vede la proprietà** | stato `senza_proprieta` con l'azione; ripiego scope pieno + `sites.add` (dubbio 8). |
| **Stato del servizio non allineato sul VPS** | deploy, route e lettura lo scrivono (§2.7); il peggio è una notte di letture in più su un sospeso. |
| **Webhook di lettura esposto** | header `X-Site-Factory-Key`, validazione dello slug prima di ogni Data table, risposta senza dati personali (URL e numeri). |
| **Ricerche degli utenti come dati personali** | mai salvate sul VPS né su disco: solo in memoria nella cache dell'editor; Google omette le ricerche rare. |
| **Lettura sbagliata del cold start** | niente percentuali, frecce o colori sulle variazioni; frasi ancorate alla ricerca §3; «normale» solo sotto le 8 settimane dalla prima pubblicazione. |
| **Pagina del dettaglio lenta** | `<Suspense>` con scheletro, letture in parallelo, timeout 8 s, cache. |
| **T4 o T5c non pronti** | regola in funzione pura con ingressi tolleranti; senza mappa nessuna riga; pagine diverse dalla home «non ancora online» finché T5c non dà i path; M5 dopo T4. |
| **Collisione con altri piani su `page.tsx` e route** | fase 2 dopo T2a chiuso e a `scope.json` vuoto; blocchi separati per sezione. |

## 13. Dubbi che richiedono una decisione (proposta tra parentesi)

1. **Bing**: fuori da T2b, resta la riga di stato di T2a (sì) oppure totali giornalieri Bing sul VPS?
2. **Storico oltre 16 mesi**: nessuno, retention come Search Console (sì, da riconsiderare prima dei 16 mesi di dati del primo
   cliente attivo) oppure una tabella mensile senza scadenza per i casi studio?
3. **Prova B su Cavaliere in sola lettura** con il lettore aggiunto come utente «Limitato» da Mattia (sì: niente cambia online) oppure
   solo la prova A a zero dati?
4. **M5 dipende da T4**: se T4 non è chiuso quando M4 lo è, T2b si chiude senza M5 e la regola si monta nel blocco di T4 come prima
   milestone di T7a (proposta) oppure T2b resta aperto fino a T4?
5. **Chiave del webhook di lettura**: riuso di `N8N_REGISTRA_KEY` e della credenziale «Site-factory registra» (sì: stesso dominio di
   fiducia, nessuna chiave nuova) oppure una chiave dedicata?
6. **Telegram** solo sulle transizioni di guasto della raccolta (sì) oppure anche sulle pagine uscite dall'indice?
7. **Ispezioni**: ogni giorno le pagine non indicizzate o cambiate, ogni settimana le stabili, tetto 200 (sì) oppure tutte ogni giorno?
8. **Accesso del lettore**: scope in sola lettura e proprietà trovata con `sites.list` (sì), con il ripiego scope pieno + `sites.add`
   solo se la prova A mostra che il proprietario delegato non compare?

## 14. Documentazione ufficiale letta (2026-09-14)

- Search Console API: `searchanalytics.query` (developers.google.com/webmaster-tools/v1/searchanalytics/query), «Getting all your
  data» (…/v1/how-tos/all-your-data), limiti d'uso (developers.google.com/webmaster-tools/limits), `urlInspection.index.inspect` e
  `UrlInspectionResult` (…/v1/urlInspection.index/inspect, …/UrlInspectionResult).
- CrUX API (developer.chrome.com/docs/crux/api), guida all'API con l'errore 404 (…/docs/crux/guides/crux-api), metodologia e
  idoneità (…/docs/crux/methodology), History API (…/docs/crux/history-api).
- n8n: credenziale Google Service Account (docs.n8n.io/integrations/builtin/credentials/google/service-account), Data tables
  (docs.n8n.io/build/work-with-data/data-tables), API delle Data table (docs.n8n.io/connect/n8n-api/data-table); commit n8n
  «Update N8N_DATA_TABLES_MAX_SIZE_BYTES default to 50mb» (github.com/n8n-io/n8n, 2025) per il valore storico.
- Bing Webmaster API: `GetRankAndTrafficStats` (learn.microsoft.com/…/iwebmasterapi.getrankandtrafficstats).
- Istanza: `GET /api/v1/data-tables` (tabelle e colonne esistenti), `GET /rest/settings` (versione non esposta).

## Calibrazione

(fase 3 — vuota)

## Verifica

(fasi 4-5 — vuota)
