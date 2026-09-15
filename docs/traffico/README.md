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
   Mattia; le chiavi le inserisce lui). Il developer token non serve più: DataForSEO dà gli stessi volumi di
   Google Ads senza approvazione (decisione T4 punto 1, `piano-T4.md` §2.2).
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
- `dist` di Cavaliere pesa 9,8 MB (JPG 350-610 KB senza srcset). Il «~1 MB di font» è il peso su disco dei font di
  tutti i preset: una pagina scarica solo i file latin del suo preset (34-180 KB). Col servizio Sito le foto passano
  dalle varianti di T1b (`Foto.astro`, `scripts/media-varianti.ts`).
- Cavaliere non ha comuni precisi (`zona.area_intervento` in prosa); `site-intake/data-src/
  comuni.json` ha i codici ISTAT.

## 3. Architettura comune

- **Stato dei servizi** in `client.json` → `traffico: { sito, scheda }`, ciascuno
  `{ stato: "spento"|"attivo"|"sospeso", attivatoAt?, sospesoAt? }`. File senza campo = spento.
  Attivazione rifiutata in percorso demo (409, come il dominio).
- **Renderer**: fondamenta SEO e pagine extra si accendono con un'env di build derivata dallo
  stato del servizio Sito (`attivo` o `sospeso`). A servizio spento l'HTML è identico a oggi.
