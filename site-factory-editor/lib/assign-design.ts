import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { OUT_DIR } from "./paths.ts";
import { PRESETS_MANIFEST, FACTORY_ROOT } from "./factory/paths.ts";
import type { Contesto } from "./schemas";

// Assegnazione deterministica cliente→design (M8): ZERO AI a runtime.
// contesto.json (vettore Aaker o fallback dal tono) → hard filter
// (antiPatterns/stato) → scoring distanza Aaker (primaria ×2, bonus settore)
// → anti-collisione sul registro (stesso mercato = macro-settore+comune:
// vietata la stessa combo preset+hue-bucket; si differenzia nell'ordine
// palette → preset) → tie-break con seed=slug. Stesso contesto ⇒ stesso
// design.json, sempre.

const DIMENSIONI = ["sincerity", "excitement", "competence", "sophistication", "ruggedness"] as const;
type Dimensione = (typeof DIMENSIONI)[number];
export type Aaker = Record<Dimensione, number> & { primaria: Dimensione };

export interface DesignAssegnato {
  preset: string;
  version: string;
  seed: string;
  motivo: string;
  alternativeScartate: Array<{ preset: string; perche: string }>;
  vincoliPalette: { hueBucketEvitare: number[] };
  aakerCliente: Aaker & { fonte: string };
  assegnatoIl: string;
}

interface VoceRegistro {
  slug: string;
  mercato: { macroSettore: string; comune: string };
  preset: string;
  presetVersion: string;
  hueBucket: number | null;
  varianti: Record<string, string>;
  data: string;
}

const ASSIGNMENTS = path.join(FACTORY_ROOT, "assignments.json");
const leggiRegistro = (): { assegnazioni: VoceRegistro[] } => {
  try {
    return JSON.parse(fs.readFileSync(ASSIGNMENTS, "utf8"));
  } catch {
    return { assegnazioni: [] };
  }
};

/** Bucket di tinta a 30° (12 bucket): due primary nello stesso bucket = stessa famiglia percepita. */
export function hueBucket(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0; // grigi: bucket 0
  let hue = 0;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  return Math.floor(hue / 30);
}

/** Aaker del cliente: dal contesto se presente, altrimenti fallback
 *  deterministico dal tono (fonte dichiarata — mai inventato dal nulla). */
export function aakerCliente(contesto: Contesto): Aaker & { fonte: string } {
  const dichiarato = (contesto as unknown as { personalita_aaker?: Aaker & { fonte?: string[] } }).personalita_aaker;
  if (dichiarato) {
    return { ...dichiarato, fonte: "contesto.personalita_aaker (context-enricher, tracciato al form)" };
  }
  // fallback: mappa parole-chiave del tono/target — deterministica e dichiarata
  const testo = `${contesto.tono.registro} ${contesto.target.descrizione}`.toLowerCase();
  const v: Record<Dimensione, number> = { sincerity: 1, excitement: 0, competence: 1, sophistication: 0, ruggedness: 0 };
  const alza = (d: Dimensione, n = 1) => (v[d] = Math.min(2, v[d] + n));
  if (/tecnic|professional|precis|certificat|ingegner/.test(testo)) alza("competence");
  if (/elegan|sofisticat|raffinat|lusso|design/.test(testo)) alza("sophistication");
  if (/famigl|artigian|onest|traspar|vicin|cura/.test(testo)) alza("sincerity");
  if (/giovan|dinamic|innovativ|smart|modern/.test(testo)) alza("excitement");
  if (/cantier|robust|concret|pratic|edil/.test(testo)) alza("ruggedness");
  const primaria = DIMENSIONI.reduce((a, b) => (v[b] > v[a] ? b : a), "competence" as Dimensione);
  return { ...v, primaria, fonte: `fallback deterministico da tono.registro («${contesto.tono.registro}»)` };
}

/** Ordine stabile per-slug (tie-break): hash(slug+preset), mai Math.random. */
const semino = (slug: string, preset: string) =>
  parseInt(crypto.createHash("sha256").update(`${slug}:${preset}`).digest("hex").slice(0, 8), 16);

interface PresetManifest {
  id: string;
  version: string;
  stato: string;
  aaker: Record<string, number | string>;
  settoriConsigliati: string[];
  antiPatterns: string[];
}

