# Ricerca: come raccogliere i dati del lead per la bozza (intake) — 2026-09-07

Domanda di partenza (Mattia): quando il lead clicca «Richiedi ora la tua bozza»
sull'annuncio Meta, qual è il modo migliore per raccogliere le informazioni e le
foto che servono alla pipeline per produrre la bozza reale del sito? Tally, form
nativo Meta o sito proprio con form custom? Il trust nell'uscire dall'app è un
problema vero? Cosa fanno i competitor migliori in Italia e all'estero?

Metodo: sei ricerche parallele (competitor esteri, competitor italiani, trust e
form nativi Meta, strumenti con upload foto, backend e servizi di raccolta file,
evidenza UX per form lunghi da mobile), pagine aperte davvero e limiti letti sulle
pagine ufficiali il 2026-09-07. Le fonti sono in fondo. Dove un dato è opinione di
practitioner e non misura verificata lo dico.

## 0. La risposta in breve

1. **Form proprio, brandizzato, multi-step, su un sottodominio ConsulBuild**
   (es. `bozza.consulbuild.com`), costruito con lo stack che c'è già (Astro +
   Cloudflare Workers, foto su R2, Turnstile). Costo a regime vicino a zero, nessun
   limite di upload, controllo totale su design, animazioni, browser in-app e
   automazione. È anche ciò che fanno TUTTI i player «prima la vedi, poi decidi»
   osservati: nessuno usa Tally o Typeform con redirect, il form vive sulla loro
   pagina.
2. **Il trust nell'uscire dall'app è un problema piccolo e mal definito.** Uscire
   dall'app costa 2-4× sul tasso click→lead, ma quella perdita è quasi tutta
   auto-selezione: chi esce e compila è 1,5-2,5× più qualificato e diserta gli
   appuntamenti 2-3× meno. Nessuno studio misura un effetto del dominio terzo
   contro il dominio brand. Il rischio reale e documentato è un altro: il browser
   in-app di Instagram/Facebook rompe periodicamente l'upload di file e le CTA dei
   form di terzi (2019, 2020, 2022, novembre 2025 con Typeform fermo 25 giorni), e
   con Tally o Typeform non si può fare nulla se non aspettare.
3. **Il form nativo Meta è escluso per progettazione**: massimo 15 domande, zero
   upload di file, dati cancellati dopo 90 giorni, versione «Higher intent» solo nel
   feed mobile. **Tally free** regge (10 MB per file, più file per domanda, webhook
   gratis) ma non dà dominio proprio, salva-e-riprendi, compressione delle foto,
   upload in background né mitigazioni per il browser in-app: tutte cose che
   contano per un form da 30-45 domande con foto compilato da un titolare in pausa
   cantiere.

Due pattern che non avevamo considerato e che valgono: **la scheda Google Business
come acceleratore dell'intake** (MiniPage in Italia, Frontage e Post Digital
all'estero: «dimmi nome e città, al resto penso io») e **la prenotazione della
chiamata dentro il flusso** (Revvance, Empire: la bozza si costruisce per chi ha
già fissato la presentazione).

## 1. Contesto e vincoli fissati da Mattia

- Oggi l'annuncio punta a un Instant Form Meta che raccoglie troppo poco. Il sito
  consulbuild.com è solo vetrina. L'annuncio è stato spento dopo 2 giorni perché
  erano già arrivati 7 lead: la pipeline va prima standardizzata. Stima a regime:
  15-30 lead a settimana.
- **La bozza è un sito reale** (copy, palette, immagini finali; fuori solo legale e
  servizi post-pubblicazione). Niente demo finte. Il form completo, compilato una
  volta sola, è **il filtro** che screma i curiosi e permette una sola interazione
  prima della consegna.
- Logo: se lo condivide si usa il suo, altrimenti lo genera la pipeline
  (`logo-designer`). Foto dei lavori: servono per la gallery e oggi arrivano via
  WhatsApp e vengono caricate a mano nella scheda dell'editor (lavoro da eliminare).
- Mobile e tablet in maggioranza, ma il desktop non si esclude.
- Costi: sfruttare i servizi gratuiti; a pagamento solo se nettamente migliori.
- Design, animazioni e feeling della UX: non negoziabili, livello professionale.
- Compatibilità con la pipeline e zero lavoro manuale sono fondamentali. Il
  consumatore dei dati resta l'editor: `brief.json` + `raw-submission.json`, logo in
  `out/<slug>/logo/`, foto in `out/<slug>/img/lavoro-N.jpg` con `lavori.json`
  (oggi `intake-tally.ts` + upload manuale delle foto).
- Quali domande mettere nel form si decide dopo, in una sessione dedicata. Qui c'è
  una proposta di struttura, non l'elenco definitivo dei campi.

## 2. Cosa fanno i competitor

### 2.1 Esteri: i player «build-first» (verificati aprendo i flussi)

