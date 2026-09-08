import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readClientBundle, listClients } from "@/lib/clients";
import { clientDir } from "@/lib/paths";
import { STEPS, motivoGate, type StepKey } from "@/lib/steps";
import { staleFiles } from "@/lib/staleness";
import { leggiStatoCliente } from "@/lib/portafoglio";
import { catenaViva, posizioneInCoda } from "@/lib/catena";
import { etichettaDemo, DEMO_ZONA } from "@/lib/deploy";
import { Badge, StepBadge, formatDate, btnPrimary, btnSecondary, Breadcrumb } from "@/components/ui";
import { ClienteAzioni } from "@/components/cliente-azioni";
import { ClienteStato } from "@/components/cliente-stato";
import { StepRunLive } from "@/components/step-run-live";
import { CatenaCard } from "@/components/catena-card";
import { LogoVarianti, type VarianteLogo } from "@/components/logo-varianti";

export const dynamic = "force-dynamic";

// Cabina del cliente (DESIGN-REFACTOR §5.2 + DESIGN-BRIEF §Modalità demo):
// card «Catena» in testa (in percorso demo possiede l'unica azione primaria),
// poi la sequenza a 8 step con stato, fase live e gate derivati dal registry
// (motivoGate: stessa fonte della route run). In percorso completo, a catena
// ferma o finita, torna il «prossimo passo» primario di sempre.

type Riga = {
  key: StepKey | "intake";
  nome: string;
  href: string;
  stato: string;
  errore?: string;
  ultimaRun?: { durataMs: number; quando: string; esito: string };
  stale?: boolean;
  fail?: boolean;
  auto?: boolean;
  abilitato: boolean;
  motivoGate?: string;
  /** Riga informativa senza azione (es. logo fornito dal cliente). */
  nota?: string;
  labelGenera: string;
  labelApri: string;
};

type LogoTrace = { scelta?: string; varianti?: VarianteLogo[] };
function leggiLogoTrace(slug: string): LogoTrace | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(clientDir(slug), "logo-trace.json"), "utf8"));
  } catch {
    return null;
  }
}

