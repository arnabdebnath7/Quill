import { Agent, run } from "@openai/agents";
import { z } from "zod";
import type { IntelligenceResult } from "@/lib/intelligence";

const CoachOutput = z.object({
  headline: z.string().min(1).max(140),
  summary: z.string().min(1).max(700),
  actions: z.array(z.string().min(1).max(220)).max(3),
  evidenceIds: z.array(z.string()).max(12),
  safetyNote: z.string().min(1).max(220),
});

export type QuillCoachOutput = z.infer<typeof CoachOutput>;

const SYSTEM_INSTRUCTIONS = `You are Memo, the private AI companion inside Quill.

Your job is to help the user understand their own recorded trading behaviour. You receive a deterministic evidence packet prepared by Quill and must treat it as the source of truth.

Rules:
- Never invent facts, trades, metrics, evidence IDs, dates, sample sizes, or memories.
- Never give buy/sell/hold recommendations, price targets, profit promises, or market forecasts.
- Do not turn correlation into causation. Say "observed", "in this sample", "documented", or "worth reviewing" when appropriate.
- Prefer concrete behavioural actions: review a trade, protect decision quality, complete a check-in, compare a setup, or inspect a rule break.
- Only cite evidence IDs that appear in the supplied packet.
- When evidence is weak or missing, say so clearly and keep the advice conservative.
- Conversation context is useful for continuity, but the evidence packet always outranks assumptions from earlier turns.
- Keep the answer specific to the user's recorded data. Do not discuss external market conditions because they are outside Quill's evidence boundary.
- Sound like a calm, sharp product copilot: concise, direct, non-judgmental, and useful.

Return structured output only.`;

const agent = new Agent({
  name: "Memo",
  instructions: SYSTEM_INSTRUCTIONS,
  outputType: CoachOutput,
});

function compactPacket(intelligence: IntelligenceResult) {
  return {
    generatedAt: intelligence.generatedAt,
    confidence: intelligence.confidence,
    sampleSize: intelligence.sampleSize,
    readiness: intelligence.readiness,
    weekly: intelligence.weekly,
    observations: intelligence.observations,
    edge: intelligence.edge,
    risks: intelligence.risks,
    correlations: intelligence.correlations.map((item) => ({
      id: item.id,
      label: item.label,
      headline: item.headline,
      detail: item.detail,
      higher: item.higher,
      lower: item.lower,
      sampleSize: item.sampleSize,
      tone: item.tone,
      strength: item.strength,
      evidence: item.evidence,
    })),
    nextActions: intelligence.nextActions,
  };
}

const FORECAST_PATTERNS = [
  /\bwill\s+(rise|fall|go up|go down)\b/i,
  /\bprice\s+target\b/i,
  /\bbuy\b.*\bstock\b/i,
  /\bsell\b.*\bstock\b/i,
  /\bhold\b.*\bstock\b/i,
  /\bguarantee[sd]?\b/i,
  /\bguaranteed\b/i,
];

function validateRelease(output: QuillCoachOutput, intelligence: IntelligenceResult) {
  const allowedIds = new Set(
    intelligence.correlations.flatMap((correlation) =>
      correlation.evidence.map((point) => point.id),
    ),
  );

  const hasUnsupportedEvidenceIds = output.evidenceIds.some((id) => !allowedIds.has(id));
  const combinedText = [output.headline, output.summary, ...output.actions].join(" ");
  const containsForecastLanguage = FORECAST_PATTERNS.some((pattern) => pattern.test(combinedText));

  if (hasUnsupportedEvidenceIds || containsForecastLanguage) {
    return null;
  }

  return {
    ...output,
    safetyNote: output.safetyNote || "Observed evidence only; this is not a forecast or trade recommendation.",
  } satisfies QuillCoachOutput;
}

export async function runQuillCoach(intelligence: IntelligenceResult, question?: string) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      status: "disabled" as const,
      reason: "OPENAI_API_KEY is not configured.",
    };
  }

  const userPrompt = `Analyze this Quill evidence packet.\n\n${JSON.stringify(compactPacket(intelligence))}\n\nUser conversation/question: ${question?.trim() || "What is the most useful thing to review right now?"}`;

  try {
    const result = await run(agent, userPrompt, { maxTurns: 2 });
    const parsed = CoachOutput.safeParse(result.finalOutput);

    if (!parsed.success) {
      return {
        status: "blocked" as const,
        reason: "Memo returned a response that failed Quill's structured-output validation.",
      };
    }

    const released = validateRelease(parsed.data, intelligence);
    if (!released) {
      return {
        status: "blocked" as const,
        reason: "Memo crossed Quill's evidence or safety boundary.",
      };
    }

    return {
      status: "ready" as const,
      output: released,
    };
  } catch {
    return {
      status: "blocked" as const,
      reason: "Memo was temporarily unavailable. The recorded evidence panels are still available.",
    };
  }
}
