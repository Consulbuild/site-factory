# Prompt di prova per il confronto tra servizi (3 clienti, nessun riferimento) — v2

Riscritti secondo `../ricerca/00-sintesi.md` §2-4: prosa di ~65 parole, UN concetto dato
come direzione (non come disegno), 4-6 parole di stile concrete, 2 colori + neutro con hex,
nome tra virgolette con «rendered verbatim», fondo pieno, esclusioni in coda. Struttura
identica nei tre: cambia solo il primo blocco. Per la versione **solo simbolo** togliere la
frase sul nome e aggiungere «no text».

## 1 — La Cecilia (dati reali dal form: bagni in 5 giorni, vasca in doccia in 8 ore, Puglia, tono minimale e pulito, colori aperti)

```text
Combination-mark logo for "LA CECILIA", a bathroom renovation company in Puglia, Italy. Mark: one symbol that fuses a water drop with a simple bathroom shape, geometric construction, single consistent stroke weight, strong silhouette. Colors: deep blue #1E3A8A and orange #F97316 on flat white. The name "LA CECILIA" in bold geometric sans-serif, all caps, evenly spaced, to the right of the mark, rendered verbatim. Centered, generous margin, no gradients, no shadows, no mockup.
```

## 2 — Termoidraulica Rossi (fixture in stile form: caldaie, bagni, pompe di calore, pronto intervento; affidabile e amichevole)

```text
Combination-mark logo for "TERMOIDRAULICA ROSSI", a plumbing and heating company in Bergamo, Italy. Mark: a flame and a water drop drawn as one continuous shape, bold flat vector, rounded corners, clear negative space. Colors: orange #F97316 and slate #334155 on flat white. The name "TERMOIDRAULICA ROSSI" in bold rounded sans-serif, all caps, to the right of the mark, rendered verbatim. Centered, generous margin, no gradients, no shadows, no mockup.
```

## 3 — Coperture Marini (fixture in stile form: tetti, terrazzi, isolamento, grondaie; solido e affidabile)

```text
Combination-mark logo for "COPERTURE MARINI", a roofing and waterproofing contractor in Treviso, Italy. Mark: the letter M whose two peaks read as roof ridges, heavy geometric strokes, compact silhouette, flat vector. Colors: charcoal #1F2937 and brick red #B91C1C on flat white. The name "COPERTURE MARINI" in bold condensed sans-serif, all caps, to the right of the mark, rendered verbatim. Centered, generous margin, no gradients, no shadows, no mockup.
```

## Note per servizio

- **Ideogram**: Magic Prompt OFF (altrimenti può riscrivere il testo quotato).
- **FLUX.2**: disattivare il prompt upsampling per la grafia stabile; nessun negative prompt, le esclusioni in prosa vanno bene.
- **GPT Image**: aggiungere «transparent background» se serve il PNG senza fondo.
- **Midjourney**: sostituire la coda con `--style raw --s 50 --ar 1:1 --no gradient shadow mockup realistic`.

## Cosa guardare nei risultati (checklist breve, dal rapporto 01)

Nome esatto · un solo soggetto · spessori di linea coerenti · simbolo riconoscibile a 32 px · zero gradienti/ombre/3D · nessun nastro o cornice vuota · lo useresti in un pitch?
