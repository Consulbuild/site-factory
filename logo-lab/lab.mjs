#!/usr/bin/env node
// logo-lab/lab.mjs — banco di prova leggero per la generazione dei loghi.
//
// Replica le condizioni dello step `logo` della pipeline (steps.ts + run-step.ts:
// stesso `claude -p`, stessi tool permessi, stesso script Recraft, stessa skill)
// in un workspace isolato, e permette di variare le leve una alla volta o in
// matrice: modello/effort dell'agente, prompt dell'agente, testo della skill,
// modello/substyle/prompt Recraft, modello e prompt del critico.
//
//   node logo-lab/lab.mjs run configs/base.json            # una run (o N, se c'è «matrice»)
//   node logo-lab/lab.mjs render runs/<run>                # solo rasterizza + metriche
//   node logo-lab/lab.mjs critica runs/<run> [prompts/critico-v2.md]
//   node logo-lab/lab.mjs galleria                         # runs/index.html (tutte le run a confronto)
//
// Ogni run vive in runs/<timestamp>-<nome>/: config.json, ws/ (workspace del
// cliente: contesto.json, palette.json, logo/, mark.svg, logo-trace.json),
// agente-*.json (prompt, azioni, esito), render/ (foglio.png + metriche.json),
// critico.json, report.md. Le run NON vanno in git (vedi .gitignore).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, appendFileSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve, dirname, relative, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { createRequire } from "node:module";

const LAB = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(LAB, "..");
const RUNS = join(LAB, "runs");
const OUT = join(ROOT, "site-renderer", "out");
const SCRIPT = "site-renderer/scripts/generate-logo.mjs";
const LOCAL_BIN = join(homedir(), ".local", "bin");
const CLAUDE = join(LOCAL_BIN, "claude");
const DEFAULT_PRIMARY = "#1a160f";
const env = (extra = {}) => ({ ...process.env, PATH: `${LOCAL_BIN}:${process.env.PATH ?? ""}`, NO_COLOR: "1", ...extra });

/* ---------------- utilità ---------------- */
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const sanitizza = (s) => String(s).replace(/[^\w.-]+/g, "_");
const leggiJson = (p, fallback = null) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);
// path da CLI: relativo alla cwd, altrimenti a logo-lab/
const trova = (p) => (existsSync(resolve(p)) ? resolve(p) : resolve(LAB, p));
const setPath = (obj, dotted, val) => {
  const parts = dotted.split(".");
  let o = obj;
  for (const k of parts.slice(0, -1)) o = o[k] ??= {};
  const last = parts.at(-1);
  // valore-oggetto (es. {"style":"icon","substyle":"outline"}): si fonde, non sostituisce
  if (val && typeof val === "object" && o[last] && typeof o[last] === "object") Object.assign(o[last], val);
  else o[last] = val;
};
const etichetta = (v) => (v && typeof v === "object" ? v.nome ?? Object.values(v).join("-") : v);

function sh(bin, args, { cwd = ROOT, extraEnv = {}, timeoutMs = 0, onLine } = {}) {
  return new Promise((res) => {
    const child = spawn(bin, args, { cwd, env: env(extraEnv) });
    let out = "";
    let err = "";
    let buf = "";
    child.stdout.on("data", (c) => {
      out += c;
      if (!onLine) return;
      buf += c;
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        onLine(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
      }
    });
    child.stderr.on("data", (c) => (err += c));
    let timedOut = false;
    // claude -p può ignorare SIGTERM: dopo 10 s si passa a SIGKILL (come run-step.ts)
    const t = timeoutMs ? setTimeout(() => ((timedOut = true), child.kill("SIGTERM"), setTimeout(() => child.kill("SIGKILL"), 10_000).unref()), timeoutMs) : null;
    child.on("close", (code) => {
      if (t) clearTimeout(t);
      if (onLine && buf) onLine(buf);
      res({ code, out, err, timedOut });
    });
  });
}

/* ---------------- config e matrice ---------------- */
// «matrice»: {"recraft.model": ["a","b"], "agente.effort": ["high","xhigh"]} →
// prodotto cartesiano, una run per combinazione, nome = base + variabili.
function espandi(cfg) {
  const m = cfg.matrice ?? {};
  let combos = [{}];
  for (const k of Object.keys(m)) combos = combos.flatMap((c) => m[k].map((v) => ({ ...c, [k]: v })));
  return combos.map((c) => {
    const out = structuredClone(cfg);
    delete out.matrice;
    for (const [k, v] of Object.entries(c)) setPath(out, k, v);
    out.variabili = c;
    out.nome = [cfg.nome, ...Object.entries(c).map(([k, v]) => `${k.split(".").pop()}=${sanitizza(etichetta(v))}`)].join("__");
    return out;
  });
}

