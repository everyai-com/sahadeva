import { Hono, type Context } from "hono";
import { createAuth, sessionUser } from "./auth";
import { sendPush } from "./push";
import {
  calculateChart,
  calculateIngressTimeline,
  historicalTimezoneOffset,
  simulateBirthTimeUncertainty,
} from "../shared/jyotish";
import { birthInputSchema } from "../shared/schema";
import { teluguChartSummary } from "../shared/telugu";
import {
  buildDashaCalendar,
  compactChartEvidence,
  dashaCalendarIcs,
  isoToJd,
  jdToIso,
  queryDashaAt,
} from "../shared/dashaCalendar";
import {
  buildSlowTransitCalendar,
  intersectDashaTransits,
  transitCalendarIcs,
} from "../shared/transitCalendar";
import {
  locationLabel,
  resolveKnownLocation,
  searchKnownLocations,
} from "../shared/locations";
import { buildFullLifeReport } from "../shared/fullLifeReport";
import { buildEverydayReading } from "../shared/everydayReading";
import { calculateCompatibility } from "../shared/compatibility";
import { buildDailyPanchanga } from "../shared/dailyPanchanga";
import {
  MUHURTA_RULEBOOK,
  scoreMuhurta,
  type MuhurtaActivity,
} from "../shared/muhurta";
import { calculateDoshas } from "../shared/doshas";
import { calculateKpPreview } from "../shared/kp";
import { calculateJaimini } from "../shared/jaimini";
import {
  calculateVarshaphal,
  findSolarReturnJulianDay,
} from "../shared/varshaphal";
import { projectAyanamsa, type AyanamsaId } from "../shared/multiAyanamsa";
import { detectLifeThemes } from "../shared/synthesisBrain";
import { LIFE_THEME_VALIDATION_PROTOCOL } from "../shared/lifeThemeValidation";
import { findMarriageWindows } from "../shared/marriageWindows";
import { southIndianChartSvg } from "../shared/shareableChart";
import { buildServerReportPdf } from "./serverReport";
import { PROHIBITED_INFERENCES } from "../shared/safety";
import {
  buildPrashnaConsultation,
  prashnaRequestSchema,
} from "../shared/prashna";
import { fuseTiming } from "../shared/timingFusion";
import {
  rectificationRequestSchema,
  rectifyBirthTime,
} from "../shared/rectification";
import { calculateStrengthLineage } from "../shared/strengthLineage";
import { synthesizeVargas } from "../shared/vargaSynthesis";
import { additionalDashaStatus } from "../shared/additionalDashas";

type RateLimiter = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};
type Env = {
  AI: Ai;
  DB: D1Database;
  VECTORIZE?: VectorizeIndex;
  ENGINE_VERSION: string;
  CALC_RATE_LIMITER: RateLimiter;
  AI_RATE_LIMITER: RateLimiter;
  APP_ENV?: string;
  BILLING_WEBHOOK_SECRET?: string;
  AI_MODEL?: string;
  AI_CHAT_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_CHAT_MODEL?: string;
  GEOAPIFY_API_KEY?: string;
  BETTER_AUTH_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
};
const app = new Hono<{ Bindings: Env }>();
const safetyEnvelope = () => ({
  status: "research-preview",
  prohibitedInferences: [...PROHIBITED_INFERENCES],
  notice:
    "Astrology is a cultural interpretive practice, not scientific fact or professional advice.",
});
const redactConfirmationToken = (
  result: ReturnType<typeof buildPrashnaConsultation>,
) => ({
  ...result,
  feedback: { ...result.feedback, confirmationToken: "[redacted]" },
});
const INTERPRETIVE_TOOLS = new Set([
  "calculate_compatibility",
  "get_panchanga",
  "find_muhurta",
  "calculate_doshas",
  "calculate_kp",
  "calculate_jaimini",
  "calculate_varshaphal",
  "calculate_ayanamsa_chart",
  "detect_life_themes",
  "generate_full_life_report",
  "get_full_reading_context",
  "get_full_life_report_section",
  "get_compact_chart_evidence",
  "get_timing_context",
  "find_marriage_windows",
  "get_marriage_readiness",
  "generate_report_pdf",
  "calculate_prashna",
  "get_depth_analysis",
  "fuse_timing",
  "rectify_birth_time",
]);
function enforceSafetyContract(response: any, toolName?: string) {
  if (
    !INTERPRETIVE_TOOLS.has(String(toolName)) ||
    !response?.result?.structuredContent
  )
    return response;
  response.result.structuredContent.safety = {
    ...(response.result.structuredContent.safety || {}),
    ...safetyEnvelope(),
  };
  return response;
}

app.use("*", async (c, next) => {
  const requestId = c.req.header("cf-ray") || crypto.randomUUID();
  c.header("X-Request-Id", requestId);
  if (c.req.path.startsWith("/api/") || c.req.path.startsWith("/mcp"))
    c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  );
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'",
  );
  await next();
});

const clientKey = (request: Request) =>
  request.headers.get("cf-connecting-ip") || "local";
async function enforceLimit(
  c: Context<{ Bindings: Env }>,
  limiter: RateLimiter | undefined,
) {
  if (!limiter) return null;
  const result = await limiter.limit({ key: clientKey(c.req.raw) });
  if (!result.success) {
    const clientHash = await sha256(clientKey(c.req.raw));
    await c.env.DB?.prepare(
      "INSERT INTO security_events(id,event_type,client_hash,request_id,path,metadata_json) VALUES(?,?,?,?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        "rate_limit_exceeded",
        clientHash,
        c.res.headers.get("X-Request-Id"),
        c.req.path,
        JSON.stringify({ method: c.req.method }),
      )
      .run()
      .catch(() => undefined);
    return c.json(
      { error: "Rate limit exceeded", retryAfterSeconds: 60 },
      429,
      { "Retry-After": "60" },
    );
  }
  return null;
}

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
const randomToken = (bytes = 32) => {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64url(value);
};
async function sha256(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
async function calculateChartCached(
  env: Env | undefined,
  input: Parameters<typeof calculateChart>[0],
) {
  if (!env?.DB) return calculateChart(input);
  const birthHash = await sha256(stableJson({ ...input, name: "", place: "" }));
  try {
    const row = await env.DB.prepare(
      "SELECT chart_json FROM chart_cache WHERE birth_hash=? AND engine_version=?",
    )
      .bind(birthHash, env.ENGINE_VERSION)
      .first<{ chart_json: string }>();
    if (row?.chart_json) {
      const cached = JSON.parse(row.chart_json) as ReturnType<
        typeof calculateChart
      >;
      return {
        ...cached,
        input: { ...cached.input, name: input.name, place: input.place },
      };
    }
    const chart = calculateChart(input),
      stored = { ...chart, input: { ...chart.input, name: "", place: "" } };
    await env.DB.prepare(
      "INSERT OR IGNORE INTO chart_cache(birth_hash,engine_version,chart_json) VALUES(?,?,?)",
    )
      .bind(birthHash, env.ENGINE_VERSION, JSON.stringify(stored))
      .run();
    return chart;
  } catch {
    return calculateChart(input);
  }
}
type KeyIdentity = {
  id: string;
  vaultId: string;
  scopes: string[];
  prefix: string;
  calcLimitPerMinute: number;
  aiLimitPerMinute: number;
};

type ProductTier = "free" | "paid";
async function productTier(env: Env, identity: KeyIdentity) {
  const row = await env.DB.prepare(
    "SELECT tier FROM billing_accounts WHERE vault_id=? AND status='active'",
  )
    .bind(identity.vaultId)
    .first<{ tier: ProductTier }>()
    .catch(() => null);
  return row?.tier === "paid" ? "paid" : "free";
}
async function authenticate(
  c: Context<{ Bindings: Env }>,
  requiredScope?: string,
): Promise<KeyIdentity | Response> {
  const token = (c.req.header("authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token)
    return c.json({ error: "Bearer API key required" }, 401, {
      "WWW-Authenticate": "Bearer",
    });
  const row = await c.env.DB.prepare(
    "SELECT id,COALESCE(vault_id,id) vault_id,key_prefix,scopes_json,COALESCE(calc_limit_per_minute,60) calc_limit_per_minute,COALESCE(ai_limit_per_minute,10) ai_limit_per_minute FROM api_keys WHERE key_hash=? AND revoked_at IS NULL",
  )
    .bind(await sha256(token))
    .first<{
      id: string;
      vault_id: string;
      key_prefix: string;
      scopes_json: string;
      calc_limit_per_minute: number;
      ai_limit_per_minute: number;
    }>();
  if (!row) return c.json({ error: "Invalid or revoked API key" }, 401);
  const scopes = JSON.parse(row.scopes_json) as string[];
  if (requiredScope && !scopes.includes(requiredScope))
    return c.json({ error: `Missing scope: ${requiredScope}` }, 403);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE api_keys SET last_used_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(row.id),
    c.env.DB.prepare(
      "INSERT INTO api_usage_daily(key_id,usage_date,operation,count) VALUES(?,date('now'),?,1) ON CONFLICT(key_id,usage_date,operation) DO UPDATE SET count=count+1",
    ).bind(row.id, requiredScope || "authenticated"),
    c.env.DB.prepare(
      "DELETE FROM private_shares WHERE expires_at<=CURRENT_TIMESTAMP AND owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
    ).bind(row.vault_id),
    c.env.DB.prepare(
      "DELETE FROM saved_chart_blobs WHERE expires_at<=CURRENT_TIMESTAMP AND owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
    ).bind(row.vault_id),
  ]);
  return {
    id: row.id,
    vaultId: row.vault_id,
    scopes,
    prefix: row.key_prefix,
    calcLimitPerMinute: Number(row.calc_limit_per_minute || 60),
    aiLimitPerMinute: Number(row.ai_limit_per_minute || 10),
  };
}
async function enforceKeyLimit(
  c: Context<{ Bindings: Env }>,
  identity: KeyIdentity,
  kind: "calc" | "ai",
) {
  const limit =
    kind === "calc" ? identity.calcLimitPerMinute : identity.aiLimitPerMinute;
  const row = await c.env.DB.prepare(
    "INSERT INTO api_key_rate_windows(key_id,operation,window_start,count) VALUES(?,?,strftime('%Y-%m-%dT%H:%M:00Z','now'),1) ON CONFLICT(key_id,operation,window_start) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(identity.id, kind)
    .first<{ count: number }>();
  if (Number(row?.count || 1) > limit)
    return c.json(
      {
        error: "API key rate limit exceeded",
        operation: kind,
        retryAfterSeconds: 60,
      },
      429,
      { "Retry-After": "60" },
    );
  return null;
}

type RpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: unknown };
};
const mcpTools = [
  {
    name: "search_locations",
    title: "Find a chart location",
    description:
      "Searches Sahadeva's deterministic local catalogue and geographic index. It never invokes another AI model. If no result exists, the MCP host should resolve the place with its own capabilities and pass coordinates to the chart tool.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", minLength: 2 },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
      },
    },
  },
  {
    name: "calculate_chart_from_known_place",
    title: "Calculate a chart from a place or coordinates",
    description:
      "Calculates a complete South Indian chart from a known catalogue place or explicit latitude, longitude, and IANA timezone supplied by the MCP host. This deterministic tool never invokes another AI model.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "place"],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        latitude: { type: "number", minimum: -90, maximum: 90 },
        longitude: { type: "number", minimum: -180, maximum: 180 },
        timezone: { type: "string" },
        timezoneOffset: { type: "number", minimum: -12, maximum: 14 },
        language: { type: "string", enum: ["en", "te"], default: "en" },
        focus: {
          type: "string",
          enum: [
            "general",
            "career",
            "marriage",
            "children",
            "education",
            "property",
            "health",
            "spirituality",
          ],
          default: "general",
        },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
      },
    },
  },
  {
    name: "calculate_compatibility",
    title: "Calculate Ashtakoota and Kuja compatibility",
    description:
      "Resolves both birth places, calculates both charts, and returns an auditable 36-point Ashtakoota breakdown plus Mangal/Kuja Dosha evidence from Lagna, Moon, and Venus. Traditional research preview; never a relationship verdict.",
    inputSchema: {
      type: "object",
      required: ["bride", "groom"],
      properties: {
        bride: {
          type: "object",
          required: ["name", "date", "time", "place"],
          properties: {
            name: { type: "string" },
            date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
            place: { type: "string" },
            birthTimeAccuracyMinutes: {
              type: "number",
              minimum: 0,
              maximum: 1440,
              default: 5,
            },
          },
        },
        groom: {
          type: "object",
          required: ["name", "date", "time", "place"],
          properties: {
            name: { type: "string" },
            date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
            place: { type: "string" },
            birthTimeAccuracyMinutes: {
              type: "number",
              minimum: 0,
              maximum: 1440,
              default: 5,
            },
          },
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "get_panchanga",
    title: "Get complete daily Panchanga",
    description:
      "Returns the five limbs plus Rahu Kaal, Yamaganda, Gulika, Bhadra status, Abhijit and Brahma Muhurta, day/night Choghadiya, 24 Horas, solar-day context, festival flags, and optional Tara/Chandra Bala from a natal chart.",
    inputSchema: {
      type: "object",
      required: ["date", "place"],
      properties: {
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        place: { type: "string" },
        language: { type: "string", enum: ["en", "te"], default: "en" },
        natal: {
          type: "object",
          required: ["name", "date", "time", "place"],
          properties: {
            name: { type: "string" },
            date: { type: "string" },
            time: { type: "string" },
            place: { type: "string" },
            birthTimeAccuracyMinutes: { type: "number", default: 5 },
          },
        },
      },
    },
  },
  {
    name: "find_muhurta",
    title: "Find ranked Muhurta windows",
    description:
      "Ranks candidate windows over a bounded date range using activity Panchanga fitness, prohibited-period avoidance, optional Tara/Chandra Bala, instant Lagna structure, and activity-karaka condition. Returns every pass/fail reason and draft source key.",
    inputSchema: {
      type: "object",
      required: ["activity", "startDate", "endDate", "place"],
      properties: {
        activity: {
          type: "string",
          enum: [
            "marriage",
            "griha_pravesh",
            "travel",
            "business_start",
            "vehicle_purchase",
            "property_purchase",
            "naming",
            "contract",
            "important_conversation",
            "new_venture",
            "surgery",
          ],
        },
        startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        endDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        place: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        natal: {
          type: "object",
          required: ["name", "date", "time", "place"],
          properties: {
            name: { type: "string" },
            date: { type: "string" },
            time: { type: "string" },
            place: { type: "string" },
            birthTimeAccuracyMinutes: { type: "number", default: 5 },
          },
        },
      },
    },
  },
  {
    name: "calculate_doshas",
    title: "Calculate evidence-first Dosha patterns",
    description:
      "Calculates Mangal/Kuja, Kaal Sarpa enclosure, Kemadruma, and conservative Pitru-related structural candidates with raw/effective severity and explicit cancellation or mitigation evidence.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "place"],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "calculate_kp",
    title: "Calculate KP structural preview",
    description:
      "Returns deterministic Nakshatra star, sub, and sub-sub lords, ruling planets, and transparent significator evidence. Explicitly reports KP ayanamsa and Placidus cusps as unavailable until independently validated.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "place"],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "calculate_jaimini",
    title: "Calculate Jaimini structural chart",
    description:
      "Returns seven- and eight-Chara-Karaka conventions, all Arudha Padas including Arudha Lagna and Upapada, Karakamsha, and Jaimini Rashi Drishti matrices without silently mixing conventions.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "place"],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "calculate_varshaphal",
    title: "Calculate Varshaphal annual chart",
    description:
      "Solves the exact tropical solar-return instant for a target year and returns the sidereal annual chart, Muntha, Tajika aspect candidates, and transparent boundaries for pending Varshesha, Saham, and Mudda-Dasha rules.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "place", "targetYear"],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        targetYear: { type: "integer", minimum: 1800, maximum: 2050 },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "calculate_ayanamsa_chart",
    title: "Calculate a selectable ayanamsa projection",
    description:
      "Projects placements and sign-based Graha Drishti under Lahiri, Krishnamurti, Raman, or Fagan/Bradley, reports boundary changes, and preserves per-convention validation status. Non-Lahiri full derived systems are not silently recomputed.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "place", "ayanamsa"],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        ayanamsa: {
          type: "string",
          enum: ["lahiri", "krishnamurti", "raman", "fagan-bradley"],
        },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "detect_life_themes",
    title: "Detect ranked Dasha-activated life themes",
    description:
      "Detects structural afflictions and supportive Yogas, weights their activation through Vimshottari Maha/Antardashas over a date range, and returns ranked neutral themes with reasons, citation state, uncalibrated confidence, and mandatory safety limits.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "place", "startDate", "endDate"],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        endDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "consult_jyotishya",
    title: "Get a compact one-call Jyotish consultation",
    description:
      "Runs the relevant deterministic chart, strength, Dasha and timing engines in one call and returns a compact consultation brief. Designed as the default MCP entry point; it never invokes another AI model.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time"],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        latitude: { type: "number", minimum: -90, maximum: 90 },
        longitude: { type: "number", minimum: -180, maximum: 180 },
        timezone: { type: "string" },
        timezoneOffset: { type: "number", minimum: -12, maximum: 14 },
        question: { type: "string", maxLength: 1000 },
        focus: {
          type: "string",
          enum: [
            "general",
            "career",
            "marriage",
            "children",
            "education",
            "property",
            "health",
            "spirituality",
          ],
          default: "general",
        },
        asOfDate: { type: "string" },
        language: { type: "string", enum: ["en", "te"], default: "en" },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        detail: {
          type: "string",
          enum: ["brief", "standard"],
          default: "brief",
        },
      },
      anyOf: [
        { required: ["place"] },
        { required: ["latitude", "longitude", "timezone"] },
      ],
    },
  },
  {
    name: "generate_full_life_report",
    title: "Generate a complete evidence-linked life report",
    description:
      "Builds a normal-person South Indian astrology report covering identity, mind, family, communication, home, learning, routines, relationships, change, beliefs, career, networks, rest, measured strengths, Vargas, structural Yogas, current Dasha and upcoming Antardashas. Interpretations remain qualified and evidence-linked.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        language: { type: "string", enum: ["en", "te"], default: "en" },
        focus: {
          type: "string",
          enum: [
            "general",
            "career",
            "marriage",
            "children",
            "education",
            "property",
            "health",
            "spirituality",
          ],
          default: "general",
        },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        asOfDate: {
          type: "string",
          description:
            "ISO date or instant for the current-timing section; defaults to now",
        },
        horizonYears: { type: "integer", minimum: 1, maximum: 10, default: 5 },
      },
    },
  },
  {
    name: "get_full_reading_context",
    title: "Get complete one-shot reading context",
    description:
      "One-call alias for the complete evidence-linked life report. Returns enriched placements, strengths, Vargas, synthesis, current Dasha, and a configurable future transit-and-Dasha horizon for narration clients.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        language: { type: "string", enum: ["en", "te"], default: "en" },
        focus: {
          type: "string",
          enum: [
            "general",
            "career",
            "marriage",
            "children",
            "education",
            "property",
            "health",
            "spirituality",
          ],
          default: "general",
        },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
        asOfDate: { type: "string" },
        horizonYears: { type: "integer", minimum: 1, maximum: 10, default: 5 },
      },
    },
  },
  {
    name: "get_full_life_report_section",
    title: "Get one full-life-report section",
    description:
      "Returns one bounded section of the full report for MCP clients with limited context windows.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
        "section",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        language: { type: "string", enum: ["en", "te"], default: "en" },
        birthTimeAccuracyMinutes: { type: "number", default: 5 },
        asOfDate: { type: "string" },
        horizonYears: { type: "integer", minimum: 1, maximum: 10, default: 5 },
        section: {
          type: "string",
          enum: [
            "summary",
            "life-areas",
            "placements",
            "strengths",
            "vargas",
            "aspects",
            "ashtakavarga",
            "synthesis",
            "timing",
            "uncertainty",
            "evidence",
            "citations",
          ],
        },
      },
    },
  },
  {
    name: "calculate_south_indian_chart",
    title: "Calculate South Indian Jyotish chart",
    description:
      "Deterministically calculates sidereal placements, all 16 Parashari vargas, Panchanga, Vimshottari timing, layered evidence and uncertainty from explicit birth data. Placement sign is a zero-based 0-11 index and signName is the display-safe name.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        latitude: { type: "number", minimum: -90, maximum: 90 },
        longitude: { type: "number", minimum: -180, maximum: 180 },
        timezoneOffset: { type: "number", minimum: -14, maximum: 14 },
        timezone: {
          type: "string",
          description:
            "Optional IANA timezone, for example Asia/Kolkata. When supplied, historical rules override timezoneOffset.",
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
        methodology: {
          type: "string",
          enum: ["parashari", "kp", "western", "comparative"],
          default: "parashari",
        },
        focus: {
          type: "string",
          enum: [
            "general",
            "career",
            "marriage",
            "children",
            "education",
            "property",
            "health",
            "spirituality",
          ],
          default: "general",
        },
        birthTimeAccuracyMinutes: {
          type: "number",
          minimum: 0,
          maximum: 1440,
          default: 5,
        },
      },
    },
  },
  {
    name: "describe_methodology",
    title: "Describe Sahadeva methodology",
    description:
      "Returns the calculation boundary, accuracy status, interpretive safety contract and production validation requirements.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "calculate_gochara",
    title: "Calculate sidereal gochara",
    description:
      "Calculates deterministic transit placements for an explicit instant and maps them to whole-sign houses from a supplied natal Lagna.",
    inputSchema: {
      type: "object",
      required: [
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
        "natalLagnaSign",
      ],
      properties: {
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        latitude: { type: "number", minimum: -90, maximum: 90 },
        longitude: { type: "number", minimum: -180, maximum: 180 },
        timezoneOffset: { type: "number", minimum: -14, maximum: 14 },
        timezone: { type: "string" },
        natalLagnaSign: { type: "integer", minimum: 0, maximum: 11 },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "calculate_gochara_from_known_place",
    title: "Calculate gochara from a verified place",
    description:
      "Resolves a verified catalogue place and its IANA timezone before calculating sidereal transits, avoiding manual coordinate and offset entry.",
    inputSchema: {
      type: "object",
      required: ["date", "time", "place", "natalLagnaSign"],
      properties: {
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        place: { type: "string" },
        natalLagnaSign: { type: "integer", minimum: 0, maximum: 11 },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "calculate_ingress_timeline",
    title: "Calculate sidereal ingress timeline",
    description:
      "Finds sign-boundary crossings for Sun through Saturn and the lunar nodes over an explicit future interval.",
    inputSchema: {
      type: "object",
      required: [
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
      ],
      properties: {
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        days: { type: "integer", minimum: 1, maximum: 366 },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "simulate_birth_time_uncertainty",
    title: "Simulate birth-time uncertainty",
    description:
      "Samples the declared birth-time interval and reports Lagna, Moon-pada and Navamsa-Lagna boundary changes. This is not rectification.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
        "birthTimeAccuracyMinutes",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        birthTimeAccuracyMinutes: { type: "number", minimum: 0, maximum: 1440 },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "knowledge_status",
    title: "Inspect reviewed Jyotish knowledge status",
    description:
      "Returns counts of sources, passages, approved rules and active reviewers. Draft material is never represented as expert knowledge.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_classics",
    title: "Search the classical Jyotish text corpus",
    description:
      "Semantic + keyword search over indexed classical works (Vedic Remedies in Astrology, Sarvarth Chintamani, Jyotisha Fundamentals). Returns short reference excerpts with work/author/section attribution for grounding; the corpus is copyrighted and must be paraphrased, never republished verbatim.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          minLength: 3,
          maxLength: 200,
          description: "Topic, planet, house, yoga or question to search for",
        },
        limit: { type: "integer", minimum: 1, maximum: 10 },
      },
    },
  },
  {
    name: "list_rule_review_queue",
    title: "List source-linked rule review work",
    description:
      "Returns implemented rule claims and their passage, rule, reviewer, contradiction, and publication state. Unlinked or draft claims are never represented as citations.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          enum: [
            "muhurta",
            "dosha",
            "interpretation",
            "kp",
            "jaimini",
            "varshaphal",
          ],
        },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
      },
    },
  },
  {
    name: "get_rule_citations",
    title: "Get approved citations for source keys",
    description:
      "Returns passage-level citations only when the linked rule satisfies the two-reviewer publication gate and has no blocking review. Unresolved keys are returned separately.",
    inputSchema: {
      type: "object",
      required: ["sourceKeys"],
      properties: {
        sourceKeys: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: { type: "string" },
        },
      },
    },
  },
  {
    name: "get_synthesis_validation_status",
    title: "Get Synthesis Brain validation status",
    description:
      "Returns the frozen blind-validation protocol, cohort-size gates, anti-leakage rules, and the honest current calibration state. It never treats a known single case as validation.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "query_vimshottari_date",
    title: "Query Vimshottari period on a date",
    description:
      "Returns the active Mahadasha, Antardasha and Pratyantardasha with exact boundaries for one ISO date. Optimized for AI clients that do not need the full 120-year timeline.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
        "queryDate",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        queryDate: { type: "string", description: "ISO 8601 date or instant" },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "get_compact_chart_evidence",
    title: "Get compact chart evidence for AI",
    description:
      "Returns a stable, compact, deterministic evidence object for narration agents. It omits bulky timelines and contribution matrices while retaining calculation version, confidence, placements, focus, and safety boundaries.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        language: { type: "string", enum: ["en", "te"], default: "en" },
        focus: {
          type: "string",
          enum: [
            "general",
            "career",
            "marriage",
            "children",
            "education",
            "property",
            "health",
            "spirituality",
          ],
          default: "general",
        },
      },
    },
  },
  {
    name: "get_timing_context",
    title: "Get combined dasha and transit context",
    description:
      "For one date, returns active Vimshottari periods plus Saturn, Jupiter and node transit houses from natal Moon and Lagna. Sade Sati and Dhaiya are labelled structural periods, not guaranteed outcomes.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
        "queryDate",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        queryDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        queryTime: { type: "string", default: "12:00" },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "build_slow_transit_calendar",
    title: "Build exact slow-transit periods",
    description:
      "Returns exact Saturn, Jupiter, Rahu and Ketu sidereal sign periods, Saturn Sade Sati/Dhaiya structural ranges, and Vimshottari intersections over a selected future interval.",
    inputSchema: {
      type: "object",
      required: [
        "name",
        "date",
        "time",
        "place",
        "latitude",
        "longitude",
        "timezoneOffset",
        "startDate",
      ],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezoneOffset: { type: "number" },
        timezone: { type: "string" },
        startDate: { type: "string", description: "ISO date or instant" },
        years: { type: "number", minimum: 0.1, maximum: 40, default: 10 },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "find_marriage_windows",
    title: "Find structural marriage-planning windows",
    description:
      "Finds overlaps between Jupiter transiting the natal seventh sign and Venus or seventh-lord Vimshottari periods. Returns planning windows, never a guaranteed marriage prediction.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "startDate"],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        startDate: { type: "string" },
        years: { type: "number", minimum: 0.25, maximum: 20, default: 5 },
        place: { type: "string" },
        latitude: { type: "number", minimum: -90, maximum: 90 },
        longitude: { type: "number", minimum: -180, maximum: 180 },
        timezone: { type: "string" },
        timezoneOffset: { type: "number" },
      },
      anyOf: [
        { required: ["place"] },
        { required: ["latitude", "longitude", "timezone"] },
      ],
    },
  },
  {
    name: "get_marriage_readiness",
    title: "Get one-call marriage readiness context",
    description:
      "Returns compatibility, compact summaries for both charts, and structural marriage-planning windows for each person in one call.",
    inputSchema: {
      type: "object",
      required: ["bride", "groom", "startDate"],
      properties: {
        bride: {
          type: "object",
          required: ["name", "date", "time"],
          properties: {
            name: { type: "string" },
            date: { type: "string" },
            time: { type: "string" },
            place: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            timezone: { type: "string" },
            timezoneOffset: { type: "number" },
          },
          anyOf: [
            { required: ["place"] },
            { required: ["latitude", "longitude", "timezone"] },
          ],
        },
        groom: {
          type: "object",
          required: ["name", "date", "time"],
          properties: {
            name: { type: "string" },
            date: { type: "string" },
            time: { type: "string" },
            place: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            timezone: { type: "string" },
            timezoneOffset: { type: "number" },
          },
          anyOf: [
            { required: ["place"] },
            { required: ["latitude", "longitude", "timezone"] },
          ],
        },
        startDate: { type: "string" },
        years: { type: "number", minimum: 0.25, maximum: 20, default: 5 },
        muhurta: {
          type: "object",
          description:
            "Optional shared wedding location and bounded date range passed to find_muhurta",
          required: ["startDate", "endDate"],
          properties: {
            startDate: { type: "string" },
            endDate: { type: "string" },
            limit: { type: "integer", minimum: 1, maximum: 20 },
            place: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            timezone: { type: "string" },
            timezoneOffset: { type: "number" },
          },
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "render_chart",
    title: "Render a shareable South Indian chart",
    description:
      "Renders a deterministic South Indian chart as inline SVG, including retrograde, combustion, and dignity flags.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time"],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezone: { type: "string" },
        timezoneOffset: { type: "number" },
        size: { type: "integer", minimum: 480, maximum: 2400, default: 1200 },
      },
      anyOf: [
        { required: ["place"] },
        { required: ["latitude", "longitude", "timezone"] },
      ],
    },
  },
  {
    name: "generate_report_pdf",
    title: "Generate a hosted shareable PDF report",
    description:
      "Generates the full reading context as a server-side PDF and returns a hosted URL valid for 30 days.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time"],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        place: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        timezone: { type: "string" },
        timezoneOffset: { type: "number" },
        asOfDate: { type: "string" },
        horizonYears: { type: "number", minimum: 1, maximum: 20, default: 5 },
      },
      anyOf: [
        { required: ["place"] },
        { required: ["latitude", "longitude", "timezone"] },
      ],
    },
  },
  {
    name: "calculate_prashna",
    title: "Ask a Prashna question",
    description:
      "Casts a server-time horary chart, checks chart fitness, and returns an auditable structural judgment plus outcome-confirmation hook.",
    inputSchema: {
      type: "object",
      required: ["question", "category"],
      properties: {
        question: { type: "string", minLength: 3, maxLength: 500 },
        category: {
          type: "string",
          enum: [
            "career",
            "relationship",
            "money",
            "property",
            "travel",
            "lost-object",
            "general",
          ],
        },
        language: { type: "string", enum: ["en", "te"], default: "en" },
      },
    },
  },
  {
    name: "record_prashna_outcome",
    title: "Record a Prashna outcome",
    description:
      "Closes the Prashna feedback loop using the private confirmation token returned by calculate_prashna. The token is hashed at rest and is distinct from the consultation ID.",
    inputSchema: {
      type: "object",
      required: ["confirmationToken", "outcome"],
      properties: {
        confirmationToken: { type: "string", minLength: 16, maxLength: 256 },
        outcome: {
          type: "string",
          enum: [
            "confirmed",
            "partly-confirmed",
            "not-confirmed",
            "unresolved",
          ],
        },
        resolvedAt: { type: "string", format: "date-time" },
        notes: { type: "string", maxLength: 1000 },
      },
    },
  },
  {
    name: "get_depth_analysis",
    title: "Get strength, Varga and additional-Dasha depth",
    description:
      "Returns Vimsopaka and Ishta/Kashta evidence, topic-specific cross-Varga synthesis, special Lagnas, expanded Yoga candidates and additional-Dasha status.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "topic"],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        topic: {
          type: "string",
          enum: [
            "career",
            "marriage",
            "wealth",
            "education",
            "children",
            "property",
            "spirituality",
          ],
        },
      },
    },
  },
  {
    name: "fuse_timing",
    title: "Fuse promise, Dasha, transit, Ashtakavarga and Varga timing",
    description:
      "Applies natal promise as a hard gate and returns uncalibrated, auditable timing windows with learnable factor weights.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "time", "topic", "startIso", "endIso"],
      properties: {
        name: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        topic: {
          type: "string",
          enum: [
            "career",
            "marriage",
            "wealth",
            "education",
            "children",
            "property",
            "spirituality",
          ],
        },
        startIso: { type: "string" },
        endIso: { type: "string" },
      },
    },
  },
  {
    name: "rectify_birth_time",
    title: "Rank birth-time hypotheses",
    description:
      "Scores candidate birth times against life events and validates with a held-out event. Never claims an exact recovered minute.",
    inputSchema: {
      type: "object",
      required: ["baseInput", "earliestTime", "latestTime", "events"],
      properties: {
        baseInput: { type: "object" },
        earliestTime: { type: "string" },
        latestTime: { type: "string" },
        stepMinutes: { type: "integer", default: 5 },
        events: { type: "array" },
        holdoutEventId: { type: "string" },
      },
    },
  },
];

