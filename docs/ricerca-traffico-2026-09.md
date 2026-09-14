# Come portare traffico ai siti dei clienti, senza lavoro manuale — ricerca del 2026-09-14

Sostituisce, per la parte traffico, `docs/archivio/ricerca-crescita-siti-2026-09.md` (07/09) e
integra i digest del 03/09 (ora in `~/knowledge/seo/digest/`). Vincoli del committente: soluzioni
integrate nella pipeline (deploy, n8n, editor), zero lavoro manuale ricorrente per l'agenzia, la
scheda Google Business **non** è una leva ammessa, budget ≤ 200 €/mese totali e solo con risultati
verificati, priorità a gratuito e open source.

Gradi: **[fatto]** = fonte primaria (documento Google, atto processuale, sorgente del leak, dato
ufficiale) o studio con metodo dichiarato; **[settore]** = esperienza di practitioner o survey di
esperti; **[contestato]** = fonti in disaccordo o solo interpretazione. Dove un'evidenza è solo USA
lo dico. Le fonti primarie sono archiviate **verbatim** in `~/knowledge/seo/fonti/` (Quality Rater
Guidelines 09/2025, 14 atti di USA v. Google, estratti del leak Content Warehouse); i rapporti
grezzi delle 15 ricerche di questa sessione in `~/knowledge/seo/ricerche-2026-09-14/`.

## 0. In dieci righe

1. Google ranka con tre blocchi (fonte: verbali DOJ 2025 con HJ Kim e Pandu Nayak): **T\*** la
   rilevanza (Anchors, Body, Clicks), **Navboost** la tabella dei clic degli ultimi 13 mesi,
   **Q\*** la qualità «largamente statica e legata al sito, non alla query», con PageRank in
   ingresso. Un sito nuovo **non è nella tabella Navboost**: si gioca tutto su T\* e Q\*.
2. Il «sandbox» non esiste come quarantena: `hostAge` serve a «sandbox fresh spam». Il freno non è
   l'età, è **l'assenza di segnali**; su dominio nuovo il costo di sembrare spam è più alto.
3. Le Quality Rater Guidelines dicono testualmente che una piccola impresa locale con poca presenza
   web «non è indicativo di alta o bassa qualità». Il rischio «Lowest» sono le informazioni
   aziendali ingannevoli, i profili di persone finti con immagini AI e il contenuto prodotto in
   scala senza valore.
4. Il cold start ha una forma bimodale: delle pagine che entrano in top 10 entro un anno, il 41 %
   ci arriva nel primo mese (Ahrefs 2025). **Una query locale si testa in 4-8 settimane**: se non
   dà impression, si cambia query, non si aspetta.
5. Per «servizio + comune piccolo» bastano 0-5 domini referenti; per «servizio + capoluogo» servono
   link locali che la pipeline non può procurare: quella fascia va dichiarata fuori portata.
6. Il fattore n. 1 dell'organico locale è **una pagina per servizio** (survey Whitespark 2026,
   47 esperti), poi rilevanza geografica e link interni. È tutto dentro il `site.json`.
7. Le pagine per comune sono legittime solo con **dati locali reali**: ISTAT (epoca degli edifici),
   zona climatica, zona sismica, quotazioni OMI, distanza dalla sede. Sono open data gratuiti e la
   pipeline può usarli per ogni comune d'Italia; il gate anti-doorway è deterministico.
8. La misura è gratuita: Search Console + Bing Webmaster verificati via API al deploy, IndexNow,
   PageSpeed. È il **volano**: le query con impression e senza pagina generano la proposta della
   pagina successiva.