| Player | Cosa succede dopo la CTA | Form | Foto/logo prima della bozza |
|---|---|---|---|
| WeGotSites (US) | 10 step, una domanda per schermo, «Step 1 of 10», salvataggio in localStorage, riepilogo modificabile; preview in 24 h poi «walkthrough» | Nativo Next.js | No: «già hai colori e logo? Ci disegniamo attorno» dopo il sì |
| Post Digital (contractors) | 5 campi: nome, telefono, attività, link scheda Google (opz.), una riga «di cosa ti occupi»; sito vero in <48 h, «keep it or walk», $97/mese | Nativo | No: la scheda Google è la fonte |
| Frontage | 5 campi; «logo, foto, orari e recensioni li prendiamo dalla tua scheda Google. Niente da mandarci» | Formspree | No |
| dotwall (UK) | 3 campi + toggle «vuoi un messaggio WhatsApp?»; preview + video Loom entro 12 ore lavorative | Netlify Forms | No: ricerca fatta dall'agenzia |
| Revvance, Empire (contractors) | Bozza costruita **solo dopo la chiamata prenotata** («I build your demo once you confirm you'll be there») | Calendly / booking | No |
| MyClickPage, SoftwareAura, webuildwebsites | 6-7 campi, mockup via e-mail in 24-72 h, con link di pagamento | Nativo / Netlify | No |
| MeetYourSite | Zero intake: sito costruito da dati pubblici e mandato per e-mail | Nessuno | Già nella demo |
| Durable, GoDaddy Airo | 3 domande (tipo attività, nome, città) → anteprima → account DOPO | Onboarding proprio | No; solo una scelta di stile a parole |
| Squarespace Blueprint, Wix AI, Hostinger, B12 | Account (o pagamento) prima; 4-5 domande con anteprima live | Onboarding proprio | No |
| Hibu, Thryv, Web.com, Footbridge | Form «richiedi demo» → telefonata commerciale; Footbridge manda al checkout | Eloqua / CRM | Nessuna bozza |
| Housecall Pro, Jobber (siti per trade) | Intake = dati già nel gestionale; asset via cartella Google Drive; prima bozza in settimane | In-app | Dopo |

Conteggio dei tool tra i build-first: nativo o backend proprio ×5, Netlify Forms
×2, Formspree ×1, Gravity Forms ×1, GoHighLevel ×2, Calendly ×1. **Tally, Typeform
e Jotform: zero.** Nessuno chiede logo o foto prima della bozza: li ricavano dalla
scheda Google, dalla ricerca dell'agenzia o da stock/AI, e chiedono gli asset veri
dopo il sì. Le domande ricorrenti dei form migliori: tipo attività, servizi da
evidenziare, zona servita, obiettivo del sito (più chiamate / più prenotazioni /
sembrare professionale), stile in 3 opzioni verbali, «hai già un sito?» → URL,
«quando vorresti partire?» (con avviso «chi parte prima ha priorità»), «il prezzo
ti sta?» / «sto solo guardando», contatti per ultimi.

### 2.2 Italia (17 pagine aperte, sorgente letto)

| Player | Modello | Dopo la CTA | Note |
|---|---|---|---|
| Sito Facile | Bozza gratis in 24 h, «paghi solo a bozza approvata», 19,90-49,90 €/mese o una tantum 599-1.699 € | Form nativo 5 campi, contatti prima (nome, telefono, email, azienda opz., «parlaci del progetto») | Il competitor più vicino per promessa e prezzo; materiali raccolti dopo, in modo non scritto |
| MiniPage | Sito «in meno di 3 ore», 34 €/mese, anteprima senza carta | **Onboarding conversazionale**: «Dimmi come si chiama e dove si trova: al resto penso io» → lookup della scheda Google Business → precompilazione; barra «Ancora circa 5 minuti»; contatti alla fine; fallback «Richiamatemi» con fascia oraria | Benchmark UX italiano; generalista e DIY |
| Studio Web Valdarno | Anteprima gratis, paghi se ti piace, da 400 € | 4 campi senza telefono + WhatsApp; «una chiacchierata, niente moduli infiniti» | Freelance |
| Il Sito Giusto | Demo «direzionale» | Ingresso via WhatsApp precompilato o chiamata; unica FAQ che elenca cosa serve («foto, loghi utili ma non obbligatori») | Gestione aspettative ben fatta |
| V.B. Digital | Anteprima della sola home in 5 gg | Form Divi 6 campi, contatti prima; poi e-mail con istruzioni per inviare colori, logo, servizi | |
| Sitiamo | 29 €/mese | «Richiedi la bozza» = **solo e-mail**; poi consulenza | Micro-impegno estremo |
| SitoAbbonamento.it | 49 €/mese, SEPA | **Zero form**: unica CTA WhatsApp precompilato; anteprima dopo firma e primo addebito | |
| Italiaonline | Rete vendita | «Ti chiamiamo noi»: nome, telefono, **P.IVA** | Nessuna bozza, nessuna raccolta online |
| Register, Aruba | DIY con AI o preventivo | Contatto generico | |
| Verticali edilizia (Stefanelli, Okseo, Pantaleo, SettimoLink, Viasetti) | Preventivo classico | Chiamata, WhatsApp, Calendly, form 2-8 campi | Nessuno combina bozza gratuita e abbonamento |

Pattern italiani: form corto e generico (4-7 campi, contatti prima dell'azienda,
un textarea libero, single-step, nessun progresso); foto e logo **mai** nel form
(nessun campo upload in 17 pagine), arrivano dopo per e-mail o chat e spesso
bloccano i tempi; WhatsApp come bottone in 13 pagine su 17, come processo in
nessuna; Tally/Typeform/HubSpot/Jotform: zero occorrenze, solo moduli del page
builder (Divi, Elementor, Ninja Forms, FormSubmit). **Il livello medio dei form è
basso**: un form curato con azienda prima dei contatti, servizi edilizi a scelta
multipla, zona di lavoro, lookup Google, upload foto con progresso e contatti in
chiusura sarebbe nettamente differenziante. Oggi lo fa solo MiniPage.

### 2.3 Lettura per ConsulBuild

Il pattern dominante (form cortissimo, asset dopo il sì) nasce da un vincolo che
noi non abbiamo: i competitor fanno mockup generici o di sola home e rimandano il
lavoro vero a dopo. La nostra bozza è il sito finito e la qualità vive nel contesto
reale (regola «niente invenzioni»). Quindi il form lungo è giustificato, ma va
costruito come lo costruirebbero WeGotSites o MiniPage, non come un questionario:
una decisione per schermata, progresso visibile, zero digitazione dove possibile,
il risultato mostrato prima di chiedere, e le foto messe nel punto e nel modo che
non fanno fallire l'invio. Da copiare: il lookup Google Business (MiniPage,
Frontage), le domande di qualificazione con effetto priorità (WeGotSites), il
riepilogo modificabile prima dell'invio, la prenotazione della chiamata nel flusso
(Revvance, Empire) e le FAQ sulle aspettative (Il Sito Giusto).

