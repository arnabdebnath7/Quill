"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Download, KeyRound, Monitor, Moon, RefreshCcw, Sun, Trash2 } from "lucide-react";
import { useTheme } from "@/components/providers";
import { avatarHue, cn, initials } from "@/lib/utils";
import { Button, Card, Dialog } from "@/components/ui";
import { toast } from "sonner";
import type { User } from "@/db/schema";

export function SettingsClient({ user }: { user: User }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [confirm, setConfirm] = useState<"reset" | "clear" | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const hue = avatarHue(user.email);

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/account");
      if (!res.ok) throw new Error("Export failed");
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quill-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Couldn’t create the backup. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const runAction = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: confirm === "reset" ? "reset-demo" : "clear-all" }) });
      if (!res.ok) throw new Error("Action failed");
      const action = confirm;
      setConfirm(null);
      toast.success(action === "reset" ? "Demo data restored" : "All data cleared");
      router.refresh();
      window.location.reload();
    } catch {
      setBusy(false);
      toast.error("That action failed. Your data was not changed.");
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div><h1 className="font-display text-[27px] font-semibold tracking-[-0.02em]">Settings</h1><p className="mt-1 text-[13px] text-sub">The boring page that keeps everything else fun.</p></div>
      <Card className="p-5"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl text-[17px] font-semibold text-white" style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${(hue + 40) % 360} 45% 32%))` }}>{initials(user.name)}</div><div className="min-w-0"><div className="font-display text-[17px] font-semibold">{user.name}</div><div className="truncate text-[13px] text-sub">{user.email}</div><div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-faint"><GoogleDot /> Signed in with Google · member since {format(new Date(user.createdAt), "MMMM yyyy")}</div></div></div></Card>
      <Card className="p-5"><div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Appearance</div><div className="grid grid-cols-3 gap-2">{([{ v: "light", label: "Light", icon: Sun },{ v: "dark", label: "Dark", icon: Moon },{ v: "system", label: "System", icon: Monitor }] as const).map((t) => <button type="button" key={t.v} onClick={() => setTheme(t.v)} className={cn("flex h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-[12.5px] font-medium transition-all cursor-pointer active:scale-[0.97]", theme === t.v ? "border-brand/50 bg-brand-soft text-brand" : "border-line text-sub hover:bg-line/40")}><t.icon className="h-[18px] w-[18px]" />{t.label}</button>)}</div></Card>
      <Card className="p-5"><div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Your data</div><div className="grid gap-2.5"><button type="button" onClick={exportData} disabled={exporting} className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-all hover:bg-line/40 active:scale-[0.995] disabled:opacity-60 cursor-pointer"><Download className="h-4 w-4 text-brand" /> <div><div className="text-[13.5px] font-medium">{exporting ? "Preparing backup…" : "Export everything"}</div><div className="text-[11.5px] text-faint">Trades, entries and watchlist as JSON. Your data is yours.</div></div></button><button type="button" onClick={() => setConfirm("reset")} className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-all hover:bg-line/40 active:scale-[0.995] cursor-pointer"><RefreshCcw className="h-4 w-4 text-brand" /><div><div className="text-[13.5px] font-medium">Restore demo data</div><div className="text-[11.5px] text-faint">Wipes your data and brings back the sample journal.</div></div></button><button type="button" onClick={() => setConfirm("clear")} className="flex min-h-11 items-center gap-3 rounded-xl border border-down/30 px-4 py-3 text-left transition-all hover:bg-down-soft active:scale-[0.995] cursor-pointer"><Trash2 className="h-4 w-4 text-down" /><div><div className="text-[13.5px] font-medium text-down">Clear all data</div><div className="text-[11.5px] text-faint">Start completely blank. No undo.</div></div></button></div></Card>
      <Card className="p-5"><div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">About</div><div className="space-y-3 text-[13px] leading-relaxed text-sub"><div className="flex items-start gap-2.5"><KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><p>Sign-in is Google-only by design — Firebase Auth with tokens verified server-side against Google's public keys.</p></div><p className="text-[12px] text-faint">Market data: Yahoo Finance (US, NSE, FX & metals) and CoinGecko (crypto) — delay varies by venue. Quill v1.0, built for people who write things down.</p></div></Card>
      <Dialog open={confirm != null} onClose={() => !busy && setConfirm(null)} title={confirm === "reset" ? "Restore demo data?" : "Clear everything?"}><p className="text-[13.5px] leading-relaxed text-sub">{confirm === "reset" ? "Your trades, entries and watchlist will be replaced by the original sample journal." : "Every trade and every entry will be permanently deleted. Blank slate."}</p><div className="mt-5 flex justify-end gap-2.5"><Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={runAction}>{confirm === "reset" ? "Restore" : "Delete all"}</Button></div></Dialog>
    </div>
  );
}

function GoogleDot() {
  return <svg viewBox="0 0 24 24" className="h-3 w-3"><path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.76 12 .76 7.7.76 3.99 3.23 2.18 6.82l3.66 2.84C6.71 7.02 9.14 5.04 12 5.04Z"/><path fill="#4285F4" d="M23.24 12.26c0-.79-.07-1.54-.2-2.26H12v4.51h6.32c-.27 1.48-1.09 2.73-2.32 3.58l3.56 2.76c2.08-1.92 3.68-4.76 3.68-8.59Z"/><path fill="#FBBC05" d="M5.84 14.1a7.2 7.2 0 0 1 0-4.42L2.18 6.82a11.25 11.25 0 0 0 0 10.14l3.66-2.86Z"/><path fill="#34A853" d="M12 23.24c2.96 0 5.46-.97 7.28-2.65l-3.56-2.76c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.98-6.16-4.61l-3.66 2.84c1.81 3.6 5.52 6.12 9.82 6.12Z"/></svg>;
}
