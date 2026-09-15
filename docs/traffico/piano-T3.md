# Piano T3 — Zone servite dal form lead

Versione precedente (mini-form, **superata** dalle decisioni T3 punti 12-13): `git show 550126f:docs/traffico/piano-T3.md`.
Stato: **chiuso, 2026-09-15** (sezioni «Sviluppo», «Calibrazione» e «Verifica» in fondo). Sopra questo testo valgono
`decisioni-piani.md` («Priorità assoluta», T3 punti 12-14). Fonti: `README.md` §3-§5, `stato-orchestrazione.md`, `brief-T3.md`.

## 1. Contesto

Obiettivo: più traffico dall'Italia **e dalle zone dove il cliente lavora davvero**. Ogni piano a valle (T4 ricerche per zona,
G1 area servita della scheda, T5a pagina «Zone servite» e `areaServed`, T2b/T8 quota di visite dalle zone) ha bisogno delle
stesse zone, precise, con codici ISTAT. Il cliente le ha già scelte nel form lead: T3 le traduce in modo deterministico col
dataset T6a, le mostra all'operatore, che le conferma o le corregge, e le salva in un artifact per cliente. Nessun mini-form,
link, n8n, modifica a `site-intake/`, orari, chiamata AI o API esterna.

Fatti verificati sul codice (15/09):

- **Dove stanno le zone.** `lib/inbox-form.ts` salva il lead intero in `out/<slug>/raw-submission.json` (r. 354):
  `risposte.zone: string[]` (r. 43) e `risposte.sede {comune, provincia (sigla), provinciaNome, regione, daVerificare}` (r. 42).
  `brief.json` ne ha solo una copia con perdita: `area_geografica = zone.join(", ")` (r. 227), `citta`/`provincia`/`regione`
  (r. 219-221). Il re-import sovrascrive `brief.json` e `raw-submission.json` ma non tocca le altre cartelle (r. 357-363):
  `traffico/` sopravvive, quindi serve un'impronta del lead per accorgersi del cambio.
- **Grammatica delle etichette** (`site-intake/src/components/zone.ts` r. 14-19, `lib/comuni.ts` `cercaZone` r. 106-114,
  `data/regioni.ts`): «{comune sede} e dintorni», «{provincia} e provincia» (se il nome della provincia ≠ comune),
  «Provincia di {provincia}», «Tutta la regione {nome breve}», «{nome breve} e regioni vicine» (solo regioni con confini),
  «Tutta Italia», «{Comune} ({SIGLA})». **Testo libero ammesso**: «Aggiungi una zona» accetta qualunque stringa (`pulisci`, max 80).
  Nomi di provincia e regione vengono da `site-intake/public/data/province.json` (107 province, **pre-riordino sardo**: c'è
  `SU` Sud Sardegna, mancano `CI`, `VS`, `OG`, `OT`); i nomi della sede dai file per lettera, stessi 107 nomi (verificato).
- **Dataset T6a** (`site-renderer/data/comuni-fatti.json`, schema 1, confini 1/1/2026): 7.896 comuni, 1.483 alias, 110 sigle;
  per comune `nome`, `sigla`, `siglePrecedenti`, `nomiPrecedenti`, `nomeAltraLingua`, `centro`, `popolazione`: **nessun nome di
  provincia o regione**; prefisso a 3 cifre del codice unico per sigla (codice UTS). Omonimi: Castro (BG/LE), Livo, Peglio,
  Samone, San Teodoro; «Molise» è anche un comune (CB). `siglePrecedenti` è storico (76 comuni di LC hanno `CO`): non espande province.
