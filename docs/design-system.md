# Site Factory — Design System & Anti-Slop Spec

> Sintesi della ricerca multi-agente (giugno 2026). Guida la libreria di sezioni e gli agenti AI della pipeline. NON è codice: è il contratto di qualità.

## 1. Design System

### Typography
TWO families max + 1 mono accent, self-hosted/Google subset, only weights used. Modular scale via CSS custom props driven by --brand-type-ratio (1.2 minimal → 1.25 pro → 1.333 futuristic → 1.414 editorial). Tokens: --step--1 .833rem(13px caption/eyebrow), --step-0 body 1.125rem(18px, NOT 16px), --step-1 1.375rem lead, --step-2 1.5rem h4, --step-3 1.875rem h3, --step-4 2.5rem h2, --step-5 h1 clamp(2.75rem,1.8rem+4.7vw,4rem), --display clamp(3.5rem,2rem+7vw,7rem). Fluid clamp() for h1/h2/display (always pair vw with a rem term for zoom a11y). Line-height inverse to size: display/h1 1.0-1.1, h2/h3 1.15-1.2, lead 1.4, body 1.6 (max 1.65), caption 1.4. Letter-spacing: display -0.03em, h1/h2 -0.02em, h3 -0.01em, body 0, uppercase eyebrow +0.08 to +0.12em. Measure: body max-w 65ch (60-75), editorial column 48-55ch. Hierarchy from WEIGHT (700 vs 400) + COLOR (ink vs --ink-60 muted), max 3-4 type roles/page; never italicize one word to fake hierarchy. ALL-CAPS only on micro-labels, never on whole headings. FIX vs today: global.css hardcodes h1-h4 weight 700 / lh 1.1 / -0.02em for ALL headings and body inherits 16px — promote these to scale tokens so presets can differ (e.g. Canon serif 900 lh1.05, Atelier 600).

### Spacing
Base-8 scale with 4px half-step: 4/8/12/16/24/32/48/64/96/128/160, used NON-linearly (gap between sections >> between groups >> between related elements). Token --brand-space multiplier (0.9 dense → 1.0 regular → 1.2 airy). Replace the hardcoded sectionPad 'py-20 md:py-28' in lib/ui.ts with --section-pad: clamp(4rem,8vw,10rem)*var(--brand-space); mobile floor 56-80px. Container: layout max-w 1280px (current container-site 80rem is OK), text container 720-800px / max-w-[65ch], full-bleed 100vw via margin-inline:calc(50% - 50vw). Rule: inner spacing <= outer spacing (card title→body gap 12-16px < gap between cards 24-32px < block/section gap 64-96px). >=32-48px of clear space above a primary CTA to isolate it. Alternate dense data sections with airy claim sections for narrative rhythm.

