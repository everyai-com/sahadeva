import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle,
  Copy,
  Database,
  Plugs,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import type { BirthInput, ChartResult } from "../shared/schema";
import { SIGNS } from "../shared/constants";
import { TELUGU_GRAHAS, TELUGU_SIGNS } from "../shared/telugu";
import {
  KNOWN_LOCATIONS,
  locationLabel,
  resolveKnownLocation,
  searchKnownLocations,
  type KnownLocation,
} from "../shared/locations";
import {
  unwrapRecovery,
  wrapRecovery,
  type BrowserRecovery,
  type WrappedRecovery,
} from "../shared/recovery";
import { SouthChart } from "./SouthChart";
import { buildEverydayReading } from "../shared/everydayReading";
import { PrashnaPanel } from "./PrashnaPanel";
import { ConsultationToolsPanel } from "./ConsultationToolsPanel";

const sample: BirthInput = {
  name: "Ananya",
  date: "1992-10-08",
  time: "14:47",
  place: "Chennai, Tamil Nadu, India",
  latitude: 13.0827,
  longitude: 80.2707,
  timezoneOffset: 5.5,
  timezone: "Asia/Kolkata",
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 5,
  houseSystem: "whole-sign",
};
const VARGA_NAMES: Record<string, [string, string]> = {
  D1: ["Rasi", "రాశి"],
  D2: ["Hora", "హోర"],
  D3: ["Drekkana", "ద్రేక్కాణ"],
  D4: ["Chaturthamsa", "చతుర్థాంశ"],
  D7: ["Saptamsa", "సప్తాంశ"],
  D9: ["Navamsa", "నవాంశ"],
  D10: ["Dasamsa", "దశాంశ"],
  D12: ["Dwadasamsa", "ద్వాదశాంశ"],
  D16: ["Shodasamsa", "షోడశాంశ"],
  D20: ["Vimshamsa", "వింశాంశ"],
  D24: ["Chaturvimshamsa", "చతుర్వింశాంశ"],
  D27: ["Saptavimshamsa", "సప్తవింశాంశ"],
  D30: ["Trimsamsa", "త్రింశాంశ"],
  D40: ["Khavedamsa", "ఖవేదాంశ"],
  D45: ["Akshavedamsa", "అక్షవేదాంశ"],
  D60: ["Shashtiamsa", "షష్ట్యాంశ"],
};
const TE: Record<string, string> = {
  workspace: "దక్షిణ భారత జ్యోతిష్య కార్యస్థలం",
  methodology: "పద్ధతి",
  evidence: "వ్యాఖ్యానానికి ముందు ఆధారం",
  hero: "ప్రశ్నించగల జాతకం.",
  heroBody:
    "పారదర్శక గణనలు, ప్రాంతీయ సంప్రదాయాలు, జాగ్రత్తగల AI వివరణ ఒకే Cloudflare వ్యవస్థలో.",
  cast: "జాతకం వేయండి",
  calculated: "ముందుగా గణన",
  calculatedBody: "AI గ్రహస్థితులను ఊహించదు.",
  sources: "ఆధారాలు కనిపిస్తాయి",
  sourcesBody: "ప్రతి నియమానికి మూలం ఉంటుంది.",
  regional: "ప్రాంతీయ పద్ధతి",
  regionalBody: "దక్షిణ భారత చక్రాలు ప్రధాన భాగం.",
  details: "జనన వివరాలు",
  moment: "నమోదైన సమయంతో ప్రారంభించండి.",
  name: "పూర్తి పేరు",
  place: "స్థలం",
  date: "తేదీ",
  time: "స్థానిక సమయం",
  latitude: "అక్షాంశం",
  longitude: "రేఖాంశం",
  offset: "UTC వ్యత్యాసం",
  calculate: "జాతకం గణించండి",
  calculating: "గణిస్తోంది...",
  privacy:
    "ఈ పరిశోధనా నిర్మాణంలో జనన వివరాలు ఎడ్జ్ వద్ద ప్రాసెస్ అవుతాయి. నిల్వ చేయబడవు.",
  empty: "మీ జాతకం ఇక్కడ కనిపిస్తుంది.",
  emptyBody: "చెన్నై నమూనాను ఉపయోగించండి లేదా మరో జనన సమయాన్ని నమోదు చేయండి.",
  chartFor: "జాతకం",
  reproducible: "పునరుత్పాదక ఫలితం",
  lagna: "లగ్నం",
  birthStar: "జన్మ నక్షత్రం",
  birthDasha: "జన్మ దశ",
  panchanga: "పంచాంగం",
  interpret: "వాస్తవాలను వివరించండి, కల్పనను కాదు.",
  interpretBody:
    "AI పూర్తి జాతకాన్ని మార్చలేని ఆధారంగా తీసుకుని, పరిశీలనను సంప్రదాయం నుండి వేరు చేస్తుంది.",
  ask: "ఈ జాతకం గురించి అడగండి",
  askButton: "సహదేవుని అడగండి",
  reading: "వివరిస్తోంది...",
  connect: "ఒకసారి కలపండి. ఎక్కడైనా ఉపయోగించండి.",
  connectBody:
    "సహదేవ గణనలు MCP సాధనాలుగా అందుబాటులో ఉంటాయి. ఇతర క్లయింట్లు ఈ ఇంటర్‌ఫేస్ లేకుండానే జాతకాన్ని పరిశీలించవచ్చు.",
  copy: "ఎండ్‌పాయింట్ కాపీ",
  copied: "కాపీ అయింది",
  disclaimer:
    "జ్యోతిష్యం సాంస్కృతిక, వ్యాఖ్యాన సంప్రదాయంగా మాత్రమే చూపబడుతుంది. ఇది శాస్త్రీయ లేదా వైద్య వాస్తవం కాదు.",
};

