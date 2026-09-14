# Decisioni dell'orchestratore sui piani (da passare allo sviluppo)

Ogni piano scritto chiude con dubbi aperti; qui le risposte date prima dello sviluppo, così
restano anche se il contesto della sessione si perde. Valgono sopra il testo del piano.

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
