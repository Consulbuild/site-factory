// Banco delle «pagine leggere» (piano T1b §8.4), senza rete: scala e nomi delle varianti,
// cache, manifest da immagini sintetiche create con sharp in una cartella temporanea; `sizes`,
// scelta del candidato, font e budget su una dist sintetica.
//
//   cd site-renderer && node --experimental-strip-types scripts/test-media.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { generaVarianti, hashRicetta, raccogliRiferimenti, RICETTA, scala, urlVariante } from "./media-varianti.ts";
import { budgetDist, famigliePreset, fontLatini, leggiSrcset, scegliCandidato, SOGLIE, valutaMedia, valutaSizes } from "./budget-pagine.ts";
import { RITAGLIO, SIZES, sizesGalleria, sizesPerZoom } from "../src/lib/media.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}
async function rifiuta(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
const uguali = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- scala e nomi ---------- */

caso("scala: sorgente 1216 → 400/640/960/1216", uguali(scala(1216), [400, 640, 960, 1216]), scala(1216));
caso("scala: sorgente 720 → 400/640/720", uguali(scala(720), [400, 640, 720]), scala(720));
caso("scala: sorgente 300 → 300 (mai ingrandire)", uguali(scala(300), [300]), scala(300));
caso("scala: sorgente 1920 → tutta la scala", uguali(scala(1920), [400, 640, 960, 1280, 1920]), scala(1920));
caso("scala: sorgente 2400 → tutta la scala e l'originale in cima", uguali(scala(2400), [400, 640, 960, 1280, 1920, 2400]), scala(2400));
caso("scala: sorgente 400 → 400", uguali(scala(400), [400]), scala(400));
caso(
  "nome: /media/<slug>/v/<nome>.<sha8>-<misura>.<formato>",
  urlVariante("/media/zz/hero.jpg", "1a2b3c4d5e6f", "640.avif") === "/media/zz/v/hero.1a2b3c4d-640.avif",
  urlVariante("/media/zz/hero.jpg", "1a2b3c4d5e6f", "640.avif"),
);
caso("ricetta: l'hash cambia con la ricetta", hashRicetta() !== hashRicetta({ ...RICETTA, avifEffort: 2 }) && hashRicetta() === hashRicetta(RICETTA));
{
  // La codifica decide parametri fuori da RICETTA (palette della favicon, ritaglio della og…): una
  // copia dello script con la codifica cambiata deve dare un'altra chiave di cache.
  const dirCodice = mkdtempSync(join(tmpdir(), "test-media-codice-"));
  try {
    symlinkSync(join(import.meta.dirname, "..", "node_modules"), join(dirCodice, "node_modules"));
    const sorgente = readFileSync(join(import.meta.dirname, "media-varianti.ts"), "utf8");
    const ricettaDi = (testo: string, nome: string) => {
      writeFileSync(join(dirCodice, nome), testo);
      const url = JSON.stringify(pathToFileURL(join(dirCodice, nome)).href);
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", `console.log((await import(${url})).hashRicetta())`], { encoding: "utf8" });
      return r.stdout.trim() || r.stderr.trim();
    };
    const modificato = sorgente.replace("palette: true", "palette: false");
    const uguale = ricettaDi(sorgente, "uguale.ts");
    const cambiato = ricettaDi(modificato, "cambiato.ts");
    caso(
      "chiave della cache: stesso codice → stessa ricetta; codifica cambiata (palette della favicon) → ricetta nuova",
      modificato !== sorgente && uguale === hashRicetta() && /^[0-9a-f]{12}$/.test(cambiato) && cambiato !== uguale,
      { uguale, cambiato, qui: hashRicetta() },
    );
  } finally {
    rmSync(dirCodice, { recursive: true, force: true });
  }
}

/* ---------- riferimenti in site.json ---------- */

const P = "/media/zz-banco/";
const siteBase = {
  brand: { preset: "meridian", logo: null, mark: { src: `${P}mark.png`, alt: "" }, favicon: `${P}favicon.svg` },
  sections: [
    { type: "Hero", props: { image: { src: `${P}hero.jpg`, alt: "h" } } },
    { type: "Services", props: { items: [{ image: { src: `${P}card.jpg`, alt: "c" } }, { image: { src: "https://esempio.invalid/remota.jpg", alt: "r" } }] } },
    { type: "Gallery", props: { images: [{ src: `${P}lavoro.jpg`, alt: "l" }, { src: `${P}hero.jpg`, alt: "doppia" }, { src: `${P}trasparente.png`, alt: "t" }, { src: `${P}disegno.svg`, alt: "s" }] } },
  ],
};
{
  const r = raccogliRiferimenti(siteBase, P);
  caso(
    "riferimenti: foto per sezione, galleria = reale (vince su generata), logo, favicon, hero; remote escluse",
    uguali([...r.immagini], [
      [`${P}mark.png`, "logo"],
      [`${P}hero.jpg`, "foto-reale"],
      [`${P}card.jpg`, "foto-generata"],
      [`${P}lavoro.jpg`, "foto-reale"],
      [`${P}trasparente.png`, "foto-reale"],
      [`${P}disegno.svg`, "foto-reale"],
    ]) && r.favicon === `${P}favicon.svg` && r.hero === `${P}hero.jpg`,
    { immagini: [...r.immagini], favicon: r.favicon, hero: r.hero },
  );
  caso(
    "riferimenti: hero senza variante = A a tutta pagina (ritaglio); la stessa foto anche in galleria conta come altro uso",
    uguali([...r.heroPiene], [`${P}hero.jpg`]) && uguali([...r.altriUsi], [`${P}card.jpg`, `${P}lavoro.jpg`, `${P}hero.jpg`, `${P}trasparente.png`, `${P}disegno.svg`]),
    { heroPiene: [...r.heroPiene], altriUsi: [...r.altriUsi] },
  );
}

/* ---------- manifest da immagini sintetiche ---------- */

const tmp = mkdtempSync(join(tmpdir(), "test-media-"));
try {
  const media = join(tmp, "public", "media", "zz-banco");
  const cache = join(tmp, "cache");
  mkdirSync(media, { recursive: true });
  // Rumore colorato: pesa come una foto vera (un colore piatto darebbe file minuscoli).
  const foto = (w: number, h: number, seme: number) => {
    const px = Buffer.alloc(w * h * 3);
    let x = seme;
    for (let i = 0; i < px.length; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      px[i] = (x >> 16) & 0xff;
    }
    return sharp(px, { raw: { width: w, height: h, channels: 3 } });
  };
  await foto(1300, 800, 1).jpeg({ quality: 90 }).toFile(join(media, "hero.jpg"));
  await foto(1216, 912, 2).jpeg({ quality: 90 }).toFile(join(media, "card.jpg"));
  await foto(720, 960, 3).jpeg({ quality: 90 }).toFile(join(media, "lavoro.jpg"));
  await sharp({ create: { width: 500, height: 300, channels: 4, background: { r: 200, g: 150, b: 0, alpha: 0.5 } } }).png().toFile(join(media, "trasparente.png"));
  await sharp({ create: { width: 285, height: 240, channels: 4, background: { r: 30, g: 20, b: 10, alpha: 1 } } }).png().toFile(join(media, "mark.png"));
  writeFileSync(join(media, "disegno.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48" width="64" height="48"><rect width="64" height="48" fill="#333"/></svg>`);
  // Favicon SVG pesante come quella di Cavaliere (PNG incorporato): > 10 KB.
  const png = await foto(240, 240, 4).png().toBuffer();
  writeFileSync(join(media, "favicon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 256"><image x="8" y="8" width="240" height="240" xlink:href="data:image/png;base64,${png.toString("base64")}"/></svg>`);

  const t0 = performance.now();
  const { manifest: m } = await generaVarianti({ site: siteBase, mediaDir: media, cacheDir: cache });
  const primaMs = performance.now() - t0;
  const hero = m.immagini[`${P}hero.jpg`];
  caso("foto 1300×800: AVIF e JPEG a 400/640/960/1280/1300, dimensioni della sorgente", hero?.w === 1300 && hero.h === 800 && uguali(hero.avif?.map(([, w]) => w), [400, 640, 960, 1280, 1300]) && uguali(hero.jpeg?.map(([, w]) => w), [400, 640, 960, 1280, 1300]) && !hero.png, hero);
  caso("URL delle varianti in /media/zz-banco/v/ con sha8", !!hero?.avif?.every(([u]) => /^\/media\/zz-banco\/v\/hero\.[0-9a-f]{8}-\d+\.avif$/.test(u)), hero?.avif);
  const fileV = readdirSync(join(media, "v"));
  const urlManifest = Object.values(m.immagini).flatMap((v) => [...(v.avif ?? []), ...(v.jpeg ?? []), ...(v.png ?? []), ...(v.telefono ?? []), ...(v.ritaglio?.avif ?? [])]);
  caso("ogni URL del manifest (serie da telefono e ritaglio compresi) ha il suo file in v/, e v/ non ha file in più", urlManifest.every(([u]) => fileV.includes(u.split("/").pop()!)) && new Set(urlManifest.map(([u]) => u)).size + (m.favicon ? 1 : 0) + (m.og ? 1 : 0) === fileV.length, fileV);
  const larghezzaVera = await sharp(join(media, "v", hero!.avif![1][0].split("/").pop()!)).metadata();
  caso("la variante da 640 è davvero larga 640 e in AVIF (heif)", larghezzaVera.width === 640 && larghezzaVera.format === "heif", { w: larghezzaVera.width, f: larghezzaVera.format });
  const tr = m.immagini[`${P}trasparente.png`];
  caso("foto con trasparenza: ripiego PNG, niente JPEG", !!tr?.png?.length && !tr.jpeg && uguali(tr.avif?.map(([, w]) => w), [400, 500]), tr);
  const mark = m.immagini[`${P}mark.png`];
  caso(
    "marchio 285×240: solo PNG senza perdita; per il computer quello di sempre (285, sotto i 288 px), da telefono -t143 (120 px × 285/240 = 142,5 in su) più quello di sempre",
    mark?.w === 285 && mark.h === 240 && !mark.avif && !mark.ritaglio && uguali(mark.png?.map(([, w]) => w), [285]) && uguali(mark.telefono?.map(([, w]) => w), [143, 285]) && !!mark.telefono?.[0][0].endsWith("-t143.png") && mark.telefono?.[1][0] === mark.png?.[0][0],
    mark,
  );
  const markVeri = await Promise.all(mark!.telefono!.map(([u]) => sharp(join(media, "v", u.split("/").pop()!)).metadata()));
  caso("i PNG del marchio sono 143×120 e 285×240", uguali(markVeri.map((x) => [x.width, x.height, x.format]), [[143, 120, "png"], [285, 240, "png"]]), markVeri.map((x) => [x.width, x.height]));
  const heroJpegTop = readFileSync(join(media, "v", hero!.jpeg!.at(-1)![0].split("/").pop()!));
  caso("gradino più grande del JPEG = il file originale (senza metadati), gli altri ricodificati", heroJpegTop.equals(readFileSync(join(media, "hero.jpg"))) && !readFileSync(join(media, "v", hero!.jpeg![0][0].split("/").pop()!)).equals(readFileSync(join(media, "hero.jpg"))));
  caso("SVG: solo dimensioni", uguali(m.immagini[`${P}disegno.svg`], { w: 64, h: 48 }), m.immagini[`${P}disegno.svg`]);
  caso("remota: nessuna voce", !Object.keys(m.immagini).some((k) => k.startsWith("https:")));
  const fav = m.favicon ? await sharp(join(media, "v", m.favicon.split("/").pop()!)).metadata() : null;
  caso("favicon SVG > 10 KB → PNG 96×96", /\/v\/favicon\.[0-9a-f]{8}-96\.png$/.test(m.favicon ?? "") && fav?.width === 96 && fav.height === 96 && fav.format === "png", { url: m.favicon, fav });
  const og = m.og ? await sharp(join(media, "v", m.og.src.split("/").pop()!)).metadata() : null;
  caso("og:image dalla hero: JPEG 1200×630", m.og?.w === 1200 && m.og.h === 630 && og?.width === 1200 && og.height === 630 && og.format === "jpeg", { og: m.og, meta: og && { w: og.width, h: og.height } });

  // Seconda esecuzione: tutto dalla cache, stesso manifest.
  const t1 = performance.now();
  const r2 = await generaVarianti({ site: siteBase, mediaDir: media, cacheDir: cache });
  const secondaMs = performance.now() - t1;
  // 6 immagini + 5 serie da telefono (foto fuori dalla hero a tutta pagina) + 1 ritaglio + favicon + og.
  caso("seconda esecuzione: manifest identico e tutte le 14 voci dalla cache", uguali(r2.manifest, m) && r2.righe.at(-1)!.startsWith("14 voci, 14 dalla cache"), r2.righe.at(-1));
  caso(`seconda esecuzione più veloce (${Math.round(primaMs)} → ${Math.round(secondaMs)} ms)`, secondaMs < primaMs / 2);

  // Una sola foto cambiata: nuovo sha8 solo per lei.
  await foto(1216, 912, 99).jpeg({ quality: 90 }).toFile(join(media, "card.jpg"));
  const r3 = await generaVarianti({ site: siteBase, mediaDir: media, cacheDir: cache });
  const cambiate = Object.keys(m.immagini).filter((k) => !uguali(m.immagini[k], r3.manifest.immagini[k]));
  caso("foto sostituita: cambiano solo le sue varianti", uguali(cambiate, [`${P}card.jpg`]) && r3.manifest.og?.src === m.og?.src && r3.manifest.favicon === m.favicon, cambiate);
  caso("v/ ripulita a ogni esecuzione: nessuna variante della foto vecchia", !readdirSync(join(media, "v")).some((f) => f.startsWith("card.") && m.immagini[`${P}card.jpg`].avif!.some(([u]) => u.endsWith(f))));
  caso("ricetta diversa → nuova voce in cache (chiave con la ricetta)", readdirSync(cache).length > 0 && readdirSync(cache).every((d) => d.endsWith(hashRicetta())));
  const voceHero = readdirSync(cache).find((d) => d.includes("-og-"))!;
  writeFileSync(join(cache, voceHero, "voce.json"), "{ troncato");
  const r4 = await generaVarianti({ site: siteBase, mediaDir: media, cacheDir: cache });
  caso("voce di cache illeggibile → ricodificata, stesso risultato", r4.manifest.og?.src === r3.manifest.og?.src && uguali(r4.manifest.immagini, r3.manifest.immagini), r4.righe.at(-1));

  // Telefoni (piano T1c): serie da telefono, ritaglio della hero a tutta pagina, hero B e foto verticale.
  {
    // Hero a bande: fascia centrale larga L px verde, lati rossi (il ritaglio deve essere tutto verde).
    // PNG: bordi netti anche nella sorgente (il JPEG sbava il colore tra blocchi).
    const bande = async (W: number, H: number, L: number, file: string) => {
      const px = Buffer.alloc(W * H * 3);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px[(y * W + x) * 3 + (Math.abs(x + 0.5 - W / 2) < L / 2 ? 1 : 0)] = 255;
      await sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toFile(join(media, file));
    };
    await bande(1920, 1088, 860, "hero-larga.png");
    await bande(2560, 1450, 1146, "hero-alta.png");
    await foto(1300, 800, 7).jpeg({ quality: 90 }).toFile(join(media, "hero-b.jpg"));
    const siteT1c = {
      brand: { preset: "meridian", logo: null, mark: null, favicon: null },
      sections: [
        { type: "Hero", variant: "A", props: { image: { src: `${P}hero-larga.png`, alt: "a" } } },
        { type: "Hero", variant: "B", props: { image: { src: `${P}hero-b.jpg`, alt: "b" } } },
        { type: "Hero", variant: "C", props: { image: { src: `${P}lavoro.jpg`, alt: "verticale" } } },
        { type: "Hero", variant: "D", props: { image: { src: `${P}hero-alta.png`, alt: "alta" } } },
        { type: "Gallery", props: { images: [{ src: `${P}lavoro.jpg`, alt: "l" }] } },
        { type: "Services", props: { items: [{ image: { src: `${P}card.jpg`, alt: "c" } }] } },
      ],
    };
    const rT = raccogliRiferimenti(siteT1c, P);
    caso(
      "riferimenti: hero A e C a tutta pagina, hero B come altro uso, foto sia hero sia galleria in entrambi",
      uguali([...rT.heroPiene], [`${P}hero-larga.png`, `${P}lavoro.jpg`, `${P}hero-alta.png`]) && uguali([...rT.altriUsi], [`${P}hero-b.jpg`, `${P}lavoro.jpg`, `${P}card.jpg`]) && rT.hero === `${P}hero-larga.png`,
      { heroPiene: [...rT.heroPiene], altriUsi: [...rT.altriUsi] },
    );
    const { manifest: mT, righe: righeT } = await generaVarianti({ site: siteT1c, mediaDir: media, cacheDir: cache });
    const larga = mT.immagini[`${P}hero-larga.png`];
    const meta = async (u: string) => sharp(join(media, "v", u.split("/").pop()!)).metadata();
    caso(
      "ritaglio 860×1088 da 1920×1088: un file solo -r860.avif (nessun gradino sotto la larghezza del ritaglio), niente serie da telefono per la sola hero",
      uguali(larga?.ritaglio && { w: larga.ritaglio.w, h: larga.ritaglio.h, larghezze: larga.ritaglio.avif.map(([, w]) => w) }, { w: 860, h: 1088, larghezze: [860] }) &&
        !!larga?.ritaglio?.avif[0][0].endsWith("-r860.avif") && !larga?.telefono && uguali(larga?.avif?.map(([, w]) => w), [400, 640, 960, 1280, 1920]),
      larga,
    );
    const alta = mT.immagini[`${P}hero-alta.png`];
    caso(
      "ritaglio 1146×1450 da 2560×1450 (hero D): gradini 960/1146",
      uguali(alta?.ritaglio && { w: alta.ritaglio.w, h: alta.ritaglio.h, larghezze: alta.ritaglio.avif.map(([, w]) => w) }, { w: 1146, h: 1450, larghezze: [960, 1146] }),
      alta?.ritaglio,
    );
    const dims = await Promise.all([larga!.ritaglio!.avif[0][0], ...alta!.ritaglio!.avif.map(([u]) => u)].map(async (u) => { const x = await meta(u); return [x.width, x.height, x.format]; }));
    caso("file del ritaglio: AVIF 860×1088, 960×1215 e 1146×1450", uguali(dims, [[860, 1088, "heif"], [960, 1215, "heif"], [1146, 1450, "heif"]]), dims);
    const colonne = async (u: string, w: number, h: number) => Promise.all([0, w - 1].map((x) => sharp(join(media, "v", u.split("/").pop()!)).extract({ left: x, top: 0, width: 1, height: h }).stats()));
    const bordi = [...(await colonne(larga!.ritaglio!.avif[0][0], 860, 1088)), ...(await colonne(alta!.ritaglio!.avif[0][0], 960, 1215))];
    caso(
      "ritaglio centrato come object-cover (anche ridotto nello stesso passo): prima e ultima colonna nella fascia centrale (verdi, niente rosso dei lati)",
      bordi.every((s) => s.channels[1].mean > 200 && s.channels[0].mean < 60),
      bordi.map((s) => s.channels.slice(0, 3).map((c) => Math.round(c.mean))),
    );
    const hb = mT.immagini[`${P}hero-b.jpg`];
    caso("hero B (incorniciata): nessun ritaglio, serie da telefono 400/640/960/1280/1300", !hb?.ritaglio && uguali(hb?.telefono?.map(([, w]) => w), [400, 640, 960, 1280, 1300]), hb);
    const vert = mT.immagini[`${P}lavoro.jpg`];
    caso(
      "foto 3:4 già più stretta di 430/544 come hero C: ritaglio senza taglio (720×960) e, usata anche in galleria, serie da telefono 400/640/720",
      uguali(vert?.ritaglio && { w: vert.ritaglio.w, h: vert.ritaglio.h, l: vert.ritaglio.avif.map(([, w]) => w) }, { w: 720, h: 960, l: [720] }) && uguali(vert?.telefono?.map(([, w]) => w), [400, 640, 720]),
      vert,
    );
    const card = mT.immagini[`${P}card.jpg`];
    const pesi = (c: [string, number][] | undefined) => (c ?? []).map(([u]) => readFileSync(join(media, "v", u.split("/").pop()!)).length);
    const [pesoT, pesoPc] = [pesi(card?.telefono), pesi(card?.avif)];
    caso(
      "serie da telefono della card: stessi gradini della serie di sempre (400/640/960/1216), nomi -t<w>.avif, più leggera gradino per gradino (q70 contro q90)",
      uguali(card?.telefono?.map(([, w]) => w), card?.avif?.map(([, w]) => w)) && !!card?.telefono?.every(([u, w]) => u.endsWith(`-t${w}.avif`)) && pesoT.length === 4 && pesoT.every((b, i) => b < pesoPc[i]),
      { pesoT, pesoPc },
    );
    caso(
      "log: una riga per ritaglio e serie da telefono",
      righeT.includes(`${P}hero-larga.png: ritaglio da telefono 860×1088, 860 px (codificata)`) && righeT.some((r) => r.startsWith(`${P}card.jpg: serie da telefono 400/640/960/1216 px (`)),
      righeT,
    );
    const rT2 = await generaVarianti({ site: siteT1c, mediaDir: media, cacheDir: cache });
    caso("telefoni a caldo: manifest identico, tutto dalla cache", uguali(rT2.manifest, mT) && /^(\d+) voci, \1 dalla cache/.test(rT2.righe.at(-1)!), rT2.righe.at(-1));
  }

  // Errori leggibili.
  const assente = await rifiuta(() => generaVarianti({ site: { ...siteBase, sections: [{ type: "Hero", props: { image: { src: `${P}manca.jpg`, alt: "m" } } }] }, mediaDir: media, cacheDir: cache }));
  caso("src assente → errore che nomina il file", !!assente?.includes(`${P}manca.jpg`) && assente.includes("non c'è"), assente);
  const fuori = await rifiuta(() => generaVarianti({ site: { ...siteBase, sections: [{ type: "Hero", props: { image: { src: `${P}../altro/x.jpg`, alt: "m" } } }] }, mediaDir: media, cacheDir: cache }));
  caso("src che esce dalla cartella del cliente → errore", !!fuori?.includes("fuori da"), fuori);
  writeFileSync(join(media, "rotta.jpg"), "non è un'immagine");
  const rotta = await rifiuta(() => generaVarianti({ site: { ...siteBase, sections: [{ type: "Hero", props: { image: { src: `${P}rotta.jpg`, alt: "m" } } }] }, mediaDir: media, cacheDir: cache }));
  caso("file illeggibile → errore che nomina il file", !!rotta?.startsWith(`${P}rotta.jpg:`), rotta);
  writeFileSync(join(media, "logo.pdf"), "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n");
  const pdf = await rifiuta(() => generaVarianti({ site: { ...siteBase, brand: { ...siteBase.brand, logo: { src: `${P}logo.pdf`, alt: "l" } } }, mediaDir: media, cacheDir: cache }));
  caso("logo in PDF (dal form) → errore che nomina il file e dice cosa fare", !!pdf?.startsWith(`${P}logo.pdf: il logo è un PDF`) && pdf.includes("PNG o SVG nella scheda Intake"), pdf);
  const heroSvg = await generaVarianti({ site: { ...siteBase, sections: [{ type: "Hero", props: { image: { src: `${P}disegno.svg`, alt: "s" } } }] }, mediaDir: media, cacheDir: cache }).catch((e: unknown) => (e instanceof Error ? e.message : String(e)));
  caso(
    "hero in SVG: nessun errore, niente og:image nel manifest (Base.astro usa l'originale), riga nel log",
    typeof heroSvg === "object" && !heroSvg.manifest.og && uguali(heroSvg.manifest.immagini[`${P}disegno.svg`], { w: 64, h: 48 }) && heroSvg.righe.some((r) => r === `${P}disegno.svg: og:image non generata (hero non raster), resta l'originale della hero`),
    heroSvg,
  );
  caso("nessuna cartella temporanea lasciata in cache", !readdirSync(cache).some((d) => d.includes(".tmp-")), readdirSync(cache));
  caso("cartella temporanea del banco esistente (sanità)", existsSync(media));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

/* ---------- sizes, candidati, font ---------- */

const lancia = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
};
{
  const a412 = Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, Math.round(valutaSizes(v, 412))]));
  caso("SIZES a 412 px: hero 1170, split/card/riga/evidenza 364, processo 284", uguali(a412, { hero: 1170, heroSplit: 364, card: 364, cardRiga: 364, evidenza: 364, processo: 284 }), a412);
  const a1280 = Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, Math.round(valutaSizes(v, 1280))]));
  caso("SIZES a 1280 px: hero 1470, split 600, card 400, riga 490, evidenza 720, processo 448", uguali(a1280, { hero: 1470, heroSplit: 600, card: 400, cardRiga: 490, evidenza: 720, processo: 448 }), a1280);
  caso("SIZES hero a 1920 px: la viewport", valutaSizes(SIZES.hero, 1920) === 1920);
  const zoom = [sizesPerZoom(SIZES.card), sizesPerZoom(SIZES.hero), sizesPerZoom(sizesGalleria(false, 3)), sizesPerZoom("48px"), sizesPerZoom(SIZES.processo)];
  caso(
    "sizes per l'HTML: resa onesta fino a 767 px (voce inserita se manca), × 2 oltre, stessa grammatica",
    uguali(zoom, [
      "(max-width: 639px) calc(100vw - 3rem), (max-width: 767px) calc(50vw - 2.25rem), (max-width: 1023px) calc(100vw - 4.5rem), 800px",
      "(max-width: 767px) 1170px, (max-width: 1469px) 2940px, 200vw",
      "(max-width: 767px) calc(50vw - 1.875rem), (max-width: 1023px) calc(100vw - 3.75rem), (max-width: 1279px) calc(66.8vw - 4rem), 800px",
      "(max-width: 767px) 48px, 96px",
      "(max-width: 639px) calc(100vw - 8rem), (max-width: 767px) 448px, 896px",
    ]) && zoom.every((z) => !lancia(() => valutaSizes(z, 412))) && Math.round(valutaSizes(zoom[0], 412)) === 364,
    zoom,
  );
  // Proprietà su tutti gli usi: sotto 768 px la resa di sempre, da 768 px esattamente la regola dello zoom di T1b.
  const usi = [...Object.values(SIZES), ...[1, 2, 3, 4].flatMap((n) => [sizesGalleria(true, n), sizesGalleria(false, n)]), "57px", "(max-width: 767px) 48px, 57px"];
  const scarti: string[] = [];
  for (const s of usi) {
    const h = sizesPerZoom(s);
    for (let vw = 320; vw <= 2000; vw++) {
      const atteso = valutaSizes(s, vw) * (vw <= 767 ? 1 : 2);
      if (Math.abs(valutaSizes(h, vw) - atteso) > 1e-6) scarti.push(`${s} a ${vw}: ${valutaSizes(h, vw)} invece di ${atteso}`);
    }
  }
  caso(`sizes per l'HTML su ${usi.length} usi da 320 a 2000 px: resa × 1 fino a 767, × 2 da 768 (767 e 768 esatti compresi)`, scarti.length === 0, scarti.slice(0, 5));
  caso("sizes per l'HTML: voce a 767 esatti non duplicata", sizesPerZoom("(max-width: 767px) 1170px, 100vw") === "(max-width: 767px) 1170px, 200vw", sizesPerZoom("(max-width: 767px) 1170px, 100vw"));
  caso("ritaglio da telefono: media e sizes nella grammatica del budget", /^\(max-width: \d+px\)$/.test(RITAGLIO.media) && !lancia(() => valutaSizes(RITAGLIO.sizes, 412)));
}
{
  // sizesLogo legge il manifest all'import: istanza a parte del modulo con un manifest sintetico.
  const dirLogo = mkdtempSync(join(tmpdir(), "test-media-logo-"));
  try {
    const P2 = "/media/zz/";
    writeFileSync(join(dirLogo, "m.json"), JSON.stringify({ versione: 1, ricetta: "x", immagini: { [`${P2}mark.png`]: { w: 285, h: 240 }, [`${P2}lockup.png`]: { w: 1309, h: 293 } } }));
    process.env.MEDIA_VARIANTI_JSON = join(dirLogo, "m.json");
    const { sizesLogo } = (await import(`${pathToFileURL(join(import.meta.dirname, "..", "src", "lib", "media.ts")).href}?logo`)) as typeof import("../src/lib/media.ts");
    delete process.env.MEDIA_VARIANTI_JSON;
    const s = [sizesLogo(`${P2}mark.png`, 48), sizesLogo(`${P2}mark.png`, 40), sizesLogo(`${P2}mark.png`, 32), sizesLogo(`${P2}lockup.png`, 40), sizesLogo(`${P2}assente.png`, 48)];
    caso(
      "sizesLogo: sotto 768 px l'altezza del telefono (40 px) se quella del computer è più alta, larghezza esatta arrotondata in su al millesimo; senza voce stringa vuota",
      uguali(s, ["(max-width: 767px) 47.5px, 57px", "47.5px", "38px", "178.704px", ""]) && uguali(s.slice(0, 4).map((x) => sizesPerZoom(x)), ["(max-width: 767px) 47.5px, 114px", "(max-width: 767px) 47.5px, 95px", "(max-width: 767px) 38px, 76px", "(max-width: 767px) 178.704px, 357.408px"]),
      s,
    );
    // Telefoni di riferimento: marchio 285×240 con -t143 e 285; Chromium prende il primo candidato con densità ≥ DPR
    // (come scegliCandidato): a 40 px d'altezza il DPR 3 chiede 142,5 px, il DPR 1,75 ne chiede 83.
    const candidati = [{ url: "143", w: 143 }, { url: "285", w: 285 }];
    caso("marchio da telefono a 390@3, 412@1,75 e 430@3: variante -t143", [3, 1.75, 3].every((dpr, i) => scegliCandidato(candidati, valutaSizes(sizesPerZoom(s[0]), [390, 412, 430][i]) * dpr).w === 143));
  } finally {
    rmSync(dirLogo, { recursive: true, force: true });
  }
  caso("SIZES a 700 px: card calc(50vw - 2.25rem) = 314, riga calc(40vw - 1.2rem) = 261", Math.round(valutaSizes(SIZES.card, 700)) === 314 && Math.round(valutaSizes(SIZES.cardRiga, 700)) === 261);
  const gal = [valutaSizes(sizesGalleria(true, 3), 412), valutaSizes(sizesGalleria(false, 3), 412), valutaSizes(sizesGalleria(false, 2), 1100), valutaSizes(sizesGalleria(false, 4), 1300), valutaSizes(sizesGalleria(false, 1), 1300)].map(Math.round);
  caso("galleria: riga intera 364 e mezza 176 a 412; 2 per riga 510 a 1100; 4 per riga 300 e 1 per riga 1216 a 1300", uguali(gal, [364, 176, 510, 300, 1216]), gal);
  caso("galleria: riga da 5 foto → errore", !!lancia(() => sizesGalleria(false, 5)));
  const vietate = ["100%", "(min-width: 640px) 50vw, 100vw", "calc(100vw + 2rem)", "50vw, 100vw", "(max-width: 640px) 50vw", "", "(max-width: 640px) 50vw,, 100vw", "min(100vw, 400px)"];
  const nonRifiutate = vietate.filter((v) => !lancia(() => valutaSizes(v, 412)));
  caso("sizes fuori grammatica → errore (percentuali, min-width, calc con +, voce senza condizione, senza finale, vuoti, min())", nonRifiutate.length === 0, nonRifiutate);
  const c = [{ url: "a", w: 400 }, { url: "b", w: 960 }, { url: "c", w: 640 }];
  caso("candidato: il più piccolo largo abbastanza, altrimenti il più grande", scegliCandidato(c, 500).w === 640 && scegliCandidato(c, 640).w === 640 && scegliCandidato(c, 1000).w === 960 && scegliCandidato(c, 10).w === 400);
  caso("srcset: descrittori di larghezza letti; densità (2x) → errore", uguali(leggiSrcset("/a-400.avif 400w, /a-640.avif 640w"), [{ url: "/a-400.avif", w: 400 }, { url: "/a-640.avif", w: 640 }]) && !!lancia(() => leggiSrcset("/a.jpg 2x")));
  caso("famiglie del preset: meridian Archivo/Archivo, canon Playfair Display/Source Serif 4", uguali(famigliePreset("meridian"), { titoli: "Archivo", testo: "Archivo" }) && uguali(famigliePreset("canon"), { titoli: "Playfair Display", testo: "Source Serif 4" }));
  caso("preset inesistente → errore", !!lancia(() => famigliePreset("../x")));
  const css = `@font-face{font-family:Archivo;font-style:normal;src:url(/fonts/archivo-400-latin-ext.woff2)format("woff2");unicode-range:U+100-2BA,U+2BD-2C5}@font-face{font-family:Archivo;font-style:normal;src:url(/fonts/archivo-400-latin.woff2)format("woff2");unicode-range:U+??,U+131}@font-face{font-family:"Inter Tight";src:url(/fonts/inter-tight-400-latin.woff2);unicode-range:U+0000-00FF}@font-face{font-family:Archivo;font-weight:700;src:url(/fonts/archivo-400-latin.woff2)format("woff2");unicode-range:U+??}`;
  caso("font latin: solo il sottoinsieme che copre la «a» (anche U+?? minificato), famiglie tra virgolette, file contati una volta", uguali(fontLatini(css, ["Archivo", "Inter Tight"]), ["/fonts/archivo-400-latin.woff2", "/fonts/inter-tight-400-latin.woff2"]) && uguali(fontLatini(css, ["Inter"]), []), fontLatini(css, ["Archivo", "Inter Tight"]));
}

