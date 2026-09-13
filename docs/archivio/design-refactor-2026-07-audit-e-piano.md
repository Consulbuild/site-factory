# Refactoring design editor (2026-07-11) — audit pre-refactor e piano Fase 2 — STORICO

> Archiviato il 2026-09-13: §1-3 sono la fotografia dell'editor di luglio (prima delle
> fette A–H, tutte committate `368460e…f003fca`), §8-9 il piano e le questioni poi
> risolte. La spec viva (§4-7: sistema di coerenza, pagine, status bar, direzione
> visiva) resta in `site-factory-editor/DESIGN-REFACTOR-2026-07.md`; il manuale
> operativo è `site-factory-editor/DESIGN-SYSTEM.md`.

## 1. Verdetto sintetico

La base è **sana e sopra la media**: token a due temi ben costruiti (oklch, AA
verificato), vocabolario minimo coerente (StepBadge, 3 bottoni, action bar sticky),
zero anti-pattern AI-slop, pattern forti già in piedi (staleness con ack, critico con
"vai al campo", gate deterministici, tracciabilità con chip fonte). Il problema non è
lo stile: è la **completezza operativa** e la **visibilità del lavoro in background**.
L'editor oggi è una serie di ottime schede isolate; non è ancora una console.

Tre difetti strutturali dominano tutto il resto:

1. **I run AI muoiono se navighi via.** `lib/run-step.ts:94-96` uccide il child
   `claude` quando lo stream HTTP si chiude: un run copy/immagini da 10–30 min
   obbliga a babysittare il tab. Durante il run la guardia unsaved è spenta
   (`setDirty(false)`), quindi non c'è nemmeno l'avviso. Qualunque status bar è
   inutile finché i run non sopravvivono alla navigazione → §6.1.
2. **La pipeline non si vede.** La lista mostra 2 badge su 6 step; l'hub non dice
   qual è il prossimo passo; le run di fabbrica non mostrano né metriche né log dopo
   la fine; i log sono effimeri (persi al refresh). L'operatore naviga a memoria.
