# Oracolo di test — brief cliente + rubriche di valutazione

Fixture per l'A/B testing dei 3 agent (Copywriter, Palette, Image-prompt).
Dati **fittizi ma realistici**, nel formato normalizzato che arriverà da Tally.

---

## Brief A — primario (edilizia/ristrutturazioni, Roma)

```json
{
  "azienda": "RomaRistruttura S.r.l. (fittizia, di test)",
  "settore": "ristrutturazioni edili residenziali chiavi in mano",
  "citta": "Roma",
  "zone_servite": ["Roma città", "Prati", "Aurelio", "Monteverde", "EUR", "provincia di Roma"],
  "anni_attivita": 18,
  "cantieri_completati": 214,
  "squadra_persone": 12,
  "servizi": [
    "Ristrutturazione completa di appartamenti chiavi in mano",
    "Rifacimento bagni e cucine",
    "Cappotto termico ed efficientamento energetico",
    "Rifacimento impianti elettrici e idraulici",
    "Cartongesso, controsoffitti e finiture"
  ],
  "usp": [
    "referente unico di cantiere",
    "preventivo dettagliato e gratuito",
    "rispetto dei tempi concordati",
    "cantiere pulito e ordinato",
    "garanzia 5 anni sulle opere"
  ],
  "processo": ["Sopralluogo gratuito", "Preventivo dettagliato", "Progetto e cronoprogramma", "Cantiere con referente unico", "Consegna e garanzia"],
  "prove": {
    "recensioni_google": { "numero": 47, "media": 4.8 },
    "foto_cantieri_disponibili": 22,
    "testimonianze": [
      { "nome": "Marco T.", "zona": "Prati", "testo": "Ristrutturato il nostro trilocale in 9 settimane, tempi rispettati e un solo referente per tutto." },
      { "nome": "Giulia R.", "zona": "EUR", "testo": "Bagno rifatto senza sorprese sul preventivo, cantiere sempre pulito." },
      { "nome": "Fam. De Santis", "zona": "Monteverde", "testo": "Cappotto termico e nuovi infissi: bolletta scesa e casa più calda." }
    ]
  },
  "certificazioni": ["Attestazione SOA cat. OG1", "Assicurazione RC opere", "P.IVA fittizia 01234567890"],
  "incentivi": ["Bonus Ristrutturazione 50% prima casa / 36% altri immobili", "supporto alla pratica di detrazione"],
  "brand": { "colore_logo": "nessun logo fornito", "note": "nessuna preferenza cromatica del cliente" },
  "contatti": { "telefono": "+39 06 1234567", "email": "info@romaristruttura.example", "orari": "Lun–Ven 8:30–18:30" },
  "tono_preferito": "professionale, rassicurante, concreto",
  "obiettivo": "generare richieste di preventivo (lead) organiche"
}
```

## Brief B — generalizzazione (energia/solare, riservato allo Step 5)

```json
{
  "azienda": "SoleSud Impianti (fittizia, di test)",
  "settore": "fotovoltaico e pompe di calore per abitazioni",
  "citta": "Bari",
  "zone_servite": ["Bari", "Bitonto", "Modugno", "provincia di Bari"],
  "anni_attivita": 9,
  "impianti_installati": 380,
  "servizi": ["Fotovoltaico residenziale con accumulo", "Pompe di calore", "Comunità Energetiche (CER)", "Manutenzione e monitoraggio"],
  "usp": ["preventivo con simulazione risparmio", "chiavi in mano dalla pratica GSE all'allaccio", "assistenza post-installazione"],
  "prove": { "recensioni_google": { "numero": 63, "media": 4.9 }, "foto_impianti_disponibili": 15, "testimonianze": [] },
  "certificazioni": ["Installatore certificato FER", "Partner produttori moduli"],
  "incentivi": ["Detrazione ristrutturazione", "CER e bandi regionali Puglia"],
  "brand": { "colore_logo": "verde", "note": "cliente vuole trasmettere sostenibilità" },
  "obiettivo": "richieste di sopralluogo/preventivo"
}
```