/* ---------- budget su una dist sintetica ---------- */

const tmpDist = mkdtempSync(join(tmpdir(), "test-budget-"));
try {
  const scrivi = (rel: string, contenuto: string | Buffer) => {
    mkdirSync(join(tmpDist, rel, ".."), { recursive: true });
    writeFileSync(join(tmpDist, rel), contenuto);
  };
  const byte = (kb: number) => Buffer.alloc(Math.round(kb * 1024), 7);
  scrivi("_astro/stile.css", `@font-face{font-family:Archivo;src:url(/fonts/archivo-400-latin.woff2)format("woff2");unicode-range:U+??}`);
  scrivi("fonts/archivo-400-latin.woff2", byte(34));
  for (const w of [400, 640, 960]) {
    scrivi(`media/zz/v/hero.aaaaaaaa-${w}.avif`, byte(w / 4));
    scrivi(`media/zz/v/hero.aaaaaaaa-${w}.jpg`, byte(w / 2));
  }
  scrivi("media/zz/v/mark.bbbbbbbb-171.avif", byte(8));
  scrivi("media/zz/v/mark.bbbbbbbb-171.png", byte(45));
  scrivi("media/zz/v/favicon.cccccccc-96.png", byte(6));
  const picture = (extra = "") =>
    `<picture><source type="image/avif" srcset="/media/zz/v/hero.aaaaaaaa-400.avif 400w, /media/zz/v/hero.aaaaaaaa-640.avif 640w, /media/zz/v/hero.aaaaaaaa-960.avif 960w" sizes="(max-width: 639px) calc(100vw - 3rem), 400px"><img src="/media/zz/v/hero.aaaaaaaa-960.jpg" srcset="/media/zz/v/hero.aaaaaaaa-400.jpg 400w, /media/zz/v/hero.aaaaaaaa-640.jpg 640w, /media/zz/v/hero.aaaaaaaa-960.jpg 960w" sizes="(max-width: 639px) calc(100vw - 3rem), 400px" width="1920" height="1088" alt="h"${extra}></picture>`;
  const pagina = (corpo: string) =>
    `<!doctype html><html lang="it" data-preset="meridian" style="--brand-primary:#000"><head><link rel="icon" href="/media/zz/v/favicon.cccccccc-96.png"><link rel="stylesheet" href="/_astro/stile.css"><script type="application/ld+json">{"name":"<b>"}</script><script defer src="https://umami.invalid/script.js"></script></head><body>` +
    `<picture><source type="image/avif" srcset="/media/zz/v/mark.bbbbbbbb-171.avif 171w" sizes="48px"><img src="/media/zz/v/mark.bbbbbbbb-171.png" srcset="/media/zz/v/mark.bbbbbbbb-171.png 171w" sizes="48px" width="285" height="240" alt></picture>${corpo}</body></html>`;
  scrivi("index.html", pagina(picture(' loading="eager" fetchpriority="high"')));
  scrivi("privacy/index.html", pagina(""));

  const ok = budgetDist(tmpDist);
  const home = ok.pagine.find((p) => p.pagina === "/")!;
  // 412 px: calc(100vw - 3rem) = 364 × 1,75 = 637 → 640 AVIF (160 KB); marchio AVIF 8; font 34; favicon 6.
  const tipi = home.risorse.map((r) => `${r.tipo}:${r.url.split("/").pop()}`);
  caso("budget: sceglie AVIF 640 per 364 px × 1,75, conta marchio AVIF, font latin del preset, favicon; JSON-LD e script inline ignorati", uguali(tipi.slice(1).sort(), ["css:stile.css", "favicon:favicon.cccccccc-96.png", "font:archivo-400-latin.woff2", "immagine:hero.aaaaaaaa-640.avif", "immagine:mark.bbbbbbbb-171.avif"]) && Math.round(home.immaginiKb) === 168, { tipi, immaginiKb: home.immaginiKb });
  caso("budget: richieste = documento + css + favicon + font + 2 immagini + 1 script esterno = 7", home.richieste === 7, home.richieste);
  caso("budget sotto soglia: nessun errore né avviso, pagine in ordine di path", ok.errori.length === 0 && ok.avvisi.length === 0 && uguali(ok.pagine.map((p) => p.pagina), ["/", "/privacy/"]), ok);
  const oltre = budgetDist(tmpDist, { totaleKb: 100, immaginiKb: 50, richieste: 6, fotoLcpKb: SOGLIE.fotoLcpKb });
  const msg = oltre.avvisi.find((a) => a.startsWith("budget superato su /:"));
  caso(
    "budget sforato → avviso leggibile con le voci oltre soglia e le 3 risorse più pesanti (non un errore)",
    oltre.errori.length === 0 && msg === "budget superato su /: totale 209 KB (max 100 KB), immagini 168 KB (max 50 KB), 7 richieste (max 6). Le più pesanti: hero 640w 160 KB, archivo-400-latin.woff2 34 KB, mark 171w 8 KB.",
    oltre.avvisi,
  );

  scrivi("difetti/index.html", pagina(`<img src="/media/zz/foto.jpg" alt="a"><img src="https://esempio.invalid/x.jpg" alt="b">${picture(' fetchpriority="high" loading="lazy"')}${picture(' fetchpriority="high"').replace("hero.aaaaaaaa-960.avif 960w", "hero.aaaaaaaa-1920.avif 1920w")}<picture><source type="image/avif" srcset="/media/zz/v/hero.aaaaaaaa-400.avif 400w" sizes="50%"><img src="/media/zz/v/hero.aaaaaaaa-400.jpg" srcset="/media/zz/v/hero.aaaaaaaa-400.jpg 400w" sizes="50%" width="1" height="1" alt="c"></picture>`));
  const dif = budgetDist(tmpDist);
  const trova = (arr: string[], s: string) => arr.some((x) => x.startsWith("/difetti/: ") && x.includes(s));
  caso("errore: <img> di /media senza width/height", trova(dif.errori, "<img> di /media senza width/height: /media/zz/foto.jpg"), dif.errori);
  caso("errore: <img> raster di /media senza srcset", trova(dif.errori, "senza srcset (varianti non generate): /media/zz/foto.jpg"), dif.errori);
  caso("errore: file referenziato assente nella dist", trova(dif.errori, "file referenziato assente nella dist: /media/zz/v/hero.aaaaaaaa-1920.avif"), dif.errori);
  caso("errore: sizes fuori grammatica", trova(dif.errori, "fuori grammatica"), dif.errori);
  caso("avviso (non errore): immagine esterna senza dimensioni", trova(dif.avvisi, "immagine senza dimensioni (può spostare il layout): https://esempio.invalid/x.jpg") && !trova(dif.errori, "esempio.invalid"), dif.avvisi);
  caso("avvisi: fetchpriority alta con lazy e più di una per pagina", trova(dif.avvisi, 'fetchpriority="high" e loading="lazy" insieme') && trova(dif.avvisi, '2 immagini con fetchpriority="high"'), dif.avvisi);

  // Riga di comando: errori → exit 1 e al massimo 3 righe su stderr; senza errori → exit 0 e ESITO.
  const cli = (dist: string) => spawnSync(process.execPath, ["--experimental-strip-types", join(import.meta.dirname, "budget-pagine.ts"), dist], { encoding: "utf8" });
  const r1 = cli(tmpDist);
  const righeErr = r1.stderr.trim().split("\n");
  caso("CLI con errori tecnici: exit 1, ≤ 3 righe su stderr, l'ultima riassume il resto", r1.status === 1 && righeErr.length === 3 && /^… e altri \d+ errori tecnici$/.test(righeErr[2]), { status: r1.status, stderr: r1.stderr });
  rmSync(join(tmpDist, "difetti"), { recursive: true });
  const r2 = cli(tmpDist);
  const esito = /^ESITO (\{.*\})$/m.exec(r2.stdout)?.[1];
  caso("CLI senza errori: exit 0, tabella e riga ESITO con gli avvisi", r2.status === 0 && r2.stdout.includes("OLTRE") === false && !!esito && uguali(JSON.parse(esito), { avvisi: [] }), { status: r2.status, stdout: r2.stdout, stderr: r2.stderr });
  // Il log della scheda Build riduce gli spazi di fila: ogni numero porta la sua etichetta.
  const righeTabella = r2.stdout.split("\n").filter((r) => !r.startsWith("ESITO"));
  caso(
    "CLI: tabella leggibile senza spazi di fila (soglie in una riga, poi una riga etichettata per pagina)",
    righeTabella[0] === `soglie per pagina (412 px, DPR 1,75): totale ${SOGLIE.totaleKb.toLocaleString("it-IT")} KB · immagini ${SOGLIE.immaginiKb.toLocaleString("it-IT")} KB · ${SOGLIE.richieste} richieste · foto LCP ${SOGLIE.fotoLcpKb} KB` &&
      /^\/ · totale \d+ KB · immagini 168 KB · 7 richieste · ok$/.test(righeTabella[1]) &&
      /^\/privacy\/ · totale \d+ KB · immagini 8 KB · \d+ richieste · ok$/.test(righeTabella[2]) &&
      !r2.stdout.includes("  "),
    righeTabella,
  );
} finally {
  rmSync(tmpDist, { recursive: true, force: true });
}

