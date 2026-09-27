"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, BookOpenText, CandlestickChart, Feather, Flame, NotebookPen, Radio, TrendingUp } from "lucide-react";
import { useFxRate, useJournal, useQuotes, useTrades, type Quote, type QuotesMap } from "@/lib/hooks";
import { STRIP_SYMBOLS, decimalsFor, marketOf, tradePnlUsd } from "@/lib/markets";
import { cn, formatCompact, formatMoney, formatPrice, localDateKey, num, tradePnl } from "@/lib/utils";
import { AreaChart, AnimatedNumber, Donut, WinRing } from "@/components/charts";
import { Button, Card, Skeleton } from "@/components/ui";
import type { Trade } from "@/db/schema";

const EASE = [0.22, 1, 0.36, 1] as const;
const MARKET_COLORS: Record<string, string> = { us: "#7c83f5", india: "#f58a4b", forex: "#4cc0de", crypto: "#a78bfa", gold: "#e5c04b" };

/** Flashes green/red for ~1s whenever a number ticks up or down. */
function useFlash(value: number | undefined) {
  const prev = useRef<number | undefined>(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const previous = prev.current;
    prev.current = value;
    if (value == null || previous == null || value === previous) return;
    const next = value > previous ? "up" : "down";
    const raise = window.setTimeout(() => setDir(next), 0);
    const clear = window.setTimeout(() => setDir(null), 950);
    return () => {
      window.clearTimeout(raise);
      window.clearTimeout(clear);
    };
  }, [value]);
  return dir;
}

function StripQuote({ quote }: { quote?: Quote }) {
  const flash = useFlash(quote?.price);
  if (!quote) return <Skeleton className="h-[74px] w-[132px] shrink-0" />;
  const up = quote.changePct >= 0;
  return (
    <Link
      href="/watchlist"
      className="group flex w-[132px] shrink-0 flex-col justify-between rounded-2xl border border-line bg-card px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[.985]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-sub">{quote.symbol}</span>
        <span className={cn("tabular flex items-center text-[10.5px] font-medium", up ? "text-up" : "text-down")}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(quote.changePct).toFixed(2)}%
        </span>
      </div>
      <div className={cn("tabular mt-2 flex items-baseline gap-1 font-mono text-[15px] font-medium", flash === "up" && "flash-up", flash === "down" && "flash-down")}>
        {formatPrice(quote.price, decimalsFor(quote.symbol))}
        {!quote.live && <span className="text-[9px] font-sans text-faint">est.</span>}
      </div>
    </Link>
  );
}

function SectionTitle({ icon: Icon, title, hint, action }: { icon: React.ElementType; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-[15px] w-[15px] text-brand" />
        <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {hint && <span className="hidden text-[11.5px] text-faint sm:inline">{hint}</span>}
      </div>
      {action}
    </div>
  );
}

