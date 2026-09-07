# site-intake — il form bozza (bozza.consulbuild.com)

Il lead che clicca l'annuncio risponde qui a 21 domande in 7 sezioni e carica foto e
logo; le risposte alimentano la pipeline Site-factory che produce il suo sito in 48 ore.
Decisioni e ricerca: `docs/ricerca-intake-lead-2026-09.md`,
`docs/ricerca-storage-foto-lead-2026-09.md`, piano `docs/piano-form-bozza.md`,
documento vivo «Domande del form bozza» (v4). Contesto prodotto per il design:
`PRODUCT.md`.

## Comandi

```bash
export PATH="$HOME/.local/bin:$PATH"   # Node in ~/.local, niente Homebrew
cd site-intake
npm run dev        # http://localhost:4321 — in dev le risposte finiscono in .dev-inbox/
npm run build      # dist/ + gate del budget di prestazioni
npm run check      # astro check (type-check)
npm run font       # riscarica il font self-hosted (src/styles/font.gen.css)
npm run comuni     # rigenera public/data/comuni/*.json da data-src/comuni.json
npm test           # Playwright (flusso, controlli, a11y, schermate)
```

## Architettura in una riga

Una pagina statica (`src/pages/index.astro`) con il primo passo già nell'HTML; il
motore (`src/lib/engine.ts`) legge la configurazione delle domande
(`src/data/domande.ts`), monta un passo alla volta (`src/lib/render.ts` +
`src/components/*`), valida (`src/lib/validators.ts`), anima (`src/lib/motion.ts`),
salva in locale e invia tramite `src/lib/transport.ts` alle route HTTP che in dev serve
`dev/inbox.mjs` e in produzione serviranno i webhook n8n.

(Sezioni «Come cambiare una domanda», «Design system», «Motion», «Trasporto»,
«Prestazioni», «Deploy», «Test» completate a fine scheda.)
