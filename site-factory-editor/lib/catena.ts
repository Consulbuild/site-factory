import fs from "node:fs";
import path from "node:path";
import { clientDir } from "./paths";
import { readClientState, patchClientState, readCopyReview, readImageReview, readLavori, readContesto, readIntake, listClients } from "./clients";
import { STEPS, motivoGate, type StepKey, type RunMode } from "./steps";
import { startClientRun, attendiRun, stopRun, busIdCliente } from "./run-bus";
import { isErroreLimite } from "./run-step";
import { staleFiles } from "./staleness";
import {
  confermaIntake,
  confermaContesto,
  confermaPalette,
  confermaLogo,
  confermaCopy,
  confermaImages,
  confermaLegale,
  confermaBuild,
  motiviLegale,
  type EsitoConferma,
} from "./conferme";
import { deployClient } from "./deploy";
import type { ClientState } from "./schemas";

// Catena automatica (decisione 2026-09-08): gli step corrono uno dopo l'altro
// SENZA checkpoint umano fino alla demo costruita («demo pronta da
// controllare»); l'umano verifica una volta, alla fine. Non è un secondo
// motore: lancia i run reali del bus (status bar, log, stop e riparazione
// zombie invariati) e conferma con le stesse funzioni delle route
// (lib/conferme.ts, auto:true). Idempotente: uno step già «verificato» si
// salta, uno «da_verificare» si giudica e si conferma senza rifarlo — così
// «Riprendi» è lo stesso ingresso di «Avvia». Si ferma al primo step che il
// critico boccia o che fallisce: da lì tocca all'umano nella scheda.
//
// Percorso demo: intake → contesto → palette → logo (se manca) → copy →
// lavori (alt delle foto reali, se ci sono) → images → build noindex → demo_pronta.
// Percorso completo: + legale prima della build; con dominio → build reale + deploy.

const MAX_ATTIVE = 2; // ponytail: limiti del piano Max con 2 claude -p in parallelo; alzare quando misurato
const ATTESA_LIMITE_MS = 30 * 60_000;
const MAX_RIPROVE_LIMITE = 3;
const PASSO_ATTESA_MS = 5_000;

type Controllo = { stop: boolean; passo?: string };
type Coda = { coda: Array<{ slug: string; prio: number; at: number }>; attive: Map<string, Controllo> };
const Q: Coda = ((globalThis as Record<string, unknown>).__sfCatena ??= { coda: [], attive: new Map() }) as Coda;

type StatoCatena = NonNullable<ClientState["catena"]>["stato"];

function log(slug: string, passo: string, evento: string, dettaglio?: string): void {
  try {
    const dir = path.join(clientDir(slug), "logs");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "catena.ndjson"), JSON.stringify({ t: Date.now(), passo, evento, ...(dettaglio ? { dettaglio } : {}) }) + "\n");
  } catch {
    /* il log non ferma la catena */
  }
}

function segna(slug: string, stato: StatoCatena, extra: Partial<NonNullable<ClientState["catena"]>> = {}): void {
  patchClientState(slug, (s) => {
    s.catena = { stato, avviataAt: s.catena?.avviataAt ?? new Date().toISOString(), ...extra };
  });
}

export const catenaViva = (slug: string): boolean => Q.attive.has(slug) || Q.coda.some((c) => c.slug === slug);
export const posizioneInCoda = (slug: string): number => Q.coda.findIndex((c) => c.slug === slug) + 1;

/** Mette il cliente in coda (priorità: completo > demo, poi FIFO) e pompa. */
export function avviaCatena(slug: string): { ok: true; posizione: number } | { error: string } {
  if (catenaViva(slug)) return { error: "catena già in corso o in coda per questo cliente" };
  const st = readClientState(slug);
  Q.coda.push({ slug, prio: st.percorso === "completo" ? 0 : 1, at: Date.now() });
  segna(slug, "in_coda", { avviataAt: new Date().toISOString() });
  log(slug, "-", "in_coda");
  pompa();
  return { ok: true, posizione: posizioneInCoda(slug) };
}

/** Ferma: in coda → via subito; in corso → stop del run del passo corrente, la catena si chiude da sola. */
export function fermaCatena(slug: string): boolean {
  const i = Q.coda.findIndex((c) => c.slug === slug);
  if (i >= 0) {
    Q.coda.splice(i, 1);
    segna(slug, "ferma", { errore: "fermata dall'operatore", finitaAt: new Date().toISOString() });
    log(slug, "-", "fermata", "dalla coda");
    return true;
  }
  const ctl = Q.attive.get(slug);
  if (!ctl) return false;
  ctl.stop = true;
  if (ctl.passo && ctl.passo in STEPS) stopRun(busIdCliente(slug, ctl.passo));
  return true;
}

