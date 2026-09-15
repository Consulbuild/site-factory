// budget-pagine.ts — budget per pagina delle «pagine leggere» (docs/traffico/piano-T1b.md §4.5).
//
// Uso (da site-renderer/, lo lancia site-factory-editor/lib/build.ts dopo astro build, solo col
// servizio Traffico «Sito» attivo o sospeso):
//   node --experimental-strip-types scripts/budget-pagine.ts <dist>
//
// Calcolo statico e deterministico su ogni .html della dist, per il dispositivo del profilo
// mobile di Lighthouse (412 px, DPR 1,75), pagina scorsa tutta:
// - peso = HTML gzip + CSS/JS locali gzip + i file «latin» delle famiglie titoli/testo del
//   preset + per ogni immagine il candidato che sceglie il browser (il più piccolo largo almeno
//   `sizes` × DPR, altrimenti il più grande; dal primo <source> senza `media` o con un `media` che
//   vale a 412 px, come il browser (i formati che scrive Foto.astro, AVIF e PNG, li legge il
//   dispositivo di riferimento), altrimenti dall'<img>) + favicon;
// - richieste = documento + fogli + script (gli esterni contano 1, peso 0) + font + immagini + favicon.
//
// Budget superato o foto LCP da telefono (l'immagine con fetchpriority="high") oltre
// SOGLIE.fotoLcpKb → AVVISO (decisione dell'orchestratore, docs/traffico/decisioni-piani.md T1b
// punto 2): tabella nel log, exit 0 e riga `ESITO {"avvisi":[…]}` che la build accoda agli avvisi
// delle fondamenta. Errori tecnici → exit 1 con al massimo 3 righe su stderr: file referenziato
// assente nella dist, <img> di /media senza width/height o (raster) senza srcset, `sizes` o
// `media` fuori dalla grammatica di src/lib/media.ts.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const RADICE_RENDERER = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Profilo mobile di Lighthouse (Moto G Power). */
export const DISPOSITIVO = { larghezza: 412, dpr: 1.75 } as const;
/**
 * Soglie per pagina (calibrazione C6, piano T1b § Calibrazione): massimo misurato sulle home dei
 * 3 clienti e della fixture di Cavaliere nei 7 preset con la ricetta della decisione di Mattia
 * (qualità degli originali anche con lo zoom: 5.320 KB con canon, 5.112 KB di immagini, 25
 * richieste) + ~20 %, arrotondato. Fanno da guardia contro le regressioni, non da obiettivo.
 */
export const SOGLIE = { totaleKb: 6400, immaginiKb: 6100, richieste: 30, fotoLcpKb: 250 };

const RASTER = /\.(jpe?g|png|webp|avif|tiff?)$/i;

/* ------------------------------------------------------------------ */
/* sizes e srcset                                                      */
/* ------------------------------------------------------------------ */

const LUNGHEZZA = /^(?:(\d+(?:\.\d+)?)px|(\d+(?:\.\d+)?)vw|calc\((\d+(?:\.\d+)?)vw - (\d+(?:\.\d+)?)rem\))$/;

function lunghezza(s: string, vw: number): number {
  const m = LUNGHEZZA.exec(s.trim());
  if (!m) throw new Error(`lunghezza «${s.trim()}» fuori grammatica (Npx, Nvw o calc(Nvw - Nrem))`);
  if (m[1]) return Number(m[1]);
  if (m[2]) return (Number(m[2]) * vw) / 100;
  return (Number(m[3]) * vw) / 100 - Number(m[4]) * 16;
}

/**
 * Larghezza in CSS px di `sizes` al viewport `vw`. Grammatica chiusa (src/lib/media.ts): voci
 * «(max-width: Npx) LUNGHEZZA» separate da virgola e una LUNGHEZZA finale. Lancia se fuori.
 */