## 3. Il trust nell'uscire dall'app: quanto pesa davvero

Cosa dicono i dati (nessun A/B pubblico con campione dichiarato; convergenza di
dati proprietari di agenzie e benchmark):

| Misura | Instant Form (in-app) | Landing con form | Fonte |
|---|---|---|---|
| Tasso click→lead | 8-12% | 2-6% | Wevion 2026, dati propri |
| Contatti validi | 70-85% | 90-95% | idem |
| Lead qualificati | 15-35% | 35-70% | Wevion; leadgen-economy |
| No-show alla chiamata | 40-60% | 15-25% | Wevion |
| CPL Home & Home Improvement | $41,26 medio, CVR 5,22% (mix di destinazioni) | | LocaliQ/WordStream, ott. 2025 |
| Landing page servizi, mediana | | 6,6% (41.000 pagine) | Unbounce Q4 2024 |

Conclusioni difendibili: (1) uscire dall'app costa 2-4× sul volume, ma in gran
parte è filtro d'intenzione, esattamente ciò che vogliamo da un form-gate; (2)
nessuna fonte isola un bounce dovuto al dominio esterno in sé; per un titolare di
35-60 anni la fiducia la fanno continuità con l'annuncio (stesso creative, stesso
nome), italiano, telefono e indirizzo reali, «ti richiamiamo noi»; `tally.so` è un
nome che non conosce, `bozza.consulbuild.com` è neutro-positivo; (3) il 25-40% di
chi invia un Instant Form precompilato non ricorda nemmeno il brand (dato
practitioner): il form nativo produce volume, non intenzione.

Limiti verificati del form nativo Meta (Business Help Center, 2026-09-07): massimo
15 domande; tipi solo scelta multipla, risposta breve, condizionale, store locator,
appuntamento; **nessun upload di file** (l'unica funzione con file è «gated
content», dove è l'inserzionista a dare un PDF al lead); «Higher intent» solo Feed
mobile (niente Stories/Reels); «Rich creative» solo app Facebook; lead scaricabili
per 90 giorni; verifica OTP del telefono disponibile; ottimizzazione «Conversion
Leads» richiede ≥200 lead al mese. Utile invece l'opzione ufficiale «Website and
instant forms» (Meta sceglie la destinazione, solo con obiettivo volume): un test
A/B gratuito per misurare sui nostri numeri il differenziale di qualità.

Browser in-app (WKWebView custom su iOS con JS iniettato): cookie e localStorage
isolati da Safari, autofill password assente, deep link ignorati, menu «⋯ → Apri
nel browser» sempre presente, dominio visibile nella barra. Guasti documentati
sull'upload: Jotform (ott. 2022, la pagina si ricaricava alla scelta del file, fix
arrivato da Instagram settimane dopo), WP Job Openings (2019, fix: togliere
l'attributo `accept`), Shopify (apr. 2025, pagina congelata su Android), Typeform
(nov. 2025, CTA invisibili per 25 giorni «due to an update from Meta»). Con una
pagina propria si mitiga: input file nativo senza librerie drag&drop, `accept`
permissivo e senza `capture`, rilevamento dello user agent Instagram/FBAN con
invito non bloccante ad aprire in Safari/Chrome, salvataggio server-side (non solo
localStorage), foto mai bloccanti.

## 4. Strumenti: chi regge foto multiple, automazione e costo zero

Limiti letti sulle pagine ufficiali il 2026-09-07 (i dettagli e le fonti sono in
fondo). Caso d'uso: 30-45 domande, logo + 5-30 foto da telefono (2-8 MB l'una,
50-200 MB per lead), 60-130 lead al mese, webhook o API verso la nostra pipeline.

