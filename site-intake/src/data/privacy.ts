/**
 * Informativa privacy BREVE (primo livello, art. 13 GDPR) mostrata alla domanda
 * «Ho letto l'informativa sulla privacy». Generata con la skill
 * informativa-breve-form (fonte: legale/informativa-breve.md, validata con il suo
 * validate.py): base giuridica art. 6.1.b (misure precontrattuali), quindi NESSUN
 * consenso richiesto per inviare il modulo, solo presa visione.
 *
 * Per aggiornarla: modificare legale/informativa-breve.md, rilanciare validate.py,
 * riportare qui il testo. Il secondo livello (informativa completa) è la pagina
 * /privacy di questo stesso sito (src/pages/privacy.astro, fonte legale/informativa-completa.md).
 */
export const INFORMATIVA_ESTESA_URL = "https://sito.consulbuild.com/privacy";
export const INFORMATIVA_DATA = "08/09/2026";

export const TITOLARE = {
  denominazione: "ConsulBuild di Vecchiato Edoardo",
  sede: "Strada Cul de Ola 254 P int. 1, 36100 Vicenza (VI)",
  piva: "04594370241",
  email: "consulbuildev@gmail.com",
} as const;

/** Due righe sotto la casella: il minimo per capire, con il rinvio al testo completo. */
export const INFORMATIVA_SINTESI =
  "Usiamo i tuoi dati solo per preparare la demo del tuo nuovo sito, metterla online 15 giorni su un indirizzo riservato e contattarti. Titolare: ConsulBuild di Vecchiato Edoardo. Se non attivi il servizio, cancelliamo tutto entro 60 giorni.";

/** Il primo livello completo, in HTML, per la finestra «Leggi tutta l'informativa». */
export const INFORMATIVA_BREVE_HTML = `
<p>Ai sensi dell'art. 13 del Regolamento (UE) 2016/679 (GDPR), ti informiamo che i dati inseriti in questo modulo sono trattati da <strong>${TITOLARE.denominazione}</strong>, ${TITOLARE.sede}, P.IVA ${TITOLARE.piva} (Titolare del trattamento), contattabile a <a href="mailto:${TITOLARE.email}">${TITOLARE.email}</a>.</p>
<ul>
  <li><strong>Finalità:</strong> preparare la versione dimostrativa (demo) del tuo nuovo sito web con i dati, le foto e il logo che ci fornisci; pubblicarla per 15 giorni su un indirizzo web dedicato e non indicizzato dai motori di ricerca (nome-azienda.demo.consulbuild.com) per mostrartela — la demo riporta i recapiti aziendali che indichi, come farà il sito; ricontattarti con la modalità che scegli (dare riscontro alla tua richiesta).</li>
  <li><strong>Base giuridica:</strong> esecuzione di misure precontrattuali adottate su tua richiesta (art. 6, par. 1, lett. b, GDPR). La spunta in fondo al modulo è la presa visione di questa informativa e l'accettazione delle condizioni della richiesta: non ti chiediamo consensi per finalità ulteriori.</li>
  <li><strong>Foto e logo:</strong> caricandoli confermi di averne i diritti d'uso (o l'autorizzazione di chi li ha realizzati) e che non ritraggono persone identificabili senza il loro accordo; ci autorizzi a usarli solo per preparare e mostrarti la demo e, se attivi il servizio, per il tuo sito.</li>
  <li><strong>Conferimento dei dati:</strong> facoltativo, ma i dati contrassegnati come obbligatori (mestiere e lavori, nome dell'azienda, nome del sito, sede, zone, anni di mestiere, cellulare, punti di forza, clienti, stile, nome e cognome, email, Partita IVA, modalità di contatto) sono necessari per poterti rispondere; in loro assenza non potremo dare seguito alla richiesta. Foto, logo, sito attuale, colori e pagine social sono facoltativi.</li>
  <li><strong>Conservazione:</strong> se non attivi il servizio, la demo si spegne dopo 15 giorni e i dati e le foto vengono cancellati entro 60 giorni dall'invio; se lo attivi, per tutta la durata del rapporto e per i termini di legge successivi.</li>
  <li><strong>Diritti:</strong> puoi esercitare i diritti previsti dagli artt. 15-22 GDPR (accesso, rettifica, cancellazione, limitazione, opposizione, portabilità) scrivendo a <a href="mailto:${TITOLARE.email}">${TITOLARE.email}</a>, e proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).</li>
</ul>
<p>I dati possono essere trattati da fornitori tecnici del Titolare (conservazione dei file, invio delle comunicazioni, pubblicazione del sito) con le garanzie previste dagli artt. 44-49 GDPR per gli eventuali trasferimenti extra-UE; l'elenco è nell'informativa completa.</p>
<p><a href="${INFORMATIVA_ESTESA_URL}" target="_blank" rel="noopener">Leggi l'informativa completa</a></p>
<p class="informativa__data">Informativa aggiornata al ${INFORMATIVA_DATA} ai sensi del Reg. (UE) 2016/679 (GDPR).</p>
`;
