import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function beginInEnglish(page: Page) {
  await expect(page.getByRole("heading", { name: "Namaste" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "What is your name, and when were you born?" })).toBeVisible();
}

test("a first-time user can complete the calm four-step setup", async ({ page }) => {
  await beginInEnglish(page);
  await page.getByLabel("Your name").fill("Ananya");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "What time were you born?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Where were you born?" })).toBeVisible();
  await page.getByLabel("Place of birth").fill("Chennai");
  const result = page.locator(".results .res").first();
  await expect(result).toBeVisible();
  await result.click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Is this right?" })).toBeVisible();
  await expect(page.getByText("Ananya", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show my chart" })).toBeEnabled();
});

test("the beginner setup is keyboard reachable and never overflows the page", async ({ page }) => {
  await beginInEnglish(page);
  let reachedName = false;
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press("Tab");
    reachedName = await page.getByLabel("Your name").evaluate((element) => element === document.activeElement);
    if (reachedName) break;
  }
  expect(reachedName).toBe(true);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { name: "What is your name, and when were you born?" })).toBeVisible();
  await expect(page.getByText("Your date of birth fixes almost everything Sahadeva reads.")).toBeVisible();
});

test("an existing user can open and explore the South Indian chart", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("sahadev.lang", "en");
    localStorage.setItem("sahadev.lang.set", "1");
    localStorage.setItem("sahadeva.profile.guest.v2", JSON.stringify({name:"Ananya",date:"1992-10-08",time:"14:47",place:"Chennai",latitude:13.0827,longitude:80.2707,timezone:"Asia/Kolkata",timezoneOffset:5.5,language:"en",methodology:"parashari",focus:"career",birthTimeAccuracyMinutes:30,houseSystem:"whole-sign"}));
  });
  await page.reload();
  await page.getByRole("link", { name: "Chart" }).click();
  await expect(page.getByRole("heading", { name: "My chart" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Rasi D-1" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Navamsa D-9" }).click();
  await expect(page.getByRole("tab", { name: "Navamsa D-9" })).toHaveAttribute("aria-selected", "true");
  // Data-dependent: the dev worker cold-boots under two-project parallel
  // load, so allow longer than the default 5s for the computed chart.
  await expect(page.getByRole("region", { name: "How to read this chart" })).toBeVisible({ timeout: 20000 });
});