| Strumento | Free | Per file | Più file per domanda | Webhook free | Dominio proprio | Note |
|---|---|---|---|---|---|---|
| **Tally** | invii e storage illimitati | 10 MB (Pro: nessun limite) | sì, min/max | sì, firma SHA256 | solo Pro (€20/mese) | URL dei file con accessToken, scadenza non documentata: scaricare subito. Parziali solo Pro. `intake-tally.ts` già esiste |
| **Fillout** | 1.000 risposte/mese | 20 MB | sì, illimitati | «REST API» su free; webhook non escluso ma non verbatim | no | Badge Fillout; formato URL file non documentato |
| Youform | illimitato | 10 MB (Pro «illimitato») | n.d. | sì | Pro $20/mese annuale | Meno garanzie documentate di Tally |
| Jotform | 100 invii, **100 MB totali** | fino a 1 GB | sì | sì | Gold | 100 MB = un lead |
| Typeform | 10 risposte | 10 MB | **no, un file per domanda** | da Basic $28 | Enterprise | Fuori scala |
| Formbricks | 250 risposte cloud; self-host open source | impostabile | sì | «custom webhooks» da Pro | self-host | UX da survey, richiede S3 |
| Zoho Forms | 500 invii, 200 MB | 20 MB | 5 | sì | no | Niente italiano nell'UI |
| Cognito, HubSpot, Paperform, involve.me, Heyflow, Feathery | vari | | | webhook a pagamento o assenti | | Scartati (dettaglio in fondo) |
| Google Forms, Microsoft Forms | | | | | | **Login Google / account aziendale obbligatorio per l'upload**: esclusi |
| Uploadcare (solo file) | 1 GB, 1.000 op/mese | 500 MB | sì, widget in italiano | sì, con URL CDN | Business | Ottimo per le sole foto, ma è un secondo pezzo |
| Dropbox File Requests | 2 GB | 2 GB per richiesta | sì, senza account | via API + nodo n8n | no | Nessun questionario; link temporanei 4 h |
| Content Snare | nessun free, $35/mese | n.d. | sì | via API | Plus $71 | Lo strumento «giusto» per intake+file, ma a pagamento e generico |
| **Self-built su Cloudflare** | Workers 100k richieste/giorno, 10 ms CPU; body 100 MB; R2 10 GB, 1 M scritture e 10 M letture al mese, egress gratis; Turnstile gratis; Queues 10k op/giorno; Images 5.000 trasformazioni/mese | nessun limite pratico (PUT singolo fino a 5 GiB) | sì | il Worker chiama n8n | sì (serve la zona DNS su Cloudflare) | 2-4 giorni di lavoro, poi zero canone. 130 lead × 200 MB = 26 GB/mese: con cancellazione automatica dopo l'import si resta nei 10 GB gratis; anche pagando, ~0,40 $/mese |

Nessun free tier dà un vero «salva e riprendi» per l'utente: i «partial
submissions» di Tally/Youform/Typeform sono la cattura dei form abbandonati, non la
ripresa. Solo la via propria lo dà.

**Classifica per il nostro caso**: (1) form proprio su Cloudflare; (2) Tally free,
poi Pro quando serve il brand; (3) Fillout free. Tally e Fillout sono scorciatoie
oneste se si vuole partire in un giorno, ma perdono proprio dove il rischio è
reale (browser in-app, foto in background, ripresa, lookup) e non soddisfano il
vincolo su design e animazioni. Dato che Astro, Cloudflare e n8n ci sono già, il
costo marginale della via propria è basso e il controllo è totale.

## 5. Evidenza UX per un form lungo compilato da mobile

Affidabilità: [R] ricerca indipendente (Baymard, NN/g, GOV.UK), [B] benchmark di
piattaforma (Zuko 93 M sessioni, Typeform, Formstack), [C] case study di vendor.

1. **La lunghezza non è il problema, la percezione sì.** Zuko: nessuna correlazione
   tra numero di campi e completamento (assicurazioni 54 campi al 55,8%, media 10,7
   campi al 36,3%) [B]; togliere le domande «interessanti» ha fatto scendere una
   conversione del 14% (CXL) [C]. Il form si vince su struttura e sforzo per
   domanda, non tagliando domande.
2. **Multi-step batte la pagina unica da 6 campi in su.** Formstack 4,53% → 13,85%
   [B]; Venture Harbour 0,96% → 8,1% [C]; Typeform 47,3% medio contro 21,5% di
   settore [B]. GOV.UK «una cosa per pagina»: «gli utenti a bassa confidenza le
   trovano più facili» [R]. Ma sopra ~27 schermate Zuko osserva abbandono: la regola
   giusta è **una decisione per schermo** (domande strettamente correlate insieme),
   così 40 domande diventano ~20 schermate in 7-8 sezioni nominate.
