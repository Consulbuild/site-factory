# Inventario dati per la dashboard centralizzata (stato 2026-09-05)

Cosa si può mostrare nell'editor, da quale servizio, come si legge, quanto è fresco.
«Verificato» = provato sull'istanza reale in questa data; «da docs» = non ancora
provato (manca una chiave o un accesso). Input del piano «Scheda Clienti / dashboard».

## Fasce di aggiornamento (da rispettare nel design)

| Fascia | Dati | Come |
|---|---|---|
| Istantaneo | stato pipeline, dominio, URL sito, esiti build/deploy/infra (`client.json`) | file locali, già letti dall'editor |
| Live con cache 1–2 min | sito su/giù e tempo di risposta (Gatus), visitatori attivi ora (Umami), stato abbonamento (Stripe) | fetch all'apertura della pagina, cache in memoria del server Next |
| Orario / a richiesta | visite e conversioni 7/30 giorni (Umami), lead ricevuti (n8n), incassato (Stripe), consegna e-mail (Brevo) | fetch con cache 1 h + pulsante «Aggiorna» |
| Push (senza editor aperto) | sito giù, errori workflow, pagamento fallito, disdetta | Gatus/n8n → Telegram (esiste); Stripe → n8n → Telegram (da fare) |

## Locale (editor) — verificato

`out/<slug>/client.json`: stato di ogni step, `steps.build.deploy.{url,dominio,deployedAt}`,
`steps.build.integrazioni.umamiWebsiteId`, `steps.build.infra.{at,commit,pushed,n8nOk,errore}`;
`brief.json`: azienda, referente, e-mail, telefono, città. Nessuna chiamata di rete.

## Umami (statistiche) — verificato con l'utente `site-factory` (ruolo user)

Login `POST /api/auth/login` → Bearer (già in `lib/integrazioni.ts`). Tutti gli endpoint
vogliono `startAt`/`endAt` in millisecondi; `timezone=Europe/Rome` per i raggruppamenti.

| Dato | Endpoint | Note |
|---|---|---|
| siti registrati | `GET /api/websites` | id, name, domain |
| visite, visitatori, rimbalzi, tempo | `GET /api/websites/{id}/stats?startAt&endAt` | include `comparison` col periodo precedente |
| visitatori attivi ora | `GET /api/websites/{id}/active` | `{visitors}` |
| serie giornaliera | `GET /api/websites/{id}/pageviews?startAt&endAt&unit=day&timezone=` | `pageviews[]`, `sessions[]` |
| pagine viste (conversioni = `/grazie/`) | `GET /api/websites/{id}/metrics?type=path&…` | **`type=url` dà 400**: il tipo giusto è `path`; compare anche `/#contatti` (hash), da filtrare |
| provenienza, dispositivo, browser, paese, regione, città, titolo | `metrics?type=referrer|device|browser|country|region|city|title` | ok |
| eventi custom | `metrics?type=event`, `GET …/events` | non ne mandiamo: vuoto |

Conversioni del modulo = pageview di `/grazie/` (redirect solo a invio riuscito).
`GET /api/version` non esiste in questa build (404).

## n8n — verificato con l'API pubblica (`X-N8N-API-KEY`)

| Dato | Endpoint | Note |
|---|---|---|
| workflow e stato attivo | `GET /api/v1/workflows` | ok |
| esecuzioni per workflow | `GET /api/v1/executions?workflowId=&status=success|error&limit=` | paginate con `cursor`; **n8n cancella le esecuzioni vecchie** (pruning, default 14 giorni): NON è un archivio dei lead |
| dettaglio di un'esecuzione | `…&includeData=true` | il lead è in `data.resultData.runData.Webhook[0].data.main[0][0].json.body` (dati personali: leggere solo se serve) |
| Data table Clienti | `GET /api/v1/data-tables` → `GET /api/v1/data-tables/{id}/rows` | `{data:[{slug,azienda,dominio,email,id,createdAt,updatedAt}],nextCursor}`; parametri accettati: `limit`, `cursor` (`take`/`pageSize`/`skip` → 400) |
| progetti | `GET /api/v1/projects` | **403 su licenza community**: irrilevante |

Proposta per contare i lead in modo durevole e senza dati personali: `sf-form-lead`
scrive una riga in una Data table **«Lead»** con SOLO `slug` + `quando` (niente nome,
telefono, e-mail): l'editor la legge da `/data-tables/{id}/rows`. Conteggio per cliente
e per mese senza trattare dati del lead lato nostro.

