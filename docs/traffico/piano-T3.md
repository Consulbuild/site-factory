# Piano T3 — Mini-form «Dati per farti trovare»

Stato: **fase 1 (piano) — in revisione dall'orchestratore**, 2026-09-14. Fonti: `docs/traffico/README.md`
(§1 decisioni 5, 8, 9; §3 architettura; §4-§5 ciclo e regole), `docs/traffico/brief-T3.md`,
`docs/traffico/piano-T0.md` (§3-§6).

## 1. Contesto

Obiettivo: dopo l'attivazione del servizio Sito, Mattia manda al titolare un **link personale** a un
modulo da telefono (≤ 5 minuti) che raccoglie i dati reali per pagine, mappa query e dati strutturati:
lavori prioritari, «prezzo da», comuni serviti con codice ISTAT, nome d'uso, orari del telefono,
attestati con documento, foto per cantiere (comune, lavoro, anno; mai la via). Le risposte arrivano su
Drive via n8n; l'editor le importa in `out/<slug>/traffico/` come dati **da verificare** fino alla
conferma di Mattia. Il form lead non cambia comportamento.

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
  7.904 comuni (6 omonimi, tutti in province diverse). T1a legge già `REPO_ROOT/site-intake/data-src/
  comuni.json` dall'editor: stessa scelta qui, niente modifiche ai file dei comuni del lead.
- **`sips` non toglie i metadati**: prova con un JPEG di prova con blocco Exif (Orientation 6 + GPS):
  dopo `sips -s format jpeg` (anche con `-Z`) il file ha ancora un APP1 Exif riscritto con
  **Orientation 6** e i pixel **non ruotati**. Conseguenza: togliere l'EXIF senza applicare prima la
  rotazione gira le foto verticali dell'iPhone. Nota fuori perimetro: l'import del form lead
  (`lib/inbox-form.ts` → `normalizeToJpg`) oggi lascia l'EXIF in `img/lavoro-N.jpg` e negli originali
  (§14, dubbio 9).
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
- `.claude/scope.json` oggi = perimetro di **T0** e `site-factory-editor/DESIGN-BRIEF.md` è modificato e
  non committato: la fase 2 di T3 parte solo a T0 chiuso (T3 tocca `app/traffico/[slug]/page.tsx`).

Fuori perimetro T3: pagine e copy che useranno i dati (T5), mappa query (T4), fatti comunali (T6a),
correzione dell'informativa del form lead (audit 14/09 §7.3), EXIF dell'import lead, scheda Google.

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
- **Verità specifica**: a differenza del form lead, qui **conosciamo già il cliente**: il modulo mostra i
  *suoi* lavori (dal contesto verificato) e la certificazione che aveva dichiarato, chiedendone la prova.
  Non vende nulla: niente promesse di posizioni o di clienti in più.

### 2.2 Flusso

```
link (WhatsApp) → /dati/#<token> → card «Controllo il tuo link…» (HTML statico, al primo paint)
   ├─ ok ────────→ benvenuto «Ciao, {azienda}» + cosa tenere a portata di mano → [Inizia]
   │                 (ripresa: se c'è una compilazione a metà si salta al passo dov'era)
   │               → 8 domande in 5 sezioni (una decisione per schermata, foto in background)
   │               → «Controlla i tuoi dati» (Modifica per riga) → [Invia i dati]
   │               → attesa «Stiamo salvando le tue foto…» → «Grazie, abbiamo i tuoi dati»
   └─ ko ────────→ schermata di stato (tabella §2.5), con i contatti dell'agenzia
```

Benvenuto (bozza, calibrazione in fase 3): h1 «Ciao, {azienda}», aiuto «Ci servono pochi dati per far
trovare il tuo lavoro a chi cerca un'impresa nella tua zona. Ci vogliono circa 5 minuti.», elenco breve
«Tieni a portata di mano: le foto dei lavori finiti · gli attestati, se ne hai». Grazie: tappe «Oggi —
Abbiamo ricevuto i tuoi dati» · «Nei prossimi giorni — Li controlliamo uno per uno: se manca qualcosa ti
scriviamo». Nessun tempo di pubblicazione promesso.

### 2.3 Domande in ordine

Testata come il lead: marchio + «Sezione N di 5», barra onesta, binario da 1024 px. Ordine: prima i tocchi
sui propri lavori (fiducia: «è il mio modulo»), poi i comuni (il dato più importante), le cose rapide, e per
ultime le foto, che salgono in background mentre il titolare finisce.

