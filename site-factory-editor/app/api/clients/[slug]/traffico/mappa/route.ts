import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { clientDir } from "@/lib/paths";
import { motivoCorrotto, readClientState } from "@/lib/clients";
import { leggiTraffico } from "@/lib/traffico";
import { busIdTraffico, getRun, startTrafficoRun } from "@/lib/run-bus";
import { creaClientDfs } from "@/lib/dataforseo";
import { FILE_COSTI } from "@/lib/mappa-query";
import { escludiRicerca, eseguiMappa, leggiIngressi, riammettiRicerca } from "@/lib/mappa-lavoro";

export const dynamic = "force-dynamic";

// Mappa query → pagine di un cliente (docs/traffico/piano-T4.md §7 e §10). Le regole stanno in lib/mappa-query.ts e
// lib/mappa-lavoro.ts; qui solo input, codici HTTP e messaggi. Nessun GET: la pagina legge il filesystem.
//   calcola                    → 202 { id } (lavoro traffico:<slug>:mappa sul run-bus)
//   escludi  { testo, motivo } → 200 { ok, stato, target }, nessuna chiamata a DataForSEO
//   riammetti { testo }        → 200 { ok, stato, target }, nessuna chiamata a DataForSEO
// 409: client.json illeggibile, Sito non attivo, blocco (zone, contesto, chiavi), calcolo in corso, mappa assente.
// 422: ricerca non nell'universo o non tra le escluse, motivo non valido.

const Body = z.discriminatedUnion("azione", [
  z.strictObject({ azione: z.literal("calcola") }),
  z.strictObject({ azione: z.literal("escludi"), testo: z.string().min(2).max(200), motivo: z.string().max(400) }),
  z.strictObject({ azione: z.literal("riammetti"), testo: z.string().min(2).max(200) }),
]);
const ATTESO = 'atteso { azione: "calcola" } oppure { azione: "escludi", testo, motivo } oppure { azione: "riammetti", testo }';

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  // CSRF come le altre route Traffico: Sec-Fetch-Site ferma i browser moderni, il JSON obbligatorio impone il preflight.
  const sito = req.headers.get("sec-fetch-site");
  if (sito && sito !== "same-origin" && sito !== "none") {
    return NextResponse.json({ error: "richiesta da un'altra origine: la mappa si calcola solo dall'editor" }, { status: 403 });
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

  const corrotto = motivoCorrotto(slug);
  if (corrotto) return NextResponse.json({ error: `client.json non leggibile (${corrotto}): correggi il file a mano prima di continuare` }, { status: 409 });
  const stato = readClientState(slug);
  const statoSito = leggiTraffico(stato).sito.stato;
  const inCorso = getRun(busIdTraffico(slug, "mappa"));
  if (inCorso && !inCorso.done) return NextResponse.json({ error: "Calcolo della mappa in corso: riprova quando finisce" }, { status: 409 });

  try {
    if (body.data.azione === "calcola") {
      const configurata = creaClientDfs({ costi: null }).configurata();
      const letti = leggiIngressi(dir, { sito: statoSito, dominio: stato.steps.build.deploy?.dominio ?? null, configurata });
      if (!letti.ok) return NextResponse.json({ error: letti.blocco.motivo, codice: letti.blocco.codice }, { status: 409 });
      let azienda = slug;
      try {
        const brief = JSON.parse(fs.readFileSync(path.join(dir, "brief.json"), "utf8")) as { azienda?: unknown };
        if (typeof brief.azienda === "string" && brief.azienda.trim()) azienda = brief.azienda.trim();
      } catch {
        /* brief assente: resta lo slug */
      }
      const avvio = startTrafficoRun(slug, "mappa", azienda, (signal) =>
        eseguiMappa(letti.ingressi, creaClientDfs({ costi: { file: path.join(dir, FILE_COSTI), lavoro: "mappa" }, signal }), { signal }),
      );
      if ("error" in avvio) return NextResponse.json({ error: `Calcolo non avviato: ${avvio.error}` }, { status: 409 });
      return NextResponse.json({ id: avvio.id }, { status: 202 });
    }

    if (statoSito !== "attivo") {
      const errore = statoSito === "sospeso" ? "Servizio Sito sospeso: la mappa resta com'è" : "Il servizio Sito non è attivo";
      return NextResponse.json({ error: errore }, { status: 409 });
    }
    const adesso = new Date().toISOString();
    const esito = body.data.azione === "escludi" ? escludiRicerca(dir, body.data.testo, body.data.motivo, adesso) : riammettiRicerca(dir, body.data.testo, adesso);
    if (!esito.ok) return NextResponse.json({ error: esito.errore }, { status: esito.codice });
    return NextResponse.json({ ok: true, stato: esito.mappa.stato, target: esito.mappa.target.length });
  } catch (e) {
    return NextResponse.json({ error: `mappa non aggiornata: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
