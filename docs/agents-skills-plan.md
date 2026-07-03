# Site-factory — Specialized Agents & Skills Plan

> Status: **SKILLS PRODUCTION-READY (allineate a `schema.ts`)** — Section Architect dropped; 3 skills (Copy · Palette · Image) fine-tuned (2 A/B round, 2 industrie) e **allineate al contratto del renderer**; output assemblato validato da `site-renderer/scripts/validate-site.ts` (Zod → VALID) + gate WCAG. 3 agent wrapper. Report: `docs/evals/fine-tuning-report.md`.
> Decisions locked: research+plan first · custom-authored skills · Italian-only copy · image agent does prompts **and** API calls · image models = **FLUX.2 [pro]/[max] only**.

---

## 1. Context

You are building a **custom editor that automates your web-agency pipeline** for small Italian local-service businesses (edilizia / ristrutturazioni / energia — e.g. the reference sites `designprojectroma.it`, `newfutureservice.it`, `ssccostruzionisrls.it`). Generated sites are **Astro + Tailwind**; the editor app is **Next.js**; hosting **Cloudflare**, analytics **Umami**, intake **Tally** (webhook + API → feeds the editor, no copy-paste). GHL is being dropped (visual reference only).

The site model is a repeatable section library: **Hero · Value Prop/Pain · Services · Process · Gallery · Stats · Testimonials · FAQ · Contact+CTA · Footer**.

This plan equips your **4 pipeline agents** with one **custom-authored skill each**, so every agent is a narrow specialist instead of a generalist. Goal: higher, more consistent output quality and a clean hand-off chain with your planned user checkpoints between stages.

---

## 2. What the research changed (read this first)

Findings from live research (June 2026) + your decision:

1. **FLUX.2 only — no Google lane (your decision).** We use **FLUX.2 [pro] and [max]**, nothing else. This also sidesteps a real trap: Google is retiring Imagen 4 (shutdown **Aug 17 2026** Gemini API; **June 24 2026** Firebase, already past), so dropping it avoids building on a dying model. (If a Google option is ever wanted later, the successor is **Nano Banana** / `gemini-3.1-flash-image` — out of scope now.)

2. **"Flux 2 Ultra" doesn't exist by that name.** The line is **FLUX.2 [pro]** (flagship workhorse, ~$0.03/MP) and **FLUX.2 [max]** (top fidelity — the de-facto "ultra", ~$0.07/MP). We map your "pro/ultra" to **[pro]** (default) and **[max]** (hero/quality shots). ([flex]/[dev]/[klein] exist but are out of scope.)

3. **Provider: go DIRECT to Black Forest Labs (recommended, given FLUX.2-only).** The earlier fal.ai recommendation existed to unify *two* providers (Google + BFL) under one key. With FLUX.2-only that rationale is gone — **BFL's own API is a single provider, single key**, with full FLUX.2 features (raw mode, fine-tuning, guaranteed rate limits) at the per-MP prices below. fal.ai / Replicate / Together remain an optional convenience (nice SDK, queueing, retries) at ~0% markup if preferred. **Default recommendation: BFL direct.**

| Model | Role in pipeline | ≈ price/image | Where |
|---|---|---|---|
| FLUX.2 [pro] | Default workhorse (most sections) | ~$0.03 / 1 MP | BFL API (or fal.ai) |
| FLUX.2 [max] | Hero & premium quality shots | ~$0.07 / 1 MP | BFL API (or fal.ai) |

---

## 3. The four agents and their custom skills

Each agent is a thin `.claude/agents/*.md` wrapper (role + tools + "always use your skill"); each skill is the reusable knowledge unit in `.claude/skills/<name>/SKILL.md`. Listed in **pipeline order** (not the order you named them).

### 3.1 Section Architect — skill `section-architect`
**Job:** read the Tally brief, **select** which library sections to include, **order** them for conversion, and emit the first-draft page skeleton the other agents fill.
**Skill encodes:**
- **Canonical conversion order:** Hero → Value/Pain → Services → Process → Gallery → Stats → Testimonials → FAQ → Contact+CTA → Footer (Problem→Solution→Proof→Offer→CTA flow).
- **Conditional inclusion rules** (omit empty sections, never render half-empty blocks):
  - Gallery only if ≥4–6 usable photos; Testimonials only if ≥1–3 reviews (else swap in a certifications/trust band); Stats only if real numbers exist; Process only if a workflow is described; FAQ only if ≥3 Q&A; Services grid if ≥3 services, simple layout if 1–2. Hero / Value / Contact / Footer always.
