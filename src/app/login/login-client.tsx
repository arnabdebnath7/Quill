"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FirebaseError } from "firebase/app";
import { Activity, BookOpenText, Feather, Globe2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/app-shell";
import { consumeRedirectResult, signInWithGoogle, SignInCancelled } from "@/lib/firebase";
import { EASE } from "@/lib/motion";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.35.6 4.59 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

const FEATURES = [
  { icon: Activity, label: "Live prices" },
  { icon: BookOpenText, label: "Trade + life journal" },
  { icon: Globe2, label: "5 markets" },
  { icon: ShieldCheck, label: "Private by design" },
];

function friendlyError(e: unknown) {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case "auth/unauthorized-domain":
        return "This domain isn't whitelisted yet — add it under Firebase Console → Auth → Authorized domains.";
      case "auth/operation-not-allowed":
        return "Google provider is disabled — enable it in Firebase Console → Auth → Sign-in method.";
      case "auth/network-request-failed":
        return "Network hiccup reaching Google. Check your connection and retry.";
      case "auth/too-many-requests":
        return "Too many attempts. Give it a minute and try again.";
      default:
        return `Google sign-in failed (${e.code.replace("auth/", "")}).`;
    }
  }
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

export function LoginClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "google" | "guest" | "exchange">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = phase !== "idle";

  const exchange = useCallback(
    async (idToken: string) => {
      setPhase("exchange");
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Sign-in verification failed.");
      }
      router.replace("/");
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    let dead = false;
    consumeRedirectResult()
      .then((token) => {
        if (dead || !token) return;
        exchange(token).catch((e) => {
          if (!dead) {
            setError(friendlyError(e));
            setPhase("idle");
          }
        });
      })
      .catch((e) => {
        if (!dead) setError(friendlyError(e));
      });
    return () => {
      dead = true;
    };
  }, [exchange]);

  const signIn = async () => {
    setError(null);
    setPhase("google");
    try {
      await exchange(await signInWithGoogle());
    } catch (e) {
      if (e instanceof SignInCancelled) {
        setPhase("idle");
        return;
      }
      setError(friendlyError(e));
      setPhase("idle");
    }
  };

  const enterAsGuest = async () => {
    setError(null);
    setPhase("guest");
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Guest access failed. Please try again.");
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Guest access failed. Please try again.");
      setPhase("idle");
    }
  };

  return (
    <div className="relative z-10 min-h-dvh bg-background md:grid md:grid-cols-[1.05fr_1fr]">
      {/* brand panel (desktop) */}
      <div className="relative hidden flex-col justify-between border-r border-border bg-sidebar p-10 md:flex">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <div className="font-display text-[19px] font-semibold leading-none tracking-[-0.025em]">Quill</div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">trade & life</div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}>
          <h1 className="max-w-md font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.035em]">
            Your trades.
            <br />
            Your days.
            <br />
            <span className="text-primary">One journal.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
            A calm, private workspace for logging trades, writing your day down, and understanding the behaviour behind the P&L.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3">
                <f.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-[12px] font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Everything stays in your account. Nothing is shared.
        </div>
      </div>

      {/* form column */}
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 md:min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 md:hidden">
            <Logo size={32} />
            <div>
              <div className="font-display text-[17px] font-semibold leading-none tracking-[-0.025em]">Quill</div>
              <div className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">private journal</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" /> ready
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5, ease: EASE }}
            className="mx-auto w-full max-w-[380px]"
          >
            {/* mobile brand */}
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Feather className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</p>
                <h1 className="font-display text-[26px] font-semibold leading-[1.05] tracking-[-0.03em]">One journal.</h1>
              </div>
            </div>

            <div className="hidden md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</p>
              <h2 className="mt-1.5 font-display text-[28px] font-semibold leading-[1.05] tracking-[-0.03em]">Open your workspace</h2>
            </div>

            <div className="mt-7 space-y-2.5">
              <motion.button
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
                onClick={signIn}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card text-[14px] font-semibold transition-all hover:bg-muted/60 active:scale-[0.985] disabled:opacity-60 cursor-pointer"
              >
                {busy ? (
                  <motion.span
                    className="h-[18px] w-[18px] rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                  />
                ) : (
                  <GoogleMark />
                )}
                {phase === "exchange"
                  ? "Opening your workspace…"
                  : phase === "google"
                    ? "Waiting for Google…"
                    : phase === "guest"
                      ? "Opening private workspace…"
                      : "Continue with Google"}
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.5, ease: EASE }}
                onClick={enterAsGuest}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent text-[13.5px] font-medium text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground active:scale-[0.985] disabled:opacity-60 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Use a private workspace
              </motion.button>

              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="px-1 pt-1 text-center text-[12px] leading-relaxed text-destructive">
                  {error}
                </motion.p>
              )}

              <p className="px-1 pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                Private workspaces live only on this device — no account needed.
              </p>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[10.5px] text-muted-foreground md:hidden"
        >
          Quill — a journal that trades as hard as you do.
        </motion.p>
      </div>
    </div>
  );
}
