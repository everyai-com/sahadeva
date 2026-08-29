import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.SAHADEVA_BASE_URL || "http://127.0.0.1:5173";
const output = resolve("output/pdf/sahadeva-consultation-report.pdf");
await mkdir(resolve("output/pdf"), { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Calculate chart" }).click();
  await page.getByText("What matters most", { exact: true }).waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download consultation PDF" }).click();
  const download = await downloadPromise;
  await download.saveAs(output);
  process.stdout.write(`${output}\n`);
} finally {
  await browser.close();
}
