# Audit legale del form bozza e dei documenti legali della pipeline — 14/09/2026

Verifica richiesta da Mattia: (1) il form su sito.consulbuild.com raccoglie il minimo
necessario ed è conforme a GDPR / Codice privacy / prassi del Garante; (2) l'informativa
privacy del form è completa, chiara e tutela l'agenzia; (3) i documenti legali generati
dalla pipeline (privacy, termini, informativa breve dei siti clienti) sono conformi;
(4) tutto è allineato al quadro normativo vigente al 14/09/2026.

Metodo: lettura di `site-intake/src/data/{domande,privacy}.ts`, `pages/privacy.astro`,
`legale/*.md`, `lib/engine.ts` (localStorage, UTM, user agent), `infra/n8n/{bozza,
bozza-pulizia,form-lead}.json`, `site-factory-editor/lib/legale.ts` (COSTANTI_LEGALE,
formNotice), il golden `out/cavaliere-build-srls/legale.json`; skill `informativa-breve-form`
e `tc-sito-it` (reference normativa datati giugno 2026); tool `legal-it`
(`ultimi_provvedimenti_garante`, `cerca_provvedimenti_garante`, `verifica_citazioni`
13/13 norme verificate su EUR-Lex/Normattiva); ricerca web sulle novità giugno–settembre
2026 (DPF, Digital Omnibus, AI Act art. 50, termini Anthropic).

Questo documento non è un parere legale: è la verifica tecnico-normativa dell'agenzia,
da far rivedere a un professionista prima di decisioni con impatto legale.

---

## 1. Esito in sintesi

| Area | Esito | Gravità |
|---|---|---|
| Form: dati raccolti vs minimizzazione (art. 5.1.c) | Conforme, con una riserva sulla P.IVA obbligatoria in fase demo | bassa |
| Form: base giuridica 6.1.b, presa visione senza consenso | Corretto (conferma `analisi_base_giuridica` 08/09) | — |
| Form: localStorage/sessionStorage, Umami, UTM/fbclid, user agent | Conformi (esenzione art. 122 c. 1 «strettamente necessari»); Umami va dichiarato SE attivo in produzione | bassa |
| Informativa form: elementi art. 13 | Tutti presenti tra 1° e 2° livello | — |
| **Informativa form: destinatari incompleti** — Telegram riceve nome, telefono, azienda | Manca; Telegram è extra-UE senza DPA | **alta** |
| **Informativa form: Anthropic qualificata «responsabile art. 28»** ma la pipeline usa Claude Max (Consumer Terms: niente DPA, training opt-out) | Inesatta; rischio art. 28 | **alta** |
| Informativa form: «cancellati entro 60 giorni» | Reale: 60 gg + 30 nel Cestino Drive = fino a 90; Telegram e `out/<slug>` senza scadenza | media |
| Informativa form: trasferimenti extra-UE | DPF ancora valido (appello C-703/25 P pendente); Anthropic NON cita il DPF nella sua policy → per Anthropic vale solo SCC | media |
| Informativa form: WhatsApp come canale di ricontatto | Meta non nominata tra i destinatari/strumenti | bassa |
| Documenti siti clienti: privacy + informativa breve | Conformi; 12 mesi di conservazione difendibili | — |
| **Documenti siti clienti: termini — società di capitali senza REA/capitale** (art. 2250 c.c.; art. 7 lett. d D.lgs. 70/2003) | Decisione Mattia 02/08/2026: non raccolti. Resta una non conformità per gli S.r.l./S.r.l.s. (es. Cavaliere Build) | media |
| Documenti siti clienti: AI Act art. 50 (in vigore dal 02/08/2026) | Nessun obbligo: copy con revisione umana (checkpoint) e non «di interesse pubblico» | — |
| Skill legali (reference «giugno 2026») | Nessuna modifica sostanziale tra giugno e settembre 2026; da aggiornare solo le note (vedi §5) | bassa |
| Adempimenti di accountability dell'agenzia (registro art. 30, DPA con i fornitori) | Non documentati nel repo | media |

---

