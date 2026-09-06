# Integrazioni VPS nella pipeline — guida operativa

Data: 2026-09-04. Segue `docs/vps-hetzner-setup.md` (server, Coolify, n8n, Umami già
attivi). Qui: cosa impostare a mano, una volta sola, perché il deploy dell'editor
registri da solo ogni sito su modulo (n8n), statistiche (Umami) e monitor (Gatus).
Piano: `~/.claude/plans/ora-voglio-che-rifletti-zesty-swan.md`.

## 0. Cosa fa l'editor da solo (dopo questa guida)

Alla **build** di un sito con dominio: crea il sito su Umami e cuoce nell'HTML lo
script delle statistiche e l'endpoint reale del modulo. Al **deploy**: pubblica su
Cloudflare, registra il cliente nel registro n8n (email a cui mandare i lead) e
aggiunge il monitor in `infra/gatus/config/clienti/<slug>.yaml` con commit+push:
Coolify ricostruisce Gatus. Senza dominio (demo, anteprime) non succede nulla.

Chi fa cosa a runtime:

| Evento | Percorso |
|---|---|
| visitatore compila il form | sito → `POST https://n8n.consulbuild.com/webhook/form-lead?slug=<slug>` → n8n cerca lo slug nel registro → e-mail Brevo al cliente (Reply-To = il lead) → riga `{slug, quando}` nella Data table **Lead** (conteggio durevole, senza dati personali) |
| pagina vista | script Umami → `stats.consulbuild.com` (nessun cookie) |
| clic su Chiama / WhatsApp / e-mail | listener in `Base.astro` → evento Umami `chiama` / `whatsapp` / `email` (di serie su ogni sito con dominio) |
| 3 giorni prima del rinnovo | Stripe `invoice.upcoming` → n8n `sf-report-rinnovo` → e-mail «Report mensile del sito» al cliente da `report@notifiche.consulbuild.com` (§9) |
| sito o servizio giù | Gatus (ogni 5 min) → Telegram |

## 1. Telegram (5 min)

1. In Telegram cerca **@BotFather** → `/newbot` → nome «ConsulBuild Alert», username a
   piacere (deve finire in `bot`). BotFather risponde con il **token**.
2. Apri la chat col tuo nuovo bot e scrivigli «ciao».
3. Nel browser apri `https://api.telegram.org/bot<TOKEN>/getUpdates` (sostituisci
   `<TOKEN>`): nel JSON cerca `"chat":{"id":123456789` → quello è il **chat id**.
4. Bitwarden: nota `Telegram bot alert` con token e chat id.

## 2. Coolify: collega il repo GitHub e crea il monitor Gatus

1. Coolify → **Sources → + Add → GitHub App** → segui la procedura (registra l'app sul
   tuo account GitHub e **installala sul repository `Consulbuild/site-factory`**).
2. **Projects → My first project → Production → + New → Public/Private Repository
   (GitHub App)** → scegli `Consulbuild/site-factory`, branch `main`.
3. Impostazioni della risorsa:
   - Name: `gatus` · Build Pack: **Dockerfile** · Base Directory: `/infra/gatus` ·
     Dockerfile Location: `/Dockerfile` · Port (Ports Exposes): `8080`
   - Domains: `https://monitor.consulbuild.com` (prima crea su Google Domains il record
     **A `monitor` → 2.28.5.8**)
   - **Environment Variables** (runtime, non build):
     `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID` (dalla nota Bitwarden) e
     `GATUS_PASSWORD_BCRYPT_BASE64`: genera con Bitwarden una password per il pannello
     (salvala come `Gatus monitor.consulbuild.com`, utente `consulbuild`), poi nel
     Terminale del Mac:
     ```bash
     htpasswd -bnBC 10 "" 'LA-TUA-PASSWORD' | tr -d ':\n' | base64
     ```
     e incolla il risultato come valore della variabile.
   - **Persistent Storage**: volume `gatus-data` montato su `/data`.
   - **Auto Deploy**: ON (webhook della GitHub App). Se esiste «Watch Paths»:
     `infra/gatus/**` (altrimenti ogni push ricostruisce Gatus: ~20 s, innocuo).
4. **Deploy**. Apri `https://monitor.consulbuild.com` → basic auth → gruppo `vps` verde
   (coolify, n8n, umami). Prova dell'alert: chiedi a Claude di committare per un
   minuto un endpoint fittizio con `failure-threshold: 1` → arriva il messaggio
   Telegram → si rimuove.
