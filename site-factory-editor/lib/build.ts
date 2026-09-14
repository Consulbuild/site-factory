import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, SITE_RENDERER, NODE_BIN, clientDir } from "./paths";
import { readClientState, patchClientState, readCopy, readLavori } from "./clients";
import { validateCopyArtifact } from "./slots";
import { UMAMI_HOST, ensureUmamiWebsite, formAction } from "./integrazioni";
import { fondamentaAttese, scriviDatiStrutturati, cuociFondamenta } from "./fondamenta";
import type { RunEvent, PhaseResult, StepIO } from "./run-step";
import type { RunCtx } from "./steps";

// Build deterministica del sito (mai claude): media → assemble → patch logo →
// validate → astro build → pulizia. Vive qui e non in steps.ts perché è fs +
// io.script, un dominio diverso dall'orchestrazione `claude -p` del registry.

const PUBLIC_MEDIA = path.join(SITE_RENDERER, "public", "media");
const ASTRO_BIN = path.join(SITE_RENDERER, "node_modules", ".bin", "astro");
const BLUEPRINT = "blueprints/conversione-locale-v1";
// Elenco ISTAT dei comuni (nome, sigla, CAP) per l'indirizzo strutturato del JSON-LD.
const COMUNI_JSON = path.join(REPO_ROOT, "site-intake", "data-src", "comuni.json");

const distDirOf = (slug: string) => path.join(clientDir(slug), "dist");

/** Conta i file *.html in dist (ricorsivo) e la dimensione totale in KB. */
function distStats(dist: string): { pages: number; sizeKb: number } {
  let pages = 0;
  let bytes = 0;
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else {
        bytes += fs.statSync(p).size;
        if (e.name.endsWith(".html")) pages++;
      }
    }
  };
  walk(dist);
  return { pages, sizeKb: Math.round(bytes / 1024) };
}

// La build usa risorse condivise TRA clienti (public/media viene svuotata e
// ricopiata, astro builda nella stessa cwd): due build simultanee mescolerebbero
// i media di un cliente nel sito dell'altro. Catena di promise = mutex globale.
let buildLock: Promise<void> = Promise.resolve();

export async function* buildRun(slug: string, ctx: RunCtx, io: StepIO): AsyncGenerator<RunEvent, PhaseResult> {
  const prev = buildLock;
  let release!: () => void;
  buildLock = new Promise((r) => (release = r));
  await prev;
  try {
    return yield* buildRunSerial(slug, ctx, io);
  } finally {
    release();
  }
}

