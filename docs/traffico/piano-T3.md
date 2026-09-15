# Piano T3 — Mini-form «Dati per farti trovare»

Stato: **fase 1 (piano) — rivisto il 2026-09-14 dopo le decisioni 8 e 9 di Mattia** (`decisioni-piani.md`, T3),
in revisione dall'orchestratore. Fonti: `docs/traffico/README.md` (§1 decisioni 5, 8, 9; §3 architettura; §4-§5
ciclo e regole), `docs/traffico/brief-T3.md`, `docs/traffico/decisioni-piani.md` (T3, punti 1-9),
`docs/traffico/piano-T0.md` (§3-§6), `piano-T6a.md` (codici ISTAT 2026), `piano-T4.md` (§2, §7: DataForSEO e
run-bus), `ricerca-scheda-google-2026-09.md` (§3, §7, §8.2). La sezione «Revisione» qui sotto **vale sopra** il
testo originale; le sezioni toccate portano «(rivisto il 14/09)».

## Revisione 2026-09-14: solo dati mancanti, stesso design

### R.1 In breve

Il modulo non ha più 8 domande fisse. Prima del link, un lavoro deterministico dell'editor sul run-bus
(`traffico:<slug>:precompila`, nessuna chiamata `claude -p`) legge ciò che abbiamo (form lead, `contesto.json`,
foto già arrivate) e ciò che è pubblico e affidabile (registro ANAC delle attestazioni SOA, registro telematico
F-gas, scheda Google pubblica via DataForSEO), registra la provenienza di ogni valore e **sceglie le domande**: si
chiede solo ciò che manca; ciò che si è trovato si mostra **da confermare o correggere**. Il modulo si costruisce
**solo** con componenti, token e motion di `site-intake/` (sequenza tra i passi, attesa, rivelazione); il confronto
con il form principale entra nei test.

### R.2 Cosa sappiamo già dei clienti reali (lettura del 14/09, senza dati personali)

| | Cavaliere | La Cecilia | Saggin |
|---|---|---|---|
| origine del brief | Tally (niente `formVersione`) | Tally | form v4 (`raw-submission.json` = `lead.json`) |
| sede | solo nome del comune | «città da confermare» | `{comune, provincia}` dall'elenco |
| zone / area | prosa regionale | «Tutta la Puglia» | `["Tutta la regione Veneto"]` |
| comuni precisi | 0 | 0 | 0 |
| `sito_attuale` | «No» | «No» | vuoto |
| certificazioni (contesto) | «non dichiarate» | «non dichiarate» | «(SOA e simili) non dichiarate» |
| foto già arrivate | 12 (`lavori.json` → `img/`) | 0 | 6 (`foto-originali/`) |
| social | nessuno | nessuno | Instagram |
| servizi nel contesto | 24 in 5 macro | 8 in 3 | 11 in 5 |

Le zone del form v4 sono etichette di `zone.ts`/`regioni.ts`: «X e dintorni», «X e provincia», «Provincia di X»,
«Tutta la regione X», «X e regioni vicine», «Tutta Italia», e comuni aggiunti a mano nella forma «Nome (SIGLA)».
Solo la sede e quest'ultima forma sono comuni precisi.

### R.3 Informazione per informazione: dove sta e decisione

Legenda: **non chiedere** · **se manca** (domanda solo se nessuna fonte affidabile risponde; se risponde, conferma) ·
**sempre** (non esiste online né nel lead). Verifiche delle fonti fatte oggi, 14/09/2026.

| # | Informazione | Nel form lead / contesto? | Online (fonte, accesso, termini, affidabilità) | Decisione e forma |
|---|---|---|---|---|
| 1 | Lavori prioritari | no: `lavori` sono i servizi offerti, non le priorità | no: è un'intenzione commerciale | **sempre** · chip dei servizi del contesto |
| 2 | «Prezzo da» | no | scheda pubblica (DataForSEO `services`): prezzi rari e **senza unità, IVA né data**, che il prezzo pubblicato richiede; sito attuale assente in 3 clienti su 3 | **sempre**, facoltativa · righe per le priorità |
| 3 | Comuni serviti precisi — **superata dalla decisione di Mattia del 15/09 (`decisioni-piani.md`, T3 punto 12): non si chiede, si traduce dalle zone del form lead** | parziale: sede (v4 con sigla; Tally solo nome) e comuni «Nome (SIGLA)» nelle zone | area servita della scheda: **solo** Business Profile API da Gestore (quota 0 oggi, R1 §8.1); Places e DataForSEO My Business Info non la restituiscono | **sempre, precompilata** · chip selezionati: sede e comuni precisi del lead («Ci avevi indicato»); chip non selezionati: i comuni più vicini alla sede (T6a, linea d'aria) |
| 4 | Nome d'uso | form v4: `azienda` = «Scrivilo come vuoi che compaia sul sito»; Tally: spesso la ragione sociale | titolo della scheda (DataForSEO `title`), solo come seconda proposta | **non chiedere** con form v4; **se manca** (Tally) → conferma di `azienda`, con il titolo della scheda se diverso |
| 5 | Orari in cui risponde | no | scheda pubblica: DataForSEO `business_data/google/my_business_info/live` → `work_time.work_hours.timetable` (0,0054 $ live), **solo** se telefono o dominio della scheda coincidono con i nostri. Places API scartata (sotto) | **se manca** · conferma «Su Google risulti aperto …: sono le ore in cui rispondi?» |
| 6 | Attestazione SOA | no (lead: solo testo libero «Certificazioni») | **ANAC open data «Attestazioni SOA v2»**: `attestato_CKAN.csv` (100 MB) + `categorie_rilasciate_CKAN.csv` (60 MB), licenza CC BY-SA 4.0 (API CKAN), aggiornati il 09/09/2026, chiave `ATA_impresa_codiceFiscale`; stessi dati nella consultazione gratuita del portale ANAC. Fonte ufficiale, download massivo ammesso dalla licenza | **se manca** · trovata e valida → conferma **senza documento**; altrimenti rientra negli attestati |
| 7 | Certificato F-gas dell'impresa | no | **fgas.it «Ricerca imprese»** (Camere di commercio, Ecocerved; D.P.R. 146/2018): modulo `POST` HTML, nessun CAPTCHA, `robots.txt` vieta solo `/Views/`, nessuna API né termini di riuso pubblicati; il dettaglio dà certificato, stato, numero, emissione, scadenza, data di aggiornamento | **se manca** · una richiesta puntuale per cliente; trovato → conferma; pagina cambiata → domanda |
| 8 | Abilitazione DM 37/08 | no | solo nella **visura camerale a pagamento** (4-7 € allo sportello; online con registrazione e carta); la ricerca gratuita del Registro imprese dà solo dati identificativi | **chiedi** con documento, solo per mestieri impiantistici (idraulico, elettricista o servizi di impianti nel contesto) |
| 9 | ISO 9001 e altre certificazioni, albi | no | banca dati **Accredia** pubblica, ma le note legali vietano «l'estrazione o il reimpiego di parti non sostanziali … qualora tali attività siano ripetute e sistematiche»: niente automazione, solo verifica a mano di Mattia | **chiedi** con documento solo se il lead v4 ha toccato «Certificazioni» o il brief è Tally |
| 10 | Comune, lavoro e anno delle foto già inviate | foto sì (fino a 15), etichette no | no: l'EXIF è tolto all'import (commit `d0c473b`) e il GPS indicherebbe la casa del cliente finale | **sempre se ci sono foto** · un passo per foto, con scorciatoia «Come la foto prima» |
| 11 | Foto nuove di cantieri | lead: 0-15 foto | no | **se mancano** (facoltativa, fino a 15 in tutto) · poi i passi di etichetta |
| 12 | Telefono, e-mail, sede, P.IVA, servizi, referente | sì | — | **non chiedere** |
| 13 | Veridicità e diritti sulle foto | — | — | **sempre** (casella finale) |

**Fonti scartate, con motivo.** *Sito attuale*: «No» o vuoto in 3 clienti su 3; quando esiste, spesso il dominio passa
al nostro sito, che deriva dal contesto (fonte circolare); orari e prezzi in prosa non si estraggono in modo
deterministico. Si riapre in calibrazione se su almeno 3 clienti su 10 esiste un sito diverso dal nostro. *Social*:
i «Automated Data Collection Terms» di Meta vietano la raccolta automatizzata senza permesso scritto, dal 1/1/2025
anche da non autenticati. *Places API (New)*: la policy vieta di conservare qualsiasi contenuto tranne il `place_id`
(il valore deve restare nel link fino a 30 giorni), i termini SEE (agg. 10/09/2026) vietano l'uso con mappe e
l'attribuzione «Google Maps» è obbligatoria; `regularOpeningHours` è SKU Enterprise (1.000 gratis al mese). *Business
Profile API*: quota 0 e accesso da Gestore non ancora disponibili; sarà la fonte giusta di area servita e orari
(con il limite di 30 giorni della policy, R1 §7.1). *VIES e ricerca gratuita del Registro imprese*: nessuna domanda
ne ha bisogno.

### R.4 Il passo di pre-compilazione: lavoro `traffico:<slug>:precompila`

**Avvio.** «Prepara il modulo» (era «Crea il link») → `POST /api/clients/[slug]/traffico/link` controlla i motivi di
blocco di §2.8 e avvia `startTrafficoRun(slug, "precompila", azienda, esegui)`. È il contratto del run-bus di
`piano-T4.md` §7 (`kind: "traffico"`, `busIdTraffico`, eventi in `out/<slug>/traffico/logs/run-precompila.ndjson`):
T3 viene prima di T4 e lo introduce; T4 aggiunge solo «una mappa alla volta». Nessuna quota Max, durata attesa
5-60 s (il caso lento è il primo download dei due file ANAC, 160 MB in tutto).

| Fase (`phase`) | Cosa fa | Testo tipico |
|---|---|---|
| Dati che abbiamo | `client.json` (Sito attivo), `brief.json`, `raw-submission.json` se `formVersione` v4, `contesto.json`, foto (`foto-originali/*.jpg`, altrimenti `lavori.json` → `img/`) | «24 servizi, sede Sandrigo (VI), 6 foto» |
| Scheda Google pubblica | se DataForSEO è configurato: `my_business_info/live` con `keyword` = azienda, `location_coordinate` = centro T6a del comune della sede + raggio, `language_code: it`; **controllo d'identità**: telefono (solo cifre, senza +39) = `brief.telefono` oppure dominio = sito del cliente; costo in `traffico/costi.ndjson` (lavoro `precompila`) | «Scheda trovata: telefono coincide» · «Non configurata» |
| Registri pubblici | ANAC SOA e F-gas per P.IVA di 11 cifre (una ditta individuale è iscritta col codice fiscale personale, che non raccogliamo: esito `non_trovato`) | «SOA: nessuna attestazione valida · F-gas: certificato valido fino al 03/2029» |
| Domande | `scegliDomande()` pura (tabella sotto) | «Il modulo chiederà 7 cose, 2 da confermare» |
| Foto | miniature 480 px con `normalizeToJpg(src, out, 480)` di `lib/lavori.ts` (dritte, senza metadati) | «12 miniature» |
| Link | token, `POST dati/link` (domande, valori da confermare), `POST dati/miniatura/carica` per ogni miniatura, `modulo.json` solo dopo tutti i 200 | → `done` con il link |

**ANAC.** Cache `~/.cache/site-factory/anac-soa/` (fuori da `out/` e da git, come T6a e T4): `HEAD` e nuovo download solo
se `last-modified` cambia; lettura in streaming con un parser CSV che rispetta le virgolette (nel file ci sono
denominazioni con `;`). Valida solo se `ATA_attestato_stato = "PUBBLICO"` (stati visti oggi: PUBBLICO, SOSTITUITO,
SCADUTO_3_ANNI, SCADUTO_5_ANNI, DECADUTO, ANNULLATO, INVALIDATO, ANTEPRIMA, RILASCIO), `dataScadenzaValiditaQuinquennale`
futura e, superata la `dataScadenzaIntermedia`/triennale, `dataEffettuazioneVerificaTriennale` presente; categorie e
classifiche da `categorie_rilasciate_CKAN.csv` per `_idAttestazione`. Nella provenienza: id attestazione, SOA,
scadenza, `last-modified` del file.

**F-gas.** Una `POST` a `/RicercaImprese/RicercaImprese_PostResult` con `Identificativo` = P.IVA e i campi
obbligatori letti dal modulo, poi il dettaglio; si prende solo «Stato», «Numero certificato», «Data scadenza»,
«Data aggiornamento banca dati». Tabella o etichette cambiate → `forma_inattesa`. User-Agent identificativo,
timeout 20 s, nessun tentativo ripetuto.

**Esito per fonte** (in `precompila.json` e negli eventi, mai P.IVA, telefono o risposte grezze nei log):
`ok` · `non_trovato` · `non_configurata` · `non_raggiungibile` · `forma_inattesa` · `saltata` (con motivo). **Nessuna fonte
esterna blocca il link**: fuori `ok` la domanda si mostra. Bloccano solo i dati nostri (409 come oggi).

**Regole `scegliDomande(dati, fonti)`** (pura, in `lib/precompila-dati.ts`):

| Domanda (id) | Si mostra se | Precompilato |
|---|---|---|
| `priorita` | sempre | — |
| `prezzi` | sempre (facoltativa) | — |
| `comuni` | sempre | sede e comuni «Nome (SIGLA)» del lead risolti sui codici T6a (selezionati); fino a 12 comuni entro 20 km dalla sede (non selezionati) |
| `nome_uso` | brief senza `formVersione` | `azienda`; titolo della scheda se la scheda è `ok` e diverso |
| `orari` | sempre: da confermare se la scheda è `ok` con `work_time`, altrimenti vuota | fasce della scheda |
| `attestati` | lead v4 con «Certificazioni» · brief Tally · mestiere o servizi impiantistici · almeno un registro `ok` | SOA e F-gas trovati come conferme; tipi proposti in base al mestiere |
| `foto_nuove` | foto già arrivate < 15 | posti liberi = 15 − foto arrivate |
| `etichette` | almeno una foto già arrivata, o `foto_nuove` presente | il motore la espande in un passo per foto: `etichetta_lead_<n>` per le arrivate (ordine del lead), `etichetta_nuova_<n>` per quelle aggiunte nel modulo; nessun comune suggerito; «Come la foto prima» dal secondo passo |
| `condizioni` | sempre | — |

**Come arriva al modulo, senza dati personali nell'URL.** Il link resta `…/dati/#<token>`. La riga `LinkDati` riceve
`domande` (id dal catalogo) e `precompilati` (solo i valori da mostrare, ≤ 16 KB: nomi e codici dei comuni, fasce
orarie, categoria/classifica/scadenza SOA, numero e scadenza F-gas, fonte e data; **mai** P.IVA, codici fiscali,
telefono, e-mail, referente). `POST dati/verifica {token}` li restituisce nel corpo JSON; le miniature le chiede il
modulo con `POST dati/miniatura {token, n}` (risposta `image/jpeg`, URL `blob:` locale). «Rigenera» rifà la
pre-compilazione (le fonti possono essere cambiate) e ruota il token.

**Provenienza fino in fondo.** `precompila.json` (§5.4) resta in `traffico/`; l'import scrive in `dati.json` per ogni
valore la sua `Provenienza` (§5.2: `cliente`, `lead`, `scheda-google` con data di lettura e conferma, `anac-soa` con id
attestazione, `fgas` con numero di certificato, `mattia` per le correzioni) e l'editor la mostra accanto al valore.

### R.5 Stesso design: con quali parti esistenti si costruisce ogni domanda

Nessun componente visivo nuovo, nessun token, colore, raggio, ombra o motion nuovo. «Tipo nuovo» qui significa una
fabbrica in `src/components/` che **compone** parti esistenti.

| Domanda / schermata | Parti esistenti usate |
|---|---|
| Verifica del link, stati di errore, benvenuto | markup del primo passo di `index.astro` (`.passo`, `.passo__titolo`, `.passo__aiuto`, `.passo__azioni`, `btn--primario`/`btn--ghost`); errori in `.avviso--errore`; testata, barra e binario identici |
| `priorita` | `creaSceltaMultipla` (chip) + tetto di `stile.ts` (nota in `.campo__aiuto` `aria-live`); gruppi per macro con `.campo__etichetta` sopra ogni `.scelte--chip` |
| `prezzi` | per riga: `.campo__etichetta` (nome del lavoro), `campoTesto` (`inputmode=decimal`, suffisso «€»), due `.scelte--chip` (unità, IVA); validità in `.scelte--chip` |
| `comuni` (`comuni-scelti.ts`) | schema di `zone.ts`: `.scelte--chip` a caselle + `campoTesto` «Aggiungi un comune» + `attaccaSuggerimenti(cercaComuni)` + `btn--secondario btn--sm`; fonte in `.campo__aiuto` |
| **Conferma di un valore trovato** (`conferma.ts`, usata da `nome_uso`, `orari`, SOA, F-gas) | riga `.conferma` di `sede.ts` (`.conferma__eti` + `strong`) con il valore; `.campo__aiuto` con fonte e data; `.scelte--righe` «Sì, è giusto» / «No, lo correggo» come `sito.ts`, che rivela (`hidden`) il componente di correzione già compilato |
| `orari` | `.scelte--righe` con le scorciatoie; correzione: `.scelte--chip` dei giorni + `campoTesto` `type=time` (cornice esistente) in `fieldset` con `legend.campo__etichetta` |
| `attestati` | `.scelte--righe` «No, nessuno» / «Sì»; voce: `.scelte--righe` tipo, `campoTesto` numero o ente, documento con la UI di `logo.ts` (`.logo-anteprima`, stato, «Riprova») sulla coda con `kind: "attestato"`; trovati sopra come conferme |
| **Etichetta di una foto** (`etichetta-foto.ts`, un passo per foto: `etichetta_lead_<n>`, `etichetta_nuova_<n>`) | immagine nella cornice `.stile__anteprima`; `.scelte--righe` «Come la foto prima» con `.scelta__nota` «Monza · Bagni · 2025» (avanti automatico di `creaSceltaSingola`); comune come `comuni` ma a scelta singola tra i comuni confermati + ricerca; lavoro `.scelte--chip` (priorità, poi «Altri lavori» che rivela le macro); anno `.scelte--chip` (anno corrente → −5, «Prima»); «Non usare questa foto» `btn--secondario btn--sm`; campo vuoto = `avviso` + «Va bene così, continua» del motore |
| `foto_nuove` | `creaFoto` com'è (griglia, coda, «Riprova», «×»), con `max` dal precompilato |
| `condizioni` | `creaConsenso` con i testi del parametro `informativa` |
| Riepilogo, attesa, «Grazie» | `montaRiepilogo` parametrizzato (le foto in una riga: «10 foto con comune, 2 senza»); `mostraAttesa`; `rivelazione`; struttura `passo--fatto` + `.tappe` |
| Cambio passo | `transizione()` e `scaglioni()` di `motion.ts` senza copie; binario con le sole sezioni usate (voci inutili `hidden`, colonna invariata) |

CSS: nessun `dati.css`, salvo regole di impaginazione inevitabili (altezza massima della foto `40vh` con
`object-fit: contain`, perché «Continua» resti sopra la piega a 390×680): un controllo le limita a proprietà di
layout (§10.3 bis caso 3).

Sezioni (al massimo 5, quelle vuote spariscono): **I tuoi lavori** (priorità, prezzi) · **Dove lavori** (comuni) ·
**Come ti trovano** (nome d'uso, orari) · **Foto e attestati** (attestati, foto nuove, etichette) · **Per finire**.
Caso minimo (lead v4, niente certificazioni né foto, orari trovati): 6 passi. Cavaliere oggi: circa 20 passi, di
cui 12 etichette di foto (stima 4-5 minuti: da misurare in calibrazione).

### R.6 Come il resto del piano cambia

- §2.2-§2.4, §2.7, §2.8: flusso con pre-compilazione, catalogo delle domande condizionate, pannello con «Prepara il modulo».
- §3-§4: `LinkDati` con `domande` e `precompilati` al posto di `certificazioni`; due route nuove per le miniature.
- §5: `InvioSchema` con conferme ed etichette per foto al posto del ripetitore `cantieri`; provenienza in `dati.json`;
  `foto.json` raggruppato per (comune, lavoro, anno); nuovo `precompila.json` (§5.4).
- §6: nuovi `lib/precompila-dati.ts`, `lib/fonti-pubbliche.ts`, `lib/dataforseo.ts` (base del client di T4); `run-bus.ts`
  e `agenti.ts` per `kind: "traffico"`; comuni dal dataset T6a (decisione 6), non da `data-src/comuni.json`.
- §7: informativa con le fonti dei dati non raccolti presso l'interessato (art. 14.2.f GDPR, verificato oggi con
  `cite_law`).
- §8-§11: file, perimetro, test (confronto col form principale) e milestone aggiornati.
- §13-§14: rischi e dubbi nuovi.
- **Da riportare in `piano-T4.md`** (non toccato qui): `lib/dataforseo.ts`, `secrets.ts` (chiavi DataForSEO), `run-bus.ts` e
  `agenti.ts` passano da «A» a «M»; `costi.ndjson` accetta anche il lavoro `precompila`; `dati.json` e `foto.json` sono
  alla versione 2 (comuni con `provenienza`, `nomeUso`/`orari` come oggetti con provenienza, `foto.json` con
  `senzaCantiere` e file `foto/fNN.jpg`): i campi letti da T4 (priorità, prezzi, comuni, cantieri per comune) restano.

## 1. Contesto

Obiettivo (rivisto il 14/09): dopo l'attivazione del servizio Sito, Mattia manda al titolare un **link personale** a
un modulo da telefono (≤ 5 minuti) che chiede **solo i dati che mancano** per pagine, mappa query e dati strutturati
(lavori prioritari, «prezzo da», comuni serviti con codice ISTAT, comune/lavoro/anno delle foto; nome d'uso, orari e
attestati solo se non li abbiamo o non si trovano in fonti pubbliche affidabili) e fa **confermare** quelli trovati
(Revisione R.3-R.4). Le risposte arrivano su Drive via n8n; l'editor le importa in `out/<slug>/traffico/` come dati
**da verificare** fino alla conferma di Mattia. Il form lead non cambia comportamento.

Fatti rilevati leggendo il codice (2026-09-14):

- **Motore del form lead accoppiato alle sue domande**: `engine.ts` importa `DOMANDE` e calcola `PASSI`,
  `INDICE_RIEPILOGO`, `INDICE_FATTO` a livello di modulo; `render.ts` importa staticamente tutti i 16
  componenti nel `REGISTRO` e le `SEZIONI` del lead; `riepilogo.ts` importa `DOMANDE`/tassonomia;
  `upload.ts` chiama `caricaFile` legato a `/lead/file?id=`; `consenso.ts` importa l'informativa del
  lead. Riusare il motore richiede di **parametrizzare** questi punti (§8.1), non di copiarli.
- **Budget di prestazioni globale**: `scripts/check-budget.mjs` somma *tutti* i `dist/_astro/*.js`
  (oggi 1 file, 26,8/35 KB gzip). Una seconda pagina con il suo bundle lo farebbe sforare anche se il
  lead non cambia: il budget va misurato **per pagina** (JS raggiungibile dal suo HTML).
- `public/data/comuni/<lettera>.json` **non contiene il codice ISTAT** (righe `[nome, sigla, provincia,
  regione, cap, multiCap]`); `data-src/comuni.json` sì. Verificato: la coppia (nome, sigla) è **unica** su
  7.904 comuni (6 omonimi, tutti in province diverse). **Rivisto il 14/09 (decisione 6)**: quell'elenco è precedente
  al riordino sardo e alle fusioni 2024 (`piano-T6a.md` §1); i codici si prendono da
  `site-renderer/data/comuni-fatti.json` di T6a (nome, sigla, `nomiPrecedenti`, `alias`), letto come file JSON
  dall'editor (nessun import da `site-renderer/src`). Il modulo continua a suggerire dai file del lead; la
  risoluzione nome+sigla → codice 2026 avviene in pre-compilazione e all'import (nome unico senza sigla accettato,
  ambiguo → punto da controllare).
