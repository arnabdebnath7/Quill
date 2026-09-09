"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-7 text-center shadow-[var(--shadow)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-down-soft text-down"><AlertTriangle className="h-5 w-5" /></div>
        <h1 className="mt-4 font-display text-xl font-semibold">Something went off track</h1>
        <p className="mt-2 text-sm leading-relaxed text-sub">Quill could not finish loading this screen. Your saved data is not deleted. Try again.</p>
        <Button className="mt-5" onClick={() => reset()}><RefreshCw className="h-4 w-4" /> Try again</Button>
      </div>
    </div>
  );
}
