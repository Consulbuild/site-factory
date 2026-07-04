// probe-bfl.mjs — probe minimale dell'API Black Forest Labs per FLUX.2 (submit + poll).
// Verifica live che endpoint, auth e meccanica async funzionino PRIMA di collegare la
// pipeline immagini. Genera UNA immagine piccola (~0.25MP, costo ~centesimi) e la salva.
//
// Uso:
//   BFL_API_KEY=xxx node probe-bfl.mjs ["prompt di prova"] [--model flux-2-pro|flux-2-max]
//
// Exit 0 = immagine scaricata (stampa il path); 1 = errore API; 2 = key mancante.
// Nessuna dipendenza (fetch nativo, Node >= 18).

// Endpoint da confermare sui docs correnti (docs.bfl.ai) alla prima esecuzione:
// la mappa qui sotto è l'unico punto da toccare se i path differiscono.
const API_BASE = process.env.BFL_API_BASE ?? "https://api.bfl.ai";
const MODELS = {
  "flux-2-pro": "/v1/flux-2-pro", // workhorse: card servizi, processo
  "flux-2-max": "/v1/flux-2-max", // top fidelity: hero
};
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

const key = process.env.BFL_API_KEY;
if (!key) {
  console.error(
    "BFL_API_KEY mancante.\n" +
      "Questo probe va eseguito quando la chiave sarà disponibile:\n" +
      "  BFL_API_KEY=xxx node probe-bfl.mjs\n" +
      "Crea la chiave su https://dashboard.bfl.ai e aggiungila come variabile d'ambiente.",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const modelFlag = args.indexOf("--model");
const model = modelFlag >= 0 ? args[modelFlag + 1] : "flux-2-pro";
if (!MODELS[model]) {
  console.error(`modello sconosciuto "${model}" — usa: ${Object.keys(MODELS).join(" | ")}`);
  process.exit(2);
}
const prompt =
  args.find((a, i) => !a.startsWith("-") && i !== modelFlag + 1) ??
  "Cantiere edile italiano ordinato al tramonto, luce naturale calda, ponteggio su palazzina mediterranea ristrutturata, nessuna persona in primo piano, nessun testo.";

const headers = { "x-key": key, "Content-Type": "application/json" };

async function main() {
  // 1) submit — 0.25MP (512×512) per spendere il minimo
  const submit = await fetch(API_BASE + MODELS[model], {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, width: 512, height: 512, output_format: "jpeg" }),
  });
  if (!submit.ok) {
    console.error(`submit fallito: HTTP ${submit.status}\n${await submit.text()}`);
    process.exit(1);
  }
  const task = await submit.json();
  console.log(`submit ok — id: ${task.id ?? "?"} · polling: ${task.polling_url ?? "(endpoint get_result)"}`);

  // 2) poll
  const pollUrl = task.polling_url ?? `${API_BASE}/v1/get_result?id=${task.id}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(pollUrl, { headers: { "x-key": key } });
    if (!res.ok) {
      console.error(`poll fallito: HTTP ${res.status}\n${await res.text()}`);
      process.exit(1);
    }
    const body = await res.json();
    const status = body.status ?? "?";
    if (status === "Ready") {
      // 3) gli URL di consegna sono firmati e SCADONO: scaricare subito
      const url = body.result?.sample ?? body.result?.url;
      if (!url) {
        console.error(`Ready ma nessun URL immagine nel result: ${JSON.stringify(body).slice(0, 300)}`);
        process.exit(1);
      }
      const img = await fetch(url);
      const buf = Buffer.from(await img.arrayBuffer());
      const out = `probe-bfl-${model}.jpeg`;
      const { writeFileSync } = await import("node:fs");
      writeFileSync(out, buf);
      console.log(`OK — ${out} (${(buf.length / 1024).toFixed(0)} KB) · modello ${model} · prompt: "${prompt.slice(0, 60)}…"`);
      process.exit(0);
    }
    if (["Error", "Failed", "Content Moderated", "Request Moderated"].includes(status)) {
      console.error(`generazione fallita: ${status} — ${JSON.stringify(body).slice(0, 300)}`);
      process.exit(1);
    }
    console.log(`  … ${status}`);
  }
  console.error(`timeout dopo ${POLL_TIMEOUT_MS / 1000}s`);
  process.exit(1);
}

main().catch((e) => {
  console.error(`errore di rete: ${e.message}`);
  process.exit(1);
});
