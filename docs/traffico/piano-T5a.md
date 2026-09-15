# Piano T5a — Contratto multipagina e renderer

Riallineato il 15/09 alle decisioni T3 12-14 e K1.

Brief: `docs/traffico/brief-T5a.md`. Roadmap: `docs/traffico/README.md`. Decisioni che valgono sopra questo testo:
`docs/traffico/decisioni-piani.md` («Priorità assoluta», T3 punti 12-14, K1, T5a). Stato: **piano pronto, da
sviluppare** dopo T4 e G1 (ordine in `stato-orchestrazione.md`). Nessun codice toccato in fase 1.

## 1. Contesto

Il renderer oggi costruisce una home (`index.astro`, sezioni per indice da `site.json`) e tre sottopagine
noindex (`/privacy`, `/termini`, `/grazie` via `SubPage.astro`), più le pagine QA `/anteprima/<preset>/` e
`/anteprima-componenti/<preset>/` che `lib/build.ts` cancella dalla `dist` dopo `astro build`.

T5a aggiunge al contratto un blocco **`pages`** opzionale e al renderer tre tipi di pagina indicizzabile del
servizio Sito, quelli che portano visite dall'Italia e dalle zone servite (priorità assoluta):

- **servizio**, una per macro-servizio (fattore n. 1 dell'organico locale);
- **zone**, la pagina «Zone servite», unica copertura dei comuni senza pagina propria insieme ad `areaServed`
  e all'area servita della scheda Google;
- **lavori**, l'indice delle foto reali di `lavori.json`, **senza comune né anno** (il dato non si raccoglie).

Non esistono più (T3 punto 13): pagine «cantiere» (servono comune e anno delle foto, che non si chiedono),
pagina «comune» predisposta per T6b (sospeso), prezzi e abilitazioni nel contratto, componente `Certifications`.

Nel perimetro anche tre ritocchi dell'editor in `site-factory-editor/lib/fondamenta.ts`: `areaServed` nel JSON-LD
della home dalle zone servite di T3, `testoIndicizzabile` senza header, nav e footer (decisione T5a punto 7) e gli
avvisi di T1a che non nominano scheda e campo.

Nessuna generazione: il copy arriva da T5b; l'integrazione nella build dei clienti (registro slug, `_redirects`,
`--pagine` in `lib/build.ts`, `not_found_handling` in `wrangler.jsonc`) è di T5c.

Contratti a monte (verificati sul codice il 15/09):

- **T1a** (`lib/fondamenta.ts`): `elencoPagine(dist, dominio)` prende ogni `x/index.html` non noindex fuori da
  `_astro`, `media`, `fonts` ed esclude `404.html`; `controllaPagina(html, urlAtteso)` vuole canonical =
  `https://<dominio>/<path>/`, JSON-LD senza `CHIAVI_VIETATE`, una H1, title ≤ 60 e description ≤ 160 (avvisi);
  `datiStrutturati(i: InputDatiStrutturati)` costruisce il JSON-LD della home, `scriviDatiStrutturati(dirCliente,
  site, dominio, fileComuni)` lo salva per `DATI_STRUTTURATI_JSON`.
- **T3** (`lib/zone-servite.ts`, unica porta, mai il JSON letto a mano): `leggiZoneServite(dir)` →
  `zoneUsabili(l)` (`{ ok: true; zone } | { ok: false; motivo }`) → `areeServite(zone): Area[]`,
  `etichettaArea(a: Area): string` («Cologno Monzese (MI)», «Tivoli e dintorni, 20 km», «Provincia di Roma»,
  «Lombardia», «Tutta Italia»), `comuniServiti(zone, d?): ComuneServito[]` (`codice` ISTAT 2026 a 6 cifre,
  `nome`, `sigla`, `popolazione?`, `kmDallaSede: number | null`, `aree`), ordinati dal più vicino alla sede.
  `Area` = `comune | dintorni (raggioKm) | provincia | regione | italia`; `zone.sede` può essere `null`.
- **T1b** (chiuso): ogni immagine passa da `src/components/Foto.astro` (`src`, `alt`, `class`, `loading`,
  `fetchpriority`, `sizes` da `SIZES`/`sizesGalleria` di `src/lib/media.ts`); a servizio spento rende l'`<img>` di
  sempre. Il manifest delle varianti (`scripts/media-varianti.ts`) raccoglie i `src` di `site.sections` e del brand.
- **T4**: chiavi di pagina `home`, `servizio:<slug della macro>`, `zone`; le candidate `comune:<istat>` non nascono
  più (T3 punto 13).
- **T6a** (chiuso): `frasiFatto(codice)` → `FraseFatto { chiave, testo, citazione, url }`; distanze «in linea
  d'aria tra i centri geografici dei comuni».
- **K1** (chiuso): T5a non legge chiavi e non chiama API; nessun import di `lib/secrets.ts` né di
  `lib/chiavi-traffico.ts`.
- **Ricerca** (§3.2, §4.2, §6.2, §6.3, §7): pagina per servizio con città in slug, title e H1; zone in una pagina
  sola (niente servizio × comune); link interni con anchor descrittivo; ogni pagina a ≤ 2 clic e con ≥ 2 link in
  entrata; BreadcrumbList sì, `AggregateRating` mai.

## 2. Sicurezza a servizio spento (decisione T5a punto 1)

Senza `pages` il sito non deve cambiare. Il criterio non è più il diff byte per byte: i componenti nuovi seguono le
convenzioni del renderer (token, classi semantiche, utility Tailwind come le sezioni esistenti), niente esclusioni
dalla scansione Tailwind, niente `@apply` scoped. Gate a ogni milestone (§11.1):

- **(a)** HTML identico a meno del nome hash dei file CSS/JS in `_astro/`;
- **(b)** CSS che cambia **solo per aggiunta**: ogni regola di prima (catena di at-rule + selettore + dichiarazioni)
  presente identica dopo, verificato da `scripts/test-pagine.ts --identita` con `postcss` (già installato);
- **(c)** baseline VRT esistenti identiche al pixel;
- **(d)** nessuna differenza in `robots.txt`, `_headers`, asset.

