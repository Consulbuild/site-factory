# Prompt di prova corrente (v4, 2026-09-08)

Cliente reale dal form: COSTRUZIONI GENERALI A. L. DI LA CECILIA GIOVANNI, San Severo (Foggia),
edilizia; «ristrutturazioni vasche in doccia in 8 ore o bagno completo in 5 giorni in tutta la
Puglia»; tono «minimale e pulito»; colori «aperto a proposte». Nome del lockup «LA CECILIA»
(ragione sociale troppo lunga: da confermare col cliente).

## Cosa ha insegnato il test v3 (5 servizi, giudizio con critico v5)

| servizio | punti/16 | verdetto | difetto principale |
|---|---|---|---|
| GPT Image 1 | 12 | ritoccabile | contorno bianco della goccia irregolare; nome su due righe |
| FLUX 2 Pro | 11 | ritoccabile | quadranti disuguali; carattere tondo/medio; croce = sanità |
| Seedream 5.0 Pro | 10 | ritoccabile | rientra la casetta (cliché); virgola decorativa; grana sul fondo |
| Gemini 3.1 Pro | 10 | ritoccabile | goccia a contorno vuoto; il più generico |
| Gemini 3.1 Flash Lite | 5 | FAIL | cornice con spessore incoerente; lettere affollate; bagliore |

**Limite: soggetto/prompt.** Cinque servizi, cinque volte «goccia su quadrato»: la goccia è il
simbolo più letterale della categoria e ogni modello converge lì. La direzione di concetto va
scelta FUORI dal simbolo di categoria (regola aggiunta al critico v5, criterio 7). Difetti
secondari di prompt: nome impilato su due righe (2/5), forme a contorno invece che piene
(2/5), texture o bagliore sullo sfondo (2/5).

## Prompt v4 (monogramma + significato, nome integrato)

Direzione: le iniziali L e C unite in un solo blocco, con la goccia come spazio negativo dentro
la C. È il metodo «monogram + meaning» (brandkit) e il tipo di logo più scalabile per la
favicon (rapporto 01 §2). Correzioni v3→v4: «on one line», «solid filled shapes», «uniform pure
white background», carattere «heavy».

```text
Logo for "LA CECILIA", a bathroom renovation company in Puglia, Italy: the name "LA CECILIA" on one line in heavy geometric sans-serif capitals with even letter spacing, to the right of a monogram mark that joins the letters L and C into one compact block, the L in #1E3A8A (deep blue) and the C in #F97316 (orange), with a small water drop cut out of the C as white negative space. Uniform stroke weight, closed silhouette, solid filled shapes, on a uniform pure white #FFFFFF background, centered with generous margin, clean flat vector style.
```

(84 parole)

## Variante solo simbolo

Sostituire fino a «to the right of» con `Logo mark for a bathroom renovation company in Puglia, Italy:` e chiudere con `… clean flat vector style, text-free composition.`

## Regolazioni per servizio

- **FLUX.2**: modello `flex` per la tipografia; `prompt_upsampling: false`.
- **Ideogram**: Magic Prompt OFF.
- **GPT Image**: `transparent background` se serve il PNG senza fondo.
- **Seedream / Gemini**: così com'è (solo descrizioni positive).

## Cosa segnalare dopo il test

concetto (il monogramma si legge come LC? la goccia si vede?) · riduzione a 32 px · esecuzione (spessori uguali tra L e C, chiusure) · colore (due campiture piatte + bianco, fondo uniforme) · tipografia (nome esatto, una riga, peso) · composizione · distinzione (sembra di qualunque ditta di bagni?) · tell da AI.

## Storico

- v1 (8/9, mattina): descriveva per intero il logo Cavaliere Build → scartato (copiava il riferimento).
- v2 (8/9): tre prompt «emblem or mascot… in the spirit of local graphic studios» → scartati (stile imposto dai riferimenti, soggetto vago).
- v2b (8/9, post-ricerca): un concetto come direzione, hex, ma esclusioni negative → superato dopo l'installazione delle regole BFL.
- v3 (8/9): «drop merged with a square tile» → testato su 5 servizi: tutti ritoccabili o bocciati, concetto troppo letterale (tabella sopra).
