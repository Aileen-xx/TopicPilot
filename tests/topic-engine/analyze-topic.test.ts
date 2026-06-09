import { describe, expect, it } from "vitest";
import { analyzeTopic } from "@/lib/topic-engine/analyze-topic";
import { defaultProfile } from "@/lib/topic-engine/profile";

describe("analyzeTopic", () => {
  it("marks 金融生转 AI 产品经理 as valid but too broad", () => {
    const result = analyzeTopic("金融生转 AI 产品经理", defaultProfile);

    expect(result).not.toBeNull();
    expect(result?.status).toBe("建议优化");
    expect(result?.summary).toContain("表达过泛");
    expect(result?.recommendedAngle).toContain("财报项目");
    expect(result?.diagnosis.whyLooksGeneric).toContain("具体项目");
    expect(result?.dimensionScores).toHaveLength(6);

    const differentiation = result?.dimensionScores.find((item) => item.name === "差异化程度");
    expect(differentiation?.score).toBeLessThan(70);
  });

  it("marks AI 产品经理必备 100 个工具 as not recommended", () => {
    const result = analyzeTopic("AI 产品经理必备 100 个工具", defaultProfile);

    expect(result).not.toBeNull();
    expect(result?.status).toBe("暂不建议");
    expect(result?.diagnosis.whyLooksGeneric).toContain("专家");
    expect(result?.riskKeywords).toContain("必备");
    expect(result?.riskKeywords).toContain("工具");

    const credibility = result?.dimensionScores.find((item) => item.name === "个人可信度");
    expect(credibility?.score).toBeLessThan(60);
  });

  it("marks 我为什么不做 AI 面试助手项目 as differentiated", () => {
    const result = analyzeTopic("我为什么不做 AI 面试助手项目", defaultProfile);

    expect(result).not.toBeNull();
    expect(result?.status).toBe("推荐发布");
    expect(result?.summary).toContain("值得写");
    expect(result?.recommendedAngle).toContain("不做 AI 面试助手项目");
    expect(result?.seriesBreakdown).toHaveLength(7);

    const differentiation = result?.dimensionScores.find((item) => item.name === "差异化程度");
    const credibility = result?.dimensionScores.find((item) => item.name === "个人可信度");
    expect(differentiation?.score).toBeGreaterThanOrEqual(80);
    expect(credibility?.score).toBeGreaterThanOrEqual(80);
  });

  it("returns null for empty input", () => {
    expect(analyzeTopic("", defaultProfile)).toBeNull();
    expect(analyzeTopic("   ", defaultProfile)).toBeNull();
  });
});
