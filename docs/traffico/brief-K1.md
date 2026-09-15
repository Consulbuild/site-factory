# Brief K1 — Chiavi API divise per gruppi, con le chiavi del Traffico

Leggi prima `docs/traffico/decisioni-piani.md` (T2a punto 3, T4, G1) e `site-factory-editor/DESIGN-SYSTEM.md` §5, §6, §10.
Piano: `docs/traffico/piano-K1.md`.

## Obiettivo

Richiesta di Mattia (15/09): le chiavi sono diventate troppe per una lista unica. In **Impostazioni → Chiavi API** vanno
divise in tre gruppi con titolo e frase che dice a cosa servono, e vanno aggiunti **subito** i campi delle chiavi del
Traffico, così Mattia le inserisce e si parte con i test su dati reali. K1 anticipa chiavi e prove che T2a, T2b, T4 e G1
avevano pianificato ciascuno per sé: quei piani le riusano, non le duplicano.

## Gruppi

1. **Produzione e sviluppo siti**: `BFL_API_KEY`, `OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
2. **VPS e dashboard clienti**: `UMAMI_PASSWORD`, `N8N_REGISTRA_KEY`, `N8N_API_KEY`, `STRIPE_API_KEY`, `GATUS_PASSWORD`.
3. **Ottimizzazione del traffico** (nuove): `GOOGLE_SERVICE_ACCOUNT`, `GOOGLE_API_KEY`, `BING_WEBMASTER_API_KEY`,
   `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `CLOUDFLARE_DNS_API_TOKEN`.

## Vincoli (non negoziabili)

- Ogni prova usa **solo endpoint gratuiti**, con timeout; nessuna chiamata a pagamento, neppure nei test.
- Errori tradotti in italiano leggibile che dicono cosa fare; **mai** il valore della chiave in log, risposte, messaggi
  o argv (regole di `lib/secrets.ts`: Keychain, valore solo su stdin).
- JSON del service account normalizzato in forma compatta, sotto il buffer di 4096 byte di `security -i` (piano-T2a §5.1),
  e riletto dopo il salvataggio.
- Nessuna chiave in git: il banco genera le sue chiavi finte in memoria.
- UI con i componenti di `components/ui.tsx`, entrambi i temi, 400 px; shape nel piano, critique dopo.

## Cosa deve esistere a fine K1

1. `lib/secrets.ts`: le 6 chiavi nuove, `KEY_GROUPS` e `KEY_INFO` (dove si prende, segnaposto), tetto di lunghezza.
2. `lib/chiavi-traffico.ts`: normalizzazione del service account, firma JWT, prove delle 6 chiavi con trasporto
   iniettabile, traduzione degli errori, redazione.
3. Route `app/api/setup/keys/route.ts`: GET per gruppi, POST con normalizzazione, prova, salvataggio e rilettura.
4. Pannello «Chiavi API» (`components/home.tsx`) per gruppi con stato e link per chiave.
5. Banco `scripts/test-chiavi.ts` senza rete; riga in `docs/DEBUG.md`.

## Uscita verificabile

`npx tsc --noEmit`, `npm run build`, banco verde; E2E con chiavi finte sul dev server: ogni chiave nuova rifiutata con un
messaggio italiano che non contiene il valore, Keychain invariato; Impostazioni controllata nei due temi a 1280 e 400 px.
