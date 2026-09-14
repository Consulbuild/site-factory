// Regole PURE dei servizi «Traffico» per cliente (nessun I/O): stati, transizioni
// ammesse, guard del percorso demo, date dei passaggi. Le usano la route
// app/api/clients/[slug]/traffico, le pagine /traffico e l'hub, la catena e la scheda
// Build (specchio delle fondamenta SEO); i banchi scripts/test-traffico-stato.ts e
// scripts/test-fondamenta.ts le verificano. Import solo di tipo (erasato da
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

/** Sito senza dominio, detto come fatto: nella conferma e nel dettaglio a servizio già acceso. */
export const NOTA_DOMINIO = "Il sito non è ancora pubblicato con il suo dominio: fondamenta tecniche e sensori partiranno solo da quel momento.";

/**
 * Avviso sul dominio nel dettaglio del Sito (null = nessuno). Attivare senza dominio è
 * ammesso: da spento l'avviso accompagna l'invito, da attivo o sospeso l'azione è già
 * fatta e resta solo il fatto (mai «Puoi attivare» accanto al badge «Attivo»).
 */
export function avvisoDominio(servizio: ServizioKey, s: Servizio, percorso: Percorso, senzaDominio: boolean): string | null {
  if (servizio !== "sito" || !senzaDominio || percorso !== "completo") return null;
  return s.stato === "spento"
    ? "Il sito non è ancora pubblicato con il suo dominio. Puoi attivare il servizio, ma fondamenta tecniche e sensori partono solo dopo la pubblicazione col dominio."
    : NOTA_DOMINIO;
}

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
    return { codice: 400, errore: `Il servizio è già ${da}: forse è stato cambiato da un'altra finestra` };
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

/**
 * «Nessun servizio acceso» si può dire solo se nessun cliente è acceso E nessun file è
 * illeggibile: di un client.json fuori schema lo stato vero non si conosce.
 */
export function nessunServizioAcceso(gruppi: GruppoPortafoglio[]): boolean {
  return !gruppi.some((g) => g === "accesi" || g === "non_leggibile");
}

/**
 * Data mostrabile: ISO (almeno aaaa-mm-gg) e interpretabile. Lo schema accetta qualunque
 * stringa (un ritocco a mano non deve rendere corrotto il file): chi formatta la scarta
 * invece di mostrare «Invalid Date» o di leggere «01/09/2026» all'americana.
 */
export function dataValida(iso: string | undefined): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}/.test(iso) && !Number.isNaN(Date.parse(iso));
}

/** Il renderer accende fondamenta e pagine extra: Sito attivo o sospeso (decisione 11, restano online). */
export function fondamentaAccese(t: Traffico): boolean {
  return t.sito.stato !== "spento";
}

/**
 * Perché l'ultima build va rifatta per le fondamenta SEO (null = coincidono): specchio
 * dell'interlock di deployClient per la catena (`buildDaRifare`) e per la scheda Build
 * (`rebuildMotivi`). `attese` = `fondamentaAttese(st, build.dominio)` di lib/fondamenta.ts,
 * calcolata lato server perché quel modulo usa node:fs. Non null esattamente quando il
 * deploy rifiuterebbe (banco: scripts/test-fondamenta.ts). In percorso demo non contano:
 * la demo si pubblica con deployDemo, che non le controlla.
 */
export function motivoRebuildFondamenta(
  percorso: Percorso,
  build: Pick<ClientState["steps"]["build"], "fondamenta">,
  attese: string | null,
): string | null {
  const cotte = build.fondamenta?.dominio ?? null;
  if (percorso === "demo" || cotte === attese) return null;
  if (!cotte) return `build senza le fondamenta SEO (sitemap, robots, dati strutturati), ma il servizio Traffico «Sito» è acceso per ${attese}`;
  if (!attese) return `build con le fondamenta SEO per ${cotte}, ma il servizio Traffico «Sito» è spento o manca il dominio`;
  return `build con le fondamenta SEO per ${cotte}, ma il dominio attuale è ${attese}`;
}

/** Il ciclo del servizio gira solo se attivo. */
export function cicloAttivo(t: Traffico, servizio: ServizioKey): boolean {
  return t[servizio].stato === "attivo";
}

/**
 * Riga delle date del dettaglio; `data` formatta un ISO (la UI passa formatDate).
 * Prima attivazione e ultimo passaggio compaiono solo se la data MOSTRATA è nuova:
 * più passaggi nello stesso giorno sono un fatto solo, non una cronologia.
 */
export function fraseDate(s: Servizio, data: (iso: string) => string): string {
  const f = (iso: string | undefined) => (dataValida(iso) ? data(iso) : "");
  const prima = f(s.primaAttivazioneAt);
  // Una prima attivazione illeggibile c'è stata comunque: «Spento», mai «Mai attivato».
  if (s.stato === "spento") return prima ? `Spento · prima attivazione ${prima}` : s.primaAttivazioneAt ? "Spento" : "Mai attivato";
  const attivo = s.stato === "attivo";
  const dal = f(attivo ? s.attivatoAt : s.sospesoAt);
  const ultimo = f(attivo ? s.sospesoAt : s.attivatoAt);
  const parti = [dal ? `${attivo ? "Attivo" : "Sospeso"} dal ${dal}` : attivo ? "Attivo" : "Sospeso"];
  if (prima && prima !== dal) parti.push(`prima attivazione ${prima}`);
  if (ultimo && ultimo !== dal && ultimo !== prima) parti.push(`${attivo ? "ultima sospensione" : "ultima riattivazione"} ${ultimo}`);
  return parti.join(" · ");
}
