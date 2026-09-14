// loadSite.ts — carica e valida il site.json del sito da buildare.
// Default: il blueprint golden (identico a prima). Con la env var SITE_JSON
// (path assoluto) il renderer builda il sito di un cliente della pipeline:
//   SITE_JSON=/path/al/site.json npx astro build --outDir /path/dist
// readFileSync (non import statico): il path è noto solo a runtime di build.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSiteConfig, type SiteConfig } from "./schema";

const BLUEPRINT = fileURLToPath(
  new URL("../../blueprints/conversione-locale-v1/blueprint.json", import.meta.url),
);

export const siteData: unknown = JSON.parse(readFileSync(process.env.SITE_JSON ?? BLUEPRINT, "utf8"));
export const site: SiteConfig = parseSiteConfig(siteData);

// DATI_STRUTTURATI_JSON (path assoluto): JSON-LD dell'attività per la home, generato
// dall'editor SOLO con le fondamenta SEO del servizio Traffico «Sito» accese
// (site-factory-editor/lib/fondamenta.ts). Assente = nessun dato strutturato, come prima.
export const datiStrutturati: Record<string, unknown> | null = process.env.DATI_STRUTTURATI_JSON
  ? JSON.parse(readFileSync(process.env.DATI_STRUTTURATI_JSON, "utf8"))
  : null;
