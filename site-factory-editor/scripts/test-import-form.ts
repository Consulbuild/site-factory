// Banco di prova dell'import dal form (lib/inbox-form.ts): _inbox finta in una cartella
// temporanea (SF_INBOX_DIR), fixture scripts/fixtures/lead-form.json + foto di prova del
// form, import in out/zz-test-form-s-r-l/, controlli, pulizia.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-import-form.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sf-inbox-"));
process.env.SF_INBOX_DIR = tmp;
const { listLeadsForm, importLeadForm, isLeadForm, LeadNonPronto, TESTI } = await import("../lib/inbox-form.ts");
const { OUT_DIR } = await import("../lib/paths.ts");

// Guardia di deriva: la copia dei testi nell'editor deve coincidere con la tassonomia del form.
const T = await import("../../site-intake/src/data/tassonomia.ts");
const mappa = (l: readonly { id: string; testo: string }[]) => Object.fromEntries(l.map((o) => [o.id, o.testo]));
const mappaBrief = (l: readonly { id: string; testo: string; valoreBrief?: string }[]) => Object.fromEntries(l.map((o) => [o.id, o.valoreBrief ?? o.testo]));
assert.deepEqual(TESTI, {
  mestieri: mappa(T.MESTIERI),
  lavori: Object.fromEntries(Object.entries(T.LAVORI).map(([k, l]) => [k, mappa(l)])),
  anni: mappaBrief(T.ANNI),
  punti: mappa(T.PUNTI_DI_FORZA),
  clienti: mappa(T.CLIENTI),
  stili: mappaBrief(T.STILI),
  colori: mappa(T.COLORI),
  contatto: mappaBrief(T.CONTATTO),
}, "TESTI in lib/inbox-form.ts non coincide più con site-intake/src/data/tassonomia.ts: aggiornare la copia");

const FIX = path.join(import.meta.dirname, "fixtures");
const FOTO = path.resolve(import.meta.dirname, "../../site-intake/tests/fixtures");
const lead = JSON.parse(fs.readFileSync(path.join(FIX, "lead-form.json"), "utf8"));
const id: string = lead.leadId;
const dir = path.join(tmp, id);
fs.mkdirSync(dir);
fs.writeFileSync(path.join(dir, "lead.json"), JSON.stringify(lead));
fs.mkdirSync(path.join(tmp, "abbandonata-0001"));
fs.writeFileSync(path.join(tmp, "abbandonata-0001", "bozza.json"), "{}");
// Nomi come li scrive n8n: foto-NN-<nome pulito>, logo.<ext>
fs.copyFileSync(path.join(FOTO, "lavoro-2.jpg"), path.join(dir, "foto-02-lavoro-2.jpg"));
fs.copyFileSync(path.join(FOTO, "logo.png"), path.join(dir, "logo.png"));

const slug = "zz-test-form-s-r-l";
const dest = path.join(OUT_DIR, slug);
fs.rmSync(dest, { recursive: true, force: true });
let ok = false;
try {
  const lista = listLeadsForm();
  assert.equal(lista.length, 1, "solo le richieste con lead.json");
  assert.deepEqual(lista[0], { id, submittedAt: lead.inviatoAt, businessName: "ZZ Test Form S.r.l.", ownerName: "Mario Rossi", phone: "3888937188", fonte: "form" });
  assert.equal(isLeadForm(id), true);
  assert.equal(isLeadForm("abbandonata-0001"), false);

  // Foto 1 non ancora scaricata da Drive → rifiuto senza scrivere nulla
  assert.throws(() => importLeadForm(id), LeadNonPronto);
  assert.equal(fs.existsSync(dest), false);
  fs.copyFileSync(path.join(FOTO, "lavoro-1.jpg"), path.join(dir, "foto-01-lavoro-1.jpg"));

  assert.equal(importLeadForm(id), slug);
  const leggi = (f: string) => JSON.parse(fs.readFileSync(path.join(dest, f), "utf8"));
  const brief = leggi("brief.json");
  assert.equal(brief.settore, "Ristrutturazioni");
  assert.deepEqual(brief.servizi, ["Bagni", "Cucine", "Piscine"]);
  assert.equal(brief.indirizzo, "Via Milano 89, 20093 Cologno Monzese (MI)");
  assert.equal(brief.citta, "Cologno Monzese");
  assert.equal(brief.esperienza_anni, "4-10");
  assert.equal(brief.tono_preferito, "Elegante e sofisticato, Tecnico e professionale");
  assert.equal(brief.colori, "Oro, Nero");
  assert.deepEqual(brief.punti_di_forza, ["Un solo referente", "Certificazioni: SOA OG1"]);
  assert.equal(brief.clienti, "Privati, Agenzie immobiliari");
  assert.equal(brief.ricontatto_preferito, "WhatsApp");
  assert.equal(brief.dominio_scelto, "zz-test-form.it (sconosciuto)");
  assert.equal(brief.descrizione, "");
  assert.equal(brief.logo, "Sì (dal form)");
  assert.equal(brief.foto_professionali, "2 foto dal form");
  assert.ok(brief._da_verificare.some((f: string) => f.includes("non verificabile")), "flag nome sito");
  assert.ok(brief._da_verificare.some((f: string) => f.startsWith("foto arrivate 2 su 3")), "flag foto mancanti");
  assert.ok(brief._da_verificare.some((f: string) => f === "e-mail assente"), "flag e-mail");
  const intake = leggi("intake.json");
  assert.equal(intake["meta.slug"], slug);
  assert.deepEqual(intake["brand.logo"], { src: "./logo.png", alt: "Logo ZZ Test Form S.r.l." });
  assert.deepEqual(intake["contact.social"], { instagram: "https://www.instagram.com/zztestform" });
  assert.equal(leggi("raw-submission.json").leadId, id);
  assert.deepEqual(leggi("lavori.json"), [
    { file: "lavoro-1.jpg", alt: "", caption: "" },
    { file: "lavoro-2.jpg", alt: "", caption: "" },
  ]);
  for (const f of ["logo.png", "img/lavoro-1.jpg", "img/lavoro-2.jpg", "foto-originali/foto-01-lavoro-1.jpg", "foto-originali/foto-02-lavoro-2.jpg", "client.json"]) {
    assert.ok(fs.existsSync(path.join(dest, f)), `manca ${f}`);
  }
  assert.equal(leggi("client.json").steps.intake.stato, "da_verificare");
  assert.equal(fs.existsSync(dir), false, "cartella tolta da _inbox");
  assert.equal(listLeadsForm().length, 0);
  ok = true;
  console.log("✓ import dal form: lista, sincronizzazione, brief, intake, foto, logo, client.json, pulizia _inbox");
} finally {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (!ok) process.exitCode = 1;
}