3. **Apri col facile e col già fatto.** Endowed progress: tessera con 2 timbri già
   dati completata dal 34% contro il 19% [R]. Mestiere e zona pre-letti
   dall'annuncio (UTM) rendono la prima schermata «già fatta».
4. **Il cellulare presto, spiegato, unico dato personale obbligatorio.** Baymard: il
   14% rifiuta il telefono obbligatorio, il 39% dei siti non spiega perché lo chiede
   [R]; Zuko: telefono 6,3% e email 6,4% di abbandono per campo [B]. Chiederlo a
   circa un quarto del percorso con «Ti scriviamo qui quando la bozza è pronta e ti
   mandiamo il link per riprendere. Nessuna chiamata commerciale» concilia le fonti
   e permette la ripresa. Email e nome del referente in fondo. È l'unico punto dove
   le fonti divergono: vale un A/B (cellulare a un quarto contro ultima schermata).
5. **Zero digitazione dove possibile.** Scelte multiple usate 2× nei form migliori
   (Typeform) [B]; autofill correlato al completamento (Zuko) [B]; Google Places
   porta l'indirizzo da 60-90 s a 10-15 s [vendor]; la voce è 3× più veloce della
   tastiera e gli over 60 con la voce vanno veloci quanto i giovani [R] (basta il
   microfono della tastiera nativa sulle 2-3 domande aperte).
6. **Foto: consigliate, tardi, in background, mai bloccanti.** I form con upload
   obbligatori sono la categoria con ~60% di abbandono [B]; ogni campo obbligatorio
   non spiegato è fonte di abbandono [R]; il webview Instagram è fragile (§3). Su
   iPhone l'input file converte HEIC in JPEG da solo; l'HEIC arriva quasi solo da
   Android o dalla scelta «File». Il ridimensionamento lato client renderebbe
   l'upload 5-10× più veloce, ma la decisione finale (storage doc, §2 bis) è
   caricare gli originali e nascondere il tempo chiedendo le foto a metà form:
   caricare mentre l'utente prosegue, con miniatura, barra per foto e retry.
7. **Marcare obbligatorio E opzionale, validare all'uscita dal campo, errori sotto il
   campo.** Solo il 14% dei siti marca entrambi; quando si marcano solo gli opzionali
   il 32% incappa in errori [R]. Niente label dentro il campo, niente campi spezzati,
   una sola colonna, testo ≥16 px, target ≥48 px, tastiere `tel`/`email`.
8. **Mostra prima di chiedere, chiudi con «cosa succede adesso».** Form con
   immagini/video +120% di completamento (Typeform) [B]; pagina di conferma con
   tempi e passi successivi (GOV.UK) [R]. Attenzione alla parola «spam»: la frase
   «non ti spammeremo» ha ridotto le iscrizioni del 18,7%, «i tuoi dati non saranno
   condivisi» le ha aumentate del 19,5% [C].

Prefill e automazioni: fattibili e leciti il lookup della P.IVA (solo API a
pagamento, nessuna API gratuita dell'Agenzia delle Entrate; VIES gratis ma copre
solo chi è iscritto), Google Places per indirizzo e telefono (si può conservare il
`place_id`; **foto e recensioni Google non si possono salvare né riusare nel sito**,
solo mostrare live con attribuzione: la sezione `GoogleReviews` dello schema è
pensata per questo). Non fattibile in tempo reale: leggere pagina Facebook o
profilo Instagram (App Review Meta, scraping vietato); si raccoglie solo l'handle.

## 6. Raccomandazione

### 6.1 Il flusso

```
annuncio Meta ──► bozza.consulbuild.com (landing breve + form multi-step)
                    │  Worker: Turnstile, salvataggio risposte, foto → R2
                    ▼
                  R2 «inbox» (leads/<id>/lead.json + foto + logo)
                    │  Worker → webhook n8n (avviso «nuovo lead», opzionale)
                    ▼
                  Editor: «Aggiorna» = pull da R2 (come oggi da Tally)
                    → out/<slug>/brief.json, raw-submission.json,
                      logo/, img/lavoro-N.jpg + lavori.json
                    → pipeline (contesto → palette → copy → immagini → build)
                    ▼
                  Pagina «Fatto»: bozza entro 48 h + prenotazione chiamata 15'
```

