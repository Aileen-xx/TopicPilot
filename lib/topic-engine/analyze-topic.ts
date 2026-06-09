import {
  broadRiskKeywords,
  collisionAngles,
  credibilityKeywords,
  expertOnlyKeywords,
  scoreToStatus,
} from "@/lib/topic-engine/rules";
import type {
  CreatorProfile,
  TopicAnalysisResult,
  TopicDiagnosis,
  TopicDimensionScore,
} from "@/lib/topic-engine/types";

function normalizeIdea(rawIdea: string) {
  return rawIdea.trim();
}

function hitKeywords(idea: string, keywords: string[]) {
  const lower = idea.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
}

function clampScore(score: number) {
  return Math.max(20, Math.min(95, Math.round(score)));
}

function averageScore(items: TopicDimensionScore[]) {
  return Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
}

function buildSeriesBreakdown(idea: string) {
  if (idea.includes("面试助手")) {
    return [
      "我为什么一开始会想做 AI 面试助手",
      "这个方向最吸引新手的地方是什么",
      "我在需求判断上第一次踩坑",
      "为什么我发现这个功能很容易变成套壳",
      "我怎么重新定义“对用户有用”",
      "放弃这个方向后我反而看清了自己的边界",
      "从这个失败选择里，我学会了什么",
    ];
  }

  if (idea.includes("工具")) {
    return [
      "我为什么一开始也想做工具清单型内容",
      "哪些工具我真的在项目里用过，哪些只是看起来高级",
      "我第一次做财报帮读 demo 时最依赖的其实不是工具数量",
      "为什么工具越多，越容易把内容写成培训号",
      "我留下来的 3 个工作流，各自解决了什么问题",
      "如果重来一次，我会怎样介绍这些工具而不是堆名字",
      "从工具清单转向项目复盘后，内容反馈有什么变化",
    ];
  }

  return [
    "我为什么不再只做金融实习准备",
    "金融生做 AI 产品，第一个误区是太迷信技术",
    "我为什么选择做财报帮读工具",
    "第一次跑通文件解析时，我发现的问题",
    "为什么我放弃做 AI 面试助手",
    "一个 AI 产品项目怎样才不像套壳",
    "我怎么给自己的项目设计用户反馈",
  ];
}

function buildAngle(idea: string, hasCredibilityAnchor: boolean) {
  if (idea.includes("面试助手")) {
    return "有观点也有经历支点，适合写成“为什么我不做 AI 面试助手项目”这类带判断的复盘内容。";
  }

  if (!hasCredibilityAnchor) {
    return "建议把泛化身份词换成具体项目切口，例如：金融生做第一个 AI 财报项目，我发现最难的不是技术。";
  }

  return "适合继续往项目复盘和产品判断上收，不要扩成泛泛的转行经验贴。";
}

function buildPainPoint(idea: string, expertHits: string[], riskHits: string[]) {
  if (expertHits.length > 0) {
    return "这个题目会让用户先质疑你的可信度，因为它更像专家清单，而不是基于真实经历的判断。";
  }

  if (riskHits.length > 0) {
    return "方向本身不是问题，真正的问题是表达太泛，用户看完仍然不知道你能提供哪一种独特经验。";
  }

  if (idea.includes("面试助手")) {
    return "用户会对“为什么不做”产生好奇，这种带选择和取舍的内容更容易建立真实可信度。";
  }

  return "需要更明确地指向一个真实焦虑，否则读者难以判断这篇内容和自己有什么关系。";
}

function buildHomogeneityRisk(riskHits: string[], expertHits: string[], hasCredibilityAnchor: boolean) {
  if (expertHits.length > 0) {
    return "专家感过强，容易像培训号或清单号，和新手创作者的真实身份不匹配。";
  }

  if (riskHits.length > 0 || !hasCredibilityAnchor) {
    return "表达过泛，容易撞上学习路线、转行攻略、工具清单这类常见内容。";
  }

  return "同质化风险较低，重点在于继续保留具体项目、观点冲突和真实取舍。";
}

function buildAudience(profile: CreatorProfile, idea: string) {
  if (idea.includes("面试助手")) {
    return "准备做第一个 AI 产品项目、正在判断选题方向是否成立的转行型新手创作者。";
  }

  if (idea.includes("工具")) {
    return "表面上像写给转行人群，但实际更像写给已经有资历的内容消费者，因此人群定位偏虚。";
  }

  return profile.audience;
}

