import { NextResponse } from "next/server";
import { generateLibraryIdeas } from "@/lib/topic-engine/generate-library-ideas";
import type { LibraryIdeasGenerationRequest, TopicHistoryEntry } from "@/lib/topic-engine/types";

function isHistoryEntry(value: unknown): value is TopicHistoryEntry {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { rawIdea?: unknown }).rawIdea === "string" &&
    typeof (value as { createdAt?: unknown }).createdAt === "string" &&
    !!(value as { result?: unknown }).result &&
    typeof (value as { result?: unknown }).result === "object"
  );
}

function isLibraryIdeasGenerationRequest(value: unknown): value is LibraryIdeasGenerationRequest {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<LibraryIdeasGenerationRequest>;
  return (
    Array.isArray(candidate.history) &&
    candidate.history.every(isHistoryEntry) &&
    !!candidate.profile &&
    typeof candidate.profile === "object"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isLibraryIdeasGenerationRequest(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const ideas = await generateLibraryIdeas(body);
    return NextResponse.json(ideas);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Library ideas generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
