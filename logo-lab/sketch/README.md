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

| v3 libera | scheletro con UNA lancetta sulle 8, due tinte esplicite per colore, niente targa | «concept brief… exactly two tints per color… flat offset shadow… hard-edged» | ombre piatte nette e testo esatto come chiesto, ma la C si è CHIUSA in un cerchio (persa la lettura «C») e la lancetta è a mezzogiorno: senza vincolo di fedeltà il modello non conta né posiziona; terza tinta grigia sotto il wordmark |

| v3 mista | scheletro v3 | «keep exactly as sketched: open C, the single blue hand at eight… redesign everything else» | il wordmark è diventato bicolore estruso (craft buono), payoff esatto, ma «hand» è stato letto come MANO umana che afferra la C: il modello interpreta alla lettera, la parola giusta è «pointer needle» |

| v3 mista 2 | scheletro v3 | come sopra ma «stopwatch pointer needle… eight o clock position», «small crown on top» | C aperta ✓, L sotto la C ✓, due tinte ✓, testo ✓; ma «crown» → CORONA reale sopra la C, e le lancette sono a 12 e 3: FLUX.2 in edit non rispetta la geometria fine (posizioni orarie, numero di elementi) neanche se lo schizzo la mostra |

| v3 flex | scheletro v3, stesso prompt di «mista 2» | modello `flex` (tipografia) | peggio di pro: resa semi-3D con bagliori e bordi sfumati, due lancette; flex non aiuta la geometria e allontana dal flat |

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

5. **Fedeltà e libertà sono una manopola, non un interruttore**: «fedele» copia i
   difetti e decora; «libera» perde il concetto (C → cerchio, lancetta a 12). FLUX.2
   non ha un parametro di forza: la via di mezzo va ottenuta col prompt («keep the
   open C shape and the single hand at eight o clock exactly as sketched; redesign
   everything else freely») o con un servizio che ha `image_weight`/`strength`
   (Ideogram remix, Recraft i2i).

## Prossimo passo

Prompt a fedeltà mista (elementi da conservare nominati uno per uno, il resto libero)
sullo scheletro v3; poi lo stesso schizzo + stesso prompt su GPT Image / Gemini /
Ideogram quando ci sono le chiavi, o a mano su arena.ai.
