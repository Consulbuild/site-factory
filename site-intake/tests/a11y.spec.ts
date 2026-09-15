import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.x A/AA via axe-core sui passi rappresentativi (scelte, testo, sede, foto,
// riepilogo, dialog privacy). `npm run test:a11y`.
async function verifica(page: Page, nome: string) {
  // Prima che finiscano le animazioni in corso: un avviso a metà dissolvenza fa misurare ad axe
  // colori sbiaditi (rilievo di contrasto intermittente, non reale).
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  // `as never`: @axe-core/playwright porta un playwright-core più nuovo di @playwright/test 1.61
  // (pinnato per riusare i browser già installati); a runtime la Page è la stessa.
  const r = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa"]).analyze();
  // Nel messaggio anche i dati del primo nodo (per il contrasto: colori e rapporto), così il rilievo si legge senza aprire la trace.
  const sintesi = r.violations.map((v) => `${nome}: ${v.id} (${v.impact}) ×${v.nodes.length} — es. ${v.nodes[0]?.target} ${JSON.stringify(v.nodes[0]?.any[0]?.data ?? {})}`);
  expect(sintesi, sintesi.join("\n")).toEqual([]);
}

test("@a11y passi rappresentativi senza violazioni", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await verifica(page, "mestiere");
  await page.getByText("Idraulico", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quali lavori fai?");
  await verifica(page, "lavori (chip)");
  await page.getByText("Rifacimento bagni", { exact: true }).click();
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Come si chiama la tua azienda?");
  await page.getByRole("button", { name: "Continua" }).click(); // errore visibile
  await expect(page.getByRole("alert")).toBeVisible();
  await verifica(page, "azienda con errore");
  await page.getByRole("textbox").fill("Rossi Impianti");
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Come vuoi che si chiami il tuo sito?");
  await verifica(page, "nome sito");
  // un nome sicuramente libero: le proposte potrebbero risultare «già prese» e fermare con un avviso
  await page.getByRole("textbox", { name: "Oppure scrivilo tu" }).fill("rossi-impianti-prova-a11y");
  await page.getByRole("button", { name: "Continua", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dov'è la sede?");
  await page.getByLabel("Comune").fill("vice");
  await page.getByRole("option").first().waitFor();
  await verifica(page, "sede con suggerimenti");
});

test("@a11y orari: giorni, righe, pausa, copia, telefono", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => {
    const id = "a11y-orari-0001";
    localStorage.setItem(
      `bozza:v1:${id}`,
      JSON.stringify({ leadId: id, iniziatoAt: new Date().toISOString(), indice: 9, risposte: { telefono: "3888937188" }, confermate: [], origine: { utm: {}, ua: "test" } }),
    );
    localStorage.setItem("bozza:corrente", id);
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quando lavori?");
  await verifica(page, "orari lavoro (vuoto)");
  await page.getByLabel("Lunedì, dalle", { exact: true }).fill("08:00");
  await page.getByLabel("Lunedì, alle", { exact: true }).fill("12:00");
  await page.getByRole("button", { name: "Lunedì: pausa in mezzo" }).click();
  await page.getByLabel("Lunedì, seconda fascia dalle", { exact: true }).fill("13:30");
  await page.getByLabel("Lunedì, seconda fascia alle", { exact: true }).fill("18:00");
  await page.getByRole("button", { name: "Usa questi orari per tutti i giorni" }).click();
  await expect(page.locator(".conferma")).toContainText("Lun–Ven");
  await verifica(page, "orari lavoro (compilato)");
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quando rispondi al telefono?");
  await page.locator("label.scelta", { hasText: "In orari diversi" }).click();
  await verifica(page, "orari telefono (diversi)");
});

test("@a11y presa visione e dialog privacy", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // salto diretto all'ultima domanda: stato salvato come lo lascerebbe un lead
  await page.goto("/");
  await page.evaluate(() => {
    const id = "a11y-consenso-0001";
    localStorage.setItem(
      `bozza:v1:${id}`,
      JSON.stringify({ leadId: id, iniziatoAt: new Date().toISOString(), indice: 22, risposte: { telefono: "3888937188" }, confermate: [], origine: { utm: {}, ua: "test" } }),
    );
    localStorage.setItem("bozza:corrente", id);
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ho letto l'informativa sulla privacy");
  await verifica(page, "consenso");
  await page.getByRole("button", { name: "Leggi tutta l'informativa" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await verifica(page, "dialog privacy");
});