export function valutaSizes(sizes: string, vw: number): number {
  const voci = sizes.split(/,(?![^(]*\))/).map((v) => v.trim());
  if (!voci.length || voci.some((v) => !v)) throw new Error(`sizes «${sizes}» vuoto o con voci vuote`);
  for (const [i, v] of voci.entries()) {
    const ultima = i === voci.length - 1;
    const m = /^\(max-width: (\d+)px\) (.+)$/.exec(v);
    if (ultima) {
      if (m) throw new Error(`sizes «${sizes}»: manca la lunghezza finale senza condizione`);
      return lunghezza(v, vw);
    }
    if (!m) throw new Error(`sizes «${sizes}»: «${v}» non è «(max-width: Npx) LUNGHEZZA»`);
    const valore = lunghezza(m[2], vw);
    if (vw <= Number(m[1])) return valore;
  }
  throw new Error(`sizes «${sizes}» senza voci`);
}

export type Candidato = { url: string; w: number };

/** Candidati `url Nw` di un srcset (solo descrittori di larghezza, come li scrive Foto.astro). */
export function leggiSrcset(srcset: string): Candidato[] {
  return srcset
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const m = /^(\S+)\s+(\d+)w$/.exec(c);
      if (!m) throw new Error(`candidato di srcset «${c}» senza descrittore di larghezza`);
      return { url: m[1], w: Number(m[2]) };
    });
}

/**
 * `media` di un <source> al viewport `vw`: assente o vuoto vale sempre; altrimenti la sola forma
 * «(max-width: Npx)» che scrive Foto.astro. Lancia se fuori grammatica.
 */
export function valutaMedia(media: string | undefined, vw: number): boolean {
  if (!media?.trim()) return true;
  const m = /^\(max-width: (\d+)px\)$/.exec(media.trim());
  if (!m) throw new Error(`media «${media.trim()}» fuori grammatica ((max-width: Npx))`);
  return vw <= Number(m[1]);
}

/** Scelta del browser: il più piccolo largo almeno `bisogno` px, altrimenti il più grande. */
export function scegliCandidato(candidati: Candidato[], bisogno: number): Candidato {
  const ordinati = [...candidati].sort((a, b) => a.w - b.w);
  return ordinati.find((c) => c.w >= bisogno) ?? ordinati[ordinati.length - 1];
}

/* ------------------------------------------------------------------ */
/* HTML (a regex sull'output dei NOSTRI componenti, come lib/fondamenta.ts dell'editor) */
/* ------------------------------------------------------------------ */

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

