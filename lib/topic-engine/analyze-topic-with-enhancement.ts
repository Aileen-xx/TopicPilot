import { analyzeTopic } from "@/lib/topic-engine/analyze-topic";
import type {
  CreatorProfile,
  TopicAnalysisLLMResult,
  TopicAnalysisResult,
  TopicEnhancementRequest,
  TopicStatus,
} from "@/lib/topic-engine/types";

const VALID_STATUSES: TopicStatus[] = ["推荐发布", "建议优化", "暂不建议"];

type LegacyTopicEnhancement = Pick<
  TopicAnalysisResult,
  "summary" | "recommendedAngle" | "alternativeAngles"
>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isDimensionScores(
  value: unknown,
): value is TopicAnalysisResult["dimensionScores"] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        !!item &&
        typeof item === "object" &&
        isNonEmptyString((item as { name?: unknown }).name) &&
        typeof (item as { score?: unknown }).score === "number" &&
        Number.isFinite((item as { score?: number }).score) &&
        isNonEmptyString((item as { reason?: unknown }).reason),
    )
  );
}

function isDiagnosis(value: unknown): value is TopicAnalysisResult["diagnosis"] {
  return (
    !!value &&
    typeof value === "object" &&
    isStringArray((value as { riskKeywords?: unknown }).riskKeywords) &&
    isStringArray((value as { collisionAngles?: unknown }).collisionAngles) &&
    isNonEmptyString((value as { whyLooksGeneric?: unknown }).whyLooksGeneric)
  );
}

function isLegacyEnhancement(value: unknown): value is LegacyTopicEnhancement {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<LegacyTopicEnhancement>;
  return (
    isNonEmptyString(candidate.summary) &&
    isNonEmptyString(candidate.recommendedAngle) &&
    Array.isArray(candidate.alternativeAngles) &&
    candidate.alternativeAngles.length >= 1 &&
    candidate.alternativeAngles.length <= 2 &&
    candidate.alternativeAngles.every(isNonEmptyString)
  );
}

function isValidFullAnalysis(value: unknown): value is TopicAnalysisLLMResult {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<TopicAnalysisLLMResult>;
  return (
    typeof candidate.score === "number" &&
    Number.isFinite(candidate.score) &&
    typeof candidate.status === "string" &&
    VALID_STATUSES.includes(candidate.status as TopicStatus) &&
    isNonEmptyString(candidate.summary) &&
    isNonEmptyString(candidate.audience) &&
    isNonEmptyString(candidate.painPoint) &&
    isNonEmptyString(candidate.angle) &&
    isNonEmptyString(candidate.homogeneityRisk) &&
    isStringArray(candidate.riskKeywords) &&
    isStringArray(candidate.collisionAngles) &&
    isNonEmptyString(candidate.recommendedAngle) &&
    Array.isArray(candidate.alternativeAngles) &&
    candidate.alternativeAngles.length >= 1 &&
    candidate.alternativeAngles.length <= 2 &&
    candidate.alternativeAngles.every(isNonEmptyString) &&
    isDimensionScores(candidate.dimensionScores) &&
    isDiagnosis(candidate.diagnosis) &&
    isStringArray(candidate.publishChecklist) &&
    candidate.publishChecklist.length > 0 &&
    isStringArray(candidate.seriesBreakdown) &&
    candidate.seriesBreakdown.length > 0
  );
}

export async function analyzeTopicWithEnhancement(
  rawIdea: string,
  profile: CreatorProfile,
  fetchImpl: typeof fetch = fetch,
): Promise<TopicAnalysisResult | null> {
  const baseAnalysis = analyzeTopic(rawIdea, profile);
  if (!baseAnalysis) return null;

  const payload: TopicEnhancementRequest = {
    rawIdea,
    profile,
    baseAnalysis,
  };

  try {
    const response = await fetchImpl("/api/topic-enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return baseAnalysis;
    }

    const data = (await response.json()) as unknown;
    if (isValidFullAnalysis(data)) {
      return data;
    }

    if (isLegacyEnhancement(data)) {
      return {
        ...baseAnalysis,
        summary: data.summary,
        recommendedAngle: data.recommendedAngle,
        alternativeAngles: data.alternativeAngles,
      };
    }

    return baseAnalysis;
  } catch {
    return baseAnalysis;
  }
}
