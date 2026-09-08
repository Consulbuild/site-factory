import fs from "node:fs";
import path from "node:path";
import { OUT_DIR } from "./paths";
import { listClients } from "./clients";
import { leggiPortafoglio } from "./portafoglio";
import { attivo, demoScaduta } from "./portafoglio-shared";
import { spegniDemo } from "./deploy";

// Scadenza delle demo (decisione 2026-09-08): 15 giorni dalla pubblicazione,
// poi il worker «<slug>-demo» viene cancellato. Gira nel processo dell'editor
// (instrumentation.ts → ogni ora): l'editor è il solo posto con le chiavi
// Cloudflare e con lo stato dei clienti, e Mattia lo apre ogni giorno.
// Garanzie: si spegne SOLO ciò che demoScaduta() dice (mai percorso completo,
// mai con dominio, mai congelata) e, a Stripe raggiungibile, mai un cliente
// con abbonamento attivo; l'unico comando emesso è `wrangler delete <slug>-demo`.
// Ogni decisione finisce in out/.demo-sweep.log.

const LOG = path.join(OUT_DIR, ".demo-sweep.log");
const OGNI_MS = 60 * 60_000;
const PRIMO_GIRO_MS = 60_000;

export interface EsitoSweep {
  slug: string;
  esito: "spenta" | "saltata" | "errore" | "prova";
  motivo?: string;
}

function log(righe: EsitoSweep[], dryRun: boolean): void {
  if (!righe.length) return;
  const t = new Date().toISOString();
  const testo = righe.map((r) => `${t}\t${dryRun ? "prova" : "sweep"}\t${r.slug}\t${r.esito}${r.motivo ? `\t${r.motivo}` : ""}`).join("\n");
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.appendFileSync(LOG, testo + "\n");
  } catch {
    /* il log non deve mai bloccare lo spegnimento */
  }
}

/** Spegne le demo scadute. dryRun = elenca cosa farebbe senza toccare Cloudflare. */
export async function spegniDemoScadute(dryRun = false): Promise<EsitoSweep[]> {
  const clienti = listClients();
  const candidati = clienti.filter((c) => demoScaduta(c));
  if (!candidati.length) return [];

  // Ultima rete: Stripe. Se non risponde si procede lo stesso (il predicato
  // locale già esclude chi ha detto «si è abbonato» o ha un dominio online).
  const p = await leggiPortafoglio(clienti).catch(() => null);
  const esiti: EsitoSweep[] = [];
  for (const c of candidati) {
    if (p?.fonti.stripe.stato === "ok" && attivo(c, p)) {
      esiti.push({ slug: c.slug, esito: "saltata", motivo: "abbonamento Stripe attivo ma percorso ancora demo: segna «Il cliente si è abbonato»" });
      continue;
    }
    if (dryRun) {
      esiti.push({ slug: c.slug, esito: "prova", motivo: `scaduta il ${c.demo!.scadenza}` });
      continue;
    }
    try {
      await spegniDemo(c.slug);
      esiti.push({ slug: c.slug, esito: "spenta" });
    } catch (e) {
      esiti.push({ slug: c.slug, esito: "errore", motivo: e instanceof Error ? e.message : String(e) });
    }
  }
  log(esiti, dryRun);
  return esiti;
}

/** Timer orario, uno solo per processo (globalThis: sopravvive all'HMR come run-bus). */
export function avviaSweepDemo(): void {
  const g = globalThis as { __sfSweepDemo?: ReturnType<typeof setInterval> };
  if (g.__sfSweepDemo) return;
  const giro = () => void spegniDemoScadute().catch((e) => console.error("[demo-sweep]", e));
  setTimeout(giro, PRIMO_GIRO_MS).unref();
  g.__sfSweepDemo = setInterval(giro, OGNI_MS);
  g.__sfSweepDemo.unref();
}
