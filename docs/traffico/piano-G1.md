# Piano G1 — Scheda Google consigliata

Stato: **fase 1 (piano) — in revisione dall'orchestratore**, 2026-09-14. Fonti: `docs/traffico/README.md` (§1-§5),
`decisioni-piani.md` (T3 punto 10, T4), `brief-G1.md`, `ricerca-scheda-google-2026-09.md` (§0-§6, §7.1, §8.2-§8.3, §9,
§10 G1, §11.1), `piano-T3.md` (R.3-R.4, §5.2-§5.4, §6.1, §8.3), `piano-T4.md` (§2, §3.2, §6, §7, §8, §10-§13). Codice letto:
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
veri, servizi, descrizione ≤ 750 caratteri, orari, area servita, telefono, sito con UTM, social, foto reali, link, ciascuna
voce con fonte, motivo, rischio e giorno di inserimento. Mattia la legge nell'area Traffico e la copia a mano nella scheda
(decisione 1). Checklist «fatto» e confronto con la scheda pubblica: G2. Monitor: G3.

Fatti che vincolano il piano (letti oggi):

- **Nessun `StepKey`**: il lavoro è `traffico:<slug>:scheda` sul run-bus con `kind: "traffico"`, introdotto da T3
  (`startTrafficoRun`, `busIdTraffico`, eventi in `out/<slug>/traffico/logs/run-<lavoro>.ndjson`) ed esteso da T4. G1 non tocca
  la catena demo né `client.json`.
- `run-step.ts` esporta `ioWithSignal(signal, sink)`: le fasi `claude -p` del lavoro lo riusano così com'è (login Max,
  `--model claude-opus-4-8 --effort xhigh`, errori come valore di ritorno, `isErroreLimite`). Le costanti degli strumenti
  (`READ_SKILL_WRITE`, `NO_NET_NO_BASH`) sono private in `lib/steps.ts`, che nessun piano Traffico tocca.
- `lib/agenti.ts`: la fase è il nome della skill; `/critic/i` vince su tutto, `/logo/i` cattura qualunque fase con «logo».
  Le etichette delle fasi di G1 non contengono «logo»; la skill di scrittura richiede una regola nuova.
- `lib/dataforseo.ts` nasce in T3 (`schedaPubblica`, costi) e cresce in T4 (cache su disco, `saldo`, `ErroreDfs`, SERP
  organica). T4 legge anche il `local_pack` della SERP organica: la documentazione del `local_pack` **non** ha categorie
  (solo `cid`, `title`, `domain`, `phone`, `rating`), quindi le categorie vengono solo da Maps SERP e My Business Info.
- `lib/legale.ts` esporta `inferForma(denominazione)` → `societa | ditta_individuale` (inferenza incerta → ditta individuale,
  degrado sicuro): è il criterio «nomi senza forma societaria» di T3 punto 10.
- `contesto.json` ha `servizi_atomizzati[].servizio` senza id, `macro_categorie`, `settore_normalizzato`, `zona.sede` (solo nome),
  `punti_di_forza[{claim, fonte}]`, `promesse_consentite`, `promesse_vietate` (Cavaliere: 15, tra cui anni di esperienza, garanzie,
  materiali di qualità, bonus fiscali), `promessa_martello`, `tono`. `copy-coverage.json` lega ogni servizio alla card del sito.
- Foto: `lavori.json` → `img/lavoro-N.jpg` sono le foto reali del form (EXIF tolto); `img/hero.jpg` e `img/card-*.jpg` sono
  generate con FLUX e **non** vanno mai sulla scheda (T1a decisione 2, ricerca §5.4). T3 aggiunge `traffico/foto.json` verificato.
- `lib/slop.ts` esegue `check-slop.mjs` solo su `copy.json`; lo script accetta qualunque mappa piatta `slot → testo`, quindi la
  descrizione si controlla con lo stesso script su un file temporaneo (nessuna copia delle frasi bandite).
- Il servizio Sito e il servizio Scheda sono separati: `dati.json` (orari, comuni, prezzi) nasce solo dal modulo di T3, che
  richiede il Sito attivo; `mappa-query.json` nasce solo da T4, che richiede il Sito attivo e i dati verificati. G1 deve
  funzionare anche senza entrambi.
- `.claude/scope.json` oggi = perimetro di **T6a**; T3 e T4 modificheranno `app/traffico/[slug]/page.tsx`, `lib/dataforseo.ts`,
  `lib/agenti.ts`, `DESIGN-BRIEF.md`: la fase 2 di G1 parte **dopo T3 e T4 chiusi** (M0).

Fuori perimetro: scrittura sulla scheda via API; proposte di nome; post; Q&A; foto AI; recensioni; checklist e stati
`fatto`/`in-revisione` (G2); geogrid e monitor (G3); letture Business Profile API e `cache-api.json` (§2.7).

## 2. Decisioni motivate

### 2.1 Modalità «pubblica» soltanto

Le Business Profile API sono a quota 0 e il token OAuth vivrà in n8n (ricerca §8.4, G3 punto 1): in G1 nessun lettore
`locations.get`, `categories.batchGet`, `attributes.list` e nessuna `cache-api.json` (nessuno le scriverebbe). Lo schema
riserva `modalita: "api"` e la fonte `api-gbp` con puntatore obbligatorio: il giorno dell'accesso si aggiungono lettori e
cache senza cambiare versione. Conseguenza dichiarata: nomi italiani delle categorie «da confermare» (§4.4 della ricerca),
nessun servizio predefinito italiano, nessun attributo impostabile con prova. (Dubbio 4.)

### 2.2 Fonti DataForSEO (verificate oggi su docs.dataforseo.com e sulle pagine prezzi)

