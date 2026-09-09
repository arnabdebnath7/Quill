"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DailyCheckin, JournalEntry, Trade, WatchlistItem } from "@/db/schema";
import type { Quote } from "@/app/api/market/quotes/route";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}

/* ---------------- Trades ---------------- */
export function useTrades(filters?: { market?: string; status?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.market && filters.market !== "all") params.set("market", filters.market);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();
  return useQuery({ queryKey: ["trades", filters?.market ?? "all", filters?.status ?? "all", filters?.q ?? ""], queryFn: () => api<{ trades: Trade[] }>(`/api/trades${qs ? `?${qs}` : ""}`).then((r) => r.trades) });
}
function invalidateTrades(qc: ReturnType<typeof useQueryClient>) { qc.invalidateQueries({ queryKey: ["trades"] }); }
export function useCreateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api<{ trade: Trade }>("/api/trades", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.trade),
    onMutate: async (payload) => { await qc.cancelQueries({ queryKey: ["trades"] }); const snapshots = qc.getQueriesData<Trade[]>({ queryKey: ["trades"] }); const optimistic = { id: `optimistic-${Date.now()}`, userId: "", createdAt: new Date(), updatedAt: new Date(), tags: [], fees: "0", rating: null, mood: null, notes: null, setup: null, stopLoss: null, target: null, name: null, exitAt: null, ...payload, quantity: String(payload.quantity), entryPrice: String(payload.entryPrice), exitPrice: payload.exitPrice != null ? String(payload.exitPrice) : null, entryAt: payload.entryAt ? new Date(String(payload.entryAt)) : new Date(), status: payload.exitPrice != null ? "closed" : "open" } as unknown as Trade; snapshots.forEach(([key, data]) => { if (data) qc.setQueryData(key, [optimistic, ...data]); }); return { snapshots }; },
    onError: (e, _v, ctx) => { ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)); toast.error(e.message); }, onSuccess: () => toast.success("Trade logged"), onSettled: () => invalidateTrades(qc),
  });
}
export function useUpdateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Record<string, unknown>) => api<{ trade: Trade }>(`/api/trades/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((r) => r.trade),
    onMutate: async ({ id, ...payload }) => { await qc.cancelQueries({ queryKey: ["trades"] }); const snapshots = qc.getQueriesData<Trade[]>({ queryKey: ["trades"] }); snapshots.forEach(([key, data]) => { if (!data) return; qc.setQueryData(key, data.map((t) => t.id === id ? ({ ...t, ...payload, quantity: payload.quantity != null ? String(payload.quantity) : t.quantity, entryPrice: payload.entryPrice != null ? String(payload.entryPrice) : t.entryPrice, exitPrice: payload.exitPrice === undefined ? t.exitPrice : payload.exitPrice == null ? null : String(payload.exitPrice), status: payload.exitPrice === undefined ? payload.exitAt !== undefined ? t.status : t.exitPrice != null ? "closed" : "open" : payload.exitPrice != null ? "closed" : "open" } as Trade) : t)); }); return { snapshots }; },
    onError: (e, _v, ctx) => { ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)); toast.error(e.message); }, onSuccess: () => toast.success("Trade updated"), onSettled: () => invalidateTrades(qc),
  });
}
export function useDeleteTrade() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => api<{ ok: true }>(`/api/trades/${id}`, { method: "DELETE" }), onMutate: async (id) => { await qc.cancelQueries({ queryKey: ["trades"] }); const snapshots = qc.getQueriesData<Trade[]>({ queryKey: ["trades"] }); snapshots.forEach(([key, data]) => { if (data) qc.setQueryData(key, data.filter((t) => t.id !== id)); }); return { snapshots }; }, onError: (e, _v, ctx) => { ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)); toast.error(e.message); }, onSuccess: () => toast.success("Trade removed"), onSettled: () => invalidateTrades(qc) }); }

/* ---------------- Journal ---------------- */
export function useJournal(filters?: { q?: string; mood?: string }) { const params = new URLSearchParams(); if (filters?.q) params.set("q", filters.q); if (filters?.mood && filters.mood !== "all") params.set("mood", filters.mood); const qs = params.toString(); return useQuery({ queryKey: ["journal", filters?.q ?? "", filters?.mood ?? "all"], queryFn: () => api<{ entries: JournalEntry[] }>(`/api/journal${qs ? `?${qs}` : ""}`).then((r) => r.entries) }); }
export function useCreateEntry() { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: Record<string, unknown>) => api<{ entry: JournalEntry }>("/api/journal", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.entry), onMutate: async (payload) => { await qc.cancelQueries({ queryKey: ["journal"] }); const snapshots = qc.getQueriesData<JournalEntry[]>({ queryKey: ["journal"] }); const optimistic = { id: `optimistic-${Date.now()}`, userId: "", createdAt: new Date(), updatedAt: new Date(), tags: [], pinned: false, mood: null, content: "", ...payload } as unknown as JournalEntry; snapshots.forEach(([key, data]) => { if (data) qc.setQueryData(key, [optimistic, ...data]); }); return { snapshots }; }, onError: (e, _v, ctx) => { ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)); toast.error(e.message); }, onSuccess: () => toast.success("Entry saved"), onSettled: () => qc.invalidateQueries({ queryKey: ["journal"] }) }); }
export function useUpdateEntry() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...payload }: { id: string } & Record<string, unknown>) => api<{ entry: JournalEntry }>(`/api/journal/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((r) => r.entry), onMutate: async ({ id, ...payload }) => { await qc.cancelQueries({ queryKey: ["journal"] }); const snapshots = qc.getQueriesData<JournalEntry[]>({ queryKey: ["journal"] }); snapshots.forEach(([key, data]) => { if (data) qc.setQueryData(key, data.map((e) => e.id === id ? ({ ...e, ...payload } as JournalEntry) : e)); }); return { snapshots }; }, onError: (e, _v, ctx) => { ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)); toast.error(e.message); }, onSettled: () => qc.invalidateQueries({ queryKey: ["journal"] }) }); }
export function useDeleteEntry() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => api<{ ok: true }>(`/api/journal/${id}`, { method: "DELETE" }), onMutate: async (id) => { await qc.cancelQueries({ queryKey: ["journal"] }); const snapshots = qc.getQueriesData<JournalEntry[]>({ queryKey: ["journal"] }); snapshots.forEach(([key, data]) => { if (data) qc.setQueryData(key, data.filter((e) => e.id !== id)); }); return { snapshots }; }, onError: (e, _v, ctx) => { ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)); toast.error(e.message); }, onSuccess: () => toast.success("Entry deleted"), onSettled: () => qc.invalidateQueries({ queryKey: ["journal"] }) }); }

