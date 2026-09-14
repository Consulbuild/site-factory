# Piano T0 — Area «Traffico»: forma e scheletro

Stato: **fasi 2 (sviluppo) e 3 (calibrazione) completate** il 2026-09-14 (commit `fb2ade6`, `a6e10b9` e quello
dei documenti); restano le fasi 4-5 all'orchestratore. Il piano approvato vale con le decisioni del §12 applicate
sopra (dove il testo sotto dice altro, vince il §12). Fonti: `docs/traffico/README.md`
(§1 decisioni, §3 architettura, §4 ciclo, §5 regole), `docs/traffico/brief-T0.md`.

## 1. Contesto

Obiettivo: nell'editor nasce l'area «Traffico» con i due servizi per cliente (**Sito**, **Scheda Google**),
il loro stato persistito in `client.json`, gli interruttori con conferma e gli spazi che ospiteranno i
pannelli dei piani successivi. Nessun dato esterno, nessuna chiave, nessun effetto su renderer, build,
deploy o catena.

Fatti rilevati leggendo il codice (2026-09-14):

- `ClientStateSchema` (`lib/schemas.ts`) usa `.default()` per gli step e `.optional()` per `catena`/`demo`;
  `writeClientState` riscrive lo stato **parsato**: ogni chiave con `.default()` nasce alla prima scrittura
  qualsiasi (una conferma, la catena). `readClientState` non scrive mai.
- `patchClientState` lancia se `client.json` è fuori schema; oggi nessuna route intercetta il throw (→ 500).
- In `out/` ci sono 3 clienti, nessuno con `traffico`: `cavaliere-build-srls` (percorso assente = completo,
  online su `cavalierebuild.it`), `costruzioni-generali-a-l-di-la-cecilia-giovanni` (completo, **senza
  dominio**), `mattia-saggin-costruzioni` (**demo**). Nessun `client.json` corrotto: serve una fixture.
- Il guard del dominio in demo (`app/api/clients/[slug]/build/route.ts` r. 48-53) risponde **409** con la
  frase «segna prima «Il cliente si è abbonato»».
- La ricerca della topbar porta sempre alla home (`/?q=`): non riguarda `/traffico`.
- `scope-guard.mjs` confronta i path per uguaglianza o prefisso `dir/**`: le parentesi di `[slug]` sono
  letterali, nessun problema. `site-renderer/out/` è esente.
- `.claude/scope.json` oggi = perimetro della **roadmap Traffico** (solo documenti, `docs/traffico/**`):
  compatibile con questo piano, non toccato in fase 1.

Fuori perimetro T0: chiavi API, sensori, env di build del renderer, `traffico/*.json`, registro NDJSON,
mini-form, ricerca/filtri nel portafoglio.

## 2. Studio UX (shape /impeccable)

**Sostituzioni dichiarate.** Nessun utente né strumento di domanda strutturata in questa sessione: le
risposte al discovery vengono da brief e README, le assunzioni sono in §2.9. `concept-seed` non eseguito:
il mondo visivo è stabilito (`DESIGN-SYSTEM.md`, `PRODUCT.md`) e la richiesta è precisa → estensione di
una superficie esistente, strutture valutate a mano (§2.2). Modo: **Operate**.

### 2.1 Compito, pubblico, esito

- **Chi**: Mattia, operatore unico, alla scrivania. Arriva (a) dalla sidebar quando vuole sapere per quali
  clienti sta lavorando sul traffico, (b) dall'hub quando un cliente compra o disdice un servizio.
- **Compito**: leggere in un colpo d'occhio chi ha quale servizio e in che stato; accendere, sospendere,
  riattivare un servizio **per un cliente**, sapendo cosa succede e cosa no.
- **Successo**: zero ambiguità tra spento e sospeso, nessuna attivazione accidentale, nessuno stato
  «Spento» mostrato quando in realtà non si sa (file corrotto), nessuna promessa di risultati.
- **Verità specifica**: sono due servizi separati e rari da cambiare (una decisione commerciale, non il
  prossimo passo di una pipeline); in T0 attivare **registra solo lo stato**, online non cambia nulla.

### 2.2 Strutture valutate

| | Struttura | Esito |
|---|---|---|
| A | Portafoglio a tabella con un interruttore per servizio in ogni riga | Scartata: uno switch promette effetto immediato, ma il cambio richiede conferma; in lista l'errore di mira costa troppo. |
| B | Dettaglio con tab «Sito \| Scheda Google» | Scartata: nasconde lo stato di un servizio; i servizi sono solo due. |
| C | **Portafoglio in sola lettura, raggruppato per stato → dettaglio con due sezioni impilate, un'azione con conferma per sezione; dall'hub una riga compatta** | **Scelta**: lo stato di entrambi i servizi è sempre visibile, l'azione sta dove si legge il suo effetto, le sezioni a tutta larghezza reggono i pannelli futuri (dati Search Console, checklist della scheda) meglio di due colonne. |

Route: portafoglio `/traffico`, dettaglio **`/traffico/[slug]`** (non `/clienti/[slug]/traffico`): la voce
attiva della sidebar resta «Traffico» e il breadcrumb è `Traffico / Azienda`; dal dettaglio un link porta
all'hub del cliente.

### 2.3 Layout per vista

**Portafoglio `/traffico`** (container della shell `max-w-5xl`, server component, niente JS client)