/* ---------------- workspace cliente ---------------- */
function preparaWorkspace(cfg, ws) {
  mkdirSync(join(ws, "logo"), { recursive: true });
  const cl = cfg.cliente;
  if (typeof cl === "string") {
    // slug reale in site-renderer/out: stessi input della pipeline
    for (const f of ["contesto.json", "palette.json"]) {
      const src = join(OUT, cl, f);
      if (!existsSync(src)) throw new Error(`cliente «${cl}»: manca ${src}`);
      copyFileSync(src, join(ws, f));
    }
    const pal = leggiJson(join(ws, "palette.json"));
    return { slug: cl, primary: pal["brand.palette.primary"] };
  }
  // cliente sintetico: {slug, primary, contesto: <path a un contesto.json>}
  copyFileSync(trova(cl.contesto), join(ws, "contesto.json"));
  const primary = cl.primary ?? DEFAULT_PRIMARY;
  writeFileSync(join(ws, "palette.json"), JSON.stringify({ "brand.preset": "meridian", "brand.palette.primary": primary, "brand.palette.accent": primary }, null, 2));
  return { slug: cl.slug ?? "cliente-test", primary };
}

// Leve Recraft della config → flag di generate-logo.mjs (stessi in modo diretto e agente).
// technical: "" = nessuna formula tecnica appesa; colors: ["#hex",…] → controls.colors;
// keepColors: true = niente appiattimento monocromo.
function flagsRecraft(r) {
  return [
    ...(r.model ? ["--model", r.model] : []),
    ...(r.style ? ["--style", r.style] : []),
    ...(r.substyle ? ["--substyle", r.substyle] : []),
    ...(r.colors?.length ? ["--colors", r.colors.join(",")] : []),
    ...(r.technical !== undefined && r.technical !== null ? ["--technical", r.technical] : []),
    ...(r.keepColors ? ["--keep-colors"] : []),
  ];
}

/* ---------------- modo agente: replica di steps.ts/run-step.ts ---------------- */
async function eseguiAgente(cfg, dir, ws, slug, primary, log) {
  const a = cfg.agente;
  const base = relative(ROOT, ws);
  let prompt = readFileSync(trova(a.prompt), "utf8")
    .replaceAll("{{slug}}", slug)
    .replaceAll("{{base}}", base)
    .replaceAll("{{primary}}", primary)
    .replaceAll("{{script}}", `node ${SCRIPT}`);
  let allowed = ["Read", "Skill", "Write", `Bash(node ${SCRIPT}:*)`];
  if (a.skill) {
    // variante della skill: inlined nel prompt, tool Skill escluso (altrimenti caricherebbe quella vera)
    prompt += `\n\nTESTO DELLA SKILL logo-designer — usa QUESTO al posto del tool Skill (non disponibile):\n\n${readFileSync(trova(a.skill), "utf8")}`;
    allowed = allowed.filter((t) => t !== "Skill");
  }
  const r = cfg.recraft ?? {};
  const extraFlags = flagsRecraft(r).map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(" ");
  if (extraFlags) prompt += `\n\nVARIABILE DI TEST: a OGNI comando di generazione (--prompt) aggiungi \`${extraFlags}\`.`;
  writeFileSync(join(dir, "agente-prompt.md"), prompt);

  const args = [
    "-p", prompt, "--output-format", "stream-json", "--verbose",
    "--model", a.model, "--effort", a.effort, "--max-turns", String(a.maxTurns ?? 60),
    "--allowedTools", ...allowed,
    "--disallowedTools", "WebSearch", "WebFetch", "Edit", "Task",
  ];
  const azioni = [];
  let esito = null;
  const streamPath = join(dir, "agente.stream.jsonl");
  const t0 = Date.now();
  log(`agente ${a.model}/${a.effort} avviato (timeout ${(a.timeoutMs ?? 900000) / 60000} min)`);
  const res = await sh(CLAUDE, args, {
    timeoutMs: a.timeoutMs ?? 15 * 60 * 1000,
    onLine: (line) => {
      if (!line.trim()) return;
      appendFileSync(streamPath, line + "\n");
      let ev;
      try { ev = JSON.parse(line); } catch { return; }
      if (ev.type === "assistant") {
        for (const c of ev.message?.content ?? []) {
          if (c.type === "tool_use") {
            const cmd = c.input?.command ?? c.input?.file_path ?? c.input?.skill ?? "";
            azioni.push({ t: Math.round((Date.now() - t0) / 1000), tool: c.name, input: cmd });
            log(`  ${c.name}: ${String(cmd).slice(0, 140)}`);
          } else if (c.type === "text" && c.text?.trim()) log(`  ✎ ${c.text.trim().slice(0, 200)}`);
        }
      } else if (ev.type === "result") {
        esito = { ok: !ev.is_error && ev.subtype === "success", subtype: ev.subtype, turni: ev.num_turns, durata_s: Math.round(ev.duration_ms / 1000), costo_usd: ev.total_cost_usd, testo: ev.result };
      }
    },
  });
  esito ??= { ok: false, subtype: res.timedOut ? "timeout" : `exit ${res.code}`, durata_s: Math.round((Date.now() - t0) / 1000), stderr: res.err.trim().split("\n").slice(-3).join(" ") };
  writeFileSync(join(dir, "agente-azioni.json"), JSON.stringify(azioni, null, 2));
  writeFileSync(join(dir, "agente-esito.json"), JSON.stringify(esito, null, 2));
  log(`agente finito: ${esito.subtype} in ${esito.durata_s}s, ${azioni.length} azioni`);
  return esito;
}

