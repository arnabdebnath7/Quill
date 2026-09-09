import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatMoney(value: number, currency = "USD", opts?: { sign?: boolean }) {
  const fmt = currency === "INR" ? inr : usd;
  const abs = Math.abs(value);
  const core = fmt.format(abs);
  if (opts?.sign) {
    return `${value < 0 ? "\u2212" : "+"}${core}`;
  }
  return value < 0 ? `\u2212${core}` : core;
}

export function formatCompact(value: number, currencySymbol = "$") {
  const abs = Math.abs(value);
  const sign = value < 0 ? "\u2212" : "";
  if (abs >= 1_000_000) return `${sign}${currencySymbol}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${currencySymbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${currencySymbol}${abs.toFixed(2)}`;
}

export function formatPrice(value: number, decimals = 2) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Directional trade P&L after fees */
export function tradePnl(t: {
  side: string;
  quantity: string | number;
  entryPrice: string | number;
  exitPrice?: string | number | null;
  fees?: string | number | null;
}, mark?: number): number | null {
  const exit = t.exitPrice != null ? num(t.exitPrice) : mark;
  if (exit == null) return null;
  const dir = t.side === "short" ? -1 : 1;
  return (exit - num(t.entryPrice)) * num(t.quantity) * dir - num(t.fees);
}

export function tradePnlPct(t: {
  side: string;
  entryPrice: string | number;
  exitPrice?: string | number | null;
}, mark?: number): number | null {
  const exit = t.exitPrice != null ? num(t.exitPrice) : mark;
  if (exit == null) return null;
  const dir = t.side === "short" ? -1 : 1;
  const entry = num(t.entryPrice);
  if (!entry) return null;
  return ((exit - entry) / entry) * 100 * dir;
}

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function avatarHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
