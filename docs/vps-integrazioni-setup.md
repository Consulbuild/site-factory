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
| visitatore compila il form | sito → `POST https://n8n.consulbuild.com/webhook/form-lead/<slug>` → n8n cerca lo slug nel registro → e-mail Brevo al cliente (+ copia a te) → avviso Telegram senza dati personali |
| pagina vista | script Umami → `stats.consulbuild.com` (nessun cookie) |
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
Tabella `clienti`, colonne (tutte testo): `slug`, `azienda`, `dominio`, `email`.
(Il Piano 2 aggiungerà `data_rinnovo` e `whatsapp`.)

### 4.3 Workflow `sf-registra-cliente` (chiamato dall'editor al deploy)
1. **Webhook**: Method `POST`, Path `registra-cliente`, Authentication **Header Auth**
   (credenziale «Site-factory registra»), Respond **Immediately**.
2. **Switch** su `{{ $json.body.azione }}`: uscite `upsert`, `rimuovi`, `ping`.
3. `upsert` → **Data table → Upsert** (tabella `clienti`): match `slug` =
   `{{ $json.body.slug }}`; colonne `azienda`, `dominio`, `email` dai rispettivi
   `{{ $json.body.… }}`.
4. `rimuovi` → **Data table → Delete** righe con `slug` = `{{ $json.body.slug }}`.
5. `ping` → nessun nodo (il webhook ha già risposto 200).
6. **Publish** (attiva).

### 4.4 Workflow `sf-form-lead` (chiamato dal form dei siti)
1. **Webhook**: Method `POST`, Path `form-lead/:slug`, Authentication **None**,
   Respond **Immediately**, Options → **Allowed Origins (CORS)** `*`.
2. **Data table → Get row(s)** (tabella `clienti`): filtro `slug` equals
   `{{ $json.params.slug }}`. Nessuna riga = slug sconosciuto → il flusso si ferma
   (niente e-mail a nessuno: è l'anti-abuso).
3. **If** (tutte vere): `{{ $('Webhook').item.json.body['sito-web'] }}` is empty
   (honeypot), `{{ $('Webhook').item.json.body.nome }}` is not empty,
   `{{ $('Webhook').item.json.body.telefono }}` is not empty.
4. ramo true → **Send Email** (credenziale «Brevo»): From `siti@consulbuild.com`,
   To `{{ $json.email }}`, BCC `info@consulbuild.com`,
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
5. poi **Telegram → Send message** (chat id): testo
   `Nuovo lead dal sito {{ $json.dominio }} ({{ $now.format('dd/MM HH:mm') }}) — dettagli via e-mail.`
   **Mai dati del lead su Telegram** (server extra-UE: l'informativa promette trattamento nell'UE).
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
Uptime Kuma: eliminato il __/__/____
```

## 8. Verifica finale (con Claude)

1. Cliente fittizio `zz-test-integrazione` → dominio di prova → Build: nel log compare
   «Umami: sito … · modulo → …»; l'HTML ha lo script e l'action.
2. Registro e monitor provati da script: riga nella Data table, file yaml committato,
   Gatus mostra il dominio.
3. Un lead di prova dall'anteprima locale → e-mail a info@consulbuild.com + Telegram.
4. Eliminazione del cliente → riga, sito Umami e file yaml spariscono.
5. Cavaliere Build: Legale → «Aggiorna con l'AI» (fatti di stack) → Conferma → Build →
   Pubblica → lead di prova «TEST» dal sito reale.
