# Piano T1a — Fondamenta SEO dietro l'interruttore

Stato: **chiuso** (fasi 1-5 fatte), 2026-09-14 — commit `78ddf16`, `29ea851`, `bd1578d`, `93ad659`,
`e44fb95`, `10692a0` + chiusura documenti. Restano i due punti aperti fuori perimetro in fondo al §11. Fonti: `docs/traffico/README.md`
(§1-§5), `docs/traffico/brief-T1a.md`, `docs/traffico/piano-T0.md` §3-§4, codice e dati elencati nel brief,
documentazione Google (dati strutturati LocalBusiness, sitemap), IndexNow, schema.org, Cloudflare
(`_headers` degli static assets).

## 1. Contesto

Obiettivo: con il servizio Traffico «Sito» `attivo` o `sospeso`, un dominio e il percorso completo, la build
del sito emette robots con `Sitemap`, `sitemap.xml` con `lastmod` onesti, JSON-LD reale nella home, file
chiave IndexNow; a servizio spento la `dist` è **identica byte per byte** a oggi. Il deploy rifiuta una build
che non corrisponde allo stato atteso.

**Precondizione**: T0 committato (`lib/schemas.ts` con `traffico`, `lib/traffico.ts` con `leggiTraffico` e
`fondamentaAccese`) e `.claude/scope.json` di T0 svuotato. Oggi `scope.json` contiene ancora il perimetro
di T0: la fase 2 di T1a non parte finché è così (entrambi toccano `lib/schemas.ts`).

Fatti rilevati leggendo il codice e i dati (2026-09-14):

- `public/robots.txt` = `User-agent: *` + `Allow: /` (23 byte, newline finale), copiato da Astro in ogni
  `dist`, siti e demo.
- Astro builda in formato directory: `dist/privacy/index.html`; la canonical (`Base.astro`) è
  `new URL(Astro.url.pathname, Astro.site)` → `https://<dominio>/` e `https://<dominio>/privacy/` (barra
  finale verificata nella `dist` di Cavaliere). Solo con `SITE_URL`.
- Le sottopagine esistenti (privacy, termini, grazie) hanno `noindex`; `/anteprima*` è rimossa post-build
  in `lib/build.ts`. Oggi l'unico URL indicizzabile è la home. Nessun JSON-LD nelle `dist`.
- `lib/build.ts` passa ad Astro `SITE_JSON`, `NOINDEX` (demo), `SITE_URL` (dominio), `UMAMI_*`/`FORM_ACTION`
  (dominio e build completa) con spread condizionali; registra `siteUrl` e `integrazioni` cotte.
  **Con dominio e build completa chiama `ensureUmamiWebsite`** (rete verso il VPS): conta per la fixture.
- `lib/deploy.ts` rifiuta con `throw new Error(…)` (messaggio salvato in `deployErrore`) su noindex,
  `siteUrl` e integrazioni, poi scrive `wrangler.jsonc` con `workers_dev: true`.
- Due forme di dati cliente: **storici Tally** (Cavaliere, Costruzioni Generali): nessun id mestiere,
  `contact.address` in prosa «via civico comune CAP», niente provincia; **form nuovo** (es. Mattia Saggin):
  `raw-submission.json.risposte.mestiere.id`, sede strutturata, `contact.address` composto
  «via civico, CAP comune (XX)». In entrambi la P.IVA è `brief.json.partita_iva`.
- `lib/piva.ts` (`pivaValida`) esiste ed è puro. `site-intake/data-src/comuni.json`: 7.904 comuni con
  `nome`, `sigla`, `cap[]` (558 CAP condivisi tra più comuni; Milano ne ha 42).
- Title attuali delle home: 50, 64 e 53 caratteri (quello da 64 è un fallback senza `seoTitle`, cliente
  senza dominio); un solo `<h1>` in tutte e tre.
- I banchi girano con `node --experimental-strip-types`: i moduli importati devono usare import con
  estensione `.ts` o solo `import type` (come `lib/stati.ts`, `lib/inbox-form.ts`).

Fonti esterne (lette il 2026-09-14):

- Google LocalBusiness: obbligatori `name` e `address` («Include as many properties as possible»);
  consigliati `telephone` con prefisso internazionale, `url`, `geo` (≥5 decimali), `openingHoursSpecification`,
  `priceRange`; `aggregateRating`/`review` solo per siti che recensiscono **altre** attività; «Use the most
  specific LocalBusiness sub-type possible», tipi multipli come array.
- Google sitemap: `lastmod` = ultimo aggiornamento significativo (contenuto principale, dati strutturati,
  link; non la data di copyright); Google lo usa se «consistently and verifiably» accurato; ignora
  `priority`/`changefreq`; URL assoluti e canonici, UTF-8, valori con escape delle entità;
  `Sitemap:` in robots.txt.
- IndexNow: chiave 8-128 caratteri `[a-zA-Z0-9-]`; file `<chiave>.txt` UTF-8 alla radice che contiene la
  chiave; gli URL inviati devono stare sullo stesso host.
- schema.org: sottotipi di `HomeAndConstructionBusiness` = Electrician, GeneralContractor, HVACBusiness,
  HousePainter, Locksmith, MovingCompany, Plumber, RoofingContractor; `vatID`, `taxID`, `telephone`,
  `email`, `address`, `logo`, `image`, `sameAs`, `areaServed`, `hasOfferCatalog`, `makesOffer` disponibili
  (ereditati da Organization/Place/Thing).
- Cloudflare Workers static assets: un file `_headers` nella cartella degli asset viene letto e non servito;
  regole con URL assoluto e segnaposto nell'host; esempio ufficiale per non indicizzare workers.dev:
  `https://:version.:subdomain.workers.dev/*` → `X-Robots-Tag: noindex`.

Fuori da T1a: pagine nuove e 404 (T5a), breadcrumb, `areaServed`/orari/prezzi (arrivano con il mini-form
T3), immagini (T1b), Search Console/Bing/ping IndexNow (T2a), UI.

## 2. Decisioni tecniche

### 2.1 Dove si calcolano sitemap e lastmod: **editor, post-build sulla `dist`**

Una funzione `cuociFondamenta()` in `lib/fondamenta.ts`, chiamata da `lib/build.ts` subito dopo la
rimozione di `/anteprima*`. Legge l'HTML finale, sceglie gli URL, calcola gli hash, aggiorna il registro e
scrive robots, sitemap, chiave e `_headers` nella `dist`.

Perché qui e non nel renderer (né con `@astrojs/sitemap`, citato nella ricerca §6.1):

- `lastmod` da hash richiede il registro **precedente** del cliente in `out/<slug>/traffico/`: dentro Astro
  servirebbe un path in ingresso e una scrittura fuori dall'`outDir` durante una build statica. L'editor
  possiede già `out/<slug>/` e `client.json`.
- L'hash si calcola su ciò che Google riceve (HTML finale, JSON-LD compreso), non su una ricostruzione.
- L'elenco URL è generico: ogni `index.html` della `dist` senza `noindex`. Le pagine di T5a entrano senza
  toccare T1a.
- `@astrojs/sitemap` metterebbe tutte le pagine o richiederebbe filtri a mano, e non sa fare `lastmod` da
  contenuto; sarebbe una dipendenza nuova per 20 righe.
- Tutto è in funzioni pure (stringhe in ingresso, stringhe in uscita) più un orchestratore che usa solo
  `node:fs`: il banco le prova senza Astro e senza rete.

Limite noto (`ponytail:` nel codice): `lastmod` = istante della **prima build** che ha prodotto quel
contenuto. Se il deploy arriva giorni dopo, `lastmod` precede la pubblicazione. Nella pratica build e
deploy avvengono nello stesso giorno. Se servisse, lo si allinea al deploy in T2a, che tocca già il deploy.

### 2.2 Regola unica «fondamenta attese»

In `lib/fondamenta.ts`:

```ts
/** Dominio per cui la build DEVE cuocere le fondamenta, o null. Unica regola per build e deploy. */
export function fondamentaAttese(st: Pick<ClientState, "traffico" | "percorso">, dominio: string | undefined): string | null
// = dominio && st.percorso !== "demo" && fondamentaAccese(leggiTraffico(st)) ? dominio : null
```

