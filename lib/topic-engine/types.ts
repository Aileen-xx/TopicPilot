export type TopicStatus = "推荐发布" | "建议优化" | "暂不建议";
export type TopicView = "picker" | "library" | "drafts" | "profile";

export type CreatorProfile = {
  role: string;
  audience: string;
  credibility: string;
  avoid: string;
  columns: string[];
};

export type TopicDimensionScore = {
  name: string;
  score: number;
  reason: string;
};

export type TopicDiagnosis = {
  riskKeywords: string[];
  collisionAngles: string[];
  whyLooksGeneric: string;
};

export type TopicHistoryEntry = {
  id: string;
  rawIdea: string;
  createdAt: string;
  result: TopicAnalysisResult;
};

export type TopicDraftEntry = {
  id: string;
  rawIdea: string;
  createdAt: string;
  result: TopicAnalysisResult;
};

export type EditableCreatorProfile = CreatorProfile;

export type LibraryIdeaEntry = {
  id: string;
  category: string;
  title: string;
  tagline: string;
};

export type LibraryIdeasGenerationRequest = {
  history: TopicHistoryEntry[];
  profile: CreatorProfile;
};

export type LLMProvider = "deepseek" | "openai";

export type TopicAnalysisLLMResult = TopicAnalysisResult;

export type TopicEnhancementRequest = {
  rawIdea: string;
  profile: CreatorProfile;
  baseAnalysis: TopicAnalysisResult;
};

export type TopicAnalysisResult = {
  score: number;
  status: TopicStatus;
  summary: string;
  audience: string;
  painPoint: string;
  angle: string;
  homogeneityRisk: string;
  riskKeywords: string[];
  collisionAngles: string[];
  recommendedAngle: string;
  alternativeAngles: string[];
  dimensionScores: TopicDimensionScore[];
  diagnosis: TopicDiagnosis;
  publishChecklist: string[];
  seriesBreakdown: string[];
};
