# Re-audit dei 5 preset alternativi (M4) — verdetti e backlog

**Data**: 2026-07-11 · **Chi giudica**: design-critic (calibrato lo stesso
giorno: κ=1.0, recall(boccia)=1.0 su gold set 40 item — vedi
`factory/calibration/report-critico.json`) · **Input**: 7 screenshot per
preset (390+1280) delle anteprime pulite, `factory/calibration/presets/` ·
**Review complete**: `factory/calibration/reviews/preset-*.json`

Contesto: i componenti sono stati ridisegnati sullo standard meridian
(2026-07); i 5 preset alternativi non erano mai stati riverificati dopo il
redesign (debito noto in CLAUDE.md). Evidenza deterministica raccolta lo
stesso giorno: axe AA (color-contrast serious) e impeccable detect
(0 residui su tutti i 6 preset dopo i fix font di M3).

## Verdetti

| Preset | Verdetto | Sotto soglia | Findings | axe color-contrast (nodi) |
|---|---|---|---|---|
| atelier | **PASS** | — | 1 minore | 3 |
| nova | **FAIL** | D3 Contrasto (0) | 3 bloccanti, 2 maggiori, 1 minore | 29 |
| canon | **PASS** | — | 1 minore | 1 |
| terra | **PASS** | — | 1 maggiore, 1 minore | 25–26 |
| vita | **PASS** | — | 3 minori | 7 |

(meridian, fuori perimetro del re-audit: 1 nodo axe — riga marchio footer.)

## Backlog — BLOCCANTI prima del pilota M7

I candidati della fabbrica renderizzano con gli stessi componenti: questi
difetti farebbero bocciare candidati incolpevoli al gate L4.

1. **nova / hero**: il display e il lead usano l'ink scuro sopra la foto
   (sul lato scuro spariscono, sul chiaro dipende dal caso); il numero di
   telefono/CTA secondaria è testo scuro senza protezione. Fix a livello
   token/overlay: ink chiaro nel contesto hero di nova + rinforzo
   `.hero-overlay`. (Coerente con l'ammasso dei 29 nodi axe.)
2. **nova / fascia servizi e footer**: testo secondario grigio chiaro su
   neutro chiaro (lavanda) sotto soglia percettiva; la fascia chiara stona
   col registro dark del preset → rivedere i neutri "alt" di nova
   (`--brand-muted`/neutro di sezione).
3. **axe color-contrast = 0 nodi su tutti i preset** come criterio di
   chiusura (oggi: nova 29, terra 25–26, vita 7, atelier 3, meridian/canon 1).
   I cluster noti: span dell'eyebrow, `.accent-word` su hero scuro,
   `.t-lead`/muted su fondo scuro, riga marchio footer.

## Backlog — maggiori (prima di M7 se toccano i componenti condivisi)

4. **terra+canon / display a 390**: le parole italiane lunghe in serif
   spezzano a metà parola («ristrutturazio/ne»): i minimi di
   `--step-display` sono tarati sull'Archivo maiuscolo di meridian, le
   metriche serif differiscono → minimi per-preset nei token (terra, canon).
   Regola CLAUDE.md invariata: non ALZARE i minimi; qui si ABBASSANO
   per-preset, con test a 390px.
5. **nova+vita / fascia value-prop**: nastro verticale schiacciato che
   spezza il ritmo (padding di sezione percepito insufficiente in quel
   blocco) → verificare `--brand-space`/section-pad nel contesto della
   fascia scura sottile.

## Backlog — minori

6. **renderAccent (`src/lib/ui.ts`)**: spazio spurio prima della virgola
   quando la accent-word va a capo («ristrutturazione , chiavi in mano») —
   bug del markup generato, visibile su vita hero 1280.
7. **atelier / hero 390**: protezione del gradiente hero debole sul finale
   del lead (testo su porzioni chiare della foto).
8. **terra+vita / testo muted su `.section-dark`**: leggibile ma al limite;
   schiarire la variante muted su fondo scuro.

## Decisioni

- **nova non è assegnabile finché il FAIL non rientra** (i bloccanti 1–2):
  formalizzare nel meta/manifest se arriverà l'assegnazione automatica (M8)
  prima dei fix. Gli altri 4 preset restano attivi col loro backlog.
- I fix sono quasi tutti a livello token/overlay per-preset (coerente con
  l'architettura: niente markup nuovo); il punto 6 è l'unico fix di codice
  (ui.ts).
- Dopo ogni fix: rigenerare le baseline VRT SOLO per le celle toccate,
  rieseguire axe (attesa: nodi in calo monotono) e il canary del critico
  (10 item, `calibrate-critic.mjs --canary`).
