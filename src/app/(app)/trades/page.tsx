"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CandlestickChart,
  CircleStop,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useDeleteTrade, useQuotes, useTrades } from "@/lib/hooks";
import { MARKET_LIST, decimalsFor, marketOf } from "@/lib/markets";
import { cn, formatMoney, formatPrice, num, tradePnl } from "@/lib/utils";
import { Button, Dialog, EmptyState, Input, Segmented, Skeleton } from "@/components/ui";
import { TradeForm } from "@/components/trade-form";
import type { Trade } from "@/db/schema";

const EASE = [0.22, 1, 0.36, 1] as const;

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
    [trades]
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
          <p className="mt-1 text-[13px] text-sub">
            {totals.count} {totals.count === 1 ? "trade" : "trades"} shown · net{" "}
            <span className={cn("font-semibold tabular", totals.realized >= 0 ? "text-up" : "text-down")}>
              {formatMoney(totals.realized, "USD", { sign: true })}
            </span>{" "}
            realized (USD-normalized)
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Log trade
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input className="pl-10" placeholder="Search symbol, setup, notes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMarket("all")}
            className={cn(
              "h-8 rounded-full border px-3 text-[12px] font-medium transition-all cursor-pointer",
              market === "all" ? "border-brandsolid bg-brandsolid text-brandon" : "border-line text-sub hover:bg-line/40"
            )}
          >
            All markets
          </button>
          {MARKET_LIST.map((m) => (
            <button
              key={m.key}
              onClick={() => setMarket(m.key)}
              className={cn(
                "h-8 rounded-full border px-3 text-[12px] font-medium transition-all cursor-pointer",
                market === m.key ? "border-brandsolid bg-brandsolid text-brandon" : "border-line text-sub hover:bg-line/40"
              )}
            >
              {m.label}
            </button>
          ))}
          <div className="ml-auto">
            <Segmented
              size="sm"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "closed", label: "Closed" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2.5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[68px]" />)}</div>
      ) : (trades ?? []).length === 0 ? (
        <EmptyState
          icon={<CandlestickChart className="h-5 w-5" />}
          title="No trades match"
          body={debouncedQ || market !== "all" || status !== "all" ? "Loosen the filters, or log what you're actually trading." : "Every trade you write down is a lesson your future self doesn't have to re-learn."}
          action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Log your first trade</Button>}
        />
      ) : (
        <div className="space-y-2.5">
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
        </div>
      )}

      <TradeForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); setClosing(null); }}
        edit={editing}
        closeMode={closing != null}
      />

      {/* Delete confirm */}
      <Dialog open={deleting != null} onClose={() => setDeleting(null)} title="Remove this trade?">
        <p className="text-[13.5px] leading-relaxed text-sub">
          <span className="font-semibold text-ink">{deleting?.symbol}</span> will be permanently removed from your log. The lesson stays with you either way.
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Keep it</Button>
          <Button
            variant="danger"
            loading={deleteTrade.isPending}
            onClick={async () => {
              if (!deleting) return;
              await deleteTrade.mutateAsync(deleting.id).catch(() => {});
              setDeleting(null);
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </Dialog>
    </div>
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
  quotes?: import("@/lib/hooks").QuotesMap;
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", t.side === "long" ? "bg-up-soft text-up" : "bg-down-soft text-down")}>
          {t.side === "long" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[15px] font-semibold">{t.symbol}</span>
            <span className="rounded-full bg-line/50 px-1.5 py-px text-[10px] font-medium text-sub">{marketOf(t.market).short}</span>
            {isOpen ? (
              <span className="flex items-center gap-1 rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-medium text-brand">
                <span className="pulse-dot h-1 w-1 rounded-full bg-brand" /> open
              </span>
            ) : (
              <span className="rounded-full bg-line/40 px-1.5 py-px text-[10px] font-medium text-faint">closed</span>
            )}
            {(t.rating ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-brand">
                <Star className="h-3 w-3 fill-brand" /> {t.rating}
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-[11.5px] text-faint">
            {num(t.quantity)} @ {formatPrice(num(t.entryPrice), dec)}
            {t.exitPrice != null && <> → {formatPrice(num(t.exitPrice), dec)}</>}
            {" · "}{t.setup ?? "No setup"} · {format(new Date(t.entryAt), "MMM d, yyyy")}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-right">
          <div className={cn("font-mono text-[14.5px] font-semibold tabular", pnl == null ? "text-faint" : pos ? "text-up" : "text-down")}>
            {pnl == null ? "—" : formatMoney(pnl, cur, { sign: true })}
            {isOpen && pnl != null && <span className="ml-1 text-[9.5px] font-normal text-faint">live</span>}
          </div>
          {isOpen && q && (
            <div className="text-[10.5px] text-faint tabular">now {formatPrice(q.price, dec)}</div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {isOpen && (
            <button onClick={onClose} title="Exit position" className="flex h-8 w-8 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand-soft cursor-pointer">
              <CircleStop className="h-4 w-4" />
            </button>
          )}
          <button onClick={onEdit} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-line/60 hover:text-ink cursor-pointer">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-down-soft hover:text-down cursor-pointer">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function TradesPage() {
  return (
    <Suspense fallback={<div className="space-y-2.5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[68px]" />)}</div>}>
      <TradesInner />
    </Suspense>
  );
}
