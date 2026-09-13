"use client";

import { FormEvent, useMemo, useState } from "react";
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
  MessageCircle,
  Moon,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wand2,
  Zap,
} from "lucide-react";
import type { IntelligenceResult } from "@/lib/intelligence";
import { Badge, Button, EmptyState, Skeleton } from "@/components/ui";
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
      .map((item) => `${item.role === "user" ? "User" : "Memo"}: ${item.content}`)
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
      if (!res.ok) throw new Error(json.error ?? `Memo unavailable (${res.status})`);
      const coach = json.coach as Coach;
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: coach.summary, coach }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Memo is unavailable right now.";
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
    return <div className="mx-auto w-full max-w-6xl space-y-4 pb-12"><Skeleton className="h-56 rounded-[28px]" /><Skeleton className="h-[560px] rounded-[28px]" /></div>;
  }

  if (isError || !data) {
    return <EmptyState icon={<BrainCircuit className="h-5 w-5" />} title="Memo is unavailable" body="Quill could not load your private intelligence context." action={<Button onClick={() => void refetch()}><RefreshCw className="h-4 w-4" />Try again</Button>} />;
  }

  const readiness = data.readiness.score;
  const confidence = confidenceLabel(data.confidence);
  const primary = data.correlations[0];
  const actionList = data.nextActions.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-6xl pb-28 lg:pb-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[30px] border border-line bg-card shadow-[var(--shadow)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,color-mix(in_srgb,var(--brand)_18%,transparent),transparent_34%),radial-gradient(circle_at_15%_100%,color-mix(in_srgb,var(--brand)_8%,transparent),transparent_34%)]" />
        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft"><BrainCircuit className="h-3.5 w-3.5" /></span>
            Memo intelligence
            <span className="rounded-full border border-brand/20 bg-brand-soft px-2.5 py-1 text-[9px] normal-case tracking-normal text-brand">{confidence}</span>
            <span className="ml-auto hidden items-center gap-1.5 text-[9px] normal-case tracking-normal text-faint sm:flex"><ShieldCheck className="h-3 w-3" />Private · evidence first</span>
          </div>

          <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <h1 className="max-w-3xl font-display text-[43px] font-semibold leading-[0.95] tracking-[-0.06em] sm:text-[62px]">Your trading data,<br /><span className="text-brand">made useful.</span></h1>
              <p className="mt-4 max-w-2xl text-[13px] leading-[1.7] text-sub sm:text-[14px]">Memo turns your journal, check-ins and trades into a personal decision layer. Ask a question, get a clear answer, then inspect the exact evidence behind it.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[`${data.sampleSize.trades} trades`, `${data.sampleSize.checkins} check-ins`, `${data.sampleSize.journals} journals`, `${data.correlations.length} signals`].map((fact) => <span key={fact} className="rounded-full border border-line bg-paper/75 px-3 py-1.5 text-[10px] font-medium text-faint">{fact}</span>)}
              </div>
            </div>

            <div className="rounded-[24px] border border-line bg-paper/80 p-4 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-faint">Decision state</div><div className="mt-1 font-display text-[24px] font-semibold tracking-[-0.035em]">{data.readiness.label}</div></div>
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", readiness != null && readiness >= 60 ? "border-up/20 bg-up/10 text-up" : "border-brand/20 bg-brand-soft text-brand")}><Target className="h-5 w-5" /></div>
              </div>
              <div className="mt-5 flex items-end justify-between"><div><div className="font-display text-[36px] font-semibold tracking-[-0.05em]">{readiness ?? "—"}<span className="text-[11px] text-faint">/100</span></div><div className="text-[9px] text-faint">readiness score</div></div><div className="text-right"><div className="font-display text-[19px] font-semibold">{money(data.weekly.pnl)}</div><div className="text-[9px] text-faint">7d P&amp;L</div></div></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(0, Math.min(100, readiness ?? 0))}%` }} /></div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_0.85fr]">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="overflow-hidden rounded-[30px] border border-brand/20 bg-[linear-gradient(145deg,var(--card),color-mix(in_srgb,var(--brand-soft)_55%,var(--card)))] shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-paper"><Sparkles className="h-5 w-5" /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-up" /></div><div><div className="font-semibold text-[12px]">Ask Memo</div><div className="text-[9px] uppercase tracking-[0.13em] text-faint">Personal AI workspace</div></div></div>
            <div className="flex items-center gap-2"><Badge tone="brand">Grounded in your data</Badge>{messages.length > 0 && <Button size="sm" variant="ghost" onClick={() => setMessages([])}>Clear</Button>}</div>
          </div>

          <div className="p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[450px] flex-col">
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }} className="relative flex h-[82px] w-[82px] items-center justify-center rounded-[26px] border border-brand/25 bg-brand-soft text-brand shadow-[0_22px_60px_-35px_var(--brand)]"><span className="absolute inset-2.5 rounded-[20px] border border-brand/15" /><Wand2 className="relative h-8 w-8" /></motion.div>
                  <div className="mt-7 font-display text-[30px] font-semibold tracking-[-0.05em] sm:text-[38px]">What should you know?</div>
                  <p className="mt-3 max-w-xl text-[12px] leading-[1.7] text-faint">Ask in plain language. Memo will combine structured signals with recorded evidence instead of inventing a story.</p>
                  <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                    {STARTERS.map(({ label, prompt, icon: Icon }) => <motion.button key={label} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} onClick={() => void ask(prompt)} className="group rounded-[20px] border border-line bg-paper/70 p-4 text-left transition hover:border-brand/30 hover:bg-brand-soft/35"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-card text-brand"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1 text-[11px] font-semibold text-sub">{label}</span><ArrowUpRight className="h-3.5 w-3.5 text-faint group-hover:text-brand" /></div></motion.button>)}
                  </div>
                </div>
                <form onSubmit={submit} className="mt-7 rounded-[22px] border border-line bg-paper p-2 shadow-[0_18px_50px_-35px_var(--ink)]"><div className="flex items-center gap-2"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-faint"><MessageCircle className="h-4 w-4" /></div><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask Memo about your process…" className="min-w-0 flex-1 bg-transparent px-2 text-[12px] outline-none placeholder:text-faint" /><Button type="submit" disabled={!question.trim() || busy} className="shrink-0 rounded-xl px-4">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div></form>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => message.role === "user" ? <div key={message.id} className="flex justify-end"><div className="max-w-[88%] rounded-[20px] rounded-br-md bg-ink px-4 py-3 text-[12px] text-paper shadow-sm">{message.content}</div></div> : <div key={message.id} className="rounded-[24px] border border-line bg-paper/75 p-4 sm:p-5"><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand"><Sparkles className="h-3.5 w-3.5" /> Memo</div>{message.coach ? <><div className="mt-3 flex items-start justify-between gap-4"><h3 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.04em]">{message.coach.headline}</h3><button type="button" onClick={() => void copyAnswer(message.id, message.coach!)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-faint hover:text-brand">{copied === message.id ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button></div><p className="mt-3 text-[12px] leading-[1.75] text-sub">{message.coach.summary}</p>{message.coach.actions.length > 0 && <div className="mt-5 space-y-2">{message.coach.actions.slice(0, 3).map((action) => <div key={action} className="flex gap-2 rounded-2xl border border-line bg-card/70 p-3 text-[11px] text-sub"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"><Check className="h-3 w-3" /></span>{action}</div>)}</div>}{message.coach.safetyNote && <div className="mt-4 flex gap-2 rounded-2xl bg-card/70 p-3 text-[9px] leading-[1.6] text-faint"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{message.coach.safetyNote}</div>}{message.coach.evidenceIds.length > 0 && <div className="mt-4 border-t border-line pt-4"><div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">Evidence</div><div className="flex flex-wrap gap-2">{message.coach.evidenceIds.map((id) => evidenceIndex.get(id) ? <button key={id} type="button" onClick={() => setExpandedEvidence(expandedEvidence === id ? null : id)} className="rounded-full border border-line bg-card px-3 py-1.5 text-[9px] text-sub hover:border-brand/30"><span className="font-semibold">{evidenceIndex.get(id)?.label}</span><span className="mx-1 text-faint">·</span>{evidenceIndex.get(id)?.value}</button> : null)}</div>{expandedEvidence && evidenceIndex.get(expandedEvidence) && <div className="mt-3 rounded-2xl border border-brand/20 bg-brand-soft/40 p-3"><div className="flex items-center justify-between gap-2"><div className="text-[10px] font-semibold">{evidenceIndex.get(expandedEvidence)?.correlation}</div><div className="text-[9px] text-faint">{prettyDate(evidenceIndex.get(expandedEvidence)!.date)}</div></div><div className="mt-1 text-[10px] text-sub">{evidenceIndex.get(expandedEvidence)?.detail}</div></div>}</div>}</> : <p className="mt-2 text-[12px] leading-[1.7] text-sub">{message.content}</p>}</div>)}
                <form onSubmit={submit} className="sticky bottom-3 rounded-[22px] border border-line bg-card/95 p-2 shadow-[0_20px_60px_-35px_var(--ink)] backdrop-blur-xl"><div className="flex items-center gap-2"><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a follow-up…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[12px] outline-none placeholder:text-faint" /><Button type="submit" disabled={!question.trim() || busy} className="rounded-xl px-4">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div></form>
              </div>
            )}
          </div>
        </motion.section>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-line bg-card p-5 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-faint">Latest signal</div><div className="mt-1 font-display text-[21px] font-semibold tracking-[-0.035em]">What Memo sees</div></div><Database className="h-4 w-4 text-brand" /></div>
            {primary ? <div className="mt-5 rounded-[20px] border border-line bg-paper p-4"><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-brand"><Zap className="h-3 w-3" />{primary.label}</div><div className="mt-2 text-[13px] font-semibold leading-snug">{primary.headline}</div><p className="mt-2 text-[10px] leading-[1.7] text-faint">{primary.detail}</p><div className="mt-4 flex items-center justify-between text-[9px]"><span className="text-faint">Sample</span><span className="font-semibold text-sub">{primary.sampleSize} trades · {primary.strength}</span></div></div> : <div className="mt-5 rounded-[20px] border border-dashed border-line p-4 text-[10px] leading-[1.6] text-faint">Memo needs more logged data before it can form a meaningful correlation.</div>}
          </section>

          <section className="rounded-[28px] border border-line bg-card p-5 shadow-[var(--shadow)]"><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-faint"><ArrowUpRight className="h-3 w-3 text-brand" />Next best moves</div><div className="mt-4 space-y-2">{actionList.length ? actionList.map((action, index) => <div key={`${action}-${index}`} className="flex gap-3 rounded-2xl border border-line bg-paper/70 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[9px] font-semibold text-brand">0{index + 1}</span><div className="text-[10px] leading-[1.6] text-sub">{action}</div></div>) : <div className="text-[10px] text-faint">Keep logging. Memo will turn new records into new signals.</div>}</div></section>

          <section className="rounded-[28px] border border-line bg-ink p-5 text-paper shadow-[var(--shadow)]"><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-paper/50"><Sparkles className="h-3 w-3 text-brand" />AI scope</div><div className="mt-3 text-[14px] font-semibold">Interpret your process. Never invent your record.</div><p className="mt-2 text-[10px] leading-[1.7] text-paper/55">Memo can connect patterns across what you logged. It cannot know what you did not record, and low-sample signals should be treated as a prompt to investigate, not a verdict.</p><button type="button" onClick={() => void ask("Give me the single most important thing I should investigate from my current data.")} className="mt-4 flex w-full items-center justify-between rounded-xl border border-paper/10 bg-paper/5 px-3 py-2.5 text-[10px] font-semibold text-paper/80 transition hover:bg-paper/10">Run a full review <ChevronRight className="h-3.5 w-3.5" /></button></section>
        </div>
      </div>
    </div>
  );
}
