#!/usr/bin/env node
// Gate opt-out TDM (M5) — HARD, loggato, fail-closed. La L.132/2025 rende la
// violazione dell'opt-out un reato: un riferimento si può usare SOLO se tutti
// i segnali "state of the art" risultano assenti. Qualunque dubbio (errore di
// rete, segnale presente) = NON selezionabile.
//
// Segnali verificati (tutti deterministici, dettagli VERBATIM nel log):
//  1. robots.txt   — blocco totale dei crawler AI noti (o di * su tutto il sito)
//  2. TDMRep       — /.well-known/tdmrep.json + header HTTP `tdm-reservation`
//  3. meta HTML    — <meta name=robots …> con noai/noimageai/noml + meta tdm-reservation
//
// Uso: node scripts/factory/check-optout.mjs <url> [--out <file.json>]
// Exit: 0 consentito · 1 bloccato · 2 errore di verifica (fail-closed)

import { writeFileSync } from "node:fs";

const url = process.argv[2];
const outFile = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
if (!url || !/^https?:\/\//.test(url)) {
  console.error("uso: check-optout.mjs <url http(s)> [--out file.json]");
  process.exit(2);
}

// Identificazione trasparente: è una verifica di conformità, non scraping.
const UA = "ConsulBuild-SiteFactory/1.0 (+verifica opt-out TDM; info@consulbuild.com)";
// Crawler AI il cui blocco esprime una riserva TDM (state of the art 2026)
const BOT_AI = [
  "gptbot", "chatgpt-user", "google-extended", "claudebot", "claude-web",
  "anthropic-ai", "ccbot", "cohere-ai", "perplexitybot", "bytespider",
  "diffbot", "omgilibot", "applebot-extended", "meta-externalagent", "ai2bot",
];

