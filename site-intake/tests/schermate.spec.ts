import { test, type Page } from "@playwright/test";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

// Schermate di evidenza per la critique (non baseline pixel): i passi chiave a nove
// larghezze, da 360 a 1920. Uscita in .impeccable/review/schermate/ (non versionata).
// `npm run test:schermate` — solo nel progetto «computer», la larghezza la imposta il test.

const LARGHEZZE = [360, 390, 430, 768, 820, 1024, 1280, 1440, 1920];
const OUT = join(process.cwd(), ".impeccable", "review", "schermate");
const FIX = (n: string) => join(process.cwd(), "tests/fixtures", n);

test.describe("@schermate", () => {
  test.skip(() => test.info().project.name !== "computer", "una sola volta: le larghezze le imposta il test");

  for (const w of LARGHEZZE) {
    test(`passi chiave a ${w}px`, async ({ page }) => {
      mkdirSync(OUT, { recursive: true });
      const h = w < 768 ? 844 : w < 1024 ? 1180 : 900;
      await page.setViewportSize({ width: w, height: h });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const shot = (nome: string) => page.screenshot({ path: join(OUT, `${w}-${nome}.png`), fullPage: true });
      const continua = async (p: Page) => {
        await p.getByRole("button", { name: "Continua", exact: true }).click();
        await p.waitForTimeout(250);
      };

      await page.goto("/");
      await page.waitForTimeout(400);
      await shot("01-mestiere");
      await page.getByText("Ristrutturazioni", { exact: true }).click();
      await page.waitForTimeout(600);
      await shot("02-lavori");
      await page.getByText("Bagni", { exact: true }).click();
      await continua(page);
      await page.getByRole("textbox").fill("Cavaliere Build Srls");
      await continua(page);
      await page.locator(".stato-dominio").first().waitFor();
      await page.waitForTimeout(1500);
      await shot("03-nome-sito");
      await page.locator(".scelta--dominio").nth(1).click();
      await continua(page);
      await page.getByLabel("Comune").fill("colog");
      await page.getByRole("option", { name: "Cologno Monzese (MI)" }).waitFor();
      await shot("04-sede-suggerimenti");
      await page.getByRole("option", { name: "Cologno Monzese (MI)" }).click();
      await page.getByLabel("Via e numero civico").fill("Via Milano");
      await page.getByRole("button", { name: "Continua", exact: true }).click();
      await page.waitForTimeout(400);
      await shot("05-sede-avviso");
      await page.getByLabel("Via e numero civico").fill("Via Milano 89");
      await continua(page);
      await shot("06-zone");
      await page.getByText("Milano e provincia", { exact: true }).click();
      await continua(page);
      await page.getByText("Da 4 a 10 anni").click();
      await page.waitForTimeout(600);
      await page.getByText("No", { exact: true }).click();
      await continua(page);
      await page.getByRole("textbox").fill("388 893 7188");
      await shot("07-telefono");
      await continua(page);
      await page.locator("#foto-input").setInputFiles([FIX("lavoro-1.jpg"), FIX("lavoro-2.jpg"), FIX("piccola.png")]);
      await page.locator(".foto-voce.is-fatto").nth(2).waitFor({ timeout: 15_000 });
      await shot("08-foto");
      await continua(page);
      await page.locator("#logo-input").setInputFiles(FIX("logo.png"));
      await page.locator(".logo-anteprima__stato.is-fatto").waitFor({ timeout: 15_000 });
      await shot("09-logo");
      await continua(page);
      await page.getByText("Un solo referente", { exact: true }).click();
      await shot("10-punti-di-forza");
      await continua(page);
      await page.locator(".scelta", { hasText: "Privati" }).click();
      await continua(page);
      await page.getByText("Elegante", { exact: true }).click();
      await shot("11-stile");
      await continua(page);
      await page.getByText("Sì, ho dei colori").click();
      await page.getByText("Nero", { exact: true }).click();
      await shot("12-colori");
      await continua(page);
      await page.getByRole("textbox").fill("Fares Elwan");
      await continua(page);
      await page.getByRole("textbox").fill("fares@gmail.con");
      await page.getByRole("button", { name: "Continua", exact: true }).click();
      await page.waitForTimeout(400);
      await shot("13-email-avviso");
      await page.getByRole("button", { name: "Sì, usa fares@gmail.com" }).click();
      await continua(page);
      await page.getByRole("textbox").fill("14763170967");
      await continua(page);
      await continua(page);
      await page.getByText("WhatsApp", { exact: true }).click();
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: "Leggi tutta l'informativa" }).click();
      await page.waitForTimeout(300);
      await shot("14-privacy-dialog");
      await page.getByRole("button", { name: "Ho capito, chiudi" }).click();
      await page.locator("label.consenso").click();
      await continua(page);
      await shot("15-riepilogo");
      // pannello di attesa: si ritarda la risposta del server per fotografarlo
      await page.route("**/api/lead/*", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((r) => setTimeout(r, 1500));
        }
        await route.continue();
      });
      await page.getByRole("button", { name: "Voglio vedere il mio sito" }).click();
      await page.waitForTimeout(600);
      await shot("16-attesa");
      await page.getByRole("heading", { level: 1, name: "Il tuo nuovo sito è in lavorazione" }).waitFor({ timeout: 15_000 });
      await page.waitForTimeout(400);
      await shot("17-fatto");
    });
  }

  test("sipario a metà corsa e ingresso a scaglioni (390px)", async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForTimeout(400);
    await page.getByText("Idraulico", { exact: true }).click();
    await page.waitForTimeout(320 + 220);
    await page.screenshot({ path: join(OUT, "motion-sipario.png") });
    await page.waitForTimeout(320);
    await page.screenshot({ path: join(OUT, "motion-ingresso.png") });
  });
});
