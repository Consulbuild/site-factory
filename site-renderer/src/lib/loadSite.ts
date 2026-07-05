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
