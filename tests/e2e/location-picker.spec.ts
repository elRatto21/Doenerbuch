import { expect, test } from "@playwright/test";

// no GPS permission: the place has to be set by hand on the big map
test.use({ permissions: [] });

test("set the location by hand in the map overlay", async ({ page }) => {
  const id = Date.now().toString(36);
  await page.goto("/registrieren");
  await page.getByLabel("Name", { exact: true }).fill("Picker Tester");
  await page.getByLabel("Username", { exact: true }).fill(`pick_${id}`);
  await page.getByLabel("E-Mail", { exact: true }).fill(`pick-${id}@example.com`);
  await page.getByLabel("Passwort", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Registrieren" }).click();
  await expect(page.getByRole("heading", { name: "Dein Dönerbuch ist noch leer" })).toBeVisible();

  await page.goto("/neu");
  await expect(page.getByText("Kein Standort")).toBeVisible();
  await page.getByRole("combobox", { name: "Name des Imbiss" }).fill("Handgesetzt Grill");

  await page.getByRole("button", { name: "Ort auf der Karte setzen" }).click();
  const picker = page.getByRole("dialog", { name: "Ort setzen" });
  await expect(picker).toBeVisible();

  // pan the map a bit, then confirm the point under the pin
  const box = (await picker.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2 - 40, { steps: 8 });
  await page.mouse.up();
  await picker.getByRole("button", { name: "Hier setzen" }).click();

  await expect(picker).toBeHidden();
  await expect(page.getByText("Ort auf Karte gesetzt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ort auf der Karte ändern" })).toBeVisible();

  await page.getByRole("button", { name: "Ins Dönerbuch eintragen" }).click();
  await expect(page.getByText("Ins Dönerbuch eingetragen!")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Handgesetzt Grill" })).toBeVisible();
});
