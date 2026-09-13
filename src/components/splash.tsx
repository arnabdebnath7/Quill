"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Feather } from "lucide-react";
import { EASE } from "@/lib/motion";

export function Splash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("quill-splash")) return;
    sessionStorage.setItem("quill-splash", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <motion.div
            initial={{ scale: 0.65, opacity: 0, rotate: -14 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.7 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
          >
            <Feather className="h-8 w-8" strokeWidth={2.2} />
          </motion.div>
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.5, ease: EASE }}
            className="mt-5 font-display text-[22px] font-semibold tracking-[-0.02em]"
          >
            Quill
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
          >
            trade & life
          </motion.div>
          <motion.div
            className="absolute bottom-16 h-1 w-24 overflow-hidden rounded-full bg-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 1, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
