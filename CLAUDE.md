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
8. **Perimetro di modifica (guardrail meccanico, proporzionato)**: per i task
   pianificati (regola 3) il piano ELENCA i file da toccare; approvato il piano,
   primo atto: scrivere `.claude/scope.json` =
   `{"task":"…","perimetro":["path/esatto","cartella/**"]}` — da lì l'hook
   `scope-guard` blocca ogni Edit/Write fuori perimetro (subagent inclusi) finché
   a fine task il perimetro non viene svuotato, riepilogando i file toccati
   rispetto al piano. I fix descrivibili in una frase non richiedono scope.json.
   Serve un file non previsto? Fermarsi e chiedere, mai allargare in silenzio.
   Sempre vietato: refactoring/riformattazioni non richiesti («già che c'ero»),
   modificare file via shell (sed -i, redirect) invece di Edit/Write,
   `git add -A` (si stagiano path espliciti).

Stato lavori, punti aperti e prossime schede: **`docs/handoff-fase-c.md`**.
Debug di una run (`claude -p`, clienti e fabbrica): **`docs/DEBUG.md`** — la mappa
«sintomo → file → cosa leggere».

## Comandi

Node è installato in `~/.local` (niente Homebrew): ogni shell deve prima fare

```bash
export PATH="$HOME/.local/bin:$PATH"
```

**Renderer** (`site-renderer/`, Astro 5): `npm run dev` (:4321) · `npm run build` ·
`npm run check` (astro check) · `npm run test:visual` (Playwright, snapshot 7 preset ×
2 viewport) · `npm run test:a11y` (axe). Validare un site.json o un blueprint:

```bash
node --experimental-strip-types scripts/validate-site.ts <path-al-site.json>
```

Niente linter. La verifica standard quando si toccano componenti, layout o
`global.css` è `npm run build` verde + `npm run check` + validatore + `test:visual`.

**Editor** (`site-factory-editor/`, Next.js 16 + React 19): `npm run dev` (:3000,
spesso già attivo su :3311) · `npm run build` · `npx tsc --noEmit`. Verifica per
scheda: `tsc --noEmit` + `npm run build` + parity check dove c'è un contratto
(`scripts/parity-copy.ts`) + banchi di prova `scripts/test-*.ts` + run E2E sui clienti
reali in `site-renderer/out/`. Attenzione: è una versione di Next.js con breaking
changes rispetto ai dati di training — prima di scrivere codice editor leggi le guide
in `node_modules/next/dist/docs/`.

**Design della UI dell'editor**: il design system è `site-factory-editor/DESIGN-SYSTEM.md`
(token, componenti in `components/ui.tsx`, status bar agenti, regole AA/motion,
ricetta per una scheda nuova) — LEGGERLO prima di toccare qualunque scheda. È
distinto dal design dei SITI generati (`site-renderer/DESIGN.md`).

**Form bozza** (`site-intake/`, Astro): `npm run dev` · `npm run build` (con budget
prestazioni) · `npm run check` · `npm test` (Playwright). In dev gli invii finiscono
in `site-intake/.dev-inbox/`.

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
   solo i colori forniti dal cliente, carica i font del preset. Con lo script Umami
   attivo (solo via env di build) conta da solo i clic su `tel:`/`mailto:`/`wa.me`.
5. Sottopagine (`/privacy`, `/termini`, `/grazie`) passano da `src/layouts/SubPage.astro`:
   niente navbar, striscia di servizio con «← Torna al sito».

**Per aggiungere una sezione servono 4 tocchi**: schema in `schema.ts` (aggiungi alla
union), componente in `src/sections/`, entry in `registry.ts`, esempio nel blueprint.
Il componente riceve sempre `{ data, site, variant? }`. Lo schema contiene 8 tipi
SENZA componente né entry nel registry (ProblemAgitation, About, LogoBar,
Certifications, Incentives, Guarantees, BeforeAfter, GoogleReviews): per questo
`npm run check` segnala 1 errore atteso su `registry.ts` (`Record<SectionType, any>`
incompleto) — è il guard voluto, si risolve creando i componenti, **non** con `Partial`.

## Blueprint + slot (il contratto con la pipeline AI)

Gli agenti NON generano un site.json da zero: riempiono gli SLOT di un blueprint
(`site-renderer/blueprints/`, vedi il suo README). `blueprint.json` è scheletro +
golden example (valida e builda da solo); `slots.json` dichiara quali path ogni
agente può toccare, con vincoli e guida. I budget di lunghezza del copy sono
duplicati per design: in `slots.json` come guida e in `schema.ts` (Zod) come
enforcement — se ne cambi uno, cambia l'altro. Sul lato editor lo specchio è
`lib/slots.ts` (`validateCopyArtifact`), tenuto allineato da `scripts/parity-copy.ts`.

Anchor di `ContactCTA`: con `showForm:true` la sezione ha `id="contatti"` (il form
preventivo), con `showForm:false` ha `id="canali"` (contatti diretti). La voce navbar
«Contatti» punta a `#canali`; le CTA «Preventivo gratuito» puntano a `#contatti`.

## Lo standard ConsulBuild (la base di design)

**`site-renderer/DESIGN.md` è la spec operativa del design standard** (con
`PRODUCT.md` per il contesto strategico): distillato dai siti consegnati ai clienti
reali, è la grammatica fissa che rende i siti riconoscibili — eyebrow con lineetta,
H2 maiuscolo con UNA frase in accent (marcatore `**...**` nel JSON, convertito da
`renderAccent()` in `src/lib/ui.ts`), ritmo scuro/chiaro (`.section-dark`), CTA
ricorrenti, processo numerato. Leggere DESIGN.md prima di toccare i componenti.

## Sistema di theming a token

Cascata definita in `src/styles/global.css`:

```
:root (LO STANDARD, = preset "meridian")  <  [data-preset="x"]  <  style inline su <html> (palette cliente)
```

- **7 style-preset** (stessi componenti, estetiche diverse, zero markup): `meridian`
  (= lo standard, default), `atelier`, `nova`, `canon`, `terra`, `vita`, `ferro`. I
  token vivono in `presets/*.tokens.json` (DTCG); `npm run build:presets` genera
  `presets.gen.css`/`presets.gen.ts` e la copia per l'editor (mai editarli a mano).
  Il preset di un cliente è assegnato in modo deterministico dall'editor
  (`lib/assign-design.ts`).
- **Tutto è token**: radius, ombre, motion, spaziatura, scala tipografica fluida
  (`--step-*` via clamp), cassa dei titoli (`--heading-case`).
- **Classi semantiche da usare nei componenti**: `.t-display/.t-h1..h4/.t-lead/.t-caption`,
  `.eyebrow(--center)`, `.accent-word`, `.btn(-primary/-secondary/-ghost/-sm)` (via
  `ctaClass()`), `.surface-card(--hover)`, `.section-pad`, `.section-dark(--deep)`,
  `.media-frame`, `.media-caption`, `.container-site`, `.hero-overlay`. Le intestazioni
  di sezione passano SEMPRE da `src/components/SectionHeader.astro`.
- Palette cliente: solo `primary` + `accent` obbligatori; i neutri appartengono al
  preset. Guardrail AA automatici (`--accent-strong`, eyebrow schiarito in `.section-dark`).
- **Overflow tipografico**: i minimi di `--step-display/-4/-5` sono tarati su parole
  italiane lunghe in maiuscolo a 390px («RISTRUTTURAZIONE» = 16 glifi);
  `overflow-wrap: anywhere` sui titoli è la rete di sicurezza. Non alzare i minimi
  senza testare a 390px con parole lunghe.

`/anteprima/{preset}/` renderizza lo stesso sample con ogni preset: è la prova che
l'estetica cambia senza toccare markup. Usala per verificare ogni modifica ai componenti.

## Regole di qualità (anti-slop)

- **Mai valori estetici hardcoded**: niente `shadow-xl`, `rounded-full`, `text-2xl`,
  colori letterali — sempre token/classi semantiche, altrimenti i preset si rompono.
- Niente emoji come icone: solo `src/components/Icon.astro` (Lucide inline).
- Contrasto WCAG AA su tutti i preset (le opacità tipo `/70` vanno verificate).
- Copy e commenti nel codice in italiano; i siti generati sono per PMI italiane.
- I numeri 01–04 si usano SOLO dove c'è una sequenza reale (processo); l'eyebrow
  con lineetta è un sistema di brand deliberato, non scaffolding da aggiungere altrove.
- **Motion**: AMMESSO il motion di *interazione* (hover/stato, navbar allo scroll) —
  tokenizzato, solo proprietà compositor, azzerato da `prefers-reduced-motion`, mai
  gating della visibilità. VIETATO il motion *decorativo* (reveal/parallax allo scroll).
  Resta il cross-fade tra pagine (`@view-transition`). Vedi DESIGN.md §Motion.
- Sample/fixture: foto Unsplash con ID VERIFICATI via curl (mai indovinati) e
  didascalie coerenti col contenuto reale; in produzione arrivano URL generati via API.

## Mappa del repo

- **`site-renderer/`** — Fase A, la libreria di sezioni e i 7 preset (sopra). In
  `scripts/` gli script della pipeline (assemble, validate, generate-image,
  generate-logo) e della fabbrica (`scripts/factory/`), spawnati dall'editor per path.
- **`site-factory-editor/`** — Fase C, console locale per un solo operatore. Registry
  degli step AI in `lib/steps.ts` (contesto → palette → logo → copy → images → legale →
  build): ogni step = skill in `.claude/skills/` eseguita da `claude -p` (`lib/run-step.ts`,
  eventi live via `lib/run-bus.ts`), gate deterministici prima dei critici avversariali
  (max 3 round, poi decide l'umano), conferme condivise (`lib/conferme.ts`), staleness a
  valle con ack (`lib/staleness.ts`), catena demo automatica (`lib/catena.ts`), build
  deterministica (`lib/build.ts`) e deploy su Cloudflare Workers (`lib/deploy.ts`),
  dashboard clienti su Stripe/Gatus/n8n/Umami (`lib/portafoglio.ts`, cache e stato per
  fonte: mai uno «0» a fonte giù). Il filesystem è il database: ogni cliente vive in
  `site-renderer/out/<slug>/` (fuori da git), `client.json` è dell'editor. Manuale:
  `site-factory-editor/README.md`.
- **`site-intake/`** — il form bozza su sito.consulbuild.com, unica sorgente dei lead
  (Tally dismesso il 2026-09-08): form → n8n `sf-bozza` → Google Drive
  `site-factory-clienti/_inbox/<leadId>/` → «Importa» nell'editor (`lib/inbox-form.ts`).
  Piano vivo: `docs/piano-form-bozza.md`.
- **`factory/`** — la fabbrica dei preset: riferimenti, gold set e calibrazione del
  design-critic, run con gate (`docs/piano-fabbrica-design-2026-07.md`).
  **`logo-lab/`** — banco di prova per la generazione dei loghi (suo README).
- **`infra/`** — monitor Gatus per cliente e workflow n8n versionati
  (`scripts/n8n-import.ts export|import`; le credenziali restano nell'istanza). Guida:
  `docs/vps-integrazioni-setup.md`. Regole: il sito pubblicato parla con
  l'infrastruttura SOLO via env di build (`FORM_ACTION`, `UMAMI_HOST`,
  `UMAMI_WEBSITE_ID`), mai in `site.json`; Stripe è l'unico orologio del rinnovo
  (1 abbonamento = 1 sito); niente notifiche lead all'agenzia, niente WhatsApp.
- **`.claude/`** — le skill della pipeline (invocate per nome dai prompt `claude -p`;
  nessun subagent: i run headless hanno `Task` tra i tool vietati), `settings.json`
  con i deny e l'hook `scope-guard` (regola 8): si modificano solo a mano da Mattia.
  **`docs/archivio/`** — ricerche e piani conclusi: storia, non guida.

**Ciclo di vita di un cliente**: lead dal form → `percorso: "demo"` → catena automatica
senza checkpoint (si ferma al primo critico FAIL) → demo su
`<nome-azienda>.demo.consulbuild.com` (15 gg, sweep orario) → «Il cliente si è
abbonato» → `completo` → legale → dominio → build reale → deploy (che spegne la demo).
Il deploy non ha interlock con lo stato legale (decisione Mattia 2026-08-03): solo staleness.
