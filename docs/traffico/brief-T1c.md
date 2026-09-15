# Brief T1c — Telefono veloce

Leggi prima `docs/traffico/decisioni-piani.md`, sezione T1b, **punti 8 e 9** (il 9 è la decisione di Mattia del
15/09 che apre questo piano e vale sopra il testo di T1b), poi `docs/traffico/piano-T1b.md` (§4, «Calibrazione»,
«Verifica»). Dipende da **T1b** (chiuso: `Foto.astro`, `scripts/media-varianti.ts`, `scripts/budget-pagine.ts`).

## Obiettivo

PageSpeed mobile **≥ 90** sulla home di Cavaliere e, come standard, su tutti i siti col servizio Sito attivo o
sospeso, senza perdita visibile di qualità alla dimensione resa sul telefono. Tablet e computer restano alla
regola dello zoom del punto 8. A servizio spento nulla cambia: HTML identico, baseline VRT invariate.

## Fatti di partenza (PSI mobile dal vivo, 15/09, Lighthouse 13.4.1)

- Punteggio 79: FCP 0,9 s, TBT 0, CLS 0, Speed Index 0,9 s; **LCP 5,7 s** = foto hero. Con TBT, CLS, FCP e SI a
  punteggio pieno il totale è 75 + 25 × punteggio LCP: **90 richiede LCP ≤ ~3,6 s**, 95 ≤ ~2,9 s.
- Hero: `hero.45779169-1920.avif` 708 KB, scelta perché il `sizes` del telefono è raddoppiato dallo zoom
  (`(max-width: 767px) 2340px`); del riquadro 412×626 si vede una fascia centrale di ~716×1088 px dell'originale.
- 5 card servizi a 1216 px (216-311 KB l'una, 1,4 MB) per 362×272 px resi; partono a 249 ms, prima del LCP
  osservato (356 ms), quindi pesano sul LCP simulato anche se pigre.
- `mark.png` 285×240 senza perdita 112 KB per 40-48 px d'altezza; CSS bloccante 11 KB (160 ms stimati); font
  35 KB.
- Report completo: `~/.cache/site-factory/psi-mobile-cavaliere-2026-09-15.json`.

## Regole (decisione 9)

- Telefoni (≤ 767 px): niente margine 2×, candidato ≥ larghezza resa × DPR.
- Hero da telefono: ritaglio alle proporzioni del riquadro con la stessa zona visibile di `object-position`;
  larghezze e qualità AVIF calibrate a dimensione resa (la foto sta sotto il velo scuro).
- Qualità per uso calibrata alla dimensione resa sul telefono, non allo zoom 200 %; logo ≤ 3× l'altezza resa.
- Verifica con Lighthouse locale (5 esecuzioni, mediana), poi PSI dal vivo su Cavaliere dopo la ripubblicazione
  (autorizzata da Mattia il 15/09).

## Cosa deve esistere a fine T1c

1. Varianti da telefono (AVIF a qualità calibrata) per ogni foto, ritaglio da telefono per la hero a tutta pagina,
   logo da telefono; `sizes` senza raddoppio sotto 768 px.
2. Budget ricalibrato sulla ricetta nuova, con avviso sul peso della foto LCP da telefono.
3. Nessun cambiamento a servizio spento; box, zona visibile, axe e `hashPagina` invariati a servizio acceso.
4. Lighthouse locale ≥ 90 (mediana di 5) sulla copia di Cavaliere; PSI mobile e desktop dal vivo registrati.
5. Documenti: piano chiuso, README §7, handoff, `docs/DEBUG.md` se cambia qualcosa da diagnosticare.
