import { expect, test } from "@playwright/test";

test("register, add a döner and see it in journal and stats", async ({ page }) => {
  const id = Date.now().toString(36);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("link", { name: "Registrieren", exact: true }).click();

  await page.getByLabel("Name", { exact: true }).fill("E2E Tester");
  await page.getByLabel("Username", { exact: true }).fill(`e2e_${id}`);
  await page.getByLabel("E-Mail", { exact: true }).fill(`e2e-${id}@example.com`);
  await page.getByLabel("Passwort", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Registrieren" }).click();

  // empty state
  await expect(page.getByRole("heading", { name: "Dein Dönerbuch ist noch leer" })).toBeVisible();
  await page.getByRole("link", { name: "Ersten Döner eintragen" }).click();

  // log it right away – no rating yet
  await expect(page.getByRole("heading", { name: "Neuer Döner" })).toBeVisible();
  await page.getByLabel("Sorte", { exact: true }).selectOption({ label: "Dürüm" });
  await page.getByLabel("Fleisch", { exact: true }).selectOption({ label: "Hähnchen" });
  await page.getByRole("combobox", { name: "Name des Imbiss" }).fill("Bosporus Grill");
  await expect(page.getByText("Standort erfasst")).toBeVisible();
  await page.getByLabel("Preis").fill("7,50");
  await page.getByRole("button", { name: "Ins Dönerbuch eintragen" }).click();

  // detail: open until rated
  await expect(page.getByText("Ins Dönerbuch eingetragen!")).toBeVisible();
  await expect(page.getByText("Neues Abzeichen: Erster Döner")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bosporus Grill" })).toBeVisible();
  await expect(page.getByText("Dürüm · Hähnchen")).toBeVisible();
  await expect(page.getByText("€ 7,50")).toBeVisible();
  await expect(page.getByText("noch nicht bewertet")).toBeVisible();

  // the journal marks it as open
  await page.getByRole("link", { name: "Zurück zum Journal" }).click();
  await expect(page.getByText("1 Döner wartet auf deine Bewertung")).toBeVisible();
  await expect(page.getByText("Offen · jetzt bewerten")).toBeVisible();

  // rate it afterwards
  await page.getByRole("link", { name: /Bosporus Grill/ }).click();
  await page.getByRole("link", { name: "Jetzt bewerten" }).click();
  await expect(page.getByRole("heading", { name: "Bewertung" })).toBeVisible();
  await page.getByRole("radio", { name: "5 Sterne" }).click();
  await page.getByRole("radio", { name: "Brot: 4 von 5" }).click();
  await page.getByLabel("Notiz").fill("Extra scharf");
  await page.getByRole("button", { name: "Bewerten" }).click();
  await expect(page.getByText("Bewertung gespeichert!")).toBeVisible();
  await expect(page.getByText("„Extra scharf“")).toBeVisible();
  await expect(page.getByText("Bewertung", { exact: true })).toBeVisible();

  // journal
  await page.getByRole("link", { name: "Zurück zum Journal" }).click();
  await expect(page.getByText("Döner gesamt")).toBeVisible();
  await expect(page.getByRole("link", { name: /Bosporus Grill/ })).toBeVisible();
  await expect(page.getByText("wartet auf deine Bewertung")).toHaveCount(0);

  // "Nochmal hier" reuses the place
  await page.getByRole("link", { name: /Bosporus Grill/ }).click();
  await page.getByRole("link", { name: "Nochmal hier" }).click();
  await expect(page.getByRole("combobox", { name: "Name des Imbiss" })).toHaveValue("Bosporus Grill");
  await expect(page.getByLabel("Preis")).toHaveValue("7,50");

  // edit: change price and keep everything else
  await page.goto("/");
  await page.getByRole("link", { name: /Bosporus Grill/ }).click();
  await page.getByRole("link", { name: "Bearbeiten" }).click();
  await expect(page.getByRole("heading", { name: "Bearbeiten" })).toBeVisible();
  await page.getByLabel("Preis").fill("8,00");
  await page.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(page.getByText("Änderungen gespeichert.")).toBeVisible();
  await expect(page.getByText("€ 8,00")).toBeVisible();
  // editing the basics keeps the rating
  await expect(page.getByText("„Extra scharf“")).toBeVisible();

  // stats
  await page.goto("/statistik?zeitraum=gesamt");
  await expect(page.getByText("Döner gegessen")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Die Besten je Sorte" })).toBeVisible();
});