- **`sips` non toglie i metadati**: prova con un JPEG di prova con blocco Exif (Orientation 6 + GPS):
  dopo `sips -s format jpeg` (anche con `-Z`) il file ha ancora un APP1 Exif riscritto con
  **Orientation 6** e i pixel **non ruotati**. Conseguenza: togliere l'EXIF senza applicare prima la
  rotazione gira le foto verticali dell'iPhone. **Già risolto per l'import del form lead** (14/09,
  fuori da T3): `lib/metadati-foto.ts` (`orientamentoExif`, `senzaMetadati`, `eJpeg`) e in
  `lib/lavori.ts` `pulisciJpeg(file)` (rotazione `sips` per gli 8 orientamenti + via i metadati) e
  `normalizeToJpg(src, out, maxLato)`; banco `scripts/test-metadati-foto.ts`. T3 li **riusa**.
- `sharp` è presente solo come dipendenza transitiva di Next; `lib/lavori.ts` dichiara la scelta
  «nessuna dipendenza npm (niente sharp)». Si resta su `sips` + una funzione pura che toglie i segmenti.
- Staleness (`lib/staleness.ts`) confronta solo file elencati (`contesto.json`, …); `lib/build.ts` copia
  solo `img/` e `dist/`. Scrivere sotto `traffico/` senza toccare `client.json` non rende stale nulla.
- `contesto.json` ha `servizi_atomizzati[].servizio` e `macro_categorie[{nome, servizi}]`: Cavaliere 24
  servizi in 5 macro, La Cecilia 8 in 3, Saggin 11 in 5. È la fonte dei lavori mostrati nel modulo.
- n8n: il pattern webhook → Drive (`sf-bozza`) è provato, come il webhook con Header Auth
  «Site-factory registra» (`sf-registra-cliente`, chiave `N8N_REGISTRA_KEY` già nel Keychain) e le Data
  table. Il form serializza le richieste finché la cartella del lead non esiste: qui la cartella nasce
  **alla creazione del link** (§4), quindi la porta non serve.
- ~~`.claude/scope.json` oggi = perimetro di **T0**~~ (rivisto il 14/09): T0 e T1a sono chiusi, `scope.json` è vuoto,
  un altro piano è in sviluppo. La fase 2 di T3 parte dopo **T6a chiuso** (dataset committato) e con il perimetro
  libero; T3 viene **prima di T4** e ne anticipa la base (`lib/dataforseo.ts`, `startTrafficoRun`).
- Run-bus: oggi conosce solo `kind` `cliente` e `fabbrica` (`busIdCliente`, `busIdFabbrica`); `agenti.ts` distingue le
  due. `secrets.ts` non ha chiavi DataForSEO.
