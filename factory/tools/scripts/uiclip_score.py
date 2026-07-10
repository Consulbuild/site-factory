# UIClip: score di qualità UI per screenshot (0..1, prob. "well-designed" vs "poor design").
# Adattato dal model card biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs.
# Uso: uv run python scripts/uiclip_score.py <img1> [img2 ...] --caption "..."
import argparse
import os
import time
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent.parent
os.environ.setdefault("HF_HOME", str(TOOLS_DIR / ".cache"))

import torch  # noqa: E402
from PIL import Image  # noqa: E402
from transformers import CLIPModel, CLIPProcessor  # noqa: E402

IMG_SIZE = 224
LOGIT_SCALE = 100  # dal codice d'esempio OpenAI CLIP
MODEL_PATH = "biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs"
PROCESSOR_PATH = "openai/clip-vit-base-patch32"
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"


def _as_tensor(features):
    # transformers >=5 ritorna BaseModelOutputWithPooling (proiezione in pooler_output),
    # transformers 4.x ritornava direttamente il tensore.
    return features if isinstance(features, torch.Tensor) else features.pooler_output


def preresize_image(image, image_size):
    aspect_ratio = image.width / image.height
    if aspect_ratio > 1:
        image = image.resize((int(aspect_ratio * image_size), image_size))
    else:
        image = image.resize((image_size, int(image_size / aspect_ratio)))
    return image


def slide_window_over_image(input_image, img_size):
    # Lato corto -> img_size, poi finestre quadrate sovrapposte lungo il lato lungo.
    input_image = preresize_image(input_image, img_size)
    width, height = input_image.size
    square_size = min(width, height)
    longer_dimension = max(width, height)
    num_steps = (longer_dimension + square_size - 1) // square_size
    if num_steps > 1:
        step_size = (longer_dimension - square_size) // (num_steps - 1)
    else:
        step_size = square_size

    cropped_images = []
    for y in range(0, height - square_size + 1, step_size if height > width else square_size):
        for x in range(0, width - square_size + 1, step_size if width > height else square_size):
            cropped_images.append(input_image.crop((x, y, x + square_size, y + square_size)))
    return cropped_images


class UIClipScorer:
    def __init__(self):
        self.model = CLIPModel.from_pretrained(MODEL_PATH).eval().to(DEVICE)
        self.processor = CLIPProcessor.from_pretrained(PROCESSOR_PATH)

    def _text_embeddings(self, descriptions):
        inputs = self.processor(text=descriptions, return_tensors="pt", padding=True)
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        with torch.no_grad():
            return _as_tensor(self.model.get_text_features(
                input_ids=inputs["input_ids"], attention_mask=inputs["attention_mask"]))

    def _image_embeddings(self, image_list):
        windowed = [slide_window_over_image(img.convert("RGB"), IMG_SIZE) for img in image_list]
        flat = [w for ws in windowed for w in ws]
        owner = torch.tensor([i for i, ws in enumerate(windowed) for _ in ws]).long()
        inputs = self.processor(images=flat, return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(DEVICE)
        with torch.no_grad():
            feats = _as_tensor(self.model.get_image_features(pixel_values=pixel_values))
        owner = owner.to(feats.device)
        return torch.stack([feats[owner == i].mean(dim=0) for i in range(len(image_list))], dim=0)

    def score(self, caption, images):
        """caption: str; images: lista di PIL.Image. Ritorna lista di prob. well-designed."""
        good = ["ui screenshot. well-designed. " + caption] * len(images)
        poor = ["ui screenshot. poor design. " + caption] * len(images)
        t_good = self._text_embeddings(good)
        t_poor = self._text_embeddings(poor)
        img = self._image_embeddings(images)
        t_good = t_good / t_good.norm(dim=-1, keepdim=True)
        t_poor = t_poor / t_poor.norm(dim=-1, keepdim=True)
        img = img / img.norm(dim=-1, keepdim=True)
        t_all = torch.stack((t_good, t_poor), dim=1)  # B x 2 x H
        scores = (LOGIT_SCALE * img.unsqueeze(1) @ t_all.permute(0, 2, 1)).squeeze(1)
        return scores.softmax(dim=-1)[:, 0].tolist()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--caption", required=True)
    args = ap.parse_args()

    t0 = time.perf_counter()
    scorer = UIClipScorer()
    t_load = time.perf_counter() - t0

    pil_images = [Image.open(p) for p in args.images]
    t1 = time.perf_counter()
    scores = scorer.score(args.caption, pil_images)
    t_score = time.perf_counter() - t1

    for path, s in zip(args.images, scores):
        print(f"{s:.6f}\t{path}")
    print(f"# device={DEVICE} load={t_load:.2f}s score={t_score:.2f}s "
          f"({t_score / len(args.images):.2f}s/img)")


if __name__ == "__main__":
    main()
