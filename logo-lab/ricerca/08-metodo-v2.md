# Metodo v2 per loghi professionali (2026-09-13)

Perché serve: dopo cinque prompt (v1–v5) i loghi erano corretti ma «troppo basici, poco originali, non personalizzati» (Mattia, 9/9). Questo documento fonde le tre ricerche di oggi (`05-vocabolario-craft.md`, `06-struttura-verso-resa.md`, `07-riferimenti-di-stile.md`) con i probe fatti in casa (`../sketch/README.md`, `../runs/vocab/`) e dice cosa cambia.

## Diagnosi: perché v1–v5 producevano icone

1. **Vocabolario da icona.** «flat vector, single consistent stroke weight, strong silhouette, minimal» è lessicalmente il prompt del pittogramma da UI kit (05 §2). Ogni modello lo esegue bene e il risultato è un'icona.
2. **Nessuna ideazione.** Il concetto era il simbolo di categoria (goccia) o una variante (LC, cronometro): cose che il concorrente accanto userebbe.
3. **Un dispositivo solo, il più povero.** I loghi da studio hanno sempre UN dispositivo di craft eseguito a fondo: lettering su misura, negative space narrativo, two-tone con ombra piatta, monolinea illustrata, badge con gerarchia, incisione (05 §1). I nostri non ne avevano nessuno.

## La prova (stesso servizio, stesso cliente, cambia solo il vocabolario)

FLUX.2 pro, La Cecilia, 2026-09-13, `../runs/vocab/`:

| dispositivo | prompt (05 §Tre prompt) | esito |
|---|---|---|
| A lettering su misura | «letterforms drawn, not typeset… flared terminals… ligature between the two C» | wordmark serif con legatura: pulito, «da studio», ma la legatura è uno svolazzo, non la goccia promessa |
| B two-tone con ombra piatta | «two-tone flat illustration… hard-edged 45-degree flat shadow clipped inside a rounded square» | vasca in due tinte con ombra lunga: craft evidente, testo esatto; ma soggetto letterale (vasca) |
| C badge inciso con gerarchia | «circular one-color stamp badge… ribbon reading… engraved line style with fine hatching» | **il più convincente**: anello con nome, nastro «BAGNI IN 5 GIORNI», doccia e piastrella incise, «PUGLIA»; tutto il testo esatto |

Nessuna di queste è un'icona. Tre righe di vocabolario hanno fatto più di cinque riscritture del prompt.

## Cosa hanno detto le tre ricerche (in una riga ciascuna)

- **05 vocabolario**: nominare il dispositivo con il lessico del mestiere; evitare gli aggettivi d'umore; tabella «dispositivo → parole → parole da evitare».
- **06 struttura → resa**: FLUX.2 non ha un parametro di forza e interpreta lo schizzo «semanticamente»: conserva composizione e testo, non la geometria fine (verificato: ore, numero di lancette, «hand» → mano, «crown» → corona). Chi vende loghi in serie fa rendere al modello solo il simbolo e compone il testo a parte; gate OCR; Vectorizer.AI per il vettoriale.
- **07 riferimenti**: i loghi propri dei vecchi clienti sono riferimenti legittimi di «livello»; canali style-only (Ideogram style reference, Gemini style ref, Recraft V4 Styles, `--sref`); un ruolo per immagine; il pattern «griglia → scelta → change only X».

## Il metodo v2 (per la pipeline e per i test a mano)

1. **Ideazione dal form** (`00-sintesi.md` §3): fatti che i concorrenti non possono rivendicare → 3-5 candidati a doppia lettura → scarto dei simboli di categoria.
2. **Scelta del dispositivo di craft dal tono del form** (05 §1): «minimale e pulito» → lettering su misura o negative space; «solido/affidabile» → two-tone con ombra piatta o thick lines; «amichevole/familiare» → mascotte semplificata o monolinea illustrata; «storico/artigiano» → badge con gerarchia o incisione; «premium» → lettering serif a basso contrasto.
3. **Prompt = concetto + dispositivo + vincoli** (30-100 parole, prosa): il concetto come direzione con la doppia lettura, la riga del dispositivo con il suo lessico, testo tra virgolette e corto, hex col nome del colore, fondo pieno, solo descrizioni positive. Mai «flat icon / minimal / uniform stroke / pictogram».
4. **Tre dispositivi diversi per cliente, non tre seed dello stesso**: la varietà che serve è tra dispositivi (A/B/C), non tra semi.
5. **Testo**: nomi di 1-2 parole il modello li rende (FLUX.2 pro, GPT Image, Ideogram); payoff e nomi lunghi → il renderer compone (Header) o si tiene solo il simbolo.
6. **Critico v5** con la regola nuova: nessun dispositivo di craft (icona flat + font) = professionalità massimo 1.
7. **Chiusura**: sfondo trasparente o ritaglio, versione ridotta per favicon (obbligatoria per badge e mascotte), vettorializzazione (Vectorizer.AI o potrace se 1-2 colori).

## Cosa NON ha funzionato e non va riproposto

- Schizzo SVG → FLUX.2 «fedele»: copia i difetti dello schizzo e decora.
- Schizzo → FLUX.2 «libera»: buon craft ma perde la geometria del concetto.
- FLUX.2 flex per la geometria: peggio di pro (semi-3D).
- Parole ambigue: «hand» (mano), «crown» (corona), «eight o clock» (ignorato). Con i generatori si nominano oggetti non ambigui e non si contano posizioni.

## Previsione onesta

Con il metodo v2 su FLUX.2 pro mi aspetto loghi «da studio» al primo giro in 2 casi su 3 per dispositivo, con difetti ritoccabili (una legatura sbagliata, un soggetto troppo letterale). Il salto ulteriore, per i casi dove il concetto va tenuto esatto, richiede uno dei canali di riferimento del rapporto 07 (Ideogram style reference, Recraft V4 Styles con i loghi dell'agenzia) che oggi non hanno chiave: da provare a mano su arena.ai o con una chiave nuova.
