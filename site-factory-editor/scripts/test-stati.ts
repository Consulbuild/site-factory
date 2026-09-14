// Banco di prova deterministico della logica degli stati (nessuna rete, nessun
// cliente reale): staleness (snapshot con null, file comparsi/spariti, chiavi
// volatili, snapshot vecchi), flag «auto», stato dopo un run, decisione della
// catena su un passo.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-stati.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { computeUpstreamIn, diffUpstream, hashFile } from "../lib/staleness.ts";
import { marca, statoDopoRun, decidiPasso } from "../lib/stati.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}

console.log("staleness:");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sf-stati-"));
const scrivi = (f: string, v: unknown) => fs.writeFileSync(path.join(dir, f), JSON.stringify(v));
scrivi("a.json", { x: 1, verificato: false, generatedAt: "t0" });
scrivi("b.json", { y: 2 });
const FILES = ["a.json", "b.json", "c.json"];
const snap = computeUpstreamIn(dir, FILES);
caso("file mancante registrato come null", snap["c.json"] === null && typeof snap["a.json"] === "string", snap);
caso("stesso snapshot → nulla di stale", diffUpstream(computeUpstreamIn(dir, FILES), snap).length === 0);
scrivi("a.json", { x: 1, verificato: true, generatedAt: "t1" });
caso("solo chiavi volatili cambiate → non stale", diffUpstream(computeUpstreamIn(dir, FILES), snap).length === 0);
scrivi("a.json", { x: 2 });
caso("contenuto cambiato → stale", diffUpstream(computeUpstreamIn(dir, FILES), snap).join() === "a.json");
scrivi("c.json", { z: 3 });
caso("file comparso dopo lo snapshot → stale", diffUpstream(computeUpstreamIn(dir, FILES), snap).includes("c.json"));
fs.rmSync(path.join(dir, "b.json"));
caso("file sparito dopo lo snapshot → stale", diffUpstream(computeUpstreamIn(dir, FILES), snap).includes("b.json"));
const vecchio = { "a.json": snap["a.json"], "b.json": snap["b.json"] } as Record<string, string | null>;
scrivi("a.json", { x: 1, verificato: false, generatedAt: "t0" });
scrivi("b.json", { y: 2 });
caso("snapshot vecchio senza la chiave → il file nuovo NON è stale", !diffUpstream(computeUpstreamIn(dir, FILES), vecchio).includes("c.json"));
caso("senza snapshot → nulla", diffUpstream(computeUpstreamIn(dir, FILES), undefined).length === 0);
fs.writeFileSync(path.join(dir, "rotto.json"), "{ non json");
caso("JSON non parsabile → hash null", hashFile(path.join(dir, "rotto.json")) === null);
fs.rmSync(dir, { recursive: true, force: true });

console.log("\nmarca:");
const s1: { autoConferma?: boolean } = {};
marca(s1, true);
caso("auto:true imposta il flag", s1.autoConferma === true);
marca(s1, undefined);
caso("conferma umana cancella il flag", !("autoConferma" in s1));
const s2: { autoConferma?: boolean } = { autoConferma: true };
marca(s2, false);
caso("auto:false cancella il flag", !("autoConferma" in s2));

console.log("\nstatoDopoRun:");
caso("critico su verificato, ok → resta verificato", statoDopoRun("critic", "verificato", true) === "verificato");
caso("critico su verificato, fallito → resta verificato", statoDopoRun("critic", "verificato", false) === "verificato");
caso("critico su da_verificare → resta da_verificare", statoDopoRun("critic", "da_verificare", true) === "da_verificare" && statoDopoRun("critic", "da_verificare", false) === "da_verificare");
caso("critico su errore, ok → da_verificare", statoDopoRun("critic", "errore", true) === "da_verificare");
caso("critico su errore, fallito → errore", statoDopoRun("critic", "errore", false) === "errore");
for (const m of ["generate", "update", "regen", "partial"] as const) {
  caso(`${m} ok → da_verificare`, statoDopoRun(m, "verificato", true) === "da_verificare");
}
caso("generate fallito → errore", statoDopoRun("generate", "verificato", false) === "errore");

console.log("\ndecidiPasso:");
caso("verificato, non stale → gia_verificato", decidiPasso("verificato", undefined, null) === "gia_verificato");
caso("verificato ma stale → stale", decidiPasso("verificato", undefined, "copy cambiato a monte") === "stale");
caso("da_verificare ma stale → stale", decidiPasso("da_verificare", undefined, "x") === "stale");
caso("da_verificare, non stale → giudica", decidiPasso("da_verificare", undefined, null) === "giudica");
caso("assente → run (anche con stale)", decidiPasso("assente", undefined, "x") === "run" && decidiPasso("assente", undefined, null) === "run");
caso("errore → run", decidiPasso("errore", undefined, null) === "run");
caso("rifare:true prevale (anche su verificato)", decidiPasso("verificato", true, null) === "run");
caso("rifare:false → gia_verificato (anche se stale)", decidiPasso("verificato", false, "x") === "gia_verificato");

console.log(`\n${passati} passati, ${falliti} falliti`);
if (falliti) process.exit(1);