- **CTA cadence:** same primary CTA ≥3× (hero, mid-page after first proof, final) + sticky mobile CTA; social proof placed *before* the scroll and *before* CTAs.
- **Astro assembly pattern:** output an ordered, pre-filtered descriptor array `[{ type, props }]`; render via a **static component registry** (`{ hero: Hero, services: Services, … }`) — the Astro-idiomatic approach (static map > dynamic `import()`).
**Input:** Tally brief (services, assets, reviews, numbers, workflow). **Output:** ordered `sections[]` skeleton + which props each downstream agent must fill.

### 3.2 Palette Designer — skill `palette-designer`
**Job:** choose/derive one cohesive, **accessible** palette for the whole site and emit it as Tailwind v4 tokens.
**Skill encodes:**
- **Industry hue map:** construction/renovation → **blue primary + steel-gray neutrals + warm amber/orange accent**; solar/energy → **green or blue primary + green secondary + yellow accent**. Red reserved for the error semantic only.
- **Palette roles:** 1 primary (from logo if available, else industry default) + 1 secondary + 1 accent (analogous base + one complementary CTA pop) + neutral gray scale + 4 semantic (success/warning/error/info). ~5–7 base hues → ~50–80 values. **60-30-10** usage rule.
- **Scales in OKLCH**, 11 steps (50–950), vary lightness (taper chroma at extremes) for perceptually even ramps.
- **Accessibility gates (hard pass/fail):** WCAG **AA** — body text **4.5:1**, large text & UI components **3:1**; aim **AAA 7:1** for body where feasible. Button text vs fill ≥4.5:1, fill vs surface ≥3:1, focus ≥3:1. Verify with `culori.wcagContrast()` (the lib Tailwind v4 uses) before emitting.
- **Tailwind v4 output:** CSS-first `@theme { --color-*: oklch(...) }` with **3 token layers** — primitive scales → semantic role aliases (`--color-primary/surface/text/border/...`) → optional component tokens. Light/dark = two semantic overrides; sections only consume semantic utilities, so each site is re-skinnable by swapping primitives.
**Input:** brand color/logo + industry. **Output:** one contrast-verified `theme.css` (`@theme` + semantic layer).

### 3.3 Copywriter — skill `local-service-copywriter`
**Job:** write **Italian**, specific, concise, non-generic, conversion-optimized copy for every selected section.
**Skill encodes:**
- **Frameworks:** AIDA at page level, **PAS** for the pain/value section (high-intent, pain-aware local buyer), **FAB** for services/process; **4 U's** as a headline QA checklist; **"So what? / which means that…"** to force features → benefits.
- **Per-section rules:** Hero = outcome-led headline 5–10 words (**service + outcome + città/garanzia/tempi**) + supporting subhead + **ONE** primary CTA above the fold + phone + one trust badge. Services = benefit-led cards (scope→detail→timeline). Process = 3–5 plain low-friction steps. Stats = exact verifiable numbers ("147 cantieri" > "oltre 100"). Testimonials = problem→change, real name+città. FAQ = objection killers (costo, tempi, disagi, permessi, garanzie, zona). Contact = restate free/no-obligation offer.
- **Anti-generic gate:** every line must fail the **"could this describe any competitor?"** test; replace adjectives with numbers/materials/%/timelines/guarantees. **Banned filler:** *qualità, i migliori, leader del settore, professionalità e serietà, soluzioni su misura, passione, da anni al vostro fianco*, weasel words (*fino a, può, generalmente* used to dodge facts).
- **Italian register:** formal-but-warm **noi / voi-Lei**, consistent throughout (trust-sensitive, often older, higher-ticket audience); plain Italian, no jargon/anglicisms.
- **Local SEO baked in:** service + città in H1/title/intro; "vicino a me" / "a [città]" patterns; NAP consistent with Google Business Profile; per-città pages 40–60% unique. Energy services: reference real incentivi/detrazioni accurately but lead with the human outcome (bolletta più bassa, comfort).
- **CTA:** one goal, value-led button copy ("Richiedi preventivo gratuito", "Chiama ora"), repeated 3–5×, no competing CTAs.
**Input:** brief + `sections[]` skeleton + business facts. **Output:** copy object per section, slotted into component props.

