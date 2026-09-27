"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CloudRain, Frown, Laugh, Meh, Smile, Star, Zap } from "lucide-react";
import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { MARKET_LIST, SETUPS, decimalsFor, findInstrument, marketOf, type MarketKey } from "@/lib/markets";
import { useCreateTrade, useQuotes, useUpdateTrade } from "@/lib/hooks";
import { cn, formatPrice, inputToIso, num, toDateTimeLocal } from "@/lib/utils";
import type { Trade } from "@/db/schema";

const MOOD_ICONS: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  great: { icon: Laugh, label: "Great", color: "text-up" },
  good: { icon: Smile, label: "Good", color: "text-emerald-400" },
  neutral: { icon: Meh, label: "Neutral", color: "text-faint" },
  low: { icon: Frown, label: "Low", color: "text-amber-500" },
  rough: { icon: CloudRain, label: "Rough", color: "text-down" },
};

export interface TradeFormProps {
  open: boolean;
  onClose: () => void;
  edit?: Trade | null;
  closeMode?: boolean;
}

type FormState = {
  market: MarketKey;
  symbol: string;
  side: "long" | "short";
  quantity: string;
  entryPrice: string;
  exitPrice: string;
  entryAt: string;
  exitAt: string;
  fees: string;
  setup: string;
  notes: string;
  mood: string | null;
  rating: number;
  tags: string;
  riskAmount: string;
  preTradePlan: string;
  entryReason: string;
  exitReason: string;
  mistake: string;
  lesson: string;
  rulesFollowed: boolean | null;
};

function initialState(edit: Trade | null | undefined, closeMode: boolean | undefined): FormState {
  if (edit) {
    return {
      market: edit.market as MarketKey,
      symbol: edit.symbol,
      side: edit.side as "long" | "short",
      quantity: String(edit.quantity),
      entryPrice: String(edit.entryPrice),
      exitPrice: edit.exitPrice != null ? String(edit.exitPrice) : "",
      entryAt: toDateTimeLocal(edit.entryAt),
      // Closing a position now defaults the exit time to "now"; editing keeps the recorded time.
      exitAt: edit.exitAt ? toDateTimeLocal(edit.exitAt) : closeMode ? toDateTimeLocal(new Date()) : "",
      fees: edit.fees && Number(edit.fees) !== 0 ? String(edit.fees) : "",
      setup: edit.setup ?? "",
      notes: edit.notes ?? "",
      mood: edit.mood,
      rating: edit.rating ?? 0,
      tags: (edit.tags ?? []).join(", "),
      riskAmount: edit.riskAmount != null ? String(edit.riskAmount) : "",
      preTradePlan: edit.preTradePlan ?? "",
      entryReason: edit.entryReason ?? "",
      exitReason: edit.exitReason ?? "",
      mistake: edit.mistake ?? "",
      lesson: edit.lesson ?? "",
      rulesFollowed: edit.rulesFollowed ?? null,
    };
  }
  return {
    market: "us",
    symbol: "AAPL",
    side: "long",
    quantity: "",
    entryPrice: "",
    exitPrice: "",
    entryAt: toDateTimeLocal(new Date()),
    exitAt: "",
    fees: "",
    setup: "",
    notes: "",
    mood: null,
    rating: 0,
    tags: "",
    riskAmount: "",
    preTradePlan: "",
    entryReason: "",
    exitReason: "",
    mistake: "",
    lesson: "",
    rulesFollowed: null,
  };
}

export function TradeForm({ open, onClose, edit, closeMode }: TradeFormProps) {
  const title = closeMode ? `Exit ${edit?.symbol ?? "position"}` : edit ? "Edit trade" : "Log a trade";
  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      {/* Keyed on the trade being edited so every open starts from a clean, lazily-initialised state. */}
      <TradeFormBody key={`${edit?.id ?? "new"}-${closeMode ? "close" : "edit"}`} onClose={onClose} edit={edit} closeMode={closeMode} />
    </Dialog>
  );
}

