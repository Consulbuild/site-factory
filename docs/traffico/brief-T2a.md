# Brief T2a — Motori avvisati al deploy e registro delle pubblicazioni

Leggi prima `docs/traffico/README.md` (§1-§5) e `docs/traffico/decisioni-piani.md`. Dipende da
**T0** (stato servizio) e **T1a** (`docs/traffico/piano-T1a.md` + sezione Integrazione: fondamenta
cotte in `steps.build.fondamenta`, chiave IndexNow in `out/<slug>/traffico/`, registro `lastmod`
con pagine cambiate, `registraPubblicazione` dopo wrangler, `_headers`).

## Obiettivo

Quando un sito con servizio Sito attivo va online (deploy riuscito col dominio), il software
avvisa i motori e prepara la misura **senza lavoro manuale**: Google Search Console verificata e
con la sitemap inviata, Bing Webmaster Tools idem, IndexNow per le pagine cambiate, prima
lettura PageSpeed; ogni pubblicazione lascia una riga nel registro. Tutto degrada a «non
configurata» senza chiavi e non fa mai fallire un deploy già riuscito.

## Verità già stabilite (non rifarle)

- `~/knowledge/seo/ricerche-2026-09-14/w2-5-verifiche-tecniche.md` (docs ufficiali): Site
  Verification API con service account (metodi FILE/META/DNS), Search Console API (Sitemaps,
  URL Inspection 2.000/giorno per proprietà, Search Analytics), Bing Webmaster API (1 API key per
  tutti i siti dell'utente, `SubmitUrlBatch` 500 URL/batch, quota letta con
  `GetUrlSubmissionQuota`), IndexNow (file `{key}.txt` alla radice, max 10.000 URL/submit),
  PageSpeed Insights e CrUX API, Crawler Hints Cloudflare (non documentato su Workers Static Assets).
- `docs/ricerca-traffico-2026-09.md` §3.2 (cosa accelera e cosa è vietato: niente Indexing API,
  niente richieste di indicizzazione in massa), §6.1.
- `docs/traffico/ricerca-scheda-google-2026-09.md` §8: le chiavi JSON dei service account vanno
  bene per Search Console, **non** per la scheda Google.
- `lib/secrets.ts`: il Keychain accetta solo ASCII stampabile senza spazi (una chiave JSON va
  codificata, es. base64).

## Cosa deve esistere a fine T2a

1. **Verifica e proprietà Search Console** per `https://<dominio>/` (il piano sceglie proprietà
   prefisso URL o dominio e il metodo di verifica motivando: file o meta cotti nella build vs DNS
   via API Cloudflare con permessi del token). La proprietà deve risultare visibile anche
   nell'interfaccia Search Console di Mattia (proprietario aggiunto), non solo al service account.
   Caso da gestire: proprietà già creata a mano da Mattia (baseline S0).
2. **Sitemap inviata** a Search Console e **Bing Webmaster** (verifica e invio sito/sitemap/URL),
   con stato e data persistiti per cliente; ripetizione idempotente.
3. **IndexNow** dopo ogni deploy riuscito: solo gli URL cambiati secondo il registro `lastmod` di
   T1a (un deploy senza cambi non manda ping), con esito registrato; niente ping a Google.
4. **PageSpeed Insights** (mobile e desktop) sulla home e sulle pagine dopo il deploy, salvato per
   il pannello di T2b (niente UI completa qui).
5. **Registro delle pubblicazioni** `out/<slug>/traffico/registro.ndjson`: una riga per deploy
   (quando, chi: manuale o volano, dominio, URL cambiati, hash del site.json prima e dopo, esiti
   dei motori), base del report, degli effetti e del rollback dei piani successivi.
6. **Chiavi** in `lib/secrets.ts` con prova reale in `app/api/setup/keys/route.ts` (service
   account Google codificato, API key Bing, API key PageSpeed) e stati «non configurata».
7. Tutto **dopo** un wrangler riuscito, best effort come `syncInfra`: un motore giù non tocca il
   sito online e lascia un esito leggibile in `client.json` e nel log.
8. Una riga di stato nell'area Traffico (sezione Sito): «Search Console: verificato, sitemap
   inviata il …», «Bing: …», «IndexNow: ultimo invio …», con mini-shape coerente con T0; il
   pannello dati completo resta a T2b.
9. **Documenti**: piano chiuso, README §7 e §8 (lavoro manuale preciso: quali API abilitare, come
   creare la chiave, dove incollarla), handoff, `docs/DEBUG.md`, `docs/vps-integrazioni-setup.md`
   se servono passi sul VPS.

## Uscita verificabile

- Banco `scripts/test-motori.ts` senza rete con risposte registrate sulla forma documentata delle
  API: verifica, proprietario aggiunto, sitemap, Bing, IndexNow solo sui cambiati, PSI, errori
  (401, 403, 429, timeout), idempotenza, nessun segreto nei log.
- Deploy simulato di una fixture `zz-test-t2a` (senza wrangler reale o su worker di prova) con
  chiavi assenti → esiti «non configurata», deploy riuscito; con fetch finti → registro corretto.
- Nessun deploy su domini di clienti. `npx tsc --noEmit`, `npm run build` e banchi esistenti verdi.
- La prova dal vivo con le chiavi vere resta come ciclo dichiarato «da eseguire quando Mattia
  inserisce le chiavi», con la procedura scritta passo per passo nel piano.

## Calibrazione (fase 3)

Retry e backoff, cosa fare se la verifica Google non passa subito (propagazione), frequenza
massima dei ping, timeout per non rallentare il deploy.
