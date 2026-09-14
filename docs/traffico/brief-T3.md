# Brief T3 — Mini-form «Dati per farti trovare»

Leggi prima `docs/traffico/README.md` (§1-§5). Dipende da **T0** (stato del servizio in
`client.json.traffico`, area Traffico nell'editor: `docs/traffico/piano-T0.md`).

## Obiettivo

Raccogliere dal titolare, **dopo l'attivazione del servizio Sito**, i dati reali che servono alle
pagine per servizio e per comune, alla mappa delle query e ai dati strutturati, senza toccare il
form lead attuale. In ≤ 5 minuti da telefono. Nessun dato inventato se non risponde.

## Decisioni che riguardano T3

- Mini-form separato dal form lead (decisione 5); il form lead su sito.consulbuild.com non cambia.
- Dati: comuni serviti **precisi** (con codice ISTAT), nome d'uso cercabile (come lo chiamano i
  clienti), orari in cui risponde al telefono, «prezzo da» per servizio (facoltativo, IVA inclusa
  o dichiarata, con data di validità), attestati e certificazioni reali (tipo, numero o ente,
  eventuale file), **foto per cantiere** con comune, servizio e anno (mai la via), i lavori su
  cui vuole più clienti (priorità commerciale, serve a T4).
- Nessuna raccolta di recensioni (decisione 9).
- I dati finiscono in `out/<slug>/traffico/dati.json` (artifact separato: **mai** dentro
  `contesto.json`, per non rendere stale copy e build) e restano «da verificare» finché Mattia non
  li conferma nell'area Traffico.

## Contesto da leggere

- `site-intake/README.md`, `site-intake/DESIGN.md`, `site-intake/PRODUCT.md`
- `site-intake/src/data/domande.ts`, `site-intake/src/data/tassonomia.ts`,
  `site-intake/src/lib/engine.ts`, `site-intake/src/lib/render.ts`, `site-intake/src/lib/main.ts`,
  `site-intake/src/lib/transport.ts`, `site-intake/src/lib/upload.ts`, `site-intake/src/lib/comuni.ts`,
  `site-intake/src/components/{zone,sede,foto,scelte,testo}.ts`, `site-intake/src/pages/*.astro`
- `site-intake/scripts/build-comuni.mjs` e `site-intake/data-src/comuni.json` (codici ISTAT)
- `site-intake/tests/*.spec.ts`, `site-intake/playwright.config.ts`, `site-intake/wrangler.jsonc`
- `site-intake/legale/informativa-breve.md`, `site-intake/legale/informativa-completa.md`,
  `docs/audit-legale-form-bozza-2026-09-14.md`
- `infra/n8n/bozza.json` e `infra/n8n/bozza-pulizia.json` (pattern webhook → Google Drive),
  `site-factory-editor/scripts/n8n-import.ts`, `docs/vps-integrazioni-setup.md` §4 e §10
- `site-factory-editor/lib/inbox-form.ts` (import dal Drive, EXIF, `lavori.json`),
  `site-factory-editor/lib/secrets.ts`, `site-factory-editor/lib/traffico.ts` (T0),
  `site-factory-editor/app/traffico/[slug]/page.tsx` (T0), `site-factory-editor/DESIGN-SYSTEM.md`
- `docs/ricerca-traffico-2026-09.md` §6.3 e §9 (vincoli legali su prezzi e attestati)

Non leggere: renderer, skill della pipeline, fabbrica.

## Cosa deve esistere a fine T3

1. **Link personale** generato dall'editor per un cliente con servizio Sito attivo: non contiene
   dati personali, non è indovinabile né riusabile per un altro cliente, scade, può essere
   rigenerato (il vecchio smette di funzionare). Il piano sceglie il meccanismo (token opaco
   registrato lato n8n o firma HMAC con segreto condiviso Keychain ↔ credenziale n8n) motivando
   sicurezza e semplicità.
2. **Mini-form** in `site-intake/` (stessa grammatica visiva e motore del form lead, pagina
   separata), con verifica del link prima di mostrare le domande, autosalvataggio, foto in
   originale come nel form lead, informativa dedicata.
3. **Workflow n8n** versionato in `infra/n8n/` che valida il link, salva risposte e file su Drive
   in una cartella separata da `_inbox`, e rifiuta link scaduti o manomessi.
4. **Import nell'editor**: dall'area Traffico del cliente, «Importa dati» → `traffico/dati.json`
   validato (schema Zod) + foto dei cantieri in una cartella dedicata con EXIF rimosso e
   manifest (comune ISTAT, servizio, anno, alt) → stato «da verificare» → conferma di Mattia. Il
   pannello mostra i dati in lettura, con correzione a mano dei campi e conferma.
5. **Legale**: informativa del mini-form (dati dell'impresa, foto, conservazione) coerente con
   l'audit del 14/09.
6. **Documenti**: piano chiuso, stato in README §7, handoff, `docs/vps-integrazioni-setup.md`
   (nuovo workflow e segreto), `docs/DEBUG.md` (log dell'import).

## Uscita verificabile

- Link generato per `zz-test-t3` (fixture) → form compilato in Playwright (mobile 390 px) →
  dati e foto arrivano a n8n in ambiente di prova o in una cartella Drive di test → import
  nell'editor → `traffico/dati.json` valido, foto senza EXIF, manifest coerente.
- Link scaduto, manomesso o di un altro cliente: rifiutato sia dal form sia da n8n.
- Il form lead esistente: tutti i test Playwright esistenti verdi e comportamento invariato.
- `contesto.json`, `copy.json` e build della fixture **non** diventano stale dopo l'import.
- Banco `site-factory-editor/scripts/test-dati-traffico.ts` senza rete (schema, normalizzazioni,
  comuni ISTAT, prezzi, casi limite); `npx tsc --noEmit` e `npm run build` (editor);
  `npm run build`, `npm run check`, `npm test` (site-intake) verdi.
- Deploy in produzione del mini-form e import del workflow n8n **solo** dopo la suite completa
  verde; poi prova dal vivo con un link di test e pulizia dei dati di prova.

## Calibrazione (fase 3)

Durata di compilazione (< 5 minuti), testi d'aiuto su prezzo da, attestati e foto, ordine delle
domande, numero massimo di comuni e foto.
