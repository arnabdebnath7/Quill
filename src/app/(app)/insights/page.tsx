"use client";

import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CalendarDays,
  Crosshair,
  Gauge,
  HeartPulse,
  Moon,
  PieChart,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useCheckinHistory, useTrades } from "@/lib/hooks";
import { marketOf } from "@/lib/markets";
import { cn, formatMoney, tradePnl } from "@/lib/utils";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { AnimatedNumber, HBars } from "@/components/charts";

const EASE = [0.22, 1, 0.36, 1] as const;
const INR_PER_USD = 88.3;
const MOOD_SCORE: Record<string, number> = { rough: 1, low: 2, neutral: 3, good: 4, great: 5 };

function localKey(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function readinessOf(checkin?: { energy?: number | null; focus?: number | null; sleepHours?: string | number | null } | null) {
  const sleep = checkin?.sleepHours == null ? 3 : Math.min(5, Math.max(1, Number(checkin.sleepHours) / 2));
  return Math.round((((checkin?.energy ?? 3) + (checkin?.focus ?? 3) + sleep) / 3 / 5) * 100);
}

export default function InsightsPage() {
  const { data: trades, isLoading } = useTrades();
  const endDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const startDate = useMemo(() => format(subDays(new Date(), 89), "yyyy-MM-dd"), []);
  const { data: checkins, isLoading: checkinsLoading } = useCheckinHistory(startDate, endDate);

  const closed = useMemo(
    () => (trades ?? []).filter((t) => t.status === "closed" && t.exitPrice != null),
    [trades]
  );

  const usd = (mkt: string, p: number) => (mkt === "india" ? p / INR_PER_USD : p);
  const checkinMap = useMemo(() => new Map((checkins ?? []).map((c) => [c.date, c])), [checkins]);

  const lifeTradeRows = useMemo(() => closed.map((t) => {
    const date = localKey(new Date(t.entryAt));
    const checkin = checkinMap.get(date);
    const pnl = usd(t.market, tradePnl(t) ?? 0);
    const readiness = checkin ? readinessOf(checkin) : null;
    return { trade: t, pnl, date, checkin, readiness, moodScore: checkin?.mood ? MOOD_SCORE[checkin.mood] ?? 3 : null };
  }), [closed, checkinMap]);

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

  const psychology = useMemo(() => {
    const matched = lifeTradeRows.filter((r) => r.readiness != null);
    const buckets = [
      { key: "high", label: "Ready ≥ 75", filter: (r: typeof matched[number]) => (r.readiness ?? 0) >= 75 },
      { key: "mid", label: "Selective 55–74", filter: (r: typeof matched[number]) => (r.readiness ?? 0) >= 55 && (r.readiness ?? 0) < 75 },
      { key: "low", label: "Protect < 55", filter: (r: typeof matched[number]) => (r.readiness ?? 0) < 55 },
    ].map((bucket) => {
      const rows = matched.filter(bucket.filter);
      const pnl = rows.reduce((s, r) => s + r.pnl, 0);
      const wins = rows.filter((r) => r.pnl > 0).length;
      return { ...bucket, trades: rows.length, pnl, avgPnl: rows.length ? pnl / rows.length : 0, winRate: rows.length ? (wins / rows.length) * 100 : 0 };
    });

    const readyValues = matched.map((r) => r.readiness as number);
    const pnlValues = matched.map((r) => r.pnl);
    const meanX = readyValues.length ? readyValues.reduce((a, b) => a + b, 0) / readyValues.length : 0;
    const meanY = pnlValues.length ? pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length : 0;
    const covariance = readyValues.reduce((sum, x, i) => sum + (x - meanX) * (pnlValues[i] - meanY), 0);
    const denom = Math.sqrt(readyValues.reduce((sum, x) => sum + (x - meanX) ** 2, 0) * pnlValues.reduce((sum, y) => sum + (y - meanY) ** 2, 0));
    const correlation = denom > 0 ? covariance / denom : 0;

    const moodRows = ["great", "good", "neutral", "low", "rough"].map((mood) => {
      const rows = matched.filter((r) => r.checkin?.mood === mood);
      const pnl = rows.reduce((s, r) => s + r.pnl, 0);
      return { mood, trades: rows.length, pnl, winRate: rows.length ? (rows.filter((r) => r.pnl > 0).length / rows.length) * 100 : 0 };
    });

    const checkinDays = checkins?.filter((c) => c.intention.trim() || c.tradingPlan.trim()).length ?? 0;
    const coverage = closed.length ? (matched.length / closed.length) * 100 : 0;
    return { buckets, matched: matched.length, coverage, correlation, moodRows, checkinDays };
  }, [lifeTradeRows, checkins, closed.length]);

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

  const strongestBucket = [...psychology.buckets].filter((b) => b.trades > 0).sort((a, b) => b.avgPnl - a.avgPnl)[0];
  const weakestBucket = [...psychology.buckets].filter((b) => b.trades > 0).sort((a, b) => a.avgPnl - b.avgPnl)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[27px] font-semibold tracking-[-0.02em]">Insights</h1>
          <p className="mt-1 text-[13px] text-sub">Patterns hiding in {closed.length} closed trades · USD-normalized</p>
        </div>
        <a href="/today"><Button variant="outline"><HeartPulse className="h-4 w-4" /> Daily check-in</Button></a>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-brand-soft/40 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand"><Sparkles className="h-3.5 w-3.5" /> Life × Trading</div>
              <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">Your state is part of the data.</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-sub">Quill compares your daily sleep, energy and focus check-ins with trade outcomes. These are personal signals, not predictions — the more consistent your check-ins, the more useful they become.</p>
            </div>
            <div className="rounded-2xl border border-brand/15 bg-card/70 px-4 py-3 text-right backdrop-blur"><div className="font-display text-2xl font-semibold tabular">{psychology.coverage.toFixed(0)}%</div><div className="text-[10.5px] text-faint">trades with a check-in</div></div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          {[
            { label: "Best state", value: strongestBucket?.label ?? "Not enough data", detail: strongestBucket ? `${strongestBucket.avgPnl >= 0 ? "+" : "−"}${formatMoney(Math.abs(strongestBucket.avgPnl), "USD")} avg / trade` : "Log more check-ins", icon: Gauge },
            { label: "Watch state", value: weakestBucket?.label ?? "Not enough data", detail: weakestBucket ? `${weakestBucket.avgPnl >= 0 ? "+" : "−"}${formatMoney(Math.abs(weakestBucket.avgPnl), "USD")} avg / trade` : "Log more check-ins", icon: ShieldCheck },
            { label: "State ↔ P&L", value: psychology.matched >= 4 ? `${psychology.correlation >= 0 ? "+" : "−"}${Math.abs(psychology.correlation).toFixed(2)}` : "—", detail: psychology.matched >= 4 ? "directional correlation" : "Need 4+ matched trades", icon: Activity },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35, ease: EASE }} className="rounded-2xl border border-line bg-paper p-4">
              <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint"><item.icon className="h-3.5 w-3.5 text-brand" /> {item.label}</div>
              <div className="mt-2 font-display text-[18px] font-semibold">{item.value}</div>
              <div className="mt-0.5 text-[11px] text-sub">{item.detail}</div>
            </motion.div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><Crosshair className="h-3.5 w-3.5 text-brand" /> Expectancy / trade</div><AnimatedNumber value={outline!.expectancy} format={(n) => formatMoney(n, "USD", { sign: true })} className={cn("font-display text-[28px] font-semibold tabular", outline!.expectancy >= 0 ? "text-up" : "text-down")} /><p className="mt-2 text-[12px] leading-relaxed text-faint">What an average trade is worth to you. Positive expectancy + discipline is the whole game.</p></Card>
        <Card className="p-5"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><Scale className="h-3.5 w-3.5 text-brand" /> Payoff ratio</div><div className="font-display text-[28px] font-semibold tabular">{outline!.avgLoss > 0 ? (outline!.avgWin / outline!.avgLoss).toFixed(2) : "∞"}</div><p className="mt-2 text-[12px] leading-relaxed text-faint">Avg win {formatMoney(outline!.avgWin, "USD")} vs avg loss {formatMoney(outline!.avgLoss, "USD")}.</p></Card>
        <Card className="p-5"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><Brain className="h-3.5 w-3.5 text-brand" /> Win rate</div><AnimatedNumber value={outline!.winRate} format={(n) => `${n.toFixed(1)}%`} className="font-display text-[28px] font-semibold tabular" /><p className="mt-2 text-[12px] leading-relaxed text-faint">Win rate alone means nothing — pair it with the payoff ratio.</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><Gauge className="h-3.5 w-3.5 text-brand" /> Readiness impact</div><h2 className="mt-1.5 font-display text-[18px] font-semibold">How your starting state behaves</h2></div><div className="rounded-xl bg-line/30 px-2.5 py-1.5 text-[10.5px] text-faint">{psychology.matched}/{closed.length} matched</div></div>
          <div className="space-y-3">{psychology.buckets.map((b) => <div key={b.key} className="rounded-2xl border border-line bg-paper p-4"><div className="flex items-center justify-between gap-3"><span className="text-[13px] font-medium">{b.label}</span><span className={cn("font-mono text-[13px] font-semibold tabular", b.pnl >= 0 ? "text-up" : "text-down")}>{formatMoney(b.pnl, "USD", { sign: true })}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint"><span>{b.trades} trades</span><span>{b.winRate.toFixed(0)}% winners</span><span>{formatMoney(b.avgPnl, "USD", { sign: true })} avg</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/50"><motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, b.winRate))}%` }} transition={{ duration: .7, ease: EASE }} /></div></div>)}</div>
          <div className="mt-4 rounded-2xl bg-brand-soft/60 px-4 py-3 text-[12px] leading-relaxed text-sub"><strong className="font-semibold text-ink">Read this carefully:</strong> a strong bucket is a signal worth investigating, not proof that your mood causes profits. Keep logging until the pattern survives a bigger sample.</div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><HeartPulse className="h-3.5 w-3.5 text-brand" /> Check-in consistency</div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-line bg-paper p-4"><div className="font-display text-[24px] font-semibold tabular">{checkins?.length ?? 0}</div><div className="mt-0.5 text-[11px] text-faint">days logged / 90</div></div><div className="rounded-2xl border border-line bg-paper p-4"><div className="font-display text-[24px] font-semibold tabular">{psychology.checkinDays}</div><div className="mt-0.5 text-[11px] text-faint">days with a plan</div></div></div>
          <div className="mt-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Moon className="h-5 w-5" /></div><div><div className="text-[13px] font-semibold">Sleep, energy, focus</div><div className="text-[11.5px] text-sub">Three variables Quill currently uses for readiness.</div></div></div>
          <div className="mt-5 rounded-2xl border border-line bg-paper p-4"><div className="flex items-center justify-between text-[12px]"><span>Matched trade coverage</span><span className="font-semibold tabular">{psychology.coverage.toFixed(0)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-line/50"><div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${Math.min(100, psychology.coverage)}%` }} /></div><p className="mt-2 text-[11px] leading-relaxed text-faint">The goal is not 100% overnight. Consistency is what makes your personal signal trustworthy.</p></div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><HeartPulse className="h-3.5 w-3.5 text-brand" /> Mood context</div><h2 className="mt-1.5 font-display text-[18px] font-semibold">Your outcomes by logged mood</h2></div><div className="text-[10.5px] text-faint">90-day window</div></div>
        <div className="grid gap-2.5 sm:grid-cols-5">{psychology.moodRows.map((row) => <div key={row.mood} className="rounded-2xl border border-line bg-paper p-3.5"><div className="text-[12px] font-semibold capitalize">{row.mood}</div><div className={cn("mt-1 font-mono text-[14px] font-semibold tabular", row.pnl >= 0 ? "text-up" : "text-down")}>{row.trades ? formatMoney(row.pnl, "USD", { sign: true }) : "—"}</div><div className="mt-0.5 text-[10.5px] text-faint">{row.trades ? `${row.trades} trades · ${row.winRate.toFixed(0)}% wins` : "No matched trades"}</div></div>)}</div>
        {checkinsLoading && <p className="mt-3 text-[11px] text-faint">Refreshing check-in context…</p>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">{[{ label: "Best trade", icon: Trophy, item: outline!.best, tone: "up" as const }, { label: "Costliest lesson", icon: ArrowDownRight, item: outline!.worst, tone: "down" as const }].map((c, i) => <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4, ease: EASE }}><Card className="p-5"><div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><c.icon className="h-3.5 w-3.5 text-brand" /> {c.label}</div><div className="flex items-center justify-between gap-3"><div><div className="font-display text-[19px] font-semibold">{c.item.t.symbol}</div><div className="mt-0.5 text-[12px] text-faint">{c.item.t.setup ?? "No setup"} · {format(new Date(c.item.t.entryAt), "MMM d")} · {c.item.t.side}</div>{c.item.t.notes && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-sub">{c.item.t.notes}</p>}</div><div className={cn("shrink-0 font-mono text-[18px] font-semibold tabular", c.tone === "up" ? "text-up" : "text-down")}>{formatMoney(c.item.pnl, "USD", { sign: true })}</div></div></Card></motion.div>)}</div>

      <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><PieChart className="h-3.5 w-3.5 text-brand" /> P&L by market</div><HBars data={byMarket} format={(v) => formatMoney(v, "USD", { sign: true })} /></Card><Card className="p-5"><div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"><CalendarDays className="h-3.5 w-3.5 text-brand" /> P&L by weekday</div>{byWeekday.length ? <HBars data={byWeekday} format={(v) => formatMoney(v, "USD", { sign: true })} /> : <p className="text-[13px] text-faint">Not enough data.</p>}</Card></div>
      <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">P&L by setup</div><HBars data={bySetup} format={(v) => formatMoney(v, "USD", { sign: true })} /></Card><Card className="p-5"><div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Long vs short</div><div className="space-y-5">{([{ label: "Long", icon: ArrowUpRight, stats: sideStats.long }, { label: "Short", icon: ArrowDownRight, stats: sideStats.short }] as const).map((s) => <div key={s.label} className="flex items-center gap-4"><span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.label === "Long" ? "bg-up-soft text-up" : "bg-down-soft text-down")}><s.icon className="h-4.5 w-4.5" /></span><div className="flex-1"><div className="flex items-baseline justify-between"><span className="text-[13.5px] font-medium">{s.label}</span><span className={cn("font-mono text-[14px] font-semibold tabular", s.stats.pnl >= 0 ? "text-up" : "text-down")}>{formatMoney(s.stats.pnl, "USD", { sign: true })}</span></div><div className="mt-0.5 text-[11.5px] text-faint">{s.stats.total} trades · {s.stats.rate.toFixed(0)}% winners</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/50"><motion.div className="h-full rounded-full" style={{ background: s.label === "Long" ? "var(--up)" : "var(--down)" }} initial={{ width: 0 }} animate={{ width: `${s.stats.rate}%` }} transition={{ duration: 0.9, ease: EASE }} /></div></div></div>)}</div><p className="mt-5 rounded-xl bg-line/30 px-3.5 py-2.5 text-[12px] leading-relaxed text-sub">{sideStats.short.total < 5 ? "Small sample on shorts — call it exploration, not edge, until the count grows." : "Sample is decent on both sides. Compare the win bars, then double down on what actually pays you."}</p></Card></div>
    </div>
  );
}
