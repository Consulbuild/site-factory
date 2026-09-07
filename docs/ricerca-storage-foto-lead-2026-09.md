# Ricerca: dove e come ricevere le foto e i loghi dei lead — 2026-09-07

Completa `docs/ricerca-intake-lead-2026-09.md` (che ha deciso: form proprio,
brandizzato, multi-step). Qui la domanda è solo: **come il form riceve le foto dei
lavori e il logo, dove li mette, come arrivano sul Mac e come spariscono** quando
il lead non converte o il cliente disdice. Vincoli: VPS Hetzner CX33 con 80 GB
(circa 5,5 GB liberi oggi, Coolify + n8n + Umami + Gatus), costo zero o quasi,
ordine e standardizzazione, nessun lavoro manuale.

Tre ricerche parallele, limiti letti sulle pagine ufficiali e sui repository il
2026-09-07: (1) software open source installabile sul VPS, (2) servizi di storage
non ancora valutati, (3) componenti di upload lato browser. Fonti in fondo.

## 0. In breve

1. **Foto in qualità originale, nessuna compressione sul telefono, massimo 15
   foto** (deciso da Mattia il 2026-09-07 dopo il ragionamento in §2 bis). La
   qualità sul sito la decide il Mac all'import, che porta ogni foto a 1600 px sul
   lato lungo come oggi (validato sul sito di Cavaliere: nitido anche con lo zoom);
   l'originale resta in archivio su Drive. Un lead pesa 20-90 MB (15 foto da 2-6
   MB); 130 lead al mese fanno 3-12 GB, per questo la cancellazione dei lead non
   convertiti è obbligatoria (§3). Il tempo di upload si nasconde chiedendo le
   foto a metà form, con l'upload in background durante le domande successive. La
   ripresa degli upload interrotti (tus e simili) resta superflua: un file = una
   richiesta ripetibile.
2. **Destinazione raccomandata: Google Drive dell'agenzia, direttamente**, via il
   nodo Drive di n8n che già gira sul VPS. Drive è già la destinazione finale
   decisa per i dati clienti (piano backup: `out/` dentro Drive Desktop con
   symlink) e Drive Desktop è già installato sul Mac con l'account Workspace
   info@consulbuild.com. Zero container nuovi, zero canone, zero codice di pull:
   i file compaiono sul Mac da soli in una cartella `_inbox`, l'editor li importa
   spostandoli, la cancellazione del cliente le fa già sparire ovunque. Il VPS
   non conserva nulla.
3. **Nel browser: input nativo + un piccolo uploader proprio** (pochi KB, nessuna
   libreria di immagini). Niente FilePond o Uppy: pesano 50-100 KB, vanno
   ri-brandizzati, e FilePond ha un bug aperto dal 2023 che ricarica la pagina su
   iPhone con più di 10 foto, cioè esattamente il nostro caso. Caricare i byte
   originali senza decodificarli è anche la scelta più leggera per la memoria del
   browser in-app.
4. Alternative valide se cambiano i vincoli: **Backblaze B2** (10 GB gratis, unico
   con webhook nativo, EU da confermare) o **Hetzner Object Storage** (4,99 €/mese
   flat, stesso pannello del VPS) se si vuole l'upload diretto dal browser a uno
   storage separato; **tusd** sul VPS se in prova la ripresa degli upload si
   rivelasse necessaria.

Scoperte che escludono opzioni «ovvie»: **MinIO community è archiviato**
(repository non più mantenuto dall'aprile 2026, la versione free è un binario
proprietario), **FileBrowser è archiviato** dal 1° settembre 2026 con
vulnerabilità dichiarate non risolte, Pingvin Share e Palmr archiviati, RustFS
ancora in release candidate. Coolify li elenca ancora nel catalogo: non usarli.

## 1. Le soluzioni valutate, con pro e contro

Criteri: costo, pezzi di infrastruttura in più, lavoro manuale, ordine e nomi
standard, pulizia al churn, robustezza nel browser in-app, sforzo di costruzione.

### A. Google Drive dell'agenzia come inbox (via n8n) — raccomandata

Form → una richiesta multipart per file al webhook n8n → nodo «Google Drive:
upload» in `site-factory-clienti/_inbox/<lead-id>/` → Drive Desktop porta la
cartella sul Mac → l'editor importa spostando i file in `out/<slug>/`.

