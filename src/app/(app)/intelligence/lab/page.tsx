"use client";

import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import type { IntelligenceResult } from "@/lib/intelligence";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import EvidenceLab from "@/components/intelligence/evidence-lab";

async function getIntelligence() {
  const res = await fetch("/api/intelligence");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json.intelligence as IntelligenceResult;
}

export default function IntelligenceLabPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["intelligence"],
    queryFn: getIntelligence,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<Brain className="h-5 w-5" />}
        title="Evidence lab is unavailable"
        body="Quill couldn't load the evidence sample right now."
        action={<Button onClick={() => window.location.reload()}>Try again</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-line bg-card p-5 sm:p-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Quill Intelligence · Evidence Lab</div>
        <h1 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.035em] sm:text-[38px]">Inspect the evidence, not just the conclusion.</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-sub">Open any relationship to see the recorded trade rows that produced it. Every row is actual app data, and every signal remains descriptive rather than predictive.</p>
      </header>

      <EvidenceLab correlations={data.correlations} />
    </div>
  );
}