// All location-aware tools accept either a catalogue place or explicit verified
// coordinates. Keep this normalization here so newly-added MCPs cannot drift
// back to a place-only contract.
const coordinateProperties = {
  place: {
    type: "string",
    description:
      "Catalogue query or display label when explicit coordinates are supplied",
  },
  latitude: { type: "number", minimum: -90, maximum: 90 },
  longitude: { type: "number", minimum: -180, maximum: 180 },
  timezone: {
    type: "string",
    description:
      "Required IANA timezone when explicit coordinates are supplied, for example Asia/Kolkata",
  },
  timezoneOffset: {
    type: "number",
    minimum: -14,
    maximum: 14,
    description:
      "Optional fallback offset; derived from timezone and the requested local date when omitted",
  },
};
const locationAlternatives = [
  { required: ["place"] },
  { required: ["latitude", "longitude", "timezone"] },
];
const uniformLocationTools = new Set([
  "calculate_doshas",
  "calculate_kp",
  "calculate_jaimini",
  "calculate_varshaphal",
  "calculate_ayanamsa_chart",
  "detect_life_themes",
  "get_depth_analysis",
  "fuse_timing",
  "calculate_prashna",
]);
for (const tool of mcpTools) {
  const schema = tool.inputSchema as {
    required?: string[];
    properties?: Record<string, unknown>;
    anyOf?: unknown[];
  };
  if (uniformLocationTools.has(tool.name)) {
    schema.required = (schema.required || []).filter(
      (field) => field !== "place",
    );
    schema.properties = { ...schema.properties, ...coordinateProperties };
    schema.anyOf = locationAlternatives;
  }
  if (tool.name === "get_panchanga" || tool.name === "find_muhurta") {
    schema.required = (schema.required || []).filter(
      (field) => field !== "place",
    );
    schema.properties = { ...schema.properties, ...coordinateProperties };
    schema.anyOf = locationAlternatives;
    const natal = schema.properties.natal as
      { properties?: Record<string, unknown>; required?: string[] } | undefined;
    if (natal) {
      natal.required = (natal.required || []).filter(
        (field) => field !== "place",
      );
      natal.properties = { ...natal.properties, ...coordinateProperties };
      (natal as typeof natal & { anyOf?: unknown[] }).anyOf =
        locationAlternatives;
    }
  }
  if (tool.name === "calculate_compatibility")
    for (const key of ["bride", "groom"]) {
      const person = schema.properties?.[key] as {
        required?: string[];
        properties?: Record<string, unknown>;
        anyOf?: unknown[];
      };
      person.required = (person.required || []).filter(
        (field) => field !== "place",
      );
      person.properties = { ...person.properties, ...coordinateProperties };
      person.anyOf = locationAlternatives;
    }
}
const mcpOutputSchemas: Record<string, unknown> = {
  consult_jyotishya: {
    type: "object",
    required: [
      "schemaVersion",
      "subject",
      "anchors",
      "priorities",
      "currentTiming",
      "confidence",
      "safety",
    ],
    additionalProperties: true,
  },
  calculate_prashna: {
    type: "object",
    required: [
      "schemaVersion",
      "consultationId",
      "chartFitness",
      "judgment",
      "feedback",
      "safety",
    ],
    additionalProperties: true,
  },
  record_prashna_outcome: {
    type: "object",
    required: ["id", "consultationId", "status", "recordedAt"],
    properties: {
      id: { type: "string" },
      consultationId: { type: "string" },
      status: { type: "string", const: "recorded" },
      recordedAt: { type: "string" },
    },
    additionalProperties: false,
  },
  get_depth_analysis: {
    type: "object",
    required: [
      "schemaVersion",
      "strengthLineage",
      "vargaSynthesis",
      "targetedLagnas",
      "yogas",
      "additionalDashas",
      "safety",
    ],
    additionalProperties: true,
  },
  fuse_timing: {
    type: "object",
    required: ["schemaVersion", "topic", "promise", "windows"],
    additionalProperties: true,
  },
  rectify_birth_time: {
    type: "object",
    required: ["schemaVersion", "rankedCandidates", "rankedClusters", "notice"],
    additionalProperties: true,
  },
  search_locations: {
    type: "object",
    required: ["query", "status", "matches"],
    properties: {
      query: { type: "string" },
      status: { type: "string", enum: ["resolved", "ambiguous", "not_found"] },
      matches: {
        type: "array",
        items: {
          type: "object",
          required: [
            "label",
            "latitude",
            "longitude",
            "timezone",
            "timezoneOffset",
          ],
        },
      },
    },
  },
  calculate_chart_from_known_place: {
    type: "object",
    additionalProperties: true,
  },
  calculate_compatibility: {
    type: "object",
    required: [
      "schemaVersion",
      "subjects",
      "ashtakoota",
      "kujaDosha",
      "sourceCoverage",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-compatibility-1" },
      subjects: { type: "object" },
      ashtakoota: { type: "object" },
      kujaDosha: { type: "object" },
      sourceCoverage: { type: "object" },
      safety: { type: "object" },
    },
  },
  get_panchanga: { type: "object", additionalProperties: true },
  find_muhurta: {
    type: "object",
    required: ["schemaVersion", "activity", "rulebook", "windows", "safety"],
    properties: {
      schemaVersion: { const: "sahadeva-muhurta-1" },
      activity: { type: "string" },
      rulebook: { type: "object" },
      windows: { type: "array" },
      safety: { type: "object" },
    },
  },
  calculate_doshas: {
    type: "object",
    required: [
      "schemaVersion",
      "subject",
      "patterns",
      "summary",
      "rulebook",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-doshas-1" },
      subject: { type: "object" },
      patterns: { type: "array" },
      summary: { type: "object" },
      rulebook: { type: "object" },
      safety: { type: "object" },
    },
  },
  calculate_kp: {
    type: "object",
    required: [
      "schemaVersion",
      "status",
      "zodiac",
      "cusps",
      "planets",
      "rulingPlanets",
      "significators",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-kp-preview-1" },
      status: { type: "string" },
      zodiac: { type: "object" },
      cusps: { type: "object" },
      planets: { type: "array" },
      rulingPlanets: { type: "array" },
      significators: { type: "array" },
      safety: { type: "object" },
    },
  },
  calculate_jaimini: {
    type: "object",
    required: [
      "schemaVersion",
      "status",
      "charaKarakas",
      "arudhaPadas",
      "karakamsha",
      "rashiDrishti",
      "charaDasha",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-jaimini-1" },
      status: { type: "string" },
      charaKarakas: { type: "object" },
      arudhaPadas: { type: "object" },
      karakamsha: { type: "object" },
      rashiDrishti: { type: "object" },
      charaDasha: { type: "object" },
      safety: { type: "object" },
    },
  },
  calculate_varshaphal: {
    type: "object",
    required: [
      "schemaVersion",
      "status",
      "subject",
      "solarReturn",
      "annualChart",
      "muntha",
      "tajika",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-varshaphal-1" },
      status: { type: "string" },
      subject: { type: "object" },
      solarReturn: { type: "object" },
      annualChart: { type: "object" },
      muntha: { type: "object" },
      tajika: { type: "object" },
      safety: { type: "object" },
    },
  },
  calculate_ayanamsa_chart: {
    type: "object",
    required: [
      "schemaVersion",
      "selected",
      "placements",
      "aspects",
      "boundaryChangesFromLahiri",
      "scope",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-ayanamsa-projection-1" },
      selected: { type: "object" },
      placements: { type: "array" },
      aspects: { type: "object" },
      boundaryChangesFromLahiri: { type: "array" },
      scope: { type: "object" },
      safety: { type: "object" },
    },
  },
  detect_life_themes: {
    type: "object",
    required: [
      "schemaVersion",
      "range",
      "patterns",
      "periods",
      "sourceCoverage",
      "uncertainty",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-life-themes-1" },
      range: { type: "object" },
      patterns: { type: "array" },
      periods: { type: "array" },
      sourceCoverage: { type: "object" },
      uncertainty: { type: "object" },
      safety: { type: "object" },
    },
  },
  generate_full_life_report: {
    type: "object",
    required: [
      "schemaVersion",
      "subject",
      "anchors",
      "plainLanguageReading",
      "placements",
      "measuredStrengths",
      "aspects",
      "ashtakavarga",
      "divisionalChartAnchors",
      "currentTiming",
      "sourceCoverage",
      "uncertainty",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-full-life-report-1" },
      subject: { type: "object" },
      anchors: { type: "object" },
      plainLanguageReading: { type: "object" },
      placements: { type: "array" },
      measuredStrengths: { type: "array" },
      aspects: { type: "object" },
      ashtakavarga: { type: "object" },
      divisionalChartAnchors: { type: "object" },
      currentTiming: { type: "object" },
      sourceCoverage: { type: "object" },
      uncertainty: { type: "object" },
      safety: { type: "object" },
    },
  },
  get_full_reading_context: { type: "object", additionalProperties: true },
  get_full_life_report_section: {
    type: "object",
    required: ["schemaVersion", "section", "data", "safety"],
    properties: {
      schemaVersion: { const: "sahadeva-full-life-report-section-1" },
      section: { type: "string" },
      data: {},
      safety: { type: "object" },
    },
  },
  calculate_south_indian_chart: {
    type: "object",
    required: [
      "input",
      "placements",
      "panchanga",
      "dashas",
      "advanced",
      "engine",
    ],
    properties: {
      input: { type: "object" },
      placements: { type: "array" },
      panchanga: { type: "object" },
      dashas: { type: "object" },
      advanced: { type: "object" },
      engine: { type: "object" },
    },
  },
  describe_methodology: {
    type: "object",
    required: [
      "computation",
      "currentAccuracy",
      "supportedMethodology",
      "productionGate",
      "interpretation",
    ],
    properties: {
      computation: { type: "string" },
      currentAccuracy: { type: "string" },
      supportedMethodology: { type: "string" },
      productionGate: { type: "string" },
      interpretation: { type: "string" },
    },
  },
  calculate_gochara: {
    type: "object",
    required: ["instantJulianDay", "engine", "natalLagnaSign", "placements"],
    properties: {
      instantJulianDay: { type: "number" },
      engine: { type: "object" },
      natalLagnaSign: { type: "integer" },
      placements: { type: "array" },
    },
  },
  calculate_gochara_from_known_place: {
    type: "object",
    required: [
      "instantJulianDay",
      "engine",
      "resolvedPlace",
      "natalLagnaSign",
      "placements",
    ],
    properties: {
      instantJulianDay: { type: "number" },
      engine: { type: "object" },
      resolvedPlace: { type: "object" },
      natalLagnaSign: { type: "integer" },
      placements: { type: "array" },
    },
  },
  calculate_ingress_timeline: {
    type: "object",
    required: ["events", "precision"],
    properties: { events: { type: "array" }, precision: { type: "string" } },
  },
  simulate_birth_time_uncertainty: {
    type: "object",
    required: ["stability", "samples", "notice"],
    properties: {
      stability: { type: "object" },
      samples: { type: "array" },
      notice: { type: "string" },
    },
  },
  knowledge_status: {
    type: "object",
    required: ["readiness", "publicationRule"],
    properties: {
      readiness: { type: "string" },
      publicationRule: { type: "string" },
    },
  },
  search_classics: {
    type: "object",
    required: ["query", "results", "notice"],
    properties: {
      query: { type: "string" },
      results: { type: "array" },
      notice: { type: "string" },
    },
  },
  list_rule_review_queue: {
    type: "object",
    required: ["items", "summary", "publicationRule"],
    properties: {
      items: { type: "array" },
      summary: { type: "object" },
      publicationRule: { type: "string" },
    },
  },
  get_rule_citations: {
    type: "object",
    required: ["citations", "unresolvedSourceKeys", "publicationRule"],
    properties: {
      citations: { type: "array" },
      unresolvedSourceKeys: { type: "array" },
      publicationRule: { type: "string" },
    },
  },
  get_synthesis_validation_status: {
    type: "object",
    required: [
      "protocol",
      "currentStatus",
      "blindValidationCompleted",
      "calibratedProbabilities",
    ],
    properties: {
      protocol: { type: "object" },
      currentStatus: { type: "string" },
      blindValidationCompleted: { type: "boolean" },
      calibratedProbabilities: { type: "boolean" },
    },
  },
  query_vimshottari_date: {
    type: "object",
    required: ["mahadasha", "antardasha", "pratyantardasha"],
    properties: {
      mahadasha: { type: "string" },
      antardasha: { type: "string" },
      pratyantardasha: { type: "string" },
    },
  },
  get_compact_chart_evidence: { type: "object", additionalProperties: true },
  get_timing_context: {
    type: "object",
    required: [
      "schemaVersion",
      "queryDate",
      "dasha",
      "transits",
      "saturnPeriods",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-timing-1" },
      queryDate: { type: "string" },
      dasha: { type: "object" },
      transits: { type: "array" },
      saturnPeriods: { type: "object" },
    },
  },
  build_slow_transit_calendar: {
    type: "object",
    required: ["periods", "dashaIntersections"],
    properties: {
      periods: { type: "array" },
      dashaIntersections: { type: "array" },
    },
  },
  find_marriage_windows: {
    type: "object",
    required: [
      "schemaVersion",
      "subject",
      "range",
      "natal",
      "windows",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-marriage-windows-1" },
      subject: { type: "object" },
      range: { type: "object" },
      natal: { type: "object" },
      windows: { type: "array" },
      safety: { type: "object" },
    },
  },
  get_marriage_readiness: {
    type: "object",
    required: [
      "schemaVersion",
      "compatibility",
      "subjects",
      "marriageWindows",
      "safety",
    ],
    properties: {
      schemaVersion: { const: "sahadeva-marriage-readiness-1" },
      compatibility: { type: "object" },
      subjects: { type: "object" },
      marriageWindows: { type: "object" },
      safety: { type: "object" },
    },
  },
  render_chart: {
    type: "object",
    required: ["format", "mimeType", "svg", "safety"],
    properties: {
      format: { const: "svg" },
      mimeType: { const: "image/svg+xml" },
      svg: { type: "string" },
      safety: { type: "object" },
    },
  },
  generate_report_pdf: {
    type: "object",
    required: ["id", "url", "expiresAt", "contentType", "safety"],
    properties: {
      id: { type: "string" },
      url: { type: "string" },
      expiresAt: { type: "string" },
      contentType: { const: "application/pdf" },
      safety: { type: "object" },
    },
  },
};
const stateChangingTools = new Set([
  "record_prashna_outcome",
  "generate_report_pdf",
]);
for (const tool of mcpTools)
  Object.assign(tool, {
    outputSchema: mcpOutputSchemas[tool.name],
    annotations: {
      readOnlyHint: !stateChangingTools.has(tool.name),
      destructiveHint: false,
      idempotentHint: !stateChangingTools.has(tool.name),
      openWorldHint: tool.name === "search_locations",
    },
  });

function rpcResult(id: RpcRequest["id"], result: unknown) {
  if (result && typeof result === "object") {
    const payload = result as {
      content?: Array<{ type?: string; text?: string }>;
      structuredContent?: unknown;
    };
    if (payload.structuredContent && payload.content?.length === 1) {
      const block = payload.content[0],
        structuredJson = JSON.stringify(payload.structuredContent);
      if (
        block.type === "text" &&
        block.text === structuredJson &&
        structuredJson.length > 12_000
      ) {
        const structured = payload.structuredContent as Record<string, unknown>;
        payload.content = [
          {
            type: "text",
            text: [
              `Sahadeva calculation completed (${structuredJson.length} structured bytes).`,
              `Schema: ${String(structured.schemaVersion || "tool-specific")}.`,
              `Top-level fields: ${Object.keys(structured).slice(0, 16).join(", ")}.`,
              "Use structuredContent for the calculation data. Request a compact or section-specific tool when full matrices are unnecessary.",
            ].join(" "),
          },
        ];
      }
    }
  }
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function rpcError(
  id: RpcRequest["id"],
  code: number,
  message: string,
  data?: unknown,
) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data } };
}
function placeRpcError(
  id: RpcRequest["id"],
  resolution: ReturnType<typeof resolveKnownLocation>,
  field = "place",
) {
  const candidates = resolution.matches.map((place) => ({
    label: locationLabel(place),
    name: place.name,
    district: place.district || null,
    state: place.state,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
  }));
  const structuredContent = {
    error: {
      code: "LOCATION_RESOLUTION_REQUIRED",
      field,
      status: resolution.status,
      candidates,
      nextAction: candidates.length
        ? "Retry with one candidate label"
        : "Resolve the place using the MCP host's own capabilities, then provide latitude, longitude, and an IANA timezone",
    },
  };
  return rpcResult(id, {
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
    isError: true,
  });
}

