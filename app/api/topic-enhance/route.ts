import { NextResponse } from "next/server";
import { enhanceTopic } from "@/lib/topic-engine/enhance-topic";
import type { TopicEnhancementRequest } from "@/lib/topic-engine/types";

function isEnhancementRequest(value: unknown): value is TopicEnhancementRequest {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<TopicEnhancementRequest>;
  return (
    typeof candidate.rawIdea === "string" &&
    !!candidate.profile &&
    typeof candidate.profile === "object" &&
    !!candidate.baseAnalysis &&
    typeof candidate.baseAnalysis === "object"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isEnhancementRequest(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const enhancement = await enhanceTopic(body);
    return NextResponse.json(enhancement);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Topic enhancement failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
