// media.ts — varianti delle immagini per le «pagine leggere» (docs/traffico/piano-T1b.md).
//
// MEDIA_VARIANTI_JSON (path assoluto) è il manifest scritto da scripts/media-varianti.ts,
// passato dall'editor SOLO col servizio Traffico «Sito» attivo o sospeso (come
// DATI_STRUTTURATI_JSON in loadSite.ts). Assente = `varianti` null: Foto.astro rende l'<img>
// di sempre e l'HTML resta quello di prima.
import { readFileSync } from "node:fs";

/** [URL, larghezza in px]: un candidato di `srcset`, dal più stretto al più largo. */
export type Candidato = [url: string, larghezza: number];

/**
 * Voce di un'immagine di /media/<slug>/: `w`/`h` della sorgente (già raddrizzata). Le foto
 * hanno `avif` + `jpeg` (o `png` se la sorgente ha trasparenza); logo e marchio solo `png`
 * (alto 120 px per il telefono e alto fino a 288 px); SVG e GIF solo `w`/`h`.
 * Piano T1c: `telefono` = serie AVIF da telefono delle foto usate fuori dalla hero a tutta
 * pagina; `ritaglio` = fascia centrale della foto della hero a tutta pagina (A, C, D) per i
 * telefoni fino a 430 px, con le sue dimensioni.
 */
export type VociImmagine = {
  w: number;
  h: number;
  avif?: Candidato[];
  jpeg?: Candidato[];
  png?: Candidato[];
  telefono?: Candidato[];
  ritaglio?: { w: number; h: number; avif: Candidato[] };
};

export type ManifestVarianti = {
  versione: 1;
  /** Hash della ricetta (scala, qualità, versione di sharp): cambia → varianti rigenerate. */
  ricetta: string;
  /** Chiave = `src` esatto di site.json. */
  immagini: Record<string, VociImmagine>;
  /** Copia leggera della favicon (assente se l'originale è già leggero o non c'è). */
  favicon?: string;
  /** Anteprima per la condivisione (og:image) ritagliata dalla foto della hero. */
  og?: { src: string; w: number; h: number };
};

export const manifest: ManifestVarianti | null = process.env.MEDIA_VARIANTI_JSON
  ? JSON.parse(readFileSync(process.env.MEDIA_VARIANTI_JSON, "utf8"))
  : null;

// `sizes` per uso: larghezza RESA dell'immagine a ogni viewport, dai box misurati sulle
// sezioni (contenitore con 1.5rem di margine sotto 768 px e 2rem sopra, max 80rem). Mai sotto la
// larghezza vera, o il browser sceglie una variante troppo piccola e la foto si ammorbidisce.
// Foto.astro la moltiplica per ZOOM da 768 px in su prima di scriverla nell'HTML (sizesPerZoom).
// Grammatica chiusa, letta da scripts/budget-pagine.ts: voci «(max-width: Npx) LUNGHEZZA»
// separate da virgola e una LUNGHEZZA finale, con LUNGHEZZA = Npx | Nvw | calc(Nvw - Nrem).
export const SIZES = {
  // A, C, D: foto a tutta pagina ritagliata a riempire. Da mobile il riquadro è verticale e la
  // foto larga copre ~1150 px; da 768 px la sezione alta dei preset con titoli grandi la allarga
  // oltre il viewport fino a ~1470 px (1468 a 1280 in canon), poi è la viewport (calibrazione C3).
  hero: "(max-width: 767px) 1170px, (max-width: 1469px) 1470px, 100vw",
  // B: colonna 6/12 accanto al testo.
  heroSplit: "(max-width: 1023px) calc(100vw - 3rem), 600px",
  // Griglia dei servizi: una colonna, due da 640 px, tre-cinque da 1024 px.
  card: "(max-width: 639px) calc(100vw - 3rem), (max-width: 1023px) calc(50vw - 2.25rem), 400px",
  // Variante a righe: foto a tutta larghezza, poi 2/5 della riga.
  cardRiga: "(max-width: 639px) calc(100vw - 3rem), (max-width: 1279px) calc(40vw - 1.2rem), 490px",
  // FeatureHighlight: colonna 7/12.
  evidenza: "(max-width: 1023px) calc(100vw - 3rem), 720px",
  // ProcessSteps a timeline: foto accanto al numero, al massimo 28rem.
  processo: "(max-width: 639px) calc(100vw - 8rem), 448px",
} as const;

