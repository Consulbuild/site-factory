# Piano T3 — Zone servite dal form lead

Versione precedente (mini-form, **superata** dalle decisioni T3 punti 12-13): `git show 550126f:docs/traffico/piano-T3.md`.
Stato: **fase 1, 2026-09-15**, da rivedere dall'orchestratore; sopra questo testo valgono `decisioni-piani.md` («Priorità
assoluta», T3 punti 12-13). Fonti: `README.md` §3-§5, `stato-orchestrazione.md`, `brief-T3.md`. Sezioni «Calibrazione» e
«Verifica» si aggiungono in fase 3 e 4.

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
`lead`, altrimenti `operatore`), mai il client. Un file salvato non contiene etichette `non_riconosciuta` e ha almeno un'area.

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
