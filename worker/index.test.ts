import { describe, expect, it } from "vitest";
import { app } from "./index";

async function mcp(method: string, params?: unknown, env?: unknown) {
  const response = await app.request(
    "http://localhost/mcp",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "MCP-Protocol-Version": "2026-07-28",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    },
    (env || { ENGINE_VERSION: "test" }) as never,
  );
  return {
    status: response.status,
    body: (await response.json()) as {
      result?: Record<string, unknown>;
      error?: unknown;
    },
  };
}

function authenticatedEnv(scopes: string[], rateCount = 1) {
  return {
    ENGINE_VERSION: "test",
    DB: {
      prepare: (sql: string) => ({
        bind() {
          return this;
        },
        first: async () =>
          sql.startsWith("INSERT INTO api_key_rate_windows")
            ? { count: rateCount }
            : {
                id: "key-1",
                vault_id: "vault-1",
                key_prefix: "sah_example",
                scopes_json: JSON.stringify(scopes),
                calc_limit_per_minute: 1,
                ai_limit_per_minute: 1,
              },
        run: async () => ({ success: true }),
      }),
      batch: async () => [],
    },
  } as never;
}

describe("Sahadeva MCP", () => {
  it("keeps the browser chart endpoint public while protected render APIs require a key", async () => {
    const input = {
        name: "Ananya",
        date: "1992-10-08",
        time: "14:47",
        place: "Chennai",
        latitude: 13.0827,
        longitude: 80.2707,
        timezoneOffset: 5.5,
        timezone: "Asia/Kolkata",
        language: "en",
        methodology: "parashari",
        focus: "general",
        birthTimeAccuracyMinutes: 5,
        houseSystem: "whole-sign",
      },
      env = {
        ENGINE_VERSION: "test",
        CALC_RATE_LIMITER: { limit: async () => ({ success: true }) },
      } as never,
      chart = await app.request(
        "http://localhost/api/chart",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
        env,
      ),
      render = await app.request(
        "http://localhost/api/render-chart",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
        env,
      );
    expect(chart.status).toBe(200);
    expect(render.status).toBe(401);
  });
  it("sets browser and API security headers", async () => {
    const response = await app.request("http://localhost/api/health", {}, {
      ENGINE_VERSION: "test",
    } as never);
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
  it("reports and uses the configured Cloudflare Workers AI narration provider", async () => {
    const env = {
        ENGINE_VERSION: "test",
        AI_MODEL: "@cf/test/narrator",
        AI: {
          run: async () => ({ response: "Grounded narration." }),
        },
        AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
      },
      status = await app.request(
        "http://localhost/api/ai/status",
        {},
        env as never,
      ),
      statusBody = (await status.json()) as Record<string, unknown>;
    expect(statusBody).toMatchObject({
      available: true,
      provider: "cloudflare-workers-ai",
      model: "@cf/test/narrator",
      hosting: "cloudflare-workers-ai-binding",
    });

    const response = await app.request(
        "http://localhost/api/interpret",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chart: {}, question: "What is observable?" }),
        },
        env as never,
      ),
      body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Sahadeva-AI-Provider")).toBe(
      "cloudflare-workers-ai",
    );
    expect(body).toMatchObject({
      response: "Grounded narration.",
      provider: "cloudflare-workers-ai",
      model: "@cf/test/narrator",
      evidenceImmutable: true,
    });
  });
  it("discovers stateless server capabilities", async () => {
    const response = await mcp("server/discover");
    expect(response.status).toBe(200);
    expect(response.body.result?.protocolVersion).toBe("2026-07-28");
  });

  it("publishes deterministic calculation tools", async () => {
    const response = await mcp("tools/list");
    const tools = response.body.result?.tools as Array<{
      name: string;
      annotations?: { readOnlyHint?: boolean; idempotentHint?: boolean };
    }>;
    expect(tools.map((tool) => tool.name)).toContain("consult_jyotishya");
    expect(tools.map((tool) => tool.name)).toContain(
      "calculate_south_indian_chart",
    );
    expect(tools.map((tool) => tool.name)).toContain("search_locations");
    expect(tools.map((tool) => tool.name)).toContain(
      "get_full_reading_context",
    );
    expect(tools.map((tool) => tool.name)).toContain(
      "calculate_gochara_from_known_place",
    );
    expect(tools.map((tool) => tool.name)).toContain("calculate_compatibility");
    expect(tools.map((tool) => tool.name)).toContain("get_panchanga");
    expect(tools.map((tool) => tool.name)).toContain("find_muhurta");
    expect(tools.map((tool) => tool.name)).toContain("calculate_doshas");
    expect(tools.map((tool) => tool.name)).toContain("calculate_kp");
    expect(tools.map((tool) => tool.name)).toContain("calculate_jaimini");
    expect(tools.map((tool) => tool.name)).toContain("calculate_varshaphal");
    expect(tools.map((tool) => tool.name)).toContain(
      "calculate_ayanamsa_chart",
    );
    expect(tools.map((tool) => tool.name)).toContain("list_rule_review_queue");
    expect(tools.map((tool) => tool.name)).toContain("get_rule_citations");
    expect(tools.map((tool) => tool.name)).toContain("detect_life_themes");
    expect(tools.map((tool) => tool.name)).toContain(
      "get_synthesis_validation_status",
    );
    expect(tools.map((tool) => tool.name)).toContain("find_marriage_windows");
    expect(tools.map((tool) => tool.name)).toContain("get_marriage_readiness");
    expect(tools.map((tool) => tool.name)).toContain("render_chart");
    expect(tools.map((tool) => tool.name)).toContain("generate_report_pdf");
    expect(tools.map((tool) => tool.name)).toContain("calculate_prashna");
    expect(tools.map((tool) => tool.name)).toContain("record_prashna_outcome");
    expect(tools.map((tool) => tool.name)).toContain("get_depth_analysis");
    expect(tools.map((tool) => tool.name)).toContain("fuse_timing");
    expect(tools.map((tool) => tool.name)).toContain("rectify_birth_time");
    expect(
      tools.every((tool) =>
        Boolean((tool as { inputSchema?: unknown }).inputSchema),
      ),
    ).toBe(true);
    expect(
      tools.every((tool) =>
        Boolean((tool as { outputSchema?: unknown }).outputSchema),
      ),
    ).toBe(true);
    expect(
      tools.find((tool) => tool.name === "consult_jyotishya")?.annotations,
    ).toMatchObject({ readOnlyHint: true, idempotentHint: true });
    expect(
      tools.find((tool) => tool.name === "record_prashna_outcome")?.annotations
        ?.readOnlyHint,
    ).toBe(false);
  });
  it("records Prashna outcomes through the private MCP confirmation token", async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [],
      env = {
        ENGINE_VERSION: "test",
        DB: {
          prepare: (sql: string) => {
            const statement = {
              values: [] as unknown[],
              bind(...values: unknown[]) {
                this.values = values;
                return this;
              },
              first: async () =>
                sql.startsWith("SELECT id FROM consultations")
                  ? { id: "consultation-1" }
                  : null,
              run: async () => {
                calls.push({ sql, values: statement.values });
                return { success: true };
              },
            };
            return statement;
          },
          batch: async (statements: Array<{ run: () => Promise<unknown> }>) =>
            Promise.all(statements.map((statement) => statement.run())),
        },
      },
      response = await mcp(
        "tools/call",
        {
          name: "record_prashna_outcome",
          arguments: {
            confirmationToken: "private-confirmation-token",
            outcome: "partly-confirmed",
            notes: "The interview moved forward.",
          },
        },
        env,
      ),
      result = response.body.result?.structuredContent as Record<
        string,
        unknown
      >;
    expect(result).toMatchObject({
      consultationId: "consultation-1",
      status: "recorded",
    });
    expect(calls.some(({ sql }) => sql.includes("consultation_outcomes"))).toBe(
      true,
    );
    expect(calls.some(({ sql }) => sql.includes("UPDATE consultations"))).toBe(
      true,
    );
  });

  it("resolves places for MCP clients without guessed coordinates", async () => {
    const response = await mcp("tools/call", {
      name: "search_locations",
      arguments: { query: "New Delhi" },
    });
    const structured = response.body.result?.structuredContent as {
      status: string;
      matches: Array<{ latitude: number; timezone: string }>;
    };
    expect(structured.status).toBe("resolved");
    expect(structured.matches[0]).toMatchObject({
      latitude: 28.6139,
      timezone: "Asia/Kolkata",
    });
  });

  it("runs consultation, depth and timing tools with versioned safety contracts", async () => {
    const prashna = await mcp("tools/call", {
        name: "calculate_prashna",
        arguments: {
          question: "Will this role move forward?",
          category: "career",
          place: "Hyderabad, Telangana, India",
        },
      }),
      prashnaResult = prashna.body.result?.structuredContent as any;
    expect(prashnaResult.schemaVersion).toBe("sahadeva-consultation-1");
    expect(prashnaResult.feedback.confirmationToken).not.toBe(
      prashnaResult.consultationId,
    );
    expect(prashnaResult.safety.prohibitedInferences).toContain(
      "guaranteed event",
    );
    const birth = {
        name: "Test",
        date: "1990-01-01",
        time: "12:00",
        place: "Hyderabad, Telangana, India",
        topic: "career",
      },
      depth = await mcp("tools/call", {
        name: "get_depth_analysis",
        arguments: birth,
      }),
      depthResult = depth.body.result?.structuredContent as any;
    expect(depthResult.additionalDashas.schemaVersion).toBe(
      "sahadeva-additional-dashas-2",
    );
    expect(depthResult.targetedLagnas.values).toHaveLength(2);
    const timing = await mcp("tools/call", {
        name: "fuse_timing",
        arguments: {
          ...birth,
          startIso: "2026-01-01T00:00:00.000Z",
          endIso: "2027-01-01T00:00:00.000Z",
        },
      }),
      timingResult = timing.body.result?.structuredContent as any;
    expect(timingResult.schemaVersion).toBe("sahadeva-timing-fusion-2");
    expect(timingResult.safety.prohibitedInferences).toContain(
      "guaranteed event",
    );
  });
  it("renders a shareable South Indian SVG through MCP", async () => {
    const response = await mcp("tools/call", {
      name: "render_chart",
      arguments: {
        name: "Shareable",
        date: "2000-01-01",
        time: "12:00",
        latitude: 51.4779,
        longitude: 0,
        timezone: "Etc/UTC",
      },
    });
    const body = response.body.result?.structuredContent as {
      format: string;
      svg: string;
    };
    expect(body.format).toBe("svg");
    expect(body.svg.match(/class="cell"/g)).toHaveLength(12);
  });
  it("applies fuzzy qualified-place resolution to calculation MCPs", async () => {
    const response = await mcp("tools/call", {
      name: "calculate_doshas",
      arguments: {
        name: "A",
        date: "2000-01-28",
        time: "08:05",
        place: "Ravulaplem, Andhra Pradesh, India",
      },
    });
    expect(response.body.error).toBeUndefined();
    expect(response.body.result?.structuredContent).toBeTruthy();
  });
  it("publishes honest synthesis validation status", async () => {
    const response = await mcp("tools/call", {
        name: "get_synthesis_validation_status",
        arguments: {},
      }),
      body = response.body.result?.structuredContent as {
        currentStatus: string;
        blindValidationCompleted: boolean;
        protocol: { minimumCases: number };
      };
    expect(body.currentStatus).toBe("seed-only");
    expect(body.blindValidationCompleted).toBe(false);
    expect(body.protocol.minimumCases).toBeGreaterThanOrEqual(30);
  });

  it("calculates from a known place and generates a full life report", async () => {
    const base = {
      name: "Report",
      date: "2000-01-28",
      time: "08:05",
      place: "Ravulapalem",
    };
    const chart = await mcp("tools/call", {
        name: "calculate_chart_from_known_place",
        arguments: base,
      }),
      chartBody = chart.body.result?.structuredContent as {
        input: { timezone: string };
        placements: Array<{ signName: string }>;
      };
    expect(chartBody.input.timezone).toBe("Asia/Kolkata");
    expect(chartBody.placements[0].signName).toBeTruthy();
    expect(
      (chart.body.result?.content as Array<{ text: string }>)[0].text.length,
    ).toBeLessThan(1_000);
    const report = await mcp("tools/call", {
        name: "generate_full_life_report",
        arguments: {
          ...base,
          latitude: 16.7607,
          longitude: 81.833,
          timezoneOffset: 5.5,
          timezone: "Asia/Kolkata",
          asOfDate: "2026-08-29",
        },
      }),
      reportBody = report.body.result?.structuredContent as {
        schemaVersion: string;
        plainLanguageReading: { sections: unknown[] };
        aspects: { planetToHouse: unknown[] };
        ashtakavarga: { sarvaBySign: unknown[] };
        sourceCoverage: { status: string };
      };
    expect(reportBody.schemaVersion).toBe("sahadeva-full-life-report-1");
    expect(reportBody.plainLanguageReading.sections.length).toBeGreaterThan(5);
    expect(reportBody.aspects.planetToHouse.length).toBeGreaterThan(0);
    expect(reportBody.ashtakavarga.sarvaBySign).toHaveLength(12);
    expect(reportBody.sourceCoverage.status).toBe("awaiting-reviewed-rules");
    expect(
      (report.body.result?.content as Array<{ text: string }>)[0].text.length,
    ).toBeLessThan(1_000);
    const section = await mcp("tools/call", {
        name: "get_full_life_report_section",
        arguments: {
          ...base,
          latitude: 16.7607,
          longitude: 81.833,
          timezoneOffset: 5.5,
          section: "synthesis",
          horizonYears: 1,
        },
      }),
      sectionBody = section.body.result?.structuredContent as {
        section: string;
      };
    expect(sectionBody.section).toBe("synthesis");
    const gochara = await mcp("tools/call", {
        name: "calculate_gochara_from_known_place",
        arguments: {
          date: "2026-08-29",
          time: "12:00",
          place: "Ravulapalem",
          natalLagnaSign: 10,
        },
      }),
      gocharaBody = gochara.body.result?.structuredContent as {
        resolvedPlace: { timezone: string };
        placements: unknown[];
      };
    expect(gocharaBody.resolvedPlace.timezone).toBe("Asia/Kolkata");
    expect(gocharaBody.placements.length).toBeGreaterThan(0);
  }, 15000);

  it("returns a compact one-call consultation within the MCP response budget", async () => {
    const response = await mcp("tools/call", {
        name: "consult_jyotishya",
        arguments: {
          name: "Consultation",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
          question: "What deserves attention in career now?",
          focus: "career",
          asOfDate: "2026-08-29",
          detail: "brief",
        },
      }),
      result = response.body.result as {
        content: Array<{ text: string }>;
        structuredContent: {
          schemaVersion: string;
          chartRef: string;
          priorities: unknown[];
          meta: { hiddenAiCalls: number; calculationMs: number };
        };
      };
    expect(response.body.error).toBeUndefined();
    expect(result.structuredContent.schemaVersion).toBe(
      "sahadeva-consultation-1",
    );
    expect(result.structuredContent.chartRef).toMatch(/^chart_[a-f0-9]{20}$/);
    expect(result.structuredContent.priorities).toHaveLength(3);
    expect(result.structuredContent.meta.hiddenAiCalls).toBe(0);
    expect(result.structuredContent.meta.calculationMs).toBeGreaterThanOrEqual(
      0,
    );
    expect(result.content[0].text).not.toContain('"advanced"');
    expect(JSON.stringify(response.body).length).toBeLessThan(20_000);
  }, 15000);

  it("keeps deterministic chart calculation available in production without a billing entitlement", async () => {
    const response = await mcp(
      "tools/call",
      {
        name: "calculate_chart_from_known_place",
        arguments: {
          name: "Native",
          date: "2024-09-17",
          time: "09:00",
          place: "Ambajipeta",
        },
      },
      { ENGINE_VERSION: "test", APP_ENV: "production" },
    );
    const chart = response.body.result?.structuredContent as {
      input: {
        place: string;
        latitude: number;
        longitude: number;
        timezone: string;
      };
    };
    expect(response.body.error).toBeUndefined();
    expect(chart.input).toMatchObject({
      place: "Ambajipeta, Dr. B. R. Ambedkar Konaseema, Andhra Pradesh, India",
      latitude: 16.5908,
      longitude: 81.9238,
      timezone: "Asia/Kolkata",
    });
  });

  it("lets the MCP host provide coordinates without invoking another AI", async () => {
    let aiCalls = 0;
    const env = {
        ENGINE_VERSION: "test",
        APP_ENV: "production",
        AI: { run: async () => void aiCalls++ },
      } as never,
      search = await mcp(
        "tools/call",
        {
          name: "search_locations",
          arguments: { query: "Remote Test Hamlet" },
        },
        env,
      ),
      searchBody = search.body.result?.structuredContent as {
        status: string;
        matches: unknown[];
      };
    expect(searchBody.status).toBe("not_found");
    expect(searchBody.matches).toHaveLength(0);

    const response = await mcp(
        "tools/call",
        {
          name: "calculate_chart_from_known_place",
          arguments: {
            name: "Native",
            date: "2024-09-17",
            time: "09:00",
            place: "Remote Test Hamlet",
            latitude: 16.6123,
            longitude: 81.9456,
            timezone: "Asia/Kolkata",
          },
        },
        env,
      ),
      chart = response.body.result?.structuredContent as {
        input: { latitude: number; longitude: number; timezone: string };
        locationResolution: {
          source: string;
          confidence: number;
          model: null;
        };
      };
    expect(response.body.error).toBeUndefined();
    expect(chart.input).toMatchObject({
      latitude: 16.6123,
      longitude: 81.9456,
      timezone: "Asia/Kolkata",
    });
    expect(chart.locationResolution).toEqual({
      source: "coordinates",
      confidence: 1,
      model: null,
    });
    expect(aiCalls).toBe(0);
  });

  it("resolves an unknown UI place through the Worker before calculation", async () => {
    const response = await app.request(
        "http://localhost/api/locations/resolve",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            place: "Remote UI Village",
            date: "2024-09-17",
            time: "09:00",
          }),
        },
        {
          ENGINE_VERSION: "test",
          CALC_RATE_LIMITER: { limit: async () => ({ success: true }) },
          AI_MODEL: "@cf/test/location-model",
          AI: {
            run: async () => ({
              response: JSON.stringify({
                resolved: true,
                canonicalName: "Remote UI Village",
                adminArea: "Example Province",
                country: "India",
                latitude: 16.6123,
                longitude: 81.9456,
                timezone: "Asia/Kolkata",
                confidence: 0.91,
              }),
            }),
          },
        } as never,
      ),
      body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      place: "Remote UI Village, Example Province, India",
      latitude: 16.6123,
      longitude: 81.9456,
      timezone: "Asia/Kolkata",
      source: "workers-ai",
      confidence: 0.91,
    });
  });

  it("calculates an auditable compatibility report from two known places", async () => {
    const response = await mcp("tools/call", {
      name: "calculate_compatibility",
      arguments: {
        bride: {
          name: "A",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
        },
        groom: {
          name: "B",
          date: "2001-06-10",
          time: "12:15",
          place: "New Delhi",
        },
      },
    });
    const body = response.body.result?.structuredContent as {
      ashtakoota: { maximum: number; components: unknown[] };
      kujaDosha: { bride: { references: unknown[] } };
    };
    expect(body.ashtakoota.maximum).toBe(36);
    expect(body.ashtakoota.components).toHaveLength(8);
    expect(body.kujaDosha.bride.references).toHaveLength(3);
    expect(
      (
        response.body.result?.structuredContent as {
          safety: { prohibitedInferences: string[] };
        }
      ).safety.prohibitedInferences,
    ).toContain("medical diagnosis");
  }, 15000);

  it("does not billing-gate compatibility in production", async () => {
    const person = {
      name: "A",
      date: "2000-01-28",
      time: "08:05",
      place: "Ravulapalem",
    };
    const response = await mcp(
      "tools/call",
      {
        name: "calculate_compatibility",
        arguments: { bride: person, groom: { ...person, name: "B" } },
      },
      { ENGINE_VERSION: "test", APP_ENV: "production" },
    );
    expect(response.body.error).toBeUndefined();
    expect(response.body.result?.structuredContent).toBeTruthy();
  }, 15000);

  it("bundles compatibility and structural marriage windows", async () => {
    const person = {
      name: "A",
      date: "2000-01-28",
      time: "08:05",
      place: "Surat",
    };
    const windows = await mcp("tools/call", {
      name: "find_marriage_windows",
      arguments: { ...person, startDate: "2026-08-29", years: 3 },
    });
    expect(windows.body.error).toBeUndefined();
    const readiness = await mcp("tools/call", {
      name: "get_marriage_readiness",
      arguments: {
        bride: person,
        groom: { ...person, name: "B" },
        startDate: "2026-08-29",
        years: 3,
      },
    });
    const body = readiness.body.result?.structuredContent as {
      schemaVersion: string;
      compatibility: { ashtakoota: unknown };
      marriageWindows: { bride: unknown };
    };
    expect(body.schemaVersion).toBe("sahadeva-marriage-readiness-1");
    expect(body.compatibility.ashtakoota).toBeTruthy();
    expect(body.marriageWindows.bride).toBeTruthy();
  }, 15000);

  it("accepts explicit coordinates when a birth place is outside the catalogue", async () => {
    const surat = {
      name: "Surat native",
      date: "2000-01-28",
      time: "08:05",
      place: "Surat, Gujarat",
      latitude: 21.1702,
      longitude: 72.8311,
      timezone: "Asia/Kolkata",
    };
    const doshas = await mcp("tools/call", {
      name: "calculate_doshas",
      arguments: surat,
    });
    expect(doshas.body.error).toBeUndefined();
    const compatibility = await mcp("tools/call", {
      name: "calculate_compatibility",
      arguments: { bride: surat, groom: { ...surat, name: "Other" } },
    });
    expect(compatibility.body.error).toBeUndefined();
    const panchanga = await mcp("tools/call", {
      name: "get_panchanga",
      arguments: {
        date: "2026-08-29",
        place: "Verified coordinates",
        latitude: 21.1702,
        longitude: 72.8311,
        timezone: "Asia/Kolkata",
      },
    });
    expect(panchanga.body.error).toBeUndefined();
    const muhurta = await mcp("tools/call", {
      name: "find_muhurta",
      arguments: {
        activity: "important_conversation",
        startDate: "2026-08-29",
        endDate: "2026-08-29",
        place: "Verified coordinates",
        latitude: 21.1702,
        longitude: 72.8311,
        timezone: "Asia/Kolkata",
      },
    });
    expect(muhurta.body.error).toBeUndefined();
    const themes = await mcp("tools/call", {
      name: "detect_life_themes",
      arguments: {
        ...surat,
        startDate: "2026-01-01",
        endDate: "2027-01-01",
      },
    });
    expect(themes.body.error).toBeUndefined();
  });

  it("returns location candidates as a tool result instead of a JSON-RPC error", async () => {
    const response = await mcp("tools/call", {
      name: "calculate_doshas",
      arguments: {
        name: "A",
        date: "2000-01-28",
        time: "08:05",
        place: "Hyderabad",
      },
    });
    expect(response.body.error).toBeUndefined();
    const result = response.body.result as {
      isError: boolean;
      structuredContent: { error: { candidates: unknown[] } };
    };
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.candidates.length).toBeGreaterThan(0);
  });

  it("returns full daily Panchanga windows with optional natal Bala", async () => {
    const response = await mcp("tools/call", {
      name: "get_panchanga",
      arguments: {
        date: "2026-08-29",
        place: "Ravulapalem",
        natal: {
          name: "A",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
        },
      },
    });
    const body = response.body.result?.structuredContent as {
      status: string;
      choghadiya: { day: unknown[]; night: unknown[] };
      hora: unknown[];
      personalized: { taraBala: unknown; chandraBala: unknown };
    };
    expect(body.status).toBe("computed");
    expect(body.choghadiya.day).toHaveLength(8);
    expect(body.choghadiya.night).toHaveLength(8);
    expect(body.hora).toHaveLength(24);
    expect(body.personalized.taraBala).toBeTruthy();
  });

  it("ranks auditable Muhurta windows and rejects medical scheduling", async () => {
    const response = await mcp("tools/call", {
        name: "find_muhurta",
        arguments: {
          activity: "business_start",
          startDate: "2026-08-29",
          endDate: "2026-08-29",
          place: "Ravulapalem",
          limit: 3,
        },
      }),
      body = response.body.result?.structuredContent as {
        windows: Array<{ score: number; reasons: unknown[] }>;
        rulebook: { reviewStatus: string };
      };
    expect(body.windows.length).toBeGreaterThan(0);
    expect(body.windows[0].reasons.length).toBeGreaterThan(4);
    expect(body.rulebook.reviewStatus).toBe("draft-unreviewed");
    const medical = await mcp("tools/call", {
      name: "find_muhurta",
      arguments: {
        activity: "surgery",
        startDate: "2026-08-29",
        endDate: "2026-08-29",
        place: "Ravulapalem",
      },
    });
    expect(medical.body.error).toBeTruthy();
  });

  it("returns evidence-first Dosha patterns with mitigation logic", async () => {
    const response = await mcp("tools/call", {
        name: "calculate_doshas",
        arguments: {
          name: "A",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
        },
      }),
      body = response.body.result?.structuredContent as {
        patterns: Array<{ id: string; cancellationsOrMitigations: unknown[] }>;
        rulebook: { reviewStatus: string };
      };
    expect(body.patterns).toHaveLength(4);
    expect(
      body.patterns.every((item) =>
        Array.isArray(item.cancellationsOrMitigations),
      ),
    ).toBe(true);
    expect(body.rulebook.reviewStatus).toBe("draft-unreviewed");
  });

  it("returns KP subdivisions while exposing validation boundaries", async () => {
    const response = await mcp("tools/call", {
        name: "calculate_kp",
        arguments: {
          name: "A",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
        },
      }),
      body = response.body.result?.structuredContent as {
        planets: Array<{
          starLord: string;
          subLord: string;
          subSubLord: string;
        }>;
        cusps: { status: string };
        zodiac: { kpAyanamsa: { status: string } };
      };
    expect(body.planets).toHaveLength(10);
    expect(body.planets[0].subLord).toBeTruthy();
    expect(body.cusps.status).toBe("unavailable");
    expect(body.zodiac.kpAyanamsa.status).toBe("unavailable-unvalidated");
  });

  it("returns Jaimini Karakas, Arudhas and Rashi Drishti", async () => {
    const response = await mcp("tools/call", {
        name: "calculate_jaimini",
        arguments: {
          name: "A",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
        },
      }),
      body = response.body.result?.structuredContent as {
        charaKarakas: {
          sevenKaraka: unknown[];
          eightKarakaWithReversedRahu: unknown[];
        };
        arudhaPadas: { values: unknown[] };
        rashiDrishti: { signMatrix: unknown[] };
        charaDasha: { status: string };
      };
    expect(body.charaKarakas.sevenKaraka).toHaveLength(7);
    expect(body.charaKarakas.eightKarakaWithReversedRahu).toHaveLength(8);
    expect(body.arudhaPadas.values).toHaveLength(12);
    expect(body.rashiDrishti.signMatrix).toHaveLength(12);
    expect(body.charaDasha.status).toBe("unavailable-unreviewed");
  });

  it("returns an exact solar-return Varshaphal structure", async () => {
    const response = await mcp("tools/call", {
        name: "calculate_varshaphal",
        arguments: {
          name: "A",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
          targetYear: 2026,
        },
      }),
      body = response.body.result?.structuredContent as {
        solarReturn: { errorArcseconds: number };
        subject: { completedYears: number };
        muntha: { sign: number };
        tajika: { sahams: { status: string } };
      };
    expect(body.solarReturn.errorArcseconds).toBeLessThan(0.01);
    expect(body.subject.completedYears).toBe(26);
    expect(body.muntha.sign).toBeTypeOf("number");
    expect(body.tajika.sahams.status).toBe("unavailable-unreviewed");
  });

  it("projects selectable ayanamsas and publishes the special-aspect contract", async () => {
    const response = await mcp("tools/call", {
        name: "calculate_ayanamsa_chart",
        arguments: {
          name: "A",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
          ayanamsa: "krishnamurti",
        },
      }),
      body = response.body.result?.structuredContent as {
        selected: { id: string; validation: string };
        placements: unknown[];
        aspects: {
          matrix: { Mars: number[]; Jupiter: number[]; Saturn: number[] };
          validation: { mars: boolean; jupiter: boolean; saturn: boolean };
        };
      };
    expect(body.selected.id).toBe("krishnamurti");
    expect(body.selected.validation).toBe("comparison-offset-unvalidated");
    expect(body.placements).toHaveLength(10);
    expect(body.aspects.matrix.Mars).toEqual([4, 7, 8]);
    expect(body.aspects.matrix.Jupiter).toEqual([5, 7, 9]);
    expect(body.aspects.matrix.Saturn).toEqual([3, 7, 10]);
    expect(body.aspects.validation).toEqual({
      mars: true,
      jupiter: true,
      saturn: true,
    });
  });

  it("detects Dasha-activated life themes without legal-event predictions", async () => {
    const response = await mcp("tools/call", {
        name: "detect_life_themes",
        arguments: {
          name: "A",
          date: "1978-01-01",
          time: "12:00",
          place: "Ravulapalem",
          startDate: "2004-01-01",
          endDate: "2012-01-01",
        },
      }),
      body = response.body.result?.structuredContent as {
        patterns: unknown[];
        periods: { themes: { confidence: { status: string } }[] }[];
        sourceCoverage: { status: string };
        safety: { prohibitedInferences: string[] };
      };
    expect(body.patterns.length).toBeGreaterThan(0);
    expect(body.periods.length).toBeGreaterThan(0);
    expect(body.periods[0].themes[0].confidence.status).toBe(
      "heuristic-not-calibrated",
    );
    expect(body.sourceCoverage.status).toBe("awaiting-reviewed-rules");
    expect(body.safety.prohibitedInferences).toContain(
      "arrest or imprisonment",
    );
  });

  it("separates corpus cataloguing from reviewed knowledge", async () => {
    const row = {
      sources: 215,
      catalogued_assets: 215,
      usable_assets: 106,
      assets_needing_repair: 2,
      assets_needing_retranscription: 107,
      restricted_assets: 11,
      passages: 0,
      nominally_approved_rules: 0,
      publishable_rules: 0,
      active_reviewers: 0,
      approved_terms: 0,
      terms_awaiting_review: 38,
      open_contradictions: 0,
    };
    const env = {
      ENGINE_VERSION: "test",
      DB: { prepare: () => ({ first: async () => row }) },
    } as never;
    const response = await app.request(
      "http://localhost/api/knowledge/status",
      {},
      env,
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.corpusStatus).toBe("catalogued_not_approved");
    expect(body.readiness).toBe("not_reviewed");
    expect(body.catalogued_assets).toBe(215);
    expect(body.publicationRule).toContain("do not mean approved");
  });

  it("calculates a chart through MCP", async () => {
    const response = await mcp("tools/call", {
      name: "calculate_south_indian_chart",
      arguments: {
        name: "Reference",
        date: "2000-01-01",
        time: "12:00",
        place: "Greenwich",
        latitude: 51.4779,
        longitude: 0,
        timezoneOffset: 0,
      },
    });
    const structured = response.body.result?.structuredContent as {
      placements: Array<{
        signName?: string;
        house?: number;
        dignity?: string;
        combust?: boolean;
      }>;
    };
    expect(structured.placements).toHaveLength(10);
    expect(
      (
        structured as unknown as {
          engine: { zodiac: { signIndexBase: number } };
        }
      ).engine.zodiac.signIndexBase,
    ).toBe(0);
    expect(
      (structured.placements[0] as { signName?: string }).signName,
    ).toBeTruthy();
    expect(structured.placements[0].house).toBeTypeOf("number");
    expect(structured.placements[0].dignity).toBeTypeOf("string");
    expect(structured.placements[0].combust).toBeTypeOf("boolean");
  });

  it("supports initialize, ping, notifications, and protocol errors", async () => {
    expect((await mcp("initialize")).body.result?.protocolVersion).toBe(
      "2025-11-25",
    );
    expect((await mcp("ping")).status).toBe(200);
    expect((await mcp("missing/method")).body.error).toBeTruthy();
    const notification = await app.request(
      "http://localhost/mcp",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      },
      { ENGINE_VERSION: "test" } as never,
    );
    expect(notification.status).toBe(202);
    expect(await notification.text()).toBe("");
    const malformed = await app.request(
      "http://localhost/mcp",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      },
      { ENGINE_VERSION: "test" } as never,
    );
    expect(malformed.status).toBe(400);
    expect(
      ((await malformed.json()) as { error: { code: number } }).error.code,
    ).toBe(-32700);
  });

  it("publishes guided MCP prompts and workflow resources", async () => {
    const prompts = await mcp("prompts/list"),
      resources = await mcp("resources/list");
    expect((prompts.body.result?.prompts as unknown[]).length).toBe(6);
    expect((resources.body.result?.resources as unknown[]).length).toBe(4);
    const prompt = await mcp("prompts/get", { name: "full_life_reading" });
    expect(JSON.stringify(prompt.body.result)).toContain(
      "generate_full_life_report",
    );
    const prashnaPrompt = await mcp("prompts/get", {
      name: "prashna_consultation",
    });
    expect(JSON.stringify(prashnaPrompt.body.result)).toContain(
      "record_prashna_outcome",
    );
  });

  it("publishes only approved rule citations and exposes unresolved review work", async () => {
    const env = {
        ENGINE_VERSION: "test",
        DB: {
          prepare: (sql: string) => ({
            bind() {
              return this;
            },
            all: async () =>
              sql.includes("JOIN publishable_rules")
                ? {
                    results: [
                      {
                        source_key: "approved:key",
                        rule_id: "r1",
                        passage_id: "p1",
                        original_text: "approved excerpt",
                      },
                    ],
                  }
                : {
                    results: [
                      {
                        source_key: "draft:key",
                        module: "muhurta",
                        rule_status: "unlinked",
                        publishable: 0,
                        next_action: "needs-source-passage",
                      },
                    ],
                  },
          }),
        },
      } as never,
      body = (method: string, params: unknown) =>
        JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      headers = {
        "content-type": "application/json",
        "MCP-Protocol-Version": "2026-07-28",
      };
    const queue = await app.request(
        "http://localhost/mcp",
        {
          method: "POST",
          headers,
          body: body("tools/call", {
            name: "list_rule_review_queue",
            arguments: { module: "muhurta" },
          }),
        },
        env,
      ),
      queueJson = (await queue.json()) as {
        result: { structuredContent: { summary: { unlinked: number } } };
      };
    expect(queueJson.result.structuredContent.summary.unlinked).toBe(1);
    const citations = await app.request(
        "http://localhost/mcp",
        {
          method: "POST",
          headers,
          body: body("tools/call", {
            name: "get_rule_citations",
            arguments: { sourceKeys: ["approved:key", "missing:key"] },
          }),
        },
        env,
      ),
      citationJson = (await citations.json()) as {
        result: {
          structuredContent: {
            citations: unknown[];
            unresolvedSourceKeys: string[];
          };
        };
      };
    expect(citationJson.result.structuredContent.citations).toHaveLength(1);
    expect(citationJson.result.structuredContent.unresolvedSourceKeys).toEqual([
      "missing:key",
    ]);
  });

  it("returns structured invalid-argument and unknown-tool errors", async () => {
    const invalid = await mcp("tools/call", {
        name: "calculate_south_indian_chart",
        arguments: {},
      }),
      unknown = await mcp("tools/call", {
        name: "does_not_exist",
        arguments: {},
      });
    expect((invalid.body.error as { code: number }).code).toBe(-32602);
    expect((unknown.body.error as { code: number }).code).toBe(-32602);
  });

  it("enforces mcp:calculate on authenticated requests", async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
      headers = {
        "content-type": "application/json",
        authorization: "Bearer sah_test",
      };
    const denied = await app.request(
      "http://localhost/mcp",
      { method: "POST", headers, body },
      authenticatedEnv(["charts:read"]),
    );
    expect(denied.status).toBe(403);
    const allowed = await app.request(
      "http://localhost/mcp",
      { method: "POST", headers, body },
      authenticatedEnv(["mcp:calculate"]),
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("x-sahadeva-key")).toBe("sah_example");
    const limited = await app.request(
      "http://localhost/mcp",
      { method: "POST", headers, body },
      authenticatedEnv(["mcp:calculate"], 2),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
  });
});