| # | Sezione | id · tipo | Testo (h1) | Aiuto (≤ 20 parole) | Obbl. | Limiti e controlli |
|---|---|---|---|---|---|---|
| 1 | I tuoi lavori | `priorita` · `scelta-multipla` (chip a gruppi per macro-categoria) | Su quali lavori vuoi più clienti? | Tocca fino a 3 lavori: sono quelli su cui lavoriamo per primi. | sì | 1-3 tra i servizi del contesto; al 4° tocco avviso «Al massimo 3: togline uno per sceglierne un altro» e il tocco non passa |
| 2 | I tuoi lavori | `prezzi` (nuovo) | Da quanto parte il prezzo di questi lavori? | Facoltativo. Il prezzo più basso che fai davvero: sul sito diventa «da … €». | no | una riga per ogni lavoro della #1: importo (tastiera decimale, «€»), unità (a lavoro · al m² · al metro · all'ora), IVA (inclusa · esclusa); poi «Valgono per» 6 · 12 mesi. Importo senza unità o IVA = blocco che spiega; importo 1 – 1.000.000 |
| 3 | Dove lavori | `comuni` (nuovo) | In quali comuni lavori? | Scrivi un comune alla volta e tocca quello giusto. Solo dove accetti lavori. | sì | suggerimenti ISTAT tolleranti (motore di «Dov'è la sede»), scelti come chip rimovibili «Monza (MB) ×»; 1-40; doppioni ignorati; testo non scelto dall'elenco = avviso con uscita |
| 4 | Come ti cercano | `nome_uso` · `testo` | Come ti chiamano i tuoi clienti? | Il nome che usano al telefono o su Google, se è diverso da quello dell'azienda. | no | ≤ 80 caratteri; vuoto = nessun nome d'uso (mai dedotto) |
| 5 | Come ti cercano | `orari` (nuovo) | Quando rispondi al telefono? | Tocca l'orario più simile al tuo, poi correggilo se serve. | no | scorciatoie «Lun–ven 8–18» · «Lun–ven 8–12 e 14–18» · «Lun–sab 8–18» · «Lun–ven 8–18, sabato 8–12» · «Altro orario»; il tocco apre la correzione precompilata (giorni a chip + `input type=time`). Max 2 gruppi di giorni × 2 fasce; inizio < fine, fasce non sovrapposte, un giorno in un solo gruppo. Nessun orario preselezionato |
| 6 | Foto e attestati | `attestati` (nuovo, ripetitore) | Hai attestati o certificazioni? | Solo quelli di cui hai il documento: senza, sul sito non li scriviamo. | no | prima «No, nessuno» · «Sì»; con «Sì» voci (max 8): tipo (SOA · Abilitazione impianti DM 37/08 · Patentino F-Gas · Iscrizione ad albo o ordine · Certificazione ISO · Altro), «Numero o ente» (≤ 120), scadenza mese/anno facoltativa, documento PDF/JPG/PNG (≤ 25 MB, in background). Senza documento = avviso «Puoi mandarcelo anche dopo», non blocco. Se nel contesto c'era una certificazione dichiarata: riga «Ci avevi indicato: SOA OG1» |
| 7 | Foto e attestati | `cantieri` (nuovo, ripetitore con foto) | Mostraci i lavori che hai finito | Per ogni cantiere: comune, lavoro, anno e qualche foto. Basta il comune, mai la via. | no | un cantiere aperto alla volta: comune (chip dei comuni della #3 + ricerca ISTAT), lavoro (elenco dei servizi raggruppato), anno (anno corrente → −20, «prima del …»), foto 1-8 (griglia del lead, formati JPEG/PNG/WebP, mai `image/*`); riga sotto il bottone «Niente persone riconoscibili, targhe o numeri civici». Max 10 cantieri e 40 foto in tutto. Cantieri completi chiusi in riga riassuntiva «Monza · Bagni · 2025 · 4 foto [Modifica] [Togli]». Zero cantieri = avviso una volta, poi avanti |
| 8 | Per finire | `condizioni` · `consenso` (testi propri) | Ho letto l'informativa sulla privacy | (sintesi in 2 righe + «Leggi tutta l'informativa» nel `dialog` nativo) | sì | casella «Ho letto l'informativa e confermo che prezzi, attestati e foto sono veri e miei»; unico blocco del modulo |

Durata stimata: #1 15 s · #2 45 s · #3 60 s · #4 15 s · #5 20 s · #6 40 s · #7 100 s · #8 10 s · riepilogo
20 s ≈ 5 min (calibrazione in fase 3 con cronometro su telefono).

### 2.4 Strutture valutate (interazioni aperte)

| Dato | Scartate | Scelta |
|---|---|---|
| Foto per cantiere | (A) un passo per cantiere in loop «Hai un altro cantiere?»: il motore è lineare e il progresso diventa disonesto; (B) tutte le foto insieme e poi assegnazione a gruppi toccando le miniature: selezione multipla fragile per il pubblico 55+ | (C) un passo ripetitore, un cantiere aperto alla volta, gli altri chiusi in righe riassuntive. Eccezione consapevole a «una decisione per schermata»: il cantiere è un'unità |
| Comuni | (A) riquadri dalle zone del lead: i dati del lead non arrivano al modulo e le zone sono prosa; (C) raggio in km: niente coordinate, precisione illusoria | (B) campo con suggerimenti ISTAT e chip rimovibili |
| Orari | griglia 7 giorni × fasce stile Google: 14+ campi | scorciatoie tipiche + correzione precompilata |
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
dell'azienda restituito dalla verifica.

### 2.6 Responsive, accessibilità, prestazioni

- Stessa scena del lead: card a tutta larghezza su telefono, 640 px su tablet, binario da 1024 px. A
  390×680 (browser interno) benvenuto e prima domanda con il bottone sopra la piega.
- Target ≥ 48 px, testo ≥ 16 px, contrasto AA con i token esistenti (nessuna coppia nuova), `aria-live` per
  chip aggiunti/tolti e per le foto, `fieldset/legend` per le fasce orarie, `select` nativo con `optgroup`
  per il lavoro del cantiere (ruota nativa su iOS), focus sull'h1 a ogni passo, reduced-motion come il lead.
- CSS del modulo in `src/styles/dati.css` importato solo dalla pagina `/dati/` (l'HTML del lead non
  cresce). Budget proprio della pagina (§11), primo paint = HTML statico della card di verifica.
- Nessun evento Umami dal modulo (non si importa `analytics.ts`).

### 2.7 Anti-obiettivi

Niente promesse di posizioni, visite o tempi; niente orari o prezzi preselezionati; niente mappa; niente
recensioni (decisione 9); niente nome, telefono o e-mail del referente (li abbiamo già); niente via del
cantiere; nessun effetto decorativo nuovo oltre alla sequenza e alla rivelazione del lead.

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
│ Nome d'uso         Impresa Cavaliere          Orari  lun–ven 8–18            │
│ Attestati          SOA · OG1 classifica II · documento ↗                     │
│ Cantieri (3)       [▢][▢][▢] Monza · Bagni · 2025 · 3 foto (1 esclusa)       │
│                                    [Modifica i dati]   [Conferma i dati]     │
```

| Stato del blocco | Cosa si legge | Primaria | Secondarie |
|---|---|---|---|
| senza link | «Chiedi al cliente comuni, orari, prezzi, attestati e foto dei cantieri con un modulo da telefono (circa 5 minuti).» | **Crea il link** | — |
| link attivo, niente invio | «Link creato il gg/mm, valido fino al gg/mm. Mandalo tu al cliente.» + link in campo `mono` in sola lettura | **Copia il link** | Rigenera… (conferma: «Il link di prima smette di funzionare subito») |
| link scaduto senza invio | warn «Il link è scaduto il gg/mm senza risposta.» | **Crea un link nuovo** | — |
| dati arrivati, non importati | brand «Il cliente ha inviato i dati il gg/mm.» | **Importa i dati** (conferma se esistono dati già importati: «verranno sostituiti; i precedenti restano in `traffico/precedenti/`») | — |
| Drive non ancora scaricato | «Google Drive sta ancora scaricando «foto-03-…»: riprova tra poco.» | Riprova | — |
| cartella Drive assente sul Mac | warn con il percorso atteso | — | — |
| importati, da verificare | badge warn · lettura `dl` · elenco dei punti da controllare | **Conferma i dati** | Modifica i dati · Crea un link nuovo… |
| verificati | badge ok «Verificati il gg/mm» · lettura | — | Modifica i dati · Crea un link nuovo… |
| modifica | form per sezione (comuni come «Nome (SIGLA)» validati dal server, foto con «Escludi» e alt) + `useUnsavedGuard` | **Salva e segna verificato** | Salva · Annulla |
| import fallito | Banner err con i problemi dello schema; la cartella su Drive resta intatta | Riprova l'importazione | — |
| motivo di blocco (chiave `N8N_REGISTRA_KEY` assente · `contesto.json` assente o invalido · Sito sospeso · `client.json` illeggibile) | frase visibile col motivo, `aria-describedby` sul bottone disabilitato (regola T0) | disabilitata | — |
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
  `sha256(token)` con slug, azienda, servizi, certificazione dichiarata e scadenza. n8n salva una riga per
  cliente nella Data table `LinkDati` (upsert per slug) e crea/trova la cartella Drive del cliente.
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

Colonne: `slug` String · `azienda` String · `servizi` String (JSON `[{id, nome, macro}]`) ·
`certificazioni` String · `hash` String · `cartella` String (id Drive) · `scade` Date · `stato` String
(`attivo` | `inviato`) · `bozza` String (JSON, ≤ 64 KB) · `creato` Date · `aggiornato` Date · `inviato` Date.
Nessun dato del referente.

### 4.2 `sf-dati` (`infra/n8n/dati.json`, ~25 nodi)

Cartella Drive: `Il mio Drive/site-factory-clienti/_traffico/<slug>/` (id di `_traffico` fissato nei nodi
come per `_inbox`), separata da `_inbox`. Settings come `sf-bozza`: successi non salvati, errori a
`sf-errori`.

Ramo editor:
1. **Webhook «Link»** `POST dati/link`, Header Auth «Site-factory registra», risposta dal nodo.
2. **Code «Valida link»**: slug `^[a-z0-9-]{1,80}$`, azienda 1-120, servizi 1-60 voci (id ≤ 80, nome ≤ 120,
   macro ≤ 80), certificazioni ≤ 200, hash `^[a-f0-9]{64}$`, `scadeAt` ISO nel futuro e ≤ 90 giorni.
3. **If** → no: **Respond 400**.
4. **Drive «Cerca cartella»** `name = '<slug>'` in `_traffico` → **If «Esiste?»** → no: **Drive «Crea cartella»**.
5. **Data table «Salva link»** upsert per `slug`: hash, azienda, servizi, certificazioni, cartella, scade,
   `stato=attivo`, `bozza=""`, creato/aggiornato.
6. **Respond 200** `{ok:true}`.

Ramo modulo (pubblico, Allowed Origins `*`, risposta dal nodo):
7. **Webhook** `POST dati/verifica` · `PATCH dati/bozza` · `POST dati/file` (multipart `{token, kind,
   index, file}`) · `POST dati/invio`.
8. **Code «Leggi token»**: route da `$prevNode.name`; token dal corpo `^[a-f0-9]{64}$` → altrimenti
   `{codice:400, stato:"non_valido"}` senza toccare la Data table.
9. **Crypto «Hash token»** SHA256 hex → **Data table «Cerca link»** (Get, `hash =`, Always Output Data).
10. **Code «Prepara»** (tutte le regole in un posto): riga assente → 404 `non_valido`; `scade` passata →
    410 `scaduto` + `scadeAt`; `stato=inviato` → 409 `inviato` + `inviatoAt`; poi per route:
    - verifica → 200 `{azienda, servizi, certificazioni, scadeAt, bozza}`;
    - bozza → oggetto JSON con chiavi ammesse, ≤ 64 KB;
    - file → `kind` `foto` (index 1-40, MIME `image/jpeg|png|webp`) o `attestato` (index 1-8, anche
      `application/pdf`); peso reale dal binario ≤ 25 MiB; nome `foto-NN-<nome>` / `attestato-NN-<nome>`
      (stessa `pulisci` del lead);
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

### 4.4 Una sola logica di validazione, provata offline

I nodi Code di `dati.json` si scrivono «da shim»: leggono solo `$input`, `$('Nodo').first()`,
`$prevNode.name`, `this.helpers.getBinaryDataBuffer/prepareBinaryData`. `site-intake/dev/n8n-codice.mjs`
esegue il JS *vero* estratto dal JSON con questi oggetti finti: lo usano sia `tests/dati-n8n.spec.ts`
(banco senza rete) sia `dev/inbox.mjs` (backend di sviluppo). Niente seconda implementazione che deriva.

## 5. Schemi dei dati

### 5.1 Grezzo inviato (`_traffico/<slug>/invio.json`, prodotto dal form, validato all'import)

```ts
// lib/dati-traffico.ts — specchio di RisposteDati (site-intake/src/data/domande-dati.ts)
const Giorno = z.enum(["lu", "ma", "me", "gi", "ve", "sa", "do"]);
const Ora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Fascia = z.object({ da: Ora, a: Ora }).strict();
const ComuneScelto = z.object({ nome: z.string().min(1).max(80), sigla: z.string().regex(/^[A-Z]{2}$/) }).strict();
export const UNITA = ["lavoro", "mq", "metro", "ora"] as const;
export const TIPI_ATTESTATO = ["soa", "dm37", "fgas", "albo", "iso", "altro"] as const;

export const InvioSchema = z.object({
  versione: z.literal(1),
  formVersione: z.string().max(40),
  iniziatoAt: z.string().datetime(),
  inviatoAt: z.string().datetime(), // del server (n8n)
  risposte: z.object({
    priorita: z.object({ ids: z.array(z.string().max(80)).min(1).max(3) }).strict(),
    prezzi: z.object({
      righe: z.array(z.object({ servizio: z.string().max(80), importo: z.number().positive().max(1_000_000),
        unita: z.enum(UNITA), iva: z.enum(["inclusa", "esclusa"]) }).strict()).max(3),
      validita: z.enum(["6-mesi", "12-mesi"]),
    }).strict().optional(),
    comuni: z.array(ComuneScelto).min(1).max(40),
    nome_uso: z.string().max(80).optional(),
    orari: z.object({ gruppi: z.array(z.object({ giorni: z.array(Giorno).min(1).max(7),
      fasce: z.array(Fascia).min(1).max(2) }).strict()).min(1).max(2) }).strict().optional(),
    attestati: z.union([
      z.object({ nessuno: z.literal(true) }).strict(),
      z.object({ voci: z.array(z.object({ n: z.number().int().min(1).max(8), tipo: z.enum(TIPI_ATTESTATO),
        dettaglio: z.string().min(1).max(120), scadenza: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
        file: z.number().int().min(1).max(8).optional() }).strict()).min(1).max(8) }).strict(),
    ]).optional(),
    cantieri: z.object({ voci: z.array(z.object({ n: z.number().int().min(1).max(10), comune: ComuneScelto,
      servizio: z.string().max(80), anno: z.number().int().min(1950),
      foto: z.array(z.number().int().min(1).max(40)).min(1).max(8) }).strict()).min(1).max(10) }).strict().optional(),
    condizioni: z.literal(true),
  }).strict(),
  file: z.array(z.object({ n: z.number().int().min(1), kind: z.enum(["foto", "attestato"]), nome: z.string().max(200),
    bytes: z.number().int().nonnegative(), tipo: z.string().max(80),
    stato: z.enum(["in-coda", "in-corso", "fatto", "errore"]) }).strict()).max(48),
  origine: z.object({ ua: z.string().max(200) }).strict(),
}).strict();
```

### 5.2 Normalizzato: `out/<slug>/traffico/dati.json`

```ts
const RifServizio = z.object({ id: z.string().min(1).max(80), nome: z.string().min(1).max(120) }).strict();
export const ComuneIstat = z.object({ istat: z.string().regex(/^\d{6}$/), nome: z.string().min(1),
  sigla: z.string().regex(/^[A-Z]{2}$/), provincia: z.string().min(1), regione: z.string().min(1) }).strict();
const Data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const DatiTrafficoSchema = z.object({
  versione: z.literal(1),
  stato: z.enum(["da_verificare", "verificato"]),   // unica fonte di stato per dati.json E foto.json
  importatoAt: z.string().datetime(),
  modificatoAt: z.string().datetime().optional(),   // ultima correzione a mano
  verificatoAt: z.string().datetime().optional(),   // solo con stato verificato
  origine: z.object({ inviatoAt: z.string().datetime(), formVersione: z.string() }).strict(),
  priorita: z.array(RifServizio).min(1).max(3),
  prezzi: z.array(z.object({ servizio: RifServizio, importo: z.number().positive().max(1_000_000),
    valuta: z.literal("EUR"), unita: z.enum(UNITA), iva: z.enum(["inclusa", "esclusa"]),
    dichiaratoIl: Data, validoFino: Data }).strict()).max(10),
  comuni: z.array(ComuneIstat).min(1).max(40),
  nomeUso: z.string().min(1).max(80).nullable(),
  orari: z.array(z.object({ giorni: z.array(Giorno).min(1), fasce: z.array(Fascia).min(1).max(2) }).strict()).max(2),
  attestati: z.array(z.object({ tipo: z.enum(TIPI_ATTESTATO), dettaglio: z.string().min(1).max(120),
    scadenza: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable(),
    documento: z.string().regex(/^attestati\/\d{2}-[\w.-]+$/).nullable() }).strict()).max(8),
  daVerificare: z.array(z.string()),                // punti leggibili generati dall'import
}).strict().superRefine(/* comuni unici per istat; priorità e prezzi con servizio unico; giorni unici e in
  un solo gruppo; fasce con da < a e non sovrapposte; verificatoAt presente ⇔ stato verificato */);
```

Normalizzazioni (in `normalizzaInvio`, pura): comune → ISTAT via (nome normalizzato senza accenti e
apostrofi, sigla) su `data-src/comuni.json`; non trovato → escluso + punto da controllare con il testo
originale. Servizio non più nel contesto → tenuto col nome + punto da controllare. `validoFino` =
`dichiaratoIl` (data di `inviatoAt` in Europe/Rome) + 6/12 mesi, con fine mese limitata (31/08 + 6 mesi =
28/02). `nome_uso` vuoto → `null`; orari assenti → `[]`, gruppi e giorni ordinati lu→do. Attestato senza
documento o con file non arrivato → `documento: null` + punto «non pubblicabile finché non arriva il
documento»; scadenza passata → punto. Cantiere in un comune non tra i serviti → punto.

Accanto: `traffico/dati-grezzi.json` (l'`invio.json` com'è arrivato: base delle correzioni tracciabili),
`traffico/modulo.json` (`{versione:1, link, generatoAt, scadeAt}`), `traffico/import.ndjson` (una riga per
tentativo: `at, esito, durataMs, nFoto, nAttestati, nPunti, errore?` — conteggi, mai valori),
`traffico/precedenti/` (un solo slot, i dati sostituiti dall'ultima reimportazione).

### 5.3 Manifest foto: `out/<slug>/traffico/foto.json`

```ts
export const FotoTrafficoSchema = z.object({
  versione: z.literal(1),
  cantieri: z.array(z.object({
    n: z.number().int().min(1).max(10),
    comune: ComuneIstat,
    servizio: RifServizio,
    anno: z.number().int().min(1950),                 // ≤ anno corrente: superRefine
    foto: z.array(z.object({
      file: z.string().regex(/^foto\/c\d{2}-\d{2}\.jpg$/),
      larghezza: z.number().int().positive(), altezza: z.number().int().positive(),
      bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
      alt: z.string().min(1).max(160),                // import: «{servizio} a {comune} ({anno})», correggibile
      escludi: z.boolean(),                           // Mattia: persone, targhe, civici visibili
      originale: z.object({ nome: z.string(), tipo: z.string(), bytes: z.number().int() }).strict(), // traccia, non il file
    }).strict()).min(1).max(8),
  }).strict()).max(10),
}).strict();
```

Consumatori futuri (T5b/T5c/T6b) usano foto e dati **solo con `dati.json.stato === "verificato"`** e foto
con `escludi: false`: regola scritta nel modulo e nel README §3 a chiusura.

## 6. Import nell'editor

### 6.1 Funzioni

- `lib/metadati-foto.ts` (pura, senza I/O): `orientamentoExif(buf): 1..8` (TIFF II e MM, tag 0x0112 in
  IFD0; 1 se assente) e `senzaMetadati(buf): Buffer` che percorre i marker JPEG fino a SOS e toglie
  APP1-APP13, APP15 e COM (Exif, XMP con GPS, IPTC/Photoshop, commenti), tenendo APP0, APP2 (profilo ICC)
  e APP14 (Adobe); i dati compressi dopo SOS restano byte-identici (nessuna ricompressione). JPEG malformato
  o troncato → eccezione.
- `lib/dati-traffico.ts` (pura): schemi §5, `normalizzaInvio(invio, {comuni, servizi, adesso})`,
  `validoFino`, `statoBlocco(...)` (gli stati di §2.8 come funzione di modulo.json, presenza di
  `invio.json`, `dati.json`, stato del Sito, chiave, contesto), `linkDaToken(token, base)`.
- `lib/dati-traffico-fs.ts` (I/O): `TRAFFICO_DIR` (`SF_TRAFFICO_DIR` o
  `…/GoogleDrive-info@consulbuild.com/Il mio Drive/site-factory-clienti/_traffico`), `DATI_N8N_URL`
  (`SF_DATI_N8N_URL` o `N8N_HOST/webhook/dati`), `DATI_FORM_URL` (`SF_DATI_FORM_URL` o
  `https://sito.consulbuild.com/dati/`); `creaLink(slug)`, `leggiArrivo(slug)`, `importaDati(slug,
  {sorgente, destinazione})`, `salvaCorrezioni`, `confermaDati`, lettura memoizzata di `data-src/comuni.json`
  (`ponytail:` doppia con il lettore di T1a, da unire quando entrambi sono chiusi).

### 6.2 Route (Next 16: `params` è una Promise; prima del codice rileggere `route.md`,
`dynamic-routes.md` e le pagine sui catch-all in `node_modules/next/dist/docs/`)

| Route | Metodo · corpo | Esiti |
|---|---|---|
| `app/api/clients/[slug]/traffico/link/route.ts` | `POST` (nessun corpo) | 200 `{link, scadeAt}` · 400 slug · 404 cliente · 409 `client.json` illeggibile, Sito non `attivo`, contesto assente o invalido, chiave `N8N_REGISTRA_KEY` assente · 502 n8n (messaggio leggibile). `modulo.json` si scrive **solo dopo** il 200 di n8n |
| `app/api/clients/[slug]/traffico/dati/route.ts` | `POST {azione:"importa", sovrascrivi?}` · `POST {azione:"conferma"}` · `PUT {dati, foto, verifica?}` | importa: 200 · 409 nessun invio, Drive non scaricato (col nome del file), dati già presenti senza `sovrascrivi` · 422 schema (elenco problemi). conferma: 200 · 409 se non `da_verificare` o se lo schema su disco non passa. PUT: 200 · 422 schema o comuni non risolti (elenco) · stato → `da_verificare`, o `verificato` con `verifica:true` |
| `app/api/clients/[slug]/traffico/file/[...percorso]/route.ts` | `GET` | serve solo `foto/c\d{2}-\d{2}\.jpg` e `attestati/\d{2}-[\w.-]+` (regex, niente `..`), content-type dall'estensione; ricalca `img/[file]/route.ts` |

### 6.3 Passi di `importaDati` (atomico)

1. Legge `_traffico/<slug>/invio.json` → `InvioSchema` (errore = 422, nulla scritto, Drive intatto).
2. Controlla che ogni file `fatto` del manifest sia scaricato per intero (dimensione = `bytes`; stesso
   schema di `inbox-form.ts`) → altrimenti 409 «non è ancora scaricato».
3. Carica servizi dal `contesto.json` e comuni da `data-src` → `normalizzaInvio`.
4. In `traffico/.import-<ts>/`: per ogni foto `sips -s format jpeg` solo se non è JPEG (senza
   ridimensionare) → se `orientamentoExif ≠ 1`, `sips -r 90|180|270` (+ `-f` per 2, 4, 5, 7) → `senzaMetadati`
   → `foto/cNN-MM.jpg`; misure con `sips -g`, `sha256`. Attestati: PDF copiati com'è, immagini ripulite
   come le foto. Scrive `dati.json` (`da_verificare`), `foto.json`, `dati-grezzi.json`; valida tutto con gli
   schemi prima del rename.
5. Se esistono dati importati: li sposta in `traffico/precedenti/` (sostituendo il precedente slot), poi
   rename della cartella temporanea. **`client.json` non si tocca.**
6. Riga in `import.ndjson`; infine cancella `_traffico/<slug>/` (nella cartella sincronizzata = Cestino di
   Drive, 30 giorni). Gli originali con GPS non restano mai in `out/`.

## 7. Informativa

Due livelli dedicati al modulo, **coerenti con l'audit del 14/09** (§3.2-§3.6), senza toccare
l'informativa del form lead (correzione separata, audit §7.3):

- `site-intake/legale/informativa-dati-breve.md` e `informativa-dati-completa.md` generate in M5 con
  `genera_informativa_privacy` (legal-it) e rifinite a mano; `analisi_base_giuridica` e `verifica_citazioni`
  con esito riportato nel file; specchiate in `src/data/privacy-dati.ts` (breve, nel `dialog`) e in
  `src/pages/dati/privacy.astro` (completa).
- Contenuti: Titolare ConsulBuild; interessato = titolare dell'impresa cliente; dati: dati d'impresa
  (lavori prioritari, prezzi, comuni, nome d'uso, orari), attestati (possono contenere nome, codice fiscale e
  dati del responsabile tecnico), foto dei cantieri (metadati di posizione e dispositivo **rimossi prima
  dell'uso**; niente persone riconoscibili, targhe, civici), dati tecnici del browser. Finalità: esecuzione
  del contratto del servizio Sito (pagine per servizio e comune, dati strutturati, scheda consigliata) e
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

| File | Tipo | Cosa |
|---|---|---|
| `src/lib/engine.ts` | M | `Motore` e `caricaOAvvia` ricevono `{domande, prefisso}`; `PASSI`/indici per istanza; nessun import delle domande del lead. Prefisso lead `bozza` → chiavi `localStorage` identiche |
| `src/lib/render.ts` | M | `montaDomanda` riceve `registro` e `sezione` dal chiamante; niente import statici dei componenti |
| `src/lib/main.ts` | M | il lead passa domande, prefisso, registro (spostato qui da `render.ts`), uploader; nessun cambio di comportamento |
| `src/components/riepilogo.ts` | M | `montaRiepilogo` riceve domande, sezioni, etichette, formattatore e testi; `formattaRisposta` del lead resta qui |
| `src/lib/upload.ts` | M | `CodaUpload` riceve la funzione di caricamento; `TipoFile` + `attestato` |
| `src/lib/transport.ts` | M | esporta il caricatore XHR generico (url + campi); `caricaFile` del lead invariato nella firma |
| `src/components/foto.ts` | M | la griglia di miniature diventa `grigliaFoto({coda, max, filtro})` riusata da `cantieri.ts`; `creaFoto` identico fuori |
| `src/components/consenso.ts` | M | testi dell'informativa da `domanda.informativa` (default = lead) |
| `src/components/scelte.ts` | M | scelta multipla: intestazioni di gruppo se le opzioni hanno `gruppo`; `max` con avviso |
| `src/data/domande.ts` | M | `TipoDomanda` + `prezzi`, `comuni`, `orari`, `attestati`, `cantieri`; campo facoltativo `informativa` |
| `src/data/tassonomia.ts` | M | `Opzione.gruppo?` |
| `src/components/fatto.ts` | M | esporta `TELEFONO_AGENZIA` |
| `src/env.d.ts` | M | `PUBLIC_DATI_URL` |
| `src/pages/dati/index.astro` | A | pagina del modulo: card di verifica statica, stage, piede |
| `src/pages/dati/privacy.astro` | A | informativa completa del modulo |
| `src/data/domande-dati.ts` | A | 8 domande, 5 sezioni, `RisposteDati`, contesto del link (servizi), etichette e formattatore del riepilogo |
| `src/data/privacy-dati.ts` | A | sintesi e HTML del primo livello |
| `src/lib/main-dati.ts` | A | avvio: token dal frammento, verifica, stati, benvenuto, motore, coda, bozza, invio, grazie |
| `src/lib/transport-dati.ts` | A | `verifica`, `salvaBozza`, `caricaFileDati`, `inviaDati` con token nel corpo; esiti 404/409/410 tipizzati |
| `src/lib/validatori-dati.ts` | A | puri: importo, fasce orarie, scorciatoie orari, anni, doppioni comuni |
| `src/components/comuni.ts` | A | ricerca ISTAT + chip rimovibili |
| `src/components/orari.ts` | A | scorciatoie + correzione giorni/fasce |
| `src/components/prezzi.ts` | A | righe per i lavori prioritari |
| `src/components/attestati.ts` | A | ripetitore con documento in coda |
| `src/components/cantieri.ts` | A | ripetitore con comune, lavoro, anno, `grigliaFoto` |
| `src/components/stato-link.ts` | A | schermate di §2.5 |
| `src/components/fatto-dati.ts` | A | «Grazie, abbiamo i tuoi dati» |
| `src/styles/dati.css` | A | stili dei componenti nuovi (solo token) |
| `scripts/check-budget.mjs` | M | budget per pagina: JS raggiungibile dagli `<script>` dell'HTML (import seguiti); lead invariato, `/dati/` con soglie proprie |
| `dev/inbox.mjs` | M | route `/api/dati/{link,verifica,bozza,file,invio}` su `.dev-inbox/_dati/` e `.dev-inbox/_traffico/<slug>/`, logica dai nodi Code veri; `link` di sviluppo accetta `scadeAt`/`stato` per i test |
| `dev/n8n-codice.mjs` | A | shim che esegue i nodi Code di un workflow versionato |
| `tests/dati.spec.ts` | A | percorso, stati, ripresa, a11y (`@a11y`), schermate (`@schermate`) |
| `tests/dati-n8n.spec.ts` | A | nodi Code veri senza rete (`@controlli`) |
| `tests/fixtures/attestato.pdf` | A | PDF minimo di prova |
| `legale/informativa-dati-breve.md`, `legale/informativa-dati-completa.md` | A | §7 |
| `README.md`, `DESIGN.md`, `PRODUCT.md` | M | seconda superficie, trasporto `dati/*`, componenti nuovi, budget per pagina |

Non si toccano: `index.astro`, `privacy.astro`, `domande.ts` nelle domande, `validators.ts`, `comuni.ts`,
`build-comuni.mjs`, `public/data/`, `playwright.config.ts`, `wrangler.jsonc`, i test esistenti.

### 8.2 `infra/n8n/`

| File | Tipo | Cosa |
|---|---|---|
| `infra/n8n/dati.json` | A | `sf-dati` (§4.2) |
| `infra/n8n/dati-pulizia.json` | A | `sf-dati-pulizia` (§4.3) |

### 8.3 `site-factory-editor/`

| File | Tipo | Cosa |
|---|---|---|
| `lib/metadati-foto.ts` | A | §6.1 |
| `lib/dati-traffico.ts` | A | §5, §6.1 |
| `lib/dati-traffico-fs.ts` | A | §6.1, §6.3 |
| `app/api/clients/[slug]/traffico/link/route.ts` | A | §6.2 |
| `app/api/clients/[slug]/traffico/dati/route.ts` | A | §6.2 |
| `app/api/clients/[slug]/traffico/file/[...percorso]/route.ts` | A | §6.2 |
| `components/traffico-dati.tsx` | A | blocco di §2.8 (client: azioni, dialog, modifica) |
| `app/traffico/[slug]/page.tsx` | M | blocco nella card Sito; «Cosa servirà» aggiornato (il modulo esiste) |
| `scripts/test-dati-traffico.ts` | A | banco §10.1 |
| `scripts/fixtures/dati-traffico/invio-valido.json`, `contesto-servizi.json` | A | fixture del banco |
| `scripts/n8n-import.ts` | M | `dati`, `dati-pulizia` in `TUTTI` |
| `DESIGN-BRIEF.md` | M | sezione «Dati per farti trovare (shape — 2026-09-14)» |

Non si toccano: `lib/schemas.ts`, `lib/traffico.ts`, `lib/inbox-form.ts`, `lib/lavori.ts`, `lib/secrets.ts`
(nessuna chiave nuova), `lib/steps.ts`, `lib/catena.ts`, `lib/build.ts`, `lib/deploy.ts`, `lib/staleness.ts`.

### 8.4 `docs/`

`docs/traffico/piano-T3.md` (Calibrazione, Verifica, chiusura) · `docs/traffico/README.md` (§3 regola
«solo dati verificati», §7 stato) · `docs/handoff-fase-c.md` · `docs/vps-integrazioni-setup.md` (§11:
cartella `_traffico`, Data table `LinkDati`, `sf-dati`, `sf-dati-pulizia`, prove con curl) · `docs/DEBUG.md`
(righe «il link del modulo non funziona», «Importa dati fallisce», «foto ruotate o con EXIF»).

Fixture fuori git: `site-renderer/out/zz-test-t3/` (`client.json` completo con Sito attivo, `brief.json`,
`intake.json`, `contesto.json` ridotto e anonimo), nel Cestino a fine fase 4.

## 9. Perimetro per `.claude/scope.json` (primo atto della fase 2, dopo lo svuotamento di T0)

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
    "site-intake/src/components/comuni.ts",
    "site-intake/src/components/orari.ts",
    "site-intake/src/components/prezzi.ts",
    "site-intake/src/components/attestati.ts",
    "site-intake/src/components/cantieri.ts",
    "site-intake/src/components/stato-link.ts",
    "site-intake/src/components/fatto-dati.ts",
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
    "site-intake/tests/dati-n8n.spec.ts",
    "site-intake/tests/fixtures/attestato.pdf",
    "site-intake/legale/informativa-dati-breve.md",
    "site-intake/legale/informativa-dati-completa.md",
    "site-intake/README.md",
    "site-intake/DESIGN.md",
    "site-intake/PRODUCT.md",
    "infra/n8n/dati.json",
    "infra/n8n/dati-pulizia.json",
    "site-factory-editor/lib/metadati-foto.ts",
    "site-factory-editor/lib/dati-traffico.ts",
    "site-factory-editor/lib/dati-traffico-fs.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/link/route.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/dati/route.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/file/**",
    "site-factory-editor/components/traffico-dati.tsx",
    "site-factory-editor/app/traffico/[slug]/page.tsx",
    "site-factory-editor/scripts/test-dati-traffico.ts",
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
5. comuni: «Sant'Angelo Lodigiano», maiuscole e accenti risolti; Calliano (TN) e Calliano (AT) distinti
   dalla sigla; nome inesistente → escluso + punto; nessun doppione ISTAT; sul file reale di `data-src`
   la coppia (nome, sigla) è unica (se un aggiornamento la rompe, il banco lo dice).
6. servizio non nel contesto → tenuto col nome + punto; attestato senza file, con file `errore`, scaduto →
   `documento: null` o punto; cantiere fuori dai comuni serviti → punto; `nome_uso` spazi → `null`.
7. `DatiTrafficoSchema` e `FotoTrafficoSchema` su output normalizzato: validi; `verificatoAt` senza stato
   verificato → rifiutato; anno futuro → rifiutato.

Link e stati
8. token: 64 hex, due generazioni diverse, hash = sha256 hex; `linkDaToken` contiene solo base + `#token`
   (nessuna sottostringa di slug o azienda).
9. `statoBlocco` per ogni riga di §2.8 (Sito spento → nascosto; sospeso → sola lettura; chiave assente,
   contesto assente, client.json illeggibile → motivo; link scaduto; arrivo; da verificare; verificati).

Foto (macOS, `sips` locale, nessun file binario nuovo in git: si parte da `site-intake/tests/fixtures/lavoro-1.jpg`)
10. `senzaMetadati`: su un JPEG con APP1 Exif (GPS), APP1 XMP, APP13 e COM iniettati → nessuno di questi
    segmenti resta; APP0/APP2/APP14 conservati; byte dopo SOS identici; `sips -g pixelWidth` legge il file.
11. `orientamentoExif` su TIFF II e MM; assente → 1; JPEG troncato o PNG → eccezione.
12. pipeline di pulizia su immagine asimmetrica con Orientation 3, 6, 8 (e 2) → ruotata **una sola volta**
    (dimensioni scambiate e quadrante colorato al posto giusto, letto convertendo in BMP), nessun APP1.

Import su cartelle temporanee (`sorgente`/`destinazione` passate alla funzione)
13. file del manifest con dimensione diversa → errore «non scaricato», nulla scritto, sorgente intatta.
14. invio fuori schema → errore con elenco, nulla scritto, sorgente intatta.
15. import riuscito → `dati.json` (`da_verificare`), `foto.json`, `dati-grezzi.json`, `foto/cNN-MM.jpg` senza
    APP1, `import.ndjson` con una riga senza valori personali, sorgente rimossa.
16. reimport → i dati precedenti in `precedenti/`, i nuovi al loro posto; nessun file fuori da `traffico/`.
17. correzione (`salvaCorrezioni`) → stato `da_verificare`; con `verifica` → `verificato` + `verificatoAt`;
    comune «Monza (MB)» risolto, «Monzaa (MB)» → errore con elenco.

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

### 10.3 `site-intake/tests/dati.spec.ts` (Playwright su `astro dev`, progetti telefono/tablet/computer)

1. `@dati` percorso completo a 390 px: link di sviluppo per `zz-test-t3` → benvenuto con l'azienda →
   priorità (4° tocco respinto) → prezzi (importo senza unità = blocco, poi corretto; riga vuota) → comuni
   («colog» → Cologno Monzese (MI), «monz» → Monza (MB), doppione ignorato, testo non scelto = avviso) →
   nome d'uso → orari (scorciatoia + fine corretta; inizio > fine = errore) → attestati (Sì, SOA, «OG1
   classifica II», PDF) → cantieri (due cantieri, comune da chip, lavoro, anno, 2 + 1 foto; riga
   riassuntiva, Modifica, Togli) → condizioni (blocco senza spunta, dialog) → riepilogo con Modifica e
   ritorno → invio → «Grazie». Controlli su `.dev-inbox/_traffico/zz-test-t3/`: `invio.json` coerente con le
   risposte, `foto-01…03`, `attestato-01-attestato.pdf`, riga del link `inviato`.
2. `@dati` ripresa sullo stesso browser dopo ricaricamento (passo, risposte, foto «caricata»).
3. `@dati` ripresa da un altro contesto browser con lo stesso link (bozza dal server).
4. `@dati` stati: senza frammento; `#abc` (nessuna chiamata di rete); token ben formato sconosciuto;
   scaduto con data; già inviato; link rigenerato (il primo → non valido).
5. `@dati` link di un altro cliente: file caricato col link B finisce solo nella cartella di B.
6. `@dati` scadenza durante la compilazione: 410 al caricamento di una foto → schermata; nuovo link della
   stessa azienda → ripresa dal passo.
7. `@dati` invio ripetuto dopo timeout simulato (risposta interrotta a scrittura avvenuta) → 409 → «Grazie».
8. `@dati` rete assente alla verifica → «Riprova» funziona.
9. `@a11y` axe WCAG A/AA: benvenuto, comuni con suggerimenti, orari in correzione, cantiere aperto con foto,
   riepilogo, stato scaduto, dialog dell'informativa.
10. `@schermate` benvenuto e passi chiave a 360/390/430/768/1280 in `.impeccable/review/schermate/dati-*`;
    a 390×680 «Inizia» e «Continua» della prima domanda sopra la piega.

Tutti i test esistenti (`controlli`, `flusso` ×3, `a11y`, `schermate`) restano verdi senza modifiche.

## 11. Milestone (ogni verifica deve passare prima della successiva)

**M0 — Precondizioni.** T0 chiuso e `scope.json` svuotato; `git log --oneline -5`, `git status --short`;
scrivo `scope.json` (§9). Letture: guide Next 16 (route handler, catch-all, `useRouter`), `reference/
craft-floor.md` di impeccable prima di M3.

**M1 — Motore parametrico, lead invariato.** Refactor di §8.1 righe M (engine, render, main, riepilogo,
upload, transport, foto, consenso, scelte, domande, tassonomia, fatto) + `check-budget.mjs` per pagina.
Verifica: `npm run check`; `npm test` completo verde sui tre progetti; `npm run build` con JS del lead entro
±0,5 KB dal valore di oggi (26,8 KB) e HTML identico nei byte gzip ±0,1 KB; schermate del lead a 390 e 1280
prima/dopo confrontate a occhio; `git diff --stat` solo i file M di §8.1. **Commit 1** + push.

**M2 — Contratto n8n e backend di sviluppo.** `infra/n8n/dati.json`, `dati-pulizia.json` (id cartella come
segnaposto), `dev/n8n-codice.mjs`, `dev/inbox.mjs`, `tests/dati-n8n.spec.ts`. Verifica: spec verde; test del
lead verdi. **Commit 2** + push.

**M3 — Modulo.** Pagina, dati, componenti, trasporto, `dati.css`, testi provvisori dell'informativa marcati
come tali. Verifica: `npm run check`; `npm run build` (budget lead invariato, `/dati/` entro soglie: HTML 25,
JS 45, font 45, totale 120 KB, da calibrare); `tests/dati.spec.ts` completo; `impeccable detect --json` sui
file nuovi; `/impeccable critique` sulle schermate; una sola tornata di correzioni. **Commit 3** + push.

**M4 — Editor.** `metadati-foto`, `dati-traffico`, `dati-traffico-fs`, route, `traffico-dati.tsx`, pagina,
banco, fixture `zz-test-t3`. Verifica: banco verde; `npx tsc --noEmit`; `npm run build`; `test-traffico-stato.ts`
e `test-import-form.ts` verdi. E2E locale con `SF_DATI_N8N_URL`/`SF_DATI_FORM_URL` sul dev di site-intake e
`SF_TRAFFICO_DIR=.dev-inbox/_traffico`: «Crea il link» → Playwright compila → «Importa i dati» → `dati.json` e
`foto.json` validi, foto senza APP1, sha256 di `client.json`, `contesto.json`, `copy.json` della fixture
**identici** prima/dopo e nessun banner di staleness nell'hub; stati del blocco nel browser a 1280 e 400 px,
tema chiaro e scuro; modifica + «Salva e segna verificato»; detector. **Commit 4** + push.

**M5 — Legale e documenti.** Informativa §7 con legal-it, `privacy-dati.ts`, `dati/privacy.astro`, schermate
del dialog e della pagina; `docs/vps-integrazioni-setup.md` §11, `docs/DEBUG.md`, README e DESIGN di
site-intake, `DESIGN-BRIEF.md`. Verifica: `verifica_citazioni` tutte trovate; build e test di site-intake
verdi. **Commit 5** + push.

**M6 — Rilascio in produzione** (§12), solo con suite completa verde e ok di Mattia. **Commit 6** (id della
cartella nei JSON, esito delle prove) + push.

Fasi 3-5: calibrazione (durata, testi d'aiuto, ordine, limiti) con cronometro su telefono vero; test
completi; `/impeccable critique` finale sulle due superfici; revisione del diff riga per riga; fixture nel
Cestino; README §7 e handoff; `scope.json` svuotato; commit finale dopo le verifiche dell'orchestratore.

## 12. Rilascio in produzione e rollback

Prerequisiti: M1-M5 committati; `npm run build`, `npm run check`, `npm test` (site-intake), banco,
`tsc`, `npm run build` (editor) verdi nella stessa sessione.

- **R1 — Mattia**: crea `site-factory-clienti/_traffico` su Drive (mi passa l'id) e la Data table `LinkDati`
  (§4.1).
- **R2 — Id nei JSON**: sostituisco il segnaposto, `tests/dati-n8n.spec.ts` verde (caso 7).
- **R3 — Workflow n8n**: `node --experimental-strip-types scripts/n8n-import.ts import dati` e poi
  `… import dati-pulizia`. Sono workflow **nuovi**: `sf-bozza` e gli altri non cambiano. Controllo attivazione.
- **R4 — Prova a secco con curl** (token di prova noto, slug `zz-test-t3`): link senza chiave → 403; link con
  chiave → 200 e cartella creata; verifica → 200 con azienda; token sconosciuto → 404, malformato → 400;
  preflight CORS di `PATCH dati/bozza` → 204; bozza → 200; foto JPEG → 200 su Drive; `text/html` → 400;
  30 MB → 400; invio → 200 e riga `inviato`; verifica di nuovo → 409; pulizia con chiave e `giorni` di prova
  mentre `_traffico` contiene solo la cartella di prova. Qui si verificano anche i punti incerti del §13
  (nodo Crypto, filtro della Data table, codice di risposta da espressione, dimensione di `bozza`).
- **R5 — site-intake in anteprima**: `PUBLIC_INTAKE_URL=… PUBLIC_DATI_URL=https://n8n.consulbuild.com/webhook/dati
  npm run build` (budget) → `npx wrangler versions upload --config wrangler.jsonc` (nessun traffico spostato)
  → sull'URL di anteprima: primo passo del lead visibile e percorso del lead fino al riepilogo **senza
  inviare**; modulo `/dati/` col link di prova fino all'invio.
- **R6 — Pubblicazione**: `npx wrangler versions deploy <id>@100%`; su `sito.consulbuild.com` prova del lead
  fino al riepilogo e del modulo.
- **R7 — Prova dal vivo**: dall'editor «Crea il link» per `zz-test-t3` → link mandato al WhatsApp di Mattia →
  compilato su iPhone vero nel browser di WhatsApp e in Safari, con una foto verticale che ha il GPS →
  «Importa i dati» → foto dritta e senza metadati (controllo col banco), `dati.json` valido, fixture non stale.
- **R8 — Pulizia**: cartella `_traffico/zz-test-t3` già nel Cestino dall'import; riga `LinkDati` eliminata
  dall'interfaccia n8n; `out/zz-test-t3` nel Cestino (a fine fase 4); nessun lead di prova in `_inbox` (il
  lead non viene mai inviato nelle prove).

Rollback:
- **Modulo o lead rotti dopo R6**: `npx wrangler rollback` alla versione precedente (istantaneo; il lead torna
  al codice di prima, `/dati/` sparisce).
- **n8n**: disattivare `sf-dati` e `sf-dati-pulizia`; nessun altro workflow da ripristinare.
- **Editor**: revert dei commit di M4; i file in `traffico/` restano inerti (nessun consumatore).
- Dati: `_traffico` e `LinkDati` possono restare; se il rollback è definitivo, cancellazione a mano.

## 13. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **Form lead cambiato** dal refactor del motore | parametri espliciti, prefisso `bozza` invariato, suite esistente intatta su 3 progetti, budget per pagina con tolleranza stretta, schermate prima/dopo, `diff --stat` ristretto (M1), lead provato in anteprima prima di spostare il traffico (R5), rollback Workers istantaneo |
| **Spam e abusi** | ogni route pubblica chiede un token valido prima di toccare Drive; formato controllato prima della Data table; la cartella nasce solo dalla route autenticata; limiti di numero, peso e dimensione del JSON; campi estranei rifiutati; pulizia notturna; nessuna cartella creabile da fuori (niente soglia «300 cartelle» da sorvegliare) |
| **File grandi** | un file per richiesta ≤ 25 MiB col peso reale dal binario, retry della coda del lead, 2 in parallelo, massimo 48 file; caso peggiore ~1,2 GB per cliente su Drive, realistico ~150 MB; se n8n soffre in memoria: `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (già annotato in §10 della guida VPS) |
| **iPhone** | `accept` senza `image/*` (il selettore converte gli HEIC in JPEG); Orientation 6 applicata all'import prima di togliere l'EXIF (banco 12, R7); `input type=time` e `select` nativi; `localStorage` che lancia in privata → bozza sul server |
| **Browser interni di WhatsApp/Instagram** | bozza sul server ripresa alla verifica (test 3); primo passo sopra la piega a 390×680 (test 10); frammento non tagliato dai riconoscitori (token hex); prova su dispositivo vero (R7) |
| **Privacy** | nessun dato personale nell'URL né nei log; token salvato solo come hash su n8n; Telegram solo conteggi; originali con GPS solo su Drive fino all'import, poi Cestino; attestati mai pubblicati; `import.ndjson` con conteggi; informativa con conservazione reale e fornitori qualificati come da audit |
| **Dati inventati o sbagliati** | niente preselezioni; stato `da_verificare` con elenco dei punti; attestati senza documento non pubblicabili; prezzi con data e validità; consumatori vincolati a `verificato` e `escludi: false` |
| **Staleness di copy e build** | tutto sotto `traffico/`, `client.json` mai scritto, sha E2E (M4) |
| **n8n diverso dal previsto** (nodo Crypto, filtro Data table, codice di risposta da espressione, dimensione della colonna `bozza`, CORS dei percorsi nuovi) | verificati in R4 prima di pubblicare il modulo; alternative già note: Switch con quattro Respond a codice fisso; bozza su Drive invece che in tabella |
| **Token nel backup Drive di `out/`** | valido 30 giorni, permette solo invii da verificare; rigenerazione immediata |
| **Contesto rigenerato dopo la creazione del link** | servizi confrontati all'import, differenze tra i punti da controllare |
| **Collisioni con piani paralleli** | fase 2 dopo T0; T3 non tocca `schemas.ts`, `build.ts`, `deploy.ts`; `scope.json` ha un solo perimetro (dubbio 10) |

## 14. Decisioni aperte (proposta tra parentesi)

1. Durata del link e uso singolo: 30 giorni, chiuso dopo l'invio, aggiornamenti con un link nuovo (sì).
2. Link salvato in `traffico/modulo.json` per ricopiarlo (sì) o mostrato una volta sola.
3. Bozza sul server nella Data table per la ripresa nei browser interni (sì, cancellata all'invio o 7 giorni
   dopo la scadenza).
4. Limiti: 40 comuni, 3 priorità, prezzi solo per le priorità, 8 attestati, 10 cantieri × 8 foto, 40 foto in
   tutto (da calibrare in fase 3).
5. Nessun avviso Telegram all'arrivo dei dati; l'editor lo mostra (sì) — oppure avviso con solo «nuovi dati
   del modulo: apri l'editor».
6. Refactor dei moduli condivisi di site-intake invece della copia (sì), con rilascio del lead in anteprima
   Workers prima dello spostamento del traffico (richiede l'ok di Mattia al deploy).
7. Conservazione e base giuridica dei documenti degli attestati come prova dei claim (da verificare con
   legal-it in M5).
8. Informativa dedicata `/dati/privacy` già corretta secondo l'audit, mentre quella del lead resta con le
   correzioni dell'audit ancora da fare (scheda separata).
9. Fuori perimetro, da affidare: l'import del form lead lascia EXIF e GPS in `img/lavoro-N.jpg` e in
   `foto-originali/` (`sips` non li toglie); `lib/metadati-foto.ts` di T3 è riusabile (T1b).
10. `.claude/scope.json` ha un solo perimetro: T3 e T1a non possono essere in fase 2 insieme senza unire i
    perimetri o serializzarli.
11. Umami sul modulo: se le env sono attive sul deploy, paragrafo statistiche nell'informativa del modulo.

## Calibrazione

_(fase 3)_

## Verifica

_(fase 4)_
