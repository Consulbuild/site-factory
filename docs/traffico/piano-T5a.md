# Piano T5a — Contratto multipagina e renderer

Brief: `docs/traffico/brief-T5a.md`. Roadmap: `docs/traffico/README.md`. Stato: **fase 1 (piano) scritta il
2026-09-14, da rivedere dall'orchestratore**. Nessun codice toccato; `.claude/scope.json` è occupato dal
perimetro «T1a-integrazione» di un'altra sessione: la fase 2 parte solo quando quel perimetro è svuotato
(README §5).

## 1. Contesto

Il renderer oggi costruisce una home (`index.astro`, sezioni per indice da `site.json`) e tre sottopagine
noindex (`/privacy`, `/termini`, `/grazie` via `SubPage.astro`), più le pagine QA `/anteprima/<preset>/` e
`/anteprima-componenti/<preset>/` che `lib/build.ts` cancella dalla `dist` dopo `astro build`.

T5a aggiunge al contratto un blocco **`pages`** opzionale e al renderer le pagine indicizzabili del servizio
Sito: **servizio** (una per macro-servizio), **zone** (Zone servite), **lavori** (indice), **cantiere**
(singolo lavoro con foto reali) e **comune** (predisposta per T6b). Nessuna generazione: il copy arriva da T5b,
l'integrazione nella build dei clienti (registro slug, `_redirects`, `--pagine` in `lib/build.ts`,
`not_found_handling` in `wrangler.jsonc`) è di T5c.

Vincoli che reggono tutto il piano:

- **Additivo.** Home, slot per indice (`slots.json`, `lib/slots-shared.ts`) e merge dell'assembler non
  cambiano. Senza `pages` la `dist` è identica byte per byte a oggi (README §3, decisioni 3 e 11).
- **Contratti a monte.** T1a: `elencoPagine` prende ogni `x/index.html` non noindex fuori da `_astro`,
  `media`, `fonts` ed esclude `404.html`; `controllaPagina` vuole canonical = `https://<dominio>/<path>/`,
  JSON-LD senza chiavi vietate (`aggregateRating`, `review`, `geo`, `openingHours*`, `priceRange`,
  `areaServed`, `taxID`), una H1, title ≤ 60 e description ≤ 160 (avvisi). T4: chiavi di pagina `home`,
  `servizio:<slug della macro>`, `zone`, `comune:<istat>`. T6a: fatti come `FraseFatto { testo, citazione,
  url }`, distanza «in linea d'aria tra i centri geografici dei comuni». T3: cantieri con comune ISTAT,
  servizio, anno e 1-8 foto; prezzi `{ importo, unita, iva, dichiaratoIl, validoFino }`; attestati.
- **Ricerca** (§3.2, §4.2, §6.2, §6.3, §7): pagina per servizio con città nello slug e in title/H1 (fattore
  n. 1), zone in una pagina sola (niente servizio × comune), lavori con ≥ 3 foto reali per cantiere, link
  interni con anchor descrittivo, ogni pagina a ≤ 2 clic e con ≥ 2 link in entrata, pagine comune solo con ≥ 3
  fatti con URL della fonte e ≥ 1 cantiere reale nel comune, BreadcrumbList sì, `AggregateRating` mai.

## 2. Prove tecniche fatte in fase 1 (copia del renderer nello scratchpad, nessun file del repo toccato)

Build di confronto con `SITE_URL=https://x.invalid` e `diff -r` delle `dist`:

| # | Modifica | Esito |
|---|---|---|
| E1 | route `src/pages/[...percorso].astro` con zero percorsi + componente nuovo con una utility Tailwind nuova | **`dist` diversa**: il CSS condiviso cambia hash (`grazie.C8EHddEV.css` → `grazie.DOr1dm8c.css`) e con lui ogni HTML. Tailwind v4 scansiona tutti i file del progetto non ignorati da git, anche le route senza pagine. |
| E2 | come E1, ma `@source not "../pagine";` in `global.css` e stile del componente in `<style>` scoped con `@reference "../styles/global.css"` + `@apply` | **`dist` identica** |
| E3 | E2 con due percorsi (`servizi/bagni`, `404`) | `servizi/bagni/index.html` con canonical `https://x.invalid/servizi/bagni/`; il parametro `404` produce **`404.html`** alla radice (Astro tratta `/404` come pagina di stato); **home identica** anche con le pagine; lo stile scoped finisce solo nelle pagine che usano il componente |
| E4 | `Services.astro` importa (senza renderlo) un componente con `<style>` | **home diversa**: gli stili seguono il grafo degli import, non il render |
| E5 | markup condizionale in `Gallery.astro` con sole classi già esistenti, espressione su riga propria | **home diversa di un byte**: spazio in più dal whitespace attorno all'espressione |
| E6 | come E5 ma espressione attaccata al tag precedente (`</ul>{lavori && …}`) | **`dist` identica** |
| E7 | route di anteprima `src/pages/anteprima/[preset]/pagine/[...pagina].astro` accanto a `anteprima/[preset].astro` + `@source not "../../blueprints/*/pages.json"` con testo simile a utility | route coesistenti, **resto della `dist` identico** |

Regole che ne derivano (vincolanti in fase 2):

1. Componenti nuovi in **`src/pagine/`**, esclusa dalla scansione Tailwind. Nel markup solo classi semantiche
   di `global.css` (`.t-h1…`, `.eyebrow`, `.btn*`, `.surface-card*`, `.section-dark*`, `.section-pad`,
   `.container-site`, `.media-frame`, `.media-caption`, `.accent-word`) e classi locali; ogni utility passa da
   `@apply` nel `<style>` scoped del componente (token-driven, stesse utility di scala ammesse da
   `lint-tokens.mjs`).
2. Componenti esistenti (`Header`, `Services`, `Gallery`): nessun import nuovo, nessun `<style>` nuovo, solo
   classi già presenti nel CSS di oggi, espressioni condizionali attaccate ai tag vicini.
3. Route file (`[...percorso].astro`, anteprime) senza attributi `class`.
4. Gate a ogni milestone: `diff -r` delle `dist` senza pagine prima/dopo (§13.1), nome del file CSS compreso.

## 3. Studio UX (impeccable shape)

