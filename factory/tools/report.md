# SPIKE M0c — Runtime Python UIClip / CSD / Vendi su Apple Silicon (2026-07-10)

**Domanda**: UIClip (scorer qualità UI), CSD (embedding di stile) e Vendi Score girano
in locale via uv, offline, <5s/screenshot a caldo?

**Verdetto: ADOPT.** Tutti e tre funzionano su MPS (Apple Silicon), offline
(`HF_HUB_OFFLINE=1`), con inferenza a caldo ~0.16 s/screenshot — due ordini di
grandezza sotto il budget di 5 s.

## Ambiente

- Directory: `factory/tools/` (progetto uv autonomo, resta nel repo; `.gitignore`
  esclude `.cache/` e `.venv/`).
- uv 0.11.25, Python **3.12.13** (pinnato: `.python-version` = 3.12; il sistema ha 3.14).
- `HF_HOME` → `factory/tools/.cache` (impostato dagli script via `os.environ.setdefault`).

## Dipendenze installate (`uv add`)

```
torch==2.13.0            # MPS disponibile: torch.backends.mps.is_available() == True
transformers==5.13.0
pillow==12.3.0
vendi-score==0.0.3
numpy==2.5.1
torchvision==0.28.0      # richiesto dal package clip di OpenAI
ftfy==6.3.1              # idem
clip @ git+https://github.com/openai/CLIP.git@d05afc4   # backbone per CSD
```

Nessun wheel mancante per 3.12/arm64. Unico incidente di compatibilità:
**transformers 5.x** — `CLIPModel.get_image_features/get_text_features` ora ritornano
`BaseModelOutputWithPooling` invece del tensore (la proiezione sta in `.pooler_output`).
Gestito in `scripts/uiclip_score.py` con l'helper `_as_tensor()` (compatibile 4.x/5.x).

## Comandi eseguiti (sintesi)

```bash
uv init --python 3.12 --bare && uv python pin 3.12
uv add torch transformers pillow vendi-score numpy
uv add torchvision ftfy "clip @ git+https://github.com/openai/CLIP.git"
uv run python -c "import torch; ..."   # → 2.13.0 True (MPS)

# screenshot di prova (playwright CLI, Chromium già in cache condivisa)
npx --yes playwright screenshot --viewport-size=1280,2000 https://www.ssccostruzionisrls.it samples/ssc.png
npx --yes playwright screenshot --viewport-size=1280,2000 https://www.designprojectroma.it samples/designproject.png
uv run python scripts/degrade.py samples/ssc.png samples/ssc_degraded.png

# UIClip (2 run + run offline)
uv run python scripts/uiclip_score.py samples/ssc.png samples/ssc_degraded.png \
  --caption "landing page for a construction company"
HF_HUB_OFFLINE=1 uv run python scripts/uiclip_score.py ...   # identico, offline

# CSD + Vendi
uv run python scripts/csd_embed.py samples/ssc.png samples/designproject.png \
  samples/ssc_degraded.png --out samples/csd_embeddings.npy
HF_HUB_OFFLINE=1 uv run python scripts/csd_embed.py ...      # run a caldo, offline
uv run python scripts/vendi_check.py samples/csd_embeddings.npy
```

## Risultati

### UIClip (biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs)

Caption: `landing page for a construction company`. Score = P(well-designed)
(softmax well-designed vs poor design, LOGIT_SCALE=100, sliding window 224 sul lato
lungo con media degli embedding — dal model card biglab).

| immagine | score |
|---|---|
| ssc.png (sano) | **0.6786** |
| ssc_degraded.png (contrasto crushed + saturazione + blur) | **0.1470** |

