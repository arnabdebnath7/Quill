import { db } from "@/db";
import { trades, journalEntries, watchlist } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { getLivePrice } from "@/lib/quote-server";

// Deterministic PRNG so every fresh account gets the same, believable history.
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v: number, d = 2) => Number(v.toFixed(d));

interface SeedTrade {
  symbol: string;
  name: string;
  market: string;
  side: "long" | "short";
  qty: number;
  base: number; // plausible anchor price
  decimals?: number;
  daysAgoEntry: number;
  holdDays?: number; // undefined => still open
  movePct: number; // exit drift relative to entry (direction adjusted later)
  setup: string;
  mood: string;
  rating: number;
  tags: string[];
  notes: string;
  fees?: number;
}

const TRADE_SEED: SeedTrade[] = [
  { symbol: "NVDA", name: "NVIDIA Corp.", market: "us", side: "long", qty: 14, base: 178.4, holdDays: 9, daysAgoEntry: 78, movePct: 0.092, setup: "Breakout", mood: "great", rating: 5, tags: ["swing", "tech"], notes: "Earnings momentum + sector strength. Trailed stop under 10EMA, scaled out into strength." },
  { symbol: "AAPL", name: "Apple Inc.", market: "us", side: "long", qty: 20, base: 232.1, holdDays: 6, daysAgoEntry: 71, movePct: -0.021, setup: "Pullback", mood: "neutral", rating: 3, tags: ["swing"], notes: "Bought the dip into 50DMA. Volume never confirmed — cut it for a small loss. Right call.", fees: 1.2 },
  { symbol: "BTCUSD", name: "Bitcoin", market: "crypto", side: "long", qty: 0.085, base: 112400, holdDays: 12, daysAgoEntry: 66, movePct: 0.118, setup: "Trend follow", mood: "great", rating: 5, tags: ["crypto", "swing"], notes: "Higher-timeframe uptrend, funding neutral. Rode the leg up and exited into the weekend pump." },
  { symbol: "XAUUSD", name: "Gold Spot", market: "gold", side: "long", qty: 2.5, decimals: 2, base: 3642, holdDays: 15, daysAgoEntry: 62, movePct: 0.034, setup: "Support bounce", mood: "good", rating: 4, tags: ["metals", "macro"], notes: "Central-bank demand narrative. Bought the retest of prior breakout, took profit into round number." },
  { symbol: "EURUSD", name: "Euro / US Dollar", market: "forex", side: "short", qty: 42000, decimals: 4, base: 1.1635, holdDays: 3, daysAgoEntry: 57, movePct: 0.007, setup: "Range fade", mood: "good", rating: 4, tags: ["fx", "intraday-plus"], notes: "Faded the top of the weekly range pre-CPI. Tight stop above wick high.", fees: 4.2 },
  { symbol: "TSLA", name: "Tesla Inc.", market: "us", side: "short", qty: 10, base: 341.8, holdDays: 4, daysAgoEntry: 52, movePct: 0.045, setup: "Mean reversion", mood: "good", rating: 4, tags: ["swing", "tech"], notes: "Overextended 3 days in a row into resistance. Shorted the exhaustion gap, covered at VWAP." },
  { symbol: "RELIANCE", name: "Reliance Industries", market: "india", side: "long", qty: 40, base: 1408, holdDays: 11, daysAgoEntry: 49, movePct: 0.027, setup: "Breakout", mood: "good", rating: 4, tags: ["nse", "positional"], notes: "Consolidation breakout above 1400 with delivery volumes. Booked 2/3 at target, runner stopped flat." },
  { symbol: "ETHUSD", name: "Ethereum", market: "crypto", side: "long", qty: 1.8, base: 4180, holdDays: 7, daysAgoEntry: 44, movePct: -0.052, setup: "Breakout", mood: "low", rating: 2, tags: ["crypto"], notes: "FOMO entry after a green candle. Breakout failed instantly. Lesson: wait for the retest." },
  { symbol: "USDJPY", name: "US Dollar / Yen", market: "forex", side: "long", qty: 55000, decimals: 3, base: 147.85, holdDays: 5, daysAgoEntry: 39, movePct: 0.009, setup: "Trend follow", mood: "good", rating: 4, tags: ["fx"], notes: "BoJ dovish, rate diff still wide. Bought the flag breakout, exited before weekend risk." , fees: 5.5 },
  { symbol: "MSFT", name: "Microsoft Corp.", market: "us", side: "long", qty: 6, base: 505.3, holdDays: 18, daysAgoEntry: 38, movePct: 0.031, setup: "Pullback", mood: "good", rating: 4, tags: ["swing", "tech"], notes: "Cloud growth re-acceleration. Patient entry on the 8% pullback, sold into new highs." },
  { symbol: "TATAMOTORS", name: "Tata Motors", market: "india", side: "long", qty: 120, base: 958, holdDays: 6, daysAgoEntry: 33, movePct: -0.018, setup: "Support bounce", mood: "neutral", rating: 3, tags: ["nse"], notes: "JLR demand worries kept pressure. Stopped out, small controlled loss. No hero trades." },
  { symbol: "SOLUSD", name: "Solana", market: "crypto", side: "long", qty: 18, base: 196.4, holdDays: 9, daysAgoEntry: 30, movePct: 0.142, setup: "Liquidity sweep", mood: "great", rating: 5, tags: ["crypto", "swing"], notes: "Sweep of range lows then instant reclaim — textbook. Sold into the squeeze." },
  { symbol: "GBPUSD", name: "Pound / US Dollar", market: "forex", side: "short", qty: 38000, decimals: 4, base: 1.3412, holdDays: 2, daysAgoEntry: 26, movePct: -0.006, setup: "News play", mood: "low", rating: 2, tags: ["fx", "news"], notes: "Traded UK CPI without a plan for the revision. Got whipped. Rule: no fresh positions 30m around prints.", fees: 3.8 },
  { symbol: "META", name: "Meta Platforms", market: "us", side: "long", qty: 4, base: 712.6, holdDays: 8, daysAgoEntry: 24, movePct: 0.048, setup: "Trend follow", mood: "great", rating: 5, tags: ["swing", "tech"], notes: "Ad revenue momentum + AI story. Added on the first flag, trailed under higher lows." },
  { symbol: "HDFCBANK", name: "HDFC Bank", market: "india", side: "long", qty: 60, base: 1972, holdDays: 13, daysAgoEntry: 22, movePct: 0.016, setup: "DCA accumulator", mood: "good", rating: 4, tags: ["nse", "positional"], notes: "Slow grind position. Trailing stops loose on purpose — this is a hold, not a lottery ticket." },
  { symbol: "AMD", name: "Advanced Micro Devices", market: "us", side: "long", qty: 22, base: 158.2, holdDays: 3, daysAgoEntry: 19, movePct: -0.024, setup: "Gap & go", mood: "low", rating: 2, tags: ["intraday-plus"], notes: "Gap faded by 10:30. Should have waited for the first 15-min range. Paid tuition, moving on." },
  { symbol: "XAGUSD", name: "Silver Spot", market: "gold", side: "long", qty: 60, decimals: 3, base: 44.2, holdDays: 10, daysAgoEntry: 17, movePct: 0.058, setup: "Support bounce", mood: "good", rating: 4, tags: ["metals"], notes: "Gold/silver ratio stretched. Silver caught up fast — closed 80%, runner into new highs." },
  { symbol: "AMZN", name: "Amazon.com Inc.", market: "us", side: "long", qty: 12, base: 224.7, holdDays: 7, daysAgoEntry: 14, movePct: 0.022, setup: "Pullback", mood: "good", rating: 3, tags: ["swing"], notes: "Bought weakness into the 21EMA. Nothing fancy — plan, execute, leave." },
  { symbol: "USDINR", name: "US Dollar / Rupee", market: "forex", side: "short", qty: 90000, decimals: 3, base: 88.35, holdDays: 4, daysAgoEntry: 12, movePct: 0.004, setup: "Range fade", mood: "neutral", rating: 3, tags: ["fx"], notes: "RBI smoothing keeps it rangy. Faded the top, covered into 88. Scalp-grade discipline." , fees: 6.4 },
  // --- open positions (live mark-to-market on dashboard) ---
  // For these, `base` is only a fallback: at seed time we anchor the entry a
  // realistic `movePct` away from the CURRENT live price, so first load shows
  // believable, small, mostly-green open P&L instead of stale anchors.
  { symbol: "BTCUSD", name: "Bitcoin", market: "crypto", side: "long", qty: 0.12, base: 116820, daysAgoEntry: 9, movePct: 0.026, setup: "Trend follow", mood: "good", rating: 4, tags: ["crypto", "core"], notes: "Weekly close above prior high. Target higher bracket, stop under breakout candle low." },
  { symbol: "NVDA", name: "NVIDIA Corp.", market: "us", side: "long", qty: 10, base: 181.9, daysAgoEntry: 6, movePct: 0.012, setup: "Breakout", mood: "good", rating: 4, tags: ["swing", "tech"], notes: "All-time-high breakout retest. Letting it breathe above the level." },
  { symbol: "XAUUSD", name: "Gold Spot", market: "gold", side: "long", qty: 1.5, decimals: 2, base: 3890, daysAgoEntry: 5, movePct: 0.018, setup: "Support bounce", mood: "great", rating: 5, tags: ["metals", "macro"], notes: "Dip-buy into the breakout shelf. Gold keeps bid on every wobble." },
  { symbol: "TCS", name: "Tata Consultancy Svcs", market: "india", side: "long", qty: 25, base: 3062, daysAgoEntry: 4, movePct: -0.009, setup: "Pullback", mood: "neutral", rating: 3, tags: ["nse", "positional"], notes: "IT pack accumulation. Quiet tape, patient hands." },
  { symbol: "EURUSD", name: "Euro / US Dollar", market: "forex", side: "long", qty: 30000, decimals: 4, base: 1.1718, daysAgoEntry: 3, movePct: 0.005, setup: "Trend follow", mood: "good", rating: 4, tags: ["fx"], notes: "Dollar softening bias. Long against the week-low with a hard stop." , fees: 3.1 },
  { symbol: "SOLUSD", name: "Solana", market: "crypto", side: "long", qty: 12, base: 208.5, daysAgoEntry: 2, movePct: -0.012, setup: "Liquidity sweep", mood: "good", rating: 4, tags: ["crypto"], notes: "Same playbook as last month: sweep, reclaim, hold. Trail aggressively." },
  { symbol: "GOOGL", name: "Alphabet Inc.", market: "us", side: "long", qty: 15, base: 246.3, daysAgoEntry: 1, movePct: 0.007, setup: "Breakout", mood: "good", rating: 4, tags: ["swing", "tech"], notes: "Fresh entry — AI infra spend narrative. Tight leash until it proves itself." },
];

