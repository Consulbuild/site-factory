// Setup Umami per il form bozza (sito.consulbuild.com): crea il sito «Form bozza» se
// manca e i report Funnel (23 passi come URL virtuali) e Percorsi. Idempotente:
// rilanciarlo aggiorna il funnel se le domande cambiano. Utente e password: gli stessi
// dell'editor (`site-factory`, UMAMI_PASSWORD nel Keychain).
//
//   cd site-factory-editor
//   node --experimental-strip-types scripts/umami-form-setup.ts
//
// Se la versione di Umami sul VPS rifiuta la creazione dei report via API, lo script
// stampa la ricetta per farli a mano (2 minuti nell'interfaccia).
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { umami, umamiLogin, UMAMI_HOST } from "../lib/integrazioni.ts";

export const DOMINIO_FORM = "sito.consulbuild.com";
const NOME_SITO = "Form bozza";

/** Gli id delle domande, nell'ordine del form, letti da domande.ts (specchio, mai a mano). */
export function passiDelForm(): { n: number; id: string }[] {
  const src = fs.readFileSync(path.join(REPO_ROOT, "site-intake/src/data/domande.ts"), "utf8");
  const ids = [...src.matchAll(/^\s+id: "([a-z_]+)",\s*$/gm)].map((m) => m[1] as string);
  return [...ids, "riepilogo", "fatto"].map((id, i) => ({ n: i + 1, id }));
}
export const urlPasso = (n: number, id: string) => `/passo/${String(n).padStart(2, "0")}-${id}`;

type Website = { id: string; name: string; domain: string };

export async function sitoFormUmami(token: string): Promise<Website | null> {
  const r = await umami(token, "/websites?pageSize=200");
  if (!r.ok) throw new Error(`Umami: elenco siti fallito (${r.status})`);
  const j = (await r.json()) as { data?: Website[] } | Website[];
  const lista = Array.isArray(j) ? j : (j.data ?? []);
  return lista.find((w) => w.domain === DOMINIO_FORM) ?? null;
}

async function main() {
  const token = await umamiLogin();
  let sito = await sitoFormUmami(token);
  if (!sito) {
    const c = await umami(token, "/websites", { method: "POST", body: JSON.stringify({ name: NOME_SITO, domain: DOMINIO_FORM }) });
    if (!c.ok) throw new Error(`Umami: creazione del sito fallita (${c.status})`);
    sito = (await c.json()) as Website;
    console.log(`Sito creato: ${sito.name} <${sito.domain}> id ${sito.id}`);
  } else {
    console.log(`Sito già presente: ${sito.name} <${sito.domain}> id ${sito.id}`);
  }
  console.log(`→ PUBLIC_UMAMI_WEBSITE_ID=${sito.id} (default in site-intake/src/layouts/Base.astro)`);

  const passi = passiDelForm();
  const steps = passi.map((p) => ({ type: "url", value: urlPasso(p.n, p.id) }));
  const oggi = new Date();
  const dateRange = { value: "30day", startDate: new Date(oggi.getTime() - 30 * 864e5).toISOString(), endDate: oggi.toISOString() };
  const report = async (nome: string, corpo: Record<string, unknown>) => {
    const esistenti = await umami(token, `/reports?websiteId=${sito!.id}&pageSize=100`);
    const lista = esistenti.ok ? (((await esistenti.json()) as { data?: { id: string; name: string }[] }).data ?? []) : [];
    const vecchio = lista.find((x) => x.name === nome);
    const r = await umami(token, vecchio ? `/reports/${vecchio.id}` : "/reports", {
      method: "POST",
      body: JSON.stringify({ websiteId: sito!.id, name: nome, ...corpo }),
    });
    console.log(`Report «${nome}»: ${vecchio ? "aggiornato" : "creato"} → ${r.status}${r.ok ? "" : ` ${(await r.text()).slice(0, 200)}`}`);
    return r.ok;
  };
  const okFunnel = await report(`Funnel form (${passi.length} passi)`, {
    type: "funnel",
    description: "Quante visite arrivano a ogni passo del form: la caduta tra un passo e l'altro dice quale domanda ferma.",
    parameters: { window: 60, steps, dateRange },
  });
  const okJourney = await report("Percorsi nel form", {
    type: "journey",
    description: "Sequenze di passi più frequenti, dal primo all'ultimo.",
    parameters: { steps: 5, startStep: urlPasso(1, passi[0]?.id ?? "mestiere"), endStep: urlPasso(passi.length, "fatto"), dateRange },
  });
  if (!okFunnel || !okJourney) {
    console.log(`\nRicetta manuale (${UMAMI_HOST} → Reports → Create report):`);
    console.log(`- Funnel: sito «${NOME_SITO}», finestra 60 minuti, un passo per URL nell'ordine:\n  ${steps.map((s) => s.value).join("\n  ")}`);
    console.log(`- Journey: sito «${NOME_SITO}», passi 5, inizio ${urlPasso(1, passi[0]?.id ?? "mestiere")}, fine ${urlPasso(passi.length, "fatto")}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith("umami-form-setup.ts")) {
  main().catch((e) => {
    console.error("ERRORE:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
