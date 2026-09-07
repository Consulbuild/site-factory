import { expect, test, type Page } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Percorso completo del lead, come lo farebbe un titolare: tocchi, testi, errori
// corretti, riepilogo con «Modifica», invio. Alla fine controlla cosa è arrivato
// nell'inbox locale (dev/inbox.mjs → .dev-inbox/<leadId>/lead.json).

const INBOX = join(process.cwd(), ".dev-inbox");

async function continua(page: Page, atteso: string) {
  await page.getByRole("button", { name: /^(Continua|Salva e torna al riepilogo)$/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(atteso);
}

test("@flusso dal mestiere al «Fatto» con correzioni", async ({ page }) => {
  await page.goto("/?mestiere=ristrutturazioni&utm_source=test");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qual è il tuo mestiere?");
  await expect(page.getByRole("radio", { name: "Ristrutturazioni" })).toBeChecked();
  await expect(page.locator("#progresso-eti")).toHaveText("Sezione 1 di 7");
  await continua(page, "Quali lavori fai?");

  await page.getByText("Bagni", { exact: true }).click();
  await page.getByText("Cucine", { exact: true }).click();
  await continua(page, "Come si chiama la tua azienda?");

  // vuoto → blocco che spiega
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("alert")).toContainText("Scrivi come si chiama la tua azienda.");
  await page.getByRole("textbox").fill("Cavaliere Build Srls");
  await continua(page, "Come vuoi che si chiami il tuo sito?");

  // proposte dal nome + disponibilità dal vivo
  await expect(page.locator(".dominio__nome", { hasText: "cavalierebuild.it" })).toBeVisible();
  await expect(page.locator(".stato-dominio").first()).not.toHaveText("Controllo…", { timeout: 6_000 });
  await page.locator(".scelta--dominio", { hasText: "cavaliere-build.it" }).click();
  await continua(page, "Dov'è la sede?");

  // comune dall'elenco, via a mano, civico mancante → avviso con uscita
  await page.getByLabel("Comune").fill("colog");
  await page.getByRole("option", { name: "Cologno Monzese (MI)" }).click();
  await page.getByLabel("Via e numero civico").fill("Via Milano");
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("alert")).toContainText("Manca il numero civico");
  await page.getByLabel("Via e numero civico").fill("Via Milano 89");
  await expect(page.locator(".conferma")).toContainText("Via Milano 89, 20093 Cologno Monzese (MI)");
  await continua(page, "In quali zone lavori?");

  await expect(page.getByText("Cologno Monzese e dintorni")).toBeVisible();
  await page.getByText("Milano e provincia", { exact: true }).click();
  await page.getByLabel("Aggiungi una zona").fill("berga");
  await page.getByRole("option", { name: "Bergamo e provincia" }).click();
  await expect(page.getByRole("checkbox", { name: "Bergamo e provincia" })).toBeChecked();
  await continua(page, "Da quanti anni fai questo mestiere?");

  // scelta singola: un tocco basta
  await page.getByText("Da 4 a 10 anni").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hai già un sito internet?");
  await page.getByText("No", { exact: true }).click();
  await continua(page, "Il tuo numero di cellulare");

  await page.getByRole("textbox").fill("0444 123456");
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("alert")).toContainText("Sembra un numero fisso");
  await page.getByRole("textbox").fill("388 893 7188");
  await expect(page.locator(".campo--ok")).toBeVisible();
  await continua(page, "Mostraci i tuoi lavori");
  await expect(page.getByText("Bene, il grosso è fatto.")).toBeVisible();
  await expect(page.locator("#progresso-eti")).toHaveText("Sezione 4 di 7");

  await continua(page, "Hai un logo? Caricalo qui");
  await continua(page, "Perché i clienti scelgono te?");

  await page.getByText("Un solo referente", { exact: true }).click();
  await page.getByText("Certificazioni", { exact: true }).click();
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("alert")).toContainText("Scrivi che cos'è");
  await page.getByLabel("Quali certificazioni?").fill("SOA OG1");
  await continua(page, "Chi sono i tuoi clienti?");

  await page.locator(".scelta", { hasText: "Privati" }).click();
  await page.getByText("Agenzie immobiliari", { exact: true }).click();
  await continua(page, "Che stile vuoi che abbia il tuo sito?");

  await page.getByText("Elegante", { exact: true }).click();
  await page.getByText("Tecnico e professionale", { exact: true }).click();
  await page.getByText("Moderno e deciso", { exact: true }).click();
  await expect(page.getByText("Massimo 2: togline uno")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Moderno e deciso" })).not.toBeChecked();
  await continua(page, "Hai dei colori della tua azienda?");

  await page.getByText("Sì, ho dei colori").click();
  await page.getByText("Nero", { exact: true }).click();
  await page.getByText("Oro", { exact: true }).click();
  await continua(page, "Nome e cognome");

  await page.getByRole("textbox").fill("Fares");
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("alert")).toContainText("Scrivi anche il cognome");
  await page.getByRole("textbox").fill("Fares Elwan");
  await continua(page, "L'email dell'azienda");

  await page.getByRole("textbox").fill("fares@gmail.con");
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("alert")).toContainText("Forse intendevi fares@gmail.com?");
  await page.getByRole("button", { name: "Sì, usa fares@gmail.com" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("fares@gmail.com");
  await continua(page, "La Partita IVA");

  await page.getByRole("textbox").fill("IT 14763170967");
  await expect(page.locator(".campo--ok")).toBeVisible();
  await continua(page, "Hai una pagina Facebook, Instagram o TikTok dell'azienda?");

  await page.getByRole("textbox", { name: "Instagram (facoltativo)" }).fill("@cavalierebuild");
  await continua(page, "Come preferisci essere contattato per vedere il tuo nuovo sito?");

  await page.getByText("WhatsApp", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ho letto l'informativa sulla privacy");
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("alert")).toContainText("Serve la spunta");
  await page.getByRole("button", { name: "Leggi tutta l'informativa" }).click();
  await expect(page.getByRole("dialog")).toContainText("ConsulBuild di Vecchiato Edoardo");
  await page.getByRole("button", { name: "Ho capito, chiudi" }).click();
  await page.locator("label.consenso").click();
  await continua(page, "Controlla le tue risposte");

  // riepilogo: modifica e ritorno
  await expect(page.locator(".riepilogo__riga")).toHaveCount(18); // 21 domande meno privacy, foto, logo
  await expect(page.locator(".riepilogo__riga", { hasText: "Sede" })).toContainText("Via Milano 89, 20093 Cologno Monzese (MI)");
  await page.getByRole("button", { name: "Modifica: Azienda" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Come si chiama la tua azienda?");
  await page.getByRole("textbox").fill("Cavaliere Build S.r.l.s.");
  await continua(page, "Controlla le tue risposte");
  await expect(page.locator(".riepilogo__riga", { hasText: "Azienda" })).toContainText("Cavaliere Build S.r.l.s.");

  // invio
  const leadId = await page.evaluate(() => localStorage.getItem("bozza:corrente"));
  await page.getByRole("button", { name: "Voglio vedere il mio sito" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Il tuo nuovo sito è in lavorazione");
  await expect(page.locator("#progresso-eti")).toHaveText("Fatto");

  expect(leadId).toBeTruthy();
  const file = join(INBOX, leadId!, "lead.json");
  expect(existsSync(file)).toBe(true);
  const lead = JSON.parse(readFileSync(file, "utf8"));
  expect(lead.risposte.azienda).toBe("Cavaliere Build S.r.l.s.");
  expect(lead.risposte.lavori.ids).toEqual(["bagni", "cucine"]);
  expect(lead.risposte.nome_sito.nome).toBe("cavaliere-build");
  expect(lead.risposte.sede).toMatchObject({ comune: "Cologno Monzese", provincia: "MI", cap: "20093", via: "Via Milano 89" });
  expect(lead.risposte.zone).toEqual(expect.arrayContaining(["Milano e provincia", "Bergamo e provincia"]));
  expect(lead.risposte.telefono).toBe("3888937188");
  expect(lead.risposte.punti_di_forza).toEqual({ ids: ["referente-unico", "certificazioni"], certificazioni: "SOA OG1" });
  expect(lead.risposte.stile).toEqual(["elegante", "tecnico"]);
  expect(lead.risposte.colori).toEqual({ ids: ["oro", "nero"] }); // ordine della tavolozza, non del tocco
  expect(lead.risposte.email).toBe("fares@gmail.com");
  expect(lead.risposte.partita_iva).toEqual({ valore: "14763170967" });
  expect(lead.risposte.social).toEqual({ instagram: "https://www.instagram.com/cavalierebuild" });
  expect(lead.risposte.ricontatto).toEqual({ id: "whatsapp" });
  expect(lead.risposte.consenso).toBe(true);
  expect(lead.origine.utm).toMatchObject({ mestiere: "ristrutturazioni", utm_source: "test" });
});

test("@flusso ripresa: chi ricarica riparte dal passo dove era", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Idraulico", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quali lavori fai?");
  await page.getByText("Riparazioni e perdite", { exact: true }).click();
  await continua(page, "Come si chiama la tua azienda?");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Come si chiama la tua azienda?");
  await expect(page.locator("#progresso-eti")).toHaveText("Sezione 2 di 7");
  await page.getByRole("button", { name: "Indietro" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quali lavori fai?");
  await expect(page.getByRole("checkbox", { name: "Riparazioni e perdite" })).toBeChecked();
});