const JOURNAL_SEED: {
  daysAgo: number;
  title: string;
  mood: string;
  tags: string[];
  pinned?: boolean;
  content: string;
}[] = [
  {
    daysAgo: 0,
    title: "Reset before the open",
    mood: "good",
    tags: ["routine", "planning"],
    pinned: true,
    content:
      "Morning run done, screens clean, plan written before coffee #2.\n\nWatchlist today: NVDA retest, gold dip, EURUSD if dollar stays soft. Max risk per idea: 1R. If nothing sets up by 11am, I walk away. Boredom is not a signal.\n\nNon-market goal: cook an actual dinner tonight instead of ordering in.",
  },
  {
    daysAgo: 1,
    title: "Took the GOOGL breakout",
    mood: "good",
    tags: ["trading", "review"],
    content:
      "Entered GOOGL on the first clean consolidation above the range. Position small enough that I'm not watching it every five minutes — that's how I know the size is right.\n\nRule check: entry matched the plan, stop is where the idea is wrong, not where it hurts.\n\nEvening: called mom, 40 pages of the book. Good day.",
  },
  {
    daysAgo: 2,
    title: "",
    mood: "neutral",
    tags: [],
    content: "",
  },
  {
    daysAgo: 3,
    title: "Gym, then green candles",
    mood: "great",
    tags: ["health", "trading"],
    content:
      "Leg day nearly ended me, but the SOL sweep-reclaim played out exactly like last month's study notes. Trust the playbook.\n\nNoticed: my best trades happen on days I train. Coincidence? Probably not. Energy management is risk management.",
  },
  {
    daysAgo: 6,
    title: "Sat on my hands (on purpose)",
    mood: "neutral",
    tags: ["discipline"],
    content:
      "Choppy tape, no A+ setups. Old me would have forced two trades out of boredom. New me closed the laptop at noon and went for a long walk.\n\nNot trading IS a position. Journal it so it counts.",
  },
  {
    daysAgo: 8,
    title: "Bitcoin weekly close",
    mood: "good",
    tags: ["trading", "crypto"],
    content:
      "BTC closed the weekly above the prior high, so I sized into a swing with the stop under the breakout candle. Asymmetric if the level holds, dead if it doesn't. Clean either way.\n\nSide note: finally fixed the leaking tap. Small wins at home keep the head clear for big swings at work.",
  },
  {
    daysAgo: 12,
    title: "Ugly USDINR scalp — and that's fine",
    mood: "neutral",
    tags: ["trading", "review"],
    content:
      "Took the range fade on USDINR, got a scratch-to-small-win. The read was fine, the timing mediocre. Grade: C+.\n\nWrote the rule on the monitor: 'Rangy pair = scalp expectations, not swing expectations.'\n\nEvening: started meal-prep Sundays. Trader brain loves systems — may as well systemize breakfast too.",
  },
  {
    daysAgo: 16,
    title: "Week of small green",
    mood: "great",
    tags: ["weekly-review"],
    pinned: true,
    content:
      "Five trades, four small wins, one scratch. Nothing screenshot-worthy — and that's exactly the point. Boring consistency compounds.\n\nWin rate this stretch: high because I only took A-setups. Note to self: protect the filter, not the P&L.\n\nLife: finished the bedside table I've been 'about to build' for a month. Momentum everywhere.",
  },
  {
    daysAgo: 22,
    title: "Slow bank, slow Sunday",
    mood: "good",
    tags: ["life", "nse"],
    content:
      "HDFCBANK position crawling up like it should — this one's a hold, not a trade. Checking it twice a day instead of twenty times. Progress.\n\nSunday reset: laundry, grocery run, plan the week, screens off by ten. The market will still be there tomorrow.",
  },
];

