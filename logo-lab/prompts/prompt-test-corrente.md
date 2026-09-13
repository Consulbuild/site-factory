# Prompt di prova corrente (v9b, 2026-09-13) — contesto generale + ragionamento + nome

Modifica di Mattia su v9: tolto «simple» (non vincolare la ricchezza del design) e il guardrail
diventa «The logo shows also the name» (il simbolo è ammesso, il nome è obbligatorio, il resto del
testo no).

Richiesta di Mattia: guardrail «the logo shows only the name»; un fattore che chieda un design
professionale e faccia RAGIONARE il modello sul design prima di disegnare; contesto più
generale (solo di cosa si occupa la ditta e dove, niente numeri); massimo 4 righe.

Come ho reso il «fattore professionale» senza dare stile: non aggettivi d'umore (la ricerca 05
dice che «professional/modern» non spostano nulla) ma un RUOLO e un PROCESSO: «as a senior brand
designer would for a paying client: think the concept through before drawing». È indirizzato ai
modelli con ragionamento (GPT Image 2, Nano Banana Pro, Seedream 5) e non vincola la resa. I
criteri di qualità sono espressi come risultato d'uso («distinctive, simple, still clear at small
size in the site header»), non come stile.

## 1 — La Cecilia

```text
Logo for the website landing page of "LA CECILIA", a family-run bathroom renovation company in San Severo, Puglia, Italy.
Design it as a senior brand designer would for a paying client: think the concept through before drawing, so it is distinctive and still clear at small size in the site header.
The logo shows also the name.
```

## 2 — Termoidraulica Rossi

```text
Logo for the website landing page of "TERMOIDRAULICA ROSSI", a father-and-son plumbing and heating business in Bergamo, Italy.
Design it as a senior brand designer would for a paying client: think the concept through before drawing, so it is distinctive and still clear at small size in the site header.
The logo shows also the name.
```

## 3 — Coperture Marini

```text
Logo for the website landing page of "COPERTURE MARINI", a roofing and waterproofing contractor in Treviso, Italy.
Design it as a senior brand designer would for a paying client: think the concept through before drawing, so it is distinctive and still clear at small size in the site header.
The logo shows also the name.
```

---

# v8 (superata) — solo contesto, uso sul sito

Richiesta di Mattia: prompt di massimo 3 righe, nessuna indicazione di stile né vincolo; solo il
contesto dell'azienda. Esito v7 (5 servizi): «già meglio, più creativi», ma tutti hanno messo le
frasi del contesto DENTRO il logo (payoff, indirizzo, promesse). v8: stessa lunghezza, si dice che
il logo va sulla landing page del sito aziendale e il contesto è presentato come informazione, non
come testo da rendere. Niente Consulbuild, niente «PMI».

## 1 — La Cecilia (dati reali dal form)

```text
Logo for the website landing page of "LA CECILIA", a family-run bathroom renovation company in San Severo, Puglia, Italy. About them: they turn a bathtub into a walk-in shower in 8 hours and renovate a complete bathroom in 5 days, handling materials, plumbing and electrics so the client does nothing.
```

## 2 — Termoidraulica Rossi (fixture)

```text
Logo for the website landing page of "TERMOIDRAULICA ROSSI", a father-and-son plumbing and heating business in Bergamo, Italy. About them: boilers, heat pumps and bathrooms for homes in the valleys, and a 24-hour emergency service the whole town relies on.
```

## 3 — Coperture Marini (fixture)

```text
Logo for the website landing page of "COPERTURE MARINI", a roofing and waterproofing contractor in Treviso, Italy. About them: they rebuild roofs, insulate attics and waterproof terraces of old farmhouses and villas across the Veneto plain, known for work that lasts decades.
```

## Esito v7 (5 servizi, giudizio di Mattia + mio)

Tutti più creativi di v1–v6: due badge con nastri e micro-testi, un'illustrazione monolinea
oro con freccia vasca→doccia, una scena da app, un'illustrazione realistica con tre righe di
testo. Difetti comuni: troppe parole (payoff, indirizzo, «dal 1970» inventato), troppo alti per
un header, un caso con refuso («bathriub»). Il contesto libero fa scegliere al modello un
dispositivo di craft da solo; va solo detto dove si usa.

## Storico

- v1–v5 (8–12/9): prompt a vincoli → icone corrette e intercambiabili.
- v6 (13/9): kit a 4 dispositivi di craft, A/B/C validati su FLUX.2 pro (`../runs/vocab/`), metodo in `../ricerca/08-metodo-v2.md`.
- v7 (13/9): prompt di solo contesto, senza stile, per vedere cosa scelgono i modelli da soli.
