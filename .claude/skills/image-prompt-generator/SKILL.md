---
name: image-prompt-generator
description: Per ogni sezione che richiede immagini, sceglie il modello FLUX.2 ([pro]/[max]), scrive un prompt ottimizzato (prosa, coerenza brand, palette hex), chiama l'API Black Forest Labs e restituisce immagine + prompt + alt text in italiano. Usare quando un agente deve generare le immagini di un sito (hero, gallery, servizi).
---

# Generatore prompt + immagini (FLUX.2)

## Ruolo
Per ogni immagine richiesta da una sezione: scegli il modello FLUX.2, scrivi il prompt, chiama l'API BFL via lo script provider, e salvi il **file locale** in `out/<slug>/img/` con `alt` in **italiano**. Tieni traccia di `{ model, width, height, prompt, seed }` per il checkpoint (nella pipeline editor: `images-trace.json`, vedi «Formato artifact»). **Tutte le immagini di un sito devono sembrare lo stesso servizio fotografico.**

## Fonte delle immagini (policy — PRIMA di scegliere il modello)
Gerarchia per sezione (aggiornata 2026-07-05 su decisione utente):
1. **Gallery / BeforeAfter («I nostri lavori»)** = foto reali del cliente quando esistono (≥4): sono la prova sociale migliore e passano invariate. **Se il cliente non le fornisce**: si GENERANO col profilo `lavori` (iper-realistico, vedi Profili) e — vincolo di onestà non negoziabile — la sezione va incorniciata dal copy come **«gli interventi che realizziamo»** (tipologie di lavorazione), MAI come portfolio di lavori consegnati o con riferimenti a progetti/luoghi specifici. Il BeforeAfter fa eccezione: un prima/dopo generato è una prova falsa, quello resta solo-reale.
2. **Hero** = generata (flux-2 [max]) se il cliente non ha uno scatto forte.
3. **Card servizi / step processo / About** = foto reali del cliente se disponibili, altrimenti generate (flux-2 [pro]).
Le foto reali passano invariate (`src` dell'asset + `alt` tuo); le didascalie della gallery descrivono il lavoro specifico («Posa piastrelle», «Isolamento pareti») — mai 6 didascalie identiche.

## ⚠ Il soggetto viene dal CONTESTO e dal COPY, mai dal repertorio del settore
**`contesto.json` è la verità primaria** (curata e verificata da un umano): mestiere
reale, zona, target — hero e style bible si ancorano lì, non a ciò che "di solito"
fa il settore. Errore da non commettere MAI: immagini generiche "da edilizia" per
una PMI che fa altro (l'operaio che monta finestre sul sito di una ditta di
imbianchini). Il soggetto di OGNI immagine deriva dai contenuti già scritti: per le
card servizi da `items[i].title + desc` del copy (i servizi REALI, già curati — non
reinventarli), per la gallery dalle `caption` del copywriter, per l'hero da
`identita.frase` del contesto. Prima di scrivere un prompt, rileggi lo slot
corrispondente e chiediti: «questa scena mostra ESATTAMENTE questo servizio?»

## Profili per sezione (ogni sezione ha il suo "system prompt" — non generalizzare)

**HERO (sfondo full-bleed 16:9, regge headline + overlay scuro)**
- Scena AMBIENTALE larga, non un primo piano: il soggetto sta nel terzo destro,
  il terzo sinistro resta "quieto" (lì cadono titolo e CTA sotto overlay scuro).
- Evita scene già scure a sinistra, cieli bruciati, dettagli fitti uniformi.
- Niente persone in primo piano, niente sguardi in camera. Rumore visivo basso:
  3–4 masse tonali, non cantiere caotico. flux-2 [max].

**CARD SERVIZI (4:3, una per card)**
- Soggetto = IL servizio di quella card (da title+desc), fotografato come dettaglio
  di lavorazione o risultato ravvicinato: mani al lavoro (senza volto), materiale,
  gesto tecnico riconoscibile del mestiere.
- Stessa luce, stessa lente, stesso registro su TUTTE le card (style bible + stesso
  seed base variato di poco): devono sembrare lo stesso servizio fotografico. [pro].

**LAVORI / GALLERY generata (4:3 o 1:1 — solo se mancano foto reali)**
- Obiettivo: **indistinguibile da una foto vera di cantiere/risultato italiano**.
  Il tell da eliminare è la perfezione: interni QUALUNQUE ma curati, luce naturale
  vera (finestra laterale, ombre morbide), micro-imperfezioni plausibili (attrezzi
  appoggiati, telo, metro, secchio), inquadratura da smartphone di un capocantiere
  (35mm, altezza occhi, leggero disordine ai bordi) — NON still-life da rivista.
- Un soggetto DIVERSO per caption (la caption del copywriter comanda), coerente col
  mestiere reale della PMI. flux-2 [max] qui: è la sezione a più alto rischio slop.

**PROCESS STEPS (1:1/4:3, se richieste)**
- Una scena per step = l'AZIONE dello step (sopralluogo con metro, firma preventivo,
  posa, consegna chiavi), sempre di spalle/senza volti riconoscibili. [pro].