9. Fuori dal sito il software può solo preparare kit a un click (directory italiane, portfolio
   dell'agenzia, QR e firma e-mail): il link locale resta il collo di bottiglia non automatizzabile.
10. Aspettative oneste da mettere nel contratto: nei primi 90 giorni il sito è un convertitore del
    passaparola, non un canale di acquisizione; l'organico arriva dal mese 2-3 sulle query facili.

## 1. Metodo

Quattro ondate: 10 ricerche in ampiezza (ranking, fiducia, dominio, SERP italiane, contenuti e
open data, off-page, canali, competitor, strumenti, legale), 5 in profondità sulle fonti primarie
(atti DOJ e leak letti alla lettera, cold start, prova pratica degli open data, analisi tecnica dei
siti che si posizionano, verifiche su docs Cloudflare/Microsoft/Apple/Google), lettura diretta delle
Quality Rater Guidelines con pypdf, sintesi. Le SERP di Google non erano interrogabili dal browser
(CAPTCHA immediato) né da Bing/DuckDuckGo via fetch: la composizione reale delle SERP italiane
resta da misurare con DataForSEO (§4.3). Norme verificate con il server legal-it (19/19).

## 2. Come ranka Google, dalle fonti primarie

### 2.1 L'architettura (verbali del processo USA v. Google, fase remedies 2025)

- **ABC**: «Anchors (A) - a source page pointing to a target page (links). Body (B) - terms in the
  document. Clicks (C) - historically, how long a user stayed at a particular linked page before
  bouncing back to the SERP» (PXR0356, HJ Kim, 18/02/2025, p. 1). **T\*** «combines (at least)
  these three signals in a relatively hand-crafted way». [fatto]
- I bucket di alto livello sono **ABC-topicality, Navboost, Quality** (p. 2). **Q\*** «page quality
  (i.e., the notion of trustworthiness) is incredibly important», «largely static and largely
  related to the site rather than the query»; «PageRank […] is used as an input to the Quality
  score»; esiste un «(popularity) signal that uses Chrome data» (nome oscurato). [fatto]
- **Navboost** è «just a big table» query→documento (Lehman, 20/09/2023), su 13 mesi di clic
  (18 prima del 2017), affettata per paese, lingua, dispositivo e **`locationId` di metro/città**
  (leak, `QualityNavboostCrapsFeatureCrapsData`). Nayak: «there might be lots of documents that
  don't have clicks», «navboost is not the only factor». **Glue** è «just another name for
  navboost that includes all of the other features on the page» (Tr. 6403). [fatto]
- I clic non sono l'obiettivo: «Showing results that users want to click is NOT the ultimate goal
  of web ranking» (UPX0192); «clicks are easily manipulated and are a poor proxy» (PXR0357);
  «the association between observed user behavior and search result quality is tenuous»
  (UPX0204). Google li usa, ma li filtra e li combina. [fatto]
- Il giudice ha accertato: «Navboost remains one of the most power[ful] ranking components
  historically» (Opinion 05/08/2024, FOF ¶102). [fatto]

### 2.2 Il leak Content Warehouse (2024), alla lettera

Il mirror hexdocs è ancora online e il tarball dei sorgenti è scaricabile: le descrizioni sotto sono
copiate dai file `.ex` (in `~/knowledge/seo/fonti/google-content-warehouse-leak-2024-attributi.md`).

| Attributo | Testo | Cosa implica per noi |
|---|---|---|
| `hostAge` | «earliest firstseen date of all pages in this host/domain. These data are used in twiddler to **sandbox fresh spam** in serving time» | nessuna quarantena generale; pubblicare presto fa partire l'orologio; non assomigliare a spam |
| `siteAuthority` | «converted from quality_nsr.SiteAuthority, **applied in Qstar**» | esiste un'autorità di sito, alimentata da PageRank (link reali) |
| `clutterScore` | «Delta site-level signal in Q\* penalizing sites with a large number of distracting/annoying resources» | l'unico segnale di Q\* con descrizione operativa: pagine leggere, zero script inutili, niente interstiziali. Il renderer lo controlla al 100 % |
| `chromeInTotal` | «Site-level Chrome views» | il traffico reale (anche non da Google) è misurato a livello di sito |
| `impressions` (NsrData) | «Site-level impressions» | comparire conta anche senza clic |
| `titlematchScore` | «Titlematch score of **the site**» | i title si progettano su tutto il sito insieme: mestiere + comune reale |
| `localityScore`, `brainloc` | «locality component of the LocalAuthority signal»; «location information for the document» (top cities) | la geografia del documento è indicizzata: zona servita esplicita e coerente |
| `exactMatchDomainDemotion` | «converted from QualityBoost.emd.boost» | il dominio exact-match («ristrutturazioni-monza.it») ha una demotion dedicata: dominio brand |
| `smallPersonalSite` | «Score of small personal site **promotion**» | non è una penalità per i siti piccoli |
| `OriginalContentScore` | «Only pages with little content have this field» | una pagina corta ma originale è contemplata: non gonfiare il testo |
| `siteFocusScore`, `siteRadius` | concentrazione tematica del sito | un sito di un mestiere in una zona è focalizzato per costruzione; il leak **non** dice che sia un boost |
| `goodClicks`, `badClicks` | **descrizione vuota** | tutto ciò che si legge sul «dwell time» è ricostruzione |

Cosa **non** è scritto in nessuna fonte: pesi, soglie, durate. Nessun documento primario descrive
una sandbox per tutti i domini nuovi; la testimonianza di Lehman (pp. 1805-1838) è oscurata.

### 2.3 Le Quality Rater Guidelines (PDF ufficiale, 11/09/2025, letto con pypdf)

- «Reputation research is required for all PQ rating tasks» e si fa cercando `[nome -site:dominio]`,
  `[nome reviews -site:dominio]`; le fonti indipendenti valgono, «official social media pages […]
  would not be considered independent». [fatto]
- **Correzione del rapporto del 07/09**: «small websites may have little or no reputation
  information. **This is not indicative of high or low quality.** Many small local businesses or
  community organizations have a small "web presence" and rely on word of mouth» (§3.3.5). [fatto]
- «Be skeptical of claims that websites make about themselves»; per i siti che raccolgono dati
  personali servono contatti estesi (il nostro modulo li raccoglie: nome, sede, telefono, e-mail
  vanno sempre in chiaro). [fatto]
- Rating **Lowest**: «deceptive business information» (sede fisica dichiarata e inesistente),
  «"fake" owner or content creator profiles» con «AI generated images», credenziali false;
  «scaled content abuse» = «many pages […] with no original content or added value […] no matter
  how they are created», «even if you are unsure of the method of creation». [fatto]
- YMYL: la ristrutturazione non è un topic «clear YMYL» (la tabella cita salute, finanza,
  sicurezza); un sito vetrina che presenta l'azienda non dà consigli tecnici. Standard E-E-A-T
  medio: la T di Trust è «the most important member». [fatto per la tabella; settore per la
  collocazione dell'edilizia]

### 2.4 Dieci implicazioni per un micro-sito nuovo

1. Navboost non si attiva: la partita iniziale è T\* (body e anchor onesti) + Q\* + segnali locali.
2. Q\* è l'unico blocco costruibile da subito perché di sito e indipendente dalla query: pulizia
   tecnica (`clutterScore`), coerenza tematica e geografica, title coerenti su tutto il sito,
   PageRank da link reali.
3. Il dominio conta due volte: brand, mai exact-match; pubblicato presto per far partire `hostAge`.
4. Con 1-8 pagine il sito è focalizzato per costruzione: non servono pagine di riempimento.
5. Le impression contano anche senza clic: comparire su query facili è già un segnale.
6. Il traffico reale non-Google (furgone, cartello di cantiere, WhatsApp, firma e-mail) è misurato
   a livello di sito (`chromeInTotal`); che muova il ranking non-brand **non è provato** (§3.4).
7. Mai falsificare clic: `voterTokenCount` (utenti distinti minimi) e `unscaledIpPriorBadFraction`
   (prior per IP) esistono per questo; il test Sterling Sky × Fishkin (06/2024) finì sotto la
   posizione di partenza.
8. Per i rater conta chi è responsabile del sito: nome, sede, P.IVA, persone reali (mai volti AI).
9. La geografia va detta in chiaro: comuni serviti, sede, NAP coerente (rater e `brainloc`).
10. Il contenuto in scala senza valore è Lowest anche se non si sa come è stato prodotto: il
    differenziale legittimo sono dati reali e foto reali del cliente.

## 3. Il cold start: cosa succede davvero nei primi 180 giorni

| Quando | Cosa succede | Evidenza |
|---|---|---|
| Giorni 0-3 | nulla se nessuno linka il dominio: la sitemap è l'unico canale di scoperta | [fatto] Google, Sitemaps overview (agg. 12/2025) |
| Giorni 1-30 | indicizzazione «da diverse ore a diverse settimane»; indicizzato ≠ posizionato | [fatto] Mueller 2021 |
| Settimane 1-4 | il sito compare sul nome dell'azienda e su long-tail ultraspecifica | [settore] |
| Mesi 1-3 | Google «stima» i segnali che non ha, le posizioni oscillano | [fatto] Mueller 2020, 2021 |
| Mesi 2-6 | primi clic su query a bassa competizione: «servizio + comune piccolo», domande su prezzi, permessi, tempi | [fatto] Ahrefs 12/2023 |
| Mesi 3-6 | «servizio + capoluogo»: ancora niente senza link locali | [settore] Local Search Forum |
| Mese 12 | solo 1,74 % delle pagine nuove entra in top 10 (6,11 % filtrando contenuti non vuoti); **il 40,82 % di quelle che entrano lo fa nel primo mese** | [fatto] Ahrefs 05/2025, 2 M URL |
| Sempre | il 96,55 % delle pagine indicizzate non riceve traffico; la pagina media in posizione 1 ha 5 anni | [fatto] Ahrefs |

**Regola operativa**: il test di una query locale si esaurisce in 4-8 settimane. Fasce: bassa
(«imbianchino Cologno Monzese», KD 0-5, top 10 spesso senza backlink) 4-10 settimane; media
(«ristrutturazione appartamento Monza», con directory forti) 4-9 mesi e qualche link locale; alta
(«ristrutturazione casa Milano») fuori portata nei primi 180 giorni senza link o PR. [settore]

### 3.1 Quanti link servono

- Il 55 % delle pagine non ha domini referenti; delle ~20 milioni di pagine senza link
  nell'indice Ahrefs solo 2.997 superano 1.000 visite/mese: con zero link si vince piccolo, solo su
  KD a una cifra. [fatto] Ahrefs 12/2023
- La Keyword Difficulty di Ahrefs è la media (trimmed) dei domini referenti della top 10: **KD 0-5
  ⇒ 0-5 domini referenti bastano**; KD 10-20 ⇒ 10-25. Non esiste uno studio pubblicato per fascia
  di KD: è derivato dal metodo. [fatto per il metodo]
- Nel local organic i link occupano le posizioni 3, 5, 10, 12, 13 della classifica Whitespark 2026:
  secondo blocco dopo la struttura per servizio. [settore] Il link locale e di settore
  (associazione, fornitore, testata locale) pesa più di un link generalista. È il collo di
  bottiglia non automatizzabile.

### 3.2 Acceleratori provati e cosa non accelera

| Azione | Evidenza | Automazione |
|---|---|---|
| sitemap + verifica Search Console al deploy | [fatto] caso d'uso ufficiale «sito nuovo con pochi link» | sì |
| una pagina per ogni servizio | [fatto] Whitespark 2026, fattore n. 1 local organic (210) | sì, blueprint |
| comune/quartiere espliciti nei contenuti | [fatto] fattore n. 2 (190) | sì, contesto.json |
| keyword in title, H1, H2 della pagina servizio | [fatto] fattori 4 e 8 | sì |
| link interni con anchor descrittivo | [fatto] fattori 6 e 19; Zyppy (23 M link, dati GSC): un anchor interno exact-match ≈ 5× traffico, ottimo 40-44 link in entrata | sì, dal site.json |
| primi link locali e di settore | [fatto] fattori 3, 5, 12, 13 | **no** (relazione umana; la pipeline prepara il kit, §6.4) |
| title e description curati (CTR legittimo) | [fatto] fattore 20 | sì |
| Indexing API fuori scope | [fatto] solo JobPosting/BroadcastEvent; Mueller 05/2025: «spammers misuse the Indexing API» | **vietato** |
| request indexing in massa, ping, «instant indexing» | [fatto/settore] quota ~10/giorno, ping deprecato | inutile |
| segnali social | [fatto] Google: non sono fattore | no (servono al passaparola) |
| manipolazione del CTR | [fatto] Sterling Sky × Fishkin 06/2024: salita, poi caduta sotto il punto di partenza | **vietato** |

### 3.3 Aspettative da mettere nero su bianco all'onboarding

Settimana 1-2: il sito si trova cercando il nome. Mese 1: prime impression, clic da zero a qualche
decina (normale). Mesi 2-3: primi clic su «servizio + comune»; è il momento di misurare, non di
giudicare. Mesi 4-6: consolidamento sulle query facili; capoluogo fuori portata senza link.
Mai promettere posizioni, tempi, lead: «no one can guarantee a #1 ranking on Google» (Google, *Do
you need an SEO?*). Promettere ciò che controlliamo: indicizzato entro X giorni, una pagina per
servizio, Search Console attiva e leggibile, velocità, ogni contatto tracciato. Nei primi 90 giorni
il sito è un **convertitore** del passaparola; l'organico è il secondo stadio.

### 3.4 Ricerche di brand e traffico diretto: cosa è provato

Google usa i clic (Navboost) e misura le visite Chrome a livello di sito [fatto]. Che *generare*
ricerche di marca alzi il ranking non-brand **non è dimostrato**: le evidenze sono correlazionali
(Capper/Moz nega la causalità; Semrush 2017 contestato; Ahrefs 2025 con branded mentions 0,664 e
branded search 0,392 riguarda gli AI Overview, non l'organico). Per un artigiano i volumi sono
comunque troppo bassi. Restano decisivi per due motivi non algoritmici: il passaparola atterra sul
sito invece che su Facebook, e la query di marca è l'unica che il sito vince nel mese 1. Requisito:
un **nome d'uso univocamente cercabile** e identico su furgone, cartelli, preventivi e sito.

## 4. SERP italiane: cosa sappiamo e cosa manca

### 4.1 Misura indicativa (8 query, motore aggregato: non è la SERP Google)

Sulle query verticali («ristrutturazione bagno Monza», «cappotto termico Treviso») dominano le
**imprese locali** (7 e 4 su 10, nessun portale in cima); sulle query generiche («impresa edile
[città]») prevalgono portali e directory (ProntoPro, Instapro, Edilnet, PagineGialle, Virgilio);
sotto una soglia di popolazione (Sandrigo, 7.500 ab.) nessuna impresa con sito proprio: solo
directory e Facebook. Composizione approssimativa: imprese 55-60 %, portali 30-35 %. [settore,
campione piccolo, senza local pack e ads]

Dieci siti di imprese che compaiono: età da meno di 3 anni (mediolanumristrutturazioni.it, 2023) a
20 (campeol.it, 2005); 3 su 10 **senza JSON-LD**; title con refusi e keyword stuffing; almeno 5 su
10 con servizio o città nel dominio (per «imbianchino Vicenza» tre exact-match di imprese diverse);
un caso programmatico (perinotto.com, sitemap piatta da 1.035 URL servizio×città). Ipotesi da
verificare: la coda lunga «servizio specifico + comune medio» è il terreno vincibile; l'età non
è decisiva da sola; il JSON-LD non è prerequisito.

### 4.2 Analisi tecnica dei siti che si posizionano

*In arrivo dall'ondata 2 (analisi di 25 siti: struttura, pagine per servizio/città, età, schema,
velocità, similarità delle pagine città di perinotto.com). Sezione da completare.*

### 4.3 Il campione vero, quando c'è l'account DataForSEO

Disegno pronto: 8 mestieri × 12 comuni (4 piccoli, 4 medi, 4 grandi, Nord/Centro/Sud) × 4
modificatori (base, «vicino a me», «preventivo», «costo») = 384 query, circa 1 $ di API. Per ogni
SERP: local pack, AI Overview, ads/LSA, 10 organici classificati (portale / directory / impresa),
e per ogni impresa età, pagine, struttura, schema. Serve solo la chiave nel Keychain.

## 5. Competitor e agenzie: cosa copiare, cosa evitare

- **Italia**: MiniPage (34 €/mese), Sitiamo (29,90), Sito Facile (19,90-49,90 o una tantum),
  SitoAbbonamento (49), Italiaonline promettono «SEO» ma nessuno descrive un motore di traffico;
  solo Italiaonline ha un asset di distribuzione proprio (la directory). Recensioni troppo poche
  per misurare il churn. Nessun sito cliente ispezionabile: buco da colmare a mano. [fatto per i
  prezzi]
- **USA/UK su scala** (Townsquare Interactive, Hibu, Thryv, Scorpion, Yodle): bundling sito + SEO +
  ads senza verifica indipendente, e alla disdetta il cliente scopre di non possedere sito e
  dominio (Trustpilot 1,7/5, 46 reclami BBB per Townsquare; il «Landlord Trap» di Scorpion).
  Angi/HomeAdvisor: 7,2 M$ (2023) e 2,95 M$ (2025) di sanzioni FTC per lead gonfiati. Thryv ha
  perso il 17 % dei clienti legacy anche convertendoli gratis. [fatto]
- **Playbook 2026 delle agenzie per contractor** (Hook, RYNO/Blue Corona, DaNetwork): GBP al
  100 % (fuori scope per noi), location page partendo da 10-20 e scalando solo se validate («la
  maggioranza delle implementazioni a scala viene penalizzata»), LSA a ~53 $/lead, recensioni come
  infrastruttura, 60-90 giorni per i primi risultati, misura su chiamate e indicazioni, mai
  «prima pagina garantita». [settore]
- **Casi finiti male**: 800+ siti deindicizzati per scaled content abuse (2024), PBN colpite
  dall'update di agosto 2025, regola FTC sulle recensioni false (10/2024), AGCM 4 M€ a Trustpilot
  (03/2026), L. 34/2026 sulle recensioni. [fatto]
- **Community** (Indie Hackers, «I hired 10 agencies»): su 10 agenzie di local SEO 1 sola ha
  funzionato; le altre applicavano template ignari del mercato locale. Il gap dichiarato dagli
  sviluppatori è «costruiamo siti veloci per PMI che poi non hanno traffico».
- **Per ConsulBuild**: trasparenza sulla proprietà di sito e dominio come argomento commerciale;
  misura su contatti e non su posizioni; pagine in più solo se validate; mai garanzie.

## 6. Le leve, dal base all'avanzato

Ogni riga: effetto atteso · evidenza · automazione (dove nella pipeline) · costo mensile.

### 6.1 Livello 0 — Fondamenta e sensori (tutto al deploy con dominio; costo 0)

| Leva | Effetto | Evidenza | Automazione | Costo |
|---|---|---|---|---|
| `sitemap.xml` con `lastmod` reali + `robots.txt` allow-all (anche ai crawler AI) | scoperta del sito nuovo senza link | [fatto] Google | build Astro (`@astrojs/sitemap`) | 0 |
| Search Console verificata via **Site Verification API** (service account) con TXT creato dall'**API Cloudflare DNS**, poi Sitemaps API submit | sensore query/impression/clic; URL Inspection 2.000/giorno | [fatto] docs Google | `lib/deploy.ts`, due API combinate, da prototipare | 0 |
| **IndexNow**: file `{key}.txt` alla radice + POST a `api.indexnow.org` a ogni deploy (max 10.000 URL); Crawler Hints Cloudflare attivo sulla zona | Bing/Copilot/ChatGPT indicizzano subito | [fatto] docs Bing/Cloudflare; su Workers Static Assets «non documentato» | deploy | 0 |
| Bing Webmaster Tools: verifica CNAME via API Cloudflare + `VerifySite`, `SubmitUrlBatch` (500 URL/batch), keyword stats | secondo sensore; 4,8 % del mercato IT ma è l'indice di ChatGPT | [fatto] docs Microsoft; 1 API key agenzia per tutti i siti | deploy | 0 |
| PageSpeed Insights + CrUX API dopo ogni deploy | Core Web Vitals e `clutterScore` sotto controllo | [fatto] quote 25.000/giorno (da confermare in console), 150 QPM | deploy | 0 |
| JSON-LD `Organization`/`HomeAndConstructionBusiness` + `BreadcrumbList`, `sameAs` | chiarezza di entità; **nessun effetto di ranking** dichiarato; FAQ e HowTo rich result non esistono più | [fatto] Google; FAQ rimossi 2023/05-2026 | renderer, da site.json | 0 |
| title di sito coerenti «mestiere + comune» (non liste di keyword), H1 unico, primo paragrafo che dice chi/cosa/dove | `titlematchScore` è di sito; fattori 4 e 8 | [fatto] leak + Whitespark | skill copywriter (già «servizio + città») | 0 |
| NAP, P.IVA, sede, persone reali in chiaro; mai volti generati | requisito dei rater; Lowest per profili finti | [fatto] QRG | renderer + gate (già legale) | 0 |
| pagine leggere, nessuno script di terze parti non necessario, niente interstiziali | `clutterScore` (unico segnale Q\* operativo) | [fatto] leak | già così; gate Lighthouse nella build | 0 |

### 6.2 Livello 1 — Da one-page a sito strutturato (la leva organica n. 1)

| Leva | Effetto | Evidenza | Automazione | Costo |
|---|---|---|---|---|
| **una pagina per macro-servizio** (3-8) da `macro_categorie` del contesto | fattore n. 1 local organic | [fatto] Whitespark 2026 (210) | pipeline: nuovi slot, stesso schema/registry | 0 |
| **pagina «Zone servite»** unica con tutti i comuni del form, distanza e tempo dalla sede (OSRM) | rilevanza geografica senza doorway | [fatto] fattore n. 2; [settore] consenso LSF | pipeline + OSRM self-hosted | 0 |
| **pagine «Lavori»** con foto reali (≥3 foto per cantiere), comune e descrizione | «story content» batte il testo generico; unico caso quantificato (+186 % lead, effetto-pacchetto) | [settore] Sterling Sky | pipeline dalle ≤15 foto del form | 0 |
| **link interni** con anchor descrittivo, ogni pagina a ≤2 clic dalla home, ≥2 link in entrata | ≈5× traffico con anchor interno esatto | [fatto] Zyppy | assembler | 0 |
| sezioni **answer-first** (domanda → risposta → prova), «chi/cosa/per chi/dove» ripetuto con coerenza, `lastmod` onesto | citazioni AI Overview/ChatGPT; word count irrilevante | [fatto] Ahrefs, digest geo-aeo | skill copywriter | 0 |
| FAQ reali (permessi CILA/SCIA, tempi, garanzie), non duplicate su ogni pagina | AI Overview su domande; boilerplate escluso dal gate | [settore] | pipeline | 0 |
| pagine ibride «quanto costa X a [città]» **solo con fasce di prezzo reali del cliente** | AI Overview 83-97 % su query di costo | [fatto/settore] Seer via fonti secondarie | form: campo facoltativo «prezzo da», mai inventato (§9) | 0 |
| componenti mancanti già nello schema: `Guarantees`, `Certifications`, `BeforeAfter`, `Incentives` | conversione e fiducia; niente ranking | [settore] | renderer (4 tocchi) | 0 |

### 6.3 Livello 2 — Pagine per comune con dati reali (avanzato, con gate)

Principio: **una pagina dedicata solo dove esistono materiale reale e dati locali**; gli altri comuni
vivono nella pagina «Zone servite». Tipicamente 2-6 pagine-comune per cliente, 8-20 pagine totali.

Dati locali automatizzabili per ogni comune d'Italia (open data, costo 0):

| Dataset | Fatto in pagina (esempio) | Licenza | Stato |
|---|---|---|---|
| ISTAT censimento edifici per epoca di costruzione | «A Cologno Monzese il 62 % degli edifici residenziali è del pre-1980 (ISTAT)» | CC-BY | comunale certo per il 2011; 2021 da verificare tavola per tavola |
| DPR 412/93 zona climatica e gradi giorno | «zona E, 2.404 gradi giorno: riscaldamento fino al 15 aprile» | allegato normativo | tabella statica |
| Protezione Civile classificazione sismica | «zona sismica 3» | dato pubblico, licenza da leggere nel footer | CSV/XLS 05/2025 |
| Agenzia Entrate OMI quotazioni | «valori residenziali 2.100-2.600 €/m² in zona centrale (OMI 1° sem. 2026)» | citazione obbligatoria, uso commerciale non esplicitato | CSV semestrale (repo onData) |
| ISTAT popolazione e famiglie | dato di contesto | CC-BY | annuale |
| OpenStreetMap/OSRM | «18 minuti in auto dalla sede (12 km)» | ODbL | self-hosted, gratis |
| ENEA detrazioni | solo regionale | pubblicazione | non comunale |
| SUE/CILA-SCIA comunali | solo come link di servizio | — | nessun dataset nazionale |

*Prova pratica sui 5 comuni di test (Cologno Monzese, San Severo, Sandrigo, Monza, Treviso) in
arrivo dall'ondata 2: sezione da completare con i valori estratti e lo script riproducibile.*

**Gate anti-doorway deterministici** (nella build, nessun giudizio umano ricorrente):
Jaccard su shingle di 5 parole del solo testo editoriale tra pagine gemelle > 0,60-0,70 ⇒ FAIL;
≥ 3 fatti locali verificabili con URL della fonte; ≥ 1 foto reale di un lavoro in quel comune;
raggiungibilità in ≤ 2 clic e ≥ 2 link interni in entrata; niente pagina se manca un requisito.
Policy Google alla lettera: doorway = pagine per città «that funnel users to one page» e «closer
to search results than a clearly-defined, browsable hierarchy»; Mueller (2019) su 1.300 landing
città: «That sounds like doorway pages». Regola di scala del settore: **partire da 2-6 pagine e
scalare solo dopo 30-60 giorni di dati in Search Console**.

### 6.4 Livello 3 — Misura e volano (dove il traffico si costruisce nel tempo)

| Meccanismo | Cosa fa | Fonte dati | Automazione |
|---|---|---|---|
| tabella per sito «query · impression · clic · posizione · pagina» | la scheda **Visibilità** | Search Console API (giornaliera, cache oraria) + Bing | sì |
| **query con impression e senza pagina dedicata → proposta di pagina** (servizio, comune o FAQ) con gate umano di un clic | il sito cresce dove Google già lo mostra: è la vera macchina anti-doorway | Search Console | sì (proposta), un clic (approvazione) |
| **regola delle 8 settimane**: query target senza impression dopo 56 giorni ⇒ segnalata «fuori portata», si propone la sostituta | evita di aspettare l'impossibile | Search Console | sì |
| title/description con CTR sotto la mediana della posizione ⇒ proposta di riscrittura (mai clic finti) | CTR legittimo, fattore 20 | Search Console | sì |
| rank sampling geolocalizzato mensile (10 query × sito) | share of visibility, non «posizione 1» (SERP dinamiche dal core update 05/2026) | DataForSEO ~1-5 $/mese per 50 siti | sì |
| report mensile al cliente con i passi (indicizzato → impression → prime query → clic → contatti) e il testo delle aspettative | il cliente vede il lavoro prima dei lead | n8n `sf-report-rinnovo` | sì |
| **il nostro case study**: screenshot GSC a 1/3/6 mesi dei primi clienti | non esiste in tutto il settore un case study verificabile su artigiani | editor | sì |

### 6.5 Livello 4 — Fuori dal sito, a un clic (link e menzioni)

| Leva | Automazione | Cliente | Evidenza/rischio |
|---|---|---|---|
| **portfolio dell'agenzia** `consulbuild.com/clienti`: scheda editoriale per cliente (nome, città, settore, screenshot, 1-2 righe) con link seguito | generata dal deploy da `client.json`/`site.json` | nulla | link editoriale reale; primo dominio referente di ogni sito nuovo |
| credit link nel footer dei siti clienti verso l'agenzia: anchor «Sito realizzato da ConsulBuild», **`rel="nofollow"`** | una riga nel layout | nulla | Spam policy vieta «widely distributed links in footers»; Mueller raccomanda nofollow |
| **kit citazioni NAP precompilato** con link diretti a PagineGialle/PagineBianche/Virgilio (Italiaonline), Bing Places, Apple Business Connect | e-mail generata al deploy | 1 clic + SMS/Apple ID una tantum | verifica del titolare non aggirabile; citazioni in declino ma Bing/Apple alimentano ChatGPT e Siri |
| kit «aggiorna la tua scheda socio» se già in CNA/Confartigianato/ANCE, kit «elenco installatori» se già certificato (Velux, Daikin, Mapei) | testo pronto | inoltra un'e-mail | link di settore = fattori 5 e 13; incidenza bassa |
| **kit QR e stampa**: QR al sito e al link recensioni, cartello di cantiere, biglietto, firma e-mail, link WhatsApp | PDF generato | approva e stampa | traffico diretto e ricerche di brand (effetto sul ranking non provato; effetto su conversione certo) |
| e-mail «abbiamo il nuovo sito» ai clienti storici via Brevo | import CSV + invio | carica la lista e dichiara che sono suoi clienti (checkbox) | soft spam art. 130 c. 4 solo e-mail e solo ex clienti (§9) |
| Bing Places API, Apple Business Connect API, Uberall/Yext | **no** | — | Bing API solo > 10.000 sedi; Apple solo partner approvati; listing sync fuori budget |
| cross-link tra siti clienti, link comprati, directory minori in massa | **mai** | — | PBN e link spam: penalità di dominio (update 08/2025) |

### 6.6 Livello 5 — Canali oltre la ricerca

IndexNow e Bing sono infrastruttura (fatto). Meta auto-post: no su scala (Business Verification +
App Review per ogni permesso; una sospensione blocca tutti i clienti). Subito/Bakeca/gruppi
Facebook: no (pagamento, revisione manuale, spam). Google Ads sotto 500 €/mese: no. **Local
Services Ads**: esistono in Italia (idraulici, elettricisti, appaltatori, tetti, clima…), ~53 $/lead
negli USA, ma richiedono la verifica del cliente col proprio nome e il suo budget: upsell separato,
non pipeline. Traffico da AI: si presidia con Bing, answer-first, entità e directory; oggi vale
~0,2-1 % del traffico ma converte molto di più.

### 6.7 Trucchi legittimi emersi

- Se il cliente **ha già un dominio**, controllo automatico della storia (Wayback CDX, Open
  PageRank, Safe Browsing) e albero: storia pulita e autorità > 0 ⇒ tenere il dominio; pulita ma
  vuota ⇒ nuovo dominio brand + 301 dal vecchio; sporca ⇒ abbandonare senza redirect. Mai domini
  scaduti (policy expired domain abuse). `.it` = geotargeting automatico; mai `.eu`.
- Pubblicare presto sul dominio definitivo (la demo resta `noindex` con `X-Robots-Tag` sull'intero
  host) per far partire `hostAge`.
- Il nome d'uso deve essere cercabile in modo univoco: è l'unica query che si vince nel mese 1.
- Le query del cliente le sceglie Search Console, non noi: si pubblica dove Google già mostra il
  sito (volano §6.4).
- Un dato locale vero (ISTAT, OMI, zona sismica) è «information gain» che nessun portale
  replica per 8.000 comuni: è insieme anti-doorway e anti-filler.
- Bing è la porta di ChatGPT (84 % dei referral AI in Italia): IndexNow e Bing Places valgono più
  della loro quota di mercato.

## 7. Cosa non fare (con la fonte)

| Idea | Perché no |
|---|---|
| manipolare i clic, comprare CTR, «traffico bot» | test Sterling Sky × Fishkin: caduta sotto la partenza; Nayak: «clicks are easily manipulated»; filtri per utenti distinti e IP nel leak |
| Indexing API per pagine normali, request indexing in massa | solo JobPosting/BroadcastEvent; Mueller 05/2025 |
| pagine città in serie con find/replace, 40 comuni con testo clonato | doorway e scaled content abuse; Lowest nelle QRG «no matter how it's created»; 800+ siti deindicizzati nel 2024 |
| dominio exact-match, domini scaduti | `exactMatchDomainDemotion`; policy expired domain abuse |
| cross-link tra siti clienti, footer link con anchor commerciale, link comprati (Fiverr, Rankister) | link spam policy; PBN colpite 08/2025 |
| team, titolare o recensioni generati con AI; sede fittizia | Lowest nelle QRG; pratica ingannevole |
| schema per AI, `llms.txt`, gonfiare il testo | nessun uplift (Ahrefs 1.885 pagine); Google non legge llms.txt; word count ≈ 0 |
| blog generico su bonus e costi | vinto da portali e testate; nessun caso di artigiano cresciuto col blog |
| Meta auto-post su scala, Subito/Bakeca, gruppi Facebook | app review e rischio a cascata; pagamento e spam |
| Google Ads micro-budget in automatico | sotto la soglia di dati per l'ottimizzazione |
| promettere posizioni o tempi | Google: «no one can guarantee a #1 ranking»; red flag del settore |
| creare schede Google Business al posto del cliente | fuori scope per decisione; sospensioni e reputazione |

## 8. Strumenti e budget

| Fascia | Cosa | Costo/mese |
|---|---|---|
| **0 €** | Search Console API + Site Verification API; Bing Webmaster API; IndexNow/Crawler Hints; PageSpeed + CrUX; Ahrefs Webmaster Tools (siti verificati: audit e backlink base, senza API bulk); Wayback CDX; Open PageRank (30.000/mese); Google Ads API Basic per Keyword Planner (senza spesa pubblicitaria, geo target per comune); unlighthouse; Screaming Frog free (≤ 500 URL); plugin `searchfit-seo` già installato (da provare su un cliente) | 0 |
| **≤ 50 €** | **DataForSEO** pay-per-use (SERP 0,60 $/1.000 standard, 2 $/1.000 live, geolocalizzate per città; keyword 0,06-0,09 $/1.000; MCP ufficiale `dataforseo-mcp-server`; ricarica minima 50 $): rank sampling 50 siti × 10 query ≈ 1-5 $/mese, keyword e backlink spot ≈ 10-20 $; script proprio di AI visibility (5 prompt × sito su API GPT/Gemini) ≈ 5-10 $ | 30-50 |
| **≤ 200 €** | DataForSEO scalato a 100 siti; eventuale SEOZoom (~76 €/mese, dati italiani) **solo se** serve un pannello leggibile da umani; margine per SERP di fallback | 150-190 |

Da scartare: Semrush/Ahrefs pieni e i loro MCP, Surfer/Clearscope/Frase/NeuronWriter (la pipeline
genera già da dati reali), Otterly/Peec/Profound (29-489 $/mese contro uno script da 10), Sitebulb,
Serposcope (abbandonato), Google Trends API (alpha su domanda), Uberall/Yext/BrightLocal in
abbonamento (fuori budget totale). Raccomandazione: **partire dalla fascia 0 € più DataForSEO a
consumo**; nessun altro acquisto finché i sensori non mostrano dati.

## 9. Vincoli legali (norme verificate con legal-it, 19/19)

| Tema | Regola per copywriter e gate |
|---|---|
| recensioni | mostrare le recensioni Google integrali con attribuzione; mai «verificate» senza meccanismo reale (art. 23 lett. bb-ter Cod. Consumo); mai incentivate o filtrate (review gating: policy Google e art. 23 lett. bb-quater); la L. 34/2026 vale solo per ristorazione e turismo. Richiesta post-lavoro **via e-mail** lecita come soft spam (art. 130 c. 4 Codice privacy) con opt-out in ogni invio; SMS/WhatsApp solo con consenso separato |
| prezzi | «prezzo da» solo se tracciabile a un valore reale del cliente, IVA inclusa o dichiarata, con data di validità; mai prezzo-esca (art. 23 lett. e); mai placeholder |
| bonus fiscali | aliquote 2026 (50 %/36 %, mobili 50 % su 5.000 €) da costante centrale aggiornata una volta l'anno con formula cautelativa; comma esatto della L. 199/2025 da verificare su Normattiva prima del gate |
| certificazioni | SOA mai obbligatoria per lavori privati; ogni claim (SOA, DM 37/08, F-Gas, albo) richiede l'attestato nel form, altrimenti è ingannevole «in ogni caso» |
| obblighi informativi | D.Lgs. 70/2003 art. 7: P.IVA e dati in ogni pagina; capitale sociale solo per società di capitali (art. 2250 c.c.), mai per ditte individuali |
| contenuti AI | AI Act art. 50: nessun obbligo di etichetta sulle immagini di marketing generiche; mai persone finte; foto di cantieri senza terzi riconoscibili |
| kit e-mail per conto del cliente | ConsulBuild è responsabile del trattamento ex art. 28 GDPR: serve il DPA prima di attivare il flusso |
| geotargeting | nessun vincolo sui nomi dei comuni; mai stemmi comunali; «impresa edile [città]» dove si opera davvero, mai sede fittizia (Lowest QRG + pratica ingannevole) |

## 10. Cosa cambia rispetto al 03/09 e al 07/09

- Il **Local Pack è fuori portata** senza scheda Google Business (decisione del committente): il
  terreno è l'**organico locale** e la coda lunga «servizio + comune», dove il fattore n. 1 è la
  pagina per servizio. Va detto al cliente: senza scheda non si entra nella mappa.
- Un sito nuovo senza reputazione **non è penalizzato** dai rater (QRG §3.3.5): corregge la lettura
  «strutturalmente penalizzato» del 07/09 e della pista fiducia di oggi.
- `FAQPage` e `HowTo` non producono più rich result (2023, rimozione 05/2026): il JSON-LD resta
  per l'entità, non per la SERP; le FAQ restano come contenuto answer-first.
- Il «sandbox» non è un timer: la regola operativa è **testare ogni query in 4-8 settimane**.
- Ricerche di brand e traffico diretto: **non provati** come leva di ranking; utili per conversione
  e come unica vittoria del mese 1.
- Bing Places e Apple Business Connect **non sono automatizzabili** per un'agenzia della nostra
  taglia (soglie 10.000 sedi / partner approvati): restano kit a un clic del cliente.
- Le pagine per comune richiedono dati locali reali: gli **open data** sono la novità che le rende
  possibili senza mani; la scala si decide con Search Console, non a priori.
- Local Services Ads confermate in Italia ma restano upsell col budget del cliente.

## 11. Cosa non sappiamo

- La composizione reale delle SERP italiane (local pack, AI Overview, LSA, quota portali per taglia
  di comune): serve il campione DataForSEO.
- Pesi e soglie dei segnali: non esistono in nessuna fonte pubblica.
- Nessun case study verificabile su siti nuovi di artigiani: lo produrremo noi.
- Granularità comunale del Censimento ISTAT 2021 per epoca di costruzione; licenza esplicita del
  dataset sismico; comma della L. 199/2025 sulle aliquote.
- Crawler Hints su Workers Static Assets; quota fissa di `SubmitUrlBatch`; tetto proprietà GSC.
- Se il volume di keyword del Keyword Planner è completo su account senza spesa.
- Churn reale dei competitor italiani; siti cliente dei competitor da ispezionare a mano.

## 12. Proposta di integrazione in pipeline

Ogni piano in plan mode con `scope.json`; ordine e dipendenze:

1. **Piano A' — Fondamenta e sensori** (2 settimane). Renderer: sitemap, robots, JSON-LD
   Organization/LocalBusiness/Breadcrumb, credit link nofollow, gate Lighthouse. Deploy: Site
   Verification API + Cloudflare DNS + Sitemaps API; IndexNow key e submit; Bing Webmaster
   verifica e submit; PageSpeed/CrUX. Editor: scheda **Visibilità** (indicizzato, impression, clic,
   prime query, CWV, stato fonti) e colonna in home. Aspettative nel report e nell'onboarding.
   Prerequisiti di Mattia: progetto Google Cloud con service account, account Bing Webmaster,
   Keychain. Risultato misurabile: siti verificati e con impression in Search Console.
2. **Piano B' — Sito strutturato** (4-6 settimane). Pagine per servizio, «Zone servite» con OSRM,
   «Lavori», FAQ, link interni; 4 componenti mancanti; skill copywriter e copy-critic estese
   (answer-first, entity line, gate anti-doorway); form: campi facoltativi «prezzo da» e
   «attestati». Risultato: impression su «servizio + comune» in 4-8 settimane.
3. **Piano C' — Volano** (3 settimane). Ingestione open data comunali (ISTAT, DPR 412, sismica,
   OMI, OSRM) con script riproducibile; pagine-comune gated per 2-6 comuni; regole Search Console
   → proposta di pagina / query fuori portata / title a bassa CTR, con approvazione a un clic;
   rank sampling DataForSEO; case study interno. Risultato: pagine nuove solo dove Google già
   mostra il sito.