const scarica = async (u) => {
  try {
    const res = await fetch(u, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    return { ok: res.ok, status: res.status, testo: res.ok ? await res.text() : "", headers: res.headers };
  } catch (e) {
    return { ok: false, status: 0, testo: "", errore: e.message };
  }
};

const origine = new URL(url).origin;
const report = {
  url,
  verificatoIl: new Date().toISOString(),
  robotsTxt: { stato: "assente", dettagli: [] },
  tdmRep: { stato: "assente", dettagli: [] },
  metaNoai: { stato: "assente", dettagli: [] },
  esito: "consentito",
  motivo: "",
};
const blocca = (motivo) => {
  report.esito = "bloccato";
  report.motivo = report.motivo ? `${report.motivo}; ${motivo}` : motivo;
};

// ---------- 1. robots.txt ----------
{
  const r = await scarica(`${origine}/robots.txt`);
  if (r.errore) {
    report.robotsTxt = { stato: "errore", dettagli: [r.errore] };
  } else if (r.ok) {
    // parse per gruppi: user-agent (anche multipli) → direttive
    let agenti = [];
    let inGruppo = false;
    const bloccati = new Map(); // agente → riga verbatim
    for (const rigaRaw of r.testo.split(/\r?\n/)) {
      const riga = rigaRaw.replace(/#.*/, "").trim();
      const m = riga.match(/^([a-z-]+)\s*:\s*(.*)$/i);
      if (!m) continue;
      const [, chiave, valore] = [m[0], m[1].toLowerCase(), m[2].trim()];
      if (chiave === "user-agent") {
        if (inGruppo) agenti = []; // nuovo blocco dopo direttive
        agenti.push(valore.toLowerCase());
        inGruppo = false;
      } else {
        inGruppo = true;
        if (chiave === "disallow" && valore === "/") {
          for (const a of agenti) {
            if (a === "*" || BOT_AI.includes(a)) bloccati.set(a, rigaRaw.trim());
          }
        }
        // direttiva di riserva esplicita (rara ma esistente)
        if (/^(noai|disallowaitraining|content-signal)$/.test(chiave)) {
          for (const a of agenti) bloccati.set(a, rigaRaw.trim());
        }
      }
    }
    if (bloccati.size) {
      report.robotsTxt = {
        stato: "riservato",
        dettagli: [...bloccati.entries()].map(([a, riga]) => `user-agent "${a}": ${riga}`),
      };
      blocca(`robots.txt blocca crawler AI/tutti (${[...bloccati.keys()].join(", ")})`);
    } else {
      report.robotsTxt = { stato: "senza riserve", dettagli: [] };
    }
  }
}

// ---------- 2. TDMRep (well-known + header) ----------
{
  const r = await scarica(`${origine}/.well-known/tdmrep.json`);
  if (r.ok) {
    try {
      const regole = JSON.parse(r.testo);
      const percorso = new URL(url).pathname || "/";
      const applicabili = (Array.isArray(regole) ? regole : []).filter((x) => {
        const loc = String(x.location ?? "");
        // location è un pattern di path (es. "/", "/*", "/blog/*")
        const base = loc.replace(/^https?:\/\/[^/]+/, "").replace(/\*.*$/, "");
        return percorso.startsWith(base || "/");
      });
      const riservate = applicabili.filter((x) => Number(x["tdm-reservation"]) === 1);
      if (riservate.length) {
        report.tdmRep = { stato: "riservato", dettagli: riservate.map((x) => JSON.stringify(x)) };
        blocca("TDMRep: tdm-reservation=1 per il percorso richiesto");
      } else {
        report.tdmRep = { stato: "presente senza riserva applicabile", dettagli: applicabili.map((x) => JSON.stringify(x)) };
      }
    } catch {
      report.tdmRep = { stato: "errore", dettagli: ["tdmrep.json non parsabile — fail-closed"] };
      blocca("TDMRep presente ma non parsabile (fail-closed)");
    }
  } else if (r.errore) {
    report.tdmRep = { stato: "errore", dettagli: [r.errore] };
  }
}

// ---------- 3. pagina: header TDM + meta noai ----------
{
  const r = await scarica(url);
  if (!r.ok) {
    report.metaNoai = { stato: "errore", dettagli: [r.errore ?? `HTTP ${r.status}`] };
    report.esito = report.esito === "bloccato" ? "bloccato" : "errore";
    report.motivo = report.motivo || `pagina non scaricabile (${r.errore ?? r.status}): impossibile verificare i meta — fail-closed`;
  } else {
    const headerTdm = r.headers.get("tdm-reservation");
    if (headerTdm?.trim() === "1") {
      report.tdmRep.stato = "riservato";
      report.tdmRep.dettagli.push(`header HTTP tdm-reservation: ${headerTdm}`);
      blocca("header HTTP tdm-reservation: 1");
    }
    const meta = [...r.testo.matchAll(/<meta\s+[^>]*>/gi)].map((m) => m[0]);
    const sospetti = meta.filter((tag) => {
      const nome = tag.match(/name\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase() ?? "";
      const contenuto = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase() ?? "";
      if (nome === "tdm-reservation" && contenuto.trim() === "1") return true;
      return /robots|ai/.test(nome) && /\b(noai|noimageai|noml)\b/.test(contenuto);
    });
    if (sospetti.length) {
      report.metaNoai = { stato: "riservato", dettagli: sospetti };
      blocca(`meta di riserva nella pagina: ${sospetti.join(" · ")}`);
    } else {
      report.metaNoai = { stato: "senza riserve", dettagli: [] };
    }
  }
}

// robots.txt irraggiungibile per errore di rete = non verificabile → fail-closed
if (report.robotsTxt.stato === "errore" && report.esito === "consentito") {
  report.esito = "errore";
  report.motivo = `robots.txt non verificabile (${report.robotsTxt.dettagli[0]}) — fail-closed`;
}

if (report.esito === "consentito") report.motivo = "nessun segnale di riserva TDM rilevato (robots.txt, TDMRep, header, meta)";
const json = JSON.stringify(report, null, 2) + "\n";
if (outFile) writeFileSync(outFile, json);
console.log(json.trim());
process.exit(report.esito === "consentito" ? 0 : report.esito === "bloccato" ? 1 : 2);
