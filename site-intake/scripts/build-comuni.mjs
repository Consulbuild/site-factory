#!/usr/bin/env node
// Prepara i dati per la domanda «Dov'è la sede» (docs «Domande del form bozza» v4,
// domanda 5): il comune si sceglie da un elenco ufficiale, che si trova SEMPRE.
// Fonte: data-src/comuni.json (dati ISTAT integrati con i CAP ANCI, vedi
// data-src/README.md). Uscita:
//   public/data/comuni/<iniziale>.json  un file per lettera iniziale (a…z), così il
//                                       browser scarica 3-40 KB solo quando l'utente
//                                       inizia a scrivere, mai 650 KB in blocco;
//   public/data/province.json           le province con la regione, per i riquadri
//                                       «In quali zone lavori?».
// Formato di ogni comune: [nome, siglaProvincia, nomeProvincia, regione, cap, multiCap]
// (multiCap=1 → città con più CAP: il CAP esatto lo ricava l'operatore dalla via).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data-src", "comuni.json");
const OUT_DIR = join(ROOT, "public", "data", "comuni");
const OUT_PROV = join(ROOT, "public", "data", "province.json");

/** Iniziale normalizzata: senza accenti, minuscola, solo a-z (altro → "_"). */
export const iniziale = (nome) => {
  const c = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()[0] ?? "_";
  return /[a-z]/.test(c) ? c : "_";
};

const comuni = JSON.parse(readFileSync(SRC, "utf8"));
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const perLettera = new Map();
const province = new Map();
for (const c of comuni) {
  const riga = [c.nome, c.sigla, c.provincia.nome, c.regione.nome, c.cap?.[0] ?? "", c.cap?.length > 1 ? 1 : 0];
  const k = iniziale(c.nome);
  if (!perLettera.has(k)) perLettera.set(k, []);
  perLettera.get(k).push(riga);
  province.set(c.sigla, { sigla: c.sigla, nome: c.provincia.nome, regione: c.regione.nome });
}

let totale = 0;
for (const [k, righe] of [...perLettera].sort()) {
  righe.sort((a, b) => a[0].localeCompare(b[0], "it"));
  const json = JSON.stringify(righe);
  writeFileSync(join(OUT_DIR, `${k}.json`), json);
  totale += righe.length;
}
const prov = [...province.values()].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
writeFileSync(OUT_PROV, JSON.stringify(prov));
console.log(`comuni: ${totale} in ${perLettera.size} file · province: ${prov.length}`);
