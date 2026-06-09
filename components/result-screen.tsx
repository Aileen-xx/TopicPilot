import type { ReactNode } from "react";
import type { TopicAnalysisResult, TopicView } from "@/lib/topic-engine/types";

const tabs: Array<{ key: TopicView; en: string; zh: string }> = [
  { key: "picker", en: "PICKER", zh: "选题" },
  { key: "library", en: "LIBRARY", zh: "灵感库" },
  { key: "drafts", en: "DRAFTS", zh: "草稿" },
  { key: "profile", en: "PROFILE", zh: "我的" },
];

type ResultScreenProps = {
  rawIdea: string;
  result: TopicAnalysisResult;
  onBack: () => void;
  onSaveDraft: () => void;
  onTabSelect: (tab: TopicView) => void;
  activeTab: TopicView;
};

function ResultBlock({
  index,
  title,
  subtitle,
  content,
}: {
  index: string;
  title: string;
  subtitle: string;
  content: ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-[var(--soft-line)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="mono text-[11px] tracking-[0.14em] text-[var(--text)]">
          ({index}) {title}
        </span>
        <span className="sans text-[13px] text-[var(--muted)]">{subtitle}</span>
      </div>
      <div className="sans mt-4 text-[14px] leading-[1.8] text-[var(--text)]">{content}</div>
    </section>
  );
}

export function ResultScreen({
  rawIdea,
  result,
  onBack,
  onSaveDraft,
  onTabSelect,
  activeTab,
}: ResultScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-[22px] pb-6 pt-[18px]">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="mono text-[11px] tracking-[0.14em] text-[var(--text)]"
          >
            BACK
          </button>
          <span className="mono text-[11px] tracking-[0.18em] text-[var(--text)]">
            TOPIC RESULT
          </span>
        </header>

        <div className="mt-4 border-t border-[var(--soft-line)] pt-5">
          <p className="mono text-[11px] tracking-[0.2em] text-[var(--olive)]">
            TOPIC SCORE / {result.score}
          </p>

          <div className="mt-3 flex items-end justify-between gap-4">
            <h1 className="text-[42px] leading-none text-[var(--ink)]">{result.score}/100</h1>
            <span className="sans rounded-full border border-[var(--olive)] bg-[var(--olive-soft)] px-4 py-2 text-[12px] font-bold text-[var(--olive)]">
              {result.status}
            </span>
          </div>

          <p className="sans mt-4 text-[14px] leading-[1.8] text-[var(--text)]">
            原始想法：{rawIdea}
          </p>
          <p className="sans mt-3 text-[15px] font-bold leading-[1.8] text-[var(--ink)]">
            {result.summary}
          </p>
          <button
            type="button"
            onClick={onSaveDraft}
            className="sans mt-4 rounded-full border border-[var(--line)] px-4 py-2 text-[12px] font-bold text-[var(--ink)]"
          >
            保存为草稿
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <ResultBlock
            index="01"
            title="DIAGNOSIS"
            subtitle="反同质化诊断"
            content={
              <div className="space-y-3">
                <p>{result.homogeneityRisk}</p>
                <p>
                  高风险表达：
                  {result.diagnosis.riskKeywords.length > 0
                    ? result.diagnosis.riskKeywords.join(" / ")
                    : "当前没有明显高风险词"}
                </p>
                <p>容易撞题的角度：{result.diagnosis.collisionAngles.join(" / ")}</p>
                <p>为什么像培训号：{result.diagnosis.whyLooksGeneric}</p>
              </div>
            }
          />
          <ResultBlock
            index="02"
            title="RECOMMENDATION"
            subtitle="推荐切口"
            content={
              <div className="space-y-3">
                <p className="font-bold text-[var(--ink)]">{result.recommendedAngle}</p>
                <ul className="space-y-2">
                  {result.alternativeAngles.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            }
          />
          <ResultBlock index="03" title="AUDIENCE" subtitle="目标人群" content={result.audience} />
          <ResultBlock index="04" title="CORE PAIN" subtitle="核心痛点" content={result.painPoint} />
          <ResultBlock index="05" title="ANGLE" subtitle="差异化角度" content={result.angle} />
          <ResultBlock
            index="06"
            title="DIMENSIONS"
            subtitle="六维解释"
            content={
              <div className="space-y-3">
                {result.dimensionScores.map((item) => (
                  <div
                    key={item.name}
                    className="border-t border-[var(--soft-line)] pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-[var(--ink)]">{item.name}</span>
                      <span className="mono text-[12px] tracking-[0.12em] text-[var(--olive)]">
                        {item.score}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-[var(--text)]">{item.reason}</p>
                  </div>
                ))}
              </div>
            }
          />
          <ResultBlock
            index="07"
            title="CHECKLIST"
            subtitle="发布前检查"
            content={
              <ul className="space-y-2">
                {result.publishChecklist.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            }
          />
          <ResultBlock
            index="08"
            title="SERIES MAP"
            subtitle="系列内容拆解"
            content={
              <ol className="space-y-3">
                {result.seriesBreakdown.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="mono pt-1 text-[11px] tracking-[0.14em] text-[var(--muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            }
          />
        </div>
      </div>

      <footer className="border-t border-[var(--soft-line)] bg-[var(--card)] px-4 py-4">
        <div className="flex items-center justify-between">
          {tabs.map((tab) => (
            <button
              key={tab.en}
              type="button"
              onClick={() => onTabSelect(tab.key)}
              className="flex min-w-[64px] flex-col items-center gap-1"
            >
              <span
                className={`mono text-[9px] tracking-[0.14em] ${
                  activeTab === tab.key ? "text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
              >
                {tab.en}
              </span>
              <span
                className={`sans text-[11px] ${
                  activeTab === tab.key ? "font-bold text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
              >
                {tab.zh}
              </span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
