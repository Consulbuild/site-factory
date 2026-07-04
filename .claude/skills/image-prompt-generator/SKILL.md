---
name: image-prompt-generator
description: Per ogni sezione che richiede immagini, sceglie il modello FLUX.2 ([pro]/[max]), scrive un prompt ottimizzato (prosa, coerenza brand, palette hex), chiama l'API Black Forest Labs e restituisce immagine + prompt + alt text in italiano. Usare quando un agente deve generare le immagini di un sito (hero, gallery, servizi).
---

# Generatore prompt + immagini (FLUX.2)

## Ruolo
Per ogni immagine richiesta da una sezione: scegli il modello FLUX.2, scrivi il prompt, chiama l'API BFL, e restituisci l'oggetto immagine **nel formato dello schema** — `image: { src, alt }` (Gallery/BeforeAfter aggiungono `caption`), dove `src` = URL generato e `alt` = alt in **italiano**. Tieni traccia anche di `{ model, aspect_ratio, prompt }` per il checkpoint. **Tutte le immagini di un sito devono sembrare lo stesso servizio fotografico.**

## Fonte delle immagini (policy — PRIMA di scegliere il modello)
Gerarchia per sezione, distillata dai siti consegnati (hero AI + card stock/AI + **gallery SOLO foto reali di cantiere**):
1. **Gallery / BeforeAfter («I nostri lavori»)** = SOLO foto reali del cliente (dal brief/asset caricati). Sono la prova sociale del sito: **MAI generarle** — un portfolio AI è un portfolio falso. Se il cliente non le ha fornite: placeholder + `«DA CONFERMARE: caricare foto reali dei cantieri»` e segnala al checkpoint.
2. **Hero** = generata (flux-2 [max]) se il cliente non ha uno scatto forte.
3. **Card servizi / step processo / About** = foto reali del cliente se disponibili, altrimenti generate (flux-2 [pro]).
Le foto reali passano invariate (`src` dell'asset + `alt` tuo); le didascalie della gallery descrivono il lavoro specifico («Posa piastrelle», «Isolamento pareti») — mai 6 didascalie identiche.

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
Pattern (endpoint verificati sui docs BFL il 2026-07-04 — vedi
`docs/decisions/2026-07-verifiche-fase-b.md`; conferma live con `probe-bfl.mjs` alla
consegna della chiave):
```bash
# 1) submit
curl -s -X POST https://api.bfl.ai/v1/flux-2-pro \
  -H "x-key: $BFL_API_KEY" -H "Content-Type: application/json" \
  -d '{"prompt":"...","width":1920,"height":1080,"output_format":"jpeg"}'  # -> { id, polling_url }
# 2) poll SULLA polling_url restituita (mai URL hardcoded) finché status = Ready
curl -s "$POLLING_URL" -H "x-key: $BFL_API_KEY"      # -> { status, result: { sample: <url> } }
```
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