type ResolvedToolLocation = {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffset: number;
  source: "catalogue" | "coordinates" | "geoapify" | "workers-ai";
  confidence?: number;
  model?: string;
};

async function resolveLocationWithGeoapify(
  env: Env | undefined,
  query: string,
  date: string,
  time = "12:00",
): Promise<ResolvedToolLocation | undefined> {
  if (!env?.GEOAPIFY_API_KEY || query.trim().length < 2) return undefined;
  try {
    const url = new URL("https://api.geoapify.com/v1/geocode/search");
    url.searchParams.set("text", query.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "2");
    url.searchParams.set("apiKey", env.GEOAPIFY_API_KEY);
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return undefined;
    const payload = (await response.json()) as {
        results?: Array<{
          formatted?: string;
          lat?: number;
          lon?: number;
          timezone?: { name?: string };
          rank?: { confidence?: number };
          result_type?: string;
        }>;
      },
      first = payload.results?.[0],
      second = payload.results?.[1];
    if (!first) return undefined;
    const latitude = Number(first.lat),
      longitude = Number(first.lon),
      timezone = String(first.timezone?.name || ""),
      confidence = Number(first.rank?.confidence ?? 0.8);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      confidence < 0.65 ||
      (second &&
        first.formatted !== second.formatted &&
        Math.abs(confidence - Number(second.rank?.confidence ?? 0)) < 0.02)
    )
      return undefined;
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return {
      label: String(first.formatted || query),
      latitude,
      longitude,
      timezone,
      timezoneOffset: historicalTimezoneOffset(date, time, timezone),
      source: "geoapify",
      confidence,
    };
  } catch {
    return undefined;
  }
}

function parseAiJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1],
    object = text.match(/\{[\s\S]*\}/)?.[0];
  for (const candidate of [fenced, object, text]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      // Try the next representation.
    }
  }
  return null;
}

async function resolveLocationWithAi(
  env: Env | undefined,
  query: string,
  date: string,
  time = "12:00",
): Promise<ResolvedToolLocation | undefined> {
  if (!env?.AI || query.trim().length < 2) return undefined;
  const configuredModel = env.AI_MODEL || "@cf/zai-org/glm-5.3-flash",
    model = configuredModel.startsWith("@cf/")
      ? configuredModel
      : "@cf/zai-org/glm-5.3-flash";
  try {
    const result = await Promise.race([
        env.AI.run(model as Parameters<Ai["run"]>[0], {
          messages: [
            {
              role: "system",
              content:
                "Resolve geographic place names. Return only one JSON object. Never invent a match. If the place is ambiguous or unknown, set resolved=false. timezone must be a valid IANA timezone, not an abbreviation.",
            },
            {
              role: "user",
              content: `Resolve this place for an astronomical chart: ${query}\nReturn {"resolved":boolean,"canonicalName":string,"country":string,"adminArea":string,"latitude":number,"longitude":number,"timezone":string,"confidence":number}. Confidence is 0 to 1.`,
            },
          ],
          max_tokens: 300,
          temperature: 0,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Location AI timeout")), 10000),
        ),
      ]),
      parsed = parseAiJson(narrationText(result));
    if (!parsed?.resolved) return undefined;
    const latitude = Number(parsed.latitude),
      longitude = Number(parsed.longitude),
      timezone = String(parsed.timezone || ""),
      confidence = Number(parsed.confidence);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      !Number.isFinite(confidence) ||
      confidence < 0.7
    )
      return undefined;
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    const canonicalName = String(parsed.canonicalName || query).trim(),
      adminArea = String(parsed.adminArea || "").trim(),
      country = String(parsed.country || "").trim();
    return {
      label: [canonicalName, adminArea, country].filter(Boolean).join(", "),
      latitude,
      longitude,
      timezone,
      timezoneOffset: historicalTimezoneOffset(date, time, timezone),
      source: "workers-ai",
      confidence,
      model,
    };
  } catch {
    return undefined;
  }
}
function resolveToolLocation(
  args: Record<string, unknown> | undefined,
  date: string,
  time = "12:00",
): {
  location?: ResolvedToolLocation;
  resolution?: ReturnType<typeof resolveKnownLocation>;
  error?: string;
} {
  const latitude = Number(args?.latitude),
    longitude = Number(args?.longitude),
    timezone = typeof args?.timezone === "string" ? args.timezone.trim() : "";
  const hasAnyCoordinate =
    args?.latitude !== undefined ||
    args?.longitude !== undefined ||
    args?.timezone !== undefined;
  if (hasAnyCoordinate) {
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      !timezone
    )
      return {
        error:
          "Explicit location requires valid latitude, longitude, and an IANA timezone",
      };
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      return { error: "Invalid IANA timezone" };
    }
    const supplied = Number(args?.timezoneOffset),
      timezoneOffset = Number.isFinite(supplied)
        ? supplied
        : historicalTimezoneOffset(date, time, timezone);
    return {
      location: {
        label:
          typeof args?.place === "string" && args.place.trim()
            ? args.place.trim()
            : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude,
        timezone,
        timezoneOffset,
        source: "coordinates",
      },
    };
  }
  const resolution =
    typeof args?.place === "string"
      ? resolveKnownLocation(args.place)
      : { status: "none" as const, matches: [] };
  if (resolution.status !== "resolved") return { resolution };
  return {
    location: {
      label: locationLabel(resolution.location),
      latitude: resolution.location.latitude,
      longitude: resolution.location.longitude,
      timezone: resolution.location.timezone,
      timezoneOffset: resolution.location.timezoneOffset,
      source: "catalogue",
    },
  };
}
function locationInput(location: ResolvedToolLocation) {
  return {
    place: location.label,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    timezoneOffset: location.timezoneOffset,
  };
}
function parseLocatedBirth(
  args: Record<string, unknown> | undefined,
  methodology: "parashari" | "kp" = "parashari",
  focus = "general",
) {
  const resolved = resolveToolLocation(
    args,
    String(args?.date || ""),
    String(args?.time || "12:00"),
  );
  if (!resolved.location) return { resolved };
  const parsed = birthInputSchema.safeParse({
    ...args,
    ...locationInput(resolved.location),
    methodology,
    focus,
    birthTimeAccuracyMinutes: args?.birthTimeAccuracyMinutes ?? 5,
  });
  return { resolved, parsed };
}

function enrichedChart(chart: ReturnType<typeof calculateChart>) {
  const lagna = chart.placements.find(
    (placement) => placement.name === "Lagna",
  )!;
  const equal = new Map(
    chart.advanced.houses.equalBhava.planetHouses.map((item) => [
      item.name,
      item,
    ]),
  );
  const sripati = new Map(
    chart.advanced.houses.sripati.planetHouses.map((item) => [
      item.name,
      item.sripatiHouse,
    ]),
  );
  const dignities = new Map(
    chart.advanced.dignities.map((item) => [item.name, item]),
  );
  const placements = chart.placements.map((placement) => {
    const wholeSignHouse = ((placement.sign - lagna.sign + 12) % 12) + 1;
    const equalHouse =
      placement.name === "Lagna"
        ? 1
        : (equal.get(placement.name)?.equalBhavaHouse ?? null);
    const sripatiHouse =
      placement.name === "Lagna" ? 1 : (sripati.get(placement.name) ?? null);
    const selected = chart.advanced.houses.selectedSystem;
    const dignity = dignities.get(placement.name);
    return {
      ...placement,
      retrograde: Boolean(placement.retrograde),
      house:
        selected === "sripati"
          ? sripatiHouse
          : selected === "equal"
            ? equalHouse
            : wholeSignHouse,
      wholeSignHouse,
      equalHouse,
      sripatiHouse,
      dignity: dignity?.dignity || "not-applicable",
      combust: Boolean(dignity?.combust),
    };
  });
  return { ...chart, placements };
}

