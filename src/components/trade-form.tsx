"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CloudRain, Frown, Laugh, Meh, Smile, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MARKET_LIST, SETUPS, decimalsFor, findInstrument, marketOf, type MarketKey } from "@/lib/markets";
import { cn, formatPrice, num } from "@/lib/utils";
import { useCreateTrade, useUpdateTrade } from "@/lib/hooks";
import type { Trade } from "@/db/schema";

const MOOD_ICONS: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  great: { icon: Laugh, label: "Great", color: "text-up" },
  good: { icon: Smile, label: "Good", color: "text-up/80" },
  neutral: { icon: Meh, label: "Neutral", color: "text-muted-foreground" },
  low: { icon: Frown, label: "Low", color: "text-primary" },
  rough: { icon: CloudRain, label: "Rough", color: "text-down" },
};

const selectClass =
  "h-10 w-full appearance-none rounded-md border border-input bg-card px-3 pr-8 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat cursor-pointer";

export interface TradeFormProps {
  open: boolean;
  onClose: () => void;
  edit?: Trade | null;
  closeMode?: boolean;
}

export function TradeForm({ open, onClose, edit, closeMode }: TradeFormProps) {
  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();
  const [market, setMarket] = useState<MarketKey>("us");
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"long" | "short">("long");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [entryAt, setEntryAt] = useState(new Date().toISOString().slice(0, 10));
  const [fees, setFees] = useState("");
  const [setup, setSetup] = useState("");
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState("");
  const [riskAmount, setRiskAmount] = useState("");
  const [preTradePlan, setPreTradePlan] = useState("");
  const [entryReason, setEntryReason] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [mistake, setMistake] = useState("");
  const [lesson, setLesson] = useState("");
  const [rulesFollowed, setRulesFollowed] = useState<boolean | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLive(null);
    if (edit) {
      setMarket(edit.market as MarketKey);
      setSymbol(edit.symbol);
      setSide(edit.side as "long" | "short");
      setQuantity(String(edit.quantity));
      setEntryPrice(String(edit.entryPrice));
      setExitPrice(edit.exitPrice != null ? String(edit.exitPrice) : "");
      setEntryAt(new Date(edit.entryAt).toISOString().slice(0, 10));
      setFees(String(edit.fees ?? ""));
      setSetup(edit.setup ?? "");
      setNotes(edit.notes ?? "");
      setMood(edit.mood);
      setRating(edit.rating ?? 0);
      setTags((edit.tags ?? []).join(", "));
      setRiskAmount(edit.riskAmount != null ? String(edit.riskAmount) : "");
      setPreTradePlan(edit.preTradePlan ?? "");
      setEntryReason(edit.entryReason ?? "");
      setExitReason(edit.exitReason ?? "");
      setMistake(edit.mistake ?? "");
      setLesson(edit.lesson ?? "");
      setRulesFollowed(edit.rulesFollowed ?? null);
    } else {
      setMarket("us");
      setSymbol("AAPL");
      setSide("long");
      setQuantity("");
      setEntryPrice("");
      setExitPrice("");
      setEntryAt(new Date().toISOString().slice(0, 10));
      setFees("");
      setSetup("");
      setNotes("");
      setMood(null);
      setRating(0);
      setTags("");
      setRiskAmount("");
      setPreTradePlan("");
      setEntryReason("");
      setExitReason("");
      setMistake("");
      setLesson("");
      setRulesFollowed(null);
    }
  }, [open, edit]);

  useEffect(() => {
    if (!open || !symbol) return;
    let dead = false;
    fetch(`/api/market/quotes?symbols=${market}:${symbol}`)
      .then((r) => r.json())
      .then((j) => {
        if (!dead) setLive(j?.quotes?.[`${market}:${symbol}`]?.price ?? null);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [open, market, symbol]);

  const instruments = useMemo(() => marketOf(market).instruments, [market]);
  const inst = findInstrument(symbol, market);
  const dec = decimalsFor(symbol, market);
  const pending = createTrade.isPending || updateTrade.isPending;
  const estPnl = useMemo(() => {
    const q = parseFloat(quantity), en = parseFloat(entryPrice), ex = parseFloat(exitPrice);
    if (![q, en, ex].every(Number.isFinite)) return null;
    return (ex - en) * q * (side === "short" ? -1 : 1) - num(fees || "0");
  }, [quantity, entryPrice, exitPrice, side, fees]);

  const submit = async () => {
    setError(null);
    const q = parseFloat(quantity), en = parseFloat(entryPrice), ex = exitPrice.trim() === "" ? null : parseFloat(exitPrice);
    const risk = riskAmount.trim() === "" ? null : parseFloat(riskAmount);
    if (!symbol) return setError("Pick an instrument.");
    if (!Number.isFinite(q) || q <= 0) return setError("Quantity must be a positive number.");
    if (!Number.isFinite(en) || en <= 0) return setError("Entry price must be a positive number.");
    if (exitPrice.trim() !== "" && (!Number.isFinite(ex!) || ex! <= 0)) return setError("Exit price must be a positive number.");
    if (risk != null && (!Number.isFinite(risk) || risk <= 0)) return setError("Risk amount must be positive.");
    const payload = {
      symbol,
      name: inst?.name ?? edit?.name ?? symbol,
      market,
      side,
      quantity: q,
      entryPrice: en,
      exitPrice: ex,
      entryAt,
      exitAt: ex != null ? new Date().toISOString() : null,
      fees: parseFloat(fees || "0") || 0,
      setup: setup || null,
      notes: notes || null,
      mood,
      rating: rating || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      riskAmount: risk,
      preTradePlan,
      entryReason,
      exitReason,
      mistake,
      lesson,
      rulesFollowed,
    };
    try {
      if (edit) await updateTrade.mutateAsync({ id: edit.id, ...payload });
      else await createTrade.mutateAsync(payload);
      onClose();
    } catch {
      /* toast handled by mutation */
    }
  };

  const title = closeMode ? `Exit ${edit?.symbol ?? "position"}` : edit ? "Edit trade" : "Log a trade";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-[16px]">{title}</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            {closeMode ? "Record the exit price to close this position." : "Numbers first, reasoning second. Both matter."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Market</Label>
              <select className={selectClass} value={market} disabled={closeMode} onChange={(e) => { const m = e.target.value as MarketKey; setMarket(m); setSymbol(marketOf(m).instruments[0].symbol); }}>
                {MARKET_LIST.map((m) => (
                  <option key={m.key} value={m.key}>{m.label} ({m.currency})</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Instrument</Label>
              <select className={selectClass} value={symbol} disabled={closeMode} onChange={(e) => setSymbol(e.target.value)}>
                {instruments.map((i) => (
                  <option key={i.symbol} value={i.symbol}>{i.symbol} — {i.name}</option>
                ))}
              </select>
            </div>
          </div>

          {live != null && (
            <button
              type="button"
              onClick={() => (closeMode ? setExitPrice(formatPrice(live, dec).replace(/,/g, "")) : setEntryPrice(formatPrice(live, dec).replace(/,/g, "")))}
              className="flex min-h-11 w-full items-center justify-between rounded-md border border-up/30 bg-up-soft/60 px-3.5 text-left transition-all hover:bg-up-soft active:scale-[0.995] cursor-pointer"
            >
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-up">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" /> Live {symbol}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[13px] font-semibold tabular text-up">
                {formatPrice(live, dec)}
                <Zap className="h-3 w-3" />
              </span>
            </button>
          )}

          {!closeMode && (
            <div className="grid grid-cols-2 gap-2">
              {(["long", "short"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={cn(
                    "min-h-11 rounded-md border text-[13.5px] font-semibold capitalize transition-all cursor-pointer active:scale-[0.98]",
                    side === s
                      ? s === "long"
                        ? "border-up/40 bg-up-soft text-up"
                        : "border-down/40 bg-down-soft text-down"
                      : "border-border text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {s === "long" ? "Long / Buy" : "Short / Sell"}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Quantity</Label>
              <Input inputMode="decimal" placeholder="0.00" value={quantity} disabled={closeMode} onChange={(e) => setQuantity(e.target.value)} className="tabular" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">{closeMode ? "Entry" : "Entry price"}</Label>
              <Input inputMode="decimal" placeholder="0.00" value={entryPrice} disabled={closeMode} onChange={(e) => setEntryPrice(e.target.value)} className="tabular" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Exit price</Label>
              <Input inputMode="decimal" placeholder="empty = stays open" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className="tabular" />
            </div>
          </div>

          {estPnl != null && (
            <div className={cn("rounded-md px-3.5 py-2.5 text-[13px] font-semibold tabular", estPnl >= 0 ? "bg-up-soft text-up" : "bg-down-soft text-down")}>
              Estimated P&L: {estPnl >= 0 ? "+" : "−"}{marketOf(market).currencySymbol}{Math.abs(estPnl).toFixed(2)}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Entry date</Label>
              <Input type="date" value={entryAt} disabled={closeMode} onChange={(e) => setEntryAt(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Setup</Label>
              <select className={selectClass} value={setup} onChange={(e) => setSetup(e.target.value)}>
                <option value="">— choose —</option>
                {SETUPS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Planned risk</Label>
              <Input inputMode="decimal" placeholder="0.00" value={riskAmount} onChange={(e) => setRiskAmount(e.target.value)} className="tabular" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Headspace</Label>
              <div className="flex gap-1.5">
                {Object.entries(MOOD_ICONS).map(([k, m]) => (
                  <button
                    key={k}
                    type="button"
                    title={m.label}
                    onClick={() => setMood(mood === k ? null : k)}
                    className={cn(
                      "flex min-h-11 flex-1 items-center justify-center rounded-md border transition-all cursor-pointer active:scale-95",
                      mood === k ? "border-foreground/40 bg-muted" : "border-border hover:bg-muted/60",
                    )}
                  >
                    <m.icon className={cn("h-[18px] w-[18px]", mood === k ? m.color : "text-muted-foreground/50")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Self grade</Label>
              <div className="flex min-h-11 items-center gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-label={`Rate ${r} out of 5`}
                    onClick={() => setRating(rating === r ? 0 : r)}
                    className="flex h-10 w-10 items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star className={cn("h-[19px] w-[19px]", r <= rating ? "fill-primary text-primary" : "text-muted-foreground/40")} />
                  </button>
                ))}
                <span className="ml-1 text-[11.5px] text-muted-foreground">{rating ? `${rating}/5` : "rate the execution"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Trade review</div>
                <div className="text-[11px] text-muted-foreground">Capture the reasoning, not just the numbers.</div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[12px] font-medium text-muted-foreground">Pre-trade plan</Label>
                <Textarea rows={3} value={preTradePlan} onChange={(e) => setPreTradePlan(e.target.value)} placeholder="What must happen before you enter? Where is the invalidation?" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[12px] font-medium text-muted-foreground">Entry reason</Label>
                <Textarea rows={3} value={entryReason} onChange={(e) => setEntryReason(e.target.value)} placeholder="Why did this setup deserve your risk?" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[12px] font-medium text-muted-foreground">Exit reason</Label>
                <Textarea rows={3} value={exitReason} onChange={(e) => setExitReason(e.target.value)} placeholder="Target, stop, thesis change, or impulse?" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[12px] font-medium text-muted-foreground">Mistake</Label>
                <Textarea rows={3} value={mistake} onChange={(e) => setMistake(e.target.value)} placeholder="What would you do differently? Blank if none." />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[12px] font-medium text-muted-foreground">Lesson</Label>
                <Textarea rows={3} value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="One sentence future-you should remember." />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[12px] font-medium text-muted-foreground">Rules followed</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([[true, "Yes"], [false, "No"], [null, "Not sure"]] as const).map(([v, l]) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setRulesFollowed(v as boolean | null)}
                      className={cn(
                        "min-h-11 rounded-md border text-[12px] font-semibold transition-colors cursor-pointer",
                        rulesFollowed === v ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Tags</Label>
            <Input placeholder="swing, breakout, fx…" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Notes</Label>
            <Textarea rows={4} placeholder="What did you see? Keep raw observations here." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && (
            <p className="text-[12.5px] text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : closeMode ? "Close position" : edit ? "Save changes" : "Log trade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { isClosedTrade };
function isClosedTrade(t: Trade) {
  return t.status === "closed" && t.exitPrice != null;
}
