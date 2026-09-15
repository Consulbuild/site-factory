# Piano K1 — Chiavi API per gruppi e chiavi del Traffico

Brief: `docs/traffico/brief-K1.md`. Fase 1 (solo documenti), 15/09. Letti: codice citato sotto, `piano-T2a.md` §1, §5-§6,
§8, §14; `piano-T2b.md` §1, §5; `piano-T4.md` §1-§2, §9-§10; `piano-G1.md` §2, §10; `decisioni-piani.md`; `DESIGN-SYSTEM.md`
§5, §6, §10-§12; guida Next 16 `01-app/01-getting-started/15-route-handlers.md` (route handler non in cache; `dynamic` resta
valido: `cacheComponents` non è attivo in `next.config.ts`). Verificati il 15/09 su docs.dataforseo.com (user_data, errori)
e developers.cloudflare.com (list zones).

## 1. Fatti verificati

- `site-factory-editor/lib/secrets.ts`: `KNOWN_KEYS` righe 14-26 (9 chiavi, nessuna del Traffico: T0 non ne ha aggiunte,
  `piano-T0.md` riga 32), `KEY_LABELS` 29-39; `setSecret` 51-59 accetta `^[\x21-\x7E]{8,}$` e passa il valore su stdin
  a `security -i`; `secretHint` 98-101 = «…» + ultimi 4.
- `app/api/setup/keys/route.ts`: GET 10-19 = array piatto `{name,label,configured,hint}`; `provaKey` 22-63; POST 66-82
  prova e poi salva, **senza rilettura**. Prove oggi: OpenAI `GET /v1/models`, Cloudflare `GET /user/tokens/verify`,
  account ID con formato e prova combinata solo se il token è salvato (35-43), BFL `get_result` con id fittizio, VPS via
  `umamiLogin`/`registraCliente`/`n8nPing`/`stripePing`/`gatusPing`. OpenAI, Cloudflare e BFL usano `fetch` **senza timeout**
  (26, 30, 39, 47); `http()` di `lib/integrazioni.ts` 34-36 lo mette (15 s).
- `components/home.tsx`: `KeySetup` 17-91 (input `type="password"` con `max-w-sm` in un `flex` che non va a capo, 60-74;
  «Verifico…» durante la prova), riusato da `images-runner.tsx` 36 e `pubblicazione-sito.tsx` 67-81; `ApiKeysPanel`
  101-158: `<details className="card" open>`, una lista, stato in mono «configurata · …abcd» / «mancante» (131-133).
  Unico consumatore del GET (106). `app/impostazioni/page.tsx` 17 monta il pannello: non cambia.
- Limite del Keychain: `security -i` legge ogni comando in un buffer di 4096 byte (`piano-T2a.md` 29-32); il comando attorno
  al valore occupa ~75 byte.
- Piani che prevedevano chiavi: **T2a** tabella 267-271, §5.1 277-285, `firmaJwt` 288-300, `lib/secrets.ts` e route nel
  perimetro 423-424; **decisione T2a.3** (`decisioni-piani.md` 223-224): secondo token Cloudflare solo DNS, mentre il testo
  del piano (273, 369-375, 609) allarga ancora il token del deploy. **T2b** 46-48, 205, 380-381: usa
  `GOOGLE_SERVICE_ACCOUNT` dal Mac e `GOOGLE_API_KEY` per CrUX (header `X-Goog-Api-Key`). **T4** 30, 53, 588-589, 652-654:
  `DATAFORSEO_LOGIN`/`PASSWORD` e prova `user_data` nel suo M2. **G1** 572, 659: solo DataForSEO, tramite `lib/dataforseo.ts`.
- DataForSEO: `GET https://api.dataforseo.com/v3/appendix/user_data`, Basic auth, «Your account will not be charged», ok =
  `status_code 20000`, saldo in `tasks[0].result[0].money.balance`; errori 401/40100 credenziali, 40104 account da
  verificare, 40207 IP non in whitelist. Credenziali su `https://app.dataforseo.com/api-access`.
- Cloudflare `GET /zones` richiede «Zone Zone Read»; la documentazione non dice se senza permesso risponde 403 o lista vuota.

## 2. Chiavi e prove

Nuove in `KNOWN_KEYS` (gruppo 3). Timeout 10 s per chiamata, salvo PSI. Ogni prova passa da `redigi(testo, valore)` e non
compone mai messaggi con URL o header. Tutti gli endpoint sono gratuiti; il banco lo impone con una lista chiusa (§6).

