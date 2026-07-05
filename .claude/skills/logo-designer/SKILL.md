---
name: logo-designer
description: Genera il simbolo (mark) vettoriale professionale del logo di una PMI via Recraft API quando il cliente non fornisce un logo dal form. Anti-slop by design - l'AI genera SOLO il pittogramma senza testo, la tipografia e i colori li impone il sistema. Usare nella pipeline Site-factory dopo la palette.
---

# Logo Designer — simbolo vettoriale anti-slop

## Perché questa architettura (non negoziabile)

I loghi "generati dall'AI" si riconoscono da: lettere storpiate, gradienti/3D/ombre,
cliché da clip-art, colori fuori palette, output raster che sgrana. Ogni regola qui
sotto elimina una di queste cause alla radice:

1. **L'AI genera SOLO il simbolo. MAI testo.** Niente lettere, monogrammi, iniziali
   o parole nel prompt: la tipografia (nome azienda accanto al mark) è SEMPRE quella
   del preset del sito, resa dal componente Header — mai disegnata dal modello.
2. **Vettoriale nativo.** Solo endpoint SVG di Recraft (`recraftv3_vector` o
   V4.1 vector): il file è scalabile, editabile, ricolorabile. Mai raster+trace.
3. **Il colore non lo decide il modello.** Il mark si genera monocromo e il sistema
   lo RICOLORA deterministicamente sull'hex `primary` della palette
   (`generate-logo.mjs --recolor`): la coerenza cromatica è imposta, non sperata.
4. **Un colore, forme piatte.** Nel prompt sempre: "flat vector pictogram, single
   solid color, bold geometric shapes, clean silhouette, white background, no
   gradients, no shadows, no 3D, no outline text, no letters, no words".

## Il soggetto: dal form, non dal repertorio

Leggi dal brief i servizi REALI e scegli UN soggetto che li rappresenti. Mappa di
partenza (settore → soggetti forti):

- **Ristrutturazioni / edilizia**: cazzuola stilizzata, profilo di facciata con
  impalcatura, filo a piombo, sezione di muro con mattoni in pattern geometrico
- **Impianti (idraulici/elettrici)**: chiave inglese + goccia, saetta in negativo
- **Bagno/cucine**: piastrella geometrica, sagoma di miscelatore
- **Esterni/impermeabilizzazioni**: profilo tetto con linea d'acqua, terrazzo stilizzato
- **Energia/solare**: pannello in prospettiva piatta, sole geometrico a raggi netti

**Lista nera dei cliché** (rifiuta e rigenera se compaiono): stretta di mano, globo,
swoosh, lampadina, omino stilizzato con braccia aperte, casetta generica con tetto
spiovente e camino, ingranaggio generico, scudo con spunta.

## Protocollo di generazione

1. Componi il prompt: soggetto specifico + formula tecnica del punto 4 sopra.
2. Genera **6 varianti** (seed diversi, stesso prompt) con
   `node site-renderer/scripts/generate-logo.mjs --prompt "…" --color <hex-primary> --out <dir>`
   (il ricoloro alla palette è automatico; ~$0.08/variante).
3. Auto-scarto: elimina le varianti con più di ~3 colori residui, dettagli che
   spariscono a 32px (test favicon), o soggetti della lista nera.
4. **Checkpoint umano**: presenta le sopravvissute affiancate (il titolare/agency
   sceglie o chiede un'altra ronda con soggetto diverso).
5. Output finale nel kit: `mark.svg` (ricolorato su primary), `mark-dark.svg`
   (bianco, per sezioni scure), `favicon.svg` (quadrato). Il lockup completo
   (mark + nome azienda) lo compone l'Header con la tipografia del preset.

## Vincoli operativi

- API: `RECRAFT_API_KEY` in env (paid plan = piena proprietà commerciale degli
  output; il free plan NON dà diritti commerciali — mai usarlo per clienti).
- Modello default: `recraftv3_vector` (supporta gli style curati icon/pictogram);
  V4.1 standard vector come alternativa (più fedele al prompt, niente style curati).
- Se il cliente HA caricato un logo dal form: questa skill NON si usa (il logo del
  cliente è verità; al massimo si vettorizza con l'endpoint vectorize, $0.01).
- Fermati al checkpoint: mai scegliere la variante finale da solo.