async function handleMcp(
  request: RpcRequest,
  env?: Env,
  identity?: KeyIdentity,
): Promise<any> {
  if (request.jsonrpc !== "2.0" || !request.method)
    return rpcError(request.id, -32600, "Invalid JSON-RPC request");
  if (request.method === "initialize")
    return rpcResult(request.id, {
      protocolVersion: "2025-11-25",
      capabilities: {
        tools: {},
        prompts: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
      serverInfo: { name: "sahadeva", version: "0.3.0" },
    });
  if (request.method === "server/discover")
    return rpcResult(request.id, {
      protocolVersion: "2026-07-28",
      serverInfo: { name: "sahadeva", version: "0.3.0" },
      capabilities: {
        tools: { listChanged: false },
        prompts: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
    });
  if (request.method === "notifications/initialized") return null;
  if (request.method === "ping") return rpcResult(request.id, {});
  if (request.method === "tools/list")
    return rpcResult(request.id, {
      tools: mcpTools,
      ttlMs: 3600000,
      cacheScope: "public",
    });
  if (request.method === "prompts/list")
    return rpcResult(request.id, {
      prompts: [
        {
          name: "quick_consultation",
          description:
            "Answer a focused Jyotish question with one compact deterministic tool call.",
          arguments: [
            { name: "birth_details", required: true },
            { name: "question", required: true },
            { name: "focus", required: false },
          ],
        },
        {
          name: "full_life_reading",
          description:
            "Resolve a place and generate a complete evidence-linked South Indian life report.",
          arguments: [
            {
              name: "birth_details",
              description: "Name, date, local time and birth place",
              required: true,
            },
            {
              name: "focus",
              description: "Optional life area",
              required: false,
            },
          ],
        },
        {
          name: "timing_outlook",
          description:
            "Explain Dasha and slow-transit windows without guaranteeing events.",
          arguments: [
            { name: "birth_details", required: true },
            { name: "as_of_date", required: true },
            { name: "horizon_years", required: false },
          ],
        },
        {
          name: "prashna_consultation",
          description:
            "Run a bounded Prashna consultation and explain how to record the later outcome.",
          arguments: [
            { name: "question", required: true },
            { name: "category", required: true },
            { name: "location", required: true },
          ],
        },
        {
          name: "chart_fact_check",
          description:
            "Check sign indexing, Nakshatra consistency, location and methodology before interpretation.",
          arguments: [{ name: "chart_or_birth_details", required: true }],
        },
        {
          name: "synthesis_validation_audit",
          description:
            "Audit life-theme output against citation, calibration, leakage, and safety gates.",
          arguments: [{ name: "life_theme_output", required: true }],
        },
      ],
    });
  if (request.method === "prompts/get") {
    const promptName = (request.params as unknown as { name?: string })?.name,
      templates: Record<string, string> = {
        quick_consultation:
          "Resolve the location using your own host capabilities when necessary, then call consult_jyotishya once with the birth details, question, focus, asOfDate and detail=brief. Explain the returned priorities and timing in plain language. Do not call the full chart or full report unless the user explicitly requests technical depth.",
        full_life_reading:
          "Call search_locations for a deterministic match. If none exists, resolve the place using your own host capabilities and pass its label, latitude, longitude, and IANA timezone to calculate_chart_from_known_place. Sahadeva MCP tools never need another AI call. Then call generate_full_life_report, explain each section plainly, preserve evidence and uncertainty, and never turn timing themes into guaranteed events.",
        timing_outlook:
          "Call get_timing_context and generate_full_life_report with the requested horizon. Summarize year-by-year overlaps as planning themes, not deterministic predictions.",
        prashna_consultation:
          "Call calculate_prashna with the user's exact question, category and verified location. Preserve chartFitness, evidence tier, contradictions, uncertainty and safety notice. Present remedies as optional practices, never guarantees. Keep the private confirmationToken available to the user; when they later report what happened, call record_prashna_outcome with that token and do not infer an outcome on their behalf.",
        chart_fact_check:
          "Verify the exact location, IANA timezone, zodiac.signIndexBase, signName/Nakshatra agreement, ayanamsa and house system. Report display or input errors separately from calculation errors.",
        synthesis_validation_audit:
          "Call get_synthesis_validation_status and get_rule_citations for every sourceKey. Treat heuristic scores as within-chart rankings, never probabilities. Report missing citations, insufficient cohort gates, possible outcome leakage, and prohibited event-specific inferences.",
      };
    if (!promptName || !templates[promptName])
      return rpcError(request.id, -32602, "Unknown prompt");
    return rpcResult(request.id, {
      description: promptName,
      messages: [
        {
          role: "user",
          content: { type: "text", text: templates[promptName] },
        },
      ],
    });
  }
  if (request.method === "resources/list")
    return rpcResult(request.id, {
      resources: [
        {
          uri: "sahadeva://methodology",
          name: "Sahadeva methodology and safety contract",
          mimeType: "application/json",
        },
        {
          uri: "sahadeva://mcp-workflows",
          name: "Recommended MCP workflows",
          mimeType: "application/json",
        },
        {
          uri: "sahadeva://rule-review-policy",
          name: "Rule citation and publication policy",
          mimeType: "application/json",
        },
        {
          uri: "sahadeva://synthesis-validation",
          name: "Blind validation protocol for life-theme ranking",
          mimeType: "application/json",
        },
      ],
    });
  if (request.method === "resources/read") {
    const uri = (request.params as unknown as { uri?: string })?.uri,
      data =
        uri === "sahadeva://methodology"
          ? {
              calculation: "deterministic",
              zodiac: "Lahiri sidereal",
              signIndex: "0-11 with signName",
              interpretation: "traditional research preview",
              safety:
                "no medical, legal, financial, fertility, lifespan or guaranteed-event claims",
            }
          : uri === "sahadeva://mcp-workflows"
            ? {
                defaultConsultation: ["consult_jyotishya"],
                fullReport: [
                  "search_locations",
                  "calculate_chart_from_known_place or calculate_south_indian_chart",
                  "generate_full_life_report",
                ],
                timing: ["get_timing_context", "build_slow_transit_calendar"],
                consultation: [
                  "search_locations",
                  "calculate_prashna",
                  "record_prashna_outcome after the user reports what happened",
                ],
                consultationDepth: [
                  "get_depth_analysis",
                  "fuse_timing",
                  "rectify_birth_time when event evidence is supplied",
                ],
                citations: ["list_rule_review_queue", "get_rule_citations"],
                compactNarration: ["get_compact_chart_evidence"],
              }
            : uri === "sahadeva://rule-review-policy"
              ? {
                  states: [
                    "needs-source-passage",
                    "needs-passage-review",
                    "needs-rule-review",
                    "needs-second-approval",
                    "blocked-by-review",
                    "blocked-by-contradiction",
                    "publishable",
                  ],
                  publicationGate: {
                    passageApproved: true,
                    ruleApproved: true,
                    distinctApprovals: 2,
                    noBlockingReview: true,
                    noOpenContradiction: true,
                  },
                  clientRule:
                    "Never present an unresolved sourceKey as a classical citation.",
                }
              : uri === "sahadeva://synthesis-validation"
                ? {
                    ...LIFE_THEME_VALIDATION_PROTOCOL,
                    currentStatus: "not-started",
                    blindValidationCompleted: false,
                    calibratedProbabilities: false,
                  }
                : null;
    if (!data) return rpcError(request.id, -32602, "Unknown resource");
    return rpcResult(request.id, {
      contents: [
        { uri, mimeType: "application/json", text: JSON.stringify(data) },
      ],
    });
  }
  if (request.method === "tools/call") {
    const name = request.params?.name;
    if (name === "calculate_prashna") {
      const receivedAt = new Date(),
        args = request.params?.arguments as Record<string, unknown> | undefined,
        resolved = resolveToolLocation(
          args,
          receivedAt.toISOString().slice(0, 10),
          receivedAt.toISOString().slice(11, 16),
        );
      if (!resolved.location)
        return resolved.resolution
          ? placeRpcError(request.id, resolved.resolution)
          : rpcError(request.id, -32602, resolved.error || "Invalid location");
      const parsed = prashnaRequestSchema.safeParse({
        ...args,
        place: resolved.location.label,
        latitude: resolved.location.latitude,
        longitude: resolved.location.longitude,
        timezone: resolved.location.timezone,
      });
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid Prashna request",
          parsed.error.flatten(),
        );
      const structuredContent = buildPrashnaConsultation(
        parsed.data,
        receivedAt,
      );
      if (env?.DB)
        await env.DB.prepare(
          "INSERT INTO consultations (id,created_at,method,category,question_hash,confirmation_hash,asked_at,result_json,outcome_status) VALUES (?,?,?,?,?,?,?,?,'awaiting-outcome')",
        )
          .bind(
            structuredContent.consultationId,
            receivedAt.toISOString(),
            "prashna",
            parsed.data.category,
            await sha256(parsed.data.question.trim().toLowerCase()),
            await sha256(structuredContent.feedback.confirmationToken),
            structuredContent.question.askedAt,
            JSON.stringify(redactConfirmationToken(structuredContent)),
          )
          .run();
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "record_prashna_outcome") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        confirmationToken = String(args?.confirmationToken || ""),
        outcome = String(args?.outcome || ""),
        resolvedAt = args?.resolvedAt ? String(args.resolvedAt) : null,
        notes = String(args?.notes || "").slice(0, 1000) || null,
        allowedOutcomes = new Set([
          "confirmed",
          "partly-confirmed",
          "not-confirmed",
          "unresolved",
        ]);
      if (
        confirmationToken.length < 16 ||
        !allowedOutcomes.has(outcome) ||
        (resolvedAt !== null && !Number.isFinite(Date.parse(resolvedAt)))
      )
        return rpcError(
          request.id,
          -32602,
          "A valid confirmationToken, outcome and optional resolvedAt are required",
        );
      if (!env?.DB)
        return rpcError(request.id, -32000, "Outcome storage is unavailable");
      const existing = await env.DB.prepare(
        "SELECT id FROM consultations WHERE confirmation_hash=?",
      )
        .bind(await sha256(confirmationToken))
        .first<{ id: string }>();
      if (!existing)
        return rpcError(request.id, -32004, "Consultation not found");
      const id = crypto.randomUUID(),
        recordedAt = new Date().toISOString(),
        structuredContent = {
          id,
          consultationId: existing.id,
          status: "recorded" as const,
          recordedAt,
        };
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO consultation_outcomes (id,consultation_id,recorded_at,outcome,resolved_at,notes) VALUES (?,?,?,?,?,?)",
        ).bind(id, existing.id, recordedAt, outcome, resolvedAt, notes),
        env.DB.prepare(
          "UPDATE consultations SET outcome_status=? WHERE id=?",
        ).bind(outcome, existing.id),
      ]);
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "rectify_birth_time") {
      const parsed = rectificationRequestSchema.safeParse(
        request.params?.arguments,
      );
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid rectification request",
          parsed.error.flatten(),
        );
      const structuredContent = rectifyBirthTime(parsed.data);
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "get_depth_analysis" || name === "fuse_timing") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        result = parseLocatedBirth(args),
        parsed = result.parsed;
      if (!parsed)
        return result.resolved.resolution
          ? placeRpcError(request.id, result.resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              result.resolved.error || "Invalid location",
            );
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const chart = calculateChart(parsed.data);
      let structuredContent: any;
      if (name === "get_depth_analysis") {
        const topic = String(args?.topic || "career") as any;
        structuredContent = {
          schemaVersion: "sahadeva-depth-1",
          topic,
          strengthLineage: calculateStrengthLineage(chart),
          vargaSynthesis: synthesizeVargas(chart, topic),
          targetedLagnas: chart.advanced.houses.targetedLagnas,
          yogas: chart.advanced.yogas,
          additionalDashas: additionalDashaStatus(chart),
          safety: safetyEnvelope(),
        };
      } else
        structuredContent = fuseTiming(
          chart,
          String(args?.topic || "career") as any,
          String(args?.startIso),
          String(args?.endIso),
        );
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    // Authentication, scopes and rate limits protect the service. Product
    // billing state must never block calculations, compatibility or reports.
    if (name === "render_chart") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        located = parseLocatedBirth(args),
        parsed = located.parsed;
      if (!parsed?.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth or location details",
          !parsed?.success ? parsed?.error?.flatten() : located.resolved,
        );
      const chart = await calculateChartCached(env, parsed.data),
        svg = southIndianChartSvg(chart, Number(args?.size || 1200)),
        structuredContent = {
          format: "svg",
          mimeType: "image/svg+xml",
          svg,
          safety: safetyEnvelope(),
        };
      return rpcResult(request.id, {
        content: [{ type: "text", text: svg }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "generate_report_pdf") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        located = parseLocatedBirth(args),
        parsed = located.parsed;
      if (!parsed?.success || !env)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth or server environment",
          !parsed?.success ? parsed?.error?.flatten() : undefined,
        );
      const chart = await calculateChartCached(env, parsed.data),
        report = buildFullLifeReport(
          chart,
          typeof args?.asOfDate === "string"
            ? args.asOfDate
            : new Date().toISOString(),
          Number(args?.horizonYears || 5),
        ),
        pdf = await buildServerReportPdf(
          chart,
          report as unknown as Record<string, any>,
        ),
        id = crypto.randomUUID(),
        expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      await env.DB.prepare(
        "INSERT INTO report_artifacts(id,content_type,body,expires_at) VALUES(?,?,?,?)",
      )
        .bind(id, "application/pdf", pdf, expiresAt)
        .run();
      const structuredContent = {
        id,
        url: `https://sahadeva.everyai-com.workers.dev/api/reports/${id}`,
        expiresAt,
        contentType: "application/pdf",
        safety: safetyEnvelope(),
      };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "search_locations") {
      const args = request.params?.arguments as
          { query?: unknown; limit?: unknown } | undefined,
        query = typeof args?.query === "string" ? args.query.trim() : "",
        limit = Math.min(20, Math.max(1, Number(args?.limit || 8)));
      if (query.length < 2)
        return rpcError(
          request.id,
          -32602,
          "Location query must contain at least two characters",
        );
      const exact = resolveKnownLocation(query),
        matches = searchKnownLocations(query, limit);
      type LocationSearchRow = {
        label: string;
        name: string;
        mandal: string | null;
        district: string | null;
        state: string;
        country: string;
        latitude: number;
        longitude: number;
        timezone: string;
        timezoneOffset: number;
        precision: string;
        source?: ResolvedToolLocation["source"];
        confidence?: number;
        model?: string;
      };
      let rows: LocationSearchRow[] = matches.map((place) => ({
        label: locationLabel(place),
        name: place.name,
        mandal: place.mandal || null,
        district: place.district || null,
        state: place.state,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
        timezoneOffset: place.timezoneOffset,
        precision: place.precision || "city-center",
      }));
      if (env?.DB && rows.length < limit) {
        const escaped = query.toLocaleLowerCase(),
          geo = await env.DB.prepare(
            "SELECT name,ascii_name,latitude,longitude,country_code,admin1_code,population,timezone FROM geonames_locations WHERE lower(name)=? OR lower(ascii_name)=? OR lower(name) LIKE ? OR lower(ascii_name) LIKE ? OR lower(alternate_names) LIKE ? ORDER BY CASE WHEN lower(name)=? OR lower(ascii_name)=? THEN 0 ELSE 1 END,population DESC LIMIT ?",
          )
            .bind(
              escaped,
              escaped,
              `${escaped}%`,
              `${escaped}%`,
              `%${escaped}%`,
              escaped,
              escaped,
              limit,
            )
            .all()
            .catch(() => ({ results: [] }));
        const seen = new Set(
          rows.map((item) => `${item.latitude}:${item.longitude}`),
        );
        for (const item of geo.results as Array<Record<string, unknown>>) {
          const key = `${item.latitude}:${item.longitude}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const timezone = String(item.timezone),
            timezoneOffset = historicalTimezoneOffset(
              new Date().toISOString().slice(0, 10),
              "12:00",
              timezone,
            );
          rows.push({
            label: `${item.name}, ${item.admin1_code || ""}, ${item.country_code}`,
            name: String(item.name),
            mandal: null,
            district: null,
            state: String(item.admin1_code || ""),
            country: String(item.country_code),
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            timezone,
            timezoneOffset,
            precision: "city-center",
          });
          if (rows.length >= limit) break;
        }
      }
      const structuredContent = {
        query,
        status:
          exact.status === "resolved"
            ? "resolved"
            : exact.status === "ambiguous"
              ? "ambiguous"
              : rows.length === 1 &&
                  String(rows[0].name)
                    .normalize("NFKD")
                    .replace(/\p{Diacritic}/gu, "")
                    .toLocaleLowerCase() ===
                    query
                      .normalize("NFKD")
                      .replace(/\p{Diacritic}/gu, "")
                      .toLocaleLowerCase()
                ? "resolved"
                : rows.length
                  ? "ambiguous"
                  : "not_found",
        matches: rows,
        notice: rows.length
          ? "Use the exact coordinates and timezone from the intended match in calculation tools."
          : "No deterministic match. The MCP host should resolve the place with its own capabilities, then pass the place label, latitude, longitude, and IANA timezone to calculate_chart_from_known_place.",
      };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_chart_from_known_place") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        resolved = resolveToolLocation(
          args,
          String(args?.date || ""),
          String(args?.time || "12:00"),
        );
      if (!resolved.location)
        return resolved.resolution
          ? placeRpcError(request.id, resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              resolved.error || "Valid location details are required",
            );
      const parsed = birthInputSchema.safeParse({
        ...args,
        ...locationInput(resolved.location),
        methodology: "parashari",
        focus: args?.focus || "general",
        birthTimeAccuracyMinutes: args?.birthTimeAccuracyMinutes ?? 5,
      });
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const structuredContent = {
        ...enrichedChart(await calculateChartCached(env, parsed.data)),
        locationResolution: {
          source: resolved.location.source,
          confidence: resolved.location.confidence ?? 1,
          model: resolved.location.model || null,
        },
      };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_compatibility") {
      const args = request.params?.arguments as
        | {
            bride?: Record<string, unknown>;
            groom?: Record<string, unknown>;
            language?: unknown;
          }
        | undefined;
      const resolvePerson = (person: Record<string, unknown> | undefined) => {
        const resolved = resolveToolLocation(
          person,
          String(person?.date || ""),
          String(person?.time || "12:00"),
        );
        if (!resolved.location)
          return {
            error:
              resolved.error || resolved.resolution?.status === "ambiguous"
                ? "Place is ambiguous"
                : "Location is incomplete",
            place: resolved.resolution,
          };
        const parsed = birthInputSchema.safeParse({
          ...person,
          ...locationInput(resolved.location),
          language: args?.language || "en",
          methodology: "parashari",
          focus: "marriage",
          birthTimeAccuracyMinutes: person?.birthTimeAccuracyMinutes ?? 5,
        });
        return parsed.success
          ? { chart: calculateChart(parsed.data) }
          : { error: "Invalid birth details", details: parsed.error.flatten() };
      };
      const bride = resolvePerson(args?.bride),
        groom = resolvePerson(args?.groom);
      if (!bride.chart || !groom.chart) {
        const candidates = (result: typeof bride) =>
          result.place?.matches?.map((place) => ({
            label: locationLabel(place),
            latitude: place.latitude,
            longitude: place.longitude,
            timezone: place.timezone,
          })) || [];
        return rpcError(
          request.id,
          -32602,
          "Both people need valid, unambiguous known places",
          {
            bride: {
              error: bride.error,
              details: bride.details,
              candidates: candidates(bride),
            },
            groom: {
              error: groom.error,
              details: groom.details,
              candidates: candidates(groom),
            },
          },
        );
      }
      const structuredContent = calculateCompatibility(
        bride.chart,
        groom.chart,
      );
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "get_panchanga") {
      const args = request.params?.arguments as
          | {
              date?: unknown;
              place?: unknown;
              language?: unknown;
              natal?: Record<string, unknown>;
            }
          | undefined,
        date = typeof args?.date === "string" ? args.date : "",
        resolved = resolveToolLocation(args as Record<string, unknown>, date);
      if (!resolved.location)
        return resolved.resolution
          ? placeRpcError(request.id, resolved.resolution)
          : rpcError(request.id, -32602, resolved.error || "Invalid location");
      const place = resolved.location;
      const nextDate = new Date(`${date}T12:00:00Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      const common = {
          name: "Daily Panchanga",
          time: "12:00",
          ...locationInput(place),
          language: args?.language || "en",
          methodology: "parashari",
          focus: "general",
          birthTimeAccuracyMinutes: 0,
        },
        today = birthInputSchema.safeParse({ ...common, date }),
        tomorrow = birthInputSchema.safeParse({
          ...common,
          date: nextDate.toISOString().slice(0, 10),
        });
      if (!today.success || !tomorrow.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid Panchanga date",
          !today.success
            ? today.error.flatten()
            : !tomorrow.success
              ? tomorrow.error.flatten()
              : undefined,
        );
      let natalChart: ReturnType<typeof calculateChart> | undefined;
      if (args?.natal) {
        const natalPlace = resolveToolLocation(
          args.natal,
          String(args.natal.date || ""),
          String(args.natal.time || "12:00"),
        );
        if (!natalPlace.location)
          return natalPlace.resolution
            ? placeRpcError(request.id, natalPlace.resolution, "natal.place")
            : rpcError(
                request.id,
                -32602,
                natalPlace.error || "Invalid natal location",
              );
        const natal = birthInputSchema.safeParse({
          ...args.natal,
          ...locationInput(natalPlace.location),
          language: args?.language || "en",
          methodology: "parashari",
          focus: "general",
          birthTimeAccuracyMinutes: args.natal.birthTimeAccuracyMinutes ?? 5,
        });
        if (!natal.success)
          return rpcError(
            request.id,
            -32602,
            "Invalid natal details",
            natal.error.flatten(),
          );
        natalChart = calculateChart(natal.data);
      }
      const structuredContent = buildDailyPanchanga(
        calculateChart(today.data),
        calculateChart(tomorrow.data),
        natalChart,
      );
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "find_muhurta") {
      const args = request.params?.arguments as
          | {
              activity?: unknown;
              startDate?: unknown;
              endDate?: unknown;
              place?: unknown;
              limit?: unknown;
              natal?: Record<string, unknown>;
            }
          | undefined,
        activity = String(args?.activity || "");
      if (activity === "surgery")
        return rpcError(
          request.id,
          -32602,
          "Surgery is not ranked astrologically. Schedule medical procedures with the treating clinical team.",
        );
      if (!(activity in MUHURTA_RULEBOOK.activities))
        return rpcError(request.id, -32602, "Unsupported activity");
      const start = Date.parse(`${String(args?.startDate || "")}T00:00:00Z`),
        end = Date.parse(`${String(args?.endDate || "")}T00:00:00Z`);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end < start ||
        (end - start) / 86400000 > 6
      )
        return rpcError(
          request.id,
          -32602,
          "Date range must be valid and no longer than 7 inclusive days",
        );
      const resolvedPlace = resolveToolLocation(
        args as Record<string, unknown>,
        String(args?.startDate || ""),
      );
      if (!resolvedPlace.location)
        return resolvedPlace.resolution
          ? placeRpcError(request.id, resolvedPlace.resolution)
          : rpcError(
              request.id,
              -32602,
              resolvedPlace.error || "Invalid location",
            );
      const place = resolvedPlace.location;
      let natalChart: ReturnType<typeof calculateChart> | undefined;
      if (args?.natal) {
        const natalPlace = resolveToolLocation(
          args.natal,
          String(args.natal.date || ""),
          String(args.natal.time || "12:00"),
        );
        if (!natalPlace.location)
          return natalPlace.resolution
            ? placeRpcError(request.id, natalPlace.resolution, "natal.place")
            : rpcError(
                request.id,
                -32602,
                natalPlace.error || "Invalid natal location",
              );
        const parsed = birthInputSchema.safeParse({
          ...args.natal,
          ...locationInput(natalPlace.location),
          methodology: "parashari",
          focus: "general",
          birthTimeAccuracyMinutes: args.natal.birthTimeAccuracyMinutes ?? 5,
        });
        if (!parsed.success)
          return rpcError(
            request.id,
            -32602,
            "Invalid natal details",
            parsed.error.flatten(),
          );
        natalChart = calculateChart(parsed.data);
      }
      const windows = [];
      for (let at = start; at <= end; at += 86400000) {
        const date = new Date(at).toISOString().slice(0, 10),
          nextDate = new Date(at + 86400000).toISOString().slice(0, 10),
          base = {
            name: "Muhurta",
            time: "12:00",
            ...locationInput(place),
            language: "en",
            methodology: "parashari",
            focus: "general",
            birthTimeAccuracyMinutes: 0,
          },
          today = birthInputSchema.parse({ ...base, date }),
          tomorrow = birthInputSchema.parse({ ...base, date: nextDate }),
          daily = buildDailyPanchanga(
            calculateChart(today),
            calculateChart(tomorrow),
            natalChart,
          );
        if (daily.status !== "computed" || !daily.choghadiya) continue;
        for (const candidate of daily.choghadiya.day.filter(
          (item) => item.quality === "favorable",
        )) {
          const midpoint = new Date(
              ((candidate.startJulianDay + candidate.endJulianDay) / 2 -
                2440587.5) *
                86400000,
            ),
            parts = Object.fromEntries(
              new Intl.DateTimeFormat("en-CA", {
                timeZone: place.timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              })
                .formatToParts(midpoint)
                .filter((part) => part.type !== "literal")
                .map((part) => [part.type, part.value]),
            ),
            instant = birthInputSchema.parse({
              ...base,
              date: `${parts.year}-${parts.month}-${parts.day}`,
              time: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`,
            }),
            scored = scoreMuhurta(
              activity as MuhurtaActivity,
              daily,
              candidate,
              calculateChart(instant),
            );
          windows.push(scored);
        }
      }
      windows.sort(
        (a, b) => b.score - a.score || a.startJulianDay - b.startJulianDay,
      );
      const limit = Math.min(20, Math.max(1, Number(args?.limit || 10))),
        structuredContent = {
          schemaVersion: "sahadeva-muhurta-1",
          activity,
          range: {
            startDate: args?.startDate,
            endDate: args?.endDate,
            maximumDays: 7,
          },
          location: {
            label: place.label,
            timezone: place.timezone,
          },
          rulebook: {
            id: MUHURTA_RULEBOOK.id,
            version: MUHURTA_RULEBOOK.version,
            reviewStatus: MUHURTA_RULEBOOK.reviewStatus,
            sourceKeys: MUHURTA_RULEBOOK.sourceKeys,
            notice: MUHURTA_RULEBOOK.notice,
          },
          windows: windows.slice(0, limit),
          evaluatedWindows: windows.length,
          safety: {
            status: "research-preview",
            notice:
              "Ranked traditional planning windows are not guarantees. Draft activity tables await expert source review; medical procedures are explicitly unsupported.",
          },
        };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_doshas") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        result = parseLocatedBirth(args),
        parsed = result.parsed;
      if (!parsed)
        return result.resolved.resolution
          ? placeRpcError(request.id, result.resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              result.resolved.error || "Invalid location",
            );
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const structuredContent = calculateDoshas(calculateChart(parsed.data));
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_kp") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        result = parseLocatedBirth(args, "kp"),
        parsed = result.parsed;
      if (!parsed)
        return result.resolved.resolution
          ? placeRpcError(request.id, result.resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              result.resolved.error || "Invalid location",
            );
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const structuredContent = calculateKpPreview(calculateChart(parsed.data));
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_jaimini") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        result = parseLocatedBirth(args),
        parsed = result.parsed;
      if (!parsed)
        return result.resolved.resolution
          ? placeRpcError(request.id, result.resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              result.resolved.error || "Invalid location",
            );
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const structuredContent = calculateJaimini(calculateChart(parsed.data));
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_varshaphal") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        targetYear = Number(args?.targetYear),
        result = parseLocatedBirth(args),
        parsed = result.parsed;
      if (!parsed)
        return result.resolved.resolution
          ? placeRpcError(request.id, result.resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              result.resolved.error || "Invalid location",
            );
      if (
        !parsed.success ||
        !Number.isInteger(targetYear) ||
        targetYear < Number(String(args?.date).slice(0, 4)) ||
        targetYear > 2050
      )
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details or targetYear",
          parsed.success ? undefined : parsed.error.flatten(),
        );
      const natal = calculateChart(parsed.data),
        returnInfo = findSolarReturnJulianDay(natal, targetYear),
        instant = new Date((returnInfo.julianDay - 2440587.5) * 86400000),
        parts = Object.fromEntries(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: parsed.data.timezone!,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          })
            .formatToParts(instant)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
        ),
        annualInput = birthInputSchema.parse({
          ...parsed.data,
          date: `${parts.year}-${parts.month}-${parts.day}`,
          time: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`,
          birthTimeAccuracyMinutes: 0,
        }),
        structuredContent = calculateVarshaphal(
          natal,
          calculateChart(annualInput),
          targetYear,
          returnInfo,
        );
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_ayanamsa_chart") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        id = String(args?.ayanamsa || "") as AyanamsaId;
      if (!["lahiri", "krishnamurti", "raman", "fagan-bradley"].includes(id))
        return rpcError(request.id, -32602, "Unsupported ayanamsa");
      const result = parseLocatedBirth(args),
        parsed = result.parsed;
      if (!parsed)
        return result.resolved.resolution
          ? placeRpcError(request.id, result.resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              result.resolved.error || "Invalid location",
            );
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const structuredContent = projectAyanamsa(
        calculateChart(parsed.data),
        id,
      );
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "detect_life_themes") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        located = parseLocatedBirth(args),
        parsed = located.parsed,
        startDate = String(args?.startDate || ""),
        endDate = String(args?.endDate || "");
      if (!parsed)
        return located.resolved.resolution
          ? placeRpcError(request.id, located.resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              located.resolved.error || "Invalid location",
            );
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      try {
        const report = detectLifeThemes(
            calculateChart(parsed.data),
            `${startDate}T00:00:00.000Z`,
            `${endDate}T00:00:00.000Z`,
          ),
          keys = report.sourceCoverage.unresolvedSourceKeys;
        let approvedCitations: Array<Record<string, unknown>> = [];
        if (env?.DB && keys.length) {
          const placeholders = keys.map(() => "?").join(","),
            rows = await env.DB.prepare(
              `SELECT rb.source_key,r.id rule_id,r.interpretation,r.confidence,p.locator,p.literal_translation,s.id source_id,s.title source_title,s.author,s.edition FROM rule_bindings rb JOIN publishable_rules r ON r.id=rb.rule_id JOIN passages p ON p.id=r.passage_id AND p.review_status='approved' JOIN sources s ON s.id=p.source_id WHERE rb.source_key IN (${placeholders})`,
            )
              .bind(...keys)
              .all();
          approvedCitations = (rows.results || []) as Array<
            Record<string, unknown>
          >;
        }
        const found = new Set(
            approvedCitations.map((item) => String(item.source_key)),
          ),
          structuredContent = {
            ...report,
            sourceCoverage: {
              status:
                approvedCitations.length &&
                approvedCitations.length === keys.length
                  ? "reviewed"
                  : "awaiting-reviewed-rules",
              approvedCitations,
              unresolvedSourceKeys: keys.filter((key) => !found.has(key)),
            },
          };
        return rpcResult(request.id, {
          content: [{ type: "text", text: JSON.stringify(structuredContent) }],
          structuredContent,
          isError: false,
        });
      } catch {
        return rpcError(request.id, -32602, "Invalid life-theme date range");
      }
    }
    if (name === "find_marriage_windows") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        located = parseLocatedBirth(args),
        parsed = located.parsed;
      if (!parsed)
        return located.resolved.resolution
          ? placeRpcError(request.id, located.resolved.resolution)
          : rpcError(
              request.id,
              -32602,
              located.resolved.error || "Invalid location",
            );
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      try {
        const structuredContent = findMarriageWindows(
          calculateChart(parsed.data),
          String(args?.startDate || ""),
          Number(args?.years || 5),
        );
        return rpcResult(request.id, {
          content: [{ type: "text", text: JSON.stringify(structuredContent) }],
          structuredContent,
          isError: false,
        });
      } catch {
        return rpcError(request.id, -32602, "Invalid marriage-window request");
      }
    }
    if (name === "get_marriage_readiness") {
      const args = request.params?.arguments as
        | {
            bride?: Record<string, unknown>;
            groom?: Record<string, unknown>;
            startDate?: unknown;
            years?: unknown;
            muhurta?: Record<string, unknown>;
          }
        | undefined;
      const bride = parseLocatedBirth({ ...args?.bride, focus: "marriage" }),
        groom = parseLocatedBirth({ ...args?.groom, focus: "marriage" });
      for (const [field, result] of [
        ["bride", bride],
        ["groom", groom],
      ] as const) {
        if (!result.parsed)
          return result.resolved.resolution
            ? placeRpcError(
                request.id,
                result.resolved.resolution,
                `${field}.place`,
              )
            : rpcError(
                request.id,
                -32602,
                result.resolved.error || `Invalid ${field} location`,
              );
        if (!result.parsed.success)
          return rpcError(
            request.id,
            -32602,
            `Invalid ${field} birth details`,
            result.parsed.error.flatten(),
          );
      }
      if (!bride.parsed?.success || !groom.parsed?.success)
        return rpcError(request.id, -32602, "Invalid marriage readiness input");
      const muhurtaResponse: any = args?.muhurta
        ? await handleMcp(
            {
              jsonrpc: "2.0",
              id: "marriage-readiness-muhurta",
              method: "tools/call",
              params: {
                name: "find_muhurta",
                arguments: { ...args.muhurta, activity: "marriage" },
              },
            },
            env,
          )
        : null;
      const muhurtaCandidates: unknown =
        muhurtaResponse && "result" in muhurtaResponse
          ? (muhurtaResponse.result as { structuredContent?: unknown })
              .structuredContent
          : { status: "not-requested", windows: [] };
      const brideChart = calculateChart(bride.parsed.data),
        groomChart = calculateChart(groom.parsed.data),
        startDate = String(args?.startDate || ""),
        years = Number(args?.years || 5),
        structuredContent: Record<string, unknown> = {
          schemaVersion: "sahadeva-marriage-readiness-1",
          compatibility: calculateCompatibility(brideChart, groomChart),
          subjects: {
            bride: compactChartEvidence(brideChart),
            groom: compactChartEvidence(groomChart),
          },
          marriageWindows: {
            bride: findMarriageWindows(brideChart, startDate, years),
            groom: findMarriageWindows(groomChart, startDate, years),
          },
          muhurtaCandidates,
          safety: {
            status: "research-preview",
            prohibitedInferences: [
              "guaranteed marriage",
              "relationship success or failure",
              "fertility or pregnancy outcome",
            ],
            notice:
              "Readiness combines traditional structural calculations and is not a verdict about a relationship.",
          },
        };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "consult_jyotishya") {
      const startedAt = Date.now(),
        args = request.params?.arguments as Record<string, unknown> | undefined,
        located = resolveToolLocation(
          args,
          String(args?.date || ""),
          String(args?.time || "12:00"),
        );
      if (!located.location)
        return located.resolution
          ? placeRpcError(request.id, located.resolution)
          : rpcError(
              request.id,
              -32602,
              located.error || "Valid location details are required",
            );
      const parsed = birthInputSchema.safeParse({
        ...args,
        ...locationInput(located.location),
        methodology: "parashari",
        focus: args?.focus || "general",
        birthTimeAccuracyMinutes: args?.birthTimeAccuracyMinutes ?? 5,
      });
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid consultation details",
          parsed.error.flatten(),
        );
      try {
        const chart = await calculateChartCached(env, parsed.data),
          asOf =
            typeof args?.asOfDate === "string"
              ? args.asOfDate
              : new Date().toISOString(),
          current = queryDashaAt(chart, asOf),
          reading = buildEverydayReading(chart, current, parsed.data.language),
          detail = args?.detail === "standard" ? "standard" : "brief",
          preferredIds = new Set(["focus", "timing", "counsel"]),
          priorities =
            detail === "brief"
              ? reading.sections.filter((section) =>
                  preferredIds.has(section.id),
                )
              : reading.sections,
          lagna = chart.placements.find((item) => item.name === "Lagna")!,
          moon = chart.placements.find((item) => item.name === "Moon")!,
          strengths = chart.advanced.planetaryStates.avasthas
            .filter((item) => item.requiredStrengthRatio !== null)
            .sort(
              (a, b) =>
                Number(b.requiredStrengthRatio) -
                Number(a.requiredStrengthRatio),
            ),
          chartRef = `chart_${(
            await sha256(
              JSON.stringify([
                parsed.data.date,
                parsed.data.time,
                parsed.data.latitude,
                parsed.data.longitude,
                parsed.data.timezone,
                parsed.data.houseSystem,
                env?.ENGINE_VERSION || "unknown",
              ]),
            )
          ).slice(0, 20)}`,
          structuredContent = {
            schemaVersion: "sahadeva-consultation-1",
            chartRef,
            responseProfile: detail,
            subject: {
              name: parsed.data.name,
              place: parsed.data.place,
              question: String(args?.question || "").trim() || null,
              focus: parsed.data.focus,
            },
            anchors: {
              lagna: {
                signName: lagna.signName,
                degree: Number(lagna.degree.toFixed(2)),
              },
              moon: {
                signName: moon.signName,
                degree: Number(moon.degree.toFixed(2)),
                nakshatra: moon.nakshatra,
                pada: moon.pada,
              },
            },
            priorities,
            currentTiming: {
              asOf: current.instantIso,
              mahadasha: current.mahadasha,
              antardasha: current.antardasha,
              pratyantardasha: current.pratyantardasha,
              boundaries: current.boundaries,
            },
            measuredStrengths: strengths
              .slice(0, detail === "brief" ? 3 : 7)
              .map((item) => ({
                planet: item.name,
                ratio: item.requiredStrengthRatio,
                avastha: item.balaadiAvastha,
              })),
            confidence: chart.advanced.guidance.confidence,
            meta: {
              calculationMs: Date.now() - startedAt,
              engineVersion: chart.engine.version,
              locationSource: located.location.source,
              hiddenAiCalls: 0,
            },
            safety: safetyEnvelope(),
          },
          textSummary = [
            `${structuredContent.subject.name} · ${structuredContent.anchors.lagna.signName} Lagna · ${structuredContent.anchors.moon.nakshatra} Moon`,
            `Current period: ${current.mahadasha || "—"} / ${current.antardasha || "—"}`,
            ...priorities.map(
              (section) => `${section.title}: ${section.message}`,
            ),
            `Confidence: ${structuredContent.confidence.score}/100 (${structuredContent.confidence.level})`,
          ].join("\n");
        return rpcResult(request.id, {
          content: [{ type: "text", text: textSummary }],
          structuredContent,
          isError: false,
        });
      } catch {
        return rpcError(request.id, -32602, "Invalid consultation date");
      }
    }
    if (
      name === "generate_full_life_report" ||
      name === "get_full_reading_context"
    ) {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        parsed = birthInputSchema.safeParse({
          ...args,
          methodology: "parashari",
          focus: args?.focus || "general",
          birthTimeAccuracyMinutes: args?.birthTimeAccuracyMinutes ?? 5,
        }),
        asOf =
          typeof args?.asOfDate === "string"
            ? args.asOfDate
            : new Date().toISOString();
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      try {
        const structuredContent = buildFullLifeReport(
          calculateChart(parsed.data),
          asOf,
          Number(args?.horizonYears || 5),
        );
        return rpcResult(request.id, {
          content: [{ type: "text", text: JSON.stringify(structuredContent) }],
          structuredContent,
          isError: false,
        });
      } catch {
        return rpcError(request.id, -32602, "Invalid asOfDate or horizonYears");
      }
    }
    if (name === "get_full_life_report_section") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        parsed = birthInputSchema.safeParse({
          ...args,
          methodology: "parashari",
          focus: "general",
          birthTimeAccuracyMinutes: args?.birthTimeAccuracyMinutes ?? 5,
        }),
        asOf =
          typeof args?.asOfDate === "string"
            ? args.asOfDate
            : new Date().toISOString(),
        section = String(args?.section || "");
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      try {
        const report = buildFullLifeReport(
            calculateChart(parsed.data),
            asOf,
            Number(args?.horizonYears || 5),
          ),
          sections: Record<string, unknown> = {
            summary: {
              subject: report.subject,
              methodology: report.methodology,
              anchors: report.anchors,
            },
            "life-areas": report.plainLanguageReading,
            placements: report.placements,
            strengths: report.measuredStrengths,
            vargas: report.divisionalAnalysis,
            aspects: report.aspects,
            ashtakavarga: report.ashtakavarga,
            synthesis: report.synthesis,
            timing: {
              current: report.currentTiming,
              future: report.futureTiming,
            },
            uncertainty: report.uncertainty,
            evidence: report.evidence,
            citations: report.sourceCoverage,
          };
        if (!(section in sections))
          return rpcError(request.id, -32602, "Unknown report section");
        const structuredContent = {
          schemaVersion: "sahadeva-full-life-report-section-1",
          section,
          data: sections[section],
          safety: report.safety,
        };
        return rpcResult(request.id, {
          content: [{ type: "text", text: JSON.stringify(structuredContent) }],
          structuredContent,
          isError: false,
        });
      } catch {
        return rpcError(request.id, -32602, "Invalid report request");
      }
    }
    if (name === "calculate_south_indian_chart") {
      const parsed = birthInputSchema.safeParse(request.params?.arguments);
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const chart = enrichedChart(await calculateChartCached(env, parsed.data));
      const structuredContent =
        parsed.data.language === "te"
          ? { ...chart, localized: teluguChartSummary(chart) }
          : chart;
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_gochara") {
      const args = request.params?.arguments as
        Record<string, unknown> | undefined;
      const natalLagnaSign = Number(args?.natalLagnaSign);
      const parsed = birthInputSchema.safeParse({
        ...args,
        name: "Gochara",
        methodology: "parashari",
        focus: "general",
        birthTimeAccuracyMinutes: 0,
      });
      if (
        !parsed.success ||
        !Number.isInteger(natalLagnaSign) ||
        natalLagnaSign < 0 ||
        natalLagnaSign > 11
      )
        return rpcError(
          request.id,
          -32602,
          "Invalid transit details",
          parsed.success ? undefined : parsed.error.flatten(),
        );
      const transit = calculateChart(parsed.data);
      const structuredContent = {
        instantJulianDay: transit.engine.julianDay,
        engine: transit.engine,
        natalLagnaSign,
        placements: transit.placements
          .filter((p) => p.name !== "Lagna")
          .map((p) => ({
            ...p,
            houseFromNatalLagna: ((p.sign - natalLagnaSign + 12) % 12) + 1,
          })),
      };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_gochara_from_known_place") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        place =
          typeof args?.place === "string"
            ? resolveKnownLocation(args.place)
            : { status: "none" as const, matches: [] as [] },
        natalLagnaSign = Number(args?.natalLagnaSign);
      if (place.status !== "resolved") return placeRpcError(request.id, place);
      const parsed = birthInputSchema.safeParse({
        ...args,
        name: "Gochara",
        place: locationLabel(place.location),
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        timezoneOffset: place.location.timezoneOffset,
        timezone: place.location.timezone,
        methodology: "parashari",
        focus: "general",
        birthTimeAccuracyMinutes: 0,
      });
      if (
        !parsed.success ||
        !Number.isInteger(natalLagnaSign) ||
        natalLagnaSign < 0 ||
        natalLagnaSign > 11
      )
        return rpcError(
          request.id,
          -32602,
          "Invalid transit details",
          parsed.success ? undefined : parsed.error.flatten(),
        );
      const transit = calculateChart(parsed.data),
        structuredContent = {
          instantJulianDay: transit.engine.julianDay,
          engine: transit.engine,
          resolvedPlace: {
            label: locationLabel(place.location),
            latitude: place.location.latitude,
            longitude: place.location.longitude,
            timezone: place.location.timezone,
          },
          natalLagnaSign,
          placements: transit.placements
            .filter((p) => p.name !== "Lagna")
            .map((p) => ({
              ...p,
              houseFromNatalLagna: ((p.sign - natalLagnaSign + 12) % 12) + 1,
            })),
        };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "calculate_ingress_timeline") {
      const args = request.params?.arguments as
        Record<string, unknown> | undefined;
      const days = Math.min(366, Math.max(1, Number(args?.days || 30)));
      const parsed = birthInputSchema.safeParse({
        ...args,
        name: "Ingress timeline",
        methodology: "parashari",
        focus: "general",
        birthTimeAccuracyMinutes: 0,
      });
      if (!parsed.success || !Number.isInteger(days))
        return rpcError(
          request.id,
          -32602,
          "Invalid ingress request",
          parsed.success ? undefined : parsed.error.flatten(),
        );
      const structuredContent = calculateIngressTimeline(parsed.data, days);
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "simulate_birth_time_uncertainty") {
      const args = request.params?.arguments as
        Record<string, unknown> | undefined;
      const parsed = birthInputSchema.safeParse({
        ...args,
        methodology: "parashari",
        focus: "general",
      });
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const structuredContent = simulateBirthTimeUncertainty(parsed.data);
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "list_rule_review_queue") {
      const args = request.params?.arguments as
          { module?: unknown; limit?: unknown } | undefined,
        module = typeof args?.module === "string" ? args.module : null,
        limit = Math.min(100, Math.max(1, Number(args?.limit || 50)));
      if (!env?.DB)
        return rpcError(request.id, -32603, "Knowledge database unavailable");
      const query = module
          ? "SELECT * FROM rule_review_queue WHERE module=? ORDER BY publishable ASC,source_key LIMIT ?"
          : "SELECT * FROM rule_review_queue ORDER BY publishable ASC,module,source_key LIMIT ?",
        statement = env.DB.prepare(query),
        result = module
          ? await statement.bind(module, limit).all()
          : await statement.bind(limit).all(),
        items = (result.results || []) as Array<Record<string, unknown>>,
        structuredContent = {
          items,
          summary: {
            returned: items.length,
            publishable: items.filter((item) => Number(item.publishable) === 1)
              .length,
            unlinked: items.filter((item) => item.rule_status === "unlinked")
              .length,
          },
          publicationRule:
            "A citation is publishable only after its passage and rule are approved, two distinct reviewers approve it, no reviewer blocks it, and no open contradiction applies.",
        };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "get_rule_citations") {
      const args = request.params?.arguments as
          { sourceKeys?: unknown } | undefined,
        keys = Array.isArray(args?.sourceKeys)
          ? args.sourceKeys
              .filter((item): item is string => typeof item === "string")
              .slice(0, 50)
          : [];
      if (!keys.length)
        return rpcError(
          request.id,
          -32602,
          "sourceKeys must contain at least one string",
        );
      if (!env?.DB)
        return rpcError(request.id, -32603, "Knowledge database unavailable");
      const placeholders = keys.map(() => "?").join(","),
        result = await env.DB.prepare(
          `SELECT rb.source_key,r.id rule_id,r.tradition,r.interpretation,r.confidence,r.revision rule_revision,p.id passage_id,p.locator,p.original_text,p.transliteration,p.literal_translation,p.interpretive_translation,p.revision passage_revision,s.id source_id,s.title source_title,s.author,s.edition,s.language,s.rights_status FROM rule_bindings rb JOIN publishable_rules r ON r.id=rb.rule_id JOIN passages p ON p.id=r.passage_id AND p.review_status='approved' JOIN sources s ON s.id=p.source_id WHERE rb.source_key IN (${placeholders})`,
        )
          .bind(...keys)
          .all(),
        rows = (result.results || []) as Array<Record<string, unknown>>,
        found = new Set(rows.map((row) => String(row.source_key))),
        citations = rows.map((row) => ({
          ...row,
          original_text:
            typeof row.original_text === "string"
              ? row.original_text.slice(0, 500)
              : row.original_text,
        })),
        structuredContent = {
          citations,
          unresolvedSourceKeys: keys.filter((key) => !found.has(key)),
          publicationRule:
            "Only publishable_rules with approved passages are returned; unresolved keys must not be narrated as sourced classical rules.",
        };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "get_synthesis_validation_status") {
      const counts = env?.DB
        ? await env.DB.prepare(
            "SELECT COUNT(*) total, SUM(CASE WHEN cohort!='known-outcome-regression' AND outcome_blinded=1 AND review_status='reviewed' THEN 1 ELSE 0 END) eligible FROM life_theme_validation_cases",
          )
            .first<{ total: number; eligible: number }>()
            .catch(() => null)
        : null;
      const latest = env?.DB
        ? await env.DB.prepare(
            "SELECT result_json,passed,created_at FROM life_theme_validation_results ORDER BY created_at DESC LIMIT 1",
          )
            .first<{
              result_json: string;
              passed: number;
              created_at: string;
            }>()
            .catch(() => null)
        : null;
      const eligible = Number(counts?.eligible || 0),
        completed =
          Boolean(latest?.passed) &&
          eligible >= LIFE_THEME_VALIDATION_PROTOCOL.minimumCases;
      const structuredContent = {
        protocol: LIFE_THEME_VALIDATION_PROTOCOL,
        currentStatus: completed
          ? "blind-ranking-validation-complete"
          : eligible
            ? "cohort-in-progress"
            : "seed-only",
        blindValidationCompleted: completed,
        calibratedProbabilities: false,
        cohort: {
          totalCases: Number(counts?.total || 0),
          eligibleBlindCases: eligible,
          requiredCases: LIFE_THEME_VALIDATION_PROTOCOL.minimumCases,
        },
        latestRun: latest
          ? { ...JSON.parse(latest.result_json), createdAt: latest.created_at }
          : null,
        knowledgeDependency: {
          required: "Two-reviewer publishable rules",
          current: "awaiting-reviewed-rules",
        },
        notice:
          "The jail case may be retained as one frozen regression case, but it cannot calibrate scores or justify event-specific claims by itself.",
      };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "query_vimshottari_date") {
      const args = request.params?.arguments as
        Record<string, unknown> | undefined;
      const parsed = birthInputSchema.safeParse({
        ...args,
        methodology: "parashari",
        focus: "general",
        birthTimeAccuracyMinutes: 0,
      });
      if (!parsed.success || typeof args?.queryDate !== "string")
        return rpcError(
          request.id,
          -32602,
          "Invalid dasha query",
          parsed.success ? undefined : parsed.error.flatten(),
        );
      try {
        const structuredContent = queryDashaAt(
          calculateChart(parsed.data),
          args.queryDate,
        );
        return rpcResult(request.id, {
          content: [{ type: "text", text: JSON.stringify(structuredContent) }],
          structuredContent,
          isError: false,
        });
      } catch {
        return rpcError(request.id, -32602, "Invalid queryDate");
      }
    }
    if (name === "get_compact_chart_evidence") {
      const args = request.params?.arguments as
        Record<string, unknown> | undefined;
      const parsed = birthInputSchema.safeParse({
        ...args,
        methodology: "parashari",
        birthTimeAccuracyMinutes: 5,
      });
      if (!parsed.success)
        return rpcError(
          request.id,
          -32602,
          "Invalid birth details",
          parsed.error.flatten(),
        );
      const structuredContent = compactChartEvidence(
        calculateChart(parsed.data),
      );
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "get_timing_context") {
      const args = request.params?.arguments as
        Record<string, unknown> | undefined;
      const parsed = birthInputSchema.safeParse({
        ...args,
        methodology: "parashari",
        focus: "general",
        birthTimeAccuracyMinutes: 5,
      });
      const queryDate =
          typeof args?.queryDate === "string" ? args.queryDate : "",
        queryTime =
          typeof args?.queryTime === "string" ? args.queryTime : "12:00";
      if (!parsed.success || !/^\d{4}-\d{2}-\d{2}$/.test(queryDate))
        return rpcError(
          request.id,
          -32602,
          "Invalid timing query",
          parsed.success ? undefined : parsed.error.flatten(),
        );
      const natal = calculateChart(parsed.data),
        transit = calculateChart({
          ...parsed.data,
          name: "Transit",
          date: queryDate,
          time: queryTime,
          birthTimeAccuracyMinutes: 0,
        });
      const natalMoon = natal.placements.find((p) => p.name === "Moon")!,
        natalLagna = natal.placements.find((p) => p.name === "Lagna")!;
      const selected = ["Saturn", "Jupiter", "Rahu", "Ketu"].map((planet) => {
        const p = transit.placements.find((item) => item.name === planet)!;
        return {
          name: planet,
          sign: p.sign,
          retrograde: p.retrograde,
          houseFromMoon: ((p.sign - natalMoon.sign + 12) % 12) + 1,
          houseFromLagna: ((p.sign - natalLagna.sign + 12) % 12) + 1,
        };
      });
      const saturn = selected.find((p) => p.name === "Saturn")!,
        sadeStage =
          saturn.houseFromMoon === 12
            ? "rising"
            : saturn.houseFromMoon === 1
              ? "middle"
              : saturn.houseFromMoon === 2
                ? "setting"
                : null;
      const queryInstant = new Date(
          (transit.engine.julianDay - 2440587.5) * 86400000,
        ).toISOString(),
        dasha = queryDashaAt(natal, queryInstant);
      const structuredContent = {
        schemaVersion: "sahadeva-timing-1",
        queryDate,
        queryInstant,
        dasha,
        transits: selected,
        saturnPeriods: {
          sadeSati: sadeStage !== null,
          stage: sadeStage,
          dhaiya: [4, 8].includes(saturn.houseFromMoon),
        },
        intersection: {
          status: "evidence-only",
          dashaLords: [dasha.mahadasha, dasha.antardasha],
          notice:
            "No outcome is inferred from timing overlap without reviewed interpretive rules.",
        },
      };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "build_slow_transit_calendar") {
      const args = request.params?.arguments as
          Record<string, unknown> | undefined,
        parsed = birthInputSchema.safeParse({
          ...args,
          methodology: "parashari",
          focus: "general",
          birthTimeAccuracyMinutes: 0,
        }),
        start =
          typeof args?.startDate === "string" ? isoToJd(args.startDate) : NaN,
        years = Math.min(40, Math.max(0.1, Number(args?.years || 10)));
      if (!parsed.success || !Number.isFinite(start) || !Number.isFinite(years))
        return rpcError(
          request.id,
          -32602,
          "Invalid transit-calendar request",
          parsed.success ? undefined : parsed.error.flatten(),
        );
      const chart = calculateChart(parsed.data),
        calendar = buildSlowTransitCalendar(
          chart,
          start,
          start + years * 365.2425,
        ),
        structuredContent = {
          ...calendar,
          dashaIntersections: intersectDashaTransits(chart, calendar.periods),
        };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "describe_methodology") {
      const methodology = {
        computation:
          "Deterministic clean-room functions. An LLM never calculates or changes chart facts.",
        currentAccuracy:
          "Research preview with full VSOP87D planets, ELP/MPP02 Moon, Lahiri, Lagna, solar-event reference gates, and research-preview lunar rise/set. Broader certification remains incomplete.",
        supportedMethodology:
          "Parashari chart facts are available as a preview. KP, Western and comparative calculation engines are not yet implemented and are never silently blended.",
        productionGate:
          "High-precision coefficient evaluator plus published astronomical reference vectors and regional practitioner review.",
        interpretation:
          "Traditional claims must carry source, tradition, reviewer and uncertainty metadata.",
      };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(methodology) }],
        structuredContent: methodology,
        isError: false,
      });
    }
    if (name === "search_classics") {
      if (!env?.DB)
        return rpcError(request.id, -32001, "Knowledge database is unavailable");
      const args = request.params?.arguments as
        | { query?: unknown; limit?: unknown }
        | undefined;
      const query = String(args?.query || "").slice(0, 200);
      if (query.trim().length < 3)
        return rpcError(request.id, -32602, "query must be at least 3 characters");
      const limit = Math.min(10, Math.max(1, Number(args?.limit) || 5));
      const rows = await searchKnowledge(env, query, limit);
      const structuredContent = {
        query,
        results: rows.map((row) => ({
          work: row.work,
          author: row.author,
          section: row.section,
          excerpt: row.passage.slice(0, 700),
        })),
        notice:
          "Short reference excerpts from copyrighted works. Paraphrase with attribution; do not republish verbatim.",
      };
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
        isError: false,
      });
    }
    if (name === "knowledge_status") {
      if (!env?.DB)
        return rpcError(
          request.id,
          -32001,
          "Knowledge database is unavailable",
        );
      const status = await knowledgeStatus(env.DB);
      return rpcResult(request.id, {
        content: [{ type: "text", text: JSON.stringify(status) }],
        structuredContent: status,
        isError: false,
      });
    }
    return rpcError(request.id, -32602, `Unknown tool: ${name || "missing"}`);
  }
  return rpcError(request.id, -32601, `Method not found: ${request.method}`);
}