export function assignDesign(slug: string): DesignAssegnato {
  const contesto = JSON.parse(
    fs.readFileSync(path.join(OUT_DIR, slug, "contesto.json"), "utf8"),
  ) as Contesto;
  const manifest = JSON.parse(fs.readFileSync(PRESETS_MANIFEST, "utf8")) as { presets: PresetManifest[] };
  const registro = leggiRegistro();
  const cliente = aakerCliente(contesto);
  const settore = contesto.settore_normalizzato.toLowerCase();
  const mercato = { macroSettore: settore, comune: contesto.zona.sede.toLowerCase() };
  const stessoMercato = registro.assegnazioni.filter(
    (a) => a.slug !== slug && a.mercato.macroSettore === mercato.macroSettore && a.mercato.comune === mercato.comune,
  );

  const scartate: Array<{ preset: string; perche: string }> = [];
  const candidati: Array<{ p: PresetManifest; score: number; dettaglio: string }> = [];
  for (const p of manifest.presets) {
    if (p.stato !== "attivo") {
      scartate.push({ preset: p.id, perche: `stato "${p.stato}"` });
      continue;
    }
    const anti = p.antiPatterns.find((a) => settore.includes(a.toLowerCase()) || a.toLowerCase().includes(settore));
    if (anti) {
      scartate.push({ preset: p.id, perche: `anti-pattern del preset: «${anti}»` });
      continue;
    }
    // distanza Aaker (primaria del cliente pesata ×2)
    let dist = 0;
    for (const d of DIMENSIONI) {
      const peso = d === cliente.primaria ? 2 : 1;
      dist += peso * Math.abs(cliente[d] - Number(p.aaker[d] ?? 0));
    }
    // bonus settore consigliato
    const consigliato = p.settoriConsigliati.some(
      (s) => settore.includes(s.toLowerCase()) || s.toLowerCase().includes(settore),
    );
    if (consigliato) dist -= 1.5;
    // anti-collisione: stesso preset già usato nello stesso mercato → penalità
    const usi = stessoMercato.filter((a) => a.preset === p.id).length;
    dist += usi * 2.5;
    candidati.push({
      p,
      score: dist,
      dettaglio: `${p.aaker.primaria} ${consigliato ? "· settore consigliato " : ""}${usi ? `· già ${usi}× in questo mercato ` : ""}(score ${dist.toFixed(1)})`,
    });
  }
  if (!candidati.length) throw new Error("nessun preset assegnabile: tutti scartati dai filtri hard");

  candidati.sort((a, b) => a.score - b.score || semino(slug, a.p.id) - semino(slug, b.p.id));
  const scelto = candidati[0];
  for (const c of candidati.slice(1, 4)) scartate.unshift({ preset: c.p.id, perche: c.dettaglio });

  // la differenziazione di primo livello è la PALETTE: i bucket già usati nel
  // mercato con lo stesso preset diventano un vincolo per il palette-designer
  const hueBucketEvitare = [
    ...new Set(
      stessoMercato
        .filter((a) => a.preset === scelto.p.id && a.hueBucket !== null)
        .map((a) => a.hueBucket as number),
    ),
  ];

  return {
    preset: scelto.p.id,
    version: scelto.p.version,
    seed: slug,
    motivo:
      `scelto ${scelto.p.id} perché ${String(scelto.p.aaker.primaria)} combacia con la personalità del cliente ` +
      `(${cliente.primaria} ${cliente[cliente.primaria]}/2 — ${cliente.fonte}); ${scelto.dettaglio}`,
    alternativeScartate: scartate.slice(0, 4),
    vincoliPalette: { hueBucketEvitare },
    aakerCliente: cliente,
    assegnatoIl: new Date().toISOString(),
  };
}

const designFile = (slug: string) => path.join(OUT_DIR, slug, "design.json");

export function writeDesign(slug: string, design: DesignAssegnato): void {
  fs.writeFileSync(designFile(slug), JSON.stringify(design, null, 2) + "\n");
}

export function readDesign(slug: string): DesignAssegnato | null {
  try {
    return JSON.parse(fs.readFileSync(designFile(slug), "utf8"));
  } catch {
    return null;
  }
}

/** Registra (o aggiorna) l'assegnazione nel registro anti-collisione. */
export function registraAssegnazione(slug: string, hueBucketScelto: number | null): void {
  const design = readDesign(slug);
  if (!design) return;
  const contesto = JSON.parse(
    fs.readFileSync(path.join(OUT_DIR, slug, "contesto.json"), "utf8"),
  ) as Contesto;
  const registro = leggiRegistro();
  const voce: VoceRegistro = {
    slug,
    mercato: {
      macroSettore: contesto.settore_normalizzato.toLowerCase(),
      comune: contesto.zona.sede.toLowerCase(),
    },
    preset: design.preset,
    presetVersion: design.version,
    hueBucket: hueBucketScelto,
    varianti: {},
    data: new Date().toISOString(),
  };
  const i = registro.assegnazioni.findIndex((a) => a.slug === slug);
  if (i >= 0) registro.assegnazioni[i] = voce;
  else registro.assegnazioni.push(voce);
  fs.writeFileSync(ASSIGNMENTS, JSON.stringify(registro, null, 2) + "\n");
}