function buildSummary(status: TopicAnalysisResult["status"], expertHits: string[], riskHits: string[], hasCredibilityAnchor: boolean) {
  if (status === "暂不建议") {
    if (expertHits.length > 0) {
      return "暂不建议直接发，这个表达更像专家清单，不像新手创作者的真实判断。";
    }

    return "暂不建议直接发，这个题现在还缺少真实经历支点。";
  }

  if (riskHits.length > 0 || !hasCredibilityAnchor) {
    return "方向可写，但当前表达过泛。";
  }

  return "值得写，这个切口已经有观点和真实支点。";
}

function buildDiagnosis(
  riskHits: string[],
  expertHits: string[],
  hasCredibilityAnchor: boolean,
  activeCollisionAngles: string[],
): TopicDiagnosis {
  if (expertHits.length > 0) {
    return {
      riskKeywords: [...new Set([...riskHits, ...expertHits])],
      collisionAngles: activeCollisionAngles,
      whyLooksGeneric:
        "因为它直接用“必备 / 工具 / 清单”组织内容，像在替专家发言，而不是从自己的项目经历里长出来。",
    };
  }

  if (riskHits.length > 0 || !hasCredibilityAnchor) {
    return {
      riskKeywords: [...new Set([...riskHits, ...expertHits])],
      collisionAngles: activeCollisionAngles,
      whyLooksGeneric:
        "因为它只有方向标签，没有具体项目、真实选择或失败片段，读者很难记住你和别人有什么不同。",
    };
  }

  return {
    riskKeywords: [...new Set([...riskHits, ...expertHits])],
    collisionAngles: activeCollisionAngles,
    whyLooksGeneric: "当前不像培训号，关键是继续保留判断过程和真实取舍，不要回到泛泛总结。",
  };
}

function buildRecommendedAngle(idea: string, expertHits: string[], hasCredibilityAnchor: boolean) {
  if (idea.includes("面试助手")) {
    return "我为什么不做 AI 面试助手项目，以及我是怎么判断它不值得继续做的。";
  }

  if (expertHits.length > 0 || !hasCredibilityAnchor) {
    return "金融生做第一个 AI 财报项目，我发现最难的不是技术，而是判断这个需求是不是真问题。";
  }

  return "我做这个 AI 产品项目时，第一次意识到“有功能”不等于“值得做”。";
}

function buildAlternativeAngles(idea: string, expertHits: string[]) {
  if (idea.includes("面试助手")) {
    return [
      "我第一次否掉一个 AI 项目方向，靠的不是感觉，而是这 3 个判断。",
      "为什么新手最容易高估 AI 面试助手这类题目的价值。",
    ];
  }

  if (idea.includes("工具") || expertHits.length > 0) {
    return [
      "我做财报帮读 demo 时真正留下来的 3 个工具，以及我放弃它们的理由。",
      "比起列 100 个工具，我更想讲新手第一次做 AI 项目时会踩的 3 个坑。",
    ];
  }

  return [
    "金融生第一次做 AI 产品 demo，我是怎么把一个泛想法改成可写选题的。",
    "我为什么不再写“转 AI”这种大词，而改写具体项目里的真实判断。",
  ];
}

