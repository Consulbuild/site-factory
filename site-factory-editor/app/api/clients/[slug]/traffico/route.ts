import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { z } from "zod";
import { clientDir } from "@/lib/paths";
import { motivoCorrotto, patchClientState, readClientState } from "@/lib/clients";
import { StatoServizioTraffico } from "@/lib/schemas";
import { SERVIZI, leggiTraffico, transizione } from "@/lib/traffico";
import { busIdTraffico, getRun } from "@/lib/run-bus";

export const dynamic = "force-dynamic";

// Cambio di stato di un servizio «Traffico» (Sito, Scheda Google) di un cliente.
// Le regole (transizioni ammesse, guard demo, date) stanno in lib/traffico.ts;
// qui solo input, codici HTTP e scrittura. Nessun GET: le pagine leggono il filesystem.

const Body = z.strictObject({ servizio: z.enum(SERVIZI), stato: StatoServizioTraffico });
const ATTESO = "atteso { servizio: sito | scheda, stato: spento | attivo | sospeso }";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  // CSRF: una pagina esterna aperta nel browser dell'operatore non deve poter scrivere
  // client.json. Sec-Fetch-Site ferma i browser moderni; il JSON obbligatorio impone il
  // preflight CORS (che fallisce) a qualunque richiesta cross-origin, anche senza quell'header.
  const sito = req.headers.get("sec-fetch-site");
  if (sito && sito !== "same-origin" && sito !== "none") {
    return NextResponse.json({ error: "richiesta da un'altra origine: il cambio di stato si fa solo dall'editor" }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "content-type non valido: atteso application/json" }, { status: 415 });
  }

  const { slug } = await ctx.params;
  let dir: string;
  try {
    dir = clientDir(slug);
  } catch {
    return NextResponse.json({ error: "slug non valido" }, { status: 400 });
  }
  if (!fs.existsSync(dir)) return NextResponse.json({ error: "cliente non trovato" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: `corpo non valido (non è JSON): ${ATTESO}` }, { status: 400 });
  }
  const body = Body.safeParse(raw);
  if (!body.success) {
    const dettaglio = body.error.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `corpo non valido (${dettaglio}): ${ATTESO}` }, { status: 400 });
  }

  // Fuori schema: il file non si tocca (stessa regola dell'hub), lo si dice.
  const corrotto = motivoCorrotto(slug);
  if (corrotto) {
    return NextResponse.json({ error: `client.json non leggibile (${corrotto}): correggi il file a mano prima di continuare` }, { status: 409 });
  }

  if (body.data.servizio === "sito") {
    const mappa = getRun(busIdTraffico(slug, "mappa"));
    if (mappa && !mappa.done) {
      return NextResponse.json({ error: "calcolo della mappa query in corso: fermalo dalla barra dei lavori o attendi che finisca prima di cambiare lo stato del Sito" }, { status: 409 });
    }
  }

  const stato = readClientState(slug);
  const esito = transizione(leggiTraffico(stato), body.data.servizio, body.data.stato, stato.percorso, new Date().toISOString());
  if (!esito.ok) return NextResponse.json({ error: esito.errore }, { status: esito.codice });

  try {
    const salvato = patchClientState(slug, (s) => {
      s.traffico = esito.traffico;
    });
    return NextResponse.json({ ok: true, traffico: salvato.traffico });
  } catch (e) {
    // Rete: patchClientState rifiuta un file diventato illeggibile nel frattempo (409);
    // ogni altro errore è di scrittura su disco (500), sempre con un messaggio leggibile.
    const messaggio = e instanceof Error ? e.message : String(e);
    const illeggibile = messaggio.startsWith("client.json non leggibile");
    return NextResponse.json(
      { error: illeggibile ? messaggio : `scrittura di client.json non riuscita: ${messaggio}` },
      { status: illeggibile ? 409 : 500 },
    );
  }
}
