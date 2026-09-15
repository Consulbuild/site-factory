# Piano K1 — Chiavi API per gruppi e chiavi del Traffico

Stato: **chiuso, 2026-09-15** (sezioni «Sviluppo», «Calibrazione» e «Verifica» in fondo). Sopra questo testo valgono le
decisioni «K1» di `decisioni-piani.md`.

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

## Sviluppo (fase 2, 2026-09-15)

Decisioni «K1» di `decisioni-piani.md` (punti 1-6) applicate sopra il testo. Commit `7fc53e6` (M1), `db279df` (M2).

**Costruito.**
- `lib/secrets.ts`: `CHIAVI_TRAFFICO` + tipo `ChiaveTraffico` (le 6 chiavi, in coda a `KNOWN_KEYS`, che le include con lo
  spread); etichette del §2; `KEY_GROUPS` (tre gruppi, frasi del §3); `KEY_INFO: Record<ChiaveTraffico, { dove, segnaposto,
  aiuto? }>`; `MAX_VALORE_SEGRETO = 4000` e `motivoValoreNonSalvabile(valore)` (funzione pura, conta la lunghezza **dopo**
  l'escape di `\` e `"` perché è quella che entra nel buffer), chiamata da `setSecret` prima dello spawn.
- `lib/chiavi-traffico.ts`: `normalizzaServiceAccount` (JSON incollato, base64 o valore già normalizzato → base64url del JSON
  compatto; idempotente), `firmaJwt`, `SCOPE_GOOGLE`, `TOKEN_URL`, `redigi(testo, ...segreti)` (anche la forma URL-encoded),
  `provaChiaveTraffico(name, valore, { fetch, getSecret, adesso? })` che non lancia mai. Traduzioni e chiamate sono interne
  (`erroreComune`, `ragioniGoogle`, `chiama` con `AbortSignal.timeout`).
- Route: GET `{ gruppi: [...] }` con `dove/segnaposto/aiuto` solo per le chiavi del Traffico; POST per le 6 chiavi:
  normalizzazione del service account → `motivoValoreNonSalvabile` → prova → `setSecret`; per tutte le 15 chiavi rilettura
  `getSecret(name) === valore` (500 «salvataggio nel portachiavi incompleto: riprova»).
- `components/home.tsx`: `ApiKeysPanel` per gruppi come da shape; `KeySetup` con la sola prop nuova `aiuto` e, **solo in
  modalità `compact`** (usata unicamente dal pannello), form `flex-wrap`, input `min-w-0 grow sm:max-w-sm` e `autoFocus`.
- `scripts/test-chiavi.ts`: 98 casi senza rete né Keychain.

**Scostamenti dal testo del piano (e perché).**
1. Tagli del controllore: niente link né testo Bitwarden per le 9 chiavi esistenti (quindi `dove` è una stringa, non
   `{href?, testo}`); nessuna `ENDPOINT_GRATUITI` nel modulo (lista chiusa e massimo di chiamate solo nel banco, con
   un'asserzione che il modulo non esporti liste di endpoint); il banco non verifica la firma JWT con la chiave pubblica
   (controlla header, claim e che il token venga chiesto con l'asserzione); `traduciErrore` non esportato.
2. Messaggi: le 9 chiavi esistenti tengono il prefisso «key non valida: …» della route; le 6 nuove rispondono col solo
   messaggio tradotto (un timeout o un guasto del servizio non è una chiave non valida).
3. Il controllo di formato e lunghezza prima della rete vale solo per le 6 nuove: per le esistenti l'ordine resta quello di
   prima (prova, poi `setSecret`). Nessun timeout aggiunto alle loro prove (decisione K1.5).
4. Input compatto `grow` e non `flex-1`: con `flex-basis: 0` il campo non va mai a capo e a 400 px si riduce a ~110 px;
   con `grow` (base = `width: 100%` globale) a 400 px il bottone scende sotto, da `sm` sta accanto a un campo di 24rem.
5. Aggiunte minime alla riga aperta: il bottone diventa «Annulla» (ghost, `aria-expanded`) per richiudere senza aprire
   un'altra chiave; `aria-describedby` sull'aiuto.
6. Casi in più tradotti (nessuna chiamata in più): 429 comune a tutti («troppe richieste»; per PageSpeed resta «chiave
   valida»), `API_KEY_*_BLOCKED` di Google («restrizioni per sito, IP o app»), `accessNotConfigured` come
   `SERVICE_DISABLED` (formato vecchio), `type` assente accettato (serve all'idempotenza sul valore salvato), e-mail
   `…developer.gserviceaccount.com` rifiutata (service account predefinito, non quello creato per Site-factory).
7. E2E: il log del dev server su :3311 (di un'altra sessione) esce su una pipe non leggibile e un secondo server farebbe
   girare un secondo sweep delle demo (`instrumentation.ts`); il grep del log è sostituito da: nessun `console.*` nei tre
   file toccati e controllo che ogni risposta non contenga il valore.

## Calibrazione (fase 3, 2026-09-15)

Tutte le chiamate dal vivo sono state fatte con credenziali **finte** (gratuite, rifiutate); Keychain controllato con
un'impronta (presenza per chiave + sha256 combinato dei valori, mai stampati): `ba0d34da04596464` prima e dopo, 9 chiavi
esistenti presenti, 6 nuove assenti.

1. **Tetto del Keychain (soglia 4000).** Misurato sulla chiave col nome più lungo (`CLOUDFLARE_DNS_API_TOKEN`, comando
   di 74 byte attorno al valore), con valori di sole «a» poi rimossi: valore integro fino a un comando di **4096 byte**
   (valore 4022), a 4104 byte `security -i` esce con codice 1. La soglia 4000 lascia 22 byte di margine sul caso peggiore:
   **resta 4000**. Service account reale (RSA 2048, come le chiavi JSON create da Google Cloud): valore normalizzato di
   **2527 caratteri**; una chiave RSA 4096 caricata a mano arriverebbe a 4650 e viene rifiutata col messaggio del tetto
   prima della rete.
2. **Risposte reali a credenziali finte** (tutte coerenti col banco, tempi della route):
   - PageSpeed: 400, `details[].reason = API_KEY_INVALID` (`status INVALID_ARGUMENT`), 226 ms → «Google non riconosce la
     API key…».
   - Bing: 400 `{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}`, 458 ms → «Bing non riconosce la API key…».
   - DataForSEO `user_data`: 401, `status_code 40100`, 155 ms → «DataForSEO ha rifiutato login o password…».
   - Token Google con service account inesistente e chiave generata: `invalid_grant`, 122 ms → «Google ha rifiutato la
     chiave del service account…».
   - **Cloudflare, corretto**: un token ben formato ma inesistente risponde **403** con `errors[].code 9109`,
     `message «Invalid access token»` (non 401); il piano lo avrebbe tradotto «il token non vede consulbuild.com».
     Ora `message` «Invalid access/api token» → «Cloudflare non riconosce il token…»; gli altri 403 e la lista vuota
     restano «non vede la zona». Un token di formato non valido risponde 400 (6003/6111). Casi aggiunti al banco.
3. **Timeout.** Rifiuti reali tra 120 e 460 ms: 10 s per chiamata lasciano margine anche su rete lenta; PageSpeed resta a
   60 s (una misura vera di google.com non si è potuta cronometrare senza chiave: da ricontrollare col primo salvataggio di
   Mattia, la riga d'aiuto lo avvisa).
4. **Testi.** Frasi dei gruppi e aiuti del §3 invariati; conteggio al singolare («1 di 4 configurata»). Messaggi con il
   percorso nella console del servizio (es. «Google Cloud → API e servizi → Libreria»), mai URL completi (regola del §2).
5. **UI nel browser** (:3311, 1280 e 400 px, chiaro e scuro): tre gruppi 4/5/6 con conteggio, badge «Configurata»/«Mancante»,
   «Dove si prende» solo sul Traffico; flusso Aggiungi → chiave Bing finta → «Salva e verifica» → messaggio in `text-err`
   sotto il campo, leggibile in entrambi i temi; a 400 px campo a tutta riga, bottone sotto, nessuno scroll orizzontale.
   `impeccable detect components/home.tsx` pulito. Il tasto Invio del pannello Browser non arriva alla pagina (evento
   senza `key`): verificato con un listener, non è un difetto del form (invariato). Schede Immagini e Pubblicazione:
   `KeySetup` non compatto identico nel DOM; oggi non visibili perché BFL e Cloudflare sono configurate.

**Correzioni della revisione indipendente (fase 4).**
1. DataForSEO, cambio account: `KEY_INFO.coppia` lega login e password; la riga aperta mostra il secondo campo
   facoltativo, la POST accetta `altra`, prova la coppia nuova e salva e rilegge le due chiavi. Con la sola metà nuova il
   401 dice che la coppia comprende la metà già salvata. Mai salvataggio senza prova sopra una coppia esistente.
2. «Annulla» e Aggiungi/Aggiorna disabilitati durante «Verifico…» (la POST non si interrompe lato server); `onSaved`
   chiude solo la riga ancora aperta; fetch fallita → «L'editor non ha risposto: riprova» invece di «Verifico…» infinito.
3. Nome accessibile del campo = etichetta della chiave (niente «API key …» su login, password, JSON).
4. GET e POST: 403 se Host non è `localhost`/`127.0.0.1`/`[::1]` o se Origin è di un altro host
   (`richiestaDaQuestoMac`). Limite: un `curl` dalla LAN che forgia `Host: localhost` passa; lo chiude solo il dev
   server legato a 127.0.0.1 (`next dev -H 127.0.0.1`, fuori perimetro: decisione di Mattia).
5. Salvataggio con ripristino (`salvaSegreti` in `lib/secrets.ts`, secondo giro): legge i valori di prima, scrive e
   rilegge; se una scrittura (es. consenso macOS negato sulla seconda metà) o la rilettura fallisce rimette i valori di
   prima o toglie la voce che non c'era, così login nuovo e password vecchia non restano mai insieme e gli hint del
   pannello restano veri. Se fallisce anche il ripristino il 500 nomina le chiavi rimaste diverse e dice di ricaricare.
   Vale per tutte le 15 chiavi; banco con portachiavi finto (6 casi).

**Punti aperti per Mattia / fasi 4-5.**
- DataForSEO: una metà salvata da sola non si prova (come da piano); la frase del brief «ogni chiave nuova rifiutata»
  vale solo con l'altra metà presente. Nell'E2E la password finta è stata salvata (200, riletta), il login finto rifiutato
  con 401 tradotto, poi la password di prova rimossa.
- Con le chiavi vere: controllare il tempo della prova PageSpeed e la risposta di Cloudflare a un token valido **senza**
  Zone: Read (403 o lista vuota: entrambi portano a «non vede la zona»).
- Chiusura (M3): fatta nel collaudo finale (sotto).

## Verifica (fasi 4-5, collaudo finale, 2026-09-15)

Dopo 5 problemi corretti nei giri di revisione (`6fd91fe`, `4c8b10c`). Editor su :3311 (dev), esiti reali.

| Comando (in `site-factory-editor/`) | Esito |
|---|---|
| `npx tsc --noEmit` | exit 0, nessun errore |
| `npm run build` | exit 0, tutte le route compilate (`ƒ /impostazioni`, `ƒ /traffico/[slug]`, …) |
| `node --experimental-strip-types scripts/test-chiavi.ts` | 121 passati, 0 falliti (ultimi: «DataForSEO: solo user_data», «nessuna prova supera il suo massimo di chiamate», «ogni chiave del Traffico è stata provata») |
| `scripts/test-traffico-stato.ts` | 58 passati, 0 falliti |
| `scripts/test-portafoglio.ts` | 43 passati, 0 falliti |
| `scripts/test-zone-servite.ts` | 110 passati, 0 falliti |

**E2E API** (script nello scratchpad, credenziali finte generate a ogni run, rifiutate dai servizi, nessuna spesa).
Impronta del Keychain (presenza per chiave + sha256 dei valori, mai stampati) `71b2c5a8f0c54058` prima e dopo: 9 chiavi
esistenti presenti, 6 nuove assenti (ricontrollate assenti anche dopo il giro nel browser).
- GET: tre gruppi con 4, 5, 6 chiavi; chiavi «configurate» = voci presenti nel Keychain; nessun valore. Latenza ~0,5 s.
- 403 con `Origin` di un altro sito e con `Host` della LAN forgiato su `localhost:3311`.
- POST, tutte 400 con messaggio italiano, senza il valore (né intero, né URL-encoded, né gli ultimi 8 caratteri), senza
  `apikey=`, `Authorization` o URL: `GOOGLE_API_KEY` «AIza»+35 → «Google non riconosce la API key…» (138 ms); Bing →
  «Bing non riconosce la API key…» (436 ms); DataForSEO login+password e password+login → «DataForSEO ha rifiutato login o
  password…» (142 e 53 ms); service account con chiave RSA 2048 generata, JSON incollato e suo base64 → «Google ha
  rifiutato la chiave del service account…» (`invalid_grant`, 125 e 62 ms); testo qualsiasi → «Non è il JSON di un
  service account…» (11 ms, nessuna rete); token Cloudflare DNS → «Cloudflare non riconosce il token…» (302 ms); valore di
  4001 caratteri → «valore troppo lungo per il portachiavi (4001 caratteri, massimo 4000)» prima della rete.
- Non ripetuto: salvataggio di una metà DataForSEO senza l'altra (salverebbe senza prova, come da piano): coperto dal banco
  (caso 5) e dall'E2E della fase 3.

**UI nel browser** (:3311, Impostazioni, 1280 e 400 px, chiaro e scuro; il tema scuro applicato solo sulla pagina via
`data-theme`, senza toccare la preferenza salvata, poi riportato su chiaro): tre gruppi con titolo, conteggio
(«4 di 4», «5 di 5», «0 di 6 configurate») e frase; badge «Configurata» + `…abcd` / «Mancante»; «Dove si prende» solo
sul Traffico. Bing Aggiungi → chiave finta → «Salva e verifica» → errore tradotto in `text-err` sotto il campo;
«Annulla» richiude. DataForSEO login: due campi (login, password), aiuto sotto, coppia finta → «DataForSEO ha rifiutato
login o password…» leggibile nel tema scuro. A 400 px: campi a tutta riga uno sotto l'altro, bottone sotto, conteggio del
gruppo sotto il titolo, `scrollWidth` 400 (nessuno scroll orizzontale). Schede Immagini e Pubblicazione: `KeySetup` non
compatto non visibile (BFL e Cloudflare configurate); nel codice il ramo non compatto cambia solo il nome accessibile del
campo (= titolo, correzione 3 della revisione), classi e layout invariati.

**Revisione del diff (fase 5)**: nessun difetto nuovo. Nessun `console.*` nei file toccati; ogni messaggio della prova è
composto nel modulo e passa da `redigi`; eccezioni impreviste riportate col solo nome. Limite noto (già documentato): un
client della LAN che forgia `Host: localhost` passa il controllo della route finché il dev server non è legato a 127.0.0.1.

**Perimetro**: i commit del piano (`7fc53e6`, `db279df`, `ecd1da3`, `6fd91fe`, `4c8b10c` e la chiusura) toccano solo
`lib/secrets.ts`, `lib/chiavi-traffico.ts`, `app/api/setup/keys/route.ts`, `components/home.tsx`, `scripts/test-chiavi.ts`,
`docs/DEBUG.md`, `docs/traffico/**` e `docs/handoff-fase-c.md` (tutti nel §4 o nel perimetro di `scope.json`); nessuna
modifica del piano resta fuori dai commit (`factory/assignments.json` modificato nel working tree è di un'altra sessione).
Stato di prova ripristinato: nessuna chiave scritta, nessuna fixture creata.

**Aperti per Mattia** (con le chiavi vere): tempo della prova PageSpeed; risposta di Cloudflare a un token valido senza
Zone: Read; primo salvataggio del service account (atteso ~2,5 KB normalizzato, riletto).
