# Brief T6a — Fatti comunali da open data

Leggi prima `docs/traffico/README.md` (§1-§5). Nessuna dipendenza da altri piani.

## Obiettivo

Un dataset versionato con **fatti veri, datati e citabili per ogni comune italiano**, usato
offline dalla build e dalla pipeline copy per rendere unica e utile una pagina per comune
(T6b) e la pagina «Zone servite» (T5a/T5b). Ogni fatto porta fonte, URL, data di riferimento e
licenza. Nessun numero stimato.

## Cosa sappiamo già (prova pratica del 14/09)

Rapporto: `~/knowledge/seo/ricerche-2026-09-14/w2-3-opendata.md`; script Python di prova:
`~/knowledge/seo/ricerche-2026-09-14/w2-3-opendata/{fatti_locali.py,parse_dpr412.py,scarica_fonti.sh}`.
Sintesi in `docs/ricerca-traffico-2026-09.md` §6.3.

- ISTAT Censimento 2011: edifici residenziali per epoca di costruzione, comunale (bulk ZIP).
  **Il Censimento permanente 2021 non pubblica l'epoca a livello comunale**: si cita il 2011
  con l'anno.
- ISTAT SDMX: popolazione al 1° gennaio (live, a volte in timeout: va messo in cache).
- ISTAT Censimento permanente 2021: famiglie per titolo di godimento (comunale).
- ISTAT ASIA 2011: unità locali e addetti nelle costruzioni (comunale).
- DPR 412/93 allegato A: zona climatica e gradi giorno, **nessun dataset nazionale**: parser
  della Gazzetta Ufficiale (tre frammenti, zeri OCR resi come «O», 8.088 comuni).
- Protezione Civile: classificazione sismica maggio 2025, CC BY 4.0 con dicitura obbligatoria.
- OMI Agenzia Entrate: **scartato** (licenza non aperta, repo fermo al 2018).
- Coordinate di terze parti sbagliate (Vicenza 15 km fuori posto): servono centroidi affidabili.
- Valori attesi per i 5 comuni di prova (Cologno Monzese, San Severo, Sandrigo, Monza, Treviso)
  nella tabella di §6.3 della ricerca: il nuovo codice deve riprodurli identici.

## Contesto da leggere

- i tre file sopra (rapporto e script) e §6.3 della ricerca
- `site-intake/data-src/comuni.json` e `site-intake/scripts/build-comuni.mjs` (codici ISTAT già
  nel repo)
- `site-renderer/package.json` e `site-factory-editor/package.json` (dipendenze disponibili:
  nessuna dipendenza nuova senza motivo forte)
- un banco esistente come modello, es. `site-factory-editor/scripts/test-portafoglio.ts`

Non leggere: editor UI, n8n, skill.

## Cosa deve esistere a fine T6a

1. Script di aggiornamento riproducibile in TypeScript eseguibile con
   `node --experimental-strip-types` (niente Python nella pipeline), che scarica le fonti in una
   cache locale fuori da git, le verifica (checksum, righe attese, comuni coperti) e produce il
   dataset. Il piano decide dove vive (renderer o editor) motivando chi lo usa.
2. Dataset `comuni-fatti.json` (o formato più compatto se motivato) indicizzato per codice ISTAT,
   con per ogni fatto: valore, unità, anno di riferimento, fonte, URL, licenza, dicitura di
   attribuzione. Gestione di comuni soppressi o fusi dopo il 2011 (variazioni amministrative
   ISTAT): mai attribuire un dato di un comune fuso a quello nuovo senza regola dichiarata.
3. Centroidi dei comuni da fonte affidabile e licenza chiara (il piano sceglie: ISTAT basi
   territoriali, OpenStreetMap o altro), con controllo di plausibilità; distanza e tempo dalla
   sede: il piano valuta OSRM (risorse del VPS) contro distanza in linea d'aria dichiarata come
   tale, e sceglie.
4. Modulo di lettura (funzioni pure) `fattiComune(codiceIstat)` e frasi-fatto con citazione,
   usabile dalla build e dalla pipeline; nessuna frase generata: solo valori e attribuzioni.
5. Documenti: piano chiuso, stato in README §7, sezione in `docs/DEBUG.md` o nel README dello
   script su come aggiornare il dataset una volta l'anno.

## Uscita verificabile

- I 5 comuni di prova riprodotti identici ai valori della ricerca.
- Copertura dichiarata per fonte (quanti comuni hanno ogni fatto) e nessun valore fuori range.
- Banco senza rete su dati registrati (parser DPR 412 con gli zeri OCR, comuni fusi, comune
  inesistente, fonte mancante).
- Dimensione del dataset ragionevole per git (motivare la scelta) e build non rallentate.

## Calibrazione (fase 3)

Normalizzazione OCR del DPR 412, regole sui comuni fusi, soglie di plausibilità dei centroidi,
scelta OSRM o linea d'aria.
