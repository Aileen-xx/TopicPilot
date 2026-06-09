import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopicPilotApp } from "@/components/topic-pilot-app";
import { libraryIdeas } from "@/data/library-ideas";

const STORAGE_KEY = "topicpilot-history";
const DRAFT_STORAGE_KEY = "topicpilot-drafts";
const PROFILE_STORAGE_KEY = "topicpilot-profile";
const TAB_LABELS = ["PICKER", "LIBRARY", "DRAFTS", "PROFILE", "BACK"];

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function getTextarea(container: HTMLElement) {
  const textarea = container.querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error("textarea not found");
  }
  return textarea;
}

function getPrimaryButton(container: HTMLElement) {
  const textarea = getTextarea(container);
  const section = textarea.closest("section");
  const button = section?.querySelector("button");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("primary button not found");
  }
  return button;
}

function getContentButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll("button")).filter(
    (item) => !TAB_LABELS.some((label) => item.textContent?.includes(label)),
  ) as HTMLButtonElement[];
}

async function typeInTextarea(container: HTMLElement, value: string) {
  const textarea = getTextarea(container);
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  const setValue = descriptor?.set;
  if (!setValue) {
    throw new Error("textarea value setter not found");
  }
  await act(async () => {
    setValue.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function clickPrimaryButton(container: HTMLElement) {
  const button = getPrimaryButton(container);
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function getButtonByText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text),
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`button not found: ${text}`);
  }
  return button;
}

async function clickButtonByText(container: HTMLElement, text: string) {
  const button = getButtonByText(container, text);
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function getTextareaByName(container: HTMLElement, name: string) {
  const textarea = container.querySelector(`textarea[name="${name}"]`);
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error(`textarea not found: ${name}`);
  }
  return textarea;
}

