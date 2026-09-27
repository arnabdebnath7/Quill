import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadIntelligence, sanitizeTimeZone } from "@/lib/intelligence-data";
import { runMimoCoach } from "@/lib/quill-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Per-user throttle: each coach call is a paid model request.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const usage = new Map<string, number[]>();

function throttled(userId: string) {
  const now = Date.now();
  const recent = (usage.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    usage.set(userId, recent);
    return true;
  }
  recent.push(now);
  usage.set(userId, recent);
  return false;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI coaching is not configured yet.", code: "AI_NOT_CONFIGURED" }, { status: 503 });
  }
  if (throttled(user.id)) {
    return NextResponse.json({ error: "Mimo needs a short breather — try again in a minute.", code: "AI_RATE_LIMITED" }, { status: 429 });
  }

  let body: { question?: unknown; tz?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is valid; Mimo falls back to the default review question.
  }
  // Clients may prepend a few turns of conversation context, so allow a little more than a single question.
  const question = typeof body.question === "string" ? body.question.trim().slice(-2000) : undefined;
  const timeZone = sanitizeTimeZone(typeof body.tz === "string" ? body.tz : null);

  try {
    const intelligence = await loadIntelligence(user.id, timeZone);
    const coach = await runMimoCoach(intelligence, question);
    if (coach.status === "blocked") {
      return NextResponse.json({ error: coach.reason, code: "AI_RELEASE_BLOCKED" }, { status: 502 });
    }
    return NextResponse.json({ coach: coach.output, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[intelligence/coach] failed", error);
    return NextResponse.json({ error: "Mimo couldn't answer right now. Please try again." }, { status: 500 });
  }
}
