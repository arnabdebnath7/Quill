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

const SYSTEM_INSTRUCTIONS = `You are Quill Intelligence Coach.

Your job is to explain the user's recorded trading-behaviour evidence, not to predict markets.
You receive a deterministic intelligence packet prepared by Quill. Treat it as the source of truth.

Rules:
- Never invent facts, trades, metrics, evidence IDs, or sample sizes.
- Never give buy/sell/hold recommendations, price targets, profit promises, or market forecasts.
- Do not turn correlation into causation. Use language such as "observed", "in this sample", or "worth reviewing".
- Prefer concrete behavioural actions: review a trade, protect decision quality, complete a check-in, compare a setup, or inspect a rule break.
- Only cite evidence IDs that appear in the supplied packet.
- When evidence is weak or missing, explicitly say so and keep advice conservative.
- Keep the answer specific to the packet. Do not discuss external market conditions because they are outside the evidence boundary.

Return structured output only.`;

const agent = new Agent({
  name: "Quill Intelligence Coach",
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

  const validEvidenceIds = output.evidenceIds.filter((id) => allowedIds.has(id));
  const combinedText = [output.headline, output.summary, ...output.actions].join(" ");
  const containsForecastLanguage = FORECAST_PATTERNS.some((pattern) => pattern.test(combinedText));

  if (containsForecastLanguage) {
    return null;
  }

  return {
    ...output,
    evidenceIds: validEvidenceIds,
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

  const userPrompt = `Analyze this Quill intelligence packet.\n\n${JSON.stringify(compactPacket(intelligence))}\n\nUser question: ${question?.trim() || "What is the most useful thing to review right now?"}`;

  try {
    const result = await run(agent, userPrompt, { maxTurns: 2 });
    const parsed = CoachOutput.safeParse(result.finalOutput);

    if (!parsed.success) {
      return {
        status: "blocked" as const,
        reason: "The AI response failed Quill's structured-output validation.",
      };
    }

    const released = validateRelease(parsed.data, intelligence);
    if (!released) {
      return {
        status: "blocked" as const,
        reason: "The AI response crossed Quill's evidence or safety boundary.",
      };
    }

    return {
      status: "ready" as const,
      output: released,
    };
  } catch {
    return {
      status: "blocked" as const,
      reason: "The AI coach was temporarily unavailable. Review the deterministic intelligence panel instead.",
    };
  }
}
