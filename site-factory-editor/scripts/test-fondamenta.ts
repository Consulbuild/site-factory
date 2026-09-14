// Banco di prova deterministico delle fondamenta SEO (lib/fondamenta.ts), nessuna rete:
// regola «fondamenta attese» e interlock del deploy, tipo schema.org, indirizzo
// strutturato (comuni in linea + comuni.json reale), JSON-LD, hash del testo per lastmod,
// sitemap/robots/_headers, controlli sulle pagine, chiave IndexNow e cottura su una dist
// sintetica in una cartella temporanea (cancellata a fine banco).
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-fondamenta.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  fondamentaAttese,
  motivoRifiutoFondamenta,
  TIPO_PER_MESTIERE,
  tipoSchema,
  indirizzoStrutturato,
  datiStrutturati,
  chiaviVietate,
  testoIndicizzabile,
  hashPagina,
  aggiornaLastmod,
  sitemapXml,
  robotsTxt,
  HEADERS_WORKERS_DEV,
  controllaPagina,
  elencoPagine,
  chiaveIndexNow,
  cuociFondamenta,
  type Comune,
  type InputDatiStrutturati,
} from "../lib/fondamenta.ts";
import { TESTI } from "../lib/inbox-form.ts";

let passati = 0;
let falliti = 0;
function caso(nome: string, ok: boolean, dettaglio?: unknown): void {
  if (ok) passati += 1;
  else falliti += 1;
  console.log(`${ok ? "✓" : "✗"} ${nome}${!ok && dettaglio !== undefined ? ` → ${JSON.stringify(dettaglio)}` : ""}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sf-fondamenta-"));
try {
  /* ---------------------------------------------------------------- */
  console.log("\nfondamentaAttese (unica regola di build e deploy):");
  const t = (stato: "spento" | "attivo" | "sospeso") => ({ sito: { stato }, scheda: { stato: "spento" as const } });
  caso("sito spento + dominio → null", fondamentaAttese({ percorso: "completo", traffico: t("spento") }, "a.it") === null);
  caso("attivo + dominio → dominio", fondamentaAttese({ percorso: "completo", traffico: t("attivo") }, "a.it") === "a.it");
  caso("sospeso + dominio → dominio (decisione 11)", fondamentaAttese({ percorso: "completo", traffico: t("sospeso") }, "a.it") === "a.it");
  caso("attivo senza dominio → null", fondamentaAttese({ percorso: "completo", traffico: t("attivo") }, undefined) === null);
  caso("percorso demo + sospeso + dominio → null", fondamentaAttese({ percorso: "demo", traffico: t("sospeso") }, "a.it") === null);
  caso("senza campo traffico → null", fondamentaAttese({ percorso: "completo" }, "a.it") === null);

  console.log("\nmotivoRifiutoFondamenta (interlock del deploy):");
  const m1 = motivoRifiutoFondamenta(null, "a.it") ?? "";
  caso("build senza, attese a.it → «senza le fondamenta» + Ribuilda", m1.includes("senza le fondamenta") && m1.includes("Ribuilda") && m1.includes("a.it"), m1);
  const m2 = motivoRifiutoFondamenta("b.it", null) ?? "";
  caso("build per b.it, attese nessuna → «contiene le fondamenta»", m2.includes("contiene le fondamenta") && m2.includes("b.it"), m2);
  const m3 = motivoRifiutoFondamenta("b.it", "a.it") ?? "";
  caso("b.it contro a.it → entrambi i domini", m3.includes("b.it") && m3.includes("a.it"), m3);
  caso("entrambe null → null", motivoRifiutoFondamenta(null, null) === null);
  caso("entrambe a.it → null", motivoRifiutoFondamenta("a.it", "a.it") === null);

  /* ---------------------------------------------------------------- */
  console.log("\ntipoSchema (mestiere del form, poi settore di contesto.json):");
  const tipo = (id?: string, settore?: string) => tipoSchema(id, settore).tipo;
  caso("impresa-edile e ristrutturazioni → GeneralContractor", tipo("impresa-edile") === "GeneralContractor" && tipo("ristrutturazioni") === "GeneralContractor");
  caso("idraulico → Plumber, elettricista → Electrician, imbianchino → HousePainter", tipo("idraulico") === "Plumber" && tipo("elettricista") === "Electrician" && tipo("imbianchino") === "HousePainter");
  caso("cartongesso e serramenti → HomeAndConstructionBusiness anche con settore Edilizia", tipo("cartongesso", "Edilizia") === "HomeAndConstructionBusiness" && tipo("serramenti", "Edilizia") === "HomeAndConstructionBusiness");
  caso("id assente, altro, sconosciuto senza settore → HomeAndConstructionBusiness", [tipo(), tipo("altro"), tipo("giardiniere")].every((x) => x === "HomeAndConstructionBusiness"));
  caso("storico senza id, settore «Edilizia» → GeneralContractor", tipo(undefined, "Edilizia") === "GeneralContractor", tipoSchema(undefined, "Edilizia"));
  caso("altro + «Impianti idraulici e termoidraulica» → Plumber", tipo("altro", "Impianti idraulici e termoidraulica") === "Plumber");
  caso("«Impianti elettrici» → Electrician; «Pittura e tinteggiatura» → HousePainter", tipo(undefined, "Impianti elettrici") === "Electrician" && tipo(undefined, "Pittura e tinteggiatura") === "HousePainter");
  caso("«Rifacimento tetti e coperture» → RoofingContractor; «Climatizzazione» → HVACBusiness", tipo(undefined, "Rifacimento tetti e coperture") === "RoofingContractor" && tipo(undefined, "Climatizzazione") === "HVACBusiness");
  caso("più mestieri con edilizia → GeneralContractor", tipo(undefined, "Edilizia, impianti elettrici e idraulici") === "GeneralContractor");
  caso("idraulica + elettricità senza edilizia → HomeAndConstructionBusiness", tipo(undefined, "Impianti idraulici ed elettrici") === "HomeAndConstructionBusiness");
  caso("«Studio di architettura» non è RoofingContractor (tett solo a inizio parola)", tipo(undefined, "Studio di architettura") === "HomeAndConstructionBusiness");
  caso("fonte leggibile nel riepilogo", tipoSchema("impresa-edile", undefined).fonte.includes("impresa-edile") && tipoSchema(undefined, "Edilizia").fonte.includes("Edilizia"));
  const mancanti = Object.keys(TESTI.mestieri).filter((id) => !(id in TIPO_PER_MESTIERE));
  caso("ogni mestiere del form (TESTI.mestieri) ha una voce esplicita", mancanti.length === 0, mancanti);

  /* ---------------------------------------------------------------- */
  console.log("\nindirizzoStrutturato:");
  const COMUNI: Comune[] = [
    { nome: "Cologno Monzese", sigla: "MI", cap: ["20093"] },
    { nome: "Milano", sigla: "MI", cap: ["20121", "20122"] },
    { nome: "Vicenza", sigla: "VI", cap: ["36100"] },
    { nome: "Sandrigo", sigla: "VI", cap: ["36066"] },
    { nome: "San Martino", sigla: "TO", cap: ["10010"] },
    { nome: "San Martino Canavese", sigla: "TO", cap: ["10010"] },
    { nome: "Carema", sigla: "TO", cap: ["10010"] },
    { nome: "Samone", sigla: "TO", cap: ["10010"] },
    { nome: "Sant'Angelo Lodigiano", sigla: "LO", cap: ["26866"] },
  ];
  const ind = (s: string, c = COMUNI) => indirizzoStrutturato(s, c);
  const r9 = ind("Via Roma 1 Cologno Monzese 20093");
  caso(
    "forma storica «Via Roma 1 Cologno Monzese 20093»",
    r9.ok && r9.address.streetAddress === "Via Roma 1" && r9.address.addressLocality === "Cologno Monzese" && r9.address.postalCode === "20093" && r9.address.addressRegion === "MI" && r9.address.addressCountry === "IT",
    r9,
  );
  const r10 = ind("Via Roma 1, 36100 Vicenza (VI)");
  caso("forma del form «Via Roma 1, 36100 Vicenza (VI)»", r10.ok && r10.address.streetAddress === "Via Roma 1" && r10.address.addressLocality === "Vicenza", r10);
  const rVia = ind("viale Sandrigo 24, 36066 Sandrigo (VI)");
  caso("via con il nome del comune → via intera", rVia.ok && rVia.address.streetAddress === "viale Sandrigo 24", rVia);
  const r11 = ind("Via Po 3, 10010 San Martino Canavese (TO)");
  caso("CAP condiviso: vince il comune nominato (nome più lungo)", r11.ok && r11.address.addressLocality === "San Martino Canavese", r11);
  const r11b = ind("Via Po 3, 10010 Carema Samone (TO)");
  caso("CAP condiviso con due comuni di pari lunghezza nominati → null", !r11b.ok && r11b.motivo.includes("ambiguo"), r11b);
  const r12 = ind("Via Roma 1, 36100 Vicenza (MI)");
  caso("sigla tra parentesi diversa → null con motivo", !r12.ok && r12.motivo.includes("(MI)") && r12.motivo.includes("VI"), r12);
  const r13 = [ind("Via Roma 1, Vicenza"), ind("Via Roma 1, 36100 20121 Vicenza"), ind("Via Roma 1, 36100 Padova"), ind("36100 Vicenza (VI)"), ind("  ")];
  const motivi = r13.map((r) => (r.ok ? "OK?" : r.motivo));
  caso(
    "nessun CAP, due CAP, comune non trovato, via vuota, vuoto → null con il proprio motivo",
    r13.every((r) => !r.ok) && motivi[0].includes("CAP assente") && motivi[1].includes("più di un CAP") && motivi[2].includes("nessun comune") && motivi[3].includes("via assente") && motivi[4].includes("vuoto"),
    motivi,
  );
  const r14 = ind("Via Garibaldi 7, 26866 Sant’Angelo Lodigiano (LO)");
  const r14b = ind("Via Garibaldi 7, 26866 SANT'ANGELO LODIGIANO (lo)");
  caso("apostrofo tipografico, maiuscole e sigla minuscola", r14.ok && r14.address.addressLocality === "Sant'Angelo Lodigiano" && r14b.ok, [r14, r14b]);
  let comuniReali: Comune[] | null = null;
  try {
    comuniReali = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../../site-intake/data-src/comuni.json"), "utf8"));
  } catch {
    comuniReali = null;
  }
  if (comuniReali) {
    const r15 = ind("Corso Buenos Aires 1, 20121 Milano (MI)", comuniReali);
    const r15b = ind("Corso Buenos Aires 1, 36100 Milano (MI)", comuniReali);
    const r15c = ind("Via Milano 89 Cologno Monzese 20093", comuniReali);
    const r15d = ind("Via Po 3, 11020 Antey-Saint-André (AO)", comuniReali);
    caso("comuni.json reale: Milano 20121 ok, Milano col CAP di Vicenza null", r15.ok && r15.address.addressRegion === "MI" && !r15b.ok, [r15, r15b]);
    caso("comuni.json reale: via che si chiama come un altro comune", r15c.ok && r15c.address.streetAddress === "Via Milano 89" && r15c.address.addressLocality === "Cologno Monzese", r15c);
    caso("comuni.json reale: trattini e accenti («Antey-Saint-André»)", r15d.ok && r15d.address.addressLocality === "Antey-Saint-André", r15d);
  } else {
    caso("site-intake/data-src/comuni.json leggibile", false, "file assente o illeggibile");
  }

  /* ---------------------------------------------------------------- */
  console.log("\ndatiStrutturati:");
  const sito = (over: { contact?: Record<string, unknown>; brand?: Record<string, unknown>; sections?: unknown[] } = {}) => ({
    meta: { businessName: "Edil Prova Srl" },
    contact: { phone: "+39 0444 123456", email: "info@edilprova.it", address: "Via Roma 1, 36100 Vicenza (VI)", social: { instagram: "https://www.instagram.com/edilprova", facebook: "https://facebook.com/edilprova" }, ...over.contact },
    brand: { logo: null, mark: { src: "/media/edil-prova/mark.png", alt: "x" }, ...over.brand },
    sections: over.sections ?? [
      { type: "Hero", props: { image: { src: "/media/edil-prova/hero.jpg", alt: "x" } } },
      { type: "Services", props: { items: [{ title: "Bagni" }, { title: "Facciate & cappotti" }] } },
    ],
  });
  const input = (over: Partial<InputDatiStrutturati> = {}): InputDatiStrutturati => ({
    site: sito(),
    brief: { partita_iva: "01234567897" },
    rawSubmission: { risposte: { mestiere: { id: "impresa-edile" } } },
    contesto: { settore_normalizzato: "Edilizia" },
    lavori: [{ file: "lavoro-1.jpg", alt: "a" }, { file: "lavoro-2.jpg", alt: "b" }],
    slug: "edil-prova",
    dominio: "edilprova.it",
    comuni: COMUNI,
    ...over,
  });
  const d16 = datiStrutturati(input());
  const j = d16.jsonld as Record<string, any>;
  caso(
    "input completo (form nuovo): campi reali e URL assoluti",
    j["@context"] === "https://schema.org" &&
      j["@type"] === "GeneralContractor" &&
      j["@id"] === "https://edilprova.it/#azienda" &&
      j.name === "Edil Prova Srl" &&
      j.url === "https://edilprova.it/" &&
      j.telephone === "+390444123456" &&
      j.email === "info@edilprova.it" &&
      j.address?.postalCode === "36100" &&
      j.vatID === "IT01234567897" &&
      j.logo === "https://edilprova.it/media/edil-prova/mark.png" &&
      j.image === "https://edilprova.it/media/edil-prova/lavoro-1.jpg" &&
      j.sameAs?.length === 2 &&
      j.makesOffer?.length === 2 &&
      j.makesOffer[1].itemOffered.name === "Facciate & cappotti" &&
      d16.avvisi.length === 0,
    d16,
  );
  caso("image: foto reale dei lavori, mai la hero", !JSON.stringify(j).includes("hero.jpg"));
  caso("riepilogo: tipo, fonte, indirizzo, P.IVA, servizi", d16.riepilogo.includes("GeneralContractor") && d16.riepilogo.includes("indirizzo ok") && d16.riepilogo.includes("P.IVA ok") && d16.riepilogo.includes("2 servizi"), d16.riepilogo);
  const vietate = chiaviVietate({ a: [{ b: { aggregateRating: 1 } }], "@type": ["LocalBusiness", "FAQPage"], geo: {} });
  caso("scansione ricorsiva: trova aggregateRating annidato, geo e FAQPage", ["aggregateRating", "geo", "FAQPage"].every((k) => vietate.includes(k)), vietate);
  caso("il JSON-LD generato non ha chiavi vietate", chiaviVietate(d16.jsonld).length === 0);
  const avv = (over: Partial<InputDatiStrutturati>, campo: string, frammento: string) => {
    const r = datiStrutturati(input(over));
    return !(campo in r.jsonld) && r.avvisi.some((a) => a.includes(frammento));
  };
  caso("telefono vuoto → omesso con avviso", avv({ site: sito({ contact: { phone: "" } }) }, "telephone", "telefono"));
  caso("telefono non riconoscibile → omesso con avviso", avv({ site: sito({ contact: { phone: "chiamaci" } }) }, "telephone", "chiamaci"));
  caso("email non valida → omessa con avviso", avv({ site: sito({ contact: { email: "info@" } }) }, "email", "email"));
  caso("P.IVA con checksum errato → omessa con avviso", avv({ brief: { partita_iva: "01234567890" } }, "vatID", "P.IVA"));
  caso("P.IVA assente → omessa con avviso", avv({ brief: {} }, "vatID", "P.IVA"));
  const dSocial = datiStrutturati(input({ site: sito({ contact: { social: { instagram: "@edilprova", facebook: "https://instagram.com/edilprova", tiktok: "http://tiktok.com/@x" } } }) }));
  caso("social non URL, su altro host o http → fuori da sameAs con avviso", !("sameAs" in dSocial.jsonld) && dSocial.avvisi.filter((a) => a.includes("sameAs")).length === 3, dSocial.avvisi);
  caso("indirizzo non riconosciuto → omesso con avviso e motivo", avv({ site: sito({ contact: { address: "Via Roma 1, Vicenza" } }) }, "address", "CAP assente"));
  caso("comuni non leggibili → indirizzo omesso con avviso", avv({ comuni: null }, "address", "comuni"));
  caso("niente Services → makesOffer omesso con avviso", avv({ site: sito({ sections: [{ type: "Hero", props: {} }] }) }, "makesOffer", "Servizi"));
  const dNiente = datiStrutturati(input({ site: sito({ brand: { logo: null, mark: null }, contact: { social: {} } }), lavori: [] }));
  caso(
    "niente logo né simbolo, niente foto reali, niente social → omessi SENZA avviso, detti nel riepilogo",
    !("logo" in dNiente.jsonld) && !("image" in dNiente.jsonld) && !("sameAs" in dNiente.jsonld) && dNiente.avvisi.length === 0 && /logo.*image.*sameAs/.test(dNiente.riepilogo),
    dNiente,
  );
  const dLogo = datiStrutturati(input({ site: sito({ brand: { logo: { src: "/media/edil-prova/logo.svg", alt: "x" } } }) }));
  caso("brand.logo vince sul simbolo", dLogo.jsonld.logo === "https://edilprova.it/media/edil-prova/logo.svg", dLogo.jsonld.logo);
  const dTel = datiStrutturati(input({ site: sito({ contact: { phone: "333 123 4567" } }) }));
  caso("numero nazionale 333… → +39333…", dTel.jsonld.telephone === "+393331234567", dTel.jsonld.telephone);
  const dStorico = datiStrutturati(input({ rawSubmission: {}, contesto: { settore_normalizzato: "Edilizia" } }));
  caso("cliente storico senza id: tipo dal settore", dStorico.jsonld["@type"] === "GeneralContractor" && dStorico.riepilogo.includes("settore"), dStorico.riepilogo);
  caso("deterministico: due chiamate → stesso JSON", JSON.stringify(datiStrutturati(input()).jsonld) === JSON.stringify(datiStrutturati(input()).jsonld));

  /* ---------------------------------------------------------------- */
  console.log("\ntestoIndicizzabile / hashPagina:");
  const pagina = (o: { title?: string; desc?: string | null; ld?: string | null; body?: string; canonical?: string | null; head?: string; robots?: string } = {}) =>
    `<!DOCTYPE html><html lang="it" data-preset="meridian" style="--brand-primary:#111"> <head><meta charset="utf-8"><title>${o.title ?? "Impresa edile a Vicenza · Edil Prova"}</title>` +
    `${o.robots ? `<meta name="robots" content="${o.robots}">` : ""}` +
    `${o.desc === null ? "" : `<meta name="description" content="${o.desc ?? "Ristrutturazioni a Vicenza &amp; provincia."}">`}` +
    `${o.canonical === null ? "" : `<link rel="canonical" href="${o.canonical ?? "https://edilprova.it/"}">`}` +
    `${o.ld === null ? "" : `<script type="application/ld+json">${o.ld ?? '{"@context":"https://schema.org","@type":"GeneralContractor","@id":"https://edilprova.it/#azienda","name":"Edil Prova","url":"https://edilprova.it/"}'}</script>`}` +
    `${o.head ?? '<link rel="stylesheet" href="/_astro/index.AAAA.css">'}</head> <body> ${o.body ?? '<header class="a"><h1 class="t-h1">Ristrutturazioni <span class="accent-word">a Vicenza</span></h1></header><img src="/media/x/hero.jpg" alt="Cantiere"><a href="/privacy/" class="btn">Privacy</a><form action="https://n8n.x/webhook?slug=a"><button>Invia</button></form>'} </body></html>`;
  const base = pagina();
  const rumore = pagina({
    head: '<link rel="stylesheet" href="/_astro/index.BBBB.css"><script defer src="https://stats.consulbuild.com/script.js" data-website-id="zzz"></script>',
    body: '<header class="b"  data-x="1"><h1 class="t-display" style="color:red">Ristrutturazioni   <span class="accent-word x">a Vicenza</span></h1></header>\n<img src="/media/y/hero.jpg" alt="Cantiere" loading="lazy"><a class="btn btn-primary" href="/privacy/">Privacy</a><form action="https://altro.x/"><button type="submit">Invia</button></form><!-- nota --><svg><path d="M0"/></svg><script>var a=1</script>',
  });
  caso("class, hash _astro, style, script Umami, action, commenti, svg e spazi diversi → stesso hash", hashPagina(base) === hashPagina(rumore), [testoIndicizzabile(base), testoIndicizzabile(rumore)]);
  const diversi = {
    testo: pagina({ body: '<header class="a"><h1 class="t-h1">Ristrutturazioni <span class="accent-word">a Padova</span></h1></header><img src="/media/x/hero.jpg" alt="Cantiere"><a href="/privacy/" class="btn">Privacy</a>' }),
    alt: pagina({ body: '<header class="a"><h1 class="t-h1">Ristrutturazioni <span class="accent-word">a Vicenza</span></h1></header><img src="/media/x/hero.jpg" alt="Facciata"><a href="/privacy/" class="btn">Privacy</a><form action="https://n8n.x/webhook?slug=a"><button>Invia</button></form>' }),
    href: pagina({ body: '<header class="a"><h1 class="t-h1">Ristrutturazioni <span class="accent-word">a Vicenza</span></h1></header><img src="/media/x/hero.jpg" alt="Cantiere"><a href="/termini/" class="btn">Privacy</a><form action="https://n8n.x/webhook?slug=a"><button>Invia</button></form>' }),
    title: pagina({ title: "Impresa edile a Padova · Edil Prova" }),
    description: pagina({ desc: "Ristrutturazioni a Padova." }),
    jsonld: pagina({ ld: '{"@context":"https://schema.org","@type":"Plumber","name":"Edil Prova"}' }),
  };
  for (const [k, html] of Object.entries(diversi)) caso(`${k} diverso → hash diverso`, hashPagina(html) !== hashPagina(base));
  caso("JSON-LD con spazi diversi → stesso hash", hashPagina(pagina({ ld: '{ "@context": "https://schema.org",  "@type":"GeneralContractor","@id":"https://edilprova.it/#azienda","name":"Edil Prova","url":"https://edilprova.it/" }' })) === hashPagina(base));
  caso("JSON-LD con escape \\u0026 del renderer e con & → stesso hash", hashPagina(pagina({ ld: '{"name":"A\\u0026B"}' })) === hashPagina(pagina({ ld: '{"name":"A&B"}' })));
  caso("&amp; e & → stesso testo", testoIndicizzabile(pagina({ desc: "A &amp; B" })) === testoIndicizzabile(pagina({ desc: "A &#38; B" })));

  /* ---------------------------------------------------------------- */
  console.log("\naggiornaLastmod:");
  const T1 = new Date("2026-09-14T09:12:31.456Z");
  const T2 = new Date("2026-09-20T10:00:00.000Z");
  const a24 = aggiornaLastmod(null, [{ path: "/", hash: "h1" }, { path: "/bagni/", hash: "h2" }], T1);
  caso("registro assente → tutte con adesso, W3C senza millisecondi", a24.registro.pagine["/"].lastmod === "2026-09-14T09:12:31Z" && a24.cambiate.length === 2, a24);
  const a25 = aggiornaLastmod(a24.registro, [{ path: "/", hash: "h1" }, { path: "/bagni/", hash: "h2b" }, { path: "/zone/", hash: "h3" }], T2);
  caso(
    "invariata conserva, cambiata e nuova → adesso",
    a25.registro.pagine["/"].lastmod === "2026-09-14T09:12:31Z" && a25.registro.pagine["/bagni/"].lastmod === "2026-09-20T10:00:00Z" && a25.registro.pagine["/zone/"].lastmod === "2026-09-20T10:00:00Z" && a25.cambiate.join() === "/bagni/,/zone/",
    a25,
  );
  const a25b = aggiornaLastmod(a25.registro, [{ path: "/", hash: "h1" }], T2);
  caso("pagina sparita → tolta dal registro", Object.keys(a25b.registro.pagine).join() === "/", a25b);

  console.log("\nsitemapXml / robotsTxt / _headers:");
  const sm = sitemapXml([{ loc: "https://a.it/z/?a=1&b=2", lastmod: "2026-09-14T09:12:31Z" }, { loc: "https://a.it/", lastmod: "2026-09-14T09:12:31Z" }]);
  caso(
    "sitemap: dichiarazione, namespace, loc ordinati, & → &amp;, niente priority/changefreq",
    sm.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') &&
      sm.indexOf("<loc>https://a.it/</loc>") < sm.indexOf("<loc>https://a.it/z/") &&
      sm.includes("?a=1&amp;b=2") &&
      !/priority|changefreq/.test(sm) &&
      sm.endsWith("</urlset>\n"),
    sm,
  );
  caso("robots.txt carattere per carattere", robotsTxt("a.it") === "User-agent: *\nAllow: /\n\nSitemap: https://a.it/sitemap.xml\n");
  caso("_headers carattere per carattere", HEADERS_WORKERS_DEV === "https://:version.:subdomain.workers.dev/*\n  X-Robots-Tag: noindex\n");

  /* ---------------------------------------------------------------- */
  console.log("\ncontrollaPagina (errori tecnici bloccanti, avvisi di copy mai):");
  const ok = controllaPagina(base, "https://edilprova.it/");
  caso("pagina corretta → nessun errore né avviso", ok.errori.length === 0 && ok.avvisi.length === 0, ok);
  const c1 = controllaPagina(pagina({ canonical: null }), "https://edilprova.it/");
  const c2 = controllaPagina(pagina({ canonical: "https://edilprova.it/privacy" }), "https://edilprova.it/privacy/");
  const c3 = controllaPagina(pagina({ canonical: "https://altro.it/" }), "https://edilprova.it/");
  caso("canonical assente, senza barra finale, su altro host → errore", c1.errori.length === 1 && c2.errori.length === 1 && c3.errori.length === 1, [c1, c2, c3]);
  const c4 = controllaPagina(pagina({ ld: '{"@context":"https://schema.org",' }), "https://edilprova.it/");
  const c4b = controllaPagina(pagina({ ld: '{"@type":"LocalBusiness","aggregateRating":{"ratingValue":5}}' }), "https://edilprova.it/");
  caso("JSON-LD non valido o con campi vietati → errore", c4.errori.some((e) => e.includes("non valido")) && c4b.errori.some((e) => e.includes("aggregateRating")), [c4, c4b]);
  const c5 = controllaPagina(pagina({ title: "x".repeat(61) }), "https://edilprova.it/");
  const c6 = controllaPagina(pagina({ body: "<p>niente titolo</p>" }), "https://edilprova.it/");
  const c7 = controllaPagina(pagina({ body: "<h1>a</h1><h1>b</h1>" }), "https://edilprova.it/");
  const c8 = controllaPagina(pagina({ desc: null }), "https://edilprova.it/");
  caso(
    "title di 61, 0 o 2 H1, description assente → SOLO avvisi, nessun errore",
    [c5, c6, c7, c8].every((c) => c.errori.length === 0 && c.avvisi.length === 1) && c5.avvisi[0].includes("61") && c7.avvisi[0].includes("2 titoli H1") && c8.avvisi[0].includes("description"),
    [c5, c6, c7, c8],
  );
  caso("title di 60 caratteri → nessun avviso", controllaPagina(pagina({ title: "x".repeat(60) }), "https://edilprova.it/").avvisi.length === 0);

  console.log("\nelencoPagine (dist sintetica):");
  const dist = path.join(tmp, "dist");
  const scrivi = (rel: string, contenuto: string) => {
    fs.mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true });
    fs.writeFileSync(path.join(dist, rel), contenuto);
  };
  scrivi("index.html", base);
  scrivi("privacy/index.html", pagina({ robots: "noindex", canonical: "https://edilprova.it/privacy/", ld: null }));
  scrivi("grazie/index.html", pagina({ robots: "noindex", canonical: "https://edilprova.it/grazie/", ld: null }));
  scrivi("404.html", pagina({ canonical: null, ld: null }));
  scrivi("_astro/index.AAAA.css", "body{}");
  scrivi("media/edil-prova/pagina.html", "<html></html>");
  scrivi("robots.txt", "User-agent: *\nAllow: /\n");
  const e28 = elencoPagine(dist, "edilprova.it");
  caso("noindex, 404.html e cartelle asset escluse; home con URL canonico", e28.errori.length === 0 && e28.pagine.length === 1 && e28.pagine[0].path === "/" && e28.pagine[0].url === "https://edilprova.it/", e28.pagine.map((p) => p.path));
  scrivi("bagni.html", pagina({ canonical: "https://edilprova.it/bagni", ld: null }));
  const e28b = elencoPagine(dist, "edilprova.it");
  caso("x.html fuori forma cartella/index.html → errore", e28b.errori.length === 1 && e28b.errori[0].includes("bagni.html"), e28b.errori);
  fs.rmSync(path.join(dist, "bagni.html"));
  scrivi("bagni/index.html", pagina({ canonical: "https://edilprova.it/bagni/", ld: null }));
  const e28c = elencoPagine(dist, "edilprova.it");
  caso("sottopagina indicizzabile → /bagni/ con barra finale", e28c.pagine.map((p) => p.url).join() === "https://edilprova.it/,https://edilprova.it/bagni/", e28c.pagine.map((p) => p.url));
  fs.rmSync(path.join(dist, "bagni"), { recursive: true });

  /* ---------------------------------------------------------------- */
  console.log("\nchiaveIndexNow / cuociFondamenta:");
  const cliente = path.join(tmp, "edil-prova");
  fs.mkdirSync(cliente);
  const k1 = chiaveIndexNow(cliente, T1);
  const k2 = chiaveIndexNow(cliente, T2);
  const kFile = JSON.parse(fs.readFileSync(path.join(cliente, "traffico", "indexnow.json"), "utf8"));
  caso("prima chiamata crea la chiave (32 esadecimali), la seconda la riusa", /^[0-9a-f]{32}$/.test(k1) && k1 === k2 && kFile.chiave === k1 && kFile.creataAt === "2026-09-14T09:12:31Z", kFile);
  const rotto = path.join(tmp, "rotto");
  fs.mkdirSync(path.join(rotto, "traffico"), { recursive: true });
  fs.writeFileSync(path.join(rotto, "traffico", "indexnow.json"), "{ non json");
  let msgRotto = "";
  try {
    chiaveIndexNow(rotto, T1);
  } catch (e) {
    msgRotto = e instanceof Error ? e.message : String(e);
  }
  fs.writeFileSync(path.join(rotto, "traffico", "indexnow.json"), JSON.stringify({ chiave: "corta" }));
  let msgCorta = "";
  try {
    chiaveIndexNow(rotto, T1);
  } catch (e) {
    msgCorta = e instanceof Error ? e.message : String(e);
  }
  caso("file corrotto o chiave fuori formato → eccezione leggibile, nessuna rigenerazione", msgRotto.includes("illeggibile") && msgCorta.includes("chiave valida"), [msgRotto, msgCorta]);

  const leggi = (rel: string) => fs.readFileSync(path.join(dist, rel), "utf8");
  const c31 = cuociFondamenta(dist, cliente, "edilprova.it", T1);
  const sitemap1 = c31.ok ? leggi("sitemap.xml") : "";
  caso(
    "cottura: robots, sitemap con 1 URL, <chiave>.txt senza newline, _headers, registro",
    c31.ok &&
      c31.urls === 1 &&
      leggi("robots.txt") === robotsTxt("edilprova.it") &&
      (sitemap1.match(/<url>/g) ?? []).length === 1 &&
      sitemap1.includes("<lastmod>2026-09-14T09:12:31Z</lastmod>") &&
      leggi(`${k1}.txt`) === k1 &&
      leggi("_headers") === HEADERS_WORKERS_DEV &&
      JSON.parse(fs.readFileSync(path.join(cliente, "traffico", "lastmod.json"), "utf8")).pagine["/"].lastmod === "2026-09-14T09:12:31Z",
    c31,
  );
  const registro1 = fs.readFileSync(path.join(cliente, "traffico", "lastmod.json"), "utf8");
  const c31b = cuociFondamenta(dist, cliente, "edilprova.it", T2);
  caso("seconda cottura sulla stessa dist → file byte-identici", c31b.ok && c31b.cambiate.length === 0 && leggi("sitemap.xml") === sitemap1 && fs.readFileSync(path.join(cliente, "traffico", "lastmod.json"), "utf8") === registro1, c31b);
  scrivi("index.html", diversi.title);
  const c31c = cuociFondamenta(dist, cliente, "edilprova.it", T2);
  caso("testo della home cambiato → lastmod = nuovo adesso", c31c.ok && c31c.cambiate.join() === "/" && leggi("sitemap.xml").includes("<lastmod>2026-09-20T10:00:00Z</lastmod>"), c31c);

  const prima = { sitemap: leggi("sitemap.xml"), registro: fs.readFileSync(path.join(cliente, "traffico", "lastmod.json"), "utf8") };
  scrivi("index.html", pagina({ title: "x".repeat(70) }));
  const cAvviso = cuociFondamenta(dist, cliente, "edilprova.it", T2);
  caso("title troppo lungo → cotte comunque, avviso con il path", cAvviso.ok && cAvviso.avvisi.length === 1 && cAvviso.avvisi[0].startsWith("/: title di 70"), cAvviso);
  scrivi("index.html", base);
  fs.writeFileSync(path.join(dist, "sitemap.xml"), prima.sitemap);
  fs.writeFileSync(path.join(cliente, "traffico", "lastmod.json"), prima.registro);

  const stato = () => ({ sitemap: leggi("sitemap.xml"), robots: leggi("robots.txt"), registro: fs.readFileSync(path.join(cliente, "traffico", "lastmod.json"), "utf8") });
  const s0 = stato();
  const bloccanti = {
    "canonical su altro dominio": pagina({ canonical: "https://altro.it/" }),
    "JSON-LD assente in home": pagina({ ld: null, body: "<h1>Nuovo testo</h1>" }),
    "JSON-LD di un altro dominio": pagina({ ld: '{"@context":"https://schema.org","@type":"GeneralContractor","@id":"https://altro.it/#azienda","name":"X","url":"https://altro.it/"}' }),
    "JSON-LD non valido": pagina({ ld: "{ rotto" }),
  };
  for (const [nome, html] of Object.entries(bloccanti)) {
    scrivi("index.html", html);
    const r = cuociFondamenta(dist, cliente, "edilprova.it", T2);
    caso(`${nome} → { ok: false }, nessun file scritto (né dist né registro)`, !r.ok && JSON.stringify(stato()) === JSON.stringify(s0), r);
  }
  scrivi("index.html", base);
  fs.writeFileSync(path.join(cliente, "traffico", "lastmod.json"), "{ rotto");
  const rReg = cuociFondamenta(dist, cliente, "edilprova.it", T2);
  caso("registro lastmod illeggibile → errore leggibile, dist non toccata", !rReg.ok && rReg.errore.includes("lastmod.json") && leggi("sitemap.xml") === s0.sitemap, rReg);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${passati} passati, ${falliti} falliti`);
process.exit(falliti ? 1 : 0);
