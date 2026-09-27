"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { BarChart3, CalendarDays, Gauge, ShieldCheck, Target, Trophy } from "lucide-react";
import { useFxRate, useTrades } from "@/lib/hooks";
import { tradePnlUsd } from "@/lib/markets";
import { cn, formatMoney } from "@/lib/utils";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { HBars } from "@/components/charts";

export default function PerformancePage() {
  const { data: trades, isLoading } = useTrades();
  const { inrPerUsd } = useFxRate();
  const closed = useMemo(() => (trades ?? []).filter((t) => t.status === "closed" && t.exitPrice != null), [trades]);
  // Rows are kept in chronological (exit time) order so streaks, drawdown and the curve are all computed on the same sequence.
  const rows = useMemo(
    () =>
      closed
        .map((t) => ({ t, exitAt: new Date(t.exitAt ?? t.entryAt), pnl: tradePnlUsd(t, inrPerUsd) ?? 0 }))
        .sort((a, b) => a.exitAt.getTime() - b.exitAt.getTime()),
    [closed, inrPerUsd],
  );

  const metrics = useMemo(() => {
    const wins = rows.filter((r) => r.pnl > 0);
    const losses = rows.filter((r) => r.pnl <= 0);
    const grossWin = wins.reduce((s, r) => s + r.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, r) => s + r.pnl, 0));
    const curve: { x: Date; value: number }[] = [];
    let equity = 0;
    let peak = 0;
    let maxDD = 0;
    let winStreak = 0;
    let lossStreak = 0;
    let bestWin = 0;
    let bestLoss = 0;
    for (const r of rows) {
      equity += r.pnl;
      peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak - equity);
      curve.push({ x: r.exitAt, value: equity });
      if (r.pnl > 0) {
        winStreak++;
        lossStreak = 0;
        bestWin = Math.max(bestWin, winStreak);
      } else {
        lossStreak++;
        winStreak = 0;
        bestLoss = Math.max(bestLoss, lossStreak);
      }
    }
    return {
      net: equity,
      grossWin,
      grossLoss,
      profitFactor: grossLoss ? grossWin / grossLoss : Infinity,
      maxDD,
      winRate: rows.length ? (wins.length / rows.length) * 100 : 0,
      curve,
      bestWin,
      bestLoss,
    };
  }, [rows]);

  const byMonth = useMemo(() => {
    const m = new Map<string, { label: string; value: number }>();
    rows.forEach((r) => {
      const key = format(r.exitAt, "yyyy-MM");
      const bucket = m.get(key) ?? { label: format(r.exitAt, "MMM yyyy"), value: 0 };
      bucket.value += r.pnl;
      m.set(key, bucket);
    });
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([, v]) => v);
  }, [rows]);

  const bySetup = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number; wins: number }>();
    rows.forEach((r) => {
      const k = r.t.setup || "No setup";
      const v = m.get(k) ?? { pnl: 0, trades: 0, wins: 0 };
      v.pnl += r.pnl;
      v.trades++;
      if (r.pnl > 0) v.wins++;
      m.set(k, v);
    });
    return [...m.entries()]
      .map(([label, v]) => ({ label, value: v.pnl, ...v, winRate: (v.wins / v.trades) * 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const byHour = useMemo(() => {
    const m = new Map<number, number>();
    rows.forEach((r) => {
      const h = new Date(r.t.entryAt).getHours();
      m.set(h, (m.get(h) ?? 0) + r.pnl);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([h, value]) => ({ label: `${String(h).padStart(2, "0")}:00`, value }));
  }, [rows]);

  const last30 = useMemo(() => {
    const cutoff = subDays(new Date(), 29);
    const r = rows.filter((x) => x.exitAt >= cutoff);
    const pnl = r.reduce((s, x) => s + x.pnl, 0);
    return { trades: r.length, pnl, winRate: r.length ? (r.filter((x) => x.pnl > 0).length / r.length) * 100 : 0 };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-52" />
        ))}
      </div>
    );
  }
  if (!closed.length) {
    return <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No closed trades yet" body="Close a few trades and Quill will build the performance engine here." />;
  }

  const curveMin = metrics.curve.length ? Math.min(0, ...metrics.curve.map((x) => x.value)) : 0;
  const curveMax = metrics.curve.length ? Math.max(0, ...metrics.curve.map((x) => x.value)) : 1;
  const span = curveMax - curveMin || 1;
  const zeroY = 210 - ((0 - curveMin) / span) * 190;
  const points = metrics.curve
    .map((p, i) => {
      const x = 20 + (i / Math.max(1, metrics.curve.length - 1)) * 760;
      const y = 210 - ((p.value - curveMin) / span) * 190;
      return `${x},${y}`;
    })
    .join(" ");
  const first = metrics.curve[0];
  const last = metrics.curve.at(-1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-brand">Evidence</p>
          <h1 className="mt-1 font-display text-[28px] font-semibold tracking-[-.03em]">Performance</h1>
          <p className="mt-1 text-[13px] text-sub">Advanced evidence from {closed.length} closed trades · USD-normalized.</p>
        </div>
        <Link href="/trades">
          <Button variant="outline">
            <Target className="h-4 w-4" /> Trade log
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-faint">Net P&L</div>
          <div className={cn("tabular mt-2 font-display text-[27px] font-semibold", metrics.net >= 0 ? "text-up" : "text-down")}>{formatMoney(metrics.net, "USD", { sign: true })}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-faint">Profit factor</div>
          <div className="tabular mt-2 font-display text-[27px] font-semibold">{Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : "∞"}</div>
          <div className="mt-1 text-[11px] text-faint">
            gross {formatMoney(metrics.grossWin, "USD")} / {formatMoney(metrics.grossLoss, "USD")}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-faint">Max drawdown</div>
          <div className="tabular mt-2 font-display text-[27px] font-semibold text-down">{formatMoney(metrics.maxDD, "USD")}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-faint">Win rate</div>
          <div className="tabular mt-2 font-display text-[27px] font-semibold">{metrics.winRate.toFixed(1)}%</div>
          <div className="mt-1 text-[11px] text-faint">
            {metrics.bestWin} best win streak · {metrics.bestLoss} loss streak
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-faint">
          <Gauge className="h-3.5 w-3.5 text-brand" /> Equity curve
        </div>
        <div className="h-48 rounded-2xl bg-paper p-3">
          <svg viewBox="0 0 800 220" className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Equity curve">
            <line x1="0" y1={zeroY} x2="800" y2={zeroY} stroke="currentColor" className="text-faint/25" strokeDasharray="4 5" />
            <polyline fill="none" stroke="currentColor" className="text-brand" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
          </svg>
        </div>
        <div className="mt-3 flex justify-between text-[10.5px] text-faint">
          <span>{first ? format(first.x, "MMM d") : "—"}</span>
          <span>realized, USD-normalized</span>
          <span>{last ? format(last.x, "MMM d") : "—"}</span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-faint">
            <Trophy className="h-3.5 w-3.5 text-brand" /> Monthly P&L
          </div>
          {byMonth.length ? <HBars data={byMonth} format={(v) => formatMoney(v, "USD", { sign: true })} /> : <p className="text-[12px] text-faint">Not enough data.</p>}
        </Card>
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-faint">
            <Target className="h-3.5 w-3.5 text-brand" /> Setup leaderboard
          </div>
          <div className="space-y-2.5">
            {bySetup.map((x) => (
              <div key={x.label} className="rounded-xl bg-paper px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[12.5px] font-medium">{x.label}</span>
                  <span className={cn("font-mono text-[12px] font-semibold", x.pnl >= 0 ? "text-up" : "text-down")}>{formatMoney(x.pnl, "USD", { sign: true })}</span>
                </div>
                <div className="mt-1 text-[10.5px] text-faint">
                  {x.trades} trades · {x.winRate.toFixed(0)}% winners
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-faint">
            <CalendarDays className="h-3.5 w-3.5 text-brand" /> P&L by entry hour
          </div>
          {byHour.length ? <HBars data={byHour} format={(v) => formatMoney(v, "USD", { sign: true })} /> : <p className="text-[12px] text-faint">Not enough data.</p>}
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-faint">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Last 30 days
          </div>
          <div className="space-y-3">
            <div className={cn("font-display text-[25px] font-semibold", last30.pnl >= 0 ? "text-up" : "text-down")}>{formatMoney(last30.pnl, "USD", { sign: true })}</div>
            <div className="text-[12px] text-faint">
              {last30.trades} trades · {last30.winRate.toFixed(0)}% winners
            </div>
            <p className="rounded-xl bg-paper p-3 text-[11.5px] leading-relaxed text-sub">Use recent performance for context, not as a guarantee of future results.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
