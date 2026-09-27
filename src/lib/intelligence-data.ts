import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, journalEntries, trades } from "@/db/schema";
import { buildIntelligence, type IntelligenceResult } from "@/lib/intelligence";
import { fetchYahoo } from "@/lib/quote-server";
import { FALLBACK_INR_PER_USD } from "@/lib/markets";

const CHECKIN_WINDOW_DAYS = 120;

/** Accepts only well-formed IANA zone ids ("Asia/Kolkata"); anything else falls back to UTC. */
export function sanitizeTimeZone(value: string | null | undefined): string | undefined {
  if (!value || value.length > 64 || !/^[A-Za-z_+\-/0-9]+$/.test(value)) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return undefined;
  }
}

let fxCache: { at: number; rate: number } | null = null;

async function inrPerUsd(): Promise<number> {
  if (fxCache && Date.now() - fxCache.at < 10 * 60_000) return fxCache.rate;
  try {
    const { price } = await fetchYahoo("USDINR=X");
    if (price > 40 && price < 200) {
      fxCache = { at: Date.now(), rate: price };
      return price;
    }
  } catch {
    // fall through to the fallback rate
  }
  return fxCache?.rate ?? FALLBACK_INR_PER_USD;
}

/** Loads everything Mimo reasons about for one user and builds the evidence packet. */
export async function loadIntelligence(userId: string, timeZone?: string): Promise<IntelligenceResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CHECKIN_WINDOW_DAYS);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const [userTrades, checkins, journals, rate] = await Promise.all([
    db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.entryAt)),
    db.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), gte(dailyCheckins.date, cutoffKey))).orderBy(desc(dailyCheckins.date)),
    db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt)),
    inrPerUsd(),
  ]);

  return buildIntelligence({ trades: userTrades, checkins, journals, timeZone, inrPerUsd: rate });
}