- **Artifact separati** (mai dentro `contesto.json`, per non rendere stale la pipeline):
  `out/<slug>/traffico/` → `zone-servite.json` (T3: zone del form lead tradotte, scritto solo
  quando l'operatore salva; senza file vale la proposta dal lead), `mappa-query.json`, `pagine-copy.json`,
  `scheda-consigliata.json`, `slug-registro.json`, `registro.ndjson` (una riga per pubblicazione:
  chi, cosa, prima/dopo), `volano.ndjson`, `baseline-*.json`. Dati condivisi:
  `site-renderer/data/comuni-fatti.json`. Niente mini-form (decisione T3 punto 13).
- **Zone servite** (T3): i piani a valle le leggono solo da `site-factory-editor/lib/zone-servite.ts`
  (`leggiZoneServite` → `zoneUsabili` → `comuniServiti` / `areeServite` / `etichettaArea` /
  `regioneDiSigla`), mai il JSON a mano; se `zoneUsabili` non è ok si fermano col suo motivo.
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
- Mai `git add -A`; mai `git stash`, `git checkout -- <file>` o `git reset` (altre sessioni e agenti
  lavorano sullo stesso working tree); mai modificare file via shell; niente refactoring non
  richiesti.
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
| T0 | Area Traffico: forma e scheletro | pagina portafoglio + dettaglio Sito/Scheda, stati spento/attivo/sospeso, chiavi con prova | fatto (2026-09-14) | `fb2ade6`, `a6e10b9`, `ff95365`, `4d859cc`, `e307917` + chiusura documenti |
| T1a | Fondamenta SEO | sitemap, robots per cliente, JSON-LD reale, title/H1/description per pagina, chiave IndexNow, interlock deploy | fatto (2026-09-14), con l'integrazione: catena e scheda Build rifanno la build quando le fondamenta non sono quelle attese, avvisi nel blocco Pubblicazione, dialog Attiva Sito aggiornato; integrazione collaudata e chiusa (piano § Integrazione; aperto: il dettaglio Traffico dice ancora che le fondamenta non sono disponibili) | `78ddf16`, `29ea851`, `bd1578d`, `93ad659`, `e44fb95`, `10692a0` + chiusura documenti; integrazione `90adaca`, `0376844`, `4e9f327` + documenti `a103da2` e chiusura |
| T5a | Contratto multipagina e renderer | `pages` additivo, pagine servizio/zone/lavori, navbar/footer, 404, breadcrumb | da fare | — |
| T3 | Zone servite dal form lead | zone del form lead tradotte col dataset T6a in comuni, dintorni, province e regioni → `traffico/zone-servite.json`, card nel dettaglio Traffico | fatto (2026-09-15), collaudato e chiuso (piano § Verifica): nessun mini-form, nessuna conferma obbligatoria (proposta tradotta per intero già usabile), Tally «da impostare», raggio «dintorni» 20 km. Aperti per Mattia: testi della card, raggio 15 km per le sedi dense, `province.json` del form pre-riordino sardo | `aaa89d1`, `f2b3c9f`, `f8d84e6`, `c636daf`, `4050039`, `84993b2`; revisione `0e7b6c9`, `c175482` + chiusura documenti |
| K1 | Chiavi API per gruppi | Impostazioni → Chiavi API in tre gruppi (siti, VPS, traffico) e le 6 chiavi del Traffico con prova gratuita | fatto (2026-09-15), collaudato e chiuso (piano § Verifica): `lib/chiavi-traffico.ts` (normalizzazione del service account, `firmaJwt`, `SCOPE_GOOGLE`, prove con messaggi italiani senza valore), rilettura e ripristino al salvataggio (`salvaSegreti`), coppia DataForSEO nello stesso form, route solo da localhost; banco 121/0, E2E con credenziali finte e Keychain invariato. Aperti per Mattia con le chiavi vere: tempo della prova PageSpeed, Cloudflare con token senza Zone: Read | `7fc53e6`, `db279df`, `ecd1da3`; revisione `6fd91fe`, `4c8b10c` + chiusura documenti |
| T6a | Fatti comunali | `comuni-fatti.json` con fonte/licenza, offline in build | fatto (2026-09-14), collaudato e chiuso (piano § Verifica) con **dataset dichiarato incompleto**; completamento della sera (fasi 2-3, piano § Completamento): **edifici 2011 presenti** dal file per sezioni di censimento di `www.istat.it` (5 comuni e totali nazionali identici), **mancano solo le famiglie 2021** (`esploradati.istat.it` irraggiungibile, nessuna copia ufficiale altrove; comando per completarle nei punti aperti del piano). Completamento collaudato e chiuso (piano § Verifica, Collaudo finale del completamento): banco 141/0/5 anche senza rete, edifici ricalcolati in modo indipendente identici per 7.830 comuni | `14f2fe3`, `8561389`, `1f66586`, `c22a76e`, `866e6f6`, `4997dad` + chiusura documenti; completamento `04d6203`, `a87bd75`, revisione `42edae0`, `ed8041c` + chiusura documenti |
| T4 | Mappa query → pagine | universo query, volumi e SERP (DataForSEO), 8-20 query target | fatto (2026-09-15), collaudato e chiuso (piano § Verifica, «Collaudo finale»: banco 165/0, E2E deterministico su risposte registrate, browser 1280/400 chiaro e scuro), **da calibrare con chiave**: `lib/mappa-query.ts` (universo nei 40 comuni delle zone servite, punteggio, selezione, pagine), `lib/serp-classifica.ts`, `lib/dataforseo.ts` (solo Live e mobile, cache, costo per chiamata), lavoro `traffico:<slug>:mappa` sul run-bus (`kind: "traffico"`), «Ricerche su cui puntare» nella card Sito con Escludi/Riammetti, campione delle 384 pagine e giudizio cieco pronti; banco 151/0, E2E e browser su risposte registrate. Nessun client Google Ads (decisione T4-1). Aperti: chiavi inserite ma saldo DataForSEO 1,00 $ (15/09): protocollo a pagamento (≈ 2,46 $, piano § Calibrazione) dopo la ricarica; zone di Cavaliere impostate ma **senza sede** (lead Tally, la card T3 non ha il campo): senza sede la mappa sceglie comuni solo per popolazione in tutta la Lombardia e nulla per la home, da risolvere in T3 prima della sua mappa; peso dei comuni per le aree regionali (C8); focus non trattenuto in `confirm-dialog.tsx`; guard del DELETE sul lavoro della mappa | `ddcede0`, `16c0984`, `532f5ed`, `66e6482`, `d14714e`; revisione `9e25c60`, `a7126a6` + documenti `af04d29`, `4068be0` e chiusura |
| T5b | Copy delle pagine | job `traffico:` sul run-bus, skill e critico estesi, gate di similarità | da fare | — |
| T5c | Integrazione pagine | pagine nella build, registro slug, `_redirects`, link interni | da fare | — |
| T2a | Motori al deploy | Site Verification, Sitemaps, Bing, IndexNow, registro modifiche | da fare | — |
| T2b | Sensori VPS e pannello Sito | workflow n8n, lettura GSC, pannello con stato fonti | da fare | — |
| T6b | Pagine-comune | proposte gated a un clic | da fare | — |
| T7a | Volano: segnali e proposte | regole pure → segnali → proposte approvate | da fare | — |
| T7b | Volano automatico e rollback | correzioni automatiche con guardrail, effetti, rollback | da fare | — |
| T8 | Report «Come ti trovano» | sezione nel report mensile | da fare | — |
| T1b | Pagine leggere | immagini responsive, EXIF, font, budget come gate | fatto (2026-09-15) col servizio Sito attivo o sospeso: varianti AVIF q90 + JPEG (originale in cima alla scala) con la regola dello zoom di Mattia (candidato ≥ 2 × resa × DPR), logo PNG senza perdita, favicon 148 → 6 KB, og:image 1200×630, font precaricati sulle sottopagine (CLS 0,19 → 0), budget per pagina come avviso «Pagine leggere:»; a servizio spento HTML identico. Home della fixture 3,5 → 2,3 MB ma Lighthouse mobile resta 75 (hero da mobile a 1920 px): punto aperto nel piano. Revisione e collaudo finale chiusi (piano § Verifica, «Collaudo finale dopo la revisione»): suite, identità 12/12 ed E1-E7 dall'editor verdi; da profilo Google 1,6 Mbps il `load` della home passa da 11,2 a 7,8 s | `8bbfe85`, `86a5c6f`, `1974f91`, `6c19c3f`; revisione `e40e87c` + collaudo finale |
| T1c | Telefono veloce | PageSpeed mobile ≥ 90 col servizio Sito: niente zoom 2× sotto 768 px, serie AVIF da telefono, ritaglio della hero, marchio da telefono | sviluppato e calibrato (2026-09-15): `sizes` onesti fino a 767 px (da 768 px stessi file di T1b), serie AVIF q70, ritaglio centrale 430/544 q62 (`sizes` 590px, un file da 157 KB), PNG del marchio da 143 px, avviso «foto LCP da telefono» oltre 250 KB, soglie del budget 1.500/1.250 KB; servizio spento identico (12/12, CSS invariato). Lighthouse locale: Cavaliere 75 → 94 (LCP 9,75 → 3,08 s), 6 preset su 7 ≥ 91, canon 88 per i font (scelta per Mattia). Build di Cavaliere pronta «da verificare»: **conferma, deploy e PageSpeed dal vivo in attesa dell'ok diretto di Mattia** | `5daed74`, `18f7fbd`, `1eb6fe7` + documenti |
| R1 | Ricerca scheda Google | rapporto con fonti primarie e schema della scheda consigliata | fatto (2026-09-14): `docs/traffico/ricerca-scheda-google-2026-09.md` | `56732cc` |
| G1 | Scheda consigliata | dati competitor + keyword → `scheda-consigliata.json` | da fare | — |
| G2 | Checklist e allineamento | copia-incolla con «fatto», confronto scheda pubblica ↔ sito, kit presenza | da fare | — |
| G3 | Monitor scheda | dati pubblici periodici, geogrid, sezione nel report | da fare | — |

## 8. Lavoro manuale di Mattia (non automatizzabile)

Guida passo passo con ordine, costi e test mirati: `docs/traffico/guida-accessi.html`
(pubblicata su https://claude.ai/code/artifact/e07e6e6a-6f22-45a6-8dff-17291f3a6bbd). Le chiavi si incollano in
Impostazioni, divise in gruppi dal piano K1.

- Google Cloud (servizio Sito): progetto, abilitazione Search Console API, Site Verification
  API, PageSpeed Insights API, CrUX API; due service account (scrittura dal Mac, lettura dal
  VPS) con chiave JSON.
- Google Cloud (servizio Scheda, da `ricerca-scheda-google-2026-09.md` §8): i service account
  **non** gestiscono schede Google Business. Servono un progetto dell'organizzazione
  consulbuild.com, un'app OAuth «Internal» con scope `business.manage`, un utente
  @consulbuild.com con 2FA aggiunto come Gestore alle schede dei clienti, e la domanda di accesso
  alle Business Profile API (quota 0 finché Google non approva). Un solo refresh token, su n8n.
- Bing Webmaster Tools: account e API key.
- Cloudflare: un token nuovo solo DNS (Zone: Read + DNS: Edit su tutte le zone dell'account ConsulBuild), distinto da
  quello del deploy (`CLOUDFLARE_DNS_API_TOKEN`, piano K1).
- DataForSEO: account, ricarica 50 $, login e password API.
- Search Console e Bing: verifica manuale di cavalierebuild.it per la baseline (S0).
- Inserire le chiavi in Impostazioni → Chiavi API e le credenziali in n8n.
- Consenso di Cavaliere prima di cambiare il suo sito online.

## 9. Rischi da tenere d'occhio

Rumore statistico (30-150 clic/mese: il volano deve saper dire «dati insufficienti»); contenuto
simile tra clienti dello stesso mestiere; sospensione della scheda Google per modifiche in blocco;
quota Max condivisa con la catena demo; tempi esterni (token Ads, Business Profile API, risposta
al mini-form); pilota unico senza gruppo di controllo.