/* ---------- budget con le sorgenti da telefono (piano T1c) ---------- */

const tmpTel = mkdtempSync(join(tmpdir(), "test-budget-telefono-"));
try {
  const scrivi = (rel: string, kb: number) => {
    mkdirSync(join(tmpTel, rel, ".."), { recursive: true });
    writeFileSync(join(tmpTel, rel), Buffer.alloc(Math.round(kb * 1024), 7));
  };
  const v = "/media/zz/v/";
  for (const [f, kb] of [["hero.aaaaaaaa-r640.avif", 150], ["hero.aaaaaaaa-r860.avif", 260], ["hero.aaaaaaaa-1280.avif", 500], ["hero.aaaaaaaa-1920.avif", 700], ["hero.aaaaaaaa-1280.jpg", 600], ["hero.aaaaaaaa-1920.jpg", 900], ["card.bbbbbbbb-t400.avif", 20], ["card.bbbbbbbb-t640.avif", 45], ["card.bbbbbbbb-640.avif", 90], ["card.bbbbbbbb-1216.avif", 300], ["card.bbbbbbbb-640.jpg", 100], ["card.bbbbbbbb-1216.jpg", 350]] as const) scrivi(`media/zz/v/${f}`, kb);
  const hero = (media = "(max-width: 430px)", extra = ' fetchpriority="high"') =>
    `<picture><source media="${media}" type="image/avif" srcset="${v}hero.aaaaaaaa-r640.avif 640w, ${v}hero.aaaaaaaa-r860.avif 860w" sizes="${RITAGLIO.sizes}" width="860" height="1088"><source type="image/avif" srcset="${v}hero.aaaaaaaa-1280.avif 1280w, ${v}hero.aaaaaaaa-1920.avif 1920w" sizes="(max-width: 767px) 1170px, (max-width: 1469px) 2940px, 200vw"><img src="${v}hero.aaaaaaaa-1280.jpg" srcset="${v}hero.aaaaaaaa-1280.jpg 1280w, ${v}hero.aaaaaaaa-1920.jpg 1920w" sizes="(max-width: 767px) 1170px, (max-width: 1469px) 2940px, 200vw" width="1920" height="1088" alt="h"${extra}></picture>`;
  const card = `<picture><source media="(max-width: 767px)" type="image/avif" srcset="${v}card.bbbbbbbb-t400.avif 400w, ${v}card.bbbbbbbb-t640.avif 640w" sizes="(max-width: 639px) calc(100vw - 3rem), (max-width: 767px) calc(50vw - 2.25rem), (max-width: 1023px) calc(100vw - 4.5rem), 800px"><source type="image/avif" srcset="${v}card.bbbbbbbb-640.avif 640w, ${v}card.bbbbbbbb-1216.avif 1216w" sizes="(max-width: 639px) calc(100vw - 3rem), (max-width: 767px) calc(50vw - 2.25rem), (max-width: 1023px) calc(100vw - 4.5rem), 800px"><img src="${v}card.bbbbbbbb-640.jpg" srcset="${v}card.bbbbbbbb-640.jpg 640w, ${v}card.bbbbbbbb-1216.jpg 1216w" sizes="(max-width: 639px) calc(100vw - 3rem), 800px" width="1216" height="912" alt="c" loading="lazy"></picture>`;
  const pagina = (corpo: string) => `<!doctype html><html lang="it"><head></head><body>${corpo}</body></html>`;
  writeFileSync(join(tmpTel, "index.html"), pagina(hero() + card));
  const t = budgetDist(tmpTel);
  const scelte = t.pagine[0].risorse.filter((r) => r.tipo === "immagine").map((r) => `${r.nota} ${r.url.split("-").pop()}`);
  caso("budget a 412 px: hero dal ritaglio (sizes 590px × 1,75 → r860), card dalla serie da telefono (364 × 1,75 → t640)", uguali(scelte, ["hero 860w r860.avif", "card 640w t640.avif"]) && t.errori.length === 0, { scelte, errori: t.errori });
  caso(
    "avviso foto LCP da telefono oltre 250 KB (r860 da 260 KB), non un errore",
    uguali(t.avvisi, ["foto LCP da telefono pesante su /: hero 860w 260 KB (max 250 KB), la prima schermata compare più tardi sul telefono. Una foto hero con meno dettagli fini pesa meno."]),
    t.avvisi,
  );
  caso("foto LCP sotto soglia o card pigra pesante: nessun avviso", budgetDist(tmpTel, { ...SOGLIE, fotoLcpKb: 260 }).avvisi.length === 0);
  writeFileSync(join(tmpTel, "index.html"), pagina(hero("(max-width: 400px)") + card));
  const oltre400 = budgetDist(tmpTel).pagine[0].risorse.filter((r) => r.tipo === "immagine").map((r) => r.nota);
  caso("media che non vale a 412 px: sorgente successiva senza media (hero 1920 per 1170 × 1,75)", uguali(oltre400, ["hero 1920w", "card 640w"]), oltre400);
  writeFileSync(join(tmpTel, "index.html"), pagina(hero("(min-width: 768px)") + card));
  const fuori = budgetDist(tmpTel).errori;
  caso("media fuori grammatica → errore tecnico leggibile", fuori.length === 1 && fuori[0].includes("media «(min-width: 768px)» fuori grammatica"), fuori);
  caso("valutaMedia: assente vale sempre, (max-width: 430px) vale fino a 430 compresi", valutaMedia(undefined, 2000) && valutaMedia("(max-width: 430px)", 430) && !valutaMedia("(max-width: 430px)", 431));
} finally {
  rmSync(tmpTel, { recursive: true, force: true });
}

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
