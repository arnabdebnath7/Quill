"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Feather } from "lucide-react";

export function Splash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("quill-splash")) return;
    sessionStorage.setItem("quill-splash", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper"
          exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -16 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.7 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brandsolid text-brandon shadow-xl"
          >
            <Feather className="h-8 w-8" strokeWidth={2.2} />
          </motion.div>
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 font-display text-[22px] font-semibold tracking-[-0.02em]"
          >
            Quill
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-1 text-[11px] uppercase tracking-[0.2em] text-faint"
          >
            trade & life
          </motion.div>
          <motion.div
            className="absolute bottom-16 h-1 w-24 overflow-hidden rounded-full bg-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="h-full rounded-full bg-brand"
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 1, ease: [0.65, 0, 0.35, 1], delay: 0.25 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
