"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudRain, Frown, Laugh, Meh, Smile, Star, Zap } from "lucide-react";
import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { MARKET_LIST, SETUPS, decimalsFor, findInstrument, marketOf, type MarketKey } from "@/lib/markets";
import { cn, formatPrice, num } from "@/lib/utils";
import { useCreateTrade, useUpdateTrade } from "@/lib/hooks";
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
  edit?: Trade | null; // edit an existing trade
  closeMode?: boolean; // "exit position" flow
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
  const [rating, setRating] = useState<number>(0);
  const [tags, setTags] = useState("");
  const [live, setLive] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // hydrate when editing
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
    }
  }, [open, edit]);

  // live price for chosen instrument
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
  const isClosedEntry = exitPrice.trim() !== "" || closeMode;
  const pending = createTrade.isPending || updateTrade.isPending;

  const estPnl = useMemo(() => {
    const q = parseFloat(quantity);
    const en = parseFloat(entryPrice);
    const ex = parseFloat(exitPrice);
    if (![q, en, ex].every((n) => Number.isFinite(n))) return null;
    const dir = side === "short" ? -1 : 1;
    return (ex - en) * q * dir - num(fees || "0");
  }, [quantity, entryPrice, exitPrice, side, fees]);

  const submit = async () => {
    setError(null);
    const q = parseFloat(quantity);
    const en = parseFloat(entryPrice);
    const ex = exitPrice.trim() === "" ? null : parseFloat(exitPrice);
    if (!symbol) return setError("Pick an instrument.");
    if (!Number.isFinite(q) || q <= 0) return setError("Quantity must be a positive number.");
    if (!Number.isFinite(en) || en <= 0) return setError("Entry price must be a positive number.");
    if (exitPrice.trim() !== "" && (!Number.isFinite(ex!) || ex! <= 0)) return setError("Exit price must be a positive number.");

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
    };

    try {
      if (edit) {
        await updateTrade.mutateAsync({ id: edit.id, ...payload });
      } else {
        await createTrade.mutateAsync(payload);
      }
      onClose();
    } catch {
      /* toast handled in hook */
    }
  };

  const title = closeMode ? `Exit ${edit?.symbol ?? "position"}` : edit ? "Edit trade" : "Log a trade";

  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      <div className="grid gap-4">
        {/* Market + instrument */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Market">
            <Select
              value={market}
              disabled={closeMode}
              onChange={(e) => {
                const m = e.target.value as MarketKey;
                setMarket(m);
                setSymbol(marketOf(m).instruments[0].symbol);
              }}
            >
              {MARKET_LIST.map((m) => (
                <option key={m.key} value={m.key}>{m.label} ({m.currency})</option>
              ))}
            </Select>
          </Field>
          <Field label="Instrument">
            <Select value={symbol} disabled={closeMode} onChange={(e) => setSymbol(e.target.value)}>
              {instruments.map((i) => (
                <option key={i.symbol} value={i.symbol}>{i.symbol} — {i.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        {/* live price chip */}
        {live != null && (
          <button
            type="button"
            onClick={() => (closeMode ? setExitPrice(formatPrice(live, dec).replace(/,/g, "")) : setEntryPrice(formatPrice(live, dec).replace(/,/g, "")))}
            className="flex items-center justify-between rounded-xl border border-line bg-up-soft/60 px-3.5 py-2.5 text-left transition-colors hover:bg-up-soft cursor-pointer"
          >
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-up">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" /> Live {symbol}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[13px] font-semibold tabular text-up">
              {formatPrice(live, dec)}
              <Zap className="h-3 w-3" />
            </span>
            <span className="sr-only">Use as {closeMode ? "exit" : "entry"} price</span>
          </button>
        )}

        {/* side */}
        {!closeMode && (
          <div className="grid grid-cols-2 gap-2">
            {(["long", "short"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={cn(
                  "h-10 rounded-xl border text-[13.5px] font-semibold capitalize transition-all cursor-pointer active:scale-[0.98]",
                  side === s
                    ? s === "long"
                      ? "border-up/40 bg-up-soft text-up"
                      : "border-down/40 bg-down-soft text-down"
                    : "border-line text-sub hover:bg-line/40"
                )}
              >
                {s === "long" ? "Long / Buy" : "Short / Sell"}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Quantity">
            <Input inputMode="decimal" placeholder="0.00" value={quantity} disabled={closeMode} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label={closeMode ? "Entry" : "Entry price"} hint={inst ? marketOf(market).currency : undefined}>
            <Input inputMode="decimal" placeholder="0.00" value={entryPrice} disabled={closeMode} onChange={(e) => setEntryPrice(e.target.value)} />
          </Field>
          <Field label="Exit price" hint="empty = stays open">
            <Input inputMode="decimal" placeholder="0.00" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
          </Field>
        </div>

        {estPnl != null && (
          <div className={cn("rounded-xl px-3.5 py-2.5 text-[13px] font-semibold tabular", estPnl >= 0 ? "bg-up-soft text-up" : "bg-down-soft text-down")}>
            Estimated P&L: {estPnl >= 0 ? "+" : "\u2212"}{marketOf(market).currencySymbol}{Math.abs(estPnl).toFixed(2)}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Entry date">
            <Input type="date" value={entryAt} disabled={closeMode} onChange={(e) => setEntryAt(e.target.value)} />
          </Field>
          <Field label="Setup">
            <Select value={setup} onChange={(e) => setSetup(e.target.value)}>
              <option value="">— choose —</option>
              {SETUPS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Fees">
            <Input inputMode="decimal" placeholder="0.00" value={fees} onChange={(e) => setFees(e.target.value)} />
          </Field>
        </div>

        {/* mood + rating */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headspace">
            <div className="flex gap-1.5">
              {Object.entries(MOOD_ICONS).map(([k, m]) => (
                <button
                  key={k}
                  type="button"
                  title={m.label}
                  onClick={() => setMood(mood === k ? null : k)}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-95",
                    mood === k ? "border-linestrong bg-line/60" : "border-line hover:bg-line/40"
                  )}
                >
                  <m.icon className={cn("h-[18px] w-[18px]", mood === k ? m.color : "text-faint")} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Self grade">
            <div className="flex h-10 items-center gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} type="button" onClick={() => setRating(rating === r ? 0 : r)} className="cursor-pointer transition-transform hover:scale-110 active:scale-95">
                  <Star className={cn("h-[19px] w-[19px]", r <= rating ? "fill-brand text-brand" : "text-line-strong", )} />
                </button>
              ))}
              <span className="ml-2 text-[11.5px] text-faint">{rating ? `${rating}/5` : "rate the execution"}</span>
            </div>
          </Field>
        </div>

        <Field label="Tags" hint="comma separated — swing, fx, revenge-trade…">
          <Input placeholder="swing, breakout" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>

        <Field label="Notes">
          <Textarea
            rows={4}
            placeholder="What did you see? What was the plan? What will future-you thank present-you for writing down?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        {error && <p className="text-[12.5px] text-down">{error}</p>}

        <div className="flex justify-end gap-2.5 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>
            {closeMode ? "Close position" : edit ? "Save changes" : "Log trade"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export { isClosedTrade };
function isClosedTrade(t: Trade) {
  return t.status === "closed" && t.exitPrice != null;
}
