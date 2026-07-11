# Harness-optimize — revisione completa della pipeline (2026-07-11)

Revisione secondo il metodo harness-optimize: **misura prima di toccare** (trace reali
dei 3 clienti in `out/`, ispezione visiva delle dist buildate a 390/1280, gate
rieseguiti), **mappa dell'harness** (6 lettori paralleli su runner, skill/critici,
trace, renderer, fabbrica design, eval), **verifica avversariale** dei finding
(29 verificatori col mandato di confutare), poi **quick win applicati** uno alla
volta con le verifiche standard.

**Numeri della revisione**: 76 finding grezzi → 29 selezionati per verifica
avversariale → **24 CONFERMATI, 5 PARZIALI, 0 CONFUTATI** → 20 quick win applicati
e verificati (tsc + build editor, build renderer + astro check, validatori,
parity-copy, negativo sintetico sul validatore, regate anti-slop sui 3 clienti).

## Stato di salute (sintesi onesta)

Il quadro è **a due velocità**. L'architettura del runner è sana (seam multi-fase,
gate deterministici prima dei critici LLM, calcoli mai duplicati, segreti via env,
dieta del contesto per fase buona) e l'area design/preset è la meglio attrezzata
(gold set 40 item, κ e recall con soglie, canary, VRT+axe, gate L1/L2/L3).
Ma i tre generatori che producono ciò che il cliente legge e vede — **copy, palette,
immagini — non hanno né eval di regressione ripetibili né critici calibrati contro
giudizio umano**: il fallimento «troppo ripetitivo» lo colse Mattia, non il critico.
E le trace reali contenevano difetti da P0 che nessun sensore vedeva (numero di
telefono finto del golden example pubblicato nel hero di TUTTI i clienti,
«DA CONFERMARE» nel footer pubblicato).

## Difetti trovati nell'output REALE (baseline)

