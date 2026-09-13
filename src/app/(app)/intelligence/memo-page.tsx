"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Brain,
  Check,
  Clipboard,
  Moon,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import type { IntelligenceResult } from "@/lib/intelligence";
import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

const STARTERS = [
  { label: "Find my biggest leak", prompt: "Where is my biggest behavioural leak in the recorded data?" },
  { label: "Read my readiness", prompt: "What does my latest readiness state suggest I should protect today?" },
  { label: "What changed this week?", prompt: "What meaningfully changed in my trading behaviour this week?" },
  { label: "Check sleep vs P&L", prompt: "What does my recorded data show about sleep and trade outcomes?" },
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  coach?: {
    headline: string;
    summary: string;
    actions: string[];
    evidenceIds: string[];
    safetyNote: string;
  };
};

async function getIntelligence() {
  const res = await fetch("/api/intelligence");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json.intelligence as IntelligenceResult;
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
  const [showSources, setShowSources] = useState(true);

  const confidence = data?.confidence === "strong" ? "Strong evidence" : data?.confidence === "building" ? "Building evidence" : "Early signal";
  const readinessTone = data?.readiness.score == null ? "text-sub" : data.readiness.score >= 60 ? "text-up" : "text-down";

  const evidenceIndex = useMemo(() => {
    const map = new Map<string, { symbol: string; date: string; detail: string; label: string }>();
    data?.correlations.forEach((correlation) => {
      correlation.evidence.forEach((point) => {
        map.set(point.id, {
          symbol: point.label,
          date: point.date,
          detail: point.detail,
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
      .map((item) => `${item.role === "user" ? "User" : "Quill"}: ${item.content}`)
      .join("\n");
    const contextualQuestion = `${previous ? `${previous}\n` : ""}User: ${clean}`.slice(-500);

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: clean };
    setMessages((current) => [...current, userMessage]);
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

      const coach = json.coach;
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: coach.summary,
        coach,
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Memo is unavailable right now.";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${message}\n\nYour evidence panels are still available below the conversation.`,
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

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // Clipboard can be unavailable in embedded browsers; keep UI quiet.
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
        <Skeleton className="h-44 rounded-[28px]" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-[520px] rounded-[28px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<Brain className="h-5 w-5" />}
        title="Memo is unavailable"
        body="Quill could not load the evidence context for Memo. Your journal and trades are untouched."
        action={<Button onClick={() => void refetch()}><RefreshCw className="h-4 w-4" /> Try again</Button>}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[30px] border border-line bg-card p-5 shadow-[var(--shadow)] sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-up/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.19em] text-brand"><Sparkles className="h-3.5 w-3.5" /> Memo · Quill AI</div>
            <h1 className="mt-3 max-w-2xl font-display text-[36px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[50px]">Talk to the memory<br className="hidden sm:block" /> of your trading.</h1>
            <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-sub sm:text-[14px]">Ask natural-language questions about your own journals, check-ins and trades. Memo explains documented behaviour; it does not forecast markets or choose trades.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-paper/70 px-3 py-2.5 text-[10px] font-semibold text-faint"><ShieldCheck className="h-4 w-4 text-brand" /><span>{confidence}</span></div>
        </div>
        <div className="relative mt-6 grid gap-2 border-t border-line pt-4 text-[10px] font-medium text-faint sm:grid-cols-4"><span>{data.sampleSize.trades} trades</span><span>{data.sampleSize.checkins} check-ins</span><span>{data.sampleSize.journals} journal entries</span><span className="sm:text-right">Readiness <span className={cn("font-semibold", readinessTone)}>{data.readiness.score ?? "—"}/100</span></span></div>
      </motion.header>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_0.75fr_0.75fr]">
        <Card className="overflow-hidden border-brand/20 bg-brand-soft p-0"><div className="flex h-full flex-col justify-between p-5 sm:p-6"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand"><Brain className="h-4 w-4" /> Your latest read</div><div className="mt-3 font-display text-[22px] font-semibold tracking-[-0.035em] sm:text-[26px]">{data.readiness.label}</div><p className="mt-2 max-w-2xl text-[11.5px] leading-relaxed text-sub">{data.readiness.mood ? `Mood: ${data.readiness.mood}. ` : ""}Energy {data.readiness.energy ?? "—"}/10 · Focus {data.readiness.focus ?? "—"}/10 · Sleep {data.readiness.sleepHours ?? "—"}h.</p></div><div className="mt-5 flex flex-wrap gap-2">{[["Energy", data.readiness.energy, Zap], ["Focus", data.readiness.focus, Target], ["Sleep", data.readiness.sleepHours, Moon]].map(([label, value, Icon]) => <div key={String(label)} className="inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1.5 text-[10px] font-medium text-sub"><Icon className="h-3 w-3 text-brand" /> {String(label)} {value ?? "—"}</div>)}</div></div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint"><TrendingUp className="h-4 w-4 text-up" /> This week</div><div className="mt-5 font-display text-[30px] font-semibold tracking-[-0.05em]">{data.weekly.pnl >= 0 ? "+" : "−"}{Math.abs(data.weekly.pnl).toFixed(2)}</div><div className="mt-1 text-[11px] text-sub">P&L · {data.weekly.trades} trades</div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint"><TrendingDown className="h-4 w-4 text-down" /> Risk surface</div><div className="mt-5 font-display text-[30px] font-semibold tracking-[-0.05em]">{data.risks.length}</div><div className="mt-1 text-[11px] text-sub">behavioural alerts open</div></Card>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-line bg-card shadow-[var(--shadow)]">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand"><Sparkles className="h-3.5 w-3.5" /> Private AI conversation</div><h2 className="mt-1 font-display text-[22px] font-semibold tracking-[-0.03em]">Memo</h2></div><div className="flex items-center gap-2"><Badge tone="brand">Evidence-only</Badge>{messages.length > 0 && <Button size="sm" variant="ghost" onClick={() => setMessages([])}><X className="h-3.5 w-3.5" /> Clear</Button>}</div></div>
        <div className="min-h-[360px] space-y-5 p-4 sm:min-h-[420px] sm:p-6">
          {messages.length === 0 ? (
            <div className="flex min-h-[330px] flex-col justify-between gap-8"><div className="mx-auto w-full max-w-3xl pt-5 text-center sm:pt-10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand-soft text-brand"><Brain className="h-6 w-6" /></div><h3 className="mt-5 font-display text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">What should Quill remember with you?</h3><p className="mx-auto mt-3 max-w-xl text-[12px] leading-relaxed text-faint sm:text-[13px]">Start from a suggestion or ask your own question. Memo will keep the answer tied to the records already inside Quill.</p></div><div className="mx-auto grid w-full max-w-3xl gap-2 sm:grid-cols-2">{STARTERS.map((starter) => <button key={starter.label} type="button" onClick={() => void ask(starter.prompt)} className="group rounded-2xl border border-line bg-paper px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-brand/35 hover:bg-brand-soft"><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-semibold text-sub">{starter.label}</span><ArrowUpRight className="h-3.5 w-3.5 text-faint transition group-hover:text-brand" /></div><p className="mt-1 text-[10.5px] leading-relaxed text-faint">{starter.prompt}</p></button>)}</div></div>
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-5">{messages.map((message) => <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>{message.role === "assistant" && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft text-brand"><Brain className="h-4 w-4" /></div>}<div className={cn("max-w-[88%] rounded-3xl border px-4 py-3.5 sm:max-w-[82%]", message.role === "user" ? "border-brand/20 bg-brand text-brand-on" : "border-line bg-paper")}>{message.role === "user" ? <p className="text-[12px] leading-relaxed">{message.content}</p> : message.coach ? <div><div className="flex items-center justify-between gap-3"><div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-brand">Evidence-grounded</div><button type="button" aria-label="Copy answer" onClick={() => void copyText(message.id, `${message.coach?.headline}\n\n${message.coach?.summary}\n\n${message.coach?.actions.join("\n")}`)} className="rounded-lg p-1.5 text-faint transition hover:bg-card hover:text-sub">{copied === message.id ? <Check className="h-3.5 w-3.5 text-up" /> : <Clipboard className="h-3.5 w-3.5" />}</button></div><h3 className="mt-2 font-display text-[21px] font-semibold tracking-[-0.03em]">{message.coach.headline}</h3><p className="mt-3 text-[12px] leading-relaxed text-sub">{message.coach.summary}</p>{message.coach.actions.length > 0 && <div className="mt-4 space-y-2">{message.coach.actions.map((action, index) => <div key={`${message.id}-${index}`} className="flex gap-3 rounded-2xl border border-line bg-card px-3.5 py-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[9px] font-bold text-brand">{index + 1}</span><p className="text-[11px] leading-relaxed text-sub">{action}</p></div>)}</div>}{message.coach.evidenceIds.length > 0 && <div className="mt-4"><button type="button" onClick={() => setShowSources((current) => !current)} className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint transition hover:text-sub">{showSources ? "Hide evidence" : "Show evidence"} · {message.coach.evidenceIds.length}</button>{showSources && <div className="mt-2 space-y-2">{message.coach.evidenceIds.slice(0, 4).map((id) => { const source = evidenceIndex.get(id); return source ? <div key={id} className="rounded-2xl border border-line bg-card px-3.5 py-3"><div className="flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.11em] text-faint"><span>{source.label}</span><span>{source.symbol} · {prettyDate(source.date)}</span></div><p className="mt-1.5 text-[10.5px] leading-relaxed text-sub">{source.detail}</p></div> : null; })}</div>}</div>}{<div className="mt-4 border-t border-line pt-3 text-[9.5px] leading-relaxed text-faint">{message.coach.safetyNote}</div>}</div> : <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-sub">{message.content}</p>}</div>{message.role === "user" && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line bg-paper text-faint"><UserRound className="h-4 w-4" /></div>}</motion.div>)}{busy && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft text-brand"><Brain className="h-4 w-4" /></div><div className="rounded-2xl border border-line bg-paper px-4 py-3 text-[10px] text-faint">Memo is reading your recorded evidence…</div></motion.div>}</div>
          )}
        </div>
        <form onSubmit={submit} className="border-t border-line bg-paper/55 p-3 sm:p-4"><div className="mx-auto flex max-w-4xl items-end gap-2 rounded-3xl border border-line bg-card p-2 shadow-sm focus-within:border-brand/40"><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(question); } }} rows={1} maxLength={500} placeholder="Ask Memo about your patterns…" className="min-h-[46px] flex-1 resize-none bg-transparent px-3 py-3 text-[12px] outline-none placeholder:text-faint" aria-label="Ask Memo" /><Button type="submit" size="icon" disabled={busy || !question.trim()} className="h-11 w-11 shrink-0 rounded-2xl" aria-label="Send question"><Send className="h-4 w-4" /></Button></div><div className="mx-auto mt-2 flex max-w-4xl items-center justify-between gap-3 px-2 text-[9px] text-faint"><span>Enter to send · Shift+Enter for a new line</span><span>{question.length}/500</span></div></form>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-brand">Strongest signal</div><h3 className="mt-1 font-display text-[20px] font-semibold tracking-[-0.03em]">Evidence already found</h3></div><a href="/intelligence/lab" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3.5 py-2 text-[11px] font-medium text-sub transition hover:border-brand/30 hover:text-ink">Open lab <ArrowUpRight className="h-3.5 w-3.5" /></a></div><div className="mt-4 space-y-2">{data.correlations.slice(0, 3).map((item) => <div key={item.id} className="rounded-2xl border border-line bg-paper p-3.5"><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">{item.label}</span><span className="font-mono text-[9px] text-faint">n={item.sampleSize}</span></div><div className="mt-1.5 text-[12px] font-semibold text-sub">{item.headline}</div><p className="mt-1 text-[10.5px] leading-relaxed text-faint">{item.detail}</p></div>)}</div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-brand"><RefreshCw className="h-3.5 w-3.5" /> Context</div><h3 className="mt-1 font-display text-[20px] font-semibold tracking-[-0.03em]">What Memo can read</h3><div className="mt-4 grid grid-cols-2 gap-2">{[["Trades", data.sampleSize.trades], ["Check-ins", data.sampleSize.checkins], ["Journals", data.sampleSize.journals], ["Alerts", data.risks.length]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-paper p-3.5"><div className="text-[9px] uppercase tracking-[0.1em] text-faint">{label}</div><div className="mt-1 font-display text-[24px] font-semibold">{value}</div></div>)}</div></Card>
      </section>
    </div>
  );
}