- **Discrimina**: sano > degradato con margine ampio (0.68 vs 0.15). Score identici tra run (deterministico).
- Run 1 (pesi già su disco): load 3.9 s, score 0.80 s (0.40 s/img). Processo: 8.6 s.
- Run 2 (a caldo): load 3.3 s, score 0.32 s (**0.16 s/img**). Processo: 7.3 s.
- Run offline (`HF_HUB_OFFLINE=1`): load 0.54 s, score 0.34 s (0.17 s/img). Processo intero: **4.8 s**
  (offline il load è ~6× più veloce: niente check di revisione contro l'hub → per M6 impostare sempre `HF_HUB_OFFLINE=1` dopo il primo download).
- Nota: il primissimo run scarica ~577 MB di pesi (una tantum).

### CSD (yuxi-liu-wired/CSD, checkpoint csd-vit-l di learn2phoenix/CSD)

Caricamento: classe `CSD_CLIP` dal model card (backbone = visual encoder di OpenAI
CLIP ViT-L/14 via package `clip`, pesi finetuned da HF via `PyTorchModelHubMixin`).
Niente `trust_remote_code`; il forward ritorna lo style embedding già L2-normalizzato.
Preprocessing: `CLIPProcessor` di `openai/clip-vit-large-patch14` (center crop 224 —
per screenshot lunghi guarda di fatto la parte alta della pagina; per M6 valutare
sliding window come UIClip se serve stile dell'intera pagina).

- **Dimensione embedding: 768**, norma L2 = 1.0000.
- cosine(ssc, designproject) = **0.8047** < 1; cosine(ssc, ssc) = 1.0000.
- Semantica corretta: cosine(ssc, ssc_degradato) = 0.9541 (stesso layout, stile quasi uguale)
  > cosine tra siti diversi (0.80/0.76) — CSD misura lo stile, non la qualità.
- Run a caldo offline: load 6.6 s, embed 0.47 s per 3 immagini (**0.16 s/img**). Processo intero: 11.6 s.
- Costo una tantum: download ViT-L/14 jit di OpenAI (890 MB, in `.cache/clip`) + pesi CSD (582 MB).

### Vendi Score

`vendi.score_dual(embs, normalize=False)` su embedding già L2-normalizzati
(kernel cosine = X·Xᵀ) per [ssc, designproject, ssc_degradato]:

- **vendi_score = 1.4610** con n=3 → sanity `1 < VS ≤ 3` **OK** (istantaneo, CPU).

## Dimensioni download

- `.cache/` totale: **2.0 GB** — biglab UIClip 577 MB, CSD 582 MB, OpenAI ViT-L/14 jit 897 MB, processor ~7 MB.
- `.venv/`: **859 MB** (torch è il grosso).
- Totale scaricato: **~2.9 GB**.

## Criteri del piano

| criterio | esito |
|---|---|
| UIClip <5 s/screenshot a caldo | SÌ — 0.16 s/img inferenza; anche l'intero processo offline (load+score) sta in 4.8 s |
| UIClip offline | SÌ (`HF_HUB_OFFLINE=1`, verificato) |
| UIClip discrimina sano/degradato | SÌ (0.68 vs 0.15) |
| CSD funziona (non bloccante) | SÌ — dim 768, cosine sensato, 0.16 s/img a caldo |
| Vendi sanity | SÌ (1.461 ∈ (1, 3]) |

**adopt = true.**

## Note operative per M6

1. **Processo long-running, non uno script per screenshot**: il costo dominante è il
   load dei modelli (UIClip 0.5–3 s, CSD 6.6 s). Caricare una volta e valutare N
   screenshot (0.16 s ciascuno); `UIClipScorer` e `load_model()`/`embed()` sono già
   separati dal `main()` per essere importati.
2. **`HF_HUB_OFFLINE=1` sempre** dopo il primo download: elimina i check di rete e
   rende i load ~6× più veloci; è anche la prova che gira offline.
3. transformers 5.x: usare `_as_tensor()` (`.pooler_output`) — non copiare lo snippet
   del model card as-is.
4. UIClip usa il processor di `openai/clip-vit-base-patch32` ma i pesi biglab; il
   prefisso caption è esattamente `"ui screenshot. well-designed. "` (e
   `"poor design. "` per il polo negativo). Attenzione a NON usare i modelli
   `Jl-wei/uiclip-*` (altro modello, academic-only).
5. CSD: il package `clip` di OpenAI scarica il jit ViT-L/14 a ogni nuova macchina —
   `download_root` è già puntato a `.cache/clip` per tenerlo nel progetto.
6. Screenshot 1280×2000 → UIClip fa ~9 finestre 224², CSD un center-crop: per lo
   score qualità va bene così (finestre = tutta la pagina); per lo stile basta
   di norma l'above-the-fold, ma è un knob da ricordare.