/* ---------------- modo diretto: solo Recraft, niente agente ---------------- */
// Isola la variabile Recraft (modello/substyle/prompt) dall'agente: lo stesso
// soggetto, N seed, e il kit si materializza sulla prima variante.
async function eseguiDiretto(cfg, dir, ws, primary, log) {
  const r = cfg.recraft ?? {};
  if (!r.prompt) throw new Error("modo diretto: serve recraft.prompt (il soggetto)");
  const n = r.varianti ?? 6;
  const flags = flagsRecraft(r);
  const t0 = Date.now();
  const esiti = [];
  // sequenziale: in parallelo Recraft rifiuta parte delle richieste
  for (let i = 1; i <= n; i++) {
    const out = join(ws, "logo", `mark-${i}.svg`);
    const res = await sh("node", [SCRIPT, "--prompt", r.prompt, "--color", primary, "--out", out, ...flags]);
    log(`  mark-${i}: exit ${res.code} ${(res.err || res.out).trim().split("\n")[0].slice(0, 200)}`);
    esiti.push(res.code === 0);
  }
  const prima = esiti.findIndex(Boolean) + 1;
  if (prima > 0) {
    for (const f of ["mark.svg", "favicon.svg"]) await sh("node", [SCRIPT, "--recolor", join(ws, "logo", `mark-${prima}.svg`), "--color", primary, "--out", join(ws, f), ...(r.keepColors ? ["--keep-colors"] : [])]);
  }
  writeFileSync(join(ws, "logo-trace.json"), JSON.stringify({
    prompt: r.prompt, model: r.model ?? "recraftv3_vector", style: r.style ?? null, substyle: r.substyle ?? null,
    scelta: prima ? `logo/mark-${prima}.svg` : null, motivo: "modo diretto: nessuna scelta, kit sulla prima variante riuscita",
    varianti: esiti.map((ok, i) => ({ file: `logo/mark-${i + 1}.svg`, esito: ok ? "generata" : "errore" })),
  }, null, 2));
  const esito = { ok: esiti.some(Boolean), subtype: "diretto", durata_s: Math.round((Date.now() - t0) / 1000), generate: esiti.filter(Boolean).length };
  writeFileSync(join(dir, "agente-esito.json"), JSON.stringify(esito, null, 2));
  return esito;
}

