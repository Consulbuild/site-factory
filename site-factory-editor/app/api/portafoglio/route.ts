import { NextRequest, NextResponse } from "next/server";
import { listClients } from "@/lib/clients";
import { leggiPortafoglio, invalidaPortafoglio } from "@/lib/portafoglio";

export const dynamic = "force-dynamic";

/** Portafoglio per la home e per Impostazioni (abbonamenti, siti, lead, entrate,
 *  stato delle fonti). `?aggiorna=1` svuota la cache prima di leggere: è il
 *  pulsante «Aggiorna» / «Riprova». Mai un errore: le fonti giù arrivano come stato. */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("aggiorna") === "1") invalidaPortafoglio();
  const portafoglio = await leggiPortafoglio(listClients());
  return NextResponse.json(portafoglio, { headers: { "Cache-Control": "no-store" } });
}
