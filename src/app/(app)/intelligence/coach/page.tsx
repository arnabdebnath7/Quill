"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Brain, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";

const STARTERS = [
  "What is the most useful thing to review right now?",
  "Where did my discipline leak this week?",
  "What does my recorded data say about my readiness?",
];

export default function CoachPage() {
  const [question, setQuestion] = useState(STARTERS[0]);
  const [result, setResult] = useState<null | { headline: string; summary: string; actions: string[]; evidenceIds: string[]; safetyNote: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/intelligence/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: question.trim().slice(0, 500) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Coach unavailable (${res.status})`);
      setResult(json.coach);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coach unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      <header className="relative overflow-hidden rounded-[30px] border border-line bg-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative">
          <Link href="/intelligence" className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint transition-colors hover:text-sub">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Intelligence
          </Link>
          <div className="mt-7 flex items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
                <Brain className="h-3.5 w-3.5" /> Quill Coach
              </div>
              <h1 className="mt-2 max-w-2xl font-display text-[32px] font-semibold tracking-[-0.04em] sm:text-[42px]">Ask Quill about your documented behaviour.</h1>
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-sub">Quill can explain patterns already present in your journal. It does not predict markets or choose trades for you.</p>
            </div>
            <div className="hidden rounded-2xl border border-line bg-paper/70 p-3 sm:block">
              <ShieldCheck className="h-5 w-5 text-brand" />
            </div>
          </div>
        </div>
      </header>

      <Card className="p-5 sm:p-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-faint">Start with a focused question</div>
        <form onSubmit={ask} className="mt-3 space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-[13px] leading-relaxed outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/10"
            placeholder="Ask about your recorded patterns…"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button key={starter} type="button" onClick={() => setQuestion(starter)} className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-[10px] font-medium text-faint transition hover:border-brand/30 hover:text-sub">
                  {starter}
                </button>
              ))}
            </div>
            <Button type="submit" disabled={busy || !question.trim()}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</> : <><Sparkles className="h-4 w-4" /> Ask Quill</>}
            </Button>
          </div>
        </form>
      </Card>

      {busy && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-paper px-4 py-3 text-[11px] text-faint">
          Quill is checking your recorded evidence and preparing a constrained response…
        </motion.div>
      )}

      {error && (
        <Card className="border-down/20 bg-down/5 p-5">
          <div className="text-[12px] font-semibold text-down">{error}</div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-sub">Your deterministic Intelligence panels remain available, so you can continue reviewing the underlying evidence.</p>
        </Card>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="bg-paper/55 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand"><CheckCircle2 className="h-3.5 w-3.5" /> Evidence-grounded response</div>
              <h2 className="mt-3 font-display text-[24px] font-semibold tracking-[-0.03em] sm:text-[30px]">{result.headline}</h2>
              <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-sub">{result.summary}</p>
            </div>
            <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_0.72fr]">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">What to do next</div>
                <div className="mt-3 space-y-2.5">
                  {result.actions.map((action, index) => (
                    <div key={`${action}-${index}`} className="flex gap-3 rounded-2xl bg-paper p-3.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">{index + 1}</div>
                      <p className="text-[12px] leading-relaxed text-sub">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-paper/70 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Evidence referenced</div>
                <div className="mt-3 space-y-2">
                  {result.evidenceIds.length ? result.evidenceIds.map((id) => (
                    <div key={id} className="rounded-xl border border-line bg-card px-3 py-2 text-[10px] font-medium text-sub">{id}</div>
                  )) : <div className="text-[11px] leading-relaxed text-faint">No evidence records were strong enough to cite for this response.</div>}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Boundary</div><p className="mt-1 text-[11px] leading-relaxed text-sub">{result.safetyNote}</p></div>
            <Link href="/intelligence/lab"><Button variant="outline">Inspect evidence <ArrowUpRight className="h-4 w-4" /></Button></Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
