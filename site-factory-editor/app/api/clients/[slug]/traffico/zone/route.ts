import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { z } from "zod";
import { clientDir } from "@/lib/paths";
import { MAX_CARATTERI, MAX_ETICHETTE, anteprimaEtichetta, salvaZoneServite } from "@/lib/zone-servite";

export const dynamic = "force-dynamic";

// Zone servite di un cliente (docs/traffico/piano-T3.md §5, decisione 14: niente «ricalcola»).
// Traduzione, provenienza e scrittura stanno in lib/zone-servite.ts; qui solo input, codici
// HTTP e messaggi. Nessun GET: la pagina legge il filesystem.
//   anteprima { etichetta }           → 200 { riga }, nessuna scrittura
//   salva     { etichette, impronta } → 200 { zone } | 409 lead cambiato o file fuori schema | 422 non riconosciute

const Body = z.discriminatedUnion("azione", [
  z.strictObject({ azione: z.literal("anteprima"), etichetta: z.string().max(MAX_CARATTERI) }),
  z.strictObject({
    azione: z.literal("salva"),
    etichette: z.array(z.string().max(MAX_CARATTERI)).min(1).max(MAX_ETICHETTE),
    impronta: z.string().regex(/^[0-9a-f]{64}$/),
  }),
]);
const ATTESO = `atteso { azione: "anteprima", etichetta } oppure { azione: "salva", etichette: 1-${MAX_ETICHETTE} testi, impronta }, testi di al massimo ${MAX_CARATTERI} caratteri`;

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  // CSRF come la route traffico: Sec-Fetch-Site ferma i browser moderni, il JSON obbligatorio
  // impone il preflight CORS (che fallisce) a qualunque richiesta cross-origin.
  const sito = req.headers.get("sec-fetch-site");
  if (sito && sito !== "same-origin" && sito !== "none") {
    return NextResponse.json({ error: "richiesta da un'altra origine: le zone servite si cambiano solo dall'editor" }, { status: 403 });
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

  try {
    if (body.data.azione === "anteprima") {
      const esito = anteprimaEtichetta(dir, body.data.etichetta);
      return esito.ok ? NextResponse.json({ riga: esito.riga }) : NextResponse.json({ error: esito.errore }, { status: esito.codice });
    }
    const esito = salvaZoneServite(dir, body.data.etichette, body.data.impronta, new Date().toISOString());
    if (!esito.ok) return NextResponse.json({ error: esito.errore, nonRiconosciute: esito.nonRiconosciute }, { status: esito.codice });
    return NextResponse.json({ zone: esito.zone });
  } catch (e) {
    // Disco (mkdir, scrittura, rename): sempre un messaggio leggibile.
    return NextResponse.json({ error: `scrittura delle zone servite non riuscita: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
