"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Brain,
  CheckCircle2,
  DatabaseZap,
  Fingerprint,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import type { IntelligenceResult } from "@/lib/intelligence";
import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

async function getIntelligence() {
  const res = await fetch("/api/intelligence");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json.intelligence as IntelligenceResult;
}

function money(value: number) {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`;
}

function toneClass(tone?: "positive" | "caution" | "neutral") {
  if (tone === "positive") return "text-up";
  if (tone === "caution") return "text-down";
  return "text-sub";
}

function strengthCopy(strength?: "insufficient" | "emerging" | "useful") {
  if (strength === "useful") return "Useful sample";
  if (strength === "emerging") return "Emerging signal";
  return "Insufficient sample";
}

function scoreTone(score: number | null) {
  if (score == null) return "bg-brand";
  if (score >= 75) return "bg-up";
  if (score >= 55) return "bg-brand";
  return "bg-down";
}

export default function IntelligencePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["intelligence"],
    queryFn: getIntelligence,
    staleTime: 60_000,
  });

  const confidenceLabel = useMemo(() => {
    if (!data) return "Building evidence";
    if (data.confidence === "strong") return "Strong evidence base";
    if (data.confidence === "building") return "Building evidence";
    return "Early signal mode";
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-5 pb-10">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<Brain className="h-5 w-5" />}
        title="Intelligence is unavailable"
        body="Quill couldn't build this read right now. Your journal and trades remain untouched."
        action={<Button onClick={() => window.location.reload()}>Try again</Button>}
      />
    );
  }

  const score = data.readiness.score;
  const circumference = 2 * Math.PI * 43;
  const dash = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100 * circumference;

  return (
    <div className="space-y-7 pb-10">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] border border-line bg-card p-5 shadow-[var(--shadow)] sm:p-7"
      >
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-up/5 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
              <Brain className="h-3.5 w-3.5" />
              Intelligence · evidence only
            </div>
            <h1 className="mt-3 max-w-3xl font-display text-[34px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[48px]">
              See the pattern
              <br className="hidden sm:block" />
              behind the pattern.
            </h1>
            <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-sub sm:text-[14px]">
              Quill compares your recorded state with actual trade behaviour. No forecasts, no fake certainty — every signal shows the evidence behind it.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
            <Link href="/intelligence/coach">
              <Button size="lg" className="w-full justify-center sm:w-auto lg:w-full">
                <Sparkles className="h-4 w-4" /> Ask Quill
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/intelligence/lab">
              <Button variant="outline" size="lg" className="w-full justify-center sm:w-auto lg:w-full">
                <DatabaseZap className="h-4 w-4" /> Evidence lab
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-[10px] font-medium text-faint">
          <span>{data.sampleSize.trades} trades</span><span>·</span>
          <span>{data.sampleSize.checkins} check-ins</span><span>·</span>
          <span>{data.sampleSize.journals} journal entries</span>
          <Badge tone="brand" className="ml-auto">{confidenceLabel}</Badge>
        </div>
      </motion.header>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_1fr_1fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card className="relative h-full overflow-hidden p-5 sm:p-6">
            <div className="absolute right-4 top-4 text-faint"><Zap className="h-4 w-4" /></div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Readiness</div>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-[94px] w-[94px] shrink-0">
                <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90">
                  <circle cx="52" cy="52" r="43" fill="none" stroke="currentColor" strokeWidth="7" className="text-line" />
                  <circle cx="52" cy="52" r="43" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className={cn(scoreTone(score), "text-up")} strokeDasharray={`${dash} ${circumference}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[26px] font-semibold tracking-[-0.04em]">{score ?? "—"}</span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-faint">/100</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className={cn("text-[12px] font-semibold", score != null && score < 60 ? "text-down" : "text-up")}>{data.readiness.label}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-sub">{data.readiness.summary ?? "Your latest recorded state is ready for review."}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {[
          ["Energy", data.readiness.energy, "/ 10"],
          ["Focus", data.readiness.focus, "/ 10"],
          ["Sleep", data.readiness.sleepHours, "h"],
        ].map(([label, value, unit], index) => (
          <motion.div key={String(label)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + index * 0.04 }}>
            <Card className="h-full p-5 sm:p-6">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                <span>{label}</span><span className="text-brand">{index === 0 ? "STATE" : index === 1 ? "QUALITY" : "RECOVERY"}</span>
              </div>
              <div className="mt-6 font-display text-[34px] font-semibold tracking-[-0.05em]">
                {value == null ? "—" : value}<span className="ml-1 text-[12px] font-medium text-faint">{unit}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                <div className={cn("h-full rounded-full", index === 2 && typeof value === "number" && value < 6.5 ? "bg-down" : "bg-brand")} style={{ width: typeof value === "number" ? `${Math.max(4, Math.min(100, index === 2 ? value / 8 * 100 : value * 10))}%` }} />
              </div>
            </Card>
          </motion.div>
        ))}
      </section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="relative overflow-hidden rounded-[24px] border border-brand/35 bg-brand-soft p-5 sm:p-6">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand"><Target className="h-3.5 w-3.5" /> Your next action</div>
            <h2 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.035em] sm:text-[29px]">{data.nextActions[0] ?? "Keep the next decision evidence-led."}</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-sub">One focused behaviour is more useful than a page of generic advice. This recommendation comes from the evidence Quill can actually support.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <Link href="/intelligence/coach"><Button size="lg" className="min-w-[170px]">Commit to the rule <ArrowUpRight className="h-4 w-4" /></Button></Link>
            <Link href="/intelligence/lab"><Button variant="outline" size="lg" className="min-w-[170px]">See the evidence</Button></Link>
          </div>
        </div>
      </motion.section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><DatabaseZap className="h-4 w-4 text-brand" /><h2 className="font-display text-[22px] font-semibold tracking-[-0.03em]">Evidence lab</h2></div>
            <p className="mt-1 text-[11.5px] text-faint">The strongest measurable relationships currently supported by your data.</p>
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">No prediction · no fake certainty</div>
        </div>

        {data.correlations.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.correlations.slice(0, 6).map((item, index) => (
              <motion.div key={`${item.label}-${item.headline}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.04 }}>
                <Card className="group h-full overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <div className="flex items-center gap-2"><Fingerprint className={cn("h-4 w-4", toneClass(item.tone))} /><span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">{item.label}</span></div>
                    <span className="rounded-full border border-line bg-paper px-2 py-1 font-mono text-[9px] text-faint">n={item.sampleSize}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-[18px] font-semibold leading-snug tracking-[-0.025em]">{item.headline}</h3>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-sub">{item.detail}</p>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-paper p-3"><div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-faint">Higher</div><div className="mt-1 text-[10.5px] font-medium text-sub">{item.higher}</div></div>
                      <div className="rounded-xl bg-paper p-3"><div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-faint">Lower</div><div className="mt-1 text-[10.5px] font-medium text-sub">{item.lower}</div></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[8.5px] font-semibold uppercase tracking-[0.11em] text-faint"><span>{strengthCopy(item.strength)}</span><span className={toneClass(item.tone)}>{item.tone === "positive" ? "supports review" : item.tone === "caution" ? "watch closely" : "neutral"}</span></div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-6"><div className="font-display text-[17px] font-semibold">Not enough paired evidence yet.</div><p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-sub">Keep completing Today check-ins and closing trades with consistent reviews. Quill will only publish relationships it can actually support.</p></Card>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-down" /><h2 className="font-display text-[18px] font-semibold">Behavioural alerts</h2></div><p className="mt-1 text-[10.5px] text-faint">Signals worth reviewing before the next session.</p></div><Badge tone="down">{data.risks.length} open</Badge></div>
          <div className="space-y-3 p-4 sm:p-5">
            {data.risks.length ? data.risks.slice(0, 4).map((item) => <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-down/20 bg-down/5 p-4"><div className="flex items-center justify-between gap-3"><div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">{item.label}</div>{item.sampleSize != null && <div className="font-mono text-[9px] text-faint">n={item.sampleSize}</div>}</div><div className="mt-1 font-display text-[17px] font-semibold text-down">{item.value}</div><p className="mt-1.5 text-[11px] leading-relaxed text-sub">{item.detail}</p></div>) : <div className="rounded-2xl bg-paper p-4 text-[11.5px] leading-relaxed text-faint">No high-signal risk pattern crossed Quill's threshold.</div>}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-brand" /><h2 className="font-display text-[18px] font-semibold">Weekly tape</h2></div><p className="mt-1 text-[10.5px] text-faint">Your recorded week, stripped of noise.</p></div><Link href="/performance" className="text-[9px] font-semibold uppercase tracking-[0.11em] text-brand hover:underline">Performance ↗</Link></div>
          <div className="grid grid-cols-2 gap-px bg-line">
            <div className="bg-card p-5"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">P&L</div><div className="mt-2 font-display text-[29px] font-semibold tracking-[-0.05em]">{money(data.weekly.pnl)}</div><div className="mt-1 text-[10px] text-faint">{data.weekly.trades} closed trades</div></div>
            <div className="bg-card p-5"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">Win rate</div><div className="mt-2 font-display text-[29px] font-semibold tracking-[-0.05em]">{data.weekly.winRate == null ? "—" : `${Math.round(data.weekly.winRate)}%`}</div><div className="mt-1 text-[10px] text-faint">Previous: {money(data.weekly.previousPnl)}</div></div>
          </div>
          <div className="p-5"><div className="flex items-center justify-between rounded-2xl bg-paper p-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">Week delta</div><div className="mt-1 text-[12px] text-sub">Compared with the previous 7 days</div></div>{data.weekly.deltaPnl != null && <div className={cn("font-mono text-[12px] font-semibold", data.weekly.deltaPnl >= 0 ? "text-up" : "text-down")}>{data.weekly.deltaPnl >= 0 ? "↑" : "↓"} {money(Math.abs(data.weekly.deltaPnl))}</div>}</div></div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand" /><h2 className="font-display text-[18px] font-semibold">What Quill sees</h2></div>
          <p className="mt-1 text-[10.5px] text-faint">Observed from recorded behaviour, not market forecasts.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.observations.slice(0, 6).map((item) => <div key={item.label} className="rounded-2xl border border-line bg-paper/55 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">{item.label}</span><span className={cn("font-display text-[17px] font-semibold", toneClass(item.tone))}>{item.value}</span></div><p className="mt-1.5 text-[11px] leading-relaxed text-sub">{item.detail}</p>{item.sampleSize != null && <div className="mt-2 font-mono text-[8.5px] text-faint">n={item.sampleSize} · {strengthCopy(item.strength)}</div>}</div>)}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-brand" /><h2 className="font-display text-[18px] font-semibold">Documented edge</h2></div><Link href="/insights" className="text-[9px] font-semibold uppercase tracking-[0.11em] text-brand">Open ↗</Link></div><div className="mt-4 space-y-3">{data.edge.length ? data.edge.slice(0, 3).map((item) => <div key={`${item.label}-${item.value}`} className="rounded-2xl bg-paper p-4"><div className="flex items-center justify-between gap-3"><div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">{item.label}</div>{item.sampleSize != null && <div className="font-mono text-[8.5px] text-faint">n={item.sampleSize}</div>}</div><div className={cn("mt-1 font-display text-[18px] font-semibold", toneClass(item.tone))}>{item.value}</div><p className="mt-1 text-[10.5px] leading-relaxed text-sub">{item.detail}</p></div>) : <p className="text-[11px] leading-relaxed text-faint">Quill needs repeated evidence before calling something a documented edge.</p>}</div></Card>
          <div className="rounded-2xl border border-line bg-paper p-4"><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-brand"><Sparkles className="h-3.5 w-3.5" /> AI boundary</div><p className="mt-2 text-[11px] leading-relaxed text-sub">Quill Coach can explain this evidence in plain language. It is constrained to your recorded packet and does not issue trade recommendations.</p><Link href="/intelligence/coach" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand">Open Coach <ArrowUpRight className="h-3 w-3" /></Link></div>
        </div>
      </section>

      <footer className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">Keep feeding the signal</div><p className="mt-1 text-[11px] leading-relaxed text-sub">Pre-trade plans, state check-ins, rule adherence and honest reviews make future intelligence more specific.</p></div>
        <div className="flex gap-2"><Link href="/today"><Button variant="outline" size="sm">Today</Button></Link><Link href="/intelligence/coach"><Button size="sm">Ask Quill <Sparkles className="h-3.5 w-3.5" /></Button></Link></div>
      </footer>
    </div>
  );
}
