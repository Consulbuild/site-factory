# Prompt di prova corrente (v5, 2026-09-12)

Cliente reale dal form: COSTRUZIONI GENERALI A. L. DI LA CECILIA GIOVANNI, San Severo (Foggia),
edilizia; «ristrutturazioni vasche in doccia in 8 ore o bagno completo in 5 giorni in tutta la
Puglia»; «pensiamo tutto noi: scelta del materiale, impianto elettrico e idraulico»; tono
«minimale e pulito»; colori «aperto a proposte». Nome del lockup «LA CECILIA» (da confermare).

## Perché v5: il problema di v3/v4 era l'assenza di ideazione

Mattia (9/9): «i loghi hanno la grafica dei loghi ma sono troppo semplici e poco originali e
personalizzati per la ditta». Non esiste un parametro «creatività» nelle API (solo `--chaos`
e `--stylize` di Midjourney, e il Magic Prompt di Ideogram che però riscrive il testo): i
generatori eseguono il concetto che ricevono. L'originalità si decide PRIMA del prompt, con
la procedura in `../ricerca/00-sintesi.md` §3 («Ideazione del concetto»). Qui applicata.

### 1. Fatti che i concorrenti non possono rivendicare

| fatto (dal form) | perché è loro |
|---|---|
| vasca → doccia in **8 ore** | promessa firmata con un numero; nessun concorrente locale la scrive |
| bagno completo in **5 giorni** | idem |
| «pensiamo tutto noi» (materiali, impianti) | chiavi in mano, un solo interlocutore |
| nome **LA CECILIA**, iniziali L C | il nome è l'unica cosa che nessun altro ha |
| San Severo, Puglia | luogo: da usare solo con un simbolo non turistico (niente trulli) |
| tono minimale e pulito | vincolo di stile, non concetto |

### 2. Candidati (doppia lettura) e scarto

- **A — la C cronometro**: la C di CECILIA come quadrante aperto con una sola lancetta sulle 8 → «si legge come C e come cronometro». Lega nome + promessa delle 8 ore. Una forma, favicon ok. Rischio: somigliare a un'icona «power» o a uno spinner.
- **B — la L doccia**: la L di LA come colonna doccia che in basso diventa il piatto → «L e doccia». Lega nome + servizio firma. Rischio: la doccia è vicina al simbolo di categoria (goccia): scartato per il criterio 7 del critico.
- **C — le 5 piastrelle**: cinque quadrati in fila = 5 giorni = pavimento → troppo astratto, non si descrive in una frase: scartato.
- **D — l'8 come scarico/infinito**: due gocce impilate → simbolo di categoria: scartato.
- **E — «tutto noi»**: check dentro un quadrato → cliché (scudo con spunta): scartato.

Scelta: **A**. Test «lo userebbe il concorrente accanto?» → no, perché il concetto vive sulla lettera C e sul numero 8 che sono solo loro.

## Prompt v5 (concetto A, nome integrato)

```text
Logo for "LA CECILIA", a bathroom renovation company in Puglia, Italy: the name "LA CECILIA" on one line in heavy geometric sans-serif capitals with even letter spacing, to the right of a mark where the letter C doubles as a stopwatch, an open ring in #1E3A8A (deep blue) with a short crown stub on top and one bold hand in #F97316 (orange) pointing to eight o'clock, so it reads as both the letter C and a stopwatch. Uniform stroke weight, solid filled shapes, on a uniform pure white #FFFFFF background, centered with generous margin, clean flat vector style.
```

(86 parole)

## Variante solo simbolo

Sostituire fino a «to the right of» con `Logo mark for a bathroom renovation company in Puglia, Italy:` e chiudere con `… clean flat vector style, text-free composition.`

## Regolazioni per servizio

- **FLUX.2**: modello `flex`; `prompt_upsampling: false`.
- **Ideogram**: Magic Prompt OFF.
- **GPT Image**: `transparent background` se serve il PNG senza fondo.
- **Seedream / Gemini**: così com'è.

## Cosa segnalare dopo il test

la doppia lettura funziona (si vede una C? si vede il cronometro? la lancetta punta alle 8?) · riduzione a 32 px · esecuzione (anello con spessore uniforme, lancetta e stub allineati) · colore (due campiture piatte, fondo uniforme) · tipografia (nome esatto, una riga, peso) · distinzione (lo userebbe il concorrente accanto?) · tell da AI.

Se A non regge, il prossimo candidato è B con la doccia rielaborata (L come colonna + piatto), poi si cambia asse: il luogo.

## Storico

- v1 (8/9): descriveva per intero il logo Cavaliere Build → scartato (copiava il riferimento).
- v2 (8/9): «emblem or mascot… in the spirit of local graphic studios» → scartato (stile dai riferimenti, soggetto vago).
- v2b (8/9): un concetto come direzione, hex, esclusioni negative → superato dalle regole BFL.
- v3 (8/9): «drop merged with a square tile» → 5 servizi, tutti ritoccabili o bocciati; il migliore GPT Image 12/16. Limite: soggetto letterale di categoria.
- v4 (8/9): monogramma LC con goccia in negative space → Mattia: corretti ma «troppo semplici, poco originali, non personalizzati». Limite: nessuna ideazione dal form.
