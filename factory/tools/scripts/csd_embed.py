# CSD (Contrastive Style Descriptors): embedding di stile L2-normalizzato per immagine.
# Pesi: yuxi-liu-wired/CSD (checkpoint del repo github.com/learn2phoenix/CSD).
# Il backbone è il visual encoder di OpenAI CLIP ViT-L/14; classe dal model card HF.
# Uso: uv run python scripts/csd_embed.py <img1> [img2 ...] [--out out.npy]
import argparse
import copy
import os
import time
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent.parent
os.environ.setdefault("HF_HOME", str(TOOLS_DIR / ".cache"))

import clip  # noqa: E402  (openai clip, per il backbone ViT-L/14)
import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402
from huggingface_hub import PyTorchModelHubMixin  # noqa: E402
from PIL import Image  # noqa: E402
from transformers import CLIPProcessor  # noqa: E402

DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
CLIP_DOWNLOAD_ROOT = str(TOOLS_DIR / ".cache" / "clip")


class CSD_CLIP(nn.Module, PyTorchModelHubMixin):
    """Backbone CLIP ViT-L/14 + due teste di proiezione (style/content). Dal model card."""

    def __init__(self, name="vit_large", content_proj_head="default"):
        super().__init__()
        if name != "vit_large":
            raise ValueError("solo vit_large (csd-vit-l)")
        clipmodel, _ = clip.load("ViT-L/14", device="cpu", download_root=CLIP_DOWNLOAD_ROOT)
        self.backbone = clipmodel.visual
        self.embedding_dim = 1024
        self.last_layer_style = copy.deepcopy(self.backbone.proj)
        self.last_layer_content = copy.deepcopy(self.backbone.proj)
        self.backbone.proj = None

    @property
    def dtype(self):
        return self.backbone.conv1.weight.dtype

    def forward(self, input_data):
        feature = self.backbone(input_data)
        style_output = nn.functional.normalize(feature @ self.last_layer_style, dim=1, p=2)
        content_output = nn.functional.normalize(feature @ self.last_layer_content, dim=1, p=2)
        return feature, content_output, style_output


def load_model():
    model = CSD_CLIP.from_pretrained("yuxi-liu-wired/CSD")
    model = model.float().eval().to(DEVICE)
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
    return model, processor


def embed(model, processor, images):
    """images: lista di PIL.Image -> np.ndarray B x 768 (style embedding L2-normalizzato)."""
    inputs = processor(images=[im.convert("RGB") for im in images], return_tensors="pt")
    pixel_values = inputs["pixel_values"].to(DEVICE).to(model.dtype)
    with torch.no_grad():
        _, _, style_output = model(pixel_values)
    return style_output.cpu().numpy()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--out", help="salva gli embedding (npy, ordine = argomenti)")
    args = ap.parse_args()

    t0 = time.perf_counter()
    model, processor = load_model()
    t_load = time.perf_counter() - t0

    pil = [Image.open(p) for p in args.images]
    t1 = time.perf_counter()
    embs = embed(model, processor, pil)
    t_embed = time.perf_counter() - t1

    for path, e in zip(args.images, embs):
        print(f"{path}\tdim={e.shape[0]}\tnorm={np.linalg.norm(e):.4f}")
    if len(embs) >= 2:
        print(f"cosine({Path(args.images[0]).name}, {Path(args.images[1]).name}) = "
              f"{float(embs[0] @ embs[1]):.4f}")
        print(f"cosine({Path(args.images[0]).name}, {Path(args.images[0]).name}) = "
              f"{float(embs[0] @ embs[0]):.4f}")
    if args.out:
        np.save(args.out, embs)
    print(f"# device={DEVICE} load={t_load:.2f}s embed={t_embed:.2f}s "
          f"({t_embed / len(pil):.2f}s/img)")


if __name__ == "__main__":
    main()
