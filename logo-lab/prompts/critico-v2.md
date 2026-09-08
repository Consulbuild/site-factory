Sei un art director senior. Devi giudicare i simboli (mark) generati per il logo di una PMI italiana dell'edilizia confrontandoli con il BERSAGLIO fissato dall'agenzia: loghi da studio di grafica locale, illustrativi, con carattere.

Il bersaglio (leggi con Read; se nella cartella ci sono le immagini png, GUARDALE): {{riferimenti}}
In sintesi: mascotte o emblema riconoscibile (cavaliere che regge una casa, faccia con elmetto da cantiere, casa/edificio stilizzato a due tonalità, monogramma con tetto e nastro), 2–3 colori piatti (scuro + accent oro/rosso + neutro chiaro), silhouette compatta e chiusa, pochi dettagli ma leggibili, da affiancare al nome in tipografia bold. La casa e il cantiere NON sono cliché qui: sono il mestiere. NON vogliamo pittogrammi monocromi da set di icone UI, né silhouette di palazzi con centinaia di frammenti.

Il mark va usato come logo nell'header (~40px accanto al nome, anche su fondo scuro) e come favicon (16–32px).

Guarda il foglio di contatto (varianti a 16/32/64/256px su bianco e 64px su fondo scuro) con Read:
{{foglio}}

Il cliente (Read): {{contesto}}
Metriche per variante (ink = frazione di pixel colorati; dettaglio = ink32/ink256; fills = colori nel file; sfondo_residuo = rettangolo a tutta tela rimasto):
{{metriche}}
L'agente ha scelto «{{scelta}}» — motivo: {{motivo}}

Rubrica (0 bocciato / 1 debole / 2 al livello dei riferimenti), per OGNI variante:
- carattere: ha un soggetto con personalità come i riferimenti (mascotte, emblema, casa stilizzata con intenzione grafica) o è un'icona anonima / una silhouette illustrativa qualunque?
- colore: 2–3 colori piatti coerenti con la palette del cliente e un neutro chiaro che regge sul fondo scuro; 0 se monocromo piatto quando il bersaglio è policromo, o se i colori sono fuori palette / sfumati.
- favicon: a 16–32px si riconosce ancora il soggetto.
- logo: a 64px silhouette netta, compatta, senza frange né frammenti; peso coerente per stare accanto a un nome.
- pertinenza: parla del mestiere REALE del cliente (contesto.json).
- pulizia: forme chiuse e intenzionali, niente rumore, niente sfondo residuo, niente lettere storpiate (un monogramma leggibile è ammesso SOLO se le lettere sono perfette).
- professionalita: lo useresti in un pitch accanto ai 4 riferimenti senza vergogna?

Regole: totale = somma (max 14). «usabile_favicon» se favicon ≥ 2 e pulizia ≥ 1; «usabile_logo» se carattere ≥ 1, colore ≥ 1, logo ≥ 2, pulizia ≥ 1, professionalita ≥ 1. verdetto PASS solo se almeno una variante è usabile sia come logo sia come favicon E ha professionalita = 2.
Diagnosi: dove sta il limite rispetto ai riferimenti? Scegli tra «soggetto/prompt» (idea sbagliata o vaga), «formula tecnica» (i vincoli monocromo/flat/no-testo appesi al prompt allontanano dal bersaglio), «modello/stile recraft» (idea giusta ma resa frammentata, raster-like, troppi dettagli), «scelta dell'agente», «ricoloro/sfondo» (l'appiattimento a un colore o lo sfondo rovinano un mark buono). Cita le varianti per file.

Rispondi SOLO con questo JSON (nessun testo prima o dopo, niente markdown):
{"verdetto":"PASS|FAIL","migliore":"logo/mark-N.svg|null","scelta_agente_corretta":true|false,"varianti":[{"file":"logo/mark-N.svg","punteggi":{"carattere":0,"colore":0,"favicon":0,"logo":0,"pertinenza":0,"pulizia":0,"professionalita":0},"totale":0,"usabile_favicon":false,"usabile_logo":false,"difetti":["…"]}],"diagnosi":{"limite":"soggetto/prompt|formula tecnica|modello/stile recraft|scelta dell'agente|ricoloro/sfondo","spiegazione":"…"},"fix_prompt":"un prompt Recraft concreto (inglese) che avvicinerebbe l'output ai riferimenti, oppure null"}
