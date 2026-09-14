# Area «Traffico» — roadmap viva

Documento guida dello sviluppo della pagina «Traffico» dell'editor e dei due servizi di
ottimizzazione. Ogni piano parte da qui e dal suo brief; a fine piano si aggiorna la tabella
di stato. Ricerca a monte: `docs/ricerca-traffico-2026-09.md`; fonti primarie in
`~/knowledge/seo/`. Approvato da Mattia il 2026-09-14 (piano `zesty-swan`).

## 1. Decisioni di Mattia (vincolanti)

1. Pagina «Traffico» con **due servizi separati**, attivabili per cliente:
   - **Sito**: ottimizzazione del sito per il traffico locale con i metodi della ricerca.
   - **Scheda Google**: quando il cliente dà l'accesso da Manager, il software ricerca e
     raccoglie in automatico i dati migliori (keyword, categorie, servizi, attributi,
     descrizione, parametri di visibilità) e produce una scheda consigliata; **Mattia la
     inserisce a mano**. Il software riduce il tempo di compilazione e allinea scheda e sito.
     Niente creazione di schede al posto del cliente.
2. Studio UX/UI (/impeccable shape + critique) prima di ogni interfaccia.
3. **Tutto attivabile per cliente** con un interruttore nell'editor, comprese le fondamenta
   tecniche (sitemap, robots, dati strutturati, title/H1 per pagina).
4. Volano: correzioni (title, description, link interni, FAQ) pubblicate in automatico se passano
   i gate; **pagine nuove con un clic** di approvazione.
5. Dati extra (comuni precisi, prezzo da, attestati, orari, luogo delle foto, nome d'uso) con un
   **mini-form dopo l'attivazione**. Il form lead resta com'è.
6. Account esterni: Google Cloud, Bing Webmaster, DataForSEO, Google Ads developer token (li crea
   Mattia; le chiavi le inserisce lui).
7. Esecuzione **ibrida**: sensori quotidiani/settimanali sul VPS (n8n); proposte AI (`claude -p`),
   build e deploy dall'editor quando il Mac è acceso, con coda che non perde nulla.
8. Pilota: **Cavaliere Build** (cavalierebuild.it). Nessuna modifica online senza Mattia.
9. Niente raccolta recensioni, niente portfolio consulbuild.com, per ora.
10. Risultati al cliente dentro il **report mensile** esistente (`sf-report-rinnovo`).
11. Disattivazione: pagine e fondamenta già online restano anche nei rebuild; si ferma il ciclo.
12. Ricerca specifica sulla scheda Google prima di pianificarne lo sviluppo.

## 2. Fatti del codice che vincolano tutti i piani

- `site.json` non ha pagine; gli slot sono indirizzati per indice (`slots.json`,
  `site-factory-editor/lib/slots-shared.ts`): il multipagina è **additivo**, la home dei siti
  online non si re-indicizza.
- `site-renderer/public/robots.txt` è statico e condiviso da siti e demo; `workers_dev: true`
  lascia raggiungibile l'host workers.dev (coperto solo dal canonical).
- `StepKey` (`lib/steps.ts`) è un'unione chiusa usata da catena e schema: i lavori traffico
  **non** sono StepKey; vivono sul run-bus con id `traffico:<slug>:<lavoro>` e lasciano intatta la
  catena demo.
- Il deploy (`lib/deploy.ts`) confronta ciò che la build ha cotto con ciò che è atteso
  (`siteUrl`, integrazioni): lo stato traffico entra nello stesso interlock.
- `dist` di Cavaliere pesa 9,8 MB (JPG 350-610 KB senza srcset).
- Cavaliere non ha comuni precisi (`zona.area_intervento` in prosa); `site-intake/data-src/
  comuni.json` ha i codici ISTAT.

## 3. Architettura comune

- **Stato dei servizi** in `client.json` → `traffico: { sito, scheda }`, ciascuno
  `{ stato: "spento"|"attivo"|"sospeso", attivatoAt?, sospesoAt? }`. File senza campo = spento.
  Attivazione rifiutata in percorso demo (409, come il dominio).
- **Renderer**: fondamenta SEO e pagine extra si accendono con un'env di build derivata dallo
  stato del servizio Sito (`attivo` o `sospeso`). A servizio spento l'HTML è identico a oggi.
- **Artifact separati** (mai dentro `contesto.json`, per non rendere stale la pipeline):
  `out/<slug>/traffico/` → `dati.json` (mini-form), `mappa-query.json`, `pagine-copy.json`,
  `scheda-consigliata.json`, `slug-registro.json`, `registro.ndjson` (una riga per pubblicazione:
  chi, cosa, prima/dopo), `volano.ndjson`, `baseline-*.json`. Dati condivisi:
  `site-renderer/data/comuni-fatti.json`.
- **Sensori sul VPS**: n8n raccoglie aggregati e stato indicizzazione in Data Tables; Search
  Console resta l'archivio a 16 mesi letto su richiesta. L'editor legge con `fonte()` e `memo`
  (`lib/portafoglio.ts`, `lib/cache.ts`): stati ok / non configurata / non raggiungibile, mai
  «0» a fonte giù, «dati fino al gg/mm» (ritardo GSC 2-3 giorni).
- **Coda**: segnali idempotenti letti dal Mac all'avvio e ogni ora (timer di
  `instrumentation.ts`), con priorità sotto la catena demo.
