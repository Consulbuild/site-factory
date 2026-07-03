---
target: golden path index (conversione-locale-v1)
total_score: 29
p0_count: 1
p1_count: 2
timestamp: 2026-07-03T11-53-59Z
slug: src-pages-index-astro
---
# Critique + Audit — src/pages/index.astro (golden path conversione-locale-v1)
Method: dual-agent (A: design review · B: detector + audit tecnico)

## Audit Health Score
| # | Dimensione | Score | Finding chiave |
|---|-----------|-------|----------------|
| 1 | Accessibilità | 3 | Struttura ottima (label, alt, focus-visible) ma manca <main>/skip-link e 15 target touch <44px a 390px |
| 2 | Performance | 3 | Lazy/fetchpriority ok; manca preconnect a images.unsplash.com; 12/12 img senza dimensioni HTML riservate |
| 3 | Responsive | 2 | Zero overflow, ma nav assente sotto 768px (niente hamburger) e target touch sistematicamente piccoli |
| 4 | Theming | 3 | 0 colori hardcoded; però text-white/* ×21 bypassa i token inverse-ink; padding sezione derivati (py-16/20/24) |
| 5 | Anti-pattern | 3 | Detector: solo em-dash-overuse (13, in parte grammatica voluta). Occhio umano: foto Unsplash riconoscibili, pattern meccanico, copy ripetuto |
| **Totale** | | **14/20** | **Good — indirizzare le dimensioni deboli** |

## Design Health Score (Nielsen)
| # | Euristica | Score | Problema chiave |
|---|-----------|-------|-----------------|
| 1 | Visibilità stato | 2 | Submit form muto (onsubmit=return false), stati success/error/loading non progettati |
| 2 | Match mondo reale | 4 | Copy concreto (CILA/SCIA, 8–12 settimane) |
| 3 | Controllo utente | 3 | Nav sparisce su mobile; pagina 11k px senza scorciatoie |
| 4 | Coerenza | 4 | Token e grammatica rigorosi |
| 5 | Prevenzione errori | 2 | Nessun consenso GDPR sul form; privacy link → "#" |
| 6 | Riconoscimento | 4 | Label visibili, tutto in pagina |
| 7 | Flessibilità | 3 | Tap-to-call assente nell'header mobile (caso primario!) |
| 8 | Estetica minimalista | 3 | Finale ridondante: contatti ripetuti 4 volte |
| 9 | Recupero errori | 1 | Zero stati di errore progettati |
| 10 | Aiuto/doc | 3 | FAQ ottima; legali finti (#) |
| **Totale** | | **29/40** | **Good** |

## Verdetto anti-pattern
Non sembra AI al primo sguardo (disciplina sui tell classici); al secondo sguardo tre tell: foto Unsplash riconoscibili/fuori contesto (villa australiana per "Ristrutturazioni complete"), pattern meccanico (7/7 titoli con una frase accent, eyebrow ovunque senza variazione), copy che si auto-ripete (subtitle Services ≈ subtitle Process; "chiavi in mano" ×2). Detector deterministico: 1 finding (em-dash-overuse, 13 occorrenze — in parte è la grammatica eyebrow voluta).

## Problemi prioritari
1. [P0] Form senza feedback né stati progettati (ContactCTA.astro) — il momento di conversione oggi è un click morto; serve la spec dei 3 stati (loading/success/error) + stato demo dietro flag.
2. [P1] GDPR assente + legali "#" accanto a promesse di riservatezza — non conforme per PMI italiane; checkbox consenso + pagine legali generate dalla pipeline.
3. [P1] Header mobile senza tap-to-call né nav (hidden md/lg) — il caso primario (mobile da ads, call-first) non ha il canale a minor attrito sticky.
4. [P2] Touch target <44px sistemici (footer h=14, contatti h=28, CTA header 37px).
5. [P2] Gallery mobile = tunnel ~2.300px di foto impilate a metà funnel.
6. [P2] Copy pipeline senza dedupe lessicale tra sezioni (il tell AI più forte).

## Red flag persone
- Jordan: zero prova sociale umana nel golden path (Testimonials in libreria ma fuori); foto stock riconoscibili; privacy link morto.
- Casey: 13 schermate senza nav/hamburger; niente tap-to-call header; brand mobile = solo monogramma.
- Riley: submit → nulla (verdetto "rotto"); legali → salto a inizio pagina; reverse-image-search trova le foto ovunque.

## Osservazioni minori
FAQ subtitle hardcoda "cinque domande" (fragile se pipeline genera 4/6); strip canali finale ripete contatti per la 4ª volta (anticlimax picco-fine); didascalie gallery fredde ("Rifacimento bagno" vs "Appartamento 90mq · Prati · 10 settimane"); nessun aria-live previsto per i futuri stati form; export screenshot sales-deck mostrerà buchi lazy-load.

## Domande
1. Che piano c'è per foto demo credibilmente italiane (il principio "prova prima della promessa" muore con foto trovabili su 400 siti)?
2. Perché il golden path non ha una sola voce umana? L'intake Tally dovrebbe pretendere recensioni?
3. Tre rilanci di contatto negli ultimi quattro fold: conversione o ansia? Chiudere sul banner?
