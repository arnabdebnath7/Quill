"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Card } from "@/components/ui";

const DISMISS_KEY = "quill-install-dismissed";

export function AppInstall() {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setInstalled(standalone);
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
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
      <Card className="flex items-center gap-3 border-brand/15 bg-brand-soft/35 p-3 shadow-none">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brandsolid text-brandon">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold">Install Quill</div>
          <div className="text-[11px] text-faint">Keep Quill one tap away on your home screen.</div>
        </div>
        <Button size="sm" onClick={install} className="shrink-0">Install</Button>
        <button aria-label="Dismiss install prompt" onClick={dismiss} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-line/60 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </Card>
    </motion.div>
  );
}