5. **Uptime Kuma**: appena ricevuto il primo alert da Gatus, elimina la risorsa
   Uptime Kuma in Coolify (Projects → risorsa → Danger Zone) e il record DNS `status`.

## 3. Brevo (e-mail dei lead)

Stato reale (fatto il 2026-09-05): account `info@consulbuild.com`; domini autenticati
`consulbuild.com` (branded subdomain dei link = `mail.consulbuild.com`, non spedisce)
e `notifiche.consulbuild.com`; mittenti verificati:

| Mittente | Uso |
|---|---|
| `Siti ConsulBuild <siti@consulbuild.com>` | notifiche dei lead ai clienti (workflow form-lead) |
| `Report Consulbuild <report@notifiche.consulbuild.com>` | report al rinnovo (Piano 2) e ogni invio ripetuto |
| `Consulbuild <info@consulbuild.com>` | solo posta personale (Google Workspace), mai automazioni |

Regola: il dominio principale spedisce solo ciò che nessuno segnalerebbe come spam;
il ripetuto/promozionale va sul sottodominio `notifiche`, così un'eventuale
segnalazione non tocca la reputazione della casella principale.

**SMTP e API → SMTP → Genera una nuova chiave SMTP** (nome `n8n-sf-prod-01`; la chiave
si vede una sola volta). Parametri per n8n: server `smtp-relay.brevo.com`, porta `587`,
**utente = l'«Accesso» mostrato da Brevo (`xxxxx@smtp-brevo.com`, NON la tua e-mail)**,
password = la chiave, STARTTLS (SSL/TLS off). Bitwarden: `Brevo SMTP n8n` con questi
campi, più nota `Brevo` con login e i tre mittenti. Il blocco degli IP non autorizzati
si attiva solo dopo il primo invio riuscito, aggiungendo prima 2.28.5.8 in Sicurezza →
IP autorizzati.

## 4. n8n: credenziali, registro clienti, due workflow

### 4.1 Credenziali (menu **Credentials → + Add**)
- **SMTP** «Brevo»: host `smtp-relay.brevo.com`, porta 587, user/password dal §3, SSL/TLS off (STARTTLS).
- **Telegram API** «ConsulBuild Alert»: token del bot.
- **Header Auth** «Site-factory registra»: Name `X-Site-Factory-Key`, Value = un segreto
  generato da Bitwarden **senza spazi, ≥ 24 caratteri**. Bitwarden: `n8n registra-cliente key`.

### 4.2 Registro clienti (menu **Data tables → + Create**)
Tabella `Clienti`, colonne (tutte String): `slug`, `azienda`, `dominio`, `email`,
`referente`, `umami_id` (scritte dall'editor al deploy) e `stripe_customer` (scritta
dal report al primo abbinamento con Stripe). Niente data di rinnovo a mano: l'orologio è Stripe.

Altre due tabelle (Piano 2, 2026-09-06): **Lead** (`slug` String, `quando` Date) scritta
da `sf-form-lead` dopo ogni e-mail recapitata; **Report** (`slug`, `quando` Date,
`periodo_inizio` Date, `periodo_fine` Date, `visite` Number, `richieste` Number, `esito`
String = `inviato` al cliente / `prova` reindirizzato con `to` / `dryRun`) scritta da
`sf-report-rinnovo`; solo `inviato` conta per la deduplica. Le righe non si cancellano
dall'API pubblica: solo dall'interfaccia.

### 4.3 Workflow `sf-registra-cliente` (chiamato dall'editor al deploy)
1. **Webhook**: Method `POST`, Path `registra-cliente`, Authentication **Header Auth**
   (credenziale «Site-factory registra»), Respond **Immediately**.
2. **Switch** su `{{ $json.body.azione }}`: uscite `upsert`, `rimuovi`, `ping`.
3. `upsert` → **Data table → Upsert** (tabella `clienti`): match `slug` =
   `{{ $json.body.slug }}`; colonne `azienda`, `dominio`, `email`, `referente`,
   `umami_id` (da `body.umamiWebsiteId`) dai rispettivi `{{ $json.body.… }}`.
4. `rimuovi` → **Data table → Delete** righe con `slug` = `{{ $json.body.slug }}`.
5. `ping` → nessun nodo (il webhook ha già risposto 200).
6. **Publish** (attiva).

