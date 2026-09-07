/**
 * Trasporto verso il backend. Contratto HTTP (identico in dev e in produzione,
 * vedi dev/inbox.mjs e docs/vps-integrazioni-setup.md § sf-bozza):
 *   PATCH {base}/lead?id={id}        JSON (autosalvataggio, best effort)
 *   POST  {base}/lead/file?id={id}   multipart {kind, index, file}
 *   POST  {base}/lead?id={id}        JSON lead completo
 * `base` = PUBLIC_INTAKE_URL alla build (prod: https://n8n.consulbuild.com/webhook/bozza),
 * altrimenti "/api" (dev). L'id sta nella query e non nel percorso perché n8n, con un
 * parametro `:id` nel path, antepone all'URL l'id interno del nodo.
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

/**
 * Porta d'ingresso: finché il backend non ha risposto 2xx una prima volta, le
 * richieste partono una alla volta. Sul server la cartella del lead nasce alla prima
 * richiesta; due richieste parallele su un lead ancora senza cartella la creerebbero
 * due volte. Dopo la prima risposta buona la porta resta aperta per sempre.
 */
let aperta = false;
let inCorso: Promise<unknown> | null = null;
function attraversa<T>(esegui: () => Promise<T>): Promise<T> {
  if (aperta) return esegui();
  const precedente = inCorso ?? Promise.resolve();
  const mia = precedente.then(
    () => (aperta ? esegui() : esegui().then((v) => ((aperta = true), v))),
  );
  inCorso = mia.catch(() => {});
  return mia;
}

const url = (leadId: string, file = false) => `${BASE}/lead${file ? "/file" : ""}?id=${encodeURIComponent(leadId)}`;

/** Autosalvataggio: non blocca mai, non lancia mai. */
export function salvaBozza(leadId: string, corpo: unknown): void {
  void attraversa(async () => {
    const r = await fetch(url(leadId), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
      keepalive: true,
    });
    if (!r.ok) throw new ErroreTrasporto(`risposta ${r.status}`, r.status, r.status >= 500);
  }).catch(() => {
    /* offline o server giù: riprova al prossimo passo */
  });
}

/** Invio finale: lancia ErroreTrasporto se il server non risponde 2xx. */
export function invia(leadId: string, lead: unknown): Promise<void> {
  return attraversa(async () => {
    let r: Response;
    try {
      r = await fetch(url(leadId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch {
      throw new ErroreTrasporto("rete assente", 0, true);
    }
    if (!r.ok) throw new ErroreTrasporto(`risposta ${r.status}`, r.status, r.status >= 500);
  });
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
  return attraversa(
    () =>
      new Promise<void>((risolvi, rifiuta) => {
        if (o.segnale?.aborted) return rifiuta(new ErroreTrasporto("annullato", 0, false));
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url(o.leadId, true));
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
      }),
  );
}