| Uso | Endpoint | Parametri fissati | Campi usati | Prezzo live |
|---|---|---|---|---|
| Schede della zona | `POST /v3/serp/google/maps/live/advanced` | `keyword`, `location_coordinate: "lat,lng,17z"` (7 decimali max, zoom 3z-21z, default 17z), `language_code: "it"`, `device: "mobile"`, `os: "android"`, `depth: 20` («for mobile device, only 20 results are returned») | item `maps_search`: `rank_absolute`, `cid`, `place_id`, `title`, `category`, `additional_categories`, `category_ids` («universal category IDs that do not change based on the selected country»), `domain`, `url`, `phone`, `is_claimed`; `check_url`, `cost` | **0,002 $** a SERP («billed per each SERP containing up to 100 results»); standard 0,0006, priority 0,0012 |
| Dettaglio di una scheda | `POST /v3/business_data/google/my_business_info/live` | `keyword: "cid:<cid>"` con `location_coordinate: "lat,lng,raggio"` (raggio 199,9-199.999 mm, richiesto anche col `cid:`), `language_code: "it"` | `category`, `category_ids`, `additional_categories`, `description`, `services[]` (`category`, `title`, `snippet`, `price`), `work_time`, `url`, `phone`, `title` | **0,0054 $** a scheda; standard 0,0015, priority 0,003 |
| Scheda del cliente | `schedaPubblica({keyword, coordinate})` di T3 (stesso endpoint, controllo d'identità su telefono o dominio) | — | come sopra | 0,0054 $, spesso già in cache da T3 |

- **Prezzi 2026**: l'aggiornamento del 1/7/2026 tocca Business Listings Search e Categories Aggregation, non Maps SERP né My
  Business Info (pagina «pricing update» riletta oggi). Solo Live (decisione T4 punto 3).
- **Non usati**: `local_pack` della SERP organica (senza categorie); `business_listings/categories` (gratis, 5.156 codici solo
  in inglese, include tipi Maps non selezionabili: non filtra); `attributes` di My Business Info («user-reviewed checks», non gli
  attributi del titolare); orari, valutazioni e recensioni dei competitor: restano nella cache delle risposte ma nessuna voce del
  cliente può derivarne (regola 5) e le recensioni sono fuori scope (decisione 9).
- **Cache**: quella su disco di T4 (`~/.cache/site-factory/dataforseo/<endpoint>/<sha>.json`), TTL 14 giorni per entrambi gli
  endpoint; all'avvio del lavoro si cancellano i file scaduti dei due endpoint (le risposte contengono nomi e telefoni di
  competitor, anche ditte individuali). Nel file della scheda non entra nessun nome né telefono di competitor.

### 2.3 Ditte individuali, chiavi assenti, sede non risolta

- `inferForma(brief.azienda).forma === "ditta_individuale"` → **nessuna chiamata DataForSEO** (brief, T3 punto 10), neppure la
  ricerca della zona. (Dubbio 1: la ricerca della zona non invia il nome del cliente.)
- Senza chiavi, ditta individuale o sede non risolta: la scheda si prepara lo stesso; le categorie si scelgono dai servizi e dal
  dizionario (§4.7), con `ricercaCategorie.zona` che dice perché e `datiInsufficienti: true`. Il resto della scheda non dipende
  da DataForSEO. (Dubbio 2.)

### 2.4 Query e punti

- **Con `mappa-query.json`** (T4, `stato` ≠ `insufficiente`, sha degli ingressi coerenti): dalle `target`, le teste distinte per
  `testa.gruppo` nell'ordine delle target, sempre inclusa la testa di mestiere del cliente; **massimo 5**; il testo della query
  Maps è `testa.testo` senza comune (la località la dà la coordinata).
- **Senza mappa** (Sito spento, T4 non eseguito, mappa insufficiente): dal lessico di T4 (`lib/mappa-lessico.json`), la prima testa
  di mestiere del `settore_normalizzato` + le teste primarie dei servizi in ordine di priorità (`dati.json` verificato) o, senza
  dati, in ordine di `macro_categorie`; gruppi distinti, massimo 5. `fonteQuery: "lessico"`, pesi 1.
