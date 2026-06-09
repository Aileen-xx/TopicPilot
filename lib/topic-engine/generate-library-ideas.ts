import { libraryIdeas } from "@/data/library-ideas";
import type {
  LLMProvider,
  LibraryIdeaEntry,
  LibraryIdeasGenerationRequest,
} from "@/lib/topic-engine/types";

const LIBRARY_IDEAS_SCHEMA = {
  type: "array",
  minItems: 1,
  maxItems: 9,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["category", "title", "tagline"],
    properties: {
      category: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1 },
      tagline: { type: "string", minLength: 1 },
    },
  },
} as const;

const VALID_LIBRARY_CATEGORIES = Array.from(new Set(libraryIdeas.map((item) => item.category)));

type LibraryIdeaDraft = Omit<LibraryIdeaEntry, "id">;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidLibraryIdeaDraft(value: unknown): value is LibraryIdeaDraft {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<LibraryIdeaDraft>;
  return (
    isNonEmptyString(candidate.category) &&
    VALID_LIBRARY_CATEGORIES.includes(candidate.category.trim()) &&
    isNonEmptyString(candidate.title) &&
    isNonEmptyString(candidate.tagline)
  );
}

function isValidLibraryIdeaDraftArray(value: unknown): value is LibraryIdeaDraft[] {
  return Array.isArray(value) && value.length > 0 && value.every(isValidLibraryIdeaDraft);
}

function buildPrompt({ history, profile }: LibraryIdeasGenerationRequest) {
  const recentHistory = history.slice(0, 5);
  const historyContext =
    recentHistory.length === 0
      ? "最近还没有分析记录，请只根据账号画像生成一批更具体、可直接带回选题页的灵感。"
      : recentHistory
          .map((entry, index) => {
            const alternativeAngles = entry.result.alternativeAngles.join(" / ");
            return [
              `记录 ${index + 1}:`,
              `原始想法：${entry.rawIdea}`,
              `分析状态：${entry.result.status}`,
              `总结：${entry.result.summary}`,
              `推荐切口：${entry.result.recommendedAngle}`,
              `备选切口：${alternativeAngles}`,
            ].join("\n");
          })
          .join("\n\n");

  return [
    "你是一个小红书内容灵感策划顾问。",
    "你的任务是基于用户最近分析过的话题和账号画像，生成一批新的灵感库选题。",
    "不要重复历史原题，不要只是改几个词，要抽取新的切口和更适合展开的表达方式。",
    "只输出合法 JSON，不要输出解释，不要输出 markdown。",
    "",
    "账号画像：",
    `我是：${profile.role}`,
    `我写给：${profile.audience}`,
    `我的可信支点：${profile.credibility}`,
    `我避免写：${profile.avoid}`,
    `我的长期栏目：${profile.columns.join(" / ")}`,
    "",
    "可选分类只能使用以下几项：",
    VALID_LIBRARY_CATEGORIES.join(" / "),
    "",
    "最近分析记录：",
    historyContext,
    "",
    "输出要求：",
    "1. 输出 8 条灵感。",
    "2. 每条都必须包含 category、title、tagline。",
    "3. title 要像可直接点击带回选题页的具体题目，避免空泛。",
    "4. tagline 用一句话解释这条题目的展开方向。",
    "5. 不要生成和历史原题高度重复的标题。",
    "6. 只输出 JSON 数组。",
  ].join("\n");
}

function getProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (provider === "openai") return "openai";
  return "deepseek";
}

function parseIdeasText(outputText: string, providerLabel: string): LibraryIdeaEntry[] {
  const normalizedText = outputText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedText) as unknown;
  } catch {
    const jsonStart = normalizedText.indexOf("[");
    const jsonEnd = normalizedText.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error(`${providerLabel} response is not valid JSON`);
    }

    parsed = JSON.parse(normalizedText.slice(jsonStart, jsonEnd + 1)) as unknown;
  }

  if (!isValidLibraryIdeaDraftArray(parsed)) {
    throw new Error(`${providerLabel} response shape is invalid`);
  }

  return parsed.slice(0, 9).map((item, index) => ({
    id: `generated-${Date.now()}-${index}`,
    category: item.category.trim(),
    title: item.title.trim(),
    tagline: item.tagline.trim(),
  }));
}

async function callOpenAIProvider(
  payload: LibraryIdeasGenerationRequest,
  fetchImpl: typeof fetch,
): Promise<LibraryIdeaEntry[]> {
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
          name: "topicpilot_library_ideas",
          schema: LIBRARY_IDEAS_SCHEMA,
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

  return parseIdeasText(data.output_text, "OpenAI");
}

async function callDeepSeekProvider(
  payload: LibraryIdeasGenerationRequest,
  fetchImpl: typeof fetch,
): Promise<LibraryIdeaEntry[]> {
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
          content: "你只负责输出合法 JSON 数组，不能输出任何额外解释。",
        },
        {
          role: "user",
          content: buildPrompt(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const outputText = data.choices?.[0]?.message?.content;
  if (!outputText) {
    throw new Error("DeepSeek response did not include content");
  }

  return parseIdeasText(outputText, "DeepSeek");
}

export async function generateLibraryIdeas(
  payload: LibraryIdeasGenerationRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<LibraryIdeaEntry[]> {
  const provider = getProvider();
  if (provider === "openai") {
    return callOpenAIProvider(payload, fetchImpl);
  }

  return callDeepSeekProvider(payload, fetchImpl);
}