### 4.4 Workflow `sf-form-lead` (chiamato dal form dei siti)
1. **Webhook**: Method `POST`, Path `form-lead` (fisso: con un parametro `:slug` n8n
   antepone all'URL l'id interno del nodo, verificato 2026-09-05), Authentication
   **None**, Respond **Immediately**, Options → **Allowed Origins (CORS)** `*`.
   Il sito chiama `…/webhook/form-lead?slug=<slug>`.
2. **Data table → Get row(s)** (tabella `clienti`): filtro `slug` equals
   `{{ $json.query.slug }}`. Nessuna riga = slug sconosciuto → il flusso si ferma
   (niente e-mail a nessuno: è l'anti-abuso).
3. **If** (tutte vere): `{{ $('Webhook').item.json.body['sito-web'] }}` is empty
   (honeypot), `{{ $('Webhook').item.json.body.nome }}` is not empty,
   `{{ $('Webhook').item.json.body.telefono }}` is not empty.
4. ramo true → **Send Email** (credenziale «Brevo SMTP»): From `siti@consulbuild.com`,
   To `{{ $json.email }}`, **nessuna copia all'agenzia** (decisione Mattia 2026-09-05:
   con decine di siti sarebbe rumore; i numeri dei lead si leggono dalle Executions
   di n8n e dalle pagine `/grazie` in Umami, per il futuro pannello centralizzato),
   Reply-To `{{ $('Webhook').item.json.body.email }}`,
   Subject `Nuova richiesta dal sito {{ $json.dominio }}: {{ $('Webhook').item.json.body.nome }}`,
   Text:
   ```
   Nuova richiesta di preventivo dal sito {{ $json.dominio }}

   Nome: {{ $('Webhook').item.json.body.nome }}
   Telefono: {{ $('Webhook').item.json.body.telefono }}
   E-mail: {{ $('Webhook').item.json.body.email }}
   Città: {{ $('Webhook').item.json.body.citta }}
   Messaggio: {{ $('Webhook').item.json.body.messaggio }}

   Ricevuta il {{ $now.format('dd/MM/yyyy HH:mm') }}. Rispondi a questa e-mail per contattare il cliente.
   ```
5. dopo **Send Email** → **Data table → Insert** (tabella `Lead`): `slug` =
   `{{ $('Get row(s)').item.json.slug }}`, `quando` = `{{ $now.toISO() }}`. Viene DOPO
   l'e-mail di proposito: una riga = una richiesta davvero recapitata al cliente, così il
   numero nel report è vero. Niente nome, telefono o e-mail del lead.
6. **Nessuna notifica Telegram per i lead** (stessa decisione): Telegram serve solo
   per sito/servizio giù (Gatus) ed errori dei workflow (`sf-errori`). Se mai
   servisse, mai dati del lead su Telegram (server extra-UE).
7. Mai lead di prova dal modulo di un sito pubblicato: finirebbero nel conteggio del
   cliente. Per provare il report c'è `report-invia` (§9).
6. **Publish**.

### 4.5 Error workflow
Nuovo workflow `sf-errori`: trigger **Error Trigger** → Telegram «n8n: errore nel workflow
{{ $json.workflow.name }}». Poi in ogni workflow `sf-*` → Settings → Error workflow = `sf-errori`.

### 4.6 API key e versionamento
Settings → **n8n API → Create an API key** (label `site-factory`, scadenza lunga; se
chiede gli scope: tutti quelli `workflow:*`). Bitwarden: `n8n API key site-factory`.
Dopo aver salvato le chiavi nell'editor (§6), dal Terminale:

```bash
cd "/Users/mattia/Claude Projects/Site-factory/site-factory-editor" && node --experimental-strip-types scripts/n8n-import.ts export
```

scrive `infra/n8n/*.json` (da committare). `import` fa il contrario (ripristino).

## 5. Umami: utente della pipeline

Settings → **Users → Create user**: username `site-factory`, ruolo **User**, password
generata da Bitwarden **senza spazi** (Bitwarden: `Umami site-factory`). L'editor crea
i siti con questo utente: se al primo deploy Umami risponde «creazione fallita (403)»,
alza il ruolo ad Admin.

## 6. Editor: chiavi nel Keychain

Editor → **Impostazioni → Chiavi API**: `UMAMI_PASSWORD` (§5), `N8N_REGISTRA_KEY` (il
segreto del §4.1), `N8N_API_KEY` (§4.6). Ogni chiave viene provata davvero contro il
VPS prima di essere salvata.

## 7. Nota Bitwarden `VPS sf-prod-01` (aggiungere)

