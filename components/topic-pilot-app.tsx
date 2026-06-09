"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { recentTopics } from "@/data/recent-topics";
import { libraryIdeas } from "@/data/library-ideas";
import { analyzeTopicWithEnhancement } from "@/lib/topic-engine/analyze-topic-with-enhancement";
import { defaultProfile } from "@/lib/topic-engine/profile";
import type {
  EditableCreatorProfile,
  LibraryIdeaEntry,
  TopicAnalysisResult,
  TopicDraftEntry,
  TopicHistoryEntry,
  TopicView,
} from "@/lib/topic-engine/types";
import { HomeScreen } from "@/components/home-screen";
import { ResultScreen } from "@/components/result-screen";

const TOPIC_HISTORY_STORAGE_KEY = "topicpilot-history";
const TOPIC_DRAFT_STORAGE_KEY = "topicpilot-drafts";
const TOPIC_PROFILE_STORAGE_KEY = "topicpilot-profile";
const MAX_HISTORY_ITEMS = 10;
const MAX_LIBRARY_CONTEXT_HISTORY_ITEMS = 5;

type ProfileField = keyof EditableCreatorProfile;

function createStoredEntry<T extends TopicAnalysisResult>(
  rawIdea: string,
  result: T,
): TopicHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rawIdea,
    createdAt: new Date().toISOString(),
    result,
  };
}

function createDraftEntry(rawIdea: string, result: TopicAnalysisResult): TopicDraftEntry {
  return createStoredEntry(rawIdea, result);
}

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

function isLibraryIdeaEntryArray(value: unknown): value is LibraryIdeaEntry[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { category?: unknown }).category === "string" &&
        typeof (item as { title?: unknown }).title === "string" &&
        typeof (item as { tagline?: unknown }).tagline === "string",
    )
  );
}