export default function App() {
  const [form, setForm] = useState(sample);
  const [chart, setChart] = useState<ChartResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [calculationError, setCalculationError] = useState("");
  const [question, setQuestion] = useState(
    "What are the clearest themes in this chart?",
  );
  const [reading, setReading] = useState("");
  const [readingMeta, setReadingMeta] = useState<{
    provider: string;
    model: string;
  } | null>(null);
  const [readingStatus, setReadingStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [copied, setCopied] = useState(false);
  const [selectedVarga, setSelectedVarga] = useState("D9");
  const [knowledge, setKnowledge] = useState<{
    approved_rules?: number;
    active_reviewers?: number;
    readiness?: string;
  } | null>(null);
  const [uncertainty, setUncertainty] = useState<{
    stability: {
      lagnaSigns: number[];
      moonPadas: string[];
      navamsaLagnaSigns: number[];
    };
    samples: Array<{ offsetMinutes: number }>;
    notice: string;
  } | null>(null);
  const [ingresses, setIngresses] = useState<{
    events: Array<{
      name: string;
      fromSign: number;
      toSign: number;
      julianDay: number;
      retrograde: boolean;
    }>;
    precision: string;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "locating" | "found" | "error"
  >("idle");
  const [locationChoices, setLocationChoices] = useState<KnownLocation[]>([]);
  const [locationVerified, setLocationVerified] = useState(true);
  const [locationSource, setLocationSource] = useState<
    "catalogue" | "geoapify" | "workers-ai" | "coordinates" | null
  >("catalogue");
  const [dashaCalendar, setDashaCalendar] = useState<{
    current: {
      mahadasha: string | null;
      antardasha: string | null;
      pratyantardasha: string | null;
    };
    timeline: Array<{
      lord: string;
      startJulianDay: number;
      endJulianDay: number;
      ageAtStartYears: number;
      antardashas: Array<{
        lord: string;
        startJulianDay: number;
        endJulianDay: number;
        ageAtStartYears: number;
      }>;
    }>;
  } | null>(null);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("sahadeva_api_key") || "",
  );
  const [storageConsent, setStorageConsent] = useState(false);
  const [savedChart, setSavedChart] = useState<{
    id: string;
    key: string;
  } | null>(null);
  const [vaultCharts, setVaultCharts] = useState<
    Array<{
      id: string;
      label: string;
      expires_at: string | null;
      created_at: string;
    }>
  >([]);
  const [vaultShares, setVaultShares] = useState<
    Array<{
      id: string;
      chart_id: string;
      chart_label: string;
      expires_at: string;
      revoked_at: string | null;
      access_count: number;
    }>
  >([]);
  const [vaultUsage, setVaultUsage] = useState<
    Array<{ usage_date: string; operation: string; count: number }>
  >([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultStatus, setVaultStatus] = useState("");
  const [aiStatus, setAiStatus] = useState<{
    available: boolean;
    provider: string;
    model: string;
    hosting: string;
  } | null>(null);

  const lagna = useMemo(
    () => chart?.placements.find((p) => p.name === "Lagna"),
    [chart],
  );
  const moon = useMemo(
    () => chart?.placements.find((p) => p.name === "Moon"),
    [chart],
  );
  const te = form.language === "te";
  const everydayReading = useMemo(
    () =>
      chart
        ? buildEverydayReading(chart, dashaCalendar?.current, te ? "te" : "en")
        : null,
    [chart, dashaCalendar, te],
  );
  const t = (key: string, fallback: string) =>
    te ? TE[key] || fallback : fallback;
  const grahaName = (name: string | null) =>
    name ? (te ? TELUGU_GRAHAS[name] || name : name) : "—";
  const eventTime = (jd: number | null) =>
    jd === null
      ? "Unavailable"
      : new Intl.DateTimeFormat(te ? "te-IN" : "en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(
          new Date(
            (jd -
              2440587.5 +
              (chart?.engine.timezone.resolvedOffsetHours ??
                form.timezoneOffset) /
                24) *
              86400000,
          ),
        );

  useEffect(() => {
    fetch("/api/knowledge/status")
      .then((response) => (response.ok ? response.json() : null))
      .then(setKnowledge)
      .catch(() => setKnowledge(null));
    fetch("/api/ai/status")
      .then((response) => (response.ok ? response.json() : null))
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  }, []);
  useEffect(() => {
    const match = location.pathname.match(/^\/shared\/([^/]+)$/),
      fragment = new URLSearchParams(location.hash.slice(1)),
      key = fragment.get("key");
    if (!match || !key) return;
    fetch(`/api/shared/${match[1]}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(async (data) => {
        const decoded = Uint8Array.from(
            atob(data.encrypted_blob),
            (character) => character.charCodeAt(0),
          ),
          iv = decoded.slice(0, 12),
          cipher = decoded.slice(12),
          raw = Uint8Array.from(
            atob(key.replace(/-/g, "+").replace(/_/g, "/")),
            (character) => character.charCodeAt(0),
          ),
          cryptoKey = await crypto.subtle.importKey(
            "raw",
            raw,
            "AES-GCM",
            false,
            ["decrypt"],
          ),
          plain = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            cryptoKey,
            cipher,
          );
        setChart(JSON.parse(new TextDecoder().decode(plain)));
        setVaultStatus("Private shared chart decrypted in this browser.");
      })
      .catch(() =>
        setVaultStatus(
          "This private share is invalid, expired, or cannot be decrypted.",
        ),
      );
  }, []);

  function update<K extends keyof BirthInput>(key: K, value: BirthInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseLocation(value: string) {
    const resolution = resolveKnownLocation(value),
      selected = resolution.status === "resolved" ? resolution.location : null,
      choices =
        resolution.status === "ambiguous"
          ? resolution.matches
          : value.trim().length >= 2
            ? searchKnownLocations(value, 6)
            : [];
    setLocationChoices(selected ? [] : choices);
    setLocationVerified(Boolean(selected));
    setLocationSource(selected ? "catalogue" : null);
    setForm((current) =>
      selected
        ? {
            ...current,
            place: locationLabel(selected),
            latitude: selected.latitude,
            longitude: selected.longitude,
            timezoneOffset: selected.timezoneOffset,
            timezone: selected.timezone,
          }
        : { ...current, place: value, timezone: undefined },
    );
  }
  function selectLocation(selected: KnownLocation) {
    setForm((current) => ({
      ...current,
      place: locationLabel(selected),
      latitude: selected.latitude,
      longitude: selected.longitude,
      timezoneOffset: selected.timezoneOffset,
      timezone: selected.timezone,
    }));
    setLocationChoices([]);
    setLocationVerified(true);
    setLocationSource("catalogue");
  }
  function verifyManualCoordinates() {
    if (
      Number.isFinite(form.latitude) &&
      form.latitude >= -90 &&
      form.latitude <= 90 &&
      Number.isFinite(form.longitude) &&
      form.longitude >= -180 &&
      form.longitude <= 180 &&
      form.place.trim()
    ) {
      setLocationVerified(true);
      setLocationSource("coordinates");
      setLocationChoices([]);
      setCalculationError("");
    } else {
      setLocationVerified(false);
      setCalculationError(
        "Enter a place name and valid latitude/longitude before confirming the location.",
      );
    }
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6)),
          longitude = Number(position.coords.longitude.toFixed(6));
        setForm((current) => ({
          ...current,
          place: `Device location (${latitude}, ${longitude})`,
          latitude,
          longitude,
          timezoneOffset: -(
            new Date(`${current.date}T${current.time}:00`).getTimezoneOffset() /
            60
          ),
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        }));
        setLocationStatus("found");
        setLocationVerified(true);
        setLocationSource("coordinates");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setCalculationError("");
    setReading("");
    try {
      let calculationForm = form;
      if (!locationVerified) {
        setLocationStatus("locating");
        const locationResponse = await fetch("/api/locations/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            place: form.place,
            date: form.date,
            time: form.time,
          }),
        });
        const resolved = (await locationResponse.json()) as {
          error?: string;
          place: string;
          latitude: number;
          longitude: number;
          timezone: string;
          timezoneOffset: number;
          source: "catalogue" | "geoapify" | "workers-ai";
        };
        if (!locationResponse.ok)
          throw new Error(
            resolved.error ||
              "The place could not be resolved. Add district, state, or country.",
          );
        calculationForm = { ...form, ...resolved };
        setForm(calculationForm);
        setLocationVerified(true);
        setLocationSource(resolved.source);
        setLocationStatus("found");
      }
      const options = {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(calculationForm),
      };
      const [response, uncertaintyResponse, ingressResponse, dashaResponse] =
        await Promise.all([
          fetch("/api/chart", options),
          fetch("/api/uncertainty", options),
          fetch("/api/ingresses", {
            ...options,
            body: JSON.stringify({ ...calculationForm, days: 30 }),
          }),
          fetch("/api/dasha/calendar", options),
        ]);
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "Too many calculations. Wait one minute and try again."
            : `Calculation failed (${response.status}).`,
        );
      const calculated = (await response.json()) as ChartResult;
      setUncertainty(
        uncertaintyResponse.ok ? await uncertaintyResponse.json() : null,
      );
      setIngresses(ingressResponse.ok ? await ingressResponse.json() : null);
      setDashaCalendar(dashaResponse.ok ? await dashaResponse.json() : null);
      setChart(calculated);
      setSelectedVarga(
        calculated.advanced.guidance.focus.recommendedVarga === "D1"
          ? "D9"
          : calculated.advanced.guidance.focus.recommendedVarga,
      );
      setStatus("idle");
    } catch (error) {
      setCalculationError(
        !navigator.onLine
          ? "You are offline. Reconnect and try again."
          : error instanceof Error
            ? error.message
            : "The chart could not be calculated.",
      );
      setLocationStatus("error");
      setStatus("error");
    }
  }

  async function interpret() {
    if (!chart) return;
    setReadingStatus("loading");
    setReadingMeta(null);
    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          chart,
          question,
          language: te ? "Telugu" : "English",
        }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as {
        response?: string;
        provider?: string;
        model?: string;
      };
      setReading(data.response || "No interpretation was returned.");
      setReadingMeta({
        provider: data.provider || "cloudflare-workers-ai",
        model: data.model || "configured model",
      });
      setReadingStatus("idle");
    } catch {
      setReadingStatus("error");
    }
  }

  async function copyMcpUrl() {
    await navigator.clipboard.writeText(`${window.location.origin}/mcp`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function downloadDashaCalendar() {
    const response = await fetch("/api/dasha.ics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob()),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${form.name.replace(/[^a-zA-Z0-9_-]+/g, "-") || "sahadeva"}-vimshottari.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function downloadPdfReport(privacySafe = false) {
    if (!chart) return;
    setVaultStatus("Building PDF report…");
    try {
      const { buildChartPdf } = await import("./pdfReport"),
        blob = await buildChartPdf(chart, { privacySafe }),
        url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${privacySafe ? "sahadeva-private" : form.name.replace(/[^a-zA-Z0-9_-]+/g, "-") || "sahadeva"}-report.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setVaultStatus("Direct PDF report downloaded.");
    } catch {
      setVaultStatus("PDF generation failed in this browser.");
    }
  }

  const encodeBytes = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes));
  const decodeBytes = (value: string) =>
    Uint8Array.from(
      atob(
        value
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          .padEnd(Math.ceil(value.length / 4) * 4, "="),
      ),
      (character) => character.charCodeAt(0),
    );
  const chartKeyName = (id: string) => `sahadeva_chart_key_${id}`;
  async function loadVaultCharts(key = apiKey) {
    if (!key) return;
    setVaultLoading(true);
    try {
      const headers = { authorization: `Bearer ${key}` };
      const [chartsResponse, sharesResponse, usageResponse] = await Promise.all(
        [
          fetch("/api/charts", { headers }),
          fetch("/api/shares", { headers }),
          fetch("/api/usage", { headers }),
        ],
      );
      if (!chartsResponse.ok) throw new Error();
      const data = (await chartsResponse.json()) as {
        charts: Array<{
          id: string;
          label: string;
          expires_at: string | null;
          created_at: string;
        }>;
      };
      setVaultCharts(data.charts);
      setVaultShares(
        sharesResponse.ok
          ? ((await sharesResponse.json()) as { shares: typeof vaultShares })
              .shares
          : [],
      );
      setVaultUsage(
        usageResponse.ok
          ? ((await usageResponse.json()) as { usage: typeof vaultUsage }).usage
          : [],
      );
      setVaultStatus("");
    } catch {
      setVaultStatus(
        "Vault data could not be loaded. The API key may be invalid or revoked.",
      );
    } finally {
      setVaultLoading(false);
    }
  }
  useEffect(() => {
    if (apiKey) void loadVaultCharts(apiKey);
  }, [apiKey]);
  async function createVault() {
    const response = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: `${form.name} private vault` }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { apiKey: string };
    localStorage.setItem("sahadeva_api_key", data.apiKey);
    setApiKey(data.apiKey);
    setVaultStatus(
      "Private vault enabled. Keep this browser profile and back up the key securely.",
    );
  }
  async function saveEncryptedChart() {
    if (!chart || !apiKey || !storageConsent) return;
    const raw = crypto.getRandomValues(new Uint8Array(32)),
      iv = crypto.getRandomValues(new Uint8Array(12)),
      key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
        "encrypt",
      ]),
      cipher = new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          new TextEncoder().encode(JSON.stringify(chart)),
        ),
      ),
      blob = new Uint8Array(iv.length + cipher.length);
    blob.set(iv);
    blob.set(cipher, iv.length);
    const response = await fetch("/api/charts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        label: chart.input.name,
        encryptedBlob: encodeBytes(blob),
        encryption: { algorithm: "AES-256-GCM", clientSide: true },
        retentionDays: 365,
      }),
    });
    if (!response.ok) {
      setVaultStatus("Encrypted save failed.");
      return;
    }
    const data = (await response.json()) as { id: string };
    const shareKey = encodeBytes(raw)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    localStorage.setItem(chartKeyName(data.id), shareKey);
    setSavedChart({ id: data.id, key: shareKey });
    setVaultStatus("Chart encrypted in this browser and saved for one year.");
    await loadVaultCharts();
  }
  async function openSavedChart(id: string) {
    if (!apiKey) return;
    const storedKey = localStorage.getItem(chartKeyName(id));
    if (!storedKey) {
      setVaultStatus(
        "This browser does not have the decryption key for that chart.",
      );
      return;
    }
    setVaultLoading(true);
    try {
      const response = await fetch(`/api/charts/${id}`, {
        headers: { authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { encrypted_blob: string };
      const decoded = decodeBytes(data.encrypted_blob),
        iv = decoded.slice(0, 12),
        cipher = decoded.slice(12),
        cryptoKey = await crypto.subtle.importKey(
          "raw",
          decodeBytes(storedKey),
          "AES-GCM",
          false,
          ["decrypt"],
        ),
        plain = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          cryptoKey,
          cipher,
        ),
        opened = JSON.parse(new TextDecoder().decode(plain)) as ChartResult;
      setChart(opened);
      setForm(opened.input);
      setSavedChart({ id, key: storedKey });
      setVaultStatus("Saved chart decrypted in this browser.");
      document
        .querySelector("#workspace")
        ?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setVaultStatus(
        "The saved chart could not be decrypted. Its ciphertext was not changed.",
      );
    } finally {
      setVaultLoading(false);
    }
  }
  async function deleteSavedChart(id: string, label: string) {
    if (
      !apiKey ||
      !window.confirm(`Delete “${label}” and all of its private share links?`)
    )
      return;
    const response = await fetch(`/api/charts/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      setVaultStatus("The saved chart could not be deleted.");
      return;
    }
    localStorage.removeItem(chartKeyName(id));
    if (savedChart?.id === id) setSavedChart(null);
    setVaultStatus("Saved chart and its share links were deleted.");
    await loadVaultCharts();
  }
  async function renameSavedChart(id: string, current: string) {
    if (!apiKey) return;
    const label = window.prompt("New chart name", current)?.trim();
    if (!label) return;
    const response = await fetch(`/api/charts/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ label }),
    });
    setVaultStatus(
      response.ok
        ? "Saved chart renamed."
        : "The saved chart could not be renamed.",
    );
    if (response.ok) await loadVaultCharts();
  }
  async function createPrivateShare() {
    if (!savedChart || !apiKey) return;
    const response = await fetch("/api/shares", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        chartId: savedChart.id,
        expiresDays: 7,
        includeBirthDetails: true,
      }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { token: string };
    const url = `${location.origin}/shared/${data.token}#key=${savedChart.key}`;
    await navigator.clipboard.writeText(url);
    setVaultStatus(
      "Encrypted seven-day share link copied. The decryption key stays in the URL fragment and is not sent to the server.",
    );
    await loadVaultCharts();
  }
  async function revokeShare(id: string) {
    if (!apiKey) return;
    const response = await fetch(`/api/shares/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${apiKey}` },
    });
    setVaultStatus(
      response.ok
        ? "Private share revoked."
        : "The private share could not be revoked.",
    );
    if (response.ok) await loadVaultCharts();
  }
  async function copyApiKey() {
    await navigator.clipboard.writeText(apiKey);
    setVaultStatus("Vault API key copied. Store it in a password manager.");
  }
  function downloadBlob(
    contents: BlobPart,
    filename: string,
    type = "application/json",
  ) {
    const url = URL.createObjectURL(new Blob([contents], { type })),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function rotateVaultKey() {
    if (
      !apiKey ||
      !window.confirm(
        "Rotate this API key? The current key will stop working immediately, while encrypted charts and shares remain available through the new key.",
      )
    )
      return;
    const response = await fetch("/api/keys/rotate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        label: `Rotated ${new Date().toLocaleDateString()}`,
      }),
    });
    if (!response.ok) {
      setVaultStatus("API-key rotation failed.");
      return;
    }
    const data = (await response.json()) as { apiKey: string };
    localStorage.setItem("sahadeva_api_key", data.apiKey);
    setApiKey(data.apiKey);
    await navigator.clipboard.writeText(data.apiKey);
    setVaultStatus(
      "API key rotated and copied. The previous key is revoked; store the new key now.",
    );
  }
  async function createNamedKey() {
    if (!apiKey) return;
    const label = window
      .prompt("Name this additional API key", "Read-only integration")
      ?.trim();
    if (!label) return;
    const readOnly = window.confirm(
        "Create a read-only chart key? Choose Cancel for a full-access key.",
      ),
      scopes = readOnly
        ? ["charts:read", "usage:read", "mcp:calculate"]
        : undefined,
      response = await fetch("/api/keys/named", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ label, scopes }),
      });
    if (!response.ok) {
      setVaultStatus("Named key creation failed.");
      return;
    }
    const data = (await response.json()) as { apiKey: string };
    await navigator.clipboard.writeText(data.apiKey);
    setVaultStatus(
      `Named key “${label}” created and copied. It is shown only once.`,
    );
  }
  async function exportEncryptedVault() {
    if (!apiKey) return;
    const response = await fetch("/api/vault/export", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      setVaultStatus("Vault export failed.");
      return;
    }
    downloadBlob(
      JSON.stringify(await response.json(), null, 2),
      `${form.name.replace(/[^a-zA-Z0-9_-]+/g, "-") || "sahadeva"}-encrypted-vault.json`,
    );
    setVaultStatus(
      "Encrypted vault export downloaded. Browser decryption keys are separate.",
    );
  }
  async function exportRecoveryBundle() {
    if (!apiKey) return;
    const password =
      window.prompt(
        "Choose a recovery-bundle password (at least 10 characters). This password is never sent to Sahadeva.",
      ) || "";
    if (password.length < 10) {
      setVaultStatus("Recovery export cancelled: use at least 10 characters.");
      return;
    }
    const chartKeys = Object.fromEntries(
        vaultCharts
          .map((item) => [item.id, localStorage.getItem(chartKeyName(item.id))])
          .filter((entry): entry is [string, string] => Boolean(entry[1])),
      ),
      recovery: BrowserRecovery = {
        schemaVersion: "sahadeva-browser-recovery-1",
        apiKey,
        chartKeys,
        createdAt: new Date().toISOString(),
      },
      bundle = await wrapRecovery(recovery, password);
    downloadBlob(
      JSON.stringify(bundle, null, 2),
      "sahadeva-recovery-bundle.json",
    );
    setVaultStatus(
      "Password-wrapped recovery bundle downloaded. Keep its password separately.",
    );
  }
  function importRecoveryBundle() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0],
        password = window.prompt("Recovery-bundle password") || "";
      if (!file || !password) return;
      try {
        const recovery = await unwrapRecovery(
          JSON.parse(await file.text()) as WrappedRecovery,
          password,
        );
        localStorage.setItem("sahadeva_api_key", recovery.apiKey);
        for (const [id, value] of Object.entries(recovery.chartKeys))
          localStorage.setItem(chartKeyName(id), value);
        setApiKey(recovery.apiKey);
        setSavedChart(null);
        setVaultStatus(
          "Recovery bundle restored in this browser. Loading encrypted charts…",
        );
      } catch {
        setVaultStatus(
          "Recovery bundle could not be decrypted. Existing browser keys were not changed.",
        );
      }
    };
    input.click();
  }
  function importApiKey() {
    const key = window.prompt("Paste your Sahadeva vault API key")?.trim();
    if (!key) return;
    localStorage.setItem("sahadeva_api_key", key);
    setApiKey(key);
    setSavedChart(null);
    setVaultStatus("Vault API key imported. Loading saved charts…");
  }

  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to chart workspace
      </a>
      <main id="main-content">
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark">S</span>
            <span>Sahadeva</span>
          </div>
          <div className="nav-meta">
            {t("workspace", "South Indian Jyotish workspace")}
          </div>
          <div className="nav-actions">
            <select
              aria-label="Language"
              value={form.language}
              onChange={(e) =>
                update("language", e.target.value as "en" | "te")
              }
            >
              <option value="en">English</option>
              <option value="te">తెలుగు</option>
            </select>
            <a href="#research">{t("methodology", "Methodology")}</a>
          </div>
        </nav>

        <nav className="journey-nav" aria-label="Consultation paths">
          <span>Start here</span>
          <a href="#workspace">
            <strong>01</strong> Create chart
          </a>
          <a href="#prashna">
            <strong>02</strong> Ask now
          </a>
          <a href="#ai-reading">
            <strong>03</strong> AI reading
          </a>
        </nav>

        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              {t("evidence", "Evidence before interpretation")}
            </p>
            <h1>{t("hero", "A chart you can question.")}</h1>
            <p>
              {t(
                "heroBody",
                "Transparent calculations, regional conventions, and careful AI narration in one Cloudflare-native workspace.",
              )}
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#workspace">
                {t("cast", "Cast a chart")} <ArrowRight weight="bold" />
              </a>
              <a className="text-link" href="#prashna">
                Ask without birth details
              </a>
            </div>
            <div className="hero-trust" aria-label="Service guarantees">
              <span>Deterministic chart</span>
              <span>No invented placements</span>
              <span>Evidence stays visible</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="solar-disc" />
            <span className="orbit-label label-a">nakshatra</span>
            <span className="orbit-label label-b">dasha</span>
            <span className="orbit-label label-c">panchanga</span>
          </div>
        </header>

        <section className="mode-note" aria-label="Service modes">
          <div>
            <Database />
            <span>
              <strong>Calculation</strong> Always deterministic
            </span>
          </div>
          <div>
            <BookOpen />
            <span>
              <strong>Knowledge</strong>
              {knowledge?.readiness === "reviewed"
                ? `${knowledge.approved_rules} approved rules`
                : "Awaiting expert review"}
            </span>
          </div>
          <div>
            <Brain />
            <span>
              <strong>Narration</strong>
              {aiStatus?.available ? "Workers AI ready" : "Optional Workers AI"}
            </span>
          </div>
          <p>
            {aiStatus?.available
              ? `${aiStatus.model} · calculated evidence remains immutable`
              : "Calculations remain available when narration is offline."}
          </p>
        </section>

        <section className="workspace" id="workspace">
          <form className="birth-form" onSubmit={calculate}>
            <div className="section-heading">
              <span>{t("details", "Birth details")}</span>
              <h2>{t("moment", "Begin with the recorded moment.")}</h2>
            </div>
            <label>
              {t("name", "Full name")}
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </label>
            <label>
              {t("place", "Place")}
              <input
                list="known-locations"
                value={form.place}
                onChange={(e) => chooseLocation(e.target.value)}
                placeholder={
                  te
                    ? "నగరం లేదా గ్రామం వెతకండి"
                    : "Search city or enter a village"
                }
                autoComplete="off"
                aria-describedby={
                  locationChoices.length > 0 ? "location-choices" : undefined
                }
                aria-invalid={!locationVerified}
                required
              />
              <datalist id="known-locations">
                {KNOWN_LOCATIONS.map((location) => (
                  <option
                    key={locationLabel(location)}
                    value={locationLabel(location)}
                  />
                ))}
              </datalist>
            </label>
            {locationChoices.length > 0 && (
              <div
                className="location-choices"
                id="location-choices"
                role="listbox"
                aria-label={
                  te ? "స్థలాన్ని ఎంచుకోండి" : "Choose the intended place"
                }
              >
                <small>
                  {te
                    ? "సరైన స్థలాన్ని ఎంచుకోండి. పేరు మాత్రమే నమోదు చేస్తే పాత కోఆర్డినేట్లు ఉపయోగించబడవు."
                    : "Choose the intended place. Typing a name alone will never reuse old coordinates."}
                </small>
                {locationChoices.map((location) => (
                  <button
                    type="button"
                    role="option"
                    key={locationLabel(location)}
                    onClick={() => selectLocation(location)}
                  >
                    {locationLabel(location)}
                    <span>
                      {location.latitude.toFixed(4)}°,{" "}
                      {location.longitude.toFixed(4)}° · {location.timezone}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div
              className={`location-tools ${locationVerified ? "location-verified" : "location-unverified"}`}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={useDeviceLocation}
                disabled={locationStatus === "locating"}
              >
                {locationStatus === "locating"
                  ? te
                    ? "స్థానం తెలుసుకుంటోంది…"
                    : "Locating…"
                  : te
                    ? "నా ప్రస్తుత స్థానాన్ని ఉపయోగించండి"
                    : "Use my current location"}
              </button>
              <small>
                {locationStatus === "error"
                  ? te
                    ? "స్థాన అనుమతి అందుబాటులో లేదు. అక్షాంశం, రేఖాంశం నమోదు చేయండి."
                    : "Location permission unavailable. Enter coordinates manually."
                  : locationVerified
                    ? `✓ ${form.latitude.toFixed(4)}°, ${form.longitude.toFixed(4)}° · ${form.timezone || `UTC${form.timezoneOffset >= 0 ? "+" : ""}${form.timezoneOffset}`}${locationSource ? ` · ${locationSource === "workers-ai" ? "Workers AI" : locationSource === "geoapify" ? "Geoapify" : locationSource === "catalogue" ? "verified catalogue" : "provided coordinates"}` : ""}`
                    : te
                      ? "గణించే సమయంలో స్థలం సురక్షితంగా గుర్తించబడుతుంది"
                      : "Not in the local list? We’ll resolve it securely when you calculate."}
              </small>
            </div>
            <div className="field-pair">
              <label>
                {t("date", "Date")}
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  required
                />
              </label>
              <label>
                {t("time", "Local time")}
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => update("time", e.target.value)}
                  required
                />
              </label>
            </div>
            <details className="advanced-options">
              <summary>
                {te ? "అధునాతన ఎంపికలు" : "Advanced options"}
                <small>
                  {te
                    ? "కోఆర్డినేట్లు మరియు పద్ధతి"
                    : "Coordinates, method and reading focus"}
                </small>
              </summary>
              <div className="field-pair">
                <label>
                  {t("latitude", "Latitude")}
                  <input
                    type="number"
                    step="0.0001"
                    value={form.latitude}
                    onChange={(e) => {
                      update("latitude", Number(e.target.value));
                      setLocationVerified(false);
                    }}
                  />
                </label>
                <label>
                  {t("longitude", "Longitude")}
                  <input
                    type="number"
                    step="0.0001"
                    value={form.longitude}
                    onChange={(e) => {
                      update("longitude", Number(e.target.value));
                      setLocationVerified(false);
                    }}
                  />
                </label>
              </div>
              <label>
                {t("offset", "UTC offset")}
                <input
                  type="number"
                  step="0.25"
                  value={form.timezoneOffset}
                  onChange={(e) => {
                    update("timezoneOffset", Number(e.target.value));
                    setLocationVerified(false);
                  }}
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={verifyManualCoordinates}
              >
                {te
                  ? "ఈ కోఆర్డినేట్లను నిర్ధారించండి"
                  : "Confirm these coordinates"}
              </button>
              <div className="field-pair">
                <label>
                  {te ? "పద్ధతి" : "Methodology"}
                  <select
                    value={form.methodology}
                    onChange={(e) =>
                      update(
                        "methodology",
                        e.target.value as BirthInput["methodology"],
                      )
                    }
                  >
                    <option value="parashari">Parāśari</option>
                    <option value="kp">KP — coming soon</option>
                    <option value="western">Western — coming soon</option>
                    <option value="comparative">
                      Comparative — coming soon
                    </option>
                  </select>
                </label>
                <label>
                  {te ? "భావ పద్ధతి" : "House system"}
                  <select
                    value={form.houseSystem || "whole-sign"}
                    onChange={(e) =>
                      update(
                        "houseSystem",
                        e.target.value as BirthInput["houseSystem"],
                      )
                    }
                  >
                    <option value="whole-sign">Whole sign</option>
                    <option value="equal">Equal 30°</option>
                    <option value="sripati">Sripati</option>
                  </select>
                </label>
              </div>
              <label>
                {te ? "పరిశీలన అంశం" : "Reading focus"}
                <select
                  value={form.focus}
                  onChange={(e) =>
                    update("focus", e.target.value as BirthInput["focus"])
                  }
                >
                  <option value="general">General</option>
                  <option value="career">Career</option>
                  <option value="marriage">Marriage</option>
                  <option value="children">Children</option>
                  <option value="education">Education</option>
                  <option value="property">Property</option>
                  <option value="health">Health</option>
                  <option value="spirituality">Spirituality</option>
                </select>
              </label>
              <label>
                {te
                  ? "జనన సమయ ఖచ్చితత్వం (± నిమిషాలు)"
                  : "Birth-time accuracy (± minutes)"}
                <input
                  type="number"
                  min="0"
                  max="1440"
                  step="1"
                  value={form.birthTimeAccuracyMinutes}
                  onChange={(e) =>
                    update("birthTimeAccuracyMinutes", Number(e.target.value))
                  }
                />
              </label>
            </details>
            {status === "error" && (
              <p className="error" role="alert">
                <Warning /> {calculationError}
              </p>
            )}
            <button type="submit" disabled={status === "loading"}>
              {status === "loading"
                ? t("calculating", "Calculating...")
                : t("calculate", "Calculate chart")}
            </button>
            <p className="privacy">
              {t(
                "privacy",
                "Birth details are processed at the edge. Persistence is not enabled in this research build.",
              )}
            </p>
          </form>

          <div
            className="result-panel"
            aria-busy={status === "loading"}
            aria-live="polite"
          >
            {status === "loading" && !chart && (
              <div className="calculation-skeleton" role="status">
                <span />
                <span />
                <span />
                <p>{t("calculating", "Calculating...")}</p>
              </div>
            )}
            {status !== "loading" && !chart && (
              <div className="empty">
                <div className="empty-chart" />
                <h2>{t("empty", "Your chart will appear here.")}</h2>
                <p>
                  {t(
                    "emptyBody",
                    "Use the Chennai sample or enter another recorded birth moment.",
                  )}
                </p>
              </div>
            )}
            {chart && (
              <>
                <div className="result-header">
                  <div>
                    <span>{t("chartFor", "Chart for")}</span>
                    <h2>{chart.input.name}</h2>
                    <p>{chart.input.place}</p>
                  </div>
                  <div className="engine-badge">
                    <CheckCircle weight="fill" />{" "}
                    {t("reproducible", "Reproducible result")}
                  </div>
                </div>
                <div className="varga-picker">
                  <label>
                    {te ? "విభాగ చక్రం" : "Divisional chart"}
                    <select
                      value={selectedVarga}
                      onChange={(event) => setSelectedVarga(event.target.value)}
                    >
                      {Object.keys(chart.advanced.vargas).map((key) => (
                        <option key={key} value={key}>
                          {key} — {VARGA_NAMES[key]?.[te ? 1 : 0] || key}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>
                    {te
                      ? "పారాశరి షోడశవర్గంలోని 16 చక్రాలు"
                      : "All 16 charts in the Parashari Shodashavarga set"}
                  </small>
                </div>
                <div className="chart-pair">
                  <SouthChart
                    placements={chart.advanced.vargas.D1}
                    title={`${VARGA_NAMES.D1[te ? 1 : 0]} D1`}
                    language={form.language}
                  />
                  <SouthChart
                    placements={chart.advanced.vargas[selectedVarga]}
                    title={`${VARGA_NAMES[selectedVarga]?.[te ? 1 : 0] || selectedVarga} ${selectedVarga}`}
                    language={form.language}
                  />
                </div>
                <div className="key-facts">
                  <div>
                    <span>{t("lagna", "Lagna")}</span>
                    <strong>
                      {lagna
                        ? te
                          ? TELUGU_SIGNS[lagna.sign]
                          : SIGNS[lagna.sign]
                        : ""}
                    </strong>
                    <small>{lagna?.degree.toFixed(2)}°</small>
                  </div>
                  <div>
                    <span>{t("birthStar", "Janma nakshatra")}</span>
                    <strong>{moon?.nakshatra}</strong>
                    <small>
                      {te ? "పాదం" : "Pada"} {moon?.pada}
                    </small>
                  </div>
                  <div>
                    <span>{t("birthDasha", "Birth dasha")}</span>
                    <strong>{chart.vimshottari.birthLord}</strong>
                    <small>
                      {chart.vimshottari.balanceYears.toFixed(2)}{" "}
                      {te ? "సంవత్సరాల శేషం" : "years balance"}
                    </small>
                  </div>
                </div>
                {everydayReading && (
                  <section
                    className="everyday-reading"
                    aria-label={
                      te ? "సాధారణ జాతక వివరణ" : "Plain-language chart reading"
                    }
                  >
                    <div className="everyday-reading-head">
                      <span>
                        {te ? "మీ సంప్రదింపు సారాంశం" : "Consultation brief"}
                      </span>
                      <h3>
                        {te ? "ముందుగా ముఖ్యమైన విషయాలు" : "What matters most"}
                      </h3>
                      <p>{everydayReading.summary}</p>
                    </div>
                    <div
                      className="report-roadmap"
                      aria-label="Report structure"
                    >
                      <span>01 · Priorities</span>
                      <span>02 · Current chapter</span>
                      <span>03 · Practical counsel</span>
                      <span>04 · Evidence</span>
                    </div>
                    <div className="everyday-reading-grid reading-priorities">
                      {everydayReading.sections
                        .filter((section) =>
                          ["focus", "timing", "counsel"].includes(section.id),
                        )
                        .map((section) => (
                          <article key={section.id}>
                            <span
                              className={`reading-status ${section.status}`}
                            >
                              {section.status.replace("-", " ")}
                            </span>
                            <h4>{section.title}</h4>
                            <p>{section.message}</p>
                            <details>
                              <summary>
                                {te
                                  ? "ఈ వివరణ ఎందుకు?"
                                  : "Why am I seeing this?"}
                              </summary>
                              {section.evidence.map((item) => (
                                <small key={item}>{item}</small>
                              ))}
                            </details>
                          </article>
                        ))}
                    </div>
                    <details className="supporting-reading">
                      <summary>
                        <span>
                          {te
                            ? "లోతైన ఆధారాన్ని పరిశీలించండి"
                            : "Explore the supporting reading"}
                        </span>
                        <small>
                          {everydayReading.sections.length - 3} focused sections
                        </small>
                      </summary>
                      <div className="everyday-reading-grid">
                        {everydayReading.sections
                          .filter(
                            (section) =>
                              !["focus", "timing", "counsel"].includes(
                                section.id,
                              ),
                          )
                          .map((section) => (
                            <article key={section.id}>
                              <span
                                className={`reading-status ${section.status}`}
                              >
                                {section.status.replace("-", " ")}
                              </span>
                              <h4>{section.title}</h4>
                              <p>{section.message}</p>
                              <details>
                                <summary>
                                  {te
                                    ? "ఈ వివరణ ఎందుకు?"
                                    : "See calculated evidence"}
                                </summary>
                                {section.evidence.map((item) => (
                                  <small key={item}>{item}</small>
                                ))}
                              </details>
                            </article>
                          ))}
                      </div>
                    </details>
                    <div className="everyday-confidence">
                      <strong>
                        {te ? "విశ్వసనీయత" : "Reading confidence"}:{" "}
                        {everydayReading.confidence.score}/100 ·{" "}
                        {everydayReading.confidence.label}
                      </strong>
                      <span>{everydayReading.confidence.message}</span>
                    </div>
                    <small className="everyday-notice">
                      {everydayReading.notice}
                    </small>
                  </section>
                )}
                <div
                  className={`confidence-card confidence-${chart.advanced.guidance.confidence.level}`}
                >
                  <div>
                    <span>{te ? "విశ్వసనీయత" : "Confidence"}</span>
                    <strong>
                      {chart.advanced.guidance.confidence.score}/100 ·{" "}
                      {chart.advanced.guidance.confidence.level}
                    </strong>
                  </div>
                  <div>
                    <span>{te ? "పరిశీలన క్రమం" : "Evidence path"}</span>
                    <strong>
                      H{chart.advanced.guidance.focus.relevantHouse} →{" "}
                      {chart.advanced.guidance.evidence.relevantHouseLord} →{" "}
                      {chart.advanced.guidance.focus.karakas.join(" / ")} →{" "}
                      {chart.advanced.guidance.focus.recommendedVarga}
                    </strong>
                  </div>
                  <p>{chart.advanced.guidance.confidence.factors.join(" ")}</p>
                </div>
                <div className="evidence-panels">
                  <section>
                    <h3>{te ? "జనన దశా స్థితి" : "Birth-period state"}</h3>
                    <p>
                      {chart.advanced.birthPeriods.mahadasha} →{" "}
                      {chart.advanced.birthPeriods.antardasha} →{" "}
                      {chart.advanced.birthPeriods.pratyantardasha}
                    </p>
                    <small>
                      {te
                        ? "మహాదశ → అంతర్దశ → ప్రత్యంతర్దశ"
                        : "Mahadasha → Antardasha → Pratyantardasha"}
                    </small>
                  </section>
                  <section>
                    <h3>{te ? "సర్వాష్టకవర్గం" : "Sarvashtakavarga"}</h3>
                    <div className="sav-grid">
                      {chart.advanced.ashtakavarga.sarva.signs.map(
                        (score, sign) => (
                          <span key={sign}>
                            <small>
                              {te ? TELUGU_SIGNS[sign] : SIGNS[sign]}
                            </small>
                            <strong>{score}</strong>
                          </span>
                        ),
                      )}
                    </div>
                    <p>
                      {te ? "మొత్తం" : "Total"}:{" "}
                      {chart.advanced.ashtakavarga.sarva.total} ·{" "}
                      {te
                        ? "త్రికోణ, ఏకాధిపత్య శోధనలు వేరు గణించబడ్డాయి"
                        : "Trikona and Ekadhipatya reductions computed separately"}
                    </p>
                  </section>
                </div>
                {dashaCalendar && (
                  <section className="dasha-calendar">
                    <div className="dasha-calendar-head">
                      <div>
                        <span>
                          {te ? "వింశోత్తరి కాలరేఖ" : "Vimshottari calendar"}
                        </span>
                        <h3>
                          {dashaCalendar.current.mahadasha} →{" "}
                          {dashaCalendar.current.antardasha} →{" "}
                          {dashaCalendar.current.pratyantardasha}
                        </h3>
                      </div>
                      <div>
                        <button type="button" onClick={downloadDashaCalendar}>
                          {te ? "కాలెండర్ డౌన్‌లోడ్" : "Download calendar"}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => downloadPdfReport(false)}
                        >
                          {te ? "సంప్రదింపు PDF" : "Download consultation PDF"}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => downloadPdfReport(true)}
                        >
                          {te ? "గోప్యత PDF" : "Privacy-safe PDF"}
                        </button>
                      </div>
                    </div>
                    <div>
                      {dashaCalendar.timeline.map((maha) => (
                        <details
                          key={`${maha.lord}-${maha.startJulianDay}`}
                          open={maha.lord === dashaCalendar.current.mahadasha}
                        >
                          <summary>
                            <strong>
                              {maha.lord} {te ? "మహాదశ" : "Mahadasha"}
                            </strong>
                            <span>
                              {eventTime(maha.startJulianDay)} –{" "}
                              {eventTime(maha.endJulianDay)} ·{" "}
                              {te ? "వయస్సు" : "age"}{" "}
                              {maha.ageAtStartYears.toFixed(1)}
                            </span>
                          </summary>
                          {maha.antardashas.map((antar) => (
                            <p
                              key={`${antar.lord}-${antar.startJulianDay}`}
                              className={
                                maha.lord === dashaCalendar.current.mahadasha &&
                                antar.lord === dashaCalendar.current.antardasha
                                  ? "active-period"
                                  : ""
                              }
                            >
                              <strong>{antar.lord}</strong>
                              <span>
                                {eventTime(antar.startJulianDay)} –{" "}
                                {eventTime(antar.endJulianDay)} ·{" "}
                                {te ? "వయస్సు" : "age"}{" "}
                                {antar.ageAtStartYears.toFixed(1)}
                              </span>
                            </p>
                          ))}
                        </details>
                      ))}
                    </div>
                    <small>
                      {te
                        ? "కాలెండర్ అంతర్దశలను కలిగి ఉంటుంది. జ్యోతిష్యం వ్యాఖ్యాన సంప్రదాయం మాత్రమే."
                        : "Calendar export contains Antardasha boundaries. Astrology is an interpretive tradition."}
                    </small>
                  </section>
                )}
                <details className="planet-states">
                  <summary>
                    {te
                      ? "గ్రహ స్థితులు మరియు షడ్బలం"
                      : "Planetary states and Shadbala"}
                  </summary>
                  <div>
                    {chart.advanced.planetaryStates.avasthas.map((state) => (
                      <p key={state.name}>
                        <strong>{state.name}</strong>
                        <span>
                          {state.balaadiAvastha} · total{" "}
                          {state.shadbalaTotalVirupas?.toFixed(2) ??
                            "unavailable"}{" "}
                          / required {state.requiredVirupas.toFixed(0)} · ratio{" "}
                          {state.requiredStrengthRatio?.toFixed(3) ?? "—"} ·
                          position{" "}
                          {(
                            state.uchchaBalaVirupas +
                            state.saptavargajaBalaVirupas +
                            state.ojhayugmaBalaVirupas +
                            state.kendradiBalaVirupas +
                            state.drekkanaBalaVirupas
                          ).toFixed(2)}{" "}
                          · direction {state.digBalaVirupas.toFixed(2)} · Ayana{" "}
                          {state.ayanaBalaVirupas?.toFixed(2) ?? "—"} · Cheshta{" "}
                          {state.cheshtaBalaVirupas?.toFixed(2) ?? "—"} · Drik{" "}
                          {state.drikBalaVirupas.toFixed(2)} Virupas
                          {state.retrograde
                            ? ` · ${te ? "వక్ర" : "retrograde"}`
                            : ""}
                        </span>
                      </p>
                    ))}
                  </div>
                  <small>
                    {chart.advanced.planetaryStates.shadbala.notice}
                  </small>
                </details>
                <details className="planet-states">
                  <summary>
                    {te
                      ? "భావాలు, ఆరూఢాలు మరియు ప్రత్యేక లగ్నాలు"
                      : "Bhavas, Arudhas and special Lagnas"}
                  </summary>
                  <p>{chart.advanced.houses.sripati.convention}</p>
                  {chart.advanced.houses.sripati.status === "supported" && (
                    <>
                      <p>
                        MC:{" "}
                        {chart.advanced.houses.sripati.midheaven?.siderealLongitude.toFixed(
                          4,
                        )}
                        ° · 12 Madhyas / 12 Sandhis
                      </p>
                      <div>
                        {chart.advanced.houses.equalBhava.planetHouses.map(
                          (planet) => {
                            const sripati =
                              chart.advanced.houses.sripati.planetHouses.find(
                                (item) => item.name === planet.name,
                              );
                            return (
                              <p key={planet.name}>
                                <strong>{planet.name}</strong>
                                <span>
                                  whole H{planet.wholeSignHouse} · equal H
                                  {planet.equalBhavaHouse} · Sripati H
                                  {sripati?.sripatiHouse}
                                </span>
                              </p>
                            );
                          },
                        )}
                      </div>
                    </>
                  )}
                  <small>{chart.advanced.houses.sripati.notice}</small>
                  <p>
                    AL:{" "}
                    {te
                      ? TELUGU_SIGNS[
                          chart.advanced.houses.arudhas.values[0].padaSign
                        ]
                      : SIGNS[
                          chart.advanced.houses.arudhas.values[0].padaSign
                        ]}{" "}
                    · UL:{" "}
                    {te
                      ? TELUGU_SIGNS[
                          chart.advanced.houses.arudhas.values[11].padaSign
                        ]
                      : SIGNS[
                          chart.advanced.houses.arudhas.values[11].padaSign
                        ]}
                  </p>
                  <div>
                    {chart.advanced.houses.temporalLagnas.values.map((item) => (
                      <p key={item.name}>
                        <strong>{item.name}</strong>
                        <span>
                          {te ? TELUGU_SIGNS[item.sign] : SIGNS[item.sign]}{" "}
                          {item.degree.toFixed(2)}°
                        </span>
                      </p>
                    ))}
                    {chart.advanced.houses.targetedLagnas.values.map((item) => (
                      <p key={item.name}>
                        <strong>{item.name}</strong>
                        <span>
                          {te ? TELUGU_SIGNS[item.sign] : SIGNS[item.sign]}{" "}
                          {item.degree.toFixed(2)}°
                        </span>
                      </p>
                    ))}
                  </div>
                  <small>{chart.advanced.houses.temporalLagnas.notice}</small>
                  <small>{chart.advanced.houses.targetedLagnas.notice}</small>
                </details>
                <details className="planet-states">
                  <summary>
                    {te ? "అష్టకవర్గ పిండాలు" : "Ashtakavarga Pindas"}
                  </summary>
                  <div>
                    {Object.entries(
                      chart.advanced.ashtakavarga.pinda.values,
                    ).map(([planet, value]) => (
                      <p key={planet}>
                        <strong>{planet}</strong>
                        <span>
                          Rāśi {value.rasiPinda} · Graha {value.grahaPinda} ·
                          Yoga {value.yogaPinda}
                        </span>
                      </p>
                    ))}
                  </div>
                  <small>{chart.advanced.ashtakavarga.pinda.convention}</small>
                </details>
                <details className="planet-states">
                  <summary>
                    {te
                      ? "నిర్మాణాత్మక యోగ అభ్యర్థులు"
                      : "Structural yoga candidates"}
                  </summary>
                  <div>
                    {chart.advanced.yogas
                      .filter((yoga) => yoga.detected)
                      .map((yoga) => (
                        <p key={yoga.yoga}>
                          <strong>{yoga.yoga}</strong>
                          <span>{yoga.evidence.join(" · ")}</span>
                        </p>
                      ))}
                  </div>
                  <small>
                    {te
                      ? "ఇవి నిర్మాణ సరిపోలికలు మాత్రమే; ఫలిత నిర్ధారణలు కావు."
                      : "These are structural matches only, not outcome claims. Interpretation requires reviewed rules and context."}
                  </small>
                </details>
                {uncertainty && (
                  <details className="planet-states">
                    <summary>
                      {te
                        ? "జనన సమయ అనిశ్చితి పరీక్ష"
                        : "Birth-time uncertainty simulation"}
                    </summary>
                    <p>
                      {te ? "లగ్న రాశులు" : "Lagna signs"}:{" "}
                      {uncertainty.stability.lagnaSigns
                        .map((sign) => (te ? TELUGU_SIGNS[sign] : SIGNS[sign]))
                        .join(", ")}
                    </p>
                    <p>
                      {te ? "నవాంశ లగ్నాలు" : "Navamsa Lagna signs"}:{" "}
                      {uncertainty.stability.navamsaLagnaSigns
                        .map((sign) => (te ? TELUGU_SIGNS[sign] : SIGNS[sign]))
                        .join(", ")}
                    </p>
                    <p>
                      {te ? "చంద్ర పాదాలు" : "Moon padas"}:{" "}
                      {uncertainty.stability.moonPadas.join(", ")}
                    </p>
                    <small>
                      {uncertainty.samples.length} samples ·{" "}
                      {uncertainty.notice}
                    </small>
                  </details>
                )}
                {ingresses && (
                  <details className="planet-states">
                    <summary>
                      {te
                        ? "రాబోయే 30 రోజుల రాశి ప్రవేశాలు"
                        : "Next 30 days: sidereal ingresses"}
                    </summary>
                    <div>
                      {ingresses.events.map((event) => (
                        <p key={`${event.name}-${event.julianDay}`}>
                          <strong>{event.name}</strong>
                          <span>
                            {te
                              ? TELUGU_SIGNS[event.fromSign]
                              : SIGNS[event.fromSign]}{" "}
                            →{" "}
                            {te
                              ? TELUGU_SIGNS[event.toSign]
                              : SIGNS[event.toSign]}{" "}
                            · {eventTime(event.julianDay)}
                            {event.retrograde ? " · retrograde" : ""}
                          </span>
                        </p>
                      ))}
                    </div>
                    <small>{ingresses.precision}</small>
                  </details>
                )}
                <div className="panchanga">
                  <h3>{t("panchanga", "Panchanga")}</h3>
                  {Object.entries(chart.panchanga)
                    .filter(([key]) => key !== "events")
                    .map(([key, value]) => (
                      <div key={key}>
                        <span>{key}</span>
                        <strong>{String(value)}</strong>
                      </div>
                    ))}
                </div>
                <div className="event-times">
                  <h3>{te ? "తదుపరి మార్పులు" : "Next transitions"}</h3>
                  <div>
                    <span>{te ? "సూర్యోదయం" : "Sunrise"}</span>
                    <strong>
                      {eventTime(chart.panchanga.events.sunriseJulianDay)}
                    </strong>
                  </div>
                  <div>
                    <span>{te ? "సూర్యాస్తమయం" : "Sunset"}</span>
                    <strong>
                      {eventTime(chart.panchanga.events.sunsetJulianDay)}
                    </strong>
                  </div>
                  <div>
                    <span>{te ? "తిథి ముగింపు" : "Tithi ends"}</span>
                    <strong>
                      {eventTime(chart.panchanga.events.nextTithiJulianDay)}
                    </strong>
                  </div>
                  <div>
                    <span>{te ? "నక్షత్రం ముగింపు" : "Nakshatra ends"}</span>
                    <strong>
                      {eventTime(chart.panchanga.events.nextNakshatraJulianDay)}
                    </strong>
                  </div>
                </div>
                <details className="engine-notice">
                  <summary>Calculation status</summary>
                  <p>{chart.engine.notice}</p>
                  <code>
                    JD {chart.engine.julianDay.toFixed(5)} / ayanamsa{" "}
                    {chart.engine.ayanamsaDegrees.toFixed(5)}° /{" "}
                    {chart.engine.timezone.id || "fixed offset"} UTC
                    {chart.engine.timezone.resolvedOffsetHours >= 0 ? "+" : ""}
                    {chart.engine.timezone.resolvedOffsetHours}
                  </code>
                </details>
              </>
            )}
          </div>
        </section>

        {chart && <ConsultationToolsPanel form={form} chart={chart} />}

        <section className="vault-section">
          <div>
            <p className="eyebrow">
              {te ? "ఐచ్ఛిక ప్రైవేట్ నిల్వ" : "Optional private storage"}
            </p>
            <h2>{te ? "మీ జాతకం, మీ తాళం." : "Your chart, your key."}</h2>
            <p>
              {te
                ? "డిఫాల్ట్‌గా ఏమీ నిల్వ చేయబడదు. అనుమతించినప్పుడు మాత్రమే బ్రౌజర్ AES-256-GCMతో జాతకాన్ని గుప్తీకరిస్తుంది."
                : "Nothing is stored by default. With explicit consent, this browser encrypts the chart with AES-256-GCM before upload."}
            </p>
          </div>
          <div className="vault-panel">
            {!apiKey ? (
              <>
                <button type="button" onClick={createVault}>
                  {te
                    ? "ప్రైవేట్ వాల్ట్ ప్రారంభించండి"
                    : "Enable private vault"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={importApiKey}
                >
                  {te ? "వాల్ట్ తాళం దిగుమతి" : "Import vault key"}
                </button>
              </>
            ) : (
              <>
                <div className="vault-key-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={copyApiKey}
                  >
                    {te ? "API తాళం కాపీ" : "Back up API key"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={importApiKey}
                  >
                    {te ? "మరో తాళం దిగుమతి" : "Import another key"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={createNamedKey}
                  >
                    Create named key
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={rotateVaultKey}
                  >
                    Rotate API key
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={exportEncryptedVault}
                  >
                    Export ciphertext
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={exportRecoveryBundle}
                  >
                    Password-wrapped recovery
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={importRecoveryBundle}
                  >
                    Restore recovery bundle
                  </button>
                </div>
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={storageConsent}
                    onChange={(event) =>
                      setStorageConsent(event.target.checked)
                    }
                  />
                  <span>
                    {te
                      ? "ఈ గుప్తీకరించిన జాతకాన్ని ఒక సంవత్సరం నిల్వ చేయడానికి నేను అంగీకరిస్తున్నాను."
                      : "I consent to storing this encrypted chart for one year."}
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!chart || !storageConsent}
                  onClick={saveEncryptedChart}
                >
                  {te
                    ? "గుప్తీకరించి జాతకం సేవ్ చేయండి"
                    : "Encrypt and save chart"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!savedChart}
                  onClick={createPrivateShare}
                >
                  {te
                    ? "7 రోజుల ప్రైవేట్ లింక్ కాపీ"
                    : "Copy 7-day private link"}
                </button>
                <div className="saved-chart-list">
                  <strong>{te ? "సేవ్ చేసిన జాతకాలు" : "Saved charts"}</strong>
                  {vaultLoading && (
                    <small>{te ? "లోడ్ అవుతోంది…" : "Loading…"}</small>
                  )}
                  {!vaultLoading && vaultCharts.length === 0 && (
                    <small>
                      {te
                        ? "ఇంకా సేవ్ చేసిన జాతకాలు లేవు."
                        : "No saved charts yet."}
                    </small>
                  )}
                  {vaultCharts.map((item) => (
                    <div className="saved-chart-row" key={item.id}>
                      <span>
                        <strong>{item.label}</strong>
                        <small>
                          {item.expires_at
                            ? `${te ? "గడువు" : "Expires"} ${new Date(item.expires_at).toLocaleDateString(te ? "te-IN" : "en-IN")}`
                            : ""}
                        </small>
                      </span>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openSavedChart(item.id)}
                      >
                        {te ? "తెరవండి" : "Open"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => renameSavedChart(item.id, item.label)}
                      >
                        {te ? "పేరు" : "Rename"}
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => deleteSavedChart(item.id, item.label)}
                      >
                        {te ? "తొలగించండి" : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
                <details className="vault-details">
                  <summary>
                    {te ? "షేర్లు మరియు వినియోగం" : "Shares and usage"}
                  </summary>
                  {vaultShares.length === 0 ? (
                    <small>No private shares.</small>
                  ) : (
                    vaultShares.map((share) => (
                      <div className="share-row" key={share.id}>
                        <span>
                          <strong>{share.chart_label}</strong>
                          <small>
                            {share.access_count} accesses · expires{" "}
                            {new Date(share.expires_at).toLocaleDateString()}
                          </small>
                        </span>
                        {share.revoked_at ? (
                          <small>Revoked</small>
                        ) : (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => revokeShare(share.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  <div className="usage-grid">
                    {vaultUsage.slice(0, 12).map((item) => (
                      <span key={`${item.usage_date}-${item.operation}`}>
                        <small>
                          {item.usage_date} · {item.operation}
                        </small>
                        <strong>{item.count}</strong>
                      </span>
                    ))}
                  </div>
                </details>
              </>
            )}
            <small>
              {vaultStatus ||
                (te
                  ? "API తాళం మరియు చార్ట్ తాళాలు ఈ బ్రౌజర్‌లో మాత్రమే ఉంచబడతాయి."
                  : "The API key and chart keys are kept only in this browser. Losing them makes saved charts unrecoverable.")}
            </small>
          </div>
        </section>

        <PrashnaPanel
          place={form.place}
          latitude={form.latitude}
          longitude={form.longitude}
          timezone={
            form.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Asia/Kolkata"
          }
          language={form.language}
        />

        <section className="reading-section" id="ai-reading">
          <div className="reading-copy">
            <Sparkle />
            <h2>{t("interpret", "Interpret the facts, not a fantasy.")}</h2>
            <p>
              {t(
                "interpretBody",
                "The AI receives the completed chart as immutable evidence and must distinguish observation from tradition.",
              )}
            </p>
          </div>
          <div className="ask-box">
            <div className="ai-availability">
              <span
                className={
                  aiStatus?.available ? "status-dot ready" : "status-dot"
                }
              />
              <span>
                <strong>
                  {aiStatus?.available
                    ? "Cloudflare AI ready"
                    : "Narration status unknown"}
                </strong>
                <small>
                  The model explains calculated evidence; it cannot alter the
                  chart.
                </small>
              </span>
            </div>
            <label>
              {t("ask", "Ask about this chart")}
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
              />
            </label>
            <button
              disabled={!chart || readingStatus === "loading"}
              onClick={interpret}
            >
              {readingStatus === "loading"
                ? t("reading", "Reading...")
                : t("askButton", "Ask Sahadeva")}
            </button>
            {readingStatus === "error" && (
              <p className="error">
                Cloudflare Workers AI is unavailable in this environment.
              </p>
            )}
            {readingStatus === "loading" && (
              <div
                className="reading-skeleton"
                aria-label="Generating narration"
              >
                <span />
                <span />
                <span />
              </div>
            )}
            {reading && (
              <article className="reading-result">
                <header>
                  <span>Evidence-grounded response</span>
                  {readingMeta && (
                    <small>
                      {readingMeta.provider} · {readingMeta.model}
                    </small>
                  )}
                </header>
                <div>{reading}</div>
              </article>
            )}
          </div>
        </section>

        <section className="connect-section">
          <div className="connect-copy">
            <Plugs />
            <h2>{t("connect", "Connect once. Use it anywhere.")}</h2>
            <p>
              {t(
                "connectBody",
                "Sahadeva exposes its calculations as MCP tools. Compatible clients can cast and inspect charts without using this interface.",
              )}
            </p>
          </div>
          <div className="connection-panel">
            <span>MCP endpoint</span>
            <code>
              {typeof window === "undefined"
                ? "/mcp"
                : `${window.location.origin}/mcp`}
            </code>
            <button onClick={copyMcpUrl}>
              <Copy weight="bold" />{" "}
              {copied ? t("copied", "Copied") : t("copy", "Copy endpoint")}
            </button>
            <small>
              Stateless HTTP. Calculation tools do not require generative AI.
            </small>
          </div>
        </section>

        <section className="research" id="research">
          <div>
            <h2>What this research build proves</h2>
            <p>
              The application, API, independently reference-gated astronomy,
              South Indian calculation systems, private vault, reports, and MCP
              tools run on one Cloudflare Worker.
            </p>
          </div>
          <ol>
            <li>
              <strong>Astronomy:</strong> VSOP87D planets, ELP/MPP02 Moon,
              Lahiri, Lagna, and solar events retain explicit validation
              evidence.
            </li>
            <li>
              <strong>Calculations:</strong> houses, Vargas, timing, Shadbala,
              Bhava Bala, and evidence remain versioned and inspectable.
            </li>
            <li>
              <strong>Remaining gate:</strong> publishable interpretation still
              requires named sources, complete reference charts, and real
              practitioner review.
            </li>
          </ol>
        </section>
        <footer>
          <div className="brand">
            <span className="brand-mark">S</span>
            <span>Sahadeva</span>
          </div>
          <p>
            {t(
              "disclaimer",
              "Astrology is presented as a cultural and interpretive practice, not scientific or medical fact.",
            )}
          </p>
        </footer>
      </main>
    </>
  );
}
