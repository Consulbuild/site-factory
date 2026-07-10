# Handoff Fase C — sviluppo schede editor (aggiornato 2026-07-07)

Contesto minimo per riprendere il lavoro in una chat nuova. Le regole di ingaggio e
l'architettura sono nel CLAUDE.md a root (letto automaticamente): qui solo stato e prossimi passi.

## Stato

Schede FATTE e verificate E2E: **Intake, Contesto, Palette, Copy** (+ ricerca clienti,
import Tally, temi, staleness). Roadmap dettagliata nel CLAUDE.md (§Fase C).
Dev server: `cd site-factory-editor && npm run dev` → :3000 (spesso già attivo su :3311).

**Clienti di test** (`site-renderer/out/`):
- `cavaliere-build-srls`: intake+contesto+palette verificati; **copy v2 appena rigenerato
  (skill anti-ripetizione), stato da_verificare, SENZA review** — il run del critico fu
  interrotto dal limite di sessione: alla ripresa aprire la scheda Copy e premere
  «Ricontrolla col critico», poi revisione umana.
- `costruzioni-generali-…`: contesto verificato; palette da_verificare; **copy v2 PASS
  (round 2) da_verificare** con 2 finding minori da arbitrare in scheda (eco
  subtitle/note nella CTA; target «entrambi» ma copy solo B2C).

**Ciclo qualità copy appena concluso** (feedback Mattia: output troppo ripetitivo):
skill copywriter +«Varietà e ritmo» (martello verbatim ≤2, tetto sequenze 3+ parole in
≤2 slot, enumerazioni variate, zero eco intra-sezione, SEO locale a 3 piazzamenti),
critic +C7 ripetitività (bloccante se sistemica), **norma di settore** (preventivo/
sopralluogo gratuito = consentiti di default) in enricher+copywriter+critic e nei
contesto.json dei 2 clienti. Risultato misurato: sequenze ripetute 32→8 (costruzioni).
Metro: nessuna sequenza di 3+ parole in >2 slot (script eval non in repo; banale da rifare).

## Prossime schede (ordine deciso: una per volta, SEMPRE pianificando prima)

1. **Immagini** — multi-fase come il copy (`copyRun` in `lib/steps.ts` è il modello):
   image-prompt-generator (Bash → `scripts/generate-image.mjs`, key `BFL_API_KEY` in
   `site-renderer/.env`; pannello setup key come quello Tally se assente; timeout fase
   ~20 min) → image-critic (Read multimodale) → rigenera SOLO gli scarti, max 3 round.
   Skill da aggiornare a contesto.json come fonte primaria (mestiere/zona) — le
   didascalie restano dal copy. `images.json` (slot flat per l'assembler) va DERIVATO
   deterministicamente dall'editor alla conferma (trace + caption), non scritto dal
   modello. UI: griglia hero/card/gallery, alt editabili, esito critico per immagine,
   rigenerazione selettiva (`mode:"regen"` + lista file), thumbnail via route che
   streamma da `out/<slug>/img/`. Gate: copy E palette verificati. Upstream staleness:
   contesto+copy+palette. Logo (Recraft) RINVIATO a scheda propria.
2. **Build** — 100% deterministico, niente claude: copia `img/` in
   `site-renderer/public/media/<slug>/` → `assemble-site.ts` (blueprint
   `conversione-locale-v1`, `--foto-reali 0` se niente gallery; «anteprima parziale»
   con `--partial` come bottone separato) → `validate-site.ts` →
   `SITE_JSON=<abs>/out/<slug>/site.json npx astro build --outDir <abs>/out/<slug>/dist`
   (cwd site-renderer) → anteprima: **http.Server singleton nel processo Next, porta
   4399**, serve UNA dist alla volta (niente route /api: i path assoluti della build
   la rompono). Serve un runner `io.script` accanto a `io.claude` in `lib/run-step.ts`.
3. Poi: scheda Logo (Recraft, `RECRAFT_API_KEY`), deploy Cloudflare Workers.

## Verifiche standard per ogni scheda
`npx tsc --noEmit` + `npm run build` (editor) · parity dove c'è un contratto
(`scripts/parity-copy.ts` è l'esempio) · run E2E sui clienti reali · passata
/impeccable (shape PRIMA della UI, critique/polish dopo, entrambi i temi) ·
DESIGN-BRIEF.md raccoglie gli studi UX per scheda. Nulla si committa senza chiedere.