function TabFooter({
  activeTab,
  onTabSelect,
}: {
  activeTab: TopicView;
  onTabSelect: (tab: TopicView) => void;
}) {
  const tabs: Array<{ key: TopicView; en: string; zh: string }> = [
    { key: "picker", en: "PICKER", zh: "选题" },
    { key: "library", en: "LIBRARY", zh: "灵感库" },
    { key: "drafts", en: "DRAFTS", zh: "草稿" },
    { key: "profile", en: "PROFILE", zh: "我的" },
  ];

  return (
    <footer className="border-t border-[var(--soft-line)] bg-[var(--card)] px-4 py-4">
      <div className="flex items-center justify-between">
        {tabs.map((tab) => (
          <button
            key={tab.key}
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
  );
}

function LibraryView({
  ideas,
  activeTab,
  onTabSelect,
  onUseIdea,
}: {
  ideas: LibraryIdeaEntry[];
  activeTab: TopicView;
  onTabSelect: (tab: TopicView) => void;
  onUseIdea: (idea: LibraryIdeaEntry) => void;
}) {
  const groupedIdeas = ideas.reduce<Record<string, LibraryIdeaEntry[]>>((acc, item) => {
    acc[item.category] ??= [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-[22px] pb-6 pt-[18px]">
        <header className="mono flex items-center justify-between text-[11px] tracking-[0.18em] text-[var(--text)]">
          <span>LIBRARY</span>
          <span>TEMPLATES</span>
          <span>IDEAS</span>
        </header>

        <div className="mt-4 border-t border-[var(--soft-line)] pt-5">
          <p className="mono text-[11px] tracking-[0.2em] text-[var(--olive)]">
            TOPICPILOT ISSUE / 02
          </p>
          <h1 className="mt-3 text-[36px] leading-[1.25] text-[var(--ink)]">模板灵感库</h1>
          <p className="sans mt-3 text-[15px] leading-[1.8] text-[var(--text)]">
            先选一个更具体的切口，再带回选题页继续判断。
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {Object.entries(groupedIdeas).map(([category, entries], sectionIndex) => (
            <section key={category} className="rounded-[20px] border border-[var(--soft-line)] bg-[var(--card)] p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="mono text-[11px] tracking-[0.14em] text-[var(--text)]">
                  ({String(sectionIndex + 1).padStart(2, "0")}) {category}
                </span>
                <span className="sans text-[13px] text-[var(--muted)]">{entries.length} 条模板</span>
              </div>

              <div className="mt-4 space-y-3">
                {entries.map((idea) => (
                  <button
                    key={idea.id}
                    type="button"
                    onClick={() => onUseIdea(idea)}
                    className="w-full border-t border-[var(--soft-line)] pt-3 text-left first:border-t-0 first:pt-0"
                  >
                    <p className="sans text-[14px] leading-[1.7] text-[var(--ink)]">{idea.title}</p>
                    <p className="sans mt-1 text-[12px] leading-[1.6] text-[var(--muted)]">{idea.tagline}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <TabFooter activeTab={activeTab} onTabSelect={onTabSelect} />
    </div>
  );
}

function DraftsView({
  drafts,
  activeTab,
  onTabSelect,
  onOpenDraft,
  onDeleteDraft,
}: {
  drafts: TopicDraftEntry[];
  activeTab: TopicView;
  onTabSelect: (tab: TopicView) => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-[22px] pb-6 pt-[18px]">
        <header className="mono flex items-center justify-between text-[11px] tracking-[0.18em] text-[var(--text)]">
          <span>DRAFTS</span>
          <span>LOCAL</span>
          <span>SAVED</span>
        </header>

        <div className="mt-4 border-t border-[var(--soft-line)] pt-5">
          <p className="mono text-[11px] tracking-[0.2em] text-[var(--olive)]">
            TOPICPILOT ISSUE / 03
          </p>
          <h1 className="mt-3 text-[36px] leading-[1.25] text-[var(--ink)]">草稿箱</h1>
          <p className="sans mt-3 text-[15px] leading-[1.8] text-[var(--text)]">
            保存你想继续打磨的题，之后可以直接回看结果。
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-[20px] border border-[var(--soft-line)] bg-[var(--card)] p-4">
          <p className="sans text-[13px] text-[var(--text)]">这里保存的是你主动留下的结果快照。</p>
          <button
            type="button"
            onClick={() => onTabSelect("picker")}
            className="sans rounded-full border border-[var(--line)] px-3 py-2 text-[12px] text-[var(--ink)]"
          >
            返回选题
          </button>
        </div>

        <section className="mt-6 rounded-[20px] border border-[var(--soft-line)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="mono text-[11px] tracking-[0.14em] text-[var(--text)]">(01) SAVED DRAFTS</span>
            <span className="sans text-[13px] text-[var(--muted)]">{drafts.length} 条草稿</span>
          </div>

          <div className="mt-4 space-y-4">
            {drafts.length === 0 ? (
              <p className="sans text-[14px] leading-[1.8] text-[var(--muted)]">
                还没有草稿。你可以先在结果页点击“保存为草稿”。
              </p>
            ) : (
              drafts.map((draft) => (
                <div key={draft.id} className="border-t border-[var(--soft-line)] pt-4 first:border-t-0 first:pt-0">
                  <p className="sans text-[14px] leading-[1.7] text-[var(--ink)]">{draft.rawIdea}</p>
                  <p className="sans mt-1 text-[12px] text-[var(--muted)]">
                    {formatDate(draft.createdAt)} · {draft.result.status} · {draft.result.score}/100
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDraft(draft.id)}
                      className="sans rounded-full border border-[var(--line)] px-3 py-2 text-[12px] text-[var(--ink)]"
                    >
                      打开
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(draft.id)}
                      className="sans rounded-full border border-[var(--line)] px-3 py-2 text-[12px] text-[var(--ink)]"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <TabFooter activeTab={activeTab} onTabSelect={onTabSelect} />
    </div>
  );
}

function ProfileView({
  profileForm,
  activeTab,
  onTabSelect,
  onProfileChange,
  onSaveProfile,
}: {
  profileForm: EditableCreatorProfile;
  activeTab: TopicView;
  onTabSelect: (tab: TopicView) => void;
  onProfileChange: (field: ProfileField, value: string) => void;
  onSaveProfile: () => void;
}) {
  const fields: Array<{ key: ProfileField; label: string; name: string }> = [
    { key: "role", label: "我是谁", name: "role" },
    { key: "audience", label: "我写给谁", name: "audience" },
    { key: "credibility", label: "我凭什么写", name: "credibility" },
    { key: "avoid", label: "我不写什么", name: "avoid" },
    { key: "columns", label: "我的长期栏目", name: "columns" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-[22px] pb-6 pt-[18px]">
        <header className="mono flex items-center justify-between text-[11px] tracking-[0.18em] text-[var(--text)]">
          <span>PROFILE</span>
          <span>LOCAL</span>
          <span>ACCOUNT</span>
        </header>

        <div className="mt-4 border-t border-[var(--soft-line)] pt-5">
          <p className="mono text-[11px] tracking-[0.2em] text-[var(--olive)]">
            TOPICPILOT ISSUE / 04
          </p>
          <h1 className="mt-3 text-[36px] leading-[1.25] text-[var(--ink)]">我的画像</h1>
          <p className="sans mt-3 text-[15px] leading-[1.8] text-[var(--text)]">
            后续所有判断都会基于你保存在本地的这份账号画像。
          </p>
        </div>

        <section className="mt-6 rounded-[20px] border border-[var(--soft-line)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="mono text-[11px] tracking-[0.14em] text-[var(--text)]">(01) EDIT PROFILE</span>
            <span className="sans text-[13px] text-[var(--muted)]">本地保存</span>
          </div>

          <div className="mt-4 space-y-4">
            {fields.map((field) => {
              const value =
                field.key === "columns" ? profileForm.columns.join(" / ") : profileForm[field.key];

              return (
                <div key={field.key}>
                  <p className="sans text-[12px] text-[var(--muted)]">{field.label}</p>
                  <textarea
                    name={field.name}
                    value={value}
                    onChange={(event) => onProfileChange(field.key, event.target.value)}
                    className="sans mt-2 h-[92px] w-full resize-none rounded-[18px] border border-[var(--soft-line)] bg-[var(--screen)] px-4 py-3 text-[14px] leading-[1.8] text-[var(--text)] outline-none"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onSaveProfile}
            className="sans mt-4 w-full rounded-full bg-[var(--ink)] px-4 py-4 text-[14px] font-bold text-[var(--card)]"
          >
            保存画像
          </button>
        </section>
      </div>

      <TabFooter activeTab={activeTab} onTabSelect={onTabSelect} />
    </div>
  );
}

export function TopicPilotApp() {
  const [activeTab, setActiveTab] = useState<TopicView>("picker");
  const [rawIdea, setRawIdea] = useState("");
  const [submittedIdea, setSubmittedIdea] = useState("");
  const [result, setResult] = useState<TopicAnalysisResult | null>(null);
  const [history, setHistory] = useState<TopicHistoryEntry[]>([]);
  const [drafts, setDrafts] = useState<TopicDraftEntry[]>([]);
  const [currentProfile, setCurrentProfile] = useState<EditableCreatorProfile>(defaultProfile);
  const [profileForm, setProfileForm] = useState<EditableCreatorProfile>(defaultProfile);
  const [sessionLibraryIdeas, setSessionLibraryIdeas] = useState<LibraryIdeaEntry[]>(libraryIdeas);
  const [inputError, setInputError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const previousTabRef = useRef<TopicView>("picker");
  const isAnalyzingRef = useRef(false);

  useEffect(() => {
    setHistory(readJsonStorage<TopicHistoryEntry[]>(TOPIC_HISTORY_STORAGE_KEY, []));
    setDrafts(readJsonStorage<TopicDraftEntry[]>(TOPIC_DRAFT_STORAGE_KEY, []));

    const storedProfile = readJsonStorage<EditableCreatorProfile>(
      TOPIC_PROFILE_STORAGE_KEY,
      defaultProfile,
    );
    setCurrentProfile(storedProfile);
    setProfileForm(storedProfile);
  }, []);

  useEffect(() => {
    const enteredLibrary = activeTab === "library" && previousTabRef.current !== "library";
    previousTabRef.current = activeTab;
    if (!enteredLibrary) return;

    let isCancelled = false;

    async function refreshLibraryIdeas() {
      try {
        const response = await fetch("/api/library-ideas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            history: history.slice(0, MAX_LIBRARY_CONTEXT_HISTORY_ITEMS),
            profile: currentProfile,
          }),
        });

        if (!response.ok) {
          throw new Error("library ideas request failed");
        }

        const data = (await response.json()) as unknown;
        if (!isLibraryIdeaEntryArray(data)) {
          throw new Error("library ideas response is invalid");
        }

        if (!isCancelled) {
          setSessionLibraryIdeas(data);
        }
      } catch {
        if (!isCancelled) {
          setSessionLibraryIdeas(libraryIdeas);
        }
      }
    }

    void refreshLibraryIdeas();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, currentProfile, history]);

  const profileSummary = useMemo(
    () => [
      { label: "我是谁", value: currentProfile.role },
      { label: "我写给谁", value: currentProfile.audience },
      { label: "我凭什么写", value: currentProfile.credibility },
      { label: "我不写什么", value: currentProfile.avoid },
      { label: "我的长期栏目", value: currentProfile.columns.join(" / ") },
    ],
    [currentProfile],
  );

  const recentHistory = history.map((entry) => ({
    id: entry.id,
    title: entry.rawIdea,
    tag: `本地记录 · ${entry.result.status}`,
    interactive: true,
  }));

  function persistHistory(nextHistory: TopicHistoryEntry[]) {
    setHistory(nextHistory);
    writeJsonStorage(TOPIC_HISTORY_STORAGE_KEY, nextHistory);
  }

  function persistDrafts(nextDrafts: TopicDraftEntry[]) {
    setDrafts(nextDrafts);
    writeJsonStorage(TOPIC_DRAFT_STORAGE_KEY, nextDrafts);
  }

  function handleTabSelect(tab: TopicView) {
    setActiveTab(tab);
  }

  function handleIdeaChange(value: string) {
    setRawIdea(value);
    if (inputError && value.trim()) {
      setInputError("");
    }
  }

  async function handleAnalyze() {
    if (isAnalyzingRef.current) {
      return;
    }

    const trimmedIdea = rawIdea.trim();
    if (!trimmedIdea) {
      setInputError("请先输入真实经历或关键词");
      return;
    }

    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    try {
      const analysis = await analyzeTopicWithEnhancement(trimmedIdea, currentProfile);
      if (!analysis) return;

      const nextHistory = [createStoredEntry(trimmedIdea, analysis), ...history].slice(0, MAX_HISTORY_ITEMS);
      persistHistory(nextHistory);
      setSubmittedIdea(trimmedIdea);
      setResult(analysis);
      setInputError("");
      setActiveTab("picker");
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }

  function handleHistoryOpen(id: string) {
    const entry = history.find((item) => item.id === id);
    if (!entry) return;

    setRawIdea(entry.rawIdea);
    setSubmittedIdea(entry.rawIdea);
    setResult(entry.result);
    setInputError("");
    setActiveTab("picker");
  }

  function handleReset() {
    setResult(null);
  }

  function handleUseLibraryIdea(idea: LibraryIdeaEntry) {
    setRawIdea(idea.title);
    setSubmittedIdea("");
    setResult(null);
    setInputError("");
    setActiveTab("picker");
  }

  function handleSaveDraft() {
    if (!result || !submittedIdea) return;

    const nextDrafts = [createDraftEntry(submittedIdea, result), ...drafts];
    persistDrafts(nextDrafts);
  }

  function handleOpenDraft(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;

    setRawIdea(draft.rawIdea);
    setSubmittedIdea(draft.rawIdea);
    setResult(draft.result);
    setInputError("");
    setActiveTab("picker");
  }

  function handleDeleteDraft(id: string) {
    const nextDrafts = drafts.filter((item) => item.id !== id);
    persistDrafts(nextDrafts);
  }

  function handleProfileChange(field: ProfileField, value: string) {
    setProfileForm((prev) => ({
      ...prev,
      [field]:
        field === "columns"
          ? value
              .split("/")
              .map((item) => item.trim())
              .filter(Boolean)
          : value,
    }));
  }

  function handleSaveProfile() {
    const normalizedProfile: EditableCreatorProfile = {
      role: profileForm.role.trim(),
      audience: profileForm.audience.trim(),
      credibility: profileForm.credibility.trim(),
      avoid: profileForm.avoid.trim(),
      columns: profileForm.columns.map((item) => item.trim()).filter(Boolean),
    };

    setCurrentProfile(normalizedProfile);
    setProfileForm(normalizedProfile);
    writeJsonStorage(TOPIC_PROFILE_STORAGE_KEY, normalizedProfile);
  }

  let content: React.ReactNode;

  if (activeTab === "library") {
    content = (
      <LibraryView
        ideas={sessionLibraryIdeas}
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
        onUseIdea={handleUseLibraryIdea}
      />
    );
  } else if (activeTab === "drafts") {
    content = (
      <DraftsView
        drafts={drafts}
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
        onOpenDraft={handleOpenDraft}
        onDeleteDraft={handleDeleteDraft}
      />
    );
  } else if (activeTab === "profile") {
    content = (
      <ProfileView
        profileForm={profileForm}
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
        onProfileChange={handleProfileChange}
        onSaveProfile={handleSaveProfile}
      />
    );
  } else if (result) {
    content = (
      <ResultScreen
        rawIdea={submittedIdea}
        result={result}
        onBack={handleReset}
        onSaveDraft={handleSaveDraft}
        onTabSelect={handleTabSelect}
        activeTab={activeTab}
      />
    );
  } else {
    content = (
      <HomeScreen
        rawIdea={rawIdea}
        onIdeaChange={handleIdeaChange}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        profileSummary={profileSummary}
        recentTopics={recentHistory.length > 0 ? recentHistory : recentTopics}
        inputError={inputError}
        onHistorySelect={handleHistoryOpen}
        hasRealHistory={recentHistory.length > 0}
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-6 text-[var(--text)]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--screen)] shadow-[0_18px_36px_rgba(0,0,0,0.08)]">
        {content}
      </div>
    </main>
  );
}