async function* buildRunSerial(slug: string, ctx: RunCtx, io: StepIO): AsyncGenerator<RunEvent, PhaseResult> {
  const partial = ctx.mode === "partial";
  const dir = clientDir(slug);
  const siteJson = path.join(dir, "site.json");
  const dist = distDirOf(slug);

  // Il gate (intake verificato; immagini verificate per la build completa) è
  // STEPS.build.gate: lo applicano route, catena e hub prima di arrivare qui.

  // Difesa in profondità: lo stato «verificato» è una promessa, il file è la
  // verità — un copy.json fuori contratto (visto in produzione: drift tra stato
  // e disco) farebbe fallire l'assembler con un muro di log. Qui l'errore è
  // puntuale e dice dove correggere.
  if (!partial) {
    const errs = validateCopyArtifact(readCopy(slug) ?? {});
    if (errs.length) {
      return { ok: false, error: `copy.json non rispetta più il contratto — riapri la scheda Copy e correggi:\n${errs.slice(0, 5).join("\n")}` };
    }
    // La Gallery compare solo con ≥4 foto reali; se ci sono, ogni foto DEVE avere
    // l'alt (accessibilità + vincolo Zod del renderer). Sotto le 4 la sezione non
    // esce, quindi gli alt mancanti non bloccano.
    const lavori = readLavori(slug);
    if (lavori.length >= 4) {
      const senzaAlt = lavori.filter((l) => !l.alt.trim()).length;
      if (senzaAlt) {
        return { ok: false, error: `${senzaAlt} foto lavori senza alt — riapri la scheda Immagini → «I nostri lavori» e completa gli alt (o usa «Genera testi con l'AI»).` };
      }
    }
  }

  // FASE media (deterministica): astro copia TUTTA public/ in dist — si pulisce
  // e si copia SOLO il cliente corrente, o i media degli altri finiscono nel sito.
  yield { type: "phase", label: "media" };
  fs.rmSync(PUBLIC_MEDIA, { recursive: true, force: true });
  const imgDir = path.join(dir, "img");
  if (fs.existsSync(imgDir)) {
    fs.cpSync(imgDir, path.join(PUBLIC_MEDIA, slug), { recursive: true });
    yield { type: "text", text: `copiati ${fs.readdirSync(imgDir).length} file in public/media/${slug}/` };
  } else {
    yield { type: "text", text: partial ? "nessuna immagine generata (build parziale)" : "img/ assente" };
  }

  // FASE assemble (script della pipeline, unica fonte del merge blueprint+artifact).
  const a = yield* io.script({
    phase: partial ? "assemble (parziale)" : "assemble",
    bin: NODE_BIN,
    args: [
      "--experimental-strip-types",
      "scripts/assemble-site.ts",
      BLUEPRINT,
      `out/${slug}`,
      "-o",
      `out/${slug}/site.json`,
      // Le foto reali del cliente popolano la Gallery via lavori.json (sotto 4 →
      // sezione droppata). Senza il file: --foto-reali 0 (nessuna gallery).
      ...(fs.existsSync(path.join(dir, "lavori.json"))
        ? ["--lavori", `out/${slug}/lavori.json`]
        : ["--foto-reali", "0"]),
      // Documenti legali reali (Fase 3): se il workspace ha legale.json le
      // pagine /privacy e /termini rendono il documento vero senza banner.
      ...(fs.existsSync(path.join(dir, "legale.json")) ? ["--legale", `out/${slug}/legale.json`] : []),
      ...(partial ? ["--partial"] : []),
    ],
    cwd: SITE_RENDERER,
    timeoutMs: 60_000,
  });
  if (!a.ok) return a;

  // FASE logo (patch deterministica): gli artifact possono referenziare "./file"
  // relativo al workspace (logo del cliente, kit mark/favicon del logo-designer)
  // — sul sito deve diventare /media/<slug>/file.
  const site = JSON.parse(fs.readFileSync(siteJson, "utf8"));
  let sitePatched = false;
  const patchMedia = (src: string): string | null => {
    const file = path.basename(src);
    const abs = path.join(dir, file);
    if (!fs.existsSync(abs)) return null;
    fs.mkdirSync(path.join(PUBLIC_MEDIA, slug), { recursive: true });
    fs.copyFileSync(abs, path.join(PUBLIC_MEDIA, slug, file));
    sitePatched = true;
    return `/media/${slug}/${file}`;
  };
  for (const key of ["logo", "mark"] as const) {
    const src: string | undefined = site?.brand?.[key]?.src;
    if (src?.startsWith("./")) {
      const patched = patchMedia(src);
      if (!patched) return { ok: false, error: `il brand.${key} punta a ${src} ma il file non esiste nel workspace` };
      site.brand[key].src = patched;
      yield { type: "text", text: `${key}: ${path.basename(src)} → ${patched}` };
    }
  }
  if (typeof site?.brand?.favicon === "string" && site.brand.favicon.startsWith("./")) {
    const patched = patchMedia(site.brand.favicon);
    if (!patched) return { ok: false, error: `il brand.favicon punta a ${site.brand.favicon} ma il file non esiste nel workspace` };
    site.brand.favicon = patched;
    yield { type: "text", text: `favicon → ${patched}` };
  }
  if (sitePatched) fs.writeFileSync(siteJson, JSON.stringify(site, null, 2) + "\n");

  // FASE validate (gate Zod del renderer, stesso script del CLI).
  const v = yield* io.script({
    phase: "validate",
    bin: NODE_BIN,
    args: ["--experimental-strip-types", "scripts/validate-site.ts", `out/${slug}/site.json`],
    cwd: SITE_RENDERER,
    timeoutMs: 30_000,
  });
  if (!v.ok) return v;

  // FASE integrazioni (Umami, modulo): SOLO per la build completa con dominio.
  // Il sito pubblicato riceve statistiche senza cookie e modulo reale come env
  // di build (stesso meccanismo di SITE_URL): infrastruttura dell'agenzia, mai
  // site.json. Senza dominio (demo, anteprime) il sito resta demo.
  const statoCliente = readClientState(slug);
  const dominio = statoCliente.steps.build.dominio;
  // Percorso demo: meta robots noindex su tutte le pagine (Base.astro legge
  // NOINDEX); la build resta pubblicabile SOLO come demo (deploy.ts).
  const noindex = statoCliente.percorso === "demo";
  let integrazioni: { umamiWebsiteId: string; formAction: string } | null = null;
  if (dominio && !partial) {
    yield { type: "phase", label: "integrazioni (Umami, modulo)" };
    try {
      const websiteId = await ensureUmamiWebsite(
        dominio,
        String(site?.meta?.businessName ?? slug),
        readClientState(slug).steps.build.umamiWebsiteId,
      );
      patchClientState(slug, (s) => {
        s.steps.build.umamiWebsiteId = websiteId;
      });
      integrazioni = { umamiWebsiteId: websiteId, formAction: formAction(slug) };
      yield { type: "text", text: `Umami: sito ${websiteId} · modulo → ${integrazioni.formAction}` };
    } catch (e) {
      return {
        ok: false,
        error: `integrazioni non attivabili (${e instanceof Error ? e.message : String(e)}): il VPS o la chiave non rispondono — riprova, oppure rimuovi il dominio per una build senza integrazioni.`,
      };
    }
  }

  // FASE fondamenta SEO (dati strutturati): servizio Traffico «Sito» attivo o sospeso,
  // dominio, percorso completo, build completa — stessa regola dell'interlock del deploy.
  // Il JSON-LD arriva al renderer come file (DATI_STRUTTURATI_JSON), mai in site.json.
  // A servizio spento questa fase e la cottura post-build non girano: dist di sempre.
  const fondamenta = partial ? null : fondamentaAttese(statoCliente, dominio);
  let datiStrutturati: { file: string; avvisi: string[] } | null = null;
  if (fondamenta) {
    yield { type: "phase", label: "fondamenta SEO (dati strutturati)" };
    const ds = scriviDatiStrutturati(dir, site, fondamenta, COMUNI_JSON);
    yield { type: "text", text: ds.riepilogo };
    for (const a of ds.avvisi) yield { type: "text", text: `avviso: ${a}` };
    datiStrutturati = ds;
  }

  // FASE pagine leggere (varianti immagini, docs/traffico/piano-T1b.md): stessa regola delle
  // fondamenta. Le varianti vanno in public/media/<slug>/v/ (le copia astro, le ripulisce la
  // fase media della build successiva), il manifest arriva al renderer come file
  // (MEDIA_VARIANTI_JSON). A servizio spento non gira: HTML e media di sempre.
  let mediaVarianti: string | null = null;
  if (fondamenta) {
    fs.mkdirSync(path.join(PUBLIC_MEDIA, slug), { recursive: true });
    const mv = yield* io.script({
      phase: "pagine leggere (varianti immagini)",
      bin: NODE_BIN,
      args: [
        "--experimental-strip-types",
        "scripts/media-varianti.ts",
        `out/${slug}/site.json`,
        "--media",
        `public/media/${slug}`,
        "-o",
        `out/${slug}/traffico/media-varianti.json`,
      ],
      cwd: SITE_RENDERER,
      // a freddo ~30 s per le 18 foto di Cavaliere; a caldo tutto dalla cache
      timeoutMs: 300_000,
    });
    if (!mv.ok) return mv;
    mediaVarianti = path.join(dir, "traffico", "media-varianti.json");
  }

  // FASE astro build → out/<slug>/dist (path assoluti: fuori dal renderer).
  // Col dominio pubblicato la build riceve SITE_URL: attiva canonical e og:*
  // assoluti in Base.astro (consolidamento SEO apex/www/workers.dev); con le
  // integrazioni anche script Umami e action del modulo.
  const b = yield* io.script({
    phase: "astro build",
    bin: ASTRO_BIN,
    args: ["build", "--outDir", dist],
    cwd: SITE_RENDERER,
    env: {
      SITE_JSON: siteJson,
      ...(noindex ? { NOINDEX: "1" } : {}),
      ...(dominio ? { SITE_URL: `https://${dominio}` } : {}),
      ...(integrazioni
        ? { UMAMI_HOST, UMAMI_WEBSITE_ID: integrazioni.umamiWebsiteId, FORM_ACTION: integrazioni.formAction }
        : {}),
      ...(datiStrutturati ? { DATI_STRUTTURATI_JSON: datiStrutturati.file } : {}),
      ...(mediaVarianti ? { MEDIA_VARIANTI_JSON: mediaVarianti } : {}),
    },
    timeoutMs: 180_000,
  });
  if (!b.ok) return b;

  // Post-build: le pagine QA interne non vanno MAI al cliente — /anteprima
  // (preset) e /anteprima-componenti (matrice trattamenti della fabbrica,
  // trovata pubblicata sul dominio al primo audit go-live 2026-07-22).
  for (const qa of ["anteprima", "anteprima-componenti"]) {
    fs.rmSync(path.join(dist, qa), { recursive: true, force: true });
  }

  // FASE budget pagine (pagine leggere): peso e richieste per pagina sulla dist finale. Un
  // budget superato è un AVVISO (decisione dell'orchestratore T1b punto 2) che si accoda a
  // quelli delle fondamenta con il prefisso «Pagine leggere:»; fermano la build solo i guasti
  // tecnici (file assente, <img> di /media senza dimensioni o varianti).
  let avvisiBudget: string[] = [];
  if (fondamenta) {
    const bp = yield* io.script({
      phase: "budget pagine",
      bin: NODE_BIN,
      args: ["--experimental-strip-types", "scripts/budget-pagine.ts", dist],
      cwd: SITE_RENDERER,
      timeoutMs: 60_000,
    });
    if (!bp.ok) return bp;
    const avvisi = bp.esito?.avvisi;
    avvisiBudget = Array.isArray(avvisi) ? avvisi.filter((a): a is string => typeof a === "string").map((a) => `Pagine leggere: ${a}`) : [];
  }

  // FASE fondamenta SEO (sitemap, robots, IndexNow): sull'HTML finale, dopo la pulizia
  // delle pagine QA. Errori tecnici (canonical ≠ URL della sitemap, JSON-LD assente o
  // non valido) fermano la build; title, description e H1 fuori misura sono avvisi.
  let avvisiFondamenta: string[] = [];
  if (fondamenta) {
    yield { type: "phase", label: "fondamenta SEO (sitemap, robots, IndexNow)" };
    const c = cuociFondamenta(dist, dir, fondamenta, new Date());
    if (!c.ok) return { ok: false, error: c.errore };
    yield {
      type: "text",
      text: `sitemap: ${c.urls} URL · lastmod ${c.cambiate.length ? `aggiornato per ${c.cambiate.join(", ")}` : "invariato"} · robots, chiave IndexNow e _headers (noindex su workers.dev) scritti`,
    };
    for (const a of c.avvisi) yield { type: "text", text: `avviso: ${a}` };
    avvisiFondamenta = [...(datiStrutturati?.avvisi ?? []), ...c.avvisi, ...avvisiBudget];
  }
  const { pages, sizeKb } = distStats(dist);
  patchClientState(slug, (s) => {
    s.steps.build.partial = partial;
    s.steps.build.builtAt = new Date().toISOString();
    s.steps.build.pages = pages;
    s.steps.build.sizeKb = sizeKb;
    if (noindex) s.steps.build.noindex = true;
    else delete s.steps.build.noindex;
    // Con quale SITE_URL è uscita QUESTA build: il deploy confronta col
    // dominio corrente e richiede il rebuild se nel frattempo è cambiato.
    if (dominio) s.steps.build.siteUrl = `https://${dominio}`;
    else delete s.steps.build.siteUrl;
    // Stessa logica per le integrazioni cotte nell'HTML (script Umami, action).
    if (integrazioni) s.steps.build.integrazioni = integrazioni;
    else delete s.steps.build.integrazioni;
    // E per le fondamenta SEO (con i loro avvisi, mai bloccanti).
    if (fondamenta) s.steps.build.fondamenta = { dominio: fondamenta, ...(avvisiFondamenta.length ? { avvisi: avvisiFondamenta } : {}) };
    else delete s.steps.build.fondamenta;
    // deploy NON si azzera: il sito online resta online; la UI segnala
    // «build più recente non pubblicata» confrontando builtAt/deployedAt.
  });
  yield {
    type: "text",
    text: `build ok — ${pages} pagine, ${sizeKb} KB${partial ? " (parziale)" : ""}${noindex ? " · noindex (demo)" : ""}${integrazioni ? " · integrazioni attive" : ""}${fondamenta ? ` · fondamenta SEO${avvisiFondamenta.length ? ` (${avvisiFondamenta.length} ${avvisiFondamenta.length === 1 ? "avviso" : "avvisi"})` : ""}` : ""}`,
  };
  return { ok: true };
}
