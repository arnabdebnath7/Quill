"use client";

import { useEffect } from "react";
import MemoPage from "./memo-page";
import { Mimo } from "@/components/mimo";

export default function IntelligencePage() {
  useEffect(() => {
    document.title = "Mimo · Quill";
  }, []);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute right-0 top-0 z-20 hidden sm:block">
        <div className="rounded-[24px] border border-line bg-card/90 p-3 shadow-[var(--shadow)] backdrop-blur-xl">
          <Mimo size={76} state="idle" />
          <div className="mt-1 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-brand">Mimo</div>
        </div>
      </div>
      <MemoPage />
    </div>
  );
}
