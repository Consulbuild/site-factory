# Prompt di prova corrente (v6, 2026-09-13) — kit a 4 dispositivi

Cliente reale dal form: COSTRUZIONI GENERALI A. L. DI LA CECILIA GIOVANNI, San Severo (Foggia);
«vasche in doccia in 8 ore o bagno completo in 5 giorni in tutta la Puglia»; «pensiamo tutto
noi»; tono «minimale e pulito»; colori aperti. Nome del lockup «LA CECILIA» (da confermare).

## Cosa cambia rispetto a v1–v5

Metodo v2 (`../ricerca/08-metodo-v2.md`): la varietà va cercata tra DISPOSITIVI DI CRAFT, non
tra seed; il prompt nomina il dispositivo col lessico del mestiere e non usa più «flat vector /
minimal / uniform stroke». A, B, C sono già stati generati su FLUX.2 pro (`../runs/vocab/`):
nessuno è un'icona. Da provare tal quali su GPT Image, Gemini, Ideogram, Seedream per il confronto
tra servizi; D è il quarto dispositivo, non ancora testato.

## A — Lettering su misura (wordmark, tono «minimale e pulito»)

```text
Hand-crafted wordmark logo reading "LA CECILIA" for a bathroom renovation company in Puglia, Italy. Letterforms drawn, not typeset: a sturdy low-contrast serif with gently flared terminals and softly curved joins, optically balanced so every letter carries even visual weight. One quiet signature only: the two C letters share a drawn ligature whose inner counter reads, at a second glance, as a single water drop. Deep blue #1E3A8A lettering on flat white, no symbol beside it, centered with generous margin, rendered verbatim.
```

Esito FLUX.2: serif con legatura, «da studio»; la legatura è uno svolazzo, non la goccia.

## B — Two-tone con ombra piatta (combination mark, tono «solido»)

```text
Combination-mark logo for "LA CECILIA", bathroom renovation company in Puglia, Italy. Mark: a freestanding bathtub seen from the side, simplified to one confident silhouette with softly rounded corners, drawn as a two-tone flat illustration, a lighter tint of blue for the tub and a darker tint of the same hue for a hard-edged 45-degree flat shadow clipped inside a rounded square, solid fills, no outlines. Name "LA CECILIA" beside the mark in a sturdy rounded sans-serif, uppercase, dark blue #1E3A8A. Flat white background, centered, rendered verbatim.
```

Esito FLUX.2: vasca in due tinte con ombra lunga, testo esatto; soggetto letterale (vasca).

## C — Badge inciso con gerarchia (emblema, tono «artigiano/storico»)

```text
Circular one-color stamp badge for "LA CECILIA", bathroom renovation company in Puglia, Italy. Upper ring: the name "LA CECILIA" in sturdy uppercase lettering along the arc; a ribbon across the lower half reading "BAGNI IN 5 GIORNI"; tiny "PUGLIA" text below the ribbon. Center: a shower head and a single tile drawn in engraved line style with fine, evenly spaced hatching, calm and precise. Ink blue #1E3A8A on flat white, clean vector edges, rendered verbatim, centered with generous margin.
```

Esito FLUX.2: il più convincente; tutto il testo esatto; serve la versione ridotta per favicon.

## D — Monolinea illustrata con doppia lettura (testato su FLUX.2: il più debole dei quattro)

Esito FLUX.2: vasca a linea con braccio doccia e goccia arancio, tratto pulito e testo esatto, ma la doppia lettura non c'è (la doccia è aggiunta, non nasce dal bordo della vasca), l'illustrazione domina e il nome galleggia piccolo: resta un'illustrazione monolinea, non un marchio. Dispositivo da usare solo con un soggetto che si fonde davvero in un tratto.

Concetto dall'ideazione: la vasca che diventa doccia (il servizio-firma «in 8 ore»), un solo
tratto continuo.

```text
Combination-mark logo for "LA CECILIA", bathroom renovation company in Puglia, Italy. Mark: a monoline illustrated emblem drawn as one continuous stroke with rounded line caps and flowing joins: the profile of a bathtub whose far rim rises and curls into a shower head, so the single line reads as both tub and shower. Controlled detail, generous negative space, the stroke in deep blue #1E3A8A with a single orange #F97316 dot where the water falls. Name "LA CECILIA" to the right in a sturdy geometric sans-serif, uppercase, deep blue. Flat white background, centered, rendered verbatim.
```

## Regolazioni per servizio

- **Ideogram**: Design mode, Magic Prompt OFF.
- **FLUX.2 pro**: `prompt_upsampling: false` (già così in `genera.mjs`).
- **GPT Image**: `transparent background` se serve il PNG senza fondo.
- **Seedream / Gemini**: così com'è.

## Cosa segnalare dopo il test

dispositivo riconoscibile ed eseguito (legatura? ombra piatta? incisione? tratto unico?) · testo esatto · un solo concetto · riduzione a 32 px (il badge C e la monolinea D sono i più a rischio) · tell da AI · quale servizio rende meglio ciascun dispositivo.

## Storico

- v1–v2 (8/9): copia del riferimento / stile vago → scartati.
- v3 (8/9): goccia + piastrella, 5 servizi → tutti «goccia su quadrato», icone corrette e intercambiabili.
- v4 (8/9): monogramma LC con goccia → «troppo semplice».
- v5 (12/9): C cronometro sulle 8 → corretto ma icona; probe schizzo→resa (13/9): FLUX conserva testo e composizione, non la geometria fine.
- v6 (13/9): kit a 4 dispositivi di craft; A/B/C validati su FLUX.2 pro.