### Color
60-30-10: 60% dominant WARM neutral (never #FFFFFF or cool shadcn grey — use #FAF8F5/#F2EEE8), 30% ink/dark structure (warm near-black #1A1A18, not #000), 10% single brand accent ONLY on CTA/links/highlights. BANNED: violet/indigo→blue default gradient (#6366F1→#8B5CF6), neon, max-saturation. Surface ladder for depth BEFORE shadows: --surface-0 #fff, --surface-50 #FAF8F5, --surface-100 #F2EEE8, --surface-200 #E9E3DA, --border #E7E1D8 hairline; inverted section bg #1A1A18 text #FAF8F5. Accent needs states: --accent, --accent-hover (10-12% darker), --accent-soft color-mix(in oklch, accent 12%, white). Shadows & borders TINTED toward ink/accent, never pure black: shadow color hsl(28 30% 12%/.08); border color-mix(in srgb, var(--ink) 10%, transparent). Verify WCAG AA >=4.5:1 body, >=3:1 large/UI with a tool. Schema's 7-color palette is fine but extend renderer to derive surface ladder + accent states via color-mix so clients only supply primary/accent.

### Motion
Durations by intent: tap/toggle 100-150ms, hover/UI 200-300ms, component entrance 300-500ms, scroll reveal 500-700ms (never >800ms; <80ms feels broken). Easing: entrances ease-out expo cubic-bezier(0.16,1,0.3,1); UI standard cubic-bezier(0.4,0,0.2,1); exits cubic-bezier(0.4,0,1,1). NO linear, NO bounce on serious CTAs (bounce only Vita/Terra presets). Reveal pattern: opacity 0→1 + translateY 16-24px→0, 600ms, trigger ~15% visibility, stagger 60-90ms between list items. Animate ONLY transform & opacity (GPU) — never width/height/top/left/margin, never transition:all. Composite hovers (lift -4px + deeper shadow + icon translateX 4px + underline grow 0→100% 250ms), all props same duration. Parallax max 8-15% travel, ease-in-out, accent only. prefers-reduced-motion: reduce already zeros durations globally in global.css — keep it; expressive presets stay safe under it. FIX: today reveal is hardcoded 0.6s ease in Base.astro inline <style> — make it read transition-duration:var(--brand-dur-slow); transition-timing-function:var(--ease-brand).

### Layout
Real 12-col grid with ASYMMETRIC splits (7/5 or 8/4, never default 6/6); collapse to 1 col on mobile. ONE focal point per section (scale ratio focal:rest >=2x; one primary CTA, others ghost/link). Left/asymmetric alignment as default — center-align ONLY for short blocks (quote, final CTA), never long paragraphs. Editorial framing: eyebrow micro-label + numeric index (01—) + big h2 + narrow intro (55ch). Break monotony: alternate contained vs full-bleed, light vs dark sections; intentional overlap (card margin-top -64 to -96px sliding over next section with z-index+shadow). Bento grid for services (one large focal tile col-span-2 row-span-2 + small tiles) instead of identical Bootstrap columns. Hairline 1px dividers (color-mix ink 8%) instead of heavy boxes — architectural precision; max border 1px except a deliberate 4px accent bar. FIX: today every section is a centered max-w-2xl heading + uniform card grid (ProcessSteps/WhyChooseUs/Testimonials/ValueProp-B all center) — introduce asymmetry, eyebrows, section indices, bento.

### Imagery
REAL photos only (site/team/jobsite/before-after/screenshots) — ban generic stock 'diverse team at laptop' and plastic AI illustration. Few intentional aspect ratios: hero 16:9 or 21:9, project gallery 3:2 or 4:3, team portrait 4:5, thumb 1:1; always aspect-ratio + object-cover to kill CLS. Text-over-image: directional gradient overlay linear-gradient(to top, rgb(20 18 16/.7), rgb(20 18 16/.15) 45%, transparent 70%) guaranteeing 4.5:1, not a flat global darken. Unify mismatched shots with one brand grade: filter saturate(.9) contrast(1.03) brightness(1.02) or duotone via mix-blend on special sections. Single border rule: coherent radius 12-20px OR sharp 0 for architectural/editorial; 1px border to detach from light bg. Mask/clip for editorial overlaps. Astro: astro:assets, AVIF/WebP, explicit dimensions, loading=lazy + decoding=async (already done in Services/Gallery), fetchpriority=high on hero only (already in Hero A). Mandate alt via schema (already required) — keep enforced.

### Premiumdetails
Layered shadows (3-4 stacked, tinted): box-shadow: 0 1px 2px hsl(28 25% 12%/.06), 0 2px 6px /.06, 0 8px 16px /.07, 0 16px 32px /.06; +0 24px 48px layer on hover — the Stripe/Linear/Vercel tell. Hairline borders 1px color-mix(ink 8%) on light, white 12% on dark; inset top-light box-shadow: inset 0 1px 0 rgb(255 255 255/.6). Subtle grain 3-6% (max 8%) via inline SVG feTurbulence baseFrequency .8 numOctaves 3 on a ::before, pointer-events:none, mix-blend overlay — kills gradient banding, adds material warmth (paper/concrete for edilizia). Eyebrow micro-labels: 13px, 600, uppercase, +0.12em, accent/muted, with a leading — or • dot. Numbers as graphics: index 01/02/03 in mono or outline display (-webkit-text-stroke:1px var(--border); color:transparent); hero stats 56-96px 700 + 13px uppercase label. Trust pills: padding 6px 12px, radius 999px, 1px border, 13px, status dot 8px ('Dal 2010','Detrazione 50%','Zona: Lazio'). Accessible polish: :focus-visible outline 2px accent offset 2px (already in global.css), ::selection background accent-soft, link underline text-underline-offset 3px / thickness 1px. Replace the 5x identical filled star in Testimonials with a real rating component (half/empty states).

## 2. Anti-Slop Rubric (pass/fail su OGNI sezione)

1. [Gradients] No generic violet/indigo→blue gradient anywhere. Any gradient (max 1 per section) uses analogous hues close in hue, sits on a single element, never rainbow, grain added to avoid banding. PASS/FAIL
2. [Color] Palette = 1 dominant WARM neutral (not pure #fff / cool shadcn grey) + 1 brand accent + a 9-12 step neutral ladder; nothing at max saturation. PASS/FAIL
3. [Contrast] Every body text >=4.5:1 and large/UI >=3:1 on its actual background, verified with a tool not by eye. PASS/FAIL
4. [Type-display] Display font is NOT Inter/Roboto/Open Sans/system — an intentional characterful typeface (preset-defined). PASS/FAIL
5. [Type-pairing] Pairing is not a default combo (Inter+everything, Playfair+Inter, Space Grotesk+Inter); display vs body have clear contrast and a defined modular scale. PASS/FAIL
6. [Type-hierarchy] Hierarchy comes from scale + weight + color, not one italic word; ALL-CAPS only on micro-labels, never whole headings. PASS/FAIL
7. [Alignment] Default left/asymmetric; center-align limited to short blocks (quote, final CTA); no long paragraph centered. PASS/FAIL
8. [Grid] A real grid with >=1 intentional break (offset module, unequal columns 7/5-8/4, element bleeding out); section is not mirror-symmetric and has one clear focal point. PASS/FAIL
9. [Cards] Not one uniform grid of identical icon-top cards: density/structure vary (icon-left/top, bento, full-width); NO colored left-border on cards; no needless nested cards. PASS/FAIL
10. [Spacing] 4/8pt scale used hierarchically (section gap > group gap > element gap); not flat/uniform; generous whitespace around key elements; inner<=outer rule respected. PASS/FAIL
11. [Radius] Radius follows a scale (distinct input/button/container, nested-radius rule) with a coherent personality; NOT the same value (e.g. 16px) on everything. PASS/FAIL
12. [Shadows] Multi-layer elevation scale (key+ambient, opacity 8-24%, tinted to bg); no single repeated shadow, no decorative colored glow (except Nova). PASS/FAIL
13. [Buttons] Not all pills; shape coherent with the radius system; primary/secondary/tertiary hierarchy; ALL states defined (hover/active/focus/disabled) with 150-300ms eased transitions, never snap. PASS/FAIL
14. [Icons] Zero emoji as icons (no ✓ 🚀 ✅); one coherent set, uniform stroke + optical size, customized not raw default Lucide/Heroicons sprinkled one-per-row. PASS/FAIL
15. [Images] Hero & imagery are real (product/team/jobsite/before-after/screenshot) or custom brand visual; no generic stock, no plastic AI illustration; coherent aspect ratios + grade. PASS/FAIL
16. [Texture] Material depth present: subtle grain/noise (3-6%), layering or micro-detail (hairline, dividers); no sterile flat surface, no gradient banding. PASS/FAIL
17. [Glass] backdrop-blur only functional (sticky header/overlay/menu) with guaranteed text contrast; no decorative glassmorphism scattered (except Nova as identity). PASS/FAIL
18. [Copy-headline] Headline names problem + concrete outcome with specificity (numbers/time/result); no 'qualità/professionalità/soluzioni su misura', no hedging, no empty superlatives. PASS/FAIL
19. [Copy-proof] Social proof is specific (real name, city, figure, detail), not a generic '4.8 stars' badge alone. PASS/FAIL
20. [Copy-5sec] 5-second test passes: what you do, for whom, why different is clear above the fold. PASS/FAIL
21. [Editorial] Section has >=1 curated editorial detail (eyebrow/kicker, section index 01—, caption, pull-quote, hairline rule, or voiced microcopy). PASS/FAIL
22. [Motion] Micro-interactions intentional and eased (200-700ms, no linear, no snap, no >800ms), animating only transform/opacity; reveal+stagger present; prefers-reduced-motion honored. PASS/FAIL
23. [Italian polish] Zero typos/placeholder ('[email protected]', 'il tou'), zero stray English ('All rights reserved'), real phone/email, copyright in Italian. PASS/FAIL
24. [Slop-score] Section contains 0-1 tells from this list (target). 2-3 = mild slop, revise; 4+ = heavy slop, rebuild. PASS/FAIL

## 3. Style Presets

### Atelier — Minimal — Near-monochrome, abundant whitespace, zero shadows, hierarchy from type + hairlines. 'Looks like Apple/Linear', calm and legible. Default for clients who say the current site is 'too much' or want restraint.
data-preset=atelier. COLOR bg #ffffff, surface #f7f7f8, ink #18181b, muted #6b7280, primary=ink #111111 (buttons near-black not colored), accent #3f5bd9 only on links/states, chroma deliberately low. FONTS heading+body Inter Tight / Inter, weights 400/500/600 only (no 800), type-ratio 1.2, H1 clamp(2.25rem,4vw,3.25rem), tracking heading -0.02em, lh heading 1.15 / body 1.6, mono optional. SPACE --brand-space 1.15 (py-28/36), grid-gap 1.5rem, container 72rem. RADIUS --radius-card 8px, input 6px, pill 8px (buttons rounded-lg, NOT pill). SHADOW card none, cta 0 1px 2px rgb(0 0 0/.06), float 0 4px 12px rgb(0 0 0/.05); hover darkens border, no lift. BORDER 1px color-mix(ink 10%), hover 18%, no colored ring. MOTION fast120/base160/slow280ms, ease cubic-bezier(0.4,0,0.2,1), reveal translateY 8px fade 280ms, hover color/border only no translate. TREATMENT hero B/C light no dark overlay; eyebrow = uppercase label +0.12em with hairline above (not a pill); .surface-card = hairline border only, flat, hover darkens border; dividers 1px ink/10; media radius 8px no filter.

### Meridian — Professionale (default) — Deep navy + copper/gold accent, soft realistic elevation, ordered structure. Authority for technical studios, consulting, premium edilizia. The factory default — a refined version of the current navy/amber theme.
data-preset=meridian. COLOR bg #ffffff, surface #f4f6f9 (cool grey), ink #0f172a, muted #5b6675, primary #1e3a5f navy, secondary #2d5a87, accent #c2703d copper (or #b8860b gold); authority gradients ink→navy. FONTS heading Plus Jakarta Sans 700/800, body Inter 400/500/600, type-ratio 1.25, H1 clamp(2.5rem,4.5vw,4rem), tracking heading -0.018em, lh heading 1.12 / body 1.65. SPACE --brand-space 1.0 (py-20/28), gap 1.5rem, container 80rem. RADIUS card 12px, input 8px, pill 8px (buttons rounded-lg, restraint — never full pill). SHADOW card '0 1px 2px rgb(15 23 42/.06), 0 8px 24px rgb(15 23 42/.08)', cta '0 2px 4px rgb(30 58 95/.20), 0 10px 24px rgb(30 58 95/.18)', float '0 20px 50px rgb(15 23 42/.14)', hover +1 level. BORDER 1px ink/8, card hover ring-1 ink/15. MOTION fast150/base200/slow450, ease cubic-bezier(0.4,0,0.2,1), reveal translateY16 fade450, hover -translate-y-0.5 + higher shadow. TREATMENT hero A full-bleed with gradient overlay ink/85→ink/15, white text, accent check badge; eyebrow = filled pill primary/10 text-primary; .surface-card surface + layered shadow + ink/8 border, hover lift -4px; dividers gradient ink/10→transparent; LogoPartnerBar + TrustBar prominent.

### Nova — Futuristico — Dark-first UI, electric indigo + neon cyan, glass + colored glow, monospace labels. Immediate 'wow' for software/AI/tech brands. The ONLY preset where glow and glassmorphism are intentional identity, not slop.
data-preset=nova. COLOR (dark-first) bg #0a0a0f, surface #14141c, ink #f5f5ff near-white, muted #8a8aa0, primary #6d3bf5 electric indigo, accent #22d3ee neon cyan, mesh violet→cyan glow. NOTE: this is the ONE sanctioned use of indigo+glass — never use this look on other presets. FONTS heading Space Grotesk 500/700, body Inter 400/500, mono JetBrains Mono 500 for eyebrow/label/numbers, type-ratio 1.333, H1 clamp(2.75rem,6vw,5rem), display tracking -0.03em, label +0.08em uppercase. SPACE --brand-space 1.0 with hero pad 7rem, gap 1.25rem, container 80rem. RADIUS card 16px, input 12px, pill 9999px. SHADOW card '0 0 0 1px rgb(255 255 255/.08), 0 8px 40px rgb(109 59 245/.30)', cta '0 0 0 1px rgb(109 59 245/.50), 0 8px 32px rgb(109 59 245/.45)', float '0 0 60px rgb(34 211 238/.30)', hover intensifies glow. BORDER 1px rgb(255 255 255/.12); glass card backdrop-blur 12px + bg white/5; focus ring cyan glow. MOTION fast150/base250/slow600, ease cubic-bezier(0.16,1,0.3,1) expo, reveal translateY24 + scale .98 600ms, hover -translate-y-1 + scale 1.02 + glow. TREATMENT hero A dark full-bleed + radial glow behind title; eyebrow = MONO chip with glow border; .surface-card = glass; dividers luminous gradient line; media duotone overlay + neon ring.

### Canon — Editoriale — High-contrast serif, warm paper (Cloud Dancer off-white), typographic rules + drop-caps, zero shadows. Magazine elegance for creative studios, luxury, restoration/restauro, portfolio. Depth is purely typographic.
data-preset=canon. COLOR (warm paper) bg #fbfaf7, surface #f3efe7, ink #1a1714 warm near-black, muted #6e655c, primary=ink, accent #7c2d2d burgundy (or #2f4f3e forest) sparingly on italics/links. FONTS heading Playfair Display 600/700/900 + italic, body Source Serif 4 400/600 (or Inter for sans contrast), type-ratio 1.414 (dramatic display), H1 clamp(2.75rem,6vw,5.5rem), tracking heading -0.01em / body 0, lh heading 1.05 / body 1.7, small-caps labels. SPACE --brand-space 1.2 (py-28/40), reading measure 65ch, gap 2rem, container 76rem wide margins. RADIUS 2px everywhere (≈ none); buttons squared or underlined-link treatment. SHADOW none on all. BORDER 1px solid ink; rules above/below sections; drop-cap on first paragraph; no colored ring. MOTION fast200/base400/slow700, ease cubic-bezier(0.22,1,0.36,1), reveal fade + translateY12 700ms, no bounce/scale, hover underline reveal + color. TREATMENT hero C centered editorial, huge serif display, optional italic accent; eyebrow = small-caps letterspaced 0.15em with rule (kicker); .surface-card = transparent, border-top 1px ink, radius 0, serif numeric index 01/02, no shadow; dividers full-width ink rule / ornament; media b&w or warm duotone, sharp corners, italic caption.

### Terra — Artigianale — Terracotta, clay, sage and cream, soft organic shapes, low warm shadows, slightly heavier borders. Handcrafted warmth for artisans, wood/edilizia, food, ethical 'made with care' brands.
data-preset=terra. COLOR (neo-earth) bg #faf4ec cream, surface #f0e6d8, ink #3b2f26 warm brown-black, muted #8a7a68, primary #c2603f terracotta, secondary #9c5a3c clay, accent #6b7a52 sage (or #d99a3a ochre). FONTS heading Fraunces 500/600 (opsz axis) + italic, body Karla 400/500/700 (or Work Sans), type-ratio 1.25, H1 clamp(2.5rem,5vw,4.25rem), tracking heading -0.01em, lh heading 1.1 / body 1.65. SPACE --brand-space 1.05 (py-24/32) cozy, gap 1.75rem, container 78rem. RADIUS card 18px, input 14px, pill 9999px (warm pill buttons), organic image masks. SHADOW warm low tinted brown: card '0 6px 20px rgb(59 47 38/.10)', cta '0 6px 18px rgb(194 96 63/.28)', float '0 16px 40px rgb(59 47 38/.14)', diffuse never hard. BORDER 1.5px color-mix(ink 14%), hover 22% — handcrafted feel. MOTION fast160/base250/slow500, ease cubic-bezier(0.34,1.2,0.64,1) slight overshoot, reveal translateY16 fade500, hover soft lift -4px. TREATMENT hero B split warm image with rounded/organic mask (asymmetric radius or blob clip-path); eyebrow = warm rounded-full pill with micro-icon; .surface-card radius 18px + 1.5px warm border + warm shadow, hover lift; dividers soft SVG wave / dotted warm line; media warm grade (saturation+, warm tint), rounded corners, occasional polaroid frame.

### Vita — Friendly (bonus) — Approachable rounded-geometric, friendly indigo + coral/mint, diffuse colored shadows, micro-bounce. Fresh and likeable for startups, consumer services, person-facing apps — without Terra's artisan warmth.
data-preset=vita. COLOR bg #ffffff, surface #f5f5ff faint lilac, ink #1e1b2e, muted #6b7280, primary #6366f1 friendly indigo, accent #fb7185 coral (or #34d399 mint); soft indigo→coral gradients ONLY here and kept analogous-ish/branded (not the banned tech violet→blue). FONTS heading Plus Jakarta Sans 700/800 (or Poppins), body Inter 400/500/600, type-ratio 1.25, H1 clamp(2.5rem,5vw,4rem), tracking heading -0.02em, lh heading 1.12 / body 1.6. SPACE --brand-space 1.0-1.05 (py-20/28), gap 1.5rem, container 78rem. RADIUS card 24px (rounded-3xl), input 16px, pill 9999px. SHADOW colored diffuse no-border: card '0 12px 32px rgb(99 102 241/.15)', cta '0 8px 24px rgb(99 102 241/.35)', float '0 24px 60px rgb(99 102 241/.20)'. BORDER minimal 1px ink/6 or none, focus ring accent/40. MOTION fast150/base250/slow450, ease cubic-bezier(0.34,1.56,0.64,1) back/overshoot, reveal translateY16 + scale .96 450ms, hover scale 1.03 + wider colored shadow. TREATMENT hero B floating rounded cards + blob gradient bg; eyebrow = soft rounded-full pill accent/10; .surface-card rounded-3xl no border floating colored shadow, hover scale; dividers soft SVG wave/blob; media radius 24px bright object-cover.

## 4. Section Library (tassonomia)

### AnnouncementBar / Topbar (NEW)  · priorità P2
- **Scopo**: Thin strip above header for promo, hours, 24h availability, or fiscal hook ('Detrazione 50% gestita da noi'). First micro-urgency/trust lever.
- **Varianti**: 2 — info (phone+hours+zone) / promo (message+link, optional countdown)
- **Preset**: Meridian, Nova (omit in Atelier/Canon to keep top edge clean)

### Header / Navbar (EXISTS, extend)  · priorità P0
- **Scopo**: Anchor nav + persistent CTA + click-to-call always visible. Currently solid bg/80 backdrop-blur with phone+CTA — good base.
- **Varianti**: 4 — solid / transparent-over-hero / with utility topbar / centered-logo (today only solid+transparent)
- **Preset**: All (transparent=Nova/Meridian hero, solid sticky=pro, centered=Atelier/Canon)

### Hero (EXISTS A/B/C, expand)  · priorità P0
- **Scopo**: Above-fold impact: outcome + 1 primary CTA + trust badge + phone. Today A=full-bleed dark overlay, B=split 4:5 image, C=centered+wide image.
- **Varianti**: 6-7 — A full-bleed overlay, B split image+text, C centered editorial, NEW: hero+inline QuoteForm, video background, minimal centered no-image, stat-anchored
- **Preset**: All; minimal-no-image=Atelier/Canon, split=Terra/Meridian, full-bleed/video=Nova/Meridian, centered serif=Canon

### QuoteForm / Preventivo rapido (NEW)  · priorità P1
- **Scopo**: Dedicated lead form (light multi-step: job type, zone, contact) as primary conversion hub, can live in hero or standalone. The KPI for these local-service clients.
- **Varianti**: 2 — inline 1-step / multi-step cards
- **Preset**: Meridian, Nova, Vita

### LogoPartnerBar / Marchi & Partner (NEW — gap)  · priorità P1
- **Scopo**: Row of installed-brand/supplier/association logos — third-party borrowed credibility. Distinct from numeric TrustBar.
- **Varianti**: 2 — static grayscale grid / scrolling marquee
- **Preset**: Meridian (grayscale), Nova (marquee); rare in Atelier

### TrustBar / Stats (EXISTS, enrich)  · priorità P1
- **Scopo**: Band of proof numbers (years, jobs, m², clients). Today: thin band value+label, no animation.
- **Varianti**: 3 — thin band / rich Stats with count-up + extended context / inline-in-hero
- **Preset**: thin=Atelier/Meridian, animated count-up=Nova/Vita, rule-separated=Canon

### ProblemAgitation / Pain PAS (NEW — gap)  · priorità P1
- **Scopo**: Name & amplify the customer's pain before the solution (PAS). Today's ValueProp is value-led only — the agitation step is missing.
- **Varianti**: 2 — pain-point list with icons / pain-vs-solution split
- **Preset**: Meridian, Nova, Terra; in Atelier only as a ValueProp subtitle

### ValueProp (EXISTS A/B)  · priorità P2
- **Scopo**: Why this provider solves the need better. Today numbered cards (A left / B centered).
- **Varianti**: 3 — A left / B centered / NEW with supporting image
- **Preset**: All

### Services (EXISTS grid/list, extend)  · priorità P0
- **Scopo**: Service catalog with per-item benefit (scope→detail→time). Today grid/list, cards NOT clickable (conversion+SEO loss).
- **Varianti**: 5 — grid / list / zig-zag alternated / accordion (many services) / tabs (categories); ADD optional href per item + micro-CTA
- **Preset**: grid=all, zig-zag=Meridian/Nova/Terra, accordion=Atelier/Meridian, tabs=Nova

### FeatureHighlight (EXISTS left/right)  · priorità P2
- **Scopo**: Alternated media+text spotlight on a flagship service/value with bullets + CTA. Today uses ✓ emoji bullets — replace with Icon.
- **Varianti**: 3 — left / right / NEW full-color-bg
- **Preset**: Meridian, Nova, Terra

### ProcessSteps (EXISTS single, gap variants)  · priorità P1
- **Scopo**: Show 'how we work' in 3-5 low-friction steps to reduce purchase anxiety. Today one 4-col numbered layout only.
- **Varianti**: 3 — vertical timeline / horizontal numbered / icon steps
- **Preset**: timeline=Meridian, numbered=Atelier/Nova, icon=Nova/Terra

### About / Storia (NEW — gap)  · priorità P1
- **Scopo**: Who we are: history, years active, local roots, owner's face. Trust + proximity, decisive for local/family firms.
- **Varianti**: 2 — text+image (owner/jobsite) / with company timeline
- **Preset**: Meridian, Terra, Canon; Atelier in text-only form

### Team (NEW — gap)  · priorità P2
- **Scopo**: Faces, roles, qualifications — humanizes who enters the home/jobsite.
- **Varianti**: 2 — card grid / single featured owner
- **Preset**: Meridian, Terra, Vita

### WhyChooseUs / Differenziatori (EXISTS)  · priorità P2
- **Scopo**: Distinct reasons to choose (benefit + icon). Today uniform icon-top card grid.
- **Varianti**: 2 — icon card grid / 2-col with image
- **Preset**: All

### ComparisonTable / Noi vs Altri (NEW — gap)  · priorità P2
- **Scopo**: Checklist comparison defending price (us vs typical competitor vs DIY).
- **Varianti**: 2 — 2-col checklist (us/them) / 3-col tiered table
- **Preset**: Meridian, Nova

### Gallery / Portfolio (EXISTS grid/masonry, extend)  · priorità P1
- **Scopo**: Visual proof of work — strongest lever for edilizia. Today grid (square) / masonry with hover caption.
- **Varianti**: 4 — grid / masonry / category-filtered / carousel+lightbox
- **Preset**: grid=all, masonry=Nova/Terra, filtered=Meridian/Nova

### BeforeAfter / Prima-Dopo slider (NEW — CRITICAL gap)  · priorità P0
- **Scopo**: Interactive before/after compare — the single most persuasive proof for ristrutturazioni/facciate/restauri/efficientamento. Biggest sector-level gap.
- **Varianti**: 2 — single large slider / grid of sliders
- **Preset**: All (drag-handle for Nova/Vita, static 2-col for Atelier/Canon)

### CaseStudy / Progetto in dettaglio (NEW — gap)  · priorità P2
- **Scopo**: One project told as challenge→solution→result with numbers + photos. Depth the Gallery can't give.
- **Varianti**: 2 — single featured case / list of mini-cases
- **Preset**: Meridian, Nova

### Certifications / Certificazioni & Albi (NEW — CRITICAL gap)  · priorità P1
- **Scopo**: Licenses, albo, technical qualifications (F-Gas, ESCo, SOA, patentini), insurance. Reduces perceived risk — decisive in regulated edilizia/energia.
- **Varianti**: 2 — badge/logo row / grid with cert description
- **Preset**: Meridian, Nova, Atelier (logo row)

### Incentivi / Detrazioni fiscali (NEW — CRITICAL IT gap)  · priorità P1
- **Scopo**: Accurately explain Ecobonus / ristrutturazioni 50% / Conto Termico / sconto-in-fattura as buying lever + competence proof.
- **Varianti**: 2 — bonus summary cards / simple savings estimator
- **Preset**: Meridian, Nova

### Guarantees / Garanzie (NEW — gap)  · priorità P1
- **Scopo**: Risk-killing promises: work warranty, insurance, free survey, on-time, satisfaction. Great substitute when reviews/certs are thin.
- **Varianti**: 2 — guarantee badge row / icon+explanation cards
- **Preset**: All

### ServiceArea / Zona + Mappa (NEW — gap)  · priorità P2
- **Scopo**: Served towns/zones + map: local trust, 'near me / a [città]' SEO, disqualifies out-of-area leads.
- **Varianti**: 2 — city/quarter list / map with action radius
- **Preset**: Meridian, Nova

### Pricing / Pacchetti (NEW — gap)  · priorità P2
- **Scopo**: Price list / 'a partire da' packages with inclusions: transparency + lead qualification.
- **Varianti**: 2 — 3-tier columns / service-price table
- **Preset**: Atelier, Meridian, Nova

### Testimonials (EXISTS single, gap variants)  · priorità P1
- **Scopo**: Social proof quotes (problem→change, real name+city). Today one card grid with 5 hardcoded identical stars.
- **Varianti**: 4 — grid / carousel / featured single+photo / video; FIX star component (half/empty)
- **Preset**: grid=all, carousel=Meridian/Nova, featured=Nova, video=Nova

### GoogleReviews / Recensioni Google (NEW — gap)  · priorità P2
- **Scopo**: Google rating badge (stars + count) and/or imported reviews — high-trust third-party proof distinct from manual testimonials.
- **Varianti**: 2 — compact badge (rating+count) / review grid with avatar+date
- **Preset**: All

### FAQ (EXISTS single, gap variants)  · priorità P1
- **Scopo**: Kill objections (cost, time, disruption, permits, warranty, zone) before CTA. Today asymmetric 2-col details/accordion — good base; add FAQPage schema.
- **Varianti**: 3 — accordion (default) / two-column / categorized by theme
- **Preset**: accordion=all, two-col=Meridian, categorized=Nova

### CTABanner intermedio (NEW — gap)  · priorità P1
- **Scopo**: Slim mid-page conversion band after first proof to re-catch intent. Today only the final ContactCTA exists — mid-scroll cadence missing (best practice: same CTA >=3x).
- **Varianti**: 2 — text+button on color bg / with phone+WhatsApp
- **Preset**: All

### ContactCTA / Contatti + Form (EXISTS, gap variants)  · priorità P0
- **Scopo**: Final conversion: form + reassurance + direct contacts. Today form is non-functional (onsubmit=return false), no validation/honeypot/success state, no GDPR consent.
- **Varianti**: 3 — form / form+contacts+map / contacts-only (phone+WhatsApp); ADD validation, honeypot, success state, GDPR consent, reassurance by submit
- **Preset**: All

### Footer (EXISTS, gap variants)  · priorità P1
- **Scopo**: Close with NAP, links, legal. Today 4-col with social/columns/contacts + generic '© Tutti i diritti riservati'.
- **Varianti**: 2 — simple (1 row + legal) / rich (NAP, hours, mini-map, service links, social)
- **Preset**: simple=Atelier/Canon, rich=Meridian/Nova/Terra

### StickyCTA mobile (NEW — CRITICAL conversion gap)  · priorità P0
- **Scopo**: Fixed bottom bar on mobile (Call / WhatsApp / Preventivo) always thumb-reachable. Most local traffic is mobile.
- **Varianti**: 2 — dual (Call+WhatsApp) / single Preventivo CTA
- **Preset**: All (functional, adopts palette)

### Newsletter / Lead magnet (NEW — low priority)  · priorità P2
- **Scopo**: Newsletter signup / lead-magnet download to nurture not-yet-ready leads.
- **Varianti**: 1 — inline band with email field
- **Preset**: Meridian, Nova, Vita

### VideoIntro / Video (NEW — optional)  · priorità P2
- **Scopo**: Company/jobsite/owner-interview video for engagement + trust. Only with good footage.
- **Varianti**: 2 — embed with poster / split video+text
- **Preset**: Nova, Meridian

## 5. Critica della libreria attuale (da elevare)

1. ARCHITECTURE (root cause): @theme in global.css tokenizes ONLY color + font; --radius-card:1rem is the only shape token and it's fixed. All other 'form' decisions are hardcoded in components (Button rounded-full + shadow-lg shadow-primary/25; cards border-ink/5 + hover:shadow-xl; Hero overlay from-ink/85; reveal 0.6s ease in Base.astro <style>; sectionPad 'py-20 md:py-28' in lib/ui.ts). Result: you cannot change aesthetic without editing markup — so every generated site looks the same. FIX: promote radius/shadow/motion/border/space/type-ratio to --brand-* tokens surfaced through @theme, add a data-preset attribute on <html>, and keep client colors injected inline LAST so client brand always wins (inline > [data-preset] > :root).
2. Button.astro / lib/ui.ts ctaClass: EVERY button is rounded-full pill + shadow-lg shadow-primary/25 + hover:brightness-110 + hover:-translate-y-0.5, with no active/disabled states and duration-200 hardcoded. Tells: universal pill + single shadow + snap-ish hover. FIX: rounded-[var(--radius-pill)], shadow-[var(--shadow-cta)], duration-[var(--brand-dur-base)] ease-[var(--ease-brand)], full primary/secondary/tertiary hierarchy with all states; pill only where the preset's radius system says so (Atelier/Meridian/Canon must NOT be pills).
3. Hero.astro: only A/B/C; variant A overlay is a fixed from-ink/85 via-ink/55 gradient and the eyebrow is a white/15 backdrop-blur pill in all cases; badges use a literal ✓ emoji (text-accent). Missing: minimal no-image, split+inline form, video, stat-anchored. FIX: extract .hero-overlay + .eyebrow classes re-skinned per preset; replace ✓ emoji with Icon name='check'; add variants.
4. Services.astro: cards are non-clickable (no href in schema), uniform rounded-card border-ink/5 hover:-translate-y-1 hover:shadow-xl — identical card grid = the #1 AI-slop tell. Column logic is naive (items%3). No zig-zag/accordion/tabs, no per-card micro-CTA. FIX: add optional href+ctaLabel to schema, introduce .surface-card class, add bento/zig-zag variants, vary density.
5. TrustBar.astro: static value/label only, navy number — fine but flat. Missing animated count-up Stats variant and any source/proof slot (numbers read as self-declared). FIX: add Stats variant with count-up + context line + optional 'fonte' note.
6. ValueProp.astro: value-led only; numbered circle bg-primary/10 — there is NO Problem/Agitation step anywhere in the library (PAS funnel incomplete). Variant B centers everything (center-align tell). FIX: add ProblemAgitation section; default ValueProp to left-aligned.
7. ProcessSteps.astro: single layout (centered heading + 4-col numbered circles with shadow-lg shadow-primary/25), no real timeline, no per-step timing, no closing micro-CTA. FIX: add timeline + icon variants, allow real durations per step, add end CTA.
8. Gallery.astro: grid/masonry with hover-only caption (caption invisible until hover = poor on mobile/touch, accessibility gap). Categories not filterable; no before/after; no project metadata (place/duration/type) so it reads as stock. FIX: persistent captions on touch, add filtered + lightbox variants, add BeforeAfter as a separate critical section, enrich Gallery items with place/scope.
9. Testimonials.astro: renders 5 identical filled stars for every quote regardless of rating, no photo, no date, no source — reads as invented. No carousel/featured/video variants, no Google Reviews. FIX: real rating component (half/empty), optional avatar+date+source badge, add GoogleReviews section.
10. FAQ.astro: solid asymmetric 2-col details/accordion (actually one of the better sections) but emits no schema.org FAQPage and has a single layout. FIX: add JSON-LD FAQPage, add two-column/categorized variants.
11. ContactCTA.astro: the form is FAKE — onsubmit='return false', no name/action, no validation, no honeypot, no success state, no GDPR consent checkbox, no reassurance microcopy next to submit, hardcoded Italian button label ignoring props. This is the primary KPI and it doesn't capture leads. FIX: real submit endpoint/handler, inline validation, honeypot, success state, GDPR consent + privacy link, '/Ti ricontattiamo entro 24h, nessun impegno' by the button.
12. Footer.astro: generic '© {businessName}. Tutti i diritti riservati.' (English-template smell), no NAP completeness enforcement (P.IVA/address optional and often empty), no hours, no map, no Google Business link, social labels plain text not icons. FIX: enforce NAP via schema, add hours+map+GBP, rich vs simple variants, LocalBusiness JSON-LD.
13. Header.astro: solid only with bg/80 backdrop — no transparent-over-hero (despite schema enum), no centered-logo, no utility topbar, phone hidden below sm. FIX: implement transparent variant properly, add centered + topbar variants, surface phone earlier.
14. Icon.astro: raw Lucide-style stroke set with sparkles fallback (the default-icon tell) and emoji used elsewhere (✓ in Hero/FeatureHighlight). Single stroke-width 2, no optical sizing per preset. FIX: ban all emoji-as-icon (replace with Icon), give the set a coherent customized stroke/size, allow preset-specific weight; never one-icon-per-row decoration.
15. Base.astro: reveal animation hardcoded (translateY 16px / 0.6s ease, threshold 0.1) for all presets; Google Fonts href hardcodes weights 400-800 for both families (over-fetching) and has no mono support. FIX: read --brand-dur-slow/--ease-brand for reveal; load only preset-declared weights/axes + brand.fonts.mono.
16. SYSTEMIC: no 'aesthetic' axis (minimal/professional/futuristic/editorial/artisanal) and no 'sector' axis (incentivi/certificazioni/before-after/zona). The library can't deterministically assemble a coherent-by-taste site. FIX: add aesthetic tag per variant + data-preset, and add the sector-specific sections.

## 6. Build Plan

1. PHASE 0 — Token contract refactor (unblocks everything, do FIRST). In global.css @theme add: --font-mono, --radius-card/--radius-input/--radius-pill, --shadow-card/--shadow-cta/--shadow-float, --ease-brand, --tw-duration, and space/type tokens (--brand-space, --brand-type-ratio). Define the full --brand-* default block in :root. Add data-preset attribute writing in Base.astro, ordered: (a) data-preset, (b) preset's --brand-* block, (c) client colors injected inline LAST. Build the type scale (--step-* via clamp) and --section-pad:calc(...*var(--brand-space)). Acceptance: changing only data-preset + token block visibly restyles the sample page with zero markup edits.
2. PHASE 1 — Refactor existing components to read tokens + extract semantic classes (one-time). Button → rounded-[var(--radius-pill)] + shadow-[var(--shadow-cta)] + all states. Replace sectionPad string with .section-pad reading --section-pad. Introduce .surface-card, .hero-overlay, .eyebrow, .section-divider, .media classes and swap them into Hero/Services/ValueProp/WhyChooseUs/Testimonials/Gallery/FeatureHighlight (remove hardcoded border-ink/5, shadow-xl, from-ink/85). Replace every ✓ emoji with Icon. Make reveal in Base.astro read motion tokens. Acceptance: existing sample renders identically under Meridian default, AA contrast holds.
3. PHASE 2 — Author the 6 presets as token blocks + [data-preset] CSS branches (Atelier, Meridian, Nova, Canon, Terra, Vita). Add preset-specific re-skins for .surface-card/.hero-overlay/.eyebrow/.section-divider/.media. Extend Base.astro font loader to pull brand.fonts.mono + only the weights/axes each preset declares. Acceptance: the same sample site looks genuinely different (flat-hairline / authoritative / dark-glass / serif-rules / earthy / friendly) by swapping data-preset only.
4. PHASE 3 — Fix conversion-critical existing sections (P0). Make ContactCTA form REAL: action/endpoint, inline validation, honeypot, success state, GDPR consent + privacy link, reassurance microcopy; stop hardcoding the button label. Build StickyCTA mobile (Call/WhatsApp/Preventivo). Implement Header transparent + centered + topbar variants. Add per-item href + micro-CTA to Services. Acceptance: a lead can actually be submitted; mobile has persistent call/WhatsApp.
5. PHASE 4 — Build the critical NEW proof/trust sections (biggest anti-slop ROI). BeforeAfter slider (P0), Certifications (P1), Incentivi/Detrazioni (P1), Guarantees (P1), LogoPartnerBar (P1), GoogleReviews + Testimonials rating fix (P1), About/Storia (P1), ProblemAgitation PAS (P1). Each: Zod schema entry + discriminated-union member + registry mapping + aesthetic tags + JSON-LD where relevant (Review, LocalBusiness, FAQPage). Acceptance: a site can show real, specific, third-party-verifiable proof — the single upgrade that kills the 'AI slop' verdict.
6. PHASE 5 — Expand variants on existing sections (P1). Hero (+minimal/split-form/video/stat), Services (+zig-zag/accordion/tabs), ProcessSteps (+timeline/icon), Testimonials (+carousel/featured/video), Gallery (+filtered/lightbox, persistent captions), FAQ (+two-col/categorized + schema), Footer (simple vs rich NAP+map+hours), TrustBar (+animated Stats), CTABanner intermedio. Acceptance: each section has the variant set in the spec, each tagged by aesthetic.
7. PHASE 6 — Secondary sections + polish (P2). QuoteForm, Team, ComparisonTable, CaseStudy, ServiceArea+map, Pricing, AnnouncementBar, Newsletter, VideoIntro. Add premium-detail layer globally: layered tinted shadows, 1px hairlines, SVG grain overlay (3-6%), eyebrow/section-index editorial details, ::selection + link underline polish. Acceptance: every section passes the anti-slop rubric at 0-1 tells.
8. PHASE 7 — Hardening & governance. Wire the antiSlopRubric as an automated QA checklist (lint copy for banned phrases/superlatives, assert no emoji-as-icon, assert AA contrast, assert alt text present). Run Lighthouse (target 95+), validate astro:assets AVIF/WebP + explicit dimensions, confirm prefers-reduced-motion across expressive presets, emit structured data per section. Document copy guidelines (numbers+proof, no parallel slogan triplets, human voice). Acceptance: a freshly generated client site scores Lighthouse 95+, AA, 0-1 slop tells per section, and reads bespoke.