app.get("/api/health", (c) =>
  c.json({ ok: true, engine: c.env.ENGINE_VERSION }),
);

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const origin = new URL(c.req.url).origin;
  return createAuth(c.env, origin).handler(c.req.raw);
});

const meParse = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};
const personId = () =>
  [...crypto.getRandomValues(new Uint8Array(8))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
async function activePersonRow(env: Env, userId: string) {
  const meta = await env.DB.prepare(
    "SELECT active_person_id FROM user_app_data WHERE user_id=?",
  )
    .bind(userId)
    .first<{ active_person_id: string | null }>();
  if (!meta?.active_person_id) return null;
  return env.DB.prepare(
    "SELECT id, profile_json, conversation_json FROM user_people WHERE id=? AND user_id=?",
  )
    .bind(meta.active_person_id, userId)
    .first<{
      id: string;
      profile_json: string;
      conversation_json: string | null;
    }>();
}
async function setActivePerson(env: Env, userId: string, id: string) {
  await env.DB.prepare(
    "INSERT INTO user_app_data (user_id, active_person_id, updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET active_person_id=excluded.active_person_id, updated_at=excluded.updated_at",
  )
    .bind(userId, id, new Date().toISOString())
    .run();
}

app.get("/api/me", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ signedIn: false });
  const active = await activePersonRow(c.env, user.id);
  const people = await c.env.DB.prepare(
    "SELECT id, profile_json FROM user_people WHERE user_id=? ORDER BY created_at",
  )
    .bind(user.id)
    .all<{ id: string; profile_json: string }>();
  return c.json({
    signedIn: true,
    user,
    activePersonId: active?.id ?? null,
    profile: meParse(active?.profile_json),
    conversation: meParse(active?.conversation_json),
    people: (people.results || []).map((row) => ({
      id: row.id,
      profile: meParse(row.profile_json),
    })),
  });
});

app.put("/api/me/profile", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  if (Number(c.req.header("content-length") || 0) > 8_192)
    return c.json({ error: "Request body too large" }, 413);
  const body = await c.req.json<{ profile?: unknown }>().catch(() => null);
  if (!body?.profile) return c.json({ error: "profile is required" }, 400);
  const active = await activePersonRow(c.env, user.id);
  if (active) {
    await c.env.DB.prepare("UPDATE user_people SET profile_json=? WHERE id=?")
      .bind(JSON.stringify(body.profile), active.id)
      .run();
    return c.json({ ok: true, personId: active.id });
  }
  const id = personId();
  await c.env.DB.prepare(
    "INSERT INTO user_people (id, user_id, profile_json, created_at) VALUES (?,?,?,?)",
  )
    .bind(id, user.id, JSON.stringify(body.profile), new Date().toISOString())
    .run();
  await setActivePerson(c.env, user.id, id);
  return c.json({ ok: true, personId: id });
});

app.put("/api/me/conversation", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  if (Number(c.req.header("content-length") || 0) > 262_144)
    return c.json({ error: "Request body too large" }, 413);
  const body = await c.req
    .json<{ messages?: Array<{ role?: string; content?: string }> }>()
    .catch(() => null);
  if (
    !Array.isArray(body?.messages) &&
    !Array.isArray((body as { threads?: unknown[] } | null)?.threads)
  )
    return c.json({ error: "messages or threads array is required" }, 400);
  const active = await activePersonRow(c.env, user.id);
  if (!active) return c.json({ error: "No active person" }, 409);
  const cleanMessages = (
    input: Array<{ role?: string; content?: string }> | undefined,
  ) =>
    (Array.isArray(input) ? input : [])
      .filter(
        (item) =>
          (item?.role === "user" || item?.role === "assistant") &&
          typeof item?.content === "string",
      )
      .slice(-80)
      .map((item) => ({
        role: item.role,
        content: item.content!.slice(0, 8000),
        sources: Array.isArray((item as { sources?: unknown }).sources)
          ? ((item as { sources: Array<Record<string, unknown>> }).sources || [])
              .slice(0, 3)
              .map((source) => ({
                work: String(source.work || "").slice(0, 80),
                section: String(source.section || "").slice(0, 120),
                snippet: String(source.snippet || "").slice(0, 400),
              }))
          : undefined,
      }));
  // New thread-aware shape: { threads: [...], activeThreadId } — falls back
  // to a plain message array for older clients.
  const rawBody = body as unknown as {
    messages?: Array<{ role?: string; content?: string }>;
    threads?: Array<{
      id?: string;
      title?: string;
      updatedAt?: string;
      messages?: Array<{ role?: string; content?: string }>;
    }>;
    activeThreadId?: string;
  };
  const payload = Array.isArray(rawBody.threads)
    ? {
        threads: rawBody.threads.slice(0, 20).map((thread) => ({
          id: String(thread.id || "").slice(0, 32) || crypto.randomUUID().slice(0, 8),
          title: String(thread.title || "").slice(0, 80),
          updatedAt: String(thread.updatedAt || "").slice(0, 40),
          messages: cleanMessages(thread.messages),
        })),
        activeThreadId: String(rawBody.activeThreadId || "").slice(0, 32),
      }
    : cleanMessages(rawBody.messages);
  await c.env.DB.prepare(
    "UPDATE user_people SET conversation_json=? WHERE id=?",
  )
    .bind(JSON.stringify(payload), active.id)
    .run();
  return c.json({ ok: true });
});

app.post("/api/me/people", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  if (Number(c.req.header("content-length") || 0) > 8_192)
    return c.json({ error: "Request body too large" }, 413);
  const body = await c.req.json<{ profile?: unknown }>().catch(() => null);
  if (!body?.profile) return c.json({ error: "profile is required" }, 400);
  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM user_people WHERE user_id=?",
  )
    .bind(user.id)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= 12)
    return c.json({ error: "Person limit reached (12)" }, 409);
  const id = personId();
  await c.env.DB.prepare(
    "INSERT INTO user_people (id, user_id, profile_json, created_at) VALUES (?,?,?,?)",
  )
    .bind(id, user.id, JSON.stringify(body.profile), new Date().toISOString())
    .run();
  await setActivePerson(c.env, user.id, id);
  return c.json({ ok: true, personId: id });
});

app.post("/api/me/people/:id/activate", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  const row = await c.env.DB.prepare(
    "SELECT id, profile_json, conversation_json FROM user_people WHERE id=? AND user_id=?",
  )
    .bind(c.req.param("id"), user.id)
    .first<{
      id: string;
      profile_json: string;
      conversation_json: string | null;
    }>();
  if (!row) return c.json({ error: "Person not found" }, 404);
  await setActivePerson(c.env, user.id, row.id);
  return c.json({
    ok: true,
    profile: meParse(row.profile_json),
    conversation: meParse(row.conversation_json),
  });
});

app.delete("/api/me/people/:id", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  await c.env.DB.prepare("DELETE FROM user_people WHERE id=? AND user_id=?")
    .bind(c.req.param("id"), user.id)
    .run();
  const meta = await c.env.DB.prepare(
    "SELECT active_person_id FROM user_app_data WHERE user_id=?",
  )
    .bind(user.id)
    .first<{ active_person_id: string | null }>();
  if (meta?.active_person_id === c.req.param("id")) {
    const next = await c.env.DB.prepare(
      "SELECT id FROM user_people WHERE user_id=? ORDER BY created_at LIMIT 1",
    )
      .bind(user.id)
      .first<{ id: string }>();
    await c.env.DB.prepare(
      "UPDATE user_app_data SET active_person_id=? WHERE user_id=?",
    )
      .bind(next?.id ?? null, user.id)
      .run();
  }
  return c.json({ ok: true });
});