- **URL stabili**: slug congelati al primo deploy, rinomina = 301 via `_redirects`; canonical,
  sitemap e URL servito coincidono; `lastmod` da hash del contenuto.
- **Chiavi**: Keychain via `lib/secrets.ts` + prova in `app/api/setup/keys/route.ts`; sul VPS
  come credenziali n8n; mai in git. Senza chiave ogni funzione degrada a «non configurata».
- **Niente invenzioni**: contenuti ancorati a contesto, mini-form, open data con fonte e
  licenza; gate deterministici prima dei critici; EXIF rimosso; gate di similarità anche tra
  clienti dello stesso mestiere.
- **Osservabilità**: righe in `docs/DEBUG.md`; log NDJSON per motori, sensori e volano; costo API
  per cliente registrato.

## 4. Il ciclo di ogni piano

| Fase | Cosa | Uscita |
|---|---|---|
| 1 Piano | brief + file indicati; piano scritto in `docs/traffico/piano-<id>.md` con file da toccare, rischi, verifica; mini-shape /impeccable se c'è UI; `scope.json` | piano rivisto dall'orchestratore contro le decisioni |
| 2 Sviluppo | milestone piccole; commit + push a verifica passata; path espliciti | codice + banchi verdi |
| 3 Ottimizzazione e calibrazione | soglie, prompt, critici, gate tarati su gold set o dati reali | sezione «Calibrazione» nel piano |
| 4 Test | `scripts/test-*.ts` senza rete, `npx tsc --noEmit`, `npm run build`, VRT/axe se renderer, E2E su fixture `zz-test-*` o anteprima di Cavaliere | output in «Verifica» nel piano |
| 5 Debug finale | revisione del diff riga per riga, casi limite, log, fix; file toccati vs piano; `scope.json` svuotato; stato aggiornato qui e in `docs/handoff-fase-c.md` | piano chiuso |

Esecuzione: ogni piano è affidato a un agente con contesto pulito (equivalente alla chat nuova)
che riceve solo il suo brief. L'orchestratore rivede il piano prima dello sviluppo e rilancia
personalmente le verifiche prima del commit finale.

## 5. Regole operative per chi esegue un piano

- All'avvio: `git log --oneline -5`, `git status --short`; se `.claude/scope.json` ha un perimetro
  di un'altra sessione, fermarsi e segnalarlo.
- Mai deploy su domini di clienti, mai import in n8n di workflow che mandano e-mail reali senza
  prova a secco (`dryRun`) e senza che il comportamento per i clienti non attivi resti identico.
