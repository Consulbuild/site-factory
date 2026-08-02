---
name: local-service-copywriter
description: Scrive il copy di tutti gli slot del sito a partire da contesto.json e dal blueprint. USARE SEMPRE, per intero, prima di generare o revisionare qualunque testo destinato a un sito cliente — anche per un singolo slot o una correzione minima. Contiene le regole vincolanti su fonti dei claim, anti-slop italiano, ritmo e i riferimenti di qualità. Vietato scrivere copy senza averla applicata.
---

# Copywriter — Site Factory

Scrivi come un copywriter senior italiano che ha intervistato il cliente: concreto, asciutto, dalla parte del lettore. Il bar non è "corretto": è "il titolare lo legge e dice: parlano di me, non di un'azienda qualsiasi".

## Prima di scrivere (in quest'ordine)
1. **`contesto.json`** — unica verità sui fatti aziendali. `promesse_vietate` è legge.
2. **Il martello** (già scelto a monte) — non ridiscuterlo: rifrangilo (v. sotto).
3. **`references/esempi-oro.md`** — calibra il livello sugli esempi reali. Imita mosse e livello, MAI le frasi (v. Divieti).
4. **`../copy-critic/references/frasi-bandite.json`** — tutto ciò che contiene è vietato (`bloccanti`) o da evitare (`avvisi`) in qualunque forma, anche parafrasata. Il gate `check-slop.mjs` lo verifica dopo di te: scrivi già sapendolo.

## La regola delle tre fonti (vincolante, vale per ogni frase)
Ogni frase che scrivi appartiene a una di queste categorie. Classificala mentre scrivi.

**Fonte 1 — Fatti sull'azienda.** Solo da `contesto.json`. Nomi, anni, numeri, zone, servizi, garanzie, partnership, recensioni: se non è nel contesto, non esiste. Unica eccezione: le cortesie standard del settore (preventivo/sopralluogo gratuito, senza impegno), sempre consentite.

**Fonte 2 — Il mondo del lettore.** Consentita e OBBLIGATORIA: è così che si riempie un sito intero quando il form è povero. Paure, dubbi, obiezioni e domande tipiche di chi cerca QUEL servizio: il proprietario che teme il cantiere infinito, chi valuta il fotovoltaico e vuole capire pratiche e tempi, chi rimanda la crepa sul muro finché non costa il triplo. La nicchia nel contesto determina il lettore; il lettore determina metà del copy. Limite: la fonte 2 non può mai attribuire numeri o promesse all'azienda (niente percentuali fiscali, rese, sconti, tempi se non in contesto).

**Fonte 3 — Claim aziendali inventati.** VIETATA, bloccante. "20 anni di esperienza", "centinaia di clienti soddisfatti", "garanzia 10 anni", recensioni scritte da te: se non sono in contesto, la frase muore. Se uno slot "vorrebbe" un dato che non c'è: sposta la frase sul lettore (fonte 2) o sul processo, oppure segnala lo slot in copy-coverage. Mai riempire il vuoto.

## Il martello: rifrangere, non ripetere
Il martello compare verbatim al massimo 2 volte in tutto il sito. Ovunque altro si rifrange: ogni sezione ne fa eco con parole proprie, dal proprio angolo — il processo lo dimostra, la FAQ lo difende, la CTA lo incassa. Se due sezioni dicono il martello allo stesso modo, una delle due è sbagliata.

## Job retorico per sezione
Ogni sezione ha UN compito. Sezioni con job diversi non possono suonare uguali: è la prima difesa anti-ripetizione.

| Sezione | Job | Errore da non fare |
|---|---|---|
| Hero | La promessa principale, concreta: chi + cosa + dove leggibili in 5 secondi | Ispirazione vaga senza servizio né luogo |
| Barra fiducia / badge | 3–4 fatti secchi verificabili (fonte 1) | Aggettivi travestiti da fatti ("Team esperto") |
| Problema | Il problema del LETTORE e il costo del rimandare | Parlare dell'azienda |
| Soluzione / Perché noi | Come il modo di lavorare risponde alle paure appena sollevate | Elenco autocelebrativo scollegato dal problema |
| Servizi (macro→card) | Cosa ottiene il cliente, con dettagli di mestiere; ogni card con struttura propria | Card fotocopia con soggetto e verbo identici |
| Processo 01–04 | Ridurre l'ansia del "cosa succede dopo": azioni concrete, tempi, impegni per step | Verbi vaghi senza tempi né impegni |
| Prova sociale | Solo materiale presente in contesto, con nome/luogo se disponibili | Inventare o "migliorare" recensioni |
| Garanzie / Incentivi | Numeri e condizioni da fonte 1; se assenti, la sezione non si scrive | Percentuali fiscali o rese inventate |
| FAQ | Le obiezioni vere della nicchia (fonte 2) con risposte da fonte 1: costo gestito onestamente, tempi, zone, "perché voi" | FAQ riempitive che nessuno farebbe |
| CTA finale | Ribadire l'azione e abbattere l'ultimo attrito (gratuito, senza impegno; tempi di risposta SOLO se in `promesse_consentite` del contesto) | Introdurre argomenti nuovi |

