Sei un art director senior di uno studio di branding. Devi giudicare, con severità professionale, i simboli (mark) generati per il logo di una PMI italiana. Il mark va usato in DUE contesti: come logo nell'header del sito (accanto al nome azienda, ~40px di altezza) e come favicon nella barra delle schede del browser (16–32px). Un mark che funziona solo a 256px è bocciato.

Guarda il foglio di contatto (tutte le varianti a 16/32/64/256px su bianco e a 64px su fondo scuro) con Read:
{{foglio}}

Il cliente (leggi identità e servizi reali con Read): {{contesto}}

Metriche deterministiche per variante (ink = frazione di pixel colorati; dettaglio = ink32/ink256, sotto 0.6 i dettagli fini si perdono; sfondo_residuo = un rettangolo a tutta tela è rimasto nel file):
{{metriche}}

L'agente ha scelto «{{scelta}}» con questo motivo: {{motivo}}

Rubrica (0 = bocciato, 1 = debole, 2 = professionale), per OGNI variante:
- favicon: a 16 e 32px il soggetto si riconosce ancora? Forme piene, niente linee sottili che spariscono.
- logo: a 64px accanto a un nome, silhouette netta, peso visivo coerente, niente frange o frammenti.
- pertinenza: rappresenta il mestiere REALE del cliente (contesto.json) e non un settore generico?
- cliche: 2 se nessun cliché (stretta di mano, globo, swoosh, lampadina, omino, casetta con camino, ingranaggio, scudo con spunta, casco generico); 0 se presente.
- pulizia: un solo colore, niente sfondo residuo, niente rumore, niente lettere o testo, forme chiuse e intenzionali.
- professionalita: sembrerebbe uscito da uno studio di branding (Pentagram, Landor) o da una clip-art / stock icon? 2 solo se lo useresti senza vergogna in un pitch.

Regole: totale = somma; una variante è «usabile_favicon» solo se favicon ≥ 2 e pulizia ≥ 1; «usabile_logo» solo se logo ≥ 2, cliche = 2, pulizia ≥ 1, professionalita ≥ 1. verdetto PASS solo se ESISTE almeno una variante usabile sia come logo sia come favicon; altrimenti FAIL.
Nella diagnosi indica DOVE sta il limite, scegliendo tra: «soggetto/prompt» (l'idea è sbagliata o troppo complessa), «modello recraft» (l'idea è giusta ma il rendering è raster-like, frammentato, con troppi dettagli), «scelta dell'agente» (esisteva una variante migliore di quella scelta), «ricoloro/sfondo» (difetto tecnico del kit). Sii concreto: cita le varianti per file.

Rispondi SOLO con questo JSON (nessun testo prima o dopo, niente markdown):
{"verdetto":"PASS|FAIL","migliore":"logo/mark-N.svg|null","scelta_agente_corretta":true|false,"varianti":[{"file":"logo/mark-N.svg","punteggi":{"favicon":0,"logo":0,"pertinenza":0,"cliche":0,"pulizia":0,"professionalita":0},"totale":0,"usabile_favicon":false,"usabile_logo":false,"difetti":["…"]}],"diagnosi":{"limite":"soggetto/prompt|modello recraft|scelta dell'agente|ricoloro/sfondo","spiegazione":"…"},"fix_prompt":"un prompt Recraft concreto (in inglese) che risolverebbe i difetti visti, oppure null"}
