import { NextResponse } from "next/server";
import { z } from "zod";

export const MARKET_KEYS = ["us", "india", "forex", "crypto", "gold"] as const;
export const MOOD_KEYS = ["great", "good", "neutral", "low", "rough"] as const;
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Accepts a full ISO timestamp or a bare date; bare dates are anchored at UTC noon so the day never shifts. */
export const timestamp = z.string().trim().refine((v) => v !== "" && !Number.isNaN(parseTimestamp(v)?.getTime()), "Invalid date");

export function parseTimestamp(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = DATE_ONLY.test(trimmed) ? new Date(`${trimmed}T12:00:00.000Z`) : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const dateOnly = z.string().regex(DATE_ONLY, "Expected YYYY-MM-DD").refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Invalid date");

export function isValidUuid(value: string) {
  return UUID.test(value);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound(what = "Not found") {
  return NextResponse.json({ error: what }, { status: 404 });
}

export function invalid(error: unknown, label = "Invalid request") {
  const issues = error instanceof z.ZodError ? error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`) : undefined;
  return NextResponse.json({ error: issues?.length ? `${label} — ${issues[0]}` : label, issues }, { status: 400 });
}

/** Parses the JSON body against a schema; returns a 400 response on failure. */
export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T, label?: string): Promise<{ data: z.infer<T> } | { response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: NextResponse.json({ error: "Malformed JSON body" }, { status: 400 }) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) return { response: invalid(result.error, label) };
  return { data: result.data };
}

/** Escapes LIKE wildcards so a search for "100%" doesn't match everything. */
export function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function serverError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
  return NextResponse.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
}

/** Field validators shared by the trade create/update routes. */
export const tradeFields = {
  symbol: z.string().trim().min(1).max(24),
  name: z.string().trim().max(120).nullable(),
  market: z.enum(MARKET_KEYS),
  side: z.enum(["long", "short"]),
  quantity: z.number().positive().finite(),
  entryPrice: z.number().positive().finite(),
  exitPrice: z.number().positive().finite().nullable(),
  entryAt: timestamp,
  exitAt: timestamp.nullable(),
  fees: z.number().min(0).finite(),
  stopLoss: z.number().positive().finite().nullable(),
  target: z.number().positive().finite().nullable(),
  setup: z.string().trim().max(60).nullable(),
  notes: z.string().max(4000).nullable(),
  mood: z.enum(MOOD_KEYS).nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12),
  riskAmount: z.number().positive().finite().nullable(),
  preTradePlan: z.string().max(5000),
  entryReason: z.string().max(3000),
  exitReason: z.string().max(3000),
  mistake: z.string().max(3000),
  lesson: z.string().max(3000),
  rulesFollowed: z.boolean().nullable(),
};
