# Oro per la taratura del logo-critic

Un item = una cartella `<id>/` con:

- `logo/mark-1.png … mark-N.png` — le varianti (PNG, sfondo trasparente se vengono da GPT Image);
- `atteso.json` — `{ "nome": "TERMOIDRAULICA ROSSI", "bg": "#fbfaf7", "label": "passa" | "boccia",
  "scelta_umana": "logo/mark-2.png", "codici": { "logo/mark-2.png": ["fatto_inventato"] }, "note": "…" }`;
- `contesto.json` (facoltativo) — i testi consentiti oltre al nome li prende da qui.

`label: "passa"` = Mattia lo userebbe sul sito → il critico DEVE dare PASS (altrimenti è
troppo severo). `label: "boccia"` = difetto oggettivo → FAIL con i `codici` attesi.
Si lancia con `node --experimental-strip-types scripts/calibrate-logo-critic.ts`.

I loghi di clienti REALI non vanno in git (vedi `.gitignore` qui accanto): restano
locali. Gli item con aziende fittizie (Rossi, Marini) sì.
