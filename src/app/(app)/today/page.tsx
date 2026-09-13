"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Check, ChevronRight, Feather, NotebookPen, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useJournal, useSaveCheckin, useTodayCheckin, useTrades } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { marketOf } from "@/lib/markets";
import { formatMoney, tradePnl } from "@/lib/utils";
import { EASE, riseItem, staggerContainer } from "@/lib/motion";

const moods = [
  { value: "rough", label: "Rough", emoji: "😣" },
  { value: "low", label: "Low", emoji: "😕" },
  { value: "neutral", label: "Okay", emoji: "😐" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "great", label: "Great", emoji: "😄" },
] as const;

function localDate() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
        <span className="text-[12px] font-semibold tabular">{value ?? "—"}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            aria-label={`${label} ${n} out of 5`}
            onClick={() => onChange(n)}
            className={cn(
              "min-h-11 rounded-md border text-[12px] font-semibold transition-all active:scale-[0.97] cursor-pointer",
              value === n ? "border-primary bg-primary-soft text-primary shadow-sm" : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60",
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
  const date = useMemo(localDate, []);
  const { data: existing, isLoading } = useTodayCheckin(date);
  const { data: entries } = useJournal();
  const { data: trades } = useTrades();
  const save = useSaveCheckin();
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState("");
  const [intention, setIntention] = useState("");
  const [tradingPlan, setTradingPlan] = useState("");
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    if (!existing) return;
    setMood(existing.mood ?? null);
    setEnergy(existing.energy ?? null);
    setFocus(existing.focus ?? null);
    setSleepHours(existing.sleepHours ?? "");
    setIntention(existing.intention);
    setTradingPlan(existing.tradingPlan);
    setReflection(existing.reflection);
  }, [existing]);

  const recentEntries = (entries ?? []).filter((e) => e.date === date).slice(0, 3);
  const todayTrades = (trades ?? []).filter((t) => new Date(t.entryAt).toLocaleDateString() === new Date().toLocaleDateString()).slice(0, 4);
  const closedToday = todayTrades.filter((t) => t.status === "closed");
  const realizedToday = closedToday.reduce((sum, t) => sum + (tradePnl(t) ?? 0), 0);
  const sleepScore = sleepHours ? Math.min(5, Math.max(1, Number(sleepHours) / 2)) : 3;
  const readiness = Math.round((((energy ?? 3) + (focus ?? 3) + sleepScore) / 3) / 5 * 100);
  const hasPlan = Boolean(tradingPlan.trim());
  const onSave = () =>
    save.mutate({ date, mood: mood as never, energy, focus, sleepHours: sleepHours ? Number(sleepHours) : null, intention, tradingPlan, reflection });

  if (isLoading && existing === undefined)
    return (
      <div className="space-y-5">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="h-[560px] animate-pulse rounded-xl bg-muted/70" />
          <div className="h-[560px] animate-pulse rounded-xl bg-muted/70" />
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <motion.header variants={staggerContainer(0.06)} initial="initial" animate="animate" className="flex flex-wrap items-end justify-between gap-4">
        <motion.div variants={riseItem}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{format(new Date(), "EEEE")}</p>
          <h1 className="mt-1.5 font-display text-[30px] font-semibold tracking-[-0.03em]">Today.</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Start with yourself. Then decide how you trade.</p>
        </motion.div>
        <motion.div variants={riseItem} className="flex gap-2">
          <Link href="/journal?new=1">
            <Button variant="outline"><Feather className="h-4 w-4" /> Write</Button>
          </Link>
          <Link href="/trades?new=1">
            <Button><Target className="h-4 w-4" /> Log trade</Button>
          </Link>
        </motion.div>
      </motion.header>

      <motion.section variants={staggerContainer(0.06)} initial="initial" animate="animate" className="grid gap-4 md:grid-cols-3">
        <motion.div variants={riseItem} className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" /> Personal readiness
                  </div>
                  <div className="mt-2 font-display text-[30px] font-semibold tabular">{readiness}%</div>
                  <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
                    A simple pulse from sleep, energy and focus. A low score is a signal to reduce risk, not a failure.
                  </p>
                </div>
                <div className="rounded-xl bg-primary-soft p-3 text-primary"><Zap className="h-5 w-5" /></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${readiness}%` }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={riseItem}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <NotebookPen className="h-4 w-4 text-primary" /> Today in Quill
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="font-display text-2xl font-semibold tabular">{recentEntries.length}</div>
                  <div className="text-[11px] text-muted-foreground">entries</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-semibold tabular">{todayTrades.length}</div>
                  <div className="text-[11px] text-muted-foreground">trades</div>
                </div>
                <div>
                  <div className={cn("font-display text-2xl font-semibold tabular", realizedToday >= 0 ? "text-up" : "text-down")}>{formatMoney(realizedToday, "USD", { sign: true })}</div>
                  <div className="text-[11px] text-muted-foreground">closed P&L</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-semibold tabular">{hasPlan ? "Set" : "—"}</div>
                  <div className="text-[11px] text-muted-foreground">trade plan</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      <motion.section variants={staggerContainer(0.06)} initial="initial" animate="animate" className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <motion.div variants={riseItem}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Feather className="h-[18px] w-[18px]" /></div>
                <div>
                  <h2 className="font-display text-[16px] font-semibold">Check in</h2>
                  <p className="text-[11.5px] text-muted-foreground">A two-minute snapshot of how you are entering the day.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="mb-2.5 block text-[12px] font-medium text-muted-foreground">How are you feeling?</label>
                <div className="grid grid-cols-5 gap-2">
                  {moods.map((m) => (
                    <button
                      type="button"
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className={cn(
                        "min-h-[68px] rounded-xl border text-center transition-all active:scale-[0.98] cursor-pointer",
                        mood === m.value ? "border-primary bg-primary-soft shadow-sm" : "border-border bg-card hover:bg-muted/60",
                      )}
                    >
                      <div className="text-xl">{m.emoji}</div>
                      <div className="mt-1 text-[10.5px] font-medium text-muted-foreground">{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Scale label="Energy" value={energy} onChange={setEnergy} />
                <Scale label="Focus" value={focus} onChange={setFocus} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Sleep last night</label>
                <div className="relative">
                  <Input type="number" min="0" max="24" step="0.5" inputMode="decimal" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="7.5" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">hours</span>
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Today's intention</label>
                <Textarea value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="What would make today feel well spent?" className="min-h-[88px]" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Trading plan</label>
                  <Textarea value={tradingPlan} onChange={(e) => setTradingPlan(e.target.value)} placeholder="Setups, markets, max risk, or one rule you will not break." className="min-h-[150px]" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">End-of-day reflection</label>
                  <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What did you learn? You can fill this tonight." className="min-h-[150px]" />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-up" /> Private to your Quill account
                </div>
                <Button onClick={onSave} disabled={save.isPending}>
                  {save.isPending ? "Saving…" : existing ? "Save today's check-in" : "Save today"}
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-4">
          <motion.div variants={riseItem}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-[16px] font-semibold">Trading guardrail</h2>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">Let your state shape your risk.</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-muted/60 p-4">
                  <div className="text-[12px] font-semibold">{readiness < 55 ? "Protect the downside" : readiness < 75 ? "Trade selectively" : "Normal execution"}</div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                    {readiness < 55
                      ? "Consider sitting out, cutting size, or only taking A+ setups today."
                      : readiness < 75
                        ? "Keep your plan visible and avoid revenge or boredom trades."
                        : "Your current inputs suggest a normal trading posture. Follow the process, not the P&L."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={riseItem}>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-display text-[16px] font-semibold">Today's activity</h2>
                <Link href="/trades" className="flex min-h-9 items-center gap-1 text-[12px] font-medium text-primary hover:underline">
                  All trades <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-1">
                {todayTrades.map((t) => {
                  const pnl = t.status === "closed" ? tradePnl(t) : null;
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">{t.symbol}</div>
                        <div className="text-[11px] text-muted-foreground">{t.side} · {marketOf(t.market).short}</div>
                      </div>
                      <span className={cn("text-[12px] font-semibold tabular", pnl == null ? "text-muted-foreground" : pnl >= 0 ? "text-up" : "text-down")}>
                        {pnl == null ? (t.status === "open" ? "open" : "—") : formatMoney(pnl, marketOf(t.market).currency, { sign: true })}
                      </span>
                    </div>
                  );
                })}
                {todayTrades.length === 0 && <p className="py-6 text-center text-[12.5px] text-muted-foreground">Nothing logged today yet.</p>}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
