# DESIGN.md — Lo Standard ConsulBuild

Il sistema visivo standard della Site Factory, distillato dai siti consegnati
(ssccostruzionisrls.it, costruzionigeneralidilaceciliagiovanni.it). Questi due siti
condividono lo stesso scheletro con palette diverse (charcoal+arancio / navy+blu):
**quello scheletro È lo standard**. La pipeline AI personalizza solo palette, copy e
immagini; la grammatica sotto non si tocca.

## La grammatica (firma del brand, sempre presente)

1. **Eyebrow con lineetta**: etichetta maiuscola tracked in accent, preceduta da "—"
   (e seguita da "—" quando centrata). Es: `— I NOSTRI SERVIZI —`. È un sistema di
   brand deliberato e coerente su ogni sito consegnato, non scaffolding.
2. **H2 maiuscolo con UNA frase in accent**: `SOLUZIONI COMPLETE PER **OGNI SPAZIO**`.
   Nel `site.json` la frase accent si marca con `**...**`; il renderer la converte in
   `<span class="accent-word">`. Una sola frase marcata per titolo, mai di più.
3. **Ritmo scuro/chiaro**: le sezioni alternano fondo chiaro e fondo scuro
   (`.section-dark`). Il fondo scuro è il charcoal del preset, non un colore del
   cliente. Hero, Gallery, form-CTA e banner CTA tendono al scuro.
4. **CTA ricorrenti**: bottone primario pieno (accent) + bottone telefono outline in
   quasi ogni fold. Microcopy di rassicurazione sotto i banner
   ("Sopralluogo gratuito: nessun impegno. Risposta entro 24 ore.").
5. **Prova visiva**: card servizi con foto reali + checklist; gallery lavori con
   etichette; processo numerato 01–04 (numerato perché È una sequenza reale).

## Token (cascata: `:root` standard < `[data-preset]` < inline cliente)

### Colori
- Il cliente fornisce solo `primary` + `accent` (spesso identici: UN colore di marca).
- Neutri di proprietà dello standard: `bg #ffffff`, `surface #f5f4f0` (grigio caldo),
  `ink #1b1a17`, `muted #57534e`, `inverse-bg #191919` (charcoal sezioni scure),
  `inverse-ink #f5f4f0`.
- **Guardrail AA automatici** (funzionano con QUALUNQUE accent):
  - `--accent-strong` = accent + 15% ink → testo accent piccolo su fondo chiaro;
  - in `.section-dark` l'eyebrow usa accent + 30% bianco;
  - le parole accent nei titoli sono sempre testo grande (≥3:1 basta).
- Palette demo di riferimento: `#b0561a` (5.0:1 su bianco, AA ovunque).

### Tipografia
- **Una famiglia: Archivo** (grottesca solida, voce da impresa). Body 400/500,
  heading 700–800, display 800. Niente seconda famiglia: il contrasto lo fanno
  peso + maiuscolo + scala.
- Display e H1/H2 in **maiuscolo** (`--heading-case: uppercase`), line-height 1.02–1.1,
  tracking -0.01em (il maiuscolo non vuole tracking negativo forte).
- Scala fluida: `--step-display: clamp(2.6rem → 4.5rem)`, `--step-4 (H2):
  clamp(1.9rem → 2.9rem)`. Body 1.0625rem fisso.
- Eyebrow: 0.8125rem, peso 700, tracking 0.14em.

### Forma
- Bottoni: **rettangolari, radius 6px**, maiuscolo 0.85rem peso 700 tracking 0.05em,
  padding 0.95rem × 1.6rem. Primario = accent pieno, testo bianco. Secondario = outline;
  su `.section-dark` diventa outline bianco automaticamente.
- Card: bianco su fondo chiaro, radius 12px, ombra soffusa a due strati, bordo hairline.
- Input: radius 8px, **label visibili** sopra il campo (mai solo placeholder).
- Foto: radius 10px (`.media-frame`), didascalie con `.media-caption` (barra accent
  3px + etichetta su fondo scuro traslucido, in basso a sinistra).

### Motion
- **Motion di interazione — AMMESSO** (policy aggiornata 2026-07-14): transizioni
  su `:hover`/cambio di stato (bottoni, card) e navbar reattiva allo scroll.
  Vincoli duri: tokenizzato (`--brand-dur-*`/`--brand-ease`), solo proprietà
  compositor (transform/opacity/box-shadow/colore), **mai** gating della
  visibilità del contenuto, azzerato sotto `prefers-reduced-motion`, AA preservato.
- **Motion decorativo — VIETATO**: reveal/entrance/parallax allo scroll. I token
  `--brand-reveal-*` restano non usati finché una decisione non li riabilita.
- **Firma di brand**: il cross-fade tra pagine (View Transitions cross-document,
  `@view-transition` in global.css), anch'esso disattivato sotto reduced-motion.

## Struttura canonica della pagina (ordine SSC, il golden path)