app.delete("/api/me/data", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  await c.env.DB.prepare("DELETE FROM user_people WHERE user_id=?")
    .bind(user.id)
    .run();
  await c.env.DB.prepare("DELETE FROM user_app_data WHERE user_id=?")
    .bind(user.id)
    .run();
  return c.json({ ok: true });
});
app.post("/api/me/share", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  const body = await c.req
    .json<{ includeName?: boolean; expiresDays?: number }>()
    .catch(() => ({}) as { includeName?: boolean; expiresDays?: number });
  const active = await activePersonRow(c.env, user.id);
  const profile = meParse(active?.profile_json) as Record<string, unknown> | null;
  if (!profile?.date) return c.json({ error: "No active chart to share" }, 409);
  const token = [...crypto.getRandomValues(new Uint8Array(18))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const days = Math.min(90, Math.max(1, Number(body.expiresDays) || 30));
  await c.env.DB.prepare(
    "INSERT INTO user_shares (id, token_hash, user_id, profile_json, include_name, expires_at, created_at) VALUES (?,?,?,?,?,?,?)",
  )
    .bind(
      personId(),
      await sha256(token),
      user.id,
      JSON.stringify(
        body.includeName === false ? { ...profile, name: "Shared chart" } : profile,
      ),
      body.includeName === false ? 0 : 1,
      new Date(Date.now() + days * 86400000).toISOString(),
      new Date().toISOString(),
    )
    .run();
  return c.json({ ok: true, token, expiresDays: days });
});

app.get("/api/share/:token", async (c) => {
  const hash = await sha256(c.req.param("token"));
  const row = await c.env.DB.prepare(
    "SELECT profile_json FROM user_shares WHERE token_hash=? AND expires_at > ?",
  )
    .bind(hash, new Date().toISOString())
    .first<{ profile_json: string }>();
  if (!row) return c.json({ error: "Share not found or expired" }, 404);
  const profile = meParse(row.profile_json) as Record<string, unknown> | null;
  const parsed = birthInputSchema.safeParse({
    ...profile,
    methodology: "parashari",
  });
  if (!parsed.success) return c.json({ error: "Share data invalid" }, 500);
  return c.json({
    profile: {
      name: parsed.data.name,
      date: parsed.data.date,
      time: parsed.data.time,
      place: parsed.data.place,
      language: parsed.data.language,
    },
    chart: await calculateChartCached(c.env, parsed.data),
  });
});

app.post("/api/push/subscribe", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  const body = await c.req
    .json<{
      subscription?: {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      hour?: number;
      tzOffset?: number;
    }>()
    .catch(() => null);
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys.auth)
    return c.json({ error: "A push subscription is required" }, 400);
  await c.env.DB.prepare(
    "INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, hour, tz_offset, created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth, hour=excluded.hour, tz_offset=excluded.tz_offset",
  )
    .bind(
      personId(),
      user.id,
      sub.endpoint.slice(0, 800),
      sub.keys.p256dh.slice(0, 200),
      sub.keys.auth.slice(0, 100),
      Math.min(23, Math.max(0, Math.round(Number(body?.hour ?? 7)))),
      Math.min(14, Math.max(-14, Number(body?.tzOffset ?? 5.5))),
      new Date().toISOString(),
    )
    .run();
  return c.json({ ok: true });
});

app.delete("/api/push/subscribe", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  const body = await c.req
    .json<{ endpoint?: string }>()
    .catch(() => ({}) as { endpoint?: string });
  if (body.endpoint)
    await c.env.DB.prepare(
      "DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?",
    )
      .bind(body.endpoint, user.id)
      .run();
  else
    await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE user_id=?")
      .bind(user.id)
      .run();
  return c.json({ ok: true });
});

app.get("/api/push/key", (c) =>
  c.json({ publicKey: c.env.VAPID_PUBLIC_KEY || null }),
);

app.get("/api/push/brief", async (c) => {
  const user = await sessionUser(c.env, c.req.raw);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  const active = await activePersonRow(c.env, user.id);
  const profile = meParse(active?.profile_json) as Record<string, unknown> | null;
  const parsed = birthInputSchema.safeParse({
    ...profile,
    methodology: "parashari",
  });
  if (!parsed.success) return c.json({ error: "No chart" }, 409);
  try {
    const natal = await calculateChartCached(c.env, parsed.data);
    const dayIso = (offset: number) =>
      new Date(
        Date.now() + (parsed.data.timezoneOffset * 3600 + offset * 86400) * 1000,
      )
        .toISOString()
        .slice(0, 10);
    const base = { ...parsed.data, name: "Today", time: "12:00", birthTimeAccuracyMinutes: 0 };
    const daily = buildDailyPanchanga(
      calculateChart({ ...base, date: dayIso(0) }),
      calculateChart({ ...base, date: dayIso(1) }),
      natal,
    ) as {
      fiveLimbs?: { vara: string; tithi: string; nakshatra: string };
      personalized?: {
        taraBala?: { favorable: boolean };
        chandraBala?: { favorable: boolean };
      } | null;
      inauspicious?: { rahuKaal?: { startIso: string; endIso: string } | null };
    };
    const te = parsed.data.language === "te";
    const clock = (iso?: string) =>
      iso
        ? new Date(iso).toLocaleTimeString(te ? "te-IN" : "en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: parsed.data.timezone || "UTC",
          })
        : "";
    const tara = daily.personalized?.taraBala?.favorable;
    const chandra = daily.personalized?.chandraBala?.favorable;
    const title = te
      ? `నమస్తే ${parsed.data.name} — నేటి పంచాంగం`
      : `Namaste ${parsed.data.name} — today's panchanga`;
    const bodyText = te
      ? `${daily.fiveLimbs?.vara}, ${daily.fiveLimbs?.tithi}, ${daily.fiveLimbs?.nakshatra}. తారా బలం: ${tara ? "అనుకూలం" : "జాగ్రత్త"}, చంద్ర బలం: ${chandra ? "అనుకూలం" : "జాగ్రత్త"}. రాహుకాలం ${clock(daily.inauspicious?.rahuKaal?.startIso)}–${clock(daily.inauspicious?.rahuKaal?.endIso)}.`
      : `${daily.fiveLimbs?.vara}, ${daily.fiveLimbs?.tithi}, ${daily.fiveLimbs?.nakshatra}. Tara bala: ${tara ? "favorable" : "take care"}, chandra bala: ${chandra ? "favorable" : "take care"}. Rahu kaal ${clock(daily.inauspicious?.rahuKaal?.startIso)}–${clock(daily.inauspicious?.rahuKaal?.endIso)}.`;
    return c.json({ title, body: bodyText });
  } catch {
    return c.json({ error: "Brief unavailable" }, 500);
  }
});

const KNOWLEDGE_STOPWORDS = new Set(
  "the a an and or of in on for to is are will i my me what when how does do about tell with this that its from can should would you your please".split(" "),
);
const TE_TERM_MAP: Array<[RegExp, string]> = [
  [/వివాహ|పెళ్లి/g, " marriage "],
  [/ఉద్యోగ|వృత్తి/g, " career profession "],
  [/ధనం|డబ్బు|సంపద/g, " wealth money "],
  [/ఆరోగ్య/g, " health disease "],
  [/సంతాన|పిల్లల/g, " children progeny "],
  [/విద్య|చదువు/g, " education learning "],
  [/ప్రయాణ|విదేశ/g, " travel foreign "],
  [/శని/g, " saturn "],
  [/గురు|బృహస్పతి/g, " jupiter "],
  [/శుక్ర/g, " venus "],
  [/బుధ/g, " mercury "],
  [/కుజ|మంగళ/g, " mars "],
  [/చంద్ర/g, " moon "],
  [/సూర్య|రవి/g, " sun "],
  [/రాహు/g, " rahu "],
  [/కేతు/g, " ketu "],
  [/దోష/g, " dosha "],
  [/పరిహార|శాంతి/g, " remedy remedies "],
  [/దశ/g, " dasha "],
  [/యోగ/g, " yoga "],
];
async function embedTexts(env: Env, texts: string[]) {
  const result = (await env.AI.run("@cf/baai/bge-m3" as Parameters<Ai["run"]>[0], {
    text: texts,
  } as never)) as { data?: number[][] };
  return result.data ?? [];
}

async function searchKnowledge(env: Env, query: string, limit: number) {
  let expanded = query;
  for (const [pattern, replacement] of TE_TERM_MAP)
    expanded = expanded.replace(pattern, replacement);
  // Semantic pass first: meaning-based retrieval over the corpus.
  if (env.VECTORIZE) {
    try {
      const [vector] = await embedTexts(env, [expanded.slice(0, 1500)]);
      if (vector) {
        const matches = await env.VECTORIZE.query(vector, {
          topK: limit,
          returnMetadata: "all",
        });
        const ids = matches.matches
          .filter((m) => m.score > 0.35)
          .map((m) => Number(m.id))
          .filter(Number.isFinite);
        if (ids.length) {
          const rows = await env.DB.prepare(
            `SELECT rowid, work, author, section, substr(body, 1, 900) AS passage, substr(body, 1, 320) AS excerpt FROM knowledge_fts WHERE rowid IN (${ids.map(() => "?").join(",")})`,
          )
            .bind(...ids)
            .all<{
              rowid: number;
              work: string;
              author: string;
              section: string;
              passage: string;
              excerpt: string;
            }>();
          const byId = new Map(
            (rows.results || []).map((row) => [row.rowid, row]),
          );
          const ordered = ids
            .map((id) => byId.get(id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row));
          if (ordered.length) return ordered;
        }
      }
    } catch {
      /* fall through to keyword search */
    }
  }
  const terms = [
    ...new Set(
      expanded
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !KNOWLEDGE_STOPWORDS.has(word)),
    ),
  ].slice(0, 12);
  if (!terms.length) return [];
  const match = terms.map((term) => `"${term}"`).join(" OR ");
  try {
    const rows = await env.DB.prepare(
      "SELECT work, author, section, snippet(knowledge_fts, 3, '', '', '…', 48) AS excerpt, substr(body, 1, 900) AS passage FROM knowledge_fts WHERE knowledge_fts MATCH ? ORDER BY rank LIMIT ?",
    )
      .bind(match, limit)
      .all<{
        work: string;
        author: string;
        section: string;
        excerpt: string;
        passage: string;
      }>();
    return rows.results || [];
  } catch {
    return [];
  }
}

app.get("/api/knowledge/search", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const query = (c.req.query("q") || "").slice(0, 200);
  if (query.trim().length < 3)
    return c.json({ error: "A query of at least 3 characters is required" }, 400);
  const results = await searchKnowledge(c.env, query, 8);
  return c.json({
    query,
    results: results.map((row) => ({
      work: row.work,
      author: row.author,
      section: row.section,
      snippet: row.excerpt.slice(0, 320),
    })),
    notice:
      "Short reference excerpts from copyrighted works, for grounding only.",
  });
});

app.post("/api/admin/reindex-knowledge", async (c) => {
  if (
    !c.env.BETTER_AUTH_SECRET ||
    c.req.header("x-admin-secret") !== c.env.BETTER_AUTH_SECRET
  )
    return c.json({ error: "Forbidden" }, 403);
  if (!c.env.VECTORIZE) return c.json({ error: "Vectorize not bound" }, 500);
  const offset = Math.max(0, Number(c.req.query("offset") || 0));
  const limit = Math.min(300, Math.max(1, Number(c.req.query("limit") || 200)));
  const rows = await c.env.DB.prepare(
    "SELECT rowid, work, section, substr(body, 1, 2500) AS body FROM knowledge_fts ORDER BY rowid LIMIT ? OFFSET ?",
  )
    .bind(limit, offset)
    .all<{ rowid: number; work: string; section: string; body: string }>();
  const chunks = rows.results || [];
  let upserted = 0;
  for (let i = 0; i < chunks.length; i += 25) {
    const batch = chunks.slice(i, i + 25);
    const vectors = await embedTexts(
      c.env,
      batch.map((row) => `${row.work} — ${row.section}\n${row.body}`),
    );
    await c.env.VECTORIZE.upsert(
      batch.map((row, index) => ({
        id: String(row.rowid),
        values: vectors[index],
        metadata: { work: row.work, section: row.section },
      })),
    );
    upserted += batch.length;
  }
  return c.json({ ok: true, offset, upserted, done: chunks.length < limit });
});

app.get("/api/panchanga/today", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const latitude = Number(c.req.query("lat")),
    longitude = Number(c.req.query("lon")),
    timezoneOffset = Number(c.req.query("tzOffset")),
    timezone = c.req.query("tz") || undefined,
    language = c.req.query("lang") === "te" ? ("te" as const) : ("en" as const);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(timezoneOffset)
  )
    return c.json({ error: "lat, lon and tzOffset are required" }, 400);
  const dayIso = (offsetDays: number) =>
    new Date(Date.now() + (timezoneOffset * 3600 + offsetDays * 86400) * 1000)
      .toISOString()
      .slice(0, 10);
  const base = {
    name: "Today",
    time: "12:00",
    latitude,
    longitude,
    timezoneOffset,
    timezone,
    place: "Current location",
    language,
    methodology: "parashari" as const,
    focus: "general" as const,
    birthTimeAccuracyMinutes: 0,
  };
  const parsedToday = birthInputSchema.safeParse({ ...base, date: dayIso(0) }),
    parsedNext = birthInputSchema.safeParse({ ...base, date: dayIso(1) });
  if (!parsedToday.success || !parsedNext.success)
    return c.json({ error: "Invalid location details" }, 400);
  try {
    const result = buildDailyPanchanga(
      calculateChart(parsedToday.data),
      calculateChart(parsedNext.data),
    );
    return c.json(result, 200, { "cache-control": "public, max-age=600" });
  } catch {
    return c.json({ error: "Panchanga could not be calculated" }, 500);
  }
});

