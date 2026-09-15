# Piano G1 — Scheda Google consigliata

Riallineato il 15/09 alle decisioni T3 12-14 e K1.

Stato: **fase 1 (piano) — pronto per lo sviluppo dopo T4**, scritto il 2026-09-14, riallineato il 2026-09-15 (decisioni G1
1-10, T3 punti 12-14, K1, «Priorità assoluta»). Contratti reali letti nel codice il 15/09: `lib/zone-servite.ts` (T3, chiuso),
`lib/secrets.ts` e `lib/chiavi-traffico.ts` (K1, chiuso). Fonti: `docs/traffico/README.md` (§1-§5),
`decisioni-piani.md` (Priorità assoluta, T3 punti 10-14, T4, G1, K1), `brief-G1.md`, `ricerca-scheda-google-2026-09.md` (§0-§6, §7.1, §8.2-§8.3, §9,
§10 G1, §11.1), `piano-T3.md` (§3, contratto delle zone), `piano-T4.md` (§2, §3.2, §6, §7, §8, §10-§13). Codice letto:
`lib/traffico.ts`, `app/traffico/[slug]/page.tsx`, `components/traffico-ui.tsx`, `lib/run-bus.ts`, `lib/run-step.ts`,
`lib/portafoglio.ts`, `lib/cache.ts`, `lib/secrets.ts`, `app/api/setup/keys/route.ts`, `.claude/skills/copy-critic/SKILL.md`,
`.claude/skills/local-service-copywriter/SKILL.md`, forma di `contesto.json`/`brief.json` di Cavaliere (senza dati personali),
`DESIGN-SYSTEM.md`, `DESIGN-BRIEF.md` §Area Traffico. Letture aggiuntive, minime e dichiarate: `lib/agenti.ts` (regole delle
fasi), `lib/legale.ts` (`inferForma`, `normAlnum`, `soloCifre` da riusare), `lib/slop.ts` (gate anti-slop), `lib/steps.ts`
(strumenti ammessi e ciclo del critico del copy), `app/api/clients/[slug]/img/[file]/route.ts` e `logo/route.ts` (file serviti),
forma di `copy-coverage.json`, `lavori.json`, `site.json`.

## 1. Contesto

Obiettivo: per un cliente con servizio **Scheda Google** attivo, un lavoro dell'editor produce
`out/<slug>/traffico/scheda-consigliata.json`: categoria primaria e aggiuntive scelte dai competitor della zona e dai servizi
veri, servizi, descrizione ≤ 750 caratteri, orari, **area servita dalle zone servite del form lead** (la leva più forte nelle
mappe della zona: priorità assoluta del 15/09), telefono, sito con UTM, social, foto reali, link, ciascuna voce con fonte,
motivo, rischio e giorno di inserimento. Mattia la legge nell'area Traffico e la copia a mano nella scheda (decisione 1).
Checklist «fatto» e confronto con la scheda pubblica: G2. Monitor: G3.

Fatti che vincolano il piano (letti il 14/09, riletti il 15/09):

- **Nessun `StepKey`**: il lavoro è `traffico:<slug>:scheda` sul run-bus con `kind: "traffico"`, che **nasce in T4**
  (`startTrafficoRun`, `busIdTraffico`, eventi in `out/<slug>/traffico/logs/run-<lavoro>.ndjson`; oggi `run-bus.ts` ha solo
  `"cliente" | "fabbrica"`). G1 non tocca la catena demo né `client.json`.
- **Zone servite (T3, chiuso)**: `lib/zone-servite.ts` è l'unica via per leggerle (decisione T3 punto 14):
  `leggiZoneServite(dir)` → `zoneUsabili(lettura)` (`{ok: true, zone}` con zone `confermate` o proposta `riconosciute`, altrimenti
  `{ok: false, motivo}` con le frasi `MOTIVO_DA_CONTROLLARE` / `MOTIVO_DA_IMPOSTARE` / `MOTIVO_LEAD_CAMBIATO`); `areeServite(zone)`
  → `Area[]` unica nell'ordine delle etichette (`comune` · `dintorni` con `raggioKm` · `provincia` · `regione` · `italia`);
  `comuniServiti(zone, d)` → comuni 2026 con `kmDallaSede` e indici delle aree; `comuniEntroKm`, `regioneDiSigla`,
  `etichettaArea`, `nomeBreveRegione`, `caricaDati()` (dataset T6a `site-renderer/data/comuni-fatti.json` con `centro: [lat, lng]`
  + `site-intake/public/data/province.json`, generato e fuori da git). `zone.sede` = `{codice, nome, sigla} | null`. Il lead è
  `raw-submission.json` (`risposte.zone`, `risposte.sede`); per i brief Tally lo stato è `da_impostare`.
- **Non esistono** `traffico/dati.json`, `traffico/foto.json`, priorità dei lavori, prezzi, attestati né orari di T3 (T3 punti
  13-14): niente mini-form.
- **Orari**: oggi nessun campo nel form lead né in `brief.json`. Mattia li aggiunge al form lead in un'altra chat (form, n8n,
  import): G1 li legge dal lead importato quando esistono, col nome del campo scelto là (verifica in M0), altrimenti la voce resta
  «da completare».
- **Chiavi (K1, chiuso)**: `DATAFORSEO_LOGIN` e `DATAFORSEO_PASSWORD` esistono già in `CHIAVI_TRAFFICO` di `lib/secrets.ts`
  (gruppo «Ottimizzazione del traffico» in Impostazioni, prova gratuita coi dati utente in `lib/chiavi-traffico.ts`). G1 non
  aggiunge chiavi né prove e non tocca `secrets.ts`, `chiavi-traffico.ts` o la route delle chiavi: legge le credenziali solo
  attraverso `lib/dataforseo.ts` di T4 (`getSecret`).
- `run-step.ts` esporta `ioWithSignal(signal, sink)`: le fasi `claude -p` del lavoro lo riusano così com'è (login Max,
  `--model claude-opus-4-8 --effort xhigh`, errori come valore di ritorno, `isErroreLimite`). Le costanti degli strumenti
  (`READ_SKILL_WRITE`, `NO_NET_NO_BASH`) sono private in `lib/steps.ts`, che nessun piano Traffico tocca.
- `lib/agenti.ts`: la fase è il nome della skill; `/critic/i` vince su tutto, `/logo/i` cattura qualunque fase con «logo».
  Le etichette delle fasi di G1 non contengono «logo»; la skill di scrittura richiede una regola nuova.
- `lib/dataforseo.ts` **nasce in T4** (client con Basic auth, trasporto iniettabile, `SF_DATAFORSEO_REGISTRATE`, cache su disco,
  tentativi, `ErroreDfs`, `saldo`, `configurata()`, costi); G1 lo estende con i due endpoint Maps e My Business Info. T4 legge
  anche il `local_pack` della SERP organica: la documentazione del `local_pack` **non** ha categorie (solo `cid`, `title`,
  `domain`, `phone`, `rating`), quindi le categorie vengono solo da Maps SERP e My Business Info.
- `lib/legale.ts` esporta `inferForma(denominazione)` → `societa | ditta_individuale` (inferenza incerta → ditta individuale,
  degrado sicuro): decide solo se è ammessa una ricerca col nome del cliente (decisione G1 punto 1).
- `contesto.json` ha `servizi_atomizzati[].servizio` senza id, `macro_categorie`, `settore_normalizzato`, `zona.sede` (solo nome),
  `punti_di_forza[{claim, fonte}]`, `promesse_consentite`, `promesse_vietate` (Cavaliere: 15, tra cui anni di esperienza, garanzie,
  materiali di qualità, bonus fiscali), `promessa_martello`, `tono`. `copy-coverage.json` lega ogni servizio alla card del sito.
- Foto: `lavori.json` (`[{file, alt, caption}]`) → `img/lavoro-N.jpg` sono le foto reali del form (EXIF e GPS tolti all'import);
  nessun servizio, comune o anno per foto. `img/hero.jpg` e `img/card-*.jpg` sono generate con FLUX e **non** vanno mai sulla
  scheda (T1a decisione 2, ricerca §5.4).
- Logo: fornito dal cliente in `logo/fornito-*.png`, oppure generato dalla pipeline in `mark.png` (con `client.steps.logo.status
  === "verificato"`); i `mark*.svg` non sono formati ammessi da Google.
- `lib/slop.ts` esegue `check-slop.mjs` solo su `copy.json`; lo script accetta qualunque mappa piatta `slot → testo`, quindi la
  descrizione si controlla con lo stesso script su un file temporaneo (nessuna copia delle frasi bandite).
- Il servizio Sito e il servizio Scheda sono separati: le zone servite e gli orari vengono dal form lead e valgono per entrambi (la
  card delle zone è visibile anche a servizi spenti); `mappa-query.json` nasce solo da T4, che richiede il Sito attivo. G1 deve
  funzionare anche senza mappa.
- `.claude/scope.json` oggi vuoto; T4 modificherà `app/traffico/[slug]/page.tsx`, `lib/run-bus.ts`, `lib/agenti.ts`,
  `DESIGN-BRIEF.md` e creerà `lib/dataforseo.ts`: la fase 2 di G1 parte **dopo T4 chiuso** (M0).

Fuori perimetro: scrittura sulla scheda via API; proposte di nome; post; Q&A; foto AI; recensioni; prezzi e attestati (T3 punto
13); checklist e stati `fatto`/`in-revisione` (G2); geogrid e monitor (G3); letture Business Profile API e `cache-api.json` (§2.7).

## 2. Decisioni motivate

### 2.1 Modalità «pubblica» soltanto

Le Business Profile API sono a quota 0 e il token OAuth vivrà in n8n (ricerca §8.4, G3 punto 1): in G1 nessun lettore
`locations.get`, `categories.batchGet`, `attributes.list` e nessuna `cache-api.json` (nessuno le scriverebbe). Lo schema
riserva `modalita: "api"` e la fonte `api-gbp` con puntatore obbligatorio: il giorno dell'accesso si aggiungono lettori e
cache senza cambiare versione. Conseguenza dichiarata: nomi italiani delle categorie «da confermare» (§4.4 della ricerca),
nessun servizio predefinito italiano, nessun attributo impostabile con prova. (Decisione G1 punto 4.)

### 2.2 Fonti DataForSEO (verificate oggi su docs.dataforseo.com e sulle pagine prezzi)

| Uso | Endpoint | Parametri fissati | Campi usati | Prezzo live |
|---|---|---|---|---|
| Schede della zona | `POST /v3/serp/google/maps/live/advanced` | `keyword`, `location_coordinate: "lat,lng,17z"` (7 decimali max, zoom 3z-21z, default 17z), `language_code: "it"`, `device: "mobile"`, `os: "android"`, `depth: 20` («for mobile device, only 20 results are returned») | item `maps_search`: `rank_absolute`, `cid`, `place_id`, `title`, `category`, `additional_categories`, `category_ids` («universal category IDs that do not change based on the selected country»), `domain`, `url`, `phone`, `is_claimed`; `check_url`, `cost` | **0,002 $** a SERP («billed per each SERP containing up to 100 results»); standard 0,0006, priority 0,0012 |
| Dettaglio di una scheda | `POST /v3/business_data/google/my_business_info/live` | `keyword: "cid:<cid>"` con `location_coordinate: "lat,lng,raggio"` (raggio 199,9-199.999 mm, richiesto anche col `cid:`), `language_code: "it"` | `category`, `category_ids`, `additional_categories`, `description`, `services[]` (`category`, `title`, `snippet`, `price`), `work_time`, `url`, `phone`, `title` | **0,0054 $** a scheda; standard 0,0015, priority 0,003 |
| Scheda del cliente | prima dagli item delle schede della zona (identità su telefono o dominio, §4.2 passo 2); se assente e **solo per una società**, una SERP Maps con `keyword` = `brief.azienda` al centro della sede, stessa identità; poi My Business Info sul `cid` trovato | come sopra | come sopra | 0,002 $ + 0,0054 $ |

- **Prezzi 2026**: l'aggiornamento del 1/7/2026 tocca Business Listings Search e Categories Aggregation, non Maps SERP né My
  Business Info (pagina «pricing update» riletta oggi). Solo Live (decisione T4 punto 3).
- **Non usati**: `local_pack` della SERP organica (senza categorie); `business_listings/categories` (gratis, 5.156 codici solo
  in inglese, include tipi Maps non selezionabili: non filtra); `attributes` di My Business Info («user-reviewed checks», non gli
  attributi del titolare); orari, valutazioni e recensioni dei competitor: restano nella cache delle risposte ma nessuna voce del
  cliente può derivarne (regola 5) e le recensioni sono fuori scope (decisione 9).
- **Cache**: quella su disco di T4 (`~/.cache/site-factory/dataforseo/<endpoint>/<sha>.json`), TTL 14 giorni per entrambi gli
  endpoint; all'avvio del lavoro si cancellano i file scaduti dei due endpoint (le risposte contengono nomi e telefoni di
  competitor, anche ditte individuali). Nel file della scheda non entra nessun nome né telefono di competitor.