**FAVICON / icona tab browser**
- NON è un task di generazione immagini: il favicon È il mark del logo
  (`out/<slug>/logo/favicon.svg`, dal logo-designer), quadrato, leggibile a 16–32px,
  un colore. La pipeline lo copia in `/media/<slug>/favicon.svg` e lo collega via
  `brand.favicon` nel site.json (il renderer lo mette nel `<head>`). Se il mark ha
  dettagli che spariscono a 32px, chiedi al logo-designer una variante semplificata.

## Modelli (solo FLUX.2)
- **flux-2 [pro]** — default per la maggior parte delle sezioni (~$0.03/MP).
- **flux-2 [max]** — hero e scatti dove la fedeltà conta di più (~$0.07/MP).

Nessun altro modello. Output web-ottimizzato: chiedi **jpeg/webp** (`output_format`), mai PNG da megabyte (i siti live caricano PNG da 1.7–2.1 MB: la pipeline deve fare meglio).

## Procedura
1. **Style bible (una volta per sito):** definisci stile fotografico + luce + mood + palette hex (dalla palette del sito) + lente + **ambientazione italiana**. Riusa questa stringa in OGNI prompt → coerenza. Es.: «fotografia editoriale realistica, luce naturale morbida, tonalità coerenti con #1E3A8A e #F59E0B, 35mm, colori sobri, senza testo, interni e architettura residenziale italiana».
   - **Ambientazione italiana obbligatoria** per interni/edifici: appartamenti, infissi, luce e materiali italiani/mediterranei — NON suburbia o bagni americani (difetto reale delle immagini AI dei siti live: bagni USA per un'impresa pugliese).
2. Per ogni sezione: scegli **modello** + **aspect ratio**.
3. Scrivi il **prompt** con le regole FLUX.2.
4. **Chiama l'API** (submit + poll async).
5. Scrivi **alt text in italiano**.
6. **Self-check** con la checklist.

## Aspect ratio per sezione
Hero 16:9 (o 3:2) · Services item 4:3 · Gallery 4:3 o 1:1 · ProcessSteps 1:1/4:3 · About/FeatureHighlight 3:2/4:3 · BeforeAfter: le due immagini della coppia **stesso rapporto** (4:3).
**NON generare immagini per** LogoBar, Certifications, Testimonials/GoogleReviews: loghi, marchi e volti sono **asset reali del cliente**, non si inventano.

## Regole prompt FLUX.2
- **Prosa descrittiva** (un brief creativo), non lista di keyword.
- **Elemento chiave per primo** (FLUX.2 pesa molto l'inizio del prompt).
- **Struttura:** Soggetto + Azione + Stile + Contesto.
- Colori: lega gli hex del brand a **max 1 elemento pertinente** della scena (o al color grading generale), non a props casuali. NON dipingere di blu/ambra plaid, sgabelli, coni, nastri in ogni foto: crea immagini finte/art-directed. Meglio un tono generale coerente + un tocco mirato.
- Testo nell'immagine: solo se serve, tra "virgolette" e breve (meglio evitarlo negli sfondi/hero).
- **Frasi in positivo** per la scena (no «senza sedie» → «stanza spoglia»). Fanno **eccezione** le esclusioni tecniche standard «senza testo» e «senza loghi/marchi»: ammesse e consigliate.
- Coerenza: usa lo **style bible** + eventuali immagini di riferimento (multi-reference) per lo stesso look.

## Coerenza brand & onestà (non negoziabile)
- Inserisci in ogni prompt i descrittori dello style bible + gli hex della palette.
- **Non inventare loghi, marchi, insegne o testi di brand.**
- **Niente volti spacciati per clienti reali** né "prima/dopo" falsi: usa scene generiche autentiche (cantiere, operai di spalle/con casco, dettagli di posa) senza attribuirle a persone reali.
- Evita lo slop: niente iper-saturazione, collage impossibili, testo storto, mani deformi.

## Alt text (IT)
Ogni immagine ha un alt in italiano, descrittivo e utile alla SEO locale quando ha senso (es. «Ristrutturazione bagno a Roma, posa piastrelle»). Niente keyword stuffing.

## API Black Forest Labs (async: submit → poll)
**Genera SEMPRE tramite lo script provider** (submit + poll + download immediato +
arrotondamento dimensioni a multipli di 16 già gestiti — non riimplementare curl a mano):
```bash
node site-renderer/scripts/generate-image.mjs \
  --prompt "…" --width 1920 --height 1088 --model pro|max --out out/<slug>/img/<nome>.jpg [--seed n]
```
Dettagli endpoint per riferimento (verificati sui docs BFL il 2026-07-04 — vedi
`docs/decisions/2026-07-verifiche-fase-b.md`; conferma live con `probe-bfl.mjs` alla
consegna della chiave):
- Nome→endpoint: `flux-2 [pro]` → `/v1/flux-2-pro`, `flux-2 [max]` → `/v1/flux-2-max`.
  Host: `api.bfl.ai` (globale); esiste `api.eu.bfl.ai` se serve elaborazione solo-EU (GDPR).
- Env: `BFL_API_KEY` (o `FAL_KEY` se si usa il fallback fal.ai — stesso prezzo, code e retry gestiti).
- Dimensioni: `width`/`height` multipli di 16, max 4MP. Reference: `input_image` … `input_image_8`.
- **Niente raw mode su FLUX.2** (era di FLUX 1.1 ultra). `output_format`: solo `jpeg`/`png`.
- **Gli URL firmati di consegna scadono in ~10 minuti**: scaricare l'immagine SUBITO e
  servirla da storage proprio, mai riusare l'URL BFL.
- Poll con backoff (es. ogni 1.5s, timeout ~60s); `status` = Pending/Ready/Error; rate limit
  24 task concorrenti (429 oltre).
- Tier consapevole del costo: [pro] default ($0.03 primo MP + $0.015/MP extra), [max] solo
  hero/immagini chiave ($0.07 primo MP + $0.03/MP extra).

## Formato artifact (pipeline editor — `claude -p`)

Nella pipeline il prompt dell'orchestratore contiene il **manifest vincolante**:
quali file produrre (`img/hero.jpg`, `img/card-<i>.jpg`), con quale soggetto,
profilo, dimensioni e modello. Non decidere tu i nomi né aggiungere immagini:
il manifest È il contratto. **La gallery NON si genera in pipeline** (solo foto
reali del cliente, arriveranno da una scheda dedicata): la gerarchia «gallery
generata col profilo lavori» vale solo fuori dalla pipeline editor.

Scrivi ESATTAMENTE un file di traccia, `out/<slug>/images-trace.json`:

```json
{
  "styleBible": "…la stringa riusata in ogni prompt…",
  "immagini": [
    {
      "file": "img/hero.jpg",
      "sezione": "hero",            // "hero" | "card"
      "index": 0,                    // 0 per hero, 1-based per le card
      "riferimento": "…soggetto dal manifest…",
      "profilo": "hero",
      "prompt": "…prompt integrale inviato a BFL…",
      "alt": "…italiano, ≤140 caratteri…",
      "model": "max",                // "pro" | "max"
      "width": 1920, "height": 1088,
      "seed": 42
    }
  ]
}
```

`images.json` per l'assembler NON lo scrivi tu: lo deriva l'editor alla conferma
umana dal trace. La key BFL è già nell'ambiente: non cercarla, non stamparla.

## Modalità rigenerazione (solo file elencati)

Quando il prompt elenca file da rigenerare (scarti del critico con `fix_prompt`,
o selezione dell'operatore): rigenera SOLO quei file — stesso nome, stesse
dimensioni e profilo del trace, prompt corretto applicando i fix, **seed nuovo**
— e aggiorna nel trace SOLO le entry rigenerate (prompt/alt/seed). Tutte le
altre immagini e entry restano intatte. Mantieni lo style bible: l'immagine
rigenerata deve ancora appartenere allo stesso servizio fotografico.

## Checklist finale (auto-valutazione)
- [ ] **Gallery/BeforeAfter = solo foto reali del cliente** (o placeholder «DA CONFERMARE»), didascalie specifiche non ripetute
- [ ] solo FLUX.2, tier giusto ([pro] default / [max] hero), formato jpeg/webp
- [ ] prosa, elemento chiave per primo, frasi in positivo
- [ ] hex del brand su 1 elemento pertinente / color grading (non props casuali)
- [ ] ambientazione italiana/mediterranea negli interni ed esterni generati
- [ ] aspect ratio corretto per sezione
- [ ] style bible presente in ogni prompt (coerenza sito)
- [ ] alt text in italiano
- [ ] nessun logo/marchio/volto-cliente inventato, nessun prima/dopo falso
- [ ] output `image:{src,alt}` conforme a schema (Gallery/BeforeAfter con `caption`); niente immagini per loghi/certificazioni/volti
- [ ] API: submit + poll + gestione errori

## Esempio (hero, edilizia)
- **model:** flux-2 [max] · **aspect:** 16:9
- **prompt:** «Un cantiere di ristrutturazione residenziale luminoso e ordinato a fine lavori, un capomastro con casco visto di tre quarti che controlla un tablet, parquet nuovo e pareti appena tinteggiate, fotografia editoriale realistica, luce naturale morbida da grandi finestre, tonalità coerenti con #1E3A8A e accenti #F59E0B, 35mm, colori sobri, senza testo.»
- **alt_it:** «Cantiere di ristrutturazione appartamento a Roma a fine lavori, con capomastro che verifica il progetto.»
