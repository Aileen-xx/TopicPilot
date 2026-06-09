import type { TopicStatus } from "@/lib/topic-engine/types";

export const broadRiskKeywords = [
  "0基础",
  "零基础",
  "转ai",
  "转 AI",
  "上岸",
  "逆袭",
  "必备",
  "干货",
  "大全",
  "攻略",
  "学习路线",
  "工具",
  "100个",
];

export const expertOnlyKeywords = ["必备", "大全", "清单", "工具", "路线", "指南"];

export const credibilityKeywords = [
  "项目",
  "财报",
  "demo",
  "复盘",
  "踩坑",
  "为什么不",
  "放弃",
  "反馈",
  "解析",
];

export const collisionAngles = [
  "学习路线",
  "工具清单",
  "转行攻略",
  "面试经验",
  "岗位介绍",
];

export function scoreToStatus(score: number): TopicStatus {
  if (score >= 80) return "推荐发布";
  if (score >= 60) return "建议优化";
  return "暂不建议";
}