---

## Rubriche pass/fail (oracolo di valutazione)

Ogni voce è **PASS/FAIL**. "Produttivo" = tutte le voci PASS, con al più rilievi soggettivi minori.

### R1 — Copywriter (`local-service-copywriter`)
1. **Lingua/registro**: italiano corretto; registro formale-caldo (voi/Lei) **coerente ovunque**. FAIL se mischia tu/voi o usa anglicismi evitabili.
2. **Anti-generico**: nessuna frase supera il test "potrebbe stare sul sito di un qualsiasi concorrente?". Lista nera vietata: *qualità, i migliori, leader del settore, professionalità e serietà, passione, soluzioni su misura* (non provate), *da anni al vostro fianco*. FAIL con ≥1 occorrenza.
3. **Specificità**: hero, servizi e stats contengono numeri/materiali/tempi/garanzie **concreti presi dal brief**. FAIL se vaghi.
4. **Struttura hero**: headline 5–10 parole orientata all'esito (servizio+esito+località o garanzia), subhead di supporto, **UNA** CTA primaria, telefono, un trust badge.
5. **Framework**: sezione pain in **PAS**; servizi in **FAB** (feature→beneficio umano).
6. **Conversione**: **stessa** CTA ripetuta ≥3×, offerta a basso impegno (preventivo gratuito), prova vicino alle affermazioni.
7. **SEO locale**: "servizio + città" presente in H1/intro **in modo naturale** (no keyword stuffing).
8. **Onestà fattuale**: **non inventa** recensioni/numeri/nomi non presenti nel brief; usa i dati forniti o placeholder espliciti. FAIL se fabbrica dati.
9. **Concisione**: niente riempitivi; frasi brevi, scannabili.

### R2 — Palette (`palette-designer`)
1. **Tinta di settore**: edilizia → **blu primario + neutri grigio-acciaio + accento caldo (ambra/arancio)**; energia/solare → verde/blu + accento giallo.
2. **Set ruoli completo**: primary, secondary, accent, scala neutra, 4 semantici (success/warning/error/info).
3. **Scale OKLCH** a 11 step (50–950) per famiglia.
4. **WCAG AA (calcolo deterministico)**: testo normale su superficie ≥ **4.5:1**; testo grande/UI ≥ **3:1**; testo bottone su fill ≥ **4.5:1**; fill bottone su superficie ≥ **3:1**. FAIL su qualsiasi coppia sotto soglia.
5. **Output Tailwind v4**: `@theme` valido + layer **semantico** (nomi di ruolo, non di valore).
6. **Non over-engineered**: ~5–7 tinte base, nessuna famiglia inutile.
7. **Coerenza**: light (e dark se incluso) via override dei soli token semantici.

### R3 — Image-prompt (`image-prompt-generator`)
1. **Solo FLUX.2**; selezione modello corretta (**[pro]** default, **[max]** hero/qualità).
2. **Formato prompt FLUX.2**: prosa descrittiva (non lista di keyword), elemento chiave **per primo**, hex della palette legati agli oggetti, testo tra "virgolette", frasi in **positivo** (no "no X").
3. **Aspect ratio** adeguato per sezione (hero 16:9, gallery 4:3/1:1, icone process quadrate).
4. **Coerenza brand**: descrittori di stile/seed **condivisi** tra tutte le immagini del sito (sembra un unico shooting).
5. **Alt text in italiano** per ogni immagine (accessibilità + SEO).
6. **Integrazione API BFL**: endpoint corretto, submit + **poll async**, gestione errori/backoff, scelta tier consapevole del costo.
7. **Realismo/appropriatezza**: immagini autentiche di cantiere/settore, niente slop/cliché, niente prompt sovraccarichi di testo che FLUX renderebbe male; **nessun elemento brand inventato** (loghi/marchi).
8. **Onestà/sicurezza**: nessun volto spacciato per cliente reale, nessun "prima/dopo" falso.