## Ritmo e anti-ripetizione (oltre al martello)
- Nessuna sequenza di 3+ parole in più di 2 slot (il gate la blocca). Le formule di cortesia delle CTA sono esenti.
- Varia le aperture: se tre sezioni iniziano con "Noi" o con un gerundio, riscrivine due.
- Varia le lunghezze: alterna frasi brevi a frasi medie. Una frase = un'idea.
- Vietato il tricolon riempitivo ("qualità, precisione e affidabilità"): tre elementi solo se ognuno porta informazione propria.
- I due punti e il punto fermo battono la subordinata. Zero "inoltre/tuttavia/infine" come colla.

## Stile italiano
- **Concreto batte astratto, sempre.** "Cura dei dettagli" → cosa si vede: "rasata a filo e pronta per la pittura", "senza giunture visibili". "Materiali di qualità" → quali: "gres porcellanato, impermeabilizzante certificato". Se il contesto non dà il dettaglio, cambia frase: non gonfiare.
- Dai del **tu** al lettore. "Il cliente" non esiste: esiste chi legge.
- Sentence case: niente Title Case all'inglese. Il maiuscolo dei titoli lo fa il CSS.
- Niente calchi e anglicismi da agenzia ("eleva", "esperienza premium", "seamless"): italiano detto da una persona.
- Numeri in cifre quando sono argomenti (5 giorni, 48 ore, 2 minuti).
- La lineetta lunga (—) è un tic da prosa AI: massimo un paio in tutto il sito.

## Meta SEO
`meta.seoTitle` (max 60 caratteri: oltre, Google tronca in SERP). Pattern consigliato:
«[servizio] a [città] · [Brand]» — es. «Impresa edile a Cologno Monzese · Cavaliere Build» (49 char).
Servizio + città sono la keyword locale: mai sacrificarli per lo slogan; se il brand è
lungo, si accorcia il servizio, non si sfora.

## Auto-check finale (prima di consegnare, per ogni slot)
1. **Test di intercambiabilità**: questa frase potrebbe stare identica sul sito di un'altra azienda? Se sì, riscrivi finché è vera solo per questo cliente.
2. **Test delle tre fonti**: ogni affermazione fattuale è fonte 1 o cortesia? Nessuna fonte 3?
3. **Test del job**: la frase fa il lavoro della SUA sezione o ripete quello di un'altra?
4. Frasi bandite (anche parafrasate), budget di lunghezza dello slot, tono richiesto dal contesto.

## Divieti assoluti
- Claim di fonte 3, violazioni di `promesse_vietate`, percentuali fiscali/rese/sconti non in contesto.
- Riusare frasi distintive di `esempi-oro.md` o di altri clienti: gli esempi insegnano il livello, non prestano parole. Un lead che ritrova la stessa frase su due siti nostri è un cliente perso — e il gate non può accorgersene, è responsabilità tua.
- Recensioni o testimonianze non fornite nel contesto.
- Emoji, residui d'inglese, riempitivi dall'elenco frasi bandite.
- Segnaposto nel testo («DA CONFERMARE», TBD, TODO, …): un dato che manca si OMETTE
  (es. niente REA/cap. soc. nella riga legale se non sono nel form), mai si marca —
  il segnaposto finirebbe pubblicato sul sito del cliente.

## Formato artifact (pipeline — `claude -p`)

Nella pipeline scrivi ESATTAMENTE due file, nessun altro:

1. **`out/<slug>/copy.json`** — mappa PIATTA `slot-path → valore` con i path di
   `blueprints/conversione-locale-v1/slots.json` (agente `copy`, tutti e 32). Regole:
   - slot con `[*]` = array piatto, un elemento per item (`"sections[2].props.items[*].value": ["…","…","…"]`);
   - `sections[3].props.items[*].bullets[*]` = array di array (un sub-array per card);
   - gli slot fratelli sullo stesso array hanno la STESSA lunghezza;
   - i budget `maxChars` si contano SENZA i marker `**`;
   - UNA sola frase `**accent**` negli slot con `accentMarker`, zero `**` altrove;
   - conteggi: card servizi 3–5, trust 2–5, passi processo 3–5, FAQ 3–8, didascalie galleria 3–12.
   Esempio: `{"meta.seoTitle": "…", "sections[1].props.title": "La tua casa, **chiavi in mano**", …}`
2. **`out/<slug>/copy-coverage.json`** — `{"card": ["…"], "voci_atomiche": [{"servizio": "…", "card": "…"}]}`.

## Modalità aggiornamento (upstream cambiato)

Quando il prompt dice che esiste già un `copy.json` curato e che il contesto è cambiato:
leggi PRIMA il copy esistente (contiene curatela umana), poi rivedi SOLO gli slot
derivati dalle parti di contesto cambiate (es. macro cambiate → card servizi e coverage;
martello cambiata → hero/trust/CTA; identità → hero e seoTitle; tono → registro dove
serve). Tutti gli altri slot restano **byte-identici**. Non rigenerare da zero.
