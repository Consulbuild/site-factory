# Integrare GPT Image (OpenAI) nella pipeline dei loghi — nota di ricerca (2026-09-13)

Contesto: i tre loghi generati da Mattia in ChatGPT (piano gratuito) con i prompt v9b sono il
livello di creatività e professionalità cercato. Qui: quale modello era, cosa offre l'API,
quanto costa, come si integra. Nessuna modifica al codice in questa fase.

## Quale modello ha prodotto quelle immagini

ChatGPT Images 2.5 è uscito l'8-9 settembre 2026 ed è in rollout **su tutti i piani, gratuito
incluso**: «Free, Go, Plus, and Pro run the same model; paid plans buy more generations»
([MLQ](https://mlq.ai/news/openai-rolls-out-chatgpt-images-25-across-all-chatgpt-tiers/),
[OpenAI](https://openai.com/index/introducing-chatgpt-images-2-5/),
[Apidog](https://apidog.com/blog/chatgpt-images-2-5-for-free/)). Prima del rollout il piano
gratuito usava GPT Image 1.5 ([CometAPI](https://www.cometapi.com/how-many-images-can-you-create-with-chatgpt-free-in-2026/)).
Quindi i loghi del 13/9 sono quasi certamente **GPT Image 2.5** (se il rollout era già
arrivato sull'account) oppure 1.5. In API la famiglia 2.5 si chiama
`gpt-image-2.5-flare` (veloce) e `gpt-image-2.5-sunburst` (edit più precisi).

## L'API oggi ([guida ufficiale](https://developers.openai.com/api/docs/guides/image-generation))

- Modelli correnti: `gpt-image-2.5-sunburst` e `gpt-image-2.5-flare`; «Choose Sunburst for
  workflows where editing precision matters most, and Flare for fast, high-quality everyday
  image generation». I modelli precedenti (`gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`,
  `gpt-image-1-mini`) restano nel listino prezzi, quindi ancora chiamabili.
- Endpoint: `POST /v1/images/generations` (model, prompt, size, quality, background,
  output_format, n, moderation) e `POST /v1/images/edits` (image + mask + prompt) per le
  modifiche iterative. Solo Image API: la famiglia 2.5 **non** è nella Responses API.
- `size`: 1024x1024, 1536x1024, 1024x1536 o custom (multipli di 16, ratio tra 1:3 e 3:1,
  lato max 3840 px). `quality`: low, medium, high, xhigh, max, auto. `background:
  "transparent"` con png/webp → **PNG trasparente nativo**, quello che serve per header e
  favicon. Output `b64_json`.
- Testo: «Although significantly improved, the model can still struggle with precise text
  placement and clarity» — coerente con i risultati: nomi esatti, ma un refuso su cinque.

## Costi ([listino](https://developers.openai.com/api/docs/pricing))

Token: testo in $5/M, immagine in $8/M, immagine out $30/M (2.5, 2 e 1.5 hanno le stesse
tariffe d'uscita salvo 1.5 a $32/M; gpt-image-1 $40/M; gpt-image-1-mini $8/M).

Costo per immagine 1024×1024 misurato da terzi
([CellCog](https://cellcog.ai/blog/gpt-image-2-5-release-date/), flare e sunburst identici):

| quality | $/immagine |
|---|---|
| low | 0,006 |
| medium | 0,013 |
| high | 0,053 |
| xhigh | 0,094 |
| max | 0,211 |

Per confronto: FLUX.2 pro ≈ 0,03 a immagine; Recraft ≈ 0,08. Un giro da 6 varianti a
`high` costa ≈ 0,32 $; a `medium` ≈ 0,08 $. Nota OpenAI: il calcolatore di GPT Image 2 non
stima il consumo di 2.5, quindi la cifra vera si legge dai token restituiti nella risposta
(`usage`), da loggare nel trace.

## Prerequisiti dell'account

- **Verifica dell'organizzazione** (documento d'identità via Persona) obbligatoria per tutti i
  modelli gpt-image, anche per account Tier 5 ([help OpenAI](https://help.openai.com/en/articles/10910291-api-organization-verification),
  [community](https://community.openai.com/t/unable-to-access-gpt-image-1-model-despite-verified-organization/1361163)).
  Errore tipico senza verifica: «Your organization must be verified to use the model». Dopo la
  verifica l'accesso arriva entro ~15 minuti. È un passo che fa Mattia, non la pipeline.
- Chiave API a pagamento (prepagata): va nel Keychain come `OPENAI_API_KEY` (servizio
  `site-factory`), stesso pattern di BFL e Recraft. La regola di casa «niente API Anthropic a
  pagamento» riguarda Claude; per le immagini si paga già BFL.
- Rate limit: TPM e IPM per tier (Tier 1 = 100k TPM), ampi per il nostro volume.

## Come si integra (piano, senza codice)

Il seam esiste già: `logo-lab/genera.mjs` ha l'adapter `openai` (endpoint generations,
`b64_json`) scritto per `gpt-image-1`. Per la pipeline servono:

1. **Modello e parametri**: `gpt-image-2.5-flare`, `quality: "high"` (sotto, il testo perde
   nitidezza; `max` costa 4×), `size: "1536x1024"` per il lockup orizzontale o 1024×1024 per
   il simbolo, `background: "transparent"`, `output_format: "png"`, `n` = 3-6 varianti.
2. **Prompt**: il template v9b, con nome/mestiere/luogo da `contesto.json` e `intake.json`
   (ragione sociale senza forma giuridica), senza numeri né dettagli di promessa.
3. **Kit dal PNG**: il lockup arriva già con il nome (come nei tre esempi), quindi il
   renderer non compone più il testo per questi clienti: `mark.png` trasparente per
   l'header, ritaglio quadrato del solo simbolo per la favicon (o seconda chiamata con
   «only the symbol», o `edits` sullo stesso output), versione per fondo scuro via
   `edits` («same logo, white lettering») o da valutare con il critico.
4. **Gate**: OCR sul nome (Levenshtein 0, come in prompt-to-asset) per scartare i refusi;
   metriche di logo-lab (ink a 32 px) sul ritaglio del simbolo; critico v5 sceglie tra
   le varianti.
5. **Vettoriale**: non necessario per header e favicon (PNG trasparente ad alta
   risoluzione basta); se un cliente chiede l'SVG per stampa, Vectorizer.AI (€0,05-0,18).
6. **Trace**: salvare `usage` (token) e costo per immagine in `logo-trace.json`.

Cosa cambia nello step `logo` di `steps.ts`: lo script chiamato (da `generate-logo.mjs`
Recraft a un `generate-logo-openai.mjs` o a `genera.mjs`), la skill (prompt v9b invece di
«solo pittogramma, mai testo»), la validazione (PNG + OCR invece di SVG), l'`afterSuccess`
(mark.png invece di mark.svg). Da pianificare come scheda, con scope.json.
