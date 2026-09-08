import fs from "node:fs";
import { listClients, type ClientSummary } from "./clients";
import { INBOX_DIR, listLeadsForm, type RichiestaForm } from "./inbox-form";

// Dati della home: clienti su disco + richieste del form sito.consulbuild.com non
// ancora importate (unica sorgente dal 2026-09-08; Tally è stato dismesso). Le
// richieste stanno nel mirror di Google Drive (_inbox): se la cartella non c'è
// (Drive Desktop spento o account diverso) lo si dice, invece di mostrare una
// lista vuota rassicurante.

export interface HomeData {
  clients: ClientSummary[];
  nonImportati: RichiestaForm[];
  inbox: "ok" | "non_raggiungibile";
}

/** Lista merged disco + form, usata sia dalla pagina che dalla API route. */
export function getHomeData(): HomeData {
  const clients = listClients();
  const importedIds = new Set(clients.map((c) => c.submissionId).filter(Boolean));
  const inbox = fs.existsSync(INBOX_DIR) ? "ok" : "non_raggiungibile";
  return { clients, nonImportati: listLeadsForm().filter((s) => !importedIds.has(s.id)), inbox };
}
