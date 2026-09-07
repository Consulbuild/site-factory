# Dati sorgente

`comuni.json` — elenco dei 7.904 comuni italiani con codice ISTAT, provincia, regione
e CAP. Fonte: dati ISTAT integrati con i CAP ANCI, nella redazione del progetto
`matteocontrini/comuni-json` (raw `comuni.json`, scaricato il 2026-09-07). Serve solo
in fase di build: `npm run comuni` lo spezza in `public/data/comuni/<iniziale>.json` e
`public/data/province.json` (vedi `scripts/build-comuni.mjs`). Per aggiornarlo dopo
fusioni o nuove province: riscaricare il file, rilanciare lo script, provare la
domanda «Dov'è la sede» con un comune nuovo.
