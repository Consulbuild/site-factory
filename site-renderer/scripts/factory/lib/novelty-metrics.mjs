// Metriche visive del gate novelty L2: dHash percettivo e distanze CSD.
//
//  - dHash: calcolato IN BROWSER (Playwright chromium, già devDependency) —
//    l'immagine viene caricata come data URI, ridotta a 9×8 in grayscale su
//    canvas, e i 64 bit sono le differenze orizzontali adiacenti. Nessuna
//    dipendenza nativa (sharp NON è installato e non va installato).
//  - CSD (Contrastive Style Descriptors): embedding di stile via
//    factory/tools/scripts/csd_embed.py (uv). Il caricamento del modello pesa
//    ~7s, quindi UNA sola chiamata con tutte le immagini; le distanze coseno
//    (1 − a·b, embedding L2-normalizzati) si esportano in JSON con un mini
//    script python inline, che può anche salvare sotto-insiemi .npy (per Vendi).
//  - Vendi Score: factory/tools/scripts/vendi_check.py su un .npy.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { chromium } from "@playwright/test";

// lib/ → factory → scripts → site-renderer → <repo> → factory/tools
const TOOLS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "factory", "tools");

// PATH con ~/.local/bin (dove vivono node e uv su questa macchina)
const ENV = { ...process.env, PATH: `${homedir()}/.local/bin:${process.env.PATH}` };

const esegui = (bin, args, { cattura = false } = {}) =>
  execFileSync(bin, args, {
    env: ENV,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", cattura ? "pipe" : "inherit", "inherit"],
  });

// ---------- dHash ----------

/** MIME dai magic bytes: il contenuto comanda, non l'estensione. */
const mime = (buf) =>
  buf[0] === 0x89 && buf[1] === 0x50 ? "image/png" : buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg" : "application/octet-stream";

/**
 * dHash 64-bit per ogni immagine (una sola sessione browser per tutte).
 * @param {string[]} paths — percorsi assoluti (jpg/png)
 * @returns {Promise<Map<string,string>>} path → stringa di 64 bit ("0101…")
 */
export async function dHashBatch(paths) {
  const unici = [...new Set(paths)];
  const uris = unici.map((p) => {
    const buf = readFileSync(p);
    return `data:${mime(buf)};base64,${buf.toString("base64")}`;
  });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const hashes = await page.evaluate(async (dataUris) => {
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const out = [];
    for (const uri of dataUris) {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error("immagine non decodificabile"));
        img.src = uri;
      });
      ctx.drawImage(img, 0, 0, 9, 8);
      const d = ctx.getImageData(0, 0, 9, 8).data;
      const grigio = [];
      for (let i = 0; i < 72; i++) grigio.push(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      let bit = "";
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) bit += grigio[y * 9 + x] < grigio[y * 9 + x + 1] ? "1" : "0";
      out.push(bit);
    }
    return out;
  }, uris);
  await browser.close();
  return new Map(unici.map((p, i) => [p, hashes[i]]));
}

/** Distanza di Hamming tra due dHash (stringhe di 64 bit). */
export const hamming = (a, b) => {
  let n = 0;
  for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++;
  return n;
};

// ---------- CSD ----------

/**
 * Embedding CSD di tutte le immagini in UNA chiamata + matrice distanze coseno.
 * @param {string[]} paths — immagini (l'ordine definisce gli indici)
 * @param {string} outNpy — dove salvare gli embedding completi (.npy)
 * @param {Object<string,number[]>} [slices] — sotto-insiemi da salvare come
 *        <dir di outNpy>/<nome>.npy (indici riferiti a paths), es. per Vendi.
 * @returns {{ dist:(a:string,b:string)=>number }}
 */
export function csdDistanze(paths, outNpy, slices = {}) {
  esegui("uv", ["run", "--project", TOOLS, "python", join(TOOLS, "scripts", "csd_embed.py"), ...paths, "--out", outNpy]);
  const codice = [
    "import json, sys",
    "import numpy as np",
    "emb = np.load(sys.argv[1])",
    "spec = json.loads(sys.argv[2])",
    "for nome, idx in spec['slices'].items():",
    "    np.save(spec['dir'] + '/' + nome + '.npy', emb[idx])",
    "d = 1.0 - emb @ emb.T",
    "print(json.dumps(np.round(d, 6).tolist()))",
  ].join("\n");
  const out = esegui(
    "uv",
    ["run", "--project", TOOLS, "python", "-c", codice, outNpy, JSON.stringify({ slices, dir: dirname(outNpy) })],
    { cattura: true },
  );
  const matrice = JSON.parse(out.trim().split("\n").pop());
  const indice = new Map(paths.map((p, i) => [p, i]));
  return {
    dist: (a, b) => {
      const [i, j] = [indice.get(a), indice.get(b)];
      if (i == null || j == null) throw new Error(`immagine non embeddata: ${i == null ? a : b}`);
      return matrice[i][j];
    },
  };
}

/** Vendi Score di un .npy di embedding (via vendi_check.py). */
export function vendiScore(npyPath) {
  const out = esegui("uv", ["run", "--project", TOOLS, "python", join(TOOLS, "scripts", "vendi_check.py"), npyPath], {
    cattura: true,
  });
  const m = out.match(/vendi_score = ([\d.]+)/);
  if (!m) throw new Error(`vendi_check.py: output inatteso:\n${out}`);
  return Number(m[1]);
}