Prove di fase 1 (copia del renderer nello scratchpad, `diff -r` delle `dist`) ancora valide:

| # | Modifica | Esito | Regola |
|---|---|---|---|
| E1 | route `[...percorso].astro` con zero percorsi + componente con una utility nuova | CSS con hash nuovo, HTML diverso solo nel nome del CSS | ammesso da (a)+(b) |
| E3 | due percorsi (`servizi/bagni`, `404`) | `servizi/bagni/index.html` con canonical con barra finale; `404` produce `404.html` alla radice; home identica | usato in §5.2 |
| E4 | `Services.astro` importa (senza renderlo) un componente con `<style>` | home diversa: gli stili seguono gli import | i componenti esistenti non importano componenti nuovi |
| E5 | markup condizionale in un componente esistente, espressione su riga propria | home diversa di uno spazio | — |
| E6 | come E5, espressione attaccata al tag precedente | home identica | espressioni condizionali attaccate ai tag vicini |
| E7 | anteprime `anteprima/[preset]/pagine/[...pagina].astro` accanto a `anteprima/[preset].astro` | route coesistenti, resto identico | usato in §7 |

## 3. Studio UX (impeccable shape)

Nessun utente da intervistare: le risposte sono le decisioni, la ricerca e `DESIGN.md`/`PRODUCT.md`. Assunzioni
marcate **[A]**. Mondo visivo stabilito (lo Standard ConsulBuild): si estende, non si inventa.

### 3.1 Compito, pubblico, esito

- **Chi arriva**: il visitatore finale, quasi sempre da mobile, **direttamente sulla pagina interna** da una
  ricerca locale («rifacimento bagno brugherio», «impresa edile cologno monzese») **[A]**. Modo **Persuade**: ogni
  pagina interna è una landing a sé.
- **Deve capire in 5 secondi**: fanno questo lavoro, nella sua zona, e sono un'impresa vera. **Deve poter fare
  subito**: chiamare o chiedere il preventivo senza cambiare pagina.
- **Prova prima della promessa**: cosa comprende il lavoro, zone servite con i comuni per nome e la distanza dalla
  sede, fatti del territorio con fonte, foto reali dei lavori. Niente luoghi o date delle foto: non si conoscono.
- **Anti-obiettivi**: pagine città clonate, blog, testo gonfiato, badge inventati, prezzi, mega-menu, stili nuovi
  fuori grammatica.

### 3.2 Scheletro comune

`Header` · **Hero pagina** (scuro) · **Corpo del tipo** (chiaro, `bg-surface`) · [**FAQ** della pagina (chiaro,
`bg-bg`)] · **Contatti con form** (scuro, la `ContactCTA` form della home) · `StickyCta` · `Footer`.

Il ritmo è garantito dalla composizione fissa: mai due sezioni scure adiacenti. Contatti scuro seguito dal Footer
`section-dark--deep` è lo stesso passo di tono di Hero → TrustBar in home. Nessun blocco «Lavori» dentro le pagine
servizio e zone: le foto di `lavori.json` non hanno servizio né luogo, metterle sotto un servizio o una zona
suggerirebbe un legame che non esiste. Per questo la `ProcessSteps` come chiusura (decisione T5a punto 5) non ha
più il caso che la attivava e non si riusa.

Strutture valutate per la pagina servizio: (a) landing lunga con processo, banner e form, scartata per densità e
testo duplicato; (b) form fisso in colonna laterale da desktop, scartata perché rompe il ritmo scuro/chiaro;
(c) risposta breve + form in hero, scartata: promessa prima della prova. Scelta: lo scheletro sopra.

### 3.3 Per tipo di pagina

| Tipo | Sezioni in ordine | H1 (esempio) | CTA | Prove reali | 390 px |
|---|---|---|---|---|---|
| **servizio** | Hero (foto se c'è) · Dettaglio · FAQ del servizio (se c'è) · Contatti | «Bagni e cucine a **Roma**» | hero: CTA 1 della hero home (→ `#contatti`) + telefono; nel riquadro «Cosa comprende»: CTA preventivo | lista «Cosa comprende» (3-10 voci), paragrafi dal contesto | testo poi riquadro; CTA impilate a tutta larghezza |
| **zone** | Hero (senza foto) · Elenco zone · FAQ (se c'è) · Contatti | «Zone servite: **Roma** e provincia» | come sopra | aree servite con le etichette del form lead, sede in testa, comuni ordinati per distanza (km interi, «in linea d'aria»), ≤ 2 fatti T6a per comune con fonti in nota | aree come elenco di etichette; un comune per riga con divisori, km allineati a destra, fatti sotto il nome |
| **lavori** | Hero (senza foto) · Foto dei lavori · Contatti | «I nostri **lavori**» | come sopra | le 4-12 foto reali della Gallery della home con didascalia | una foto per riga, 4:3; due da 640 px, tre da 1024 px |
| **404** | Header · Non trovata · Footer | «Pagina **non trovata**» (fisso) | telefono + preventivo (`/#contatti`) | link: home, servizi, zone, lavori | lista a tutta larghezza |

