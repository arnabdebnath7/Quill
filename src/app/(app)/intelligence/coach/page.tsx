"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Brain, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { riseItem } from "@/lib/motion";

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
      <header className="rounded-2xl border border-border bg-card p-6 sm:p-8 quill-card">
        <Link
          href="/intelligence"
          className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Intelligence
        </Link>
        <div className="mt-7 flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Brain className="h-3.5 w-3.5" /> Quill Coach
            </div>
            <h1 className="mt-2 max-w-2xl font-display text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">Ask Quill about your documented behaviour.</h1>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              Quill can explain patterns already present in your journal. It does not predict markets or choose trades for you.
            </p>
          </div>
          <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-primary-soft p-3 sm:flex">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Start with a focused question</div>
        </CardHeader>
        <CardContent>
          <form onSubmit={ask} className="space-y-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Ask about your recorded patterns…"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => setQuestion(starter)}
                    className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-left text-[10.5px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground cursor-pointer"
                  >
                    {starter}
                  </button>
                ))}
              </div>
              <Button type="submit" disabled={busy || !question.trim()}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</> : <><Sparkles className="h-4 w-4" /> Ask Quill</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {busy && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground"
        >
          Quill is checking your recorded evidence and preparing a constrained response…
        </motion.div>
      )}

      {error && (
        <Card className="border-down/20">
          <CardContent className="pt-6">
            <div className="text-[12.5px] font-semibold text-down">{error}</div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              Your deterministic Intelligence panels remain available, so you can continue reviewing the underlying evidence.
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <motion.div variants={riseItem} initial="initial" animate="animate" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/25 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" /> Evidence-grounded response
              </div>
              <h2 className="mt-3 font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[28px]">{result.headline}</h2>
              <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">{result.summary}</p>
            </div>
            <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_0.72fr]">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">What to do next</div>
                <div className="mt-3 space-y-2.5">
                  {result.actions.map((action, index) => (
                    <div key={`${action}-${index}`} className="flex gap-3 rounded-xl bg-muted/30 p-3.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">{index + 1}</div>
                      <p className="text-[12px] leading-relaxed text-foreground/85">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/25 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Evidence referenced</div>
                <div className="mt-3 space-y-2">
                  {result.evidenceIds.length ? (
                    result.evidenceIds.map((id) => (
                      <div key={id} className="rounded-lg border border-border bg-card px-3 py-2 text-[10.5px] font-medium text-foreground/80">{id}</div>
                    ))
                  ) : (
                    <div className="text-[11px] leading-relaxed text-muted-foreground">No evidence records were strong enough to cite for this response.</div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Boundary</div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{result.safetyNote}</p>
            </div>
            <Link href="/intelligence/lab">
              <Button variant="outline">Inspect evidence <ArrowUpRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
