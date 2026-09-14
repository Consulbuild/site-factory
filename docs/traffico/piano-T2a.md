# Piano T2a — Motori avvisati al deploy e registro delle pubblicazioni

Stato: **fase 1 (piano) scritta il 2026-09-14**, da rivedere dall'orchestratore. Nessun codice toccato.
Fonti: `docs/traffico/README.md` (§1-§5), `docs/traffico/decisioni-piani.md`, `docs/traffico/brief-T2a.md`,
`docs/traffico/piano-T1a.md`, `~/knowledge/seo/ricerche-2026-09-14/w2-5-verifiche-tecniche.md`,
`docs/ricerca-traffico-2026-09.md` §3.2 e §6.1, `docs/traffico/ricerca-scheda-google-2026-09.md` §8; codice
indicato nel brief; documentazione ufficiale letta il 2026-09-14 (elenco in §15).

## 1. Contesto

Obiettivo: quando un sito con servizio Traffico «Sito» **attivo** va online col dominio, il software verifica
la proprietà su Google Search Console e Bing Webmaster Tools, invia la sitemap, avvisa IndexNow solo delle
pagine cambiate, lancia una prima misura PageSpeed e scrive una riga nel registro delle pubblicazioni. Senza
chiavi ogni motore resta «non configurata»; un motore giù non tocca mai un deploy già riuscito.

Fatti rilevati nel codice (2026-09-14):

- `lib/deploy.ts` `deployClientInner`: interlock (noindex, `siteUrl`, integrazioni, fondamenta) → `wrangler.jsonc`
  → `wrangler deploy` → `registraPubblicazione(dir)` in try/catch (solo se `build.fondamenta`) → patch di
  `steps.build.deploy` → `syncInfra` (awaited, mai lancia, esito in `steps.build.infra`) → spegnimento della demo.
  Chiamanti: la route `app/api/clients/[slug]/deploy/route.ts` (`maxDuration = 300`, rifiuta build non
  «verificato» o parziali) e `lib/catena.ts` (passo `deploy`). Nessuno dei due legge altro che `url`.
- `lib/fondamenta.ts`: `traffico/lastmod.json` = `{ pagine, pubblicate? }` (hash e lastmod per path);
  `registraPubblicazione` copia `pagine` in `pubblicate` e oggi restituisce `void`. Il confronto
  `pagine` ↔ `pubblicate` **prima** di quella copia è esattamente «le pagine cambiate da quanto è online».
  Chiave IndexNow in `traffico/indexnow.json` (`{ chiave, creataAt }`), `<chiave>.txt` nella dist.
- `lib/integrazioni.ts`: `http(url, init, timeoutMs)` = `fetch` con `AbortSignal.timeout` (15 s di default);
  `syncInfra` accumula errori in un esito e non lancia mai: è il modello.
- `lib/secrets.ts`: Keychain via `security -i` su stdin, valore `^[\x21-\x7E]{8,}$`. Il sorgente di
  `security` (apple-oss-distributions/Security, `SecurityTool/macOS/security.c`) legge ogni comando in un buffer
  `MAX_LINE_LEN 4096`: un JSON di service account (~2,4 KB, ~3,2 KB in base64) sta al limite e una scrittura
  troncata passerebbe la prova (fatta sul valore intero) ma salverebbe una chiave rotta.
- `app/api/setup/keys/route.ts`: `provaKey` per nome, poi `setSecret`. Il pannello `ApiKeysPanel`
  (`components/home.tsx`) itera `KNOWN_KEYS`: una chiave nuova compare senza toccare la UI; l'input è
  `type="password"`, che toglie gli a capo di un JSON incollato ma lascia gli spazi.
- `lib/schemas.ts`: `z.object` scarta le chiavi non dichiarate; `steps.build` ospita già le proiezioni del
  deploy (`deploy`, `deployErrore`, `infra`) e nessuno lo riscrive per intero. **`traffico` invece è
  riscritto per intero** dalla route traffico (`s.traffico = esito.traffico` con solo `sito` e `scheda`):
  uno stato dei motori lì dentro sparirebbe alla prima sospensione.
- `lib/traffico.ts` esporta `leggiTraffico`, `cicloAttivo(t, "sito")` (= attivo), `dataValida`.
- `instrumentation.ts` avvia un solo timer (`avviaSweepDemo`, ogni ora, guardia su `globalThis`).
- `app/traffico/[slug]/page.tsx` (server component): `SezioneServizio` con badge, frase delle date, avviso
  dominio, riquadri «Cosa comparirà qui / Cosa servirà». Il dominio mostrato è `steps.build.deploy?.dominio`.
- Un altro lavoro è aperto (`.claude/scope.json` «T1a-integrazione»): `lib/catena.ts`,
  `components/build-panel.tsx`, `components/pubblicazione-sito.tsx`, `components/traffico-azione.tsx`,
  `lib/traffico.ts`, `scripts/test-fondamenta.ts`, `docs/DEBUG.md`, `docs/traffico/**`. T2a non tocca nessuno
  di questi file di codice e parte solo dopo che quel perimetro è svuotato (README §6: mai in parallelo su
  `deploy.ts`).

Fuori da T2a: lettura dei dati Search Console, URL Inspection, CrUX, pannello dati (T2b); sensori sul VPS;
report (T8); pulizia di proprietà e record DNS all'eliminazione di un cliente; allineamento di `lastmod` al
deploy (limite dichiarato di T1a: la sitemap è già nella dist pubblicata, cambiarla dopo richiederebbe un
secondo deploy).

## 2. Decisioni motivate

### 2.1 Google: proprietà **Dominio** (`sc-domain:<zona>`) verificata con **DNS_TXT** via API Cloudflare

- **Tipo di proprietà.** `sc-domain:` copre `https`, `http`, apex e `www` in una sola proprietà: se un giorno il
  sito passa da apex a `www` (o il cliente scrive l'URL senza `s`), i dati non si spezzano. URL Inspection e
  Search Analytics (T2b) funzionano sulle proprietà Dominio. La sitemap `https://<dominio>/sitemap.xml` sta
  dentro la proprietà.
- **Metodo.** Le proprietà Dominio accettano solo `DNS_TXT`/`DNS_CNAME` (Site Verification API). Il TXT è anche
  la scelta migliore in sé:
  - **nessun token nella build**: niente rete in build, niente nuovo campo nell'interlock, nessun rebuild per
    verificare, `dist` a servizio spento intatta per costruzione;
  - funziona **subito dopo wrangler**, anche quando il certificato del dominio custom non è ancora pronto (un
    file o un meta andrebbero letti via HTTPS);
  - **non si perde** nei rebuild: Google ricontrolla periodicamente la verifica e un file o un meta andrebbero
    cotti per sempre in ogni build, con il rischio di perderli spegnendo le fondamenta.
  - Le zone dei clienti sono per forza nell'account Cloudflare dell'agenzia (i Custom Domain dei Workers lo
    richiedono): basta aggiungere al token esistente **Zone → Zone: Read** e **Zone → DNS: Edit** (§8, dubbio 3).
- **Dove nasce il token e quando entra.** `POST siteVerification/v1/token` al primo passaggio dei motori dopo
  wrangler; restituisce `google-site-verification=…`, che finisce **solo nel DNS della zona**, mai nella build
  né nel repo. Il TXT porta il commento Cloudflare «Site-factory: verifica Search Console, non cancellare».
- **Zona.** Dal dominio si provano i suffissi (`www.x.it` → `www.x.it`, poi `x.it`) con
  `GET /zones?name=…&account.id=…`; la zona trovata (stato `active`) dà `sc-domain:<zona>`.
- **Proprietario umano.** `webResource.insert` accetta `owners`; se il proprietario non risulta nella risposta,
  `PUT webResource/{id}` con l'**unione** della lista restituita e del proprietario (mai una lista che ne
  toglie uno). Il proprietario è una costante `PROPRIETARI_GOOGLE` in `lib/motori.ts` (dubbio 1). Per Search
  Console è un proprietario delegato: dipende dalla verifica del service account, quindi il TXT non va mai
  cancellato. Che la proprietà compaia da sola nell'elenco di Mattia va confermato nella prova dal vivo; in caso
  contrario Mattia la aggiunge dalla UI e risulta già verificata.