function attributi(corpo: string): Record<string, string> {
  const a: Record<string, string> = {};
  for (const m of corpo.matchAll(/([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    a[m[1].toLowerCase()] = (m[2] ?? m[3] ?? m[4] ?? "").replace(/&amp;/g, "&");
  }
  return a;
}

const locale = (url: string) => url.startsWith("/") && !url.startsWith("//");

/* ------------------------------------------------------------------ */
/* Font del preset                                                     */
/* ------------------------------------------------------------------ */

/** Famiglie titoli e testo di un preset (presets/<p>.tokens.json), riferimenti {x} risolti. */
export function famigliePreset(preset: string, dirPreset = join(RADICE_RENDERER, "presets")): { titoli: string; testo: string } {
  const file = join(dirPreset, `${preset}.tokens.json`);
  if (!/^[a-z0-9-]+$/.test(preset) || !existsSync(file)) throw new Error(`preset «${preset}» senza token (${relative(RADICE_RENDERER, file)})`);
  const t = JSON.parse(readFileSync(file, "utf8")) as Record<string, { $value?: unknown }>;
  const valore = (k: string, giri = 0): string => {
    const v = t[k]?.$value;
    if (typeof v !== "string") throw new Error(`preset «${preset}»: ${k} assente`);
    const rif = /^\{(.+)\}$/.exec(v);
    return rif && giri < 5 ? valore(rif[1], giri + 1) : v;
  };
  return { titoli: valore("brand-font-heading"), testo: valore("brand-font-body") };
}

/** Il blocco copre la «a» (U+0061)? Così si riconosce il sottoinsieme latin, anche minificato (U+??). */
function copreLatino(unicodeRange: string): boolean {
  return unicodeRange.split(",").some((r) => {
    const m = /^\s*U\+([0-9A-F?]+)(?:-([0-9A-F]+))?\s*$/i.exec(r);
    if (!m) return false;
    const lo = parseInt(m[1].replace(/\?/g, "0"), 16);
    const hi = parseInt(m[2] ?? m[1].replace(/\?/g, "F"), 16);
    return lo <= 0x61 && 0x61 <= hi;
  });
}

/** URL dei file latin delle famiglie indicate, dai @font-face del CSS. */
export function fontLatini(css: string, famiglie: string[]): string[] {
  const cercate = new Set(famiglie.map((f) => f.toLowerCase()));
  const url = new Set<string>();
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const fam = /font-family:\s*(?:"([^"]+)"|'([^']+)'|([^;]+))/.exec(m[1]);
    const nome = (fam?.[1] ?? fam?.[2] ?? fam?.[3] ?? "").trim().toLowerCase();
    const src = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(m[1])?.[1];
    const range = /unicode-range:\s*([^;]+)/.exec(m[1])?.[1];
    if (cercate.has(nome) && src && (!range || copreLatino(range))) url.add(src);
  }
  return [...url];
}

/* ------------------------------------------------------------------ */
/* Pagina e dist                                                       */
/* ------------------------------------------------------------------ */

export type Risorsa = { tipo: "html" | "css" | "js" | "font" | "immagine" | "favicon"; url: string; kb: number; nota?: string };
export type EsitoPagina = { pagina: string; totaleKb: number; immaginiKb: number; richieste: number; risorse: Risorsa[]; errori: string[]; avvisi: string[] };

/** Budget di una pagina. `dist` serve a leggere i file locali (e a dire quali mancano). */
export function analizzaPagina(dist: string, pagina: string, html: string, soglie = SOGLIE): EsitoPagina {
  const errori: string[] = [];
  const avvisi: string[] = [];
  const risorse: Risorsa[] = [{ tipo: "html", url: pagina, kb: gzipSync(html).length / 1024 }];
  const esterni = new Set<string>();
  const giaContate = new Set<string>();

  const file = (url: string): string | null => {
    const p = resolve(dist, "." + decodeURIComponent(url.split(/[?#]/)[0]));
    if (!p.startsWith(resolve(dist) + sep) || !existsSync(p) || !statSync(p).isFile()) {
      errori.push(`${pagina}: file referenziato assente nella dist: ${url}`);
      return null;
    }
    return p;
  };
  const aggiungi = (tipo: Risorsa["tipo"], url: string, gzip: boolean, nota?: string) => {
    if (!locale(url)) {
      esterni.add(url);
      return;
    }
    if (giaContate.has(url)) return;
    const p = file(url);
    if (!p) return;
    giaContate.add(url);
    const buf = readFileSync(p);
    risorse.push({ tipo, url, kb: (gzip ? gzipSync(buf).length : buf.length) / 1024, ...(nota ? { nota } : {}) });
  };

  // Script e stili inline via: il loro testo (JSON-LD, listener Umami) non contiene tag veri.
  const pulito = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b([^>]*)>[\s\S]*?<\/\1>/gi, "<$1$2></$1>");
  let preset: string | null = null;
  let stileHtml = "";
  const fogli: string[] = [];
  let sorgenti: Record<string, string>[] = [];
  let dentroPicture = false;
  let priorita = 0;

  for (const m of pulito.matchAll(TAG)) {
    const [, chiusura, nomeGrezzo, corpo] = m;
    const nome = nomeGrezzo.toLowerCase();
    if (nome === "picture") {
      dentroPicture = !chiusura;
      sorgenti = [];
      continue;
    }
    if (chiusura) continue;
    const a = attributi(corpo);
    if (nome === "html") {
      preset = a["data-preset"] ?? null;
      stileHtml = a.style ?? "";
    } else if (nome === "link" && a.href) {
      const rel = (a.rel ?? "").toLowerCase().split(/\s+/);
      if (rel.includes("stylesheet")) {
        aggiungi("css", a.href, true);
        if (locale(a.href)) fogli.push(a.href);
      } else if (rel.includes("icon")) aggiungi("favicon", a.href, false);
    } else if (nome === "script" && a.src) {
      aggiungi("js", a.src, true);
    } else if (nome === "source" && dentroPicture) {
      sorgenti.push(a);
    } else if (nome === "img") {
      const src = a.src ?? "";
      const media = src.startsWith("/media/");
      const etichetta = src.split("/").pop() || src;
      if (a.fetchpriority === "high") {
        priorita++;
        if (a.loading === "lazy") avvisi.push(`${pagina}: ${etichetta} ha fetchpriority="high" e loading="lazy" insieme`);
      }
      if (!a.width || !a.height) {
        if (media) errori.push(`${pagina}: <img> di /media senza width/height: ${src}`);
        else avvisi.push(`${pagina}: immagine senza dimensioni (può spostare il layout): ${src}`);
      }
      if (media && RASTER.test(src) && !a.srcset) errori.push(`${pagina}: <img> di /media senza srcset (varianti non generate): ${src}`);
      let scelta: Candidato = { url: src, w: 0 };
      try {
        for (const s of [a.srcset, ...sorgenti.map((x) => x.srcset)]) if (s) for (const c of leggiSrcset(s)) if (locale(c.url)) file(c.url);
        // Come il browser: il primo <source> il cui `media` vale (tutti validati), altrimenti l'<img>.
        const valide = sorgenti.filter((x) => valutaMedia(x.media, DISPOSITIVO.larghezza));
        const origine = valide[0] ?? a;
        if (origine.srcset) {
          const sizes = origine.sizes ?? "100vw";
          const bisogno = valutaSizes(sizes, DISPOSITIVO.larghezza) * DISPOSITIVO.dpr;
          scelta = scegliCandidato(leggiSrcset(origine.srcset), bisogno);
        }
      } catch (e) {
        errori.push(`${pagina}: ${src}: ${e instanceof Error ? e.message : String(e)}`);
      }
      // Nome senza hash e misura (-640, -t640 da telefono, -r860 ritaglio) + larghezza scelta.
      const nota = `${etichetta.replace(/\.[0-9a-f]{8}-[rt]?\d+\.\w+$/, "")} ${scelta.w ? `${scelta.w}w` : "originale"}`;
      if (scelta.url) aggiungi("immagine", scelta.url, false, nota);
      const lcp = a.fetchpriority === "high" ? risorse.find((r) => r.url === scelta.url) : undefined;
      if (lcp && lcp.kb > soglie.fotoLcpKb) {
        avvisi.push(`foto LCP da telefono pesante su ${pagina}: ${nota} ${kb(lcp.kb)} (max ${kb(soglie.fotoLcpKb)}), la prima schermata compare più tardi sul telefono. Una foto hero con meno dettagli fini pesa meno.`);
      }
      if (!dentroPicture) sorgenti = [];
    }
  }
  if (priorita > 1) avvisi.push(`${pagina}: ${priorita} immagini con fetchpriority="high" (attesa al massimo una, la hero)`);

  // Font: i file latin delle famiglie del preset che il cliente non sostituisce con font propri.
  if (preset) {
    try {
      const fam = famigliePreset(preset);
      const famiglie = [
        ...(stileHtml.includes("--brand-font-heading:") ? [] : [fam.titoli]),
        ...(stileHtml.includes("--brand-font-body:") ? [] : [fam.testo]),
      ];
      const css = fogli.map((f) => file(f)).filter((p): p is string => !!p).map((p) => readFileSync(p, "utf8")).join("\n");
      for (const url of fontLatini(css, famiglie)) aggiungi("font", url, false);
    } catch (e) {
      errori.push(`${pagina}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const somma = (f: (r: Risorsa) => boolean) => risorse.filter(f).reduce((s, r) => s + r.kb, 0);
  return {
    pagina,
    totaleKb: somma(() => true),
    immaginiKb: somma((r) => r.tipo === "immagine"),
    richieste: risorse.length + esterni.size,
    risorse,
    errori: [...new Set(errori)],
    avvisi: [...new Set(avvisi)],
  };
}

const kb = (n: number) => `${Math.round(n).toLocaleString("it-IT")} KB`;

/** Avviso di budget per una pagina, o null se rientra. Dice cosa alleggerire. */
export function avvisoBudget(e: EsitoPagina, soglie = SOGLIE): string | null {
  const sforati: string[] = [];
  if (e.totaleKb > soglie.totaleKb) sforati.push(`totale ${kb(e.totaleKb)} (max ${kb(soglie.totaleKb)})`);
  if (e.immaginiKb > soglie.immaginiKb) sforati.push(`immagini ${kb(e.immaginiKb)} (max ${kb(soglie.immaginiKb)})`);
  if (e.richieste > soglie.richieste) sforati.push(`${e.richieste} richieste (max ${soglie.richieste})`);
  if (!sforati.length) return null;
  const pesanti = e.risorse
    .filter((r) => r.tipo === "immagine" || r.tipo === "font")
    .sort((a, b) => b.kb - a.kb)
    .slice(0, 3)
    .map((r) => `${r.nota ?? r.url.split("/").pop()} ${kb(r.kb)}`);
  return `budget superato su ${e.pagina}: ${sforati.join(", ")}. Le più pesanti: ${pesanti.join(", ")}.`;
}

/** Tutte le pagine .html della dist, in ordine di path. */
export function budgetDist(dist: string, soglie = SOGLIE): { pagine: EsitoPagina[]; errori: string[]; avvisi: string[] } {
  const pagine: EsitoPagina[] = [];
  const visita = (dir: string, rel: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) visita(join(dir, e.name), r);
      else if (e.name.endsWith(".html")) {
        const pagina = e.name === "index.html" ? `/${rel ? `${rel}/` : ""}` : `/${r}`;
        pagine.push(analizzaPagina(dist, pagina, readFileSync(join(dir, e.name), "utf8"), soglie));
      }
    }
  };
  visita(resolve(dist), "");
  pagine.sort((a, b) => (a.pagina < b.pagina ? -1 : a.pagina > b.pagina ? 1 : 0));
  const errori = pagine.flatMap((p) => p.errori);
  const avvisi = [...pagine.flatMap((p) => p.avvisi), ...pagine.map((p) => avvisoBudget(p, soglie)).filter((a): a is string => !!a)];
  return { pagine, errori, avvisi };
}

function main(): void {
  const dist = process.argv[2];
  if (!dist || !existsSync(dist)) {
    console.error(`budget-pagine: dist «${dist ?? ""}» assente\nuso: budget-pagine.ts <dist>`);
    process.exit(1);
  }
  let esito: ReturnType<typeof budgetDist>;
  try {
    esito = budgetDist(dist);
  } catch (e) {
    console.error(`budget-pagine: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  // Una riga per pagina con le etichette scritte: il log della scheda Build riduce gli spazi di fila
  // a uno solo, quindi niente colonne allineate con gli spazi.
  console.log(`soglie per pagina (412 px, DPR 1,75): totale ${kb(SOGLIE.totaleKb)} · immagini ${kb(SOGLIE.immaginiKb)} · ${SOGLIE.richieste} richieste · foto LCP ${kb(SOGLIE.fotoLcpKb)}`);
  for (const p of esito.pagine) {
    const oltre = avvisoBudget(p) !== null;
    console.log(`${p.pagina} · totale ${kb(p.totaleKb)} · immagini ${kb(p.immaginiKb)} · ${p.richieste} richieste · ${oltre ? "OLTRE" : "ok"}`);
  }
  if (esito.errori.length) {
    const righe = esito.errori.slice(0, esito.errori.length > 3 ? 2 : 3);
    if (esito.errori.length > 3) righe.push(`… e altri ${esito.errori.length - 2} errori tecnici`);
    for (const r of righe) console.error(r);
    process.exit(1);
  }
  for (const a of esito.avvisi) console.log(`avviso: ${a}`);
  console.log(`ESITO ${JSON.stringify({ avvisi: esito.avvisi })}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
