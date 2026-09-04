import { expect, test, type Page } from "@playwright/test";

const guestProfile = { name: "Ananya", date: "1992-10-08", time: "14:47", place: "Chennai", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata", timezoneOffset: 5.5, language: "en", birthTimeAccuracyMinutes: 30 };

async function openAsGuest(page: Page) {
  await page.goto("/");
  await page.evaluate((profile) => {
    localStorage.clear();
    localStorage.setItem("sahadev.lang", "en");
    localStorage.setItem("sahadev.lang.set", "1");
    localStorage.setItem("sahadeva.profile.guest.v2", JSON.stringify(profile));
  }, guestProfile);
  await page.reload();
}

test("privacy, terms, and not-found routes are real screens", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("Voice input", { exact: true })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of use" })).toBeVisible();
  await page.goto("/missing-release-test");
  await expect(page.getByRole("heading", { name: "This page is not here" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to Sahadeva" })).toBeVisible();
});

test("account creation validates input and links to legal terms", async ({ page }) => {
  await openAsGuest(page);
  await page.getByRole("link", { name: "More" }).click();
  await page.getByRole("button", { name: "Create account or sign in" }).click();
  const submit = page.getByRole("button", { name: "Create account", exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Email").fill("release-test@example.com");
  await page.getByLabel("Password").fill("strong-test-password");
  await expect(submit).toBeEnabled();
  const account = page.getByRole("dialog", { name: "Account" });
  await expect(account.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  await expect(account.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
});

test("microphone flow exposes languages and inserts an editable transcript", async ({ page }) => {
  await page.addInitScript(() => {
    const fakeTrack = { stop() {} };
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [fakeTrack] }) } });
    class FakeMediaRecorder {
      static isTypeSupported() { return true; }
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor(_stream: unknown, _options?: unknown) {}
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });
  });
  await page.route("**/api/transcribe", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: "నా వృత్తి గురించి చెప్పండి", language: "te", provider: "test-provider" }) }));
  await openAsGuest(page);
  await page.getByRole("button", { name: "Speak your question" }).click();
  await expect(page.getByText("Listening", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "తెలుగు" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue("నా వృత్తి గురించి చెప్పండి");
  await expect(page.getByText("Transcript ready — review or send it")).toBeVisible();
});

test("guest profile and conversation migrate after account creation", async ({ page }) => {
  let signedIn = false;
  let profileSynced = false;
  let conversationSynced = false;
  await page.route(/\/api\/auth\/sign-up\/email$/, async (route) => {
    signedIn = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route(/\/api\/me\/profile\/sync$/, async (route) => {
    profileSynced = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route(/\/api\/me\/conversation$/, async (route) => {
    conversationSynced = true;
    const body = route.request().postDataJSON() as { threads?: unknown[] };
    expect(body.threads).toHaveLength(1);
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route(/\/api\/me$/, async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(signedIn
      ? { signedIn: true, user: { id: "user-test", name: "Ananya", email: "release-test@example.com" }, profile: profileSynced ? guestProfile : null, people: [], activePersonId: null, conversation: null }
      : { signedIn: false }),
  }));
  await page.goto("/");
  await page.evaluate(({ profile }) => {
    localStorage.clear();
    localStorage.setItem("sahadev.lang", "en");
    localStorage.setItem("sahadev.lang.set", "1");
    localStorage.setItem("sahadeva.profile.guest.v2", JSON.stringify(profile));
    const turns = Array.from({ length: 8 }, (_, index) => [
      { id: `u${index}`, role: "user", content: `Question ${index + 1}` },
      { id: `a${index}`, role: "assistant", content: `Answer ${index + 1}` },
    ]).flat();
    localStorage.setItem("sahadev.webchat.threads.v2:guest:1992-10-08:14:47:13.083:80.271", JSON.stringify([{ id: "thread-test", title: "Saved guest conversation", updatedAt: Date.now(), turns }]));
  }, { profile: guestProfile });
  await page.reload();
  await page.getByRole("button", { name: "Chat history" }).click();
  await page.getByRole("button", { name: /Saved guest conversation/ }).click();
  await page.getByLabel("Create your account").getByRole("button", { name: "Create account", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Account" });
  await dialog.getByLabel("Name").fill("Ananya");
  await dialog.getByLabel("Email").fill("release-test@example.com");
  await dialog.getByLabel("Password").fill("strong-test-password");
  await dialog.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(dialog).not.toHaveClass(/on/);
  expect(profileSynced).toBe(true);
  expect(conversationSynced).toBe(true);
});