- Stile esistente riusabile per le parti nuove: `.conferma` (riga «Indirizzo:» di `sede.ts`), `.stile__anteprima`
  (cornice di un'immagine), `.logo-anteprima` (file singolo con stato), `.scelta__nota`, `.campo__etichetta`. Nessun
  `select` stilizzato nel form: le scelte lunghe restano chip o righe.

Fuori perimetro T3: pagine e copy che useranno i dati (T5), mappa query (T4), fatti comunali (T6a),
correzione dell'informativa del form lead (audit 14/09 §7.3), scheda Google.

## 2. Studio UX (shape /impeccable)

**Sostituzioni dichiarate.** Nessun utente né strumento di domanda strutturata: le risposte del discovery
vengono dal brief e dal README, le assunzioni sono in §14. Mondo visivo **stabilito** (`site-intake/
DESIGN.md`, `PRODUCT.md`): nessun new-work; le strutture delle interazioni aperte sono valutate a mano
(§2.4). Modo: **Operate** (il titolare completa un compito). `impeccable context` caricato; il detector va
eseguito a UI finita (M3).

### 2.1 Compito, pubblico, esito

- **Chi**: il titolare di un'impresa **già cliente** (servizio Sito attivo), 50+ anni, poca confidenza col
  telefono. Riceve il link da Mattia su WhatsApp o per e-mail, lo apre nel browser interno di WhatsApp o in
  Safari, spesso in pausa in cantiere.
- **Compito**: dare in una volta sola i dati veri che servono a farlo trovare, senza scrivere quasi nulla.
- **Successo**: invio completato in ≤ 5 minuti con comuni precisi, almeno un lavoro prioritario e,
  quando esistono, foto per cantiere e attestati con documento; zero dati inventati se salta una domanda.
- **Verità specifica** (rivista il 14/09): a differenza del form lead, qui **conosciamo già il cliente**: il modulo
  mostra i *suoi* lavori e le *sue* foto, non richiede nulla che ci abbia già dato, e ciò che abbiamo trovato su Google
  o nei registri pubblici lo mette davanti da confermare, dicendo da dove viene. Non vende nulla: niente promesse di
  posizioni o di clienti in più.

### 2.2 Flusso (rivisto il 14/09)

```
editor: «Prepara il modulo» → lavoro traffico:<slug>:precompila (R.4)
   → precompila.json (fonti, domande, valori con provenienza) → token + riga LinkDati + miniature → link da copiare

link (WhatsApp) → /dati/#<token> → card «Controllo il tuo link…» (HTML statico, al primo paint)
   ├─ ok ────────→ verifica restituisce azienda, domande, valori da confermare, bozza
   │               → benvenuto «Ciao, {azienda}» → [Inizia]
   │                 (ripresa: se c'è una compilazione a metà si salta al passo dov'era)
   │               → solo le domande scelte, in ≤ 5 sezioni (una decisione per schermata; i valori trovati come
   │                 conferma «Sì, è giusto» / «No, lo correggo»; un passo per ogni foto già inviata)
   │               → «Controlla i tuoi dati» (Modifica per riga) → [Invia i dati]
   │               → attesa «Stiamo salvando le tue foto…» → rivelazione → «Grazie, abbiamo i tuoi dati»
   └─ ko ────────→ schermata di stato (tabella §2.5), con i contatti dell'agenzia
```

Benvenuto (bozza, calibrazione in fase 3): h1 «Ciao, {azienda}», aiuto «Ci servono pochi dati per far trovare il
tuo lavoro a chi cerca un'impresa nella tua zona. Quello che ci hai già dato non te lo chiediamo di nuovo.»; seconda
riga di aiuto calcolata: «Ci vogliono circa {N} minuti.» (stima per passo di §2.3). Nessun elenco «tieni a portata di
mano» se non ci sono attestati da caricare. Grazie: tappe «Oggi — Abbiamo ricevuto i tuoi dati» · «Nei prossimi giorni —
Li controlliamo uno per uno: se manca qualcosa ti scriviamo». Nessun tempo di pubblicazione promesso.

### 2.3 Catalogo delle domande (rivisto il 14/09)

Testata come il lead: marchio + «Sezione N di M» (M = sezioni con almeno una domanda, ≤ 5), barra onesta, binario da
1024 px. Ordine: prima i tocchi sui propri lavori (fiducia: «è il mio modulo»), poi i comuni (il dato più importante),
le conferme rapide, le foto (etichette di quelle già inviate, poi eventuali nuove che salgono in background) e la
casella finale. **Quali domande compaiono lo decide la pre-compilazione** (regole in R.4); i componenti sono in R.5.

| # | Sezione | id · tipo | Quando | Testo (h1) | Aiuto (≤ 20 parole) | Obbl. | Limiti e controlli |
|---|---|---|---|---|---|---|---|
| 1 | I tuoi lavori | `priorita` · `scelta-multipla` (chip a gruppi per macro) | sempre | Su quali lavori vuoi più clienti? | Tocca fino a 3 lavori: sono quelli su cui lavoriamo per primi. | sì | 1-3 tra i servizi del contesto; al 4° tocco la nota di `stile.ts` «Massimo 3: togline uno per sceglierne un altro» e il tocco non passa |
| 2 | I tuoi lavori | `prezzi` | sempre | Da quanto parte il prezzo di questi lavori? | Facoltativo. Il prezzo più basso che fai davvero: sul sito diventa «da … €». | no | una riga per ogni lavoro della #1: importo («€»), unità (a lavoro · al m² · al metro · all'ora), IVA (inclusa · esclusa); poi «Valgono per» 6 · 12 mesi. Importo senza unità o IVA = blocco che spiega; importo 1 – 1.000.000 |
| 3 | ~~Dove lavori~~ **tolta (T3 punto 12 di `decisioni-piani.md`)** | `comuni` | mai: aree tradotte dalle zone del lead | In quali comuni lavori? | Tocca i comuni dove accetti lavori. Se ne manca uno, scrivilo qui sotto. | sì | chip già selezionati: sede e comuni precisi del lead («Ci avevi indicato»); chip non selezionati: fino a 12 comuni entro 20 km dalla sede; ricerca per aggiungerne; 1-40; doppioni ignorati; testo non scelto dall'elenco = avviso con uscita |
| 4 | Come ti trovano | `nome_uso` · conferma | brief Tally | Ti chiamano così? | Sul sito e su Google il tuo nome è questo. Se i clienti ti chiamano in un altro modo, scrivilo. | no | conferma di `azienda` (e del titolo della scheda se diverso); «No, lo correggo» → testo ≤ 80; vuoto = nessun nome d'uso (mai dedotto) |
| 5 | Come ti trovano | `orari` · conferma o scorciatoie | sempre | Quando rispondi al telefono? | Con orari trovati: «Su Google risulti aperto in questi orari.» Senza: «Tocca l'orario più simile al tuo, poi correggilo.» | no | con scheda `ok`: conferma delle fasce lette; senza: scorciatoie «Lun–ven 8–18» · «Lun–ven 8–12 e 14–18» · «Lun–sab 8–18» · «Lun–ven 8–18, sabato 8–12» · «Altro orario» che aprono la correzione (giorni a chip + `input type=time`). Max 2 gruppi di giorni × 2 fasce; inizio < fine, fasce non sovrapposte, un giorno in un solo gruppo. Nessun orario preselezionato senza fonte |
| 6 | Foto e attestati | `attestati` · conferme + ripetitore | lead v4 con «Certificazioni» · Tally · mestiere impiantistico · un registro `ok` | Hai attestati o certificazioni? | Quelli nei registri pubblici li abbiamo trovati noi. Per gli altri serve il documento. | no | sopra: conferme dei registri («Attestazione SOA OG1 classifica II, valida fino al 05/2029 — dal registro ANAC, aggiornato al 09/09/2026»: «Sì, scrivila sul sito» / «No»); sotto: «No, nessun altro» · «Sì»; voci (max 8): tipo (SOA · Abilitazione impianti DM 37/08 · Certificato F-gas · Iscrizione ad albo o ordine · Certificazione ISO · Altro; DM 37/08 in cima per gli impiantisti), «Numero o ente» (≤ 120), scadenza mese/anno facoltativa, documento PDF/JPG/PNG (≤ 25 MB, in background). Senza documento = avviso «Puoi mandarcelo anche dopo». Se il lead aveva testo in «Certificazioni»: riga «Ci avevi indicato: …» |
| 7 | Foto e attestati | `etichette` → passi `etichetta_lead_<n>` · etichetta foto (un passo per foto) | una per ogni foto già arrivata | Dove e quando hai fatto questo lavoro? | Foto {k} di {N}. Basta il comune, mai la via. | no | comune (chip dei comuni della #3 + ricerca), lavoro (priorità, poi «Altri lavori»), anno (anno corrente → −5, «Prima»); dal secondo passo «Come la foto prima» (un tocco e avanti); «Non usare questa foto» (persone, targhe, civici); campo vuoto = avviso una volta, poi avanti |
| 8 | Foto e attestati | `foto_nuove` · `foto` | foto arrivate < 15 | Hai altre foto di lavori finiti? | Facoltativo. Poi ti chiediamo dove e quando le hai fatte. | no | griglia del lead (`creaFoto`), JPEG/PNG/WebP, mai `image/*`; `max` = 15 − foto arrivate; ogni foto aggiunta genera il suo passo `etichetta_nuova_<n>` subito dopo; zero foto = avanti senza avviso |
| 9 | Per finire | `condizioni` · `consenso` (testi propri) | sempre | Ho letto l'informativa sulla privacy | (sintesi in 2 righe + «Leggi tutta l'informativa» nel `dialog` nativo) | sì | casella «Ho letto l'informativa e confermo che prezzi, attestati e foto sono veri e miei»; unico blocco del modulo |

Durata stimata per passo (base del «circa N minuti»): #1 15 s · #2 45 s · #3 30 s (precompilata) · #4 10 s · #5 10 s
(conferma) o 20 s · #6 20 s (solo conferme) o 40 s · #7 15 s la prima di un cantiere, 4 s con «Come la foto prima» ·
#8 30 s · #9 10 s · riepilogo 20 s. Cavaliere (12 foto in ~4 cantieri, orari da chiedere, attestati da chiedere) ≈ 5
minuti; lead v4 senza foto né certificazioni con orari trovati ≈ 2,5 minuti (calibrazione in fase 3 con cronometro).

### 2.4 Strutture valutate (interazioni aperte; rivisto il 14/09)

| Dato | Scartate | Scelta |
|---|---|---|
| Foto | (A) ripetitore «un cantiere aperto alla volta» con caricamento (piano del 14/09 mattina): obbliga a ricaricare foto che abbiamo già, contro la decisione 8; (B) tutte le miniature insieme e assegnazione a gruppi toccandole: selezione multipla fragile per il pubblico 55+; (D) un passo con un mini-sequenziatore interno «Foto successiva»: secondo bottone di avanzamento e motion annidato, fuori dal design del lead | (C) **un passo del motore per foto** (`etichetta_lead_<n>`, `etichetta_nuova_<n>`), con «Come la foto prima» per chiudere un cantiere in un tocco; le foto nuove generano i loro passi. Barra e binario restano per sezione; «Foto k di N» nell'aiuto dà il progresso locale |
| Comuni | (A) riquadri dalle zone del lead: sono etichette larghe («Tutta la regione Veneto»); (C) raggio in km: precisione illusoria e nessuna prova di dove accetta lavori | (B) chip: sede e comuni precisi del lead selezionati, vicini alla sede non selezionati, ricerca per gli altri |
| Valori trovati | (A) campi già riempiti che il cliente può non notare: conferma implicita; (B) solo in lettura con «Segnala un errore»: correzione scomoda | (C) valore in `.conferma` con fonte e data + «Sì, è giusto» / «No, lo correggo»: conferma esplicita, correzione nello stesso passo |
| Orari | griglia 7 giorni × fasce stile Google: 14+ campi | conferma della scheda se c'è, altrimenti scorciatoie tipiche + correzione |
| Prezzi | un campo per ciascun servizio del contesto (fino a 24): lungo, spinge a inventare | solo i lavori prioritari (1-3), facoltativi |

### 2.5 Stati del link e degli errori

| Stato | Quando | h1 · testo (bozze) | Azioni |
|---|---|---|---|
| senza token | `/dati/` senza `#…` | Questo modulo si apre dal tuo link personale · Aprilo dal messaggio che ti abbiamo mandato. | Chiama · Scrivi su WhatsApp (numero agenzia di `fatto.ts`) |
| non valido | token malformato (controllo nel form, nessuna chiamata) · hash sconosciuto a n8n · link sostituito da uno nuovo | Questo link non funziona · Forse è stato copiato a metà, o te ne abbiamo mandato uno più recente: apri l'ultimo messaggio o chiedici un link nuovo. | Chiama · WhatsApp |
| scaduto | `scade` passata (410) | Questo link è scaduto · Era valido fino al {data}. Chiedici un link nuovo. | Chiama · WhatsApp |
| già usato | stato `inviato` (409) | Hai già inviato i tuoi dati · Li abbiamo ricevuti il {data}. Se vuoi cambiare qualcosa, scrivici. | Chiama · WhatsApp |
| rete assente | verifica fallita senza risposta | Non riusciamo a controllare il link · Controlla la connessione e riprova. | **Riprova** |
| errore server | 5xx | Qualcosa non ha funzionato dal nostro lato · Riprova tra un minuto. | **Riprova** |
| scaduto durante la compilazione | 410/404 su file, bozza o invio | come «scaduto», più: «Le tue risposte restano su questo telefono: apri da qui il link nuovo e riparti da dove eri.» | Chiama · WhatsApp |
| invio ripetuto | 409 `inviato` sulla ripetizione di un invio andato a buon fine | nessuna schermata di errore: si mostra «Grazie» | — |

Le schermate di stato stanno nella stessa card (niente binario, niente barra), h1 a fuoco, `role="alert"`
solo per gli errori. La ripresa col link nuovo abbina la compilazione salvata tramite il nome
dell'azienda restituito dalla verifica e tiene solo le risposte i cui id sono ancora tra le `domande` del link nuovo
(la pre-compilazione può essere cambiata); le conferme si ripropongono se il valore trovato è diverso.

### 2.6 Responsive, accessibilità, prestazioni

- Stessa scena del lead: card a tutta larghezza su telefono, 640 px su tablet, binario da 1024 px. A
  390×680 (browser interno) benvenuto e prima domanda con il bottone sopra la piega.
- Target ≥ 48 px, testo ≥ 16 px, contrasto AA con i token esistenti (nessuna coppia nuova), `aria-live` per
  chip aggiunti/tolti e per le foto, `fieldset/legend` per le fasce orarie, `select` nativo con `optgroup`
  per il lavoro del cantiere (ruota nativa su iOS), focus sull'h1 a ogni passo, reduced-motion come il lead.
- (Rivisto il 14/09) Nessuno stile nuovo: la pagina `/dati/` importa gli stessi fogli del lead (`tokens`, `base`,
  `components`, `upload`, `motion`). Solo se servono regole di impaginazione (altezza massima della foto), un
  `src/styles/dati.css` importato solo da `/dati/` e limitato a proprietà di layout da un controllo (§10.3 bis caso 3).
  Budget proprio della pagina (§11), primo paint = HTML statico della card di verifica. Le miniature si scaricano
  solo arrivando ai passi delle foto (una alla volta, `URL.revokeObjectURL` in `distruggi`).
- Immagine dei passi `etichetta_*`: `alt` «Foto {k} dei tuoi lavori» (il contenuto lo descrive il titolare con le
  etichette); a 390×680 la foto verticale non spinge «Continua» sotto la piega.
- Nessun evento Umami dal modulo (non si importa `analytics.ts`).

### 2.7 Anti-obiettivi

Niente promesse di posizioni, visite o tempi; niente orari o prezzi preselezionati **senza una fonte dichiarata**;
niente mappa; niente recensioni (decisione 9); niente nome, telefono o e-mail del referente, sede, P.IVA, servizi o
foto già ricevute da ricaricare (li abbiamo già); niente via del cantiere; nessun valore trovato inserito in silenzio
(sempre conferma esplicita con fonte e data); nessuna fonte che vieta l'uso automatizzato (Accredia, social, Places
API per i valori); nessun componente, stile o effetto nuovo oltre a quelli del lead (sequenza, attesa, rivelazione).

### 2.8 Pannello nell'editor (mini-shape, coerente con T0)

