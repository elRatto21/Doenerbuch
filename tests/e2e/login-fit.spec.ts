import { expect, test } from "@playwright/test";

// Visible viewport (screen minus browser bars) of common phones, smallest first.
const PHONES: [string, number, number][] = [
  ["iPhone SE 1, Safari", 320, 460],
  ["iPhone SE 2/3, Safari", 375, 553],
  ["Galaxy S8, Chrome", 360, 640],
  ["Galaxy Fold, folded", 280, 653],
  ["iPhone 15, Safari", 393, 659],
  ["iPhone 15 Pro Max, Safari", 430, 739],
];

for (const [name, width, height] of PHONES) {
  test(`start page fits without scrolling – ${name} (${width}×${height})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "Anmelden" })).toBeVisible();
    const size = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(size.scrollHeight).toBeLessThanOrEqual(height);
    expect(size.scrollWidth).toBeLessThanOrEqual(width);
  });
}
