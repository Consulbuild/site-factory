# Stato dell'orchestrazione dell'area Traffico (per riprendere dopo una compattazione)

Aggiornato: 2026-09-14 sera. Leggere insieme a `README.md` (§7 stato per piano) e
`decisioni-piani.md` (risposte dell'orchestratore, valgono sopra ai piani).

## Come si lavora

- Un piano per volta in sviluppo (`scope.json` unico, commit sullo stesso working tree).
  I piani scritti (fase 1) si possono preparare in parallelo con agenti in sola lettura.
- Fase 1: un agente legge brief + contesto e scrive `piano-<id>.md`; l'orchestratore risponde ai
  dubbi in `decisioni-piani.md`.
- Fasi 2-5: workflow «piano-traffico» (percorso dello script in fondo), lanciato con il tool
  Workflow e gli argomenti
  `{id, brief, piano, decisioni, verifiche}`: sviluppo → 4 revisori (correttezza, regressioni, UX,
  sicurezza) → scettici (3 per gravità alta/media, 1 per bassa, maggioranza) → correzioni, al
  massimo 2 giri → collaudo con suite completa, chiusura documenti, `scope.json` svuotato.
  Le correzioni fuori perimetro tornano in `fuoriPerimetroDaDecidere`: l'orchestratore le decide
  (finora: giro «T1a-integrazione» e fix a mano da una riga).
- **Controllore (decisione di Mattia 2026-09-15)**: un agente Fable 5.1 a effort medium, con pochi comandi
  in sola lettura, a 4 punti del workflow: fine sviluppo (lavoro dichiarato reale e utile), prima degli
  scettici (scarta segnalazioni allucinate o futili, mai sicurezza, perdita di dati o regressioni), fine
  correzioni (commit reali; decide se serve il secondo giro), fine collaudo (report vs repo). Può fermare il
  workflow («ferma»): decide l'orchestratore. Sviluppo, piani, ricerche, revisioni e test restano su Opus 5.
  Per riprendere una run già oltre un punto: `args.saltaControlli` (es. `["sviluppo","triage1"]`).
- Dopo ogni workflow l'orchestratore rilancia `npx tsc --noEmit` e i banchi, controlla i file
  toccati (`git show --stat`) e committa i documenti in sospeso.
- Regole dure per gli agenti: mai `git stash`/`checkout -- file`/`reset`/`restore`; mai deploy su
  domini di clienti; mai import n8n che mandano e-mail senza prova a secco; nessun limite ai tentativi
  di rete superato (niente loop).

## Stato al momento del salvataggio

| Id | Stato |
|---|---|
| T0, R1, T1a (+ integrazione) | chiusi e verificati |
| T6a | chiuso e verificato dall'orchestratore (banco 141/0/5, build, check): edifici 2011 presenti (`04d6203`…`673bbb3`); mancano solo le famiglie 2021 (esploradati giù, comando in `piano-T6a.md`) |
| T1b | chiuso (`8bbfe85`…`30d049a`); controllore: nessuna allucinazione, secondo giro saltato; Lighthouse mobile home 75 → 75 (LCP 10,9 → 9,8 s, 3,5 → 2,3 MB; sotto 90: vince la qualità, decisione 8), privacy 90 → 99; `dist` ~4,8× su disco |
| T3 | chiuso e verificato dall'orchestratore (`f8d84e6`…`c2a28aa`; tsc, banco zone 110/0 in 16 s, stato 58/0). Costo: 48 agenti (30 scettici), 6,1 M token, 2 h → scettici ridotti (3 solo per gravità alta). Aperto: l'editor legge `site-intake/public/data/province.json` generato e fuori da git (su un checkout pulito errore leggibile «npm run comuni»); si deriva da `data-src/comuni.json` solo se serve un checkout pulito |
| T4, T5a, T2a, T2b, G1 | piano scritto e decisioni registrate (con gli effetti di T3 punto 13), da sviluppare |
| T6b | sospeso: nessuna fonte verificata del luogo dei lavori |
| K1 | chiuso e verificato dall'orchestratore (`7fc53e6`…`aa44ac7`; tsc, banco chiavi 121/0, 9 chiavi reali intatte, 6 campi nuovi pronti). Costo 24 agenti, 3,2 M token. Aperto per Mattia: dev server su tutte le interfacce (`next dev` senza `-H 127.0.0.1`), chip per `btnGhost` disabilitato |
| T4, G1, T5a | piani riallineati al 15/09 e approvati dal controllore (`e73f98b`, `1d530aa`, `145cf2a`; decisioni T4 8-9, G1 11, T5a 8). **T4 in sviluppo** (run `wf_35a2f5e1-4d3`, task `w63yh5e2i`; tetto di spesa 3 $) |
| T5b, T5c, T6b, T7a, T7b, T8, G2, G3 | da pianificare (fase 1) |
| S0 | lavoro manuale di Mattia (README §8) |

## Ordine di sviluppo deciso

1. T6a-completamento (chiuso)
2. **T1b** pagine leggere (in sviluppo) (prima di T5a: le pagine interne usano `Foto.astro`)
Rivisto il 2026-09-15 sulla priorità di Mattia (traffico dall'Italia e dalle zone servite prima di tutto;
`decisioni-piani.md`, sezione «Priorità assoluta»):

3. **T3** «Dati del cliente senza form» (decisione di Mattia del 15/09, T3 punti 12-13): **niente mini-form**;
   zone servite tradotte dal form lead; gli orari entrano nel form lead (integrazione di Mattia in un'altra
   chat); piano da riscrivere (fase 1)
4. **T4** mappa query (solo DataForSEO, solo zone servite; esclusione reversibile «Riammetti»)
5. **G1** scheda Google consigliata (area servita dalle zone di T3)
6. **T5a** multipagina renderer (criterio di sicurezza: HTML uguale a meno degli hash, CSS solo
   additivo, VRT esistenti identici; include `testoIndicizzabile` senza header/nav/footer)
7. **T5b** copy delle pagine (fase 1 da fare)
8. **T2a** motori al deploy (secondo token Cloudflare solo DNS)
9. **T5c** pagine online sul pilota (fase 1 da fare; online su Cavaliere solo col consenso di Mattia)
10. poi T6b → T2b (misura Italia e zone servite) → T7a → T7b → T8 → G2 → G3

## Punti aperti da ricordare

- **Chiavi reali inserite da Mattia (15/09)** e funzionanti. Fotografia di partenza gratuita di Cavaliere in
  `out/cavaliere-build-srls/traffico/baseline-2026-09.json` (script `scratchpad/baseline-cavaliere.ts` e
  `baseline-umami.ts`): PageSpeed mobile 74 (LCP 7,4 s, 3,4 MB), desktop 97; CrUX 404 (poche visite); Bing: sito
  verificato, 0 impressioni; Umami: quasi solo robot da data center USA (decisione T2b 9). **Search Console non
  letta**: il service account `sf-scrittura@site-factory-traffico.iam.gserviceaccount.com` non ha accesso e la verifica
  via TXT sul DNS del cliente è stata bloccata dai permessi di Claude Code → Mattia lo aggiunge come utente «Completa»
  in Search Console, poi si rilancia lo script senza `--verifica`.

- **Misura di riferimento per T1b** (14/09 sera, cavalierebuild.it dal vivo, telefono 390 px DPR 3, cache
  vuota, mediana di 3; script `scratchpad/misura-lcp.mjs`): LCP = foto hero; rete del Mac 0,2 s · mobile
  buona 20 Mbps/50 ms CPU ×4 **1,1 s** · mobile debole 5 Mbps/100 ms **3,8 s** · profilo del test mobile di
  Google 1,6 Mbps/150 ms **11,3 s**; ~2,1 MB scaricati al load. Dopo T1b rifare la stessa misura sulla build
  della fixture e, col consenso di Mattia, sul sito online.

- **Domanda per Mattia (T1b)**: varianti immagini leggere per tutti i siti, demo comprese, o solo col
  servizio Sito attivo? Oggi dietro l'interruttore.
- Famiglie 2021: se il giro T6a-completamento non trova la fonte, il dataset resta `completo:false`
  per quella sola fonte; comando per completarla scritto in `piano-T6a.md`.
- T1a: alcuni avvisi delle fondamenta (P.IVA, telefono, email, sameAs, H1) non nominano scheda e
  campo da correggere → da sistemare dentro T5a (tocca `lib/fondamenta.ts`).
- Chip «Rimuovere EXIF e GPS dalle foto del form lead»: eseguito da Mattia in un'altra sessione
  (commit `d0c473b`, `9b03d56`); T3 riusa `lib/metadati-foto.ts`.
- Script del workflow: usare `scriptPath`
  `/Users/mattia/.claude/projects/-Users-mattia-Claude-Projects-Site-factory/700accc8-ece8-420b-a22c-2db8c846d1ad/workflows/scripts/piano-traffico-wf_ba69c864-398.js`
  (copia di sicurezza nello scratchpad di sessione: `workflow-piano-traffico.js`). Il vecchio
  percorso sotto `-site-factory-editor/` non è più accettato dal tool.