La build la chiama solo se non è parziale (`partial ? null : fondamentaAttese(…)`). Demo: `null` anche con
servizio `sospeso` a mano, così robots e HTML delle demo non cambiano. Senza dominio: `null` (T0 ammette
l'attivazione senza dominio con avviso; le fondamenta arrivano alla prima build con dominio).

### 2.3 Normalizzazione per l'hash (`testoIndicizzabile(html)`)

Entrano nell'hash, in quest'ordine: testo di `<title>`; `content` di `meta[name=description]`; contenuto
di ogni `script[type=application/ld+json]` (riserializzato); del `<body>`, dopo aver tolto `<script>`,
`<style>`, `<svg>` e i commenti: gli `alt` delle `<img>`, gli `href` delle `<a>` e il testo senza tag, con
entità decodificate e spazi compressi. Hash `sha256` esadecimale.

Restano fuori: `class`/`style`/`data-*` (preset, palette, kit), `src` di immagini e asset (`/_astro/*.css`
con hash), `<link>`, canonical e og:, script Umami, `action` del modulo, l'anno del copyright del Footer
(«© 2026» è l'anno della build: nel testo diventa «©»). Cambiare preset, palette, CSS o sito Umami, o
ribuildare dopo Capodanno, non muove `lastmod`; cambiare un testo, un alt, un link o i dati strutturati sì.
L'estrazione usa regex sull'HTML prodotto dai nostri componenti, non su HTML arbitrario (commento
`ponytail:`: se l'output diventasse imprevedibile, si passa a un parser).

### 2.4 Formato del registro lastmod

`out/<slug>/traffico/lastmod.json`, scritto in modo atomico (tmp + rename):

```json
{
  "pagine": {
    "/": { "hash": "<sha256 esadecimale>", "lastmod": "2026-09-14T09:12:31Z" }
  }
}
```

Chiave = path della pagina (lo stesso del canonical). `aggiornaLastmod(prec, pagine, adesso)`: hash uguale →
`lastmod` conservato; diverso o pagina nuova → `adesso`; pagina sparita → tolta (registro = sitemap).
Formato W3C Datetime in UTC senza millisecondi. Il registro si scrive **solo** se i controlli di §2.7
passano; build parziali, demo e servizio spento non lo toccano mai.

**Correzione dalla revisione**: il registro ha anche `pubblicate` (stessa forma di `pagine`), la copia di
`pagine` fatta da `registraPubblicazione()` in `deploy.ts` dopo un wrangler riuscito di una build con
fondamenta (best effort: il sito è già online). Hash diverso dall'ultima build ma uguale alla versione
pubblicata → il `lastmod` pubblicato: una modifica buildata e annullata prima del deploy non sposta la
sitemap. Tornare a X dopo aver **pubblicato** Y resta un cambio (`adesso`), mai un `lastmod` all'indietro.

### 2.5 Sitemap e robots

- `sitemap.xml`: dichiarazione XML UTF-8, `urlset` con namespace `http://www.sitemaps.org/schemas/sitemap/0.9`,
  per ogni pagina indicizzabile `<loc>` (= canonical letta dalla pagina) e `<lastmod>`, ordinate per `loc`,
  escape di `& < > ' "`. Niente `priority`/`changefreq` (Google li ignora).
- `robots.txt` (sovrascrive nella `dist` la copia di `public/`), contenuto esatto:

  ```
  User-agent: *
  Allow: /

  Sitemap: https://<dominio>/sitemap.xml
  ```

  Allow-all anche ai crawler AI: `User-agent: *` li copre tutti, nessuna riga di blocco (ricerca §6.1).

**robots come file generato post-build, non come endpoint Astro.** Con un endpoint `robots.txt.ts` bisognerebbe
cancellare `public/robots.txt` e riprodurne gli stessi 23 byte a servizio spento, con il rischio di una
newline diversa. Con il file post-build, a servizio spento il codice nuovo non gira: la copia statica resta
quella di oggi per costruzione, e nel renderer non cambia niente.

### 2.6 Dati strutturati: file generato dall'editor, reso dal renderer

**Generazione.** In `lib/build.ts`, dopo la fase integrazioni e prima di `astro build`, solo se
`fondamentaAttese` restituisce un dominio: `datiStrutturati(input)` (pura) produce l'oggetto JSON-LD più un
elenco di avvisi; `scriviDatiStrutturati()` lo salva in `out/<slug>/traffico/dati-strutturati.json` (solo
JSON-LD, niente metadati) e la build passa `DATI_STRUTTURATI_JSON=<path assoluto>` ad Astro, con lo stesso
spread condizionale di `NOINDEX`. Gli avvisi e un riepilogo vanno nel log della build: ad esempio
`JSON-LD: GeneralContractor · indirizzo ok · P.IVA ok · 5 servizi · omessi: sameAs (nessun social)`.
Deterministico: nessuna data nel file, due build uguali danno byte uguali.

**Rendering.** `src/lib/loadSite.ts` legge il file se la env c'è (`datiStrutturati`, altrimenti `null`),
`src/pages/index.astro` lo passa a `Base` come `jsonLd`, `Base.astro` lo emette nell'`<head>` subito dopo
`og:image`:

```astro
// JSON dentro <script>: < > & e U+2028/U+2029 in \uXXXX, nessun valore può chiudere il tag.
const jsonLdHtml = jsonLd == null ? null
  : JSON.stringify(jsonLd).replace(/[<>&\p{Zl}\p{Zp}]/gu, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
{jsonLdHtml && <script is:inline type="application/ld+json" set:html={jsonLdHtml} />}
```

Il renderer riserializza sempre, quindi anche un file ritoccato a mano esce con l'escape. Solo la home
riceve il JSON-LD. `site.json` e `schema.ts` non cambiano.

**Provenienza di ogni campo** (input di `datiStrutturati`: `site.json` finale dopo la patch dei media,
`brief.json`, `raw-submission.json`, dominio, elenco comuni):

| Campo | Fonte | Regola | Se manca o non è valido |
|---|---|---|---|
| `@context` | costante | `https://schema.org` | — |
| `@type` | `raw-submission.json` → `risposte.mestiere.id` | mappa §2.6.1 | `HomeAndConstructionBusiness` |
| `@id` | dominio (`steps.build.dominio`) | `https://<dominio>/#azienda` (riusabile dalle pagine T5a) | — |
| `name` | `site.json` `meta.businessName` | invariato | — (obbligatorio nello schema) |
| `url` | dominio | `https://<dominio>/` = canonical della home | — |
| `telephone` | `site.json` `contact.phone` (= numero mostrato) | senza spazi; `+` e 8-15 cifre, oppure numero nazionale che inizia per 0 o 3 → `+39…` | omesso + avviso |
| `email` | `site.json` `contact.email` | forma `x@y.z` | omesso |
| `address` | `site.json` `contact.address` (= indirizzo mostrato) + `site-intake/data-src/comuni.json` | parser §2.6.2 → `PostalAddress` con `streetAddress`, `addressLocality`, `postalCode`, `addressRegion` (sigla), `addressCountry: "IT"` | omesso + avviso (dubbio §11-1) |
| `vatID` | `brief.json` `partita_iva` | 11 cifre e `pivaValida` → `IT` + cifre | omesso + avviso |
| `logo` | `site.json` `brand.logo.src`, altrimenti `brand.mark.src` | URL assoluto sul dominio | omesso |
| `image` | `site.json` Hero `props.image.src` (come `og:image`) | URL assoluto sul dominio | omesso (dubbio §11-2) |
| `sameAs` | `site.json` `contact.social` | solo URL `https://` sull'host della rete (instagram.com, facebook.com, tiktok.com, linkedin.com) | omesso |
| `makesOffer` | `site.json` Services `items[].title` | `Offer` → `itemOffered: { @type: Service, name }` | omesso se la sezione manca |

Servizi: si usano i titoli delle card Services, non i `servizi_atomizzati` di `contesto.json` come dice il
brief alla lettera. Le card derivano dalle `macro_categorie` di contesto e il copy-critic le ha già
verificate; soprattutto sono **visibili** nella pagina, e Google chiede che il markup rappresenti ciò che
l'utente vede. I 24 servizi atomizzati di Cavaliere non compaiono tutti in pagina (dubbio §11-4).

**Mai**: `aggregateRating`, `review` (policy sulle recensioni self-serving), `FAQPage`, `geo` (non
abbiamo coordinate reali), `openingHours*`/`priceRange`/`areaServed` (arriveranno da T3 con fonte),
`taxID`. Il codice fiscale dell'impresa non viene raccolto e per le ditte individuali coincide con quello
del titolare, cioè un dato personale. Il banco controlla l'assenza con una scansione ricorsiva delle chiavi.

#### 2.6.1 Mappa mestiere → tipo schema.org (sottotipi verificati su schema.org il 2026-09-14)

| id mestiere (form) | `@type` | Motivo |
|---|---|---|
| `impresa-edile` | `GeneralContractor` | impresa che esegue e coordina l'opera |
| `ristrutturazioni` | `GeneralContractor` | bagni, impianti, pavimenti e facciate coordinati da un'unica impresa (da calibrare) |
| `idraulico` | `Plumber` | — |
| `elettricista` | `Electrician` | — |
| `imbianchino` | `HousePainter` | — |
| `cartongesso` | `HomeAndConstructionBusiness` | nessun sottotipo specifico |
| `serramenti` | `HomeAndConstructionBusiness` | nessun sottotipo specifico (non è Locksmith) |
| `altro`, id assente (clienti storici), id sconosciuto | `HomeAndConstructionBusiness` | niente tipo senza fonte |

`RoofingContractor` e `HVACBusiness` non hanno oggi un mestiere dedicato. Un array di tipi dedotto dai
lavori (es. idraulico con caldaie o pompe di calore → `["Plumber","HVACBusiness"]`) è materia di
calibrazione. Il banco verifica che ogni id di `TESTI.mestieri` (`lib/inbox-form.ts`) abbia una voce
esplicita, così un mestiere aggiunto al form fa fallire il test.

#### 2.6.2 Indirizzo strutturato (`indirizzoStrutturato(testo, comuni)`)

Un solo parser per le due forme, applicato all'indirizzo **mostrato** in pagina: il JSON-LD non può
divergere da ciò che vede l'utente, anche se l'operatore ha corretto l'indirizzo dopo l'import.

1. Normalizza: spazi compressi; per il confronto minuscole, accenti tolti, apostrofi (anche `’`) e
   trattini come spazio.
2. Esattamente **un** CAP (`\b\d{5}\b`), altrimenti `null`.
3. Candidati: i comuni con quel CAP in `cap[]` il cui nome compare come parola intera nel testo. Se più
   candidati, vince il nome più lungo; se resta un pareggio, `null`.
4. Se nel testo c'è una sigla tra parentesi, deve coincidere con `sigla`, altrimenti `null`.
5. `streetAddress` = testo prima del nome del comune o del CAP (il primo dei due), senza virgole finali;
   deve contenere una lettera.
6. `addressLocality` = nome ISTAT (grafia canonica), `postalCode` = CAP, `addressRegion` = sigla.

Ogni `null` porta un motivo leggibile per l'avviso («CAP assente», «comune non trovato per il CAP 20093»,
«sigla (VI) diversa da MI»…). L'elenco dei comuni lo legge `build.ts` da
`REPO_ROOT/site-intake/data-src/comuni.json`; la funzione pura lo riceve come parametro. Se il file non
si legge: indirizzo omesso con avviso, la build continua.

### 2.7 Controlli sulle pagine indicizzabili (gate della fase fondamenta)

`elencoPagine(dist, dominio)` percorre la `dist` (esclusi `_astro/`, `media/`, `fonts/`) e considera gli
`.html`. Salta `404.html` e le pagine con `meta name="robots"` contenente `noindex`. Un `.html` che non si
chiama `index.html` è un errore (forma non prevista). Su ogni pagina indicizzabile:

- la canonical esiste ed è **uguale** all'URL derivato dal path (`dist/x/index.html` → `https://<dominio>/x/`,
  barra finale compresa): è la garanzia «canonical = loc della sitemap»;
- title decodificato ≤ 60 caratteri (stesso limite Zod di `seoTitle`);
- `meta description` presente, ≤ 160 caratteri;
- esattamente un `<h1`.

Se un controllo fallisce, la build fallisce prima di scrivere qualunque file, con un messaggio che dice dove
correggere, ad esempio «title della home di 64 caratteri (max 60): compila Titolo SEO nella scheda Copy».
Il copy non si tocca (dubbio §11-7). Cloudflare serve `/x/index.html` su `/x/` e reindirizza `/x` a
`/x/`, quindi URL servito = canonical; lo si verifica con curl al primo deploy reale.

### 2.8 Chiave IndexNow

`chiaveIndexNow(dirCliente)`: legge `out/<slug>/traffico/indexnow.json` (`{ "chiave": "…", "creataAt": "…" }`)
o, se il file manca, lo crea con `crypto.randomBytes(16).toString("hex")` (32 caratteri esadecimali, dentro
8-128). Nasce alla prima build con fondamenta e resta la stessa anche dopo sospensione e riattivazione.
File presente ma illeggibile o con una chiave fuori formato → errore della build: rigenerarla in silenzio
nasconderebbe un file rotto. Nella `dist` va `<chiave>.txt` con dentro esattamente la chiave, senza newline.
Il ping lo farà T2a. La chiave non è un segreto: è pubblica per protocollo, quindi niente Keychain.

### 2.9 Host `*.workers.dev`

`workers_dev: true` resta com'è: il commento in `deploy.ts` spiega perché, altrimenti wrangler lo spegne
quando ci sono le `routes`. Con le fondamenta la `dist` riceve anche un `_headers`:

```
https://:version.:subdomain.workers.dev/*
  X-Robots-Tag: noindex
```

È la regola della documentazione Cloudflare: il file non viene servito e l'intestazione vale solo sugli host
`<worker>.<account>.workers.dev`, non sul dominio del cliente. Oggi la copia su workers.dev è coperta solo
dalla canonical; con il `noindex` Google non la indicizza più e la canonical resta la rete di sicurezza.
Il robots di workers.dev è lo stesso file e punta alla sitemap del dominio. A servizio spento niente
`_headers` (dist identica). Si può verificare solo con un deploy (dubbio §11-6).

### 2.10 Interlock nel deploy

`lib/schemas.ts`, in `steps.build`, accanto a `integrazioni`:

```ts
/**
 * Fondamenta SEO COTTE nella dist dell'ultima build (servizio Traffico «Sito» attivo o sospeso, dominio,
 * percorso completo): robots con Sitemap, sitemap.xml, JSON-LD in home, chiave IndexNow, _headers.
 * Assente = build senza. Il deploy rifiuta se non coincide con fondamentaAttese().
 */
fondamenta: z.object({ dominio: z.string() }).optional(),
```

`build.ts` lo scrive o lo cancella nel `patchClientState` finale, come `siteUrl`. `deploy.ts`, dopo il
controllo delle integrazioni e **prima** di `writeJson(wrangler.jsonc)`:

```ts
const motivo = motivoRifiutoFondamenta(build.fondamenta?.dominio ?? null, fondamentaAttese(st, dominio));
if (motivo) throw new Error(motivo);
```

Messaggi, nello stile di quelli esistenti:

| Build | Atteso | Messaggio |
|---|---|---|
| senza | dominio `d` | «la build è stata prodotta senza le fondamenta SEO (sitemap, robots, dati strutturati), ma il servizio Traffico «Sito» è acceso per d. Ribuilda, riconferma e poi pubblica.» |
| per `b` | nessuno | «la build contiene le fondamenta SEO per b, ma il servizio Traffico «Sito» è spento o manca il dominio. Ribuilda, riconferma e poi pubblica.» |
| per `b` | `d ≠ b` | «le fondamenta SEO della build sono per b, il dominio attuale è d. Ribuilda, riconferma e poi pubblica.» |
| coincidono | | `null` |

Una build parziale non cuoce mai le fondamenta: con il servizio acceso il deploy la rifiuta (riga 1), oltre
al controllo sulle integrazioni che c'è già. Il messaggio finisce in `deployErrore` e la scheda Build lo
mostra già: nessuna UI nuova.

## 3. Firme di `lib/fondamenta.ts`

Import: `node:fs`, `node:path`, `node:crypto`, `./piva.ts`; `import type` da `./schemas` e `./traffico`;
`{ leggiTraffico, fondamentaAccese }` da `./traffico.ts` (T0, solo `import type` al suo interno). Niente
`clients.ts` né `paths.ts`, così il banco gira con strip-types.

```ts
export function fondamentaAttese(st: Pick<ClientState, "traffico" | "percorso">, dominio: string | undefined): string | null;
export function motivoRifiutoFondamenta(cotte: string | null, attese: string | null): string | null;
export const TIPO_PER_MESTIERE: Record<string, string>;
export function tipoSchema(mestiereId: string | undefined): string;
export type Comune = { nome: string; sigla: string; cap: string[] };
export function indirizzoStrutturato(testo: string, comuni: Comune[]):
  { ok: true; address: PostalAddressLd } | { ok: false; motivo: string };
export function datiStrutturati(i: { site: unknown; brief: unknown; rawSubmission: unknown; dominio: string; comuni: Comune[] | null }):
  { jsonld: Record<string, unknown>; avvisi: string[]; riepilogo: string };
export function scriviDatiStrutturati(dirCliente: string, i: Parameters<typeof datiStrutturati>[0]):
  { file: string; avvisi: string[]; riepilogo: string };
export function testoIndicizzabile(html: string): string;
export function hashPagina(html: string): string;
export type RegistroLastmod = { pagine: Record<string, { hash: string; lastmod: string }> };
export function aggiornaLastmod(prec: RegistroLastmod | null, pagine: { path: string; hash: string }[], adesso: Date):
  { registro: RegistroLastmod; cambiate: string[] };
export function sitemapXml(pagine: { loc: string; lastmod: string }[]): string;
export function robotsTxt(dominio: string): string;
export const HEADERS_WORKERS_DEV: string;
export function controllaPagina(html: string, urlAtteso: string): string[];   // errori; [] = ok
export function elencoPagine(dist: string, dominio: string):
  { pagine: { path: string; url: string; html: string }[]; errori: string[] };
export function chiaveIndexNow(dirCliente: string, adesso: Date): string;
export function cuociFondamenta(dist: string, dirCliente: string, dominio: string, adesso: Date):
  { ok: true; urls: number; cambiate: string[] } | { ok: false; errore: string };
```

Ordine interno di `cuociFondamenta`: elenco e controlli → se ci sono errori, uscita senza scrivere nulla →
chiave → hash e nuovo registro → scrittura nella `dist` di `robots.txt`, `sitemap.xml`, `<chiave>.txt`,
`_headers` → scrittura atomica di `traffico/lastmod.json`.

## 4. File

| File | Tipo | Cosa |
|---|---|---|
| `site-factory-editor/lib/fondamenta.ts` | A | regole e generatori (§2, §3) |
| `site-factory-editor/scripts/test-fondamenta.ts` | A | banco senza rete (§8) |
| `site-factory-editor/lib/schemas.ts` | M | `steps.build.fondamenta` (§2.10) |
| `site-factory-editor/lib/build.ts` | M | fase «fondamenta SEO (dati strutturati)» prima di astro, env `DATI_STRUTTURATI_JSON`, fase «fondamenta SEO (sitemap, robots, IndexNow)» dopo la pulizia QA, `fondamenta` nello stato, riepilogo nel testo finale |
| `site-factory-editor/lib/deploy.ts` | M | interlock (§2.10) |
| `site-renderer/src/lib/loadSite.ts` | M | `datiStrutturati` da `DATI_STRUTTURATI_JSON` |
| `site-renderer/src/pages/index.astro` | M | `jsonLd={datiStrutturati}` |
| `site-renderer/src/layouts/Base.astro` | M | prop `jsonLd`, script JSON-LD con escape |
| `docs/DEBUG.md` | M | righe «deploy rifiutato: fondamenta SEO» → `client.json` `steps.build.fondamenta` vs `traffico.sito` e dominio; «lastmod che non cambia o cambia sempre» → `traffico/lastmod.json` + log della fase; «JSON-LD senza indirizzo/P.IVA» → avvisi nel log della build |
| `docs/traffico/piano-T1a.md` | M | Calibrazione, Verifica, chiusura |
| `docs/traffico/README.md` | M | §7 stato T1a |
| `docs/handoff-fase-c.md` | M | riga T1a |

Non si toccano: `site-renderer/public/robots.txt`, `astro.config.mjs`, `schema.ts`, `SubPage.astro`, le altre
pagine, i componenti e il CSS; `lib/traffico.ts`, `lib/steps.ts`, `lib/catena.ts`, `lib/stati.ts`,
`lib/staleness.ts`, `lib/piva.ts`, `lib/integrazioni.ts`, le route, la UI, n8n, le skill. Nessuna API di
Next è coinvolta (solo moduli `lib/`): se servisse una route, prima si leggono le guide in
`node_modules/next/dist/docs/`. Dipendenze nuove: nessuna.

## 5. Perimetro per `.claude/scope.json` (primo atto della fase 2, dopo lo svuotamento di T0)

```json
{
  "task": "T1a Fondamenta SEO dietro l'interruttore (docs/traffico/piano-T1a.md)",
  "perimetro": [
    "site-factory-editor/lib/fondamenta.ts",
    "site-factory-editor/scripts/test-fondamenta.ts",
    "site-factory-editor/lib/schemas.ts",
    "site-factory-editor/lib/build.ts",
    "site-factory-editor/lib/deploy.ts",
    "site-renderer/src/lib/loadSite.ts",
    "site-renderer/src/pages/index.astro",
    "site-renderer/src/layouts/Base.astro",
    "docs/DEBUG.md",
    "docs/traffico/**",
    "docs/handoff-fase-c.md"
  ]
}
```

La fixture in `site-renderer/out/` è esente dal guard. I prima/dopo della `dist` vanno nello scratchpad
della sessione.

## 6. Milestone (ogni verifica passa prima della successiva)

**M0 — Precondizioni e «prima».** `git log --oneline -5` mostra il commit di T0; `lib/traffico.ts` esporta
`fondamentaAccese`; `scope.json` vuoto → si scrive §5. Baseline del renderer **prima di ogni modifica**:
`npm run build`, `npm run check` (annotare gli errori: atteso solo `registry.ts`), validatore sul blueprint,
`npm run test:visual`, `npm run test:a11y` (annotare l'esito). Fixture passi F1-F5 (§7): dist «prima-A» e
«prima-B» identiche.

**M1 — Regole e banco.** `lib/fondamenta.ts` (nessun chiamante ancora) + `scripts/test-fondamenta.ts`.
Verifica: banco verde; `npx tsc --noEmit`. **Commit 1** (path espliciti) + push: codice non collegato, zero
effetti.

**M2 — Renderer.** `loadSite.ts`, `index.astro`, `Base.astro`. Verifica: `npm run build`, `npm run check`
(stessi errori di M0), validatore sul blueprint, `test:visual` e `test:a11y` con lo stesso esito di M0;
prova di escape F13.

**M3 — Collegamento nell'editor.** `schemas.ts`, `build.ts`, `deploy.ts`. Verifica: `npx tsc --noEmit`,
`npm run build` dell'editor, `test-fondamenta.ts`, `test-stati.ts`, `test-demo.ts`, `test-portafoglio.ts`,
`test-import-form.ts`, `test-legale-gates.ts`, `test-logo-gates.ts`, `test-traffico-stato.ts` (T0), `parity-copy.ts`.
Revisione: in `deploy.ts` l'interlock precede `writeJson` (controllo sul diff).

**M4 — E2E sulla fixture.** Passi F6-F14 (§7). **Commit 2** (M2+M3 + documenti) + push, dopo che
l'orchestratore ha rilanciato le verifiche.

Fasi 3-5: Calibrazione (§12), test completi (§10), revisione del diff riga per riga, file toccati vs §4,
`scope.json` svuotato, README §7, handoff, DEBUG.

## 7. Fixture `out/zz-test-t1a` (build «prima» e «dopo»)

Via editor sul dev server (stesse route della scheda Build): build = `POST /api/clients/zz-test-t1a/run/build`
`{ "mode": "generate" }`, poi attendere la fine del run (log «build ok»). `$T` = cartella dello scratchpad.

**Allestimento (M0, prima di qualunque modifica al codice)**

- F1. Marcatore `touch $T/marcatore` e `shasum -a 256 out/cavaliere-build-srls/client.json` annotato.
- F2. Copia **senza** gli oggetti che puntano al sito vero: `rsync -a --exclude dist --exclude .wrangler
  --exclude wrangler.jsonc --exclude logs out/cavaliere-build-srls/ out/zz-test-t1a/`.
- F3. Edit di `out/zz-test-t1a/client.json`: in `steps.build` togliere `siteUrl`, **`umamiWebsiteId`**,
  `integrazioni`, `deploy`, `infra`, `deployErrore`, e **solo dopo** impostare `dominio: "zz-test-t1a.invalid"`.
  Controllo bloccante prima della prima build: nel file della fixture non compaiono l'id Umami di Cavaliere
  né `cavalierebuild.it` (`grep -c` = 0). Se l'id restasse, `ensureUmamiWebsite` **rinominerebbe il sito
  Umami di Cavaliere** sul dominio di prova.
- F4. Build → copia `dist` in `$T/prima-A` (la prima build crea un sito Umami di prova, dubbio §11-5) →
  build → `$T/prima-B` → `diff -r $T/prima-A $T/prima-B` vuoto. Se non è vuoto: individuare il rumore
  (ordine, timestamp) e fermarsi a chiedere; senza determinismo il criterio «byte per byte» non è
  dimostrabile.
- F5. `grep -c "/media/cavaliere-build-srls" $T/prima-A/index.html`: annotare il valore, non blocca (è una
  differenza di slug nell'assemble, irrilevante per i diff).

**Dopo (M4)**

- F6. **Spento**: build → `$T/dopo-spento`; `diff -r $T/prima-A $T/dopo-spento` **vuoto**; `client.json`
  senza `steps.build.fondamenta`; nessuna cartella `traffico/` creata.
- F7. **Attivo**: `POST /api/clients/zz-test-t1a/traffico {"servizio":"sito","stato":"attivo"}` → build →
  `$T/dopo-attivo`:
  - `diff -rq $T/prima-A $T/dopo-attivo` elenca **solo** `index.html`, `robots.txt`, `sitemap.xml`,
    `<chiave>.txt`, `_headers`; privacy, termini, grazie e asset identici;
  - `robots.txt` identico al testo di §2.5; `_headers` identico a §2.9;
  - `xmllint --noout sitemap.xml` ok; un solo `<url>`, `loc` = `https://zz-test-t1a.invalid/` = canonical di
    `index.html`; `lastmod` in formato W3C;
  - JSON-LD: estratto e `JSON.parse` ok; `@type` = `HomeAndConstructionBusiness` (cliente storico);
    `name`, `url`, `address` con 5 campi (se il parser riconosce l'indirizzo, altrimenti avviso nel log);
    scansione ricorsiva senza chiavi vietate; le cifre di `telephone` e `vatID` e il CAP compaiono nel
    testo della pagina;
  - `<chiave>.txt` = `traffico/indexnow.json.chiave`, senza newline; `traffico/lastmod.json` con `/`;
  - `client.json` `steps.build.fondamenta.dominio` = `zz-test-t1a.invalid`; nel log le due fasi e il
    riepilogo del JSON-LD.
- F8. **Stabilità**: build senza cambi → `diff -r $T/dopo-attivo $T/dopo-attivo-2` vuoto (`lastmod` e
  chiave invariati).
- F9. **Cambio di testo**: Edit in `copy.json` di un testo della home (sottotitolo hero, entro il budget) →
  build: rispetto a F8 cambiano solo `index.html` e `sitemap.xml`; `lastmod` di `/` nuovo; registro aggiornato.
- F10. **Nessun falso cambio**: Edit di `palette.json` (accent) → build: `index.html` cambia (stile inline),
  `sitemap.xml` identico a F9.
- F11. **Sospeso**: `{"servizio":"sito","stato":"sospeso"}` → build → `diff -r` con F10 vuoto (decisione 11:
  le fondamenta restano).
- F12. **Interlock sullo stato reale, senza wrangler**: script nello scratchpad che importa
  `lib/fondamenta.ts` per path assoluto e legge `client.json` della fixture con `JSON.parse`:
  (a) stato corrente → `null`; (b) stesso stato senza `traffico` → messaggio «contiene le fondamenta»;
  (c) senza `steps.build.fondamenta` → messaggio «senza le fondamenta»; (d) `dominio` cambiato → messaggio
  con i due domini. **Nessuna chiamata alla route di deploy**: se l'ordine dei controlli avesse un bug,
  wrangler pubblicherebbe un worker vero.
- F13. **Escape** (in M2): `astro build` diretto in `site-renderer` con `SITE_JSON` = site.json della fixture,
  `SITE_URL=https://zz-test-t1a.invalid`, `DATI_STRUTTURATI_JSON` = file nello scratchpad con
  `name: "A</script><script>alert(1)</script>&B "`, `--outDir $T/escape`: l'HTML non contiene
  `</script><script>alert`; il contenuto estratto, passato a `JSON.parse`, restituisce il nome originale.
  Stessa build senza `DATI_STRUTTURATI_JSON` → nessun `ld+json`.
- F14. **Pulizia**: eliminazione della fixture dall'editor (`DELETE /api/clients/zz-test-t1a` con il nome
  esatto): cancella la cartella, il sito Umami di prova e chiama la deregistrazione n8n `rimuovi`
  (nessun monitor Gatus da togliere). Controlli: `ls out/` = i 3 clienti; hash di
  `cavaliere-build-srls/client.json` uguale a F1; `find out/cavaliere-build-srls -newer $T/marcatore`
  vuoto; `$T` cancellata. `public/media` viene ripulita dalla prossima build.

## 8. Banco `scripts/test-fondamenta.ts` (senza rete, stile `test-demo.ts`)

`fondamentaAttese`
1. sito spento + dominio → `null`; attivo + dominio → dominio; sospeso + dominio → dominio;
2. attivo senza dominio → `null`; percorso demo + sospeso + dominio → `null`; senza campo `traffico` → `null`.

`motivoRifiutoFondamenta`
3. cotte `null`, attese `"a.it"` → contiene «senza le fondamenta» e «Ribuilda»;
4. cotte `"b.it"`, attese `null` → contiene «contiene le fondamenta»;
5. cotte `"b.it"`, attese `"a.it"` → contiene entrambi i domini;
6. entrambe `null` / entrambe `"a.it"` → `null`.

`tipoSchema`
7. impresa-edile e ristrutturazioni → GeneralContractor; idraulico → Plumber; elettricista → Electrician;
   imbianchino → HousePainter; cartongesso, serramenti, altro, `undefined`, id sconosciuto →
   HomeAndConstructionBusiness;
8. ogni id di `TESTI.mestieri` (`lib/inbox-form.ts`) ha una voce esplicita in `TIPO_PER_MESTIERE`.

`indirizzoStrutturato` (lista di comuni di prova in linea + un caso sul `comuni.json` reale)
9. forma storica «Via Roma 1 Cologno Monzese 20093» → `Via Roma 1` · Cologno Monzese · 20093 · MI · IT;
10. forma del form «Via Roma 1, 36100 Vicenza (VI)» → ok;
11. CAP condiviso tra due comuni → sceglie quello nominato; pareggio → `null`;
12. sigla tra parentesi diversa → `null` con motivo;
13. nessun CAP, due CAP, comune non trovato, via vuota → `null`, ciascuno con il suo motivo;
14. apostrofo tipografico e accenti («Sant’Angelo Lodigiano») → ok;
15. file reale: Milano con 20121 → ok; Milano con un CAP non suo → `null`.

`datiStrutturati`
16. input completo (form nuovo) → `@context`, `@type`, `@id`, `name`, `url` = `https://d/`, `telephone`,
    `email`, `address`, `vatID` = `IT…`, `logo` e `image` assoluti, `sameAs`, `makesOffer` dai titoli
    Services;
17. scansione ricorsiva: mai `aggregateRating`, `review`, `geo`, `FAQPage`, `openingHours`,
    `openingHoursSpecification`, `priceRange`, `areaServed`, `taxID`;
18. omissioni con avviso: telefono vuoto, email non valida, P.IVA con checksum errato, social non URL o su
    un altro host, indirizzo non riconosciuto, `comuni` null, niente logo né mark, niente hero, niente Services;
19. mark usato solo senza `brand.logo`; numero nazionale `333…` → `+39333…`;
20. deterministico: due chiamate → `JSON.stringify` identico.

`hashPagina` / `testoIndicizzabile`
21. stesso contenuto con `class`, hash `_astro`, `style` inline, script Umami, `action` e spazi diversi →
    stesso hash;
22. testo, alt, href, title, description o JSON-LD diversi → hash diverso (un caso ciascuno);
23. `&amp;` e `&` → stesso testo.

`aggiornaLastmod`
24. registro assente → tutte le pagine con `adesso`;
25. hash invariato → `lastmod` conservato; cambiato → `adesso` e path in `cambiate`; pagina sparita → tolta;
    nuova → `adesso`; formato senza millisecondi.

`sitemapXml` / `robotsTxt` / `HEADERS_WORKERS_DEV`
26. sitemap: dichiarazione, namespace, `loc` ordinati, `&` in URL → `&amp;`, nessun `priority`/`changefreq`;
27. robots e `_headers` uguali al testo di §2.5/§2.9, carattere per carattere.

`controllaPagina` / `elencoPagine` (dist sintetica in una cartella temporanea)
28. pagina `noindex` e `404.html` escluse; `x.html` non index → errore;
29. canonical assente, senza barra finale o su altro host → errore; title di 61 caratteri → errore;
    0 o 2 `<h1` → errore; description assente → errore.

`chiaveIndexNow` / `cuociFondamenta` (cartelle temporanee, cancellate a fine banco)
30. prima chiamata crea `traffico/indexnow.json` con `/^[0-9a-f]{32}$/`; seconda → stessa chiave; file
    corrotto → eccezione leggibile;
31. `cuociFondamenta` su dist con home indicizzabile + privacy/grazie noindex: scrive `robots.txt`,
    `sitemap.xml` (1 URL), `<chiave>.txt`, `_headers`, `traffico/lastmod.json`; seconda esecuzione sulla
    stessa dist → file byte-identici; testo della home cambiato → `lastmod` = nuovo `adesso`;
32. home con title troppo lungo → `{ ok: false }`, nessun file scritto (né dist né registro).

## 9. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| **Dist diversa a servizio spento** (es. whitespace dall'espressione nuova in `Base.astro`) | Tutto il codice nuovo è dietro `fondamentaAttese`/env assente; robots resta statico; F6 `diff -r` vuoto è il criterio. Se non è vuoto, si sposta l'espressione accanto a quelle esistenti finché il diff è vuoto; il determinismo di base è provato in F4. |
| Preset rotti | Nessun cambio a componenti, CSS, token o markup del body; solo uno `<script>` nell'`<head>` con fondamenta accese. `/anteprima` invariata. |
| VRT/axe | Girano sul blueprint senza env: output invariato. Esito di M0 = esito di M2, altrimenti stop. |
| Demo | `fondamentaAttese` = `null` in percorso demo anche con servizio sospeso; build noindex e `deployDemo` invariati; banco 2. |
| **Siti già online (Cavaliere)** | T1a non ribuilda né pubblica nessun cliente. Online cambia qualcosa solo con servizio attivo + rebuild + deploy fatto da Mattia, dopo la baseline di 28 giorni (README §6). Il rebuild di Cavaliere a servizio spento resta identico (provato sul clone in F6). Hash e marcatore in F14. |
| **Fixture che tocca l'Umami di Cavaliere** | F3: `umamiWebsiteId` e `integrazioni` tolti **prima** di cambiare dominio, con `grep` bloccante; `wrangler.jsonc` e `.wrangler` esclusi dalla copia; nessuna chiamata alla route di deploy (F12). |
| Build parziale | Mai fondamenta, registro intatto (banco 32, codice); con il servizio acceso il deploy rifiuta (riga 1 di §2.10). |
| Cliente senza dominio | Nessuna fondamenta; `fondamentaAttese` `null` sia in build sia in deploy, quindi coerenti (banco 2). |
| Cliente senza P.IVA o con indirizzo non riconoscibile | Campo omesso, avviso nel log (banco 18). Senza `address` il JSON-LD non è idoneo ai risultati arricchiti LocalBusiness: dubbio §11-1. Mai valori ricostruiti a mano. |
| Title fallback troppo lungo, H1 ≠ 1 | Gate con messaggio che indica la scheda Copy (§2.7); riguarda solo i clienti con il servizio acceso. Oggi l'unico title oltre 60 è di un cliente senza dominio. |
| Falsi cambi di `lastmod` | Normalizzazione §2.3, banco 21-23, E2E F8 e F10; soglie in calibrazione. |
| `lastmod` prima della pubblicazione | Limite dichiarato (§2.1), `ponytail:` nel codice, allineamento eventuale in T2a. |
| `_headers` non verificabile senza deploy | Dubbio §11-6; in ogni caso al primo deploy reale: `curl -sI` su workers.dev → `x-robots-tag: noindex`, sul dominio → assente. |
| La zona Cloudflare del cliente riscrive robots.txt (robots gestito o blocco dei bot AI attivo di default sulle zone nuove) | Fuori dal codice: al primo deploy reale `curl` di `/robots.txt` sul dominio = file della `dist`; se differisce, impostazione della zona da sistemare (Mattia). |
| `comuni.json` letto da un altro progetto del repo | Path da `REPO_ROOT`; se manca, indirizzo omesso con avviso; il banco 15 usa il file reale e lo segnala. T6a potrà spostarlo in `site-renderer/data/`. |
| Parsing HTML con regex | Solo sull'output dei nostri componenti; banco con HTML sintetico ma fedele; `ponytail:` con il passaggio a un parser se l'output cambia. |
| Collisione con T0 e con i piani su build/deploy | Partenza dopo il commit di T0 (`schemas.ts` in comune); README §6: mai in parallelo con T2a/T5c su `build.ts`/`deploy.ts`. |
| L'hub non dice «ribuilda» quando si attiva il servizio | Lo dice il deploy rifiutato con messaggio chiaro; l'eventuale segnale nella UI arriva con T2b. |

## 10. Verifica finale (criteri del brief)

- Fixture: servizio spento → `dist` identica a quella di prima delle modifiche (F4, F6); attivo → robots con
  Sitemap, sitemap valida con URL = canonical, JSON-LD valido senza campi vietati, chiave IndexNow,
  `_headers` (F7); sospeso → invariato (F11).
- Ribuild senza cambi → `lastmod` invariati (F8); testo della home cambiato → `lastmod` aggiornato (F9);
  cambio di palette → nessun cambio (F10).
- Deploy rifiutato quando build e stato atteso non coincidono, accettato quando coincidono, senza wrangler
  (banco 3-6, F12).
- Renderer: `npm run build`, `npm run check` (solo l'errore noto di `registry.ts`), validatore sul blueprint,
  `test:visual`, `test:a11y` con lo stesso esito di prima. Editor: `npx tsc --noEmit`, `npm run build`,
  `test-fondamenta.ts` e i banchi esistenti verdi (M3).
- Escape del JSON-LD provato (F13).
- File toccati = §4; fixture rimossa; Cavaliere non ribuildato né toccato (F14).

## 11. Dubbi che richiedono una decisione

1. **Indirizzo non riconosciuto**: JSON-LD senza `address` con avviso (proposta) oppure build bloccata finché
   non si corregge `contact.address`?
2. **`image`**: hero come `og:image`, come dice il brief, oppure prima foto reale da `lavori.json` quando
   c'è? Proposta: foto reale, perché la hero può essere generata e `image` descrive l'attività.
3. **Clienti storici senza id mestiere** (Cavaliere compreso): `HomeAndConstructionBusiness` (proposta)
   oppure tipo scelto esplicitamente, ad esempio con una domanda nel mini-form T3?
4. **Servizi**: titoli visibili delle card Services (proposta) invece dei `servizi_atomizzati` di
   `contesto.json` letti alla lettera dal brief.
5. **E2E con rete**: la build con dominio della fixture crea un sito Umami di prova, cancellato in F14
   dall'eliminazione in editor, che chiama anche `rimuovi` su n8n per lo slug di prova. Accettabile?
   L'alternativa senza rete non prova il collegamento in `build.ts`.
6. **`_headers` su workers.dev**: prova su un worker di test senza dominio (deploy e poi `wrangler delete`)
   oppure verifica al primo deploy reale di Cavaliere insieme a Mattia?
7. **Gate su title, H1 e description**: fanno fallire la build (proposta) o sono solo avvisi?

### Decisioni dell'orchestratore (2026-09-14), applicate in fase 2

Prevalgono sul testo dei paragrafi precedenti dove divergono.

1. Indirizzo non riconosciuto: JSON-LD senza `address`, avviso registrato nella build, nessun blocco.
2. `image`: la prima foto reale di `lavori.json` (`https://<dominio>/media/<slug>/<file>`), mai la hero;
   senza foto reali niente `image` (resta il `logo`).
3. Tipo per i clienti senza id del mestiere (e per «altro»): tabella deterministica sulle parole di
   `contesto.json` `settore_normalizzato`, poi `HomeAndConstructionBusiness`. Nessuna scelta a mano.
4. Servizi: i titoli delle card Services visibili in home.
5. E2E con rete ammesso: il sito Umami di prova va cancellato verificando che l'id sia quello creato dalla
   prova; l'`umamiWebsiteId` di Cavaliere tolto dalla fixture prima di tutto (controllo bloccante).
6. `_headers` provato su un worker `zz-test-t1a` dell'account ConsulBuild (workers.dev), poi cancellato.
7. Title > 60, H1 ≠ 1, description assente o > 160: **avvisi** in `steps.build.fondamenta.avvisi`, mai
   blocchi. Bloccano solo gli errori tecnici: canonical ≠ URL della sitemap, JSON-LD assente in home, di un
   altro dominio, non valido o con campi vietati, pagina fuori forma cartella/index.html, file `traffico/`
   illeggibili. Di conseguenza `controllaPagina` restituisce `{ errori, avvisi }` e `cuociFondamenta`
   restituisce anche `avvisi`.
8. Stato del servizio letto solo con `leggiTraffico`/`fondamentaAccese` di `lib/traffico.ts` (firme
   verificate nel codice: `leggiTraffico(state: { traffico? })`, `fondamentaAccese(t: Traffico)`).
9. Nessun deploy su domini di clienti; Cavaliere non ribuildato né toccato.

Scostamenti di firma rispetto a §3, tutti conseguenza delle decisioni: `tipoSchema(mestiereId, settore)`
restituisce `{ tipo, fonte }`; `scriviDatiStrutturati(dirCliente, site, dominio, fileComuni)` legge da sé
brief, raw-submission, contesto e lavori; `indirizzoStrutturato(testo, comuni, cittaSito?)` (vedi
Calibrazione); in più `chiaviVietate(v)` esportata per banco e controlli. Lo schema è
`fondamenta: { dominio, avvisi? }`.

**Aperto**: la decisione 7 chiede di mostrare gli avvisi «dove il deploy mostra i motivi» (blocco
Pubblicazione, `components/pubblicazione-sito.tsx`). Quel file è fuori dal perimetro di §5: oggi gli avvisi
stanno nello stato (`steps.build.fondamenta.avvisi`) e nel log della build (righe «avviso: …» e conteggio in
«build ok»), non ancora nella UI. Serve l'ok per allargare il perimetro a quel componente (o rinviarlo a T2b).

**Aperti dalla revisione (fuori perimetro, serve l'ok di Mattia)**: l'interlock nuovo del deploy non ha
ancora i suoi specchi. `lib/catena.ts` `buildDaRifare` non rifà la build quando
`steps.build.fondamenta?.dominio` non coincide con `fondamentaAttese()`, quindi la catena si ferma al deploy
a ogni «Riprendi». `components/build-panel.tsx` `rebuildMotivi` non lo conta, quindi la primaria resta
«Ripubblica»/«Riprova la pubblicazione», che fallisce sempre. Il componente è client e non può importare
`lib/fondamenta.ts` (node:fs): `fondamentaAttese` va spostata in `lib/traffico.ts` o calcolata nella page.

## Calibrazione

Fase 3, 2026-09-14. Dati reali letti in sola lettura (i tre clienti in `out/`), fixture `zz-test-t1a`.

### Tipi schema.org

- Verificati su schema.org (HTTP 200 e pagina del tipo padre): i sottotipi di `HomeAndConstructionBusiness`
  sono Electrician, GeneralContractor, HVACBusiness, HousePainter, Locksmith, MovingCompany, Plumber,
  RoofingContractor. Usati: tutti tranne Locksmith e MovingCompany (nessun mestiere del form li richiede).
- `vatID`: schema.org chiede il prefisso nazionale («for example IT123456789») → `IT` + 11 cifre.
  `makesOffer` è di Organization (ereditato dal tipo). Esistono `Offer`, `itemOffered`, `Service`, `PostalAddress`.
- Mappa del form confermata (§2.6.1). `ristrutturazioni` → GeneralContractor: l'offerta del form
  (bagni, impianti, pavimenti, facciate, chiavi in mano) è coordinamento di più mestieri.
- Tabella del settore (inizi di parola, minuscole senza accenti): `edil`/`ristruttur`/`costruzion` →
  GeneralContractor; `idraul`/`termoidraul` → Plumber; `elettric` → Electrician; `imbianc`/`pittur`/`pittor`/
  `tinteggi` → HousePainter; `tett`/`copertur` → RoofingContractor; `climatizz`/`condizionat`/
  `riscaldament`/`termotecn` → HVACBusiness. Più tipi trovati → GeneralContractor se c'è, altrimenti
  generico. Solo a inizio parola: «architettura» non diventa RoofingContractor. Provata sugli esempi della
  skill context-enricher («Edilizia», «Impiantistica elettrica», «Serramenti») e sui tre clienti: tutti e tre
  «Edilizia» → GeneralContractor (due dal settore, uno dal mestiere `impresa-edile`).
- Rinviato: array di tipi dedotto dai lavori (idraulico con caldaie o pompe di calore →
  `["Plumber","HVACBusiness"]`). Nessun cliente idraulico oggi; da riprendere al primo.

### Campi del JSON-LD sui dati reali

| Cliente (forma) | Esito | Avvisi |
|---|---|---|
| Cavaliere (storico) | tipo dal settore, indirizzo ok, P.IVA ok, 5 servizi, logo = simbolo, image = foto reale; omesso sameAs (nessun social) | nessuno |
| Mattia Saggin (form nuovo, demo) | tipo dal mestiere, indirizzo ok, 5 servizi, sameAs | P.IVA che non passa il controllo → omessa |
| Costruzioni Generali (storico) | tipo dal settore, P.IVA ok, 3 servizi; omessi logo, image, sameAs | prima della calibrazione: indirizzo senza comune («via civico, CAP») → omesso |

**Calibrazione dell'indirizzo**: il terzo cliente scrive solo «via, CAP» e il comune compare nella città del
sito (`meta.city` «San Severo, Foggia», mostrata nel title). Regola aggiunta: se il testo non nomina un
comune con quel CAP, vale la città del sito se è un comune con **quel** CAP (CAP e città si confermano a
vicenda; la via è il testo prima del CAP). Il testo vince sempre sulla città. Con la regola il terzo
cliente ha l'indirizzo; «Foggia» nella stessa stringa non interferisce perché non ha quel CAP. Banco: tre
casi in linea + uno sul `comuni.json` reale.

**Correzione dalla revisione** (sostituisce il passo 3 di §2.6.2): il comune conta solo se è scritto
**attaccato al CAP** (in mezzo solo separatori o la sigla), cioè subito dopo (forma del form, che vince) o
subito prima con una via davanti (forma storica). Un nome altrove fa parte della via, anche se è un comune con lo stesso CAP: con «Via
Gessate 12, 20060 Masate (MI)» (Gessate e Masate condividono il 20060) usciva Gessate con via «Via», ora
esce Masate con «Via Gessate 12». «Via Vicenza 3, 36100» passa alla città del sito. Il nome più lungo vale
solo tra nomi annidati («San Martino» dentro «San Martino Canavese»). Sui tre clienti reali l'esito non cambia.

Telefono: `+39…` storico e numero nazionale del form (10 cifre da 3) riconosciuti. Nessun cliente con
social non valido; la regola (https sull'host della rete o suo sottodominio) resta com'è.

### Normalizzazione per l'hash di `lastmod`

- Home di Cavaliere reale (dominio vero, sito Umami vero, action del modulo e media con slug
  `cavaliere-build-srls`) contro la home della fixture (dominio di prova, altro sito Umami, slug
  `zz-test-t1a`): **stesso `testoIndicizzabile`, zero differenze**. Dominio, statistiche, modulo e path dei
  media non muovono `lastmod`.
- E2E: ribuild senza cambi → hash e sitemap identici (F8); cambio di una parola del sottotitolo hero → solo
  `index.html` e `sitemap.xml` cambiano, `lastmod` nuovo (F9); cambio dell'accent → cambiano le pagine per lo
  stile inline, sitemap identica (F10).
- Nel banco: stesso hash con class, hash `_astro`, style, script Umami, action, commenti, svg e spazi
  diversi; hash diverso per testo, alt, href, title, description e JSON-LD; `&` scritto dal renderer come escape
  unicode (backslash-u0026) = `&` letterale.
- Nessuna soglia da tarare: l'hash è esatto sul testo normalizzato. Limite noto: `aria-label`, `title` e
  `placeholder` non entrano (non sono contenuto principale per Google).

### Soglie dei controlli

Title 60 e description 160 = limiti Zod di `seoTitle`/`seoDescription`, così l'avviso parla la stessa lingua
della scheda Copy («SEO title»/«SEO description»). Sui dati reali: un solo avviso, il title di 63 caratteri
del terzo cliente (fallback senza SEO title), coerente con il piano.

### `_headers` su workers.dev (decisione 6)

Worker di prova `zz-test-t1a` (assets minimi: `index.html` di prova, `robots.txt`, `_headers`; nessun
contenuto di clienti), deploy con wrangler 4.108 il 2026-09-14: `_headers` non caricato come asset;
`curl -sI` su `https://zz-test-t1a.<account>.workers.dev/` e `/robots.txt` → `x-robots-tag: noindex`;
`/_headers` → 404. Worker cancellato (`wrangler delete`), poi 10007 «does not exist» e 404 sull'host.
Resta da verificare al primo deploy reale con dominio: sul dominio l'intestazione deve essere **assente**.

### Durante lo sviluppo

- Il file di escape del renderer non può contenere U+2028/U+2029 letterali (terminano la regex e la build
  fallisce): la classe usa `\p{Zl}\p{Zp}` con flag `u`.
- Ordinamenti per codepoint (non `localeCompare`): sitemap e registro identici su ogni macchina.
- Controllo aggiunto fuori dal piano, sulla fixture: dopo una build con fondamenta, una build a servizio
  spento (stato messo a mano nella fixture) non lascia sitemap, chiave, `_headers` né JSON-LD (Astro svuota
  la dist) e `robots.txt` torna ai 23 byte statici.

## Verifica

Fasi 4-5, 2026-09-14, su `10692a0` (collaudo finale: suite completa, criteri del brief uno per uno, E2E
sulla fixture con l'editor in dev su :3311).

### Suite

| Comando | Esito |
|---|---|
| editor `npx tsc --noEmit` | exit 0 |
| editor `npm run build` | exit 0, route compilate (`/traffico`, `/traffico/[slug]` comprese) |
| `scripts/test-fondamenta.ts` | 102 passati, 0 falliti |
| `scripts/test-traffico-stato.ts` | 58 passati, 0 falliti |
| `scripts/test-stati.ts` | 30 passati, 0 falliti |
| `scripts/test-portafoglio.ts` | 43 passati, 0 falliti |
| `scripts/test-demo.ts` | 19 passati, 0 falliti |
| `scripts/test-import-form.ts` | ✓ scenario completo (import, foto senza metadati, file illeggibili, pulizia) |
| `scripts/test-legale-gates.ts` · `test-logo-gates.ts` · `test-metadati-foto.ts` | 67/0 · 75/0 · ✓ |
| `scripts/parity-copy.ts` | «Parity OK: editor e assembler concordano» |
| renderer `npm run build` | exit 0, 18 pagine |
| renderer `npm run check` | 1 errore, l'atteso di `registry.ts` (8 tipi senza componente) |
| validatore sul blueprint | «OK — site.json valido · 12 sezioni · preset "meridian"» |
| renderer `npm run test:visual` | 28 passed (snapshot invariati) |
| renderer `npm run test:a11y` | 14 passed |

### Criteri del brief

Fixture `out/zz-test-t1a` rifatta da zero (F1-F3: copia di Cavaliere senza `dist`, `.wrangler`,
`wrangler.jsonc`, `logs`; id Umami, integrazioni, deploy e infra tolti prima del dominio di prova, `grep` = 0).

- **Spento = dist di prima, byte per byte.** «Prima» ricostruito senza toccare il repo: worktree temporaneo
  su `cb80666` (ultimo commit prima di T1a; da lì in `site-renderer` cambiano solo i tre file del piano),
  `astro build` con le stesse env della build dell'editor (`SITE_JSON`, `SITE_URL`, `UMAMI_*`, `FORM_ACTION`)
  e rimozione di `/anteprima*`. `diff -r` prima (cb80666) ↔ stessa invocazione su HEAD: **vuoto**. `diff -r`
  prima ↔ `dist` della build dell'editor a servizio spento: vuoto a parte due stub `content-assets.mjs` e
  `content-modules.mjs` (`export default new Map();`) che `astro build` lanciato a mano dalla shell scrive
  in ogni versione, cb80666 compreso, e la build dell'editor no: dipendono dall'invocazione, non da T1a.
  `robots.txt` = 23 byte statici; nessuna cartella `traffico/`; `client.json` senza `steps.build.fondamenta`.
- **Attivo** (route `traffico` → build): `diff -rq` con lo spento elenca solo `index.html`, `robots.txt`,
  `sitemap.xml`, `<chiave>.txt`, `_headers`; privacy, termini, grazie e asset identici; `index.html` differisce
  **solo** per il blocco JSON-LD. `robots.txt` e `_headers` uguali carattere per carattere al §2.5/§2.9;
  `xmllint --noout` ok, un solo `<loc>` = canonical della home, `lastmod` W3C. JSON-LD: un blocco, parse ok,
  `GeneralContractor` (dal settore), `@id`/`url` sul dominio, `address` con i 5 campi, `vatID`, `telephone`,
  `email`, `logo` (simbolo) e `image` (foto reale) assoluti, 5 `makesOffer`; scansione ricorsiva senza chiavi
  vietate; cifre di telefono e P.IVA e CAP presenti nel testo della pagina. `<chiave>.txt` = `indexnow.json`,
  senza newline; `traffico/lastmod.json` con `/`; `steps.build.fondamenta.dominio` = dominio di prova, nessun
  avviso. Log: le due fasi, «JSON-LD: GeneralContractor (settore «Edilizia») · indirizzo ok · P.IVA ok ·
  5 servizi · omessi: sameAs (nessun social)», «sitemap: 1 URL · lastmod aggiornato per /».
- **Ribuild senza cambi** (F8): `diff -r` vuoto, registro byte-identico, log «lastmod invariato».
- **Testo della home cambiato** (F9, una parola del sottotitolo hero): cambiano solo `index.html` e
  `sitemap.xml`, `lastmod` di `/` nuovo nel registro e nella sitemap.
- **Palette cambiata** (F10): cambiano le quattro pagine (stile inline), `sitemap.xml` identica, «lastmod invariato».
- **Sospeso** (F11): `diff -r` con F10 vuoto.
- **Ritorno a spento** (fuori dal piano; stato messo a mano nella fixture perché la route ammette da sospeso
  solo la riattivazione), con copy e palette ripristinati: `diff -r` con la dist spenta di partenza **vuoto**,
  quindi Astro toglie sitemap, chiave, `_headers` e JSON-LD e `client.json` perde `fondamenta`.
- **Interlock** (F12, script sullo stato reale della fixture, nessuna chiamata alla route di deploy):
  stato coerente → `null`; senza `traffico` → «contiene le fondamenta»; senza `fondamenta` cotte → «senza le
  fondamenta»; dominio diverso → messaggio con i due domini; percorso demo senza fondamenta → `null`. Nel
  codice il controllo precede `writeJson(wrangler.jsonc)` e `wrangler deploy`.
- **Escape** (F13, `astro build` diretto): nome con `</script><script>alert(1)</script>&B` e U+2028/U+2029 →
  l'HTML non contiene la sequenza né i separatori letterali, `JSON.parse` restituisce il nome originale;
  senza `DATI_STRUTTURATI_JSON` nessun `ld+json`; privacy, termini e grazie mai.
- **Pulizia** (F14): fixture eliminata dall'editor (`DELETE` col nome esatto, `{"ok":true}` senza avvisi:
  cartella, sito Umami di prova — id verificato uguale a quello creato dalla prima build della prova — e
  `rimuovi` n8n dello slug di prova); `public/media/zz-test-t1a` rimossa; worktree temporaneo rimosso;
  `ls out/` = i 3 clienti; hash di `cavaliere-build-srls/client.json` uguale a F1; `find -newer` sul
  marcatore vuoto: Cavaliere non ribuildato né toccato.

### File toccati vs §4

Commit del piano: `78ddf16` (fondamenta.ts, banco), `29ea851` (banco, Base.astro, loadSite.ts, index.astro),
`bd1578d` (build.ts, deploy.ts, fondamenta.ts, schemas.ts), `93ad659` e `10692a0` (DEBUG.md, piano, deploy.ts,
fondamenta.ts, banco), `e44fb95` (piano, build.ts, fondamenta.ts, banco) + chiusura (piano, README, handoff).
Tutti dentro §4/§5: nessun file fuori perimetro. Nessuna modifica del piano rimasta non committata (le
modifiche aperte nel working tree, `factory/assignments.json` e i documenti di T4, sono di altre sessioni).
`d0c473b` e `9b03d56`, intercalati nella storia, sono il lavoro sulle foto del form (T3), non di T1a.

### Revisione finale

Diff riletto riga per riga (build, deploy, schemas, renderer, `fondamenta.ts`): nessun difetto nuovo. A
servizio spento nessun ramo nuovo gira (`fondamenta` null, env assente, nessun file scritto); una cottura
fallita esce prima del `patchClientState`, quindi la build resta non confermabile come le altre build fallite.
Restano aperti, fuori perimetro e già descritti al §11: avvisi nel blocco Pubblicazione, e gli specchi
dell'interlock in `lib/catena.ts` (`buildDaRifare`) e `components/build-panel.tsx` (`rebuildMotivi`).
