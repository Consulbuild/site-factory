import { test, expect } from "@playwright/test";

// VRT su /anteprima/[preset]: screenshot per-sezione (segnale di failure chiaro,
// meno flake del solo full-page) + full-page. Il preset arriva dal nome del
// project ("terra-390" → terra). Nomi shot: id sezione, o aria-labelledby senza
// suffisso -title, o indice — stabili finché il blueprint golden non cambia.

test("@visual anteprima: sezioni e pagina intera", async ({ page }, testInfo) => {
  const preset = testInfo.project.name.replace(/-\d+$/, "");
  await page.goto(`/anteprima/${preset}/`, { waitUntil: "networkidle" });
  // I font (oggi da Google CDN, self-host in M3) devono essere caricati prima
  // dello shot, o le baseline flappano.
  await page.evaluate(() => document.fonts.ready);
  // Le immagini lazy (Gallery) si caricano allo scroll: senza forzarle, lo
  // screenshot per-sezione gareggia col decode → diff non deterministici.
  await page.evaluate(async () => {
    const immagini = Array.from(document.images);
    for (const img of immagini) img.loading = "eager";
    await Promise.all(immagini.map((img) => img.decode().catch(() => {})));
  });

  // Scope a body >: i locator Playwright attraversano gli shadow root, e la
  // dev toolbar di Astro (se mai il server fosse un dev) contiene <section>
  // nascoste che romperebbero il loop.
  const sezioni = page.locator("body > section");
  const totale = await sezioni.count();
  const visti = new Map<string, number>();
  for (let i = 0; i < totale; i++) {
    const sezione = sezioni.nth(i);
    const id = await sezione.getAttribute("id");
    const aria = (await sezione.getAttribute("aria-labelledby"))?.replace(/-title$/, "");
    let nome = id ?? aria ?? `sezione-${String(i).padStart(2, "0")}`;
    const doppioni = visti.get(nome) ?? 0;
    visti.set(nome, doppioni + 1);
    if (doppioni > 0) nome = `${nome}-${doppioni + 1}`;
    await expect(sezione).toHaveScreenshot(`${nome}.png`);
  }

  await expect(page.locator("body > header.sticky")).toHaveScreenshot("header.png");
  await expect(page.locator("body > footer")).toHaveScreenshot("footer.png");
  await expect(page).toHaveScreenshot("full.png", { fullPage: true });
});

// VRT della matrice trattamenti (Asse 2): screenshot per cella {componente ×
// variante}, agganciata all'id della sezione. Stesso set di project (preset ×
// viewport) → copre l'intera matrice {trattamento × preset × viewport}.
test("@visual anteprima-componenti: matrice trattamenti", async ({ page }, testInfo) => {
  const preset = testInfo.project.name.replace(/-\d+$/, "");
  await page.goto(`/anteprima-componenti/${preset}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const celle = page.locator("main section[id]");
  const totale = await celle.count();
  for (let i = 0; i < totale; i++) {
    const cella = celle.nth(i);
    const id = await cella.getAttribute("id");
    await expect(cella).toHaveScreenshot(`comp-${id}.png`);
  }
});
