"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, BookOpenText, CandlestickChart, Feather, Flame, NotebookPen, Radio, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useJournal, useQuotes, useTrades, type QuotesMap } from "@/lib/hooks";
import { STRIP_SYMBOLS, decimalsFor, marketOf } from "@/lib/markets";
import { cn, formatCompact, formatMoney, formatPrice, num, tradePnl } from "@/lib/utils";
import { AreaChart, AnimatedNumber, Donut, WinRing } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LiveDot, PnlArrow, SectionTitle, SideBadge, StripQuote, useFlash } from "@/components/primitives";
import { EASE, riseItem, staggerContainer } from "@/lib/motion";
import type { Trade } from "@/db/schema";

const INR_PER_USD = 88.3;
function toUsd(t: Trade, pnl: number) {
  return t.market === "india" ? pnl / INR_PER_USD : pnl;
}

export default function DashboardPage() {
  const { data: trades, isLoading: tradesLoading } = useTrades();
  const { data: entries } = useJournal();

  const openTrades = useMemo(() => (trades ?? []).filter((t) => t.status === "open"), [trades]);
  const closedTrades = useMemo(
    () =>
      (trades ?? [])
        .filter((t) => t.status === "closed" && t.exitPrice != null)
        .sort((a, b) => new Date(a.exitAt!).getTime() - new Date(b.exitAt!).getTime()),
    [trades],
  );
  const quotePairs = useMemo(() => {
    const map = new Map<string, { market: string; symbol: string }>();
    STRIP_SYMBOLS.forEach((s) => map.set(`${s.market}:${s.symbol}`, { market: s.market, symbol: s.symbol }));
    openTrades.forEach((t) => map.set(`${t.market}:${t.symbol}`, { market: t.market, symbol: t.symbol }));
    return [...map.values()];
  }, [openTrades]);
  const { data: quotes } = useQuotes(quotePairs);

  const stats = useMemo(() => {
    const realized = closedTrades.reduce((s, t) => s + toUsd(t, tradePnl(t) ?? 0), 0);
    const wins = closedTrades.filter((t) => (tradePnl(t) ?? 0) > 0);
    const losses = closedTrades.filter((t) => (tradePnl(t) ?? 0) <= 0);
    const winRate = closedTrades.length ? (wins.length / closedTrades.length) * 100 : 0;
    const unrealized = openTrades.reduce((s, t) => {
      const q = quotes?.[`${t.market}:${t.symbol}`];
      const p = tradePnl(t, q?.price);
      return p == null ? s : s + toUsd(t, p);
    }, 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + toUsd(t, tradePnl(t)!), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + toUsd(t, tradePnl(t)!), 0) / losses.length) : 0;
    const days = new Set((entries ?? []).map((e) => e.date));
    let streak = 0;
    const cursor = new Date();
    if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { realized, winRate, unrealized, streak, avgWin, avgLoss, wins: wins.length, total: closedTrades.length };
  }, [closedTrades, openTrades, quotes, entries]);

  const equity = useMemo(() => {
    let acc = 0;
    const pts = closedTrades.map((t) => {
      acc += toUsd(t, tradePnl(t) ?? 0);
      return { label: format(new Date(t.exitAt!), "MMM d"), value: acc };
    });
    if (pts.length) pts.unshift({ label: "Start", value: 0 });
    return pts;
  }, [closedTrades]);

  const allocation = useMemo(() => {
    const counts = new Map<string, number>();
    (trades ?? []).forEach((t) => counts.set(t.market, (counts.get(t.market) ?? 0) + 1));
    const palette: Record<string, string> = {
      us: "var(--chart-1)",
      india: "var(--chart-4)",
      forex: "var(--chart-3)",
      crypto: "var(--chart-2)",
      gold: "var(--chart-5)",
    };
    return [...counts.entries()].map(([m, c]) => ({ label: marketOf(m).label, value: c, color: palette[m] ?? "var(--chart-5)" }));
  }, [trades]);

  const recent = useMemo(() => (trades ?? []).slice(0, 5), [trades]);
  const recentEntries = useMemo(() => (entries ?? []).slice(0, 3), [entries]);
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (tradesLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      {/* header */}
      <motion.header variants={staggerContainer(0.06)} initial="initial" animate="animate" className="flex flex-wrap items-end justify-between gap-4">
        <motion.div variants={riseItem}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="mt-1.5 font-display text-[30px] font-semibold tracking-[-0.03em]">{greeting}.</h1>
        </motion.div>
        <motion.div variants={riseItem} className="flex gap-2">
          <Link href="/trades?new=1">
            <Button><CandlestickChart className="h-4 w-4" /> Log trade</Button>
          </Link>
          <Link href="/journal?new=1">
            <Button variant="outline"><Feather className="h-4 w-4" /> Write</Button>
          </Link>
        </motion.div>
      </motion.header>

      {/* markets strip */}
      <motion.section variants={riseItem} initial="initial" animate="animate">
        <SectionTitle icon={Radio} title="Markets now" hint="refreshes every 15s" action={<LiveDot />} />
        <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
          <div className="flex w-max gap-3 pr-4">
            {STRIP_SYMBOLS.map((s) => (
              <StripQuote key={`${s.market}:${s.symbol}`} symbol={s.symbol} market={s.market} quote={quotes?.[`${s.market}:${s.symbol}`]} />
            ))}
          </div>
        </div>
      </motion.section>

      {/* stat tiles */}
      <motion.section variants={staggerContainer(0.05)} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={riseItem} className="h-full">
          <Card className="h-full">
            <CardHeader><CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Realized P&L</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              <AnimatedNumber value={stats.realized} format={(n) => formatMoney(n, "USD", { sign: true })} className={cn("font-display text-[26px] font-semibold tabular tracking-[-0.02em]", stats.realized >= 0 ? "text-up" : "text-down")} />
              <p className="text-[12px] text-muted-foreground">{stats.total} closed trades · USD-normalized</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={riseItem} className="h-full">
          <Card className="h-full">
            <CardHeader><CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Open exposure</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              <AnimatedNumber value={stats.unrealized} format={(n) => formatMoney(n, "USD", { sign: true })} className={cn("font-display text-[26px] font-semibold tabular tracking-[-0.02em]", stats.unrealized >= 0 ? "text-up" : "text-down")} />
              <p className="text-[12px] text-muted-foreground">{openTrades.length} open positions · marked live</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={riseItem} className="h-full">
          <Card className="h-full">
            <CardHeader><CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Discipline</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <WinRing rate={stats.winRate} size={86} label="win rate" />
                <div className="space-y-1 text-[11.5px] leading-tight text-muted-foreground">
                  <p>Avg win <span className="font-medium text-up tabular">{formatMoney(stats.avgWin, "USD")}</span></p>
                  <p>Avg loss <span className="font-medium text-down tabular">{formatMoney(stats.avgLoss, "USD")}</span></p>
                  <p>{stats.wins}W / {stats.total - stats.wins}L</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={riseItem} className="h-full">
          <Card className="h-full">
            <CardHeader><CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Journal streak</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Flame className="h-5 w-5" /></div>
                <div>
                  <div className="font-display text-[26px] font-semibold tabular"><AnimatedNumber value={stats.streak} format={(n) => `${Math.round(n)}`} /><span className="ml-1 text-[14px] font-normal text-muted-foreground">days</span></div>
                  <p className="text-[11.5px] text-muted-foreground">{stats.streak > 0 ? "Keep the chain alive" : "Write today to start one"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      {/* equity + allocation */}
      <motion.section variants={staggerContainer(0.06)} initial="initial" animate="animate" className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
        <motion.div variants={riseItem}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px] font-display font-semibold tracking-[-0.01em]">
                <TrendingUp className="h-[15px] w-[15px] text-primary" /> Equity curve
                <span className="ml-1 hidden text-[11.5px] font-normal text-muted-foreground sm:inline">cumulative realized P&L</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equity.length > 1 ? (
                <AreaChart data={equity} formatY={(v) => formatCompact(v)} />
              ) : (
                <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="No curve yet" body="Close your first trade and your equity curve starts here." />
              )}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={riseItem}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px] font-display font-semibold tracking-[-0.01em]">
                <CandlestickChart className="h-[15px] w-[15px] text-primary" /> Where you play
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-full items-center justify-between gap-3 pt-2">
                <Donut parts={allocation} size={132} thickness={15} />
                <div className="grid flex-1 gap-2">
                  {allocation.map((a) => (
                    <div key={a.label} className="flex items-center gap-2 text-[12px]">
                      <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                      <span className="text-muted-foreground">{a.label}</span>
                      <span className="ml-auto font-medium tabular">{a.value}</span>
                    </div>
                  ))}
                  {allocation.length === 0 && <p className="text-[12px] text-muted-foreground">Log a trade to see your market mix.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      {/* open positions + journal */}
      <motion.section variants={staggerContainer(0.06)} initial="initial" animate="animate" className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={riseItem}>
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[15px] font-display font-semibold tracking-[-0.01em]">
                <CandlestickChart className="h-[15px] w-[15px] text-primary" /> Open positions
              </CardTitle>
              <Link href="/trades?status=open" className="text-[12px] font-medium text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {openTrades.slice(0, 5).map((t) => (
                <OpenRow key={t.id} trade={t} quotes={quotes} />
              ))}
              {openTrades.length === 0 && <p className="py-8 text-center text-[13px] text-muted-foreground">No open positions. The plan is working — or the market is waiting for you.</p>}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={riseItem}>
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[15px] font-display font-semibold tracking-[-0.01em]">
                <NotebookPen className="h-[15px] w-[15px] text-primary" /> From the journal
              </CardTitle>
              <Link href="/journal" className="text-[12px] font-medium text-primary hover:underline">All entries</Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentEntries.map((e) => (
                <Link
                  key={e.id}
                  href="/journal"
                  className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", moodDot(e.mood))} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium transition-colors group-hover:text-primary">{e.title}</div>
                    <div className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{e.content.split("\n")[0]}</div>
                  </div>
                  <span className="ml-auto shrink-0 pt-0.5 text-[11px] text-muted-foreground tabular">{format(new Date(e.date + "T12:00:00"), "MMM d")}</span>
                </Link>
              ))}
              {recentEntries.length === 0 && <p className="py-8 text-center text-[13px] text-muted-foreground">No entries yet. Your future self is waiting to read them.</p>}
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      {/* recent trades */}
      <motion.section variants={riseItem} initial="initial" animate="animate">
        <SectionTitle icon={BookOpenText} title="Recent trades" action={<Link href="/trades" className="text-[12px] font-medium text-primary hover:underline">Full log</Link>} />
        <Card className="divide-y divide-border overflow-hidden">
          {recent.map((t) => (
            <RecentTradeRow key={t.id} trade={t} quotes={quotes} />
          ))}
          {recent.length === 0 && (
            <div className="p-5">
              <EmptyState
                icon={<CandlestickChart className="h-5 w-5" />}
                title="No trades yet"
                body="Log your first trade and the whole journal starts working."
                action={<Link href="/trades?new=1"><Button size="sm">Log trade</Button></Link>}
              />
            </div>
          )}
        </Card>
      </motion.section>
    </div>
  );
}