- L'annuncio porta direttamente alla pagina (come tutti i build-first). Stesso
  creative dell'annuncio in cima, prezzo ripetuto (99 € + 29 €/mese), mockup
  telefono di un sito reale dello stesso mestiere, «circa 7 minuti, serve solo il
  cellulare; foto e logo se le hai». Hidden field con `fbclid`, campagna, mestiere
  (per l'endowed progress).
- La pagina di conferma chiude il cerchio operativo: «bozza entro 48 ore, ti
  scriviamo al 3xx…» e **prenotazione dello slot di presentazione** (Google
  Calendar appointment schedule o Cal.com, entrambi gratuiti nelle versioni base:
  da scegliere). Elimina il rimpallo per fissare la chiamata e, come per Revvance,
  fa investire il lead un'altra volta.
- Alternativa da tenere in tasca se il click→lead fosse troppo basso: Instant Form
  «Higher intent» con 3-5 domande e OTP → link al form completo nel messaggio di
  conferma (WhatsApp Cloud API: 0 € entro 72 h da click-to-WhatsApp, altrimenti
  ≤0,025 €/messaggio dopo 1.000 gratuiti al mese dal 1° ottobre 2026). Aggiunge un
  passaggio e infrastruttura Meta: non ora.

### 6.2 Perché non le altre opzioni

- **Instant Form Meta**: 15 domande, niente foto, 90 giorni, volume senza
  intenzione. Va bene solo come primo gradino di un ibrido.
- **Tally**: per partire oggi sarebbe accettabile (free regge tutto, Pro a 20 €
  aggiunge dominio, parziali e nessun limite per file), ma non può dare upload in
  background con compressione, ripresa vera, lookup, animazioni, mitigazioni per il
  webview, né il design che Mattia vuole. E se Meta rompe il webview, si aspetta.
- **Fillout** idem, con badge e webhook non garantiti.
- **Content Snare / Dropbox / Uploadcare**: risolvono le foto ma sono un secondo
  pezzo con un secondo brand; le foto vanno nello stesso flusso.

### 6.3 Struttura proposta del form (da finalizzare nella sessione sui campi)

Una decisione per schermo, ~20 schermate, 8 sezioni nominate, contatore per
sezione («Sezione 3 di 8 · I tuoi lavori»), autosalvataggio a ogni avanzamento.
Su desktop stessa sequenza in una card centrata con mockup più grande.

| # | Sezione | Contenuto | Obbl. | Input |
|---|---|---|---|---|
| 0 | Start | Mockup di un sito dello stesso mestiere, promessa, tempo, cosa serve, 2-3 siti consegnati | | Mestiere e zona da UTM; se webview IG/FB, avviso discreto «per le foto conviene aprire in Safari/Chrome» |
| 1 | Il tuo mestiere | Mestiere principale (già ✓); servizi che fai | sì | Radio con icone; chips multi-select dalla tassonomia edilizia + «Altro» |
| 2 | Dove lavori | Comune sede; zone servite | sì | Places autocomplete; chips di province limitrofe |
| 3 | La tua impresa | Nome; anni di attività; quante persone; sito attuale → URL; link scheda Google (opz.) | nome sì | P.IVA opzionale con reward «compiliamo noi ragione sociale e indirizzo» (v2, API a pagamento) |
| 4 | Dove ti mandiamo la bozza | Cellulare | **sì** | `type=tel`, formato libero, microcopy del perché; da qui ripresa via link |
| 5 | Cosa ti distingue | Punti di forza (chips: garanzia, sopralluogo gratuito, preventivo in 24 h, certificazioni…); 1-2 aperte (storia, cosa dicono i clienti) | chips sì | Textarea con hint microfono |
| 6 | Clienti e promesse | Tipo clienti; cosa NON promettere; bonus/incentivi trattati; quando vorresti partire | sì | Chips; alimenta `promesse_vietate`; qualificazione |
| 7 | Stile | Tono e atmosfera a scelte visuali (mappabili sul preset), colori se esistono | sì | Card A/B, niente testo |
| 8 | Foto e logo (**da spostare subito dopo il cellulare, §4**, così l'upload corre in background durante le domande seguenti) | Logo; fino a 15 foto dei lavori in qualità originale, «le 10-15 migliori»; per foto «che lavoro è?» | **no**, ma con copy «senza foto la bozza avrà la gallery vuota; le aggiungiamo appena ce le mandi» | Input file nativo `multiple accept="image/jpeg,image/png,image/webp"` (mai `image/*`: su iPhone fa arrivare HEIC) senza `capture`; nessuna compressione; upload in background con miniatura e barra; avviso se la foto è sotto i 1200 px; chip dal servizio scelto in §1 (diventa `caption` di `lavori.json`) |
| 9 | Recapiti sul sito | Telefono pubblico (= §4, modificabile), email, social, orari | tel sì | Handle IG/FB solo testo |
| 10 | Controlla e invia | Riepilogo per sezione con «Modifica»; informativa breve (skill `informativa-breve-form`) | | Submit disabilitato dopo il tap |
| 11 | Fatto | Timeline (oggi → bozza in 48 h → chiamata 15'); prenota lo slot; «vuoi aggiungere foto? rispondi al messaggio» | | |

### 6.4 Architettura tecnica (minima)

> Aggiornamento dello stesso giorno: la parte «foto e loghi» è stata rifatta in
> `docs/ricerca-storage-foto-lead-2026-09.md`. Esito (deciso da Mattia): foto in
> **qualità originale, nessuna compressione sul telefono, massimo 15 foto**,
> chieste a metà form con upload in background; destinazione **Google Drive
> dell'agenzia via n8n** (cartella `_inbox`, import nell'editor dal filesystem,
> versioni a 1600 px prodotte dal Mac come oggi), non R2. R2, Backblaze B2 e Hetzner Object Storage restano alternative se si
> vorrà disaccoppiare l'upload dal VPS. Le righe su R2 qui sotto valgono come
> variante, non come scelta.

- **Pagina**: progetto Astro dedicato (cartella nuova nel repo, design system
  proprio di ConsulBuild, non i preset dei siti clienti), pubblicato come Worker con
  static assets sul sottodominio; richiede la zona `consulbuild.com` attiva su
  Cloudflare (da verificare: se il DNS è altrove va spostato o delegato).
- **Worker** con tre rotte: `PUT /api/lead/:id/file/:nome` che streama il body
  nel bucket R2 via binding (stessa origine: niente presigned URL, niente CORS; il
  body limit di 100 MB del piano free basta a una foto per richiesta; i 10 ms di
  CPU non sono un problema perché il Worker non tocca i byte), `PATCH
  /api/lead/:id` per l'autosalvataggio delle risposte, `POST /api/lead/:id/invia`
  che verifica Turnstile, scrive `lead.json` e avvisa n8n (HMAC). L'id del lead è
  nell'URL (`?r=<id>`): il link stesso è la chiave di ripresa, indipendente da
  localStorage (isolato nel webview).
- **R2**: bucket `sf-intake`, regola di lifecycle che cancella dopo 30 giorni; il
  pull dell'editor cancella o marca l'importato.
- **Editor**: `intake-r2.ts` accanto a `intake-tally.ts`, stesso contratto di
  uscita (brief, raw, logo, foto normalizzate con la `normalizeToJpg` che c'è già,
  che gestisce anche l'HEIC via sips). Tally resta per i due clienti storici.
- **n8n**: webhook `sf-nuovo-lead` → avviso Telegram (decisione da prendere: la
  regola «niente notifiche lead all'agenzia» riguarda i lead dei siti clienti, non
  i lead commerciali nostri) e riga nel registro. Nessun altro pezzo.
- **Analytics**: Umami (c'è già) con un evento per schermata: abbandono per step,
  % con foto, % di ripresa dal link, tempo mediano, e la metrica vera: bozze che
  diventano clienti.

### 6.5 Prerequisiti e decisioni aperte

1. DNS di `consulbuild.com` su Cloudflare (custom domain del Worker).
2. Attivazione R2 sull'account (checkout, in pratica carta) e token S3 per il pull
   dell'editor, nel Keychain come gli altri.
3. Chiavi Turnstile; sito Umami per la pagina.
4. Strumento di prenotazione della chiamata (Google Calendar appointment schedule
   contro Cal.com).
5. Avviso Telegram per il nuovo lead: sì o no.
6. Elenco definitivo dei campi (sessione dedicata, con la mappa verso
   `brief.json`/`contesto.json` e la tassonomia dei servizi edilizi).
7. Possibile A/B: posizione del cellulare; destinazione «Website and instant forms».

### 6.6 Roadmap proposta (una scheda per volta, plan mode, studio /impeccable prima della UI)

1. **Form bozza** (`bozza.consulbuild.com`): pagina Astro + Worker + R2 +
   Turnstile; test su iPhone reale dentro Instagram e Facebook, su Android e su
   desktop.
2. **Intake R2 nell'editor**: lista lead, import in `out/<slug>/`, foto in
   `lavori.json`, staleness come oggi.
3. **Riaccensione dell'annuncio** con destinazione la pagina; misurazione per step;
   dopo 4 settimane decidere A/B e ibrido.

## 7. Fonti principali (lette il 2026-09-07)

Competitor esteri: wegotsites.com/en/request-preview · postdigital.marketing ·
frontagefreewebsites.com · dotwall.co.uk/free-homepage-preview · revvancegroup.com ·
empiremarketingstudios.com/website-application · myclickpage.com/free-website-mockup ·
meetyoursite.com · thomasdigital.com/free-mockup · durable.com (review
makingthatwebsite.com) · godaddy.com/resources/skills/how-to-create-website-with-ai ·
websitebuilderexpert.com (Squarespace Blueprint, Wix AI) ·
hostinger.com/support/7266945 · support.b12.io · hibu.com/who-we-help/home-services/contractors ·
footbridgemedia.com · contractorgorilla.com · help.housecallpro.com/en/articles/8058145 ·
getjobber.com/features/marketing-tools/website · contentsnare.com/website-questionnaire.

Competitor italiani: sito-facile.it · minipage.it (flusso /crea) · studiowebvaldarno.com ·
ilsitogiusto.com/blog/come-funziona-demo-gratuita · vbdigital.it/landing-anteprima-gratuita-sito-web ·
sitiamo.com/it/bozza-sito-web · sitoabbonamento.it · ilmiositowebitalia.it ·
italiaonline.it/servizi/sito-web-creato-da-noi · register.it/realizzazione-siti-web ·
hosting.aruba.it/supersite.aspx · fdlstudio.it/sito-internet-in-abbonamento · qood.it ·
stefanelliweb.it/siti-web-per-imprese-edili · okseo.it/siti-internet-per-imprese-edili ·
gabrielepantaleo.it/realizzazione-siti-web-per-imprese-edili.

Meta: facebook.com/business/help/252352181957512 (tipi di form) · /774623835981457
(limite 15 domande) · /761812391313386 (gated content, OTP, work email) ·
/3373123166040766 (logica condizionale) · /314132612401196 (CTA finali) ·
/1438863853809586 (Website and instant forms) · /1002957652106672 (AI agent, solo
inglese) · /1526849577619206 (90 giorni) · developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving ·
developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration ·
developers.facebook.com/docs/whatsapp/pricing (rate card EUR 1/7/2026) ·
developers.facebook.com/docs/whatsapp/cloud-api/reference/media.

Benchmark e trust: wevion.ai/en/blog/lead-ads-vs-landing-page-which-converts-better ·
leadgen-economy.com/blog/facebook-lead-ads-quality-collapse-cpl · localiq.com/blog/facebook-advertising-benchmarks ·
unbounce.com/average-conversion-rates-landing-pages · leadsbridge.com/blog/fake-leads-from-facebook-ads ·
nngroup.com/articles/communicating-trustworthiness · ycloud.com/blog/whatsapp-api-message-pricing-update-effective-october-1-2026 ·
datareportal.com/reports/digital-2025-italy.

Browser in-app: krausefx.com (Instagram/Facebook in-app browser, 2022) · flyn.to/blog/instagram-in-app-browser ·
jotform.com/answers/4397212 · wordpress.org/support/topic/upload-files-not-working-via-facebook-browser ·
community.typeform.com (thread 17235, nov. 2025) · community.shopify.com/t/instagramm-in-app-browser-problem/409392 ·
github.com/react-dropzone/react-dropzone/issues/665 · dev.to/jplogix/escaping-instagrams-in-app-browser-on-ios-and-why-its-so-hard-58om.

UX: zuko.io/benchmarking/industry-benchmarking · zuko.io/blog/single-page-or-multi-step-form ·
ventureharbour.com/multi-step-lead-forms-get-300-conversions · prnewswire.com (Typeform report 2024) ·
designnotes.blog.gov.uk/2015/07/03/one-thing-per-page · gov.uk/service-manual/design/form-structure ·
design-system.service.gov.uk/patterns/confirmation-pages · nngroup.com/articles/4-principles-reduce-cognitive-load ·
nngroup.com/articles/progress-indicators · nngroup.com/articles/usability-for-senior-citizens ·
baymard.com/blog/explain-phone-number-field · baymard.com/blog/required-optional-form-fields ·
baymard.com/blog/inline-form-validation · baymard.com/blog/mobile-forms-avoid-inline-labels ·
cxl.com/blog/reduce-form-fields · cxl.com/blog/web-form-optimization · coglode.com/nuggets/endowed-progress-effect ·
web.dev/articles/media-capturing-images · upsidelab.io/blog/handling-heic-on-the-web · uppy.io/docs/tus ·
hci.stanford.edu/research/speech (speech 3×) · pubmed.ncbi.nlm.nih.gov/25850116 ·
developers.google.com/maps/documentation/places/web-service/policies · console.openapi.com/apis/europeanvat/documentation ·
forum.italia.it/t/api-rest-agenzia-delle-entrate-visualizza-partita-iva/34978.

Strumenti: tally.so/pricing · tally.so/help/file-uploads · tally.so/help/webhooks · tally.so/help/custom-domains ·
fillout.com/pricing · fillout.com/help/file-upload · typeform.com/pricing · jotform.com/pricing ·
jotform.com/help/33 · youform.com/pricing · formbricks.com/pricing · zoho.com/forms/pricing.html ·
cognitoforms.com/pricing · hubspot.com/pricing/marketing · knowledge.hubspot.com/forms/edit-form-fields ·
support.google.com/docs/answer/7322334 · support.microsoft.com/en-us/forms (file upload) ·
paperform.co/pricing · involve.me/pricing · feathery.io/pricing · help.heyflow.com (FAQ plans) ·
uploadcare.com/pricing · uploadcare.com/docs/webhooks · help.dropbox.com/share/create-file-request ·
contentsnare.com/pricing · formspree (help.formspree.io, file uploads) · docs.netlify.com/manage/forms/setup ·
usebasin.com/pricing · developers.cloudflare.com: workers/platform/pricing, workers/platform/limits,
r2/pricing, r2/get-started, r2/api/s3/presigned-urls, r2/objects/multipart-objects, r2/buckets/cors,
r2/buckets/event-notifications, queues/platform/pricing, turnstile, images/pricing,
workers/configuration/routing/custom-domains · core.telegram.org/bots/faq ·
docs.n8n.io (WhatsApp Business Cloud node e trigger).
