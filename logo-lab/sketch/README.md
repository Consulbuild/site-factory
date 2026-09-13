# Probe «schizzo → resa» (2026-09-13)

Ipotesi: i generatori eseguono, non inventano. Se Claude scrive lo scheletro del logo
(composizione, lettere esatte, geometria del concetto) come SVG e il generatore lo RENDE,
si controllano concetto e testo e si lascia al modello solo il mestiere della resa.
Strumento: `genera.mjs --input schizzo.png` (FLUX.2 pro `input_image`, Gemini `inlineData`).
Rasterizzazione dello scheletro: Playwright (script in scratchpad, `svg2png.mjs`).

## Esiti (FLUX.2 pro, ~$0.03 l'uno)

| prova | input | prompt | esito |
|---|---|---|---|
| v1 fedele | scheletro grezzo (payoff sborda, incastro L/C brutto) | «redraw keeping composition and letters…» | il modello ha riprodotto FEDELMENTE i difetti dello schizzo e aggiunto ombra lunga: il tetto di qualità è lo schizzo |
| v2 fedele | scheletro corretto | «render… keeping composition… refine with custom lettering, two-tone flat shading» | testo perfetto (due righe), craft due-tonalità, ma il cronometro è diventato un orologio con tre corone e linee spurie: il modello aggiunge dettaglio dove non serve |
| **v2 libera** | scheletro corretto | «use this sketch only as the concept brief… redesign freely the way a senior branding designer would: characterful emblem, custom letterforms, layered two-tone flat shapes with flat shadow, distinctive silhouette» | **il primo risultato che somiglia a un logo da studio**: L+C due tonalità, cronometro leggibile, testo e payoff esatti, silhouette netta. Difetti: due lancette (orologio, non cronometro sulle 8), ombra grigia sfumata sotto il mark, terza tonalità rosso-arancio |

## Cosa ho imparato

1. **Lo schizzo trasferisce il controllo**: lettere e composizione arrivano intatte anche
   quando il prompt è libero. Il problema del testo storpiato sparisce.
2. **La fedeltà va dosata**: «keep the composition» copia anche i difetti e invita il
   modello a «decorare» (tre corone); «use as concept brief + redesign freely» dà craft.
3. **Il vocabolario di craft conta più dei vincoli**: «layered two-tone flat shapes with
   flat shadow, custom letterforms, characterful emblem, distinctive silhouette» ha
   prodotto un logo; «flat vector, uniform stroke, minimal» produceva icone.
4. **Resta da controllare**: il numero delle lancette, l'ombra sfumata (chiedere «flat
   offset shadow in a darker tint of the same color»), la terza tonalità (dichiarare le
   due tonalità di ogni colore in hex).

## Prossimo passo

Combinare: scheletro v3 con UNA lancetta sulle 8 e le due tonalità esplicite → prompt
«libera» con i quattro punti corretti → confronto su GPT Image / Gemini / Ideogram
(stesso schizzo, stesso prompt) quando ci sono le chiavi o a mano su arena.ai.