// Galleria da 1024 px: griglia a 12 colonne, gap 1rem; una riga da 1, 2, 3 o 4 foto dà celle
// da 12, 6, 4 o 3 colonne. Larghezza fino a 1279 px e oltre (contenitore pieno, 1216 px).
const CELLA_LG: Record<number, [fluida: string, fissa: string]> = {
  1: ["calc(100vw - 4rem)", "1216px"],
  2: ["calc(50vw - 2.5rem)", "600px"],
  3: ["calc(33.4vw - 2rem)", "400px"],
  4: ["calc(25vw - 1.75rem)", "300px"],
};

/**
 * `sizes` di una cella della galleria: sotto 1024 px due colonne (la cella a tutta riga se
 * `rigaIntera`), da 1024 px la cella di una riga da `fotoInRiga` foto (1-4).
 */
export function sizesGalleria(rigaIntera: boolean, fotoInRiga: number): string {
  const lg = CELLA_LG[fotoInRiga];
  if (!lg) throw new Error(`sizesGalleria: riga da ${fotoInRiga} foto non prevista (1-4)`);
  const sotto = rigaIntera ? "calc(100vw - 3rem)" : "calc(50vw - 1.875rem)";
  return `(max-width: 1023px) ${sotto}, (max-width: 1279px) ${lg[0]}, ${lg[1]}`;
}

/**
 * Telefoni (decisione di Mattia, decisioni-piani.md T1b punto 9): fino a questa larghezza di
 * viewport niente margine per lo zoom, il candidato copre la larghezza resa × DPR.
 */
export const TELEFONO_MAX = 767;

/**
 * Ritaglio da telefono della foto della hero a tutta pagina (piano T1c §2.3): lo sceglie il
 * browser fino a 430 px di viewport; `sizes` = larghezza coperta massima misurata nei 7 preset
 * (altezza del riquadro × 430/544, calibrazione C3).
 */
export const RITAGLIO = { media: "(max-width: 430px)", sizes: "600px" } as const;

/** Altezza di logo e marchio sul telefono (h-10 = 40 px, la più alta sotto md). */
export const LOGO_ALTEZZA_TELEFONO = 40;

/**
 * `sizes` di logo e marchio: la larghezza a `altezza` px (la misura massima nell'intestazione)
 * e, sotto 768 px, a quella del telefono (decisioni-piani.md T1c punto 2: un telefono DPR 3
 * sceglie la variante alta 120 px invece di quella da 288).
 */
export function sizesLogo(src: string, altezza: number): string {
  const v = manifest?.immagini[src];
  if (!v) return "";
  const larghezza = (h: number) => `${Math.round((v.w * h) / v.h)}px`;
  const telefono = larghezza(Math.min(altezza, LOGO_ALTEZZA_TELEFONO));
  const computer = larghezza(altezza);
  return telefono === computer ? computer : `(max-width: ${TELEFONO_MAX}px) ${telefono}, ${computer}`;
}

/**
 * Regola dello zoom (decisione di Mattia, docs/traffico/decisioni-piani.md T1b punto 8): da 768 px
 * in su il candidato scelto ha almeno ZOOM volte i pixel resi, così lo zoom con le dita (che non
 * fa cambiare candidato al browser) resta nitido come con gli originali; oltre, l'originale.
 */
export const ZOOM = 2;

/**
 * `sizes` per l'HTML, nella stessa grammatica: le voci fino a TELEFONO_MAX restano la larghezza
 * resa (punto 9); se nessuna arriva esattamente a TELEFONO_MAX se ne inserisce una con la
 * lunghezza della voce successiva non raddoppiata; le voci oltre e la finale × ZOOM (punto 8).
 * Da 768 px in su il browser sceglie quindi gli stessi candidati della regola dello zoom.
 */
export function sizesPerZoom(sizes: string): string {
  const doppia = (lunghezza: string) => lunghezza.replace(/\d+(?:\.\d+)?/g, (n) => String(Math.round(Number(n) * ZOOM * 1000) / 1000));
  const voci: string[] = [];
  let telefonoCoperto = false;
  for (const voce of sizes.split(/,(?![^(]*\))/)) {
    const m = /^\s*(?:\(max-width: (\d+)px\) )?(.*?)\s*$/.exec(voce)!;
    const max = m[1] === undefined ? null : Number(m[1]);
    if (max !== null && max <= TELEFONO_MAX) {
      voci.push(`(max-width: ${max}px) ${m[2]}`);
      telefonoCoperto ||= max === TELEFONO_MAX;
      continue;
    }
    if (!telefonoCoperto) voci.push(`(max-width: ${TELEFONO_MAX}px) ${m[2]}`);
    telefonoCoperto = true;
    voci.push(`${max === null ? "" : `(max-width: ${max}px) `}${doppia(m[2])}`);
  }
  return voci.join(", ");
}