| # | Sezione | Fondo | Note |
|---|---------|-------|------|
| 1 | Header | chiaro, riga accent sotto | logo sx (monogramma se manca), nav centrata, tel + CTA dx |
| 2 | Hero | foto+overlay scuro | eyebrow bianca, display maiuscolo con accent, sub, CTA+telefono |
| 3 | TrustBar | scuro (tono diverso dall'hero) | 3–4 voci titolo+sottotitolo, hairline verticali |
| 4 | Services | chiaro | card foto+titolo+desc+checklist accent |
| 5 | Gallery | scuro | griglia foto con didascalie |
| 6 | ProcessSteps | chiaro | 01–04 numerati (card o timeline) |
| 7 | ContactCTA (form) | scuro | split: messaggio+contatti sx, form card bianca dx |
| 8 | FAQ | chiaro | accordion centrato, max-w prosa |
| 9 | CtaBanner | scuro | H2 accent centrato, CTA+telefono, microcopy rassicurazione |
| 10 | ContactCTA (canali) | chiaro | strip canali senza card |
| 11 | Footer | scuro | dati aziendali+P.IVA sx, legali dx, copyright centrato |

WhyChooseUs (pill di garanzia) è in libreria ma FUORI dal golden path v1
(rimossa in live review 2026-07-03: ridondante col resto della pagina).

Varianti CG: TrustBar a 4 voci, Services su fondo scuro, ProcessSteps timeline
verticale, ContactCTA form su fondo chiaro con checklist a sinistra, CtaBanner chiaro.
L'alternanza scuro/chiaro va preservata quando si riordina.

## Anti-slop (vincoli assoluti nei componenti)

- Mai valori estetici hardcoded: solo token/classi semantiche.
- Mai emoji come icone: solo `Icon.astro`.
- Mai side-stripe border >1px come accento su card.
- Mai gradient text, mai glassmorphism decorativo.
- Il maiuscolo è solo per titoli/label brevi, mai per body copy.
- Ogni foto ha `alt` parlante; `loading="lazy"` sotto il fold, hero `eager`.
- Le didascalie/label vengono dai dati, mai hardcoded nel componente.

## Legale by-design (verificato 2026-07-03, Garante + GDPR)

- **Form contatti**: base giuridica art. 6.1.b GDPR (risposta a richiesta di
  preventivo) → NIENTE checkbox di consenso; obbligatorio il link
  all'informativa art. 13 sotto il submit (fisso nel componente). Consenso
  separato SOLO se si aggiunge una finalità marketing.
- **Analytics**: Umami cookieless/anonimizzato → niente cookie banner (Linee
  guida cookie Garante 10.6.2021: tecnici/anonimi esenti da consenso); va solo
  menzionato nell'informativa. Se Umami Cloud: scegliere hosting UE.
- **Footer**: P.IVA sempre (art. 35 DPR 633/72); per società di capitali anche
  REA e capitale sociale (art. 2250 c.c.) — campo legalNote.
- **Pagina /privacy**: generata dalla pipeline in Fase 3 (informativa art. 13
  con sezione analytics); i link puntano già lì.
- **Stati form**: loading/successo/errore + honeypot + aria-live già nel
  componente; in Fase 3 basta action reale + data-demo="false".

## Rapporto con gli style-preset

Lo standard È il default (`:root`, preset `meridian`). Gli altri 5 preset
(atelier/nova/canon/terra/vita) restano come variazioni estetiche via token per
richieste esplicite dal form ("minimal", "futuristico"...), ma la struttura dei
componenti — la grammatica qui sopra — è unica. I preset che vogliono un'altra voce
tipografica sovrascrivono `--heading-case: none` e i propri font.

## Varietà controllata (M9)

**Varianti di sezione** — regola di split: è una *variante* (valore enum
`variant` + un ramo di classi + un esempio) finché consuma GLI STESSI slot
Zod; se servono slot nuovi è un *tipo* nuovo. Le varianti non sono slot degli
agenti copy/immagini: le fissa il blueprint o l'operatore (prospettiva: il
campo `varianti` del registro assegnazioni M8). Attive: Hero `D` (big number —
i badge che iniziano con un numero diventano statistiche grandi, SOLO numeri
reali dal form), ContactCTA `B` (gradual reassurance: form in 2 passi,
fallback no-JS = form intero), Services `compact` (card senza descrizione,
foto+titolo+checklist — scelta operatore via slot `sections[3].variant`
quando i bullet coprono già la desc; introdotta per Cavaliere Build 2026-07).

**Layout nei token** — le sezioni split (contatti col form, hero B) dichiarano
solo aree nominate (`.area-testo` / `.area-focale`); la disposizione la decide
il preset via token raw `layout-split-*` (grid-template-areas sulla griglia a
12 colonne — il default replica il layout storico, un preset può invertire le
aree senza toccare il DOM; ferro le inverte).

**Trattamento foto come token** — `--media-duotone` (tinta primary in
mix-blend color) e `--media-grain` (feTurbulence statico) su `.media-frame`,
SPENTI di default su tutti i preset: si accendono per-preset nei token, con
due guardie: la didascalia resta sopra i trattamenti (z-index, chip sempre
AA) e MAI trattamenti su volti in primo piano (voce bloccante V8
dell'image-critic — i trattamenti sui visi erodono la fiducia).
