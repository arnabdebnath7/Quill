"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Plus, Star, X } from "lucide-react";
import { useAddWatch, useQuotes, useRemoveWatch, useWatchlist } from "@/lib/hooks";
import { MARKET_LIST, decimalsFor, marketOf, type MarketKey } from "@/lib/markets";
import { cn, formatPrice } from "@/lib/utils";
import { Button, Dialog, EmptyState, Field, Select, Skeleton } from "@/components/ui";
import { Sparkline } from "@/components/charts";
import type { WatchlistItem } from "@/db/schema";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function WatchlistPage() {
  const { data: items, isLoading } = useWatchlist();
  const addWatch = useAddWatch();
  const removeWatch = useRemoveWatch();
  const [addOpen, setAddOpen] = useState(false);
  const [market, setMarket] = useState<MarketKey>("crypto");
  const [symbol, setSymbol] = useState("BTCUSD");

  const pairs = useMemo(() => (items ?? []).map((i) => ({ market: i.market, symbol: i.symbol })), [items]);
  const { data: quotes } = useQuotes(pairs, 12_000);

  // Grow a tiny intraday history per symbol as quotes stream in.
  const history = useRef<Map<string, number[]>>(new Map());
  if (quotes) {
    Object.entries(quotes).forEach(([key, q]) => {
      const arr = history.current.get(key) ?? [];
      if (arr.length === 0 || arr[arr.length - 1] !== q.price) {
        arr.push(q.price);
        if (arr.length > 30) arr.shift();
        history.current.set(key, arr);
      }
    });
  }

  const submitAdd = async () => {
    const inst = marketOf(market).instruments.find((i) => i.symbol === symbol);
    if (!inst) return;
    try {
      await addWatch.mutateAsync({ symbol: inst.symbol, name: inst.name, market });
      setAddOpen(false);
    } catch {
      /* hook toasts */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[27px] font-semibold tracking-[-0.02em]">Watchlist</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-sub">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" /> Streaming quotes every 12 seconds
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add symbol</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)}</div>
      ) : (items ?? []).length === 0 ? (
        <EmptyState
          icon={<Star className="h-5 w-5" />}
          title="Nothing on your radar"
          body="Pin the markets you care about — gold at 4am, NSE at the open, BTC whenever it decides to move."
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add your first symbol</Button>}
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {(items ?? []).map((item) => (
              <WatchRow
                key={item.id}
                item={item}
                price={quotes?.[`${item.market}:${item.symbol}`]?.price}
                changePct={quotes?.[`${item.market}:${item.symbol}`]?.changePct}
                points={history.current.get(`${item.market}:${item.symbol}`) ?? []}
                onRemove={() => removeWatch.mutate(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add to watchlist">
        <div className="grid gap-4">
          <Field label="Market">
            <Select
              value={market}
              onChange={(e) => {
                const m = e.target.value as MarketKey;
                setMarket(m);
                setSymbol(marketOf(m).instruments[0].symbol);
              }}
            >
              {MARKET_LIST.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </Select>
          </Field>
          <Field label="Instrument">
            <Select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {marketOf(market).instruments.map((i) => (
                <option key={i.symbol} value={i.symbol}>{i.symbol} — {i.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} loading={addWatch.isPending}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function WatchRow({
  item,
  price,
  changePct,
  points,
  onRemove,
}: {
  item: WatchlistItem;
  price?: number;
  changePct?: number;
  points: number[];
  onRemove: () => void;
}) {
  const dec = decimalsFor(item.symbol, item.market);
  const up = (changePct ?? 0) >= 0;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="group relative rounded-2xl border border-line bg-card p-4"
    >
      <button
        onClick={onRemove}
        title="Remove"
        className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-md text-faint opacity-0 transition-all hover:bg-down-soft hover:text-down group-hover:opacity-100 cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-2">
        <span className="font-display text-[14.5px] font-semibold">{item.symbol}</span>
        <span className="rounded-full bg-line/50 px-1.5 py-px text-[10px] font-medium text-sub">{marketOf(item.market).short}</span>
      </div>
      <div className="mt-0.5 truncate text-[11.5px] text-faint">{item.name}</div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-mono text-[19px] font-semibold tabular tracking-[-0.01em]">
            {price != null ? formatPrice(price, dec) : "—"}
          </div>
          <div className={cn("mt-0.5 flex items-center gap-0.5 text-[11.5px] font-medium tabular", up ? "text-up" : "text-down")}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(changePct ?? 0).toFixed(2)}% today
          </div>
        </div>
        {points.length > 1 ? <Sparkline points={points} width={84} height={30} up={up} /> : <div className="h-[30px] w-[84px] rounded-md bg-line/30" />}
      </div>
    </motion.div>
  );
}
