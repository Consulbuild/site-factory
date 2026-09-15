# Brief G1 — Scheda Google consigliata

Leggi prima `docs/traffico/README.md` (§1-§5) e `docs/traffico/decisioni-piani.md`. Ricerca a
monte, vincolante: `docs/traffico/ricerca-scheda-google-2026-09.md` (leggi §0, §1, §2, §3, §4,
§5, §6.1, §8.2, §9, §10 «G1», §11.1; il resto solo se serve). Dipende da **T0** (servizio
`scheda` in `client.json.traffico`, area Traffico) e usa i contratti di **T3**
(`lib/zone-servite.ts`: zone servite dal form lead tradotte in comuni, province e regioni, lette
con `leggiZoneServite` + `zoneUsabili`), **T4** (`docs/traffico/piano-T4.md`: `lib/dataforseo.ts`,
lavoro `kind: "traffico"` sul run-bus, mappa query con volumi per comune, cache e costi) e **K1**
(chiavi DataForSEO già in Impostazioni: nessuna chiave nuova). Riallineato il 15/09 alle decisioni
T3 12-14 e K1: niente mini-form, niente `dati.json` né `foto.json`, niente prezzi né attestati.

## Obiettivo

Per un cliente con servizio **Scheda Google** attivo, il software raccoglie in automatico i dati
e produce una **scheda consigliata** completa, spiegata e ripetibile: categoria primaria e
secondarie scelte dai competitor reali della zona e dai servizi veri del cliente, **area servita
dalle zone del form lead**, servizi, descrizione, orari, foto, link con UTM verso il sito. Ogni voce ha la sua
fonte. **Mattia la inserisce a mano** nella scheda del cliente (decisione 1): G1 produce e mostra
la scheda consigliata; checklist, «fatto» e confronto con la scheda pubblica sono G2, il
monitoraggio è G3.

## Decisioni che riguardano G1

- Nessuna scrittura sulla scheda via API; nessuna creazione di schede; nessuna foto AI; nessuna
  keyword nel nome dell'attività (motivo di sospensione, ricerca §2).
- Niente invenzioni: ogni servizio, attributo, orario, frase della descrizione è tracciabile a
  `contesto.json`, al form lead importato (zone servite, orari quando il form li avrà) o a una
  fonte pubblica registrata.
- Senza accesso alle Business Profile API (quota 0 finché Google non approva) si lavora con i
  dati pubblici (ricerca §8.2); senza chiave DataForSEO tutto degrada a «non configurata».
- Rispetto della policy di conservazione (ricerca §7.1): i dati letti via API Google hanno scadenza;
  nella scheda consigliata restano solo artefatti nostri (schema §9 della ricerca).
- Ditte individuali: nessuna ricerca DataForSEO col nome (decisioni T3 punto 10, G1 punto 1); le
  schede della zona si leggono (query senza il nome).
- Descrizione scritta via `claude -p` (login Max, mai API Anthropic) con critico e gate
  deterministici (ricerca §5.3); tutto il resto deterministico.

## Contesto da leggere nel codice

- `site-factory-editor/lib/traffico.ts`, `app/traffico/[slug]/page.tsx`, `components/traffico-ui.tsx`
- `site-factory-editor/lib/run-bus.ts`, `lib/run-step.ts` (io.claude, io.script, eventi)
- `site-factory-editor/lib/portafoglio.ts`, `lib/cache.ts`, `lib/secrets.ts`,
  `app/api/setup/keys/route.ts`
- `.claude/skills/copy-critic/SKILL.md` e `.claude/skills/local-service-copywriter/SKILL.md`
  (stile delle skill e dei critici del progetto, per scrivere la skill della descrizione)
- `site-renderer/out/cavaliere-build-srls/{contesto.json,brief.json}` (forma, senza riportare dati
  personali)
- `site-factory-editor/DESIGN-SYSTEM.md`, `DESIGN-BRIEF.md` (sezione area Traffico)

## Cosa deve esistere a fine G1

1. **Raccolta competitor** per le query principali della mappa (T4, altrimenti il lessico) al
   centro del comune della sede: schede della zona dai risultati Maps (DataForSEO) con le loro
   categorie (recensioni, valutazioni e orari dei competitor non entrano nella scheda); cache e
   costo per cliente registrati.
2. **Algoritmo categorie** ripetibile (ricerca §4): frequenza e posizione delle categorie tra i
   competitor, filtrate dai servizi reali del cliente e dal catalogo italiano (nomi e GCID, §4.4),
   con i limiti dichiarati; primaria + secondarie, ciascuna col perché.
3. **Servizi e keyword** (ricerca §5.1): servizi della scheda derivati dai servizi reali e dalle
   ricerche con volume (T4), senza keyword stuffing.
4. **Descrizione ≤ 750 caratteri** (ricerca §5.2-§5.3): lavoro `claude -p` con skill dedicata,
   critico e gate deterministici (lunghezza, URL, numeri di telefono, keyword ripetute, claim non
   tracciabili, promesse vietate del contesto).
5. **Area servita, orari, foto, link**: area servita dalle zone servite di T3 (province e regioni
   intere dove l'etichetta è larga, comuni dove è precisa, massimo 20); orari dal form lead
   importato quando esisterà il campo, altrimenti «da completare»; attributi vuoti in modalità
   pubblica; foto reali di `lavori.json` e logo approvato, scelti e ordinati con motivo (mai AI);
   link alla homepage del sito con UTM (ricerca §6.3: la pagina servizio richiede dati di Search
   Console).
6. **`out/<slug>/traffico/scheda-consigliata.json`** secondo lo schema §9 della ricerca (validato
   con Zod), rigenerabile e deterministico a parità di dati (la descrizione conserva l'ultima
   approvata finché i dati non cambiano).
7. **Lavoro** `traffico:<slug>:scheda` sul run-bus con fasi, log NDJSON, stato, errori leggibili.
8. **UI**: nella sezione Scheda Google dell'area Traffico, la scheda consigliata in lettura,
   organizzata come la scheda Google (campo per campo, con fonte e perché), con copia rapida del
   valore di ogni campo; mini-shape /impeccable coerente con T0. La checklist «fatto» è G2.
9. **Documenti**: piano chiuso, README §7, handoff, `docs/DEBUG.md`, costo per cliente.

## Uscita verificabile

- Con risposte registrate (fixture sulla forma documentata di DataForSEO) la scheda consigliata
  di una fixture tipo Cavaliere è completa, deterministica, con fonte per ogni voce.
- Gate della descrizione: casi che devono fallire (URL, telefono, keyword ripetute, claim senza
  fonte, oltre 750 caratteri) e casi che passano.
- Senza chiavi: «non configurata» leggibile, nessuna eccezione; ditta individuale: nessuna
  richiesta col nome del cliente; zone non usabili: area servita «da completare» col motivo.
- Banco `scripts/test-scheda-consigliata.ts` senza rete; `npx tsc --noEmit`, `npm run build`,
  banchi esistenti verdi.

## Calibrazione (fase 3)

Algoritmo delle categorie confrontato con la scelta esperta su 3 casi (Cavaliere + 2 fixture);
rubrica del critico della descrizione; soglie di frequenza tra competitor. La calibrazione con
dati DataForSEO veri resta un ciclo dichiarato «da eseguire con la chiave».
