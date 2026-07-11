// Accettazione M8 (deterministica, senza AI):
//  1. stesso contesto.json ⇒ stesso design.json, a ogni run;
//  2. due clienti con STESSO settore+comune ⇒ combo preset+hue differenziate
//     (vincolo anti-collisione sulla tinta o preset diverso), con motivazione;
//  3. l'override umano si riflette nel design e nel registro.
// Le fixture vivono in out/zz-test-m8-* e si ripuliscono a fine check
// (registro incluso): zero dati sporchi.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/check-assign.ts

import fs from "node:fs";
import path from "node:path";
import { OUT_DIR } from "../lib/paths.ts";
import { FACTORY_ROOT } from "../lib/factory/paths.ts";
import { assignDesign, writeDesign, registraAssegnazione, readDesign, hueBucket } from "../lib/assign-design.ts";

const ASSIGNMENTS = path.join(FACTORY_ROOT, "assignments.json");
const registroPrima = fs.existsSync(ASSIGNMENTS) ? fs.readFileSync(ASSIGNMENTS, "utf8") : null;

const contestoBase = {
  version: 1,
  generatedAt: "",
  submissionId: "test-m8",
  verificato: true,
  identita: { frase: "Impresa di impianti elettrici e domotica per case e uffici.", fonte: ["descrizione"] },
  settore_normalizzato: "Impianti",
  sottosettore: "Impianti elettrici e domotica",
  servizi_atomizzati: [{ servizio: "Impianti elettrici", fonte: "servizi" }],
  macro_categorie: [
    { nome: "Impianti elettrici", servizi: ["Impianti elettrici"] },
    { nome: "Domotica", servizi: [] },
    { nome: "Assistenza", servizi: [] },
  ],
  target: { tipo: "entrambi", descrizione: "privati e aziende, interventi smart e certificati", tipo_lavori: "" },
  zona: { sede: "Monza", area_intervento: "Brianza" },
  punti_di_forza: [],
  promesse_consentite: [],
  promesse_vietate: [],
  promessa_martello: "",
  tono: { registro: "tecnico e professionale, moderno", da_evitare: "" },
  materiali: { logo: false, foto_reali: "", colori: "" },
  note_operatore: "",
};

const fixture = (slug: string) => {
  const dir = path.join(OUT_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "contesto.json"), JSON.stringify(contestoBase, null, 2));
  return dir;
};

let falliti = 0;
const check = (nome: string, ok: boolean, dettaglio = "") => {
  console.log(`${ok ? "ok " : "FAIL"}  ${nome}${dettaglio ? ` — ${dettaglio}` : ""}`);
  if (!ok) falliti++;
};

const [dirA, dirB] = [fixture("zz-test-m8-a"), fixture("zz-test-m8-b")];
try {
  // 1. determinismo: stesso contesto ⇒ stesso esito (campi stabili)
  const a1 = assignDesign("zz-test-m8-a");
  const a2 = assignDesign("zz-test-m8-a");
  const stabile = (d: ReturnType<typeof assignDesign>) =>
    JSON.stringify({ p: d.preset, v: d.version, m: d.motivo, alt: d.alternativeScartate, h: d.vincoliPalette });
  check("determinismo (stessa assegnazione due volte)", stabile(a1) === stabile(a2), a1.preset);
  check("motivo leggibile presente", a1.motivo.includes("scelto") && a1.motivo.length > 40);
  check("alternative scartate con perché", a1.alternativeScartate.length > 0);

  // 2. anti-collisione: A si registra con una tinta; B (stesso mercato) deve
  //    ricevere il vincolo sulla stessa combo preset+hue
  writeDesign("zz-test-m8-a", a1);
  registraAssegnazione("zz-test-m8-a", hueBucket("#1e3a8a")); // blu (bucket 7)
  const b = assignDesign("zz-test-m8-b");
  const combinazioneDiversa =
    b.preset !== a1.preset || b.vincoliPalette.hueBucketEvitare.includes(hueBucket("#1e3a8a"));
  check(
    "anti-collisione stesso mercato (combo preset+hue differenziata)",
    combinazioneDiversa,
    b.preset === a1.preset
      ? `stesso preset ${b.preset}, hue vietati: [${b.vincoliPalette.hueBucketEvitare.join(", ")}]`
      : `preset diverso: ${a1.preset} vs ${b.preset}`,
  );

  // 3. override umano registrato
  writeDesign("zz-test-m8-b", b);
  const altro = b.preset === "terra" ? "vita" : "terra";
  writeDesign("zz-test-m8-b", { ...b, preset: altro, motivo: `override umano (da «${b.preset}» a «${altro}»)` });
  registraAssegnazione("zz-test-m8-b", null);
  const bDopo = readDesign("zz-test-m8-b");
  const registro = JSON.parse(fs.readFileSync(ASSIGNMENTS, "utf8"));
  const voce = registro.assegnazioni.find((x: { slug: string }) => x.slug === "zz-test-m8-b");
  check("override nel design.json", bDopo?.preset === altro && (bDopo?.motivo ?? "").includes("override umano"));
  check("override nel registro", voce?.preset === altro);
} finally {
  fs.rmSync(dirA, { recursive: true, force: true });
  fs.rmSync(dirB, { recursive: true, force: true });
  if (registroPrima === null) fs.rmSync(ASSIGNMENTS, { force: true });
  else fs.writeFileSync(ASSIGNMENTS, registroPrima);
}

console.log(falliti ? `check-assign: ${falliti} FALLITI` : "check-assign: tutto ok");
process.exit(falliti ? 1 : 0);