## Gatus (monitor) — forma della risposta verificata (curl di Mattia con basic auth)

`GET /api/v1/endpoints/statuses?page=1&pageSize=` (basic auth `consulbuild`) → array di
`{name, group, key, results:[{status, hostname, duration (ns), conditionResults:[{condition,
success}], success, timestamp}]}`; `key` = `<group>_<name>` (gruppo vuoto → `_<name>`).
Da docs, coerenti con la stessa API: `GET /api/v1/endpoints/{key}/uptimes/{1h|24h|7d|30d}`
e `…/response-times/{durata}`. Per l'editor: password nel Keychain come `GATUS_PASSWORD`.
Lezione 2026-09-05: l'immagine ufficiale porta `/config/config.yaml` di esempio: la
nostra config sta in `/gatus-config` (Dockerfile), altrimenti si sommano 7 endpoint finti.
Gatus ha anche un provider di alert `n8n` (oltre a telegram): utile se in futuro gli
alert devono passare da un workflow.

## Stripe (abbonamenti) — da docs, serve l'accesso all'account

| Dato | Endpoint (REST, chiave ristretta in sola lettura) | Note |
|---|---|---|
| abbonamenti e stato | `GET /v1/subscriptions?status=all&expand[]=data.customer` | `status` ∈ active, trialing, past_due, unpaid, canceled, incomplete; `current_period_end` = rinnovo; `cancel_at_period_end`; `items[].price.{unit_amount,recurring.interval}`; `customer.email`; `metadata` |
| entrate ricorrenti mensili (MRR) | **non esiste endpoint**: somma di `unit_amount×quantity` degli attivi, normalizzata al mese | è il calcolo che fa anche la Dashboard Stripe |
| incassato (anno/mese) | `GET /v1/invoices?status=paid&created[gte]=` → `amount_paid` | lordo; netto commissioni da `GET /v1/balance_transactions` (`net`) |
| in ritardo | abbonamenti `past_due`/`unpaid` + `GET /v1/invoices?status=open&due_date[lt]=now` | |
| prossimo rinnovo e importo | `GET /v1/invoices/upcoming?subscription=` | |
| eventi push → n8n | webhook: `invoice.upcoming` (X giorni prima, configurabile in Settings → Subscriptions, default 7), `invoice.payment_failed`, `customer.subscription.updated/deleted` | n8n ha nodo/trigger Stripe nativo |
| collegamento a un cliente dell'editor | `customer.email` = e-mail del brief, oppure `subscription.metadata.slug` | **oggi non esiste**: è il prerequisito |
| ambiente di prova | Sandbox Stripe + «test clock» per simulare i rinnovi | E2E senza aspettare un mese |

Il connettore/MCP Stripe serve a Claude in sessione (analisi), non all'automazione.

## Brevo (e-mail ai clienti) — da docs, serve una API key v3 (diversa dalla SMTP key)

`GET /v3/smtp/statistics/events?email=<cliente>&days=30` → `delivered/opened/hardBounce/
softBounce/blocked` per messaggio. Serve a sapere se il cliente riceve davvero i lead
(un bounce è un problema grave e silenzioso). Valore medio: candidato a un piano
successivo. Nota: nessun tracciamento di apertura oggi (i link non passano da Brevo).

## Cloudflare Workers — token del deploy valido; analytics non confermate

`GET /user/tokens/verify` ok. La query GraphQL `workersInvocationsAdaptive` risponde
senza errori ma vuota: probabile permesso «Account Analytics» assente sul token.
Valore basso: Umami copre le visite, Gatus la raggiungibilità. Da non inseguire.

## Coolify / Hetzner — non verificati, valore basso

Coolify ha un'API con token (applicazioni, deploy, server) e mostra le metriche del
server; Hetzner espone CPU/disco/rete via API. Per la dashboard bastano gli health
check di Gatus; spazio disco e scadenza certificati dei servizi VPS → due righe in
`infra/gatus/config/base.yaml` (Gatus le controlla e avvisa su Telegram).

## Non disponibile

- Telegram: solo invio, nessun dato da leggere.
- WhatsApp: nessun dato; l'invio richiede template approvati da Meta e un fornitore.
