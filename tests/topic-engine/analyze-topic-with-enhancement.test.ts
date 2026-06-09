import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeTopicWithEnhancement } from "@/lib/topic-engine/analyze-topic-with-enhancement";
import { analyzeTopic } from "@/lib/topic-engine/analyze-topic";
import { enhanceTopic } from "@/lib/topic-engine/enhance-topic";
import { defaultProfile } from "@/lib/topic-engine/profile";
import type { TopicAnalysisResult, TopicEnhancementRequest } from "@/lib/topic-engine/types";

const originalEnv = { ...process.env };

function createBaseAnalysis(): TopicAnalysisResult {
  const base = analyzeTopic("base idea", defaultProfile);
  if (!base) {
    throw new Error("expected local analysis result");
  }

  return {
    ...base,
    summary: "base summary",
    audience: "base audience",
    painPoint: "base pain point",
    angle: "base angle",
    homogeneityRisk: "base risk",
    riskKeywords: ["base keyword"],
    collisionAngles: ["base collision"],
    recommendedAngle: "base recommendation",
    alternativeAngles: ["base alt"],
    dimensionScores: [
      {
        name: "base dimension",
        score: 70,
        reason: "base dimension reason",
      },
    ],
    diagnosis: {
      riskKeywords: ["base keyword"],
      collisionAngles: ["base collision"],
      whyLooksGeneric: "base why",
    },
    publishChecklist: ["base checklist"],
    seriesBreakdown: ["base series step"],
  };
}

function createRequest(overrides?: Partial<TopicEnhancementRequest>): TopicEnhancementRequest {
  return {
    rawIdea: "test idea",
    profile: defaultProfile,
    baseAnalysis: createBaseAnalysis(),
    ...overrides,
  };
}

function createLLMResult(overrides?: Partial<TopicAnalysisResult>): TopicAnalysisResult {
  return {
    ...createBaseAnalysis(),
    score: 91,
    summary: "llm summary",
    audience: "llm audience",
    painPoint: "llm pain point",
    angle: "llm angle",
    homogeneityRisk: "llm homogeneity risk",
    riskKeywords: ["llm keyword"],
    collisionAngles: ["llm collision"],
    recommendedAngle: "llm recommendation",
    alternativeAngles: ["llm alt 1", "llm alt 2"],
    dimensionScores: [
      {
        name: "llm dimension",
        score: 88,
        reason: "llm dimension reason",
      },
    ],
    diagnosis: {
      riskKeywords: ["llm keyword"],
      collisionAngles: ["llm collision"],
      whyLooksGeneric: "llm why",
    },
    publishChecklist: ["llm checklist"],
    seriesBreakdown: ["llm series step"],
    ...overrides,
  };
}

