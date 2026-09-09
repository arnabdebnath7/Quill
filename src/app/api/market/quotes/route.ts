import { NextResponse } from "next/server";
import { findInstrument, marketOf, type MarketKey } from "@/lib/markets";
import { fetchCoingecko, fetchYahoo } from "@/lib/quote-server";

export const dynamic = "force-dynamic";

export interface Quote {
  symbol: string;
  market: string;
  name: string;
  price: number;
  changePct: number; // vs previous close
  currency: string;
  live: boolean;
  ts: number;
}

type QuoteMap = Record<string, Quote>;

// Small server cache so a full dashboard polls don't hammer free APIs.
const CACHE_TTL = 20_000;
const cache = new Map<string, { at: number; quote: Quote }>();

/** Deterministic synthetic quote so the app never renders empty numbers offline. */
function synthetic(symbol: string): { price: number; changePct: number } {
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("symbols") ?? "";
  const requested = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((pair) => {
      const [market, symbol] = pair.includes(":") ? pair.split(":") : ["us", pair];
      return { market: market as MarketKey, symbol: symbol.toUpperCase() };
    });

  const now = Date.now();
  const out: QuoteMap = {};
  const toFetch: { key: string; market: MarketKey; symbol: string; pid: string; provider: string }[] = [];

  for (const r of requested) {
    const key = `${r.market}:${r.symbol}`;
    const inst = findInstrument(r.symbol, r.market);
    const cached = cache.get(key);
    if (cached && now - cached.at < CACHE_TTL) {
      out[key] = cached.quote;
      continue;
    }
    if (!inst) {
      const s = synthetic(r.symbol);
      out[key] = {
        symbol: r.symbol,
        market: r.market,
        name: r.symbol,
        price: s.price,
        changePct: s.changePct,
        currency: marketOf(r.market).currency,
        live: false,
        ts: now,
      };
      continue;
    }
    toFetch.push({ key, market: r.market, symbol: r.symbol, pid: inst.pid, provider: inst.provider });
  }

  const cgBatch = toFetch.filter((t) => t.provider === "coingecko");
  const yahooItems = toFetch.filter((t) => t.provider === "yahoo");

  const results = await Promise.allSettled([
    fetchCoingecko(cgBatch.map((t) => t.pid)),
    ...yahooItems.map((t) => fetchYahoo(t.pid)),
  ]);

  const resolve = (
    item: (typeof toFetch)[number],
    data: { price: number; changePct: number } | undefined
  ) => {
    const d = data ?? synthetic(item.symbol);
    const inst = findInstrument(item.symbol, item.market);
    const quote: Quote = {
      symbol: item.symbol,
      market: item.market,
      name: inst?.name ?? item.symbol,
      price: d.price,
      changePct: d.changePct,
      currency: marketOf(item.market).currency,
      live: Boolean(data),
      ts: now,
    };
    out[item.key] = quote;
    cache.set(item.key, { at: now, quote });
  };

  const [cgRes, ...yahooRes] = results;
  const cgData = cgRes.status === "fulfilled" ? cgRes.value : {};
  cgBatch.forEach((t) => resolve(t, cgData[t.pid]));
  yahooItems.forEach((t, i) =>
    resolve(t, yahooRes[i]?.status === "fulfilled" ? (yahooRes[i] as PromiseFulfilledResult<{ price: number; changePct: number }>).value : undefined)
  );

  return NextResponse.json(
    { quotes: out, ts: now },
    { headers: { "Cache-Control": "no-store" } }
  );
}
