"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Plus, Star, X } from "lucide-react";
import { useAddWatch, useQuotes, useRemoveWatch, useWatchlist } from "@/lib/hooks";
import { MARKET_LIST, decimalsFor, marketOf, type MarketKey } from "@/lib/markets";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, LiveDot } from "@/components/primitives";
import { rowIn, staggerContainer } from "@/lib/motion";
import { Sparkline } from "@/components/charts";
import type { WatchlistItem } from "@/db/schema";

const selectClass =
  "h-10 w-full appearance-none rounded-md border border-input bg-card px-3 pr-8 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/20 cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat";

export default function WatchlistPage() {
  const { data: items, isLoading } = useWatchlist();
  const addWatch = useAddWatch();
  const removeWatch = useRemoveWatch();
  const [addOpen, setAddOpen] = useState(false);
  const [market, setMarket] = useState<MarketKey>("crypto");
  const [symbol, setSymbol] = useState("BTCUSD");

  const pairs = useMemo(() => (items ?? []).map((i) => ({ market: i.market, symbol: i.symbol })), [items]);
  const { data: quotes } = useQuotes(pairs, 12_000);

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
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground"><LiveDot /> Streaming quotes every 12 seconds</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add symbol</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}</div>
      ) : (items ?? []).length === 0 ? (
        <EmptyState
          icon={<Star className="h-5 w-5" />}
          title="Nothing on your radar"
          body="Pin the markets you care about — gold at 4am, NSE at the open, BTC whenever it decides to move."
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add your first symbol</Button>}
        />
      ) : (
        <motion.div variants={staggerContainer(0.04)} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        </motion.div>
      )}

      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to watchlist</DialogTitle>
            <DialogDescription>Pick a market and instrument — you can remove it any time.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Market</Label>
              <select
                className={selectClass}
                value={market}
                onChange={(e) => {
                  const m = e.target.value as MarketKey;
                  setMarket(m);
                  setSymbol(marketOf(m).instruments[0].symbol);
                }}
              >
                {MARKET_LIST.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Instrument</Label>
              <select className={selectClass} value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                {marketOf(market).instruments.map((i) => (
                  <option key={i.symbol} value={i.symbol}>{i.symbol} — {i.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={addWatch.isPending}>
              <Plus className="h-4 w-4" /> {addWatch.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
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
      variants={rowIn}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      className="group relative quill-card rounded-xl border border-border bg-card p-4"
    >
      <motion.button
        whileTap={{ scale: 0.92, rotate: -8 }}
        onClick={onRemove}
        title="Remove"
        aria-label={`Remove ${item.symbol} from watchlist`}
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-down-soft hover:text-down cursor-pointer sm:opacity-0 sm:group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </motion.button>
      <div className="flex items-center gap-2">
        <span className="font-display text-[14.5px] font-semibold">{item.symbol}</span>
        <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">{marketOf(item.market).short}</span>
      </div>
      <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{item.name}</div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-mono text-[19px] font-semibold tabular tracking-[-0.01em]">{price != null ? formatPrice(price, dec) : "—"}</div>
          <div className={cn("mt-0.5 flex items-center gap-0.5 text-[11.5px] font-medium tabular", up ? "text-up" : "text-down")}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(changePct ?? 0).toFixed(2)}% today
          </div>
        </div>
        {points.length > 1 ? (
          <Sparkline points={points} width={84} height={30} up={up} />
        ) : (
          <div className="h-[30px] w-[84px] animate-pulse rounded-md bg-muted" />
        )}
      </div>
    </motion.div>
  );
}
