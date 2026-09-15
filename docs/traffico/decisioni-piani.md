# Decisioni dell'orchestratore sui piani (da passare allo sviluppo)

Ogni piano scritto chiude con dubbi aperti; qui le risposte date prima dello sviluppo, così
restano anche se il contesto della sessione si perde. Valgono sopra il testo del piano.

## Priorità assoluta (decisione di Mattia, 2026-09-15) — vale per tutti i piani

**Risultati concreti: più traffico possibile dall'Italia e dalle zone dove il cliente accetta davvero
lavori.** Ogni piano si giudica su quanto avvicina o misura quel risultato; il resto è spreco.

1. **Ordine di sviluppo rivisto** per mettere online prima ciò che porta visite: T3 (zone servite precise) →
   T4 (ricerche per zona) → G1 (scheda Google con area servita: la leva più forte nelle mappe della zona) →
   T5a → T5b (pagine per servizio e zone) → T2a (motori avvisati prima che le pagine vadano online) → T5c
   (pagine online sul pilota) → T6b → T2b (misura) → T7a → T7b → T8 → G2 → G3.
2. **Geografia in ogni piano**: zone servite = **le zone che il cliente ha già scelto nel form lead**
   (vedi T3 punto 12), tradotte in comuni, province e regioni col dataset T6a; il mini-form non le richiede.
   Ricerche e SERP solo in italiano, con località nei comuni o nelle province servite (T4, G1); nessuna
   pagina, query o area servita fuori zona. I comuni senza cantiere verificato si coprono con la pagina
   «Zone servite», l'`areaServed` dei dati strutturati e l'area servita della scheda Google, non con
   pagine-comune sottili (le regole anti-doorway di T6b restano: rischio penalizzazione).
3. **Misura del risultato** (T2b, T8): numeri di Search Console filtrati sull'Italia (`country = ita`) e
   quota di visite dalle regioni e città delle zone servite dai dati di Umami, così il report dice quanto
   traffico arriva da dove il cliente lavora, non solo il totale.
4. Il controllore del workflow considera spreco tutto ciò che non porta o non misura quel traffico.

## T1a — Fondamenta SEO (in sviluppo dal 2026-09-14)

1. Indirizzo non riconosciuto: JSON-LD senza `address`, avviso nella build, nessun blocco.
2. `image`: foto reale da `lavori.json`, mai la hero; senza foto reali solo il logo.
3. Tipo schema.org senza id del mestiere: tabella deterministica su `settore_normalizzato`, poi
   `HomeAndConstructionBusiness`.
4. Servizi: titoli delle card visibili.
5. Sito Umami di prova ammesso, cancellato verificando l'id; `umamiWebsiteId` di Cavaliere tolto
   dalla fixture prima di tutto.
6. `_headers` su workers.dev provato su un worker di prova `zz-test-t1a`, poi cancellato.
7. Title, H1, description fuori norma: avvisi, mai blocchi; blocco solo su errori tecnici.
8. Firme reali di `lib/traffico.ts` dal codice di T0.
9. Nessun deploy su domini di clienti.

## T6a — Fatti comunali (piano pronto)

1. Comuni fusi: somma dei dati dei comuni di origine, dichiarata nel fatto.
2. Distanza in linea d'aria, arrotondata e dichiarata come tale; niente OSRM.
3. Zona climatica: pubblicabile citando l'allegato A del DPR 412/1993, con campione di controllo.
4. Unità locali e addetti nelle costruzioni (ASIA 2011): **tolti** (non servono a chi cerca).
5. Sviluppo dopo T1a (scope.json unico), prima di T3 (T3 usa i codici ISTAT 2026 di T6a).
6. Completamento (14/09 sera): edifici 2011 dalle variabili censuarie per sezione di `www.istat.it`
   (`dati-cpa_2011.zip`) sommate per comune, con metodo e licenza dichiarati; famiglie 2021 con al
   massimo 3 tentativi su esploradati distanziati di 5 minuti e 10 ricerche di altre copie ufficiali,
   poi `completo: false` solo per quella fonte e comando per completarla nel piano. Niente dipendenze.

