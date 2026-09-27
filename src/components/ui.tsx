"use client";

import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "outline" | "soft" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-brand-solid text-brand-on quill-primary hover:brightness-[1.03] active:scale-[0.98]",
  ghost: "hover:bg-line/60 text-sub hover:text-ink active:scale-[0.98]",
  outline: "border border-line-strong bg-transparent hover:bg-line/40 active:scale-[0.98]",
  soft: "bg-line/50 hover:bg-line active:scale-[0.98]",
  danger: "bg-down-soft text-down hover:bg-down/20 active:scale-[0.98]",
  success: "bg-up-soft text-up hover:bg-up/20 active:scale-[0.98]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3.5 text-[13px] rounded-xl gap-1.5",
  md: "min-h-11 px-4 text-sm rounded-xl gap-2",
  lg: "min-h-12 px-6 text-[15px] rounded-xl gap-2",
  icon: "h-11 w-11 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer select-none items-center justify-center font-medium tracking-[-0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        BUTTON_STYLES[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("quill-card rounded-2xl border border-line bg-card shadow-[var(--shadow)]", className)} {...props} />;
}

const FIELD_BASE = "w-full rounded-xl border border-line bg-paper-2/60 text-sm outline-none placeholder:text-faint transition-all focus:border-line-strong focus:ring-2 focus:ring-focus/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(FIELD_BASE, "tabular min-h-11 px-3.5", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(FIELD_BASE, "px-3.5 py-3 leading-relaxed", className)} {...props} />;
});

const CHEVRON =
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(FIELD_BASE, "min-h-11 cursor-pointer appearance-none px-3.5 pr-8", CHEVRON, className)} {...props}>
      {children}
    </select>
  );
});

export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[12px] font-medium uppercase tracking-wide text-sub">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

const BADGE_TONES = {
  neutral: "bg-line/50 text-sub",
  up: "bg-up-soft text-up",
  down: "bg-down-soft text-down",
  brand: "bg-brand-soft text-brand",
} as const;

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof BADGE_TONES; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", BADGE_TONES[tone], className)}>{children}</span>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex items-center rounded-xl border border-line bg-paper-2/70 p-1", size === "sm" && "rounded-lg p-0.5")}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative min-h-11 cursor-pointer rounded-lg px-3 text-[13px] font-medium text-sub transition-colors hover:text-ink active:scale-[0.98]",
            value === option.value && "text-ink",
          )}
        >
          {value === option.value && (
            <motion.span
              layoutId={`segment-${String(options[0]?.value)}`}
              className="absolute inset-0 rounded-lg border border-line bg-card shadow-sm"
              transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
            />
          )}
          <span className="relative z-10 inline-flex items-center gap-1">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[6px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0.12, duration: 0.4 }}
            className={cn(
              "relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-2xl",
              wide ? "sm:max-w-2xl" : "sm:max-w-lg",
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-line bg-card/90 px-5 py-4 backdrop-blur">
              <div className="font-display text-[15px] font-semibold tracking-[-0.01em]">{title}</div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.9, rotate: -8 }}
                onClick={onClose}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-sub transition-colors hover:bg-line/60 hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg bg-line/40", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div>
      <div className="font-display text-[15px] font-semibold">{title}</div>
      <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-sub">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
