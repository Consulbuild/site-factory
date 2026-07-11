---
name: palette-designer
description: Sceglie il preset estetico e la palette (primary+accent) di un sito conforme al contratto del renderer Site-factory (blocco `brand` di site.json), verificando il contrasto WCAG AA contro i neutri REALI del preset. Usare quando un agente deve definire tema e colori di un sito.
---

# Palette & preset designer (contratto site.json)

## Ruolo
Non emetti CSS. Produci il blocco `brand` di `site.json`: **un preset** tra i 6 + la **palette cliente** (`primary` + `accent` hex; i neutri li possiede il preset). Verifichi il contrasto contro i neutri REALI del preset con `check-contrast.mjs`.

## Input
- **Fonte primaria: `out/<slug>/contesto.json`** — il contesto distillato e VERIFICATO dall'umano. Da lì:
  - `settore_normalizzato` + `sottosettore` → la riga della tabella preset (sotto);
  - `tono.registro` + `tono.da_evitare` → orientano l'estetica (es. "istituzionale" ↛ vita);
  - `materiali.colori` → i colori indicati dal cliente: sono la BASE della palette (scurire del
    minimo necessario se falliscono AA, mai sostituire la tinta con una tua).
- Fonte secondaria: `out/<slug>/brief.json` (verbatim del form, per dettagli non distillati).
- Se `contesto.json` manca, fermati e dillo: la palette si progetta sul contesto curato, non sul form grezzo.

## Contratto di output (schema.ts → `brand`)
```json
{
  "preset": "meridian",
  "palette": { "primary": "#b0561a", "accent": "#b0561a" }
}
```
- `primary` (obbligatorio, hex) = colore dei **bottoni/CTA** (il renderer ci mette testo bianco).
- `accent` (obbligatorio, hex) = **parola-accent** nei titoli, eyebrow, link, focus.
- **Default: `primary` == `accent` (UN solo colore di marca).** È lo standard dei siti consegnati (SSC: solo arancio; CG: solo blu) e del preset meridian. Due tinte diverse SOLO se il brand del cliente ha davvero due colori — mai come scelta estetica tua.
- Opzionali (`secondary/surface/bg/ink/muted`): NON fornirli salvo motivo forte — i neutri appartengono al preset (così Nova resta scuro, Canon carta). I valori forniti vincono sul preset.
- Non impostare `fonts`: usa quelli del preset.

**Formato artifact per la pipeline** (`out/<slug>/palette.json`): la stessa scelta in mappa
flat slot-path → valore (è ciò che l'assembler e l'editor consumano):
```json
{
  "brand.preset": "meridian",
  "brand.palette.primary": "#b0561a",
  "brand.palette.accent": "#b0561a"
}
```
Nessun'altra chiave (niente meta: `verificato` & co. vivono in client.json, l'assembler rifiuta chiavi fuori slot).

## Scelta del preset (settore → preset)
| Preset | Estetica | Per |
|---|---|---|
| **meridian** (default/standard) | professionale, elevazione soffusa | studi tecnici, consulenza, **edilizia/impianti** |
| **terra** | artigianale caldo, terracotta/salvia, bordi 1.5px | artigiani, legno, food, "fatto con cura" |
| **canon** | editoriale serif, carta | studi creativi, lusso, **restauro**, portfolio |
| **nova** | dark, indaco+ciano neon, glass/glow | software/AI/tech (UNICO dark) |
| **atelier** | minimal near-monocromo, zero ombre | chi vuole sobrietà |
| **vita** | friendly rounded, micro-bounce | startup, servizi consumer, app person-facing |

Default se in dubbio: **meridian**. Edilizia/energia locali → di norma meridian (o terra se artigiano).

## Neutri REALI per preset (verifica il contrasto contro QUESTI valori)
<!-- TABELLA-NEUTRI:START (generata da build-presets.mjs — non editare a mano) -->
| Preset | bg | ink (testo) | surface | tipo |
|---|---|---|---|---|
| meridian (=`:root`) | `#ffffff` | `#1b1a17` | `#f5f4f0` | chiaro |
| atelier | `#ffffff` | `#18181b` | `#f7f7f8` | chiaro |
| nova | `#0a0a0f` | `#f5f5ff` | `#14141c` | **scuro** |
| canon | `#fbfaf7` | `#1a1714` | `#f3efe7` | chiaro |
| terra | `#faf4ec` | `#3b2f26` | `#f0e6d8` | chiaro |
| vita | `#ffffff` | `#1e1b2e` | `#f5f5ff` | chiaro |
| ferro | `#f8fafb` | `#16232e` | `#eef2f6` | chiaro |

Non esiste un blocco `[data-preset="meridian"]`: **meridian = `:root`**.
<!-- TABELLA-NEUTRI:END -->

## Regole colore (da design-system)
- **60-30-10:** neutri del preset (60/30), **accent solo 10%** su CTA/link/highlight/eyebrow — mai su grandi superfici.
- **VIETATI:** gradiente indaco→viola di default (`#6366F1→#8B5CF6`), neon e max-saturazione (unica eccezione glow/neon: **nova**).
- primary/accent coerenti col settore (edilizia: rame/terracotta/blu-ferro; energia: verde/blu; restauro: bordeaux/terra). Mai colori a caso.
- **Ancore di riferimento (dai siti consegnati):** arancio bruciato → `#b0561a` (NON `#d97732`: quello dei siti live fallisce AA a 3.16:1 su bianco — la pipeline lo corregge, non lo copia); blu impresa → `#2f568e` (7.39:1, passa). Se il colore del cliente fallisce il gate, **scuriscilo del minimo necessario** finché passa, mantenendo la tinta.
- Emetti **un solo hex per tinta**: il sito CG consegnato ha 6 varianti dello stesso blu sparse nei blocchi — il sistema a token esiste proprio per evitarlo.

## Verifica contrasto (gate — `check-contrast.mjs`)
Coppie obbligatorie, contro i neutri del preset scelto:
1. **primary / `#ffffff`** ≥ **4.5** — testo bianco dei bottoni (piccolo/bold). La più insidiosa: se fallisce, scurisci il primary.
2. **accent / bg(preset)** ≥ **3** — parola-accent (testo grande). **Preferibile ≥4.5** così anche l'eyebrow piccolo è sicuro.
3. Se fornisci neutri custom: **ink / bg** ≥ 4.5.
Su **nova** (scuro) usa bg `#0a0a0f` per la coppia accent (l'accent neon chiaro passa facile); primary/#fff resta il vincolo.
`node check-contrast.mjs coppie.json` deve uscire con **codice 0**.

## ponytail
`accent-strong` (colore dell'eyebrow piccolo = `color-mix(accent, ink 15%)`) è derivato dal renderer, non lo ricalcolo qui: il gate testa primary/#fff e accent/bg, e la regola "accent ≥4.5 vs bg" copre l'eyebrow in modo conservativo. Se serve precisione sull'eyebrow, aggiungere il color-mix al tool.

## Esempio (edilizia, meridian)
`coppie.json`:
```json
[
  { "name": "primary / white (btn)", "fg": "#b0561a", "bg": "#ffffff" },
  { "name": "accent / bg meridian",  "fg": "#b0561a", "bg": "#ffffff", "large": true }
]
```
output `brand`: `{ "preset": "meridian", "palette": { "primary": "#b0561a", "accent": "#b0561a" } }`