| Difetto | Dove | Stato |
|---|---|---|
| Telefono finto `+39 06 4547 8890` (golden example) nella CTA hero | tutti e 3 i clienti, fino all'HTML | **RISOLTO** (assembler riscrive le CTA `tel:` da `contact.phone`; dist costruzioni ribuildata e verificata) |
| Placeholder «REA e cap. soc. “DA CONFERMARE”» nel footer | cavaliere + zz-test, pubblicato | **Gate aggiunto** (bloccante `da confermare` in frasi-bandite + divieto in skill/slots); il copy dei 2 clienti resta da correggere a mano o da rigenerare |
| Alt «…ristrutturato da Edil Roma Costruzioni» (fixture di un'altra azienda) nel sito di cavaliere | build parziale | **Guard aggiunto** (assemble completa fallisce sui marcatori fixture); la parziale li usa by design — resta il rischio demo, v. roadmap |
| Copy baseline che fallisce il gate anti-slop attuale (6 bloccanti cavaliere, 1 costruzioni) | `out/*/copy.json` pre-gate | **Misurato** con `scripts/regate-copy.mjs` (nuovo, solo report): da rigenerare col flusso attuale |
| Claim non tracciabili nel copy («cantiere pulito», «senza costi che spuntano», «nessuna sorpresa dopo la firma») | costruzioni | Aperto: le famiglie di promesse standard sono vietate per-cliente ma non c'è base condivisa (v. roadmap P1) |
| Copy gallery con claim «Foto reali dei nostri cantieri, non immagini da catalogo» che la pipeline non può mantenere (nessuna foto dal form) | costruzioni (slot orfani: gallery droppata) | Aperto (P2: slot gallery condizionali + tell per il critico) |
| Stelle «5 su 5» inventate nei Testimonials (nessun rating nei dati) | componente | **RISOLTO** (rimosse — regola 5) |
| Nome navbar troncato «…LA CECILIA GIOV...» e indirizzo grezzo dal form («Via Carlo dambrosio 101, 71016» senza città) | costruzioni | Aperto (P2: nome breve display + normalizzazione indirizzo nell'intake) |

## Quick win applicati (tutti verificati)

**Robustezza pipeline / stati (la classe di bug «dati sporchi»):**
1. `assemble-site.ts` — le CTA `tel:` seguono SEMPRE `contact.phone` (il numero
   finto era hardcoded nel golden example, fuori dagli slot); guard sui marcatori
   fixture (`Edil Roma`, `unsplash.com`) nelle build complete.
2. `run-step.ts` — mutua esclusione per (cliente, step): il doppio avvio corrompeva
   artifact e stato; in mode `critic` non si ri-snapshotta più la provenienza
   (un «Ricontrolla col critico» disarmava il sensore di staleness).
3. `build.ts` — mutex globale della build: `public/media` è condivisa tra clienti,
   due build simultanee mescolavano i media di un cliente nel sito dell'altro.
4. `tally.ts` — il re-import preserva TUTTI gli step (prima azzerava «verificato»,
   hash upstream e storia deploy di un sito già online).
5. `clients.ts` — scritture atomiche (tmp+rename) e recovery non silenziosa
   (client.json corrotto → `.bak` + log, non più sovrascritto coi default).
6. `steps.ts`/route — il gate images non pretende più la key BFL per il solo
   ricontrollo del critico.

**Qualità del copy (sensori e guida):**
7. `steps.ts` — la copertura servizi è ora un gate deterministico del validate copy
   (stessa definizione del CoveragePanel, estratta in `slots-shared.ts`): la
   «lezione Cavaliere» (servizi reali spariti dal sito) non può ripetersi a valle.
8. `slop.ts`/`steps.ts` — città e area di intervento entrano in `--consenti`:
   eliminato il falso positivo «a cologno monzese» (4 slot) che erodeva la fiducia nel gate.
9. `frasi-bandite.json` — bloccanti «da confermare/da definire/lorem ipsum» +
   regex `tbd|todo|xxx|placeholder`; divieto segnaposto nella skill copywriter e
   nella note del legalNote in `slots.json`.
10. `steps.ts` — il critico nei round 2+ sa di essere post-correzione (legge il
    review precedente, rivaluta gli slot corretti + G1/G2, non riapre i promossi).
11. Skill copywriter/copy-critic/esempi-oro — «tempi di risposta» qualificati
    ovunque (SOLO se in `promesse_consentite`): quattro artefatti spingevano
    coerentemente verso l'invenzione vietata più tipica («risposta entro 24 ore»).
12. Drift bound corretto: passi processo **3–5** (editor diceva 2–4, lo Zod 3–5) —
    in `slots-shared.ts` e nella skill copywriter.

**Contratto renderer:**
13. `schema.ts` — `accentTitle` richiede ESATTAMENTE una frase accent (prima ne
    accettava zero: un titolo senza accent usciva senza la grammatica dello standard).
14. `validate-site.ts` — boccia i site.json con tipi senza componente (8 tipi Fase 4);
    `index.astro` fallisce con messaggio chiaro invece di «Unable to render Comp».
    (Negativo sintetico testato: ProblemAgitation valido per Zod → bocciato col nuovo messaggio.)
15. `Testimonials.astro` — rimosse le 5 stelle fisse con aria-label «5 su 5»
    (valutazione inventata, regola 5).

**Fabbrica design / eval:**
16. `calibrate-critic.mjs` — in `--canary` si riesegue SEMPRE (prima riusava i
    verdetti su disco: 10/10 garantito che non misurava nulla); il report registra
    `misuratoContro` (hash SKILL.md + modello).
17. `make-goldset.mjs` — lista `--presets` manifest-driven (prima hardcodata a 5:
    «ferro» restava senza shot); `novelty.mjs` fail-fast con istruzione se mancano
    gli shot di un preset del manifest.
18. Skill+agent palette-designer allineati a M8 (il preset è ASSEGNATO, non scelto;
    tabella con ferro; vincolo hue-bucket documentato).
19. `docs/evals/brief-and-rubric.md` — bannerizzato come STORICO (le rubriche R1/R2
    boccerebbero l'output oggi corretto: voi/Lei vs noi+tu, OKLCH vs contratto preset).
20. Igiene: `copy-upgrade/` rimosso (duplicato byte-identico destinato a divergere;
    fixture del gate spostata in `copy-critic/references/`), handoff corretto su
    2 claim stali (lo script anti-ripetizione È in repo; regola 7 commit autonomi).

Nuovo strumento: **`site-factory-editor/scripts/regate-copy.mjs`** — report PASS/FAIL
del gate anti-slop su tutti i clienti in `out/` con gli stessi argomenti della pipeline.

## Roadmap prioritizzata (da decidere insieme)

### P0 — la leva n.1: eval ripetibili e critici calibrati
Senza, ogni futura modifica a skill o modello resta un'opinione (e il prossimo
«troppo ripetitivo» lo scoprirà di nuovo un umano a valle).
1. **`eval-copy.mjs`** (~150 righe, scheletro = `calibrate-critic.mjs`): esegue la
   skill copywriter sui brief A/B fissi → gate deterministici esistenti
   (`validateCopyArtifact` + `check-slop`) → confronto con attese versionate.
2. **Gold set copy** (10–15 copy.json etichettati da Mattia — le coppie pre/post del
   ciclo anti-ripetizione sono già in git history come boccia/passa gratis) →
   κ e recall(boccia) del copy-critic col runner esistente. Stesso schema per
   image-critic partendo dagli scarti/ok reali di `image-review.json`.
3. **Metriche di run in client.json** (`{round, durataMs, esito, fasi[]}` — i dati
   transitano già negli eventi di run-step): senza, né costi né convergenza dei
   loop sono osservabili.
4. **Ratifica umana dell'audit di ferro**: `audit.json` dice `decisoDa: Claude (delega)`
   — per il piano è il checkpoint di GUSTO umano E la prova di contributo umano
   (titolarità). Rieseguire il pairwise (i 2 iframe sono rieseguibili), registrare
   la ratifica, e policy: `publish-preset.mjs` rifiuta audit non ratificati da umano.

### P1 — sensori mancanti ad alto segnale
5. **Base condivisa di promesse standard vietate** (cantiere pulito, prezzi
   trasparenti, tempi, garanzie) nel context-enricher: oggi la lista è riderivata
   per-cliente, quindi «cantiere pulito e ordinato» era vietato per cavaliere e
   libero per costruzioni.
6. **check-polish deterministico** (PHASE 7 di design-system.md mai partita):
   emoji nel copy/sezioni, inglese residuo («all rights reserved», «terms»…),
   doppi spazi — i difetti più imbarazzanti davanti al cliente sono i più economici
   da controllare. Dichiarare in design-system.md quale dei 24 punti è coperto da
   quale sensore.
7. **Slop-gate anche alla conferma/salvataggio umano del copy** (oggi PUT/POST
   confermano senza check-slop: un edit a mano può reintrodurre ciò che il gate
   aveva tolto). Warning non bloccante in UI.
8. **Stream abbandonato** → stato `in_corso` perpetuo e child claude orfano:
   AbortSignal della route → kill del child + stato `errore`.
9. **Gate «byte-identici»**: i round di correzione lo chiedono nel prompt ma nessun
   sensore verifica che gli slot non toccati siano rimasti identici (diff cheap
   pre/post fase).
10. **Regenerare gli shot di calibrazione per ferro + baseline novelty** (ora il
    fail-fast lo segnala; il percorso è documentato nell'errore stesso).

### P2 — qualità dell'output visibile
11. **Le 4 sezioni-prova a maggior resa** (BeforeAfter P0 del settore, Certifications,
    Incentives, ProblemAgitation): il funnel PAS resta monco e i siti edilizia
    escono senza le prove più persuasive (prima/dopo, SOA, bonus). È il debito
    «8 tipi senza componente» — 4 tocchi ciascuno.
12. **Slot gallery condizionali** (oggi il copywriter scrive 8 slot che l'assembler
    droppa quando non ci sono foto reali, con claim «foto reali» a rischio onestà).
13. **Build parziale riconoscibile**: watermark/badge «ANTEPRIMA» nella dist parziale
    — oggi una demo con foto stock fuori mestiere e placeholder è indistinguibile
    da un sito finito (il caso cavaliere: salotto per «impermeabilizzazioni», stessa
    foto su 2 card per il resize clone-ultimo).
14. **Nome breve display** per ragioni sociali lunghe (navbar tronca con ellissi) e
    **normalizzazione indirizzo** (title-case, città+provincia) nell'intake.
15. **Microcopy form parametrizzato** («Dove si trova l'immobile», «Descrizione dei
    lavori» sono edilizia-specifici hardcoded in ContactCTA: per un idraulico o un
    fotovoltaico suonano storti).

### P3 — igiene e coerenza
16. Allineare gli agent files (.claude/agents/*.md) alle skill (rubriche citate
    inesistenti, policy gallery stale); staleness per copy-review.json (recensione
    di un copy che non esiste più: registrare l'hash del copy giudicato);
    riconciliare il contesto di costruzioni con l'intake corretto; ack una-tantum
    dei falsi ⚠ da migrazione hash; UIClip fuori dal percorso caldo del run finché
    la separazione non supera il 20%; aggiornare il diagramma di
    `agents-skills-plan.md` con lo step contesto; marcare `generated-site-A.json`
    come storico-INVALIDO nel file stesso.

## Dati della revisione

- Findings completi (76) e verdetti (29): transcript workflow `wf_9c8fdf53-081`
  (mappa) e `wf_c1d35866-466` (verifica) nella sessione Claude del 2026-07-11.
- Trace lette: `out/{cavaliere-build-srls, costruzioni-generali-…, zz-test-immagini}/`
  (intake→contesto→palette→copy→review→immagini→site.json→dist).
- Ispezione visiva: full-page Playwright 390/1280 delle dist dei 2 clienti reali.
