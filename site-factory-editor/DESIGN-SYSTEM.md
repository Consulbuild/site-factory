# Design System — Site-factory Editor

**Fonte di verità per costruire nuove schede della dashboard.** Ogni valore qui è
estratto dal codice reale (`app/globals.css`, `components/ui.tsx`), non inventato.
Se cambi un token, cambialo in `globals.css` — questo doc lo descrive, non lo
duplica. Lo studio di come si è arrivati qui è in `DESIGN-REFACTOR-2026-07.md`;
questo è il manuale d'uso.

Registro: **product** (strumento di lavoro, non brochure). Riferimento visivo:
dashboard SaaS chiara e ariosa ("Shopeers") — card bianche con ombre soffuse,
un accento blu, dati tecnici in monospace. Due temi sempre, entrambi WCAG AA.

---

## 1. Regola d'oro

**Non scrivere mai valori estetici a mano.** Niente colori literal (`#…`, `text-blue-500`),
niente `shadow-xl`/`rounded-2xl`/`text-2xl`, niente px arbitrari per raggi/ombre.
Tutto passa da un token o da una classe/componente di questo sistema — altrimenti
il tema si rompe e la coerenza si perde. Se ti manca un token, **aggiungilo a
`globals.css` per entrambi i temi**, non hardcodare.

Corollari:
- Un pannello = la utility `card` (mai ricomporre bordo+ombra+raggio a mano).
- Un bottone = una delle costanti `btn*` di `ui.tsx`.
- Uno stato = un `Badge`/`StepBadge`/`RunBadge`/`FaseBadge`/`OptoutBadge` di `ui.tsx`.
- Testo = classi Tailwind sui token semantici (`text-ink`, `text-muted`, `bg-surface`…).
- Copy e commenti in **italiano**.

---

## 2. Colori (token semantici)

Definiti in `app/globals.css` come CSS var per tema, esposti a Tailwind via
`@theme inline` → usali come utility (`bg-surface`, `text-muted`, `border-line`…).
**Non usare mai la palette Tailwind di default** (`slate-*`, `blue-*`, …).

### Neutri e superfici
| Token / utility | Ruolo | Chiaro | Scuro |
|---|---|---|---|
| `bg` | fondo pagina | grigio-freddo chiarissimo | grafite blu (non nero) |
| `surface` | **card, pannelli, sidebar, topbar** | bianco puro | grafite alzata |
| `raise` | pozzetti dentro le card: input, riga hover, chip | grigio impercettibile | un gradino più chiaro |
| `line` | bordi e divisori standard | — | — |
| `line2` | bordi enfatizzati / hover | — | — |
| `field` | bordo degli input (solo campi) | — | — |
| `ink` | testo primario | quasi-nero blu | quasi-bianco |
| `muted` | testo secondario, label | — | — |
| `faint` | testo terziario, placeholder, hint | — | — |

### Brand (l'unico accento)
| Token | Ruolo |
|---|---|
| `brand` | azioni primarie, selezione, voce nav attiva, link, **focus ring** |
| `brand-ink` | testo sopra `brand` (bianco su chiaro) |
| `brand-dim` | fondo tenue: pill nav attiva, `Badge` tono brand |

Il brand è **blu royal** (`oklch(0.52 0.2 262)` nel chiaro). Il teal NON si usa
qui: è riservato ai siti generati, così l'editor si distingue dal prodotto che
produce. L'accento serve solo ad azioni/selezione/stato — **mai come decorazione**.

### Semantici di stato (coppia testo + fondo tenue)
| Testo | Fondo | Uso |
|---|---|---|
| `warn` | `warn-bg` | ambra: da verificare, staleness, avvisi |
| `ok` | `ok-bg` | verde: verificato, successo |
| `err` | `err-bg` | rosso: errore, azioni distruttive |

**Regola AA (bloccante):** `text-warn`/`text-err`/`text-brand` su fondo tenue devono
restare ≥4.5:1 su **entrambi** i temi. Non applicare mai opacità (`text-warn/90`)
al testo su fondo tinta: fa scendere sotto AA (verificato: `/90` fallisce nel chiaro).
Verifica una coppia nuova con `node .claude/skills/palette-designer/scripts/check-contrast.mjs "<fg>" "<bg>"`.

### Colori agente (`--agent-*`)
Uno per ruolo, per le sfere della status bar (vedi §7). Generatori con hue proprio;
i **critici sono tutti ambra** (il critico è "il dubbio", stessa semantica di
`warn`); gli script deterministici usano `--agent-script` (chip, non sfera).
`contesto`=teal · `palette`=violetto · `preset`=indaco · `copy`=blu · `immagini`=magenta
· `logo`=corallo · `critico`=ambra · `script`=acciaio.