- **Proprietà già esistente (S0, fatta a mano da Mattia).** Nessun conflitto e nessun ramo speciale: più TXT
  `google-site-verification` convivono sulla stessa zona; il service account aggiunge il suo, diventa
  proprietario verificato della stessa proprietà Dominio, `sites.add` è idempotente, l'unione dei proprietari
  lascia Mattia com'è. Se in S0 Mattia ha creato una proprietà **prefisso URL**, resta sua e intatta; il software
  lavora sulla proprietà Dominio, che si affianca. Consiglio per S0: creare direttamente la proprietà Dominio.
- **Sitemap.** `PUT webmasters/v3/sites/{sc-domain}/sitemaps/{feedpath}` al primo passaggio e a ogni deploy con
  pagine cambiate (idempotente, nessun costo). **Mai** Indexing API né richieste di indicizzazione in massa
  (ricerca §3.2): nessuna chiamata di «submit URL» a Google, niente ping.

### 2.2 Bing: sito `https://<dominio>/` verificato con **CNAME** `<codice>.<dominio>` → `verify.bing.com`

- `GetUserSites` → se il sito manca `AddSite` (idempotente per documentazione) → di nuovo `GetUserSites` per
  `DnsVerificationCode` (forma documentata `<codice>.<host>`) → record CNAME **non proxato** su quel nome →
  `VerifySite` (`d: true|false`) → `SubmitFeed` con la sitemap.
- Stesse ragioni del TXT: niente build, nessun file da mantenere, funziona prima del certificato. La chiave API
  è per utente e vale su tutti i siti: i siti aggiunti compaiono **da soli** nell'interfaccia Bing di Mattia,
  nessun passo «proprietario» da fare.
- Caso già esistente (S0 o import da Search Console): `GetUserSites` lo restituisce `IsVerified: true` →
  niente `AddSite`, niente CNAME, solo `SubmitFeed`. Confronto per host, non per stringa (`http://x.it` e
  `https://x.it/` sono lo stesso sito).
- Il target `verify.bing.com` è in fonti di settore coerenti, non nella pagina ufficiale (non leggibile senza
  login): si conferma nella prova dal vivo. Il ripiego (meta `msvalidate.01` o `BingSiteAuth.xml`) richiederebbe
  la build e **non** è pianificato.
- **Niente `SubmitUrlBatch` né `GetUrlSubmissionQuota`**: gli URL cambiati arrivano a Bing con IndexNow (stesso
  indice, nessuna quota consumata); un doppio invio non aggiunge nulla. Niente Crawler Hints di Cloudflare
  (non documentato su Workers Static Assets, invii non verificabili, doppione di IndexNow diretto).

### 2.3 IndexNow: solo i cambiati, dal registro `lastmod`

- `registraPubblicazione(dir)` restituisce `{ cambiate, rimosse }` (path) confrontando `pagine` con le
  `pubblicate` **precedenti**, prima di sovrascriverle: pagina nuova o hash diverso → `cambiate`; presente in
  `pubblicate` e sparita → `rimosse` (IndexNow accetta anche gli URL eliminati). Primo deploy con fondamenta →
  tutte le pagine; ripubblicazione identica → `[]` → **nessun ping**, esito «saltato».
- Una sola `POST https://api.indexnow.org/indexnow` con `host`, `key` (da `traffico/indexnow.json`, mai
  rigenerata qui), `keyLocation = https://<dominio>/<chiave>.txt`, `urlList` assoluti. IndexNow non ha
  segreti: gira anche senza nessuna chiave dell'editor. Nessun ping a Google (non aderisce).
- 200 e 202 (chiave in validazione) = ok; 400/403/422 = errore senza ripetizione; 429, 5xx, timeout = in attesa
  con gli URL conservati in `daInviare` e riuniti a quelli del deploy successivo.

### 2.4 PageSpeed Insights: misura in background, mai nel tempo del deploy

- Una chiamata richiede 10-40 s: per pagine × {mobile, desktop} rallenterebbe il deploy di minuti. Parte **60 s
  dopo** il passaggio (propagazione e certificato), in sequenza, timeout 90 s per chiamata.
- Pagine = chiavi di `pubblicate` (le indicizzabili appena pubblicate), `category=performance`.
- Chiave nell'header `X-Goog-Api-Key`, mai in query (documentazione Google Cloud: in URL è esposta).
- Si salva **solo il segnale** in `traffico/psi.json` (sovrascritto): per URL e strategia punteggio, LCP, CLS,
  TBT, FCP (valori numerici), dati di campo CrUX se presenti (percentile e categoria di LCP, INP, CLS),
  `lighthouseVersion`, `analysisUTCTimestamp`, `runtimeError` se c'è. Mai il JSON Lighthouse intero (~1 MB).
  Una riga compatta per pagina anche in `motori.ndjson`: è lo storico per T2b.

### 2.5 Quando girano i motori

- Solo dopo un wrangler riuscito di una build con **fondamenta cotte** (`build.fondamenta`), con dominio uguale a
  `build.fondamenta.dominio` e servizio **attivo** (`cicloAttivo`). Percorso demo, servizio spento, build senza
  dominio: nessuna chiamata, nessuna riga, nessuna cartella `traffico/` creata (T1a: a servizio spento nulla
  cambia).
- **Sospeso**: le fondamenta restano online (decisione 11) ma «si ferma il ciclo» → nessuna chiamata esterna;
  la riga del registro si scrive lo stesso (è un fatto utile al rollback) con i motori «saltato: servizio
  sospeso» (dubbio 5).