function journalStreak(dates: Iterable<string>) {
  const days = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function DashboardPage() {
  const { data: trades, isLoading: tradesLoading } = useTrades();
  const { data: entries } = useJournal();
  const { inrPerUsd } = useFxRate();

  const openTrades = useMemo(() => (trades ?? []).filter((t) => t.status === "open"), [trades]);
  const closedTrades = useMemo(
    () =>
      (trades ?? [])
        .filter((t) => t.status === "closed" && t.exitPrice != null)
        .sort((a, b) => new Date(a.exitAt ?? a.entryAt).getTime() - new Date(b.exitAt ?? b.entryAt).getTime()),
    [trades],
  );
  const quotePairs = useMemo(() => {
    const map = new Map<string, { market: string; symbol: string }>();
    STRIP_SYMBOLS.forEach((s) => map.set(`${s.market}:${s.symbol}`, { market: s.market, symbol: s.symbol }));
    openTrades.forEach((t) => map.set(`${t.market}:${t.symbol}`, { market: t.market, symbol: t.symbol }));
    return [...map.values()];
  }, [openTrades]);
  const { data: quotes } = useQuotes(quotePairs);
  const anyLive = useMemo(() => Object.values(quotes ?? {}).some((q) => q.live), [quotes]);

  const stats = useMemo(() => {
    const closed = closedTrades.map((t) => ({ trade: t, pnl: tradePnlUsd(t, inrPerUsd) ?? 0 }));
    const realized = closed.reduce((s, x) => s + x.pnl, 0);
    const wins = closed.filter((x) => x.pnl > 0);
    const losses = closed.filter((x) => x.pnl <= 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const unrealized = openTrades.reduce((s, t) => {
      const q = quotes?.[`${t.market}:${t.symbol}`];
      const p = tradePnlUsd(t, inrPerUsd, q?.price);
      return p == null ? s : s + p;
    }, 0);
    const avgWin = wins.length ? wins.reduce((s, x) => s + x.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, x) => s + x.pnl, 0)) / losses.length : 0;
    const streak = journalStreak((entries ?? []).map((e) => e.date));
    return { realized, winRate, unrealized, streak, avgWin, avgLoss, wins: wins.length, total: closed.length };
  }, [closedTrades, openTrades, quotes, entries, inrPerUsd]);

  const equity = useMemo(() => {
    const points: { label: string; value: number }[] = [];
    let running = 0;
    for (const t of closedTrades) {
      running += tradePnlUsd(t, inrPerUsd) ?? 0;
      points.push({ label: format(new Date(t.exitAt ?? t.entryAt), "MMM d"), value: running });
    }
    return points.length ? [{ label: "Start", value: 0 }, ...points] : points;
  }, [closedTrades, inrPerUsd]);

  const allocation = useMemo(() => {
    const counts = new Map<string, number>();
    (trades ?? []).forEach((t) => counts.set(t.market, (counts.get(t.market) ?? 0) + 1));
    return [...counts.entries()].map(([m, c]) => ({ label: marketOf(m).label, value: c, color: MARKET_COLORS[m] ?? "#888" }));
  }, [trades]);

  const recent = useMemo(() => (trades ?? []).slice(0, 5), [trades]);
  const recentEntries = useMemo(() => (entries ?? []).slice(0, 3), [entries]);
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (tradesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] w-[132px] shrink-0" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[118px]" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Realized P&L",
      node: (
        <>
          <AnimatedNumber
            value={stats.realized}
            format={(n) => formatMoney(n, "USD", { sign: true })}
            className={cn("tabular font-display text-[26px] font-semibold tracking-[-0.02em]", stats.realized >= 0 ? "text-up" : "text-down")}
          />
          <p className="mt-1.5 text-[12px] text-faint">{stats.total} closed trades · USD-normalized</p>
        </>
      ),
    },
    {
      label: "Open exposure",
      node: (
        <>
          <AnimatedNumber
            value={stats.unrealized}
            format={(n) => formatMoney(n, "USD", { sign: true })}
            className={cn("tabular font-display text-[26px] font-semibold tracking-[-0.02em]", stats.unrealized >= 0 ? "text-up" : "text-down")}
          />
          <p className="mt-1.5 text-[12px] text-faint">
            {openTrades.length} open positions · {anyLive ? "marked live" : "estimated marks"}
          </p>
        </>
      ),
    },
    {
      label: "Discipline",
      node: (
        <div className="flex items-center gap-4">
          <WinRing rate={stats.winRate} size={86} />
          <div className="space-y-1 text-[11.5px] leading-tight text-sub">
            <p>
              Avg win <span className="tabular font-medium text-up">{formatMoney(stats.avgWin, "USD")}</span>
            </p>
            <p>
              Avg loss <span className="tabular font-medium text-down">{formatMoney(stats.avgLoss, "USD")}</span>
            </p>
            <p className="text-faint">
              {stats.wins}W / {stats.total - stats.wins}L
            </p>
          </div>
        </div>
      ),
    },
    {
      label: "Journal streak",
      node: (
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="tabular font-display text-[26px] font-semibold">
              <AnimatedNumber value={stats.streak} format={(n) => `${Math.round(n)}`} />
              <span className="ml-1 text-[14px] font-normal text-sub">days</span>
            </div>
            <p className="text-[11.5px] text-faint">{stats.streak > 0 ? "Keep the chain alive" : "Write today to start one"}</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-faint">{format(new Date(), "EEEE, MMMM d")}</div>
          <h1 className="mt-1.5 font-display text-[27px] font-semibold tracking-[-0.02em] sm:text-[31px]">{greeting}.</h1>
        </div>
        <div className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto">
          <Link href="/trades?new=1" className="w-full">
            <Button className="w-full sm:w-auto">
              <CandlestickChart className="h-4 w-4" /> Log trade
            </Button>
          </Link>
          <Link href="/journal?new=1" className="w-full">
            <Button className="w-full sm:w-auto" variant="outline">
              <Feather className="h-4 w-4" /> Write
            </Button>
          </Link>
        </div>
      </div>

      <section>
        <SectionTitle
          icon={Radio}
          title="Markets now"
          hint="refreshes every 15s"
          action={
            anyLive ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-up">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" /> live
              </span>
            ) : (
              <span className="text-[11px] font-medium text-faint">estimates — provider offline</span>
            )
          }
        />
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
          <div className="flex gap-3">
            {STRIP_SYMBOLS.map((s) => (
              <StripQuote key={`${s.market}:${s.symbol}`} quote={quotes?.[`${s.market}:${s.symbol}`]} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.5, ease: EASE }}>
            <Card className="h-full p-5">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[.12em] text-faint">{c.label}</div>
              {c.node}
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
        <Card className="p-5">
          <SectionTitle icon={TrendingUp} title="Equity curve" hint="cumulative realized P&L" />
          {equity.length > 1 ? (
            <AreaChart data={equity} formatY={(v) => formatCompact(v)} />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-center text-[13px] text-faint">Close your first trade to start the curve.</div>
          )}
        </Card>
        <Card className="flex flex-col p-5">
          <SectionTitle icon={CandlestickChart} title="Where you play" />
          <div className="flex flex-1 items-center justify-between gap-3">
            <Donut parts={allocation} size={132} thickness={15} />
            <div className="grid flex-1 gap-2">
              {allocation.map((a) => (
                <div key={a.label} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                  <span className="text-sub">{a.label}</span>
                  <span className="tabular ml-auto font-medium">{a.value}</span>
                </div>
              ))}
              {allocation.length === 0 && <p className="text-[12px] text-faint">Log a trade to see your market mix.</p>}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle
            icon={CandlestickChart}
            title="Open positions"
            action={
              <Link href="/trades?status=open" className="inline-flex min-h-9 items-center text-[12px] font-medium text-brand hover:underline">
                View all
              </Link>
            }
          />
          <div className="space-y-1">
            {openTrades.slice(0, 5).map((t) => (
              <OpenRow key={t.id} trade={t} quotes={quotes} />
            ))}
            {openTrades.length === 0 && <p className="py-8 text-center text-[13px] text-faint">No open positions. The plan is working — or the market is waiting for you.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle
            icon={NotebookPen}
            title="From the journal"
            action={
              <Link href="/journal" className="inline-flex min-h-9 items-center text-[12px] font-medium text-brand hover:underline">
                All entries
              </Link>
            }
          />
          <div className="space-y-1">
            {recentEntries.map((e) => (
              <Link key={e.id} href="/journal" className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-line/40 active:scale-[.995]">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", moodColor(e.mood))} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium transition-colors group-hover:text-brand">{e.title}</div>
                  <div className="mt-0.5 line-clamp-1 text-[12px] text-faint">{e.content.split("\n")[0]}</div>
                </div>
                <span className="tabular ml-auto shrink-0 pt-0.5 text-[11px] text-faint">{format(new Date(e.date + "T12:00:00"), "MMM d")}</span>
              </Link>
            ))}
            {recentEntries.length === 0 && <p className="py-8 text-center text-[13px] text-faint">No entries yet. Your future self is waiting to read them.</p>}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle
          icon={BookOpenText}
          title="Recent trades"
          action={
            <Link href="/trades" className="inline-flex min-h-9 items-center text-[12px] font-medium text-brand hover:underline">
              Full log
            </Link>
          }
        />
        <Card className="divide-y divide-line overflow-hidden">
          {recent.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <RecentTradeRow trade={t} quotes={quotes} />
            </motion.div>
          ))}
          {recent.length === 0 && <p className="py-8 text-center text-[13px] text-faint">Nothing logged yet.</p>}
        </Card>
      </section>
    </div>
  );
}

