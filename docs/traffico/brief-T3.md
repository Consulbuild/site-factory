# Brief T3 — Zone servite dal form lead

Leggi prima `docs/traffico/README.md` (§3-§5) e `docs/traffico/decisioni-piani.md` («Priorità assoluta», T3 punti 12-13:
valgono sopra tutto). Piano: `docs/traffico/piano-T3.md`. La versione precedente (mini-form) è superata:
`git show 550126f:docs/traffico/piano-T3.md`, solo per i fatti verificati sul codice.

## Obiettivo

Più traffico dall'Italia e dalle zone dove il cliente accetta davvero lavori. Le zone il cliente le ha già scelte nel form
lead: T3 le **traduce in modo deterministico** in comuni, province e regioni col dataset T6a, le **salva per cliente** in un
artifact letto da T4, G1, T5a, T2b/T8 e le fa **vedere, confermare e correggere** all'operatore nel dettaglio
`/traffico/[slug]` dell'editor.

## Decisioni che riguardano T3

- **Niente mini-form** (punto 13): nessun link, nessun workflow n8n, nessuna modifica a `site-intake/`, nessun campo orari
  (gli orari entrano nel form lead: li integra Mattia in un'altra chat), nessuna domanda al cliente.
- Traduzione (punto 12): «Nome (SIGLA)» e la sede → quel comune; «X e dintorni» → X più i comuni entro un raggio in linea
  d'aria (valore iniziale 20 km, da calibrare); «X e provincia», «Provincia di X» → la provincia; «Tutta la regione X» → la
  regione; «X e regioni vicine» → la regione più le confinanti di `CONFINI` (`site-intake/src/data/regioni.ts`); «Tutta Italia»
  → Italia. Brief Tally in prosa (Cavaliere, La Cecilia): solo nomi esatti di regioni, province e comuni del dataset; se nulla
  è riconosciuto, «Zone da impostare». Mai un'estrazione AI.
- Codici ISTAT 2026 dal dataset T6a (`site-renderer/data/comuni-fatti.json`, alias per fusioni e riordino sardo), non da
  `site-intake/data-src/comuni.json`.
- L'artifact conserva le etichette originali del lead e le aree tradotte con codici e `provenienza: lead | operatore`.
- Consumatori: T4 (comuni dell'area pesati per popolazione e distanza dalla sede), G1 (area servita: province e regioni intere
  dove l'etichetta è larga, comuni dove è precisa, massimo 20), T5a (pagina «Zone servite» e `areaServed`), T2b/T8 (quota di
  visite dalle zone).

## Contesto da leggere

- `site-factory-editor/lib/inbox-form.ts` (dove l'import salva `raw-submission.json` e `brief.json`), i 3 clienti in
  `site-renderer/out/` (senza copiare dati personali), `site-intake/src/components/zone.ts`, `site-intake/src/lib/comuni.ts`
  (`cercaZone`), `site-intake/src/data/regioni.ts`, `site-intake/public/data/province.json`
- `site-renderer/src/lib/fatti-comuni.ts` (lettore T6a: `cercaComune`, `comuniEntroKm`, `normalizzaNome`)
- `site-factory-editor/lib/traffico.ts`, `lib/clients.ts` (scrittura atomica, sintesi pigra), `lib/paths.ts`,
  `app/api/clients/[slug]/traffico/route.ts` (CSRF), `app/traffico/[slug]/page.tsx`, `components/traffico-azione.tsx`,
  `scripts/test-import-form.ts` (copia + banco di parità), `DESIGN-SYSTEM.md`, `DESIGN-BRIEF.md` (Area Traffico)
- Guide Next 16 in `site-factory-editor/node_modules/next/dist/docs/` per route handler, `page` e `useRouter`

Non leggere: renderer oltre al lettore T6a, skill della pipeline, fabbrica, `infra/n8n/`.

## Cosa deve esistere a fine T3

1. `site-factory-editor/lib/zone-servite.ts`: regole di traduzione pure, lettura e scrittura di
   `out/<slug>/traffico/zone-servite.json`, contratto per i consumatori (`leggiZoneServite`, `zoneUsabili`, `comuniServiti`,
   `etichettaArea`, `regioneDiSigla`, `improntaZone`).
2. `POST /api/clients/[slug]/traffico/zone` (anteprima, salva, ricalcola) con CSRF e codici leggibili.
3. Card «Zone servite» nel dettaglio Traffico, sopra Sito e Scheda: stati vuoto, riconosciute, da controllare, da impostare,
   confermate o corrette, lead cambiato, non leggibile; conferma con un clic, modifica inline; entrambi i temi, 400 px.
4. Documenti: piano chiuso, README §3 e §7, `docs/handoff-fase-c.md`, `docs/DEBUG.md`, `DESIGN-BRIEF.md`.

## Uscita verificabile

- Banco `site-factory-editor/scripts/test-zone-servite.ts` senza rete: tutte le etichette, omonimi, comuni fusi e alias,
  province sarde 2026, prosa Tally, input corrotti, parità con `CONFINI` e con il lettore T6a, lettura e scrittura
  dell'artifact; `npx tsc --noEmit` e `npm run build` (editor) verdi.
- E2E su fixture `site-renderer/out/zz-test-t3*` (API e UI); i clienti reali solo aperti, file identici prima e dopo.
- Nessun file fuori perimetro toccato; `contesto.json`, `copy.json` e build non diventano stale.

## Calibrazione (fase 3)

Raggio «dintorni» sulle sedi reali e di prova (comuni e residenti a 10/15/20/30 km), riconoscimento della prosa sui 2
clienti Tally, testi della card.