```
Monitor: https://monitor.consulbuild.com (utente consulbuild, password in "Gatus monitor.consulbuild.com")
Registro clienti: n8n → Data tables → clienti (slug, azienda, dominio, email)
Workflow n8n: sf-registra-cliente, sf-form-lead, sf-errori — copia in repo infra/n8n/ (scripts/n8n-import.ts)
Config monitor: repo infra/gatus/ (Coolify ricostruisce a ogni push su main)
Chiavi editor (Keychain): UMAMI_PASSWORD, N8N_REGISTRA_KEY, N8N_API_KEY
Alert: Telegram bot "ConsulBuild Alert" (nota "Telegram bot alert")
Uptime Kuma: eliminato il 05/09/2026
N8N_ENCRYPTION_KEY: non è una env di Coolify, sta in /home/node/.n8n/config del volume n8n → copia in Bitwarden
Report al rinnovo (Piano 2): workflow sf-report-rinnovo, tabelle Lead e Report, mittente report@notifiche.consulbuild.com
Stripe: chiave ristretta "n8n report" (sandbox e live) in "Stripe restricted key n8n"; credenziale n8n "Stripe ConsulBuild"
```

## 8. Verifica finale (con Claude) — fatta il 2026-09-05

1. ✅ Cliente fittizio `zz-test-integrazione` → dominio di prova → Build: nel log compare
   «Umami: sito … · modulo → …»; l'HTML ha lo script e l'action.
2. ✅ Registro e monitor: riga nella Data table, file yaml committato e pushato,
   Coolify ricostruisce Gatus, alert Telegram ricevuto.
