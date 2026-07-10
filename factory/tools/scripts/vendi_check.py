# Vendi Score su embedding L2-normalizzati (kernel cosine = prodotto scalare).
# Uso: uv run python scripts/vendi_check.py <embeddings.npy>
import sys

import numpy as np
from vendi_score import vendi


def main():
    embs = np.load(sys.argv[1])  # B x D, righe L2-normalizzate
    vs = vendi.score_dual(embs, normalize=False)  # kernel = X X^T (cosine)
    n = embs.shape[0]
    print(f"vendi_score = {vs:.4f} (n={n}, dim={embs.shape[1]})")
    assert 1.0 < vs <= n, f"sanity fallita: atteso 1 < VS <= {n}"
    print("sanity OK: 1 < VS <= n")


if __name__ == "__main__":
    main()
