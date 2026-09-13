"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn, num } from "@/lib/utils";
import { EASE } from "@/lib/motion";
import type { Quote } from "@/app/api/market/quotes/route";
import { decimalsFor, marketOf } from "@/lib/markets";
import { formatPrice } from "@/lib/utils";

/* ---------------------------- section title ---------------------------- */
export function SectionTitle({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3.5 flex items-end justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        <Icon className="h-[15px] w-[15px] text-primary" />
        <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {hint && <span className="hidden text-[11.5px] text-muted-foreground sm:inline">{hint}</span>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ stat card ------------------------------ */
export function StatCard({
  label,
  value,
  sub,
  icon,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className="h-full"
    >
      <div className="quill-card flex h-full flex-col rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="flex-1">{value}</div>
        {sub && <p className="mt-1.5 text-[12px] text-muted-foreground">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ------------------------------- empty state --------------------------- */
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <div className="font-display text-[15px] font-semibold">{title}</div>
      <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/* ----------------------------- P&L helpers ----------------------------- */
export function PnlArrow({ up, className }: { up: boolean; className?: string }) {
  return up ? <ArrowUpRight className={cn("h-3.5 w-3.5", className)} /> : <ArrowDownRight className={cn("h-3.5 w-3.5", className)} />;
}

export function pnlClass(v: number | null, base = "text-foreground") {
  if (v == null) return "text-muted-foreground";
  return v >= 0 ? "text-up" : "text-down";
}

/* ------------------------------- mood bits ----------------------------- */
const MOODS: Record<string, { label: string; cls: string; dot: string }> = {
  great: { label: "Great", cls: "bg-up-soft text-up", dot: "bg-up" },
  good: { label: "Good", cls: "bg-up-soft/70 text-up", dot: "bg-up/80" },
  neutral: { label: "Neutral", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
  low: { label: "Low", cls: "bg-primary-soft text-primary", dot: "bg-primary" },
  rough: { label: "Rough", cls: "bg-down-soft text-down", dot: "bg-down" },
};

export function moodMeta(mood: string | null) {
  return MOODS[mood ?? "neutral"] ?? MOODS.neutral;
}

export function MoodBadge({ mood, className }: { mood: string | null; className?: string }) {
  const m = moodMeta(mood);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", m.cls, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

/* ----------------------------- side badge ------------------------------ */
export function SideBadge({ side }: { side: string }) {
  const long = side === "long";
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
        long ? "bg-up-soft text-up" : "bg-down-soft text-down",
      )}
      title={long ? "Long" : "Short"}
    >
      {long ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
    </span>
  );
}

/* ----------------------------- flash number ---------------------------- */
export function useFlash(value: number | undefined) {
  const prev = useRef<number | undefined>(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value == null || prev.current == null || value === prev.current) {
      prev.current = value;
      return;
    }
    setDir(value > prev.current ? "up" : "down");
    prev.current = value;
    const t = setTimeout(() => setDir(null), 950);
    return () => clearTimeout(t);
  }, [value]);
  return dir;
}

/* ------------------------------ market strip --------------------------- */
export function StripQuote({ quote, symbol, market }: { quote?: Quote; symbol: string; market: string }) {
  if (!quote) {
    return <div className="h-[74px] w-[132px] shrink-0 animate-pulse rounded-xl border border-border bg-muted/60" />;
  }
  const up = quote.changePct >= 0;
  return (
    <Link
      href="/watchlist"
      className="group flex h-[74px] w-[132px] shrink-0 flex-col justify-between rounded-xl border border-border bg-card px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.985]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">{quote.symbol}</span>
        <span className={cn("flex items-center gap-0.5 text-[10.5px] font-medium tabular", up ? "text-up" : "text-down")}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(quote.changePct).toFixed(2)}%
        </span>
      </div>
      <div className="font-mono text-[14.5px] font-medium tabular">{formatPrice(quote.price, decimalsFor(quote.symbol, market))}</div>
    </Link>
  );
}

/* ------------------------------ live dot ------------------------------- */
export function LiveDot({ label = "live" }: { label?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-up">
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" />
      {label}
    </span>
  );
}

/* ------------------------------ row hover ------------------------------ */
export function HoverRow({ children, className, as: Tag = "div", ...rest }: { children: ReactNode; className?: string; as?: "div" | "button"; } & Record<string, unknown>) {
  return (
    <Tag
      className={cn("rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60 active:scale-[0.995] cursor-pointer", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export { marketOf, num };
