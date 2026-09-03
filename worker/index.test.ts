import { describe, expect, it } from "vitest";
import { app } from "./index";

async function mcp(method: string, params?: unknown, env?: unknown) {
  const response = await app.request(
    "http://localhost/mcp",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "MCP-Protocol-Version": "2025-11-25",
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

  it("gives focused web chat the shared judgment ledger and practitioner reasoning order", async () => {
    let systemPrompt = "";
    const response = await app.request(
      "http://localhost/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: "Ananya",
            date: "2000-01-28",
            time: "08:05",
            place: "Ravulapalem",
            latitude: 16.6123,
            longitude: 81.9456,
            timezone: "Asia/Kolkata",
            timezoneOffset: 5.5,
            language: "en",
            focus: "career",
            birthTimeAccuracyMinutes: 5,
          },
          messages: [
            { role: "user", content: "Give me a detailed career reading." },
          ],
        }),
      },
      {
        ENGINE_VERSION: "test",
        AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
        AI_CHAT_MODEL: "@cf/test/chat",
        AI: {
          run: async (
            _model: string,
            input: { messages?: Array<{ role: string; content: string }> },
          ) => {
            systemPrompt = input.messages?.[0]?.content || "";
            return { response: "Detailed grounded reading." };
          },
        },
      } as never,
    );
    const body = (await response.json()) as { response?: string };
    expect(response.status).toBe(200);
    expect(body.response).toBe("Detailed grounded reading.");
    expect(systemPrompt).toContain("practitioner sequence");
    expect(systemPrompt).toContain("focusedJudgment");
    expect(systemPrompt).toContain('"topic":"career"');
    expect(systemPrompt).toContain("supportingEvidence");
    expect(systemPrompt).toContain("opposingEvidence");
    expect(systemPrompt).toContain("700-1200 words");
    expect(systemPrompt).toContain("Direct answer in ordinary daily-life language");
    expect(systemPrompt).toContain("then Technical chart details");
    expect(systemPrompt).toContain("code has already done 93% of the factual work");
    expect(systemPrompt).toContain('"version":"code-led-conversation-1"');
    expect(systemPrompt).toContain('"factualWorkShare":93');
    expect(systemPrompt).toContain('"consultationProtocol"');
    expect(systemPrompt).toContain("listen, clarify once when needed, read the evidence, guide");
  }, 15000);
  it("routes explicit web full-profile requests through the complete MCP-equivalent dossier", async () => {
    let systemPrompt = "",
      maxTokens = 0;
    const response = await app.request(
      "http://localhost/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: "Raj Karan",
            date: "1987-11-28",
            time: "07:55",
            place: "Suryapet",
            latitude: 17.1405,
            longitude: 79.62,
            timezone: "Asia/Kolkata",
            timezoneOffset: 5.5,
            language: "te",
            focus: "general",
            birthTimeAccuracyMinutes: 5,
          },
          mode: { fullProfile: true },
          messages: [{ role: "user", content: "సంప్రదింపును ప్రారంభించండి" }],
        }),
      },
      {
        ENGINE_VERSION: "test",
        AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
        AI_CHAT_MODEL: "@cf/test/chat",
        AI: {
          run: async (
            _model: string,
            input: {
              messages?: Array<{ content: string }>;
              max_tokens?: number;
            },
          ) => {
            systemPrompt = input.messages?.[0]?.content || "";
            maxTokens = input.max_tokens || 0;
            return { response: "Complete grounded dossier." };
          },
        },
      } as never,
    );
    expect(response.status).toBe(200);
    expect(systemPrompt).toContain("explicit complete-profile request");
    expect(systemPrompt).toContain('"mode":"complete-profile"');
    expect(systemPrompt).toContain('"completeLifeReading"');
    expect(systemPrompt).toContain('"doshas"');
    expect(systemPrompt).toContain('"advancedAnchors"');
    expect(systemPrompt).toContain("What this means in daily life");
    expect(systemPrompt).toContain("End with a clearly labelled `## Technical chart details`");
    expect(maxTokens).toBe(7000);
    const payload = (await response.json()) as {
      summary?: {
        profileRef?: string;
        readingMode?: string;
        everyday?: { dailyLife?: { items?: unknown[]; questions?: string[] } };
        provenance?: { calculationShare?: number; narrationShare?: number; evidenceImmutable?: boolean };
        fullProfile?: {
          requiredSections?: string[];
          timeline?: unknown[];
          nextQuestions?: string[];
        };
      };
    };
    expect(payload.summary?.profileRef).toMatch(/^chart_/);
    expect(payload.summary?.readingMode).toBe("complete-profile");
    expect(payload.summary?.everyday?.dailyLife?.items).toHaveLength(3);
    expect(payload.summary?.provenance).toEqual({ calculationShare: 93, narrationShare: 7, contract: "code-led-conversation-1", evidenceImmutable: true });
    expect(
      payload.summary?.fullProfile?.requiredSections?.length,
    ).toBeGreaterThanOrEqual(14);
    expect(payload.summary?.fullProfile?.timeline?.length).toBeGreaterThan(0);
    expect(payload.summary?.fullProfile?.nextQuestions?.length).toBe(4);
  }, 30000);
  it("advertises one stable protocol revision everywhere", async () => {
    const response = await mcp("server/discover");
    expect(response.status).toBe(200);
    expect(response.body.result?.protocolVersion).toBe("2025-11-25");
  });

  it("publishes a compact, high-signal deterministic tool surface", async () => {
    const response = await mcp("tools/list");
    const tools = response.body.result?.tools as Array<{
      name: string;
      annotations?: { readOnlyHint?: boolean; idempotentHint?: boolean };
    }>;
    expect(tools.map((tool) => tool.name)).toContain("consult_jyotishya");
    expect(tools.map((tool) => tool.name)).toContain(
      "assess_prediction_readiness",
    );
    expect(tools.map((tool) => tool.name)).toContain("analyze_lal_kitab");
    expect(tools.map((tool) => tool.name)).toContain(
      "explore_lal_kitab_sources",
    );
    expect(tools.map((tool) => tool.name)).toContain("audit_chart_calculation");
    expect(tools.map((tool) => tool.name)).toContain("analyze_chart_topic");
    expect(tools.map((tool) => tool.name)).toContain("analyze_house");
    expect(tools.map((tool) => tool.name)).toContain("get_natal_panchanga");
    expect(tools.map((tool) => tool.name)).toContain("suggest_safe_practice");
    expect(tools.map((tool) => tool.name)).toContain(
      "calculate_devata_profile",
    );
    expect(tools.map((tool) => tool.name)).toContain("analyze_remedies");
    expect(tools.map((tool) => tool.name)).toContain("search_locations");
    expect(tools.map((tool) => tool.name)).toContain(
      "calculate_gochara_from_known_place",
    );
    expect(tools.map((tool) => tool.name)).toContain("calculate_compatibility");
    expect(tools.map((tool) => tool.name)).toContain(
      "calculate_relationship_compatibility",
    );
    expect(tools.map((tool) => tool.name)).toContain("get_panchanga");
    expect(tools.map((tool) => tool.name)).toContain("find_muhurta");
    expect(tools.map((tool) => tool.name)).toContain("calculate_doshas");
    expect(tools.map((tool) => tool.name)).toContain("find_marriage_windows");
    expect(tools.map((tool) => tool.name)).toContain("get_marriage_readiness");
    expect(tools.map((tool) => tool.name)).toContain("render_chart");
    expect(tools.map((tool) => tool.name)).toContain("generate_report_pdf");
    expect(tools.map((tool) => tool.name)).toContain("calculate_prashna");
    expect(tools.map((tool) => tool.name)).toContain("record_prashna_outcome");
    expect(tools.map((tool) => tool.name)).toContain("get_depth_analysis");
    expect(tools.map((tool) => tool.name)).toContain("fuse_timing");
    expect(tools.map((tool) => tool.name)).toContain("rectify_birth_time");
    expect(tools.map((tool) => tool.name)).toContain("search_reviewed_rules");
    expect(tools.map((tool) => tool.name)).toContain("search_source_passages");
    expect(tools.map((tool) => tool.name)).toContain("compare_traditions");
    expect(tools.map((tool) => tool.name)).toContain("audit_prediction_claim");
    expect(tools.map((tool) => tool.name)).toContain(
      "record_consultation_outcome",
    );
    expect(tools.map((tool) => tool.name)).toContain("get_validation_report");
    expect(tools).toHaveLength(55);
    expect(tools.map((tool) => tool.name)).not.toContain(
      "calculate_south_indian_chart",
    );
    expect(response.body.result).not.toHaveProperty("ttlMs");
    expect(response.body.result).not.toHaveProperty("cacheScope");
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

  it("reports honest prediction readiness and keeps Lal Kitab source-only", async () => {
    const response = await mcp("tools/call", {
      name: "assess_prediction_readiness",
      arguments: {},
    });
    const result = response.body.result?.structuredContent as {
      schemaVersion: string;
      decision: {
        lalKitabPrediction: string;
        calibratedEventProbability: string;
      };
      traditions: Array<{ id: string; status: string }>;
    };
    expect(result.schemaVersion).toBe("sahadeva-prediction-readiness-1");
    expect(result.decision.lalKitabPrediction).toBe("blocked");
    expect(result.decision.calibratedEventProbability).toBe("blocked");
    expect(
      result.traditions.find((item) => item.id === "lal-kitab")?.status,
    ).toBe("source-only");
  });

  it("audits claims and keeps tradition ledgers separate", async () => {
    const audit = await mcp("tools/call", {
      name: "audit_prediction_claim",
      arguments: {
        claim: "A guaranteed event",
        harmClass: "prohibited-output",
      },
    });
    expect(
      (audit.body.result?.structuredContent as { decision: { action: string } })
        .decision.action,
    ).toBe("abstain");
    const comparison = await mcp("tools/call", {
      name: "compare_traditions",
      arguments: {
        ledgers: [
          {
            tradition: "parashari",
            status: "reviewed",
            supportingEvidence: [],
            opposingEvidence: [],
            unresolvedSources: [],
            limitations: [],
          },
          {
            tradition: "lal-kitab",
            status: "source-linked",
            supportingEvidence: [],
            opposingEvidence: [],
            unresolvedSources: ["lk:x"],
            limitations: [],
          },
        ],
      },
    });
    expect(
      (comparison.body.result?.structuredContent as { traditions: unknown[] })
        .traditions,
    ).toHaveLength(2);
    expect(JSON.stringify(comparison.body.result)).toContain(
      "never inferred by averaging",
    );
  });

  it("locates Lal Kitab house sources without publishing predictions", async () => {
    const response = await mcp("tools/call", {
      name: "analyze_lal_kitab",
      arguments: {
        name: "Lal Kitab MCP",
        date: "2000-01-28",
        time: "08:05",
        place: "Ravulapalem, Andhra Pradesh, India",
      },
    });
    const result = response.body.result?.structuredContent as {
      schemaVersion: string;
      placements: Array<{ interpretation: { status: string } }>;
      tradition: { mixingAllowed: boolean };
      controlledDisclosurePolicy: { retention: string };
      safety: { status: string };
    };
    expect(result.schemaVersion).toBe("sahadeva-lal-kitab-structure-1");
    expect(result.placements).toHaveLength(9);
    expect(
      result.placements.every(
        (item) => item.interpretation.status === "withheld-source-only",
      ),
    ).toBe(true);
    expect(result.tradition.mixingAllowed).toBe(false);
    expect(result.controlledDisclosurePolicy.retention).toContain(
      "All source claims are retained",
    );
    expect(result.safety.status).toBe("source-inspection-only");
  });

  it("shares the complete Lal Kitab source catalog through MCP and web", async () => {
    const rpc = await mcp("tools/call", {
        name: "explore_lal_kitab_sources",
        arguments: {},
      }),
      http = await app.request("http://localhost/api/lal-kitab/catalog"),
      rpcResult = rpc.body.result?.structuredContent as {
        coverage: { planetHouseSections: number };
        families: unknown[];
        policy: { retentionPolicy: string };
      },
      webResult = (await http.json()) as typeof rpcResult;
    expect(http.status).toBe(200);
    expect(rpcResult.coverage.planetHouseSections).toBe(108);
    expect(rpcResult.families).toHaveLength(23);
    expect(webResult).toEqual(rpcResult);
    expect(rpcResult.policy.retentionPolicy).toContain("Preserve");
  });

  it("audits calculation certification before interpretation", async () => {
    const response = await mcp("tools/call", {
      name: "audit_chart_calculation",
      arguments: {
        name: "Audit MCP",
        date: "2000-01-28",
        time: "08:05",
        place: "Ravulapalem, Andhra Pradesh, India",
      },
    });
    const result = response.body.result?.structuredContent as {
      schemaVersion: string;
      engine: { productionCertified: boolean };
      decision: { safeForReviewedPrediction: boolean };
      boundaryAudit: unknown[];
    };
    expect(result.schemaVersion).toBe("sahadeva-calculation-audit-1");
    expect(result.engine.productionCertified).toBe(false);
    expect(result.decision.safeForReviewedPrediction).toBe(false);
    expect(result.boundaryAudit).toHaveLength(4);
  });

  it("serves the same Lal Kitab and calculation-audit contracts to the web", async () => {
    const birth = {
        name: "Web methods",
        date: "2000-01-28",
        time: "08:05",
        place: "Ravulapalem, Andhra Pradesh, India",
        latitude: 16.1026,
        longitude: 81.7634,
        timezone: "Asia/Kolkata",
        timezoneOffset: 5.5,
        language: "en",
        methodology: "parashari",
        focus: "general",
        birthTimeAccuracyMinutes: 5,
      },
      env = {
        ENGINE_VERSION: "test",
        CALC_RATE_LIMITER: { limit: async () => ({ success: true }) },
      } as never,
      request = (path: string) =>
        app.request(
          `http://localhost${path}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(birth),
          },
          env,
        ),
      [lalResponse, auditResponse] = await Promise.all([
        request("/api/lal-kitab"),
        request("/api/calculation-audit"),
      ]),
      lal = (await lalResponse.json()) as {
        schemaVersion: string;
        placements: unknown[];
      },
      audit = (await auditResponse.json()) as {
        schemaVersion: string;
        decision: object;
      };
    expect(lalResponse.status).toBe(200);
    expect(auditResponse.status).toBe(200);
    expect(lal.schemaVersion).toBe("sahadeva-lal-kitab-structure-1");
    expect(lal.placements).toHaveLength(9);
    expect(audit.schemaVersion).toBe("sahadeva-calculation-audit-1");
    expect(audit.decision).toBeTruthy();
  });

  it("calculates guiding Devata anchors and a gated source-grounded remedy protocol", async () => {
    const birth = {
      name: "Devata test",
      date: "2000-01-28",
      time: "08:05",
      place: "Ravulapalem, Andhra Pradesh, India",
      birthTimeAccuracyMinutes: 5,
    };
    const devata = await mcp("tools/call", {
        name: "calculate_devata_profile",
        arguments: birth,
      }),
      devataResult = devata.body.result?.structuredContent as {
        schemaVersion: string;
        lineage: { selected: string; mixingAllowed: boolean };
        ishtaDevata: { houseOffset: number; deityCandidates: string[] };
        dharmaDevata: { houseOffset: number };
        palanaDevata: { houseOffset: number };
        birthTimeSensitivity: { sensitive: boolean };
        safety: { notACommand: boolean };
      };
    expect(devataResult.schemaVersion).toBe("sahadeva-devata-profile-2");
    expect(devataResult.lineage).toMatchObject({
      selected: "rath-eight-karaka-reversed-rahu",
      mixingAllowed: false,
    });
    expect(devataResult.ishtaDevata.houseOffset).toBe(12);
    expect(devataResult.dharmaDevata.houseOffset).toBe(9);
    expect(devataResult.palanaDevata.houseOffset).toBe(6);
    expect(devataResult.ishtaDevata.deityCandidates.length).toBeGreaterThan(0);
    expect(devataResult.birthTimeSensitivity.sensitive).toBe(true);
    expect(devataResult.safety.notACommand).toBe(true);
    const remedies = await mcp("tools/call", {
        name: "analyze_remedies",
        arguments: {
          ...birth,
          topic: "spirituality",
          preferences: {
            beliefMode: "spiritual",
            tradition: "family tradition",
            maximumBurden: "minimal",
            maximumCost: "free",
            allowPrayer: true,
            allowCharity: true,
          },
        },
      }),
      remedyResult = remedies.body.result?.structuredContent as {
        schemaVersion: string;
        traditionalChartRemedies: Array<{
          family: string;
          publicationStatus: string;
        }>;
        sourceCoverage: { verbatimMantrasPublished: boolean };
        chartDiagnosis: { devataProfile: { schemaVersion: string } };
      };
    expect(remedyResult.schemaVersion).toBe("sahadeva-remedy-protocol-4");
    expect(
      remedyResult.traditionalChartRemedies.map((item) => item.family),
    ).toEqual(["muhurta", "charity", "devata"]);
    expect(
      remedyResult.traditionalChartRemedies.every(
        (item) => item.publicationStatus.length > 0,
      ),
    ).toBe(true);
    expect(remedyResult.sourceCoverage.verbatimMantrasPublished).toBe(false);
    expect(remedyResult.chartDiagnosis.devataProfile.schemaVersion).toBe(
      "sahadeva-devata-profile-2",
    );
  }, 30000);
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

  it("returns a comprehensive one-call consultation within a bounded MCP response budget", async () => {
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
          remedyPreferences: {
            beliefMode: "spiritual",
            maximumBurden: "minimal",
            maximumCost: "free",
            allowPrayer: true,
            allowCharity: true,
          },
        },
      }),
      result = response.body.result as {
        content: Array<{ text: string }>;
        structuredContent: {
          schemaVersion: string;
          chartRef: string;
          responseProfile: string;
          profileLifecycle: {
            mode: string;
            profileRef: string;
            verifiedAgainstBirthData: boolean;
          };
          priorities: unknown[];
          answerContract: {
            userQuestion: string;
            instruction: string;
            responseShape: string[];
          };
          consultationAnalysis: {
            inferredTopic: string;
            enginesRun: string[];
            relevantVargas: { topic: string; judgment: string };
            timing: { promise: { score: number }; windows: unknown[] };
          };
          verification: {
            status: string;
            checks: Array<{ id: string; status: string }>;
            contradictions: string[];
          };
          coverage: { completeForQuestion: boolean; followUpNeeded: string[] };
          completeLifeReading: {
            education: unknown;
            employment: unknown;
            businessAndIndependentWork: unknown;
            moneyAndResources: unknown;
            loveAndRelationships: unknown;
            marriageAndCommitment: unknown;
            healthRoutinesAndResilience: {
              prohibitedConclusions: string[];
            };
            familyHomeAndProperty: unknown;
            childrenMentoringAndCreativity: unknown;
            spiritualityMeaningAndPractice: unknown;
            domainCoverage: { covered: string[] };
          };
          remediesAndPracticalSupport: {
            practicalSupports: unknown[];
            traditionalRemedies: unknown[];
            traditionalRemedyStatus: string;
            prohibited: string[];
          };
          crossTraditionProfile: {
            selectedTraditions: string[];
            comparison: { traditions: unknown[]; synthesisPolicy: string };
          };
          crossTraditionRemedies: {
            traditions: Array<{
              tradition: string;
              status: string;
              protocol: unknown;
            }>;
          };
          mcpSecurity: { architecture: string };
          meta: { hiddenAiCalls: number; calculationMs: number };
        };
      };
    expect(response.body.error).toBeUndefined();
    expect(result.structuredContent.schemaVersion).toBe(
      "sahadeva-consultation-1",
    );
    expect(result.structuredContent.chartRef).toMatch(/^chart_[a-f0-9]{20}$/);
    expect(result.structuredContent.responseProfile).toBe("full-profile");
    expect(result.structuredContent.profileLifecycle).toMatchObject({
      mode: "first-reading",
      verifiedAgainstBirthData: true,
    });
    expect(result.structuredContent.priorities).toHaveLength(3);
    expect(result.structuredContent.answerContract.userQuestion).toBe(
      "What deserves attention in career now?",
    );
    expect(result.structuredContent.answerContract.instruction).toContain(
      "exact question",
    );
    expect(result.content[0].text).toContain(
      "Question to answer: What deserves attention in career now?",
    );
    expect(result.structuredContent.consultationAnalysis.inferredTopic).toBe(
      "career",
    );
    expect(result.structuredContent.consultationAnalysis.enginesRun).toContain(
      "relevant-varga-synthesis",
    );
    expect(result.structuredContent.consultationAnalysis.enginesRun).toContain(
      "timing-fusion",
    );
    expect(
      result.structuredContent.consultationAnalysis.relevantVargas.topic,
    ).toBe("career");
    expect(
      result.structuredContent.consultationAnalysis.timing.promise.score,
    ).toBeTypeOf("number");
    expect(result.structuredContent.verification.status).toBe("completed");
    expect(
      result.structuredContent.verification.checks.map((check) => check.id),
    ).toEqual(
      expect.arrayContaining([
        "location",
        "cross-varga",
        "natal-promise-before-timing",
        "birth-time-sensitivity",
        "reviewed-textual-grounding",
      ]),
    );
    expect(result.structuredContent.coverage.completeForQuestion).toBe(true);
    expect(
      result.structuredContent.completeLifeReading.domainCoverage.covered,
    ).toEqual(
      expect.arrayContaining([
        "education",
        "employment",
        "business",
        "money",
        "love",
        "marriage",
        "health routines",
        "home and property",
        "children and mentoring",
        "spirituality",
      ]),
    );
    expect(
      result.structuredContent.completeLifeReading.healthRoutinesAndResilience
        .prohibitedConclusions,
    ).toContain("medical diagnosis");
    expect(
      result.structuredContent.remediesAndPracticalSupport.practicalSupports,
    ).toHaveLength(3);
    expect(
      result.structuredContent.remediesAndPracticalSupport.traditionalRemedies,
    ).toEqual([]);
    expect(
      result.structuredContent.remediesAndPracticalSupport.prohibited,
    ).toContain("guaranteed remedies");
    expect(
      result.structuredContent.crossTraditionProfile.selectedTraditions,
    ).toEqual(["parashari", "jaimini", "kp", "lal-kitab"]);
    expect(
      result.structuredContent.crossTraditionProfile.comparison.traditions,
    ).toHaveLength(4);
    expect(
      result.structuredContent.crossTraditionRemedies.traditions.find(
        (item) => item.tradition === "lal-kitab",
      )?.protocol,
    ).toBeNull();
    expect(
      result.structuredContent.crossTraditionRemedies.traditions.find(
        (item) => item.tradition === "parashari",
      )?.status,
    ).toBe("preference-filtered-protocol");
    expect(result.structuredContent.mcpSecurity.architecture).toContain(
      "zero-source-export",
    );
    expect(result.structuredContent.meta.hiddenAiCalls).toBe(0);
    expect(result.structuredContent.meta.calculationMs).toBeGreaterThanOrEqual(
      0,
    );
    expect(result.content[0].text).not.toContain('"advanced"');
    // The master consultation covers every major life domain, four separate
    // tradition ledgers and preference-filtered remedies while remaining
    // bounded for normal MCP context windows.
    expect(JSON.stringify(response.body).length).toBeLessThan(48_000);

    const followUp = await mcp("tools/call", {
        name: "consult_jyotishya",
        arguments: {
          name: "Ananya",
          date: "2000-01-28",
          time: "08:05",
          place: "Ravulapalem",
          question: "When should I revisit a job change?",
          focus: "career",
          asOfDate: "2026-08-29",
          profileRef: result.structuredContent.chartRef,
        },
      }),
      followUpResult = followUp.body.result as {
        structuredContent: {
          responseProfile: string;
          profileLifecycle: { mode: string };
          completeLifeReading: null;
          advancedProfileAnchors: null;
          consultationAnalysis: { inferredTopic: string };
        };
      };
    expect(followUp.body.error).toBeUndefined();
    expect(followUpResult.structuredContent.responseProfile).toBe(
      "focused-follow-up",
    );
    expect(followUpResult.structuredContent.profileLifecycle.mode).toBe(
      "follow-up",
    );
    expect(followUpResult.structuredContent.completeLifeReading).toBeNull();
    expect(followUpResult.structuredContent.advancedProfileAnchors).toBeNull();
    expect(
      followUpResult.structuredContent.consultationAnalysis.inferredTopic,
    ).toBe("career");
  }, 15000);

  it("returns the same evidence-ledger contract used by the web topic endpoint", async () => {
    const response = await mcp("tools/call", {
      name: "analyze_chart_topic",
      arguments: {
        name: "Ananya",
        date: "2000-01-28",
        time: "08:05",
        place: "Ravulapalem",
        topic: "career",
        asOfDate: "2026-08-30T00:00:00.000Z",
      },
    });
    const result = response.body.result?.structuredContent as {
      schemaVersion: string;
      topic: string;
      supportingEvidence: unknown[];
      opposingEvidence: unknown[];
      vargaConfirmation: { varga: string };
      timingActivation: { notice: string };
      unresolvedSourceKeys: string[];
      citations: unknown[];
    };
    expect(response.body.error).toBeUndefined();
    expect(result.schemaVersion).toBe("sahadeva-judgment-1");
    expect(result.topic).toBe("career");
    expect(result.supportingEvidence.length).toBeGreaterThan(0);
    expect(result.vargaConfirmation.varga).toBe("D10");
    expect(result.timingActivation.notice).toContain("cannot create");
    expect(result.unresolvedSourceKeys.length).toBeGreaterThan(0);
    expect(result.citations).toEqual([]);
  }, 15000);

  it("validates and replays typed rules without publishing them", async () => {
    const response = await mcp("tools/call", {
      name: "validate_rule_spec",
      arguments: {
        name: "A",
        date: "2000-01-28",
        time: "08:05",
        place: "Verified coordinates",
        latitude: 16.6123,
        longitude: 81.9456,
        timezone: "Asia/Kolkata",
        rule: {
          id: "review-fixture",
          version: 1,
          sourceKey: "judgment:career:house-lord",
          tradition: "parashari",
          topic: "career",
          effect: "support",
          weight: 10,
          condition: {
            type: "predicate",
            fact: { kind: "planet-house", planet: "Sun" },
            operator: "gte",
            value: 1,
          },
          exceptions: [],
          interpretation: "Reviewer fixture",
          harmClass: "general-cultural",
          reviewStatus: "draft",
        },
      },
    });
    const result = response.body.result?.structuredContent as {
      valid: boolean;
      execution: { matched: boolean; publishable: boolean };
      publicationGate: { publishable: boolean };
    };
    expect(response.body.error).toBeUndefined();
    expect(result.valid).toBe(true);
    expect(result.execution.matched).toBe(true);
    expect(result.publicationGate.publishable).toBe(false);
  });

  it("exposes the same bounded convention comparison through MCP and HTTP", async () => {
    const input = {
        name: "A",
        date: "2000-01-28",
        time: "08:05",
        place: "Verified coordinates",
        latitude: 16.6123,
        longitude: 81.9456,
        timezone: "Asia/Kolkata",
        timezoneOffset: 5.5,
        topic: "career",
        language: "en",
        methodology: "parashari",
        focus: "career",
        birthTimeAccuracyMinutes: 5,
      },
      rpc = await mcp("tools/call", {
        name: "compare_conventions",
        arguments: input,
      }),
      http = await app.request(
        "http://localhost/api/judgments/conventions",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
        {
          ENGINE_VERSION: "test",
          CALC_RATE_LIMITER: { limit: async () => ({ success: true }) },
        } as never,
      ),
      web = (await http.json()) as {
        schemaVersion: string;
        judgmentChangeAnalysis: { status: string };
        traditionBoundary: { status: string };
      },
      mcpResult = rpc.body.result?.structuredContent as typeof web;
    expect(rpc.body.error).toBeUndefined();
    expect(http.status).toBe(200);
    expect(mcpResult.schemaVersion).toBe("sahadeva-convention-comparison-1");
    expect(web.judgmentChangeAnalysis.status).toBe(
      mcpResult.judgmentChangeAnalysis.status,
    );
    expect(web.traditionBoundary.status).toBe("not-silently-mixed");
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
      porutham: {
        profile: string;
        checks: unknown[];
        summary: { scoreWithheld: boolean };
      };
      kujaDosha: { bride: { references: unknown[] } };
    };
    expect(body.ashtakoota.maximum).toBe(36);
    expect(body.ashtakoota.components).toHaveLength(8);
    expect(body.porutham.profile).toBe("south-indian-general@1.0.0");
    expect(body.porutham.checks).toHaveLength(10);
    expect(body.porutham.summary.scoreWithheld).toBe(true);
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
      compatibility: { ashtakoota: unknown; porutham: { checks: unknown[] } };
      marriageWindows: { bride: unknown };
    };
    expect(body.schemaVersion).toBe("sahadeva-marriage-readiness-1");
    expect(body.compatibility.ashtakoota).toBeTruthy();
    expect(body.compatibility.porutham.checks).toHaveLength(10);
    expect(body.marriageWindows.bride).toBeTruthy();
  }, 30000);

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
    expect((prompts.body.result?.prompts as unknown[]).length).toBe(8);
    expect((resources.body.result?.resources as unknown[]).length).toBe(8);
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
    const lalKitabPrompt = await mcp("prompts/get", {
      name: "lal_kitab_consultation",
    });
    expect(JSON.stringify(lalKitabPrompt.body.result)).toContain(
      "audit_chart_calculation",
    );
    expect(JSON.stringify(lalKitabPrompt.body.result)).toContain(
      "harm to animals",
    );
    const expertTools = await mcp("resources/read", {
      uri: "sahadeva://expert-tools",
    });
    expect(JSON.stringify(expertTools.body.result)).toContain(
      "calculate_south_indian_chart",
    );
    const lalKitabResource = await mcp("resources/read", {
      uri: "sahadeva://lal-kitab",
    });
    expect(JSON.stringify(lalKitabResource.body.result)).toContain(
      "controlledDisclosureTopics",
    );
    const predictionQuality = await mcp("resources/read", {
      uri: "sahadeva://prediction-quality",
    });
    expect(JSON.stringify(predictionQuality.body.result)).toContain(
      "audit_prediction_claim",
    );
    const evidencePrompt = await mcp("prompts/get", {
      name: "evidence_first_prediction",
    });
    expect(JSON.stringify(evidencePrompt.body.result)).toContain(
      "search_reviewed_rules",
    );
    const security = await mcp("resources/read", {
      uri: "sahadeva://security",
    });
    expect(JSON.stringify(security.body.result)).toContain(
      "zero-source-export",
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
        "MCP-Protocol-Version": "2025-11-25",
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
