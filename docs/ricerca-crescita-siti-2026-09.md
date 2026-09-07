# Perché i siti non portano richieste, e come risolverlo senza lavoro manuale

Ricerca del 2026-09-07 (sei indagini web parallele + verifica diretta sul sito reale di
Cavaliere Build e sulle fonti primarie Google). Input: `CLAUDE.md`, `site-renderer/PRODUCT.md`,
`docs/inventario-dati-dashboard.md`. Le cifre marcate **[fatto]** vengono da fonti primarie o
studi con metodologia; **[settore]** = esperienza di agenzie/community, plausibile ma non
misurata in modo indipendente. Fonti in fondo.

## In dieci righe

1. Vendiamo una macchina di conversione (`PRODUCT.md`: «arriva da ads o ricerca locale»)
   senza carburante: oggi non c'è né ricerca locale né ads. Cavaliere: 7 visitatori in 30
   giorni, nessuno da un motore, sito non indicizzato, zero dati strutturati, nessuna sitemap.
2. Nell'edilizia locale la domanda passa dal **Local Pack di Google** (scheda Google Business
   ~32 % del ranking locale) e dai **portali**; i siti che si posizionano hanno **pagine per
   servizio e città**. Un one-page da solo non può coprire quelle query.
3. La cosa peggiore da fare è creare schede Google via API in silenzio per ogni cliente:
   accesso API con approvazione manuale, sospensioni in forte aumento, rischio reputazionale.
