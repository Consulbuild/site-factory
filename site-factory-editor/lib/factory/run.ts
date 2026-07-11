import fs from "node:fs";
import path from "node:path";
import { IO, type RunEvent } from "../run-step.ts";
import { NODE_BIN } from "../paths";
import { CHECK_OPTOUT, EXTRACT_TOKENS, referenceDir } from "./paths.ts";
import { OptoutSchema } from "./schemas.ts";
import { readReference } from "./state.ts";

// Runner della verifica di un riferimento (M5): due fasi deterministiche via
// seam IO — gate opt-out TDM (HARD, loggato) e, solo se consentito,
// estrazione token dal CSS computato + screenshot. Stesso contratto eventi
// NDJSON della pipeline clienti.

export async function* runReference(id: string): AsyncGenerator<RunEvent> {
  const ref = readReference(id);
  if (!ref) {
    yield { type: "error", message: `riferimento inesistente: ${id}` };
    return;
  }
  const dir = referenceDir(id);
  yield { type: "start", step: "riferimento" };

  // ---- fase 1: gate opt-out (la verità è optout.json, non l'exit code:
  //      exit 1 = "bloccato", che è un esito valido e va mostrato, non un crash)
  const optoutFile = path.join(dir, "optout.json");
  const r1 = yield* IO.script({
    phase: "Gate opt-out TDM (L.132/2025 — hard, loggato)",
    bin: NODE_BIN,
    args: [CHECK_OPTOUT, ref.meta.url, "--out", optoutFile],
    timeoutMs: 90_000,
  });
  const optout = OptoutSchema.safeParse(
    fs.existsSync(optoutFile) ? JSON.parse(fs.readFileSync(optoutFile, "utf8")) : null,
  );
  if (!optout.success) {
    yield { type: "error", message: r1.error ?? "check-optout non ha prodotto optout.json" };
    return;
  }
  if (optout.data.esito !== "consentito") {
    yield {
      type: "text",
      text: `Riferimento ${optout.data.esito === "bloccato" ? "BLOCCATO dall'opt-out" : "NON VERIFICABILE (fail-closed)"}: ${optout.data.motivo}`,
    };
    // esito legittimo del gate: la run si chiude "bene", il riferimento resta
    // registrato come non selezionabile (il log è la prova di diligenza).
    yield { type: "done", artifact: "optout.json" };
    return;
  }

  // ---- fase 2: estrazione (solo su consentito)
  const r2 = yield* IO.script({
    phase: "Estrazione token dal CSS computato (dembrandt) + screenshot",
    bin: NODE_BIN,
    args: [EXTRACT_TOKENS, ref.meta.url, dir],
    timeoutMs: 8 * 60 * 1000,
  });
  if (!r2.ok || !fs.existsSync(path.join(dir, "extraction.tokens.json"))) {
    yield { type: "error", message: r2.error ?? "estrazione senza extraction.tokens.json" };
    return;
  }
  yield { type: "done", artifact: "extraction.tokens.json" };
}