### 3.4 Image Prompt Generator — skill `image-prompt-generator`
**Job:** pick the model ([pro] vs [max]), **write the optimized prompt**, **call the BFL API**, return images + Italian alt text.
**Skill encodes:**
- **Model selection (FLUX.2 only):** **[pro]** = default workhorse for most sections; **[max]** = hero + premium/quality shots where fidelity matters most. No other models.
- **Prompt craft (FLUX.2):** flowing descriptive **prose** (creative brief, not keyword lists); **Subject + Action + Style + Context** with the most important element **first** (FLUX.2 weights the opening heavily); text in "quotes"; **bind palette hex to objects** ("the sign is #1E40AF") for brand consistency; multi-reference (up to 8 imgs) for character/style consistency; supports **JSON structured prompts** for repeatable production; phrase negatives positively ("empty scene", not "no people").
- **Brand consistency:** inject the site palette hex + style descriptors from the Palette agent into every prompt; keep a per-site style seed/reference set so all images on a site look like one shoot.
- **Aspect ratios per section:** Hero 16:9, Gallery 4:3/1:1, Process icons square, etc.
- **API integration (BFL):** one `BFL_API_KEY` (or `FAL_KEY` if you opt for fal.ai), per-MP cost-aware tier choice ([pro] vs [max]), retries/backoff on the async job poll; output = image file/URL + the exact prompt used + **Italian alt text** (accessibility + local SEO).
**Input:** section + visual brief + palette + business context (industry, città). **Output:** images + prompts + alt text per image-bearing section.

---

## 4. Pipeline order & checkpoints

```
Tally brief ─▶ [1] Section Architect ─▶ ✔ checkpoint (skeleton OK?)
                 ∥ [2] Palette Designer ─▶ ✔ checkpoint (palette OK?)
                          ▼
              [3] Copywriter ─────────▶ ✔ checkpoint (copy OK?)
                          ▼
              [4] Image Prompt Gen ────▶ ✔ checkpoint (images OK?)
                          ▼
              Assemble Astro site ─▶ deploy (Cloudflare)
```
Architect and Palette are independent → run in parallel. Copy needs the skeleton; Images need skeleton + palette (+ copy context for relevance). A user checkpoint sits between every stage, matching your approval-gated design.

---

## 5. Files to create (build phase, after approval)

```
.claude/
  agents/
    section-architect.md      image-prompter.md
    palette-designer.md       copywriter.md
  skills/
    section-architect/SKILL.md
    palette-designer/SKILL.md
    local-service-copywriter/SKILL.md
    image-prompt-generator/SKILL.md
```
Each agent = role + allowed tools + "always invoke your dedicated skill." Skills stay reusable (the main editor agent can call them directly too). I'll also add a short `docs/` note on the shared brief schema (the JSON contract the 4 agents pass down the chain) so hand-offs are typed and lossless.

---

## 6. Open items to unblock the BUILD phase

1. ~~Image models~~ — **RESOLVED: FLUX.2 [pro] + [max] only.** Just confirm the **provider**: BFL direct (recommended) vs fal.ai/Replicate/Together convenience layer.
2. **Provide the API key** for the chosen provider (`BFL_API_KEY` for BFL direct, or `FAL_KEY` for fal.ai) as an env var, and approve a permission entry for that endpoint in `settings.local.json`.
3. Confirm whether the **brief schema** should follow your Tally form fields exactly (share the Tally fields) or a normalized schema I define.

---

## 7. Verification (once built)

- **Per skill, dry-run a sample brief** (use one reference site, e.g. a fictional ristrutturazioni firm in Roma): Architect emits a sensible ordered skeleton; Palette emits a `theme.css` whose every text/CTA pair passes `culori.wcagContrast()` ≥ 4.5:1 / 3:1; Copywriter output passes the "could-describe-any-competitor?" and banned-words checks; Image agent returns a real image + prompt + Italian alt text from fal.ai.
- **End-to-end:** run all four on the sample brief through the checkpoints and assemble a single Astro page via the static registry; visually confirm in the browser (claude-in-chrome) and re-run the contrast gate on the rendered page.
