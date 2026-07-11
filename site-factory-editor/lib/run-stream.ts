import { eventiDaBuffer, subscribe, type BusEvent } from "./run-bus";

// Risposta NDJSON che segue un run del bus: snapshot del buffer + live fino
// alla fine. La chiusura dello stream (tab chiusa, navigazione) NON tocca il
// run: si stacca solo il subscriber. Niente race snapshot→subscribe: emit è
// sincrono e qui non c'è alcun await tra le due chiamate.
export function rispostaStreamRun(id: string): Response {
  const encoder = new TextEncoder();
  let unsub: (() => void) | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const send = (ev: BusEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
        } catch {
          unsub?.(); // consumer già andato: smetti di ascoltare
        }
      };
      const chiudi = () => {
        unsub?.();
        try {
          controller.close();
        } catch {}
      };
      const snap = eventiDaBuffer(id, 0);
      if (!snap) return chiudi();
      for (const ev of snap.events) send(ev);
      if (snap.done) return chiudi();
      unsub = subscribe(id, (ev) => {
        if (ev.type === "bus-done") return chiudi();
        send(ev);
      });
      if (!unsub) chiudi();
    },
    cancel() {
      unsub?.();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
