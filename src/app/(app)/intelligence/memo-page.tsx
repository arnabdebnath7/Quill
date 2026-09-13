"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Brain,
  Check,
  ChevronDown,
  Clipboard,
  Focus,
  MessageCircle,
  Moon,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import type { IntelligenceResult } from "@/lib/intelligence";
import { Badge, Button, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

const STARTERS = [
  { label: "Find my biggest leak", prompt: "Where is my biggest behavioural leak in the recorded data?", icon: TrendingDown },
  { label: "Read my readiness", prompt: "What does my latest readiness state suggest I should protect today?", icon: Zap },
  { label: "What changed this week?", prompt: "What meaningfully changed in my trading behaviour this week?", icon: TrendingUp },
  { label: "Check sleep vs P&L", prompt: "What does my recorded data show about sleep and trade outcomes?", icon: Moon },
];

type Coach = {
  headline: string;
  summary: string;
  actions: string[];
  evidenceIds: string[];
  safetyNote: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  coach?: Coach;
};

async function getIntelligence() {
  const res = await fetch("/api/intelligence");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json.intelligence as IntelligenceResult;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(digits);
}

function prettyDate(value: string) {
  if (!value || value === "unknown") return "Unknown date";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function MemoPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["intelligence"],
    queryFn: getIntelligence,
    staleTime: 60_000,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);

  const evidenceIndex = useMemo(() => {
    const map = new Map<string, { symbol: string; date: string; detail: string; value: string; label: string }>();
    data?.correlations.forEach((correlation) => {
      correlation.evidence.forEach((point) => {
        map.set(point.id, {
          symbol: point.label,
          date: point.date,
          detail: point.detail,
          value: point.value,
          label: correlation.label,
        });
      });
    });
    return map;
  }, [data]);

  async function ask(prompt: string) {
    const clean = prompt.trim();
    if (!clean || busy || !data) return;

    const previous = messages
      .slice(-4)
      .map((item) => `${item.role === "user" ? "User" : "Memo"}: ${item.content}`)
      .join("\n");
    const contextualQuestion = `${previous ? `${previous}\n` : ""}User: ${clean}`.slice(-700);

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: clean },
    ]);
    setQuestion("");
    setBusy(true);

    try {
      const res = await fetch("/api/intelligence/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: contextualQuestion }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Memo unavailable (${res.status})`);

      const coach = json.coach as Coach;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: coach.summary,
          coach,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Memo is unavailable right now.";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${message} Your evidence context is still available below.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  async function copyAnswer(id: string, coach: Coach) {
    try {
      await navigator.clipboard.writeText(
        `${coach.headline}\n\n${coach.summary}\n\n${coach.actions.map((action) => `• ${action}`).join("\n")}`,
      );
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // Keep embedded/mobile browsers quiet when clipboard access is unavailable.
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 pb-10">
        <Skeleton className="h-40 rounded-[30px]" />
        <Skeleton className="h-[520px] rounded-[30px]" />
        <Skeleton className="h-32 rounded-[24px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<Brain className="h-5 w-5" />}
        title="Memo is unavailable"
        body="Quill could not load your private evidence context. Your journal and trades are untouched."
        action={
          <Button onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        }
      />
    );
  }

  const confidenceLabel =
    data.confidence === "strong"
      ? "Strong evidence"
      : data.confidence === "building"
        ? "Building evidence"
        : "Early signal";
  const readiness = data.readiness.score;
  const readinessTone = readiness == null ? "text-sub" : readiness >= 60 ? "text-up" : "text-down";
  const primaryCorrelation = data.correlations[0];
  const quickFacts = [
    `${data.sampleSize.trades} trades`,
    `${data.sampleSize.checkins} check-ins`,
    `${data.sampleSize.journals} journals`,
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-28 lg:pb-10">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[30px] border border-line bg-card p-5 shadow-[var(--shadow)] sm:p-7"
      >
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-up/5 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.45fr_0.75fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              Memo · Quill AI
              <span className="h-1 w-1 rounded-full bg-brand/50" />
              <span className="text-faint">Private</span>
            </div>
            <h1 className="mt-3 max-w-2xl font-display text-[39px] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[54px]">
              Your trading, remembered.
            </h1>
            <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-sub sm:text-[14px]">
              Memo turns the records already inside Quill into a conversation. Ask what changed, where your process leaks, or what deserves a closer review.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {quickFacts.map((fact) => (
                <span key={fact} className="rounded-full border border-line bg-paper/80 px-3 py-1.5 text-[10px] font-medium text-faint">
                  {fact}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-paper/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-faint">Evidence state</div>
                <div className="mt-2 font-display text-[22px] font-semibold tracking-[-0.03em]">{confidenceLabel}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[10px] text-faint">
              <span>Readiness</span>
              <span className={cn("font-semibold", readinessTone)}>{readiness ?? "—"}/100</span>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="overflow-hidden rounded-[30px] border border-brand/20 bg-[linear-gradient(135deg,var(--card),color-mix(in_srgb,var(--brand-soft)_75%,var(--card)))] shadow-[var(--shadow)]"
      >
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Brain className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-brand">Ask Memo</div>
              <div className="text-[12px] font-medium text-sub">A private conversation with your own trading memory.</div>
            </div>
            <Badge tone="brand" className="ml-auto">Evidence only</Badge>
          </div>
        </div>

        <div className="min-h-[500px] p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex min-h-[460px] flex-col justify-between">
              <div className="mx-auto w-full max-w-3xl pt-7 text-center sm:pt-10">
                <motion.div
                  animate={{ y: [0, -3, 0], scale: [1, 1.015, 1] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-brand/25 bg-brand-soft text-brand shadow-[0_16px_38px_-22px_var(--brand)]"
                >
                  <Sparkles className="h-7 w-7" />
                </motion.div>
                <div className="mt-6 font-display text-[29px] font-semibold tracking-[-0.04em] sm:text-[36px]">
                  What are you trying to understand?
                </div>
                <p className="mx-auto mt-3 max-w-xl text-[12px] leading-relaxed text-faint sm:text-[13px]">
                  Memo reads your logged trades, check-ins and journals. It does not invent context, forecast prices or place trades.
                </p>
              </div>

              <div className="mx-auto mt-8 grid w-full max-w-3xl gap-2 sm:grid-cols-2">
                {STARTERS.map(({ label, prompt, icon: Icon }) => (
                  <motion.button
                    key={label}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => void ask(prompt)}
                    className="group rounded-2xl border border-line bg-paper/75 p-4 text-left transition-colors hover:border-brand/30 hover:bg-brand-soft/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[11px] font-semibold text-sub">
                        <Icon className="h-3.5 w-3.5 text-brand" />
                        {label}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-faint transition-colors group-hover:text-brand" />
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-faint">{prompt}</p>
                  </motion.button>
                ))}
              </div>

              <form onSubmit={submit} className="mx-auto mt-5 w-full max-w-3xl">
                <div className="rounded-2xl border border-line bg-card p-2 shadow-sm transition-colors focus-within:border-brand/35 focus-within:shadow-[0_12px_40px_-28px_var(--brand)]">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="ml-2 h-4 w-4 shrink-0 text-faint" />
                    <input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask Memo about your trading..."
                      className="min-w-0 flex-1 bg-transparent px-1 py-3 text-[12px] outline-none placeholder:text-faint sm:text-[13px]"
                    />
                    <Button type="submit" size="icon" disabled={!question.trim() || busy} aria-label="Ask Memo">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-faint">
                  <span className="h-1.5 w-1.5 rounded-full bg-up" />
                  Private conversation
                </div>
                <Button size="sm" variant="ghost" onClick={() => setMessages([])}>
                  Clear
                </Button>
              </div>

              {messages.map((message) => (
                <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {message.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[88%] rounded-[24px] rounded-br-md border border-brand/20 bg-brand px-4 py-3 text-[12px] leading-relaxed text-brand-on shadow-sm sm:max-w-[78%]">
                        <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-on/70">
                          <UserRound className="h-3 w-3" /> You
                        </div>
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[26px] border border-line bg-paper p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                          <Brain className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand">Memo</span>
                            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-medium text-brand">Grounded</span>
                            {message.coach && (
                              <button
                                type="button"
                                aria-label="Copy Memo answer"
                                onClick={() => void copyAnswer(message.id, message.coach as Coach)}
                                className="ml-auto rounded-lg p-1.5 text-faint transition-colors hover:bg-card hover:text-sub"
                              >
                                {copied === message.id ? <Check className="h-3.5 w-3.5 text-up" /> : <Clipboard className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>

                          {message.coach ? (
                            <>
                              <h3 className="mt-2 font-display text-[21px] font-semibold tracking-[-0.035em] sm:text-[23px]">
                                {message.coach.headline}
                              </h3>
                              <p className="mt-2 text-[12px] leading-[1.75] text-sub sm:text-[13px]">{message.coach.summary}</p>

                              {message.coach.actions.length > 0 && (
                                <div className="mt-4 grid gap-2">
                                  {message.coach.actions.map((action, index) => (
                                    <div key={`${message.id}-${index}`} className="flex items-start gap-2 rounded-2xl border border-line bg-card px-3 py-2.5 text-[11px] leading-relaxed text-sub">
                                      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                                      {action}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="flex items-center gap-1.5 text-[9px] font-medium text-faint">
                                  <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                                  {message.coach.safetyNote}
                                </span>
                              </div>

                              {message.coach.evidenceIds.length > 0 && (
                                <div className="mt-4 border-t border-line pt-3">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedEvidence(expandedEvidence === message.id ? null : message.id)}
                                    className="flex w-full items-center justify-between gap-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-faint"
                                  >
                                    <span>Sources from your records · {message.coach.evidenceIds.length}</span>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", expandedEvidence === message.id && "rotate-180")} />
                                  </button>
                                  {expandedEvidence === message.id && (
                                    <div className="mt-3 grid gap-2">
                                      {message.coach.evidenceIds.map((id) => {
                                        const point = evidenceIndex.get(id);
                                        if (!point) return null;
                                        return (
                                          <div key={`${message.id}-${id}`} className="rounded-xl border border-line bg-card p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <div className="text-[11px] font-semibold text-sub">{point.symbol}</div>
                                              <div className="text-[9px] font-medium text-faint">{prettyDate(point.date)}</div>
                                            </div>
                                            <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-brand">{point.label} · {point.value}</div>
                                            <p className="mt-2 text-[10px] leading-relaxed text-faint">{point.detail}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-sub">{message.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {busy && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-1 text-[10px] font-medium text-faint">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft text-brand">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex items-center gap-1">
                    Memo is thinking
                    <span className="inline-flex gap-1 pl-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:180ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand [animation-delay:360ms]" />
                    </span>
                  </span>
                </motion.div>
              )}

              <form onSubmit={submit} className="sticky bottom-3 z-10 mt-1">
                <div className="rounded-[24px] border border-line bg-card/95 p-2 shadow-[0_16px_40px_-26px_rgba(0,0,0,.35)] backdrop-blur-xl transition-colors focus-within:border-brand/35">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="ml-2 h-4 w-4 shrink-0 text-faint" />
                    <input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a follow-up..."
                      className="min-w-0 flex-1 bg-transparent px-1 py-3 text-[12px] outline-none placeholder:text-faint sm:text-[13px]"
                    />
                    <Button type="submit" size="icon" disabled={!question.trim() || busy} aria-label="Send follow-up">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </motion.section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[26px] border border-line bg-card p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-brand">
            <Focus className="h-3.5 w-3.5" />
            Context Memo sees
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ["Readiness", `${data.readiness.label}`, `${formatNumber(data.readiness.energy, 0)}/10 energy · ${formatNumber(data.readiness.focus, 0)}/10 focus`],
              ["This week", `${data.weekly.pnl >= 0 ? "+" : "−"}${Math.abs(data.weekly.pnl).toFixed(2)}`, `${data.weekly.trades} trades · ${data.weekly.winRate == null ? "—" : `${Math.round(data.weekly.winRate)}%`} wins`],
              ["Risk surface", `${data.risks.length} open`, data.risks[0]?.detail ?? "No documented behavioural alert"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl border border-line bg-paper/65 p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</div>
                <div className="mt-2 font-display text-[18px] font-semibold tracking-[-0.025em]">{value}</div>
                <p className="mt-1 text-[9.5px] leading-relaxed text-faint">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-line bg-card p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-brand">One useful signal</div>
              <div className="mt-1 font-display text-[18px] font-semibold tracking-[-0.025em]">{primaryCorrelation?.label ?? "Building your evidence"}</div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-faint" />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-sub">
            {primaryCorrelation?.detail ?? "Keep logging consistently. Memo gets stronger as Quill gathers more comparable observations."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={primaryCorrelation?.tone === "positive" ? "up" : primaryCorrelation?.tone === "caution" ? "down" : "neutral"}>
              {primaryCorrelation?.strength ?? "insufficient"}
            </Badge>
            <Badge>{primaryCorrelation?.sampleSize ?? 0} observations</Badge>
          </div>
        </div>
      </section>
    </div>
  );
}