/* ---------------- render: foglio di contatto + metriche ---------------- */
function svgInfo(file) {
  const svg = readFileSync(file, "utf8");
  const fills = [...new Set([...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1].toLowerCase()))].filter((f) => f !== "none");
  const vb = /viewBox="\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(svg);
  let sfondo = false;
  if (vb) {
    const [w, h] = [Number(vb[1]), Number(vb[2])];
    for (const m of svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)) {
      const xs = [...m[1].matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
      if (/^M\s*0\s+0\s*[LH]/i.test(m[1].trim()) && xs.every((n) => Math.abs(n) < 1 || Math.abs(n - w) < 1 || Math.abs(n - h) < 1)) sfondo = true;
    }
  }
  return { bytes: statSync(file).size, paths: (svg.match(/<path\b/g) ?? []).length, fills, sfondo_residuo: sfondo, testo: /<text\b/.test(svg) };
}

function varianti(ws) {
  const dir = join(ws, "logo");
  const list = existsSync(dir) ? readdirSync(dir).filter((f) => /^mark-\d+\.svg$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((f) => `logo/${f}`) : [];
  if (existsSync(join(ws, "mark.svg"))) list.push("mark.svg");
  return list;
}

async function render(dir) {
  const ws = join(dir, "ws");
  const rd = join(dir, "render");
  mkdirSync(rd, { recursive: true });
  const files = varianti(ws);
  const trace = leggiJson(join(ws, "logo-trace.json"), {});
  const primary = leggiJson(join(ws, "palette.json"), {})["brand.palette.primary"] ?? DEFAULT_PRIMARY;
  const info = Object.fromEntries(files.map((f) => [f, svgInfo(join(ws, f))]));
  const righe = files.map((f) => {
    const dark = existsSync(join(ws, f.replace(/\.svg$/, "-dark.svg"))) ? f.replace(/\.svg$/, "-dark.svg") : null;
    const src = `../ws/${f}`;
    const badge = trace.scelta === f ? " ★ scelta" : f === "mark.svg" ? " (kit finale)" : "";
    return `<section data-file="${f}"><h2>${f}${badge}</h2><div class="row">
      ${[16, 32, 64, 256].map((s) => `<figure><img src="${src}" width="${s}" height="${s}" data-size="${s}"><figcaption>${s}px</figcaption></figure>`).join("")}
      <figure class="dark">${dark ? `<img src="../ws/${dark}" width="64" height="64">` : "<span>—</span>"}<figcaption>64px scuro</figcaption></figure>
      <figure class="tab"><span class="chip"><img src="${src}" width="16" height="16"> ${basename(f, ".svg")} · sito</span><figcaption>scheda browser</figcaption></figure>
      <pre class="m">${info[f].paths} path · ${Math.round(info[f].bytes / 1024)} KB · fill ${info[f].fills.join(",") || "—"}${info[f].sfondo_residuo ? " · SFONDO RESIDUO" : ""}${info[f].testo ? " · TESTO" : ""}</pre>
    </div></section>`;
  }).join("\n");
  const html = `<!doctype html><meta charset="utf-8"><title>${basename(dir)}</title><style>
    body{font:13px/1.4 -apple-system,system-ui,sans-serif;margin:0;padding:16px;background:#fff;color:#222;width:1100px}
    h1{font-size:15px;margin:0 0 8px} h2{font-size:13px;margin:12px 0 4px;font-weight:600}
    .row{display:flex;align-items:flex-end;gap:18px;border:1px solid #e5e5e5;padding:10px 12px;border-radius:6px}
    figure{margin:0;text-align:center} figcaption{font-size:10px;color:#777;margin-top:4px} img{display:block;image-rendering:auto;margin:0 auto}
    .dark{background:${primary};padding:12px;border-radius:4px} .dark figcaption{color:#ddd}
    .chip{display:inline-flex;align-items:center;gap:6px;background:#e8eaed;border-radius:8px 8px 0 0;padding:6px 12px;font-size:12px;color:#333;border:1px solid #d0d0d0;border-bottom:0}
    pre.m{font-size:10px;color:#666;margin:0;white-space:pre-wrap;max-width:220px}
  </style><h1>${basename(dir)} — primary ${primary}</h1>${righe}`;
  writeFileSync(join(rd, "foglio.html"), html);

  const req = createRequire(join(ROOT, "site-renderer", "package.json"));
  let chromium;
  try { ({ chromium } = req("playwright")); } catch { ({ chromium } = req("@playwright/test")); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1140, height: 800 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(join(rd, "foglio.html")).href);
  await page.waitForLoadState("networkidle");
  // Metriche di leggibilità: frazione di pixel «inchiostrati» a 32 e a 256px.
  // dettaglio = ink32/ink256: sotto ~0.6 la forma perde massa rimpicciolendo
  // (linee sottili che spariscono nella favicon).
  // Gli SVG entrano come data URI: un'immagine file:// «sporca» il canvas e
  // getImageData viene rifiutato.
  const svgs = Object.fromEntries(files.map((f) => [f, readFileSync(join(ws, f), "utf8")]));
  const ink = await page.evaluate(async (svgs) => {
    const out = {};
    for (const [f, svg] of Object.entries(svgs)) {
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      await img.decode().catch(() => {});
      const misura = (s) => {
        const c = document.createElement("canvas");
        c.width = c.height = s;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, s, s);
        ctx.drawImage(img, 0, 0, s, s);
        const d = ctx.getImageData(0, 0, s, s).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 600) n++;
        return n / (s * s);
      };
      out[f] = { ink32: +misura(32).toFixed(3), ink256: +misura(256).toFixed(3) };
    }
    return out;
  }, svgs);
  await page.screenshot({ path: join(rd, "foglio.png"), fullPage: true });
  await browser.close();
  const metriche = Object.fromEntries(files.map((f) => {
    const m = { ...info[f], ...ink[f] };
    m.dettaglio = m.ink256 ? +(m.ink32 / m.ink256).toFixed(2) : 0;
    m.flag = [m.sfondo_residuo && "sfondo_residuo", m.testo && "testo", m.ink256 > 0.85 && "blob", m.ink256 < 0.05 && "vuoto", m.dettaglio < 0.6 && "dettagli_persi", m.fills.length > 1 && "colori_residui"].filter(Boolean);
    return [f, m];
  }));
  writeFileSync(join(rd, "metriche.json"), JSON.stringify(metriche, null, 2));
  return metriche;
}

