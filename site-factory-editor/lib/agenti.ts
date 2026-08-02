// Identità visiva degli agenti (client-safe, nessun import server).
// La fase emessa dagli step È il nome della skill al lavoro: da lì si deriva
// chi mostrare nella status bar. Gli agenti AI hanno la sfera; i passi
// deterministici (gate, build, assegnazioni) hanno un chip quadrato: la
// distinzione AI/script è deliberata e onesta.

export type AgenteKey =
  | "contesto"
  | "palette"
  | "preset"
  | "copy"
  | "immagini"
  | "logo"
  | "legale"
  | "critico"
  | "script";

export type AgenteInfo = {
  key: AgenteKey;
  /** Nome mostrato (skill/agente al lavoro). */
  nome: string;
  /** false = passo deterministico: chip, non sfera. */
  sfera: boolean;
};

// L'ordine conta: i critici (copy-critic, image-critic, critico visivo)
// vincono su qualunque altra regola.
const REGOLE: Array<[RegExp, AgenteKey, string?]> = [
  [/critic/i, "critico"],
  [/^lente /i, "critico"], // le 3 lenti della catena avversariale legale
  [/context-enricher/i, "contesto", "context-enricher"],
  [/palette-designer/i, "palette", "palette-designer"],
  [/preset-designer/i, "preset", "preset-designer"],
  [/copywriter|correzioni \(round|correzioni formato|correzioni anti-slop/i, "copy", "copywriter"],
  [/image-prompter|rigenerazione scarti|correzioni manifest/i, "immagini", "image-prompter"],
  [/logo/i, "logo", "logo-designer"],
  // Fasi AI dello step legale (foro, generazioni, correzioni): il giurista.
  [/^foro$|informativa|termini|correzioni (del gate )?legale/i, "legale", "giurista"],
];

/** Fallback quando la fase non è ancora nota: identità dallo step. */
const PER_STEP: Record<string, AgenteKey> = {
  contesto: "contesto",
  palette: "palette",
  copy: "copy",
  images: "immagini",
  legale: "legale",
  build: "script",
};

export function agenteDaFase(fase: string | null, step?: string, kind?: "cliente" | "fabbrica"): AgenteInfo {
  if (fase) {
    for (const [re, key, nome] of REGOLE) {
      if (re.test(fase)) return { key, nome: nome ?? fase, sfera: true };
    }
    return { key: "script", nome: fase, sfera: false };
  }
  const key = kind === "fabbrica" ? "preset" : PER_STEP[step ?? ""] ?? "script";
  return { key, nome: key === "script" ? "pipeline" : key, sfera: key !== "script" };
}

/** Rotta della scheda che ospita il run. */
export function percorsoRun(r: { kind: string; slug?: string; step?: string; runId?: string }): string {
  if (r.kind === "fabbrica") return `/fabbrica/run/${r.runId}`;
  const scheda = r.step === "images" ? "immagini" : r.step;
  return `/clienti/${r.slug}/${scheda}`;
}

/** Etichetta italiana dello step per la UI. */
export function nomeStep(r: { kind: string; step?: string }): string {
  if (r.kind === "fabbrica") return "Fabbrica";
  const nomi: Record<string, string> = {
    contesto: "Contesto",
    palette: "Palette",
    copy: "Copy",
    images: "Immagini",
    legale: "Legale",
    build: "Build",
  };
  return nomi[r.step ?? ""] ?? r.step ?? "";
}

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
