# Loghi da studio grafico con immagini di riferimento — ricerca (fonti 2025-2026)

Rapporto di ricerca (agente, 2026-09-13). ~45 fonti tra documentazione ufficiale (OpenAI, Google, BFL, Ideogram, Recraft, Leonardo, Adobe), guide di designer, test comparativi e thread di community. Limiti: doc Midjourney e una pagina Adobe helpx in 403; nessun thread Reddit specifico; nessuna fonte riporta verbatim la frase «match the craft level and style, new concept».

## 1. Reference/style images, modello per modello

**GPT Image 1.5 / 2 (OpenAI).** Fino a 16 immagini di input per edit ([API reference](https://developers.openai.com/api/reference/resources/images/methods/edit), [fal](https://fal.ai/learn/tools/prompting-gpt-image-2)). Regola: etichettare ogni input «by index and description» — *«Image 1: product photo… Image 2: style reference…»*; per lo style transfer *«Use the same style from the input image and generate [nuovo soggetto]»* ([cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide), [guida](https://developers.openai.com/api/docs/guides/image-prompting)). Per i loghi: *«original, non-infringing… clean, vector-like shapes, a strong silhouette, and balanced negative space»*, `n=4` per esplorare. Forum: *«the trick is first explaining the images in the prompt. Otherwise, bizarre results»* ([thread](https://community.openai.com/t/how-are-reference-images-used-internally-do-i-need-to-mention-them-in-the-prompt/1240748)). Limiti: drift nelle edit, degrado dopo 3-5 edit ([issues 2.0](https://community.openai.com/t/collection-of-gpt-image-generator-2-0-issues-bugs-and-work-around-tips-check-first-post/1379535)); PNG trasparente assente al lancio di Image 2 ([Atlabs](https://www.atlabs.ai/blog/the-ultimate-gpt-image-2-prompting-guide-how-to-use-openai%E2%80%99s-best-image-model-2026)). Testo ~98,5 % su stringhe brevi ([CreateVision](https://createvision.ai/guides/seedream-5-vs-nano-banana-2-vs-gpt-image-2)).

**Nano Banana Pro / Gemini 3.1 Flash Image.** Tre tipi di riferimento: 3 Pro Image fino a 6 oggetti + 5 personaggi + **3 style reference**; 3.1 Flash fino a 10 oggetti + 4 personaggi + **3 style reference** ([ai.google.dev](https://ai.google.dev/gemini-api/docs/image-generation)). Ruoli espliciti: *«Use Image A for the character's pose, Image B for the art style, and Image C for the background»* ([blog Google](https://blog.google/products-and-platforms/products/gemini/prompting-tips-nano-banana-pro/)). Style-clone (Chase Jarvis): *«Create an image of the content as shown in img2 but with the same medium, color palette, mood, rendering technique, saturation level, textures, and overall style of img1»* ([fonte](https://chasejarvis.com/blog/how-to-clone-any-image-style-with-nano-banana-pro-weavy/)). Esempio ufficiale: *«Make 8 sophisticated minimalistic logos…»* ([Google dev blog](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-3-pro-image-developers/)).

**FLUX.2 pro/flex/max.** `input_image` … `input_image_8`; nel prompt «image 1», «image 2» ([docs editing](https://docs.bfl.ml/flux_2/flux2_image_editing)). Dalla skill locale `flux-image-best-practices/rules/multi-reference-editing.md`: *«Apply only the color palette from image 2 to image 1, keeping all other aspects unchanged»*, *«Image 3: style/aesthetic reference»*, *«Apply the style of image 1 to the entire new scene»*. [flex] `steps` fino a 50 «trading off typography accuracy and latency», [max] massima aderenza ([getimg](https://getimg.ai/blog/flux-2-max-review-flex-pro-comparison)). Limiti: «style blend» tra foto e illustrazione, copia letterale del riferimento, testo incoerente con più reference ([Kuhr](https://andreaskuhr.com/en/the-flux2-guide.html)). Prezzi: pro 0,03 $/MP, flex 0,05, max 0,07.

**Ideogram 3.0 / 4.0.** 3.0: `style_reference_images` fino a 3 (non cumulabile con `style_codes`), modalità Design *«ideal for clean, vector-style images such as logos»* ([docs](https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/style-reference)). Consigli: Magic Prompt off, niente keyword di stile, prompt corti, immagini «that share a similar look, mood, aesthetic, and composition». 4.0: JSON con `color_palette`, `bbox`, elementi `logo`, trasparente nativo; reference image **non documentate** per 4.0 ([Runware](https://runware.ai/docs/models/ideogram-4-0)). Testo ~90-95 %; oltre 25 parole degrada ([rangy](https://rangy.ai/blog/ideogram-vs-recraft-for-logos/)).

**Midjourney `--sref` / `--sw`.** Trasferisce palette, medium, texture, luce, non il soggetto; `--sw` 0-1000; URL pesati ([Prompt Architects](https://prompt-architects.com/blog/214-style-references-in-midjourney-sref-explained)). Per i loghi: logo proprio come `--sref` per «line weight, color vibe, minimalism level», `--style raw --ar 1:1` ([SologoAI](https://www.sologo.ai/blog/midjourney-for-logos/)). Limite: wordmark illeggibili (30-50 %), raster.

**Seedream 4.x / 5.0.** Fino a 10 reference; ruolo per immagine: *«Use Image 2 only as a style reference for its muted earth-tone palette… Do not copy the objects, people, text, or composition from Image 2»*, ma i «do not copy» da soli non bastano ([xmk](https://www.xmk.com/seedream/blog/seedream-5-0-pro-reference-images)); riferirsi ai contenuti, non agli indici ([Runware](https://runware.ai/docs/models/bytedance-seedream-5-0-pro/guides/prompting)). ByteDance: *«room to improve in finer-grained text rendering»* ([Seed blog](https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro)).

**Recraft V4 Styles.** Stile custom da 1 a 10 immagini → `style_id`; «similar references sharpen the match, diverse references widen the range»; il prompt controlla soggetto/composizione, il set «pins the rendering style, texture, palette»; id raster e vettoriali non intercambiabili ([Runware](https://runware.ai/docs/models/recraft-v4-styles/guides/styles-from-references)); Recraft dichiara «nearly 92 %» di vittorie in 159 confronti ([v4styles](https://www.recraft.ai/v4styles)). Unico con SVG nativo; stili `vector_illustration` e `icon` ([MindStudio](https://www.mindstudio.ai/blog/recraft-v4-1-brand-design-logos-svg-assets)). Basic 10 $/mese.

## 2. Che riferimenti usare

- **Loghi propri come «livello di qualità»**: pratica documentata. Recraft: «upload existing brand assets (logos, illustrations, color palettes)» ([thecreatorsai](https://thecreatorsai.com/p/consistent-ai-design-recraft)); Krea 2 e Midjourney chiedono asset di cui si hanno i diritti. I loghi consegnati ai vecchi clienti soddisfano il requisito.
- **Quante e quanto simili**: Recraft «1 forte basta; simili = match più stretto»; Krea 2 «six to twelve tightly curated references… outperform thirty» ([MindStudio Krea](https://www.mindstudio.ai/blog/krea-2-mood-boards-visual-style-ai-image-generation)); Ideogram max 3 simili; Midjourney moodboard 5-10; Seedream «the fewest references that fully define the result».
- **Evitare la copia del soggetto**: canali style-only dove esistono (`--sref`, style reference Gemini, `style_reference_images`); un ruolo per immagine; descrivere il nuovo soggetto per intero; Firefly: includere lo sfondo nel prompt ([Adobe Learn](https://www.adobe.com/learn/firefly/web/generate-image-using-reference-image)).

## 3. Workflow iterativi documentati

- **Foglio → scelta → varianti**: «4 logo options in a 2×2 grid», scelta, poi secondary/mono/icon-only ([Robo Rhythms](https://www.roborhythms.com/create-brand-kit-with-nano-banana-pro/)); «Generate 3-5 versions and compare silhouettes» ([morphed](https://morphed.app/blog/nano-banana-prompts-for-logos)); 6-10 varianti «like initial logo sketches» (MindStudio). Il pattern «isolate concept 3 and refine» esiste ma non è documentato verbatim.
- **Edit una modifica per volta**: OpenAI *«Pass the previous output as the next edit input, request one change, and repeat the details to preserve»*; Gemini *«change only the [elemento]… Keep everything else exactly the same»*; Midjourney Vary (Region).
- **Caso Andy Orsow (Nano Banana Pro)**: 2 riferimenti, 3 tentativi; funziona in due passi con vincolo *«Do not add any other structural elements to the logo»* ([note](https://lilys.ai/en/notes/nano-banana-pro-20260119/updated-nano-banana-pro-custom-logo-guide)).
- **Chiusura vettoriale**: sempre Illustrator/Affinity o Recraft vector ([dancelogo](https://dancelogo.com/blog/ai-logo-design-workflow-creative-control/)); Superside: le bozze «typically require significant refinement» ([fonte](https://www.superside.com/blog/ai-prompts-logo-design)).

## 4. Prompt «da brief» vs «da vincoli»

Evidenza mista, senza A/B sui loghi. Per il brief: Google (scene descritte), Atlabs (Thinking Mode di GPT Image 2 «reasons through composition… and constraints»), AIMLAPI («describing brand context»). Per i vincoli: fal mette il brief-fluff tra i prompt deboli, lo slot «Constraints» è dove «most mediocre prompts fail silently»; nel test Recraft vs Nano Banana Pro ha vinto Nano perché «the brief is the deliverable» ([Recraft](https://www.recraft.ai/blog/recraft-v4-pro-vs-nano-banana-pro-comparison)). Sintesi: i modelli con reasoning tollerano un brief ricco, ma la qualità arriva quando il brief è chiuso da vincoli espliciti. Prompt-tipo dancelogo: *«Logo for 'The Daily Grind,' a cozy, community-focused coffee shop. Style: rustic modern, incorporating a subtle coffee bean or steam element. Colors: warm browns, cream, and a hint of forest green»*.

## 5. Strumenti dedicati

| Strumento | Cosa fa di diverso | Output | API | Qualità riportata | Prezzo |
|---|---|---|---|---|---|
| [Logo Diffusion](https://logodiffusion.com/) | modello per loghi; sketch-to-logo, 11 stili, 2D/3D | SVG via Vectorizer | **non trovata** | «strong stylistic consistency when using reference images» ma sotto Looka/Canva nei confronti ([review](https://kripeshadwani.com/logo-diffusion-review/)) | 24/49/99 $/mese |
| Ideogram Design mode | tipografia ~95 %, Style Reference (3.0) | raster | sì (0,03-0,10 $) | «best for logo concept exploration» | 7-8 $/mese |
| Recraft V4 vector | SVG nativo, custom style | SVG | sì | «82 % production adequate» (claim) | 10 $/mese |
| Adobe Firefly | Style reference + Text to Vector «Icon»; indennizzo IP | SVG | sì | «match the general aesthetic without copying» ([Nitin](https://tutorialsbynitin.com/adobe-firefly-for-logo-design/)) | crediti |
| Kittl | raster → vettore con editor, 1.400 font | SVG (Pro) | no | «among the best» per asset singoli | 12-26 $/mese |
| Looka / Brandmark | assemblatori icone+font | SVG | no | «heavily templated» | 65 $ / 35-195 $ |
| Canva | template | SVG Pro | no | «generic-looking» | 12,99 $/mese |
| Krea 2 | mood board + slider | raster | sì | ideazione | da 9 $/mese |
| Leonardo | Style Reference Low→Max | raster | sì | non vector-first | 12-60 $/mese |

## Tabella riassuntiva

| Modello | Reference | Frase consigliata | Limite |
|---|---|---|---|
| GPT Image 1.5/2 | fino a 16, per indice+ruolo | «Image 1: style reference… Use the same style from Image 1 and generate [nuovo marchio]; change only X» | drift; trasparente assente al lancio; ~0,21 $/img high |
| Nano Banana Pro / 3.1 Flash | 3 style + oggetti + personaggi | «Use Image A for the art style… same medium, palette, rendering technique of img1, content of img2» | testo piccolo; 0,134 $/img |
| FLUX.2 | 8 (`input_image`…`_8`) | «Apply only the color palette/style from image 2… Image 3: style reference» | style blend, copia letterale |
| Ideogram 3.0 | 3 style ref o Style Code | prompt corto, Design mode | raster; testo lungo |
| Midjourney | `--sref` pesati, `--sw` | «minimal vector logo… --style raw --sref [logo proprio]» | wordmark illeggibili |
| Seedream 5.0 | fino a 10 | «Use Image 2 only as a style reference… + descrizione completa» | testo |
| Recraft V4 Styles | 1-10 → `style_id` | prompt = soggetto; stile = set | id raster≠vector |

## Le 3 tecniche con la probabilità più alta per una PMI locale

1. **Stile custom Recraft V4 Styles-vector dai loghi già consegnati** (3-5 marchi omogenei) + prompt che descrive solo il nuovo simbolo. Unico canale che accetta asset propri come stile e restituisce SVG nativo. (Nota di casa: Recraft V3 vector è stato scartato per i risultati; V4 Styles è un prodotto diverso, non ancora provato.)
2. **Concept sheet con GPT Image 2 o Nano Banana Pro con 2-3 style reference etichettate, poi edit «change only X»**: griglia 2×2/3×3 da brief chiuso da vincoli, scelta umana, edit con preserve list. Output raster → Recraft vector o Illustrator.
3. **Ideogram 3.0 Design mode con 3 style reference per il wordmark**, prompt corto, Magic Prompt off, poi vettorializzazione: la tipografia più affidabile per nomi lunghi.

Non raccomandati: Midjourney (testo), template tool (Looka/Canva), Logo Diffusion senza API.