app.get("/api/privacy", (c) =>
  c.json({
    birthDataPersistence: "deidentified-deterministic-cache-only",
    deletionRequired:
      "event confirmations are owner-scoped and must support account-key deletion",
    statement:
      "Chart requests may populate a SHA-256-keyed deterministic cache whose stored chart removes name and place. Explicitly consented event confirmations store only the chart hash, selected window, outcome label, and owner key. Application logs never intentionally include request bodies.",
  }),
);
app.post("/api/locations/resolve", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const body = await c.req
    .json<{ place?: string; date?: string; time?: string }>()
    .catch(() => null);
  const query = body?.place?.trim() || "";
  if (query.length < 2)
    return c.json({ error: "A place name is required" }, 400);
  const catalogue = resolveKnownLocation(query);
  if (catalogue.status === "ambiguous")
    return c.json(
      {
        error: "Place is ambiguous",
        candidates: catalogue.matches.map((place) => ({
          label: locationLabel(place),
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: place.timezone,
          timezoneOffset: place.timezoneOffset,
          source: "catalogue",
          confidence: 1,
        })),
      },
      409,
    );
  const location =
    catalogue.status === "resolved"
      ? {
          label: locationLabel(catalogue.location),
          latitude: catalogue.location.latitude,
          longitude: catalogue.location.longitude,
          timezone: catalogue.location.timezone,
          timezoneOffset: catalogue.location.timezoneOffset,
          source: "catalogue" as const,
          confidence: 1,
        }
      : (await resolveLocationWithGeoapify(
          c.env,
          query,
          body?.date || new Date().toISOString().slice(0, 10),
          body?.time || "12:00",
        )) ||
        (await resolveLocationWithAi(
          c.env,
          query,
          body?.date || new Date().toISOString().slice(0, 10),
          body?.time || "12:00",
        ));
  if (!location)
    return c.json(
      {
        error:
          "The place could not be resolved confidently. Add district, state, or country.",
      },
      404,
    );
  return c.json({
    place: location.label,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    timezoneOffset: location.timezoneOffset,
    source: location.source,
    confidence: location.confidence ?? 1,
    model: location.model || null,
    attribution: location.source === "geoapify" ? "Powered by Geoapify" : null,
  });
});
app.post("/api/render-chart", async (c) => {
  const identity = await authenticate(c, "mcp:calculate");
  if (identity instanceof Response) return identity;
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const located = parseLocatedBirth(body),
    parsed = located.parsed;
  if (!parsed?.success)
    return c.json(
      {
        error: "Invalid birth or location details",
        details:
          parsed && !parsed.success
            ? parsed.error.flatten()
            : located.resolved.error || located.resolved.resolution?.status,
      },
      400,
    );
  const chart = await calculateChartCached(c.env, parsed.data),
    size = Math.min(2400, Math.max(480, Number(body.size || 1200))),
    svg = southIndianChartSvg(chart, size),
    format = String(body.format || "svg").toLowerCase();
  if (format === "svg")
    return c.body(svg, 200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `inline; filename="sahadeva-south-chart.svg"`,
    });
  if (format === "png") {
    const { rasterizeSvg } = await import("./rasterize");
    const png = await rasterizeSvg(svg, size);
    return c.body(png.slice().buffer as ArrayBuffer, 200, {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="sahadeva-south-chart.png"`,
    });
  }
  return c.json({ error: "format must be svg or png" }, 400);
});
app.post("/api/reports", async (c) => {
  const identity = await authenticate(c, "mcp:calculate");
  if (identity instanceof Response) return identity;
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const located = parseLocatedBirth(body),
    parsed = located.parsed;
  if (!parsed?.success)
    return c.json(
      {
        error: "Invalid birth or location details",
        details:
          parsed && !parsed.success
            ? parsed.error.flatten()
            : located.resolved.error || located.resolved.resolution?.status,
      },
      400,
    );
  const chart = await calculateChartCached(c.env, parsed.data),
    report = buildFullLifeReport(
      chart,
      typeof body.asOfDate === "string"
        ? body.asOfDate
        : new Date().toISOString(),
      Number(body.horizonYears || 5),
    ),
    pdf = await buildServerReportPdf(
      chart,
      report as unknown as Record<string, any>,
    ),
    id = crypto.randomUUID(),
    expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  await c.env.DB.prepare(
    "DELETE FROM report_artifacts WHERE expires_at<=CURRENT_TIMESTAMP",
  ).run();
  await c.env.DB.prepare(
    "INSERT INTO report_artifacts(id,content_type,body,expires_at) VALUES(?,?,?,?)",
  )
    .bind(id, "application/pdf", pdf, expiresAt)
    .run();
  const url = new URL(`/api/reports/${id}`, c.req.url).toString();
  return c.json(
    {
      id,
      url,
      expiresAt,
      contentType: "application/pdf",
      bytes: pdf.byteLength,
    },
    201,
  );
});
app.get("/api/reports/:id", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT content_type,body,expires_at FROM report_artifacts WHERE id=? AND expires_at>CURRENT_TIMESTAMP",
  )
    .bind(c.req.param("id"))
    .first<{ content_type: string; body: ArrayBuffer; expires_at: string }>();
  if (!row) return c.json({ error: "Report not found or expired" }, 404);
  return c.body(row.body, 200, {
    "Content-Type": row.content_type,
    "Content-Disposition": 'inline; filename="sahadeva-report.pdf"',
    "Cache-Control": "private, max-age=3600",
  });
});
app.post("/api/event-confirmations", async (c) => {
  const identity = await authenticate(c, "feedback:write");
  if (identity instanceof Response) return identity;
  const limited = await enforceKeyLimit(c, identity, "calc");
  if (limited) return limited;
  const body = await c.req
    .json<{
      chart?: unknown;
      window?: unknown;
      happened?: unknown;
      consent?: unknown;
    }>()
    .catch(() => null);
  if (
    !body ||
    !body.chart ||
    !body.window ||
    typeof body.happened !== "boolean" ||
    body.consent !== true
  )
    return c.json(
      {
        error: "chart, window, boolean happened, and consent=true are required",
      },
      400,
    );
  const chartHash = await sha256(stableJson(body.chart)),
    id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO event_confirmations(id,owner_key_id,chart_hash,window_json,happened,consent_version) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      id,
      identity.id,
      chartHash,
      JSON.stringify(body.window),
      body.happened ? 1 : 0,
      "event-confirmation-v1",
    )
    .run();
  return c.json(
    {
      id,
      chartHash,
      happened: body.happened,
      stored: true,
      calibrationEligibility: "pending-cohort-review",
      personalizationEligibility: "owner-only",
    },
    201,
  );
});
app.get("/api/validation", (c) =>
  c.json({
    engine: c.env.ENGINE_VERSION,
    productionCertified: false,
    passed: [
      "Full VSOP87D apparent geocentric planets: existing NASA/JPL Horizons regression vectors",
      "ELP/MPP02 Moon: six DE441 epochs across 1800-2050; all 27 Nakshatras and 108 Pada boundaries; maximum 0.050 arcsec angular and 0.128 km position error",
      "117 DE441 Panchanga fixtures: all 30 Tithi, 60 Karana, and 27 Yoga transitions; reference interpolation residual below 0.5 arcsec",
      "Lahiri IAE 1985 corrected 23°15′00.658″ anchor, Lieske IAU 1976 precession, IAU 1980 nutation, and six 1800-2050 references within one arcsecond",
      "Four independent Meeus/IAU-1982 Lagna vectors within one arcsecond",
      "Three independent Meeus apparent-Sun rise/set vectors within three minutes",
      "UT-to-dynamical-time conversion and Vimshottari balance regression",
      "Ashtakavarga invariant totals and Pinda identities",
      "varga structural tests",
      "dasha nesting invariants",
      "special-Lagna structural tests",
    ],
    pending: [
      "complete Shadbala/Bhava Bala reference charts",
      "regional practitioner review",
    ],
  }),
);

async function knowledgeStatus(db: D1Database) {
  const row = await db
    .prepare(
      "SELECT (SELECT COUNT(*) FROM sources) sources, (SELECT COUNT(*) FROM knowledge_source_assets) catalogued_assets, (SELECT COUNT(*) FROM knowledge_source_assets WHERE quality_status = 'usable') usable_assets, (SELECT COUNT(*) FROM knowledge_source_assets WHERE quality_status = 'repair') assets_needing_repair, (SELECT COUNT(*) FROM knowledge_source_assets WHERE quality_status = 'retranscribe') assets_needing_retranscription, (SELECT COUNT(*) FROM knowledge_source_assets WHERE sensitivity = 'restricted') restricted_assets, (SELECT COUNT(*) FROM passages) passages, (SELECT COUNT(*) FROM rules WHERE review_status = 'approved') nominally_approved_rules, (SELECT COUNT(*) FROM publishable_rules) publishable_rules, (SELECT COUNT(*) FROM reviewers WHERE active = 1) active_reviewers, (SELECT COUNT(*) FROM terminology WHERE review_status = 'approved') approved_terms, (SELECT COUNT(*) FROM terminology WHERE review_status = 'translation_review') terms_awaiting_review, (SELECT COUNT(*) FROM contradictions WHERE resolution_status = 'open') open_contradictions",
    )
    .first()
    .catch(() => null);
  return {
    ...row,
    readiness:
      Number(row?.publishable_rules || 0) > 0 &&
      Number(row?.active_reviewers || 0) >= 2 &&
      Number(row?.open_contradictions || 0) === 0
        ? "reviewed"
        : "not_reviewed",
    corpusStatus:
      Number(row?.catalogued_assets || 0) > 0
        ? "catalogued_not_approved"
        : "not_catalogued",
    publicationRule:
      "Catalogued and usable do not mean approved. A rule requires two distinct approvals and no reject/request-changes decision.",
  };
}

app.get("/api/knowledge/status", async (c) =>
  c.json(await knowledgeStatus(c.env.DB)),
);

app.post("/api/keys", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const body = await c.req
    .json<{ label?: string }>()
    .catch(() => ({}) as { label?: string });
  const secret = `sah_${randomToken(32)}`,
    id = crypto.randomUUID(),
    prefix = secret.slice(0, 12),
    label = (body.label || "Sahadeva key").trim().slice(0, 60);
  const scopes = [
    "charts:read",
    "charts:write",
    "shares:write",
    "usage:read",
    "mcp:calculate",
    "ai:narrate",
  ];
  await c.env.DB.prepare(
    "INSERT INTO api_keys(id,key_hash,key_prefix,label,scopes_json,vault_id) VALUES(?,?,?,?,?,?)",
  )
    .bind(id, await sha256(secret), prefix, label, JSON.stringify(scopes), id)
    .run();
  return c.json(
    {
      apiKey: secret,
      prefix,
      scopes,
      notice: "Shown once. Store it securely; Sahadeva stores only its hash.",
    },
    201,
  );
});
app.delete("/api/keys/current", async (c) => {
  const identity = await authenticate(c);
  if (identity instanceof Response) return identity;
  await c.env.DB.prepare(
    "UPDATE api_keys SET revoked_at=CURRENT_TIMESTAMP WHERE id=?",
  )
    .bind(identity.id)
    .run();
  return c.json({ revoked: true });
});
app.get("/api/keys", async (c) => {
  const identity = await authenticate(c);
  if (identity instanceof Response) return identity;
  const rows = await c.env.DB.prepare(
    "SELECT id,key_prefix,label,scopes_json,calc_limit_per_minute,ai_limit_per_minute,created_at,last_used_at,revoked_at FROM api_keys WHERE COALESCE(vault_id,id)=? ORDER BY created_at",
  )
    .bind(identity.vaultId)
    .all();
  return c.json({ keys: rows.results, currentKeyId: identity.id });
});
app.post("/api/keys/named", async (c) => {
  const identity = await authenticate(c);
  if (identity instanceof Response) return identity;
  const body: {
      label?: string;
      scopes?: string[];
      calcLimitPerMinute?: number;
      aiLimitPerMinute?: number;
    } = await c.req.json().catch(() => ({})),
    allowed = new Set([
      "charts:read",
      "charts:write",
      "shares:write",
      "usage:read",
      "mcp:calculate",
      "ai:narrate",
      "feedback:write",
    ]),
    scopes = (body.scopes || [...allowed]).filter((scope: string) =>
      allowed.has(scope),
    ),
    calcLimit = Math.floor(Number(body.calcLimitPerMinute ?? 60)),
    aiLimit = Math.floor(Number(body.aiLimitPerMinute ?? 10));
  if (!scopes.length)
    return c.json({ error: "At least one valid scope is required" }, 400);
  if (calcLimit < 1 || calcLimit > 600 || aiLimit < 1 || aiLimit > 100)
    return c.json(
      {
        error:
          "Rate policy must be calc 1-600 and AI 1-100 requests per minute",
      },
      400,
    );
  const secret = `sah_${randomToken(32)}`,
    id = crypto.randomUUID(),
    prefix = secret.slice(0, 12),
    label = (body.label || "Named key").trim().slice(0, 60) || "Named key";
  await c.env.DB.prepare(
    "INSERT INTO api_keys(id,key_hash,key_prefix,label,scopes_json,vault_id,calc_limit_per_minute,ai_limit_per_minute) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      await sha256(secret),
      prefix,
      label,
      JSON.stringify(scopes),
      identity.vaultId,
      calcLimit,
      aiLimit,
    )
    .run();
  return c.json(
    {
      id,
      apiKey: secret,
      prefix,
      label,
      scopes,
      ratePolicy: { calcLimitPerMinute: calcLimit, aiLimitPerMinute: aiLimit },
      notice: "Shown once; this key accesses the same encrypted vault.",
    },
    201,
  );
});
app.post("/api/keys/rotate", async (c) => {
  const identity = await authenticate(c);
  if (identity instanceof Response) return identity;
  const body: { label?: string } = await c.req
      .json<{ label?: string }>()
      .catch(() => ({})),
    secret = `sah_${randomToken(32)}`,
    id = crypto.randomUUID(),
    prefix = secret.slice(0, 12),
    label = (body.label || "Rotated key").trim().slice(0, 60) || "Rotated key",
    scopes = [
      "charts:read",
      "charts:write",
      "shares:write",
      "usage:read",
      "mcp:calculate",
      "ai:narrate",
    ];
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO api_keys(id,key_hash,key_prefix,label,scopes_json,vault_id,calc_limit_per_minute,ai_limit_per_minute) VALUES(?,?,?,?,?,?,?,?)",
    ).bind(
      id,
      await sha256(secret),
      prefix,
      label,
      JSON.stringify(scopes),
      identity.vaultId,
      identity.calcLimitPerMinute,
      identity.aiLimitPerMinute,
    ),
    c.env.DB.prepare(
      "UPDATE api_keys SET revoked_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(identity.id),
  ]);
  return c.json(
    {
      id,
      apiKey: secret,
      prefix,
      label,
      scopes,
      ratePolicy: {
        calcLimitPerMinute: identity.calcLimitPerMinute,
        aiLimitPerMinute: identity.aiLimitPerMinute,
      },
      previousKeyRevoked: true,
      notice:
        "Shown once. Existing ciphertext and shares remain in the same vault.",
    },
    201,
  );
});
app.get("/api/usage", async (c) => {
  const identity = await authenticate(c, "usage:read");
  if (identity instanceof Response) return identity;
  const rows = await c.env.DB.prepare(
    "SELECT usage_date,operation,SUM(count) count FROM api_usage_daily WHERE key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?) GROUP BY usage_date,operation ORDER BY usage_date DESC,operation LIMIT 200",
  )
    .bind(identity.vaultId)
    .all();
  return c.json({ prefix: identity.prefix, usage: rows.results });
});
app.get("/api/billing/status", async (c) => {
  const identity = await authenticate(c);
  if (identity instanceof Response) return identity;
  const tier = await productTier(c.env, identity);
  const usage = await c.env.DB.prepare(
    "SELECT metric,count FROM entitlement_usage WHERE vault_id=?",
  )
    .bind(identity.vaultId)
    .all();
  return c.json({
    tier,
    billingGateEnabled: false,
    entitlements: ["unlimited_charts", "compatibility", "pdf"],
    usage: usage.results,
  });
});
app.post("/api/billing/webhook", async (c) => {
  const supplied = (c.req.header("authorization") || "").replace(
      /^Bearer\s+/i,
      "",
    ),
    expected = c.env.BILLING_WEBHOOK_SECRET || "";
  if (!expected || (await sha256(supplied)) !== (await sha256(expected)))
    return c.json({ error: "Invalid billing webhook credential" }, 401);
  const event = await c.req
    .json<{
      vaultId?: string;
      provider?: string;
      customerId?: string;
      subscriptionId?: string;
      status?: "active" | "past_due" | "cancelled";
      tier?: ProductTier;
      currentPeriodEnd?: string;
    }>()
    .catch(() => null);
  if (!event?.vaultId || !event.status || !event.tier)
    return c.json({ error: "Invalid billing event" }, 400);
  await c.env.DB.prepare(
    "INSERT INTO billing_accounts(vault_id,tier,status,provider,provider_customer_id,provider_subscription_id,current_period_end) VALUES(?,?,?,?,?,?,?) ON CONFLICT(vault_id) DO UPDATE SET tier=excluded.tier,status=excluded.status,provider=excluded.provider,provider_customer_id=excluded.provider_customer_id,provider_subscription_id=excluded.provider_subscription_id,current_period_end=excluded.current_period_end,updated_at=CURRENT_TIMESTAMP",
  )
    .bind(
      event.vaultId,
      event.tier,
      event.status,
      event.provider || null,
      event.customerId || null,
      event.subscriptionId || null,
      event.currentPeriodEnd || null,
    )
    .run();
  return c.json({ accepted: true });
});

app.get("/api/charts", async (c) => {
  const identity = await authenticate(c, "charts:read");
  if (identity instanceof Response) return identity;
  const rows = await c.env.DB.prepare(
    "SELECT id,label,encryption_metadata_json,expires_at,created_at,updated_at FROM saved_chart_blobs WHERE owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?) AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) ORDER BY updated_at DESC",
  )
    .bind(identity.vaultId)
    .all();
  return c.json({ charts: rows.results });
});
app.post("/api/charts", async (c) => {
  const identity = await authenticate(c, "charts:write");
  if (identity instanceof Response) return identity;
  const body = await c.req.json<{
    label?: string;
    encryptedBlob?: string;
    encryption?: unknown;
    retentionDays?: number;
  }>();
  if (!body.encryptedBlob || body.encryptedBlob.length > 1_500_000)
    return c.json(
      { error: "Encrypted chart blob is required and must be under 1.5 MB" },
      400,
    );
  const id = crypto.randomUUID(),
    days = Math.min(3650, Math.max(1, Number(body.retentionDays || 365))),
    expires = new Date(Date.now() + days * 86400000).toISOString();
  await c.env.DB.prepare(
    "INSERT INTO saved_chart_blobs(id,owner_key_id,label,encrypted_blob,encryption_metadata_json,expires_at) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      id,
      identity.id,
      (body.label || "Saved chart").slice(0, 100),
      body.encryptedBlob,
      JSON.stringify(body.encryption || {}),
      expires,
    )
    .run();
  return c.json({ id, expiresAt: expires }, 201);
});
app.patch("/api/charts/:id", async (c) => {
  const identity = await authenticate(c, "charts:write");
  if (identity instanceof Response) return identity;
  const body: { label?: string } = await c.req
    .json<{ label?: string }>()
    .catch(() => ({}));
  const label = (body.label || "").trim().slice(0, 100);
  if (!label) return c.json({ error: "A non-empty label is required" }, 400);
  const result = await c.env.DB.prepare(
    "UPDATE saved_chart_blobs SET label=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
  )
    .bind(label, c.req.param("id"), identity.vaultId)
    .run();
  return result.meta.changes
    ? c.json({ updated: true, label })
    : c.json({ error: "Chart not found" }, 404);
});
app.get("/api/charts/:id", async (c) => {
  const identity = await authenticate(c, "charts:read");
  if (identity instanceof Response) return identity;
  const row = await c.env.DB.prepare(
    "SELECT id,label,encrypted_blob,encryption_metadata_json,expires_at,created_at,updated_at FROM saved_chart_blobs WHERE id=? AND owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?) AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)",
  )
    .bind(c.req.param("id"), identity.vaultId)
    .first();
  return row ? c.json(row) : c.json({ error: "Chart not found" }, 404);
});
app.delete("/api/charts/:id", async (c) => {
  const identity = await authenticate(c, "charts:write");
  if (identity instanceof Response) return identity;
  const id = c.req.param("id");
  await c.env.DB.batch([
    c.env.DB.prepare(
      "DELETE FROM private_shares WHERE chart_id=? AND owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
    ).bind(id, identity.vaultId),
    c.env.DB.prepare(
      "DELETE FROM saved_chart_blobs WHERE id=? AND owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
    ).bind(id, identity.vaultId),
  ]);
  return c.json({ deleted: true, dependentSharesRemoved: true });
});

app.post("/api/shares", async (c) => {
  const identity = await authenticate(c, "shares:write");
  if (identity instanceof Response) return identity;
  const body = await c.req.json<{
    chartId?: string;
    expiresDays?: number;
    includeBirthDetails?: boolean;
  }>();
  const chart = await c.env.DB.prepare(
    "SELECT id FROM saved_chart_blobs WHERE id=? AND owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
  )
    .bind(body.chartId || "", identity.vaultId)
    .first();
  if (!chart) return c.json({ error: "Chart not found" }, 404);
  const token = randomToken(24),
    id = crypto.randomUUID(),
    days = Math.min(30, Math.max(1, Number(body.expiresDays || 7))),
    expires = new Date(Date.now() + days * 86400000).toISOString();
  await c.env.DB.prepare(
    "INSERT INTO private_shares(id,chart_id,owner_key_id,token_hash,include_birth_details,expires_at) VALUES(?,?,?,?,?,?)",
  )
    .bind(
      id,
      body.chartId,
      identity.id,
      await sha256(token),
      body.includeBirthDetails ? 1 : 0,
      expires,
    )
    .run();
  return c.json(
    {
      id,
      token,
      url: `${new URL(c.req.url).origin}/api/shared/${token}`,
      expiresAt: expires,
      notice:
        "The server returns only the encrypted chart blob; put the client-side decryption secret in the URL fragment when sharing.",
    },
    201,
  );
});
app.get("/api/shares", async (c) => {
  const identity = await authenticate(c, "shares:write");
  if (identity instanceof Response) return identity;
  const rows = await c.env.DB.prepare(
    "SELECT s.id,s.chart_id,b.label chart_label,s.include_birth_details,s.expires_at,s.revoked_at,s.access_count,s.created_at FROM private_shares s JOIN saved_chart_blobs b ON b.id=s.chart_id WHERE s.owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?) ORDER BY s.created_at DESC LIMIT 200",
  )
    .bind(identity.vaultId)
    .all();
  return c.json({ shares: rows.results });
});
app.get("/api/shared/:token", async (c) => {
  const hash = await sha256(c.req.param("token"));
  const row = await c.env.DB.prepare(
    "SELECT s.id,s.include_birth_details,s.expires_at,b.label,b.encrypted_blob,b.encryption_metadata_json FROM private_shares s JOIN saved_chart_blobs b ON b.id=s.chart_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP",
  )
    .bind(hash)
    .first<{ id: string }>();
  if (!row)
    return c.json({ error: "Share not found, expired, or revoked" }, 404);
  await c.env.DB.prepare(
    "UPDATE private_shares SET access_count=access_count+1 WHERE id=?",
  )
    .bind(row.id)
    .run();
  return c.json(row);
});
app.delete("/api/shares/:id", async (c) => {
  const identity = await authenticate(c, "shares:write");
  if (identity instanceof Response) return identity;
  await c.env.DB.prepare(
    "UPDATE private_shares SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
  )
    .bind(c.req.param("id"), identity.vaultId)
    .run();
  return c.json({ revoked: true });
});
app.get("/api/vault/export", async (c) => {
  const identity = await authenticate(c, "charts:read");
  if (identity instanceof Response) return identity;
  const [charts, shares, keys] = await Promise.all([
    c.env.DB.prepare(
      "SELECT id,label,encrypted_blob,encryption_metadata_json,expires_at,created_at,updated_at FROM saved_chart_blobs WHERE owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
    )
      .bind(identity.vaultId)
      .all(),
    c.env.DB.prepare(
      "SELECT id,chart_id,include_birth_details,expires_at,revoked_at,access_count,created_at FROM private_shares WHERE owner_key_id IN (SELECT id FROM api_keys WHERE COALESCE(vault_id,id)=?)",
    )
      .bind(identity.vaultId)
      .all(),
    c.env.DB.prepare(
      "SELECT key_prefix,label,scopes_json,created_at,last_used_at,revoked_at FROM api_keys WHERE COALESCE(vault_id,id)=?",
    )
      .bind(identity.vaultId)
      .all(),
  ]);
  return c.json({
    schemaVersion: "sahadeva-encrypted-vault-export-1",
    exportedAt: new Date().toISOString(),
    charts: charts.results,
    shares: shares.results,
    keys: keys.results,
    notice:
      "Chart payloads remain ciphertext. Decryption keys are browser-held and must be backed up separately.",
  });
});

app.post("/api/chart", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  if (c.req.header("authorization")) {
    const identity = await authenticate(c, "mcp:calculate");
    if (identity instanceof Response) return identity;
  }
  if (Number(c.req.header("content-length") || 0) > 16_384)
    return c.json({ error: "Request body too large" }, 413);
  const parsed = birthInputSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      { error: "Invalid birth details", issues: parsed.error.flatten() },
      400,
    );
  return c.json(calculateChart(parsed.data));
});

app.post("/api/uncertainty", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const parsed = birthInputSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      { error: "Invalid birth details", issues: parsed.error.flatten() },
      400,
    );
  return c.json(simulateBirthTimeUncertainty(parsed.data));
});

app.post("/api/ingresses", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const body = await c.req.json<Record<string, unknown>>();
  const days = Math.min(366, Math.max(1, Number(body.days || 30)));
  const parsed = birthInputSchema.safeParse({
    ...body,
    name: "Ingress timeline",
    methodology: "parashari",
    focus: "general",
    birthTimeAccuracyMinutes: 0,
  });
  if (!parsed.success || !Number.isInteger(days))
    return c.json({ error: "Invalid ingress request" }, 400);
  return c.json(calculateIngressTimeline(parsed.data, days));
});

app.post("/api/dasha/calendar", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const parsed = birthInputSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      { error: "Invalid birth details", issues: parsed.error.flatten() },
      400,
    );
  const chart = calculateChart(parsed.data);
  return c.json({
    birthJulianDay: chart.engine.julianDay,
    current: queryDashaAt(chart, new Date().toISOString()),
    timeline: buildDashaCalendar(chart),
  });
});

app.post("/api/dasha.ics", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const parsed = birthInputSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid birth details" }, 400);
  const filename =
    parsed.data.name.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") ||
    "sahadeva";
  return c.body(dashaCalendarIcs(calculateChart(parsed.data)), 200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}-vimshottari.ics"`,
  });
});

app.post("/api/transits/calendar", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const body = await c.req.json<Record<string, unknown>>(),
    parsed = birthInputSchema.safeParse({
      ...body,
      methodology: "parashari",
      focus: "general",
      birthTimeAccuracyMinutes: 0,
    }),
    start = typeof body.startDate === "string" ? isoToJd(body.startDate) : NaN,
    years = Math.min(40, Math.max(0.1, Number(body.years || 10)));
  if (!parsed.success || !Number.isFinite(start) || !Number.isFinite(years))
    return c.json({ error: "Invalid transit-calendar request" }, 400);
  const chart = calculateChart(parsed.data),
    calendar = buildSlowTransitCalendar(chart, start, start + years * 365.2425);
  return c.json({
    ...calendar,
    dashaIntersections: intersectDashaTransits(chart, calendar.periods),
  });
});

app.post("/api/transits.ics", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const body = await c.req.json<Record<string, unknown>>(),
    parsed = birthInputSchema.safeParse({
      ...body,
      methodology: "parashari",
      focus: "general",
      birthTimeAccuracyMinutes: 0,
    }),
    start = typeof body.startDate === "string" ? isoToJd(body.startDate) : NaN,
    years = Math.min(40, Math.max(0.1, Number(body.years || 10)));
  if (!parsed.success || !Number.isFinite(start) || !Number.isFinite(years))
    return c.json({ error: "Invalid transit-calendar request" }, 400);
  const chart = calculateChart(parsed.data),
    calendar = buildSlowTransitCalendar(chart, start, start + years * 365.2425),
    selected = new Set(
      String(body.planets || "Saturn,Jupiter,Rahu,Ketu").split(","),
    );
  const filename =
    parsed.data.name.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") ||
    "sahadeva";
  return c.body(
    transitCalendarIcs(
      calendar.periods.filter((period) => selected.has(period.planet)),
      parsed.data.name,
    ),
    200,
    {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-transits.ics"`,
    },
  );
});

app.post("/api/prashna", async (c) => {
  const receivedAt = new Date();
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const parsed = prashnaRequestSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success)
    return c.json(
      { error: "Invalid Prashna request", details: parsed.error.flatten() },
      400,
    );
  const result = buildPrashnaConsultation(parsed.data, receivedAt);
  await c.env.DB.prepare(
    "INSERT INTO consultations (id,created_at,method,category,question_hash,confirmation_hash,asked_at,result_json,outcome_status) VALUES (?,?,?,?,?,?,?,?,'awaiting-outcome')",
  )
    .bind(
      result.consultationId,
      receivedAt.toISOString(),
      "prashna",
      parsed.data.category,
      await sha256(parsed.data.question.trim().toLowerCase()),
      await sha256(result.feedback.confirmationToken),
      result.question.askedAt,
      JSON.stringify(redactConfirmationToken(result)),
    )
    .run();
  return c.json(result, 201);
});

app.post("/api/prashna/outcome", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const body: {
    confirmationToken?: string;
    outcome?: string;
    resolvedAt?: string;
    notes?: string;
  } = await c.req.json().catch(() => ({}));
  if (
    !body.confirmationToken ||
    !["confirmed", "partly-confirmed", "not-confirmed", "unresolved"].includes(
      String(body.outcome),
    )
  )
    return c.json(
      { error: "A valid confirmationToken and outcome are required" },
      400,
    );
  const existing = await c.env.DB.prepare(
    "SELECT id FROM consultations WHERE confirmation_hash=?",
  )
    .bind(await sha256(body.confirmationToken))
    .first<{ id: string }>();
  if (!existing) return c.json({ error: "Consultation not found" }, 404);
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO consultation_outcomes (id,consultation_id,recorded_at,outcome,resolved_at,notes) VALUES (?,?,?,?,?,?)",
    ).bind(
      id,
      existing.id,
      now,
      body.outcome,
      body.resolvedAt || null,
      String(body.notes || "").slice(0, 1000) || null,
    ),
    c.env.DB.prepare(
      "UPDATE consultations SET outcome_status=? WHERE id=?",
    ).bind(body.outcome, existing.id),
  ]);
  return c.json(
    { id, consultationId: existing.id, status: "recorded", recordedAt: now },
    201,
  );
});

app.post("/api/timing/fusion", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const body = await c.req.json<Record<string, unknown>>(),
    parsed = birthInputSchema.safeParse(body);
  const topics = new Set([
    "career",
    "marriage",
    "wealth",
    "education",
    "children",
    "property",
    "spirituality",
  ]);
  if (
    !parsed.success ||
    typeof body.topic !== "string" ||
    !topics.has(body.topic) ||
    typeof body.startIso !== "string" ||
    typeof body.endIso !== "string"
  )
    return c.json({ error: "Invalid timing-fusion request" }, 400);
  return c.json(
    fuseTiming(
      calculateChart(parsed.data),
      body.topic as any,
      body.startIso,
      body.endIso,
    ),
  );
});

app.post("/api/rectification", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const parsed = rectificationRequestSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success)
    return c.json(
      {
        error: "Invalid rectification request",
        details: parsed.error.flatten(),
      },
      400,
    );
  return c.json(rectifyBirthTime(parsed.data));
});

app.post("/api/depth", async (c) => {
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  const body = await c.req.json<Record<string, unknown>>(),
    parsed = birthInputSchema.safeParse(body),
    topics = new Set([
      "career",
      "marriage",
      "wealth",
      "education",
      "children",
      "property",
      "spirituality",
    ]),
    topic =
      typeof body.topic === "string" && topics.has(body.topic)
        ? body.topic
        : "career";
  if (!parsed.success) return c.json({ error: "Invalid depth request" }, 400);
  const chart = calculateChart(parsed.data);
  return c.json({
    schemaVersion: "sahadeva-depth-1",
    topic,
    strengthLineage: calculateStrengthLineage(chart),
    vargaSynthesis: synthesizeVargas(chart, topic as any),
    targetedLagnas: chart.advanced.houses.targetedLagnas,
    yogas: chart.advanced.yogas,
    additionalDashas: additionalDashaStatus(chart),
    safety: safetyEnvelope(),
  });
});

type NarrationResult = {
  response: string;
  provider: "cloudflare-workers-ai" | "openai";
  model: string;
};

function narrationText(result: unknown) {
  if (!result || typeof result !== "object") return "";
  const value = result as {
    response?: unknown;
    output_text?: unknown;
    result?: { response?: unknown };
    choices?: Array<{ message?: { content?: unknown }; text?: unknown }>;
  };
  if (typeof value.response === "string") return value.response;
  if (typeof value.output_text === "string") return value.output_text;
  if (typeof value.result?.response === "string") return value.result.response;
  const choice = value.choices?.[0];
  return typeof choice?.message?.content === "string"
    ? choice.message.content
    : typeof choice?.text === "string"
      ? choice.text
      : "";
}