export async function seedUserDemoData(userId: string) {
  const existing = await db
    .select({ value: count() })
    .from(trades)
    .where(eq(trades.userId, userId));
  if ((existing[0]?.value ?? 0) > 0) return; // real user data, never overwrite

  const rand = mulberry32(1337);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Anchor open positions near real current prices (best effort, offline-safe).
  const openSeeds = TRADE_SEED.filter((t) => t.holdDays == null);
  const liveAnchors = new Map<string, number>();
  await Promise.all(
    openSeeds.map(async (t) => {
      const p = await getLivePrice(t.symbol, t.market);
      if (p != null) liveAnchors.set(`${t.market}:${t.symbol}`, p);
    })
  );

  const tradeRows = TRADE_SEED.map((t) => {
    const d = t.decimals ?? (t.market === "forex" ? 4 : 2);
    const isOpen = t.holdDays == null;
    const jitter = 1 + (rand() - 0.5) * 0.01;
    const dirMove = t.side === "short" ? -t.movePct : t.movePct;
    let base = t.base;
    if (isOpen) {
      const live = liveAnchors.get(`${t.market}:${t.symbol}`);
      base = live != null ? live / (1 + dirMove) : t.base;
    }
    const entry = round(base * jitter, d);
    const entryAt = new Date(now - t.daysAgoEntry * day - rand() * 6 * 60 * 60 * 1000);
    const exit = isOpen ? null : round(entry * (1 + dirMove), d);
    const exitAt = isOpen ? null : new Date(entryAt.getTime() + (t.holdDays ?? 1) * day);
    return {
      userId,
      symbol: t.symbol,
      name: t.name,
      market: t.market,
      side: t.side,
      status: isOpen ? "open" : "closed",
      quantity: String(t.qty),
      entryPrice: String(entry),
      exitPrice: exit != null ? String(exit) : null,
      entryAt,
      exitAt,
      fees: String(t.fees ?? round(rand() * 2 + 0.4, 2)),
      setup: t.setup,
      notes: t.notes,
      mood: t.mood,
      rating: t.rating,
      tags: t.tags,
    };
  });
  await db.insert(trades).values(tradeRows);

  const journalRows = JOURNAL_SEED.filter((j) => j.title).map((j) => {
    const date = new Date(now - j.daysAgo * day);
    return {
      userId,
      title: j.title,
      content: j.content,
      mood: j.mood,
      date: date.toISOString().slice(0, 10),
      tags: j.tags,
      pinned: j.pinned ?? false,
      createdAt: date,
      updatedAt: date,
    };
  });
  await db.insert(journalEntries).values(journalRows);

  await db.insert(watchlist).values(
    [
      { symbol: "BTCUSD", name: "Bitcoin", market: "crypto" },
      { symbol: "ETHUSD", name: "Ethereum", market: "crypto" },
      { symbol: "XAUUSD", name: "Gold Spot", market: "gold" },
      { symbol: "EURUSD", name: "Euro / US Dollar", market: "forex" },
      { symbol: "NVDA", name: "NVIDIA Corp.", market: "us" },
      { symbol: "AAPL", name: "Apple Inc.", market: "us" },
      { symbol: "RELIANCE", name: "Reliance Industries", market: "india" },
    ].map((w) => ({ ...w, userId }))
  );
}
