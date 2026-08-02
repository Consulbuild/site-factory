# Piano: scheda «Legale» dell'editor (Fase C) — step `legale` + catena avversariale

> Nota per chi implementa: primo atto dopo l'approvazione = copiare questo piano in
> `docs/piano-scheda-legale.md` e scrivere `.claude/scope.json` col perimetro elencato
> in fondo (regola 8). Poi seguire la skill **harness-build** (piano come contratto
> vivo, un passo alla volta, sezioni [viva] aggiornate a ogni arresto).

## Scopo

Portare nell'editor il flusso legale che per Cavaliere Build (21/07/2026) è stato
manuale: generare i 3 documenti legali del sito — privacy policy (`/privacy`), termini
e condizioni (`/termini`), informativa breve sotto il form — dai SOLI dati del cliente,
farli passare da gate deterministici + una catena di verificatori avversariali (quella
che ha intercettato il foro sbagliato Milano→Monza), e consegnarli al checkpoint umano
come `legale.json` + `legale-report.md`, con staleness e update-mode come gli altri
step. Un errore legale pubblicato sul dominio del cliente è un danno, non
un'imprecisione: il costo d'errore qui è il più alto della pipeline, quindi il sistema
di controllo È il progetto. Bar di qualità: l'output del flusso manuale Cavaliere
(golden di riferimento su disco).

## Progress [viva]

- [~] 2026-08-02 M0: PARZIALE — skill installate in ~/.claude/skills/ + voce in
  ~/.claude/CLAUDE.md (fatto, verificato: discoverable); probe headless BLOCCATI
  da OAuth scaduta (vedi Sorprese) → da rilanciare prima di M2
- [x] 2026-08-02 M1: contratti e nucleo deterministico + integrazioni meccaniche —
  VERIFICATA: `tsc` 0 errori; `npm run build` verde; `test-legale-gates.ts`
  42/42 (piantati bocciati col messaggio atteso, caso «Via Milano 89» non
  scatta, roundtrip converter sul golden riproduce i blocchi, golden passa il
  gate coi dati reali); hub live su :3311 → Cavaliere «Apri legale»
  (da_verificare), altro cliente «Genera documenti legali» (assente)
- [ ] M2: step `legale` generate end-to-end (senza catena)
- [ ] M3: catena avversariale + correzioni mirate + review
- [ ] M4: scheda UI (studio /impeccable → build → critique/polish)
- [ ] M5: staleness fine + update-mode + build a valle
- [ ] M6: eval E2E + documentazione + chiusura

## Sorprese & Scoperte [viva]

- 2026-08-02 M0: **OAuth CLI scaduta** — i 3 probe headless falliscono con «Failed
  to authenticate: OAuth session expired and could not be refreshed» (probe 1 e 2;
  il 3 ha avuto anche un errore di quoting zsh nel comando, da rilanciare con
  prompt-da-file `claude -p "$(<file)"`). Serve `claude login` di Mattia in un
  terminale: prerequisito documentato della fabbrica (CLAUDE.md Parte 1), nessun
  workaround legittimo. Installazione skill invece COMPLETATA e verificata (le due
  skill compaiono nella lista skill di sessione). I probe si rilanciano appena
  l'auth torna, comunque PRIMA di M2 (criterio promozione/scarto invariato).

## Decision Log [viva]

- 2026-08-02 (piano): **niente raccolta REA/PEC/capitale sociale** — decisione di
  Mattia: i clienti della nicchia sono piccole imprese per cui oggi non servono.
  Niente artifact né UI di dati societari; le skill omettono le righe condizionali
  (comportamento già validato su Cavaliere); il report mantiene la nota «Campi
  mancanti» per le società di capitali (costo zero, traccia onesta). Se la nicchia
  cambierà, si aggiungerà allora la raccolta.
- 2026-08-02 (M1): **`lib/legale.ts` usa import con estensione `.ts` e definisce
  localmente `hashValue` (stessa formula di staleness, 12 hex)** — regola di casa
  documentata in slots.ts: i moduli usati dagli script girano via
  `node --experimental-strip-types`, che richiede estensioni esplicite;
  `staleness.ts` non è importabile fuori da Next (import senza estensione) ed è
  fuori perimetro. Alternativa scartata: correggere staleness.ts (allargamento
  silenzioso del perimetro, vietato dalla regola 8). Gli hash fonte restano
  auto-consistenti (si confrontano solo tra loro).
- 2026-08-02 (M1): **fixture del banco di prova FITTIZIE** (Prova Edile S.r.l.s.):
  i dati reali dei clienti non entrano in git — il golden Cavaliere si legge da
  `out/` a runtime e i suoi check si saltano sulle macchine senza dati.

