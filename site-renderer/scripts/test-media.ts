// Banco delle «pagine leggere» (piano T1b §8.4), senza rete: scala e nomi delle varianti,
// cache, manifest da immagini sintetiche create con sharp in una cartella temporanea; `sizes`,
// scelta del candidato, font e budget su una dist sintetica.
//
//   cd site-renderer && node --experimental-strip-types scripts/test-media.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { generaVarianti, hashRicetta, raccogliRiferimenti, RICETTA, scala, urlVariante } from "./media-varianti.ts";
import { budgetDist, famigliePreset, fontLatini, leggiSrcset, scegliCandidato, valutaSizes } from "./budget-pagine.ts";
import { SIZES, sizesGalleria, sizesPerZoom } from "../src/lib/media.ts";

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
  const tuttiPresenti = Object.values(m.immagini).flatMap((v) => [...(v.avif ?? []), ...(v.jpeg ?? []), ...(v.png ?? [])]).every(([u]) => fileV.includes(u.split("/").pop()!));
  caso("ogni URL del manifest ha il suo file in v/", tuttiPresenti, fileV);
  const larghezzaVera = await sharp(join(media, "v", hero!.avif![1][0].split("/").pop()!)).metadata();
  caso("la variante da 640 è davvero larga 640 e in AVIF (heif)", larghezzaVera.width === 640 && larghezzaVera.format === "heif", { w: larghezzaVera.width, f: larghezzaVera.format });
  const tr = m.immagini[`${P}trasparente.png`];
  caso("foto con trasparenza: ripiego PNG, niente JPEG", !!tr?.png?.length && !tr.jpeg && uguali(tr.avif?.map(([, w]) => w), [400, 500]), tr);
  const mark = m.immagini[`${P}mark.png`];
  caso("marchio 285×240 (sotto i 288 px): solo PNG senza perdita alla misura dell'originale", mark?.w === 285 && mark.h === 240 && !mark.avif && uguali(mark.png?.map(([, w]) => w), [285]), mark);
  const markVero = await sharp(join(media, "v", mark!.png![0][0].split("/").pop()!)).metadata();
  caso("il PNG del marchio è 285×240", markVero.width === 285 && markVero.height === 240 && markVero.format === "png", { w: markVero.width, h: markVero.height });
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
  caso("seconda esecuzione: manifest identico e tutte le voci dalla cache", uguali(r2.manifest, m) && r2.righe.at(-1)!.includes(`${Object.keys(m.immagini).length + 2} voci, ${Object.keys(m.immagini).length + 2} dalla cache`), r2.righe.at(-1));
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

  // Errori leggibili.
  const assente = await rifiuta(() => generaVarianti({ site: { ...siteBase, sections: [{ type: "Hero", props: { image: { src: `${P}manca.jpg`, alt: "m" } } }] }, mediaDir: media, cacheDir: cache }));
  caso("src assente → errore che nomina il file", !!assente?.includes(`${P}manca.jpg`) && assente.includes("non c'è"), assente);
  const fuori = await rifiuta(() => generaVarianti({ site: { ...siteBase, sections: [{ type: "Hero", props: { image: { src: `${P}../altro/x.jpg`, alt: "m" } } }] }, mediaDir: media, cacheDir: cache }));
  caso("src che esce dalla cartella del cliente → errore", !!fuori?.includes("fuori da"), fuori);
  writeFileSync(join(media, "rotta.jpg"), "non è un'immagine");
  const rotta = await rifiuta(() => generaVarianti({ site: { ...siteBase, sections: [{ type: "Hero", props: { image: { src: `${P}rotta.jpg`, alt: "m" } } }] }, mediaDir: media, cacheDir: cache }));
  caso("file illeggibile → errore che nomina il file", !!rotta?.startsWith(`${P}rotta.jpg:`), rotta);
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
  const zoom = [sizesPerZoom(SIZES.card), sizesPerZoom(SIZES.hero), sizesPerZoom(sizesGalleria(false, 3)), sizesPerZoom("48px")];
  caso(
    "regola dello zoom: lunghezze × 2, condizioni intatte, stessa grammatica",
    uguali(zoom, [
      "(max-width: 639px) calc(200vw - 6rem), (max-width: 1023px) calc(100vw - 4.5rem), 800px",
      "(max-width: 767px) 2340px, (max-width: 1469px) 2940px, 200vw",
      "(max-width: 1023px) calc(100vw - 3.75rem), (max-width: 1279px) calc(66.8vw - 4rem), 800px",
      "96px",
    ]) && zoom.every((z) => !lancia(() => valutaSizes(z, 412))) && Math.round(valutaSizes(zoom[0], 412)) === 728,
    zoom,
  );
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
  const oltre = budgetDist(tmpDist, { totaleKb: 100, immaginiKb: 50, richieste: 6 });
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
} finally {
  rmSync(tmpDist, { recursive: true, force: true });
}

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
