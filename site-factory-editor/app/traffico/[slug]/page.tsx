import Link from "next/link";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import { clientDir } from "@/lib/paths";
import { leggiZoneServite, vistaZone } from "@/lib/zone-servite";
import {
  ETICHETTA_SERVIZIO,
  MOTIVO_DEMO,
  SERVIZI,
  avvisoDominio,
  azioneServizio,
  fraseDate,
  leggiTraffico,
  type Percorso,
  type Servizio,
  type ServizioKey,
} from "@/lib/traffico";
import { Banner, Breadcrumb, btnSecondary, formatDate } from "@/components/ui";
import { ServizioBadge } from "@/components/traffico-ui";
import { TrafficoAzione } from "@/components/traffico-azione";
import { ZoneServite } from "@/components/zone-servite";

export const dynamic = "force-dynamic";

// Dettaglio Traffico di un cliente (DESIGN-BRIEF §Area Traffico): in testa la card
// «Zone servite» (piano T3: serve a entrambi i servizi, visibile anche a servizi spenti
// e in demo, letta senza scritture), poi le due sezioni Sito e Scheda Google impilate,
// ciascuna con stato, date, un'azione con conferma e lo spazio onesto per i pannelli dei
// piani successivi (cosa arriverà, cosa servirà: mai posizioni, clienti in più o tempi).
// L'unica primaria possibile è quella delle zone, quando chiedono l'operatore.
// Il motivo di un blocco (demo, client.json illeggibile) si scrive una volta sola
// in testa e i bottoni disabilitati lo richiamano con aria-describedby.

const MOTIVO_ID = "traffico-motivo-blocco";

const CONTENUTI: Record<ServizioKey, { descrizione: string; disponibile: string[]; arrivera: string[]; servira: string[] }> = {
  sito: {
    descrizione: "Ottimizzazione del sito per le ricerche locali.",
    // Piano T1a: le cuoce la build col dominio quando il servizio è attivo o sospeso.
    disponibile: ["le fondamenta tecniche (sitemap, robots, dati strutturati), aggiunte dalla build col dominio"],
    arrivera: [
      "le pagine per servizio e per zona, da approvare una per una",
      "lo stato dell'indicizzazione su Google e Bing",
      "le correzioni a titoli, descrizioni e link interni",
    ],
    servira: [
      "il sito pubblicato con il suo dominio",
      "le zone servite (qui sopra): tradotte dal form lead, controllate da te solo quando serve",
      "le chiavi di Search Console e Bing in Impostazioni",
    ],
  },
  scheda: {
    descrizione: "L'editor prepara la scheda consigliata; nella scheda Google del cliente la inserisci tu, a mano.",
    disponibile: [],
    arrivera: [
      "la scheda consigliata: categorie, servizi, attributi, descrizione",
      "la checklist di ciò che hai già inserito",
      "il confronto tra la scheda e il sito",
    ],
    servira: [
      "l'accesso come Manager alla scheda Google del cliente, che lo concede dal suo profilo",
      "le zone servite (qui sopra), per l'area servita della scheda",
    ],
  },
};