describe("topic enhancement providers", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses DeepSeek by default and parses a full analysis result", async () => {
    process.env = {
      ...originalEnv,
      DEEPSEEK_API_KEY: "deepseek-key",
    };

    const llmResult = createLLMResult();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(llmResult),
            },
          },
        ],
      }),
    });

    const result = await enhanceTopic(createRequest(), fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer deepseek-key",
        }),
      }),
    );
    expect(result).toEqual(llmResult);
  });

  it("parses DeepSeek responses wrapped in markdown code fences", async () => {
    process.env = {
      ...originalEnv,
      DEEPSEEK_API_KEY: "deepseek-key",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify(
                createLLMResult({
                  summary: "fenced summary",
                  recommendedAngle: "fenced recommendation",
                  alternativeAngles: ["angle a"],
                }),
              )}\n\`\`\``,
            },
          },
        ],
      }),
    });

    const result = await enhanceTopic(createRequest(), fetchMock as unknown as typeof fetch);

    expect(result.summary).toBe("fenced summary");
    expect(result.recommendedAngle).toBe("fenced recommendation");
    expect(result.alternativeAngles).toEqual(["angle a"]);
    expect(result.angle).toBe("llm angle");
  });

  it("parses DeepSeek responses with extra explanatory text around the JSON object", async () => {
    process.env = {
      ...originalEnv,
      DEEPSEEK_API_KEY: "deepseek-key",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `here is the result\n${JSON.stringify(
                createLLMResult({
                  summary: "wrapped summary",
                  recommendedAngle: "wrapped recommendation",
                  alternativeAngles: ["angle a"],
                }),
              )}\nthanks`,
            },
          },
        ],
      }),
    });

    const result = await enhanceTopic(createRequest(), fetchMock as unknown as typeof fetch);

    expect(result.summary).toBe("wrapped summary");
    expect(result.recommendedAngle).toBe("wrapped recommendation");
    expect(result.alternativeAngles).toEqual(["angle a"]);
    expect(result.publishChecklist).toEqual(["llm checklist"]);
  });

  it("normalizes recoverable DeepSeek fields and fills missing analysis fields from the base analysis", async () => {
    process.env = {
      ...originalEnv,
      DEEPSEEK_API_KEY: "deepseek-key",
    };

    const normalizedStatus = createLLMResult().status;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                score: "89",
                status: normalizedStatus,
                summary: "normalized summary",
                audience: "normalized audience",
                painPoint: "normalized pain point",
                angle: "normalized angle",
                homogeneityRisk: "normalized risk",
                riskKeywords: "keyword a / keyword b",
                collisionAngles: ["collision a", "collision b"],
                recommendedAngle: "normalized recommendation",
                alternativeAngles: "alt a / alt b / alt c",
                dimensionScores: [
                  {
                    name: "normalized dimension",
                    score: "77",
                    reason: "normalized reason",
                  },
                ],
                publishChecklist: "check a / check b",
                seriesBreakdown: "series a\nseries b",
              }),
            },
          },
        ],
      }),
    });

    const result = await enhanceTopic(createRequest(), fetchMock as unknown as typeof fetch);

    expect(result.score).toBe(89);
    expect(result.status).toBe(normalizedStatus);
    expect(result.riskKeywords).toEqual(["keyword a", "keyword b"]);
    expect(result.alternativeAngles).toEqual(["alt a", "alt b"]);
    expect(result.dimensionScores).toEqual([
      {
        name: "normalized dimension",
        score: 77,
        reason: "normalized reason",
      },
    ]);
    expect(result.diagnosis).toEqual({
      riskKeywords: ["keyword a", "keyword b"],
      collisionAngles: ["collision a", "collision b"],
      whyLooksGeneric: "normalized risk",
    });
    expect(result.publishChecklist).toEqual(["check a", "check b"]);
    expect(result.seriesBreakdown).toEqual(["series a", "series b"]);
  });

  it("uses the OpenAI provider when explicitly configured", async () => {
    process.env = {
      ...originalEnv,
      LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "openai-key",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify(
          createLLMResult({
            summary: "openai summary",
            recommendedAngle: "openai recommendation",
            alternativeAngles: ["angle a"],
          }),
        ),
      }),
    });

    const result = await enhanceTopic(createRequest(), fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer openai-key",
        }),
      }),
    );
    expect(result.summary).toBe("openai summary");
    expect(result.recommendedAngle).toBe("openai recommendation");
    expect(result.score).toBe(91);
  });

  it("returns the full llm result instead of merging only three enhancement fields", async () => {
    const llmResult = createLLMResult({
      score: 93,
      audience: "llm-only audience",
      painPoint: "llm-only pain point",
      angle: "llm-only angle",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => llmResult,
    });

    const result = await analyzeTopicWithEnhancement(
      "fully generated idea",
      defaultProfile,
      fetchMock as unknown as typeof fetch,
    );

    expect(result).toEqual(llmResult);
  });

  it("falls back to the local analysis when the API request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    const input = "fallback idea";

    const result = await analyzeTopicWithEnhancement(
      input,
      defaultProfile,
      fetchMock as unknown as typeof fetch,
    );

    expect(result).not.toBeNull();
    expect(result?.summary).toBeTruthy();
    expect(result?.recommendedAngle).toBeTruthy();
    expect(result?.audience).not.toBe("llm audience");
    expect(result?.summary).not.toBe("llm summary");
    expect(result?.recommendedAngle).not.toBe("llm recommendation");
  });

  it("falls back to the local analysis when the API returns invalid data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: "",
        recommendedAngle: 42,
        alternativeAngles: "oops",
      }),
    });

    const result = await analyzeTopicWithEnhancement(
      "invalid enhancement payload idea",
      defaultProfile,
      fetchMock as unknown as typeof fetch,
    );

    expect(result).not.toBeNull();
    expect(result?.summary).not.toBe("");
    expect(result?.dimensionScores.length).toBeGreaterThan(0);
  });
});
