// validate-site.ts — valida un site.json contro il contratto schema.ts (parseSiteConfig).
// È il gate di produzione della pipeline Fase B: l'output degli agenti deve passare qui.
// Uso: node --experimental-strip-types scripts/validate-site.ts <path-al-site.json>
// Exit 0 se valido; 1 con l'errore Zod leggibile altrimenti.
import { readFileSync } from "node:fs";
import { parseSiteConfig } from "../src/lib/schema.ts";

const path = process.argv[2];
if (!path) {
  console.error("uso: node --experimental-strip-types scripts/validate-site.ts <site.json>");
  process.exit(2);
}
try {
  const cfg = parseSiteConfig(JSON.parse(readFileSync(path, "utf8")));
  const types = cfg.sections.map((s) => s.type).join(", ");
  console.log(`OK — site.json valido · ${cfg.sections.length} sezioni · preset "${cfg.brand.preset}" · ${cfg.meta.businessName}`);
  console.log(`   sezioni: ${types}`);
  process.exit(0);
} catch (e) {
  console.error("site.json INVALIDO:\n");
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
