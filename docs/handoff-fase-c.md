# Handoff Fase C — sviluppo schede editor (aggiornato 2026-07-11)

## Refactoring UI v2 (2026-07-11, COMPLETO)

**Per sviluppare nuove schede: `site-factory-editor/DESIGN-SYSTEM.md`** è il manuale
operativo (token, componenti condivisi, regole, ricetta scheda) — leggerlo prima di
toccare la UI dell'editor.

L'editor ha un design nuovo (spec: `site-factory-editor/DESIGN-REFACTOR-2026-07.md`,
riferimento visivo fornito da Mattia): shell con sidebar+topbar (ricerca clienti
globale ⌘K, chiavi API in /impostazioni), primario blu royal + Inter (il teal resta
ai siti generati), card con ombre soffuse nei due temi (dark = grafite blu).
Novità operative da conoscere:
- **I run AI girano in background** (`lib/run-bus.ts`): navigare o chiudere il tab
  NON li uccide più; stop esplicito (DELETE sulla route del run o dalla status bar);
  eventi persistiti in `run.ndjson` (clienti: `out/<slug>/logs/`, fabbrica: nella
  cartella run); run interrotti da riavvio rilevati e riparati da `/api/runs/active`.
- **Status bar agenti** in basso ovunque: sfera per agente (fasi reali + tempo mono,
  mai % inventate), pannello espanso con timeline fasi e log live, card «Agenti al
  lavoro» in sidebar.
- Dashboard clienti con KPI card-filtro e **eliminazione diretta** (dialog che
  richiede la ragione sociale digitata; deciso da Mattia 2026-07-11); hub col
  prossimo passo primario; ⌘S salva nelle schede; fabbrica con run/riferimenti
  eliminabili, shot visibili nel dettaglio run, audit con tokenDiff e campi meta
  completi.

Contesto minimo per riprendere il lavoro in una chat nuova. Le regole di ingaggio e
l'architettura sono nel CLAUDE.md a root (letto automaticamente): qui solo stato e prossimi passi.

## Stato

Schede FATTE e verificate E2E: **Intake, Contesto, Palette, Copy** (+ ricerca clienti,
import Tally, temi, staleness). Roadmap dettagliata nel CLAUDE.md (§Fase C).
**Scheda Legale fatta (2026-08-03)**: step `legale` (foro dal circondario con
evidenza → privacy/termini via skill + MCP → gate deterministici → montaggio →
catena a 3 lenti → report), scheda con editor a blocchi e conferma condizionata,
update-mode a 3 aree. Piano vivo e stato: `docs/piano-scheda-legale.md`.
Avviso globale login CLI Claude (03/08): l'editor sorveglia `claude auth status`.
Dev server: `cd site-factory-editor && npm run dev` → :3000 (spesso già attivo su :3311).

**Integrazioni VPS al deploy — codice fatto (2026-09-05, piano
`~/.claude/plans/ora-voglio-che-rifletti-zesty-swan.md`)**: con dominio, la build
registra il sito su Umami e cuoce nell'HTML script statistiche + action del modulo
(env `UMAMI_HOST`/`UMAMI_WEBSITE_ID`/`FORM_ACTION`, come `SITE_URL`); il deploy
registra il cliente in n8n (webhook `registra-cliente` → Data table `clienti`) e
committa il monitor Gatus in `infra/gatus/config/clienti/<slug>.yaml` (Coolify
ricostruisce da GitHub). Stato in `steps.build.{umamiWebsiteId,integrazioni,infra}`,
interlock «ribuilda» esteso, `lib/integrazioni.ts`. Fatti di stack nel legale (area
`stack`). **Lato VPS tutto configurato e verificato E2E il 2026-09-05** (guida
`docs/vps-integrazioni-setup.md`; workflow n8n versionati in `infra/n8n/`, sync con
`scripts/n8n-import.ts export|import`): cliente fittizio `zz-test-integrazione`
build→deploy→delete verde, alert Telegram di Gatus ricevuto, e-mail lead via Brevo
partita. Decisione: NIENTE notifiche lead all'agenzia (Telegram solo per servizi giù
ed errori workflow). Legale di Cavaliere riallineato (update-mode, catena PASS) —
**resta da fare**: Conferma umana nella scheda Legale, poi Build → Conferma →
Pubblica di Cavaliere (primo sito con modulo reale + Umami) e lead di prova «TEST».
Mattia: eliminare Uptime Kuma in Coolify. Piano 2 (report al rinnovo via Brevo
`report@notifiche.consulbuild.com` + WhatsApp, data rinnovo) riusa la Data table.

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
Metro: nessuna sequenza di 3+ parole in >2 slot — oggi è un gate deterministico IN REPO
(`.claude/skills/copy-critic/scripts/check-slop.mjs`, spawnat da `lib/slop.ts`) eseguito
automaticamente a ogni run copy, prima del critico.

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
DESIGN-BRIEF.md raccoglie gli studi UX per scheda. Commit autonomi a verifiche passate
(regola 7 del CLAUDE.md, decisa 2026-07-11 — sostituisce «nulla si committa senza chiedere»).

## Fabbrica design (piano 2026-07, COMPLETO M0–M9)

La fabbrica dei preset è operativa: area editor `/fabbrica` (riferimenti con
gate opt-out TDM, run con 5 fasi riprendibili, audit pairwise, pubblicazione
one-click), assegnazione deterministica cliente→design nella scheda Palette
(anti-collisione di mercato), varianti Hero D / ContactCTA B, layout e
trattamento foto nei token, fotografia per-preset nelle skill immagini.
Libreria a 7 preset (nuovo: «ferro», dal pilota). Contratto e retrospettiva:
`docs/piano-fabbrica-design-2026-07.md`. Prossimo passo naturale: la prima
run con riferimenti REALI scelti da Mattia dalle gallerie.