- **Lettore T6a** `site-renderer/src/lib/fatti-comuni.ts`: `normalizzaNome` (r. 14), `cercaComune(nome, sigla?)` (r. 346),
  `comuniEntroKm` (r. 390, km interi in linea d'aria). Prova fatta oggi: **tutte le 7.904 coppie (nome, sigla) dell'elenco del
  form risolvono a un solo comune 2026** (anche «San Dorligo della Valle (TS)», «Carbonia (SU)» → CI, «Seppiana (VB)» →
  Borgomezzavalle). L'editor non può importarlo: Turbopack non importa fuori dalla radice (commento in `inbox-form.ts` r. 13);
  il repo usa **copia + banco di parità** (`TESTI` ↔ `tassonomia.ts` in `scripts/test-import-form.ts` r. 18-33) e letture di
  file a runtime da `REPO_ROOT` (`lib/build.ts` r. 19). I moduli `lib/` importati con estensione `.ts` girano nei banchi.
- **Province sarde 2026** da `ProvCM01012026` in `~/.cache/site-factory/fatti-comuni/istat-confini-2026.zip` (cache T6a): CI Sulcis
  Iglesiente, VS Medio Campidano, OG Ogliastra, OT Gallura Nord-Est Sardegna; codici regione 01-20 da `Reg01012026` (nomi = `CONFINI`).
- **Clienti reali** (senza dati personali): Saggin = form v4, `zone ["Tutta la regione Veneto"]`, sede con sigla; Cavaliere e
  La Cecilia = Tally (`raw-submission.responses`, niente `risposte`): zone solo in prosa in `brief.descrizione` (una regione
  ciascuno, più «tutta l'Italia» per le trasferte di Cavaliere), sede in `brief.citta` («Comune» e «Comune, Provincia»),
  `area_geografica` = categoria Tally («Locale (città o provincia)», «Regionale»). Nessuno ha `traffico/`. Tally è dismesso dal 08/09.
- **Pattern editor**: route con CSRF (`Sec-Fetch-Site` + JSON obbligatorio) in `app/api/clients/[slug]/traffico/route.ts`;
  `params` Promise (Next 16 `route.md` r. 82-89, `page.md` r. 13); `router.refresh()` dopo la scrittura (`use-router.md` r. 46,
  `components/traffico-azione.tsx`); scrittura atomica (`lib/clients.ts` r. 42); sintesi pigra in lettura, file scritto alla
  prima azione (r. 50-55); **nessuna scrittura all'apertura delle pagine** (`DESIGN-BRIEF.md`, Area Traffico); `traffico/` non
  rende stale nulla (`lib/staleness.ts`). Il dettaglio dice ancora «chiesti al cliente con un breve modulo» (`page.tsx` r. 43).

## 2. Regole di traduzione (pure, deterministiche)

Confronto sui nomi con `normalizzaNome` (accenti, maiuscole, apostrofi indifferenti). Una etichetta produce zero o più aree;
ogni etichetta ha un esito (`tradotta` | `da_controllare` | `non_riconosciuta`) e una `nota` leggibile quando serve.

| # | Ingresso | Aree | Esito |
|---|---|---|---|
| 1 | sede v4 (`risposte.sede`, cercata con la sigla) | comune | tradotta; non trovata → non_riconosciuta «sede non trovata nell'elenco 2026» |
| 2 | «Nome (SIGLA)» | comune (sigla attuale o precedente) | tradotta; nome precedente → nota «oggi è Borgomezzavalle (VB)» |
| 3 | «X e dintorni» | dintorni `{codice, raggioKm}`: X = comune della sede → codice della sede; altrimenti nome unico | tradotta; omonimo → non_riconosciuta con i candidati «Castro (BG) o Castro (LE)» |
| 4 | «X e provincia», «Provincia di X» | provincia (sigla 2026, codice UTS) | tradotta; «Sud Sardegna» → non_riconosciuta «provincia soppressa dal 1/1/2026: scegli le nuove»; provincia sarda coi confini cambiati → nota |
| 5 | «Tutta la regione X» | regione (nome breve o completo) | tradotta |
| 6 | «X e regioni vicine» | regione X + ognuna di `CONFINI[X]` | tradotta; senza confini (testo libero) → solo X, nota |
| 7 | «Tutta Italia» | italia | tradotta |
| 8 | testo libero (fuori grammatica), diviso su «,» e «;» | per ogni parte, nome esatto: regione, altrimenti comune unico, altrimenti provincia (Monza e della Brianza) — l'area più piccola vince | da_controllare («Bergamo» = comune, nota «è anche una provincia»); nulla → non_riconosciuta |
| 9 | Tally: `brief.citta` | primo comune riconosciuto = sede; un nome uguale alla sua provincia («San Severo, Foggia») si ignora | da_controllare |
| 10 | Tally: `brief.descrizione` | nomi esatti di regioni, province, comuni; solo sequenze con iniziale maiuscola, la più lunga vince; un comune di una parola non conta a inizio frase («Bella casa…»); stesso ordine della riga 8 («Molise» = regione) | da_controllare |

- **Mai** un'area da «Italia» in prosa, da `area_geografica` Tally o da un'estrazione AI. Nulla riconosciuto → «Zone da impostare».
- **Raggio «dintorni»**: `RAGGIO_DINTORNI_KM = 20` (valore iniziale, decisione 12), una costante calibrata in fase 3 (§9). Con
  20 km: Sandrigo 65 comuni / 637 mila residenti, Cologno Monzese 132 / 3,6 milioni, San Severo 8 / 130 mila.
- Stato della proposta: `da_impostare` se nessuna area; `da_controllare` se c'è almeno un esito diverso da `tradotta` o la fonte
  è Tally; altrimenti `riconosciute`. Etichette duplicate (dopo normalizzazione) una volta sola.
- Tabelle: `REGIONI` (20 righe: nome, nome breve, codice, confini) specchio di `CONFINI`; province da `site-intake/public/data/province.json`
  a runtime (la **stessa tabella che ha scritto le etichette**) + 4 sarde 2026; copie di `normalizzaNome`, ricerca e distanza T6a (parità §7-F).

## 3. Artifact `out/<slug>/traffico/zone-servite.json` e contratto

Scritto **solo** da un'azione dell'operatore (Conferma o Salva); senza file l'editor sintetizza la proposta dal lead in
lettura (pattern di `client.json`). Nome: sostituisce il `dati.json`/`dati-traffico.json` del mini-form (dubbio 1).

```ts
Area = { tipo: "comune" | "dintorni"; codice: string /*6 cifre*/; nome: string; sigla: string; raggioKm?: number /*dintorni*/ }
     | { tipo: "provincia"; codice: string /*UTS 3 cifre*/; sigla: string; nome: string }
     | { tipo: "regione"; codice: string /*2 cifre*/; nome: string }
     | { tipo: "italia" }
ZoneServite = {
  versione: 1,
  lead: { fonte: "form" | "tally" | "assente"; impronta: string /*sha256 di zone+sede, o citta+descrizione*/; etichette: string[] /*originali, verbatim*/ },
  sede: { codice, nome, sigla } | null,
  etichette: { testo: string; origine: "sede" | "zona" | "prosa"; provenienza: "lead" | "operatore"; aree: Area[]; esito; nota?: string }[],
  confermateAt: string /*ISO*/
}
```

Zod `strictObject` nel modulo; `provenienza` la calcola il server (etichetta presente fra quelle tradotte dal lead attuale →
`lead`, altrimenti `operatore`; una zona già confermata tiene la sua, così la vecchia sede o una zona del vecchio lead non diventano
«aggiunte a mano» dopo «Va bene così»), mai il client. Un file salvato non contiene etichette `non_riconosciuta` e ha almeno un'area.

**Contratto per i consumatori** (unica porta: le funzioni di `lib/zone-servite.ts`, mai il JSON letto a mano):

- `leggiZoneServite(dir)` → `{ stato: "proposta" | "confermate" | "non_leggibile" | "errore_dati"; zone; esito?; leadCambiato; motivo? }`, senza scritture.
- `zoneUsabili(z)` → `{ ok: true } | { ok: false; motivo }`: ok **solo** con `confermate` e `leadCambiato: false`. Il motivo
  («Conferma le zone servite nel dettaglio Traffico», «Il form lead è cambiato dopo la conferma») è la frase del blocco.
- `comuniServiti(zone)` → comuni unici `{codice, nome, sigla, popolazione?, kmDallaSede: number | null, aree: number[]}`
  (dintorni via distanza, provincia per sigla 2026, regione per sigle, italia = tutti; codici risolti anche via `alias`).
- `etichettaArea(area)` («Sandrigo e dintorni, 20 km», «Provincia di Vicenza», «Veneto», «Tutta Italia») e `regioneDiSigla(sigla)`.
- `improntaZone(zone)`: sha256 delle aree confermate, da registrare negli artifact a valle per la loro staleness.

| Chi | Usa | Regola |
|---|---|---|
| T4 | `comuniServiti` pesati per popolazione e `kmDallaSede`; blocco da `zoneUsabili` | area `italia`: le ricerche locali partono dalla provincia della sede; nessuna query fuori dai comuni serviti |
| G1 | `aree` per tipo | province e regioni intere dove l'etichetta è larga, comuni dove è precisa, massimo 20 (regola di G1) |
| T5a | `etichettaArea` di ogni area + `comuniServiti` | pagina «Zone servite» e `areaServed`, nessuna pagina-comune |
| T2b/T8 | nomi di regioni (`regioneDiSigla`) e comuni serviti | quota di visite Umami dalle zone; lettura dal Mac |

## 4. UI minima — studio UX (shape /impeccable, forma breve)

Modo **Operate**; Mattia apre il dettaglio Traffico di un cliente per sapere dove quel cliente va fatto trovare. Successo: in
10 secondi vede quali zone ha scelto il cliente, come sono state tradotte e quanto è larga l'area; conferma con un clic o
corregge senza sbagliare un omonimo. Anti-obiettivi: nessuna mappa, nessun select a tendina con 8.000 comuni, nessun modal
per modificare, nessuna promessa di risultati, nessuna scrittura all'apertura.

**Posto**: card «Zone servite» nel dettaglio `/traffico/[slug]`, **sopra** le card Sito e Scheda (serve a entrambe), sempre
visibile (anche a servizi spenti e in demo: preparare le zone non costa nulla). Quando la proposta non è confermata, la sua
azione è **la primaria della pagina** (T4 e G1 si bloccano con il motivo di `zoneUsabili`).

```
┌ card ── Zone servite [badge] ─────────────────────────────── [Modifica]
│ frase di stato (role=status)
│ Dal form lead: «Tutta la regione Veneto»                         (etichette originali, text-muted)
│ Sandrigo (VI)                 comune · sede · dal form lead
│ Veneto                        regione · dal form lead
│ ⚠ «zona nord»                 non riconosciuta: scrivila come «Monza (MB)» o «Provincia di …»
│ 560 comuni · {residenti} residenti   (mono: la larghezza dell'area, somma della popolazione T6a)
│                                                          [Conferma le zone]
```

| Stato | Badge | Frase | Primaria | Secondarie |
|---|---|---|---|---|
| vuoto (nessun lead leggibile) | idle «Senza form lead» | «Nel form lead non ci sono zone da tradurre: impostale tu.» | Imposta le zone | — |
| riconosciute | brand «Da confermare» | «Tradotte dal form lead. Confermale: le usano ricerche, scheda Google e pagine.» | Conferma le zone | Modifica |
| da controllare | warn «Da controllare» | elenco degli esiti non tradotti e delle note; Tally: «Lette dal testo libero del vecchio modulo» | Modifica | Conferma le zone (solo se nessuna etichetta è non riconosciuta) |
| da impostare | warn «Da impostare» | «Nessuna zona riconosciuta nel form lead» + etichette originali | Imposta le zone | — |
| confermate / corrette | ok «Confermate il gg/mm» | «corrette a mano» se c'è `provenienza: operatore` | — | Modifica |
| lead cambiato | warn «Da rivedere» | Banner warn con le nuove etichette del lead | Usa le zone del nuovo lead (ConfirmDialog se c'erano correzioni) | Va bene così (ghost: risalva con la nuova impronta) |
| non leggibile / errore dati | err «Non leggibile» | Banner err col percorso `mono` (file fuori schema da correggere a mano; dataset o `province.json` illeggibile) | — | — |

**Modifica** (inline, progressive disclosure, niente modal): righe con testo, traduzione, provenienza e «Togli» (ghost,
`aria-label="Togli «…»"`); campo «Aggiungi una zona» + «Aggiungi» (secondaria) → anteprima dal server → riga nuova o errore sotto
il campo (`aria-describedby`, `role="alert"`) con i candidati; aiuto con la grammatica: «Monza (MB)» · «Monza e dintorni» ·
«Provincia di Monza e della Brianza» · «Tutta la regione Lombardia» · «Lombardia e regioni vicine» · «Tutta Italia». Azioni:
**Salva e conferma** (primaria, disabilitata con il motivo scritto se resta una non riconosciuta o nessuna area) · Annulla
(ghost). `useUnsavedGuard(dirty)`, `⌘S` con `useSaveShortcut`; focus sul titolo della card dopo il salvataggio.

Solo `card`, `Badge`, `Banner`, `btn*`, `ConfirmDialog`, `mono` e token di `DESIGN-SYSTEM.md`; nessuna coppia di colori nuova;
la parola sempre oltre al colore. **Mobile 400 px**: righe a blocco (testo sopra, dettaglio sotto), azioni che vanno a capo,
campo a tutta larghezza. **Temi**: verifica chiaro e scuro in M3. Motion: nessuna oltre alle transizioni esistenti.

## 5. API

`POST /api/clients/[slug]/traffico/zone` (nuovo file, stesso schema di sicurezza e messaggi della route `traffico`): 403
cross-origin, 415 senza JSON, 400 slug o corpo, 404 cliente. Corpo `z.discriminatedUnion("azione", …)`:

- `anteprima {etichetta ≤ 120}` → `200 {esito, aree, nota}`; nessuna scrittura.
- `salva {etichette: string[] 1-60 (≤ 120 car.), impronta}` → traduce sul server; 409 se `impronta` ≠ lead attuale o file
  fuori schema; 422 con l'elenco se un'etichetta è non riconosciuta o non resta nessuna area; scrittura atomica (mkdir
  `traffico/`, tmp+rename) → `200 {zone}`. «Conferma le zone» = `salva` con le etichette della proposta.
- `ricalcola {}` → rimuove `zone-servite.json` (torna la proposta dal lead); 409 se il file è fuori schema.
- 503 dataset o `province.json` illeggibile; 500 disco, sempre con messaggio leggibile. Nessun GET: la pagina legge il filesystem.

## 6. File e perimetro

| File | A/M | Cosa |
|---|---|---|
| `site-factory-editor/lib/zone-servite.ts` | A | regole §2, schema e lettura/scrittura §3, contratto |
| `site-factory-editor/app/api/clients/[slug]/traffico/zone/route.ts` | A | §5 |
| `site-factory-editor/components/zone-servite.tsx` | A | card client: stati, Conferma, Modifica |
| `site-factory-editor/app/traffico/[slug]/page.tsx` | M | card sopra i servizi; testo «Cosa servirà» senza modulo |
| `site-factory-editor/scripts/test-zone-servite.ts` | A | banco §7 |
| `site-factory-editor/DESIGN-BRIEF.md` | M | Area Traffico: layout e decisioni della card |
| `docs/traffico/piano-T3.md`, `docs/traffico/README.md` (§3, §7), `docs/handoff-fase-c.md`, `docs/DEBUG.md` | M | chiusura |

`.claude/scope.json` (primo atto della fase 2): `{"task":"T3 zone servite dal form lead","perimetro":[` i 10 path sopra `,
"site-renderer/out/zz-test-t3/**", "site-renderer/out/zz-test-t3-tally/**"]}`. Nessun altro file: in particolare **non**
`lib/inbox-form.ts` (Mattia ci lavora per gli orari), `lib/schemas.ts`, `site-intake/`, `site-renderer/src/`, `lib/run-bus.ts`.

## 7. Banco `scripts/test-zone-servite.ts` (senza rete, strip-types; dataset e `province.json` veri, lead sintetici in cartella temporanea)

- **A. Ogni etichetta**, sede Sandrigo (VI): «Sandrigo e dintorni» → dintorni 024091, 20 km, 65 comuni; «Vicenza e provincia»
  e «Provincia di Vicenza» → VI/024, 113 comuni; «Tutta la regione Veneto» → 05, 560; «Veneto e regioni vicine» → 5 regioni,
  2.889; «Tutta Italia» → 7.896; «Tutta la regione Trentino-Alto Adige», «Valle d'Aosta/Vallée d'Aoste e provincia» (AO),
  «Monza e della Brianza e provincia» (MB/108), «Pesaro e Urbino e provincia», «Bolzano/Bozen e provincia», «Reggio Calabria e
  provincia» (RC); maiuscole e accenti diversi → stesso esito; duplicati una volta.
- **B. Omonimi**: «Castro (BG)» → 016065; «Castro e dintorni» con sede Castro (LE) → 075096; «Castro» libero → non_riconosciuta
  con 2 candidati; «Samone (TN)»; «Molise» libero → regione.
- **C. Fusi, alias, Sardegna**: «Seppiana (VB)» → 103078 con nota; «Carbonia (SU)» → 119003 (CI); «San Dorligo della Valle (TS)»;
  «San Giovanni di Fassa (TN)»; «Sud Sardegna e provincia» → non_riconosciuta; «Sassari e provincia» → SS 2026, 66 comuni, nota;
  `comuniServiti` su un file con un codice soppresso → codice 2026 via `alias`.
- **D. Prosa Tally** (testi sintetici equivalenti, nessun dato dei clienti): «Cologno Monzese» + «Lavoriamo in Lombardia e ci
  spostiamo in tutta Italia» → sede 015081 + Lombardia, niente Italia, da_controllare; «San Severo, Foggia » + «… in tutta la
  Puglia» → sede 071051 + Puglia, Foggia ignorata; «Bella ristrutturazione a Monza.» → solo Monza; «la vita» → nulla;
  nessun nome → da_impostare.
- **E. Input corrotti**: `raw-submission.json` assente, non JSON, `zone` non array o con numeri/stringhe vuote/2.000 caratteri/
  300 voci; sede senza sigla; `brief.json` assente → vuoto; `province.json` o dataset assente/`schema ≠ 1` → errore_dati;
  `zone-servite.json` fuori schema → non_leggibile e `salva` 409; `<script>` → non_riconosciuta (testo, mai HTML).
- **F. Parità**: `REGIONI` = `CONFINI` di `site-intake/src/data/regioni.ts`; ricerca copiata = `cercaComune` di `fatti-comuni.ts`
  sulle 7.904 coppie del form e sui nomi precedenti; distanza = `comuniEntroKm` per 3 sedi × 10/15/20/30 km; ogni sigla del
  dataset ha una regione; ogni nome di `province.json` risolve.
- **G. Artifact**: salva → leggi → `confermate`, provenienza lead/operatore dal server; 422 e 409; nessun `.tmp` rimasto;
  impronta cambiata → `leadCambiato` e `zoneUsabili` falso; ricalcola → proposta; `comuniServiti` senza doppioni con la sede
  dentro la regione; `kmDallaSede` null senza sede.

## 8. Milestone (ogni verifica verde prima della successiva)

| M | Cosa | Verifica |
|---|---|---|
| M0 | `git log --oneline -5`, `git status --short`, `scope.json` libero → scritto; sha256 dei file dei 3 clienti reali | annotati qui |
| M1 | `lib/zone-servite.ts` (regole, tabelle, espansioni) + banco A-F | banco verde, `npx tsc --noEmit` |
| M2 | lettura/scrittura + route | banco G; E2E API su fixture (§10); `npm run build` |
| M3 | card, pagina, DESIGN-BRIEF | browser su fixture: 7 stati, chiaro e scuro, 390 px, tastiera; `/impeccable` critique e detector; build |
| M4 | calibrazione (§9), collaudo (§10), chiusura documenti, `scope.json` svuotato | suite completa, sha dei clienti reali invariati |

Commit + push a ogni milestone verde, path espliciti.

## 9. Calibrazione (fase 3)

1. **Raggio «dintorni»**: tabella per le 3 sedi reali e 2 sedi di prova (città densa, capoluogo di provincia) a 10/15/20/30 km
   con comuni, residenti e i 10 più popolosi; Mattia sceglie il valore che copre dove un'impresa piccola accetta davvero lavori.
   Proposta: 20 km se nessuna sede supera 150 comuni; altrimenti 15. Una costante sola, niente raggio per densità.
2. **Prosa Tally**: sui 2 clienti reali, in sola lettura, l'esito deve essere sede + regione, nessun falso positivo.
3. **Testi della card**: prova di comprensione con Mattia sugli stati «da controllare» e «lead cambiato».

## 10. Test ed E2E

- Fixture `site-renderer/out/zz-test-t3` (form v4, sede Sandrigo, zone di ogni tipo più una libera non riconosciuta) e
  `zz-test-t3-tally` (brief Tally sintetico), senza dati personali. `curl` sul dev server: 403/415/400/404, anteprima, salva,
  422, 409 dopo aver cambiato `raw-submission.json` della fixture, ricalcola; poi UI nel browser. Fixture nel Cestino a fine lavoro.
- Clienti reali: **solo apertura** del dettaglio (mai Conferma o Salva), sha256 dei loro file uguali a M0.
- Suite: banco, `npx tsc --noEmit`, `npm run build`, `test-traffico-stato.ts`, `test-import-form.ts`.

## 11. Rischi

| Rischio | Contromisura |
|---|---|
| Etichette dal form pre-2026 contro dataset 2026 (Sardegna) | risoluzione per sigla attuale o precedente; province soppresse o cambiate dette in nota |
| Area troppo larga («Tutta Italia», regione intera) diluisce il traffico locale | la card mostra comuni e residenti; conferma umana; T4 parte dalla provincia della sede |
| Falsi positivi nella prosa | iniziale maiuscola, niente comuni di una parola a inizio frase, sempre «da controllare» |
| Deriva delle copie (`CONFINI`, ricerca T6a) | banco di parità F |
| Re-import del lead dopo la conferma | impronta → «Da rivedere», consumatori bloccati |
| Dataset T6a aggiornato con codici nuovi | espansione via `alias` |
| Lavoro parallelo di Mattia sul form lead (orari) | T3 non tocca `inbox-form.ts` né `site-intake/`; legge `risposte` come JSON grezzo |

## 12. Dubbi aperti (proposta)

1. Nome dell'artifact: `traffico/zone-servite.json` al posto di `dati-traffico.json` (decisione 12) → **sì**, il file contiene solo zone.
2. Conferma obbligatoria anche con tutte le etichette riconosciute → **sì**: un clic, protegge la spesa DataForSEO (T4) e l'area
   pubblica della scheda (G1).
3. «Sud Sardegna e provincia» ancora offerta dal form → non riconosciuta con nota; **segnalare a Mattia** l'aggiornamento di
   `province.json` al 2026 nella chat del form.
4. «Tutta l'Italia» per trasferte su commessa (Cavaliere) → **non** tradotta: non è una zona dove farsi trovare; l'operatore può aggiungerla.
5. Card visibile anche con servizi spenti e in demo → **sì**, sola lettura più conferma.
6. Piani T4 e G1 che citano run-bus, `lib/dataforseo.ts`, `dati.json`/`foto.json` di T3 → T3 non li crea (`kind: "traffico"`
   e `lib/dataforseo.ts` nascono in T4, come da punto 13); l'orchestratore li riallinea al contratto del §3.

## Sviluppo (fase 2, 2026-09-15)

Applicate sopra il piano le decisioni T3 punto 14: nessuna conferma obbligatoria, niente prosa Tally (righe 9-10 del §2),
niente `ricalcola`, niente `improntaZone`. M0: `git log`/`status` controllati, `scope.json` libero → scritto col perimetro
del §6 più `docs/traffico/**` e le due fixture; sha256 dei 300 file dei 3 clienti reali salvati fuori dal repo.

| M | Commit | Esito |
|---|---|---|
| M1 | `f8d84e6` | `lib/zone-servite.ts` (regole, tabelle, artifact, contratto, vista) + banco 96/0 |
| M2 | `c636daf` | route `anteprima`/`salva`; E2E su `zz-test-t3`: 403, 415, 400 (slug, corpo, non JSON), 404, anteprima, 422, 200, 409 dopo il cambio del lead |
| M3 | `4050039` | card, pagina, DESIGN-BRIEF; 7 stati nel browser su `zz-test-t3*`, chiaro e scuro, 1280 e 400 px |

Scelte e scostamenti dal testo del piano (tutti dentro il perimetro):

- **Contratto** come §3, con tipi più stretti: `leggiZoneServite` restituisce un'unione discriminata (`proposta` con
  `esito` e `avvisi`, `confermate` con `leadCambiato` e la proposta del lead attuale, `non_leggibile`, `errore_dati`);
  `zoneUsabili` restituisce anche `zone` quando è ok. In più `areeServite` (aree uniche, `comuniServiti[].aree` sono indici
  lì dentro), `vistaZone` e `anteprimaEtichetta` per la card. Motivi del blocco esportati (`MOTIVO_DA_CONTROLLARE`,
  `MOTIVO_DA_IMPOSTARE`, `MOTIVO_LEAD_CAMBIATO`).
- **Codice della provincia** = prefisso a 3 cifre dei codici dei comuni (`COD_PROV` Istat: Milano `015`), non il codice UTS
  (che per le città metropolitane è `215`, `312`…): è quello che serve per filtrare i comuni; esempi del §7 invariati.
- **Province sarde 2026**: le 4 nuove (CI, VS, OG, OT) si aggiungono all'elenco del form; «Sud Sardegna» è riconosciuta come
  soppressa perché non ha comuni nel dataset, e la nota elenca le province che l'hanno sostituita. Hanno confini cambiati
  anche NU, OR e CA, non solo SS: nota «confini cambiati» su tutte e 4.
- **Testo libero** diviso su «,» e «;»: una parte non riconosciuta rende non riconosciuta l'etichetta intera (nessuna area
  persa in silenzio). Accettata anche «Tutta l'Italia». «X (SIGLA) e dintorni» riconosciuta: serve a sciogliere gli omonimi.
  Suggerimenti «forse …» solo per province e regioni (prefisso della prima parola), non per gli 8.000 comuni.
- **Lead**: impronta = sha256 di `zone` + comune e sigla della sede (un campo nuovo come gli orari non la cambia; banco G).
  Tally = `responses` senza `risposte` → `da_impostare`; lead illeggibile → fonte `assente`, card «Senza form lead».
  `brief.json` non si legge più (serviva solo alla prosa). Problemi del lead che non stanno in una etichetta (zone non in
  elenco, voci non testuali o vuote, oltre 60 voci, sede assente) diventano `avvisi` e rendono la proposta da controllare.
- **Sede** = etichetta con `origine: "sede"` («Sandrigo (VI)», o solo il comune se scritto a mano, con nota); si può togliere,
  il campo `sede` del file resta per `kmDallaSede`.
- **UI**: «Conferma le zone» salva senza dialog (non perde nulla); il dialog c'è solo su «Usa le zone del nuovo lead» quando
  le zone salvate hanno correzioni a mano, e le nomina. Con il lead nuovo non pulito il bottone diventa «Rivedi le zone del
  nuovo lead» e apre la modifica. Righe salvate senza badge di esito (restano le note).

## Calibrazione (fase 3, 2026-09-15)

### 1. Raggio «dintorni»

Linea d'aria tra i centri, km interi (`comuniEntroKm`), residenti Istat del dataset T6a. Le 5 sedi del §9 più 2 di prova in
aggiunta (Monza, Napoli), solo come osservazione.

| Sede | ruolo | 10 km | 15 km | **20 km** | 30 km |
|---|---|---|---|---|---|
| Sandrigo (VI) | reale, form v4 | 22 · 156.656 | 41 · 452.802 | **65 · 636.657** | 129 · 1.139.528 |
| Cologno Monzese (MI) | reale, Tally | 29 · 857.443 | 68 · 2.767.186 | **132 · 3.610.685** | 330 · 4.949.343 |
| San Severo (FG) | reale, Tally | 1 · 49.136 | 4 · 79.721 | **8 · 130.485** | 18 · 333.346 |
| Milano (MI) | prova, città densa | 20 · 1.868.713 | 51 · 2.680.029 | **111 · 3.410.714** | 277 · 4.867.333 |
| Vicenza (VI) | prova, capoluogo | 15 · 227.109 | 35 · 350.207 | **64 · 567.798** | 141 · 1.411.193 |
| Monza (MB) | osservazione | 39 · 961.558 | 88 · 2.939.182 | 156 · 3.592.952 | 357 · 5.138.280 |
| Napoli (NA) | osservazione | 19 · 1.496.131 | 43 · 2.233.274 | 63 · 2.641.039 | 128 · 3.604.471 |

(comuni · residenti). I 10 comuni più popolosi a 20 km: Sandrigo → Vicenza 13, Bassano del Grappa 15, Thiene 10, Cittadella
13, Cassola 17, Malo 14, Rosà 13, Romano d'Ezzelino 19, Marostica 12, Dueville 5; Cologno Monzese → Milano 11, Monza 6, Sesto
San Giovanni 3, Cinisello Balsamo 6, Rho 18, Paderno Dugnano 10, Lissone 10, Seregno 14, Desio 11; San Severo → Lucera 19,
Torremaggiore 15, Apricena 14, San Marco in Lamis 20, San Paolo di Civitate 18, Poggio Imperiale 20, Rignano Garganico 13;
Vicenza → Arzignano 17, Thiene 17, Montecchio Maggiore 12, Malo 16, Dueville 9, Mestrino 18, Torri di Quartesolo 6.

**Esito: `RAGGIO_DINTORNI_KM = 20` resta.** Regola della decisione 14 (20 km, 15 se una sede di calibrazione supera 150
comuni): il massimo delle 5 sedi è 132 (Cologno Monzese). A 20 km i dintorni prendono i capoluoghi vicini dove una piccola
impresa va davvero (Vicenza e Bassano per Sandrigo, Milano e Monza per Cologno, Lucera per San Severo); a 15 km San Severo
resterebbe a 4 comuni, a 30 km Cologno salirebbe a 330. **Dubbio per Mattia**: Monza, fuori dalle sedi della regola, supera
150 (156 comuni) — in Brianza «dintorni» a 20 km arriva a Milano e Rho; se la regola deve contare anche le sedi più dense,
il valore diventa 15 (una costante, nessun raggio per densità). Un'area salvata porta il suo `raggioKm`: cambiare la
costante non tocca le zone già confermate.

### 2. Prosa Tally

Tagliata (decisione 14). Verifica in sola lettura sui 2 clienti Tally reali (dettaglio aperto, nessun salvataggio): stato
«Da impostare», nessuna etichetta, nessuna area, frase «Il cliente è arrivato dal vecchio modulo Tally…», primaria «Imposta le
zone». Zero falsi positivi per costruzione. Saggin (form v4): «Dal form lead», Sandrigo (VI) + Tutta la regione Veneto, 560
comuni · 4.853.472 residenti, nessuna primaria, `zoneUsabili` ok senza conferma.

### 3. Testi della card

La prova di comprensione con Mattia non si fa da un agente: testi scelti sui 7 stati, da confermare con lui.

| Stato | Badge | Frase |
|---|---|---|
| riconosciute | ok «Dal form lead» | «Tradotte dal form lead e già in uso. Correggile solo se il cliente lavora altrove.» |
| da controllare | warn «Da controllare» | «Alcune zone del form lead vanno controllate: confermale o correggile. Finché non lo fai, ricerche e scheda Google aspettano.» (con una non riconosciuta: «… non sono riconosciute: correggile con «Modifica»…») |
| da impostare | warn «Da impostare» | Tally: «Il cliente è arrivato dal vecchio modulo Tally, che non aveva zone da tradurre: impostale tu, una volta.»; form: «Nessuna zona del form lead è stata riconosciuta: impostale tu…» |
| senza lead | idle «Senza form lead» | «Questo cliente non ha un form lead leggibile: imposta tu le zone.» |
| confermate | ok «Confermate il gg/mm» | «Confermate il gg/mm/aaaa[, con correzioni a mano].» o «Impostate a mano il gg/mm/aaaa.» |
| lead cambiato | warn «Da rivedere» | banner «Il form lead è cambiato dopo il salvataggio del …» + «Ora dice: «…». Qui sotto restano le zone salvate: finché non scegli, ricerche e scheda Google aspettano.» |
| non leggibile | err «Non leggibile» | banner col percorso `mono` e il dettaglio dello schema |

Descrizione fissa: «Dove il cliente accetta lavori: le usano ricerche, scheda Google e pagine.» Tolte in calibrazione le
ripetizioni (frase e titolo del banner uguali, grammatica ripetuta nella nota e nell'aiuto sotto il campo).

### 4. Critique /impeccable (single-context)

⚠️ DEGRADED: single-context (agente del workflow senza strumento di sub-agent). Detector `impeccable detect` su
`components/zone-servite.tsx` e `app/traffico/[slug]/page.tsx`: 0 risultati. Revisione nel browser: una sola primaria per
stato, dubbio visibile inline (badge + nota sulla riga), provenienza sempre scritta, nessuna mappa né modal di modifica,
righe a blocco a 400 px, token e componenti del design system in entrambi i temi. Corretti: badge «Da controllare» mancante
sulle traduzioni con nota, lampo delle zone vecchie dopo il salvataggio (`useTransition`), frase «con correzioni a mano» per
zone tutte impostate a mano, descrizione falsa per i clienti Tally. Questions skipped: nessun utente raggiungibile
dall'agente; restano per Mattia i testi del punto 3 e il dubbio del punto 1.

Da segnalare a Mattia per la chat del form (decisione 14): `site-intake/public/data/province.json` è precedente al riordino
sardo e offre ancora «Sud Sardegna e provincia», che T3 non può tradurre.

## Verifica (fasi 4-5, collaudo finale, 2026-09-15)

Dopo 11 problemi corretti nei giri di revisione (`0e7b6c9`, `c175482`). Editor su :3311 (dev), esiti reali.

| Comando (in `site-factory-editor/`) | Esito |
|---|---|
| `npx tsc --noEmit` | exit 0, nessun errore |
| `npm run build` | exit 0, route `ƒ /api/clients/[slug]/traffico/zone` e `ƒ /traffico/[slug]` |
| `node --experimental-strip-types scripts/test-zone-servite.ts` | 110 passati, 0 falliti (gruppi A-G del §7) |
| `scripts/test-traffico-stato.ts` | 58 passati, 0 falliti |
| `scripts/test-fondamenta.ts` | 114 passati, 0 falliti |
| `scripts/test-import-form.ts` | exit 0, ✓ import dal form (lista, brief, intake, foto, logo, client.json, pulizia `_inbox`) |
| `scripts/test-portafoglio.ts` | 43 passati, 0 falliti |

**E2E API** su `zz-test-t3` (form v4, sede Sandrigo): 403 cross-site, 415 senza JSON, 400 slug non valido, 400 azione
`ricalcola` (tolta), 400 corpo non JSON, 404 cliente assente; `anteprima` «Castro» → non riconosciuta coi 2 candidati,
«Monza e dintorni» → 156 comuni, «Sandrigo e dintorni» → provenienza lead; `salva` con «zona nord» → 422 con l'elenco,
impronta sbagliata → 409, salva valido → 200 e file conforme allo schema (sede, provenienza lead/operatore, `raggioKm` 20);
lead cambiato nel `raw-submission.json` della fixture → `salva` con l'impronta vecchia 409, `zoneUsabili` falso col motivo
del lead cambiato; `zone-servite.json` fuori schema (`versione: 2`) su `zz-test-t3-tally` → card «Non leggibile» e `salva`
409 senza sovrascrivere.

**UI nel browser** (1280 e 400 px, chiaro e scuro): proposta da controllare con «Modifica» primaria e «zona nord» non
riconosciuta; confermate «con correzioni a mano» e «Nel form lead: …»; lead cambiato con banner, «Usa le zone del nuovo lead»
→ ConfirmDialog che nomina «Monza (MB)» → confermate con Provincia di Padova (101 comuni); lead cambiato non pulito → «Rivedi
le zone del nuovo lead», «Va bene così» → confermate con le aree salvate e la nuova impronta; Modifica: «Castro» → errore sotto
il campo coi candidati, «Castro (LE) e dintorni» → 38 comuni, «Togli» sposta il focus sul «Togli» successivo, «Salva e
conferma» → focus sul titolo; Tally «Da impostare» → «Imposta le zone», «Sud Sardegna e provincia» → nota con le province nuove,
«Tutta la regione Lombardia» + ⌘S → «Impostate a mano», 1.502 comuni. A 400 px nessuno scroll orizzontale
(`scrollWidth` 400), righe a blocco. Nota: l'Invio nel campo non si è potuto provare, perché lo strumento del browser non
invia i form con l'Invio nemmeno su un form HTML di prova; «Aggiungi» col clic funziona.

**Clienti reali** solo aperti: Saggin «Dal form lead», Sandrigo (VI) + Veneto, 560 comuni · 4.853.472 residenti, nessuna
primaria; Cavaliere e La Cecilia «Da impostare» dal modulo Tally. sha256 dei 300 file dei 3 clienti identici prima e dopo;
nessun `client.json` creato dall'apertura del dettaglio (fixture Tally senza `client.json`). `lib/staleness.ts` non legge
`traffico/`: contesto, copy e build non diventano stale. Stato di prova ripristinato: `raw-submission.json` della fixture
identico all'inizio (sha256), fixture nel Cestino a fine collaudo. Tema dell'editor riportato su chiaro.

**Perimetro**: i commit del piano (`aaa89d1`, `f2b3c9f`, `f8d84e6`, `c636daf`, `4050039`, `84993b2`, `0e7b6c9`, `c175482` e
la chiusura) toccano solo file del §6 più `docs/traffico/**`, `docs/DEBUG.md` e `docs/handoff-fase-c.md`; nessuna modifica del
piano resta fuori dai commit (`factory/assignments.json` modificato nel working tree è di un'altra sessione, non di T3).
Revisione del diff: nessun difetto nuovo. Minore, lasciato com'è: con l'elenco vuoto e un testo non riconosciuto nel campo,
il motivo accanto a «Salva e conferma» dice «Aggiungi almeno una zona.» mentre l'errore sotto il campo spiega il perché.

**Per Mattia**: i testi della card (Calibrazione §3), il dubbio sul raggio a 15 km per le sedi dense come Monza (Calibrazione
§1) e `province.json` del form da portare al riordino sardo 2026.