async function typeInNamedTextarea(container: HTMLElement, name: string, value: string) {
  const textarea = getTextareaByName(container, name);
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  const setValue = descriptor?.set;
  if (!setValue) {
    throw new Error("textarea value setter not found");
  }
  await act(async () => {
    setValue.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("TopicPilotApp", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("stays on the home screen for empty input", async () => {
    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await clickPrimaryButton(container);

    expect(container.textContent).toContain("TOPIC INPUT");
    expect(container.textContent).not.toContain("TOPIC RESULT");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("renders the picker home without category chips and keeps the primary action available", async () => {
    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    expect(container.textContent).toContain("PROFILE");
    expect(container.textContent).toContain("TOPIC INPUT");
    expect(container.textContent).toContain("HISTORY");
    expect(getContentButtons(container)).toHaveLength(1);

    await typeInTextarea(container, "homepage refresh idea");
    expect(getTextarea(container).value).toBe("homepage refresh idea");
    expect(getPrimaryButton(container)).toBeInstanceOf(HTMLButtonElement);
  });

  it("shows only the latest three history items by default and expands on demand", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: "history-1", rawIdea: "history item 1", result: { status: "建议优化" } },
        { id: "history-2", rawIdea: "history item 2", result: { status: "暂不建议" } },
        { id: "history-3", rawIdea: "history item 3", result: { status: "已归档" } },
        { id: "history-4", rawIdea: "history item 4", result: { status: "建议优化" } },
        { id: "history-5", rawIdea: "history item 5", result: { status: "建议优化" } },
      ]),
    );

    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    expect(container.textContent).toContain("history item 1");
    expect(container.textContent).toContain("history item 2");
    expect(container.textContent).toContain("history item 3");
    expect(container.textContent).not.toContain("history item 4");
    expect(container.textContent).not.toContain("history item 5");
    expect(container.textContent).not.toContain("本地记录");
    expect(container.textContent).toContain("建议优化");
    expect(container.textContent).toContain("暂不建议");
    expect(container.textContent).toContain("已归档");
    expect(container.textContent).toContain("查看全部记录");

    await clickButtonByText(container, "查看全部记录");

    expect(container.textContent).toContain("history item 4");
    expect(container.textContent).toContain("history item 5");
    expect(container.textContent).toContain("收起记录");

    await clickButtonByText(container, "收起记录");

    expect(container.textContent).not.toContain("history item 4");
    expect(container.textContent).not.toContain("history item 5");
  });

  it("writes successful analyses to local history and replays saved results", async () => {
    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await typeInTextarea(container, "history replay idea");
    await clickPrimaryButton(container);

    const rawStorage = localStorage.getItem(STORAGE_KEY);
    expect(rawStorage).not.toBeNull();
    const history = JSON.parse(rawStorage ?? "[]") as Array<{
      rawIdea: string;
      result: { summary: string };
    }>;
    expect(history).toHaveLength(1);
    expect(history[0]?.rawIdea).toBe("history replay idea");
    expect(history[0]?.result.summary).toBeTruthy();

    await clickButtonByText(container, "BACK");
    expect(container.textContent).toContain("history replay idea");

    await act(async () => {
      getButtonByText(container, "history replay idea").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(container.textContent).toContain("TOPIC RESULT");
    expect(container.textContent).toContain("history replay idea");
  });

  it("keeps the initial markup stable before local storage is replayed", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "history-1",
          rawIdea: "persisted history idea",
          createdAt: "2026-06-08T00:00:00.000Z",
          result: {
            status: "建议优化",
            score: 72,
            summary: "已有历史记录",
            recommendedAngle: "从真实项目卡点切入",
            alternativeAngles: ["补充一个备选角度"],
            diagnosis: {
              riskKeywords: [],
              collisionAngles: [],
              whyLooksGeneric: "示例原因",
            },
            dimensionScores: {
              authenticity: 80,
              specificity: 75,
              novelty: 70,
              feasibility: 68,
            },
          },
        },
      ]),
    );

    const originalWindow = globalThis.window;

    Object.defineProperty(globalThis, "window", {
      value: undefined,
      configurable: true,
    });
    const serverMarkup = renderToString(<TopicPilotApp />);

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
    const clientInitialMarkup = renderToString(<TopicPilotApp />);

    expect(serverMarkup).toBe(clientInitialMarkup);
  });

  it("keeps only the latest 10 history entries", async () => {
    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    for (let index = 1; index <= 11; index += 1) {
      await typeInTextarea(container, `history item ${index}`);
      await clickPrimaryButton(container);
      await clickButtonByText(container, "BACK");
    }

    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Array<{ rawIdea: string }>;
    expect(history).toHaveLength(10);
    expect(history[0]?.rawIdea).toBe("history item 11");
    expect(history[9]?.rawIdea).toBe("history item 2");
  });

  it("fills the picker input from a library template without auto analyzing", async () => {
    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await clickButtonByText(container, "LIBRARY");
    const firstIdea = getContentButtons(container)[0];
    if (!firstIdea) {
      throw new Error("library idea not found");
    }
    const ideaTitle =
      firstIdea.querySelector("p")?.textContent?.trim() ?? firstIdea.textContent?.trim() ?? "";

    await act(async () => {
      firstIdea.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("TOPIC INPUT");
    expect(container.textContent).not.toContain("TOPIC RESULT");
    expect(getTextarea(container).value).toBe(ideaTitle);
  });

  it("requests fresh library ideas when entering the library tab and uses the generated results", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "generated-idea-1",
          category: "生成灵感",
          title: "最近几次分析里反复出现的那个卡点，真正暴露了我什么短板",
          tagline: "把最近分析过的方向抽成一条更适合展开的复盘题。",
        },
      ],
    }) as unknown as typeof fetch;

    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await clickButtonByText(container, "LIBRARY");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/library-ideas",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(container.textContent).toContain("最近几次分析里反复出现的那个卡点，真正暴露了我什么短板");

    const firstIdea = getContentButtons(container)[0];
    if (!firstIdea) {
      throw new Error("generated library idea not found");
    }

    await act(async () => {
      firstIdea.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getTextarea(container).value).toBe(
      "最近几次分析里反复出现的那个卡点，真正暴露了我什么短板",
    );
  });

  it("falls back to the static library ideas when fresh generation fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await clickButtonByText(container, "LIBRARY");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/library-ideas",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(container.textContent).toContain(libraryIdeas[0]?.title ?? "");
  });

  it("disables the analyze button and shows a loading spinner while analysis is pending", async () => {
    const deferred = createDeferred<{
      ok: boolean;
      json: () => Promise<{
        score: number;
        status: string;
        summary: string;
        audience: string;
        painPoint: string;
        angle: string;
        homogeneityRisk: string;
        riskKeywords: string[];
        collisionAngles: string[];
        recommendedAngle: string;
        alternativeAngles: string[];
        dimensionScores: Array<{ name: string; score: number; reason: string }>;
        diagnosis: {
          riskKeywords: string[];
          collisionAngles: string[];
          whyLooksGeneric: string;
        };
        publishChecklist: string[];
        seriesBreakdown: string[];
      }>;
    }>();
    global.fetch = vi.fn().mockImplementation(() => deferred.promise) as unknown as typeof fetch;

    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await typeInTextarea(container, "pending analysis idea");
    await clickPrimaryButton(container);

    const button = getPrimaryButton(container);
    expect(button.disabled).toBe(true);
    expect(container.querySelector('[data-loading-spinner="true"]')).not.toBeNull();

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve({
        ok: true,
        json: async () => ({
          score: 88,
          status: "推荐发布",
          summary: "pending summary",
          audience: "pending audience",
          painPoint: "pending pain point",
          angle: "pending angle",
          homogeneityRisk: "pending risk",
          riskKeywords: ["pending keyword"],
          collisionAngles: ["pending collision"],
          recommendedAngle: "pending recommendation",
          alternativeAngles: ["pending alternative"],
          dimensionScores: [
            {
              name: "真实性",
              score: 86,
              reason: "pending reason",
            },
          ],
          diagnosis: {
            riskKeywords: ["pending keyword"],
            collisionAngles: ["pending collision"],
            whyLooksGeneric: "pending why",
          },
          publishChecklist: ["pending checklist"],
          seriesBreakdown: ["pending series"],
        }),
      });
      await deferred.promise;
    });

    expect(container.querySelector('[data-loading-spinner="true"]')).toBeNull();
    expect(container.textContent).toContain("TOPIC RESULT");
  });

  it("saves a result as a draft, opens it, and deletes it", async () => {
    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await typeInTextarea(container, "draft idea");
    await clickPrimaryButton(container);

    const saveButton = getContentButtons(container)[0];
    if (!saveButton) {
      throw new Error("save draft button not found");
    }
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const rawStorage = localStorage.getItem(DRAFT_STORAGE_KEY);
    expect(rawStorage).not.toBeNull();
    const drafts = JSON.parse(rawStorage ?? "[]") as Array<{ rawIdea: string }>;
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.rawIdea).toBe("draft idea");

    await clickButtonByText(container, "DRAFTS");
    expect(container.textContent).toContain("draft idea");

    const [, openButton] = getContentButtons(container);
    if (!openButton) {
      throw new Error("draft action buttons not found");
    }

    await act(async () => {
      openButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("TOPIC RESULT");
    expect(container.textContent).toContain("draft idea");

    await clickButtonByText(container, "DRAFTS");
    const [, , deleteButton] = getContentButtons(container);
    if (!deleteButton) {
      throw new Error("delete draft button not found");
    }
    await act(async () => {
      deleteButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).not.toContain("draft idea");
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) ?? "[]")).toHaveLength(0);
  });

  it("persists the editable profile and uses it for later analysis", async () => {
    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await clickButtonByText(container, "PROFILE");
    await typeInNamedTextarea(container, "audience", "career switchers without technical backgrounds");

    const saveButton = getContentButtons(container)[0];
    if (!saveButton) {
      throw new Error("save profile button not found");
    }
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const savedProfile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? "{}") as {
      audience?: string;
    };
    expect(savedProfile.audience).toBe("career switchers without technical backgrounds");

    await act(async () => {
      root.unmount();
    });

    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await clickButtonByText(container, "PROFILE");
    expect(getTextareaByName(container, "audience").value).toBe(
      "career switchers without technical backgrounds",
    );

    await clickButtonByText(container, "PICKER");
    await typeInTextarea(container, "profile-backed idea");
    await clickPrimaryButton(container);

    expect(container.textContent).toContain("career switchers without technical backgrounds");
  });

  it("shows the enhanced summary and recommendation when the LLM request succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: "值得写，但建议先把身份词收成一个具体项目。",
        recommendedAngle: "我第一次做 AI 财报项目时，真正卡住我的不是技术。",
        alternativeAngles: [
          "我为什么不再用“转 AI”这种大词来描述自己。",
          "我做第一个 AI demo 时，最先暴露出来的是需求判断问题。",
        ],
      }),
    }) as unknown as typeof fetch;

    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await typeInTextarea(container, "llm enhanced idea");
    await clickPrimaryButton(container);

    expect(container.textContent).toContain("值得写，但建议先把身份词收成一个具体项目。");
    expect(container.textContent).toContain("我第一次做 AI 财报项目时，真正卡住我的不是技术。");
  });

  it("falls back to the local result when the LLM request fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

    await act(async () => {
      root.render(<TopicPilotApp />);
    });

    await typeInTextarea(container, "fallback idea");
    await clickPrimaryButton(container);

    expect(container.textContent).toContain("TOPIC RESULT");
    expect(container.textContent).toContain("fallback idea");
    expect(container.textContent).not.toContain("我第一次做 AI 财报项目时，真正卡住我的不是技术。");
  });
});