3. ✅ Lead di prova → e-mail a info@consulbuild.com via Brevo (nessun Telegram: per
   scelta i lead non generano notifiche all'agenzia).
4. ✅ Eliminazione del cliente → riga, sito Umami e file yaml spariscono.
5. ✅ Cavaliere Build pubblicato con modulo reale + Umami; lead «TEST» dal sito reale →
   n8n success, e-mail al cliente, pageview /grazie. (Resta la Conferma umana del legale.)
6. ✅ Robustezza: workflow in errore → sf-errori → Telegram; reboot del VPS → tutti i
   container tornano da soli (~50 s), volumi n8n/Gatus intatti.

Se cambi un workflow in n8n: `node --experimental-strip-types scripts/n8n-import.ts export`
da `site-factory-editor/` e commit di `infra/n8n/`.

## 9. Report mensile al rinnovo (Piano 2, 2026-09-06)

Tre giorni prima di ogni rinnovo il cliente riceve da `Report ConsulBuild
<report@notifiche.consulbuild.com>` (Reply-To `info@consulbuild.com`) l'e-mail «Report
mensile del sito»: visitatori e visite degli ultimi 30 giorni con confronto, richieste di
preventivo (tabella Lead), contatti diretti (clic su Chiama / WhatsApp / e-mail), sezioni
più viste, dispositivi, disponibilità del sito (uptime e tempo di apertura da Gatus) e i
totali da quando il sito è online. Ogni numero viene da una risposta reale di Umami, della
tabella Lead o di Gatus; una sezione senza dati si omette, mai numeri inventati. Workflow
`sf-report-rinnovo` in `infra/n8n/report-rinnovo.json` (l'HTML vive nel nodo «Componi»).

### 9.1 Stripe (interfaccia in italiano; i nomi delle risorse restano in inglese)
Prima nella **Sandbox** (menu account → Sandboxes), poi nell'account live.
1. **Impostazioni → Billing → Abbonamenti ed email** → sezione **«Evita pagamenti non
   riusciti»** → **«Eventi di rinnovo imminenti»** → tendina **3 giorni** → Salva.
   («Invia email per i rinnovi imminenti» resta spenta: l'e-mail la manda n8n.)
2. Barra **Sviluppatori → Chiavi API → Crea chiave con limitazioni** → **«Attivare
   un'integrazione che hai creato»** → **Scegli il tuo →** → nome `n8n report` → nel campo
   **Filtra risorse**: `Customers` **Lettura**, `Subscriptions` **Lettura**, `Invoices`
   **Lettura**, `Charges` **Lettura** (serve solo al test di connessione di n8n, che legge
   `/v1/charges`), `Webhook Endpoints` **Scrittura**; il resto Nessuna → Crea chiave →
   Bitwarden «Stripe restricted key n8n (sandbox|live)».
3. Il webhook su Stripe NON si crea a mano: lo crea il nodo Stripe Trigger all'attivazione
   del workflow (verifica: **Sviluppatori → Webhook**, endpoint `n8n.consulbuild.com/…`
   con `invoice.upcoming`). La firma è verificata col segreto che il nodo si salva da solo:
   il campo «Signature Secret» della credenziale resta vuoto.

### 9.2 n8n
- **Credentials → Stripe API** «Stripe ConsulBuild» = chiave ristretta. Per passare dal
  sandbox al live basta sostituire la chiave nella stessa credenziale, poi workflow
  **Active → Inactive → Active** (ricrea il webhook nell'account live).
- **Credentials → Custom Auth** «Umami site-factory»: JSON `{"body":{"username":
  "site-factory","password":"…"}}` (creata via API dal Keychain, mai a mano in chat).
- Import: `node --experimental-strip-types scripts/n8n-import.ts import` (i 4 workflow).
  Dopo il primo import selezionare la credenziale Stripe nel trigger e attivare.
- Collegamento cliente Stripe ↔ sito: automatico per **e-mail** (quella del brief), poi
  per **nome** del referente/azienda; `metadata.slug` sull'abbonamento vince su tutto; al
  primo abbinamento l'id Stripe finisce in `Clienti.stripe_customer` e da lì è stabile.
  Cliente non riconosciuto → Telegram «Report al rinnovo NON inviato», nessun invio.

### 9.3 Rimandare o provare un report (webhook `report-invia`)
Stesso header del registro. `to` reindirizza l'e-mail (prove), `dryRun` calcola senza
spedire (riga in Report con esito `dryRun`). Da `site-factory-editor/`:
```bash
curl -s -X POST https://n8n.consulbuild.com/webhook/report-invia \
  -H "Content-Type: application/json" \
  -H "X-Site-Factory-Key: $(security find-generic-password -s site-factory -a N8N_REGISTRA_KEY -w)" \
  -d '{"slug":"cavaliere-build-srls","to":"info@consulbuild.com"}'
```
L'invio manuale non è soggetto alla deduplica (quello da Stripe sì: un report già
`inviato` al cliente negli ultimi 20 giorni non si ripete). Un invio con `to` diverso
dall'e-mail del cliente è registrato come `prova` e non blocca il report reale.

### 9.4 Simulazione del rinnovo in sandbox (E2E) — fatta il 2026-09-06
**Attenzione: l'account ha DUE sandbox** («Modalità di test» `acct_…PitzoJH9Tc` e
«CONSULBUILD di Vecchiato Edoardo sandbox» `acct_…PcEz1G5LnH`). La chiave in n8n è della
seconda: simulazioni, impostazione dei 3 giorni e webhook vanno guardati lì (menu account →
Sandboxes). Un webhook «mancante» quasi sempre è nella sandbox sbagliata: l'id del webhook
in n8n (`we_1…<hash account>…`) porta l'impronta dell'account, confrontala con l'`acct_`.
Procedura: Billing → Abbonamenti → **Simulazioni → Crea simulazione** → «Aggiungi il primo
cliente» (nome `ZZ Test Report`, e-mail `info@consulbuild.com`) → dalla scheda cliente crea
l'abbonamento: nuovo prodotto «Sito web (test)» 1 €/mese, **spegni «Riscuoti le imposte
automaticamente»** (altrimenti chiede un indirizzo), aggiungi la carta di test `4242…`
(la digita Mattia: Claude non inserisce numeri di carta) → Crea. Riga `zz-test-report` nel
registro (e-mail info@, `umami_id` di Cavaliere) → **Imposta una data/ora successiva** →
«+1 settimana» ×4 → Manda avanti → entro un minuto n8n riceve `invoice.upcoming` e il
report arriva a info@ (esito `inviato`, `stripe_customer` memorizzato nel registro). Un
secondo avanzamento («+1 mese») produce un nuovo evento che si ferma a «Già inviato?».
Alla fine: via la riga di test dal registro (`registraCliente rimuovi`) e la simulazione
dalla sandbox (cancellandola spariscono anche cliente e abbonamento).

### 9.5 Contatti diretti tracciati di serie
`site-renderer/src/layouts/Base.astro`: quando lo script Umami è attivo, un listener
delegato conta ogni clic su `tel:`, `mailto:` e `wa.me` come evento Umami `chiama`,
`email`, `whatsapp`. Vale per tutti i componenti presenti e futuri senza attributi da
ricordare; Umami spedisce con `keepalive`, quindi il clic conta anche se il link porta
via dalla pagina. Nessun dato personale. I siti già pubblicati lo prendono alla prossima
Build + Pubblica.