## T3 — Mini-form (piano pronto)

1. Link valido 30 giorni, uso singolo, ricopiabile dall'editor.
2. Bozza conservata su n8n fino a 7 giorni dopo la scadenza.
3. Nessun avviso Telegram (rischio dell'audit legale): l'editor mostra «dati arrivati».
4. Parametrizzazione del motore del form lead ammessa solo con schermate identiche al pixel,
   lead inviato identico al byte sul flusso di prova, suite esistente verde; deploy prima come
   versione di anteprima Workers, promozione solo con tutti i gate verdi.
5. Base giuridica e conservazione dei documenti degli attestati: verificare con legal-it.
6. Codici ISTAT dei comuni dal dataset 2026 di T6a (alias per i codici sardi precedenti), non da
   `site-intake/data-src/comuni.json`.
7. Verifiche su n8n (nodo Crypto, filtro Data table, codice di risposta) con le alternative del piano.
8. **Decisione di Mattia (2026-09-14): il mini-form chiede SOLO ciò che non si trova online e che il
   cliente non ha già fornito.** Prima di generare il link, un passo automatico raccoglie ciò che
   esiste (risposte del form lead e `contesto.json`, sito attuale, social, eventuale scheda Google
   pubblica, registri pubblici consultabili gratis come attestazioni SOA e registro F-Gas) e decide
   quali domande mostrare; i dati trovati si presentano da confermare o correggere, non da
   riscrivere. Una domanda si fa solo se l'informazione manca o la fonte non è raggiungibile.
9. **Decisione di Mattia (2026-09-14): stesso identico design e stesse animazioni del form
   principale** (token, componenti, motion, transizione «Sequenza» tra i passi). Nessun nuovo
   stile visivo: le domande nuove si costruiscono con i componenti e le regole esistenti di
   `site-intake/`; il confronto con il form principale fa parte dei test visivi.
10. Dubbi della revisione (§14, punti 12-18), risolti:
    - DataForSEO già in T3, solo per gli orari dalla scheda pubblica e solo con la chiave;
      `lib/dataforseo.ts` nasce minimo in T3 e T4 lo estende (aggiornare il piano T4).
    - SOA (dati aperti ANAC, CC BY-SA) e F-Gas trovati: pubblicabili senza documento, con fonte e
      data registrate, dopo la conferma del titolare nel form.
    - Ditte individuali: **nessuna** ricerca DataForSEO (il nome è un dato personale verso un
      fornitore senza DPA verificato): gli orari si chiedono.
    - fgas.it: una sola richiesta per cliente, su richiesta dell'operatore, con User-Agent
      identificativo; se la pagina cambia o non risponde, si fa la domanda.
    - Nome d'uso: conferma solo per i clienti arrivati da Tally; mai per il form v4.
    - Anno delle foto: si chiede nel form (l'EXIF viene rimosso all'import dal 2026-09-14);
      `inbox-form.ts` non si tocca.
    - Sito attuale del cliente come fonte: solo i dati strutturati (JSON-LD) che pubblica, se
      l'URL è nel brief e risponde; nessuna estrazione dal testo.
11. Il link del mini-form si genera per un cliente con **almeno uno** dei due servizi attivo (Sito
    o Scheda Google): gli stessi dati servono a entrambi (decisione G1 punto 3). Le domande su
    foto dei cantieri e prezzi restano utili anche col solo servizio Scheda.
12. **Decisione di Mattia (2026-09-15): le zone di lavoro NON si chiedono di nuovo.** Il cliente le ha già
    date nel passo «In quali zone lavori?» del form lead (sito.consulbuild.com). La domanda #3 `comuni` del
    piano (§R.3 riga 3 e tabella delle domande) **esce dal mini-form**. Al suo posto una traduzione
    deterministica in `lib/precompila-dati.ts`, sul dataset T6a (comuni con provincia, regione, coordinate):
    - «Nome (SIGLA)» e la sede → quel comune;
    - «X e dintorni» → X più i comuni entro un raggio in linea d'aria (valore iniziale del piano, 20 km, da
      calibrare), dichiarato come «dintorni»;
    - «X e provincia», «Provincia di X» → la provincia (tutti i suoi comuni);
    - «Tutta la regione X» → la regione; «X e regioni vicine» → la regione più le confinanti di `CONFINI` in `site-intake/src/data/regioni.ts` (stessa tabella del form);
    - «Tutta Italia» → Italia (le ricerche locali partono comunque dalla provincia della sede);
    - brief Tally in prosa (Cavaliere, La Cecilia) → riconoscimento dei soli nomi esatti di regioni, province
      e comuni del dataset; se non ne riconosce nessuno, l'editor mostra «Zone da impostare» all'operatore.
      Mai una domanda al cliente, mai un'estrazione AI non verificata.
    `dati-traffico.json` conserva sia le etichette originali sia le aree tradotte (con `provenienza: lead`).
    Chi le usa: T4 (universo query nei comuni dell'area, pesati per popolazione e distanza dalla sede), G1
    (area servita: province e regioni intere dove l'etichetta è larga, comuni dove è precisa, massimo 20),
    T5a (pagina «Zone servite» e `areaServed`), T2b/T8 (quota di visite dalle zone). L'operatore può
    correggere le aree nell'editor (modifica per sezione già prevista dal piano).
13. **Decisione di Mattia (2026-09-15): niente mini-form.** Piccole ditte, spesso appena aperte: domande che
    non sanno come compilare le mettono in crisi. Non si chiedono lavori prioritari, «prezzo da», luogo e anno
    delle foto; gli attestati non contano. L'unico dato mancante utile, gli **orari**, lo chiede Mattia su
    WhatsApp e lo inserisce nell'editor. **T3 si riscrive** come «Dati del cliente senza form»: zone servite
    tradotte dal form lead (punto 12) con correzione dell'operatore nell'editor, orari inseriti dall'operatore
    (facoltativi), nessun link, nessun workflow n8n, nessuna pagina su `site-intake/`. `piano-T3.md` attuale è
    superato: si riscrive in fase 1. Effetti sugli altri piani (valgono sopra i loro testi):
    - **T4**: priorità = nessuna dichiarata (ordine dai volumi e dai servizi del contesto); comuni dalle zone
      tradotte; nessun `foto.json` → nessuna pagina-comune candidata da cantieri; `lib/dataforseo.ts` nasce in T4.
    - **G1**: orari da quelli inseriti dall'operatore, altrimenti la voce resta «da completare»; area servita
      dalle zone tradotte; attestati fuori.
    - **T5a**: niente prezzi né abilitazioni nel contratto; niente pagine «cantiere» (servono comune e anno delle
      foto); restano pagine servizio, «Zone servite» e, se ci sono foto reali, l'indice «Lavori» senza comune né
      anno. La pagina «comune» predisposta non si costruisce.
    - **T5b**: copy senza prezzi. **T6b** (pagine-comune): sospeso finché non esiste una fonte verificata del luogo
      dei lavori; le zone restano coperte da «Zone servite», `areaServed` e area servita della scheda.

## T5a — Contratto multipagina e renderer (piano pronto)

1. **No alla disciplina di stile per l'identità byte per byte** (componenti esclusi dalla scansione
   Tailwind, stili scoped con `@apply`): è diversa dal resto del renderer e fragile. I componenti
   nuovi seguono le convenzioni del progetto (token, classi semantiche, utility Tailwind come le
   sezioni esistenti). Criterio di sicurezza a servizio spento, al posto del diff byte per byte:
   (a) HTML identico a meno del nome hash dei file CSS/JS; (b) CSS che cambia **solo per
   aggiunta** (nessuna regola esistente tolta o modificata), verificato da uno script; (c) baseline
   VRT esistenti identiche al pixel; (d) nessuna differenza in `robots.txt`, `_headers`, asset.
2. Nessun sottomenu dei servizi; «Processo» esce dalla nav quando entra «Zone servite».
3. Prezzo (con scadenza) e abilitazioni come campi opzionali nel contratto; il componente
   `Certifications` non si costruisce in T5a.
4. Pagina cantiere solo con almeno 3 foto reali.
5. `ProcessSteps` della home riusata come chiusura quando ci sono Lavori ma non FAQ.
6. Baseline VRT delle pagine senza screenshot a pagina intera.
7. `lastmod` onesto con il footer che elenca i servizi: `testoIndicizzabile` in
   `site-factory-editor/lib/fondamenta.ts` deve ignorare header, nav e footer (conta il contenuto
   principale). Rientra nel perimetro di T5a con un caso nel banco `test-fondamenta.ts`.

## T1b — Pagine leggere (piano pronto)

1. Varianti immagini dietro l'interruttore del servizio Sito finché Mattia non decide se estenderle a
   tutti i siti (domanda aperta nel riepilogo per Mattia).
2. Budget sforato: **avviso** visibile nella scheda Build & Pubblica e nel log, non blocco (coerente
   con T1a punto 7).
3. Ordine: T1b si sviluppa dopo T6a e **prima di T5a** (le pagine interne usano `Foto.astro`).
4. Lighthouse con `npx` ammesso, versione fissata (pacchetto ufficiale Google).
5. `sizeKb` nella scheda Build invariato.
6. Nel perimetro anche il `favicon` (148 KB scaricati a ogni pagina: obiettivo ≤ 10 KB senza toccare
   la pipeline del logo, ottimizzando la copia della build) e una variante `og:image` 1200×630 JPEG.
7. Avvio dello sviluppo (14/09 sera): T5a non è chiuso, quindi niente file di `src/pagine/`. Il budget
   è un avviso (punto 2, sopra il §11-2 del piano): gli avvisi del budget si accodano agli avvisi delle
   fondamenta che `lib/build.ts` salva in `steps.build.fondamenta.avvisi`, già mostrati nel blocco
   Pubblicazione, con il prefisso «Pagine leggere:», così la UI dell'editor non si tocca. Le
   calibrazioni C1 (qualità) e C3 (hero da mobile) seguono il punto 8; le schermate di confronto vanno in
   `~/.cache/site-factory/revisione-T1b/` (fuori da git e da `out/`) e sono elencate in «Calibrazione»
   per la revisione di Mattia.
8. **Decisione di Mattia (2026-09-14 sera): la qualità delle immagini resta quella dei siti dei clienti
   di oggi, anche con lo zoom, su PC, telefono e tablet.** La nitidezza vale più del peso: se il budget
   o Lighthouse ≥ 90 non ci stanno, vince la qualità e resta l'avviso. In pratica:
   - **Compressione (C1)**: AVIF e JPEG a una qualità indistinguibile dagli originali serviti oggi, anche su
     ritagli ingranditi al 200 % delle texture fini (fughe, intonaco, legno, cementine, bordi del logo),
     separatamente per foto generate e reali; nel dubbio si sale di qualità. q55/q80 del §4.1 sono solo il
     punto di partenza.
   - **Risoluzione con lo zoom**: su ogni dispositivo di riferimento (telefono 390 px DPR 3, 412 px DPR
     1,75, tablet 768 px DPR 2, PC 1280 e 1920 px DPR 1 e 2) il candidato che il browser sceglie ha
     almeno **2 volte** i pixel resi (larghezza resa × DPR × 2), fermandosi alla larghezza dell'originale,
     che resta sempre il gradino più grande; mai ingrandire. Così lo zoom con le dita (che non fa
     cambiare candidato al browser) resta nitido come oggi. Il controllo «sizes onesti» del §8.2 usa
     questa soglia al posto di «≥ resa × DPR e ≤ 1,5×»; il tetto allo spreco diventa «non oltre il gradino
     successivo a quello necessario».
   - **Hero da mobile (C3)**: vince l'opzione più nitida (`sizes` onesto o più largo), mai `100vw` se
     sceglie un candidato sotto la soglia qui sopra.
   - Logo e mark (C4): nessuna perdita visibile dei bordi ingranditi; nel dubbio PNG lossless.

## G1 — Scheda Google consigliata (piano pronto)

1. Ditte individuali: raccolta delle schede della zona ammessa (le query non contengono il nome del
   cliente); vietate solo le ricerche col nome del cliente.
2. Senza chiave DataForSEO la scheda si prepara lo stesso: categorie dai soli servizi, segnate «da
   confermare coi concorrenti».
3. **Il mini-form di T3 è disponibile anche col solo servizio Scheda** (vedi T3 punto 11).
4. Business Profile API e `cache-api.json` rinviati a G3.
5. Logo: quello fornito dal cliente oppure quello generato dalla pipeline se la riga Logo è
   verificata; mai un logo non approvato.
6. Nessuna descrizione dei singoli servizi per ora.
7. Parametri iniziali (zoom 17z, 5 punti, soglie) del piano fino alla calibrazione.
8. Spesa di calibrazione (~0,30 $) quando Mattia inserisce la chiave.
9. Descrizione modificata a mano da Mattia: passano sempre i controlli rigidi (lunghezza, URL,
   telefono, keyword ripetute, promesse vietate); salta solo il critico di stile; salvare = approvare.
10. Descrizione in prima persona plurale.

## T2a — Motori al deploy (piano pronto)

1. Proprietario umano delle proprietà Search Console: `info@consulbuild.com`; aggiunto da subito
   come proprietario anche il service account di lettura del VPS (serve ai sensori di T2b).
2. Prova dal vivo su `zz-test-t2a.consulbuild.com` quando Mattia inserisce le chiavi, mai su un
   dominio cliente.
3. **Secondo token Cloudflare solo DNS** (`Zone: Read` + `DNS: Edit`), separato da quello del
   deploy: nuova chiave nel Keychain con la sua prova; il token del deploy non si allarga.
4. Registro: una riga per deploy con l'esito del primo tentativo; le riprese aggiornano
   `steps.build.motori` in `client.json`.
5. Servizio sospeso: nessuna chiamata ai motori.
6. Tetto di 30 s atteso dentro il deploy; ciò che resta «in attesa» lo riprende il timer.

## T2b — Sensori VPS e pannello Sito (piano pronto)

1. Bing fuori da T2b (volumi piccoli, nessun dettaglio per ricerca; IndexNow copre l'indicizzazione).
2. Storico: `TrafficoGiorni` giornaliero per 486 giorni **più aggregati mensili per sito conservati
   senza scadenza** (pochi KB: servono al caso studio e agli effetti di lungo periodo); le ricerche
   degli utenti restano solo in Search Console.
3. Prova B su Cavaliere in sola lettura approvata (Mattia aggiunge il lettore come utente limitato).
4. La regola delle 8 settimane (M5) resta in T2b: T4 si sviluppa prima.
5. Il webhook di lettura riusa `N8N_REGISTRA_KEY`.
6. Telegram solo per i guasti della raccolta (passaggio ok → errore e dead-man a 36 h), mai dati
   personali; le pagine uscite dall'indice si vedono nel pannello e nel report.
7. Ispezione: pagine non indicizzate o cambiate ogni giorno, stabili ogni settimana, massimo 200 al giorno.
8. Lettore con scope readonly; scope pieno solo come ripiego documentato.

## T4 — Mappa query (piano pronto)

1. Solo DataForSEO; il client Google Ads non si costruisce (stessi dati, OAuth e approvazione
   lunga): togliere il developer token dal README §8.
2. Spesa di prova con API vere (campione 384 SERP ~1,54 $, una mappa ~0,42 $) quando Mattia
   inserisce la chiave.
3. Solo Live e solo mobile.
4. Pagina comune candidata solo con un cantiere verificato in quel comune.
5. **Esclusione reversibile dall'interfaccia** («Riammetti» con il motivo), mai correzione a mano
   di un file.
6. Servizi abbinati per nome normalizzato.
7. Soglie e pesi iniziali del piano, da calibrare con chiave (accordo ≥ 80 % su 20 righe cieche).
