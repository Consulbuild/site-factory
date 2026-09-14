// Regole PURE dei servizi «Traffico» per cliente (nessun I/O): stati, transizioni
// ammesse, guard del percorso demo, date dei passaggi. Le usano la route
// app/api/clients/[slug]/traffico, le pagine /traffico e l'hub; il banco
// scripts/test-traffico-stato.ts le verifica. Import solo di tipo (erasato da
// strip-types): il modulo gira anche nel banco. Decisioni: docs/traffico/README.md.
import type { ClientState } from "./schemas";

export type Traffico = NonNullable<ClientState["traffico"]>;
export type ServizioKey = keyof Traffico;
export type Servizio = Traffico[ServizioKey];
export type StatoServizio = Servizio["stato"];
export type Percorso = ClientState["percorso"];
export type Rifiuto = { codice: 400 | 409; errore: string };
export type GruppoPortafoglio = "non_leggibile" | "accesi" | "spenti" | "demo";

export const SERVIZI = ["sito", "scheda"] as const satisfies readonly ServizioKey[];

export const ETICHETTA_SERVIZIO: Record<ServizioKey, string> = { sito: "Sito", scheda: "Scheda Google" };

/** Unica transizione ammessa da ogni stato: spento→attivo, attivo→sospeso, sospeso→attivo. */
const AMMESSA = { spento: "attivo", attivo: "sospeso", sospeso: "attivo" } as const satisfies Record<StatoServizio, StatoServizio>;
const AZIONE = { spento: "Attiva", attivo: "Sospendi", sospeso: "Riattiva" } as const satisfies Record<StatoServizio, string>;
const VERBO = { spento: "attivare", attivo: "sospendere", sospeso: "riattivare" } as const satisfies Record<StatoServizio, string>;

/** Stessa frase per la route (409) e per il bottone disabilitato del dettaglio. */
export const MOTIVO_DEMO = "In percorso demo i servizi Traffico non si attivano: segna prima «Il cliente si è abbonato» nell'hub del cliente";

/** Stato con i default (file senza campo = entrambi spenti). Oggetti nuovi a ogni chiamata: mutarli non tocca l'input. */
export function leggiTraffico(state: { traffico?: ClientState["traffico"] }): Traffico {
  return {
    sito: { ...(state.traffico?.sito ?? { stato: "spento" }) },
    scheda: { ...(state.traffico?.scheda ?? { stato: "spento" }) },
  };
}

/** null = ammessa. Prima la validità della transizione (400), poi il guard demo sull'attivazione (409). */
export function motivoRifiuto(da: StatoServizio, verso: StatoServizio, percorso: Percorso): Rifiuto | null {
  if (da === verso) {
    return { codice: 400, errore: `Il servizio è già ${da}: forse è stato cambiato da un'altra finestra, ricarica la pagina` };
  }
  if (AMMESSA[da] !== verso) {
    return { codice: 400, errore: `Transizione non ammessa da ${da} a ${verso}: da ${da} si può solo ${VERBO[da]}` };
  }
  if (verso === "attivo" && percorso === "demo") return { codice: 409, errore: MOTIVO_DEMO };
  return null;
}

/**
 * Applica il passaggio con la data `adesso` (ISO). Non muta l'input; l'altro servizio
 * resta identico. Date: `primaAttivazioneAt` nasce alla prima attivazione e non cambia
 * più; `attivatoAt` e `sospesoAt` sono l'ultimo passaggio ad attivo e a sospeso.
 */
export function transizione(
  t: Traffico,
  servizio: ServizioKey,
  verso: StatoServizio,
  percorso: Percorso,
  adesso: string,
): { ok: true; traffico: Traffico } | ({ ok: false } & Rifiuto) {
  const prima = t[servizio];
  const rifiuto = motivoRifiuto(prima.stato, verso, percorso);
  if (rifiuto) return { ok: false, ...rifiuto };

  const dopo: Servizio = { stato: verso };
  // Un campo ritoccato a mano senza prima attivazione: la più vecchia data nota, mai inventata in sospensione.
  const primaAttivazioneAt = prima.primaAttivazioneAt ?? prima.attivatoAt ?? (verso === "attivo" ? adesso : undefined);
  const attivatoAt = verso === "attivo" ? adesso : prima.attivatoAt;
  const sospesoAt = verso === "sospeso" ? adesso : prima.sospesoAt;
  if (primaAttivazioneAt) dopo.primaAttivazioneAt = primaAttivazioneAt;
  if (attivatoAt) dopo.attivatoAt = attivatoAt;
  if (sospesoAt) dopo.sospesoAt = sospesoAt;

  const traffico: Traffico = { sito: { ...t.sito }, scheda: { ...t.scheda } };
  traffico[servizio] = dopo;
  return { ok: true, traffico };
}

/** Azione del dettaglio (Attiva / Sospendi / Riattiva) col motivo del blocco, stessa frase della route. */
export function azioneServizio(
  s: Servizio,
  percorso: Percorso,
): { verso: "attivo" | "sospeso"; etichetta: "Attiva" | "Sospendi" | "Riattiva"; motivoBlocco: string | null } {
  const verso = AMMESSA[s.stato];
  return { verso, etichetta: AZIONE[s.stato], motivoBlocco: motivoRifiuto(s.stato, verso, percorso)?.errore ?? null };
}

/** Gruppo del portafoglio: un file illeggibile non mostra mai «spento». */
export function gruppoPortafoglio(c: { percorso: Percorso; traffico?: ClientState["traffico"] }, corrotto: boolean): GruppoPortafoglio {
  if (corrotto) return "non_leggibile";
  const t = leggiTraffico(c);
  if (SERVIZI.some((k) => t[k].stato !== "spento")) return "accesi";
  return c.percorso === "demo" ? "demo" : "spenti";
}

/** Il renderer accende fondamenta e pagine extra: Sito attivo o sospeso (decisione 11, restano online). */
export function fondamentaAccese(t: Traffico): boolean {
  return t.sito.stato !== "spento";
}

/** Il ciclo del servizio gira solo se attivo. */
export function cicloAttivo(t: Traffico, servizio: ServizioKey): boolean {
  return t[servizio].stato === "attivo";
}

/** Riga delle date del dettaglio; `data` formatta un ISO (la UI passa formatDate). */
export function fraseDate(s: Servizio, data: (iso: string) => string): string {
  const prima = s.primaAttivazioneAt;
  if (s.stato === "spento") return prima ? `Spento · prima attivazione ${data(prima)}` : "Mai attivato";
  if (s.stato === "attivo") {
    return [
      s.attivatoAt ? `Attivo dal ${data(s.attivatoAt)}` : "Attivo",
      prima && prima !== s.attivatoAt ? `prima attivazione ${data(prima)}` : "",
      s.sospesoAt ? `ultima sospensione ${data(s.sospesoAt)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [
    s.sospesoAt ? `Sospeso dal ${data(s.sospesoAt)}` : "Sospeso",
    prima ? `prima attivazione ${data(prima)}` : "",
    s.attivatoAt && s.attivatoAt !== prima ? `ultima riattivazione ${data(s.attivatoAt)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
