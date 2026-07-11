import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { readRun } from "@/lib/factory/state";
import { runDir } from "@/lib/factory/paths";
import { AuditEditor } from "@/components/fabbrica/audit-editor";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

// Audit pairwise (M7): il checkpoint umano finale — gusto in uscita e prova
// di titolarità. Il "contro" è il preset più vicino secondo il tokenDiff del
// gate novelty (il confronto più severo possibile).
export default async function AuditPage(ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  let run;
  try {
    run = readRun(runId);
  } catch {
    notFound();
  }
  if (!run) notFound();
  if (run.stato !== "da_audire" && run.stato !== "pubblicata" && run.stato !== "scartata") notFound();

  const dir = runDir(runId);
  const leggi = (f: string) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch {
      return null;
    }
  };
  const novelty = leggi("gates/novelty.json");
  const motivazioni = leggi("motivazioni.json");
  const candidato = leggi("candidate.tokens.json");
  if (!novelty || !candidato) notFound();

  // preset più vicino per tokenDiff = il confronto pairwise più severo
  const perPreset: Array<{ id: string; tokenDiff: number }> = novelty.vsLibreria?.perPreset ?? [];
  const contro = [...perPreset].sort((a, b) => a.tokenDiff - b.tokenDiff)[0]?.id ?? "meridian";

  const pos = motivazioni?.posizionamento ?? {};
  const fam = (k: string) => candidato[k]?.$value ?? "";
  const prefill = {
    id: "",
    aaker: { sincerity: 0, excitement: 0, competence: 0, sophistication: 0, ruggedness: 0, primaria: "competence", ...(pos.aaker ?? {}) },
    settori: (pos.settoriConsigliati ?? []).join(", "),
    antiPatterns: "",
    nome: "",
    estetica: pos.corsia ?? "",
    per: "",
    fontLabel: [fam("brand-font-heading"), fam("brand-font-body")].filter(Boolean).join(" + "),
    serifHeading: false,
    serifBody: false,
    photographySpec: {},
  };

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit pairwise</h1>
          <p className="mono mt-1 text-sm text-muted">
            {run.runId} · contro <strong>{contro}</strong> (il più vicino per tokenDiff) · stesso golden content
          </p>
        </div>
        <div className="flex items-center gap-3">
          {run.stato !== "da_audire" && <Badge tone={run.stato === "pubblicata" ? "ok" : "idle"}>{run.stato}</Badge>}
          <Link href={`/fabbrica/run/${runId}`} className="whitespace-nowrap text-sm text-muted hover:text-ink">
            ← Run
          </Link>
        </div>
      </div>

      {pos.corsia && (
        <p className="card px-4 py-3 text-sm text-muted">
          <strong className="text-ink">Corsia dichiarata dal designer:</strong> {pos.corsia}
          {pos.percheNuovo ? ` — ${pos.percheNuovo}` : ""}
        </p>
      )}

      <AuditEditor runId={runId} stato={run.stato} contro={contro} controVersion="1.0.0" prefill={prefill} />
    </div>
  );
}
