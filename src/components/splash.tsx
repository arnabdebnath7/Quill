"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SPLASH_KEY = "quill-splash";

function shouldShowSplash() {
  try {
    return !sessionStorage.getItem(SPLASH_KEY);
  } catch {
    return false;
  }
}

/** One-time warm-up screen per browser session. */
export function Splash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!shouldShowSplash()) return;
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      // Storage unavailable — the splash simply shows again next time.
    }
    // Deferred to the next frame so the server-rendered markup hydrates untouched.
    const frame = window.requestAnimationFrame(() => setShow(true));
    const hide = window.setTimeout(() => setShow(false), 1350);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hide);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-paper"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-label="Loading Quill"
        >
          <motion.img
            src="/quill-logo.svg"
            alt="Quill"
            width={154}
            height={200}
            className="h-auto w-[154px] sm:w-[176px]"
            draggable={false}
            initial={{ opacity: 0, scale: 0.94, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
