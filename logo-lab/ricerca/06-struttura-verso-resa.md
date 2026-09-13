# Struttura → resa: come si ottiene un logo controllando composizione e lettere (evidenze 2025-2026)

Rapporto di ricerca (agente, 2026-09-13). ~35 fonti (doc ufficiali BFL/OpenAI/Google/Ideogram/Recraft/Adobe/Vectorizer.AI, 6 repo GitHub, 2 thread HN, 4 test indipendenti). Dove non c'è evidenza lo dice. `02-prompt-engineering-loghi.md` copriva testo→immagine; questo copre solo struttura→resa.

## 1. Sketch-to-logo / image-to-image: chi conserva la struttura e come

**FLUX.2 [pro]/[flex]/[max] (BFL, chiave già presente).** L'editing passa da `input_image` … `input_image_8` (fino a 8 riferimenti via API, 10 nel playground) — [docs.bfl.ai/flux_2/flux2_image_editing](https://docs.bfl.ai/flux_2/flux2_image_editing). **Non esiste un parametro di forza**: la guida «Pose & Layout Guidance» dice che il controllo strutturale «is achieved through reference images and prompt instructions» e che «FLUX.2 interprets structure semantically» (non pixel-perfect); prompt-tipo «Use the spatial layout from image 1 — same composition, same positioning of elements. Replace all objects with … while keeping the arrangement identical» — [docs.bfl.ai/guides/usecases_editing_controlnets](https://docs.bfl.ai/guides/usecases_editing_controlnets). Leve numeriche di [flex]: `steps` 1–50 (default 50) e `guidance` 1.5–10 (default 5, «High guidance scales improve prompt adherence at the cost of reduced realism») — [API ref flex](https://docs.bfl.ai/api-reference/models/generate-or-edit-an-image-with-flux2-%5Bflex%5D); su fal.ai `guidance_scale` = «how strictly the model follows your editing instructions vs. maintaining source image coherence» — [fal flux-2-flex/edit](https://fal.ai/models/fal-ai/flux-2-flex/edit). Testo: virgolette, «keep text short», hex, niente negative — [prompting guide](https://docs.bfl.ai/guides/prompting_guide_flux2). Difetto sul campo: ortografia incoerente tra run finché non si disattiva `prompt_upsampling` — [prompt-architects 468](https://prompt-architects.com/blog/468-text-rendering-in-flux-2-what-works-what-doesnt). Costi: [pro] edit «from $0.045»/MP, [flex] «from $0.05», [max] «from $0.07», Kontext pro $0.04 — [pricing](https://docs.bfl.ai/quick_start/pricing). **Nessuna fonte primaria con un test «SVG-scheletro → FLUX.2 → logo con lettere conservate»**: era un esperimento da fare (fatto in `logo-lab/sketch/README.md`).

