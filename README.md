# Site Factory

Strumento interno di ConsulBuild per **automatizzare la produzione di siti vetrina**
di alta qualità per i clienti della web agency, in modo standardizzato e ripetibile.

## Visione (Fase 1 — demo pre-vendita)

Generare velocemente un **sito-demo single-page già hostato** da mostrare ai lead in
fase di vendita (forte leva di trust: "ecco già il tuo sito"). Niente legale/analytics/SEO
in questa fase: solo un sito bello, credibile e online su un URL `*.pages.dev`.

**Obiettivo guida: qualità prima di tutto.** La standardizzazione serve a rendere la
qualità ripetibile per ogni cliente, non a tagliare gli angoli.

## Principio architetturale

> **L'AI non scrive mai codice: produce solo un file `site.json`** (sezioni scelte +
> ordine + copy + palette + URL immagini). Un motore Astro lo trasforma in sito statico
> mappando ogni voce al suo componente curato a mano.

Risultato: output **deterministico, ripetibile, di qualità garantita** — la qualità vive
nei componenti, non nell'imprevedibilità della generazione di codice.

## Struttura

```
Site-factory/
├── site-renderer/        ✅ Motore Astro data-driven + libreria sezioni (Fase A)
│   ├── src/lib/schema.ts     ← CONTRATTO DATI (Zod): il site.json
│   ├── src/lib/registry.ts   ← mappa type → componente
│   ├── src/sections/         ← 13 sezioni curate a mano, data-driven
│   ├── src/layouts/Base.astro← theming a token (palette inline da site.json)
│   └── src/data/site.sample.json ← sito edilizia completo (fixture + golden example)
└── site-factory-editor/  ⏳ App Next.js locale (Fase C) — da costruire
```

## Stato

- ✅ **Fase A — Libreria sezioni**: completa e validata. Build statica funzionante,
  theming a token verificato, 13 tipi di sezione con varianti, no-JS safe, accessibile.
- ⏳ **Fase B — Pipeline multi-agente** (Claude API): Intake → Strategist → Copywriter →
  Brand/Palette → Art Director (fal.ai) → Assembler → QA, con checkpoint di approvazione.
- ⏳ **Fase C — Editor Next.js locale**: review dati (Tally API), runner a checkpoint,
  anteprima, deploy su Cloudflare Pages.

## Come vederlo ora

```bash
export PATH="$HOME/.local/bin:$PATH"
cd site-renderer
npm install        # solo la prima volta
npm run dev        # → http://localhost:4321 (hot reload)
```

Per personalizzare: modifica `site-renderer/src/data/site.sample.json` (palette, copy,
sezioni) e ricarica — vedrai il sito cambiare senza toccare una riga di codice.

## Stack

- **Siti generati**: Astro 5 + Tailwind v4 (statico) → Cloudflare Pages
- **AI** (prossima fase): Claude API (`@anthropic-ai/sdk`), output validato Zod
- **Immagini**: fal.ai (Imagen 4 + Flux 2, layer swappabile)
- **Dati cliente**: form Tally via API pull
- **Editor**: Next.js locale
