# Brief T0 — Area «Traffico»: forma e scheletro

Leggi prima `docs/traffico/README.md` (§1 decisioni, §3 architettura comune, §4 ciclo, §5 regole
operative). Questo brief contiene solo ciò che serve a T0.

## Obiettivo

Creare nell'editor l'area «Traffico» con i due servizi per cliente (**Sito** e **Scheda
Google**), il loro stato persistito e gli interruttori, pronta a ricevere i pannelli dei piani
successivi. Nessun dato esterno, nessuna chiave API in questo piano: le chiavi entrano nei piani
che le usano (T2a Google/Bing, T4 DataForSEO/Ads).

## Decisioni che riguardano T0

- Due servizi separati, attivabili **per cliente** con interruttore nell'editor (decisioni 1, 3).
- Stati: `spento` (default, anche per i client.json senza campo), `attivo`, `sospeso`
  (disattivato dopo essere stato attivo: le pagine e le fondamenta restano online, si ferma il
  ciclo — decisione 11). Da sospeso si può riattivare.
- Attivazione rifiutata in percorso `demo` (stessa logica e codice HTTP del dominio in demo,
  vedi `app/api/clients/[slug]/build/route.ts` righe 44-57).
- Studio UX prima della UI (decisione 2): `/impeccable shape` sull'intera area.

## Contesto da leggere (solo questo)

- `site-factory-editor/DESIGN-SYSTEM.md` (tutto, in particolare §5, §6, §12 ricetta scheda nuova)
- `site-factory-editor/DESIGN-BRIEF.md` (come sono scritti gli studi delle altre schede; aggiungi
  lì la sezione dell'area Traffico)
- `site-factory-editor/lib/schemas.ts` (`ClientStateSchema`, soprattutto `percorso`, `demo`,
  come sono fatti i default)
- `site-factory-editor/lib/clients.ts` (`readClientState`, `patchClientState`, `sintetizza`,
  `listClients`)
- `site-factory-editor/lib/stati.ts` e `scripts/test-stati.ts` (pattern: regole pure + banco)
- `site-factory-editor/app/clienti/[slug]/page.tsx` (hub: dove mettere l'accesso all'area)
- `site-factory-editor/components/sidebar.tsx`, `components/clients-browser.tsx` (home,
  pattern delle card KPI e delle righe), `components/cliente-stato.tsx`, `components/ui.tsx`
- `site-factory-editor/components/confirm-dialog.tsx` (conferme)
- una route esistente con POST e validazione, es. `app/api/clients/[slug]/build/route.ts`
- guide Next 16 in `site-factory-editor/node_modules/next/dist/docs/` per le API che usi

Non leggere: renderer, n8n, skill, ricerca completa (non servono a T0).

## Cosa deve esistere a fine T0

1. **Schema**: `traffico` in `ClientStateSchema` con default che non cambia i client.json
   esistenti (lettura di un file vecchio = entrambi spenti; nessuna riscrittura forzata).
2. **Regole pure** in un modulo nuovo (es. `lib/traffico.ts`): transizioni ammesse
   (spento→attivo, attivo→sospeso, sospeso→attivo), guard percorso demo, data dei passaggi;
   funzione che dice se il renderer deve accendere le fondamenta (attivo o sospeso) e se il
   ciclo deve girare (solo attivo). Banco `scripts/test-traffico-stato.ts` senza rete.
3. **Route** API per cambiare stato (validazione input, 409 in demo, 400 su transizione non
   ammessa, scrittura via `patchClientState`).
4. **UI** secondo lo shape:
   - voce «Traffico» nella sidebar → pagina portafoglio dei clienti (chi ha quale servizio in
     che stato; clienti in demo visibili ma non attivabili, col perché);
   - dettaglio per cliente con le due aree Sito e Scheda Google: interruttore con conferma,
     stato, date, e stati vuoti onesti che dicono cosa arriverà e cosa serve (dominio, dati del
     mini-form, accesso alla scheda) senza promesse di posizioni o tempi;
   - accesso dal hub del cliente (una riga o un link coerente con lo stile esistente).
5. **Documenti**: sezione nell'`DESIGN-BRIEF.md`, piano chiuso in `docs/traffico/piano-T0.md`,
   stato T0 aggiornato in `docs/traffico/README.md` §7, riga in `docs/handoff-fase-c.md`.

## Uscita verificabile (criteri di accettazione)

- Attivare il servizio Sito di `cavaliere-build-srls` scrive `traffico.sito.stato = "attivo"`
  con data; sospendere e riattivare funzionano; transizioni vietate rispondono 400.
- Su un cliente in percorso demo l'interruttore è disabilitato col motivo visibile e la route
  risponde 409.
- Un client.json senza campo `traffico` si legge come spento e non viene riscritto dalla sola
  lettura.
- `npx tsc --noEmit`, `npm run build` (editor) e il banco nuovo sono verdi; `scripts/test-stati.ts`
  e `scripts/test-portafoglio.ts` restano verdi.
- UI controllata in entrambi i temi a 1280 e 400 px; `/impeccable critique` senza problemi gravi.
- Nessun altro comportamento dell'editor cambia (hub, catena, build, deploy intatti).

## Calibrazione (fase 3)

Testi degli stati vuoti e delle conferme: linguaggio operativo per Mattia, niente promesse.

## Attenzione

- Le schede sono `force-dynamic` e leggono dal filesystem; `client.json` è di proprietà della GUI.
- `patchClientState` lancia se il file è corrotto: la route deve rispondere con errore leggibile.
- Dopo aver attivato Cavaliere per la prova, **riportalo a `spento`** a fine test (non vogliamo
  lasciare stati sporchi: nessun piano successivo è ancora pronto).
- Perimetro `scope.json`: elenca i file del piano; a fine lavoro svuotalo.