## 2. Il form: cosa raccoglie e se serve

### 2.1 Dati raccolti (21 domande) e giustificazione

| Dato | Obbligatorio | Serve a | Giudizio |
|---|---|---|---|
| Mestiere, lavori, punti di forza, clienti, anni, stile, colori | sì (colori no) | contenuto del sito | necessario |
| Nome azienda, nome sito, sede, zone | sì | sito + T&C (art. 7 D.lgs. 70/2003) + foro | necessario |
| Cellulare, email, modalità di ricontatto | sì | riscontro + recapiti sul sito | necessario |
| Nome e cognome del referente | sì | interlocutore | necessario |
| Partita IVA | sì | T&C art. 7 lett. g; identità dell'impresa | **giustificabile ma non indispensabile alla demo**: si potrebbe rendere facoltativa in fase demo e raccoglierla all'abbonamento. Tenerla obbligatoria è difendibile (filtro anti-bot, B2B) purché l'informativa lo motivi, come già fa |
| Foto (≤15), logo, sito attuale, social | no | contenuto del sito | necessario, facoltativo |
| UTM/fbclid/`mestiere` dall'annuncio, user agent | automatico | precompilazione e attribuzione campagna | dichiarato in §3 dell'informativa completa: ok |
| Bozza in localStorage, manifesto foto in sessionStorage | automatico | ripresa del modulo | «strettamente necessario al servizio richiesto» → esente da consenso (art. 122 c. 1 Codice privacy; EDPB Guidelines 2/2023 su art. 5.3 ePrivacy) |

Nessun dato particolare (art. 9). Nessun campo a testo libero lungo (i campi «altro» sono
brevi): l'avvertenza art. 9 non è necessaria. Nessun marketing/newsletter → nessun
consenso, nessun doppio opt-in. Nessuna decisione automatizzata (art. 22): la catena AI
prepara una demo, non decide sull'interessato.

### 2.2 Cosa il form NON raccoglie e che i documenti dei clienti richiederebbero