3. **CRUD incompleto e vocabolario divergente.** Nessun elimina cliente (nessuna
   DELETE), nessun elimina/archivia run o riferimenti; 5 fraseologie per lo stesso
   concetto ("Va bene così"/"Ho sistemato a mano", "Rigenera con l'AI"/"Rigenera
   tutto", "Salva"/"Salva bozza"), 3 implementazioni di badge, 2 di breadcrumb,
   post-conferma incoerente (hub vs resta in pagina).

## 2. Punteggio euristiche (Nielsen, 0–4 — sintesi onesta dalle evidenze)

| # | Euristica | Voto | Evidenza chiave |
|---|-----------|------|-----------------|
| 1 | Visibilità stato sistema | 2 | Badge e RunLog ottimi in scheda; ma run invisibili fuori dalla scheda, lista con 2/6 step, log effimeri, niente tempo/fase |
| 2 | Corrispondenza col mondo reale | 4 | Italiano operativo eccellente ("Testo bianco sui bottoni", "Guardala come la vedrebbe il titolare") |
| 3 | Controllo e libertà | 1 | Run non annullabili né riprendibili dall'UI, navigare = ucciderli; nessun undo; "Scarta candidato" irreversibile senza conferma |
| 4 | Coerenza e standard | 2 | Vocabolario base c'è ma: 3 badge duplicati, 2 breadcrumb, etichette divergenti, container disallineati (copy 3xl/5xl) |
| 5 | Prevenzione errori | 3 | Gate deterministici ovunque (422 puntuali, WCAG server-side); ma Pubblica sul sito live è senza conferma, "Rigenera da zero" del contesto pure |
| 6 | Riconoscimento vs memoria | 2 | Staleness generica ("il contesto è cambiato" — cosa?); duplicati indistinguibili in lista (niente slug/data); tokenDiff mai mostrato |
| 7 | Flessibilità ed efficienza | 1 | Zero scorciatoie tastiera, zero bulk, hub-and-spoke obbligato, nessun "prossimo passo" |
| 8 | Design minimalista | 4 | Densità da strumento, niente decorazione, chrome silenzioso — il punto di forza |
| 9 | Recupero errori | 3 | Errori verbatim + Riprova in scheda; ma sull'hub lo stato errore non mostra il messaggio, run fallite di fabbrica senza motivo persistito |
| 10 | Aiuto e documentazione | 3 | Microcopy esplicativo diffuso e ben scritto (caption su costi/tempi/prerequisiti) |
| **Totale** | | **25/40** | **Accettabile: fondamenta buone, servono interventi mirati** |

Personas più colpite: **Alex (power user quotidiano)** — è Mattia: niente tastiera,
viaggi hub↔scheda continui, babysitting dei run. **Riley (stress tester)** — run
interrotti = stati zombie `in_corso` senza reset dall'UI; refresh durante run = run
ucciso.

## 3. Gap portanti (fusione dei 2 inventari, ordinati per impatto)

| # | Gap | Fix previsto |
|---|-----|--------------|
| G1 | Run uccisi alla navigazione; nessun stop/riprendi esplicito; zombie `in_corso` | Run in background + status bar (§6) |
| G2 | Lista clienti: 2/6 step, no filtri/sort, duplicati indistinguibili, no azioni riga | Dashboard clienti (§5.1) |
| G3 | Nessun elimina cliente | DELETE + conferma forte col nome (§5.1) |
| G4 | Hub senza "prossimo passo" né azioni cliente; errori senza messaggio | Hub v2 (§5.2) |
| G5 | Post-conferma incoerente (hub vs resta) | Regola unica: conferma → prossimo step (§4) |
| G6 | Zero scorciatoie tastiera | ⌘S salva, / cerca, Esc, ⏎ nei dialog (§4) |
| G7 | Contesto senza rigenera persistente | Header ⟳ come le altre schede (§5.3) |
| G8 | Run senza tempo/fase/costo; metriche `ultimaRun` scritte ma mai mostrate | Status bar + meta per step (§6, §5.2) |
| G9 | Pubblica sito live senza conferma; "Rigenera da zero" contesto senza dialog | Policy ConfirmDialog unica (§4) |
| G10 | Staleness non dice cosa è cambiato (solo Build elenca i file) | Banner con elenco file + campo drift (§4) |
| G11 | Fabbrica: run non eliminabili/archiviabili, senza filtri; riferimenti non editabili/eliminabili né con thumbnail | Fabbrica v2 (§5.7-5.9) |
| G12 | Fabbrica: shot invisibili fuori dall'audit, log/metriche/motivo-fallimento mai ripescati, tokenDiff nascosto, meta preset incompleti all'audit | Run detail v2 + audit v2 (§5.8-5.9) |

Funzioni server già esistenti da esporre (gratis): `ultimaRun {durataMs, esito,
quando}` in client.json; `misure {durataMin, roundCritico}` delle run fabbrica;
screenshot dei riferimenti (`screenshot-1280.png`); segnali opt-out dettagliati;
`novelty.json` (tokenDiff); anteprima live del candidato in `dist/anteprima/`;
rimozione dominio custom; re-audit su `pubblicata`.

## 8. Piano Fase 2 (fette compatte, una per volta, ordine consigliato)

| Fetta | Contenuto | Perché in quest'ordine |
|---|---|---|
| A. Fondamenta visive | token v2 dalla §7 (superfici/ombre/raggi/blu/Inter, ENTRAMBI i temi), lucide-react, motion, Button/Banner/EmptyState/Badge unico, Breadcrumb unico, z-scale, tastiera base | il nuovo linguaggio prima di tutto: ogni fetta dopo nasce già giusta |
| B. Shell | sidebar + topbar con ⌘K + pagina Impostazioni/chiavi (§4 Shell) | cambia l'ossatura di ogni pagina; slot «Agenti al lavoro» pronto per C |
| C. Run in background | §6.1 (tee+detach+active+stop+zombie) | prerequisito status bar; fix del gap #1 |
| D. Status bar agenti | §6.2-6.5 completa + card sidebar, entrambi i temi | il pezzo nuovo di valore |
| E. Dashboard clienti | §5.1 (KPI card-filtro, mini-pipeline, elimina, menu riga) | la pagina d'ingresso quotidiana |
| F. Hub v2 | §5.2 (prossimo passo, meta, errori inline, azioni cliente) | completa il flusso di lavoro |
| G. Coerenza schede | §4+§5.3-5.6 (vocabolario, post-conferma, dialoghi mancanti, rail copy, staleness dettagliata) | pulizia sistematica |
| H. Fabbrica v2 | §5.7-5.9 | area a minor frequenza d'uso |

Verifiche per fetta (standard handoff): `tsc --noEmit` + `npm run build` + E2E sui
clienti reali + passata /impeccable critique/polish nel browser su ENTRAMBI i temi.
Commit autonomo a verifiche verdi (regola 7).

## 9. Questioni aperte per Mattia (tutte risolte)

1. ~~Screenshot di riferimento~~ — **arrivati 2026-07-11**, direzione estratta in §7.
2. **Eliminazione cliente e sito pubblicato**: eliminare i file locali NON spegne un
   sito già online su Cloudflare. Default adottato (salvo veto): il dialog lo dice
   esplicitamente («il sito su workers.dev resta online finché non lo rimuovi da
   Cloudflare»); la rimozione remota è fuori scope. (Oggi la delete dell'editor
   rimuove anche worker, registro n8n e monitor: vedi `lib/deploy.ts`.)
3. **Notifiche di sistema macOS** a fine run: default NO (YAGNI, la barra basta);
   aggiungibili dopo.
4. **Addio al teal nell'editor** (§7): il primario diventa il blu del riferimento,
   il teal resta ai siti generati. Adottato.
