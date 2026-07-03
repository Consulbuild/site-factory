# Product

## Register

brand

## Users

Due livelli di utente:

1. **Il visitatore finale**: titolare o cliente di una PMI italiana locale (edilizia,
   ristrutturazioni, artigiani, servizi). Arriva da ads o ricerca locale, spesso da
   mobile, con un bisogno concreto ("devo rifare il bagno", "cerco un'impresa seria").
   Deve fidarsi in pochi secondi e trovare SUBITO un modo per chiedere un preventivo.
2. **Il lead di ConsulBuild**: un imprenditore a cui l'agency mostra il sito-demo già
   pronto in fase di vendita. Deve pensare "questo è il MIO sito, fatto da
   professionisti" — non "è un template".

## Product Purpose

Site Factory genera single-page di conversione per PMI locali italiane, partendo dai
dati di un form (Tally). Il renderer trasforma un `site.json` in un sito statico usando
una libreria di sezioni standardizzate. Successo = il lead firma dopo aver visto la
demo; il visitatore finale chiama o compila il form.

## Brand Personality

**Solido, diretto, operativo.** Il design deve trasmettere l'affidabilità di
un'impresa vera: titoli forti in maiuscolo, foto di lavori reali, promesse concrete
("in 5 giorni", "risposta in 24h"), un solo colore di marca usato con decisione.
Emozioni target: fiducia, urgenza controllata, concretezza. Niente astrazione, niente
poesia: è un preventivo, non un manifesto.

## Anti-references

- **AI slop**: gradienti generici, emoji come icone, glassmorphism decorativo,
  hero-metric template, cream/beige di default, palette timide.
- **Landing SaaS**: il linguaggio Stripe/Linear (minimalismo tech, mono labels ovunque)
  è fuori registro per un'impresa edile di Guidonia.
- **Editoriale-magazine**: serif con italic, drop caps, griglie da broadsheet — fuori
  registro. I riferimenti sono i siti consegnati da ConsulBuild, non Klim.
- **Template WordPress da 30€**: sezioni tutte uguali, stock photo sorridenti finte,
  copy vago ("qualità e professionalità al tuo servizio").

## Design Principles

1. **La formula è il brand.** I siti ConsulBuild condividono una grammatica fissa
   (vedi DESIGN.md): eyebrow con lineetta, H2 maiuscolo con UNA frase in accent, ritmo
   scuro/chiaro, CTA ricorrenti. La personalizzazione è palette + copy + foto, mai la
   struttura. Coerenza = riconoscibilità = qualità ripetibile.
2. **Ogni sezione spinge alla conversione.** Telefono e preventivo raggiungibili da
   ogni fold. Microcopy di rassicurazione vicino a ogni CTA ("gratuito", "senza
   impegno", "risposta in 24h").
3. **La prova prima della promessa.** Foto di lavori reali, numeri concreti, processo
   esplicito in passi. Mai claim senza evidenza accanto.
4. **AA non negoziabile.** Il sistema di token deve garantire contrasto WCAG AA
   automaticamente per qualunque palette il cliente scelga.
5. **Mobile è il caso primario.** Il visitatore arriva da ads su smartphone; ogni
   sezione si progetta prima a 390px, poi si allarga.

## Accessibility & Inclusion

WCAG 2.1 AA: contrasto 4.5:1 testo normale / 3:1 testo grande, focus visibile,
target touch ≥44px, `prefers-reduced-motion` rispettato, semantica reale
(landmark, label associate, accordion nativi `details/summary`).
