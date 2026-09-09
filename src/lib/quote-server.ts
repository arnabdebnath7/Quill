import { findInstrument } from "@/lib/markets";

export async function fetchYahoo(pid: string): Promise<{ price: number; changePct: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pid)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; QuillJournal/1.0)" },
  });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose;
  if (!Number.isFinite(price)) throw new Error("yahoo no price");
  return {
    price,
    changePct: Number.isFinite(prev) && prev !== 0 ? ((price - prev) / prev) * 100 : 0,
  };
}

export async function fetchCoingecko(ids: string[]): Promise<Record<string, { price: number; changePct: number }>> {
  if (ids.length === 0) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const json = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
  const out: Record<string, { price: number; changePct: number }> = {};
  for (const [id, v] of Object.entries(json)) {
    if (typeof v.usd === "number") {
      out[id] = { price: v.usd, changePct: Number.isFinite(v.usd_24h_change) ? v.usd_24h_change! : 0 };
    }
  }
  return out;
}

/** Best-effort live price for an instrument; null when offline/rate-limited. */
export async function getLivePrice(symbol: string, market: string): Promise<number | null> {
  const inst = findInstrument(symbol, market);
  if (!inst) return null;
  try {
    if (inst.provider === "coingecko") {
      const data = await fetchCoingecko([inst.pid]);
      return data[inst.pid]?.price ?? null;
    }
    return (await fetchYahoo(inst.pid)).price;
  } catch {
    return null;
  }
}