export default async function ClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();
  const { brief, client, intake, contesto } = bundle;
  const flags = brief._da_verificare?.length ?? 0;
  const azienda = String(brief.azienda ?? slug);
  const deployUrl = client.steps.build.deploy?.url;
  // Dashboard: abbonamento, monitor, lead e visite del cliente (cache condivisa con la home).
  const dominio = client.steps.build.deploy?.dominio ?? null;
  const stato = await leggiStatoCliente(
    { slug, email: String(brief.email ?? ""), steps: client.steps },
    listClients(),
    client.steps.build.umamiWebsiteId,
  );

  const stale = (k: StepKey) =>
    client.steps[k].stato !== "assente" &&
    staleFiles(slug, STEPS[k].upstream, (client.steps[k] as { upstream?: Record<string, string> }).upstream).length > 0;
  const gate = (k: StepKey) => motivoGate(slug, k) ?? undefined;
  const logoFornito = !!intake["brand.logo"] || contesto?.materiali.logo !== false;
  const logoTrace = leggiLogoTrace(slug);

  const righe: Riga[] = [
    {
      key: "intake",
      nome: "Intake",
      href: `/clienti/${slug}/intake`,
      stato: client.steps.intake.stato,
      auto: client.steps.intake.autoConferma,
      abilitato: true,
      labelGenera: "Rivedi dati",
      labelApri: "Rivedi dati",
    },
    {
      key: "contesto",
      nome: "Contesto",
      href: `/clienti/${slug}/contesto`,
      stato: client.steps.contesto.stato,
      errore: client.steps.contesto.errore,
      ultimaRun: client.steps.contesto.ultimaRun,
      auto: client.steps.contesto.autoConferma,
      abilitato: !gate("contesto"),
      motivoGate: gate("contesto"),
      labelGenera: "Genera contesto",
      labelApri: "Apri contesto",
    },
    {
      key: "palette",
      nome: "Palette",
      href: `/clienti/${slug}/palette`,
      stato: client.steps.palette.stato,
      errore: client.steps.palette.errore,
      ultimaRun: client.steps.palette.ultimaRun,
      stale: stale("palette"),
      auto: client.steps.palette.autoConferma,
      abilitato: !gate("palette"),
      motivoGate: gate("palette"),
      labelGenera: "Genera palette",
      labelApri: "Apri palette",
    },
    {
      key: "logo",
      nome: "Logo",
      href: `/clienti/${slug}`,
      stato: logoFornito ? "verificato" : client.steps.logo.stato,
      errore: client.steps.logo.errore,
      ultimaRun: client.steps.logo.ultimaRun,
      stale: !logoFornito && stale("logo"),
      auto: client.steps.logo.autoConferma,
      abilitato: !logoFornito && !gate("logo"),
      motivoGate: gate("logo"),
      nota: logoFornito ? "fornito dal cliente" : undefined,
      labelGenera: "Genera simbolo",
      labelApri: "Varianti",
    },
    {
      key: "copy",
      nome: "Copy",
      href: `/clienti/${slug}/copy`,
      stato: client.steps.copy.stato,
      errore: client.steps.copy.errore,
      ultimaRun: client.steps.copy.ultimaRun,
      stale: stale("copy"),
      fail: client.steps.copy.stato !== "assente" && bundle.copyReview?.verdict === "FAIL",
      auto: client.steps.copy.autoConferma,
      abilitato: !gate("copy"),
      motivoGate: gate("copy"),
      labelGenera: "Genera copy",
      labelApri: "Apri copy",
    },
    {
      key: "images",
      nome: "Immagini",
      href: `/clienti/${slug}/immagini`,
      stato: client.steps.images.stato,
      errore: client.steps.images.errore,
      ultimaRun: client.steps.images.ultimaRun,
      stale: stale("images"),
      fail: client.steps.images.stato !== "assente" && bundle.imageReview?.verdict === "FAIL",
      auto: client.steps.images.autoConferma,
      abilitato: !gate("images"),
      motivoGate: gate("images"),
      labelGenera: "Genera immagini",
      labelApri: "Apri immagini",
    },
    {
      key: "legale",
      nome: "Legale",
      href: `/clienti/${slug}/legale`,
      stato: client.steps.legale.stato,
      errore: client.steps.legale.errore,
      ultimaRun: client.steps.legale.ultimaRun,
      stale: stale("legale"),
      fail: client.steps.legale.stato !== "assente" && bundle.legaleReview?.verdict === "FAIL",
      auto: client.steps.legale.autoConferma,
      abilitato: !gate("legale"),
      motivoGate: gate("legale"),
      labelGenera: "Genera documenti legali",
      labelApri: "Apri legale",
    },
    {
      key: "build",
      nome: "Build & Pubblica",
      href: `/clienti/${slug}/build`,
      stato: client.steps.build.stato,
      errore: client.steps.build.errore,
      stale: stale("build"),
      auto: client.steps.build.autoConferma,
      abilitato: !gate("build"),
      motivoGate: gate("build"),
      labelGenera: "Builda il sito",
      labelApri: "Apri build",
    },
  ];

  // La catena possiede la primaria in percorso demo, o mentre corre; altrimenti
  // il prossimo passo (primo step abilitato non ancora verificato) come sempre.
  const viva = catenaViva(slug);
  const catenaAttiva = viva || (!!client.catena && ["in_coda", "in_corso", "attesa_limite"].includes(client.catena.stato));
  const primariaCatena = client.percorso === "demo" || catenaAttiva;
  const prossimo = primariaCatena ? null : (righe.find((r) => r.abilitato && r.stato !== "verificato" && !r.nota)?.key ?? null);
  // Il legale è parte del percorso completo: in demo la riga resta ma non è nel cammino.
  const mostraCard = client.percorso === "demo" || !!client.catena || !!client.demo || client.steps.build.stato !== "verificato";
  const hostPrevisto = client.demo?.host ?? `${etichettaDemo(brief.dominio_scelto, slug)}.${DEMO_ZONA}`;

  return (
    <div>
      <nav className="flex items-center justify-between gap-4">
        <Breadcrumb items={[{ label: "Clienti", href: "/" }, { label: azienda }]} />
        <Link href="/" className={`${btnSecondary} shrink-0`}>
          ← Tutti i clienti
        </Link>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{azienda}</h1>
          <p className="mono mt-1 text-muted">
            {String(brief.citta ?? "")} · {client.percorso === "demo" ? "percorso demo" : "percorso completo"} · richiesta{" "}
            {client.submissionId} · importato {formatDate(client.importedAt)}
          </p>
        </div>
        <ClienteAzioni
          slug={slug}
          businessName={azienda}
          telefono={brief.telefono ? String(brief.telefono) : undefined}
          email={brief.email ? String(brief.email) : undefined}
          deployUrl={deployUrl}
          sitoGiu={stato.sito?.su === false}
        />
      </header>

      {mostraCard && (
        <CatenaCard
          slug={slug}
          azienda={azienda}
          referente={brief.referente ? String(brief.referente) : undefined}
          telefono={brief.telefono ? String(brief.telefono) : undefined}
          percorso={client.percorso}
          catena={client.catena}
          demo={client.demo}
          build={{
            stato: client.steps.build.stato,
            partial: client.steps.build.partial,
            noindex: client.steps.build.noindex,
            builtAt: client.steps.build.builtAt,
            dominio: client.steps.build.dominio,
            deployUrl,
          }}
          viva={viva}
          posizione={posizioneInCoda(slug)}
          hostPrevisto={hostPrevisto}
          primaria={primariaCatena}
        />
      )}

      <ClienteStato
        stato={stato}
        dominio={dominio}
        demo={
          client.demo && !client.demo.spentaAt
            ? { url: client.demo.url, dal: client.demo.pubblicataAt }
            : deployUrl && !dominio
              ? { url: deployUrl, dal: client.steps.build.deploy?.deployedAt ?? client.updatedAt }
              : null
        }
        umamiWebsiteId={client.steps.build.umamiWebsiteId}
      />

      <ol className="card mt-8 divide-y divide-line">
        {righe.map((r, i) => {
          const primario = r.key === prossimo;
          const label = r.stato === "assente" ? r.labelGenera : r.labelApri;
          const varianti = r.key === "logo" && !logoFornito && logoTrace?.varianti?.length ? logoTrace : null;
          return (
            <li key={r.key} className="px-4 py-3.5">
              <div className="flex items-center gap-4">
                <span className="mono w-5 text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.nome}</span>
                  {r.key !== "intake" && (
                    <span className="ml-3 inline-flex">
                      <StepRunLive slug={slug} step={r.key} />
                    </span>
                  )}
                </span>
                {r.key === "build" && deployUrl && (
                  <a href={deployUrl} target="_blank" rel="noreferrer">
                    <Badge tone="ok">● online</Badge>
                  </a>
                )}
                {r.key === "build" && client.demo && !client.demo.spentaAt && (
                  <a href={client.demo.url} target="_blank" rel="noreferrer">
                    <Badge tone="ok">● demo online</Badge>
                  </a>
                )}
                {r.stale && <Badge tone="warn">⚠ cambiato a monte</Badge>}
                {r.fail && <Badge tone="err">critico: FAIL</Badge>}
                {r.key === "build" && client.steps.build.partial && <Badge tone="warn">parziale</Badge>}
                {r.key === "build" && client.steps.build.noindex && <Badge tone="idle">noindex</Badge>}
                {r.nota ? (
                  <Badge tone="idle">{r.nota}</Badge>
                ) : (
                  <StepBadge
                    stato={r.stato}
                    extra={r.key === "intake" && flags > 0 ? `${flags} flag` : r.auto && r.stato === "verificato" ? "auto" : undefined}
                  />
                )}
                {r.ultimaRun && r.stato !== "in_corso" && (
                  <span
                    className="mono hidden text-xs text-faint lg:inline"
                    title={`Ultima run: ${r.ultimaRun.esito} · ${formatDate(r.ultimaRun.quando)}`}
                  >
                    {Math.max(1, Math.round(r.ultimaRun.durataMs / 60000))} min
                  </span>
                )}
                {r.nota || varianti ? null : r.abilitato ? (
                  <Link href={r.href} className={primario ? btnPrimary : btnSecondary}>
                    {label} →
                  </Link>
                ) : (
                  <span
                    className="cursor-not-allowed rounded-full border border-line px-4 py-1.5 text-sm text-faint"
                    title={r.motivoGate}
                  >
                    {r.labelGenera}
                  </span>
                )}
              </div>
              {r.stato === "errore" && r.errore && (
                <p className="mt-1.5 truncate pl-9 text-sm text-err" title={r.errore}>
                  {r.errore}
                </p>
              )}
              {varianti && (
                <div className="mt-2 pl-9">
                  <LogoVarianti slug={slug} scelta={varianti.scelta ?? ""} varianti={varianti.varianti ?? []} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