- **Punti**: centro del comune della sede (dataset T6a, stessa risoluzione di T3/T4: mai l'indirizzo, che per una SAB è una casa)
  + 4 punti a 2,5 km verso N, E, S, O: `lat ± 2,5/111,32`, `lng ± 2,5/(111,32·cos lat)`, arrotondati a 5 decimali. Zoom `17z`
  (default documentato) finché il test 3 della ricerca non sceglie (Calibrazione C3).
- **Tetti rigidi**: ≤ 5 query × 5 punti = 25 SERP; ≤ 10 My Business Info di competitor + 1 del cliente; saldo (`user_data`) ≥ 2 ×
  stima prima di spendere.

### 2.5 Costo per cliente

| Voce | Chiamate | Live |
|---|---|---|
| Schede della zona | 25 SERP | 0,050 $ |
| Dettaglio dei primi competitor | 10 | 0,054 $ |
| Scheda del cliente (se non già in cache da T3) | 1 | 0,005 $ |
| **Prima preparazione** | 36 | **≈ 0,11 $** |
| Nuova preparazione entro 14 giorni | 0 (cache) | 0 $ |
| Anno, aggiornamento trimestrale | — | ≈ 0,44 $ |
| Ditta individuale · senza chiavi | 0 | 0 $ |

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
brief.json ─────────────────┤                                        ┌─ categorie (§4) ──┐
traffico/dati.json ─────────┤  1 Controllo dei dati                  │                   │
traffico/foto.json ─────────┤  2 Schede della zona ─── Maps SERP ────┤                   ├─ servizi (§5)
traffico/mappa-query.json ──┤  3 Dettaglio delle schede ─ MBI ───────┘                   │
copy.json · copy-coverage ──┤  4 Categorie e servizi (puro) ─────────────────────────────┤
site.json · client.json ────┤  5 gbp-description-writer ─┐                               │
T6a comuni-fatti.json ──────┤  6 Controlli sulla descrizione ◄─ gate (§6.3)              ├─ descrizione (§6)
lib/scheda-categorie.json ──┤  7 gbp-description-critic (round n) ─► 8 correzioni ─┘     │
lib/mappa-lessico.json ─────┘  9 Scrittura della scheda ◄── orari · area · telefono · sito/UTM · social · chat
                                                            · link · foto · piano di inserimento
                                                            └─► traffico/scheda-consigliata.json (Zod)
```

Ogni ingresso è letto una volta dalla route prima di avviare (snapshot) e il suo sha entra in `ingressi`: ciò che cambia durante
il lavoro vale alla preparazione successiva («Da aggiornare», §8).

**Regole per campo (deterministiche, funzioni pure in `lib/scheda-consigliata.ts`):**

| Campo | Fonte ammessa | Regola | Senza fonte |
|---|---|---|---|
| Nome | `dati.nomeUso` verificato, altrimenti `brief.azienda` | `solo-controllo`, `consigliato: null`; `confronto` col titolo della scheda pubblica del cliente (normalizzati con `normAlnum`, con e senza forma giuridica); se il titolo pubblico contiene una testa del lessico o un comune: `rischio: "sospensione"` e motivo | — |
| Categorie | §4 | §4 | mai vuota: dizionario |
| Servizi | `contesto.servizi_atomizzati` + `dati.prezzi` verificati | §5 | — |
| Descrizione | §6 | §6 | `null` se i gate non passano, in `mancanti` |
| Orari | `dati.orari` verificato | gruppi → `{giorno 1..7, apre, chiude}` ordinati; nessuna fascia inventata | `null` · «chiedili col modulo «Dati per farti trovare» (servizio Sito) o al cliente» |
| Orari speciali | — | nessuna fonte in G1 | `null`, non elencata tra i mancanti |
| Area servita | `dati.comuni` verificati | sede prima, poi `km` crescente, nome; **massimo 20** (limite Google), gli esclusi nel motivo; `indirizzoVisibile: null` (nessuna fonte dice se riceve clienti in sede) | `null` · «servono i comuni confermati dal modulo» |
| Indirizzo visibile · pin | — | `null` in G1 (nessuna fonte su ricevimento in sede) | in `mancanti`: «chiedi al cliente se riceve in sede: se no, l'indirizzo va nascosto» |
| Telefono | `brief.telefono` (numero dell'attività) | E.164 `+39…`; `copiaIncolla` nel formato nazionale del sito | `null` |
| Sito | `client.steps.build.deploy.dominio` | §2.6 | `null` · «il sito non è pubblicato col suo dominio» |
| Data di apertura | `brief.anno_inizio` | `{anno}` se 1900 ≤ anno ≤ anno corrente | `null` |
| Social | `brief.social` | una voce per piattaforma nota, URL assoluto https | `[]` |
| Chat | `brief.ricontatto_preferito` contiene «WhatsApp» e `promesse_consentite` lo ammette | `{tipo: "whatsapp", valore: telefono}` | `null` |
| Link azione | `site.json` con form | §2.6 | `[]` |
| Attributi | — | nessuna fonte del cliente in modalità pubblica | `[]` · «disponibili per categoria solo con l'accesso API (ricerca §8.3, chiamata 1)» |
| Foto | `traffico/foto.json` (con `dati.json` verificato, `escludi: false`), altrimenti `lavori.json` → `img/lavoro-N.jpg`; logo solo se fornito dal cliente (`logo/fornito-*.png`) | §5.3 | `[]` · «nessuna foto reale» |

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
   `39` iniziale = telefono del brief, oppure `cid` = `cid` della scheda del cliente (da `schedaPubblica`): escluso. Un item con
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
   - **passa** se almeno un servizio reale del cliente (contesto; per le priorità anche `dati.priorita`) soddisfa una `prova` di `g`
     **e** `settore_normalizzato` (minuscolo) ∈ `g.settori`; il servizio che lo prova è `servizioReale`, la card del sito da
     `copy-coverage.json` entra nel motivo («sul sito: card "Ristrutturazioni e manutenzioni"»), la sua assenza è un avviso;
   - **da decidere** se la prova c'è ma il settore no (mestiere altrui: «l'impresa fa Impianti idraulici: è anche un idraulico?»):
     va in `categorieDaDecidere`, mai tra le voci;
   - **scartata** senza prova, anche con punteggio alto (motivo registrato solo per le categorie osservate nella zona).
7. **Primaria.** Servizio principale = `dati.priorita[0]` verificato, altrimenti nessuno. Cluster `Q*` = query la cui testa copre il
   servizio principale ∪ query di mestiere; `S*_prim` = `S_prim` calcolato su `Q*`. Candidate `K` = categorie che passano con
   `tipo = "mestiere"`, più quelle la cui prova è il servizio principale.
   - Con dati sufficienti: `argmax_{g∈K} S*_prim(g)`; parità (differenza < 0,01) → `specificita` maggiore → `nSchede` → `gcid`.
   - Con dati insufficienti: `primariaDiSettore` se ∈ K; altrimenti la candidata con più servizi che la provano → `specificita` →
     `gcid`. Motivo: «Scelta dai servizi: nella zona solo N schede lette» o il perché della zona non letta.
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

1. Ordine: servizi di `dati.priorita` verificati (abbinati per nome normalizzato, decisione T4 punto 8), poi gli altri nell'ordine
   di `macro_categorie`; un servizio assente dal contesto → avviso, nessuna voce.
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
6. Prezzo solo da `dati.prezzi` verificato con `validoFino ≥ oggi` (importo, unità, IVA, scadenza). Mai stimato.
7. Descrizione del singolo servizio (≤ 300): **non generata** in G1 (facoltativa, nessun effetto sul ranking dimostrato). (Dubbio 6.)
8. `id` = `servizio:<kebab del nome>`, unico; `rischio: "rifiuto"`; `core: false`.

### 5.2 Nome, telefono, sito: nessuna ottimizzazione

Il software non propone nomi (ricerca §5.4), non aggiunge numeri, non sceglie pagine diverse dalla homepage (§2.6).

### 5.3 Foto

1. Candidate: foto di `foto.json` con `escludi: false` (se `dati.json` è verificato), altrimenti `lavori.json`. Mai `hero.jpg`,
   `card-*.jpg`, `mark*` o immagini generate.
2. Gate `foto-formato` (limiti Google): JPG o PNG, 10 KB-5 MB, lato minimo ≥ 250 px (misure da `foto.json` o `sips -g`); fuori
   limite → esclusa col motivo.
3. Ordine: servizio in priorità (1, 2, 3, poi gli altri), comune della sede prima, anno decrescente, file crescente. Massimo **10**
   (regola nostra: un primo caricamento, non un archivio).
4. `copertina` = la prima orizzontale (larghezza ≥ altezza) del servizio in priorità 1, altrimenti la prima orizzontale; le altre
   `lavoro`. Logo (`tipo: "logo"`) solo se il cliente ha fornito il file (`logo/fornito-*.png`, quadrato o quasi, ≥ 250 px). (Dubbio 5.)
5. Nessun testo sovrapposto, nessun geotag: i file sono già senza EXIF (T3, import del form).

## 6. Descrizione

### 6.1 Due skill, stile del progetto

- **`.claude/skills/gbp-description-writer/SKILL.md`** — scrive la descrizione.
  - Ruolo: descrizione della scheda Google di un'impresa locale, 3-4 frasi, ≤ 750 caratteri; non è copy del sito né marketing.
  - Input: **solo** `out/<slug>/traffico/descrizione-ingressi.json`, composto dal lavoro (§6.2): ogni fatto ha un `id`.
  - Struttura (ricerca §5.2): (1) chi è e cosa fa: mestiere + zona reale; (2) 2-4 servizi principali con le loro parole; (3) cosa
    distingue, solo con prova (punti di forza, attestati, anno di inizio se non vietato); (4) come si lavora: cortesia di settore
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

`{ versione: 1, nome, mestiere (nome IT della primaria), altreCategorie (≤ 3 nomi), sede, area (contesto.zona.area_intervento),
servizi (≤ 4: priorità, poi il primo di ogni macro), puntiDiForza[], attestati[] (solo pubblicabili da dati.json verificato),
annoInizio | null, cortesie (promesse_consentite), promesseVietate, martello, tono, frasiSito (titoli e sottotitoli di copy.json),
precedente: { testo, approvataAt } | null }`. Ogni fatto è `{ id, testo, rif }` con `rif` al campo d'origine
(`contesto.json#/punti_di_forza/2`, `dati.json#/attestati/0`, `brief.json#/anno_inizio`). `ingressiSha` = sha256 della
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
| `descrizione-slop` | frasi bandite | `check-slop.mjs --json` su `{"descrizione": testo}` (file temporaneo in `traffico/`, `--consenti` nome e sede) ha bloccanti |

Casi del banco (§12): falliscono «Visita cavalierebuild.it», «www.…», «chiamaci al 02 1234 5678», «+39 333 123 4567», un'email,
«sconto del 10%», «Ristrutturazione bagni» due volte, «a Cologno Monzese, Monza e Brugherio», una sequenza di 3 parole ripetuta, 751
caratteri, una frase senza `fatti`, «15 anni di lavori» senza un fatto con 15, «garanzia di 10 anni», «impresa leader in zona»,
«materiali di qualità», 6 parole del titolo hero di `copy.json`, una bozza le cui frasi non ricompongono il testo. Passano: una
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
5. Approvazione: `redazione.approvataAt`. Modifica di Mattia: gate `lunghezza`, `link`, `contatti`, `promo`, `keyword`,
   `ripetizioni`, `copia-sito`, `slop` (non quelli che richiedono i fatti per frase); fonte `mattia`; salvare = approvare. (Dubbio 10.)

## 7. Schema Zod di `scheda-consigliata.json` (`lib/scheda-consigliata.ts`)

Coerente con ricerca §9. Scostamenti dichiarati: voci **nullable** quando manca la fonte (con `mancanti`), perché «voce senza fonte =
file non valido»; fonti `lead` (brief.json) e `dizionario`; foto con `file` relativo a `out/<slug>` al posto di `fileDrive`;
`indirizzoVisibile` nullable; blocchi `regole`, `ingressi`, `redazione`, `categorieDaDecidere`, `mancanti`, `avvisi`;
`ricercaCategorie` estesa; `giorno: 0` = niente da inserire; servizi senza `descrizione`.

```ts
import { z } from "zod";
import { UNITA } from "./dati-traffico.ts"; // T3

export const VERSIONE_REGOLE_SCHEDA = "2026-09-a";
const Sha = z.string().regex(/^[a-f0-9]{64}$/);
const Iso = z.string().datetime();
const Data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Gcid = z.string().regex(/^[a-z0-9_]+$/).max(80);
const Ora = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/);
const Tel = z.string().regex(/^\+39\d{6,11}$/);
const Istat = z.string().regex(/^\d{6}$/);

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
  tipo: z.enum(["contesto", "dati-form", "lead", "sito", "dizionario", "api-gbp", "dataforseo", "google-ads", "pleper",
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
  prezzo: z.object({ da: z.number().positive(), valuta: z.literal("EUR"), unita: z.enum(UNITA),
    iva: z.enum(["inclusa", "esclusa"]), validoFino: Data }).strict().optional(),
}).strict();
const Foto = z.object({
  file: z.string().regex(/^(img\/lavoro-\d+\.jpg|traffico\/foto\/f\d{2}\.jpg|logo\/fornito-[\w.-]+\.png)$/),
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
  ingressi: z.object({ contestoSha: Sha, briefSha: Sha, datiSha: Sha.nullable(), fotoSha: Sha.nullable(), lavoriSha: Sha.nullable(),
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
    areaServita: voce(z.literal("area-servita"), z.object({ comuni: z.array(z.object({ istat: Istat, nome: z.string().min(1),
      sigla: z.string().regex(/^[A-Z]{2}$/), km: z.number().int().min(0).nullable() }).strict()).min(1).max(20),
      indirizzoVisibile: z.boolean().nullable() }).strict()).nullable(),
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
    zona: z.enum(["letta", "non-configurata", "ditta-individuale", "sede-non-risolta"]),
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
     2 areaServita: istat unici · servizi: nomi normalizzati unici
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
  label, esegui)` (T3/T4); rifiuta solo lo stesso id vivo (Maps SERP: 2.000 chiamate/min, nessun conflitto con la mappa).
- **Ingressi**: la route legge e valida tutto prima di avviare; `motivoBloccoScheda` restituisce la frase o `null`.

| Fase (`phase`) | Cosa fa | Testo tipico |
|---|---|---|
| Controllo dei dati | schemi di contesto (verificato), dati, foto, mappa, dataset T6a, dizionario, lessico; forma giuridica; chiavi; sede; stima e saldo | «Società · sede risolta · 5 ricerche dalla mappa · stima 0,11 $ · saldo 48,20 $» |
| La scheda del cliente | `schedaPubblica` di T3 (cache), controllo d'identità | «Scheda trovata: il telefono coincide» · «Non trovata nelle ricerche lette» · «Saltata: ditta individuale» |
| Schede della zona | ≤ 25 SERP Maps, 5 in parallelo | «SERP 10/25 · dalla cache 15» |
| Dettaglio delle schede | ≤ 10 My Business Info per `cid` (i primi per miglior rank pesato) | «10 schede lette» |
| Categorie e servizi | §4-§5, orari, area, telefono, foto, controllo HTTP del sito | «Primaria: Impresa edile · 7 aggiuntive · 2 da decidere · 24 servizi · 10 foto» |
| gbp-description-writer | §6 (saltata con ingressi invariati) | testo e strumenti della fase |
| Controlli sulla descrizione | gate §6.3 | «11 controlli: 1 da correggere (descrizione-keyword)» |
| gbp-description-critic (round n) | critico | verdetto |
| gbp-description-writer (correzioni round n) | correzioni | — |
| Scrittura della scheda | `unisciStati`, piano, schema, scrittura atomica (tmp + rename) | → `done` con `traffico/scheda-consigliata.json` |

**Errori** (messaggi in italiano, mai credenziali, mai dati personali):

| Causa | Comportamento | Messaggio |
|---|---|---|
| `ErroreDfs` `auth` | stop, nessun file | «DataForSEO ha rifiutato login o password: controllali in Impostazioni → Chiavi API.» |
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
decidere, 8-30 servizi (Cavaliere 24), descrizione 400-750 caratteri, 0-14 fasce orarie, 0-20 comuni, 0-10 foto, 0-7 social.

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
│ Contatti · Posizione e aree · Orari · Servizi (24) · Link · Foto (10)                        │
│ ▸ Piano di inserimento: 8 giorni · un campo principale al giorno                             │
│ ▸ Mancano (3): orari · area servita · indirizzo visibile                                     │
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
- **Liste lunghe**: servizi e categorie una riga per voce con la propria copia; area servita come elenco di comuni ognuno copiabile
  («Monza»); orari in lettura («lun–ven 8:00–12:00 · 13:30–18:00»), senza copia (Google usa selettori d'ora); foto come miniature
  64 px `rounded-ctl` con numero d'ordine, tipo, motivo e «Scarica» (`<a download>` sulle route esistenti o su quella del logo).
- **Descrizione**: testo intero, contatore `mono` «612/750», verdetto del critico in una riga, rilievi in `<details>`. «Modifica…»
  (`btnGhost`) apre in linea una textarea con contatore dal vivo e `useUnsavedGuard`; «Salva e approva» esegue i gate lato server,
  errori in `role="alert"` con l'id del controllo e la frase. «Approva la descrizione» è la **primaria** della sezione quando la
  scheda è pronta e la descrizione non è approvata.
- **Piano di inserimento** e **Mancano**: `<details>` chiusi di default; il piano elenca «Giorno 1: Categorie aggiuntive, Servizi»;
  i mancanti dicono cosa serve e dove si ottiene.
- **Una sola primaria nella pagina**: la pagina calcola chi ha la primaria; se la card Sito ne mostra una (T3, T4), quella della
  Scheda si rende `btnSecondary`.
- **Aggiorna…** → `ConfirmDialog` tono brand: «Aggiornare la scheda consigliata?» · «Le schede della zona lette negli ultimi 14 giorni
  vengono dalla cache; il resto costa al massimo circa {stima} $. La descrizione resta se i suoi dati non sono cambiati, altrimenti
  si riscrive col piano Max. Voci già segnate non si perdono.»
- **In preparazione**: fase da `useRuns()` (`kind === "traffico" && slug && step === "scheda"`), tempo `mono aria-hidden`, «Puoi
  chiudere la pagina: il lavoro continua.»; alla sparizione del run `router.refresh()`, focus sull'h3. Stop dalla status bar (sfera
  per le fasi delle due skill, chip per le altre).

| Stato | Badge | Cosa si legge | Primaria | Secondarie |
|---|---|---|---|---|
| da preparare | `brand` Da preparare | «Categorie, servizi, descrizione, orari, foto e link da inserire a mano nella scheda del cliente, ciascuno con fonte e motivo. Costo stimato circa {stima} $.» | **Prepara la scheda consigliata** | — |
| **non configurata** (chiavi DataForSEO assenti) | `brand` Da preparare | `Banner warn` «Senza DataForSEO le categorie si scelgono solo dai servizi, senza guardare le schede della zona. Login e password vanno in Impostazioni → Chiavi API.» | **Prepara la scheda consigliata** | — |
| **ditta individuale** | `brand` Da preparare | riga `text-sm`: «Ditta individuale: il nome è un dato personale, quindi le schede della zona non si leggono su DataForSEO (decisione T3). Categorie dai soli servizi.» | **Prepara la scheda consigliata** | — |
| **senza mappa query** | come lo stato di base | riga `text-sm`: «Ricerche su cui puntare non calcolate (servizio Sito spento o mappa assente): la zona si legge con 5 ricerche di base dai servizi, senza volumi.» | invariata | — |
| bloccata (contesto assente o non verificato · `client.json` illeggibile) | `err` Bloccata | frase col motivo, `aria-describedby` sul bottone disabilitato (regola T0) | disabilitata | — |
| **in corso** | `brand` In preparazione | fase + tempo + frase | — | — |
| **pronta**, descrizione da approvare | `warn` Descrizione da approvare | meta + gruppi | **Approva la descrizione** | Aggiorna… · Modifica… |
| **pronta** | `ok` Pronta | meta + gruppi | — | Aggiorna… |
| descrizione non promossa dal critico | `warn` Descrizione da rivedere | `Banner warn` «Il critico non l'ha promossa dopo 3 giri: leggi i rilievi prima di approvarla.» | **Approva la descrizione** | Modifica… · Aggiorna… |
| descrizione non pronta (gate FAIL) | `warn` Descrizione mancante | nel campo: `Banner err` con i controlli falliti | — | Aggiorna… · Modifica… |
| dati insufficienti | invariato | nel gruppo Informazioni: «Solo N schede nella zona: categorie scelte soprattutto dai servizi.» | invariata | — |
| da aggiornare (sha cambiati) | `warn` Da aggiornare | `Banner warn` con i file cambiati in `mono` (contesto.json, dati.json, mappa-query.json, copy.json, lib/scheda-categorie.json, dominio) | **Aggiorna…** | — |
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
| `site-factory-editor/lib/scheda-consigliata.ts` | A | schema §7, `punti`, `clienteNellaSerp`, `punteggiCategorie`, `testE`, `scegliCategorie`, `serviziScheda`, `orariScheda`, `areaScheda`, `telefonoScheda`, `sitoScheda` (URL e UTM; il controllo HTTP lo fa il lavoro), `fotoScheda`, `pianoInserimento`, `unisciStati`, `vistaScheda` (modello per la UI + staleness), `motivoBloccoScheda`, `stimaCostoUsd`, `EVIDENZA`, `RISCHIO`; puro, import `.ts` |
| `site-factory-editor/lib/scheda-descrizione.ts` | A | `componiIngressi`, `ingressiSha`, `BozzaSchema`, `ReviewDescrizioneSchema`, `gateDescrizione`, `gateDescrizioneMattia`, `CLAIM_RISCHIO`, prompt delle 3 fasi; puro salvo `slopDescrizione` (spawn di `check-slop.mjs` su file temporaneo) |
| `site-factory-editor/lib/scheda-lavoro.ts` | A | lettura ingressi, generatore delle fasi §8, chiamate DataForSEO, controllo HTTP del sito, fasi `claude -p` via `ioWithSignal`, scritture atomiche, `approvaDescrizione`, `salvaDescrizioneMattia` |
| `site-factory-editor/lib/scheda-categorie.json` | A | dizionario §4.1 |
| `site-factory-editor/lib/dataforseo.ts` | M | `serpMaps({keyword, coordinata})`, `infoScheda({cid, coordinata})`, TTL 14 giorni e pulizia dei file scaduti per i due endpoint, endpoint nella lista dei pagati |
| `site-factory-editor/lib/mappa-query.ts` | M, solo se T4 vi lascia `ENDPOINT_PAGATI`/`RigaCostoSchema` | due endpoint e `lavoro: "scheda"` nelle costanti delle righe di costo; nient'altro |
| `site-factory-editor/lib/run-bus.ts` | M, solo se T3/T4 chiudono i lavori in un'unione | `"scheda"` nell'unione dei lavori |
| `site-factory-editor/lib/agenti.ts` | M | regola `/gbp-description-writer/` → agente `copy`; `nomeStep` «Traffico · scheda» |
| `site-factory-editor/app/api/clients/[slug]/traffico/scheda/route.ts` | A | `POST {azione:"prepara"}` → 202 `{id}` · `POST {azione:"approva-descrizione", generataAt}` → 200 · `PUT {descrizione, generataAt}` → 200 / 422 `{gate}`; 400 slug o corpo · 403 `Sec-Fetch-Site` · 415 content-type · 404 cliente · 409 `client.json` illeggibile, Scheda non attiva, contesto assente o non verificato, lavoro in corso, scheda assente o cambiata (`generataAt` diverso), descrizione assente |
| `site-factory-editor/app/api/clients/[slug]/traffico/scheda/logo/route.ts` | A | `GET` del logo fornito (`logo/fornito-*.png`, il più recente), sola lettura, allow-list sul nome (dubbio 5) |
| `site-factory-editor/components/traffico-scheda.tsx` | A | sezione §9 (client: azioni, dialog, fase live, copia, modifica della descrizione) |
| `site-factory-editor/app/traffico/[slug]/page.tsx` | M | legge scheda, vista e blocco; monta `TrafficoScheda` nella card Scheda; primaria unica della pagina; `CONTENUTI.scheda` aggiornato |
| `.claude/skills/gbp-description-writer/SKILL.md` | A | §6.1 |
| `.claude/skills/gbp-description-critic/SKILL.md` | A | §6.1, §6.4 |
| `site-factory-editor/scripts/test-scheda-consigliata.ts` | A | banco §12 |
| `site-factory-editor/scripts/fixtures/scheda-consigliata/` | A | `contesto.json` (servizi e macro di Cavaliere, niente dati personali), `brief.json` sintetico (telefono e P.IVA di prova), `dati.json` e `foto.json` verificati, `mappa-query.json`, `copy.json`, `copy-coverage.json`, `site.json` ridotto, `lavori.json`; `impresa-idraulica/` (ditta individuale) e `serramenti/` (società, 3 schede nella zona); `risposte/maps-*.json` (5 query, forma documentata), `mbi-cliente.json`, `mbi-competitor-*.json` (3), errori riusati da T4; `descrizione/` (ingressi, bozze che passano e che falliscono, review) |
| `site-factory-editor/DESIGN-BRIEF.md` | M | sezione «Scheda consigliata (shape — 2026-09-14)» |
| `docs/traffico/piano-G1.md` | M | Calibrazione, Verifica, chiusura |
| `docs/traffico/README.md` | M | §7 G1; §3 nota su `cache-api.json` rinviata |
| `docs/handoff-fase-c.md` | M | stato G1 |
| `docs/DEBUG.md` | M | righe §13 |

Fixture fuori git: `site-renderer/out/zz-test-g1/` (`client.json` con Scheda attiva e dominio finto, contesto verificato, brief,
`traffico/dati.json` verificato, `lavori.json` + 3 `img/lavoro-N.jpg` di prova) e `zz-test-g1-ditta/`, nel Cestino a fine fase 4.

Non si toccano: `lib/steps.ts`, `lib/catena.ts`, `lib/build.ts`, `lib/deploy.ts`, `lib/schemas.ts`, `lib/traffico.ts`, `lib/clients.ts`,
`lib/staleness.ts`, `lib/run-step.ts`, `lib/slop.ts`, `lib/legale.ts`, `lib/logo.ts`, `lib/secrets.ts`, `app/api/setup/keys/route.ts`, i file
di T3 (`lib/dati-traffico*.ts`, `lib/precompila-*.ts`) e di T4 salvo le costanti dichiarate sopra, `.claude/skills/copy-critic/**`,
renderer, `site-intake/`, n8n.

## 11. Perimetro per `.claude/scope.json` (primo atto della fase 2, a T3 e T4 chiusi e perimetro libero)

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

**M0 — Precondizioni (nessun codice).** T3 e T4 chiusi e committati (`lib/dataforseo.ts` con cache e costi, `lib/mappa-lessico.json`,
`lib/dati-traffico.ts`, `startTrafficoRun`, `kind: "traffico"` in `agenti.ts`); T6a committato; `scope.json` libero. Dove vivono
`ENDPOINT_PAGATI`/`RigaCostoSchema` e se i lavori sono un'unione chiusa (decide le due voci condizionali). Rilettura in
`node_modules/next/dist/docs/` di `route.md`, `dynamic-routes.md`, `use-router.md`. `git log --oneline -5`, `git status --short`.

**M1 — Regole pure.** `scheda-consigliata.ts`, dizionario, fixture, banco casi 1-17 e 27-30. Verifica: banco verde, `npx tsc --noEmit`.

**M2 — Descrizione.** `scheda-descrizione.ts`, due skill, banco casi 18-24. Verifica: banco, `tsc`; una prova reale `claude -p` delle due
skill sugli ingressi della fixture (bozza valida per `BozzaSchema`, review valida). **Commit 1** (M1+M2) + push.

**M3 — Lavoro e route.** `scheda-lavoro.ts`, estensioni di `dataforseo.ts` (e costanti condizionali), `agenti.ts`, route; banco casi 25-26,
31-36. Verifica sul dev server (:3311) con `zz-test-g1` e `SF_DATAFORSEO_REGISTRATE=scripts/fixtures/scheda-consigliata/risposte`:
(1) `prepara` → 202, le fasi di §8 nella status bar, scheda valida, righe di costo; (2) secondo `prepara` → scheda uguale salvo `generataAt`,
nessuna riga di costo, nessuna fase `claude -p`; (3) `approva-descrizione` → `approvataAt`, poi `prepara` → approvazione conservata;
(4) `PUT` con un URL → 422 con `descrizione-link`; (5) `zz-test-g1-ditta` → zero chiamate DataForSEO (spia sul trasporto), zona
`ditta-individuale`; (6) senza chiavi né variabile → zona `non-configurata`, scheda scritta; (7) risposte 40210 → errore «Credito…»,
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
9. Primaria senza dati (ditta individuale, 3 schede): `primariaDiSettore`; `datiInsufficienti: true`.
10. Primaria attuale diversa: attuale che passa → `conferma`; non passa e 1,6× → `modifica` + `riverifica`; non passa e 1,2× → `solo-controllo`.
11. Aggiuntive: 12 che passano → 9 + 3 in `categorieDaDecidere` «oltre il limite»; ordine deterministico; permutare gli item SERP non cambia nulla.
12. Fixture Cavaliere: primaria `general_contractor`; `plumber` ed `electrician` da decidere; nessuna aggiuntiva senza `servizioReale`.

Servizi, campi, foto, piano
13. Servizi: priorità prima; categoria per prova o primaria; nome del contesto intatto; nome con «a Monza» → escluso con avviso; prezzo scaduto → assente; «forse predefinito» solo con ≥ 3 schede.
14. Orari da `dati.json` (2 gruppi) → fasce ordinate; `dati.json` da verificare → `orari: null` + mancante.
15. Area servita: 25 comuni → 20 per distanza con la sede prima; `indirizzoVisibile: null` + mancante.
16. Sito: URL con UTM; senza dominio → `null` + mancante. Foto: `hero.jpg` e `card-*.jpg` mai candidate; 200 px → esclusa; copertina orizzontale della priorità 1; massimo 10.
17. Piano: ≤ 2 sezioni non core al giorno; una core al giorno; primaria ultima; voci `conferma` con `giorno: 0`.

Descrizione
18. `componiIngressi`: ogni fatto ha `rif` valido; attestati solo pubblicabili; `ingressiSha` stabile e indipendente da `precedente`.
19. Gate: i 17 casi che falliscono di §6.3, uno per uno, con l'id atteso.
20. Gate: i 5 casi che passano di §6.3.
21. `descrizione-copia-sito`: 6 parole del titolo hero → FAIL; 5 parole → PASS; descrizione di un altro cliente dello stesso settore → FAIL, di un altro settore → PASS.
22. `slopDescrizione`: frase bandita della lista → FAIL; testo pulito → PASS (script vero, file temporaneo cancellato).
23. `gateDescrizioneMattia`: senza `fatti` passa; con un telefono fallisce.
24. Schemi: `BozzaSchema` e `ReviewDescrizioneSchema` su fixture valide e rotte.

Lavoro (trasporto e IO finti)
25. Sequenza delle fasi; `done` con l'artifact; bozza scritta da un IO finto che simula PASS al secondo round del critico → `round: 2`.
26. Ingressi invariati → nessuna chiamata a `io.claude`; approvazione conservata.
31. Ditta individuale → zero chiamate al trasporto DataForSEO, zona `ditta-individuale`.
32. Senza chiavi → `configurata()` false, zona `non-configurata`, nessuna eccezione, scheda valida.
33. 40210 → un solo `error`, nessun file scritto; saldo < 2 × stima → errore prima di ogni chiamata pagata.
34. Tre giri di critico FAIL → descrizione con `verdetto: "FAIL"`; gate ancora FAIL dopo 2 correzioni → `descrizione: null` + mancante.
35. `costi.ndjson`: una riga per chiamata pagata col `cost`; cache → nessuna riga; nessuna credenziale né nome di competitor nelle righe o nei messaggi.
36. `agenteDaFase("gbp-description-writer (correzioni round 1)", "scheda", "traffico")` → `copy`, sfera; «gbp-description-critic (round 2)» → `critico`; «Schede della zona» → chip `script`.

Schema e stati
27. Scheda della fixture valida; voce senza fonti → FAIL; `api-gbp` con valore al posto del puntatore → FAIL; modalità pubblica con `serviceTypeId` → FAIL.
28. Piano incoerente (due core lo stesso giorno, voce da inserire assente dal piano) → FAIL.
29. `unisciStati`: stessa voce e stesso consigliato → stato `fatto` conservato; consigliato cambiato → `da-fare`, note conservate.
30. Determinismo: pipeline completa due volte con trasporto finto → uguale salvo `generataAt`; input permutati → uguale. `vistaScheda`: cambio di sha di contesto, dati, mappa, copy, dizionario o dominio → «Da aggiornare» con l'elenco dei file.

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
| Servizio Scheda senza Sito (niente `dati.json`, niente mappa) | lessico al posto della mappa; campi senza fonte in `mancanti` con la via per ottenerli; dubbio 3 |
| Collisione con T3 e T4 (stessi file) | fase 2 dopo T3 e T4 chiusi (M0); voci condizionali del perimetro verificate prima di scrivere |
| Etichette diverse dall'interfaccia di Google | confronto a vista in C6 prima di chiudere la UI |

## 15. Dubbi che richiedono una decisione (proposta tra parentesi)

1. **Ditte individuali**: nessuna chiamata DataForSEO neppure per le schede della zona, che usano query di servizio e il centro del
   comune senza il nome del cliente (sì per ora, come il brief; riaprire quando T3 M6 chiude la qualifica di DataForSEO).
2. **Senza chiavi DataForSEO**: la scheda si prepara lo stesso con le categorie dai soli servizi (sì) oppure resta bloccata.
3. **Scheda attiva senza Sito**: orari, comuni e prezzi arrivano solo dal modulo di T3, che richiede il Sito; G1 li elenca in
   «Mancano» (sì); aprire il modulo T3 anche col solo servizio Scheda è un cambio di T3 da decidere a parte.
4. **Business Profile API e `cache-api.json`** rinviate a quando esistono approvazione e credenziale OAuth su n8n (sì: G1 solo modalità pubblica).
5. **Logo sulla scheda**: solo il file fornito dal cliente; il marchio generato con GPT Image no, per coerenza con «nessuna foto AI» (sì).
6. **Descrizioni dei singoli servizi** (≤ 300): non generate in G1 (sì).
7. **Parametri iniziali**: zoom 17z, 5 punti a 2,5 km, `k_i` 0,5, soglia 1,5×, 5 competitor minimi, 10 foto, 2 sezioni al giorno, fino a C3-C6 (sì).
8. **Spesa di calibrazione** circa 0,30 $ (test 1-3 della ricerca ≈ 0,09 $, due preparazioni vere ≈ 0,22 $ su `zz-test-g1` e Cavaliere) (sì, dopo M4).
9. **`locations.patch?validateOnly=true`**: non costruito (sì).
10. **Descrizione modificata da Mattia**: gate ridotti senza i fatti per frase, fonte «mattia», salvare = approvare (sì).
11. **Descrizione in prima persona plurale** (sì, da confermare in C5 sulle prime 6 descrizioni).

## Calibrazione

*(fase 3 — con chiave e ok alla spesa: C1 test 1 della ricerca, chiave `gcid:` e ordine di `category_ids` su 5 schede note; C2 test 2,
campi di My Business Info su 5 schede italiane; C3 test 3, zoom 13z/15z/17z e rumore a +24 h; C4 categorie contro la scelta esperta di
Mattia su 3 casi (Cavaliere, `impresa-idraulica`, `serramenti`), atteso primaria 3/3 e aggiuntive con Jaccard ≥ 0,7; C5 critico della
descrizione contro il giudizio di Mattia su 6 descrizioni, atteso accordo ≥ 5/6; C6 etichette e ordine dei gruppi confrontati a vista con
l'interfaccia della scheda; C7 costo reale per preparazione da `costi.ndjson`. Senza chiave: protocollo pronto, stato «da calibrare con
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