async function runNarration(
  env: Env,
  prompt: string,
): Promise<NarrationResult> {
  if (env.OPENAI_API_KEY) {
    const openaiModel = env.OPENAI_CHAT_MODEL || "gpt-5.6-luna";
    try {
      const upstream = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: openaiModel,
            messages: [{ role: "user", content: prompt }],
            max_completion_tokens: 4000,
            // Interpret is the deep-analysis path; a medium reasoning pass
            // costs a few seconds and measurably improves synthesis.
            reasoning_effort: "medium",
          }),
        },
      );
      if (upstream.ok) {
        const data = (await upstream.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = (data.choices?.[0]?.message?.content || "").trim();
        if (text)
          return { response: text, provider: "openai", model: openaiModel };
      } else {
        console.error(
          "openai narration failed, falling back:",
          upstream.status,
          (await upstream.text()).slice(0, 300),
        );
      }
    } catch (error) {
      console.error(
        "openai narration unreachable, falling back:",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
  const configuredModel = env.AI_MODEL || "@cf/zai-org/glm-5.3-flash",
    model = configuredModel.startsWith("@cf/")
      ? configuredModel
      : "@cf/zai-org/glm-5.3-flash",
    result = await env.AI.run(model as Parameters<Ai["run"]>[0], {
      messages: [{ role: "user", content: prompt }],
      // GLM's internal reasoning shares this budget with the reply; too small
      // a cap makes it exhaust the budget mid-reasoning and return no text.
      max_tokens: 2200,
      temperature: 0.25,
    }),
    response = narrationText(result).trim();
  if (!response) throw new Error("Workers AI returned no narration text");
  return { response, provider: "cloudflare-workers-ai", model };
}

app.get("/api/ai/status", (c) =>
  c.json({
    available: Boolean(c.env.AI),
    provider: "cloudflare-workers-ai",
    model: c.env.AI_MODEL || "@cf/zai-org/glm-5.3-flash",
    hosting: "cloudflare-workers-ai-binding",
    policy: "calculated evidence is immutable; narration is optional",
  }),
);

app.post("/api/interpret", async (c) => {
  const limited = await enforceLimit(c, c.env.AI_RATE_LIMITER);
  if (limited) return limited;
  if (c.req.header("authorization")) {
    const identity = await authenticate(c, "ai:narrate");
    if (identity instanceof Response) return identity;
    const keyLimited = await enforceKeyLimit(c, identity, "ai");
    if (keyLimited) return keyLimited;
    c.header("X-Sahadeva-Key", identity.prefix);
  }
  if (Number(c.req.header("content-length") || 0) > 262_144)
    return c.json({ error: "Request body too large" }, 413);
  const body = await c.req.json<{
    chart?: unknown;
    consultation?: unknown;
    question?: string;
    language?: string;
  }>();
  if (!body.chart && !body.consultation)
    return c.json(
      { error: "A calculated chart or consultation result is required" },
      400,
    );
  const chart = (body.chart || {}) as {
    advanced?: {
      guidance?: {
        methodology?: { selected?: string; status?: string };
        confidence?: { score?: number; level?: string };
      };
    };
  };
  const methodology = chart.advanced?.guidance?.methodology;
  if (methodology?.status === "not-implemented")
    return c.json(
      {
        error: `${methodology.selected || "Selected"} interpretation is not implemented. Choose Parashari to prevent silent method blending.`,
      },
      422,
    );
  const prompt = [
    "You are Sahadeva, a careful Jyotish research assistant.",
    "Use only the supplied calculated facts. Never invent placements, timings, yogas, remedies, or certainty.",
    "Separate observation from traditional interpretation. State that astrology is a cultural practice, not scientific fact.",
    "Use only the selected methodology. Never blend KP, Western, Nadi, or other systems into Parashari analysis.",
    "Follow this evidence order: Lagna, relevant house and lord, natural karaka, dignity/aspects, relevant varga, then dasha timing.",
    "Do not present medical, death, fertility, legal, or financial outcomes as facts. Do not frighten the user. Do not prescribe guaranteed remedies.",
    `Confidence metadata: ${JSON.stringify(chart.advanced?.guidance?.confidence || {})}`,
    `Respond in ${body.language || "English"}.`,
    `Question: ${body.question || "Summarize the chart carefully."}`,
    body.consultation
      ? "The supplied consultation judgment is immutable. Explain its observations, contradictions, tier, uncertainty and optional reviewed remedies; do not change its direction or score."
      : "The supplied natal chart is immutable.",
    `Evidence JSON: ${JSON.stringify(body.consultation || chart)}`,
  ].join("\n");
  try {
    const result = await runNarration(c.env, prompt);
    c.header("X-Sahadeva-AI-Provider", result.provider);
    return c.json({
      ...result,
      evidenceImmutable: true,
      safety: safetyEnvelope(),
    });
  } catch {
    return c.json(
      {
        error: "AI narration is temporarily unavailable",
        calculationAvailable: true,
      },
      503,
    );
  }
});

app.post("/api/chat", async (c) => {
  const limited = await enforceLimit(c, c.env.AI_RATE_LIMITER);
  if (limited) return limited;
  if (Number(c.req.header("content-length") || 0) > 65_536)
    return c.json({ error: "Request body too large" }, 413);
  const body = await c.req
    .json<{
      profile?: Record<string, unknown>;
      partner?: Record<string, unknown>;
      mode?: { prashna?: boolean; muhurta?: { activity?: string } };
      messages?: Array<{ role?: string; content?: string }>;
    }>()
    .catch(() => null);
  if (!body?.profile)
    return c.json({ error: "Birth details are required" }, 400);
  const parsed = birthInputSchema.safeParse({
    ...body.profile,
    methodology: "parashari",
  });
  if (!parsed.success)
    return c.json(
      { error: "Invalid birth details", issues: parsed.error.flatten() },
      400,
    );
  const partnerParsed = body.partner
    ? birthInputSchema.safeParse({ ...body.partner, methodology: "parashari" })
    : null;
  if (body.partner && !partnerParsed?.success)
    return c.json({ error: "Invalid partner birth details" }, 400);
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (item): item is { role: "user" | "assistant"; content: string } =>
        (item?.role === "user" || item?.role === "assistant") &&
        typeof item?.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-12)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }));
  try {
    const chart = await calculateChartCached(c.env, parsed.data),
      asOf = new Date().toISOString(),
      current = queryDashaAt(chart, asOf),
      reading = buildEverydayReading(chart, current, parsed.data.language),
      lagna = chart.placements.find((item) => item.name === "Lagna")!,
      moon = chart.placements.find((item) => item.name === "Moon")!,
      strengths = chart.advanced.planetaryStates.avasthas
        .filter((item) => item.requiredStrengthRatio !== null)
        .sort(
          (a, b) =>
            Number(b.requiredStrengthRatio) - Number(a.requiredStrengthRatio),
        )
        .slice(0, 5),
      retrievedSources = await (async () => {
        const lastUser = [...history]
          .reverse()
          .find((m) => m.role === "user")?.content;
        if (!lastUser) return [];
        const rows = await searchKnowledge(c.env, lastUser, 3);
        return rows.map((row) => ({
          work: row.work,
          author: row.author,
          section: row.section,
          excerpt: row.passage,
        }));
      })(),
      evidence = {
        subject: { name: parsed.data.name, place: parsed.data.place },
        placements: chart.placements.map((item) => ({
          name: item.name,
          sign: item.signName,
          degree: Number(item.degree.toFixed(2)),
          nakshatra: item.nakshatra,
          pada: item.pada,
          retrograde: item.retrograde || false,
        })),
        navamsa: chart.navamsa.map((item) => ({
          name: item.name,
          sign: item.signName,
        })),
        wholeSignHouses: chart.advanced.houses.equalBhava.planetHouses.map(
          (item) => ({ name: item.name, house: item.wholeSignHouse }),
        ),
        detectedYogas: chart.advanced.yogas
          .filter((item) => item.detected)
          .map((item) => ({ yoga: item.yoga, evidence: item.evidence })),
        focus: chart.advanced.guidance.focus,
        anchors: {
          lagna: {
            signName: lagna.signName,
            degree: Number(lagna.degree.toFixed(2)),
          },
          moon: {
            signName: moon.signName,
            degree: Number(moon.degree.toFixed(2)),
            nakshatra: moon.nakshatra,
            pada: moon.pada,
          },
        },
        panchanga: {
          vara: chart.panchanga.vara,
          tithi: chart.panchanga.tithi,
          paksha: chart.panchanga.paksha,
          nakshatra: chart.panchanga.nakshatra,
          yoga: chart.panchanga.yoga,
          karana: chart.panchanga.karana,
        },
        currentTiming: {
          asOf: current.instantIso,
          mahadasha: current.mahadasha,
          antardasha: current.antardasha,
          pratyantardasha: current.pratyantardasha,
          boundaries: current.boundaries,
          ...(() => {
            const jd = isoToJd(asOf),
              timeline = chart.advanced.vimshottariTimeline,
              mahaIndex = timeline.findIndex(
                (period) =>
                  jd >= period.startJulianDay && jd < period.endJulianDay,
              ),
              maha = timeline[mahaIndex],
              antarIndex =
                maha?.subPeriods.findIndex(
                  (period) =>
                    jd >= period.startJulianDay && jd < period.endJulianDay,
                ) ?? -1,
              nextAntar =
                maha?.subPeriods[antarIndex + 1] ||
                timeline[mahaIndex + 1]?.subPeriods[0],
              nextMaha = timeline[mahaIndex + 1];
            return {
              nextAntardasha: nextAntar
                ? {
                    lord: nextAntar.lord,
                    startIso: jdToIso(nextAntar.startJulianDay),
                    endIso: jdToIso(nextAntar.endJulianDay),
                  }
                : null,
              nextMahadasha: nextMaha
                ? {
                    lord: nextMaha.lord,
                    startIso: jdToIso(nextMaha.startJulianDay),
                    endIso: jdToIso(nextMaha.endJulianDay),
                  }
                : null,
            };
          })(),
        },
        readingSections: reading.sections.map((section) => ({
          id: section.id,
          title: section.title,
          message: section.message,
          evidence: section.evidence,
        })),
        measuredStrengths: strengths.map((item) => ({
          planet: item.name,
          ratio: item.requiredStrengthRatio,
          avastha: item.balaadiAvastha,
        })),
        confidence: chart.advanced.guidance.confidence,
        classicalSources: retrievedSources,
        transits: (() => {
          try {
            const now = new Date(
              Math.floor(Date.now() / 1_800_000) * 1_800_000 +
                parsed.data.timezoneOffset * 3_600_000,
            );
            const transit = calculateChart(
              birthInputSchema.parse({
                ...parsed.data,
                name: "Transit",
                date: now.toISOString().slice(0, 10),
                time: now.toISOString().slice(11, 16),
                birthTimeAccuracyMinutes: 0,
              }),
            );
            const natalLagna = chart.placements.find(
              (p) => p.name === "Lagna",
            )!;
            const natalMoon = chart.placements.find((p) => p.name === "Moon")!;
            return transit.placements
              .filter((p) => p.name !== "Lagna")
              .map((p) => ({
                name: p.name,
                sign: p.signName,
                degree: Number(p.degree.toFixed(2)),
                retrograde: p.retrograde || false,
                houseFromLagna: ((p.sign - natalLagna.sign + 12) % 12) + 1,
                houseFromMoon: ((p.sign - natalMoon.sign + 12) % 12) + 1,
              }));
          } catch {
            return [];
          }
        })(),
        ...(body.mode?.prashna
          ? (() => {
              const question =
                [...history].reverse().find((m) => m.role === "user")
                  ?.content || "General question";
              const lower = question.toLowerCase();
              const category = /career|job|work|promotion|business|ఉద్యోగ|వృత్తి/.test(lower)
                ? "career"
                : /marri|love|partner|relationship|పెళ్లి|వివాహ/.test(lower)
                  ? "relationship"
                  : /money|loan|debt|salary|డబ్బు/.test(lower)
                    ? "money"
                    : /house|property|land|home|ఇల్లు|స్థలం/.test(lower)
                      ? "property"
                      : /travel|trip|abroad|visa|ప్రయాణ/.test(lower)
                        ? "travel"
                        : /lost|missing|పోయి/.test(lower)
                          ? "lost-object"
                          : "general";
              try {
                const prashna = buildPrashnaConsultation(
                  {
                    question: question.slice(0, 500),
                    category,
                    place: parsed.data.place,
                    latitude: parsed.data.latitude,
                    longitude: parsed.data.longitude,
                    timezone: parsed.data.timezone || "UTC",
                    language: parsed.data.language,
                  },
                  new Date(),
                );
                return {
                  prashna: {
                    ...prashna,
                    confirmationToken: undefined,
                  },
                };
              } catch {
                return {};
              }
            })()
          : {}),
        ...(body.mode?.muhurta
          ? (() => {
              const activity = (
                body.mode.muhurta.activity &&
                body.mode.muhurta.activity in MUHURTA_RULEBOOK.activities
                  ? body.mode.muhurta.activity
                  : "contract"
              ) as MuhurtaActivity;
              try {
                const windows = [];
                const base = {
                  name: "Muhurta",
                  time: "12:00",
                  place: parsed.data.place,
                  latitude: parsed.data.latitude,
                  longitude: parsed.data.longitude,
                  timezone: parsed.data.timezone,
                  timezoneOffset: parsed.data.timezoneOffset,
                  language: "en" as const,
                  methodology: "parashari" as const,
                  focus: "general" as const,
                  birthTimeAccuracyMinutes: 0,
                };
                const startAt = Date.now();
                for (let day = 0; day < 5; day++) {
                  const at = startAt + day * 86400000;
                  const date = new Date(at).toISOString().slice(0, 10);
                  const nextDate = new Date(at + 86400000)
                    .toISOString()
                    .slice(0, 10);
                  const daily = buildDailyPanchanga(
                    calculateChart(birthInputSchema.parse({ ...base, date })),
                    calculateChart(
                      birthInputSchema.parse({ ...base, date: nextDate }),
                    ),
                    chart,
                  );
                  if (daily.status !== "computed" || !daily.choghadiya)
                    continue;
                  for (const candidate of daily.choghadiya.day.filter(
                    (item) => item.quality === "favorable",
                  )) {
                    windows.push(
                      scoreMuhurta(activity, daily, candidate, chart),
                    );
                  }
                }
                windows.sort(
                  (a, b) =>
                    b.score - a.score || a.startJulianDay - b.startJulianDay,
                );
                return {
                  muhurta: {
                    activity,
                    daysSearched: 5,
                    topWindows: windows.slice(0, 6),
                  },
                };
              } catch {
                return {};
              }
            })()
          : {}),
        today: (() => {
          try {
            const dayIso = (offsetDays: number) =>
              new Date(
                Date.now() +
                  (parsed.data.timezoneOffset * 3600 + offsetDays * 86400) *
                    1000,
              )
                .toISOString()
                .slice(0, 10);
            const base = {
              ...parsed.data,
              name: "Today",
              time: "12:00",
              birthTimeAccuracyMinutes: 0,
            };
            const daily = buildDailyPanchanga(
              calculateChart({ ...base, date: dayIso(0) }),
              calculateChart({ ...base, date: dayIso(1) }),
              chart,
            ) as {
              date?: string;
              fiveLimbs?: unknown;
              solar?: { sunrise?: string; sunset?: string };
              inauspicious?: { rahuKaal?: unknown };
              personalized?: unknown;
            };
            return {
              date: daily.date,
              fiveLimbs: daily.fiveLimbs,
              sunrise: daily.solar?.sunrise,
              sunset: daily.solar?.sunset,
              rahuKaal: daily.inauspicious?.rahuKaal,
              personalized: daily.personalized,
            };
          } catch {
            return null;
          }
        })(),
        ...(partnerParsed?.success
          ? await (async () => {
              const partnerChart = await calculateChartCached(
                c.env,
                partnerParsed.data,
              );
              return {
                partnerSubject: {
                  name: partnerParsed.data.name,
                  place: partnerParsed.data.place,
                },
                compatibility: calculateCompatibility(chart, partnerChart),
              };
            })()
          : {}),
      },
      system = [
        "You are Sahadeva, a warm, careful Jyotish companion chatting on a phone.",
        "Use only the supplied calculated facts. Never invent placements, timings, yogas, remedies, or certainty.",
        "The placements list is the only truth about planet positions. If the user asserts a placement that contradicts it, gently correct them with the calculated position before interpreting.",
        "For dasha sequence, use only currentTiming (including nextAntardasha and nextMahadasha). For periods beyond those, say the exact sequence would need to be calculated instead of guessing.",
        "House positions are given in wholeSignHouses (whole-sign from the lagna) — use them instead of recomputing. Mention detectedYogas only when relevant, always with their evidence; never claim a yoga that is not listed.",
        "Follow the evidence order: lagna, relevant house and its lord, natural karaka, dignity, varga, then dasha timing.",
        "If a `compatibility` object is supplied, the user is comparing charts with partnerSubject: explain the calculated guna/kuta scores and dosha findings from it faithfully, note that matching is one traditional input among many, and never declare a match doomed or guaranteed.",
        "If a `prashna` object is supplied, this is a horary (Prashna) consultation: explain its judgment (direction, tier, observations, uncertainty) faithfully and never change its direction or score. Present it as a bounded traditional judgment, not a prediction.",
        "If a `muhurta` object is supplied, the user asked for auspicious timing: present the topWindows with their local times and scores, explain the strongest reasons, and note these are traditional quality windows, not guarantees.",
        "classicalSources are short reference excerpts retrieved from copyrighted classical works. When one is relevant, paraphrase it and cite the work and section naturally (e.g. 'Sarvarth Chintamani, on the 10th house, notes…'). Never reproduce long passages verbatim, never invent a citation, and if none are relevant simply ignore them.",
        "Remedies: only ever describe remedies that appear in classicalSources, framed as traditional practice with the source named — never as guaranteed fixes, and never prescribe expensive items.",
        "`transits` holds the current calculated transit positions with houses counted from the natal lagna and natal Moon — use them for any 'right now'/gochara question (e.g. Sade Sati means Saturn in 12th/1st/2nd from natal Moon). Never guess transit positions.",
        "The `today` object holds today's calculated panchanga at the user's birth location, with personalized taraBala and chandraBala. Use it for any question about today, this week, timing an activity, or a daily check-in — cite tara/chandra bala and rahu kaal times naturally. It is a daily rhythm lens, not a verdict.",
        "Separate observation from traditional interpretation. Astrology is a cultural practice, not scientific fact; say so briefly when relevant, not in every message.",
        "Use Parashari methodology only. Never blend KP, Western, Nadi, or other systems.",
        "Do not present medical, death, fertility, legal, or financial outcomes as facts. Do not frighten the user. Do not prescribe guaranteed remedies.",
        "Keep replies short and conversational: 2-4 short paragraphs or a compact list. No long headers. Plain language first; cite the evidence (dasha, lagna, Moon) naturally inline.",
        "If the user has not asked anything yet, greet them by name, give a two-line orientation of the chart, note the running mahadasha/antardasha, and invite a question.",
        `Respond in ${parsed.data.language === "te" ? "Telugu" : "English"}.`,
        `Evidence JSON (immutable): ${JSON.stringify(evidence)}`,
      ].join("\n"),
      chatMessages = [
        { role: "system" as const, content: system },
        ...(history.length
          ? history
          : [
              {
                role: "user" as const,
                content:
                  "I just shared my birth details. Welcome me and orient me to my chart.",
              },
            ]),
      ],
      summary = {
        anchors: evidence.anchors,
        panchanga: evidence.panchanga,
        currentTiming: evidence.currentTiming,
        measuredStrengths: evidence.measuredStrengths,
        confidence: evidence.confidence,
      };

    // Preferred brain: OpenAI (gpt-5.6-luna) with reasoning disabled for
    // latency. Falls back to Workers AI when no key is set or the call fails.
    let model = "";
    let provider = "";
    let aiStream: ReadableStream<Uint8Array> | Record<string, unknown> | null =
      null;
    if (c.env.OPENAI_API_KEY) {
      const openaiModel = c.env.OPENAI_CHAT_MODEL || "gpt-5.6-luna";
      try {
        const upstream = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: openaiModel,
              messages: chatMessages,
              max_completion_tokens: 2800,
              reasoning_effort: "none",
              stream: true,
            }),
          },
        );
        if (upstream.ok && upstream.body) {
          aiStream = upstream.body;
          model = openaiModel;
          provider = "openai";
        } else {
          console.error(
            "openai chat failed, falling back:",
            upstream.status,
            (await upstream.text()).slice(0, 300),
          );
        }
      } catch (openaiError) {
        console.error(
          "openai chat unreachable, falling back:",
          openaiError instanceof Error ? openaiError.message : "unknown",
        );
      }
    }
    if (!aiStream) {
      // Workers AI fallback needs a NON-reasoning model: reasoning models
      // (GLM-5.x, GLM-4.7, DeepSeek) burn 15-50s on hidden reasoning before
      // the first visible token, and Workers AI cannot fully disable it.
      const configuredModel =
        c.env.AI_CHAT_MODEL || "@cf/meta/llama-4-scout-17b-16e-instruct";
      model = configuredModel.startsWith("@cf/")
        ? configuredModel
        : "@cf/meta/llama-4-scout-17b-16e-instruct";
      provider = "cloudflare-workers-ai";
      aiStream = (await c.env.AI.run(model as Parameters<Ai["run"]>[0], {
        messages: chatMessages,
        // Telugu output is token-dense; too small a cap yields an empty reply.
        max_tokens: 2800,
        temperature: 0.4,
        stream: true,
      } as never)) as ReadableStream<Uint8Array> | Record<string, unknown>;
    }

    // Stream protocol: one JSON line with the summary, then a record
    // separator (U+001E), then plain reply text as it is generated.
    const encoder = new TextEncoder();
    const head = encoder.encode(`${JSON.stringify({ summary, model, sources: retrievedSources.map((row) => ({ work: row.work, section: row.section, snippet: row.excerpt.slice(0, 360) })) })}`);
    if (!(aiStream instanceof ReadableStream)) {
      const response = narrationText(aiStream).trim();
      if (!response) throw new Error("Workers AI returned no chat text");
      return c.json({ response, model, summary, safety: safetyEnvelope() });
    }
    const out = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(head);
        const reader = (aiStream as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";
            for (const event of events) {
              for (const line of event.split("\n")) {
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const parsedChunk = JSON.parse(payload) as {
                    response?: string;
                    choices?: Array<{ delta?: { content?: string } }>;
                  };
                  const text =
                    typeof parsedChunk.response === "string"
                      ? parsedChunk.response
                      : parsedChunk.choices?.[0]?.delta?.content || "";
                  if (text) controller.enqueue(encoder.encode(text));
                } catch {
                  /* ignore malformed chunks */
                }
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });
    return new Response(out, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "X-Sahadeva-AI-Provider": provider,
        "X-Sahadeva-AI-Model": model,
      },
    });
  } catch (error) {
    console.error(
      "chat endpoint failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
    return c.json(
      {
        error:
          "The assistant is temporarily unavailable. Your calculated chart is unaffected.",
        calculationAvailable: true,
      },
      503,
    );
  }
});

app.get("/mcp", (c) =>
  c.json({
    name: "Sahadeva MCP",
    protocolVersion: "2026-07-28",
    transport: "stateless HTTP",
    tools: mcpTools.map((tool) => tool.name),
  }),
);
app.post("/mcp", async (c) => {
  const requestStartedAt = performance.now();
  const limited = await enforceLimit(c, c.env.CALC_RATE_LIMITER);
  if (limited) return limited;
  let keyIdentity: KeyIdentity | undefined;
  if (c.req.header("authorization")) {
    const identity = await authenticate(c, "mcp:calculate");
    if (identity instanceof Response) return identity;
    keyIdentity = identity;
    const keyLimited = await enforceKeyLimit(c, identity, "calc");
    if (keyLimited) return keyLimited;
    c.header("X-Sahadeva-Key", identity.prefix);
  }
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  if (Number(c.req.header("content-length") || 0) > 32_768)
    return c.json(rpcError(null, -32000, "Request body too large"), 413);
  const origin = c.req.header("origin");
  const host = new URL(c.req.url).host;
  if (origin && new URL(origin).host !== host)
    return c.json(rpcError(null, -32000, "Origin not allowed"), 403);
  const request = await c.req.json<RpcRequest>().catch(() => null);
  if (!request) return c.json(rpcError(null, -32700, "Parse error"), 400);
  const response = enforceSafetyContract(
    await handleMcp(request, c.env, keyIdentity),
    request.params?.name,
  );
  if (response === null) return c.body(null, 202);
  const durationMs = performance.now() - requestStartedAt;
  return c.json(response, 200, {
    "MCP-Protocol-Version":
      c.req.header("MCP-Protocol-Version") || "2026-07-28",
    "Server-Timing": `sahadeva;dur=${durationMs.toFixed(1)}`,
    "X-Sahadeva-Response-Profile":
      request.params?.name === "consult_jyotishya" ? "compact" : "expert",
  });
});

async function scheduled(
  _event: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.DB) return;
  const nowUtcHour = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  const rows = await env.DB.prepare(
    "SELECT endpoint, hour, tz_offset, last_sent_at FROM push_subscriptions",
  ).all<{
    endpoint: string;
    hour: number;
    tz_offset: number;
    last_sent_at: string | null;
  }>();
  const todayKey = new Date().toISOString().slice(0, 10);
  for (const row of rows.results || []) {
    const localHour = (((nowUtcHour + row.tz_offset) % 24) + 24) % 24;
    const due = Math.abs(localHour - row.hour) < 0.75;
    const alreadySent = row.last_sent_at?.slice(0, 10) === todayKey;
    if (!due || alreadySent) continue;
    try {
      const status = await sendPush(
        row.endpoint,
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY,
      );
      if (status === 404 || status === 410) {
        await env.DB.prepare(
          "DELETE FROM push_subscriptions WHERE endpoint=?",
        )
          .bind(row.endpoint)
          .run();
      } else {
        await env.DB.prepare(
          "UPDATE push_subscriptions SET last_sent_at=? WHERE endpoint=?",
        )
          .bind(new Date().toISOString(), row.endpoint)
          .run();
      }
    } catch (error) {
      console.error(
        "push send failed:",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
}

export { app };
export default {
  fetch: app.fetch,
  scheduled,
};