4. **Piano D' — Kit presenza** (2 settimane). Portfolio `consulbuild.com/clienti` dal deploy; kit
   NAP (Italiaonline, Bing Places, Apple), kit associazioni/fornitori, kit QR e stampa, e-mail ai
   clienti storici con checkbox e DPA. Risultato: primo dominio referente e citazioni per ogni
   sito, un clic del cliente.

Da fare subito, senza codice: chiave DataForSEO nel Keychain e campione di 384 SERP (§4.3);
domanda per il developer token Google Ads (Basic access, senza spesa); service account Cloud.

## 13. Fonti

Primarie, archiviate verbatim in `~/knowledge/seo/fonti/`: Search Quality Evaluator Guidelines
(11/09/2025); USA v. Google: PXR0356 (HJ Kim, 18/02/2025), PXR0357 (Nayak, 31/01/2025), PXRD016,
UPX0004, UPX0192, UPX0204, UPX0219, UPX1087, trascrizioni 20/09/2023 e 18/10/2023, Memorandum
Opinion 05/08/2024 e 05/12/2025, Proposed Findings of Fact; leak Content Warehouse v0.4.0 (hexdocs
e tarball Hex). Google Search Central: spam policies, helpful content, sitemaps, site move,
Indexing API, structured data (Organization, LocalBusiness), Site Verification, Search Console
quote, Ads API access levels. Microsoft: Bing Webmaster API, IndexNow, Bing Places API. Apple
Business Connect docs. Cloudflare Crawler Hints. Studi: Ahrefs (how long to rank 05/2025; search
traffic 12/2023; AI Overview brand correlation 05/2025; schema/AI 2026), Whitespark LSRF 2026,
Zyppy internal links, Sterling Sky (CTR test 06/2024; service area pages; images), Local Search
Forum, SparkToro, iPullRank. Italia: AGCM provv. 31878/2026; L. 34/2026; Codice del Consumo artt.
20-23; D.Lgs. 70/2003 art. 7; art. 130 Codice privacy; ISTAT, Protezione Civile, Agenzia Entrate
OMI (repo onData), DPR 412/93; StatCounter IT 08/2026; SEOZoom AIO Italia; Digital 2026 Italia.
Competitor: siti e pricing ufficiali, Trustpilot, BBB, FTC (Angi 2023, 2025), Indie Hackers.
I rapporti per pista con tutti gli URL: `~/knowledge/seo/ricerche-2026-09-14/`.