Nessun utente da intervistare: le risposte sono le decisioni del brief, della ricerca e di `DESIGN.md`/
`PRODUCT.md`. Assunzioni marcate **[A]**. Mondo visivo stabilito (lo Standard ConsulBuild): si estende, non si
inventa; niente tornata di concept, niente modifiche alla grammatica.

### 3.1 Compito, pubblico, esito

- **Chi arriva**: il visitatore finale, quasi sempre da mobile, **direttamente sulla pagina interna** da una
  ricerca locale («rifacimento bagno brugherio», «impresa edile cologno monzese»), senza passare dalla home
  **[A]**. Modo **Persuade**: ogni pagina interna è una landing a sé.
- **Deve capire in 5 secondi**: fanno questo lavoro, qui, e sono un'impresa vera. **Deve poter fare subito**:
  chiamare o chiedere il preventivo senza cambiare pagina.
- **Prova prima della promessa**: foto di cantieri reali con comune e anno, cosa comprende il lavoro, prezzo
  «da» solo se dichiarato, fatti del territorio con fonte, distanze dichiarate come linea d'aria.
- **Anti-obiettivi**: pagine città clonate, blog, testo gonfiato, hero-metric template, badge inventati, un
  mega-menu, qualunque stile nuovo fuori grammatica.

### 3.2 Scheletro comune (una sola formula per tutti i tipi)

`Header` · **Hero pagina** (scuro) · **Corpo del tipo** (chiaro, `bg-surface`) · [**Lavori** (scuro)] ·
[**Chiusura** (chiaro)] · **Contatti con form** (scuro, la `ContactCTA` form della home) · `StickyCta` ·
`Footer`.

Regola del ritmo (funzione pura `sequenza`, provata nel banco): mai due sezioni scure della stessa tonalità
adiacenti. Chiusura = FAQ della pagina se c'è; altrimenti, **solo se c'è il blocco Lavori**, la
`ProcessSteps` della home (serve a separare Lavori da Contatti ed è contenuto di conversione legittimo su una
landing) **[A]**; altrimenti niente. Se mancano sia FAQ sia `ProcessSteps` nella home, il blocco Lavori passa
in versione chiara. Contatti scuro seguito dal Footer `section-dark--deep` è lo stesso passo di tono di Hero →
TrustBar in home.

Strutture valutate per la pagina servizio (la più importante): (a) landing lunga con processo, FAQ, banner e
form — scartata per densità e testo duplicato; (b) scheda tecnica con form fisso in colonna laterale da
desktop — scartata: rompe il ritmo scuro/chiaro e sposta il form fuori dalla grammatica; (c) risposta breve +
form in hero — scartata: promessa prima della prova. Scelta: lo scheletro sopra, che mette la prova (corpo,
lavori) tra la risposta (hero) e l'azione (form).

### 3.3 Per tipo di pagina

