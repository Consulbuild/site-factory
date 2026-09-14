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
- Dopo ogni workflow l'orchestratore rilancia `npx tsc --noEmit` e i banchi, controlla i file
  toccati (`git show --stat`) e committa i documenti in sospeso.
- Regole dure per gli agenti: mai `git stash`/`checkout -- file`/`reset`/`restore`; mai deploy su
  domini di clienti; mai import n8n che mandano e-mail senza prova a secco; nessun limite ai tentativi
  di rete superato (niente loop).

## Stato al momento del salvataggio

| Id | Stato |
|---|---|
| T0, R1, T1a (+ integrazione) | chiusi e verificati |
| T6a | chiuso incompleto (ISTAT esploradati giù); **giro «T6a-completamento» in corso** (workflow `wf_ba69c864-398`): edifici 2011 dal file censuario per sezione (M1 già committato `04d6203`), famiglie 2021 cercate con limite fisso |
| T1b, T3, T4, T5a, T2a, T2b, G1 | piano scritto e decisioni registrate, da sviluppare |
| T5b, T5c, T6b, T7a, T7b, T8, G2, G3 | da pianificare (fase 1) |
| S0 | lavoro manuale di Mattia (README §8) |

## Ordine di sviluppo deciso

1. T6a-completamento (in corso)
2. **T1b** pagine leggere (prima di T5a: le pagine interne usano `Foto.astro`)
3. **T3** mini-form (solo dati mancanti, stesso design del form lead; usa i codici ISTAT 2026 di T6a)
4. **T4** mappa query (solo DataForSEO; esclusione reversibile «Riammetti»)
5. **T5a** multipagina renderer (criterio di sicurezza: HTML uguale a meno degli hash, CSS solo
   additivo, VRT esistenti identici; include `testoIndicizzabile` senza header/nav/footer)
6. **T2a** motori al deploy (secondo token Cloudflare solo DNS)
7. **T2b** sensori VPS e pannello
8. poi fase 1 e sviluppo di T5b → T5c → T6b → T7a → T7b → T8, e G1 → G2 → G3

## Punti aperti da ricordare

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