- Pro: nessun container, nessun canone, nessuna API da interrogare dal Mac (è
  filesystem); la destinazione è già quella decisa per i dati clienti; il registro
  n8n e l'avviso «nuovo lead» stanno nello stesso workflow; churn = la cancellazione
  di `out/<slug>` che l'editor fa già, propagata da Drive Desktop; i lead non
  convertiti si puliscono con una regola di età sulla cartella `_inbox`.
- Contro: i byte passano dal VPS (n8n) invece di andare dritti allo storage; va
  configurato `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (il default tiene i binari
  in memoria) e verificato in prova che il pruning delle esecuzioni cancelli i
  binari; serve una credenziale OAuth Google in n8n (mai un service account: ha 15
  GB propri e non eredita la quota); il webhook n8n è dietro il proxy Cloudflare,
  quindi massimo 100 MB per richiesta (irrilevante con un file per richiesta);
  l'import sul Mac richiede Drive Desktop acceso (se il Mac è spento i file
  aspettano su Drive, nessuna perdita); quota Drive del piano Workspace da
  verificare (Business Starter 30 GB per utente, Standard 2 TB): con gli originali
  un lead pesa 20-90 MB, quindi con 30 GB la pulizia di `_inbox` a 60 giorni è
  vitale, con 2 TB il problema non esiste.

### B. Il VPS come inbox (n8n scrive su disco, o tusd, o copyparty) + trasferimento al Mac

- n8n su disco: stessa cosa di A senza Drive; poi `rclone move` via SFTP dal Mac
  (launchd) o verso Drive. Pro: nessuna dipendenza da Google nel percorso di
  upload. Contro: un cron in più, il VPS diventa uno stadio intermedio da pulire,
  e comunque i file finiscono su Drive: è A con un pezzo in più.
- **tusd + Uppy** (MIT, attivi: tusd 2.10 giugno 2026, Uppy 6.0 agosto 2026): un
  container leggero in Go, upload ripristinabili veri, hook HTTP `pre-create` e
  `post-finish` verso n8n. Pro: il più «nativo» per un form custom quando serve la
  ripresa su rete mobile; gate deterministico prima che arrivi il byte. Contro:
  file su disco con nomi opachi e sidecar `.info` da rinominare, nessuna scadenza
  nativa, compose fuori catalogo Coolify, e la ripresa serve poco con file da
  0,3-0,8 MB. È il **piano B** se la prova su 4G lo richiede.
- **copyparty** (MIT, 46.500 stelle, release del 6 settembre 2026): un solo
  container con volume write-only anonimo, quote per IP, scadenza automatica
  (`lifetime`), hook a fine upload e SFTP/WebDAV integrati. Pro: tutto compreso,
  ottima UI mobile se si mandasse il lead a una sua pagina. Contro: superficie
  enorme da blindare per usarne una funzione, ripresa solo con la sua UI, RAM non
  misurata.
- Scartati: Nextcloud, Seafile, ownCloud oCIS (stack pesanti, il lead esce dal form
  brandizzato, webhook su upload anonimi da verificare), Sharry (JVM, GPL, solo
  e-mail), PsiTransfer ed Erugo (senza hook o rilasci lenti), Dufs (senza quote né
  scadenze), Gokapi (non accetta upload pubblici), NocoDB (20 MB e 10 allegati per
  cella), OpnForm e HeyForm (form builder con un loro form: in conflitto con il
  form disegnato da noi).

### C. Object storage con upload diretto dal browser (presigned PUT)

| Servizio | Costo a ~3 GB/mese, retention 30 gg | Note verificate |
|---|---|---|
| Cloudflare R2 | 0 € (10 GB gratis, egress gratis) | Già nell'account; nessun evento verso l'esterno gratuito senza Queues; presigned + CORS da mettere a punto |
| Backblaze B2 | ≈0 € (10 GB gratis, poi 6,95 $/TB) | **Unico con webhook nativo** (Event Notifications firmate), lifecycle nativa, rclone nativo; regione EU Amsterdam non confermata oggi (pagina 404); società USA |
| Hetzner Object Storage | 4,99 € + IVA flat (1 TB storage e 1 TB egress inclusi) | Stesso pannello del VPS, DE/FI, presigned + CORS documentati, scadenza oggetti dichiarata; **nessuna notifica evento** |
| Scaleway | ≈0,05 € | EU nativo, 75 GB egress gratis al mese; il vecchio free tier da 75 GB non esiste più |
| Garage (self-hosted, Coolify one-click, AGPL) | 0 € | S3 standard con lifecycle, leggero; **nessuna notifica**; serve un endpoint che firmi gli URL |
| Hetzner Storage Box BX11 | 3,20 € + IVA (1 TB) | Non è S3: niente upload diretto dal browser; SFTP/WebDAV/rclone |

- Pro comuni: il browser carica dritto sullo storage, n8n e VPS non toccano i
  byte; regole di scadenza native; prefisso per lead = pulizia banale; rclone.
- Contro comuni: un sistema in più con le sue credenziali; serve un endpoint di
  firma (Worker) e la configurazione CORS; il Mac deve fare pull via S3 (codice
  nuovo) oppure un cron `rclone move` verso Drive sul VPS; i vantaggi dell'upload
  diretto contano con file grandi, non con foto da 0,5 MB.
- Scartati: Wasabi, IDrive e2, Storj, DigitalOcean Spaces (minimi 5-7 $ al mese o
  retention minima 90 giorni), Bunny (non S3, rclone incompleto), Supabase,
  Appwrite, Firebase, Vercel Blob, Netlify Blobs, ImageKit, Sirv (free tier 0,5-5
  GB o limiti per file), Google Cloud Storage e AWS (free solo USA o a crediti in
  scadenza), Tebi (sito irraggiungibile due volte: non affidabile per dati
  clienti).

### D. Altri cloud drive con l'account dell'agenzia

Dropbox (2 GB gratis, 2 TB a 9,99 €), OneDrive (con Microsoft 365), Box (10 GB
ma 250 MB per file), Koofr (10 GB, EU), MEGA (non verificato). Tutti funzionano
come A ma aggiungono un secondo cloud a quello già scelto: nessun vantaggio.

### E. Widget SaaS di upload (Uploadcare, Filestack, Cloudinary, UploadThing, Bytescale, Transloadit)

Già valutati nel documento precedente: second brand nel form, free tier di 1-2 GB
o senza webhook, e comunque i file vanno poi spostati. Nessuno batte A.

## 2. Nel browser: come caricare

Verificato su npm, tarball misurati e sorgenti WebKit (2026-09-07).

| Approccio | Peso gzip | Giudizio |
|---|---|---|
| **Input nativo + uploader proprio (XHR con progresso, coda a 2 in parallelo, retry), nessuna compressione** | ≈3-5 KB | **Scelto.** Controllo totale su brand, animazioni, memoria e accessibilità; 250-350 righe da scrivere e testare. compressorjs (4,6 KB) resta l'opzione se un giorno si volesse il ridimensionamento adattivo su rete lenta |
| FilePond + 3 plugin | ≈53 KB + CSS | UI pronta, ma issue #921 aperta dal 2023: su iOS «la pagina si ricarica con 10+ foto»; plugin resize fermo al 2021; CSS da combattere |
| Uppy Dashboard + tus | ≈88 KB + 20 KB CSS + tusd | Ripresa vera e accessibilità curata, ma look «prodotto» difficile da fare nostro e server tus necessario; ripresa inutile con file piccoli |
| Dropzone 6 (stabile dal 5 settembre 2026) | 12 KB | Minimale, senza compressione in worker né gestione memoria |
| heic2any / heic-to / libheif-js | 340-737 KB | **Mai** caricarli su 4G; al massimo lazy-load se si rileva un HEIC |

Regole con la fonte:

1. **HEIC su iPhone**: il picker di WebKit transcodifica in JPEG di default e
   consegna l'HEIC originale solo se `accept` è vuoto o contiene `image/*` o
   `image/heic` (sorgente `WKFileUploadPanel.mm`, bug 270470). Quindi
   `accept="image/jpeg,image/png,image/webp"`, **mai `image/*`**. Su Android il
   filtro esplicito esclude gli HEIC dal picker (Chrome non li decodifica);
   rete di sicurezza: sniff dei magic bytes e messaggio «scattala o esportala in
   JPEG». Il logo accetta anche SVG e PDF.
2. **`capture`**: mai sull'input principale (aprirebbe solo la fotocamera, uno
   scatto per volta); bottone secondario «Scatta una foto» con
   `capture="environment"`.
3. **Nessuna decodifica dell'originale, upload a 2 in parallelo** (3 al massimo):
   i byte partono così come sono; l'unica elaborazione sul telefono è la miniatura
   (regola 6). Una decodifica piena da 12 MP occuperebbe circa 48 MB di RGBA: si
   evita. I default di FilePond e Dropzone sono 2 upload paralleli.
4. **Niente chunk né ripresa** (docs tus: «non impostare chunkSize se non sei
   costretto»); un file = una richiesta idempotente, anche a 15 MB (limite per
   richiesta dietro Cloudflare: 100 MB). Massimo **15 foto**, dimensione massima
   per file 25 MB con messaggio chiaro oltre.
5. **Retry** 4 tentativi a 0, 1, 3, 5 secondi con jitter, solo su errori di rete,
   timeout e 5xx, mai su 4xx; bottone «Riprova» per foto.
6. **Miniature e memoria iOS**: `createImageBitmap(file, {resizeWidth: 240})` in
   coda seriale, immagine dal blob ridotto e mai dall'originale, revoke immediato
   (budget canvas WebKit 224 MB; `revokeObjectURL` non libera davvero).
7. **«In background» su iOS significa tenere viva la pagina**: Background Fetch
   non esiste su Safari. Form multi-step in un solo documento, upload che
   proseguono mentre si compila, id dei file già caricati in `sessionStorage`,
   avviso `beforeunload` con upload attivi.
8. **Browser in-app Meta**: rilevare l'user agent e proporre «Apri in Safari/
   Chrome» prima dello step foto; le regole 3 e 6 sono la vera mitigazione del
   ricaricamento del webview sotto pressione di memoria.
9. **Progresso**: `XMLHttpRequest.upload.onprogress`, l'unico affidabile su tutti i
   browser.
10. **Foto a metà form, non in fondo**: la scelta dalla galleria dura dieci secondi
    e l'upload degli originali prosegue in background durante le domande
    successive (3-4 minuti su un form da 7). Tempi teorici per 15 foto da 4 MB:
    circa 96 s a 5 Mbps, 48 s a 10 Mbps, 24 s a 20 Mbps, 10 s a 50 Mbps. Se
    all'invio mancano ancora foto, la pagina finale mostra «stiamo salvando le
    ultime N foto, non chiudere» e il manifesto registra attese e arrivate:
    l'editor segnala le mancanti, che si chiedono in chiamata.
11. **Formati**: accettati JPEG, PNG, WebP (e HEIC/TIFF da computer, convertiti dal
    Mac); rifiutati con messaggio RAW, PDF, GIF, BMP. Orientamento verticale o
    orizzontale indifferente: il Mac applica l'orientamento EXIF all'import.
    Avviso non bloccante se il lato lungo è sotto i 1200 px («foto piccola: se hai
    l'originale nel rullino è meglio»): è il caso delle foto ricevute via WhatsApp
    o scaricate dai social, già impoverite, unico vero rischio di gallery sgranata.

## 2 bis. Perché nessuna compressione sul telefono (ragionamento del 2026-09-07)

Tre cose diverse si chiamano «compressione»: il ridimensionamento (meno pixel,
niente tagliato, si perde dettaglio solo se poi si mostra più grande), la
compressione JPEG (stessi pixel, meno byte, invisibile sopra l'80-85% di qualità)
e il ritaglio (si perdono pezzi, e lo fa solo il layout: la gallery attuale
riempie un riquadro 4:3, quindi una foto verticale mostra la parte centrale;
scelta di design da rivedere a parte). La qualità sul sito dipende dal Mac, che
porta ogni foto a 1600 px: validato su Cavaliere. Comprimere sul telefono non
migliorerebbe il sito, perderebbe l'archivio originale, e richiederebbe di
decodificare 12 MP nel browser in-app. Il tempo di upload si gestisce con la
posizione delle foto nel form e con l'upload in background, non con la
compressione.

## 3. Il ciclo di vita dei file (standard proposto)

```
Drive: site-factory-clienti/
├── _inbox/<lead-id>/            ← scritta da n8n, letta dall'editor
│   ├── lead.json                (risposte + manifesto: ordine, didascalie, hash)
│   ├── logo.<ext>
│   └── foto/01.jpg … 15.jpg     (originali, numerate = ordine scelto dal lead)
└── <slug>/  (= out/<slug> via symlink)
    ├── logo/fornito-<data>.<ext>
    ├── img/lavoro-N.jpg + lavori.json
    └── … artefatti della pipeline
```

| Momento | Cosa succede | Chi |
|---|---|---|
| Upload | Il form carica gli originali, un file per richiesta con `lead-id`, indice e tipo, in background da metà form; n8n verifica il token di sessione emesso al primo step (o Turnstile) e scrive su Drive | Form + n8n |
| Invio finale | `lead.json` chiude la cartella; n8n registra il lead e avvisa (Telegram, se deciso) | n8n |
| Sync | Drive Desktop porta `_inbox/<lead-id>` sul Mac | Drive |
| Import | «Aggiorna» nell'editor legge `_inbox/*/lead.json` dal filesystem; importare = creare `out/<slug>/`, scrivere `brief.json` e `raw-submission.json`, normalizzare le foto con `normalizeToJpg` (sips, gestisce anche l'HEIC residuo) in `img/lavoro-N.jpg`, bozzare `lavori.json`, **spostare** la cartella (niente copie) | Editor |
| Lead non convertito | Regola di età **obbligatoria**: `_inbox/<lead-id>` più vecchia di 60 giorni viene cancellata (n8n a cron o l'editor all'avvio), coerente col GDPR e necessaria per la quota Drive con gli originali | n8n / editor |
| Disdetta | Eliminazione cliente nell'editor = `rmSync(out/<slug>)` già esistente → Drive Desktop propaga → svuotare il Cestino di Drive (manuale, altrimenti 30 giorni) | Editor + Drive |
| VPS | Non conserva nulla: binari n8n su filesystem e pruning delle esecuzioni (da verificare in prova); Hetzner backup giornaliero solo per i servizi | n8n |

Spazio: con gli originali un lead pesa 20-90 MB e un cliente attivo con archivio
foto 50-120 MB (oggi Cavaliere pesa 23 MB con le sole versioni da 1600 px). Il VPS
non viene toccato. Su Drive, con la pulizia a 60 giorni, restano in media 2-4 GB
di `_inbox` più 5-10 GB per 100 clienti attivi: fuori portata solo per un piano
da 30 GB, irrilevante con 2 TB.

## 4. Confronto finale

| | A. Drive via n8n | B. tusd sul VPS | C. B2 / R2 / Hetzner OS | Widget SaaS |
|---|---|---|---|---|
| Canone | 0 | 0 | 0 / 0 / 4,99 € | 0 con limiti |
| Pezzi nuovi | 0 (workflow n8n) | 1 container + rinomina | storage + endpoint di firma + pull | widget + pull |
| Codice sul Mac | nessuno (filesystem) | rclone o pull SFTP | pull S3 | pull API |
| Ordine e nomi | decisi dal form | da ricostruire dai sidecar | decisi dal form | dal widget |
| Churn | già gestito dall'editor | cron | lifecycle + delete prefisso | delete API |
| Ripresa upload | no (retry per file, 15 file da 2-6 MB) | sì | no (multipart solo sopra 5 MB) | dipende |
| Browser in-app | uguale per tutti: dipende dal frontend (§2) | | | |
| Sforzo | basso | medio | medio | basso ma second brand |

**Scelta: A**, con il frontend di §2 e il ciclo di vita di §3. B se la prova su 4G
mostra troppi upload falliti a metà (si cambia solo il trasporto, il resto resta).
C se in futuro si vuole disaccoppiare l'upload dal VPS (B2 per il webhook, Hetzner
per la coerenza col fornitore).

## 5. Da verificare in prova prima di costruire

1. Piano Workspace di info@consulbuild.com e quota Drive disponibile (con gli
   originali è il vincolo principale: 30 GB reggono solo con la pulizia a 60
   giorni, 2 TB senza pensieri).
2. Credenziale OAuth Google in n8n (client nel Google Cloud console dell'account
   agenzia); `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` e pruning dei binari.
3. Symlink `site-renderer/out` → cartella Drive (piano backup già deciso, non
   ancora eseguito): è il prerequisito per «import = spostare».
4. Test su iPhone reale dentro Instagram e Facebook, e su un Android economico,
   con 15 foto originali su 4G: tempo, memoria, fallimenti, quante foto mancano
   all'invio.
5. Comportamento di Drive Desktop con cancellazioni massive e col Cestino.

## 6. Fonti (lette il 2026-09-07)

Open source sul VPS: github.com/minio/minio (archiviato) e min.io/legal/aistor-free-agreement ·
hacdias.com/2026/07/28/filebrowser e github.com/filebrowser/filebrowser · github.com/stonith404/pingvin-share ·
github.com/tus/tusd e tus.github.io/tusd (installation, configuration, hooks) · uppy.io/docs ·
github.com/9001/copyparty (README, docs/devnotes, bin/hooks) · garagehq.deuxfleurs.fr (S3 compatibility) ·
github.com/seaweedfs/seaweedfs/wiki/Amazon-S3-API · github.com/rustfs/rustfs · docs.nextcloud.com (file_drop,
webhook_listeners, big_file_upload, system_requirements) · help.seafile.com (sharing) · owncloud.com (file drop) ·
eikek.github.io/sharry · github.com/psi-4ward/psitransfer · github.com/ErugoOSS/Erugo · github.com/sigoden/dufs ·
github.com/Forceu/Gokapi · nocodb.com/docs (environment variables) · docs.opnform.com · docs.heyform.net ·
docs.n8n.io (environment variables endpoints, binary-data, executions, Form Trigger) · coolify.io/docs/services/overview ·
developers.cloudflare.com/support (error 413).

Servizi di storage: backblaze.com/cloud-storage/pricing e docs (lifecycle rules, event notifications) ·
hetzner.com/storage/object-storage e docs.hetzner.com/storage/object-storage (overview, supported actions, CORS) ·
hetzner.com/storage/storage-box/bx11 · scaleway.com/en/pricing/storage e docs FAQ · contabo.com (object storage) ·
ovhcloud.com (object storage) · bunny.net/pricing/storage e github.com/rclone/rclone/issues/7607 · wasabi.com/pricing ·
digitalocean.com/pricing/spaces-object-storage · idrive.com/s3-storage-e2/pricing · storj.io/pricing ·
supabase.com/pricing · firebase.google.com/pricing · vercel.com/docs/vercel-blob/usage-and-pricing · appwrite.io/pricing ·
imagekit.io/plans · sirv.com/pricing · docs.cloud.google.com/free · aws.amazon.com/free ·
github.com/n8n-io/n8n/issues/26050 (quota service account Drive) · workspace.google.com/pricing · one.google.com/about/plans ·
dropbox.com/plans e developers.dropbox.com · learn.microsoft.com/graph (upload session) · support.box.com (max file size) ·
koofr.eu.

Browser: registry npm e tarball di uppy, filepond (+ plugin), dropzone, react-dropzone, browser-image-compression,
compressorjs, pica, @squoosh/lib, @jsquash, heic2any, heic-to, libheif-js, tus-js-client ·
github.com/pqina/filepond/issues/921 · github.com/react-dropzone/react-dropzone/issues/665 ·
github.com/WebKit/WebKit (WKFileUploadPanel.mm) · bugs.webkit.org 270470, 190280, 195325 ·
zenn.dev (test accept/HEIC su iOS) · developer.apple.com/forums/thread/743049 · issues.chromium.org/issues/375118901 ·
caniuse (heif, html-media-capture) · developer.mozilla.org (capture) · github.com/mdn/browser-compat-data
(BackgroundFetchManager) · github.com/WebKit/standards-positions/issues/149 · github.com/shareup/blob-url-memory-leak-demo ·
plugwith.me/blog/what-escapes-instagram-in-app-browser-in-2026 · github.com/eligrey/FileSaver.js/issues/754 ·
developers.cloudflare.com/workers/platform/limits.