4. La cosa migliore: **il sito resta la destinazione, il software costruisce il canale** in
   cinque strati, tutti automatizzabili al deploy o via n8n, con al massimo un click una
   tantum del cliente (accettare l'invito «Manager» sulla sua scheda Google).
5. Strato 0 (2 settimane, costo zero): SEO tecnica e misura al deploy — dati strutturati,
   sitemap, Search Console verificata via API, IndexNow, scheda «Visibilità» nell'editor.
6. Strato 1 (il più grosso): da one-page a **one-page + pagine servizio × zona** con prove
   reali dal `contesto.json` (24 servizi atomizzati, area di intervento, foto), con un gate
   anti-doorway. È la leva organica che apre le query oggi scoperte.
7. Strato 2: **Google Business assistito** — il software produce il kit completo della
   scheda, il cliente la rivendica con un click, l'agenzia diventa Manager e da lì l'API
   tiene tutto allineato e legge chiamate e indicazioni. Recensioni reali sul sito via
   Places API (senza proprietà, con attribuzione).
8. Strato 3 e 4: recensioni chieste in automatico dopo il lavoro (e-mail lecita; SMS e
   WhatsApp solo con consenso raccolto nel contratto) e conversione del template: CTA fissa
   su mobile, modulo a 3-5 campi, «prezzo da», garanzie e certificazioni, notifica
   immediata al titolare con tap per chiamare, risposta automatica al lead.
9. Strato 5: un tier «Sito + Lead» con **Local Services Ads**, disponibili in Italia per
   «Appaltatori diretti», «Riparatori di tetti», idraulici, elettricisti, riscaldamento e
   climatizzazione: pay-per-lead, si ottimizzano da sole, costo per lavoro migliore dei
   portali. Verifica una tantum a carico del cliente.
10. Tempi onesti: recensioni e Google Business 2-6 settimane, LSA 2-4 settimane, organico
    3-6 mesi. Si misura tutto: impression e clic da Search Console, chiamate e indicazioni
    dalla scheda Google, lead dalla tabella n8n, tempo di risposta.

## 1. Il business e la promessa

ConsulBuild vende a piccole imprese edili un sito one-page di conversione in abbonamento
(99 €/mese), generato dalla pipeline (contesto → palette → copy → immagini → legale → build)
e pubblicato su Cloudflare, con modulo, monitor, statistiche e report mensile. Il design è
fatto per convertire chi arriva («telefono e preventivo in ogni fold»). Il modello regge
solo se qualcuno arriva: la lacuna è il canale, non la pagina.

## 2. Evidenze sullo stato attuale

Sito reale `cavalierebuild.it` (verificato il 2026-09-06/07):

| Cosa | Stato |
|---|---|
| Visitatori 30 gg (Umami) | 7, di cui 5 da Ashburn (Virginia: bot/crawler) e 2 dall'Italia (noi); **0 referrer**, 0 organico |
| Indicizzazione | `site:cavalierebuild.it` non restituisce nulla; nessuna Search Console; nessuna sitemap (404) |
| Title / meta / OG | buoni («Impresa edile a Cologno Monzese · Cavaliere Build», description, canonical, og:image) |
| Dati strutturati | **nessuno** (0 blocchi JSON-LD) |
| Pagine | una, più `/privacy` e `/termini`; ~1.400 parole |
| SERP per «impresa edile Cologno Monzese ristrutturazioni» | ProntoPro, Edilnet, Virgilio, PagineBianche (portali) + concorrenti con **pagina dedicata per città** (`/impresa-edile-cologno-monzese/`) |

Cosa la pipeline già sa e non usa per la visibilità (`contesto.json`): `servizi_atomizzati`
(24 voci), `macro_categorie` (5), `zona.sede`, `zona.area_intervento`, `punti_di_forza`,
`materiali.foto_reali`, FAQ e processo nel copy. Nello schema del renderer esistono 8 tipi
di sezione senza componente: `GoogleReviews`, `BeforeAfter`, `Guarantees`, `Certifications`,
`Incentives`, `About`, `LogoBar`, `ProblemAgitation`.

## 3. Come funziona la domanda locale in edilizia (fatti)

- **Local Pack**: i segnali della scheda Google Business pesano ~32 %, on-page 19 %,
  recensioni 16-20 %, link 15 %, citazioni 7 % **[fatto, Whitespark/BrightLocal via
  fonti secondarie]**. Entrare nel 3-pack vale +126 % traffico e +93 % azioni **[fatto,
  SOCi/Whitespark]**. Le recensioni recenti pesano più dello storico (Sterling Sky, 8.186
  attività, 2025).
- **Portali**: ProntoPro/Instapro, Edilnet (250.000 utenti/mese dichiarati), PagineGialle,
  Virgilio occupano le posizioni organiche; **Habitissimo ha chiuso in Italia il 30/01/2025**
  **[fatto]**. Nessun portale ha API o gestione multi-cliente per agenzie; lead condivisi e
  qualità contestata (Trustpilot 3,6/5, reclami Altroconsumo).
- **Google Ads**: CPC per «impresa edile ristrutturazioni Roma» 5,86 €, «preventivo
  ristrutturazioni Roma» 6,87 € **[settore]**; sotto 500 €/mese Search e Performance Max
  non raccolgono abbastanza conversioni per ottimizzarsi. **Local Services Ads** sono in
  Italia dal 2020 e la pagina ufficiale Google elenca «Appaltatori diretti», «Riparatori di
  tetti», idraulici, elettricisti, riscaldamento/aria condizionata, pavimentazioni,
  rivestimenti, recinzioni, falegnami **[fatto, verificato il 2026-09-07]**; serramenti e
  fotovoltaico non hanno una voce propria. Costo per lavoro acquisito: LSA 120-235 $,
  portali a pagamento 250-1.000 $ (benchmark USA) **[settore]**.
- **Meta lead ads**: CPL apparente 5-10 €, ma costo reale per cantiere 600-1.200 € per la
  bassa chiusura; serve qualifica umana **[settore]**.
- **Conversione**: siti di artigiani 2-4 % (top 8-12 %) **[settore]**; nei servizi
  domestici il 45 % delle chiamate risposte diventa cliente (Invoca, 70 M conversazioni)
  **[fatto]**: il telefono batte il modulo. Il 62 % delle chiamate alle piccole imprese
  resta senza risposta; contattare un lead entro 5 minuti moltiplica la chiusura
  (32 % vs 12 % dopo 24 h) **[settore, più fonti concordi]**.
- **Fiducia**: la fiducia nelle recensioni «come in un amico» è scesa dal 79 % al 42 %
  (BrightLocal 2025) **[fatto]**: contano solo recensioni Google reali e verificabili.
- **AI Overviews**: in Italia dal 2025; sulle query locali si attivano su ~8 % delle
  ricerche; le imprese citate vengono da scheda Google, recensioni e dati strutturati
  coerenti. `llms.txt` non serve (Google non lo usa) **[fatto]**.

## 4. Cosa NON fare, e perché

| Idea | Perché no |
|---|---|
| Creare la scheda Google via API per ogni cliente, senza di lui | Accesso API con approvazione manuale (profilo verificato da 60+ giorni, domanda dal proprietario), sospensioni GBP +80 % 2023-24 con appelli da 5 settimane, schede «create da altri» = rischio reputazionale. Va fatto **con** il cliente, non al posto suo. |
| Pagine città con find/replace del toponimo | Doorway page / scaled content abuse (policy Google 2024-25): penalità a livello di dominio. Vale solo con contenuto reale per zona. |
| Blog su bonus e «quanto costa ristrutturare» | Query iper-competitive vinte da portali e testate nazionali; nessun caso di piccola impresa cresciuta col blog. Gli incentivi servono **dentro** le pagine servizio, non come blog. |
| Chat AI sul sito | Nessuna evidenza indipendente; rischio legale (promesse su prezzi e tempi; Product Liability Directive UE dal 12/2026; AI Act art. 50 dal 08/2026). FAQ e WhatsApp fanno lo stesso lavoro. |
| Portali di lead nel prodotto | Nessuna API, qualità contestata, gestione per-account: non scala e cannibalizza «il sito è tuo». |
| Portale cliente con login | A questo ticket le PMI non lo aprono: il report via e-mail con 3-4 numeri è la scelta giusta (già fatta). |
| Google Ads Search/PMax a 150 €/mese in automatico | Sotto la soglia di dati; serve supervisione. LSA sì, Search no. |
| Meta lead ads | Lead da qualificare a mano lato cliente. |

## 5. La strategia: il sito è la destinazione, il software costruisce il canale

Per ogni strato: cosa fa il software (senza mani), cosa fa il cliente **una volta**, cosa fa
Mattia **una volta**, costo, tempo per i risultati, impatto atteso.

### Strato 0 — SEO tecnica e misura al deploy (prerequisito; costo 0; 1-2 settimane di lavoro)

Software, al deploy di ogni sito con dominio:
- JSON-LD `HomeAndConstructionBusiness` (nome, indirizzo/area servita, telefono, orari,
  `sameAs` verso scheda Google e social), un `Service` per macro-categoria, `FAQPage`
  sulle FAQ visibili; **niente `AggregateRating`** finché le recensioni non sono visibili
  in pagina (policy Google sulle self-serving reviews).
- `sitemap.xml` con `lastmod` reale; `robots.txt` allow-all (anche ai crawler AI: bloccarli
  toglie citazioni senza proteggere nulla).
- **Search Console**: token della Site Verification API iniettato come meta tag nel
  `<head>` al build, verifica e `sites.add` sotto il service account dell'agenzia, submit
  della sitemap, URL Inspection dopo il deploy. Quote gratuite ampie (Search Analytics
  50.000 righe/giorno; URL Inspection 2.000/giorno per proprietà).
- **IndexNow** (Bing, Yandex e altri) dalla build Astro (integrazione esistente) + import
  Bing Places da Google, gratuito.
- Core Web Vitals reali con Cloudflare Web Analytics (RUM, senza cookie, gratis; risolve
  l'assenza di dati CrUX sui siti a basso traffico) e PageSpeed API post-deploy.
- Nell'editor: scheda/colonna **«Visibilità»** per cliente: indicizzato sì/no, impression,
  clic, prime query (Search Console, settimanale, cache oraria), CWV.

Cliente: nulla. Mattia una tantum: progetto Google Cloud con service account, chiave
IndexNow. Impatto sul traffico: basso da solo, ma senza è tutto invisibile; misura tutto
il resto.

### Strato 1 — Da one-page a «one-page + pagine servizio × zona» con prove reali (la leva organica; 4-6 settimane)

Perché: le query «servizio + città» sono quelle su cui i concorrenti si posizionano con
pagine dedicate; un solo URL non può coprirle. Vincolo: contenuto reale, mai find/replace.

Software (pipeline + renderer):
- Nuove pagine generate dal `contesto.json`: **una per macro-categoria** («Ristrutturazione
  bagno a Cologno Monzese e dintorni») e **una pagina «Zone servite»** con i comuni reali
  dell'area di intervento (dal form). Facoltativo: pagine «Lavori» per i cantieri con foto
  reali e didascalie (esistono nel copy).
- Ogni pagina: servizi atomizzati di quella macro, processo, FAQ specifiche, foto reali di
  quella categoria, incentivi fiscali applicabili (vedi sotto), CTA e modulo; link
  interni dalla home. **Gate anti-doorway** nella pipeline: testo condiviso tra pagine
  gemelle sotto una soglia (settore: < 70 %), ogni pagina deve citare almeno N fatti
  propri del contesto, niente elenchi di città senza contenuto. Il copy-critic esistente
  si estende con questa lente.
- **Incentivi 2026** come sezione (`Incentives`, oggi senza componente): bonus
  ristrutturazione ed ecobonus al 50 % prima casa / 36 % altre, bonus mobili 50 % con tetto
  5.000 € (L. 199/2025). Fatti normativi, aggiornati **una volta l'anno** centralmente
  (costante), mai inventati per cliente.
- Schema: `Service` con `areaServed` per pagina; sitemap aggiornata; Search Console vede
  le nuove URL.

Cliente: nulla (il form già chiede servizi e zona; si può aggiungere «comuni in cui
lavori più spesso» e «prezzo indicativo da» facoltativo). Mattia: nulla di ricorrente.
Impatto: medio-alto sul traffico long-tail in 3-6 mesi; è anche ciò che dà alla scheda
Google una landing page per servizio (Sterling Sky: pagine con più contenuto
significativo correlano col ranking «near me»).

### Strato 2 — Google Business assistito (la leva delle richieste; 3-4 settimane)

Google Business è dove nascono le chiamate, ma non si crea al posto del cliente.
Disegno «assistito», compatibile con «un click una tantum»:
- Il software genera il **kit scheda** dal contesto: categoria primaria e secondarie
  (mappa fissa settore → categorie GBP), descrizione 750 caratteri, elenco servizi con
  descrizioni, orari, foto già ottimizzate dal sito, link al sito e alle pagine servizio
  (con UTM), risposte modello alle recensioni. Se il cliente ha già una scheda (Places API
  Text Search su nome + indirizzo): si parte da lì.
- Il cliente riceve **una e-mail con un solo passaggio**: rivendica/verifica la scheda (o
  accetta l'invito) e aggiunge l'agenzia come **Manager** (mai Primary Owner: è la best
  practice contro le sospensioni). Il PIN, se serve, lo legge lui.
- Da Manager, con la **Business Profile API** (accesso richiesto **una volta** da Mattia
  come proprietario dell'account organizzazione: domanda a Google, profilo verificato da
  60+ giorni, 1-6 settimane) il software: allinea descrizione, servizi, orari, foto;
  pubblica **post solo da eventi reali** (nuovo lavoro con foto, nuova recensione: mai
  contenuto ripetitivo); legge la **Performance API** (chiamate, indicazioni, clic al sito,
  impression) → dashboard e report mensile. Le sospensioni si vedono subito (stato scheda).
- **Recensioni sul sito senza proprietà**: Places API (New) Place Details legge rating,
  numero e fino a 5 recensioni con foto; entro 10.000 chiamate/mese è gratis (cache
  settimanale al build). Alimenta il componente `GoogleReviews` (esiste nello schema, manca
  il componente) con attribuzione Google e testo non alterato: prova sociale reale in
  pagina.
- Se il cliente non ha una scheda e non vuole crearla: il kit resta pronto, la dashboard
  lo segnala («senza scheda Google»), e il report lo ricorda. Niente forzature.

Costo: 0 (Places entro soglia). Impatto: alto (è il canale n. 1), 2-6 settimane sulle
azioni della scheda.

### Strato 3 — Recensioni e prova sociale (2 settimane)

- **Richiesta recensione post-lavoro** via n8n: e-mail dal dominio dell'agenzia per conto
  del cliente (soft spam art. 130 c. 4: lecito verso clienti per servizi analoghi); SMS e
  WhatsApp **solo con consenso** esplicito, da raccogliere nel modulo preventivo o nel
  contratto del cliente finale. Trigger: il titolare segna il lead come «vinto» e, N giorni
  dopo, parte la richiesta con link diretto alla scheda (tasso di raccolta atteso 15-25 %).
  Richiede lo stato dei lead (Strato 4).
- Link e QR «lascia una recensione» nel report mensile e nella firma delle e-mail lead.
- Foto reali dei lavori sulla scheda Google dal kit (le stesse del sito).

Costo: Brevo e-mail già presente; SMS ~0,06-0,08 € l'uno. Impatto: alto sul ranking locale
(recensioni fresche) e sulla conversione (fiducia).

### Strato 4 — Conversione del template e velocità di risposta (2-3 settimane)

Nel template, una volta per tutti i siti:
- CTA fissa su mobile con **Chiama** e **WhatsApp** sempre visibili (evidenza A/B +12-27 %;
  verificare che `StickyCta` lo faccia già e misurarlo con gli eventi Umami esistenti).
- Modulo a **3-5 campi** (oggi 5 + honeypot: rendere e-mail e città facoltativi ed
  evidenziarlo).
- «Prezzo da» per servizio quando il cliente lo autorizza nel form (+15 % in un A/B;
  un campo facoltativo nel form, mai inventato).
- Componenti mancanti con evidenza di conversione: `GoogleReviews` (Strato 2),
  `Guarantees` (garanzia esplicita: +11-49 % in A/B), `Certifications` (SOA, DM 37/08,
  F-Gas dal form), `BeforeAfter` (foto reali), `Incentives` (Strato 1).
- Velocità: già statico; aggiungere un **gate Lighthouse** nella build (soglie su LCP e
  peso immagini) così nessun deploy scende sotto i 3 s su mobile.

Dopo il lead, via n8n (nessun lavoro per l'agenzia):
- **Notifica immediata al titolare** con tap per chiamare: oggi arriva un'e-mail; per un
  titolare in cantiere serve **SMS o WhatsApp** (Brevo ha entrambi; WhatsApp era stato
  escluso per i report, qui è un altro uso: il titolare dà il numero e il consenso alla
  firma).
- **Risposta automatica al lead** («ti richiamiamo entro 2 ore lavorative») via e-mail e,
  con consenso nel modulo, SMS.
- **Stato del lead** con un tap dalla notifica (contattato / preventivo / vinto / perso):
  alimenta CRM leggero, recensioni (Strato 3) e il report; se dopo 24 h non è
  «contattato», promemoria al titolare.

Impatto: alto sulle richieste a parità di traffico; il telefono e la velocità di risposta
sono i due fattori più forti trovati.

### Strato 5 — Canale a pagamento standard e citazioni (quando gli strati 0-4 sono su)

- **Tier «Sito + Lead» con Local Services Ads**: pay-per-lead, si ottimizzano da sole,
  badge «Google Screened»; categorie italiane coperte: appaltatori diretti, tetti,
  idraulici, elettricisti, riscaldamento/clima, pavimenti, rivestimenti, recinzioni,
  falegnami (non serramenti e fotovoltaico). Il cliente fa la verifica una tantum
  (documenti, assicurazione se richiesta); l'agenzia gestisce da account manager, budget
  passante (150-300 €/mese) + fee fissa. I lead arrivano al telefono del cliente; la
  Local Services API (reporting) porta i numeri in dashboard. È il canale con il miglior
  costo per lavoro e il minor lavoro ricorrente trovato.
- **Citazioni/directory** italiane (PagineGialle, Virgilio, Cylex, MisterImprese, Opendi,
  Europages, Hotfrog, Bing, Apple): NAP coerente dal contesto, invio in massa via
  BrightLocal Citation Builder o Semrush Local (costo una tantum per sede); Edilnet e
  simili restano una scelta del cliente. Impatto medio, sforzo basso, zero rischi.
- **Rank tracking locale** (DataForSEO, ~0,0006 $/query; geo-grid 0,012 $/punto): solo per
  il report, dopo che c'è qualcosa da misurare.

## 6. Cosa aggiungere all'editor

| Scheda / dato | Cosa mostra | Fonte | Lavoro manuale |
|---|---|---|---|
| **Visibilità** (nuova, per cliente + colonna in home) | indicizzato, impression/clic/query 28 gg, CWV, stato scheda Google (assente / da rivendicare / Manager / sospesa), rating e n. recensioni, chiamate e indicazioni | Search Console, Cloudflare, Places API, Performance API | nessuno |
| **Lead** (CRM leggero nell'hub) | elenco lead con stato (nuovo/contattato/preventivo/vinto/perso), tempo di prima risposta, fonte (sito, GBP, LSA) | tabella n8n Lead + stato via tap | un tap del titolare per lead |
| **Kit Google Business** (nell'hub) | categorie, descrizione, servizi, foto, stato dell'invito, ultima sincronizzazione | pipeline + GBP API | click del cliente una tantum |
| **Qualità** (nella scheda Build) | Lighthouse (performance, SEO, a11y), link rotti, ortografia italiana (LanguageTool self-host) | Lighthouse CI, LanguageTool | nessuno: gate automatico |
| **Onboarding senza mani** | form → contratto con firma → dominio (Cloudflare Registrar API) → Stripe checkout → deploy | n8n, Stripe, Cloudflare | conferma d'acquisto del dominio |
| **Fatturazione elettronica** | fattura SDI a ogni `invoice.paid` di Stripe | Fatture in Cloud API | nessuno |
| **Canali** (tier) | LSA attive, budget, lead per canale, costo per lead | Local Services API | verifica una tantum del cliente |

Confermato: niente cookie banner (siti senza cookie: basta l'informativa, Garante
27/02/2025); l'European Accessibility Act non obbliga le microimprese (< 10 dipendenti,
≤ 2 M€), i preset restano AA per qualità.

## 7. Roadmap proposta

| Piano | Contenuto | Effort | Risultato misurabile |
|---|---|---|---|
| **A — Fondamenta** (2 sett.) | Strato 0 completo; scheda Visibilità; componenti `GoogleReviews`/`Guarantees`/`Certifications`; modulo a campi facoltativi; notifica SMS/WhatsApp al titolare + risposta automatica al lead; gate Lighthouse | medio | siti indicizzati con impression in Search Console; tempo di risposta ai lead |
| **B — Pagine servizio × zona** (4-6 sett.) | Strato 1: pipeline multi-pagina, gate anti-doorway, `Incentives`, sitemap; form con «comuni serviti» e «prezzo da» | alto | clic organici su query servizio+città (3-6 mesi) |
| **C — Google Business assistito + recensioni + lead** (3-4 sett.) | Strato 2 e 3, CRM leggero, stato lead via tap | medio-alto | chiamate/indicazioni dalla scheda; recensioni/mese; lead vinti |
| **D — Canali e operazioni** | Strato 5 (LSA tier, citazioni, rank tracking); onboarding senza mani; SDI | medio | lead per canale e costo per lead; ore risparmiate |

Dipendenze: A prima di tutto (senza misura non si sa cosa funziona). C richiede la
domanda di accesso API a Google fatta da Mattia il prima possibile (tempi lunghi):
consiglio di farla **adesso**, in parallelo ad A.

KPI da leggere in dashboard e nel report: impression e clic organici, posizione media su
«servizio + città», chiamate e indicazioni dalla scheda Google, lead/mese per fonte, tempo
di prima risposta, tasso lead → vinto, recensioni nuove/mese, rating.

## 8. Rischi e vincoli

- Policy Google su contenuti su scala: pagine solo con contenuto reale, gate nella
  pipeline, poche pagine buone (3-8) invece di 50.
- Sospensioni scheda Google: mai Primary Owner, mai schede create senza il cliente,
  NAP coerente col sito e le directory; monitorare lo stato.
- GDPR: SMS/WhatsApp solo con consenso; e-mail di richiesta recensione ok verso clienti;
  registrazione chiamate e AI vocale fuori scope.
- Costi: tutto gratuito entro soglie (Search Console, IndexNow, Cloudflare, Places
  10.000/mese); DataForSEO e citazioni sono opzionali; LSA è budget passante.
- Aspettative: l'organico è lento; il report deve mostrare i passi (indicizzazione,
  impression, prime query) prima dei lead, altrimenti il cliente non vede il lavoro.

## 9. Fonti principali

Google: policy spam (doorway, scaled content) developers.google.com/search/docs/essentials/spam-policies ·
Local Services Ads categorie Italia support.google.com/localservices/answer/6224841 (co=IT) ·
Business Profile API accesso e prerequisiti developers.google.com/my-business/content/prereqs ·
Site Verification API developers.google.com/site-verification · Search Console quote
developers.google.com/webmaster-tools/limits · Places API (New) Place Details · review snippet
policy developers.google.com/search/docs/appearance/structured-data/review-snippet.
Ranking locale: whitespark.ca/local-search-ranking-factors · brightlocal.com (Local Consumer
Review Survey 2025; ranking factors) · sterlingsky.ca (near me 2025; service area pages) ·
searchenginejournal.com (sospensioni GBP). Mercato italiano: blog.edilnet.it (chiusura
Habitissimo), it.trustpilot.com (Instapro, Habitissimo, Fazland), altroconsumo.it,
kmastudio.it (CPC edilizia), dvsintmarketing.com (budget Meta/Google edilizia),
infobuild.it / biblus.acca.it (bonus 2026, L. 199/2025), garanteprivacy.it (soft spam;
cookie 2025), actainfo.it (EAA microimprese). Conversione: invoca.com (Home Services
2026), abtasty.com (sticky CTA), cxl.com (form, recensioni), conversion-rate-experts.com
(garanzie), thinkwithgoogle.com (velocità). Strumenti: bing.com/indexnow, github.com/
velohost/astro-indexnow, developers.cloudflare.com/web-analytics, dataforseo.com,
unlighthouse.dev, github.com/fattureincloud/api.