function buildDimensionScores(
  idea: string,
  riskHits: string[],
  expertHits: string[],
  hasCredibilityAnchor: boolean,
) {
  const hasTooling = idea.includes("工具");
  const hasProject = idea.includes("项目") || idea.includes("demo") || idea.includes("财报");
  const hasWhy = idea.includes("为什么");
  const hasDecision = idea.includes("为什么不") || idea.includes("放弃");
  const hasInterviewAssistant = idea.includes("面试助手");

  const audienceScore = clampScore(
    78 - (riskHits.length > 0 ? 12 : 0) - (hasTooling ? 8 : 0) + (hasProject ? 6 : 0) + (hasInterviewAssistant ? 8 : 0),
  );
  const painPointScore = clampScore(
    68 + (hasDecision ? 18 : 0) + (hasProject ? 10 : 0) - (expertHits.length > 0 ? 12 : 0) - (riskHits.length > 0 && !hasProject ? 8 : 0),
  );
  const differentiationScore = clampScore(
    58 - riskHits.length * 14 - expertHits.length * 12 + (hasDecision ? 18 : 0) + (hasProject ? 12 : 0) + (hasInterviewAssistant ? 8 : 0),
  );
  const credibilityScore = clampScore(
    55 + (hasProject ? 18 : 0) + (hasWhy ? 12 : 0) - expertHits.length * 18 - (!hasCredibilityAnchor ? 6 : 0),
  );
  const searchValueScore = clampScore(
    72 + (hasWhy ? 10 : 0) + (hasTooling || hasInterviewAssistant || hasProject ? 8 : 0) - (riskHits.length > 1 && !hasWhy ? 10 : 0),
  );
  const seriesScore = clampScore(74 + (hasProject ? 10 : 0) + (hasDecision ? 8 : 0) - (expertHits.length > 0 ? 6 : 0));

  return [
    {
      name: "人群清晰度",
      score: audienceScore,
      reason:
        audienceScore >= 80
          ? "这个题已经明确写给某一类新手，而不是泛泛地写给所有想转行的人。"
          : "现在的人群标签还偏宽，需要再往某一类具体新手身上收。 ",
    },
    {
      name: "痛点强度",
      score: painPointScore,
      reason:
        painPointScore >= 80
          ? "题目里已经带着真实选择或判断，读者会自然好奇你为什么这样做。"
          : "现在更多像方向描述，还没有把一个具体焦虑拎出来。 ",
    },
    {
      name: "差异化程度",
      score: differentiationScore,
      reason:
        differentiationScore >= 80
          ? "它不是常见经验贴，而是带有个人判断和具体情境的切口。"
          : "它还容易滑向转行经验、学习路线或工具清单这些常见表达。 ",
    },
    {
      name: "个人可信度",
      score: credibilityScore,
      reason:
        credibilityScore >= 80
          ? "你是在讲自己做过的项目或真实取舍，可信度成立。"
          : "如果没有项目、选择或失败片段支撑，读者会先怀疑你凭什么讲。 ",
    },
    {
      name: "搜索价值",
      score: searchValueScore,
      reason:
        searchValueScore >= 80
          ? "这个题天然承接具体问题，读者容易带着明确目的点进来。"
          : "它有方向感，但还可以再更像一个会被主动搜索的问题。 ",
    },
    {
      name: "系列延展性",
      score: seriesScore,
      reason:
        seriesScore >= 80
          ? "围绕这个切口可以继续拆出多个连续话题，不会只剩一条孤立内容。"
          : "它可以延展，但最好先找到更稳定的主线和项目支点。 ",
    },
  ] satisfies TopicDimensionScore[];
}

export function analyzeTopic(rawIdea: string, profile: CreatorProfile): TopicAnalysisResult | null {
  const idea = normalizeIdea(rawIdea);
  if (!idea) return null;

  const riskHits = hitKeywords(idea, broadRiskKeywords);
  const expertHits = hitKeywords(idea, expertOnlyKeywords);
  const credibilityHits = hitKeywords(idea, credibilityKeywords);
  const hasCredibilityAnchor = credibilityHits.length > 0 || idea.includes("我为什么");
  const activeCollisionAngles = hasCredibilityAnchor ? collisionAngles.slice(0, 3) : collisionAngles;
  const dimensionScores = buildDimensionScores(idea, riskHits, expertHits, hasCredibilityAnchor);
  const score = averageScore(dimensionScores);
  const status = scoreToStatus(score);
  const diagnosis = buildDiagnosis(riskHits, expertHits, hasCredibilityAnchor, activeCollisionAngles);

  return {
    score,
    status,
    summary: buildSummary(status, expertHits, riskHits, hasCredibilityAnchor),
    audience: buildAudience(profile, idea),
    painPoint: buildPainPoint(idea, expertHits, riskHits),
    angle: buildAngle(idea, hasCredibilityAnchor),
    homogeneityRisk: buildHomogeneityRisk(riskHits, expertHits, hasCredibilityAnchor),
    riskKeywords: diagnosis.riskKeywords,
    collisionAngles: diagnosis.collisionAngles,
    recommendedAngle: buildRecommendedAngle(idea, expertHits, hasCredibilityAnchor),
    alternativeAngles: buildAlternativeAngles(idea, expertHits),
    dimensionScores,
    diagnosis,
    publishChecklist: [
      "是否有真实项目或真实选择作为支点",
      "是否明确写给某一类新手，而不是所有人",
      "是否避开“0基础 / 上岸 / 必备”这类泛化表达",
    ],
    seriesBreakdown: buildSeriesBreakdown(idea),
  };
}
