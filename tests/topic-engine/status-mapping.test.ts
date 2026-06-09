import { describe, expect, it } from "vitest";
import { scoreToStatus } from "@/lib/topic-engine/rules";

describe("scoreToStatus", () => {
  it("returns 推荐发布 for scores from 80 to 100", () => {
    expect(scoreToStatus(80)).toBe("推荐发布");
    expect(scoreToStatus(100)).toBe("推荐发布");
  });

  it("returns 建议优化 for scores from 60 to 79", () => {
    expect(scoreToStatus(60)).toBe("建议优化");
    expect(scoreToStatus(79)).toBe("建议优化");
  });

  it("returns 暂不建议 for scores below 60", () => {
    expect(scoreToStatus(59)).toBe("暂不建议");
    expect(scoreToStatus(12)).toBe("暂不建议");
  });
});
