"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Card } from "@/components/ui";

const DISMISS_KEY = "quill-install-dismissed";

/** Chromium-only event that lets a page defer the PWA install prompt. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      // Only stash the prompt when it is actually useful — the flags are read at event time,
      // which keeps the effect free of synchronous setState calls.
      if (isStandalone() || wasDismissed()) return;
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore — the prompt will simply reappear next session.
    }
    setDeferred(null);
  };

  const install = async () => {
    const event = deferred;
    setDeferred(null);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // The prompt can only be used once; nothing else to do.
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <Card className="flex items-center gap-3 border-brand/15 bg-brand-soft/35 p-3 shadow-none">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand-solid text-brand-on">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold">Install Quill</div>
          <div className="text-[11px] text-faint">Keep Quill one tap away on your home screen.</div>
        </div>
        <Button size="sm" onClick={install} className="shrink-0">
          Install
        </Button>
        <button
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-line/60 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </Card>
    </motion.div>
  );
}
