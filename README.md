# Site Factory

Strumento interno di ConsulBuild per **produrre siti vetrina di alta qualità per PMI
italiane** in modo standardizzato e ripetibile: il lead compila il form, la pipeline AI
costruisce una demo reale, Mattia la verifica una volta e la pubblica; all'abbonamento
il sito va sul dominio del cliente con modulo, statistiche e monitor già collegati.

**Principio architetturale**: l'AI non scrive mai codice, produce solo un `site.json`
(sezioni, copy, palette, immagini) che un renderer Astro trasforma in sito statico. La
qualità vive nei componenti curati a mano.

## Struttura

```
Site-factory/
├── site-renderer/         Motore Astro + libreria di sezioni + 7 preset (i siti generati)
├── site-factory-editor/   Console locale Next.js: clienti, step AI, build, deploy, dashboard
├── site-intake/           Form bozza su sito.consulbuild.com (unica sorgente dei lead)
├── factory/               Fabbrica dei preset: riferimenti, calibrazione del critico, run
├── logo-lab/              Banco di prova per la generazione dei loghi
├── infra/                 Monitor Gatus per cliente + workflow n8n versionati
├── docs/                  Guide operative e piani vivi (docs/archivio = storico)
└── .claude/               Skill e agenti della pipeline, settings e hook di Claude Code
```

## Avvio rapido

```bash
export PATH="$HOME/.local/bin:$PATH"   # Node è in ~/.local, niente Homebrew
cd site-factory-editor && npm install && npm run dev   # editor su http://localhost:3000
cd site-renderer && npm install && npm run dev          # anteprima del renderer su :4321
```

Prerequisiti dell'editor: login `claude` Max attivo (gli step AI girano via `claude -p`,
nessuna API a pagamento) e Google Drive Desktop con l'account dell'agenzia (le richieste
del form arrivano in `site-factory-clienti/_inbox/`).

## Dove leggere

- `CLAUDE.md` — regole di ingaggio, architettura, comandi, mappa del repo.
- `docs/handoff-fase-c.md` — stato dei lavori, punti aperti, prossime schede.
- `docs/DEBUG.md` — dove guardare quando una run si rompe.
- `site-renderer/DESIGN.md` — lo standard di design dei siti; `site-factory-editor/DESIGN-SYSTEM.md` — quello dell'editor.
- `docs/vps-integrazioni-setup.md` — n8n, Umami, Gatus, Brevo, Stripe.