```
│ Traffico                                                                   │
│ Due servizi separati per cliente: Sito, l'ottimizzazione del sito per le   │
│ ricerche locali, e Scheda Google, la scheda consigliata che poi inserisci  │
│ a mano. Si attivano dal dettaglio del cliente.                             │
│                                                                            │
│ (se nessun servizio acceso) ┌ card: EmptyState ─────────────────────────┐ │
│                             │ Nessun servizio attivo                     │ │
│                             │ Apri un cliente per attivare Sito o Scheda │ │
│                             │ Google. I clienti in demo si attivano dopo │ │
│                             │ l'abbonamento.                             │ │
│                             └────────────────────────────────────────────┘ │
│ Stato non leggibile · 1   (solo se presente)                               │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ ZZ test · client.json fuori schema: correggilo a mano  [Non leggibile]→│  │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ Con un servizio acceso · 1                                                 │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Cavaliere Build              Sito [Attivo] dal 14/09                  │   │
│ │ Milano · cavalierebuild.it   Scheda Google [Spento]                 → │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ Spenti · 1                                                                 │
│ │ Costruzioni Generali · … · senza dominio   Sito [Spento] Scheda [Spento] →│
│ In demo · 1 — si attivano dopo «Il cliente si è abbonato»                  │
│ │ Mattia Saggin Costruzioni · … · demo       Sito [Spento] Scheda [Spento] →│
```

- Gruppi = `card` con `divide-y` come «Importati» in home; intestazione `text-sm font-semibold text-muted`
  con conteggio. Ordine dei gruppi: non leggibile → accesi → spenti → demo; nelle righe nome A–Z.
- Riga = un solo `Link` a blocco verso `/traffico/[slug]` (hover `bg-raise`); dentro nessun altro link
  (il dominio è testo), così niente `<a>` annidati e niente JS. Etichetta «Sito»/«Scheda Google» inline
  prima di ogni badge: regge senza intestazioni di colonna anche a 400 px (le celle vanno a capo).
- Nessuna azione primaria: la pagina è di lettura; le azioni vivono nel dettaglio.

**Dettaglio `/traffico/[slug]`**

```
│ Traffico / Cavaliere Build                          [Apri il cliente →]   │
│ Cavaliere Build                                                            │
│ Milano · percorso completo · cavalierebuild.it ↗   (o «senza dominio»)     │
│ [Banner err «client.json non leggibile» — solo se corrotto]                │
│                                                                            │
│ ┌ card ────────────────────────────────────────────────────────────────┐   │
│ │ Sito  [Attivo]                                        [Sospendi…]    │   │
│ │ Ottimizzazione del sito per le ricerche locali.                      │   │
│ │ Attivo dal 14/09/2026                                                │   │
│ │ (⚠ warn, solo percorso completo senza dominio: «Il sito non è ancora │   │
│ │   online con un dominio: finché non lo è, non c'è nulla da           │   │
│ │   ottimizzare.»)                                                     │   │
│ │ ──────────────────────────────────────────────────────────────────── │   │
│ │ Cosa comparirà qui               │ Cosa servirà                      │   │
│ │ fondamenta tecniche (sitemap,    │ il sito online con un dominio     │   │
│ │ robots, dati strutturati), pagine│ i dati per farti trovare (comuni, │   │
│ │ per servizio e zona da approvare,│ prezzi indicativi, orari) chiesti │   │
│ │ stato dell'indicizzazione,       │ al cliente con un breve modulo    │   │
│ │ correzioni proposte.             │ le chiavi di Search Console e     │   │
│ │ Nessuna è ancora disponibile.    │ Bing in Impostazioni              │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ ┌ card ────────────────────────────────────────────────────────────────┐   │
│ │ Scheda Google  [Spento]                                  [Attiva…]   │   │
│ │ La scheda consigliata la prepara il software, la inserisci tu a mano.│   │
│ │ Mai attivato                                                         │   │
│ │ ──────────────────────────────────────────────────────────────────── │   │
│ │ Cosa comparirà qui               │ Cosa servirà                      │   │
│ │ la scheda consigliata (categorie,│ l'accesso come Manager alla       │   │
│ │ servizi, attributi, descrizione),│ scheda Google del cliente (lo     │   │
│ │ la checklist di ciò che hai      │ concede lui dal suo profilo)      │   │
│ │ inserito, il confronto scheda ↔  │                                   │   │
│ │ sito. Nessuna è ancora disponibile.                                  │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
```

- Sezioni `card p-5` con `aria-labelledby`; titolo `font-semibold` + badge; azione a destra della riga
  titolo (su 400 px va a capo sotto). La riga date è `role="status"` (annuncia il cambio dopo il refresh).
- Corpo a due colonne da `md`, una colonna sotto; testo `text-sm text-muted`, intestazioni
  `text-sm font-semibold text-muted` (niente eyebrow uppercase: anti-reference di `PRODUCT.md`).
- Solo la voce «il sito online con un dominio» è verificabile: il fatto verificato sta nella riga meta
  dell'header e nell'avviso warn; l'elenco «Cosa servirà» resta testo semplice, senza spunte finte.

