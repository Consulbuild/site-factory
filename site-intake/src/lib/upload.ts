/**
 * Coda di caricamento delle foto e del logo: parte appena il lead sceglie i file e
 * continua in background mentre risponde alle domande successive. Due caricamenti
 * alla volta, un file per richiesta, quattro tentativi (0, 1, 3, 5 secondi più un
 * po' di caso) solo su errori di rete o del server, mai su errori 4xx.
 * Il manifesto (nomi e stati, non i file) sta in sessionStorage: se la pagina si
 * ricarica, le foto già arrivate restano contate.
 */
import { caricaFile, ErroreTrasporto } from "./transport";

export type StatoUpload = "in-coda" | "in-corso" | "fatto" | "errore" | "annullato";
export type TipoFile = "foto" | "logo";

export interface VoceUpload {
  n: number; // indice progressivo per tipo (1…15 per le foto, 1 per il logo)
  kind: TipoFile;
  nome: string;
  bytes: number;
  tipo: string; // MIME
  stato: StatoUpload;
  frazione: number; // 0…1
  tentativi: number;
  /** URL blob della miniatura (foto) o dell'anteprima (logo); null se non disponibile. */
  miniatura: string | null;
  /** Vero se la voce arriva dal manifesto salvato: il File non c'è più. */
  ripristinata?: boolean;
  file?: File;
  ctrl?: AbortController;
}

export interface VoceManifesto {
  n: number;
  kind: TipoFile;
  nome: string;
  bytes: number;
  tipo: string;
  stato: StatoUpload;
}

const RITARDI = [0, 1000, 3000, 5000];
const CHIAVE = (id: string) => `bozza:upload:${id}`;

export class CodaUpload {
  private voci: VoceUpload[] = [];
  private inCorso = 0;
  private ascoltatori = new Set<() => void>();
  private attese: Array<() => void> = [];

  constructor(
    readonly leadId: string,
    private readonly concorrenza = 2,
  ) {
    this.ripristina();
  }

  // ---------- lettura ----------
  get tutte(): readonly VoceUpload[] {
    return this.voci;
  }
  di(kind: TipoFile): VoceUpload[] {
    return this.voci.filter((v) => v.kind === kind && v.stato !== "annullato");
  }
  get attive(): number {
    return this.voci.filter((v) => v.stato === "in-coda" || v.stato === "in-corso").length;
  }
  get inErrore(): VoceUpload[] {
    return this.voci.filter((v) => v.stato === "errore");
  }
  /** Avanzamento complessivo di ciò che deve ancora arrivare (0…1). */
  get frazioneTotale(): number {
    const pend = this.voci.filter((v) => v.stato !== "annullato" && v.stato !== "errore");
    if (pend.length === 0) return 1;
    return pend.reduce((s, v) => s + (v.stato === "fatto" ? 1 : v.frazione), 0) / pend.length;
  }
  manifesto(kind?: TipoFile): VoceManifesto[] {
    return this.voci
      .filter((v) => v.stato !== "annullato" && (!kind || v.kind === kind))
      .map(({ n, kind: k, nome, bytes, tipo, stato }) => ({ n, kind: k, nome, bytes, tipo, stato }));
  }

  // ---------- scrittura ----------
  aggiungi(kind: TipoFile, file: File, miniatura: string | null): VoceUpload {
    const n = kind === "logo" ? 1 : Math.max(0, ...this.di("foto").map((v) => v.n)) + 1;
    const voce: VoceUpload = { n, kind, nome: file.name, bytes: file.size, tipo: file.type, stato: "in-coda", frazione: 0, tentativi: 0, miniatura, file };
    this.voci.push(voce);
    this.salva();
    this.notifica();
    void this.avanzaCoda();
    return voce;
  }

  rimuovi(voce: VoceUpload): void {
    voce.ctrl?.abort();
    voce.stato = "annullato";
    if (voce.miniatura) URL.revokeObjectURL(voce.miniatura);
    voce.miniatura = null;
    this.voci = this.voci.filter((v) => v !== voce);
    this.salva();
    this.notifica();
  }

  riprova(voce: VoceUpload): void {
    if (!voce.file) return;
    voce.stato = "in-coda";
    voce.tentativi = 0;
    voce.frazione = 0;
    this.notifica();
    void this.avanzaCoda();
  }

  /** Vero se esiste già una voce con lo stesso nome e peso (doppione scelto due volte). */
  doppione(file: File): boolean {
    return this.voci.some((v) => v.stato !== "annullato" && v.nome === file.name && v.bytes === file.size);
  }

  /** Si risolve quando non c'è più nulla in coda o in corso (errori inclusi: li decide chi chiama). */
  attendiTutto(): Promise<void> {
    if (this.attive === 0) return Promise.resolve();
    return new Promise((r) => this.attese.push(r));
  }

  onCambio(fn: () => void): () => void {
    this.ascoltatori.add(fn);
    return () => this.ascoltatori.delete(fn);
  }

  distruggi(): void {
    for (const v of this.voci) if (v.miniatura) URL.revokeObjectURL(v.miniatura);
  }

  // ---------- motore ----------
  private async avanzaCoda(): Promise<void> {
    while (this.inCorso < this.concorrenza) {
      const prossima = this.voci.find((v) => v.stato === "in-coda" && v.file);
      if (!prossima) break;
      this.inCorso++;
      void this.carica(prossima).finally(() => {
        this.inCorso--;
        void this.avanzaCoda();
        if (this.attive === 0) {
          const attese = this.attese;
          this.attese = [];
          for (const r of attese) r();
        }
      });
    }
  }

  private async carica(voce: VoceUpload): Promise<void> {
    voce.stato = "in-corso";
    voce.ctrl = new AbortController();
    this.notifica();
    for (;;) {
      try {
        await caricaFile({
          leadId: this.leadId,
          kind: voce.kind,
          index: voce.n,
          file: voce.file!,
          segnale: voce.ctrl.signal,
          onProgresso: (f) => {
            voce.frazione = f;
            this.notifica();
          },
        });
        voce.stato = "fatto";
        voce.frazione = 1;
        break;
      } catch (e) {
        if ((voce.stato as StatoUpload) === "annullato") return; // rimossa dall'utente mentre caricava
        const ripetibile = e instanceof ErroreTrasporto ? e.ripetibile : true;
        voce.tentativi++;
        const ritardo = RITARDI[voce.tentativi];
        if (!ripetibile || ritardo === undefined) {
          voce.stato = "errore";
          break;
        }
        voce.frazione = 0;
        this.notifica();
        await new Promise((r) => setTimeout(r, ritardo + Math.random() * 300));
        if (voce.ctrl.signal.aborted) return;
      }
    }
    this.salva();
    this.notifica();
  }

  private notifica(): void {
    for (const fn of this.ascoltatori) fn();
  }

  private salva(): void {
    try {
      sessionStorage.setItem(CHIAVE(this.leadId), JSON.stringify(this.manifesto()));
    } catch {
      /* niente ripresa del manifesto: il form funziona lo stesso */
    }
  }

  private ripristina(): void {
    try {
      const grezzo = sessionStorage.getItem(CHIAVE(this.leadId));
      if (!grezzo) return;
      const salvate = JSON.parse(grezzo) as VoceManifesto[];
      // solo ciò che era già arrivato: il File delle altre è perso con la pagina
      this.voci = salvate
        .filter((v) => v.stato === "fatto")
        .map((v) => ({ ...v, frazione: 1, tentativi: 0, miniatura: null, ripristinata: true }));
    } catch {
      this.voci = [];
    }
  }
}
