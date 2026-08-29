import { expect, test } from "@playwright/test";

test("keyboard users can reach and submit the chart workspace", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to chart workspace" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#workspace")).toBeInViewport();
  await page.getByRole("button", { name: "Calculate chart" }).click();
  await expect(page.getByRole("heading", { name: "Ananya" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("img", { name: /South Indian fixed-sign chart/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cross-confirm the promise and the timing." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ask from this moment." })).toBeVisible();
});

test("mobile workspace has no page-level horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Calculate chart" })).toBeVisible();
});
