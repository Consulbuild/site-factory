import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";

// Config della build DTCG → CSS (consumata da scripts/build-presets.mjs).
// meridian = :root (lo standard); gli altri preset = [data-preset="…"], emessi
// come DELTA (solo i token che ridefiniscono — exclude calcolato dai file).

const DIR = dirname(fileURLToPath(import.meta.url));
const PRESETS = ["meridian", "atelier", "nova", "canon", "terra", "vita"];

const ids = (file) => Object.keys(JSON.parse(readFileSync(join(DIR, file), "utf8")));
const baseIds = ids("meridian.tokens.json");
const soloBase = Object.fromEntries(
  PRESETS.filter((p) => p !== "meridian").map((p) => {
    const propri = new Set(ids(`${p}.tokens.json`));
    return [p, baseIds.filter((id) => !propri.has(id))];
  }),
);

export default defineConfig({
  tokens: ["./resolver.json"],
  outDir: "./out/",
  plugins: [
    css({
      filename: "tokens.css",
      legacyHex: true,
      // makeCSSVar() collassa i doppi trattini: "--step--1" è inottenibile
      // (colliderebbe con --step-1 perdendo un token IN SILENZIO — spike M0a).
      // Il token si chiama "step-n1" e build-presets.mjs lo rinomina in emissione.
      variableName: (token) => `--${token.id}`,
      // L'emissione shadow nativa ("0px 1px 2px 0px #hex") non è fedele alla
      // sorgente ("0 1px 2px rgb(27 26 23 / 0.05)"): ri-serializziamo come nel
      // CSS originale. Difensivo su layer singolo (oggetto) e multiplo (array).
      transform: (token) => {
        if (token.$type !== "shadow") return undefined;
        const layers = Array.isArray(token.$value) ? token.$value : [token.$value];
        const dim = (d) => (d.value === 0 ? "0" : `${d.value}${d.unit}`);
        const col = (c) =>
          `rgb(${c.components.map((v) => Math.round(v * 255)).join(" ")} / ${c.alpha})`;
        return layers
          .map((l) =>
            [
              dim(l.offsetX),
              dim(l.offsetY),
              dim(l.blur),
              ...(l.spread?.value ? [dim(l.spread)] : []),
              col(l.color),
            ].join(" "),
          )
          .join(", ");
      },
      permutations: PRESETS.map((p) =>
        p === "meridian"
          ? { input: { preset: "meridian" }, prepare: (c) => `:root {\n${c}\n}` }
          : {
              input: { preset: p },
              exclude: soloBase[p],
              prepare: (c) => `[data-preset="${p}"] {\n${c}\n}`,
            },
      ),
    }),
  ],
});
