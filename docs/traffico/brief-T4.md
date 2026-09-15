# Brief T4 — Mappa query → pagine

Riallineato il 15/09 alle decisioni T3 12-14 e K1 (`decisioni-piani.md`, valgono sopra questo testo).

Leggi prima `docs/traffico/README.md` (§1-§5). Dipende dai contratti di **T0** (stato servizio,
area Traffico), **T3** (chiuso: zone servite dal form lead, lette solo con `leggiZoneServite`,
`zoneUsabili` e `comuniServiti` di `site-factory-editor/lib/zone-servite.ts`; nessun `dati.json`,
`foto.json`, priorità o prezzi), **T6a** (dataset comuni con codici ISTAT 2026 e centroidi, via
`caricaDati()` dello stesso modulo) e **K1** (chiuso: `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` già in
`lib/secrets.ts` con prova gratuita in `lib/chiavi-traffico.ts`).

## Obiettivo

Per ogni cliente con servizio Sito attivo, decidere in modo **ripetibile, spiegabile e misurato**
su quali ricerche reali puntare (8-20 query target, in italiano e nei comuni delle zone servite) e quale pagina del
sito deve rispondere a ciascuna. È la base di T5 (quali pagine costruire), T7 (cosa misurare) e G1
(keyword della scheda Google).

## Cosa sappiamo dalla ricerca (non rifarla)

- `docs/ricerca-traffico-2026-09.md` §3 (cold start: una query si testa in 4-8 settimane; KD 0-5
  vincibile senza link; capoluogo fuori portata), §4 (SERP italiane: le query verticali
  «servizio specifico + comune medio» sono dominate da imprese locali, quelle generiche da
  portali; sotto una soglia di popolazione restano solo directory), §4.3 (disegno del campione di
  384 SERP), §6.2, §8 (strumenti e costi: DataForSEO SERP 0,60 $/1.000 standard, 2 $/1.000 live;
  keyword 0,06-0,09 $/1.000; Google Ads API Basic senza spesa).
- `~/knowledge/seo/ricerche-2026-09-14/p4-serp-italia.md` (pattern di query italiani, modificatori,
  fonti dati SERP) e `p9-strumenti.md` (DataForSEO, Google Ads API).
- `docs/traffico/ricerca-scheda-google-2026-09.md` §3-§5 (dati DataForSEO utili anche alla scheda:
  profondità, zoom, prezzi aggiornati al 2026-07-01).

## Cosa deve esistere a fine T4

1. **Universo delle query** per cliente, generato in modo deterministico da mestiere e servizi
   (`contesto.json`, nessuna priorità dichiarata: l'ordine lo danno volumi e servizi) e dai comuni
   delle zone servite (`comuniServiti`, pesati per popolazione e distanza dalla sede; area «Tutta
   Italia» = ricerche locali dalla provincia della sede), con i modificatori italiani documentati;
   nessuna query inventata fuori dai servizi reali né fuori dalle zone servite.
2. **Client API** senza dipendenze nuove (`lib/dataforseo.ts` nasce in T4), con banco senza rete su
   risposte registrate:
   - DataForSEO (volumi Google Ads per località, SERP organica e local pack per località/
     coordinate, eventuali metriche di difficoltà) con registrazione del costo reale di ogni
     chiamata in `out/<slug>/traffico/costi.ndjson`;
   - API Google Ads (Keyword Planner): valutata, non si costruisce (decisione T4 punto 1).
   - Chiavi già nel Keychain (K1): `lib/dataforseo.ts` le legge con `getSecret`; T4 non tocca
     `lib/secrets.ts` né la route delle chiavi. Senza chiave tutto degrada a «non configurata».
3. **Classificazione della SERP** per query: feature presenti (local pack, AI Overview, annunci,
   Local Services), ciascun risultato organico come portale / directory / impresa locale / altro
   (lista di domini curata e versionata + regole, niente giudizi AI non ripetibili), e un indice
   di vincibilità spiegato (bassa / media / alta difficoltà) con i fattori che l'hanno deciso.
4. **Selezione** di 8-20 query target con punteggio documentato (volume, vincibilità, rilevanza
   per il servizio e vicinanza alla sede; nessuna priorità commerciale) e **assegnazione a una pagina** (home,
   pagina servizio, zone servite; nessuna pagina-comune) → `out/<slug>/traffico/mappa-query.json` con, per ogni
   riga, la provenienza di ogni numero e la data dei dati. Rilanciare con gli stessi dati dà la
   stessa mappa.
5. **Esecuzione** come lavoro `traffico:<slug>:mappa` sul run-bus con `kind: "traffico"` (nasce in T4;
   non StepKey, vedi README §2),
   con stato e log NDJSON; cache delle risposte API per non ripagare le stesse chiamate.
6. **Campione di calibrazione**: script che esegue il campione delle 384 SERP della ricerca §4.3
   quando la chiave DataForSEO c'è, produce la composizione reale delle SERP italiane per taglia di
   comune e mestiere, e salva i dati per tarare le soglie.
7. **UI**: nella sezione Sito dell'area Traffico, la mappa in lettura (query, volume, difficoltà,
   pagina, perché), con le sole azioni di escludere una query (e il perché) e di riammetterla; mini-shape
   /impeccable coerente con T0.
8. **Documenti**: piano chiuso, stato nel README §7, handoff, `docs/DEBUG.md` (log del lavoro),
   costi reali per cliente.

## Uscita verificabile

- Con risposte registrate (fixture costruite sulla forma documentata delle API), la mappa di una
  fixture tipo Cavaliere è deterministica e ogni riga è spiegabile.
- Senza chiave: stato «non configurata» leggibile, nessuna eccezione. Senza zone usabili: mappa
  bloccata col motivo di `zoneUsabili`.
- Banco `scripts/test-mappa-query.ts` senza rete (universo, classificazione, punteggio,
  assegnazione, casi limite: comune senza volumi, servizio senza query, SERP vuota, errore API,
  quota esaurita).
- `npx tsc --noEmit`, `npm run build` e banchi esistenti verdi.
- Costo stimato per cliente scritto nel piano e registrato davvero a ogni chiamata.

## Calibrazione (fase 3)

Soglie di difficoltà e pesi del punteggio: in assenza di chiave si preparano lo script del
campione e un protocollo di giudizio (20 righe da far valutare a Mattia, accordo atteso ≥ 80 %);
la taratura con dati reali resta come ciclo di calibrazione successivo, indicato chiaramente nel
README §7 come «da calibrare con chiave».