---

## 3. Tipografia

- **Una sola famiglia**: Inter (`--font-sans`, self-hosted via `next/font`). Niente
  display font, niente accoppiate heading/body — è un tool.
- **Mono** (`.mono`): ID, slug, date, contatori, log, esiti tecnici. Ha già
  `tabular-nums` e dimensione 13px. Usala per tutto ciò che è "registro tecnico".
- Base **15px** (densità da strumento), line-height 1.5. Scala rem fissa, non fluida.
- Gerarchia con **peso e dimensione**, non colore:
  - Titolo pagina: `text-xl font-semibold`
  - Titolo sezione/card: `font-semibold` (o `text-sm font-semibold text-muted` per gli header di gruppo)
  - Header di gruppo tecnico: `text-xs font-semibold uppercase tracking-wide text-muted`
  - Numero-eroe (solo KPI card): `text-[28px] font-bold tabular-nums`
  - Corpo: default. Secondario: `text-sm text-muted`. Terziario/hint: `text-xs text-faint`.
- Prosa lunga: max ~65–75ch (`max-w-2xl`). Dati/tabelle possono correre più larghi.

---

## 4. Forma, elevazione, spazio, z-index

| Cosa | Token / valore | Note |
|---|---|---|
| Raggio card/pannelli | `--radius-card` = 16px (`rounded-card`) | via utility `card` |
| Raggio controlli | `--radius-ctl` = 10px (`rounded-ctl`) | input/select/textarea già così |
| Raggio bottoni/chip/pill | `rounded-full` | tutti i bottoni sono pill |
| Ombre | `shadow-card` / `shadow-raise` / `shadow-overlay` | mai `shadow-xl` & co. |
| Spaziatura | scala Tailwind 4/8 (`gap-2/3/4`, `p-4/5`, `space-y-6/8`) | densità dashboard |
| Container form | `max-w-3xl` | schede a colonna (intake, copy) |
| Container ricco | `max-w-5xl` | pagine con più blocchi |
| **Action bar allineata** | stesso `max-w-*` del contenuto | mai contenuto 3xl + barra 5xl |

**Elevazione**: nel chiaro le card si staccano con l'**ombra soffusa** (`card` la
applica); nello scuro con **fill+bordo** (le ombre servono solo agli overlay). Non
aggiungere ombre a mano: usa `card` per i pannelli e `shadow-raise`/`shadow-overlay`
per popover/dialog.

**Scala z-index (fissa — non inventare valori):**
`sticky`/action-bar = **10** · status bar = **30** · dialog/overlay = **50** · toast = **60**.

**Offset status bar**: le action bar fisse in fondo usano
`bottom-(--statusbar-offset)` così si alzano quando la status bar è visibile
(`globals.css` gestisce la var). Riusa questo pattern per qualunque barra fissa.

---

## 5. Vocabolario componenti (`components/ui.tsx`)