| Chiave · etichetta | Formato atteso | Prova (endpoint esatto) | Errori tradotti | Usata da |
|---|---|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT` · «Google Cloud (service account di scrittura: verifica siti e Search Console)» | JSON del file scaricato (o suo base64), normalizzato in base64url del JSON compatto `{client_email, private_key, private_key_id}` (~2,5 KB, tetto 4000) | JWT (scope `siteverification` + `webmasters`) → `POST https://oauth2.googleapis.com/token` → `GET https://www.googleapis.com/webmasters/v3/sites` → `GET https://www.googleapis.com/siteVerification/v1/webResource`; stop al primo errore (dubbio 1) | formato: «Non è il JSON di un service account: incolla il file intero, senza modifiche» · `invalid_grant` «Google ha rifiutato la chiave: revocata, o l'ora del Mac è sbagliata» · 401 `invalid_client` «chiave cancellata in Google Cloud» · 403 `SERVICE_DISABLED` «abilita la Google Search Console API» / «abilita la Site Verification API» | T2a, T2b |
| `GOOGLE_API_KEY` · «Google Cloud (API key: PageSpeed Insights e CrUX)» | `^AIza[0-9A-Za-z_-]{35}$` | `GET https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=https%3A%2F%2Fwww.google.com%2F&strategy=mobile&category=performance`, header `X-Goog-Api-Key`, timeout 60 s | motivo da `error.details[].reason` o `error.errors[].reason`: `API_KEY_INVALID` «chiave API Google non valida» · `SERVICE_DISABLED` «abilita la PageSpeed Insights API» · `API_KEY_SERVICE_BLOCKED` «la chiave è limitata ad altre API: aggiungi PageSpeed Insights API e Chrome UX Report API» · 429 = chiave valida, si salva | T2a, T2b |
| `BING_WEBMASTER_API_KEY` · «Bing Webmaster Tools (API key)» | nessun formato documentato: solo la regola di `setSecret` | `GET https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=<chiave>` → 200 con `d` array | `InvalidApiKey` nel corpo «API key Bing non valida: rigenerala in Impostazioni → API Access» · altro «Bing ha risposto {status}» | T2a |
| `DATAFORSEO_LOGIN` · «DataForSEO (login API)» | solo la regola di `setSecret` | se `DATAFORSEO_PASSWORD` è salvata: `GET https://api.dataforseo.com/v3/appendix/user_data` con la coppia; altrimenti nessuna chiamata (come l'account ID Cloudflare) | 401 / 40100 «DataForSEO ha rifiutato login o password: controllali su app.dataforseo.com → API Access» · 40104 «account DataForSEO da verificare prima di usare le API» · 40207 «l'IP del Mac non è nella whitelist di DataForSEO» | T4, G1 |
| `DATAFORSEO_PASSWORD` · «DataForSEO (password API)» | idem | idem, simmetrica (login salvato) | idem | T4, G1 |
| `CLOUDFLARE_DNS_API_TOKEN` · «Cloudflare (token solo DNS: verifica Google e Bing)» | nessuno | `GET https://api.cloudflare.com/client/v4/zones?name=consulbuild.com&per_page=5` (+ `account.id` se salvato) → una zona | 400/401 «token Cloudflare non valido o scaduto» · 403 o lista vuota «il token non vede consulbuild.com: servono Zone: Read e DNS: Edit su tutte le zone dell'account ConsulBuild» | T2a (D2-D5) |

Comuni a tutte: `TimeoutError` «{servizio} non ha risposto entro {n} s: riprova»; errore di rete «{servizio} non
raggiungibile: controlla la connessione»; 5xx «{servizio} ha un problema temporaneo ({status})». DNS: Edit non si prova
senza scrivere: lo dice il primo passaggio di T2a con il suo messaggio (piano-T2a riga 325).

**Salvataggio (POST)**: `normalizza(name, testo)` (solo il service account cambia forma) → prova → `setSecret` →
`getSecret(name) === valore`, altrimenti 500 «salvataggio nel portachiavi incompleto: riprova» (vale per tutte le chiavi,
costa una lettura). `setSecret` rifiuta valori oltre 4000 caratteri con «valore troppo lungo per il portachiavi
({n} caratteri, massimo 4000)», prima di chiamare `security`.

## 3. UI — shape (/impeccable)

**Compito.** Mattia apre Impostazioni con in mano una chiave appena creata: deve trovare in un colpo d'occhio **dove va**,
**se c'è già** e **dove si prende** quella che manca. Frequenza bassa, precisione alta: niente decorazione.

**Struttura.** Stessa `<details className="card" open>` «Chiavi API» con la frase sul Keychain. Dentro, tre `<section>`
separate da `border-t border-line`, in ordine: Produzione e sviluppo siti, VPS e dashboard clienti, Ottimizzazione del
traffico. Testata di gruppo: `h3` `text-sm font-semibold`, a destra `text-xs text-muted` «3 di 4 configurate» (testo, non
badge); sotto la frase `text-sm text-muted`:
- siti: «Servono alla catena che crea i siti: immagini, logo e pubblicazione su Cloudflare.»
- VPS: «Collegano l'editor ai servizi sul VPS e a Stripe: form, statistiche, monitor e abbonamenti.»
- traffico: «Servono ai servizi Traffico: avvisare Google e Bing, misurare la velocità, leggere ricerche e schede della
  zona. Le prove usano solo chiamate gratuite.»

**Riga chiave** (`li`, `flex flex-wrap items-center gap-3 py-2.5`): etichetta `text-sm font-medium`; sotto,
`<Badge tone="ok">Configurata</Badge>` + mono `…abcd`, oppure `<Badge tone="idle">Mancante</Badge>`, poi il link «Dove si
prende» (`text-xs`, icona lucide `ExternalLink` 12 px `aria-hidden`, `target="_blank" rel="noopener noreferrer"`, testo
`sr-only` «(nuova scheda)»). Per le chiavi del VPS non esiste una pagina pubblica: al posto del link, testo muted «In
Bitwarden: «Umami site-factory»» (voci da `docs/vps-integrazioni-setup.md`: `n8n registra-cliente key`,
`n8n API key site-factory`, `Gatus monitor.consulbuild.com`; Stripe ha il link). A destra `btnSecondary`
«Aggiungi»/«Aggiorna». Aperta: `KeySetup compact` a tutta riga (`basis-full`), segnaposto dal registro, una riga d'aiuto
`text-xs text-muted` solo dove serve (service account: «Incolla tutto il file JSON scaricato da Google Cloud»; PSI: «La
prova misura google.com: può servire fino a un minuto»; DataForSEO: «La prova parte quando ci sono login e password»).

**Link «dove si prende»** (URL controllati il 15/09, rispondono o portano al login): BFL `https://dashboard.bfl.ai/` ·
OpenAI `https://platform.openai.com/api-keys` · token Cloudflare (entrambi) `https://dash.cloudflare.com/profile/api-tokens`
· account ID `https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/` · Stripe
`https://dashboard.stripe.com/apikeys` · service account `https://console.cloud.google.com/iam-admin/serviceaccounts` · API
key Google `https://console.cloud.google.com/apis/credentials` · Bing `https://www.bing.com/webmasters/settings/api` ·
DataForSEO `https://app.dataforseo.com/api-access`.

**Stati.** Caricamento: «Carico…» già esistente; GET fallito: `Banner tone="err"` «Stato delle chiavi non leggibile» con
«Riprova» (oggi diventa lista vuota senza spiegazione); prova in corso «Verifico…»; errore sotto l'input `text-err` col
messaggio tradotto. Una sola primaria visibile (il «Salva e verifica» della riga aperta; `openKey` ne apre una alla volta).

**Mobile e temi.** A 400 px: form di `KeySetup` `flex flex-wrap`, input `min-w-0 flex-1 sm:max-w-sm`, bottone che va a
capo; il conteggio del gruppo va sotto il titolo. Solo token (`text-muted`, `border-line`, `Badge`): nessun colore nuovo,
nessun motion. Stato mai solo colore (testo nel badge). Controllo nei due temi a 1280 e 400 px; stesso controllo su
`pubblicazione-sito` e `images-runner` che riusano `KeySetup`.

## 4. File e perimetro

| File | A/M | Cosa |
|---|---|---|
| `site-factory-editor/lib/secrets.ts` | M | 6 nomi e etichette; `KEY_GROUPS {id,titolo,frase,chiavi}[]`; `KEY_INFO: Record<KeyName,{dove:{href?,testo},segnaposto?,aiuto?}>` (il `Record` fa fallire `tsc` se una chiave non ha voce); tetto 4000 in `setSecret` |
| `site-factory-editor/lib/chiavi-traffico.ts` | A | `normalizzaServiceAccount`, `firmaJwt` + `SCOPE_GOOGLE` (testo di piano-T2a §6), `provaChiaveTraffico(name, valore, { fetch, getSecret })`, `traduciErrore`, `redigi`, `ENDPOINT_GRATUITI`. Solo `node:crypto`, import di tipo da `secrets.ts` (banco con strip-types, nessun Keychain) |
| `site-factory-editor/app/api/setup/keys/route.ts` | M | GET `{ gruppi: [{ id, titolo, frase, chiavi: [{ name, label, configured, hint, dove, segnaposto?, aiuto? }] }] }`; in `provaKey` una riga che delega le 6 chiavi; POST con normalizzazione e rilettura |
| `site-factory-editor/components/home.tsx` | M | `ApiKeysPanel` per gruppi (§3); `KeySetup`: form che va a capo, `aiuto` facoltativo |
| `site-factory-editor/scripts/test-chiavi.ts` | A | banco senza rete (§6) |
| `docs/DEBUG.md` | M | riga «chiave rifiutata in Impostazioni» → messaggio della route, `scripts/test-chiavi.ts`, mai il valore nei log |
| `docs/traffico/**` | M | piano chiuso, README §7-§8 |

`.claude/scope.json`: `{"task":"K1 chiavi API per gruppi","perimetro":["site-factory-editor/lib/secrets.ts",
"site-factory-editor/lib/chiavi-traffico.ts","site-factory-editor/app/api/setup/keys/route.ts",
"site-factory-editor/components/home.tsx","site-factory-editor/scripts/test-chiavi.ts","docs/DEBUG.md","docs/traffico/**"]}`.
Nessun file in comune con il perimetro T3 attivo; lo scope.json è unico (dubbio 4).

## 5. Milestone

**M1 — Registro e pannello per gruppi.** `secrets.ts` (nomi, gruppi, info, tetto), GET della route, `home.tsx`. Le 6 chiavi
nuove rispondono «nessuna prova definita» finché non c'è M2 (non si salvano). Verifica: `npx tsc --noEmit`, `npm run build`;
browser su :3311 Impostazioni nei due temi a 1280 e 400 px; `impeccable detect` + `/impeccable critique`. Commit + push.
**M2 — Prove del Traffico.** `chiavi-traffico.ts`, delega e POST (normalizzazione, rilettura), banco. Verifica: banco verde,
`tsc`, `build`, E2E §6. Commit + push.
**M3 — Chiusura.** `docs/DEBUG.md`, README Traffico, stato nel piano; perimetro svuotato con elenco dei file toccati.

## 6. Test ed E2E

Banco `node --experimental-strip-types scripts/test-chiavi.ts`, `fetch` finto che registra URL e risponde da tabelle:
1. JSON di service account con una chiave RSA generata in memoria (`generateKeyPairSync`), a capo tolti come fa l'input
   password → base64url compatto < 4000, decodifica identica; stesso esito da base64 del file.
2. `type` diverso, `client_email` non `.iam.gserviceaccount.com`, PEM rotto, testo qualsiasi → messaggi del §2.
3. `firmaJwt` verificabile con la chiave pubblica; header e claim di piano-T2a §6.
4. Per ogni errore tradotto del §2 (Google, Bing, DataForSEO, Cloudflare, timeout, rete, 5xx): messaggio atteso e **nessun
   messaggio contiene il valore**, `apikey=` o `Authorization`.
5. DataForSEO con una metà sola salvata → zero chiamate; con entrambe → una chiamata con Basic auth.
6. Ogni URL chiamato è in `ENDPOINT_GRATUITI`; numero massimo di chiamate per prova (service account 3, le altre 1).
7. `KEY_GROUPS` contiene ogni `KNOWN_KEYS` una sola volta; ogni `dove.href` è `https://`.
8. Tetto 4000 in `setSecret` controllato prima dello spawn (funzione pura esportata del controllo).

E2E sul dev server (:3311), senza chiavi vere e senza spesa: `security find-generic-password -s site-factory -a <nome>`
per le 6 chiavi prima e dopo (atteso: assenti, invariate). `curl -X POST /api/setup/keys` con valori finti per ognuna →
400 e messaggio italiano senza il valore (`AIza` + 35 caratteri finti → `API_KEY_INVALID` tradotto; login/password
DataForSEO finti → 401 tradotto; JSON di service account con chiave generata → `invalid_grant`/`invalid_client` tradotto;
token Cloudflare e chiave Bing finti → messaggi del §2); `grep` dei valori finti nel log del dev server = 0. GET → tre
gruppi con 4, 5, 6 chiavi e stati invariati per le 9 esistenti. Browser: flusso Aggiungi → errore → Aggiorna nei due temi.
Con le chiavi vere (Mattia): «Configurata · …» per ognuna; nessun'altra chiamata oltre a quelle del §2.

## 7. Rischi

| Rischio | Contromisura |
|---|---|
| Service account troncato nel Keychain | forma compatta, tetto 4000 prima dello spawn, rilettura dopo il salvataggio, banco 1 e 8 |
| Chiave nei log o nelle risposte | `redigi`, messaggi composti senza URL e header, banco 4, grep E2E |
| Una prova spende | lista chiusa `ENDPOINT_GRATUITI` imposta dal banco; DataForSEO solo `user_data` |
| PSI lenta (fino a 60 s) | «Verifico…» e riga d'aiuto; la route non ha tetti più bassi |
| Creazione della chiave JSON bloccata dall'organizzazione Google | passo di piano-T2a §8.2 (override della policy sul solo progetto) |
| Cloudflare 403 o lista vuota senza permesso | entrambi tradotti nello stesso messaggio |
| `KeySetup` condiviso cambia due altre schede | modifica solo di layout; controllo visivo di quelle schede in M1 |
| Doppioni con T2a/T4 | nota di allineamento (§8) valida sopra i loro testi |

## 8. Nota da aggiungere a `decisioni-piani.md` (la scrive l'orchestratore)

> **K1 — Chiavi per gruppi (valgono sopra T2a, T2b, T4, G1).** Le chiavi `GOOGLE_SERVICE_ACCOUNT`, `GOOGLE_API_KEY`,
> `BING_WEBMASTER_API_KEY`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `CLOUDFLARE_DNS_API_TOKEN`, le loro etichette, le
> prove e la normalizzazione del service account nascono in K1 (`lib/secrets.ts`, `lib/chiavi-traffico.ts`, route chiavi).
> - **T2a**: toglie dal perimetro `secrets.ts` e le prove; importa `normalizzaServiceAccount`, `firmaJwt`, `SCOPE_GOOGLE`
>   da `lib/chiavi-traffico.ts` (in `lib/motori.ts` restano token in memoria e motori); D2-D5 usano
>   `CLOUDFLARE_DNS_API_TOKEN`, il deploy resta su `CLOUDFLARE_API_TOKEN` senza permessi nuovi; §8 passo 5 = creare un
>   token nuovo (Zone: Read + DNS: Edit, tutte le zone dell'account ConsulBuild), non modificare quello del deploy. Aggiunge
>   solo `void riprendiMotori({ forza: true })` dopo il salvataggio di una delle sue chiavi.
> - **T2b**: legge `GOOGLE_SERVICE_ACCOUNT` e `GOOGLE_API_KEY` con `getSecret`; nessuna prova sua.
> - **T4**: M2 senza `secrets.ts` né prova nella route; `lib/dataforseo.ts` legge le due chiavi con `getSecret`.
> - **G1**: nessuna chiave nuova.

## 9. Dubbi aperti con proposta

1. **Service account: tre chiamate, non una.** Il token da solo prova la chiave ma non dice quale API manca. Proposta:
   tre letture gratuite in fila come la tabella di piano-T2a, stop al primo errore.
2. **Nome del secondo token Cloudflare.** Proposta: `CLOUDFLARE_DNS_API_TOKEN` (stesso suffisso del token del deploy).
3. **Timeout mancante nelle prove esistenti** (OpenAI, Cloudflare, BFL: `fetch` nudo). Proposta: sostituirlo con `http()`
   nello stesso file, solo se Mattia lo approva (non è chiesto).
4. **K1 con T3 aperto.** Perimetri disgiunti ma `scope.json` unico. Proposta: K1 parte appena T3 svuota il perimetro;
   in alternativa Mattia aggiunge i 5 path al perimetro attuale.
5. **CrUX non provata**: la prova della `GOOGLE_API_KEY` usa solo PageSpeed. Proposta: accettare; T2b traduce
   `API_KEY_SERVICE_BLOCKED`/`SERVICE_DISABLED` alla prima lettura CrUX.
