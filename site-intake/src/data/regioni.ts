/**
 * Le 20 regioni (nomi ISTAT, gli stessi di public/data/province.json) con le regioni
 * confinanti via terra: servono ai riquadri «X e regioni vicine» della domanda sulle
 * zone e alla ricerca di una regione per nome. Sicilia e Sardegna non confinano con
 * nessuno: per loro il riquadro non si propone.
 */
export const CONFINI: Record<string, readonly string[]> = {
  "Valle d'Aosta/Vallée d'Aoste": ["Piemonte"],
  Piemonte: ["Valle d'Aosta/Vallée d'Aoste", "Lombardia", "Liguria", "Emilia-Romagna"],
  Liguria: ["Piemonte", "Emilia-Romagna", "Toscana"],
  Lombardia: ["Piemonte", "Emilia-Romagna", "Veneto", "Trentino-Alto Adige/Südtirol"],
  "Trentino-Alto Adige/Südtirol": ["Lombardia", "Veneto"],
  Veneto: ["Trentino-Alto Adige/Südtirol", "Lombardia", "Emilia-Romagna", "Friuli-Venezia Giulia"],
  "Friuli-Venezia Giulia": ["Veneto"],
  "Emilia-Romagna": ["Piemonte", "Lombardia", "Veneto", "Liguria", "Toscana", "Marche"],
  Toscana: ["Liguria", "Emilia-Romagna", "Marche", "Umbria", "Lazio"],
  Marche: ["Emilia-Romagna", "Toscana", "Umbria", "Lazio", "Abruzzo"],
  Umbria: ["Toscana", "Marche", "Lazio"],
  Lazio: ["Toscana", "Umbria", "Marche", "Abruzzo", "Molise", "Campania"],
  Abruzzo: ["Marche", "Lazio", "Molise"],
  Molise: ["Abruzzo", "Lazio", "Campania", "Puglia"],
  Campania: ["Lazio", "Molise", "Puglia", "Basilicata"],
  Puglia: ["Molise", "Campania", "Basilicata"],
  Basilicata: ["Campania", "Puglia", "Calabria"],
  Calabria: ["Basilicata"],
  Sicilia: [],
  Sardegna: [],
};

export const REGIONI: readonly string[] = Object.keys(CONFINI);

/** Il nome come lo dice la gente: «Trentino-Alto Adige/Südtirol» → «Trentino-Alto Adige». */
export const nomeBreveRegione = (r: string): string => r.split("/")[0] ?? r;

export const regioniVicine = (r: string): readonly string[] => CONFINI[r] ?? [];

/** Le due etichette-zona di una regione: tutta, e con le vicine (solo se ne ha). */
export function zoneDellaRegione(r: string): string[] {
  const breve = nomeBreveRegione(r);
  return [`Tutta la regione ${breve}`, ...(regioniVicine(r).length ? [`${breve} e regioni vicine`] : [])];
}