/* ---------------- critico visivo ---------------- */
async function critica(dir, cr, log = console.log) {
  const ws = join(dir, "ws");
  const trace = leggiJson(join(ws, "logo-trace.json"), {});
  const metriche = leggiJson(join(dir, "render", "metriche.json"), {});
  const prompt = readFileSync(trova(cr.prompt), "utf8")
    .replaceAll("{{foglio}}", join(dir, "render", "foglio.png"))
    .replaceAll("{{riferimenti}}", join(LAB, "riferimenti"))
    .replaceAll("{{contesto}}", join(ws, "contesto.json"))
    .replaceAll("{{metriche}}", JSON.stringify(metriche))
    .replaceAll("{{scelta}}", trace.scelta ?? "nessuna")
    .replaceAll("{{motivo}}", trace.motivo ?? "—");
  writeFileSync(join(dir, "critico-prompt.md"), prompt);
  log(`critico ${cr.model}/${cr.effort} avviato`);
  const res = await sh(CLAUDE, ["-p", prompt, "--output-format", "json", "--model", cr.model, "--effort", cr.effort, "--max-turns", "12", "--allowedTools", "Read", "--disallowedTools", "Bash", "Write", "Edit", "WebSearch", "WebFetch", "Task"], { timeoutMs: 10 * 60 * 1000 });
  let testo = "";
  try { testo = JSON.parse(res.out).result ?? ""; } catch { testo = res.out; }
  writeFileSync(join(dir, "critico-raw.txt"), testo + (res.err ? `\n--- stderr ---\n${res.err}` : ""));
  const m = /\{[\s\S]*\}/.exec(testo);
  let json = null;
  try { json = m && JSON.parse(m[0]); } catch {}
  if (!json) { log("critico: risposta non parsabile (vedi critico-raw.txt)"); return null; }
  writeFileSync(join(dir, "critico.json"), JSON.stringify(json, null, 2));
  log(`critico: ${json.verdetto} — limite: ${json.diagnosi?.limite ?? "?"}`);
  return json;
}

