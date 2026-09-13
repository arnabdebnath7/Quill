"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { CircleStop, CandlestickChart, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { useDeleteTrade, useQuotes, useTrades, type QuotesMap } from "@/lib/hooks";
import { MARKET_LIST, decimalsFor, marketOf } from "@/lib/markets";
import { cn, formatMoney, formatPrice, num, tradePnl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, SideBadge, useFlash } from "@/components/primitives";
import { TradeForm } from "@/components/trade-form";
import { EASE, rowIn, staggerContainer } from "@/lib/motion";
import type { Trade } from "@/db/schema";

function TradesInner() {
  const params = useSearchParams();
  const [market, setMarket] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [closing, setClosing] = useState<Trade | null>(null);
  const [deleting, setDeleting] = useState<Trade | null>(null);

  useEffect(() => {
    if (params.get("new") === "1") setFormOpen(true);
    const s = params.get("status");
    if (s === "open" || s === "closed") setStatus(s);
  }, [params]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: trades, isLoading } = useTrades({ market, status, q: debouncedQ });
  const deleteTrade = useDeleteTrade();

  const openSymbols = useMemo(
    () => (trades ?? []).filter((t) => t.status === "open").map((t) => ({ market: t.market, symbol: t.symbol })),
    [trades],
  );
  const { data: quotes } = useQuotes(openSymbols);

  const totals = useMemo(() => {
    const list = trades ?? [];
    let realized = 0;
    list.forEach((t) => {
      if (t.status === "closed") {
        const p = tradePnl(t) ?? 0;
        realized += t.market === "india" ? p / 88.3 : p;
      }
    });
    return { count: list.length, realized };
  }, [trades]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[27px] font-semibold tracking-[-0.02em]">Trade log</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {totals.count} {totals.count === 1 ? "trade" : "trades"} shown · net{" "}
            <span className={cn("font-semibold tabular", totals.realized >= 0 ? "text-up" : "text-down")}>{formatMoney(totals.realized, "USD", { sign: true })}</span> realized
            (USD-normalized)
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Log trade</Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search symbol, setup, notes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 lg:ml-auto lg:flex-1 lg:justify-end lg:overflow-visible">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto lg:order-2 lg:overflow-visible">
            <FilterPill active={market === "all"} onClick={() => setMarket("all")}>All</FilterPill>
            {MARKET_LIST.map((m) => (
              <FilterPill key={m.key} active={market === m.key} onClick={() => setMarket(m.key)}>{m.label}</FilterPill>
            ))}
          </div>
          <div className="shrink-0 lg:order-1">
            <Tabs value={status} onValueChange={setStatus}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>
      ) : (trades ?? []).length === 0 ? (
        <EmptyState
          icon={<CandlestickChart className="h-5 w-5" />}
          title="No trades match"
          body={debouncedQ || market !== "all" || status !== "all" ? "Loosen the filters, or log what you're actually trading." : "Every trade you write down is a lesson your future self doesn't have to re-learn."}
          action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Log your first trade</Button>}
        />
      ) : (
        <motion.div variants={staggerContainer(0.04)} initial="initial" animate="animate" className="space-y-2.5">
          <AnimatePresence initial={false}>
            {(trades ?? []).map((t) => (
              <TradeRow
                key={t.id}
                trade={t}
                quotes={quotes}
                onEdit={() => { setEditing(t); setClosing(null); setFormOpen(true); }}
                onClose={() => { setClosing(t); setEditing(t); setFormOpen(true); }}
                onDelete={() => setDeleting(t)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <TradeForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); setClosing(null); }}
        edit={editing}
        closeMode={closing != null}
      />

      <Dialog open={deleting != null} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this trade?</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{deleting?.symbol}</span> will be permanently removed from your log. The lesson stays with you either way.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button
              variant="destructive"
              disabled={deleteTrade.isPending}
              onClick={async () => {
                if (!deleting) return;
                await deleteTrade.mutateAsync(deleting.id).catch(() => {});
                setDeleting(null);
              }}
            >
              <Trash2 className="h-4 w-4" /> {deleteTrade.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "min-h-9 shrink-0 rounded-full border px-3.5 text-[12px] font-medium transition-colors cursor-pointer",
        active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
    </motion.button>
  );
}

function TradeRow({
  trade: t,
  quotes,
  onEdit,
  onClose,
  onDelete,
}: {
  trade: Trade;
  quotes?: QuotesMap;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const isOpen = t.status === "open";
  const q = quotes?.[`${t.market}:${t.symbol}`];
  const pnl = isOpen ? tradePnl(t, q?.price) : tradePnl(t);
  const cur = marketOf(t.market).currency;
  const pos = (pnl ?? 0) >= 0;
  const dec = decimalsFor(t.symbol, t.market);
  const flash = useFlash(pnl ?? undefined);

  return (
    <motion.div
      layout
      variants={rowIn}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 quill-card sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <SideBadge side={t.side} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[15px] font-semibold">{t.symbol}</span>
            <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">{marketOf(t.market).short}</span>
            {isOpen ? (
              <span className="flex items-center gap-1 rounded-full bg-primary-soft px-1.5 py-px text-[10px] font-medium text-primary">
                <span className="pulse-dot h-1 w-1 rounded-full bg-primary" /> open
              </span>
            ) : (
              <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">closed</span>
            )}
            {(t.rating ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-primary">
                <Star className="h-3 w-3 fill-primary" /> {t.rating}
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-[11.5px] text-muted-foreground">
            {num(t.quantity)} @ {formatPrice(num(t.entryPrice), dec)}
            {t.exitPrice != null && <> → {formatPrice(num(t.exitPrice), dec)}</>}
            {" · "}
            {t.setup ?? "No setup"} · {format(new Date(t.entryAt), "MMM d, yyyy")}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-right">
          <div className={cn("font-mono text-[14.5px] font-semibold tabular", pnl == null ? "text-muted-foreground" : pos ? "text-up" : "text-down", flash === "up" && "flash-up", flash === "down" && "flash-down")}>
            {pnl == null ? "—" : formatMoney(pnl, cur, { sign: true })}
            {isOpen && pnl != null && <span className="ml-1 text-[9.5px] font-normal text-muted-foreground">live</span>}
          </div>
          {isOpen && q && <div className="text-[10.5px] text-muted-foreground tabular">now {formatPrice(q.price, dec)}</div>}
        </div>
        <div className="flex items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {isOpen && <ActionButton label="Exit position" onClick={onClose} brand><CircleStop className="h-4 w-4" /></ActionButton>}
          <ActionButton label="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></ActionButton>
          <ActionButton label="Delete" onClick={onDelete} danger><Trash2 className="h-4 w-4" /></ActionButton>
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ label, onClick, children, brand, danger }: { label: string; onClick: () => void; children: React.ReactNode; brand?: boolean; danger?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors cursor-pointer",
        brand ? "text-primary hover:bg-primary-soft" : danger ? "text-muted-foreground hover:bg-down-soft hover:text-down" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </motion.button>
  );
}

export default function TradesPage() {
  return (
    <Suspense fallback={<div className="space-y-2.5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>}>
      <TradesInner />
    </Suspense>
  );
}
