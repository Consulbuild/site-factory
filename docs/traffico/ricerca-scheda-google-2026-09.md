---
id: R1
titolo: Ricerca «Scheda Google» — cosa pesa, regole, fonti dati automatiche, schema della scheda consigliata
data: 2026-09-14
input: 5 rapporti di pista in ~/knowledge/seo/ricerca-scheda-google/ (regole-google, fattori-ranking, api-accesso, dati-e-strumenti, italia-legale-rischi) + 26 verdetti di verifica avversariale + 7 riletture di controllo fatte per questo rapporto (policy API, help IT 3039617, LSRF 2026, OAuth, terze parti, link attività, Place Actions) + 6 approfondimenti sui buchi del 2026-09-14 (policy 30 giorni, chiave DataForSEO↔GCID e nomi IT, DataForSEO depth/zoom/termini/prezzi, ciclo di vita di una modifica, social/pin/link attività, OAuth del monitor)
corregge: ~/knowledge/seo/digest/local-seo.md (vedi §11.2)
gradi: "[fatto] = fonte primaria Google (help, policy, API) o misura con metodo pubblicato · [settore] = sondaggio di esperti, caso d'agenzia, consenso dei professionisti · [contestato] = fonti autorevoli in disaccordo, o affermazione non dimostrata dalla fonte"
paese: salvo indicazione, tutti i test di ranking sono USA/Canada. Nessun test controllato italiano trovato. Policy, API e limiti dei campi sono globali (valgono per l'Italia).
date_fonti: le pagine help Google non hanno data; la data indicata è quella di lettura (2026-09-14) salvo diversa indicazione.
---

# Ricerca «Scheda Google» — settembre 2026

## 0. In dieci righe

1. Pesa sul ranking, in quest'ordine di evidenza: categoria primaria, categorie aggiuntive, servizi predefiniti, orari veri, link al sito senza redirect, completezza. Prossimità e recensioni pesano molto ma non si compilano. [settore]
2. Descrizione, post, foto, risposte alle recensioni: si fanno per la conversione. Nessuna prova che muovano il ranking. [settore]
3. Il nome non si ottimizza: keyword fuori dal nome reale = rischio sospensione scritto da Google. Il software lo controlla, non lo propone. [fatto]
4. Quante categorie aggiuntive: Google dice «il minor numero possibile», max 9; Sterling Sky dice «usale tutte» con un solo caso. Regola nostra: solo mestieri che l'impresa «È», con prova. [contestato]
5. Link del sito: non esiste un vincitore tra homepage e pagina servizio. Default per artigiano a sede singola: homepage con UTM; pagina servizio solo con dati Search Console. [contestato]
6. Q&A: API spenta il 2025-11-03; niente campo Q&A nella scheda consigliata. [fatto]
7. I dati della scheda del cliente si leggono via Business Profile API dopo l'approvazione (≤14 giorni), senza tariffa trovata. Ma `locations.get` restituisce il valore inviato dal titolare, non quello pubblico: rileggerlo non prova la pubblicazione. Social, pin e link attività: si chiudono con 3 chiamate sulla scheda pilota. [fatto]
8. Categorie e servizi dei competitor: DataForSEO Maps SERP + My Business Info, circa 20 $/mese in standard per 50 clienti anche con geogrid settimanale; `depth` 20 costa come 100. I termini DataForSEO scaricano su di noi il rischio verso Google. [fatto sui testi]
9. Policy API: conservazione «no more than 30 calendar days», niente aggregazione. Il testo è [fatto], l'estensione dentro il progetto è [contestato]. Quindi: nella scheda consigliata solo artefatti nostri, letture API in una cache con scadenza, niente benchmark tra clienti. Domanda a Google pronta, non inviata.
10. Per G1-G3: una modifica «core» al giorno; «verificato» solo quando il campo esce da `pendingMask`, non entra in `diffMask` e la vista pubblica coincide (la revisione può durare 30 giorni); OAuth «Internal» su Workspace con token unico in n8n; niente scrittura via API; niente foto AI sulla scheda.

---

## 1. Cosa pesa davvero

Legenda effetto: **R** = ranking, **C** = conversione, **—** = nessun effetto dimostrato. Rank LSRF = posizione su 187 fattori local pack/Maps del sondaggio Whitespark 2026 (47 esperti, pubblicato 2025-11-06): è opinione, non misura.

| Campo | Ranking | Conversione | Evidenza (grado, URL) |
|---|---|---|---|
| Categoria primaria | **R alto** | — | LSRF #1, score 227 [settore] https://whitespark.ca/local-search-ranking-factors/ · 1,8 M schede: categoria specifica 12,5% vs 9,2% di presenza in top 10, correlazione [fatto sul dato, USA] https://searchengineland.com/google-business-profiles-local-seo-success-data-485727 (2026-08-25) · caso HVAC da #1 a #31 «quando la categoria primaria è cambiata», chi l'ha cambiata non è detto, n=1 [settore, USA] https://www.sterlingsky.ca/local-seo-audit-checklist/ (2026-07-31) |
| Categorie aggiuntive | **R medio-alto** | — | LSRF #8, score 173 [settore] · BrightLocal 2023, 1.050 schede USA: rank medio 5,9 con 4 aggiuntive vs 7,6 con zero; correlazione; 5+ raggruppate; elettricisti media 1 aggiuntiva senza pattern [settore] https://www.brightlocal.com/research/study-do-additional-gbp-categories-boost-local-rankings/ (2023-06-20) · quante usarne: vedi §4 [contestato] |
| Nome attività | R alto (se c'è la keyword) | C | LSRF #3, score 223 [settore] · test «Salad Bar»: effetto in poche ore, reversibile; il calo #1→#7 in 2 giorni è di un centro rehab a cui Google ha tolto le keyword [settore, USA, n=1] https://www.sterlingsky.ca/keyword-stuffing-gmb-name/ (2023-08-09) · **vietato** aggiungere keyword [fatto] https://support.google.com/business/answer/3038177 |
| Indirizzo visibile vs SAB | R alto | C | LSRF #4 città di ricerca (213), #7 indirizzo visibile (176) [settore] · studio 8.186 schede USA: SAB correlate a rank peggiore, test di nascondi/ripristina replicato 2 volte, ma Darren Shaw «non convinto» [contestato] https://www.sterlingsky.ca/what-gets-you-ranking-for-near-me-2025/ (2025-11-05) · chi non riceve clienti in sede **deve** nascondere l'indirizzo [fatto] https://support.google.com/business/answer/3038177 |
| Pin sulla mappa | R | C (indicazioni stradali) | LSRF #10 «Proper Placement of Map Pin», score 165 [settore] · il pin si sposta a mano quando l'indirizzo non ha civico o non viene trovato [fatto] https://support.google.com/business/answer/2853879?hl=en · tolleranze di distanza: non trovate |
| Area servita | — | C (mostra dove lavori) | Tier F, nessun effetto [settore] https://whitespark.ca/blog/how-to-outrank-99-of-local-competitors-google-business-profile-tier-list/ (2025-08-18) · oltre 2 h di guida = fattore negativo, rischio sospensione score 82 [settore] LSRF |
| Orari / aperto ora | **R (dipende dall'ora)** | C | LSRF #5 aperto al momento (189), #21 orari impostati (134) [settore] · BrightLocal: 50 sedi, griglia 7×7, 3 giorni; effetto per categoria, nullo per alcune [fatto sul dato, USA] https://www.brightlocal.com/research/study-business-opening-hours-and-local-rankings/ (2023-12-21) · togliere gli orari peggiora di giorno [settore] https://www.sterlingsky.ca/is-listing-business-hours-crucial-for-rankings/ (2025-03-03) |
| Servizi predefiniti | **R medio** | C | LSRF #22, score 134 [settore] · Sterling Sky: test 2019 nessun effetto, retest 2022 effetto; 2 casi documentati (avvocato NJ, dermatologo); «24-72 h» e «più forte sulle esplicite» solo nel riepilogo riscritto nel 2026, senza dati; «senza descrizione» da un commento dello staff [settore, aneddotico] https://www.sterlingsky.ca/services-in-google-business-profile-impact-ranking/ (ripubblicata 2026-02-27) |
| Servizi personalizzati | R basso, non dimostrato | C | «molto meno» dei predefiniti, solo griglie prima/dopo, paese e campione non dichiarati [settore] https://www.sterlingsky.ca/do-custom-google-business-profile-services-impact-ranking/ (2024-01-24) · Whitespark: «the jury is still out» [contestato] https://whitespark.ca/blog/increase-local-seo-rankings-with-predefined-services/ (2024-10-28) |
| Keyword nei servizi | R basso-medio | — | LSRF #34, score 118 [settore] |
| Descrizione | **—** (keyword); presenza conta nella completezza | C | Keyword in descrizione LSRF #171 Maps (41), #158 organico, #115 visibilità AI [settore] · BrightLocal la mette tra i campi senza impatto riprendendo lo stesso sondaggio [settore] https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/ (agg. 2026-09) · indice di completezza 0-5 (sito, descrizione, orari, foto, rivendicata) correlato a rank 62→43, descrizione non isolata [fatto sul dato] SEL 2026-08-25 · nessuna dichiarazione Google trovata |
| Attributi | R solo per query con l'attributo | C | «User Added Attributes in GBP» LSRF #81 (92) [settore] · caso «women-led» 2021, letto solo da snippet [settore] https://www.sterlingsky.ca/do-google-my-business-identity-attributes-impact-ranking/ |
| Foto e video | R incoerente | **C** | Qualità foto/video LSRF #45 (108) [settore] · effetto upload variabile per settore [settore] Sterling Sky near-me 2025 · geotag EXIF: test 27 schede, esito nullo/negativo [fatto sul dato, USA] https://searchengineland.com/geotagging-photos-google-business-profile-rank-453525 (2025-03-25) · foto/video AI = fattore negativo [settore] LSRF |
| Post | — | C (engagement) | Test 9 settimane, 3 schede, 441 keyword: nessun effetto [settore] https://www.sterlingsky.ca/do-google-posts-impact-ranking/ (2021-07-26) · frequenza post LSRF **#148** (score 55) [settore] — la pista riportava «#55», che è il punteggio: corretto qui |
| Recensioni (numero, recency, rating) | **R alto** | **C alto** | LSRF #6 rating 4-5, #9 quantità con testo, #11 recency, #14 afflusso costante [settore] · recensioni del mese contano più del totale, correlazione su 8.186 schede [settore] Sterling Sky 2025 · soglia 10 recensioni [settore] https://www.sterlingsky.ca/number-of-reviews-impact-ranking/ (2025-04-30). Fuori scope ConsulBuild (decisione 9): solo monitor. |
| Risposte alle recensioni | — | C | LSRF #122 (70); keyword nelle risposte tier F [settore] |
| Link al sito (URL) | R (contenuto della pagina collegata) | C | Tier A [settore] · keyword nel title della landing LSRF #17 (146) [settore] · test 2 schede-professionista USA: pagina servizio meglio; opinione autrice: homepage per la maggior parte; dopo il Diversity Update non collegare la pagina già n.1 in organico [contestato] https://www.sterlingsky.ca/does-the-url-you-link-to-in-google-my-business-impact-ranking-in-the-local-pack/ (2024-09-30, agg. 2025-02) · https://www.sterlingsky.ca/googles-new-diversity-update/ (2025-04-14) |
| URL che reindirizza ad altro dominio | **R negativo** | — | score negativo 115, rischio sospensione 115 (top 10 sospensioni) [settore] LSRF · vietati URL che reindirizzano altrove [fatto] https://support.google.com/business/answer/3038177 |
| NAP del sito = NAP scheda | R medio | C | LSRF #15 (153); coerenza citazioni #28 [settore] |
| UTM | — | — (misura) | nessun test; rischio perdita UTM per redirect http/https o www [settore] https://localsearchforum.com/threads/utm-parameters-stripped-from-google-business-profile-website-url.62562/ |
| Telefono | — | C | nessun fattore specifico; clic-to-call LSRF #57 (comportamentale) [settore] |
| Link attività (prenota/preventivo) | — | C | tier C «URL appuntamenti» [settore]; per edilizia italiana nessuna evidenza d'uso |
| Social, WhatsApp/SMS | — | C | social tier C (dati aggiuntivi a Google), SMS/WhatsApp tier D [settore] |
| Data di apertura | — | C (anni di attività) | Google può mostrare gli anni di attività [fatto] https://support.google.com/business/answer/3039617?hl=it |
| Prodotti | — (edilizia) | C | pensati per negozi di beni fisici [fatto] https://support.google.com/business/answer/9124203?hl=it |
| Q&A | campo dismesso | — | API spenta 2025-11-03 [fatto] https://developers.google.com/my-business/content/sunset-dates |
| Scheda verificata | R | C | LSRF #29 (123) [settore]; Google: le schede verificate «hanno maggiori probabilità» di comparire [fatto] https://support.google.com/business/answer/7091?hl=it |

Cosa dice Google in prima persona: tre fattori (pertinenza, distanza, prominenza); informazioni complete e scheda verificata aiutano; il ranking non si compra. Nessuna pagina Google dice che foto, post, descrizione o risposte migliorino il ranking. [fatto] https://support.google.com/business/answer/7091?hl=it

Nota sui pesi: i percentuali per gruppo (es. «GBP 32%», «prossimità 55%») non sono nel testo Whitespark. Non usarli. [contestato]

---

## 2. Regole e rischi campo per campo

Legenda rischio: **V** = può chiedere di verificare di nuovo · **S** = rischio sospensione · **R** = modifica rifiutata/rimossa.

| Campo | Regole e divieti | Rischio | Evidenza |
|---|---|---|---|
| Nome | Nome reale di insegna, sito, cancelleria. Vietati: slogan, servizi, località, ®/™, MAIUSCOLE, orari, telefono, URL, nomi bilingue ripetuti (dal 2026-08). Forma legale solo se usata davvero. | V (cambio dopo verifica «potresti») · S (keyword) | [fatto] https://support.google.com/business/answer/3038177 · https://support.google.com/business/answer/3039617?hl=it · bilingue [settore] https://www.seroundtable.com/google-business-profiles-disallows-repeated-bilingual-names-41839.html (2026-08-10) · keyword nel nome: rischio sospensione score 125 [settore] LSRF |
| Categorie | 1 principale + «al massimo altre nove». Il minor numero possibile, le più specifiche, «Questa attività È», non «HA». Mai come keyword. Niente categorie personalizzate. Modifiche «significative» possono essere rifiutate. | V («potrebbe esserti chiesto») · R | [fatto] https://support.google.com/business/answer/3039617?hl=it (riletta oggi: «Puoi scegliere al massimo altre nove categorie») · https://support.google.com/business/answer/7249669?hl=it · https://support.google.com/business/answer/13762416 |
| Servizi | Predefiniti per categoria + personalizzati. Nome personalizzato senza prezzi, telefoni, dati personali, volgarità: rifiuto automatico. API: nome libero consigliato ≤140, descrizione ≤250 (libero) o ≤300 (strutturato). Duplicati rimossi. Numero massimo: non trovato. | R | [fatto] https://support.google.com/business/answer/9455399?hl=it · https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations |
| Descrizione | ≤750 caratteri. Nessun URL né HTML. Non centrarla su promozioni, prezzi, saldi. Contenuto: cosa offri, cosa ti distingue, da quanto eserciti. | R · keyword stuffing = negativo (score 21, sospensione 35); testo AI = negativo (31/25) | [fatto] https://support.google.com/business/answer/3039617?hl=it · [settore] LSRF 2026 |
| Indirizzo / SAB | Niente caselle postali (sospensione) né uffici virtuali; coworking solo con insegna, personale, ricevimento. Senza clienti in sede: nascondere l'indirizzo. Una SAB = una scheda. Max 20 aree, entro ~2 ore di guida. | V (spostamento: «devi») · S (casella postale; SAB con indirizzo visibile: sospensione score 105) | [fatto] https://support.google.com/business/answer/3038177 · https://support.google.com/business/answer/9157481 · https://support.google.com/business/answer/13762416 · [settore] LSRF |
| Orari | Orari rivolti ai clienti. Speciali: max 6 giorni consecutivi; 7+ giorni = chiusura temporanea. `specialHours` non impostabile senza `regularHours`. | R | [fatto] https://support.google.com/business/answer/6303076 · accounts.locations |
| Telefono | Principale + max 2 aggiuntivi; numero controllato dall'attività; niente numeri a pagamento né che reindirizzano. | R | [fatto] https://support.google.com/business/answer/3038177 |
| Sito | URL completo, Googlebot non bloccato, niente redirect verso altro dominio o social. | S (redirect cross-dominio, score 115) | [fatto] https://support.google.com/business/answer/3038177 · [settore] LSRF |
| Link attività | Landing dove l'azione si completa; niente social, messaggistica, app store, shortener. Crawler `Google-BusinessLinkVerification` ignora robots.txt, vuole 200 senza CAPTCHA o blocchi: da non bloccare su Cloudflare. Non disponibili via API né fogli di lavoro. Massimo: help IT «fino a dieci link per categoria» vs policy EN «20 per tipo». | R (link irraggiungibile rimosso) | [fatto] https://support.google.com/business/answer/13769188 · https://support.google.com/business/answer/6218037?hl=it (riletta oggi) · numero massimo [contestato] |
| Foto e video | Foto JPG/PNG 10 KB-5 MB, min 250×250. Scattate da te; vietati stock, screenshot, collage, foto molto ritoccate o create da altri; evitare testo e bordi. Video ≤30 s. | R · foto AI: divieto esplicito non trovato, rischio sospensione score 45 [settore] | [fatto] https://support.google.com/business/answer/6103862 · https://support.google.com/contributionpolicy/answer/7411351 |
| Post | Niente telefono nel testo; archiviati dopo 6 mesi. | R · stuffing nei post: negativo (38/51) | [fatto] https://support.google.com/business/answer/7662907 · [settore] LSRF |
| Attributi | Fattuali (titolare) e soggettivi (clienti); alcuni solo per paese/categoria; applicazione fino a 30 giorni. Google li aggiunge e toglie «without API changes»: l'assenza nel changelog non prova nulla. | basso | [fatto] https://support.google.com/business/answer/9049526 · https://developers.google.com/my-business/reference/businessinformation/rest/v1/Attributes (agg. 2024-10-16) |
| Pin (`latlng`) | Si sposta la mappa finché il pin punta all'attività, poi Salva. Via API modificabile solo da «approved clients». SAB con indirizzo nascosto: si vede solo l'area servita. Se spostare il pin riapra la verifica: non trovato (la riverifica è esplicita solo per il cambio di indirizzo). | V (non documentato) | [fatto] https://support.google.com/business/answer/2853879?hl=en · accounts.locations |
| Social | Un link per piattaforma (Facebook, Instagram, LinkedIn, Pinterest, TikTok, X, YouTube); «available in select regions», paesi non indicati; Google può aggiungerli da solo. | basso | [fatto] https://support.google.com/business/answer/13580646?hl=en |
| Chat | Solo scheda verificata; WhatsApp o SMS; «alcune regioni». In Italia configurabile secondo test di luglio 2025. | basso | [fatto] https://support.google.com/business/answer/15013580?hl=it · [settore] https://www.linkmobility.com/it/blog/whatsapp-nelle-schede-google-per-messaggiare-con-gli-utenti |
| Recensioni | Vietati incentivi, gating, pressioni, quote allo staff (agg. 2026-04-17). Mai dati personali nelle risposte (Garante: ammonimenti 2021 e 2025). | S · GDPR | [fatto] https://support.google.com/contributionpolicy/answer/7400114?hl=en · https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10191645 |

### 2.1 Sospensioni: cosa è dimostrato

- Google elenca solo cause di policy (casella postale, attività inesistente, account con violazioni, titolare inattivo). Non parla di numero o frequenza delle modifiche. [fatto] https://support.google.com/business/answer/13762416 · https://support.google.com/business/answer/4569145
- «Modifiche eccessive a sezioni importanti» è 1 delle 5 cause di Sterling Sky, con il consiglio di distribuirle una al giorno, soprattutto nei settori a spam. È euristica d'agenzia, non misura. [settore] https://www.sterlingsky.ca/top-reasons-google-my-business-suspended-your-listing/ (2026-03-10)
- Un professionista italiano indica ad alto rischio due campi core (nome, categoria, indirizzo, telefono) cambiati insieme. [settore] https://pietrorogondino.com/sospensione-google-business-profile-cause-e-come-recuperare-la-scheda/ (2026-04-30)
- «Soft/hard» sono termini di settore usati in modo non uniforme (Whitespark e Sterling Sky danno a «disabled» significati diversi). [contestato] https://whitespark.ca/blog/unverified-vs-disabled-vs-suspended-gbps-whats-the-difference/ · https://www.sterlingsky.ca/difference-between-disabled-and-suspended-gbp/
- Per il software: usare gli stati API `BUSINESS_LOCATION_SUSPENDED` / `BUSINESS_LOCATION_DISABLED`, verifica pendente, conflitto di proprietà. [fatto] https://developers.google.com/my-business/reference/verifications/rest/v1/locations/getVoiceOfMerchantState
- Ricorsi in UE: strumento ricorsi anche per modifiche rifiutate e media; decisione «fino a 5 giorni lavorativi»; nel reale 1-6 settimane. [fatto] https://support.google.com/business/answer/13597551 · [settore] Sterling Sky 2026-03-10
  - Differenza per regione [fatto, stessa URL]: UK e SEE (Italia inclusa) usano lo strumento ricorsi per le «Rejected business information edit (name, category, address, phone, website)»; il resto del mondo, USA inclusi, deve contattare Google. Prove richieste: registro imprese, licenza, certificati fiscali o bollette con nome e indirizzo coincidenti. Se anche un Gestore possa fare ricorso: non trovato.
- Stati ufficiali da usare nel monitor: «suspended», «disabled», «restricted» (account). La differenza suspended/disabled non è definita da Google: non trovato. [fatto] 4569145

**Regola proposta (prudenziale, non di Google):** massimo un campo core al giorno (nome, categoria primaria, indirizzo, telefono, sito); gli altri campi a gruppi piccoli nei giorni successivi. Mai durante una verifica pendente (cartolina: non modificare nome, indirizzo, categoria [fatto] https://support.google.com/business/answer/7107242).

### 2.2 Regole per l'agenzia (vincolano il contratto del servizio)

- Consenso scritto o azione attiva (casella in un modulo). Cliente sempre proprietario; agenzia gestore. [fatto] https://support.google.com/business/answer/7353941?hl=it (riletta oggi)
- Informare il cliente di tutte le modifiche. Dire per iscritto che il Profilo è gratuito e quali sono le commissioni. Link visibile all'avviso «Collaborare con terze parti» sul sito dell'agenzia e via email. Vietato garantire il miglior posizionamento. Restituire il controllo esclusivo entro 7 giorni lavorativi. [fatto] stessa URL
- Policy API: niente azioni automatizzate senza consenso «specifico ed espresso»; avviso al cliente entro 48 ore da ogni modifica fatta dal tool. [fatto] https://developers.google.com/my-business/content/policies (agg. 2026-08-28)
- Policy API, «Transparency»: «When you report and manage Business Profile data, be transparent to your customers.» [fatto] stessa URL

### 2.3 Ciclo di vita di una modifica fatta a mano

Serve a G2: dice quando una voce «fatta» si può dire davvero online.

**Cosa dice Google [fatto]:**
- Stati in UI: Accepted («displays on your Business Profile»), Not approved («Google might not approve changes if it can't confirm its accuracy»), Pending («still under review»). Tempi: «Edits usually take up to 10 minutes to review, but sometimes it can take up to 30 days.» https://support.google.com/business/answer/3038311?hl=en (senza data)
- `locations.get`: «Returns the specified location as last set by the merchant. It may not reflect updates from Google or user-generated content that are live on Google Maps.» https://mybusinessbusinessinformation.googleapis.com/$discovery/rest?version=v1 (revision 20260913)
- `Metadata.hasPendingEdits`: booleano di scheda, qualche campo è «in the edit pending state». `Metadata.hasGoogleUpdated`: il place ha aggiornamenti «that need to be updated or rejected by the client». (stessa discovery)
- `getGoogleUpdated` restituisce due maschere (stessa discovery):
  - `diffMask`: «The fields where the values in the view as it appears to consumers are different than the merchant's information.»
  - `pendingMask`: «The fields where the merchant has provided an update that is currently in flight and hasn't yet been published to Maps and Search.»
- Guida accetta/rifiuta (agg. 2026-08-28): sui campi in `diffMask` «You must accept or reject»; sui campi in `pendingMask` «You do not need to take action». Accettare = patch col valore di Google; rifiutare = patch col valore preferito. Notifica Pub/Sub `GOOGLE_UPDATE`. Nessun tempo indicato. La guida scrive `isGoogleUpdated`, lo schema `hasGoogleUpdated`: il codice legge lo schema. https://developers.google.com/my-business/content/accept-or-reject-updates
- Verifica in corso: «Do not edit your business name, address, or category». La verifica può essere richiesta di nuovo se «Business details were recently updated». Metodi elencati: telefono/SMS, email, videochiamata, cartolina. https://support.google.com/business/answer/7107242?hl=en

**Cosa non si sa:**
- Un segnale API di modifica «rifiutata»: non trovato (né campo né notifica). Ipotesi da provare: il campo esce da `pendingMask` ed entra in `diffMask`, forse con `hasGoogleUpdated=true`. [inferenza]
- Se `pendingMask` distingua revisione umana e propagazione: non documentato.
- Tempi reali misurati con metodo nel 2025-2026: non trovati. Sterling Sky elenca i campi sovrascritti più spesso (orari, categoria primaria, servizi/attributi, nome, indirizzo, telefono) e 4 fonti di modifica (sito, app terze via API, altri gestori, utenti), senza misure [settore] https://www.sterlingsky.ca/google-keeps-updating-changing-listing/ (2025-01-09). Thread «Pending edits for almost 2 months» [contestato, aneddoto] https://support.google.com/business/thread/318613587

**Novità di settembre 2026 (non riguardano le modifiche del gestore):**
- Email «Does this look right to you»: parte da una modifica suggerita da un utente Maps (esempio: il nome); si chiede conferma entro 4 giorni; conseguenze se ignorata non dichiarate. Segnalazione di un utente su X. [settore] https://www.seroundtable.com/gbp-does-this-look-right-to-you-email-42030.html (2026-09-08). Per G2: indizio che un campo cambierà senza di noi.
- Verifica con foto della facciata con insegna fissa: test osservato, documentazione Google non aggiornata. [contestato] https://www.seroundtable.com/google-business-profiles-business-photo-verification-42019.html (2026-09-04). Rischio per le imprese edili senza sede aperta al pubblico: niente insegna da fotografare. Paesi e condizioni: non trovati.

**Macro-stati proposti per G2** (derivati dai fatti sopra; soglie da tarare col test §10 G2):

| Stato | Condizione |
|---|---|
| fatto (inviato) | Mattia ha salvato; `locations.get` mostra il valore. Non prova la pubblicazione. |
| in-revisione | campo in `pendingMask` o `hasPendingEdits=true`. Mai «divergente» prima di 30 giorni. |
| verificato | campo fuori da `pendingMask`, fuori da `diffMask`, vista pubblica (DataForSEO) uguale al valore inviato. |
| rifiutato | campo uscito da `pendingMask` ed entrato in `diffMask`, oppure `hasGoogleUpdated=true` con valore diverso. Per nome, categoria, indirizzo, telefono, sito: indicare la via del ricorso SEE. |
| divergente | stesso segnale di «rifiutato», ma su un campo già «verificato»: dopo la pubblicazione l'hanno cambiato Google o un utente. |

---

## 3. Campo della scheda → fonte dati automatica

**Livello:** A = automatico · S = semi-automatico (il software propone, Mattia conferma) · M = manuale.
**Costi:** Business Profile API: nessuna tariffa per chiamata trovata, solo quote (300 QPM per API) [fatto] https://developers.google.com/my-business/content/limits — prezzo esplicito «gratis»: non trovato. Prezzi DataForSEO in USD letti oggi sulle pagine prezzi pubbliche. L'aumento del 2026-07-01 riguarda 8 API (Backlinks, Labs, Keywords Data, On-Page e altre; nella Business Data solo Business Listings Search e Categories Aggregation): **Google Maps SERP e My Business Info non ci sono** [fatto] https://dataforseo.com/update/pricing-update-in-dataforseo-apis. I prezzi dentro il dashboard (serve login) non sono stati riletti. Pagamento minimo 50 $ [settore, da estratto di ricerca].

Host abbreviati: **BI** = `https://mybusinessbusinessinformation.googleapis.com/v1` · **PERF** = `https://businessprofileperformance.googleapis.com/v1` · **V4** = `https://mybusiness.googleapis.com/v4` · **VER** = `https://mybusinessverifications.googleapis.com/v1` · **PA** = `https://mybusinessplaceactions.googleapis.com/v1` · **DFS** = `https://api.dataforseo.com/v3`.

| Campo | Fonte automatica (endpoint → campo) | Livello | Costo | Rischio | Evidenza |
|---|---|---|---|---|---|
| Stato attuale di tutta la scheda | BI `GET /locations/{id}?readMask=title,storefrontAddress,phoneNumbers,categories,websiteUri,regularHours,specialHours,moreHours,serviceArea,labels,latlng,openInfo,profile,serviceItems,metadata` — restituisce il valore **inviato dal titolare**, non quello pubblico (§2.3) | A | API, quota | nessuno (lettura) | [fatto] https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations |
| Nome | lettura BI `title`; confronto con `dati.json` nome d'uso (T3), `contesto.json`, visura | S (solo segnalazione) | 0 | alto se si propone di cambiarlo | [fatto] 3038177 |
| Categoria primaria | competitor: DFS `serp/google/maps/live/advanced` → `category`, `additional_categories`, `category_ids`; catalogo IT: BI `GET /categories?regionCode=IT&languageCode=it&view=FULL` e `categories:batchGet` (nomi nel formato `gcid:electrician`); `category_ids` DFS → aggiungere il prefisso `gcid:` e scartare gli ID assenti dal catalogo GBP [inferenza forte, §4.4]; fallback senza API: PlePer (via GET gratuito solo nomi inglesi + GCID) + fabriziodelrio (nomi IT senza GCID, data ignota) | S | $0,0006/SERP standard, $0,002 live | V · caso HVAC | [fatto] https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/ · https://dataforseo.com/pricing/serp/google-maps-serp-api · https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/list · [settore] https://pleper.com/index.php?do=tools&sdo=gmb_categories |
| Categorie aggiuntive | come sopra + DFS `business_data/google/my_business_info` per il dettaglio dei top competitor | S | $0,0015/profilo standard | V · [contestato] quante | [fatto] https://docs.dataforseo.com/v3/business_data/google/my_business_info/live/ · https://dataforseo.com/pricing/business-data/business-data-api |
| Servizi predefiniti | BI `categories:batchGet` o `categories.list view=FULL` → `serviceTypes[]` (`serviceTypeId` nel formato `job_type_id:install_fan`, displayName) per IT; attuali: BI `serviceItems.structuredServiceItem`. «Predefined services listed might differ based on the category and country. They are dynamic and can change at any time.» Esempio fuori USA solo Singapore; esistenza per l'Italia non verificata | S (match coi servizi reali) | 0 | basso | [fatto] https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/batchGet · https://developers.google.com/my-business/content/services (agg. 2026-08-28) |
| Servizi personalizzati | `contesto.json` servizi atomizzati + site.json; attuali: BI `serviceItems.freeFormServiceItem`; competitor: DFS My Business Info `services` (popolamento per schede IT: non verificato) | S | 0 / $0,0015 | R se nome con prezzi | [fatto] accounts.locations |
| Può modificare i servizi? | BI `metadata.canModifyServiceList` | A | 0 | — | [fatto] accounts.locations |
| Descrizione | bozza da `contesto.json` via `claude -p` + gate; attuale: BI `profile.description` | S (Mattia rilegge) | quota Max | stuffing/testo AI = negativo [settore] | [fatto] 3039617 |
| Attributi | disponibili: BI `GET /attributes?parent=locations/{id}` o `?categoryName=categories/{id}&regionCode=IT&languageCode=it`; impostati: BI `GET /locations/{id}/attributes` (`getAttributes`); valori: `dati.json` | S | 0 | basso | [fatto] https://developers.google.com/my-business/reference/businessinformation/rest/v1/attributes/list |
| Orari / speciali / altri | `dati.json` (T3) o `contesto.json`; attuali BI `regularHours`, `specialHours`, `moreHours`; tipi disponibili: `moreHoursTypes` della categoria | S | 0 | orari falsi = rischio fiducia | [fatto] accounts.locations |
| Indirizzo / area servita | `contesto.json` + `dati.json` comuni (codici ISTAT in `site-intake/data-src/comuni.json`); attuali BI `storefrontAddress`, `serviceArea` (`businessType`, `places`, max 20) | S | 0 | V · S | [fatto] accounts.locations · 9157481 |
| Telefono | site.json / contesto; attuale BI `phoneNumbers` | A (confronto) | 0 | V (può) | [fatto] 3039617 |
| Sito + UTM | `siteUrl` del cliente + UTM; attuale BI `websiteUri`; controllo HTTP (fetch con redirect manuale) | A | 0 | S se redirect cross-dominio | [fatto] 3038177 |
| Link attività (preventivo/prenota) | **non via API Business Profile** (help); esiste però Place Actions `PA GET /locations/{id}/placeActionLinks` (list, get, create, patch, delete; campi `uri`, `placeActionType` es. `APPOINTMENT`/`ONLINE_APPOINTMENT`, `isEditable`, `isPreferred`) e `GET /placeActionTypeMetadata`. Attributi URL di prenotazione (`url_appointment` o simili): non documentati | M finché la chiamata 3 (§8.3) non risponde; A in lettura se `placeActionLinks.list` restituisce link | 0 | R se link rotto | [contestato] https://support.google.com/business/answer/6218037?hl=it vs https://developers.google.com/my-business/reference/placeactions/rest/v1/locations.placeActionLinks (dati da estratto di ricerca; la guida `content/place-actions` dà 404) |
| Data di apertura | `contesto.json`/`dati.json`; attuale BI `openInfo.openingDate` | S | 0 | basso | [fatto] accounts.locations |
| Social | valori: site.json (link social del cliente). Lettura: `Location` v1 non ha campi social [fatto]; la help dice che si aggiornano in blocco con le «Business Profile APIs» [fatto]; l'unico canale possibile sono gli attributi con `valueType` URL (`uriValues[].uri`), nomi degli attributi social non trovati (l'unico attributo URL documentato è `attributes/url_menu`). Una fonte secondaria dice «cannot yet be added via the API» [contestato] | M; A se la chiamata 1 (§8.3) restituisce attributi URL social | 0 | basso | https://support.google.com/business/answer/13580646?hl=en · https://developers.google.com/my-business/reference/businessinformation/rest/v1/Attributes · https://developers.google.com/my-business/content/attributes (agg. 2026-08-28) · https://www.soci.ai/knowledge-articles/add-social-media-links-to-google-business-profile/ [contestato] |
| Pin sulla mappa | attuale: BI `latlng`, restituito **solo** se accettato alla creazione o modificato dal sito di Business Profile; se manca, il pin coincide col geocoding di `storefrontAddress` (non è un errore). Fallback: Places (lat, lng, place_id ammessi anche nei termini SEE) o geocoding dell'indirizzo | A (confronto) | 0 | V non documentato | [fatto] accounts.locations («can only be updated by approved clients») · https://developers.google.com/maps/comms/eea/places |
| Chat WhatsApp/SMS | campo API: non trovato | M | 0 | basso | [fatto] 15013580 |
| Foto e video | attuali: V4 `GET /accounts/{a}/locations/{l}/media` (del titolare), `media.customers.list` (clienti); nuove foto: **solo foto reali del cliente** (Drive `_inbox`, max 15 dal form) | M (scelta e caricamento) | 0 | foto AI = negativo; stock vietato | [fatto] https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media/list |
| Recensioni (monitor) | V4 `GET .../reviews` → `averageRating`, `totalReviewCount`, `updateTime`; competitor: DFS Maps SERP `rating` | A | 0 / incluso nella SERP | GDPR nelle risposte | [fatto] https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list |
| Modifiche di Google/utenti e stato delle nostre modifiche | BI `metadata.hasGoogleUpdated`, `metadata.hasPendingEdits` + `GET /locations/{id}:getGoogleUpdated?readMask=…` → `diffMask` (vista pubblica ≠ valore del titolare), `pendingMask` (modifica del titolare non ancora pubblicata); opz. Pub/Sub `GOOGLE_UPDATE`. Segnale «rifiutata»: non trovato (§2.3) | A | 0 (Pub/Sub: costo non trovato) | — | [fatto] https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/getGoogleUpdated · https://developers.google.com/my-business/content/accept-or-reject-updates |
| Stato verifica/sospensione | VER `GET /locations/{id}/VoiceOfMerchantState` | A | 0 | — | [fatto] getVoiceOfMerchantState |
| Keyword (volumi, onboarding) | Google Ads API `KeywordPlanIdeaService.GenerateKeywordIdeas` (gratis); oppure DFS `keywords_data/google_ads/search_volume` (max 1.000 keyword/task) — nei comuni piccoli molti `null`. Riuso: `mappa-query.json` di T4 | A | Ads 0; DFS $0,06/task standard | volumi assenti | [fatto] https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas · https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-live/ |
| Keyword reali della scheda | PERF `GET /locations/{id}/searchkeywords/impressions/monthly` → `searchKeyword`, `insightsValue.value` o `.threshold` | A | 0 | ritardo fino a 5 giorni | [fatto] https://developers.google.com/my-business/reference/performance/rest/v1/locations.searchkeywords.impressions.monthly/list · https://support.google.com/business/answer/9918094 |
| Vista pubblica senza accesso | DFS My Business Info (`cid:`/`place_id:`) → `description`, `category`, `attributes`, `work_time`, `services` (con prezzi), `place_topics`, `popular_times`, `local_business_links`, `is_claimed`, `people_also_search`; quali arrivano vuoti su schede italiane: non documentato, non testato. Places API Place Details (FieldMask; Enterprise 1.000/mese gratis) | A | $0,0015 standard, $0,0054 live / 0 nei limiti | Places: termini SEE per l'Italia; DFS: termini §7.1-7.2 (§7) | [fatto] https://docs.dataforseo.com/v3/business_data/google/my_business_info/live/ · https://developers.google.com/maps/documentation/places/web-service/place-details · https://developers.google.com/maps/comms/eea/places |

Da NON usare: endpoint `GoogleLocations` per analizzare concorrenti (revoca dell'accesso). [fatto] https://developers.google.com/my-business/content/policies · Places API per le categorie secondarie: non le restituisce. [fatto] https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places

---

## 4. Come scegliere categoria primaria e secondarie (algoritmo ripetibile)

### 4.1 Input

- **Servizi reali**: `contesto.json` (servizi atomizzati, macro-categorie, promessa martello) + `dati.json` (T3) + servizi presenti sul sito. È l'unica fonte ammessa per il test «È».
- **Query**: `mappa-query.json` di T4 se esiste; altrimenti `servizio reale × comune sede` + `mestiere generico × comune` (es. «impresa edile Monza»).
- **Punti**: coordinate della sede (o del centroide del comune per le SAB) + 4 punti a ~2-3 km. Stima nostra, da calibrare.
- **Catalogo IT**: `categories.list` (IT/it, FULL). Prima dell'approvazione API: tabella §4.4 (GCID da PlePer in inglese, nomi IT da fabriziodelrio, abbinamento nostro da confermare).

### 4.2 Passi

1. **Raccolta.** Per ogni query × punto: DFS Maps SERP con parametri fissati, altrimenti i punteggi non sono ripetibili:
   - `device: mobile` (restituisce al massimo 20 risultati: è anche il tetto di `depth`) [fatto];
   - `depth` 20: costa **quanto** 100, la fatturazione è «per each SERP containing up to 100 results» [fatto];
   - `location_coordinate` nel formato `"lat,lng,zoom"`, zoom da 3z a 21z, default 17z [fatto]; lo zoom da usare **non è fissato**: la doc non dice quanto cambia il risultato né che raggio copre (non trovato). Protocollo di taratura in §10 G1.
   Salvare per ogni risultato `rank_absolute`, `cid`, `category_ids`, `is_claimed`, `rating`, reviews. Costo tipico: 10 query × 5 punti = 50 SERP ≈ $0,03 standard. Fonti: https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/ · https://dataforseo.com/pricing/serp/google-maps-serp-api
2. **Pulizia.** Escludere il cliente stesso. Deduplicare per `cid`. Segnalare (non escludere) i competitor con keyword nel nome: il loro rank è gonfiato, il peso va ridotto (proposta: ×0,5, da calibrare).
3. **Punteggio per categoria.** Per ogni `category_id`: `score = Σ peso(rank) × peso(query)`, con `peso(rank)` = 1 per top 3, 0,5 per 4-10, 0,1 oltre; `peso(query)` = volume normalizzato se disponibile, altrimenti 1. Separare «come primaria» e «come aggiuntiva».
4. **Traduzione e filtro.** Prefisso `gcid:` davanti a ogni `category_id` DFS, poi `categories:batchGet(regionCode=IT, languageCode=it, view=FULL)` → nome italiano + `serviceTypes`. Scartare gli ID assenti dal catalogo GBP: DFS restituisce anche tipi di Maps che non sono categorie selezionabili (nella doc d'esempio `monument` non è nel catalogo PlePer, `tourist_attraction`, `sculpture`, `business_to_business_service` sì). Che la chiave coincida è [inferenza forte] dal formato, non ancora provata su schede reali (test live su 5 schede non eseguito: credenziali DFS non disponibili). https://developers.google.com/my-business/content/services · https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/
5. **Test «È» (gate, deterministico + umano).** Una categoria passa solo se:
   - almeno un servizio reale del cliente coincide con la categoria o con un suo `serviceType` (match su dizionario sinonimi + conferma di Mattia);
   - il cliente la svolge come attività, non come prestazione accessoria («È un idraulico», non «HA un bagno da rifare»);
   - il sito ha (o avrà con T5) una sezione o pagina che la nomina.
   Senza prova → scartata, con motivo.
6. **Primaria.** Tra le categorie che passano, quella con score «come primaria» più alto sul cluster di query del servizio principale del cliente (promessa martello / servizio più redditizio da `dati.json`). A parità: la più specifica che rappresenta l'attività principale. [fatto] regola Google 3038177
7. **Primaria attuale diversa?** Non cambiarla in automatico. Proporre il cambio solo se la candidata supera l'attuale in modo netto (proposta: score ≥ 1,5×) e la attuale fallisce il test «È». Stato `rischio: riverifica`, un giorno dedicato, geogrid prima e dopo. Motivo: caso HVAC [settore] e riverifica [fatto].
8. **Secondarie.** Tutte le categorie che passano il test «È», ordinate per score, max 9. Nessun obiettivo numerico. Categorie a score zero ma vere (mestiere reale non presente nei competitor) restano ammesse. Categorie ad alto score ma non vere: mai.
9. **Uscita.** Per ogni categoria: nome IT, `gcid`, score, query dove compare, n. competitor in top 3, servizio reale che la giustifica, fonti, data.

### 4.3 Limiti

- Fedeltà della SERP DataForSEO per coordinata rispetto a un telefono reale: nessuno studio trovato. [contestato]
- Correlazione, non causa: i competitor possono essere in alto per recensioni o prossimità, non per la categoria. [settore]
- Nei comuni piccoli pochi risultati: punteggi instabili. Il software deve dire «dati insufficienti» sotto una soglia (proposta: < 5 competitor distinti).
- Nessun dato italiano né sull'edilizia; BrightLocal non trova pattern per gli elettricisti. [settore]
- Termini DataForSEO: letti (§7). Il rischio verso Google è a carico del cliente di DataForSEO, cioè ConsulBuild.
- Zoom della SERP non tarato: finché il test non gira, punteggi e share of visibility sono «non ripetibili».
- Numero di secondarie: il conflitto Google vs Sterling Sky resta aperto; la regola «solo mestieri veri» è compatibile con entrambi. [contestato]

### 4.4 Mestieri ConsulBuild: nomi italiani e GCID candidati

Fonti: GCID e nomi inglesi da PlePer (4.034 GCID, via GET con `lang=en`; con `lang=it` e `country=92` restituisce 0 categorie, forse le lingue diverse dall'inglese non sono gratuite via GET, limite non indicato) https://pleper.com/index.php?do=tools&sdo=gmb_categories · nomi italiani da https://fabriziodelrio.com/elenco-categorie-google-my-business (senza GCID, senza data, titolo ancora «Google My Business»: può essere vecchio) [settore]. **L'abbinamento riga per riga è nostro, per somiglianza [inferenza]**: va confermato con una `batchGet(languageCode=it, regionCode=IT)` o a vista nell'editor della scheda. La pista «dati-e-strumenti» dava PlePer con italiano incluso: non riprodotto via GET il 2026-09-14.

| Mestiere | Nome IT (fabriziodelrio) | GCID candidato (PlePer, EN) |
|---|---|---|
| Impresa edile | Impresa edile · Impresa di costruzioni · Appaltatore | `general_contractor` · `construction_company` · `contractor` (quale nome IT va con quale GCID: ambiguo) |
| Ristrutturazioni | Servizi di ristrutturazione · Ristrutturatore di bagni · Esperto nella ristrutturazione di cucine | `remodeler` · `bathroom_remodeler` · `kitchen_remodeler` |
| Idraulico | Idraulico · Servizio di riparazioni idrauliche | `plumber` · secondo non abbinato |
| Elettricista | Elettricista · Servizio di installazione elettrica | `electrician` · `electrical_installation_service` |
| Imbianchino | Imbianchino | `painter` («Painter and Decorator») |
| Cappotto / isolamento | Ditta specializzata in coibentazione | `insulation_contractor` |
| Serramenti | Servizio di installazione di finestre · Fornitore di finestre · Negozio di finestre in PVC · Finestra di alluminio · Fornitore di porte | `window_installation_service` · `window_supplier` · `plast_window_store` o `pvc_windows_supplier` · `aluminum_window` · `door_supplier` |
| Mestieri vicini | Tuttofare · Ditta specializzata in lavori in muratura · Servizio di impermeabilizzazione · Ditta specializzata in impianti di riscaldamento · Posatore di piastrelle · Negozio di materiali per coperture | `handyman` · `masonry_contractor` · `waterproofing_company` · `heating_contractor` · `tile_contractor` · `roofing_supply_store`; senza nome IT trovato: `roofing_contractor`, `plaster_contractor`, `dry_wall_contractor`, `stucco_contractor`, `siding_contractor` |

Conseguenze [settore, sull'elenco IT]:
- Non esiste una categoria «cappotto termico»: la più vicina è la coibentazione. Il cappotto va trattato come **servizio**.
- Non esiste «serramenti»: solo categorie su finestre e porte. Il test «È» (§4.2 passo 5) sceglie tra queste.
- Servizi predefiniti per questi mestieri in Italia: nessuna prova diretta. La guida API mostra predefiniti fuori dagli USA (Singapore) [fatto]; la help en-GB cita «Install tap» per un idraulico [settore, da estratto di ricerca, forse solo traduzione] https://support.google.com/business/answer/9455399?hl=en-GB. La priorità «prima i predefiniti» (§5.1) resta basata su evidenza USA. [contestato per l'Italia]

---

## 5. Servizi, descrizione e keyword senza keyword stuffing

Principio (regola 5 del progetto): ogni voce ha una fonte in `contesto.json`, `dati.json` o nel sito. Ciò che non ha fonte non entra.

### 5.1 Servizi

1. Per ogni categoria scelta, leggere i `serviceTypes` IT. Prima controllare `metadata.canModifyServiceList` (richiesto dalla guida API [fatto] https://developers.google.com/my-business/content/services). Se la lista IT è vuota, tutti i servizi reali diventano personalizzati: esistenza dei predefiniti italiani non ancora verificata (§4.4).
2. Abbinare ogni servizio reale del cliente a un predefinito. Match deterministico su nome normalizzato + proposta LLM + conferma di Mattia.
3. Prima tutti i predefiniti abbinati (priorità ranking [settore]).
4. Servizi reali senza predefinito → personalizzati, legati alla categoria più vicina. Nome breve e concreto (≤140 caratteri consigliati [fatto]); niente prezzi, telefoni, città ripetute, emoji (il consiglio emoji di Sterling Sky non è testato).
5. Descrizione del servizio (≤300 strutturato, ≤250 libero [fatto]): facoltativa per il ranking, utile per la conversione [settore]. Solo fatti del contesto (materiali, fasi, garanzie dichiarate).
6. Prezzo: solo se `dati.json` ha un «prezzo da» esplicito. Mai stimato.
7. Keyword: la formulazione del nome segue le parole reali delle query (T4 o Performance API), ma resta una frase naturale. Un servizio = una keyword principale.

### 5.2 Descrizione (≤750 caratteri)

Struttura proposta, 3-4 frasi:
1. Chi è e cosa fa (mestiere principale + zona reale). Fonte: contesto.
2. Servizi principali (2-4, parole dei servizi scelti). Fonte: servizi confermati.
3. Cosa distingue, solo con prova (anni di attività da `openInfo`/contesto, attestati da `dati.json`, garanzie dichiarate).
4. Come si lavora (sopralluogo/preventivo gratuito: cortesia di settore ammessa dalla regola 5).

### 5.3 Gate deterministici (prima di mostrarla a Mattia)

| Gate | Regola | Base |
|---|---|---|
| Lunghezza | ≤750 caratteri descrizione; ≤140/≤250/≤300 servizi | [fatto] |
| Niente link | nessun `http`, `www.`, dominio, HTML | [fatto] |
| Niente telefoni ed email | regex telefoni IT ed email | [fatto] per post e servizi; prudenziale per descrizione |
| Niente promozioni e prezzi | nessun €, %, «sconto», «offerta», «promo» | [fatto] |
| Densità keyword | ogni servizio nominato ≤1 volta; comune/zona ≤2 volte; nessuna lista di comuni | proposta nostra contro lo stuffing (fattore negativo [settore]) |
| Anti-ripetizione | nessuna sequenza di 3+ parole ripetuta; nessuna frase uguale al copy del sito o di un altro cliente dello stesso mestiere | regola 6 del progetto + gate di similarità T5b |
| Tracciabilità | ogni claim ha un puntatore a un campo sorgente; claim senza fonte = FAIL | regola 5 |
| Superlativi | niente «il migliore», «leader», «n.1» senza prova | regola 5; divieto di promettere posizionamento [fatto] 7353941 |
| Testo AI | la bozza passa dal critico e da Mattia; mai pubblicata grezza | testo AI = fattore negativo [settore] |

### 5.4 Nome, foto, post

- **Nome**: nessuna proposta. Solo segnalazione se `title` ≠ nome d'uso reale.
- **Foto**: solo foto reali del cliente, senza testo sovrapposto. Le immagini FLUX generate per i siti **non** vanno mai sulla scheda (foto AI = fattore negativo [settore]; policy Maps su immagini manipolate o create da altri [fatto] https://support.google.com/contributionpolicy/answer/7411351). Nessun geotag (test nullo [fatto sul dato]).
- **Post**: fuori da G1 (nessun effetto ranking [settore]).

---

## 6. Allineamento scheda ↔ sito

### 6.1 Da dove leggere la scheda

- `locations.get` restituisce il valore **«as last set by the merchant»**: può non riflettere modifiche di Google o degli utenti già visibili su Maps. [fatto] §2.3
- La versione **pubblica** va ricavata così: `getGoogleUpdated` → `diffMask` (campi dove la vista pubblica differisce dal valore del titolare) e `pendingMask` (modifiche del titolare non ancora pubblicate); per il valore visto dagli utenti, DFS My Business Info sulla scheda del cliente. [fatto] URL §3 e §2.3
- Senza accesso: solo DFS My Business Info. [fatto]
- Quale lato del confronto usare: per l'allineamento **sito ↔ ciò che vedono i clienti** conta la vista pubblica; per sapere se una nostra voce è stata inviata conta `locations.get`.

### 6.2 Cosa confrontare

| Voce | Scheda | Sito | Normalizzazione | Mismatch = |
|---|---|---|---|---|
| Nome | `title` | site.json nome + footer/JSON-LD `name` | minuscole, spazi singoli, rimuovere punteggiatura; confronto con e senza forma legale (s.r.l., srls, s.n.c., di X) | alto se il sito non contiene il nome della scheda; segnalare keyword in più |
| Telefono | `phoneNumbers.primaryPhone` + `additionalPhones` | tel: nell'HTML, JSON-LD `telephone` | solo cifre; togliere `+39`/`0039`; confronto sulla sequenza nazionale | alto |
| Indirizzo | `storefrontAddress` (se visibile) | footer, JSON-LD `address` | via: espandere abbreviazioni (V.→Via, V.le→Viale, P.za→Piazza, C.so→Corso); civico, CAP, comune separati; confronto per componenti | alto su CAP/comune/civico; medio su grafia via |
| SAB | `serviceArea.businessType` | sito mostra indirizzo? | — | informativo: SAB con indirizzo sul sito è ammesso, ma se il sito dice «ricevimento su appuntamento in sede» la scheda dovrebbe essere ibrida |
| Area servita | `serviceArea.places` | comuni nominati sul sito / `dati.json` | codici ISTAT o nomi normalizzati | medio; oltre ~2 h di guida = alto |
| Pin | `latlng`; se assente, geocoding di `storefrontAddress` (assenza = pin sull'indirizzo geocodificato, §3) | JSON-LD `geo` di T1a | distanza in metri tra i due punti | `ok` ≤ 50 m (soglia **nostra**, non di Google); `diverso` sopra; `n/a` per SAB con indirizzo nascosto, che non devono pubblicare `geo` sul sito. Evidenza: campo [fatto]; pin corretto LSRF #10 [settore] |
| Orari | `regularHours.periods` | orari sul sito/JSON-LD `openingHours` | intervalli per giorno in minuti; 24:00 = fine giornata; giorni chiusi espliciti | alto se il sito e la scheda dicono cose diverse |
| Categorie ↔ contenuti | primaria + aggiuntive | sezioni o pagine servizio | per ogni categoria: esiste testo che nomina la categoria o un suo servizio? | medio (categoria senza pagina) |
| Servizi | `serviceItems` | testo della pagina collegata | per ogni servizio della scheda: presente nella landing? (le justification leggono il sito [settore] https://www.sterlingsky.ca/google-business-profile-landing-pages/ 2023-02-13) | medio |
| Descrizione | `profile.description` | copy del sito | nessun claim nella scheda assente dal contesto | alto se claim non tracciabile |
| Sito | `websiteUri` | `siteUrl` in client.json | schema https, host senza `www` o col `www` come il canonical, path, UTM | vedi 6.3 |
| JSON-LD | — | `LocalBusiness` di T1a | stessi campi della riga NAP | medio |

### 6.3 Link del sito e UTM

- Controllo HTTP (senza seguire i redirect in automatico): 200 finale, nessun salto verso altro dominio, stesso host del canonical, UTM ancora presenti nell'URL finale. [fatto] regola redirect 3038177; [settore] perdita UTM LSF
- Caso da coprire: dopo il deploy la demo `*.demo.consulbuild.com` si spegne. Una scheda che punta ancora alla demo = redirect o 404 = rischio alto.
- UTM proposti (convenzione nostra, non di Google): `?utm_source=google&utm_medium=organic&utm_campaign=gbp`. Nessuna regola Google trovata sulle UTM (non trovato).
- Il crawler `Google-BusinessLinkVerification` non va bloccato da regole Cloudflare. [fatto] 13769188
- **Homepage o pagina servizio** (correzione alla richiesta e al digest):
  - default per sede singola: **homepage** con UTM [settore, opinione Sterling Sky];
  - pagina servizio solo se Search Console mostra che quella pagina rende meglio sulla query principale **e** non è già la pagina n.1 in organico per la stessa query (Diversity Update) [settore, USA, campione non dichiarato] https://www.sterlingsky.ca/googles-new-diversity-update/ (2025-04-14);
  - cambio misurato: geogrid e GSC 4 settimane prima/dopo. [contestato]

---

## 7. Monitoraggio

| Segnale | Fonte | Frequenza | Costo (50 clienti) | Note |
|---|---|---|---|---|
| Sospesa/disattivata, verifica pendente, duplicato | VER `VoiceOfMerchantState` | giornaliera | 0 | allarme immediato a Mattia |
| Modifiche di Google o utenti | BI `metadata.hasGoogleUpdated` → `getGoogleUpdated.diffMask` | giornaliera (polling; Pub/Sub non necessario) | 0 | con ruolo Gestore l'«accetta tutti gli aggiornamenti» in UI potrebbe essere solo dei proprietari [fatto, da ricontrollare a vista] https://support.google.com/business/answer/3403100?hl=en |
| Voci «fatto» davvero online | BI `metadata.hasPendingEdits` + `getGoogleUpdated` (`pendingMask`, `diffMask`) + vista pubblica DFS My Business Info, confrontati col `consigliato` | subito, +10 min, +1 h, poi giornaliera finché la voce non esce da «in-revisione» (fino a 30 giorni) | 0 API + $0,0015 per lettura DFS standard | macro-stati §2.3; `locations.get` da solo **non** basta |
| Allineamento sito | §6 | dopo ogni deploy + settimanale | 0 | |
| Link del sito | controllo HTTP | settimanale | 0 | |
| Metriche giornaliere | PERF `fetchMultiDailyMetricsTimeSeries` (`BUSINESS_IMPRESSIONS_*` ×4, `CALL_CLICKS`, `WEBSITE_CLICKS`, `BUSINESS_DIRECTION_REQUESTS`) | lettura mensile per il report | 0 | CALL_CLICKS = clic, non chiamate [settore] https://www.sterlingsky.ca/interpret-google-business-profile-performance/ (2025-03-26); `BUSINESS_CONVERSATIONS`: la vecchia chat è chiusa dal 2024-07-31 [fatto]; se conti i messaggi WhatsApp/SMS: non trovato |
| Keyword di ricerca | PERF `searchkeywords/impressions/monthly` | mensile, dal giorno 6 del mese | 0 | keyword sotto soglia = `threshold`, soglia non documentata |
| Recensioni cliente | V4 `reviews.list` | settimanale | 0 | numero, media, recensioni del mese |
| Recensioni e categorie competitor | dalla geogrid (DFS Maps SERP) | mensile | incluso | cambi di categoria dei concorrenti = segnale |
| Geogrid (share of visibility) | DFS Maps SERP con `location_coordinate` | **mensile**, 5 keyword, 7×7, `device: mobile`, `depth` 20 | 12.250 SERP ≈ **$7,35** standard, $24,50 live (Maps SERP non è nell'aumento del 2026-07-01 [fatto]) | settimanale ×4,33 ≈ $31,80 standard; zoom da tarare (§4.2); dopo il core update di maggio 2026 servono scansioni aggregate, mai «posizione 1» [settore] digest §1 |
| Alternativa con UI | Local Falcon Basic $49,99/mese (15.150 crediti) | mensile | $49,99 | solo se serve un report white-label; API on-demand $199/mese [fatto] https://www.localfalcon.com/pricing |

**Totale stimato strumenti per 50 clienti:** DFS geogrid mensile ~$7,35 + My Business Info competitor all'onboarding e mensile (~20 profili × 50 × $0,0015 ≈ $1,50) + Keywords Data (~$3; questa API **è** nell'aumento del 2026-07-01, prezzo non riletto) + API Google 0 ≈ **$15-50/mese** includendo priority e riserve. Ben sotto 200 €. [fatto sui prezzi Maps e My Business Info; calcolo nostro]

Scenario alternativo (approfondimento DataForSEO, ipotesi da confermare: 3 keyword per cliente, griglia 7×7, `depth` 20, My Business Info del cliente + 10 concorrenti):

| Voce | Volume al mese | Standard | Live |
|---|---|---|---|
| Geogrid mensile | 7.350 SERP | 4,41 $ | 14,70 $ |
| Geogrid settimanale (×4,33) | ~31.800 SERP | ~19,1 $ | ~63,7 $ |
| My Business Info mensile | 550 richieste | 0,83 $ | 2,97 $ |

Con geogrid settimanale e My Business Info mensile: circa **20 $ standard, 67 $ live**. Prezzi [fatto]: Maps SERP $0,0006 / $0,0012 priority / $0,002 live; My Business Info $0,0015 / $0,003 / $0,0054. https://dataforseo.com/pricing/serp/google-maps-serp-api · https://dataforseo.com/pricing/business-data/business-data-api. Il costo reale dipende da numero di keyword e frequenza, da fissare in G3.

**Termini DataForSEO** (aggiornati 12 June 2026, https://dataforseo.com/terms-of-service) [fatto sul testo]:
- §7.1: i dati SERP «shall not be used to compete with or adversely affect the business interests of the search engine providers».
- §7.2: il cliente manleva DataForSEO per le violazioni dei termini dei motori di ricerca.
- §6.1: sospensione del servizio «at our sole discretion».
- Rivendita, redistribuzione, white-label: nessuna clausola nei termini (non trovato); nessuna pagina «Acceptable Use» separata (non trovato). Le pagine prodotto parlano di dati «raw, white-label» per «client deliverables»: marketing, non contratto [settore] https://dataforseo.com/backlinks-data-api
- Lettura per ConsulBuild: audit della scheda del proprio cliente, nessun servizio concorrente a Google → §7.1 non sembra violato. [contestato: interpretazione, non parere legale]

### 7.1 Vincolo di conservazione (decisivo per G3)

**Testo intero** — Business Profile APIs policies, sezione «Content storage», https://developers.google.com/my-business/content/policies («Last updated 2026-08-28 UTC», letta il 2026-09-14) [fatto]:

> You cannot pre-fetch, cache, index, or store any content provided through the Business Profile APIs ("Content") for use outside of your Business Profile project except for limited amounts of Content. You can store limited amounts of Content only to improve the performance of your project.
> Stored Content must meet the following requirements:
> - It must be stored temporarily for no more than 30 calendar days.
> - It must be stored securely.
> - It cannot be manipulated or aggregated in any way.
>
> At no time may you store Content in order to prevent Google from tracking usage of your Business Profile project.

La versione precedente di questo rapporto citava la frase a metà (senza «for use outside of your Business Profile project»). Il grado corretto è: **[fatto] il testo, [contestato] l'estensione dentro il progetto.**

Due letture possibili, nessuna fonte primaria le scioglie:
- **Stretta (prudente, adottata qui):** l'unica conservazione ammessa è quella di «limited amounts» per le prestazioni; il limite di 30 giorni e il divieto di manipolare o aggregare valgono per ogni «Stored Content». La seconda frase non contiene la clausola «outside of your project».
- **Larga:** la frase vieta solo l'uso fuori dal progetto; dentro non ci sarebbe limite di tempo. Ma nessun testo Google autorizza in modo esplicito un archivio dentro il progetto.

**Altri testi che pesano** [fatto]:
- Google APIs Terms of Service (https://developers.google.com/terms, «Last modified: November 9, 2021»):
  - §5.c: contenuti non pubblici di un utente non si espongono ad altri «without explicit opt-in consent from that user».
  - §5.e: «Unless expressly permitted by the content owner or by applicable law», vietato «Scrape, build databases, or otherwise create permanent copies of such content, or keep cached copies longer than permitted by the cache header».
  - §5.a: contenuti soggetti a diritti del titolare.
- Gerarchia (https://developers.google.com/my-business/content/terms, agg. 2026-08-28; testo nel riepilogo incorporato nella pagina, non nel corpo): «In case of conflicts, the Business Profile Terms take precedence, followed by the Business Profile API Policies, and lastly, the Google APIs Terms of Service.»
  - Conseguenza [interpretazione]: una delega scritta del cliente copre l'eccezione dei ToS §5.e, ma non la policy API, che non ha quell'eccezione e prevale.

**Che cosa è «Content»:**
- L'unica definizione è «any content provided through the Business Profile APIs». Nessuna fonte esclude i dati inseriti dal titolare, le metriche o le keyword di Performance. [fatto sul testo, contestato sull'intento]
- I valori prodotti dalla nostra ricerca (`consigliato`, `copiaIncolla`, `motivo`) non arrivano dall'API: sono artefatti nostri. [interpretazione solida]
- `gcid`, `serviceTypeId` e nomi di categoria letti dall'API sono Content alla lettera; gli ID sono pubblici anche per altre vie (PlePer). [contestato]
- Export manuale da Business Profile Manager (Insights → «Download Report») [fatto] https://support.google.com/business/answer/9918094: un file scaricato dall'interfaccia non è «provided through the APIs» [interpretazione]. Profondità dello storico: «past 6 months» solo in un riassunto di ricerca, non trovato in fonte primaria.

**Riscontro di settore:** BrightLocal mostrava 18 mesi di Insights (Local Search Forum, 2017-09-18, API v4) [settore] https://localsearchforum.com/threads/is-it-possible-to-get-more-that-a-3-months-worth-of-data-from-google-my-business.52438/ — sono esattamente la finestra che l'API v4 restituiva in lettura, non provano una conservazione oltre 30 giorni. Whitespark Local Platform e Localo: documentazione sulla conservazione non trovata. Finestra storica della Performance API v1: non trovata in fonte primaria (`getDailyMetricsTimeSeries`, agg. 2024-10-16, non indica limiti); «trailing 18 months / keyword 6 months» solo su una fonte terza non verificabile (Jentic) [contestato].

**Regole di progetto (lettura stretta, finché Google non risponde):**
1. Nella scheda consigliata si conserva senza scadenza solo ciò che è nostro. Ciò che arriva dall'API vive in `out/<slug>/traffico/cache-api.json` con `scadeAt = lettoAt + 30 giorni`; una pulizia (sweep orario o apertura) elimina le letture scadute. Schema in §9.
2. Esiti derivati datati («campo X uguale al nostro consigliato il giorno D») si conservano. Rischio: in lettura stretta anche un esito derivato potrebbe contare come Content «manipulated». [contestato]
3. Report mensile (G3): niente archivio delle metriche grezze oltre 30 giorni; il confronto mese su mese si rilegge dall'API a ogni generazione, entro la finestra che l'API restituisce (profondità v1 da misurare con una chiamata reale); lo storico oltre la finestra passa dal «Download Report» dell'interfaccia. Conservare una copia nostra del report consegnato oltre 30 giorni: [contestato].
4. **Nessun confronto tra clienti** (benchmark, medie di portafoglio) su dati API: è «aggregated», vietato in entrambe le letture.
5. La raccomandazione della pista API di «archiviare snapshot mensili e giornalieri dal primo giorno» resta in contrasto con la policy. [contestato]
6. DataForSEO: la policy Business Profile non si applica ai suoi dati, ma la frase «DataForSEO non è soggetto a questa policy» della versione precedente era senza fonte. I suoi termini (§7 sopra) mettono il rischio verso Google a carico nostro.

**Domanda a Google: pronta, non inviata** (inviarla è un messaggio a nome di Mattia, richiede il suo via libera e il login). Canali [fatto] https://developers.google.com/my-business/content/support (agg. 2026-08-28): supporto tecnico API https://support.google.com/business/contact/api_default · modulo dati indicato dalla policy https://support.google.com/business/contact/dma_data_request

> Subject: Content storage policy – scope of the 30-day limit for an agency managing its clients' own profiles
> We are an agency with Manager access to our clients' Business Profiles (their consent on file). Policy "Content storage" says Content cannot be stored "for use outside of your Business Profile project except for limited amounts", then lists requirements for "Stored Content" (30 days, no aggregation). Please confirm which of these uses are permitted **inside our project**:
> 1. Keeping the profile's current field values (categories, hours, phone, website, description, verification/suspension state) read via Business Information API for more than 30 days, to compare them with our recommended values.
> 2. Keeping monthly Performance API metrics and search keywords for the same client beyond 30 days, to show that client a month-over-month report (the client only sees their own data).
> 3. Keeping only our own derived results (e.g. "field X matched our recommendation on date D", "month-over-month change +12%") without the raw values.
> 4. Computing benchmarks across our clients (aggregated, anonymised).
> Does the 30-day limit apply to all stored Content, or only to Content used outside the project? Does the end-client's written permission as content owner (Google APIs ToS §5.e) change the answer?

**Cosa sblocca:** G1 si può fissare subito (regole 1-2 e schema §9 valgono in entrambe le letture). G3 ha pronta solo la strada prudente (regola 3); l'archivio storico resta bloccato fino alla risposta.

---

## 8. Accesso API e account

### 8.1 Cosa deve fare Mattia

1. **Account Google dedicato** all'agenzia con 2FA. Deve essere un utente **@consulbuild.com** (Google Workspace: MX `smtp.google.com`, e `docs/vps-integrazioni-setup.md` riga 73), perché l'app OAuth «Internal» (§8.4) accetta solo membri dell'organizzazione; un Gmail non passa. Attivare Business Profile per l'organizzazione, altrimenti 403. [fatto] https://developers.google.com/my-business/content/basic-setup. Costo di una licenza Workspace in più: non trovato; in alternativa un utente esistente (decisione di Mattia).
2. **Requisito di idoneità**: l'account deve gestire una scheda **verificata e attiva da 60+ giorni**, con sito collegato (può essere di un cliente gestito, es. Cavaliere Build). L'email della domanda deve risultare owner/manager. [fatto] https://developers.google.com/my-business/content/prereqs (agg. 2026-08-28). Un professionista dice che un manager viene respinto: fare domanda da un account owner se possibile. [contestato] https://xovionlabs.com/blog/google-business-profile-api-hidden-gate/ (2026-05-18)
3. **Progetto Google Cloud** (lo stesso dei piani T) → annotare il Project Number → form «Application for Basic API Access» (help: https://support.google.com/business/workflow/16726127; URL form riportato dal settore: support.google.com/business/contact/api_default). Descrivere un caso d'uso concreto: lettura delle schede dei clienti gestiti, niente scrittura.
4. **Attesa**: revisione «entro 14 giorni» [fatto] https://developers.google.com/my-business/content/faq; nel reale 4 giorni-6 settimane [settore]. Esito: quota 0 → 300 QPM in Cloud Console. [fatto] prereqs
5. **Abilitare le API**: Business Information, Account Management, Business Profile Performance, Verifications, Google My Business (v4: recensioni e media), Place Actions; Notifications solo se si usa Pub/Sub. [fatto] basic-setup
6. **OAuth**: client «applicazione web», scope `https://www.googleapis.com/auth/business.manage`, `access_type=offline` (e `prompt=consent` alla ri-autorizzazione). [fatto] https://developers.google.com/my-business/content/implement-oauth · https://developers.google.com/identity/protocols/oauth2/web-server
   - Schermata di consenso **«Internal»** su Workspace (dettagli e decisione in §8.4). La versione precedente diceva «In produzione» (External): lì può servire la verifica dell'app, con esenzioni come l'uso personale sotto 100 utenti; le app Internal ne sono esenti [fatto] https://support.google.com/cloud/answer/13464323. La scadenza a 7 giorni vale per External + Testing. [fatto] https://support.google.com/cloud/answer/15549945
   - Il refresh token **non** va nel Keychain del Mac (`lib/secrets.ts`): vive in n8n sul VPS (§8.4). Correzione rispetto alla versione precedente.
   - Service account: non funzionano per GBP (l'esenzione «service-owned data» vale solo per dati propri del service account); un caso fallito. Usare l'account utente. [fatto: assenza] + [settore] https://support.google.com/cloud/answer/13464323 · https://discuss.google.dev/t/service-account-can-t-accept-google-business-profile-location-group-invitation-accounts-invitations/191897
7. **Per ogni cliente**: il cliente (proprietario) invita l'account come **Gestore**; accettazione in UI o via `accounts.invitations.accept` (dal 2026-05-12 l'invito mostra il place ID). [fatto] https://developers.google.com/my-business/content/latest-updates · https://support.google.com/business/answer/3403100?hl=en. I nuovi utenti hanno 7 giorni di limitazioni. [fatto] 3403100
8. **Contratto e sito agenzia** (§2.2): consenso scritto, Profilo gratuito dichiarato, commissioni per iscritto, link «Collaborare con terze parti» sul sito ConsulBuild, niente promesse di posizionamento, restituzione entro 7 giorni lavorativi, avviso entro 48 h delle modifiche. Se si trattano dati dei clienti finali (recensioni): responsabile ex art. 28 GDPR. [fatto sulle policy; settore sul GDPR]
9. **DataForSEO** e **Google Ads developer token**: già nel §8 del README Traffico.

### 8.2 Cosa si può fare SENZA accesso API (subito, anche prima dell'approvazione)

| Serve a | Come | Limite |
|---|---|---|
| Categorie e rank dei competitor | DFS Maps SERP | nessuno rispetto all'API |
| Scheda pubblica del cliente e dei competitor (categorie aggiuntive, servizi, orari, foto totali) | DFS My Business Info | `attributes` = attributi da recensioni, non quelli del titolare [fatto]; quali campi arrivano vuoti su schede italiane: non testato (test 2 in §10 G1) |
| Elenco categorie con GCID | PlePer (gratis) per GCID + nomi inglesi; fabriziodelrio per i nomi italiani (tabella §4.4) | non ufficiale; via GET l'italiano di PlePer restituisce 0 categorie; abbinamento IT↔GCID nostro; niente `serviceTypes` |
| Keyword e volumi | Google Ads API / DFS Keywords Data | volumi nulli nei comuni piccoli |
| Geogrid | DFS Maps SERP | fedeltà non verificata |
| Place Details | Places API | termini SEE: usi permessi non letti; niente categorie aggiuntive |

Senza API mancano: catalogo ufficiale dei servizi predefiniti IT, attributi disponibili per categoria in Italia, attributi impostati, `diffMask`/`pendingMask`, stato di sospensione, keyword reali e metriche. **G1 può partire in modalità «pubblica» e completarsi quando arriva l'accesso.**

### 8.3 Le chiamate che chiudono i buchi (appena c'è un token)

Non eseguite il 2026-09-14: nessun token Google (API ancora a quota 0) e l'account Google del Chrome di sessione mostra «0 attività»; l'accesso da Gestore di Cavaliere è su un altro account. Servono il login di Mattia (OAuth Playground o flusso dell'editor) e l'account Gestore.

| # | Chiamata | Chiude | Evidenza |
|---|---|---|---|
| 1 | `GET BI/attributes?parent=locations/{id}&languageCode=it&pageSize=200`, filtrando `valueType == "URL"`; senza scheda: `?categoryName=categories/{gcid}&regionCode=IT&languageCode=it` | nomi degli attributi social e di prenotazione in Italia | [fatto] https://developers.google.com/my-business/reference/businessinformation/rest/v1/attributes/list |
| 2 | `GET BI/locations/{id}/attributes` | attributi URL già impostati | [fatto] stessa famiglia |
| 3 | `GET PA/locations/{id}/placeActionLinks` | link attività leggibili via API? (contrasto con la help 6218037) | [fatto] esistenza endpoint; copertura per l'edilizia IT [contestato]. Scope OAuth di Place Actions: non verificato |
| 4 | `GET BI/categories:batchGet?names=gcid:general_contractor&names=gcid:remodeler&…&languageCode=it&regionCode=IT&view=FULL` | nomi IT ufficiali dei mestieri §4.4 e `serviceTypes` italiani, in una chiamata | [fatto] https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/batchGet |

Test DataForSEO da fare (spesa circa 0,06 $, serve il sì di Mattia per usare l'account a pagamento; credenziali non trovate né in Keychain né in env):
- **Test 1, chiave:** 5 schede note (Cavaliere + 4 competitor) su Maps SERP → `category_ids` con prefisso `gcid:` confrontati con le categorie lette in UI.
- **Test 2, My Business Info IT:** 5 schede italiane in live, confronto campo per campo con Maps sul telefono nello stesso punto.
- **Test 3, zoom:** 1 query × 5 punti × 3 zoom (13z, 15z, 17z) × `device=mobile`, live = 15 SERP; sovrapposizione della top 20 tra zoom, ripetuto a +24 h per separare zoom e rumore del giorno.

### 8.4 OAuth del monitor G3 (decisione proposta)

**Decisione:** app OAuth **Internal** su Workspace @consulbuild.com, un solo client, **un solo refresh token in n8n sul VPS**. L'editor sul Mac non tiene un token proprio: legge da un webhook n8n autenticato (modello dei workflow `sf-*`). Segnale «fonte giù» su due fili: `invalid_grant` e dead-man sull'ultima lettura riuscita.

**Schermata di consenso** [fatto salvo indicazione]:
- Internal solo per progetti associati a un'organizzazione Google Cloud: «Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization». https://support.google.com/cloud/answer/15549945
- App interne esenti dalla verifica: «The project must be owned by the organization, and its OAuth Consent Screen must be configured for internal use»; niente schermata «unverified app», niente tetto utenti. https://support.google.com/cloud/answer/13464323
- External + Testing: 100 test user e «Authorizations by a test user will expire seven days from the time of consent». Nessuna fonte estende i 7 giorni a Internal. https://support.google.com/cloud/answer/15549945
- Classe di `business.manage`: **sensitive** secondo una fonte secondaria [settore] https://unified.to/blog/how_to_set_up_google_business_profile_api_access_and_get_oauth_2_credentials; in fonte primaria non trovato (la Console, Data Access, richiede login). Con Internal la classe non cambia l'esito della verifica.
- Da verificare a mano: se il progetto Cloud esistente «n8n consulbuild» (client della credenziale n8n «Google Drive ConsulBuild», `docs/vps-integrazioni-setup.md` riga 199) appartiene all'organizzazione consulbuild.com (Console → IAM → selettore progetto/organizzazione). Non trovato. È la condizione per Internal.
- L'accesso alle API GBP (quota 0 fino all'approvazione) resta un requisito separato. [fatto] prereqs

**Cause di scadenza del refresh token** — https://developers.google.com/identity/protocols/oauth2 (agg. 2026-05-26), citazioni alla lettera [fatto]:

| Causa | Per G3 |
|---|---|
| «The user has revoked your app's access.» | reale (revoca da myaccount o da un admin) |
| «The refresh token has not been used for six months.» | evitata dal sensore quotidiano, finché gira |
| «The user changed passwords and the refresh token contains Gmail scopes.» | non si applica: `business.manage` non è uno scope Gmail [deduzione dal testo] |
| «…exceeded a maximum number of granted (live) refresh tokens» — «a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID», oltre il quale «the oldest refresh token will be invalidated» (web-server) | reale e silenziosa: ogni «Reconnect» in n8n o un flusso sul Mac con lo stesso client consuma uno slot → un client, un consumatore |
| «The user granted time-based access to your app and the access expired.» | non concedere accesso a tempo; se c'è, compare `refresh_token_expires_in` |
| «If an admin set any of the services requested in your app's scopes to Restricted.» | Business Profile **non** compare tra i servizi di API Controls [fatto] https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data (agg. 2026-09-10); rischio basso, spuntare comunque «Trust internal apps» |
| «For Google Cloud Platform APIs - the session length set by the admin could have been exceeded.» | riguarda scope GCP, GBP non lo è [contestato: interpretazione] |

Refresh con token revocato o scaduto: **HTTP 400 `invalid_grant`**, «the token may have expired or has been invalidated. Authenticate the user again…». [fatto] https://developers.google.com/identity/protocols/oauth2/web-server

**n8n:**
- La credenziale Google OAuth2 generica accetta scope personalizzati separati da spazio; conferma i 7 giorni per External/Testing e che Internal non li ha. [fatto] https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/
- Il nodo Google Business Profile copre solo Posts e Reviews: locations, attributes, verifiche passano dall'HTTP Request node con credenziale Google OAuth2. [fatto] https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlebusinessprofile/
- Refresh automatico: la doc non lo specifica (non trovato). Diverse issue dicono che n8n rinnova solo su 401, non su 403 [contestato] https://github.com/n8n-io/n8n/issues/18517 (anche #17212, #30345). Le API Google danno di norma 401 a token scaduto: da provare lasciando scadere l'access token (~1 h).
- Il token in n8n è cifrato con `N8N_ENCRYPTION_KEY`; la ri-autorizzazione avviene solo lì («Reconnect»).

**Segnale «fonte giù»** (proposta, dedotta dai fatti sopra). Nel workflow G3, HTTP Request node con «On error → continue (error output)»:

| Condizione | Stato | Portata | Azione |
|---|---|---|---|
| 400 `invalid_grant` al refresh | `auth_revocata` | globale, tutti i clienti | Reconnect in n8n (umano) |
| 403 su una location | `accesso_cliente_perso` | solo quel cliente | il cliente ha tolto il Gestore |
| 429 | `quota` | globale, temporaneo | nessuna |

- Ogni esito in una Data table `{fonte:"gbp", stato, causa, ultimo_ok, quando}`, senza dati personali.
- **Dead-man:** l'editor mostra «fonte giù» se `ultimo_ok` è più vecchio di 36 h, anche senza righe d'errore (copre n8n fermo, workflow disattivato, inattività a 6 mesi). Coerente con «mai uno 0 a fonte giù».
- Testo esatto dell'errore di n8n al refresh fallito: non trovato in fonte primaria; nelle issue compaiono «invalid_grant» / «This refresh token is invalid». Filtrare sulla sottostringa `invalid_grant` e provarlo revocando l'accesso da myaccount.google.com/permissions con un account di test.

---

## 9. Schema proposto: `out/<slug>/traffico/scheda-consigliata.json`

Regole dello schema (da scrivere in Zod, come `schema.ts`):
- ogni voce ha `fonti` con almeno un elemento; voce senza fonte = file non valido;
- **i dati letti dall'API non stanno in questo file** (policy §7.1, lettura stretta): `attuale` e lo stato della scheda vivono in `cache-api.json` con scadenza a 30 giorni e si ricavano in lettura (null se scaduti o assenti);
- `azione` resta quella decisa da noi alla generazione (conclusione nostra); in lettura si ricalcola confrontando cache e `consigliato`;
- `confronto` registra solo l'esito («uguale al nostro consigliato»), mai il valore letto;
- `stato` lo cambia solo Mattia (`fatto`) o il monitor (`in-revisione`, `verificato`, `rifiutato`, `divergente`), secondo i macro-stati §2.3;
- `fonti` di tipo `api-gbp`: `rif` è un puntatore (endpoint + `lettoAt`), mai il valore;
- `gcid` e `serviceTypeId` si conservano come identificativi (pubblici anche via PlePer); il nome IT si scrive come `consigliato` nostro; la lista completa di `categories.list` sta solo in cache. [contestato]

```ts
// out/<slug>/traffico/cache-api.json — Content API, scade dopo 30 giorni
type CacheApi = {
  letture: {
    campo: string;              // es. "categories", "metadata", "voiceOfMerchantState", "getGoogleUpdated"
    valore: unknown;
    lettoAt: string;
    scadeAt: string;            // lettoAt + 30 giorni; la pulizia elimina le scadute
  }[];
};
```

```ts
type Grado = "fatto" | "settore" | "contestato";
type Rischio = "basso" | "rifiuto" | "riverifica" | "sospensione";
type Stato = "da-fare" | "fatto" | "in-revisione" | "verificato" | "rifiutato" | "divergente" | "scartato";
type Azione = "aggiungi" | "modifica" | "rimuovi" | "conferma" | "solo-controllo";

type Fonte = {
  tipo: "contesto" | "dati-form" | "sito" | "api-gbp" | "dataforseo" | "google-ads" | "pleper" | "fabriziodelrio"
      | "gbp-latlng" | "geocoding-indirizzo" | "places" | "policy" | "mattia";
  rif: string;          // es. "contesto.json#/servizi/3", "dfs:maps:task/…", "BI locations.get@2026-09-14" (puntatore, mai valore)
  lettoAt: string;      // ISO date
};

type Voce<T> = {
  id: string;           // stabile: "categoria-primaria", "servizio:ristrutturazione-bagni"
  campo: "nome" | "categoria-primaria" | "categoria-aggiuntiva" | "servizio-predefinito" | "servizio-personalizzato"
       | "descrizione" | "orari" | "orari-speciali" | "area-servita" | "indirizzo-visibile" | "telefono"
       | "sito" | "attributo" | "data-apertura" | "social" | "chat" | "link-azione" | "pin" | "foto";
  // attuale: NON salvato; derivato da cache-api.json in lettura (T | null)
  consigliato: T | null;        // null con azione "rimuovi" o "solo-controllo"
  azione: Azione;               // decisa alla generazione; ricalcolata in lettura
  confronto?: { esito: "uguale" | "diverso" | "assente"; confrontatoAt: string };  // artefatto nostro, senza valore letto [contestato in lettura stretta]
  motivo: string;               // una frase, in italiano
  evidenza: { grado: Grado; url: string }[];
  fonti: [Fonte, ...Fonte[]];   // obbligatoria, almeno una
  rischio: Rischio;
  core: boolean;                // nome, categoria primaria, indirizzo, telefono, sito
  giorno: number;               // giorno del piano di inserimento (1..n)
  copiaIncolla: string;         // testo esatto da inserire nell'interfaccia
  stato: Stato;
  fattoAt?: string; fattoDa?: "mattia";
  inRevisioneDal?: string;      // primo rilevamento in pendingMask
  verificatoAt?: string;        // fuori da pendingMask e diffMask + vista pubblica uguale (§2.3)
  noteMattia?: string;
};

type SchedaConsigliata = {
  versione: 1;
  slug: string;
  generataAt: string;
  modalita: "pubblica" | "api";            // senza o con accesso Manager
  scheda: { placeId?: string; locationName?: string; mapsUri?: string };
  // statoScheda: NON salvato qui; vive in cache-api.json (TTL 30 giorni)
  eventi: { tipo: "sospensione-rilevata" | "disattivazione-rilevata" | "verifica-rilevata" | "modifica-google-rilevata"; at: string }[];  // fatti nostri datati [contestato in lettura stretta]
  voci: {
    nome: Voce<string>;                              // sempre azione "solo-controllo"
    categoriaPrimaria: Voce<{ gcid: string; nome: string; score: number }>;
    categorieAggiuntive: Voce<{ gcid: string; nome: string; score: number; servizioReale: string }>[];  // ≤ 9
    servizi: Voce<{ serviceTypeId?: string; categoria: string; nome: string; descrizione?: string; prezzo?: { da: number; valuta: "EUR" } }>[];
    descrizione: Voce<string>;                       // ≤ 750
    orari: Voce<{ giorno: 1|2|3|4|5|6|7; apre: string; chiude: string }[]>;
    orariSpeciali: Voce<{ data: string; chiuso: boolean; apre?: string; chiude?: string }[]>;
    areaServita: Voce<{ comuni: { istat: string; nome: string }[]; indirizzoVisibile: boolean }>;  // ≤ 20
    telefono: Voce<{ principale: string; aggiuntivi: string[] }>;  // ≤ 2 aggiuntivi
    sito: Voce<{ url: string; utm: string; esitoHttp?: number; redirectFinale?: string }>;
    attributi: Voce<{ id: string; nome: string; valore: boolean | string[] }>[];
    dataApertura: Voce<{ anno: number; mese?: number }>;
    social: Voce<{ piattaforma: "facebook" | "instagram" | "linkedin" | "pinterest" | "tiktok" | "x" | "youtube"; url: string; attributoId?: string }>[];  // attributoId solo se la chiamata 1 (§8.3) lo trova
    chat: Voce<{ tipo: "whatsapp" | "sms"; valore: string }>;
    linkAzione: Voce<{ tipo: string; url: string; placeActionType?: string; isEditable?: boolean }>[];  // separato dai social; campi PA opzionali finché la chiamata 3 non risponde
    pin: Voce<{ lat: number; lng: number; fonte: "geocoding-indirizzo" | "places" | "sito-jsonld" }> | null;  // null per SAB con indirizzo nascosto; il `latlng` letto dall'API sta solo in cache (§7.1), qui un puntatore "gbp-latlng" in `fonti`
    foto: Voce<{ fileDrive: string; tipo: "copertina" | "logo" | "lavoro" | "team" | "esterno" }>[];
  };
  ricercaCategorie: {                        // sintesi propria, non dati grezzi
    query: string[]; punti: number; competitorDistinti: number;
    parametri: { device: "mobile"; depth: 20; zoom: string };  // senza parametri fissati i punteggi non sono ripetibili
    datiInsufficienti: boolean; eseguitaAt: string; costoUsd: number;
  };
  gate: { id: string; esito: "PASS" | "FAIL"; dettaglio?: string }[];
  pianoInserimento: { giorno: number; voci: string[] }[];  // max 1 voce core per giorno
};
```

---

## 10. Implicazioni per G1, G2, G3

### G1 — Scheda consigliata

**Costruire, in ordine:**
0. Prima del codice, i test che fissano i parametri (§8.3): test DFS 1-3 (chiave `gcid:`, campi My Business Info su schede IT, zoom) e, appena c'è un token, le chiamate 1-4 su Cavaliere. Senza, zoom e mappa categorie restano ipotesi.
1. Schema Zod di `scheda-consigliata.json` **e di `cache-api.json`** (TTL 30 giorni, pulizia allo sweep) + banco senza rete (fixture registrate DFS e API).
2. Lettori: DFS Maps SERP (`device: mobile`, `depth` 20, zoom tarato) e My Business Info; BI `locations.get` (con `latlng`), `categories.batchGet`, `attributes.list`. Ogni lettore degrada a «non configurato» senza chiave.
3. Algoritmo categorie (§4) come funzione pura con banco: prefisso `gcid:` e filtro sul catalogo GBP, punteggio, test «È», primaria, secondarie, «dati insufficienti». Tabella §4.4 come dizionario iniziale, marcata «da confermare».
4. Abbinamento servizi reali ↔ `serviceTypes` (§5.1), con conferma umana.
5. Descrizione e servizi personalizzati via job `traffico:<slug>:scheda` (`claude -p`, skill e critico) + gate §5.3.
6. Piano di inserimento a giorni (una voce core al giorno).
7. Pilota: Cavaliere Build. Prima verificare che abbia una scheda e chi ne è proprietario; l'accesso da Gestore è su un account diverso da quello del Chrome di sessione (§8.3).

**Non costruire:** scrittura sulla scheda via API (`PATCH`), anche per comodità; proposte di cambio nome; post; Q&A; foto AI o foto del sito generate; raccolta recensioni (decisione 9); uso di `GoogleLocations` per i competitor; Places API finché i termini SEE non sono chiariti (eccezione: lat, lng e place_id come fallback del pin, esclusi dalla restrizione SEE [fatto] https://developers.google.com/maps/comms/eea/places). Da decidere con Mattia: `locations.patch?validateOnly=true` per validare senza scrivere [fatto] https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/patch — è un endpoint di scrittura in prova a secco; utile, ma va dichiarato nel consenso del cliente.

### G2 — Checklist e allineamento

**Costruire, in ordine:**
1. Normalizzatori puri (telefono, indirizzo, orari, nome) e distanza pin in metri, con banco di casi italiani.
2. Confronto scheda ↔ sito (§6.2) sulla vista pubblica (DFS My Business Info) + `getGoogleUpdated`; `locations.get` solo per sapere cosa ha inviato il titolare.
3. Controllo HTTP del link (200, niente redirect cross-dominio, UTM presenti, demo spenta).
4. Macchina a stati §2.3 come funzione pura con banco: `fatto` → `in-revisione` → `verificato` / `rifiutato`; `verificato` → `divergente`. Mai «divergente» prima di 30 giorni da «fatto».
5. **Test sul pilota prima di fissare le soglie:**
   - una modifica non core e lontana dalla riverifica (descrizione o un servizio; mai nome, indirizzo, categoria);
   - letture a tempo zero, +10 min, +1 h, poi ogni 6 ore per 7 giorni (28 letture): `hasPendingEdits`, `hasGoogleUpdated`, `pendingMask`, `diffMask`, vista pubblica DFS, email ricevute;
   - misurare: tempo di uscita da `pendingMask`, ritardo tra uscita e comparsa nella vista pubblica, concordanza tra `hasPendingEdits` e `pendingMask`;
   - seconda prova, solo col consenso del cliente: una modifica che Google probabilmente respinge, per osservare il segnale di rifiuto;
   - costo delle letture DFS: 28 × $0,0015 standard ≈ $0,04 (calcolo nostro sui prezzi §7).
6. Checklist UI: voci per giorno, bottone «copia», stato «fatto», stati del monitor visibili. Studio /impeccable prima della UI.
7. Avviso al cliente entro 48 h delle modifiche (anche se fatte a mano da Mattia, è una regola per terze parti [fatto] 7353941).

**Non costruire:** accettazione automatica degli aggiornamenti di Google; modifiche in blocco nello stesso giorno; «verificato» basato solo sulla rilettura di `locations.get`; controllo unico a 24 ore; il «kit presenza» (citazioni) non è coperto da questa ricerca.

### G3 — Monitor

**Costruire, in ordine:**
1. Credenziale Google OAuth2 in n8n (app Internal, §8.4) e webhook autenticato per l'editor. Unico consumatore del client OAuth.
2. Sensore giornaliero su VPS (n8n, HTTP Request node): `VoiceOfMerchantState` + `hasGoogleUpdated` + `pendingMask`/`diffMask` delle voci aperte → allarmi. Classificazione errori `auth_revocata` / `accesso_cliente_perso` / `quota` in Data table + dead-man a 36 h.
3. Lettura mensile Performance (metriche + keyword) solo per il report del mese, riletta dall'API a ogni generazione, senza archivio grezzo oltre 30 giorni (§7.1 regola 3).
4. Geogrid mensile DFS (5 keyword × 7×7, parametri fissati) con share of visibility e cambi di categoria dei competitor.
5. Sezione nel report mensile (`sf-report-rinnovo`): chiamate/clic/indicazioni, keyword principali, visibilità, stato della scheda. Mai «0» a fonte giù.
6. Prove prima di andare in produzione: refresh dopo scadenza dell'access token (~1 h); filtro `invalid_grant` provato revocando l'accesso con un account di test.

**Non costruire:** refresh token nel Keychain del Mac o secondo consumatore dello stesso client; geogrid settimanale di default (costo ×4 e rumore); «posizione 1» a punto singolo; Pub/Sub all'inizio (polling basta); Local Falcon salvo bisogno di report white-label; storico grezzo dei dati API; benchmark tra clienti su dati API (§7.1 regola 4).

**Prerequisiti esterni (percorso critico):** approvazione API (≤14 giorni, scheda 60+ giorni), progetto Cloud nell'organizzazione consulbuild.com con app OAuth Internal, account Gestore @consulbuild.com, invito come Gestore da ogni cliente, clausole contrattuali, link «Collaborare con terze parti» sul sito ConsulBuild, risposta di Google alla domanda §7.1 (solo per l'archivio storico).

---

## 11. Cosa resta incerto

### 11.1 Aperto

1. **Policy 30 giorni / «aggregated»**: due letture possibili del testo intero (§7.1). Domanda al supporto pronta, non inviata (serve il sì di Mattia e il login). Blocca solo l'archivio storico di G3; i benchmark tra clienti restano vietati in entrambe le letture.
2. **Quante categorie aggiuntive**: Google vs Sterling Sky; nessun test italiano. [contestato]
3. **Link homepage vs pagina servizio** per artigiani italiani a sede singola. [contestato]
4. **Effetto dei servizi personalizzati** e tempi 24-72 h dei predefiniti: affermati, non mostrati. [contestato]
5. **Catalogo IT reale**: nomi IT e GCID candidati in §4.4, abbinamento nostro [inferenza]; nessuna categoria «cappotto» né «serramenti» [settore]; esistenza di servizi predefiniti italiani non verificata; attributi per categoria in Italia non letti. Chiusura: chiamata 4 (§8.3).
6. **Link attività via API**: help «non disponibili» vs Place Actions API con `list`. Chiusura: chiamata 3 (§8.3). [contestato]
7. **Q&A in Italia**: API spenta [fatto]; la guida IT 3039617 descrive ancora le Q&A «solo per determinate categorie di attività e regioni» (riletta oggi) [fatto]; sezione pubblica in rimozione confermata da un Product Expert Google via SER, senza paesi [settore] https://www.seroundtable.com/google-maps-qa-feature-ask-40594.html (2025-12-15); test di Q&A rinnovata 2026-08-19 [settore]. Verificare a vista su una scheda italiana.
8. **Ask Maps**: lanciata 2026-03-12 in USA e India [fatto] https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/; Google non la presenta come sostituto delle Q&A [contestato]; estensione del 2026-08-06 a 150+ paesi solo in inglese, Italia non nominata [settore] https://9to5google.com/2026/08/06/google-ask-maps-global/.
9. **Fedeltà geogrid DFS** rispetto a un telefono reale; `googleMapsTypeLabel` di Places = categoria primaria? Test su 5 schede note (test 1-2 §8.3).
10. **Termini d'uso**: Places API «EEA Permitted Uses» (testo non letto per intero). Termini DataForSEO letti (§7): nessuna clausola su rivendita o white-label; compatibilità del nostro uso con §7.1 è interpretazione [contestato].
11. **Owner vs manager** nella domanda di accesso API. [contestato]
12. **Verifica in Italia**: la cartolina è ancora tra i metodi nella help Google («non per tutti») [fatto] https://support.google.com/business/answer/7107242; il digest la dava per dismessa. [contestato]
13. **Foto AI**: divieto esplicito Google non trovato; solo fattore negativo di settore.
14. **Ruolo Gestore**: se può accettare/rifiutare gli aggiornamenti di Google in UI (tabella da ricontrollare a vista).
15. **Storico Performance API v1** e soglia `threshold` delle keyword: non documentati in fonte primaria («18 mesi / keyword 6 mesi» solo su fonte terza [contestato]). Profondità del «Download Report» manuale: non trovata.
16. **Prezzi DataForSEO**: chiuso sulle pagine pubbliche (Maps SERP e My Business Info fuori dall'aumento del 2026-07-01 [fatto]); resta da rileggere il dashboard e il prezzo di Keywords Data, che è nell'aumento.
17. **Frequenza reale delle sospensioni in Italia**: nessun dato.
18. **Numero massimo di servizi**: non trovato.
19. **Social via API**: nessun campo in `Location`; nomi degli attributi URL social non trovati; fonte secondaria contraria. Disponibilità in Italia non trovata. Chiusura: chiamata 1 (§8.3). [contestato]
20. **Pin**: se spostarlo riapre la verifica; tolleranze pin-indirizzo; comportamento per le SAB: non trovati. Soglia 50 m nostra.
21. **Segnale di modifica rifiutata** via API: non documentato; tempi reali di pubblicazione non misurati con metodo. Chiusura: test pilota §10 G2.
22. **Chiave DataForSEO `category_ids` = GCID GBP**: [inferenza forte], test live non eseguito (credenziali DFS non disponibili).
23. **Zoom DataForSEO** e popolamento di My Business Info su schede italiane: non documentati, test 2 e 3 non eseguiti.
24. **OAuth**: classe di `business.manage` in fonte primaria; se il progetto Cloud «n8n consulbuild» sta nell'organizzazione consulbuild.com; se n8n rinnova il token su 401; testo esatto dell'errore n8n al refresh fallito; costo di una licenza Workspace in più. Tutti non trovati.
25. **Novità di settembre 2026**: email «Does this look right to you» (conseguenze se ignorata) e verifica con foto dell'insegna (paesi, condizioni, impatto sulle SAB edili): solo segnalazioni di settore.

### 11.2 Correzioni al materiale già noto (`digest/local-seo.md`)

| Riga digest | Dice | Correzione | Evidenza |
|---|---|---|---|
| §2 r.35 | link GBP alla pagina servizio, non alla homepage | Troppo assoluto, fonte singola. Default homepage per sede singola; pagina servizio con dati GSC e non già n.1 organica (Diversity Update). [contestato] | Sterling Sky 2024-09-30, 2025-04-14, 2023-02-13 |
| §2 r.33 | servizi predefiniti: guadagni in 24-72 h [confirmed] | Declassare a [settore, aneddotico]: 2 casi documentati, tempi solo nel riepilogo 2026. | sterlingsky services (2026-02-27) |
| §2 r.32 e §4 r.81 | «aggiungi ogni categoria» è un mito | Non pacifico: Sterling Sky 2025 consiglia tutti gli slot; Google il minimo; max 9 aggiuntive [fatto]. [contestato] | 3039617?hl=it · Sterling Sky 2025-08-12 |
| §2 r.36 | keyword nel nome | Aggiungere: in Italia non esiste la DBA; vale il nome realmente usato. | 3038177 · Whitespark tier list |
| §2 r.54 | «one edit per day» [confirmed] | Euristica di una sola agenzia, non regola Google. [settore] | Sterling Sky 2026-03-10 · 4569145 |
| §2 r.55 | ricorsi 30 giorni-6 settimane | Google: fino a 5 giorni lavorativi; reale 1-6 settimane. [contestato] | 13597551 |
| §4 r.87 | review gating: nessun testo di policy | Superato: la policy Maps lo vieta. [fatto] | contributionpolicy 7400114 |
| §4 r.88 | geotag: nessun test | Esiste un test (27 schede), esito nullo/negativo. | SEL 2025-03-25 |
| §5 r.94 | Local Falcon: API gratis sopra Starter | Gratis solo il recupero dati; lanciare scansioni via API $199/mese + $0,0032. [fatto] | localfalcon.com/pricing |
| §6 r.107 | cartolina non più usata | Ancora prevista «non per tutti». [contestato] | 7107242 |
| §6 r.109 | 5-7 Q&A auto-seminate | Obsoleto: API spenta 2025-11-03. [fatto] | sunset-dates |
| §6 r.112 | LSA non accertati in Italia | Esistono in Italia per alcune categorie (elettricisti, idraulici…). [fatto] | https://support.google.com/localservices/answer/6224841?hl=it |
| §1 r.27 | accesso API | Aggiungere: revisione entro 14 giorni; policy 30 giorni di conservazione; OAuth in Testing = token 7 giorni. [fatto] | faq, policies, oauth2 |
| pista fattori-ranking | frequenza post #55 | È il punteggio; la posizione è #148. | LSRF 2026, riletta oggi |
| pista regole-google §15 | «help IT descrive ancora le Q&A» | Confermato su 3039617 (i verificatori avevano cercato su altre URL). | 3039617?hl=it |
| pista dati-e-strumenti r.41 | PlePer in 40+ lingue, italiano incluso | Via GET gratuito solo inglese; con `lang=it` 0 categorie (2026-09-14). Nomi IT da altra fonte. | §4.4 |
| pista dati-e-strumenti r.100 · pista api-accesso r.67 | `diffMask` = «The fields that Google updated» | Discovery v1 (revision 20260913): campi dove la vista pubblica differisce dal valore del titolare. | §2.3 |

### 11.3 Correzioni a versioni precedenti di questo rapporto e ad altri documenti

| Dove | Diceva | Ora | Evidenza |
|---|---|---|---|
| §0.9, §7 | policy 30 giorni citata a metà, grado «[fatto; interpretazione contestata]» | testo intero; [fatto] il testo, [contestato] l'estensione dentro il progetto | §7.1 |
| §9 | «i dati grezzi API non stanno qui», ma lo schema salvava `attuale` e `statoScheda` | spostati in `cache-api.json` con TTL; nella scheda solo esiti ed eventi nostri | §7.1 regole 1-2 |
| §7 riga «Voci fatto» e §10 G2 | «verificato» rileggendo `locations.get` il giorno dopo | `locations.get` dà il valore del titolare; servono `pendingMask`, `diffMask` e vista pubblica; revisione fino a 30 giorni | §2.3 |
| §4.2 passo 4 | `category_ids` DFS «universali» [fatto] | prefisso `gcid:` + filtro sul catalogo; [inferenza forte] | §4.2 |
| §4.2 passo 1 | `depth` 20 (risparmio implicito) | stesso prezzo di 100; fissare anche `device` e zoom | DFS docs e prezzi |
| §3, §7 | +20% da riconfermare su Maps SERP e Business Data | Maps SERP e My Business Info non sono nell'aumento | pricing-update |
| §7 | «DataForSEO non è soggetto a questa policy» | frase senza fonte; i termini DFS mettono il rischio verso Google a carico nostro | ToS DFS §7.1-7.2 |
| §8.1 punto 6 | app OAuth «In produzione», refresh token nel Keychain | app Internal su Workspace; token unico in n8n; editor via webhook | §8.4 |
| §3 riga Social | «campo API dei social: non trovato» | nessun campo in `Location`; canale possibile attributi URL, nomi non trovati [contestato] | §3 |
| `docs/traffico/README.md` §8 | «due service account» tra i compiti di Google Cloud | per Search Console e simili restano validi; per la Business Profile API i service account non funzionano: serve l'utente Gestore + OAuth (§8.4). Da correggere nel README (non toccato qui) | §8.1 punto 6 |

---

## 12. Fonti

Lette o rilette il 2026-09-14 salvo data indicata.

**Google — help e policy (primarie) [fatto]**
- Linee guida rappresentazione: https://support.google.com/business/answer/3038177 (?hl=it)
- Modifica profilo (categorie max 9, descrizione 750, riverifica, Q&A, social): https://support.google.com/business/answer/3039617?hl=it
- Categorie: https://support.google.com/business/answer/7249669?hl=it
- Idoneità e sospensioni: https://support.google.com/business/answer/13762416
- Profili sospesi: https://support.google.com/business/answer/4569145
- Ricorsi: https://support.google.com/business/answer/13597551
- Servizi: https://support.google.com/business/answer/9455399?hl=it
- Prodotti: https://support.google.com/business/answer/9124203?hl=it
- Attributi: https://support.google.com/business/answer/9049526
- Orari speciali: https://support.google.com/business/answer/6303076
- Area servita: https://support.google.com/business/answer/9157481
- Video di verifica: https://support.google.com/business/answer/14271705
- Verifica: https://support.google.com/business/answer/7107242
- Foto: https://support.google.com/business/answer/6103862
- Post: https://support.google.com/business/answer/7662907 · https://support.google.com/business/answer/7213077
- Chat: https://support.google.com/business/answer/15013580?hl=it
- Link attività: https://support.google.com/business/answer/6218037?hl=it · https://support.google.com/business/answer/13769188
- Ranking locale: https://support.google.com/business/answer/7091?hl=it
- Ruoli: https://support.google.com/business/answer/3403100?hl=en · trasferimento: https://support.google.com/business/answer/3415281?hl=en
- Terze parti: https://support.google.com/business/answer/7353941?hl=it
- Keyword di ricerca (ritardo): https://support.google.com/business/answer/9918094?hl=en
- Chat dismessa: https://support.google.com/business/answer/14919056?hl=en
- Aggiornamenti di Google: https://support.google.com/business/answer/3480441?hl=en-GB
- Norme contenuti Maps: https://support.google.com/contributionpolicy/answer/7411351 · recensioni: https://support.google.com/contributionpolicy/answer/7400114?hl=en
- LSA Italia: https://support.google.com/localservices/answer/6224841?hl=it
- DSA ricorsi: https://support.google.com/european-union-digital-services-act-redress-options/answer/13535501?hl=en
- Ask Maps: https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/ (2026-03-12)
- Stato delle modifiche (10 minuti-30 giorni): https://support.google.com/business/answer/3038311?hl=en
- Indirizzo e pin: https://support.google.com/business/answer/2853879?hl=en
- Link social: https://support.google.com/business/answer/13580646?hl=en
- Thread «Pending edits for almost 2 months» [contestato]: https://support.google.com/business/thread/318613587
- Google Cloud, schermata di consenso e pubblico: https://support.google.com/cloud/answer/15549945 · esenzioni dalla verifica: https://support.google.com/cloud/answer/13464323
- Workspace API Controls: https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data (agg. 2026-09-10)

**Google — sviluppatori [fatto]**
- Policy API (30 giorni, aggregazione, consenso, 48 h, 7 giorni): https://developers.google.com/my-business/content/policies (agg. 2026-08-28)
- Prerequisiti: https://developers.google.com/my-business/content/prereqs (agg. 2026-08-28) · FAQ: https://developers.google.com/my-business/content/faq · setup: https://developers.google.com/my-business/content/basic-setup · OAuth: https://developers.google.com/my-business/content/implement-oauth · quote: https://developers.google.com/my-business/content/limits · novità: https://developers.google.com/my-business/content/latest-updates · dismissioni: https://developers.google.com/my-business/content/sunset-dates · changelog Q&A: https://developers.google.com/my-business/content/qanda/change-log · accetta/rifiuta aggiornamenti: https://developers.google.com/my-business/content/accept-or-reject-updates · notifiche: https://developers.google.com/my-business/content/notification-setup
- Business Information v1: https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations · categories.list: https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/list · batchGet: https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/batchGet · attributes.list: https://developers.google.com/my-business/reference/businessinformation/rest/v1/attributes/list · getGoogleUpdated: https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/getGoogleUpdated · patch: https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/patch (agg. 2024-10-16)
- Performance v1: https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries · https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric · https://developers.google.com/my-business/reference/performance/rest/v1/locations.searchkeywords.impressions.monthly/list
- v4 recensioni: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list (agg. 2026-04-07) · media: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media/list · v4 BasicMetricsRequest (18 mesi): https://developers.google.com/my-business/reference/rest/v4/BasicMetricsRequest
- Verifications: https://developers.google.com/my-business/reference/verifications/rest/v1/locations/getVoiceOfMerchantState · Place Actions: https://developers.google.com/my-business/reference/placeactions/rest · Notifications: https://developers.google.com/my-business/reference/notifications/rest/v1/NotificationSetting · Account Management: https://developers.google.com/my-business/reference/accountmanagement/rest
- OAuth 2.0 (cause di scadenza del refresh token): https://developers.google.com/identity/protocols/oauth2 (agg. 2026-05-26) · web server (`invalid_grant`, 100 token per client): https://developers.google.com/identity/protocols/oauth2/web-server
- Business Information v1 discovery (`locations.get`, `diffMask`, `pendingMask`): https://mybusinessbusinessinformation.googleapis.com/$discovery/rest?version=v1 (revision 20260913) · Attributes: https://developers.google.com/my-business/reference/businessinformation/rest/v1/Attributes · guida attributi: https://developers.google.com/my-business/content/attributes (agg. 2026-08-28) · guida servizi (`gcid:`, `job_type_id:`): https://developers.google.com/my-business/content/services (agg. 2026-08-28) · Place Actions links: https://developers.google.com/my-business/reference/placeactions/rest/v1/locations.placeActionLinks
- Termini Business Profile API (gerarchia): https://developers.google.com/my-business/content/terms (agg. 2026-08-28) · supporto: https://developers.google.com/my-business/content/support · Google APIs Terms of Service: https://developers.google.com/terms (2021-11-09)
- Places API: https://developers.google.com/maps/documentation/places/web-service/place-details · https://developers.google.com/maps/documentation/places/web-service/place-types · https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places · prezzi: https://developers.google.com/maps/billing-and-pricing/pricing · SEE: https://developers.google.com/maps/comms/eea/places
- Google Ads Keyword Planner: https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas · geotarget: https://developers.google.com/google-ads/api/data/geotargets
- AI features: https://developers.google.com/search/docs/appearance/ai-features (agg. 2025-12-10)

**Studi e settore [settore salvo diversa indicazione]**
- Whitespark LSRF 2026 (2025-11-06): https://whitespark.ca/local-search-ranking-factors/
- Whitespark tier list (2025-08-18): https://whitespark.ca/blog/how-to-outrank-99-of-local-competitors-google-business-profile-tier-list/
- Whitespark servizi predefiniti (2024-10-28): https://whitespark.ca/blog/increase-local-seo-rankings-with-predefined-services/
- Whitespark stati scheda: https://whitespark.ca/blog/unverified-vs-disabled-vs-suspended-gbps-whats-the-difference/ (data non trovata)
- Whitespark 1,8 M schede su SEL (2026-08-25) [fatto sul dato]: https://searchengineland.com/google-business-profiles-local-seo-success-data-485727
- Geotag test (2025-03-25) [fatto sul dato]: https://searchengineland.com/geotagging-photos-google-business-profile-rank-453525
- Sterling Sky: categorie (2025-08-12) https://www.sterlingsky.ca/google-business-profile-categories/ · servizi predefiniti (2026-02-27) https://www.sterlingsky.ca/services-in-google-business-profile-impact-ranking/ · servizi personalizzati (2024-01-24) https://www.sterlingsky.ca/do-custom-google-business-profile-services-impact-ranking/ · URL collegato (2024-09-30) https://www.sterlingsky.ca/does-the-url-you-link-to-in-google-my-business-impact-ranking-in-the-local-pack/ · Diversity Update (2025-04-14) https://www.sterlingsky.ca/googles-new-diversity-update/ · landing (2023-02-13) https://www.sterlingsky.ca/google-business-profile-landing-pages/ · sospensioni (2026-03-10) https://www.sterlingsky.ca/top-reasons-google-my-business-suspended-your-listing/ · disabled vs suspended https://www.sterlingsky.ca/difference-between-disabled-and-suspended-gbp/ · keyword nel nome (2023-08-09) https://www.sterlingsky.ca/keyword-stuffing-gmb-name/ · audit checklist (2026-07-31) https://www.sterlingsky.ca/local-seo-audit-checklist/ · near me (2025-11-05) https://www.sterlingsky.ca/what-gets-you-ranking-for-near-me-2025/ · orari (2025-03-03) https://www.sterlingsky.ca/is-listing-business-hours-crucial-for-rankings/ · post (2021-07-26) https://www.sterlingsky.ca/do-google-posts-impact-ranking/ · numero recensioni (2025-04-30) https://www.sterlingsky.ca/number-of-reviews-impact-ranking/ · attributi (2021) https://www.sterlingsky.ca/do-google-my-business-identity-attributes-impact-ranking/ · Performance (2025-03-26) https://www.sterlingsky.ca/interpret-google-business-profile-performance/
- BrightLocal: categorie (2023-06-20) https://www.brightlocal.com/research/study-do-additional-gbp-categories-boost-local-rankings/ · orari (2023-12-21) https://www.brightlocal.com/research/study-business-opening-hours-and-local-rankings/ · fattori (agg. 2026-09) https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/ · UTM https://www.brightlocal.com/learn/google-business-profile-utm-tracking/ · Q&A https://www.brightlocal.com/learn/google-q-and-a/
- Search Engine Roundtable: servizi personalizzati (2024-01-29) https://www.seroundtable.com/custom-google-business-profile-services-impact-rankings-36794.html · Q&A tolta (2025-12-15) https://www.seroundtable.com/google-maps-qa-feature-ask-40594.html · Q&A rinnovata (2026-08-19) https://www.seroundtable.com/google-business-profiles-revamped-qa-41896.html · nomi bilingue (2026-08-10) https://www.seroundtable.com/google-business-profiles-disallows-repeated-bilingual-names-41839.html · «Does this look right» (2026-09-08) https://www.seroundtable.com/gbp-does-this-look-right-to-you-email-42030.html · verifica con foto (2026-09-04) https://www.seroundtable.com/google-business-profiles-business-photo-verification-42019.html
- Local Search Forum: UTM https://localsearchforum.com/threads/utm-parameters-stripped-from-google-business-profile-website-url.62562/ · Q&A (2025) https://localsearchforum.com/threads/questions-and-answers-q-a-in-google-business-profiles-what-is-the-current-status.62392/
- DataForSEO [fatto su doc e prezzi del fornitore]: https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/ · https://dataforseo.com/pricing/serp/google-maps-serp-api · https://docs.dataforseo.com/v3/business_data/google/my_business_info/live/ · https://dataforseo.com/pricing/business-data/business-data-api · https://dataforseo.com/pricing/business-data/business-listings-api · https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-live/ · https://dataforseo.com/pricing/keywords-data/google-ads · https://dataforseo.com/update/pricing-update-in-dataforseo-apis
- DataForSEO termini di servizio (2026-06-12) [fatto sul testo]: https://dataforseo.com/terms-of-service · pagina prodotto «white-label» [settore]: https://dataforseo.com/backlinks-data-api
- n8n [fatto su doc]: https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/ · https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlebusinessprofile/ · issue refresh su 401 [contestato]: https://github.com/n8n-io/n8n/issues/18517
- OAuth, classe dello scope [settore]: https://unified.to/blog/how_to_set_up_google_business_profile_api_access_and_get_oauth_2_credentials
- Sterling Sky, sovrascritture di Google (2025-01-09): https://www.sterlingsky.ca/google-keeps-updating-changing-listing/
- Social via API, fonti secondarie non usate come fatto: https://searchengineland.com/google-business-profiles-to-let-you-manage-your-social-links-430766 · https://www.dmnetsolutions.com/social-media-links/ · https://www.soci.ai/knowledge-articles/add-social-media-links-to-google-business-profile/
- BrightLocal 18 mesi di Insights (2017-09-18): https://localsearchforum.com/threads/is-it-possible-to-get-more-that-a-3-months-worth-of-data-from-google-my-business.52438/
- Local Falcon prezzi [fatto]: https://www.localfalcon.com/pricing
- PlePer categorie: https://pleper.com/index.php?do=tools&sdo=gmb_categories
- Accesso API, esperienza: https://xovionlabs.com/blog/google-business-profile-api-hidden-gate/ (2026-05-18) · service account: https://discuss.google.dev/t/service-account-can-t-accept-google-business-profile-location-group-invitation-accounts-invitations/191897 (2025-06-17)
- Ask Maps globale: https://9to5google.com/2026/08/06/google-ask-maps-global/ (2026-08-06)
- Italia: https://pietrorogondino.com/sospensione-google-business-profile-cause-e-come-recuperare-la-scheda/ (2026-04-30) · https://www.linkmobility.com/it/blog/whatsapp-nelle-schede-google-per-messaggiare-con-gli-utenti · https://fabriziodelrio.com/elenco-categorie-google-my-business
- Q&A rimozione, agenzia: https://www.accrisoft.com/blog/2026/01/28/main/google-removes-business-profile-q-a-what-it-means-and-what-to-do-now/ (2026-01-28)

**Garante Privacy [fatto]**
- Provv. n. 591 del 2025-10-09 (doc. web 10191645): https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10191645
- Provv. 2021-02-11 (doc. web 9576735): https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9576735

**Scartate**: pesi percentuali LSRF dei blog (non nel testo Whitespark); numeri su risposte alle recensioni da blog di vendor senza metodo; statistica Google 2016 «foto +42%» non ritrovata; PushLeads su servizi predefiniti LSRF (secondaria, superata dalla rilettura diretta: #22).
