import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "English" }).click();
});

// The date/time wheels are scroll-driven listboxes (no clickable options):
// scroll the column so the wanted row settles under the selection band.
async function wheelTo(page: Page, box: number, value: string) {
  const list = page.getByRole("listbox").nth(box);
  const options = list.getByRole("option");
  const texts = await options.allTextContents();
  const i = texts.indexOf(value);
  if (i < 0) throw new Error(`wheel ${box} has no option ${value}`);
  await list.evaluate((el, top) => {
    el.scrollTop = top;
    el.dispatchEvent(new Event("scroll"));
  }, i * 44);
  await expect(options.nth(i)).toHaveAttribute("aria-selected", "true");
}

test("a first-time user can complete the setup flow", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "What is your name, and when were you born?" })).toBeVisible();
  await page.getByLabel("Your name").fill("Ananya");
  await wheelTo(page, 0, "8");
  await wheelTo(page, 1, "October");
  await wheelTo(page, 2, "1992");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "What time were you born?" })).toBeVisible();
  await wheelTo(page, 0, "2");
  await wheelTo(page, 1, "47");
  await wheelTo(page, 2, "pm");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Where were you born?" })).toBeVisible();
  await page.getByLabel("Place of birth").fill("Chennai");
  await page.getByRole("button", { name: /Chennai/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Is this right?" })).toBeVisible();
  await expect(page.getByText("Ananya")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show my chart" })).toBeEnabled();
});

test("the setup flow is keyboard reachable and never overflows the page", async ({ page }) => {
  let reachedName = false;
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    reachedName = await page.getByLabel("Your name").evaluate((element) => element === document.activeElement);
    if (reachedName) break;
  }
  expect(reachedName).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { name: "What is your name, and when were you born?" })).toBeVisible();
});

test("BTR opens a structured, editable three-event review", async ({ page }) => {
  // The legacy chat bundle is the slowest page to compile; under CI load
  // the 30s default trips before the BTR chip mounts (observed live).
  test.setTimeout(120_000);
  await page.evaluate(() =>
    localStorage.setItem(
      "sahadeva.profile.v1",
      JSON.stringify({
        name: "Ananya",
        date: "1992-10-08",
        time: "14:47",
        place: "Chennai",
        latitude: 13.0827,
        longitude: 80.2707,
        timezone: "Asia/Kolkata",
        timezoneOffset: 5.5,
        language: "en",
        methodology: "parashari",
        focus: "career",
        birthTimeAccuracyMinutes: 30,
        houseSystem: "whole-sign",
      }),
    ),
  );
  await page.reload(); // fresh mount picks up the preset profile
  await page.goto("/#chat"); // BTR lives on the legacy chat surface
  await page.getByRole("button", { name: "BTR", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Birth-time rectification" })).toBeVisible();
  await expect(page.getByText("Event 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Event 3", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review complete · Run BTR" })).toBeDisabled();
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText("Event 4", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByText("Event 3", { exact: true })).toBeVisible();
});

test("the panchangam shows a month, a festival day and navigates by day and keyboard", async ({ page }) => {
  test.setTimeout(90_000);
  await page.evaluate(() =>
    localStorage.setItem(
      "sahadeva.profile.v1",
      JSON.stringify({
        name: "Ananya",
        date: "1992-10-08",
        time: "14:47",
        place: "Hyderabad",
        latitude: 17.385,
        longitude: 78.4867,
        timezone: "Asia/Kolkata",
        timezoneOffset: 5.5,
        language: "en",
        methodology: "parashari",
        focus: "career",
        birthTimeAccuracyMinutes: 30,
        houseSystem: "whole-sign",
      }),
    ),
  );
  await page.goto("/#calendar?d=2026-10-20");
  await page.reload(); // a hash-only navigation keeps the already-mounted app without a profile
  await expect(page.getByRole("heading", { name: "Panchangam" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "October 2026", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tuesday, 20 October 2026" })).toBeVisible();
  await expect(page.locator(".dhobs").getByText("Vijaya Dashami (Dasara)")).toBeVisible();
  await expect(page.locator(".dhmeta")).toContainText("Sharad");
  await page.getByRole("button", { name: "Next day" }).click();
  await expect(page.getByRole("heading", { name: "Wednesday, 21 October 2026" })).toBeVisible();
  await page.locator('.mcell[data-date="2026-10-21"]').focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("heading", { name: "Wednesday, 28 October 2026" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
