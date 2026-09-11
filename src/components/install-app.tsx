"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
}

export function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const standalone = isStandalone();
    setIos(isIosDevice && !standalone);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible && !ios) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-[4.75rem] z-50 md:inset-auto md:bottom-5 md:right-5 md:w-[360px]">
      <div className="rounded-2xl border border-line bg-card/95 p-3.5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            {ios ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">Install Quill as an app</div>
            {ios ? (
              <p className="mt-1 text-[11px] leading-relaxed text-sub">Tap Share, then “Add to Home Screen” to open Quill like a native app.</p>
            ) : (
              <p className="mt-1 text-[11px] leading-relaxed text-sub">Install Quill for a standalone app window, faster launch, and home-screen access.</p>
            )}
            {!ios && <div className="mt-2"><Button size="sm" onClick={install}>Install Quill</Button></div>}
          </div>
          <button aria-label="Dismiss install prompt" onClick={() => { setVisible(false); setIos(false); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-line hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}