**FLUX.1 Kontext.** `Replace '[original]' with '[new]'`, box colorati come annotazioni locali, ~1 MP; BFL: «previous-generation… we recommend FLUX.2» — [kontext docs](https://docs.bfl.ai/kontext/kontext_image_editing). Replicate: «Highly stylized text may underperform», «Break complex edits into smaller steps» — [replicate blog](https://replicate.com/blog/flux-kontext).

**GPT Image (OpenAI).** Template sketch-to-render: «Turn this drawing into… Preserve the exact layout, proportions, and perspective… Do not add new elements or text», logo con «Fully transparent background», «spell them out letter-by-letter» — [cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide). `input_fidelity: "high"` nato per «faces, logos» (+4096 token ≈ $0.041) — [community](https://community.openai.com/t/image-generation-high-fidelity-editing/1317649), [cookbook high fidelity](https://developers.openai.com/cookbook/examples/generate_images_with_high_input_fidelity); doc incoerente per 1.5/2.5 — [learn.microsoft.com](https://learn.microsoft.com/en-us/answers/questions/5752784/changing-input-fidelity-on-gpt-image-1-5-to-low), [guide attuale](https://developers.openai.com/api/docs/guides/image-generation) («the model can still struggle with precise text placement and clarity»). **Sketch** di ChatGPT Images 2.5 (8 set 2026): il disegno «as a compositional reference, not a literal image to trace», solo in ChatGPT — [kompozy](https://kompozy.io/ai-tools/chatgpt-sketch), [unite.ai](https://www.unite.ai/openai-releases-chatgpt-images-2-5-with-sketch-and-two-new-api-models/). Prezzi 1.5: $0.009/$0.034/$0.133 low/medium/high — [pricepertoken](https://pricepertoken.com/gpt-image-pricing).

**Gemini / Nano Banana.** Multi-turn via `previous_interaction_id`, «change only the [element]… Keep the rest… unchanged», «Preserve the original composition but render it with [style]» — [ai.google.dev](https://ai.google.dev/gemini-api/docs/image-generation), [googleblog](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/). Nano Banana Pro: «turning sketches into products», fino a 14 input — [blog.google](https://blog.google/technology/ai/nano-banana-pro/). Test su 30+ prompt di logo (NB2): nomi di 1–2 parole «~80% accurate», monogrammi «~90%», tagline 5+ parole «~30%»; senza istruzione sul fondo, sfondi texturizzati «in roughly 6 out of 10 outputs» — [morphed.app](https://morphed.app/blog/nano-banana-prompts-for-logos). Prezzi: $0.039 (2.5 Flash), $0.067 (3.1 Flash), $0.134 (3 Pro) — [pricing](https://ai.google.dev/gemini-api/docs/pricing).

**Ideogram Remix.** Peso immagine 1–100 (default 50, «Higher values keep the result closer to the original»); su 4.0 automatico — [docs remix](https://docs.ideogram.ai/using-ideogram/features-and-tools/remix); API v3 `image_weight` — [developer.ideogram.ai](https://developer.ideogram.ai/api-reference/api-reference/remix-v3); su fal `strength` 0.8 — [fal](https://fal.ai/models/fal-ai/ideogram/v3/remix/api). Prezzi 3.0: $0.03/$0.06/$0.09 — [puter](https://developer.puter.com/tutorials/ideogram-api-pricing/).

**Recraft i2i.** `strength` [0,1] (solo V3, $0.04 raster / $0.08 vettoriale); vectorize $0.01 — [endpoints](https://www.recraft.ai/docs/api-reference/endpoints). Generazione già scartata.

**Seedream 4.0.** Line-draft come riferimento, «Keep the color scheme, font, and alignment of the text unchanged» — [seed.bytedance.com](https://seed.bytedance.com/en/seedream4_0); su fal `image_urls` (max 5) e `guidance_scale` — [fal docs](https://fal.ai/docs/model-api-reference/image-generation-api/bytedance-seedream-v4.5).

## 2. ControlNet canny/depth per loghi

BFL ha **deprecato `flux-pro-1.0-canny/-depth` il 31 ottobre 2025** — [release notes](https://docs.bfl.ai/release-notes): la via BFL alla struttura è il riferimento semantico di FLUX.2. ControlNet «duro» su FLUX.1-dev: fal `flux-control-lora-canny` $0.04/MP — [fal](https://fal.ai/models/fal-ai/flux-control-lora-canny); Replicate `xlabs-ai/flux-dev-controlnet` ≈ $0.092/run — [replicate](https://replicate.com/xlabs-ai/flux-dev-controlnet). Union-Pro 2.0: canny `controlnet_conditioning_scale=0.7, control_guidance_end=0.8` — [HF Shakker-Labs](https://huggingface.co/Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro-2.0); XLabs sotto «FLUX.1 [dev] Non-Commercial License» — [HF XLabs](https://huggingface.co/XLabs-AI/flux-controlnet-canny). «Higher strength hugs the sketch», fallisce se lo sketch è «too noisy or the contrast is too low» — [runflow](https://www.runflow.io/blog/comfyui-sketch-to-image). Logo Diffusion: SDXL + ControlNet Scribble + background removal + ESRGAN — [segmind](https://blog.segmind.com/how-to-use-stable-diffusion-for-logo-design-2/); «If you sketch a bear inside a circle, you get a polished bear inside a circle», export «clean SVG», da gratis a $99/mese — [logodiffusion.com](https://logodiffusion.com/sketch-to-logo). **Nessun benchmark indipendente ControlNet-su-loghi.**

## 3. Iterazione guidata

- OpenAI: «change only X + keep everything else the same, and repeat the preserve list on each iteration» — [cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide).
- Gemini: «change only the [specific element]… Keep everything else exactly the same»; sul campo l'editing mirato «succeeds about 75-80% of the time», «after about 5-7 editing rounds, results start becoming unpredictable» — [humai.blog](https://www.humai.blog/i-spent-47-hours-testing-nano-banana-pros-text-rendering-for-infographics-heres-everything-i-learned-and-what-nobody-tells-you/).
- Contatori reali: neonwatty chiude un logo SVG in 17 iterazioni e un altro in ~6 con striscia 64/32/16 px — [neonwatty](https://neonwatty.com/posts/logo-designer-skill-claude-code/); Universymbols «15 step pipeline including 8 steps calling AI models», Nano Banana Pro + GPT Image 1 in parallelo («None of the cheaper models had useful results»), «retry on failure by an AI judge» — [HN 46006027](https://news.ycombinator.com/item?id=46006027).
- Il drift in editing conversazionale è problema di ricerca (OCCUR-Bench/ReSpec) — [arxiv 2607.07051](https://arxiv.org/abs/2607.07051).

## 4. Il testo lo rende il modello o lo compone Claude?

Chi vende loghi in serie **compone la tipografia a parte**: Looka combina «fonts, icons, colors, layouts» — [wpcrafter](https://www.wpcrafter.com/review/looka-logo-generator/); Brandmark «Gen AI + Human inspiration» per l'icona e «exclusive hand-crafted fonts & templates» per il resto — [brandmark.io](https://brandmark.io/). Il repo `prompt-to-asset` codifica la regola: «never renders text through diffusion models»; 1–3 parole → Ideogram 3 Turbo/GPT-Image-1.5/Recraft V4, >3 parole → «Mark + SVG typography composite», gate «OCR Levenshtein distance on wordmarks» — [github prompt-to-asset](https://github.com/MohamedAbdallah-14/prompt-to-asset). Stessa soglia in morphed: «For any logo that requires more than 4 words of text, generate the icon… and add the text in Figma». Conclusione: per un lockup ripetibile il modello rende **solo il simbolo** (o un monogramma di 1–2 lettere con gate OCR), il nome è SVG + font.

## 5. Vettorizzazione di qualità

| Strumento | Cosa fa bene sui loghi flat | API/costo | Limiti |
|---|---|---|---|
| Vectorizer.AI | «fully parameterized circles, ellipses, rounded rectangles, and stars», «Clean Corners», simmetrie, archi + Bézier, sub-pixel — [vectorizer.ai](https://vectorizer.ai/) | `POST /api/v1/vectorize`, test gratuito, €0.18→€0.045/img — [pricing](https://vectorizer.ai/pricing) | rileva la palette da solo |
| Recraft vectorize | SVG da PNG/JPG/WEBP, 256–4096 px | $0.01 — [endpoints](https://www.recraft.ai/docs/api-reference/endpoints) | «best for greenfield vector art rather than logo conversion» — [vectorwiz](https://vectorwiz.com/guides/best-ai-vector-converters) |
| Illustrator Image Trace | standard di produzione — [atomm](https://www.atomm.com/blog/2506-best-image-vectorizer) | Firefly Services: PNG/JPEG → SVG, due preset — [developer.adobe.com](https://developer.adobe.com/firefly-services/docs/illustrator/guides/image-trace/) | «dense paths that need Simplify» — [perfectvector](https://perfectvector.com/blog/best-ai-vectorizers-2026) |
| Vector Magic | «Excellent on poor-quality sources», $295 desktop | nessuna API | input max 1 MP |
| potrace | gratuito | CLI | «two colors black and white only» — [potrace](https://potrace.sourceforge.net/potrace.1.html) |
| svg.new | **non trovato** | — | — |

Alternativa: modelli image-to-SVG (OmniSVG 4B/8B, Apache-2.0, solo locale) — [github OmniSVG](https://github.com/OmniSVG/OmniSVG). Far scrivere l'SVG a un LLM da un bitmap è «still a daunting task» — [HN 46793060](https://news.ycombinator.com/item?id=46793060).

## 6. Pipeline complete documentate

- **svg-repro-pipeline**: vision-LLM → SVG con `<text>` reale → render Chromium → diff SSIM + reviewer model, SSIM 0.81–0.89 — [github rlongdragon](https://github.com/rlongdragon/svg-repro-pipeline).
- **neonwatty/logo-designer-skill**: interview → 3–5 concept in subagent → refine con striscia favicon; nessun modello immagine.
- **op7418/logo-generator-skill**: SVG geometrici dal LLM, Nano Banana solo per i mockup.
- **prompt-to-asset**: brief → enhance → generate → **gate deterministici** (alpha, safe-zone, «ΔE2000 palette drift», WCAG, OCR Levenshtein) → vectorize (vtracer/potrace/Recraft) + SVGO → bundle — [github](https://github.com/MohamedAbdallah-14/prompt-to-asset).
- **Nutlope/logocreator**: FLUX.2 pro + Kontext per gli edit, solo PNG — [github](https://github.com/Nutlope/logocreator).

## Tabella di sintesi

| Strumento | Input struttura | Parametro di forza | Conserva le lettere? | API/costo |
|---|---|---|---|---|
| FLUX.2 [flex]/[pro] edit | `input_image` + prompt «use the exact layout from image 1» | nessuno; `guidance` 1.5–10, `steps` | semantica, non pixel-perfect; testo tra virgolette, `prompt_upsampling` off | da $0.045–0.05/MP |
| FLUX.1 Kontext | immagine + istruzione | nessuno | «Replace 'a' with 'b'» ok | $0.04 (prev-gen) |
| FLUX.1-dev ControlNet canny | edge map | `conditioning_scale` ~0.7 | le linee sì | fal $0.04/MP; licenza dev non commerciale |
| GPT Image 1/1.5/2.5 edit | immagine + prompt | `input_fidelity` high (doc incoerente) | «faces, logos» preservati; testo «struggle» | $0.009–0.133 |
| Gemini 3.x Image | immagine + «change only…» | nessuno | 1–2 parole ~80%, monogramma ~90% | $0.067–0.134 |
| Ideogram 3 Remix | immagine + prompt | `image_weight` 1–100 | forte in tipografia | $0.03–0.09 |
| Recraft i2i (V3) | immagine | `strength` 0–1 | non documentato | $0.04; vectorize $0.01 |
| Seedream 4.x edit | line draft | `guidance_scale` | via prompt | via fal |

## Il workflow con la probabilità più alta (secondo l'evidenza)

1. **Claude scrive la struttura come SVG**: geometria del simbolo, griglia, 1–2 colori, nessun testo lungo.
2. **Il generatore rende SOLO il simbolo** su fondo bianco dal PNG dell'SVG: FLUX.2 edit con `input_image`, prompt «Redraw the mark in image 1 as a polished flat logo symbol: same shapes, same proportions, same positions…; no text», `prompt_upsampling: false`, sweep di `guidance` (3/5/8) e seed. Monogramma → lettera tra virgolette e **gate OCR**.
3. **Il nome lo compone il renderer** (SVG + font del preset, come Looka/Brandmark/prompt-to-asset).
4. **Vettorizzazione**: Vectorizer.AI API o potrace se 1–2 colori piatti.
5. **Critico con budget**: metriche deterministiche + critico v5 con retry, massimo 5–7 giri.

Non trovati: un test pubblico «SVG-scheletro → FLUX.2» sui loghi (ora fatto in casa), benchmark ControlNet-su-loghi, svg.new, il range di `image_weight` nel reference v3.