function SezioneServizio({
  slug,
  azienda,
  servizio,
  s,
  percorso,
  corrotto,
  senzaDominio,
}: {
  slug: string;
  azienda: string;
  servizio: ServizioKey;
  s: Servizio;
  percorso: Percorso;
  corrotto: boolean;
  senzaDominio: boolean;
}) {
  const azione = azioneServizio(s, percorso);
  const bloccato = corrotto || !!azione.motivoBlocco;
  const id = `servizio-${servizio}`;
  const c = CONTENUTI[servizio];
  // Decisione dell'orchestratore: attivare il Sito senza dominio è ammesso, con avviso.
  const avviso = corrotto ? null : avvisoDominio(servizio, s, percorso, senzaDominio);

  return (
    <section aria-labelledby={id} className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id={id} className="font-semibold">
            {ETICHETTA_SERVIZIO[servizio]}
          </h2>
          <ServizioBadge stato={corrotto ? "non_leggibile" : s.stato} />
        </div>
        <TrafficoAzione
          slug={slug}
          azienda={azienda}
          servizio={servizio}
          verso={azione.verso}
          etichetta={azione.etichetta}
          disabilitato={bloccato}
          descrittoDa={bloccato ? MOTIVO_ID : undefined}
          senzaDominio={senzaDominio}
        />
      </div>
      <p className="mt-1 text-sm text-muted">{c.descrizione}</p>
      {/* Con client.json illeggibile le date non si conoscono: nessuna frase, mai «Mai attivato». */}
      {!corrotto && (
        <p role="status" className="mt-2 text-sm text-ink">
          {fraseDate(s, formatDate)}
        </p>
      )}
      {avviso && (
        <div className="mt-3">
          <Banner tone="warn">{avviso}</Banner>
        </div>
      )}
      <div className="mt-4 grid gap-x-8 gap-y-4 border-t border-line pt-4 md:grid-cols-2">
        <div>
          {c.disponibile.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted">Già disponibile</h3>
              <ul className="mt-1.5 mb-4 list-disc space-y-1 pl-4 text-sm text-muted">
                {c.disponibile.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          )}
          <h3 className="text-sm font-semibold text-muted">Cosa comparirà qui</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted">
            {c.arrivera.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          {c.disponibile.length === 0 && <p className="mt-2 text-sm text-faint">Per ora nessuna di queste parti è disponibile.</p>}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted">Cosa servirà</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted">
            {c.servira.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default async function TrafficoClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let bundle;
  try {
    bundle = readClientBundle(slug);
  } catch {
    notFound();
  }
  if (!bundle) notFound();
  const { brief, client, corrotto } = bundle;
  const azienda = String(brief.azienda ?? slug);
  const citta = String(brief.citta ?? "").trim();
  const dominio = client.steps.build.deploy?.dominio ?? null;
  const traffico = leggiTraffico(client);
  const bloccoDemo = !corrotto && SERVIZI.some((k) => azioneServizio(traffico[k], client.percorso).motivoBlocco);
  // Indipendente da client.json: le zone vivono in traffico/zone-servite.json o nel lead.
  const zone = vistaZone(leggiZoneServite(clientDir(slug)));

  return (
    <div>
      <nav className="flex items-center justify-between gap-4">
        <Breadcrumb items={[{ label: "Traffico", href: "/traffico" }, { label: azienda }]} />
        <Link href={`/clienti/${slug}`} className={`${btnSecondary} shrink-0`}>
          Apri il cliente →
        </Link>
      </nav>

      <header className="mt-4">
        <h1 className="text-xl font-semibold">{azienda}</h1>
        {/* Con client.json illeggibile percorso e dominio sarebbero sintetizzati, non veri: non si mostrano. */}
        {corrotto ? (
          citta && <p className="mono mt-1 text-muted">{citta}</p>
        ) : (
          <p className="mono mt-1 text-muted">
            {citta && `${citta} · `}
            {client.percorso === "demo" ? "percorso demo" : "percorso completo"} ·{" "}
            {dominio ? (
              <a href={`https://${dominio}`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
                {dominio} ↗
              </a>
            ) : (
              "senza dominio"
            )}
          </p>
        )}
        {bloccoDemo && (
          <p id={MOTIVO_ID} className="mt-2 text-sm text-ink">
            {MOTIVO_DEMO}.
          </p>
        )}
      </header>

      {corrotto && (
        <div id={MOTIVO_ID} className="mt-4">
          <Banner tone="err" title="client.json non leggibile">
            Il file dello stato di questo cliente non rispetta lo schema e non viene toccato: correggilo a mano in{" "}
            <span className="mono">site-renderer/out/{slug}/client.json</span>, poi ricarica. Fino ad allora i servizi non si
            possono cambiare. Dettaglio: <span className="mono">{corrotto}</span>
          </Banner>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <ZoneServite slug={slug} vista={zone} />
        {SERVIZI.map((k) => (
          <SezioneServizio
            key={k}
            slug={slug}
            azienda={azienda}
            servizio={k}
            s={traffico[k]}
            percorso={client.percorso}
            corrotto={!!corrotto}
            senzaDominio={!dominio}
          />
        ))}
      </div>
    </div>
  );
}
