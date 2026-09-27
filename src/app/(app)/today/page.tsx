"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Feather, Moon, NotebookPen, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { useFxRate, useJournal, useSaveCheckin, useTodayCheckin, useTrades, type CheckinPayload } from "@/lib/hooks";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { cn, formatMoney, localDateKey } from "@/lib/utils";
import { tradePnlUsd } from "@/lib/markets";
import { READINESS_THRESHOLDS, readinessScore } from "@/lib/readiness";
import type { DailyCheckin } from "@/db/schema";

const MOODS = [
  { value: "rough", label: "Rough", emoji: "😣" },
  { value: "low", label: "Low", emoji: "😕" },
  { value: "neutral", label: "Okay", emoji: "😐" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "great", label: "Great", emoji: "😄" },
] as const;

type Mood = (typeof MOODS)[number]["value"];

function isMood(value: string | null | undefined): value is Mood {
  return MOODS.some((m) => m.value === value);
}

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-sub">{label}</span>
        <span className="tabular text-[12px] font-semibold">{value ?? "—"}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            aria-label={`${label} ${n} out of 5`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "min-h-11 rounded-xl border text-[12px] font-semibold transition-all active:scale-[.97]",
              value === n ? "border-brand bg-brand-soft text-brand shadow-sm" : "border-line bg-paper text-faint hover:bg-card hover:text-ink",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TodayPage() {
  const [date] = useState(() => localDateKey());
  const { data: existing, isLoading } = useTodayCheckin(date);

  if (isLoading && existing === undefined) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-line" />
        <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <Card className="h-[560px] animate-pulse" />
          <Card className="h-[560px] animate-pulse" />
        </div>
      </div>
    );
  }

  // Keyed on the saved record so the form re-initialises when the server copy changes (e.g. saved on another device).
  return <TodayForm key={`${date}:${existing?.updatedAt ? new Date(existing.updatedAt).getTime() : "new"}`} date={date} existing={existing ?? null} />;
}