Hero pagina: breadcrumb in alto (didascalia, chevron, testo chiaro sull'overlay), H1 `.t-h1` maiuscolo con **una**
frase accent, intro `.t-lead` ≤ 220 caratteri answer-first (cosa, dove, per chi), CTA + telefono. **Niente
eyebrow nella hero**: il breadcrumb occupa quel posto **[A]**. Con foto: overlay `.hero-overlay` come la hero A,
altezza guidata dal contenuto; `Foto.astro` con `sizes={SIZES.hero}`, `loading="eager"`, `fetchpriority="high"`.
A 390 px hero, H1 su 3 righe, intro su 4 e due CTA stanno sopra la piega (~530 px sotto un header di 64).

Dettaglio servizio: due colonne da `lg` (testo 7/12, riquadro 5/12). Sinistra: eyebrow, H2 accent, 1-4 paragrafi a
misura di prosa. Destra: `surface-card` «Cosa comprende» con spunte accent e in fondo la CTA.

Elenco zone: prima le aree servite (etichette di `etichettaArea`, così «Provincia di Roma» dice l'intera provincia
anche se i comuni elencati sono solo i più vicini), poi la sede e i comuni con distanza e fatti; nota «Distanze in
linea d'aria tra i centri geografici dei comuni» solo se c'è almeno una distanza; fonti uniche per URL con link
`rel="noopener"`.

Foto dei lavori: griglia della card dei servizi (una colonna, due da 640 px, tre da 1024 px) con
`Foto.astro` e `sizes={SIZES.card}`, `loading="lazy"`, didascalia `.media-caption`. Nessuna modifica a
`Gallery.astro` né a `lib/media.ts`.

### 3.4 Header, menu mobile, breadcrumb, link dalla home

- **Header**: la nav resta ≤ 5 voci. Con la pagina Zone si aggiunge «Zone servite» prima di «Contatti» e, oltre 5
  voci, esce «Processo» (decisione T5a punto 2). Con la pagina Lavori la voce `#lavori` diventa `/<slug lavori>/`.
  **Niente sottomenu dei servizi**: «Servizi» porta a `/#servizi`, dove ogni card linka la sua pagina; il footer
  elenca tutti i servizi su ogni pagina. Sulle pagine interne `#x` diventa `/#x`, tranne `#canali` → `#contatti`
  (il form della pagina stessa). `aria-current="page"` sulla voce della pagina corrente. Menu mobile: stesso
  `details/summary`, stesse voci.
- **Breadcrumb**: `<nav aria-label="Percorso"><ol>` Home › pagina (corrente con `aria-current`, non link); ultima
  voce troncata su una riga a 390 px (l'H1 sotto la ripete per intero).
- **Home con pagine**: titolo della card servizio come link alla sua pagina (anchor = titolo, freccia
  `aria-hidden`, area di tocco ≥ 44 px); footer con colonna «Servizi» (anchor = `label` della pagina) e «Zone
  servite»/«Lavori» in «Link utili». Nessun bottone «Vedi tutti i lavori» sotto la Gallery: la pagina mostra le
  stesse foto (vedi §13, dubbio 1). Anche le sottopagine legali usano lo stesso footer.

### 3.5 Stati e intervalli realistici

Servizi 1-8 (tipicamente 3-5, uno per card); aree servite 1-60 etichette (tipicamente 1-4); comuni elencati 0-40
(tipicamente 8-15; con aree larghe i 40 più vicini); foto 4-12; totale ≤ 10 pagine. Stati da coprire nelle
anteprime: servizio **completo** (foto, FAQ) e **minimo** (senza foto né FAQ); zone con nomi lunghi («Guidonia
Montecelio», «Sant'Angelo Romano»), con area larga («Provincia di Roma») e senza sede; lavori con 4 e 12 foto; 404.

## 4. Contratto Zod (`site-renderer/src/lib/schema.ts`)

Chiavi in inglese come il resto dello schema; valori di `type` = prefissi delle chiavi di T4.

```ts
/* ------------------------------------------------------------------ */
/* Pagine interne (servizio Traffico «Sito», docs/traffico/piano-T5a.md) */
/* ------------------------------------------------------------------ */

const SEG = "[a-z0-9]+(?:-[a-z0-9]+)*";
/** Slug vietati: pagine esistenti, cartelle QA e asset della dist. */
export const SLUG_RISERVATI = ["privacy", "termini", "grazie", "anteprima", "anteprima-componenti", "media", "fonts", "404", "index", "_astro"];
const PageSlug = z
  .string()
  .max(80)
  .regex(new RegExp(`^${SEG}$`), "slug: minuscole, cifre e trattini, un solo segmento, senza barre")
  .refine((s) => !SLUG_RISERVATI.includes(s), "slug in conflitto con una pagina o una cartella del sito");

const Istat = z.string().regex(/^\d{6}$/, "codice ISTAT a 6 cifre");
/** Un comune di comuniServiti (T3): codice 2026, nome, sigla. */
const TownRef = z.object({ istat: Istat, name: shortText(60).min(1), province: z.string().regex(/^[A-Z]{2}$/) });
/** Un fatto di T6a già scritto (FraseFatto): testo, citazione e URL della fonte. */
const LocalFact = z.object({ text: shortText(90).min(1), citation: shortText(160).min(1), url: z.string().url() });

const PageSeo = z.object({ title: shortText(60).min(1), description: shortText(160).min(1) });
const PageHero = z.object({
  title: accentTitle(60),                 // l'unica H1 della pagina
  intro: shortText(220).min(1),           // answer-first: cosa, dove, per chi
  image: ImageSchema.nullable().default(null),
});
/** label = anchor descrittivo in footer, card, breadcrumb e nav. */
const pageBase = { slug: PageSlug, seo: PageSeo, label: shortText(40).min(1) };
const FaqProps = FaqSection.shape.props;

export const ServicePage = z.object({
  type: z.literal("servizio"),
  id: z.string().regex(new RegExp(`^servizio:${SEG}$`)),
  ...pageBase,
  hero: PageHero,
  card: z.number().int().min(0).nullable().default(null), // indice della card Services in home che approfondisce
  detail: z.object({
    eyebrow: optText(40),
    title: accentTitle(60),
    paragraphs: z.array(shortText(600).min(1)).min(1).max(4),
    included: z.array(shortText(60).min(1)).min(3).max(10),
  }),
  faq: FaqProps.nullable().default(null),
});

export const AreasPage = z.object({
  type: z.literal("zone"),
  id: z.literal("zone"),
  ...pageBase,
  hero: PageHero.extend({ image: z.null().default(null) }),
  areas: z.object({
    eyebrow: optText(40),
    title: accentTitle(60),
    intro: optText(220),
    served: z.array(shortText(80).min(1)).min(1).max(60),       // etichettaArea(a) per areeServite(zone), in ordine
    seat: TownRef.nullable().default(null),                       // zone.sede
    towns: z
      .array(TownRef.extend({
        km: z.number().int().min(0).max(1500).nullable(),        // kmDallaSede
        facts: z.array(LocalFact).max(2).default([]),
      }))
      .max(40)
      .default([]),
  }),
  faq: FaqProps.nullable().default(null),
});

export const WorksPage = z.object({
  type: z.literal("lavori"),
  id: z.literal("lavori"),
  ...pageBase,
  hero: PageHero.extend({ image: z.null().default(null) }),
  works: z.object({ eyebrow: optText(40), title: accentTitle(60), intro: optText(220) }), // le foto sono quelle della Gallery in home
});

export const PageSchema = z.discriminatedUnion("type", [ServicePage, AreasPage, WorksPage]);
export type Page = z.infer<typeof PageSchema>;

// SiteConfigSchema: + `pages: z.array(PageSchema).min(1).max(10).optional()` e `.superRefine(verificaPagine)`.
// Assente = nessuna pagina (un solo modo di dirlo: niente array vuoto).
```

`verificaPagine(cfg, ctx)` (in `schema.ts`, nessun effetto se `pages` manca), ogni errore con path
`pages[i].<campo>`:

1. `id` unici e `slug` unici (così `zone` e `lavori` sono al più una).
2. Al più 8 pagine servizio.
3. `servizio.card`: serve la sezione `Services`; indice < numero di card; unico tra le pagine.
4. `zone`: `towns` con ISTAT unici.
5. `lavori`: serve la sezione `Gallery` in home (le foto reali sono le sue; l'assembler la toglie sotto 4 foto).

`SiteConfigSchema` non è usato con `.shape`/`.extend` in nessun file del repo (verificato): passare a
`ZodEffects` non rompe nulla; `parseSiteConfig` e `SiteConfig` restano gli stessi. Il guard di `registry.ts` resta
com'è: nessuno degli 8 tipi senza componente entra in T5a.

## 5. Collegamenti, routing e layout

### 5.1 `site-renderer/src/lib/pagine.ts` (funzioni pure, eseguibili con `node --experimental-strip-types`)

```ts
export function urlPagina(p: { slug: string }): string;                         // "/<slug>/"
export function briciole(p: Page): { label: string; href: string }[];           // Home → pagina
export function breadcrumbJsonLd(b: { label: string; href: string }[], siteUrl: URL): Record<string, unknown>;
export function navConPagine(site: SiteConfig, dove: "home" | Page): LinkData[];   // = nav originale se !site.pages
export function footerConPagine(site: SiteConfig, dove: "home" | "sottopagina" | Page): PropsOf<"Footer">;
export function collegamentiHome(site: SiteConfig): (string | null)[] | null;    // href per card Services
export function verificaCollegamenti(site: SiteConfig): { errori: string[]; avvisi: string[] };
```

- `footerConPagine(site, "sottopagina")` riproduce l'attuale `abs()` di `SubPage.astro`: stesso output senza pagine.
- `verificaCollegamenti` costruisce il grafo con **le stesse funzioni** usate dai componenti (nav, footer, card,
  breadcrumb) e dà **errore** per una pagina non raggiungibile in ≤ 2 clic dalla home o per un'ancora `/#id` senza
  la sezione in home (mappa tipo → id: `Services` `servizi`, `Gallery` `lavori`, `ProcessSteps` `processo`, `FAQ`
  `faq`, `ContactCTA` form `contatti` / canali `canali`); **avviso** per meno di 2 pagine sorgente in entrata, per
  `label` duplicate e per una `hero.image` il cui `src` non compare nelle sezioni della home (il manifest di T1b
  non avrebbe varianti leggere: `Foto.astro` rende l'`<img>` pieno). Senza pagine restituisce liste vuote.

### 5.2 Route

- **`src/pages/[...percorso].astro`**: `getStaticPaths` restituisce una voce per pagina (`percorso = slug`) e,
  **solo se `site.pages` esiste**, `percorso = "404"` → `404.html` (E3). Senza pagine: zero percorsi, niente
  `404.html`. Delega a `src/pagine/PaginaInterna.astro` o `NonTrovata.astro`.
- Barra finale: il formato `directory` di Astro scrive `<slug>/index.html`; `Astro.url.pathname` = `/<slug>/` →
  canonical uguale all'URL di `elencoPagine` (E3). Il `404.html` va servito con `not_found_handling: "404-page"`
  (T5c, deploy).
- Conflitti: slug riservati in Zod; Astro segnala comunque collisioni con route statiche.

### 5.3 Layout `src/pagine/PaginaInterna.astro`

`Base` (con `seoTitle`, `seoDescription`, `ogImageSrc`, `jsonLd`) → `Header` (dati `navConPagine(site, p)`,
`corrente`) → `<main>` con Hero, corpo del tipo, FAQ, `ContactCTA` form → `StickyCta` (props della home) → `Footer`
(`footerConPagine(site, p)`). La `SubPage` noindex delle pagine legali resta com'è (solo il footer passa da
`footerConPagine(site, "sottopagina")`).

`Base.astro` riceve tre prop opzionali: `seoTitle` (title completo, senza suffisso), `seoDescription`,
`ogImageSrc`. Assenti → calcolo di oggi, output identico. `noindex` continua a seguire `NOINDEX`.

- **Head di pagina**: title = `seo.title`, description = `seo.description`, canonical e `og:url` automatici,
  `og:image` = foto della hero se c'è, altrimenti quella della home.
- **JSON-LD**: solo `BreadcrumbList` e solo con `Astro.site` (URL assoluti; senza `SITE_URL` niente blocco, come il
  canonical). Voci `{ "@type": "ListItem", position, name: label, item: URL assoluto }`, prima voce «Home». Niente
  `Service`/`LocalBusiness` sulle pagine interne: il JSON-LD dell'attività, con `areaServed` (§6), resta solo in home.
- **404**: `pageTitle="Pagina non trovata"`, `noindex`, nessun JSON-LD; esclusa da `elencoPagine` per nome.

### 5.4 Home e sottopagine con pagine

`index.astro`: se `site.pages` esiste, `Header` riceve `nav: navConPagine(site, "home")`, `Footer` riceve
`footerConPagine(site, "home")`, `Services` riceve `collegamenti`. Senza pagine passa `section.props` come oggi e
nessuna prop in più.

### 5.5 Componenti

| Componente | Stato | Contenuto |
|---|---|---|
| `src/pagine/PaginaInterna.astro` | nuovo | layout e composizione (§5.3) |
| `src/pagine/HeroPagina.astro` | nuovo | breadcrumb, H1, intro, CTA della hero home + telefono, `Foto.astro` con overlay o fondo scuro pieno |
| `src/pagine/Briciole.astro` | nuovo | breadcrumb visibile (chevron = `Icon` ruotata) |
| `src/pagine/DettaglioServizio.astro` | nuovo | §3.3 |
| `src/pagine/ElencoZone.astro` | nuovo | aree servite, sede, comuni per distanza, fatti con fonti, nota sulla linea d'aria |
| `src/pagine/FotoLavori.astro` | nuovo | griglia chiara delle foto della Gallery con `Foto.astro` e didascalie |
| `src/pagine/NonTrovata.astro` | nuovo | H1 fisso, link utili, telefono e preventivo |
| `Header.astro` | modificato | prop `corrente` → `aria-current` sulla voce (attributo, nessuna classe nuova) |
| `Services.astro` | modificato | prop `collegamenti`: titolo della card come link (`inline-flex min-h-11 items-center`, `hover:text-accent-strong hover:underline`) |
| `FAQ`, `ContactCTA`, `StickyCta`, `Footer` | riusati | con i dati della pagina o della home |

Nei componenti esistenti: nessun import nuovo (E4), espressioni condizionali attaccate ai tag vicini (E6).

Id per pagina (mai duplicati): `dettaglio`, `zone`, `foto-lavori`, `non-trovata` + quelli dei riusati (`faq`,
`contatti`). Una sola `ContactCTA` form per pagina: gli id del form (`cta-nome`…) restano unici nel documento.

Grammatica: eyebrow con lineetta sugli H2 via `SectionHeader`; una frase accent per titolo; `Icon.astro` per le
icone; immagini solo via `Foto.astro`; `loading="lazy"` sotto la piega, hero `eager`; nessun motion nuovo.

## 6. Editor: `site-factory-editor/lib/fondamenta.ts`

1. **`areaServed` nel JSON-LD della home** (priorità assoluta punto 2; T3 punto 12 lo assegna a T5a). Il divieto di
   T1a nasceva dalla mancanza di una fonte, che ora esiste:
   - `CHIAVI_VIETATE` perde `areaServed`;
   - `InputDatiStrutturati` riceve `zone: { ok: true; zone: Zone } | { ok: false; motivo: string }`;
     `scriviDatiStrutturati` la calcola con `zoneUsabili(leggiZoneServite(dirCliente))` (import con estensione da
     `./zone-servite.ts`, sola lettura);
   - con zone usabili: `areaServed` = una voce per `areeServite(zone)`, senza duplicati: `comune` e `dintorni` →
     `{ "@type": "City", name: <nome del comune> }`; `provincia` e `regione` → `{ "@type": "AdministrativeArea",
     name: etichettaArea(a) }`; `italia` → `{ "@type": "Country", name: "Italia" }`; il riepilogo dice il numero di
     aree;
   - senza: nessuna chiave e avviso `areaServed omesso: <motivo>` (il motivo di T3 nomina già il dettaglio Traffico).
2. **`testoIndicizzabile` conta il contenuto principale** (decisione T5a punto 7): il body perde `<header>…</header>`,
   `<nav>…</nav>` e `<footer>…</footer>` prima dell'estrazione del testo. Così aggiungere una pagina servizio (che
   entra nel footer e nella nav di tutte) non sposta il `lastmod` delle altre. Oggi nessun cliente ha un registro
   `lastmod` (`out/*/traffico/` assente, verificato il 15/09): il cambio di hash non produce aggiornamenti falsi.
3. **Avvisi con scheda e campo** (punto aperto T1a in `stato-orchestrazione.md`): gli avvisi di nome dell'attività,
   telefono, email, P.IVA, `sameAs`, `makesOffer` e H1 finiscono con «— correggi «<campo>» nella scheda <scheda>»
   come già fa l'indirizzo. Mappa di partenza, da confermare in fase 2 seguendo da dove nasce il valore di
   `site.json`: P.IVA, Telefono, Email, Social → scheda Intake; `meta.businessName` → «Ragione sociale» della scheda
   Intake; card dei servizi e H1 della home → scheda Copy. Se un valore nasce altrove si nomina quella scheda.

Nessun'altra modifica all'editor: nessuna UI, nessuna route, `lib/build.ts` invariato.

## 7. Golden e anteprime

- **`blueprints/conversione-locale-v1/pages.json`**: array `pages` d'esempio di Edil Roma (il `blueprint.json` non
  cambia, regola 5 del README dei blueprint):
  1. `servizio:ristrutturazioni-complete` · `ristrutturazioni-complete-roma` · card 0 · foto della card · senza FAQ.
  2. `servizio:bagni-e-cucine` · `bagni-e-cucine-roma` · card 1 · **completo**: foto della card, FAQ di 3 voci.
  3. `servizio:impianti-e-infissi` · `impianti-e-infissi-roma` · card 2 · **minimo**.
  4. `servizio:finiture-interni` · `finiture-interni-roma` · card 3 · minimo.
  5. `zone` · `zone-servite` · aree «Roma (RM)», «Tivoli e dintorni, 20 km», «Provincia di Roma»; sede Roma; 12
     comuni con nomi lunghi, 0-2 fatti ciascuno.
  6. `lavori` · `lavori`.
  Foto: **solo `src` già presenti in `blueprint.json`** (card e Gallery, ID Unsplash verificati). Comuni, sigle e
  distanze: calcolati con `comuniServiti` e `etichettaArea` di `lib/zone-servite.ts` su zone di prova, da uno script
  nello scratchpad (nessun file dell'editor toccato); codici ISTAT 2026 dal dataset T6a. Fatti: da
  `scripts/fatti-comuni.ts mostra <codice> --json`.
- **Anteprime** `src/pages/anteprima/[preset]/pagine/[...pagina].astro`: legge sempre `blueprint.json` +
  `pages.json` (mai `SITE_JSON`), per ogni preset rende la **home con pagine** (`pagina` vuoto) e ogni pagina del
  golden, 404 compreso. Resta sotto `/anteprima/`, che `lib/build.ts` cancella dalla `dist` dei clienti.
  L'anteprima home senza pagine (`/anteprima/<preset>/`) e le sue baseline restano quelle di oggi.

## 8. Assembler e validatore

- `scripts/assemble-site.ts --pagine <pages.json>`: legge l'array e lo scrive in `merged.pages`, come `--legale`
  fa con `site.legal`; nessun effetto sul merge per indice, sul drop della Gallery, su `fixTelCtas`. Se il drop
  della Gallery toglie la sezione, la pagina `lavori` esce dall'array con una riga su stderr (niente pagina senza
  foto). Il controllo dei marcatori del golden («Edil Roma», «unsplash.com») copre anche le pagine in una build
  completa. File non array → exit 1 con messaggio. La validazione resta `parseSiteConfig` in coda.
- `scripts/validate-site.ts`: dopo `parseSiteConfig` stampa `pagine: N (servizio 4, zone 1, lavori 1)` ed esegue
  `verificaCollegamenti`: errori → exit 1; avvisi → righe «⚠» con exit 0. Senza pagine l'output è quello di oggi.
- `blueprints/README.md`: flag `--pagine` e ruolo di `pages.json`.

## 9. File (elenco esatto)

Modificati:

1. `site-renderer/src/lib/schema.ts`
2. `site-renderer/src/layouts/Base.astro`
3. `site-renderer/src/layouts/SubPage.astro`
4. `site-renderer/src/pages/index.astro`
5. `site-renderer/src/sections/Header.astro`
6. `site-renderer/src/sections/Services.astro`
7. `site-renderer/scripts/assemble-site.ts`
8. `site-renderer/scripts/validate-site.ts`
9. `site-renderer/scripts/check-overflow.mjs` (anche le anteprime delle pagine)
10. `site-renderer/scripts/lint-tokens.mjs` (scansione statica anche di `src/pagine`)
11. `site-renderer/tests/visual.spec.ts` (test nuovo; i test esistenti invariati)
12. `site-renderer/tests/a11y.spec.ts` (test nuovo)
13. `site-renderer/blueprints/README.md`
14. `site-renderer/DESIGN.md` (sezione breve «Pagine interne»: scheletro, header, breadcrumb)
15. `site-factory-editor/lib/fondamenta.ts` (§6)
16. `site-factory-editor/scripts/test-fondamenta.ts`
17. `docs/traffico/piano-T5a.md`, `docs/traffico/README.md` (§7), `docs/handoff-fase-c.md`

Nuovi:

18. `site-renderer/src/lib/pagine.ts`
19. `site-renderer/src/pages/[...percorso].astro`
20. `site-renderer/src/pages/anteprima/[preset]/pagine/[...pagina].astro`
21. `site-renderer/src/pagine/` — `PaginaInterna.astro`, `HeroPagina.astro`, `Briciole.astro`,
    `DettaglioServizio.astro`, `ElencoZone.astro`, `FotoLavori.astro`, `NonTrovata.astro`
22. `site-renderer/blueprints/conversione-locale-v1/pages.json`
23. `site-renderer/scripts/test-pagine.ts`
24. `site-renderer/tests/visual.spec.ts-snapshots/pag-*` (solo baseline nuove, scritte da Playwright)

Non toccati: `blueprint.json`, `slots.json`, `registry.ts`, `global.css`, `Gallery.astro`, `Foto.astro`,
`lib/media.ts`, `media-varianti.ts`, le altre sezioni, `lib/zone-servite.ts`, `lib/secrets.ts`,
`lib/chiavi-traffico.ts`, `lib/build.ts`, `lib/deploy.ts`, la UI dell'editor, `docs/DEBUG.md`, `CLAUDE.md`.

## 10. Perimetro per `.claude/scope.json` (primo atto della fase 2)

```json
{
  "task": "T5a: contratto multipagina e renderer (docs/traffico/piano-T5a.md)",
  "perimetro": [
    "site-renderer/src/lib/schema.ts",
    "site-renderer/src/lib/pagine.ts",
    "site-renderer/src/layouts/Base.astro",
    "site-renderer/src/layouts/SubPage.astro",
    "site-renderer/src/pages/index.astro",
    "site-renderer/src/pages/[...percorso].astro",
    "site-renderer/src/pages/anteprima/[preset]/pagine/**",
    "site-renderer/src/pagine/**",
    "site-renderer/src/sections/Header.astro",
    "site-renderer/src/sections/Services.astro",
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
    "site-factory-editor/lib/fondamenta.ts",
    "site-factory-editor/scripts/test-fondamenta.ts",
    "docs/traffico/**",
    "docs/handoff-fase-c.md"
  ]
}
```

Le baseline PNG le scrive Playwright, non Edit/Write: il controllo è procedurale (§11.3).

## 11. Milestone e test

`export PATH="$HOME/.local/bin:$PATH"`; `$T` = cartella dello scratchpad. Ogni verifica passa prima della
milestone successiva; commit con path espliciti + push.

| M | Contenuto | Verifica |
|---|---|---|
| **M0** allestimento | `git log --oneline -5`, `git status --short`, `scope.json` scritto; `BASE` = commit corrente annotato qui; build «prima» (§11.1) | due build «prima» identiche (determinismo) |
| **M1** contratto e logica | `schema.ts`, `pagine.ts`, `pages.json`, `test-pagine.ts` (parte pura e `--identita`), `validate-site.ts`, `assemble-site.ts --pagine`, `blueprints/README.md` | banco verde; validatore: golden senza pagine e 3 clienti con output identico a prima, golden assemblato con `--pagine` valido e senza errori di collegamento; §11.1 |
| **M2** route, layout e componenti | `Base`, `SubPage`, `index.astro`, `Header`, `Services`, `[...percorso].astro`, tutti i componenti di `src/pagine/`; `lint-tokens.mjs` su `src/pagine` | §11.1; §11.2; `npm run check` con il solo errore noto; `gate:tokens` verde; controllo a occhio di meridian a 390 e 1280 |
| **M3** fondamenta dell'editor | §6 in `fondamenta.ts` e casi in `test-fondamenta.ts` | §11.4 |
| **M4** anteprime e test | route anteprime, `visual.spec.ts`, `a11y.spec.ts`, `check-overflow.mjs` | §11.3 |
| **M5** revisione design | `/impeccable critique` sulle anteprime (meridian, nova, atelier; 390 e 1280) e skill `design-critic` sugli screenshot, entrambi i temi dove esistono; correzioni in un solo giro | un secondo giro al massimo; §11.1 ancora verde; §11.3 verde |

Fasi 3-5: Calibrazione (sotto), `DESIGN.md`, test completi, revisione del diff riga per riga, file toccati vs §9,
`scope.json` svuotato, README §7, handoff.

### 11.1 Sicurezza a servizio spento (gate di ogni milestone)

- Sorgenti: `git archive $BASE site-renderer | tar -x -C $T/prima` e, a milestone chiusa, `git archive HEAD
  site-renderer | tar -x -C $T/dopo` (niente worktree, niente stash); `node_modules` come symlink a quello del repo.
- Ingressi: `blueprint.json` e copie di `site-renderer/out/{cavaliere-build-srls,costruzioni-generali-a-l-di-la-cecilia-giovanni,mattia-saggin-costruzioni}/site.json`
  (la seconda senza Gallery, con `site.legal` solo la prima).
- Varianti per cliente: (a) `SITE_URL=https://<slug>.invalid` + `DATI_STRUTTURATI_JSON` (file di prova) +
  `FORM_ACTION`/`UMAMI_HOST`/`UMAMI_WEBSITE_ID` fittizi; (b) `NOINDEX=1`; (c) nessuna env. Golden: (c) e `SITE_URL`.
- `astro build --outDir $T/{prima,dopo}/<caso>` → `rm -rf anteprima anteprima-componenti` (come `lib/build.ts`) →
  `node --experimental-strip-types scripts/test-pagine.ts --identita $T/prima/<caso> $T/dopo/<caso>`: HTML uguale
  con i nomi dei file di `_astro/` sostituiti da un segnaposto; CSS di prima contenuto regola per regola in quello
  di dopo; ogni altro file identico. Più `npm run test:visual` senza update (baseline esistenti identiche).

### 11.2 Golden con pagine (`$T/golden-pagine.json` dall'assembler `--partial --pagine`)

Build con `SITE_URL=https://edil-roma.invalid` e `DATI_STRUTTURATI_JSON` di prova. `scripts/test-pagine.ts --dist
<dir> --dominio edil-roma.invalid` controlla:

1. file `<slug>/index.html` per le 6 pagine e `404.html` (con `noindex`, senza JSON-LD);
2. per pagina: una `<h1>`, `<title>` = `seo.title`, description = `seo.description`, canonical =
   `https://edil-roma.invalid/<slug>/`;
3. BreadcrumbList: JSON valido, `position` 1..n, ultima voce = canonical, stesse voci del breadcrumb visibile;
4. nessun `id` duplicato in nessuna pagina (home compresa);
5. ogni `href` interno risolve: `/x/` → `x/index.html`, `/#id` → id presente in `index.html`, `#id` → id nella pagina;
6. grafo dagli `href` reali: tutte le pagine a ≤ 2 clic da `/`; entranti per pagina stampati (≥ 2 sul golden);
   stesso risultato di `verificaCollegamenti`;
7. home con pagine: card con link alle 4 pagine servizio, nav con «Zone servite» e senza «Processo», voce Lavori
   verso `/lavori/`, footer con colonna «Servizi»;
8. pagina zone: tutte le etichette `served`, i 12 comuni in ordine di distanza, nota della linea d'aria; pagina
   lavori: le stesse foto (`src` e `alt`) della Gallery della home, ciascuna via `Foto.astro`.

Compatibilità T1a (script nello scratchpad che importa `site-factory-editor/lib/fondamenta.ts` per path assoluto):
`elencoPagine` → 7 pagine, `errori` vuoto; `controllaPagina` per pagina → nessun errore né avviso;
`cuociFondamenta` su una copia della `dist` con cartella cliente di prova → `ok`, `sitemap.xml` con 7 URL,
`404.html` fuori.

### 11.3 Suite del renderer

- `node --experimental-strip-types scripts/test-pagine.ts` (parte pura, senza rete): slug (formato, due segmenti,
  maiuscole, barre, riservati, duplicati), id e tipo coerenti, `card` fuori intervallo o doppia, `lavori` senza
  Gallery, `towns` con ISTAT doppi, `navConPagine` (senza pagine = originale; `#lavori` → pagina; Zone inserita e
  Processo tolto oltre 5; ancore assolute e `#canali` → `#contatti` sulle interne), `footerConPagine("sottopagina")`
  = `abs()` di oggi, `briciole` e `breadcrumbJsonLd`, `verificaCollegamenti` su golden, su un caso con pagina
  orfana e su una `hero.image` fuori dalle sezioni (avviso); golden `pages.json` valido; `--identita` su due
  cartelle di prova (una regola CSS tolta → fallisce, una aggiunta → passa).
- `npm run build`; `npm run check` (solo l'errore noto di `registry.ts`).
- Validatore su golden, golden con pagine e 3 clienti.
- `npm run gate:tokens` (anche `src/pagine`).
- VRT: `npx playwright test --grep "@visual anteprima pagine" --update-snapshots` genera **solo** le baseline nuove
  (`pag-<pagina>-<sezione>`: header, servizi e footer della home con pagine e le sezioni di ogni pagina; niente
  full-page, decisione T5a punto 6); poi `npm run test:visual` completo **senza** update: tutto verde. `git status
  --short site-renderer/tests/visual.spec.ts-snapshots` deve mostrare solo `??`.
- `npm run test:a11y` (test nuovo su home con pagine e ogni pagina × preset × viewport).
- `npm run gate:overflow` a 390 px: anteprime di oggi + home con pagine + pagine (H1 con «RISTRUTTURAZIONI», comuni
  lunghi, etichette «Provincia di Barletta-Andria-Trani»).

### 11.4 Editor

- `cd site-factory-editor && node --experimental-strip-types scripts/test-fondamenta.ts`, casi nuovi:
  `testoIndicizzabile` con header, nav o footer diversi → stesso hash; testo diverso in una sezione del contenuto →
  hash diverso; `datiStrutturati` con zone di 5 aree (una per tipo, una doppia) → `areaServed` atteso senza
  duplicati; con `{ ok: false, motivo }` → nessuna chiave e avviso col motivo; `chiaviVietate` non segnala più
  `areaServed` e segnala ancora le altre; ogni avviso del §6.3 contiene «nella scheda». Casi esistenti che citano
  il testo esatto degli avvisi aggiornati allo stesso commit.
- `npx tsc --noEmit` e `npm run build` dell'editor.
- Sola lettura sui 3 clienti reali (script nello scratchpad, nessuna scrittura in `out/`): `datiStrutturati` con
  `zoneUsabili(leggiZoneServite(dir))` → `areaServed` dove le zone sono usabili, avviso col motivo altrimenti (i
  brief Tally danno `da_impostare`); risultato annotato in Verifica.

## 12. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **HTML o CSS dei siti senza pagine cambia** oltre gli hash (import, whitespace, regole Tailwind riordinate) | regole E4/E6 sui componenti esistenti; gate §11.1 a ogni milestone; revisione riga per riga del diff di `Header`, `Services`, `Base`, `SubPage`, `index.astro` |
| **Confronto CSS «solo aggiunte» ingannevole** (Tailwind riordina o fonde regole) | confronto sulla struttura (at-rule + selettore + dichiarazioni) con `postcss`, non sul testo; caso di prova negativo nel banco; con un falso allarme si guarda il diff e decide l'orchestratore |
| **Preset** (nova scuro, `--heading-case: none`, ferro con aree invertite) | solo token e classi semantiche; `.section-dark` fa l'inversione; VRT 7 × 2, axe, overflow su tutti |
| **Id duplicati del form `ContactCTA`** | una sola form per pagina; id dei blocchi nuovi dedicati; controllo §11.2-4 e axe |
| **Ancore della home** (Gallery tolta, sezioni assenti nei clienti) | `navConPagine` riscrive `#lavori` solo se la pagina c'è; l'assembler toglie `lavori` insieme alla Gallery; `verificaCollegamenti` fallisce su `/#id` senza sezione; caso Costruzioni Generali (senza Gallery) nel banco |
| **Aree larghe** («Provincia di Roma», «Tutta Italia») con centinaia di comuni | la pagina elenca le aree per intero con `etichettaArea` e al più 40 comuni; nessuna pagina per comune; `areaServed` con l'area, non coi comuni |
| **Zone non usabili** (brief Tally, lead cambiato, da controllare) | niente `areaServed` e avviso col motivo di T3 nella scheda Build; la pagina zone la genera T5b/T5c solo con `zoneUsabili` ok |
| **`areaServed` rifiutato dai controlli di T1a** | `CHIAVI_VIETATE` aggiornato nello stesso commit, con caso nel banco |
| **`lastmod` che cambia per tutte le pagine** al cambio di `testoIndicizzabile` | nessun registro esistente al 15/09; da T5a in poi header, nav e footer non contano |
| **Foto delle pagine senza varianti leggere** | hero dalle foto delle card e foto lavori = Gallery: `src` già nel manifest di T1b; avviso di `verificaCollegamenti` per un `src` fuori dalle sezioni |
| **Pagina lavori duplica la Gallery della home** | niente bottone dalla Gallery; pubblicazione da confermare (dubbio 1) |
| **View transitions**: il cross-fade coinvolge tutta la pagina, header compreso | accettato come oggi per `/privacy`; un header persistente è fuori T5a |
| `404.html` servito solo se Workers lo sa | nota esplicita per T5c (`not_found_handling: "404-page"`) |
| Pagine QA nella `dist` dei clienti | anteprime solo sotto `/anteprima/` (cancellata da `lib/build.ts`) |
| Contenuto sottile o doorway | nessun tipo servizio × comune né pagina comune; minimi nel contratto (3-10 voci «Cosa comprende», 1-4 paragrafi); similarità in T5b |
| Peso del repository per le baseline | solo sezioni nuove, niente full-page (~90 PNG); da rivedere in calibrazione |

## 13. Dubbi che richiedono una decisione (proposta in grassetto)

1. **Pagina «Lavori»**: mostra le stesse 4-12 foto della Gallery in home, senza servizio, luogo né anno; porta
   poco traffico e duplica contenuto. **T5a costruisce il tipo (un componente, costo basso); T5c la pubblica solo
   se Mattia lo conferma; nessun bottone «Vedi tutti i lavori» in home.**
2. **`areaServed` di «X e dintorni»**: `City` del comune centro oppure `GeoCircle` con coordinate del centro e
   raggio. **`City`: niente coordinate nel JSON-LD; il raggio resta scritto nella pagina Zone servite.**
3. **Comuni elencati nella pagina Zone con aree larghe**: **i primi 40 di `comuniServiti` (distanza dalla sede),
   scelti da T5b/T5c; l'area intera la dice l'etichetta.** Se T4 misura volumi per comune, T5b può preferire i più
   cercati dentro lo stesso tetto.
4. **`areaServed` attivo da subito** per i clienti col servizio Sito acceso, alla build successiva a T5a e prima
   delle pagine. **Sì: è il segnale geografico più economico e non dipende da T5b.**

Decisioni T5a registrate il 14/09 e loro stato: punti 1, 2, 6 e 7 applicati sopra; punti 3 (prezzo e abilitazioni)
e 4 (pagina cantiere) superati da T3 punto 13; punto 5 (`ProcessSteps` come chiusura) senza più il caso che lo
attivava (§3.2).

## Calibrazione

## Verifica
