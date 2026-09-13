"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BrainCircuit,
  Check,
  ChevronDown,
  Clipboard,
  Command,
  Crosshair,
  Database,
  Focus,
  LoaderCircle,
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

function statusLabel(confidence: IntelligenceResult["confidence"]) {
  if (confidence === "strong") return "High confidence";
  if (confidence === "building") return "Learning your patterns";
  return "Building signal";
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
    const contextualQuestion = `${previous ? `${previous}\n` : ""}User: ${clean}`.slice(-1200);

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: clean }]);
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
        { id: crypto.randomUUID(), role: "assistant", content: coach.summary, coach },
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
      // Clipboard can be blocked inside some embedded/mobile browsers.
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 pb-10">
        <Skeleton className="h-48 rounded-[32px]" />
        <Skeleton className="h-[620px] rounded-[32px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<BrainCircuit className="h-5 w-5" />}
        title="Memo is unavailable"
        body="Quill could not load your private intelligence context. Your journal and trades are untouched."
        action={
          <Button onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        }
      />
    );
  }

  const readiness = data.readiness.score;
  const primaryCorrelation = data.correlations[0];
  const readinessTone = readiness == null ? "text-sub" : readiness >= 60 ? "text-up" : "text-down";
  const confidence = statusLabel(data.confidence);
  const quickFacts = [
    `${data.sampleSize.trades} trades`,
    `${data.sampleSize.checkins} check-ins`,
    `${data.sampleSize.journals} journals`,
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-28 lg:pb-10">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] border border-line bg-card shadow-[var(--shadow)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_20%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent_32%),radial-gradient(circle_at_35%_120%,color-mix(in_srgb,var(--brand)_7%,transparent),transparent_30%)]" />
        <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[1.45fr_0.85fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft">
                <BrainCircuit className="h-3.5 w-3.5" />
              </span>
              Memo · personal intelligence
              <span className="hidden h-1 w-1 rounded-full bg-brand/50 sm:block" />
              <span className="hidden text-faint sm:block">Private by design</span>
            </div>

            <h1 className="mt-5 max-w-3xl font-display text-[42px] font-semibold leading-[0.94] tracking-[-0.06em] sm:text-[60px]">
              Think with your data.
            </h1>
            <p className="mt-4 max-w-2xl text-[13px] leading-[1.75] text-sub sm:text-[14px]">
              Memo is the intelligence layer inside Quill. It connects your logged trades, check-ins, journals and behavioural signals so you can ask better questions about yourself.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {quickFacts.map((fact) => (
                <span key={fact} className="rounded-full border border-line bg-paper/80 px-3 py-1.5 text-[10px] font-medium text-faint backdrop-blur">
                  {fact}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-line bg-paper/75 p-4 backdrop-blur-xl sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-faint">Memory status</div>
                <div className="mt-2 font-display text-[24px] font-semibold tracking-[-0.035em]">{confidence}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-faint">Grounded in records already inside Quill.</div>
              </div>
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/20 bg-brand-soft text-brand">
                <span className="absolute inset-2 rounded-xl border border-brand/20" />
                <Sparkles className="relative h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-line bg-card/70 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">
                  <Crosshair className="h-3 w-3" /> Readiness
                </div>
                <div className={cn("mt-1.5 font-display text-[21px] font-semibold", readinessTone)}>{readiness ?? "—"}<span className="text-[10px] text-faint">/100</span></div>
              </div>
              <div className="rounded-2xl border border-line bg-card/70 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">
                  <Database className="h-3 w-3" /> Signals
                </div>
                <div className="mt-1.5 font-display text-[21px] font-semibold">{data.correlations.length}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="overflow-hidden rounded-[32px] border border-brand/20 bg-[linear-gradient(145deg,var(--card),color-mix(in_srgb,var(--brand-soft)_58%,var(--card)))] shadow-[var(--shadow)]"
        >
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-paper shadow-sm">
                <BrainCircuit className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-up" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold">Memo</div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-faint">Personal intelligence engine</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="brand">Evidence grounded</Badge>
              {messages.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setMessages([])}>Clear</Button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex min-h-[540px] max-w-3xl flex-col">
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center sm:py-12">
                  <motion.div
                    animate={{ y: [0, -4, 0], rotate: [0, 1.5, 0] }}
                    transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex h-[76px] w-[76px] items-center justify-center rounded-[24px] border border-brand/25 bg-brand-soft text-brand shadow-[0_18px_50px_-28px_var(--brand)]"
                  >
                    <span className="absolute inset-2 rounded-[18px] border border-brand/15" />
                    <Sparkles className="relative h-8 w-8" />
                  </motion.div>
                  <div className="mt-7 font-display text-[31px] font-semibold tracking-[-0.05em] sm:text-[39px]">
                    Ask anything about your process.
                  </div>
                  <p className="mx-auto mt-3 max-w-xl text-[12px] leading-[1.75] text-faint sm:text-[13px]">
                    Memo does not guess. It looks for patterns in what you actually logged, then shows the evidence behind the answer.
                  </p>

                  <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                    {STARTERS.map(({ label, prompt, icon: Icon }) => (
                      <motion.button
                        key={label}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => void ask(prompt)}
                        className="group rounded-[20px] border border-line bg-paper/70 p-4 text-left transition-all hover:border-brand/30 hover:bg-brand-soft/45 hover:shadow-[0_18px_50px_-32px_var(--brand)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-[11px] font-semibold text-sub">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-brand">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            {label}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
                        </div>
                        <p className="mt-3 pl-9 text-[10px] leading-[1.65] text-faint">{prompt}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <form onSubmit={submit} className="mt-5">
                  <div className="rounded-[24px] border border-line bg-card p-2 shadow-[0_20px_60px_-42px_rgba(0,0,0,.45)] transition-all focus-within:border-brand/40 focus-within:shadow-[0_20px_60px_-38px_var(--brand)]">
                    <div className="flex items-center gap-2">
                      <div className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                        <Command className="h-4 w-4" />
                      </div>
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask Memo a question..."
                        className="min-w-0 flex-1 bg-transparent px-1 py-3 text-[12px] outline-none placeholder:text-faint sm:text-[13px]"
                      />
                      <Button type="submit" size="icon" disabled={!question.trim() || busy} aria-label="Ask Memo">
                        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-1 text-[9px] text-faint">
                    <span>Uses your Quill records only</span>
                    <span>Evidence • behaviour • context</span>
                  </div>
                </form>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                <div className="mb-6 rounded-2xl border border-brand/15 bg-brand-soft/40 px-4 py-3 text-[10px] text-faint">
                  <div className="flex items-center gap-2 font-semibold text-brand">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Grounded conversation
                  </div>
                  <div className="mt-1">Answers are generated against your existing Quill evidence, not market predictions.</div>
                </div>

                <div className="flex flex-col gap-5">
                  {messages.map((message) => (
                    <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      {message.role === "user" ? (
                        <div className="flex justify-end">
                          <div className="max-w-[88%] rounded-[24px] rounded-br-md border border-brand/20 bg-brand px-4 py-3.5 text-[12px] leading-[1.7] text-brand-on shadow-sm sm:max-w-[78%]">
                            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-on/70">
                              <UserRound className="h-3 w-3" /> You
                            </div>
                            {message.content}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[26px] border border-line bg-paper p-4 sm:p-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-paper">
                              <BrainCircuit className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand">Memo</span>
                                <span className="rounded-full bg-up/10 px-2 py-0.5 text-[9px] font-medium text-up">Grounded</span>
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
                                  <h3 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.035em] sm:text-[25px]">{message.coach.headline}</h3>
                                  <p className="mt-2 text-[12px] leading-[1.8] text-sub sm:text-[13px]">{message.coach.summary}</p>

                                  {message.coach.actions.length > 0 && (
                                    <div className="mt-5 grid gap-2">
                                      {message.coach.actions.map((action, index) => (
                                        <div key={`${message.id}-${index}`} className="flex items-start gap-2.5 rounded-2xl border border-line bg-card px-3.5 py-3 text-[11px] leading-[1.65] text-sub">
                                          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                                          {action}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="mt-4 flex items-center gap-2 text-[9px] text-faint">
                                    <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                                    {message.coach.safetyNote}
                                  </div>

                                  {message.coach.evidenceIds.length > 0 && (
                                    <div className="mt-4 border-t border-line pt-3">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedEvidence(expandedEvidence === message.id ? null : message.id)}
                                        className="flex w-full items-center justify-between gap-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-faint"
                                      >
                                        <span className="flex items-center gap-2"><Focus className="h-3.5 w-3.5 text-brand" /> Evidence trail · {message.coach.evidenceIds.length}</span>
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
                </div>

                {busy && (
                  <div className="mt-5 flex items-center gap-3 px-1 text-[10px] font-medium text-faint">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft text-brand">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    </div>
                    Memo is reasoning from your records…
                  </div>
                )}

                <form onSubmit={submit} className="sticky bottom-3 z-10 mt-6">
                  <div className="rounded-[24px] border border-line bg-card/95 p-2 shadow-[0_20px_55px_-30px_rgba(0,0,0,.4)] backdrop-blur-xl focus-within:border-brand/35">
                    <div className="flex items-center gap-2">
                      <div className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                        <Command className="h-4 w-4" />
                      </div>
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a follow-up..."
                        className="min-w-0 flex-1 bg-transparent px-1 py-3 text-[12px] outline-none placeholder:text-faint sm:text-[13px]"
                      />
                      <Button type="submit" size="icon" disabled={!question.trim() || busy} aria-label="Send follow-up">
                        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </motion.section>

        <aside className="space-y-5">
          <div className="rounded-[26px] border border-line bg-card p-5 shadow-[var(--shadow)]">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-brand">
              <Focus className="h-3.5 w-3.5" /> Context window
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["Readiness", `${data.readiness.label}`, `${formatNumber(data.readiness.energy, 0)}/10 energy · ${formatNumber(data.readiness.focus, 0)}/10 focus`],
                ["This week", `${data.weekly.pnl >= 0 ? "+" : "−"}${Math.abs(data.weekly.pnl).toFixed(2)}`, `${data.weekly.trades} trades · ${data.weekly.winRate == null ? "—" : `${Math.round(data.weekly.winRate)}%`} wins`],
                ["Risk surface", `${data.risks.length} open`, data.risks[0]?.detail ?? "No documented behavioural alert"],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-2xl border border-line bg-paper/60 p-3">
                  <div className="text-[8px] font-semibold uppercase tracking-[0.13em] text-faint">{label}</div>
                  <div className="mt-1.5 font-display text-[17px] font-semibold tracking-[-0.025em]">{value}</div>
                  <p className="mt-1 text-[9px] leading-relaxed text-faint">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-line bg-card p-5 shadow-[var(--shadow)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-brand">Signal to inspect</div>
                <div className="mt-1 font-display text-[18px] font-semibold tracking-[-0.025em]">{primaryCorrelation?.label ?? "Building your evidence"}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-faint" />
            </div>
            <p className="mt-3 text-[10.5px] leading-[1.7] text-sub">
              {primaryCorrelation?.detail ?? "Keep logging consistently. Memo becomes more useful as Quill gathers comparable observations."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={primaryCorrelation?.tone === "positive" ? "up" : primaryCorrelation?.tone === "caution" ? "down" : "neutral"}>
                {primaryCorrelation?.strength ?? "insufficient"}
              </Badge>
              <Badge>{primaryCorrelation?.sampleSize ?? 0} observations</Badge>
            </div>
          </div>

          <div className="rounded-[26px] border border-brand/15 bg-brand-soft/35 p-5">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-brand">
              <ShieldCheck className="h-3.5 w-3.5" /> Grounding rules
            </div>
            <p className="mt-3 text-[10px] leading-[1.7] text-faint">
              Memo can analyze your recorded behaviour and surface evidence. It is not a price oracle, trade executor, or substitute for your own judgement.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