- **REA / ufficio del Registro imprese / capitale sociale** per le società di capitali
  (art. 2250 c.c., commi 1-2 e 7: per S.p.A., S.a.p.a., S.r.l. — S.r.l.s. inclusa — sede,
  ufficio del registro + numero di iscrizione e capitale «secondo la somma effettivamente
  versata» vanno indicati anche nel sito web; art. 7 lett. d D.lgs. 70/2003; sanzione
  art. 2630 c.c. 103–1.032 €). Decisione di Mattia (02/08/2026) di non raccoglierli: resta
  una non conformità *del cliente* sui siti delle società di capitali (Cavaliere Build
  S.r.l.s. oggi pubblica sede e P.IVA ma non REA né capitale). Costo di correzione basso:
  3 campi facoltativi mostrati solo se la denominazione contiene S.r.l./S.p.A./S.r.l.s.
  (l'inferenza della forma esiste già in `legale.ts`).
- **PEC**: non serve sul sito (obbligo di possesso, non di pubblicazione). Corretto ometterla.
- **Forma giuridica**: inferita dalla denominazione; ok.

### 2.3 Base giuridica e casella finale

Art. 6.1.b (misure precontrattuali su richiesta dell'interessato): corretta, confermata
dal tool `analisi_base_giuridica` l'08/09. La casella «Ho letto l'informativa sulla
privacy e accetto le condizioni della richiesta» è presa visione + accettazione della
garanzia sui diritti di foto/logo: non è un consenso, quindi è legittimo renderla
bloccante. Coerente con la regola «niente checkbox di consenso per il solo contatto»
della skill e con l'orientamento del Garante.

---

## 3. L'informativa del form (breve + completa)

### 3.1 Elementi dell'art. 13: presenti

Titolare e contatti ✓ · DPO non nominato (dichiarato) ✓ · finalità e basi ✓ ·
destinatari ✓ (ma incompleti, §3.2) · trasferimenti e garanzie ✓ (da precisare, §3.4) ·
conservazione ✓ (da correggere, §3.3) · diritti 15-21 + reclamo art. 77 ✓ · natura
obbligatoria/facoltativa e conseguenze ✓ · art. 22 ✓ · link 1°→2° livello ✓ · data ✓.
Le 13 citazioni normative dei due livelli sono verificate (`verifica_citazioni` 13/13).

### 3.2 Destinatari incompleti — DA CORREGGERE

1. **Telegram**. Il workflow `sf-bozza` (nodo «Avvisa») invia a Telegram: azienda,
   referente (nome e cognome), mestiere, comune, telefono e preferenza di contatto.
   Telegram (Telegram FZ-LLC, Dubai) è un fornitore extra-UE senza DPA disponibile e
   senza decisione di adeguatezza: non è nominato nell'informativa e non può essere
   qualificato responsabile ex art. 28. Due strade:
   - (consigliata) **togliere i dati personali dal messaggio**: «Nuova richiesta:
     {azienda}, {mestiere}, {comune}, {n foto}» — resta un avviso operativo senza dati
     del referente né telefono (l'azienda è un dato d'impresa). Così Telegram esce dal
     perimetro dei destinatari di dati personali;
   - oppure nominarlo nell'informativa come destinatario con trasferimento extra-UE
     «senza garanzie adeguate», il che è difficile da giustificare per un semplice avviso.
2. **WhatsApp (Meta Platforms Ireland)**: il ricontatto avviene «con la modalità che
   scegli (WhatsApp o telefonata)». Aggiungere una riga: «per contattarti usiamo il
   telefono o WhatsApp (Meta Platforms Ireland Ltd), secondo la tua scelta».
3. **Anthropic**: vedi §3.5, la qualificazione va cambiata.
4. **Fornitori del logo (OpenAI) e delle immagini (BFL)**: la nota interna dice che
   ricevono solo ragione sociale, mestiere e città (dati d'impresa). Corretto non
   nominarli; conviene tenere questa evidenza nel registro dei trattamenti (§6).

### 3.3 Conservazione: il testo promette più di quanto il sistema fa

L'informativa dice «cancellati entro 60 giorni dall'invio». La realtà:
- `bozza-pulizia` sposta nel Cestino di Drive le cartelle `_inbox` più vecchie di 60
  giorni; il Cestino le tiene altri 30 → fino a **90 giorni**;
- la cartella importata `out/<slug>` si cancella a mano (obbligo operativo di Mattia,
  senza scadenza automatica);
- il messaggio Telegram con nome e telefono resta nella chat a tempo indeterminato;
- Anthropic conserva le conversazioni 30 giorni (o 5 anni se il training è attivo, §3.5).

Correzione minima: scrivere «entro 90 giorni» (o svuotare il Cestino nel workflow con
`permanentlyDelete`) e aggiungere una scadenza automatica o un promemoria per `out/<slug>`
dei lead non convertiti (60 gg è già la regola del piano demo: «cancellare i non
convertiti a 60 gg»).

### 3.4 Trasferimenti extra-UE: aggiornare la formulazione

Stato al 14/09/2026: la decisione di adeguatezza EU-US DPF (2023/1795) è **valida**; il
Tribunale UE ha respinto il ricorso Latombe (T-553/23, 03/09/2025); pende l'appello
C-703/25 P davanti alla Corte di giustizia, decisione non attesa prima di fine 2026.
Google LLC e Cloudflare Inc. sono certificati DPF. **Anthropic**: la privacy policy in
vigore dal 10/09/2026 indica come titolare per il SEE Anthropic Ireland Ltd e come
meccanismo di trasferimento le **clausole contrattuali tipo**; non menziona il DPF. Quindi:
- «Google e Cloudflare: decisione di adeguatezza DPF (art. 45), certificazione verificabile
  sul registro dataprivacyframework.gov»;
- «Anthropic: clausole contrattuali tipo (art. 46.2.c)»;
- togliere «per i fornitori che vi aderiscono», che è vago.
Prevedere nel registro (§6) la nota: «se la CGUE annulla il DPF, passare a SCC per Google
e Cloudflare» (entrambi le offrono nei loro DPA).

### 3.5 Anthropic e Claude Max: il punto più delicato

La regola 4 del progetto impone `claude -p` col login Max. Per la documentazione ufficiale
Claude Code (code.claude.com/docs/en/data-usage, letta il 14/09/2026):
- gli account Free/Pro/**Max** sono soggetti ai **Consumer Terms**, «including when you use
  Claude Code from these accounts»;
- con l'impostazione «migliora Claude» attiva, i dati **possono essere usati per
  l'addestramento** e conservati **5 anni**; disattivata, conservazione 30 giorni e nessun
  addestramento;
- il DPA (data processing addendum) esiste per i **Commercial Terms** (Team, Enterprise,
  API), non per i piani consumer.

Conseguenze:
1. L'informativa oggi qualifica Anthropic come fornitore che «opera come responsabile del
   trattamento (art. 28) o come autonomo titolare». Con i Consumer Terms non c'è un
   contratto ex art. 28: Anthropic tratta le conversazioni come **titolare autonomo**
   secondo la propria policy. Va scritto così, senza ambiguità: «Anthropic Ireland Ltd,
   titolare autonomo del trattamento delle conversazioni secondo la propria informativa».
2. **Da fare subito, a costo zero**: verificare in claude.ai/settings/data-privacy-controls
   che «Aiuta a migliorare Claude» sia **disattivato** sull'account usato dalla fabbrica, e
   annotarlo nel registro dei trattamenti con data. Con l'opzione attiva i dati dei lead
   (nome, telefono, sede) finirebbero in un dataset di addestramento conservato 5 anni:
   incompatibile con «cancelliamo tutto entro 60 giorni».
3. **Decisione per Mattia** (fuori dal mio perimetro, ma va detta): l'assetto conforme
   all'art. 28 per trattare dati di terzi con un fornitore AI è un contratto commerciale con
   DPA (API/Team). Restare su Max è una scelta di costo che va documentata come rischio
   accettato, con le mitigazioni: training off, dati del referente ridotti al minimo nei
   prompt (nome e telefono servono davvero al copywriter? il copy usa i recapiti aziendali,
   non il cognome del referente), informativa che dice il vero.

### 3.6 Tutela dell'agenzia: cosa c'è e cosa manca

Presente e ben fatto: garanzia del richiedente sui diritti di foto e logo e sulle persone
ritratte (art. 96 L. 633/1941), licenza limitata a demo e sito, «restano tuoi», finalità
di pubblicazione temporanea della demo con i recapiti, nessun marketing.

Da aggiungere per rafforzare la posizione dell'agenzia:
- **Responsabilità sui contenuti forniti**: «Il richiedente è responsabile della veridicità
  dei dati e delle affermazioni sull'attività (anni di esperienza, certificazioni,
  zone servite) che chiede di pubblicare». Oggi la garanzia copre solo foto e logo.
- **Natura della demo**: «La demo è una proposta non vincolante; non costituisce offerta
  contrattuale né garanzia di disponibilità del nome del sito» (il controllo del dominio
  via DNS è un segnale prudente, come dice `dominio.ts`; il richiedente potrebbe credere
  che il nome sia «suo»).
- Questi punti stanno bene nel blocco «condizioni della richiesta» (2 bis), senza
  trasformarlo in un contratto: la casella resta presa visione + accettazione.

### 3.7 Umami sul form

`Base.astro` carica Umami solo se `PUBLIC_UMAMI_*` sono impostate alla build; il README
le prevede. Se in produzione sono attive, l'informativa del form deve avere il paragrafo
statistiche (lo stesso già usato per i siti clienti: senza cookie, senza IP, aggregato,
nessun banner). Se non sono attive, niente da fare. **Da verificare sul deploy.**

### 3.8 Cookie banner

Non serve: nessun cookie, nessun tracker di terzi; localStorage/sessionStorage sono
strettamente necessari (art. 122 c. 1); Umami (se attivo) è senza cookie e senza
fingerprinting persistente (Linee guida Garante 10/06/2021 e FAQ analytics). Il
Digital Omnibus sull'ePrivacy **non è stato adottato** (in negoziato, non prima di fine
2026): il quadro cookie resta quello del 2021.

---

## 4. Documenti legali dei siti clienti (step `legale`)

Golden esaminato: Cavaliere Build S.r.l.s. (privacy 05/09/2026, termini 21/07/2026).

**Privacy (9 sezioni)**: art. 13 completo; base 6.1.b; avvertenza art. 9 sul campo
messaggio ✓; destinatari reali (Cloudflare, n8n+Brevo UE, Umami UE) con clausola
condizionale sui trasferimenti ✓; conservazione 12 mesi difendibile (nessun provvedimento
del Garante fissa un massimo per i lead da form; 12-24 mesi è la prassi accettata);
diritti + reclamo ✓; sezione cookie/statistiche corretta e coerente col Base.astro.
Un'imprecisione: «I dati sono trattati all'interno dell'Unione europea» seguito dalla
clausola condizionale: Cloudflare è statunitense (certificata DPF). Meglio: «Cloudflare
Inc. (USA) aderisce al DPF» esplicito, così la frase non contraddice l'elenco.

**Informativa breve (template TS)**: conforme alla skill; artt. 15-21, art. 6.1.b,
Garante, link /privacy ✓.

**Termini (8 sezioni)**: art. 7 D.lgs. 70/2003 ✓ (ma senza REA/capitale per le società di
capitali: §2.2); 1229 c.c. formulato come delimitazione ✓; 1336 ✓; 1341-1342 elencate e
qualificate senza finto checkbox ✓; foro Monza con salvezza del foro del consumatore
(66-bis) ✓; rinvio privacy ✓; data ✓. Nessun obbligo AI Act art. 50 (in vigore dal
02/08/2026, non rinviato dall'AI Omnibus): il copy passa da revisione umana e non è
«testo di interesse pubblico» (art. 50.4); la nota di trasparenza resta facoltativa.
Legge italiana 132/2025 sull'IA: l'obbligo informativo dell'art. 13 riguarda le
professioni intellettuali regolamentate, non l'agenzia web.

**Demo**: senza `legale.json` le pagine /privacy e /termini della demo mostrano il
documento di esempio col banner «Anteprima» e il modulo non ha `FORM_ACTION` (nessun
lead raccolto): accettabile perché la demo è noindex, dura 15 giorni ed è dichiarata
nell'informativa del form. Va tenuto così: mai attivare il modulo reale su una demo.

---

## 5. Aggiornamento normativo al 14/09/2026

Novità verificate tra giugno (data dei reference delle skill) e settembre 2026:

| Novità | Stato | Impatto sui documenti |
|---|---|---|
| DPF EU-US: appello C-703/25 P alla CGUE | pendente, DPF valido | nessuno; nota di contingenza nel registro |
| AI Omnibus (rinvio obblighi alto rischio AI Act) | adottato dal Consiglio 29/06/2026 | nessuno (non tocca l'art. 50) |
| AI Act art. 50 (trasparenza) | in vigore dal 02/08/2026; solo il marking macchina 50.2 ha grazia al 02/12/2026 per i sistemi preesistenti | nessun obbligo per copy con revisione umana; reference della skill già corretto |
| Data Omnibus (GDPR/ePrivacy/cookie) | in negoziato, non adottato | nessuno: quadro cookie 2021 invariato |
| Direttiva 2023/2673 (pulsante di recesso dal 19/06/2026) | in vigore | non applicabile (niente vendita online); reference già la cita |
| Garante: provvedimenti giugno–settembre 2026 | telemarketing (TIM 31/07), informative videosorveglianza, graduatorie, sanità | nessuno rilevante per form di contatto B2B |
| Anthropic: nuova privacy policy 10/09/2026 (titolare SEE Anthropic Ireland, SCC) | in vigore | aggiornare §4-5 dell'informativa del form (§3.4-3.5) |

**Skill `informativa-breve-form` e `tc-sito-it`**: i reference (giugno 2026) restano
esatti nella sostanza. Aggiornamento consigliato, solo di note: data di verifica →
settembre 2026; nota DPF «appello C-703/25 P pendente»; nota AI Act «art. 50 in vigore
dal 02/08/2026, non rinviato»; nel reference T&C, richiamo esplicito all'art. 2250 c.c.
per le società di capitali (oggi c'è solo l'art. 7 D.lgs. 70/2003). Le skill globali si
modificano solo a mano (regola di casa): sono note per Mattia, non le ho toccate.

---

## 6. Accountability dell'agenzia: cosa manca nel repo

Nulla di questo compare nel repo o nei documenti; senza, in caso di reclamo o ispezione
l'agenzia non dimostra la conformità (art. 5.2, 24 GDPR):

1. **Registro dei trattamenti (art. 30)**: l'esenzione per <250 dipendenti non vale per
   trattamenti «non occasionali» come la raccolta lead. Generabile con
   `genera_registro_trattamenti` (legal-it): 3 trattamenti (lead del form, clienti
   abbonati, siti dei clienti in cui ConsulBuild è responsabile ex art. 28 per hosting/
   modulo/statistiche).
2. **Contratti art. 28 con i fornitori**: Google Workspace (DPA incluso nei termini),
   Cloudflare (DPA), Hetzner (AVV/DPA), Brevo (DPA). Conservare copia o link firmato.
   Non esistono per Telegram (§3.2) e per Anthropic consumer (§3.5).
3. **ConsulBuild come responsabile dei clienti**: sui siti pubblicati l'agenzia riceve i
   lead del cliente (n8n → Brevo → e-mail al cliente) e tiene le statistiche: serve un
   **DPA agenzia↔cliente** (art. 28.3) nel contratto di abbonamento. Generabile con
   `genera_dpa`. Oggi la privacy dei clienti dichiara l'agenzia come fornitore tecnico,
   ma il contratto che lo prova non è nel repo.
4. **Evidenza dell'opt-out training Anthropic** con data (§3.5).
5. **Procedura data breach** (72 h, art. 33): un paragrafo nel manuale dell'editor con
   il tool `valutazione_data_breach` basta.

---

## 7. Piano di correzione proposto (in ordine di priorità)

1. Telegram: togliere referente e telefono dal messaggio «Avvisa» (`infra/n8n/bozza.json`,
   poi import). 10 minuti.
2. Verificare e annotare l'opt-out training sull'account Max; decidere se restare su Max
   (rischio accettato e documentato) o passare a un piano con DPA per lo step contesto/copy.
3. Informativa del form (breve + completa + `legale/*.md`): Anthropic come titolare
   autonomo con SCC; Google/Cloudflare con DPF; WhatsApp/Meta; conservazione 90 giorni
   (o purge del Cestino); responsabilità sui contenuti e natura non vincolante della demo;
   paragrafo statistiche se Umami è attivo. Nuova data. Una scheda di lavoro breve.
4. Registro dei trattamenti + raccolta DPA dei fornitori + DPA agenzia↔cliente nel
   contratto di abbonamento (legal-it: `genera_registro_trattamenti`, `genera_dpa`).
5. Società di capitali: 3 campi facoltativi (REA, ufficio registro, capitale) nel form o
   nell'editor, mostrati solo per S.r.l./S.p.A./S.r.l.s., e righe condizionali nei termini
   (la skill già le prevede). Richiede di rivedere la decisione del 02/08/2026.
6. Note di aggiornamento nei reference delle due skill (a mano, Mattia).

Fonti consultate (14/09/2026): code.claude.com/docs/en/data-usage; anthropic.com/legal/privacy
(eff. 10/09/2026); iapp.org e streamlex.eu su Latombe T-553/23 e C-703/25 P;
gibsondunn.com e goodwinlaw.com su AI Omnibus e art. 50; europarl.europa.eu legislative
train sul Digital Omnibus; garanteprivacy.it (newsletter 551 dell'11/09/2026);
simpleanalytics.com su Telegram e GDPR. Norme: EUR-Lex e Normattiva via `cite_law`.