| Tipo | Sezioni in ordine | H1 (esempio) | CTA | Prove reali | 390 px |
|---|---|---|---|---|---|
| **servizio** | Hero (foto se c'è) · Dettaglio · Lavori correlati (≤ 3 cantieri del servizio) · FAQ del servizio \| Processo · Contatti | «Bagni e cucine a **Roma**» | hero: CTA 1 della hero home (→ `#contatti`) + telefono; nel riquadro «Cosa comprende»: CTA preventivo | lista «Cosa comprende» (3-10 voci), prezzo «da» con data di dichiarazione e validità, abilitazioni (≤ 4, testo), cantieri del servizio con foto | testo poi riquadro; CTA impilate a tutta larghezza; prezzo leggibile senza zoom |
| **zone** | Hero (senza foto) · Elenco zone · Lavori nella zona · FAQ \| Processo · Contatti | «Zone servite: **Roma** e provincia» | come sopra | sede in testa, comuni ordinati per distanza (km interi, «in linea d'aria»), ≤ 2 fatti per comune con fonti in nota, link alle pagine comune esistenti | un comune per riga con divisori, km allineati a destra, fatti sotto il nome |
| **lavori** | Hero (senza foto) · Indice dei cantieri · Contatti | «I nostri **lavori** a Roma» | come sopra | schede: foto, servizio · comune · anno, titolo-link | una scheda per riga, foto 4:3 |
| **cantiere** | Hero (foto obbligatoria) · Racconto + «In breve» · Foto (`Gallery` riusata, 3-12) · Altri lavori (chiaro) \| Processo · Contatti | «Appartamento a **Tivoli**» | come sopra | servizio (link), comune (link a pagina comune o Zone), anno, foto con didascalie coerenti | «In breve» dopo il racconto; griglia foto della `Gallery` (prima a tutta larghezza) |
| **comune** (predisposta) | Hero (foto di un cantiere del comune, obbligatoria) · Territorio · Lavori nel comune (≥ 1) · FAQ \| Processo · Contatti | «Ristrutturazioni a **Tivoli**» | come sopra | 3-6 fatti con citazione e link alla fonte, distanza dalla sede, servizi offerti (link), cantieri nel comune | fatti in righe con filetti, citazione piccola sotto ciascun fatto |
| **404** | Header · Non trovata · Footer | «Pagina **non trovata**» (fisso) | telefono + preventivo (`/#contatti`) | elenco link: home, servizi, zone, lavori | lista a tutta larghezza |

Hero pagina: breadcrumb in alto nella hero (didascalia in maiuscolo/minuscolo, chevron, testo chiaro
sull'overlay), H1 `.t-h1` maiuscolo con **una** frase accent, intro `.t-lead` ≤ 220 caratteri che dice cosa, dove
e per chi (answer-first), CTA + telefono. **Niente eyebrow nella hero**: il breadcrumb occupa quel posto e due
righe maiuscole impilate su mobile sono rumore **[A]**. Con foto: overlay `.hero-overlay` come la hero A, altezza
guidata dal contenuto (niente `min-h` da home). A 390 px hero, H1 su 3 righe, intro su 4 e due CTA stanno sopra
la piega (~530 px sotto un header di 64).

Dettaglio servizio: sezione a due colonne da `lg` (testo 7/12, riquadro 5/12). Sinistra: eyebrow, H2 accent,
1-4 paragrafi a misura di prosa. Destra: `surface-card` «Cosa comprende» con spunte accent; sotto un filetto il
prezzo («da 8.500 €» in `.t-h3`, «a lavoro, IVA inclusa», nota fissa «Prezzo indicativo dichiarato dall'impresa
il gg/mm/aaaa, valido fino al gg/mm/aaaa. Il preventivo definitivo arriva dopo il sopralluogo.»); poi le
abilitazioni (icona `award`); in fondo la CTA. Il prezzo **scade**: dopo `validUntil` il renderer non lo mostra.

### 3.4 Header, menu mobile, breadcrumb, link dalla home

- **Header** (dati riscritti, componente quasi invariato): la nav resta ≤ 5 voci. Con la pagina Lavori
  `#lavori` diventa `/<slug lavori>/` (voce aggiunta dopo «Servizi» se la Gallery è stata tolta); con la pagina
  Zone si aggiunge «Zone servite» prima di «Contatti» e, oltre 5 voci, esce «Processo». **Niente sottomenu dei
  servizi** **[A]**: «Servizi» porta a `/#servizi`, dove ogni card linka la sua pagina; il footer elenca tutti i
  servizi su ogni pagina. Sulle pagine interne `#x` diventa `/#x`, tranne `#canali` → `#contatti` (il form della
  pagina stessa); la CTA dell'header punta già a `#contatti`. `aria-current="page"` sulla voce della pagina
  corrente. Menu mobile: stesso `details/summary`, stesse voci.
- **Breadcrumb**: `<nav aria-label="Percorso"><ol>` Home › genitore › pagina (corrente con `aria-current`,
  non link); ultima voce troncata su una riga a 390 px (l'H1 subito sotto la ripete per intero). Genitore
  derivato dal tipo: cantiere → Lavori, comune → Zone servite (se la pagina esiste), gli altri → Home.
- **Home con pagine**: titolo della card servizio come link alla sua pagina (anchor = titolo, freccia
  `aria-hidden`, area di tocco ≥ 44 px); sotto la Gallery il bottone «Vedi tutti i lavori»; footer con colonna
  «Servizi» (anchor = `label` della pagina) e «Zone servite»/«Lavori» in «Link utili». Anche le sottopagine
  legali usano lo stesso footer.

### 3.5 Stati e intervalli realistici

Servizi 1-8 (tipicamente 3-5, uno per card); zone 1-40 comuni (tipicamente 8-15); cantieri 0-10 con 3-12 foto;
comuni 0-6; totale ≤ 20 pagine. Stati da coprire nelle anteprime: servizio **completo** (foto, prezzo,
abilitazioni, FAQ, lavori) e **minimo** (senza foto, prezzo, FAQ, lavori); comune con nome lungo; zone con
nomi lunghi («Guidonia Montecelio», «Sant'Angelo Romano»); cantiere con 4 foto; 404.

## 4. Contratto Zod (`site-renderer/src/lib/schema.ts`)

Chiavi in inglese come il resto dello schema; valori di `type` = prefissi delle chiavi d'identità di T4/T5c.

```ts
/* ------------------------------------------------------------------ */
/* Pagine interne (servizio Traffico «Sito», docs/traffico/piano-T5a.md) */
/* ------------------------------------------------------------------ */

const SEG = "[a-z0-9]+(?:-[a-z0-9]+)*";
/** Primo segmento vietato: pagine esistenti, cartelle QA e asset della dist. */
export const SLUG_RISERVATI = ["privacy", "termini", "grazie", "anteprima", "anteprima-componenti", "media", "fonts", "404", "index"];
const PageSlug = z
  .string()
  .max(80)
  .regex(new RegExp(`^${SEG}(?:/${SEG}){0,2}$`), "slug: minuscole, cifre e trattini; 1-3 segmenti separati da «/», senza barre all'inizio o alla fine")
  .refine((s) => !SLUG_RISERVATI.includes(s.split("/")[0]), "slug in conflitto con una pagina o una cartella del sito");

const ServiceId = z.string().regex(new RegExp(`^servizio:${SEG}$`));
const Istat = z.string().regex(/^\d{6}$/, "codice ISTAT a 6 cifre");
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data AAAA-MM-GG");
const TownRef = z.object({ istat: Istat, name: shortText(60).min(1), province: z.string().regex(/^[A-Z]{2}$/) });
/** Un fatto di T6a già scritto (FraseFatto): testo, citazione e URL della fonte. */
const LocalFact = z.object({ text: shortText(90).min(1), citation: shortText(160).min(1), url: z.string().url() });
const Paragraphs = (max: number) => z.array(shortText(600).min(1)).min(1).max(max);

const PageSeo = z.object({ title: shortText(60).min(1), description: shortText(160).min(1) });
const PageHero = z.object({
  title: accentTitle(60),                 // l'unica H1 della pagina
  intro: shortText(220).min(1),           // answer-first: cosa, dove, per chi
  image: ImageSchema.nullable().default(null),
});
const PageHeroPhoto = PageHero.extend({ image: ImageSchema });
/** label = anchor descrittivo in footer, schede, breadcrumb e nav. */
const pageBase = { slug: PageSlug, seo: PageSeo, label: shortText(40).min(1) };
const FaqProps = FaqSection.shape.props;

export const ServicePage = z.object({
  type: z.literal("servizio"),
  id: ServiceId,
  ...pageBase,
  hero: PageHero,
  card: z.number().int().min(0).nullable().default(null), // indice della card Services in home che approfondisce
  detail: z.object({
    eyebrow: optText(40),
    title: accentTitle(60),
    paragraphs: Paragraphs(4),
    included: z.array(shortText(60).min(1)).min(3).max(10),
    price: z
      .object({
        amount: z.number().positive().max(1_000_000),
        unit: z.enum(["lavoro", "mq", "metro", "ora"]),
        vat: z.enum(["inclusa", "esclusa"]),
        declaredOn: Day,
        validUntil: Day,
      })
      .nullable()
      .default(null),
    credentials: z.array(z.object({ name: shortText(60).min(1), detail: optText(120) })).max(4).default([]),
  }),
  faq: FaqProps.nullable().default(null),
});

export const AreasPage = z.object({
  type: z.literal("zone"),
  id: z.literal("zone"),
  ...pageBase,
  hero: PageHero,
  areas: z.object({
    eyebrow: optText(40),
    title: accentTitle(60),
    intro: optText(220),
    seat: Istat, // comune della sede: deve essere tra i towns
    towns: z
      .array(TownRef.extend({ km: z.number().int().min(0).max(300), facts: z.array(LocalFact).max(2).default([]) }))
      .min(1)
      .max(40),
  }),
  faq: FaqProps.nullable().default(null),
});

export const WorksPage = z.object({
  type: z.literal("lavori"),
  id: z.literal("lavori"),
  ...pageBase,
  hero: PageHero,
  works: z.object({ eyebrow: optText(40), title: accentTitle(60), intro: optText(220) }), // le schede derivano dalle pagine cantiere
});

export const WorkPage = z.object({
  type: z.literal("cantiere"),
  id: z.string().regex(new RegExp(`^cantiere:${SEG}$`)),
  ...pageBase,
  hero: PageHeroPhoto,
  service: ServiceId.nullable().default(null),
  town: TownRef,
  year: z.number().int().min(1950).max(2100),
  story: z.object({ eyebrow: optText(40), title: accentTitle(60), paragraphs: Paragraphs(3) }),
  photos: GallerySection.shape.props, // 3-12 foto reali con didascalia: resa dalla Gallery esistente
});

export const TownPage = z.object({
  type: z.literal("comune"),
  id: z.string().regex(/^comune:\d{6}$/),
  ...pageBase,
  hero: PageHeroPhoto,
  town: TownRef,
  km: z.number().int().min(0).max(300),
  territory: z.object({
    eyebrow: optText(40),
    title: accentTitle(60),
    paragraphs: Paragraphs(3),
    facts: z.array(LocalFact).min(3).max(6),
  }),
  services: z.array(ServiceId).max(8).default([]),
  faq: FaqProps.nullable().default(null),
});

export const PageSchema = z.discriminatedUnion("type", [ServicePage, AreasPage, WorksPage, WorkPage, TownPage]);
export type Page = z.infer<typeof PageSchema>;

// SiteConfigSchema: + `pages: z.array(PageSchema).min(1).max(20).optional()` e `.superRefine(verificaPagine)`.
// Assente = nessuna pagina (un solo modo di dirlo: niente array vuoto).
```

`verificaPagine(cfg, ctx)` (in `schema.ts`, nessun effetto se `pages` manca), ogni errore con path
`pages[i].<campo>`:

1. `id` unici e `slug` unici (così `zone` e `lavori` sono al più una).
2. Al più 8 pagine servizio.
3. `comune`: `id === "comune:" + town.istat`; almeno una pagina cantiere con lo stesso `town.istat`.
4. `cantiere.service` e `comune.services[*]` puntano a pagine servizio esistenti.
5. `servizio.card`: serve la sezione `Services`; indice < numero di card; unico tra le pagine.
6. `zone`: `seat` tra i `towns`; `towns` con ISTAT unici.
7. `price.validUntil ≥ price.declaredOn`.

`SiteConfigSchema` non è usato con `.shape`/`.extend` in nessun file del repo (verificato): passare a
`ZodEffects` non rompe nulla; `parseSiteConfig` e `SiteConfig` restano gli stessi.

Non entrano in T5a: il componente `Certifications` (schema con min 2 voci e immagini, mentre gli attestati di
T3 sono 1-8 righe di testo con pubblicabilità da verificare con legal-it, decisione 5 di T3) e gli altri 7 tipi
senza componente. Il guard di `registry.ts` resta com'è.

## 5. Collegamenti, routing e layout

### 5.1 `site-renderer/src/lib/pagine.ts` (funzioni pure, eseguibili con `node --experimental-strip-types`)

```ts
export function urlPagina(p: { slug: string }): string;                         // "/<slug>/"
export function paginaPerId(site: SiteConfig, id: string): Page | undefined;
export function briciole(site: SiteConfig, p: Page): { label: string; href: string }[]; // Home → genitore → pagina
export function breadcrumbJsonLd(b: { label: string; href: string }[], siteUrl: URL): Record<string, unknown>;
export function navConPagine(site: SiteConfig, dove: "home" | Page): LinkData[];   // = nav originale se !site.pages
export function footerConPagine(site: SiteConfig, dove: "home" | "sottopagina" | Page): PropsOf<"Footer">;
export function collegamentiHome(site: SiteConfig): { servizi: (string | null)[]; lavori: string | null } | null;
export function lavoriCollegati(site: SiteConfig, p: Page, max?: number): Extract<Page, { type: "cantiere" }>[];
export function sequenza(site: SiteConfig, p: Page): { blocco: Blocco; tono: "scuro" | "chiaro" }[];
export function prezzoVisibile(price: NonNullable<ServicePrice>, oggi: string): boolean;
export function formattaPrezzo(price: NonNullable<ServicePrice>): { valore: string; condizioni: string; nota: string };
export function verificaCollegamenti(site: SiteConfig): { errori: string[]; avvisi: string[] };
```

- `lavoriCollegati`: servizio → cantieri con `service` uguale; comune → cantieri con `town.istat` uguale; zone →
  tutti; lavori → tutti; cantiere → gli altri. Ordine: `year` decrescente, poi ordine nell'array `pages`.
- `footerConPagine(site, "sottopagina")` riproduce l'attuale `abs()` di `SubPage.astro`: stesso output senza
  pagine.
- `verificaCollegamenti` costruisce il grafo con **le stesse funzioni** usate dai componenti (nav, footer, card,
  gallery, breadcrumb, lavori collegati, link di zone/cantiere/comune) e dà **errore** per una pagina non
  raggiungibile in ≤ 2 clic dalla home o per un'ancora `/#id` senza la sezione in home (mappa tipo → id:
  `Services` `servizi`, `Gallery` `lavori`, `ProcessSteps` `processo`, `FAQ` `faq`, `ContactCTA` form
  `contatti` / canali `canali`); **avviso** per meno di 2 pagine sorgente in entrata e per `label` duplicate.
  Senza pagine restituisce liste vuote.
- `sequenza`: tabella esplicita di §3.2-§3.3, non un algoritmo generico.
- Numeri e date con `Intl` `it-IT`; «oggi» del prezzo = data della build in Europe/Rome, passata come
  parametro (il banco la fissa).

### 5.2 Route

- **`src/pages/[...percorso].astro`**: `getStaticPaths` restituisce una voce per pagina (`percorso = slug`) e,
  **solo se `site.pages` esiste**, `percorso = "404"` → `404.html` (E3). Senza pagine: zero percorsi, niente
  `404.html`. Nessuna classe nel file: delega a `src/pagine/PaginaInterna.astro` o `NonTrovata.astro`.
- Barra finale: il formato `directory` di Astro scrive `<slug>/index.html`; `Astro.url.pathname` =
  `/<slug>/` → canonical uguale all'URL di `elencoPagine` (E3). Cloudflare: `html_handling` di default
  «auto-trailing-slash» coerente; il `404.html` va servito con `not_found_handling: "404-page"` (T5c, deploy).
- Conflitti: slug riservati in Zod; Astro segnala comunque collisioni con route statiche.

### 5.3 Layout `src/pagine/PaginaInterna.astro`

`Base` (con `seoTitle`, `seoDescription`, `ogImageSrc`, `jsonLd`) → `Header` (dati `navConPagine(site, p)`,
`corrente`) → `<main>` con i blocchi di `sequenza` → `StickyCta` (props della home) → `Footer`
(`footerConPagine(site, p)`). La `SubPage` noindex delle pagine legali resta com'è (solo il footer passa da
`footerConPagine(site, "sottopagina")`).

`Base.astro` riceve tre prop opzionali: `seoTitle` (title completo, senza suffisso), `seoDescription`,
`ogImageSrc`. Assenti → calcolo di oggi, output identico. `noindex` continua a seguire `NOINDEX`.

- **Head di pagina**: title = `seo.title`, description = `seo.description`, canonical e `og:url` automatici,
  `og:image` = foto della hero se c'è, altrimenti quella della home.
- **JSON-LD**: solo `BreadcrumbList` e solo con `Astro.site` (URL assoluti; senza `SITE_URL` niente blocco, come
  il canonical). Voci `{ "@type": "ListItem", position, name: label, item: URL assoluto }`, prima voce «Home».
  Niente `Service`/`LocalBusiness` sulle pagine interne: il JSON-LD dell'attività resta solo in home (T1a).
- **404**: `pageTitle="Pagina non trovata"`, `noindex`, nessun JSON-LD; esclusa da `elencoPagine` per nome.

### 5.4 Home e sottopagine con pagine

`index.astro`: se `site.pages` esiste, `Header` riceve `nav: navConPagine(site, "home")`, `Footer` riceve
`footerConPagine(site, "home")`, `Services` riceve `collegamenti` (href per card o `null`), `Gallery` riceve
`lavori` (href o `null`). Senza pagine passa `section.props` come oggi e nessuna prop in più.

## 6. Componenti

| Componente | Stato | Contenuto |
|---|---|---|
| `src/pagine/PaginaInterna.astro` | nuovo | layout e composizione (§5.3) |
| `src/pagine/HeroPagina.astro` | nuovo | breadcrumb, H1, intro, CTA della hero home + telefono, foto con overlay o fondo scuro pieno |
| `src/pagine/Briciole.astro` | nuovo | breadcrumb visibile (chevron = `chevronDown` ruotata nello stile scoped) |
| `src/pagine/DettaglioServizio.astro` | nuovo | §3.3 |
| `src/pagine/ElencoZone.astro` | nuovo | sede, comuni per distanza, fatti, nota «Distanze in linea d'aria tra i centri geografici dei comuni», fonti uniche per URL con link `rel="noopener"` |
| `src/pagine/SchedeLavori.astro` | nuovo | indice, correlati, nella zona, altri lavori; prop `tono`; link «Tutti i lavori» se l'indice esiste e ci sono altre schede |
| `src/pagine/RaccontoCantiere.astro` | nuovo | H2 accent, paragrafi, riquadro «In breve» (servizio, comune, anno con link) |
| `src/pagine/TerritorioComune.astro` | nuovo | paragrafi, fatti con citazione, distanza dalla sede, servizi offerti |
| `src/pagine/NonTrovata.astro` | nuovo | H1 fisso, link utili, telefono e preventivo |
| `Header.astro` | modificato | solo `aria-current` sulla voce corrente (attributo, nessuna classe nuova) |
| `Services.astro` | modificato | prop `collegamenti`: titolo della card come link (`inline-flex min-h-11 items-center`, `hover:text-accent-strong hover:underline`, classi già nel CSS) |
| `Gallery.astro` | modificato | prop `lavori`: `<div class="mt-12 text-center"><a class="btn btn-secondary">Vedi tutti i lavori</a></div>` attaccato a `</ul>` (E6) |
| `FAQ`, `ProcessSteps`, `Gallery`, `ContactCTA`, `StickyCta`, `Footer` | riusati | con i dati della pagina o della home |

Id per pagina (mai duplicati): `dettaglio`, `zone`, `indice-lavori`, `lavori-collegati`, `racconto`,
`territorio`, `non-trovata` + quelli dei riusati (`faq`, `processo`, `lavori` della Gallery sul cantiere,
`contatti`). Una sola `ContactCTA` form per pagina: gli id del form (`cta-nome`…) restano unici nel documento.

Grammatica: eyebrow con lineetta sugli H2 via `SectionHeader` o stessa classe; una frase accent per titolo;
`Icon.astro` per le icone; `loading="lazy"` sotto la piega, hero `eager`; nessun motion nuovo.

## 7. Golden e anteprime

- **`blueprints/conversione-locale-v1/pages.json`**: array `pages` d'esempio di Edil Roma (il `blueprint.json`
  non cambia, regola 5 del README dei blueprint). Contenuto:
  1. `servizio:ristrutturazioni-complete` · `ristrutturazioni-complete-roma` · card 0 · foto della card · un
     cantiere collegato, senza FAQ (prova Lavori + Processo).
  2. `servizio:bagni-e-cucine` · `bagni-e-cucine-roma` · card 1 · **completo**: foto, prezzo (`validUntil`
     2099-12-31 per anteprime stabili), un'abilitazione, FAQ di 3 voci, un cantiere.
  3. `servizio:impianti-e-infissi` · `impianti-e-infissi-roma` · card 2 · **minimo**.
  4. `servizio:finiture-interni` · `finiture-interni-roma` · card 3 · minimo.
  5. `zone` · `zone-servite` · sede Roma, 12 comuni con nomi lunghi, 0-2 fatti ciascuno.
  6. `lavori` · `lavori`.
  7. `cantiere:appartamento-tivoli` · `lavori/appartamento-tivoli` · Tivoli · 2025 · 4 foto.
  8. `cantiere:bagno-frascati` · `lavori/bagno-frascati` · Frascati · 2024 · 3 foto.
  9. `comune:058104` · `zone-servite/tivoli` · 3 fatti · servizi [1].
  Foto: **solo ID Unsplash già presenti in `blueprint.json`** (verificati), con didascalie coerenti col
  soggetto reale. Codici ISTAT controllati su `site-intake/data-src/comuni.json`. Fatti: da
  `scripts/fatti-comuni.ts mostra` se il dataset di T6a esiste già, altrimenti valori verificati sulla fonte
  citata (DPR 412/1993 allegato A, Istat, Protezione Civile) al momento della scrittura.
- **Anteprime** `src/pages/anteprima/[preset]/pagine/[...pagina].astro`: legge sempre `blueprint.json` +
  `pages.json` (mai `SITE_JSON`), per ogni preset rende la **home con pagine** (`pagina` vuoto) e ogni pagina
  del golden, 404 compreso. Resta sotto `/anteprima/`, che `lib/build.ts` cancella dalla `dist` dei clienti.
  L'anteprima home senza pagine (`/anteprima/<preset>/`) e le sue baseline restano quelle di oggi.

## 8. Assembler e validatore

- `scripts/assemble-site.ts --pagine <pages.json>`: legge l'array e lo scrive in `merged.pages`, come
  `--legale` fa con `site.legal`; nessun effetto sul merge per indice, sul drop della Gallery, su
  `fixTelCtas`. Il controllo dei marcatori del golden («Edil Roma», «unsplash.com») copre anche le pagine in una
  build completa. File non array → exit 1 con messaggio. La validazione resta `parseSiteConfig` in coda.
- `scripts/validate-site.ts`: dopo `parseSiteConfig` stampa `pagine: N (servizio 4, zone 1, …)` ed esegue
  `verificaCollegamenti`: errori → exit 1; avvisi → righe «⚠» con exit 0. Senza pagine l'output è quello di oggi.
- `blueprints/README.md`: flag `--pagine` e ruolo di `pages.json`.

## 9. Compatibilità con T1a

- `elencoPagine`: pagine in forma `<slug>/index.html` (nessun errore «fuori forma»); `404.html` escluso per
  nome e comunque noindex; cartelle `anteprima*` già cancellate da `lib/build.ts`.
- `controllaPagina`: canonical = URL della sitemap (E3); BreadcrumbList senza chiavi vietate; una H1 per pagina
  (quella della hero; la home tiene la sua); title e description dalla pagina entro i limiti Zod.
- `cuociFondamenta`: il controllo «1 JSON-LD dell'attività in home» non cambia (le pagine interne non sono
  `/`). Conseguenza nota per T5c/T2a: il footer elenca le pagine servizio, quindi aggiungerne una cambia l'hash e
  il `lastmod` di tutte le pagine (è una modifica vera del contenuto).
- `DATI_STRUTTURATI_JSON` resta solo in home.

## 10. File (elenco esatto)

Modificati:

1. `site-renderer/src/lib/schema.ts`
2. `site-renderer/src/styles/global.css` (due righe `@source not`)
3. `site-renderer/src/layouts/Base.astro`
4. `site-renderer/src/layouts/SubPage.astro`
5. `site-renderer/src/pages/index.astro`
6. `site-renderer/src/sections/Header.astro`
7. `site-renderer/src/sections/Services.astro`
8. `site-renderer/src/sections/Gallery.astro`
9. `site-renderer/scripts/assemble-site.ts`
10. `site-renderer/scripts/validate-site.ts`
11. `site-renderer/scripts/check-overflow.mjs` (anche le anteprime delle pagine)
12. `site-renderer/scripts/lint-tokens.mjs` (scansione statica anche di `src/pagine`)
13. `site-renderer/tests/visual.spec.ts` (test nuovo; i due test esistenti invariati)
14. `site-renderer/tests/a11y.spec.ts` (test nuovo)
15. `site-renderer/blueprints/README.md`
16. `site-renderer/DESIGN.md` (sezione breve «Pagine interne»: scheletro, ritmo, breadcrumb, header)
17. `docs/traffico/piano-T5a.md`, `docs/traffico/README.md` (§7), `docs/handoff-fase-c.md`

Nuovi:

18. `site-renderer/src/lib/pagine.ts`
19. `site-renderer/src/pages/[...percorso].astro`
20. `site-renderer/src/pages/anteprima/[preset]/pagine/[...pagina].astro`
21. `site-renderer/src/pagine/` — `PaginaInterna.astro`, `HeroPagina.astro`, `Briciole.astro`,
    `DettaglioServizio.astro`, `ElencoZone.astro`, `SchedeLavori.astro`, `RaccontoCantiere.astro`,
    `TerritorioComune.astro`, `NonTrovata.astro`
22. `site-renderer/blueprints/conversione-locale-v1/pages.json`
23. `site-renderer/scripts/test-pagine.ts`
24. `site-renderer/tests/visual.spec.ts-snapshots/pag-*` (solo baseline nuove, scritte da Playwright)

Non toccati: `blueprint.json`, `slots.json`, `registry.ts`, le altre sezioni, `lib/build.ts`, `lib/deploy.ts`,
tutto l'editor, `docs/DEBUG.md` (nessun log nuovo), `CLAUDE.md`.

## 11. Perimetro per `.claude/scope.json` (primo atto della fase 2, a perimetro T1a-integrazione svuotato)

```json
{
  "task": "T5a: contratto multipagina e renderer (docs/traffico/piano-T5a.md)",
  "perimetro": [
    "site-renderer/src/lib/schema.ts",
    "site-renderer/src/lib/pagine.ts",
    "site-renderer/src/styles/global.css",
    "site-renderer/src/layouts/Base.astro",
    "site-renderer/src/layouts/SubPage.astro",
    "site-renderer/src/pages/index.astro",
    "site-renderer/src/pages/[...percorso].astro",
    "site-renderer/src/pages/anteprima/[preset]/pagine/**",
    "site-renderer/src/pagine/**",
    "site-renderer/src/sections/Header.astro",
    "site-renderer/src/sections/Services.astro",
    "site-renderer/src/sections/Gallery.astro",
    "site-renderer/blueprints/conversione-locale-v1/pages.json",
    "site-renderer/blueprints/README.md",
    "site-renderer/scripts/assemble-site.ts",
    "site-renderer/scripts/validate-site.ts",
    "site-renderer/scripts/test-pagine.ts",
    "site-renderer/scripts/check-overflow.mjs",
    "site-renderer/scripts/lint-tokens.mjs",
    "site-renderer/tests/visual.spec.ts",
    "site-renderer/tests/a11y.spec.ts",
    "site-renderer/DESIGN.md",
    "docs/traffico/**",
    "docs/handoff-fase-c.md"
  ]
}
```

Le baseline PNG le scrive Playwright, non Edit/Write: il controllo è procedurale (§13.3).

## 12. Milestone (ogni verifica passa prima della successiva; commit con path espliciti + push)

| M | Contenuto | Verifica |
|---|---|---|
| **M0** allestimento | `git log --oneline -5`, `git status --short`, `scope.json` libero → scritto; `BASE` = commit corrente annotato qui; build «prima» (§13.1) | `diff -r prima-A prima-B` vuoto (determinismo) |
| **M1** contratto e logica | `schema.ts`, `pagine.ts`, `pages.json`, `test-pagine.ts` (parte pura), `validate-site.ts`, `assemble-site.ts --pagine`, `blueprints/README.md` | banco verde; validatore: golden senza pagine e 3 clienti con output identico a prima, golden assemblato con `--pagine` valido e senza errori di collegamento; build «dopo» senza pagine identica (§13.1) |
| **M2** route e layout | `global.css`, `Base`, `SubPage`, `index.astro`, `Header`, `Services`, `Gallery`, `[...percorso].astro`, `PaginaInterna`, `HeroPagina`, `Briciole`, `NonTrovata`, blocchi riusati | identità §13.1; build del golden con pagine: controlli §13.2 (1-7) sulle pagine già rese; `npm run check` con il solo errore noto |
| **M3** componenti per tipo | `DettaglioServizio`, `ElencoZone`, `SchedeLavori`, `RaccontoCantiere`, `TerritorioComune`, `sequenza` completa; `lint-tokens.mjs` su `src/pagine` | identità §13.1; §13.2 completo; `gate:tokens` verde; controllo a occhio nel browser di meridian a 390 e 1280 |
| **M4** anteprime e test | route anteprime, `visual.spec.ts`, `a11y.spec.ts`, `check-overflow.mjs` | §13.3 |
| **M5** revisione design | `/impeccable critique` sulle anteprime (meridian, nova, atelier; 390 e 1280) e skill `design-critic` sugli screenshot; correzioni in un solo giro; baseline nuove rigenerate solo per il test nuovo | un secondo giro al massimo; identità §13.1 ancora vuota; suite §13.3 verde |

Fasi 3-5: Calibrazione (sotto), `DESIGN.md`, test completi, revisione del diff riga per riga, file toccati vs §10,
`scope.json` svuotato, README §7, handoff.

## 13. Test e verifica

`export PATH="$HOME/.local/bin:$PATH"`; `$T` = cartella dello scratchpad.

### 13.1 Identità senza pagine (gate di ogni milestone)

- Sorgenti: `git archive $BASE site-renderer | tar -x -C $T/prima` e, a milestone chiusa, `git archive HEAD
  site-renderer | tar -x -C $T/dopo` (niente worktree, niente stash: il working tree e le altre sessioni non si
  toccano); `node_modules` come symlink a quello del repo.
- Ingressi: `blueprint.json` e copie di `site-renderer/out/{cavaliere-build-srls,costruzioni-generali-a-l-di-la-cecilia-giovanni,mattia-saggin-costruzioni}/site.json`
  (la seconda senza Gallery, con `site.legal` solo la prima).
- Varianti per cliente: (a) `SITE_URL=https://<slug>.invalid` + `DATI_STRUTTURATI_JSON` (file di prova con
  `@id` del dominio) + `FORM_ACTION`/`UMAMI_HOST`/`UMAMI_WEBSITE_ID` fittizi; (b) `NOINDEX=1`; (c) nessuna env.
  Golden: (c) e `SITE_URL`.
- `astro build --outDir $T/{prima,dopo}/<caso>` → `rm -rf anteprima anteprima-componenti` (come `lib/build.ts`)
  → `diff -r` **vuoto** per ogni caso, nome del file CSS in `_astro/` compreso. Controllo extra: con le cartelle
  QA, differenza ammessa solo `anteprima/*/pagine/`.

### 13.2 Golden con pagine (`$T/golden-pagine.json` dall'assembler `--partial --pagine`)

Build con `SITE_URL=https://edil-roma.invalid` e `DATI_STRUTTURATI_JSON` di prova. `scripts/test-pagine.ts --dist
<dir> --dominio edil-roma.invalid` controlla:

1. file `<slug>/index.html` per le 9 pagine e `404.html` (con `noindex`, senza JSON-LD);
2. per pagina: una `<h1>`, `<title>` = `seo.title`, description = `seo.description`, canonical =
   `https://edil-roma.invalid/<slug>/`;
3. BreadcrumbList: JSON valido, `position` 1..n, ultima voce = canonical, stesse voci del breadcrumb visibile;
4. nessun `id` duplicato in nessuna pagina (home compresa);
5. ogni `href` interno risolve: `/x/` → `x/index.html`, `/#id` → id presente in `index.html`, `#id` → id nella
   pagina;
6. grafo dagli `href` reali: tutte le pagine a ≤ 2 clic da `/`; entranti per pagina stampati (≥ 2 sul golden);
   stesso risultato di `verificaCollegamenti`;
7. home con pagine: card con link alle 4 pagine servizio, bottone «Vedi tutti i lavori», nav con «Zone servite»
   e senza «Processo», footer con colonna «Servizi».

Compatibilità T1a (script nello scratchpad che importa `site-factory-editor/lib/fondamenta.ts` per path
assoluto, nessun file dell'editor toccato): `elencoPagine` → 10 pagine, `errori` vuoto; `controllaPagina` per
pagina → nessun errore né avviso; `cuociFondamenta` su una copia della `dist` con cartella cliente di prova →
`ok`, `sitemap.xml` con 10 URL, `404.html` fuori.

### 13.3 Suite del renderer

- `node --experimental-strip-types scripts/test-pagine.ts` (parte pura, senza rete): slug (formato, 4 segmenti,
  maiuscole, barra finale, riservati, duplicati), id e tipo coerenti, riferimenti mancanti, `card` fuori
  intervallo o doppia, comune senza cantiere, sede fuori elenco, prezzo scaduto/valido con «oggi» fissato,
  `formattaPrezzo` («da 8.500 €», «a mq, IVA esclusa»), `navConPagine` (senza pagine = originale; `#lavori` →
  indice; Lavori inserita se la Gallery manca; Zone inserita e Processo tolto oltre 5; ancore assolute e
  `#canali` → `#contatti` sulle interne), `footerConPagine("sottopagina")` = `abs()` di oggi, `sequenza` su tutte
  le combinazioni (mai due scure adiacenti, Contatti sempre ultima), `briciole` e `breadcrumbJsonLd`,
  `verificaCollegamenti` su golden e su un caso con pagina orfana; golden `pages.json` valido.
- `npm run build`; `npm run check` (solo l'errore noto di `registry.ts`).
- Validatore su golden, golden con pagine e 3 clienti.
- `npm run gate:tokens` (anche `src/pagine`).
- VRT: `npx playwright test --grep "@visual anteprima pagine" --update-snapshots` genera **solo** le baseline
  nuove (`pag-<pagina>-<sezione>`: sezioni nuove della home con pagine — header, servizi, lavori, footer — e le
  sezioni nuove di ogni pagina; niente full-page per contenere il peso); poi `npm run test:visual` completo
  **senza** update: tutto verde. `git status --short site-renderer/tests/visual.spec.ts-snapshots` deve mostrare
  solo `??` (nessuna baseline esistente modificata).
- `npm run test:a11y` (test nuovo su home con pagine e ogni pagina × preset × viewport).
- `npm run gate:overflow` a 390 px: anteprime di oggi + home con pagine + pagine (H1 con «RISTRUTTURAZIONI»,
  comuni lunghi).

## 14. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **HTML/CSS dei siti senza pagine cambia** (scansione Tailwind, stili seguiti dagli import, whitespace) | regole §2 provate con E1-E7; gate §13.1 a ogni milestone con il nome del CSS; revisione del diff dei 3 componenti esistenti riga per riga |
| **Utility nel markup di `src/pagine` che non esiste nel CSS** (esclusa dalla scansione: non stila) | regola §2.1; VRT e revisione visiva nei 7 preset; `lint-tokens` esteso |
| **Preset** (nova scuro, preset con `--heading-case: none`, ferro con aree invertite) | solo token e classi semantiche; `.section-dark` fa l'inversione; VRT 7 × 2, axe, overflow su tutti |
| **Id duplicati del form `ContactCTA`** | una sola form per pagina; id dei blocchi nuovi dedicati; controllo §13.2-4 e axe |
| **Ancore della home** (Gallery tolta, sezioni assenti nei clienti) | `navConPagine` riscrive `#lavori` solo se la voce c'è e inserisce Lavori se serve; `verificaCollegamenti` fallisce su `/#id` senza sezione; controllo §13.2-5; caso Costruzioni Generali (senza Gallery) nel banco |
| **View transitions**: il cross-fade coinvolge tutta la pagina, header compreso | accettato come oggi per `/privacy`; un header persistente vorrebbe `view-transition-name` nel CSS della home, che rompe l'identità: fuori T5a, eventualmente in calibrazione con decisione |
| **Peso**: pagine cantiere con 3-12 foto non responsive (JPG 350-610 KB) | hero `eager`, il resto `lazy` in cornici 4:3 (niente CLS); peso per pagina misurato in Verifica e passato a T1b (srcset e budget) |
| `404.html` servito solo se Workers lo sa | nota esplicita per T5c (`not_found_handling: "404-page"`) |
| Pagine QA nella `dist` dei clienti | anteprime solo sotto `/anteprima/` (cancellata da `lib/build.ts`); mai cartelle QA nuove |
| Contenuto sottile o doorway | minimi nel contratto (cantiere ≥ 3 foto, comune ≥ 3 fatti con URL e ≥ 1 cantiere, nessun tipo servizio × comune); similarità in T5b |
| Prezzo scaduto pubblicato | il renderer lo nasconde dopo `validUntil`; la `dist` dipende dalla data solo quando c'è un prezzo |
| Testo del golden o di `DESIGN.md` scambiato per utility | `@source not` su `pages.json`; `DESIGN.md` senza nomi di utility; gate §13.1 |
| Peso del repository per le baseline | solo sezioni nuove, niente full-page (~130 PNG); da rivedere in calibrazione |
| `.claude/scope.json` occupato da un'altra sessione | fase 2 ferma finché non è svuotato; nessuna modifica all'editor in T5a |

## 15. Dubbi che richiedono una decisione (proposta tra parentesi)

1. **Identità byte per byte vs comodità di stile**: tenere la disciplina di §2 (componenti nuovi con `@apply`
   scoped, esclusi dalla scansione) oppure accettare una volta sola un CSS diverso ma solo additivo (**tenere
   §2**: è l'unico modo di dimostrare «siti senza pagine identici»).
2. **Nome del blocco**: `pages` con chiavi inglesi e `type` italiani allineati a T4 (**sì**).
3. **Header**: niente sottomenu dei servizi, «Processo» esce dalla nav quando entra «Zone servite» (**sì**;
   rivedere in calibrazione con i clienti a 5 servizi).
4. **Prezzo e abilitazioni nella pagina servizio già in T5a** come campi opzionali, con il prezzo che scade da solo
   (**sì**; la pubblicabilità degli attestati resta subordinata alla decisione 5 di T3).
5. **`Certifications`** non si costruisce in T5a (**sì**, per i motivi di §4).
6. **Cantiere con pagina solo da 3 foto in su**: i cantieri di T3 con 1-2 foto restano senza pagina (**sì**, ricerca
   §6.2).
7. **Riuso della `ProcessSteps` della home** come chiusura delle pagine con Lavori e senza FAQ (**sì**; testo
   duplicato escluso dal gate di similarità di T5b come boilerplate).
8. **JSON-LD delle pagine interne**: solo `BreadcrumbList` (**sì**).
9. **VRT delle pagine** senza screenshot full-page (**sì**; il ritmo della pagina intera si giudica nella revisione
   design di M5).

## Calibrazione

## Verifica
