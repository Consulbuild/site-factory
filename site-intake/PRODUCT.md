# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro 5 statico + TypeScript senza framework UI, CSS a token, pubblicato come Cloudflare
Worker con static assets su `sito.consulbuild.com` (scelta di Mattia, 2026-09-07:
progetto dedicato `site-intake/`, caricamento istantaneo come requisito).

## Users

Titolari di piccole imprese edili e affini (impresa edile, ristrutturazioni, idraulici,
elettricisti, cartongessisti, serramentisti, imbianchini), spesso oltre i 50 anni, con
bassa confidenza con telefono e internet. Arrivano da un annuncio Meta («Prima la vedi.
Poi decidi.») su Instagram o Facebook, quasi sempre da telefono nel browser interno
dell'app, a volte da tablet o computer. Sono in pausa, distratti, pigri: ogni parola in
più è un abbandono.

## Product Purpose

Raccogliere in una sola compilazione tutto ciò che serve alla pipeline Site-factory per
produrre in 48 ore il sito reale del lead (copy, palette, immagini, foto dei lavori,
logo): 21 domande in 7 sezioni, fino a 15 foto in qualità originale, il logo se esiste.
Il form è anche il filtro: chi lo completa è interessato davvero. Successo = lead che
finisce con dati corretti e foto caricate, senza che l'agenzia debba richiedere nulla.

## Positioning

Nessun concorrente italiano chiede i dati per una bozza reale in un form curato: i
piccoli usano moduli da 5 campi e raccolgono tutto dopo per email o WhatsApp, i grandi
vendono a telefono. Qui la bozza è il sito finito e il form è pensato per il titolare
55enne: una decisione per schermata, zero termini tecnici, controlli che spiegano e non
bloccano.

## Operating Context

Dopo il click sull'annuncio il lead compila il form; le risposte e i file vanno alla
pipeline (n8n → Google Drive → editor dell'agenzia) e la bozza gli viene mostrata in
chiamata o su WhatsApp. Le domande, l'ordine, i testi e i controlli sono fissati dal
documento vivo «Domande del form bozza» v4 (2026-09-07). La ricerca alla base:
`docs/ricerca-intake-lead-2026-09.md`, `docs/ricerca-storage-foto-lead-2026-09.md`.

## Capabilities and Constraints

- 21 domande, 7 sezioni, una decisione per schermata; riepilogo modificabile; consenso
  privacy obbligatorio (unico blocco); ogni altro controllo lascia sempre andare avanti.
- Foto: qualità originale, nessuna compressione sul telefono, massimo 15, JPEG/PNG/WebP,
  caricate in background da metà form; logo PNG/JPG/SVG/PDF.
- Autosalvataggio e ripresa; nessun microfono; nessuna dipendenza da servizi terzi
  visibili (font self-hosted; comuni da elenco ISTAT locale; disponibilità del nome del
  sito via DNS-over-HTTPS con esito prudente).
- Prestazioni: budget misurato (`scripts/check-budget.mjs`), primo passo nell'HTML.
- Fuori scopo qui: il workflow n8n/Drive e l'import nell'editor (schede successive).

## Brand Commitments

ConsulBuild: logo testuale «CONSUL» bianco + «BUILD» blu, navy `#0f172a` dell'hero, blu
`#2563eb`, pillole; sito di riferimento consulbuild.site. Titolare del trattamento:
ConsulBuild di Vecchiato Edoardo, Strada Cul de Ola 254 P int. 1, 36100 Vicenza, P.IVA
04594370241 (dal footer del sito). Tono: del tu, frasi corte, mai «bozza» rivolta al
lead («il tuo nuovo sito»). Video di riferimento per il motion: sipario tra i passi,
contenuti a scaglioni, selezione con spunta, attesa con onde, rivelazione circolare.

## Evidence on Hand

Esempi reali di risposte: Cavaliere Build Srls e Costruzioni Generali La Cecilia
(`site-renderer/out/*/brief.json`). Nessuna testimonianza o recensione da mostrare nel
form: non inventarne.

## Product Principles

1. Il caso peggiore governa: se un titolare di 55 anni al sole può sbagliare, il form lo
   previene o lo corregge con una frase chiara.
2. Meno sforzo, non meno domande: tocchi al posto di parole, suggerimenti al posto di
   digitazione, foto che salgono da sole.
3. Il progresso è onesto e visibile; la gioia viene da feedback immediato e da un unico
   momento di festa alla fine, non da effetti sparsi.
4. Ogni dato ha un consumatore nella pipeline; ciò che nessuno legge non si chiede.
5. Istantaneo: la pagina apre prima che l'utente pensi di uscire.

## Accessibility & Inclusion

Testo ≥16 px (domande 26-30 px), target ≥48 px, contrasto AA, focus visibile, tastiere
giuste per numero/email, `prefers-reduced-motion`, annunci dei cambi di sezione per
screen reader, nessun contenuto che si muove da solo.
