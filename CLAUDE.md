# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Regole di ingaggio (dettate da Mattia — vincolanti, non riderivare)

1. **La qualità è l'unico criterio**: niente scorciatoie per velocità; il bar è
   l'output di uno sviluppatore/copywriter/designer senior UMANO.
2. **Tool professionale multi-cliente**: l'editor serve a scalare l'agenzia — ordine
   nella memoria per-cliente, stati sempre coerenti, zero dati sporchi.
3. **Una scheda per volta, SEMPRE pianificando prima** (plan mode) e con **studio UX
   /impeccable PRIMA della UI** (poi critique/polish nel browser, entrambi i temi).
4. **Niente API Anthropic a pagamento**: gli step AI girano via `claude -p` headless
   col login Max (`--model claude-opus-4-8 --effort xhigh`), MAI `ANTHROPIC_API_KEY`.
5. **Niente invenzioni**: ogni claim tracciabile a contesto.json/form. Eccezione:
   le cortesie di norma di settore (preventivo/sopralluogo gratuito) sono consentite.
6. **Anti-ripetitività**: la big idea si rifrange (verbatim ≤2×), nessuna sequenza di
   3+ parole in >2 slot — il copy ripetitivo suona robotico e il cliente lo nota.
7. **Commit + push + backup sempre aggiornati** (rafforzata da Mattia 2026-07-12;
   estende il commit autonomo dell'11-07): a ogni fetta coerente **verificata**
   (verifiche/gate passano) Claude committa da solo — per milestone o fetta
   coerente, messaggio che spiega il perché — **e fa subito `git push`** su
   `origin` (GitHub privato `Consulbuild/site-factory`, remote ora configurato).
   Niente commit rumorosi per-file: si committa la fetta compiuta, non ogni Edit.
   I dati clienti (`out/`) restano fuori da git e si tengono aggiornati via il
   **sync nativo di Google Drive** (quando agganciato). Regola dura: **nessun
   lavoro resta solo-locale.** Vedi la memoria `backup-strategia`.

Stato lavori e prossimi passi: **`docs/handoff-fase-c.md`**.

Debug di una run (prompt/azioni/metriche/errori reali di ogni fase `claude -p`, clienti e
fabbrica): **`docs/DEBUG.md`** — la mappa «sintomo → file → cosa leggere».

## Comandi

Node è installato in `~/.local` (niente Homebrew): ogni shell deve prima fare

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Tutti i comandi girano da `site-renderer/`:

```bash
npm run dev      # anteprima live su http://localhost:4321
npm run build    # build statica in dist/
npm run preview  # serve la build
npm run check    # astro check (type-check)
```

Validare un site.json (o un blueprint) contro il contratto:

```bash
node --experimental-strip-types scripts/validate-site.ts <path-al-site.json>
```

Non c'è suite di test né linter: la verifica è `npm run build` verde + `npm run check`
+ il validatore qui sopra.

**Editor Fase C** (`site-factory-editor/`, Next.js 16 + React 19): il suo `CLAUDE.md`
importa solo un warning su Next.js, quindi i comandi stanno qui.

```bash
cd site-factory-editor
npm run dev      # editor su :3000 (spesso già attivo su :3311)
npm run build    # build Next
npx tsc --noEmit # type-check (la verifica standard per ogni scheda)
```

Attenzione: questa è una versione di Next.js con breaking changes rispetto ai dati di
training — prima di scrivere codice editor leggi le guide in `node_modules/next/dist/docs/`.
La verifica per scheda è `tsc --noEmit` + `npm run build` + eventuale parity check
(`scripts/parity-copy.ts`) + run E2E sui clienti reali in `site-renderer/out/`.

**Design della UI dell'editor**: il design system è
`site-factory-editor/DESIGN-SYSTEM.md` — LEGGERLO prima di costruire o toccare
qualunque scheda della dashboard (token, componenti condivisi in `components/ui.tsx`,
utility `card`, status bar agenti, regole AA/motion, ricetta per una scheda nuova).
È distinto da `docs/design-system.md` (che è il sistema dei 6 preset dei SITI
generati, non dell'editor). Lo studio che l'ha prodotto: `site-factory-editor/DESIGN-REFACTOR-2026-07.md`.

## Principio architetturale (non negoziabile)

**L'AI non scrive mai codice: produce solo un `site.json`** (sezioni + ordine + copy +
palette + URL immagini). Il renderer Astro lo trasforma in sito statico. La qualità vive
nei componenti curati a mano, mai nella generazione di markup.

## Flusso di rendering

1. `src/lib/schema.ts` — **il contratto dati (Zod), unica fonte di verità**. Union
   discriminata dei tipi di sezione; `parseSiteConfig()` valida il JSON; `PropsOf<T>`
   estrae le props tipizzate di una sezione.
2. `src/pages/index.astro` valida `blueprints/conversione-locale-v1/blueprint.json`
   (il golden example) e itera `sections[]`.
3. `src/lib/registry.ts` mappa `type` → componente in `src/sections/`.
4. `src/layouts/Base.astro` mette `data-preset` su `<html>`, inietta come CSS var inline
   solo i colori forniti dal cliente, carica i font del preset.
5. Sottopagine (`/privacy`, `/termini`, `/grazie`) passano da `src/layouts/SubPage.astro`:
   niente navbar, striscia di servizio con "← Torna al sito" + marchio cliccabile → `/#top`.
   Le pagine legali sono contenuti d'esempio (banner "Anteprima" rivolto al lead);
   la pipeline le sostituirà in Fase 3.

**Per aggiungere una sezione servono 4 tocchi**: schema in `schema.ts` (aggiungi alla
union), componente in `src/sections/`, entry in `registry.ts`, esempio nel blueprint.
Il componente riceve sempre `{ data, site, variant? }`.

## Blueprint + slot (il contratto con la pipeline AI)

Gli agenti NON generano un site.json da zero: riempiono gli SLOT di un blueprint
(`site-renderer/blueprints/`, vedi il suo README). `blueprint.json` è scheletro +
golden example (valida e builda da solo); `slots.json` dichiara quali path ogni
agente può toccare, con vincoli e guida. I budget di lunghezza del copy sono
duplicati per design: in `slots.json` come guida e in `schema.ts` (Zod) come
enforcement — se ne cambi uno, cambia l'altro.

Attenzione agli anchor di `ContactCTA`: con `showForm:true` la sezione ha
`id="contatti"` (il form preventivo), con `showForm:false` ha `id="canali"`
(la sezione contatti/canali diretti). La voce navbar "Contatti" punta a
`#canali`; le CTA "Preventivo gratuito" puntano a `#contatti`.

## Lo standard ConsulBuild (la base di design)

**`site-renderer/DESIGN.md` è la spec operativa del design standard** (con
`site-renderer/PRODUCT.md` per il contesto strategico): distillato dai siti consegnati
ai clienti reali, è la grammatica fissa che rende i siti riconoscibili — eyebrow con
lineetta, H2 maiuscolo con UNA frase in accent (marcatore `**...**` nel JSON, convertito
da `renderAccent()` in `src/lib/ui.ts`), ritmo scuro/chiaro (`.section-dark`), CTA
ricorrenti, processo numerato. Leggere DESIGN.md prima di toccare i componenti.

## Sistema di theming a token

Cascata definita in `src/styles/global.css`:

```
:root (LO STANDARD, = preset "meridian")  <  [data-preset="x"]  <  style inline su <html> (palette cliente)
```

- **6 style-preset** (stessi componenti, estetiche diverse, zero markup): `meridian`
  (= lo standard, default), `atelier` (minimal), `nova` (dark/glass/glow), `canon`
  (editoriale serif), `terra` (artigianale caldo), `vita` (friendly rounded).
  `src/lib/presets.ts` elenca i preset e i font Google da caricare per ciascuno.
  I 5 preset alternativi vanno ri-auditati dopo il redesign allo standard.
- **Tutto è token**: radius (`--brand-radius-*`), ombre (`--brand-shadow-*`), motion
  (`--brand-dur-*`, `--brand-ease`), spaziatura, scala tipografica fluida (`--step-*`
  via clamp), cassa dei titoli (`--heading-case`: maiuscolo nello standard, `none`
  negli altri preset). In fondo a global.css i re-skin per-preset delle classi semantiche.
- **Classi semantiche da usare nei componenti**: `.t-display/.t-h1..h4/.t-lead/.t-caption`,
  `.eyebrow(--center)`, `.accent-word`, `.btn(-primary/-secondary/-ghost/-sm)` (via
  `ctaClass()`), `.surface-card(--hover)`, `.section-pad`, `.section-dark(--deep)`
  (fondo scuro che ricolora da solo eyebrow/lead/bottoni secondari), `.media-frame`,
  `.media-caption`, `.container-site`, `.hero-overlay`. Le intestazioni di sezione
  passano SEMPRE da `src/components/SectionHeader.astro`.
- Palette cliente: solo `primary` + `accent` obbligatori; i neutri appartengono al
  preset. Guardrail AA automatici: `--accent-strong` (testo accent piccolo su chiaro),
  schiarimento dell'eyebrow in `.section-dark`.
- **Overflow tipografico**: i minimi di `--step-display/-4/-5` sono tarati su parole
  italiane lunghe in maiuscolo a 390px ("RISTRUTTURAZIONE" = 16 glifi);
  `overflow-wrap: anywhere` sui titoli è la rete di sicurezza. Non alzare i minimi
  senza testare a 390px con parole lunghe.

`/anteprima/{preset}/` renderizza lo stesso sample con ogni preset: è la prova che
l'estetica cambia senza toccare markup. Usala per verificare ogni modifica ai componenti.

## Regole di qualità (anti-slop)

Il riferimento completo è `docs/design-system.md` (rubrica a 24 punti, spec dei preset,
tassonomia sezioni). Regole operative nei componenti:

- **Mai valori estetici hardcoded**: niente `shadow-xl`, `rounded-full`, `text-2xl`,
  colori letterali — sempre token/classi semantiche, altrimenti i preset si rompono.
- Niente emoji come icone: solo `src/components/Icon.astro` (Lucide inline).
- Contrasto WCAG AA su tutti e 6 i preset (le opacità tipo `/70` vanno verificate).
- Copy e commenti nel codice in italiano; i siti generati sono per PMI italiane.
- I numeri 01–04 si usano SOLO dove c'è una sequenza reale (processo); l'eyebrow
  con lineetta è un sistema di brand deliberato, non scaffolding da aggiungere altrove.
- **Niente animazioni in-page** (sito statico, scelta 2026-07-03): no reveal, no
  transizioni su hover. Unica animazione: il cross-fade tra pagine
  (`@view-transition` in global.css). Non reintrodurre motion nei componenti.
- Sample/fixture: foto Unsplash con ID VERIFICATI via curl (mai indovinati) e
  didascalie coerenti col contenuto reale; in produzione arrivano URL generati via API.

## Stato e roadmap

- **Fase A** (questo repo, `site-renderer/`): libreria di 15 componenti ridisegnata
  sullo standard ConsulBuild (2026-07). Lo schema contiene 8 tipi aggiuntivi
  (ProblemAgitation, About, LogoBar, Certifications, Incentives, Guarantees,
  BeforeAfter, GoogleReviews) **senza componente né entry nel registry**:
  sono il prossimo lavoro. Per questo `npm run check` segnala 1 errore atteso su
  `registry.ts` (`Record<SectionType, any>` incompleto): è il guard voluto — si
  risolve creando i componenti, **non** indebolendo il tipo con `Partial`.
- **Fase B**: pipeline multi-agente Claude API che produce il `site.json`
  (piano in `docs/agents-skills-plan.md`; immagini: FLUX.2 via BFL).
- **Fase C**: editor Next.js locale (`site-factory-editor/`) — pull dati da Tally,
  checkpoint di approvazione, deploy su Cloudflare Workers static assets (decisione
  2026-07, vedi `docs/decisions/2026-07-verifiche-fase-b.md`).
  - **Parte 1 fatta** (2026-07-06): lista clienti (ricerca per nome/referente/telefono +
    refresh manuale da Tally con dedup; `intake-tally.ts --list-json` pagina tutte le
    submission), setup key Tally, import, tema chiaro/scuro, guardia modifiche non salvate,
    revisione intake (dual-write brief+intake, flag qualità, checksum P.IVA), e **context-enricher**
    — nuovo step che via `claude -p` headless (login Max, no API a pagamento) distilla il
    form in `out/<slug>/contesto.json` (identità, servizi atomizzati→macro, punti di forza
    tracciabili, promesse consentite/vietate). Skill `context-enricher` + agente omonimo;
    runner generico `lib/steps.ts` (seam per palette/copy/immagini). Gate di copertura
    deterministico prima della conferma. Prerequisito: `claude login` attivo.
    **Riconciliazione intake→contesto** (`lib/contesto-sync.ts`): correggere l'intake dopo
    la generazione sincronizza automaticamente i campi meccanici (città, tono, colori…) e
    segnala il drift semantico (settore, descrizione…) con **riallineo AI in modalità
    update** (`RunMode`, sezione «Modalità aggiornamento» della skill) che rivede solo le
    parti impattate e preserva la curatela umana — non rigenera da zero. Provenienza in
    `client.json steps.contesto.fonte/drift`.
  - **Parte 2 — scheda Palette fatta** (2026-07-07): step `palette` nel registry
    (`claude -p` con Bash ristretto al solo `check-contrast.mjs`), input primario
    `contesto.json` (skill palette-designer aggiornata), artifact flat `palette.json`,
    gate contrasto rieseguito dall'editor (`lib/contrast.ts` spawna lo script della
    skill — unica fonte del calcolo), scheda con mini-preview su neutri+font veri del
    preset, tabella WCAG live e «Scurisci finché passa» (`lib/wcag.ts`, copia marcata),
    e **staleness generica a valle** (`lib/staleness.ts`: hash upstream in
    `steps.<key>.upstream`, banner/badge ⚠ + ack). Hook run generico `use-step-run`.
  - **Parte 3 — scheda Copy fatta** (2026-07-07): **seam multi-fase** in
    `lib/run-step.ts` (`io.claude()` per fase, evento `phase`, StepDef.run() =
    orchestrazione TS) — contesto/palette convertiti in wrapper sottili; step `copy`
    = copywriter → gate formato deterministico → copy-critic → correzioni solo sugli
    slot bocciati (max 3 round, poi umano). Skill copywriter/copy-critic aggiornate a
    `contesto.json` come verità primaria (macro=card, `promesse_vietate` = bloccante
    automatico, martello già scelta) + sezione «Formato artifact» (copy.json flat +
    copy-coverage.json). `lib/slots.ts validateCopyArtifact` = specchio dell'assembler
    + bound Zod del renderer (parity check `scripts/parity-copy.ts`, helper client-safe
    in `lib/slots-shared.ts`). Editor 32 slot in ordine di pagina, pannello critico con
    anchor ai campi, contatori live, update-mode con estratto per-campo
    (`steps.copy.fonte`). Ack staleness generalizzato
    (`steps/[step]/ack-upstream`).
  - Parti successive: immagini (multi-fase prompter→critic, key BFL), build
    (deterministico: assemble → validate → `SITE_JSON=… astro build` + preview),
    poi deploy Workers.

Il form di `ContactCTA` è completo lato client (stati loading/errore, honeypot,
riga informativa GDPR fissa, redirect a `/grazie` al successo) ma **simulato**:
`data-demo="true"` e `action=""`. In Fase 3 basta impostare l'endpoint reale e
`data-demo="false"` — la logica di POST c'è già, non riscriverla. Lo script Umami
non è ancora in `Base.astro`: va aggiunto al deploy, quando esisterà l'istanza.
