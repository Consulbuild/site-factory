/**
 * Trasporto verso il backend. Contratto HTTP (identico in dev e in produzione,
 * vedi dev/inbox.mjs e docs/ricerca-storage-foto-lead-2026-09.md §3):
 *   PATCH {base}/lead/{id}          JSON (autosalvataggio, best effort)
 *   POST  {base}/lead/{id}/file     multipart {kind, index, file}
 *   POST  {base}/lead/{id}          JSON lead completo
 * `base` = PUBLIC_INTAKE_URL alla build (prod: webhook n8n), altrimenti "/api" (dev).
 */
const BASE = (import.meta.env.PUBLIC_INTAKE_URL ?? "/api").replace(/\/$/, "");

export class ErroreTrasporto extends Error {
  constructor(
    messaggio: string,
    public readonly status: number,
    public readonly ripetibile: boolean,
  ) {
    super(messaggio);
  }
}

/** Autosalvataggio: non blocca mai, non lancia mai. */
export function salvaBozza(leadId: string, corpo: unknown): void {
  try {
    void fetch(`${BASE}/lead/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* offline: riprova al prossimo passo */
  }
}

/** Invio finale: lancia ErroreTrasporto se il server non risponde 2xx. */
export async function invia(leadId: string, lead: unknown): Promise<void> {
  let r: Response;
  try {
    r = await fetch(`${BASE}/lead/${leadId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
    });
  } catch {
    throw new ErroreTrasporto("rete assente", 0, true);
  }
  if (!r.ok) throw new ErroreTrasporto(`risposta ${r.status}`, r.status, r.status >= 500);
}

export interface OpzioniCarica {
  leadId: string;
  kind: "foto" | "logo";
  index: number;
  file: File;
  onProgresso?: (frazione: number) => void;
  segnale?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Caricamento di UN file con progresso reale (XMLHttpRequest.upload.onprogress è
 * l'unico affidabile su tutti i browser). Un file = una richiesta ripetibile.
 */
export function caricaFile(o: OpzioniCarica): Promise<void> {
  return new Promise((risolvi, rifiuta) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/lead/${o.leadId}/file`);
    xhr.timeout = o.timeoutMs ?? 120_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) o.onProgresso?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) risolvi();
      else rifiuta(new ErroreTrasporto(`risposta ${xhr.status}`, xhr.status, xhr.status >= 500 || xhr.status === 429));
    };
    xhr.onerror = () => rifiuta(new ErroreTrasporto("rete assente", 0, true));
    xhr.ontimeout = () => rifiuta(new ErroreTrasporto("tempo scaduto", 0, true));
    xhr.onabort = () => rifiuta(new ErroreTrasporto("annullato", 0, false));
    o.segnale?.addEventListener("abort", () => xhr.abort(), { once: true });
    const form = new FormData();
    form.set("kind", o.kind);
    form.set("index", String(o.index));
    form.set("file", o.file, o.file.name);
    xhr.send(form);
  });
}