function pompa(): void {
  while (Q.attive.size < MAX_ATTIVE && Q.coda.length) {
    Q.coda.sort((a, b) => a.prio - b.prio || a.at - b.at);
    const { slug } = Q.coda.shift()!;
    const ctl: Controllo = { stop: false };
    Q.attive.set(slug, ctl);
    void eseguiCatena(slug, ctl)
      .catch((e) => {
        segna(slug, "ferma", { errore: e instanceof Error ? e.message : String(e), finitaAt: new Date().toISOString() });
        log(slug, "-", "errore", e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        Q.attive.delete(slug);
        pompa();
      });
  }
}

const attesa = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type EsitoPasso = { ok: true } | { ok: false; errore: string; limite?: boolean };

/** Un run reale del bus per (slug, step) e la sua attesa. */
async function eseguiRun(slug: string, key: StepKey, mode: RunMode, label: string): Promise<EsitoPasso> {
  const gate = motivoGate(slug, key, mode);
  if (gate) return { ok: false, errore: gate };
  const avvio = startClientRun(slug, key, { mode }, label);
  if ("error" in avvio) return { ok: false, errore: `${avvio.error} (lanciato a mano?)` };
  const r = await attendiRun(avvio.id);
  if (r.esito === "ok") return { ok: true };
  const errore = r.errore ?? (r.esito === "interrotto" ? "run interrotto" : "run fallito");
  return { ok: false, errore, limite: isErroreLimite(errore) };
}

/** Run con attesa e riprova sul limite di utilizzo (mai su altri errori). */
async function eseguiRunConRiprova(slug: string, key: StepKey, mode: RunMode, label: string, ctl: Controllo): Promise<EsitoPasso> {
  for (let tentativo = 0; ; tentativo++) {
    const r = await eseguiRun(slug, key, mode, label);
    if (r.ok || !r.limite || tentativo >= MAX_RIPROVE_LIMITE || ctl.stop) return r;
    const riprovaAlle = new Date(Date.now() + ATTESA_LIMITE_MS).toISOString();
    segna(slug, "attesa_limite", { passo: key, riprovaAlle, errore: r.errore });
    log(slug, key, "attesa_limite", riprovaAlle);
    for (let t = 0; t < ATTESA_LIMITE_MS && !ctl.stop; t += PASSO_ATTESA_MS) await attesa(PASSO_ATTESA_MS);
    if (ctl.stop) return { ok: false, errore: "fermata dall'operatore" };
    segna(slug, "in_corso", { passo: key });
  }
}

/** La build va (ri)fatta anche se «verificato»: parziale, noindex incoerente col percorso, dominio cambiato, upstream cambiato. */
function buildDaRifare(st: ClientState, slug: string): boolean {
  const b = st.steps.build;
  if (b.stato !== "verificato") return true;
  if (b.partial) return true;
  if (!!b.noindex !== (st.percorso === "demo")) return true;
  if (b.siteUrl !== (b.dominio ? `https://${b.dominio}` : undefined)) return true;
  return staleFiles(slug, STEPS.build.upstream, b.upstream).length > 0;
}

type Passo = {
  key: StepKey;
  /** Motivo per saltare il passo (null = si fa). */
  salta?: (slug: string) => string | null;
  /** Dopo il run (o su un da_verificare esistente): motivo per fermarsi (verdetto del critico). */
  verdetto?: (slug: string) => string | null;
  conferma: (slug: string) => EsitoConferma;
  /** true = rifare anche se verificato (build). */
  rifare?: (st: ClientState, slug: string) => boolean;
};

const PASSI: Record<Exclude<StepKey, "build">, Passo> & { build: Passo } = {
  contesto: { key: "contesto", conferma: (s) => confermaContesto(s, { auto: true }) },
  palette: { key: "palette", conferma: (s) => confermaPalette(s, { auto: true }) },
  logo: {
    key: "logo",
    salta: (s) => (readIntake(s)?.["brand.logo"] || readContesto(s)?.materiali.logo !== false ? "il cliente ha fornito il logo" : null),
    conferma: (s) => confermaLogo(s, { auto: true }),
  },
  copy: {
    key: "copy",
    verdetto: (s) => {
      const r = readCopyReview(s);
      return r?.verdict === "FAIL" ? `critico del copy: FAIL (${r.findings?.filter((f) => f.gravita === "bloccante").length ?? 0} bloccanti) — correggi nella scheda Copy` : null;
    },
    conferma: (s) => confermaCopy(s, { auto: true }),
  },
  images: {
    key: "images",
    verdetto: (s) => (readImageReview(s)?.verdict === "FAIL" ? "critico delle immagini: FAIL — rigenera gli scarti nella scheda Immagini" : null),
    conferma: (s) => confermaImages(s, { auto: true }),
  },
  legale: {
    key: "legale",
    verdetto: (s) => {
      const m = motiviLegale(s);
      return m.length ? `legale non confermabile: ${m.join("; ")}` : null;
    },
    conferma: (s) => confermaLegale(s, { auto: true }),
  },
  build: { key: "build", conferma: (s) => confermaBuild(s, { auto: true }), rifare: buildDaRifare },
};

async function eseguiCatena(slug: string, ctl: Controllo): Promise<void> {
  const label = listClients().find((c) => c.slug === slug)?.businessName ?? slug;
  const ferma = (passo: string, errore: string) => {
    segna(slug, "ferma", { passo, errore, finitaAt: new Date().toISOString() });
    log(slug, passo, "ferma", errore);
  };
  segna(slug, "in_corso", { passo: "intake" });
  log(slug, "-", "avvio", readClientState(slug).percorso);

  // Intake: nessun gate, i flag _da_verificare restano visibili nell'hub.
  if (readClientState(slug).steps.intake.stato !== "verificato") {
    confermaIntake(slug, { auto: true });
    log(slug, "intake", "auto_conferma");
  }

  const passo = async (p: Passo): Promise<boolean> => {
    if (ctl.stop) {
      ferma(p.key, "fermata dall'operatore");
      return false;
    }
    ctl.passo = p.key;
    const st = readClientState(slug);
    const stato = st.steps[p.key].stato;
    const motivoSalto = p.salta?.(slug);
    if (motivoSalto) {
      log(slug, p.key, "saltato", motivoSalto);
      return true;
    }
    const daRifare = p.rifare ? p.rifare(st, slug) : stato !== "verificato";
    if (!daRifare) {
      log(slug, p.key, "gia_verificato");
      return true;
    }
    if (stato !== "da_verificare" || (p.rifare && p.rifare(st, slug))) {
      segna(slug, "in_corso", { passo: p.key });
      log(slug, p.key, "run");
      const r = await eseguiRunConRiprova(slug, p.key, "generate", label, ctl);
      if (!r.ok) {
        ferma(p.key, r.errore);
        return false;
      }
    } else {
      log(slug, p.key, "da_verificare_esistente");
    }
    const v = p.verdetto?.(slug);
    if (v) {
      ferma(p.key, v);
      return false;
    }
    const c = p.conferma(slug);
    if (!c.ok) {
      ferma(p.key, `conferma rifiutata: ${c.error}`);
      return false;
    }
    log(slug, p.key, "auto_conferma");
    return true;
  };

  for (const k of ["contesto", "palette", "logo", "copy"] as const) if (!(await passo(PASSI[k]))) return;

  // Lavori: alt/didascalie delle foto reali (side-run dello step immagini, non tocca lo stato).
  if (readLavori(slug).some((l) => !l.alt?.trim())) {
    if (ctl.stop) return ferma("lavori", "fermata dall'operatore");
    ctl.passo = "images";
    segna(slug, "in_corso", { passo: "lavori" });
    log(slug, "lavori", "run");
    const r = await eseguiRunConRiprova(slug, "images", "lavori", label, ctl);
    if (!r.ok) return ferma("lavori", r.errore);
  }

  if (!(await passo(PASSI.images))) return;
  if (readClientState(slug).percorso === "completo" && !(await passo(PASSI.legale))) return;
  if (!(await passo(PASSI.build))) return;

  const fine = readClientState(slug);
  if (fine.percorso === "demo") {
    segna(slug, "demo_pronta", { passo: "build", finitaAt: new Date().toISOString() });
    log(slug, "-", "demo_pronta");
    return;
  }
  if (!fine.steps.build.dominio) {
    return ferma("deploy", "imposta il dominio comprato nella scheda Build e premi «Riprendi»");
  }
  ctl.passo = "deploy";
  segna(slug, "in_corso", { passo: "deploy" });
  try {
    const r = await deployClient(slug);
    segna(slug, "completata", { passo: "deploy", finitaAt: new Date().toISOString() });
    log(slug, "deploy", "completata", r.url);
  } catch (e) {
    ferma("deploy", e instanceof Error ? e.message : String(e));
  }
}
