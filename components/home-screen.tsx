import { useState } from "react";
import type { TopicView } from "@/lib/topic-engine/types";

type ProfileSummaryItem = {
  label: string;
  value: string;
};

type RecentTopic = {
  id?: string;
  title: string;
  tag: string;
  interactive?: boolean;
};

type HomeScreenProps = {
  rawIdea: string;
  onIdeaChange: (value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  profileSummary: ProfileSummaryItem[];
  recentTopics: RecentTopic[];
  inputError: string;
  onHistorySelect: (id: string) => void;
  hasRealHistory: boolean;
  activeTab: TopicView;
  onTabSelect: (tab: TopicView) => void;
};

const tabs: Array<{ key: TopicView; en: string; zh: string }> = [
  { key: "picker", en: "PICKER", zh: "选题" },
  { key: "library", en: "LIBRARY", zh: "灵感库" },
  { key: "drafts", en: "DRAFTS", zh: "草稿" },
  { key: "profile", en: "PROFILE", zh: "我的" },
];

const DEFAULT_VISIBLE_HISTORY_ITEMS = 3;

function getHistoryStatus(tag: string) {
  return tag.split("·").pop()?.trim() ?? tag.trim();
}

function getHistoryStatusDotClass(status: string) {
  if (status.includes("暂不")) return "bg-[#6f95c9]";
  if (status.includes("归档")) return "bg-[#b7b0a5]";
  return "bg-[#72855f]";
}

function HistoryItem({
  topic,
  index,
  onHistorySelect,
}: {
  topic: RecentTopic;
  index: number;
  onHistorySelect: (id: string) => void;
}) {
  const itemNumber = String(index + 1).padStart(2, "0");
  const status = getHistoryStatus(topic.tag);
  const dotClassName = getHistoryStatusDotClass(status);

  const content = (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <p className="sans text-[14px] leading-[1.7] text-[var(--ink)]">{topic.title}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`h-[8px] w-[8px] rounded-full ${dotClassName}`} />
          <p className="sans text-[11px] text-[var(--muted)]">{status}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 pl-2">
        <span className="mono pt-[2px] text-[10px] tracking-[0.14em] text-[var(--muted)]">
          {itemNumber}
        </span>
        <span className="mono text-[12px] text-[var(--muted)]">{">"}</span>
      </div>
    </div>
  );

  if (topic.interactive && topic.id) {
    return (
      <button
        type="button"
        onClick={() => onHistorySelect(topic.id ?? "")}
        className="w-full py-4 text-left first:pt-0 last:pb-0"
      >
        {content}
      </button>
    );
  }

  return <div className="py-4 first:pt-0 last:pb-0">{content}</div>;
}

export function HomeScreen({
  rawIdea,
  onIdeaChange,
  onAnalyze,
  isAnalyzing,
  profileSummary,
  recentTopics,
  inputError,
  onHistorySelect,
  hasRealHistory,
  activeTab,
  onTabSelect,
}: HomeScreenProps) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const visibleTopics = isHistoryExpanded
    ? recentTopics
    : recentTopics.slice(0, DEFAULT_VISIBLE_HISTORY_ITEMS);
  const canExpandHistory = recentTopics.length > DEFAULT_VISIBLE_HISTORY_ITEMS;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-[22px] pb-6 pt-[18px]">
        <header className="mono flex items-center justify-between text-[11px] tracking-[0.18em] text-[var(--text)]">
          <span>CATEGORY</span>
          <span>TRENDS</span>
          <span>ACCOUNT</span>
        </header>

        <div className="mt-4 border-t border-[var(--soft-line)] pt-6">
          <p className="mono text-[11px] tracking-[0.2em] text-[var(--olive)]">TOPICPILOT ISSUE / 01</p>
          <h1 className="mt-4 text-[42px] leading-[1.15] text-[var(--ink)]">选题研究所</h1>
          <p className="sans mt-3 max-w-[300px] text-[15px] leading-[1.9] text-[var(--text)]">
            把真实经历变成值得发布的系列内容
          </p>
        </div>

        <section className="mt-7 rounded-[22px] border border-[var(--soft-line)] bg-[var(--card)] px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <span className="mono text-[11px] tracking-[0.14em] text-[var(--text)]">(00) PROFILE</span>
            <span className="sans text-[13px] text-[var(--muted)]">预置账号画像</span>
          </div>

          <div className="mt-5 divide-y divide-[var(--soft-line)]">
            {profileSummary.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
              >
                <p className="sans text-[12px] text-[var(--muted)]">{item.label}</p>
                <p className="sans text-[13px] leading-[1.8] text-[var(--text)]">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[22px] border border-[var(--soft-line)] bg-[var(--card)] px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <span className="mono text-[11px] tracking-[0.14em] text-[var(--text)]">
              (01) TOPIC INPUT
            </span>
            <span className="sans text-[13px] text-[var(--muted)]">原始想法</span>
          </div>

          <p className="sans mt-4 text-[13px] leading-[1.8] text-[var(--text)]">
            输入你想记录或发布的想法 / 经历 / 观察
          </p>

          <textarea
            value={rawIdea}
            onChange={(event) => onIdeaChange(event.target.value)}
            placeholder={"例如：金融生转AI产品经理"}
            className="sans mt-4 h-[128px] w-full resize-none rounded-[18px] border border-[var(--soft-line)] bg-[var(--screen)] px-4 py-4 text-[14px] leading-[1.9] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />

          {inputError ? <p className="sans mt-3 text-[12px] text-[#8b3d2f]">{inputError}</p> : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`sans flex min-w-[116px] items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-[14px] font-bold text-[var(--card)] ${
                isAnalyzing ? "bg-[#9ea388] opacity-80" : "bg-[var(--olive)]"
              }`}
            >
              开始判断
            </button>
            {isAnalyzing ? (
              <span
                data-loading-spinner="true"
                aria-hidden="true"
                className="h-[14px] w-[14px] animate-spin rounded-full border-[2px] border-[rgba(114,133,95,0.3)] border-t-[var(--olive)]"
              />
            ) : null}
          </div>
        </section>

        <section className="mt-5 rounded-[22px] border border-[var(--soft-line)] bg-[var(--card)] px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <span className="mono text-[11px] tracking-[0.14em] text-[var(--text)]">(02) HISTORY</span>
            <span className="sans text-[13px] text-[var(--muted)]">
              {hasRealHistory ? "最近生成" : "示例选题"}
            </span>
          </div>

          <div className="mt-4 rounded-[18px] border border-[var(--soft-line)] bg-[var(--card)] px-4">
            {visibleTopics.map((topic, index) => (
              <div
                key={topic.id ?? `${topic.title}-${index}`}
                className="border-t border-[var(--soft-line)] first:border-t-0"
              >
                <HistoryItem topic={topic} index={index} onHistorySelect={onHistorySelect} />
              </div>
            ))}
          </div>

          {canExpandHistory ? (
            <button
              type="button"
              onClick={() => setIsHistoryExpanded((current) => !current)}
              className="sans mt-4 flex w-full items-center justify-center gap-2 text-[14px] text-[var(--text)]"
            >
              <span>{isHistoryExpanded ? "收起记录" : "查看全部记录"}</span>
              <span className="mono text-[12px]">{isHistoryExpanded ? "^" : "v"}</span>
            </button>
          ) : null}
        </section>
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