Import da `@/components/ui`. **Non ridefinire questi inline** (è successo con i
badge: ora sono tutti qui, un'unica fonte).

### Bottoni (costanti di classe, pill)
- `btnPrimary` — l'UNICA azione primaria per schermata (blu pieno). Vedi §6.
- `btnSecondary` — azioni secondarie (bordo, fondo surface).
- `btnGhost` — azioni terziarie / in header (solo testo muted).
- `btnDanger` — azioni distruttive (testo err, bordo che si accende in rosso).

```tsx
<button className={btnPrimary}>Conferma</button>
<Link href="…" className={btnSecondary}>Apri →</Link>
```

### Badge di stato (mai a mano)
- `<Badge tone="warn|ok|brand|err|idle">…</Badge>` — pill base.
- `<StepBadge stato={…} extra?="1 flag" />` — stato step cliente (`da_verificare`/`verificato`/`in_corso`/`errore`/`assente`).
- `<RunBadge stato={…} />` — stato run fabbrica.
- `<FaseBadge esito={…} />` — esito fase di run.
- `<OptoutBadge esito={…} />` — opt-out TDM riferimenti.

### Contenitori e feedback
- **`card`** (utility CSS) — ogni pannello. `<div className="card p-5">…`.
- `<Banner tone="warn|ok|err|brand" title? actions?>…</Banner>` — banner di stato (staleness, conferme, errori di pagina).
- `<EmptyState icon? title hint? action? />` — vuoto che spiega, non "nothing here".
- `<Breadcrumb items={[{label,href?}]} onNavigate? />` — un solo breadcrumb per editor E runner.
- `<ConfirmDialog open title message confirmLabel tone? confirmDisabled? children? … />` — conferme; `children` per input (es. "digita il nome"), `tone="danger"` per distruttive.
- `formatDate(iso)` — date in `it-IT`.

### Menu azioni per riga (pattern `<details>`)
Per il menu (…) su righe lista/testate: `<details>` + `<summary>` con
`[&::-webkit-details-marker]:hidden`, il pannello è una `card absolute … shadow-raise`.
Vedi `clients-browser.tsx` `RowMenu` / `cliente-azioni.tsx` come modello (chiusura
su click voce via `closest("details")?.removeAttribute("open")`).

---

## 6. Regole di flusso e interazione

- **Un gate per schermata**: una sola azione **primaria** visibile. In una sequenza
  (pipeline), la primaria è il **prossimo passo**; tutto il resto è secondario/ghost.
- **Post-conferma → hub** sempre (mai "resta in pagina" silenzioso e incoerente).
- **ConfirmDialog obbligatorio** per: rigenerazioni totali, eliminazioni, pubblicazioni
  live, azioni che perdono curatela umana, stop di un run.
- **Eliminazioni forti**: `ConfirmDialog tone="danger"` con `children` = input in cui
  digitare il nome esatto (`confirmDisabled` finché non combacia); il server
  **riverifica** (422). Vedi `EliminaClienteDialog`.
- **Staleness**: il banner dice **cosa** è cambiato (elenco file mono), non solo "è
  cambiato". Tre azioni tipiche: «Aggiorna con l'AI» (update, primaria) / «Rigenera da
  zero» (secondaria) / «Va bene così» (ghost, ack).
- **Guardia modifiche non salvate** (`useUnsavedGuard(dirty)`) in ogni scheda con form.
- **Tastiera**: `⌘S`/`Ctrl+S` = Salva (`useSaveShortcut`); `/` e `⌘K` = ricerca
  (topbar); `Esc` = chiudi dialog/pannello; `⏎` = conferma nei dialog. Niente sistemi
  di shortcut elaborati.

### Vocabolario testuale unificato (una parola per concetto)
| Concetto | Etichetta |
|---|---|
| Rigenerazione totale AI | **⟳ Rigenera con l'AI** (ghost header) + ConfirmDialog |
| Update conservativo AI | **Aggiorna con l'AI** (primaria, banner staleness) |
| Ack staleness/drift | **Va bene così** (ghost) |
| Salvataggio | **Salva** (secondaria) — Intake è l'unica «Salva e segna verificato» |
| Ricontrollo critico | **Ricontrolla col critico** (secondaria) |

---

## 7. Status bar agenti (lavoro in background)

Sistema trasversale: qualunque run AI (step cliente o run fabbrica) va lanciato via
**`lib/run-bus.ts`** (gira nel processo, sopravvive alla navigazione) e si vede
automaticamente nella status bar in basso. Per una scheda nuova con un run AI **non
devi ricostruire nulla**: lancia col bus e la barra compare.

- **Sfera agente** (`AgentOrb`, `components/agent-orb.tsx`): CSS puro (gradiente
  radiale a 2 fermate del colore-agente + highlight + anello). Respiro in idle, morph
  in ✓/✗ a esito. Rispetta `prefers-reduced-motion`. Gli **script deterministici**
  (build, gate) hanno il **chip quadrato**, non la sfera — distinzione AI/macchina.
- **Progresso onesto**: segmenti = **fasi reali** (dagli eventi `phase`) + **tempo
  trascorso** in mono. **Mai percentuali inventate.** Il «di solito ~N min» viene
  dalle durate storiche (`ultimaRun`).
- Fonte dati: `RunProvider` fa polling di `/api/runs/active`; l'identità agente si
  deriva dalla fase con `lib/agenti.ts` (`agenteDaFase`).
- Fase live anche nell'hub del cliente (`StepRunLive`).

---

## 8. Shell (ossatura di ogni pagina)

Definita in `app/layout.tsx` — non la tocchi per una scheda nuova, ci scrivi dentro.
- **Sidebar** (`components/sidebar.tsx`): voci con icona+label, attiva = pill
  `brand-dim` + barretta 3px. Sotto `lg` collassa a sole icone (icone con
  `aria-label`). Slot inferiore = card «Agenti al lavoro».
- **Topbar** (`components/topbar.tsx`): ricerca clienti globale (⌘K, stato in `?q=`),
  toggle tema.
- **Contenuto**: `<main className="mx-auto w-full max-w-5xl px-6 py-8">`.
- **Icone**: solo **`lucide-react`** (stroke 2, `size-4`/`size-[18px]`). Mai emoji
  come icone. Una sola famiglia, stroke coerente.

**Tema**: deciso lato server da cookie `theme` (layout `async`). Niente `<script>`
inline. Il `ThemeToggle` scrive il cookie + aggiorna `document.documentElement`.

---

## 9. Motion

- Solo **cambi di stato**, 150–250ms, ease-out. Niente motion decorativa, niente
  sequenze di caricamento pagina.
- Libreria **`motion`** (`motion/react`) solo dove serve (status bar, sfere). Il resto
  con transizioni CSS.
- **`prefers-reduced-motion`**: coperto globalmente in due modi — la regola CSS in
  `globals.css` azzera durate, e `<MotionConfig reducedMotion="user">` (in
  `RunProvider`) fa rispettare la preferenza a **ogni** componente `motion`. Non
  serve gate-are a mano, ma se animi qualcosa di importante verifica in reduced-motion.
- Solo `transform`/`opacity` (mai animare `width`/`height`/`top`/`left`).

---

## 10. Accessibilità (non negoziabile)

- **Contrasto AA** su entrambi i temi: testo ≥4.5:1, UI/large ≥3:1. Verifica ogni
  coppia nuova col gate del progetto. Niente opacità sul testo su fondo tinta.
- **Mai solo colore**: aggiungi forma/icona/testo. Es. le tacche di stato: `ok`/`warn`
  = pillola (`rounded-full`), `errore` = spigolo (`rounded-none`) → distinguibili senza
  colore (daltonismo). Applica lo stesso principio a ogni indicatore cromatico.
- **Nome accessibile** su ogni controllo icona-only (`aria-label`), anche quando la
  label testuale è nascosta a un breakpoint (sidebar collassata docet).
- **Focus visibile** ovunque (`:focus-visible` globale col brand — non rimuoverlo).
- **Live region**: se una regione `role="status"` contiene un valore che ticca (tempo),
  marca quel valore `aria-hidden` (altrimenti ri-annuncia tutto ogni secondo).
- **Tastiera**: dialog chiudibili con `Esc`, focus sensato, form navigabili.
- Skeleton per il loading, non spinner centrali; empty state che insegnano.

---

## 11. Anti-pattern (bandì)

- Valori estetici hardcoded (colori literal, `shadow-xl`, `rounded-2xl`, px arbitrari).
- Palette Tailwind di default (`bg-slate-100`, `text-blue-600`).
- Emoji come icone; icone di famiglie/stroke misti.
- Card ricomposta a mano invece della utility `card`; badge/bottoni reinventati inline.
- Più di un'azione primaria per schermata; azione primaria assente dove serve.
- Container disallineato (contenuto 3xl + action bar 5xl).
- Motion decorativa; percentuali di avanzamento inventate.
- Opacità sul testo su fondo tinta (rompe l'AA).
- Modal come prima scelta: esaurisci prima inline/progressive disclosure.
- Testo/commenti non in italiano.

---

## 12. Ricetta: costruire una scheda nuova

1. **Container** coerente (`max-w-3xl` form / `max-w-5xl` ricca), `Breadcrumb` in testa.
2. **Un'azione primaria** (`btnPrimary`) in action bar fissa in fondo (allineata,
   `bottom-(--statusbar-offset)`); il resto `btnSecondary`/`btnGhost`.
3. Pannelli con **`card`**; stati con i **`*Badge`**; avvisi con **`Banner`**; vuoto con
   **`EmptyState`**.
4. Se c'è un **run AI**: lancialo via `run-bus` → la status bar lo mostra da sola. Fasi
   reali + tempo, mai %.
5. **Stati**: default, loading (skeleton), empty (che insegna), errore (messaggio +
   Riprova), staleness (con elenco file). Distruttivo → `ConfirmDialog tone="danger"`
   (con conferma digitata se elimina).
6. **Guardia** unsaved + **`⌘S`** se ci sono form.
7. **Verifica**: `npx tsc --noEmit` + `npm run build` + prova nel browser su **entrambi
   i temi** + controllo contrasto AA sulle coppie nuove + reduced-motion se hai animato.
8. Passata `/impeccable` (shape prima, critique/polish dopo) come da regole di progetto.

---

*Aggiornare questo file quando si aggiunge un token, un componente condiviso o un
pattern trasversale. I valori esatti vivono in `globals.css` e `ui.tsx`; qui sta il
"come e perché".*
