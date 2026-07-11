import Link from "next/link";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { STEPS } from "@/lib/steps";
import { staleFiles } from "@/lib/staleness";
import { readDesign } from "@/lib/assign-design";
import { listPresets } from "@/lib/factory/state";
import { PaletteRunner } from "@/components/palette-runner";
import { PaletteEditor, type ContestoRef } from "@/components/palette-editor";
import { AssegnazionePanel, type AssegnazioneView } from "@/components/assegnazione-panel";

export const dynamic = "force-dynamic";

export default async function PalettePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();

  const businessName = String(bundle.brief.azienda ?? slug);
  const contestoOk = bundle.client.steps.contesto.stato === "verificato";
  const stato = bundle.client.steps.palette.stato;

  // M8: assegnazione design (deterministica) + override umano
  const design = readDesign(slug);
  const vista: AssegnazioneView | null = design
    ? {
        preset: design.preset,
        motivo: design.motivo,
        alternativeScartate: design.alternativeScartate,
        hueBucketEvitare: design.vincoliPalette.hueBucketEvitare,
        aakerFonte: design.aakerCliente.fonte,
      }
    : null;
  const presetsAttivi = listPresets()
    .filter((p) => p.stato === "attivo")
    .map((p) => p.id);
  const pannello = (
    <div className="mt-6">
      <AssegnazionePanel slug={slug} design={vista} presetsAttivi={presetsAttivi} paletteEsistente={!!bundle.palette} />
    </div>
  );

  // Con la palette su disco → editor (guardia navigazione propria).
  if (bundle.palette) {
    const contestoRef: ContestoRef | null = bundle.contesto
      ? {
          settore: bundle.contesto.settore_normalizzato,
          registro: bundle.contesto.tono.registro,
          colori: bundle.contesto.materiali.colori,
        }
      : null;
    const stale =
      staleFiles(slug, STEPS.palette.upstream, bundle.client.steps.palette.upstream).length > 0;
    return (
      <div>
        <PaletteEditor
          slug={slug}
          businessName={businessName}
          initial={bundle.palette}
          contestoRef={contestoRef}
          stale={stale}
          verificato={stato === "verificato"}
        />
        {pannello}
      </div>
    );
  }

  // In assenza di palette → runner (nessuna modifica non salvata, nav semplice).
  return (
    <div>
      <nav className="flex items-center justify-between gap-4 text-sm text-muted">
        <span className="truncate">
          <Link href="/" className="hover:text-ink">
            Clienti
          </Link>{" "}
          /{" "}
          <Link href={`/clienti/${slug}`} className="hover:text-ink">
            {businessName}
          </Link>{" "}
          / <span className="text-ink">Palette</span>
        </span>
        <Link
          href={`/clienti/${slug}`}
          className="shrink-0 rounded-md border border-line bg-surface px-3.5 py-1.5 font-medium text-ink transition-colors duration-150 hover:border-line2 hover:bg-raise"
        >
          ← Torna al cliente
        </Link>
      </nav>
      <h1 className="mt-4 text-xl font-semibold">Palette e preset</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Il palette-designer sceglie il preset estetico e i colori di marca (primary + accent) dal contesto curato —
        settore, tono, colori indicati dal cliente — col gate di contrasto WCAG AA. Poi li rivedi qui, applicati a
        un&apos;anteprima.
      </p>
      <PaletteRunner
        slug={slug}
        contestoOk={contestoOk}
        errore={stato === "errore" ? bundle.client.steps.palette.errore : undefined}
      />
      {pannello}
    </div>
  );
}