function TodayForm({ date, existing }: { date: string; existing: DailyCheckin | null }) {
  const { data: entries } = useJournal();
  const { data: trades } = useTrades();
  const { inrPerUsd } = useFxRate();
  const save = useSaveCheckin();

  const [mood, setMood] = useState<Mood | null>(isMood(existing?.mood) ? existing.mood : null);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [focus, setFocus] = useState<number | null>(existing?.focus ?? null);
  const [sleepHours, setSleepHours] = useState(existing?.sleepHours ?? "");
  const [intention, setIntention] = useState(existing?.intention ?? "");
  const [tradingPlan, setTradingPlan] = useState(existing?.tradingPlan ?? "");
  const [reflection, setReflection] = useState(existing?.reflection ?? "");

  const recentEntries = (entries ?? []).filter((e) => e.date === date).slice(0, 3);
  const todayTrades = (trades ?? []).filter((t) => localDateKey(t.entryAt) === date).slice(0, 4);
  const closedToday = todayTrades.filter((t) => t.status === "closed");
  const realizedToday = closedToday.reduce((sum, t) => sum + (tradePnlUsd(t, inrPerUsd) ?? 0), 0);
  const readiness = readinessScore({ energy, focus, sleepHours });
  const hasPlan = Boolean(tradingPlan.trim());

  const onSave = () => {
    const sleep = sleepHours === "" ? null : Number(sleepHours);
    if (sleep != null && (!Number.isFinite(sleep) || sleep < 0 || sleep > 24)) return;
    const payload: CheckinPayload = { date, mood, energy, focus, sleepHours: sleep, intention, tradingPlan, reflection };
    save.mutate(payload);
  };

  const guardrail =
    readiness < READINESS_THRESHOLDS.protect
      ? { title: "Protect the downside", body: "Consider sitting out, cutting size, or only taking A+ setups today." }
      : readiness < READINESS_THRESHOLDS.selective
        ? { title: "Trade selectively", body: "Keep your plan visible and avoid revenge or boredom trades." }
        : { title: "Normal execution", body: "Your current inputs suggest a normal trading posture. Follow the process, not the P&L." };

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-brand">Daily cockpit</p>
          <h1 className="mt-1.5 font-display text-[30px] font-semibold tracking-[-.03em]">Today.</h1>
          <p className="mt-1 text-[13px] text-faint">Start with yourself. Then decide how you trade.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/journal?new=1">
            <Button variant="outline">
              <Feather className="h-4 w-4" /> Write
            </Button>
          </Link>
          <Link href="/trades?new=1">
            <Button>
              <Target className="h-4 w-4" /> Log trade
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.12em] text-faint">
                <Sparkles className="h-4 w-4 text-brand" /> Personal readiness
              </div>
              <div className="tabular mt-2 font-display text-[30px] font-semibold">{readiness}%</div>
              <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-sub">
                A simple pulse from sleep, energy and focus. A low score is a signal to reduce risk, not a failure.
              </p>
            </div>
            <div className="rounded-2xl bg-brand-soft p-3 text-brand">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${readiness}%` }} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.12em] text-faint">
            <NotebookPen className="h-4 w-4 text-brand" /> Today in Quill
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="tabular font-display text-2xl font-semibold">{recentEntries.length}</div>
              <div className="text-[11px] text-faint">entries</div>
            </div>
            <div>
              <div className="tabular font-display text-2xl font-semibold">{todayTrades.length}</div>
              <div className="text-[11px] text-faint">trades</div>
            </div>
            <div>
              <div className={cn("tabular font-display text-2xl font-semibold", realizedToday >= 0 ? "text-up" : "text-down")}>{formatMoney(realizedToday, "USD", { sign: true })}</div>
              <div className="text-[11px] text-faint">closed P&L</div>
            </div>
            <div>
              <div className="tabular font-display text-2xl font-semibold">{hasPlan ? "Set" : "—"}</div>
              <div className="text-[11px] text-faint">trade plan</div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Feather className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="font-display text-[16px] font-semibold">Check in</h2>
              <p className="text-[11.5px] text-faint">A two-minute snapshot of how you are entering the day.</p>
            </div>
          </div>
          <div className="mt-6 space-y-6">
            <div>
              <div className="mb-2.5 block text-[12px] font-medium text-sub">How are you feeling?</div>
              <div className="grid grid-cols-5 gap-2">
                {MOODS.map((m) => (
                  <button
                    type="button"
                    key={m.value}
                    aria-pressed={mood === m.value}
                    onClick={() => setMood(mood === m.value ? null : m.value)}
                    className={cn(
                      "min-h-[68px] rounded-2xl border text-center transition-all active:scale-[.98]",
                      mood === m.value ? "border-brand bg-brand-soft shadow-sm" : "border-line bg-paper hover:bg-card",
                    )}
                  >
                    <div className="text-xl">{m.emoji}</div>
                    <div className="mt-1 text-[10.5px] font-medium text-sub">{m.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Scale label="Energy" value={energy} onChange={setEnergy} />
              <Scale label="Focus" value={focus} onChange={setFocus} />
            </div>
            <Field label="Sleep last night">
              <div className="relative">
                <Input type="number" min="0" max="24" step="0.5" inputMode="decimal" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="7.5" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-faint">hours</span>
              </div>
            </Field>
            <Field label="Today's intention">
              <Textarea value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="What would make today feel well spent?" className="min-h-[88px]" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Trading plan">
                <Textarea value={tradingPlan} onChange={(e) => setTradingPlan(e.target.value)} placeholder="Setups, markets, max risk, or one rule you will not break." className="min-h-[150px]" />
              </Field>
              <Field label="End-of-day reflection">
                <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What did you learn? You can fill this tonight." className="min-h-[150px]" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <div className="flex items-center gap-2 text-[11px] text-faint">
                <ShieldCheck className="h-4 w-4 text-up" /> Private to your Quill account
              </div>
              <Button onClick={onSave} loading={save.isPending}>
                {save.isPending ? "Saving…" : existing ? "Save today's check-in" : "Save today"}
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[16px] font-semibold">Trading guardrail</h2>
                <p className="mt-1 text-[11.5px] text-faint">Let your state shape your risk.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-brand" />
            </div>
            <div className="mt-4 rounded-2xl bg-paper p-4">
              <div className="text-[12px] font-semibold">{guardrail.title}</div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-sub">{guardrail.body}</p>
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold">Today&apos;s activity</h2>
              <Link href="/trades" className="flex min-h-9 items-center gap-1 text-[12px] font-medium text-brand">
                All trades <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-1">
              {todayTrades.length ? (
                todayTrades.map((t) => {
                  const pnl = tradePnlUsd(t, inrPerUsd);
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{t.symbol}</div>
                        <div className="text-[11px] text-faint">
                          {t.side} · {t.status}
                        </div>
                      </div>
                      <div className={cn("tabular text-[12px] font-semibold", pnl == null ? "text-faint" : pnl >= 0 ? "text-up" : "text-down")}>
                        {pnl == null ? "open" : formatMoney(pnl, "USD", { sign: true })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-7 text-center text-[12px] text-faint">No trades logged today. Your plan can stay empty.</p>
              )}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-brand" />
              <h2 className="font-display text-[16px] font-semibold">Tonight</h2>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-sub">Come back here after the session and capture what happened before the details disappear.</p>
            <Link href="/journal?new=1" className="mt-3 inline-flex min-h-10 items-center gap-1 text-[12px] font-medium text-brand">
              Write reflection <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