function TradeFormBody({ onClose, edit, closeMode }: Omit<TradeFormProps, "open">) {
  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();
  const [form, setForm] = useState<FormState>(() => initialState(edit, closeMode));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const { market, symbol, side, quantity, entryPrice, exitPrice, fees } = form;
  const instruments = useMemo(() => marketOf(market).instruments, [market]);
  const inst = findInstrument(symbol, market);
  const dec = decimalsFor(symbol, market);
  const currency = marketOf(market);
  const pending = createTrade.isPending || updateTrade.isPending;

  const quotes = useQuotes(symbol ? [{ market, symbol }] : [], 20_000);
  const quote = quotes.data?.[`${market}:${symbol}`];
  const liveQuote = quote && quote.live ? quote : null;

  const estPnl = useMemo(() => {
    const q = parseFloat(quantity);
    const en = parseFloat(entryPrice);
    const ex = parseFloat(exitPrice);
    if (![q, en, ex].every(Number.isFinite)) return null;
    return (ex - en) * q * (side === "short" ? -1 : 1) - num(fees || "0");
  }, [quantity, entryPrice, exitPrice, side, fees]);

  const submit = async () => {
    setError(null);
    const q = parseFloat(quantity);
    const en = parseFloat(entryPrice);
    const ex = exitPrice.trim() === "" ? null : parseFloat(exitPrice);
    const risk = form.riskAmount.trim() === "" ? null : parseFloat(form.riskAmount);
    const feeValue = form.fees.trim() === "" ? 0 : parseFloat(form.fees);
    const entryIso = inputToIso(form.entryAt);
    const exitIso = ex != null ? (form.exitAt.trim() ? inputToIso(form.exitAt) : new Date().toISOString()) : null;

    if (!symbol) return setError("Pick an instrument.");
    if (!Number.isFinite(q) || q <= 0) return setError("Quantity must be a positive number.");
    if (!Number.isFinite(en) || en <= 0) return setError("Entry price must be a positive number.");
    if (ex != null && (!Number.isFinite(ex) || ex <= 0)) return setError("Exit price must be a positive number.");
    if (risk != null && (!Number.isFinite(risk) || risk <= 0)) return setError("Risk amount must be positive.");
    if (!Number.isFinite(feeValue) || feeValue < 0) return setError("Fees must be zero or a positive number.");
    if (!entryIso) return setError("Enter a valid entry date and time.");
    if (ex != null && !exitIso) return setError("Enter a valid exit date and time.");
    if (exitIso && new Date(exitIso) < new Date(entryIso)) return setError("Exit time can't be before the entry time.");

    const payload = {
      symbol,
      name: inst?.name ?? edit?.name ?? symbol,
      market,
      side,
      quantity: q,
      entryPrice: en,
      exitPrice: ex,
      entryAt: entryIso,
      exitAt: exitIso,
      fees: feeValue,
      setup: form.setup || null,
      notes: form.notes || null,
      mood: form.mood,
      rating: form.rating || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      riskAmount: risk,
      preTradePlan: form.preTradePlan,
      entryReason: form.entryReason,
      exitReason: form.exitReason,
      mistake: form.mistake,
      lesson: form.lesson,
      rulesFollowed: form.rulesFollowed,
    };
    try {
      if (edit) await updateTrade.mutateAsync({ id: edit.id, ...payload });
      else await createTrade.mutateAsync(payload);
      onClose();
    } catch {
      // The mutation hook already surfaced a toast; keep the dialog open so nothing typed is lost.
    }
  };

  const applyLive = () => {
    if (!liveQuote) return;
    const price = formatPrice(liveQuote.price, dec).replace(/,/g, "");
    if (closeMode || edit?.status === "closed") set("exitPrice", price);
    else set("entryPrice", price);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Market">
          <Select
            value={market}
            disabled={closeMode}
            onChange={(e) => {
              const m = e.target.value as MarketKey;
              setForm((f) => ({ ...f, market: m, symbol: marketOf(m).instruments[0].symbol }));
            }}
          >
            {MARKET_LIST.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.currency})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Instrument">
          <Select value={symbol} disabled={closeMode} onChange={(e) => set("symbol", e.target.value)}>
            {instruments.map((i) => (
              <option key={i.symbol} value={i.symbol}>
                {i.symbol} — {i.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {liveQuote && (
        <button
          type="button"
          onClick={applyLive}
          className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-line bg-up-soft/60 px-3.5 text-left transition-all hover:bg-up-soft active:scale-[0.995]"
        >
          <span className="flex items-center gap-2 text-[12.5px] font-medium text-up">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" /> Live {symbol}
          </span>
          <span className="tabular flex items-center gap-1.5 font-mono text-[13px] font-semibold text-up">
            {formatPrice(liveQuote.price, dec)}
            <Zap className="h-3 w-3" />
          </span>
          <span className="sr-only">Use as {closeMode ? "exit" : "entry"} price</span>
        </button>
      )}

      {!closeMode && (
        <div className="grid grid-cols-2 gap-2">
          {(["long", "short"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("side", s)}
              className={cn(
                "min-h-11 cursor-pointer rounded-xl border text-[13.5px] font-semibold capitalize transition-all active:scale-[0.98]",
                side === s ? (s === "long" ? "border-up/40 bg-up-soft text-up" : "border-down/40 bg-down-soft text-down") : "border-line text-sub hover:bg-line/40",
              )}
            >
              {s === "long" ? "Long / Buy" : "Short / Sell"}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Quantity">
          <Input inputMode="decimal" placeholder="0.00" value={quantity} disabled={closeMode} onChange={(e) => set("quantity", e.target.value)} />
        </Field>
        <Field label={closeMode ? "Entry" : "Entry price"} hint={currency.currency}>
          <Input inputMode="decimal" placeholder="0.00" value={entryPrice} disabled={closeMode} onChange={(e) => set("entryPrice", e.target.value)} />
        </Field>
        <Field label="Exit price" hint="empty = stays open">
          <Input inputMode="decimal" placeholder="0.00" value={exitPrice} onChange={(e) => set("exitPrice", e.target.value)} />
        </Field>
      </div>

      {estPnl != null && (
        <div className={cn("tabular rounded-xl px-3.5 py-2.5 text-[13px] font-semibold", estPnl >= 0 ? "bg-up-soft text-up" : "bg-down-soft text-down")}>
          Estimated P&L: {estPnl >= 0 ? "+" : "−"}
          {currency.currencySymbol}
          {Math.abs(estPnl).toFixed(2)}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Entry time">
          <Input type="datetime-local" value={form.entryAt} disabled={closeMode} onChange={(e) => set("entryAt", e.target.value)} />
        </Field>
        <Field label="Exit time" hint={exitPrice.trim() ? undefined : "set when you close"}>
          <Input type="datetime-local" value={form.exitAt} disabled={!exitPrice.trim()} onChange={(e) => set("exitAt", e.target.value)} />
        </Field>
        <Field label="Fees" hint={currency.currency}>
          <Input inputMode="decimal" placeholder="0.00" value={form.fees} onChange={(e) => set("fees", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Setup">
          <Select value={form.setup} onChange={(e) => set("setup", e.target.value)}>
            <option value="">— choose —</option>
            {SETUPS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Planned risk" hint={currency.currency}>
          <Input inputMode="decimal" placeholder="0.00" value={form.riskAmount} onChange={(e) => set("riskAmount", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Headspace">
          <div className="flex gap-1.5">
            {Object.entries(MOOD_ICONS).map(([k, m]) => (
              <button
                key={k}
                type="button"
                title={m.label}
                aria-pressed={form.mood === k}
                onClick={() => set("mood", form.mood === k ? null : k)}
                className={cn(
                  "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border transition-all active:scale-95",
                  form.mood === k ? "border-line-strong bg-line/60" : "border-line hover:bg-line/40",
                )}
              >
                <m.icon className={cn("h-[18px] w-[18px]", form.mood === k ? m.color : "text-faint")} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Self grade">
          <div className="flex min-h-11 items-center gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                aria-label={`Rate ${r} out of 5`}
                onClick={() => set("rating", form.rating === r ? 0 : r)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center transition-transform hover:scale-110 active:scale-95"
              >
                <Star className={cn("h-[19px] w-[19px]", r <= form.rating ? "fill-brand text-brand" : "text-line-strong")} />
              </button>
            ))}
            <span className="ml-1 text-[11.5px] text-faint">{form.rating ? `${form.rating}/5` : "rate the execution"}</span>
          </div>
        </Field>
      </div>

      <div className="rounded-2xl border border-line bg-paper p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Trade review</div>
            <div className="text-[11px] text-sub">Capture the reasoning, not just the numbers.</div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Pre-trade plan">
            <Textarea rows={3} value={form.preTradePlan} onChange={(e) => set("preTradePlan", e.target.value)} placeholder="What must happen before you enter? Where is the invalidation?" />
          </Field>
          <Field label="Entry reason">
            <Textarea rows={3} value={form.entryReason} onChange={(e) => set("entryReason", e.target.value)} placeholder="Why did this setup deserve your risk?" />
          </Field>
          <Field label="Exit reason">
            <Textarea rows={3} value={form.exitReason} onChange={(e) => set("exitReason", e.target.value)} placeholder="Why did you exit — target, stop, thesis change, or impulse?" />
          </Field>
          <Field label="Mistake">
            <Textarea rows={3} value={form.mistake} onChange={(e) => set("mistake", e.target.value)} placeholder="What would you do differently? Leave blank when there was no mistake." />
          </Field>
          <Field label="Lesson">
            <Textarea rows={3} value={form.lesson} onChange={(e) => set("lesson", e.target.value)} placeholder="One sentence future-you should remember." />
          </Field>
          <Field label="Rules followed">
            <div className="grid grid-cols-3 gap-2">
              {([
                [true, "Yes"],
                [false, "No"],
                [null, "Not sure"],
              ] as const).map(([v, l]) => (
                <button
                  type="button"
                  key={String(v)}
                  onClick={() => set("rulesFollowed", v)}
                  className={cn(
                    "min-h-11 cursor-pointer rounded-xl border text-[12px] font-semibold",
                    form.rulesFollowed === v ? "border-brand bg-brand-soft text-brand" : "border-line bg-card text-sub hover:bg-line/40",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <Field label="Tags" hint="comma separated — swing, fx, revenge-trade…">
        <Input placeholder="swing, breakout" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea rows={4} placeholder="What did you see? Keep raw observations here." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      {error && (
        <p className="text-[12.5px] text-down" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2.5 pt-1">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} loading={pending}>
          {closeMode ? "Close position" : edit ? "Save changes" : "Log trade"}
        </Button>
      </div>
    </div>
  );
}

export function isClosedTrade(t: Trade) {
  return t.status === "closed" && t.exitPrice != null;
}
