# Brief T2b — Sensori sul VPS e pannello «Visibilità su Google» del servizio Sito

Leggi prima `docs/traffico/README.md` (§1-§8) e `docs/traffico/decisioni-piani.md`. Dipende da **T2a**
(`docs/traffico/piano-T2a.md`: proprietà `sc-domain:` verificata col service account di scrittura, service account di
lettura del VPS tra i proprietari, `steps.build.motori`, `traffico/registro.ndjson`, `traffico/psi.json`, chiavi
`GOOGLE_SERVICE_ACCOUNT` e `GOOGLE_API_KEY`), da **T1a** (sitemap per cliente) e, per la sola regola delle 8 settimane, da
**T4** (`mappa-query.json`, `mappa-storico.ndjson`).

## Obiettivo

Per ogni cliente con servizio Sito **attivo** e proprietà Search Console verificata, il VPS raccoglie da solo, anche col
Mac spento, i dati di visibilità che Google non conserva o che servono al report senza il Mac: totali giornalieri di
impression, clic e posizione (Search Console) e stato di indicizzazione di ogni pagina della sitemap (URL Inspection).
L'editor li mostra nell'area Traffico insieme al dettaglio per ricerca e per pagina letto su richiesta da Search Console,
alla regola delle 8 settimane per le ricerche su cui puntare, ai Core Web Vitals reali (CrUX) quando esistono e alla misura
PageSpeed dell'ultima pubblicazione. Ogni numero porta fonte e data («dati fino al gg/mm»); a fonte giù nessun numero;
stati ok / non configurata / non raggiungibile; un sito nuovo ha stati vuoti onesti.

## Decisioni che lo riguardano

- README §1.7 (esecuzione ibrida: sensori quotidiani su n8n), §1.10 (risultati nel report mensile: T8 legge ciò che T2b
  raccoglie), §1.11 (disattivazione: si ferma il ciclo, ciò che è online resta), §3 «Sensori sul VPS» e «Chiavi».
- `decisioni-piani.md` T2a.1 (service account di lettura del VPS proprietario da subito), T2a.2 (prove dal vivo su
  `zz-test-*.consulbuild.com`, mai su un dominio cliente), T2a.5 (servizio sospeso: nessuna chiamata di ciclo).
- Dashboard clienti: mai «0» a fonte giù, cache e stato per fonte (`lib/portafoglio.ts` `fonte()`, `lib/cache.ts`).
- `ricerca-scheda-google-2026-09.md` §8.4: credenziali Google solo in n8n per i sensori, dead-man a 36 h, errori per
  transizione.
- DESIGN-BRIEF «Area Traffico» (niente numeri-eroe, badge con la parola, motivo scritto, nessuna scrittura di
  `client.json` all'apertura) e l'anti-obiettivo di T4 (niente posizioni stimate, niente percentuali, niente grafici).

## Contesto già stabilito (non rifarlo)

- Quote e metodi: `~/knowledge/seo/ricerche-2026-09-14/w2-5-verifiche-tecniche.md` §5 e §7 (Search Analytics 1.200 QPM
  per sito; URL Inspection 2.000 al giorno e 600 al minuto per proprietà; CrUX 150 al minuto per progetto).
- `docs/ricerca-traffico-2026-09.md` §3 (cold start; una query si esaurisce in 4-8 settimane) e §6.4 (tabella query ·
  impression · clic · posizione · pagina; regola delle 8 settimane).
- Pattern n8n: `infra/n8n/report-rinnovo.json` (Data table con filtri, HTTP `fullResponse` + `neverError`, `executeOnce`,
  `alwaysOutputData`, `errorWorkflow` = `sf-errori`), `infra/n8n/registra-cliente.json` (webhook con header
  `X-Site-Factory-Key`), `scripts/n8n-import.ts`.

## Uscita verificabile

- Banco `scripts/test-visibilita.ts` senza rete: regole pure dell'editor, **codice dei nodi Code dei workflow estratto dai
  JSON versionati** ed eseguito con risposte registrate sulla forma documentata, letture con `fetch` finto, nessun
  segreto nei messaggi.
- Workflow versionati in `infra/n8n/` e importati sull'istanza solo nella prova dal vivo; `sf-registra-cliente` modificato
  senza cambiare il comportamento per chi non ha il servizio.
- Pannello nel dettaglio Traffico provato nel browser con risposte registrate in tutti gli stati, nei due temi a 1280 e
  400 px, `/impeccable critique` e `impeccable detect`.
- `npx tsc --noEmit`, `npm run build` e i banchi esistenti verdi. Nessun deploy su domini di clienti.
- Prova dal vivo scritta passo per passo, da eseguire quando Mattia crea il service account di lettura e la credenziale
  n8n.

## Calibrazione (fase 3)

Frequenza e tetto delle ispezioni, soglia del dead-man, comportamento reale di `metadata.first_incomplete_date` su una
proprietà senza dati, lunghezza massima del filtro regex di Search Console, spazio reale occupato dalle Data table.
