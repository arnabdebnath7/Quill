"use client";

import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import Link from "next/link";
import { BarChart3, CalendarDays, Gauge, ShieldCheck, Target, Trophy } from "lucide-react";
import { useTrades } from "@/lib/hooks";
import { cn, formatMoney, tradePnl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SectionTitle, StatCard } from "@/components/primitives";
import { AnimatedNumber, HBars } from "@/components/charts";
import { EASE } from "@/lib/motion";

const INR_PER_USD = 88.3;
const usd = (market: string, pnl: number) => (market === "india" ? pnl / INR_PER_USD : pnl);

export default function PerformancePage() {
  const { data: trades, isLoading } = useTrades();
  const closed = useMemo(() => (trades ?? []).filter((t) => t.status === "closed" && t.exitPrice != null), [trades]);
  const rows = useMemo(() => closed.map((t) => ({ t, pnl: usd(t.market, tradePnl(t) ?? 0) })), [closed]);

  const metrics = useMemo(() => {
    const sorted = [...rows].sort((a, b) => new Date(a.t.exitAt!).getTime() - new Date(b.t.exitAt!).getTime());
    const wins = rows.filter((r) => r.pnl > 0);
    const losses = rows.filter((r) => r.pnl <= 0);
    const grossWin = wins.reduce((s, r) => s + r.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, r) => s + r.pnl, 0));
    let equity = 0, peak = 0, maxDD = 0;
    const curve = sorted.map((r) => {
      equity += r.pnl;
      peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak - equity);
      return { x: new Date(r.t.exitAt!), value: equity };
    });
    let winStreak = 0, lossStreak = 0, bestWin = 0, bestLoss = 0;
    for (const r of sorted) {
      if (r.pnl > 0) { winStreak++; lossStreak = 0; bestWin = Math.max(bestWin, winStreak); }
      else { lossStreak++; winStreak = 0; bestLoss = Math.max(bestLoss, lossStreak); }
    }
    return { net: equity, grossWin, grossLoss, profitFactor: grossLoss ? grossWin / grossLoss : Infinity, maxDD, winRate: rows.length ? (wins.length / rows.length) * 100 : 0, curve, bestWin, bestLoss };
  }, [rows]);

  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => { const k = format(new Date(r.t.exitAt!), "MMM yyyy"); m.set(k, (m.get(k) ?? 0) + r.pnl); });
    return [...m.entries()].slice(-8).map(([label, value]) => ({ label, value }));
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
    return [...m.entries()].map(([label, v]) => ({ label, value: v.pnl, ...v, winRate: (v.wins / v.trades) * 100 })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [rows]);

  const byHour = useMemo(() => {
    const m = new Map<number, number>();
    rows.forEach((r) => { const h = new Date(r.t.entryAt).getHours(); m.set(h, (m.get(h) ?? 0) + r.pnl); });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([h, value]) => ({ label: `${String(h).padStart(2, "0")}:00`, value }));
  }, [rows]);

  const last30 = useMemo(() => {
    const cutoff = subDays(new Date(), 29);
    const r = rows.filter((x) => new Date(x.t.exitAt!) >= cutoff);
    const pnl = r.reduce((s, x) => s + x.pnl, 0);
    return { trades: r.length, pnl, winRate: r.length ? (r.filter((x) => x.pnl > 0).length / r.length) * 100 : 0 };
  }, [rows]);

  if (isLoading)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    );

  if (!closed.length)
    return <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No closed trades yet" body="Close a few trades and Quill will build the performance engine here." />;

  const curveMin = metrics.curve.length ? Math.min(0, ...metrics.curve.map((x) => x.value)) : 0;
  const curveMax = metrics.curve.length ? Math.max(0, ...metrics.curve.map((x) => x.value)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Evidence layer</p>
          <h1 className="mt-1 font-display text-[28px] font-semibold tracking-[-0.03em]">Performance</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Advanced evidence from {closed.length} closed trades.</p>
        </div>
        <Link href="/trades">
          <Button variant="outline"><Target className="h-4 w-4" /> Trade log</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net P&L" delay={0} value={<AnimatedNumber value={metrics.net} format={(n) => formatMoney(n, "USD", { sign: true })} className={cn("font-display text-[27px] font-semibold tabular", metrics.net >= 0 ? "text-up" : "text-down")} />} />
        <StatCard label="Profit factor" delay={0.05} value={<span className="font-display text-[27px] font-semibold tabular">{Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : "∞"}</span>} sub={<>gross {formatMoney(metrics.grossWin, "USD")} / {formatMoney(metrics.grossLoss, "USD")}</>} />
        <StatCard label="Max drawdown" delay={0.1} value={<span className="font-display text-[27px] font-semibold tabular text-down">{formatMoney(metrics.maxDD, "USD")}</span>} />
        <StatCard label="Win rate" delay={0.15} value={<span className="font-display text-[27px] font-semibold tabular"><AnimatedNumber value={metrics.winRate} format={(n) => `${n.toFixed(1)}%`} /></span>} sub={<>{metrics.bestWin} best win streak · {metrics.bestLoss} loss streak</>} />
      </div>

      <Card>
        <CardHeader><SectionTitle icon={Gauge} title="Equity curve" hint="realized, USD-normalized" className="mb-0" /></CardHeader>
        <CardContent>
          <div className="rounded-xl bg-muted/40 p-3">
            <svg viewBox="0 0 800 220" className="h-48 w-full" preserveAspectRatio="none" role="img" aria-label="Equity curve">
              <line
                x1="0"
                y1={220 - ((0 - curveMin) / (curveMax - curveMin || 1)) * 200 - 10}
                x2="800"
                y2={220 - ((0 - curveMin) / (curveMax - curveMin || 1)) * 200 - 10}
                stroke="currentColor"
                className="text-muted-foreground/25"
                strokeDasharray="4 5"
              />
              <motion.polyline
                fill="none"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={metrics.curve.map((p, i) => {
                  const x = 20 + (i / Math.max(1, metrics.curve.length - 1)) * 760;
                  const y = 210 - ((p.value - curveMin) / (curveMax - curveMin || 1)) * 190;
                  return `${x},${y}`;
                }).join(" ")}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: EASE }}
              />
            </svg>
          </div>
          <div className="mt-3 flex justify-between text-[10.5px] text-muted-foreground">
            <span>{metrics.curve[0] ? format(metrics.curve[0].x, "MMM d") : "—"}</span>
            <span className="hidden sm:inline">realized, USD-normalized</span>
            <span>{metrics.curve.at(-1) ? format(metrics.curve.at(-1)!.x, "MMM d") : "—"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><SectionTitle icon={Trophy} title="Monthly P&L" className="mb-0" /></CardHeader>
          <CardContent>{byMonth.length ? <HBars data={byMonth} format={(v) => formatMoney(v, "USD", { sign: true })} /> : <p className="text-[12px] text-muted-foreground">Not enough data.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><SectionTitle icon={Target} title="Setup leaderboard" className="mb-0" /></CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {bySetup.map((x) => (
                <div key={x.label} className="rounded-xl bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[12.5px] font-medium">{x.label}</span>
                    <span className={cn("font-mono text-[12px] font-semibold", x.pnl >= 0 ? "text-up" : "text-down")}>{formatMoney(x.pnl, "USD", { sign: true })}</span>
                  </div>
                  <div className="mt-1 text-[10.5px] text-muted-foreground">{x.trades} trades · {x.winRate.toFixed(0)}% winners</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><SectionTitle icon={CalendarDays} title="P&L by entry hour" className="mb-0" /></CardHeader>
          <CardContent>{byHour.length ? <HBars data={byHour} format={(v) => formatMoney(v, "USD", { sign: true })} /> : <p className="text-[12px] text-muted-foreground">Not enough data.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><SectionTitle icon={ShieldCheck} title="Last 30 days" className="mb-0" /></CardHeader>
          <CardContent>
            <div className={cn("font-display text-[25px] font-semibold", last30.pnl >= 0 ? "text-up" : "text-down")}>{formatMoney(last30.pnl, "USD", { sign: true })}</div>
            <div className="text-[12px] text-muted-foreground">{last30.trades} trades · {last30.winRate.toFixed(0)}% winners</div>
            <p className="mt-3 rounded-xl bg-muted/40 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Use recent performance for context, not as a guarantee of future results.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
