import { expect, test } from "@playwright/test";
import {
  checksumPiva,
  giudicaEmail,
  giudicaPiva,
  giudicaTelefono,
  normalizzaSito,
  normalizzaSocial,
  proponiNomiSito,
  pulisciNomeSito,
  suggerisciDominioEmail,
} from "../src/lib/validators";
import { normalizza } from "../src/lib/comuni";

// Controlli puri (niente browser): messaggi che spiegano l'errore, mai un blocco senza uscita.
test.describe("@controlli validators", () => {
  test("telefono: pulizia, cifre, fisso", () => {
    expect(giudicaTelefono("+39 388 893 7188")).toEqual({ ok: true, valore: "3888937188" });
    expect(giudicaTelefono("0039388.893.7188").ok).toBe(true);
    expect(giudicaTelefono("38889371")).toMatchObject({ ok: false, livello: "avviso" });
    expect(giudicaTelefono("38889371889")).toMatchObject({ ok: false, livello: "avviso" });
    expect(giudicaTelefono("0444 123456")).toMatchObject({ ok: false, livello: "avviso" });
    expect(giudicaTelefono("")).toMatchObject({ ok: false, livello: "blocco" });
  });

  test("email: struttura e domini scritti male", () => {
    expect(giudicaEmail("Info@Cavaliere.it ").ok).toBe(true);
    expect(giudicaEmail("info@gmail.con")).toMatchObject({ ok: false, messaggio: "Forse intendevi info@gmail.com?" });
    expect(suggerisciDominioEmail("a@libero.ti")).toBe("a@libero.it");
    expect(suggerisciDominioEmail("a@gmail.com")).toBeNull();
    expect(giudicaEmail("info.cavaliere")).toMatchObject({ ok: false, livello: "avviso" });
  });

  test("partita iva: checksum, codice fiscale, lunghezza", () => {
    expect(checksumPiva("14763170967")).toBe(true);
    expect(checksumPiva("14763170968")).toBe(false);
    expect(giudicaPiva("IT 14763170967")).toEqual({ ok: true, valore: "14763170967" });
    expect(giudicaPiva("RSSMRA80A01H501U")).toMatchObject({ ok: false, messaggio: expect.stringContaining("codice fiscale") });
    expect(giudicaPiva("1476317096")).toMatchObject({ ok: false, messaggio: "Mancano 1 numeri: la Partita IVA ne ha 11." });
    expect(giudicaPiva("14763170968")).toMatchObject({ ok: false, livello: "avviso" });
  });

  test("nome del sito: proposte senza sigle e pulizia", () => {
    expect(proponiNomiSito("Cavaliere Build Srls", "impresa-edile")).toEqual(["cavalierebuild", "cavaliere-build", "impresacavaliere"]);
    expect(proponiNomiSito("Rossi & Figli S.n.c.", "idraulico")).toEqual(["rossifigli", "rossi-figli", "idraulicorossi"]);
    expect(pulisciNomeSito("Impresa Città  Nuova!")).toBe("impresacittanuova");
    expect(pulisciNomeSito("--a--b--")).toBe("a-b");
  });

  test("sito attuale e social: forme accettate", () => {
    expect(normalizzaSito("www.cavalierebuild.it")).toBe("https://www.cavalierebuild.it");
    expect(normalizzaSito("https://cavalierebuild.it/")).toBe("https://cavalierebuild.it");
    expect(normalizzaSocial("instagram", "@cavalierebuild")).toBe("https://www.instagram.com/cavalierebuild");
    expect(normalizzaSocial("tiktok", "cavalierebuild")).toBe("https://www.tiktok.com/@cavalierebuild");
    expect(normalizzaSocial("facebook", "https://www.facebook.com/cavaliere")).toBe("https://www.facebook.com/cavaliere");
  });

  test("comuni: normalizzazione tollerante", () => {
    expect(normalizza("Sant'Àngelo Lodigiano")).toBe("sant angelo lodigiano");
    expect(normalizza("Cologno Monzese (MI)")).toBe("cologno monzese mi");
  });
});
