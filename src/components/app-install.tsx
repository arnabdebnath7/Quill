"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "quill-install-dismissed";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function AppInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (installed || dismissed || !deferred) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setDeferred(null);
  };

  const install = async () => {
    const event = deferred;
    setDeferred(null);
    await event.prompt();
    await event.userChoice;
  };

  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-soft/50 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold">Install Quill</div>
          <div className="text-[11px] text-muted-foreground">Keep Quill one tap away.</div>
        </div>
        <Button size="sm" onClick={install} className="shrink-0">
          Install
        </Button>
        <button aria-label="Dismiss install prompt" onClick={dismiss} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
