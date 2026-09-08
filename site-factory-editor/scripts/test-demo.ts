// Banco di prova deterministico della modalità demo (nessuna rete): predicato
// di scadenza del sweep ed etichetta dell'host demo dal nome dell'azienda.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-demo.ts
import { demoScaduta, isDemo, etichettaDemo, type ClienteMin } from "../lib/portafoglio-shared.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}

const ORA = Date.parse("2026-09-24T12:00:00Z");
const IERI = "2026-09-23T12:00:00Z";
const DOMANI = "2026-09-25T12:00:00Z";
const demo = (over: Partial<NonNullable<ClienteMin["demo"]>> = {}): NonNullable<ClienteMin["demo"]> => ({
  url: "https://x.demo.consulbuild.com",
  scadenza: IERI,
  ...over,
});

console.log("\ndemoScaduta (il sweep spegne SOLO questi):");
caso("demo accesa e scaduta, percorso demo, senza dominio → sì", demoScaduta({ slug: "a", percorso: "demo", demo: demo() }, ORA));
caso("scadenza domani → no", !demoScaduta({ slug: "a", percorso: "demo", demo: demo({ scadenza: DOMANI }) }, ORA));
caso("già spenta → no", !demoScaduta({ slug: "a", percorso: "demo", demo: demo({ spentaAt: IERI }) }, ORA));
caso("congelata («si è abbonato») → no", !demoScaduta({ slug: "a", percorso: "demo", demo: demo({ congelata: true }) }, ORA));
caso("percorso completo → no", !demoScaduta({ slug: "a", percorso: "completo", demo: demo() }, ORA));
caso("dominio pubblicato → no", !demoScaduta({ slug: "a", percorso: "demo", demo: demo(), steps: { build: { deploy: { url: "https://x.it", dominio: "x.it" } } } }, ORA));
caso("nessuna demo → no", !demoScaduta({ slug: "a", percorso: "demo" }, ORA));
caso("scadenza non valida → no", !demoScaduta({ slug: "a", percorso: "demo", demo: demo({ scadenza: "boh" }) }, ORA));
caso("percorso assente (cliente storico) conta come demo se accesa e scaduta", demoScaduta({ slug: "a", demo: demo() }, ORA));

console.log("\nisDemo (card «Da sviluppare», hub):");
caso("demo accesa → sì", isDemo({ slug: "a", demo: demo() }));
caso("demo spenta, niente workers.dev → no", !isDemo({ slug: "a", demo: demo({ spentaAt: IERI }) }));
caso("storico: workers.dev senza dominio → sì", isDemo({ slug: "a", steps: { build: { deploy: { url: "https://a.x.workers.dev" } } } }));
caso("dominio online → no", !isDemo({ slug: "a", demo: demo(), steps: { build: { deploy: { url: "https://x.it", dominio: "x.it" } } } }));

console.log("\netichettaDemo (host <etichetta>.demo.consulbuild.com dal nome azienda):");
const e = (v: unknown) => etichettaDemo(v, "slug-di-riserva");
caso("«Cavaliere Build Srls» → cavaliere-build-srls", e("Cavaliere Build Srls") === "cavaliere-build-srls", e("Cavaliere Build Srls"));
caso("«COSTRUZIONI GENERALI A. L. DI LA CECILIA GIOVANNI» → tronca a 40 senza trattino finale", e("COSTRUZIONI GENERALI A. L. DI LA CECILIA GIOVANNI") === "costruzioni-generali-a-l-di-la-cecilia-g", e("COSTRUZIONI GENERALI A. L. DI LA CECILIA GIOVANNI"));
caso("accenti e simboli: «Edil Casà & Figli S.n.c.» → edil-casa-figli-s-n-c", e("Edil Casà & Figli S.n.c.") === "edil-casa-figli-s-n-c", e("Edil Casà & Figli S.n.c."));
caso("vuoto → slug", e("") === "slug-di-riserva");
caso("undefined → slug", e(undefined) === "slug-di-riserva");
caso("solo simboli → slug", e("--- ***") === "slug-di-riserva", e("--- ***"));

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
