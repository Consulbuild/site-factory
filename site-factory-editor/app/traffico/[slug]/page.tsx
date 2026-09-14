import Link from "next/link";
import { notFound } from "next/navigation";
import { readClientBundle } from "@/lib/clients";
import {
  ETICHETTA_SERVIZIO,
  MOTIVO_DEMO,
  SERVIZI,
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

export const dynamic = "force-dynamic";

// Dettaglio Traffico di un cliente (DESIGN-BRIEF §Area Traffico): le due sezioni
// Sito e Scheda Google impilate, ciascuna con stato, date, un'azione con conferma
// e lo spazio onesto per i pannelli dei piani successivi (cosa arriverà, cosa
// servirà: mai posizioni, clienti in più o tempi). Nessuna primaria in T0.
// Il motivo di un blocco (demo, client.json illeggibile) si scrive una volta sola
// in testa e i bottoni disabilitati lo richiamano con aria-describedby.

const MOTIVO_ID = "traffico-motivo-blocco";

const CONTENUTI: Record<ServizioKey, { descrizione: string; arrivera: string[]; servira: string[] }> = {
  sito: {
    descrizione: "Ottimizzazione del sito per le ricerche locali.",
    arrivera: [
      "le fondamenta tecniche: sitemap, robots, dati strutturati",
      "le pagine per servizio e per zona, da approvare una per una",
      "lo stato dell'indicizzazione su Google e Bing",
      "le correzioni a titoli, descrizioni e link interni",
    ],
    servira: [
      "il sito pubblicato con il suo dominio",
      "i dati per farsi trovare (comuni serviti, prezzi indicativi, orari), chiesti al cliente con un breve modulo",
      "le chiavi di Search Console e Bing in Impostazioni",
    ],
  },
  scheda: {
    descrizione: "L'editor prepara la scheda consigliata; nella scheda Google del cliente la inserisci tu, a mano.",
    arrivera: [
      "la scheda consigliata: categorie, servizi, attributi, descrizione",
      "la checklist di ciò che hai già inserito",
      "il confronto tra la scheda e il sito",
    ],
    servira: ["l'accesso come Manager alla scheda Google del cliente, che lo concede dal suo profilo"],
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
  const avvisoDominio = servizio === "sito" && senzaDominio && percorso === "completo" && !corrotto;

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
      {avvisoDominio && (
        <div className="mt-3">
          <Banner tone="warn">
            Il sito non è ancora pubblicato con il suo dominio. Puoi attivare il servizio, ma fondamenta tecniche e sensori
            partono solo dopo la pubblicazione col dominio.
          </Banner>
        </div>
      )}
      <div className="mt-4 grid gap-x-8 gap-y-4 border-t border-line pt-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-muted">Cosa comparirà qui</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted">
            {c.arrivera.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-faint">Per ora nessuna di queste parti è disponibile.</p>
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