**Hub del cliente** — una riga compatta **dopo** la lista degli step (non dentro l'`<ol>` numerata: non è
uno step; in fondo per non spostare ciò che l'hub mostra oggi):

```
│ ┌ card ────────────────────────────────────────────────────────────────┐ │
│ │ Traffico   Sito [Attivo]   Scheda Google [Spento]   [Apri Traffico →]│ │
│ └──────────────────────────────────────────────────────────────────────┘ │
```

`btnSecondary`, mai primario (la primaria dell'hub resta catena / prossimo passo). Non entra in `righe`,
quindi non cambia `prossimo`.

### 2.4 Gerarchia e primaria

- Portafoglio: nessuna primaria (vista di lettura). Dettaglio: **nessuna primaria in T0**, per scelta —
  attivare è una decisione commerciale rara, non il prossimo passo; il blu inviterebbe al clic. Le azioni
  sono `btnSecondary` con puntini («Attiva…») perché aprono una conferma; la primaria sta nel dialog.
  Quando un piano porterà un «prossimo passo» del servizio (es. T3 invio del mini-form), quello diventerà
  la primaria della sezione.
- Dopo il cambio si **resta nel dettaglio** (`router.refresh()`): il nuovo stato è l'esito visibile.
  Scostamento consapevole da «Post-conferma → hub», che riguarda le conferme degli step della pipeline.

### 2.5 Stati

| Stato | Portafoglio | Dettaglio: badge · frase | Azione nel dettaglio | Hub |
|---|---|---|---|---|
| spento (completo) | gruppo «Spenti», `Spento` idle | `Spento` · «Mai attivato» | **Attiva…** | `Spento` |
| attivo | gruppo «Con un servizio acceso», `Attivo` ok + «dal gg/mm» | `Attivo` · «Attivo dal gg/mm/aaaa» | **Sospendi…** | `Attivo` |
| sospeso | gruppo «Con un servizio acceso», `Sospeso` warn + «dal gg/mm» | `Sospeso` · «Sospeso dal … · attivato il …» | **Riattiva…** | `Sospeso` |
| cliente in demo, spento | gruppo «In demo — si attivano dopo…», `Spento` idle | `Spento` · «Mai attivato» | `Attiva…` **disabilitato** + frase visibile «In percorso demo i servizi Traffico non si attivano: segna prima «Il cliente si è abbonato»» | `Spento` |
| demo con servizio sospeso (solo a mano) | gruppo accesi | `Sospeso` | `Riattiva…` disabilitato + stessa frase | `Sospeso` |
| completo senza dominio | gruppo per stato, riga meta «senza dominio» | come sopra + avviso warn nella sezione Sito | invariata (attivazione ammessa, vedi §12-a) | invariato |
| client.json corrotto | gruppo «Stato non leggibile», `Non leggibile` err al posto dei badge | Banner err (testo dell'hub) + `Non leggibile` err in entrambe le sezioni, **mai** «Spento» | disabilitata + «client.json non leggibile: correggi il file a mano» | `Non leggibile` err |
| errore della route (es. doppia scheda aperta) | — | il dialog resta aperto con l'errore `role="alert"` in `text-err` | «Riprova» = confermare di nuovo | — |
| nessun cliente | EmptyState «Nessun cliente importato» | — | — | — |

`sospeso` è ambra perché è davvero una cosa da tenere d'occhio: ciò che è online resta, ma nessuno lo
cura più. Forma oltre al colore: ogni badge ha la parola.

### 2.6 Conferme (`ConfirmDialog`, tono `brand`; bozze da calibrare in fase 3)

| Azione | Titolo | Messaggio | Bottone |
|---|---|---|---|
| Attiva Sito | Attivare il servizio Sito? | {Azienda} entra nel servizio di ottimizzazione del sito. Per ora l'editor registra solo lo stato e la data: online non cambia nulla. | Attiva Sito |
| Attiva Scheda | Attivare il servizio Scheda Google? | {Azienda} entra nel servizio Scheda Google. Per ora l'editor registra solo lo stato e la data. La scheda del cliente non viene mai modificata dall'editor: le modifiche le inserisci tu. | Attiva Scheda Google |
| Sospendi Sito | Sospendere il servizio Sito? | Il ciclo di ottimizzazione si ferma. Quello che è già online per questo servizio resta online, anche nelle build successive. Puoi riattivarlo quando vuoi. | Sospendi |
| Sospendi Scheda | Sospendere il servizio Scheda Google? | Il lavoro sulla scheda si ferma; la scheda Google del cliente resta com'è. Puoi riattivarlo quando vuoi. | Sospendi |
| Riattiva (entrambi) | Riattivare il servizio {Sito \| Scheda Google}? | Il servizio torna attivo con la data di oggi. | Riattiva |

Durante la richiesta il bottone del dialog è disabilitato («Salvo…»). `Esc` annulla.

### 2.7 Testi dei vuoti (regola: cosa arriverà e cosa serve, mai posizioni, clienti o tempi)

Quelli nei riquadri di §2.3; ogni riquadro «Cosa comparirà qui» chiude con «Nessuna è ancora
disponibile.» Linguaggio operativo, rivolto a Mattia.

### 2.8 Responsive, temi, accessibilità

- 400 px: sidebar a icone (voce «Traffico» con `aria-label`), righe del portafoglio con badge a capo,
  sezioni del dettaglio a una colonna, azione sotto il titolo. Nessuna larghezza fissa oltre `max-w-*`.
- Solo token (`card`, `Badge`, `btn*`, `text-muted`…): i due temi seguono da soli; nessuna coppia di colori
  nuova (badge e banner esistenti già verificati AA).
- Icona sidebar: `Signpost` (lucide, presente): «farsi trovare», senza promettere crescita come
  `TrendingUp`. Icone `aria-hidden`; nessuna animazione nuova.

### 2.9 Assunzioni (da confermare dall'orchestratore o da Mattia)

1. «Interruttore» del brief = bottone con conferma, non uno switch (vedi §2.2-A).
2. Attivazione del Sito senza dominio **ammessa** con avviso (nessuna decisione la vieta).
3. Riattivare sovrascrive `attivatoAt` (data del ciclo in corso) e cancella `sospesoAt`; lo storico delle
   attivazioni non si tiene in T0.
4. Nessuna azione primaria nel dettaglio in T0 (§2.4).
5. Riga «Traffico» dell'hub in fondo alla pagina; da riconsiderare in T2b quando il pannello Sito avrà dati.
6. Sospendere è ammesso anche in percorso demo (spegnere è sempre sicuro); solo l'attivazione è rifiutata.

### 2.10 Anti-obiettivi

Niente KPI card o numeri-eroe (nessun dato da mostrare), niente percentuali o promesse di posizioni,
niente tab, niente switch, nessun bottone blu nel portafoglio o nell'hub, nessun motivo di blocco in un
`title`, nessuna scrittura di `client.json` alla sola apertura delle pagine.

## 3. Modello dati

In `lib/schemas.ts`, dentro `ClientStateSchema`, dopo `demo`:

```ts
// Servizi «Traffico» per cliente (docs/traffico/README.md §3). Chiave assente = entrambi spenti.
// .optional() (non .default()): nessuna scrittura estranea (conferme, catena) la fa nascere;
// compare solo al primo cambio di stato fatto dalla route traffico.
export const StatoServizioTraffico = z.enum(["spento", "attivo", "sospeso"]);
const ServizioTraffico = z.object({
  stato: StatoServizioTraffico,
  /** Ultima attivazione o riattivazione («attivo dal»). */
  attivatoAt: z.string().optional(),
  /** Solo in stato sospeso. */
  sospesoAt: z.string().optional(),
});
// …
  traffico: z
    .object({
      sito: ServizioTraffico.default({ stato: "spento" }),
      scheda: ServizioTraffico.default({ stato: "spento" }),
    })
    .optional(),
```

Invarianti garantite da `transizione()` (unico scrittore), **non** da un `refine` Zod: un campo `traffico`
ritoccato male a mano non deve rendere «corrotto» l'intero `client.json` e bloccare tutto il cliente.

- spento → nessuna data · attivo → `attivatoAt` · sospeso → `attivatoAt` + `sospesoAt`.

`lib/clients.ts`: `ClientSummary.traffico?: ClientState["traffico"]` + spread condizionale in
`listClients()` (stesso schema di `catena`/`demo`), per il portafoglio.

## 4. Regole pure — `lib/traffico.ts` (nessun I/O, solo `import type`)

```ts
export type Traffico = NonNullable<ClientState["traffico"]>;
export type ServizioKey = keyof Traffico;                       // "sito" | "scheda"
export type StatoServizio = Traffico["sito"]["stato"];
export type Percorso = ClientState["percorso"];
export type Rifiuto = { codice: 400 | 409; errore: string };

export const ETICHETTA_SERVIZIO: Record<ServizioKey, string>;   // Sito · Scheda Google
/** Stato con default (file senza campo = entrambi spenti); oggetto nuovo a ogni chiamata. */
export function leggiTraffico(state: Pick<ClientState, "traffico">): Traffico;
/** null = ammessa. Prima la validità della transizione (400), poi il guard demo su «attivo» (409). */
export function motivoRifiuto(da: StatoServizio, verso: StatoServizio, percorso: Percorso): Rifiuto | null;
/** Applica il passaggio con la data; non muta l'input; l'altro servizio resta identico. */
export function transizione(t: Traffico, servizio: ServizioKey, verso: StatoServizio, percorso: Percorso,
  adesso: string): ({ ok: true; traffico: Traffico }) | ({ ok: false } & Rifiuto);
/** Azione mostrata nel dettaglio: Attiva / Sospendi / Riattiva, col motivo del blocco (stessa frase della route). */
export function azioneServizio(s: Traffico[ServizioKey], percorso: Percorso):
  { verso: "attivo" | "sospeso"; etichetta: "Attiva" | "Sospendi" | "Riattiva"; motivoBlocco: string | null };
/** Gruppo del portafoglio. */
export function gruppoPortafoglio(c: { percorso: Percorso; traffico?: ClientState["traffico"] }, corrotto: boolean):
  "non_leggibile" | "accesi" | "spenti" | "demo";
/** Il renderer accende fondamenta e pagine extra: Sito attivo o sospeso (decisione 11). */
export function fondamentaAccese(t: Traffico): boolean;
/** Il ciclo del servizio gira solo se attivo. */
export function cicloAttivo(t: Traffico, servizio: ServizioKey): boolean;
```

Transizioni ammesse: `spento→attivo`, `attivo→sospeso`, `sospeso→attivo`. Tutto il resto (incluso lo
stesso stato e qualunque `→spento`) = 400 «transizione non ammessa: da → verso» / «il servizio è già …».
409 demo: «in percorso demo i servizi Traffico non si attivano: segna prima «Il cliente si è abbonato»».

## 5. Route API

`POST /api/clients/[slug]/traffico` — `app/api/clients/[slug]/traffico/route.ts`, `force-dynamic`, firma
`(req, ctx: { params: Promise<{ slug: string }> })` come le route esistenti (Next 16: `params` è una Promise).

Input (Zod, `.strict()`): `{ servizio: "sito" | "scheda", stato: "spento" | "attivo" | "sospeso" }`.

| Codice | Quando | Corpo |
|---|---|---|
| 200 | transizione applicata | `{ ok: true, traffico }` |
| 403 | `Sec-Fetch-Site` diverso da `same-origin`/`none` (CSRF: una pagina esterna non scrive `client.json`) | `{ error }` |
| 415 | `content-type` diverso da `application/json` (impone il preflight CORS a ogni richiesta cross-origin) | `{ error }` |
| 400 | slug non valido (`clientDir` lancia) · JSON o campi non validi · transizione non ammessa | `{ error }` leggibile |
| 404 | cartella del cliente assente | `{ error: "cliente non trovato" }` |
| 409 | percorso demo e `stato: "attivo"` · `client.json` fuori schema (`motivoCorrotto`, controllato prima; `patchClientState` in try/catch come rete) | `{ error }` con il dettaglio |

Flusso: slug → esistenza → body → `motivoCorrotto` → `readClientState` → `transizione(leggiTraffico(s), …,
new Date().toISOString())` → `patchClientState(slug, s => { s.traffico = esito.traffico })`.
Nessun GET: le pagine sono server component che leggono il filesystem.

## 6. File

| File | Tipo | Cosa |
|---|---|---|
| `site-factory-editor/lib/schemas.ts` | M | campo `traffico` + `StatoServizioTraffico` esportato |
| `site-factory-editor/lib/traffico.ts` | A | regole pure (§4) |
| `site-factory-editor/scripts/test-traffico-stato.ts` | A | banco senza rete (§9) |
| `site-factory-editor/lib/clients.ts` | M | `traffico` in `ClientSummary`/`listClients` |
| `site-factory-editor/app/api/clients/[slug]/traffico/route.ts` | A | route (§5) |
| `site-factory-editor/components/traffico-ui.tsx` | A | `ServizioBadge` e `StatoServizi`, unica fonte del badge (§12-d: sostituisce `ui.tsx`) |
| `site-factory-editor/components/sidebar.tsx` | M | voce «Traffico» (`Signpost`) tra Clienti e Fabbrica |
| `site-factory-editor/app/traffico/page.tsx` | A | portafoglio |
| `site-factory-editor/app/traffico/[slug]/page.tsx` | A | dettaglio (server) con le due sezioni |
| `site-factory-editor/components/traffico-azione.tsx` | A | client: bottone + `ConfirmDialog` + POST + `router.refresh()` |
| `site-factory-editor/app/clienti/[slug]/page.tsx` | M | riga «Traffico» dopo la lista degli step |
| `site-factory-editor/DESIGN-BRIEF.md` | M | sezione «Area Traffico (shape — 2026-09-14)» |
| `docs/traffico/piano-T0.md` | M | Calibrazione, Verifica, chiusura |
| `docs/traffico/README.md` | M | §7 stato T0 |
| `docs/handoff-fase-c.md` | M | riga T0 |

Non si toccano: `lib/steps.ts`, `lib/catena.ts`, `lib/build.ts`, `lib/deploy.ts`, `lib/conferme.ts`,
`lib/stati.ts`, renderer, n8n, skill. `docs/DEBUG.md` non cambia (T0 non produce log).

## 7. Perimetro per `.claude/scope.json` (da scrivere come primo atto della fase 2)

```json
{
  "task": "T0 Area Traffico: forma e scheletro (docs/traffico/piano-T0.md)",
  "perimetro": [
    "site-factory-editor/lib/schemas.ts",
    "site-factory-editor/lib/traffico.ts",
    "site-factory-editor/lib/clients.ts",
    "site-factory-editor/scripts/test-traffico-stato.ts",
    "site-factory-editor/app/api/clients/[slug]/traffico/route.ts",
    "site-factory-editor/components/ui.tsx",
    "site-factory-editor/components/sidebar.tsx",
    "site-factory-editor/components/traffico-azione.tsx",
    "site-factory-editor/app/traffico/**",
    "site-factory-editor/app/clienti/[slug]/page.tsx",
    "site-factory-editor/DESIGN-BRIEF.md",
    "site-factory-editor/DESIGN-SYSTEM.md",
    "docs/traffico/**",
    "docs/handoff-fase-c.md"
  ]
}
```

Sostituisce il perimetro della roadmap (che include anche `docs/ricerca-traffico-2026-09.md`, non
necessario a T0). Le fixture in `site-renderer/out/` sono esenti dal guard.

## 8. Milestone (ogni verifica deve passare prima della successiva)

**M1 — Modello e regole.** `schemas.ts`, `lib/traffico.ts`, `test-traffico-stato.ts`, `clients.ts`.
Verifica: `node --experimental-strip-types scripts/test-traffico-stato.ts` verde; `npx tsc --noEmit`;
`scripts/test-stati.ts`, `scripts/test-portafoglio.ts`, `scripts/test-demo.ts` verdi.

**M2 — Route.** Verifica sul dev server (editor, :3311 o :3000), con `sha256` di
`out/cavaliere-build-srls/client.json` e del suo `updatedAt` annotati **prima**:
1. Cavaliere `{sito, attivo}` → 200, file con `traffico.sito = {stato:"attivo", attivatoAt}`, `scheda` spento;
2. di nuovo `attivo` → 400; `{sito, spento}` → 400; `{scheda, sospeso}` → 400;
3. `{sito, sospeso}` → 200 con `sospesoAt`; `{sito, attivo}` → 200, `sospesoAt` sparito, `attivatoAt` nuova;
4. body non JSON / `servizio:"x"` / chiave in più → 400; slug `../x` → 400; slug inesistente → 404;
5. `mattia-saggin-costruzioni` `{sito, attivo}` → 409 e file invariato (sha);
6. fixture `site-renderer/out/zz-test-traffico-rotto/` (`intake.json` minimo + `client.json` = `{"version":1}`)
   → 409 col dettaglio, file invariato.
Poi **ripristino di Cavaliere**: tolgo `traffico` e rimetto l'`updatedAt` originale con Edit, e controllo
che lo sha coincida con quello iniziale. **Commit 1** (M1+M2, path espliciti) + push.

**M3 — UI.** `ui.tsx`, `sidebar.tsx`, portafoglio, dettaglio, `traffico-azione.tsx`, riga hub.
Verifica: `tsc`, `npm run build`; nel browser a 1280 e 400 px, tema chiaro e scuro: portafoglio con i 4
gruppi (fixture compresa), dettaglio di Cavaliere nei tre stati (attivazione → sospensione → riattivazione
dal dialog), di `costruzioni-generali…` (avviso senza dominio), di `mattia-saggin…` (bottone disabilitato
+ frase), della fixture (banner + «Non leggibile»); errore nel dialog (dialog aperto in due schede, conferma
nella seconda → 400 mostrato); hub dei tre clienti con la riga; `Esc` e focus del dialog; sidebar attiva su
`/traffico` e `/traffico/[slug]`, «Clienti» non evidenziata. `impeccable detect --json` sui file UI toccati.
Ripristino di Cavaliere come in M2.

**M4 — Documenti.** Sezione in `DESIGN-BRIEF.md`, riga in `DESIGN-SYSTEM.md` §5.

Fasi 3-5 del ciclo: calibrazione dei testi (§2.6-2.7) con `/impeccable clarify` mirato; test completi (§11);
`/impeccable critique` sulle tre viste; revisione del diff riga per riga; README §7, handoff; fixture
spostata nel Cestino; `scope.json` svuotato; **commit finale** dopo le verifiche dell'orchestratore.

## 9. Banco `scripts/test-traffico-stato.ts` (senza rete, stile `test-stati.ts`)

`leggiTraffico`
1. stato senza `traffico` → `{sito:{stato:"spento"}, scheda:{stato:"spento"}}`;
2. due chiamate restituiscono oggetti distinti (mutarne uno non tocca l'altro);
3. con `traffico` presente → restituito uguale.

`transizione` / `motivoRifiuto`
4. spento→attivo: ok, `attivatoAt = adesso`, niente `sospesoAt`;
5. attivo→sospeso: ok, `sospesoAt = adesso`, `attivatoAt` conservata;
6. sospeso→attivo: ok, `attivatoAt = adesso`, `sospesoAt` rimossa;
7. spento→sospeso → 400; attivo→attivo → 400; sospeso→sospeso → 400; spento→spento → 400;
8. attivo→spento → 400; sospeso→spento → 400;
9. demo: spento→attivo → 409; sospeso→attivo → 409; attivo→sospeso → ok; spento→sospeso → 400 (la
   validità precede il guard);
10. cambiare `sito` lascia `scheda` identico (deep equal) e viceversa;
11. l'input non viene mutato (snapshot JSON prima/dopo);
12. il messaggio 409 è la stessa stringa di `azioneServizio(...).motivoBlocco` in demo.

`azioneServizio`
13. spento → Attiva/attivo; attivo → Sospendi/sospeso; sospeso → Riattiva/attivo;
14. completo → `motivoBlocco` null; demo+spento e demo+sospeso → motivo; demo+attivo → null (sospendere ok).

`gruppoPortafoglio`
15. corrotto → `non_leggibile` (anche se lo stato sintetizzato dice spento);
16. un servizio attivo o sospeso → `accesi` (anche in demo);
17. entrambi spenti: completo → `spenti`, demo → `demo`; senza campo → come spenti.

`fondamentaAccese` / `cicloAttivo`
18. sito spento → false; attivo → true; sospeso → true; senza campo → false; la scheda non conta;
19. `cicloAttivo`: attivo → true; sospeso e spento → false; per servizio indipendente.

## 10. Rischi e come li evito

| Rischio | Contromisura |
|---|---|
| I `client.json` esistenti cambiano o diventano «corrotti» | `traffico` `.optional()`: la chiave nasce solo dalla route; nessun `refine`; verifica E2E: sha di tutti i `client.json` identici dopo aver aperto home, `/traffico`, 3 dettagli e 3 hub. |
| Default Zod condiviso e mutato | le regole restituiscono oggetti nuovi, la route assegna `s.traffico = …`; casi 2 e 11 del banco. |
| Effetti su hub, catena, build, deploy | nessun import di `lib/traffico.ts` in steps/catena/build/deploy/conferme; la riga hub è fuori da `righe` (`prossimo` invariato); in fase 5 `git diff --stat` = solo §6 e `rg traffico` su quei moduli vuoto; `test-stati`/`test-portafoglio`/`test-demo` verdi. |
| Home: `ClientSummary` più grande | campo opzionale, presente solo quando esiste; la home non lo legge. |
| File corrotto → 500 o stato falso | 409 leggibile nella route; la UI controlla `corrotto` prima di mostrare qualunque stato. |
| Stato sporco su Cavaliere dopo i test | sha iniziale annotato, ripristino con Edit, sha confrontato (M2, M3). |
| Fixture lasciata in `out/` (compare in home, finirebbe nel backup Drive) | nome `zz-test-*`, spostata nel Cestino a fine fase 4, controllo con `ls`. |
| Scritture concorrenti su `traffico` | unico scrittore la route, un solo operatore; il `patchClientState` rilegge il file per gli altri campi. |
| API di Next 16 diverse dal previsto | consultati in fase 1 `route.md`, `dynamic-routes.md`, `use-router.md` (params Promise, `router.refresh`), da rileggere per intero prima del codice; si ricalca la route build esistente. |
| Testi che promettono | tabella §2.6-2.7 calibrata in fase 3; nessuna parola su posizioni, clienti in più o tempi. |

## 11. Verifica finale (criteri del brief)

- Attivare Sito di `cavaliere-build-srls` scrive `stato:"attivo"` con data; sospendere e riattivare
  funzionano; transizioni vietate → 400 (M2 punti 1-3, banco 4-8).
- Cliente demo: bottone disabilitato con motivo visibile, route 409 (M2-5, M3, banco 9, 12, 14).
- `client.json` senza `traffico` letto come spento e mai riscritto dalla lettura (banco 1, sha E2E §10).
- `npx tsc --noEmit`, `npm run build`, `test-traffico-stato.ts`, `test-stati.ts`, `test-portafoglio.ts`
  (e `test-demo.ts`) verdi.
- UI nei due temi a 1280 e 400 px; `/impeccable critique` senza problemi gravi; detector pulito.
- Nessun altro comportamento cambia (diff limitato a §6, verifiche di §10). Cavaliere tornato byte-identico.

## 12. Decisioni (prese dall'orchestratore prima della fase 2)

a. **Sito senza dominio: attivazione ammessa, con avviso** che fondamenta e sensori richiedono il dominio
   (`Banner warn` nella sezione Sito e paragrafo a parte nella conferma).
b. **La prima attivazione non si perde**: `primaAttivazioneAt` nasce alla prima attivazione e non cambia più;
   `attivatoAt` e `sospesoAt` sono l'ultimo passaggio ad attivo e a sospeso, e `sospesoAt` resta anche dopo una
   riattivazione (servono a report e misura degli effetti). Sostituisce l'assunzione §2.9-3 e le invarianti del §3:
   spento → nessuna data · attivo → `primaAttivazioneAt` + `attivatoAt` (+ `sospesoAt` se mai sospeso) ·
   sospeso → tutte e tre. Un campo ritoccato a mano senza date non riceve una prima attivazione inventata in
   sospensione (banco).
c. **Bottoni con conferma** al posto degli switch e **nessuna primaria nel dettaglio**: approvati.
d. **`components/ui.tsx` e `DESIGN-SYSTEM.md` non si toccano**: `ServizioBadge` e `StatoServizi` vivono in
   `components/traffico-ui.tsx`; nel perimetro (§6-§7) `ui.tsx` e `DESIGN-SYSTEM.md` sono sostituiti da quel file.
   Lo studio è in `DESIGN-BRIEF.md` §Area Traffico.
e. Fixture solo `site-renderer/out/zz-test-traffico-*`, rimosse a fine lavoro; Cavaliere ripristinato identico
   (sha256 confrontato).

## Calibrazione

Fase 3, 2026-09-14. Materiale: le tre viste nel browser (1280 e 400 px, chiaro e scuro) con i clienti reali e la
fixture, `/impeccable critique` in un solo contesto (nessuno strumento per i sub-agent in questa sessione: passata
degradata) e `impeccable detect --json` sui 6 file UI (0 finding). Soglie numeriche: nessuna in T0.

Cambi rispetto allo shape del §2, con il perché:

| Dove | Prima (bozza §2) | Dopo | Perché |
|---|---|---|---|
| Portafoglio, nessun servizio acceso | `EmptyState` in card sopra i gruppi | riga `Signpost` nell'header: «Nessun servizio acceso per ora.» | con i clienti elencati sotto non è un vuoto vero; la card spingeva la lista di ~170 px (densità da strumento); il «come si attiva» è già nell'intro, detto una volta |
| Dettaglio, motivo del blocco | frase ripetuta in ogni sezione | una frase in testa (demo: `MOTIVO_DEMO`, la stessa della route 409; file illeggibile: il banner err), bottoni con `aria-describedby` | in demo la stessa frase compariva due volte a pochi centimetri |
| Dettaglio, file illeggibile | header con «percorso completo · senza dominio» | solo la città | percorso e dominio sarebbero sintetizzati, cioè falsi (successo §2.1: mai uno stato inventato) |
| Riga date | mono muted | `text-sm text-ink` | è il fatto principale della sezione, non un registro tecnico; «Mai attivato» in monospace sembrava un codice |
| «Cosa servirà» del Sito | «il sito online con un dominio» + conseguenza | «il sito pubblicato con il suo dominio» | la conseguenza sta già nell'avviso warn (detta una volta) |
| «Cosa comparirà qui» del Sito | «correzioni proposte» | «le correzioni a titoli, descrizioni e link interni» | le correzioni saranno in parte automatiche con i gate (decisione 4): «proposte» sarebbe impreciso |
| Chiusura dei riquadri | «Nessuna è ancora disponibile.» | «Per ora nessuna di queste parti è disponibile.» | il soggetto sottinteso non si capiva |
| Conferma Attiva Sito | «entra nel servizio di ottimizzazione del sito» | «entra nel servizio Sito. Per ora l'editor registra solo lo stato e la data: online non cambia nulla.» + senza dominio un paragrafo a parte: «Il sito non è ancora pubblicato con il suo dominio: fondamenta tecniche e sensori partiranno solo da quel momento.» | stesso nome del servizio in tutta l'area; l'unica informazione che può cambiare la decisione sta da sola |
| Conferma Riattiva | «Il servizio torna attivo con la data di oggi.» | «Il servizio torna attivo da oggi. La data della prima attivazione resta quella originale.» (+ paragrafo dominio per il Sito) | decisione §12-b resa visibile nel momento in cui preoccupa |
| Conferma Sospendi Sito | «Quello che è già online per questo servizio…» | «Ciò che il servizio ha già messo online resta online, anche nelle build successive.» | più corto, stesso significato (decisione 11) |
| Errori nel dialog | sempre «Riprova» | 4xx: conferma disabilitata, «Chiudi» rilegge la pagina, testo + «Chiudi per vedere lo stato aggiornato.»; rete/disco (5xx): «Riprova» | riprovare un 400 «il servizio è già sospeso» dà sempre 400 |
| Messaggi 400 della route | «transizione non ammessa: da → verso» | «Transizione non ammessa da attivo a spento: da attivo si può solo sospendere» · «Il servizio è già sospeso: forse è stato cambiato da un'altra finestra» | dicono cosa si può fare e la causa probabile |
| Focus | perso sul `body` dopo la chiusura del dialog | torna al bottone dell'azione | tastiera: `ConfirmDialog` non restituisce il focus da solo |

Verificati e lasciati come nello shape: gruppi e loro ordine, «Con un servizio acceso» (acceso = attivo o
sospeso, come le fondamenta), badge Sospeso in ambra, icona `Signpost`, riga dell'hub dopo gli step,
`MOTIVO_DEMO` = «In percorso demo i servizi Traffico non si attivano: segna prima «Il cliente si è abbonato»
nell'hub del cliente».

## Verifica

Fase 2 (sviluppo), 2026-09-14, dev server dell'editor su :3311. Le verifiche complete della fase 4 restano
all'orchestratore.

- **Banchi**: `test-traffico-stato.ts` 45/45 (i 19 punti del §9 più prima attivazione immutabile, campi ritoccati a
  mano, `fraseDate`); `test-stati.ts` 30/30, `test-portafoglio.ts` 43/43, `test-demo.ts` 19/19. `npx tsc --noEmit`
  e `npm run build` verdi dopo ogni milestone; `impeccable detect --json` sui 6 file UI: 0 finding.
- **Route (M2)**: Cavaliere `{sito, attivo}` → 200 con `primaAttivazioneAt` = `attivatoAt`, scheda spenta; di nuovo
  attivo, `{sito, spento}`, `{scheda, sospeso}` → 400; sospendi → 200 con `sospesoAt`; riattiva → 200 con
  `attivatoAt` nuova, `primaAttivazioneAt` e `sospesoAt` conservate; corpo non JSON, `servizio:"x"`, chiave in più,
  array → 400 leggibile; slug `../x` e `Maiuscolo` → 400; slug inesistente → 404; `mattia-saggin-costruzioni`
  attiva → 409 con `MOTIVO_DEMO` e file invariato (sha); fixture `zz-test-traffico-rotto` (`{"version":1}`) → 409 col
  dettaglio e file invariato.
- **UI (M3)**: 1280 e 400 px, tema chiaro e scuro: portafoglio con i quattro gruppi (fixture compresa) e senza
  scroll orizzontale; Cavaliere dal dialog attivato → sospeso → riattivato (date e bottone aggiornati dal refresh,
  focus di nuovo sul bottone); errore nel dialog simulando la seconda finestra (stato cambiato fuori dal dialog)
  → 400 mostrato, conferma disabilitata, `Esc`/«Chiudi» rilegge lo stato vero; `costruzioni-generali…` con avviso
  warn e paragrafo dominio nella conferma, `Esc` annulla senza scrivere; `mattia-saggin…` bottoni disabilitati con la
  frase in testa; fixture con banner, «Non leggibile», nessuna riga date, `aria-describedby` risolto; hub dei tre
  clienti e della fixture con la riga Traffico e la primaria invariata; sidebar «Traffico» attiva su `/traffico` e
  `/traffico/[slug]`, «Clienti» no; `/traffico/inesistente-zz` e `/traffico/Bad_Slug` → 404.
- **Nessuna scrittura alla lettura**: sha256 dei quattro `client.json` identici prima e dopo home, `/traffico`,
  quattro dettagli e quattro hub. Nessun riferimento a `traffico` in `steps`, `catena`, `build`, `deploy`,
  `conferme`, `stati`.
- **Cavaliere ripristinato identico** dopo M2 e dopo M3 (con Edit): sha256
  `1c4403788718bce06c2dde0d80aaff7ca71c22d89a5d6be94772dea3446833ef` prima e dopo.
- Fuori perimetro, visto di passaggio: a 400 px l'hub del cliente scorre in orizzontale per le azioni della testata
  (`ClienteAzioni`) e le righe degli step; preesistente, non toccato.
