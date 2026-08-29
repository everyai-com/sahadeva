import { mkdir, writeFile } from "node:fs/promises";
import { calculateChart } from "../shared/jyotish";
import { buildFullLifeReport } from "../shared/fullLifeReport";
import { buildServerReportPdf } from "../worker/serverReport";

const chart = calculateChart({
  name: "Sahadeva Sample",
  date: "2000-01-01",
  time: "12:00",
  place: "Greenwich",
  latitude: 51.4779,
  longitude: 0,
  timezoneOffset: 0,
  timezone: "Etc/UTC",
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 5,
});
const report = buildFullLifeReport(chart, "2026-08-29", 2);
const pdf = await buildServerReportPdf(
  chart,
  report as unknown as Record<string, any>,
);
await mkdir("output/pdf", { recursive: true });
await writeFile("output/pdf/sahadeva-server-shareable-report.pdf", pdf);
