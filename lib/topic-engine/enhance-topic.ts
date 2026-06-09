import type {
  LLMProvider,
  TopicAnalysisLLMResult,
  TopicEnhancementRequest,
  TopicStatus,
} from "@/lib/topic-engine/types";

const TOPIC_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "status",
    "summary",
    "audience",
    "painPoint",
    "angle",
    "homogeneityRisk",
    "riskKeywords",
    "collisionAngles",
    "recommendedAngle",
    "alternativeAngles",
    "dimensionScores",
    "diagnosis",
    "publishChecklist",
    "seriesBreakdown",
  ],
  properties: {
    score: { type: "number" },
    status: {
      type: "string",
      enum: ["推荐发布", "建议优化", "暂不建议"],
    },
    summary: { type: "string", minLength: 1 },
    audience: { type: "string", minLength: 1 },
    painPoint: { type: "string", minLength: 1 },
    angle: { type: "string", minLength: 1 },
    homogeneityRisk: { type: "string", minLength: 1 },
    riskKeywords: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    collisionAngles: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    recommendedAngle: { type: "string", minLength: 1 },
    alternativeAngles: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: { type: "string", minLength: 1 },
    },
    dimensionScores: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "score", "reason"],
        properties: {
          name: { type: "string", minLength: 1 },
          score: { type: "number" },
          reason: { type: "string", minLength: 1 },
        },
      },
    },
    diagnosis: {
      type: "object",
      additionalProperties: false,
      required: ["riskKeywords", "collisionAngles", "whyLooksGeneric"],
      properties: {
        riskKeywords: {
          type: "array",
          items: { type: "string", minLength: 1 },
        },
        collisionAngles: {
          type: "array",
          items: { type: "string", minLength: 1 },
        },
        whyLooksGeneric: { type: "string", minLength: 1 },
      },
    },
    publishChecklist: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    seriesBreakdown: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
  },
} as const;

const VALID_STATUSES: TopicStatus[] = ["推荐发布", "建议优化", "暂不建议"];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isDimensionScores(
  value: unknown,
): value is TopicAnalysisLLMResult["dimensionScores"] {
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

function isDiagnosis(value: unknown): value is TopicAnalysisLLMResult["diagnosis"] {
  return (
    !!value &&
    typeof value === "object" &&
    isStringArray((value as { riskKeywords?: unknown }).riskKeywords) &&
    isStringArray((value as { collisionAngles?: unknown }).collisionAngles) &&
    isNonEmptyString((value as { whyLooksGeneric?: unknown }).whyLooksGeneric)
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

function buildPrompt({ rawIdea, profile }: TopicEnhancementRequest) {
  return [
    "你是一个小红书内容选题顾问。",
    "你的任务是基于用户的真实想法和账号画像，直接输出完整的选题分析 JSON。",
    "不要参考任何本地规则结论，不要输出解释性文字，不要输出 markdown，只能输出 JSON 对象。",
    "",
    `原始想法：${rawIdea}`,
    "",
    "账号画像：",
    `我是：${profile.role}`,
    `我写给：${profile.audience}`,
    `我的可信支点：${profile.credibility}`,
    `我避免写：${profile.avoid}`,
    `我的长期栏目：${profile.columns.join(" / ")}`,
    "",
    "请输出以下字段：",
    '1. score：20-95 的整数。',
    '2. status：只能是“推荐发布” / “建议优化” / “暂不建议”之一。',
    "3. summary：一句总判断。",
    "4. audience：这条内容真正适合谁看。",
    "5. painPoint：这条内容对应的核心痛点。",
    "6. angle：这条内容最好的表达角度。",
    "7. homogeneityRisk：为什么会同质化或为什么不会。",
    "8. riskKeywords：高风险表达关键词数组，可为空数组。",
    "9. collisionAngles：容易撞题的角度数组，可为空数组。",
    "10. recommendedAngle：1 条主推荐切口。",
    "11. alternativeAngles：1-2 条备选切口。",
    "12. dimensionScores：至少 1 条，推荐输出 6 条，每条包含 name / score / reason。",
    "13. diagnosis：包含 riskKeywords / collisionAngles / whyLooksGeneric。",
    "14. publishChecklist：发布前检查清单数组。",
    "15. seriesBreakdown：系列内容拆解数组。",
    "",
    "输出要求：",
    "1. 所有字符串都要具体，不要套话。",
    "2. 不要把不同输入写成同一套模板。",
    "3. 不要遗漏任何字段。",
    "4. 只能输出合法 JSON。",
  ].join("\n");
}

function getProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (provider === "openai") return "openai";
  return "deepseek";
}

function parseAnalysisText(outputText: string, providerLabel: string): TopicAnalysisLLMResult {
  const normalizedText = outputText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedText) as unknown;
  } catch {
    const jsonStart = normalizedText.indexOf("{");
    const jsonEnd = normalizedText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error(`${providerLabel} response is not valid JSON`);
    }

    parsed = JSON.parse(normalizedText.slice(jsonStart, jsonEnd + 1)) as unknown;
  }

  if (!isValidFullAnalysis(parsed)) {
    throw new Error(`${providerLabel} response shape is invalid`);
  }

  return parsed;
}

async function callOpenAIProvider(
  payload: TopicEnhancementRequest,
  fetchImpl: typeof fetch,
): Promise<TopicAnalysisLLMResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(payload),
      text: {
        format: {
          type: "json_schema",
          name: "topicpilot_full_analysis",
          schema: TOPIC_ANALYSIS_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { output_text?: string };
  if (!data.output_text) {
    throw new Error("OpenAI response did not include output_text");
  }

  return parseAnalysisText(data.output_text, "OpenAI");
}

async function callDeepSeekProvider(
  payload: TopicEnhancementRequest,
  fetchImpl: typeof fetch,
): Promise<TopicAnalysisLLMResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  const response = await fetchImpl("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你只负责输出合法 JSON，字段必须完整，不能输出任何额外解释。",
        },
        {
          role: "user",
          content: buildPrompt(payload),
        },
      ],
      response_format: {
        type: "json_object",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const outputText = data.choices?.[0]?.message?.content;
  if (!outputText) {
    throw new Error("DeepSeek response did not include message content");
  }

  return parseAnalysisText(outputText, "DeepSeek");
}

export async function enhanceTopic(
  payload: TopicEnhancementRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<TopicAnalysisLLMResult> {
  const provider = getProvider();
  if (provider === "openai") {
    return callOpenAIProvider(payload, fetchImpl);
  }

  return callDeepSeekProvider(payload, fetchImpl);
}
