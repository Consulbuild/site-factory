// Campi condivisi tra brief.json (input Copywriter) e intake.json (slot del
// blueprint): il salvataggio dalla GUI è un dual-write che passa SEMPRE da qui.
// ⚠ Accoppiato al form Tally: se cambia la tabella Q in
// site-renderer/scripts/intake-tally.ts va aggiornata anche questa mappa.

export const BRIEF_TO_INTAKE: Record<string, string> = {
  azienda: "meta.businessName",
  settore: "meta.industry",
  citta: "meta.city",
  telefono: "contact.phone",
  email: "contact.email",
  indirizzo: "contact.address",
  social: "contact.social",
  tono_preferito: "brand.tone",
};

// Slot intake editabili che NON hanno un campo brief (whatsapp è separato dal
// telefono: il parser lo inizializza = phone, la GUI lo corregge qui).
export const INTAKE_ONLY = ["contact.whatsapp"] as const;

/** Applica il dual-write: patch degli slot intake dai valori del brief. */
export function syncIntakeFromBrief(
  intake: Record<string, unknown>,
  brief: Record<string, unknown>,
  whatsapp: string,
): Record<string, unknown> {
  const next = { ...intake };
  for (const [briefKey, slot] of Object.entries(BRIEF_TO_INTAKE)) {
    if (briefKey in brief) next[slot] = brief[briefKey];
  }
  next["contact.whatsapp"] = whatsapp;
  return next;
}
