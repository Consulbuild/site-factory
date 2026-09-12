# Piano — Dashboard clienti nell'editor (Parte 5)

Piano vivo della scheda (citato da `cliente-stato.tsx`, `clients-browser.tsx`,
`lib/integrazioni.ts`, `lib/portafoglio.ts`, `lib/secrets.ts` come sede delle decisioni).
Implementata e verificata con le chiavi reali il 2026-09-06; studio UX su mockup
criticato con impeccable e riscritto. Inventario storico dei dati disponibili:
`docs/archivio/inventario-dati-dashboard-2026-09.md`.

## Decisioni (Mattia, 2026-09-05/06)

- **Card KPI-filtro in home**: Da sviluppare · Attivi · Siti down · In ritardo. Sottoriga
  = chi (≤2 nomi) o la composizione. Card «off» («—», fondo piatto) quando la fonte non è
  ok. Reset visibile («Mostra tutti ×») e con Esc. Le vecchie card Da verificare / In
  errore / Online spariscono: la pipeline resta leggibile dalle 7 tacche.
- **Niente periodo di prova Stripe**: prima dell'abbonamento c'è una **demo** (sito
  pubblicato su workers.dev senza dominio) → «Demo inviata», conta in Da sviluppare.
- **Niente avvisi flottanti** per sito giù / pagamento in ritardo: la card rossa con il
  nome è l'avviso, più Telegram. Fonti giù o non configurate → `Banner` di pagina.
- **Riga essenziale**: abbonamento · sito (su/giù + ms) · lead 30 gg («0» in ambra) ·
  pipeline a 7 tacche (Legale inclusa). Dominio cliccabile nella sottoriga. Via la
  colonna «aggiornato» (era la chiave di ordinamento e accanto a dati live si leggeva
  come «dati vecchi»). Visite e conversione solo nell'hub.
- **Hub**: card a 4 colonne Sito / Abbonamento / Lead / Visite, 3 fatti l'una, link
  Gatus / Stripe / Umami nel titolo di colonna; solo con dominio. Stato Giù disegnato,
  chip telefono rosso «Chiama ·». Nessun grafico. Un solo «Lead e visite: X fa · Aggiorna».
  La primaria della pagina resta il prossimo passo della pipeline.
- **Impostazioni**: `STRIPE_API_KEY` (chiave ristretta) e `GATUS_PASSWORD` nel pannello
  chiavi esistente; sezione «Collegamenti Stripe» solo per i casi irrisolti, «Collega…»
  con `ConfirmDialog`, scrive `metadata.slug` sull'abbonamento (unica scrittura verso
  Stripe dall'editor).
- **Fasce**: locale istantaneo · abbonamenti Stripe e Gatus live (cache 2′) · lead,
  incassato, Umami orari, invalidazione manuale «Aggiorna». Cache in memoria su
  `globalThis` (`lib/cache.ts`), niente `cacheComponents`.
- **Collegamento Stripe ↔ cliente**: `metadata.slug` → `stripe_customer` nel registro
  n8n «Clienti» (scritto dal report al rinnovo al primo abbinamento) → e-mail del brief
  (case-insensitive). E-mail ambigua o nessun match → «da collegare».
- **Lead senza dati personali**: Data table n8n «Lead» (`slug`, `quando` date), scritta
  da `sf-form-lead` dopo l'e-mail (Piano 2). L'editor la legge; conversione = lead ÷
  visitatori Umami 30 gg. Incassato lordo (fatture pagate) e netto (balance transactions).
- **Un abbonamento = un sito** per cliente. Brevo (consegna e-mail) rinviato.
- **Home**: `app/page.tsx` non cambia; il portafoglio lo carica il client con skeleton
  sulle colonne live (stato «prima apertura» del mockup).
- **Riga cliente**: mai un `<a>` dentro il `Link` della riga (rompe il DOM, visto nel
  mockup): il nome è il `Link`, il dominio un `<a>` separato, la riga intera cliccabile
  via `router.push` con guard su link/bottoni interni.

## Stato

- Fatta e verificata con le chiavi reali (2026-09-06): nucleo puro + cache
  (`lib/cache.ts`, `portafoglio-shared.ts`, `stripe.ts`, `gatus.ts`, `portafoglio.ts`;
  banco `scripts/test-portafoglio.ts`), `GET /api/portafoglio` e
  `POST /api/portafoglio/collega`, home, hub, Impostazioni.
- Correzione emersa dai dati reali: **Da sviluppare = senza dominio** a prescindere dal
  pagamento (la sottoriga dice «N già paganti»); l'abbonamento si mostra in riga anche
  senza sito. Il netto resta vuoto finché la chiave Stripe non ha «Balance read».
- Non provato dall'editor: «Collega» su un abbonamento live (lo fa Mattia dalla UI).

## Punti aperti

- Forma di `stats.comparison` in Umami: visto sull'istanza `{pageviews, visitors, …,
  comparison:{…}}` con valori piatti (2026-09-05).
- URL di dettaglio di un endpoint in Gatus (`/#/endpoints/<key>`) da confermare in UI;
  fallback: home del monitor.
- Chiave Stripe: sandbox per l'E2E, poi live (una sola nel Keychain).
