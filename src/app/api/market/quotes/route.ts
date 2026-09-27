import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { findInstrument, isMarketKey, marketOf, type MarketKey, type Quote, type QuotesMap } from "@/lib/markets";
import { fetchCoingecko, fetchYahoo } from "@/lib/quote-server";

export const dynamic = "force-dynamic";

// Small server cache so a dashboard full of widgets doesn't hammer the free providers.
const CACHE_TTL = 20_000;
const cache = new Map<string, { at: number; quote: Quote }>();

// Provider outages are expected now and then; log them at most once a minute instead of on every poll.
let lastOutageLog = 0;
function noteOutage(provider: string, error: unknown) {
  const now = Date.now();
  if (now - lastOutageLog < 60_000) return;
  lastOutageLog = now;
  console.warn(`[market/quotes] ${provider} unreachable — serving estimates`, error instanceof Error ? error.message : error);
}

/**
 * Deterministic estimate used only when a provider is unreachable, so charts
 * and P&L previews don't collapse to zero. Always flagged with `live: false`
 * and rendered as "est." by the UI — never offered as a fill price.
 */
function estimate(symbol: string): { price: number; changePct: number } {
  const anchors: Record<string, number> = {
    BTCUSD: 118500, ETHUSD: 4450, SOLUSD: 213, BNBUSD: 985, XRPUSD: 2.85, DOGEUSD: 0.24,
    XAUUSD: 3920, XAGUSD: 47.2, XPTUSD: 1580,
    EURUSD: 1.1745, GBPUSD: 1.343, USDJPY: 149.4, USDINR: 88.15, AUDUSD: 0.662, USDCAD: 1.372,
    AAPL: 236.4, NVDA: 183.2, TSLA: 346.9, MSFT: 516.8, AMZN: 228.4, META: 731.5, GOOGL: 251.3, AMD: 159.8,
    RELIANCE: 1421, TCS: 3078, HDFCBANK: 1992, INFY: 1512, TATAMOTORS: 944, SBIN: 812,
  };
  const base = anchors[symbol] ?? 100;
  const t = Date.now() / 60_000;
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) % 997;
  const wave = Math.sin(t / 7 + h) * 0.004 + Math.sin(t / 2.3 + h * 2) * 0.002;
  return { price: base * (1 + wave), changePct: wave * 40 };
}

type Requested = { key: string; market: MarketKey; symbol: string };

function parseSymbols(raw: string): Requested[] {
  const seen = new Set<string>();
  const out: Requested[] = [];
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const [marketPart, symbolPart] = trimmed.includes(":") ? trimmed.split(":", 2) : ["us", trimmed];
    const market = marketPart.toLowerCase();
    const symbol = symbolPart.toUpperCase().replace(/[^A-Z0-9.=\-]/g, "").slice(0, 16);
    if (!isMarketKey(market) || !symbol) continue;
    const key = `${market}:${symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, market, symbol });
    if (out.length >= 40) break;
  }
  return out;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const requested = parseSymbols(url.searchParams.get("symbols") ?? "");
  const now = Date.now();
  const out: QuotesMap = {};
  const toFetch: (Requested & { pid: string; provider: "yahoo" | "coingecko"; name: string })[] = [];

  for (const r of requested) {
    const cached = cache.get(r.key);
    if (cached && now - cached.at < CACHE_TTL) {
      out[r.key] = cached.quote;
      continue;
    }
    const inst = findInstrument(r.symbol, r.market);
    if (!inst) {
      const e = estimate(r.symbol);
      out[r.key] = { symbol: r.symbol, market: r.market, name: r.symbol, price: e.price, changePct: e.changePct, currency: marketOf(r.market).currency, live: false, ts: now };
      continue;
    }
    toFetch.push({ ...r, pid: inst.pid, provider: inst.provider, name: inst.name });
  }

  const cgBatch = toFetch.filter((t) => t.provider === "coingecko");
  const yahooItems = toFetch.filter((t) => t.provider === "yahoo");

  const [cgResult, ...yahooResults] = await Promise.allSettled([fetchCoingecko(cgBatch.map((t) => t.pid)), ...yahooItems.map((t) => fetchYahoo(t.pid))]);
  const cgData = cgResult.status === "fulfilled" ? cgResult.value : {};
  if (cgBatch.length && cgResult.status === "rejected") noteOutage("CoinGecko", cgResult.reason);
  const yahooFailure = yahooResults.find((r) => r.status === "rejected");
  if (yahooFailure && yahooFailure.status === "rejected") noteOutage("Yahoo Finance", yahooFailure.reason);

  const resolve = (item: (typeof toFetch)[number], data: { price: number; changePct: number } | undefined) => {
    const d = data ?? estimate(item.symbol);
    const quote: Quote = { symbol: item.symbol, market: item.market, name: item.name, price: d.price, changePct: d.changePct, currency: marketOf(item.market).currency, live: Boolean(data), ts: now };
    out[item.key] = quote;
    // Estimates are cached briefly too, so a flapping provider isn't retried on every poll.
    cache.set(item.key, { at: data ? now : now - CACHE_TTL / 2, quote });
  };

  cgBatch.forEach((t) => resolve(t, cgData[t.pid]));
  yahooItems.forEach((t, i) => {
    const result = yahooResults[i];
    resolve(t, result?.status === "fulfilled" ? result.value : undefined);
  });

  return NextResponse.json({ quotes: out, ts: now }, { headers: { "Cache-Control": "no-store" } });
}
