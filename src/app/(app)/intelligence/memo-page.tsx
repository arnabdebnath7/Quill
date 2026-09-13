"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BrainCircuit,
  Check,
  ChevronRight,
  Clipboard,
  Database,
  LoaderCircle,
  Moon,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { IntelligenceResult } from "@/lib/intelligence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SectionTitle } from "@/components/primitives";
import { Mimo } from "@/components/mimo";
import { mimoBus } from "@/lib/mimo-bus";
import { EASE, riseItem, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STARTERS = [
  { label: "Find my biggest leak", prompt: "Where is my biggest behavioural leak in the recorded data?", icon: TrendingDown },
  { label: "Read today's readiness", prompt: "What does my latest readiness state suggest I should protect today?", icon: Zap },
  { label: "What changed this week?", prompt: "What meaningfully changed in my trading behaviour this week?", icon: TrendingUp },
  { label: "Sleep vs outcomes", prompt: "What does my recorded data show about sleep and trade outcomes?", icon: Moon },
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

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${Number(value) >= 0 ? "+" : "−"}${Math.abs(Number(value)).toFixed(2)}`;
}

function prettyDate(value: string) {
  if (!value || value === "unknown") return "Unknown date";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function confidenceLabel(value: IntelligenceResult["confidence"]) {
  if (value === "strong") return "High confidence";
  if (value === "building") return "Learning your patterns";
  return "Early signal";
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

  // Drive the companion's state in the nav while we're thinking.
  useEffect(() => {
    mimoBus.set(busy ? "thinking" : "idle");
    return () => mimoBus.set("idle");
  }, [busy]);

  const evidenceIndex = useMemo(() => {
    const map = new Map<string, { label: string; date: string; detail: string; value: string; correlation: string }>();
    data?.correlations.forEach((correlation) => {
      correlation.evidence.forEach((point) => map.set(point.id, { ...point, correlation: correlation.label }));
    });
    return map;
  }, [data]);

  async function ask(prompt: string) {
    const clean = prompt.trim();
    if (!clean || busy || !data) return;
    const previous = messages
      .slice(-4)
      .map((item) => `${item.role === "user" ? "User" : "Mimo"}: ${item.content}`)
      .join("\n");
    const contextualQuestion = `${previous ? `${previous}\n` : ""}User: ${clean}`.slice(-1500);
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
      if (!res.ok) throw new Error(json.error ?? `Mimo unavailable (${res.status})`);
      const coach = json.coach as Coach;
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: coach.summary, coach }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mimo is unavailable right now.";
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: message }]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  async function copyAnswer(id: string, coach: Coach) {
    try {
      await navigator.clipboard.writeText(`${coach.headline}\n\n${coach.summary}\n\n${coach.actions.map((action) => `• ${action}`).join("\n")}`);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // Clipboard may be blocked by the host browser.
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 pb-12">
        <Skeleton className="h-56 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.85fr]">
          <Skeleton className="h-[560px] rounded-2xl" />
          <Skeleton className="h-[560px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<BrainCircuit className="h-5 w-5" />}
        title="Mimo is unavailable"
        body="Quill could not load your private intelligence context."
        action={<Button onClick={() => void refetch()}><RefreshCw className="h-4 w-4" /> Try again</Button>}
      />
    );
  }

  const readiness = data.readiness.score;
  const confidence = confidenceLabel(data.confidence);
  const primary = data.correlations[0];
  const actionList = data.nextActions.slice(0, 3);

  return (
    <div className="space-y-5">
      {/* hero */}
      <motion.div variants={staggerContainer(0.07)} initial="initial" animate="animate">
        <Card className="overflow-hidden">
          <CardHeader className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Mimo size={52} state="idle" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-[19px] font-semibold tracking-[-0.01em]">Mimo</h1>
                  <span className="text-[11px] text-muted-foreground">your trading companion</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-up" /> Private · evidence first</span>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="hidden font-normal sm:inline-flex">{confidence}</Badge>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-[24px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[30px]">
                Your trading data, <span className="text-primary">made useful.</span>
              </h2>
              <p className="mt-3 max-w-xl text-[13px] leading-[1.65] text-muted-foreground">
                Mimo turns your journal, check-ins and trades into a personal decision layer. Ask a question, get a clear answer, then inspect the exact evidence behind it.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[`${data.sampleSize.trades} trades`, `${data.sampleSize.checkins} check-ins`, `${data.sampleSize.journals} journals`, `${data.correlations.length} signals`].map((fact) => (
                  <span key={fact} className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">{fact}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Decision state</div>
                  <div className="mt-1 font-display text-[20px] font-semibold tracking-[-0.02em]">{data.readiness.label}</div>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", readiness != null && readiness >= 60 ? "border-up/20 bg-up-soft text-up" : "border-primary/20 bg-primary-soft text-primary")}>
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="font-display text-[32px] font-semibold tracking-[-0.03em]">{readiness ?? "—"}<span className="text-[11px] text-muted-foreground">/100</span></div>
                  <div className="text-[10px] text-muted-foreground">readiness score</div>
                </div>
                <div className="text-right">
                  <div className={cn("font-display text-[18px] font-semibold", (data.weekly.pnl ?? 0) >= 0 ? "text-up" : "text-down")}>{money(data.weekly.pnl)}</div>
                  <div className="text-[10px] text-muted-foreground">7d P&amp;L</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, readiness ?? 0))}%` }} transition={{ duration: 0.8, ease: EASE }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_0.85fr]">
        {/* chat */}
        <motion.section variants={riseItem} initial="initial" animate="animate" className="quill-card overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <Mimo size={38} state={busy ? "thinking" : "idle"} />
              <div>
                <div className="text-[13px] font-semibold">Ask Mimo</div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Personal AI workspace</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden font-normal sm:inline-flex">Grounded in your data</Badge>
              {messages.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setMessages([])}>Clear</Button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[430px] flex-col">
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <Mimo size={84} state="idle" />
                  <div className="mt-6 font-display text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">What should you know?</div>
                  <p className="mt-3 max-w-xl text-[12px] leading-[1.7] text-muted-foreground">
                    Ask in plain language. Mimo will combine structured signals with recorded evidence instead of inventing a story.
                  </p>
                  <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                    {STARTERS.map(({ label, prompt, icon: Icon }) => (
                      <motion.button
                        key={label}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => void ask(prompt)}
                        className="group rounded-xl border border-border bg-muted/30 p-4 text-left transition hover:border-primary/30 hover:bg-primary-soft/30 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary"><Icon className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1 text-[11.5px] font-semibold">{label}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <ChatForm question={question} setQuestion={setQuestion} onSubmit={submit} busy={busy} placeholder="Ask Mimo about your process…" />
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[12.5px] text-primary-foreground">{message.content}</div>
                    </div>
                  ) : (
                    <div key={message.id} className="flex gap-3">
                      <Mimo size={34} state="idle" className="mt-1 shrink-0" />
                      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">
                          <Sparkles className="h-3.5 w-3.5" /> Mimo
                        </div>
                        {message.coach ? (
                          <>
                            <div className="mt-3 flex items-start justify-between gap-4">
                              <h3 className="font-display text-[21px] font-semibold leading-tight tracking-[-0.02em]">{message.coach.headline}</h3>
                              <button
                                type="button"
                                onClick={() => void copyAnswer(message.id, message.coach!)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary"
                              >
                                {copied === message.id ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                              </button>
                            </div>
                            <p className="mt-3 text-[12.5px] leading-[1.7] text-foreground/85">{message.coach.summary}</p>
                            {message.coach.actions.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {message.coach.actions.slice(0, 3).map((action) => (
                                  <div key={action} className="flex gap-2 rounded-xl border border-border bg-card p-3 text-[11.5px] text-foreground/85">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary"><Check className="h-3 w-3" /></span>
                                    {action}
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.coach.safetyNote && (
                              <div className="mt-4 flex gap-2 rounded-xl bg-muted/40 p-3 text-[10.5px] leading-[1.6] text-muted-foreground">
                                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                {message.coach.safetyNote}
                              </div>
                            )}
                            {message.coach.evidenceIds.length > 0 && (
                              <div className="mt-4 border-t border-border pt-4">
                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Evidence</div>
                                <div className="flex flex-wrap gap-2">
                                  {message.coach.evidenceIds.map((id) =>
                                    evidenceIndex.get(id) ? (
                                      <button
                                        key={id}
                                        type="button"
                                        onClick={() => setExpandedEvidence(expandedEvidence === id ? null : id)}
                                        className="rounded-full border border-border bg-card px-3 py-1.5 text-[10.5px] text-foreground/80 hover:border-primary/30 cursor-pointer"
                                      >
                                        <span className="font-semibold">{evidenceIndex.get(id)?.label}</span>
                                        <span className="mx-1 text-muted-foreground">·</span>
                                        {evidenceIndex.get(id)?.value}
                                      </button>
                                    ) : null,
                                  )}
                                </div>
                                {expandedEvidence && evidenceIndex.get(expandedEvidence) && (
                                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary-soft/40 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-[11px] font-semibold">{evidenceIndex.get(expandedEvidence)?.correlation}</div>
                                      <div className="text-[10px] text-muted-foreground">{prettyDate(evidenceIndex.get(expandedEvidence)!.date)}</div>
                                    </div>
                                    <div className="mt-1 text-[11px] text-foreground/80">{evidenceIndex.get(expandedEvidence)?.detail}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 text-[12.5px] leading-[1.7] text-foreground/85">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ),
                )}
                <div className="sticky bottom-2 z-10">
                  <ChatForm question={question} setQuestion={setQuestion} onSubmit={submit} busy={busy} placeholder="Ask a follow-up…" />
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* side rail */}
        <motion.div variants={staggerContainer(0.06)} initial="initial" animate="animate" className="space-y-5">
          <motion.div variants={riseItem}>
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-[15px] font-display font-semibold">
                  <Database className="h-4 w-4 text-primary" /> What Mimo sees
                </CardTitle>
              </CardHeader>
              <CardContent>
                {primary ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary"><Zap className="h-3 w-3" />{primary.label}</div>
                    <div className="mt-2 text-[13.5px] font-semibold leading-snug">{primary.headline}</div>
                    <p className="mt-2 text-[11px] leading-[1.7] text-muted-foreground">{primary.detail}</p>
                    <div className="mt-4 flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Sample</span>
                      <span className="font-semibold">{primary.sampleSize} trades · {primary.strength}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-[11px] leading-[1.6] text-muted-foreground">
                    Mimo needs more logged data before it can form a meaningful correlation.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={riseItem}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[15px] font-display font-semibold">
                  <ArrowUpRight className="h-4 w-4 text-primary" /> Next best moves
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {actionList.length ? (
                  actionList.map((action, index) => (
                    <div key={`${action}-${index}`} className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[10px] font-semibold text-primary">0{index + 1}</span>
                      <div className="text-[11.5px] leading-[1.6] text-foreground/85">{action}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-muted-foreground">Keep logging. Mimo will turn new records into new signals.</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={riseItem}>
            <Card className="border-foreground/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> AI scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[14px] font-semibold">Interpret your process. Never invent your record.</div>
                <p className="mt-2 text-[11px] leading-[1.7] text-muted-foreground">
                  Mimo can connect patterns across what you logged. It cannot know what you did not record, and low-sample signals should be treated as a prompt to investigate, not a verdict.
                </p>
                <button
                  type="button"
                  onClick={() => void ask("Give me the single most important thing I should investigate from my current data.")}
                  className="mt-4 flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px] font-semibold transition hover:bg-muted cursor-pointer"
                >
                  Run a full review <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function ChatForm({
  question,
  setQuestion,
  onSubmit,
  busy,
  placeholder,
}: {
  question: string;
  setQuestion: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  busy: boolean;
  placeholder: string;
}) {
  return (
    <form onSubmit={onSubmit} className="quill-pop mt-4 flex items-center gap-2 rounded-xl border border-border bg-card p-2">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[12.5px] outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" disabled={!question.trim() || busy} className="shrink-0">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
}