/* ---------------- report per run + galleria ---------------- */
function report(dir) {
  const cfg = leggiJson(join(dir, "config.json"), {});
  const esito = leggiJson(join(dir, "agente-esito.json"), {});
  const azioni = leggiJson(join(dir, "agente-azioni.json"), []);
  const metriche = leggiJson(join(dir, "render", "metriche.json"), {});
  const crit = leggiJson(join(dir, "critico.json"));
  const trace = leggiJson(join(dir, "ws", "logo-trace.json"), {});
  const gen = azioni.filter((a) => a.tool === "Bash" && /--prompt/.test(a.input));
  const punteggi = Object.fromEntries((crit?.varianti ?? []).map((v) => [v.file, v]));
  const righe = Object.entries(metriche).map(([f, m]) => {
    const p = punteggi[f];
    return `| ${f}${trace.scelta === f ? " ★" : ""} | ${m.paths} | ${m.ink32} | ${m.dettaglio} | ${m.flag.join(" ") || "—"} | ${p ? `${p.totale}/12 ${p.usabile_logo ? "logo✓" : "logo✗"} ${p.usabile_favicon ? "fav✓" : "fav✗"}` : "—"} |`;
  });
  const md = `# ${basename(dir)}

**Variabili**: ${JSON.stringify(cfg.variabili ?? {})}
**Modo**: ${cfg.modo} · agente ${cfg.agente ? `${cfg.agente.model}/${cfg.agente.effort} (${cfg.agente.prompt}${cfg.agente.skill ? `, skill ${cfg.agente.skill}` : ", skill reale"})` : "—"} · recraft ${cfg.recraft?.model ?? "recraftv3_vector"}${cfg.recraft?.substyle ? "/" + cfg.recraft.substyle : ""} · critico ${cfg.critico ? `${cfg.critico.model} (${cfg.critico.prompt})` : "—"}
**Esito agente**: ${esito.subtype} · ${esito.durata_s}s · ${esito.turni ?? "—"} turni · $${esito.costo_usd?.toFixed?.(2) ?? "—"} · ${gen.length} generazioni Recraft
**Scelta**: ${trace.scelta ?? "—"} — ${trace.motivo ?? ""}
**Prompt Recraft dell'agente**: ${gen[0] ? "`" + gen[0].input.replace(/.*--prompt "([^"]*)".*/, "$1") + "`" : trace.prompt ?? "—"}

| variante | path | ink32 | dettaglio | flag | critico |
|---|---|---|---|---|---|
${righe.join("\n")}

**Critico**: ${crit ? `${crit.verdetto} · migliore ${crit.migliore} · scelta agente ${crit.scelta_agente_corretta ? "corretta" : "SBAGLIATA"}\n**Limite**: ${crit.diagnosi?.limite} — ${crit.diagnosi?.spiegazione}\n**Fix prompt**: ${crit.fix_prompt ?? crit.diagnosi?.fix_prompt ?? "—"}` : "non eseguito"}

![foglio](render/foglio.png)
`;
  writeFileSync(join(dir, "report.md"), md);
}

function galleria() {
  const runs = existsSync(RUNS) ? readdirSync(RUNS).filter((d) => existsSync(join(RUNS, d, "config.json"))).sort().reverse() : [];
  const card = (d) => {
    const dir = join(RUNS, d);
    const cfg = leggiJson(join(dir, "config.json"), {});
    const esito = leggiJson(join(dir, "agente-esito.json"), {});
    const crit = leggiJson(join(dir, "critico.json"));
    const metriche = leggiJson(join(dir, "render", "metriche.json"), {});
    const trace = leggiJson(join(dir, "ws", "logo-trace.json"), {});
    const flags = Object.values(metriche).flatMap((m) => m.flag);
    const chips = [`${cfg.modo}`, cfg.agente && `${cfg.agente.model}/${cfg.agente.effort}`, `recraft ${cfg.recraft?.model ?? "v3_vector"}${cfg.recraft?.substyle ? "/" + cfg.recraft.substyle : ""}`, cfg.agente?.skill && `skill ${basename(cfg.agente.skill)}`, cfg.agente?.prompt && basename(cfg.agente.prompt)].filter(Boolean);
    return `<article class="${crit?.verdetto === "PASS" ? "pass" : crit ? "fail" : ""}">
      <header><h2>${d}</h2><div class="chips">${chips.map((c) => `<span>${c}</span>`).join("")}</div></header>
      <p class="meta">${esito.subtype ?? "?"} · ${esito.durata_s ?? "?"}s · $${esito.costo_usd?.toFixed?.(2) ?? "—"} · scelta ${trace.scelta ?? "—"} · flag: ${flags.length ? [...new Set(flags)].join(", ") : "nessuno"}</p>
      ${crit ? `<p class="crit"><b>${crit.verdetto}</b> · migliore ${crit.migliore} · limite: <b>${crit.diagnosi?.limite}</b> — ${crit.diagnosi?.spiegazione}</p>` : "<p class='crit'>critico non eseguito</p>"}
      <a href="${d}/render/foglio.png"><img src="${d}/render/foglio.png" loading="lazy"></a>
      <p class="links"><a href="${d}/report.md">report.md</a> · <a href="${d}/render/foglio.html">foglio.html</a> · <a href="${d}/agente-prompt.md">prompt agente</a> · <a href="${d}/critico.json">critico.json</a></p>
    </article>`;
  };
  const html = `<!doctype html><meta charset="utf-8"><title>logo-lab</title><style>
    body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:0;padding:24px;background:#f4f4f2;color:#222}
    article{background:#fff;border-radius:10px;padding:16px 20px;margin-bottom:24px;border-left:6px solid #ccc;max-width:1180px}
    article.pass{border-left-color:#2e7d32} article.fail{border-left-color:#c62828}
    h1{font-size:20px} h2{font-size:15px;margin:0} header{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    .chips span{display:inline-block;background:#eef;border-radius:4px;padding:1px 8px;font-size:12px;margin-right:6px}
    .meta{color:#555;font-size:13px} .crit{background:#fafaf5;padding:8px 12px;border-radius:6px}
    img{max-width:100%;border:1px solid #e5e5e5;border-radius:6px} .links{font-size:13px}
  </style><h1>logo-lab — ${runs.length} run</h1>${runs.map(card).join("\n")}`;
  mkdirSync(RUNS, { recursive: true });
  writeFileSync(join(RUNS, "index.html"), html);
  console.log(`galleria: ${join(RUNS, "index.html")}`);
}

/* ---------------- orchestrazione ---------------- */
async function eseguiRun(cfg) {
  const dir = join(RUNS, `${stamp()}-${sanitizza(cfg.nome)}`);
  const ws = join(dir, "ws");
  mkdirSync(dir, { recursive: true });
  const log = (s) => { console.log(`[${cfg.nome}] ${s}`); appendFileSync(join(dir, "log.txt"), `${new Date().toISOString()} ${s}\n`); };
  const { slug, primary } = preparaWorkspace(cfg, ws);
  writeFileSync(join(dir, "config.json"), JSON.stringify(cfg, null, 2));
  try {
    if (cfg.modo === "diretto") await eseguiDiretto(cfg, dir, ws, primary, log);
    else await eseguiAgente(cfg, dir, ws, slug, primary, log);
    const m = await render(dir);
    log(`render: ${Object.keys(m).length} varianti, flag ${JSON.stringify(Object.fromEntries(Object.entries(m).filter(([, v]) => v.flag.length).map(([k, v]) => [k, v.flag])))}`);
    if (cfg.critico && Object.keys(m).length) await critica(dir, cfg.critico, log);
  } catch (e) {
    log(`ERRORE: ${e.message}`);
  }
  report(dir);
  log(`report: ${join(dir, "report.md")}`);
  return dir;
}

async function main() {
  const [cmd, arg, arg2] = process.argv.slice(2);
  if (cmd === "run") {
    const cfg = leggiJson(trova(arg));
    if (!cfg) throw new Error(`config non trovata: ${arg}`);
    const runs = espandi(cfg);
    const par = cfg.parallelo ?? 2;
    console.log(`${runs.length} run, ${par} in parallelo: ${runs.map((r) => r.nome).join(", ")}`);
    // ponytail: pool banale a slot; la coda del piano Max è il vero limite
    const coda = [...runs];
    await Promise.all(Array.from({ length: Math.min(par, coda.length) }, async () => { while (coda.length) await eseguiRun(coda.shift()); }));
    galleria();
  } else if (cmd === "render") {
    const dir = trova(arg);
    console.log(JSON.stringify(await render(dir), null, 2));
    report(dir);
    galleria();
  } else if (cmd === "critica") {
    const dir = trova(arg);
    const cfg = leggiJson(join(dir, "config.json"), {});
    const cr = { model: "claude-opus-4-8", effort: "high", ...(cfg.critico ?? {}), ...(arg2 ? { prompt: trova(arg2) } : {}) };
    await critica(dir, cr);
    report(dir);
    galleria();
  } else if (cmd === "galleria") {
    galleria();
  } else {
    console.error("uso: lab.mjs run <config.json> | render <run> | critica <run> [prompt.md] | galleria");
    process.exit(2);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