- Mai `git add -A`; mai modificare file via shell; niente refactoring non richiesti.
- Prima di scrivere codice nell'editor: leggere le guide in `site-factory-editor/node_modules/
  next/dist/docs/` per le API usate (Next 16 ha breaking changes).
- Ogni funzione che dipende da una chiave esterna ha un banco senza rete con risposte registrate
  e degrada a «non configurata».
- Chiusura: aggiornare la tabella §7, `docs/handoff-fase-c.md`, `docs/DEBUG.md` se nascono log.

## 6. Ordine e dipendenze

```
T0 ─ T1a ─ T5a ─┬─ T5b ─ T5c ─ T6b ─ T7a ─ T7b
T3 ─ T4 ────────┘                  │
T6a ───────────────────────────────┘
T2a ─ T2b ─ T8          T1b (dopo T1a)          R1 ─ G1 ─ G2 ─ G3
```

Mai in parallelo i piani che toccano `lib/build.ts` o `lib/deploy.ts`. Attese di calendario sul
pilota: Cavaliere cambia online solo dopo 28 giorni di baseline e con l'ok di Mattia; il volano
si calibra con 4-8 settimane di dati Search Console.

## 7. Stato dei piani

| Id | Piano | Obiettivo in una riga | Stato | Commit |
|---|---|---|---|---|
| S0 | Baseline e richieste esterne | account (Mattia), GSC/Bing verificati su cavalierebuild.it, baseline congelata | da fare (Mattia) | — |
| T0 | Area Traffico: forma e scheletro | pagina portafoglio + dettaglio Sito/Scheda, stati spento/attivo/sospeso, chiavi con prova | fasi 2-3 fatte, fasi 4-5 all'orchestratore | `fb2ade6`, `a6e10b9` |
| T1a | Fondamenta SEO | sitemap, robots per cliente, JSON-LD reale, title/H1/description per pagina, chiave IndexNow, interlock deploy | da fare | — |
| T5a | Contratto multipagina e renderer | `pages` additivo, pagine servizio/zone/lavori, navbar/footer, 404, breadcrumb | da fare | — |
| T3 | Mini-form «Dati per farti trovare» | link firmato → form → `traffico/dati.json` | da fare | — |
| T6a | Fatti comunali | `comuni-fatti.json` con fonte/licenza, offline in build | da fare | — |
| T4 | Mappa query → pagine | universo query, volumi e SERP (DataForSEO/Ads), 8-20 query target | da fare | — |
| T5b | Copy delle pagine | job `traffico:` sul run-bus, skill e critico estesi, gate di similarità | da fare | — |
| T5c | Integrazione pagine | pagine nella build, registro slug, `_redirects`, link interni | da fare | — |
| T2a | Motori al deploy | Site Verification, Sitemaps, Bing, IndexNow, registro modifiche | da fare | — |
| T2b | Sensori VPS e pannello Sito | workflow n8n, lettura GSC, pannello con stato fonti | da fare | — |
| T6b | Pagine-comune | proposte gated a un clic | da fare | — |
| T7a | Volano: segnali e proposte | regole pure → segnali → proposte approvate | da fare | — |
| T7b | Volano automatico e rollback | correzioni automatiche con guardrail, effetti, rollback | da fare | — |
| T8 | Report «Come ti trovano» | sezione nel report mensile | da fare | — |
| T1b | Pagine leggere | immagini responsive, EXIF, font, budget come gate | da fare | — |
| R1 | Ricerca scheda Google | rapporto con fonti primarie e schema della scheda consigliata | da fare | — |
| G1 | Scheda consigliata | dati competitor + keyword → `scheda-consigliata.json` | da fare | — |
| G2 | Checklist e allineamento | copia-incolla con «fatto», confronto scheda pubblica ↔ sito, kit presenza | da fare | — |
| G3 | Monitor scheda | dati pubblici periodici, geogrid, sezione nel report | da fare | — |

## 8. Lavoro manuale di Mattia (non automatizzabile)

- Google Cloud: progetto, abilitazione Search Console API, Site Verification API, PageSpeed
  Insights API, CrUX API; due service account (scrittura dal Mac, lettura dal VPS) con chiave
  JSON; domanda di accesso alla Business Profile API.
- Bing Webmaster Tools: account e API key.
- DataForSEO: account, ricarica 50 $, login e password API.
- Google Ads: account senza campagne, developer token (Basic access).
- Search Console e Bing: verifica manuale di cavalierebuild.it per la baseline (S0).
- Account Google dedicato con 2FA per l'accesso Manager alle schede dei clienti.
- Inserire le chiavi in Impostazioni → Chiavi API e le credenziali in n8n.
- Consenso di Cavaliere prima di cambiare il suo sito online.

## 9. Rischi da tenere d'occhio

Rumore statistico (30-150 clic/mese: il volano deve saper dire «dati insufficienti»); contenuto
simile tra clienti dello stesso mestiere; sospensione della scheda Google per modifiche in blocco;
quota Max condivisa con la catena demo; tempi esterni (token Ads, Business Profile API, risposta
al mini-form); pilota unico senza gruppo di controllo.
