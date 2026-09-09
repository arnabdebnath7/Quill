"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Brain, CalendarDays, Crosshair, PieChart, Scale, Trophy } from "lucide-react";
import { useTrades } from "@/lib/hooks";
import { marketOf } from "@/lib/markets";
import { cn, formatMoney, tradePnl } from "@/lib/utils";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { AnimatedNumber, HBars } from "@/components/charts";

const EASE = [0.22, 1, 0.36, 1] as const;
const INR_PER_USD = 88.3;

export default function InsightsPage() {
  const { data: trades, isLoading } = useTrades();

  const closed = useMemo(
    () => (trades ?? []).filter((t) => t.status === "closed" && t.exitPrice != null),
    [trades]
  );

  const usd = (mkt: string, p: number) => (mkt === "india" ? p / INR_PER_USD : p);

  const byMarket = useMemo(() => {
    const m = new Map<string, number>();
    closed.forEach((t) => m.set(t.market, (m.get(t.market) ?? 0) + usd(t.market, tradePnl(t) ?? 0)));
    return [...m.entries()].map(([k, v]) => ({ label: marketOf(k).label, value: v })).sort((a, b) => b.value - a.value);
  }, [closed]);

  const byWeekday = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const m = new Map<number, number>();
    closed.forEach((t) => {
      const d = new Date(t.exitAt!).getDay();
      m.set(d, (m.get(d) ?? 0) + usd(t.market, tradePnl(t) ?? 0));
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([d, v]) => ({ label: labels[d], value: v }));
  }, [closed]);

  const bySetup = useMemo(() => {
    const m = new Map<string, number>();
    closed.forEach((t) => {
      const s = t.setup ?? "No setup";
      m.set(s, (m.get(s) ?? 0) + usd(t.market, tradePnl(t) ?? 0));
    });
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [closed]);

  const sideStats = useMemo(() => {
    const calc = (side: string) => {
      const list = closed.filter((t) => t.side === side);
      const wins = list.filter((t) => (tradePnl(t) ?? 0) > 0).length;
      return { total: list.length, wins, rate: list.length ? (wins / list.length) * 100 : 0, pnl: list.reduce((s, t) => s + usd(t.market, tradePnl(t) ?? 0), 0) };
    };
    return { long: calc("long"), short: calc("short") };
  }, [closed]);

  const outline = useMemo(() => {
    if (closed.length === 0) return null;
    const withPnl = closed.map((t) => ({ t, pnl: usd(t.market, tradePnl(t) ?? 0) }));
    const best = [...withPnl].sort((a, b) => b.pnl - a.pnl)[0];
    const worst = [...withPnl].sort((a, b) => a.pnl - b.pnl)[0];
    const wins = withPnl.filter((x) => x.pnl > 0);
    const losses = withPnl.filter((x) => x.pnl <= 0);
    const avgWin = wins.length ? wins.reduce((s, x) => s + x.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, x) => s + x.pnl, 0)) / losses.length : 0;
    const winRate = (wins.length / withPnl.length) * 100;
    const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;
    return { best, worst, avgWin, avgLoss, expectancy, winRate };
  }, [closed]);

  if (isLoading) {
    return <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>;
  }

  if (closed.length === 0) {
    return (
      <EmptyState
        icon={<PieChart className="h-5 w-5" />}
        title="No closed trades yet"
        body="Insights need a few completed trades to find your patterns. Close a position, then come back."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[27px] font-semibold tracking-[-0.02em]">Insights</h1>
        <p className="mt-1 text-[13px] text-sub">Patterns hiding in {closed.length} closed trades · USD-normalized</p>
      </div>

      {/* headline metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            <Crosshair className="h-3.5 w-3.5 text-brand" /> Expectancy / trade
          </div>
          <AnimatedNumber
            value={outline!.expectancy}
            format={(n) => formatMoney(n, "USD", { sign: true })}
            className={cn("font-display text-[28px] font-semibold tabular", outline!.expectancy >= 0 ? "text-up" : "text-down")}
          />
          <p className="mt-2 text-[12px] leading-relaxed text-faint">
            What an average trade is worth to you. Positive expectancy + discipline is the whole game.
          </p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            <Scale className="h-3.5 w-3.5 text-brand" /> Payoff ratio
          </div>
          <div className="font-display text-[28px] font-semibold tabular">
            {outline!.avgLoss > 0 ? (outline!.avgWin / outline!.avgLoss).toFixed(2) : "∞"}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-faint">
            Avg win {formatMoney(outline!.avgWin, "USD")} vs avg loss {formatMoney(outline!.avgLoss, "USD")}.
          </p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            <Brain className="h-3.5 w-3.5 text-brand" /> Win rate
          </div>
          <AnimatedNumber value={outline!.winRate} format={(n) => `${n.toFixed(1)}%`} className="font-display text-[28px] font-semibold tabular" />
          <p className="mt-2 text-[12px] leading-relaxed text-faint">
            Win rate alone means nothing — pair it with the payoff ratio.
          </p>
        </Card>
      </div>

      {/* best/worst */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Best trade", icon: Trophy, item: outline!.best, tone: "up" as const },
          { label: "Costliest lesson", icon: ArrowDownRight, item: outline!.worst, tone: "down" as const },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4, ease: EASE }}>
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                <c.icon className="h-3.5 w-3.5 text-brand" /> {c.label}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-[19px] font-semibold">{c.item.t.symbol}</div>
                  <div className="mt-0.5 text-[12px] text-faint">
                    {c.item.t.setup ?? "No setup"} · {format(new Date(c.item.t.entryAt), "MMM d")} · {c.item.t.side}
                  </div>
                  {c.item.t.notes && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-sub">{c.item.t.notes}</p>}
                </div>
                <div className={cn("shrink-0 font-mono text-[18px] font-semibold tabular", c.tone === "up" ? "text-up" : "text-down")}>
                  {formatMoney(c.item.pnl, "USD", { sign: true })}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            <PieChart className="h-3.5 w-3.5 text-brand" /> P&L by market
          </div>
          <HBars data={byMarket} format={(v) => formatMoney(v, "USD", { sign: true })} />
        </Card>
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            <CalendarDays className="h-3.5 w-3.5 text-brand" /> P&L by weekday
          </div>
          {byWeekday.length ? (
            <HBars data={byWeekday} format={(v) => formatMoney(v, "USD", { sign: true })} />
          ) : (
            <p className="text-[13px] text-faint">Not enough data.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">P&L by setup</div>
          <HBars data={bySetup} format={(v) => formatMoney(v, "USD", { sign: true })} />
        </Card>
        <Card className="p-5">
          <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Long vs short</div>
          <div className="space-y-5">
            {([
              { label: "Long", icon: ArrowUpRight, stats: sideStats.long },
              { label: "Short", icon: ArrowDownRight, stats: sideStats.short },
            ] as const).map((s) => (
              <div key={s.label} className="flex items-center gap-4">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.label === "Long" ? "bg-up-soft text-up" : "bg-down-soft text-down")}>
                  <s.icon className="h-4.5 w-4.5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13.5px] font-medium">{s.label}</span>
                    <span className={cn("font-mono text-[14px] font-semibold tabular", s.stats.pnl >= 0 ? "text-up" : "text-down")}>
                      {formatMoney(s.stats.pnl, "USD", { sign: true })}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-faint">
                    {s.stats.total} trades · {s.stats.rate.toFixed(0)}% winners
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/50">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: s.label === "Long" ? "var(--up)" : "var(--down)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.stats.rate}%` }}
                      transition={{ duration: 0.9, ease: EASE }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-line/30 px-3.5 py-2.5 text-[12px] leading-relaxed text-sub">
            {sideStats.short.total < 5
              ? "Small sample on shorts — call it exploration, not edge, until the count grows."
              : "Sample is decent on both sides. Compare the win bars, then double down on what actually pays you."}
          </p>
        </Card>
      </div>
    </div>
  );
}

