"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  DatabaseZap,
  Fingerprint,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import type { IntelligenceResult } from "@/lib/intelligence";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

async function getIntelligence() {
  const res = await fetch("/api/intelligence");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json.intelligence as IntelligenceResult;
}

function money(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
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

export default function IntelligencePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["intelligence"],
    queryFn: getIntelligence,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-36" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
        <Skeleton className="h-80" />
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

  const confidenceCopy =
    data.confidence === "strong"
      ? "Strong evidence base"
      : data.confidence === "building"
        ? "Building evidence"
        : "Early signal mode";

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-line bg-card p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
              <Brain className="h-3.5 w-3.5" />
              Quill Intelligence
            </div>
            <h1 className="mt-2 font-display text-[31px] font-semibold tracking-[-0.035em] sm:text-[38px]">
              See the pattern behind the pattern.
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-sub">
              Quill compares your recorded state with actual trade outcomes to
              surface evidence, not forecasts. Every signal carries its sample size.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-line bg-paper/70 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Evidence
            </div>
            <div className="mt-1 font-display text-[15px] font-semibold">
              {confidenceCopy}
            </div>
            <div className="mt-1 text-[11px] text-faint">
              {data.sampleSize.trades} trades · {data.sampleSize.checkins} check-ins · {data.sampleSize.journals} journal entries
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_1fr_1fr]">
        <Card className="overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-faint">Readiness</div>
              <Sparkles className="h-4 w-4 text-brand" />
            </div>
            <div className="mt-4 flex items-end gap-3">
              <div className="font-display text-5xl font-semibold tracking-[-0.05em]">{data.readiness.score ?? "—"}</div>
              <div className="pb-1 text-sm text-faint">/ 100</div>
            </div>
            <div className={cn("mt-2 text-[13px] font-medium", data.readiness.score != null && data.readiness.score < 60 ? "text-down" : "text-up")}>
              {data.readiness.label}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              {[
                ["Energy", data.readiness.energy ?? "—"],
                ["Focus", data.readiness.focus ?? "—"],
                ["Sleep", data.readiness.sleepHours != null ? `${data.readiness.sleepHours}h` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-paper p-3">
                  <div className="text-faint">{label}</div>
                  <div className="mt-1 font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-faint">This week</div>
          <div className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">{money(data.weekly.pnl)}</div>
          <div className="mt-1 text-[12px] text-faint">
            {data.weekly.trades} closed trades · {data.weekly.winRate == null ? "—" : `${Math.round(data.weekly.winRate)}%`} win rate
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-paper p-3.5">
            <div>
              <div className="text-[11px] text-faint">Previous 7d</div>
              <div className="mt-1 text-[13px] font-semibold">{money(data.weekly.previousPnl)}</div>
            </div>
            {data.weekly.deltaPnl != null && (
              <div className={cn("text-sm font-semibold", data.weekly.deltaPnl >= 0 ? "text-up" : "text-down")}>
                {data.weekly.deltaPnl >= 0 ? "↑" : "↓"} {money(Math.abs(data.weekly.deltaPnl))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-faint">Next action</div>
          <div className="mt-4 space-y-3">
            {data.nextActions.slice(0, 3).map((action, index) => (
              <motion.div
                key={`${action}-${index}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3 rounded-2xl bg-paper p-3.5"
              >
                <div className="mt-0.5 shrink-0 text-brand">{index === 0 ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</div>
                <p className="text-[12.5px] leading-relaxed text-sub">{action}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-4 w-4 text-brand" />
              <h2 className="font-display text-[20px] font-semibold">Evidence lab</h2>
            </div>
            <p className="mt-1 text-[11.5px] text-faint">
              The strongest measurable relationships in the data currently available to Quill.
            </p>
          </div>
          <div className="hidden text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-faint sm:block">
            No prediction · no fake certainty
          </div>
        </div>

        {data.correlations.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.correlations.map((item, index) => (
              <motion.div
                key={`${item.label}-${item.headline}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="h-full p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Fingerprint className={cn("h-4 w-4", toneClass(item.tone))} />
                      <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-faint">{item.label}</div>
                    </div>
                    <span className="rounded-full border border-line bg-paper px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-faint">
                      n={item.sampleSize}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-[17px] font-semibold leading-snug tracking-[-0.02em]">{item.headline}</h3>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-sub">{item.detail}</p>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-paper p-3">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">Higher</div>
                      <div className="mt-1 text-[11px] font-medium text-sub">{item.higher}</div>
                    </div>
                    <div className="rounded-xl bg-paper p-3">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">Lower</div>
                      <div className="mt-1 text-[11px] font-medium text-sub">{item.lower}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">
                    <span>{strengthCopy(item.strength)}</span>
                    <span className={toneClass(item.tone)}>{item.tone === "positive" ? "supports review" : item.tone === "caution" ? "watch closely" : "neutral"}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <div className="font-display text-[17px] font-semibold">Not enough paired evidence yet.</div>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-sub">
              Quill only publishes a relationship when enough trades can be paired with a recorded state. Keep completing Today check-ins and closing trades with consistent reviews.
            </p>
          </Card>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-brand" />
            <h2 className="font-display text-[18px] font-semibold">What Quill sees</h2>
          </div>
          <p className="mt-1 text-[11.5px] text-faint">Observed from recorded behaviour, not market forecasts.</p>
          <div className="mt-5 space-y-3">
            {data.observations.map((item) => (
              <div key={item.label} className="rounded-2xl border border-line bg-paper/55 p-3.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">{item.label}</span>
                  <span className={cn("font-display text-[17px] font-semibold", toneClass(item.tone))}>{item.value}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-sub">{item.detail}</p>
                {item.sampleSize != null && <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">n={item.sampleSize} · {strengthCopy(item.strength)}</div>}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              <h2 className="font-display text-[18px] font-semibold">Your documented edge</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.edge.length ? data.edge.slice(0, 4).map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-2xl bg-paper p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">{item.label}</div>
                    {item.sampleSize != null && <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">n={item.sampleSize}</div>}
                  </div>
                  <div className={cn("mt-1 font-display text-[19px] font-semibold", toneClass(item.tone))}>{item.value}</div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-sub">{item.detail}</p>
                </div>
              )) : <p className="text-[12px] leading-relaxed text-faint">Quill needs repeated evidence before calling something a documented edge.</p>}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-down" />
              <h2 className="font-display text-[18px] font-semibold">Risk to watch</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.risks.length ? data.risks.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-down/20 bg-down/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">{item.label}</div>
                    {item.sampleSize != null && <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">n={item.sampleSize}</div>}
                  </div>
                  <div className="mt-1 font-display text-[18px] font-semibold text-down">{item.value}</div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-sub">{item.detail}</p>
                </div>
              )) : <p className="text-[12px] leading-relaxed text-faint">No high-signal risk pattern crossed Quill's evidence threshold yet.</p>}
            </div>
          </Card>
        </div>
      </section>

      <footer className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Keep feeding the signal</div>
          <p className="mt-1 text-[11.5px] text-sub">Pre-trade plans, state check-ins, rule adherence and honest reviews make future intelligence more specific.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/today"><Button variant="outline">Today</Button></Link>
          <Link href="/insights"><Button variant="ghost">Raw insights <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </footer>
    </div>
  );
}
