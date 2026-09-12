# Archivio — documenti storici (non leggere per lavorare)

Ricerche concluse e piani già eseguiti: il loro esito vive nel codice e nei documenti
vivi indicati qui sotto. Restano in repo solo come provenienza; nessun file di codice,
skill o guida operativa deve puntare qui. Spostati il 2026-09-12 durante la pulizia del repo.

| File | Data | Perché è qui | Cosa lo ha sostituito |
|---|---|---|---|
| `ricerca-varieta-design-2026-07.md` | 2026-07-10 | ricerca (285 KB, 165 finding) alla base della fabbrica dei preset, interamente eseguita (M0–M9) | `docs/piano-fabbrica-design-2026-07.md` (Decision Log, Sorprese) + `factory/` |
| `design-system-2026-06.md` | 2026-06 | spec pre-standard: rubrica a 24 punti e spec dei 6 preset con font/palette che non corrispondono più ai token reali | `site-renderer/DESIGN.md` (standard ConsulBuild) + `site-renderer/presets/*.tokens.json` + skill `design-critic` |
| `agents-skills-plan-2026-07.md` | 2026-07-04 | piano della pipeline Fase B (intake Tally, Agent SDK): superato dall'editor con `claude -p` | `CLAUDE.md` §Mappa del repo, `site-factory-editor/lib/steps.ts` |
| `2026-07-re-audit-preset.md` | 2026-07-11 | verdetti e backlog del re-audit dei 5 preset, tutti eseguiti lo stesso giorno | `factory/calibration/reviews/preset-*.json` + fix nel CSS |
| `harness-optimize-2026-07-11.md` | 2026-07-11 | revisione dell'harness con 20 quick win applicati e roadmap in parte eseguita (run-record, staleness ack) | il codice; `docs/DEBUG.md` |
| `evals-brief-and-rubric-2026-07.md` | 2026-07 | brief A/B fittizi e rubriche R1–R3 riferite al contratto pre-Round 3/4 (fuorvianti) | skill in `.claude/skills/`, `slots.json`, `schema.ts` |
| `inventario-dati-dashboard-2026-09.md` | 2026-09-05 | inventario degli endpoint per la dashboard clienti, poi implementata | `site-factory-editor/lib/{integrazioni,stripe,gatus,portafoglio}.ts`, `docs/piano-dashboard-clienti.md` |
| `ricerca-intake-lead-2026-09.md` | 2026-09-07 | ricerca su come raccogliere i dati del lead; il form è stato costruito (`site-intake/`) con scelte in parte diverse (Drive via n8n, sito.consulbuild.com) | `docs/piano-form-bozza.md`, `site-intake/README.md`, memoria `intake-lead-decisioni` |
| `ricerca-crescita-siti-2026-09.md` | 2026-09-07 | ricerca su traffico e lead (5 strati, roadmap A–D **non ancora avviata**) | memoria `strategia-traffico-lead` (sintesi); da riaprire quando si pianifica il Piano A |

Eliminati del tutto (in git history): `kickoff-sviluppo-fase-1.md` (handoff del 2026-07-05
per `intake-tally.ts`), `evals/generated-site-A.json` (fixture dichiarata invalida),
`evals/fine-tuning-report.md` (tuning delle skill v1).