function moodDot(mood: string | null) {
  switch (mood) {
    case "great": return "bg-up";
    case "good": return "bg-up/80";
    case "neutral": return "bg-muted-foreground/50";
    case "low": return "bg-primary";
    case "rough": return "bg-down";
    default: return "bg-muted-foreground/50";
  }
}

function OpenRow({ trade, quotes }: { trade: Trade; quotes?: QuotesMap }) {
  const q = quotes?.[`${trade.market}:${trade.symbol}`];
  const pnl = tradePnl(trade, q?.price);
  const cur = marketOf(trade.market).currency;
  const pos = (pnl ?? 0) >= 0;
  const flash = useFlash(pnl ?? undefined);
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50">
      <SideBadge side={trade.side} />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">{trade.symbol}</div>
        <div className="text-[11px] text-muted-foreground">{num(trade.quantity)} @ {formatPrice(num(trade.entryPrice), decimalsFor(trade.symbol, trade.market))}</div>
      </div>
      <div className="text-right">
        <div className={cn("text-[13px] font-semibold tabular", pos ? "text-up" : "text-down", flash === "up" && "flash-up", flash === "down" && "flash-down")}>
          {pnl == null ? "—" : formatMoney(pnl, cur, { sign: true })}
        </div>
        <div className="text-[10.5px] text-muted-foreground tabular">{q ? formatPrice(q.price, decimalsFor(trade.symbol, trade.market)) : "…"}</div>
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
    <div className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent/40 sm:px-5">
      <SideBadge side={trade.side} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold">{trade.symbol}</span>
          <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">{marketOf(trade.market).short}</span>
          {isOpen && <span className="rounded-full bg-primary-soft px-1.5 py-px text-[10px] font-medium text-primary">open</span>}
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">{trade.setup ?? marketOf(trade.market).label} · {format(new Date(trade.entryAt), "MMM d")}</div>
      </div>
      <div className={cn("text-[13.5px] font-semibold tabular", pnl == null ? "text-muted-foreground" : pos ? "text-up" : "text-down")}>
        {pnl == null ? "—" : formatMoney(pnl, cur, { sign: true })}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[74px] w-[132px] shrink-0 animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[120px] animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
      <div className="h-[320px] animate-pulse rounded-xl bg-muted/70" />
    </div>
  );
}