### 2.3 Ditte individuali, chiavi assenti, zone non usabili

- `inferForma(brief.azienda).forma === "ditta_individuale"` → **nessuna ricerca col nome del cliente** (decisione G1 punto 1):
  le schede della zona si leggono (le query sono di mestiere e servizio, la località è una coordinata), la scheda del cliente si
  cerca solo tra quegli item per telefono o dominio. Il banco verifica che nessun corpo di richiesta contenga il nome.
- Senza chiavi DataForSEO (`configurata()` di T4 falsa): la scheda si prepara lo stesso (decisione G1 punto 2); le categorie si
  scelgono dai servizi e dal dizionario (§4.2 passo 7), segnate «da confermare coi concorrenti», `ricercaCategorie.zona:
  "non-configurata"`, `datiInsufficienti: true`. Il resto della scheda non dipende da DataForSEO.
- Zone non usabili (`zoneUsabili` → `ok: false`) o senza sede: nessuna lettura della zona (non c'è un centro affidabile),
  `ricercaCategorie.zona: "zone-non-usabili"`, categorie dai servizi, area servita `null` col motivo di `zoneUsabili` in `mancanti`.

### 2.4 Query e punti

- **Con `mappa-query.json`** (T4, `stato` ≠ `insufficiente`, sha degli ingressi coerenti): dalle `target`, le teste distinte per
  `testa.gruppo` nell'ordine delle target, sempre inclusa la testa di mestiere del cliente; **massimo 5**; il testo della query
  Maps è `testa.testo` senza comune (la località la dà la coordinata). Nomi dei campi della mappa da riverificare in M0 sul
  `piano-T4.md` chiuso.
- **Senza mappa** (Sito spento, T4 non eseguito, mappa insufficiente): dal lessico di T4 (`lib/mappa-lessico.json`), la prima testa
  di mestiere del `settore_normalizzato` + le teste primarie dei servizi in ordine di `macro_categorie` (nessuna priorità
  dichiarata: T3 punto 13); gruppi distinti, massimo 5. `fonteQuery: "lessico"`, pesi 1. Query solo in italiano
  (`language_code: "it"`).
- **Punti**: centro del comune della sede da `zone.sede.codice` sul dataset T6a (`caricaDati().comuni[codice].centro`, `[lat, lng]`;
  mai l'indirizzo, che per una SAB è una casa) + 4 punti a 2,5 km verso N, E, S, O: `lat ± 2,5/111,32`, `lng ± 2,5/(111,32·cos
  lat)`, arrotondati a 5 decimali. La sede è sempre tra le zone servite (etichetta con `origine: "sede"`), quindi nessuna SERP fuori
  zona. Zoom `17z` (default documentato) finché il test 3 della ricerca non sceglie (Calibrazione C3).
- **Tetti rigidi**: ≤ 5 query × 5 punti = 25 SERP + 1 SERP col nome (solo società, solo se il cliente non è tra gli item); ≤ 10 My
  Business Info di competitor + 1 del cliente; saldo (`user_data`) ≥ 2 × stima prima di spendere.

### 2.5 Costo per cliente

| Voce | Chiamate | Live |
|---|---|---|
| Schede della zona | 25 SERP | 0,050 $ |
| Dettaglio dei primi competitor | 10 | 0,054 $ |
| Scheda del cliente (SERP col nome solo per società non trovate + dettaglio) | 1-2 | 0,005-0,007 $ |
| **Prima preparazione** | 36-37 | **≈ 0,11 $** |
| Nuova preparazione entro 14 giorni | 0 (cache) | 0 $ |
| Anno, aggiornamento trimestrale | — | ≈ 0,44 $ |
| Senza chiavi · zone non usabili | 0 | 0 $ |

Quota Max: da 2 (scrittura + critico) a 7 fasi `claude -p` a preparazione, **zero** quando gli ingressi della descrizione non sono
cambiati (§6.5). Costo reale dal campo `cost`, una riga per chiamata pagata in `traffico/costi.ndjson` con `lavoro: "scheda"`.

### 2.6 Link del sito

Homepage con `?utm_source=google&utm_medium=organic&utm_campaign=gbp` (ricerca §6.3: default per sede singola; la pagina servizio
richiede dati Search Console che G1 non ha). Controllo HTTP dal Mac: `fetch` con `redirect: "manual"`, al massimo 3 salti sullo
stesso host, timeout 10 s, User-Agent identificativo; esito finale 200, nessun salto verso altro dominio, UTM ancora presenti.
Link «preventivo» solo se il sito ha il form (`ContactCTA` con `showForm: true` in `site.json`): stessa URL con `#contatti`.

### 2.7 Conservazione (ricerca §7.1, lettura stretta)

In `scheda-consigliata.json` solo artefatti nostri: `consigliato`, `copiaIncolla`, `motivo`, conteggi e punteggi calcolati da
DataForSEO (non soggetto alla policy Business Profile), identificativi pubblici (`cid`, `place_id`, `gcid`). Il valore **attuale**
della scheda del cliente non si salva: `confronto` registra solo l'esito (`uguale` / `diverso` / `assente`) e la fonte. Nessun
confronto tra clienti su dati API; il gate di similarità della descrizione legge solo descrizioni nostre.

## 3. Flusso dei dati

```
contesto.json (verificato) ─┐
brief.json · raw-submission ┤                                        ┌─ categorie (§4) ──┐
zone servite (lib/zone-     ┤  1 Controllo dei dati                  │                   │
  servite.ts, T3) ──────────┤  2 Schede della zona ─── Maps SERP ────┤                   ├─ servizi (§5)
lavori.json · logo ─────────┤  3 La scheda del cliente               │                   │
traffico/mappa-query.json ──┤  4 Dettaglio delle schede ─ MBI ───────┘                   │
copy.json · copy-coverage ──┤  5 Categorie e servizi (puro) ─────────────────────────────┤
site.json · client.json ────┤  6 gbp-description-writer ─┐                               │
T6a comuni-fatti.json ──────┤  7 Controlli sulla descrizione ◄─ gate (§6.3)              ├─ descrizione (§6)
lib/scheda-categorie.json ──┤  8 gbp-description-critic (round n) ─► 9 correzioni ─┘     │
lib/mappa-lessico.json ─────┘ 10 Scrittura della scheda ◄── orari · area servita · telefono · sito/UTM · social
                                                            · chat · link · foto · piano di inserimento
                                                            └─► traffico/scheda-consigliata.json (Zod)
```

Ogni ingresso è letto una volta dalla route prima di avviare (snapshot) e il suo sha entra in `ingressi`: ciò che cambia durante
il lavoro vale alla preparazione successiva («Da aggiornare», §8).

**Regole per campo (deterministiche, funzioni pure in `lib/scheda-consigliata.ts`):**

| Campo | Fonte ammessa | Regola | Senza fonte |
|---|---|---|---|
| Nome | `brief.azienda` | `solo-controllo`, `consigliato: null`; `confronto` col titolo della scheda pubblica del cliente (normalizzati con `normAlnum`, con e senza forma giuridica); se il titolo pubblico contiene una testa del lessico o un comune: `rischio: "sospensione"` e motivo | — |
| Categorie | §4 | §4 | mai vuota: dizionario |
| Servizi | `contesto.servizi_atomizzati` | §5 | — |
| Descrizione | §6 | §6 | `null` se i gate non passano, in `mancanti` |
| Orari | orari del form lead importato (campo scelto da Mattia, verificato in M0; fonte `lead` col puntatore al campo) | fasce → `{giorno 1..7, apre, chiude}` ordinate; nessuna fascia inventata né completata; gli orari «in cui risponde al telefono», se diversi, solo nel motivo (dubbio 1) | `null` · «da completare: gli orari arrivano dal form lead» (lead senza il campo, lead Tally o campo vuoto) |
| Orari speciali | — | nessuna fonte in G1 | `null`, non elencata tra i mancanti |
| Area servita | zone servite via `zoneUsabili` (T3) | §3.1; **massimo 20** (limite Google); `indirizzoVisibile: null` (nessuna fonte dice se riceve clienti in sede) | `null` · il `motivo` di `zoneUsabili` («Zone servite da impostare nel dettaglio Traffico», …) |
| Indirizzo visibile · pin | — | `null` in G1 (nessuna fonte su ricevimento in sede) | in `mancanti`: «chiedi al cliente se riceve in sede: se no, l'indirizzo va nascosto» |
| Telefono | `brief.telefono` (numero dell'attività) | E.164 `+39…`; `copiaIncolla` nel formato nazionale del sito | `null` |
| Sito | `client.steps.build.deploy.dominio` | §2.6 | `null` · «il sito non è pubblicato col suo dominio» |
| Data di apertura | `brief.anno_inizio` | `{anno}` se 1900 ≤ anno ≤ anno corrente | `null` |
| Social | `brief.social` | una voce per piattaforma nota, URL assoluto https | `[]` |
| Chat | `brief.ricontatto_preferito` contiene «WhatsApp» e `promesse_consentite` lo ammette | `{tipo: "whatsapp", valore: telefono}` | `null` |
| Link azione | `site.json` con form | §2.6 | `[]` |
| Attributi | — | nessuna fonte del cliente in modalità pubblica | `[]` · «disponibili per categoria solo con l'accesso API (ricerca §8.3, chiamata 1)» |
| Foto | `lavori.json` → `img/lavoro-N.jpg`; logo fornito (`logo/fornito-*.png`) o generato e verificato (`mark.png`) | §5.3 | `[]` · «nessuna foto reale» |

### 3.1 Area servita (`areaScheda(zone, dati)`, pura)

Regola della decisione T3 punto 12: province e regioni intere dove l'etichetta del cliente è larga, comuni dove è precisa.

1. Aree = `areeServite(zone)` (ordine delle etichette, la sede per prima). `italia` → la regione della sede
   (`regioneDiSigla(zone.sede.sigla)`) con avviso «Google chiede un'area servita entro circa 2 ore dalla sede: "Tutta Italia" diventa
   la regione della sede» (dubbio 2); senza sede → voce `null`.
2. Voci primarie, una per area: `regione` → la regione; `provincia` → la provincia, tolta se la sua regione è già in elenco;
   `comune` e il centro di `dintorni` → il comune, tolto se la sua provincia o la sua regione sono già in elenco.
3. Riempimento (dubbio 3): per ogni `dintorni`, i comuni di `comuniEntroKm(codice, raggioKm)` non coperti da una voce, per `km` crescente e poi
   nome, dopo tutte le voci primarie.
4. Taglio a **20**: se le voci primarie superano 20, restano la sede e i comuni più vicini (`comuniServiti(...).kmDallaSede`),
   province e regioni prima dei comuni; gli esclusi si contano nel motivo («5 comuni oltre il limite di 20 di Google, i più
   lontani dalla sede»). Nessuna area fuori dalle zone servite.
5. `copiaIncolla` per voce = il nome da cercare nel campo di Google: comune → `nome`; provincia → «Provincia di `nome`»; regione →
   `nomeBreveRegione(nome)`. Il motivo cita le etichette del cliente («dal form lead: "Monza e provincia"»), fonte
   `zone-servite` con `rif` `traffico/zone-servite.json#/etichette/<i>` (zone confermate) o `raw-submission.json#/risposte/zone/<i>`
   (proposta riconosciuta).

## 4. Algoritmo delle categorie

### 4.1 Dizionario `site-factory-editor/lib/scheda-categorie.json` (versionato, sha nella scheda)

```jsonc
{
  "versione": "2026-09-a",
  "fonti": ["ricerca-scheda-google §4.4 (GCID PlePer, nomi IT fabriziodelrio, abbinamento da confermare)"],
  "primariaDiSettore": { "edilizia": "general_contractor" },
  "categorie": [
    { "gcid": "general_contractor", "nome": "Impresa edile", "nomeStato": "da-confermare",
      "tipo": "mestiere", "settori": ["edilizia"], "specificita": 1,
      "prove": [["costruz"], ["edil"], ["chiavi", "mano"]] },
    { "gcid": "bathroom_remodeler", "nome": "Ristrutturatore di bagni", "nomeStato": "da-confermare",
      "tipo": "specialita", "settori": ["edilizia"], "specificita": 3, "prove": [["ristruttur", "bagn"]] },
    { "gcid": "plumber", "nome": "Idraulico", "nomeStato": "da-confermare",
      "tipo": "mestiere", "settori": ["idraulica"], "specificita": 2, "prove": [["idraulic"]] }
    // … tutte le righe della tabella §4.4 della ricerca (26 GCID), niente altro
  ]
}
```

- `prove`: ogni elemento è una lista di prefissi che devono comparire **tutti** come inizio di parola nel nome normalizzato di un
  servizio (NFKD, minuscolo, senza accenti e apostrofi): stesso abbinamento del lessico di T4.
- `nomeStato`: `da-confermare` (tabella §4.4) · `osservato-dataforseo` (allineato in calibrazione, §4.2 passo 4) · `confermato`
  (a vista nell'interfaccia o con `batchGet`). Si aggiorna solo a mano, con sha nuovo e «Da aggiornare» sulle schede.
- **Solo le categorie del dizionario si propongono.** Un `category_id` dei competitor fuori dizionario finisce in
  `ricercaCategorie.fuoriDizionario` (con il nome italiano osservato, se allineabile, e il numero di schede): è lavoro di curatela,
  mai una proposta. Filtra anche i tipi Maps non selezionabili (`monument`, `tourist_attraction`).

### 4.2 Passi

1. **Raccolta.** Per ogni query `q` (peso `w_q`) e punto `p` (`n_p` punti): SERP Maps (§2.2). Item validi: `type = maps_search`,
   `cid` presente, `category_ids` non vuoto.
2. **Cliente e omonimi.** Il cliente è l'item con `domain` (senza `www.`) = dominio del cliente, oppure `soloCifre(phone)` senza
   `39` iniziale = telefono del brief, oppure `cid` = `cid` della scheda del cliente (trovata così, §2.2): escluso. Un item con
   titolo normalizzato uguale al nome del cliente ma senza telefono né dominio uguali resta competitor e genera l'avviso «Una
   scheda con lo stesso nome del cliente ma telefono e sito diversi: omonimo o duplicato, controllala» (con `check_url`, senza nome).
   Nessuna identificazione per solo nome.
3. **Deduplica e peso.** Per ogni SERP un `cid` conta una volta (miglior rank). `k_i = 0,5` se il titolo, tolta la forma giuridica
   (`senzaFormaGiuridica`), contiene per intero la testa della query o il nome del comune della sede; altrimenti 1 (ricerca §4.2
   passo 2, da calibrare).
4. **Primaria e aggiuntive del competitor.** `c_i0 = category_ids[0]` è la primaria; il resto sono aggiuntive [inferenza: da
   provare col test 1]. Se `category_ids.length = 1 + additional_categories.length`, l'indice allinea GCID e nome italiano
   osservato (`category` per il primo, `additional_categories[j-1]` per gli altri); altrimenti nessun nome osservato.
5. **Punteggi** (arrotondati a 2 decimali):

   ```
   R(r)      = 1 se r ≤ 3 · 0,5 se 4 ≤ r ≤ 10 · 0,1 se r > 10              (r = rank_absolute)
   w_q       = con mappa: max(0,2, V_q), V_q = min(1, log10(1+vol)/log10(1001)), vol = volume della riga
               senza_comune · base della testa nella mappa T4 (null → 0,2) · senza mappa: 1
   S_prim(g) = (1/n_p) · Σ_q w_q · Σ_p Σ_{i : c_i0 = g} R(r_i) · k_i
   S_agg(g)  = (1/n_p) · Σ_q w_q · Σ_p Σ_{i : g ∈ category_ids_i, g ≠ c_i0} R(r_i) · k_i
   S(g)      = S_prim(g) + S_agg(g)
   nSchede(g) = |{cid : g ∈ category_ids}|   ·   nTop3(g) = |{cid : r ≤ 3 in almeno una SERP e g ∈ category_ids}|
   competitorDistinti = |{cid}|   ·   datiInsufficienti = competitorDistinti < 5 o zona non letta
   ```

6. **Test «È».** Per ogni `g` del dizionario:
   - **passa** se almeno un servizio reale del cliente (`contesto.servizi_atomizzati`) soddisfa una `prova` di `g`
     **e** `settore_normalizzato` (minuscolo) ∈ `g.settori`; il servizio che lo prova è `servizioReale`, la card del sito da
     `copy-coverage.json` entra nel motivo («sul sito: card "Ristrutturazioni e manutenzioni"»), la sua assenza è un avviso;
   - **da decidere** se la prova c'è ma il settore no (mestiere altrui: «l'impresa fa Impianti idraulici: è anche un idraulico?»):
     va in `categorieDaDecidere`, mai tra le voci;
   - **scartata** senza prova, anche con punteggio alto (motivo registrato solo per le categorie osservate nella zona).
7. **Primaria.** Servizio principale: nessuna priorità dichiarata dal cliente (T3 punto 13); con la mappa T4 è il servizio della
   target col volume più alto, senza mappa nessuno. Cluster `Q*` = query la cui testa copre il servizio principale ∪ query di
   mestiere; `S*_prim` = `S_prim` calcolato su `Q*`. Candidate `K` = categorie che passano con
   `tipo = "mestiere"`, più quelle la cui prova è il servizio principale.
   - Con dati sufficienti: `argmax_{g∈K} S*_prim(g)`; parità (differenza < 0,01) → `specificita` maggiore → `nSchede` → `gcid`.
   - Con dati insufficienti: `primariaDiSettore` se ∈ K; altrimenti la candidata con più servizi che la provano → `specificita` →
     `gcid`. Motivo: «Scelta dai servizi: nella zona solo N schede lette» o il perché della zona non letta; senza chiavi anche «da
     confermare coi concorrenti» (decisione G1 punto 2).
8. **Primaria attuale diversa** (dalla scheda pubblica del cliente, se identificata): se l'attuale `a` passa il test «È» → si
   consiglia `a` (`azione: "conferma"`) e la candidata va nel motivo; se `a` non passa e `S*_prim(candidata) ≥ 1,5 · S*_prim(a)` →
   `azione: "modifica"`, `rischio: "riverifica"`, ultimo giorno del piano; se `a` non passa e la soglia non è raggiunta →
   `azione: "solo-controllo"` con «la categoria attuale non trova prova nei servizi: da valutare con il cliente» (ricerca §4.2 passo 7).
9. **Aggiuntive.** Tutte le categorie che passano, tolta la primaria, ordinate per `S` → `nSchede` → `specificita` → `gcid`;
   **massimo 9**. Le eccedenti vanno in `categorieDaDecidere` con «oltre il limite di 9 di Google». Punteggio zero ammesso
   (mestiere vero assente tra i competitor); nessun obiettivo numerico.
10. **Uscita per categoria**: `gcid`, nome (osservato su DataForSEO se allineato, altrimenti del dizionario, con `nomeStato`),
    `score`, `servizioReale`, motivo con fatti («In 7 schede su 23 della zona, 3 volte tra le prime 3, per "impresa edile" e
    "ristrutturazione bagno"»), fonti `dizionario` + `contesto` + `dataforseo` (`rif: "maps:<sha richiesta>"`).

### 4.3 Limiti dichiarati (in UI e nel motivo)

Correlazione, non causa; SERP per coordinata non confrontata con un telefono vero; zoom non tarato (fino a C3 i punteggi sono
«non ripetibili tra zoom diversi»); `category_ids[0]` = primaria da provare (test 1); nessun dato italiano né sull'edilizia; nei comuni
piccoli meno di 5 schede → dati insufficienti; nomi italiani da confermare finché non c'è `batchGet`.

## 5. Servizi, keyword e foto

### 5.1 Servizi

1. Ordine: quello di `macro_categorie` e, dentro ogni macro, di `servizi_atomizzati` (nessuna priorità dichiarata: T3 punto 13).
2. Categoria: la prima tra primaria e aggiuntive (in ordine) con una prova che copre il servizio; altrimenti la primaria («nessuna
   categoria specifica: sotto la principale»).
3. Nome = `servizio` del contesto, così com'è. **Mai** città, sinonimi, prezzi o slogan aggiunti. Gate `servizi-nome`: ≤ 140
   caratteri; niente cifre seguite da €, telefoni, email, URL, emoji, nomi dei comuni del dataset T6a; fallito → servizio escluso con
   avviso (il contesto è già curato: atteso zero).
4. Campo `servizio-personalizzato` sempre (nessun catalogo IT dei predefiniti in modalità pubblica). Se un titolo di `services[]`
   compare **identico** in ≥ 3 schede di competitor e il lessico T4 lo abbina allo stesso gruppo del servizio, il motivo aggiunge
   «nome usato identico da N schede della zona: forse è un servizio predefinito, cercalo tra le proposte di Google» [inferenza].
5. Keyword: `ricerca` = testa primaria del lessico per quel servizio, con il volume alla sede se c'è la mappa («ristrutturazione
   bagno · 90 al mese a Cologno»). È informazione per Mattia, non entra nel nome: un servizio = una ricerca principale.
6. Nessun prezzo (T3 punto 13: non si chiede, mai stimato).
7. Descrizione del singolo servizio (≤ 300): **non generata** in G1 (decisione G1 punto 6).
8. `id` = `servizio:<kebab del nome>`, unico; `rischio: "rifiuto"`; `core: false`.

### 5.2 Nome, telefono, sito: nessuna ottimizzazione

Il software non propone nomi (ricerca §5.4), non aggiunge numeri, non sceglie pagine diverse dalla homepage (§2.6).

### 5.3 Foto

1. Candidate: le foto di `lavori.json` (`img/lavoro-N.jpg`). Mai `hero.jpg`, `card-*.jpg`, `mark*.svg` o immagini generate.
2. Gate `foto-formato` (limiti Google): JPG o PNG, 10 KB-5 MB, lato minimo ≥ 250 px (misure con `sips -g`); fuori limite → esclusa
   col motivo.
3. Ordine: quello di `lavori.json` (l'ordine del form; nessun servizio, comune o anno per foto). Massimo **10** (regola nostra: un
   primo caricamento, non un archivio). Il motivo usa `caption` se c'è.
4. `copertina` = la prima orizzontale (larghezza ≥ altezza), le altre `lavoro`. Logo (`tipo: "logo"`, decisione G1 punto 5): il
   file fornito dal cliente (`logo/fornito-*.png`, il più recente) oppure `mark.png` se la riga Logo è `verificato`; quadrato o
   quasi, ≥ 250 px; mai un logo non approvato.
5. Nessun testo sovrapposto, nessun geotag: i file sono già senza EXIF né GPS (import del form lead).

## 6. Descrizione

### 6.1 Due skill, stile del progetto

- **`.claude/skills/gbp-description-writer/SKILL.md`** — scrive la descrizione.
  - Ruolo: descrizione della scheda Google di un'impresa locale, 3-4 frasi, ≤ 750 caratteri; non è copy del sito né marketing.
  - Input: **solo** `out/<slug>/traffico/descrizione-ingressi.json`, composto dal lavoro (§6.2): ogni fatto ha un `id`.
  - Struttura (ricerca §5.2): (1) chi è e cosa fa: mestiere + zona reale; (2) 2-4 servizi principali con le loro parole; (3) cosa
    distingue, solo con prova (punti di forza, anno di inizio se non vietato); (4) come si lavora: cortesia di settore
    ammessa (preventivo o sopralluogo gratuito, senza impegno).
  - Regole: prima persona plurale, registro dal `tono`; ogni frase cita gli `id` dei fatti che usa; niente frasi sul lettore;
    niente URL, telefoni, email, prezzi, promozioni, superlativi, recensioni; ogni servizio nominato una volta; al massimo 2 nomi di
    luogo, mai elenchi di comuni; martello rifratto, mai verbatim; nessuna frase del sito (`frasiSito`); `promesse_vietate` è legge;
    frasi bandite di `../copy-critic/references/frasi-bandite.json` anche parafrasate; auto-check prima di consegnare (test di
    intercambiabilità, test delle fonti, conteggio caratteri).
  - Output: scrive SOLO `out/<slug>/traffico/descrizione-bozza.json` =
    `{"testo": "…", "frasi": [{"testo": "…", "fatti": ["servizi.0", "zona.sede"], "tipo": "fatto" | "cortesia"}]}`.
  - Modalità correzione (findings del gate o del critico nel prompt): riscrive SOLO le frasi citate. Modalità aggiornamento
    (ingressi cambiati, descrizione approvata precedente nel prompt): tiene ciò che è ancora vero, cambia solo ciò che dipende dai
    fatti cambiati.
- **`.claude/skills/gbp-description-critic/SKILL.md`** — giudica, non riscrive. Stessa licenza di promuovere e stesse regole di
  ancoraggio di `copy-critic` (frase verbatim, dimensione, problema, fix).

### 6.2 `traffico/descrizione-ingressi.json` (composto da `componiIngressi`, puro)

`{ versione: 1, nome, mestiere (nome IT della primaria), altreCategorie (≤ 3 nomi), sede, area (≤ 3 nomi pubblici delle aree
larghe di `areeServite` con `etichettaArea`, se le zone sono usabili; altrimenti contesto.zona.area_intervento), servizi (≤ 4: il
primo di ogni macro), puntiDiForza[], annoInizio | null, cortesie (promesse_consentite), promesseVietate, martello, tono, frasiSito
(titoli e sottotitoli di copy.json), precedente: { testo, approvataAt } | null }`. Ogni fatto è `{ id, testo, rif }` con `rif` al
campo d'origine (`contesto.json#/punti_di_forza/2`, `traffico/zone-servite.json#/etichette/1`, `brief.json#/anno_inizio`). `ingressiSha` = sha256 della
serializzazione canonica senza `precedente`.

### 6.3 Gate deterministici (`gateDescrizione(bozza, ingressi, altri)`, puri)

| id | Regola | FAIL se |
|---|---|---|
| `descrizione-lunghezza` | ≤ 750 caratteri (code point, spazi inclusi); sotto 250 solo avviso | > 750 |
| `descrizione-link` | nessun URL, dominio, HTML | `/https?:\/\/|www\.|\b[\w-]+\.(it|com|eu|net|org|info|biz)\b|<[^>]+>/i` |
| `descrizione-contatti` | niente telefoni né email | tolti spazi, punti, trattini e parentesi, una sequenza di ≥ 8 cifre (anche con `+39`), oppure un'email |
| `descrizione-promo` | niente promozioni e prezzi | `€`, `%`, `\bsconto`, `\bprezz`, `\bpromo`, `\bgratis\b`, `in offerta`, `offerta (speciale|limitata|valida)` («offerta completa» passa) |
| `descrizione-keyword` | densità | un servizio di `ingressi.servizi` nominato > 1 volta; nomi di luogo > 2 in tutto; ≥ 3 comuni distinti del dataset T6a; nome del cliente > 2 |
| `descrizione-ripetizioni` | anti-ripetizione interna | una sequenza di 3 parole con almeno 2 non vuote (stop-list di `check-slop`) ripetuta, esclusi nome e luoghi |
| `descrizione-copia-sito` | nessuna frase riusata | 6 parole normalizzate consecutive in comune con un testo di `copy.json` del cliente o con la descrizione nella `scheda-consigliata.json` di un altro cliente dello stesso `settore_normalizzato` |
| `descrizione-fonti` | tracciabilità | una frase senza `fatti`, un `id` inesistente, o le frasi unite (spazi normalizzati) ≠ `testo` |
| `descrizione-numeri` | numeri con fonte | un numero del testo assente dai testi dei fatti citati da quella frase |
| `descrizione-claim` | claim ad alto rischio | una radice di `CLAIM_RISCHIO` (`esperienz`, `decenn`, `storic`, `affermat`, `leader`, `miglior`, `n\.?\s?1`, `numero uno`, `garanz`, `garantit`, `certificat`, `assicurat`, `polizz`, `24\s?\/\s?7`, `24 ore`, `entro \d+ ore`, `puntual`, `nei tempi`, `bonus`, `detrazion`, `sconto in fattura`, `cessione del credito`, `qualit`, `prima scelta`, `soddisf`) presente nella frase e assente dai testi dei fatti che la frase cita |
| `descrizione-vietate` | promesse vietate (decisione G1 punto 9) | una radice di `CLAIM_RISCHIO` presente nella descrizione e in un testo di `promesse_vietate` del contesto |
| `descrizione-slop` | frasi bandite | `check-slop.mjs --json` su `{"descrizione": testo}` (file temporaneo in `traffico/`, `--consenti` nome e sede) ha bloccanti |

Casi del banco (§12): falliscono «Visita cavalierebuild.it», «www.…», «chiamaci al 02 1234 5678», «+39 333 123 4567», un'email,
«sconto del 10%», «Ristrutturazione bagni» due volte, «a Cologno Monzese, Monza e Brugherio», una sequenza di 3 parole ripetuta, 751
caratteri, una frase senza `fatti`, «15 anni di lavori» senza un fatto con 15, «garanzia di 10 anni», «impresa leader in zona»,
«materiali di qualità», 6 parole del titolo hero di `copy.json`, una bozza le cui frasi non ricompongono il testo, «esperienza»
citata da un punto di forza ma presente in `promesse_vietate` (`descrizione-vietate`). Passano: una
descrizione di 600 caratteri con tutte le frasi citate; «sopralluogo gratuito e senza impegno» con fatto `cortesie.0`; «un'offerta
completa» con il punto di forza che la contiene; «attivi dal 2026» con `annoInizio`; «Cologno Monzese» due volte.

### 6.4 Rubrica del critico (0 bocciatura · 1 debole · 2 pieno)

| Dim. | Cosa | 2 | 0 |
|---|---|---|---|
| D1 Fonte | ogni affermazione è un fatto degli ingressi o una cortesia | tutto tracciabile | un fatto inventato, anche parafrasato, o una `promessa_vietata` |
| D2 Specificità | test di intercambiabilità tra imprese dello stesso mestiere | vera solo per questo cliente (servizi, zona, punti di forza) | potrebbe stare su qualunque scheda |
| D3 Struttura | le 4 mosse di §6.1 nell'ordine, chi + cosa + dove nella prima frase | complete e in ordine | prima frase senza mestiere o senza zona |
| D4 Lingua | italiano detto da una persona; niente tono da AI (tricolon riempitivi, «inoltre/infine», aggettivi vuoti, lineette) | naturale | errori, refusi, frasi da brochure generata |
| D5 Keyword naturale | servizi e zona detti come li direbbe il titolare; stuffing semantico che il gate non vede (sinonimi in fila, zona ripetuta per perifrasi) | nessuna forzatura | elenco di parole chiave travestito da frase |
| D6 Tono e coerenza | registro del `tono`, martello rifratto, nessuna contraddizione col sito | coerente | contraddice il sito o il tono |

Bloccanti automatici: fonte 3; `promesse_vietate`; recensioni o numeri non negli ingressi; frase bandita parafrasata; residui
d'inglese o refusi. Verdetto **FAIL** con un bloccante, una dimensione a 0 o due a 1. Output: SOLO
`out/<slug>/traffico/descrizione-review.json` = `{"verdict": "PASS"|"FAIL", "round": n, "findings": [{"rubrica": "D1".."D6",
"gravita": "bloccante"|"minore", "frase": "<verbatim>", "problema": "…", "fix": "…"}]}` (forma di `CopyReviewSchema` senza `slot`).

### 6.5 Ciclo e cache

1. Se `ingressiSha` = `redazione.ingressiSha` e la voce descrizione esiste con i gate PASS → nessuna fase `claude -p`
   («Descrizione: ingressi invariati, resta quella del gg/mm»); approvazione e modifica di Mattia restano.
2. Altrimenti: scrittura → gate; FAIL → correzioni del gate (al massimo 2) → critico round 1 → FAIL → correzioni (round 1) → gate →
   critico round 2 … **massimo 3 round del critico**. Al terzo FAIL la descrizione arriva comunque con `verdetto: "FAIL"` e i rilievi
   visibili (decide Mattia). Gate ancora FAIL dopo le correzioni → `descrizione: null`, gate nel file, voce in `mancanti`.
3. Fasi: timeout 5 min, `maxTurns` 15; strumenti ammessi `Read`, `Skill`, `Write`; vietati `WebSearch`, `WebFetch`, `Bash`, `Edit`,
   `Task` (costanti locali in `scheda-lavoro.ts`: *ponytail: doppione di `lib/steps.ts`, che i piani Traffico non toccano*).
4. Record delle fasi con `makeSink(rollClientRecords(out/<slug>/traffico/logs/scheda, 10))` come gli step cliente.
5. Approvazione: `redazione.approvataAt`. Modifica di Mattia (decisione G1 punto 9): gate `lunghezza`, `link`, `contatti`,
   `promo`, `keyword`, `ripetizioni`, `copia-sito`, `vietate`, `slop` (non quelli che richiedono i fatti per frase); salta solo il
   critico; fonte `mattia`; salvare = approvare.

## 7. Schema Zod di `scheda-consigliata.json` (`lib/scheda-consigliata.ts`)

Coerente con ricerca §9. Scostamenti dichiarati: voci **nullable** quando manca la fonte (con `mancanti`), perché «voce senza fonte =
file non valido»; fonti `lead` (brief.json, raw-submission.json), `zone-servite` e `dizionario`; foto con `file` relativo a
`out/<slug>` al posto di `fileDrive`; area servita come aree (comune, provincia, regione) al posto dei soli comuni; `indirizzoVisibile`
nullable; blocchi `regole`, `ingressi`, `redazione`, `categorieDaDecidere`, `mancanti`, `avvisi`; `ricercaCategorie` estesa;
`giorno: 0` = niente da inserire; servizi senza `descrizione` né prezzo.

```ts
import { z } from "zod";

export const VERSIONE_REGOLE_SCHEDA = "2026-09-a";
const Sha = z.string().regex(/^[a-f0-9]{64}$/);
const Iso = z.string().datetime();
const Data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Gcid = z.string().regex(/^[a-z0-9_]+$/).max(80);
const Ora = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/);
const Tel = z.string().regex(/^\+39\d{6,11}$/);

export const Grado = z.enum(["fatto", "settore", "contestato"]);
export const Rischio = z.enum(["basso", "rifiuto", "riverifica", "sospensione"]);
export const Stato = z.enum(["da-fare", "fatto", "in-revisione", "verificato", "rifiutato", "divergente", "scartato"]);
export const Azione = z.enum(["aggiungi", "modifica", "rimuovi", "conferma", "solo-controllo"]);
export const CAMPI = ["nome", "categoria-primaria", "categoria-aggiuntiva", "servizio-predefinito", "servizio-personalizzato",
  "descrizione", "orari", "orari-speciali", "area-servita", "indirizzo-visibile", "telefono", "sito", "attributo",
  "data-apertura", "social", "chat", "link-azione", "pin", "foto"] as const;
export const Campo = z.enum(CAMPI);
export const CORE: readonly (typeof CAMPI)[number][] = ["nome", "categoria-primaria", "indirizzo-visibile", "telefono", "sito"];

export const Fonte = z.object({
  tipo: z.enum(["contesto", "zone-servite", "lead", "sito", "dizionario", "api-gbp", "dataforseo", "google-ads", "pleper",
    "fabriziodelrio", "gbp-latlng", "geocoding-indirizzo", "places", "policy", "mattia"]),
  rif: z.string().min(1).max(300),     // puntatore, mai un valore: "contesto.json#/servizi_atomizzati/3", "maps:<sha>"
  lettoAt: Iso,
}).strict().refine((f) => f.tipo !== "api-gbp" || /^(BI|PERF|V4|VER|PA) [\w.:/{}-]+@\d{4}-\d{2}-\d{2}/.test(f.rif),
  { message: "fonte api-gbp: rif deve essere «<host> <endpoint>@<data>»" });

const Evidenza = z.object({ grado: Grado, url: z.string().url() }).strict();

const voce = <C extends z.ZodTypeAny, T extends z.ZodTypeAny>(campo: C, valore: T) => z.object({
  id: z.string().regex(/^[a-z0-9-]+(:[a-z0-9_-]+)?$/).max(120),
  campo,
  consigliato: valore.nullable(),
  azione: Azione,
  confronto: z.object({ esito: z.enum(["uguale", "diverso", "assente"]), confrontatoAt: Iso,
    fonte: z.enum(["dataforseo", "api-gbp"]) }).strict().optional(),
  motivo: z.string().min(1).max(400),
  evidenza: z.array(Evidenza),
  fonti: z.array(Fonte).min(1),
  rischio: Rischio,
  core: z.boolean(),
  giorno: z.number().int().min(0).max(60),
  copiaIncolla: z.string().max(750),
  stato: Stato,
  fattoAt: Iso.optional(), fattoDa: z.literal("mattia").optional(),
  inRevisioneDal: Iso.optional(), verificatoAt: Iso.optional(),
  noteMattia: z.string().max(500).optional(),
}).strict().superRefine((v, ctx) => {
  const vuota = v.azione === "rimuovi" || v.azione === "solo-controllo";
  if ((v.consigliato === null) !== vuota) ctx.addIssue({ code: "custom", message: "consigliato null ⇔ azione rimuovi/solo-controllo" });
  if ((v.copiaIncolla === "") !== (v.consigliato === null)) ctx.addIssue({ code: "custom", message: "copiaIncolla vuoto ⇔ consigliato null" });
  if ((v.giorno === 0) !== (v.azione === "conferma" || v.azione === "solo-controllo")) ctx.addIssue({ code: "custom", message: "giorno 0 ⇔ niente da inserire" });
  if (v.core !== CORE.includes(v.campo)) ctx.addIssue({ code: "custom", message: "core non coerente col campo" });
});

const Categoria = z.object({ gcid: Gcid, nome: z.string().min(1).max(100),
  nomeStato: z.enum(["da-confermare", "osservato-dataforseo", "confermato"]), score: z.number().min(0) }).strict();
const Servizio = z.object({
  serviceTypeId: z.string().regex(/^job_type_id:[a-z0-9_]+$/).optional(),   // solo in modalità api
  categoria: Gcid, nome: z.string().min(1).max(140), ricerca: z.string().max(80).optional(),
}).strict();
const Foto = z.object({
  file: z.string().regex(/^(img\/lavoro-\d+\.jpg|logo\/fornito-[\w.-]+\.png|mark\.png)$/),
  tipo: z.enum(["copertina", "logo", "lavoro", "team", "esterno"]),
  larghezza: z.number().int().min(250), altezza: z.number().int().min(250),
  bytes: z.number().int().min(10_000).max(5_000_000),
}).strict();

export const SchedaConsigliataSchema = z.object({
  versione: z.literal(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  generataAt: Iso,
  modalita: z.enum(["pubblica", "api"]),
  regole: z.object({ versione: z.string(), dizionarioSha: Sha, lessicoSha: Sha.nullable() }).strict(),
  ingressi: z.object({ contestoSha: Sha, briefSha: Sha, leadSha: Sha.nullable(),   // raw-submission.json (orari)
    zoneSha: Sha.nullable(),    // sha di `zone` restituite da zoneUsabili (confermate o proposta), null se non usabili
    lavoriSha: Sha.nullable(), logoSha: Sha.nullable(),
    mappaSha: Sha.nullable(), copySha: Sha.nullable(), coverageSha: Sha.nullable(), siteSha: Sha.nullable(),
    dominio: z.string().nullable(), registrate: z.boolean() }).strict(),
  scheda: z.object({ cid: z.string().regex(/^\d{1,25}$/).optional(), placeId: z.string().max(200).optional(),
    locationName: z.string().regex(/^locations\/\d+$/).optional(), mapsUri: z.string().url().optional(),
    identita: z.enum(["telefono", "dominio"]).optional() }).strict(),
  eventi: z.array(z.object({ tipo: z.enum(["sospensione-rilevata", "disattivazione-rilevata", "verifica-rilevata",
    "modifica-google-rilevata"]), at: Iso }).strict()).max(200),   // G1 non ne scrive: li aggiunge G3
  voci: z.object({
    nome: voce(z.literal("nome"), z.string()),
    categoriaPrimaria: voce(z.literal("categoria-primaria"), Categoria),
    categorieAggiuntive: z.array(voce(z.literal("categoria-aggiuntiva"), Categoria.extend({ servizioReale: z.string().min(1).max(120) }).strict())).max(9),
    servizi: z.array(voce(z.enum(["servizio-predefinito", "servizio-personalizzato"]), Servizio)).max(60),
    descrizione: voce(z.literal("descrizione"), z.string().min(1).max(750)).nullable(),
    orari: voce(z.literal("orari"), z.array(z.object({ giorno: z.number().int().min(1).max(7), apre: Ora, chiude: Ora }).strict()).min(1).max(14)).nullable(),
    orariSpeciali: voce(z.literal("orari-speciali"), z.array(z.object({ data: Data, chiuso: z.boolean(), apre: Ora.optional(), chiude: Ora.optional() }).strict()).max(6)).nullable(),
    areaServita: voce(z.literal("area-servita"), z.object({ aree: z.array(z.object({
      tipo: z.enum(["comune", "provincia", "regione"]), codice: z.string().regex(/^(\d{2}|\d{3}|\d{6})$/),
      nome: z.string().min(1), sigla: z.string().regex(/^[A-Z]{2}$/).nullable(), km: z.number().int().min(0).nullable(),
      copiaIncolla: z.string().min(1).max(80), etichetta: z.number().int().min(0) /* indice dell'etichetta del cliente */ }).strict()).min(1).max(20),
      esclusi: z.number().int().min(0), indirizzoVisibile: z.boolean().nullable() }).strict()).nullable(),
    telefono: voce(z.literal("telefono"), z.object({ principale: Tel, aggiuntivi: z.array(Tel).max(2) }).strict()).nullable(),
    sito: voce(z.literal("sito"), z.object({ url: z.string().url().startsWith("https://"), utm: z.string().regex(/^utm_source=google&utm_medium=organic&utm_campaign=gbp$/),
      esitoHttp: z.number().int().optional(), redirectFinale: z.string().url().optional() }).strict()).nullable(),
    attributi: z.array(voce(z.literal("attributo"), z.object({ id: z.string().min(1), nome: z.string().min(1), valore: z.union([z.boolean(), z.array(z.string())]) }).strict())).max(40),
    dataApertura: voce(z.literal("data-apertura"), z.object({ anno: z.number().int().min(1900).max(2100), mese: z.number().int().min(1).max(12).optional() }).strict()).nullable(),
    social: z.array(voce(z.literal("social"), z.object({ piattaforma: z.enum(["facebook", "instagram", "linkedin", "pinterest", "tiktok", "x", "youtube"]),
      url: z.string().url().startsWith("https://"), attributoId: z.string().optional() }).strict())).max(7),
    chat: voce(z.literal("chat"), z.object({ tipo: z.enum(["whatsapp", "sms"]), valore: Tel }).strict()).nullable(),
    linkAzione: z.array(voce(z.literal("link-azione"), z.object({ tipo: z.string().min(1).max(40), url: z.string().url(),
      placeActionType: z.string().optional(), isEditable: z.boolean().optional() }).strict())).max(10),
    pin: voce(z.literal("pin"), z.object({ lat: z.number(), lng: z.number(), fonte: z.enum(["geocoding-indirizzo", "places", "sito-jsonld"]) }).strict()).nullable(),
    foto: z.array(voce(z.literal("foto"), Foto)).max(10),
  }).strict(),
  categorieDaDecidere: z.array(z.object({ gcid: Gcid, nome: z.string(), servizioReale: z.string(),
    motivo: z.string().max(300), score: z.number().min(0) }).strict()).max(30),
  mancanti: z.array(z.object({ campo: Campo, motivo: z.string().max(300), comeAverlo: z.string().max(300) }).strict()).max(20),
  avvisi: z.array(z.string().max(300)).max(30),
  ricercaCategorie: z.object({
    zona: z.enum(["letta", "non-configurata", "zone-non-usabili"]),
    fonteQuery: z.enum(["mappa-query", "lessico", "nessuna"]),
    query: z.array(z.object({ testo: z.string().min(2).max(80), peso: z.number().min(0).max(1),
      checkUrl: z.string().url().nullable() }).strict()).max(5),
    punti: z.number().int().min(0).max(5),
    competitorDistinti: z.number().int().min(0),
    parametri: z.object({ device: z.literal("mobile"), depth: z.literal(20), zoom: z.string().regex(/^\d{1,2}z$/),
      distanzaPuntiKm: z.number().positive() }).strict(),
    datiInsufficienti: z.boolean(),
    fuoriDizionario: z.array(z.object({ gcid: Gcid, nomeOsservato: z.string().max(100).nullable(),
      schede: z.number().int().min(1) }).strict()).max(60),
    eseguitaAt: Iso.nullable(),
    costoUsd: z.number().nonnegative(), chiamatePagate: z.number().int().min(0), dallaCache: z.number().int().min(0),
  }).strict(),
  redazione: z.object({ ingressiSha: Sha, round: z.number().int().min(0).max(3),
    verdetto: z.enum(["PASS", "FAIL", "non-eseguito"]), approvataAt: Iso.optional(),
    modificataDaMattia: z.boolean() }).strict().nullable(),
  gate: z.array(z.object({ id: z.string().min(1), esito: z.enum(["PASS", "FAIL"]), dettaglio: z.string().max(300).optional() }).strict()),
  pianoInserimento: z.array(z.object({ giorno: z.number().int().min(1), voci: z.array(z.string()).min(1) }).strict()),
}).strict().superRefine((s, ctx) => {
  /* 1 gcid unici tra primaria e aggiuntive; id delle voci unici in tutto il file
     2 areaServita: (tipo, codice) unici, nessun comune la cui provincia o regione è in elenco · servizi: nomi normalizzati unici
     3 descrizione: copiaIncolla === consigliato; voce null ⇔ campo "descrizione" in mancanti
     4 ogni voce con azione aggiungi/modifica/rimuovi e stato ≠ scartato compare in UN solo giorno del piano, col suo `giorno`;
       nessun giorno con più di una voce core; giorni consecutivi da 1
     5 modalita "pubblica" ⇒ nessuna fonte api-gbp, nessun serviceTypeId, nessun locationName
     6 zona "letta" ⇔ eseguitaAt ≠ null; zona ≠ "letta" ⇒ chiamatePagate 0, competitorDistinti 0, datiInsufficienti true
     7 redazione null ⇔ descrizione null e nessun round eseguito; approvataAt ⇒ descrizione ≠ null */
});
```

**Rigenerazione e stati di G2** (`unisciStati(precedente, nuova)`, pura): per ogni voce con lo stesso `id` e `consigliato` uguale
(confronto profondo) si riportano `stato`, `fattoAt`, `fattoDa`, `inRevisioneDal`, `verificatoAt`, `noteMattia`; con `consigliato`
cambiato `stato` torna `da-fare` e `noteMattia` resta. G1 scrive sempre `da-fare`.

**Piano di inserimento** (`pianoInserimento`, puro; regola nostra da tarare con G2, ricerca §2.1): voci da inserire raggruppate per
sezione dell'interfaccia nell'ordine categorie aggiuntive → servizi → descrizione → orari → area servita → data di apertura →
social, chat e link → foto; **al massimo 2 sezioni non core al giorno**; poi una voce core per giorno: telefono → sito → categoria
primaria per ultima (una nuova verifica non blocca il resto). Mai modifiche core insieme.

**Evidenza e rischio per campo**: costanti `EVIDENZA` e `RISCHIO` con URL e gradi di ricerca §1-§2 (es. categoria primaria: LSRF
[settore] + help 3039617 [fatto]; rischio `riverifica`), stesse per ogni cliente.

## 8. Lavoro sul run-bus

- **Id** `traffico:<slug>:scheda`, `kind: "traffico"`, `step: "scheda"`, `label` = azienda; eventi in
  `out/<slug>/traffico/logs/run-scheda.ndjson` (tee del bus, riletto da `eventiDaFile`). Avvio `startTrafficoRun(slug, "scheda",
  label, esegui)` (T4); rifiuta solo lo stesso id vivo (Maps SERP: 2.000 chiamate/min, nessun conflitto con la mappa).
- **Ingressi**: la route legge e valida tutto prima di avviare; `motivoBloccoScheda` restituisce la frase o `null`.

| Fase (`phase`) | Cosa fa | Testo tipico |
|---|---|---|
| Controllo dei dati | schema del contesto (verificato), `leggiZoneServite` + `zoneUsabili`, orari del lead, `lavori.json`, mappa, dizionario, lessico; forma giuridica; chiavi (`configurata()`); stima e saldo | «Società · 12 aree servite · 5 ricerche dalla mappa · stima 0,11 $ · saldo 48,20 $» |
| Schede della zona | ≤ 25 SERP Maps, 5 in parallelo | «SERP 10/25 · dalla cache 15» |
| La scheda del cliente | identità tra gli item (telefono, dominio); solo società non trovate: 1 SERP col nome | «Scheda trovata: il telefono coincide» · «Non trovata nelle ricerche lette» · «Ditta individuale: nessuna ricerca col nome» |
| Dettaglio delle schede | ≤ 10 My Business Info per `cid` (i primi per miglior rank pesato) | «10 schede lette» |
| Categorie e servizi | §4-§5, orari, area servita (§3.1), telefono, foto, controllo HTTP del sito | «Primaria: Impresa edile · 7 aggiuntive · 2 da decidere · 24 servizi · 14 aree · 10 foto» |
| gbp-description-writer | §6 (saltata con ingressi invariati) | testo e strumenti della fase |
| Controlli sulla descrizione | gate §6.3 | «11 controlli: 1 da correggere (descrizione-keyword)» |
| gbp-description-critic (round n) | critico | verdetto |
| gbp-description-writer (correzioni round n) | correzioni | — |
| Scrittura della scheda | `unisciStati`, piano, schema, scrittura atomica (tmp + rename) | → `done` con `traffico/scheda-consigliata.json` |

**Errori** (messaggi in italiano, mai credenziali, mai dati personali):

| Causa | Comportamento | Messaggio |
|---|---|---|
| `ErroreDfs` `auth` | stop, nessun file | «DataForSEO ha rifiutato login o password: controllali in Impostazioni → «Ottimizzazione del traffico».» |
| `credito` o saldo < 2 × stima | stop prima delle chiamate; le risposte già pagate restano in cache | «Credito DataForSEO insufficiente: ricarica e rilancia, le schede già lette non si ripagano.» |
| `limite`, `servizio` | tentativi di T4, poi stop | come T4 |
| una SERP in errore permanente dopo i tentativi | la SERP non conta, avviso con `check_url`; se ne restano meno di metà → stop | «Troppe ricerche della zona non lette (14 su 25): riprova più tardi.» |
| forma della risposta | stop col percorso | «Risposta DataForSEO inattesa in tasks[0].result[0].items[3].category_ids» |
| `claude -p`: sessione scaduta | stop; dati della zona già in cache | «Sessione Claude non valida: esegui `claude login` e riprova.» |
| `claude -p`: limite del piano Max | stop | «Limite del piano Max raggiunto: riprova più tardi; la zona non si ripaga.» |
| bozza illeggibile o fuori schema dopo la fase | vale come gate FAIL (correzione) | — |
| stop dalla status bar | fetch e child interrotti, nessun file scritto | «run interrotto» |
| schema della scheda non valido | stop, file precedente intatto | «Scheda non valida: <percorso Zod>» (difetto dell'editor, DEBUG.md) |

Uno stop o un errore lasciano intatta la scheda precedente; nessuno stato «in corso» su disco. `client.json` mai scritto.

**Costi**: una riga in `traffico/costi.ndjson` per chiamata pagata partita (`lavoro: "scheda"`, endpoint
`serp/google/maps/live/advanced` o `business_data/google/my_business_info/live`, `cost` della risposta); nessuna riga per la cache.
`ricercaCategorie.costoUsd` = somma delle righe del lavoro.

## 9. UI (mini-shape /impeccable)

**Sostituzioni dichiarate.** Nessuno strumento di domanda strutturata in questo contesto: le risposte del discovery vengono dal brief
e dalla ricerca, come chiesto dall'orchestratore. Mondo visivo **stabilito** (codice + `DESIGN-SYSTEM.md`; `impeccable context`:
PRODUCT.md presente, DESIGN.md dell'editor assente, mondo definito dal codice): è un'**estensione** di una superficie esistente,
nessun concept nuovo. Modo **Operate**. Il detector si esegue a UI finita (M4).

**Discovery.** *Chi e quando*: Mattia alla scrivania, con la scheda del cliente aperta in un'altra finestra, una volta
all'avvio del servizio e a ogni aggiornamento. *Compito*: inserire ogni campo senza riscriverlo, sapere perché ogni valore c'è e da
dove viene, vedere cosa manca e cosa è rischioso, seguire l'ordine dei giorni. *Successo*: nessun valore digitato a mano, nessun
valore senza fonte incollato, nessuna modifica core insieme a un'altra. *Verità specifica*: il software non scrive su Google; la
sezione segue l'ordine dell'editor della scheda, non l'ordine del nostro file. *Quantità reali*: 1 primaria, 0-9 aggiuntive, 0-2 da
decidere, 8-30 servizi (Cavaliere 24), descrizione 400-750 caratteri, 0-14 fasce orarie, 0-20 aree servite, 0-10 foto, 0-7 social.

**Posto**: nella card «Scheda Google» di `/traffico/[slug]`, sotto la riga delle date e sopra «Cosa comparirà qui», sotto-sezione
`<section aria-labelledby>` con h3 **«Scheda consigliata»** + badge. Visibile con Scheda `attivo` o `sospeso`; nascosta se spenta.

```
│ Scheda Google [Attivo]                                                          [Sospendi…] │
│ ─ Scheda consigliata ─────────────────────────────────────────────── [Descrizione da approvare] │
│ Preparata il 14/09/2026 · 23 schede della zona lette il 14/09 · costo 0,11 $    [Aggiorna…] │
│ ⚠ Nomi delle categorie da confermare nell'interfaccia di Google (catalogo italiano non letto) │
│                                                                                              │
│ Informazioni                                                                                  │
│   Categoria principale   Impresa edile   gcid:general_contractor              [Copia]        │
│                          Già così su Google · Campo principale · Può chiedere una nuova verifica│
│                          ▸ Perché: in 7 schede su 23, 3 volte tra le prime 3 · Costruzioni edili civili │
│   Categorie aggiuntive   Ristrutturatore di bagni                             [Copia]        │
│                          Da aggiungere · prova: Ristrutturazione bagni (card Ristrutturazioni…) │
│                          … (7)                                                               │
│   Da decidere (2)        Idraulico — l'impresa fa «Impianti idraulici»: è anche un idraulico? │
│   Descrizione            «Siamo un'impresa edile di Cologno Monzese…»   612/750   [Copia]    │
│                          Critico: promossa al 2° giro · ▸ Rilievi   [Modifica…] [Approva la descrizione] │
│   Nome                   Solo controllo: il nome su Google coincide col nome d'uso            │
│ Contatti · Posizione e aree (14) · Orari · Servizi (24) · Link · Foto (10)                   │
│ ▸ Piano di inserimento: 8 giorni · un campo principale al giorno                             │
│ ▸ Mancano (2): orari (da completare: arrivano dal form lead) · indirizzo visibile            │
│ ▸ Come è stata calcolata: 5 ricerche × 5 punti · zoom 17z · 23 schede · fuori dizionario (4) │
```

- **Gruppi nell'ordine dell'editor della scheda**: Informazioni (categorie, descrizione, nome, data di apertura) · Contatti
  (telefono, sito, social, chat) · Posizione e aree (area servita, indirizzo visibile) · Orari · Servizi (raggruppati per categoria)
  · Link · Foto. Etichette uguali a quelle dell'interfaccia di Google in italiano (da confrontare a vista in calibrazione, C6).
- **Riga di campo**: etichetta a sinistra (`text-sm text-muted`), valore in `text-ink` (codici in `mono`), `[Copia]` `btnGhost`
  compatto a destra con `aria-label="Copia «Categoria principale»"` ed esito «Copiato» in `role="status"` (stesso pattern di
  `build-panel.tsx`, `navigator.clipboard.writeText(copiaIncolla)`). Sotto: motivo in `text-sm text-muted`, badge con la parola
  (`Da aggiungere` brand · `Da cambiare` warn · `Già così su Google` idle · `Solo controllo` idle · `Campo principale` warn ·
  `Può chiedere una nuova verifica` warn · `Rischio sospensione` err), `<details>` «Perché» nativo con i fatti e le fonti in `mono`
  e «Apri la ricerca su Google Maps ↗» (`checkUrl`). A 400 px etichetta sopra il valore, `[Copia]` resta sulla riga del valore.
- **Liste lunghe**: servizi e categorie una riga per voce con la propria copia; area servita come elenco di aree ognuna copiabile
  («Monza», «Provincia di Monza e della Brianza», «Lombardia») con l'etichetta del cliente da cui viene e, se ci sono, gli esclusi
  oltre 20; con zone non usabili la riga dice il motivo di `zoneUsabili` e rimanda alla card «Zone servite» della stessa pagina; orari in lettura («lun–ven 8:00–12:00 · 13:30–18:00»), senza copia (Google usa selettori d'ora); foto come miniature
  64 px `rounded-ctl` con numero d'ordine, tipo, motivo e «Scarica» (`<a download>` sulle route esistenti o su quella del logo).
- **Descrizione**: testo intero, contatore `mono` «612/750», verdetto del critico in una riga, rilievi in `<details>`. «Modifica…»
  (`btnGhost`) apre in linea una textarea con contatore dal vivo e `useUnsavedGuard`; «Salva e approva» esegue i gate lato server,
  errori in `role="alert"` con l'id del controllo e la frase. «Approva la descrizione» è la **primaria** della sezione quando la
  scheda è pronta e la descrizione non è approvata.
- **Piano di inserimento** e **Mancano**: `<details>` chiusi di default; il piano elenca «Giorno 1: Categorie aggiuntive, Servizi»;
  i mancanti dicono cosa serve e dove si ottiene.
- **Una sola primaria nella pagina**: la pagina calcola chi ha la primaria; se la card delle zone servite (T3) o la card Sito (T4) ne mostrano una, quella della
  Scheda si rende `btnSecondary`.
- **Aggiorna…** → `ConfirmDialog` tono brand: «Aggiornare la scheda consigliata?» · «Le schede della zona lette negli ultimi 14 giorni
  vengono dalla cache; il resto costa al massimo circa {stima} $. La descrizione resta se i suoi dati non sono cambiati, altrimenti
  si riscrive col piano Max. Voci già segnate non si perdono.»
- **In preparazione**: fase da `useRuns()` (`kind === "traffico" && slug && step === "scheda"`), tempo `mono aria-hidden`, «Puoi
  chiudere la pagina: il lavoro continua.»; alla sparizione del run `router.refresh()`, focus sull'h3. Stop dalla status bar (sfera
  per le fasi delle due skill, chip per le altre).

| Stato | Badge | Cosa si legge | Primaria | Secondarie |
|---|---|---|---|---|
| da preparare | `brand` Da preparare | «Categorie, area servita, servizi, descrizione, orari, foto e link da inserire a mano nella scheda del cliente, ciascuno con fonte e motivo. Costo stimato circa {stima} $.» | **Prepara la scheda consigliata** | — |
| **non configurata** (chiavi DataForSEO assenti) | `brand` Da preparare | `Banner warn` «Senza DataForSEO le categorie si scelgono solo dai servizi, senza guardare le schede della zona. Login e password vanno in Impostazioni → «Ottimizzazione del traffico».» | **Prepara la scheda consigliata** | — |
| **zone non usabili** | `brand` Da preparare | riga `text-sm` col motivo di `zoneUsabili` («Zone servite da impostare nel dettaglio Traffico»): «Senza zone servite non si leggono le schede della zona e l'area servita resta da completare. Categorie dai soli servizi.» | **Prepara la scheda consigliata** | — |
| **senza mappa query** | come lo stato di base | riga `text-sm`: «Ricerche su cui puntare non calcolate (servizio Sito spento o mappa assente): la zona si legge con 5 ricerche di base dai servizi, senza volumi.» | invariata | — |
| bloccata (contesto assente o non verificato · `client.json` illeggibile) | `err` Bloccata | frase col motivo, `aria-describedby` sul bottone disabilitato (regola T0) | disabilitata | — |
| **in corso** | `brand` In preparazione | fase + tempo + frase | — | — |
| **pronta**, descrizione da approvare | `warn` Descrizione da approvare | meta + gruppi | **Approva la descrizione** | Aggiorna… · Modifica… |
| **pronta** | `ok` Pronta | meta + gruppi | — | Aggiorna… |
| descrizione non promossa dal critico | `warn` Descrizione da rivedere | `Banner warn` «Il critico non l'ha promossa dopo 3 giri: leggi i rilievi prima di approvarla.» | **Approva la descrizione** | Modifica… · Aggiorna… |
| descrizione non pronta (gate FAIL) | `warn` Descrizione mancante | nel campo: `Banner err` con i controlli falliti | — | Aggiorna… · Modifica… |
| dati insufficienti | invariato | nel gruppo Informazioni: «Solo N schede nella zona: categorie scelte soprattutto dai servizi.» | invariata | — |
| da aggiornare (sha cambiati) | `warn` Da aggiornare | `Banner warn` con i file cambiati in `mono` (contesto.json, zone servite, raw-submission.json, lavori.json, mappa-query.json, copy.json, lib/scheda-categorie.json, dominio) | **Aggiorna…** | — |
| **errore**, nessuna scheda | `err` Non riuscita | `Banner err` col messaggio (ultimo `error` di `run-scheda.ndjson`) | **Riprova** | — |
| errore con scheda precedente | come la scheda | `Banner err` «L'ultimo aggiornamento non è riuscito: …; resta la scheda del gg/mm.» | — | Aggiorna… |
| servizio sospeso | `idle` In pausa | scheda in lettura, copia attiva, «Servizio sospeso: la scheda consigliata resta com'è.» | — | — |

**Anti-obiettivi**: niente posizioni, clic, chiamate stimate, percentuali o punteggi-eroe (lo `score` si legge solo nel «Perché»);
niente nomi di competitor; niente spunte «fatto» (G2); nessun bottone che parli di pubblicare su Google; niente tab, tabelle larghe,
emoji, colori nuovi. Solo `card`, `Badge`, `Banner`, `btn*`, `ConfirmDialog`, `mono`, `lucide-react` (`Copy`, `Download`).

`CONTENUTI.scheda` di `page.tsx`: «Già disponibile» = la scheda consigliata; «Cosa servirà» = login e password DataForSEO in
Impostazioni; l'accesso da Manager resta per la checklist e il monitor.

## 10. File

| File | Tipo | Cosa |
|---|---|---|
| `site-factory-editor/lib/scheda-consigliata.ts` | A | schema §7, `punti`, `clienteNellaSerp`, `punteggiCategorie`, `testE`, `scegliCategorie`, `serviziScheda`, `orariScheda` (orari del lead), `areaScheda` (§3.1, importa da `lib/zone-servite.ts`), `telefonoScheda`, `sitoScheda` (URL e UTM; il controllo HTTP lo fa il lavoro), `fotoScheda`, `pianoInserimento`, `unisciStati`, `vistaScheda` (modello per la UI + staleness), `motivoBloccoScheda`, `stimaCostoUsd`, `EVIDENZA`, `RISCHIO`; puro, import `.ts` |
| `site-factory-editor/lib/scheda-descrizione.ts` | A | `componiIngressi`, `ingressiSha`, `BozzaSchema`, `ReviewDescrizioneSchema`, `gateDescrizione`, `gateDescrizioneMattia`, `CLAIM_RISCHIO`, prompt delle 3 fasi; puro salvo `slopDescrizione` (spawn di `check-slop.mjs` su file temporaneo) |
| `site-factory-editor/lib/scheda-lavoro.ts` | A | lettura ingressi (zone solo con `leggiZoneServite` + `zoneUsabili`), generatore delle fasi §8, chiamate DataForSEO, controllo HTTP del sito, fasi `claude -p` via `ioWithSignal`, scritture atomiche, `approvaDescrizione`, `salvaDescrizioneMattia` |
| `site-factory-editor/lib/scheda-categorie.json` | A | dizionario §4.1 |
| `site-factory-editor/lib/dataforseo.ts` | M (creato da T4) | `serpMaps({keyword, coordinata})`, `infoScheda({cid, coordinata})`, TTL 14 giorni e pulizia dei file scaduti per i due endpoint, endpoint nella lista dei pagati; credenziali e `configurata()` restano quelli di T4 (nessuna chiave nuova, K1) |
| `site-factory-editor/lib/mappa-query.ts` | M, solo se T4 vi lascia `ENDPOINT_PAGATI`/`RigaCostoSchema` | due endpoint e `lavoro: "scheda"` nelle costanti delle righe di costo; nient'altro |
| `site-factory-editor/lib/run-bus.ts` | M, solo se T4 chiude i lavori in un'unione | `"scheda"` nell'unione dei lavori |
| `site-factory-editor/lib/agenti.ts` | M | regola `/gbp-description-writer/` → agente `copy`; `nomeStep` «Traffico · scheda» |
| `site-factory-editor/app/api/clients/[slug]/traffico/scheda/route.ts` | A | `POST {azione:"prepara"}` → 202 `{id}` · `POST {azione:"approva-descrizione", generataAt}` → 200 · `PUT {descrizione, generataAt}` → 200 / 422 `{gate}`; 400 slug o corpo · 403 `Sec-Fetch-Site` · 415 content-type · 404 cliente · 409 `client.json` illeggibile, Scheda non attiva, contesto assente o non verificato, lavoro in corso, scheda assente o cambiata (`generataAt` diverso), descrizione assente |
| `site-factory-editor/app/api/clients/[slug]/traffico/scheda/logo/route.ts` | A | `GET` del logo scelto (`logo/fornito-*.png` il più recente, oppure `mark.png` con la riga Logo verificata), sola lettura, allow-list sul nome (decisione G1 punto 5) |
| `site-factory-editor/components/traffico-scheda.tsx` | A | sezione §9 (client: azioni, dialog, fase live, copia, modifica della descrizione) |
| `site-factory-editor/app/traffico/[slug]/page.tsx` | M | legge scheda, vista e blocco; monta `TrafficoScheda` nella card Scheda; primaria unica della pagina; `CONTENUTI.scheda` aggiornato |
| `.claude/skills/gbp-description-writer/SKILL.md` | A | §6.1 |
| `.claude/skills/gbp-description-critic/SKILL.md` | A | §6.1, §6.4 |
| `site-factory-editor/scripts/test-scheda-consigliata.ts` | A | banco §12 |
| `site-factory-editor/scripts/fixtures/scheda-consigliata/` | A | `contesto.json` (servizi e macro di Cavaliere, niente dati personali), `brief.json` sintetico (telefono e P.IVA di prova), `raw-submission.json` sintetico (`risposte.sede`, `risposte.zone` con un comune preciso, «X e dintorni» e «X e provincia»; orari nel campo scelto da Mattia, se già deciso), `traffico/zone-servite.json` confermato, `mappa-query.json`, `copy.json`, `copy-coverage.json`, `site.json` ridotto, `lavori.json`; `impresa-idraulica/` (ditta individuale, lead Tally → zone `da_impostare`) e `serramenti/` (società, 3 schede nella zona, «Tutta Italia»); `risposte/maps-*.json` (5 query, forma documentata), `mbi-cliente.json`, `mbi-competitor-*.json` (3), errori riusati da T4; `descrizione/` (ingressi, bozze che passano e che falliscono, review) |
| `site-factory-editor/DESIGN-BRIEF.md` | M | sezione «Scheda consigliata (shape — 2026-09-14)» |
| `docs/traffico/piano-G1.md` | M | Calibrazione, Verifica, chiusura |
| `docs/traffico/README.md` | M | §7 G1; §3 nota su `cache-api.json` rinviata |
| `docs/handoff-fase-c.md` | M | stato G1 |
| `docs/DEBUG.md` | M | righe §13 |

Fixture fuori git: `site-renderer/out/zz-test-g1/` (`client.json` con Scheda attiva e dominio finto, contesto verificato, brief,
`raw-submission.json` con sede e zone, `lavori.json` + 3 `img/lavoro-N.jpg` di prova) e `zz-test-g1-ditta/`, nel Cestino a fine fase 4.
Il banco usa il dataset reale via `PERCORSI_DATI` come il banco di T3 (`province.json` va generato con `npm run comuni` su un
checkout pulito).

Non si toccano: `lib/steps.ts`, `lib/catena.ts`, `lib/build.ts`, `lib/deploy.ts`, `lib/schemas.ts`, `lib/traffico.ts`, `lib/clients.ts`,
`lib/staleness.ts`, `lib/run-step.ts`, `lib/slop.ts`, `lib/legale.ts`, `lib/logo.ts`, `lib/inbox-form.ts`, i file di K1 (`lib/secrets.ts`,
`lib/chiavi-traffico.ts`, `app/api/setup/keys/route.ts`), i file di T3 (`lib/zone-servite.ts` e la sua card/route) e di T4 salvo le
estensioni dichiarate sopra, `.claude/skills/copy-critic/**`,
renderer, `site-intake/`, n8n.

## 11. Perimetro per `.claude/scope.json` (primo atto della fase 2, a T4 chiuso e perimetro libero)

```json
{
  "task": "G1 Scheda Google consigliata (docs/traffico/piano-G1.md)",
  "perimetro": [
    "site-factory-editor/lib/scheda-consigliata.ts",
    "site-factory-editor/lib/scheda-descrizione.ts",
    "site-factory-editor/lib/scheda-lavoro.ts",
    "site-factory-editor/lib/scheda-categorie.json",
    "site-factory-editor/lib/dataforseo.ts",
    "site-factory-editor/lib/mappa-query.ts",
    "site-factory-editor/lib/run-bus.ts",
    "site-factory-editor/lib/agenti.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/scheda/**",
    "site-factory-editor/components/traffico-scheda.tsx",
    "site-factory-editor/app/traffico/[slug]/page.tsx",
    ".claude/skills/gbp-description-writer/SKILL.md",
    ".claude/skills/gbp-description-critic/SKILL.md",
    "site-factory-editor/scripts/test-scheda-consigliata.ts",
    "site-factory-editor/scripts/fixtures/scheda-consigliata/**",
    "site-factory-editor/DESIGN-BRIEF.md",
    "docs/traffico/**",
    "docs/DEBUG.md",
    "docs/handoff-fase-c.md"
  ]
}
```

`lib/mappa-query.ts` e `lib/run-bus.ts` restano nel perimetro solo se M0 conferma che servono (altrimenti si tolgono prima di
scrivere). Cache DataForSEO e fixture in `out/` sono scritte da Node o esenti dal guard.

## 12. Milestone (ogni verifica passa prima della successiva)

**M0 — Precondizioni (nessun codice).** T4 chiuso e committato (`lib/dataforseo.ts` con cache, costi e `configurata()`,
`lib/mappa-lessico.json`, `startTrafficoRun`, `kind: "traffico"` in `run-bus.ts` e `agenti.ts`); T3, T6a e K1 già chiusi; `scope.json`
libero. Firme riverificate nel codice: `leggiZoneServite`, `zoneUsabili`, `areeServite`, `comuniServiti`, `comuniEntroKm`,
`regioneDiSigla`, `caricaDati` (`lib/zone-servite.ts`); nomi dei campi di `mappa-query.json` sul `piano-T4.md` chiuso. **Orari**: se
Mattia ha già aggiunto il campo al form lead, nome e forma letti da `raw-submission.json`/`brief.json` e da `lib/inbox-form.ts`
(sola lettura) e scritti qui; altrimenti `orariScheda` resta «da completare» e il campo si aggancia quando esiste. Dove vivono
`ENDPOINT_PAGATI`/`RigaCostoSchema` e se i lavori sono un'unione chiusa (decide le due voci condizionali). Rilettura in
`node_modules/next/dist/docs/` di `route.md`, `dynamic-routes.md`, `use-router.md`. `git log --oneline -5`, `git status --short`.

**M1 — Regole pure.** `scheda-consigliata.ts`, dizionario, fixture, banco casi 1-17 e 27-30. Verifica: banco verde, `npx tsc --noEmit`.

**M2 — Descrizione.** `scheda-descrizione.ts`, due skill, banco casi 18-24. Verifica: banco, `tsc`; una prova reale `claude -p` delle due
skill sugli ingressi della fixture (bozza valida per `BozzaSchema`, review valida). **Commit 1** (M1+M2) + push.

**M3 — Lavoro e route.** `scheda-lavoro.ts`, estensioni di `dataforseo.ts` (e costanti condizionali), `agenti.ts`, route; banco casi 25-26,
31-36. Verifica sul dev server (:3311) con `zz-test-g1` e `SF_DATAFORSEO_REGISTRATE=scripts/fixtures/scheda-consigliata/risposte`:
(1) `prepara` → 202, le fasi di §8 nella status bar, scheda valida con area servita dalle zone della fixture, righe di costo; (2)
secondo `prepara` → scheda uguale salvo `generataAt`, nessuna riga di costo, nessuna fase `claude -p`; (3) `approva-descrizione` →
`approvataAt`, poi `prepara` → approvazione conservata; (4) `PUT` con un URL → 422 con `descrizione-link`; (5) `zz-test-g1-ditta` →
nessun corpo di richiesta col nome del cliente (spia sul trasporto), nessuna SERP col nome; (6) senza chiavi né variabile → zona
`non-configurata`, scheda scritta; (6b) zone `da_impostare` → zona `zone-non-usabili`, area servita in `mancanti` col motivo; (7) risposte 40210 → errore «Credito…»,
scheda precedente identica (sha); (8) stop → nessun file; (9) contesto non verificato, Scheda sospesa, `client.json` illeggibile → 409
col motivo; (10) sha256 di `client.json` prima e dopo: identici. **Commit 2** + push.

**M4 — UI.** `traffico-scheda.tsx`, `page.tsx`, `DESIGN-BRIEF.md`. Verifica: `tsc`, `npm run build`; browser a 1280 e 400 px, tema chiaro e
scuro, ogni stato della tabella §9 (varianti della fixture), copia con tastiera ed esito annunciato, modifica della descrizione con
`Esc`/focus/guardia, dialog Aggiorna, fase live; `impeccable detect --json` sui file UI; `/impeccable critique` sulla sezione.
**Commit 3** + push.

**M5 — Calibrazione** (con chiave e ok esplicito di Mattia alla spesa, circa 0,30 $): C1-C7 sotto. **Commit 4** + push.

**M6 — Chiusura.** DEBUG.md, README §7, handoff, «Verifica»; diff riga per riga; file toccati = §10; fixture nel Cestino; `scope.json`
svuotato; commit finale dopo le verifiche dell'orchestratore.

## 13. Banco `scripts/test-scheda-consigliata.ts` (senza rete, stile `test-traffico-stato.ts`)

Categorie
1. `punti`: centro + 4 punti a 2,5 km, 5 decimali; stessi input → stessi punti.
2. `clienteNellaSerp`: per dominio con `www.`, per telefono con `+39`, per `cid`; omonimo con telefono diverso → competitor + avviso senza nome.
3. `k_i`: titolo con «Impresa Edile» per la query «impresa edile» → 0,5; con forma giuridica tolta; senza → 1.
4. Punteggi su una SERP costruita: `R(r)` ai confini 3/4 e 10/11; `S_prim`, `S_agg`, divisione per `n_p`; `w_q` con volume 0, `null`, 1.000.
5. Allineamento nomi: `category_ids` di lunghezza `1 + additional` → nomi osservati; lunghezza diversa → nessun nome osservato.
6. Test «È»: «Ristrutturazione bagni» prova `bathroom_remodeler`; «Impianti idraulici» su impresa edile → da decidere; categoria osservata senza prova → scartata.
7. Fuori dizionario: `monument` e un GCID vero non in dizionario → `fuoriDizionario` con conteggi, mai tra le voci.
8. Primaria con dati: cluster del servizio principale; parità → `specificita` → `gcid`.
9. Primaria senza dati (`serramenti`, 3 schede; senza chiavi): `primariaDiSettore`; `datiInsufficienti: true`; senza chiavi il motivo dice «da confermare coi concorrenti».
10. Primaria attuale diversa: attuale che passa → `conferma`; non passa e 1,6× → `modifica` + `riverifica`; non passa e 1,2× → `solo-controllo`.
11. Aggiuntive: 12 che passano → 9 + 3 in `categorieDaDecidere` «oltre il limite»; ordine deterministico; permutare gli item SERP non cambia nulla.
12. Fixture Cavaliere: primaria `general_contractor`; `plumber` ed `electrician` da decidere; nessuna aggiuntiva senza `servizioReale`.

Servizi, campi, foto, piano
13. Servizi: ordine di `macro_categorie`; categoria per prova o primaria; nome del contesto intatto; nome con «a Monza» → escluso con avviso; nessun prezzo; «forse predefinito» solo con ≥ 3 schede.
14. Orari: lead con il campo (2 fasce) → fasce ordinate, fonte `lead`; lead senza il campo, Tally o vuoto → `orari: null` + mancante «da completare».
15. Area servita (§3.1): sede + «Monza e provincia» + «Monza (MB)» → provincia sì, Monza tolta; regione + una sua provincia → solo la regione; «X e dintorni» → X e poi i comuni per km fino a 20; 25 comuni precisi → 20 per distanza con la sede prima, `esclusi: 5`; «Tutta Italia» → regione della sede + avviso; `zoneUsabili` false (`da_impostare`, `lead_cambiato`) → `null` + mancante col motivo; `copiaIncolla` «Provincia di …» e nome breve della regione; `indirizzoVisibile: null` + mancante.
16. Sito: URL con UTM; senza dominio → `null` + mancante. Foto: `hero.jpg` e `card-*.jpg` mai candidate; 200 px → esclusa; copertina = prima orizzontale nell'ordine di `lavori.json`; massimo 10; logo fornito prima di `mark.png`; `mark.png` con la riga Logo non verificata → assente.
17. Piano: ≤ 2 sezioni non core al giorno; una core al giorno; primaria ultima; voci `conferma` con `giorno: 0`.

Descrizione
18. `componiIngressi`: ogni fatto ha `rif` valido; `area` dalle zone usabili (≤ 3 nomi) o da `contesto.zona.area_intervento`; `ingressiSha` stabile e indipendente da `precedente`.
19. Gate: i 18 casi che falliscono di §6.3, uno per uno, con l'id atteso.
20. Gate: i 5 casi che passano di §6.3.
21. `descrizione-copia-sito`: 6 parole del titolo hero → FAIL; 5 parole → PASS; descrizione di un altro cliente dello stesso settore → FAIL, di un altro settore → PASS.
22. `slopDescrizione`: frase bandita della lista → FAIL; testo pulito → PASS (script vero, file temporaneo cancellato).
23. `gateDescrizioneMattia`: senza `fatti` passa; con un telefono fallisce; con una promessa vietata fallisce (`descrizione-vietate`).
24. Schemi: `BozzaSchema` e `ReviewDescrizioneSchema` su fixture valide e rotte.

Lavoro (trasporto e IO finti)
25. Sequenza delle fasi; `done` con l'artifact; bozza scritta da un IO finto che simula PASS al secondo round del critico → `round: 2`.
26. Ingressi invariati → nessuna chiamata a `io.claude`; approvazione conservata.
31. Ditta individuale → SERP della zona eseguite, nessun corpo di richiesta contiene il nome del cliente, nessuna SERP col nome anche se il cliente non è tra gli item; società non trovata → una SERP col nome.
32. Senza chiavi → `configurata()` false, zona `non-configurata`, nessuna eccezione, scheda valida; zone non usabili → zona `zone-non-usabili`, zero chiamate.
33. 40210 → un solo `error`, nessun file scritto; saldo < 2 × stima → errore prima di ogni chiamata pagata.
34. Tre giri di critico FAIL → descrizione con `verdetto: "FAIL"`; gate ancora FAIL dopo 2 correzioni → `descrizione: null` + mancante.
35. `costi.ndjson`: una riga per chiamata pagata col `cost`; cache → nessuna riga; nessuna credenziale né nome di competitor nelle righe o nei messaggi.
36. `agenteDaFase("gbp-description-writer (correzioni round 1)", "scheda", "traffico")` → `copy`, sfera; «gbp-description-critic (round 2)» → `critico`; «Schede della zona» → chip `script`.

Schema e stati
27. Scheda della fixture valida; voce senza fonti → FAIL; `api-gbp` con valore al posto del puntatore → FAIL; modalità pubblica con `serviceTypeId` → FAIL.
28. Piano incoerente (due core lo stesso giorno, voce da inserire assente dal piano) → FAIL.
29. `unisciStati`: stessa voce e stesso consigliato → stato `fatto` conservato; consigliato cambiato → `da-fare`, note conservate.
30. Determinismo: pipeline completa due volte con trasporto finto → uguale salvo `generataAt`; input permutati → uguale. `vistaScheda`: cambio di sha di contesto, zone, lead, lavori, mappa, copy, dizionario o dominio → «Da aggiornare» con l'elenco dei file.

## 14. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **Sospensione della scheda** (modifiche in blocco, keyword nel nome, redirect del sito, cambio di primaria) | nessuna scrittura via API; piano con una modifica core al giorno e la primaria per ultima; nessuna proposta di nome, solo segnalazione del titolo con keyword; cambio di primaria solo con 1,5× e attuale che fallisce «È»; controllo HTTP del link (redirect verso altro dominio = rischio sospensione in rosso); servizi mai arricchiti con città o sinonimi |
| **Dati di omonimi** (scheda di un'altra impresa scambiata per il cliente, o il cliente contato come competitor) | identità solo per telefono, dominio o `cid` identificato così, mai per nome; omonimo con telefono diverso = competitor + avviso; scheda del cliente non trovata → `confronto` assente, nessuna azione dedotta |
| **Catalogo categorie incompleto** (nomi IT e GCID non ufficiali, tipi Maps non selezionabili) | si propone solo il dizionario; `fuoriDizionario` visibile per la curatela; `nomeStato` e avviso in UI; test 1 per la chiave e l'allineamento dei nomi; `batchGet` quando c'è l'accesso (una sola chiamata chiude la tabella §4.4) |
| **Costi fuori controllo** | tetti rigidi (25 SERP, 11 schede), saldo prima di spendere, cache 14 giorni, costo reale per chiamata, ditte individuali a zero, fixture registrate per banchi e E2E |
| Quota Max condivisa con la catena demo | descrizione riscritta solo a ingressi cambiati; zona già in cache se il lavoro si ferma sul limite |
| Testo generato = fattore negativo di settore | gate + critico + approvazione esplicita di Mattia prima della copia; nessuna descrizione «grezza» mostrata come pronta |
| Claim inventati nella descrizione | fatti per frase con puntatore, gate su numeri e claim a rischio, critico con `promesse_vietate` bloccante |
| Zoom e punti non tarati | parametri scritti nella scheda; C3 prima di dichiarare ripetibili i punteggi |
| `category_ids[0]` non è la primaria | test 1 (C1) prima di fidarsi dell'ordine; se falso: primaria = id il cui nome allineato è `category` |
| My Business Info vuoto su schede italiane | le regole che lo usano (servizi «forse predefiniti», confronto della descrizione) degradano a nessun effetto; test 2 (C2) |
| Dati personali di competitor (ditte individuali) | nessun nome, telefono o indirizzo di competitor in `out/`, nei log o nei costi; cache fuori da git e Drive, file scaduti cancellati |
| Policy di conservazione Business Profile | modalità pubblica: nessun contenuto API; schema che rifiuta valori al posto dei puntatori `api-gbp` |
| Servizio Scheda senza Sito (niente mappa) | zone e orari vengono dal form lead e valgono anche col solo servizio Scheda; lessico al posto della mappa; campi senza fonte in `mancanti` con la via per ottenerli |
| Area servita sbagliata o troppo larga (lettura errata delle zone, «Tutta Italia», regioni intere lontane dalla sede) | zone lette solo con `zoneUsabili` (mai una proposta `da_controllare`); nessuna area fuori dalle zone servite; «Tutta Italia» ridotta alla regione della sede con avviso (dubbio 2); taglio a 20 per distanza dalla sede; motivo con l'etichetta del cliente, così Mattia vede da dove viene ogni area |
| Orari mancanti finché il form lead non ha il campo | voce «da completare» in `mancanti`, mai orari stimati; aggancio al campo in M0 o appena Mattia lo aggiunge (dubbio 1) |
| Nome del cliente verso DataForSEO per una ditta individuale | nessuna SERP col nome per le ditte (`inferForma`, incerta → ditta); identità solo per telefono o dominio tra gli item della zona; banco con spia sui corpi delle richieste |
| Collisione con T4 (stessi file) | fase 2 dopo T4 chiuso (M0); voci condizionali del perimetro verificate prima di scrivere |
| Etichette diverse dall'interfaccia di Google | confronto a vista in C6 prima di chiudere la UI |

## 15. Decisioni e dubbi

Già decisi (`decisioni-piani.md`, sezione G1, e T3 punti 12-14, K1), recepiti nel testo: ditte individuali con lettura della zona
e nessuna ricerca col nome (G1-1); senza chiavi la scheda si prepara con categorie «da confermare coi concorrenti» (G1-2); niente
mini-form: zone dal form lead, orari dal form lead quando ci saranno, niente prezzi né attestati (T3-12/13, sopra G1-3); Business
Profile API e `cache-api.json` in G3 (G1-4); logo fornito o generato con la riga Logo verificata (G1-5); nessuna descrizione dei
singoli servizi (G1-6); parametri iniziali fino alla calibrazione (G1-7); spesa di calibrazione circa 0,30 $ con la chiave (G1-8);
descrizione modificata a mano con i controlli rigidi, promesse vietate comprese, salvare = approvare (G1-9); prima persona plurale
(G1-10); nessuna chiave nuova (K1).

Aperti (proposta tra parentesi):

1. **Orari del form lead**: nome e forma del campo li decide Mattia nell'altra chat; il form raccoglie orari di lavoro e orari in cui
   risponde al telefono (proposta: gli orari principali della scheda = orari di lavoro; quelli del telefono, se diversi, solo nel
   motivo; «Altri orari» di Google non in G1).
2. **«Tutta Italia»** nell'area servita: Google chiede un'area entro circa 2 ore dalla sede (proposta: la regione della sede con
   avviso; in alternativa la provincia della sede).
3. **«X e dintorni»**: riempire l'area coi comuni entro il raggio fino a 20 (proposta: sì, dopo le voci primarie) oppure solo il
   comune X.
4. **Servizio principale** per la primaria: il servizio della target T4 col volume più alto (proposta: sì; senza mappa nessuno).
5. **`locations.patch?validateOnly=true`**: non costruito (sì).

## Calibrazione

*(fase 3 — con chiave e ok alla spesa: C1 test 1 della ricerca, chiave `gcid:` e ordine di `category_ids` su 5 schede note; C2 test 2,
campi di My Business Info su 5 schede italiane; C3 test 3, zoom 13z/15z/17z e rumore a +24 h; C4 categorie contro la scelta esperta di
Mattia su 3 casi (Cavaliere, `impresa-idraulica`, `serramenti`), atteso primaria 3/3 e aggiuntive con Jaccard ≥ 0,7; C5 critico della
descrizione contro il giudizio di Mattia su 6 descrizioni, atteso accordo ≥ 5/6; C6 etichette e ordine dei gruppi confrontati a vista con
l'interfaccia della scheda; C7 costo reale per preparazione da `costi.ndjson`; C8, senza spesa, area servita di Cavaliere (zone impostate
dall'operatore) e di 2 lead del form v4: ogni `copiaIncolla` trovato dall'autocompletamento dell'area servita di Google (comuni,
«Provincia di …», regioni) e confronto a vista con le zone del form. Senza chiave: protocollo pronto, stato «da calibrare con
chiave» nel README §7.)*

## Verifica

*(fase 4: output del banco, `npx tsc --noEmit`, `npm run build`, banchi esistenti, E2E M3 e M4, sha dei `client.json`, costi reali.)*

## Fonti verificate il 2026-09-14

- https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/ (parametri, `location_coordinate` con zoom 3z-21z default 17z, 20 risultati su mobile, campi `maps_search`, fatturazione per SERP fino a 100 risultati)
- https://docs.dataforseo.com/v3/business_data/google/my_business_info/live/ (`cid:`, `location_coordinate` con raggio, `services`, `attributes` da recensioni, `work_time`, `category_ids`)
- https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/ (`local_pack` senza categorie)
- https://docs.dataforseo.com/v3/business_data-business_listing-categories/ (gratis, 5.156 categorie solo in inglese)
- https://dataforseo.com/pricing/serp/google-maps-serp-api (0,0006 / 0,0012 / 0,002 $) · https://dataforseo.com/pricing/business-data/business-data-api (0,0015 / 0,003 / 0,0054 $)
- https://dataforseo.com/update/pricing-update-in-dataforseo-apis (1/7/2026: Maps SERP e My Business Info non toccati)