function moodColor(mood: string | null) {
  switch (mood) {
    case "great":
      return "bg-up";
    case "good":
      return "bg-emerald-400";
    case "low":
      return "bg-amber-500";
    case "rough":
      return "bg-down";
    default:
      return "bg-faint";
  }
}

function OpenRow({ trade, quotes }: { trade: Trade; quotes?: QuotesMap }) {
  const q = quotes?.[`${trade.market}:${trade.symbol}`];
  const pnl = tradePnl(trade, q?.price);
  const cur = marketOf(trade.market).currency;
  const pos = (pnl ?? 0) >= 0;
  const flash = useFlash(pnl ?? undefined);
  const dec = decimalsFor(trade.symbol, trade.market);
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-line/25">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", trade.side === "long" ? "bg-up-soft text-up" : "bg-down-soft text-down")}>
        {trade.side === "long" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold">{trade.symbol}</div>
        <div className="text-[11px] text-faint">
          {num(trade.quantity)} @ {formatPrice(num(trade.entryPrice), dec)}
        </div>
      </div>
      <div className="ml-auto text-right">
        <div className={cn("tabular text-[13px] font-semibold", pnl == null ? "text-faint" : pos ? "text-up" : "text-down", flash === "up" && "flash-up", flash === "down" && "flash-down")}>
          {pnl == null ? "—" : formatMoney(pnl, cur, { sign: true })}
        </div>
        <div className="tabular text-[10.5px] text-faint">{q ? `${q.live ? "" : "est. "}${formatPrice(q.price, dec)}` : "…"}</div>
      </div>
    </div>
  );
}