Posto: **dentro la card «Sito»** del dettaglio `/traffico/[slug]`, sotto la riga delle date e sopra
«Cosa comparirà qui», come sotto-sezione «Dati per farti trovare» (h3 + badge). Visibile con Sito
`attivo` o `sospeso` (in sospeso: sola lettura, nessun link nuovo); nascosto se spento. Come previsto da
T0 §2.4, il prossimo passo di questo blocco è **la primaria del dettaglio** (l'unica della pagina).

```
│ Sito [Attivo]                                                    [Sospendi…] │
│ Ottimizzazione del sito per le ricerche locali.  Attivo dal 14/09/2026       │
│ ─ Dati per farti trovare ─────────────────────────────── [Da verificare] ─── │
│ Inviati dal cliente il 03/10 · importati il 04/10                            │
│ ⚠ 2 punti da controllare: attestato «F-Gas» senza documento; …               │
│ Lavori prioritari  Bagni · Cucine · Rifacimento tetti                        │
│ Prezzi da          Bagni: da 4.500 € a lavoro, IVA inclusa (fino al 03/10/2027)│
│ Comuni (12)        Cologno Monzese (MI) · Monza (MB) · …                     │
│ Nome d'uso         Impresa Cavaliere (cliente)  Orari lun–ven 8–18 (confermato da Google, 14/09) │
│ Attestati          SOA · OG1 classifica II · registro ANAC ↗ · F-gas: documento ↗            │
│ Cantieri (3)       [▢][▢][▢] Monza · Bagni · 2025 · 3 foto (1 esclusa)       │
│                                    [Modifica i dati]   [Conferma i dati]     │
```

Provenienza (rivisto il 14/09): accanto a ogni valore, col testo secondario di `DESIGN-SYSTEM.md`, la sua origine («cliente», «confermato da
Google il 14/09», «registro ANAC», «registro F-gas»); i link ai registri sono pagine pubbliche di consultazione, mai
URL con la P.IVA in chiaro nella query.

| Stato del blocco | Cosa si legge | Primaria | Secondarie |
|---|---|---|---|
| senza link | «Chiediamo al cliente solo ciò che non abbiamo: prima controlliamo form, contesto, scheda Google e registri pubblici.» | **Prepara il modulo** | — |
| preparazione in corso | fasi del lavoro `traffico:<slug>:precompila` nella status bar agenti e nel blocco (stessa riga di stato di T0/T4) | — | Interrompi |
| preparazione fallita | Banner err col motivo leggibile (dati nostri illeggibili, n8n non risponde); le fonti esterne non fanno mai fallire | Riprova | — |
| link attivo, niente invio | «Link creato il gg/mm, valido fino al gg/mm. Mandalo tu al cliente.» + link in campo `mono` in sola lettura + riepilogo «Il modulo chiederà: priorità, prezzi, comuni, 12 foto · Da confermare: orari (scheda Google), SOA (ANAC) · Fonti: scheda Google non configurata, F-gas non trovato» | **Copia il link** | Rigenera… (conferma: «Ricontrolliamo le fonti e il link di prima smette di funzionare subito») |
| link scaduto senza invio | warn «Il link è scaduto il gg/mm senza risposta.» | **Prepara un modulo nuovo** (rifà le letture) | — |
| dati arrivati, non importati | brand «Il cliente ha inviato i dati il gg/mm.» | **Importa i dati** (conferma se esistono dati già importati: «verranno sostituiti; i precedenti restano in `traffico/precedenti/`») | — |
| Drive non ancora scaricato | «Google Drive sta ancora scaricando «foto-03-…»: riprova tra poco.» | Riprova | — |
| cartella Drive assente sul Mac | warn con il percorso atteso | — | — |
| importati, da verificare | badge warn · lettura `dl` con la provenienza di ogni valore · elenco dei punti da controllare (per ISO e altri attestati senza registro automatico: link alla banca dati Accredia da consultare a mano) | **Conferma i dati** | Modifica i dati · Prepara un modulo nuovo… |
| verificati | badge ok «Verificati il gg/mm» · lettura | — | Modifica i dati · Prepara un modulo nuovo… |
| modifica | form per sezione (comuni come «Nome (SIGLA)» validati dal server, foto con «Escludi» e alt) + `useUnsavedGuard` | **Salva e segna verificato** | Salva · Annulla |
| import fallito | Banner err con i problemi dello schema; la cartella su Drive resta intatta | Riprova l'importazione | — |
| motivo di blocco (chiave `N8N_REGISTRA_KEY` assente · `contesto.json` assente o invalido · Sito sospeso · `client.json` illeggibile · dataset T6a assente) | frase visibile col motivo, `aria-describedby` sul bottone disabilitato (regola T0); le chiavi DataForSEO assenti **non** bloccano: la riga fonti dice «scheda Google non configurata» | disabilitata | — |
| errore n8n alla creazione | dialog aperto con `role="alert"` «n8n non risponde: il link non è stato creato» | Riprova | — |

Solo token e componenti di `DESIGN-SYSTEM.md` (`card`, `Badge`, `Banner`, `btn*`, `ConfirmDialog`,
`mono`); miniature 64 px `rounded-ctl`; nessuna coppia di colori nuova. «Copia il link» usa
`navigator.clipboard` con esito «Copiato» in `role="status"`.

## 3. Meccanismo del link

**Scelta: token opaco casuale registrato su n8n come hash** (non firma HMAC).

- L'editor genera 32 byte casuali (`crypto.randomBytes`) in **esadecimale (64 caratteri)**: l'alfabeto
  `[0-9a-f]` non viene spezzato dai riconoscitori di link di WhatsApp e dei client e-mail (un base64url
  può finire con `-` o `_`).
- Link: `https://sito.consulbuild.com/dati/#<token>`. Il token sta nel **frammento**: non arriva ai log di
  Cloudflare né nel Referer; la pagina lo legge e lo manda nel **corpo** delle richieste (JSON o campo del
  multipart) su HTTPS. Nessun dato personale nell'URL.
- L'editor manda a n8n (`POST /webhook/dati/link`, Header Auth «Site-factory registra») solo
  `sha256(token)` con slug, azienda, servizi, `domande`, `precompilati` (R.4: nessun dato del referente, nessun codice
  fiscale o P.IVA) e scadenza; poi le miniature delle foto già arrivate (`POST dati/miniatura/carica`, stessa
  autenticazione, una per richiesta). n8n salva una riga per cliente nella Data table `LinkDati` (upsert per slug) e
  crea/trova la cartella Drive del cliente. (Rivisto il 14/09.)
- **Non indovinabile**: 2^256. **Non riusabile per un altro cliente**: il token porta a una sola riga; il
  form non manda mai slug né cartella e ogni scrittura prende la destinazione dalla riga (campi in più nel
  corpo = 400). **Scade**: `scade` (default 30 giorni) sta sul server e si controlla a *ogni* chiamata,
  non solo all'apertura. **Rotazione**: «Rigenera» riscrive l'hash della riga, il vecchio link smette di
  funzionare all'istante. **Già usato**: dopo l'invio la riga passa a `inviato`; per aggiornare i dati si
  crea un link nuovo. Aprire il link non cambia nulla (anteprime di WhatsApp e scanner e-mail innocui).

Perché non HMAC: (1) la revoca prima della scadenza richiede comunque stato sul server (una firma senza
stato non si ritira), quindi il vantaggio «senza database» sparisce; (2) serve un segreto leggibile da un
nodo Code: `$env` è bloccato di default nelle versioni recenti di n8n, le Variables sono a pagamento, e nel
JSON del workflow finirebbe in git; (3) `require('crypto')` nei nodi Code richiede
`NODE_FUNCTION_ALLOW_BUILTIN`. Il token opaco usa solo nodi base (Crypto «Hash», Data table, Google Drive)
e la credenziale già esistente: **nessuna chiave nuova** nel Keychain né su n8n.

Nell'editor il link resta in `traffico/modulo.json` (per poterlo ricopiare): `out/` è fuori da git e privato
su Drive, e il token permette solo di inviare dati «da verificare» fino alla scadenza (§14, dubbio 2).

## 4. Workflow n8n

### 4.1 Data table `LinkDati` (creata a mano da Mattia)

Colonne (rivisto il 14/09): `slug` String · `azienda` String · `servizi` String (JSON `[{id, nome, macro}]`) ·
`domande` String (JSON, id del catalogo) · `precompilati` String (JSON, ≤ 16 KB) · `nFoto` Number (miniature
caricate) · `hash` String · `cartella` String (id Drive) · `scade` Date · `stato` String (`attivo` | `inviato`) ·
`bozza` String (JSON, ≤ 64 KB) · `creato` Date · `aggiornato` Date · `inviato` Date. Nessun dato del referente, nessun
codice fiscale o P.IVA (la colonna `certificazioni` del piano precedente sparisce: le conferme stanno in
`precompilati`).

### 4.2 `sf-dati` (`infra/n8n/dati.json`, ~25 nodi)

Cartella Drive: `Il mio Drive/site-factory-clienti/_traffico/<slug>/` (id di `_traffico` fissato nei nodi
come per `_inbox`), separata da `_inbox`. Settings come `sf-bozza`: successi non salvati, errori a
`sf-errori`.

Ramo editor:
1. **Webhook «Link»** `POST dati/link`, Header Auth «Site-factory registra», risposta dal nodo.
2. **Code «Valida link»**: slug `^[a-z0-9-]{1,80}$`, azienda 1-120, servizi 1-60 voci (id ≤ 80, nome ≤ 120,
   macro ≤ 80), `domande` id unici dal catalogo (`priorita`, `prezzi`, `comuni`, `nome_uso`, `orari`, `attestati`,
   `foto_nuove`, `etichette`, `condizioni`; `priorita`, `comuni` e `condizioni` obbligatori), `precompilati`
   oggetto con chiavi ammesse ≤ 16 KB, `nFoto` 0-15, hash `^[a-f0-9]{64}$`, `scadeAt` ISO nel futuro e ≤ 90 giorni.
   Nessuna stringa a 11 o 16 caratteri che sembri P.IVA o codice fiscale (rete di sicurezza).
3. **If** → no: **Respond 400**.
4. **Drive «Cerca cartella»** `name = '<slug>'` in `_traffico` → **If «Esiste?»** → no: **Drive «Crea cartella»**.
5. **Data table «Salva link»** upsert per `slug`: hash, azienda, servizi, domande, precompilati, nFoto, cartella,
   scade, `stato=attivo`, `bozza=""`, creato/aggiornato.
6. **Respond 200** `{ok:true}`.
6b. **Webhook «Miniatura carica»** `POST dati/miniatura/carica` (Header Auth, multipart `{slug, n, file}`): slug
   esistente in `LinkDati`, `n` 1-15, `image/jpeg` ≤ 200 KB → Drive `miniatura-NN.jpg` nella `cartella` della riga
   (aggiorna se esiste, file piatti come `sf-bozza`) → **Respond 200**.

Ramo modulo (pubblico, Allowed Origins `*`, risposta dal nodo):
7. **Webhook** `POST dati/verifica` · `PATCH dati/bozza` · `POST dati/file` (multipart `{token, kind,
   index, file}`) · `POST dati/miniatura` (`{token, n}`) · `POST dati/invio`.
8. **Code «Leggi token»**: route da `$prevNode.name`; token dal corpo `^[a-f0-9]{64}$` → altrimenti
   `{codice:400, stato:"non_valido"}` senza toccare la Data table.
9. **Crypto «Hash token»** SHA256 hex → **Data table «Cerca link»** (Get, `hash =`, Always Output Data).
10. **Code «Prepara»** (tutte le regole in un posto): riga assente → 404 `non_valido`; `scade` passata →
    410 `scaduto` + `scadeAt`; `stato=inviato` → 409 `inviato` + `inviatoAt`; poi per route:
    - verifica → 200 `{azienda, servizi, domande, precompilati, nFoto, scadeAt, bozza}`;
    - miniatura → `n` 1-`nFoto` → **Drive «Scarica»** `miniatura-NN.jpg` → **Respond** binario `image/jpeg`
      (`cache-control: no-store`);
    - bozza → oggetto JSON con chiavi ammesse (id presenti in `domande` e, se c'è `etichette`, i passi espansi
      `^etichetta_(lead|nuova)_\d{1,2}$`), ≤ 64 KB;
    - file → `kind` `foto` (index 1-15, MIME `image/jpeg|png|webp`, al massimo 15 − `nFoto` file) o `attestato`
      (index 1-8, anche `application/pdf`); peso reale dal binario ≤ 25 MiB; nome `foto-NN-<nome>` /
      `attestato-NN-<nome>` (stessa `pulisci` del lead);
    - invio → corpo con le chiavi di primo livello attese, ≤ 256 KB; n8n aggiunge `inviatoAt` del server
      e serializza `invio.json`.
11. **Switch «Esito»**: `errore` → **Respond errore** (codice dall'item) · `verifica` → **Respond 200** ·
    `bozza` → **Data table «Salva bozza»** (update per slug) → **Respond 200** · `scrivi` → **Drive «Cerca
    file»** nella `cartella` della riga → **Code «Unisci»** → **If «File esiste?»** → **Aggiorna** |
    **Carica** → **If «È l'invio?»** → sì: **Data table «Segna inviato»** (`stato=inviato`, `inviato`, `bozza=""`)
    → **Respond 200**. Il 200 dell'invio parte solo a file scritto e riga aggiornata.

Nessun avviso Telegram all'invio: l'editor mostra «dati arrivati» leggendo Drive (§14, dubbio 5).

### 4.3 `sf-dati-pulizia` (`infra/n8n/dati-pulizia.json`, ~9 nodi)

Ogni notte alle 04:30 (Europe/Rome) + **Webhook «Prova»** con Header Auth (`{giorni}` per le prove):
**Data table «Tutti i link»** + **Drive «Cartelle»** in `_traffico` → **Code «Valuta»**:
- cartella senza riga e più vecchia di 1 giorno → Cestino;
- riga `attivo` con `scade` passata da oltre 7 giorni → Cestino della cartella + riga eliminata (via la bozza);
- riga `inviato` senza cartella (importata) da oltre 30 giorni → riga eliminata;
- riga `inviato` con cartella ancora presente da oltre 60 giorni → **nessuna cancellazione** (dati di un
  cliente attivo), solo avviso.
→ **Drive «Cestina»** · **Data table «Elimina»** · **Telegram «Riassunto»** solo se è successo qualcosa,
**solo conteggi** («Pulizia _traffico: 2 cartelle nel Cestino, 1 invio non importato da 60 giorni»), mai
nomi di aziende (una ditta individuale porta il nome della persona).

(14/09) Le miniature `miniatura-NN.jpg` stanno nella cartella del cliente: escono con lei (Cestino alla scadenza, o
cancellazione all'import); `precompilati` esce con la riga. Nessuna regola nuova.

### 4.4 Una sola logica di validazione, provata offline

I nodi Code di `dati.json` si scrivono «da shim»: leggono solo `$input`, `$('Nodo').first()`,
`$prevNode.name`, `this.helpers.getBinaryDataBuffer/prepareBinaryData`. `site-intake/dev/n8n-codice.mjs`
esegue il JS *vero* estratto dal JSON con questi oggetti finti: lo usano sia `tests/dati-n8n.spec.ts`
(banco senza rete) sia `dev/inbox.mjs` (backend di sviluppo). Niente seconda implementazione che deriva.

## 5. Schemi dei dati

### 5.1 Grezzo inviato (`_traffico/<slug>/invio.json`, prodotto dal form, validato all'import; rivisto il 14/09)

```ts
// lib/dati-traffico.ts — specchio di RisposteDati (site-intake/src/data/domande-dati.ts)
const Giorno = z.enum(["lu", "ma", "me", "gi", "ve", "sa", "do"]);
const Ora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Fascia = z.object({ da: Ora, a: Ora }).strict();
const Gruppi = z.array(z.object({ giorni: z.array(Giorno).min(1).max(7), fasce: z.array(Fascia).min(1).max(2) }).strict()).min(1).max(2);
const ComuneScelto = z.object({ nome: z.string().min(1).max(80), sigla: z.string().regex(/^[A-Z]{2}$/) }).strict();
const AnnoFoto = z.union([z.number().int().min(1950), z.literal("prima")]); // «Prima» = prima dell'anno corrente − 5
const RifFoto = z.string().regex(/^(lead|nuova)-\d{1,2}$/);
export const UNITA = ["lavoro", "mq", "metro", "ora"] as const;
export const TIPI_ATTESTATO = ["soa", "dm37", "fgas", "albo", "iso", "altro"] as const;
/** Conferma di un valore precompilato: `si` = valore trovato accettato; `no` = sostituito da `valore`. */
const Conferma = <T extends z.ZodTypeAny>(valore: T) => z.discriminatedUnion("esito", [
  z.object({ esito: z.literal("si"), rif: z.string().max(80) }).strict(),       // rif = chiave in precompilati
  z.object({ esito: z.literal("no"), rif: z.string().max(80), valore: valore.optional() }).strict(),
]);

export const InvioSchema = z.object({
  versione: z.literal(2),
  formVersione: z.string().max(40),
  precompilaSha: z.string().regex(/^[a-f0-9]{64}$/),  // quale pre-compilazione ha visto il cliente
  iniziatoAt: z.string().datetime(),
  inviatoAt: z.string().datetime(), // del server (n8n)
  risposte: z.object({
    priorita: z.object({ ids: z.array(z.string().max(80)).min(1).max(3) }).strict(),
    prezzi: z.object({
      righe: z.array(z.object({ servizio: z.string().max(80), importo: z.number().positive().max(1_000_000),
        unita: z.enum(UNITA), iva: z.enum(["inclusa", "esclusa"]) }).strict()).max(3),
      validita: z.enum(["6-mesi", "12-mesi"]),
    }).strict().optional(),
    comuni: z.object({ scelti: z.array(ComuneScelto).min(1).max(40),
      tolti: z.array(ComuneScelto).max(40) }).strict(),              // precompilati deselezionati (per la provenienza)
    nome_uso: Conferma(z.string().min(1).max(80)).optional(),
    orari: z.union([Conferma(z.object({ gruppi: Gruppi }).strict()),
      z.object({ esito: z.literal("nuovo"), gruppi: Gruppi }).strict()]).optional(),
    attestati: z.object({
      trovati: z.array(z.object({ rif: z.string().max(80), pubblica: z.boolean() }).strict()).max(4), // SOA, F-gas
      voci: z.array(z.object({ n: z.number().int().min(1).max(8), tipo: z.enum(TIPI_ATTESTATO),
        dettaglio: z.string().min(1).max(120), scadenza: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
        file: z.number().int().min(1).max(8).optional() }).strict()).max(8),   // [] = «No, nessun altro»
    }).strict().optional(),
    foto_nuove: z.number().int().min(0).max(15).optional(),          // conteggio; i file stanno in `file`
    etichette: z.array(z.object({ foto: RifFoto, comune: ComuneScelto.optional(), servizio: z.string().max(80).optional(),
      anno: AnnoFoto.optional(), comePrima: z.boolean().optional(), escludi: z.boolean().optional() }).strict()).max(15).optional(),
    condizioni: z.literal(true),
  }).strict(),
  file: z.array(z.object({ n: z.number().int().min(1), kind: z.enum(["foto", "attestato"]), nome: z.string().max(200),
    bytes: z.number().int().nonnegative(), tipo: z.string().max(80),
    stato: z.enum(["in-coda", "in-corso", "fatto", "errore"]) }).strict()).max(23),
  origine: z.object({ ua: z.string().max(200) }).strict(),
}).strict();
// superRefine: ogni `rif` esiste in precompila.json con lo stesso sha; ogni risposta ha il suo id in `domande`;
// `lead-<n>` ≤ foto del lead, `nuova-<n>` ↔ file `foto` `fatto`; anno ≤ anno di inviatoAt.
```

Il modulo compone `etichette` dai passi `etichetta_*` al momento dell'invio (la bozza tiene i passi separati).

### 5.2 Normalizzato: `out/<slug>/traffico/dati.json`

```ts
const RifServizio = z.object({ id: z.string().min(1).max(80), nome: z.string().min(1).max(120) }).strict();
export const ComuneIstat = z.object({ istat: z.string().regex(/^\d{6}$/), nome: z.string().min(1),
  sigla: z.string().regex(/^[A-Z]{2}$/), provincia: z.string().min(1), regione: z.string().min(1) }).strict();
const Data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Rivisto il 14/09: da dove viene un valore. */
export const Provenienza = z.discriminatedUnion("fonte", [
  z.object({ fonte: z.literal("cliente") }).strict(),                                   // scritto nel modulo
  z.object({ fonte: z.literal("lead"), campo: z.string().max(40) }).strict(),           // es. «sede», «zone»
  z.object({ fonte: z.literal("scheda-google"), lettoAt: z.string().datetime(), confermatoIl: Data }).strict(),
  z.object({ fonte: z.literal("anac-soa"), idAttestazione: z.string().max(40), fileAggiornatoAl: Data, confermatoIl: Data }).strict(),
  z.object({ fonte: z.literal("fgas"), numeroCertificato: z.string().max(40), bancaDatiAl: Data, confermatoIl: Data }).strict(),
  z.object({ fonte: z.literal("mattia"), modificatoAt: z.string().datetime() }).strict(),  // correzione nell'editor
]);

export const DatiTrafficoSchema = z.object({
  versione: z.literal(2),
  stato: z.enum(["da_verificare", "verificato"]),   // unica fonte di stato per dati.json E foto.json
  importatoAt: z.string().datetime(),
  modificatoAt: z.string().datetime().optional(),   // ultima correzione a mano
  verificatoAt: z.string().datetime().optional(),   // solo con stato verificato
  origine: z.object({ inviatoAt: z.string().datetime(), formVersione: z.string() }).strict(),
  priorita: z.array(RifServizio).min(1).max(3),
  prezzi: z.array(z.object({ servizio: RifServizio, importo: z.number().positive().max(1_000_000),
    valuta: z.literal("EUR"), unita: z.enum(UNITA), iva: z.enum(["inclusa", "esclusa"]),
    dichiaratoIl: Data, validoFino: Data }).strict()).max(10),
  comuni: z.array(ComuneIstat.extend({ provenienza: Provenienza }).strict()).min(1).max(40),
  nomeUso: z.object({ valore: z.string().min(1).max(80), provenienza: Provenienza }).strict().nullable(),
  orari: z.object({ gruppi: z.array(z.object({ giorni: z.array(Giorno).min(1), fasce: z.array(Fascia).min(1).max(2) }).strict()).max(2),
    provenienza: Provenienza }).strict().nullable(),
  attestati: z.array(z.object({ tipo: z.enum(TIPI_ATTESTATO), dettaglio: z.string().min(1).max(120), // «OG1 classifica II»
    scadenza: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable(),
    documento: z.string().regex(/^attestati\/\d{2}-[\w.-]+$/).nullable(),
    provenienza: Provenienza }).strict()).max(12),
  daVerificare: z.array(z.string()),                // punti leggibili generati dall'import
}).strict().superRefine(/* comuni unici per istat; priorità e prezzi con servizio unico; giorni unici e in
  un solo gruppo; fasce con da < a e non sovrapposte; verificatoAt presente ⇔ stato verificato;
  attestato pubblicabile ⇔ documento presente OPPURE provenienza anac-soa/fgas */);
```

Normalizzazioni (in `normalizzaInvio`, pura; rivisto il 14/09): comune → codice ISTAT 2026 sul dataset T6a (nome
normalizzato senza accenti e apostrofi, anche `nomiPrecedenti`, filtrato per sigla; nome unico senza sigla
accettato); non trovato o ambiguo → escluso + punto da controllare con il testo originale; provenienza `lead` se era
precompilato e lasciato selezionato, altrimenti `cliente`. Servizio non più nel contesto → tenuto col nome + punto da
controllare. `validoFino` = `dichiaratoIl` (data di `inviatoAt` in Europe/Rome) + 6/12 mesi, con fine mese limitata
(31/08 + 6 mesi = 28/02). Conferme: `si` → valore e provenienza da `precompila.json` (con `confermatoIl` = data di
`inviatoAt`); `no` con valore → valore del cliente, provenienza `cliente`; `no` senza valore → `null`. Orari assenti →
`null`, gruppi e giorni ordinati lu→do. Attestati trovati con `pubblica: true` → voce con `documento: null` e
provenienza del registro, **pubblicabile**; `pubblica: false` → non scritto (resta nella provenienza di
`precompila.json`). Attestato del cliente senza documento o con file non arrivato → `documento: null` + punto «non
pubblicabile finché non arriva il documento»; scadenza passata → punto. Foto in un comune non tra i serviti → punto.

Accanto: `traffico/dati-grezzi.json` (l'`invio.json` com'è arrivato: base delle correzioni tracciabili),
`traffico/modulo.json` (`{versione:1, link, generatoAt, scadeAt, precompilaSha}`), `traffico/import.ndjson` (una riga
per tentativo: `at, esito, durataMs, nFoto, nAttestati, nPunti, errore?` — conteggi, mai valori),
`traffico/precedenti/` (un solo slot, i dati sostituiti dall'ultima reimportazione).

### 5.3 Manifest foto: `out/<slug>/traffico/foto.json`

```ts
export const FotoTrafficoSchema = z.object({
  versione: z.literal(2),
  // Rivisto il 14/09: cantiere = foto con la stessa terna (comune, lavoro, anno); le foto senza terna completa
  // restano in `senzaCantiere` (non usabili per le pagine-comune, ma visibili e correggibili).
  cantieri: z.array(z.object({
    n: z.number().int().min(1).max(15),
    comune: ComuneIstat,
    servizio: RifServizio,
    anno: z.union([z.number().int().min(1950), z.literal("prima")]), // ≤ anno corrente: superRefine
    foto: z.array(FotoVoce).min(1).max(15),
  }).strict()).max(15),
  senzaCantiere: z.array(FotoVoce).max(15),
}).strict();
const FotoVoce = z.object({
  file: z.string().regex(/^foto\/f\d{2}\.jpg$/),
  larghezza: z.number().int().positive(), altezza: z.number().int().positive(),
  bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  alt: z.string().min(1).max(160),                // import: «{servizio} a {comune} ({anno})», correggibile
  escludi: z.boolean(),                           // cliente («Non usare questa foto») o Mattia: persone, targhe, civici
  origine: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("lead"), n: z.number().int().min(1).max(15), file: z.string().max(200) }).strict(), // es. foto-originali/foto-03-…jpg
    z.object({ tipo: z.literal("modulo"), nome: z.string().max(200), tipoMime: z.string().max(80), bytes: z.number().int() }).strict(),
  ]),
}).strict();
```

### 5.4 Pre-compilazione: `out/<slug>/traffico/precompila.json` (nuovo, 14/09)

```ts
const EsitoFonte = z.enum(["ok", "non_trovato", "non_configurata", "non_raggiungibile", "forma_inattesa", "saltata"]);
export const PrecompilaSchema = z.object({
  versione: z.literal(1),
  creatoAt: z.string().datetime(),
  fonti: z.object({
    lead: z.object({ esito: EsitoFonte, formVersione: z.string().nullable() }).strict(),  // null = brief Tally
    contesto: z.object({ esito: EsitoFonte, generatedAt: z.string() }).strict(),
    schedaGoogle: z.object({ esito: EsitoFonte, motivo: z.string().max(200).optional(), lettoAt: z.string().datetime().optional(),
      identita: z.enum(["telefono", "dominio"]).optional(), costoUsd: z.number().nonnegative().optional() }).strict(),
    anacSoa: z.object({ esito: EsitoFonte, fileAggiornatoAl: z.string().optional(), url: z.string().url() }).strict(),
    fgas: z.object({ esito: EsitoFonte, bancaDatiAl: z.string().optional(), url: z.string().url() }).strict(),
  }).strict(),
  domande: z.array(z.object({ id: z.enum(["priorita", "prezzi", "comuni", "nome_uso", "orari", "attestati",
    "foto_nuove", "etichette", "condizioni"]), motivo: z.string().max(160) }).strict()),   // «brief Tally», «scheda ok»…
  precompilati: z.object({                         // esattamente ciò che va in LinkDati (≤ 16 KB serializzato)
    comuni: z.object({ scelti: z.array(ComuneIstat.extend({ rif: z.string() })), vicini: z.array(ComuneIstat.extend({ km: z.number() })) }).strict(),
    nomeUso: z.object({ rif: z.string(), valori: z.array(z.string().max(120)).min(1).max(2) }).strict().optional(),
    orari: z.object({ rif: z.string(), gruppi: Gruppi, fonteTesto: z.string(), letto: Data }).strict().optional(),
    attestati: z.array(z.object({ rif: z.string(), tipo: z.enum(["soa", "fgas"]), testo: z.string().max(160),
      scadenza: Data, fonteTesto: z.string(), aggiornato: Data }).strict()).max(4),
    tipiProposti: z.array(z.enum(TIPI_ATTESTATO)),
    foto: z.array(z.object({ rif: RifFoto, larghezza: z.number().int(), altezza: z.number().int() }).strict()).max(15),
  }).strict(),
  provenienze: z.record(z.string(), Provenienza),  // rif → provenienza completa (resta sul Mac, non va a n8n)
  fileFoto: z.record(RifFoto, z.string().max(200)), // lead-<n> → foto-originali/foto-NN-….jpg o img/lavoro-N.jpg (resta sul Mac)
}).strict();
```

`precompilaSha` = sha256 della serializzazione di `precompilati`: lega invio e pre-compilazione. Una sola copia
(«Rigenera» la sostituisce; quella vecchia va in `traffico/precedenti/` solo se c'è un invio non importato che la
cita).

Consumatori futuri (T5b/T5c/T6b) usano foto e dati **solo con `dati.json.stato === "verificato"`** e foto
con `escludi: false`: regola scritta nel modulo e nel README §3 a chiusura.

## 6. Import nell'editor

### 6.1 Funzioni

- `lib/metadati-foto.ts` — **esiste già (14/09), da riusare senza modifiche**: `orientamentoExif(buf): 1..8`
  (TIFF II e MM, tag 0x0112 in IFD0; 1 se assente o IFD rovinato) e `senzaMetadati(buf): Buffer` che
  toglie APP1-APP13, APP15 e COM (Exif, XMP con GPS, IPTC/Photoshop, commenti), tenendo APP0, APP2 **solo
  `ICC_PROFILE`** (via MPF) e APP14 `Adobe`, e **taglia tutto dopo l'EOI** (le immagini secondarie MPF
  portano il loro EXIF); dati compressi byte-identici. JPEG malformato o troncato → eccezione. La pipeline
  con la rotazione è `pulisciJpeg` / `normalizeToJpg` in `lib/lavori.ts`.
- `lib/dati-traffico.ts` (pura): schemi §5, `normalizzaInvio(invio, {precompila, comuni, servizi, adesso})`,
  `validoFino`, `statoBlocco(...)` (gli stati di §2.8 come funzione di modulo.json, precompila.json, run in corso,
  presenza di `invio.json`, `dati.json`, stato del Sito, chiave, contesto), `linkDaToken(token, base)`,
  `risolviComune(nome, sigla, dataset)` sul JSON di T6a.
- `lib/precompila-dati.ts` (pura, nuovo 14/09): `datiNostri(brief, lead?, contesto, foto)` (sede, comuni precisi delle
  zone, mestiere impiantistico, «Certificazioni» toccata), `comuniVicini(sede, dataset, {km: 20, max: 12})` (haversine sui
  centri T6a; `ponytail:` doppia con `distanzaKm` di T6a, che l'editor non può importare da `site-renderer/src`),
  `leggiSchedaPubblica(risposta, nostri)` (controllo d'identità, `work_time` → gruppi), `leggiSoa(righe, categorie,
  adesso)`, `leggiFgas(html)`, `scegliDomande(nostri, fonti)`, `componiPrecompilati(...)` con il tetto di 16 KB.
- `lib/fonti-pubbliche.ts` (I/O, nuovo 14/09): `cercaSoa(piva, {cache, fetch})` (HEAD + download condizionato in
  `~/.cache/site-factory/anac-soa/`, override `SF_ANAC_CACHE`, filtro in streaming), `cercaFgas(piva, {fetch})`;
  trasporto iniettabile e risposte registrate per i banchi (`SF_FONTI_REGISTRATE`), timeout 20 s, esiti tipizzati.
- `lib/dataforseo.ts` (I/O, nuovo 14/09, base del client di `piano-T4.md` §2): Basic auth dal Keychain
  (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`), trasporto iniettabile, `SF_DATAFORSEO_REGISTRATE`, `ErroreDfs` con i tipi
  di T4 §7, riga in `traffico/costi.ndjson`, `configurata()`, e **solo** `schedaPubblica({keyword, coordinate})`. Volumi,
  SERP, cache e saldo li aggiunge T4.
- `lib/precompila-lavoro.ts` (I/O, nuovo 14/09): il generatore delle fasi di R.4 per `startTrafficoRun`; scritture
  atomiche di `precompila.json`, miniature in `traffico/.miniature-<ts>/` (cancellate dopo il caricamento), chiamate a
  n8n, `modulo.json` per ultimo.
- `lib/dati-traffico-fs.ts` (I/O): `TRAFFICO_DIR` (`SF_TRAFFICO_DIR` o
  `…/GoogleDrive-info@consulbuild.com/Il mio Drive/site-factory-clienti/_traffico`), `DATI_N8N_URL`
  (`SF_DATI_N8N_URL` o `N8N_HOST/webhook/dati`), `DATI_FORM_URL` (`SF_DATI_FORM_URL` o
  `https://sito.consulbuild.com/dati/`); `leggiArrivo(slug)`, `importaDati(slug, {sorgente, destinazione})`,
  `salvaCorrezioni`, `confermaDati`, lettura memoizzata di `site-renderer/data/comuni-fatti.json` (decisione 6).
- `lib/run-bus.ts` (M): `kind: "traffico"`, `busIdTraffico(slug, lavoro)`, `startTrafficoRun(slug, lavoro, label,
  esegui)` come `piano-T4.md` §7 (eventi in `out/<slug>/traffico/logs/run-<lavoro>.ndjson`). `lib/agenti.ts` (M):
  etichetta e percorso per `kind: "traffico"` (→ `/traffico/<slug>`).
- `lib/secrets.ts` (M): `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` in `KNOWN_KEYS` con etichetta (la lista di
  Impostazioni si aggiorna da sola; la prova della chiave la aggiunge T4).

### 6.2 Route (Next 16: `params` è una Promise; prima del codice rileggere `route.md`,
`dynamic-routes.md` e le pagine sui catch-all in `node_modules/next/dist/docs/`)

| Route | Metodo · corpo | Esiti |
|---|---|---|
| `app/api/clients/[slug]/traffico/link/route.ts` | `POST` (nessun corpo) | (rivisto il 14/09) 202 `{runId}` = lavoro `traffico:<slug>:precompila` avviato · 400 slug · 404 cliente · 409 `client.json` illeggibile, Sito non `attivo`, contesto assente o invalido, chiave `N8N_REGISTRA_KEY` assente, dataset T6a assente, lavoro già in corso. Errori di n8n arrivano come `error` del lavoro (messaggio leggibile). `modulo.json` si scrive **solo dopo** tutti i 200 di n8n; lo stato si segue con le route esistenti del bus |
| `app/api/clients/[slug]/traffico/dati/route.ts` | `POST {azione:"importa", sovrascrivi?}` · `POST {azione:"conferma"}` · `PUT {dati, foto, verifica?}` | importa: 200 · 409 nessun invio, Drive non scaricato (col nome del file), dati già presenti senza `sovrascrivi` · 422 schema (elenco problemi). conferma: 200 · 409 se non `da_verificare` o se lo schema su disco non passa. PUT: 200 · 422 schema o comuni non risolti (elenco) · stato → `da_verificare`, o `verificato` con `verifica:true` |
| `app/api/clients/[slug]/traffico/file/[...percorso]/route.ts` | `GET` | serve solo `foto/f\d{2}\.jpg` e `attestati/\d{2}-[\w.-]+` (regex, niente `..`), content-type dall'estensione; ricalca `img/[file]/route.ts` |

### 6.3 Passi di `importaDati` (atomico; rivisto il 14/09)

1. Legge `_traffico/<slug>/invio.json` → `InvioSchema` (errore = 422, nulla scritto, Drive intatto) e
   `traffico/precompila.json`; `precompilaSha` diverso → 409 «l'invio viene da una preparazione precedente» (con
   `precedenti/` se c'è, altrimenti i riferimenti mancanti finiscono tra i punti da controllare).
2. Controlla che ogni file `fatto` del manifest sia scaricato per intero (dimensione = `bytes`; stesso
   schema di `inbox-form.ts`) → altrimenti 409 «non è ancora scaricato». Le miniature `miniatura-NN.jpg` si ignorano.
3. Carica servizi dal `contesto.json` e comuni dal dataset T6a → `normalizzaInvio`.
4. In `traffico/.import-<ts>/`: foto `lead-<n>` copiate dall'originale già pulito del cliente (`foto-originali/` se
   c'è, altrimenti `img/` di `lavori.json`: nessuna ricodifica), foto `nuova-<n>` con `normalizeToJpg(src,
   foto/fNN.jpg, Infinity)` di `lib/lavori.ts` (conversione `sips` solo se non è JPEG, senza ridimensionare →
   rotazione per gli 8 orientamenti → `senzaMetadati`; un JPEG dritto non si ricodifica); misure con `sips -g`,
   `sha256`; raggruppamento in cantieri per terna (comune, lavoro, anno).
   Attestati: PDF copiati com'è, immagini ripulite come le foto. Scrive `dati.json` (`da_verificare`), `foto.json`, `dati-grezzi.json`; valida tutto con gli
   schemi prima del rename.
5. Se esistono dati importati: li sposta in `traffico/precedenti/` (sostituendo il precedente slot), poi
   rename della cartella temporanea. **`client.json` non si tocca.**
6. Riga in `import.ndjson`; infine cancella `_traffico/<slug>/` (nella cartella sincronizzata = Cestino di
   Drive, 30 giorni). Gli originali con GPS non restano mai in `out/`.

## 7. Informativa

Due livelli dedicati al modulo, **coerenti con l'audit del 14/09** (§3.2-§3.6), senza toccare
l'informativa del form lead (correzione separata, audit §7.3):

- `site-intake/legale/informativa-dati-breve.md` e `informativa-dati-completa.md` generate in M6 con
  `genera_informativa_privacy` (legal-it) e rifinite a mano; `analisi_base_giuridica` e `verifica_citazioni`
  con esito riportato nel file; specchiate in `src/data/privacy-dati.ts` (breve, nel `dialog`) e in
  `src/pages/dati/privacy.astro` (completa).
- Contenuti: Titolare ConsulBuild; interessato = titolare dell'impresa cliente; dati: dati d'impresa
  (lavori prioritari, prezzi, comuni, nome d'uso, orari), attestati (possono contenere nome, codice fiscale e
  dati del responsabile tecnico), foto dei cantieri (metadati di posizione e dispositivo **rimossi prima
  dell'uso**; niente persone riconoscibili, targhe, civici), dati tecnici del browser.
- (Rivisto il 14/09) **Dati non raccolti presso l'interessato** (art. 14 GDPR, testo verificato oggi con `cite_law`:
  il par. 2 lett. f chiede «la fonte da cui hanno origine i dati personali e, se del caso, l'eventualità che i dati
  provengano da fonti accessibili al pubblico»; il par. 3 lett. b consente di informare «al più tardi al momento della
  prima comunicazione», cioè nel modulo stesso): risposte del form lead e contesto già in nostro possesso; registro
  pubblico ANAC delle attestazioni SOA; registro telematico nazionale F-gas; scheda Google pubblica letta tramite
  DataForSEO (orari, nome). Il modulo mostra la fonte accanto a ogni valore; nell'informativa: fonti, finalità
  (non chiedere di nuovo ciò che è già pubblico), conservazione di `precompila.json` (fino alla preparazione successiva
  o alla fine del servizio). **DataForSEO** tra i destinatari: per una ditta individuale il nome dell'impresa è un dato
  personale; sede, ruolo (responsabile o autonomo) e garanzie per il trasferimento da verificare in M6 prima di
  attivare la fonte (fino ad allora `saltata` per i nomi senza forma societaria). Licenza ANAC CC BY-SA 4.0: citazione
  della fonte nella provenienza; se il singolo dato pubblicato sul sito del cliente richieda attribuzione, da
  verificare in M6.
- Finalità: esecuzione del contratto del servizio Sito (pagine per servizio e comune, dati strutturati, scheda consigliata) e
  verifica di prezzi e attestati prima della pubblicazione — art. 6.1.b; conservazione degli attestati come
  prova dei claim pubblicati — base da verificare con legal-it (6.1.b/6.1.f, §14 dubbio 7). Cosa si
  pubblica: prezzi «da» con validità, comuni, nome d'uso, orari, foto ripulite, tipo e numero
  dell'attestato; **mai** il documento dell'attestato. Destinatari: Google (Drive), Hetzner (n8n), Cloudflare
  (modulo e sito), **Anthropic Ireland Ltd come titolare autonomo** delle conversazioni (testi delle
  pagine). Trasferimenti: Google e Cloudflare con DPF (art. 45), Anthropic con clausole tipo (art. 46.2.c).
  Conservazione **reale**: link e bozza sul server fino all'invio o a 7 giorni dopo la scadenza; file in
  arrivo fino all'importazione (+30 giorni nel Cestino di Drive); dati importati per la durata del
  servizio. Diritti artt. 15-22 e reclamo al Garante. Paragrafo statistiche solo se Umami è attivo sul
  deploy (audit §3.7). Condizioni accettate con la casella: veridicità di prezzi, attestati e dati;
  diritti sulle foto e assenza di persone riconoscibili; autorizzazione a pubblicarle sul sito del cliente;
  responsabilità del cliente sulle affermazioni.

## 8. File

### 8.1 `site-intake/`

(Rivisto il 14/09: via `cantieri.ts`, `comuni.ts` e `fatto-dati.ts` del piano precedente, `dati.css` solo se serve;
nuovi `conferma.ts`, `comuni-scelti.ts`, `etichetta-foto.ts`; il motore espande i passi.)

| File | Tipo | Cosa |
|---|---|---|
| `src/lib/engine.ts` | M | `Motore` e `caricaOAvvia` ricevono `{domande, prefisso}`; passi e indici per istanza, **calcolati dalle risposte** quando una domanda ha `ripeti(risposte) → Domanda[]` (etichette delle foto); nessun import delle domande del lead. Il lead non usa `ripeti`: passi identici. Prefisso lead `bozza` → chiavi `localStorage` identiche |
| `src/lib/render.ts` | M | `montaDomanda` riceve `registro` e `sezione` dal chiamante; niente import statici dei componenti |
| `src/lib/main.ts` | M | il lead passa domande, prefisso, registro (spostato qui da `render.ts`), uploader; nessun cambio di comportamento |
| `src/components/riepilogo.ts` | M | `montaRiepilogo` riceve domande, sezioni, etichette, formattatore e testi; `formattaRisposta` del lead resta qui |
| `src/lib/upload.ts` | M | `CodaUpload` riceve la funzione di caricamento; `TipoFile` + `attestato` |
| `src/lib/transport.ts` | M | esporta il caricatore XHR generico (url + campi); `caricaFile` del lead invariato nella firma |
| `src/components/foto.ts` | M | `max` dalla domanda (default 15 = lead); nient'altro |
| `src/components/consenso.ts` | M | testi dell'informativa da `domanda.informativa` (default = lead) |
| `src/components/scelte.ts` | M | scelta multipla: `.campo__etichetta` sopra ogni gruppo se le opzioni hanno `gruppo`; `max` con la nota di `stile.ts` |
| `src/data/domande.ts` | M | `TipoDomanda` + `prezzi`, `orari`, `attestati`, `conferma`, `etichetta-foto`, `comuni-scelti`; campi facoltativi `informativa`, `precompilato`, `ripeti` |
| `src/data/tassonomia.ts` | M | `Opzione.gruppo?` |
| `src/components/fatto.ts` | M | esporta `TELEFONO_AGENZIA` e accetta testi (default = lead) |
| `src/env.d.ts` | M | `PUBLIC_DATI_URL` |
| `src/pages/dati/index.astro` | A | pagina del modulo: stesso scheletro di `index.astro` (binario, card, testata, barra, stage, piede), primo passo statico «Controllo il tuo link…» |
| `src/pages/dati/privacy.astro` | A | informativa completa del modulo (stesso layout di `privacy.astro`) |
| `src/data/domande-dati.ts` | A | catalogo di 9 domande in 5 sezioni con testi alternativi (con/senza valore trovato), `ripeti` di `etichette`, `RisposteDati`, etichette e formattatore del riepilogo |
| `src/data/privacy-dati.ts` | A | sintesi e HTML del primo livello |
| `src/lib/main-dati.ts` | A | avvio: token dal frammento, verifica, filtro del catalogo sulle `domande`, iniezione dei `precompilati`, binario delle sole sezioni usate, stati, benvenuto con i minuti stimati, motore, coda, bozza, invio (`etichette` composte), grazie |
| `src/lib/transport-dati.ts` | A | `verifica`, `salvaBozza`, `caricaFileDati`, `miniatura` (blob), `inviaDati` con token nel corpo; esiti 404/409/410 tipizzati |
| `src/lib/validatori-dati.ts` | A | puri: importo, fasce orarie, scorciatoie orari, anni, doppioni comuni, durata stimata |
| `src/components/conferma.ts` | A | valore trovato in `.conferma` + fonte in `.campo__aiuto` + «Sì, è giusto» / «No, lo correggo» (`.scelte--righe`) che rivela la correzione (R.5) |
| `src/components/comuni-scelti.ts` | A | schema di `zone.ts` con i comuni: chip precompilati e vicini, ricerca con `cercaComuni`, «Aggiungi» |
| `src/components/orari.ts` | A | conferma (se c'è) o scorciatoie + correzione giorni/fasce, con parti esistenti |
| `src/components/prezzi.ts` | A | righe per i lavori prioritari, con parti esistenti |
| `src/components/attestati.ts` | A | conferme dei registri + ripetitore con documento (UI di `logo.ts`) |
| `src/components/etichetta-foto.ts` | A | foto in `.stile__anteprima` + «Come la foto prima» + comune, lavoro, anno a chip + «Non usare questa foto» |
| `src/components/stato-link.ts` | A | schermate di §2.5 con il markup di `.passo` |
| `src/styles/dati.css` | A (solo se serve) | sole regole di impaginazione (altezza massima della foto), sorvegliate dal controllo §10.3 bis caso 3 |
| `scripts/check-budget.mjs` | M | budget per pagina: JS raggiungibile dagli `<script>` dell'HTML (import seguiti); lead invariato, `/dati/` con soglie proprie |
| `dev/inbox.mjs` | M | route `/api/dati/{link,verifica,bozza,file,miniatura,miniatura/carica,invio}` su `.dev-inbox/_dati/` e `.dev-inbox/_traffico/<slug>/`, logica dai nodi Code veri; `link` di sviluppo accetta `scadeAt`/`stato`/`domande`/`precompilati` per i test |
| `dev/n8n-codice.mjs` | A | shim che esegue i nodi Code di un workflow versionato |
| `tests/dati.spec.ts` | A | percorsi per combinazioni di domande, stati, ripresa, a11y (`@a11y`), schermate (`@schermate`) |
| `tests/dati-design.spec.ts` | A | confronto con il form principale (`@design`, §10.3 bis) |
| `tests/dati-n8n.spec.ts` | A | nodi Code veri senza rete (`@controlli`) |
| `tests/fixtures/attestato.pdf`, `tests/fixtures/precompilati-*.json` | A | PDF minimo; tre pre-compilazioni di prova (Tally con 12 foto, v4 minimo, registri trovati) |
| `legale/informativa-dati-breve.md`, `legale/informativa-dati-completa.md` | A | §7 |
| `README.md`, `DESIGN.md`, `PRODUCT.md` | M | seconda superficie, trasporto `dati/*`, composizioni nuove (conferma, etichetta foto), budget per pagina |

Non si toccano: `index.astro`, `privacy.astro`, `domande.ts` nelle domande, `validators.ts`, `lib/comuni.ts`,
`lib/motion.ts`, `styles/{tokens,base,components,upload,motion}.css`, `build-comuni.mjs`, `public/data/`,
`playwright.config.ts`, `wrangler.jsonc`, i test esistenti.

### 8.2 `infra/n8n/`

| File | Tipo | Cosa |
|---|---|---|
| `infra/n8n/dati.json` | A | `sf-dati` (§4.2) |
| `infra/n8n/dati-pulizia.json` | A | `sf-dati-pulizia` (§4.3) |

### 8.3 `site-factory-editor/`

| File | Tipo | Cosa |
|---|---|---|
| `lib/metadati-foto.ts`, `lib/lavori.ts` | — | esistono già (14/09): si importano, non si modificano (§6.1, §6.3) |
| `lib/dati-traffico.ts` | A | §5, §6.1 |
| `lib/dati-traffico-fs.ts` | A | §6.1, §6.3 |
| `lib/precompila-dati.ts` | A (14/09) | regole pure della pre-compilazione (R.4, §6.1) |
| `lib/precompila-lavoro.ts` | A (14/09) | fasi del lavoro `traffico:<slug>:precompila` |
| `lib/fonti-pubbliche.ts` | A (14/09) | ANAC SOA e F-gas |
| `lib/dataforseo.ts` | A (14/09) | base del client di T4 + `schedaPubblica` |
| `lib/run-bus.ts`, `lib/agenti.ts` | M (14/09) | `kind: "traffico"` come `piano-T4.md` §7 |
| `lib/secrets.ts` | M (14/09) | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` |
| `app/api/clients/[slug]/traffico/link/route.ts` | A | §6.2 (avvia il lavoro) |
| `app/api/clients/[slug]/traffico/dati/route.ts` | A | §6.2 |
| `app/api/clients/[slug]/traffico/file/[...percorso]/route.ts` | A | §6.2 |
| `components/traffico-dati.tsx` | A | blocco di §2.8 (client: azioni, fasi, dialog, modifica, provenienza) |
| `app/traffico/[slug]/page.tsx` | M | blocco nella card Sito; «Cosa servirà» aggiornato (il modulo esiste) |
| `scripts/test-dati-traffico.ts` | A | banco §10.1 |
| `scripts/test-precompila-dati.ts` | A (14/09) | banco §10.1 bis |
| `scripts/fixtures/dati-traffico/invio-valido.json`, `contesto-servizi.json`, `scheda-dfs-*.json`, `soa-estratto.csv`, `soa-categorie-estratto.csv`, `fgas-*.html` | A | fixture dei banchi (risposte registrate; estratti ANAC con righe verbatim di imprese note e fonte, P.IVA di prova sintetiche per i casi costruiti) |
| `scripts/n8n-import.ts` | M | `dati`, `dati-pulizia` in `TUTTI` |
| `DESIGN-BRIEF.md` | M | sezione «Dati per farti trovare (shape — 2026-09-14)» |

Non si toccano: `lib/schemas.ts`, `lib/traffico.ts`, `lib/inbox-form.ts`, `lib/lavori.ts`, `lib/metadati-foto.ts`,
`lib/steps.ts`, `lib/catena.ts`, `lib/build.ts`, `lib/deploy.ts`, `lib/staleness.ts`, `app/api/setup/keys/route.ts` (la
prova della chiave DataForSEO è di T4).

### 8.4 `docs/`

`docs/traffico/piano-T3.md` (Calibrazione, Verifica, chiusura) · `docs/traffico/README.md` (§3 regola
«solo dati verificati», §7 stato) · `docs/traffico/piano-T4.md` (solo la nota di R.6 sui file passati da A a M, a
chiusura di T3) · `docs/handoff-fase-c.md` · `docs/vps-integrazioni-setup.md` (§11: cartella `_traffico`, Data table
`LinkDati` con `domande`/`precompilati`/`nFoto`, `sf-dati`, `sf-dati-pulizia`, route miniature, prove con curl) ·
`docs/DEBUG.md` (righe «il link del modulo non funziona», «il modulo chiede qualcosa che avevamo» → `precompila.json`
`domande[].motivo` e `fonti`, «Importa dati fallisce», «foto ruotate o con EXIF»).

Fixture fuori git: `site-renderer/out/zz-test-t3/` (`client.json` completo con Sito attivo, `brief.json` Tally,
`intake.json`, `contesto.json` ridotto e anonimo, `lavori.json` + 3 `img/` di prova) e `zz-test-t3-v4/` (`brief.json` e
`raw-submission.json` v4 con zone «Monza (MB)», «Tutta la regione Lombardia», «Certificazioni» toccata, 2 foto in
`foto-originali/`), nel Cestino a fine fase 4.

## 9. Perimetro per `.claude/scope.json` (primo atto della fase 2, a perimetro libero e T6a chiuso; rivisto il 14/09)

```json
{
  "task": "T3 Mini-form «Dati per farti trovare» (docs/traffico/piano-T3.md)",
  "perimetro": [
    "site-intake/src/lib/engine.ts",
    "site-intake/src/lib/render.ts",
    "site-intake/src/lib/main.ts",
    "site-intake/src/lib/upload.ts",
    "site-intake/src/lib/transport.ts",
    "site-intake/src/lib/main-dati.ts",
    "site-intake/src/lib/transport-dati.ts",
    "site-intake/src/lib/validatori-dati.ts",
    "site-intake/src/components/riepilogo.ts",
    "site-intake/src/components/foto.ts",
    "site-intake/src/components/consenso.ts",
    "site-intake/src/components/scelte.ts",
    "site-intake/src/components/fatto.ts",
    "site-intake/src/components/conferma.ts",
    "site-intake/src/components/comuni-scelti.ts",
    "site-intake/src/components/orari.ts",
    "site-intake/src/components/prezzi.ts",
    "site-intake/src/components/attestati.ts",
    "site-intake/src/components/etichetta-foto.ts",
    "site-intake/src/components/stato-link.ts",
    "site-intake/src/data/domande.ts",
    "site-intake/src/data/tassonomia.ts",
    "site-intake/src/data/domande-dati.ts",
    "site-intake/src/data/privacy-dati.ts",
    "site-intake/src/env.d.ts",
    "site-intake/src/pages/dati/**",
    "site-intake/src/styles/dati.css",
    "site-intake/scripts/check-budget.mjs",
    "site-intake/dev/inbox.mjs",
    "site-intake/dev/n8n-codice.mjs",
    "site-intake/tests/dati.spec.ts",
    "site-intake/tests/dati-design.spec.ts",
    "site-intake/tests/dati-n8n.spec.ts",
    "site-intake/tests/fixtures/attestato.pdf",
    "site-intake/tests/fixtures/precompilati-*.json",
    "site-intake/legale/informativa-dati-breve.md",
    "site-intake/legale/informativa-dati-completa.md",
    "site-intake/README.md",
    "site-intake/DESIGN.md",
    "site-intake/PRODUCT.md",
    "infra/n8n/dati.json",
    "infra/n8n/dati-pulizia.json",
    "site-factory-editor/lib/dati-traffico.ts",
    "site-factory-editor/lib/dati-traffico-fs.ts",
    "site-factory-editor/lib/precompila-dati.ts",
    "site-factory-editor/lib/precompila-lavoro.ts",
    "site-factory-editor/lib/fonti-pubbliche.ts",
    "site-factory-editor/lib/dataforseo.ts",
    "site-factory-editor/lib/run-bus.ts",
    "site-factory-editor/lib/agenti.ts",
    "site-factory-editor/lib/secrets.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/link/route.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/dati/route.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/file/**",
    "site-factory-editor/components/traffico-dati.tsx",
    "site-factory-editor/app/traffico/[slug]/page.tsx",
    "site-factory-editor/scripts/test-dati-traffico.ts",
    "site-factory-editor/scripts/test-precompila-dati.ts",
    "site-factory-editor/scripts/fixtures/dati-traffico/**",
    "site-factory-editor/scripts/n8n-import.ts",
    "site-factory-editor/DESIGN-BRIEF.md",
    "docs/traffico/**",
    "docs/handoff-fase-c.md",
    "docs/vps-integrazioni-setup.md",
    "docs/DEBUG.md"
  ]
}
```

## 10. Banchi e test

### 10.1 `site-factory-editor/scripts/test-dati-traffico.ts` (senza rete, stile `test-traffico-stato.ts`)

Schemi e normalizzazione
1. `invio-valido.json` passa `InvioSchema`; chiave in più a ogni livello → rifiutata; `condizioni` assente → rifiutata.
2. priorità 0 o 4 → rifiutata; importo 0, negativo, `NaN`, 1.000.001 → rifiutato; unità fuori elenco → rifiutata.
3. orari: `da ≥ a`, fasce sovrapposte, giorno ripetuto o in due gruppi, `24:00` → rifiutati.
4. `validoFino`: 6 e 12 mesi; 31/08 + 6 mesi = 28/02 (29/02 negli anni bisestili); `inviatoAt` alle 23:30 UTC
   del 30/09 = 01/10 a Roma.
5. comuni (dataset T6a, rivisto il 14/09): «Sant'Angelo Lodigiano», maiuscole e accenti risolti; Calliano (TN) e
   Calliano (AT) distinti dalla sigla; «Alghero (SS)» dell'elenco del form → codice 2026 `112001`; nome precedente
   (Grana → Grana Monferrato); nome inesistente o ambiguo senza sigla utile → escluso + punto; nessun doppione ISTAT.
6. servizio non nel contesto → tenuto col nome + punto; attestato del cliente senza file, con file `errore`, scaduto →
   `documento: null` o punto; attestato `anac-soa` confermato senza documento → pubblicabile; `pubblica: false` → non
   scritto; foto fuori dai comuni serviti → punto.
6b. conferme (14/09): `si` → valore e provenienza di `precompila.json` con `confermatoIl`; `no` con valore → provenienza
   `cliente`; `no` senza valore → `null`; `rif` inesistente o `precompilaSha` diverso → errore con elenco; comuni
   precompilati deselezionati non entrano.
6c. etichette (14/09): terne uguali → un cantiere; «Come la foto prima» copia la terna; terna incompleta →
   `senzaCantiere`; `escludi` del cliente → `escludi: true`; `anno: "prima"` accettato.
7. `DatiTrafficoSchema` e `FotoTrafficoSchema` (versione 2) su output normalizzato: validi; `verificatoAt` senza stato
   verificato → rifiutato; anno futuro → rifiutato; attestato senza documento e con provenienza `cliente` segnato
   pubblicabile → rifiutato.

Link e stati
8. token: 64 hex, due generazioni diverse, hash = sha256 hex; `linkDaToken` contiene solo base + `#token`
   (nessuna sottostringa di slug o azienda).
9. `statoBlocco` per ogni riga di §2.8 (Sito spento → nascosto; sospeso → sola lettura; chiave assente,
   contesto assente, client.json illeggibile → motivo; link scaduto; arrivo; da verificare; verificati).

Foto
10-12. **Già coperti** da `scripts/test-metadati-foto.ts` (14/09, macOS, senza rete né binari in git):
    `senzaMetadati` su EXIF con GPS, XMP, IPTC, COM, MPF, ICC e coda dopo l'EOI; `orientamentoExif` II/MM,
    assente, rovinato, PNG e troncato; `normalizeToJpg` sugli orientamenti 1..8, da HEIC, ridimensionata e
    su JPEG irregolare → ruotata una sola volta (quadranti letti dal BMP), zero metadati. Il banco T3 non
    li duplica: verifica solo che `foto/fNN.jpg` escano senza metadati (test 15).

Import su cartelle temporanee (`sorgente`/`destinazione` passate alla funzione)
13. file del manifest con dimensione diversa → errore «non scaricato», nulla scritto, sorgente intatta; miniature
    ignorate.
14. invio fuori schema → errore con elenco, nulla scritto, sorgente intatta.
15. import riuscito → `dati.json` (`da_verificare`), `foto.json`, `dati-grezzi.json`, `foto/fNN.jpg` senza
    APP1 (le `lead-<n>` copiate byte per byte dall'originale pulito, le `nuova-<n>` ripulite), `import.ndjson` con una
    riga senza valori personali, sorgente rimossa.
16. reimport → i dati precedenti in `precedenti/`, i nuovi al loro posto; nessun file fuori da `traffico/`.
17. correzione (`salvaCorrezioni`) → stato `da_verificare`, provenienza del campo corretto → `mattia`; con `verifica` →
    `verificato` + `verificatoAt`; comune «Monza (MB)» risolto, «Monzaa (MB)» → errore con elenco.

### 10.1 bis `site-factory-editor/scripts/test-precompila-dati.ts` (nuovo 14/09, senza rete, risposte registrate)

Dati nostri
1. Brief Tally (forma di Cavaliere, anonimizzata) → `formVersione: null`, sede risolta per nome unico, nessun comune
   preciso, 12 foto da `lavori.json`; lead v4 → sede con sigla, «Monza (MB)» dalle zone preciso, «Tutta la regione
   Lombardia» ignorata, «Certificazioni» toccata, foto da `foto-originali/` in ordine NN.
2. `comuniVicini`: sede inclusa una sola volta, ordinati per distanza, ≤ 12 e ≤ 20 km; sede non risolta → `[]`.

Scheda Google (fixture `scheda-dfs-*.json`)
3. telefono uguale con `+39` e spazi → `ok`, identità `telefono`; dominio uguale con `www.` → `ok`, identità `dominio`;
   nessuno dei due → `non_trovato` («nessuna scheda con lo stesso telefono o sito»); `work_time` assente → `ok` senza orari.
4. `timetable` con giorni uguali raggruppati in ≤ 2 gruppi; più di 2 gruppi o fasce oltre 2 → non precompilato (domanda
   vuota) + motivo; `24:00` → fine giornata.
5. chiavi assenti → `non_configurata` senza chiamate; 401 → `non_raggiungibile` col messaggio di T4 §7; nome senza forma
   societaria finché M6 non chiude il dubbio → `saltata`; riga in `costi.ndjson` solo per chiamate partite.

Registri
6. SOA (estratti CSV con righe verbatim): `PUBBLICO` in validità → `ok` con categorie e classifiche; `SOSTITUITO`,
   `SCADUTO_5_ANNI`, `ANNULLATO`, quinquennale passata, triennale passata senza verifica → `non_trovato`; denominazione con
   `;` tra virgolette letta giusta; P.IVA a 16 caratteri o assente → `saltata`; file non raggiungibile con cache vecchia →
   usa la cache e dichiara la data; senza cache → `non_raggiungibile`.
7. F-gas (HTML registrati): certificato valido → `ok` con numero e scadenza; nessun risultato → `non_trovato`; tabella
   senza le etichette attese → `forma_inattesa`; timeout → `non_raggiungibile`.

Scelta delle domande e contenuto verso n8n
8. matrice di `scegliDomande`: Tally con 12 foto (tutte e 9 le domande del catalogo) · v4 minimo senza foto né certificazioni con
   orari trovati (6 domande, orari in conferma) · elettricista v4 (attestati con DM 37/08 in cima) · registro `ok` senza
   «Certificazioni» (attestati solo conferme) · 15 foto (niente `foto_nuove`).
9. `componiPrecompilati`: ≤ 16 KB anche con 40 comuni e 15 foto; **nessuna** P.IVA, codice fiscale, telefono, e-mail o
   referente nella serializzazione (ricerca delle stringhe della fixture); `precompilaSha` stabile a parità di input.
10. lavoro completo con n8n finto: fasi nell'ordine di R.4; `modulo.json` scritto solo dopo l'ultimo 200; errore alla 7ª
    miniatura → nessun `modulo.json`, messaggio leggibile, miniature temporanee cancellate; nessuna fonte esterna fa
    fallire il lavoro.

### 10.2 `site-intake/tests/dati-n8n.spec.ts` (nodi Code veri da `infra/n8n/dati.json` e `dati-pulizia.json`)

1. «Leggi token»: token assente, 63 caratteri, maiuscole, non hex → 400 senza lettura della tabella.
2. «Prepara»: riga assente → 404; `scade` passata → 410 con `scadeAt`; `inviato` → 409 con `inviatoAt`.
3. file: `kind` sconosciuto, index 0/41 (foto) e 9 (attestato), MIME `image/heic` o `text/html`, PDF come
   foto, 25 MiB + 1 byte → 400; nomi con spazi e accenti → `foto-03-cucina-nuova.jpg`.
4. bozza > 64 KB o chiave non ammessa → 400; invio > 256 KB, con `slug` o `cartella` nel corpo → 400;
   invio valido → `invio.json` con `inviatoAt` del server.
5. «Valida link»: slug con maiuscole o `/`, hash corto, `scadeAt` passata o oltre 90 giorni, servizi vuoti → 400.
6. «Valuta» della pulizia: tabella di casi (orfana, scaduta da 8 giorni, inviata e importata da 31 giorni,
   inviata non importata da 61 giorni → solo avviso), messaggio Telegram senza nomi.
7. Nessun segnaposto `CARTELLA_TRAFFICO` nei JSON (attivo dal passo di rilascio R2).
8. (14/09) «Valida link»: `domande` con id sconosciuto, doppione o senza `priorita`/`comuni`/`condizioni`; `precompilati`
   oltre 16 KB o con chiave non ammessa; una stringa di 11 cifre o di 16 caratteri a forma di codice fiscale in
   `precompilati` → 400.
9. (14/09) «Miniatura carica»: senza chiave → 403; slug senza riga, `n` 0 o 16, `image/png`, oltre 200 KB → 400; ok →
   `miniatura-03.jpg`. «Miniatura» dal modulo: `n` > `nFoto` → 400; token scaduto → 410; ok → binario `image/jpeg` con
   `no-store`.
10. (14/09) bozza: `etichetta_lead_3` ammessa solo se `etichette` è tra le `domande`; file `foto` oltre 15 − `nFoto` → 400;
    verifica → corpo con `domande`, `precompilati`, `nFoto`.

### 10.3 `site-intake/tests/dati.spec.ts` (Playwright su `astro dev`, progetti telefono/tablet/computer; rivisto il 14/09)

1. `@dati` percorso **Tally con foto** (`precompilati-tally.json`, 3 miniature di prova) a 390 px: benvenuto con l'azienda
   e «circa N minuti» → priorità (4° tocco respinto) → prezzi (importo senza unità = blocco, poi corretto; riga vuota) →
   comuni (sede già selezionata con «Ci avevi indicato», un vicino toccato, «monz» → Monza (MB) aggiunto, doppione
   ignorato, testo non scelto = avviso) → nome d'uso («No, lo correggo» → testo) → orari (scorciatoia + fine corretta;
   inizio > fine = errore) → attestati («Sì», DM 37/08, PDF) → foto 1 (comune, lavoro, anno) → foto 2 «Come la foto
   prima» (avanti da solo) → foto 3 «Non usare questa foto» → foto nuove (1 JPEG) → etichetta della nuova → condizioni
   (blocco senza spunta, dialog) → riepilogo (riga foto, Modifica e ritorno) → invio → rivelazione → «Grazie». Controlli su
   `.dev-inbox/_traffico/zz-test-t3/`: `invio.json` versione 2 con `precompilaSha`, `etichette` `lead-1..3` e `nuova-1`,
   `foto-01`, `attestato-01-attestato.pdf`, riga del link `inviato`.
2. `@dati` percorso **v4 minimo** (`precompilati-minimo.json`): esattamente 6 passi prima del riepilogo; «Come ti trovano»
   con la sola conferma degli orari («Sì, è giusto»); binario con 4 sezioni e «Sezione N di 4»; nessun passo su nome
   d'uso, attestati o etichette; `invio.json` senza quelle chiavi.
3. `@dati` percorso **registri trovati** (`precompilati-registri.json`): SOA «Sì, scrivila sul sito», F-gas «No»; nessun
   documento chiesto per la SOA; `attestati.trovati` coerente.
4. `@dati` ripresa sullo stesso browser dopo ricaricamento (passo, risposte, foto «caricata»), anche a metà delle etichette.
5. `@dati` ripresa da un altro contesto browser con lo stesso link (bozza dal server).
6. `@dati` stati: senza frammento; `#abc` (nessuna chiamata di rete); token ben formato sconosciuto;
   scaduto con data; già inviato; link rigenerato (il primo → non valido).
7. `@dati` link rigenerato con `domande` diverse: le risposte di id non più presenti non ricompaiono e non partono.
8. `@dati` link di un altro cliente: file e miniature del link B solo dalla cartella di B.
9. `@dati` scadenza durante la compilazione: 410 al caricamento di una foto → schermata; nuovo link della
   stessa azienda → ripresa dal passo.
10. `@dati` invio ripetuto dopo timeout simulato (risposta interrotta a scrittura avvenuta) → 409 → «Grazie».
11. `@dati` rete assente alla verifica → «Riprova» funziona; miniatura che non arriva → segnaposto `.foto-voce__segnaposto`
    e il passo resta compilabile.
12. `@dati` «Modifica» dal riepilogo verso le foto nuove, togliendone una: il passo della sua etichetta sparisce, le
    altre risposte restano (passi calcolati, risposte per id).
13. `@a11y` axe WCAG A/AA: benvenuto, comuni con suggerimenti, conferma degli orari aperta su «No, lo correggo»,
    attestati con conferme, etichetta di una foto, riepilogo, stato scaduto, dialog dell'informativa.
14. `@schermate` benvenuto e passi chiave a 360/390/430/768/1280 in `.impeccable/review/schermate/dati-*`;
    a 390×680 «Inizia» e «Continua» della prima domanda sopra la piega.

Tutti i test esistenti (`controlli`, `flusso` ×3, `a11y`, `schermate`) restano verdi senza modifiche.

### 10.3 bis `site-intake/tests/dati-design.spec.ts` — confronto con il form principale (nuovo 14/09, `@design`)

Solo nel progetto «computer», larghezze impostate dal test (390 e 1280), stessa fixture di foto e di testi lunghi.

1. **Stili calcolati identici.** Per coppie di elementi equivalenti su `/` e `/dati/#<token di sviluppo>`: `body`,
   `.card`, `.card__testata`, `.marchio`, `.progresso__eti`, `.progresso__riempi`, `.binario__voce[aria-current]`,
   `.passo__sezione`, `.passo__titolo`, `.passo__aiuto`, `.scelte--chip .scelta` e `.scelte--righe .scelta` (libere e
   selezionate), `.campo__input` (normale ed errore), `.suggerimenti__voce.is-attivo`, `.btn--primario`, `.btn--ghost`,
   `.btn--secondario.btn--sm`, `.avviso--attenzione`, `.avviso--errore`, `.foto-voce`, `.conferma`, `.riepilogo__riga`,
   `.btn--invia`, `.attesa`, `.card.is-fatto`, `.tappe` — si confrontano `font-family`, `font-size`, `font-weight`,
   `letter-spacing`, `line-height`, `color`, `background-color`, `background-image`, bordi (larghezza, colore, raggio),
   `box-shadow`, `padding`, `min-height`, `gap` e l'`outline` al focus. Una differenza = test rosso con selettore,
   proprietà e i due valori.
2. **Motion identico.** Dopo «Continua» su un passo dello stesso tipo in entrambe le pagine: `document.getAnimations()`
   su figli di `.passo.is-uscita` e `.passo.is-entrata` e sull'altezza di `.stage` → stessi nomi, durate, ritardi,
   curve e numero di scaglioni; con `prefers-reduced-motion` la stessa dissolvenza; `mostraAttesa` e `rivelazione` con
   gli stessi tempi (letti dagli stessi token).
3. **Nessuno stile nuovo.** `/dati/` carica gli stessi fogli del lead più, al massimo, `dati.css`; in `dati.css` solo
   proprietà di impaginazione (`display`, `grid-*`, `gap`, `width`, `max-width`, `height`, `max-height`, `aspect-ratio`,
   `object-fit`, `flex*`, `align-*`, `justify-*`, `margin*`) con valori `var(--s-*)`, percentuali, `vh` o `auto`; nessun
   colore, `@keyframes`, `transition`, `animation`, `box-shadow`, `border*`, `font*`, `opacity`, `transform`; nei
   componenti nuovi nessun attributo `style` tranne `--p` e `--i` già usati dal lead.
4. **Schermate affiancate** per la critique in `.impeccable/review/schermate/confronto/{390,1280}-{testata,chip,righe,
   testo-errore,avviso,suggerimenti,riepilogo,attesa,fatto}-{lead,dati}.png`, più `conferma` ed `etichetta-foto` del
   modulo; `/impeccable critique` le giudica a coppie in M4.
5. **Sopra la piega a 390×680**: «Continua» del primo passo del modulo e di un passo `etichetta_*` con foto verticale.

## 11. Milestone (ogni verifica deve passare prima della successiva; rivisto il 14/09)

**M0 — Precondizioni.** T6a chiuso con `site-renderer/data/comuni-fatti.json` committato; `scope.json` vuoto; `git log
--oneline -5`, `git status --short`; scrivo `scope.json` (§9). Letture: guide Next 16 (route handler, catch-all,
`useRouter`), `lib/run-bus.ts`, `piano-T4.md` §2 e §7, `reference/craft-floor.md` di impeccable prima di M4.

**M1 — Motore parametrico, lead invariato.** Refactor di §8.1 righe M (engine con `ripeti`, render, main, riepilogo,
upload, transport, foto, consenso, scelte, domande, tassonomia, fatto) + `check-budget.mjs` per pagina. Verifica
(decisione 4): `npm run check`; `npm test` completo verde sui tre progetti; `npm run build` con JS del lead entro ±0,5 KB
dal valore di oggi (26,8 KB) e HTML identico nei byte gzip ±0,1 KB; **schermate del lead identiche al pixel** prima/dopo
sui passi di `@schermate` (motion ridotto, buffer PNG uguali); **`lead.json` inviato identico al byte** sul flusso di
prova a parità di `leadId`, orologio e UA; passi del lead calcolati uguali all'elenco di oggi (controllo in
`controlli`); `git diff --stat` solo i file M di §8.1. **Commit 1** + push.

**M2 — Contratto n8n e backend di sviluppo.** `infra/n8n/dati.json` (con `domande`, `precompilati`, miniature),
`dati-pulizia.json` (id cartella come segnaposto), `dev/n8n-codice.mjs`, `dev/inbox.mjs`, `tests/dati-n8n.spec.ts`.
Verifica: spec verde (casi 1-10); test del lead verdi. **Commit 2** + push.

**M3 — Pre-compilazione nell'editor (senza UI).** `precompila-dati`, `fonti-pubbliche`, `dataforseo` (base),
`precompila-lavoro`, `run-bus`, `agenti`, `secrets`, route `link`, fixture `zz-test-t3` e `zz-test-t3-v4`, banco §10.1
bis. Verifica: banco verde; `npx tsc --noEmit`; `npm run build`; il lavoro vero sulle due fixture contro il backend di
sviluppo di site-intake, con DataForSEO `non_configurata` → `precompila.json` valido, domande attese, miniature arrivate
in `.dev-inbox`, `modulo.json` per ultimo; **una** lettura reale di ANAC e F-gas con la P.IVA di un'impresa pubblica
nota indicata da Mattia (mai P.IVA dei clienti per le prove), esito e durata nel piano; la chiamata DataForSEO reale
(0,0054 $) solo dopo l'inserimento delle chiavi e col sì di Mattia. **Commit 3** + push.

**M4 — Modulo.** Pagina, catalogo, composizioni, trasporto, testi provvisori dell'informativa marcati come tali.
Verifica: `npm run check`; `npm run build` (budget lead invariato, `/dati/` entro soglie: HTML 25, JS 45, font 45,
totale 120 KB, da calibrare); `tests/dati.spec.ts` e `tests/dati-design.spec.ts` completi; `impeccable detect --json`
sui file nuovi; `/impeccable critique` sulle coppie di schermate lead/modulo (il form ha un tema solo, dichiarato in
`DESIGN.md`); una sola tornata di correzioni, poi di nuovo `@design`. **Commit 4** + push.

**M5 — Editor: import e pannello.** `dati-traffico`, `dati-traffico-fs`, route `dati` e `file`, `traffico-dati.tsx`,
pagina, banco §10.1. Verifica: banchi §10.1 e §10.1 bis verdi; `npx tsc --noEmit`; `npm run build`;
`test-metadati-foto.ts`, `test-traffico-stato.ts` e `test-import-form.ts` verdi. E2E locale con
`SF_DATI_N8N_URL`/`SF_DATI_FORM_URL` sul dev di site-intake e `SF_TRAFFICO_DIR=.dev-inbox/_traffico`: «Prepara il
modulo» → fasi nella status bar → Playwright compila → «Importa i dati» → `dati.json` e `foto.json` validi con la
provenienza, foto senza APP1, sha256 di `client.json`, `contesto.json`, `copy.json` della fixture **identici** prima/dopo
e nessun banner di staleness nell'hub; stati del blocco nel browser a 1280 e 400 px, tema chiaro e scuro; modifica +
«Salva e segna verificato»; detector. **Commit 5** + push.

**M6 — Legale e documenti.** Informativa §7 con legal-it (art. 14 e fonti, DataForSEO come destinatario, licenza ANAC,
attestati da registro senza documento), `privacy-dati.ts`, `dati/privacy.astro`, schermate del dialog e della pagina;
`docs/vps-integrazioni-setup.md` §11, `docs/DEBUG.md`, README e DESIGN di site-intake, `DESIGN-BRIEF.md`, nota di R.6 in
`piano-T4.md`. Verifica: `verifica_citazioni` tutte trovate; build e test di site-intake verdi; dubbio 14 chiuso (la
fonte DataForSEO per i nomi di ditte individuali resta `saltata` finché non lo è). **Commit 6** + push.

**M7 — Rilascio in produzione** (§12), solo con suite completa verde e ok di Mattia. **Commit 7** (id della
cartella nei JSON, esito delle prove) + push.

Fasi 3-5: calibrazione (durata per passo e totale su Cavaliere con cronometro su telefono vero, testi d'aiuto, soglie
dei comuni vicini, ordine, limiti, criterio di riapertura del sito attuale); test completi; `/impeccable critique`
finale sulle due superfici; revisione del diff riga per riga; fixture nel Cestino; README §7 e handoff; `scope.json`
svuotato; commit finale dopo le verifiche dell'orchestratore.

## 12. Rilascio in produzione e rollback

Prerequisiti (rivisti il 14/09): M1-M6 committati; `npm run build`, `npm run check`, `npm test` (site-intake, con
`@design`), banchi §10.1 e §10.1 bis, `tsc`, `npm run build` (editor) verdi nella stessa sessione.

- **R1 — Mattia**: crea `site-factory-clienti/_traffico` su Drive (mi passa l'id) e la Data table `LinkDati`
  (§4.1, colonne del 14/09).
- **R2 — Id nei JSON**: sostituisco il segnaposto, `tests/dati-n8n.spec.ts` verde (caso 7).
- **R3 — Workflow n8n**: `node --experimental-strip-types scripts/n8n-import.ts import dati` e poi
  `… import dati-pulizia`. Sono workflow **nuovi**: `sf-bozza` e gli altri non cambiano. Controllo attivazione.
- **R4 — Prova a secco con curl** (token di prova noto, slug `zz-test-t3`): link senza chiave → 403; link con
  chiave → 200 e cartella creata; verifica → 200 con azienda; token sconosciuto → 404, malformato → 400;
  preflight CORS di `PATCH dati/bozza` → 204; bozza → 200; foto JPEG → 200 su Drive; `text/html` → 400;
  30 MB → 400; invio → 200 e riga `inviato`; verifica di nuovo → 409; pulizia con chiave e `giorni` di prova
  mentre `_traffico` contiene solo la cartella di prova. (14/09) `domande` sconosciute o `precompilati` oltre 16 KB →
  400; miniatura carica senza chiave → 403, con chiave → 200 su Drive; miniatura dal modulo → `image/jpeg`, `n` oltre
  `nFoto` → 400. Qui si verificano anche i punti incerti del §13 (nodo Crypto, filtro della Data table, codice di
  risposta da espressione, dimensione di `bozza` e `precompilati`, risposta binaria del nodo Respond).
- **R5 — site-intake in anteprima**: `PUBLIC_INTAKE_URL=… PUBLIC_DATI_URL=https://n8n.consulbuild.com/webhook/dati
  npm run build` (budget) → `npx wrangler versions upload --config wrangler.jsonc` (nessun traffico spostato)
  → sull'URL di anteprima: primo passo del lead visibile e percorso del lead fino al riepilogo **senza
  inviare**; modulo `/dati/` col link di prova fino all'invio.
- **R6 — Pubblicazione**: `npx wrangler versions deploy <id>@100%`; su `sito.consulbuild.com` prova del lead
  fino al riepilogo e del modulo.
- **R7 — Prova dal vivo**: dall'editor «Prepara il modulo» per `zz-test-t3` (3 foto di prova già «arrivate») → link
  mandato al WhatsApp di Mattia → compilato su iPhone vero nel browser di WhatsApp e in Safari: etichette delle 3 foto
  (miniature visibili), una foto nuova verticale che ha il GPS → «Importa i dati» → foto dritta e senza metadati
  (controllo col banco), `dati.json` valido con la provenienza, fixture non stale; cronometro per la calibrazione.
- **R8 — Pulizia**: cartella `_traffico/zz-test-t3` già nel Cestino dall'import; riga `LinkDati` eliminata
  dall'interfaccia n8n; `out/zz-test-t3` nel Cestino (a fine fase 4); nessun lead di prova in `_inbox` (il
  lead non viene mai inviato nelle prove).

Rollback:
- **Modulo o lead rotti dopo R6**: `npx wrangler rollback` alla versione precedente (istantaneo; il lead torna
  al codice di prima, `/dati/` sparisce).
- **n8n**: disattivare `sf-dati` e `sf-dati-pulizia`; nessun altro workflow da ripristinare.
- **Editor**: revert dei commit di M3 e M5; i file in `traffico/` restano inerti (nessun consumatore); la cache ANAC in
  `~/.cache/site-factory/anac-soa/` si può cancellare.
- Dati: `_traffico` e `LinkDati` possono restare; se il rollback è definitivo, cancellazione a mano.

## 13. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **Form lead cambiato** dal refactor del motore | parametri espliciti, prefisso `bozza` invariato, suite esistente intatta su 3 progetti, budget per pagina con tolleranza stretta, schermate prima/dopo, `diff --stat` ristretto (M1), lead provato in anteprima prima di spostare il traffico (R5), rollback Workers istantaneo |
| **Spam e abusi** | ogni route pubblica chiede un token valido prima di toccare Drive; formato controllato prima della Data table; la cartella nasce solo dalla route autenticata; limiti di numero, peso e dimensione del JSON; campi estranei rifiutati; pulizia notturna; nessuna cartella creabile da fuori (niente soglia «300 cartelle» da sorvegliare) |
| **File grandi** | un file per richiesta ≤ 25 MiB col peso reale dal binario, retry della coda del lead, 2 in parallelo, massimo 23 file (15 foto meno quelle già arrivate, 8 attestati); caso peggiore ~575 MB per cliente su Drive, realistico ~50 MB; se n8n soffre in memoria: `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (già annotato in §10 della guida VPS) |
| **iPhone** | `accept` senza `image/*` (il selettore converte gli HEIC in JPEG); Orientation 6 applicata all'import prima di togliere l'EXIF (`test-metadati-foto.ts`, R7); `input type=time` nativo, nessun `select`; `localStorage` che lancia in privata → bozza sul server |
| **Browser interni di WhatsApp/Instagram** | bozza sul server ripresa alla verifica (test 3); primo passo sopra la piega a 390×680 (test 10); frammento non tagliato dai riconoscitori (token hex); prova su dispositivo vero (R7) |
| **Privacy** | nessun dato personale nell'URL né nei log; token salvato solo come hash su n8n; Telegram solo conteggi; originali con GPS solo su Drive fino all'import, poi Cestino; attestati mai pubblicati; `import.ndjson` con conteggi; informativa con conservazione reale e fornitori qualificati come da audit |
| **Dati inventati o sbagliati** | niente preselezioni senza fonte dichiarata; stato `da_verificare` con elenco dei punti e provenienza per valore; attestati senza documento non pubblicabili salvo registro pubblico confermato; prezzi con data e validità; consumatori vincolati a `verificato` e `escludi: false` |
| **Staleness di copy e build** | tutto sotto `traffico/`, `client.json` mai scritto, sha E2E (M5) |
| **Valore trovato ma sbagliato** (14/09: scheda di un omonimo, registro con dato vecchio, orari di apertura ≠ ore al telefono) | controllo d'identità telefono/dominio; SOA solo `PUBBLICO` con scadenze valide; data della fonte mostrata al cliente e salvata; conferma esplicita con «No, lo correggo»; Mattia vede la provenienza prima di «Conferma i dati» |
| **Fonte esterna che cambia o sparisce** (HTML F-gas, URL o colonne ANAC, prezzi e termini DataForSEO) | esiti tipizzati; nessuna fonte blocca il link (la domanda si mostra); banchi con risposte registrate; URL in costanti; riga `forma_inattesa` in `DEBUG.md`; F-gas senza API: una richiesta puntuale per cliente |
| **Uso non consentito di una fonte** | fonti scartate con motivo in R.3 (Accredia, Meta, Places API per i valori); ANAC per licenza CC BY-SA 4.0; DataForSEO nei termini letti in R1 §7 |
| **Dati personali verso fornitori nuovi** | `precompilati` senza P.IVA, codici fiscali, telefono, e-mail, referente (banco §10.1 bis caso 9 e «Valida link» caso 8); P.IVA solo verso ANAC (file scaricato, filtro locale) e F-gas; DataForSEO `saltata` per i nomi di ditte individuali fino a M6; informativa art. 14 |
| **Modulo lungo con molte foto** | un passo per foto con «Come la foto prima»; minuti stimati nel benvenuto; tetto 15; cronometro in calibrazione su Cavaliere (12 foto) |
| **Motore con passi calcolati dalle risposte** | il lead non usa `ripeti` (passi, pixel e byte identici in M1); risposte per id, mai per indice; test di «Modifica» con foto aggiunte e tolte (§10.3 caso 12) |
| **Deriva dal design del form principale** | nessun foglio di stile nuovo salvo impaginazione sorvegliata; `@design` su stili calcolati, animazioni e fogli caricati; critique a coppie in M4 |
| **Pre-compilazione vecchia all'apertura** (link fino a 30 giorni) | data di lettura mostrata; `precompilaSha` nell'invio; «Rigenera» rifà le letture |
| **Miniature: copia in più delle foto** | 480 px senza metadati, nella cartella che l'import cancella e la pulizia cestina; servite solo con token valido e `no-store` |
| **n8n diverso dal previsto** (nodo Crypto, filtro Data table, codice di risposta da espressione, dimensione della colonna `bozza`, CORS dei percorsi nuovi) | verificati in R4 prima di pubblicare il modulo; alternative già note: Switch con quattro Respond a codice fisso; bozza su Drive invece che in tabella |
| **Token nel backup Drive di `out/`** | valido 30 giorni, permette solo invii da verificare; rigenerazione immediata |
| **Contesto rigenerato dopo la creazione del link** | servizi confrontati all'import, differenze tra i punti da controllare |
| **Collisioni con piani paralleli** | fase 2 dopo T6a e prima di T4; T3 non tocca `schemas.ts`, `build.ts`, `deploy.ts`; `run-bus.ts`, `agenti.ts`, `secrets.ts` e `dataforseo.ts` col contratto di `piano-T4.md` §7 e la nota di R.6 da riportare in T4; `scope.json` ha un solo perimetro (dubbio 10) |

## 14. Decisioni aperte (proposta tra parentesi)

1. Durata del link e uso singolo: 30 giorni, chiuso dopo l'invio, aggiornamenti con un link nuovo (sì).
2. Link salvato in `traffico/modulo.json` per ricopiarlo (sì) o mostrato una volta sola.
3. Bozza sul server nella Data table per la ripresa nei browser interni (sì, cancellata all'invio o 7 giorni
   dopo la scadenza).
4. Limiti (rivisti il 14/09): 40 comuni, 3 priorità, prezzi solo per le priorità, 8 attestati, 15 foto in tutto
   come nel lead (arrivate + nuove), 12 comuni vicini entro 20 km (da calibrare in fase 3).
5. Nessun avviso Telegram all'arrivo dei dati; l'editor lo mostra (sì) — oppure avviso con solo «nuovi dati
   del modulo: apri l'editor».
6. Refactor dei moduli condivisi di site-intake invece della copia (sì), con rilascio del lead in anteprima
   Workers prima dello spostamento del traffico (richiede l'ok di Mattia al deploy).
7. Conservazione e base giuridica dei documenti degli attestati come prova dei claim (da verificare con
   legal-it in M6; con la revisione del 14/09 riguarda solo gli attestati senza registro pubblico).
8. Informativa dedicata `/dati/privacy` già corretta secondo l'audit, mentre quella del lead resta con le
   correzioni dell'audit ancora da fare (scheda separata).
9. ~~EXIF e GPS nell'import del form lead~~ — **risolto il 14/09** fuori da T3: `img/lavoro-N.jpg`,
   `foto-originali/` (senza perdita) e logo JPEG escono dritti e senza metadati; foto dei clienti in `out/`
   ripulite. T3 riusa `lib/metadati-foto.ts` e `normalizeToJpg` (§6.1, §6.3).
10. `.claude/scope.json` ha un solo perimetro: T3 parte dopo T6a chiuso e prima di T4 (serializzati).
11. Umami sul modulo: se le env sono attive sul deploy, paragrafo statistiche nell'informativa del modulo.

Nuovi dubbi della revisione del 14/09:

12. **DataForSEO in T3**: T3 costruisce la base del client prima di T4 (proposta) oppure la scheda Google entra solo
    con G1 e fino ad allora gli orari sono sempre una domanda vuota?
13. **Attestati da registro pubblico senza documento**: SOA (ANAC) e F-gas trovati, validi e confermati dal cliente
    si pubblicano senza chiedergli il documento (proposta: sì, la fonte ufficiale è la prova).
14. **DataForSEO e ditte individuali**: il nome è un dato personale verso un fornitore da qualificare; fonte `saltata`
    per i nomi senza forma societaria finché M6 non chiude sede, ruolo e garanzie (proposta) o mai per loro.
15. **F-gas**: una `POST` puntuale per cliente su una pagina senza API né termini di riuso pubblicati (proposta: sì,
    con esito `forma_inattesa` se cambia) o solo link di verifica a mano per Mattia.
16. **Nome d'uso per i brief Tally**: conferma di `azienda` (proposta) o mai chiesto.
17. **Anno delle foto dall'EXIF** dei lead futuri, letto prima che l'import lo tolga: tocca `lib/inbox-form.ts`
    (fuori perimetro) e il GPS indicherebbe la casa del cliente finale; proposta: no, l'anno lo dice il titolare.
18. **Sito attuale come fonte**: scartato oggi (3 clienti su 3 senza); riaprire se in calibrazione almeno 3 clienti su
    10 hanno un sito diverso dal nostro (proposta).

## Calibrazione

_(fase 3)_

## Verifica

_(fase 4)_
