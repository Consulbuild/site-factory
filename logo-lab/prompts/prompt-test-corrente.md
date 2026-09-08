# Prompt di prova corrente (v3, 2026-09-08)

Cliente reale dal form: COSTRUZIONI GENERALI A. L. DI LA CECILIA GIOVANNI, San Severo (Foggia),
edilizia; «ristrutturazioni vasche in doccia in 8 ore o bagno completo in 5 giorni in tutta la
Puglia»; tono richiesto «minimale e pulito»; colori: «aperto a proposte».

Costruito con: un concetto come direzione (ricerca §2), 30–80 parole in prosa con il testo
in testa (BFL `flux-image-best-practices`: word order, testo tra virgolette con stile del
carattere, hex con nome del colore, SOLO descrizioni positive — niente «no …»), 2 colori +
neutro, fondo pieno. Il nome del lockup è «LA CECILIA» (ragione sociale troppo lunga per un
logo: da confermare col cliente).

## Prompt (con nome integrato)

```text
Logo for "LA CECILIA", a bathroom renovation company in Puglia, Italy: the name "LA CECILIA" in bold geometric sans-serif capitals with even letter spacing, set to the right of a single mark that merges a water drop and a square tile into one geometric shape, uniform stroke weight, strong closed silhouette, clear negative space. Flat solid fills in #1E3A8A (deep blue) and #F97316 (orange) on a plain white background, centered with generous margin, clean vector style.
```

(72 parole)

## Variante solo simbolo

Sostituire la prima frase fino ai due punti con: `Logo mark for a bathroom renovation company in Puglia, Italy: a single mark that merges …` e chiudere con `… clean vector style, text-free composition.`

## Regolazioni per servizio

- **FLUX.2**: preferire il modello `flex` per la tipografia; disattivare il prompt upsampling (`prompt_upsampling: false`) per una grafia stabile.
- **Ideogram**: Magic Prompt OFF.
- **GPT Image**: aggiungere `transparent background` se serve il PNG senza fondo; per nomi difficili, spelling lettera per lettera.
- **Gemini / Nano Banana**: così com'è (già solo descrizioni positive).
- **Midjourney**: aggiungere `--style raw --s 50 --ar 1:1`.

## Cosa segnalare dopo il test (i criteri del critico v5)

concetto (uno solo? cliché rielaborato?) · riduzione a 32 px · esecuzione (spessori, curve, chiusure) · colore (piatto? solo i due + bianco?) · tipografia (nome esatto, spaziatura) · composizione (nastri/cornici vuoti, mockup) · distinzione (sembra di qualunque ditta di bagni?) · tell da AI visti.

## Storico

- v1 (8/9, mattina): prompt che descriveva per intero il logo Cavaliere Build → scartato (copiava il riferimento).
- v2 (8/9): tre prompt brevi con «emblem or mascot… in the spirit of local graphic studios» → scartati (stile imposto dai riferimenti, soggetto troppo vago).
- v2b (8/9, post-ricerca): tre prompt con un concetto come direzione e hex, ma con esclusioni negative («no gradients…») → superati da v3 dopo l'installazione delle regole BFL.