function RecentTradeRow({ trade, quotes }: { trade: Trade; quotes?: QuotesMap }) {
  const isOpen = trade.status === "open";
  const q = quotes?.[`${trade.market}:${trade.symbol}`];
  const pnl = isOpen ? tradePnl(trade, q?.price) : tradePnl(trade);
  const cur = marketOf(trade.market).currency;
  const pos = (pnl ?? 0) >= 0;
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-line/20 sm:px-5">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", trade.side === "long" ? "bg-up-soft text-up" : "bg-down-soft text-down")}>
        {trade.side === "long" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold">{trade.symbol}</span>
          <span className="rounded-full bg-line/50 px-1.5 py-px text-[10px] font-medium text-sub">{marketOf(trade.market).short}</span>
          {isOpen && <span className="rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-medium text-brand">open</span>}
        </div>
        <div className="mt-0.5 text-[11.5px] text-faint">
          {trade.setup ?? marketOf(trade.market).label} · {format(new Date(trade.entryAt), "MMM d")}
        </div>
      </div>
      <div className={cn("tabular text-[13.5px] font-semibold", pnl == null ? "text-faint" : pos ? "text-up" : "text-down")}>{pnl == null ? "—" : formatMoney(pnl, cur, { sign: true })}</div>
    </div>
  );
}