/* ---------------- Watchlist ---------------- */
export function useWatchlist() { return useQuery({ queryKey: ["watchlist"], queryFn: () => api<{ items: WatchlistItem[] }>("/api/watchlist").then((r) => r.items) }); }
export function useAddWatch() { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: { symbol: string; name: string; market: string }) => api<{ item: WatchlistItem }>("/api/watchlist", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.item), onMutate: async (payload) => { await qc.cancelQueries({ queryKey: ["watchlist"] }); const prev = qc.getQueryData<WatchlistItem[]>(["watchlist"]); const optimistic = { id: `optimistic-${Date.now()}`, userId: "", createdAt: new Date(), ...payload, symbol: payload.symbol.toUpperCase() } as unknown as WatchlistItem; qc.setQueryData(["watchlist"], [...(prev ?? []), optimistic]); return { prev }; }, onError: (e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["watchlist"], ctx.prev); toast.error(e.message); }, onSuccess: () => toast.success("Added to watchlist"), onSettled: () => qc.invalidateQueries({ queryKey: ["watchlist"] }) }); }
export function useRemoveWatch() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => api<{ ok: true }>(`/api/watchlist/${id}`, { method: "DELETE" }), onMutate: async (id) => { await qc.cancelQueries({ queryKey: ["watchlist"] }); const prev = qc.getQueryData<WatchlistItem[]>(["watchlist"]); qc.setQueryData(["watchlist"], (prev ?? []).filter((w) => w.id !== id)); return { prev }; }, onError: (e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["watchlist"], ctx.prev); toast.error(e.message); }, onSuccess: () => toast.success("Removed from watchlist"), onSettled: () => qc.invalidateQueries({ queryKey: ["watchlist"] }) }); }

/* ---------------- Daily life + trading check-in ---------------- */
export type CheckinPayload = {
  date: string;
  mood?: "great" | "good" | "neutral" | "low" | "rough" | null;
  energy?: number | null;
  focus?: number | null;
  sleepHours?: number | null;
  intention: string;
  tradingPlan: string;
  reflection: string;
};
export function useTodayCheckin(date: string) { return useQuery({ queryKey: ["checkin", date], queryFn: () => api<{ checkin: DailyCheckin | null }>(`/api/checkin?date=${encodeURIComponent(date)}`).then((r) => r.checkin), staleTime: 60_000 }); }
export function useCheckinHistory(from: string, to: string) { return useQuery({ queryKey: ["checkin-history", from, to], queryFn: () => api<{ checkins: DailyCheckin[] }>(`/api/checkin?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then((r) => r.checkins), staleTime: 60_000 }); }
export function useSaveCheckin() { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: CheckinPayload) => api<{ checkin: DailyCheckin }>("/api/checkin", { method: "PUT", body: JSON.stringify(payload) }).then((r) => r.checkin), onSuccess: (checkin) => { qc.setQueryData(["checkin", checkin.date], checkin); qc.invalidateQueries({ queryKey: ["checkin-history"] }); toast.success("Today saved"); }, onError: (e) => toast.error(e.message) }); }

/* ---------------- Live quotes (polling) ---------------- */
export type QuotesMap = Record<string, Quote>;
export function useQuotes(pairs: { market: string; symbol: string }[], intervalMs = 15_000) { const key = pairs.map((p) => `${p.market}:${p.symbol}`).join(","); return useQuery({ queryKey: ["quotes", key], queryFn: () => api<{ quotes: QuotesMap }>(`/api/market/quotes?symbols=${encodeURIComponent(key)}`).then((r) => r.quotes), enabled: pairs.length > 0, refetchInterval: intervalMs, refetchIntervalInBackground: false, placeholderData: (prev) => prev }); }
