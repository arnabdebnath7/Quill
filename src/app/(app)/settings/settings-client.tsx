"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Download, KeyRound, LogOut, Monitor, Moon, Smartphone, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/providers";
import { Button, Card, Dialog } from "@/components/ui";
import { signOutFirebase } from "@/lib/firebase";
import { displayEmail, maskPhone } from "@/lib/identity";
import { avatarHue, cn, initials, localDateKey } from "@/lib/utils";
import type { User } from "@/db/schema";

const THEMES = [
  { v: "light", label: "Light", icon: Sun },
  { v: "dark", label: "Dark", icon: Moon },
  { v: "system", label: "System", icon: Monitor },
] as const;

export function SettingsClient({ user }: { user: User }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [confirm, setConfirm] = useState<"clear" | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const email = displayEmail(user.email);
  const phone = maskPhone(user.phone);
  const hue = avatarHue(user.email);
  const provider = email ? "Google" : phone ? "phone number" : "Firebase";

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
      a.download = `quill-export-${localDateKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Couldn’t create the backup. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const clearAll = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear-all" }) });
      if (!res.ok) throw new Error("Action failed");
      setConfirm(null);
      toast.success("All data cleared");
      // Full reload so every cached query starts from the now-empty account.
      window.location.assign("/today");
    } catch {
      setBusy(false);
      toast.error("That action failed. Your data was not changed.");
    }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The session cookie is cleared server-side; still move the user to /login.
    }
    await signOutFirebase();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-[27px] font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="mt-1 text-[13px] text-sub">The boring page that keeps everything else fun.</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[17px] font-semibold text-white"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${(hue + 40) % 360} 45% 32%))` }}
          >
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="font-display text-[17px] font-semibold">{user.name}</div>
            {email && <div className="truncate text-[13px] text-sub">{email}</div>}
            {phone && (
              <div className="flex items-center gap-1.5 truncate text-[13px] text-sub">
                <Smartphone className="h-3.5 w-3.5" /> {phone}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-faint">
              <KeyRound className="h-3 w-3" /> Signed in with {provider} · member since {format(new Date(user.createdAt), "MMMM yyyy")}
            </div>
          </div>
          <Button variant="outline" className="ml-auto shrink-0" onClick={signOut} loading={signingOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Appearance</div>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              type="button"
              key={t.v}
              aria-pressed={theme === t.v}
              onClick={() => setTheme(t.v)}
              className={cn(
                "flex h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border text-[12.5px] font-medium transition-all active:scale-[0.97]",
                theme === t.v ? "border-brand/50 bg-brand-soft text-brand" : "border-line text-sub hover:bg-line/40",
              )}
            >
              <t.icon className="h-[18px] w-[18px]" />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Your data</div>
        <div className="grid gap-2.5">
          <button
            type="button"
            onClick={exportData}
            disabled={exporting}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-all hover:bg-line/40 active:scale-[0.995] disabled:opacity-60"
          >
            <Download className="h-4 w-4 text-brand" />
            <div>
              <div className="text-[13.5px] font-medium">{exporting ? "Preparing backup…" : "Export everything"}</div>
              <div className="text-[11.5px] text-faint">Trades, entries, check-ins and watchlist as JSON. Your data is yours.</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setConfirm("clear")}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-down/30 px-4 py-3 text-left transition-all hover:bg-down-soft active:scale-[0.995]"
          >
            <Trash2 className="h-4 w-4 text-down" />
            <div>
              <div className="text-[13.5px] font-medium text-down">Clear all data</div>
              <div className="text-[11.5px] text-faint">Start completely blank. No undo.</div>
            </div>
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">About</div>
        <div className="space-y-3 text-[13px] leading-relaxed text-sub">
          <div className="flex items-start gap-2.5">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p>Sign-in is protected by Firebase Auth (Google or phone OTP); the ID token is verified server-side before a Quill session is created.</p>
          </div>
          <p className="text-[12px] text-faint">
            Market data: Yahoo Finance (US, NSE, FX &amp; metals) and CoinGecko (crypto) — delays vary by venue, and quotes are marked “est.” when a provider is unreachable. Quill v1.0, built
            for people who write things down.
          </p>
        </div>
      </Card>

      <Dialog open={confirm != null} onClose={() => !busy && setConfirm(null)} title="Clear everything?">
        <p className="text-[13.5px] leading-relaxed text-sub">Every trade, journal entry, check-in and watchlist item will be permanently deleted. Blank slate.</p>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={clearAll}>
            Delete all
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