## Contesto e orientamento

Repo: `/Users/mattia/Claude Projects/Site-factory`. Due package: `site-renderer/`
(Astro, il motore) e `site-factory-editor/` (Next.js 16 — ATTENZIONE: breaking
changes vs training data, leggere `node_modules/next/dist/docs/` prima del codice
UI). I dati cliente vivono in `site-renderer/out/<slug>/` (fuori git, sync Drive).

**Già FATTO e immutabile (commit 649b46d)** — il lato consumo:

- Contratto Zod `site.legal` in `site-renderer/src/lib/schema.ts:597-634`:
  `LegalSchema = { privacy: LegalDoc, termini: LegalDoc, formNotice: string }`,
  `LegalDoc = { intro (default ""), updatedAt "GG/MM/AAAA", blocks[] }`, blocchi
  `h2 {text} | p {text} | ul {items[]}`; inline SOLO `**bold**` e `[testo](url)`
  resi da `renderLegalInline()` (`src/lib/ui.ts:40-51`).
- `assemble-site.ts --legale <file>`: monta il file tal quale in `site.legal`;
  unico gate `parseSiteConfig` in coda. `site-factory-editor/lib/build.ts:114-116`
  passa GIÀ `--legale` se `out/<slug>/legale.json` esiste → lo step nuovo si
  aggancia senza toccare il wiring del build (solo l'upstream di staleness, M5).
- Rendering: `privacy.astro`/`termini.astro` rendono i blocchi + «Ultimo
  aggiornamento» senza banner anteprima; `ContactCTA.astro:193-206` rende
  `formNotice` sotto il form (il link a `/privacy` deve stare DENTRO la stringa).
  Senza `legal` → esempio hardcoded col banner (gli altri clienti non cambiano).
- Golden reale: `site-renderer/out/cavaliere-build-srls/legale.json` (privacy 20
  blocchi/9 sezioni; termini 21 blocchi/8 sezioni, con un `p` di apertura PRIMA del
  primo h2; formNotice = UNA stringa di 593 char, prosa piatta con bold e 2 link) +
  `legale-report.md` (8 sezioni: profilo usato, norme verificate, note per Mattia,
  campi mancanti, checklist, esito verifica avversariale, disclaimer).

**Da COSTRUIRE** — il lato produzione: non esiste `StepKey "legale"`, né
`steps.legale` in `client.json`, né scheda, né validatore editor, né staleness, né
skill legali installate, né traccia strutturata della catena.

**Generatori** (3 fonti, una per documento):

| Documento | Generatore | Dove |
|---|---|---|
| Termini e condizioni | skill `tc-sito-it` | `~/Downloads/skills/` → da installare in `~/.claude/skills/` (M0) |
| Informativa breve form | skill `informativa-breve-form` | idem |
| Privacy estesa (art. 13) | tool MCP `genera_informativa_privacy` | server `legal-it` (user-scope, Connected anche per la CLI: verificato) |

Fatti verificati sulle skill (audit: PULITE — unico script `scripts/validate.py`,
import solo re/sys, zero rete/exec-bit; non auto-eseguito):

- `tc-sito-it`: template md rigido (`assets/template_tc.md`) con H1, blocchi
  condizionali `<!-- INCLUDI SE -->`, sottosezioni `### 3.1`, blockquote
  «Avvertenza» e footer in corsivo PRIMA della coda; coda che inizia con
  `## Riferimenti normativi (citati nel documento)` (il marker di split è quindi
  un PREFISSO, non la stringa esatta). Richiede `titolare{denominazione, forma,
  sede, email, partita_iva}`, `sito.url`, `foro.citta`, `pubblico_b2c` (true →
  clausola consumatore art. 66-bis cod. cons.); REA/PEC righe solo-se-presenti;
  STOP hard se `vende_online`; rinumerazione continua delle sole sezioni incluse.
- `informativa-breve-form`: informativa primo livello per il form contatti
  (`moduli: ["contatti"]`, `informativa_estesa_url: "/privacy"`,
  `tipo_form_contatto: "preventivo_appuntamento"` → base art. 6.1.b, NIENTE
  checkbox consenso). Il suo md è heading+paragrafo+bullet: NON è convertibile
  meccanicamente nella stringa unica del contratto → la fase produce ANCHE la
  stringa piatta come output primario (vedi flusso).
- `validate.py` (5 check: `{{}}` residui, marker INCLUDI, numerazione progressiva,
  disclaimer, harvest `[___]`/`[DA VERIFICARE]`) NON viene invocato dallo step: le
  correzioni avvengono post-conversione su `legale.json` e un secondo validatore
  sui md andrebbe in drift garantito. I suoi 5 check sono ASSORBITI dal gate unico
  TS sui blocchi (sotto). Lo script resta nelle skill per l'uso manuale.
- Tool MCP `genera_informativa_privacy(titolare, finalita[], basi_giuridiche[],
  categorie_dati[], destinatari[], periodo_conservazione, …)` → `{testo}` PLAIN
  TEXT a sezioni MAIUSCOLE con numerazione fissa CON BUCHI (4→7 se dpo/
  trasferimenti vuoti): la fase privacy riformatta nel formato house e RINUMERA
  1..n (la lente anti-invenzione whitelista esplicitamente la rinumerazione come
  non-invenzione).

**Lezioni Cavaliere istituzionalizzate** (memoria `legale-fase3-lezioni` + report):

1. **Foro dal CIRCONDARIO del tribunale, mai dalla provincia.** Verificato ora:
   `mcp__legal-it__cerca_ufficio_giudiziario` risolve i capoluoghi (Monza →
   Tribunale di Monza) ma NON i comuni minori (Cologno Monzese → `trovato:false`).
   La derivazione è UNA, protocollata e con evidenza (fase «foro», sotto); i
   controlli a valle verificano l'evidenza e la coerenza, non ri-derivano alla
   cieca (stesso modello + stessi tool = indipendenza finta).
2. **REA/PEC/capitale: non si raccolgono** (Decision Log 2026-08-02). La forma
   giuridica si INFERISCE con regex dalla denominazione (S.r.l./S.p.A./S.n.c./… →
   `societa`; nessun suffisso → `ditta_individuale`); inferenza incerta → nota nel
   report, degrado sicuro (le righe condizionali si omettono). `pubblico_b2c` =
   costante `true` (clausola consumatore sempre presente: innocua per B2B, dovuta
   per B2C). La denominazione visualizzata nei documenti = `brief.ragioneSociale`
   verbatim: il punto di cura del nome è la scheda Intake, non una nuova UI.
3. **La catena avversariale ha trovato 1 bloccante reale** (foro) e il report ha
   registrato anche le osservazioni respinte con motivo («fedeltà al modello
   validato delle skill») → si replica con review persistita e stesso principio:
   le skill sono il modello validato, i verificatori non impongono gusto.

**Architettura editor da riusare** (verificata sul codice):

- Step = entry in `lib/steps.ts` `STEPS` (`StepDef = {stateKey, artifact, upstream,
  gate?, run, validate, afterSuccess?}`); fasi orchestrate in `run()` col seam
  `io.claude({phase, prompt, allowed, disallowed, timeoutMs, maxTurns})` (spawn
  `claude -p … --model claude-opus-4-8 --effort xhigh`, cwd = root repo, skill
  invocata nel prompt + tool `Skill` in allowed) e `io.script(...)` per le fasi
  deterministiche. Errori = valore di ritorno. Route run generica (`MODES` include
  già `generate|update|critic`), bus/status-bar/stop/zombie: GRATIS.
- Pattern copy da imitare: gate deterministico con UNA correzione claude poi fail
  (`formatGate`), review JSON timbrata (`stampReview`, già generica su file+
  artifact), correzioni mirate con byte-check (`verificaByteIdentici`, da adattare
  ai 3 documenti top-level), `MAX_ROUNDS` poi consegna comunque col FAIL visibile,
  `afterSuccess` che snapshotta upstream+fonte, `copyFonte`/`copyFonteCambiati`
  come modello della fonte per-area (~15 righe da replicare).
- Staleness: `computeUpstream`/`staleFiles`/`hashValue` (`lib/staleness.ts`);
  ack generico `steps/[step]/ack-upstream` (estendere il cast a riga 27).
- Schema stato: `lib/schemas.ts` — nuova chiave `steps.legale` con
  `.default({stato:"assente"})` (pattern verificato: zero migrazioni).
- UI: ricetta DESIGN-SYSTEM.md §12 + pattern `copy/page.tsx` (biforcazione
  runner/editor), `use-step-run`+`RunLog`, pannello critico con ancore, action bar
  fissa, guardia unsaved, `ConfirmDialog` (per l'override basta `tone="danger"`
  con findings visibili — niente conferma digitata, pattern inesistente altrove).
- Conferma umana: route `PUT` (salva con 422) + `POST` (conferma → `verificato` +
  snapshot upstream/fonte), pattern `copy/route.ts`.
- Migrazione: `fillLazySteps` (`lib/clients.ts:89-101`) riconosce il `legale.json`
  pre-GUI di Cavaliere come `da_verificare` (staleness senza snapshot → `[]`).

## Architettura

**Pattern: workflow (prompt chaining) con gate deterministici tra i passi.** I passi
sono prevedibili e sempre uguali; niente agente, niente routing. Alternative
scartate: agente autonomo (passi prevedibili); critico unico onnicomprensivo (le
rubriche strette e separate sono ciò che ha intercettato il foro; un giudizio
olistico nasconde i difetti); generazione diretta dei blocchi senza md intermedio
(perderei la fedeltà ai template validati delle skill); parallelizzazione delle
fasi (il seam è sequenziale; ~7 fasi per run una-tantum per cliente non la
giustificano — knob futuro: le 3 fasi documento sono l'unico punto di taglio).

**La catena Cavaliere a 4 lenti si preserva così** (scelta esplicita da approvare):
anti-invenzione, conformità-skill e refusi restano TRE verificatori LLM separati
(persone e rubriche diverse; ri-verifica selettiva per lente fallita); la lente
**resa** diventa DETERMINISTICA — prova di montaggio con il validatore REALE del
renderer + regole di resa a codice (markdown residuo, bold/link bilanciati, URL
ammessi, numerazione) — perché tutti i suoi check sono meccanici; il giudizio
visivo umano resta nell'anteprima del Build step, dove già esiste. Un check a
codice che copre la stessa superficie di un critico LLM è più affidabile e gratis
(regola 1 del sistema di qualità harness-plan).

**Assunzioni sul modello** (da ri-verificare a ogni release): non sa i circondari
dei comuni minori (derivazione strumentata con evidenza); inventa fatti plausibili
su profili incompleti (profilo builder deterministico + exact-match); non converge
oltre 2-3 round (budget rigido); manomette il Markdown più del JSON (canonico =
`legale.json`, conversioni in TS, correzioni sui blocchi).

### Dati e artifact (in `out/<slug>/`, fuori git)

- `foro.json` (NUOVO, piccolo, machine-readable): `{foro, fonte, url, evidenza,
  confidenza: "alta"|"bassa"}` — scritto dalla fase «foro», mostrato in scheda,
  usato dal gate; NON può stare in `legale.json` (contratto immutabile).
- `legale-src/*.md` + `report-fragments.json`: output md completi delle fasi
  (documento + coda) e frammenti strutturati per il report. Provenienza
  WRITE-ONCE: diventano stale al primo fix sui blocchi — il report lo dichiara.
- `legale.json`: il CANONICO (contratto renderer). Da qui in poi tutto (gate,
  lenti, correzioni, edit UI) opera sui blocchi.
- `legale-review.json`: `{verdict, round, lenti: {antiInvenzione, conformita,
  refusi} (PASS/FAIL ciascuna), findings: [{lente, doc, path, gravita, problema,
  fix}], giudicatoSu}` — i `path` tipo `privacy.blocks[7]` sono ANCORE UI, non lo
  scope del byte-check (che è per-documento).
- `legale-report.md`: assemblato in TS da `report-fragments.json` nello schema del
  report Cavaliere (profilo usato, derivazione foro con fonte/URL/evidenza, norme
  verificate, note, campi mancanti — inclusa la nota società di capitali senza
  REA —, checklist, esito catena con osservazioni respinte, disclaimer). Il
  disclaimer «non costituisce consulenza legale» vive QUI, mai nei documenti
  pubblicati (il golden lo conferma).
- `client.json steps.legale`: `{stato, errore?, upstream: {"brief.json": hash},
  fonte: {identità|sede|recapiti: hash}, ultimaRun}`.
- Niente `societari.json`, niente `legale-profilo.json`: il profilo (client_profile
  delle skill + parametri MCP) si calcola in TS e si EMBEDDA nei prompt; le
  costanti d'agenzia (finalità, categorie dati, destinatari, conservazione «12
  mesi senza seguito», campi form nome/telefono obbligatori, `informativa_estesa_url
  = "/privacy"`, Umami cookieless prospettico, `sito.url` = dominio da
  `steps.build` se noto altrimenti «il presente sito web») vivono come modulo
  costanti in `lib/legale.ts`, validate una volta qui — sono lo standard Cavaliere.

### Flusso del run (mode `generate`)

```
[TS]      gate: steps.intake.stato === "verificato"
[TS]      profilo inline: brief + inferenza forma + costanti d'agenzia (zero AI)
[claude]  «foro» — protocollo: cerca_ufficio_giudiziario; se trovato:false →
          OBBLIGO di WebFetch della pagina circondario del tribunale con citazione
          VERBATIM dell'elenco comuni + URL; fonti discordanti → confidenza
          "bassa" con entrambe le evidenze → scrive foro.json
[claude]  «privacy» — genera_informativa_privacy coi parametri del profilo →
          riformatta nel md house-format: SOLO `## N. Titolo` rinumerati 1..n
          senza buchi, paragrafi, liste piatte, **bold**, [link](url); VIETATI
          ###, tabelle, blockquote, corsivo → legale-src/privacy.md
[claude]  «termini» — Skill tc-sito-it sul profilo → legale-src/termini.md
          (fedele al template della skill: H1, ###, blockquote ammessi — li
          gestisce il converter)
[claude]  «informativa breve» — Skill informativa-breve-form → md per il report
          E la STRINGA PIATTA come output primario (un paragrafo, niente newline)
[TS]      converter md→blocks con set CHIUSO di 6 regole (dai template reali):
            split a PREFISSO su «## Riferimenti normativi»; nel lato doc:
            righe `> ` e righe solo-corsivo → report, mai blocks; `# H1` scartato
            (il titolo lo mette la pagina); testo prima del primo `##` → blocchi
            `p` (golden: il primo block dei termini È un p); `### X` →
            `{type:"p", text:"**X**"}`; tabelle/HTML/liste annidate → errore hard
          + timbri TS: updatedAt = oggi GG/MM/AAAA; intro templatizzati
          (privacy: costante «Ai sensi dell'art. 13…»; termini: «Condizioni d'uso
          del sito web di ‹denominazione›» — è il golden)
[TS]      GATE UNICO deterministico (assorbe validate.py + exact-match + resa):
            niente `{{}}`, `[___`, marker INCLUDI; numerazione h2 `^\d+\. ` 1..n
            progressiva; disclaimer PRESENTE nei frammenti report e ASSENTE nei
            blocchi; harvest `[DA VERIFICARE]` → report; exact-match normalizzati
            (P.IVA digits-only; tel: display libero ma href tel: digits-only ==
            brief; email case-insensitive; denominazione == brief normalizzata);
            foro nei documenti == foro.json MA cercato SOLO nella sezione «Legge
            applicabile e foro» (match sull'h2 — l'indirizzo può contenere «Via
            Milano» e non deve scattare); formNotice: stringa singola senza
            newline, contiene denominazione + «art. 6» + [..](/privacy) + finalità
            + conservazione + diritti + Garante, tetto 800 char; bold/link
            bilanciati; URL ammessi solo mailto:|tel:|/|https
          → su fail: UNA correzione claude (pattern formatGate) → ri-gate → fail
          → scrittura legale.json
[script]  prova di montaggio: assemble --legale su site.json temporaneo +
          validate-site (il validatore REALE del renderer, ~secondi: niente
          specchio che driftare, niente parity script)
[claude]  lente 1 «anti-invenzione + citazioni» — verifica_citazioni su OGNI
          norma citata; ogni fatto tracciabile a brief/foro.json/costanti;
          CONTROLLO EVIDENZA foro (la citazione verbatim in foro.json contiene
          davvero il comune? il doc cita quel foro?), con facoltà di spot-check
          dell'URL; whitelist: la rinumerazione non è invenzione. Qualsiasi
          invenzione = bloccante
[claude]  lente 2 «conformità-skill» — regole di SKILL.md + references/normativa:
          clausola foro b2c (66-bis), limiti art. 1229, niente doppia
          sottoscrizione simulata, rinumerazione continua, base 6.1.b per form
          preventivo, blocchi condizionali coerenti con la forma giuridica
[claude]  lente 3 «refusi/coerenza» — typos, grammatica, terminologia coerente
          TRA i 3 documenti (registro «tu» informativa vs impersonale T&C =
          scelta dei template, NON un errore)
[TS]      aggregazione: bloccanti? → [claude] «correzioni» sui SOLI documenti
          citati (byte-check: le 3 chiavi top-level come slot; i documenti non
          citati restano JSON-identici) → ri-gate unico → SOLO lenti fallite.
          MAX 2 round, poi consegna con FAIL visibile: decide l'umano
[TS]      report builder → legale-report.md; stampReview su legale-review.json
```

Modes: `critic` = sole 3 lenti sullo stato corrente («Riverifica» dopo edit
manuali, senza rigenerare); `update` = M5. Spawn per run generate: 7 nel caso
buono (foro, privacy, termini, breve, 3 lenti), ~11-12 nel caso peggiore.

**Tool per fase (least privilege)**: foro: `Read, Write,
mcp__legal-it__cerca_ufficio_giudiziario, WebSearch, WebFetch`; privacy: `Read,
Write, mcp__legal-it__genera_informativa_privacy`; termini/breve: `Read, Skill,
Write`; lente 1: `Read, Write, mcp__legal-it__verifica_citazioni, WebFetch`;
lenti 2-3 e correzioni: `Read, Write` (la lente 2 legge le SKILL.md installate
via Read con path assoluto). Sempre disallowed: `Bash, Edit, Task` (+ rete dove
non serve). Mai segreti in prompt/argv.

### Scheda UI (`app/clienti/[slug]/legale/`)

Biforcazione runner/editor come copy. Editor: **striscia profilo legale**
(sola lettura: forma inferita, foro derivato con fonte/URL/confidenza, base
giuridica — l'operatore VEDE su cosa poggiano i documenti); i **3 documenti** come
editor a blocchi (textarea per blocco p/h2, righe per ul — pattern
ScalarField/ArrayRows; ancore `#blocco-privacy-7` dai findings); **pannello
review** (verdetti per lente, finding con «vai al blocco →», bottone «Riverifica»
= mode critic); **report** renderizzato; **banner staleness** con
Aggiorna/Rigenera/Va bene così; action bar **Salva** + **Conferma legale**.
Conferma abilitata solo con review presente, `giudicatoSu` == hash corrente,
verdict PASS e `foro.confidenza === "alta"`; altrimenti serve Riverifica oppure
override con `ConfirmDialog tone="danger"` che mostra i finding aperti (per la
confidenza bassa: la scelta esplicita del foro da parte dell'operatore). Studio
UX `/impeccable` PRIMA di costruire, critique/polish nel browser su entrambi i
temi DOPO (regola 3).

## Sistema di qualità

- **Gate deterministici** (sempre, prima dei giudizi): gate d'ingresso (intake
  verificato); converter a regole chiuse con errore hard sui costrutti fuori set;
  gate unico post-conversione (placeholder, numerazione, disclaimer nel posto
  giusto, exact-match normalizzati, foro per-sezione, formNotice, inline/URL);
  prova di montaggio col validatore reale del renderer; UNA correzione claude per
  gate poi fail (pattern esistente).
- **Critici**: 3 lenti LLM con rubriche brevi a verdetti binari con ancore
  comportamentali; bloccanti automatici senza discrezionalità (fatto non
  tracciabile, norma inesistente, evidenza foro incoerente, placeholder). Chi
  genera non giudica: le lenti non vedono i prompt di generazione, solo artefatti
  + fonti di verità. Budget: 2 round di correzioni mirate per-documento, poi
  umano. Escalation: consegna con FAIL visibile, Conferma bloccata salvo override
  esplicito coi finding davanti.
- **Anti-invenzione a monte**: profilo deterministico embeddato (l'AI non sceglie
  i fatti), template rigidi delle skill, updatedAt/intro timbrati dal TS,
  correzioni vincolate per-documento, `brief.ragioneSociale` come unica fonte del
  nome (curato nella scheda Intake).
- **Eval** (M6): fixture `zz-eval-*` in `out/` (in coda alla lista, cancellabili):
  clone Cavaliere (golden diff: outline h2 identico, foro Monza con evidenza,
  fatti exact-match, catena PASS — NON byte-uguale: l'LLM non è deterministico) +
  ditta individuale senza suffisso societario + comune minore di altro
  circondario. `scripts/test-legale-gates.ts` con casi piantati che DEVONO
  fallire: foro «Milano» nella sezione foro con sede a Cologno M. (bocciato) MA
  sede «Via Milano 89» con foro «Monza» (NON bocciato — il falso positivo
  dell'indirizzo), P.IVA alterata, `{{placeholder}}`, blocco `> ` residuo,
  formNotice multilinea, numerazione con buco (4→7 stile MCP), disclaimer dentro
  i blocchi. Set bilanciato: i buoni passano, i cattivi bocciati col messaggio
  giusto.
- **Calibrazione**: il giudizio di riferimento è Mattia al checkpoint; il report
  registra le osservazioni respinte con motivo — materiale per calibrare le
  rubriche (harness-optimize, dopo qualche cliente reale).

## Piano di lavoro: milestone

**M0 — Installazione skill + prototipo headless (de-risk).** Copiare `tc-sito-it/`
e `informativa-breve-form/` da `~/Downloads/skills/` in `~/.claude/skills/`
(bare-skill convention: cartella con SKILL.md, kebab-case, senza `.DS_Store`;
sync.sh non le tocca — verificato); aggiungere la voce in `~/.claude/CLAUDE.md`
§Installed skills con la nota di audit. Poi provare headless le tre incognite:
(1) `claude -p` con `--allowedTools mcp__legal-it__cerca_ufficio_giudiziario`
risolve Monza; (2) `genera_informativa_privacy` headless restituisce `testo`;
(3) derivazione foro per Cologno Monzese via WebFetch produce «Monza» con URL e
citazione verbatim. Accettazione: transcript dei tre run nello scratchpad coi
tool call riusciti; `ls ~/.claude/skills/` mostra le due skill. Promozione/
scarto: se i tool MCP non funzionano in `-p`, FERMARSI e ridisegnare la fase
privacy (fallback: invocare le funzioni del server via `io.script` col suo venv)
prima di M2.

**M1 — Contratti + nucleo deterministico + integrazioni meccaniche.** Creare
`lib/legale.ts`: specchio Zod di LegalSchema (per i 422 della PUT — il bound vero
resta la prova di montaggio), tipi foro/review, costanti d'agenzia, inferenza
forma, profilo builder (output inline), split+converter (6 regole), gate unico,
`legaleFonte()` (3 aree con `hashValue`), byte-check per-documento. Integrazioni:
`StepKey`+entry in `steps.ts`, `steps.legale` in `schemas.ts` (`.default()`),
default+`fillLazySteps`+`readClientBundle` in `clients.ts`, cast in
`ack-upstream/route.ts:27`, identità agente in `agenti.ts`, riga hub in
`app/clienti/[slug]/page.tsx`. `scripts/test-legale-gates.ts` coi casi piantati.
Accettazione: `npx tsc --noEmit` pulito; da `site-factory-editor/`:
`node --experimental-strip-types scripts/test-legale-gates.ts` → tutti i piantati
bocciati col messaggio atteso e i buoni passano (incluso il caso «Via Milano
89»); il converter applicato a `legale-src` ricostruiti dal golden riproduce
l'outline del golden; l'hub di Cavaliere mostra Legale `da_verificare`
(artifact pre-GUI), l'altro cliente `assente`.

**M2 — Step generate end-to-end (senza catena).** `legaleRun` in `steps.ts`: fasi
foro→privacy→termini→breve→converter+gate→montaggio, scrittura foro.json +
legale.json + legale-src/ + report. `validate(slug)` = specchio Zod + gate unico
riletti. `afterSuccess` = upstream+fonte. Accettazione: run su
`zz-eval-cavaliere` (clone) produce legale.json con foro «Monza» e fonte nel
report; `assemble --legale` + `validate-site` escono 0; rilanciare due volte non
corrompe nulla (sovrascrittura pulita); un secondo cliente ditta individuale
genera senza righe REA/PEC e senza placeholder.

**M3 — Catena avversariale + correzioni.** Le 3 lenti come fasi, review timbrata,
aggregazione, correzioni per-documento con byte-check, MAX 2 round, mode
`critic`. Accettazione: sul clone con foro piantato «Milano» la catena produce
FAIL con finding della lente anti-invenzione che nomina foro ed evidenza; dopo la
correzione il foro è «Monza», i documenti non citati sono JSON-identici al
pre-correzione, verdict PASS; un edit manuale di un blocco + «Riverifica» (mode
critic) aggiorna `giudicatoSu` senza rigenerare nulla.

**M4 — Scheda UI.** Studio UX `/impeccable` (shape) PRIMA; poi pagina+componenti
(runner, striscia profilo, editor blocchi, review, report, staleness, conferma),
route `PUT/POST /api/clients/[slug]/legale`, critique/polish nel browser su
entrambi i temi. Leggere le guide Next in `node_modules/next/dist/docs/` prima
del codice. Accettazione: da un cliente con intake verificato parto con «Genera»
e la status bar mostra le fasi reali; a fine run vedo documenti, report, review e
striscia profilo con foro+fonte; un finding cliccato scrolla e illumina il
blocco; Salva con blocco vuoto → 422 in italiano con «vai al campo»; Conferma
disabilitata finché review non è PASS sull'hash corrente (e confidenza foro
alta); override FAIL → ConfirmDialog danger coi finding; tsc + `npm run build`
verdi; AA su entrambi i temi.

**M5 — Staleness fine + update-mode + build a valle.** `upstream =
["brief.json"]`; `fonte` = 3 aree; mappa area→documenti: identità → tutti e 3;
sede → privacy+termini (indirizzo + ri-derivazione foro); recapiti → tutti e 3
(niente area «dominio»: i T&C usano «il presente sito web» — YAGNI). Mode
`update`: rigenera SOLO i documenti impattati (gli altri JSON-identici, stesso
byte-check), ri-gate + catena sui rigenerati, sezione «aggiornamento» appesa al
report; il banner dice che gli edit manuali dei documenti rigenerati si perdono.
`legale.json` aggiunto all'upstream dello step build. Accettazione: correggo la
sede nell'intake → badge ⚠ su Legale; «Aggiorna» rigenera privacy+termini con
foro ri-derivato e formNotice byte-identica; il build risulta stale dopo un
update confermato; «Va bene così» ri-snapshotta e spegne il banner.

**M6 — Eval E2E + documentazione + chiusura.** Le 3 fixture complete, run E2E,
golden diff; aggiornare `docs/DEBUG.md` (mappa sintomo→file del legale),
`docs/handoff-fase-c.md`, `CLAUDE.md` §Fase C; rimozione fixture da `out/`;
retrospettiva nel piano. Accettazione: i comandi di verifica (sotto) tutti
verdi; i documenti aggiornati nominano lo step legale; `out/` senza `zz-eval-*`.

Commit e push (regola 7): a ogni milestone VERIFICATA, non a fine lavoro. I dati
in `out/` (incluse le fixture) restano fuori git.

## Idempotenza e recovery

Ogni run sovrascrive per intero i propri artifact; doppio avvio impedito da
`inFlight`; fase fallita → stato `errore`, si rilancia da capo (fasi stateless);
le correzioni non toccano documenti non citati (byte-check); la conferma umana è
l'unico punto che marca `verificato`; `legale-src/` è write-once e il report ne
dichiara la natura. Nessun backup pre-update dedicato: `out/` è sincato su Drive
(versioning) e il report elenca cosa è cambiato.

## Budget

- Run generate: 7 spawn opus-4-8 xhigh nel caso buono, ~11-12 nel peggiore
  (gate-fix + 2 round × fix+lenti), ~20-40 min wall — coerente col copy (10-30) e
  si lancia una volta per cliente. Zero API a pagamento (login Max, regola 4).
- Round: MAX 2 (il flusso manuale è convergito in 1). Update: 2-6 fasi.
- Timeout: generazioni 20 min (come copywriter), lenti 10 min (default).

## Verifica complessiva della scheda (per harness-build)

Da `site-factory-editor/` (con `export PATH="$HOME/.local/bin:$PATH"`):
`npx tsc --noEmit` → 0 errori; `npm run build` → verde;
`node --experimental-strip-types scripts/test-legale-gates.ts` → piantati
bocciati, buoni passati; run E2E sulle fixture `zz-eval-*` → accettazioni
M2/M3/M5; browser su entrambi i temi (critique/polish /impeccable). Il renderer
NON si tocca: nessun test visivo nuovo (pagine legali reali già coperte da
649b46d).

## Perimetro (per `.claude/scope.json` a piano approvato)

```json
{"task": "scheda Legale (step legale + catena avversariale)",
 "perimetro": [
  "docs/piano-scheda-legale.md",
  "site-factory-editor/lib/legale.ts",
  "site-factory-editor/lib/steps.ts",
  "site-factory-editor/lib/schemas.ts",
  "site-factory-editor/lib/clients.ts",
  "site-factory-editor/lib/agenti.ts",
  "site-factory-editor/lib/build.ts",
  "site-factory-editor/app/api/clients/[slug]/steps/[step]/ack-upstream/route.ts",
  "site-factory-editor/app/api/clients/[slug]/legale/route.ts",
  "site-factory-editor/app/clienti/[slug]/page.tsx",
  "site-factory-editor/app/clienti/[slug]/legale/**",
  "site-factory-editor/components/legale-runner.tsx",
  "site-factory-editor/components/legale-editor.tsx",
  "site-factory-editor/scripts/test-legale-gates.ts",
  "docs/DEBUG.md",
  "docs/handoff-fase-c.md",
  "CLAUDE.md"
 ]}
```

Fuori repo (esenti dallo scope-guard, dichiarati per trasparenza):
`~/.claude/skills/tc-sito-it/`, `~/.claude/skills/informativa-breve-form/`
(installazione M0) e `~/.claude/CLAUDE.md` (voce §Installed skills). Dati cliente
in `out/<slug>/` (esenti per design). Se serve un file non elencato: fermarsi e
chiedere (regola 8).

## Retrospettiva [viva]

(a fine lavoro)