- `chi` = `"manuale"` (route **e** catena: in entrambi i casi l'ha avviato Mattia) oppure `"volano"` (T7b).
  `deployClient(slug, chi = "manuale")`: nessun chiamante cambia oggi.

### 2.6 Il passaggio nel deploy è atteso ma con tetto; le ripetizioni vanno a un timer

- Google, Bing e IndexNow girano **in parallelo** con un **budget totale di 30 s** e 10 s per chiamata (tipico:
  2-6 s al primo aggancio, 1-2 s dopo; paragonabile al `git push` di `syncInfra`). Così la riga del registro
  nasce con gli esiti veri del primo tentativo, scritta in modo sincrono, senza stati «in corso» da ricucire.
- **Nessuna attesa dentro il deploy**: una verifica che non passa subito (DNS in propagazione: la Site
  Verification API risponde 400 e Google suggerisce backoff esponenziale) diventa `in_attesa` con `riprovaDopo`.
- Un timer (`lib/motori-ripresa.ts`, ogni 15 min, primo giro 2 min dopo l'avvio, stessa guardia su `globalThis`
  del sweep demo) riprende i motori `in_attesa` scaduti e i `non_configurata` la cui chiave ora c'è. Salvare una
  chiave dei motori (o il token Cloudflare) dal pannello forza subito una ripresa, anche degli `errore`.
- Backoff dopo il fallimento n. 1…9: 15 min, 30 min, 1 h, 2 h, 4 h, 8 h, 12 h, 24 h, 24 h (circa tre giorni in
  tutto); al decimo fallimento `errore` con il motivo e l'azione (valori da calibrare, §Calibrazione). Un lucchetto per slug (mappa su `globalThis`) impedisce che deploy e
  timer lavorino insieme sullo stesso cliente.

## 3. Sequenza esatta dopo wrangler

In `deployClientInner`, ordine finale (le righe marcate NUOVO sono le sole aggiunte):

1. `wrangler deploy` (invariato).
2. NUOVO: `diff = build.fondamenta ? registraPubblicazione(dir) : null` nel try/catch esistente (errore → `diff`
   resta `null`, IndexNow «errore: registro lastmod illeggibile»).
3. Patch di `steps.build.deploy`, `syncInfra`, spegnimento demo (invariati).
4. NUOVO: `if (build.fondamenta) await avvisaMotori({ … }).catch(() => undefined)`: non lancia mai per
   contratto (tutto è già catturato dentro), il `.catch` è la seconda rete. Il `return` resta identico.

`avvisaMotori` (in `lib/motori.ts`), con `adesso` unico per tutto il passaggio:

| # | Passo | Chiamata esatta | Timeout · esito |
|---|---|---|---|
| A | lucchetto dello slug; se il dominio di `motori` è diverso dal dominio attuale → stato motori nuovo `{ dominio }` | — | — |
| B | servizio non attivo → tutti «saltato», salta a H | — | — |
| C | chiavi assenti → motore `non_configurata` (IndexNow no: non ne ha) | — | — |
| D1 | token Google (memo fino a scadenza − 5 min) | `POST https://oauth2.googleapis.com/token`, `application/x-www-form-urlencoded`, `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<JWT>` (§6) | 10 s · 400 `invalid_grant` → errore «chiave del service account non valida o revocata» |
| D2 | zona (promise condivisa con Bing) | `GET https://api.cloudflare.com/client/v4/zones?name=<suffisso>&account.id=<account>` per ogni suffisso con ≥ 2 etichette | 10 s · nessuna zona o stato ≠ `active` → errore; 403 → errore «il token Cloudflare non ha Zone: Read» |
| D3 | se `google.verificatoAt` manca: token di verifica | `POST https://www.googleapis.com/siteVerification/v1/token` `{ "site": { "type": "INET_DOMAIN", "identifier": "<zona>" }, "verificationMethod": "DNS_TXT" }` | 10 s |
| D4 | TXT presente? | `GET /zones/<id>/dns_records?type=TXT&name.exact=<zona>`; confronto sul contenuto senza virgolette | 10 s |
| D5 | se assente: TXT | `POST /zones/<id>/dns_records` `{ "type": "TXT", "name": "<zona>", "content": "\"<token>\"", "ttl": 1, "comment": "Site-factory: verifica Search Console, non cancellare" }`; codice 81058 (record identico) = ok | 10 s · 403 → errore «il token Cloudflare non ha DNS: Edit» |
| D6 | verifica | `POST https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT` `{ "site": { "type": "INET_DOMAIN", "identifier": "<zona>" }, "owners": PROPRIETARI_GOOGLE }` | 10 s · 200 → `verificatoAt`, `webResourceId`; 400 → `in_attesa` (propagazione) |
| D7 | proprietà nel Search Console del service account | `PUT https://www.googleapis.com/webmasters/v3/sites/sc-domain%3A<zona>` senza corpo | 10 s |
| D8 | sitemap, se `sitemapAt` manca o ci sono pagine cambiate | `PUT https://www.googleapis.com/webmasters/v3/sites/sc-domain%3A<zona>/sitemaps/<encodeURIComponent(https://<dominio>/sitemap.xml)>` senza corpo | 10 s · 403 dopo una verifica riuscita → `verificatoAt` tolto, `in_attesa` (TXT sparito: si riverifica) |
| D9 | proprietario, se non è nella lista di D6 | `GET` della risorsa non serve: si usa la lista di D6 → `PUT https://www.googleapis.com/siteVerification/v1/webResource/<encodeURIComponent(id)>` `{ site, owners: unione }` | 10 s · errore qui non annulla D6-D8 |
| E1 | Bing: siti dell'utente | `GET https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=<chiave>` → `{ "d": [ { Url, IsVerified, AuthenticationCode, DnsVerificationCode } ] }` | 10 s |
| E2 | se manca | `POST …/json/AddSite?apikey=…` `{ "siteUrl": "https://<dominio>/" }`, poi di nuovo E1 | 10 s |
| E3 | se non verificato: CNAME | `GET /zones/<id>/dns_records?type=CNAME&name.exact=<DnsVerificationCode>`; se assente `POST` `{ "type": "CNAME", "name": "<DnsVerificationCode>", "content": "verify.bing.com", "proxied": false, "ttl": 1, "comment": "Site-factory: verifica Bing, non cancellare" }` | 10 s |
| E4 | verifica | `POST …/json/VerifySite?apikey=…` `{ "siteUrl": "https://<dominio>/" }` → `d: true` → `verificatoAt`; `false` → `in_attesa` | 10 s |
| E5 | sitemap, se `sitemapAt` manca o ci sono pagine cambiate | `POST …/json/SubmitFeed?apikey=…` `{ "siteUrl": "https://<dominio>/", "feedUrl": "https://<dominio>/sitemap.xml" }` | 10 s |
| F | IndexNow, se `cambiate ∪ rimosse ∪ daInviare` non è vuoto | `POST https://api.indexnow.org/indexnow`, `Content-Type: application/json; charset=utf-8`, `{ "host", "key", "keyLocation", "urlList" }` (≤ 10.000 URL) | 10 s |
| G | budget | D, E, F in `Promise.allSettled`; ogni chiamata ha timeout `min(10 s, budget residuo)` passato a `http()` | 30 s totali; scaduti → `in_attesa` |
| H | riga del registro (solo se è un deploy, non nelle riprese) | append su `traffico/registro.ndjson` | sincrono, try/catch |
| I | righe di log | append su `traffico/motori.ndjson`, una per chiamata | sincrono, try/catch |
| J | stato | `salva(muta)` → `patchClientState` su `steps.build.motori` | try/catch |
| K | PSI | se c'è la chiave: `psi` `in_attesa` con `deploy = id`, `setTimeout(…, 60 s).unref()` → `misuraPsi`; per ogni pagina e strategia `GET https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&strategy=mobile|desktop&category=performance` con `X-Goog-Api-Key` | 90 s per chiamata · scrive `psi.json`, patch del solo campo `psi` |

Classificazione comune degli errori (una funzione): rete o timeout, 429, 5xx, Bing `ThrottleUser`(4)/`ThrottleHost`(5)
→ `in_attesa`; 400/401/403/404/422 e Bing `InvalidApiKey`(3), `NotAuthorized`(14), `InvalidUrl`(7) → `errore`,
tranne i due casi documentati come transitori (D6 400 = TXT non ancora visto, E4 `d: false`). Google restituisce
`error.details[].reason` (`API_KEY_INVALID`, `SERVICE_DISABLED`): il messaggio li traduce in un'azione
(«abilita la Site Verification API nel progetto Google Cloud»).

## 4. Schema degli esiti in `client.json` e del registro NDJSON

### 4.1 `steps.build.motori` (in `lib/schemas.ts`, accanto a `infra`)

```ts
const EsitoMotore = z.object({
  stato: z.enum(["non_configurata", "in_attesa", "ok", "errore", "saltato"]),
  /** Ultimo tentativo, riuscito o no. */
  at: z.string(),
  /** Frase leggibile con l'azione da fare; già priva di segreti. */
  messaggio: z.string().optional(),
  /** Fallimenti consecutivi (backoff); assente dopo un successo. */
  tentativi: z.number().optional(),
  riprovaDopo: z.string().optional(),
});
/** Motori di ricerca avvisati dopo i deploy con fondamenta (servizio Traffico «Sito», lib/motori.ts). */
motori: z.object({
  /** Dominio a cui valgono gli esiti: un cambio di dominio li azzera. */
  dominio: z.string(),
  google: EsitoMotore.extend({
    proprieta: z.string().optional(),       // "sc-domain:x.it"
    webResourceId: z.string().optional(),
    verificatoAt: z.string().optional(),
    proprietarioAt: z.string().optional(),
    sitemapAt: z.string().optional(),
  }).optional(),
  bing: EsitoMotore.extend({ verificatoAt: z.string().optional(), sitemapAt: z.string().optional() }).optional(),
  indexnow: EsitoMotore.extend({
    inviatoAt: z.string().optional(),
    urlInviati: z.number().optional(),
    daInviare: z.array(z.string()).optional(),
  }).optional(),
  psi: EsitoMotore.extend({ deploy: z.string().optional(), misurataAt: z.string().optional() }).optional(),
}).optional(),
```

Perché qui e non in `traffico`: la route traffico riscrive `traffico` con i soli `sito` e `scheda`; `steps.build`
ospita già `deploy` e `infra` e nessuno lo riscrive per intero. L'area Traffico legge già `steps.build.deploy`.

### 4.2 `out/<slug>/traffico/registro.ndjson` (append-only, una riga per deploy con fondamenta)

```json
{"v":1,"id":"2026-09-20T10:12:31Z","quando":"2026-09-20T10:12:31Z","chi":"manuale","dominio":"x.it","worker":"slug","builtAt":"2026-09-20T09:58:02.114Z","urlCambiati":["https://x.it/"],"urlRimossi":[],"siteJson":{"prima":null,"dopo":"<sha256>"},"servizio":"attivo","motori":{"google":{"stato":"in_attesa","messaggio":"verifica DNS in propagazione"},"bing":{"stato":"ok"},"indexnow":{"stato":"ok","http":202,"url":1},"psi":{"stato":"in_attesa","messaggio":"misura avviata"}}}
```

- `id` = `quando` = istante del deploy (W3C, UTC, senza millisecondi); `builtAt` lega la riga alla build.
- `siteJson.dopo` = sha256 dei byte di `out/<slug>/site.json` al deploy (la route pubblica solo build
  «verificato»: una build successiva, riuscita o fallita, toglie quello stato); `prima` = `dopo` dell'ultima riga
  leggibile, `null` se non ce ne sono. Righe illeggibili saltate, mai riscritte.
- `urlCambiati`/`urlRimossi` = `null` se il registro lastmod non era leggibile.
- `motori` = esiti **del primo tentativo** (stato, messaggio breve, `http` per IndexNow). Gli esiti successivi
  delle riprese stanno in `client.json` e in `motori.ndjson`: la riga racconta cosa è successo alla
  pubblicazione e non si modifica (dubbio 4).
- Nessun dato personale, nessun segreto, nessun corpo di risposta.

### 4.3 `out/<slug>/traffico/motori.ndjson` (log di debug: una riga per chiamata)

`{"quando","deploy":"<id>|null","motore":"google|bing|indexnow|psi|cloudflare","azione":"token|zona|txt|verifica|proprieta|sitemap|proprietario|sito|cname|feed|invio|misura","http":200,"ms":412,"esito":"ok|in_attesa|errore","messaggio"?}`
— messaggio redatto e troncato a 300 caratteri; per `misura` anche il riassunto numerico della pagina.

## 5. Chiavi e prove

| Chiave (`KNOWN_KEYS`) | Etichetta | Formato salvato | Prova in `provaKey` |
|---|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT` | Google Cloud (service account di scrittura: verifica siti e Search Console) | base64url del JSON **compatto** `{ client_email, private_key, private_key_id }` (~2,5 KB, sotto il buffer di 4096 di `security`) | normalizzazione (§5.1) → JWT → token → `GET https://www.googleapis.com/siteVerification/v1/webResource` (Site Verification API abilitata) → `GET https://www.googleapis.com/webmasters/v3/sites` (Search Console API abilitata). Tutte letture gratuite. |
| `BING_WEBMASTER_API_KEY` | Bing Webmaster Tools (API key) | com'è | `GET …/json/GetUserSites?apikey=…` → 200 con `d` array |
| `GOOGLE_API_KEY` | Google Cloud (API key: PageSpeed Insights e CrUX) | com'è | `runPagespeed` reale su `https://www.google.com/` con header, timeout 60 s (il pannello mostra «Verifico…»); `API_KEY_INVALID` / `SERVICE_DISABLED` tradotti |

Il token Cloudflare resta `CLOUDFLARE_API_TOKEN` (stessa chiave, due permessi in più: dubbio 3); la sua prova non
cambia. Nessun permesso DNS si può provare in lettura senza scrivere: lo dice il primo passaggio (D5/E3) con un
messaggio preciso.

### 5.1 Service account: normalizzazione nella route

`codificaServiceAccount(testo)` in `lib/motori.ts`: se inizia con `{` è il JSON incollato (l'input password toglie
gli a capo, lascia gli spazi; le `\n` della chiave sono escape e restano), altrimenti base64/base64url del JSON.
Controlli: `type === "service_account"`, `client_email` che finisce in `.iam.gserviceaccount.com`, `private_key`
PEM leggibile da `crypto.createPrivateKey`. Uscita: base64url del JSON compatto. Gli errori non ripetono mai il
valore. La route salva il valore normalizzato e **lo rilegge** (`getSecret(name) === valore`, altrimenti 500
«salvataggio nel Keychain troncato»). Dopo il salvataggio di una delle tre chiavi o del token Cloudflare:
`void riprendiMotori({ forza: true })`.

## 6. Firma JWT del service account con `node:crypto` (nessuna dipendenza nuova)

```ts
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE_GOOGLE = "https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters";
type ServiceAccount = { client_email: string; private_key: string; private_key_id?: string };

export function firmaJwt(sa: ServiceAccount, adesso: Date): string {
  const iat = Math.floor(adesso.getTime() / 1000) - 30; // margine sull'orologio
  const parte = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const dati = `${parte({ alg: "RS256", typ: "JWT", ...(sa.private_key_id ? { kid: sa.private_key_id } : {}) })}.${parte({
    iss: sa.client_email, scope: SCOPE_GOOGLE, aud: TOKEN_URL, iat, exp: iat + 3600,
  })}`;
  return `${dati}.${crypto.sign("RSA-SHA256", Buffer.from(dati), sa.private_key).toString("base64url")}`;
}
```

Conforme alla documentazione «OAuth 2.0 for Server to Server Applications»: header `RS256`/`JWT`/`kid`
facoltativo, claim `iss`, `scope` separati da spazio, `aud` = endpoint del token, `exp` ≤ 1 h dopo `iat`, firma RSA
SHA-256, base64url senza padding. Scope `webmasters` pieno (non `readonly`): `sites.add` e `sitemaps.submit` lo
richiedono. Il token d'accesso vive solo in memoria (`globalThis`, scadenza − 5 min), mai su disco né nei log.

## 7. Riga di stato nell'area Traffico (mini-shape coerente con T0)

**Compito.** Rispondere a colpo d'occhio a «Google e Bing sanno che il sito esiste? C'è qualcosa che devo fare
io?». Nessun dato di traffico (T2b), nessuna azione: il timer e il salvataggio delle chiavi ripetono da soli.

**Posto.** Dentro `SezioneServizio`, solo per `servizio === "sito"`, tra la frase delle date (o l'avviso dominio) e
i riquadri «Cosa comparirà qui». Blocco con `border-t border-line pt-4`, titolo `h3` «Motori di ricerca» nello
stile dei riquadri esistenti (`text-sm font-semibold text-muted`). Con `client.json` corrotto non compare.

**Righe** (`<ul>`, una `<li>` per motore; etichetta `text-muted`, `Badge`, frase `text-ink`; `flex flex-wrap gap-x-2
gap-y-1`: a 400 px la frase va a capo sotto etichetta e badge, nessuna larghezza fissa):

| Stato | Badge (tono · parola) | Frase (esempi, `formatDate`) |
|---|---|---|
| ok | ok · Fatto | Search Console: «verificato il 20/09/2026 · sitemap inviata il 20/09/2026» · Bing: idem · IndexNow: «ultimo invio il 20/09/2026: 3 pagine» · PageSpeed: «misurata il 20/09/2026» |
| in_attesa | brand · In attesa | «verifica DNS in propagazione, nuovo tentativo dopo le 11:15» · IndexNow: «3 pagine da reinviare dopo le 11:15» |
| errore | err · Errore | il `messaggio` salvato, che dice cosa fare: «il token Cloudflare non ha il permesso DNS: Edit — aggiungilo in Cloudflare → API Tokens» |
| non_configurata | warn · Non configurata | «manca la chiave «Bing Webmaster Tools (API key)» in Impostazioni → Chiavi API» (link a `/impostazioni`) |
| saltato | idle · Nessun invio | IndexNow: «nessuna pagina cambiata nell'ultima pubblicazione» (+ «· ultimo invio il …» se c'è) |

**Stati del blocco**

- servizio spento → nessun blocco; senza dominio → nessun blocco (lo copre già l'avviso dominio di T0);
- attivo o sospeso con dominio ma senza `motori` → una frase sola: «Partono alla prossima pubblicazione con le
  fondamenta SEO (ribuilda e pubblica dalla scheda Build).» Mai righe vuote o «0 pagine»;
- `motori.dominio` ≠ dominio pubblicato → «Il dominio è cambiato: i motori ripartono alla prossima
  pubblicazione.»;
- sospeso con `motori` → «Servizio sospeso: nessun nuovo invio. Ultimi esiti:» + righe;
- date non valide → la parte con la data si omette (`dataValida`), mai «Invalid Date».

Regole: una parola per concetto, parola sempre oltre al colore, nessun colore nuovo (toni esistenti di `Badge`),
nessuna scrittura di `client.json` all'apertura, nessun motion, `aria-hidden` su eventuali icone (non previste).
Le frasi sono una funzione pura `righeMotori(motori, { servizio, dominioPubblicato, adesso })` in `lib/motori.ts`
(testata nel banco); il componente è locale a `page.tsx` (server): `components/traffico-ui.tsx` non si tocca perché
è importato anche da componenti client e `lib/motori.ts` usa `node:crypto`. In fase 2: lettura di
`DESIGN-SYSTEM.md` §5-§10, poi `/impeccable critique` e `impeccable detect` nei due temi a 1280 e 400 px.

## 8. Prova dal vivo (da eseguire quando Mattia inserisce le chiavi)

**Google Cloud** (progetto dell'agenzia già usato per i piani T)

1. console.cloud.google.com → selettore progetto → progetto dell'agenzia. **APIs & Services → Library**:
   abilitare «Google Search Console API», «Site Verification API», «PageSpeed Insights API» e, per T2b,
   «Chrome UX Report API».
2. **IAM & Admin → Service Accounts → Create service account**: nome `sf-motori-scrittura`, nessun ruolo di
   progetto (i permessi di Search Console sono per proprietà, non IAM). Aprirlo → **Keys → Add key → Create new
   key → JSON**: si scarica un file.
   - Se la creazione è bloccata («Service account key creation is disabled»): le organizzazioni create dal
     03/05/2024 applicano per default `iam.disableServiceAccountKeyCreation`. **IAM & Admin → Organization
     Policies** → quella regola → «Override parent's policy» → Not enforced **solo su questo progetto** (serve il
     ruolo Organization Policy Administrator), poi ripetere.
3. **APIs & Services → Credentials → Create credentials → API key** → «Edit API key» → API restrictions:
   «PageSpeed Insights API» e «Chrome UX Report API» → Save → copiare la chiave.

**Bing Webmaster Tools**

4. bing.com/webmasters con l'account dell'agenzia (se il pannello API non compare senza siti, aggiungere prima
   cavalierebuild.it come in S0) → icona **Impostazioni → API Access** → accettare i termini → **Generate API
   Key** → copiare. È una sola per utente e vale su tutti i siti.

**Cloudflare**

5. dash.cloudflare.com → **My Profile → API Tokens** → token dell'editor → **Edit** → aggiungere «Zone · Zone ·
   Read» e «Zone · DNS · Edit» con Zone Resources «Include · All zones from an account · ConsulBuild» → Continue →
   Update token. Il valore del token non cambia: niente da reinserire.

**Editor**

6. **Impostazioni → Chiavi API**: «Google Cloud (service account…)» → incollare **tutto il contenuto** del file
   JSON (anche su più righe) → «Salva e verifica»; «Google Cloud (API key…)» → la chiave; «Bing Webmaster Tools
   (API key)» → la chiave. Atteso: tre «configurata» con le ultime 4 cifre; un errore dice quale API abilitare.
   Poi cancellare il file JSON da Download (resta solo nel Keychain).

**Prima pubblicazione con i motori** (dominio da decidere, dubbio 2; proposta `zz-test-t2a.consulbuild.com`)

7. Fixture `out/zz-test-t2a` come T1a F1-F3 (copia di Cavaliere senza `dist`, `.wrangler`, `wrangler.jsonc`,
   `logs`; id Umami, integrazioni, deploy e infra tolti **prima** di impostare il dominio, `grep` = 0), dominio
   di prova, servizio Sito attivo dalla route, build dall'editor, conferma della build.
8. Pubblicazione **senza la route** (evita il monitor Gatus con commit e push su main e il registro n8n): nella
   cartella della fixture `wrangler deploy` con il `wrangler.jsonc` che il deploy scriverebbe, poi lo script dello
   scratchpad che esegue gli stessi passi di `deployClientInner` dopo wrangler (`registraPubblicazione` +
   `avvisaMotori` con le chiavi reali, stato scritto nel `client.json` della fixture).
9. Controlli, in quest'ordine:
   - `traffico/registro.ndjson`: una riga, campi di §4.2, `urlCambiati` = la home;
   - Cloudflare → DNS di consulbuild.com: un TXT `google-site-verification=…` e un CNAME `<codice>.zz-test-t2a`
     → `verify.bing.com` DNS only, entrambi con il commento;
   - `client.json` → `steps.build.motori`: Google `ok` (o `in_attesa`, poi `ok` al giro del timer entro 15-30
     min: annotare i minuti per la calibrazione), Bing idem, IndexNow `ok` con HTTP 200 o 202;
   - search.google.com/search-console con l'account di Mattia: la proprietà `consulbuild.com` (Dominio) compare
     nell'elenco, Impostazioni → Utenti: il service account e Mattia proprietari; Sitemap: inviata, stato «Riuscita»
     entro qualche ora;
   - bing.com/webmasters: il sito compare verificato, Sitemaps: inviata;
   - dopo ~2 min: `traffico/psi.json` con due strategie per la home, `motori.ndjson` con le righe `misura`;
   - area Traffico del cliente di prova: righe come §7, nei due temi;
   - **segreti**: `grep -rF` degli ultimi 12 caratteri di ciascuna chiave e dell'inizio della chiave privata su
     `out/zz-test-t2a/`, sui log del dev server e sull'output dello script → 0 risultati.
10. Ripubblicazione identica (passo 8 di nuovo): nuova riga con `urlCambiati: []`, IndexNow «saltato», nessuna
    chiamata a Google oltre al token (sitemap già inviata), `siteJson.prima` = `dopo` della riga precedente.
11. Pulizia: `wrangler delete` del worker di prova; in Search Console rimuovere la sitemap di prova (Sitemaps →
    ⋮ → Rimuovi); in Bing rimuovere il sito di prova; cancellare il CNAME di Bing; il TXT Google su consulbuild.com
    si può lasciare (è la verifica del service account) o cancellare; eliminazione della fixture dall'editor col
    nome esatto (sito Umami di prova verificato per id, `rimuovi` n8n); `public/media/zz-test-t2a` rimossa;
    `ls out/` = i clienti reali; hash di `cavaliere-build-srls/client.json` invariato.

## 9. File (elenco esatto)

| File | Tipo | Cosa |
|---|---|---|
| `site-factory-editor/lib/motori.ts` | A | tipi, costanti (endpoint, timeout, backoff, `PROPRIETARI_GOOGLE`), `codificaServiceAccount`, `firmaJwt`, token Google, `redigi`, classificazione errori, `prossimoTentativo`, zona Cloudflare, motori Google/Bing/IndexNow, `misuraPsi`, `rigaRegistro`, `avvisaMotori`, lucchetto per slug, `daRiprendere`, `chiaviMotori` (via `getSecret`), prove delle chiavi, `righeMotori`. Import con estensione `.ts` o di solo tipo (banco con strip-types) |
| `site-factory-editor/lib/motori-ripresa.ts` | A | `riprendiMotori({ forza? })` (scansione `listClients`, condizioni, `avvisaMotori` senza riga di registro, PSI scaduta) e `avviaRipresaMotori()` (timer 15 min) |
| `site-factory-editor/scripts/test-motori.ts` | A | banco senza rete (§12) |
| `site-factory-editor/lib/deploy.ts` | M | parametro `chi`, cattura del diff di `registraPubblicazione`, `await avvisaMotori(…)` dopo la demo |
| `site-factory-editor/lib/fondamenta.ts` | M | `registraPubblicazione` restituisce `{ cambiate, rimosse } \| null` (compatibile: oggi nessuno legge il ritorno) |
| `site-factory-editor/lib/schemas.ts` | M | `steps.build.motori` (§4.1) |
| `site-factory-editor/lib/secrets.ts` | M | tre nomi in `KNOWN_KEYS` e `KEY_LABELS` |
| `site-factory-editor/app/api/setup/keys/route.ts` | M | normalizzazione del service account, tre prove, rilettura, ripresa forzata |
| `site-factory-editor/instrumentation.ts` | M | `avviaRipresaMotori()` accanto allo sweep demo |
| `site-factory-editor/app/traffico/[slug]/page.tsx` | M | blocco «Motori di ricerca» nella sezione Sito (§7) |
| `docs/DEBUG.md` | M | righe «Search Console/Bing non verificati o in attesa», «IndexNow non inviato o saltato», «PageSpeed mancante», «registro delle pubblicazioni» → `steps.build.motori`, `traffico/motori.ndjson`, `registro.ndjson`, `psi.json` |
| `docs/traffico/piano-T2a.md` | M | Calibrazione, Verifica, chiusura |
| `docs/traffico/README.md` | M | §7 stato; §8 lavoro manuale preciso (passi 1-6 di §8 di questo piano, riassunti) |
| `docs/handoff-fase-c.md` | M | riga T2a |

Non si toccano: `lib/build.ts` (niente token in build, nessuna fase nuova), `lib/traffico.ts`, `lib/catena.ts`,
`lib/integrazioni.ts` (si importa `http`), `components/*` (compresi `traffico-ui.tsx` e `home.tsx`: il pannello
chiavi è generico), le route dei clienti, il renderer, n8n, le skill, `docs/vps-integrazioni-setup.md` (nessun
passo sul VPS in T2a). Dipendenze nuove: nessuna. API di Next coinvolte: `instrumentation.ts`, route handler, server
component: prima di scrivere si leggono le guide relative in `node_modules/next/dist/docs/01-app/`.

## 10. Perimetro per `.claude/scope.json` (primo atto della fase 2, dopo lo svuotamento di «T1a-integrazione»)

```json
{
  "task": "T2a Motori avvisati al deploy e registro delle pubblicazioni (docs/traffico/piano-T2a.md)",
  "perimetro": [
    "site-factory-editor/lib/motori.ts",
    "site-factory-editor/lib/motori-ripresa.ts",
    "site-factory-editor/scripts/test-motori.ts",
    "site-factory-editor/lib/deploy.ts",
    "site-factory-editor/lib/fondamenta.ts",
    "site-factory-editor/lib/schemas.ts",
    "site-factory-editor/lib/secrets.ts",
    "site-factory-editor/app/api/setup/keys/route.ts",
    "site-factory-editor/instrumentation.ts",
    "site-factory-editor/app/traffico/[slug]/page.tsx",
    "docs/DEBUG.md",
    "docs/traffico/**",
    "docs/handoff-fase-c.md"
  ]
}
```

La fixture in `site-renderer/out/` è esente dal guard; script e prima/dopo nello scratchpad della sessione.

## 11. Milestone (ogni verifica passa prima della successiva)

**M0 — Precondizioni.** `git log --oneline -5`, `git status --short`; `.claude/scope.json` vuoto (il lavoro
«T1a-integrazione» chiuso e committato) → si scrive §10. Guide Next lette. Baseline: `npx tsc --noEmit`,
`npm run build`, `test-fondamenta.ts`, `test-traffico-stato.ts`, `test-stati.ts`, `test-demo.ts`,
`test-portafoglio.ts` (annotare i conteggi).

**M1 — Regole e banco, nessun chiamante.** `lib/motori.ts`, `scripts/test-motori.ts`, ritorno di
`registraPubblicazione`, nomi in `secrets.ts`. Verifica: `test-motori.ts` verde, `test-fondamenta.ts` con lo
stesso conteggio di M0, `tsc`. **Commit 1** + push (codice non collegato: zero effetti).

**M2 — Collegamento.** `schemas.ts`, `deploy.ts`, `motori-ripresa.ts`, `instrumentation.ts`, route delle chiavi.
Verifica: `tsc`, `npm run build` dell'editor, tutti i banchi di M0 + `test-motori.ts`; revisione del diff di
`deploy.ts` (il passaggio sta dopo wrangler, patch del deploy e `syncInfra`; nessun `throw` nuovo; `return`
invariato; nessuna chiamata a motori senza `build.fondamenta`). **Deploy simulato** sulla fixture
`zz-test-t2a` (dominio `zz-test-t2a.invalid`, build dall'editor come T1a F1-F7), script nello scratchpad che
importa `lib/fondamenta.ts` e `lib/motori.ts` per path e fa i passi di `deployClientInner` dopo wrangler, con
`fetch` finto (nessuna rete) e stato scritto nel `client.json` della fixture:
(a) chiavi assenti → Google, Bing e PSI `non_configurata`, IndexNow `ok` sul finto 202, riga di registro con quegli
esiti, nessuna eccezione; (b) chiavi finte e risposte registrate → registro, `motori.ndjson` e `client.json` come
§4, e `/traffico/zz-test-t2a` sul dev server si apre senza il banner «client.json non leggibile» (lo schema
Zod accetta il file scritto: `schemas.ts` non è importabile con strip-types); (c) ripubblicazione identica → riga con `urlCambiati: []`;
(d) servizio sospeso (stato scritto a mano nella fixture) → «saltato», nessuna chiamata. **Commit 2** + push.

**M3 — Riga di stato.** `page.tsx`. Verifica: `tsc`, `npm run build`; fixture con gli stati di §7 scritti dallo
script (`riprovaDopo` nel futuro lontano, così il timer non la tocca) → schermate di `/traffico/zz-test-t2a` a 1280
e 400 px nei due temi; `/impeccable critique` e `impeccable detect --json` sul file senza problemi gravi.
**Commit 3** + push.

**M4 — Prova dal vivo** (§8), quando ci sono le chiavi. Senza chiavi T2a si chiude dichiarandola «da eseguire».

Fasi 3-5: Calibrazione (§13), test completi, revisione del diff riga per riga, file toccati vs §9, fixture rimossa
(F14 di T1a), `scope.json` svuotato, README §7 e §8, handoff, DEBUG.

## 12. Banco `scripts/test-motori.ts` (senza rete, stile `test-fondamenta.ts`)

`globalThis.fetch` sostituito da un router finto che registra metodo, URL, header e corpo e risponde con JSON nella
forma documentata (§3); una richiesta non prevista fa fallire il caso. Chiavi di prova con valori sentinella; coppia
RSA generata con `crypto.generateKeyPairSync`. Cartelle temporanee cancellate a fine banco.

JWT e chiavi
1. `firmaJwt`: header e claim decodificati (`alg`, `typ`, `kid`, `iss`, `scope` con i due scope, `aud`,
   `exp - iat = 3600`); firma verificata con la chiave pubblica; nessun `+ / =`.
2. `codificaServiceAccount`: JSON con spazi e JSON in base64 → stesso valore compatto; valore ≤ 4000 caratteri e
   ASCII stampabile senza spazi; `type` sbagliato, email senza `.iam.gserviceaccount.com`, PEM rotto → errore che
   non contiene il valore.
3. Token: corpo form con `grant_type` e `assertion`; 400 `invalid_grant` → errore leggibile; secondo motore nello
   stesso passaggio → nessuna seconda richiesta di token.

Google
4. Primo aggancio: ordine zone → token di verifica → lista TXT → creazione TXT (virgolette, commento) → insert con
   `owners` → `sites.add` su `sc-domain%3Aedilprova.it` → sitemap con `feedpath` codificato; stato `ok` con
   `verificatoAt`, `proprieta`, `proprietarioAt`, `sitemapAt`.
5. Secondo deploy senza pagine cambiate → nessuna chiamata Google; con pagine cambiate → solo token e sitemap.
6. TXT già presente (con o senza virgolette) → nessuna creazione; creazione con 81058 → trattata come ok.
7. insert 400 → `in_attesa`, `tentativi: 1`, `riprovaDopo` = +15 min, sitemap non chiamata; ripresa con 200 → `ok`.
8. Proprietà esistente: `owners` di insert con il proprietario → nessun PUT; senza → PUT con l'unione (i proprietari
   esistenti restano nel corpo).
9. PUT dei proprietari 400 → `errore` con `verificatoAt` e `sitemapAt` conservati; il passaggio dopo ripete solo quel passo.
10. `www.edilprova.it`: zona cercata prima su `www.edilprova.it` poi su `edilprova.it`; proprietà sulla zona, sitemap
    sull'host `www`.
11. Nessuna zona, zona `pending`, 403 su zone o DNS → `errore` con il permesso mancante nel messaggio.
12. Sitemap 403 dopo la verifica → `verificatoAt` tolto, `in_attesa`; ripresa → verifica e sitemap di nuovo.

Bing
13. Sito assente → `GetUserSites`, `AddSite`, `GetUserSites`, lista e creazione CNAME (`proxied: false`,
    `verify.bing.com`), `VerifySite` `true`, `SubmitFeed`; `ok`.
14. Sito già verificato con URL `http://edilprova.it` → nessun `AddSite`/CNAME/`VerifySite`; `SubmitFeed` solo al primo
    passaggio o con pagine cambiate.
15. `VerifySite` `false` → `in_attesa`; ripresa `true` → `ok`.
16. `InvalidApiKey` (3) e 401 → `errore`; `ThrottleUser` (4) → `in_attesa`.

IndexNow
17. `cambiate ["/"]` e `rimosse ["/vecchia/"]` → una POST ad `api.indexnow.org` con `host`, `key` letta da
    `indexnow.json`, `keyLocation`, `urlList` assoluti; in tutto il banco nessuna richiesta verso host Google per IndexNow.
18. Nessun cambio → zero POST, «saltato», `inviatoAt` precedente conservato.
19. 202 → `ok`; 422 → `errore` senza `daInviare`; 429, 500 e timeout → `in_attesa` con `daInviare`; deploy
    successivo → unione senza doppioni; ripresa → invia `daInviare` e lo svuota.
20. `indexnow.json` assente o rotto → `errore`, nessuna POST, nessun file creato.

PageSpeed
21. Pagine di `pubblicate` × mobile/desktop con header `X-Goog-Api-Key` e **nessuna** `key=` nell'URL; `psi.json` compatto
    (punteggio, LCP, CLS, TBT, FCP, campo `null` senza `loadingExperience`), nessun campo Lighthouse grezzo;
    `runtimeError` → `in_attesa`.
22. Senza chiave → `non_configurata`, zero chiamate.

Tempi e classificazione
23. Tabella: rete, timeout, 429, 5xx → `in_attesa`; 400, 401, 403, 404, 422 → `errore` (salvo D6 ed E4).
24. Budget: tutte le chiamate appese (il finto rispetta `signal`) con budget di 300 ms → `avvisaMotori` torna entro
    ~400 ms, riga scritta, tutti `in_attesa`.
25. Backoff: fallimenti 1…9 → `riprovaDopo` della scala di §2.6; al decimo → `errore` col conteggio.

Condizioni
26. Chiavi assenti → Google, Bing, PSI `non_configurata`, zero chiamate verso Google e Bing; IndexNow gira.
27. Servizio sospeso → tutti «saltato», zero chiamate, riga con `servizio: "sospeso"`.
28. Dominio diverso da `motori.dominio` → stato ripartito da zero.
29. `daRiprendere`: `in_attesa` scaduto sì, non scaduto no; `non_configurata` con chiave ora presente sì; `errore` solo con
    `forza`; `ok` no; `deploy.dominio` ≠ `motori.dominio` no; servizio non attivo no.

Registro
30. Riga: campi di §4.2, `id` W3C senza millisecondi, `siteJson.dopo` = sha256 del file, `prima` = riga precedente o
    `null`; riga precedente illeggibile saltata; righe precedenti byte-identiche (append-only).
31. `registraPubblicazione`: primo deploy → tutte `cambiate`; identico → `[]`/`[]`; pagina tolta → `rimosse`; registro
    assente → `null`.

Segreti
32. Dopo tutti i casi, scansione di stati restituiti, `registro.ndjson`, `motori.ndjson`, `psi.json`, messaggi e output
    catturato della console: nessuna sentinella (chiave privata, token d'accesso, chiave Bing, chiave API); una
    risposta d'errore Bing che ripete `apikey=<sentinella>` esce redatta.

UI e prove delle chiavi
33. `righeMotori`: ogni stato → tono, parola e frase di §7; nessun `motori` → frase unica; data non valida → omessa; mai
    «0 pagine».
34. Prove: service account ok; `SERVICE_DISABLED` → «abilita la Site Verification API»; Bing 200 / `InvalidApiKey`;
    API key `API_KEY_INVALID`; nessun messaggio contiene il valore.

## 13. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **Segreti nei log** | Chiave Bing in query (unica forma documentata): mai URL nei messaggi, `redigi()` su ogni stringa persistita o restituita (valori delle chiavi, token d'accesso, frammenti della chiave privata); chiave Google nell'header; token d'accesso solo in memoria; corpi d'errore troncati; la route chiavi risponde senza valori; banco 32 e `grep` nella prova dal vivo. |
| Chiave del service account troncata nel Keychain (buffer 4096 di `security -i`) | Formato compatto (~2,5 KB), rilettura dopo il salvataggio, banco 2. |
| **Quote** | Google Site Verification e Search Console: poche chiamate per deploy; IndexNow solo sulle pagine cambiate; nessun `SubmitUrlBatch`; PSI 2 × pagine per deploy (quota giornaliera da leggere in Console al passo 3); 429 → `in_attesa` con backoff, tetto di 10 tentativi. |
| **Verifica che non passa** (propagazione, zona non attiva, record cancellato) | `in_attesa` + backoff + timer; zona `pending` → errore esplicito; sitemap 403 → si riverifica; commento «non cancellare» sui record; al decimo tentativo errore con l'azione. |
| **Deploy rallentato** | Budget 30 s con motori in parallelo e timeout per chiamata; PSI fuori dal deploy; nessuna attesa di propagazione; valori in calibrazione. |
| **Domini senza servizio, demo, spento** | Tutto dietro `build.fondamenta` cotte + dominio coincidente + `cicloAttivo`; demo senza fondamenta per costruzione; banchi 26-29 e M2 (d). |
| Deploy fallito per colpa dei motori | `avvisaMotori` cattura tutto e torna uno stato; `.catch` nel deploy; nessun `throw` nuovo in `deploy.ts` (revisione M2). |
| Stato motori perso da altre scritture | In `steps.build` (mai riscritto per intero), non in `traffico`; PSI aggiorna solo il suo campo; lucchetto per slug. |
| Token Cloudflare con più poteri (DNS: Edit su tutte le zone) | Limitato all'account ConsulBuild; già oggi pubblica i siti di tutte le zone; resta nel Keychain, mai in argv. Alternativa nel dubbio 3. |
| Proprietario delegato che perde l'accesso se il TXT sparisce | Commento sul record; consiglio S0 di verificare anche a nome di Mattia i clienti principali. |
| Creazione della chiave bloccata dalla policy dell'organizzazione | Passo 2 della prova dal vivo. |
| Prova dal vivo che tocca un dominio vero | Dominio di prova sulla zona dell'agenzia (dubbio 2), pubblicazione senza la route, pulizia al passo 11; mai Cavaliere prima della baseline. |
| Forma reale diversa dalla documentazione (virgolette del TXT, codifica dell'`id` di `webResource`, target del CNAME Bing, prova PSI lenta) | Confronti normalizzati; ciascun punto annotato in Calibrazione dopo la prova dal vivo. |
| Mac spento o editor chiuso a metà | Esiti `in_attesa` già salvati; timer al riavvio (primo giro dopo 2 min); PSI ripresa se scaduta. |
| Proprietà e record DNS di un cliente eliminato o con dominio cambiato | Restano (innocui); pulizia fuori perimetro, da prevedere con l'offboarding. |
| Collisione con il lavoro aperto su catena e scheda Build | Nessun loro file toccato; partenza dopo lo svuotamento del loro perimetro; `deployClient` resta compatibile. |

## 14. Dubbi che richiedono una decisione

1. **Proprietari Google**: `info@consulbuild.com` è l'account con cui Mattia usa Search Console? Aggiungere già ora
   anche il service account di **lettura** del VPS (T2b)? La Search Console API non gestisce gli utenti: l'unico modo
   automatico per dargli accesso è la lista dei proprietari della Site Verification API. Proposta: lista con il solo
   Mattia ora, il lettore aggiunto da T2b nella stessa lista.
2. **Dominio della prova dal vivo**: `zz-test-t2a.consulbuild.com` (il service account diventa proprietario della
   proprietà Dominio `consulbuild.com`, poi sitemap e sito Bing di prova rimossi) oppure attendere il primo deploy di
   Cavaliere con Mattia dopo la baseline?
3. **Token Cloudflare**: aggiungere Zone: Read e DNS: Edit al token esistente (proposta, una chiave in meno) oppure un
   secondo token solo DNS?
4. **Registro**: la riga porta gli esiti del primo tentativo e le riprese vivono in `client.json` e `motori.ndjson`
   (proposta) oppure si vuole una seconda riga di esiti per ogni ripresa?
5. **Sospeso**: nessuna chiamata esterna (proposta: «si ferma il ciclo») oppure IndexNow e sitemap anche da sospeso,
   visto che le fondamenta restano e i contenuti possono cambiare?
6. **Tempo nel deploy**: passaggio atteso con tetto a 30 s (proposta) oppure tutto in background, con la riga del
   registro scritta dal passaggio in background?

## 15. Documentazione ufficiale letta (2026-09-14)

- Site Verification API: getting started, `webResource` (risorsa, `getToken`, `insert`, `update`) —
  developers.google.com/site-verification/v1/…; codelab Channel Services «Automating domain verification» (token
  `google-site-verification=…`, `owners` in insert, 400 finché il DNS non propaga, backoff esponenziale).
- Search Console API: `sites.add`, `sites.get`, `sitemaps.submit` — developers.google.com/webmaster-tools/v1/…
- OAuth 2.0 for Server to Server Applications — developers.google.com/identity/protocols/oauth2/service-account.
- Google Cloud: header `X-Goog-Api-Key` (docs.cloud.google.com/docs/authentication/api-keys-use); vincoli di base
  delle organizzazioni create dal 03/05/2024 (`iam.disableServiceAccountKeyCreation`).
- PageSpeed Insights API v5: get started e `runPagespeed` — developers.google.com/speed/docs/insights/v5/…
- Bing Webmaster API: getting access, `AddSite`, `VerifySite`, `GetUserSites`, `SubmitFeed`,
  `GetUrlSubmissionQuota`, `ApiErrorCode` — learn.microsoft.com/…/bingwebmaster e
  …/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.*; CNAME → `verify.bing.com` da fonti di settore
  (webnots.com), da confermare.
- IndexNow: documentation (formato POST, 10.000 URL, codici 200/202/400/403/422/429) — indexnow.org/documentation.
- Cloudflare API: DNS records create/list, zones list — developers.cloudflare.com/api/resources/…
- Sorgente `security` di macOS: `MAX_LINE_LEN 4096` — github.com/apple-oss-distributions/Security,
  `SecurityTool/macOS/security.c`.

## Calibrazione

(fase 3 — vuota)

## Verifica

(fasi 4-5 — vuota)
